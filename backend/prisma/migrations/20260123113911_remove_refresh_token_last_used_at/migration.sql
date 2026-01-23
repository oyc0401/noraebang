/*
  Warnings:

  - You are about to drop the column `refresh_token_last_used_at` on the `user_session` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_session" DROP COLUMN "refresh_token_last_used_at";
