import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface SKURecord {
  id: string;
  itemCode: string;
  description: string;
  category?: string;
  subGroup?: string;
  uom: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SKUsService {
  private readonly logger = new Logger(SKUsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all SKUs with server-side pagination and search.
   */
  async findAll(
    skip: number = 0,
    take: number = 25,
    search?: string,
    category?: string,
    status?: string,
    uom?: string,
    sortBy: string = 'description',
    sortOrder: 'asc' | 'desc' = 'asc',
    duplicatesOnly: boolean = false,
    recentItemIds?: string[],
    frequentItemIds?: string[],
    subGroup?: string,
    userId?: string,
    quickFilter?: 'frequentlyOrdered' | 'recentlyOrdered' | 'latestAdded',
  ) {
    // Clamp take to 25, 50, 100 (and 50000 for bulk export)
    const allowedSizes = [25, 50, 100, 50000];
    if (!allowedSizes.includes(take)) {
      take = allowedSizes.reduce((prev, curr) =>
        Math.abs(curr - take) < Math.abs(prev - take) ? curr : prev,
      );
    }

    try {
      const where: any = {};

      // Search in itemCode and description
      if (search && search.trim()) {
        where.OR = [
          { itemCode: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      // Filter by category
      if (category && category.trim()) {
        where.category = { contains: category.trim(), mode: 'insensitive' };
      }

      // Filter by UOM
      if (uom && uom.trim()) {
        where.uom = { contains: uom.trim(), mode: 'insensitive' };
      }

      // Filter by Sub Group
      if (subGroup && subGroup.trim()) {
        where.subGroup = { contains: subGroup.trim(), mode: 'insensitive' };
      }

      // Filter by status
      if (status && status.trim()) {
        where.status = status.trim();
      }

      // Handle recent/frequent filters
      const itemIds = new Set<string>();
      if (recentItemIds && recentItemIds.length > 0)
        recentItemIds.forEach((id) => itemIds.add(id));
      if (frequentItemIds && frequentItemIds.length > 0)
        frequentItemIds.forEach((id) => itemIds.add(id));

      if (itemIds.size > 0) {
        where.id = { in: Array.from(itemIds) };
      }

      // Quick filters: Frequently Ordered / Recently Ordered derive from this
      // user's actual ProcurementItem history; Latest Added is a plain sort.
      if (quickFilter === 'latestAdded') {
        sortBy = 'createdAt';
        sortOrder = 'desc';
      } else if (
        (quickFilter === 'frequentlyOrdered' ||
          quickFilter === 'recentlyOrdered') &&
        userId
      ) {
        const orderedSkuIds =
          quickFilter === 'frequentlyOrdered'
            ? (
                await this.prisma.procurementItem.groupBy({
                  by: ['skuId'],
                  where: {
                    procurement: { requestedById: userId },
                    skuId: { not: null },
                  },
                  _count: true,
                  orderBy: { _count: { procurementId: 'desc' } },
                  take: 200,
                })
              ).map((r: any) => r.skuId)
            : (
                await this.prisma.procurementItem.findMany({
                  where: {
                    procurement: { requestedById: userId },
                    skuId: { not: null },
                  },
                  distinct: ['skuId'],
                  orderBy: { procurement: { createdAt: 'desc' } },
                  take: 200,
                  select: { skuId: true },
                })
              ).map((r: any) => r.skuId);

        where.id = { in: orderedSkuIds.filter(Boolean) as string[] };
      }

      // Valid sort columns (createdAt covers "Latest Added" / "Recently Added")
      const validColumns = [
        'itemCode',
        'description',
        'uom',
        'category',
        'subGroup',
        'createdAt',
      ];
      const sortColumn = validColumns.includes(sortBy)
        ? sortBy
        : validColumns.includes(sortBy.toLowerCase())
          ? sortBy.toLowerCase()
          : 'description';

      const [data, total] = await Promise.all([
        this.prisma.sKU.findMany({
          where,
          skip,
          take,
          orderBy: { [sortColumn]: sortOrder },
        }),
        this.prisma.sKU.count({ where }),
      ]);

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
      this.logger.error('Error fetching SKUs', error);
      throw error;
    }
  }

  /**
   * Check for possible duplicates.
   */
  async checkDuplicates(
    itemCode: string,
    description: string,
    excludeId?: string,
  ) {
    try {
      const where: any = {
        OR: [
          { itemCode: { contains: itemCode, mode: 'insensitive' } },
          { description: { contains: description, mode: 'insensitive' } },
        ],
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const duplicates = await this.prisma.sKU.findMany({
        where,
        take: 10,
      });

      return duplicates;
    } catch (error) {
      this.logger.error('Error checking duplicates', error);
      return [];
    }
  }

  /**
   * Find a single SKU by ID.
   */
  async findById(id: string) {
    try {
      const sku = await this.prisma.sKU.findUnique({
        where: { id },
      });

      if (!sku) {
        throw new NotFoundException(`SKU with ID ${id} not found`);
      }

      return sku;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error fetching SKU by ID ${id}`, error);
      throw error;
    }
  }

  /**
   * Find SKU by itemCode.
   */
  async findByItemCode(itemCode: string) {
    try {
      const sku = await this.prisma.sKU.findUnique({
        where: { itemCode },
      });

      if (!sku) {
        throw new NotFoundException(`SKU with code ${itemCode} not found`);
      }

      return sku;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error fetching SKU by code ${itemCode}`, error);
      throw error;
    }
  }

  /**
   * Search SKUs across multiple fields (for dropdown typeahead).
   */
  async search(query: string, limit = 25) {
    try {
      const skus = await this.prisma.sKU.findMany({
        where: {
          OR: [
            { itemCode: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { category: { contains: query, mode: 'insensitive' } },
            { subGroup: { contains: query, mode: 'insensitive' } },
            { uom: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { description: 'asc' },
      });

      return skus;
    } catch (error) {
      this.logger.error('Error searching SKUs', error);
      throw error;
    }
  }

  /**
   * Enterprise SKU search with intelligent ranking and recent/frequent suggestions.
   * Searches itemCode, description, category, subGroup, and uom (per v2.8.1 —
   * previously only itemCode/description were searched, so typing a category
   * like "Valves" or a UOM like "NOS" returned nothing).
   * Supports offset-based pagination so the UI can page/infinite-scroll
   * through large result sets instead of silently truncating at `limit`.
   *
   * Deliberately does NOT run a separate count() alongside the search query
   * (v2.8.1 did, via Promise.all) — that doubled connection-pool pressure on
   * every debounced keystroke against Neon's 5-connection limit, and under
   * concurrent load caused P2024 "connection pool timeout" errors that this
   * method's own catch-block then silently reported as a false "0 results".
   * Instead, `hasMore` is derived cheaply by requesting one extra row.
   */
  async searchEnterprise(
    query: string,
    limit = 25,
    userId?: string,
    offset = 0,
  ) {
    const safeQuery = query.trim();

    if (!safeQuery) {
      const items = await this.search('', limit);
      return {
        items,
        isFuzzyFallback: false,
        total: items.length,
        hasMore: false,
      };
    }

    const words = safeQuery.split(/\s+/).filter(Boolean);

    // Build search conditions
    const where: any = {
      AND: words.map((word) => ({
        OR: [
          { itemCode: { contains: word, mode: 'insensitive' } },
          { description: { contains: word, mode: 'insensitive' } },
          { category: { contains: word, mode: 'insensitive' } },
          { subGroup: { contains: word, mode: 'insensitive' } },
          { uom: { contains: word, mode: 'insensitive' } },
        ],
      })),
    };

    try {
      // Ask for one extra row to detect "more pages exist" without a
      // separate count() query and its extra connection-pool acquisition.
      const rows = await this.prisma.sKU.findMany({
        where,
        take: limit + 1,
        skip: offset,
        orderBy: { description: 'asc' },
      });

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const isFuzzyFallback = items.length === 0 && offset === 0;

      return {
        items,
        isFuzzyFallback,
        total: offset + items.length + (hasMore ? 1 : 0), // lower-bound estimate, not exact
        hasMore,
      };
    } catch (error) {
      this.logger.error('Error in enterprise search', error);
      // Surface the failure instead of masking it as "0 results" — a
      // transient pool/connection error should look like an error to the
      // caller, not an empty search, so the UI can show a retry state.
      throw error;
    }
  }

  /**
   * Get recently used, frequently used SKUs per user/project.
   */
  async getRecentAndFrequent(userId?: string, projectId?: string, limit = 10) {
    try {
      const results: Record<string, any[]> = {
        project: [],
        recent: [],
        frequent: [],
      };

      // OPTIMIZED: Run all queries in parallel to avoid connection pool exhaustion
      // Previously ran 6 sequential queries; now runs 3 parallel queries (max 2-3 queries at once)
      const projectQueryPromise = projectId
        ? this.prisma.procurementItem.groupBy({
            by: ['skuId'],
            where: {
              procurement: { projectId },
              skuId: { not: null },
            },
            _count: true,
            orderBy: { _count: { procurementId: 'desc' } },
            take: limit,
          })
        : Promise.resolve([] as any[]);

      const recentQueryPromise = userId
        ? this.prisma.procurementItem.findMany({
            where: {
              procurement: { requestedById: userId },
              skuId: { not: null },
            },
            distinct: ['skuId'],
            orderBy: { procurement: { createdAt: 'desc' } },
            take: limit,
            select: { skuId: true },
          })
        : Promise.resolve([] as any[]);

      const frequentQueryPromise = userId
        ? this.prisma.procurementItem.groupBy({
            by: ['skuId'],
            where: {
              procurement: { requestedById: userId },
              skuId: { not: null },
            },
            _count: true,
            orderBy: { _count: { procurementId: 'desc' } },
            take: limit,
          })
        : Promise.resolve([] as any[]);

      // Wait for all initial queries
      const [projectItems, recentIds, frequentItems] = await Promise.all([
        projectQueryPromise,
        recentQueryPromise,
        frequentQueryPromise,
      ]);

      // Now fetch SKU details in parallel (max 3 additional queries)
      const skuFetchPromises = [];

      if (projectItems.length > 0) {
        const skuIds = projectItems.map((p: any) => p.skuId).filter(Boolean);
        skuFetchPromises.push(
          this.prisma.sKU
            .findMany({
              where: { id: { in: skuIds as string[] } },
              orderBy: { description: 'asc' },
            })
            .then((items) => ({ key: 'project', items })),
        );
      }

      if (recentIds.length > 0) {
        const skuIds = recentIds.map((r: any) => r.skuId).filter(Boolean);
        skuFetchPromises.push(
          this.prisma.sKU
            .findMany({
              where: { id: { in: skuIds as string[] } },
              orderBy: { description: 'asc' },
            })
            .then((items) => ({ key: 'recent', items })),
        );
      }

      if (frequentItems.length > 0) {
        const skuIds = frequentItems.map((f: any) => f.skuId).filter(Boolean);
        skuFetchPromises.push(
          this.prisma.sKU
            .findMany({
              where: { id: { in: skuIds as string[] } },
              orderBy: { description: 'asc' },
            })
            .then((items) => ({ key: 'frequent', items })),
        );
      }

      // Wait for all SKU fetches
      if (skuFetchPromises.length > 0) {
        const skuResults = await Promise.all(skuFetchPromises);
        skuResults.forEach((result) => {
          results[result.key] = result.items;
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Error fetching recent/frequent SKUs', error);
      return { project: [], recent: [], frequent: [] };
    }
  }

  /**
   * Distinct category + subGroup values for marketplace filter dropdowns.
   * Cheap enough to compute on demand; frontend caches the result.
   */
  async getFacets() {
    const [categories, subGroups, uoms] = await Promise.all([
      this.prisma.sKU.findMany({
        where: { category: { not: null } },
        distinct: ['category'],
        select: { category: true },
        orderBy: { category: 'asc' },
      }),
      this.prisma.sKU.findMany({
        where: { subGroup: { not: null } },
        distinct: ['subGroup'],
        select: { subGroup: true },
        orderBy: { subGroup: 'asc' },
      }),
      this.prisma.sKU.findMany({
        distinct: ['uom'],
        select: { uom: true },
        orderBy: { uom: 'asc' },
      }),
    ]);
    return {
      categories: categories.map((c) => c.category).filter(Boolean),
      subGroups: subGroups.map((s) => s.subGroup).filter(Boolean),
      uoms: uoms.map((u) => u.uom).filter(Boolean),
    };
  }

  /**
   * Get all SKUs (limited to 50 for dropdowns without search query).
   */
  async getAll() {
    try {
      return await this.prisma.sKU.findMany({
        orderBy: { description: 'asc' },
        take: 50,
      });
    } catch (error) {
      this.logger.error('Error fetching all SKUs', error);
      throw error;
    }
  }

  /**
   * Create a new SKU.
   */
  async create(dto: any) {
    try {
      const itemCode = dto.itemCode || dto.sku;
      const description =
        dto.description || dto.itemDescription || dto.itemName;
      const uom = dto.uom || dto.unit;
      const category = dto.category || null;
      const subGroup = dto.subGroup || null;

      if (!itemCode) {
        throw new BadRequestException('itemCode (or sku) is required');
      }
      if (!description) {
        throw new BadRequestException('description is required');
      }
      if (!uom) {
        throw new BadRequestException('uom is required');
      }

      // Check if SKU already exists
      const existing = await this.prisma.sKU.findUnique({
        where: { itemCode },
      });

      if (existing) {
        throw new BadRequestException(
          `SKU with code ${itemCode} already exists`,
        );
      }

      return await this.prisma.sKU.create({
        data: {
          itemCode,
          description,
          category,
          subGroup,
          uom,
          status: 'Active',
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error creating SKU', error);
      throw error;
    }
  }

  /**
   * Update a SKU.
   */
  async update(id: string, dto: any) {
    try {
      const existing = await this.findById(id);

      const description =
        dto.description ||
        dto.itemDescription ||
        dto.itemName ||
        existing.description;
      const uom = dto.uom || dto.unit || existing.uom;

      if (!description) {
        throw new BadRequestException('Description cannot be empty');
      }
      if (!uom) {
        throw new BadRequestException('UOM cannot be empty');
      }

      return await this.prisma.sKU.update({
        where: { id },
        data: {
          description,
          category: dto.category ?? existing.category,
          subGroup: dto.subGroup ?? existing.subGroup,
          uom,
          status: dto.status ?? existing.status,
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error(`Error updating SKU ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete a SKU.
   */
  async delete(id: string) {
    try {
      const sku = await this.findById(id);

      // Check if SKU is referenced in procurements
      const count = await this.prisma.procurementItem.count({
        where: { skuId: id },
      });

      if (count > 0) {
        throw new BadRequestException(
          `Cannot delete SKU: it is used in ${count} procurement(s)`,
        );
      }

      await this.prisma.sKU.delete({
        where: { id },
      });

      return sku;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error(`Error deleting SKU ${id}`, error);
      throw error;
    }
  }

  /**
   * Record SKU view by user.
   */
  async recordView(
    userId: string,
    skuId: string,
    itemCode: string,
    itemName: string,
  ) {
    try {
      return await this.prisma.recentlyViewedItem.upsert({
        where: { userId_itemCode: { userId, itemCode } },
        update: {
          viewedAt: new Date(),
          itemName,
        },
        create: {
          userId,
          skuId,
          itemCode,
          itemName,
        },
      });
    } catch (error) {
      this.logger.error('Error recording SKU view', error);
      throw error;
    }
  }

  /**
   * Get recently viewed SKUs for a user.
   */
  async getRecentViews(userId: string, limit = 20) {
    try {
      const views = await this.prisma.recentlyViewedItem.findMany({
        where: { userId },
        orderBy: { viewedAt: 'desc' },
        take: limit,
        include: { sku: true },
      });

      return views.map((v) => ({
        id: v.id,
        skuId: v.skuId,
        itemCode: v.itemCode,
        itemName: v.itemName,
        viewedAt: v.viewedAt,
        sku: v.sku,
      }));
    } catch (error) {
      this.logger.error('Error fetching recent views', error);
      throw error;
    }
  }

  /**
   * Clear recently viewed SKUs for a user.
   */
  async clearRecentViews(userId: string) {
    try {
      await this.prisma.recentlyViewedItem.deleteMany({
        where: { userId },
      });
    } catch (error) {
      this.logger.error('Error clearing recent views', error);
      throw error;
    }
  }

  /**
   * Get master data for a SKU.
   */
  async getMasterData(itemCode: string) {
    const sku = await this.findByItemCode(itemCode);

    return {
      id: sku.id,
      itemCode: sku.itemCode,
      description: sku.description,
      category: sku.category,
      subGroup: sku.subGroup,
      uom: sku.uom,
      status: sku.status,
      statistics: {
        totalUsageCount: 0,
        totalQuantityUsed: 0,
        averageQuantity: 0,
      },
      recentUsage: [],
    };
  }

  /**
   * Get insights and statistics for a SKU.
   */
  async getInsights(skuId: string) {
    try {
      const sku = await this.findById(skuId);

      const procItems = await this.prisma.procurementItem.findMany({
        where: { skuId },
        include: {
          procurement: {
            select: {
              id: true,
              currentStage: true,
              status: true,
              vendorName: true,
              createdAt: true,
            },
          },
        },
      });

      let totalQuantityRequested = 0;
      let totalPurchaseOrders = 0;
      const activeStages = new Set<number>();
      const vendorCounts = new Map<string, number>();
      const indentIds = new Set<string>();

      procItems.forEach((pItem) => {
        totalQuantityRequested += Number(pItem.quantity || 0);
        indentIds.add(pItem.procurement.id);

        const p = pItem.procurement;
        if (p.status !== 'COMPLETED' && p.status !== 'REJECTED') {
          activeStages.add(p.currentStage);
        }

        if (p.currentStage >= 7) {
          totalPurchaseOrders++;
        }

        if (p.vendorName) {
          vendorCounts.set(
            p.vendorName,
            (vendorCounts.get(p.vendorName) || 0) + 1,
          );
        }
      });

      const mostFrequentVendors = Array.from(vendorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);

      const lastProcurementDate =
        procItems.length > 0
          ? procItems.reduce((latest, current) =>
              current.procurement.createdAt > latest.procurement.createdAt
                ? current
                : latest,
            ).procurement.createdAt
          : null;

      return {
        sku,
        insights: {
          totalTimesRequested: procItems.length,
          totalQuantityRequested,
          totalPurchaseOrders,
          mostFrequentVendors,
          lastProcurementDate,
          totalIndents: indentIds.size,
          currentActiveStages: Array.from(activeStages).sort((a, b) => a - b),
        },
      };
    } catch (error) {
      this.logger.error(`Error getting insights for SKU ${skuId}`, error);
      throw error;
    }
  }

  /**
   * Get approved makes for a SKU.
   */
  async getApprovedMakes(skuId: string): Promise<string[]> {
    return [];
  }
}
