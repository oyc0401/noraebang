/*
  Warnings:

  - You are about to drop the column `thumbnail_default` on the `spotify_artist` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_high` on the `spotify_artist` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_medium` on the `spotify_artist` table. All the data in the column will be lost.
  - You are about to drop the column `spotify_medium` on the `spotify_track` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_default` on the `spotify_track` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail_high` on the `spotify_track` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "spotify_track_song_id_key";

-- AlterTable
ALTER TABLE "spotify_artist" DROP COLUMN "thumbnail_default",
DROP COLUMN "thumbnail_high",
DROP COLUMN "thumbnail_medium",
ADD COLUMN     "thumbnails" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "spotify_track" DROP COLUMN "spotify_medium",
DROP COLUMN "thumbnail_default",
DROP COLUMN "thumbnail_high",
ADD COLUMN     "thumbnails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "song_id" DROP NOT NULL;
