import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AppLogger } from '../logger/logger.service';

@Module({
  providers: [PrismaService, AppLogger],
  exports: [PrismaService],
})
export class PrismaModule {}
