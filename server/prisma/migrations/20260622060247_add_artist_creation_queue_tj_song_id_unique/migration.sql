/*
  Warnings:

  - A unique constraint covering the columns `[tj_song_id]` on the table `artist_creation_queue` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "artist_creation_queue_tj_song_id_key" ON "artist_creation_queue"("tj_song_id");
