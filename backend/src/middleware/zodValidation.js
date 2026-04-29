/**
 * Input Validation Middleware — Zod-based schema validation
 * Replaces express-validator for type-safe, composable validation.
 */
'use strict';

const { z } = require('zod');

function isSafeUsername(value) {
    if (typeof value !== 'string' || value.length < 3 || value.length > 50) {
        return false;
    }

    for (const character of value) {
        const code = character.codePointAt(0);
        const isDigit = code >= 48 && code <= 57;
        const isUppercase = code >= 65 && code <= 90;
        const isLowercase = code >= 97 && code <= 122;
        const isAllowedSymbol = character === '_' || character === '-';

        if (!isDigit && !isUppercase && !isLowercase && !isAllowedSymbol) {
            return false;
        }
    }

    return true;
}

function hasPasswordComplexity(value) {
    if (typeof value !== 'string') {
        return false;
    }

    let hasUppercase = false;
    let hasLowercase = false;
    let hasDigit = false;
    let hasSpecial = false;

    for (const character of value) {
        const code = character.codePointAt(0);

        if (code >= 65 && code <= 90) {
            hasUppercase = true;
        } else if (code >= 97 && code <= 122) {
            hasLowercase = true;
        } else if (code >= 48 && code <= 57) {
            hasDigit = true;
        } else {
            hasSpecial = true;
        }

        if (hasUppercase && hasLowercase && hasDigit && hasSpecial) {
            return true;
        }
    }

    return hasUppercase && hasLowercase && hasDigit && hasSpecial;
}

function stripHtmlTags(value) {
    if (typeof value !== 'string' || !value.includes('<')) {
        return value;
    }

    let result = '';
    let isInsideTag = false;

    for (const character of value) {
        if (character === '<') {
            isInsideTag = true;
            continue;
        }

        if (character === '>') {
            isInsideTag = false;
            continue;
        }

        if (!isInsideTag) {
            result += character;
        }
    }

    return result.trim();
}

// ── Reusable Schemas ───────────────────────────────────────
const uuidSchema = z.uuid();

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1, { message: 'page must be at least 1' }).default(1),
    limit: z.coerce.number().int().min(1, { message: 'limit must be at least 1' }).max(100, { message: 'limit must be at most 100' }).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
});

const coordinateSchema = z.object({
    latitude: z.coerce.number().min(-90, { message: 'latitude must be >= -90' }).max(90, { message: 'latitude must be <= 90' }),
    longitude: z.coerce.number().min(-180, { message: 'longitude must be >= -180' }).max(180, { message: 'longitude must be <= 180' }),
});

const dateRangeSchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
}).refine(
    (d) => !d.from || !d.to || d.from <= d.to,
    { message: 'from must be before to' }
);

// ── Auth Schemas ───────────────────────────────────────────
const loginSchema = z.object({
    username: z.string().min(3, { message: 'username must be at least 3 characters' }).max(50, { message: 'username must be at most 50 characters' }).trim(),
    password: z.string().min(8, { message: 'password must be at least 8 characters' }).max(128, { message: 'password must be at most 128 characters' }),
});

const registerSchema = z.object({
    username: z.string().min(3, { message: 'username must be at least 3 characters' }).max(50, { message: 'username must be at most 50 characters' }).trim().refine(isSafeUsername, {
        message: 'Username may only contain letters, numbers, hyphens, and underscores',
    }),
    email: z.string().email({ message: 'invalid email address' }).max(255, { message: 'email must be at most 255 characters' }).toLowerCase(),
    password: z.string().min(8, { message: 'password must be at least 8 characters' }).max(128, { message: 'password must be at most 128 characters' })
        .refine(hasPasswordComplexity, {
            message: 'Password must include uppercase, lowercase, digit, and special character',
        }),
    full_name: z.string().min(1, { message: 'full_name is required' }).max(100, { message: 'full_name must be at most 100 characters' }).trim(),
    phone: z.string().max(20, { message: 'phone must be at most 20 characters' }).optional(),
    role: z.enum(['admin', 'manager', 'dispatcher', 'driver', 'viewer']).default('viewer'),
});

const refreshTokenSchema = z.object({
    refresh_token: z.string().min(1),
});

const authRouteRegisterSchema = z.object({
    username: z.string().min(3, { message: 'username must be at least 3 characters' }).max(50, { message: 'username must be at most 50 characters' }).trim().refine(isSafeUsername, {
        message: 'Username may only contain letters, numbers, hyphens, and underscores',
    }),
    password: z.string().min(8, { message: 'password must be at least 8 characters' }).max(128, { message: 'password must be at most 128 characters' }),
    role: z.enum(['admin', 'owner', 'manager', 'dispatcher', 'driver', 'viewer']),
    full_name: z.string().min(1, { message: 'full_name is required' }).max(100, { message: 'full_name must be at most 100 characters' }).trim(),
    email: z.string().email({ message: 'invalid email address' }).max(255, { message: 'email must be at most 255 characters' }).toLowerCase(),
    phone: z.string().min(1, { message: 'phone is required' }).max(20, { message: 'phone must be at most 20 characters' }).trim(),
});

// ── Truck Schemas ──────────────────────────────────────────
const createTruckSchema = z.object({
    license_plate: z.string().min(1, { message: 'license_plate is required' }).max(20, { message: 'license_plate must be at most 20 characters' }).trim(),
    model: z.string().max(50, { message: 'model must be at most 50 characters' }).optional(),
    capacity_kg: z.coerce.number().positive({ message: 'capacity_kg must be greater than 0' }).optional(),
});

const updateTruckSchema = createTruckSchema.partial().extend({
    status: z.enum(['active', 'idle', 'maintenance', 'offline']).optional(),
});

// ── Driver Schemas ─────────────────────────────────────────
const createDriverSchema = z.object({
    license_no: z.string().min(1, { message: 'license_no is required' }).max(30, { message: 'license_no must be at most 30 characters' }).trim(),
    full_name: z.string().min(1, { message: 'full_name is required' }).max(100, { message: 'full_name must be at most 100 characters' }).trim(),
    phone: z.string().max(20, { message: 'phone must be at most 20 characters' }).optional(),
    user_id: z.string().uuid().optional(),
    assigned_truck: z.string().uuid().optional(),
});

const updateDriverSchema = createDriverSchema.partial().extend({
    is_active: z.boolean().optional(),
});

// ── Telemetry Schemas ──────────────────────────────────────
const telemetrySchema = z.object({
    truck_id: uuidSchema,
    latitude: z.coerce.number().min(-90, { message: 'latitude must be >= -90' }).max(90, { message: 'latitude must be <= 90' }),
    longitude: z.coerce.number().min(-180, { message: 'longitude must be >= -180' }).max(180, { message: 'longitude must be <= 180' }),
    speed: z.coerce.number().min(0, { message: 'speed must be >= 0' }).max(300, { message: 'speed must be <= 300' }).optional(),
    heading: z.coerce.number().int().min(0, { message: 'heading must be >= 0' }).max(360, { message: 'heading must be <= 360' }).optional(),
    temperature: z.coerce.number().min(-50, { message: 'temperature must be >= -50' }).max(100, { message: 'temperature must be <= 100' }).optional(),
    humidity: z.coerce.number().min(0, { message: 'humidity must be >= 0' }).max(100, { message: 'humidity must be <= 100' }).optional(),
    battery: z.coerce.number().min(0, { message: 'battery must be >= 0' }).max(100, { message: 'battery must be <= 100' }).optional(),
    door_open: z.boolean().optional(),
    payload: z.record(z.unknown()).optional(),
});

// ── Alert Schemas ──────────────────────────────────────────
const createAlertSchema = z.object({
    truck_id: uuidSchema.optional(),
    driver_id: uuidSchema.optional(),
    alert_type: z.enum([
        'temperature_high', 'temperature_low', 'speed_exceeded', 'geofence_breach',
        'route_deviation', 'idle_too_long', 'maintenance_due', 'connection_lost',
        'battery_low', 'door_opened',
    ]),
    severity: z.enum(['info', 'warning', 'critical', 'emergency']).default('warning'),
    message: z.string().min(1, { message: 'message is required' }).max(500, { message: 'message must be at most 500 characters' }),
    latitude: z.coerce.number().min(-90, { message: 'latitude must be >= -90' }).max(90, { message: 'latitude must be <= 90' }).optional(),
    longitude: z.coerce.number().min(-180, { message: 'longitude must be >= -180' }).max(180, { message: 'longitude must be <= 180' }).optional(),
    metadata: z.record(z.unknown()).optional(),
});

const acknowledgeAlertSchema = z.object({
    alert_ids: z.array(uuidSchema).min(1, { message: 'at least one alert id is required' }).max(100, { message: 'no more than 100 alert ids are allowed' }),
});

// ── Shop Schemas ───────────────────────────────────────────
const createShopSchema = z.object({
    name: z.string().min(1, { message: 'name is required' }).max(100, { message: 'name must be at most 100 characters' }).trim(),
    address: z.string().max(500, { message: 'address must be at most 500 characters' }).optional(),
    latitude: z.coerce.number().min(-90, { message: 'latitude must be >= -90' }).max(90, { message: 'latitude must be <= 90' }),
    longitude: z.coerce.number().min(-180, { message: 'longitude must be >= -180' }).max(180, { message: 'longitude must be <= 180' }),
    phone: z.string().max(20, { message: 'phone must be at most 20 characters' }).optional(),
});

const trackingInsertSchema = z.object({
    shop_id: z.string().min(1, { message: 'shop_id is required' }).max(50, { message: 'shop_id must be at most 50 characters' }).trim(),
    latitude: z.coerce.number().min(-90, { message: 'latitude must be >= -90' }).max(90, { message: 'latitude must be <= 90' }),
    longitude: z.coerce.number().min(-180, { message: 'longitude must be >= -180' }).max(180, { message: 'longitude must be <= 180' }),
    truck_id: z.string().min(1, { message: 'truck_id is required' }).max(50, { message: 'truck_id must be at most 50 characters' }).trim(),
    driver_id: z.string().min(1, { message: 'driver_id is required' }).max(50, { message: 'driver_id must be at most 50 characters' }).trim(),
    gps_code: z.string().min(1, { message: 'gps_code is required' }).max(100, { message: 'gps_code must be at most 100 characters' }).trim(),
});

// ── Middleware Factory ──────────────────────────────────────

/**
 * Validate request body/query/params against a Zod schema.
 * @param {z.ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code,
            }));
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors,
            });
        }
        if (source === 'query') {
            Object.assign(req.query || {}, result.data);
        } else {
            req[source] = result.data; // Overwrite with parsed + sanitized data
        }
        next();
    };
}

/**
 * Sanitize string fields — strip HTML tags and trim whitespace.
 */
function sanitize(req, _res, next) {
    const deepSanitize = (obj) => {
        if (typeof obj === 'string') {
            return stripHtmlTags(obj);
        }

        if (typeof obj !== 'object' || obj === null) return obj;

        if (Array.isArray(obj)) {
            return obj.map((item) => deepSanitize(item));
        }

        for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'string') {
                obj[key] = stripHtmlTags(obj[key]);
            } else if (typeof obj[key] === 'object') {
                obj[key] = deepSanitize(obj[key]);
            }
        }
        return obj;
    };

    if (req.body) req.body = deepSanitize(req.body);
    if (req.query) {
        const sanitized = deepSanitize(req.query);
        Object.assign(req.query, sanitized);
    }
    next();
}

module.exports = {
    // Schemas
    loginSchema,
    registerSchema,
    authRouteRegisterSchema,
    refreshTokenSchema,
    createTruckSchema,
    updateTruckSchema,
    createDriverSchema,
    updateDriverSchema,
    telemetrySchema,
    createAlertSchema,
    acknowledgeAlertSchema,
    createShopSchema,
    trackingInsertSchema,
    paginationSchema,
    coordinateSchema,
    dateRangeSchema,
    uuidSchema,
    // Middleware
    validate,
    sanitize,
};
