import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseURL = String(process.env.KPI_BASE_URL || 'http://127.0.0.1:3104').replace(/\/+$/, '');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.playwright.js',
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  outputDir: path.join(__dirname, 'var', 'playwright'),
  reporter: [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 960 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start',
    cwd: __dirname,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
