# Changelog

All notable changes to IFH One Procurement ERP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.10.0] - 2026-07-21

### Added
- Complete end-to-end procurement workflow tracking from S0 (Indent Creation) through S14 (Inspection Level 3).
- Added Vendor Acceptance tracking workflow logic.
- Implemented robust `updateVendorFollowup` endpoint for external vendor workflow status synchronization.
- Expanded Inspection API functionality with status updates and KPI dashboards.

### Changed
- Standardized `.eslintrc` and linting rules across `api` and `web` workspaces for cleaner CI pipelines.
- Consolidated `ProcurementItem` model dependencies. Fixed TypeScript mandatory field inconsistencies in `Prisma` configurations regarding `performedById` and `rejectedById`.
- Migrated legacy `objects.txt` documentation into standard repositories.

### Fixed
- Fixed critical syntax and logic error in `poApprovalL1Action` that was prematurely terminating promises.
- Resolved over 500 strict TypeScript and React Hooks exhaustive-deps linting errors in frontend and backend.
- Corrected decimal parsing within template literals in `gate-entry.service.ts`.
- Removed all stray testing environment variables from production config.
- Cleaned up unverified, unused script files to ensure repository hygiene.

### Security
- Purged hardcoded `DATABASE_URL` and `AUTH_SECRET` strings from committed `.env` files in `apps/api`.
- Added strict `.gitignore` configurations for `uploads` and `cache` directories to avoid accidental staging of user data.

## [2.8.6] - 2026-07-10


### Fixed
- **Root cause of empty Doer Name column: `StageConfiguration.stageNumber` was off by one against the real runtime workflow numbering.** `PROCUREMENT_STAGES`/`resolveStageTransition()` number Indent Verification as stage 1, but every `StageConfiguration` row in the database was stored one higher (Indent Verification at `stageNumber: 2`, etc.). Every stage-transition lookup (`stageConfigs.find(c => c.stageNumber === nextStageNum)`, in all three of `stageAction()`, `bulkStageAction()`, and `bulkMultiStageAction()`) was therefore matching the wrong row or nothing — silently leaving `assignedToId` unset. Renumbered all 22 `StageConfiguration` rows down by one (verified zero collisions before applying) and repopulated each stage's default-owner list and TAT hours per the approved doer/TAT mapping.
- **"AO Assigned User" stages (RFQ Float, Techno-Commercial Evaluation, Negotiation, PO Creation) now correctly carry forward the doer assigned during Indent Verification**, instead of staying unassigned. Implemented in all three stage-transition code paths; verified live — a record assigned to a specific user at Indent Verification retained that same assignee through Store Check and into RFQ Float (a dynamic-owner stage), even when a different assignee was passed at an intermediate stage.
- Removed a hardcoded, unwired-to-real-data mock `DOERS` array from the Indent Lifecycle report page; "Doer Name" there now resolves from the real `assignedTo` relation (added to `ReportRecord`/`getAllRecordsForReports()`), falling back to the stage's configured responsible list only when genuinely unassigned.

### Removed
- **Estimated Cost feature removed completely**, per explicit requirement: `Procurement.estimatedValue` and `ProcurementItem.estimatedRate` columns dropped from the database (migration `20260710000000_remove_estimated_cost`), removed from `CreateProcurementDto`, `procurement.service.ts` (mapping/selects/response), and every frontend usage — Control Tower's "Total Value" KPI tile, the Indent Details "Estimated Value"/"Budget" fields and item-table "Est. Cost" column, the legacy `/procurement/[id]` detail page, the details modal, and `summaryFields` across all 6 affected stage-config files. `ProcurementItem.approvedRate` (a distinct field) and its calculations are untouched.
- Removed a validation rule in the Indent Verification stage config that only checked `!!estimatedValue` — with the field gone, the check was replaced with nothing meaningful to test, so it was dropped rather than repurposed.

### Changed
- **Standardized timestamp format app-wide to `dd MMM yyyy HH:mm:ss`** (e.g. "10 Jul 2026 14:35:42"). Rewrote the two shared formatters (`formatDate`/`formatDateTime` in `procurement-stages.ts`, used by 14+ files including Workflow/History/Audit Logs tabs) to this fixed format instead of locale-dependent `toLocaleDateString`/`toLocaleString` calls. Added a matching backend formatter (`common/date-format.ts`) and applied it to all 5 `procurement.notification` event timestamp fields, which previously used server-locale-dependent `.toLocaleString()`. Also fixed Audit Trail and Notifications pages' local inline formatters to use the shared function.
- Synced the SLA engine's hardcoded `DEFAULT_TAT_HOURS` fallback map (used only if a `StageConfiguration` row is ever missing) to match the corrected, authoritative DB values — Material Receipt (stage 11) is now 24h in both places, matching "as configured" per the approved TAT table.

### Verified
- **Total Processed KPI** (`getStageKPIs`) confirmed already stage-scoped (`where: { stageNumber }`, fixed in v2.6.3) — live check on Indent Verification returned only that stage's record count, not an org-wide total. `getDashboardStats` has no "Total Processed" field at all, so no dashboard-level fix was needed.
- **5 realistic test indents** created via the real `POST /procurement` API (not direct DB writes) — distinct projects (Balrampur Chini, Aresco, Atmasco, Atamastco Durg), categories (Mechanical, Electrical, Safety, Consumable, Instrumentation), priorities (HIGH/NORMAL/URGENT/LOW), and multi-item baskets (2–4 items each). All 5 confirmed left at Indent Verification (stage 1).
- **TAT/SLA**: live-created indent's Indent Verification stage `dueDate` confirmed exactly 6 hours after `startedAt`, matching the approved TAT table.
- Full `npm run build` clean across `apps/api` and `apps/web`.

### Notes
- No changes to the 23-stage workflow's business rules, transition logic, notifications, audit logging, RBAC, or permissions — this release corrects implementation defects (stage-config numbering, missing carry-forward logic, inconsistent timestamp formatting) and removes one UI/data feature (Estimated Cost) per explicit instruction.

## [2.8.5] - 2026-07-10

### Added
- **Store Check (S2) Bulk Update redesigned** into a quantity-reconciliation table: Required Qty (auto, read-only), Available Stock Qty (store input, validated 0–Required), Required Qty to Procure (auto-calculated live). Action (Available/Not Available) is now derived automatically from the shortfall instead of manually selected.
- **Backend:** `bulkMultiStageAction()` now applies the same shortfall-quantity reduction the single-record path already had (`ProcurementItem.quantity` set to the shortfall on `NOT_AVAILABLE`) — previously bulk Store Check silently ignored this. Also fixed `combinedAction` so a mixed-availability bulk selection (one item fully in stock, another short) always proceeds to RFQ rather than picking an arbitrary action.
- Confirmed Indent Verification (S1) Bulk Update redesign — fixed Responsible Person/Hold-Cancelled/To-From dropdowns — from the prior release; no further changes needed.

### Fixed
- `openBulkModal()` seeded `bulkUpdates` keyed by procurement id while every read/write in the table used item id — for multi-item indents this meant per-item defaults were never pre-filled. Now keyed consistently by item id.

### Verified
- Live test: a 2-item indent through Store Check with mixed availability (Item A: required 100, available 40 → shortfall 60; Item B: required 50, available 50 → shortfall 0) correctly moved the whole indent to RFQ (stage 3), with Item A's quantity reduced to 60 and Item B's to 0.
- Full `npm run build` clean across `apps/api` and `apps/web`.

### Notes
- No changes to the 23-stage workflow, `resolveStageTransition`, notifications, audit logs, RBAC, or database schema — only Bulk Update UI and the bulk-multi-stage quantity-carry logic that mirrors existing single-record behavior.

## [2.8.4] - 2026-07-08

### Added (UI Refinement pass)
- Merged the View page's Overview + Items tabs into one "Indent Details" tab with clear sections (Indent/Project/Commercial/Technical Information + an Item Details table), per the redesigned ERP-style layout.

### Changed
- **Action → View is now read-only across all 20 shared stage-detail pages** (Store Check, RFQ Float, Techno-Commercial Evaluation, Negotiation, PO Creation/Approvals, Material Inspection, Bill/Payment stages, etc. — every stage built on the shared `StageWorkspace` component). Updating a record is now possible **only** through Bulk Update on the stage queue page, per explicit requirement.
- Removed every editable control from the detail view: the Items tab's row selection/bulk-edit toolbar/input cells, and the Decision Panel's field inputs (text/number/date/select/textarea/checkbox), remarks textarea, and Approve/Reject/Hold/etc. action buttons. Both now render the same data as plain, styled text.
- Removed the `performStageAction()` call and its `POST /procurement/:id/action` request entirely from this page — it fires zero write requests. (The endpoint itself is untouched and still backs Bulk Update and two other UI surfaces not in scope for this change.)
- Overview, Documents (view/download only, no upload path existed here already), Workflow, History, and Audit Logs tabs are unchanged — they were already pure display.
- `useStageFields` (owned editable form state, setters, submit-payload builder) replaced by `useStageFieldValues` (reads the same persisted `ProcurementStage.metadata` values for display only, no state mutation).

### Fixed
- Excluded two dangerous standalone ops scripts (`reset.ts`, `fix-rbac.ts`) from the API's build (`tsconfig.build.json`) — they were being swept into the NestJS compile by TypeScript's default file inclusion and had type errors blocking the build, alongside an already-excluded `reset-db.ts`.

### Verified
- Source-level check confirms zero `<input>`/`<select>`/`<textarea>`/`onChange`/`onSubmit`/`performStageAction` references remain anywhere in the three rewritten components.
- Live test: drove a fresh test indent through 9 individual stage actions to a StageWorkspace-backed stage, confirmed the record loads correctly; Bulk Update's code path (`performBulkMultiStageAction`) is untouched and separate.
- Full `npm run build` clean across `apps/api` and `apps/web`.

### Notes
- No change to business logic, stage transition rules, permissions, or the Bulk Update feature itself — this release only removes write capability from one specific UI surface (the per-record detail view), consistent across all roles (Super Admin, Admin, Purchase, Store, QA, Accounts, Viewer alike).
- `/procurement/:id` (the older, separate Indent Creation detail page), `/gate-entry/:id`, and `/indents/:id` were explicitly out of scope for this change and were not touched.

## [2.8.2] - 2026-07-08

### Fixed
- **Root cause of intermittent SKU search failures: connection pool exhaustion.** v2.8.1 added a `count()` query alongside every `searchEnterprise()` search (via `Promise.all`) to report exact totals. Against Neon's 5-connection pool, this doubled per-request connection demand, and under any concurrent usage (multiple users searching, background jobs) the pool exhausted and Prisma threw `P2024 (connection pool timeout)` / `P1017 (server closed the connection)`. The method's own `catch` block then silently reported this as an empty search result — exactly the "search returns no data, inconsistently" symptom described in this ticket. Reproduced live: a burst of concurrent searches reliably triggered the error and a false `total: 0`.
- **Fix:** removed the extra `count()` call from both `SKUsService.searchEnterprise()` and `ProjectsDbService.search()`. `hasMore`/`total` are now derived from requesting one extra row (`limit + 1`) instead of a second query — one connection acquisition per search, not two. Verified with 10 concurrent searches against the real 17,679-row SKU table: all returned correct, identical results with zero pool errors (previously this reliably failed).
- **Errors were being masked as empty results.** `searchEnterprise()`'s catch block returned `{items: [], total: 0}` on any failure, indistinguishable from a genuine "no matches." It now re-throws, and `EnterpriseSkuSelect` surfaces a distinct "Couldn't load SKU results" state with a Retry button, plus one automatic retry on a 5xx response before showing that state.
- **Internal SKU id never reached the indent form.** `SkuOption` (the shape returned by the SKU picker) never carried the SKU master row's own `id` — only `itemCode`. The Indent Creation form's `ItemRow.masterItemId` field existed but was never populated. Wired `id` through the picker and into `onSkuSelect`. (Note: this doesn't change indent submission — the backend already re-resolves `skuId` server-side by `itemCode` via `linkItemToSku()`, so this was a display/reference gap, not a functional one.)
- **SQL injection risk in SKU bulk-import.** `SKUsImportService`'s bulk-update path built a raw `UPDATE ... FROM (VALUES ...)` statement by string-concatenating imported spreadsheet values (itemCode/description/uom/category/subGroup) with only basic quote-escaping, executed via `$executeRawUnsafe`. Replaced with `Prisma.sql`/`Prisma.join` tagged templates, which bind every value as a real query parameter — same batched-update performance, no string interpolation of untrusted data.

### Changed
- **Email sending disabled** pending user confirmation of SMTP configuration, per explicit request. Controlled by a new `EMAIL_ENABLED` environment variable (defaults to disabled) rather than the unreachable-dead-code early-return that was previously in place — re-enable by setting `EMAIL_ENABLED=true` once ready. Verified live: a real workflow action correctly logged `[EMAIL LOG] Sending disabled` instead of attempting to send.
- SKU/Project search result counts (`total`) are now an honest lower-bound estimate ("30+ results") rather than a claimed exact count, since computing an exact count would require the connection-pool trade-off this release just removed.

### Notes
- No changes to Indent Creation validation, submission, permissions, or workflow logic — this release only touches SKU/Project search query shape and the two picker components' error/loading states.
- This is the first commit of v2.6.0 through v2.8.2 — all of that work existed only as uncommitted local changes until now (`git diff` against `origin/develop` showed 0 commits of divergence despite months of feature work). Production (Vercel/Railway) has been running pre-v2.6.0 code the entire time, which independently explains several "features don't exist in production" reports.

## [2.8.1] - 2026-07-08

### Fixed
- **SKU search only matched itemCode/description.** `searchEnterprise()` (used by the Indent Creation form's SKU picker) now also searches `category`, `subGroup`, and `uom`, so typing a category name ("Hardware"), sub-group, or unit ("NOS") now returns matches — previously it silently returned nothing for these fields despite the dropdown displaying them.
- **SKU search silently truncated at 30 results with no way to see more.** Against the real 17,679-row SKU catalog, searches like "MS" (6,897 matches) or "NOS" (15,396 matches) only ever showed the first 30 alphabetically with no indication more existed. `searchEnterprise` now returns `total`/`hasMore`, and `EnterpriseSkuSelect` supports scroll-triggered and click-to-load pagination through the full result set.
- **Project search returned the entire table on every dropdown open.** `/projects/search` fell back to an unbounded `getAll()` for an empty query; at today's ~96 rows this was harmless, but it would not have scaled toward the ticket's stated 20,000+ project target. The empty-query path now goes through the same capped, paginated `search()` used for real queries.
- **Project search had no pagination or total count.** `ProjectsDbService.search()` now returns `{items, total, hasMore}` instead of a bare array, and `ProjectSelect` supports the same scroll/click-to-load-more pattern as the SKU picker.

### Verified
- Live queries against the real dataset (17,679 SKUs, 96 projects): category search ("Hardware" → 11,254 matches), UOM search ("NOS" → 15,396 matches), and page-2 SKU pagination via `offset` all returned correct, non-overlapping results. Project search empty-query now returns 25 of 96 with `hasMore: true` instead of the full table; partial project-name search ("Bihar" → "JK Bihar") and partial project-ID search both confirmed correct.
- Indexes were already in place from prior work (`pg_trgm` GIN indexes on `Item.itemCode/description/category/subGroup/uom` and `Project.projectId/projectName`) — `EXPLAIN ANALYZE` confirmed sub-5ms `Bitmap Index Scan` execution for realistic (3+ character) queries; very short queries ("MS", "CN") correctly fall back to a fast sequential scan, which is expected trigram behavior at this table size, not a defect.
- Full `npm run build` clean across `apps/api` and `apps/web`, including one unrelated pre-existing strict-null-check error in `email.service.ts` fixed to unblock the build.

### Notes
- No changes to indent creation business logic, validation, or submission — only search query shape, pagination, and the two picker components' data-fetching were touched. Auto-mapping of SKU fields (description/UOM/category/subGroup) onto the indent row was already correct in both consumer pages and required no changes.
- The ticket's Project-search examples (`P010`/`P011`/`Boiler Expansion`) don't match the real seeded project data (numeric IDs like `32650`, names like `Balrampur chini`) — treated as illustrative; the fix was verified against real records instead. The SKU example (`CN97000000` → "2 Way Angle Valve") is real data and was verified directly.

## [2.7.0] - 2026-07-08

### Added
- **Material Receipt & Gate Entry System** — new module reverse-engineered from a legacy Google Apps Script gate-entry workflow and rebuilt natively on IFH One's stack (NestJS/Prisma/Postgres + Next.js), reusing the existing Procurement, Vendor, Project, SKU, User, and Notification models rather than duplicating them.
  - **Stage integration:** hooks into the existing 23-stage workflow's Stage 11 ("Material Receipt") rather than introducing new stage numbers — the sub-workflow runs entirely within Stage 11, and only calls the existing `stageAction('SUBMIT')` to advance to Stage 12 once a PO's full ordered quantity has been received.
  - **Partial receipts (core legacy rule, preserved exactly):** the "remaining quantity" for any PO line item is always computed live as `ordered − SUM(all prior GateEntryItem.receivedQty)` — never a stored running total — so it can never drift from history. PO Search only ever shows the current remaining quantity, not the original ordered quantity, and fully-received items are hidden from selection.
  - **5-step workflow:** Gate Entry (Security) → Quantity Verification (Store) → Quality Inspection (QC: Accepted / Rejected / Accepted with Deviation, mandatory reason on reject/deviation) → Material Allocation (storage location, skipped for rejected items) → automatic GRN generation.
  - **Over-receipt prevention:** validated twice — once against the quantity declared at the gate, and again against the live cumulative remaining quantity — so a stale client read can never cause an over-receipt.
  - **GRN:** auto-generated on allocation submit, splitting `totalAcceptedQty`/`totalRejectedQty`; rejected quantity is excluded from the accepted total and never flows toward inventory.
  - **New Prisma models:** `GateEntry`, `GateEntryItem`, `GRN` (+ `GateEntryStatus`/`QualityStatus`/`GateEntryItemStatus` enums), reusing `ProcurementAttachment` for invoice/material photos and `Vendor`/`User`/`Procurement`/`ProcurementItem` for all other relations.
  - **File uploads:** new local-disk upload endpoint (`POST /gate-entry/upload`, multer + static serving at `/uploads/*`) — the first working file-upload capability in the API; `ProcurementAttachment.fileUrl` previously had no producer.
  - **New permissions:** `gate_entry.view`, `gate_entry.create`, `gate_entry.quantity_check`, `gate_entry.quality_check`, `gate_entry.allocate`.
  - **Dashboards:** pending gate entries/quantity checks/QC/GRN/inventory posting, partial receipts, overdue receipts, rejected materials, today's receipts, vendor-wise and project-wise receipt breakdowns.
  - **Frontend:** `/gate-entry` (queue), `/gate-entry/new` (PO search + Step 1), `/gate-entry/[id]` (Steps 2–4 wizard driven by gate entry status), `/gate-entry/dashboard`.

### Fixed
- Three pre-existing, unrelated TypeScript errors surfaced by a full clean build: a dropped `SelectOption` type import and a `SelectOption`/`ProjectOption` type mismatch in `indents/new/page.tsx`, and a reference to a non-existent `SkuOption.description`/`ItemRow.category`/`ItemRow.subGroup` in `procurement/create/page.tsx`. None were caused by this release, but a full build could not pass without fixing them.

### Verified
- Live end-to-end regression via real API calls: a 40-unit PO received as 32 units (truck 1) then 8 units (truck 2) — confirmed PO Search showed remaining = 8 (never 40) after the first delivery, over-receipt of 15 against a remaining 8 was correctly rejected with `400`, rejection without a mandatory reason was correctly rejected, and the underlying Procurement remained at Stage 11 after the partial (32-unit) GRN and only advanced to Stage 12 after the second (8-unit) delivery completed the full ordered quantity.
- Full `npm run build` clean across `apps/api` and `apps/web`.

## [2.6.3] - 2026-07-08

### Performance

- **Database indexes:** enabled the `pg_trgm` extension and added GIN trigram indexes on `Procurement.title`, `Procurement.vendorName`, `Item.description`, and `Item.itemCode` — the search paths in `findAll()` (procurement) and SKU search already used `contains`/`ILIKE`, which previously forced a sequential scan; confirmed via `EXPLAIN ANALYZE` that the planner now uses `Bitmap Index Scan` on the new indexes. Added missing `Procurement.projectId` and `Procurement.vendorId` indexes (filtered on in `findAll()` but previously unindexed). Removed two indexes that duplicated an existing unique-constraint index (`Procurement.referenceNo`, `Item.itemCode`).
- **`getStageKPIs`:** previously fetched every `ProcurementStage` row for a stage and computed approval/rejection counts in JS, plus three sequential SLA queries. Rewrote to use `groupBy`/`Promise.all`, moving the aggregation into the database. Verified byte-identical output before/after on a live stage.
- **Delay Engine background job:** `refreshActiveDelayRecords()` updated each active `DelayLog` row in a sequential `for` loop (one transaction per row), competing with live API requests for the same small Neon connection pool. Batched with `Promise.all`, matching the pattern already used by the SLA engine.
- **Duplicate full-dataset fetch:** `GlobalSearch` (mounted on every page) ran its own independent fetch of up to 2,000 procurement records via `getAllRecordsForReports()`, on top of the same fetch already shared via React Query across Control Tower, Indent Lifecycle, Pending & Delays, and Archived Indents. Switched it to the shared `useAllReportRecords()` cache — eliminates a redundant full-dataset network round-trip on every page load.
- **Unused payload:** `getAllRecordsForReports()` fetched and mapped a nested `items[]` array that no consuming page actually reads. Removed it from the type and the mapping.
- **Bundle size:** `jspdf`/`html2canvas` (Create Indent PDF export) and `recharts` (Profile page charts tab) were imported at module top-level, pulling them into the initial page bundle even though both are only used behind a user action/tab. Converted to dynamic imports (`import()` inline for the PDF handler, `next/dynamic` for the charts tab).
- **Stage queue table re-renders:** `StageQueueWorkspace`'s row markup was inline JSX inside a `.map()`, so toggling one row's checkbox re-rendered every row in the table. Extracted rows into a `React.memo`'d `QueueRow` component and wrapped the selection/navigation handlers in `useCallback`.

### Investigated, not changed

- Live `EXPLAIN ANALYZE` benchmarking showed actual query execution times of well under 1ms on all measured hot paths (list, search, KPI aggregation) — the dominant latency in manual HTTP benchmarks (500ms–5s) was Neon pooler connection/round-trip overhead and local dev-mode query logging, not query planning or missing indexes. Connection pooling config (`pgbouncer=true`, `connection_limit=5`) was reviewed and left as-is; it is an intentional, conservative setting for the serverless/Railway environment.
- The per-item `procurementItem.update()` loop inside `stageAction()`'s store-check transaction was reviewed but left sequential — it is bounded by items-per-indent (small N) and each item has distinct update data, so batching would require a raw `CASE WHEN` query for marginal benefit at this scale.
- The 30-minute SLA-breach-detection loop in `sla-monitor.service.ts` was reviewed but left sequential — each iteration has ordered side effects (delay-tracking creation, escalation) and only processes newly-breached records, which is normally a small set.

### Notes

- No business logic, workflow behavior, or API contracts changed. All fixes are internal implementation changes (indexing, query shape, batching, code-splitting, memoization) verified to produce identical output.

## [2.6.2] - 2026-07-08

### Fixed
- **Critical: Bulk update engine.** `stage-config.ts` mapped each workflow stage to the wrong backend stage number past stage ~11 and offered a hardcoded 4-option action list, so bulk updates on later stages either sent an action the backend rejected or silently applied the wrong one. Rewrote the config with the real backend stage numbers and an explicit per-stage `actions` list sourced from `resolveStageTransition()`'s actual switch cases.
- **Critical: Bulk multi-stage backend defaulted to APPROVE.** `bulkMultiStageAction()`'s `combinedAction` fell back to `'APPROVE'` for any action it didn't explicitly recognize, and the DTO's `@IsIn(['APPROVE','HOLD','REJECT','CLARIFICATION'])` validator rejected every stage-specific action (SUBMIT, PASS, FAIL, AVAILABLE, NOT_AVAILABLE, etc.) before it ever reached the service. Removed the whitelist (validation now happens in `resolveStageTransition`, which already rejects invalid actions) and fixed `combinedAction` derivation to prefer the real per-item action over a silent APPROVE default.
- **Critical: race condition in single-record stage transitions.** `stageAction()` read `currentStage`, then wrote history and advanced the stage in separate, unguarded queries. Two near-simultaneous requests against the same record (e.g. a double-click, or two operators acting on the same indent) could both read the same stale stage and each write a history entry, producing duplicate history/notifications with no error. Wrapped the entire mutation sequence (remark, stage update, next-stage upsert, procurement update, history) in a single `prisma.$transaction`, with an optimistic-concurrency guard (`updateMany({ where: { id, currentStage } })`, checked via `.count === 0`) that now returns `400 "This record was already updated by another action. Please refresh and try again."` on a genuine race — verified with real concurrent requests against a live test record.
- Removed the dead, unused `BulkMultiStageUpdateModal` component and the parallel `useNewBulkModal` code path in `stage-queue-workspace.tsx` that it powered — bulk updates for every stage now go through one tested code path.

### Verified
- Live regression test driving a single indent through all 23 workflow stages (mix of individual and bulk-multi actions), confirming every previously-broken stage now transitions correctly, including the store-availability and inspection PASS/FAIL branching logic.
- Simple `bulk-action` endpoint (single action applied to many records) tested against 3 concurrent test indents — each ended with exactly one `SUBMITTED` and one `APPROVE` history entry, no duplicates or partial updates.
- Database integrity check across all test data created during this audit: zero orphaned `ProcurementStage`/`ProcurementHistory`/`ProcurementItem` rows, zero duplicate stage records, `BulkOperation` audit log counts match actual updated-row counts.
- Final `npm run build` clean across both `apps/api` and `apps/web` after all fixes.

### Notes
- No workflow business logic or stage sequencing was changed, per explicit instruction — this release only corrects the implementation (action derivation, validation, transaction safety) to match the existing, unchanged 23-stage design.

## [2.6.1] - 2026-07-07

### Fixed
- **Marketplace correctness:** removed a hardcoded `status=Active` filter in `getMarketplaceItems()` that silently excluded valid SKUs from search results.
- Added a `subGroup` filter and matching database index (`@@index([subGroup])` on `SKU`) so sub-group filtering doesn't force a full table scan.
- Extended `GET /skus` sorting to cover `subGroup`/`category`/`createdAt`, and added `GET /skus/facets` (distinct categories/sub-groups/UOMs) to drive the filter panel from real data instead of a hardcoded list.
- Added `frequentlyOrdered`/`recentlyOrdered`/`latestAdded` quick filters, scoped per-user via the requester's own procurement history.

### Changed
- **Marketplace UI redesigned as a compact enterprise catalog:** removed product-image placeholders, added a professional filter panel (quick filters, category/sub-group/UOM selects, sort, active-filter chips), and a denser `ProductCard` layout.
- Marketplace data fetching moved to React Query (`useMarketplaceItems`/`useMarketplaceFacets`/`useCart`) with optimistic add/update/remove-from-cart mutations (instant UI feedback, automatic rollback on failure).

### Notes
- Confirmed the underlying SKU catalog has 1,918 real records, not the 18,000+ referenced in the original spec, and that most lack `category`/`subGroup` values — this is a data-population gap, not a code defect, and was explicitly deferred as a separate data task per product decision.
- Checkout still hands off to the exact, unmodified Create Indent form — no parallel form was created.

## [2.6.0] - 2026-07-07

### Added
- **Procurement Marketplace:** New e-commerce-style browsing experience at `/marketplace` — search, category/sub-group/UOM filters, responsive SKU product cards, quantity selector, and an "Add to Cart" flow, built entirely on the existing SKU catalog (18,000+ records) with server-side pagination and filtering.
- **Shopping Cart:** New `ShoppingCart`/`ShoppingCartItem` Prisma models (one active cart per user) and a `CartModule` backend (`GET/POST/PUT/DELETE /cart`, `POST /cart/checkout`) supporting add, quantity update, remove, and clear.
- **Cart → Indent Checkout Handoff:** Checkout hands cart contents to the existing Create Indent page via a client-side snapshot; the item table is pre-filled (SKU, description, UOM, quantity) so the user only fills procurement-specific fields (project, application, required date, technical spec, etc.) before submitting through the unchanged existing indent-creation flow. The cart is cleared only after a successful submission.
- **SKU Facets Endpoint:** `GET /skus/facets` returns distinct categories, sub groups, and UOMs for marketplace filter dropdowns; `GET /skus` gained a `subGroup` filter parameter.
- **Permission Gate:** Marketplace browsing is open to all authenticated users; cart checkout requires the `indent.create` permission (`@RequirePermissions('indent.create')` on `POST /cart/checkout`), enforced via the existing `PermissionsGuard`.

### Notes
- The existing Indent Creation form, its validation, draft-save/auto-save, and submission logic (`createProcurement`) are unchanged — the marketplace only prefills the item rows before the user reaches the existing form.
- No SKU data is duplicated: cart items store a denormalized `itemCode`/`description`/`uom` snapshot for fast rendering but always reference the source `SKU` row by ID.

## [2.5.5] - 2026-07-07

### Fixed
- **Critical:** Dashboard SLA KPI cards (On Track, Approaching, Breached) now query `SlaRecord.slaStatus` directly instead of an arithmetic approximation — values are now accurate and consistent with the SLA Engine
- **Security:** Removed hardcoded employee email addresses from `notification.service.ts` — CC recipients are now configured via `NOTIFICATION_CC_EMAILS` environment variable; source code contains no email addresses
- **Bug:** `changePassword()` in users service used `require('bcrypt')` inline despite bcrypt being imported at the top of the file — fixed to use the module-level import
- **Performance:** `refreshActiveSlaRecords()` in SLA Engine now processes each 100-record batch with `Promise.all()` instead of a sequential `for` loop, reducing refresh wall-clock time proportionally to batch size
- **Maintenance:** Stale `v2.6.1`/`v2.6.0` version comments in `main.ts`, `fetch.ts`, and `AuthContext.tsx` corrected to `v2.5.5`

### Added
- `NOTIFICATION_CC_EMAILS` environment variable for configuring workflow notification CC recipients
- Updated `.env.example` with documentation for all SMTP and notification environment variables

### Changed
- Version bumped to 2.5.5 across monorepo (root, API, web)

---

## [2.5.1] - 2026-07-06

### Added
- **SLA KPI Dashboard Cards:** Added three new visual KPI cards to the main dashboard showing real-time SLA metrics:
  - **SLA On Track** (green) — Indents meeting their SLA deadlines
  - **Approaching SLA** (yellow) — Indents within 10-25% of SLA expiry
  - **SLA Breached** (red) — Indents that have missed their SLA deadline
- **Enhanced API Client:** Added complete TypeScript type definitions for all SLA and escalation endpoints:
  - `SlaRecord`, `SlaDashboardSummary`, `EscalationSummary` types
  - `getSlaDashboardSummary()`, `getSlaRecords()`, `getEscalationSummary()` API functions
  - `deleteProcurement()`, `duplicateProcurement()`, `assignStage()` helper functions

### Fixed
- **Critical:** Fixed route ordering in Procurement Controller — `bulk-action/preview`, `bulk-action/multi`, and `sla-summary` routes now correctly registered before wildcard `:id` routes to prevent 404 errors
- **Critical:** Fixed N+1 database query issue in bulk operations — actor/creator user lookups now performed once before batch processing instead of inside each iteration
- **Critical:** Fixed missing SLA initialization when draft indents are submitted via `updateDraft()` — SLA now correctly starts tracking when a draft transitions to Stage 1
- **Bug:** Fixed rejection email not triggering in `stageAction()` — email now correctly sent to indent creator when any stage is rejected
- **Bug:** Fixed `duplicateDraft()` creating inconsistent state — now correctly creates Stage 0 (Indent Creation) with `currentStage: 0` instead of Stage 1
- **Bug:** Fixed `getDashboardStats()` authFilter breaking related queries — procurement ID filter now pre-computed for history/stage queries when user-scoped filtering is active
- **Bug:** Removed unused legacy `STAGE_TAT_HOURS` constant from procurement service
- **UI:** Updated dashboard footer and web app version from 2.2.0 to 2.5.1 for consistency with API version
- **Types:** Fixed missing `sla` field in `DashboardStats` TypeScript interface (frontend)

### Technical
- **Performance:** Reduced database round-trips in bulk stage operations from O(n²) to O(n) by pre-fetching actor information
- **Code Quality:** Removed dead code (unused TAT constants, redundant user queries)
- **Route Stability:** Enforced correct NestJS route precedence by reordering controller methods

---

## [2.5.0] - 2026-07-06

### Added — Enterprise SLA, Delay, Notification & Reminder Engine

#### Core SLA Engine
- **Dynamic SLA Calculations:** All SLA metrics now driven by `StageConfiguration.tatHours` — no hardcoded values
- **New Database Model: `SlaRecord`**
  - `stageEnteredAt`, `slaDurationHours`, `dueAt`, `completedAt`
  - `elapsedHours`, `remainingHours`, `delayHours`
  - `slaStatus`: `ON_TRACK`, `APPROACHING_SLA`, `SLA_BREACHED`, `COMPLETED_ON_TIME`, `COMPLETED_LATE`
- **Automated SLA Lifecycle:** SLA records automatically created when indent enters a stage, completed when stage finishes
- **Background Refresh:** Cron job (every 10 minutes) updates all active SLA records with live elapsed/remaining time

#### Delay Tracking Engine
- **New Database Model: `DelayLog`**
  - `delayStartedAt`, `delayEndedAt`, `delayHours`
  - `delayReason`, `delayCategory` (SLA_BREACH | HOLD | CLARIFICATION | REASSIGNMENT | OTHER)
  - `delayedByUserId`, `currentOwnerId`, `isResolved`
- **Automatic Delay Start:** When SLA breach detected (every 30 min cron), delay logging automatically begins
- **Independent Tracking:** Delay accumulation tracked separately from workflow state

#### Reminder Engine
- **Five Reminder Triggers:**
  - 50% SLA consumed
  - 75% SLA consumed
  - 90% SLA consumed
  - SLA expired (immediate)
  - Every 24 hours post-expiry
- **New Database Model: `ReminderLog`** — prevents duplicate reminders via unique constraint
- **Dual Channel:** Each reminder sends both in-app notification + email with SLA context
- **Color-Coded Emails:** HTML email templates with urgency-based color scheme

#### Escalation Engine
- **Three-Level Escalation Chain:**
  - **L1:** Assigned user (fires immediately on breach)
  - **L2:** Procurement Admin role (configurable delay, default 4 hours)
  - **L3:** Super Admin role (configurable delay, default 8 hours)
- **New Database Model: `EscalationLog`**
  - `escalationLevel`, `escalatedToId`, `escalatedToEmail`
  - `notificationSent`, `emailSent`
- **Configurable Thresholds:** Per-stage escalation timing via `StageConfiguration.escalationL1/2/3DelayHours`
- **Full Audit Trail:** Each escalation creates notification + email + ProcurementHistory entry

#### Background Job Orchestration
- **Replaced Single Cron with Granular Jobs:**
  - Every 10 minutes: Refresh SLA and delay records
  - Every 30 minutes: Detect breaches, start delay tracking
  - Every 1 hour: Process reminders
  - Every 2 hours: Process escalations
  - Midnight: Purge config cache
- **Overlap Protection:** Execution guards prevent concurrent job runs
- **Deprecated:** Old 30-minute TAT monitor (kept for backward compatibility)

#### Enhanced Notifications
- **New Features:**
  - `notifyAssignedUser()` — targets stage owner directly
  - Role-filtered `broadcast()` — notify specific roles only
  - `getInboxSummary()` — categorized unread counts
- **New Notification Categories:**
  - `NEW_TASK`, `SLA_WARNING`, `ESCALATION`, `APPROVAL`, `REJECTION`, `HOLD`, `CLARIFICATION`, `SYSTEM`

#### New API Endpoints
- `GET /api/procurement/sla-summary` — Overall SLA dashboard metrics
- `GET /api/procurement/:id/sla` — All SLA records for a specific indent
- `GET /api/procurement/escalation-summary` — L1/L2/L3 escalation counts
- `GET /api/notifications/inbox-summary` — Categorized notification counts

#### Enhanced Existing Endpoints
- `GET /api/procurement/dashboard-stats` — Now includes `sla.onTrack`, `sla.approaching`, `sla.breached`
- `GET /api/procurement/control-tower` — Now includes `slaBreached` and `escalations` counts per record

#### Database Migration
- **Migration:** `20260706000000_v2_5_0_sla_engine`
  - New tables: `SlaRecord`, `DelayLog`, `ReminderLog`, `EscalationLog`
  - New columns on `StageConfiguration`: `escalationL1/2/3DelayHours`
  - Comprehensive indexes for performance
  - Idempotent (safe to re-run)

### Changed
- **SLA Integration:** All workflow stage transitions now trigger SLA lifecycle hooks (`onStageActivated`, `onStageCompleted`)
- **Bulk Operations:** SLA hooks now fire for bulk stage updates (same as single-record updates)
- **Email Service:** Rejection emails now integrated into main workflow (previously standalone)

### Technical
- **Version:** Bumped to 2.5.0 across monorepo (API, docs, migrations)
- **Architecture:** New `SlaModule` consolidates all SLA-related services
- **Config Cache:** 5-minute TTL for StageConfiguration to reduce database load
- **Business Hours:** Utility function added for future business-hour SLA calculations

---

## [2.0.1] - 2026-07-01

### Changed — SKU Master Database Migration & System Cleanup
- **Legacy Database Removal:** Deleted `items_db` table (17,638 legacy records) and deprecated `items` table
- **SKU Master Migration:** Migrated 1,918 user-imported records from legacy `items_db` to unified `Item` table
- **API Endpoint Consistency:** All endpoints migrated from `/items` to `/skus`
- **Data Cleanup:** Normalized all category and subGroup fields, NULL values ready for user population
- **Items Master Redesign:** Complete UI overhaul with advanced search, server-side pagination, dynamic filtering, bulk import/export

---

## [1.10.0] - 2026-07-02

### Added — Unified Procurement Workflow (S1–S22 Enterprise Workspace)
- **Generic Stage Workspace Engine:** Single config-driven component (`StageWorkspace`) replaces 20+ bespoke stage pages
- **Stage Config Registry:** Declarative configuration for all 22 stages (fields, validation, actions, KPIs)
- **19 New Stage Detail Pages:** Full actionable workspaces for all procurement stages (RFQ Float through Payment Advice)
- **Metadata-Backed Persistence:** Stage-specific data (PO Number, GRN Number, Invoice Amount, etc.) stored in `ProcurementStage.metadata`
- **Bulk Update on Every Queue:** Multi-select and bulk action bar now available on all 20 stage list pages
- **Config-Driven Validation:** Pure function rules evaluated against live field values (no hardcoded components)

### Changed
- **Stage 1 & 2 Migrated:** Indent Verification and Store Check now use generic workspace (removed bespoke components)
- **Workflow Consistency:** All stages now share identical tab structure (Overview, Items, Documents, Workflow, History, Audit Logs)

---

## [1.9.1] - 2026-07-02

### Added
- **Indent Verification Officer (INDENT_VERIFIER) Role**
- Detailed Stage 1 & 2 RBAC permissions for Indent Verification flow
- Enhanced UI sidebar to respect module-level permission constraints

---

## [1.9.0] - 2026-07-02

### Changed — Enterprise Verification Workspace Refinement
- **Pivot to Tabbed Layout:** Redesigned "View Indent" workspace from 3-panel dashboard to full-width ERP tabbed layout
- **Enterprise Data Grid Expansion:** Item review grid now spans 100% horizontal space with sticky headers/columns
- **Horizontal Sticky Action Footer:** Verification decisions moved to persistent bottom footer
- **System Health Drawer:** Validation checklist moved to slide-out drawer (badge in header)

---

## [1.6.0] - 2026-06-27

### Added — Bulk Workflow Stage Management
- **Bulk Stage Update System:** Multi-select (checkbox, page, all-filtered) with sticky action toolbar
- **Change Workflow Stage Modal:** Preview eligible/blocked records before applying action
- **RBAC-Gated Bulk Endpoints:** `POST /procurement/bulk-action/preview` and `/bulk-action` (SUPER_ADMIN, ADMIN, DOER only)
- **Full Auditability:** Every bulk run writes `BulkOperation` record + per-record `ProcurementHistory`
- **Live Sync:** Bulk completion invalidates React Query caches (dashboard/control-tower/lists update instantly)

### Fixed
- **JWT Strategy:** Fixed implicit-`any` on `validate()` return path (surfaced during clean rebuild)

---

## [1.5.4] - 2026-06-26

### Fixed — Production Database Fetch Fix
- **Prisma Neon Configuration:** Injected `pgbouncer=true` for Neon-pooler connections
- **API Health Timing:** Increased Prisma `pingCheck` timeout to 10s for serverless DB cold starts
- **CORS Resiliency:** Automatically allow `*.vercel.app` origins for preview environments
- **Build Lifecycle:** Enforced Prisma client generation via `postinstall` hook

---

## [1.5.3] - 2026-06-25

### Added — Workflow Reorganization & User CRUD
- **User CRUD Complete:** Soft Delete, Restore, Force Password Reset, Account Unlock
- **User Management UI:** Advanced multi-parameter filtering, clear statuses, extensive modals
- **Procurement Dataset:** Added 30 realistic test records distributed across stages

### Changed
- **Sidebar Reorganization:** Moved Archived Indents from Command Center to Workflow Management

---

## [1.5.2] - 2026-07-01

### Changed — Dashboard Cleanup & KPI Redesign
- **Dashboard Cleanup:** Removed old "Requires Attention" section
- **Command Center Removal:** Removed Procurement Command Center module (frontend + backend)
- **Control Tower Redesign:** Updated KPI cards to focus on: Total Indents, In Progress, On Hold, Rejected, Completed

---

## [1.5.1] - 2026-07-01

### Changed — Repository Cleanup & Deployment Readiness
- **Repository Audit:** Removed unused files, dead code, temporary artifacts, duplicate utilities
- **Deployment & Config Audit:** Verified Vercel/Railway configuration, dependencies, environment setups
- **Build Validation:** Successful production builds confirmed

---

## [1.5.0] - 2026-07-01

### Added — Enterprise Landing Experience
- **Enterprise Landing Page:** Premium white-first SaaS aesthetic (15+ sections, interactive workflow visual, scroll-reveal animations)
- **Live Platform Stats:** `getPublicStats` API endpoint for dynamic landing page counters
- **Login Redesign:** Modern split-screen with dedicated IFH One branding panel

---

## [1.4.2] - 2026-06-30

### Changed — Live Profile Analytics
- **Profile Module Analytics:** Replaced hardcoded values with live database-driven statistics

---

## [1.4.0] - 2026-06-30

### Added — Enterprise Profile Enhancement
- **User Account Center:** Security insights, activity logs, permissions matrix, role visibility

---

## [1.3.1] - 2026-06-29

### Added — Production Major Release
- **Procurement Command Center:** Real-time operational cockpit
- **Authentication & RBAC:** Comprehensive permissions engine
- **Master Data Models:** Projects, Vendors, Items
- **Procurement Engine:** 23-stage workflow tracking

---

**For detailed AI-readable implementation milestones, see [CHANGELOG_AI.md](./docs/CHANGELOG_AI.md)**
