-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "artist" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name_ko" TEXT NOT NULL,
    "slug" TEXT,
    "thumbnail_default" TEXT,
    "thumbnail_high" TEXT,
    "thumbnail_medium" TEXT,
    "home_catalog" TEXT,
    "spotify_id" TEXT,
    "name_ja_kana" TEXT,
    "name_ja_kanji" TEXT,
    "name_latin" TEXT,
    "name_ja_pronu" TEXT,
    "tj_name" TEXT,
    "tj_name_ja" TEXT,
    "spotify_tracks_fetched_at" TIMESTAMP(3),
    "youtube_tracks_fetched_at" TIMESTAMP(3),
    "tj_propose_fetched_at" TIMESTAMP(3),
    "name_ja" TEXT,
    "youtube_channel" TEXT,
    "youtube_topic_channel" TEXT,

    CONSTRAINT "artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "title_ko" TEXT,
    "title_ja" TEXT,
    "title_ja_pronu" TEXT,
    "title_ja_kana" TEXT,
    "title_ja_kanji" TEXT,
    "title_latin" TEXT,
    "title_latin_pronu" TEXT,
    "youtube_video_id" TEXT,
    "youtube_fetched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "thumbnail_default" TEXT,
    "thumbnail_high" TEXT,
    "thumbnail_medium" TEXT,
    "catalog" TEXT,
    "spotify_track_group_id" INTEGER,
    "tj_song_id" TEXT,
    "score" DOUBLE PRECISION,
    "visible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_song" (
    "id" SERIAL NOT NULL,
    "artist_id" INTEGER NOT NULL,
    "song_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tj_song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "lyricist" TEXT,
    "composer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "thumbnail_img" TEXT,
    "publishdate" TEXT,
    "is_mr" BOOLEAN NOT NULL DEFAULT false,
    "is_mv" BOOLEAN NOT NULL DEFAULT false,
    "is_over_60" BOOLEAN NOT NULL DEFAULT false,
    "youtube_link" TEXT,

    CONSTRAINT "tj_song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_queue" (
    "id" SERIAL NOT NULL,
    "tj_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "publishdate" TEXT,
    "catalog" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "last_login_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artist_slug_key" ON "artist"("slug");

-- CreateIndex
CREATE INDEX "artist_spotify_id_idx" ON "artist"("spotify_id");

-- CreateIndex
CREATE INDEX "artist_home_catalog_idx" ON "artist"("home_catalog");

-- CreateIndex
CREATE UNIQUE INDEX "song_tj_song_id_key" ON "song"("tj_song_id");

-- CreateIndex
CREATE INDEX "song_youtube_video_id_idx" ON "song"("youtube_video_id");

-- CreateIndex
CREATE INDEX "song_catalog_idx" ON "song"("catalog");

-- CreateIndex
CREATE INDEX "song_spotify_track_group_id_idx" ON "song"("spotify_track_group_id");

-- CreateIndex
CREATE INDEX "song_tj_song_id_idx" ON "song"("tj_song_id");

-- CreateIndex
CREATE INDEX "artist_song_song_id_idx" ON "artist_song"("song_id");

-- CreateIndex
CREATE INDEX "artist_song_artist_id_idx" ON "artist_song"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "artist_song_artist_id_song_id_key" ON "artist_song"("artist_id", "song_id");

-- CreateIndex
CREATE UNIQUE INDEX "song_queue_tj_number_key" ON "song_queue"("tj_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "song" ADD CONSTRAINT "song_tj_song_id_fkey" FOREIGN KEY ("tj_song_id") REFERENCES "tj_song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_song" ADD CONSTRAINT "artist_song_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_song" ADD CONSTRAINT "artist_song_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
