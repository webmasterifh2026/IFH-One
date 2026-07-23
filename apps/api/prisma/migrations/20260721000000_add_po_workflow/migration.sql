-- Add PO workflow fields to ProcurementItem
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poNumber" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poRemarks" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poCreatedAt" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poApprovedL1At" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poApprovedL2At" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poRejectedAt" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poRejectedBy" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "poRejectionReason" TEXT;

-- Indexes for PO workflow queries
CREATE INDEX IF NOT EXISTS "ProcurementItem_poNumber_idx" ON "ProcurementItem"("poNumber");
CREATE INDEX IF NOT EXISTS "ProcurementItem_poStatus_idx" ON "ProcurementItem"("poStatus");
CREATE INDEX IF NOT EXISTS "ProcurementItem_poCreatedAt_idx" ON "ProcurementItem"("poCreatedAt");

-- Add PO stage numbers to ProcurementStage if not exists
-- Stages 5 = PO Creation, 6 = PO Approval L1, 7 = PO Approval L2