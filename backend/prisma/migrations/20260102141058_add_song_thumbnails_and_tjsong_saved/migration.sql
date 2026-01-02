-- AlterTable
ALTER TABLE "song" ADD COLUMN     "thumbnail_default" TEXT,
ADD COLUMN     "thumbnail_high" TEXT,
ADD COLUMN     "thumbnail_medium" TEXT;

-- AlterTable
ALTER TABLE "tj_song" ADD COLUMN     "saved" BOOLEAN NOT NULL DEFAULT false;
