import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';

/**
 * Levanta:
 *  - backend en :3100 con una BD temporal recién sembrada (no toca tu dev.db)
 *  - frontend (ng serve) en :4300 apuntando a ese backend
 * Ejecutar:  cd e2e && npm install && npm run instalar-navegador && npm test
 */
const tmp = path.join(os.tmpdir(), 'constructx-e2e');
export const MAIL_DIR = path.join(tmp, 'correos');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'off',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'node src/config/init-db.js --reset && node server.js',
      cwd: '../backend',
      url: 'http://localhost:3100/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: '3100',
        DB_PATH: path.join(tmp, 'e2e.db'),
        MAIL_DIR,
        CORS_ORIGIN: 'http://localhost:4300',
        ALERTA_INTERVALO_MIN: '0',
        SMTP_HOST: '',
      },
    },
    {
      command: 'npx ng serve --port 4300 --configuration e2e',
      cwd: '../frontend',
      url: 'http://localhost:4300',
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
