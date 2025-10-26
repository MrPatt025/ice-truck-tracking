'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.main = main;
// backend/prisma/seed.ts
const client_1 = require('@prisma/client');
const prisma_1 = require('../src/lib/prisma');
async function upsertTrucks(tx, names) {
  const ops = names.map((name) =>
    tx.truck.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    }),
  );
  return Promise.all(ops);
}
async function ensureSampleAlerts(tx, truckId) {
  const exists = await tx.alert.findFirst({
    where: { truckId },
    select: { id: true },
  });
  if (exists) return;
  await tx.alert.createMany({
    data: [
      { level: client_1.AlertLevel.INFO, message: 'Engine start', truckId },
      { level: client_1.AlertLevel.WARN, message: 'Temp high', truckId },
    ],
    skipDuplicates: true,
  });
}
async function main() {
  const names = ['ICE-TRK-001', 'ICE-TRK-002', 'ICE-TRK-003'];
  await prisma_1.prisma.$transaction(async (tx) => {
    const trucks = await upsertTrucks(tx, names);
    const t1 = trucks.find((t) => t.name === 'ICE-TRK-001');
    if (t1) {
      await ensureSampleAlerts(tx, t1.id);
    }
  });
}
void (async () => {
  try {
    await prisma_1.prisma.$connect();
    await main();

    console.log('Seed done');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma_1.prisma.$disconnect();
  }
})();
