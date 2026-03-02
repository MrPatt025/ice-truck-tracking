/**
 * Test data generators powered by @faker-js/faker
 * Usage: const { generateTruck, generateUser } = require('./fixtures/generators');
 */
const { faker } = require('@faker-js/faker');

/** Generate a random truck object */
function generateTruck(overrides = {}) {
    return {
        id: faker.string.uuid(),
        license_plate: faker.vehicle.vrm(),
        model: faker.vehicle.model(),
        capacity_kg: faker.number.int({ min: 1000, max: 10000 }),
        status: faker.helpers.arrayElement(['active', 'idle', 'maintenance', 'offline']),
        current_latitude: faker.location.latitude({ min: 13.5, max: 14 }),
        current_longitude: faker.location.longitude({ min: 100.3, max: 100.8 }),
        created_at: faker.date.past().toISOString(),
        ...overrides,
    };
}

/** Generate a random driver object */
function generateDriver(overrides = {}) {
    return {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        phone: faker.phone.number(),
        license_number: faker.string.alphanumeric(10).toUpperCase(),
        status: faker.helpers.arrayElement(['available', 'on_trip', 'off_duty']),
        created_at: faker.date.past().toISOString(),
        ...overrides,
    };
}

/** Generate a random user object */
function generateUser(overrides = {}) {
    return {
        id: faker.string.uuid(),
        username: faker.internet.username(),
        email: faker.internet.email(),
        full_name: faker.person.fullName(),
        role: faker.helpers.arrayElement(['admin', 'manager', 'dispatcher', 'driver', 'viewer']),
        password_hash: faker.string.alphanumeric(60),
        is_active: true,
        created_at: faker.date.past().toISOString(),
        ...overrides,
    };
}

/** Generate a random alert object */
function generateAlert(overrides = {}) {
    return {
        id: faker.string.uuid(),
        truck_id: faker.string.uuid(),
        severity: faker.helpers.arrayElement(['info', 'warning', 'critical']),
        type: faker.helpers.arrayElement([
            'temperature_high',
            'temperature_low',
            'speed_limit',
            'geofence_exit',
            'door_open',
            'battery_low',
        ]),
        message: faker.lorem.sentence(),
        time: faker.date.recent().toISOString(),
        is_resolved: faker.datatype.boolean(),
        ...overrides,
    };
}

/** Generate a random shop object */
function generateShop(overrides = {}) {
    return {
        id: faker.string.uuid(),
        name: faker.company.name(),
        address: faker.location.streetAddress(true),
        latitude: faker.location.latitude({ min: 13.5, max: 14 }),
        longitude: faker.location.longitude({ min: 100.3, max: 100.8 }),
        phone: faker.phone.number(),
        created_at: faker.date.past().toISOString(),
        ...overrides,
    };
}

/** Generate a telemetry data point */
function generateTelemetry(overrides = {}) {
    return {
        truck_id: faker.string.uuid(),
        time: new Date().toISOString(),
        latitude: faker.location.latitude({ min: 13.5, max: 14 }),
        longitude: faker.location.longitude({ min: 100.3, max: 100.8 }),
        temperature: faker.number.float({ min: -25, max: -2, fractionDigits: 1 }),
        humidity: faker.number.float({ min: 30, max: 95, fractionDigits: 1 }),
        speed: faker.number.float({ min: 0, max: 80, fractionDigits: 1 }),
        battery_level: faker.number.float({ min: 10, max: 100, fractionDigits: 1 }),
        door_open: faker.datatype.boolean(),
        ...overrides,
    };
}

/** Generate N items using any generator */
function generateMany(generator, count = 10, overrides = {}) {
    return Array.from({ length: count }, () => generator(overrides));
}

module.exports = {
    generateTruck,
    generateDriver,
    generateUser,
    generateAlert,
    generateShop,
    generateTelemetry,
    generateMany,
};
