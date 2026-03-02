// RBAC middleware — permission-based route protection
const { hasPermission, ROLE_NAMES } = require('../config/rbac');
const { AppError } = require('./error');

/**
 * Require one or more permissions.
 * Usage:  router.post('/trucks', requirePermission('trucks:create'), handler)
 *
 * @param {...string} permissions - one or more "resource:action" strings (OR logic)
 */
const requirePermission = (...permissions) => {
    return (req, _res, next) => {
        const userRole = req.user?.role;

        if (!userRole || !ROLE_NAMES.includes(userRole)) {
            return next(new AppError('Invalid or missing role', 403));
        }

        const hasAny = permissions.some((perm) => hasPermission(userRole, perm));
        if (!hasAny) {
            return next(
                new AppError(
                    `Forbidden — requires one of: ${permissions.join(', ')}`,
                    403,
                ),
            );
        }

        next();
    };
};

/**
 * Require ALL listed permissions (AND logic).
 */
const requireAllPermissions = (...permissions) => {
    return (req, _res, next) => {
        const userRole = req.user?.role;

        if (!userRole || !ROLE_NAMES.includes(userRole)) {
            return next(new AppError('Invalid or missing role', 403));
        }

        const hasAll = permissions.every((perm) => hasPermission(userRole, perm));
        if (!hasAll) {
            return next(
                new AppError(
                    `Forbidden — requires all of: ${permissions.join(', ')}`,
                    403,
                ),
            );
        }

        next();
    };
};

module.exports = { requirePermission, requireAllPermissions };
