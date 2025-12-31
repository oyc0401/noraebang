/*
  Warnings:

  - The `role` column on the `artist_song` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ArtistRole" AS ENUM ('MAIN', 'FEATURING', 'COLLABORATION');

-- AlterTable
ALTER TABLE "artist_song" DROP COLUMN "role",
ADD COLUMN     "role" "ArtistRole";
