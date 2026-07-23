# Purpose
Provides an executive overview of the IFH One platform, outlining its vision, core workflows, major modules, and development philosophy.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-06-29

# Related Documents
- [PRD.md](./PRD.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [CURRENT_CONTEXT.md](./CURRENT_CONTEXT.md)

---

## Vision
One Platform. One Workflow. One Source of Truth.
IFH One is designed to centralize and modernize the enterprise procurement process, providing a robust, data-driven platform that manages the entire lifecycle of industrial procurement operations.

## Purpose & Business Goals
- **Centralize Operations:** Eliminate fragmented workflows by bringing all procurement stages into a single unified system.
- **Ensure Accountability:** Track every action, approval, and delay with fine-grained audit logging and SLA monitoring.
- **Improve Efficiency:** Automate RFQ generation, standard approvals, and document management to drastically reduce procurement turnaround times.
- **Data Integrity:** Act as the single source of truth for items, vendors, projects, and active indents.

## Product Overview
IFH One is an enterprise ERP focused on procurement and workflow management. It provides comprehensive tracking from the initial Indent creation all the way to final Payment Advice, enforcing strict role-based access controls and business logic across 23 distinct workflow stages.

## Target Users & Stakeholders
- **Requisitioners / Engineers:** Create Indents for required materials.
- **Procurement Managers:** Manage RFQs, negotiate with vendors, and generate Purchase Orders (POs).
- **Store Managers:** Handle Material Receipts (GRN) and Initial Inspections.
- **Quality Control (QC):** Perform secondary and final inspections on received materials.
- **Finance / Accounts:** Process Bills, Debit Notes, and issue Payment Advice.
- **Executives:** Monitor high-level KPIs, business TAT (Turnaround Time), and operational bottlenecks via the Command Center.

## Core Workflows
The system heavily revolves around the **Procurement Lifecycle (Stages S1–S23)**:
1. Indent Creation & Verification
2. Store Check (Inventory availability)
3. RFQ Generation & Vendor Quotation
4. Techno-Commercial Evaluation & Negotiation
5. PO Creation & Multi-level Approval
6. Vendor Acceptance & Follow-up
7. Material Receipt (GRN) & Inspections
8. Billing, Debit Notes & Payment Advice

## Major Modules
- **Authentication & RBAC:** Secure login with granular module and stage-level permission matrices.
- **Dashboard & Command Center:** Live metrics, active indent tracking, and system health.
- **Procurement Engine:** The core state machine driving the S1-S23 workflow.
- **Master Data Management:** Dedicated modules for Projects, Vendors, and Items.
- **Audit & Analytics:** Comprehensive logging of all system actions and workflow delays.

## System Overview
IFH One is a modern cloud-native web application split into a Next.js (React) frontend and a NestJS (Node.js) backend, communicating via REST APIs. Data is persisted in a Neon PostgreSQL database managed via Prisma ORM.

## Repository Overview
The codebase is structured as a Turborepo monorepo:
- `apps/web`: The user-facing Next.js application.
- `apps/api`: The backend NestJS API.
- `packages/*`: Shared configurations, UI components, and TypeScript definitions.
- `infrastructure/`: Docker configuration for local development.

## Development Philosophy
- **Enterprise Aesthetics:** Avoid flashy startup UI in favor of high information density, trustworthiness, and operational clarity.
- **Type Safety:** End-to-end type safety from the database schema to the UI components.
- **Modular Scalability:** Decoupled frontend and backend architectures to allow future micro-frontend or micro-service expansions.
- **AI-First Documentation:** Maintain a comprehensive `docs/` folder to ensure rapid onboarding for both human developers and AI coding agents.
