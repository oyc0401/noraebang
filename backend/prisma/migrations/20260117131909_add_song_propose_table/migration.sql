-- CreateTable
CREATE TABLE "song_propose" (
    "id" SERIAL NOT NULL,
    "song_id" INTEGER,
    "po_song_singer" TEXT NOT NULL,
    "po_song_title" TEXT NOT NULL,
    "po_content" TEXT NOT NULL,
    "po_name" TEXT NOT NULL,
    "po_email1" TEXT NOT NULL,
    "po_email2" TEXT NOT NULL,
    "ot_code" TEXT NOT NULL,
    "po_hit" INTEGER NOT NULL DEFAULT 0,
    "po_regdate_view" TEXT NOT NULL,
    "save_date" BIGINT NOT NULL,
    "update_date" BIGINT NOT NULL,

    CONSTRAINT "song_propose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "song_propose_song_id_idx" ON "song_propose"("song_id");

-- AddForeignKey
ALTER TABLE "song_propose" ADD CONSTRAINT "song_propose_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
