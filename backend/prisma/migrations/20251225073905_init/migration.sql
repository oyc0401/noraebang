-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('TJ', 'KY', 'JOYSOUND');

-- CreateTable
CREATE TABLE "artist" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_norm" TEXT NOT NULL,
    "youtube_channel_url" TEXT,
    "tj_song_request_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "title_ko" TEXT,
    "title_norm" TEXT NOT NULL,
    "youtube_video_id" TEXT,
    "youtube_fetched_at" TIMESTAMP(3),
    "primary_artist_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karaoke_song" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "provider" "Provider" NOT NULL,
    "karaoke_no" TEXT NOT NULL,
    "provider_song_url" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "ingested_at" TIMESTAMP(3),
    "ingested_from" TEXT,

    CONSTRAINT "karaoke_song_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "karaoke_song_provider_karaoke_no_key" ON "karaoke_song"("provider", "karaoke_no");

-- AddForeignKey
ALTER TABLE "song" ADD CONSTRAINT "song_primary_artist_id_fkey" FOREIGN KEY ("primary_artist_id") REFERENCES "artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karaoke_song" ADD CONSTRAINT "karaoke_song_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
