import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SlaSnapshot, SlaStatus } from './sla.types';

// ─── Fallback TAT map (used when StageConfiguration row doesn't exist) ─────────
export const DEFAULT_TAT_HOURS: Record<number, number> = {
  0: 0,
  1: 6,
  2: 4,
  3: 6,
  4: 24,
  5: 12,
  6: 4,
  7: 6,
  8: 6,
  9: 20,
  10: 12,
  11: 24,
  12: 4,
  13: 8,
  14: 8,
  15: 10,
  16: 6,
  17: 8,
  18: 8,
  19: 10,
  20: 6,
  21: 6,
  22: 4,
};

@Injectable()
export class SlaEngineService {
  private readonly logger = new Logger(SlaEngineService.name);

  /** In-memory cache for StageConfiguration to reduce DB round-trips */
  private configCache: Map<
    number,
    {
      tatHours: number;
      escalationL1: number;
      escalationL2: number;
      escalationL3: number;
    }
  > = new Map();
  private cacheRefreshedAt: Date | null = null;

  constructor(private prisma: PrismaService) {}

  // ─── Configuration Cache ────────────────────────────────────────────────────

  async getStageConfig(stageNumber: number) {
    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    const now = new Date();
    if (
      !this.cacheRefreshedAt ||
      now.getTime() - this.cacheRefreshedAt.getTime() > CACHE_TTL_MS
    ) {
      await this.refreshConfigCache();
    }

    const cached = this.configCache.get(stageNumber);
    if (cached) return cached;

    return {
      tatHours: DEFAULT_TAT_HOURS[stageNumber] ?? 8,
      escalationL1: 0,
      escalationL2: 4,
      escalationL3: 8,
    };
  }

  async refreshConfigCache() {
    try {
      const configs = await this.prisma.stageConfiguration.findMany();
      this.configCache.clear();
      for (const c of configs) {
        this.configCache.set(c.stageNumber, {
          tatHours: c.tatHours ?? DEFAULT_TAT_HOURS[c.stageNumber] ?? 8,
          escalationL1: c.escalationL1DelayHours ?? 0,
          escalationL2: c.escalationL2DelayHours ?? 4,
          escalationL3: c.escalationL3DelayHours ?? 8,
        });
      }
      this.cacheRefreshedAt = new Date();
    } catch (err: any) {
      this.logger.warn(`Failed to refresh config cache: ${err.message}`);
    }
  }

  // ─── SLA Computation ────────────────────────────────────────────────────────

  /**
   * Compute a full SLA snapshot from raw inputs.
   * All time calculations happen here — never on the frontend.
   *
   * CRITICAL FIX v2.9.0 — Hold/Pause Awareness:
   * When a stage is put ON_HOLD, the SLA timer must pause. The `totalHoldHours`
   * parameter represents the cumulative duration of all HOLD events on this stage.
   * It is subtracted from elapsed time and added to the due date so that hold
   * periods do not count against SLA/TAT.
   */
  computeSlaSnapshot(
    stageEnteredAt: Date,
    slaDurationHours: number,
    completedAt: Date | null,
    now: Date = new Date(),
    totalHoldHours: number = 0,
  ): SlaSnapshot {
    // The original due date is based on stage entry + TAT
    const originalDueAt = new Date(
      stageEnteredAt.getTime() + slaDurationHours * 3_600_000,
    );
    // Extend the due date by the total hold duration so the clock effectively
    // stops while the stage is on hold.
    const dueAt = new Date(
      originalDueAt.getTime() + totalHoldHours * 3_600_000,
    );
    const referenceTime = completedAt ?? now;

    // Elapsed time = wall-clock time minus hold duration (hold time doesn't count)
    const rawElapsedMs = referenceTime.getTime() - stageEnteredAt.getTime();
    const elapsedHours = Math.max(0, rawElapsedMs / 3_600_000 - totalHoldHours);

    // Remaining time is based on the extended due date
    const remainingMs =
      dueAt.getTime() - (completedAt ? dueAt.getTime() : now.getTime());
    const remainingHours = completedAt
      ? 0
      : Math.max(0, remainingMs / 3_600_000);

    // Delay = time past the extended due date (only if completed late or currently past due)
    const delayHours = completedAt
      ? Math.max(0, (completedAt.getTime() - dueAt.getTime()) / 3_600_000)
      : Math.max(0, (now.getTime() - dueAt.getTime()) / 3_600_000);

    const percentConsumed =
      slaDurationHours > 0
        ? Math.min(100, (elapsedHours / slaDurationHours) * 100)
        : 0;

    const isCompleted = completedAt != null;

    let slaStatus: SlaStatus;
    if (isCompleted) {
      slaStatus = delayHours > 0 ? 'COMPLETED_LATE' : 'COMPLETED_ON_TIME';
    } else if (now > dueAt) {
      slaStatus = 'SLA_BREACHED';
    } else if (percentConsumed >= 90) {
      slaStatus = 'APPROACHING_SLA'; // orange
    } else if (percentConsumed >= 75) {
      slaStatus = 'APPROACHING_SLA'; // yellow
    } else {
      slaStatus = 'ON_TRACK';
    }

    return {
      stageEnteredAt,
      slaDurationHours,
      dueAt,
      completedAt,
      elapsedHours,
      remainingHours,
      delayHours,
      slaStatus,
      percentConsumed,
      isCompleted,
    };
  }

  // ─── Initialize SLA Record on Stage Entry ──────────────────────────────────

  async initializeSlaRecord(
    procurementId: string,
    stageNumber: number,
    stageName: string,
    stageEnteredAt: Date,
  ): Promise<void> {
    try {
      const config = await this.getStageConfig(stageNumber);
      const tatHours = config.tatHours;

      if (!tatHours || tatHours <= 0) {
        this.logger.debug(
          `Stage ${stageNumber} has no TAT config; skipping SLA record`,
        );
        return;
      }

      const snapshot = this.computeSlaSnapshot(stageEnteredAt, tatHours, null);

      await this.prisma.slaRecord.upsert({
        where: { procurementId_stageNumber: { procurementId, stageNumber } },
        create: {
          procurementId,
          stageNumber,
          stageName,
          stageEnteredAt,
          slaDurationHours: tatHours,
          dueAt: snapshot.dueAt,
          completedAt: null,
          elapsedHours: snapshot.elapsedHours,
          remainingHours: snapshot.remainingHours,
          delayHours: snapshot.delayHours,
          slaStatus: snapshot.slaStatus,
        },
        update: {
          stageName,
          stageEnteredAt,
          slaDurationHours: tatHours,
          dueAt: snapshot.dueAt,
          completedAt: null,
          elapsedHours: snapshot.elapsedHours,
          remainingHours: snapshot.remainingHours,
          delayHours: snapshot.delayHours,
          slaStatus: snapshot.slaStatus,
        },
      });

      this.logger.log(
        `SLA initialized for ${procurementId} Stage ${stageNumber}: due at ${snapshot.dueAt.toISOString()}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to initialize SLA for ${procurementId} S${stageNumber}: ${err.message}`,
      );
    }
  }

  // ─── Private helper: total resolved hold hours for a stage ───────────────────
  private async getTotalHoldHours(
    procurementId: string,
    stageNumber: number,
  ): Promise<number> {
    const holdDelays = await this.prisma.delayLog.findMany({
      where: {
        procurementId,
        stageNumber,
        delayCategory: 'HOLD',
        isResolved: true,
      },
      select: { delayHours: true },
    });
    return holdDelays.reduce((sum, d) => sum + (d.delayHours ?? 0), 0);
  }

  // ─── Complete SLA Record on Stage Completion ────────────────────────────────

  async completeSlaRecord(
    procurementId: string,
    stageNumber: number,
    completedAt: Date = new Date(),
  ): Promise<void> {
    try {
      const existing = await this.prisma.slaRecord.findUnique({
        where: { procurementId_stageNumber: { procurementId, stageNumber } },
      });
      if (!existing) return;

      // Fetch total hold hours so elapsed time properly excludes hold periods
      const totalHoldHours = await this.getTotalHoldHours(
        procurementId,
        stageNumber,
      );

      const snapshot = this.computeSlaSnapshot(
        existing.stageEnteredAt,
        existing.slaDurationHours,
        completedAt,
        undefined,
        totalHoldHours,
      );

      await this.prisma.slaRecord.update({
        where: { procurementId_stageNumber: { procurementId, stageNumber } },
        data: {
          completedAt,
          elapsedHours: snapshot.elapsedHours,
          remainingHours: 0,
          delayHours: snapshot.delayHours,
          slaStatus: snapshot.slaStatus,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to complete SLA for ${procurementId} S${stageNumber}: ${err.message}`,
      );
    }
  }

  // ─── Refresh All Active SLA Records (called by background job) ─────────────
  // Batches records in groups of 100, computes snapshots in memory, then issues
  // individual updates. A true bulk-update (updateMany) is not feasible here
  // because each record has unique elapsed/remaining values; however we keep the
  // per-record update inside a Promise.all batch to minimise wall-clock time.

  async refreshActiveSlaRecords(): Promise<void> {
    const now = new Date();
    const batchSize = 100;
    let offset = 0;
    let totalUpdated = 0;

    while (true) {
      const records = await this.prisma.slaRecord.findMany({
        where: { completedAt: null },
        skip: offset,
        take: batchSize,
      });

      if (records.length === 0) break;

      // Process current batch concurrently — each record gets its own snapshot
      await Promise.all(
        records.map(async (record) => {
          // Fetch hold hours so the background refresh correctly pauses SLA
          // clock for stages that have been on hold.
          const totalHoldHours = await this.getTotalHoldHours(
            record.procurementId,
            record.stageNumber,
          );

          const snapshot = this.computeSlaSnapshot(
            record.stageEnteredAt,
            record.slaDurationHours,
            null,
            now,
            totalHoldHours,
          );

          await this.prisma.slaRecord.update({
            where: { id: record.id },
            data: {
              elapsedHours: snapshot.elapsedHours,
              remainingHours: snapshot.remainingHours,
              delayHours: snapshot.delayHours,
              slaStatus: snapshot.slaStatus,
            },
          });
          totalUpdated++;
        }),
      );

      offset += batchSize;
      if (records.length < batchSize) break;
    }

    if (totalUpdated > 0) {
      this.logger.log(`Refreshed ${totalUpdated} active SLA records`);
    }
  }

  // ─── Get SLA record for a specific stage ────────────────────────────────────

  async getSlaRecord(procurementId: string, stageNumber: number) {
    return this.prisma.slaRecord.findUnique({
      where: { procurementId_stageNumber: { procurementId, stageNumber } },
    });
  }

  // ─── Get all SLA records for an indent ──────────────────────────────────────

  async getSlaRecordsForProcurement(procurementId: string) {
    return this.prisma.slaRecord.findMany({
      where: { procurementId },
      orderBy: { stageNumber: 'asc' },
    });
  }

  // ─── Get SLA Dashboard Summary ──────────────────────────────────────────────

  async getSlaDashboardSummary() {
    const [
      onTrack,
      approaching,
      breached,
      completedOnTime,
      completedLate,
      totalActive,
      avgDelayHours,
    ] = await Promise.all([
      this.prisma.slaRecord.count({
        where: { slaStatus: 'ON_TRACK', completedAt: null },
      }),
      this.prisma.slaRecord.count({
        where: { slaStatus: 'APPROACHING_SLA', completedAt: null },
      }),
      this.prisma.slaRecord.count({
        where: { slaStatus: 'SLA_BREACHED', completedAt: null },
      }),
      this.prisma.slaRecord.count({
        where: { slaStatus: 'COMPLETED_ON_TIME' },
      }),
      this.prisma.slaRecord.count({ where: { slaStatus: 'COMPLETED_LATE' } }),
      this.prisma.slaRecord.count({ where: { completedAt: null } }),
      this.prisma.slaRecord.aggregate({
        where: { slaStatus: 'SLA_BREACHED', completedAt: null },
        _avg: { delayHours: true },
      }),
    ]);

    return {
      onTrack,
      approaching,
      breached,
      completedOnTime,
      completedLate,
      totalActive,
      avgDelayHoursOnBreached: avgDelayHours._avg.delayHours ?? 0,
    };
  }

  // ─── Business Hours Utility ─────────────────────────────────────────────────

  calculateBusinessHours(start: Date, end: Date): number {
    if (end <= start) return 0;
    const BIZ_START_H = 9;
    const BIZ_END_H = 18;
    let total = 0;
    const cur = new Date(start);

    const isWorkingDay = (date: Date): boolean => {
      const dow = date.getDay();
      if (dow === 0) return false;
      if (dow >= 1 && dow <= 5) return true;
      const year = date.getFullYear();
      const month = date.getMonth();
      const workingSats = new Set<number>();
      let satCount = 0;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === 6) {
          satCount++;
          if (satCount === 2 || satCount === 4 || satCount === 5) {
            workingSats.add(d);
          }
        }
      }
      return workingSats.has(date.getDate());
    };

    if (!isWorkingDay(cur) || cur.getHours() >= BIZ_END_H) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(BIZ_START_H, 0, 0, 0);
      while (!isWorkingDay(cur)) cur.setDate(cur.getDate() + 1);
    } else if (cur.getHours() < BIZ_START_H) {
      cur.setHours(BIZ_START_H, 0, 0, 0);
    }

    while (cur < end) {
      if (!isWorkingDay(cur)) {
        cur.setDate(cur.getDate() + 1);
        cur.setHours(BIZ_START_H, 0, 0, 0);
        continue;
      }
      const dayEnd = new Date(cur);
      dayEnd.setHours(BIZ_END_H, 0, 0, 0);
      const segEnd = end < dayEnd ? end : dayEnd;
      const segStart =
        cur.getHours() < BIZ_START_H
          ? new Date(
              cur.getFullYear(),
              cur.getMonth(),
              cur.getDate(),
              BIZ_START_H,
            )
          : cur;
      if (segEnd > segStart) {
        total += (segEnd.getTime() - segStart.getTime()) / 3_600_000;
      }
      cur.setDate(cur.getDate() + 1);
      cur.setHours(BIZ_START_H, 0, 0, 0);
    }
    return Math.max(0, total);
  }
}
