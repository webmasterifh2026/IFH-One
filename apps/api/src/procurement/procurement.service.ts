import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../common/email/email.service';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { StageActionDto } from './dto/stage-action.dto';
import { AddRemarkDto } from './dto/add-remark.dto';
import { BulkStageActionDto } from './dto/bulk-stage-action.dto';
import { BulkMultiStageActionDto } from './dto/bulk-multi-stage-action.dto';
import { SlaMonitorService } from './sla/sla-monitor.service';
import { SlaEngineService } from './sla/sla-engine.service';

// All 24 workflow stages (0–23) of the IFH One Purchase FMS
// Numbers are fixed — they correspond to DB stageNumber values; do not reorder.
export const PROCUREMENT_STAGES = [
  { number: 0, name: 'Indent Creation' },
  { number: 1, name: 'Indent Verification' },
  { number: 2, name: 'Store Availability Check' },
  { number: 3, name: 'Float RFQ' },
  { number: 4, name: 'Receive Techno Commercial Offer' },
  { number: 5, name: 'Negotiation & Decision' },
  { number: 6, name: 'Purchase Order Creation' },
  { number: 7, name: 'PO Approval L1' },
  { number: 8, name: 'PO Approval L2' },
  { number: 9, name: 'Vendor Acceptance' },
  { number: 10, name: 'Follow-up for Delivery' },
  { number: 11, name: 'Material Receipt' },
  { number: 12, name: 'Inspection 1' },
  { number: 13, name: 'Inspection 2' },
  { number: 14, name: 'Inspection 3' },
  { number: 15, name: 'Debit Note Preparation' },
  { number: 16, name: 'Bill To Accounts' },
  { number: 17, name: 'Bill To Purchase' },
  { number: 18, name: 'Bill Creation + GRN' },
  { number: 19, name: 'Book Purchase in Tally' },
  { number: 20, name: 'Bill Approval L1' },
  { number: 21, name: 'Bill Approval L2' },
  { number: 22, name: 'Payment / Advice' },
  { number: 23, name: 'Completed' },
] as const;

const MAX_STAGE = 23;

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);
  private stageConfigCache: any[] | null = null;
  private stageConfigCacheTime: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private emailService: EmailService,
    private eventEmitter: EventEmitter2,
    private slaMonitor: SlaMonitorService,
    private slaEngine: SlaEngineService,
  ) {}

  /**
   * ─── Stage Config Cache ───────────────────────────────────────────────────
   * Reduces repeated DB queries for stage configs (5-minute TTL)
   * Called during indent creation, SLA initialization, and bulk updates
   */
  private async getStageConfigs() {
    const now = Date.now();
    if (
      this.stageConfigCache &&
      now - this.stageConfigCacheTime < this.CACHE_TTL_MS
    ) {
      return this.stageConfigCache;
    }

    const configs = await this.prisma.stageConfiguration.findMany({
      include: { defaultOwners: { select: { id: true } } },
    });

    this.stageConfigCache = configs;
    this.stageConfigCacheTime = now;
    return configs;
  }

  private async resolveActorId(userId?: string): Promise<string> {
    if (userId) return userId;

    const existing = await this.prisma.user.findFirst({
      where: { email: 'admin@ifh.com' },
      select: { id: true },
    });
    if (existing) return existing.id;

    const user = await this.prisma.user.create({
      data: {
        employeeId: 'ADMIN',
        fullName: 'Admin User',
        email: 'admin@ifh.com',
        passwordHash: 'auth-disabled',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    return user.id;
  }

  // ─── Reference Number Generator ──────────────────────────────────────────
  private async generateReferenceNo(): Promise<string> {
    const year = new Date().getFullYear();
    // Retry up to 5 times to handle concurrent creation race conditions
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await this.prisma.procurement.count({
        where: { referenceNo: { startsWith: `IND-${year}-` } },
      });
      const seq = String(count + attempt + 1).padStart(4, '0');
      const candidate = `IND-${year}-${seq}`;
      // Check if this exact reference number is already taken
      const exists = await this.prisma.procurement.findUnique({
        where: { referenceNo: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    // Fallback: use timestamp-based suffix to guarantee uniqueness
    const ts = Date.now().toString().slice(-6);
    return `IND-${year}-${ts}`;
  }

  // ─── Helper: Link Item to SKU ────────────────────────────────────────────
  /**
   * ─── Batch Link Items to SKU ──────────────────────────────────────────────
   * Loads all SKU codes in a single query instead of N individual queries.
   * Fixes N+1 query problem that causes timeouts on indents with many items.
   */
  private async linkItemsToSkus(items: any[]) {
    if (!items || items.length === 0) return [];

    // Extract unique item codes
    const itemCodes = items.map((i) => i.itemCode).filter(Boolean);

    // Batch load all SKUs in a single query
    let skuMap: Record<string, any> = {};
    if (itemCodes.length > 0) {
      const skus = await this.prisma.sKU.findMany({
        where: { itemCode: { in: itemCodes } },
        select: {
          itemCode: true,
          id: true,
          category: true,
          subGroup: true,
        },
      });

      skuMap = skus.reduce(
        (acc, sku) => {
          acc[sku.itemCode] = sku;
          return acc;
        },
        {} as Record<string, any>,
      );
    }

    // Enrich items with SKU data (no additional DB calls)
    return items.map((item) => {
      const linkedSku = skuMap[item.itemCode] || null;
      return {
        skuId: linkedSku?.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        bbuCode: item.bbuCode,
        description: item.description,
        category: linkedSku?.category,
        subGroup: linkedSku?.subGroup,
        unit: item.unit,
        quantity: item.quantity,
        technicalSpec: item.technicalSpec,
        approvedMakes: item.approvedMakes,
        attachmentName: item.attachmentName,
        attachmentUrl: item.attachmentUrl,
      };
    });
  }

  private async linkItemToSku(item: any) {
    let linkedSku = null;
    if (item.itemCode) {
      linkedSku = await this.prisma.sKU.findUnique({
        where: { itemCode: item.itemCode },
        select: {
          id: true,
          category: true,
          subGroup: true,
        },
      });
    }

    return {
      skuId: linkedSku?.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      bbuCode: item.bbuCode,
      description: item.description,
      category: linkedSku?.category,
      subGroup: linkedSku?.subGroup,
      unit: item.unit,
      quantity: item.quantity,
      technicalSpec: item.technicalSpec,
      approvedMakes: item.approvedMakes,
      attachmentName: item.attachmentName,
      attachmentUrl: item.attachmentUrl,
    };
  }

  // ─── Create Procurement (Indent) ─────────────────────────────────────────
  async create(dto: CreateProcurementDto, userId?: string) {
    const actorId = await this.resolveActorId(userId);
    const referenceNo = await this.generateReferenceNo();
    const submit = dto.submit !== false;

    try {
      // ─── Fetch Stage Configurations (cached, 5-min TTL) ──────────────────
      // This replaces the findMany that was being called for every indent creation
      const stageConfigs = await this.getStageConfigs();

      // Build initial stages for all 24 steps (stages 0-23)
      const stagesData = PROCUREMENT_STAGES.map((s) => {
        const config = stageConfigs.find((c) => c.stageNumber === s.number);
        let startedAt;
        let dueDate;

        if (s.number === 0 || (submit && s.number === 1)) {
          startedAt = new Date();
          if (config?.tatHours) {
            dueDate = new Date(
              startedAt.getTime() + config.tatHours * 60 * 60 * 1000,
            );
          }
        }

        return {
          stageNumber: s.number,
          stageName: s.name,
          status: submit
            ? s.number === 0
              ? 'COMPLETED'
              : s.number === 1
                ? 'IN_PROGRESS'
                : 'PENDING'
            : s.number === 0
              ? 'IN_PROGRESS'
              : 'PENDING',
          startedAt,
          dueDate,
          completedAt: submit && s.number === 0 ? new Date() : undefined,
          actionTaken: submit && s.number === 0 ? 'SUBMIT' : undefined,
          // For default ownership at creation, we map to the first default owner if available (non-dynamic)
          assignedToId:
            !config?.isDynamicOwner && (config?.defaultOwners?.length ?? 0) > 0
              ? config!.defaultOwners[0].id
              : undefined,
        };
      });

      // ─── Link items to SKU master (batch query, not N+1) ──────────────────────
      // This is the key fix for timeout issues on indents with many items
      const enrichedItems = dto.items
        ? await this.linkItemsToSkus(dto.items)
        : [];

      // Wrap everything in a transaction for atomicity
      const procurement = await this.prisma.$transaction(async (tx) => {
        // Create procurement with all related records
        const proc = await tx.procurement.create({
          data: {
            referenceNo,
            title: dto.title,
            description: dto.description,
            projectId: dto.projectId,
            projectName: dto.projectName,
            application: dto.application,
            itemType: dto.itemType,
            departmentId: dto.departmentId,
            priority: dto.priority || 'NORMAL',
            requiredDate: dto.requiredDate
              ? new Date(dto.requiredDate)
              : undefined,
            paintingSpec: dto.paintingSpec,
            paintingSpecRemark: dto.paintingSpecRemark,
            packingRequirement: dto.packingRequirement,
            certification: dto.certification,
            manuals: dto.manuals,
            warrantyGuarantee: dto.warrantyGuarantee,
            ga: dto.ga,
            requestedById: actorId,
            currentStage: submit ? 1 : 0,
            status: submit ? 'SUBMITTED' : 'DRAFT',
            stages: { create: stagesData },
            items:
              enrichedItems.length > 0
                ? {
                    create: enrichedItems.map((item, idx) => ({
                      ...item,
                      bbuCode: `${referenceNo}-${String(idx + 1).padStart(3, '0')}`,
                    })),
                  }
                : undefined,
            history: {
              create: {
                action: submit ? 'SUBMITTED' : 'CREATED',
                description: submit
                  ? `Indent submitted for verification: ${dto.title}`
                  : `Procurement record created: ${dto.title}`,
                performedById: actorId,
                stageNumber: submit ? 1 : 0,
              },
            },
          },
          select: {
            id: true,
            referenceNo: true,
            title: true,
            status: true,
            currentStage: true,
            projectId: true,
            projectName: true,
            requestedById: true,
            createdAt: true,
          },
        });

        return proc;
      });

      // For create response, return a lean version to avoid slow serialization
      // Full include happens on GET, not POST
      const leanProcurement = await this.prisma.procurement.findUnique({
        where: { id: procurement.id },
        select: {
          id: true,
          referenceNo: true,
          title: true,
          status: true,
          currentStage: true,
          projectId: true,
          projectName: true,
          requestedById: true,
          createdAt: true,
        },
      });

      if (!leanProcurement) {
        throw new BadRequestException('Failed to fetch created procurement');
      }

      // Post-creation async operations (notifications, SLA, emails)
      // These run outside transaction so creation isn't blocked by notification failures
      if (submit) {
        // Broadcast notification for new indent
        this.notifications
          .broadcast({
            type: 'info',
            title: 'New Indent Submitted',
            message: `${leanProcurement.referenceNo} — ${dto.title}`,
            href: `/procurement/${leanProcurement.id}`,
            procurementId: leanProcurement.id,
            stageNumber: 1,
            excludeUserId: actorId,
          })
          .catch((err) => {
            this.logger.error(
              `Failed to broadcast notification for ${leanProcurement.referenceNo}`,
              err,
            );
          });

        // Initialize SLA for the first active stage
        const stage1 = PROCUREMENT_STAGES.find((s) => s.number === 1);
        this.slaMonitor
          .onStageActivated(
            leanProcurement.id,
            1,
            stage1?.name ?? 'Indent Verification',
            new Date(),
          )
          .catch((err) => {
            this.logger.error(
              `Failed to initialize SLA for ${leanProcurement.referenceNo}`,
              err,
            );
          });

        // Publish to Email Notification Service
        const creator = await this.prisma.user.findUnique({
          where: { id: actorId },
          select: { email: true, fullName: true },
        });

        this.eventEmitter.emit('procurement.notification', {
          procurementId: leanProcurement.id,
          referenceNo: leanProcurement.referenceNo,
          projectName: leanProcurement.projectName,
          stageName: 'Indent Verification',
          stageNumber: 1,
          actorName: creator?.fullName || 'System',
          timestamp: new Date().toLocaleString(),
          actionTaken: 'Create',
          creatorEmail: creator?.email,
        });
      } else {
        // Draft created - minimal notification
        this.notifications
          .broadcast({
            type: 'info',
            title: 'New Indent Draft Created',
            message: `${leanProcurement.referenceNo} — ${dto.title}`,
            href: `/procurement/${leanProcurement.id}`,
            procurementId: leanProcurement.id,
            stageNumber: 0,
            excludeUserId: actorId,
          })
          .catch((err) => {
            this.logger.error(
              `Failed to broadcast notification for draft ${leanProcurement.referenceNo}`,
              err,
            );
          });
      }

      this.logger.log(
        `Procurement ${leanProcurement.referenceNo} created successfully by user ${actorId}. Status: ${submit ? 'SUBMITTED' : 'DRAFT'}`,
      );

      return leanProcurement;
    } catch (error) {
      this.logger.error(`Failed to create procurement`, error);

      // Provide meaningful error messages
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A procurement with this reference number already exists.',
        );
      }
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Invalid foreign key reference. Please check project ID, user ID, or SKU codes.',
        );
      }

      throw new BadRequestException(
        error.message ||
          'Failed to create indent. Please try again or contact support.',
      );
    }
  }

  // ─── Private helper: check if user is Super Admin ──────────────────────────
  private async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    return (
      user?.userRoles?.some(
        (ur) =>
          ur.role.name === 'Super Admin' || ur.role.name === 'SUPER_ADMIN',
      ) ?? false
    );
  }

  // ─── Update Draft / Edit Indent ────────────────────────────────────────────
  // v2.9.0 — Extended edit permission:
  //   - Creator can edit their own indent until it is Approved at Indent
  //     Verification (stage 1). Editable statuses: DRAFT, SUBMITTED, ON_HOLD,
  //     REJECTED (as long as stage 1 is not yet APPROVED/COMPLETED).
  //   - Super Admin can edit ANY indent at ANY stage/status.
  async updateDraft(id: string, dto: CreateProcurementDto, userId?: string) {
    const actorId = await this.resolveActorId(userId);
    const submit = dto.submit !== false;

    try {
      const existing = await this.prisma.procurement.findUnique({
        where: { id },
        include: { stages: true },
      });

      if (!existing)
        throw new NotFoundException('Procurement record not found');

      // ── Permission check ─────────────────────────────────────────────────
      const isSuperAdminUser = await this.isSuperAdmin(actorId);

      if (!isSuperAdminUser) {
        // Non-Super-Admin: enforce edit restrictions
        const stage1 = existing.stages.find((s) => s.stageNumber === 1);
        const stage1Approved =
          stage1 &&
          (stage1.status === 'APPROVED' || stage1.status === 'COMPLETED');

        if (stage1Approved) {
          throw new BadRequestException(
            'This indent has been approved at Indent Verification and can no longer be edited. Contact a Super Admin for changes.',
          );
        }

        // Only allow editing for specific statuses
        const editableStatuses = ['DRAFT', 'SUBMITTED', 'ON_HOLD', 'REJECTED'];
        if (!editableStatuses.includes(existing.status)) {
          throw new BadRequestException(
            `Indent with status "${existing.status}" cannot be edited. Only DRAFT, SUBMITTED, ON_HOLD, or REJECTED indents can be edited before Indent Verification approval.`,
          );
        }

        // Verify the user is the creator (only for non-Super-Admin)
        if (existing.requestedById !== actorId) {
          throw new BadRequestException(
            'Only the indent creator or a Super Admin can edit this indent.',
          );
        }
      }

      // ─── Link items to SKU master (batch query, not N+1) ──────────────────────
      const enrichedItems = dto.items
        ? await this.linkItemsToSkus(dto.items)
        : [];

      // If submitting, we update the first two stages
      let nextCurrentStage = existing.currentStage;
      let nextStatus = existing.status;
      let stagesUpdate: any = undefined;

      if (submit) {
        nextCurrentStage = 1;
        nextStatus = 'SUBMITTED';

        // Validate that stage 0 and stage 1 records exist before updating
        const stage0 = existing.stages.find((s) => s.stageNumber === 0);
        const stage1 = existing.stages.find((s) => s.stageNumber === 1);

        if (!stage0) {
          throw new BadRequestException(
            'Indent Creation stage record missing. Please contact support.',
          );
        }
        if (!stage1) {
          throw new BadRequestException(
            'Indent Verification stage record missing. Please contact support.',
          );
        }

        stagesUpdate = {
          updateMany: [
            {
              where: { stageNumber: 0 },
              data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                actionTaken: 'SUBMIT',
              },
            },
            {
              where: { stageNumber: 1 },
              data: { status: 'IN_PROGRESS', startedAt: new Date() },
            },
          ],
        };
      }

      // Wrap the delete+update in a transaction to prevent orphan items
      const procurement = await this.prisma.$transaction(async (tx) => {
        // Delete existing items before replacing them
        await tx.procurementItem.deleteMany({
          where: { procurementId: id },
        });

        return tx.procurement.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description,
            projectId: dto.projectId,
            projectName: dto.projectName,
            application: dto.application,
            itemType: dto.itemType,
            departmentId: dto.departmentId,
            priority: dto.priority || 'NORMAL',
            requiredDate: dto.requiredDate
              ? new Date(dto.requiredDate)
              : undefined,
            paintingSpec: dto.paintingSpec,
            paintingSpecRemark: dto.paintingSpecRemark,
            packingRequirement: dto.packingRequirement,
            certification: dto.certification,
            manuals: dto.manuals,
            warrantyGuarantee: dto.warrantyGuarantee,
            ga: dto.ga,
            currentStage: nextCurrentStage,
            status: nextStatus,
            stages: stagesUpdate,
            items:
              enrichedItems.length > 0
                ? {
                    create: enrichedItems.map((item, idx) => ({
                      ...item,
                      bbuCode: `${existing.referenceNo}-${String(idx + 1).padStart(3, '0')}`,
                    })),
                  }
                : undefined,
            history: {
              create: {
                action: submit ? 'SUBMITTED' : 'DRAFT_UPDATED',
                description: submit
                  ? `Indent submitted from draft for verification: ${dto.title}`
                  : `Draft updated: ${dto.title}`,
                performedById: actorId,
                stageNumber: submit ? 1 : 0,
              },
            },
          },
          include: this.fullInclude(),
        });
      });

      // Post-update async side-effects
      if (submit) {
        this.notifications
          .broadcast({
            type: 'info',
            title: 'New Indent Submitted',
            message: `${procurement.referenceNo} — ${dto.title}`,
            href: `/procurement/${procurement.id}`,
            procurementId: procurement.id,
            stageNumber: 1,
            excludeUserId: actorId,
          })
          .catch((err) => {
            this.logger.error(
              `Failed to broadcast notification for ${procurement.referenceNo}`,
              err,
            );
          });

        // Initialize SLA for the first active stage when draft is submitted
        const stage1 = PROCUREMENT_STAGES.find((s) => s.number === 1);
        this.slaMonitor
          .onStageActivated(
            procurement.id,
            1,
            stage1?.name ?? 'Indent Verification',
            new Date(),
          )
          .catch((err) => {
            this.logger.error(
              `Failed to initialize SLA for ${procurement.referenceNo}`,
              err,
            );
          });

        // Publish to Email Notification Service
        const creator = await this.prisma.user.findUnique({
          where: { id: actorId },
          select: { email: true, fullName: true },
        });
        this.eventEmitter.emit('procurement.notification', {
          procurementId: procurement.id,
          referenceNo: procurement.referenceNo,
          projectName: procurement.projectName,
          stageName: 'Indent Verification',
          stageNumber: 1,
          actorName: creator?.fullName || 'System',
          timestamp: new Date().toLocaleString(),
          actionTaken: 'Create',
          creatorEmail: creator?.email,
        });
      }

      this.logger.log(
        `Draft ${id} updated by user ${actorId}. Status: ${submit ? 'SUBMITTED' : 'DRAFT'}`,
      );

      return procurement;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update draft ${id}`, error);

      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Invalid foreign key reference. Please check project ID or SKU codes.',
        );
      }

      throw new BadRequestException(
        error.message ||
          'Failed to save draft. Please try again or contact support.',
      );
    }
  }

  // ─── List Procurements ────────────────────────────────────────────────────
  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    stage?: number;
    projectId?: string;
    userId?: string;
    roles?: string[];
  }) {
    const page = query.page || 1;
    // Cap limit to 100 to avoid memory/timeout issues
    const rawLimit = query.limit || 20;
    const limit = Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { referenceNo: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { vendorName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) {
      if (query.status === 'IN_PROGRESS') {
        where.status = { in: ['IN_PROGRESS', 'SUBMITTED'] };
      } else if (query.status === 'REJECTED') {
        where.OR = [
          ...(where.OR || []),
          { status: 'REJECTED' },
          { stages: { some: { metadata: { contains: '"action":"REJECT"' } } } },
        ];
      } else {
        where.status = query.status;
      }
    }
    if (query.stage !== undefined) where.currentStage = query.stage;
    if (query.projectId) where.projectId = query.projectId;

    if (
      query.userId &&
      !query.roles?.includes('Super Admin') &&
      !query.roles?.includes('Procurement Admin')
    ) {
      where.AND = [
        {
          OR: [
            { requestedById: query.userId },
            {
              stages: {
                some: {
                  assignedToId: query.userId,
                  status: { in: ['PENDING', 'IN_PROGRESS'] },
                },
              },
            },
          ],
        },
      ];
    }

    // PERFORMANCE FIX: Use a fast, indexed count query. The composite index
    // on (currentStage, status) makes stage+status filter counts efficient.
    // Remove the old Promise.race timeout hack which could return wrong totals.
    const countPromise = this.prisma.procurement
      .count({ where })
      .catch(() => 1000);

    const dataPromise = this.prisma.procurement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceNo: true,
        title: true,
        description: true,
        projectId: true,
        projectName: true,
        application: true,
        itemType: true,
        departmentId: true,
        requestedById: true,
        assignedToId: true,
        currentStage: true,
        status: true,
        priority: true,
        requiredDate: true,
        paintingSpec: true,
        paintingSpecRemark: true,
        packingRequirement: true,
        certification: true,
        manuals: true,
        warrantyGuarantee: true,
        ga: true,
        vendorId: true,
        vendorName: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        requestedBy: {
          select: {
            id: true,
            fullName: true,
            employeeId: true,
            designation: true,
          },
        },
        assignedTo: {
          select: { id: true, fullName: true, employeeId: true },
        },
        items: {
          select: {
            id: true,
            itemCode: true,
            itemName: true,
            description: true,
            category: true,
            subGroup: true,
            unit: true,
            quantity: true,
            technicalSpec: true,
            approvedMakes: true,
            attachmentName: true,
            attachmentUrl: true,
          },
        },
        stages: {
          orderBy: { stageNumber: 'asc' },
        },
      },
    });

    const [fetchedData, total] = await Promise.all([dataPromise, countPromise]);
    let data = fetchedData;

    if (query.stage !== undefined || query.status === 'REJECTED') {
      data = data.filter((proc: any) => {
        if (!proc.stages || !proc.items) return true;

        proc.items = proc.items.filter((item: any) => {
          // Check all stages for action status, starting from most recent
          let finalItemAction = null;
          for (let i = proc.stages.length - 1; i >= 0; i--) {
            const s = proc.stages[i];
            let md: any = {};
            try {
              if (s.metadata) md = JSON.parse(s.metadata);
            } catch (e) {
              // ignore
            }
            if (md[item.id] && md[item.id].action) {
              finalItemAction = md[item.id].action;
              break;
            }
          }

          if (query.status === 'REJECTED') {
            // In Rejected Records, show items that are explicitly REJECTED
            return finalItemAction === 'REJECT' || proc.status === 'REJECTED';
          }

          if (query.stage === 1) {
            // In S1, show items that are PENDING or HOLD
            return (
              !finalItemAction ||
              finalItemAction === 'HOLD' ||
              finalItemAction === 'CLARIFICATION' ||
              finalItemAction === 'PENDING'
            );
          } else if (query.stage === 2) {
            // In S2, show only APPROVED items
            return (
              finalItemAction === 'APPROVE' || finalItemAction === 'SUBMIT'
            );
          }
          return true;
        });

        // Only include this procurement if it still has items left for this stage/status
        return proc.items.length > 0;
      });
    }

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Get Single Procurement ───────────────────────────────────────────────
  async findOne(id: string) {
    const procurement = await this.prisma.procurement.findUnique({
      where: { id },
      include: this.fullInclude(),
    });
    if (!procurement)
      throw new NotFoundException('Procurement record not found');
    return procurement;
  }

  // ─── Stage Action ─────────────────────────────────────────────────────────
  async stageAction(id: string, dto: StageActionDto, userId: string) {
    const actorId = await this.resolveActorId(userId);
    const procurement = await this.prisma.procurement.findUnique({
      where: { id },
      include: { stages: true },
    });
    if (!procurement)
      throw new NotFoundException('Procurement record not found');

    const currentStageNum = procurement.currentStage;
    const currentStage = procurement.stages.find(
      (s) => s.stageNumber === currentStageNum,
    );
    if (!currentStage) throw new BadRequestException('Current stage not found');

    const currentStageName = currentStage.stageName;
    const action = dto.action.toUpperCase();
    const transition = this.resolveStageTransition(
      currentStageNum,
      currentStageName,
      action,
    );

    // ── Determine next stage status and procurement status ──────────────────
    const nextStageNum = Math.min(transition.nextStageNum, MAX_STAGE);
    const procurementStatus =
      transition.nextStageNum > MAX_STAGE
        ? 'COMPLETED'
        : transition.procurementStatus;
    const currentStageStatus = transition.currentStageStatus;
    const historyDescription = transition.historyDescription;

    // CRITICAL FIX v2.9.0 — Ensure APPROVE transitions advance the stage.
    // When action is APPROVE, the resolveStageTransition returns approveTo()
    // which sets currentStageStatus='APPROVED' and nextStageNum=currentStage+1.
    // The code below must correctly update the current stage, upsert the next
    // stage with IN_PROGRESS, and advance procurement.currentStage.
    // The optimistic concurrency guard (updateMany with currentStage guard)
    // prevents double-processing from concurrent requests.

    // Store Check: item-level updates derived from store check metadata,
    // applied inside the same transaction as everything else below.
    const storeCheckItemUpdates: Array<{ id: string; data: any }> = [];
    if (
      currentStageNum === 2 &&
      action === 'NOT_AVAILABLE' &&
      dto.metadata?.itemChecks
    ) {
      const checks = dto.metadata.itemChecks as Array<{
        itemId: string;
        shortQty: number;
        technicalSpec?: string;
        approvedMakes?: string;
      }>;
      for (const check of checks) {
        if (!check.itemId) continue;
        const itemUpdate: any = {};
        if (typeof check.shortQty === 'number' && check.shortQty >= 0) {
          itemUpdate.quantity = check.shortQty;
        }
        if (check.technicalSpec) itemUpdate.technicalSpec = check.technicalSpec;
        if (check.approvedMakes) itemUpdate.approvedMakes = check.approvedMakes;
        if (Object.keys(itemUpdate).length > 0) {
          storeCheckItemUpdates.push({ id: check.itemId, data: itemUpdate });
        }
      }
    }

    // Update vendor info if provided
    const vendorUpdate: any = {};
    if (dto.vendorId) vendorUpdate.vendorId = dto.vendorId;
    if (dto.vendorName) vendorUpdate.vendorName = dto.vendorName;

    const isTerminal =
      procurementStatus === 'COMPLETED' || procurementStatus === 'REJECTED';

    // Everything below runs in one transaction, guarded by an optimistic
    // concurrency check: the final procurement update only applies WHERE
    // currentStage still equals what we read at the top of this method. If
    // a concurrent request (e.g. a double-click or network retry) already
    // advanced the stage, updateMany() affects 0 rows and we abort cleanly
    // instead of silently re-applying the same transition twice.
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.remarks) {
        await tx.procurementRemark.create({
          data: {
            procurementId: id,
            stageNumber: currentStageNum,
            comment: dto.remarks,
            authorId: actorId,
          },
        });
      }

      const stageUpdateData: any = {
        status: currentStageStatus,
        actionTaken: action,
        remarks: dto.remarks,
        completedAt: ['COMPLETED', 'APPROVED', 'REJECTED'].includes(
          currentStageStatus,
        )
          ? new Date()
          : undefined,
      };
      if (dto.metadata) {
        stageUpdateData.metadata = JSON.stringify(dto.metadata);
      }

      await tx.procurementStage.update({
        where: { id: currentStage.id },
        data: stageUpdateData,
      });

      if (nextStageNum > currentStageNum && nextStageNum <= MAX_STAGE) {
        const nextStageStatus =
          procurementStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';

        let nextStageAssignedToId = dto.assignedToId || undefined;
        let dueDate = undefined;

        const nextStageConfig = await tx.stageConfiguration.findUnique({
          where: { stageNumber: nextStageNum },
          include: { defaultOwners: { select: { id: true } } },
        });

        if (nextStageConfig) {
          if (nextStageConfig.isDynamicOwner) {
            // "AO Assigned User" stages inherit whoever was assigned during
            // Indent Verification (stage 1) — the doer selected there stays
            // the owner through RFQ/TCE/Negotiation/PO Creation.
            const verificationStage = procurement.stages.find(
              (s) => s.stageNumber === 1,
            );
            nextStageAssignedToId =
              dto.assignedToId ||
              verificationStage?.assignedToId ||
              nextStageAssignedToId;
          } else if (nextStageConfig.defaultOwners.length > 0) {
            nextStageAssignedToId = nextStageConfig.defaultOwners[0].id;
          }
          if (nextStageConfig.tatHours) {
            dueDate = new Date(
              Date.now() + nextStageConfig.tatHours * 60 * 60 * 1000,
            );
          }
        }

        await tx.procurementStage.upsert({
          where: {
            procurementId_stageNumber: {
              procurementId: id,
              stageNumber: nextStageNum,
            },
          },
          create: {
            procurementId: id,
            stageNumber: nextStageNum,
            stageName:
              PROCUREMENT_STAGES.find((s) => s.number === nextStageNum)?.name ||
              `Stage ${nextStageNum}`,
            status: nextStageStatus,
            startedAt: new Date(),
            completedAt:
              procurementStatus === 'COMPLETED' ? new Date() : undefined,
            assignedToId: nextStageAssignedToId,
            dueDate,
          },
          update: {
            status: nextStageStatus,
            startedAt: new Date(),
            completedAt:
              procurementStatus === 'COMPLETED' ? new Date() : undefined,
            assignedToId: nextStageAssignedToId,
            dueDate,
          },
        });
      }

      for (const itemUpdate of storeCheckItemUpdates) {
        await tx.procurementItem.update({
          where: { id: itemUpdate.id },
          data: itemUpdate.data,
        });
      }

      // Optimistic concurrency guard — only commit the procurement-level
      // transition if it is still sitting at the stage we read earlier.
      const guardedUpdate = await tx.procurement.updateMany({
        where: { id, currentStage: currentStageNum },
        data: {
          currentStage: nextStageNum,
          status: procurementStatus,
          completedAt: isTerminal ? new Date() : undefined,
          ...vendorUpdate,
        },
      });

      if (guardedUpdate.count === 0) {
        throw new BadRequestException(
          'This record was already updated by another action. Please refresh and try again.',
        );
      }

      await tx.procurementHistory.create({
        data: {
          procurementId: id,
          action,
          description: historyDescription,
          performedById: actorId,
          stageNumber: currentStageNum,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
        },
      });

      return tx.procurement.findUniqueOrThrow({
        where: { id },
        include: this.fullInclude(),
      });
    });

    // Broadcast notification for workflow action
    const notifType =
      action === 'REJECT' ? 'error' : action === 'HOLD' ? 'warning' : 'success';
    this.notifications
      .broadcast({
        type: notifType,
        title: `${currentStageName} — ${action}`,
        message: `${procurement.referenceNo}: ${historyDescription}`,
        href: `/procurement/${id}`,
        procurementId: id,
        stageNumber: currentStageNum,
        excludeUserId: actorId,
      })
      .catch(() => {});

    // Email notification for stage transition (non-blocking — fetch and send async)
    this.sendWorkflowEmail({
      procurementId: id,
      referenceNo: procurement.referenceNo,
      projectName: procurement.projectName ?? undefined,
      stageName: currentStageName,
      stageNumber: currentStageNum,
      action: action,
      nextStage:
        nextStageNum <= MAX_STAGE
          ? (PROCUREMENT_STAGES.find((s) => s.number === nextStageNum)?.name ??
            'Unknown')
          : 'Completed',
      actorName: 'System',
      remarks: dto.remarks,
    }).catch(() => {});

    // SLA lifecycle hooks
    // Complete SLA for the current stage whenever it leaves an active state
    if (
      ['COMPLETED', 'APPROVED', 'REJECTED'].includes(
        transition.currentStageStatus,
      )
    ) {
      this.slaMonitor
        .onStageCompleted(id, currentStageNum, new Date())
        .catch(() => {});
    }

    // HOLD → start delay tracking (category: HOLD)
    if (action === 'HOLD') {
      const currentStageObj = procurement.stages.find(
        (s) => s.stageNumber === currentStageNum,
      );
      this.slaMonitor
        .onStageHeld(
          id,
          currentStageNum,
          currentStageName,
          actorId,
          currentStageObj?.assignedToId ?? undefined,
        )
        .catch(() => {});
    }

    // RESUME → end any active hold delay
    if (action === 'RESUME') {
      this.slaMonitor.onStageResumed(id, currentStageNum).catch(() => {});
    }

    // CLARIFICATION → re-initialize SLA for the target (previous) stage
    if (action === 'CLARIFICATION' && nextStageNum < currentStageNum) {
      const targetStageDef = PROCUREMENT_STAGES.find(
        (s) => s.number === nextStageNum,
      );
      this.slaMonitor
        .onStageActivated(
          id,
          nextStageNum,
          targetStageDef?.name ?? `Stage ${nextStageNum}`,
          new Date(),
        )
        .catch(() => {});
    }

    // Activate SLA for the next real processing stage only (never for the
    // terminal sentinel 23 / "Completed" which has no SLA to track)
    if (nextStageNum > currentStageNum && nextStageNum < MAX_STAGE) {
      const nextStageDef = PROCUREMENT_STAGES.find(
        (s) => s.number === nextStageNum,
      );
      this.slaMonitor
        .onStageActivated(
          id,
          nextStageNum,
          nextStageDef?.name ?? `Stage ${nextStageNum}`,
          new Date(),
        )
        .catch(() => {});
    }

    // Send rejection email if applicable
    if (action === 'REJECT' && procurement.requestedById) {
      this.sendRejectionEmail({
        procurementId: id,
        referenceNo: procurement.referenceNo,
        projectName: procurement.projectName ?? undefined,
        requestedById: procurement.requestedById,
        stageName: currentStageName,
        stageNumber: currentStageNum,
        rejectedById: actorId,
        reason: dto.remarks || 'No reason provided',
        remarks: dto.remarks,
        status: procurementStatus,
      }).catch(() => {});
    }

    // Publish to Email Notification Service (non-blocking — creator fetch is async)
    const creator = await this.prisma.user.findUnique({
      where: { id: procurement.requestedById },
    });
    this.eventEmitter.emit('procurement.notification', {
      procurementId: id,
      referenceNo: procurement.referenceNo,
      projectName: procurement.projectName,
      stageName: currentStageName,
      stageNumber: currentStageNum,
      actorName: creator?.fullName || 'System',
      timestamp: new Date().toLocaleString(),
      actionTaken:
        action === 'FORWARD' || action === 'SUBMIT' || action === 'APPROVE'
          ? action === 'APPROVE'
            ? 'Approve'
            : 'Transition'
          : action === 'REJECT'
            ? 'Reject'
            : action === 'HOLD'
              ? 'Hold'
              : action === 'CLARIFICATION'
                ? 'Clarification'
                : 'Transition',
      remarks: dto.remarks,
      creatorEmail: creator?.email,
    });

    return updated;
  }

  // ─── Stage Transition Logic ────────────────────────────────────────────────
  //
  // SINGLE SOURCE OF TRUTH for the full procurement workflow:
  //
  //  0  Indent Creation
  //  1  Indent Verification        APPROVE→2 | REJECT(end) | HOLD
  //  2  Store Availability Check   AVAILABLE(close) | NOT_AVAILABLE→3 | HOLD | REJECT
  //  3  RFQ Float                  APPROVE→4 | HOLD | REJECT
  //  4  Techno Commercial Eval     APPROVE→5 | HOLD | REJECT
  //  5  Negotiation & Decision     APPROVE→6 | HOLD | REJECT
  //  6  PO Creation                SUBMIT→7
  //  7  PO Approval L1             APPROVE→8 | REJECT | HOLD
  //  8  PO Approval L2             APPROVE→9 | REJECT | HOLD
  //  9  Vendor Acceptance          APPROVE→10 | HOLD | REJECT
  // 10  Vendor Follow-Up           SUBMIT→11
  // 11  Material Receipt           SUBMIT→12
  // 12  Inspection 1               PASS→16 | FAIL→13
  // 13  Inspection 2               PASS→16 | FAIL→14
  // 14  Inspection 3               PASS→16 | FAIL→15
  // 15  Debit Note                 SUBMIT → close with REJECTED (no billing)
  // 16  Bill To Accounts           SUBMIT→17
  // 17  Bill To Purchase           APPROVE→18 | HOLD | REJECT
  // 18  Bill Creation + GRN        APPROVE→19 | HOLD | REJECT
  // 19  Book Purchase in Tally     APPROVE→20 | HOLD | REJECT
  // 20  Bill Approval L1           APPROVE→21 | HOLD | REJECT
  // 21  Bill Approval L2           APPROVE→22 | HOLD | REJECT
  // 22  Payment / Advice           APPROVE→23 (COMPLETED)
  //
  private resolveStageTransition(
    currentStageNum: number,
    stageName: string,
    action: string,
  ) {
    if (currentStageNum >= MAX_STAGE) {
      throw new BadRequestException('Completed procurement cannot be actioned');
    }

    // ── Cross-stage universal actions ───────────────────────────────────────

    if (action === 'HOLD') {
      return {
        nextStageNum: currentStageNum,
        procurementStatus: 'ON_HOLD',
        currentStageStatus: 'ON_HOLD',
        historyDescription: `Stage ${currentStageNum} (${stageName}) put on hold`,
      };
    }

    if (action === 'RESUME') {
      return {
        nextStageNum: currentStageNum,
        procurementStatus: 'IN_PROGRESS',
        currentStageStatus: 'IN_PROGRESS',
        historyDescription: `Stage ${currentStageNum} (${stageName}) resumed`,
      };
    }

    if (action === 'CLARIFICATION') {
      return {
        nextStageNum: currentStageNum > 0 ? currentStageNum - 1 : 0,
        procurementStatus: 'IN_PROGRESS',
        currentStageStatus: 'CLARIFICATION_REQUIRED',
        historyDescription: `Clarification requested at Stage ${currentStageNum} (${stageName})`,
      };
    }

    // ── Stage-specific helpers ───────────────────────────────────────────────

    /** Move to next stage, mark current COMPLETED */
    const completeTo = (nextStageNum: number, description: string) => ({
      nextStageNum,
      procurementStatus:
        nextStageNum >= MAX_STAGE ? 'COMPLETED' : ('IN_PROGRESS' as string),
      currentStageStatus: 'COMPLETED',
      historyDescription: description,
    });

    /** Approve current stage, mark it APPROVED, move forward */
    const approveTo = (nextStageNum: number, description?: string) => ({
      nextStageNum,
      procurementStatus: 'IN_PROGRESS' as string,
      currentStageStatus: 'APPROVED',
      historyDescription:
        description ?? `Stage ${currentStageNum} (${stageName}) approved`,
    });

    /** Terminate workflow at current stage — REJECTED */
    const rejectEnd = (description: string) => ({
      nextStageNum: currentStageNum,
      procurementStatus: 'REJECTED' as string,
      currentStageStatus: 'REJECTED',
      historyDescription: description,
    });

    /** Close workflow with a custom terminal status (e.g. FULFILLED) */
    const closeWith = (procStatus: string, description: string) => ({
      nextStageNum: MAX_STAGE, // sentinel — no further stages
      procurementStatus: procStatus,
      currentStageStatus: 'COMPLETED',
      historyDescription: description,
    });

    // ── Per-stage transition map ─────────────────────────────────────────────

    switch (currentStageNum) {
      // ── Stage 0: Indent Creation ───────────────────────────────────────────
      case 0:
        if (action === 'SUBMIT')
          return completeTo(1, 'Indent submitted for verification');
        break;

      // ── Stage 1: Indent Verification ───────────────────────────────────────
      case 1:
        if (action === 'APPROVE')
          return approveTo(
            2,
            'Indent verified; moved to store availability check',
          );
        if (action === 'REJECT')
          return rejectEnd('Indent verification rejected; workflow ended');
        break;

      // ── Stage 2: Check Store Availability ─────────────────────────────────
      //    AVAILABLE  → close workflow (fulfilled from store)
      //    NOT_AVAILABLE → proceed to Float RFQ (stage 3)
      case 2:
        if (action === 'AVAILABLE')
          return closeWith(
            'COMPLETED',
            'Material available in store; indent fulfilled from inventory — workflow closed',
          );
        if (action === 'NOT_AVAILABLE')
          return completeTo(
            3,
            'Material not available in store; proceeding to Float RFQ',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 3: Float RFQ ─────────────────────────────────────────────────
      case 3:
        if (action === 'APPROVE')
          return approveTo(
            4,
            'RFQ floated; moved to Techno Commercial evaluation',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 4: Receive Techno Commercial Offer ───────────────────────────
      case 4:
        if (action === 'APPROVE')
          return approveTo(
            5,
            'Techno commercial offer evaluated; moved to Negotiation & Decision',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 5: Negotiation & Decision ────────────────────────────────────
      case 5:
        if (action === 'APPROVE')
          return approveTo(
            6,
            'Negotiation completed; moved to Purchase Order Creation',
          );
        if (action === 'REJECT')
          return rejectEnd('Negotiation rejected; workflow ended');
        break;

      // ── Stage 6: Purchase Order Creation ───────────────────────────────────
      case 6:
        if (action === 'SUBMIT')
          return completeTo(7, 'Purchase Order created; sent for L1 approval');
        break;

      // ── Stage 7: PO Approval L1 ────────────────────────────────────────────
      case 7:
        if (action === 'APPROVE')
          return approveTo(8, 'PO Approval L1 approved; moved to L2 approval');
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 8: PO Approval L2 ────────────────────────────────────────────
      case 8:
        if (action === 'APPROVE')
          return approveTo(
            9,
            'PO Approval L2 approved; moved to Vendor Acceptance',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 9: Vendor Acceptance ─────────────────────────────────────────
      case 9:
        if (action === 'APPROVE')
          return approveTo(
            10,
            'Vendor accepted PO; moved to Follow-up for Delivery',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 10: Follow-up for Delivery ───────────────────────────────────
      case 10:
        if (action === 'SUBMIT')
          return completeTo(
            11,
            'Delivery follow-up completed; moved to Material Receipt',
          );
        break;

      // ── Stage 11: Material Receipt ─────────────────────────────────────────
      case 11:
        if (action === 'SUBMIT')
          return completeTo(12, 'Material received; moved to Inspection 1');
        break;

      // ── Stage 12: Inspection 1 ─────────────────────────────────────────────
      //    PASS → skip to billing (stage 16)
      //    FAIL → Inspection 2 (stage 13)
      case 12:
        if (action === 'PASS')
          return completeTo(
            16,
            'Inspection 1 passed; material accepted — moving to billing',
          );
        if (action === 'FAIL')
          return {
            nextStageNum: 13,
            procurementStatus: 'IN_PROGRESS',
            currentStageStatus: 'COMPLETED',
            historyDescription: 'Inspection 1 failed; moving to Inspection 2',
          };
        break;

      // ── Stage 13: Inspection 2 ─────────────────────────────────────────────
      //    PASS → skip to billing (stage 16)
      //    FAIL → Inspection 3 (stage 14)
      case 13:
        if (action === 'PASS')
          return completeTo(
            16,
            'Inspection 2 passed; material accepted — moving to billing',
          );
        if (action === 'FAIL')
          return {
            nextStageNum: 14,
            procurementStatus: 'IN_PROGRESS',
            currentStageStatus: 'COMPLETED',
            historyDescription: 'Inspection 2 failed; moving to Inspection 3',
          };
        break;

      // ── Stage 14: Inspection 3 ─────────────────────────────────────────────
      //    PASS → skip to billing (stage 16)
      //    FAIL → Debit Note (stage 15); workflow will close after that
      case 14:
        if (action === 'PASS')
          return completeTo(
            16,
            'Inspection 3 passed; material accepted — moving to billing',
          );
        if (action === 'FAIL')
          return {
            nextStageNum: 15,
            procurementStatus: 'IN_PROGRESS',
            currentStageStatus: 'COMPLETED',
            historyDescription:
              'Inspection 3 failed; moving to Debit Note Preparation',
          };
        break;

      // ── Stage 15: Debit Note Preparation ───────────────────────────────────
      //    Per spec: "Mark procurement as rejected. Close workflow.
      //               Do NOT continue to billing stages."
      case 15:
        if (action === 'SUBMIT')
          return {
            nextStageNum: MAX_STAGE, // sentinel — no further stages
            procurementStatus: 'REJECTED', // distinct from COMPLETED (no payment made)
            currentStageStatus: 'COMPLETED',
            historyDescription:
              'Debit note raised after all inspections failed; procurement closed as rejected',
          };
        break;

      // ── Stage 16: Bill To Accounts ─────────────────────────────────────────
      case 16:
        if (action === 'SUBMIT')
          return completeTo(
            17,
            'Bill forwarded to Accounts; moved to Bill To Purchase',
          );
        break;

      // ── Stage 17: Bill To Purchase ─────────────────────────────────────────
      case 17:
        if (action === 'APPROVE')
          return approveTo(
            18,
            'Bill verified by Purchase; moved to Bill Creation',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 18: Bill Creation + GRN ──────────────────────────────────────
      case 18:
        if (action === 'APPROVE')
          return approveTo(
            19,
            'Bill created with GRN; moved to Book Purchase in Tally',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 19: Book Purchase in Tally ───────────────────────────────────
      case 19:
        if (action === 'APPROVE')
          return approveTo(
            20,
            'Tally entry completed; moved to Bill Approval L1',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 20: Bill Approval L1 ─────────────────────────────────────────
      case 20:
        if (action === 'APPROVE')
          return approveTo(
            21,
            'Bill Approval L1 approved; moved to Bill Approval L2',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 21: Bill Approval L2 ─────────────────────────────────────────
      case 21:
        if (action === 'APPROVE')
          return approveTo(
            22,
            'Bill Approval L2 approved; moved to Payment / Advice',
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Stage 22: Payment / Advice ─────────────────────────────────────────
      //    Accepts both APPROVE (from the stage config DecisionPanel)
      //    and SUBMIT (for backward compatibility with existing API calls).
      case 22:
        if (action === 'APPROVE' || action === 'SUBMIT')
          return {
            nextStageNum: MAX_STAGE,
            procurementStatus: 'COMPLETED',
            currentStageStatus: 'COMPLETED',
            historyDescription:
              'Payment advice issued; procurement workflow completed',
          };
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
        break;

      // ── Default: generic forward progression for any unlisted stage ─────────
      default:
        if (action === 'SUBMIT' || action === 'MOVE_NEXT')
          return completeTo(
            Math.min(currentStageNum + 1, MAX_STAGE),
            `Stage ${currentStageNum} (${stageName}) submitted`,
          );
        if (action === 'APPROVE')
          return approveTo(
            Math.min(currentStageNum + 1, MAX_STAGE),
            `Stage ${currentStageNum} (${stageName}) approved`,
          );
        if (action === 'REJECT')
          return rejectEnd(`Stage ${currentStageNum} (${stageName}) rejected`);
    }

    throw new BadRequestException(
      `Action "${action}" is not valid at Stage ${currentStageNum} (${stageName}). ` +
        `Permitted actions depend on the current stage. Check the workflow configuration.`,
    );
  }

  // ─── Bulk Stage Update ──────────────────────────────────────────────────────
  /**
   * Evaluates which of the requested procurement records can legally accept
   * `action` right now, reusing the same resolveStageTransition state machine
   * that single-record updates use. Records are skipped (never rolled back
   * together) rather than failing the whole batch — each carries its own reason.
   */
  private async evaluateBulkEligibility(
    procurementIds: string[],
    action: string,
  ) {
    const upperAction = action.toUpperCase();
    const uniqueIds = Array.from(new Set(procurementIds));

    const records = await this.prisma.procurement.findMany({
      where: { id: { in: uniqueIds } },
      include: { stages: true },
    });

    const foundIds = new Set(records.map((r) => r.id));
    const eligible: {
      procurement: (typeof records)[number];
      currentStage: (typeof records)[number]['stages'][number];
      transition: ReturnType<typeof this.resolveStageTransition>;
    }[] = [];
    const blocked: { id: string; referenceNo?: string; reason: string }[] = [];

    for (const missingId of uniqueIds) {
      if (!foundIds.has(missingId)) {
        blocked.push({ id: missingId, reason: 'Record not found' });
      }
    }

    for (const procurement of records) {
      if (procurement.status === 'COMPLETED') {
        blocked.push({
          id: procurement.id,
          referenceNo: procurement.referenceNo,
          reason: 'Already completed',
        });
        continue;
      }
      if (procurement.status === 'CANCELLED') {
        blocked.push({
          id: procurement.id,
          referenceNo: procurement.referenceNo,
          reason: 'Procurement cancelled',
        });
        continue;
      }
      if (procurement.status === 'REJECTED' && upperAction !== 'RESUME') {
        blocked.push({
          id: procurement.id,
          referenceNo: procurement.referenceNo,
          reason: 'Procurement rejected; workflow ended',
        });
        continue;
      }

      const currentStage = procurement.stages.find(
        (s) => s.stageNumber === procurement.currentStage,
      );
      if (!currentStage) {
        blocked.push({
          id: procurement.id,
          referenceNo: procurement.referenceNo,
          reason: `Stage ${procurement.currentStage} record missing`,
        });
        continue;
      }

      try {
        const transition = this.resolveStageTransition(
          procurement.currentStage,
          currentStage.stageName,
          upperAction,
        );
        eligible.push({ procurement, currentStage, transition });
      } catch (err: any) {
        blocked.push({
          id: procurement.id,
          referenceNo: procurement.referenceNo,
          reason:
            err?.message ||
            `Action ${upperAction} is not valid for stage ${procurement.currentStage} (${currentStage.stageName})`,
        });
      }
    }

    return { eligible, blocked, totalSelected: uniqueIds.length };
  }

  // ─── Bulk Stage Update: Preview ────────────────────────────────────────────
  async previewBulkStageAction(dto: BulkStageActionDto) {
    const { eligible, blocked, totalSelected } =
      await this.evaluateBulkEligibility(dto.procurementIds, dto.action);

    const stageBreakdown = new Map<
      number,
      { stageNumber: number; stageName: string; count: number }
    >();
    for (const item of eligible) {
      const key = item.procurement.currentStage;
      const existing = stageBreakdown.get(key);
      if (existing) existing.count += 1;
      else
        stageBreakdown.set(key, {
          stageNumber: key,
          stageName: item.currentStage.stageName,
          count: 1,
        });
    }

    return {
      totalSelected,
      totalEligible: eligible.length,
      totalBlocked: blocked.length,
      eligibleRecords: eligible.map((e) => ({
        id: e.procurement.id,
        referenceNo: e.procurement.referenceNo,
        title: e.procurement.title,
        currentStage: e.procurement.currentStage,
        currentStageName: e.currentStage.stageName,
        nextStageNum: Math.min(e.transition.nextStageNum, MAX_STAGE),
      })),
      blockedRecords: blocked,
    };
  }

  // ─── Bulk Stage Update: Execute ─────────────────────────────────────────────
  async bulkStageAction(
    dto: BulkStageActionDto,
    userId: string,
    ipAddress?: string,
  ) {
    const startedAt = Date.now();
    const actorId = await this.resolveActorId(userId);
    const upperAction = dto.action.toUpperCase();

    const stageConfigs = await this.prisma.stageConfiguration.findMany({
      include: { defaultOwners: { select: { id: true } } },
    });

    const { eligible, blocked, totalSelected } =
      await this.evaluateBulkEligibility(dto.procurementIds, dto.action);

    if (dto.dryRun) {
      return this.previewBulkStageAction(dto);
    }

    const updated: { id: string; referenceNo: string }[] = [];
    const failed: { id: string; referenceNo?: string; reason: string }[] = [];

    // Pre-fetch actor info once to avoid N+1 queries in the batch loop
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    // Batch processing: commit each record inside its own short transaction so
    // one failure never rolls back records already successfully updated.
    const BATCH_SIZE = 25;
    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      const batch = eligible.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ procurement, currentStage, transition }) => {
          try {
            const nextStageNum = Math.min(transition.nextStageNum, MAX_STAGE);
            const procurementStatus =
              transition.nextStageNum > MAX_STAGE
                ? 'COMPLETED'
                : transition.procurementStatus;
            const currentStageStatus = transition.currentStageStatus;

            await this.prisma.$transaction(async (tx) => {
              if (dto.remarks) {
                await tx.procurementRemark.create({
                  data: {
                    procurementId: procurement.id,
                    stageNumber: procurement.currentStage,
                    comment: dto.remarks,
                    authorId: actorId,
                  },
                });
              }

              await tx.procurementStage.update({
                where: { id: currentStage.id },
                data: {
                  status: currentStageStatus,
                  actionTaken: upperAction,
                  remarks: dto.remarks,
                  completedAt: ['COMPLETED', 'APPROVED', 'REJECTED'].includes(
                    currentStageStatus,
                  )
                    ? new Date()
                    : undefined,
                },
              });

              if (
                nextStageNum > procurement.currentStage &&
                nextStageNum <= MAX_STAGE
              ) {
                const nextStageStatus =
                  procurementStatus === 'COMPLETED'
                    ? 'COMPLETED'
                    : 'IN_PROGRESS';
                let nextStageAssignedToId = dto.assignedToId || undefined;
                let dueDate = undefined;

                const nextStageConfig = stageConfigs.find(
                  (c) => c.stageNumber === nextStageNum,
                );

                if (nextStageConfig) {
                  if (nextStageConfig.isDynamicOwner) {
                    const verificationStage = procurement.stages.find(
                      (s) => s.stageNumber === 1,
                    );
                    nextStageAssignedToId =
                      dto.assignedToId ||
                      verificationStage?.assignedToId ||
                      nextStageAssignedToId;
                  } else if (nextStageConfig.defaultOwners.length > 0) {
                    nextStageAssignedToId = nextStageConfig.defaultOwners[0].id;
                  }
                  if (nextStageConfig.tatHours) {
                    dueDate = new Date(
                      Date.now() + nextStageConfig.tatHours * 60 * 60 * 1000,
                    );
                  }
                }

                await tx.procurementStage.upsert({
                  where: {
                    procurementId_stageNumber: {
                      procurementId: procurement.id,
                      stageNumber: nextStageNum,
                    },
                  },
                  create: {
                    procurementId: procurement.id,
                    stageNumber: nextStageNum,
                    stageName:
                      PROCUREMENT_STAGES.find((s) => s.number === nextStageNum)
                        ?.name || `Stage ${nextStageNum}`,
                    status: nextStageStatus,
                    startedAt: new Date(),
                    completedAt:
                      procurementStatus === 'COMPLETED'
                        ? new Date()
                        : undefined,
                    assignedToId: nextStageAssignedToId,
                    dueDate,
                  },
                  update: {
                    status: nextStageStatus,
                    startedAt: new Date(),
                    completedAt:
                      procurementStatus === 'COMPLETED'
                        ? new Date()
                        : undefined,
                    assignedToId: nextStageAssignedToId,
                    dueDate,
                  },
                });
              }

              await tx.procurement.update({
                where: { id: procurement.id },
                data: {
                  currentStage: nextStageNum,
                  status: procurementStatus,
                  completedAt:
                    procurementStatus === 'COMPLETED' ||
                    procurementStatus === 'REJECTED'
                      ? new Date()
                      : undefined,
                  history: {
                    create: {
                      action: upperAction,
                      description: transition.historyDescription,
                      performedById: actorId,
                      stageNumber: procurement.currentStage,
                      metadata: JSON.stringify({
                        updateType: 'BULK_UPDATE',
                        remarks: dto.remarks,
                        effectiveDate: dto.effectiveDate,
                      }),
                    },
                  },
                },
              });
            });

            updated.push({
              id: procurement.id,
              referenceNo: procurement.referenceNo,
            });

            // SLA lifecycle hooks for bulk
            if (
              ['COMPLETED', 'APPROVED', 'REJECTED'].includes(
                transition.currentStageStatus,
              )
            ) {
              this.slaMonitor
                .onStageCompleted(
                  procurement.id,
                  procurement.currentStage,
                  new Date(),
                )
                .catch(() => {});
            }
            // HOLD → start delay tracking
            if (upperAction === 'HOLD') {
              this.slaMonitor
                .onStageHeld(
                  procurement.id,
                  procurement.currentStage,
                  currentStage.stageName,
                  actorId,
                  currentStage.assignedToId ?? undefined,
                )
                .catch(() => {});
            }
            // RESUME → end active hold delay
            if (upperAction === 'RESUME') {
              this.slaMonitor
                .onStageResumed(procurement.id, procurement.currentStage)
                .catch(() => {});
            }
            // Only activate SLA for real processing stages — not the terminal sentinel (23)
            if (
              nextStageNum > procurement.currentStage &&
              nextStageNum < MAX_STAGE
            ) {
              const nextStageDef = PROCUREMENT_STAGES.find(
                (s) => s.number === nextStageNum,
              );
              this.slaMonitor
                .onStageActivated(
                  procurement.id,
                  nextStageNum,
                  nextStageDef?.name ?? `Stage ${nextStageNum}`,
                  new Date(),
                )
                .catch(() => {});
            }

            if (dto.notifyUsers) {
              this.notifications
                .broadcast({
                  type:
                    upperAction === 'REJECT'
                      ? 'error'
                      : upperAction === 'HOLD'
                        ? 'warning'
                        : 'success',
                  title: `${currentStage.stageName} — ${upperAction} (Bulk Update)`,
                  message: `${procurement.referenceNo}: ${transition.historyDescription}`,
                  href: `/procurement/${procurement.id}`,
                  procurementId: procurement.id,
                  stageNumber: procurement.currentStage,
                  excludeUserId: actorId,
                })
                .catch(() => {});
            }

            // Publish to Email Notification Service (actor already fetched before batch loop)
            const creator = await this.prisma.user.findUnique({
              where: { id: procurement.requestedById },
              select: { email: true },
            });
            this.eventEmitter.emit('procurement.notification', {
              procurementId: procurement.id,
              referenceNo: procurement.referenceNo,
              projectName: procurement.projectName,
              stageName: currentStage.stageName,
              stageNumber: procurement.currentStage,
              actorName: actor?.fullName || 'System',
              timestamp: new Date().toLocaleString(),
              actionTaken:
                upperAction === 'FORWARD' ||
                upperAction === 'SUBMIT' ||
                upperAction === 'APPROVE'
                  ? upperAction === 'APPROVE'
                    ? 'Approve'
                    : 'Transition'
                  : upperAction === 'REJECT'
                    ? 'Reject'
                    : upperAction === 'HOLD'
                      ? 'Hold'
                      : upperAction === 'CLARIFICATION'
                        ? 'Clarification'
                        : 'Transition',
              remarks: dto.remarks,
              creatorEmail: creator?.email,
            });
          } catch (err: any) {
            failed.push({
              id: procurement.id,
              referenceNo: procurement.referenceNo,
              reason: err?.message || 'Unknown error during update',
            });
          }
        }),
      );
    }

    const durationMs = Date.now() - startedAt;

    await this.prisma.bulkOperation.create({
      data: {
        action: upperAction,
        totalSelected,
        totalEligible: eligible.length,
        totalUpdated: updated.length,
        totalSkipped: blocked.length,
        totalFailed: failed.length,
        remarks: dto.remarks,
        notifyUsers: !!dto.notifyUsers,
        ipAddress,
        performedById: actorId,
        durationMs,
        resultDetail: JSON.stringify({ updated, blocked, failed }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: `BULK_STAGE_UPDATE:${upperAction}`,
        performedById: actorId,
      },
    });

    return {
      totalSelected,
      totalEligible: eligible.length,
      totalUpdated: updated.length,
      totalSkipped: blocked.length,
      totalFailed: failed.length,
      durationMs,
      updatedRecords: updated,
      skippedRecords: blocked,
      failedRecords: failed,
    };
  }

  // ─── Bulk Stage Update: Multi-Execute (Item Level) ────────────────────────
  async bulkMultiStageAction(
    dto: BulkMultiStageActionDto,
    userId: string,
    ipAddress?: string,
  ) {
    const startedAt = Date.now();
    const actorId = await this.resolveActorId(userId);

    const stageConfigs = await this.prisma.stageConfiguration.findMany({
      include: { defaultOwners: { select: { id: true } } },
    });

    // Pre-fetch actor info once
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    const updatedItems: {
      id: string;
      referenceNo: string;
      itemName: string;
    }[] = [];
    const failed: { id: string; referenceNo?: string; reason: string }[] = [];
    const blocked: { id: string; reason: string }[] = [];

    // Extract item IDs from the DTO (the DTO calls it procurementId, but it's really the itemId from the frontend)
    const itemIds = dto.updates.map((u) => u.procurementId);

    // Fetch the items to get their parent procurement
    const items = await this.prisma.procurementItem.findMany({
      where: { id: { in: itemIds } },
      include: {
        procurement: {
          include: { stages: true },
        },
        sku: true,
      },
    });

    const itemMap = new Map(items.map((i) => [i.id, i]));
    const procurementUpdates = new Map<
      string,
      {
        procurement: any;
        updates: typeof dto.updates;
      }
    >();

    for (const update of dto.updates) {
      const item = itemMap.get(update.procurementId);
      if (!item) {
        failed.push({ id: update.procurementId, reason: 'Item not found' });
        continue;
      }

      const pId = item.procurementId;
      if (!procurementUpdates.has(pId)) {
        procurementUpdates.set(pId, {
          procurement: item.procurement,
          updates: [],
        });
      }
      procurementUpdates.get(pId)!.updates.push(update);
    }

    // Now evaluate bulk eligibility for each unique Procurement
    const eligibleBatch = [];

    for (const [procurementId, data] of procurementUpdates.entries()) {
      // To prevent premature stage advancement, we must ensure all items have a terminal status
      // (APPROVED or REJECTED) before allowing the parent Indent to transition.
      const procurement = data.procurement;
      const currentStageObj = procurement.stages?.find(
        (s: any) => s.stageNumber === procurement.currentStage,
      );

      let existingMetadata: any = {};
      try {
        if (currentStageObj?.metadata) {
          existingMetadata = JSON.parse(currentStageObj.metadata);
        }
      } catch (e) {
        // ignore
      }

      // Collect all item statuses (existing + incoming)
      const itemStatuses = new Map<string, string>();
      if (procurement.items) {
        for (const item of procurement.items) {
          const existingAction = existingMetadata[item.id]?.action;
          itemStatuses.set(
            item.id,
            existingAction ? existingAction.toUpperCase() : 'PENDING',
          );
        }
      }
      for (const u of data.updates) {
        if (u.action) {
          itemStatuses.set(u.procurementId, u.action.toUpperCase());
        }
      }

      const allStatuses = Array.from(itemStatuses.values());
      const hasPendingOrHold = allStatuses.some(
        (s) => s === 'PENDING' || s === 'HOLD' || s === 'CLARIFICATION',
      );
      const allRejected = allStatuses.every((s) => s === 'REJECT');

      let combinedAction: string;
      if (allStatuses.includes('APPROVE')) {
        combinedAction = 'APPROVE';
      } else if (allStatuses.includes('AVAILABLE')) {
        combinedAction = 'AVAILABLE';
      } else if (allStatuses.includes('NOT_AVAILABLE')) {
        combinedAction = 'NOT_AVAILABLE';
      } else if (
        allStatuses.includes('PENDING') ||
        allStatuses.includes('CLARIFICATION')
      ) {
        combinedAction = 'HOLD';
      } else if (allStatuses.includes('HOLD')) {
        combinedAction = 'HOLD';
      } else if (allRejected) {
        combinedAction = 'REJECT';
      } else {
        combinedAction = 'APPROVE';
      }

      const evalResult = await this.evaluateBulkEligibility(
        [procurementId],
        combinedAction,
      );
      if (evalResult.blocked.length > 0) {
        blocked.push(...evalResult.blocked);
        continue;
      }
      if (evalResult.eligible.length > 0) {
        eligibleBatch.push({
          ...evalResult.eligible[0],
          itemUpdates: data.updates,
          combinedAction,
          existingMetadata,
        });
      }
    }

    const BATCH_SIZE = 10;
    for (let i = 0; i < eligibleBatch.length; i += BATCH_SIZE) {
      const batch = eligibleBatch.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(
          async ({
            procurement,
            currentStage,
            transition,
            itemUpdates,
            combinedAction,
            existingMetadata,
          }) => {
            try {
              const nextStageNum = Math.min(transition.nextStageNum, MAX_STAGE);
              const procurementStatus =
                transition.nextStageNum > MAX_STAGE
                  ? 'COMPLETED'
                  : transition.procurementStatus;
              const currentStageStatus = transition.currentStageStatus;

              // Collect all remarks from the item updates to log them
              const allRemarks = itemUpdates
                .map((u) => u.remarks)
                .filter(Boolean)
                .join(' | ');

              // Aggregate metadata
              const stageMetadata: Record<string, any> = {
                ...existingMetadata,
              };
              for (const u of itemUpdates) {
                const prevMeta = stageMetadata[u.procurementId] || {};
                const actionStr = u.action?.toUpperCase();
                stageMetadata[u.procurementId] = {
                  ...prevMeta,
                  ...(u.metadata || {}),
                };
                if (actionStr) {
                  stageMetadata[u.procurementId].action = actionStr;
                }
              }

              await this.prisma.$transaction(async (tx) => {
                // Update each item
                for (const update of itemUpdates) {
                  const itemData: any = {};
                  if (update.assignedToId)
                    itemData.assignedToId = update.assignedToId;
                  if (update.toFrom) itemData.toFrom = update.toFrom;

                  // Store Check (stage 2), NOT_AVAILABLE: the item's quantity
                  // is reduced to the shortfall (requiredQty - availableQty)
                  // so only the unfulfilled portion proceeds through RFQ and
                  // the rest of procurement — mirrors the single-record
                  // stageAction() behaviour above (storeCheckItemUpdates).
                  if (
                    procurement.currentStage === 2 &&
                    combinedAction === 'NOT_AVAILABLE' &&
                    typeof update.metadata?.shortQty === 'number' &&
                    update.metadata.shortQty >= 0
                  ) {
                    itemData.quantity = update.metadata.shortQty;
                  }

                  // ─── Finance Fields Update (S16-S22) ───
                  if (update.metadata?.billNumber) {
                    itemData.billNumber = update.metadata.billNumber;
                  }
                  if (update.metadata?.grnNumber) {
                    itemData.grnNumber = update.metadata.grnNumber;
                  }
                  if (procurement.currentStage >= 16) {
                    if (update.action)
                      itemData.financeStatus = update.action.toUpperCase();
                    if (update.remarks)
                      itemData.financeRemarks = update.remarks;
                  }

                  if (Object.keys(itemData).length > 0) {
                    await tx.procurementItem.update({
                      where: { id: update.procurementId },
                      data: itemData,
                    });
                  }

                  const itemName =
                    items.find((it) => it.id === update.procurementId)
                      ?.itemName || 'Item';
                  updatedItems.push({
                    id: update.procurementId,
                    referenceNo: procurement.referenceNo,
                    itemName,
                  });
                }

                if (allRemarks) {
                  await tx.procurementRemark.create({
                    data: {
                      procurementId: procurement.id,
                      stageNumber: procurement.currentStage,
                      comment: allRemarks,
                      authorId: actorId,
                    },
                  });
                }

                await tx.procurementStage.update({
                  where: { id: currentStage.id },
                  data: {
                    status: currentStageStatus,
                    actionTaken: combinedAction,
                    remarks: allRemarks,
                    metadata:
                      Object.keys(stageMetadata).length > 0
                        ? JSON.stringify(stageMetadata)
                        : currentStage.metadata,
                    completedAt: ['COMPLETED', 'APPROVED', 'REJECTED'].includes(
                      currentStageStatus,
                    )
                      ? new Date()
                      : undefined,
                  },
                });

                if (
                  nextStageNum > procurement.currentStage &&
                  nextStageNum <= MAX_STAGE
                ) {
                  const nextStageStatus =
                    procurementStatus === 'COMPLETED'
                      ? 'COMPLETED'
                      : 'IN_PROGRESS';

                  let nextStageAssignedToId = undefined; // Falls back to config below (per-item assignedToId doesn't apply at procurement/stage level here).
                  let dueDate = undefined;

                  const nextStageConfig = stageConfigs.find(
                    (c) => c.stageNumber === nextStageNum,
                  );

                  if (nextStageConfig) {
                    if (nextStageConfig.isDynamicOwner) {
                      const verificationStage = procurement.stages?.find(
                        (s: any) => s.stageNumber === 1,
                      );
                      nextStageAssignedToId =
                        verificationStage?.assignedToId || undefined;
                    } else if (nextStageConfig.defaultOwners.length > 0) {
                      nextStageAssignedToId =
                        nextStageConfig.defaultOwners[0].id;
                    }
                    if (nextStageConfig.tatHours) {
                      dueDate = new Date(
                        Date.now() + nextStageConfig.tatHours * 60 * 60 * 1000,
                      );
                    }
                  }

                  await tx.procurementStage.upsert({
                    where: {
                      procurementId_stageNumber: {
                        procurementId: procurement.id,
                        stageNumber: nextStageNum,
                      },
                    },
                    create: {
                      procurementId: procurement.id,
                      stageNumber: nextStageNum,
                      stageName:
                        PROCUREMENT_STAGES.find(
                          (s) => s.number === nextStageNum,
                        )?.name || `Stage ${nextStageNum}`,
                      status: nextStageStatus,
                      startedAt: new Date(),
                      completedAt:
                        procurementStatus === 'COMPLETED'
                          ? new Date()
                          : undefined,
                      assignedToId: nextStageAssignedToId,
                      dueDate,
                    },
                    update: {
                      status: nextStageStatus,
                      startedAt: new Date(),
                      completedAt:
                        procurementStatus === 'COMPLETED'
                          ? new Date()
                          : undefined,
                      assignedToId: nextStageAssignedToId,
                      dueDate,
                    },
                  });
                }

                const updateData: any = {
                  currentStage: nextStageNum,
                  status: procurementStatus,
                  completedAt:
                    procurementStatus === 'COMPLETED' ||
                    procurementStatus === 'REJECTED'
                      ? new Date()
                      : undefined,
                  history: {
                    create: {
                      action: combinedAction,
                      description: transition.historyDescription,
                      performedById: actorId,
                      stageNumber: procurement.currentStage,
                      metadata: JSON.stringify({
                        updateType: 'BULK_MULTI_UPDATE',
                        itemsUpdated: itemUpdates.length,
                      }),
                    },
                  },
                };

                await tx.procurement.update({
                  where: { id: procurement.id },
                  data: updateData,
                });
              });

              if (dto.notifyUsers) {
                this.notifications
                  .broadcast({
                    type: 'success',
                    title: `${currentStage.stageName} — Verified (Bulk Multi)`,
                    message: `${procurement.referenceNo}: ${transition.historyDescription}`,
                    href: `/procurement/${procurement.id}`,
                    procurementId: procurement.id,
                    stageNumber: procurement.currentStage,
                    excludeUserId: actorId,
                  })
                  .catch(() => {});
              }

              // Publish to Email Notification Service (actor pre-fetched above)
              const creator = await this.prisma.user.findUnique({
                where: { id: procurement.requestedById },
                select: { email: true },
              });
              this.eventEmitter.emit('procurement.notification', {
                procurementId: procurement.id,
                referenceNo: procurement.referenceNo,
                projectName: procurement.projectName,
                stageName: currentStage.stageName,
                stageNumber: procurement.currentStage,
                actorName: actor?.fullName || 'System',
                timestamp: new Date().toLocaleString(),
                actionTaken:
                  combinedAction === 'FORWARD' ||
                  combinedAction === 'SUBMIT' ||
                  combinedAction === 'APPROVE'
                    ? combinedAction === 'APPROVE'
                      ? 'Approve'
                      : 'Transition'
                    : combinedAction === 'REJECT'
                      ? 'Reject'
                      : combinedAction === 'HOLD'
                        ? 'Hold'
                        : combinedAction === 'CLARIFICATION'
                          ? 'Clarification'
                          : 'Transition',
                creatorEmail: creator?.email,
                items: itemUpdates.map((u) => {
                  const it = items.find((it) => it.id === u.procurementId);
                  return {
                    id: u.procurementId,
                    bbuCode:
                      it?.bbuCode ||
                      `${procurement.referenceNo}-${u.procurementId.slice(-4)}`,
                    itemName: it?.itemName || 'Unknown Item',
                    sku: (it as any)?.sku?.itemCode || 'N/A',
                    quantity: it?.quantity ? Number(it.quantity) : 0,
                    action: u.action?.toUpperCase(),
                    remarks: u.remarks,
                    assignedToId: u.assignedToId,
                  };
                }),
              });
            } catch (err: any) {
              failed.push({
                id: procurement.id,
                referenceNo: procurement.referenceNo,
                reason: err?.message || 'Unknown error during update',
              });
            }
          },
        ),
      );
    }

    const durationMs = Date.now() - startedAt;

    await this.prisma.bulkOperation.create({
      data: {
        action: 'MULTI',
        totalSelected: dto.updates.length,
        totalEligible: eligibleBatch.length, // Number of indents eligible
        totalUpdated: updatedItems.length, // Number of items updated
        totalSkipped: blocked.length, // Number of indents blocked
        totalFailed: failed.length, // Number of indents failed
        notifyUsers: !!dto.notifyUsers,
        ipAddress,
        performedById: actorId,
        durationMs,
        resultDetail: JSON.stringify({ updatedItems, blocked, failed }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: `BULK_STAGE_UPDATE:MULTI`,
        performedById: actorId,
      },
    });

    return {
      totalSelected: dto.updates.length,
      totalEligible: eligibleBatch.length,
      totalUpdated: updatedItems.length,
      totalSkipped: blocked.length,
      totalFailed: failed.length,
      durationMs,
      updatedRecords: updatedItems,
      skippedRecords: blocked,
      failedRecords: failed,
    };
  }

  // ─── Add Remark ────────────────────────────────────────────────────────────
  async addRemark(id: string, dto: AddRemarkDto, userId: string) {
    const actorId = await this.resolveActorId(userId);
    const procurement = await this.prisma.procurement.findUnique({
      where: { id },
    });
    if (!procurement)
      throw new NotFoundException('Procurement record not found');

    const remark = await this.prisma.procurementRemark.create({
      data: {
        procurementId: id,
        stageNumber: dto.stageNumber ?? procurement.currentStage,
        comment: dto.comment,
        authorId: actorId,
      },
      include: {
        author: { select: { id: true, fullName: true, employeeId: true } },
      },
    });

    // History entry
    await this.prisma.procurementHistory.create({
      data: {
        procurementId: id,
        action: 'REMARK_ADDED',
        description: `Remark added at stage ${dto.stageNumber ?? procurement.currentStage}`,
        performedById: actorId,
        stageNumber: dto.stageNumber ?? procurement.currentStage,
      },
    });

    return remark;
  }

  // ─── Get Remarks ───────────────────────────────────────────────────────────
  async getRemarks(id: string) {
    return this.prisma.procurementRemark.findMany({
      where: { procurementId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
  }

  // ─── Get History ───────────────────────────────────────────────────────────
  async getHistory(id: string) {
    return this.prisma.procurementHistory.findMany({
      where: { procurementId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        performedBy: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
  }

  // ─── Dashboard Stats ───────────────────────────────────────────────────────
  async getDashboardStats(userId?: string, roles?: string[]) {
    const isGlobal =
      roles?.includes('Super Admin') || roles?.includes('Procurement Admin');
    const authFilter =
      !isGlobal && userId
        ? {
            OR: [
              { requestedById: userId },
              {
                stages: {
                  some: {
                    assignedToId: userId,
                    status: { in: ['PENDING', 'IN_PROGRESS'] },
                  },
                },
              },
            ],
          }
        : {};

    // For related queries (history, stages), we need the procurement IDs when filtering by user
    let procurementIdFilter: { in: string[] } | undefined;
    if (!isGlobal && userId && Object.keys(authFilter).length > 0) {
      const userProcurements = await this.prisma.procurement.findMany({
        where: authFilter,
        select: { id: true },
        take: 10000,
      });
      procurementIdFilter = { in: userProcurements.map((p) => p.id) };
    }

    const [
      totalIndents,
      inProgress,
      pending,
      onHold,
      rejected,
      completed,
      archived,
      recentActivity,
      stageCounts,
      slaBreachedCount,
      slaApproachingCount,
      slaOnTrackCount,
    ] = await Promise.all([
      this.prisma.procurement.count({ where: authFilter }),
      // In Progress = active workflow (excludes freshly-submitted SUBMITTED)
      this.prisma.procurement.count({
        where: { status: { in: ['IN_PROGRESS', 'SUBMITTED'] }, ...authFilter },
      }),
      // Pending = awaiting first action (SUBMITTED, sitting at stage 1)
      this.prisma.procurement.count({
        where: { status: 'SUBMITTED', ...authFilter },
      }),
      this.prisma.procurement.count({
        where: { status: 'ON_HOLD', ...authFilter },
      }),
      this.prisma.procurement.count({
        where: { status: 'REJECTED', ...authFilter },
      }),
      this.prisma.procurement.count({
        where: { status: 'COMPLETED', ...authFilter },
      }),
      // Archived = cancelled records
      this.prisma.procurement.count({
        where: { status: 'CANCELLED', ...authFilter },
      }),
      this.prisma.procurementHistory.findMany({
        where: procurementIdFilter
          ? { procurementId: procurementIdFilter }
          : {},
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          procurement: { select: { id: true, referenceNo: true, title: true } },
          performedBy: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.procurement.groupBy({
        by: ['currentStage'],
        where: { status: { in: ['IN_PROGRESS', 'SUBMITTED'] }, ...authFilter },
        _count: { _all: true },
      }),
      // SLA breach count — use SlaRecord as authoritative source (v2.5.0+)
      this.prisma.slaRecord.count({
        where: {
          slaStatus: 'SLA_BREACHED',
          completedAt: null,
          ...(procurementIdFilter
            ? { procurementId: procurementIdFilter }
            : {}),
        },
      }),
      // Approaching SLA (75–100% consumed, not yet breached)
      this.prisma.slaRecord.count({
        where: {
          slaStatus: 'APPROACHING_SLA',
          completedAt: null,
          ...(procurementIdFilter
            ? { procurementId: procurementIdFilter }
            : {}),
        },
      }),
      // On-track active SLA records
      this.prisma.slaRecord.count({
        where: {
          slaStatus: 'ON_TRACK',
          completedAt: null,
          ...(procurementIdFilter
            ? { procurementId: procurementIdFilter }
            : {}),
        },
      }),
    ]);

    const stagePipeline = PROCUREMENT_STAGES.map((s) => ({
      stage: s.number,
      name: s.name,
      count:
        stageCounts.find((c) => c.currentStage === s.number)?._count._all ?? 0,
    }));

    return {
      totalIndents,
      inProgress,
      pending,
      onHold,
      rejected,
      completed,
      archived,
      // delayed = number of distinct procurements with an active SLA breach
      delayed: slaBreachedCount,
      stagePipeline,
      recentActivity,
      sla: {
        onTrack: slaOnTrackCount,
        approaching: slaApproachingCount,
        breached: slaBreachedCount,
      },
    };
  }

  // ─── Stage KPI Cards calculation ──────────────────────────────────────────
  async getStageKPIs(stageNumber: number) {
    const [stagesData, slaStats, slaBreached, slaOnTime] = await Promise.all([
      this.prisma.procurementStage.findMany({
        where: {
          stageNumber,
          status: { not: 'PENDING' },
        },
        select: {
          status: true,
          metadata: true,
          procurement: { select: { items: { select: { id: true } } } },
        },
      }),
      // Use SlaRecord for accurate delay metrics
      this.prisma.slaRecord.aggregate({
        where: { stageNumber },
        _avg: { delayHours: true },
        _sum: { delayHours: true },
        _count: { _all: true },
      }),
      this.prisma.slaRecord.count({
        where: {
          stageNumber,
          slaStatus: { in: ['SLA_BREACHED', 'COMPLETED_LATE'] },
        },
      }),
      this.prisma.slaRecord.count({
        where: { stageNumber, slaStatus: 'COMPLETED_ON_TIME' },
      }),
    ]);

    let totalProcessed = 0;
    let totalApproved = 0;
    let totalRejected = 0;

    for (const stage of stagesData) {
      let md: any = {};
      try {
        if (stage.metadata) md = JSON.parse(stage.metadata);
      } catch (e) {
        // ignore
      }

      if (Object.keys(md).length > 0 && stage.procurement?.items) {
        // Item-wise calculation
        for (const item of stage.procurement.items) {
          const action = md[item.id]?.action?.toUpperCase();
          if (action) totalProcessed++;
          if (action === 'APPROVE' || action === 'SUBMIT') totalApproved++;
          if (action === 'REJECT') totalRejected++;
        }
      } else {
        // Fallback to stage status if no item metadata
        totalProcessed++;
        if (['APPROVED', 'COMPLETED'].includes(stage.status.toUpperCase()))
          totalApproved++;
        if (stage.status.toUpperCase() === 'REJECTED') totalRejected++;
      }
    }

    const approvalRate =
      totalProcessed > 0 ? (totalApproved / totalProcessed) * 100 : 0;
    const rejectionRate =
      totalProcessed > 0 ? (totalRejected / totalProcessed) * 100 : 0;

    return {
      totalProcessed,
      totalApproved,
      totalRejected,
      averageDelayHours: slaStats._avg.delayHours ?? 0,
      totalDelayHours: slaStats._sum.delayHours ?? 0,
      slaBreached,
      slaOnTime,
      approvalRate,
      rejectionRate,
    };
  }

  // ─── Assign Stage ──────────────────────────────────────────────────────────
  async assignStage(
    id: string,
    stageNumber: number,
    assignedToId: string,
    userId: string,
  ) {
    const actorId = await this.resolveActorId(userId);
    const procurement = await this.prisma.procurement.findUnique({
      where: { id },
      include: { stages: true },
    });
    if (!procurement)
      throw new NotFoundException('Procurement record not found');

    const stage = procurement.stages.find((s) => s.stageNumber === stageNumber);
    if (!stage) throw new NotFoundException('Stage not found');

    await this.prisma.procurementStage.update({
      where: { id: stage.id },
      data: { assignedToId },
    });

    await this.prisma.procurementHistory.create({
      data: {
        procurementId: id,
        action: 'ASSIGNED',
        description: `Stage ${stageNumber} assigned to user`,
        performedById: actorId,
        stageNumber,
      },
    });

    return this.findOne(id);
  }

  // ─── Cancel ────────────────────────────────────────────────────────────────
  async cancel(id: string, remarks: string, userId: string) {
    const actorId = await this.resolveActorId(userId);
    const procurement = await this.prisma.procurement.findUnique({
      where: { id },
    });
    if (!procurement)
      throw new NotFoundException('Procurement record not found');

    const updated = await this.prisma.procurement.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        history: {
          create: {
            action: 'CANCELLED',
            description: remarks || 'Procurement cancelled',
            performedById: actorId,
            stageNumber: procurement.currentStage,
          },
        },
      },
      include: this.fullInclude(),
    });

    if (remarks) {
      await this.prisma.procurementRemark.create({
        data: {
          procurementId: id,
          stageNumber: procurement.currentStage,
          comment: `CANCELLED: ${remarks}`,
          authorId: actorId,
        },
      });
    }

    // Broadcast notification for cancellation
    this.notifications
      .broadcast({
        type: 'error',
        title: 'Procurement Cancelled',
        message: `${procurement.referenceNo} — ${procurement.title}`,
        href: `/procurement/${id}`,
        procurementId: id,
        excludeUserId: actorId,
      })
      .catch(() => {});

    return updated;
  }

  // ─── Consolidated: Command Center ─────────────────────────────────────────
  async getCommandCenter() {
    const activeStatuses = {
      status: { in: ['IN_PROGRESS', 'SUBMITTED', 'ON_HOLD'] as string[] },
    };
    const [
      stageCounts,
      holdCount,
      rejectedCount,
      completedCount,
      totalCount,
      recentHistory,
    ] = await Promise.all([
      this.prisma.procurement.groupBy({
        by: ['currentStage'],
        where: activeStatuses,
        _count: { _all: true },
      }),
      this.prisma.procurement.count({ where: { status: 'ON_HOLD' } }),
      this.prisma.procurement.count({ where: { status: 'REJECTED' } }),
      this.prisma.procurement.count({ where: { status: 'COMPLETED' } }),
      this.prisma.procurement.count(),
      this.prisma.procurementHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          description: true,
          stageNumber: true,
          createdAt: true,
          procurement: {
            select: {
              id: true,
              referenceNo: true,
              title: true,
              currentStage: true,
              status: true,
            },
          },
          performedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);
    return {
      stageCounts,
      holdCount,
      rejectedCount,
      completedCount,
      totalCount,
      recentHistory,
    };
  }

  // ─── Consolidated: Control Tower (active records summary) ─────────────────
  async getControlTower() {
    const [activeRecords, stageSummary, slaBreachedCount, escalationsCount] =
      await Promise.all([
        this.prisma.procurement.findMany({
          where: { status: { in: ['IN_PROGRESS', 'SUBMITTED', 'ON_HOLD'] } },
          orderBy: { updatedAt: 'desc' },
          take: 200,
          select: {
            id: true,
            referenceNo: true,
            title: true,
            currentStage: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            requestedBy: { select: { id: true, fullName: true } },
            assignedTo: { select: { id: true, fullName: true } },
            stages: {
              where: { status: { in: ['IN_PROGRESS', 'ON_HOLD'] } },
              select: {
                stageNumber: true,
                stageName: true,
                status: true,
                startedAt: true,
                slaBreached: true,
                assignedTo: { select: { id: true, fullName: true } },
              },
              take: 1,
            },
          },
        }),
        this.prisma.procurement.groupBy({
          by: ['currentStage', 'status'],
          where: { status: { in: ['IN_PROGRESS', 'SUBMITTED', 'ON_HOLD'] } },
          _count: { _all: true },
        }),
        // Use SlaRecord as authoritative source for breach count
        this.prisma.slaRecord.count({
          where: { slaStatus: 'SLA_BREACHED', completedAt: null },
        }),
        // Count distinct escalation-level history entries for active procurements
        this.prisma.escalationLog.count(),
      ]);

    return {
      activeRecords,
      stageSummary,
      slaBreached: slaBreachedCount,
      escalations: escalationsCount,
    };
  }

  // ─── Consolidated: Pending Analytics ──────────────────────────────────────
  async getPendingAnalytics() {
    const [
      pending,
      onHold,
      byStage,
      byPriority,
      recentlyMoved,
      slaBreachedCount,
      slaApproachingCount,
      slaOnTrackCount,
      delayedRecords,
    ] = await Promise.all([
      this.prisma.procurement.findMany({
        where: { status: { in: ['IN_PROGRESS', 'SUBMITTED'] } },
        orderBy: { updatedAt: 'asc' },
        select: {
          id: true,
          referenceNo: true,
          title: true,
          currentStage: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          requestedBy: { select: { fullName: true } },
          stages: {
            where: { status: { in: ['IN_PROGRESS', 'SUBMITTED'] } },
            select: {
              stageNumber: true,
              stageName: true,
              startedAt: true,
              assignedTo: { select: { id: true, fullName: true } },
            },
            take: 1,
          },
        },
      }),
      this.prisma.procurement.findMany({
        where: { status: 'ON_HOLD' },
        orderBy: { updatedAt: 'asc' },
        select: {
          id: true,
          referenceNo: true,
          title: true,
          currentStage: true,
          priority: true,
          updatedAt: true,
          requestedBy: { select: { fullName: true } },
        },
      }),
      this.prisma.procurement.groupBy({
        by: ['currentStage'],
        where: { status: { in: ['IN_PROGRESS', 'SUBMITTED'] } },
        _count: { _all: true },
      }),
      this.prisma.procurement.groupBy({
        by: ['priority'],
        where: { status: { in: ['IN_PROGRESS', 'SUBMITTED'] } },
        _count: { _all: true },
      }),
      this.prisma.procurementHistory.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          action: true,
          stageNumber: true,
          createdAt: true,
          procurement: {
            select: { id: true, referenceNo: true, currentStage: true },
          },
        },
      }),
      // SLA queues — authoritative from SlaRecord
      this.prisma.slaRecord.count({
        where: { slaStatus: 'SLA_BREACHED', completedAt: null },
      }),
      this.prisma.slaRecord.count({
        where: { slaStatus: 'APPROACHING_SLA', completedAt: null },
      }),
      this.prisma.slaRecord.count({
        where: { slaStatus: 'ON_TRACK', completedAt: null },
      }),
      // Top delayed records for queue display
      this.prisma.slaRecord.findMany({
        where: { slaStatus: 'SLA_BREACHED', completedAt: null },
        orderBy: { delayHours: 'desc' },
        take: 20,
        select: {
          procurementId: true,
          stageNumber: true,
          stageName: true,
          dueAt: true,
          delayHours: true,
          procurement: {
            select: {
              referenceNo: true,
              title: true,
              priority: true,
              currentStage: true,
              status: true,
              stages: {
                where: { status: { in: ['IN_PROGRESS', 'ON_HOLD'] } },
                select: {
                  assignedTo: { select: { id: true, fullName: true } },
                },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    return {
      pending,
      onHold,
      byStage,
      byPriority,
      recentlyMoved,
      sla: {
        breached: slaBreachedCount,
        approaching: slaApproachingCount,
        onTrack: slaOnTrackCount,
      },
      delayedRecords,
    };
  }

  // ─── Consolidated: Lifecycle ───────────────────────────────────────────────
  async getLifecycle(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.search) {
      where.OR = [
        { referenceNo: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status === 'REJECTED') {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { status: 'REJECTED' },
            {
              stages: { some: { metadata: { contains: '"action":"REJECT"' } } },
            },
          ],
        },
      ];
    } else if (query.status === 'ON_HOLD') {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { status: 'ON_HOLD' },
            { stages: { some: { metadata: { contains: '"action":"HOLD"' } } } },
          ],
        },
      ];
    } else if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.procurement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          referenceNo: true,
          title: true,
          currentStage: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          projectName: true,
          projectId: true,
          application: true,
          itemType: true,
          requiredDate: true,
          vendorName: true,
          paintingSpec: true,
          paintingSpecRemark: true,
          packingRequirement: true,
          certification: true,
          manuals: true,
          warrantyGuarantee: true,
          ga: true,
          requestedBy: { select: { fullName: true } },
          items: {
            select: {
              itemName: true,
              itemCode: true,
              quantity: true,
              unit: true,
              technicalSpec: true,
              approvedMakes: true,
            },
            take: 3,
          },
          stages: {
            select: {
              stageNumber: true,
              status: true,
              startedAt: true,
              completedAt: true,
            },
            orderBy: { stageNumber: 'asc' },
          },
        },
      }),
      this.prisma.procurement.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Send Rejection Email ─────────────────────────────────────────────────
  private async sendRejectionEmail(params: {
    procurementId: string;
    referenceNo: string;
    projectName?: string;
    requestedById: string;
    stageName: string;
    stageNumber: number;
    rejectedById: string;
    reason: string;
    remarks?: string;
    status: string;
  }) {
    // Fetch the rejector details and the indent creator (requestor)
    const [rejectedByUser, requestorUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: params.rejectedById },
        select: { fullName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: params.requestedById },
        select: { fullName: true, email: true },
      }),
    ]);

    const rejectedByName = rejectedByUser?.fullName || 'Unknown';
    const recipientEmail = requestorUser?.email;

    if (!recipientEmail) {
      this.logger.warn(
        `Cannot send rejection email for ${params.referenceNo}: creator (${params.requestedById}) has no email`,
      );
      // Still log the rejection event even if email can't be sent
      await this.prisma.rejectionEmail.create({
        data: {
          procurementId: params.procurementId,
          stageNumber: params.stageNumber,
          stageName: params.stageName,
          rejectedById: params.rejectedById,
          rejectedAt: new Date(),
          remarks: params.remarks,
          reason: params.reason,
          emailSent: false,
          recipientEmail: 'unknown',
          emailError: 'Creator has no email on record',
        },
      });
      return;
    }

    // Format date
    const now = new Date();
    const rejectedAtFormatted = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Prepare item description (first item name as summary)
    const items = await this.prisma.procurementItem.findMany({
      where: { procurementId: params.procurementId },
      select: { itemName: true },
      take: 3,
    });
    const itemDescription = items.map((i) => i.itemName).join(', ') || 'N/A';

    // Send email (do not block on failure - rejection must complete)
    const emailResult = await this.emailService.sendRejectionEmail({
      to: recipientEmail,
      indentNumber: params.referenceNo,
      projectName: params.projectName,
      itemDescription,
      stage: params.stageName,
      rejectedBy: rejectedByName,
      rejectedAt: rejectedAtFormatted,
      reason: params.reason,
      remarks: params.remarks,
      status: params.status,
    });

    // Log the rejection email event to the database
    await this.prisma.rejectionEmail.create({
      data: {
        procurementId: params.procurementId,
        stageNumber: params.stageNumber,
        stageName: params.stageName,
        rejectedById: params.rejectedById,
        rejectedAt: new Date(),
        remarks: params.remarks,
        reason: params.reason,
        emailSent: emailResult.success,
        emailSentAt: emailResult.success ? new Date() : undefined,
        recipientEmail,
        emailError: emailResult.success ? undefined : emailResult.error,
      },
    });

    // Create audit trail entry
    await this.prisma.auditLog.create({
      data: {
        userId: params.requestedById,
        action: 'REJECTION_EMAIL_SENT',
        performedById: params.rejectedById,
        timestamp: new Date(),
      },
    });

    if (emailResult.success) {
      this.logger.log(
        `Rejection email sent to ${recipientEmail} for ${params.referenceNo}`,
      );
    } else {
      this.logger.warn(
        `Rejection email FAILED to send to ${recipientEmail} for ${params.referenceNo}: ${emailResult.error}`,
      );
    }
  }

  // ─── Draft Management ───────────────────────────────────────────────────────
  async deleteDraft(id: string, userId: string) {
    const procurement = await this.prisma.procurement.findUnique({
      where: { id },
      select: { id: true, status: true, requestedById: true },
    });

    if (!procurement) throw new NotFoundException('Procurement not found');
    if (procurement.status !== 'DRAFT') {
      throw new BadRequestException('Only drafts can be deleted');
    }

    const actorId = await this.resolveActorId(userId);

    // Verify user owns this draft (unless admin)
    if (procurement.requestedById !== actorId) {
      const user = await this.prisma.user.findUnique({
        where: { id: actorId },
        include: { userRoles: { include: { role: true } } },
      });
      const roleNames = user?.userRoles.map((ur) => ur.role.name) ?? [];
      const isAdmin =
        roleNames.includes('Super Admin') ||
        roleNames.includes('Procurement Admin');

      if (!isAdmin) {
        throw new BadRequestException('You can only delete your own drafts');
      }
    }

    // Cascade delete will handle items, stages, history, etc.
    return this.prisma.procurement.delete({
      where: { id },
    });
  }

  async duplicateDraft(id: string, userId: string) {
    const actorId = await this.resolveActorId(userId);
    const procurement = await this.prisma.procurement.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!procurement) throw new NotFoundException('Procurement not found');

    try {
      const referenceNo = await this.generateReferenceNo();

      // Fetch Stage Configurations to initialize all stages
      const stageConfigs = await this.prisma.stageConfiguration.findMany({
        include: { defaultOwners: { select: { id: true } } },
      });

      // Build initial stages for all 24 steps (stages 0-23)
      const stagesData = PROCUREMENT_STAGES.map((s) => {
        const config = stageConfigs.find((c) => c.stageNumber === s.number);
        let startedAt;
        let dueDate;

        if (s.number === 0) {
          startedAt = new Date();
          if (config?.tatHours) {
            dueDate = new Date(
              startedAt.getTime() + config.tatHours * 60 * 60 * 1000,
            );
          }
        }

        return {
          stageNumber: s.number,
          stageName: s.name,
          status: s.number === 0 ? 'IN_PROGRESS' : 'PENDING',
          startedAt,
          dueDate,
          assignedToId:
            !config?.isDynamicOwner && (config?.defaultOwners?.length ?? 0) > 0
              ? config!.defaultOwners[0].id
              : s.number === 0
                ? actorId
                : undefined,
        };
      });

      // ─── Link items to SKU master (batch query, not N+1) ──────────────────────
      const enrichedItems = await this.linkItemsToSkus(procurement.items);

      const duplicated = await this.prisma.procurement.create({
        data: {
          title: `${procurement.title} (Copy)`,
          description: procurement.description,
          referenceNo,
          projectId: procurement.projectId,
          projectName: procurement.projectName,
          application: procurement.application,
          itemType: procurement.itemType,
          departmentId: procurement.departmentId,
          priority: procurement.priority,
          requiredDate: procurement.requiredDate,
          paintingSpecRemark: procurement.paintingSpecRemark,
          packingRequirement: procurement.packingRequirement,
          certification: procurement.certification,
          manuals: procurement.manuals,
          warrantyGuarantee: procurement.warrantyGuarantee,
          ga: procurement.ga,
          status: 'DRAFT',
          currentStage: 0,
          requestedById: actorId,
          stages: { create: stagesData },
          items: {
            create: enrichedItems,
          },
          history: {
            create: {
              action: 'CREATED',
              description: `Duplicated from ${procurement.referenceNo}`,
              performedById: actorId,
              stageNumber: 0,
            },
          },
        },
        include: this.fullInclude(),
      });

      this.logger.log(
        `Draft ${procurement.referenceNo} duplicated to ${referenceNo} by user ${actorId}`,
      );

      return duplicated;
    } catch (error) {
      this.logger.error(`Failed to duplicate draft ${id}`, error);
      throw new BadRequestException(
        error.message ||
          'Failed to duplicate draft. Please try again or contact support.',
      );
    }
  }

  // ─── Email Helper for Procurement Workflow ──────────────────────────────────
  private async sendWorkflowEmail(params: {
    procurementId: string;
    referenceNo: string;
    projectName?: string;
    stageName: string;
    stageNumber: number;
    action: string;
    nextStage?: string;
    actorName: string;
    remarks?: string;
  }) {
    // Email is controlled by master gate in NotificationService
    // This helper just emits the event; actual sending happens in NotificationService
    this.eventEmitter.emit('procurement.notification', {
      procurementId: params.procurementId,
      referenceNo: params.referenceNo,
      projectName: params.projectName,
      stageName: params.stageName,
      stageNumber: params.stageNumber,
      actorName: params.actorName,
      timestamp: new Date().toLocaleString(),
      actionTaken: params.action,
      remarks: params.remarks,
    });
  }

  // ─── Full Include helper ──────────────────────────────────────────────────
  private fullInclude() {
    return {
      requestedBy: {
        select: {
          id: true,
          fullName: true,
          employeeId: true,
          designation: true,
        },
      },
      assignedTo: { select: { id: true, fullName: true, employeeId: true } },
      stages: {
        orderBy: { stageNumber: 'asc' as const },
        include: {
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
      },
      items: {
        include: {
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
      },
      attachments: {
        orderBy: { createdAt: 'desc' as const },
        include: {
          uploadedBy: { select: { id: true, fullName: true } },
        },
      },
      remarks: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          author: { select: { id: true, fullName: true, employeeId: true } },
        },
      },
      history: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          performedBy: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
      },
      // Note: slaRecords and escalationLogs are fetched via separate endpoints
      // (/procurement/:id/sla) to avoid Prisma type issues before migration runs
    };
  }
}
