/**
 * Database Cleanup Script — IFH One Production Readiness
 *
 * Deletes all transactional/test data while preserving:
 *   - Administrator account(s) and their roles/permissions
 *   - Master data (Roles, Permissions, Departments, Projects, Vendors, SKUs, etc.)
 *   - System configuration (StageConfiguration, SystemHealth)
 *   - Application configuration
 *
 * Usage: npx ts-node scripts/cleanup-database.ts
 *
 * WARNING: This script permanently deletes data. Run only after confirming
 *          all test/transactional data should be removed.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getPreservedUserIds(): Promise<string[]> {
  const adminRoles = await prisma.role.findMany({
    where: { name: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    select: { id: true },
  });
  const adminRoleIds = adminRoles.map((r) => r.id);
  const userRoles = await prisma.userRole.findMany({
    where: { roleId: { in: adminRoleIds } },
    select: { userId: true },
  });
  const userIds = [...new Set(userRoles.map((ur) => ur.userId))];
  console.log(`  → Preserving ${userIds.length} administrator user account(s)`);
  return userIds;
}

async function cleanup() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  IFH One — Database Cleanup Script');
  console.log('  Target: Neon PostgreSQL (production)');
  console.log('══════════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  let totalDeleted = 0;

  // ── Step 1: Identify preserved records ───────────────────────────────
  console.log('📋 Step 1: Identifying preserved records...');
  const preservedUserIds = await getPreservedUserIds();

  const roleCount = await prisma.role.count();
  const permCount = await prisma.permission.count();
  const deptCount = await prisma.department.count();
  const projCount = await prisma.project.count();
  const vendorCount = await prisma.vendor.count();
  const skuCount = await prisma.sKU.count();
  const stageConfigCount = await prisma.stageConfiguration.count();

  console.log(`  → Preserving ${roleCount} roles`);
  console.log(`  → Preserving ${permCount} permissions`);
  console.log(`  → Preserving ${deptCount} departments`);
  console.log(`  → Preserving ${projCount} projects`);
  console.log(`  → Preserving ${vendorCount} vendors`);
  console.log(`  → Preserving ${skuCount} SKUs`);
  console.log(`  → Preserving ${stageConfigCount} stage configurations\n`);

  // ── Helper ───────────────────────────────────────────────────────────
  const del = async (label: string, promise: Promise<any>): Promise<number> => {
    const r = await promise;
    const c = typeof r === 'number' ? r : (r?.count ?? 0);
    console.log(`     ${label}: ${c} deleted`);
    return c;
  };

  // ═════════════════════════════════════════════════════════════════════
  // Step 2: Delete transactional data in dependency order
  // ═════════════════════════════════════════════════════════════════════
  console.log('🗑️  Step 2: Deleting transactional data...\n');

  // ── Finance & Billing ──────────────────────────────────────────────
  // Note: Billing-specific models are not yet in the Prisma schema.
  // When they are added, add deletion calls here.
  console.log('  ── Finance & Billing ──');
  console.log('     (Billing tables not yet in Prisma schema - skipped)');

  // ── Gate Entry & GRN ───────────────────────────────────────────────
  console.log('  ── Gate Entry & GRN ──');
  totalDeleted += await del('GateEntryItem', prisma.gateEntryItem.deleteMany());
  totalDeleted += await del('GRN', prisma.gRN.deleteMany());
  totalDeleted += await del('GateEntry', prisma.gateEntry.deleteMany());

  // ── Negotiation (RFQ Float) ────────────────────────────────────────
  console.log('  ── Negotiation (RFQ Float) ──');
  totalDeleted += await del('NegotiationItem', prisma.negotiationItem.deleteMany());
  totalDeleted += await del('Negotiation', prisma.negotiation.deleteMany());
  totalDeleted += await del('TCEItem', prisma.tCEItem.deleteMany());
  totalDeleted += await del('TCEAttachment', prisma.tCEAttachment.deleteMany());
  totalDeleted += await del('TCE', prisma.tCE.deleteMany());
  totalDeleted += await del('RFQFloatEmailLog', prisma.rFQFloatEmailLog.deleteMany());
  totalDeleted += await del('RFQFloatActivityLog', prisma.rFQFloatActivityLog.deleteMany());
  totalDeleted += await del('RFQFloatVendor', prisma.rFQFloatVendor.deleteMany());
  totalDeleted += await del('RFQFloatItem', prisma.rFQFloatItem.deleteMany());
  totalDeleted += await del('RFQFloat', prisma.rFQFloat.deleteMany());

  // ── Vendor RFQ Portal ──────────────────────────────────────────────
  console.log('  ── Vendor RFQ Portal ──');
  totalDeleted += await del('NegotiationRound', prisma.negotiationRound.deleteMany());
  totalDeleted += await del('VendorQuotationAttachment', prisma.vendorQuotationAttachment.deleteMany());
  totalDeleted += await del('VendorQuotationLineItem', prisma.vendorQuotationLineItem.deleteMany());
  totalDeleted += await del('VendorQuotation', prisma.vendorQuotation.deleteMany());
  totalDeleted += await del('VendorFormAccessLog', prisma.vendorFormAccessLog.deleteMany());
  totalDeleted += await del('RFQEmailLog', prisma.rFQEmailLog.deleteMany());
  totalDeleted += await del('RFQActivityLog', prisma.rFQActivityLog.deleteMany());
  totalDeleted += await del('VendorRFQForm', prisma.vendorRFQForm.deleteMany());

  // ── RFQ ────────────────────────────────────────────────────────────
  console.log('  ── RFQ ──');
  totalDeleted += await del('RFQVendor', prisma.rFQVendor.deleteMany());
  totalDeleted += await del('RFQRemark', prisma.rFQRemark.deleteMany());
  totalDeleted += await del('RFQHistory', prisma.rFQHistory.deleteMany());
  totalDeleted += await del('RFQAttachment', prisma.rFQAttachment.deleteMany());
  totalDeleted += await del('RFQItem', prisma.rFQItem.deleteMany());
  totalDeleted += await del('RFQ', prisma.rFQ.deleteMany());

  // ── Procurement (Indents, Items, Stages, History) ──────────────────
  console.log('  ── Procurement (Indents) ──');
  totalDeleted += await del('RejectionEmail', prisma.rejectionEmail.deleteMany());
  totalDeleted += await del('EmailLog', prisma.emailLog.deleteMany());
  totalDeleted += await del('SlaRecord', prisma.slaRecord.deleteMany());
  totalDeleted += await del('DelayLog', prisma.delayLog.deleteMany());
  totalDeleted += await del('ReminderLog', prisma.reminderLog.deleteMany());
  totalDeleted += await del('EscalationLog', prisma.escalationLog.deleteMany());
  totalDeleted += await del('ProcurementRemark', prisma.procurementRemark.deleteMany());
  totalDeleted += await del('ProcurementHistory', prisma.procurementHistory.deleteMany());
  totalDeleted += await del('ProcurementAttachment', prisma.procurementAttachment.deleteMany());
  totalDeleted += await del('ProcurementStage', prisma.procurementStage.deleteMany());
  totalDeleted += await del('ProcurementItem', prisma.procurementItem.deleteMany());
  totalDeleted += await del('Procurement', prisma.procurement.deleteMany());

  // ── Notifications ──────────────────────────────────────────────────
  console.log('  ── Notifications ──');
  totalDeleted += await del('Notification', prisma.notification.deleteMany());

  // ── Bulk Operations ────────────────────────────────────────────────
  console.log('  ── Bulk Operations ──');
  totalDeleted += await del('BulkOperation', prisma.bulkOperation.deleteMany());

  // ── Audit Logs ─────────────────────────────────────────────────────
  console.log('  ── Audit Logs ──');
  totalDeleted += await del('AuditLog', prisma.auditLog.deleteMany());

  // ── Search Analytics ───────────────────────────────────────────────
  console.log('  ── Search Analytics ──');
  totalDeleted += await del('SearchAnalytics', prisma.searchAnalytics.deleteMany());

  // ── Recently Viewed Items ──────────────────────────────────────────
  console.log('  ── Recently Viewed Items ──');
  totalDeleted += await del('RecentlyViewedItem', prisma.recentlyViewedItem.deleteMany());

  // ── Import History ─────────────────────────────────────────────────
  console.log('  ── Import History ──');
  totalDeleted += await del('ImportHistory', prisma.importHistory.deleteMany());

  // ── Sessions & Password Reset Tokens ───────────────────────────────
  console.log('  ── Sessions & Tokens ──');
  totalDeleted += await del(
    'Session (non-admin)',
    prisma.session.deleteMany({ where: { userId: { notIn: preservedUserIds } } }),
  );
  totalDeleted += await del('PasswordResetToken', prisma.passwordResetToken.deleteMany());

  // ── Non-admin Users ────────────────────────────────────────────────
  console.log('  ── Non-admin Users ──');
  const nonAdminUserRoleCount = await del(
    'UserRole (non-admin)',
    prisma.userRole.deleteMany({ where: { userId: { notIn: preservedUserIds } } }),
  );
  totalDeleted += nonAdminUserRoleCount;

  const nonAdminUsers = await prisma.user.findMany({
    where: { id: { notIn: preservedUserIds } },
    select: { id: true, fullName: true, email: true },
  });
  for (const user of nonAdminUsers) {
    console.log(`       - ${user.fullName} (${user.email})`);
  }
  totalDeleted += await del(
    'User (non-admin)',
    prisma.user.deleteMany({ where: { id: { notIn: preservedUserIds } } }),
  );

  // ═════════════════════════════════════════════════════════════════════
  // Step 3: Verify preserved data
  // ═════════════════════════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('✅ Step 3: Verifying preserved data...\n');

  console.log(`  Users:              ${await prisma.user.count()} (admin accounts only)`);
  console.log(`  Roles:              ${await prisma.role.count()}`);
  console.log(`  Permissions:        ${await prisma.permission.count()}`);
  console.log(`  Departments:        ${await prisma.department.count()}`);
  console.log(`  Projects:           ${await prisma.project.count()}`);
  console.log(`  Vendors:            ${await prisma.vendor.count()}`);
  console.log(`  SKUs:               ${await prisma.sKU.count()}`);
  console.log(`  Stage Configs:      ${await prisma.stageConfiguration.count()}`);

  console.log(`\n  Procurement:        ${await prisma.procurement.count()} (should be 0)`);
  console.log(`  RFQs:               ${await prisma.rFQ.count()} (should be 0)`);
  console.log(`  Gate Entries:       ${await prisma.gateEntry.count()} (should be 0)`);
  console.log(`  Notifications:      ${await prisma.notification.count()} (should be 0)`);
  console.log(`  Audit Logs:         ${await prisma.auditLog.count()} (should be 0)`);

  // ── Summary ─────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('📊 Cleanup Summary');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Total records deleted:  ${totalDeleted}`);
  console.log(`  Time elapsed:           ${elapsed}s`);
  console.log(`  Status:                 ✅ COMPLETE`);
  console.log('══════════════════════════════════════════════════════════\n');
}

cleanup()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });