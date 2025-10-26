-- CreateTable
CREATE TABLE IF NOT EXISTS "Telemetry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "truckId" INTEGER NOT NULL,
  "latitude" REAL NOT NULL,
  "longitude" REAL NOT NULL,
  "speedKmh" REAL NOT NULL,
  "cargoTempC" REAL NOT NULL,
  "fuelLevelPct" REAL,
  "batteryPct" REAL,
  "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Telemetry_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_telemetry_truck_id" ON "Telemetry"("truckId");
CREATE INDEX IF NOT EXISTS "idx_telemetry_recorded_at" ON "Telemetry"("recordedAt");
