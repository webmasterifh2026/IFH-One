-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "User_employeeId_idx" ON "User"("employeeId");

