/*
  Warnings:

  - Added the required column `gender` to the `subscribers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "subscribers" ADD COLUMN     "gender" "Gender" NOT NULL;
