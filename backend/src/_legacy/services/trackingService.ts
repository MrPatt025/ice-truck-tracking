// backend/src/services/truckService.ts
import { prisma } from '../lib/prisma';

export const getAllTrucks = async () => {
  return prisma.truck.findMany({
    include: { alerts: true }, // มีอยู่ในสคีมาปัจจุบัน
    orderBy: { id: 'asc' },
  });
};
