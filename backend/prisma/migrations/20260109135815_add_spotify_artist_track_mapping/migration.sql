/*
  Warnings:

  - You are about to drop the column `thumbnail_medium` on the `spotify_track` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "spotify_track" DROP COLUMN "thumbnail_medium",
ADD COLUMN     "spotify_medium" TEXT;

-- CreateTable
CREATE TABLE "spotify_artist_track" (
    "id" SERIAL NOT NULL,
    "spotify_artist_id" INTEGER NOT NULL,
    "spotify_track_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spotify_artist_track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spotify_artist_track_spotify_artist_id_idx" ON "spotify_artist_track"("spotify_artist_id");

-- CreateIndex
CREATE INDEX "spotify_artist_track_spotify_track_id_idx" ON "spotify_artist_track"("spotify_track_id");

-- CreateIndex
CREATE UNIQUE INDEX "spotify_artist_track_spotify_artist_id_spotify_track_id_key" ON "spotify_artist_track"("spotify_artist_id", "spotify_track_id");

-- AddForeignKey
ALTER TABLE "spotify_artist_track" ADD CONSTRAINT "spotify_artist_track_spotify_artist_id_fkey" FOREIGN KEY ("spotify_artist_id") REFERENCES "spotify_artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spotify_artist_track" ADD CONSTRAINT "spotify_artist_track_spotify_track_id_fkey" FOREIGN KEY ("spotify_track_id") REFERENCES "spotify_track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
