# Purpose
Acts as the long-term, stable memory for AI coding agents working on the IFH One monorepo. Contains hard-earned architectural facts, frequent pitfalls, and immovable business rules.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-06-29

# Related Documents
- [DECISIONS.md](./DECISIONS.md)
- [CONVENTIONS.md](./CONVENTIONS.md)

---

## 1. Absolute Business Rules
- **The S1-S23 Workflow is Immutable:** The 23-stage procurement workflow is the heart of IFH One. You must never attempt to "simplify" it by removing stages, merging stages, or ignoring the sequential logic defined in `PRD.md`.
- **Master Data Preservation:** The `vendors_db`, `projects_db`, and `items_db` are treated as external or legacy master data sources. They must never be wiped during testing or resets.

## 2. Technical Invariants
- **Database Resets:** When writing scripts to reset the database (like `reset-db.ts`), **NEVER** use `prisma.truncate`. Always use `prisma.model.deleteMany()`. Transactional data must be deleted in strict topological order (e.g., RFQs -> Procurement History -> Procurement Stages -> Procurement Items -> Procurement).
- **CSS Variables over Config:** The styling system is strictly powered by native CSS variables in `globals.css` leveraged by Tailwind v4. **Do not** attempt to create or modify a `tailwind.config.ts` or `tailwind.config.js` file.
- **Do Not Modify Business Logic Unprompted:** As an AI agent, you must not alter the core business logic, APIs, or database integrations unless explicitly told to do so by the user.

## 3. Frequently Reused Components
Before building a new UI component from scratch, check `packages/ui/src/components`. It relies heavily on ShadCN UI.
- **Tables:** Use the standardized Data Table components for lists.
- **Forms:** Always use `react-hook-form` coupled with `@hookform/resolvers/zod` for validation.
- **Icons:** Always use `lucide-react`.

## 4. Known Pitfalls & Gotchas
- **Next.js App Router Complexity:** Be extremely careful about mixing Server Components and Client Components. If a component requires hooks (e.g., `useState`, `useEffect`, `useStore`), it MUST begin with `"use client"`.
- **N+1 Queries in Prisma:** When fetching a `Procurement` object, remember that it has many relations (Stages, Items, History). Failing to use `include: { ... }` will result in massive N+1 performance hits when rendering the Command Center.
- **Missing CHANGELOG:** The user expects a formal `CHANGELOG.md` at the root of the repository matching the "Keep a Changelog" format. Ensure this is maintained during any "release" operations.
