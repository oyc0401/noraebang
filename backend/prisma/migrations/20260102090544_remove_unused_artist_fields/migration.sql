/*
  Warnings:

  - You are about to drop the column `blog_id` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_channel_id` on the `artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "artist" DROP COLUMN "blog_id",
DROP COLUMN "youtube_channel_id";
