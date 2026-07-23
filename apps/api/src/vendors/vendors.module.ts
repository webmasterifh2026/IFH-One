import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorsDbService } from './vendors-db.service';
import { VendorsImportService } from './vendors-import.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VendorsController],
  providers: [VendorsService, VendorsDbService, VendorsImportService],
  exports: [VendorsService, VendorsDbService, VendorsImportService],
})
export class VendorsModule {}
