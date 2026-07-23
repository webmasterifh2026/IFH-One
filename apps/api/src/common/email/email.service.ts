import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailAttachmentLink {
  fileName: string;
  fileUrl: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Rendered as links in the email body, not fetched/attached as binary MIME parts. */
  attachmentLinks?: EmailAttachmentLink[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts?: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private configured = false;
  // Temporarily disabled per v2.8.2 — SMTP sending is a no-op until this is
  // set back to true (or EMAIL_ENABLED=true is set in the environment).
  // Re-enable by removing this flag/env check once the user confirms email
  // configuration is ready.
  private readonly emailEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.emailEnabled =
      (
        this.configService.get<string>('EMAIL_ENABLED') || 'false'
      ).toLowerCase() === 'true';
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('EMAIL_FROM');

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
      this.configured = true;
      this.logger.log(
        `Email service configured: ${host}:${port} from: ${from || 'not set'}`,
      );
    } else {
      this.logger.warn(
        'SMTP not configured. Email service will log emails only.',
      );
    }
  }

  private appendAttachmentLinks(options: EmailOptions): {
    text: string;
    html?: string;
  } {
    const links = options.attachmentLinks;
    if (!links || links.length === 0) {
      return { text: options.text, html: options.html };
    }

    const textBlock = `\n\nAttachments:\n${links
      .map((l) => `- ${l.fileName}: ${l.fileUrl}`)
      .join('\n')}`;

    const htmlBlock = `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 12px; color: #6b7280; font-size: 13px; font-weight: bold;">Attachments</td></tr>
      ${links
        .map(
          (l) =>
            `<tr><td style="padding: 4px 12px;"><a href="${l.fileUrl}" style="color: #0F7B45;">${l.fileName}</a></td></tr>`,
        )
        .join('')}
    </table>`;

    return {
      text: options.text + textBlock,
      html: options.html
        ? options.html.replace('</table>', `</table>${htmlBlock}`)
        : undefined,
    };
  }

  async send(options: EmailOptions, retries = 2): Promise<EmailResult> {
    if (!this.emailEnabled) {
      this.logger.log(
        `[EMAIL LOG] Sending disabled (EMAIL_ENABLED!=true) — skipped for: ${options.to}`,
      );
      return { success: true, messageId: 'disabled', attempts: 0 };
    }

    const from =
      this.configService.get<string>('EMAIL_FROM') || 'noreply@ifh-one.com';
    const { text, html } = this.appendAttachmentLinks(options);

    if (!this.configured || !this.transporter) {
      this.logger.log(`[EMAIL LOG] To: ${options.to}`);
      this.logger.log(`[EMAIL LOG] Subject: ${options.subject}`);
      this.logger.log(`[EMAIL LOG] Body: ${text}`);
      return { success: true, messageId: 'logged-only', attempts: 0 };
    }

    // DON'T WAIT for email to complete — queue it asynchronously
    // This prevents request blocking on slow SMTP responses
    this.sendEmailAsync(
      from || 'noreply@ifh-one.com',
      options,
      text,
      html || '',
      retries,
    ).catch((err) => {
      this.logger.error(`Async email failed for ${options.to}: ${err.message}`);
    });

    // Respond immediately
    return { success: true, messageId: 'queued-async', attempts: 0 };
  }

  // Private async email sender (non-blocking)
  private async sendEmailAsync(
    from: string,
    options: EmailOptions,
    text: string,
    html: string,
    retries: number,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email transporter not configured');
      return;
    }

    let lastError: string | undefined;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text,
          html: html || undefined,
        });
        this.logger.log(
          `Email sent successfully to ${options.to} (attempt ${attempt}): ${info.messageId}`,
        );
        return;
      } catch (error: any) {
        lastError = error.message;
        this.logger.warn(
          `Email attempt ${attempt}/${retries + 1} failed for ${options.to}: ${error.message}`,
        );
        if (attempt <= retries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    this.logger.error(
      `Failed to send email to ${options.to} after ${retries + 1} attempts: ${lastError}`,
    );
  }

  async sendRejectionEmail(params: {
    to: string;
    indentNumber: string;
    projectName?: string;
    itemDescription?: string;
    sku?: string;
    quantity?: number;
    stage: string;
    rejectedBy: string;
    rejectedAt: string;
    reason: string;
    remarks?: string;
    status: string;
  }): Promise<EmailResult> {
    const subject = `[IFH One] Indent Rejected – ${params.indentNumber}`;

    const text = `Dear User,

Your indent has been rejected.

Indent No:
${params.indentNumber}

Project:
${params.projectName || 'N/A'}

Item Description:
${params.itemDescription || 'N/A'}

Stage:
${params.stage}

Rejected By:
${params.rejectedBy}

Date:
${params.rejectedAt}

Reason:
${params.reason}

Remarks:
${params.remarks || 'N/A'}

Current Status:
${params.status}

Please review and resubmit if required.

Regards,
IFH One Procurement System`;

    const html = this.buildRejectionHtml(params);

    return this.send({ to: params.to, subject, text, html });
  }

  private buildRejectionHtml(params: {
    indentNumber: string;
    projectName?: string;
    itemDescription?: string;
    sku?: string;
    quantity?: number;
    stage: string;
    rejectedBy: string;
    rejectedAt: string;
    reason: string;
    remarks?: string;
    status: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: #dc2626; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Indent Rejected</h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p>Dear User,</p>
        <p>Your indent has been rejected.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">Indent No:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${params.indentNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Project:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Item Description:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.itemDescription || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">SKU:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.sku || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Quantity:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.quantity || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Stage:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.stage}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Rejected By:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.rejectedBy}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.rejectedAt}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Reason:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${params.reason}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Remarks:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.remarks || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Status:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${params.status}</td>
          </tr>
        </table>

        <p>Please review and resubmit if required.</p>

        <p>Regards,<br/>IFH One Procurement System</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        This is an automated notification from IFH One Procurement System.
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendHoldEmail(params: {
    to: string;
    indentNumber: string;
    projectName?: string;
    itemDescription?: string;
    sku?: string;
    quantity?: number;
    stage: string;
    heldBy: string;
    heldAt: string;
    reason: string;
    remarks?: string;
    status: string;
  }): Promise<EmailResult> {
    const subject = `[IFH One] Indent Put On Hold – ${params.indentNumber}`;

    const text = `Dear User,

Your indent has been put on hold.

Indent No:
${params.indentNumber}

Project:
${params.projectName || 'N/A'}

Item Description:
${params.itemDescription || 'N/A'}

Stage:
${params.stage}

Held By:
${params.heldBy}

Date:
${params.heldAt}

Reason:
${params.reason}

Remarks:
${params.remarks || 'N/A'}

Current Status:
${params.status}

Please review and provide necessary clarification if required.

Regards,
IFH One Procurement System`;

    const html = this.buildHoldHtml(params);
    return this.send({ to: params.to, subject, text, html });
  }

  private buildHoldHtml(params: {
    indentNumber: string;
    projectName?: string;
    itemDescription?: string;
    sku?: string;
    quantity?: number;
    stage: string;
    heldBy: string;
    heldAt: string;
    reason: string;
    remarks?: string;
    status: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: #d97706; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Indent Put On Hold</h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p>Dear User,</p>
        <p>Your indent has been put on hold.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">Indent No:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${params.indentNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Project:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Item Description:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.itemDescription || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">SKU:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.sku || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Quantity:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.quantity || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Stage:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.stage}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Held By:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.heldBy}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.heldAt}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Reason:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #d97706; font-weight: bold;">${params.reason}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Remarks:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.remarks || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Status:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #d97706; font-weight: bold;">${params.status}</td>
          </tr>
        </table>

        <p>Please review and provide necessary clarification if required.</p>

        <p>Regards,<br/>IFH One Procurement System</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        This is an automated notification from IFH One Procurement System.
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendStoreCheckAvailableEmail(params: {
    to: string;
    indentNumber: string;
    projectName?: string;
    itemDescription?: string;
    stage: string;
    fulfilledBy: string;
    fulfilledAt: string;
    remarks?: string;
    status: string;
  }): Promise<EmailResult> {
    const subject = `[IFH One] Indent Item Available in Store – ${params.indentNumber}`;

    const text = `Dear User,

An indent item has been marked as fully available in the store.

Indent No:
${params.indentNumber}

Project:
${params.projectName || 'N/A'}

Item Description:
${params.itemDescription || 'N/A'}

Stage:
${params.stage}

Fulfilled By:
${params.fulfilledBy}

Date:
${params.fulfilledAt}

Remarks:
${params.remarks || 'Fully available in store'}

Current Status:
${params.status}

Regards,
IFH One Procurement System`;

    const html = this.buildStoreCheckAvailableHtml(params);

    return this.send({ to: params.to, subject, text, html });
  }

  private buildStoreCheckAvailableHtml(params: {
    indentNumber: string;
    projectName?: string;
    itemDescription?: string;
    stage: string;
    fulfilledBy: string;
    fulfilledAt: string;
    remarks?: string;
    status: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: #059669; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 20px;">Item Available in Store</h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p>Dear User,</p>
        <p>An indent item has been marked as fully available in the store inventory.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">Indent No:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${params.indentNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Project:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.projectName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Item Description:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.itemDescription || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Stage:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.stage}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Fulfilled By:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.fulfilledBy}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.fulfilledAt}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Remarks:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.remarks || 'Fully available in store'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Status:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: bold;">${params.status}</td>
          </tr>
        </table>

        <p>Regards,<br/>IFH One Procurement System</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        This is an automated notification from IFH One Procurement System.
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
