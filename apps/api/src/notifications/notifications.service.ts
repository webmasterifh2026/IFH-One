import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

// Notification type → user-facing category mapping
const TYPE_CATEGORY: Record<string, string> = {
  info: 'NEW_TASK',
  success: 'APPROVAL',
  error: 'REJECTION',
  warning: 'SLA_WARNING',
  hold: 'HOLD',
  clarification: 'CLARIFICATION',
  escalation: 'ESCALATION',
  system: 'SYSTEM',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: { read?: string; page?: number; limit?: number; category?: string },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = userId ? { userId } : {};
    if (query.read === 'true') where.read = true;
    if (query.read === 'false') where.read = false;

    const [data, total, unreadCount, slaWarningCount, escalationCount] =
      await Promise.all([
        this.prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.notification.count({ where }),
        this.prisma.notification.count({ where: { ...where, read: false } }),
        this.prisma.notification.count({
          where: { ...where, type: 'warning', read: false },
        }),
        this.prisma.notification.count({
          where: { ...where, type: 'escalation', read: false },
        }),
      ]);

    return {
      data,
      unreadCount,
      slaWarningCount,
      escalationCount,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUnreadCount(userId: string) {
    const [total, slaWarnings, escalations] = await Promise.all([
      this.prisma.notification.count({
        where: userId ? { userId, read: false } : { read: false },
      }),
      this.prisma.notification.count({
        where: userId
          ? { userId, read: false, type: 'warning' }
          : { read: false, type: 'warning' },
      }),
      this.prisma.notification.count({
        where: userId
          ? { userId, read: false, type: 'escalation' }
          : { read: false, type: 'escalation' },
      }),
    ]);
    return { unreadCount: total, slaWarnings, escalations };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    href?: string;
    procurementId?: string;
    stageNumber?: number;
  }) {
    return this.prisma.notification.create({ data });
  }

  /**
   * Create notification for the assigned user of a stage.
   * Falls back to broadcast if no assignee found.
   */
  async notifyAssignedUser(params: {
    procurementId: string;
    stageNumber: number;
    type: string;
    title: string;
    message: string;
    href?: string;
    excludeUserId?: string;
  }): Promise<void> {
    try {
      const stage = await this.prisma.procurementStage.findUnique({
        where: {
          procurementId_stageNumber: {
            procurementId: params.procurementId,
            stageNumber: params.stageNumber,
          },
        },
        select: { assignedToId: true },
      });

      const targetUserId = stage?.assignedToId;
      if (targetUserId && targetUserId !== params.excludeUserId) {
        await this.create({
          userId: targetUserId,
          type: params.type,
          title: params.title,
          message: params.message,
          href: params.href,
          procurementId: params.procurementId,
          stageNumber: params.stageNumber,
        });
      }
    } catch (err: any) {
      this.logger.warn(`notifyAssignedUser failed: ${err.message}`);
    }
  }

  /**
   * Broadcast a notification to all active users.
   * Filtered broadcast: if roleNames provided, only those roles receive it.
   */
  async broadcast(data: {
    type: string;
    title: string;
    message: string;
    href?: string;
    procurementId?: string;
    stageNumber?: number;
    excludeUserId?: string;
    roleNames?: string[];
  }) {
    try {
      const userQuery: any = { status: 'ACTIVE' };
      if (data.excludeUserId) userQuery.id = { not: data.excludeUserId };

      // If roleNames provided, only users with those roles
      if (data.roleNames && data.roleNames.length > 0) {
        const userIdsWithRole = await this.prisma.userRole.findMany({
          where: { role: { name: { in: data.roleNames } } },
          select: { userId: true },
        });
        const ids = userIdsWithRole.map((ur) => ur.userId);
        if (ids.length === 0) return;
        userQuery.id = data.excludeUserId
          ? { in: ids, not: data.excludeUserId }
          : { in: ids };
      }

      const users = await this.prisma.user.findMany({
        where: userQuery,
        select: { id: true },
      });

      if (users.length === 0) return;

      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: data.type,
          title: data.title,
          message: data.message,
          href: data.href,
          procurementId: data.procurementId,
          stageNumber: data.stageNumber,
        })),
        skipDuplicates: true,
      });
    } catch (err: any) {
      this.logger.error(`broadcast failed: ${err.message}`);
    }
  }

  async delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Get notification inbox summary for a user (categorized counts)
   */
  async getInboxSummary(userId: string) {
    const types = [
      'info',
      'success',
      'error',
      'warning',
      'escalation',
      'hold',
      'clarification',
    ];
    const counts = await Promise.all(
      types.map((t) =>
        this.prisma.notification.count({
          where: { userId, type: t, read: false },
        }),
      ),
    );
    const summary: Record<string, number> = {};
    types.forEach((t, i) => {
      summary[TYPE_CATEGORY[t] ?? t] = counts[i];
    });
    summary.TOTAL = counts.reduce((a, b) => a + b, 0);
    return summary;
  }
}
