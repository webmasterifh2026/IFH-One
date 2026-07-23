import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProcurementModule } from '../procurement/procurement.module';
import { GateEntryController } from './gate-entry.controller';
import { GateEntryUploadController } from './gate-entry-upload.controller';
import { GateEntryService } from './gate-entry.service';
import { GateEntryDashboardService } from './gate-entry-dashboard.service';

@Module({
  imports: [PrismaModule, NotificationsModule, ProcurementModule],
  controllers: [GateEntryController, GateEntryUploadController],
  providers: [GateEntryService, GateEntryDashboardService],
  exports: [GateEntryService],
})
export class GateEntryModule {}
