import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';

/**
 * Environment schema. The whole process refuses to start if these are not
 * satisfied, so misconfiguration fails fast and loudly instead of at runtime.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(16, 'REFRESH_TOKEN_SECRET must be at least 16 characters'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  EMAIL_FROM: z.string().default('no-reply@opennota.local'),
  EMAIL_OUTPUT_DIR: z.string().default('./emails'),
  UPLOAD_DIR: z.string().default('./uploads'),
  PDF_OUTPUT_DIR: z.string().default('./generated'),
});

export type Env = z.infer<typeof envSchema>;

/** Validates raw environment variables; throws a readable error if invalid. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

/**
 * Walks up from `start` to the directory holding `pnpm-workspace.yaml`, so the
 * API can find the repo-root `.env` and local directories regardless of the
 * working directory it was launched from.
 */
export function findWorkspaceRoot(start: string = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return resolve(start);
    }
    dir = parent;
  }
}
