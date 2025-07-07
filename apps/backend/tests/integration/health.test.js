const request = require('supertest');
const { app, server } = require('../../index');

describe('Health API', () => {
  afterAll(() => {
    server.close();
  });

  it('should return healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
