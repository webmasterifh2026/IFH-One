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
import { BulkPoCreationDto, PoApprovalActionDto } from './dto/po-creation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get('creation/queue')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get PO Creation queue' })
  getPoCreationQueue(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.getPoCreationQueue(
      search,
      status,
      projectId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Post('creation/bulk-update')
  @RequirePermissions('purchase_orders.edit')
  @ApiOperation({
    summary: 'Bulk update PO Creation - assign PO numbers and remarks',
  })
  bulkUpdatePoCreation(@Body() dto: BulkPoCreationDto, @Request() req: any) {
    return this.purchaseOrdersService.bulkUpdatePoCreation(dto, req.user.id);
  }

  @Get('creation/kpis')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get PO Creation KPIs' })
  getPoCreationKpis() {
    return this.purchaseOrdersService.getPoCreationKpis();
  }

  @Get('approval-l1/queue')
  @RequirePermissions('purchase_orders.approve_l1')
  @ApiOperation({ summary: 'Get PO Approval Level 1 queue' })
  getPoApprovalL1Queue(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.getPoApprovalL1Queue(
      search,
      status,
      projectId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Post('approval-l1/:itemId/action')
  @RequirePermissions('purchase_orders.approve_l1')
  @ApiOperation({ summary: 'Approve or Reject PO at Level 1' })
  poApprovalL1Action(
    @Param('itemId') itemId: string,
    @Body() dto: PoApprovalActionDto,
    @Request() req: any,
  ) {
    return this.purchaseOrdersService.poApprovalL1Action(
      itemId,
      dto,
      req.user.id,
    );
  }

  @Get('approval-l1/kpis')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get PO Approval Level 1 KPIs' })
  getPoApprovalL1Kpis() {
    return this.purchaseOrdersService.getPoApprovalL1Kpis();
  }

  @Get('approval-l2/queue')
  @RequirePermissions('purchase_orders.approve_l2')
  @ApiOperation({ summary: 'Get PO Approval Level 2 queue' })
  getPoApprovalL2Queue(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.getPoApprovalL2Queue(
      search,
      status,
      projectId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Post('approval-l2/:itemId/action')
  @RequirePermissions('purchase_orders.approve_l2')
  @ApiOperation({ summary: 'Approve or Reject PO at Level 2 (Final)' })
  poApprovalL2Action(
    @Param('itemId') itemId: string,
    @Body() dto: PoApprovalActionDto,
    @Request() req: any,
  ) {
    return this.purchaseOrdersService.poApprovalL2Action(
      itemId,
      dto,
      req.user.id,
    );
  }

  @Get('approval-l2/kpis')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get PO Approval Level 2 KPIs' })
  getPoApprovalL2Kpis() {
    return this.purchaseOrdersService.getPoApprovalL2Kpis();
  }

  @Get('vendor-acceptance/queue')
  @RequirePermissions('purchase_orders.vendor_acceptance')
  @ApiOperation({ summary: 'Get Vendor Acceptance queue (S9)' })
  getVendorAcceptanceQueue(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.getVendorAcceptanceQueue(
      search,
      status,
      projectId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Post('vendor-acceptance/:itemId/action')
  @RequirePermissions('purchase_orders.vendor_acceptance')
  @ApiOperation({ summary: 'Accept or Reject PO at Vendor Acceptance (S9)' })
  vendorAcceptanceAction(
    @Param('itemId') itemId: string,
    @Body() body: { action: 'ACCEPTED' | 'REJECTED'; remarks?: string },
    @Request() req: any,
  ) {
    return this.purchaseOrdersService.vendorAcceptanceAction(
      itemId,
      body.action,
      body.remarks,
      req.user.id,
    );
  }

  @Get('vendor-acceptance/kpis')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get Vendor Acceptance KPIs' })
  getVendorAcceptanceKpis() {
    return this.purchaseOrdersService.getVendorAcceptanceKpis();
  }

  @Get('vendor-followup/queue')
  @RequirePermissions('purchase_orders.vendor_followup')
  @ApiOperation({ summary: 'Get Vendor Follow-up queue (S10)' })
  getVendorFollowupQueue(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.getVendorFollowupQueue(
      search,
      status,
      projectId,
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Post('vendor-followup/:itemId/action')
  @RequirePermissions('purchase_orders.vendor_followup')
  @ApiOperation({ summary: 'Update Vendor Follow-up status (S10)' })
  vendorFollowupAction(
    @Param('itemId') itemId: string,
    @Body()
    body: {
      action: 'COMPLETED' | 'DELAYED' | 'REJECTED';
      vendorAgreedDate?: string;
      crmRemarks?: string;
      rejectionReason?: string;
    },
    @Request() req: any,
  ) {
    const data: any = {};
    if (body.vendorAgreedDate)
      data.vendorAgreedDate = new Date(body.vendorAgreedDate);
    if (body.crmRemarks) data.crmRemarks = body.crmRemarks;
    if (body.rejectionReason) data.rejectionReason = body.rejectionReason;
    return this.purchaseOrdersService.vendorFollowupAction(
      itemId,
      body.action,
      data,
      req.user.id,
    );
  }

  @Get('vendor-followup/kpis')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Get Vendor Follow-up KPIs' })
  getVendorFollowupKpis() {
    return this.purchaseOrdersService.getVendorFollowupKpis();
  }

  @Get('view-full/:itemId')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'View full indent and lifecycle for a PO item' })
  getFullIndentView(@Param('itemId') itemId: string) {
    return this.purchaseOrdersService.getFullIndentView(itemId);
  }

  @Get('search')
  @RequirePermissions('purchase_orders.view')
  @ApiOperation({ summary: 'Search PO items across all stages' })
  searchPoItems(
    @Query('q') query: string,
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('poNumber') poNumber?: string,
    @Query('priority') priority?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.purchaseOrdersService.searchPoItems(query, {
      status,
      projectId,
      poNumber,
      priority,
      dateFrom,
      dateTo,
    });
  }
}
