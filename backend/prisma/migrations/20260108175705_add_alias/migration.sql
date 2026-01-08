-- CreateTable
CREATE TABLE "artist_alias" (
    "id" SERIAL NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_alias" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_alias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artist_alias_artist_id_idx" ON "artist_alias"("artist_id");

-- CreateIndex
CREATE INDEX "artist_alias_alias_idx" ON "artist_alias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "artist_alias_artist_id_alias_locale_kind_key" ON "artist_alias"("artist_id", "alias", "locale", "kind");

-- CreateIndex
CREATE INDEX "song_alias_song_id_idx" ON "song_alias"("song_id");

-- CreateIndex
CREATE INDEX "song_alias_alias_idx" ON "song_alias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "song_alias_song_id_alias_locale_kind_key" ON "song_alias"("song_id", "alias", "locale", "kind");

-- AddForeignKey
ALTER TABLE "artist_alias" ADD CONSTRAINT "artist_alias_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_alias" ADD CONSTRAINT "song_alias_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "artist_alias_key" RENAME TO "artist_slug_key";
