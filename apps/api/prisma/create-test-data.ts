/**
 * QA Test Data Generator
 * Creates 3 sample indents for end-to-end testing
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.production
const envPath = path.resolve(__dirname, '../.env.production');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Creating QA test data...\n');

  // Get a test user (requester)
  const requester = await prisma.user.findFirst({
    where: { email: 'admin@ifh.com' },
    select: { id: true, fullName: true },
  });

  if (!requester) {
    console.error(
      '❌ Test user not found. Please ensure admin@ifh.com exists.',
    );
    process.exit(1);
  }

  console.log(`👤 Using requester: ${requester.fullName} (${requester.id})\n`);

  // Get first project
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('❌ No project found. Please create a project first.');
    process.exit(1);
  }

  // Get first department
  const department = await prisma.department.findFirst();
  if (!department) {
    console.error('❌ No department found. Please create a department first.');
    process.exit(1);
  }

  // Create Indent 1: Mechanical Seals (to be approved)
  const timestamp = Date.now().toString().slice(-4);
  const indent1 = await prisma.procurement.create({
    data: {
      referenceNo: `IND-2026-${timestamp}`,
      title: 'Mechanical Seals and Gaskets Procurement',
      description: 'Procurement of mechanical seals for pump maintenance',
      projectId: project.projectId,
      projectName: project.projectName,
      application: 'Mechanical Maintenance',
      itemType: 'Consumables',
      departmentId: department.id,
      priority: 'HIGH',
      requiredDate: new Date('2026-07-20'),
      requestedById: requester.id,
      currentStage: 1,
      status: 'SUBMITTED',
      stages: {
        create: [
          {
            stageNumber: 0,
            stageName: 'Indent Creation',
            status: 'COMPLETED',
            completedAt: new Date(),
            actionTaken: 'SUBMIT',
          },
          {
            stageNumber: 1,
            stageName: 'Indent Verification',
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
          ...Array.from({ length: 22 }, (_, i) => ({
            stageNumber: i + 2,
            stageName: `Stage ${i + 2}`,
            status: 'PENDING' as const,
          })),
        ],
      },
      items: {
        create: [
          {
            itemCode: 'MECH-SEAL-001',
            itemName: 'Mechanical Seal 25mm',
            description: 'Double acting mechanical seal',
            unit: 'PCS',
            quantity: 10,
            technicalSpec: 'Material: SiC/SiC, Pressure: 25 bar',
            approvedMakes: 'Flowserve, Burgmann, EagleBurgmann',
          },
        ],
      },
      history: {
        create: {
          action: 'SUBMITTED',
          description:
            'Indent submitted for verification: Mechanical Seals and Gaskets Procurement',
          performedById: requester.id,
          stageNumber: 1,
        },
      },
    },
  });

  console.log(`✅ Created Indent 1: ${indent1.referenceNo} (${indent1.id})`);

  // Create Indent 2: Electrical Cables (to be put on hold)
  const indent2 = await prisma.procurement.create({
    data: {
      referenceNo: `IND-2026-${String(Number(timestamp) + 1).padStart(4, '0')}`,
      title: 'Electrical Cable Procurement',
      description: 'Procurement of power cables for new installation',
      projectId: project.projectId,
      projectName: project.projectName,
      application: 'Electrical',
      itemType: 'Cables',
      departmentId: department.id,
      priority: 'NORMAL',
      requiredDate: new Date('2026-07-25'),
      requestedById: requester.id,
      currentStage: 1,
      status: 'SUBMITTED',
      stages: {
        create: [
          {
            stageNumber: 0,
            stageName: 'Indent Creation',
            status: 'COMPLETED',
            completedAt: new Date(),
            actionTaken: 'SUBMIT',
          },
          {
            stageNumber: 1,
            stageName: 'Indent Verification',
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
          ...Array.from({ length: 22 }, (_, i) => ({
            stageNumber: i + 2,
            stageName: `Stage ${i + 2}`,
            status: 'PENDING' as const,
          })),
        ],
      },
      items: {
        create: [
          {
            itemCode: 'ELEC-CABLE-001',
            itemName: 'Power Cable 3.5 sqmm',
            description: 'Copper conductor, XLPE insulated',
            unit: 'MTR',
            quantity: 500,
            technicalSpec: 'Voltage: 1.1kV, Core: 3C',
            approvedMakes: 'Polycab, Havells, KEI',
          },
        ],
      },
      history: {
        create: {
          action: 'SUBMITTED',
          description:
            'Indent submitted for verification: Electrical Cable Procurement',
          performedById: requester.id,
          stageNumber: 1,
        },
      },
    },
  });

  console.log(`✅ Created Indent 2: ${indent2.referenceNo} (${indent2.id})`);

  // Create Indent 3: Plumbing Fittings (to be rejected)
  const indent3 = await prisma.procurement.create({
    data: {
      referenceNo: `IND-2026-${String(Number(timestamp) + 2).padStart(4, '0')}`,
      title: 'Plumbing Fittings Procurement',
      description: 'Valves and fittings for water line',
      projectId: project.projectId,
      projectName: project.projectName,
      application: 'Plumbing',
      itemType: 'Fittings',
      departmentId: department.id,
      priority: 'LOW',
      requiredDate: new Date('2026-08-01'),
      requestedById: requester.id,
      currentStage: 1,
      status: 'SUBMITTED',
      stages: {
        create: [
          {
            stageNumber: 0,
            stageName: 'Indent Creation',
            status: 'COMPLETED',
            completedAt: new Date(),
            actionTaken: 'SUBMIT',
          },
          {
            stageNumber: 1,
            stageName: 'Indent Verification',
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
          ...Array.from({ length: 22 }, (_, i) => ({
            stageNumber: i + 2,
            stageName: `Stage ${i + 2}`,
            status: 'PENDING' as const,
          })),
        ],
      },
      items: {
        create: [
          {
            itemCode: 'PLUMB-VALVE-001',
            itemName: 'Ball Valve DN50',
            description: 'SS304 body, PTFE seal',
            unit: 'PCS',
            quantity: 20,
            technicalSpec: 'PN16, Flanged ends',
            approvedMakes: 'AVK, Kitz, Zoloto',
          },
        ],
      },
      history: {
        create: {
          action: 'SUBMITTED',
          description:
            'Indent submitted for verification: Plumbing Fittings Procurement',
          performedById: requester.id,
          stageNumber: 1,
        },
      },
    },
  });

  console.log(`✅ Created Indent 3: ${indent3.referenceNo} (${indent3.id})\n`);

  console.log('📊 Test Data Summary:');
  console.log('─────────────────────────────────────────────────────');
  console.log(`Indent 1: ${indent1.referenceNo} - ${indent1.title}`);
  console.log(`  Status: ${indent1.status} | Stage: ${indent1.currentStage}`);
  console.log(`  Action: APPROVE → Moves to Store Check (Stage 2)`);
  console.log('');
  console.log(`Indent 2: ${indent2.referenceNo} - ${indent2.title}`);
  console.log(`  Status: ${indent2.status} | Stage: ${indent2.currentStage}`);
  console.log(`  Action: HOLD → Requester can edit and resubmit`);
  console.log('');
  console.log(`Indent 3: ${indent3.referenceNo} - ${indent3.title}`);
  console.log(`  Status: ${indent3.status} | Stage: ${indent3.currentStage}`);
  console.log(`  Action: REJECT → Requester can edit and resubmit`);
  console.log('─────────────────────────────────────────────────────\n');

  console.log('✨ Test data created successfully!');
  console.log('📧 All emails will be sent to: 29x.aditya@gmail.com');
  console.log('🔗 Frontend: http://localhost:3000');
  console.log('🔗 Backend: http://localhost:3001\n');

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
