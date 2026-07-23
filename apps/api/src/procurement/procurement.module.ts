import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EmailModule } from '../common/email/email.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SlaModule } from './sla/sla.module';

@Module({
  imports: [PrismaModule, NotificationsModule, EmailModule, SlaModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
