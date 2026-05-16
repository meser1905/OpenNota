import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import createNextIntlPlugin from 'next-intl/plugin';

const projectRoot = dirname(fileURLToPath(import.meta.url));

// The whole monorepo shares a single root .env; load it here so the web app
// sees NEXT_PUBLIC_* and auth variables regardless of the working directory.
loadEnv({ path: resolve(projectRoot, '../../.env') });

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Linting runs as its own Turborepo task; keep `next build` focused on types.
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  },
  webpack: (config) => {
    // Resolve @opennota/shared to TS source; its CommonJS dist breaks dev HMR.
    config.resolve.alias['@opennota/shared'] = resolve(projectRoot, '../../packages/shared/src');
    return config;
  },
};

export default withNextIntl(nextConfig);
