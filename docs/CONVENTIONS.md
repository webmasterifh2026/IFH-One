# Purpose
Standardizes coding practices, naming conventions, file organization, and workflow rules for developers and AI agents working on IFH One.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-06-29

# Related Documents
- [TECH_STACK.md](./TECH_STACK.md)
- [DECISIONS.md](./DECISIONS.md)

---

## 1. Naming Conventions
- **Files & Folders:** `kebab-case` (e.g., `procurement-command-center`, `auth.service.ts`).
- **React Components:** `PascalCase` (e.g., `DataTable.tsx`, `SidebarItem.tsx`).
- **Interfaces & Types:** `PascalCase`. Do not prefix with `I` (e.g., `User` instead of `IUser`).
- **Variables & Functions:** `camelCase` (e.g., `fetchUserData`, `isSidebarOpen`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`, `API_BASE_URL`).

## 2. File Organization
### Frontend (`apps/web`)
- `src/app/`: Next.js App Router structure. Folders map to routes. Use `(route-groups)` to logically group layouts without affecting the URL.
- `src/components/`: Reusable, generic UI components (mostly ShadCN).
- `src/features/`: Domain-specific components and hooks (e.g., `src/features/procurement/`).
- `src/lib/`: Utility functions, API clients, and configuration.
- `src/store/`: Zustand global state slices.

### Backend (`apps/api`)
- `src/[module]/`: Feature-based modular structure.
- `src/[module]/dto/`: Data Transfer Objects for request validation.
- `src/[module]/entities/`: (Optional) Mapped entities if diverging from Prisma types.

## 3. Import / Export Rules
- Prefer absolute imports in `apps/web` (e.g., `@/components/ui/button`) configured via `tsconfig.json`.
- Export components as `export function ComponentName() { ... }` rather than `export default`. Default exports are reserved for Next.js Pages and Layouts.
- Barrel files (`index.ts`) should be used sparingly, primarily in `packages/*` to expose public APIs.

## 4. API & Error Handling Patterns
- **Frontend:** Wrap API calls in `try/catch` or use React Query's `onError`. Display user-friendly errors via `toast()`.
- **Backend:** Throw specific `HttpException` subclasses from `nestjs/common` (e.g., `NotFoundException`, `BadRequestException`). Let the global exception filter format the response.

## 5. CSS & Styling
- Strictly use Tailwind utility classes.
- For dynamic styles, use `cn()` from `packages/utils/src/classnames.ts` (clsx + tailwind-merge).
- Avoid inline `style={{ ... }}` unless dealing with highly dynamic, javascript-calculated values (like animations).

## 6. Git & Versioning Conventions
- Commits should roughly follow Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`).
- All production releases must update the `CHANGELOG.md` in the root directory following the "Keep a Changelog" format.

## 7. Prisma DB Conventions
- Model names are `PascalCase` singular (`model Procurement`).
- Table mapping in DB should remain default (unless explicitly mapped with `@@map("table_names")` for legacy integration).
- Relation names should be clear and explicitly defined if ambiguous.
