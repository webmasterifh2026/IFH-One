-- Add Vendor Acceptance (S9) and Vendor Follow-up (S10) fields to ProcurementItem
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorAcceptanceStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorAcceptedAt" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorRejectedAt" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorRejectionReason" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorAgreedDate" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorFollowupStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorFollowupCompletedAt" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorFollowupDelayedAt" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorFollowupRejectedAt" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "vendorFollowupRejectionReason" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "crmRemarks" TEXT;

-- Indexes for S9 and S10 queries
CREATE INDEX IF NOT EXISTS "ProcurementItem_vendorAcceptanceStatus_idx" ON "ProcurementItem"("vendorAcceptanceStatus");
CREATE INDEX IF NOT EXISTS "ProcurementItem_vendorFollowupStatus_idx" ON "ProcurementItem"("vendorFollowupStatus");
CREATE INDEX IF NOT EXISTS "ProcurementItem_vendorAgreedDate_idx" ON "ProcurementItem"("vendorAgreedDate");