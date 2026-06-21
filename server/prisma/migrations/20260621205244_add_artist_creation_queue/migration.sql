/*
  Warnings:

  - You are about to drop the column `name_ja_kanji` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `tj_propose_fetched_at` on the `artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "artist" DROP COLUMN "name_ja_kanji",
DROP COLUMN "tj_propose_fetched_at";

-- CreateTable
CREATE TABLE "artist_creation_queue" (
    "id" SERIAL NOT NULL,
    "tj_song_id" TEXT,
    "home_catalog" TEXT,
    "name" TEXT NOT NULL,
    "name_ko" TEXT NOT NULL,
    "name_ja" TEXT,
    "name_ja_kana" TEXT,
    "name_ja_pronu" TEXT,
    "name_latin" TEXT,
    "tj_name" TEXT,
    "tj_name_ja" TEXT,
    "slug" TEXT,
    "youtube_channel" TEXT,
    "youtube_topic_channel" TEXT,
    "spotify_id" TEXT,
    "thumbnail_default" TEXT,
    "thumbnail_high" TEXT,
    "thumbnail_medium" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_creation_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artist_creation_queue_slug_key" ON "artist_creation_queue"("slug");
