// backend/src/lib/prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';

const env = process.env.NODE_ENV ?? 'development';
const isProd = env === 'production';
const isTest = env === 'test';

const options: Prisma.PrismaClientOptions = {
  errorFormat: isTest ? 'minimal' : 'colorless',
  log: isTest ? [] : ['warn', 'error'],
};

// ป้องกันสร้างหลายอินสแตนซ์เมื่อ hot-reload
const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
  __prismaHooksRegistered?: boolean;
};

const created = !globalForPrisma.__prisma;
export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? new PrismaClient(options);

if (!isProd) {
  globalForPrisma.__prisma = prisma;
}

if (created && !globalForPrisma.__prismaHooksRegistered) {
  const shutdown = async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // no-op
    }
  };

  // หลีกเลี่ยง async listener เพื่อไม่ให้ชน @typescript-eslint/no-misused-promises
  if (!isTest) {
    process.once('SIGINT', () => {
      void shutdown().finally(() => {
        process.exit(0);
      });
    });
    process.once('SIGTERM', () => {
      void shutdown().finally(() => {
        process.exit(0);
      });
    });
    // รองรับ Windows
    process.once('SIGBREAK', () => {
      void shutdown().finally(() => {
        process.exit(0);
      });
    });
  }

  // ปิดคอนเนกชันก่อนโปรเซสจบ โดยไม่คืน Promise ออกจาก listener
  process.once('beforeExit', () => {
    void shutdown();
  });

  globalForPrisma.__prismaHooksRegistered = true;
}
