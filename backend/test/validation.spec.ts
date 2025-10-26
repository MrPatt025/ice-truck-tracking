import { describe, it, expect } from 'vitest';
import server from '../src/index';

describe('validation', () => {
  it('POST /trucks ชื่อว่าง -> 400', async () => {
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks',
      payload: { name: '' },
    });
    expect(r.statusCode).toBe(400);
  });
});
