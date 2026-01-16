-- AlterTable
ALTER TABLE "song" ADD COLUMN     "youtube_video_group_id" INTEGER;

-- AlterTable
ALTER TABLE "youtube_video" ADD COLUMN     "group_id" INTEGER;

-- CreateTable
CREATE TABLE "youtube_video_group" (
    "id" SERIAL NOT NULL,
    "primary_youtube_video_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_video_group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "youtube_video_group_primary_youtube_video_id_key" ON "youtube_video_group"("primary_youtube_video_id");

-- CreateIndex
CREATE INDEX "song_youtube_video_group_id_idx" ON "song"("youtube_video_group_id");

-- CreateIndex
CREATE INDEX "youtube_video_group_id_idx" ON "youtube_video"("group_id");

-- AddForeignKey
ALTER TABLE "song" ADD CONSTRAINT "song_youtube_video_group_id_fkey" FOREIGN KEY ("youtube_video_group_id") REFERENCES "youtube_video_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_video_group" ADD CONSTRAINT "youtube_video_group_primary_youtube_video_id_fkey" FOREIGN KEY ("primary_youtube_video_id") REFERENCES "youtube_video"("video_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_video" ADD CONSTRAINT "youtube_video_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "youtube_video_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
