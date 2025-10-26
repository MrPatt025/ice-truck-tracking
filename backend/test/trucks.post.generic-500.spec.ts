import { describe, it, expect, vi } from 'vitest';
import server from '../src/index';
import { prisma } from '../src/lib/prisma';

describe('trucks POST generic error -> 500', () => {
  it('returns 500 when prisma throws non-P2002', async () => {
    const spy = vi
      .spyOn(prisma.truck, 'create')
      .mockRejectedValueOnce(new Error('boom'));
    const r = await server.inject({
      method: 'POST',
      url: '/api/v1/trucks',
      payload: { name: 'X-ERR-1' },
    });
    expect(r.statusCode).toBe(500);
    spy.mockRestore();
  });
});
