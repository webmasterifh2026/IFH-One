import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { StageActionDto } from './dto/stage-action.dto';
import { AddRemarkDto } from './dto/add-remark.dto';
import { BulkStageActionDto } from './dto/bulk-stage-action.dto';
import { BulkMultiStageActionDto } from './dto/bulk-multi-stage-action.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { SlaEngineService } from './sla/sla-engine.service';
import { EscalationEngineService } from './sla/escalation-engine.service';

const BULK_UPDATE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOER'];

@Controller('procurement')
export class ProcurementController {
  constructor(
    private readonly procurementService: ProcurementService,
    private readonly slaEngine: SlaEngineService,
    private readonly escalationEngine: EscalationEngineService,
  ) {}

  // ─── Dashboard Stats ──────────────────────────────────────────────────────
  @Get('dashboard-stats')
  getDashboardStats(@Request() req: any) {
    const userId = req.user?.sub;
    const roles = req.user?.roles || [];
    return this.procurementService.getDashboardStats(userId, roles);
  }

  // ─── SLA Dashboard Summary ───────────────────────────────────────────────
  @Get('sla-summary')
  getSlaSummary() {
    return this.slaEngine.getSlaDashboardSummary();
  }

  // ─── Escalation summary (Control Tower) ─────────────────────────────────
  @Get('escalation-summary')
  getEscalationSummary() {
    return this.escalationEngine.getEscalationSummary();
  }

  // ─── Aggregate Endpoints ──────────────────────────────────────────────────
  @Get('command-center')
  getCommandCenter() {
    return this.procurementService.getCommandCenter();
  }

  @Get('control-tower')
  getControlTower() {
    return this.procurementService.getControlTower();
  }

  @Get('pending-analytics')
  getPendingAnalytics() {
    return this.procurementService.getPendingAnalytics();
  }

  @Get('lifecycle')
  getLifecycle(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.procurementService.getLifecycle({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
      status,
    });
  }

  // ─── Bulk Stage Update: Preview (must come before /bulk-action) ──────────
  @Post('bulk-action/preview')
  @HttpCode(HttpStatus.OK)
  @Roles(...BULK_UPDATE_ROLES)
  previewBulkStageAction(@Body() dto: BulkStageActionDto) {
    return this.procurementService.previewBulkStageAction(dto);
  }

  // ─── Bulk Stage Update: Multi-Execute (must come before /bulk-action) ────
  @Post('bulk-action/multi')
  @HttpCode(HttpStatus.OK)
  @Roles(...BULK_UPDATE_ROLES)
  bulkMultiStageAction(
    @Body() dto: BulkMultiStageActionDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    const ipAddress =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    return this.procurementService.bulkMultiStageAction(dto, userId, ipAddress);
  }

  // ─── Bulk Stage Update: Execute ──────────────────────────────────────────
  @Post('bulk-action')
  @HttpCode(HttpStatus.OK)
  @Roles(...BULK_UPDATE_ROLES)
  bulkStageAction(@Body() dto: BulkStageActionDto, @Request() req: any) {
    const userId = req.user?.sub;
    const ipAddress =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress;
    return this.procurementService.bulkStageAction(dto, userId, ipAddress);
  }

  // ─── Stage KPIs (must come before :id wildcard) ───────────────────────────
  @Get('stage-kpis/:stage')
  getStageKPIs(@Param('stage', ParseIntPipe) stage: number) {
    return this.procurementService.getStageKPIs(stage);
  }

  // ─── List ─────────────────────────────────────────────────────────────────
  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('projectId') projectId?: string,
  ) {
    const userId = req.user?.sub;
    const roles = req.user?.roles || [];
    return this.procurementService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      status,
      stage: stage !== undefined ? parseInt(stage) : undefined,
      projectId,
      userId,
      roles,
    });
  }

  // ─── Create ───────────────────────────────────────────────────────────────
  @Post()
  create(@Body() dto: CreateProcurementDto, @Request() req: any) {
    const userId = req.user?.sub;
    return this.procurementService.create(dto, userId);
  }

  // ─── SLA records for a single indent (before :id wildcard action routes) ─
  @Get(':id/sla')
  getSlaRecords(@Param('id') id: string) {
    return this.slaEngine.getSlaRecordsForProcurement(id);
  }

  // ─── Get One ──────────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.procurementService.findOne(id);
  }

  // ─── Update Draft ─────────────────────────────────────────────────────────
  @Post(':id/draft')
  updateDraft(
    @Param('id') id: string,
    @Body() dto: CreateProcurementDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.procurementService.updateDraft(id, dto, userId);
  }

  // ─── Stage Action ─────────────────────────────────────────────────────────
  @Post(':id/action')
  @HttpCode(HttpStatus.OK)
  stageAction(
    @Param('id') id: string,
    @Body() dto: StageActionDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.procurementService.stageAction(id, dto, userId);
  }

  // ─── Add Remark ───────────────────────────────────────────────────────────
  @Post(':id/remarks')
  addRemark(
    @Param('id') id: string,
    @Body() dto: AddRemarkDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.procurementService.addRemark(id, dto, userId);
  }

  // ─── Get Remarks ──────────────────────────────────────────────────────────
  @Get(':id/remarks')
  getRemarks(@Param('id') id: string) {
    return this.procurementService.getRemarks(id);
  }

  // ─── Get History ──────────────────────────────────────────────────────────
  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.procurementService.getHistory(id);
  }

  // ─── Assign Stage ─────────────────────────────────────────────────────────
  @Post(':id/assign/:stageNumber')
  @HttpCode(HttpStatus.OK)
  assignStage(
    @Param('id') id: string,
    @Param('stageNumber', ParseIntPipe) stageNumber: number,
    @Body('assignedToId') assignedToId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.procurementService.assignStage(
      id,
      stageNumber,
      assignedToId,
      userId,
    );
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @Body('remarks') remarks: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.procurementService.cancel(id, remarks, userId);
  }

  // ─── Delete Draft ─────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteDraft(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub;
    return this.procurementService.deleteDraft(id, userId);
  }

  // ─── Duplicate Draft ──────────────────────────────────────────────────────
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  duplicateDraft(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub;
    return this.procurementService.duplicateDraft(id, userId);
  }
}
