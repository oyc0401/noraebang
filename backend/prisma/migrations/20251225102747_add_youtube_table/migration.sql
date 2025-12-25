-- CreateTable
CREATE TABLE "youtube_channel" (
    "id" SERIAL NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "channel_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "custom_url" TEXT,
    "published_at" TIMESTAMP(3),
    "country" TEXT,
    "default_language" TEXT,
    "thumbnail_default" TEXT,
    "thumbnail_medium" TEXT,
    "thumbnail_high" TEXT,
    "subscriber_count" INTEGER,
    "video_count" INTEGER,
    "view_count" BIGINT,
    "hidden_subscriber_count" BOOLEAN,
    "uploads_playlist_id" TEXT,
    "fetched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_channel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "youtube_channel_artist_id_key" ON "youtube_channel"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_channel_channel_id_key" ON "youtube_channel"("channel_id");

-- AddForeignKey
ALTER TABLE "youtube_channel" ADD CONSTRAINT "youtube_channel_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
