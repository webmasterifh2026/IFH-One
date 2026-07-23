import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { SlaEngineService } from './sla-engine.service';
import { EscalationLevel } from './sla.types';

const APP_URL = process.env.FRONTEND_URL || 'https://ifh-one-web.vercel.app';

// Escalation role names (must match DB role names)
const ESCALATION_ROLES = {
  L2: 'Procurement Admin',
  L3: 'Super Admin',
};

@Injectable()
export class EscalationEngineService {
  private readonly logger = new Logger(EscalationEngineService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notifications: NotificationsService,
    private slaEngine: SlaEngineService,
  ) {}

  // ─── Process all escalations ────────────────────────────────────────────────

  async processEscalations(): Promise<void> {
    const now = new Date();

    // Find all breached SLA records still active
    const breachedRecords = await this.prisma.slaRecord.findMany({
      where: {
        slaStatus: 'SLA_BREACHED',
        completedAt: null,
      },
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

    let escalated = 0;

    for (const record of breachedRecords) {
      try {
        const config = await this.slaEngine.getStageConfig(record.stageNumber);
        const hoursOverdue = record.delayHours;

        const assignedUser = record.procurement.stages[0]?.assignedTo;
        const stage = record.procurement.stages[0];

        // Determine required escalation level
        let targetLevel: EscalationLevel | null = null;
        if (hoursOverdue >= config.escalationL3 && config.escalationL3 > 0) {
          targetLevel = 3;
        } else if (
          hoursOverdue >= config.escalationL2 &&
          config.escalationL2 > 0
        ) {
          targetLevel = 2;
        } else if (hoursOverdue >= config.escalationL1) {
          targetLevel = 1;
        }

        if (!targetLevel) continue;

        // Check if this level already escalated
        const alreadyEscalated = await this.prisma.escalationLog.findFirst({
          where: {
            procurementId: record.procurementId,
            stageNumber: record.stageNumber,
            escalationLevel: targetLevel,
          },
        });
        if (alreadyEscalated) continue;

        // Find target user for escalation level
        let escalatedToUser: {
          id: string;
          email: string;
          fullName: string;
        } | null = null;

        if (targetLevel === 1 && assignedUser) {
          escalatedToUser = assignedUser;
        } else if (targetLevel === 2) {
          escalatedToUser = await this.getUserByRole(ESCALATION_ROLES.L2);
        } else if (targetLevel === 3) {
          escalatedToUser = await this.getUserByRole(ESCALATION_ROLES.L3);
        }

        await this.fireEscalation({
          procurementId: record.procurementId,
          stageNumber: record.stageNumber,
          stageName: record.stageName,
          referenceNo: record.procurement.referenceNo,
          projectName: record.procurement.projectName ?? undefined,
          itemName: record.procurement.items[0]?.itemName ?? undefined,
          dueAt: record.dueAt,
          delayHours: hoursOverdue,
          escalationLevel: targetLevel,
          escalatedToUser,
        });

        escalated++;
      } catch (err: any) {
        this.logger.error(
          `Escalation error for ${record.procurementId}: ${err.message}`,
        );
      }
    }

    if (escalated > 0) {
      this.logger.warn(`Fired ${escalated} escalation(s)`);
    }
  }

  // ─── Fire a single escalation ───────────────────────────────────────────────

  private async fireEscalation(params: {
    procurementId: string;
    stageNumber: number;
    stageName: string;
    referenceNo: string;
    projectName?: string;
    itemName?: string;
    dueAt: Date;
    delayHours: number;
    escalationLevel: EscalationLevel;
    escalatedToUser: { id: string; email: string; fullName: string } | null;
  }): Promise<void> {
    const reason = `SLA breached by ${params.delayHours.toFixed(1)} hours at Stage ${params.stageNumber} (${params.stageName})`;
    const levelLabel = `L${params.escalationLevel}`;
    const subject = `[IFH One] Escalation ${levelLabel}: ${params.referenceNo} — SLA Breached`;

    let notificationSent = false;
    let emailSent = false;

    // In-app notification
    if (params.escalatedToUser) {
      try {
        await this.notifications.create({
          userId: params.escalatedToUser.id,
          type: 'error',
          title: `Escalation ${levelLabel}: ${params.referenceNo}`,
          message: reason,
          href: `/procurement/${params.procurementId}`,
          procurementId: params.procurementId,
          stageNumber: params.stageNumber,
        });
        notificationSent = true;
      } catch {
        // ignore
      }
    }

    // Broadcast to all relevant admin users at L2/L3
    if (params.escalationLevel >= 2) {
      const roleName =
        params.escalationLevel === 2
          ? ESCALATION_ROLES.L2
          : ESCALATION_ROLES.L3;
      const adminUsers = await this.getUsersByRole(roleName);
      for (const admin of adminUsers) {
        try {
          await this.notifications.create({
            userId: admin.id,
            type: 'error',
            title: `Escalation ${levelLabel}: ${params.referenceNo}`,
            message: reason,
            href: `/procurement/${params.procurementId}`,
            procurementId: params.procurementId,
            stageNumber: params.stageNumber,
          });
        } catch {
          // ignore
        }
      }
    }

    // Email
    if (params.escalatedToUser?.email) {
      const html = this.buildEscalationHtml({
        ...params,
        escalatedToName: params.escalatedToUser.fullName,
        levelLabel,
      });
      try {
        const result = await this.emailService.send({
          to: params.escalatedToUser.email,
          subject,
          text: reason,
          html,
        });
        emailSent = result.success;
      } catch {
        // ignore
      }
    }

    // Record escalation log
    await this.prisma.escalationLog.create({
      data: {
        procurementId: params.procurementId,
        stageNumber: params.stageNumber,
        stageName: params.stageName,
        escalationLevel: params.escalationLevel,
        escalatedToId: params.escalatedToUser?.id,
        escalatedToEmail: params.escalatedToUser?.email,
        reason,
        notificationSent,
        emailSent,
      },
    });

    // Record in procurement history
    const systemUser = await this.getSystemUser();
    if (systemUser) {
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: params.procurementId,
          stageNumber: params.stageNumber,
          action: `ESCALATION_L${params.escalationLevel}`,
          description: `${reason}. Escalated to ${params.escalatedToUser?.fullName ?? 'Admin'} (${levelLabel})`,
          performedById: systemUser.id,
          metadata: JSON.stringify({
            escalationLevel: params.escalationLevel,
            delayHours: params.delayHours,
            escalatedToId: params.escalatedToUser?.id,
          }),
        },
      });
    }

    this.logger.warn(
      `Escalation ${levelLabel} fired for ${params.referenceNo} S${params.stageNumber} → ${params.escalatedToUser?.email ?? 'N/A'}`,
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getUserByRole(
    roleName: string,
  ): Promise<{ id: string; email: string; fullName: string } | null> {
    const userRole = await this.prisma.userRole.findFirst({
      where: { role: { name: roleName } },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, status: true },
        },
      },
    });
    if (!userRole || userRole.user.status !== 'ACTIVE') return null;
    return {
      id: userRole.user.id,
      email: userRole.user.email,
      fullName: userRole.user.fullName,
    };
  }

  private async getUsersByRole(
    roleName: string,
  ): Promise<{ id: string; email: string; fullName: string }[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { role: { name: roleName } },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, status: true },
        },
      },
    });
    return userRoles
      .filter((ur) => ur.user.status === 'ACTIVE')
      .map((ur) => ({
        id: ur.user.id,
        email: ur.user.email,
        fullName: ur.user.fullName,
      }));
  }

  private _systemUserId: string | null = null;
  private async getSystemUser(): Promise<{ id: string } | null> {
    if (this._systemUserId) return { id: this._systemUserId };
    const u = await this.prisma.user.findFirst({
      where: { email: 'admin@ifh.com' },
      select: { id: true },
    });
    if (u) this._systemUserId = u.id;
    return u;
  }

  // ─── Escalation Email HTML ──────────────────────────────────────────────────

  private buildEscalationHtml(params: {
    referenceNo: string;
    projectName?: string;
    itemName?: string;
    stageName: string;
    stageNumber: number;
    dueAt: Date;
    delayHours: number;
    escalationLevel: EscalationLevel;
    levelLabel: string;
    escalatedToName: string;
    procurementId: string;
  }): string {
    const dueFormatted = params.dueAt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const link = `${APP_URL}/procurement/${params.procurementId}`;
    const levelColors: Record<number, string> = {
      1: '#D97706',
      2: '#DC2626',
      3: '#7C3AED',
    };
    const headerColor = levelColors[params.escalationLevel] ?? '#DC2626';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;">
  <table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background: ${headerColor}; color: #fff; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">SLA Escalation — Level ${params.escalationLevel}</h2>
        <p style="margin: 4px 0 0; opacity: 0.85;">Immediate Action Required</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <p>Dear ${params.escalatedToName},</p>
        <p>The following indent has breached its SLA and has been escalated to you for immediate resolution.</p>
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
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Stuck Stage:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">Stage ${params.stageNumber}: ${params.stageName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">SLA Was Due:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: ${headerColor}; font-weight: bold;">${dueFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Overdue By:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: ${headerColor}; font-weight: bold;">${params.delayHours.toFixed(1)} hours</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Escalation Level:</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${params.levelLabel}</td>
          </tr>
        </table>
        <p style="text-align: center; margin-top: 24px;">
          <a href="${link}" style="background: ${headerColor}; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Resolve Now &rarr;
          </a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
        IFH One Procurement ERP v2.5.0 — Automated Escalation Engine<br/>Please do not reply.
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ─── Get escalation status for Control Tower ─────────────────────────────────

  async getEscalationSummary() {
    const [l1, l2, l3] = await Promise.all([
      this.prisma.escalationLog.count({ where: { escalationLevel: 1 } }),
      this.prisma.escalationLog.count({ where: { escalationLevel: 2 } }),
      this.prisma.escalationLog.count({ where: { escalationLevel: 3 } }),
    ]);
    return { l1, l2, l3, total: l1 + l2 + l3 };
  }
}
