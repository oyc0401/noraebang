/*
  Warnings:

  - You are about to drop the column `catalog` on the `artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "artist" DROP COLUMN "catalog",
ADD COLUMN     "home_catalog" TEXT;
