import { Injectable, NotFoundException } from '@nestjs/common';
import { VendorsDbService } from './vendors-db.service';
import { VendorCreateDto, VendorUpdateDto, VendorStatus } from './dto';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(
    private vendorsDb: VendorsDbService,
    private prisma: PrismaService,
  ) {}

  // ─── Find All ──────────────────────────────────────────────────────────────
  async findAll(
    skip = 0,
    take = 10,
    search?: string,
    status?: VendorStatus,
    sortBy: string = 'vendorName',
    sortOrder: 'asc' | 'desc' = 'asc',
    createdFrom?: string,
    createdTo?: string,
  ) {
    try {
      return await this.vendorsDb.findAll(
        skip,
        take,
        search,
        status,
        sortBy,
        sortOrder,
        createdFrom,
        createdTo,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Vendor service error: ${msg}`);
    }
  }

  // ─── Find One ──────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const vendor = await this.vendorsDb.findByCode(id);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }
    return vendor;
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async create(dto: VendorCreateDto) {
    return this.vendorsDb.create(dto);
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  async update(id: string, dto: VendorUpdateDto) {
    return this.vendorsDb.update(id, dto);
  }

  // ─── Delete ────────────────────────────────────────────────────────────────
  async delete(id: string) {
    return this.vendorsDb.delete(id);
  }

  // ─── Update Status ─────────────────────────────────────────────────────────
  async updateStatus(id: string, status: VendorStatus) {
    return this.vendorsDb.updateStatus(id, status);
  }

  // ─── Get Performance Metrics ────────────────────────────────────────────────
  async getPerformance(id: string) {
    const vendor = await this.findOne(id);

    // Performance metrics would be calculated from RFQ data
    // For now, returning basic vendor performance structure
    return {
      vendor,
      performance: {
        totalRfqs: 0,
        respondedRfqs: 0,
        declinedRfqs: 0,
        pendingRfqs: 0,
        responseRate: 0,
        status: vendor.status,
      },
    };
  }

  // ─── Get Vendor Insights ────────────────────────────────────────────────────
  async getInsights(id: string) {
    const vendor = await this.findOne(id);
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // A Purchase Order in this system maps to a Procurement with currentStage >= 7 (usually 7 is PO).
    // An indent is basically a Procurement record itself.
    const procurements = await this.prisma.procurement.findMany({
      where: {
        OR: [{ vendorId: id }, { vendorName: vendor.vendorName }],
      },
      include: {
        items: true,
      },
    });

    const totalIndents = procurements.length;
    let totalPurchaseOrders = 0;
    let totalQuantityOrdered = 0;

    // Sort procurements by createdAt DESC to find last order date and recent items
    const sortedProc = procurements.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const lastOrderDate =
      sortedProc.length > 0 ? sortedProc[0].createdAt : null;

    const allItems: any[] = [];

    for (const proc of procurements) {
      // Assuming currentStage >= 7 is when a PO is issued
      if (proc.currentStage >= 7) {
        totalPurchaseOrders++;
      }

      for (const item of proc.items) {
        // sum only valid numeric quantities
        if (item.quantity) {
          totalQuantityOrdered += Number(item.quantity);
        }

        allItems.push({
          itemName: item.itemName,
          itemCode: item.itemCode,
          quantity: Number(item.quantity || 0),
          createdAt: proc.createdAt,
        });
      }
    }

    // Calculate most ordered items
    const itemFreq: Record<
      string,
      { count: number; name: string; code: string }
    > = {};
    for (const item of allItems) {
      const key = item.itemCode || item.itemName;
      if (!itemFreq[key]) {
        itemFreq[key] = { count: 0, name: item.itemName, code: item.itemCode };
      }
      itemFreq[key].count += item.quantity;
    }

    const mostOrderedItems = Object.values(itemFreq)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((i) => i.name);

    // Recently ordered items
    const recentlyOrderedItems = allItems
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((i) => i.itemName);

    return {
      vendor,
      insights: {
        totalIndents,
        totalPurchaseOrders,
        totalQuantityOrdered,
        lastOrderDate,
        mostOrderedItems,
        recentlyOrderedItems,
      },
    };
  }
}
