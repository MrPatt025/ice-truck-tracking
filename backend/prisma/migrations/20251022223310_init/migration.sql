-- CreateIndex
CREATE INDEX "idx_alert_level_created_at" ON "Alert"("level", "createdAt");

-- CreateIndex
CREATE INDEX "idx_truck_updated_at" ON "Truck"("updatedAt");

-- RedefineIndex
DROP INDEX "Alert_truckId_createdAt_idx";
CREATE INDEX "idx_alert_truck_created_at" ON "Alert"("truckId", "createdAt");

-- RedefineIndex
DROP INDEX "Alert_createdAt_idx";
CREATE INDEX "idx_alert_created_at" ON "Alert"("createdAt");

-- RedefineIndex
DROP INDEX "Alert_truckId_idx";
CREATE INDEX "idx_alert_truck_id" ON "Alert"("truckId");

-- RedefineIndex
DROP INDEX "Truck_createdAt_idx";
CREATE INDEX "idx_truck_created_at" ON "Truck"("createdAt");

-- RedefineIndex
DROP INDEX "Truck_name_key";
CREATE UNIQUE INDEX "uq_truck_name" ON "Truck"("name");
