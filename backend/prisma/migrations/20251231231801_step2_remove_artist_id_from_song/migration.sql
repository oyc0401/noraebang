-- DropForeignKey
ALTER TABLE "song" DROP CONSTRAINT "song_artist_id_fkey";

-- DropIndex
DROP INDEX "song_artist_id_title_norm_key";

-- AlterTable
ALTER TABLE "song" DROP COLUMN "artist_id";
