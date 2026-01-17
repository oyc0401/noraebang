/*
  Warnings:

  - You are about to drop the column `order` on the `artist_song` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "artist_song" DROP COLUMN "order";

-- CreateIndex
CREATE INDEX "artist_spotify_id_idx" ON "artist"("spotify_id");

-- CreateIndex
CREATE INDEX "artist_home_catalog_idx" ON "artist"("home_catalog");

-- CreateIndex
CREATE INDEX "song_propose_query_idx" ON "song_propose"("query");

-- CreateIndex
CREATE INDEX "spotify_artist_popularity_idx" ON "spotify_artist"("popularity");
