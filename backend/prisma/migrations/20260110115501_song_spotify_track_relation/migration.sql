/*
  Warnings:

  - You are about to drop the column `song_id` on the `spotify_track` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "spotify_track" DROP CONSTRAINT "spotify_track_song_id_fkey";

-- AlterTable
ALTER TABLE "spotify_track" DROP COLUMN "song_id";

-- CreateTable
CREATE TABLE "song_spotify_track" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "spotify_track_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_spotify_track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "song_spotify_track_song_id_key" ON "song_spotify_track"("song_id");

-- CreateIndex
CREATE INDEX "song_spotify_track_spotify_track_id_idx" ON "song_spotify_track"("spotify_track_id");

-- AddForeignKey
ALTER TABLE "song_spotify_track" ADD CONSTRAINT "song_spotify_track_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_spotify_track" ADD CONSTRAINT "song_spotify_track_spotify_track_id_fkey" FOREIGN KEY ("spotify_track_id") REFERENCES "spotify_track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
