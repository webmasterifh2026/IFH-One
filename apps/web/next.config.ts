import type { NextConfig } from 'next';
import path from 'path';

/**
 * next.config.ts — v2.7.0
 *
 * IFH One Frontend Configuration
 * API requests connect directly to NEXT_PUBLIC_API_URL (handled via CORS).
 */

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  }
};

export default nextConfig;
