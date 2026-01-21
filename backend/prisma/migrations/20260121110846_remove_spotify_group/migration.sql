/*
  Warnings:

  - You are about to drop the column `group_id` on the `spotify_track` table. All the data in the column will be lost.
  - You are about to drop the column `song_id` on the `spotify_track` table. All the data in the column will be lost.
  - You are about to drop the `spotify_track_group` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "song" DROP CONSTRAINT "song_spotify_track_group_id_fkey";

-- DropForeignKey
ALTER TABLE "spotify_track" DROP CONSTRAINT "spotify_track_group_id_fkey";

-- DropForeignKey
ALTER TABLE "spotify_track" DROP CONSTRAINT "spotify_track_song_id_fkey";

-- DropForeignKey
ALTER TABLE "spotify_track_group" DROP CONSTRAINT "spotify_track_group_primary_spotify_track_id_fkey";

-- DropIndex
DROP INDEX "spotify_track_group_id_idx";

-- DropIndex
DROP INDEX "spotify_track_song_id_idx";

-- DropIndex
DROP INDEX "spotify_track_song_id_popularity_idx";

-- DropIndex
DROP INDEX "spotify_track_song_id_release_date_idx";

-- AlterTable
ALTER TABLE "spotify_track" DROP COLUMN "group_id",
DROP COLUMN "song_id";

-- DropTable
DROP TABLE "spotify_track_group";
