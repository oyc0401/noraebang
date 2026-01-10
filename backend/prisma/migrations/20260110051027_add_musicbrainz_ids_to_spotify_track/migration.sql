-- AlterTable
ALTER TABLE "spotify_track" ADD COLUMN     "musicbrainz_artist_credit_id" TEXT,
ADD COLUMN     "musicbrainz_artist_id" TEXT,
ADD COLUMN     "musicbrainz_recording_id" TEXT;
