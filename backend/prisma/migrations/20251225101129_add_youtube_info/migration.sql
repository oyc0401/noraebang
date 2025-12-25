-- AlterTable
ALTER TABLE "artist" ADD COLUMN     "youtube_channel_published" TIMESTAMP(3),
ADD COLUMN     "youtube_channel_title" TEXT,
ADD COLUMN     "youtube_thumbnail_default" TEXT,
ADD COLUMN     "youtube_thumbnail_high" TEXT,
ADD COLUMN     "youtube_thumbnail_medium" TEXT;
