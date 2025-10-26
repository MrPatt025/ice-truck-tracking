// driverService.ts
import { prisma } from '../lib/prisma';
export const getAllDrivers = () => (prisma as any).drivers?.findMany();
