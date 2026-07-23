/**
 * Reset Procurement Module Database
 * ===================================
 * Deletes ALL procurement-related records while preserving:
 * - Users, Roles, Permissions, Auth, Sessions
 * - Vendors, Projects, Departments
 * - SKUs, Shopping Cart
 * - Gate Entry, GRN
 *
 * Usage: npx ts-node prisma/reset-procurement.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Resetting Procurement module database...');
  console.log('');

  // Delete in reverse dependency order to avoid FK constraint violations
  const deletions: { name: string; model: any }[] = [
    { name: 'BulkOperation', model: prisma.bulkOperation },
    { name: 'AuditLog', model: prisma.auditLog },
    { name: 'ProcurementHistory', model: prisma.procurementHistory },
    { name: 'ProcurementRemark', model: prisma.procurementRemark },
    { name: 'ProcurementAttachment', model: prisma.procurementAttachment },
    { name: 'EmailLog', model: prisma.emailLog },
    { name: 'RejectionEmail', model: prisma.rejectionEmail },
    { name: 'Notification', model: prisma.notification },
    { name: 'ReminderLog', model: prisma.reminderLog },
    { name: 'EscalationLog', model: prisma.escalationLog },
    { name: 'DelayLog', model: prisma.delayLog },
    { name: 'SlaRecord', model: prisma.slaRecord },
    { name: 'ProcurementStage', model: prisma.procurementStage },
    { name: 'ProcurementItem', model: prisma.procurementItem },
    { name: 'RFQHistory', model: prisma.rFQHistory },
    { name: 'RFQRemark', model: prisma.rFQRemark },
    { name: 'RFQAttachment', model: prisma.rFQAttachment },
    { name: 'RFQVendor', model: prisma.rFQVendor },
    { name: 'RFQItem', model: prisma.rFQItem },
    { name: 'RFQ', model: prisma.rFQ },
    { name: 'Procurement', model: prisma.procurement },
    { name: 'SearchAnalytics', model: prisma.searchAnalytics },
    { name: 'RecentlyViewedItem', model: prisma.recentlyViewedItem },
  ];

  for (const { name, model } of deletions) {
    try {
      const count = await model.deleteMany({});
      console.log(`  ✅ ${name}: ${count.count ?? count} record(s) deleted`);
    } catch (err: any) {
      console.log(`  ⚠️  ${name}: Error - ${err.message}`);
    }
  }

  console.log('');
  console.log('✨ Procurement module database reset complete!');
  console.log(
    '📊 All procurement indents, workflows, history, SLA, and notifications have been cleared.',
  );
  console.log(
    '📊 Users, roles, vendors, projects, SKUs, departments remain intact.',
  );
}

main()
  .catch((e) => {
    console.error('❌ Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
