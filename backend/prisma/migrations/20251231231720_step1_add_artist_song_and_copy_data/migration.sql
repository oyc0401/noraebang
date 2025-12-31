-- CreateTable
CREATE TABLE "artist_song" (
    "id" SERIAL NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "song_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_song_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artist_song_song_id_idx" ON "artist_song"("song_id");

-- CreateIndex
CREATE INDEX "artist_song_artist_id_idx" ON "artist_song"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_song_artist_id_song_id_key" ON "artist_song"("artist_id", "song_id");

-- AddForeignKey
ALTER TABLE "artist_song" ADD CONSTRAINT "artist_song_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_song" ADD CONSTRAINT "artist_song_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Copy existing song-artist relationships to artist_song table
INSERT INTO "artist_song" ("artist_id", "song_id", "order", "created_at")
SELECT "artist_id", "id", 0, NOW()
FROM "song";
