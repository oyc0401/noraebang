-- CreateTable
CREATE TABLE "youtube_video" (
    "id" SERIAL NOT NULL,
    "youtube_channel_id" INTEGER NOT NULL,
    "video_id" TEXT NOT NULL,
    "owner_channel_id" TEXT,
    "title" TEXT,
    "description" TEXT,
    "published_at" TIMESTAMP(3),
    "position" INTEGER,
    "thumbnail_default" TEXT,
    "thumbnail_medium" TEXT,
    "thumbnail_high" TEXT,
    "thumbnail_standard" TEXT,
    "thumbnail_maxres" TEXT,
    "view_count" BIGINT,
    "like_count" INTEGER,
    "comment_count" INTEGER,
    "duration_seconds" INTEGER,
    "definition" TEXT,
    "caption" BOOLEAN,
    "fetched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "youtube_video_video_id_key" ON "youtube_video"("video_id");

-- CreateIndex
CREATE INDEX "youtube_video_youtube_channel_id_idx" ON "youtube_video"("youtube_channel_id");

-- AddForeignKey
ALTER TABLE "youtube_video" ADD CONSTRAINT "youtube_video_youtube_channel_id_fkey" FOREIGN KEY ("youtube_channel_id") REFERENCES "youtube_channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
