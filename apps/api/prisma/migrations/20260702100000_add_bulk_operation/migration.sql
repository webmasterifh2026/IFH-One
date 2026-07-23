-- CreateTable
CREATE TABLE "BulkOperation" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetStageHint" INTEGER,
    "totalSelected" INTEGER NOT NULL,
    "totalEligible" INTEGER NOT NULL,
    "totalUpdated" INTEGER NOT NULL,
    "totalSkipped" INTEGER NOT NULL,
    "totalFailed" INTEGER NOT NULL,
    "remarks" TEXT,
    "notifyUsers" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "performedById" TEXT NOT NULL,
    "durationMs" INTEGER,
    "resultDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkOperation_performedById_idx" ON "BulkOperation"("performedById");

-- CreateIndex
CREATE INDEX "BulkOperation_createdAt_idx" ON "BulkOperation"("createdAt");

-- AddForeignKey
ALTER TABLE "BulkOperation" ADD CONSTRAINT "BulkOperation_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

