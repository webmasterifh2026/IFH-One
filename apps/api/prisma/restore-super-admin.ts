/**
 * Restore Super Admin User
 * ========================
 * Creates the Super Admin user with full RBAC permissions
 * 
 * Usage: npx ts-node prisma/restore-super-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('👤 Restoring Super Admin user...\n');

  try {
    // Check if Super Admin already exists
    const existing = await prisma.user.findUnique({
      where: { email: 'admin@if-himenviro.in' },
      include: { userRoles: true }
    });

    if (existing) {
      console.log('✅ Super Admin already exists!');
      console.log(`   Email: ${existing.email}`);
      console.log(`   Name: ${existing.fullName}`);
      console.log(`   Status: ${existing.status}`);
      console.log(`   Roles: ${existing.userRoles.length}`);
      return;
    }

    // Get or create SUPER_ADMIN role
    const superAdminRole = await prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { 
        name: 'SUPER_ADMIN', 
        description: 'Super Administrator with full access' 
      },
    });

    // Get or create ADMIN role
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { 
        name: 'ADMIN', 
        description: 'Admin with operational access' 
      },
    });

    // Get all permissions
    const permissions = await prisma.permission.findMany();
    console.log(`📋 Found ${permissions.length} permissions`);

    // Assign all permissions to SUPER_ADMIN and ADMIN roles
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: { 
          roleId_permissionId: { 
            roleId: superAdminRole.id, 
            permissionId: perm.id 
          } 
        },
        update: {},
        create: { 
          roleId: superAdminRole.id, 
          permissionId: perm.id 
        },
      });

      await prisma.rolePermission.upsert({
        where: { 
          roleId_permissionId: { 
            roleId: adminRole.id, 
            permissionId: perm.id 
          } 
        },
        update: {},
        create: { 
          roleId: adminRole.id, 
          permissionId: perm.id 
        },
      });
    }
    console.log(`✅ Assigned all permissions to SUPER_ADMIN and ADMIN roles`);

    // Create Super Admin user
    const passwordHash = await bcrypt.hash('admin@1234', 10);
    const superAdmin = await prisma.user.create({
      data: {
        employeeId: 'EMP-001',
        fullName: 'Super Admin',
        email: 'admin@if-himenviro.in',
        status: 'ACTIVE',
        passwordHash: passwordHash,
      },
    });

    // Assign SUPER_ADMIN role to user
    await prisma.userRole.create({
      data: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      },
    });

    console.log('\n✅ Super Admin user created successfully!');
    console.log('📊 Details:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: admin@1234`);
    console.log(`   Name: ${superAdmin.fullName}`);
    console.log(`   Employee ID: ${superAdmin.employeeId}`);
    console.log(`   Status: ${superAdmin.status}`);
    console.log(`   Role: SUPER_ADMIN`);

    // Verify
    const verify = await prisma.user.findUnique({
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

    if (verify) {
      console.log('\n🔍 Verification:');
      console.log(`  ✅ User exists: ${verify.fullName}`);
      console.log(`  ✅ Email: ${verify.email}`);
      console.log(`  ✅ Status: ${verify.status}`);
      console.log(`  ✅ Roles: ${verify.userRoles.length}`);
      console.log(`  ✅ Permissions: ${verify.userRoles[0]?.role?.rolePermissions?.length || 0}`);
    }

    console.log('\n✨ Super Admin restoration complete!');
    console.log('🔐 Login credentials:');
    console.log('   Email: admin@if-himenviro.in');
    console.log('   Password: admin@1234');

  } catch (error) {
    console.error('\n❌ Error restoring Super Admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();