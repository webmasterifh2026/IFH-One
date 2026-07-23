import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding INDENT_VERIFIER role...');

  // Create the role
  const role = await prisma.role.upsert({
    where: { name: 'INDENT_VERIFIER' },
    update: {
      description:
        'Responsible for reviewing, verifying, approving, rejecting, holding, and updating indents during the Indent Verification stage (S2).',
    },
    create: {
      name: 'INDENT_VERIFIER',
      description:
        'Responsible for reviewing, verifying, approving, rejecting, holding, and updating indents during the Indent Verification stage (S2).',
    },
  });

  console.log(`Role ${role.name} ready (ID: ${role.id})`);

  // Desired permissions based on requirements:
  // ✅ Dashboard: dashboard.view
  // ✅ Control Tower: dashboard.view
  // ✅ Indent Lifecycle: indent.view
  // ✅ Hold Records: indent.view
  // ✅ Rejected Records: indent.view
  // ✅ Archived Indents: indent.view
  // ✅ Audit Trail: audit.view
  const allowedKeys = ['dashboard.view', 'indent.view', 'audit.view'];

  // Clear existing role permissions for this role just in case
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

  for (const key of allowedKeys) {
    const perm = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, module: key.split('.')[0] || 'System', description: key },
    });

    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: perm.id },
    });
  }

  // S1 (Indent Verification): Full permissions
  await prisma.workflowStagePermission.upsert({
    where: { roleId_workflowStage: { roleId: role.id, workflowStage: 1 } },
    update: { canView: true, canEdit: true, canApprove: true },
    create: {
      roleId: role.id,
      workflowStage: 1,
      canView: true,
      canEdit: true,
      canApprove: true,
    },
  });

  // S2 (Store Availability Check): No permissions (or view only if required, but default to none)
  await prisma.workflowStagePermission.upsert({
    where: { roleId_workflowStage: { roleId: role.id, workflowStage: 2 } },
    update: { canView: false, canEdit: false, canApprove: false },
    create: {
      roleId: role.id,
      workflowStage: 2,
      canView: false,
      canEdit: false,
      canApprove: false,
    },
  });

  // All other stages (3-22): No permissions
  for (let i = 3; i <= 22; i++) {
    await prisma.workflowStagePermission.upsert({
      where: { roleId_workflowStage: { roleId: role.id, workflowStage: i } },
      update: { canView: false, canEdit: false, canApprove: false },
      create: {
        roleId: role.id,
        workflowStage: i,
        canView: false,
        canEdit: false,
        canApprove: false,
      },
    });
  }

  console.log('INDENT_VERIFIER seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
