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
import { RfqsService } from './rfqs.service';
import {
  RfqCreateDto,
  RfqUpdateDto,
  RFQStatus,
  RFQType,
  VendorResponseStatus,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('rfqs')
@UseGuards(JwtAuthGuard)
export class RfqsController {
  constructor(private readonly rfqsService: RfqsService) {}

  // ─── List All ──────────────────────────────────────────────────────────────
  @Get()
  findAll(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: RFQStatus,
    @Query('type') rfqType?: RFQType,
    @Query('indentId') indentId?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.rfqsService.findAll(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 10,
      search,
      status,
      rfqType,
      indentId,
      sortBy,
      sortOrder,
    );
  }

  // ─── Get One ────────────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rfqsService.findOne(id);
  }

  // ─── Get Vendor Responses ──────────────────────────────────────────────────
  @Get(':id/responses')
  getVendorResponses(@Param('id') id: string) {
    return this.rfqsService.getVendorResponses(id);
  }

  // ─── Create ─────────────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: RfqCreateDto, @Request() req: any) {
    const userId = req.user?.sub;
    return this.rfqsService.create(dto, userId);
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: RfqUpdateDto,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.rfqsService.update(id, dto, userId);
  }

  // ─── Update Status ──────────────────────────────────────────────────────────
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: RFQStatus,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.rfqsService.updateStatus(id, status, userId);
  }

  // ─── Send to Vendors ────────────────────────────────────────────────────────
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  sendToVendors(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub;
    return this.rfqsService.sendToVendors(id, userId);
  }

  // ─── Add Vendor ─────────────────────────────────────────────────────────────
  @Post(':id/vendors')
  @HttpCode(HttpStatus.CREATED)
  addVendor(
    @Param('id') id: string,
    @Body('vendorId') vendorId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.rfqsService.addVendor(id, vendorId, userId);
  }

  // ─── Remove Vendor ──────────────────────────────────────────────────────────
  @Delete(':id/vendors/:vendorId')
  removeVendor(
    @Param('id') id: string,
    @Param('vendorId') vendorId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.rfqsService.removeVendor(id, vendorId, userId);
  }

  // ─── Update Vendor Response Status ──────────────────────────────────────────
  @Patch(':id/vendors/:vendorId/response')
  updateVendorResponse(
    @Param('id') id: string,
    @Param('vendorId') vendorId: string,
    @Body('status') status: VendorResponseStatus,
    @Request() req: any,
  ) {
    const userId = req.user?.sub;
    return this.rfqsService.updateVendorResponse(id, vendorId, status, userId);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.sub;
    return this.rfqsService.delete(id, userId);
  }
}
