import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetProcurementData() {
  console.log('Starting procurement data reset...');
  
  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      console.log('Deleting procurement-related data...');
      
      // First, delete child records in reverse dependency order
      // This follows the Prisma schema relationships
      
      // 1. Delete escalation logs
      console.log('Deleting escalation logs...');
      await tx.escalationLog.deleteMany({});
      
      // 2. Delete reminder logs
      console.log('Deleting reminder logs...');
      await tx.reminderLog.deleteMany({});
      
      // 3. Delete delay logs
      console.log('Deleting delay logs...');
      await tx.delayLog.deleteMany({});
      
      // 4. Delete SLA records
      console.log('Deleting SLA records...');
      await tx.slaRecord.deleteMany({});
      
      // 5. Delete rejection emails
      console.log('Deleting rejection emails...');
      await tx.rejectionEmail.deleteMany({});
      
      // 6. Delete email logs
      console.log('Deleting email logs...');
      await tx.emailLog.deleteMany({});
      
      // 7. Delete notifications related to procurement
      console.log('Deleting procurement notifications...');
      await tx.notification.deleteMany({
        where: {
          OR: [
            { procurementId: { not: null } },
            { type: { contains: 'PROCUREMENT' } },
          ],
        },
      });
      
      // 8. Delete RFQ-related records
      console.log('Deleting RFQ attachments...');
      await tx.rFQAttachment.deleteMany({});
      
      console.log('Deleting RFQ remarks...');
      await tx.rFQRemark.deleteMany({});
      
      console.log('Deleting RFQ history...');
      await tx.rFQHistory.deleteMany({});
      
      console.log('Deleting RFQ vendors...');
      await tx.rFQVendor.deleteMany({});
      
      console.log('Deleting RFQ items...');
      await tx.rFQItem.deleteMany({});
      
      console.log('Deleting RFQs...');
      await tx.rFQ.deleteMany({});
      
      // 9. Delete procurement workflow records
      console.log('Deleting procurement stages...');
      await tx.procurementStage.deleteMany({});
      
      console.log('Deleting procurement remarks...');
      await tx.procurementRemark.deleteMany({});
      
      console.log('Deleting procurement history...');
      await tx.procurementHistory.deleteMany({});
      
      console.log('Deleting procurement attachments...');
      await tx.procurementAttachment.deleteMany({});
      
      console.log('Deleting procurement items...');
      await tx.procurementItem.deleteMany({});
      
      // 10. Delete gate entries and related records
      console.log('Deleting gate entry items...');
      await tx.gateEntryItem.deleteMany({});
      
      console.log('Deleting gate entries...');
      await tx.gateEntry.deleteMany({});
      
      // 11. Delete GRNs
      console.log('Deleting GRNs...');
      await tx.gRN.deleteMany({});
      
      // 12. Finally, delete all procurements
      console.log('Deleting all procurements...');
      await tx.procurement.deleteMany({});
      
      // 13. Optionally reset stage configurations to defaults (optional)
      console.log('Resetting stage configurations...');
      await tx.stageConfiguration.updateMany({
        data: {
          tatHours: null,
          isDynamicOwner: false,
          escalateToRole: null,
          escalationL1DelayHours: 0,
          escalationL2DelayHours: 4,
          escalationL3DelayHours: 8,
          isGloballyVisible: false,
        },
      });
      
      console.log('✅ Procurement data reset completed successfully!');
    });
    
    // Count remaining records to verify reset
    const remainingCounts = await Promise.all([
      prisma.procurement.count(),
      prisma.procurementItem.count(),
      prisma.procurementStage.count(),
      prisma.procurementHistory.count(),
      prisma.procurementRemark.count(),
      prisma.procurementAttachment.count(),
      prisma.emailLog.count(),
      prisma.rejectionEmail.count(),
      prisma.slaRecord.count(),
      prisma.delayLog.count(),
      prisma.reminderLog.count(),
      prisma.escalationLog.count(),
      prisma.rFQ.count(),
    ]);
    
    console.log('\n📊 Verification counts:');
    console.log('Procurements:', remainingCounts[0]);
    console.log('Procurement Items:', remainingCounts[1]);
    console.log('Procurement Stages:', remainingCounts[2]);
    console.log('Procurement History:', remainingCounts[3]);
    console.log('Procurement Remarks:', remainingCounts[4]);
    console.log('Procurement Attachments:', remainingCounts[5]);
    console.log('Email Logs:', remainingCounts[6]);
    console.log('Rejection Emails:', remainingCounts[7]);
    console.log('SLA Records:', remainingCounts[8]);
    console.log('Delay Logs:', remainingCounts[9]);
    console.log('Reminder Logs:', remainingCounts[10]);
    console.log('Escalation Logs:', remainingCounts[11]);
    console.log('RFQs:', remainingCounts[12]);
    
    // Verify users are NOT deleted
    const userCount = await prisma.user.count();
    console.log('\n👤 Users preserved:', userCount);
    
    // Verify other modules are NOT affected
    const otherCounts = await Promise.all([
      prisma.department.count(),
      prisma.vendor.count(),
      prisma.sKU.count(),
      prisma.project.count(),
      prisma.role.count(),
      prisma.permission.count(),
    ]);
    
    console.log('\n✅ Other modules preserved:');
    console.log('Departments:', otherCounts[0]);
    console.log('Vendors:', otherCounts[1]);
    console.log('SKUs:', otherCounts[2]);
    console.log('Projects:', otherCounts[3]);
    console.log('Roles:', otherCounts[4]);
    console.log('Permissions:', otherCounts[5]);
    
  } catch (error) {
    console.error('❌ Error resetting procurement data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  resetProcurementData()
    .then(() => {
      console.log('✅ Script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { resetProcurementData };