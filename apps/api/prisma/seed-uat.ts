import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProcurementService } from '../src/procurement/procurement.service';
import { GateEntryService } from '../src/gate-entry/gate-entry.service';
import { InspectionsService } from '../src/inspections/inspections.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { Logger } from '@nestjs/common';

const log = new Logger('UAT-Seed');

async function getUserId(prisma: PrismaService): Promise<string> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error('No user found in DB to act as doer.');
  return user.id;
}

async function getProjectId(
  prisma: PrismaService,
): Promise<{ id: string; name: string }> {
  const proc = await prisma.procurement.findFirst({
    where: { projectId: { not: null } },
    select: { projectId: true, projectName: true },
  });
  if (proc?.projectId) {
    return { id: proc.projectId, name: proc.projectName ?? proc.projectId };
  }
  return { id: 'IFH-UAT-2026', name: 'IFH UAT Test Project' };
}

async function getVendor(
  prisma: PrismaService,
  idx: number,
): Promise<{ vendorId?: string; vendorName: string }> {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { status: 'ACTIVE' },
      skip: idx,
      orderBy: { vendorName: 'asc' },
    });
    if (vendor) return { vendorId: vendor.id, vendorName: vendor.vendorName };
  } catch {
    /* fall through */
  }
  return {
    vendorName: [
      'Tata Steel Supplies Pvt Ltd',
      'Siemens India Limited',
      'Havells Industrial Division',
      'Endress+Hauser India Pvt Ltd',
      'Honeywell Safety Products India',
    ][idx % 5],
  };
}

async function bootstrap() {
  log.log('Bootstrapping NestJS Application for UAT Seed...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const prisma = app.get(PrismaService);
  const procurementSvc = app.get(ProcurementService);
  const gateEntrySvc = app.get(GateEntryService);
  const inspectionSvc = app.get(InspectionsService);

  const userId = await getUserId(prisma);
  const project = await getProjectId(prisma);

  log.log('Using User ID: ' + userId + ', Project: ' + project.name);

  const scenarios = [
    { title: 'TC01: Scen 1 - Pass L1', type: 'S1', flow: ['PASS1'] },
    { title: 'TC02: Scen 1 - Pass L1', type: 'S1', flow: ['PASS1'] },
    { title: 'TC03: Scen 1 - Pass L1', type: 'S1', flow: ['PASS1'] },
    {
      title: 'TC04: Scen 2 - Fail L1, Pass L2',
      type: 'S2',
      flow: ['FAIL1', 'PASS2'],
    },
    {
      title: 'TC05: Scen 2 - Fail L1, Pass L2',
      type: 'S2',
      flow: ['FAIL1', 'PASS2'],
    },
    {
      title: 'TC06: Scen 3 - Fail L1, Fail L2, Pass L3',
      type: 'S3',
      flow: ['FAIL1', 'FAIL2', 'PASS3'],
    },
    {
      title: 'TC07: Scen 3 - Fail L1, Fail L2, Pass L3',
      type: 'S3',
      flow: ['FAIL1', 'FAIL2', 'PASS3'],
    },
    {
      title: 'TC08: Scen 4 - Fail L1, Fail L2, Fail L3 (Debit Note)',
      type: 'S4',
      flow: ['FAIL1', 'FAIL2', 'FAIL3'],
    },
    {
      title: 'TC09: Scen 4 - Fail L1, Fail L2, Fail L3 (Debit Note)',
      type: 'S4',
      flow: ['FAIL1', 'FAIL2', 'FAIL3'],
    },
    {
      title: 'TC10: Scen 5 - Partial Receipts then Pass L1',
      type: 'S5',
      flow: ['PARTIAL_GATE', 'FULL_GATE', 'PASS1'],
    },
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    log.log('\n======================================================');
    log.log('🚀 Starting ' + sc.title);

    // S0 & S1: Indent Creation & Submit
    const draft = await procurementSvc.create(
      {
        title: sc.title,
        description: 'UAT End-to-End Test Record',
        projectId: project.id,
        projectName: project.name,
        application: 'Industrial Application',
        itemType: 'Consumables',
        priority: 'HIGH',
        requiredDate: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        items: [
          {
            itemName: 'Steel Pipes 20mm',
            quantity: 100,
            unit: 'NOS',
            technicalSpec: 'Grade 304',
            approvedMakes: 'Tata',
          },
        ],
        submit: true,
      },
      userId,
    );

    log.log('Draft created & submitted to S1: ' + draft.id);

    // S1: Indent Verification
    await procurementSvc.stageAction(
      draft.id,
      { action: 'APPROVE', remarks: 'Indent verified. Go ahead.' },
      userId,
    );
    log.log('Approved S1 -> S2 (Store Check)');

    // S2: Store Check
    const draftWithItems = await prisma.procurement.findUnique({
      where: { id: draft.id },
      include: { items: true },
    });
    if (!draftWithItems) throw new Error('Cannot find draft with items');

    await procurementSvc.stageAction(
      draft.id,
      {
        action: 'NOT_AVAILABLE',
        remarks: 'No stock available. Procure new.',
        metadata: {
          itemChecks: [{ itemId: draftWithItems.items[0].id, shortQty: 100 }],
        },
      },
      userId,
    );
    log.log('Store Check S2 NOT_AVAILABLE -> S3 (RFQ)');

    // S3: RFQ Float
    await procurementSvc.stageAction(
      draft.id,
      { action: 'APPROVE', remarks: 'Floated to 3 vendors.' },
      userId,
    );
    log.log('Floated RFQ S3 -> S4 (TCE)');

    // S4: TCE
    const vendor = await getVendor(prisma, i);
    await procurementSvc.stageAction(
      draft.id,
      {
        action: 'APPROVE',
        remarks: 'TCE completed. Selected best vendor.',
        vendorId: vendor.vendorId,
        vendorName: vendor.vendorName,
      },
      userId,
    );
    log.log('TCE S4 -> S5 (Negotiation)');

    // S5: Negotiation
    await procurementSvc.stageAction(
      draft.id,
      { action: 'APPROVE', remarks: 'Prices negotiated.' },
      userId,
    );
    log.log('Negotiation S5 -> S6 (PO Creation)');

    // S6: PO Creation
    await procurementSvc.stageAction(
      draft.id,
      { action: 'SUBMIT', remarks: 'PO Drafted.' },
      userId,
    );
    log.log('PO Creation S6 -> S7 (PO Approval L1)');

    // S7: PO Approval L1
    await procurementSvc.stageAction(
      draft.id,
      { action: 'APPROVE', remarks: 'Approved L1.' },
      userId,
    );
    log.log('PO Approval L1 S7 -> S8 (PO Approval L2)');

    // S8: PO Approval L2
    await procurementSvc.stageAction(
      draft.id,
      { action: 'APPROVE', remarks: 'Approved L2.' },
      userId,
    );
    log.log('PO Approval L2 S8 -> S9 (Vendor Acceptance)');

    // S9: Vendor Acceptance
    await procurementSvc.stageAction(
      draft.id,
      { action: 'APPROVE', remarks: 'Vendor accepted PO.' },
      userId,
    );
    log.log('Vendor Acceptance S9 -> S10 (Vendor Follow-up)');

    // S10: Vendor Follow-up
    await procurementSvc.stageAction(
      draft.id,
      { action: 'SUBMIT', remarks: 'Material dispatched by vendor.' },
      userId,
    );
    log.log('Vendor Follow-up S10 -> S11 (Material Receipt)');

    // S11: Material Receipt (Gate Entry)
    const procWithItems = await prisma.procurement.findUnique({
      where: { id: draft.id },
      include: { items: true },
    });
    if (!procWithItems) throw new Error('Cannot find proc items');

    if (sc.type === 'S5') {
      const entry1 = await gateEntrySvc.createGateEntry(
        {
          procurementId: draft.id,
          vehicleNumber: 'HR-38-PARTIAL',
          items: [
            { procurementItemId: procWithItems.items[0].id, declaredQty: 40 },
          ],
          invoicePhotoUrls: [
            {
              fileName: 'invoice.pdf',
              fileUrl: 'https://example.com/invoice.pdf',
            },
          ],
          materialPhotoUrls: [
            {
              fileName: 'material.jpg',
              fileUrl: 'https://example.com/material.jpg',
            },
          ],
        },
        userId,
      );
      let f1 = await prisma.gateEntry.findUnique({
        where: { id: entry1.id },
        include: { items: true },
      });
      await gateEntrySvc.submitQuantityCheck(
        entry1.id,
        {
          invoiceNumber: 'INV-PARTIAL-' + i,
          invoiceDate: new Date().toISOString(),
          vendorName: vendor.vendorName,
          vendorId: vendor.vendorId,
          items: [{ gateEntryItemId: f1!.items[0].id, receivedQty: 40 }],
        },
        userId,
      );
      log.log('Partial Gate Entry done (40/100)');

      const entry2 = await gateEntrySvc.createGateEntry(
        {
          procurementId: draft.id,
          vehicleNumber: 'HR-38-FINAL',
          items: [
            { procurementItemId: procWithItems.items[0].id, declaredQty: 60 },
          ],
          invoicePhotoUrls: [
            {
              fileName: 'invoice.pdf',
              fileUrl: 'https://example.com/invoice.pdf',
            },
          ],
          materialPhotoUrls: [
            {
              fileName: 'material.jpg',
              fileUrl: 'https://example.com/material.jpg',
            },
          ],
        },
        userId,
      );
      let f2 = await prisma.gateEntry.findUnique({
        where: { id: entry2.id },
        include: { items: true },
      });
      await gateEntrySvc.submitQuantityCheck(
        entry2.id,
        {
          invoiceNumber: 'INV-FINAL-' + i,
          invoiceDate: new Date().toISOString(),
          vendorName: vendor.vendorName,
          vendorId: vendor.vendorId,
          items: [{ gateEntryItemId: f2!.items[0].id, receivedQty: 60 }],
        },
        userId,
      );
      log.log('Final Gate Entry done (60/100). S11 -> S12');
    } else {
      const entry = await gateEntrySvc.createGateEntry(
        {
          procurementId: draft.id,
          vehicleNumber: 'MH-12-TEST',
          items: [
            { procurementItemId: procWithItems.items[0].id, declaredQty: 100 },
          ],
          invoicePhotoUrls: [
            {
              fileName: 'invoice.pdf',
              fileUrl: 'https://example.com/invoice.pdf',
            },
          ],
          materialPhotoUrls: [
            {
              fileName: 'material.jpg',
              fileUrl: 'https://example.com/material.jpg',
            },
          ],
        },
        userId,
      );
      let f = await prisma.gateEntry.findUnique({
        where: { id: entry.id },
        include: { items: true },
      });
      await gateEntrySvc.submitQuantityCheck(
        entry.id,
        {
          invoiceNumber: 'INV-' + i + '-123',
          invoiceDate: new Date().toISOString(),
          vendorName: vendor.vendorName,
          vendorId: vendor.vendorId,
          items: [{ gateEntryItemId: f!.items[0].id, receivedQty: 100 }],
        },
        userId,
      );
      log.log('Gate Entry done (100/100). S11 -> S12');
    }

    // Inspections
    for (const step of sc.flow) {
      if (step === 'PARTIAL_GATE' || step === 'FULL_GATE') continue;

      const level = step.includes('1') ? 1 : step.includes('2') ? 2 : 3;
      const status = step.includes('PASS') ? 'APPROVED' : 'REJECTED';

      await inspectionSvc.processInspection(
        draft.id,
        level,
        {
          items: [
            {
              procurementItemId: procWithItems.items[0].id,
              status: status as any,
              remarks:
                status === 'REJECTED'
                  ? 'Failed L' + level + ' quality criteria.'
                  : 'Passed L' + level + ' checks.',
            },
          ],
        },
        userId,
      );

      log.log('Inspection L' + level + ' executed with result: ' + status);
    }

    const finalProc = await prisma.procurement.findUnique({
      where: { id: draft.id },
    });
    log.log(
      '✅ Finished ' +
        sc.title +
        '. Final Stage: ' +
        finalProc?.currentStage +
        ' (' +
        finalProc?.status +
        ')',
    );
  }

  log.log('Seeding Complete.');
  await app.close();
}

bootstrap().catch((err) => {
  log.error('Seed failed', err);
  process.exit(1);
});
