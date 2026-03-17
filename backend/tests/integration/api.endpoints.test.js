process.env.USE_FAKE_DB = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const websocketService = require('../../src/services/websocketService');

jest.mock('../../src/services/userService', () => ({
    login: jest.fn(),
    register: jest.fn(),
}));

const userService = require('../../src/services/userService');
const { app, server } = require('../../index');

describe('API endpoint integration', () => {
    afterAll(async () => {
        websocketService.stop();
        await new Promise(resolve => server.close(resolve));
    });

    test('POST /api/v1/auth/login returns token for valid credentials', async () => {
        userService.login.mockResolvedValueOnce({
            id: 'u-1',
            username: 'admin',
            role: 'admin',
            password: 'hashed', // NOSONAR - test fixture only
        });

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'admin', password: 'secret123' }); // NOSONAR - test input only

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(typeof res.body.token).toBe('string');
        expect(res.body.data?.user?.username).toBe('admin');
    });

    test('POST /api/v1/auth/login rejects invalid credentials', async () => {
        userService.login.mockResolvedValueOnce(null);

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({ username: 'wrong-user', password: 'wrongpass123' }); // NOSONAR - test input only

        expect(res.statusCode).not.toBe(200);
        expect(res.body?.token).toBeUndefined();
    });

    test('GET /api/v1/trucks returns coordinate payload for map rendering', async () => {
        const res = await request(app).get('/api/v1/trucks');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);

        const item = res.body[0];
        expect(typeof item.latitude).toBe('number');
        expect(typeof item.longitude).toBe('number');
        expect(item.id).toBeTruthy();
    });
});
