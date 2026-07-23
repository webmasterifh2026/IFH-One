import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlaEngineService } from './sla-engine.service';
import { DelayEngineService } from './delay-engine.service';
import { ReminderEngineService } from './reminder-engine.service';
import { EscalationEngineService } from './escalation-engine.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SlaMonitorService {
  private readonly logger = new Logger(SlaMonitorService.name);
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private slaEngine: SlaEngineService,
    private delayEngine: DelayEngineService,
    private reminderEngine: ReminderEngineService,
    private escalationEngine: EscalationEngineService,
  ) {}

  // ─── Every 10 minutes: Refresh SLA + Delay records ─────────────────────────
  @Cron(CronExpression.EVERY_10_MINUTES)
  async refreshSlaAndDelays() {
    if (this.isRunning) {
      this.logger.warn('SLA monitor already running; skipping overlap');
      return;
    }
    this.isRunning = true;

    try {
      this.logger.log('SLA Monitor: starting refresh cycle');
      await this.slaEngine.refreshActiveSlaRecords();
      await this.delayEngine.refreshActiveDelayRecords();
      this.logger.log('SLA Monitor: SLA + delay refresh complete');
    } catch (err: any) {
      this.logger.error(`SLA refresh error: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  // ─── Every 30 minutes: Detect breaches, start delays, mark slaBreached ─────
  @Cron(CronExpression.EVERY_30_MINUTES)
  async detectBreachesAndStartDelays() {
    try {
      const now = new Date();

      // Find SLA records newly breached (in APPROACHING_SLA or ON_TRACK but past due)
      const newlyBreached = await this.prisma.slaRecord.findMany({
        where: {
          completedAt: null,
          dueAt: { lt: now },
          slaStatus: {
            notIn: ['SLA_BREACHED', 'COMPLETED_ON_TIME', 'COMPLETED_LATE'],
          },
        },
        include: {
          procurement: {
            select: {
              id: true,
              referenceNo: true,
              stages: {
                where: { status: { in: ['IN_PROGRESS', 'ON_HOLD'] } },
                select: {
                  stageNumber: true,
                  stageName: true,
                  assignedToId: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      for (const record of newlyBreached) {
        // Update SLA status to breached
        await this.prisma.slaRecord.update({
          where: { id: record.id },
          data: { slaStatus: 'SLA_BREACHED' },
        });

        // Also update ProcurementStage.slaBreached (backward compatibility)
        await this.prisma.procurementStage.updateMany({
          where: {
            procurementId: record.procurementId,
            stageNumber: record.stageNumber,
            slaBreached: false,
          },
          data: { slaBreached: true },
        });

        const stageInfo = record.procurement.stages[0];
        if (stageInfo) {
          // Start delay tracking
          await this.delayEngine.startDelay({
            procurementId: record.procurementId,
            stageNumber: record.stageNumber,
            stageName: record.stageName,
            reason: `SLA expired at ${record.dueAt.toISOString()}`,
            category: 'SLA_BREACH',
            currentOwnerId: stageInfo.assignedToId ?? undefined,
          });
        }

        this.logger.warn(
          `SLA breached: ${record.procurement.referenceNo} Stage ${record.stageNumber}`,
        );
      }

      if (newlyBreached.length > 0) {
        this.logger.warn(
          `Detected and processed ${newlyBreached.length} new SLA breach(es)`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Breach detection error: ${err.message}`);
    }
  }

  // ─── Every hour: Send reminders ─────────────────────────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async runReminderEngine() {
    try {
      this.logger.log('SLA Monitor: running reminder engine');
      await this.reminderEngine.processReminders();
    } catch (err: any) {
      this.logger.error(`Reminder engine error: ${err.message}`);
    }
  }

  // ─── Every 2 hours: Run escalation engine ──────────────────────────────────
  @Cron('0 */2 * * *')
  async runEscalationEngine() {
    try {
      this.logger.log('SLA Monitor: running escalation engine');
      await this.escalationEngine.processEscalations();
    } catch (err: any) {
      this.logger.error(`Escalation engine error: ${err.message}`);
    }
  }

  // ─── Midnight: Purge config cache (force re-read of StageConfiguration) ────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeConfigCache() {
    await this.slaEngine.refreshConfigCache();
    this.logger.log('SLA Monitor: config cache refreshed at midnight');
  }

  // ─── Initialize SLA for a newly activated stage (called by ProcurementService) ──

  async onStageActivated(
    procurementId: string,
    stageNumber: number,
    stageName: string,
    activatedAt: Date,
  ): Promise<void> {
    await this.slaEngine.initializeSlaRecord(
      procurementId,
      stageNumber,
      stageName,
      activatedAt,
    );
  }

  // ─── Complete SLA for a completed stage ─────────────────────────────────────

  async onStageCompleted(
    procurementId: string,
    stageNumber: number,
    completedAt: Date,
  ): Promise<void> {
    await this.slaEngine.completeSlaRecord(
      procurementId,
      stageNumber,
      completedAt,
    );
    await this.delayEngine.endDelay(procurementId, stageNumber);
  }

  // ─── Stage put on HOLD — start delay log (category: HOLD) ──────────────────

  async onStageHeld(
    procurementId: string,
    stageNumber: number,
    stageName: string,
    heldByUserId?: string,
    currentOwnerId?: string,
  ): Promise<void> {
    await this.delayEngine.startDelay({
      procurementId,
      stageNumber,
      stageName,
      reason: `Stage placed on hold`,
      category: 'HOLD',
      delayedByUserId: heldByUserId,
      currentOwnerId,
    });
  }

  // ─── Stage RESUMED from hold — end active hold delay ────────────────────────

  async onStageResumed(
    procurementId: string,
    stageNumber: number,
  ): Promise<void> {
    await this.delayEngine.endDelay(procurementId, stageNumber);
  }
}
