import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Inspection Workflow')
@ApiBearerAuth()
@Controller('inspection')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InspectionController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get('level-1/queue')
  @RequirePermissions('purchase_orders.inspection')
  @ApiOperation({ summary: 'Get Inspection Level 1 (S12) queue' })
  getLevel1Queue(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.getInspectionQueue(
      1,
      search,
      status,
      projectId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Get('level-2/queue')
  @RequirePermissions('purchase_orders.inspection')
  @ApiOperation({ summary: 'Get Inspection Level 2 (S13) queue' })
  getLevel2Queue(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.getInspectionQueue(
      2,
      search,
      status,
      projectId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Get('level-3/queue')
  @RequirePermissions('purchase_orders.inspection')
  @ApiOperation({ summary: 'Get Inspection Level 3 (S14) queue' })
  getLevel3Queue(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.getInspectionQueue(
      3,
      search,
      status,
      projectId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Post('level-1/:itemId/action')
  @RequirePermissions('purchase_orders.inspection')
  @ApiOperation({ summary: 'QC action at Inspection Level 1 (S12)' })
  level1Action(
    @Param('itemId') itemId: string,
    @Body() body: { qcResult: 'APPROVED' | 'REJECTED'; remarks?: string },
    @Request() req: any,
  ) {
    return this.purchaseOrdersService.inspectionAction(
      itemId,
      1,
      body.qcResult,
      body.remarks,
      req.user.id,
    );
  }

  @Post('level-2/:itemId/action')
  @RequirePermissions('purchase_orders.inspection')
  @ApiOperation({ summary: 'QC action at Inspection Level 2 (S13)' })
  level2Action(
    @Param('itemId') itemId: string,
    @Body() body: { qcResult: 'APPROVED' | 'REJECTED'; remarks?: string },
    @Request() req: any,
  ) {
    return this.purchaseOrdersService.inspectionAction(
      itemId,
      2,
      body.qcResult,
      body.remarks,
      req.user.id,
    );
  }

  @Post('level-3/:itemId/action')
  @RequirePermissions('purchase_orders.inspection')
  @ApiOperation({ summary: 'QC action at Inspection Level 3 (S14) - Final' })
  level3Action(
    @Param('itemId') itemId: string,
    @Body() body: { qcResult: 'APPROVED' | 'REJECTED'; remarks?: string },
    @Request() req: any,
  ) {
    return this.purchaseOrdersService.inspectionAction(
      itemId,
      3,
      body.qcResult,
      body.remarks,
      req.user.id,
    );
  }

  @Get('level-1/kpis')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get Inspection Level 1 KPIs' })
  getLevel1Kpis() {
    return this.purchaseOrdersService.getInspectionKpis(1);
  }

  @Get('level-2/kpis')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get Inspection Level 2 KPIs' })
  getLevel2Kpis() {
    return this.purchaseOrdersService.getInspectionKpis(2);
  }

  @Get('level-3/kpis')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get Inspection Level 3 KPIs' })
  getLevel3Kpis() {
    return this.purchaseOrdersService.getInspectionKpis(3);
  }
}
