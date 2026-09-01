import { defineConfig } from '@playwright/test'

// Points at the already-running dev servers (frontend :5173, backend :5000)
// rather than managing its own webServer — this project runs both as
// separate long-lived processes during development already.
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    retries: 0,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5173',
        screenshot: 'only-on-failure',
    },
})
