/*
  Warnings:

  - Added the required column `adminId` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscriberId` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "adminId" TEXT NOT NULL,
ADD COLUMN     "subscriberId" TEXT NOT NULL,
ALTER COLUMN "from" DROP NOT NULL,
ALTER COLUMN "body" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "subscribers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
