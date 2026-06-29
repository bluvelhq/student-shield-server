/*
  Warnings:

  - A unique constraint covering the columns `[serviceId]` on the table `subscribers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `serviceId` to the `subscribers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "subscribers" ADD COLUMN     "serviceId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_serviceId_key" ON "subscribers"("serviceId");
