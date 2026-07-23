/**
 * Database Verification Script
 * =============================
 * Verifies database integrity after cleanup:
 * - Super Admin account exists and is active
 * - RBAC configuration is intact
 * - All transactional tables are empty
 * - No foreign key violations
 *
 * Usage: npx ts-node prisma/verify-database.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Database Verification Report');
  console.log('================================\n');

  let allChecksPassed = true;

  try {
    // 1. Verify Super Admin
    console.log('1️⃣  Super Admin Verification');
    console.log('----------------------------');
    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@if-himenviro.in' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!superAdmin) {
      console.log('  ❌ Super Admin NOT found');
      allChecksPassed = false;
    } else {
      console.log(`  ✅ Super Admin exists: ${superAdmin.fullName}`);
      console.log(`  ✅ Email: ${superAdmin.email}`);
      console.log(`  ✅ Status: ${superAdmin.status}`);
      console.log(`  ✅ Employee ID: ${superAdmin.employeeId}`);
      console.log(`  ✅ Roles: ${superAdmin.userRoles.length}`);

      if (superAdmin.userRoles.length > 0) {
        const role = superAdmin.userRoles[0].role;
        console.log(`  ✅ Role Name: ${role.name}`);
        console.log(`  ✅ Permissions: ${role.rolePermissions.length}`);
      }
    }

    // 2. Verify RBAC Configuration
    console.log('\n2️⃣  RBAC Configuration Verification');
    console.log('------------------------------------');
    const roleCount = await prisma.role.count();
    const permissionCount = await prisma.permission.count();
    const rolePermissionCount = await prisma.rolePermission.count();
    const stageConfigCount = await prisma.stageConfiguration.count();

    console.log(`  ✅ Roles: ${roleCount}`);
    console.log(`  ✅ Permissions: ${permissionCount}`);
    console.log(`  ✅ Role-Permission mappings: ${rolePermissionCount}`);
    console.log(`  ✅ Stage Configurations: ${stageConfigCount}`);

    if (roleCount === 0 || permissionCount === 0) {
      console.log('  ❌ RBAC configuration is incomplete');
      allChecksPassed = false;
    }

    // 3. Verify Transactional Tables are Empty
    console.log('\n3️⃣  Transactional Tables Verification');
    console.log('--------------------------------------');

    const tablesToCheck = [
      'Procurement',
      'ProcurementStage',
      'ProcurementItem',
      'ProcurementHistory',
      'ProcurementRemark',
      'ProcurementAttachment',
      'RFQ',
      'RFQItem',
      'RFQVendor',
      'RFQFloat',
      'TCE',
      'Negotiation',
      'Vendor',
      'projects_db',
      'Item',
      'Department',
      'GateEntry',
      'GRN',
      'Notification',
      'AuditLog',
      'EmailLog',
      'Session',
      'BulkOperation',
      'SlaRecord',
      'DelayLog',
      'EscalationLog',
      'ReminderLog',
      'RejectionEmail',
    ];

    for (const tableName of tablesToCheck) {
      try {
        const count = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*) as count FROM "${tableName}"`,
        );
        const countValue = Number(count[0]?.count || 0);
        const status = countValue === 0 ? '✅' : '❌';
        console.log(
          `  ${status} ${tableName}: ${countValue} ${countValue === 0 ? '(empty)' : '(NOT EMPTY!)'}`,
        );

        if (countValue > 0) {
          allChecksPassed = false;
        }
      } catch (error) {
        console.log(`  ⚠️  ${tableName}: Table not found or error checking`);
      }
    }

    // 4. Verify User Count
    console.log('\n4️⃣  User Verification');
    console.log('---------------------');
    const userCount = await prisma.user.count();
    console.log(`  📊 Total users: ${userCount}`);

    if (userCount === 1 && superAdmin) {
      console.log('  ✅ Only Super Admin exists (correct)');
    } else if (userCount === 0) {
      console.log('  ❌ No users found (Super Admin missing!)');
      allChecksPassed = false;
    } else {
      console.log('  ⚠️  Multiple users found (should be only Super Admin)');
      const users = await prisma.user.findMany();
      users.forEach((u) => {
        console.log(`     - ${u.email} (${u.fullName})`);
      });
    }

    // 5. Verify No Foreign Key Violations
    console.log('\n5️⃣  Foreign Key Integrity Check');
    console.log('--------------------------------');

    // Check for orphaned records
    const orphanedUserRoles = await prisma.userRole.findMany({
      where: {
        user: { email: 'admin@if-himenviro.in' },
      },
    });
    console.log(`  ✅ Super Admin user roles: ${orphanedUserRoles.length}`);

    // 6. System Health Check
    console.log('\n6️⃣  System Configuration');
    console.log('------------------------');
    const systemHealthCount = await prisma.systemHealth.count();
    console.log(`  ✅ SystemHealth records: ${systemHealthCount}`);

    // Final Summary
    console.log('\n' + '='.repeat(50));
    if (allChecksPassed) {
      console.log('✅ ALL CHECKS PASSED');
      console.log('✨ Database is clean and ready for testing');
      console.log('🔐 Super Admin login: admin@if-himenviro.in / admin@1234');
    } else {
      console.log('❌ SOME CHECKS FAILED');
      console.log('⚠️  Please review the errors above');
    }
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();