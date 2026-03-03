/**
 * Audit Logger Middleware — Immutable audit trail for all state-changing operations.
 * Writes to TimescaleDB audit_log hypertable.
 */
'use strict';

const logger = require('../config/logger');

/**
 * Create an audit log entry.
 * In fake-DB mode falls back to structured logging only.
 */
async function logAudit({ userId, action, resource, resourceId, ip, userAgent, oldValue, newValue }) {
    const entry = {
        user_id: userId || null,
        action,
        resource,
        resource_id: resourceId || null,
        ip_address: ip || null,
        user_agent: userAgent || null,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
    };

    // Always log to structured logger
    const resourceLabel = resourceId ? ':' + resourceId : '';
    logger.info({ audit: entry }, `AUDIT: ${action} ${resource}${resourceLabel}`);

    // Persist to DB when available
    if (process.env.USE_FAKE_DB !== 'true') {
        try {
            const database = require('../config/database');
            await database.query(
                `INSERT INTO audit_log (user_id, action, resource, resource_id, ip_address, user_agent, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5::inet, $6, $7::jsonb, $8::jsonb)`,
                [entry.user_id, entry.action, entry.resource, entry.resource_id, entry.ip_address, entry.user_agent, entry.old_value, entry.new_value]
            );
        } catch (/** @type {*} */ err) {
            logger.error({ err }, 'Failed to persist audit log');
        }
    }
}

/**
 * Express middleware that attaches `req.audit()` helper to each request.
 */
function auditMiddleware(req, _res, next) {
    req.audit = (action, resource, resourceId, { oldValue, newValue } = {}) =>
        logAudit({
            userId: req.user?.id,
            action,
            resource,
            resourceId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            oldValue,
            newValue,
        });
    next();
}

module.exports = { auditMiddleware, logAudit };
