/*
  Warnings:

  - Added the required column `role` to the `subscribers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADMIN', 'SUPER_ADMIN');

-- AlterTable
ALTER TABLE "subscribers" ADD COLUMN     "role" "Role" NOT NULL;
