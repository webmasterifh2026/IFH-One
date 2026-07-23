import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ProcurementService } from '../procurement/procurement.service';
import { SubmitInspectionDto } from './dto/inspections.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly procurementService: ProcurementService,
    private readonly notifications: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async processInspection(
    procurementId: string,
    level: 1 | 2 | 3,
    dto: SubmitInspectionDto,
    userId: string,
  ) {
    const procurement = await this.prisma.procurement.findUnique({
      where: { id: procurementId },
      include: { items: true },
    });

    if (!procurement) throw new NotFoundException('Procurement not found');

    // Ensure Procurement is currently in the correct stage
    const expectedStage = 11 + level;
    if (procurement.currentStage !== expectedStage) {
      throw new BadRequestException(
        `Inspection Level ${level} cannot be processed because procurement is currently at Stage ${procurement.currentStage}.`,
      );
    }

    const byId = new Map(procurement.items.map((i) => [i.id, i]));
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const reqItem of dto.items) {
        const dbItem = byId.get(reqItem.procurementItemId);
        if (!dbItem) {
          throw new BadRequestException(
            `Item ${reqItem.procurementItemId} does not belong to this PO.`,
          );
        }
        if (reqItem.status === 'REJECTED' && !reqItem.remarks) {
          throw new BadRequestException(
            `Remarks are mandatory when rejecting item ${dbItem.itemCode}.`,
          );
        }

        const updateData: any = {};

        if (level === 1) {
          updateData.inspectionLevel1Status = reqItem.status;
          updateData.inspectionLevel1At = now;
          updateData.inspectionLevel1ById = userId;
          updateData.inspectionLevel1Remarks = reqItem.remarks;
        } else if (level === 2) {
          updateData.inspectionLevel2Status = reqItem.status;
          updateData.inspectionLevel2At = now;
          updateData.inspectionLevel2ById = userId;
          updateData.inspectionLevel2Remarks = reqItem.remarks;
        } else if (level === 3) {
          updateData.inspectionLevel3Status = reqItem.status;
          updateData.inspectionLevel3At = now;
          updateData.inspectionLevel3ById = userId;
          updateData.inspectionLevel3Remarks = reqItem.remarks;
        }

        if (reqItem.status === 'APPROVED') {
          updateData.finalInspectionResult = 'APPROVED';
          updateData.currentInspectionLevel = 0;
        } else if (reqItem.status === 'REJECTED') {
          if (level === 1) {
            updateData.currentInspectionLevel = 2; // move to L2
          } else if (level === 2) {
            updateData.currentInspectionLevel = 3; // move to L3
          } else if (level === 3) {
            updateData.finalInspectionResult = 'REJECTED';
            updateData.currentInspectionLevel = 0;
            updateData.debitNoteGenerated = true;
          }
        }

        await tx.procurementItem.update({
          where: { id: reqItem.procurementItemId },
          data: updateData,
        });
      }
    });

    // Check overall PO status to see if it should advance
    const updatedProcurement = await this.prisma.procurement.findUnique({
      where: { id: procurementId },
      include: { items: true },
    });

    const activeItems = updatedProcurement!.items.filter(
      (item) => Number(item.quantity) > 0, // only consider active items
    );

    // Find any items that still need inspection at this level or lower
    const itemsPendingInspection = activeItems.some(
      (item) =>
        item.currentInspectionLevel !== null &&
        item.currentInspectionLevel > 0 &&
        item.currentInspectionLevel <= expectedStage - 11,
    );

    if (!itemsPendingInspection) {
      // Advance to next stage based on items
      const requiresDebitNote = activeItems.some(
        (item) => item.debitNoteGenerated,
      );
      const allApproved = activeItems.every(
        (item) => item.finalInspectionResult === 'APPROVED',
      );
      const hasAnyL2 = activeItems.some(
        (item) => item.currentInspectionLevel === 2,
      );
      const hasAnyL3 = activeItems.some(
        (item) => item.currentInspectionLevel === 3,
      );

      let action = '';
      if (level === 1) {
        action = hasAnyL2 ? 'FAIL' : 'PASS';
      } else if (level === 2) {
        action = hasAnyL3 ? 'FAIL' : 'PASS';
      } else if (level === 3) {
        action = requiresDebitNote ? 'FAIL' : 'PASS';
      }

      const rejectedRemarks = dto.items
        .filter((i) => i.status === 'REJECTED')
        .map((i) => i.remarks || 'Rejected')
        .join('; ');
      const remarks = rejectedRemarks
        ? `Inspection Level ${level} completed. Remarks: ${rejectedRemarks}`
        : `Inspection Level ${level} completed. All items passed.`;

      await this.procurementService.stageAction(
        procurementId,
        { action, remarks },
        userId,
      );
    }

    return { message: 'Inspection results saved successfully' };
  }
}
