-- CreateIndex on Item.subGroup only if Item table exists
-- NOTE: Item model removed from schema.prisma — index skipped safely.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Item' AND table_schema = 'public') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Item_subGroup_idx" ON "Item"("subGroup")';
  END IF;
END $$;


