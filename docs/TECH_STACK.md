# Purpose
Provides a comprehensive overview of the technologies, frameworks, and libraries used to build IFH One.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-06-29

# Related Documents
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [PROJECT.md](./PROJECT.md)

---

## Languages
- **TypeScript (v5+)**: The primary language used across the entire monorepo, providing end-to-end type safety from the database schema to frontend UI components.

## Core Frameworks
- **Next.js (v16.2.9)**: The React framework used for the frontend `apps/web`. Utilizing the App Router for hybrid SSR/CSR.
- **React (v19)**: The UI library utilized by Next.js.
- **NestJS (v11)**: The progressive Node.js framework used for the backend `apps/api`. Chosen for its Angular-like architecture, decorators, and strict dependency injection.

## Database & ORM
- **PostgreSQL**: The relational database engine.
- **Neon**: Serverless Postgres hosting platform.
- **Prisma (v5.22)**: The Next-generation Node.js and TypeScript ORM used in `apps/api` for robust schema definitions and type-safe database queries.

## Frontend Libraries (apps/web)
- **Tailwind CSS (v4)**: The utility-first CSS framework. V4 is utilized with native CSS variables instead of `tailwind.config.ts`.
- **ShadCN UI**: Accessible, customizable components built on top of Radix UI primitives and styled with Tailwind CSS.
- **Zustand**: A small, fast, and scalable bearbones state-management solution used for global client-side state.
- **React Hook Form**: Performant, flexible, and extensible forms with easy-to-use validation.
- **Zod**: TypeScript-first schema declaration and validation library. Used both in Next.js (for form validation/env vars) and NestJS (via custom pipes if needed, though class-validator is also present).
- **Lucide React**: The official icon set for the platform.

## Backend Libraries (apps/api)
- **class-validator / class-transformer**: Decorator-based property validation for DTOs in NestJS.
- **Passport / @nestjs/jwt**: Used for secure JWT-based authentication and route guarding.

## Monorepo & Build Tools
- **Turborepo**: High-performance build system for JavaScript and TypeScript codebases.
- **npm workspaces**: Native monorepo package management.
- **ESLint & Prettier**: Configured in `packages/config` for standardized code linting and formatting across all apps and packages.

## Infrastructure & DevOps
- **Docker & Docker Compose**: Used for spinning up local development environments, particularly the PostgreSQL database and Nginx proxy (`infrastructure/docker`).
- **Nginx**: Used as a reverse proxy in local/production deployments to route traffic appropriately between the Next.js frontend and NestJS API.
