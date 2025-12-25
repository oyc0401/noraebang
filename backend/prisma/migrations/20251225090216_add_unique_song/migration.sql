/*
  Warnings:

  - A unique constraint covering the columns `[artist_id,title_norm]` on the table `song` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "song_artist_id_title_norm_key" ON "song"("artist_id", "title_norm");
