import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { ProcurementModule } from '../procurement/procurement.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ProcurementModule, NotificationsModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
})
export class InspectionsModule {}
