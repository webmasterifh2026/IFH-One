import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ReminderType } from './sla.types';

const APP_URL = process.env.FRONTEND_URL || 'https://ifh-one-web.vercel.app';

@Injectable()
export class ReminderEngineService {
  private readonly logger = new Logger(ReminderEngineService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notifications: NotificationsService,
  ) {}

  // ─── Check and dispatch all due reminders ───────────────────────────────────

  async processReminders(): Promise<void> {
    const now = new Date();

    // Fetch all active SLA records with assigned users
    const activeRecords = await this.prisma.slaRecord.findMany({
      where: { completedAt: null },
      include: {
        procurement: {
          select: {
            id: true,
            referenceNo: true,
            title: true,
            projectName: true,
            stages: {
              where: { status: { in: ['IN_PROGRESS', 'ON_HOLD'] } },
              select: {
                stageNumber: true,
                assignedToId: true,
                assignedTo: {
                  select: { id: true, email: true, fullName: true },
                },
              },
              take: 1,
            },
            items: { select: { itemName: true }, take: 1 },
          },
        },
      },
    });

    let sent = 0;
    for (const record of activeRecords) {
      try {
        const stage = record.procurement.stages[0];
        if (!stage) continue;

        const totalMs = record.slaDurationHours * 3_600_000;
        const elapsedMs = now.getTime() - record.stageEnteredAt.getTime();
        const percentConsumed = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;
        const isExpired = now > record.dueAt;
        const hoursOverdue = isExpired
          ? (now.getTime() - record.dueAt.getTime()) / 3_600_000
          : 0;

        const recipientId = stage.assignedToId;
        const recipientEmail = stage.assignedTo?.email;
        const recipientName = stage.assignedTo?.fullName ?? 'Team Member';

        if (!recipientId && !recipientEmail) continue;

        // Determine which reminder type is due
        const dueReminders: { type: ReminderType; sequence: number }[] = [];

        if (!isExpired) {
          if (percentConsumed >= 50 && percentConsumed < 75) {
            if (
              !(await this.reminderAlreadySent(
                record.procurementId,
                record.stageNumber,
                'PERCENT_50',
                1,
              ))
            ) {
              dueReminders.push({ type: 'PERCENT_50', sequence: 1 });
            }
          } else if (percentConsumed >= 75 && percentConsumed < 90) {
            if (
              !(await this.reminderAlreadySent(
                record.procurementId,
                record.stageNumber,
                'PERCENT_75',
                1,
              ))
            ) {
              dueReminders.push({ type: 'PERCENT_75', sequence: 1 });
            }
          } else if (percentConsumed >= 90) {
            if (
              !(await this.reminderAlreadySent(
                record.procurementId,
                record.stageNumber,
                'PERCENT_90',
                1,
              ))
            ) {
              dueReminders.push({ type: 'PERCENT_90', sequence: 1 });
            }
          }
        } else {
          // SLA expired
          if (
            !(await this.reminderAlreadySent(
              record.procurementId,
              record.stageNumber,
              'SLA_EXPIRED',
              1,
            ))
          ) {
            dueReminders.push({ type: 'SLA_EXPIRED', sequence: 1 });
          }

          // Post-expiry: every 24 hours
          const postExpirySequence = Math.floor(hoursOverdue / 24) + 1;
          const existingPostExpiry = await this.getLastReminderSequence(
            record.procurementId,
            record.stageNumber,
            'POST_EXPIRY_24H',
          );
          if (postExpirySequence > existingPostExpiry) {
            dueReminders.push({
              type: 'POST_EXPIRY_24H',
              sequence: postExpirySequence,
            });
          }
        }

        for (const reminder of dueReminders) {
          await this.sendReminder({
            procurementId: record.procurementId,
            stageNumber: record.stageNumber,
            stageName: record.stageName,
            referenceNo: record.procurement.referenceNo,
            projectName: record.procurement.projectName ?? undefined,
            itemName: record.procurement.items[0]?.itemName ?? undefined,
            dueAt: record.dueAt,
            remainingHours: record.remainingHours,
            delayHours: record.delayHours,
            reminderType: reminder.type,
            reminderNumber: reminder.sequence,
            recipientId: recipientId ?? undefined,
            recipientEmail: recipientEmail ?? undefined,
            recipientName,
          });
          sent++;
        }
      } catch (err: any) {
        this.logger.error(
          `Reminder processing error for ${record.procurementId}: ${err.message}`,
        );
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} reminder(s)`);
    }
  }

  // ─── Send a single reminder ─────────────────────────────────────────────────

  private async sendReminder(params: {
    procurementId: string;
    stageNumber: number;
    stageName: string;
    referenceNo: string;
    projectName?: string;
    itemName?: string;
    dueAt: Date;
    remainingHours: number;
    delayHours: number;
    reminderType: ReminderType;
    reminderNumber: number;
    recipientId?: string;
    recipientEmail?: string;
    recipientName: string;
  }): Promise<void> {
    const subject = this.buildReminderSubject(
      params.reminderType,
      params.referenceNo,
    );
    const html = this.buildReminderHtml(params);
    let emailStatus = 'SKIPPED';
    let notificationSent = false;

    // Send in-app notification
    if (params.recipientId) {
      try {
        await this.notifications.create({
          userId: params.recipientId,
          type: this.getReminderNotifType(params.reminderType),
          title: subject,
          message: `Stage: ${params.stageName} | Indent: ${params.referenceNo}`,
          href: `/procurement/${params.procurementId}`,
          procurementId: params.procurementId,
          stageNumber: params.stageNumber,
        });
        notificationSent = true;
      } catch (err: any) {
        this.logger.warn(
          `Failed to create reminder notification: ${err.message}`,
        );
      }
    }

    // Send email reminder
    if (params.recipientEmail) {
      try {
        const result = await this.emailService.send({
          to: params.recipientEmail,
          subject,
          text: `Reminder for ${params.referenceNo} — ${params.stageName}`,
          html,
        });
        emailStatus = result.success ? 'SENT' : 'FAILED';
      } catch {
        emailStatus = 'FAILED';
      }
    }

    // Log the reminder
    await this.prisma.reminderLog.create({
      data: {
        procurementId: params.procurementId,
        stageNumber: params.stageNumber,
        reminderType: params.reminderType,
        reminderNumber: params.reminderNumber,
        recipientId: params.recipientId,
        recipientEmail: params.recipientEmail,
        deliveryStatus: emailStatus,
      },
    });

    this.logger.log(
      `Reminder [${params.reminderType}#${params.reminderNumber}] sent for ${params.referenceNo} S${params.stageNumber} → ${params.recipientEmail ?? params.recipientId}`,
    );
  }

  // ─── Deduplication helpers ──────────────────────────────────────────────────

  private async reminderAlreadySent(
    procurementId: string,
    stageNumber: number,
    reminderType: ReminderType,
    reminderNumber: number,
  ): Promise<boolean> {
    const count = await this.prisma.reminderLog.count({
      where: { procurementId, stageNumber, reminderType, reminderNumber },
    });
    return count > 0;
  }

  private async getLastReminderSequence(
    procurementId: string,
    stageNumber: number,
    reminderType: ReminderType,
  ): Promise<number> {
    const last = await this.prisma.reminderLog.findFirst({
      where: { procurementId, stageNumber, reminderType },
      orderBy: { reminderNumber: 'desc' },
    });
    return last?.reminderNumber ?? 0;
  }

  // ─── Email Builders ─────────────────────────────────────────────────────────

  private buildReminderSubject(
    type: ReminderType,
    referenceNo: string,
  ): string {
    switch (type) {
      case 'PERCENT_50':
        return `[IFH One] Reminder: ${referenceNo} — 50% SLA Consumed`;
      case 'PERCENT_75':
        return `[IFH One] Warning: ${referenceNo} — 75% SLA Consumed`;
      case 'PERCENT_90':
        return `[IFH One] Urgent: ${referenceNo} — 90% SLA Consumed`;
      case 'SLA_EXPIRED':
        return `[IFH One] SLA Breached: ${referenceNo} — Immediate Action Required`;
      case 'POST_EXPIRY_24H':
        return `[IFH One] Overdue: ${referenceNo} — Escalation Notice`;
    }
  }

  private getReminderNotifType(type: ReminderType): string {
    switch (type) {
      case 'PERCENT_50':
        return 'info';
      case 'PERCENT_75':
        return 'warning';
      case 'PERCENT_90':
        return 'warning';
      case 'SLA_EXPIRED':
        return 'error';
      case 'POST_EXPIRY_24H':
        return 'error';
    }
  }

  private buildReminderHtml(params: {
    referenceNo: string;
    projectName?: string;
    itemName?: string;
    stageName: string;
    stageNumber: number;
    dueAt: Date;
    remainingHours: number;
    delayHours: number;
    reminderType: ReminderType;
    reminderNumber: number;
    recipientName: string;
    procurementId: string;
  }): string {
    const colors: Record<ReminderType, string> = {
      PERCENT_50: '#2563EB',
      PERCENT_75: '#D97706',
      PERCENT_90: '#EA580C',
      SLA_EXPIRED: '#DC2626',
      POST_EXPIRY_24H: '#991B1B',
    };
    const labels: Record<ReminderType, string> = {
      PERCENT_50: '50% of SLA Time Consumed',
      PERCENT_75: '75% of SLA Time Consumed — Action Required',
      PERCENT_90: '90% of SLA Time Consumed — Urgent',
      SLA_EXPIRED: 'SLA Breached — Immediate Action Required',
      POST_EXPIRY_24H: `Overdue Notice #${params.reminderNumber} — Escalation Active`,
    };

    const headerColor = colors[params.reminderType];
    const label = labels[params.reminderType];
    const dueFormatted = params.dueAt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const remainingText =
      params.remainingHours > 0
        ? `${params.remainingHours.toFixed(1)} hours remaining`
        : `${params.delayHours.toFixed(1)} hours overdue`;

    const link = `${APP_URL}/procurement/${params.procurementId}`;

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: ${headerColor}; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">${label}</h2>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p>Dear ${params.recipientName},</p>
        <p>This is an automated SLA reminder for the following indent:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 160px;">Indent No:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${params.referenceNo}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Project:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.projectName ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Item:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${params.itemName ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Current Stage:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">Stage ${params.stageNumber}: ${params.stageName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">SLA Due At:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: ${headerColor};">${dueFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">SLA Status:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: ${headerColor};">${remainingText}</td>
          </tr>
        </table>
        <p style="text-align: center; margin-top: 24px;">
          <a href="${link}" style="background: ${headerColor}; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            View Indent &rarr;
          </a>
        </p>
        <p>Please take action immediately to avoid SLA escalation.</p>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        This is an automated reminder from IFH One Procurement ERP v2.5.0.<br/>Please do not reply.
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
