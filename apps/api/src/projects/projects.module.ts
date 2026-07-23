import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectsDbService } from './projects-db.service';
import { ProjectsImportService } from './projects-import.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsDbService, ProjectsImportService],
  exports: [ProjectsService, ProjectsDbService, ProjectsImportService],
})
export class ProjectsModule {}
