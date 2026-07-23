import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VendorsDbService } from '../vendors/vendors-db.service';
import {
  RfqCreateDto,
  RfqUpdateDto,
  RFQStatus,
  RFQType,
  VendorResponseStatus,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RfqsService {
  constructor(
    private prisma: PrismaService,
    private vendorsDb: VendorsDbService,
  ) {}

  // ─── Generate RFQ Number ───────────────────────────────────────────────────
  private async generateRfqNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.rFQ.count({
      where: { rfqNumber: { startsWith: `RFQ-${year}-${month}-` } },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `RFQ-${year}-${month}-${seq}`;
  }

  // ─── Find All ──────────────────────────────────────────────────────────────
  async findAll(
    skip = 0,
    take = 10,
    search?: string,
    status?: RFQStatus,
    rfqType?: RFQType,
    indentId?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    if (take > 100) take = 100;

    const where: Prisma.RFQWhereInput = {};

    if (search) {
      where.OR = [
        { rfqNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (rfqType) where.rfqType = rfqType;
    if (indentId) where.indentId = indentId;

    const [data, total] = await Promise.all([
      this.prisma.rFQ.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          indent: true,
          items: true,
          vendors: true,
          createdBy: true,
        },
      }),
      this.prisma.rFQ.count({ where }),
    ]);

    return {
      data,
      pagination: { skip, take, total, pages: Math.ceil(total / take) },
    };
  }

  // ─── Find One ──────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id },
      include: {
        indent: true,
        items: true,
        vendors: true,
        createdBy: true,
        attachments: true,
        remarks: true,
        history: true,
      },
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ with ID ${id} not found`);
    }

    return rfq;
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async create(dto: RfqCreateDto, userId: string) {
    const indent = await this.prisma.procurement.findUnique({
      where: { id: dto.indentId },
      include: { items: true },
    });

    if (!indent) {
      throw new NotFoundException(`Indent with ID ${dto.indentId} not found`);
    }

    const rfqNumber = await this.generateRfqNumber();

    const rfq = await this.prisma.rFQ.create({
      data: {
        rfqNumber,
        indentId: dto.indentId,
        title: dto.title || indent.title,
        description: dto.description || indent.description,
        rfqType: dto.rfqType || RFQType.OPEN,
        status: RFQStatus.DRAFT,
        submissionDeadline: dto.submissionDeadline,
        expectedDelivery: dto.expectedDelivery,
        commercialTerms: dto.commercialTerms,
        deliveryTerms: dto.deliveryTerms,
        paymentTerms: dto.paymentTerms,
        warrantyReqs: dto.warrantyReqs,
        specialInstructions: dto.specialInstructions,
        createdById: userId,
        items: {
          create: indent.items.map((item) => ({
            indentItemId: item.id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            technicalSpec: item.technicalSpec,
            approvedMakes: item.approvedMakes,
          })),
        },
        history: {
          create: {
            action: 'CREATED',
            description: `RFQ ${rfqNumber} created from indent`,
            performedById: userId,
          },
        },
      },
      include: {
        indent: true,
        items: true,
        vendors: true,
        createdBy: true,
        history: true,
      },
    });

    return rfq;
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  async update(id: string, dto: RfqUpdateDto, userId: string) {
    const rfq = await this.findOne(id);

    if (rfq.status !== RFQStatus.DRAFT) {
      throw new BadRequestException('Can only update RFQs in DRAFT status');
    }

    const updated = await this.prisma.rFQ.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.submissionDeadline && {
          submissionDeadline: dto.submissionDeadline,
        }),
        ...(dto.expectedDelivery && { expectedDelivery: dto.expectedDelivery }),
        ...(dto.commercialTerms && { commercialTerms: dto.commercialTerms }),
        ...(dto.deliveryTerms && { deliveryTerms: dto.deliveryTerms }),
        ...(dto.paymentTerms && { paymentTerms: dto.paymentTerms }),
        ...(dto.warrantyReqs && { warrantyReqs: dto.warrantyReqs }),
        ...(dto.specialInstructions && {
          specialInstructions: dto.specialInstructions,
        }),
      },
      include: {
        indent: true,
        items: true,
        vendors: true,
        createdBy: true,
      },
    });

    await this.prisma.rFQHistory.create({
      data: {
        rfqId: id,
        action: 'MODIFIED',
        description: 'RFQ details updated',
        performedById: userId,
      },
    });

    return updated;
  }

  // ─── Update Status ─────────────────────────────────────────────────────────
  async updateStatus(id: string, status: RFQStatus, userId: string) {
    const rfq = await this.findOne(id);

    if (status === RFQStatus.CLOSED && rfq.vendors.length === 0) {
      throw new BadRequestException('Cannot close RFQ without vendors');
    }

    const updated = await this.prisma.rFQ.update({
      where: { id },
      data: { status },
      include: { indent: true, items: true, vendors: true, createdBy: true },
    });

    await this.prisma.rFQHistory.create({
      data: {
        rfqId: id,
        action: 'STATUS_CHANGED',
        description: `RFQ status changed to ${status}`,
        performedById: userId,
        metadata: JSON.stringify({
          previousStatus: rfq.status,
          newStatus: status,
        }),
      },
    });

    return updated;
  }

  // ─── Add Vendor ────────────────────────────────────────────────────────────
  async addVendor(rfqId: string, vendorId: string, userId: string) {
    const rfq = await this.findOne(rfqId);

    // vendorId is now numeric (from vendors_db)
    const numericVendorId = parseInt(vendorId, 10);
    if (isNaN(numericVendorId)) {
      throw new BadRequestException('Invalid vendor ID');
    }

    const vendor = await this.vendorsDb.findOne(numericVendorId);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    // Check if vendor already added (vendorId is now number)
    const existingVendor = rfq.vendors.find(
      (v) => v.vendorId === numericVendorId.toString(),
    );
    if (existingVendor) {
      throw new BadRequestException('Vendor already added to this RFQ');
    }

    const rfqVendor = await this.prisma.rFQVendor.create({
      data: {
        rfqId,
        vendorId: numericVendorId.toString(), // Store as string in Prisma
        vendorName: vendor.vendorName,
        vendorCode: vendor.vendorCode,
        contactPerson: vendor.contact || vendor.vendorName,
        email: vendor.email,
        phone: vendor.contact,
        status: VendorResponseStatus.PENDING,
      },
    });

    await this.prisma.rFQHistory.create({
      data: {
        rfqId,
        action: 'VENDOR_ADDED',
        description: `Vendor ${vendor.vendorName} added to RFQ`,
        performedById: userId,
      },
    });

    return rfqVendor;
  }

  // ─── Remove Vendor ─────────────────────────────────────────────────────────
  async removeVendor(rfqId: string, vendorId: string, userId: string) {
    const rfqVendor = await this.prisma.rFQVendor.findFirst({
      where: { rfqId, vendorId },
    });

    if (!rfqVendor) {
      throw new NotFoundException('Vendor not found in this RFQ');
    }

    await this.prisma.rFQVendor.delete({ where: { id: rfqVendor.id } });

    await this.prisma.rFQHistory.create({
      data: {
        rfqId,
        action: 'VENDOR_REMOVED',
        description: `Vendor ${rfqVendor.vendorName} removed from RFQ`,
        performedById: userId,
      },
    });

    return { message: 'Vendor removed successfully' };
  }

  // ─── Send RFQ to Vendors ───────────────────────────────────────────────────
  async sendToVendors(rfqId: string, userId: string) {
    const rfq = await this.findOne(rfqId);

    if (rfq.vendors.length === 0) {
      throw new BadRequestException('Add vendors before sending RFQ');
    }

    const updated = await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: { status: RFQStatus.SENT },
      include: { vendors: true },
    });

    await this.prisma.rFQVendor.updateMany({
      where: { rfqId },
      data: { status: VendorResponseStatus.SENT, sentDate: new Date() },
    });

    await this.prisma.rFQHistory.create({
      data: {
        rfqId,
        action: 'SENT',
        description: `RFQ sent to ${rfq.vendors.length} vendors`,
        performedById: userId,
        metadata: JSON.stringify({ vendorCount: rfq.vendors.length }),
      },
    });

    return updated;
  }

  // ─── Update Vendor Response Status ──────────────────────────────────────────
  async updateVendorResponse(
    rfqId: string,
    vendorId: string,
    status: VendorResponseStatus,
    userId: string,
  ) {
    const rfqVendor = await this.prisma.rFQVendor.findFirst({
      where: { rfqId, vendorId },
    });

    if (!rfqVendor) {
      throw new NotFoundException('Vendor not found in this RFQ');
    }

    const updated = await this.prisma.rFQVendor.update({
      where: { id: rfqVendor.id },
      data: {
        status,
        ...(status === VendorResponseStatus.VIEWED && { sentDate: new Date() }),
      },
    });

    await this.prisma.rFQHistory.create({
      data: {
        rfqId,
        action: 'VENDOR_RESPONSE',
        description: `Vendor ${rfqVendor.vendorName} response status updated to ${status}`,
        performedById: userId,
      },
    });

    return updated;
  }

  // ─── Get Vendor Responses ──────────────────────────────────────────────────
  async getVendorResponses(rfqId: string) {
    const rfq = await this.findOne(rfqId);

    const responses = {
      total: rfq.vendors.length,
      responded: rfq.vendors.filter(
        (v) => v.status === VendorResponseStatus.RESPONDED,
      ).length,
      pending: rfq.vendors.filter(
        (v) => v.status === VendorResponseStatus.PENDING,
      ).length,
      declined: rfq.vendors.filter(
        (v) => v.status === VendorResponseStatus.DECLINED,
      ).length,
      sent: rfq.vendors.filter((v) => v.status === VendorResponseStatus.SENT)
        .length,
      viewed: rfq.vendors.filter(
        (v) => v.status === VendorResponseStatus.VIEWED,
      ).length,
      vendors: rfq.vendors,
    };

    return responses;
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  async delete(id: string, userId: string) {
    const rfq = await this.findOne(id);

    if (rfq.status !== RFQStatus.DRAFT) {
      throw new BadRequestException('Can only delete RFQs in DRAFT status');
    }

    await this.prisma.rFQ.delete({ where: { id } });

    return { message: 'RFQ deleted successfully' };
  }
}
