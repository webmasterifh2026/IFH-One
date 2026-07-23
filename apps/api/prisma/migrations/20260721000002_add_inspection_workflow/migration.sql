-- Add Inspection Workflow (S12, S13, S14) fields to ProcurementItem
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel1Status" TEXT DEFAULT 'PENDING';
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel1At" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel1ById" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel1Remarks" TEXT;

ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel2Status" TEXT DEFAULT 'PENDING';
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel2At" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel2ById" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel2Remarks" TEXT;

ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel3Status" TEXT DEFAULT 'PENDING';
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel3At" TIMESTAMP;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel3ById" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionLevel3Remarks" TEXT;

ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "currentInspectionLevel" INTEGER DEFAULT 0;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "inspectionAttempts" INTEGER DEFAULT 0;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "finalInspectionResult" TEXT;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "debitNoteGenerated" BOOLEAN DEFAULT false;
ALTER TABLE "ProcurementItem" ADD COLUMN IF NOT EXISTS "debitNoteGeneratedAt" TIMESTAMP;

-- Indexes for inspection queries
CREATE INDEX IF NOT EXISTS "ProcurementItem_inspectionLevel1Status_idx" ON "ProcurementItem"("inspectionLevel1Status");
CREATE INDEX IF NOT EXISTS "ProcurementItem_inspectionLevel2Status_idx" ON "ProcurementItem"("inspectionLevel2Status");
CREATE INDEX IF NOT EXISTS "ProcurementItem_inspectionLevel3Status_idx" ON "ProcurementItem"("inspectionLevel3Status");
CREATE INDEX IF NOT EXISTS "ProcurementItem_currentInspectionLevel_idx" ON "ProcurementItem"("currentInspectionLevel");
CREATE INDEX IF NOT EXISTS "ProcurementItem_debitNoteGenerated_idx" ON "ProcurementItem"("debitNoteGenerated");