import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { GateEntryService } from './gate-entry.service';
import { GateEntryDashboardService } from './gate-entry-dashboard.service';
import {
  CreateGateEntryDto,
  SubmitQuantityCheckDto,
} from './dto/gate-entry.dto';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('gate-entry')
export class GateEntryController {
  constructor(
    private readonly gateEntryService: GateEntryService,
    private readonly dashboardService: GateEntryDashboardService,
  ) {}

  @Get('search-po')
  @RequirePermissions('gate_entry.create')
  searchPO(@Query('q') query: string) {
    return this.gateEntryService.searchPO(query);
  }

  @Get()
  @RequirePermissions('gate_entry.view')
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gateEntryService.findAll({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('dashboard')
  @RequirePermissions('gate_entry.view')
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Get(':id')
  @RequirePermissions('gate_entry.view')
  findOne(@Param('id') id: string) {
    return this.gateEntryService.findOne(id);
  }

  @Post()
  @RequirePermissions('gate_entry.create')
  createGateEntry(@Body() dto: CreateGateEntryDto, @Request() req: any) {
    return this.gateEntryService.createGateEntry(dto, req.user.sub);
  }

  @Post(':id/quantity-check')
  @RequirePermissions('gate_entry.quantity_check')
  submitQuantityCheck(
    @Param('id') id: string,
    @Body() dto: SubmitQuantityCheckDto,
    @Request() req: any,
  ) {
    return this.gateEntryService.submitQuantityCheck(id, dto, req.user.sub);
  }
}
