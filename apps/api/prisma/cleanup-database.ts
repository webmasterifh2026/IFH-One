/**
 * Complete Database Cleanup Script
 * =================================
 * Deletes ALL transactional and operational data while preserving:
 * - Super Admin user account (only user)
 * - Roles, Permissions (RBAC configuration)
 * - StageConfiguration (workflow configuration)
 * - SystemHealth (system configuration)
 * 
 * Deletes:
 * - All procurements, RFQs, RFQFloat, TCE, Negotiations
 * - All gate entries, GRNs
 * - All vendors, projects, SKUs, departments
 * - All logs, notifications, sessions
 * - All attachments, history, remarks
 * 
 * Usage: npx ts-node prisma/cleanup-database.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting Complete Database Cleanup...');
  console.log('⚠️  This will delete ALL transactional data except Super Admin and RBAC config\n');

  try {
    // Delete in reverse dependency order to avoid FK constraint violations
    
    // 1. RFQ Float Workflow (v2.11.0)
    console.log('📋 Cleaning RFQ Float Workflow...');
    const rfqFloatActivityLogs = await prisma.rFQFloatActivityLog.deleteMany({});
    console.log(`  ✅ RFQFloatActivityLog: ${rfqFloatActivityLogs.count} deleted`);

    const rfqFloatEmailLogs = await prisma.rFQFloatEmailLog.deleteMany({});
    console.log(`  ✅ RFQFloatEmailLog: ${rfqFloatEmailLogs.count} deleted`);

    const negotiationItems = await prisma.negotiationItem.deleteMany({});
    console.log(`  ✅ NegotiationItem: ${negotiationItems.count} deleted`);

    const negotiations = await prisma.negotiation.deleteMany({});
    console.log(`  ✅ Negotiation: ${negotiations.count} deleted`);

    const tceAttachments = await prisma.tCEAttachment.deleteMany({});
    console.log(`  ✅ TCEAttachment: ${tceAttachments.count} deleted`);

    const tceItems = await prisma.tCEItem.deleteMany({});
    console.log(`  ✅ TCEItem: ${tceItems.count} deleted`);

    const tces = await prisma.tCE.deleteMany({});
    console.log(`  ✅ TCE: ${tces.count} deleted`);

    const rfqFloatVendors = await prisma.rFQFloatVendor.deleteMany({});
    console.log(`  ✅ RFQFloatVendor: ${rfqFloatVendors.count} deleted`);

    const rfqFloatItems = await prisma.rFQFloatItem.deleteMany({});
    console.log(`  ✅ RFQFloatItem: ${rfqFloatItems.count} deleted`);

    const rfqFloats = await prisma.rFQFloat.deleteMany({});
    console.log(`  ✅ RFQFloat: ${rfqFloats.count} deleted`);

    // 2. Vendor RFQ Portal
    console.log('\n📋 Cleaning Vendor RFQ Portal...');
    const vendorQuotationAttachments = await prisma.vendorQuotationAttachment.deleteMany({});
    console.log(`  ✅ VendorQuotationAttachment: ${vendorQuotationAttachments.count} deleted`);

    const vendorQuotationLineItems = await prisma.vendorQuotationLineItem.deleteMany({});
    console.log(`  ✅ VendorQuotationLineItem: ${vendorQuotationLineItems.count} deleted`);

    const negotiationRounds = await prisma.negotiationRound.deleteMany({});
    console.log(`  ✅ NegotiationRound: ${negotiationRounds.count} deleted`);

    const vendorQuotations = await prisma.vendorQuotation.deleteMany({});
    console.log(`  ✅ VendorQuotation: ${vendorQuotations.count} deleted`);

    const vendorFormAccessLogs = await prisma.vendorFormAccessLog.deleteMany({});
    console.log(`  ✅ VendorFormAccessLog: ${vendorFormAccessLogs.count} deleted`);

    const vendorRFQForms = await prisma.vendorRFQForm.deleteMany({});
    console.log(`  ✅ VendorRFQForm: ${vendorRFQForms.count} deleted`);

    // 3. RFQ Module
    console.log('\n📋 Cleaning RFQ Module...');
    const rfqActivityLogs = await prisma.rFQActivityLog.deleteMany({});
    console.log(`  ✅ RFQActivityLog: ${rfqActivityLogs.count} deleted`);

    const rfqEmailLogs = await prisma.rFQEmailLog.deleteMany({});
    console.log(`  ✅ RFQEmailLog: ${rfqEmailLogs.count} deleted`);

    const rfqRemarks = await prisma.rFQRemark.deleteMany({});
    console.log(`  ✅ RFQRemark: ${rfqRemarks.count} deleted`);

    const rfqAttachments = await prisma.rFQAttachment.deleteMany({});
    console.log(`  ✅ RFQAttachment: ${rfqAttachments.count} deleted`);

    const rfqVendors = await prisma.rFQVendor.deleteMany({});
    console.log(`  ✅ RFQVendor: ${rfqVendors.count} deleted`);

    const rfqItems = await prisma.rFQItem.deleteMany({});
    console.log(`  ✅ RFQItem: ${rfqItems.count} deleted`);

    const rfqs = await prisma.rFQ.deleteMany({});
    console.log(`  ✅ RFQ: ${rfqs.count} deleted`);

    // 4. Procurement Module
    console.log('\n📋 Cleaning Procurement Module...');
    const procurementHistories = await prisma.procurementHistory.deleteMany({});
    console.log(`  ✅ ProcurementHistory: ${procurementHistories.count} deleted`);

    const procurementRemarks = await prisma.procurementRemark.deleteMany({});
    console.log(`  ✅ ProcurementRemark: ${procurementRemarks.count} deleted`);

    const procurementAttachments = await prisma.procurementAttachment.deleteMany({});
    console.log(`  ✅ ProcurementAttachment: ${procurementAttachments.count} deleted`);

    const emailLogs = await prisma.emailLog.deleteMany({});
    console.log(`  ✅ EmailLog: ${emailLogs.count} deleted`);

    const rejectionEmails = await prisma.rejectionEmail.deleteMany({});
    console.log(`  ✅ RejectionEmail: ${rejectionEmails.count} deleted`);

    const notifications = await prisma.notification.deleteMany({});
    console.log(`  ✅ Notification: ${notifications.count} deleted`);

    const reminderLogs = await prisma.reminderLog.deleteMany({});
    console.log(`  ✅ ReminderLog: ${reminderLogs.count} deleted`);

    const escalationLogs = await prisma.escalationLog.deleteMany({});
    console.log(`  ✅ EscalationLog: ${escalationLogs.count} deleted`);

    const delayLogs = await prisma.delayLog.deleteMany({});
    console.log(`  ✅ DelayLog: ${delayLogs.count} deleted`);

    const slaRecords = await prisma.slaRecord.deleteMany({});
    console.log(`  ✅ SlaRecord: ${slaRecords.count} deleted`);

    const procurementStages = await prisma.procurementStage.deleteMany({});
    console.log(`  ✅ ProcurementStage: ${procurementStages.count} deleted`);

    const procurementItems = await prisma.procurementItem.deleteMany({});
    console.log(`  ✅ ProcurementItem: ${procurementItems.count} deleted`);

    const procurements = await prisma.procurement.deleteMany({});
    console.log(`  ✅ Procurement: ${procurements.count} deleted`);

    // 5. Gate Entry & GRN
    console.log('\n📋 Cleaning Gate Entry & GRN...');
    const grns = await prisma.gRN.deleteMany({});
    console.log(`  ✅ GRN: ${grns.count} deleted`);

    const gateEntryItems = await prisma.gateEntryItem.deleteMany({});
    console.log(`  ✅ GateEntryItem: ${gateEntryItems.count} deleted`);

    const gateEntries = await prisma.gateEntry.deleteMany({});
    console.log(`  ✅ GateEntry: ${gateEntries.count} deleted`);

    // 6. Master Data (as per requirements)
    console.log('\n📋 Cleaning Master Data...');
    const vendors = await prisma.vendor.deleteMany({});
    console.log(`  ✅ Vendor: ${vendors.count} deleted`);

    const projects = await prisma.project.deleteMany({});
    console.log(`  ✅ Project: ${projects.count} deleted`);

    const skus = await prisma.sKU.deleteMany({});
    console.log(`  ✅ SKU: ${skus.count} deleted`);

    const departments = await prisma.department.deleteMany({});
    console.log(`  ✅ Department: ${departments.count} deleted`);

    // 7. User-related data (except Super Admin)
    console.log('\n📋 Cleaning User-related Data...');
    const searchAnalytics = await prisma.searchAnalytics.deleteMany({});
    console.log(`  ✅ SearchAnalytics: ${searchAnalytics.count} deleted`);

    const recentlyViewedItems = await prisma.recentlyViewedItem.deleteMany({});
    console.log(`  ✅ RecentlyViewedItem: ${recentlyViewedItems.count} deleted`);

    const importHistories = await prisma.importHistory.deleteMany({});
    console.log(`  ✅ ImportHistory: ${importHistories.count} deleted`);

    const bulkOperations = await prisma.bulkOperation.deleteMany({});
    console.log(`  ✅ BulkOperation: ${bulkOperations.count} deleted`);

    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`  ✅ AuditLog: ${auditLogs.count} deleted`);

    const sessions = await prisma.session.deleteMany({});
    console.log(`  ✅ Session: ${sessions.count} deleted`);

    const passwordResetTokens = await prisma.passwordResetToken.deleteMany({});
    console.log(`  ✅ PasswordResetToken: ${passwordResetTokens.count} deleted`);

    // 8. Delete all users except Super Admin
    console.log('\n📋 Cleaning Users (keeping Super Admin)...');
    
    // First, delete all user roles for non-super-admin users
    const userRoles = await prisma.userRole.deleteMany({
      where: {
        user: {
          email: {
            not: 'admin@if-himenviro.in'
          }
        }
      }
    });
    console.log(`  ✅ UserRole: ${userRoles.count} deleted`);

    // Delete all users except Super Admin
    const users = await prisma.user.deleteMany({
      where: {
        email: {
          not: 'admin@if-himenviro.in'
        }
      }
    });
    console.log(`  ✅ User: ${users.count} deleted (Super Admin preserved)`);

    // 9. Reset sequences (for PostgreSQL)
    console.log('\n🔄 Resetting Sequences...');
    await resetSequences();
    console.log('  ✅ Sequences reset complete');

    // 10. Verification
    console.log('\n🔍 Verification...');
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@if-himenviro.in' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (superAdmin) {
      console.log(`  ✅ Super Admin found: ${superAdmin.fullName} (${superAdmin.email})`);
      console.log(`  ✅ User Roles: ${superAdmin.userRoles.length}`);
      console.log(`  ✅ Status: ${superAdmin.status}`);
    } else {
      console.log('  ❌ Super Admin NOT found!');
    }

    const roleCount = await prisma.role.count();
    const permissionCount = await prisma.permission.count();
    const stageConfigCount = await prisma.stageConfiguration.count();
    
    console.log(`  ✅ Roles: ${roleCount}`);
    console.log(`  ✅ Permissions: ${permissionCount}`);
    console.log(`  ✅ Stage Configurations: ${stageConfigCount}`);

    // Verify all transactional tables are empty
    console.log('\n🔍 Verifying Transactional Tables are Empty...');
    const procurementCount = await prisma.procurement.count();
    const rfqCount = await prisma.rFQ.count();
    const rfqFloatCount = await prisma.rFQFloat.count();
    const vendorCount = await prisma.vendor.count();
    const projectCount = await prisma.project.count();
    const skuCount = await prisma.sKU.count();
    const gateEntryCount = await prisma.gateEntry.count();
    const grnCount = await prisma.gRN.count();
    const notificationCount = await prisma.notification.count();
    const auditLogCount = await prisma.auditLog.count();

    console.log(`  ✅ Procurement: ${procurementCount} (should be 0)`);
    console.log(`  ✅ RFQ: ${rfqCount} (should be 0)`);
    console.log(`  ✅ RFQFloat: ${rfqFloatCount} (should be 0)`);
    console.log(`  ✅ Vendor: ${vendorCount} (should be 0)`);
    console.log(`  ✅ Project: ${projectCount} (should be 0)`);
    console.log(`  ✅ SKU: ${skuCount} (should be 0)`);
    console.log(`  ✅ GateEntry: ${gateEntryCount} (should be 0)`);
    console.log(`  ✅ GRN: ${grnCount} (should be 0)`);
    console.log(`  ✅ Notification: ${notificationCount} (should be 0)`);
    console.log(`  ✅ AuditLog: ${auditLogCount} (should be 0)`);

    console.log('\n✨ Database cleanup completed successfully!');
    console.log('📊 Summary:');
    console.log('   - All transactional data deleted');
    console.log('   - Super Admin account preserved');
    console.log('   - RBAC configuration preserved');
    console.log('   - Database ready for fresh testing');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function resetSequences() {
  // Reset sequences for tables with serial/uuid columns
  // Note: UUIDs don't need sequence reset, but if there are any serial columns, reset them here
  
  const sequences = [
    'procurement_reference_no_seq',
    'rfq_rfq_number_seq',
    'rfqfloat_rfq_number_seq',
    'gateentry_entry_number_seq',
    'grn_grn_number_seq',
  ];

  for (const seq of sequences) {
    try {
      await prisma.$executeRawUnsafe(`ALTER SEQUENCE IF EXISTS ${seq} RESTART WITH 1`);
    } catch (error) {
      // Sequence might not exist, that's okay
    }
  }
}

main();