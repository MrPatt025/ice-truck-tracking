import { PrismaClient, AlertLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const names = ['ICE-TRK-001', 'ICE-TRK-002', 'ICE-TRK-003'];

  await prisma.$transaction(async (tx) => {
    const trucks = await Promise.all(
      names.map((name) =>
        tx.truck.upsert({
          where: { name },
          update: {},
          create: { name },
          select: { id: true, name: true },
        }),
      ),
    );

    const t1 = trucks.find((t) => t.name === 'ICE-TRK-001');
    if (!t1) return;

    const already = await tx.alert.findFirst({
      where: { truckId: t1.id },
      select: { id: true },
    });
    if (already) return;

    await tx.alert.createMany({
      data: [
        { level: AlertLevel.INFO, message: 'Engine start', truckId: t1.id },
        { level: AlertLevel.WARN, message: 'Temp high', truckId: t1.id },
      ],
    });
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
