const { defineConfig } = require('@playwright/test')
const path = require('node:path')
const os = require('node:os')

module.exports = defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 30000,
  outputDir: process.env.PW_OUTPUT_DIR || path.join(os.tmpdir(), 'wonder-patch-browser-results'),
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4381',
    viewport: { width: 1280, height: 900 },
    launchOptions: process.env.PW_EXECUTABLE_PATH ? { executablePath: process.env.PW_EXECUTABLE_PATH } : {}
  },
  webServer: [
    { command: 'node scripts/serve.js --port 4381', url: 'http://127.0.0.1:4381', reuseExistingServer: false },
    { command: 'node scripts/serve.js --port 4382 --base /test/sub/', url: 'http://127.0.0.1:4382/test/sub/', reuseExistingServer: false }
  ]
})
