/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Truck` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Truck_name_key" ON "Truck"("name");
