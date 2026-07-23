import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  // User Management
  { module: 'User Management', key: 'user.view', name: 'View Users', description: 'View user list and details' },
  { module: 'User Management', key: 'user.create', name: 'Create Users', description: 'Create new users' },
  { module: 'User Management', key: 'user.edit', name: 'Edit Users', description: 'Edit existing users' },
  { module: 'User Management', key: 'user.deactivate', name: 'Deactivate Users', description: 'Deactivate or lock users' },
  { module: 'User Management', key: 'user.reset_password', name: 'Reset Password', description: 'Reset passwords for other users' },

  // Role Management
  { module: 'Role Management', key: 'role.view', name: 'View Roles', description: 'View roles and their permissions' },
  { module: 'Role Management', key: 'role.create', name: 'Create Roles', description: 'Create new roles' },
  { module: 'Role Management', key: 'role.edit', name: 'Edit Roles', description: 'Edit existing roles' },
  { module: 'Role Management', key: 'role.assign_permissions', name: 'Assign Permissions', description: 'Assign permissions to roles' },

  // Permission Management
  { module: 'Permission Management', key: 'permission.view', name: 'View Permissions', description: 'View available permissions' },
  { module: 'Permission Management', key: 'permission.assign', name: 'Assign Permissions', description: 'Assign permissions to a role' },
  { module: 'Permission Management', key: 'permission.edit', name: 'Edit Permissions', description: 'Modify permission details' },

  // Department Master
  { module: 'Department Master', key: 'department.view', name: 'View Departments', description: 'View departments' },
  { module: 'Department Master', key: 'department.create', name: 'Create Departments', description: 'Create new departments' },
  { module: 'Department Master', key: 'department.edit', name: 'Edit Departments', description: 'Edit existing departments' },

  // Project Master
  { module: 'Project Master', key: 'project.view', name: 'View Projects', description: 'View projects' },
  { module: 'Project Master', key: 'project.create', name: 'Create Projects', description: 'Create new projects' },
  { module: 'Project Master', key: 'project.edit', name: 'Edit Projects', description: 'Edit existing projects' },

  // Vendor Master
  { module: 'Vendor Master', key: 'vendor.view', name: 'View Vendors', description: 'View vendor directory' },
  { module: 'Vendor Master', key: 'vendor.create', name: 'Create Vendors', description: 'Create new vendors' },
  { module: 'Vendor Master', key: 'vendor.edit', name: 'Edit Vendors', description: 'Edit existing vendors' },
  { module: 'Vendor Master', key: 'vendor.approve', name: 'Approve Vendors', description: 'Approve vendor onboarding' },

  // Indents
  { module: 'Indents', key: 'indent.view', name: 'View Indents', description: 'View material indents' },
  { module: 'Indents', key: 'indent.create', name: 'Create Indents', description: 'Create new indents' },
  { module: 'Indents', key: 'indent.edit', name: 'Edit Indents', description: 'Edit indents' },
  { module: 'Indents', key: 'indent.cancel', name: 'Cancel Indents', description: 'Cancel existing indents' },

  // RFQs
  { module: 'RFQs', key: 'rfq.view', name: 'View RFQs', description: 'View Request for Quotations' },
  { module: 'RFQs', key: 'rfq.create', name: 'Create RFQs', description: 'Create new RFQs' },
  { module: 'RFQs', key: 'rfq.edit', name: 'Edit RFQs', description: 'Edit existing RFQs' },
  { module: 'RFQs', key: 'rfq.close', name: 'Close RFQs', description: 'Close or finalize RFQs' },

  // Purchase Orders
  { module: 'Purchase Orders', key: 'po.view', name: 'View Purchase Orders', description: 'View purchase orders' },
  { module: 'Purchase Orders', key: 'po.create', name: 'Create Purchase Orders', description: 'Create new purchase orders' },
  { module: 'Purchase Orders', key: 'po.edit', name: 'Edit Purchase Orders', description: 'Edit purchase orders' },
  { module: 'Purchase Orders', key: 'po.approve', name: 'Approve Purchase Orders', description: 'Approve purchase orders for issue' },

  // Receipts
  { module: 'Receipts', key: 'receipt.view', name: 'View Receipts', description: 'View Goods Receipt Notes (GRN)' },
  { module: 'Receipts', key: 'receipt.create', name: 'Create Receipts', description: 'Create new receipts' },
  { module: 'Receipts', key: 'receipt.edit', name: 'Edit Receipts', description: 'Edit existing receipts' },

  // Gate Entry / Material Receipt
  { module: 'Gate Entry', key: 'gate_entry.view', name: 'View Gate Entries', description: 'View gate entries, quantity checks, quality checks, and GRNs' },
  { module: 'Gate Entry', key: 'gate_entry.create', name: 'Create Gate Entries', description: 'Perform gate entry (Security Gate) — search PO, log vehicle, upload photos' },
  { module: 'Gate Entry', key: 'gate_entry.quantity_check', name: 'Quantity Verification', description: 'Perform quantity verification against invoice (Store)' },
  { module: 'Gate Entry', key: 'gate_entry.quality_check', name: 'Quality Inspection', description: 'Perform quality inspection — accept/reject/deviation (QC)' },
  { module: 'Gate Entry', key: 'gate_entry.allocate', name: 'Material Allocation', description: 'Allocate accepted material to a storage location and trigger GRN' },

  // Inspections
  { module: 'Inspections', key: 'inspection.view', name: 'View Inspections', description: 'View inspection reports' },
  { module: 'Inspections', key: 'inspection.perform', name: 'Perform Inspections', description: 'Perform material inspections' },
  { module: 'Inspections', key: 'inspection.approve', name: 'Approve Inspections', description: 'Approve or reject inspected materials' },

  // Billing
  { module: 'Billing', key: 'bill.view', name: 'View Bills', description: 'View vendor bills' },
  { module: 'Billing', key: 'bill.create', name: 'Create Bills', description: 'Create new bills against POs' },
  { module: 'Billing', key: 'bill.edit', name: 'Edit Bills', description: 'Edit vendor bills' },
  { module: 'Billing', key: 'bill.approve', name: 'Approve Bills', description: 'Approve bills for payment' },

  // Payments
  { module: 'Payments', key: 'payment.view', name: 'View Payments', description: 'View payment records' },
  { module: 'Payments', key: 'payment.approve', name: 'Approve Payments', description: 'Approve scheduled payments' },
  { module: 'Payments', key: 'payment.release', name: 'Release Payments', description: 'Release actual payments to vendors' },

  // Reports
  { module: 'Reports', key: 'report.view', name: 'View Reports', description: 'View system reports' },
  { module: 'Reports', key: 'report.export', name: 'Export Reports', description: 'Export reports to Excel/PDF' },

  // Settings
  { module: 'Settings', key: 'settings.view', name: 'View Settings', description: 'View system settings' },
  { module: 'Settings', key: 'settings.edit', name: 'Edit Settings', description: 'Modify system settings' },

  // Audit Logs
  { module: 'Audit Logs', key: 'audit.view', name: 'View Audit Logs', description: 'View system audit logs' },
];

async function main() {
  console.log('Seeding permissions...');

  // 1. Seed Permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {
        module: perm.module,
        description: perm.description,
      },
      create: {
        module: perm.module,
        key: perm.key,
        description: perm.description,
      },
    });
  }
  console.log('✔ Permissions seeded');

  // 2. Setup Default Roles
  let adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { name: 'Admin', description: 'System Administrator with full access' },
    });
    console.log('✔ Admin role created');
  }

  let doerRole = await prisma.role.findUnique({ where: { name: 'Doer' } });
  if (!doerRole) {
    doerRole = await prisma.role.create({
      data: { name: 'Doer', description: 'Standard user with workflow access' },
    });
    console.log('✔ Doer role created');
  }

  // 3. Assign All Permissions to Admin
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }
  console.log('✔ Admin permissions assigned');

  // 4. Assign Limited Permissions to Doer
  // Doer only needs very basic permissions
  const doerKeys = [
    'user.view', 'indent.view', 'rfq.view', 'po.view', 'receipt.view', 
    'inspection.view', 'bill.view', 'payment.view'
  ];
  const doerPermissions = allPermissions.filter(p => doerKeys.includes(p.key));
  
  for (const perm of doerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: doerRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: doerRole.id,
        permissionId: perm.id,
      },
    });
  }
  console.log('✔ Doer permissions assigned');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
