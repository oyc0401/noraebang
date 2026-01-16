/*
  Warnings:

  - You are about to drop the column `youtube_video_group_id` on the `song` table. All the data in the column will be lost.
  - You are about to drop the column `group_id` on the `youtube_video` table. All the data in the column will be lost.
  - You are about to drop the `youtube_video_group` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "song" DROP CONSTRAINT "song_youtube_video_group_id_fkey";

-- DropForeignKey
ALTER TABLE "youtube_video" DROP CONSTRAINT "youtube_video_group_id_fkey";

-- DropForeignKey
ALTER TABLE "youtube_video_group" DROP CONSTRAINT "youtube_video_group_primary_youtube_video_id_fkey";

-- DropIndex
DROP INDEX "song_youtube_video_group_id_idx";

-- DropIndex
DROP INDEX "youtube_video_group_id_idx";

-- AlterTable
ALTER TABLE "song" DROP COLUMN "youtube_video_group_id";

-- AlterTable
ALTER TABLE "youtube_video" DROP COLUMN "group_id";

-- DropTable
DROP TABLE "youtube_video_group";

-- CreateTable
CREATE TABLE "song_youtube_video" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "youtube_video_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_youtube_video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "song_youtube_video_song_id_idx" ON "song_youtube_video"("song_id");

-- CreateIndex
CREATE INDEX "song_youtube_video_youtube_video_id_idx" ON "song_youtube_video"("youtube_video_id");

-- CreateIndex
CREATE UNIQUE INDEX "song_youtube_video_song_id_youtube_video_id_key" ON "song_youtube_video"("song_id", "youtube_video_id");

-- AddForeignKey
ALTER TABLE "song_youtube_video" ADD CONSTRAINT "song_youtube_video_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_youtube_video" ADD CONSTRAINT "song_youtube_video_youtube_video_id_fkey" FOREIGN KEY ("youtube_video_id") REFERENCES "youtube_video"("video_id") ON DELETE CASCADE ON UPDATE CASCADE;
