import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailModule } from '../../common/email/email.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { SlaEngineService } from './sla-engine.service';
import { DelayEngineService } from './delay-engine.service';
import { ReminderEngineService } from './reminder-engine.service';
import { EscalationEngineService } from './escalation-engine.service';
import { SlaMonitorService } from './sla-monitor.service';

@Module({
  imports: [PrismaModule, EmailModule, NotificationsModule],
  providers: [
    SlaEngineService,
    DelayEngineService,
    ReminderEngineService,
    EscalationEngineService,
    SlaMonitorService,
  ],
  exports: [
    SlaEngineService,
    DelayEngineService,
    ReminderEngineService,
    EscalationEngineService,
    SlaMonitorService,
  ],
})
export class SlaModule {}
