import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding procurement data...');
  const adminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
  let admin = await prisma.user.findFirst({ where: { userRoles: { some: { roleId: adminRole?.id } } } });
  if (!admin) admin = await prisma.user.findFirst();
  
  if (!admin) {
    console.log('No user found to assign as creator.');
    return;
  }

  // Get departments
  const depts = await prisma.department.findMany();
  // Get vendors
  const vendors = await prisma.vendor.findMany();

  // Procurement types
  const appTypes = ['Capex', 'Opex', 'Raw Material', 'Consumables', 'Services'];

  const stagesDef = [
    'Indent Creation', 'Indent Verification', 'Store Check', 'RFQ Float',
    'Techno-Comm Eval', 'Negotiation', 'Purchase Orders', 'PO Approval L1',
    'PO Approval L2', 'Vendor Acceptance', 'Vendor Follow-Up', 'Material Receipt',
    'Material Inspection', 'Secondary Inspection', 'Final Inspection', 'Debit Note',
    'Bill to Accounts', 'Bill to Purchase', 'Bill Creation', 'Tally Entry',
    'Bill Approval L1', 'Bill Approval L2', 'Payment Advice'
  ];

  for (let i = 1; i <= 12; i++) {
    const stage = Math.floor(Math.random() * 23) + 1;
    let status = 'IN_PROGRESS';
    if (stage === 23) status = 'COMPLETED';
    if (Math.random() < 0.1) status = 'HOLD';
    if (Math.random() < 0.05) status = 'REJECTED';

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - (30 - i)); // spread over last 30 days

    const referenceNo = `PR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${i}`;

    const p = await prisma.procurement.create({
      data: {
        referenceNo,
        title: `Procurement of Industrial Materials Batch ${i}`,
        description: `This is a simulated procurement request for Batch ${i} required for general operations.`,
        application: appTypes[i % appTypes.length],
        itemType: 'Mechanical',
        priority: i % 3 === 0 ? 'HIGH' : 'NORMAL',
        requestedById: admin.id,
        assignedToId: admin.id,
        currentStage: stage,
        status: status,
        departmentId: depts.length > 0 ? depts[i % depts.length].id : null,
        vendorId: vendors.length > 0 ? vendors[i % vendors.length].id : null,
        vendorName: vendors.length > 0 ? vendors[i % vendors.length].vendorName : null,
        createdAt: createdAt,
        updatedAt: new Date()
      }
    });

    // Create 3 items
    for (let j = 1; j <= 3; j++) {
      await prisma.procurementItem.create({
        data: {
          procurementId: p.id,
          itemCode: `ITM-${j}00${i}`,
          itemName: `Industrial Component ${j} - Type ${i}`,
          quantity: 10 + j * 5
        }
      });
    }

    // Create stages
    for (let s = 1; s <= stage; s++) {
      const stageName = stagesDef[s - 1] || `Stage ${s}`;
      const isCurrent = s === stage;
      await prisma.procurementStage.create({
        data: {
          procurementId: p.id,
          stageNumber: s,
          stageName: stageName,
          status: isCurrent && (status === 'IN_PROGRESS' || status === 'HOLD') ? 'PENDING' : 'APPROVED',
          startedAt: createdAt,
          completedAt: isCurrent ? null : new Date(createdAt.getTime() + 1000 * 60 * 60 * s),
          assignedToId: admin.id
        }
      });

      // Add history
      if (!isCurrent) {
        await prisma.procurementHistory.create({
          data: {
            procurementId: p.id,
            stageNumber: s,
            action: 'APPROVED',
            description: `${stageName} approved by System Admin`,
            performedById: admin.id,
            createdAt: new Date(createdAt.getTime() + 1000 * 60 * 60 * s)
          }
        });
      }
    }
  }

  console.log('Seeded 30 realistic procurement records successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
