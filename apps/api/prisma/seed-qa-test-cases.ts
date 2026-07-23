/**
 * IFH One — QA Test Seed v2.5.5
 *
 * Creates 5 complete end-to-end procurement test cases through the
 * ProcurementService layer (not raw Prisma) so every side effect fires:
 *   ✓ Workflow stage transitions
 *   ✓ SLA record creation + completion
 *   ✓ In-app notifications (broadcast)
 *   ✓ Audit history entries
 *   ✓ Remarks at every stage
 *   ✓ Vendor capture
 *   ✓ Email events emitted
 *   ✓ Rejection + debit note flow
 *   ✓ Store-available short-circuit
 *   ✓ Multi-inspection FAIL cascade
 *   ✓ Full billing chain to Payment/Advice
 *
 * ─── Test Case Distribution ───────────────────────────────────────────────
 *  TC-01  Mechanical Spare Parts        → Full pass → Payment
 *  TC-02  Electrical Components         → Full pass → Payment
 *  TC-03  Industrial Consumables        → Insp-1 FAIL, Insp-2 PASS → Payment
 *  TC-04  Instrumentation Equipment     → Store AVAILABLE → closed immediately
 *  TC-05  Safety Equipment              → All 3 inspections FAIL → Debit Note
 *
 * Run:
 *   npx ts-node --transpile-only prisma/seed-qa-test-cases.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ProcurementService } from '../src/procurement/procurement.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { Logger } from '@nestjs/common';

const log = new Logger('QA-Seed');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function getUserId(prisma: PrismaService, email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`User not found: ${email}`);
  return user.id;
}

async function getProjectId(prisma: PrismaService): Promise<{ id: string; name: string }> {
  // Projects live in a raw pg table `projects_db`, not a Prisma model.
  // Use a raw query via PrismaService.$queryRawUnsafe.
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      'SELECT project_id_, project_name FROM projects_db ORDER BY project_name ASC LIMIT 1',
    ) as Array<{ project_id_: string; project_name: string }>;

    if (rows && rows.length > 0) {
      return { id: rows[0].project_id_, name: rows[0].project_name };
    }
  } catch {
    // projects_db table may not exist in this environment — use fallback
  }

  // Fallback: return a known project code that exists in procurement records
  const proc = await prisma.procurement.findFirst({
    where: { projectId: { not: null } },
    select: { projectId: true, projectName: true },
    orderBy: { createdAt: 'asc' },
  });
  if (proc?.projectId) {
    return { id: proc.projectId, name: proc.projectName ?? proc.projectId };
  }

  // Last resort: use a static QA project code
  return { id: 'IFH-QA-2026', name: 'IFH QA Test Project 2026' };
}

async function getVendor(prisma: PrismaService, idx: number): Promise<{ vendorId?: string; vendorName: string }> {
  try {
    const vendor = await prisma.vendor.findFirst({
      where: { status: 'ACTIVE' },
      skip: idx,
      orderBy: { vendorName: 'asc' },
    });
    if (vendor) return { vendorId: vendor.id, vendorName: vendor.vendorName };
  } catch { /* fall through */ }
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

async function action(
  svc: ProcurementService,
  id: string,
  act: string,
  userId: string,
  opts: {
    remarks?: string;
    vendorId?: string;
    vendorName?: string;
    assignedToId?: string;
    metadata?: Record<string, any>;
  } = {},
) {
  await svc.stageAction(id, {
    action: act,
    remarks: opts.remarks,
    vendorId: opts.vendorId,
    vendorName: opts.vendorName,
    assignedToId: opts.assignedToId,
    metadata: opts.metadata,
  }, userId);
}

async function remark(svc: ProcurementService, id: string, comment: string, userId: string, stageNumber?: number) {
  await svc.addRemark(id, { comment, stageNumber }, userId);
}

// ─── Test Case Definitions ────────────────────────────────────────────────────

interface TCDef {
  id: string;
  name: string;
  application: string;
  itemType: string;
  priority: string;
  description: string;
  paintingSpecRemark: string;
  packingRequirement: string;
  certification: string;
  manuals: string;
  warrantyGuarantee: string;
  ga: string;
  items: Array<{
    itemCode?: string;
    itemName: string;
    description: string;
    unit: string;
    quantity: number;
    estimatedRate: number;
    technicalSpec: string;
    approvedMakes: string;
  }>;
  storeAvailable: boolean;         // TC-04 closes here
  inspectionResults: ('PASS'|'FAIL')[];  // [insp1, insp2?, insp3?]
}

const TEST_CASES: TCDef[] = [
  // ── TC-01: Mechanical Spare Parts ────────────────────────────────────────
  {
    id: 'TC-01',
    name: 'Mechanical Spare Parts — Rotary Equipment',
    application: 'ESP',
    itemType: 'Ready-Made',
    priority: 'HIGH',
    description: 'Procurement of mechanical spare parts for rotary equipment maintenance at ESP unit. Critical spares required for scheduled plant turnaround.',
    paintingSpecRemark: '2 coats Epoxy Primer + 1 coat Enamel finish, DFT ≥ 100 microns, RAL 7001',
    packingRequirement: 'Export-grade wooden crating, moisture-proof inner liner, each item tagged with item code',
    certification: 'TC',
    manuals: 'Yes',
    warrantyGuarantee: '18 Months',
    ga: 'Yes',
    items: [
      {
        itemName: 'Deep Groove Ball Bearing 6205ZZ',
        description: 'Deep groove ball bearing, 6205ZZ, 25×52×15mm, ABEC-5 grade, grease packed, sealed both sides',
        unit: 'pcs', quantity: 24, estimatedRate: 420,
        technicalSpec: 'ID: 25mm, OD: 52mm, Width: 15mm, Dynamic Load: 14.8 kN, Static Load: 7.8 kN, Max RPM: 14000',
        approvedMakes: 'SKF / FAG / NSK / NTN',
      },
      {
        itemName: 'Mechanical Seal 40mm',
        description: 'Mechanical seal for centrifugal pump, 40mm shaft diameter, SiC-SiC-FKM, PN16 rated',
        unit: 'set', quantity: 6, estimatedRate: 3200,
        technicalSpec: 'Shaft: 40mm, Temp: -20°C to +150°C, Pressure: 16 bar, Material: SiC faces, FKM elastomers',
        approvedMakes: 'John Crane / EagleBurgmann / Flowserve',
      },
      {
        itemName: 'V-Belt B-Section B68',
        description: 'Classical V-belt, B-section, B68 profile, oil and heat resistant, matched set',
        unit: 'pcs', quantity: 12, estimatedRate: 280,
        technicalSpec: 'Section: B, Outside Length: 1727mm, Top Width: 17mm, Depth: 11mm, Load Rating: 800W',
        approvedMakes: 'Gates / Optibelt / Fenner / Dunlop',
      },
      {
        itemName: 'Coupling Rubber Element Grid Spring',
        description: 'Flexible coupling rubber element / grid spring for Size-7 jaw coupling',
        unit: 'nos', quantity: 8, estimatedRate: 950,
        technicalSpec: 'Coupling size 7, Shore hardness 70A, Max torque 180Nm, Bore range 28-60mm',
        approvedMakes: 'KTR / Lovejoy / Fenner / Rexnord',
      },
    ],
    storeAvailable: false,
    inspectionResults: ['PASS'],
  },

  // ── TC-02: Electrical Components ─────────────────────────────────────────
  {
    id: 'TC-02',
    name: 'Electrical Components — Control Panel Spares',
    application: 'Bag Filter',
    itemType: 'Market Item',
    priority: 'URGENT',
    description: 'Procurement of electrical control panel spare components for Bag Filter control system. Required immediately due to failure of existing components.',
    paintingSpecRemark: 'Electrostatic powder coating, RAL 7032 pebble grey, thickness ≥ 60 microns, salt spray test 500 hrs',
    packingRequirement: 'Anti-static bubble wrap, individual poly bags, moisture absorber sachets, fragile labels',
    certification: 'TC',
    manuals: 'Yes',
    warrantyGuarantee: '12 Months',
    ga: 'No',
    items: [
      {
        itemName: 'Circuit Breaker MCB 16A 3P',
        description: 'Miniature circuit breaker, 16A, 3-pole, C-curve, 10kA breaking capacity, 230/400V AC',
        unit: 'pcs', quantity: 10, estimatedRate: 780,
        technicalSpec: 'In: 16A, Poles: 3P, Curve: C, Ics: 10kA, Voltage: 230/400V AC 50Hz, Breaking capacity: 10kA',
        approvedMakes: 'ABB / Schneider Electric / Siemens / Legrand',
      },
      {
        itemName: 'Contactor 40A 3P+NO',
        description: 'Electromagnetic contactor, 40A, 3-pole + 1NO auxiliary contact, 230V AC coil',
        unit: 'pcs', quantity: 6, estimatedRate: 1850,
        technicalSpec: 'AC-3 rating: 40A/18.5kW@415V, Coil: 230V AC 50Hz, Aux: 1NO, Mounting: DIN rail',
        approvedMakes: 'Siemens / ABB / Schneider / L&T',
      },
      {
        itemName: 'PLC Module CPU Siemens S7-200',
        description: 'PLC CPU module Siemens S7-200 compatible, 14DI/10DO, 24V DC supply, RS485 comms',
        unit: 'nos', quantity: 2, estimatedRate: 28500,
        technicalSpec: 'CPU: S7-200 compatible, DI: 14×24VDC, DO: 10×24VDC 0.5A, Supply: 24V DC, Comm: RS485 + MPI',
        approvedMakes: 'Siemens OEM / Approved Equivalent',
      },
      {
        itemName: 'Digital Panel Meter 96×96',
        description: 'Digital panel meter, 96×96mm, 4-digit LED, 4-20mA input, loop powered',
        unit: 'pcs', quantity: 4, estimatedRate: 2400,
        technicalSpec: 'Display: 4-digit 7-segment LED, Input: 4-20mA, Supply: Loop powered, Size: 96×96mm panel cutout 92×92mm',
        approvedMakes: 'Yokogawa / M-System / Precision Digital / DEIF',
      },
      {
        itemName: 'Control Cable 2C×1.5sqmm',
        description: 'Multicore control cable, 2 core × 1.5mm², 1100V grade, FRLS sheath',
        unit: 'm', quantity: 500, estimatedRate: 45,
        technicalSpec: '2C×1.5sqmm, Conductor: Annealed copper, Insulation: XLPE, Sheath: FRLS PVC, Voltage: 1100V, Armour: GI wire',
        approvedMakes: 'Polycab / Havells / Finolex / KEI',
      },
    ],
    storeAvailable: false,
    inspectionResults: ['PASS'],
  },

  // ── TC-03: Industrial Consumables ─────────────────────────────────────────
  {
    id: 'TC-03',
    name: 'Industrial Consumables — Welding & Grinding',
    application: 'Process Bag Filter',
    itemType: 'Market Item',
    priority: 'NORMAL',
    description: 'Quarterly procurement of industrial consumables including welding electrodes, grinding discs and safety PPE for plant maintenance activities.',
    paintingSpecRemark: 'Not applicable — consumable items',
    packingRequirement: 'Standard manufacturer packaging, palletised delivery, pallet wrap with moisture protection',
    certification: 'MTC',
    manuals: 'No',
    warrantyGuarantee: '6 Months',
    ga: 'No',
    items: [
      {
        itemName: 'Welding Electrode E6013 3.15mm',
        description: 'Mild steel welding electrode E6013, 3.15mm diameter, rutile coated, 5kg box',
        unit: 'kg', quantity: 200, estimatedRate: 95,
        technicalSpec: 'Grade: E6013, Dia: 3.15mm, Current: AC/DC+, Deposit: 100%, Tensile: 490MPa, Elongation: 22%',
        approvedMakes: 'ESAB / Lincoln Electric / Ador / Honeywell',
      },
      {
        itemName: 'Grinding Disc 230mm×6mm',
        description: 'Grinding disc for angle grinder, 230mm OD, 6mm thickness, 22.23mm bore, Type 27',
        unit: 'pcs', quantity: 150, estimatedRate: 65,
        technicalSpec: 'Size: 230×6×22.23mm, Type: 27, Grade: A 30 R BF, Max RPM: 6600, Bond: Resinoid',
        approvedMakes: 'Norton / 3M / Bosch / Tyrolit',
      },
      {
        itemName: 'Cutting Disc 230mm×2mm',
        description: 'Cutting disc for angle grinder, 230mm OD, 2mm thickness, 22.23mm bore, Type 41',
        unit: 'pcs', quantity: 200, estimatedRate: 42,
        technicalSpec: 'Size: 230×2×22.23mm, Type: 41, Grade: A 36 T BF, Max RPM: 6600, Bond: Resinoid',
        approvedMakes: 'Norton / Flexovit / Klingspor / Pferd',
      },
    ],
    storeAvailable: false,
    inspectionResults: ['FAIL', 'PASS'],  // Insp-1 fails (wrong spec), Insp-2 passes
  },

  // ── TC-04: Instrumentation — Store Available ──────────────────────────────
  {
    id: 'TC-04',
    name: 'Instrumentation Equipment — Pressure Transmitters (Store Available)',
    application: 'ESP',
    itemType: 'Ready-Made',
    priority: 'NORMAL',
    description: 'Procurement request for differential pressure transmitters. Store check confirms sufficient stock available — procurement closed without external sourcing.',
    paintingSpecRemark: 'Not applicable — precision instrument, no site painting',
    packingRequirement: 'OEM packaging retained, calibration certificate attached, transit protection foam inserts',
    certification: 'Data Sheet',
    manuals: 'Yes',
    warrantyGuarantee: '24 Months',
    ga: 'Yes',
    items: [
      {
        itemName: 'Differential Pressure Transmitter 0-500mbar',
        description: 'Smart differential pressure transmitter, 0-500mbar range, HART 4-20mA, SS diaphragm, IP67',
        unit: 'nos', quantity: 4, estimatedRate: 18500,
        technicalSpec: 'Range: 0-500mbar, Output: 4-20mA HART, Supply: 24VDC, Accuracy: ±0.075%, Diaphragm: SS316L, Protection: IP67',
        approvedMakes: 'Endress+Hauser / Yokogawa / Rosemount / ABB',
      },
      {
        itemName: 'Temperature Transmitter PT100 4-20mA',
        description: 'Head-mount temperature transmitter, 2-wire, 4-20mA, PT100 input, -200 to +850°C range',
        unit: 'nos', quantity: 6, estimatedRate: 4200,
        technicalSpec: 'Sensor: PT100, Range: -200 to +850°C, Output: 4-20mA 2-wire, Accuracy: ±0.1°C, Ambient: -40 to +85°C',
        approvedMakes: 'Endress+Hauser / Wika / Jumo / Pyromation',
      },
    ],
    storeAvailable: true,   // ← workflow closes at stage 2
    inspectionResults: [],
  },

  // ── TC-05: Safety Equipment — Triple Inspection Fail ─────────────────────
  {
    id: 'TC-05',
    name: 'Safety Equipment — Fire Fighting (All Inspections Fail → Debit Note)',
    application: 'NA',
    itemType: 'Tailor-Made',
    priority: 'URGENT',
    description: 'Procurement of fire fighting safety equipment — portable extinguishers and breathing apparatus. All three inspection rounds failed due to non-conformances. Debit note raised and procurement closed.',
    paintingSpecRemark: 'Signal red RAL 3001, 3 coat system, min 150 microns DFT, UV resistant topcoat',
    packingRequirement: 'Each unit individually packed, shrink wrapped, barcode label, batch certification attached',
    certification: 'TC',
    manuals: 'Yes',
    warrantyGuarantee: '12 Months',
    ga: 'No',
    items: [
      {
        itemName: 'ABC Dry Powder Fire Extinguisher 9KG',
        description: 'Portable ABC dry powder fire extinguisher, 9kg capacity, ISI marked, wall bracket included',
        unit: 'nos', quantity: 20, estimatedRate: 2800,
        technicalSpec: 'Type: ABC dry powder, Capacity: 9kg, Discharge time: ≥13s, Range: 4-6m, Working pressure: 14.7 bar, IS:2878',
        approvedMakes: 'Ceasefire / Kanex / Safex / Eureka',
      },
      {
        itemName: 'Self Contained Breathing Apparatus SCBA',
        description: 'Open circuit SCBA set with positive pressure, 6.8L composite cylinder, 30-min rated',
        unit: 'set', quantity: 5, estimatedRate: 45000,
        technicalSpec: 'Duration: 30 min, Cylinder: 6.8L 300bar composite, Pressure: positive pressure, NIOSH/EN137 approved',
        approvedMakes: 'MSA Safety / 3M Scott / Honeywell / Drager',
      },
      {
        itemName: 'Full Face Respirator with Cartridge A2P3',
        description: 'Full-face respiratory mask with combined organic vapour + particulate cartridge A2P3',
        unit: 'set', quantity: 15, estimatedRate: 3600,
        technicalSpec: 'Protection: A2P3, Face seal: silicone, Lens: polycarbonate scratch resistant, EN136/EN14387 certified',
        approvedMakes: '3M / Honeywell / Drager / JSP',
      },
    ],
    storeAvailable: false,
    inspectionResults: ['FAIL', 'FAIL', 'FAIL'],  // All 3 fail → debit note
  },
];

// ─── QA Result Tracking ───────────────────────────────────────────────────────

interface QAResult {
  tcId: string;
  name: string;
  referenceNo: string;
  stagesCompleted: string[];
  finalStatus: string;
  pass: boolean;
  bugs: string[];
  notes: string[];
  durationMs: number;
}

const qaResults: QAResult[] = [];

// ─── Core Test Runner ─────────────────────────────────────────────────────────

async function runTestCase(
  tc: TCDef,
  svc: ProcurementService,
  prisma: PrismaService,
  users: Record<string, string>,
  project: { id: string; name: string },
  vendorIdx: number,
): Promise<QAResult> {
  const result: QAResult = {
    tcId: tc.id,
    name: tc.name,
    referenceNo: '',
    stagesCompleted: [],
    finalStatus: '',
    pass: true,
    bugs: [],
    notes: [],
    durationMs: 0,
  };
  const t0 = Date.now();

  try {
    const vendor = await getVendor(prisma, vendorIdx);
    const requesterEmail = 'pramod.kumar@if-himenviro.in'; // Pramod creates all indents (also verifier)

    // ── Stage 0: Indent Creation ────────────────────────────────────────────
    log.log(`[${tc.id}] Creating indent…`);
    const proc = await svc.create({
      title: tc.name,
      description: tc.description,
      projectId: project.id,
      projectName: project.name,
      application: tc.application,
      itemType: tc.itemType,
      priority: tc.priority,
      requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paintingSpecRemark: tc.paintingSpecRemark,
      packingRequirement: tc.packingRequirement,
      certification: tc.certification,
      manuals: tc.manuals,
      warrantyGuarantee: tc.warrantyGuarantee,
      ga: tc.ga,
      items: tc.items.map(i => ({
        itemCode: i.itemCode,
        itemName: i.itemName,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        technicalSpec: i.technicalSpec,
        approvedMakes: i.approvedMakes,
      })),
      submit: true,
    }, users.pramod);

    result.referenceNo = (proc as any).referenceNo;
    result.stagesCompleted.push('S0: Indent Creation');
    log.log(`[${tc.id}] Created: ${result.referenceNo}`);
    await delay(200);

    // Add post-creation remark
    await remark(svc, (proc as any).id, `${tc.id} — Indent created by QA test runner. All ${tc.items.length} line items verified against SKU master.`, users.pramod);

    // ── Stage 1: Indent Verification ───────────────────────────────────────
    log.log(`[${tc.id}] Stage 1: Indent Verification…`);
    await remark(svc, (proc as any).id, `Indent verified. Project: ${project.name}. Application: ${tc.application}. Priority: ${tc.priority}. All ${tc.items.length} items technically sound. Budget within approved limits. Documents complete — Cert: ${tc.certification}, Manuals: ${tc.manuals}, GA: ${tc.ga}.`, users.pramod, 1);
    await action(svc, (proc as any).id, 'APPROVE', users.pramod, {
      remarks: `Verified by Pramod Kumar. All technical specifications reviewed and approved. ${tc.id} — proceeding to store check.`,
      metadata: {
        verifiedBy: 'Pramod Kumar',
        verificationDate: new Date().toISOString(),
        indentValue: tc.items.reduce((s, i) => s + i.quantity * i.estimatedRate, 0),
        itemsVerified: tc.items.length,
      },
    });
    result.stagesCompleted.push('S1: Indent Verification — APPROVED');
    await delay(300);

    // ── Stage 2: Store Availability Check ──────────────────────────────────
    log.log(`[${tc.id}] Stage 2: Store Availability Check…`);
    const storeAction = tc.storeAvailable ? 'AVAILABLE' : 'NOT_AVAILABLE';
    const storeRemark = tc.storeAvailable
      ? `Store check complete. All ${tc.items.length} items found in stock with sufficient quantity. Issuing from store — procurement closed without external purchase.`
      : `Store check complete. Items not available in store or insufficient stock. Proceeding to RFQ float for external procurement. Shortage confirmed for all line items.`;

    await remark(svc, (proc as any).id, storeRemark, users.shiv, 2);
    await action(svc, (proc as any).id, storeAction, users.pankaj, {
      remarks: storeRemark,
      metadata: {
        checkedBy: 'Shiv Dayal Sharma / Pankaj Kumar',
        checkDate: new Date().toISOString(),
        storeStatus: tc.storeAvailable ? 'AVAILABLE' : 'NOT_AVAILABLE',
        warehouseLocation: 'Main Store — Bay 3',
      },
    });
    result.stagesCompleted.push(`S2: Store Check — ${storeAction}`);
    await delay(300);

    if (tc.storeAvailable) {
      result.finalStatus = 'CLOSED_STORE_AVAILABLE';
      result.notes.push('TC-04: Procurement closed at store check — material available in store.');
      result.durationMs = Date.now() - t0;
      return result;
    }

    // ── Stage 3: Float RFQ ─────────────────────────────────────────────────
    log.log(`[${tc.id}] Stage 3: Float RFQ…`);
    const rfqNo = `RFQ-2026-${tc.id.replace('-', '')}-001`;
    await remark(svc, (proc as any).id,
      `RFQ ${rfqNo} floated to approved vendors. Vendors contacted: ${vendor.vendorName} + 2 others. Submission deadline: 5 working days. Technical specifications attached.`,
      users.pramod, 3);
    await action(svc, (proc as any).id, 'APPROVE', users.pramod, {
      remarks: `RFQ floated. RFQ No: ${rfqNo}. Vendors selected from approved vendor list. Deadline set for ${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}.`,
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      metadata: {
        rfqNumber: rfqNo,
        rfqDate: new Date().toISOString(),
        vendorsContacted: [vendor.vendorName, 'Alternative Vendor 1', 'Alternative Vendor 2'],
        submissionDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        rfqType: 'OPEN',
        paymentTerms: 'As Per PO Terms',
        deliveryTerms: 'FOR Destination',
      },
    });
    result.stagesCompleted.push('S3: Float RFQ — APPROVED');
    await delay(300);

    // ── Stage 4: Receive Techno Commercial Offer ────────────────────────────
    log.log(`[${tc.id}] Stage 4: Techno Commercial Offer…`);
    const offerRef = `OFF-${vendor.vendorName.split(' ')[0].toUpperCase()}-2026-001`;
    await remark(svc, (proc as any).id,
      `Offer received from ${vendor.vendorName}. Ref: ${offerRef}. Technical offer reviewed by engineering — conforming to specs. Comparison sheet prepared with 3 vendors.`,
      users.pramod, 4);
    await action(svc, (proc as any).id, 'APPROVE', users.pramod, {
      remarks: `Techno-commercial offer received and evaluated. Offer Ref: ${offerRef}. Best offer: ${vendor.vendorName}. Comparison sheet attached. Engineering clearance obtained.`,
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      metadata: {
        offerReference: offerRef,
        offerDate: new Date().toISOString(),
        comparisonSheetUrl: '/documents/comparison-sheet.xlsx',
        technicalOfferUrl: '/documents/technical-offer.pdf',
        engineeringRemark: 'Technical specs fully compliant. No deviations noted.',
        selectedVendor: vendor.vendorName,
        offeredPrice: tc.items.reduce((s, i) => s + i.quantity * i.estimatedRate * 0.95, 0),
      },
    });
    result.stagesCompleted.push('S4: Techno Commercial Offer — APPROVED');
    await delay(300);

    // ── Stage 5: Negotiation & Decision ────────────────────────────────────
    log.log(`[${tc.id}] Stage 5: Negotiation…`);
    const negotiatedValue = tc.items.reduce((s, i) => s + i.quantity * i.estimatedRate * 0.92, 0);
    await remark(svc, (proc as any).id,
      `Negotiation completed with ${vendor.vendorName}. Final price agreed at ₹${negotiatedValue.toFixed(2)}. Delivery: 3 weeks FOB Mumbai. Payment: 30 days from delivery.`,
      users.pramod, 5);
    await action(svc, (proc as any).id, 'APPROVE', users.pramod, {
      remarks: `Vendor finalized: ${vendor.vendorName}. Negotiated discount: 8%. Final value: ₹${negotiatedValue.toFixed(2)}. Delivery period: 21 days. Payment: 30 days.`,
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      metadata: {
        negotiatedValue,
        discount: '8%',
        finalVendor: vendor.vendorName,
        deliveryPeriod: '21 days',
        paymentTerms: '30 days from delivery',
        commercialRemarks: 'Price negotiated down from quoted price. Satisfactory terms agreed.',
        decisionDate: new Date().toISOString(),
      },
    });
    result.stagesCompleted.push('S5: Negotiation — APPROVED');
    await delay(300);

    // ── Stage 6: PO Creation ────────────────────────────────────────────────
    log.log(`[${tc.id}] Stage 6: PO Creation…`);
    const poNo = `PO-2026-${tc.id.replace('-', '')}-001`;
    await remark(svc, (proc as any).id,
      `Purchase Order ${poNo} created for ${vendor.vendorName}. PO value: ₹${negotiatedValue.toFixed(2)}. Delivery: 21 days to plant. All terms as negotiated.`,
      users.pramod, 6);
    await action(svc, (proc as any).id, 'SUBMIT', users.pramod, {
      remarks: `PO ${poNo} prepared and submitted for approval. Vendor: ${vendor.vendorName}. Total value: ₹${negotiatedValue.toFixed(2)} incl. taxes.`,
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      metadata: {
        poNumber: poNo,
        poDate: new Date().toISOString(),
        vendor: vendor.vendorName,
        poValue: negotiatedValue,
        deliveryTerms: 'FOR Destination — Plant Site',
        paymentTerms: '30 days from receipt of invoice',
        warrantyTerms: tc.warrantyGuarantee,
        poUrl: '/documents/purchase-order.pdf',
        specialConditions: `All items to be supplied with ${tc.certification}. Inspection at destination before acceptance.`,
      },
    });
    result.stagesCompleted.push('S6: PO Creation — SUBMITTED');
    await delay(300);

    // ── Stage 7: PO Approval L1 (Pramod Kumar) ─────────────────────────────
    log.log(`[${tc.id}] Stage 7: PO Approval L1…`);
    await action(svc, (proc as any).id, 'APPROVE', users.pramod, {
      remarks: `PO ${poNo} reviewed and approved at L1. Commercial terms acceptable. Value within sanctioned budget. Vendor track record verified. Proceeding to L2 approval.`,
      metadata: {
        approvedBy: 'Pramod Kumar',
        approvalDate: new Date().toISOString(),
        poValueApproved: negotiatedValue,
        budgetCode: `CAPEX-${new Date().getFullYear()}-${tc.id}`,
      },
    });
    result.stagesCompleted.push('S7: PO Approval L1 — APPROVED');
    await delay(300);

    // ── Stage 8: PO Approval L2 (Ankur Gupta) ──────────────────────────────
    log.log(`[${tc.id}] Stage 8: PO Approval L2…`);
    await action(svc, (proc as any).id, 'APPROVE', users.ankur, {
      remarks: `PO ${poNo} approved at L2. Legal and financial review complete. Terms comply with company policy. Value within financial delegation limit. Releasing to vendor.`,
      metadata: {
        approvedBy: 'Ankur Gupta',
        approvalDate: new Date().toISOString(),
        legalReview: 'Compliant',
        financialReview: 'Within delegation limit',
      },
    });
    result.stagesCompleted.push('S8: PO Approval L2 — APPROVED');
    await delay(300);

    // ── Stage 9: Vendor Acceptance ─────────────────────────────────────────
    log.log(`[${tc.id}] Stage 9: Vendor Acceptance…`);
    const deliveryDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    await action(svc, (proc as any).id, 'APPROVE', users.neetu, {
      remarks: `PO acknowledged by ${vendor.vendorName}. Confirmed delivery date: ${deliveryDate.toLocaleDateString()}. Production slot confirmed. Lead time: 21 working days.`,
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      metadata: {
        acceptanceDate: new Date().toISOString(),
        vendorConfirmation: `PO acceptance letter ref: ${poNo}-ACK`,
        expectedDelivery: deliveryDate.toISOString(),
        vendorContact: 'Supply Chain Manager',
        vendorEmail: 'supply@vendor.com',
      },
    });
    result.stagesCompleted.push('S9: Vendor Acceptance — APPROVED');
    await delay(300);

    // ── Stage 10: Follow-up for Delivery ───────────────────────────────────
    log.log(`[${tc.id}] Stage 10: Follow-up…`);
    await remark(svc, (proc as any).id,
      `Follow-up call made to ${vendor.vendorName} on ${new Date().toLocaleDateString()}. Shipment on schedule. Dispatch expected in 3 days. Lorry receipt to be shared.`,
      users.priyanka, 10);
    await action(svc, (proc as any).id, 'SUBMIT', users.priyanka, {
      remarks: `Delivery follow-up complete. Material dispatched by ${vendor.vendorName}. LR Number: LR-2026-${Math.floor(Math.random() * 9000 + 1000)}. Expected delivery: ${deliveryDate.toLocaleDateString()}.`,
      metadata: {
        followUpDate: new Date().toISOString(),
        vendorResponse: 'Material dispatched',
        lrNumber: `LR-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
        expectedDelivery: deliveryDate.toISOString(),
        transportCompany: 'Gati / DTDC Freight',
        deliveryStatus: 'IN_TRANSIT',
      },
    });
    result.stagesCompleted.push('S10: Follow-up — SUBMITTED');
    await delay(300);

    // ── Stage 11: Material Receipt ─────────────────────────────────────────
    log.log(`[${tc.id}] Stage 11: Material Receipt…`);
    const grnNo = `GRN-2026-${tc.id.replace('-', '')}-001`;
    await remark(svc, (proc as any).id,
      `Material received at plant gate. GRN: ${grnNo}. All ${tc.items.length} line items received. Initial visual inspection — packaging intact. DC and invoice attached.`,
      users.shiv, 11);
    await action(svc, (proc as any).id, 'SUBMIT', users.shivam, {
      remarks: `Material received. GRN ${grnNo} raised. Quantity as per PO. Delivery Challan No: DC-${Math.floor(Math.random() * 9000 + 1000)}. Material moved to inspection bay.`,
      metadata: {
        grnNumber: grnNo,
        receivedDate: new Date().toISOString(),
        receivedBy: 'Shiv Dayal Sharma / Shivam Namdev',
        warehouseLocation: 'Inspection Bay — Block A',
        dcNumber: `DC-${Math.floor(Math.random() * 9000 + 1000)}`,
        invoiceNumber: `INV-${vendor.vendorName.slice(0, 4).toUpperCase()}-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
        totalPackages: tc.items.length + 2,
        grnUrl: '/documents/grn.pdf',
        receivedQuantities: tc.items.map((item, i) => ({
          itemIndex: i + 1,
          itemName: item.itemName,
          orderedQty: item.quantity,
          receivedQty: item.quantity, // Full quantity received
          unit: item.unit,
        })),
      },
    });
    result.stagesCompleted.push('S11: Material Receipt — SUBMITTED');
    await delay(300);

    // ── Stages 12–14: Inspections ─────────────────────────────────────────
    const inspStages = [12, 13, 14];
    for (let i = 0; i < tc.inspectionResults.length; i++) {
      const inspResult = tc.inspectionResults[i];
      const stageNum = inspStages[i];
      const inspLabel = ['Material Inspection 1', 'Material Inspection 2', 'Material Inspection 3'][i];
      log.log(`[${tc.id}] Stage ${stageNum}: ${inspLabel} — ${inspResult}…`);

      const inspAction = inspResult === 'PASS' ? 'PASS' : 'FAIL';
      const inspRemark = inspResult === 'PASS'
        ? `${inspLabel} PASSED. All ${tc.items.length} items inspected. Dimensions, markings, material certs verified. No non-conformances. Clearance for billing.`
        : `${inspLabel} FAILED. Non-conformances identified: ${['Incorrect dimension', 'Surface defect', 'Missing certification'][i % 3]}. ${i < 2 ? 'Re-inspection ordered.' : 'All 3 inspections failed — debit note to be raised.'}`;

      await remark(svc, (proc as any).id, inspRemark, users.saurabh, stageNum);
      await action(svc, (proc as any).id, inspAction, users.saurabh, {
        remarks: inspRemark,
        metadata: {
          inspectionDate: new Date().toISOString(),
          inspector: 'Saurabh / Shivam Namdev',
          inspectionResult: inspResult,
          inspectionRound: i + 1,
          reportUrl: `/documents/inspection-report-${i + 1}.pdf`,
          conformances: inspResult === 'PASS' ? tc.items.map(item => ({
            item: item.itemName,
            dimensions: 'Conforming',
            markings: 'Correct',
            certification: 'Verified',
            result: 'PASS',
          })) : undefined,
          nonConformances: inspResult === 'FAIL' ? [`Round ${i + 1} failure: ${['Incorrect material grade', 'Dimensional deviation >2%', 'Surface corrosion, unacceptable'][i % 3]}`] : undefined,
        },
      });
      result.stagesCompleted.push(`S${stageNum}: ${inspLabel} — ${inspResult}`);
      await delay(300);

      // If PASS, stop inspection chain — billing will follow
      if (inspResult === 'PASS') break;
    }

    // ── Stage 15: Debit Note (only for all-fail case) ──────────────────────
    const allFailed = tc.inspectionResults.length > 0 && tc.inspectionResults.every(r => r === 'FAIL');
    if (allFailed) {
      log.log(`[${tc.id}] Stage 15: Debit Note (all inspections failed)…`);
      const debitNoteNo = `DN-2026-${tc.id.replace('-', '')}-001`;
      await remark(svc, (proc as any).id,
        `Debit note ${debitNoteNo} raised. All 3 inspection rounds failed. Total debit value: ₹${negotiatedValue.toFixed(2)}. Vendor: ${vendor.vendorName}. Reason: Non-conforming material supplied.`,
        users.atul, 15);
      await action(svc, (proc as any).id, 'SUBMIT', users.atul, {
        remarks: `Debit Note ${debitNoteNo} raised and submitted. Non-conforming material. Full order value debited from vendor account. Vendor notified. Material to be returned.`,
        metadata: {
          debitNoteNumber: debitNoteNo,
          debitNoteDate: new Date().toISOString(),
          debitValue: negotiatedValue,
          reason: 'Non-conforming material — all 3 inspection rounds failed',
          vendorNotified: true,
          returnAuthorization: `RA-${debitNoteNo}`,
          debitNoteUrl: '/documents/debit-note.pdf',
        },
      });
      result.stagesCompleted.push(`S15: Debit Note — ${debitNoteNo}`);
      result.finalStatus = 'REJECTED_DEBIT_NOTE';
      result.notes.push(`TC-05: All 3 inspections failed. Debit note ${debitNoteNo} raised. Procurement closed via rejection.`);
      result.durationMs = Date.now() - t0;
      return result;
    }

    // ── Stage 16: Bill to Accounts ─────────────────────────────────────────
    log.log(`[${tc.id}] Stage 16: Bill to Accounts…`);
    const invoiceNo = `INV-${vendor.vendorName.slice(0, 4).toUpperCase()}-2026-${Math.floor(Math.random() * 9000 + 1000)}`;
    await remark(svc, (proc as any).id,
      `Invoice ${invoiceNo} received from ${vendor.vendorName}. Dispatched to Accounts for verification. GRN attached. PO match confirmed.`,
      users.pankaj, 16);
    await action(svc, (proc as any).id, 'SUBMIT', users.anushka, {
      remarks: `Bill ${invoiceNo} dispatched to accounts dept. Three-way match: PO ✓, GRN ✓, Invoice ✓. No discrepancies found.`,
      metadata: {
        invoiceNumber: invoiceNo,
        invoiceDate: new Date().toISOString(),
        invoiceValue: negotiatedValue,
        gstAmount: negotiatedValue * 0.18,
        totalWithGst: negotiatedValue * 1.18,
        poMatchStatus: 'MATCHED',
        grnMatchStatus: 'MATCHED',
        dispatchDate: new Date().toISOString(),
      },
    });
    result.stagesCompleted.push('S16: Bill to Accounts — SUBMITTED');
    await delay(300);

    // ── Stage 17: Bill to Purchase ─────────────────────────────────────────
    log.log(`[${tc.id}] Stage 17: Bill to Purchase…`);
    await action(svc, (proc as any).id, 'APPROVE', users.pankaj, {
      remarks: `Invoice verified by purchase dept. Material specs match PO terms. Quantities as per GRN. Approved for bill creation. Technical compliance confirmed.`,
      metadata: {
        verifiedBy: 'Pankaj Kumar',
        verificationDate: new Date().toISOString(),
        technicalCompliance: 'CONFIRMED',
        quantityMatch: 'CONFIRMED',
        priceMatch: 'CONFIRMED',
        purchaseRemark: 'All terms as per PO. Approved for accounts processing.',
      },
    });
    result.stagesCompleted.push('S17: Bill to Purchase — APPROVED');
    await delay(300);

    // ── Stage 18: Bill Creation + GRN ─────────────────────────────────────
    log.log(`[${tc.id}] Stage 18: Bill Creation + GRN…`);
    const billNo = `BILL-2026-${tc.id.replace('-', '')}-001`;
    await action(svc, (proc as any).id, 'APPROVE', users.atul, {
      remarks: `Bill ${billNo} created in accounts system. GRN checklist completed. All documents attached. Bill amount: ₹${(negotiatedValue * 1.18).toFixed(2)} (incl. 18% GST).`,
      metadata: {
        billNumber: billNo,
        billDate: new Date().toISOString(),
        billAmount: negotiatedValue,
        gstRate: '18%',
        gstAmount: negotiatedValue * 0.18,
        totalAmount: negotiatedValue * 1.18,
        grnChecklist: ['GRN signed', 'DC verified', 'Invoice checked', 'PO matched', 'Quality clearance'],
        invoiceUrl: '/documents/invoice.pdf',
      },
    });
    result.stagesCompleted.push(`S18: Bill Creation — ${billNo}`);
    await delay(300);

    // ── Stage 19: Book Purchase in Tally ──────────────────────────────────
    log.log(`[${tc.id}] Stage 19: Tally Entry…`);
    const voucherNo = `TALVCH-2026-${tc.id.replace('-', '')}-001`;
    await action(svc, (proc as any).id, 'APPROVE', users.atul, {
      remarks: `Purchase booked in Tally ERP. Voucher: ${voucherNo}. Journal entry posted. Accounts payable updated. Tax entries posted. GSTR-2 reconciliation done.`,
      metadata: {
        voucherNumber: voucherNo,
        tallyReference: `TALLY-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
        postingDate: new Date().toISOString(),
        ledgerDebited: 'Purchase Account — Plant & Machinery',
        ledgerCredited: `${vendor.vendorName} Creditors`,
        gstr2Filed: true,
        itcEligible: true,
      },
    });
    result.stagesCompleted.push(`S19: Tally Entry — ${voucherNo}`);
    await delay(300);

    // ── Stage 20: Bill Approval L1 ─────────────────────────────────────────
    log.log(`[${tc.id}] Stage 20: Bill Approval L1…`);
    await action(svc, (proc as any).id, 'APPROVE', users.pramod, {
      remarks: `Bill approved at L1. All documentation complete. Amount ₹${(negotiatedValue * 1.18).toFixed(2)} approved for payment. Tally entry verified. Proceeding to L2.`,
    });
    result.stagesCompleted.push('S20: Bill Approval L1 — APPROVED');
    await delay(300);

    // ── Stage 21: Bill Approval L2 ─────────────────────────────────────────
    log.log(`[${tc.id}] Stage 21: Bill Approval L2…`);
    await action(svc, (proc as any).id, 'APPROVE', users.neetu, {
      remarks: `Bill approved at L2 by Neetu Singh. Final approval granted. Payment released for processing. Vendor advised of payment date.`,
    });
    result.stagesCompleted.push('S21: Bill Approval L2 — APPROVED');
    await delay(300);

    // ── Stage 22: Payment / Advice ─────────────────────────────────────────
    log.log(`[${tc.id}] Stage 22: Payment / Advice…`);
    const utrNo = `UTR${Date.now().toString().slice(-12)}`;
    await action(svc, (proc as any).id, 'APPROVE', users.neha, {
      remarks: `Payment processed. UTR: ${utrNo}. Amount: ₹${(negotiatedValue * 1.18).toFixed(2)}. Mode: RTGS. Vendor account credited. Payment advice shared with vendor. Procurement complete.`,
      metadata: {
        paymentDate: new Date().toISOString(),
        paymentMode: 'RTGS',
        utrNumber: utrNo,
        amountPaid: negotiatedValue * 1.18,
        vendorBankDetails: 'As per vendor master',
        paymentAdviceNumber: `PA-2026-${tc.id.replace('-', '')}-001`,
        paymentAdviceUrl: '/documents/payment-advice.pdf',
        vendorAcknowledged: true,
      },
    });
    result.stagesCompleted.push(`S22: Payment/Advice — UTR: ${utrNo}`);
    result.finalStatus = 'COMPLETED';
    result.notes.push(`Full procurement lifecycle completed. Total value: ₹${(negotiatedValue * 1.18).toFixed(2)}.`);

  } catch (err: any) {
    result.pass = false;
    result.finalStatus = 'ERROR';
    result.bugs.push(`${err.message || String(err)}`);
    log.error(`[${tc.id}] FAILED: ${err.message}`);
  }

  result.durationMs = Date.now() - t0;
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log.log('═══════════════════════════════════════════════════════════════');
  log.log(' IFH One — QA Test Seed v2.5.5');
  log.log(' 5 complete end-to-end procurement test cases');
  log.log('═══════════════════════════════════════════════════════════════\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const svc = app.get(ProcurementService);
  const prisma = app.get(PrismaService);

  // ── Resolve user IDs ────────────────────────────────────────────────────
  const userEmails = {
    pramod:   'pramod.kumar@if-himenviro.in',
    shiv:     'shiv.sharma@if-himenviro.in',
    pankaj:   'pankaj.kumar@if-himenviro.in',
    ankur:    'ankur.gupta@if-himenviro.in',
    neetu:    'neetu.singh@if-himenviro.in',
    priyanka: 'priyanka.pal@if-himenviro.in',
    shivam:   'shivam.namdev@if-himenviro.in',
    anushka:  'anushka.kamboj@if-himenviro.in',
    saurabh:  'saurabh@if-himenviro.in',
    atul:     'atul.tyagi@if-himenviro.in',
    neha:     'neha.mishra@if-himenviro.in',
  };

  log.log('Resolving user IDs…');
  const users: Record<string, string> = {};
  for (const [key, email] of Object.entries(userEmails)) {
    try {
      users[key] = await getUserId(prisma, email);
      log.log(`  ✓ ${key}: ${email}`);
    } catch {
      log.warn(`  ⚠ User not found: ${email} — using fallback`);
      // Create a minimal placeholder user so the seed can continue
      const u = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          fullName: key.charAt(0).toUpperCase() + key.slice(1),
          employeeId: `QA-${key.toUpperCase()}`,
          passwordHash: '$2b$10$placeholder',
          status: 'ACTIVE',
        },
        update: {},
      });
      users[key] = u.id;
    }
  }

  // ── Resolve project ────────────────────────────────────────────────────
  log.log('\nResolving project…');
  const project = await getProjectId(prisma);
  log.log(`  ✓ Project: ${project.id} — ${project.name}`);

  // ── Run all 5 test cases sequentially ─────────────────────────────────
  log.log('\n─────────────────────────────────────────────────────────────────');
  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    log.log(`\n▶  Running ${tc.id}: ${tc.name}`);
    log.log(`   Items: ${tc.items.length} | Store Available: ${tc.storeAvailable} | Inspection path: ${tc.inspectionResults.join('→') || 'N/A'}`);

    const result = await runTestCase(tc, svc, prisma, users, project, i);
    qaResults.push(result);
    log.log(`   ${result.pass ? '✅' : '❌'} ${result.tcId} — ${result.finalStatus} — ${(result.durationMs / 1000).toFixed(1)}s`);
    log.log(`   Ref: ${result.referenceNo}`);
    log.log(`   Stages: ${result.stagesCompleted.length}`);

    await delay(500); // small pause between test cases
  }

  // ── Print QA Summary ───────────────────────────────────────────────────
  log.log('\n\n═══════════════════════════════════════════════════════════════');
  log.log('  QA SUMMARY REPORT — IFH One v2.5.5');
  log.log('═══════════════════════════════════════════════════════════════\n');

  let passCount = 0;
  let failCount = 0;
  const allBugs: string[] = [];

  for (const r of qaResults) {
    const icon = r.pass ? '✅ PASS' : '❌ FAIL';
    log.log(`┌─ ${r.tcId}: ${r.name}`);
    log.log(`│  Reference   : ${r.referenceNo}`);
    log.log(`│  Result      : ${icon}`);
    log.log(`│  Final Status: ${r.finalStatus}`);
    log.log(`│  Duration    : ${(r.durationMs / 1000).toFixed(1)}s`);
    log.log(`│  Stages Done : ${r.stagesCompleted.length}`);
    for (const s of r.stagesCompleted) log.log(`│    · ${s}`);
    if (r.notes.length) log.log(`│  Notes: ${r.notes.join('; ')}`);
    if (r.bugs.length) {
      log.log(`│  ⚠ Bugs:`);
      for (const b of r.bugs) log.log(`│    ! ${b}`);
      allBugs.push(...r.bugs.map(b => `${r.tcId}: ${b}`));
    }
    log.log('└─────────────────────────────────────────────────────────────');
    if (r.pass) passCount++; else failCount++;
  }

  log.log(`\n TOTAL: ${qaResults.length} | PASS: ${passCount} | FAIL: ${failCount}`);

  if (allBugs.length > 0) {
    log.log('\n BUGS FOUND:');
    allBugs.forEach((b, i) => log.log(`  ${i + 1}. ${b}`));
  } else {
    log.log('\n No bugs found — all test cases passed successfully.');
  }

  // ── Validate final DB state ────────────────────────────────────────────
  log.log('\n─── Final DB Validation ──────────────────────────────────────────');
  const [total, completed, rejected, onHold, inProgress] = await Promise.all([
    prisma.procurement.count(),
    prisma.procurement.count({ where: { status: 'COMPLETED' } }),
    prisma.procurement.count({ where: { status: 'REJECTED' } }),
    prisma.procurement.count({ where: { status: 'ON_HOLD' } }),
    prisma.procurement.count({ where: { status: 'IN_PROGRESS' } }),
  ]);
  const notifCount = await prisma.notification.count();
  const historyCount = await prisma.procurementHistory.count();
  const slaCount = await prisma.slaRecord.count();
  const remarkCount = await prisma.procurementRemark.count();

  log.log(`  Procurements Total    : ${total}`);
  log.log(`  Completed             : ${completed}`);
  log.log(`  Rejected (Debit Note) : ${rejected}`);
  log.log(`  On Hold               : ${onHold}`);
  log.log(`  In Progress           : ${inProgress}`);
  log.log(`  Notifications Created : ${notifCount}`);
  log.log(`  History Entries       : ${historyCount}`);
  log.log(`  SLA Records           : ${slaCount}`);
  log.log(`  Remarks               : ${remarkCount}`);
  log.log('\n QA seed completed.\n');

  await app.close();
}

main().catch(err => {
  console.error('QA Seed failed:', err);
  process.exit(1);
});
