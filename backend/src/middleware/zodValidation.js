/**
 * Input Validation Middleware — Zod-based schema validation
 * Replaces express-validator for type-safe, composable validation.
 */
'use strict';

const { z } = require('zod');

// ── Reusable Schemas ───────────────────────────────────────
const uuidSchema = z.string().uuid();

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
});

const coordinateSchema = z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
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
    username: z.string().min(3).max(50).trim(),
    password: z.string().min(8).max(128),
});

const registerSchema = z.object({
    username: z.string().min(3).max(50).trim().regex(/^[a-zA-Z0-9_-]+$/),
    email: z.string().email().max(255).toLowerCase(),
    password: z.string().min(8).max(128)
        .regex(/[A-Z]/, 'Must contain uppercase')
        .regex(/[a-z]/, 'Must contain lowercase')
        .regex(/[0-9]/, 'Must contain digit')
        .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    full_name: z.string().min(1).max(100).trim(),
    phone: z.string().max(20).optional(),
    role: z.enum(['admin', 'manager', 'dispatcher', 'driver', 'viewer']).default('viewer'),
});

const refreshTokenSchema = z.object({
    refresh_token: z.string().min(1),
});

// ── Truck Schemas ──────────────────────────────────────────
const createTruckSchema = z.object({
    license_plate: z.string().min(1).max(20).trim(),
    model: z.string().max(50).optional(),
    capacity_kg: z.coerce.number().positive().optional(),
});

const updateTruckSchema = createTruckSchema.partial().extend({
    status: z.enum(['active', 'idle', 'maintenance', 'offline']).optional(),
});

// ── Driver Schemas ─────────────────────────────────────────
const createDriverSchema = z.object({
    license_no: z.string().min(1).max(30).trim(),
    full_name: z.string().min(1).max(100).trim(),
    phone: z.string().max(20).optional(),
    user_id: z.string().uuid().optional(),
    assigned_truck: z.string().uuid().optional(),
});

const updateDriverSchema = createDriverSchema.partial().extend({
    is_active: z.boolean().optional(),
});

// ── Telemetry Schemas ──────────────────────────────────────
const telemetrySchema = z.object({
    truck_id: uuidSchema,
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    speed: z.coerce.number().min(0).max(300).optional(),
    heading: z.coerce.number().int().min(0).max(360).optional(),
    temperature: z.coerce.number().min(-50).max(100).optional(),
    humidity: z.coerce.number().min(0).max(100).optional(),
    battery: z.coerce.number().min(0).max(100).optional(),
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
    message: z.string().min(1).max(500),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    metadata: z.record(z.unknown()).optional(),
});

const acknowledgeAlertSchema = z.object({
    alert_ids: z.array(uuidSchema).min(1).max(100),
});

// ── Shop Schemas ───────────────────────────────────────────
const createShopSchema = z.object({
    name: z.string().min(1).max(100).trim(),
    address: z.string().max(500).optional(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    phone: z.string().max(20).optional(),
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
        req[source] = result.data; // Overwrite with parsed + sanitized data
        next();
    };
}

/**
 * Sanitize string fields — strip HTML tags and trim whitespace.
 */
function sanitize(req, _res, next) { // eslint-disable-line no-unused-vars
    const stripHtml = (str) =>
        typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : str;

    const deepSanitize = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;
        for (const key of Object.keys(obj)) {
            if (typeof obj[key] === 'string') {
                obj[key] = stripHtml(obj[key]);
            } else if (typeof obj[key] === 'object') {
                deepSanitize(obj[key]);
            }
        }
        return obj;
    };

    if (req.body) req.body = deepSanitize(req.body);
    if (req.query) req.query = deepSanitize(req.query);
    next();
}

module.exports = {
    // Schemas
    loginSchema,
    registerSchema,
    refreshTokenSchema,
    createTruckSchema,
    updateTruckSchema,
    createDriverSchema,
    updateDriverSchema,
    telemetrySchema,
    createAlertSchema,
    acknowledgeAlertSchema,
    createShopSchema,
    paginationSchema,
    coordinateSchema,
    dateRangeSchema,
    uuidSchema,
    // Middleware
    validate,
    sanitize,
};
