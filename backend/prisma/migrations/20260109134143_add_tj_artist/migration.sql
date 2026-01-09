/*
  Warnings:

  - You are about to drop the column `artist_id` on the `spotify_artist` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[spotify_id]` on the table `artist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "spotify_artist" DROP CONSTRAINT "spotify_artist_artist_id_fkey";

-- DropIndex
DROP INDEX "spotify_artist_artist_id_key";

-- AlterTable
ALTER TABLE "artist" ADD COLUMN     "spotify_id" TEXT;

-- AlterTable
ALTER TABLE "spotify_artist" DROP COLUMN "artist_id";

-- AlterTable
ALTER TABLE "tj_song" ADD COLUMN     "is_mr" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_mv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_over_60" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "youtube_link" TEXT;

-- CreateTable
CREATE TABLE "artist_tj_song" (
    "id" SERIAL NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "tj_song_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_tj_song_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artist_tj_song_artist_id_idx" ON "artist_tj_song"("artist_id");

-- CreateIndex
CREATE INDEX "artist_tj_song_tj_song_id_idx" ON "artist_tj_song"("tj_song_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_tj_song_artist_id_tj_song_id_key" ON "artist_tj_song"("artist_id", "tj_song_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_spotify_id_key" ON "artist"("spotify_id");

-- AddForeignKey
ALTER TABLE "artist" ADD CONSTRAINT "artist_spotify_id_fkey" FOREIGN KEY ("spotify_id") REFERENCES "spotify_artist"("spotify_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_tj_song" ADD CONSTRAINT "artist_tj_song_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_tj_song" ADD CONSTRAINT "artist_tj_song_tj_song_id_fkey" FOREIGN KEY ("tj_song_id") REFERENCES "tj_song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
