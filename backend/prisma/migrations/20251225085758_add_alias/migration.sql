/*
  Warnings:

  - You are about to drop the column `pathname` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `primary_artist_id` on the `song` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[alias]` on the table `artist` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `alias` to the `artist` table without a default value. This is not possible if the table is not empty.
  - Added the required column `artist_id` to the `song` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "song" DROP CONSTRAINT "song_primary_artist_id_fkey";

-- DropIndex
DROP INDEX "artist_pathname_key";

-- AlterTable
ALTER TABLE "artist" DROP COLUMN "pathname",
ADD COLUMN     "alias" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "song" DROP COLUMN "primary_artist_id",
ADD COLUMN     "artist_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "artist_alias_key" ON "artist"("alias");

-- AddForeignKey
ALTER TABLE "song" ADD CONSTRAINT "song_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
