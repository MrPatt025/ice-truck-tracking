import { describe, it, expect, vi } from 'vitest';
import server from '../src/index';
import { prisma } from '../src/lib/prisma';

describe('alerts list generic error -> 500', () => {
  it('returns 500 when prisma throws', async () => {
    const spy = vi
      .spyOn(prisma.alert, 'findMany')
      .mockRejectedValueOnce(new Error('boom'));
    const r = await server.inject({ method: 'GET', url: '/api/v1/alerts' });
    expect(r.statusCode).toBe(500);
    spy.mockRestore();
  });
});
