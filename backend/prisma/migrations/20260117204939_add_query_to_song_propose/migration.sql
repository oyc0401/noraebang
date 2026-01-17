/*
  Warnings:

  - You are about to drop the column `title_ja_kana` on the `spotify_track_group` table. All the data in the column will be lost.
  - You are about to drop the column `title_ja_kanji` on the `spotify_track_group` table. All the data in the column will be lost.
  - You are about to drop the column `title_ko` on the `spotify_track_group` table. All the data in the column will be lost.
  - You are about to drop the column `title_latin` on the `spotify_track_group` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "song_propose" ADD COLUMN     "query" TEXT;

-- AlterTable
ALTER TABLE "spotify_track_group" DROP COLUMN "title_ja_kana",
DROP COLUMN "title_ja_kanji",
DROP COLUMN "title_ko",
DROP COLUMN "title_latin";
