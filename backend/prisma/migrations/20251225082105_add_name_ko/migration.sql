/*
  Warnings:

  - A unique constraint covering the columns `[pathname]` on the table `artist` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name_ko` to the `artist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pathname` to the `artist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "artist" ADD COLUMN     "name_ko" TEXT NOT NULL,
ADD COLUMN     "pathname" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "artist_pathname_key" ON "artist"("pathname");
