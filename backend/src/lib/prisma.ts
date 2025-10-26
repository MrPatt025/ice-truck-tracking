// backend/src/lib/prisma.ts
import { PrismaClient, type Prisma } from '@prisma/client';

const ENV = process.env.NODE_ENV ?? 'development';
const isProd = ENV === 'production';
const isTest = ENV === 'test';

const options: Prisma.PrismaClientOptions = {
  errorFormat: isTest ? 'minimal' : 'colorless',
  log: isTest ? [] : (['warn', 'error'] satisfies Prisma.LogLevel[]),
};

/**
 * Augment globalThis for a type-safe Prisma singleton & one-time hook flag
 */
declare global {
  var __PRISMA__: PrismaClient | undefined;

  var __PRISMA_HOOKS__: boolean | undefined;
}

/**
 * Create a new Prisma client (isolated for easier typing/testing)
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient(options);
}

/**
 * Singleton:
 * - Dev/Test: reuse on globalThis to avoid HMR connection leaks
 * - Prod: let GC collect normally (no global caching)
 */
export const prisma: PrismaClient =
  (!isProd ? globalThis.__PRISMA__ : undefined) ?? createPrismaClient();

if (!isProd) {
  globalThis.__PRISMA__ = prisma;
}

/**
 * Graceful shutdown hooks, register once
 */
if (!globalThis.__PRISMA_HOOKS__) {
  const shutdown = async (): Promise<void> => {
    try {
      await prisma.$disconnect();
    } catch {
      // swallow disconnect errors on shutdown
    }
  };

  if (!isTest) {
    process.once('SIGINT', () => {
      void shutdown().finally(() => process.exit(0));
    });
    process.once('SIGTERM', () => {
      void shutdown().finally(() => process.exit(0));
    });
    // Windows console (Ctrl+Break)
    process.once('SIGBREAK', () => {
      void shutdown().finally(() => process.exit(0));
    });
  }

  // Ensure connections close before process exits
  process.once('beforeExit', () => {
    void shutdown();
  });

  globalThis.__PRISMA_HOOKS__ = true;
}

export default prisma;
