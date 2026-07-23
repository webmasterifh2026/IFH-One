-- RFQ Float Workflow v2.11.0
-- Extends the existing RFQ module with multi-indent float, TCE, and negotiation

-- RFQ Float: Links multiple indents to a single RFQ float
CREATE TABLE "RFQFloat" (
    "id" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "rfqDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionDeadline" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "filledById" TEXT,
    "deliveryLocation" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQFloat_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RFQFloat_rfqNumber_key" UNIQUE ("rfqNumber")
);

-- RFQ Float Items: Products selected from indents
CREATE TABLE "RFQFloatItem" (
    "id" TEXT NOT NULL,
    "rfqFloatId" TEXT NOT NULL,
    "indentId" TEXT NOT NULL,
    "indentItemId" TEXT NOT NULL,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "itemRemarks" TEXT,
    "make" TEXT,
    "quantity" DECIMAL(15,3) NOT NULL,
    "uom" TEXT,
    "unitWeight" DECIMAL(15,3),
    "totalWeight" DECIMAL(15,3),
    "isAvailableInStore" BOOLEAN NOT NULL DEFAULT false,
    "isSelected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFQFloatItem_pkey" PRIMARY KEY ("id")
);

-- RFQ Float Vendors: Vendors selected for this RFQ
CREATE TABLE "RFQFloatVendor" (
    "id" TEXT NOT NULL,
    "rfqFloatId" TEXT NOT NULL,
    "vendorId" TEXT,
    "vendorCode" TEXT,
    "vendorName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFQFloatVendor_pkey" PRIMARY KEY ("id")
);

-- TCE (Technical Commercial Evaluation): Stores vendor responses for comparison
CREATE TABLE "TCE" (
    "id" TEXT NOT NULL,
    "rfqFloatId" TEXT NOT NULL,
    "vendorFormId" TEXT,
    "vendorId" TEXT,
    "vendorName" TEXT NOT NULL,
    "quotationId" TEXT,
    "quotationNumber" TEXT,
    "submittedAt" TIMESTAMP(3),
    "grandTotal" DECIMAL(15,2),
    "deliveryBasis" TEXT,
    "warranty" TEXT,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TCE_pkey" PRIMARY KEY ("id")
);

-- TCE Items: Per-product comparison data
CREATE TABLE "TCEItem" (
    "id" TEXT NOT NULL,
    "tceId" TEXT NOT NULL,
    "rfqFloatItemId" TEXT,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(15,3),
    "uom" TEXT,
    "quotedRate" DECIMAL(15,2),
    "discountPercentage" DECIMAL(5,2),
    "discountAmount" DECIMAL(15,2),
    "gstPercentage" DECIMAL(5,2),
    "gstAmount" DECIMAL(15,2),
    "totalAmount" DECIMAL(15,2),
    "deliveryBasis" TEXT,
    "supplierRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TCEItem_pkey" PRIMARY KEY ("id")
);

-- TCE Attachments: Documents attached to TCE
CREATE TABLE "TCEAttachment" (
    "id" TEXT NOT NULL,
    "tceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TCEAttachment_pkey" PRIMARY KEY ("id")
);

-- Negotiation: Extended negotiation tracking per RFQ float
CREATE TABLE "Negotiation" (
    "id" TEXT NOT NULL,
    "rfqFloatId" TEXT NOT NULL,
    "tceId" TEXT,
    "vendorId" TEXT,
    "vendorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negotiation_pkey" PRIMARY KEY ("id")
);

-- Negotiation Items: Per-product negotiation details
CREATE TABLE "NegotiationItem" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "tceItemId" TEXT,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(15,3),
    "uom" TEXT,
    "originalRate" DECIMAL(15,2),
    "negotiatedRate" DECIMAL(15,2),
    "finalRate" DECIMAL(15,2),
    "discountPercentage" DECIMAL(5,2),
    "deliveryTerms" TEXT,
    "paymentTerms" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NegotiationItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "RFQFloat_rfqNumber_idx" ON "RFQFloat"("rfqNumber");
CREATE INDEX "RFQFloat_status_idx" ON "RFQFloat"("status");
CREATE INDEX "RFQFloat_createdById_idx" ON "RFQFloat"("createdById");
CREATE INDEX "RFQFloatItem_rfqFloatId_idx" ON "RFQFloatItem"("rfqFloatId");
CREATE INDEX "RFQFloatItem_indentId_idx" ON "RFQFloatItem"("indentId");
CREATE INDEX "RFQFloatVendor_rfqFloatId_idx" ON "RFQFloatVendor"("rfqFloatId");
CREATE INDEX "RFQFloatVendor_vendorId_idx" ON "RFQFloatVendor"("vendorId");
CREATE INDEX "TCE_rfqFloatId_idx" ON "TCE"("rfqFloatId");
CREATE INDEX "TCE_vendorId_idx" ON "TCE"("vendorId");
CREATE INDEX "TCEItem_tceId_idx" ON "TCEItem"("tceId");
CREATE INDEX "TCEAttachment_tceId_idx" ON "TCEAttachment"("tceId");
CREATE INDEX "Negotiation_rfqFloatId_idx" ON "Negotiation"("rfqFloatId");
CREATE INDEX "Negotiation_vendorId_idx" ON "Negotiation"("vendorId");
CREATE INDEX "NegotiationItem_negotiationId_idx" ON "NegotiationItem"("negotiationId");