import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TceAutomationService {
  private readonly logger = new Logger(TceAutomationService.name);
  constructor(private prisma: PrismaService) {}

  async syncQuotationToTCE(quotationId: string): Promise<any> {
    this.logger.log(`Syncing quotation ${quotationId} to TCE`);
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: quotationId },
      include: {
        vendorForm: { include: { rfq: { include: { items: true } } } },
        lineItems: true,
        attachments: true,
      },
    });
    if (!quotation) throw new BadRequestException('Quotation not found');
    const rfqFloatId = quotation.vendorForm.rfqId;
    const vendorId = quotation.vendorForm.vendorId;
    const vendorName = quotation.vendorForm.vendorName;
    const existingTCE = await this.prisma.tCE.findFirst({
      where: { rfqFloatId, vendorId: vendorId || undefined, vendorName },
    });
    const grandTotal = quotation.lineItems.reduce(
      (sum, item) => sum + (Number(item.totalAmount) || 0),
      0,
    );
    const deliveryBasis = quotation.deliveryBasis;
    const warranty = quotation.warranty;
    let tce;
    if (existingTCE) {
      await this.prisma.tCEItem.deleteMany({
        where: { tceId: existingTCE.id },
      });
      await this.prisma.tCEAttachment.deleteMany({
        where: { tceId: existingTCE.id },
      });
      tce = await this.prisma.tCE.update({
        where: { id: existingTCE.id },
        data: {
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          submittedAt: new Date(),
          grandTotal,
          deliveryBasis,
          warranty,
          remarks: quotation.additionalNotes,
          status: 'RECEIVED',
          items: {
            create: quotation.lineItems.map((item) => ({
              rfqFloatItemId: this.findMatchingRFQFloatItemId(
                quotation.vendorForm.rfq.items,
                item.itemCode,
              ),
              itemCode: item.itemCode,
              itemName: item.itemName,
              quantity: item.quantity,
              uom: item.unitOfMeasure,
              quotedRate: item.quotedRate,
              discountPercentage: item.discountPercentage,
              discountAmount: item.discountAmount,
              gstPercentage: item.gstPercentage,
              gstAmount: item.gstAmount,
              totalAmount: item.totalAmount,
              deliveryBasis,
              supplierRemark: item.remarks,
            })),
          },
          attachments: {
            create: quotation.attachments.map((att) => ({
              fileName: att.fileName,
              fileType: att.fileType,
              fileSize: att.fileSize,
              fileUrl: att.fileUrl,
            })),
          },
        },
        include: { items: true, attachments: true },
      });
      await this.prisma.rFQFloatActivityLog.create({
        data: {
          rfqFloatId,
          action: 'QUOTATION_REVISED',
          description: `TCE updated with revised quotation from ${vendorName}`,
          metadata: JSON.stringify({ tceId: tce.id, quotationId, vendorName }),
        },
      });
    } else {
      tce = await this.prisma.tCE.create({
        data: {
          rfqFloatId,
          vendorFormId: quotation.vendorFormId,
          vendorId,
          vendorName,
          quotationId: quotation.id,
          quotationNumber: quotation.quotationNumber,
          submittedAt: new Date(),
          grandTotal,
          deliveryBasis,
          warranty,
          remarks: quotation.additionalNotes,
          status: 'RECEIVED',
          items: {
            create: quotation.lineItems.map((item) => ({
              rfqFloatItemId: this.findMatchingRFQFloatItemId(
                quotation.vendorForm.rfq.items,
                item.itemCode,
              ),
              itemCode: item.itemCode,
              itemName: item.itemName,
              quantity: item.quantity,
              uom: item.unitOfMeasure,
              quotedRate: item.quotedRate,
              discountPercentage: item.discountPercentage,
              discountAmount: item.discountAmount,
              gstPercentage: item.gstPercentage,
              gstAmount: item.gstAmount,
              totalAmount: item.totalAmount,
              deliveryBasis,
              supplierRemark: item.remarks,
            })),
          },
          attachments: {
            create: quotation.attachments.map((att) => ({
              fileName: att.fileName,
              fileType: att.fileType,
              fileSize: att.fileSize,
              fileUrl: att.fileUrl,
            })),
          },
        },
        include: { items: true, attachments: true },
      });
      await this.prisma.rFQFloatActivityLog.create({
        data: {
          rfqFloatId,
          action: 'TCE_CREATED',
          description: `TCE created for vendor ${vendorName}`,
          metadata: JSON.stringify({
            tceId: tce.id,
            quotationId,
            vendorName,
            grandTotal,
          }),
        },
      });
    }
    await this.updateVendorStatus(rfqFloatId, vendorId, vendorName);
    this.logger.log(`TCE sync completed for quotation ${quotationId}`);
    return tce;
  }

  private findMatchingRFQFloatItemId(
    rfqItems: any[],
    itemCode: string | null | undefined,
  ): string | null {
    if (!itemCode) return null;
    const match = rfqItems.find((item) => item.itemCode === itemCode);
    return match?.id || null;
  }

  private async updateVendorStatus(
    rfqFloatId: string,
    vendorId: string | null | undefined,
    vendorName: string,
  ): Promise<void> {
    const rfqFloat = await this.prisma.rFQFloat.findUnique({
      where: { id: rfqFloatId },
      include: { vendors: true, tces: true },
    });
    if (!rfqFloat) return;
    const vendor = rfqFloat.vendors.find(
      (v) => v.vendorId === vendorId || v.vendorName === vendorName,
    );
    if (vendor) {
      await this.prisma.rFQFloatVendor.update({
        where: { id: vendor.id },
        data: { status: 'SUBMITTED', sentDate: new Date() },
      });
    }
    const submittedCount = rfqFloat.tces.length;
    const totalVendors = rfqFloat.vendors.length;
    if (submittedCount === totalVendors && totalVendors > 0) {
      await this.prisma.rFQFloat.update({
        where: { id: rfqFloatId },
        data: { status: 'COMPLETED' },
      });
      await this.prisma.rFQFloatActivityLog.create({
        data: {
          rfqFloatId,
          action: 'ALL_QUOTATIONS_RECEIVED',
          description: `All ${totalVendors} vendors have submitted quotations`,
        },
      });
    }
  }

  async refloatRFQ(
    rfqFloatId: string,
    data: { vendorIds: string[]; nextSendDate: Date; remarks?: string },
    performedById: string,
  ): Promise<any> {
    this.logger.log(`Re-floating RFQ Float ${rfqFloatId}`);
    const rfqFloat = await this.prisma.rFQFloat.findUnique({
      where: { id: rfqFloatId },
      include: { vendors: true, items: true },
    });
    if (!rfqFloat) throw new BadRequestException('RFQ Float not found');
    const newRfqFloat = await this.prisma.rFQFloat.create({
      data: {
        rfqNumber: `${rfqFloat.rfqNumber}-RE${Date.now().toString().slice(-6)}`,
        rfqDate: new Date(),
        submissionDeadline: data.nextSendDate,
        expectedDeliveryDate: rfqFloat.expectedDeliveryDate,
        filledById: rfqFloat.filledById,
        deliveryLocation: rfqFloat.deliveryLocation,
        remarks: data.remarks || rfqFloat.remarks,
        status: 'FLOATED',
        createdById: performedById,
        items: {
          create: rfqFloat.items.map((item) => ({
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
            isAvailableInStore: item.isAvailableInStore,
            isSelected: item.isSelected,
          })),
        },
        vendors: {
          create: data.vendorIds.map((vendorId) => {
            const originalVendor = rfqFloat.vendors.find(
              (v) => v.vendorId === vendorId,
            );
            return {
              vendorId,
              vendorCode: originalVendor?.vendorCode,
              vendorName: originalVendor?.vendorName || 'Unknown',
              email: originalVendor?.email,
              phone: originalVendor?.phone,
              status: 'PENDING',
            };
          }),
        },
      },
      include: { items: true, vendors: true },
    });
    await this.prisma.rFQFloatActivityLog.create({
      data: {
        rfqFloatId: newRfqFloat.id,
        action: 'RFQ_REFLOATED',
        description: `RFQ re-floated to ${data.vendorIds.length} vendors`,
        performedById,
        metadata: JSON.stringify({
          originalRfqFloatId: rfqFloatId,
          originalRfqNumber: rfqFloat.rfqNumber,
          vendorCount: data.vendorIds.length,
          nextSendDate: data.nextSendDate,
        }),
      },
    });
    await this.prisma.rFQFloat.update({
      where: { id: rfqFloatId },
      data: { status: 'RE-FLOATED' },
    });
    return newRfqFloat;
  }

  async getTCEComparison(
    rfqFloatId: string,
    options?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
  ): Promise<any> {
    const tces = await this.prisma.tCE.findMany({
      where: { rfqFloatId },
      include: { items: true, attachments: true },
      orderBy:
        options?.sortBy === 'grandTotal'
          ? { grandTotal: options.sortOrder || 'asc' }
          : { submittedAt: 'desc' },
    });
    if (tces.length === 0)
      return {
        vendors: [],
        products: [],
        highlights: {},
        summary: { totalVendors: 0, responded: 0, pending: 0 },
      };
    const rfqFloat = await this.prisma.rFQFloat.findUnique({
      where: { id: rfqFloatId },
      include: { items: true, vendors: true },
    });
    if (!rfqFloat) throw new BadRequestException('RFQ Float not found');
    const products = rfqFloat.items.map((item) => {
      const vendorData: Record<string, any> = {};
      let lowestRate: { vendor: string; rate: number } | null = null;
      let lowestTotal: { vendor: string; total: number } | null = null;
      let highestDiscount: { vendor: string; discount: number } | null = null;
      let lowestGST: { vendor: string; gst: number } | null = null;
      for (const tce of tces) {
        const tceItem = tce.items.find(
          (i) => i.rfqFloatItemId === item.id || i.itemCode === item.itemCode,
        );
        if (tceItem) {
          const rate = Number(tceItem.quotedRate) || 0;
          const total = Number(tceItem.totalAmount) || 0;
          const discount = Number(tceItem.discountPercentage) || 0;
          const gst = Number(tceItem.gstPercentage) || 0;
          vendorData[tce.vendorName] = {
            tceId: tce.id,
            rate,
            discount,
            gst,
            total,
            delivery: tceItem.deliveryBasis,
            remark: tceItem.supplierRemark,
            status: tce.status,
            submittedAt: tce.submittedAt,
          };
          if (!lowestRate || rate < lowestRate.rate)
            lowestRate = { vendor: tce.vendorName, rate };
          if (!lowestTotal || total < lowestTotal.total)
            lowestTotal = { vendor: tce.vendorName, total };
          if (!highestDiscount || discount > highestDiscount.discount)
            highestDiscount = { vendor: tce.vendorName, discount };
          if (
            !lowestGST ||
            (gst > 0 && (!lowestGST.gst || gst < lowestGST.gst))
          )
            lowestGST = { vendor: tce.vendorName, gst };
        }
      }
      return {
        productId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        uom: item.uom,
        unitWeight: item.unitWeight,
        totalWeight: item.totalWeight,
        itemRemarks: item.itemRemarks,
        vendors: vendorData,
        lowestRate: lowestRate
          ? { vendor: lowestRate.vendor, rate: lowestRate.rate }
          : null,
        lowestTotal: lowestTotal
          ? { vendor: lowestTotal.vendor, total: lowestTotal.total }
          : null,
        highestDiscount: highestDiscount
          ? {
              vendor: highestDiscount.vendor,
              discount: highestDiscount.discount,
            }
          : null,
        lowestGST: lowestGST
          ? { vendor: lowestGST.vendor, gst: lowestGST.gst }
          : null,
      };
    });
    const vendors = tces.map((t) => ({
      tceId: t.id,
      vendorId: t.vendorId,
      vendorName: t.vendorName,
      grandTotal: t.grandTotal,
      deliveryBasis: t.deliveryBasis,
      warranty: t.warranty,
      submittedAt: t.submittedAt,
      status: t.status,
      itemCount: t.items.length,
    }));
    const lowestGrandTotal = tces
      .filter((t) => t.grandTotal)
      .sort((a, b) => Number(a.grandTotal) - Number(b.grandTotal))[0];
    return {
      rfqFloatId,
      rfqNumber: rfqFloat.rfqNumber,
      vendors,
      products,
      highlights: {
        lowestGrandTotal: lowestGrandTotal
          ? {
              vendor: lowestGrandTotal.vendorName,
              total: Number(lowestGrandTotal.grandTotal),
              tceId: lowestGrandTotal.id,
            }
          : null,
      },
      summary: {
        totalVendors: rfqFloat.vendors.length,
        responded: tces.length,
        pending: rfqFloat.vendors.length - tces.length,
      },
    };
  }

  async searchTCE(filters: {
    rfqNumber?: string;
    vendorName?: string;
    itemCode?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    skip?: number;
    take?: number;
  }): Promise<any> {
    const where: any = {};
    if (filters.rfqNumber)
      where.rfqFloat = {
        rfqNumber: { contains: filters.rfqNumber, mode: 'insensitive' },
      };
    if (filters.vendorName)
      where.vendorName = { contains: filters.vendorName, mode: 'insensitive' };
    if (filters.status) where.status = filters.status;
    if (filters.minAmount || filters.maxAmount) {
      where.grandTotal = {};
      if (filters.minAmount) where.grandTotal.gte = filters.minAmount;
      if (filters.maxAmount) where.grandTotal.lte = filters.maxAmount;
    }
    const [tces, total] = await Promise.all([
      this.prisma.tCE.findMany({
        where,
        include: {
          rfqFloat: { select: { rfqNumber: true, rfqDate: true } },
          items: filters.itemCode
            ? {
                where: {
                  itemCode: { contains: filters.itemCode, mode: 'insensitive' },
                },
              }
            : true,
        },
        skip: filters.skip || 0,
        take: filters.take || 20,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.tCE.count({ where }),
    ]);
    return {
      data: tces,
      pagination: {
        skip: filters.skip || 0,
        take: filters.take || 20,
        total,
        pages: Math.ceil(total / (filters.take || 20)),
      },
    };
  }

  async exportTCEToCSV(rfqFloatId: string): Promise<string> {
    const comparison = await this.getTCEComparison(rfqFloatId);
    const headers = [
      'Item Code',
      'Product Description',
      'Quantity',
      'UOM',
      ...comparison.vendors
        .map((v: any) => [
          `${v.vendorName} - Rate`,
          `${v.vendorName} - Discount`,
          `${v.vendorName} - GST`,
          `${v.vendorName} - Total`,
        ])
        .flat(),
    ];
    const rows = comparison.products.map((product: any) => {
      const row = [
        product.itemCode || '',
        product.itemName,
        product.quantity,
        product.uom || '',
      ];
      for (const vendor of comparison.vendors) {
        const vData = product.vendors[vendor.vendorName];
        row.push(
          vData?.rate?.toString() || '0',
          vData?.discount?.toString() || '0',
          vData?.gst?.toString() || '0',
          vData?.total?.toString() || '0',
        );
      }
      return row.join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }
}
