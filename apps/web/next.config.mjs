import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import createNextIntlPlugin from 'next-intl/plugin';

// The whole monorepo shares a single root .env; load it here so the web app
// sees NEXT_PUBLIC_* and auth variables regardless of the working directory.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Linting runs as its own Turborepo task; keep `next build` focused on types.
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  },
};

export default withNextIntl(nextConfig);
