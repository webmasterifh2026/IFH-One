import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed script for v2.5.0 SLA Engine
 * Populates StageConfiguration with TAT and escalation thresholds
 * Associates default owners (Doers) to each stage
 */

interface StageConfig {
  number: number;
  name: string;
  tatHours: number;
  doerNames: string[];
  escalationL1DelayHours: number;
  escalationL2DelayHours: number;
  escalationL3DelayHours: number;
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    number: 1,
    name: 'Indent Verification',
    tatHours: 6,
    doerNames: ['Pramod Kumar', 'Akshit Chaudhary'],
    escalationL1DelayHours: 0,
    escalationL2DelayHours: 2,
    escalationL3DelayHours: 4,
  },
  {
    number: 2,
    name: 'Store Availability Check',
    tatHours: 4,
    doerNames: ['Shiv Dayal Sharma', 'Pankaj Kumar'],
    escalationL1DelayHours: 0,
    escalationL2DelayHours: 1,
    escalationL3DelayHours: 2,
  },
  {
    number: 3,
    name: 'RFQ Float',
    tatHours: 6,
    doerNames: [], // Dynamic assignment via AO column
    escalationL1DelayHours: 0,
    escalationL2DelayHours: 2,
    escalationL3DelayHours: 4,
  },
  {
    number: 4,
    name: 'Techno Commercial Evaluation',
    tatHours: 24,
    doerNames: [], // Dynamic
    escalationL1DelayHours: 4,
    escalationL2DelayHours: 8,
    escalationL3DelayHours: 12,
  },
  {
    number: 5,
    name: 'Negotiation & Decision',
    tatHours: 12,
    doerNames: [], // Dynamic
    escalationL1DelayHours: 2,
    escalationL2DelayHours: 6,
    escalationL3DelayHours: 10,
  },
  {
    number: 6,
    name: 'PO Creation',
    tatHours: 4,
    doerNames: [], // Dynamic
    escalationL1DelayHours: 0,
    escalationL2DelayHours: 1,
    escalationL3DelayHours: 2,
  },
  {
    number: 7,
    name: 'PO Approval L1',
    tatHours: 6,
    doerNames: ['Pramod Kumar'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 3,
    escalationL3DelayHours: 5,
  },
  {
    number: 8,
    name: 'PO Approval L2',
    tatHours: 6,
    doerNames: ['Ankur Gupta'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 3,
    escalationL3DelayHours: 5,
  },
  {
    number: 9,
    name: 'Vendor Acceptance',
    tatHours: 20,
    doerNames: ['Neetu Singh'],
    escalationL1DelayHours: 4,
    escalationL2DelayHours: 10,
    escalationL3DelayHours: 15,
  },
  {
    number: 10,
    name: 'Vendor Follow Up',
    tatHours: 12,
    doerNames: ['Priyanka Pal'],
    escalationL1DelayHours: 2,
    escalationL2DelayHours: 6,
    escalationL3DelayHours: 10,
  },
  {
    number: 11,
    name: 'Material Receipt',
    tatHours: 0, // No fixed TAT — depends on delivery
    doerNames: ['Shiv Dayal Sharma', 'Shivam Namdev', 'Anushka Kamboj'],
    escalationL1DelayHours: 0,
    escalationL2DelayHours: 0,
    escalationL3DelayHours: 0,
  },
  {
    number: 12,
    name: 'Material Inspection',
    tatHours: 4,
    doerNames: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    escalationL1DelayHours: 0,
    escalationL2DelayHours: 1,
    escalationL3DelayHours: 2,
  },
  {
    number: 13,
    name: 'Secondary Inspection',
    tatHours: 8,
    doerNames: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 3,
    escalationL3DelayHours: 5,
  },
  {
    number: 14,
    name: 'Final Inspection',
    tatHours: 8,
    doerNames: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 3,
    escalationL3DelayHours: 5,
  },
  {
    number: 15,
    name: 'Debit Note Preparation',
    tatHours: 10,
    doerNames: ['Atul Tyagi'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 4,
    escalationL3DelayHours: 7,
  },
  {
    number: 16,
    name: 'Bill To Accounts',
    tatHours: 6,
    doerNames: ['Pankaj Kumar', 'Anushka Kamboj'],
    escalationL1DelayHours: 0,
    escalationL2DelayHours: 2,
    escalationL3DelayHours: 4,
  },
  {
    number: 17,
    name: 'Bill To Purchase',
    tatHours: 8,
    doerNames: ['Pankaj Kumar', 'Atul Tyagi', 'Anushka Kamboj'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 3,
    escalationL3DelayHours: 5,
  },
  {
    number: 18,
    name: 'Bill Creation',
    tatHours: 8,
    doerNames: ['Pankaj Kumar', 'Atul Tyagi', 'Anushka Kamboj'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 3,
    escalationL3DelayHours: 5,
  },
  {
    number: 19,
    name: 'Tally Entry',
    tatHours: 10,
    doerNames: ['Atul Tyagi'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 4,
    escalationL3DelayHours: 7,
  },
  {
    number: 20,
    name: 'Bill Approval L1',
    tatHours: 6,
    doerNames: ['Pramod Kumar'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 3,
    escalationL3DelayHours: 5,
  },
  {
    number: 21,
    name: 'Bill Approval L2',
    tatHours: 6,
    doerNames: ['Neetu Singh'],
    escalationL1DelayHours: 1,
    escalationL2DelayHours: 3,
    escalationL3DelayHours: 5,
  },
  {
    number: 22,
    name: 'Payment Advice',
    tatHours: 4,
    doerNames: [
      'Neha Mishra',
      'Vanshika Mathur',
      'Md. Aftab Moin',
      'MOHAMMAD AZAD',
      'Akshit Chaudhary',
    ],
    escalationL1DelayHours: 0,
    escalationL2DelayHours: 1,
    escalationL3DelayHours: 2,
  },
];

async function main() {
  console.log('🌱 Seeding StageConfiguration with TAT and default owners...');

  for (const config of STAGE_CONFIGS) {
    // Fetch users by name
    const defaultOwners = await Promise.all(
      config.doerNames.map(async (name) => {
        const user = await prisma.user.findFirst({
          where: {
            fullName: { contains: name, mode: 'insensitive' },
            status: 'ACTIVE',
          },
        });
        if (!user) {
          console.warn(
            `⚠️  User "${name}" not found for Stage ${config.number}`,
          );
        }
        return user;
      }),
    );

    // Filter out null users
    const validOwners = defaultOwners.filter((u) => u !== null);

    // Upsert stage configuration
    const stageConfig = await prisma.stageConfiguration.upsert({
      where: { stageNumber: config.number },
      create: {
        stageNumber: config.number,
        stageName: config.name,
        tatHours: config.tatHours,
        isDynamicOwner: validOwners.length === 0,
        escalationL1DelayHours: config.escalationL1DelayHours,
        escalationL2DelayHours: config.escalationL2DelayHours,
        escalationL3DelayHours: config.escalationL3DelayHours,
      },
      update: {
        tatHours: config.tatHours,
        isDynamicOwner: validOwners.length === 0,
        escalationL1DelayHours: config.escalationL1DelayHours,
        escalationL2DelayHours: config.escalationL2DelayHours,
        escalationL3DelayHours: config.escalationL3DelayHours,
      },
    });

    // Connect default owners (many-to-many)
    if (validOwners.length > 0) {
      await prisma.stageConfiguration.update({
        where: { stageNumber: config.number },
        data: {
          defaultOwners: {
            connect: validOwners.map((u) => ({ id: u!.id })),
          },
        },
      });
    }

    console.log(
      `✅ S${config.number}: "${config.name}" | TAT: ${config.tatHours}h | Owners: ${validOwners.length}`,
    );
  }

  console.log('\n✨ Stage configuration seeding complete!');
  console.log('📊 Next steps:');
  console.log('   1. Run: npx prisma migrate deploy');
  console.log('   2. Verify StageConfiguration in database');
  console.log('   3. Start the API server');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
