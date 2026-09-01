import { defineConfig } from 'vitest/config'

// Separate from vite.config.js on purpose — keeps the production build
// config untouched by test-only settings.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.js'],
    },
})
