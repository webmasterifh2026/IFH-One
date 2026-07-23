import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import dayjs from 'dayjs';
import {
  CreateVendorQuotationDto,
  SubmitVendorQuotationDto,
  QuotationStatus,
  UpdateQuotationStatusDto,
} from '../dto/vendor-rfq-form.dto';

@Injectable()
export class VendorQuotationService {
  private readonly logger = new Logger(VendorQuotationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique quotation number
   */
  private async generateQuotationNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.vendorQuotation.count({
      where: {
        quotationNumber: { startsWith: `QT-${year}-${month}-` },
      },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `QT-${year}-${month}-${seq}`;
  }

  /**
   * Submit vendor quotation
   */
  async submitQuotation(
    dto: SubmitVendorQuotationDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<any> {
    this.logger.log(`Submitting quotation for vendor form ${dto.vendorFormId}`);

    // Validate vendor form exists and can submit
    const vendorForm = await this.prisma.vendorRFQForm.findUnique({
      where: { id: dto.vendorFormId },
      include: { quotation: true },
    });

    if (!vendorForm) {
      throw new NotFoundException('Vendor form not found');
    }

    // Check if already submitted
    if (vendorForm.quotation) {
      throw new ConflictException(
        'Quotation already submitted for this vendor',
      );
    }

    // Check deadline
    if (dayjs().isAfter(vendorForm.submissionDeadline)) {
      throw new BadRequestException('Submission deadline has passed');
    }

    // Calculate grand total from line items
    let grandTotalAmount = 0;
    for (const item of dto.lineItems) {
      grandTotalAmount += item.totalAmount || 0;
    }

    // Create quotation
    const quotationNumber = await this.generateQuotationNumber();

    const quotation = await this.prisma.vendorQuotation.create({
      data: {
        quotationNumber,
        vendorFormId: dto.vendorFormId,
        rfqId: dto.rfqId,
        submittedAt: new Date(),
        submittedByName: dto.authorizedPerson,
        submittedByDesignation: dto.designation,
        digitalSignature: dto.digitalSignature,
        paymentTerms: dto.paymentTerms,
        deliveryBasis: dto.deliveryBasis,
        warranty: dto.warranty,
        grandTotalAmount,
        grandTotalCurrency: 'INR',
        quotationStatus: QuotationStatus.SUBMITTED,
        lineItems: {
          create: dto.lineItems.map((item) => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            description: item.description,
            quantity: item.quantity,
            unitOfMeasure: item.unitOfMeasure,
            quotedRate: item.quotedRate,
            currency: item.currency || 'INR',
            discountPercentage: item.discountPercentage,
            discountAmount: item.discountAmount,
            gstPercentage: item.gstPercentage,
            gstAmount: item.gstAmount,
            freightCharges: item.freightCharges,
            packingCharges: item.packingCharges,
            totalAmount: item.totalAmount,
            brandOffered: item.brandOffered,
            countryOfOrigin: item.countryOfOrigin,
            hsnCode: item.hsnCode,
            moqMinimum: item.moqMinimum,
            leadTimeDays: item.leadTimeDays,
            deliveryTime: item.deliveryTime,
            warranty: item.warranty,
            warrantyMonths: item.warrantyMonths,
            remarks: item.remarks,
            technicalDetails: item.technicalDetails,
          })),
        },
      },
      include: {
        lineItems: true,
        attachments: true,
      },
    });

    // Log access - submission
    await this.prisma.vendorFormAccessLog.create({
      data: {
        vendorFormId: dto.vendorFormId,
        actionType: 'FORM_SUBMITTED',
        ipAddress,
        userAgent,
      },
    });

    // Update vendor form status
    await this.prisma.vendorRFQForm.update({
      where: { id: dto.vendorFormId },
      data: {
        formStatus: 'SUBMITTED',
        formSubmittedAt: new Date(),
      },
    });

    // Log activity
    await this.logActivity(
      dto.rfqId,
      'QUOTATION_SUBMITTED',
      `Vendor quotation ${quotationNumber} submitted`,
      undefined,
      quotation.id,
    );

    this.logger.log(`Quotation ${quotationNumber} submitted successfully`);

    return quotation;
  }

  /**
   * Get quotation by ID
   */
  async getQuotationById(quotationId: string): Promise<any> {
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: quotationId },
      include: {
        vendorForm: {
          include: {
            rfq: {
              include: {
                items: true,
              },
            },
          },
        },
        lineItems: {
          include: {
            attachments: true,
          },
        },
        attachments: true,
        negotiationRounds: {
          orderBy: { roundNumber: 'asc' },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${quotationId} not found`);
    }

    return quotation;
  }

  /**
   * Get all quotations for an RFQ
   */
  async getQuotationsForRFQ(rfqId: string): Promise<any[]> {
    return this.prisma.vendorQuotation.findMany({
      where: { rfqId },
      include: {
        vendorForm: {
          select: {
            vendorName: true,
            vendorCode: true,
            vendorEmail: true,
          },
        },
        lineItems: true,
        attachments: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Update quotation status
   */
  async updateQuotationStatus(
    quotationId: string,
    dto: UpdateQuotationStatusDto,
  ): Promise<any> {
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const updated = await this.prisma.vendorQuotation.update({
      where: { id: quotationId },
      data: {
        quotationStatus: dto.status,
        quotationRemarks: dto.remarks,
      },
    });

    // Log activity
    await this.logActivity(
      quotation.rfqId,
      'QUOTATION_VIEWED',
      `Quotation status updated to ${dto.status}`,
      undefined,
      quotationId,
    );

    return updated;
  }

  /**
   * Upload attachment for quotation
   */
  async uploadQuotationAttachment(
    quotationId: string,
    lineItemId: string | null,
    fileName: string,
    fileType: string,
    fileSize: number,
    fileUrl: string,
    documentType: string,
  ): Promise<any> {
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const attachment = await this.prisma.vendorQuotationAttachment.create({
      data: {
        quotationId,
        lineItemId,
        documentType: documentType as any,
        fileName,
        fileType,
        fileSize,
        fileUrl,
      },
    });

    // Log access
    await this.prisma.vendorFormAccessLog.create({
      data: {
        vendorFormId: quotation.vendorFormId,
        actionType: 'ATTACHMENT_UPLOADED',
      },
    });

    return attachment;
  }

  /**
   * Get quotation comparison data for RFQ
   */
  async getQuotationComparison(rfqId: string): Promise<any> {
    const quotations = await this.getQuotationsForRFQ(rfqId);

    // Get RFQ items for comparison
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { items: true },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    // Build comparison matrix
    const comparisonData = {
      rfqNumber: rfq.rfqNumber,
      totalQuotations: quotations.length,
      quotations: quotations.map((q) => ({
        quotationId: q.id,
        vendorName: q.vendorForm.vendorName,
        vendorCode: q.vendorForm.vendorCode,
        quotationNumber: q.quotationNumber,
        submittedAt: q.submittedAt,
        status: q.quotationStatus,
        grandTotal: q.grandTotalAmount,
        currency: q.grandTotalCurrency,
        paymentTerms: q.paymentTerms,
        deliveryBasis: q.deliveryBasis,
        warranty: q.warranty,
        leadTime: q.lineItems[0]?.leadTimeDays,
        lineItems: q.lineItems.map((li: any) => ({
          itemCode: li.itemCode,
          itemName: li.itemName,
          quotedRate: li.quotedRate,
          discount: li.discountPercentage,
          gst: li.gstPercentage,
          totalAmount: li.totalAmount,
          brand: li.brandOffered,
          leadTime: li.leadTimeDays,
        })),
      })),
    };

    return comparisonData;
  }

  /**
   * Log activity
   */
  private async logActivity(
    rfqId: string,
    activityType: string,
    description: string,
    performedById?: string,
    quotationId?: string,
  ): Promise<void> {
    await this.prisma.rFQActivityLog.create({
      data: {
        rfqId,
        activityType: activityType as any,
        description,
        quotationId,
        performedById,
      },
    });
  }

  /**
   * Get round-trip properties for testing data integrity
   */
  async verifyRoundTripIntegrity(quotationId: string): Promise<any> {
    const quotation = await this.getQuotationById(quotationId);

    // Calculate totals from line items
    const calculatedTotal = quotation.lineItems.reduce(
      (sum: number, item: any) => {
        return sum + (item.totalAmount || 0);
      },
      0,
    );

    return {
      quotationId,
      storedGrandTotal: quotation.grandTotalAmount,
      calculatedGrandTotal: calculatedTotal,
      isAccurate: Math.abs(quotation.grandTotalAmount - calculatedTotal) < 0.01,
      lineItemsCount: quotation.lineItems.length,
      lineItems: quotation.lineItems.map((item: any) => ({
        itemCode: item.itemCode,
        quantity: item.quantity,
        quotedRate: item.quotedRate,
        totalAmount: item.totalAmount,
        precision: item.quotedRate * item.quantity === item.totalAmount,
      })),
    };
  }
}
