# Contributing to IFH One

Thank you for contributing to IFH One! This document outlines the guidelines and steps for setting up your local environment, making changes, and submitting pull requests.

## Prerequisites

- **Node.js**: `>= 22.0.0`
- **npm**: `>= 10.0.0`

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/webmasterifh2026/IFH-One.git
   cd IFH-One
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Development Commands**:
   - `npm run dev`: Start all apps in watch mode via Turborepo
   - `npm run build`: Build all workspace applications and packages
   - `npm run lint`: Run ESLint checks across all packages
   - `npm run test`: Run unit tests across all packages
   - `npm run type-check`: Run TypeScript compilation checks without emitting output

## Pull Request Guidelines

1. Create a feature or bugfix branch from `main`: `git checkout -b feature/my-feature`
2. Ensure all linting, type-checking, and tests pass locally before pushing.
3. Keep commits atomic, clean, and descriptive.
4. Submit a Pull Request targeting `main`.
