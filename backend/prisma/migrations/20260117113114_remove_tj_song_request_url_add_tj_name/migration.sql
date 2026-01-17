/*
  Warnings:

  - You are about to drop the column `tj_song_request_url` on the `artist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "artist" DROP COLUMN "tj_song_request_url",
ADD COLUMN     "tj_name" TEXT;
