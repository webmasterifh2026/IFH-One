-- CreateEnum
CREATE TYPE "GateEntryStatus" AS ENUM ('GATE_ENTRY', 'QUANTITY_PENDING', 'QUANTITY_VERIFIED', 'QUALITY_PENDING', 'QUALITY_VERIFIED', 'ALLOCATION_PENDING', 'ALLOCATED', 'GRN_GENERATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'ACCEPTED_WITH_DEVIATION');

-- CreateEnum
CREATE TYPE "GateEntryItemStatus" AS ENUM ('PENDING', 'QUANTITY_VERIFIED', 'QUALITY_VERIFIED', 'ALLOCATED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GateEntry" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "procurementId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "gateInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gateOutAt" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "vendorId" TEXT,
    "vendorName" TEXT,
    "status" "GateEntryStatus" NOT NULL DEFAULT 'GATE_ENTRY',
    "createdById" TEXT NOT NULL,
    "quantityCheckedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GateEntryItem" (
    "id" TEXT NOT NULL,
    "gateEntryId" TEXT NOT NULL,
    "procurementItemId" TEXT NOT NULL,
    "declaredQty" DECIMAL(15,3) NOT NULL,
    "receivedQty" DECIMAL(15,3),
    "qualityStatus" "QualityStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "toleranceMinPct" DECIMAL(5,2) DEFAULT -5,
    "toleranceMaxPct" DECIMAL(5,2) DEFAULT 5,
    "actualSizeReceived" TEXT,
    "inspectedById" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "inspectionRemarks" TEXT,
    "allocatedLocation" TEXT,
    "allocatedAt" TIMESTAMP(3),
    "allocatedById" TEXT,
    "status" "GateEntryItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GateEntryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GRN" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "gateEntryId" TEXT NOT NULL,
    "procurementId" TEXT NOT NULL,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "totalAcceptedQty" DECIMAL(15,3) NOT NULL,
    "totalRejectedQty" DECIMAL(15,3) NOT NULL,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inventoryPosted" BOOLEAN NOT NULL DEFAULT false,
    "inventoryPostedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GRN_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GateEntry_entryNumber_key" ON "GateEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "GateEntry_procurementId_idx" ON "GateEntry"("procurementId");

-- CreateIndex
CREATE INDEX "GateEntry_vehicleNumber_idx" ON "GateEntry"("vehicleNumber");

-- CreateIndex
CREATE INDEX "GateEntry_status_idx" ON "GateEntry"("status");

-- CreateIndex
CREATE INDEX "GateEntry_createdAt_idx" ON "GateEntry"("createdAt");

-- CreateIndex
CREATE INDEX "GateEntry_invoiceNumber_idx" ON "GateEntry"("invoiceNumber");

-- CreateIndex
CREATE INDEX "GateEntryItem_gateEntryId_idx" ON "GateEntryItem"("gateEntryId");

-- CreateIndex
CREATE INDEX "GateEntryItem_procurementItemId_idx" ON "GateEntryItem"("procurementItemId");

-- CreateIndex
CREATE INDEX "GateEntryItem_qualityStatus_idx" ON "GateEntryItem"("qualityStatus");

-- CreateIndex
CREATE INDEX "GateEntryItem_status_idx" ON "GateEntryItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GRN_grnNumber_key" ON "GRN"("grnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GRN_gateEntryId_key" ON "GRN"("gateEntryId");

-- CreateIndex
CREATE INDEX "GRN_procurementId_idx" ON "GRN"("procurementId");

-- CreateIndex
CREATE INDEX "GRN_gateEntryId_idx" ON "GRN"("gateEntryId");

-- CreateIndex
CREATE INDEX "GRN_vendorId_idx" ON "GRN"("vendorId");

-- CreateIndex
CREATE INDEX "GRN_generatedAt_idx" ON "GRN"("generatedAt");

-- CreateIndex
CREATE INDEX "GRN_inventoryPosted_idx" ON "GRN"("inventoryPosted");

-- AddForeignKey
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "Procurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntry" ADD CONSTRAINT "GateEntry_quantityCheckedById_fkey" FOREIGN KEY ("quantityCheckedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntryItem" ADD CONSTRAINT "GateEntryItem_gateEntryId_fkey" FOREIGN KEY ("gateEntryId") REFERENCES "GateEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntryItem" ADD CONSTRAINT "GateEntryItem_procurementItemId_fkey" FOREIGN KEY ("procurementItemId") REFERENCES "ProcurementItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntryItem" ADD CONSTRAINT "GateEntryItem_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateEntryItem" ADD CONSTRAINT "GateEntryItem_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_gateEntryId_fkey" FOREIGN KEY ("gateEntryId") REFERENCES "GateEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "Procurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRN" ADD CONSTRAINT "GRN_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

