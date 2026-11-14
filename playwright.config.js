const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:4173/api/health",
    reuseExistingServer: !process.env.CI,
    env: { PORT: "4173" },
    timeout: 30_000
  }
});
