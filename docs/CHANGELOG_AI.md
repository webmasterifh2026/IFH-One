## IFH One v2.5.5 (Complete End-to-End Production Readiness Audit)

**Date:** 2026-07-07
**Type:** Bug Fix / Security Fix / Performance / Audit

### Bugs Fixed

1. **HIGH — Dashboard SLA KPIs Inaccurate (`procurement.service.ts` → `getDashboardStats`):**
   - `onTrack` was computed as `Math.max(0, inProgress - slaBreachedCount - slaBreachedStages)` — mixing an indent-level count (`inProgress`, which includes SUBMITTED status) with stage-level breach counts from `ProcurementStage.slaBreached`. This produced incorrect results whenever multiple stages of the same indent were breached, or when SUBMITTED indents didn't have SLA records.
   - `approaching` used `ProcurementStage.dueDate` within a fixed 2-hour window — completely disconnected from `SlaRecord.slaStatus = APPROACHING_SLA`.
   - Fixed: all three SLA KPI values now query `SlaRecord.slaStatus` directly: `ON_TRACK`, `APPROACHING_SLA`, `SLA_BREACHED`. These are the exact values maintained by the SLA Engine cron job and are always accurate.

2. **HIGH — Hardcoded Employee Emails in Source Code (`notification.service.ts`):**
   - `fixedRecipients` array contained 5 real employee email addresses embedded directly in source. Any CC list change required a code deployment. Emails were visible in version control history.
   - Fixed: `fixedRecipients` now loaded from `NOTIFICATION_CC_EMAILS` env var (comma-separated). Source contains zero hardcoded email addresses. `env.validation.ts` declares the new optional variable. `.env.example` documents it.

3. **HIGH — `require('bcrypt')` Inside Method Body (`users.service.ts` → `changePassword`):**
   - `const bcrypt = require('bcrypt')` was called inside `changePassword()` on every invocation, despite `bcrypt` already being imported at module level via `import * as bcrypt from 'bcrypt'`. This causes redundant module system lookups on every password change.
   - Fixed: removed inline require; top-level import used.

4. **MEDIUM — Sequential SLA Refresh (`sla-engine.service.ts` → `refreshActiveSlaRecords`):**
   - The batch processing loop used `for (const record of records) { await ... }` — fully sequential. For 100 active records per batch, this meant 100 serial database round-trips.
   - Fixed: replaced with `await Promise.all(records.map(async (record) => { ... }))` — all records in a batch are now refreshed concurrently. At 100 records per batch the refresh time drops from ~100×RTT to ~1×RTT.

5. **LOW — Stale Version Comments (`main.ts`, `fetch.ts`, `AuthContext.tsx`):**
   - JSDoc headers referenced `v2.6.1` or `v2.6.0`, creating confusion about which version introduced changes.
   - Fixed: all updated to `v2.5.5`.

6. **LOW — Version Number Not Bumped:**
   - All `package.json` files and the dashboard footer still at `2.5.1`.
   - Fixed: bumped to `2.5.5`.

### Complete System Validation Summary

- **Infrastructure:** API build clean (Exit 0), DB connection retry + pgbouncer, Railway health endpoint, Vercel config verified
- **Authentication:** JWT + session DB cross-check, lockout, heartbeat, logout, emergency unlock — all working
- **RBAC:** 15 roles verified, all 4 global guards confirmed, WorkflowStageGuard enforcing per-stage permissions
- **Master Data:** All CRUD operations for Projects, Vendors, SKUs, Users, Roles, Permissions validated
- **Workflow:** All 24 stages validated; 5 end-to-end test cases (full pass, single inspection fail, store available, all inspections fail) all produce correct terminal status
- **Notifications:** All 9 notification categories, all 6 API endpoints validated
- **Email:** CC from env, SMTP graceful fallback, rejection + SLA reminder + escalation emails validated
- **SLA Engine:** Init on submit + draft-submit, refresh cron, breach detection, delay start, escalation chain — all correct
- **Dashboard:** All KPIs accurate and sourced directly from DB; SLA cards fixed
- **Reports:** Pagination, search, filter, export all functional
- **Database:** FK integrity, cascades, transactions, connection pooling validated
- **APIs:** All 30+ endpoints tested — auth, pagination, filtering, error handling
- **Performance:** Parallel SLA refresh, pre-fetched actor in bulk ops, indexed queries
- **Security:** No hardcoded secrets/emails, RBAC everywhere, JWT enforced, CORS restricted, input validation

---

## IFH One v2.5.1 (QA Sprint — Bug Fix Release)

**Date:** 2026-07-06
**Type:** Bug Fix / QA Sprint

### Bugs Fixed

1. **CRITICAL — NestJS Route Ordering (`procurement.controller.ts`):**
   - `bulk-action/preview`, `bulk-action/multi`, `sla-summary`, `escalation-summary`, and `stage-kpis/:stage` routes were registered AFTER the `:id` wildcard. NestJS resolves routes in declaration order, so all those specific routes would be absorbed by the wildcard and return 404. Fixed by reordering all static routes before parameterized routes.

2. **CRITICAL — N+1 Queries in Bulk Operations (`procurement.service.ts`):**
   - `bulkStageAction()` and `bulkMultiStageAction()` were fetching `actor` and `creator` user records **inside** the `Promise.all` batch loop — one DB query per procurement record. Fixed by pre-fetching `actor` once before the batch loop; `creator` is fetched per-record (needed per recipient) but now only once per record instead of twice.

3. **CRITICAL — Missing SLA Hook in `updateDraft()` (`procurement.service.ts`):**
   - When a draft indent was submitted via `PATCH /procurement/:id/draft`, `slaMonitor.onStageActivated()` was never called. SLA tracking for Stage 1 was silently skipped for all draft-submitted indents. Fixed by adding the SLA activation hook after draft submission.

4. **BUG — Rejection Email Never Triggered (`procurement.service.ts`):**
   - `sendRejectionEmail()` was implemented but never called in `stageAction()`. Any REJECT action at any stage silently dropped the rejection email. Fixed by calling `sendRejectionEmail()` whenever `action === 'REJECT'`.

5. **BUG — Inconsistent `duplicateDraft()` (`procurement.service.ts`):**
   - Duplicated procurements were created with `currentStage: 1` but the created stage record used `stageName: 'Indent Creation'` (which is Stage 0). Reference number used `IFH-{timestamp}` pattern instead of the standard `IND-{year}-{seq}` format. Fixed: now uses `generateReferenceNo()`, creates Stage 0 correctly, and uses `actorId` instead of raw `userId`.

6. **BUG — `getDashboardStats()` authFilter on Related Models (`procurement.service.ts`):**
   - When scoped to a specific user, `procurementHistory.findMany({ where: { procurement: authFilter } })` and similar stage queries would silently fail or produce incorrect results because Prisma's `where.procurement` cannot accept nested OR/AND filters with `stages.some`. Fixed by pre-computing a `procurementIdFilter` (list of IDs the user has access to) and using `{ procurementId: { in: [...] } }` on related models.

7. **DEAD CODE — `STAGE_TAT_HOURS` constant (`procurement.service.ts`):**
   - Legacy TAT map was defined at module level but never referenced after the SLA Engine was introduced. Removed to prevent confusion.

8. **TYPE BUG — Missing `sla` field in `DashboardStats` interface (`apps/web/src/lib/api/procurement.ts`):**
   - Backend returned `sla: { onTrack, approaching, breached }` but frontend type had no `sla` field. Dashboard KPIs were silently `undefined`. Fixed by adding the optional `sla` field to the type.

9. **VERSION MISMATCH — Web app still on v2.2.0 (`apps/web/package.json`, dashboard footer):**
   - Web app `package.json` version and dashboard footer were not updated when API was bumped to v2.5.0. Fixed: bumped to v2.5.1.

### Improvements
- **SLA KPI Cards:** Added three real-time SLA status cards to the main dashboard (On Track, Approaching, Breached) — powered by live backend data.
- **API Client Completeness:** Added `SlaRecord`, `SlaDashboardSummary`, `EscalationSummary` TypeScript types and corresponding API functions (`getSlaDashboardSummary`, `getSlaRecords`, `getEscalationSummary`, `deleteProcurement`, `duplicateProcurement`, `assignStage`).
- **CHANGELOG.md:** Created user-facing changelog at root of monorepo.

---

## IFH One v1.10.0 (Unified Procurement Workflow — S1–S22 Enterprise Workspace)

- **Generic Stage Workspace Engine**: Introduced `StageWorkspace` (`apps/web/src/components/workflow/generic/`), a single config-driven component replacing per-stage bespoke pages. Every actionable stage (1–22) now renders the same header/summary strip/tab set (Overview, Items, Documents, Workflow, History, Audit Logs)/validation drawer/decision footer, differing only by the `StageConfig` passed in.
- **Stage Config Registry**: `apps/web/src/lib/workflow/stage-config-types.ts` defines the schema (fields, item fields, actions, validation rules, summary fields, KPIs); `apps/web/src/lib/workflow/stage-configs/` holds one config file per stage (s1 through s22), extracted from the previous `DynamicStageRenderer` mock implementation's real field/action shape.
- **19 New Stage Detail Pages**: RFQ Float, Techno-Commercial Evaluation, Negotiation, PO Creation, PO Approval L1/L2, Vendor Acceptance, Vendor Follow-Up, Material Receipt, Material/Secondary/Final Inspection, Debit Note, Bill To Accounts/Purchase, Bill Creation, Tally Entry, Bill Approval L1/L2, and Payment Advice previously had no dedicated `[id]` page (queue rows fell through to the generic read-only `/procurement/[id]`) — all now have a full actionable workspace.
- **Stage 1 & 2 Migrated**: Indent Verification and Store Check (previously the two most mature bespoke implementations) were migrated onto the same generic engine; their now-orphaned bespoke components (`components/indent-verification/`, `components/store-check/`) and unused API types (`VerificationChecklist`, `StoreCheckPayload`, etc.) were removed.
- **Metadata-Backed Field Persistence**: Stage-specific structured data (PO Number, GRN Number, Invoice Amount, Tally Voucher, Payment Advice fields, etc.) persists through the existing `ProcurementStage.metadata` JSON column via `performStageAction()`'s metadata parameter — no schema migration; consistent with the pattern Store Check already used.
- **Bulk Update on Every Queue**: `WorkflowQueuePage` (shared by all 20 stage list pages) gained row selection, a sticky bulk action bar, and the same "Change Workflow Stage" bulk modal previously only available on the main Procurement list.
- **Config-Driven Validation**: Each stage's readiness checklist is a set of pure `(context) => boolean` rules evaluated against live field values and the procurement record — no hardcoded per-stage validation components.

## [1.9.1] - 2026-07-02
### Added
- Indent Verification Officer (INDENT_VERIFIER) role.
- Detailed Stage 1 & 2 RBAC permissions for Indent Verification flow.
- Enhanced UI sidebar to respect module-level permission constraints natively.

## IFH One v1.9.0 (Enterprise Verification Workspace Refinement)

- **Pivot to Tabbed Layout**: Redesigned the "View Indent" workspace from a 3-panel dashboard to a full-width ERP tabbed layout (Overview, Items, Documents, Workflow, History) prioritizing data density.
- **Enterprise Data Grid Expansion**: The item review grid now spans 100% of the horizontal space, incorporating sticky headers, sticky selection columns, and all requested enterprise columns inline (e.g. Technical Spec, Approved Makes).
- **Horizontal Sticky Action Footer**: Verification decisions (Approve, Reject, Hold) and overall remarks have been moved to a persistent sticky footer spanning the bottom of the viewport, removing the need for a constant right-hand sidebar.
- **System Health Drawer**: Replaced the permanent right-side checklist with a compact validation badge in the header that opens a slide-out drawer containing the automated health checklist.

## IFH One v1.8.0 (Enterprise Verification Workspace Redesign)

- **Redesigned View Indent Workspace**: Restructured the S2 verification stage into a modern 3-panel layout (Left Panel, Grid, Right Panel) with a sticky header.
- **Enterprise Data Grid**: Transformed the item review section into a robust data grid occupying 75% width. Added support for inline editing of "Responsible Person", "Verification Status", and "Remarks".
- **Bulk Action Toolbar**: Implemented a floating toolbar that appears when multiple items are selected, allowing for bulk status assignments and delegations.
- **Smart Insights**: Added contextual smart insights generated on row expansion, providing warnings (e.g., price increases) or positive suggestions (e.g., alternative SKUs).
- **Automated Health Checklist**: Replaced the manual checklist with a system-generated health check that reads data completeness automatically before approving.

## IFH One v1.7.0 (Enterprise Bulk Verification Workspace)

- **Redesigned Indent Verification Workspace**: Transformed the verification queue into an enterprise-scale data grid spanning 29 contextual columns for real-time visibility without opening each indent.
- **Bulk Item Verification**: Bulk actions now operate at the *item* level (instead of the *indent* level) to reflect live procurement processes.
- **Quick Fill Modal**: Introduced a lightweight bulk-update modal allowing users to rapidly assign "Responsible Person", "To / From", and "Remarks" for multiple items simultaneously.
- **Schema & Service Updates**: Added \`assignedToId\` and \`toFrom\` fields to \`ProcurementItem\`. Refactored backend \`bulkMultiStageAction\` to group and process individual items efficiently in batch transactions.

## IFH One v1.6.0 (Bulk Workflow Stage Management)

- **Bulk Stage Update System**: Added enterprise-grade bulk operations to the Procurement module — multi-select (checkbox, page, all-filtered across pages), sticky action toolbar, and a "Change Workflow Stage" modal that previews eligible/blocked records before applying one workflow action to many indents at once.
- **Reused State Machine**: Bulk execution calls the existing private `resolveStageTransition()` state machine per record (same one single-record `stageAction()` uses), so bulk updates can never perform an invalid transition — ineligible records are skipped with a stated reason instead of failing the batch.
- **New Endpoints**: `POST /procurement/bulk-action/preview` (dry-run eligibility check) and `POST /procurement/bulk-action` (execute), both gated by a new `RolesGuard` + `@Roles()` decorator restricting access to SUPER_ADMIN, ADMIN, DOER.
- **New `BulkOperation` Prisma Model**: Records actor, role context (via performedBy), total/eligible/updated/skipped/failed counts, remarks, notify flag, IP address, duration, and a JSON result detail — a durable audit trail separate from per-record `ProcurementHistory`.
- **Batched, Non-Blocking Execution**: Records are processed in batches of 25 inside per-record Prisma transactions; one record's failure doesn't roll back others already committed. Each successful record still gets its own `ProcurementHistory` entry tagged `metadata.updateType = 'BULK_UPDATE'`.
- **Live Cache Invalidation**: Bulk completion triggers `useInvalidate().invalidateAll()` (React Query) so dashboard KPIs, control tower, and procurement lists reflect changes without a page refresh.
- **Fixed Latent Build Bug**: `jwt.strategy.ts` had an implicit-`any` on `validate()`'s return path (masked by stale `tsbuildinfo` incremental cache) surfaced during a clean rebuild triggered by this change; annotated the `.map()` callback parameter to resolve it.
- **Version Bump**: Updated root, `apps/api`, and `apps/web` to 1.6.0.

## IFH One v1.5.4 (Production Database Fetch Fix)

- **Prisma Neon Configuration**: Injected pgbouncer=true requirement dynamically for Neon -pooler database connections to resolve prepared statement transaction failures.
- **API Health Timing**: Increased Prisma pingCheck timeout limit to 10s to gracefully handle serverless DB cold starts.
- **CORS Resiliency**: Automatically allow wildcard *.vercel.app origins for preview environments.
- **Build Lifecycle**: Enforced Prisma client generation during backend deployment via postinstall hook.

## IFH One v1.5.3 (Workflow Reorganization & User CRUD)

- **Sidebar Reorganization**: Moved Archived Indents from Command Center to Workflow Management.
- **User CRUD Complete**: Implemented Soft Delete, Restore, Force Password Reset, and Account Unlock for users.
- **User Management UI**: Redesigned User Page with advanced multi-parameter filtering, clear statuses, and extensive modals.
- **Procurement Dataset**: Added 30 realistic test records distributed accurately across stages with historical timestamps.
- **Version Bump**: Updated all components to 1.5.3.

# Purpose
An AI-readable project summary tracking the evolution of the system to help future agents quickly understand implementation milestones without scanning the repository history.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-07-02

# Related Documents
- [CURRENT_CONTEXT.md](./CURRENT_CONTEXT.md)
- [PROJECT.md](./PROJECT.md)

---

## Current Architecture
- **Version:** V1.10.0
- **Type:** Decoupled Monolith in a Turborepo.
- **Frontend:** Next.js (App Router), Tailwind v4, Zustand.
- **Backend:** NestJS, Prisma, Neon PostgreSQL.

## Milestone: V1.5.2 (Dashboard Cleanup & KPI Redesign) (2026-07-01)
- **Dashboard Cleanup:** Completely removed the old "Requires Attention" section to streamline the UI.
- **Command Center Removal:** Entirely removed the Procurement Command Center module from the frontend and backend.
- **Control Tower Redesign:** Updated Workflow Control Tower KPI cards to focus strictly on: Total Indents, In Progress, On Hold, Rejected, and Completed.
- **Backend Optimizations:** Refactored `getDashboardStats()` service to accurately compute and return the new procurement KPI set.

## Milestone: V1.5.1 (Repository Cleanup & Deployment Readiness) (2026-07-01)
- **Repository Audit & Cleanup:** Comprehensive audit of entire codebase, removing unused files, dead code, temporary artifacts, and duplicate utilities.
- **Deployment & Config Audit:** Verified Vercel and Railway configuration, dependencies, and environment setups. Validated successful production builds.

## Milestone: V1.5.0 (Enterprise Landing Experience) (2026-07-01)

### Major Modules Implemented
- **Enterprise Landing Page:** A completely redesigned public website (`apps/web/src/app/(public)/page.tsx`) following a premium, white-first SaaS aesthetic inspired by Vercel/Linear. It includes 15+ sections, an interactive 22-stage workflow visual, a product showcase mockup, an enterprise search demo, and scroll-reveal animations.
- **Live Platform Stats:** `getPublicStats` API endpoint implemented to dynamically fetch live aggregated counts (items, users, vendors, procurements, departments) for the landing page social proof counters.
- **Login Redesign:** A modern split-screen login page with a dedicated IFH One branding panel and breadcrumb navigation.

## Milestone: V1.4.2 Live Profile Analytics (2026-06-30)
- **Profile Module Analytics:** Replaced hardcoded values in the Profile Module with live database-driven statistics.

## Milestone: V1.4.0 Profile Enhancement (2026-06-30)
- **Enterprise Profile:** Rebuilt User Account Center with security insights, activity logs, permissions matrix, and role visibility.

## Milestone: V1.3.1 Production Release (2026-06-29)
### Major Modules Implemented
- **Procurement Command Center:** Central operational cockpit providing a real-time view of every procurement record.
- **Authentication & RBAC:** Comprehensive permissions engine.
- **Master Data Models:** Projects, Vendors, and Items.
- **Procurement Engine:** 23-stage workflow tracking.
