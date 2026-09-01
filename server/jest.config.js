module.exports = {
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/'],
    testTimeout: 30000, // mongodb-memory-server's first binary download/start can be slow
    setupFiles: ['<rootDir>/tests/setup/env.js'],
}
