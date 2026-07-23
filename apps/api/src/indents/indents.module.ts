import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { IndentsController } from './indents.controller';
import { IndentsService } from './indents.service';

@Module({
  imports: [PrismaModule],
  controllers: [IndentsController],
  providers: [IndentsService],
})
export class IndentsModule {}
