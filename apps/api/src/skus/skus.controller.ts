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
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SKUsService } from './skus.service';
import { SKUsImportService } from './skus-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('skus')
@UseGuards(JwtAuthGuard)
export class SKUsController {
  constructor(
    private readonly skusService: SKUsService,
    private readonly skusImportService: SKUsImportService,
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
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('uom') uom?: string,
    @Query('subGroup') subGroup?: string,
    @Query('sortBy') sortBy: string = 'description',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    @Query('duplicatesOnly') duplicatesOnly?: string,
    @Query('recentlyViewed') recentlyViewed?: string,
    @Query('frequentlyUsed') frequentlyUsed?: string,
    @Query('quickFilter')
    quickFilter?: 'frequentlyOrdered' | 'recentlyOrdered' | 'latestAdded',
    @Req() req?: any,
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

    return this.skusService.findAll(
      skipNum,
      takeNum,
      search,
      category,
      status,
      uom,
      sortBy,
      sortOrder,
      duplicatesOnly === 'true',
      undefined,
      undefined,
      subGroup,
      req?.user?.sub,
      quickFilter,
    );
  }

  // ─── Facets (categories, sub groups, UOMs) for marketplace filters ─────────
  @Get('facets')
  @HttpCode(HttpStatus.OK)
  async getFacets() {
    return this.skusService.getFacets();
  }

  // ─── Check Duplicates ───────────────────────────────────────────────────────
  @Get('duplicate-check')
  @HttpCode(HttpStatus.OK)
  async checkDuplicates(
    @Query('itemCode') itemCode: string,
    @Query('description') description: string,
    @Query('excludeId') excludeId?: string,
  ) {
    if (!itemCode || !description) {
      throw new BadRequestException('itemCode and description are required');
    }
    return this.skusService.checkDuplicates(itemCode, description, excludeId);
  }

  // ─── Get Recent Views ───────────────────────────────────────────────────────
  @Get('recent-views')
  @HttpCode(HttpStatus.OK)
  async getRecentViews(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID not found');
    return this.skusService.getRecentViews(userId);
  }

  // ─── Clear Recent Views ─────────────────────────────────────────────────────
  @Delete('recent-views')
  @HttpCode(HttpStatus.OK)
  async clearRecentViews(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID not found');
    await this.skusService.clearRecentViews(userId);
    return { success: true };
  }

  // ─── Record View ────────────────────────────────────────────────────────────
  @Post(':itemCode/view')
  @HttpCode(HttpStatus.OK)
  async recordView(
    @Param('itemCode') itemCode: string,
    @Body('itemName') itemName: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new BadRequestException('User ID not found');
    if (!itemName) throw new BadRequestException('itemName is required');

    const sku = await this.skusService.findByItemCode(itemCode);
    await this.skusService.recordView(userId, sku.id, itemCode, itemName);
    return { success: true };
  }

  // ─── Search for Dropdown Typeahead ──────────────────────────────────────────
  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const query = q || search || '';
    if (!query.trim()) {
      return this.skusService.getAll();
    }
    return this.skusService.search(query, parseInt(limit || '25') || 25);
  }

  // ─── Enterprise SKU Search ──────────────────────────────────────────────────
  @Get('search/enterprise')
  @HttpCode(HttpStatus.OK)
  async searchEnterprise(
    @Query('q') q?: string,
    @Query('projectId') projectId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req?: any,
  ) {
    const query = q || '';
    const take = parseInt(limit || '30') || 30;
    const skip = parseInt(offset || '0') || 0;

    // If empty search, return recent and frequent
    if (!query.trim()) {
      const userId = req?.user?.id;
      const recentAndFrequent = await this.skusService.getRecentAndFrequent(
        userId,
        projectId,
        10,
      );
      return {
        mode: 'suggestions',
        items: recentAndFrequent,
      };
    }

    // Otherwise return ranked search results
    const userId = req?.user?.id;
    const { items, isFuzzyFallback, total, hasMore } =
      await this.skusService.searchEnterprise(query, take, userId, skip);
    return {
      mode: 'search',
      items,
      isFuzzyFallback,
      total,
      hasMore,
    };
  }

  // ─── Get SKU by itemCode (auto-populate) ───────────────────────────────────
  @Get('itemCode/:itemCode')
  @HttpCode(HttpStatus.OK)
  async findByItemCode(@Param('itemCode') itemCode: string) {
    return this.skusService.findByItemCode(itemCode);
  }

  // ─── Get Master Data by Item Code ──────────────────────────────────────────
  @Get('master/:itemCode')
  @HttpCode(HttpStatus.OK)
  async getMasterData(@Param('itemCode') itemCode: string) {
    return this.skusService.getMasterData(itemCode);
  }

  // ─── Get Approved Makes ────────────────────────────────────────────────────
  @Get('approved-makes/:skuId')
  @HttpCode(HttpStatus.OK)
  async getApprovedMakes(@Param('skuId') skuId: string) {
    const makes = await this.skusService.getApprovedMakes(skuId);
    return { skuId, approvedMakes: makes };
  }

  // ─── Find by Category ──────────────────────────────────────────────────────
  @Get('category/:category')
  @HttpCode(HttpStatus.OK)
  async findByCategory(
    @Param('category') category: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? Math.max(0, parseInt(skip)) : 0;
    const takeNum = Math.min(take ? parseInt(take) : 25, 100);
    const result = await this.skusService.findAll(skipNum, takeNum, category);
    return result.data;
  }

  // ─── Find by Status ────────────────────────────────────────────────────────
  @Get('status/:status')
  @HttpCode(HttpStatus.OK)
  async findByStatus(
    @Param('status') status: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? Math.max(0, parseInt(skip)) : 0;
    const takeNum = Math.min(take ? parseInt(take) : 25, 100);
    const result = await this.skusService.findAll(
      skipNum,
      takeNum,
      undefined,
      undefined,
      status,
    );
    return result.data;
  }

  // ─── Bulk Import & Export ───────────────────────────────────────────────────
  // NOTE: These MUST be above @Get(':id') to prevent NestJS from
  //       matching 'export' or 'import' as the :id parameter.

  @Get('export/template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.skusImportService.generateTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="IFH_One_SKUs_Import_Template.xlsx"',
    });
    res.send(buffer);
  }

  @Get('export/skus')
  async exportSKUs(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('uom') uom?: string,
    @Query('duplicatesOnly') duplicatesOnly?: string,
    @Query('recentlyViewed') recentlyViewed?: string,
    @Query('frequentlyUsed') frequentlyUsed?: string,
    @Req() req?: any,
    @Res() res?: Response,
  ) {
    // Re-use findAll with massive take to get all matching
    const result = await this.skusService.findAll(
      0,
      50000,
      search,
      category,
      status,
      uom,
      'itemCode',
      'asc',
      duplicatesOnly === 'true',
    );

    const skus = result.data || [];
    const buffer = await this.skusImportService.exportItems(skus);

    res!.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="IFH_One_SKUs_Export.xlsx"',
    });
    res!.send(buffer);
  }

  @Post('import/validate')
  @UseInterceptors(FileInterceptor('file'))
  async validateImport(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.skusImportService.parseAndValidate(
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
    return this.skusImportService.executeImport(
      userId,
      body.fileName,
      body.validRecords,
      body.duplicateStrategy,
    );
  }

  // ─── Get One ────────────────────────────────────────────────────────────────
  // NOTE: :id wildcard MUST be the LAST GET route to prevent it from
  //       swallowing named routes like 'export/template', 'search', etc.
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.skusService.findById(id);
  }

  // ─── Get Insights ───────────────────────────────────────────────────────────
  @Get(':id/insights')
  @HttpCode(HttpStatus.OK)
  async getInsights(@Param('id') id: string) {
    return this.skusService.getInsights(id);
  }

  // ─── Create ─────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    return this.skusService.create(body);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.skusService.update(id, body);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.skusService.delete(id);
  }
}
