import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as xlsx from 'xlsx';
import { VendorsService } from './vendors.service';
import { VendorsImportService } from './vendors-import.service';
import { VendorCreateDto, VendorUpdateDto, VendorStatus } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly vendorsImportService: VendorsImportService,
  ) {}

  // ─── List All ──────────────────────────────────────────────────────────────
  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: VendorStatus,
    @Query('sortBy') sortBy: string = 'vendorName',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
  ) {
    return this.vendorsService.findAll(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 10,
      search,
      status,
      sortBy,
      sortOrder,
      createdFrom,
      createdTo,
    );
  }

  // ─── Download Import Template ──────────────────────────────────────────────
  @Get('export/template')
  @RequirePermissions('vendor.import', 'vendor.create')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.vendorsImportService.generateTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="IFH_One_Vendors_Import_Template.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ─── Export Vendors ────────────────────────────────────────────────────────
  @Get('export')
  @RequirePermissions('vendor.export', 'vendor.view')
  async exportVendors(@Res() res: Response) {
    const buffer = await this.vendorsImportService.exportVendors();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="IFH_One_Vendors_Export.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ─── Validate Import ───────────────────────────────────────────────────────
  @Post('import/validate')
  @RequirePermissions('vendor.import', 'vendor.create')
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.vendorsImportService.parseAndValidate(file.buffer);
  }

  // ─── Execute Import ────────────────────────────────────────────────────────
  @Post('import/execute')
  @RequirePermissions('vendor.import', 'vendor.create')
  async executeImport(
    @Req() req: any,
    @Body()
    body: {
      fileName: string;
      validRecords: any[];
      invalidRecords?: any[];
      duplicateRecords?: any[];
      duplicateStrategy: 'SKIP' | 'UPDATE' | 'IMPORT_NEW_ONLY';
    },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.vendorsImportService.executeImport(
      userId,
      body.fileName,
      body.validRecords,
      body.duplicateStrategy,
      {
        totalRecords:
          (body.validRecords?.length || 0) + (body.invalidRecords?.length || 0),
        invalidRecords: body.invalidRecords,
        duplicateRecords: body.duplicateRecords,
      },
    );
  }

  // ─── Download Import Report ───────────────────────────────────────────────
  @Post('import/report')
  @RequirePermissions('vendor.import', 'vendor.create')
  async downloadReport(@Res() res: Response, @Body() body: { report: any[] }) {
    const report = body.report || [];
    const ws = xlsx.utils.json_to_sheet(
      report.map((r: any) => ({
        'Row Number': r.rowNumber,
        'Vendor Name': r.vendorName,
        'Vendor ID': r.vendorId,
        'Import Status': r.status,
        'Error Reason': r.errorReason || '',
      })),
    );
    ws['!cols'] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 16 },
      { wch: 14 },
      { wch: 40 },
    ];
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Import Report');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="IFH_One_Vendor_Import_Report.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ─── Create ─────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: VendorCreateDto) {
    return this.vendorsService.create(dto);
  }

  // ─── Update Status ──────────────────────────────────────────────────────────
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: VendorStatus) {
    return this.vendorsService.updateStatus(id, status);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: VendorUpdateDto) {
    return this.vendorsService.update(id, dto);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.vendorsService.delete(id);
  }

  // ─── Get Performance ────────────────────────────────────────────────────────
  @Get(':id/performance')
  getPerformance(@Param('id') id: string) {
    return this.vendorsService.getPerformance(id);
  }

  // ─── Get Insights ───────────────────────────────────────────────────────────
  @Get(':id/insights')
  getInsights(@Param('id') id: string) {
    return this.vendorsService.getInsights(id);
  }

  // ─── Get One ────────────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }
}
