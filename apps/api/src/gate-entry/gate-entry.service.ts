import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProcurementService } from '../procurement/procurement.service';
import { EmailService } from '../common/email/email.service';
import {
  CreateGateEntryDto,
  SubmitQuantityCheckDto,
  SubmitQualityCheckDto,
  SubmitAllocationDto,
} from './dto/gate-entry.dto';

const GATE_ENTRY_INCLUDE = {
  items: {
    include: {
      procurementItem: true,
      inspectedBy: { select: { id: true, fullName: true } },
      allocatedBy: { select: { id: true, fullName: true } },
    },
  },
  procurement: {
    select: {
      id: true,
      referenceNo: true,
      title: true,
      projectName: true,
      vendorName: true,
    },
  },
  vendor: { select: { id: true, vendorName: true } },
  createdBy: { select: { id: true, fullName: true } },
  quantityCheckedBy: { select: { id: true, fullName: true } },
  grn: true,
} as const;

@Injectable()
export class GateEntryService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private eventEmitter: EventEmitter2,
    private procurementService: ProcurementService,
    private emailService: EmailService,
  ) {}

  private async nextSequenceNumber(
    prefix: string,
    year: number,
  ): Promise<string> {
    // Count-based sequence scoped to the current year. Collisions are
    // effectively impossible in practice (single-writer-per-request via the
    // unique constraint on entryNumber/grnNumber would reject a true clash),
    // but this mirrors the referenceNo pattern already used for Procurement.
    const count = await (prefix === 'GE'
      ? this.prisma.gateEntry.count({
          where: { entryNumber: { startsWith: `${prefix}-${year}-` } },
        })
      : this.prisma.gRN.count({
          where: { grnNumber: { startsWith: `${prefix}-${year}-` } },
        }));
    return `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // ─── Cumulative remaining-quantity calculation ─────────────────────────────
  // THE core legacy business rule: remaining = ordered - SUM(all prior
  // receivedQty across every non-cancelled GateEntryItem for this
  // ProcurementItem). Never a stored running total — always derived live so
  // it can never drift from history. This must be used everywhere a
  // "remaining quantity" is displayed or validated against.
  async getRemainingQuantities(
    procurementItemIds: string[],
  ): Promise<
    Map<string, { ordered: number; received: number; remaining: number }>
  > {
    const items = await this.prisma.procurementItem.findMany({
      where: { id: { in: procurementItemIds } },
      select: { id: true, quantity: true },
    });

    const receivedSums = await this.prisma.gateEntryItem.groupBy({
      by: ['procurementItemId'],
      where: {
        procurementItemId: { in: procurementItemIds },
        status: { not: 'CANCELLED' },
        receivedQty: { not: null },
      },
      _sum: { receivedQty: true },
    });
    const receivedMap = new Map(
      receivedSums.map((r) => [
        r.procurementItemId,
        Number(r._sum.receivedQty || 0),
      ]),
    );

    const result = new Map<
      string,
      { ordered: number; received: number; remaining: number }
    >();
    for (const item of items) {
      const ordered = Number(item.quantity);
      const received = receivedMap.get(item.id) || 0;
      result.set(item.id, {
        ordered,
        received,
        remaining: Math.max(0, ordered - received),
      });
    }
    return result;
  }

  // ─── PO Search (for Gate Entry screen) ─────────────────────────────────────
  // Returns PO header + items with ordered/received/remaining, hiding items
  // that are already fully received. Mirrors the legacy searchPOItems() +
  // getEntryDetails() combined behaviour.
  async searchPO(query: string) {
    const procurement = await this.prisma.procurement.findFirst({
      where: {
        OR: [{ referenceNo: { equals: query, mode: 'insensitive' } }],
      },
      include: {
        items: true,
        requestedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!procurement) {
      throw new NotFoundException(
        `No PO found matching "${query}". Search by PO/Indent reference number.`,
      );
    }

    const remainingMap = await this.getRemainingQuantities(
      procurement.items.map((i) => i.id),
    );

    const items = procurement.items
      .map((item) => {
        const qty = remainingMap.get(item.id)!;
        return {
          id: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unit: item.unit,
          orderedQty: qty.ordered,
          receivedQty: qty.received,
          remainingQty: qty.remaining,
          status: qty.remaining <= 0 ? 'FULLY_RECEIVED' : 'PENDING',
        };
      })
      // Hide fully received items — the mandatory legacy rule that the user
      // must never be able to re-select an item with 0 remaining quantity.
      .filter((item) => item.remainingQty > 0);

    return {
      procurementId: procurement.id,
      referenceNo: procurement.referenceNo,
      title: procurement.title,
      projectName: procurement.projectName,
      vendorName: procurement.vendorName,
      status: procurement.status,
      currentStage: procurement.currentStage,
      fullyReceived: items.length === 0,
      items,
    };
  }

  // ─── Step 1: Gate Entry ─────────────────────────────────────────────────────
  async createGateEntry(dto: CreateGateEntryDto, userId: string) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'At least one item must be selected for the gate entry.',
      );
    }
    if (!dto.invoicePhotoUrls?.length) {
      throw new BadRequestException('Invoice photo(s) are mandatory.');
    }
    if (!dto.materialPhotoUrls?.length) {
      throw new BadRequestException('Material photo(s) are mandatory.');
    }

    const procurementItemIds = dto.items.map((i) => i.procurementItemId);
    const remainingMap = await this.getRemainingQuantities(procurementItemIds);

    // Re-validate against the live remaining quantity — never trust the
    // client's snapshot, since another gate entry may have been created for
    // the same PO between the user loading the page and submitting.
    for (const item of dto.items) {
      const qty = remainingMap.get(item.procurementItemId);
      if (!qty) {
        throw new BadRequestException(
          `Item ${item.procurementItemId} does not belong to this PO.`,
        );
      }
      if (item.declaredQty > qty.remaining) {
        throw new BadRequestException(
          `Declared quantity (${item.declaredQty}) exceeds remaining quantity (${qty.remaining}) for one or more items. This PO/item may have been partially received by another gate entry.`,
        );
      }
    }

    const procurement = await this.prisma.procurement.findUnique({
      where: { id: dto.procurementId },
      select: { id: true, referenceNo: true, projectName: true },
    });
    if (!procurement) throw new NotFoundException('Procurement not found');

    const year = new Date().getFullYear();
    const entryNumber = await this.nextSequenceNumber('GE', year);

    const gateEntry = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.gateEntry.create({
        data: {
          entryNumber,
          procurementId: dto.procurementId,
          vehicleNumber: dto.vehicleNumber,
          status: 'GATE_ENTRY',
          createdById: userId,
          items: {
            create: dto.items.map((i) => ({
              procurementItemId: i.procurementItemId,
              declaredQty: i.declaredQty,
              status: 'PENDING',
            })),
          },
        },
        include: GATE_ENTRY_INCLUDE,
      });

      const attachmentRows = [
        ...dto.invoicePhotoUrls!.map((f) => ({
          procurementId: dto.procurementId,
          stageNumber: 11,
          fileName: f.fileName,
          fileType: 'INVOICE_PHOTO',
          fileUrl: f.fileUrl,
          uploadedById: userId,
        })),
        ...dto.materialPhotoUrls!.map((f) => ({
          procurementId: dto.procurementId,
          stageNumber: 11,
          fileName: f.fileName,
          fileType: 'MATERIAL_PHOTO',
          fileUrl: f.fileUrl,
          uploadedById: userId,
        })),
      ];
      if (attachmentRows.length) {
        await tx.procurementAttachment.createMany({ data: attachmentRows });
      }

      return entry;
    });

    await this.notifications.broadcast({
      type: 'GATE_ENTRY_CREATED',
      title: 'New Gate Entry — Quantity Check Pending',
      message: `Gate entry ${entryNumber} for PO ${procurement.referenceNo} is awaiting quantity verification.`,
      href: `/gate-entry/${gateEntry.id}`,
      procurementId: dto.procurementId,
      excludeUserId: userId,
      roleNames: ['Store Executive', 'Store'],
    });

    // Email notification to Store team for quantity verification
    this.sendGateEntryEmail({
      procurementId: dto.procurementId,
      referenceNo: procurement.referenceNo,
      entryNumber,
      stage: 'Gate Entry',
      action: 'GATE_ENTRY_CREATED',
      recipientRole: 'Store Executive',
      message: `Gate entry ${entryNumber} created for PO ${procurement.referenceNo}. Quantity verification required.`,
      deepLink: `/gate-entry/${gateEntry.id}`,
    }).catch(() => {});

    return gateEntry;
  }

  // ─── Step 2: Quantity Verification ─────────────────────────────────────────
  async submitQuantityCheck(
    gateEntryId: string,
    dto: SubmitQuantityCheckDto,
    userId: string,
  ) {
    const gateEntry = await this.prisma.gateEntry.findUnique({
      where: { id: gateEntryId },
      include: { items: { include: { procurementItem: true } } },
    });
    if (!gateEntry) throw new NotFoundException('Gate entry not found');
    if (gateEntry.status !== 'GATE_ENTRY') {
      throw new BadRequestException(
        `Quantity check cannot be submitted — gate entry is in status ${gateEntry.status}.`,
      );
    }
    if (!dto.items?.length) {
      throw new BadRequestException(
        'Received quantity is required for all items.',
      );
    }

    const byId = new Map(gateEntry.items.map((i) => [i.id, i]));
    const procurementItemIds = gateEntry.items.map((i) => i.procurementItemId);
    const remainingMap = await this.getRemainingQuantities(procurementItemIds);

    for (const entry of dto.items) {
      const gateItem = byId.get(entry.gateEntryItemId);
      if (!gateItem) {
        throw new BadRequestException(
          `Item ${entry.gateEntryItemId} does not belong to this gate entry.`,
        );
      }
      // Validation 1 (legacy): received qty for THIS entry cannot exceed
      // what was declared at the gate for this entry.
      if (entry.receivedQty > Number(gateItem.declaredQty)) {
        throw new BadRequestException(
          `Received quantity (${entry.receivedQty}) for ${gateItem.procurementItem.itemName} exceeds the quantity declared at the gate (${Number(gateItem.declaredQty)}).`,
        );
      }
      // Validation 2 (legacy, the important one): received qty cannot push
      // cumulative received above the PO's ordered quantity — i.e. it must
      // never exceed the live remaining quantity for this item. This is the
      // authoritative over-receipt guard; Validation 1 alone is not enough
      // because declaredQty at the gate is informal/unverified.
      const qty = remainingMap.get(gateItem.procurementItemId)!;
      if (entry.receivedQty > qty.remaining) {
        throw new BadRequestException(
          `Received quantity (${entry.receivedQty}) for ${gateItem.procurementItem.itemName} exceeds the PO's remaining quantity (${qty.remaining}). Over-receipt is not allowed.`,
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.items) {
        await tx.gateEntryItem.update({
          where: { id: entry.gateEntryItemId },
          data: {
            receivedQty: entry.receivedQty,
            status: 'QUANTITY_VERIFIED',
          },
        });
      }
      return tx.gateEntry.update({
        where: { id: gateEntryId },
        data: {
          status: 'QUANTITY_VERIFIED',
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: new Date(dto.invoiceDate),
          vendorId: dto.vendorId,
          vendorName: dto.vendorName,
          quantityCheckedById: userId,
        },
        include: GATE_ENTRY_INCLUDE,
      });
    });

    await this.notifications.broadcast({
      type: 'GATE_ENTRY_QUANTITY_VERIFIED',
      title: 'Quantity Verified — Quality Inspection Pending',
      message: `Gate entry ${gateEntry.entryNumber} quantities verified. Awaiting QC inspection.`,
      href: `/gate-entry/${gateEntryId}`,
      procurementId: gateEntry.procurementId,
      excludeUserId: userId,
      roleNames: ['QC Inspector', 'Quality'],
    });

    // Email notification to Quality team for inspection
    const procurement = await this.prisma.procurement.findUnique({
      where: { id: gateEntry.procurementId },
      select: { referenceNo: true },
    });

    this.sendGateEntryEmail({
      procurementId: gateEntry.procurementId,
      referenceNo: procurement?.referenceNo || '',
      entryNumber: gateEntry.entryNumber,
      stage: 'Quantity Verification',
      action: 'QUANTITY_VERIFIED',
      recipientRole: 'QC Inspector',
      message: `Gate entry ${gateEntry.entryNumber} quantities verified. Quality inspection required.`,
      deepLink: `/gate-entry/${gateEntryId}`,
    }).catch(() => {});

    // Determine if the WHOLE PO is now fully received. If so, advance to S12 (Inspection Level 1)
    const allItems = await this.prisma.procurementItem.findMany({
      where: { procurementId: gateEntry.procurementId },
      select: { id: true },
    });
    const remainingMap2 = await this.getRemainingQuantities(
      allItems.map((i) => i.id),
    );
    const fullyReceived = Array.from(remainingMap2.values()).every(
      (q) => q.remaining <= 0,
    );

    if (fullyReceived) {
      await this.procurementService.stageAction(
        gateEntry.procurementId,
        {
          action: 'SUBMIT',
          remarks: `Fully received via Gate Entry ${gateEntry.entryNumber}`,
        },
        userId,
      );
    }

    return updated;
  }

  // ─── Email Helper for Gate Entry Workflow ───────────────────────────────────
  private async sendGateEntryEmail(params: {
    procurementId: string;
    referenceNo: string;
    entryNumber: string;
    stage: string;
    action: string;
    recipientRole: string;
    message: string;
    deepLink: string;
    grnNumber?: string;
  }) {
    // Email is controlled by master gate in NotificationService
    // This helper just emits the event; actual sending happens in NotificationService
    this.eventEmitter.emit('gate-entry.notification', {
      procurementId: params.procurementId,
      referenceNo: params.referenceNo,
      entryNumber: params.entryNumber,
      stage: params.stage,
      action: params.action,
      recipientRole: params.recipientRole,
      message: params.message,
      deepLink: params.deepLink,
      grnNumber: params.grnNumber,
    });
  }

  // ─── Queries ─────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const gateEntry = await this.prisma.gateEntry.findUnique({
      where: { id },
      include: GATE_ENTRY_INCLUDE,
    });
    if (!gateEntry) throw new NotFoundException('Gate entry not found');
    return gateEntry;
  }

  async findAll(query: { status?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const where: any = {};
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.gateEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: GATE_ENTRY_INCLUDE,
      }),
      this.prisma.gateEntry.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
