// backend/test/unit/userService.jwt-secret.spec.ts
import { describe, it, expect, afterAll } from 'vitest';
import { resolveJwtSecret } from '../../src/services/userService';

describe('resolveJwtSecret', () => {
  const ORIGINAL = process.env.JWT_SECRET;

  afterAll(() => {
    if (ORIGINAL === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = ORIGINAL;
  });

  it('uses process.env by default', () => {
    process.env.JWT_SECRET = 'from-env';
    expect(resolveJwtSecret()).toBe('from-env');
  });

  it.each([
    [{}, 'change-me-in-prod'], // undefined
    [{ JWT_SECRET: '' }, 'change-me-in-prod'],
    [{ JWT_SECRET: '   ' }, 'change-me-in-prod'],
    [{ JWT_SECRET: 'abc' }, 'abc'],
    [{ JWT_SECRET: '  abc  ' }, 'abc'], // trims whitespace
    [{ JWT_SECRET: '0' }, '0'], // falsy-like but valid
    [{ JWT_SECRET: 'false' }, 'false'], // falsy-like but valid
  ] as const)('returns expected for %j', (env, expected) => {
    const frozen = Object.freeze({ ...env }) as NodeJS.ProcessEnv;
    expect(resolveJwtSecret(frozen)).toBe(expected);
  });

  it('does not mutate provided env object', () => {
    const env = { JWT_SECRET: 'abc' } as NodeJS.ProcessEnv;
    const copy = { ...env };
    void resolveJwtSecret(env);
    expect(env).toEqual(copy);
  });
});
