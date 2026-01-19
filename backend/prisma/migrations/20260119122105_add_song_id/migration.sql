-- DropIndex
DROP INDEX "spotify_track_group_primary_spotify_track_id_key";

-- AlterTable
ALTER TABLE "spotify_track" ADD COLUMN     "song_id" INTEGER;

-- CreateIndex
CREATE INDEX "spotify_track_song_id_idx" ON "spotify_track"("song_id");

-- AddForeignKey
ALTER TABLE "spotify_track" ADD CONSTRAINT "spotify_track_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
