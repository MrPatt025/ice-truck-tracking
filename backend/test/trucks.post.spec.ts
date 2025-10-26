// backend/test/trucks.post.spec.ts
import { describe, it, expect } from 'vitest';
import server from '../src/index';
import crypto from 'node:crypto';

const URL = '/api/v1/trucks';
const unique = () =>
  `ICE-TRK-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

describe('trucks POST', () => {
  it('create truck success (201 preferred)', async () => {
    const name = unique();

    const res = await server.inject({
      method: 'POST',
      url: URL,
      payload: { name },
      headers: { 'content-type': 'application/json' },
    });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.headers['content-type']).toContain('application/json');

    const body = res.json();
    expect(body).toHaveProperty('id');
    expect(typeof body.id).toBe('number');
    expect(body).toHaveProperty('name', name);
    if (body.createdAt)
      expect(new Date(body.createdAt).toString()).not.toBe('Invalid Date');
    if (body.updatedAt)
      expect(new Date(body.updatedAt).toString()).not.toBe('Invalid Date');
  });

  it('reject duplicate name (409)', async () => {
    const name = unique();

    const first = await server.inject({
      method: 'POST',
      url: URL,
      payload: { name },
      headers: { 'content-type': 'application/json' },
    });
    expect([200, 201]).toContain(first.statusCode);

    const dup = await server.inject({
      method: 'POST',
      url: URL,
      payload: { name },
      headers: { 'content-type': 'application/json' },
    });

    expect(dup.statusCode).toBe(409);
    const err = dup.json();
    // ข้อความ error อาจต่างกันไป จึงตรวจแค่ชนิด
    expect(typeof err).toBe('object');
  });
});
