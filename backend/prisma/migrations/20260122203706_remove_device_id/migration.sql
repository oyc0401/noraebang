/*
  Warnings:

  - You are about to drop the column `device_id` on the `user` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "user_device_id_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "device_id";
