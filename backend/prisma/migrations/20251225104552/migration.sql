/*
  Warnings:

  - You are about to drop the column `youtube_channel_description` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_channel_published` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_channel_title` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_fetched_at` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_thumbnail` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_thumbnail_default` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_thumbnail_high` on the `artist` table. All the data in the column will be lost.
  - You are about to drop the column `youtube_thumbnail_medium` on the `artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "artist" DROP COLUMN "youtube_channel_description",
DROP COLUMN "youtube_channel_published",
DROP COLUMN "youtube_channel_title",
DROP COLUMN "youtube_fetched_at",
DROP COLUMN "youtube_thumbnail",
DROP COLUMN "youtube_thumbnail_default",
DROP COLUMN "youtube_thumbnail_high",
DROP COLUMN "youtube_thumbnail_medium";
