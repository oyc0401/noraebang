-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "report" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER,
    "artist_id" INTEGER,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "email" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_song_id_idx" ON "report"("song_id");

-- CreateIndex
CREATE INDEX "report_artist_id_idx" ON "report"("artist_id");

-- CreateIndex
CREATE INDEX "report_status_idx" ON "report"("status");

-- CreateIndex
CREATE INDEX "report_created_at_idx" ON "report"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
