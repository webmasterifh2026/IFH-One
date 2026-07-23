import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RfqFloatService } from './rfq-float.service';
import {
  CreateRfqFloatDto,
  QuickVendorDto,
  StartNegotiationDto,
  UpdateNegotiationDto,
} from './dto/rfq-float.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('rfq-float')
@UseGuards(JwtAuthGuard)
export class RfqFloatController {
  constructor(private readonly rfqFloatService: RfqFloatService) {}

  // ─── Create RFQ Float ────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRfqFloatDto, @Request() req: any) {
    const userId = req.user?.sub;
    return this.rfqFloatService.createRfqFloat(dto, userId);
  }

  // ─── List All ────────────────────────────────────────────────────────────
  @Get()
  async findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.rfqFloatService.findAll(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 10,
      search,
      status,
      sortBy,
      sortOrder,
    );
  }

  // ─── Get One ─────────────────────────────────────────────────────────────
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.rfqFloatService.findOne(id);
  }

  // ─── Get by RFQ Number ──────────────────────────────────────────────────
  @Get('by-number/:rfqNumber')
  async findByRfqNumber(@Param('rfqNumber') rfqNumber: string) {
    return this.rfqFloatService.findByRfqNumber(rfqNumber);
  }

  // ─── Quick Vendor Creation ───────────────────────────────────────────────
  @Post('quick-vendor')
  @HttpCode(HttpStatus.CREATED)
  async createQuickVendor(@Body() dto: QuickVendorDto) {
    return this.rfqFloatService.createQuickVendor(dto);
  }

  // ─── Send RFQ to Vendors ────────────────────────────────────────────────
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  async sendToVendors(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub;
    return this.rfqFloatService.sendToVendors(id, userId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TCE Endpoints
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Get TCE by RFQ Float ───────────────────────────────────────────────
  @Get(':id/tce')
  async getTCEByRfqFloat(@Param('id') id: string) {
    return this.rfqFloatService.getTCEByRfqFloat(id);
  }

  // ─── Get TCE Comparison ─────────────────────────────────────────────────
  @Get(':id/tce/comparison')
  async getTCEComparison(
    @Param('id') id: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.rfqFloatService.getTCEComparison(id, { sortBy, sortOrder });
  }

  @Get(':id/tce/search')
  async searchTCE(@Param('id') id: string, @Query() filters: any) {
    return this.rfqFloatService.searchTCE({ ...filters, rfqFloatId: id });
  }

  @Get(':id/tce/export')
  async exportTCEToCSV(@Param('id') id: string) {
    const csv = await this.rfqFloatService.exportTCEToCSV(id);
    return { csv };
  }

  @Post(':id/refloat')
  @HttpCode(HttpStatus.CREATED)
  async refloatRFQ(
    @Param('id') id: string,
    @Body() body: { vendorIds: string[]; nextSendDate: Date; remarks?: string },
    @Request() req: any,
  ) {
    return this.rfqFloatService.refloatRFQ(id, body, req.user?.sub);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Negotiation Endpoints
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Start Negotiation ──────────────────────────────────────────────────
  @Post(':id/negotiations')
  @HttpCode(HttpStatus.CREATED)
  async startNegotiation(
    @Param('id') id: string,
    @Body() dto: StartNegotiationDto,
  ) {
    return this.rfqFloatService.startNegotiation(id, dto);
  }

  // ─── Get Negotiations ───────────────────────────────────────────────────
  @Get(':id/negotiations')
  async getNegotiations(@Param('id') id: string) {
    return this.rfqFloatService.getNegotiationsByRfqFloat(id);
  }

  // ─── Update Negotiation ─────────────────────────────────────────────────
  @Patch('negotiations/:negotiationId')
  async updateNegotiation(
    @Param('negotiationId') negotiationId: string,
    @Body() dto: UpdateNegotiationDto,
  ) {
    return this.rfqFloatService.updateNegotiation(negotiationId, dto);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Activity & Email Logs
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Get Activity Logs ──────────────────────────────────────────────────
  @Get(':id/activity-logs')
  async getActivityLogs(@Param('id') id: string) {
    return this.rfqFloatService.getActivityLogs(id);
  }

  // ─── Get Email Logs ─────────────────────────────────────────────────────
  @Get(':id/email-logs')
  async getEmailLogs(@Param('id') id: string) {
    return this.rfqFloatService.getEmailLogs(id);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Vendor Portal (Public - No Auth Required)
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Get Vendor Quotation Form ──────────────────────────────────────────
  @Get('vendor-portal/:rfqNumber/:vendorId')
  @Public()
  async getVendorPortalForm(
    @Param('rfqNumber') rfqNumber: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.rfqFloatService.getVendorPortalForm(rfqNumber, vendorId);
  }

  // ─── Submit Vendor Quotation (creates TCE) ──────────────────────────────
  @Post('vendor-portal/:rfqNumber/:vendorId/submit')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async submitVendorPortalQuotation(
    @Param('rfqNumber') rfqNumber: string,
    @Param('vendorId') vendorId: string,
    @Body() dto: any,
  ) {
    return this.rfqFloatService.submitVendorPortalQuotation(
      rfqNumber,
      vendorId,
      dto,
    );
  }
}
