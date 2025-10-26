// backend/prisma/seed.ts
import { AlertLevel, type Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

/**
 * Upsert trucks by unique name and return their ids.
 */
async function upsertTrucks(
  tx: Prisma.TransactionClient,
  names: readonly string[],
): Promise<Array<{ id: number; name: string }>> {
  const ops = names.map((name) =>
    tx.truck.upsert({
      where: { name }, // require unique on Truck.name
      update: {},
      create: { name },
      select: { id: true, name: true },
    }),
  );
  return Promise.all(ops);
}

/**
 * Seed minimal sample alerts for a truck exactly once.
 * (ไม่ใช้ skipDuplicates เพื่อความเข้ากันได้ทุก provider/เวอร์ชัน)
 */
async function ensureSampleAlerts(
  tx: Prisma.TransactionClient,
  truckId: number,
): Promise<void> {
  const alreadyHasAlerts = await tx.alert.count({ where: { truckId } });
  if (alreadyHasAlerts > 0) return;

  await tx.alert.createMany({
    data: [
      { level: AlertLevel.INFO, message: 'Engine start', truckId },
      { level: AlertLevel.WARN, message: 'Temp high', truckId },
    ],
  });
}

export async function main(): Promise<void> {
  const names = ['ICE-TRK-001', 'ICE-TRK-002', 'ICE-TRK-003'] as const;

  await prisma.$transaction(async (tx) => {
    const trucks = await upsertTrucks(tx, names);

    const t1 = trucks.find((t) => t.name === 'ICE-TRK-001');
    if (t1) {
      await ensureSampleAlerts(tx, t1.id);
    }
  });
}

void (async () => {
  try {
    await prisma.$connect();
    await main();
    console.log('Seed done');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
