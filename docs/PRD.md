# Purpose
Defines the product requirements for IFH One, acting as the foundational business logic spec for the procurement workflow.

# Scope
Applies globally across the `ifh-one` monorepo.

# Last Generated
2026-06-29

# Related Documents
- [PROJECT.md](./PROJECT.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Vision
To establish "One Platform, One Workflow, One Source of Truth" for IFH's global procurement operations.

## Mission
To eliminate operational silos, standardize procurement processes across departments, and ensure total accountability through a unified digital platform.

## Problem Statement
Legacy procurement systems often result in scattered data, untracked delays, missing audit trails, and fragmented communication between the Requisitioner, Procurement Team, Stores, QC, and Finance. This leads to high Turnaround Time (TAT) and opaque accountability.

## Objectives
1. Centralize the 23-stage procurement workflow into a single state machine.
2. Reduce average procurement TAT by at least 30%.
3. Enforce Role-Based Access Control (RBAC) across all sensitive actions.
4. Provide Executive Management with real-time analytics via a Command Center.

## Target Users & Personas
- **The Engineer (Requisitioner):** Needs to quickly raise Indents for materials and track their arrival.
- **The Buyer (Procurement Manager):** Needs to efficiently issue RFQs, evaluate quotes, negotiate, and raise Purchase Orders.
- **The Storekeeper (Store Manager):** Needs an easy interface for Material Receipt (GRN) and issuing materials.
- **The Inspector (QC):** Needs to document secondary and final inspections clearly.
- **The Controller (Finance):** Needs verified records to process payments and debit notes.

## Functional Requirements
- **Authentication:** JWT-based secure login.
- **RBAC:** Users can only view/edit records based on their assigned roles and the current workflow stage.
- **Master Data:** CRUD operations for Vendors, Projects, and Items.
- **Procurement Engine:**
  - Automated progression from S1 (Indent Creation) to S23 (Payment Advice).
  - Ability to place indents "On Hold".
  - Ability to "Reject" with mandatory remarks and automated email triggers.
- **Audit Trails:** Every stage transition, remark, and attachment upload must be permanently logged.
- **Search & Filter:** Advanced server-side search/filter across all data modules.

## Non-Functional Requirements
- **Performance:** APIs must respond in under 500ms. Server-side pagination is mandatory for all list views.
- **Scalability:** Must support high concurrency for hundreds of internal users.
- **Usability:** High information density UI tailored for desktop-first enterprise environments.
- **Security:** Complete route protection on both frontend and backend. 

## Business Rules
- An Indent cannot progress to S4 (RFQ Generation) without S2/S3 verifications.
- Rejection at any stage automatically emails the Requisitioner.
- Purchase Orders must require Level 1 (and conditionally Level 2) approvals.
- Final Payment Advice (S23) can only be generated if Billing (S22) is completed and materials have passed QC.

## Acceptance Criteria
- A user can log in, create an Indent, and seamlessly track it through all 23 stages.
- The Procurement Command Center accurately reflects the live count of indents at each stage.
- Unauthorized users are strictly blocked from triggering stage transitions.

## Success Metrics
- 100% adoption across the IFH Procurement division.
- 0 orphaned or untracked indents.
- Sub-second UI rendering for the Command Center dashboard.

## Constraints
- Must use Next.js App Router and NestJS.
- Must persist data in PostgreSQL using Prisma.
- UI must strictly follow the IFH One Design System.

## Future Scope
- Integration with external vendor portals.
- AI-driven price prediction for Techno-Commercial Evaluation.
