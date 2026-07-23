-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix ProcurementItem missing columns
-- Adds all columns defined in schema.prisma that were never applied to the DB.
-- Uses IF NOT EXISTS so this is safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- skuId — FK to Item (SKU) table
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "skuId" TEXT;

-- itemCode — denormalized from SKU for fast access
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "itemCode" TEXT;

-- bbuCode — internal BBU reference
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "bbuCode" TEXT;

-- category — denormalized from SKU
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "category" TEXT;

-- subGroup — denormalized from SKU
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "subGroup" TEXT;

-- approvedRate — rate approved at PO stage
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "approvedRate" DECIMAL(15,2);

-- receivedQty — quantity actually received at GRN
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "receivedQty" DECIMAL(15,3);

-- assignedToId — buyer/owner assignment per item (AO column)
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

-- toFrom — direction/routing field
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "toFrom" TEXT;

-- attachmentName
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;

-- attachmentUrl
ALTER TABLE "ProcurementItem"
  ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;

-- ─── Foreign key constraints ─────────────────────────────────────────────────

-- skuId → Item (SKU) table
-- NOTE: Item table FK omitted — Item model removed from schema.prisma.
-- skuId is stored as a plain TEXT field (no formal FK constraint).


-- assignedToId → User table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProcurementItem_assignedToId_fkey'
  ) THEN
    ALTER TABLE "ProcurementItem"
      ADD CONSTRAINT "ProcurementItem_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "ProcurementItem_skuId_idx"
  ON "ProcurementItem"("skuId");

CREATE INDEX IF NOT EXISTS "ProcurementItem_itemCode_idx"
  ON "ProcurementItem"("itemCode");

CREATE INDEX IF NOT EXISTS "ProcurementItem_assignedToId_idx"
  ON "ProcurementItem"("assignedToId");
