/*
  Warnings:

  - You are about to drop the column `device_id` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `device_secret` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `device_challenge` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `refresh_token_expires_at` on table `user_session` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "device_challenge" DROP CONSTRAINT "device_challenge_user_id_fkey";

-- DropIndex
DROP INDEX "user_device_id_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "device_id",
DROP COLUMN "device_secret";

-- AlterTable
ALTER TABLE "user_session" ALTER COLUMN "refresh_token_expires_at" SET NOT NULL;

-- DropTable
DROP TABLE "device_challenge";
