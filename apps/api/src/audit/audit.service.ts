import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async getAuditTrail(params: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    userId?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    // We fetch both ProcurementHistory (workflow events) and AuditLog (system events)
    // Then we merge them into a unified audit feed in memory since they are different tables.

    // In a real huge scale app we'd unify them in DB or use a view, but this works for ERP scale.
    const [historyLogs, systemLogs] = await Promise.all([
      this.prisma.procurementHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500, // Fetch recent 500 to merge
        include: {
          performedBy: { select: { fullName: true, email: true } },
          procurement: { select: { referenceNo: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 500,
        include: {
          performedBy: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    const unified = [
      ...historyLogs.map((h) => ({
        id: h.id,
        timestamp: h.createdAt,
        action: h.action,
        user: h.performedBy?.fullName || 'System',
        indentNo: h.procurement?.referenceNo,
        recordId: h.procurementId,
        stage: h.stageNumber,
        details: h.description,
        type: 'WORKFLOW',
      })),
      ...systemLogs.map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        action: s.action,
        user: s.performedBy?.fullName || 'System',
        indentNo: null,
        recordId: null,
        stage: null,
        details: 'System Event',
        type: 'SYSTEM',
      })),
    ];

    // Sort descending
    unified.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Simple filter
    let filtered = unified;
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          (f.indentNo && f.indentNo.toLowerCase().includes(q)) ||
          (f.action && f.action.toLowerCase().includes(q)) ||
          (f.user && f.user.toLowerCase().includes(q)) ||
          (f.details && f.details.toLowerCase().includes(q)),
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
