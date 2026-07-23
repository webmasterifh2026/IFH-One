# Purpose

Documents the structure, patterns, and conventions of the NestJS RESTful API serving the IFH One frontend.

# Scope

Applies to the `apps/api` module.

# Last Generated

2026-06-29

# Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)

---

## Architecture Pattern

The API is built using **NestJS**, strictly enforcing the Module-Controller-Service pattern:

- **Module:** Groups controllers and providers, wiring them into the root `AppModule`.
- **Controller:** Binds to an HTTP route (e.g., `@Controller('procurement')`), handles DTO validation via `class-validator`, and extracts standard parameters (req, res, param).
- **Service:** Isolated business logic injected into controllers. Communicates with Prisma ORM.

## Authentication & Authorization

- **Authentication:** All routes (except login/public endpoints) are protected by a global `JwtAuthGuard`. The client must pass a valid token via the `Authorization: Bearer <token>` header.
- **Authorization (RBAC):** Access to specific resources or workflow transitions is protected by a custom `RolesGuard` and `@Roles()` decorator matching user roles defined in the DB.

## Standard Endpoint Structure

Endpoints generally follow RESTful conventions.

### `GET /api/v1/[resource]`

- **Purpose:** Fetch a paginated list of resources.
- **Query Params:** `page`, `limit`, `search`, `sortBy`, `sortOrder`.
- **Response:**
  ```json
  {
    "data": [...],
    "meta": { "total": 100, "page": 1, "limit": 25 }
  }
  ```

### `GET /api/v1/[resource]/:id`

- **Purpose:** Fetch a single resource by ID (usually UUID).

### `POST /api/v1/[resource]`

- **Purpose:** Create a new resource.
- **Body:** Validated via Zod / class-validator DTOs.
- **Response:** Created object with 201 Created status.

### `PATCH /api/v1/[resource]/:id`

- **Purpose:** Update a resource or transition its workflow stage.
- **Body:** Partial updates or specific action payload.

### `DELETE /api/v1/[resource]/:id`

- **Purpose:** Soft or hard delete a resource depending on referential integrity.

## Core Modules & Endpoints

### Procurement Engine (`/api/v1/procurement`)

- `GET /` - List all indents/procurements.
- `POST /` - Create a new indent (S1).
- `GET /:id` - Get full details including all S1-S23 stages and history.
- `PATCH /:id/stage` - Progress or reject a specific stage (triggering audit logs and emails).
- `POST /bulk-action/preview` - Dry-run a bulk workflow action across many indent IDs; returns eligible vs. blocked records (with block reasons) without writing anything. Restricted to SUPER_ADMIN, ADMIN, DOER.
- `POST /bulk-action` - Execute a bulk workflow action (e.g. `APPROVE`, `REJECT`, `HOLD`) across many indent IDs. Only records for which the action is currently valid are updated; others are skipped with a reason. Writes per-record `ProcurementHistory` plus one `BulkOperation` audit row. Restricted to SUPER_ADMIN, ADMIN, DOER.

### Command Center Analytics (`/api/v1/procurement-command-center`)

- `GET /kpis` - Fetches live KPI aggregations (Total Indents, Avg Lead Time, SLA Compliance).
- `GET /analytics` - Fetches live charts data (Stage Bottlenecks, Performance, Vendor Volume).
- `GET /list` - Advanced filtered grid fetching (Paginated).
- `GET /activity` - Fetches real-time recent procurement activity feed from Audit Logs.
- `GET /:id/lifecycle` - Fetches the S1-S23 Procurement Journey data.

### RFQ Module (`/api/v1/rfq`)

- `POST /` - Generate an RFQ for a specific Indent.
- `PATCH /:id/vendors` - Assign vendors to an RFQ.

### Master Data Modules

- `/api/v1/projects` - CRUD for Projects.
- `/api/v1/vendors` - CRUD for Vendors.
- `/api/v1/items` - CRUD for Items (see Items Module details below).

## Items Module Endpoints

All items endpoints are prefixed with `/api/items` and require JWT authentication.

### `GET /api/items`

- **Purpose:** List items with server-side pagination, sorting, and filtering.
- **Query Params:** `skip`, `take` (25/50/100), `page`, `limit`, `search`, `category`, `status`, `uom`, `required`, `sortBy` (sku/item_description/uom/required), `sortOrder` (asc/desc), `duplicatesOnly`, `recentlyViewed`, `frequentlyUsed`.
- **Response:** `{ data: Item[], meta: { total, page, limit, totalPages } }`

### `GET /api/items/search`

- **Purpose:** Basic typeahead search for dropdowns (ILIKE-based, no ranking).
- **Query Params:** `q` or `search`, `limit` (default 25).
- **Response:** `Item[]`

### `GET /api/items/search/enterprise`

- **Purpose:** Enterprise SKU + Item Name search with intelligent ranking (No pg_trgm dependency).
- **Query Params:** `q` (search query), `limit` (default 30), `projectId` (optional).
- **Search Behavior:**
  - Searches both `sku` (SKU Code) and `item_description` (Item Name) as equal first-class fields.
  - Multi-word queries use AND logic: all words must match in at least one field.
  - Case-insensitive via PostgreSQL ILIKE.
- **Unified Ranking (1-9):**
  - `1` = Exact SKU match
  - `2` = SKU starts with query prefix
  - `3` = Exact Item Name match
  - `4` = Item Name starts with query prefix
  - `5` = Item Name contains query substring
  - `6` = SKU contains query substring
  - `7` = Item Name starts with individual query word
  - `8` = Item Name contains individual query word
  - `9` = Generic contains (catch-all)
- **Response:** `{ mode: 'search', items: Item[], isFuzzyFallback: boolean }`
  - `isFuzzyFallback` is `true` when all results have rank >= 7 (no exact/prefix/contains matches).
- **Empty query response:** `{ mode: 'suggestions', items: { project, recent, frequent } }`

### `GET /api/items/sku/:sku`

- **Purpose:** Find item by exact SKU.

### `GET /api/items/export/items`

- **Purpose:** Export filtered items as `.xlsx` file.
- **Query Params:** Same filters as `GET /api/items`.

### `GET /api/items/export/template`

- **Purpose:** Download Excel import template.

### `POST /api/items/import/validate`

- **Purpose:** Validate uploaded Excel/CSV file before importing.

### `POST /api/items/import/execute`

- **Purpose:** Execute validated import with duplicate resolution strategy.

### `POST /api/items/:sku/view`

- **Purpose:** Record item view for recent/frequent tracking.

### `GET /api/items/:id/insights`

- **Purpose:** Fetch procurement analytics for an item (usage stats, vendor frequency, etc.).

### User & RBAC (`/api/v1/users`, `/api/v1/roles`)

- Manages employee profiles, roles, and modular permission matrices.

## Validation & Error Handling

- **Incoming Data:** Validated automatically at the controller level using `ValidationPipe`. Invalid payloads return `400 Bad Request`.
- **Business Errors:** Services throw standard NestJS `HttpException` (e.g., `NotFoundException`, `ForbiddenException`).
- **Global Filter:** A global exception filter catches all unhandled exceptions, logs them to Sentry/Winston, and returns a standard JSON error response to the frontend to avoid leaking stack traces.

## Versioning

The API uses URI versioning (e.g., `/api/v1/`). All current endpoints fall under `v1`.
