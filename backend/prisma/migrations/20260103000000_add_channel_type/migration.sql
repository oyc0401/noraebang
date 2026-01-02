-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('MAIN', 'TOPIC');

-- AlterTable: Add type column with default value
ALTER TABLE "youtube_channel" ADD COLUMN "type" "ChannelType" NOT NULL DEFAULT 'MAIN';

-- DropIndex: Remove unique constraint on artist_id (DROP INDEX 사용)
DROP INDEX "youtube_channel_artist_id_key";

-- CreateIndex: Add unique constraint on (artist_id, type)
CREATE UNIQUE INDEX "youtube_channel_artist_id_type_key" ON "youtube_channel"("artist_id", "type");
