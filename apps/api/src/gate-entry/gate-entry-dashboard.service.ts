import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class GateEntryDashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      pendingGateEntries,
      pendingQuantityChecks,
      pendingQuality,
      pendingAllocation,
      grnGeneratedToday,
      partialReceipts,
      rejectedItemsCount,
      todaysReceipts,
      vendorWise,
      projectWise,
    ] = await Promise.all([
      this.prisma.gateEntry.count({ where: { status: 'GATE_ENTRY' } }),
      this.prisma.gateEntry.count({ where: { status: 'GATE_ENTRY' } }),
      this.prisma.gateEntry.count({ where: { status: 'QUANTITY_VERIFIED' } }),
      this.prisma.gateEntry.count({ where: { status: 'QUALITY_VERIFIED' } }),
      this.prisma.gRN.count({ where: { generatedAt: { gte: startOfToday } } }),
      // Partial receipts: procurements with at least one gate entry but not
      // yet fully received (i.e. still sitting at stage 11).
      this.prisma.procurement.count({
        where: {
          currentStage: 11,
          gateEntries: { some: {} },
        },
      }),
      this.prisma.gateEntryItem.count({ where: { qualityStatus: 'REJECTED' } }),
      this.prisma.gateEntry.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.gRN.groupBy({
        by: ['vendorName'],
        _count: { _all: true },
        _sum: { totalAcceptedQty: true },
        orderBy: { _count: { vendorName: 'desc' } },
        take: 10,
      }),
      this.prisma.gateEntry.findMany({
        where: { createdAt: { gte: startOfToday } },
        select: { procurement: { select: { projectName: true } } },
      }),
    ]);

    const projectCounts = new Map<string, number>();
    for (const g of projectWise) {
      const key = g.procurement.projectName || 'Unassigned';
      projectCounts.set(key, (projectCounts.get(key) || 0) + 1);
    }

    // Overdue receipts: gate entries sitting in a non-terminal status for
    // more than 48 hours without progressing to the next step.
    const overdueThreshold = new Date(Date.now() - 48 * 3600_000);
    const overdueReceipts = await this.prisma.gateEntry.count({
      where: {
        status: { notIn: ['GRN_GENERATED', 'CANCELLED'] },
        updatedAt: { lt: overdueThreshold },
      },
    });

    return {
      pendingGateEntries,
      pendingQuantityChecks,
      pendingQuality,
      pendingGRN: pendingAllocation, // GRN is auto-generated right after allocation
      pendingInventoryPosting: await this.prisma.gRN.count({
        where: { inventoryPosted: false },
      }),
      partialReceipts,
      overdueReceipts,
      rejectedMaterials: rejectedItemsCount,
      todaysReceipts,
      grnGeneratedToday,
      vendorWiseReceipts: vendorWise.map((v) => ({
        vendorName: v.vendorName || 'Unknown',
        grnCount: v._count._all,
        totalAcceptedQty: Number(v._sum.totalAcceptedQty || 0),
      })),
      projectWiseReceipts: Array.from(projectCounts.entries()).map(
        ([projectName, count]) => ({ projectName, count }),
      ),
    };
  }
}
