import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5173",
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    headless: true,
    screenshot: "only-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../artifacts/browser-results.json" }],
  ],
  outputDir: "../artifacts/browser-tests",
  workers: 1,
});
