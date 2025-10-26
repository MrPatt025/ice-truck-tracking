import server from '../src/index';
import { describe, it, expect } from 'vitest';

describe('bad json body -> 400', () => {
  it('POST /api/v1/trucks with invalid JSON', async () => {
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks',
      payload: '{bad json',
      headers: { 'content-type': 'application/json' },
    });
    // Fastify จะตอบ 400 สำหรับ JSON parse error
    expect([400, 415]).toContain(r.statusCode);
  });
});
