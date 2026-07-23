import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VendorCreateDto, VendorUpdateDto, VendorStatus } from './dto';

export interface VendorDbRecord {
  A: string; // Vendor ID
  B: string; // Vendor Name
  C?: string; // Email
  D?: string; // Contact
  E?: string; // Address
}

@Injectable()
export class VendorsDbService {
  private readonly logger = new Logger(VendorsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converts a DB Vendor record into the canonical API shape used by the
   * frontend. Single source of truth: vendorCode, vendorName, email, contact,
   * address, status, createdAt.
   */
  private recordToCamelCase(record: any, idx?: number) {
    return {
      id: record.id || idx || 0,
      vendorCode: record.vendorCode || record.A || '',
      vendorName: record.vendorName || record.B || '',
      email: record.email || record.C || '',
      contact: record.phone || record.contact || record.D || '', // Map phone DB field to contact API field
      address: record.address || record.E || '',
      status: record.status || 'ACTIVE',
      createdAt: record.createdAt ? record.createdAt.toISOString() : undefined,
    };
  }

  /**
   * Find all vendors with server-side pagination and search.
   * Supports filtering by status, date range, and search across multiple fields.
   */
  async findAll(
    skip = 0,
    take = 25,
    search?: string,
    status?: string,
    sortBy: string = 'vendorName',
    sortOrder: 'asc' | 'desc' = 'asc',
    createdFrom?: string,
    createdTo?: string,
  ) {
    // Clamp take to 25, 50, or 100
    const allowedSizes = [25, 50, 100];
    if (!allowedSizes.includes(take)) {
      take = allowedSizes.reduce((prev, curr) =>
        Math.abs(curr - take) < Math.abs(prev - take) ? curr : prev,
      );
    }

    try {
      this.logger.debug(
        `findAll called: skip=${skip}, take=${take}, search=${search}, status=${status}, sortBy=${sortBy}, sortOrder=${sortOrder}`,
      );

      let where: any = {};

      // Only add status filter if explicitly provided
      if (status && ['ACTIVE', 'INACTIVE', 'BLACKLISTED'].includes(status)) {
        where.status = status;
      }

      // Add date range filtering with safety checks
      if (createdFrom || createdTo) {
        where.createdAt = {};
        try {
          if (createdFrom) {
            const fromDate = new Date(createdFrom);
            if (!isNaN(fromDate.getTime())) {
              where.createdAt.gte = fromDate;
            }
          }
          if (createdTo) {
            const toDate = new Date(createdTo);
            if (!isNaN(toDate.getTime())) {
              toDate.setHours(23, 59, 59, 999);
              where.createdAt.lte = toDate;
            }
          }
        } catch (dateErr) {
          this.logger.warn(`Invalid date filter: ${dateErr}`);
        }
      }

      // Add search with null/empty safety
      if (search && search.trim().length > 0) {
        const searchTerm = search.trim();
        where = {
          ...where,
          OR: [
            { vendorCode: { contains: searchTerm, mode: 'insensitive' } },
            { vendorName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
            { address: { contains: searchTerm, mode: 'insensitive' } },
          ],
        };
      }

      // Standardize sort field names
      let orderByField = 'vendorName';
      const sortByLower = (sortBy || '').toLowerCase();
      if (
        sortByLower === 'a' ||
        sortByLower === 'vendor_id' ||
        sortByLower === 'vendorcode'
      ) {
        orderByField = 'vendorCode';
      } else if (
        sortByLower === 'b' ||
        sortByLower === 'vendor_name' ||
        sortByLower === 'vendorname'
      ) {
        orderByField = 'vendorName';
      } else if (sortByLower === 'c' || sortByLower === 'email') {
        orderByField = 'email';
      } else if (
        sortByLower === 'd' ||
        sortByLower === 'contact' ||
        sortByLower === 'phone'
      ) {
        orderByField = 'phone';
      } else if (sortByLower === 'e' || sortByLower === 'address') {
        orderByField = 'address';
      } else if (sortByLower === 'createdat') {
        orderByField = 'createdAt';
      } else if (sortByLower === 'status') {
        orderByField = 'status';
      }

      const finalSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';
      const orderBy = { [orderByField]: finalSortOrder };

      this.logger.debug(
        `Prisma query: where=${JSON.stringify(where)}, orderBy=${JSON.stringify(orderBy)}, skip=${skip}, take=${take}`,
      );

      const total = await this.prisma.vendor.count({ where });

      const records = await this.prisma.vendor.findMany({
        where,
        orderBy,
        skip,
        take,
      });

      this.logger.debug(
        `Query successful: found ${records.length} vendors (total: ${total})`,
      );

      const data = records.map((row: any, idx: number) =>
        this.recordToCamelCase(row, skip + idx),
      );

      const page = Math.floor(skip / take) + 1;
      return {
        data,
        meta: {
          total,
          page,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Error fetching vendors: ${errorMsg}`, errorStack);
      throw new Error(`Failed to fetch vendors: ${errorMsg}`);
    }
  }

  /**
   * Find a single vendor by offset index.
   */
  async findOne(id: number) {
    try {
      const records = await this.prisma.vendor.findMany({
        orderBy: { vendorCode: 'asc' },
        skip: id,
        take: 1,
      });

      if (records.length === 0) {
        throw new NotFoundException(`Vendor with index ${id} not found`);
      }

      return this.recordToCamelCase(records[0], id);
    } catch (error) {
      this.logger.error(`Error fetching vendor ${id}`, error);
      throw error;
    }
  }

  /**
   * Find vendor by vendor code.
   */
  async findByCode(vendorCode: string) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { vendorCode },
      });

      if (!vendor) {
        return null;
      }

      return this.recordToCamelCase(vendor);
    } catch (error) {
      this.logger.error(`Error fetching vendor by code ${vendorCode}`, error);
      throw error;
    }
  }

  /** CRUD Operations */

  async create(dto: VendorCreateDto) {
    const vendorCode = dto.vendorCode;
    const vendorName = dto.vendorName;

    if (!vendorCode || !vendorName) {
      throw new BadRequestException('Vendor Code and Vendor Name are required');
    }

    try {
      const existing = await this.prisma.vendor.findUnique({
        where: { vendorCode },
      });
      if (existing) {
        throw new BadRequestException(
          `Vendor with ID ${vendorCode} already exists`,
        );
      }

      const result = await this.prisma.vendor.create({
        data: {
          vendorCode,
          vendorName,
          email: dto.email || null,
          phone: dto.contact || null, // Map 'contact' DTO field to 'phone' DB field
          address: dto.address || null,
        },
      });

      return this.recordToCamelCase(result);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error creating vendor', error);
      throw error;
    }
  }

  async update(id: string, dto: VendorUpdateDto) {
    try {
      const existing = await this.findByCode(id);
      if (!existing) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      const vendorName =
        dto.vendorName !== undefined ? dto.vendorName : existing.vendorName;
      if (!vendorName) {
        throw new BadRequestException('Vendor Name cannot be empty');
      }

      // NOTE: vendorCode (Vendor ID) is IMMUTABLE and cannot be changed.
      // This ensures referential integrity across the system.
      // If a vendor code needs to change, the record must be deleted and recreated.
      const result = await this.prisma.vendor.update({
        where: { vendorCode: id },
        data: {
          vendorName,
          email: dto.email !== undefined ? dto.email : undefined,
          phone: dto.contact !== undefined ? dto.contact : undefined, // Map 'contact' DTO field to 'phone' DB field
          address: dto.address !== undefined ? dto.address : undefined,
          status: dto.status !== undefined ? dto.status : undefined,
        },
      });

      return this.recordToCamelCase(result);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error(`Error updating vendor ${id}`, error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const existing = await this.prisma.vendor.findUnique({
        where: { vendorCode: id },
      });

      if (!existing) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      const result = await this.prisma.vendor.delete({
        where: { vendorCode: id },
      });

      return this.recordToCamelCase(result);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error deleting vendor ${id}`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: VendorStatus) {
    try {
      const existing = await this.prisma.vendor.findUnique({
        where: { vendorCode: id },
      });

      if (!existing) {
        throw new NotFoundException(`Vendor with ID ${id} not found`);
      }

      const result = await this.prisma.vendor.update({
        where: { vendorCode: id },
        data: { status },
      });

      return this.recordToCamelCase(result);
    } catch (error) {
      this.logger.error(`Error updating vendor status ${id}`, error);
      throw error;
    }
  }

  async closeConnection() {
    // No-op for Prisma
  }
}
