// backend/test/__mocks__/prisma.mock.ts
import { vi } from 'vitest';

/* -------------------------------------------------------------------------- */
/*                                  Types                                      */
/* -------------------------------------------------------------------------- */

export type Truck = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Alert = {
  id: number;
  level: string;
  message: string;
  createdAt: Date;
  truckId: number;
};

type SortDir = 'asc' | 'desc';
type TruckOrderBy = Partial<Record<keyof Truck, SortDir>>;

interface TruckFindManyArgs {
  orderBy?: TruckOrderBy;
  skip?: number;
  take?: number;
}

interface TruckWhereUnique {
  id?: number;
  name?: string;
}

interface TruckFindUniqueArgs {
  where: TruckWhereUnique;
}

interface TruckCreateArgs {
  data: { name: string };
}

interface TruckUpdateArgs {
  where: { id: number };
  data: { name?: string };
}

interface TruckDeleteArgs {
  where: { id: number };
}

interface AlertFindUniqueArgs {
  where: { id: number };
}

interface AlertCreateArgs {
  data: {
    level: string;
    message: string;
    truck: { connect: { id: number } };
  };
}

/* -------------------------------------------------------------------------- */
/*                                Error shapes                                 */
/*  Match Prisma's well-known codes so production code can branch on `code`.   */
/* -------------------------------------------------------------------------- */

class PrismaP2002Error extends Error {
  readonly code = 'P2002';
  constructor(msg = 'Unique constraint failed on the fields: (`name`)') {
    super(msg);
    this.name = 'PrismaClientKnownRequestError';
  }
}

class PrismaP2025Error extends Error {
  readonly code = 'P2025';
  constructor(
    msg = 'An operation failed because it depends on one or more records that were required but not found.',
  ) {
    super(msg);
    this.name = 'PrismaClientKnownRequestError';
  }
}

/* -------------------------------------------------------------------------- */
/*                                In-memory DB                                 */
/* -------------------------------------------------------------------------- */

let autoId = 1;
let autoAlertId = 1;
const trucks: Truck[] = [];
const alerts: Alert[] = [];

const now = () => new Date();

function compareVals(
  a: string | number | Date,
  b: string | number | Date,
): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/* -------------------------------------------------------------------------- */
/*                                 Test utils                                  */
/* -------------------------------------------------------------------------- */

/** เคลียร์สตอเรจ ก่อนแต่ละเทสต์ */
export function reset(): void {
  autoId = 1;
  autoAlertId = 1;
  trucks.length = 0;
  alerts.length = 0;
}

/** seed ชื่อรถบรรทุกแบบรวดเร็ว */
export function seedTrucks(names: string[]): void {
  for (const name of names) {
    trucks.push({ id: autoId++, name, createdAt: now(), updatedAt: now() });
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Mock API                                   */
/* -------------------------------------------------------------------------- */

export const prismaMock = {
  /* -------------------------------- $transaction ------------------------------- */
  /**
   * รองรับทั้ง 2 รูปแบบ:
   *  - prisma.$transaction([promise1, promise2])
   *  - prisma.$transaction(async (tx) => { ... })
   *
   * ใน mock จะทำงานเทียบเท่า Promise.all / เรียก callback ด้วย delegate เดิม
   */
  $transaction: vi.fn(async (arg: unknown) => {
    if (Array.isArray(arg)) {
      // แบบ array: รวมผลพร้อมกัน
      return Promise.all(arg as Promise<unknown>[]);
    }
    if (typeof arg === 'function') {
      // แบบ interactive callback
      // ส่ง "tx client" ที่มี shape เดียวกับ prismaMock (พอสำหรับยูนิตเทสต์)
      const tx = {
        truck: prismaMock.truck,
        alert: prismaMock.alert,
        $transaction: prismaMock.$transaction,
      };
      return (arg as (tx: typeof tx) => unknown | Promise<unknown>)(tx);
    }
    throw new TypeError('$transaction: invalid argument');
  }),

  /* --------------------------------- Truck --------------------------------- */
  truck: {
    findMany: vi.fn(async (args?: TruckFindManyArgs): Promise<Truck[]> => {
      let rows = [...trucks];

      const ob = args?.orderBy;
      if (ob && Object.keys(ob).length) {
        const [key, dir] = Object.entries(ob)[0] as [keyof Truck, SortDir];
        const sign = dir === 'desc' ? -1 : 1;
        rows.sort(
          (a, b) => compareVals(a[key] as never, b[key] as never) * sign,
        );
      }

      if (typeof args?.skip === 'number' || typeof args?.take === 'number') {
        const s = args?.skip ?? 0;
        const t = args?.take ?? rows.length;
        rows = rows.slice(s, s + t);
      }

      return rows;
    }),

    findUnique: vi.fn(
      async (args: TruckFindUniqueArgs): Promise<Truck | null> => {
        const w = args.where;
        if (typeof w.id === 'number')
          return trucks.find((t) => t.id === w.id) ?? null;
        if (typeof w.name === 'string')
          return trucks.find((t) => t.name === w.name) ?? null;
        return null;
      },
    ),

    create: vi.fn(async (args: TruckCreateArgs): Promise<Truck> => {
      const name = args.data.name.trim();
      if (!name) throw new PrismaP2002Error('Name cannot be empty'); // mimic validation failure path
      if (trucks.some((t) => t.name === name)) throw new PrismaP2002Error();

      const row: Truck = {
        id: autoId++,
        name,
        createdAt: now(),
        updatedAt: now(),
      };
      trucks.push(row);
      return row;
    }),

    update: vi.fn(async (args: TruckUpdateArgs): Promise<Truck> => {
      const id = args.where.id;
      const t = trucks.find((x) => x.id === id);
      if (!t) throw new PrismaP2025Error();

      if (
        args.data.name &&
        args.data.name !== t.name &&
        trucks.some((x) => x.name === args.data.name)
      ) {
        throw new PrismaP2002Error();
      }

      if (typeof args.data.name === 'string') t.name = args.data.name.trim();
      t.updatedAt = now();
      return t;
    }),

    delete: vi.fn(async (args: TruckDeleteArgs): Promise<Truck> => {
      const id = args.where.id;
      const i = trucks.findIndex((x) => x.id === id);
      if (i < 0) throw new PrismaP2025Error();
      const [removed] = trucks.splice(i, 1);
      return removed;
    }),

    count: vi.fn(async (): Promise<number> => trucks.length),
  },

  /* --------------------------------- Alert --------------------------------- */
  alert: {
    findMany: vi.fn(async (): Promise<Alert[]> => [...alerts]),

    findUnique: vi.fn(
      async (args: AlertFindUniqueArgs): Promise<Alert | null> => {
        return alerts.find((a) => a.id === args.where.id) ?? null;
      },
    ),

    create: vi.fn(async (args: AlertCreateArgs): Promise<Alert> => {
      const { level, message, truck } = args.data;
      const truckId = truck.connect.id;
      const exists = trucks.some((t) => t.id === truckId);
      if (!exists) throw new PrismaP2025Error('Truck not found');

      const row: Alert = {
        id: autoAlertId++,
        level,
        message,
        createdAt: now(),
        truckId,
      };
      alerts.push(row);
      return row;
    }),
  },
} as const;

/* -------------------------------------------------------------------------- */
/*                        Compatibility named export                           */
/*  บางเทสต์ import { prisma } จาก lib – ให้ alias เป็น prismaMock เช่นกัน      */
/* -------------------------------------------------------------------------- */

export const prisma = prismaMock;

export default prismaMock;
