/*
  Warnings:

  - The values [STUDENT] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUBSCRIBER', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "subscribers" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "privilege" "Role" NOT NULL,
    "email" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "profile_picture" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_service_id_key" ON "admins"("service_id");

-- CreateIndex
CREATE INDEX "admins_id_service_id_idx" ON "admins"("id", "service_id");
