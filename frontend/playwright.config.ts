import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8084',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: [
    {
      command: 'cd ../backend/Hearsay.Api && dotnet run --urls http://localhost:5050',
      url: 'http://localhost:5050/health',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npx vite --port 8084 --strictPort',
      url: 'http://localhost:8084',
      reuseExistingServer: true,
      timeout: 15000,
      env: { VITE_API_PROXY: 'http://localhost:5050' },
    },
  ],
});
