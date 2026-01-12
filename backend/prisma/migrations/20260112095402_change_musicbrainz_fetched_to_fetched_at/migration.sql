/*
  Warnings:

  - You are about to drop the column `musicbrainz_fetched` on the `spotify_track` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "spotify_track" DROP COLUMN "musicbrainz_fetched",
ADD COLUMN     "musicbrainz_fetched_at" TIMESTAMP(3);
