/*
  Warnings:

  - You are about to drop the column `adminId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `subscriberId` on the `notifications` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('RENEWAL', 'UPGRADE', 'DOWNGRADE', 'NEW');

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_adminId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_subscriberId_fkey";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "adminId",
DROP COLUMN "subscriberId",
ADD COLUMN     "admin_id" TEXT,
ADD COLUMN     "subscriber_id" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "type" "SubscriptionType" NOT NULL DEFAULT 'NEW';

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "subscribers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
