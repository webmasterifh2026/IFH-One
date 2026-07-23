# Purpose
Architecture Decision Records (ADR) detailing the pivotal technical and product choices made during the development of IFH One.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-06-29

# Related Documents
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [PROJECT.md](./PROJECT.md)

---

## ADR 1: Monorepo Architecture with Turborepo
**Decision:** Structure the project as a monorepo using npm workspaces and Turborepo.
**Context:** IFH One requires a clear separation between the frontend (Next.js) and the backend API (NestJS), but they must share TypeScript interfaces to guarantee end-to-end type safety.
**Alternatives Considered:** Separate Git repositories (rejected due to typing drift overhead).
**Consequences:** Enables unified versioning, shared configuration (`packages/config`), and faster CI/CD pipelines via Turborepo's caching.

## ADR 2: Decoupled NestJS API vs. Next.js Server Actions
**Decision:** Use a dedicated NestJS backend instead of relying solely on Next.js Server Actions or API routes.
**Context:** The procurement state machine (S1-S23) involves complex workflows, transactions, RBAC, and potential future integrations with ERP systems (like SAP or Tally).
**Alternatives Considered:** Next.js Server Actions (rejected due to lack of opinionated DI, modular architecture, and background job handling capabilities).
**Consequences:** Increased initial boilerplate, but provides a highly scalable, maintainable, and strictly typed enterprise backend.

## ADR 3: Prisma ORM over TypeORM
**Decision:** Adopt Prisma ORM for database interactions.
**Context:** Need for rapid schema prototyping and bulletproof type safety.
**Alternatives Considered:** TypeORM (rejected due to complex decorator boilerplate and inferior typing for nested relational queries).
**Consequences:** Provides excellent developer experience. Requires vigilance against N+1 query performance issues by strictly enforcing `include` statements.

## ADR 4: Tailwind v4 with Native CSS Variables
**Decision:** Manage the IFH Green Enterprise Design System exclusively through native CSS variables in `globals.css` leveraging Tailwind v4's `@theme` directive.
**Context:** Traditional `tailwind.config.ts` files become bloated and difficult to maintain across shared UI packages.
**Alternatives Considered:** Styled Components / CSS-in-JS (rejected due to Next.js App Router RSC incompatibility and runtime performance costs).
**Consequences:** Zero-runtime styling, seamless integration with ShadCN UI, and the ability to instantly theme the app (e.g., for white-labeling) by modifying a few root CSS variables.

## ADR 5: Centralized Procurement State Machine
**Decision:** Manage the 23-stage workflow via a single `Procurement` entity and a 1-to-many `ProcurementStage` tracker table, rather than creating separate tables for every document type (e.g., a separate GRN table, a separate PO table).
**Context:** Procurement requires strict sequential tracking. Segmenting the workflow into isolated tables causes fragmentation and makes audit tracking extremely difficult.
**Alternatives Considered:** Isolated micro-services or domain tables for PO, GRN, Inspection (rejected as it destroys the "One Source of Truth" vision).
**Consequences:** The `Procurement` entity is massive and heavily joined. It is the absolute core of the business logic and must be treated with extreme caution during database resets or schema migrations.
