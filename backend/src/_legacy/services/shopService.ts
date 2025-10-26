// shopService.ts
import { prisma } from '../lib/prisma';
export const getShopById = (id: number) =>
  (prisma as any).shops?.findUnique({ where: { id } });
