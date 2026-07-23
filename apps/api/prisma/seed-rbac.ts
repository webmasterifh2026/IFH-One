import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting RBAC seeding...');

  // Create roles
  const rolesData = [
    { name: 'Super Admin', description: 'Full System Access' },
    { name: 'Procurement Admin', description: 'Manage procurement operations' },
    {
      name: 'Procurement Executive',
      description: 'Execute procurement stages',
    },
    { name: 'Procurement Approver', description: 'Approve POs and indents' },
    {
      name: 'Store Executive',
      description: 'Manage store, receipts and inspections',
    },
    { name: 'Store Manager', description: 'Approve material handling' },
    {
      name: 'Accounts Executive',
      description: 'Manage bills and Tally entries',
    },
    { name: 'Accounts Approver', description: 'Approve bills' },
    { name: 'Finance Executive', description: 'Process payments' },
    { name: 'Finance Approver', description: 'Approve payments' },
    { name: 'Viewer', description: 'Read-only access' },
  ];

  const roles = [];
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    roles.push(role);
  }

  // Define users from the workflow document
  const usersToCreate = [
    {
      email: 'pramod.kumar@if-himenviro.in',
      name: 'Pramod Kumar',
      employeeId: 'EMP001',
      roleNames: ['Procurement Approver', 'Procurement Admin'],
    },
    {
      email: 'shiv.sharma@if-himenviro.in',
      name: 'Shiv Dayal Sharma',
      employeeId: 'EMP002',
      roleNames: ['Store Executive'],
    },
    {
      email: 'pankaj.kumar@if-himenviro.in',
      name: 'Pankaj Kumar',
      employeeId: 'EMP003',
      roleNames: ['Store Executive', 'Accounts Executive'],
    },
    {
      email: 'ankur.gupta@if-himenviro.in',
      name: 'Ankur Gupta',
      employeeId: 'EMP004',
      roleNames: ['Procurement Approver'],
    },
    {
      email: 'neetu.singh@if-himenviro.in',
      name: 'Neetu Singh',
      employeeId: 'EMP005',
      roleNames: ['Accounts Approver'],
    },
    {
      email: 'priyanka.pal@if-himenviro.in',
      name: 'Priyanka Pal',
      employeeId: 'EMP006',
      roleNames: ['Procurement Executive'],
    },
    {
      email: 'shivam.namdev@if-himenviro.in',
      name: 'Shivam Namdev',
      employeeId: 'EMP007',
      roleNames: ['Store Executive'],
    },
    {
      email: 'anushka.kamboj@if-himenviro.in',
      name: 'Anushka Kamboj',
      employeeId: 'EMP008',
      roleNames: ['Store Executive', 'Accounts Executive'],
    },
    {
      email: 'saurabh@if-himenviro.in',
      name: 'Saurabh',
      employeeId: 'EMP009',
      roleNames: ['Store Executive'],
    },
    {
      email: 'atul.tyagi@if-himenviro.in',
      name: 'Atul Tyagi',
      employeeId: 'EMP010',
      roleNames: ['Accounts Executive'],
    },
    {
      email: 'neha.mishra@if-himenviro.in',
      name: 'Neha Mishra',
      employeeId: 'EMP011',
      roleNames: ['Finance Executive'],
    },
    {
      email: 'vanshika.mathur@if-himenviro.in',
      name: 'Vanshika Mathur',
      employeeId: 'EMP012',
      roleNames: ['Finance Executive'],
    },
    {
      email: 'md.aftab@if-himenviro.in',
      name: 'Md. Aftab Moin',
      employeeId: 'EMP013',
      roleNames: ['Finance Executive'],
    },
    {
      email: 'mohammad.azad@if-himenviro.in',
      name: 'Mohammad Azad',
      employeeId: 'EMP014',
      roleNames: ['Finance Executive'],
    },
  ];

  const defaultPassword = await bcrypt.hash('password123', 10);
  const createdUsers = new Map();

  for (const u of usersToCreate) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.name,
          employeeId: u.employeeId,
          passwordHash: defaultPassword,
          status: 'ACTIVE',
        },
      });
    }

    // Attach roles
    for (const roleName of u.roleNames) {
      const role = roles.find((r) => r.name === roleName);
      if (role) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          update: {},
          create: { userId: user.id, roleId: role.id },
        });
      }
    }

    createdUsers.set(u.name, user);
  }

  // Create Stage Configurations
  const stageConfigs = [
    {
      number: 2,
      name: 'Indent Verification',
      tatHours: 6,
      isDynamic: false,
      owners: ['Pramod Kumar'],
    },
    {
      number: 3,
      name: 'Check Store Availability',
      tatHours: 4,
      isDynamic: false,
      owners: ['Shiv Dayal Sharma', 'Pankaj Kumar'],
    },
    { number: 4, name: 'Float RFQ', tatHours: 6, isDynamic: true, owners: [] },
    {
      number: 5,
      name: 'Received Techno Commercial Offer',
      tatHours: 24,
      isDynamic: true,
      owners: [],
    },
    {
      number: 6,
      name: 'Negotiation',
      tatHours: 12,
      isDynamic: true,
      owners: [],
    },
    {
      number: 7,
      name: 'PO Creation',
      tatHours: 4,
      isDynamic: true,
      owners: [],
    },
    {
      number: 8,
      name: 'PO Approval 1',
      tatHours: 6,
      isDynamic: false,
      owners: ['Pramod Kumar'],
    },
    {
      number: 9,
      name: 'PO Approval 2',
      tatHours: 6,
      isDynamic: false,
      owners: ['Ankur Gupta'],
    },
    {
      number: 10,
      name: 'Vendor Acceptance',
      tatHours: 20,
      isDynamic: false,
      owners: ['Neetu Singh'],
    },
    {
      number: 11,
      name: 'Vendor Follow-up',
      tatHours: 12,
      isDynamic: false,
      owners: ['Priyanka Pal'],
    },
    {
      number: 12,
      name: 'Material Received',
      tatHours: 24,
      isDynamic: false,
      owners: ['Shiv Dayal Sharma', 'Shivam Namdev', 'Anushka Kamboj'],
    }, // No TAT in doc, setting to 24h fallback
    {
      number: 13,
      name: 'Material Inspection',
      tatHours: 4,
      isDynamic: false,
      owners: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    },
    {
      number: 14,
      name: 'Second Inspection',
      tatHours: 8,
      isDynamic: false,
      owners: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    },
    {
      number: 15,
      name: 'Third Inspection',
      tatHours: 8,
      isDynamic: false,
      owners: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    },
    {
      number: 16,
      name: 'Debit Note',
      tatHours: 10,
      isDynamic: false,
      owners: ['Atul Tyagi'],
    },
    {
      number: 17,
      name: 'Bill Sent to Accounts',
      tatHours: 6,
      isDynamic: false,
      owners: ['Pankaj Kumar', 'Anushka Kamboj'],
    },
    {
      number: 18,
      name: 'Bill Sent to Purchase',
      tatHours: 8,
      isDynamic: false,
      owners: ['Pankaj Kumar', 'Atul Tyagi', 'Anushka Kamboj'],
    },
    {
      number: 19,
      name: 'Bill Creation',
      tatHours: 8,
      isDynamic: false,
      owners: ['Pankaj Kumar', 'Atul Tyagi', 'Anushka Kamboj'],
    },
    {
      number: 20,
      name: 'Book Purchase in Tally',
      tatHours: 10,
      isDynamic: false,
      owners: ['Atul Tyagi'],
    },
    {
      number: 21,
      name: 'Bill Approval 1',
      tatHours: 6,
      isDynamic: false,
      owners: ['Pramod Kumar'],
    },
    {
      number: 22,
      name: 'Bill Approval 2',
      tatHours: 6,
      isDynamic: false,
      owners: ['Neetu Singh'],
    },
    {
      number: 23,
      name: 'Payment / Advice',
      tatHours: 4,
      isDynamic: false,
      owners: [
        'Neha Mishra',
        'Vanshika Mathur',
        'Md. Aftab Moin',
        'Mohammad Azad',
      ],
    },
  ];

  for (const config of stageConfigs) {
    const ownerIds = config.owners
      .map((name) => createdUsers.get(name)?.id)
      .filter(Boolean);

    await prisma.stageConfiguration.upsert({
      where: { stageNumber: config.number },
      update: {
        stageName: config.name,
        tatHours: config.tatHours,
        isDynamicOwner: config.isDynamic,
        defaultOwners: {
          set: ownerIds.map((id) => ({ id })),
        },
      },
      create: {
        stageNumber: config.number,
        stageName: config.name,
        tatHours: config.tatHours,
        isDynamicOwner: config.isDynamic,
        defaultOwners: {
          connect: ownerIds.map((id) => ({ id })),
        },
      },
    });
  }

  console.log('RBAC Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
