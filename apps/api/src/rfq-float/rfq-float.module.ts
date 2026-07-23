import { Module } from '@nestjs/common';
import { RfqFloatController } from './rfq-float.controller';
import { RfqFloatService } from './rfq-float.service';
import { RfqFloatDbService } from './rfq-float-db.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EmailModule } from '../common/email/email.module';
import { TceAutomationService } from './services/tce-automation.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [RfqFloatController],
  providers: [RfqFloatService, RfqFloatDbService, TceAutomationService],
  exports: [RfqFloatService, RfqFloatDbService, TceAutomationService],
})
export class RfqFloatModule {}
