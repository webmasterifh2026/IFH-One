import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Comprehensive RBAC Seed for v2.6.0
 * 
 * This seed script implements the complete RBAC system per the procurement workflow:
 * - Global permissions (Dashboard, Control Tower, etc.)
 * - Master data permissions (Projects, Vendors, Items)
 * - Workflow stage permissions (View, Edit, Approve, Reject, Hold, Bulk Update, etc.)
 * - User and Role setup matching the workflow responsibility matrix
 * - Stage-specific assignments
 */

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS CATALOG
// ─────────────────────────────────────────────────────────────────────────────

interface PermissionDef {
  module: string;
  key: string;
  description: string;
  category: 'Global' | 'Master' | 'Workflow' | 'Admin';
}

const PERMISSIONS: PermissionDef[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL ACCESS (Available to Every User)
  // ═══════════════════════════════════════════════════════════════════════════
  { module: 'Dashboard', key: 'dashboard.view', description: 'View Dashboard', category: 'Global' },
  { module: 'Control Tower', key: 'control-tower.view', description: 'View Control Tower', category: 'Global' },
  { module: 'Indent Lifecycle', key: 'indent.lifecycle.view', description: 'View Indent Lifecycle', category: 'Global' },
  { module: 'Indent', key: 'indent.view', description: 'View Indents', category: 'Global' },
  { module: 'Indent', key: 'indent.create', description: 'Create New Indent', category: 'Global' },
  { module: 'Indent', key: 'indent.draft.save', description: 'Save Indent Draft', category: 'Global' },
  { module: 'Indent', key: 'indent.submit', description: 'Submit Indent', category: 'Global' },
  { module: 'Indent', key: 'indent.own.view', description: 'View Own Created Indents', category: 'Global' },
  { module: 'Indent', key: 'indent.timeline.view', description: 'View Workflow Timeline', category: 'Global' },
  { module: 'Indent', key: 'indent.audit.view', description: 'View Audit History', category: 'Global' },
  { module: 'Notifications', key: 'notification.view', description: 'View Notifications', category: 'Global' },
  { module: 'Notifications', key: 'email.view', description: 'View Emails Related to Indents', category: 'Global' },
  { module: 'Workflow Management', key: 'hold.view', description: 'View Hold Records', category: 'Global' },
  { module: 'Workflow Management', key: 'rejected.view', description: 'View Rejected Records', category: 'Global' },
  { module: 'Workflow Management', key: 'archived.view', description: 'View Archived Indents', category: 'Global' },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  { module: 'User Management', key: 'user.view', description: 'View Users', category: 'Admin' },
  { module: 'User Management', key: 'user.create', description: 'Create Users', category: 'Admin' },
  { module: 'User Management', key: 'user.edit', description: 'Edit Users', category: 'Admin' },
  { module: 'User Management', key: 'user.delete', description: 'Delete/Deactivate Users', category: 'Admin' },
  { module: 'User Management', key: 'user.import', description: 'Import Users', category: 'Admin' },
  { module: 'User Management', key: 'user.export', description: 'Export Users', category: 'Admin' },
  { module: 'User Management', key: 'user.assign', description: 'Assign Users to Roles/Stages', category: 'Admin' },
  { module: 'User Management', key: 'user.reassign', description: 'Reassign Users', category: 'Admin' },
  { module: 'User Management', key: 'user.manage', description: 'Manage All Users', category: 'Admin' },
  { module: 'Role Management', key: 'role.view', description: 'View Roles', category: 'Admin' },
  { module: 'Role Management', key: 'role.create', description: 'Create Roles', category: 'Admin' },
  { module: 'Role Management', key: 'role.edit', description: 'Edit Roles', category: 'Admin' },
  { module: 'Role Management', key: 'role.delete', description: 'Delete Roles', category: 'Admin' },
  { module: 'Role Management', key: 'role.manage', description: 'Manage Roles', category: 'Admin' },
  { module: 'Permission Management', key: 'permission.view', description: 'View Permissions', category: 'Admin' },
  { module: 'Permission Management', key: 'permission.assign', description: 'Assign Permissions', category: 'Admin' },
  { module: 'Permission Management', key: 'permission.edit', description: 'Edit Permissions', category: 'Admin' },
  { module: 'Permission Management', key: 'permission.manage', description: 'Manage Permissions', category: 'Admin' },
  { module: 'Audit Logs', key: 'audit.view', description: 'View Audit Logs', category: 'Admin' },

  // ═══════════════════════════════════════════════════════════════════════════
  // MASTER DATA PERMISSIONS
  // ═══════════════════════════════════════════════════════════════════════════
  { module: 'Projects Master', key: 'project.view', description: 'View Projects', category: 'Master' },
  { module: 'Projects Master', key: 'project.create', description: 'Create Projects', category: 'Master' },
  { module: 'Projects Master', key: 'project.edit', description: 'Edit Projects', category: 'Master' },
  { module: 'Projects Master', key: 'project.delete', description: 'Delete Projects', category: 'Master' },
  { module: 'Projects Master', key: 'project.import', description: 'Import Projects', category: 'Master' },
  { module: 'Projects Master', key: 'project.export', description: 'Export Projects', category: 'Master' },
  { module: 'Vendors Master', key: 'vendor.view', description: 'View Vendors', category: 'Master' },
  { module: 'Vendors Master', key: 'vendor.create', description: 'Create Vendors', category: 'Master' },
  { module: 'Vendors Master', key: 'vendor.edit', description: 'Edit Vendors', category: 'Master' },
  { module: 'Vendors Master', key: 'vendor.delete', description: 'Delete Vendors', category: 'Master' },
  { module: 'Vendors Master', key: 'vendor.import', description: 'Import Vendors', category: 'Master' },
  { module: 'Vendors Master', key: 'vendor.export', description: 'Export Vendors', category: 'Master' },
  { module: 'Items Master', key: 'item.view', description: 'View Items/SKUs', category: 'Master' },
  { module: 'Items Master', key: 'item.create', description: 'Create Items/SKUs', category: 'Master' },
  { module: 'Items Master', key: 'item.edit', description: 'Edit Items/SKUs', category: 'Master' },
  { module: 'Items Master', key: 'item.delete', description: 'Delete Items/SKUs', category: 'Master' },
  { module: 'Items Master', key: 'item.import', description: 'Import Items/SKUs', category: 'Master' },
  { module: 'Items Master', key: 'item.export', description: 'Export Items/SKUs', category: 'Master' },
  { module: 'Department Master', key: 'department.view', description: 'View Departments', category: 'Master' },
  { module: 'Department Master', key: 'department.create', description: 'Create Departments', category: 'Master' },
  { module: 'Department Master', key: 'department.edit', description: 'Edit Departments', category: 'Master' },
  { module: 'Department Master', key: 'department.delete', description: 'Delete Departments', category: 'Master' },

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKFLOW STAGE PERMISSIONS (per permission key pattern)
  // ═══════════════════════════════════════════════════════════════════════════
  // Stage 1B (System Stage 1): Indent Verification — Pramod Kumar
  { module: 'Stage 1: Indent Verification', key: 'workflow.stage1.view', description: 'View Indent Verification Stage', category: 'Workflow' },
  { module: 'Stage 1: Indent Verification', key: 'workflow.stage1.edit', description: 'Edit Indent Verification Stage', category: 'Workflow' },
  { module: 'Stage 1: Indent Verification', key: 'workflow.stage1.approve', description: 'Approve at Indent Verification', category: 'Workflow' },
  { module: 'Stage 1: Indent Verification', key: 'workflow.stage1.reject', description: 'Reject at Indent Verification', category: 'Workflow' },
  { module: 'Stage 1: Indent Verification', key: 'workflow.stage1.hold', description: 'Hold at Indent Verification', category: 'Workflow' },
  { module: 'Stage 1: Indent Verification', key: 'workflow.stage1.bulk_update', description: 'Bulk Update at Indent Verification', category: 'Workflow' },
  // Stage 2: Check Store Availability — Shiv Dayal Sharma, Pankaj Kumar
  { module: 'Stage 2: Store Check', key: 'workflow.stage2.view', description: 'View Store Check Stage', category: 'Workflow' },
  { module: 'Stage 2: Store Check', key: 'workflow.stage2.edit', description: 'Edit Store Check Stage', category: 'Workflow' },
  { module: 'Stage 2: Store Check', key: 'workflow.stage2.bulk_update', description: 'Bulk Update at Store Check', category: 'Workflow' },
  { module: 'Stage 2: Store Check', key: 'workflow.stage2.move_next', description: 'Move to Next Stage from Store Check', category: 'Workflow' },
  // Stage 3: Float RFQ — Assigned Buyer
  { module: 'Stage 3: Float RFQ', key: 'workflow.stage3.view', description: 'View Float RFQ Stage', category: 'Workflow' },
  { module: 'Stage 3: Float RFQ', key: 'workflow.stage3.edit', description: 'Edit Float RFQ Stage', category: 'Workflow' },
  { module: 'Stage 3: Float RFQ', key: 'workflow.stage3.bulk_update', description: 'Bulk Update at Float RFQ', category: 'Workflow' },
  { module: 'Stage 3: Float RFQ', key: 'workflow.stage3.vendor_selection', description: 'Vendor Selection at RFQ Stage', category: 'Workflow' },
  { module: 'Stage 3: Float RFQ', key: 'workflow.stage3.rfq_management', description: 'RFQ Management', category: 'Workflow' },
  // Stage 4: Receive Techno Commercial Offer — Assigned Buyer
  { module: 'Stage 4: Techno Commercial', key: 'workflow.stage4.view', description: 'View Techno Commercial Stage', category: 'Workflow' },
  { module: 'Stage 4: Techno Commercial', key: 'workflow.stage4.edit', description: 'Edit Techno Commercial Stage', category: 'Workflow' },
  { module: 'Stage 4: Techno Commercial', key: 'workflow.stage4.bulk_update', description: 'Bulk Update at Techno Commercial', category: 'Workflow' },
  { module: 'Stage 4: Techno Commercial', key: 'workflow.stage4.upload_comparison', description: 'Upload Comparison Sheet', category: 'Workflow' },
  { module: 'Stage 4: Techno Commercial', key: 'workflow.stage4.upload_technical', description: 'Upload Technical Documents', category: 'Workflow' },
  // Stage 5: Negotiation & Decision — Assigned Buyer
  { module: 'Stage 5: Negotiation', key: 'workflow.stage5.view', description: 'View Negotiation Stage', category: 'Workflow' },
  { module: 'Stage 5: Negotiation', key: 'workflow.stage5.edit', description: 'Edit Negotiation Stage', category: 'Workflow' },
  { module: 'Stage 5: Negotiation', key: 'workflow.stage5.bulk_update', description: 'Bulk Update at Negotiation', category: 'Workflow' },
  { module: 'Stage 5: Negotiation', key: 'workflow.stage5.vendor_finalization', description: 'Vendor Finalization at Negotiation', category: 'Workflow' },
  // Stage 6: PO Creation — Assigned Buyer
  { module: 'Stage 6: PO Creation', key: 'workflow.stage6.view', description: 'View PO Creation Stage', category: 'Workflow' },
  { module: 'Stage 6: PO Creation', key: 'workflow.stage6.create', description: 'Create Purchase Order', category: 'Workflow' },
  { module: 'Stage 6: PO Creation', key: 'workflow.stage6.edit', description: 'Edit Purchase Order', category: 'Workflow' },
  { module: 'Stage 6: PO Creation', key: 'workflow.stage6.bulk_update', description: 'Bulk Update at PO Creation', category: 'Workflow' },
  // Stage 7: PO Approval 1 — Pramod Kumar
  { module: 'Stage 7: PO Approval L1', key: 'workflow.stage7.view', description: 'View PO Approval L1 Stage', category: 'Workflow' },
  { module: 'Stage 7: PO Approval L1', key: 'workflow.stage7.approve', description: 'Approve PO at L1', category: 'Workflow' },
  { module: 'Stage 7: PO Approval L1', key: 'workflow.stage7.reject', description: 'Reject PO at L1', category: 'Workflow' },
  { module: 'Stage 7: PO Approval L1', key: 'workflow.stage7.hold', description: 'Hold PO at L1', category: 'Workflow' },
  { module: 'Stage 7: PO Approval L1', key: 'workflow.stage7.bulk_update', description: 'Bulk Update at PO Approval L1', category: 'Workflow' },
  // Stage 8: PO Approval 2 — Ankur Gupta
  { module: 'Stage 8: PO Approval L2', key: 'workflow.stage8.view', description: 'View PO Approval L2 Stage', category: 'Workflow' },
  { module: 'Stage 8: PO Approval L2', key: 'workflow.stage8.approve', description: 'Approve PO at L2', category: 'Workflow' },
  { module: 'Stage 8: PO Approval L2', key: 'workflow.stage8.reject', description: 'Reject PO at L2', category: 'Workflow' },
  { module: 'Stage 8: PO Approval L2', key: 'workflow.stage8.hold', description: 'Hold PO at L2', category: 'Workflow' },
  { module: 'Stage 8: PO Approval L2', key: 'workflow.stage8.bulk_update', description: 'Bulk Update at PO Approval L2', category: 'Workflow' },
  // Stage 9: Vendor Acceptance — Neetu Singh
  { module: 'Stage 9: Vendor Acceptance', key: 'workflow.stage9.view', description: 'View Vendor Acceptance Stage', category: 'Workflow' },
  { module: 'Stage 9: Vendor Acceptance', key: 'workflow.stage9.edit', description: 'Edit Vendor Acceptance Stage', category: 'Workflow' },
  { module: 'Stage 9: Vendor Acceptance', key: 'workflow.stage9.bulk_update', description: 'Bulk Update at Vendor Acceptance', category: 'Workflow' },
  // Stage 10: Follow-up for Delivery — Priyanka Pal
  { module: 'Stage 10: Follow-up', key: 'workflow.stage10.view', description: 'View Follow-up Stage', category: 'Workflow' },
  { module: 'Stage 10: Follow-up', key: 'workflow.stage10.edit', description: 'Edit Follow-up Stage', category: 'Workflow' },
  { module: 'Stage 10: Follow-up', key: 'workflow.stage10.bulk_update', description: 'Bulk Update at Follow-up', category: 'Workflow' },
  // Stage 11: Material Received — Shiv Dayal Sharma, Shivam Namdev, Anushka Kamboj
  { module: 'Stage 11: Material Received', key: 'workflow.stage11.view', description: 'View Material Received Stage', category: 'Workflow' },
  { module: 'Stage 11: Material Received', key: 'workflow.stage11.edit', description: 'Edit Material Received Stage', category: 'Workflow' },
  { module: 'Stage 11: Material Received', key: 'workflow.stage11.bulk_update', description: 'Bulk Update at Material Received', category: 'Workflow' },
  // Stage 12: Material Inspection — Saurabh, Shivam Namdev, Anushka Kamboj
  { module: 'Stage 12: Material Inspection', key: 'workflow.stage12.view', description: 'View Material Inspection Stage', category: 'Workflow' },
  { module: 'Stage 12: Material Inspection', key: 'workflow.stage12.approve', description: 'Approve at Material Inspection', category: 'Workflow' },
  { module: 'Stage 12: Material Inspection', key: 'workflow.stage12.reject', description: 'Reject at Material Inspection', category: 'Workflow' },
  { module: 'Stage 12: Material Inspection', key: 'workflow.stage12.bulk_update', description: 'Bulk Update at Material Inspection', category: 'Workflow' },
  // Stage 13: Second Inspection — Saurabh, Shivam Namdev, Anushka Kamboj
  { module: 'Stage 13: Second Inspection', key: 'workflow.stage13.view', description: 'View Second Inspection Stage', category: 'Workflow' },
  { module: 'Stage 13: Second Inspection', key: 'workflow.stage13.approve', description: 'Approve at Second Inspection', category: 'Workflow' },
  { module: 'Stage 13: Second Inspection', key: 'workflow.stage13.reject', description: 'Reject at Second Inspection', category: 'Workflow' },
  { module: 'Stage 13: Second Inspection', key: 'workflow.stage13.bulk_update', description: 'Bulk Update at Second Inspection', category: 'Workflow' },
  // Stage 14: Third Inspection — Saurabh, Shivam Namdev, Anushka Kamboj
  { module: 'Stage 14: Third Inspection', key: 'workflow.stage14.view', description: 'View Third Inspection Stage', category: 'Workflow' },
  { module: 'Stage 14: Third Inspection', key: 'workflow.stage14.approve', description: 'Approve at Third Inspection', category: 'Workflow' },
  { module: 'Stage 14: Third Inspection', key: 'workflow.stage14.reject', description: 'Reject at Third Inspection', category: 'Workflow' },
  { module: 'Stage 14: Third Inspection', key: 'workflow.stage14.bulk_update', description: 'Bulk Update at Third Inspection', category: 'Workflow' },
  // Stage 15: Debit Note — Atul Tyagi
  { module: 'Stage 15: Debit Note', key: 'workflow.stage15.view', description: 'View Debit Note Stage', category: 'Workflow' },
  { module: 'Stage 15: Debit Note', key: 'workflow.stage15.create', description: 'Create Debit Note', category: 'Workflow' },
  { module: 'Stage 15: Debit Note', key: 'workflow.stage15.edit', description: 'Edit Debit Note', category: 'Workflow' },
  { module: 'Stage 15: Debit Note', key: 'workflow.stage15.bulk_update', description: 'Bulk Update at Debit Note', category: 'Workflow' },
  // Stage 16: Bill to Accounts — Pankaj Kumar, Anushka Kamboj
  { module: 'Stage 16: Bill to Accounts', key: 'workflow.stage16.view', description: 'View Bill to Accounts Stage', category: 'Workflow' },
  { module: 'Stage 16: Bill to Accounts', key: 'workflow.stage16.edit', description: 'Edit Bill to Accounts Stage', category: 'Workflow' },
  { module: 'Stage 16: Bill to Accounts', key: 'workflow.stage16.bulk_update', description: 'Bulk Update at Bill to Accounts', category: 'Workflow' },
  // Stage 17: Bill to Purchase — Pankaj Kumar, Atul Tyagi, Anushka Kamboj
  { module: 'Stage 17: Bill to Purchase', key: 'workflow.stage17.view', description: 'View Bill to Purchase Stage', category: 'Workflow' },
  { module: 'Stage 17: Bill to Purchase', key: 'workflow.stage17.edit', description: 'Edit Bill to Purchase Stage', category: 'Workflow' },
  { module: 'Stage 17: Bill to Purchase', key: 'workflow.stage17.bulk_update', description: 'Bulk Update at Bill to Purchase', category: 'Workflow' },
  // Stage 18: Bill Creation + GRN — Pankaj Kumar, Atul Tyagi, Anushka Kamboj
  { module: 'Stage 18: Bill Creation', key: 'workflow.stage18.view', description: 'View Bill Creation Stage', category: 'Workflow' },
  { module: 'Stage 18: Bill Creation', key: 'workflow.stage18.create', description: 'Create Bill', category: 'Workflow' },
  { module: 'Stage 18: Bill Creation', key: 'workflow.stage18.edit', description: 'Edit GRN', category: 'Workflow' },
  { module: 'Stage 18: Bill Creation', key: 'workflow.stage18.bulk_update', description: 'Bulk Update at Bill Creation', category: 'Workflow' },
  // Stage 19: Book Purchase in Tally — Atul Tyagi
  { module: 'Stage 19: Tally Entry', key: 'workflow.stage19.view', description: 'View Tally Entry Stage', category: 'Workflow' },
  { module: 'Stage 19: Tally Entry', key: 'workflow.stage19.edit', description: 'Edit Tally Entry Stage', category: 'Workflow' },
  { module: 'Stage 19: Tally Entry', key: 'workflow.stage19.complete', description: 'Complete Tally Entry Stage', category: 'Workflow' },
  // Stage 20: Bill Approval 1 — Pramod Kumar
  { module: 'Stage 20: Bill Approval L1', key: 'workflow.stage20.view', description: 'View Bill Approval L1 Stage', category: 'Workflow' },
  { module: 'Stage 20: Bill Approval L1', key: 'workflow.stage20.approve', description: 'Approve Bill at L1', category: 'Workflow' },
  { module: 'Stage 20: Bill Approval L1', key: 'workflow.stage20.reject', description: 'Reject Bill at L1', category: 'Workflow' },
  { module: 'Stage 20: Bill Approval L1', key: 'workflow.stage20.hold', description: 'Hold Bill at L1', category: 'Workflow' },
  // Stage 21: Bill Approval 2 — Neetu Singh
  { module: 'Stage 21: Bill Approval L2', key: 'workflow.stage21.view', description: 'View Bill Approval L2 Stage', category: 'Workflow' },
  { module: 'Stage 21: Bill Approval L2', key: 'workflow.stage21.approve', description: 'Approve Bill at L2', category: 'Workflow' },
  { module: 'Stage 21: Bill Approval L2', key: 'workflow.stage21.reject', description: 'Reject Bill at L2', category: 'Workflow' },
  { module: 'Stage 21: Bill Approval L2', key: 'workflow.stage21.hold', description: 'Hold Bill at L2', category: 'Workflow' },
  // Stage 22: Payment / Advice — Neha Mishra, Vanshika Mathur, Md. Aftab Moin, MOHAMMAD AZAD
  { module: 'Stage 22: Payment Advice', key: 'workflow.stage22.view', description: 'View Payment Advice Stage', category: 'Workflow' },
  { module: 'Stage 22: Payment Advice', key: 'workflow.stage22.edit', description: 'Edit Payment Advice Stage', category: 'Workflow' },
  { module: 'Stage 22: Payment Advice', key: 'workflow.stage22.complete', description: 'Complete Workflow (Payment)', category: 'Workflow' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ROLES DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

const ROLES = [
  { name: 'Super Admin', description: 'Full System Access — sees and does everything' },
  { name: 'Procurement Manager', description: 'Manager with org-wide dashboard + admin access' },
  { name: 'Indent Verifier', description: 'Step 1B: Verify, Approve/Reject/Hold indents (Pramod Kumar)' },
  { name: 'Store Executive', description: 'Step 2 & 11: Store check and material receipt' },
  { name: 'Buyer', description: 'Steps 3-6: RFQ, Techno Commercial, Negotiation, PO Creation (Dynamic Buyer)' },
  { name: 'PO Approver L1', description: 'Step 7: PO Approval L1 (Pramod Kumar)' },
  { name: 'PO Approver L2', description: 'Step 8: PO Approval L2 (Ankur Gupta)' },
  { name: 'Vendor Coordinator', description: 'Step 9: Vendor Acceptance (Neetu Singh)' },
  { name: 'Delivery Coordinator', description: 'Step 10: Follow-up for Delivery (Priyanka Pal)' },
  { name: 'Inspection Officer', description: 'Steps 12-14: Material Inspection (Saurabh, Shivam, Anushka)' },
  { name: 'Accounts Executive', description: 'Steps 15-19: Debit Note, Billing, Tally (Atul Tyagi, Pankaj, Anushka)' },
  { name: 'Bill Approver L1', description: 'Step 20: Bill Approval L1 (Pramod Kumar)' },
  { name: 'Bill Approver L2', description: 'Step 21: Bill Approval L2 (Neetu Singh)' },
  { name: 'Finance Executive', description: 'Step 22: Payment Advice (Neha, Vanshika, Md Aftab, M Azad)' },
  { name: 'Viewer', description: 'Read-only access to all stages and reports' },
];

// ─────────────────────────────────────────────────────────────────────────────
// USER-TO-ROLE MAPPING (per responsibility matrix)
// ─────────────────────────────────────────────────────────────────────────────

interface UserConfig {
  email: string;
  fullName: string;
  employeeId: string;
  designation?: string;
  roleNames: string[];
}

const USERS: UserConfig[] = [
  {
    email: 'pramod.kumar@if-himenviro.in',
    fullName: 'Pramod Kumar',
    employeeId: 'EMP001',
    designation: 'Procurement Manager',
    // Pramod does: Indent Verification (S1), PO Approval L1 (S7), Bill Approval L1 (S20)
    roleNames: ['Indent Verifier', 'PO Approver L1', 'Bill Approver L1', 'Procurement Manager'],
  },
  {
    email: 'shiv.sharma@if-himenviro.in',
    fullName: 'Shiv Dayal Sharma',
    employeeId: 'EMP002',
    designation: 'Store Executive',
    // Shiv: Store Check (S2), Material Received (S11)
    roleNames: ['Store Executive'],
  },
  {
    email: 'pankaj.kumar@if-himenviro.in',
    fullName: 'Pankaj Kumar',
    employeeId: 'EMP003',
    designation: 'Accounts & Store Executive',
    // Pankaj: Store Check (S2), Bill to Accounts (S16), Bill to Purchase (S17), Bill Creation (S18)
    roleNames: ['Store Executive', 'Accounts Executive'],
  },
  {
    email: 'ankur.gupta@if-himenviro.in',
    fullName: 'Ankur Gupta',
    employeeId: 'EMP004',
    designation: 'Senior Manager',
    // Ankur: PO Approval L2 (S8)
    roleNames: ['PO Approver L2'],
  },
  {
    email: 'neetu.singh@if-himenviro.in',
    fullName: 'Neetu Singh',
    employeeId: 'EMP005',
    designation: 'Vendor Coordinator',
    // Neetu: Vendor Acceptance (S9), Bill Approval L2 (S21)
    roleNames: ['Vendor Coordinator', 'Bill Approver L2'],
  },
  {
    email: 'priyanka.pal@if-himenviro.in',
    fullName: 'Priyanka Pal',
    employeeId: 'EMP006',
    designation: 'Delivery Coordinator',
    // Priyanka: Follow-up for Delivery (S10)
    roleNames: ['Delivery Coordinator'],
  },
  {
    email: 'shivam.namdev@if-himenviro.in',
    fullName: 'Shivam Namdev',
    employeeId: 'EMP007',
    designation: 'Store & Inspection Officer',
    // Shivam: Material Received (S11), Material Inspection (S12), Second/Third Inspection (S13-S14)
    roleNames: ['Store Executive', 'Inspection Officer'],
  },
  {
    email: 'anushka.kamboj@if-himenviro.in',
    fullName: 'Anushka Kamboj',
    employeeId: 'EMP008',
    designation: 'Store & Accounts Executive',
    // Anushka: Material Received (S11), Inspections (S12-14), Bill to Accounts (S16), Bill to Purchase (S17), Bill Creation (S18)
    roleNames: ['Store Executive', 'Inspection Officer', 'Accounts Executive'],
  },
  {
    email: 'saurabh@if-himenviro.in',
    fullName: 'Saurabh',
    employeeId: 'EMP009',
    designation: 'Inspection Officer',
    // Saurabh: Material Inspection (S12), Second/Third Inspection (S13-14)
    roleNames: ['Inspection Officer'],
  },
  {
    email: 'atul.tyagi@if-himenviro.in',
    fullName: 'Atul Tyagi',
    employeeId: 'EMP010',
    designation: 'Accounts Executive',
    // Atul: Debit Note (S15), Bill to Purchase (S17), Bill Creation (S18), Tally Entry (S19)
    roleNames: ['Accounts Executive'],
  },
  {
    email: 'neha.mishra@if-himenviro.in',
    fullName: 'Neha Mishra',
    employeeId: 'EMP011',
    designation: 'Finance Executive',
    // Neha: Payment Advice (S22)
    roleNames: ['Finance Executive'],
  },
  {
    email: 'vanshika.mathur@if-himenviro.in',
    fullName: 'Vanshika Mathur',
    employeeId: 'EMP012',
    designation: 'Finance Executive',
    // Vanshika: Payment Advice (S22)
    roleNames: ['Finance Executive'],
  },
  {
    email: 'md.aftab@if-himenviro.in',
    fullName: 'Md. Aftab Moin',
    employeeId: 'EMP013',
    designation: 'Finance Executive',
    // Md Aftab: Payment Advice (S22)
    roleNames: ['Finance Executive'],
  },
  {
    email: 'mohammad.azad@if-himenviro.in',
    fullName: 'MOHAMMAD AZAD',
    employeeId: 'EMP014',
    designation: 'Finance Executive',
    // Azad: Payment Advice (S22)
    roleNames: ['Finance Executive'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ROLE-TO-PERMISSION MAPPING
// ─────────────────────────────────────────────────────────────────────────────

// Global permissions every role gets
const GLOBAL_PERMISSIONS = [
  'dashboard.view', 'control-tower.view', 'indent.lifecycle.view',
  'indent.view', 'indent.create', 'indent.draft.save', 'indent.submit',
  'indent.own.view', 'indent.timeline.view', 'indent.audit.view',
  'notification.view', 'email.view',
  'hold.view', 'rejected.view', 'archived.view',
  // Master data view-only for all
  'project.view', 'vendor.view', 'item.view', 'department.view',
];

// Admin / Super Admin
const ADMIN_PERMISSIONS = [
  ...GLOBAL_PERMISSIONS,
  'user.view', 'user.create', 'user.edit', 'user.delete', 'user.import', 'user.export', 'user.assign', 'user.reassign', 'user.manage',
  'role.view', 'role.create', 'role.edit', 'role.delete', 'role.manage',
  'permission.view', 'permission.assign', 'permission.edit', 'permission.manage',
  'audit.view',
  'project.create', 'project.edit', 'project.delete', 'project.import', 'project.export',
  'vendor.create', 'vendor.edit', 'vendor.delete', 'vendor.import', 'vendor.export',
  'item.create', 'item.edit', 'item.delete', 'item.import', 'item.export',
  'department.create', 'department.edit', 'department.delete',
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': [
    // All permissions — assigned dynamically in seed
    '__ALL__',
  ],

  'Procurement Manager': [
    ...ADMIN_PERMISSIONS,
    // All workflow stages — view level + full admin
    ...Array.from({ length: 22 }, (_, i) => i + 1).flatMap(n => [
      `workflow.stage${n}.view`,
      `workflow.stage${n}.approve`,
      `workflow.stage${n}.reject`,
      `workflow.stage${n}.hold`,
      `workflow.stage${n}.edit`,
      `workflow.stage${n}.bulk_update`,
    ].filter(k => PERMISSIONS.some(p => p.key === k))),
  ],

  'Indent Verifier': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage1.view', 'workflow.stage1.edit', 'workflow.stage1.approve',
    'workflow.stage1.reject', 'workflow.stage1.hold', 'workflow.stage1.bulk_update',
  ],

  'Store Executive': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage2.view', 'workflow.stage2.edit', 'workflow.stage2.bulk_update', 'workflow.stage2.move_next',
    'workflow.stage11.view', 'workflow.stage11.edit', 'workflow.stage11.bulk_update',
  ],

  'Buyer': [
    ...GLOBAL_PERMISSIONS,
    'vendor.create', 'vendor.edit', 'vendor.import', 'vendor.export',
    'workflow.stage3.view', 'workflow.stage3.edit', 'workflow.stage3.bulk_update',
    'workflow.stage3.vendor_selection', 'workflow.stage3.rfq_management',
    'workflow.stage4.view', 'workflow.stage4.edit', 'workflow.stage4.bulk_update',
    'workflow.stage4.upload_comparison', 'workflow.stage4.upload_technical',
    'workflow.stage5.view', 'workflow.stage5.edit', 'workflow.stage5.bulk_update',
    'workflow.stage5.vendor_finalization',
    'workflow.stage6.view', 'workflow.stage6.create', 'workflow.stage6.edit', 'workflow.stage6.bulk_update',
  ],

  'PO Approver L1': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage7.view', 'workflow.stage7.approve', 'workflow.stage7.reject',
    'workflow.stage7.hold', 'workflow.stage7.bulk_update',
  ],

  'PO Approver L2': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage8.view', 'workflow.stage8.approve', 'workflow.stage8.reject',
    'workflow.stage8.hold', 'workflow.stage8.bulk_update',
  ],

  'Vendor Coordinator': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage9.view', 'workflow.stage9.edit', 'workflow.stage9.bulk_update',
  ],

  'Delivery Coordinator': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage10.view', 'workflow.stage10.edit', 'workflow.stage10.bulk_update',
  ],

  'Inspection Officer': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage12.view', 'workflow.stage12.approve', 'workflow.stage12.reject', 'workflow.stage12.bulk_update',
    'workflow.stage13.view', 'workflow.stage13.approve', 'workflow.stage13.reject', 'workflow.stage13.bulk_update',
    'workflow.stage14.view', 'workflow.stage14.approve', 'workflow.stage14.reject', 'workflow.stage14.bulk_update',
  ],

  'Accounts Executive': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage15.view', 'workflow.stage15.create', 'workflow.stage15.edit', 'workflow.stage15.bulk_update',
    'workflow.stage16.view', 'workflow.stage16.edit', 'workflow.stage16.bulk_update',
    'workflow.stage17.view', 'workflow.stage17.edit', 'workflow.stage17.bulk_update',
    'workflow.stage18.view', 'workflow.stage18.create', 'workflow.stage18.edit', 'workflow.stage18.bulk_update',
    'workflow.stage19.view', 'workflow.stage19.edit', 'workflow.stage19.complete',
  ],

  'Bill Approver L1': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage20.view', 'workflow.stage20.approve', 'workflow.stage20.reject', 'workflow.stage20.hold',
  ],

  'Bill Approver L2': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage21.view', 'workflow.stage21.approve', 'workflow.stage21.reject', 'workflow.stage21.hold',
  ],

  'Finance Executive': [
    ...GLOBAL_PERMISSIONS,
    'workflow.stage22.view', 'workflow.stage22.edit', 'workflow.stage22.complete',
  ],

  'Viewer': [
    ...GLOBAL_PERMISSIONS,
    'audit.view',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW STAGE PERMISSIONS (WorkflowStagePermission table)
// Defines canView, canEdit, canApprove, canHold, canReject, canBulkUpdate per role per stage
// ─────────────────────────────────────────────────────────────────────────────

interface StagePermRow {
  stage: number;
  canView: boolean; canEdit: boolean; canApprove: boolean;
  canHold: boolean; canReject: boolean; canBulkUpdate: boolean;
  canExport: boolean; canReassign: boolean;
}

const ROLE_STAGE_PERMISSIONS: Record<string, StagePermRow[]> = {
  'Indent Verifier': [
    { stage: 1, canView: true, canEdit: true, canApprove: true, canHold: true, canReject: true, canBulkUpdate: true, canExport: false, canReassign: false },
  ],
  'Store Executive': [
    { stage: 2, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
    { stage: 11, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
  ],
  'Buyer': [
    { stage: 3, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: true, canReassign: false },
    { stage: 4, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: true, canReassign: false },
    { stage: 5, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: true, canReassign: false },
    { stage: 6, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: true, canReassign: false },
  ],
  'PO Approver L1': [
    { stage: 7, canView: true, canEdit: false, canApprove: true, canHold: true, canReject: true, canBulkUpdate: true, canExport: false, canReassign: false },
  ],
  'PO Approver L2': [
    { stage: 8, canView: true, canEdit: false, canApprove: true, canHold: true, canReject: true, canBulkUpdate: true, canExport: false, canReassign: false },
  ],
  'Vendor Coordinator': [
    { stage: 9, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
  ],
  'Delivery Coordinator': [
    { stage: 10, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
  ],
  'Inspection Officer': [
    { stage: 12, canView: true, canEdit: false, canApprove: true, canHold: false, canReject: true, canBulkUpdate: true, canExport: false, canReassign: false },
    { stage: 13, canView: true, canEdit: false, canApprove: true, canHold: false, canReject: true, canBulkUpdate: true, canExport: false, canReassign: false },
    { stage: 14, canView: true, canEdit: false, canApprove: true, canHold: false, canReject: true, canBulkUpdate: true, canExport: false, canReassign: false },
  ],
  'Accounts Executive': [
    { stage: 15, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
    { stage: 16, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
    { stage: 17, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
    { stage: 18, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
    { stage: 19, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: true, canExport: false, canReassign: false },
  ],
  'Bill Approver L1': [
    { stage: 20, canView: true, canEdit: false, canApprove: true, canHold: true, canReject: true, canBulkUpdate: false, canExport: false, canReassign: false },
  ],
  'Bill Approver L2': [
    { stage: 21, canView: true, canEdit: false, canApprove: true, canHold: true, canReject: true, canBulkUpdate: false, canExport: false, canReassign: false },
  ],
  'Finance Executive': [
    { stage: 22, canView: true, canEdit: true, canApprove: false, canHold: false, canReject: false, canBulkUpdate: false, canExport: false, canReassign: false },
  ],
  'Procurement Manager': Array.from({ length: 22 }, (_, i) => ({
    stage: i + 1,
    canView: true, canEdit: true, canApprove: true, canHold: true,
    canReject: true, canBulkUpdate: true, canExport: true, canReassign: true,
  })),
  'Viewer': Array.from({ length: 22 }, (_, i) => ({
    stage: i + 1,
    canView: true, canEdit: false, canApprove: false, canHold: false,
    canReject: false, canBulkUpdate: false, canExport: false, canReassign: false,
  })),
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 IFH One — RBAC v2.6.0 Seed Starting...\n');

  // ── 1. Seed All Permissions ────────────────────────────────────────────────
  console.log('📋 Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await (prisma.permission as any).upsert({
      where: { key: perm.key },
      update: { module: perm.module, description: perm.description, category: perm.category },
      create: { module: perm.module, key: perm.key, description: perm.description, category: perm.category },
    });
  }
  console.log(`   ✅ ${PERMISSIONS.length} permissions seeded`);

  // ── 2. Seed Roles ──────────────────────────────────────────────────────────
  console.log('\n🎭 Seeding roles...');
  const roleMap = new Map<string, string>(); // name -> id
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, status: 'ACTIVE' },
      create: { name: r.name, description: r.description, status: 'ACTIVE' },
    });
    roleMap.set(r.name, role.id);
    console.log(`   ✅ Role: ${r.name}`);
  }

  // ── 3. Assign Permissions to Roles ────────────────────────────────────────
  console.log('\n🔑 Assigning permissions to roles...');
  const allPermissions = await prisma.permission.findMany();
  const permKeyToId = new Map(allPermissions.map(p => [p.key, p.id]));

  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) { console.warn(`   ⚠️  Role not found: ${roleName}`); continue; }

    // For Super Admin, assign ALL permissions
    const resolvedKeys = permKeys.includes('__ALL__')
      ? allPermissions.map(p => p.key)
      : [...new Set(permKeys)];

    // Delete existing then recreate
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    const validIds = resolvedKeys.map(k => permKeyToId.get(k)).filter(Boolean) as string[];
    if (validIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: validIds.map(permissionId => ({ roleId, permissionId })),
        skipDuplicates: true,
      });
    }
    console.log(`   ✅ ${roleName}: ${validIds.length} permissions assigned`);
  }

  // ── 4. Seed WorkflowStagePermissions ────────────────────────────────────────
  console.log('\n⚙️  Seeding workflow stage permissions per role...');
  for (const [roleName, stages] of Object.entries(ROLE_STAGE_PERMISSIONS)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) { console.warn(`   ⚠️  Role not found: ${roleName}`); continue; }

    await prisma.workflowStagePermission.deleteMany({ where: { roleId } });
    if (stages.length > 0) {
      await prisma.workflowStagePermission.createMany({
        data: stages.map(s => ({
          roleId,
          workflowStage: s.stage,
          canView: s.canView,
          canEdit: s.canEdit,
          canApprove: s.canApprove,
          canHold: s.canHold,
          canReject: s.canReject,
          canBulkUpdate: s.canBulkUpdate,
          canExport: s.canExport,
          canReassign: s.canReassign,
        })),
        skipDuplicates: true,
      });
    }
    console.log(`   ✅ ${roleName}: ${stages.length} stage permissions set`);
  }

  // ── 5. Seed Users ──────────────────────────────────────────────────────────
  console.log('\n👤 Seeding users...');
  const defaultPasswordHash = await bcrypt.hash('IFHOne@2024!', 10);
  const userMap = new Map<string, string>(); // fullName -> id

  for (const u of USERS) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      // Check by employeeId too
      user = await prisma.user.findUnique({ where: { employeeId: u.employeeId } });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          employeeId: u.employeeId,
          designation: u.designation ?? null,
          passwordHash: defaultPasswordHash,
          status: 'ACTIVE',
        },
      });
      console.log(`   ✅ Created user: ${u.fullName}`);
    } else {
      // Update designation if present
      user = await prisma.user.update({
        where: { id: user.id },
        data: { designation: u.designation ?? user.designation, status: 'ACTIVE' },
      });
      console.log(`   🔄 Updated user: ${u.fullName}`);
    }

    userMap.set(u.fullName, user.id);

    // Assign roles (remove existing and re-apply for clean state)
    const existingRoles = await prisma.userRole.findMany({ where: { userId: user.id } });
    // Only remove roles that are in our managed set
    const managedRoleIds = ROLES.map(r => roleMap.get(r.name)).filter(Boolean) as string[];
    await prisma.userRole.deleteMany({
      where: { userId: user.id, roleId: { in: managedRoleIds } },
    });

    for (const roleName of u.roleNames) {
      const roleId = roleMap.get(roleName);
      if (!roleId) { console.warn(`      ⚠️  Role not found: ${roleName}`); continue; }
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId },
      });
    }
    console.log(`      🎭 Roles: ${u.roleNames.join(', ')}`);
  }

  // ── 6. Update Stage Configurations (connect default owners) ─────────────────
  console.log('\n📋 Linking stage default owners...');
  const STAGE_OWNER_MAP: Record<number, string[]> = {
    1:  ['Pramod Kumar'],
    2:  ['Shiv Dayal Sharma', 'Pankaj Kumar'],
    // 3-6: Dynamic (Buyer) — no fixed default owner
    7:  ['Pramod Kumar'],
    8:  ['Ankur Gupta'],
    9:  ['Neetu Singh'],
    10: ['Priyanka Pal'],
    11: ['Shiv Dayal Sharma', 'Shivam Namdev', 'Anushka Kamboj'],
    12: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    13: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    14: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'],
    15: ['Atul Tyagi'],
    16: ['Pankaj Kumar', 'Anushka Kamboj'],
    17: ['Pankaj Kumar', 'Atul Tyagi', 'Anushka Kamboj'],
    18: ['Pankaj Kumar', 'Atul Tyagi', 'Anushka Kamboj'],
    19: ['Atul Tyagi'],
    20: ['Pramod Kumar'],
    21: ['Neetu Singh'],
    22: ['Neha Mishra', 'Vanshika Mathur', 'Md. Aftab Moin', 'MOHAMMAD AZAD'],
  };

  for (const [stageNumStr, ownerNames] of Object.entries(STAGE_OWNER_MAP)) {
    const stageNum = parseInt(stageNumStr);
    const ownerIds: string[] = [];
    for (const name of ownerNames) {
      const uid = userMap.get(name);
      if (!uid) {
        // Try lookup directly from DB (user might exist from before)
        const dbUser = await prisma.user.findFirst({
          where: { fullName: { contains: name, mode: 'insensitive' } },
        });
        if (dbUser) ownerIds.push(dbUser.id);
        else console.warn(`      ⚠️  Owner not found: ${name} for stage ${stageNum}`);
      } else {
        ownerIds.push(uid);
      }
    }

    const stageExists = await prisma.stageConfiguration.findUnique({ where: { stageNumber: stageNum } });
    if (stageExists && ownerIds.length > 0) {
      await prisma.stageConfiguration.update({
        where: { stageNumber: stageNum },
        data: {
          defaultOwners: { set: ownerIds.map(id => ({ id })) },
          isDynamicOwner: ownerIds.length === 0,
        },
      });
      console.log(`   ✅ Stage ${stageNum}: ${ownerIds.length} owner(s) linked`);
    }
  }

  // ── 7. Summary ──────────────────────────────────────────────────────────────
  const [userCount, roleCount, permCount, stagePermCount] = await Promise.all([
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.role.count({ where: { status: 'ACTIVE' } }),
    prisma.permission.count(),
    prisma.workflowStagePermission.count(),
  ]);

  console.log('\n' + '═'.repeat(60));
  console.log('✨ RBAC v2.6.0 Seed Complete!');
  console.log('═'.repeat(60));
  console.log(`   👤 Active Users:              ${userCount}`);
  console.log(`   🎭 Active Roles:              ${roleCount}`);
  console.log(`   🔑 Total Permissions:         ${permCount}`);
  console.log(`   ⚙️  Stage Permission Entries: ${stagePermCount}`);
  console.log('═'.repeat(60));
  console.log('\n📝 Default password for new users: IFHOne@2024!');
  console.log('   Please force a password change on first login.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
