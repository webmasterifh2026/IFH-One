import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data...');

  // 1. Projects
  const projects = [
    { projectId: 'PRJ-2026-001', projectName: 'Alpha Tower Construction' },
    { projectId: 'PRJ-2026-002', projectName: 'Beta Data Center' },
    { projectId: 'PRJ-2026-003', projectName: 'Gamma Solar Park' },
    { projectId: 'PRJ-2026-004', projectName: 'Delta Smart City' },
    { projectId: 'PRJ-2026-005', projectName: 'Epsilon Logistics Hub' },
  ];

  for (const p of projects) {
    await prisma.project.upsert({
      where: { projectId: p.projectId },
      update: {},
      create: p,
    });
  }
  console.log('✅ Seeded 5 Projects');

  // 2. Vendors
  const vendors = [
    {
      vendorCode: 'V-001',
      vendorName: 'Acme Supplies Ltd',
      email: '291.aditya@gmail.com',
      phone: '+91-9876543210',
      address: '123 Tech Park, Mumbai, MH, India, GST: 27AADCB2230M1Z4, PAN: AADCB2230M',
      status: 'ACTIVE',
    },
    {
      vendorCode: 'V-002',
      vendorName: 'Global Hardware Co',
      email: '292.aditya@gmail.com',
      phone: '+91-9876543211',
      address: '45 Industrial Estate, Delhi, DL, India, GST: 07AAECE1234B1Z5, PAN: AAECE1234B',
      status: 'ACTIVE',
    },
    {
      vendorCode: 'V-003',
      vendorName: 'Prime Electronics',
      email: '293.aditya@gmail.com',
      phone: '+91-9876543212',
      address: '78 Silicon Valley, Bangalore, KA, India, GST: 29AABCP9876C1Z6, PAN: AABCP9876C',
      status: 'ACTIVE',
    },
    {
      vendorCode: 'V-004',
      vendorName: 'BuildWell Materials',
      email: '294.aditya@gmail.com',
      phone: '+91-9876543213',
      address: '90 Builders Lane, Chennai, TN, India, GST: 33AABCD5678E1Z7, PAN: AABCD5678E',
      status: 'ACTIVE',
    },
    {
      vendorCode: 'V-005',
      vendorName: 'Eco Power Solutions',
      email: '295.aditya@gmail.com',
      phone: '+91-9876543214',
      address: '12 Green Avenue, Pune, MH, India, GST: 27AABCE4321F1Z8, PAN: AABCE4321F',
      status: 'ACTIVE',
    },
  ];

  for (const v of vendors) {
    await prisma.vendor.upsert({
      where: { vendorCode: v.vendorCode },
      update: {},
      create: v,
    });
  }
  console.log('✅ Seeded 5 Vendors');

  // 3. Items (SKU)
  const items = [
    {
      itemCode: 'ITM-001',
      description: 'Portland Cement Grade 53 - 50kg Bag (HSN: 2523, Rate: 350, GST: 28%)',
      category: 'CIVIL',
      subGroup: 'CEMENT',
      uom: 'Bags',
      status: 'Active',
    },
    {
      itemCode: 'ITM-002',
      description: 'TMT Steel Bars 12mm (HSN: 7214, Rate: 55000, GST: 18%)',
      category: 'CIVIL',
      subGroup: 'STEEL',
      uom: 'MT',
      status: 'Active',
    },
    {
      itemCode: 'ITM-003',
      description: 'Copper Wire 2.5 sq mm (HSN: 8544, Rate: 1200, GST: 18%)',
      category: 'ELECTRICAL',
      subGroup: 'CABLES',
      uom: 'Coil',
      status: 'Active',
    },
    {
      itemCode: 'ITM-004',
      description: 'LED Panel Light 15W (HSN: 9405, Rate: 450, GST: 12%)',
      category: 'ELECTRICAL',
      subGroup: 'LIGHTING',
      uom: 'Nos',
      status: 'Active',
    },
    {
      itemCode: 'ITM-005',
      description: 'Safety Helmet Class E (HSN: 6506, Rate: 250, GST: 18%)',
      category: 'SAFETY',
      subGroup: 'PPE',
      uom: 'Nos',
      status: 'Active',
    },
  ];

  for (const i of items) {
    await prisma.sKU.upsert({
      where: { itemCode: i.itemCode },
      update: {},
      create: i,
    });
  }
  console.log('✅ Seeded 5 Items');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
