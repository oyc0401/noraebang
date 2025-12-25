/*
  Warnings:

  - You are about to drop the column `youtube_channel_url` on the `artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "artist" DROP COLUMN "youtube_channel_url",
ADD COLUMN     "youtube_channel_id" TEXT,
ADD COLUMN     "youtube_thumbnail" TEXT;
