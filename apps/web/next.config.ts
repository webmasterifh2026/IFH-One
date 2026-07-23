import type { NextConfig } from 'next';
import path from 'path';
import packageJson from './package.json';

/**
 * next.config.ts — Centralized Versioning & Build Info Injection
 */

const buildDate = new Date().toISOString();
const gitCommit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.GIT_COMMIT_SHA || 'main';
const gitBranch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME || 'main';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
    NEXT_PUBLIC_GIT_BRANCH: gitBranch,
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
};

export default nextConfig;
