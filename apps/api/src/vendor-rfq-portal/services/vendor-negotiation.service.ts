import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendNegotiationRoundDto } from '../dto/vendor-rfq-form.dto';
import dayjs from 'dayjs';

@Injectable()
export class VendorNegotiationService {
  private readonly logger = new Logger(VendorNegotiationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Send negotiation counter-offer to vendor
   */
  async sendNegotiationRound(dto: SendNegotiationRoundDto): Promise<any> {
    this.logger.log(
      `Sending negotiation round for quotation ${dto.quotationId}`,
    );

    // Validate quotation exists
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: dto.quotationId },
      include: { vendorForm: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    // Get previous round count
    const previousRounds = await this.prisma.negotiationRound.findMany({
      where: { quotationId: dto.quotationId },
    });

    const roundNumber = previousRounds.length + 1;

    // Create negotiation round
    const round = await this.prisma.negotiationRound.create({
      data: {
        quotationId: dto.quotationId,
        roundNumber,
        requestedAdjustments: dto.requestedAdjustments,
        counterOfferAmount: dto.counterOfferAmount,
        counterOfferTerms: dto.counterOfferTerms,
        sentAt: new Date(),
        vendorResponseStatus: 'PENDING',
      },
    });

    // Update quotation status
    await this.prisma.vendorQuotation.update({
      where: { id: dto.quotationId },
      data: {
        quotationStatus: 'UNDER_NEGOTIATION',
      },
    });

    // Update vendor form status
    await this.prisma.vendorRFQForm.update({
      where: { id: quotation.vendorFormId },
      data: {
        formStatus: 'UNDER_NEGOTIATION',
      },
    });

    // Log activity
    await this.logActivity(
      quotation.rfqId,
      'NEGOTIATION_INITIATED',
      `Counter-offer sent - Round ${roundNumber}`,
      undefined,
      quotation.id,
    );

    this.logger.log(`Negotiation round ${roundNumber} created for quotation`);

    return round;
  }

  /**
   * Vendor accepts counter-offer
   */
  async acceptCounterOffer(roundId: string): Promise<any> {
    const round = await this.prisma.negotiationRound.findUnique({
      where: { id: roundId },
      include: { quotation: true },
    });

    if (!round) {
      throw new NotFoundException('Negotiation round not found');
    }

    // Update round
    const updated = await this.prisma.negotiationRound.update({
      where: { id: roundId },
      data: {
        vendorResponseStatus: 'ACCEPTED',
        vendorResponseAt: new Date(),
        vendorResponse: 'Vendor accepted the counter-offer',
      },
    });

    // Update quotation status
    await this.prisma.vendorQuotation.update({
      where: { id: round.quotationId },
      data: {
        quotationStatus: 'NEGOTIATION_COMPLETE',
        grandTotalAmount: round.counterOfferAmount,
      },
    });

    // Log activity
    await this.logActivity(
      round.quotation.rfqId,
      'COUNTER_OFFER_SENT',
      `Vendor accepted counter-offer - Round ${round.roundNumber}`,
      undefined,
      round.quotationId,
    );

    return updated;
  }

  /**
   * Vendor rejects counter-offer
   */
  async rejectCounterOffer(roundId: string, reason?: string): Promise<any> {
    const round = await this.prisma.negotiationRound.findUnique({
      where: { id: roundId },
      include: { quotation: true },
    });

    if (!round) {
      throw new NotFoundException('Negotiation round not found');
    }

    // Update round
    const updated = await this.prisma.negotiationRound.update({
      where: { id: roundId },
      data: {
        vendorResponseStatus: 'REJECTED',
        vendorResponseAt: new Date(),
        vendorResponse: reason || 'Vendor rejected the counter-offer',
      },
    });

    // Log activity
    await this.logActivity(
      round.quotation.rfqId,
      'NEGOTIATION_INITIATED',
      `Vendor rejected counter-offer - Round ${round.roundNumber}`,
      undefined,
      round.quotationId,
    );

    return updated;
  }

  /**
   * Vendor submits revised quotation
   */
  async submitRevisedQuotation(
    roundId: string,
    revisedData: any,
  ): Promise<any> {
    const round = await this.prisma.negotiationRound.findUnique({
      where: { id: roundId },
      include: {
        quotation: {
          include: { lineItems: true },
        },
      },
    });

    if (!round) {
      throw new NotFoundException('Negotiation round not found');
    }

    // Update quotation with revised data
    const updated = await this.prisma.vendorQuotation.update({
      where: { id: round.quotationId },
      data: {
        ...revisedData,
        quotationStatus: 'UNDER_REVIEW',
      },
    });

    // Update round
    await this.prisma.negotiationRound.update({
      where: { id: roundId },
      data: {
        vendorResponseStatus: 'REVISED',
        vendorResponseAt: new Date(),
      },
    });

    // Log activity
    await this.logActivity(
      round.quotation.rfqId,
      'REVISED_QUOTATION_SUBMITTED',
      `Revised quotation submitted - Round ${round.roundNumber}`,
      undefined,
      round.quotationId,
    );

    return updated;
  }

  /**
   * Close negotiation
   */
  async closeNegotiation(quotationId: string, remarks?: string): Promise<any> {
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: quotationId },
      include: { negotiationRounds: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    // Update quotation
    const updated = await this.prisma.vendorQuotation.update({
      where: { id: quotationId },
      data: {
        quotationStatus: 'NEGOTIATION_COMPLETE',
        quotationRemarks: remarks,
      },
    });

    // Close all open rounds
    await this.prisma.negotiationRound.updateMany({
      where: {
        quotationId,
        vendorResponseStatus: 'PENDING',
      },
      data: {
        vendorResponseStatus: 'CLOSED',
      },
    });

    // Log activity
    await this.logActivity(
      quotation.rfqId,
      'NEGOTIATION_CLOSED',
      'Negotiation closed by procurement team',
      undefined,
      quotationId,
    );

    return updated;
  }

  /**
   * Get negotiation history
   */
  async getNegotiationHistory(quotationId: string): Promise<any> {
    const rounds = await this.prisma.negotiationRound.findMany({
      where: { quotationId },
      orderBy: { roundNumber: 'asc' },
    });

    return {
      quotationId,
      totalRounds: rounds.length,
      rounds,
    };
  }

  /**
   * Shortlist vendor
   */
  async shortlistVendor(quotationId: string, remarks?: string): Promise<any> {
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const updated = await this.prisma.vendorQuotation.update({
      where: { id: quotationId },
      data: {
        quotationStatus: 'SHORTLISTED',
        quotationRemarks: remarks,
      },
    });

    // Log activity
    await this.logActivity(
      quotation.rfqId,
      'VENDOR_SELECTED',
      'Vendor shortlisted for further evaluation',
      undefined,
      quotationId,
    );

    return updated;
  }

  /**
   * Select vendor (final selection)
   */
  async selectVendor(quotationId: string, remarks?: string): Promise<any> {
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const updated = await this.prisma.vendorQuotation.update({
      where: { id: quotationId },
      data: {
        quotationStatus: 'SELECTED',
        quotationRemarks: remarks,
      },
    });

    // Update vendor form
    await this.prisma.vendorRFQForm.update({
      where: { id: quotation.vendorFormId },
      data: {
        formStatus: 'ACCEPTED',
      },
    });

    // Log activity
    await this.logActivity(
      quotation.rfqId,
      'VENDOR_SELECTED',
      'Vendor selected for PO creation',
      undefined,
      quotationId,
    );

    return updated;
  }

  /**
   * Reject vendor quotation
   */
  async rejectVendor(quotationId: string, reason?: string): Promise<any> {
    const quotation = await this.prisma.vendorQuotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    const updated = await this.prisma.vendorQuotation.update({
      where: { id: quotationId },
      data: {
        quotationStatus: 'REJECTED',
        quotationRemarks: reason,
      },
    });

    // Update vendor form
    await this.prisma.vendorRFQForm.update({
      where: { id: quotation.vendorFormId },
      data: {
        formStatus: 'REJECTED',
      },
    });

    // Log activity
    await this.logActivity(
      quotation.rfqId,
      'VENDOR_SELECTED',
      `Vendor rejected - Reason: ${reason || 'Not specified'}`,
      undefined,
      quotationId,
    );

    return updated;
  }

  /**
   * Get negotiation dashboard data
   */
  async getNegotiationDashboard(rfqId: string): Promise<any> {
    const quotations = await this.prisma.vendorQuotation.findMany({
      where: { rfqId },
      include: {
        vendorForm: {
          select: {
            vendorName: true,
            vendorEmail: true,
          },
        },
        negotiationRounds: {
          orderBy: { roundNumber: 'desc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      rfqId,
      totalQuotations: quotations.length,
      underNegotiation: quotations.filter(
        (q) => q.quotationStatus === 'UNDER_NEGOTIATION',
      ).length,
      negotiationCompleted: quotations.filter(
        (q) => q.quotationStatus === 'NEGOTIATION_COMPLETE',
      ).length,
      shortlisted: quotations.filter((q) => q.quotationStatus === 'SHORTLISTED')
        .length,
      selected: quotations.filter((q) => q.quotationStatus === 'SELECTED')
        .length,
      rejected: quotations.filter((q) => q.quotationStatus === 'REJECTED')
        .length,
      quotations: quotations.map((q) => ({
        quotationId: q.id,
        vendorName: q.vendorForm.vendorName,
        quotedAmount: q.grandTotalAmount,
        status: q.quotationStatus,
        negotiationRounds: q.negotiationRounds.length,
        lastUpdated: q.updatedAt,
        remarks: q.quotationRemarks,
      })),
    };
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
}
