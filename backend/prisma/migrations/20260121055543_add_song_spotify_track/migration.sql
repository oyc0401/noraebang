-- CreateTable
CREATE TABLE "song_spotify_track" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "spotify_track_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_spotify_track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "song_spotify_track_song_id_idx" ON "song_spotify_track"("song_id");

-- CreateIndex
CREATE INDEX "song_spotify_track_spotify_track_id_idx" ON "song_spotify_track"("spotify_track_id");

-- CreateIndex
CREATE UNIQUE INDEX "song_spotify_track_song_id_spotify_track_id_key" ON "song_spotify_track"("song_id", "spotify_track_id");

-- CreateIndex
CREATE INDEX "spotify_track_song_id_popularity_idx" ON "spotify_track"("song_id", "popularity");

-- CreateIndex
CREATE INDEX "spotify_track_song_id_release_date_idx" ON "spotify_track"("song_id", "release_date");

-- AddForeignKey
ALTER TABLE "song_spotify_track" ADD CONSTRAINT "song_spotify_track_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_spotify_track" ADD CONSTRAINT "song_spotify_track_spotify_track_id_fkey" FOREIGN KEY ("spotify_track_id") REFERENCES "spotify_track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
