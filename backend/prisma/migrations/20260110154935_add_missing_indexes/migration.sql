/*
  Warnings:

  - You are about to drop the column `ingested_at` on the `karaoke_song` table. All the data in the column will be lost.
  - You are about to drop the column `ingested_from` on the `karaoke_song` table. All the data in the column will be lost.
  - You are about to drop the column `last_seen_at` on the `karaoke_song` table. All the data in the column will be lost.
  - You are about to drop the column `provider_song_url` on the `karaoke_song` table. All the data in the column will be lost.
  - You are about to drop the `song_spotify_track` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "song_spotify_track" DROP CONSTRAINT "song_spotify_track_song_id_fkey";

-- DropForeignKey
ALTER TABLE "song_spotify_track" DROP CONSTRAINT "song_spotify_track_spotify_track_id_fkey";

-- AlterTable
ALTER TABLE "karaoke_song" DROP COLUMN "ingested_at",
DROP COLUMN "ingested_from",
DROP COLUMN "last_seen_at",
DROP COLUMN "provider_song_url";

-- AlterTable
ALTER TABLE "spotify_track" ADD COLUMN     "group_id" INTEGER;

-- DropTable
DROP TABLE "song_spotify_track";

-- CreateTable
CREATE TABLE "spotify_track_group" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "primary_spotify_track_id" INTEGER,
    "title_ko" TEXT,
    "title_latin" TEXT,
    "title_ja_kana" TEXT,
    "title_ja_kanji" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spotify_track_group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spotify_track_group_song_id_key" ON "spotify_track_group"("song_id");

-- CreateIndex
CREATE UNIQUE INDEX "spotify_track_group_primary_spotify_track_id_key" ON "spotify_track_group"("primary_spotify_track_id");

-- CreateIndex
CREATE INDEX "karaoke_song_song_id_idx" ON "karaoke_song"("song_id");

-- CreateIndex
CREATE INDEX "song_youtube_video_id_idx" ON "song"("youtube_video_id");

-- CreateIndex
CREATE INDEX "song_catalog_idx" ON "song"("catalog");

-- CreateIndex
CREATE INDEX "spotify_track_group_id_idx" ON "spotify_track"("group_id");

-- CreateIndex
CREATE INDEX "spotify_track_isrc_idx" ON "spotify_track"("isrc");

-- CreateIndex
CREATE INDEX "youtube_channel_channel_id_idx" ON "youtube_channel"("channel_id");

-- AddForeignKey
ALTER TABLE "spotify_track_group" ADD CONSTRAINT "spotify_track_group_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spotify_track_group" ADD CONSTRAINT "spotify_track_group_primary_spotify_track_id_fkey" FOREIGN KEY ("primary_spotify_track_id") REFERENCES "spotify_track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spotify_track" ADD CONSTRAINT "spotify_track_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "spotify_track_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
