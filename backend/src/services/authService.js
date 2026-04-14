/**
 * Auth Service — JWT with short TTL, refresh token rotation, RBAC + ABAC
 * Implements OAuth2 Resource Owner Password flow + token refresh.
 */
'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const config = require('../config/env');
const logger = require('../config/logger');

const ACCESS_TOKEN_TTL = config.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_TTL = config.JWT_REFRESH_EXPIRES_IN || '7d';
const SALT_ROUNDS = config.SALT_ROUNDS || 12;

/**
 * Parse human-readable duration to milliseconds.
 */
const parseDuration = (str) => {
    const normalized = typeof str === 'string' ? str.trim() : '';
    if (normalized.length < 2) return 3600000;

    const unit = normalized.slice(-1);
    const amount = Number(normalized.slice(0, -1));

    if (!Number.isFinite(amount) || amount <= 0) return 3600000;

    switch (unit) {
        case 's': return amount * 1000;
        case 'm': return amount * 60 * 1000;
        case 'h': return amount * 3600 * 1000;
        case 'd': return amount * 86400 * 1000;
        default: return 3600000;
    }
};

class AuthService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Register a new user.
     */
    async register({ username, email, password, full_name, phone, role = 'viewer' }) {
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await this.db.query(
            `INSERT INTO users (username, email, password_hash, role, full_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, role, full_name, created_at`,
            [username, email, passwordHash, role, full_name, phone || null]
        );

        return result.rows[0];
    }

    /**
     * Authenticate user and return access + refresh token pair.
     */
    async login(username, password) {
        const result = await this.db.query(
            `SELECT id, username, email, password_hash, role, full_name, is_active
       FROM users WHERE username = $1`,
            [username]
        );

        const user = result.rows[0];
        if (!user) {
            throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
        }

        if (!user.is_active) {
            throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
        }

        // Update last login
        await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

        // Generate token pair
        const { accessToken, refreshToken } = await this._createTokenPair(user);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: parseDuration(ACCESS_TOKEN_TTL) / 1000,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
            },
        };
    }

    /**
     * Refresh token rotation — issue new pair, invalidate old.
     * Detects token reuse (family-based) and revokes entire family.
     */
    async refreshToken(oldRefreshToken) {
        const tokenHash = this._hashToken(oldRefreshToken);

        const result = await this.db.query(
            `SELECT id, user_id, family, expires_at, revoked_at
       FROM refresh_tokens WHERE token_hash = $1`,
            [tokenHash]
        );

        const stored = result.rows[0];

        if (!stored) {
            throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
        }

        // ── Token reuse detection ──────────────────────────────
        if (stored.revoked_at) {
            // Potential token theft — revoke entire family
            logger.warn({ family: stored.family, userId: stored.user_id },
                'Refresh token reuse detected — revoking entire family');
            await this.db.query(
                'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family = $1 AND revoked_at IS NULL',
                [stored.family]
            );
            throw Object.assign(new Error('Token reuse detected — all sessions revoked'), { statusCode: 401 });
        }

        if (new Date(stored.expires_at) < new Date()) {
            throw Object.assign(new Error('Refresh token expired'), { statusCode: 401 });
        }

        // Revoke old token
        await this.db.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
            [stored.id]
        );

        // Get user
        const userResult = await this.db.query(
            'SELECT id, username, email, role, full_name, is_active FROM users WHERE id = $1',
            [stored.user_id]
        );
        const user = userResult.rows[0];
        if (!user?.is_active) {
            throw Object.assign(new Error('User not found or deactivated'), { statusCode: 401 });
        }

        // Issue new pair in same family
        const { accessToken, refreshToken: newRefreshToken } = await this._createTokenPair(user, stored.family);

        return {
            access_token: accessToken,
            refresh_token: newRefreshToken,
            token_type: 'Bearer',
            expires_in: parseDuration(ACCESS_TOKEN_TTL) / 1000,
        };
    }

    /**
     * Revoke all tokens for a user (logout everywhere).
     */
    async revokeAll(userId) {
        await this.db.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
            [userId]
        );
    }

    /**
     * Verify an access token.
     */
    verifyAccessToken(token) {
        return jwt.verify(token, config.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'ice-truck-api',
            audience: 'ice-truck',
        });
    }

    // ── Private helpers ──────────────────────────────────────

    async _createTokenPair(user, family = null) {
        const tokenFamily = family || crypto.randomUUID();

        // Access token (short-lived, stateless)
        const accessToken = jwt.sign(
            {
                sub: user.id,
                username: user.username,
                role: user.role,
                permissions: this._getPermissions(user.role),
            },
            config.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: ACCESS_TOKEN_TTL,
                issuer: 'ice-truck-api',
                audience: 'ice-truck',
            }
        );

        // Refresh token (long-lived, stored in DB)
        const refreshToken = crypto.randomBytes(64).toString('base64url');
        const tokenHash = this._hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + parseDuration(REFRESH_TOKEN_TTL));

        await this.db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at)
       VALUES ($1, $2, $3, $4)`,
            [user.id, tokenHash, tokenFamily, expiresAt]
        );

        return { accessToken, refreshToken, family: tokenFamily };
    }

    _hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    _getPermissions(role) {
        const permissions = {
            admin: ['*'],
            manager: [
                'trucks:read', 'trucks:write', 'drivers:read', 'drivers:write',
                'tracking:read', 'alerts:read', 'alerts:write', 'shops:read', 'shops:write',
                'routes:read', 'routes:write', 'reports:read',
            ],
            dispatcher: [
                'trucks:read', 'drivers:read', 'tracking:read',
                'alerts:read', 'routes:read', 'routes:write', 'shops:read',
            ],
            driver: [
                'trucks:read', 'tracking:read', 'tracking:write',
                'alerts:read', 'routes:read',
            ],
            viewer: ['trucks:read', 'tracking:read', 'alerts:read'],
        };
        return permissions[role] || permissions.viewer;
    }
}

module.exports = AuthService;
