-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Telemetry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "truckId" INTEGER NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "speedKmh" REAL NOT NULL,
    "cargoTempC" REAL NOT NULL,
    "fuelLevelPct" REAL,
    "batteryPct" REAL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Telemetry_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Telemetry" ("batteryPct", "cargoTempC", "fuelLevelPct", "id", "latitude", "longitude", "recordedAt", "speedKmh", "truckId") SELECT "batteryPct", "cargoTempC", "fuelLevelPct", "id", "latitude", "longitude", "recordedAt", "speedKmh", "truckId" FROM "Telemetry";
DROP TABLE "Telemetry";
ALTER TABLE "new_Telemetry" RENAME TO "Telemetry";
CREATE INDEX "idx_telemetry_truck_id" ON "Telemetry"("truckId");
CREATE INDEX "idx_telemetry_recorded_at" ON "Telemetry"("recordedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
