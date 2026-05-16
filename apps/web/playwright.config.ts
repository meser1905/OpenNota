import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright end-to-end configuration for the OpenNota web app.
 *
 * Before the tests run, Playwright boots BOTH services it needs:
 *   - the NestJS API on port 3001 (`pnpm --filter @opennota/api start`)
 *   - the Next.js web app on port 3000 (`pnpm --filter @opennota/web start`)
 *
 * Both must be BUILT first (`pnpm build` from the repo root) — the `start`
 * scripts serve the compiled output. `reuseExistingServer` lets a developer
 * keep their own dev servers running and have the tests attach to them.
 */
export default defineConfig({
  testDir: './e2e',
  // One worker keeps the shared seed database free of cross-test interference.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // The repo root is two levels up from apps/web; the filter runs the API
      // package's `start` script (`node dist/main.js`) with its own cwd.
      command: 'pnpm --filter @opennota/api start',
      cwd: '../..',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @opennota/web start',
      cwd: '../..',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
