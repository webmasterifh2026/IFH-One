import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DelayCategory } from './sla.types';

@Injectable()
export class DelayEngineService {
  private readonly logger = new Logger(DelayEngineService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Start a delay event ────────────────────────────────────────────────────

  async startDelay(params: {
    procurementId: string;
    stageNumber: number;
    stageName: string;
    reason: string;
    category: DelayCategory;
    delayedByUserId?: string;
    currentOwnerId?: string;
  }): Promise<void> {
    try {
      // Check if an active (unresolved) delay already exists for this stage
      const existing = await this.prisma.delayLog.findFirst({
        where: {
          procurementId: params.procurementId,
          stageNumber: params.stageNumber,
          isResolved: false,
        },
      });
      if (existing) return; // Already tracking a delay — do not duplicate

      await this.prisma.delayLog.create({
        data: {
          procurementId: params.procurementId,
          stageNumber: params.stageNumber,
          stageName: params.stageName,
          delayStartedAt: new Date(),
          delayReason: params.reason,
          delayCategory: params.category,
          delayedByUserId: params.delayedByUserId,
          currentOwnerId: params.currentOwnerId,
          isResolved: false,
          delayHours: 0,
        },
      });

      this.logger.log(
        `Delay started for ${params.procurementId} S${params.stageNumber} (${params.category})`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to start delay: ${err.message}`);
    }
  }

  // ─── End a delay event ──────────────────────────────────────────────────────

  async endDelay(procurementId: string, stageNumber: number): Promise<void> {
    try {
      const now = new Date();
      const delay = await this.prisma.delayLog.findFirst({
        where: { procurementId, stageNumber, isResolved: false },
      });
      if (!delay) return;

      const delayHours =
        (now.getTime() - delay.delayStartedAt.getTime()) / 3_600_000;

      await this.prisma.delayLog.update({
        where: { id: delay.id },
        data: { delayEndedAt: now, delayHours, isResolved: true },
      });
    } catch (err: any) {
      this.logger.error(`Failed to end delay: ${err.message}`);
    }
  }

  // ─── Update live delay hours (called by background job) ────────────────────

  async refreshActiveDelayRecords(): Promise<void> {
    const now = new Date();
    const activeDelays = await this.prisma.delayLog.findMany({
      where: { isResolved: false },
    });

    await Promise.all(
      activeDelays.map((delay) => {
        const delayHours =
          (now.getTime() - delay.delayStartedAt.getTime()) / 3_600_000;
        return this.prisma.delayLog.update({
          where: { id: delay.id },
          data: { delayHours },
        });
      }),
    );
  }

  // ─── Get total delay hours for a stage ──────────────────────────────────────

  async getTotalDelayHours(
    procurementId: string,
    stageNumber: number,
  ): Promise<number> {
    const delays = await this.prisma.delayLog.findMany({
      where: { procurementId, stageNumber },
    });

    const now = new Date();
    return delays.reduce((sum, d) => {
      if (d.isResolved && d.delayHours) return sum + d.delayHours;
      const live = (now.getTime() - d.delayStartedAt.getTime()) / 3_600_000;
      return sum + live;
    }, 0);
  }

  // ─── Get all delays for an indent ───────────────────────────────────────────

  async getDelaysForProcurement(procurementId: string) {
    return this.prisma.delayLog.findMany({
      where: { procurementId },
      orderBy: { createdAt: 'asc' },
      include: {
        delayedByUser: { select: { id: true, fullName: true } },
        currentOwner: { select: { id: true, fullName: true } },
      },
    });
  }
}
