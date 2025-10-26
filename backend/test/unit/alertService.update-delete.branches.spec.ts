// backend/test/unit/alertService.update-delete.branches.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Alert = {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  truckId: number;
  createdAt: Date;
};

// Hoisted mock with targeted delete/update implementations
const { delMock, updMock, prismaMock } = vi.hoisted(() => {
  const delMock = vi.fn(async (_args: { where: { id: number } }) => {
    const { id } = _args.where;
    if (id === 1)
      return {
        id,
        level: 'INFO',
        message: 'ok',
        truckId: 1,
        createdAt: new Date(),
      } as Alert;
    const err = new Error('Not found') as Error & { code?: string };
    (err as any).code = 'P2025';
    throw err;
  });
  const updMock = vi.fn(
    async (_args: {
      where: { id: number };
      data: { message?: any; level?: any };
    }) => {
      const { id } = _args.where;
      if (id === 1) {
        const msg =
          typeof _args.data.message === 'string'
            ? _args.data.message
            : _args.data.message?.set;
        return {
          id,
          level: (_args.data.level ?? 'INFO') as Alert['level'],
          message: msg ?? 'm',
          truckId: 1,
          createdAt: new Date(),
        } as Alert;
      }
      const err = new Error('Not found') as Error & { code?: string };
      (err as any).code = 'P2025';
      throw err;
    },
  );
  return {
    delMock,
    updMock,
    prismaMock: { alert: { delete: delMock, update: updMock } },
  };
});

vi.mock('../../src/lib/prisma', () => ({ prisma: prismaMock as any }));

import { deleteAlert, updateAlert } from '../../src/services/alertService';

beforeEach(() => {
  delMock.mockClear();
  updMock.mockClear();
});

describe('alertService delete/update branches', () => {
  it('deleteAlert: returns false on P2025, true on success', async () => {
    await expect(deleteAlert(999)).resolves.toBe(false);
    await expect(deleteAlert(1)).resolves.toBe(true);
    expect(delMock).toHaveBeenCalledTimes(2);
  });

  it('updateAlert: returns null on P2025, trims/accepts string message', async () => {
    await expect(updateAlert(999, { message: 'x' })).resolves.toBeNull();
    const r = await updateAlert(1, { message: '  hello  ' });
    expect(r?.message).toBe('hello');
    expect(updMock).toHaveBeenCalledTimes(2);
  });

  it('updateAlert: supports { message: { set } } and throws on empty', async () => {
    const ok = await updateAlert(1, { message: { set: ' ok ' } as any });
    expect(ok?.message).toBe('ok');
    await expect(updateAlert(1, { message: '' as any })).rejects.toBeInstanceOf(
      TypeError,
    );
    await expect(
      updateAlert(1, { message: { set: '   ' } as any }),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
