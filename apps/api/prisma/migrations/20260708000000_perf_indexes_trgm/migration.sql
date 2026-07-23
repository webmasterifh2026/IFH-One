-- Enable trigram search support for ILIKE/"contains" queries on hot search columns
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop indexes that duplicate an existing unique-constraint index
DROP INDEX IF EXISTS "Procurement_referenceNo_idx";
-- Item_itemCode_idx dropped only if it exists (safe no-op when Item table is absent)
DROP INDEX IF EXISTS "Item_itemCode_idx";


-- Missing filter indexes used by Procurement.findAll()
CREATE INDEX IF NOT EXISTS "Procurement_projectId_idx" ON "Procurement" ("projectId");
CREATE INDEX IF NOT EXISTS "Procurement_vendorId_idx" ON "Procurement" ("vendorId");

-- Trigram GIN indexes to accelerate ILIKE "contains" search
CREATE INDEX IF NOT EXISTS "Procurement_title_trgm_idx" ON "Procurement" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Procurement_vendorName_trgm_idx" ON "Procurement" USING GIN ("vendorName" gin_trgm_ops);
-- Item table indexes — only apply if Item table exists (model removed from schema.prisma)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Item' AND table_schema = 'public') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Item_description_trgm_idx" ON "Item" USING GIN ("description" gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Item_itemCode_trgm_idx" ON "Item" USING GIN ("itemCode" gin_trgm_ops)';
  END IF;
END $$;
