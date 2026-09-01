// Creates one admin account. Run manually — never exposed as an API route,
// so this is the only way an admin account gets created.
//
//   SEED_ADMIN_USERNAME=NKL001 SEED_ADMIN_PASSWORD=... SEED_ADMIN_CENTRE=namakkal-coop node scripts/seedAdmin.js
//
// Reads from env vars (not hardcoded) so real credentials never end up
// committed to the repo. CENTRE must match a centre id from src/centres.js.
require('dotenv').config()
const bcrypt = require('bcrypt')
const connectDB = require('../config/db')
const Admin = require('../models/Admin')

const USERNAME = process.env.SEED_ADMIN_USERNAME
const PASSWORD = process.env.SEED_ADMIN_PASSWORD
const CENTRE = process.env.SEED_ADMIN_CENTRE

const SALT_ROUNDS = 10

async function main() {
    if (!USERNAME || !PASSWORD || !CENTRE) {
        console.error('SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD, and SEED_ADMIN_CENTRE must all be set — see the usage comment at the top of this file.')
        process.exit(1)
    }

    await connectDB()

    const existing = await Admin.findOne({ username: USERNAME })
    if (existing) {
        console.error(`Admin "${USERNAME}" already exists — refusing to overwrite. Delete it first if you meant to reset it.`)
        process.exit(1)
    }

    const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS)
    const admin = await Admin.create({ username: USERNAME, passwordHash, centre: CENTRE })

    console.log(`Admin created: ${admin.username} (centre: ${admin.centre})`)
    process.exit(0)
}

main().catch((err) => {
    console.error('seedAdmin failed:', err.message)
    process.exit(1)
})
