-- AlterTable
ALTER TABLE "subscribers" ADD COLUMN     "last_active_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "profile_picture" TEXT;
