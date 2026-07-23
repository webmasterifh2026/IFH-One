# Purpose
The primary entry point and rulebook for all future AI agents operating within the IFH One repository.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-06-29

# Related Documents
- [PROJECT.md](./PROJECT.md)
- [CURRENT_CONTEXT.md](./CURRENT_CONTEXT.md)
- [CONVENTIONS.md](./CONVENTIONS.md)

---

## Project Overview
IFH One is an enterprise procurement and workflow management platform. It acts as the single source of truth for all procurement operations at IFH, handling the complete lifecycle from Indent Creation to Payment Advice (Stages S1-S23).

## Architecture Summary
A standard modern monorepo built using Turborepo and npm workspaces:
- **Frontend (`apps/web`)**: Next.js App Router providing Server-Side Rendering (SSR), utilizing React 19, Tailwind CSS v4, and Zustand.
- **Backend (`apps/api`)**: NestJS providing a scalable RESTful API, with Prisma ORM connecting to a Neon PostgreSQL database.
- **Shared Packages (`packages/*`)**: Shared UI components, utility functions, TypeScript definitions, and configuration.
- **Design System**: A strict, premium enterprise-grade system defined centrally via CSS variables (`IFH Green Enterprise`).

## AI Startup Sequence
Every AI agent must follow this exact order of operations when beginning a new task:
1. `AGENTS.md` (This file)
2. `CURRENT_CONTEXT.md`
3. `MEMORY.md`
4. `PROJECT.md`
5. `DECISIONS.md`
6. `ARCHITECTURE.md`
7. `PRD.md`
8. `API.md`
9. `DATABASE.md`
10. `DESIGN.md`
11. `TECH_STACK.md`
12. `CONVENTIONS.md`

Only *after* consulting these documents should the source code be inspected.

## AI Working Rules
Future agents MUST strictly adhere to the following operational constraints:
- **Never scan the entire repository** unless absolutely necessary. Rely on the `docs/` folder as the source of truth.
- **Read documentation before reading code.**
- **Read only files relevant to the task.** Token consumption must be minimized.
- **Preserve project architecture.** Do not introduce architectural drift.
- **Preserve naming conventions.** Adhere strictly to the guidelines in `CONVENTIONS.md`.
- **Reuse existing components.** Check `packages/ui` and `apps/web/src/components` before creating new UI elements.
- **Reuse existing utilities.** Check `packages/utils` and `apps/web/src/lib` before reinventing functionality.
- **Avoid duplicate implementations.**
- **Never perform unrelated refactors.** Address only the specific scope of the prompt.
- **Keep documentation synchronized.** If you alter the architecture, API, or DB schema, update the corresponding file in `docs/` immediately.

### Frontend-Specific Rules (`apps/web`)
> **Note:** This version utilizes Next.js App Router which has breaking changes from older `pages/` paradigms. APIs, conventions, and file structure may differ from standard training data. Read `node_modules/next/dist/docs/` if in doubt, and heed deprecation notices.
