/*
  Warnings:

  - Added the required column `released_year_month` to the `tj_song` table without a default value. This is not possible if the table is not empty.
  - Made the column `nation_type` on table `tj_song` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tj_song" ADD COLUMN     "released_year_month" TEXT NOT NULL,
ALTER COLUMN "nation_type" SET NOT NULL;
