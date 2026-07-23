# IFH One Procurement Management System

Welcome to the IFH One Procurement Management System. This is a full-stack, enterprise-grade web application built to streamline and manage end-to-end procurement workflows (S0 through S22) including Indent creation, RFQ generation, PO generation, Gate Entry, Inspection, and Finance integration.

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, Prisma ORM, JWT Authentication
- **Database**: PostgreSQL (Neon)
- **Monorepo Management**: Turborepo

## Installation and Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v11+ recommended)
- A PostgreSQL database (Neon or local)

### Local Setup

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```
3. **Configure Environment Variables**
   - Copy `.env.example` to `.env` in the root directory.
   - Update `DATABASE_URL` with your PostgreSQL connection string.
   - Set required secrets (`JWT_SECRET`, `SESSION_SECRET`).

4. **Initialize Database**
   ```bash
   cd apps/api
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start Development Server**
   From the root directory, start the Turborepo dev process:
   ```bash
   npm run dev
   ```
   - The Frontend (Next.js) will be available at http://localhost:3000
   - The Backend (NestJS) will be available at http://localhost:3001

## Production Deployment

This application is configured for modern cloud deployment:
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **Database**: Neon PostgreSQL

For detailed deployment instructions, environment variable configuration, and branch strategies, please refer to [DEPLOYMENT.md](DEPLOYMENT.md).

## Troubleshooting

- **Database Connection Errors**: Ensure your `DATABASE_URL` is correct and includes `sslmode=require` if using Neon.
- **Dependency Issues**: Always run `npm install --legacy-peer-deps` due to some strict peer dependency requirements in the monorepo.
