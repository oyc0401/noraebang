/*
  Warnings:

  - A unique constraint covering the columns `[tj_song_id]` on the table `song` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "song" ADD COLUMN     "tj_song_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "song_tj_song_id_key" ON "song"("tj_song_id");

-- CreateIndex
CREATE INDEX "song_tj_song_id_idx" ON "song"("tj_song_id");

-- AddForeignKey
ALTER TABLE "song" ADD CONSTRAINT "song_tj_song_id_fkey" FOREIGN KEY ("tj_song_id") REFERENCES "tj_song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
