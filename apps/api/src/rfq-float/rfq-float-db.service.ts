import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RfqFloatDbService {
  private readonly logger = new Logger(RfqFloatDbService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Generate RFQ Number ─────────────────────────────────────────────────
  async generateRfqNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    const seq = String(timestamp).slice(-6);
    return `RFQ-${year}-${seq}`;
  }

  // ─── Create RFQ Float ────────────────────────────────────────────────────
  async createRfqFloat(data: {
    rfqNumber: string;
    rfqDate: Date;
    submissionDeadline?: Date | null;
    expectedDeliveryDate?: Date | null;
    filledById?: string | null;
    deliveryLocation?: string | null;
    remarks?: string | null;
    createdById: string;
    items: Array<{
      indentId: string;
      indentItemId: string;
      itemCode?: string | null;
      itemName: string;
      description?: string | null;
      itemRemarks?: string | null;
      make?: string | null;
      quantity: number;
      uom?: string | null;
      unitWeight?: number | null;
      totalWeight?: number | null;
      isAvailableInStore?: boolean;
      isSelected?: boolean;
    }>;
    vendors: Array<{
      vendorId?: string | null;
      vendorCode?: string | null;
      vendorName: string;
      email?: string | null;
      phone?: string | null;
    }>;
  }) {
    return this.prisma.rFQFloat.create({
      data: {
        rfqNumber: data.rfqNumber,
        rfqDate: data.rfqDate,
        submissionDeadline: data.submissionDeadline,
        expectedDeliveryDate: data.expectedDeliveryDate,
        filledById: data.filledById,
        deliveryLocation: data.deliveryLocation,
        remarks: data.remarks,
        status: 'FLOATED',
        createdById: data.createdById,
        items: {
          create: data.items.map((item) => ({
            indentId: item.indentId,
            indentItemId: item.indentItemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            description: item.description,
            itemRemarks: item.itemRemarks,
            make: item.make,
            quantity: item.quantity,
            uom: item.uom,
            unitWeight: item.unitWeight,
            totalWeight: item.totalWeight,
            isAvailableInStore: item.isAvailableInStore ?? false,
            isSelected: item.isSelected ?? true,
          })),
        },
        vendors: {
          create: data.vendors.map((v) => ({
            vendorId: v.vendorId,
            vendorCode: v.vendorCode,
            vendorName: v.vendorName,
            email: v.email,
            phone: v.phone,
            status: 'PENDING',
          })),
        },
      },
      include: {
        items: true,
        vendors: true,
      },
    });
  }

  // ─── Find All ────────────────────────────────────────────────────────────
  async findAll(
    skip = 0,
    take = 10,
    search?: string,
    status?: string,
    sortBy = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    if (take > 100) take = 100;

    const where: any = {};
    if (search) {
      where.OR = [
        { rfqNumber: { contains: search, mode: 'insensitive' } },
        { deliveryLocation: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.rFQFloat.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          items: true,
          vendors: true,
          _count: {
            select: {
              items: true,
              vendors: true,
              tces: true,
              negotiations: true,
            },
          },
        },
      }),
      this.prisma.rFQFloat.count({ where }),
    ]);

    return {
      data,
      pagination: { skip, take, total, pages: Math.ceil(total / take) },
    };
  }

  // ─── Find One ────────────────────────────────────────────────────────────
  async findOne(id: string) {
    return this.prisma.rFQFloat.findUnique({
      where: { id },
      include: {
        items: true,
        vendors: true,
        tces: {
          include: {
            items: true,
            attachments: true,
          },
        },
        negotiations: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  // ─── Find by RFQ Number ─────────────────────────────────────────────────
  async findByRfqNumber(rfqNumber: string) {
    return this.prisma.rFQFloat.findUnique({
      where: { rfqNumber },
      include: {
        items: true,
        vendors: true,
        tces: true,
        negotiations: true,
      },
    });
  }

  // ─── Update Status ──────────────────────────────────────────────────────
  async updateStatus(id: string, status: string) {
    return this.prisma.rFQFloat.update({
      where: { id },
      data: { status },
    });
  }

  // ─── Quick Vendor Create ────────────────────────────────────────────────
  async createVendor(data: {
    vendorCode: string;
    vendorName: string;
    email?: string | null;
    phone?: string | null;
  }) {
    return this.prisma.vendor.create({
      data: {
        vendorCode: data.vendorCode,
        vendorName: data.vendorName,
        email: data.email,
        phone: data.phone,
        status: 'ACTIVE',
      },
    });
  }

  // ─── Generate Vendor Code ───────────────────────────────────────────────
  async generateVendorCode(): Promise<string> {
    const count = await this.prisma.vendor.count();
    return `V${String(count + 1).padStart(4, '0')}`;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TCE Operations
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Create TCE from Quotation ──────────────────────────────────────────
  async createTCE(data: {
    rfqFloatId: string;
    vendorFormId?: string | null;
    vendorId?: string | null;
    vendorName: string;
    quotationId?: string | null;
    quotationNumber?: string | null;
    submittedAt?: Date | null;
    grandTotal?: number | null;
    deliveryBasis?: string | null;
    warranty?: string | null;
    remarks?: string | null;
    items?: Array<{
      rfqFloatItemId?: string | null;
      itemCode?: string | null;
      itemName: string;
      quantity?: number | null;
      uom?: string | null;
      quotedRate?: number | null;
      discountPercentage?: number | null;
      discountAmount?: number | null;
      gstPercentage?: number | null;
      gstAmount?: number | null;
      totalAmount?: number | null;
      deliveryBasis?: string | null;
      supplierRemark?: string | null;
    }>;
  }) {
    return this.prisma.tCE.create({
      data: {
        rfqFloatId: data.rfqFloatId,
        vendorFormId: data.vendorFormId,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        quotationId: data.quotationId,
        quotationNumber: data.quotationNumber,
        submittedAt: data.submittedAt,
        grandTotal: data.grandTotal,
        deliveryBasis: data.deliveryBasis,
        warranty: data.warranty,
        remarks: data.remarks,
        status: 'RECEIVED',
        items: data.items
          ? {
              create: data.items.map((item) => ({
                rfqFloatItemId: item.rfqFloatItemId,
                itemCode: item.itemCode,
                itemName: item.itemName,
                quantity: item.quantity,
                uom: item.uom,
                quotedRate: item.quotedRate,
                discountPercentage: item.discountPercentage,
                discountAmount: item.discountAmount,
                gstPercentage: item.gstPercentage,
                gstAmount: item.gstAmount,
                totalAmount: item.totalAmount,
                deliveryBasis: item.deliveryBasis,
                supplierRemark: item.supplierRemark,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
  }

  // ─── Get TCE by RFQ Float ────────────────────────────────────────────────
  async getTCEByRfqFloat(rfqFloatId: string) {
    return this.prisma.tCE.findMany({
      where: { rfqFloatId },
      include: {
        items: true,
        attachments: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // ─── Get TCE Comparison ──────────────────────────────────────────────────
  async getTCEComparison(rfqFloatId: string) {
    const tces = await this.prisma.tCE.findMany({
      where: { rfqFloatId },
      include: { items: true },
      orderBy: { grandTotal: 'asc' },
    });

    if (tces.length === 0) {
      return { vendors: [], products: [], highlights: {} };
    }

    // Get the RFQ float items for reference
    const rfqFloat = await this.prisma.rFQFloat.findUnique({
      where: { id: rfqFloatId },
      include: { items: true },
    });

    const products = rfqFloat?.items || [];
    const vendors = tces.map((t) => ({
      tceId: t.id,
      vendorName: t.vendorName,
      grandTotal: t.grandTotal,
      deliveryBasis: t.deliveryBasis,
      warranty: t.warranty,
      submittedAt: t.submittedAt,
      status: t.status,
    }));

    // Build comparison matrix
    const comparison = products.map((product) => {
      const vendorData: Record<string, any> = {};
      let lowestRate: { vendor: string; rate: number } | null = null;

      for (const tce of tces) {
        const tceItem = tce.items.find(
          (i) =>
            i.rfqFloatItemId === product.id || i.itemCode === product.itemCode,
        );
        if (tceItem) {
          vendorData[tce.vendorName] = {
            rate: tceItem.quotedRate,
            discount: tceItem.discountPercentage,
            gst: tceItem.gstPercentage,
            total: tceItem.totalAmount,
            delivery: tceItem.deliveryBasis,
            remark: tceItem.supplierRemark,
          };
          if (
            tceItem.quotedRate &&
            (!lowestRate || Number(tceItem.quotedRate) < lowestRate.rate)
          ) {
            lowestRate = {
              vendor: tce.vendorName,
              rate: Number(tceItem.quotedRate),
            };
          }
        }
      }

      return {
        productId: product.id,
        itemCode: product.itemCode,
        itemName: product.itemName,
        quantity: product.quantity,
        uom: product.uom,
        vendors: vendorData,
        lowestRate: lowestRate
          ? { vendor: lowestRate.vendor, rate: lowestRate.rate }
          : null,
      };
    });

    // Find best overall vendor
    let lowestGrandTotal: { vendor: string; total: number } | null = null;
    for (const tce of tces) {
      if (
        tce.grandTotal &&
        (!lowestGrandTotal || Number(tce.grandTotal) < lowestGrandTotal.total)
      ) {
        lowestGrandTotal = {
          vendor: tce.vendorName,
          total: Number(tce.grandTotal),
        };
      }
    }

    return {
      rfqFloatId,
      vendors,
      products: comparison,
      highlights: {
        lowestGrandTotal,
        vendorCount: tces.length,
      },
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Negotiation Operations
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Create Negotiation ──────────────────────────────────────────────────
  async createNegotiation(data: {
    rfqFloatId: string;
    tceId: string;
    vendorId?: string | null;
    vendorName: string;
    remarks?: string | null;
  }) {
    return this.prisma.negotiation.create({
      data: {
        rfqFloatId: data.rfqFloatId,
        tceId: data.tceId,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        status: 'ACTIVE',
        remarks: data.remarks,
      },
      include: { items: true },
    });
  }

  // ─── Get Negotiations by RFQ Float ──────────────────────────────────────
  async getNegotiationsByRfqFloat(rfqFloatId: string) {
    return this.prisma.negotiation.findMany({
      where: { rfqFloatId },
      include: { items: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  // ─── Update Negotiation ─────────────────────────────────────────────────
  async updateNegotiation(
    id: string,
    data: {
      status?: string;
      remarks?: string;
      completedAt?: Date | null;
    },
  ) {
    return this.prisma.negotiation.update({
      where: { id },
      data: {
        ...data,
        ...(data.completedAt !== undefined
          ? { completedAt: data.completedAt }
          : {}),
      },
      include: { items: true },
    });
  }

  // ─── Create Negotiation Items ───────────────────────────────────────────
  async createNegotiationItems(
    negotiationId: string,
    items: Array<{
      tceItemId?: string | null;
      itemCode?: string | null;
      itemName: string;
      quantity?: number | null;
      uom?: string | null;
      originalRate?: number | null;
      negotiatedRate?: number | null;
      finalRate?: number | null;
      discountPercentage?: number | null;
      deliveryTerms?: string | null;
      paymentTerms?: string | null;
      remarks?: string | null;
    }>,
  ) {
    // Delete existing items first
    await this.prisma.negotiationItem.deleteMany({
      where: { negotiationId },
    });

    // Create new items
    return this.prisma.negotiationItem.createMany({
      data: items.map((item) => ({
        negotiationId,
        tceItemId: item.tceItemId,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        uom: item.uom,
        originalRate: item.originalRate,
        negotiatedRate: item.negotiatedRate,
        finalRate: item.finalRate,
        discountPercentage: item.discountPercentage,
        deliveryTerms: item.deliveryTerms,
        paymentTerms: item.paymentTerms,
        remarks: item.remarks,
      })),
    });
  }

  // ─── Activity Log ────────────────────────────────────────────────────────
  async logActivity(data: {
    rfqFloatId: string;
    action: string;
    description: string;
    performedById?: string | null;
    metadata?: string | null;
  }) {
    return this.prisma.rFQFloatActivityLog.create({
      data: {
        rfqFloatId: data.rfqFloatId,
        action: data.action,
        description: data.description,
        performedById: data.performedById,
        metadata: data.metadata,
      },
    });
  }

  // ─── Email Log ───────────────────────────────────────────────────────────
  async logEmail(data: {
    rfqFloatId: string;
    emailType: string;
    recipientEmail: string;
    subject: string;
    body?: string | null;
    deliveryStatus?: string;
  }) {
    return this.prisma.rFQFloatEmailLog.create({
      data: {
        rfqFloatId: data.rfqFloatId,
        emailType: data.emailType,
        recipientEmail: data.recipientEmail,
        subject: data.subject,
        body: data.body,
        deliveryStatus: data.deliveryStatus || 'SENT',
      },
    });
  }

  // ─── Get Activity Logs ──────────────────────────────────────────────────
  async getActivityLogs(rfqFloatId: string) {
    return this.prisma.rFQFloatActivityLog.findMany({
      where: { rfqFloatId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get Email Logs ─────────────────────────────────────────────────────
  async getEmailLogs(rfqFloatId: string) {
    return this.prisma.rFQFloatEmailLog.findMany({
      where: { rfqFloatId },
      orderBy: { sentAt: 'desc' },
    });
  }
}
