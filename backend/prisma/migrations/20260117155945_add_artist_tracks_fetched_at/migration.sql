-- AlterTable
ALTER TABLE "artist" ADD COLUMN     "spotify_tracks_fetched_at" TIMESTAMP(3),
ADD COLUMN     "youtube_tracks_fetched_at" TIMESTAMP(3);
