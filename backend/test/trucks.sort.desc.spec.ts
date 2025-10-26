import { expect, test } from 'vitest';
import server from '../src/index';

test('trucks > sorting desc branch', async () => {
  await server.inject({
    method: 'POST',
    url: '/api/v1/trucks',
    payload: { name: 'ZZ-1' },
  });
  await server.inject({
    method: 'POST',
    url: '/api/v1/trucks',
    payload: { name: 'AA-1' },
  });

  const res = await server.inject({
    method: 'GET',
    url: '/api/v1/trucks?page=1&limit=2&sort=name&order=desc',
  });
  expect(res.statusCode).toBe(200);
  const items = res.json();
  expect(Array.isArray(items)).toBe(true);
  if (items.length >= 2) {
    expect(items[0].name >= items[1].name).toBe(true); // ครอบสาขา desc
  }
});
