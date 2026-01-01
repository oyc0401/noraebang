/*
  Warnings:

  - The values [COLLABORATION] on the enum `ArtistRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ArtistRole_new" AS ENUM ('MAIN', 'FEATURING', 'PRODUCER');
ALTER TABLE "artist_song" ALTER COLUMN "role" TYPE "ArtistRole_new" USING ("role"::text::"ArtistRole_new");
ALTER TYPE "ArtistRole" RENAME TO "ArtistRole_old";
ALTER TYPE "ArtistRole_new" RENAME TO "ArtistRole";
DROP TYPE "public"."ArtistRole_old";
COMMIT;

-- CreateTable
CREATE TABLE "tj_song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "artist_list" TEXT[],
    "lyricist" TEXT NOT NULL,
    "lyricist_list" TEXT[],
    "composer" TEXT NOT NULL,
    "composer_list" TEXT[],
    "nation_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tj_song_pkey" PRIMARY KEY ("id")
);
