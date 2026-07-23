import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding IFH One database...');

  // ── Permissions ────────────────────────────────────────────────────────────
  const modules = [
    { name: 'User Management', keys: ['user.create', 'user.view', 'user.edit', 'user.reset-password', 'user.activate', 'user.deactivate'] },
    { name: 'Role Management', keys: ['role.create', 'role.view', 'role.edit', 'role.assign'] },
    { name: 'Indents', keys: ['indent.create', 'indent.view', 'indent.edit', 'indent.delete', 'indent.verify'] },
    { name: 'Inventory', keys: ['inventory.check', 'inventory.view', 'inventory.update'] },
    { name: 'Vendors', keys: ['vendor.create', 'vendor.view', 'vendor.edit'] },
    { name: 'RFQs', keys: ['rfq.create', 'rfq.view', 'rfq.edit'] },
    { name: 'Purchase Orders', keys: ['po.create', 'po.view', 'po.edit', 'po.approve'] },
    { name: 'Billing', keys: ['bill.create', 'bill.view', 'bill.edit', 'bill.approve'] },
    { name: 'Reports', keys: ['report.view', 'report.export'] },
    { name: 'Settings', keys: ['settings.view', 'settings.edit'] },
    { name: 'Audit Logs', keys: ['audit.view'] },
  ];

  const permissions: { id: string; key: string }[] = [];
  for (const mod of modules) {
    for (const key of mod.keys) {
      const perm = await prisma.permission.upsert({
        where: { key },
        update: { module: mod.name },
        create: { key, module: mod.name, description: `Access to ${key}` },
      });
      permissions.push(perm);
    }
  }

  // ── Roles ──────────────────────────────────────────────────────────────────
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: { name: 'SUPER_ADMIN', description: 'Super Administrator with full access' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Admin with operational access' },
  });

  const doerRole = await prisma.role.upsert({
    where: { name: 'DOER' },
    update: {},
    create: { name: 'DOER', description: 'Workflow doer with assigned stage access' },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: 'VIEWER' },
    update: {},
    create: { name: 'VIEWER', description: 'Read-only viewer' },
  });

  // Super Admin & Admin get all permissions
  for (const p of permissions) {
    for (const role of [superAdminRole, adminRole]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      });
    }
  }

  // Doer gets view perms only
  const doerPerms = permissions.filter(p => p.key.includes('.view') && !p.key.includes('settings') && !p.key.includes('role') && !p.key.includes('audit'));
  for (const p of doerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: doerRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: doerRole.id, permissionId: p.id },
    });
  }

  // Viewer gets indent.view, po.view, report.view
  const viewerPerms = permissions.filter(p => ['indent.view', 'po.view', 'report.view'].includes(p.key));
  for (const p of viewerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: viewerRole.id, permissionId: p.id },
    });
  }

  console.log('Roles and permissions seeded.');

  // ── Users ──────────────────────────────────────────────────────────────────
  // roleMap: key from CSV -> role record
  const roleMap: Record<string, typeof superAdminRole> = {
    'Super Admin': superAdminRole,
    'Admin': adminRole,
    'Doer': doerRole,
    'Viewer': viewerRole,
    '': viewerRole, // default
  };

  const users: { emp: string; name: string; email: string; password: string; role: string }[] = [
    { emp: 'EMP-001', name: 'Super Admin',                    email: 'admin@if-himenviro.in',                         password: 'admin@1234',     role: 'Super Admin' },
    { emp: 'EMP-002', name: 'Roshni Singh',                   email: 'roshni.singh@if-himenviro.in',                  password: 'rs@2026',        role: 'Doer' },
    { emp: 'EMP-003', name: 'Mansi Garg',                     email: 'mansi.garg@if-himenviro.in',                    password: 'Mansi Garg@2026',role: 'Admin' },
    { emp: 'EMP-004', name: 'Rohan Garg',                     email: 'rohan.garg@intensiv-filter-himenviro.com',      password: 'rg@2026',        role: '' },
    { emp: 'EMP-005', name: 'Ankur Gupta',                    email: 'ankur.gupta@if-himenviro.in',                   password: 'ag@2026',        role: '' },
    { emp: 'EMP-006', name: 'Pratap Kumar Sahu',              email: 'pratap.sahu@intensiv-filter-himenviro.com',     password: 'ps@2026',        role: '' },
    { emp: 'EMP-007', name: 'Shivani Chandra',                email: 'shivani.chandra@intensiv-filter-himenviro.com', password: 'sc@2026',        role: '' },
    { emp: 'EMP-008', name: 'Pramod Kumar',                   email: 'pramod.kumar@if-himenviro.in',                  password: 'pk@2026',        role: 'Doer' },
    { emp: 'EMP-009', name: 'Sudhir',                         email: 'sudhir@if-himenviro.in',                        password: 'sb@2026',        role: '' },
    { emp: 'EMP-010', name: 'Md. Aftab Moin',                 email: 'aftab.moin@if-himenviro.in',                    password: 'am@2026',        role: '' },
    { emp: 'EMP-011', name: 'Virender Pal Singh',             email: 'virender.singh@if-himenviro.in',                password: 'vs@2026',        role: '' },
    { emp: 'EMP-012', name: 'Neeraj Dalal',                   email: 'neeraj@if-himenviro.in',                        password: 'nd@2026',        role: 'Doer' },
    { emp: 'EMP-013', name: 'Md.Tourej Alam',                 email: 'tourej.alam@if-himenviro.in',                   password: 'ta@2026',        role: '' },
    { emp: 'EMP-014', name: 'Atul Tyagi',                     email: 'a.tyagi@if-himenviro.in',                       password: 'at@2026',        role: 'Doer' },
    { emp: 'EMP-015', name: 'Dinesh Gujral',                  email: 'accountsglobal@intensiv-filter-himenviro.com',  password: 'dg@2026',        role: '' },
    { emp: 'EMP-016', name: 'Bhaskar Bhatt',                  email: 'bhaskar.bhatt@if-himenviro.in',                 password: 'bb@2026',        role: 'Doer' },
    { emp: 'EMP-017', name: 'Mohammad Shoaib Rabbani',        email: 'shoaib.rabbani@if-himenviro.in',                password: 'sr@2026',        role: '' },
    { emp: 'EMP-018', name: 'Vipin Joshi',                    email: 'vipin.joshi@if-himenviro.in',                   password: 'vj@2026',        role: 'Doer' },
    { emp: 'EMP-019', name: 'Upendra Kumar Tripathi',         email: 'upendra.tripathi@if-himenviro.in',              password: 'ut@2026',        role: '' },
    { emp: 'EMP-020', name: 'Abhishek Kumar Jha',             email: 'abhishek.jha@if-himenviro.in',                  password: 'aj@2026',        role: '' },
    { emp: 'EMP-021', name: 'Shiv Dayal Sharma',              email: 'storenoida@if-himenviro.in',                    password: 'sn@2026',        role: '' },
    { emp: 'EMP-022', name: 'Sanjay Singh',                   email: 'sanjay.singh@if-himenviro.in',                  password: 'ss@2026',        role: 'Doer' },
    { emp: 'EMP-023', name: 'Saurabh',                        email: 'quality@if-himenviro.in',                       password: 'ss@2026',        role: '' },
    { emp: 'EMP-024', name: 'Raghvendra Kumar',               email: 'raghvendra.kumar@if-himenviro.in',              password: 'rk@2026',        role: '' },
    { emp: 'EMP-025', name: 'Prasanna Muralidhar Habbu',      email: 'prasanna.habbu@if-himenviro.in',                password: 'ph@2026',        role: '' },
    { emp: 'EMP-026', name: 'Yogesh Bhagwat Suryawanshi',     email: 'yogesh.suryawanshi@intensiv-filter-himenviro.com', password: 'ys@2026',   role: '' },
    { emp: 'EMP-027', name: 'Jayant Babasaheb Patil',         email: 'jayant.patil@intensiv-filter-himenviro.com',   password: 'jp@2026',        role: '' },
    { emp: 'EMP-028', name: 'Atin Subhash Nagane',            email: 'atin.nagane@if-himenviro.in',                   password: 'an@2026',        role: '' },
    { emp: 'EMP-029', name: 'Santosh Narayan Madane',         email: 'santosh.madane@if-himenviro.in',                password: 'sm@2026',        role: '' },
    { emp: 'EMP-030', name: 'Rabindra Nath Datta',            email: 'r.n.datta@if-himenviro.in',                     password: 'rd@2026',        role: '' },
    { emp: 'EMP-031', name: 'Debananda Panda',                email: 'd.panda@if-himenviro.in',                       password: 'dp@2026',        role: '' },
    { emp: 'EMP-032', name: 'Samir Saha',                     email: 'samir.saha@if-himenviro.in',                    password: 'ss@2026',        role: '' },
    { emp: 'EMP-033', name: 'Animesh Banerjee',               email: 'animesh.banerjee@if-himenviro.in',              password: 'ab@2026',        role: '' },
    { emp: 'EMP-034', name: 'Amit Ranjan Bhattacharjee',      email: 'amit.bhattacharjee@if-himenviro.in',            password: 'ab@2026',        role: '' },
    { emp: 'EMP-035', name: 'Sudipta Seal',                   email: 'sudipta.seal@if-himenviro.in',                  password: 'ss@2026',        role: '' },
    { emp: 'EMP-036', name: 'Kolkata Office',                 email: 'kolkataoffice@if-himenviro.in',                 password: 'ko@2026',        role: '' },
    { emp: 'EMP-037', name: 'Santanu Sinha',                  email: 'santanu.sinha@if-himenviro.in',                 password: 'ss@2026',        role: '' },
    { emp: 'EMP-038', name: 'Sanket Atre',                    email: 'sanket.atre@intensiv-filter-himenviro.com',     password: 'sa@2026',        role: '' },
    { emp: 'EMP-039', name: 'Diane Ford',                     email: 'diane.ford@intensiv-filter-himenviro.com',      password: 'df@2026',        role: '' },
    { emp: 'EMP-040', name: 'VIDHAN SHARMA',                  email: 'vidhan.sharma@intensiv-filter-himenviro.com',  password: 'vs@2026',        role: '' },
    { emp: 'EMP-041', name: 'Sujit Kumar Thakur',             email: 'sujit.thakur@if-himenviro.in',                  password: 'skt@2026',       role: '' },
    { emp: 'EMP-042', name: 'Neha Mishra',                    email: 'neha.gupta@if-himenviro.in',                    password: 'ng@2026',        role: '' },
    { emp: 'EMP-043', name: 'Arghya Mukherjee',               email: 'arghya.mukherjee@if-himenviro.in',             password: 'am@2026',        role: '' },
    { emp: 'EMP-044', name: 'Shweta Singh',                   email: 'shweta.singh@if-himenviro.in',                  password: 'ss@2026',        role: '' },
    { emp: 'EMP-045', name: 'Sandip Kumar',                   email: 'sk.rathore@if-himenviro.in',                    password: 'sr@2026',        role: '' },
    { emp: 'EMP-046', name: 'Neelam Kesharwani',              email: 'Neelam@if-himenviro.in',                        password: 'nk@2026',        role: '' },
    { emp: 'EMP-047', name: 'Kishan Gond',                    email: 'kishan.gond@if-himenviro.in',                   password: 'kg@2026',        role: '' },
    { emp: 'EMP-048', name: 'MOHAMMAD AZAD',                  email: 'm.azad@if-himenviro.in',                        password: 'a@2026',         role: '' },
    { emp: 'EMP-049', name: 'Evgeniia Badrutdinova',          email: 'evgeniia@intensiv-filter-himenviro.com',        password: 'eb@2026',        role: '' },
    { emp: 'EMP-050', name: 'Sonal Garg',                     email: 'sonal.garg@intensiv-filter-himenviro.com',      password: 'sg@2026',        role: '' },
    { emp: 'EMP-051', name: 'Tanya Bansal',                   email: 'tanya.bansal@if-himenviro.in',                  password: 'tb@2026',        role: '' },
    { emp: 'EMP-052', name: 'Gaurav Awana',                   email: 'gaurav.awana@if-himenviro.in',                  password: 'ga@2026',        role: 'Doer' },
    { emp: 'EMP-053', name: 'Ranjan Saha',                    email: 'ranjan.saha@if-himenviro.in',                   password: 'rs@2026',        role: '' },
    { emp: 'EMP-054', name: 'Manish Mittal',                  email: 'manish.mittal@if-himenviro.in',                 password: 'mm@2026',        role: '' },
    { emp: 'EMP-055', name: 'Shubham Gautam',                 email: 'shubham.gautam@if-himenviro.in',                password: 'sg@2026',        role: '' },
    { emp: 'EMP-056', name: 'Raj Binayak Dobriyal',           email: 'raj.binayak@if-himenviro.in',                   password: 'rb@2026',        role: '' },
    { emp: 'EMP-057', name: 'Jyoti Sharma',                   email: 'jyoti.sharma@if-himenviro.in',                  password: 'js@2026',        role: '' },
    { emp: 'EMP-058', name: 'Mahima Yadav',                   email: 'mahima.yadav@if-himenviro.in',                  password: 'my@2026',        role: '' },
    { emp: 'EMP-059', name: 'Parikshit Sharma',               email: 'projects.fr@intensiv-filter-himenviro.com',     password: 'ps@2026',        role: '' },
    { emp: 'EMP-060', name: 'Jayesh Kumar',                   email: 'jayesh.kumar@if-himenviro.in',                  password: 'jk@2026',        role: '' },
    { emp: 'EMP-061', name: 'Purti Tripathi',                 email: 'purti.tripathi@if-himenviro.in',                password: 'pt@2026',        role: '' },
    { emp: 'EMP-062', name: 'Munendra Saxena',                email: 'storenoida2@if-himenviro.in',                   password: 'sn@2026',        role: '' },
    { emp: 'EMP-063', name: 'Sachin kumar',                   email: 'sachin.kumar@if-himenviro.in',                  password: 'sk@2026',        role: '' },
    { emp: 'EMP-064', name: 'Brigitte Schacht',               email: 'brigitte.schacht@intensiv-filter-himenviro.com',password: 'bs@2026',        role: '' },
    { emp: 'EMP-065', name: 'Manoj Kumar',                    email: 'manoj.kumar@if-himenviro.in',                   password: 'mk@2026',        role: '' },
    { emp: 'EMP-066', name: 'Gaurav',                         email: 'gaurav@if-himenviro.in',                        password: 'g@2026',         role: '' },
    { emp: 'EMP-067', name: 'Shivam Namdev',                  email: 'shivam.namdev@if-himenviro.in',                 password: 'sn@2026',        role: 'Doer' },
    { emp: 'EMP-068', name: 'Sohan',                          email: 'mastermis031@gmail.com',                        password: 's@2026',         role: 'Doer' },
    { emp: 'EMP-069', name: 'Faisal Rabbani',                 email: 'faisal.rabbani@intensiv-filter-himenviro.com',  password: 'fr@2026',        role: '' },
    { emp: 'EMP-070', name: 'Julian Gerlach',                 email: 'julian.gerlach@intensiv-filter-himenviro.com',  password: 'jg@2026',        role: '' },
    { emp: 'EMP-071', name: 'Sohan',                          email: 'sohanahirvar921@gmail.com',                     password: 's@2026',         role: 'Doer' },
    { emp: 'EMP-072', name: 'Moni Verma',                     email: 'moni.verma@if-himenviro.in',                    password: 'mv@2026',        role: '' },
    { emp: 'EMP-073', name: 'Puja Singh',                     email: 'puja.singh@if-himenviro.in',                    password: 'ps@2026',        role: '' },
    { emp: 'EMP-074', name: 'Shubham Singh',                  email: 'shubham.singh@if-himenviro.in',                 password: 'ss@2026',        role: '' },
    { emp: 'EMP-075', name: 'V Dipesh Jain',                  email: 'dipesh.jain@if-himenviro.in',                   password: 'dj@2026',        role: '' },
    { emp: 'EMP-076', name: 'Pankaj Kumar',                   email: 'pankaj.kumar@if-himenviro.in',                  password: 'pk@2026',        role: 'Doer' },
    { emp: 'EMP-077', name: 'Neetu Singh',                    email: 'neetu.singh@if-himenviro.in',                   password: 'ns@2026',        role: '' },
    { emp: 'EMP-078', name: 'Srishti Gulati',                 email: 'srishti.gulati@if-himenviro.in',                password: 'sg@2026',        role: '' },
    { emp: 'EMP-079', name: 'Aditi Srivastava',               email: 'aditi.srivastava@if-himenviro.in',              password: 'as@2026',        role: '' },
    { emp: 'EMP-080', name: 'Harsh Narayan Dwivedi',          email: 'harsh.dwivedi@if-himenviro.in',                 password: 'hd@2026',        role: '' },
    { emp: 'EMP-081', name: 'Himanshu',                       email: 'himanshu@if-himenviro.in',                      password: 'h@2026',         role: 'Doer' },
    { emp: 'EMP-082', name: 'Priyanka Pal',                   email: 'priyanka.pal@if-himenviro.in',                  password: 'pp@2026',        role: '' },
    { emp: 'EMP-083', name: 'Akshita Malhotra',               email: 'akshita.malhotra@intensiv-filter-himenviro.com',password: 'am@2026',        role: '' },
    { emp: 'EMP-084', name: 'Gaurav Kumar Seth',              email: 'gaurav.seth@if-himenviro.in',                   password: 'gs@2026',        role: 'Doer' },
    { emp: 'EMP-085', name: 'Manoj Garg',                     email: 'manoj.garg@if-himenviro.in',                    password: 'mg@2026',        role: 'Admin' },
    { emp: 'EMP-086', name: 'Rajkr Garg',                     email: 'rajkr.garg@if-himenviro.in',                    password: 'rg@2026',        role: 'Admin' },
    { emp: 'EMP-087', name: 'Anushka Kamboj',                 email: 'anushka.kamboj@if-himenviro.in',                password: 'ak@2026',        role: 'Doer' },
    { emp: 'EMP-088', name: 'Vanshika Mathur',                email: 'vanshika.mathur@if-himenviro.in',               password: 'vm@2026',        role: 'Doer' },
    { emp: 'EMP-089', name: 'kusum',                          email: 'kusum@if-himenviro.in',                         password: 'k@2026',         role: '' },
    { emp: 'EMP-090', name: 'Shweta Kapoor',                  email: 'shweta.kapoor@intensiv-filter-himenviro.com',   password: 'sk@2026',        role: 'Doer' },
    { emp: 'EMP-091', name: 'Shaurya Punj',                   email: 'shaurya.punj@if-himenviro.in',                  password: 'sp@2026',        role: '' },
    { emp: 'EMP-092', name: 'Shadav Ali',                     email: 'shadav.ali@if-himenviro.in',                    password: 'sa@2026',        role: '' },
    { emp: 'EMP-093', name: 'Process Coordinator',            email: 'pc.sr@ifhimenviro.com',                         password: 'pc@2026',        role: '' },
    { emp: 'EMP-094', name: 'Sheikh Abdullah',                email: 'Sheikh.abdullah@intensiv-filter-himenviro.com', password: 'sa@2026',        role: '' },
    { emp: 'EMP-095', name: 'Sushmita Pithauria',             email: 'sushmita.pithauria@intensiv-filter-himenviro.com', password: 'sp@2026',    role: '' },
    { emp: 'EMP-096', name: 'Atul Gupta',                     email: 'atul.gupta@intensiv-filter-himenviro.com',      password: 'AG@2026',        role: 'Admin' },
    { emp: 'EMP-097', name: 'Shivam Kumar',                   email: 'shivam.kumar@if-himenviro.in',                  password: 'sk@2026',        role: '' },
  ];

  let created = 0;
  let skipped = 0;

  for (const u of users) {
    const roleKey = u.role as keyof typeof roleMap;
    const role = roleMap[roleKey] ?? viewerRole;
    const hash = await bcrypt.hash(u.password, 10);

    try {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        // Update password hash only
        await prisma.user.update({ where: { email: u.email }, data: { passwordHash: hash } });
        skipped++;
        continue;
      }

      const created_user = await prisma.user.create({
        data: {
          employeeId: u.emp,
          fullName: u.name,
          email: u.email,
          status: 'ACTIVE',
          passwordHash: hash,
        },
      });

      await prisma.userRole.create({
        data: { userId: created_user.id, roleId: role.id },
      });

      created++;
    } catch (e: any) {
      console.warn(`Skipping ${u.email}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`Users: ${created} created, ${skipped} skipped/updated.`);
  
  // ── Seed Vendors ──────────────────────────────────────────────────────────
    
  console.log('Seed complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
