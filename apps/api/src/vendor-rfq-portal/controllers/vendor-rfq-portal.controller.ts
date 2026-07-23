import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { VendorRfqFormService } from '../services/vendor-rfq-form.service';
import { VendorQuotationService } from '../services/vendor-quotation.service';
import { VendorRfqEmailService } from '../services/vendor-rfq-email.service';
import { VendorNegotiationService } from '../services/vendor-negotiation.service';
import {
  GenerateVendorFormsDto,
  SubmitVendorQuotationDto,
  SendNegotiationRoundDto,
  RFQComparisonFilterDto,
  UpdateQuotationStatusDto,
} from '../dto/vendor-rfq-form.dto';

@Controller('vendor-rfq-portal')
export class VendorRfqPortalController {
  constructor(
    private vendorFormService: VendorRfqFormService,
    private quotationService: VendorQuotationService,
    private emailService: VendorRfqEmailService,
    private negotiationService: VendorNegotiationService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // VENDOR PORTAL ENDPOINTS (Public, Token-Based)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get vendor RFQ form using secure token
   * Public endpoint - no auth required, token-based access
   */
  @Get('form/:token')
  @Public()
  async getVendorForm(@Param('token') token: string) {
    return this.vendorFormService.validateTokenAndGetForm(token);
  }

  /**
   * Submit vendor quotation
   * Public endpoint - vendor submits their quotation
   */
  @Post('quotations/submit')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async submitQuotation(
    @Body() dto: SubmitVendorQuotationDto,
    @Request() req: any,
  ) {
    // Get IP address from request
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Check if vendor can submit
    const canSubmit = await this.vendorFormService.canVendorSubmit(
      dto.vendorFormId,
    );
    if (!canSubmit) {
      throw new BadRequestException('Vendor cannot submit at this time');
    }

    // Submit quotation
    const quotation = await this.quotationService.submitQuotation(
      dto,
      ipAddress,
      userAgent,
    );

    // Get vendor form for email
    const vendorForm = await this.vendorFormService.getFormById(
      dto.vendorFormId,
    );

    // Send confirmation email
    await this.emailService.sendSubmissionConfirmationEmail(
      quotation,
      vendorForm,
    );

    // Send internal notification
    await this.emailService.sendProcurementNotification(
      dto.rfqId,
      'QUOTATION_SUBMITTED',
      `Quotation from ${vendorForm.vendorName} submitted for RFQ ${vendorForm.rfqNumber}`,
      quotation.id,
    );

    return {
      success: true,
      quotationId: quotation.id,
      quotationNumber: quotation.quotationNumber,
      message: 'Quotation submitted successfully',
    };
  }

  /**
   * Get vendor quotation (read-only after submission)
   * Public endpoint
   */
  @Get('quotations/:quotationId/view')
  @Public()
  async getQuotationReadOnly(@Param('quotationId') quotationId: string) {
    const quotation = await this.quotationService.getQuotationById(quotationId);
    return {
      success: true,
      data: quotation,
      readonly: true,
    };
  }

  /**
   * Upload quotation attachment (vendor)
   * Public endpoint
   */
  @Post('quotations/:quotationId/attachments')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async uploadAttachment(
    @Param('quotationId') quotationId: string,
    @Body() body: any,
  ) {
    const attachment = await this.quotationService.uploadQuotationAttachment(
      quotationId,
      body.lineItemId || null,
      body.fileName,
      body.fileType,
      body.fileSize,
      body.fileUrl,
      body.documentType,
    );

    return {
      success: true,
      attachmentId: attachment.id,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROCUREMENT TEAM ENDPOINTS (Protected)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Generate vendor RFQ forms (after RFQ creation)
   * Protected - Procurement Manager only
   */
  @Post('forms/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROCUREMENT_MANAGER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async generateVendorForms(
    @Body() dto: GenerateVendorFormsDto,
    @Request() req: any,
  ) {
    // Get RFQ data
    const rfq = await this.vendorFormService['prisma'].rFQ.findUnique({
      where: { id: dto.rfqId },
      include: { createdBy: true, items: true },
    });

    if (!rfq) {
      throw new NotFoundException('RFQ not found');
    }

    // Generate forms
    const forms = await this.vendorFormService.generateVendorForms(
      dto.rfqId,
      dto.vendors,
      rfq,
    );

    // Send invitation emails
    await this.emailService.sendRFQInvitationEmails(forms);

    // Log activity
    await this.vendorFormService['prisma'].rFQActivityLog.create({
      data: {
        rfqId: dto.rfqId,
        activityType: 'FORM_GENERATED',
        description: `${forms.length} vendor forms generated and emails sent`,
        performedById: req.user?.sub,
      },
    });

    return {
      success: true,
      formsCreated: forms.length,
      forms: forms.map((f) => ({
        formId: f.id,
        vendorName: f.vendorName,
        vendorEmail: f.vendorEmail,
        formStatus: f.formStatus,
      })),
    };
  }

  /**
   * Get all responses for an RFQ
   * Protected
   */
  @Get('rfqs/:rfqId/responses')
  @UseGuards(JwtAuthGuard)
  async getRFQResponses(@Param('rfqId') rfqId: string) {
    const summary = await this.vendorFormService.getResponseSummary(rfqId);
    return {
      success: true,
      data: summary,
    };
  }

  /**
   * Get quotations for an RFQ (for comparison dashboard)
   * Protected
   */
  @Get('rfqs/:rfqId/quotations')
  @UseGuards(JwtAuthGuard)
  async getRFQQuotations(@Param('rfqId') rfqId: string) {
    const quotations = await this.quotationService.getQuotationsForRFQ(rfqId);
    return {
      success: true,
      count: quotations.length,
      data: quotations,
    };
  }

  /**
   * Get quotation comparison data
   * Protected
   */
  @Post('quotations/compare')
  @UseGuards(JwtAuthGuard)
  async getQuotationComparison(@Body() dto: RFQComparisonFilterDto) {
    const comparisonData = await this.quotationService.getQuotationComparison(
      dto.rfqId,
    );

    // Filter if specific quotations requested
    if (dto.quotationIds && dto.quotationIds.length > 0) {
      comparisonData.quotations = comparisonData.quotations.filter((q: any) =>
        dto.quotationIds?.includes(q.quotationId),
      );
    }

    return {
      success: true,
      data: comparisonData,
    };
  }

  /**
   * Update quotation status
   * Protected
   */
  @Patch('quotations/:quotationId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROCUREMENT_MANAGER', 'ADMIN')
  async updateQuotationStatus(
    @Param('quotationId') quotationId: string,
    @Body() dto: UpdateQuotationStatusDto,
  ) {
    const quotation = await this.quotationService.updateQuotationStatus(
      quotationId,
      dto,
    );
    return {
      success: true,
      data: quotation,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // NEGOTIATION ENDPOINTS (Protected)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Send counter-offer to vendor
   * Protected - Procurement Manager only
   */
  @Post('negotiations/counter-offer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROCUREMENT_MANAGER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async sendCounterOffer(
    @Body() dto: SendNegotiationRoundDto,
    @Request() req: any,
  ) {
    const negotiationRound =
      await this.negotiationService.sendNegotiationRound(dto);

    // Get quotation and vendor form for email
    const quotation = await this.quotationService.getQuotationById(
      dto.quotationId,
    );
    const vendorForm = await this.vendorFormService.getFormById(
      quotation.vendorFormId,
    );

    // Send counter-offer email
    await this.emailService.sendCounterOfferEmail(
      negotiationRound,
      vendorForm,
      quotation,
    );

    return {
      success: true,
      roundId: negotiationRound.id,
      roundNumber: negotiationRound.roundNumber,
    };
  }

  /**
   * Get negotiation history
   * Protected
   */
  @Get('negotiations/:quotationId/history')
  @UseGuards(JwtAuthGuard)
  async getNegotiationHistory(@Param('quotationId') quotationId: string) {
    const history =
      await this.negotiationService.getNegotiationHistory(quotationId);
    return {
      success: true,
      data: history,
    };
  }

  /**
   * Get negotiation dashboard
   * Protected
   */
  @Get('rfqs/:rfqId/negotiations')
  @UseGuards(JwtAuthGuard)
  async getNegotiationDashboard(@Param('rfqId') rfqId: string) {
    const dashboard =
      await this.negotiationService.getNegotiationDashboard(rfqId);
    return {
      success: true,
      data: dashboard,
    };
  }

  /**
   * Shortlist vendor
   * Protected
   */
  @Post('quotations/:quotationId/shortlist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROCUREMENT_MANAGER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async shortlistVendor(
    @Param('quotationId') quotationId: string,
    @Body() body: { remarks?: string },
  ) {
    const quotation = await this.negotiationService.shortlistVendor(
      quotationId,
      body.remarks,
    );
    return {
      success: true,
      data: quotation,
    };
  }

  /**
   * Select vendor (final selection)
   * Protected
   */
  @Post('quotations/:quotationId/select')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROCUREMENT_MANAGER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async selectVendor(
    @Param('quotationId') quotationId: string,
    @Body() body: { remarks?: string },
    @Request() req: any,
  ) {
    const quotation = await this.negotiationService.selectVendor(
      quotationId,
      body.remarks,
    );

    // Get vendor form for email
    const vendorForm = await this.vendorFormService.getFormById(
      quotation.vendorFormId,
    );

    // Send selection email
    await this.emailService.sendVendorSelectionEmail(vendorForm, quotation);

    return {
      success: true,
      data: quotation,
    };
  }

  /**
   * Reject vendor
   * Protected
   */
  @Post('quotations/:quotationId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROCUREMENT_MANAGER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async rejectVendor(
    @Param('quotationId') quotationId: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    const quotation = await this.negotiationService.rejectVendor(
      quotationId,
      body.reason,
    );

    // Get vendor form for email
    const vendorForm = await this.vendorFormService.getFormById(
      quotation.vendorFormId,
    );

    // Send rejection email
    await this.emailService.sendVendorRejectionEmail(
      vendorForm,
      quotation,
      body.reason,
    );

    return {
      success: true,
      data: quotation,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AUDIT & MONITORING ENDPOINTS (Protected)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get email logs for RFQ
   * Protected - Admin/Manager only
   */
  @Get('rfqs/:rfqId/email-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PROCUREMENT_MANAGER', 'ADMIN')
  async getEmailLogs(@Param('rfqId') rfqId: string) {
    const logs = await this.emailService.getEmailLogs(rfqId);
    const summary = await this.emailService.getDeliveryStatusSummary(rfqId);
    return {
      success: true,
      summary,
      logs,
    };
  }

  /**
   * Verify round-trip data integrity
   * Protected - Admin only
   */
  @Get('quotations/:quotationId/integrity-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async verifyDataIntegrity(@Param('quotationId') quotationId: string) {
    const result =
      await this.quotationService.verifyRoundTripIntegrity(quotationId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Health check
   * Public endpoint
   */
  @Get('health')
  @Public()
  async health() {
    return {
      status: 'ok',
      service: 'vendor-rfq-portal',
      version: '2.9.0',
    };
  }
}
