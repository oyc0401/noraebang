-- CreateTable
CREATE TABLE "song_artist_queue" (
    "id" SERIAL NOT NULL,
    "tj_song_id" TEXT NOT NULL,
    "artist_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_artist_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "song_artist_queue_tj_song_id_key" ON "song_artist_queue"("tj_song_id");

-- CreateIndex
CREATE INDEX "song_artist_queue_artist_id_idx" ON "song_artist_queue"("artist_id");
