import { Module } from '@nestjs/common';
import { SKUsController } from './skus.controller';
import { SKUsService } from './skus.service';
import { SKUsImportService } from './skus-import.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SKUsController],
  providers: [SKUsService, SKUsImportService],
  exports: [SKUsService, SKUsImportService],
})
export class SKUsModule {}
