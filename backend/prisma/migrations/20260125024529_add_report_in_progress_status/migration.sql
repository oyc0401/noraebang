-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "report" ADD COLUMN     "admin_note" TEXT;
