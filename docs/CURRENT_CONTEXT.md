# Purpose
Provides a live snapshot of the project's current state, active modules, recently completed work, and pending tasks.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-07-08

# Related Documents
- [PROJECT.md](./PROJECT.md)
- [CHANGELOG_AI.md](./CHANGELOG_AI.md)

---

## Current Architecture Snapshot

The IFH One platform is a decoupled monolith in a Turborepo:

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind v4, React Query v5 |
| Backend | NestJS 11, Prisma 5, Node 24 |
| Database | Neon PostgreSQL (serverless), pgbouncer pooler |
| Auth | JWT (8h) + DB sessions, bcrypt, account lockout |
| Background Jobs | `@nestjs/schedule` cron — 5 jobs (10min/30min/1h/2h/midnight) |
| Email | Nodemailer, HTML templates, CC from env |
| Deployment | Railway (API), Vercel (Frontend), Neon (DB) |

---

## Implementation Status

The project is at **Version 2.8.2**. This is the first version of the codebase committed to git since 2.5.5 — versions 2.6.0 through 2.8.1 existed only as local working-tree changes and were never deployed; production (Railway/Vercel) ran 2.5.5-era code until this release.

### Active Modules (All Operational)
- Authentication & RBAC Engine (JWT + session DB + 4 global guards)
- Global Dashboard (SLA KPIs — live, accurate)
- Procurement State Machine (S0–S23, 24 stages)
- SLA Engine — `SlaRecord` authoritative tracking per stage per indent
- Delay Engine — `DelayLog` per stage breach event
- Reminder Engine — 5 trigger types, deduplication via `ReminderLog`
- Escalation Engine — L1/L2/L3, `EscalationLog`, configurable thresholds
- Background Jobs — 5 cron jobs with overlap guards
- In-App Notification System — 8 categories, inbox summary
- Email Notification System — workflow + rejection + SLA + escalation
- Master Data — Vendors, Projects, SKUs (1,918 records), Departments
- Bulk Operations — single-action + multi-action (item-level), preview mode
- Workflow Lifecycle Tracker
- Reports & Analytics
- User Management (CRUD, soft delete, restore, unlock)
- Role & Permission Management
- Audit Trail
- **Procurement Marketplace & Cart** — SKU browsing/search/filter UI + per-user cart + checkout handoff into Indent Creation
- **Material Receipt & Gate Entry System** (`/gate-entry`) — Gate Entry → Quantity Verification → Quality Inspection → Material Allocation → auto-GRN, hooked into Stage 11, with cumulative partial-receipt tracking
- **Email sending is currently disabled** via `EMAIL_ENABLED` (defaults false) pending SMTP re-confirmation — see v2.8.2 below

### Recently Completed Work (v2.8.2 — SKU Search Root-Cause Fix, Email Disable)
- **Root cause fixed:** SKU/Project search connection-pool exhaustion under concurrent load (a `count()` query added in v2.8.1 doubled per-search connection demand against Neon's 5-connection pool). Removed the extra query; `hasMore` is now derived from a `limit+1` over-fetch instead.
- Errors are now surfaced instead of silently returned as empty results; `EnterpriseSkuSelect` shows a retry-capable error state plus one automatic retry on 5xx.
- Fixed a SQL injection risk in `SKUsImportService`'s bulk-update path (raw string-concatenated SQL → parameterized `Prisma.sql`).
- Email sending disabled via `EMAIL_ENABLED` env var (defaults to `false`) pending user confirmation of SMTP config.

### Recently Completed Work (v2.8.1 — Project/SKU Search Fixes)
- Project search (`/projects/search`) capped its previously-unbounded empty-query fallback and added offset pagination.
- SKU search (`searchEnterprise`) extended to search `category`/`subGroup`/`uom`, not just `itemCode`/`description`.

### Recently Completed Work (v2.7.0 — Material Receipt & Gate Entry System)
- New `GateEntry`/`GateEntryItem`/`GRN` Prisma models, hooked into the existing Stage 11 without introducing new stage numbers.
- Cumulative partial-receipt calculation (`ordered − SUM(all prior receipts)`), verified live with a 40-unit PO split across two deliveries.
- New local-disk file upload endpoint (`POST /gate-entry/upload`) — the first working upload endpoint in the API.

### Recently Completed Work (v2.6.2–2.6.3 — Workflow Engine Fixes & Performance)
- Fixed bulk-update stage-number mapping, a race condition in single-record stage transitions (added transaction + optimistic concurrency guard), and several N+1/connection-pooling issues across dashboard, control-tower, and SLA/delay engine background jobs.
- Added `pg_trgm` GIN trigram indexes for SKU/Procurement search columns.

### Recently Completed Work (v2.6.0 — Procurement Marketplace & Cart)
- **Marketplace UI** (`/marketplace`): server-side search/pagination over the SKU catalog, category/sub-group/UOM filters (`GET /skus/facets`), responsive product cards with quantity selector and add-to-cart.
- **Cart Backend**: `ShoppingCart`/`ShoppingCartItem` Prisma models (one active cart per user); `CartModule` with `GET/POST/PUT/DELETE /cart` and `POST /cart/checkout`.
- **Checkout Handoff**: Cart contents pass to the existing Create Indent page via a client-side snapshot (`sessionStorage`) — the item table pre-fills SKU/description/UOM/quantity; the user still completes and submits the unmodified existing indent form. Cart clears only after successful submission.
- **RBAC**: Marketplace browsing open to all; checkout requires `indent.create` (`PermissionsGuard` + `@RequirePermissions`).
- **No Duplication**: Existing indent-creation logic, workflow engine, SLA/notification/email pipelines are untouched — the marketplace is purely a second entry point into the same `createProcurement()` path.

### Recently Completed Work (v2.5.5 — Production Readiness Audit)

#### Bugs Fixed
1. **Dashboard SLA KPIs** — `getDashboardStats()` now queries `SlaRecord.slaStatus` for all three SLA KPI values. The old arithmetic approximation (`inProgress - breached - approaching`) produced incorrect results and is removed.
2. **Hardcoded Emails Removed** — `notification.service.ts` no longer contains any email addresses. CC recipients are loaded from `NOTIFICATION_CC_EMAILS` environment variable.
3. **`require()` Inside Method** — `users.service.ts#changePassword` used inline `require('bcrypt')`; fixed to use the existing top-level import.
4. **Sequential SLA Refresh** — `sla-engine.service.ts#refreshActiveSlaRecords` now uses `Promise.all()` per 100-record batch instead of a sequential loop.
5. **Stale Version Comments** — `main.ts`, `fetch.ts`, `AuthContext.tsx` all corrected to v2.5.5.
6. **Version Sync** — All `package.json` files and dashboard footer updated to 2.5.5.

#### Security Hardening
- No secrets or email addresses embedded in source code
- `NOTIFICATION_CC_EMAILS` env var documented in `env.validation.ts` and `.env.example`
- All hardcoded values replaced with configurable env-driven alternatives

#### Validation Completed
- Full end-to-end validation of all 24 workflow stages
- All 5 procurement test cases (TC-01 through TC-05) validated
- All 30+ API endpoints tested
- All RBAC roles (15 roles) verified
- All background jobs (5 cron jobs) verified
- SLA/Reminder/Escalation engine chains verified
- Database integrity (FK, cascades, transactions) verified

### Recently Completed Work (v2.5.1 — Bug Fix Sprint)
- Route ordering fix (critical NestJS wildcard issue)
- N+1 query fix in bulk operations
- Missing SLA hook in `updateDraft()`
- Rejection email fix
- `duplicateDraft()` reference number + stage fix
- Dashboard auth filter fix for non-admin users
- SLA KPI cards added to dashboard
- Type completeness for `SlaRecord`, `SlaDashboardSummary`, `EscalationSummary`

### Recently Completed Work (v2.5.0 — Enterprise SLA Engine)
- `SlaRecord`, `DelayLog`, `ReminderLog`, `EscalationLog` models
- 5-trigger reminder engine with deduplication
- 3-level escalation engine with configurable per-stage thresholds
- 5 background cron jobs replacing single 30-min monitor
- Enhanced notifications: `notifyAssignedUser()`, role-filtered broadcast, inbox summary
- Dashboard SLA KPIs, Control Tower escalation counts

---

## Pending Tasks / Known Issues

### Frontend UI (Not Blocking for Production)
- **SLA Detail View:** No dedicated per-indent SLA timeline UI. The API (`GET /procurement/:id/sla`) returns full SLA records; frontend rendering is pending.
- **Stage Assignment UI:** No dedicated modal for assigning users to specific stages. Possible via API and bulk operations.
- **Dark Mode:** CSS variable tokens defined in `globals.css`; the toggle UI and comprehensive dark-mode testing are not built.

### Architecture Notes
- SLA uses wall-clock time (not business hours) for live timers. Business hours utility (`calculateBusinessHours()`) exists but is for reporting only.
- `StageConfiguration` table drives all TAT and escalation thresholds. Default fallback TAT values are in `DEFAULT_TAT_HOURS` in `sla-engine.service.ts`.
- `TatMonitorService` is retained as an empty `@deprecated` class for backward compatibility; no logic resides there.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | JWT signing secret (min 10 chars) |
| `PORT` | No | API port (default 3001) |
| `NODE_ENV` | No | `development` \| `production` \| `test` |
| `FRONTEND_URL` | No | Comma-separated allowed CORS origins |
| `SMTP_HOST` | No | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (default 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASSWORD` | No | SMTP password |
| `EMAIL_FROM` | No | Sender address (default `noreply@ifh-one.com`) |
| `NOTIFICATION_CC_EMAILS` | No | Comma-separated CC list for workflow emails |

---

## Deployment Checklist (v2.5.5)

- [x] `npm run build` exits 0 (no TypeScript errors)
- [x] All critical bugs fixed
- [x] Security issues resolved
- [x] Version numbers consistent across monorepo
- [x] Documentation updated
- [x] `CHANGELOG.md` updated
- [x] Prisma migration `20260706000000_v2_5_0_sla_engine` must be deployed if not yet applied: `npx prisma migrate deploy`
