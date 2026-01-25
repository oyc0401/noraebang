-- AlterTable
ALTER TABLE "search_click" ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE INDEX "search_click_source_idx" ON "search_click"("source");
