/*
  Warnings:

  - You are about to drop the column `device_limit` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `serviceId` on the `subscribers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[service_id]` on the table `subscribers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `max_devices` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `service_id` to the `subscribers` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "subscribers_serviceId_key";

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "device_limit",
ADD COLUMN     "max_devices" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "subscribers" DROP COLUMN "serviceId",
ADD COLUMN     "device_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "service_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_service_id_key" ON "subscribers"("service_id");
