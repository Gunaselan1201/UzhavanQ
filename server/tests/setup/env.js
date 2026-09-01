// Runs before every test file's module graph loads. requireAdmin.js and
// adminAuthController.js read process.env.JWT_SECRET at call time (not
// import time), so setting it here — before any test calls login/verify —
// is sufficient; a real secret still comes from .env for the real server.
process.env.JWT_SECRET = 'test-secret-do-not-use-in-production'
process.env.NODE_ENV = 'test'
