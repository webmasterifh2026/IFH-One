-- Remove Estimated Cost feature (v2.8.6): drop estimatedValue from Procurement
-- and estimatedRate from ProcurementItem. approvedRate is untouched.
ALTER TABLE "Procurement" DROP COLUMN IF EXISTS "estimatedValue";
ALTER TABLE "ProcurementItem" DROP COLUMN IF EXISTS "estimatedRate";
