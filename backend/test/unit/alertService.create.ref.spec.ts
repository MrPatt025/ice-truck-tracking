import { describe, it, expect } from 'vitest';
import { createAlert } from '../../src/services/alertService';

describe('alertService shape', () => {
  it('exports createAlert', () => {
    expect(typeof createAlert).toBe('function');
  });
});
