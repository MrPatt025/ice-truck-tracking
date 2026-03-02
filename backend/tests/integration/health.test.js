const request = require('supertest');
const { app, server } = require('../../index');
const websocketService = require('../../src/services/websocketService');

describe('Health API', () => {
  afterAll(async () => {
    websocketService.stop();
    await new Promise(resolve => server.close(resolve));
  });

  it('should return healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
