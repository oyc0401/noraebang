-- AlterTable
ALTER TABLE "user"
ADD COLUMN "refresh_token_last_used_at" TIMESTAMP(3),
ADD COLUMN "refresh_token_expires_at" TIMESTAMP(3);
