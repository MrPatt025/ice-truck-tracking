/**
 * Security Middleware — Helmet, CSRF, HSTS, input sanitization
 * Zero Trust model compliance.
 */
'use strict';

const helmet = require('helmet');
const crypto = require('node:crypto');

// ── Helmet (all-in-one security headers) ───────────────────
const helmetMiddleware = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            fontSrc: ["'self'", 'https:', 'data:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
});

// ── Double Submit Cookie CSRF Protection ───────────────────
function csrfProtection(req, res, next) {
    // Skip for safe methods and API-key authenticated requests
    const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
    if (safeMethods.has(req.method)) return next();

    // Skip for Bearer-token authenticated API requests (stateless)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return next();

    // For cookie-based sessions, verify CSRF token
    const csrfCookie = req.cookies?.['csrf-token'];
    const csrfHeader = req.headers['x-csrf-token'] || req.body?._csrf;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({
            status: 'error',
            message: 'CSRF token missing or invalid',
        });
    }
    next();
}

/**
 * Generate and set CSRF token cookie on GET requests.
 */
function csrfTokenSetter(req, res, next) {
    if (req.method === 'GET' && !req.cookies?.['csrf-token']) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('csrf-token', token, {
            httpOnly: false, // Must be readable by JS
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000, // 1 hour
        });
    }
    next();
}

// ── Request ID ─────────────────────────────────────────────
function requestId(req, res, next) {
    const id = req.headers['x-request-id'] || crypto.randomUUID();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    next();
}

// ── Security response headers (defense in depth) ──────────
function securityHeaders(_req, res, next) {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.removeHeader('X-Powered-By');
    next();
}

module.exports = {
    helmetMiddleware,
    csrfProtection,
    csrfTokenSetter,
    requestId,
    securityHeaders,
};
