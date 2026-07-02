/*
  Warnings:

  - The `type` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('RENEWAL', 'UPGRADE', 'DOWNGRADE', 'NEW');

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "type",
ADD COLUMN     "type" "PaymentType" NOT NULL DEFAULT 'NEW';

-- DropEnum
DROP TYPE "SubscriptionType";
