-- CreateIndex
CREATE INDEX "Alert_truckId_createdAt_idx" ON "Alert"("truckId", "createdAt");

-- CreateIndex
CREATE INDEX "Truck_createdAt_idx" ON "Truck"("createdAt");
