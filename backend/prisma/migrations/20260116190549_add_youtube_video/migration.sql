/*
  Warnings:

  - The primary key for the `youtube_video` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `youtube_video` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `youtube_video` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_channel_id` on the `youtube_video` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "youtube_video" DROP CONSTRAINT "youtube_video_youtube_channel_id_fkey";

-- DropIndex
DROP INDEX "youtube_video_video_id_key";

-- DropIndex
DROP INDEX "youtube_video_youtube_channel_id_idx";

-- AlterTable
ALTER TABLE "youtube_video" DROP CONSTRAINT "youtube_video_pkey",
DROP COLUMN "id",
DROP COLUMN "position",
DROP COLUMN "youtube_channel_id",
ADD CONSTRAINT "youtube_video_pkey" PRIMARY KEY ("video_id");

-- CreateTable
CREATE TABLE "youtube_channel_video" (
    "id" SERIAL NOT NULL,
    "youtube_channel_id" INTEGER NOT NULL,
    "youtube_video_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_channel_video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "youtube_channel_video_youtube_channel_id_idx" ON "youtube_channel_video"("youtube_channel_id");

-- CreateIndex
CREATE INDEX "youtube_channel_video_youtube_video_id_idx" ON "youtube_channel_video"("youtube_video_id");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_channel_video_youtube_channel_id_youtube_video_id_key" ON "youtube_channel_video"("youtube_channel_id", "youtube_video_id");

-- AddForeignKey
ALTER TABLE "youtube_channel_video" ADD CONSTRAINT "youtube_channel_video_youtube_channel_id_fkey" FOREIGN KEY ("youtube_channel_id") REFERENCES "youtube_channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_channel_video" ADD CONSTRAINT "youtube_channel_video_youtube_video_id_fkey" FOREIGN KEY ("youtube_video_id") REFERENCES "youtube_video"("video_id") ON DELETE CASCADE ON UPDATE CASCADE;
