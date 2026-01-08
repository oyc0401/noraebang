-- CreateTable
CREATE TABLE "spotify_artist" (
    "id" SERIAL NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "spotify_id" TEXT NOT NULL,
    "spotify_url" TEXT,
    "name" TEXT NOT NULL,
    "popularity" INTEGER,
    "followers" INTEGER,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail_default" TEXT,
    "thumbnail_medium" TEXT,
    "thumbnail_high" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spotify_artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spotify_track" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "spotify_id" TEXT NOT NULL,
    "spotify_url" TEXT,
    "name" TEXT NOT NULL,
    "popularity" INTEGER,
    "preview_url" TEXT,
    "isrc" TEXT,
    "duration_ms" INTEGER,
    "release_date" TEXT,
    "thumbnail_default" TEXT,
    "thumbnail_medium" TEXT,
    "thumbnail_high" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spotify_track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "spotify_artist_artist_id_key" ON "spotify_artist"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "spotify_artist_spotify_id_key" ON "spotify_artist"("spotify_id");

-- CreateIndex
CREATE UNIQUE INDEX "spotify_track_song_id_key" ON "spotify_track"("song_id");

-- CreateIndex
CREATE UNIQUE INDEX "spotify_track_spotify_id_key" ON "spotify_track"("spotify_id");

-- AddForeignKey
ALTER TABLE "spotify_artist" ADD CONSTRAINT "spotify_artist_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spotify_track" ADD CONSTRAINT "spotify_track_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
