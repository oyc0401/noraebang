/*
  Warnings:

  - You are about to drop the column `song_id` on the `spotify_track_group` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "spotify_track_group" DROP CONSTRAINT "spotify_track_group_song_id_fkey";

-- DropIndex
DROP INDEX "spotify_track_group_song_id_key";

-- AlterTable
ALTER TABLE "song" ADD COLUMN     "spotify_track_group_id" INTEGER;

-- AlterTable
ALTER TABLE "spotify_track_group" DROP COLUMN "song_id";

-- CreateIndex
CREATE INDEX "song_spotify_track_group_id_idx" ON "song"("spotify_track_group_id");

-- AddForeignKey
ALTER TABLE "song" ADD CONSTRAINT "song_spotify_track_group_id_fkey" FOREIGN KEY ("spotify_track_group_id") REFERENCES "spotify_track_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
