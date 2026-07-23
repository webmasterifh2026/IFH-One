import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationPayload {
  procurementId: string;
  referenceNo: string;
  projectName?: string;
  itemDescription?: string;
  stageName: string;
  stageNumber: number;
  actorName: string;
  timestamp: string;
  actionTaken: string; // 'Approve', 'Hold', 'Reject', 'Clarification', 'Create', 'Complete', 'Transition'
  remarks?: string;
  creatorEmail?: string;
  items?: any[];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /** Fixed CC recipients loaded from NOTIFICATION_CC_EMAILS env var (comma-separated). */
  private readonly fixedRecipients: string[];

  /**
   * EMAIL GATE CONFIGURATION (v2.9.0)
   * ===================================
   * EMAIL_ENABLED: Set to 'true' to enable email sending. Default: 'false'.
   *   Until production is ready, keep this disabled — all email triggers are
   *   suppressed regardless of workflow actions.
   *
   * EMAIL_OVERRIDE_TO: Override ALL recipient emails to this address for testing.
   *   Default: '29x.aditya@gmail.com'. In production, set to empty to send to
   *   real recipients.
   *
   * EMAIL_STAGE_1_APPROVE_ENABLED: Set to 'true' to send emails when Indent
   *   Verification (stage 1) is Approved. Default: 'false' — only REJECT and
   *   HOLD trigger emails at stage 1.
   */
  private readonly emailEnabled: boolean;
  private readonly emailOverrideTo: string;
  private readonly stage1ApproveEnabled: boolean;

  constructor(
    private emailService: EmailService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Master email gate — ENABLED for production
    this.emailEnabled =
      this.configService.get<string>('EMAIL_ENABLED')?.toLowerCase() === 'true';

    // Test override — all emails go to this single address until production
    this.emailOverrideTo =
      this.configService.get<string>('EMAIL_OVERRIDE_TO') ??
      '29x.aditya@gmail.com';

    // Stage 1 (Indent Verification) APPROVE emails — enabled for full workflow
    const stage1ApproveConfig = this.configService.get<string>(
      'EMAIL_STAGE_1_APPROVE_ENABLED',
    );
    this.stage1ApproveEnabled = stage1ApproveConfig
      ? stage1ApproveConfig.toLowerCase() === 'true'
      : true;

    // Read CC list from environment — never hardcode email addresses in source.
    // Example: NOTIFICATION_CC_EMAILS=alice@company.com,bob@company.com
    const raw = this.configService.get<string>('NOTIFICATION_CC_EMAILS') ?? '';
    this.fixedRecipients = raw
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (this.fixedRecipients.length > 0) {
      this.logger.log(
        `Notification CC list loaded: ${this.fixedRecipients.length} recipient(s)`,
      );
    }

    this.logger.log(
      `Email system initialized: enabled=${this.emailEnabled}, overrideTo=${this.emailOverrideTo}, stage1Approve=${this.stage1ApproveEnabled}`,
    );
  }

  @OnEvent('procurement.notification')
  async handleProcurementNotification(payload: NotificationPayload) {
    try {
      // ── EMAIL GATE: Master switch — all emails disabled by default ────────
      if (!this.emailEnabled) {
        this.logger.debug(
          `Email gate closed: skipping notification for ${payload.referenceNo} (action=${payload.actionTaken}, stage=${payload.stageNumber})`,
        );
        return;
      }

      // ── STAGE 1 (Indent Verification) RULES ───────────────────────────────
      // Only send emails for REJECT and HOLD at stage 1. APPROVE is suppressed
      // unless explicitly enabled via EMAIL_STAGE_1_APPROVE_ENABLED.
      if (payload.stageNumber === 1) {
        if (payload.actionTaken === 'Approve' && !this.stage1ApproveEnabled) {
          this.logger.debug(
            `Stage 1 APPROVE email suppressed for ${payload.referenceNo} (enable via EMAIL_STAGE_1_APPROVE_ENABLED)`,
          );
          return;
        }
      }

      this.logger.log(`Processing notification for ${payload.referenceNo}`);

      // 1. Build recipient list
      const recipientsSet = new Set<string>(this.fixedRecipients);
      if (payload.creatorEmail) recipientsSet.add(payload.creatorEmail);
      let to = Array.from(recipientsSet)
        .filter((email) => email && email.includes('@'))
        .join(', ');

      // 2. Override all recipients to test address if configured
      if (this.emailOverrideTo) {
        to = this.emailOverrideTo;
        this.logger.debug(
          `Email override active: all notifications for ${payload.referenceNo} sent to ${this.emailOverrideTo}`,
        );
      }

      // -- STAGE 1 ITEM-WISE NOTIFICATIONS --
      if (
        payload.stageNumber === 1 &&
        payload.items &&
        payload.items.length > 0
      ) {
        for (const item of payload.items) {
          if (item.action === 'REJECT') {
            await this.emailService.sendRejectionEmail({
              to,
              indentNumber:
                item.bbuCode || `${payload.referenceNo}-${item.id.slice(-4)}`,
              projectName: payload.projectName,
              itemDescription: item.itemName,
              stage: payload.stageName,
              rejectedBy: payload.actorName,
              rejectedAt: payload.timestamp,
              reason: item.remarks || 'No reason provided',
              status: 'Rejected',
            });
          } else if (item.action === 'HOLD') {
            await this.emailService.sendHoldEmail({
              to,
              indentNumber:
                item.bbuCode || `${payload.referenceNo}-${item.id.slice(-4)}`,
              projectName: payload.projectName,
              itemDescription: item.itemName,
              stage: payload.stageName,
              heldBy: payload.actorName,
              heldAt: payload.timestamp,
              reason: item.remarks || 'No reason provided',
              status: 'Hold',
            });
          }
        }
        // For Stage 1, we only send item-wise emails. Do not send the generic bulk email.
        return;
      }

      // -- STAGE 2 ITEM-WISE NOTIFICATIONS --
      if (
        payload.stageNumber === 2 &&
        payload.items &&
        payload.items.length > 0
      ) {
        for (const item of payload.items) {
          if (item.action === 'AVAILABLE') {
            await this.emailService.sendStoreCheckAvailableEmail({
              to: '29x.aditya@gmail.com', // User requested exact email
              indentNumber:
                item.bbuCode || `${payload.referenceNo}-${item.id.slice(-4)}`,
              projectName: payload.projectName,
              itemDescription: item.itemName,
              stage: payload.stageName,
              fulfilledBy: payload.actorName,
              fulfilledAt: payload.timestamp,
              remarks: item.remarks || 'Fully available in store',
              status: 'Available',
            });
          }
        }
        // For Stage 2, skip generic emails to avoid spamming other recipients
        return;
      }

      // 3. Generate subject
      let eventType = 'Stage Updated';
      let subject = `[IFH One] Indent ${payload.referenceNo} - Stage Updated`;

      if (payload.actionTaken === 'Approve') {
        eventType = 'Approved';
        subject = `[IFH One] Indent ${payload.referenceNo} Approved`;
      } else if (payload.actionTaken === 'Reject') {
        eventType = 'Rejected';
        subject = `[IFH One] Indent ${payload.referenceNo} Rejected`;
      } else if (payload.actionTaken === 'Hold') {
        eventType = 'Put On Hold';
        subject = `[IFH One] Indent ${payload.referenceNo} Put On Hold`;
      } else if (payload.actionTaken === 'Clarification') {
        eventType = 'Clarification Requested';
        subject = `[IFH One] Indent ${payload.referenceNo} Clarification Requested`;
      } else if (
        payload.actionTaken === 'Complete' ||
        payload.stageNumber === 23
      ) {
        eventType = 'Completed';
        subject = `[IFH One] Indent ${payload.referenceNo} Successfully Completed`;
      } else if (payload.actionTaken === 'Create') {
        eventType = 'Created';
        subject = `[IFH One] Indent ${payload.referenceNo} Created`;
      } else {
        subject = `[IFH One] Indent ${payload.referenceNo} moved to ${payload.stageName}`;
      }

      // 4. Build HTML
      const html = this.buildHtml(payload, eventType);

      // 5. Attachments — surfaced as links in the email body (files live in
      // external storage; we never fetch remote bytes into the mail process).
      const attachments = await this.prisma.procurementAttachment.findMany({
        where: { procurementId: payload.procurementId },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      // 6. Send Email
      const result = await this.emailService.send({
        to,
        subject,
        text: `Indent ${payload.referenceNo} has been ${eventType}.`,
        html,
        attachmentLinks: attachments.map((a) => ({
          fileName: a.fileName,
          fileUrl: a.fileUrl,
        })),
      });

      // 7. Log to DB
      await this.prisma.emailLog.create({
        data: {
          procurementId: payload.procurementId,
          workflowStage: payload.stageName,
          event: payload.actionTaken,
          subject,
          recipients: to,
          deliveryStatus: result.success ? 'SUCCESS' : 'FAILED',
          errorMessage: result.error || null,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to process notification for ${payload.referenceNo}: ${error.message}`,
      );
    }
  }

  // ─── Gate Entry Email Handler ───────────────────────────────────────────────
  @OnEvent('gate-entry.notification')
  async handleGateEntryNotification(payload: {
    procurementId: string;
    referenceNo: string;
    entryNumber: string;
    stage: string;
    action: string;
    recipientRole: string;
    message: string;
    deepLink: string;
    grnNumber?: string;
  }) {
    try {
      // ── EMAIL GATE: Master switch — all emails disabled by default ────────
      if (!this.emailEnabled) {
        this.logger.debug(
          `Email gate closed: skipping gate-entry notification for ${payload.referenceNo} (action=${payload.action}, stage=${payload.stage})`,
        );
        return;
      }

      this.logger.log(
        `Processing gate-entry notification for ${payload.referenceNo} (${payload.action})`,
      );

      // 1. Build recipient list — override to test address
      const to = this.emailOverrideTo || '29x.aditya@gmail.com';

      // 2. Generate subject
      const subject = `[IFH One] Gate Entry ${payload.entryNumber} - ${payload.stage} - ${payload.action}`;

      // 3. Build HTML
      const html = this.buildGateEntryHtml(payload);

      // 4. Send Email
      const result = await this.emailService.send({
        to,
        subject,
        text: payload.message,
        html,
      });

      // 5. Log to DB
      await this.prisma.emailLog.create({
        data: {
          procurementId: payload.procurementId,
          workflowStage: payload.stage,
          event: payload.action,
          subject,
          recipients: to,
          deliveryStatus: result.success ? 'SUCCESS' : 'FAILED',
          errorMessage: result.error || null,
        },
      });

      this.logger.log(
        `Gate-entry email sent for ${payload.referenceNo} (${payload.action}) to ${to}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to process gate-entry notification for ${payload.referenceNo}: ${error.message}`,
      );
    }
  }

  private buildGateEntryHtml(payload: {
    referenceNo: string;
    entryNumber: string;
    stage: string;
    action: string;
    recipientRole: string;
    message: string;
    deepLink: string;
    grnNumber?: string;
  }): string {
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const deepLinkUrl = `${baseUrl}${payload.deepLink}`;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: #2563EB; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Gate Entry Update</h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">Indent No:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.referenceNo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Gate Entry No:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.entryNumber}</td>
          </tr>
          ${
            payload.grnNumber
              ? `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">GRN Number:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.grnNumber}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Stage:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.stage}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Action:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.action}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Assigned To:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${payload.recipientRole}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Message:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${payload.message}</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${deepLinkUrl}" style="background: #2563EB; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Gate Entry
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        This is an automated email from IFH One Procurement ERP.<br/>Please do not reply.
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildHtml(payload: NotificationPayload, eventType: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: ${this.getColor(payload.actionTaken)}; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Indent ${eventType}</h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">Indent No:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${payload.referenceNo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Project:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${payload.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Item Description:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${payload.itemDescription || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Status:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${eventType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Moved To:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${payload.stageName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Updated By:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${payload.actorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Updated On:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${payload.timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Remarks:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${payload.remarks || 'None'}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        This is an automated email from IFH One Procurement ERP.<br/>Please do not reply.
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private getColor(action: string): string {
    switch (action) {
      case 'Approve':
      case 'Complete':
        return '#059669'; // Green
      case 'Reject':
        return '#DC2626'; // Red
      case 'Hold':
        return '#D97706'; // Orange
      case 'Clarification':
        return '#2563EB'; // Blue
      default:
        return '#4F46E5'; // Indigo
    }
  }
}
