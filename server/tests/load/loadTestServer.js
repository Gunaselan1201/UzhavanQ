// Standalone server for load testing — backed by mongodb-memory-server so
// the load test never touches the real local dev database. Run this, point
// Artillery at it, then Ctrl+C it when done.
process.env.JWT_SECRET = 'load-test-secret'

const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const app = require('../../app')
const bcrypt = require('bcrypt')
const Admin = require('../../models/Admin')

const PORT = process.env.LOAD_TEST_PORT || 5001

async function main() {
    const mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
    console.log('load-test DB ready:', mongod.getUri())

    // one admin, so the auth-required scenario has real credentials to use
    const passwordHash = await bcrypt.hash('LoadTest123', 10)
    await Admin.create({ username: 'loadtest-admin', passwordHash, centre: 'namakkal-coop' })

    app.listen(PORT, () => {
        console.log(`Load-test server on http://localhost:${PORT}`)
    })
}

main().catch((err) => {
    console.error('load test server failed to start:', err)
    process.exit(1)
})
