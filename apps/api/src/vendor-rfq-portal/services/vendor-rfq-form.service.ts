import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomBytes } from 'crypto';
import dayjs from 'dayjs';
import {
  VendorFormDto,
  GenerateVendorFormsDto,
  VendorFormStatus,
} from '../dto/vendor-rfq-form.dto';

@Injectable()
export class VendorRfqFormService {
  private readonly logger = new Logger(VendorRfqFormService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique secure token for vendor access
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate vendor RFQ forms for all selected vendors
   * Called when RFQ is submitted/finalized
   */
  async generateVendorForms(
    rfqId: string,
    vendorsList: VendorFormDto[],
    rfqData: any,
  ): Promise<any[]> {
    this.logger.log(
      `Generating ${vendorsList.length} vendor forms for RFQ ${rfqId}`,
    );

    const createdForms = [];

    for (const vendor of vendorsList) {
      // Check if form already exists for this RFQ-Vendor combo
      const existing = await this.prisma.vendorRFQForm.findUnique({
        where: {
          rfqId_vendorCode: {
            rfqId,
            vendorCode: vendor.vendorCode,
          },
        },
      });

      if (existing) {
        this.logger.warn(`Form already exists for vendor ${vendor.vendorCode}`);
        continue;
      }

      // Generate secure token
      const secureToken = this.generateSecureToken();
      const tokenExpiresAt = dayjs().add(30, 'days').toDate();

      // Create vendor form
      const form = await this.prisma.vendorRFQForm.create({
        data: {
          rfqId,
          vendorId: vendor.vendorId,
          vendorCode: vendor.vendorCode,
          vendorName: vendor.vendorName,
          vendorEmail: vendor.vendorEmail,
          contactPerson: vendor.contactPerson,
          secureToken,
          tokenExpiresAt,
          formStatus: VendorFormStatus.PENDING,
          rfqNumber: rfqData.rfqNumber,
          rfqDate: rfqData.createdAt,
          submissionDeadline: rfqData.submissionDeadline,
          expectedDeliveryDate: rfqData.expectedDelivery,
          deliveryLocation: rfqData.deliveryTerms,
          buyerName: rfqData.createdBy?.fullName,
          generalRemarks: rfqData.specialInstructions,
        },
      });

      createdForms.push(form);
      this.logger.log(`Created vendor form for ${vendor.vendorName}`);
    }

    return createdForms;
  }

  /**
   * Validate vendor token and get their form
   */
  async validateTokenAndGetForm(token: string): Promise<any> {
    const form = await this.prisma.vendorRFQForm.findUnique({
      where: { secureToken: token },
      include: {
        rfq: {
          include: {
            items: true,
            createdBy: true,
          },
        },
      },
    });

    if (!form) {
      throw new BadRequestException('Invalid or expired token');
    }

    // Check if token is expired
    if (dayjs().isAfter(form.tokenExpiresAt)) {
      throw new BadRequestException('Token has expired');
    }

    // Check if submission deadline passed
    if (dayjs().isAfter(form.submissionDeadline)) {
      throw new BadRequestException('Submission deadline has passed');
    }

    // Log access
    await this.logFormAccess(form.id, 'FORM_OPENED');

    // Update form status if first time opening
    if (
      form.formStatus === VendorFormStatus.PENDING ||
      form.formStatus === VendorFormStatus.EMAIL_SENT
    ) {
      await this.prisma.vendorRFQForm.update({
        where: { id: form.id },
        data: {
          formStatus: VendorFormStatus.FORM_OPENED,
          formOpenedAt: new Date(),
        },
      });
    }

    return form;
  }

  /**
   * Get vendor form by ID
   */
  async getFormById(formId: string): Promise<any> {
    const form = await this.prisma.vendorRFQForm.findUnique({
      where: { id: formId },
      include: {
        rfq: {
          include: {
            items: true,
          },
        },
        quotation: {
          include: {
            lineItems: true,
            attachments: true,
          },
        },
        accessLogs: true,
      },
    });

    if (!form) {
      throw new NotFoundException(
        `Vendor RFQ form with ID ${formId} not found`,
      );
    }

    return form;
  }

  /**
   * Update form status
   */
  async updateFormStatus(
    formId: string,
    status: VendorFormStatus,
  ): Promise<any> {
    return this.prisma.vendorRFQForm.update({
      where: { id: formId },
      data: {
        formStatus: status,
        ...(status === VendorFormStatus.SUBMITTED && {
          formSubmittedAt: new Date(),
        }),
      },
    });
  }

  /**
   * Log form access
   */
  async logFormAccess(
    formId: string,
    actionType: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.vendorFormAccessLog.create({
      data: {
        vendorFormId: formId,
        actionType: actionType as any,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Get all forms for an RFQ
   */
  async getFormsForRFQ(rfqId: string): Promise<any[]> {
    return this.prisma.vendorRFQForm.findMany({
      where: { rfqId },
      include: {
        quotation: {
          include: {
            lineItems: true,
          },
        },
        accessLogs: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Check if vendor can submit (only once)
   */
  async canVendorSubmit(formId: string): Promise<boolean> {
    const form = await this.prisma.vendorRFQForm.findUnique({
      where: { id: formId },
      include: { quotation: true },
    });

    if (!form) {
      throw new NotFoundException('Vendor form not found');
    }

    // Check if quotation already submitted
    if (form.quotation) {
      return false; // Already submitted
    }

    // Check deadline
    if (dayjs().isAfter(form.submissionDeadline)) {
      return false;
    }

    return true;
  }

  /**
   * Lock form after submission
   */
  async lockFormAfterSubmission(formId: string): Promise<void> {
    await this.prisma.vendorRFQForm.update({
      where: { id: formId },
      data: {
        formStatus: VendorFormStatus.SUBMITTED,
        formSubmittedAt: new Date(),
      },
    });
  }

  /**
   * Mark form as expired
   */
  async markFormAsExpired(formId: string): Promise<void> {
    await this.prisma.vendorRFQForm.update({
      where: { id: formId },
      data: {
        formStatus: VendorFormStatus.EXPIRED,
      },
    });
  }

  /**
   * Get vendor response summary for an RFQ
   */
  async getResponseSummary(rfqId: string): Promise<any> {
    const forms = await this.prisma.vendorRFQForm.findMany({
      where: { rfqId },
      include: {
        quotation: {
          include: {
            lineItems: true,
            attachments: true,
          },
        },
      },
    });

    const summary = {
      totalVendorsForms: forms.length,
      submitted: forms.filter((f) => f.quotation).length,
      pending: forms.filter((f) => !f.quotation).length,
      forms: forms.map((f) => ({
        vendorName: f.vendorName,
        vendorEmail: f.vendorEmail,
        formStatus: f.formStatus,
        quotationStatus: f.quotation?.quotationStatus || 'NOT_SUBMITTED',
        formOpenedAt: f.formOpenedAt,
        formSubmittedAt: f.formSubmittedAt,
        totalAmount: f.quotation?.grandTotalAmount || 0,
      })),
    };

    return summary;
  }
}
