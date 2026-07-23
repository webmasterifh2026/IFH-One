import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RfqFloatDbService } from './rfq-float-db.service';
import { EmailService } from '../common/email/email.service';
import { TceAutomationService } from './services/tce-automation.service';
import {
  CreateRfqFloatDto,
  QuickVendorDto,
  StartNegotiationDto,
  UpdateNegotiationDto,
} from './dto/rfq-float.dto';

@Injectable()
export class RfqFloatService {
  private readonly logger = new Logger(RfqFloatService.name);

  constructor(
    private db: RfqFloatDbService,
    private emailService: EmailService,
    private tceAutomationService: TceAutomationService,
  ) {}

  // ─── Create RFQ Float ────────────────────────────────────────────────────
  async createRfqFloat(dto: CreateRfqFloatDto, userId: string) {
    // Generate RFQ number
    const rfqNumber = await this.db.generateRfqNumber();

    // Create the RFQ float record
    const rfqFloat = await this.db.createRfqFloat({
      rfqNumber,
      rfqDate: dto.rfqDate ? new Date(dto.rfqDate) : new Date(),
      submissionDeadline: dto.submissionDeadline
        ? new Date(dto.submissionDeadline)
        : null,
      expectedDeliveryDate: dto.expectedDeliveryDate
        ? new Date(dto.expectedDeliveryDate)
        : null,
      filledById: dto.filledById || null,
      deliveryLocation: dto.deliveryLocation || null,
      remarks: dto.remarks || null,
      createdById: userId,
      items: dto.items.map((item) => ({
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
      vendors: dto.vendors.map((v) => ({
        vendorId: v.vendorId,
        vendorCode: v.vendorCode,
        vendorName: v.vendorName,
        email: v.email,
        phone: v.phone,
      })),
    });

    // Log activity
    await this.db.logActivity({
      rfqFloatId: rfqFloat.id,
      action: 'RFQ_CREATED',
      description: `RFQ ${rfqNumber} created with ${dto.items.length} items and ${dto.vendors.length} vendors`,
      performedById: userId,
      metadata: JSON.stringify({
        itemCount: dto.items.length,
        vendorCount: dto.vendors.length,
      }),
    });

    return rfqFloat;
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
    return this.db.findAll(skip, take, search, status, sortBy, sortOrder);
  }

  // ─── Find One ────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const rfqFloat = await this.db.findOne(id);
    if (!rfqFloat) {
      throw new NotFoundException(`RFQ Float with ID ${id} not found`);
    }
    return rfqFloat;
  }

  // ─── Find by RFQ Number ─────────────────────────────────────────────────
  async findByRfqNumber(rfqNumber: string) {
    const rfqFloat = await this.db.findByRfqNumber(rfqNumber);
    if (!rfqFloat) {
      throw new NotFoundException(`RFQ Float ${rfqNumber} not found`);
    }
    return rfqFloat;
  }

  // ─── Quick Vendor Creation ───────────────────────────────────────────────
  async createQuickVendor(dto: QuickVendorDto) {
    const vendorCode = await this.db.generateVendorCode();
    const vendor = await this.db.createVendor({
      vendorCode,
      vendorName: dto.companyName,
      email: dto.email || null,
      phone: dto.phone || null,
    });
    return vendor;
  }

  // ─── Send RFQ to Vendors ────────────────────────────────────────────────
  async sendToVendors(rfqFloatId: string, userId: string) {
    const rfqFloat = await this.findOne(rfqFloatId);

    if (rfqFloat.vendors.length === 0) {
      throw new BadRequestException('No vendors selected for this RFQ');
    }

    // Update status
    await this.db.updateStatus(rfqFloatId, 'SENT');

    // Send emails to each vendor
    const emailOverrideTo =
      process.env.EMAIL_OVERRIDE_TO || '29x.aditya@gmail.com';
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    for (const vendor of rfqFloat.vendors) {
      const recipientEmail = emailOverrideTo || vendor.email;
      if (!recipientEmail) continue;

      const subject = `Request for Quotation - ${rfqFloat.rfqNumber}`;
      const formLink = `${baseUrl}/vendor-rfq-portal/legacy/${rfqFloat.rfqNumber}/${vendor.id}`;

      const html = this.buildVendorEmailHtml(rfqFloat, vendor, formLink);

      try {
        await this.emailService.send({
          to: recipientEmail,
          subject,
          text: `Please submit your quotation for RFQ ${rfqFloat.rfqNumber}. Deadline: ${rfqFloat.submissionDeadline?.toLocaleDateString() || 'N/A'}`,
          html,
        });

        // Log email
        await this.db.logEmail({
          rfqFloatId,
          emailType: 'RFQ_INVITATION',
          recipientEmail,
          subject,
          body: html,
          deliveryStatus: 'SENT',
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to send email to ${recipientEmail}: ${error.message}`,
        );
        await this.db.logEmail({
          rfqFloatId,
          emailType: 'RFQ_INVITATION',
          recipientEmail,
          subject,
          body: html,
          deliveryStatus: 'FAILED',
        });
      }
    }

    // Log activity
    await this.db.logActivity({
      rfqFloatId,
      action: 'RFQ_SENT',
      description: `RFQ ${rfqFloat.rfqNumber} sent to ${rfqFloat.vendors.length} vendors`,
      performedById: userId,
      metadata: JSON.stringify({
        vendorCount: rfqFloat.vendors.length,
        vendors: rfqFloat.vendors.map((v) => v.vendorName),
      }),
    });

    return { message: 'RFQ sent to vendors successfully' };
  }

  // ─── Build Vendor Email HTML ─────────────────────────────────────────────
  private buildVendorEmailHtml(
    rfqFloat: any,
    vendor: any,
    formLink: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: #2563EB; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Request for Quotation</h2>
        <p style="margin: 5px 0 0; opacity: 0.9;">${rfqFloat.rfqNumber}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p>Dear ${vendor.vendorName},</p>
        <p>We are pleased to invite you to submit a quotation for the following requirements.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">RFQ Number:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${rfqFloat.rfqNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Submission Deadline:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${rfqFloat.submissionDeadline ? new Date(rfqFloat.submissionDeadline).toLocaleDateString('en-IN') : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Expected Delivery:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${rfqFloat.expectedDeliveryDate ? new Date(rfqFloat.expectedDeliveryDate).toLocaleDateString('en-IN') : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Delivery Location:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${rfqFloat.deliveryLocation || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Items Required:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${rfqFloat.items?.length || 0} items</td>
          </tr>
        </table>

        ${rfqFloat.remarks ? `<p style="background: #FEF3C7; padding: 12px; border-radius: 6px; font-size: 13px;"><strong>Remarks:</strong> ${rfqFloat.remarks}</p>` : ''}

        <div style="text-align: center; margin: 24px 0;">
          <a href="${formLink}" style="background: #2563EB; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
            Submit Quotation
          </a>
        </div>

        <p style="font-size: 12px; color: #6b7280; text-align: center;">Click the button above to access the prefilled quotation form.</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        This is an automated email from IFH One Procurement System.<br/>
        Please do not reply to this email.
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TCE Methods
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Get TCE by RFQ Float ────────────────────────────────────────────────
  async getTCEByRfqFloat(rfqFloatId: string) {
    return this.db.getTCEByRfqFloat(rfqFloatId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Negotiation Methods
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Start Negotiation ───────────────────────────────────────────────────
  async startNegotiation(rfqFloatId: string, dto: StartNegotiationDto) {
    const rfqFloat = await this.findOne(rfqFloatId);

    // Find the TCE record
    const tce = rfqFloat.tces?.find((t: any) => t.id === dto.tceId);
    if (!tce) {
      throw new NotFoundException(
        `TCE record with ID ${dto.tceId} not found in this RFQ Float`,
      );
    }

    // Create negotiation
    const negotiation = await this.db.createNegotiation({
      rfqFloatId,
      tceId: dto.tceId,
      vendorId: tce.vendorId,
      vendorName: tce.vendorName,
      remarks: dto.remarks,
    });

    // Copy TCE items to negotiation items
    if (tce.items && tce.items.length > 0) {
      await this.db.createNegotiationItems(
        negotiation.id,
        tce.items.map((item: any) => ({
          tceItemId: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: item.quantity,
          uom: item.uom,
          originalRate: item.quotedRate,
          negotiatedRate: item.quotedRate,
          finalRate: item.quotedRate,
          discountPercentage: item.discountPercentage,
          deliveryTerms: item.deliveryBasis,
          remarks: item.supplierRemark,
        })),
      );
    }

    // Log activity
    await this.db.logActivity({
      rfqFloatId,
      action: 'NEGOTIATION_STARTED',
      description: `Negotiation started with ${tce.vendorName} for RFQ ${rfqFloat.rfqNumber}`,
      metadata: JSON.stringify({
        tceId: dto.tceId,
        vendorName: tce.vendorName,
      }),
    });

    return this.db.getNegotiationsByRfqFloat(rfqFloatId);
  }

  // ─── Get Negotiations by RFQ Float ──────────────────────────────────────
  async getNegotiationsByRfqFloat(rfqFloatId: string) {
    return this.db.getNegotiationsByRfqFloat(rfqFloatId);
  }

  // ─── Update Negotiation ─────────────────────────────────────────────────
  async updateNegotiation(negotiationId: string, dto: UpdateNegotiationDto) {
    const updateData: any = {};

    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }
    if (dto.remarks !== undefined) {
      updateData.remarks = dto.remarks;
    }

    const negotiation = await this.db.updateNegotiation(
      negotiationId,
      updateData,
    );

    // Update items if provided
    if (dto.items && dto.items.length > 0) {
      await this.db.createNegotiationItems(negotiationId, dto.items);
    }

    return this.db.getNegotiationsByRfqFloat(negotiation.rfqFloatId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TCE Automation Methods
  // ═════════════════════════════════════════════════════════════════════════

  async syncQuotationToTCE(quotationId: string) {
    return this.tceAutomationService.syncQuotationToTCE(quotationId);
  }

  async getTCEComparison(rfqFloatId: string, options?: any) {
    return this.tceAutomationService.getTCEComparison(rfqFloatId, options);
  }

  async searchTCE(filters: any) {
    return this.tceAutomationService.searchTCE(filters);
  }

  async exportTCEToCSV(rfqFloatId: string) {
    return this.tceAutomationService.exportTCEToCSV(rfqFloatId);
  }

  async refloatRFQ(rfqFloatId: string, data: any, performedById: string) {
    return this.tceAutomationService.refloatRFQ(
      rfqFloatId,
      data,
      performedById,
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Activity & Email Logs
  // ═════════════════════════════════════════════════════════════════════════

  async getActivityLogs(rfqFloatId: string) {
    return this.db.getActivityLogs(rfqFloatId);
  }

  async getEmailLogs(rfqFloatId: string) {
    return this.db.getEmailLogs(rfqFloatId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Vendor Portal Methods (Public)
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Get Vendor Portal Form ──────────────────────────────────────────────
  async getVendorPortalForm(rfqNumber: string, vendorId: string) {
    const rfqFloat = await this.db.findByRfqNumber(rfqNumber);
    if (!rfqFloat) {
      throw new NotFoundException(`RFQ ${rfqNumber} not found`);
    }

    const vendor = rfqFloat.vendors?.find((v: any) => v.id === vendorId);
    if (!vendor) {
      throw new NotFoundException(`Vendor not found for this RFQ`);
    }

    // Check if already submitted (TCE record exists for this vendor)
    const alreadySubmitted = rfqFloat.tces?.some(
      (t: any) => t.vendorId === vendorId || t.vendorName === vendor.vendorName,
    );

    return {
      rfqFloat: {
        id: rfqFloat.id,
        rfqNumber: rfqFloat.rfqNumber,
        rfqDate: rfqFloat.rfqDate,
        submissionDeadline: rfqFloat.submissionDeadline,
        expectedDeliveryDate: rfqFloat.expectedDeliveryDate,
        deliveryLocation: rfqFloat.deliveryLocation,
        remarks: rfqFloat.remarks,
        items: rfqFloat.items,
        status: rfqFloat.status,
      },
      vendor: {
        id: vendor.id,
        vendorName: vendor.vendorName,
        vendorCode: vendor.vendorCode,
        email: vendor.email,
        phone: vendor.phone,
      },
      alreadySubmitted,
    };
  }

  // ─── Submit Vendor Portal Quotation (creates TCE) ────────────────────────
  async submitVendorPortalQuotation(
    rfqNumber: string,
    vendorId: string,
    dto: {
      termsAndConditions?: string;
      deliveryBasis?: string;
      paymentTerms?: string;
      warranty?: string;
      remarks?: string;
      items: Array<{
        rfqFloatItemId: string;
        itemCode?: string;
        itemName: string;
        quantity?: number;
        uom?: string;
        unitRate: number;
        discountPercentage?: number;
        discountAmount?: number;
        gstPercentage?: number;
        gstAmount?: number;
        delivery?: string;
        itemRemarks?: string;
        totalAmount?: number;
      }>;
    },
  ) {
    const rfqFloat = await this.db.findByRfqNumber(rfqNumber);
    if (!rfqFloat) {
      throw new NotFoundException(`RFQ ${rfqNumber} not found`);
    }

    const vendor = rfqFloat.vendors?.find((v: any) => v.id === vendorId);
    if (!vendor) {
      throw new NotFoundException(`Vendor not found for this RFQ`);
    }

    // Check duplicate submission
    const alreadySubmitted = rfqFloat.tces?.some(
      (t: any) => t.vendorId === vendorId || t.vendorName === vendor.vendorName,
    );
    if (alreadySubmitted) {
      throw new BadRequestException(
        'Quotation already submitted for this vendor',
      );
    }

    // Calculate grand total
    const grandTotal = dto.items.reduce(
      (sum, item) =>
        sum + (item.totalAmount ?? item.unitRate * (item.quantity || 1)),
      0,
    );

    // Create TCE record
    const tce = await this.db.createTCE({
      rfqFloatId: rfqFloat.id,
      vendorId: vendor.vendorId || null,
      vendorName: vendor.vendorName,
      submittedAt: new Date(),
      grandTotal,
      deliveryBasis: dto.deliveryBasis || null,
      warranty: dto.warranty || null,
      remarks: dto.remarks || null,
      items: dto.items.map((item) => ({
        rfqFloatItemId: item.rfqFloatItemId || null,
        itemCode: item.itemCode || null,
        itemName: item.itemName,
        quantity: item.quantity || null,
        uom: item.uom || null,
        quotedRate: item.unitRate || null,
        discountPercentage: item.discountPercentage || null,
        discountAmount: item.discountAmount || null,
        gstPercentage: item.gstPercentage || null,
        gstAmount: item.gstAmount || null,
        totalAmount: item.totalAmount || null,
        deliveryBasis: item.delivery || null,
        supplierRemark: item.itemRemarks || null,
      })),
    });

    // Log activity
    await this.db.logActivity({
      rfqFloatId: rfqFloat.id,
      action: 'QUOTATION_RECEIVED',
      description: `Quotation received from ${vendor.vendorName} for RFQ ${rfqFloat.rfqNumber}`,
      metadata: JSON.stringify({ vendorName: vendor.vendorName, grandTotal }),
    });

    // Send confirmation email
    const emailOverrideTo =
      process.env.EMAIL_OVERRIDE_TO || '29x.aditya@gmail.com';
    const subject = `Quotation Received — ${rfqFloat.rfqNumber} from ${vendor.vendorName}`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: #059669; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Quotation Received</h2>
        <p style="margin: 5px 0 0; opacity: 0.9;">RFQ ${rfqFloat.rfqNumber}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p>A new quotation has been submitted for RFQ <strong>${rfqFloat.rfqNumber}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">Vendor:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${vendor.vendorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Grand Total:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #059669;">₹${grandTotal.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Delivery Basis:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${dto.deliveryBasis || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Items Quoted:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${dto.items.length} items</td>
          </tr>
        </table>
        <p style="font-size: 12px; color: #6b7280;">This quotation is now available in the TCE Comparison Sheet.</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        IFH One Procurement System — Automated Notification
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      await this.emailService.send({
        to: emailOverrideTo,
        subject,
        text: `Quotation received from ${vendor.vendorName} for RFQ ${rfqFloat.rfqNumber}. Grand Total: ₹${grandTotal.toLocaleString('en-IN')}`,
        html,
      });
      await this.db.logEmail({
        rfqFloatId: rfqFloat.id,
        emailType: 'QUOTATION_RECEIVED',
        recipientEmail: emailOverrideTo,
        subject,
        body: html,
        deliveryStatus: 'SENT',
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to send quotation confirmation email: ${err.message}`,
      );
    }

    return {
      tceId: tce.id,
      message: 'Quotation submitted successfully',
      grandTotal,
    };
  }
}
