// Shared in-memory MongoDB lifecycle for integration/concurrency tests —
// each test file gets its own isolated database (a fresh MongoMemoryServer
// per file, connected once in beforeAll), so tests can never see leftover
// state from another file and never touch the real dev/prod database.
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

let mongod

async function connect() {
    mongod = await MongoMemoryServer.create()
    await mongoose.connect(mongod.getUri())
}

async function closeDatabase() {
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
    await mongod.stop()
}

async function clearCollections() {
    const collections = mongoose.connection.collections
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({})
    }
}

module.exports = { connect, closeDatabase, clearCollections }
