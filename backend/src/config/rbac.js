// Role-Based Access Control (RBAC) definitions
// Granular permissions per role — easy to extend without code changes

/**
 * Permission format: "resource:action"
 *   resource = trucks | drivers | shops | alerts | tracking | users | system
 *   action   = read | create | update | delete | manage
 */

const ROLES = {
    admin: {
        description: 'Full system administrator',
        permissions: [
            'trucks:read', 'trucks:create', 'trucks:update', 'trucks:delete',
            'drivers:read', 'drivers:create', 'drivers:update', 'drivers:delete',
            'shops:read', 'shops:create', 'shops:update', 'shops:delete',
            'alerts:read', 'alerts:create', 'alerts:update', 'alerts:delete',
            'tracking:read', 'tracking:create',
            'users:read', 'users:create', 'users:update', 'users:delete',
            'system:manage', 'system:read',
        ],
    },

    manager: {
        description: 'Fleet manager — read/write fleet data, read-only users',
        permissions: [
            'trucks:read', 'trucks:create', 'trucks:update',
            'drivers:read', 'drivers:create', 'drivers:update',
            'shops:read', 'shops:create', 'shops:update',
            'alerts:read', 'alerts:update',
            'tracking:read',
            'users:read',
            'system:read',
        ],
    },

    dispatcher: {
        description: 'Dispatch operator — assign trucks, monitor tracking',
        permissions: [
            'trucks:read',
            'drivers:read',
            'shops:read',
            'alerts:read',
            'tracking:read', 'tracking:create',
            'system:read',
        ],
    },

    driver: {
        description: 'Truck driver — own tracking data, receive alerts',
        permissions: [
            'trucks:read',
            'tracking:read', 'tracking:create',
            'alerts:read',
            'shops:read',
        ],
    },

    viewer: {
        description: 'Read-only dashboard access',
        permissions: [
            'trucks:read',
            'drivers:read',
            'shops:read',
            'alerts:read',
            'tracking:read',
        ],
    },
};

/** All known role names */
const ROLE_NAMES = Object.keys(ROLES);

/**
 * Check if a role has a specific permission
 * @param {string} role
 * @param {string} permission - e.g. "trucks:create"
 * @returns {boolean}
 */
const hasPermission = (role, permission) => {
    const roleDef = ROLES[role];
    if (!roleDef) return false;
    return roleDef.permissions.includes(permission);
};

/**
 * Get all permissions for a role
 * @param {string} role
 * @returns {string[]}
 */
const getPermissions = (role) => {
    return ROLES[role]?.permissions ?? [];
};

module.exports = { ROLES, ROLE_NAMES, hasPermission, getPermissions };
