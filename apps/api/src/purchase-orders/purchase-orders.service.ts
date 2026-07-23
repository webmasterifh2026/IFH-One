import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { BulkPoCreationDto, PoApprovalActionDto } from './dto/po-creation.dto';

const EMAIL_OVERRIDE = process.env.EMAIL_OVERRIDE_TO || '29x.aditya@gmail.com';

@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // ═════════════════════════════════════════════════════════════════════════
  // PO CREATION MODULE (S6)
  // ═════════════════════════════════════════════════════════════════════════

  async getPoCreationQueue(
    search?: string,
    status?: string,
    projectId?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {
      procurement: { currentStage: 5, status: { not: 'CANCELLED' } },
    };
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { itemName: { contains: search } },
        { bbuCode: { contains: search } },
        { procurement: { referenceNo: { contains: search } } },
        { procurement: { projectName: { contains: search } } },
      ];
    }
    if (status) where.poStatus = status;
    if (projectId) where.procurement = { ...where.procurement, projectId };
    const [items, total] = await Promise.all([
      this.prisma.procurementItem.findMany({
        where,
        include: {
          procurement: {
            include: {
              requestedBy: {
                select: { id: true, fullName: true, employeeId: true },
              },
              assignedTo: { select: { id: true, fullName: true } },
            },
          },
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.procurementItem.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async bulkUpdatePoCreation(dto: BulkPoCreationDto, userId: string) {
    const results = {
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };
    for (const item of dto.items) {
      try {
        const procurementItem = await this.prisma.procurementItem.findUnique({
          where: { id: item.itemId },
          include: { procurement: true },
        });
        if (!procurementItem) {
          results.skipped++;
          results.errors.push(`Item ${item.itemId}: not found`);
          continue;
        }
        if (item.poNumber) {
          const existing = await this.prisma.procurementItem.findFirst({
            where: { poNumber: item.poNumber, id: { not: item.itemId } },
          });
          if (existing) {
            results.skipped++;
            results.errors.push(
              `Item ${item.itemId}: PO number ${item.poNumber} already exists`,
            );
            continue;
          }
        }
        await this.prisma.procurementItem.update({
          where: { id: item.itemId },
          data: {
            poNumber: item.poNumber || procurementItem.poNumber,
            poRemarks: item.remarks || procurementItem.poRemarks,
            poCreatedAt: item.poNumber
              ? new Date()
              : procurementItem.poCreatedAt,
            poStatus: item.poNumber ? 'PENDING' : procurementItem.poStatus,
          },
        });
        await this.prisma.procurementHistory.create({
          data: {
            procurementId: procurementItem.procurementId,
            stageNumber: 5,
            action: item.poNumber ? 'PO_CREATED' : 'PO_UPDATED',
            description: item.poNumber
              ? `PO Number ${item.poNumber} assigned to item ${procurementItem.bbuCode || procurementItem.itemCode}`
              : `PO remarks updated for item ${procurementItem.bbuCode || procurementItem.itemCode}`,
            performedById: userId,
            metadata: JSON.stringify({
              poNumber: item.poNumber,
              remarks: item.remarks,
            }),
          },
        });
        results.updated++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Item ${item.itemId}: ${error.message}`);
      }
    }
    await this.prisma.bulkOperation.create({
      data: {
        action: 'PO_CREATION_BULK_UPDATE',
        targetStageHint: 5,
        totalSelected: dto.items.length,
        totalEligible: dto.items.length,
        totalUpdated: results.updated,
        totalSkipped: results.skipped,
        totalFailed: results.failed,
        remarks: dto.remarks,
        performedById: userId,
        resultDetail: JSON.stringify(results.errors),
      },
    });
    return results;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PO APPROVAL LEVEL 1 (S7)
  // ═════════════════════════════════════════════════════════════════════════

  async getPoApprovalL1Queue(
    search?: string,
    status?: string,
    projectId?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {
      procurement: { currentStage: 6, status: { not: 'CANCELLED' } },
      poStatus: { not: 'PENDING' },
    };
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { itemName: { contains: search } },
        { bbuCode: { contains: search } },
        { procurement: { referenceNo: { contains: search } } },
        { procurement: { projectName: { contains: search } } },
      ];
    }
    if (status) where.poStatus = status;
    if (projectId) where.procurement = { ...where.procurement, projectId };
    const [items, total] = await Promise.all([
      this.prisma.procurementItem.findMany({
        where,
        include: {
          procurement: {
            include: {
              requestedBy: {
                select: { id: true, fullName: true, employeeId: true },
              },
              assignedTo: { select: { id: true, fullName: true } },
            },
          },
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
        orderBy: { poCreatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.procurementItem.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async poApprovalL1Action(
    itemId: string,
    dto: PoApprovalActionDto,
    userId: string,
  ) {
    const item = await this.prisma.procurementItem.findUnique({
      where: { id: itemId },
      include: { procurement: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (!item.poNumber) throw new BadRequestException('PO number not assigned');
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    if (dto.action === 'APPROVED') {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: { poStatus: 'APPROVED_L1', poApprovedL1At: new Date() },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 6 },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actionTaken: 'APPROVED',
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 7 },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
      await this.prisma.procurement.update({
        where: { id: item.procurementId },
        data: { currentStage: 7 },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 6,
          action: 'PO_APPROVED_L1',
          description: `PO ${item.poNumber} approved at Level 1 by ${actor?.fullName || 'Unknown'}`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            remarks: dto.remarks,
          }),
        },
      });
      return {
        success: true,
        message: 'PO approved at Level 1',
        data: updated,
      };
    } else {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: {
          poStatus: 'REJECTED_L1',
          poRejectedAt: new Date(),
          poRejectedBy: actor?.fullName || 'Unknown',
          poRejectionReason: dto.reason || dto.remarks,
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 6 },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
          actionTaken: 'REJECTED',
          remarks: dto.reason || dto.remarks,
        },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 6,
          action: 'PO_REJECTED_L1',
          description: `PO ${item.poNumber} rejected at Level 1 by ${actor?.fullName || 'Unknown'}. Reason: ${dto.reason || dto.remarks}`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            reason: dto.reason,
            remarks: dto.remarks,
          }),
        },
      });
      await this.prisma.rejectionEmail.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 6,
          stageName: 'PO Approval Level 1',
          rejectedById: userId,
          rejectedAt: new Date(),
          remarks: dto.remarks,
          reason: dto.reason,
          recipientEmail: EMAIL_OVERRIDE,
          emailSent: false,
        },
      });
      await this.sendRejectionEmail(
        item,
        'PO Approval Level 1',
        dto.reason || dto.remarks || '',
        actor?.fullName || 'Unknown',
      );
      return {
        success: true,
        message: 'PO rejected at Level 1',
        data: updated,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PO APPROVAL LEVEL 2 (S8)
  // ═════════════════════════════════════════════════════════════════════════

  async getPoApprovalL2Queue(
    search?: string,
    status?: string,
    projectId?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {
      procurement: { currentStage: 7, status: { not: 'CANCELLED' } },
      poStatus: 'APPROVED_L1',
    };
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { itemName: { contains: search } },
        { bbuCode: { contains: search } },
        { procurement: { referenceNo: { contains: search } } },
        { procurement: { projectName: { contains: search } } },
      ];
    }
    if (status) where.poStatus = status;
    if (projectId) where.procurement = { ...where.procurement, projectId };
    const [items, total] = await Promise.all([
      this.prisma.procurementItem.findMany({
        where,
        include: {
          procurement: {
            include: {
              requestedBy: {
                select: { id: true, fullName: true, employeeId: true },
              },
              assignedTo: { select: { id: true, fullName: true } },
            },
          },
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
        orderBy: { poApprovedL1At: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.procurementItem.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async poApprovalL2Action(
    itemId: string,
    dto: PoApprovalActionDto,
    userId: string,
  ) {
    const item = await this.prisma.procurementItem.findUnique({
      where: { id: itemId },
      include: { procurement: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.poStatus !== 'APPROVED_L1')
      throw new BadRequestException('Item must be approved at Level 1 first');
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    if (dto.action === 'APPROVED') {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: { poStatus: 'APPROVED_L2', poApprovedL2At: new Date() },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 7 },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actionTaken: 'APPROVED',
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 8 },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
      await this.prisma.procurement.update({
        where: { id: item.procurementId },
        data: { currentStage: 8 },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 7,
          action: 'PO_APPROVED_L2',
          description: `PO ${item.poNumber} finally approved by ${actor?.fullName || 'Unknown'}. Ready for vendor acceptance.`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            remarks: dto.remarks,
          }),
        },
      });
      return { success: true, message: 'PO finally approved', data: updated };
    } else {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: {
          poStatus: 'REJECTED_L2',
          poRejectedAt: new Date(),
          poRejectedBy: actor?.fullName || 'Unknown',
          poRejectionReason: dto.reason || dto.remarks,
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 7 },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
          actionTaken: 'REJECTED',
          remarks: dto.reason || dto.remarks,
        },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 7,
          action: 'PO_REJECTED_L2',
          description: `PO ${item.poNumber} rejected at final approval by ${actor?.fullName || 'Unknown'}. Reason: ${dto.reason || dto.remarks}`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            reason: dto.reason,
            remarks: dto.remarks,
          }),
        },
      });
      await this.prisma.rejectionEmail.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 7,
          stageName: 'PO Approval Level 2',
          rejectedById: userId,
          rejectedAt: new Date(),
          remarks: dto.remarks,
          reason: dto.reason,
          recipientEmail: EMAIL_OVERRIDE,
          emailSent: false,
        },
      });
      await this.sendRejectionEmail(
        item,
        'PO Approval Level 2',
        dto.reason || dto.remarks || '',
        actor?.fullName || 'Unknown',
      );
      return {
        success: true,
        message: 'PO rejected at final approval',
        data: updated,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VENDOR ACCEPTANCE (S9)
  // ═════════════════════════════════════════════════════════════════════════

  async getVendorAcceptanceQueue(
    search?: string,
    status?: string,
    projectId?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {
      procurement: { currentStage: 8, status: { not: 'CANCELLED' } },
      poStatus: 'APPROVED_L2',
      vendorAcceptanceStatus: { not: 'ACCEPTED' },
    };
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { itemName: { contains: search } },
        { bbuCode: { contains: search } },
        { procurement: { referenceNo: { contains: search } } },
        { procurement: { projectName: { contains: search } } },
      ];
    }
    if (status) where.vendorAcceptanceStatus = status;
    if (projectId) where.procurement = { ...where.procurement, projectId };
    const [items, total] = await Promise.all([
      this.prisma.procurementItem.findMany({
        where,
        include: {
          procurement: {
            include: {
              requestedBy: {
                select: { id: true, fullName: true, employeeId: true },
              },
              assignedTo: { select: { id: true, fullName: true } },
            },
          },
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
        orderBy: { poApprovedL2At: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.procurementItem.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async vendorAcceptanceAction(
    itemId: string,
    action: 'ACCEPTED' | 'REJECTED',
    remarks: string | undefined,
    userId: string,
  ) {
    const item = await this.prisma.procurementItem.findUnique({
      where: { id: itemId },
      include: { procurement: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.poStatus !== 'APPROVED_L2')
      throw new BadRequestException('Item must be finally approved first');
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    if (action === 'ACCEPTED') {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: {
          vendorAcceptanceStatus: 'ACCEPTED',
          vendorAcceptedAt: new Date(),
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 8 },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actionTaken: 'ACCEPTED',
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 9 },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
      await this.prisma.procurement.update({
        where: { id: item.procurementId },
        data: { currentStage: 9 },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 8,
          action: 'VENDOR_ACCEPTED',
          description: `Vendor accepted PO ${item.poNumber}. Moved to Vendor Follow-up.`,
          performedById: userId,
          metadata: JSON.stringify({ poNumber: item.poNumber, remarks }),
        },
      });
      return { success: true, message: 'Vendor accepted PO', data: updated };
    } else {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: {
          vendorAcceptanceStatus: 'REJECTED',
          vendorRejectedAt: new Date(),
          vendorRejectionReason: remarks,
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 8 },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
          actionTaken: 'REJECTED',
          remarks,
        },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 8,
          action: 'VENDOR_REJECTED',
          description: `Vendor rejected PO ${item.poNumber}. Reason: ${remarks}`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            reason: remarks,
          }),
        },
      });
      await this.prisma.rejectionEmail.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 8,
          stageName: 'Vendor Acceptance',
          rejectedById: userId,
          rejectedAt: new Date(),
          remarks,
          reason: remarks,
          recipientEmail: EMAIL_OVERRIDE,
          emailSent: false,
        },
      });
      await this.sendRejectionEmail(
        item,
        'Vendor Acceptance',
        remarks || '',
        actor?.fullName || 'Unknown',
      );
      return { success: true, message: 'Vendor rejected PO', data: updated };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VENDOR FOLLOW-UP (S10)
  // ═════════════════════════════════════════════════════════════════════════

  async getVendorFollowupQueue(
    search?: string,
    status?: string,
    projectId?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {
      procurement: { currentStage: 9, status: { not: 'CANCELLED' } },
      vendorAcceptanceStatus: 'ACCEPTED',
    };
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { itemName: { contains: search } },
        { bbuCode: { contains: search } },
        { procurement: { referenceNo: { contains: search } } },
        { procurement: { projectName: { contains: search } } },
      ];
    }
    if (status) where.vendorFollowupStatus = status;
    if (projectId) where.procurement = { ...where.procurement, projectId };
    const [items, total] = await Promise.all([
      this.prisma.procurementItem.findMany({
        where,
        include: {
          procurement: {
            include: {
              requestedBy: {
                select: { id: true, fullName: true, employeeId: true },
              },
              assignedTo: { select: { id: true, fullName: true } },
            },
          },
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
        orderBy: { vendorAcceptedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.procurementItem.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async vendorFollowupAction(
    itemId: string,
    action: 'COMPLETED' | 'DELAYED' | 'REJECTED',
    data: {
      vendorAgreedDate?: Date;
      crmRemarks?: string;
      rejectionReason?: string;
    },
    userId: string,
  ) {
    const item = await this.prisma.procurementItem.findUnique({
      where: { id: itemId },
      include: { procurement: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.vendorAcceptanceStatus !== 'ACCEPTED')
      throw new BadRequestException('Item must be vendor accepted first');
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    if (action === 'COMPLETED') {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: {
          vendorFollowupStatus: 'COMPLETED',
          vendorAgreedDate: data.vendorAgreedDate || new Date(),
          vendorFollowupCompletedAt: new Date(),
          crmRemarks: data.crmRemarks,
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 9 },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actionTaken: 'FOLLOWUP_COMPLETED',
        },
      });
      await this.prisma.procurement.update({
        where: { id: item.procurementId },
        data: { currentStage: 10 },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 9,
          action: 'VENDOR_FOLLOWUP_COMPLETED',
          description: `Vendor follow-up completed for PO ${item.poNumber}. Agreed date: ${data.vendorAgreedDate ? data.vendorAgreedDate.toISOString() : 'N/A'}`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            vendorAgreedDate: data.vendorAgreedDate,
            crmRemarks: data.crmRemarks,
          }),
        },
      });
      return {
        success: true,
        message: 'Vendor follow-up completed',
        data: updated,
      };
    } else if (action === 'DELAYED') {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: {
          vendorFollowupStatus: 'DELAYED',
          vendorFollowupDelayedAt: new Date(),
          crmRemarks: data.crmRemarks,
        },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 9,
          action: 'VENDOR_FOLLOWUP_DELAYED',
          description: `Vendor follow-up delayed for PO ${item.poNumber}. CRM remarks: ${data.crmRemarks}`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            crmRemarks: data.crmRemarks,
          }),
        },
      });
      return {
        success: true,
        message: 'Vendor follow-up marked as delayed',
        data: updated,
      };
    } else {
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: {
          vendorFollowupStatus: 'REJECTED',
          vendorFollowupRejectedAt: new Date(),
          vendorFollowupRejectionReason: data.rejectionReason,
          crmRemarks: data.crmRemarks,
        },
      });
      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 9 },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
          actionTaken: 'REJECTED',
          remarks: data.rejectionReason,
        },
      });
      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 9,
          action: 'VENDOR_FOLLOWUP_REJECTED',
          description: `Vendor follow-up rejected for PO ${item.poNumber}. Reason: ${data.rejectionReason}`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            reason: data.rejectionReason,
            crmRemarks: data.crmRemarks,
          }),
        },
      });
      await this.prisma.rejectionEmail.create({
        data: {
          procurementId: item.procurementId,
          stageNumber: 9,
          stageName: 'Vendor Follow-up',
          rejectedById: userId,
          rejectedAt: new Date(),
          remarks: data.crmRemarks,
          reason: data.rejectionReason,
          recipientEmail: EMAIL_OVERRIDE,
          emailSent: false,
        },
      });
      await this.sendRejectionEmail(
        item,
        'Vendor Follow-up',
        data.rejectionReason || '',
        actor?.fullName || 'Unknown',
      );
      return {
        success: true,
        message: 'Vendor follow-up rejected',
        data: updated,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // INSPECTION WORKFLOW (S12, S13, S14)
  // ═════════════════════════════════════════════════════════════════════════

  async getInspectionQueue(
    level: number,
    search?: string,
    status?: string,
    projectId?: string,
    page = 1,
    limit = 20,
  ) {
    const stageNumber = level + 11; // S12=12, S13=13, S14=14
    const where: any = {
      procurement: { currentStage: stageNumber, status: { not: 'CANCELLED' } },
      currentInspectionLevel: level,
    };

    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { itemName: { contains: search } },
        { bbuCode: { contains: search } },
        { procurement: { referenceNo: { contains: search } } },
        { procurement: { projectName: { contains: search } } },
      ];
    }

    const statusField = `inspectionLevel${level}Status`;
    if (status) where[statusField] = status;
    if (projectId) where.procurement = { ...where.procurement, projectId };

    const [items, total] = await Promise.all([
      this.prisma.procurementItem.findMany({
        where,
        include: {
          procurement: {
            include: {
              requestedBy: {
                select: { id: true, fullName: true, employeeId: true },
              },
              assignedTo: { select: { id: true, fullName: true } },
            },
          },
          assignedTo: {
            select: { id: true, fullName: true, employeeId: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.procurementItem.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async inspectionAction(
    itemId: string,
    level: number,
    qcResult: 'APPROVED' | 'REJECTED',
    remarks: string | undefined,
    userId: string,
  ) {
    const item = await this.prisma.procurementItem.findUnique({
      where: { id: itemId },
      include: { procurement: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.vendorFollowupStatus !== 'COMPLETED')
      throw new BadRequestException(
        'Item must have completed vendor follow-up first',
      );

    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    const statusField = `inspectionLevel${level}Status`;
    const timestampField = `inspectionLevel${level}At`;
    const byIdField = `inspectionLevel${level}ById`;
    const remarksField = `inspectionLevel${level}Remarks`;
    const stageNumber = level + 11; // S12=12, S13=13, S14=14

    if (qcResult === 'APPROVED') {
      // Approved - move to Bill to Accounts (Stage 15)
      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: {
          [statusField]: 'APPROVED',
          [timestampField]: new Date(),
          [byIdField]: userId,
          [remarksField]: remarks,
          finalInspectionResult: 'APPROVED',
          currentInspectionLevel: 0,
        },
      });

      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actionTaken: 'APPROVED',
        },
      });

      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber: 15 },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });

      await this.prisma.procurement.update({
        where: { id: item.procurementId },
        data: { currentStage: 15 },
      });

      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber,
          action: `INSPECTION_LEVEL_${level}_APPROVED`,
          description: `Inspection Level ${level} approved for PO ${item.poNumber} by ${actor?.fullName || 'Unknown'}. Moved to Bill to Accounts.`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            level,
            qcResult,
            remarks,
          }),
        },
      });

      return {
        success: true,
        message: `Inspection Level ${level} approved - moved to Bill to Accounts`,
        data: updated,
      };
    } else {
      // Rejected
      const newAttempts = (item.inspectionAttempts || 0) + 1;
      const nextLevel = level + 1;
      const isFinalRejection = level === 3 || newAttempts >= 3;

      const updateData: any = {
        [statusField]: 'REJECTED',
        [timestampField]: new Date(),
        [byIdField]: userId,
        [remarksField]: remarks,
        inspectionAttempts: newAttempts,
      };

      if (isFinalRejection) {
        // Final rejection - move to Debit Note
        updateData.finalInspectionResult = 'REJECTED';
        updateData.debitNoteGenerated = true;
        updateData.debitNoteGeneratedAt = new Date();
        updateData.currentInspectionLevel = 0;
      } else {
        // Move to next inspection level
        updateData.currentInspectionLevel = nextLevel;
      }

      const updated = await this.prisma.procurementItem.update({
        where: { id: itemId },
        data: updateData,
      });

      await this.prisma.procurementStage.updateMany({
        where: { procurementId: item.procurementId, stageNumber },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
          actionTaken: 'REJECTED',
          remarks,
        },
      });

      if (isFinalRejection) {
        // Move to Debit Note (Stage 16)
        await this.prisma.procurementStage.updateMany({
          where: { procurementId: item.procurementId, stageNumber: 16 },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        });
        await this.prisma.procurement.update({
          where: { id: item.procurementId },
          data: { currentStage: 16 },
        });
      } else {
        // Move to next inspection level
        await this.prisma.procurementStage.updateMany({
          where: {
            procurementId: item.procurementId,
            stageNumber: stageNumber + 1,
          },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        });
        await this.prisma.procurement.update({
          where: { id: item.procurementId },
          data: { currentStage: stageNumber + 1 },
        });
      }

      await this.prisma.procurementHistory.create({
        data: {
          procurementId: item.procurementId,
          stageNumber,
          action: `INSPECTION_LEVEL_${level}_REJECTED`,
          description: `Inspection Level ${level} rejected for PO ${item.poNumber} by ${actor?.fullName || 'Unknown'}. ${isFinalRejection ? 'Moved to Debit Note.' : `Moved to Inspection Level ${nextLevel}.`} Reason: ${remarks}`,
          performedById: userId,
          metadata: JSON.stringify({
            poNumber: item.poNumber,
            level,
            qcResult,
            remarks,
            isFinalRejection,
            newAttempts,
          }),
        },
      });

      if (isFinalRejection) {
        await this.prisma.rejectionEmail.create({
          data: {
            procurementId: item.procurementId,
            stageNumber: 14,
            stageName: 'Inspection Level 3',
            rejectedById: userId,
            rejectedAt: new Date(),
            remarks,
            reason: remarks,
            recipientEmail: EMAIL_OVERRIDE,
            emailSent: false,
          },
        });
        await this.sendRejectionEmail(
          item,
          'Inspection Level 3 (Final)',
          remarks || '',
          actor?.fullName || 'Unknown',
        );
      }

      return {
        success: true,
        message: isFinalRejection
          ? 'Final inspection rejected - moved to Debit Note'
          : `Inspection Level ${level} rejected - moved to Level ${nextLevel}`,
        data: updated,
      };
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // COMMON MODULE VIEW
  // ═════════════════════════════════════════════════════════════════════════

  async getFullIndentView(itemId: string) {
    const item = await this.prisma.procurementItem.findUnique({
      where: { id: itemId },
      include: {
        procurement: {
          include: {
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
            stages: { orderBy: { stageNumber: 'asc' } },
            history: { orderBy: { createdAt: 'asc' } },
            remarks: {
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: { fullName: true, employeeId: true } },
              },
            },
            attachments: { orderBy: { createdAt: 'desc' } },
          },
        },
        assignedTo: { select: { id: true, fullName: true, employeeId: true } },
      },
    });

    if (!item) throw new NotFoundException('Item not found');

    const procurement = item.procurement;
    const currentStage = procurement.stages.find(
      (s) => s.stageNumber === procurement.currentStage,
    );
    const pendingTimestamp = currentStage?.startedAt || procurement.createdAt;
    const pendingStage = currentStage?.stageName || 'Unknown';

    return {
      pendingTimestamp: this.formatDateTime(pendingTimestamp),
      pendingStage,
      doerName: procurement.requestedBy.fullName,
      indentRaisedTimestamp: this.formatDateTime(procurement.createdAt),
      indentNo: procurement.referenceNo,
      priority: procurement.priority,
      itemWiseIndentNo: item.bbuCode || item.itemCode,
      filledBy: procurement.requestedBy.fullName,
      projectName: procurement.projectName,
      itemAttachment: item.attachmentUrl,
      itemType: procurement.itemType,
      itemRemarks: item.description,
      skuCode: item.itemCode,
      itemDescription: item.itemName,
      quantity: Number(item.quantity),
      uom: item.unit,
      technicalSpecification: item.technicalSpec,
      approvedMakes: item.approvedMakes,
      requiredDate: procurement.requiredDate
        ? this.formatDateTime(procurement.requiredDate)
        : null,
      paintingSpec: procurement.paintingSpec,
      packingRequirement: procurement.packingRequirement,
      certification: procurement.certification,
      manuals: procurement.manuals,
      warranty: procurement.warrantyGuarantee,
      gaDrawing: procurement.ga,
      poNumber: item.poNumber,
      poStatus: item.poStatus,
      poRemarks: item.poRemarks,
      poCreatedAt: item.poCreatedAt
        ? this.formatDateTime(item.poCreatedAt)
        : null,
      poApprovedL1At: item.poApprovedL1At
        ? this.formatDateTime(item.poApprovedL1At)
        : null,
      poApprovedL2At: item.poApprovedL2At
        ? this.formatDateTime(item.poApprovedL2At)
        : null,
      poRejectedAt: item.poRejectedAt
        ? this.formatDateTime(item.poRejectedAt)
        : null,
      poRejectedBy: item.poRejectedBy,
      poRejectionReason: item.poRejectionReason,
      vendorAcceptanceStatus: item.vendorAcceptanceStatus,
      vendorAcceptedAt: item.vendorAcceptedAt
        ? this.formatDateTime(item.vendorAcceptedAt)
        : null,
      vendorRejectedAt: item.vendorRejectedAt
        ? this.formatDateTime(item.vendorRejectedAt)
        : null,
      vendorRejectionReason: item.vendorRejectionReason,
      vendorAgreedDate: item.vendorAgreedDate
        ? this.formatDateTime(item.vendorAgreedDate)
        : null,
      vendorFollowupStatus: item.vendorFollowupStatus,
      vendorFollowupCompletedAt: item.vendorFollowupCompletedAt
        ? this.formatDateTime(item.vendorFollowupCompletedAt)
        : null,
      vendorFollowupDelayedAt: item.vendorFollowupDelayedAt
        ? this.formatDateTime(item.vendorFollowupDelayedAt)
        : null,
      crmRemarks: item.crmRemarks,
      inspectionLevel1Status: item.inspectionLevel1Status,
      inspectionLevel1At: item.inspectionLevel1At
        ? this.formatDateTime(item.inspectionLevel1At)
        : null,
      inspectionLevel1Remarks: item.inspectionLevel1Remarks,
      inspectionLevel2Status: item.inspectionLevel2Status,
      inspectionLevel2At: item.inspectionLevel2At
        ? this.formatDateTime(item.inspectionLevel2At)
        : null,
      inspectionLevel2Remarks: item.inspectionLevel2Remarks,
      inspectionLevel3Status: item.inspectionLevel3Status,
      inspectionLevel3At: item.inspectionLevel3At
        ? this.formatDateTime(item.inspectionLevel3At)
        : null,
      inspectionLevel3Remarks: item.inspectionLevel3Remarks,
      currentInspectionLevel: item.currentInspectionLevel,
      inspectionAttempts: item.inspectionAttempts,
      finalInspectionResult: item.finalInspectionResult,
      debitNoteGenerated: item.debitNoteGenerated,
      stages: procurement.stages,
      history: procurement.history,
      remarks: procurement.remarks,
      attachments: procurement.attachments,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // KPI CARDS
  // ═════════════════════════════════════════════════════════════════════════

  async getPoCreationKpis() {
    const [totalPending, withPoNumber, avgProcessingTime] = await Promise.all([
      this.prisma.procurementItem.count({
        where: { procurement: { currentStage: 5 }, poNumber: { not: null } },
      }),
      this.prisma.procurementItem.count({
        where: { procurement: { currentStage: 5 }, poNumber: { not: null } },
      }),
      this.calculateAverageProcessingTime(5),
    ]);
    return {
      totalPending,
      poNumbersAssigned: withPoNumber,
      averageProcessingTime: avgProcessingTime,
    };
  }

  async getPoApprovalL1Kpis() {
    const [totalPending, totalApproved, totalRejected] = await Promise.all([
      this.prisma.procurementItem.count({
        where: { procurement: { currentStage: 6 }, poStatus: 'PENDING' },
      }),
      this.prisma.procurementItem.count({
        where: { procurement: { currentStage: 6 }, poStatus: 'APPROVED_L1' },
      }),
      this.prisma.procurementItem.count({
        where: {
          procurement: { currentStage: 6 },
          poStatus: { startsWith: 'REJECTED' },
        },
      }),
    ]);
    const approvalRate =
      totalApproved + totalRejected > 0
        ? ((totalApproved / (totalApproved + totalRejected)) * 100).toFixed(1)
        : 0;
    const rejectionRate =
      totalApproved + totalRejected > 0
        ? ((totalRejected / (totalApproved + totalRejected)) * 100).toFixed(1)
        : 0;
    return {
      totalPending,
      totalApproved,
      totalRejected,
      approvalRate: `${approvalRate}%`,
      rejectionRate: `${rejectionRate}%`,
      averageApprovalTime: await this.calculateAverageProcessingTime(6),
    };
  }

  async getPoApprovalL2Kpis() {
    const [totalPending, totalApproved, totalRejected] = await Promise.all([
      this.prisma.procurementItem.count({
        where: { procurement: { currentStage: 7 }, poStatus: 'APPROVED_L1' },
      }),
      this.prisma.procurementItem.count({
        where: { procurement: { currentStage: 7 }, poStatus: 'APPROVED_L2' },
      }),
      this.prisma.procurementItem.count({
        where: {
          procurement: { currentStage: 7 },
          poStatus: { startsWith: 'REJECTED' },
        },
      }),
    ]);
    const approvalRate =
      totalApproved + totalRejected > 0
        ? ((totalApproved / (totalApproved + totalRejected)) * 100).toFixed(1)
        : 0;
    return {
      totalPending,
      totalApproved,
      totalRejected,
      finalApprovalRate: `${approvalRate}%`,
      averageFinalApprovalTime: await this.calculateAverageProcessingTime(7),
    };
  }

  async getVendorAcceptanceKpis() {
    const [totalPending, totalAccepted, totalRejected] = await Promise.all([
      this.prisma.procurementItem.count({
        where: {
          procurement: { currentStage: 8 },
          vendorAcceptanceStatus: 'PENDING',
        },
      }),
      this.prisma.procurementItem.count({
        where: {
          procurement: { currentStage: 8 },
          vendorAcceptanceStatus: 'ACCEPTED',
        },
      }),
      this.prisma.procurementItem.count({
        where: {
          procurement: { currentStage: 8 },
          vendorAcceptanceStatus: 'REJECTED',
        },
      }),
    ]);
    const acceptanceRate =
      totalAccepted + totalRejected > 0
        ? ((totalAccepted / (totalAccepted + totalRejected)) * 100).toFixed(1)
        : 0;
    const rejectionRate =
      totalAccepted + totalRejected > 0
        ? ((totalRejected / (totalAccepted + totalRejected)) * 100).toFixed(1)
        : 0;
    return {
      totalPending,
      totalAccepted,
      totalRejected,
      acceptanceRate: `${acceptanceRate}%`,
      rejectionRate: `${rejectionRate}%`,
      averageAcceptanceTime: await this.calculateAverageProcessingTime(8),
    };
  }

  async getVendorFollowupKpis() {
    const [totalPending, totalCompleted, totalDelayed, totalRejected] =
      await Promise.all([
        this.prisma.procurementItem.count({
          where: {
            procurement: { currentStage: 9 },
            vendorFollowupStatus: 'PENDING',
          },
        }),
        this.prisma.procurementItem.count({
          where: {
            procurement: { currentStage: 9 },
            vendorFollowupStatus: 'COMPLETED',
          },
        }),
        this.prisma.procurementItem.count({
          where: {
            procurement: { currentStage: 9 },
            vendorFollowupStatus: 'DELAYED',
          },
        }),
        this.prisma.procurementItem.count({
          where: {
            procurement: { currentStage: 9 },
            vendorFollowupStatus: 'REJECTED',
          },
        }),
      ]);
    const onTimeDeliveryPct =
      totalCompleted + totalDelayed > 0
        ? ((totalCompleted / (totalCompleted + totalDelayed)) * 100).toFixed(1)
        : 0;
    return {
      totalPending,
      totalCompleted,
      totalDelayed,
      totalRejected,
      onTimeDeliveryPercentage: `${onTimeDeliveryPct}%`,
      averageFollowupTime: await this.calculateAverageProcessingTime(9),
    };
  }

  async getInspectionKpis(level: number) {
    const stageNumber = level + 11;
    const statusField = `inspectionLevel${level}Status`;
    const [totalPending, totalApproved, totalRejected] = await Promise.all([
      this.prisma.procurementItem.count({
        where: {
          procurement: { currentStage: stageNumber },
          [statusField]: 'PENDING',
        },
      }),
      this.prisma.procurementItem.count({
        where: {
          procurement: { currentStage: stageNumber },
          [statusField]: 'APPROVED',
        },
      }),
      this.prisma.procurementItem.count({
        where: {
          procurement: { currentStage: stageNumber },
          [statusField]: 'REJECTED',
        },
      }),
    ]);
    const passRate =
      totalApproved + totalRejected > 0
        ? ((totalApproved / (totalApproved + totalRejected)) * 100).toFixed(1)
        : 0;
    const rejectionRate =
      totalApproved + totalRejected > 0
        ? ((totalRejected / (totalApproved + totalRejected)) * 100).toFixed(1)
        : 0;
    return {
      totalPending,
      totalApproved,
      totalRejected,
      passRate: `${passRate}%`,
      rejectionRate: `${rejectionRate}%`,
      averageInspectionTime:
        await this.calculateAverageProcessingTime(stageNumber),
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SEARCH & FILTERS
  // ═════════════════════════════════════════════════════════════════════════

  async searchPoItems(
    query: string,
    filters: {
      status?: string;
      projectId?: string;
      poNumber?: string;
      priority?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: any = {
      procurement: { status: { not: 'CANCELLED' } },
      OR: [
        { poNumber: { contains: query } },
        { itemName: { contains: query } },
        { bbuCode: { contains: query } },
        { itemCode: { contains: query } },
        { procurement: { referenceNo: { contains: query } } },
        { procurement: { projectName: { contains: query } } },
        { procurement: { requestedBy: { fullName: { contains: query } } } },
      ],
    };
    if (filters.status) where.poStatus = filters.status;
    if (filters.projectId)
      where.procurement = {
        ...where.procurement,
        projectId: filters.projectId,
      };
    if (filters.poNumber) where.poNumber = { contains: filters.poNumber };
    if (filters.priority)
      where.procurement = { ...where.procurement, priority: filters.priority };
    if (filters.dateFrom || filters.dateTo) {
      where.poCreatedAt = {};
      if (filters.dateFrom) where.poCreatedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.poCreatedAt.lte = new Date(filters.dateTo);
    }
    return this.prisma.procurementItem.findMany({
      where,
      include: {
        procurement: {
          include: {
            requestedBy: { select: { fullName: true, employeeId: true } },
          },
        },
      },
      orderBy: { poCreatedAt: 'desc' },
      take: 50,
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // EMAIL HELPERS
  // ═════════════════════════════════════════════════════════════════════════

  private async sendRejectionEmail(
    item: any,
    stage: string,
    reason: string,
    rejectedBy: string,
  ) {
    const subject = `[IFH One] PO Rejected – ${item.poNumber} – ${stage}`;
    const text = `PO Rejected\n\nPO Number: ${item.poNumber}\nItem: ${item.itemName}\nStage: ${stage}\nRejected By: ${rejectedBy}\nReason: ${reason}\n\nPlease review and take necessary action.`;
    const html = `<html><body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px;"><table style="max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><tr><td style="background: #dc2626; color: #fff; padding: 20px; text-align: center;"><h2>PO Rejected</h2></td></tr><tr><td style="padding: 24px;"><p><strong>PO Number:</strong> ${item.poNumber}</p><p><strong>Item:</strong> ${item.itemName}</p><p><strong>Stage:</strong> ${stage}</p><p><strong>Rejected By:</strong> ${rejectedBy}</p><p><strong>Reason:</strong> ${reason}</p><p>Please review and take necessary action.</p></td></tr></table></body></html>`;
    try {
      await this.emailService.send({ to: EMAIL_OVERRIDE, subject, text, html });
      await this.prisma.rejectionEmail.updateMany({
        where: {
          procurementId: item.procurementId,
          stageNumber: stage.includes('Level 1')
            ? 6
            : stage.includes('Level 2')
              ? 7
              : stage.includes('Vendor Acceptance')
                ? 8
                : stage.includes('Vendor Follow-up')
                  ? 9
                  : 14,
        },
        data: { emailSent: true, emailSentAt: new Date() },
      });
    } catch (error: any) {
      this.logger.error(`Failed to send rejection email: ${error.message}`);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═════════════════════════════════════════════════════════════════════════

  private formatDateTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  private async calculateAverageProcessingTime(
    stageNumber: number,
  ): Promise<string> {
    const stages = await this.prisma.procurementStage.findMany({
      where: {
        stageNumber,
        status: 'COMPLETED',
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: { startedAt: true, completedAt: true },
      take: 100,
    });
    if (stages.length === 0) return 'N/A';
    const totalMs = stages.reduce((sum, s) => {
      const start = new Date(s.startedAt!).getTime();
      const end = new Date(s.completedAt!).getTime();
      return sum + (end - start);
    }, 0);
    const avgMs = totalMs / stages.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}
