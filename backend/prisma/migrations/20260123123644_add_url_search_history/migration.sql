-- AlterTable
ALTER TABLE "search_click" ADD COLUMN     "url" TEXT,
ALTER COLUMN "query" DROP NOT NULL;

-- AlterTable
ALTER TABLE "search_history" ADD COLUMN     "url" TEXT,
ALTER COLUMN "query" DROP NOT NULL;
