-- AlterTable
ALTER TABLE "Procurement" ADD COLUMN     "application" TEXT,
ADD COLUMN     "certification" TEXT,
ADD COLUMN     "ga" TEXT,
ADD COLUMN     "itemType" TEXT,
ADD COLUMN     "manuals" TEXT,
ADD COLUMN     "packingRequirement" TEXT,
ADD COLUMN     "paintingSpec" TEXT,
ADD COLUMN     "projectName" TEXT,
ADD COLUMN     "projectSite" TEXT,
ADD COLUMN     "requiredDate" TIMESTAMP(3),
ADD COLUMN     "warrantyGuarantee" TEXT;

-- AlterTable
ALTER TABLE "ProcurementItem" ADD COLUMN     "approvedMakes" TEXT,
ADD COLUMN     "bbuCode" TEXT,
ADD COLUMN     "technicalSpec" TEXT;
