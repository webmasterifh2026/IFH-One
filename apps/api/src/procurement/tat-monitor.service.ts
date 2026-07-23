import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * @deprecated Legacy TAT monitor — superseded by SlaMonitorService in v2.5.0.
 * Kept for backward compatibility only. No new logic should be added here.
 */
@Injectable()
export class TatMonitorService {
  private readonly logger = new Logger(TatMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}
}
