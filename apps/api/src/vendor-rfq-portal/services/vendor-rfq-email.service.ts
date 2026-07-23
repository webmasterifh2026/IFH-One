import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class VendorRfqEmailService {
  private readonly logger = new Logger(VendorRfqEmailService.name);
  private readonly adminEmail =
    process.env.ADMIN_EMAIL || '29x.aditya@gmail.com';
  private readonly senderName =
    process.env.SENDER_NAME || 'IFH One Procurement';

  constructor(private prisma: PrismaService) {}

  /**
   * Send RFQ invitation emails to vendors
   */
  async sendRFQInvitationEmails(vendorForms: any[]): Promise<any[]> {
    const emailLogs = [];

    for (const form of vendorForms) {
      try {
        const vendorFormUrl = this._buildVendorFormUrl(form.secureToken);
        const subject = `Request for Quotation - ${form.rfqNumber}`;
        const body = this._buildInvitationEmailBody(form, vendorFormUrl);

        // Log email event
        const emailLog = await this.prisma.rFQEmailLog.create({
          data: {
            rfqId: form.rfqId,
            vendorFormId: form.id,
            emailType: 'RFQ_INVITATION',
            recipientEmail: form.vendorEmail,
            subject,
            body,
            deliveryStatus: 'SENT',
          },
        });

        // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        // For now, just log
        this.logger.log(
          `[EMAIL] Invitation sent to ${form.vendorEmail} for RFQ ${form.rfqNumber}`,
        );

        // Update form status
        await this.prisma.vendorRFQForm.update({
          where: { id: form.id },
          data: { formStatus: 'EMAIL_SENT' },
        });

        emailLogs.push(emailLog);
      } catch (error) {
        this.logger.error(
          `Failed to send invitation email to ${form.vendorEmail}`,
          error,
        );

        // Log failure
        await this.prisma.rFQEmailLog.create({
          data: {
            rfqId: form.rfqId,
            vendorFormId: form.id,
            emailType: 'RFQ_INVITATION',
            recipientEmail: form.vendorEmail,
            subject: `Request for Quotation - ${form.rfqNumber}`,
            deliveryStatus: 'FAILED',
            bounceReason:
              error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    return emailLogs;
  }

  /**
   * Send submission confirmation email to vendor
   */
  async sendSubmissionConfirmationEmail(
    quotation: any,
    vendorForm: any,
  ): Promise<any> {
    try {
      const subject = `Quotation Submission Confirmation - ${quotation.quotationNumber}`;
      const body = this._buildSubmissionConfirmationBody(quotation, vendorForm);

      const emailLog = await this.prisma.rFQEmailLog.create({
        data: {
          rfqId: quotation.rfqId,
          vendorFormId: quotation.vendorFormId,
          emailType: 'SUBMISSION_CONFIRMATION',
          recipientEmail: vendorForm.vendorEmail,
          subject,
          body,
          deliveryStatus: 'SENT',
        },
      });

      // TODO: Send actual email
      this.logger.log(
        `[EMAIL] Submission confirmation sent to ${vendorForm.vendorEmail}`,
      );

      return emailLog;
    } catch (error) {
      this.logger.error(
        `Failed to send submission confirmation email to vendor`,
        error,
      );
      throw error;
    }
  }

  /**
   * Send counter-offer/negotiation email to vendor
   */
  async sendCounterOfferEmail(
    negotiationRound: any,
    vendorForm: any,
    quotation: any,
  ): Promise<any> {
    try {
      const subject = `Counter-Offer for RFQ - ${quotation.rfqNumber}`;
      const body = this._buildCounterOfferEmailBody(
        negotiationRound,
        vendorForm,
        quotation,
      );

      const emailLog = await this.prisma.rFQEmailLog.create({
        data: {
          rfqId: quotation.rfqId,
          vendorFormId: vendorForm.id,
          emailType: 'COUNTER_OFFER',
          recipientEmail: vendorForm.vendorEmail,
          subject,
          body,
          deliveryStatus: 'SENT',
        },
      });

      // TODO: Send actual email
      this.logger.log(
        `[EMAIL] Counter-offer sent to ${vendorForm.vendorEmail} for round ${negotiationRound.roundNumber}`,
      );

      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send counter-offer email to vendor`, error);
      throw error;
    }
  }

  /**
   * Send internal notification to procurement team
   */
  async sendProcurementNotification(
    rfqId: string,
    notificationType: string,
    message: string,
    quotationId?: string,
  ): Promise<any> {
    try {
      const subject = `[IFH One] ${notificationType} - Notification`;
      const body = this._buildProcurementNotificationBody(
        notificationType,
        message,
      );

      const emailLog = await this.prisma.rFQEmailLog.create({
        data: {
          rfqId,
          emailType: 'PROCUREMENT_NOTIFICATION',
          recipientEmail: this.adminEmail,
          subject,
          body,
          deliveryStatus: 'SENT',
        },
      });

      // TODO: Send actual email
      this.logger.log(
        `[EMAIL] Procurement notification sent: ${notificationType}`,
      );

      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send procurement notification`, error);
      throw error;
    }
  }

  /**
   * Send vendor selection notification
   */
  async sendVendorSelectionEmail(
    vendorForm: any,
    quotation: any,
    message?: string,
  ): Promise<any> {
    try {
      const subject = `Congratulations! You have been selected for RFQ - ${quotation.rfqNumber}`;
      const body = this._buildVendorSelectionBody(
        vendorForm,
        quotation,
        message,
      );

      const emailLog = await this.prisma.rFQEmailLog.create({
        data: {
          rfqId: quotation.rfqId,
          vendorFormId: vendorForm.id,
          emailType: 'VENDOR_SELECTED',
          recipientEmail: vendorForm.vendorEmail,
          subject,
          body,
          deliveryStatus: 'SENT',
        },
      });

      // TODO: Send actual email
      this.logger.log(
        `[EMAIL] Selection notification sent to ${vendorForm.vendorEmail}`,
      );

      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send vendor selection email`, error);
      throw error;
    }
  }

  /**
   * Send vendor rejection notification
   */
  async sendVendorRejectionEmail(
    vendorForm: any,
    quotation: any,
    reason?: string,
  ): Promise<any> {
    try {
      const subject = `Regarding Your Quotation for RFQ - ${quotation.rfqNumber}`;
      const body = this._buildVendorRejectionBody(
        vendorForm,
        quotation,
        reason,
      );

      const emailLog = await this.prisma.rFQEmailLog.create({
        data: {
          rfqId: quotation.rfqId,
          vendorFormId: vendorForm.id,
          emailType: 'VENDOR_REJECTED',
          recipientEmail: vendorForm.vendorEmail,
          subject,
          body,
          deliveryStatus: 'SENT',
        },
      });

      // TODO: Send actual email
      this.logger.log(
        `[EMAIL] Rejection notification sent to ${vendorForm.vendorEmail}`,
      );

      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send vendor rejection email`, error);
      throw error;
    }
  }

  // ─── Email Body Templates ──────────────────────────────────────────────

  private _buildVendorFormUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/vendor-rfq-portal/${token}`;
  }

  private _buildInvitationEmailBody(form: any, formUrl: string): string {
    return `
Dear ${form.contactPerson || form.vendorName},

You have been invited to participate in the following Request for Quotation (RFQ).

RFQ Details:
- RFQ Number: ${form.rfqNumber}
- RFQ Date: ${dayjs(form.rfqDate).format('DD MMM YYYY')}
- Submission Deadline: ${dayjs(form.submissionDeadline).format('DD MMM YYYY, hh:mm A')}
- Expected Delivery: ${dayjs(form.expectedDeliveryDate).format('DD MMM YYYY')}
- Delivery Location: ${form.deliveryLocation || 'N/A'}
- General Remarks: ${form.generalRemarks || 'N/A'}

Please submit your quotation using the secure link below:
${formUrl}

Please note:
- You can only submit once. After submission, the form becomes read-only.
- All information you provide must be accurate and complete.
- Your submission is secure and locked until the deadline.

If you have any questions or need clarification, please contact us at procurement@ifhone.com

Thank you for your participation.

Best regards,
${this.senderName}
    `;
  }

  private _buildSubmissionConfirmationBody(
    quotation: any,
    vendorForm: any,
  ): string {
    return `
Dear ${vendorForm.contactPerson || vendorForm.vendorName},

Thank you for submitting your quotation for RFQ ${quotation.rfqNumber}.

Submission Details:
- Quotation Number: ${quotation.quotationNumber}
- Submitted On: ${dayjs(quotation.submittedAt).format('DD MMM YYYY, hh:mm A')}
- Quoted Amount: ${quotation.grandTotalAmount} ${quotation.grandTotalCurrency}
- Total Line Items: ${quotation.lineItems?.length || 0}

Your quotation has been successfully recorded and locked for submission. You can view your submitted quotation using your access link, but no further edits are possible.

The procurement team will review your quotation and contact you if any clarifications are needed.

Thank you for your quotation.

Best regards,
${this.senderName}
    `;
  }

  private _buildCounterOfferEmailBody(
    negotiationRound: any,
    vendorForm: any,
    quotation: any,
  ): string {
    return `
Dear ${vendorForm.contactPerson || vendorForm.vendorName},

We have reviewed your quotation for RFQ ${quotation.rfqNumber} and would like to discuss some adjustments.

Counter-Offer Round: ${negotiationRound.roundNumber}

Requested Adjustments:
${negotiationRound.requestedAdjustments || 'Please refer to the attached details.'}

Proposed Counter-Offer Amount: ${negotiationRound.counterOfferAmount || 'To be discussed'} ${quotation.grandTotalCurrency}

Please review and respond to this counter-offer. You can submit a revised quotation or accept the proposed terms.

We look forward to your response.

Best regards,
${this.senderName}
    `;
  }

  private _buildProcurementNotificationBody(
    notificationType: string,
    message: string,
  ): string {
    return `
Procurement Team,

Alert: ${notificationType}

${message}

Please log in to the procurement system for more details and take necessary action.

Best regards,
${this.senderName}
    `;
  }

  private _buildVendorSelectionBody(
    vendorForm: any,
    quotation: any,
    message?: string,
  ): string {
    return `
Dear ${vendorForm.contactPerson || vendorForm.vendorName},

Congratulations! Your quotation for RFQ ${quotation.rfqNumber} has been accepted and you have been selected as the preferred vendor.

Selection Details:
- RFQ Number: ${quotation.rfqNumber}
- Quotation Number: ${quotation.quotationNumber}
- Quoted Amount: ${quotation.grandTotalAmount} ${quotation.grandTotalCurrency}
- Selection Date: ${dayjs().format('DD MMM YYYY')}

${message ? `Additional Comments: ${message}` : ''}

Next Steps:
- We will be in touch shortly to finalize the purchase order and delivery schedule.
- Please ensure you are prepared to deliver as per the terms agreed in your quotation.

Thank you for being part of our procurement process. We look forward to working with you.

Best regards,
${this.senderName}
    `;
  }

  private _buildVendorRejectionBody(
    vendorForm: any,
    quotation: any,
    reason?: string,
  ): string {
    return `
Dear ${vendorForm.contactPerson || vendorForm.vendorName},

Thank you for submitting your quotation for RFQ ${quotation.rfqNumber}.

After careful evaluation, we regret to inform you that your quotation has not been selected at this time.

${reason ? `Reason: ${reason}` : 'Your quotation did not meet our current requirements.'}

We appreciate your effort and attention to detail. Your quotation is valuable feedback for us, and we hope you will participate in future opportunities with us.

If you would like to discuss this decision or have any questions, please feel free to contact us.

Thank you.

Best regards,
${this.senderName}
    `;
  }

  /**
   * Get email logs for an RFQ
   */
  async getEmailLogs(rfqId: string): Promise<any[]> {
    return this.prisma.rFQEmailLog.findMany({
      where: { rfqId },
      orderBy: { sentAt: 'desc' },
    });
  }

  /**
   * Get delivery status summary
   */
  async getDeliveryStatusSummary(rfqId: string): Promise<any> {
    const logs = await this.getEmailLogs(rfqId);

    return {
      total: logs.length,
      sent: logs.filter((l) => l.deliveryStatus === 'SENT').length,
      delivered: logs.filter((l) => l.deliveryStatus === 'DELIVERED').length,
      bounced: logs.filter((l) => l.deliveryStatus === 'BOUNCED').length,
      failed: logs.filter((l) => l.deliveryStatus === 'FAILED').length,
    };
  }
}
