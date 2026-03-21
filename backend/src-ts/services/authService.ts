import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';

export interface DatabaseQueryResult<T> {
  rows: T[];
}

export interface DatabaseClient {
  query<T>(sql: string, params?: readonly unknown[]): Promise<DatabaseQueryResult<T>>;
}

export interface AuthConfig {
  jwtSecret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  saltRounds: number;
}

export interface AuthUserRecord {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  role: string;
  full_name: string | null;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: {
    id: number;
    username: string;
    email: string | null;
    role: string;
    full_name: string | null;
  };
}

interface RefreshTokenRecord {
  id: number;
  user_id: number;
  family: string;
  expires_at: Date;
  revoked_at: Date | null;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

function parseDurationToMs(value: string): number {
  const normalized = value.trim();
  const unit = normalized.slice(-1);
  const amount = Number(normalized.slice(0, -1));

  if (!Number.isFinite(amount) || amount <= 0) {
    return 3_600_000;
  }

  if (unit === 's') return amount * 1_000;
  if (unit === 'm') return amount * 60_000;
  if (unit === 'h') return amount * 3_600_000;
  return amount * 86_400_000;
}

export class AuthServiceTs {
  constructor(
    private readonly db: DatabaseClient,
    private readonly config: AuthConfig
  ) {}

  async login(identifier: string, password: string): Promise<LoginResponse> {
    const result = await this.db.query<AuthUserRecord>(
      `SELECT id, username, email, password_hash, role, full_name, is_active
       FROM users
       WHERE username = $1 OR email = $1`,
      [identifier]
    );

    const user = result.rows[0];
    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    if (!user.is_active) {
      throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const { accessToken, refreshToken } = await this.createTokenPair(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: parseDurationToMs(this.config.accessTokenTtl) / 1_000,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    };
  }

  async refreshToken(oldRefreshToken: string): Promise<RefreshResponse> {
    const tokenHash = this.hashToken(oldRefreshToken);

    const found = await this.db.query<RefreshTokenRecord>(
      `SELECT id, user_id, family, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    const stored = found.rows.at(0);
    const isRevoked = stored?.revoked_at !== null;
    const isExpired = stored?.expires_at ? new Date(stored.expires_at) < new Date() : true;
    if (!stored || isRevoked || isExpired) {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }

    await this.db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [stored.id]);

    const userResult = await this.db.query<AuthUserRecord>(
      `SELECT id, username, email, password_hash, role, full_name, is_active
       FROM users
       WHERE id = $1`,
      [stored.user_id]
    );

    const user = userResult.rows.at(0);
    if (user?.is_active !== true) {
      throw Object.assign(new Error('User not found or deactivated'), { statusCode: 401 });
    }

    const { accessToken, refreshToken } = await this.createTokenPair(user, stored.family);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: parseDurationToMs(this.config.accessTokenTtl) / 1_000,
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'ice-truck-api',
      audience: 'ice-truck',
    });

    if (typeof decoded === 'string') {
      throw Object.assign(new Error('Unexpected JWT payload type'), { statusCode: 401 });
    }

    return decoded;
  }

  private async createTokenPair(user: AuthUserRecord, family?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenFamily = family ?? crypto.randomUUID();

    const accessToken = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
      },
      this.config.jwtSecret,
      {
        algorithm: 'HS256',
        expiresIn: this.config.accessTokenTtl,
        issuer: 'ice-truck-api',
        audience: 'ice-truck',
      }
    );

    const refreshToken = crypto.randomBytes(64).toString('base64url');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + parseDurationToMs(this.config.refreshTokenTtl));

    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, tokenHash, tokenFamily, expiresAt]
    );

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
