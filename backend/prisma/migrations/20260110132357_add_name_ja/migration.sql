-- AlterTable
ALTER TABLE "artist" ADD COLUMN     "name_ja_kana" TEXT,
ADD COLUMN     "name_ja_kanji" TEXT,
ADD COLUMN     "name_latin" TEXT;

-- AlterTable
ALTER TABLE "song" ADD COLUMN     "title_ja_kana" TEXT,
ADD COLUMN     "title_ja_kanji" TEXT,
ADD COLUMN     "title_latin" TEXT;
