import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ProjectsService } from './projects.service';
import { ProjectsImportService } from './projects-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectsImportService: ProjectsImportService,
  ) {}

  // ─── List All (server-side pagination + search) ─────────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
    @Query('minIndents') minIndents?: string,
    @Query('maxIndents') maxIndents?: string,
    @Query('sortBy') sortBy: string = 'project_name',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    // Support both skip/take and page/limit patterns
    let skipNum: number;
    let takeNum: number;

    if (page) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      takeNum = Math.min(parseInt(limit || take || '25') || 25, 100);
      skipNum = (pageNum - 1) * takeNum;
    } else {
      skipNum = skip ? Math.max(0, parseInt(skip)) : 0;
      takeNum = Math.min(parseInt(take || limit || '25') || 25, 100);
    }

    if (takeNum < 1) {
      throw new BadRequestException('Take must be at least 1');
    }

    const minIndentsNum = minIndents ? parseInt(minIndents, 10) : undefined;
    const maxIndentsNum = maxIndents ? parseInt(maxIndents, 10) : undefined;

    return this.projectsService.findAll(
      skipNum,
      takeNum,
      search,
      status,
      departmentId,
      minIndentsNum,
      maxIndentsNum,
      sortBy,
      sortOrder,
    );
  }

  // ─── Search for Dropdown Typeahead ──────────────────────────────────────────
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const query = q || search || '';
    const take = parseInt(limit || '25') || 25;
    const skip = parseInt(offset || '0') || 0;
    // Always goes through search() with a capped `take`, even for an empty
    // query — the dropdown-open-with-no-query case must still scale past
    // today's ~100 projects toward the target 20,000+, so this can never
    // return the entire table unbounded.
    return this.projectsService.search(query, take, skip);
  }

  // ─── Get Active Projects ────────────────────────────────────────────────────
  @Get('active')
  @HttpCode(HttpStatus.OK)
  async getActiveProjects(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? Math.max(0, parseInt(skip)) : 0;
    const takeNum = Math.min(take ? parseInt(take) : 25, 100);
    return this.projectsService.getActiveProjects(skipNum, takeNum);
  }

  // ─── Get Projects by Department ────────────────────────────────────────────
  @Get('department/:departmentId')
  @HttpCode(HttpStatus.OK)
  async findByDepartment(
    @Param('departmentId') departmentId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? Math.max(0, parseInt(skip)) : 0;
    const takeNum = Math.min(take ? parseInt(take) : 25, 100);
    return this.projectsService.findByDepartment(
      departmentId,
      skipNum,
      takeNum,
    );
  }

  // ─── Get Project Progress ──────────────────────────────────────────────────
  @Get('progress/:id')
  @HttpCode(HttpStatus.OK)
  async getProgress(@Param('id') id: string) {
    return this.projectsService.getProjectProgress(id);
  }

  // ─── Bulk Import & Export ───────────────────────────────────────────────────
  // NOTE: These MUST be above @Get(':id') to prevent NestJS from matching them as the :id parameter.

  @Get('export/template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.projectsImportService.generateTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="IFH_One_Projects_Import_Template.xlsx"',
    });
    res.send(buffer);
  }

  @Post('import/validate')
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.projectsImportService.parseAndValidate(
      file.buffer,
      file.originalname,
    );
  }

  @Post('import/execute')
  async executeImport(
    @Body()
    body: {
      fileName: string;
      validRecords: any[];
      duplicateStrategy: 'SKIP' | 'UPDATE' | 'IMPORT_NEW_ONLY';
    },
    @Req() req: any,
  ) {
    if (!body.validRecords || !Array.isArray(body.validRecords)) {
      throw new BadRequestException('validRecords must be an array');
    }
    const userId = req.user?.id;
    return this.projectsImportService.executeImport(
      userId,
      body.fileName,
      body.validRecords,
      body.duplicateStrategy,
    );
  }

  // ─── Get One ────────────────────────────────────────────────────────────────
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  // ─── Create (read-only) ─────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    return this.projectsService.create(body);
  }

  // ─── Update (read-only) ─────────────────────────────────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.projectsService.update(id, body);
  }

  // ─── Update Status (read-only) ─────────────────────────────────────────────
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.projectsService.updateStatus(id, status);
  }

  // ─── Delete (read-only) ─────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }
}
