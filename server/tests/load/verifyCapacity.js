// Run against the already-running load-test server's DB to check whether
// atomic slot capacity actually held under the Artillery run — the thing
// the smaller Promise.all race test can't prove on its own (real HTTP
// stack, real connection pooling, real timing chaos, not just in-process
// Promise.all with the same event loop tick).
const mongoose = require('mongoose')
const SlotCapacity = require('../../models/SlotCapacity')
const Booking = require('../../models/Booking')

async function main() {
    const uri = process.argv[2]
    if (!uri) {
        console.error('usage: node verifyCapacity.js <mongo-uri>')
        process.exit(1)
    }
    await mongoose.connect(uri)

    const capacityDocs = await SlotCapacity.find({})
    const overCapacity = capacityDocs.filter((d) => d.count > d.capacity)

    console.log(`SlotCapacity documents: ${capacityDocs.length}`)
    console.log(`Documents where count > capacity (should be 0): ${overCapacity.length}`)
    if (overCapacity.length > 0) {
        console.log('OVER-CAPACITY DOCS:', JSON.stringify(overCapacity, null, 2))
    }

    // cross-check: actual Booking count per slot key must never exceed 10 either
    const bookings = await Booking.find({})
    const byKey = {}
    for (const b of bookings) {
        const dateKey = b.tokenDate
        const time = new Date(b.slotDateTime)
        const timeKey = `${time.getHours()}:${time.getMinutes()}`
        const key = `${b.centre}-${dateKey}-${timeKey}`
        byKey[key] = (byKey[key] || 0) + 1
    }
    const overbooked = Object.entries(byKey).filter(([, count]) => count > 10)
    console.log(`Total real Booking documents: ${bookings.length}`)
    console.log(`Physical slots with more than 10 actual bookings (should be 0): ${overbooked.length}`)
    if (overbooked.length > 0) {
        console.log('OVERBOOKED SLOTS:', overbooked)
    }

    // token collision check across the whole load-test run
    const tokenKeys = bookings.map((b) => `${b.centre}|${b.produce}|${b.tokenDate}|${b.token}`)
    const uniqueTokenKeys = new Set(tokenKeys)
    console.log(`Token uniqueness: ${uniqueTokenKeys.size} unique out of ${tokenKeys.length} total (should be equal)`)

    await mongoose.disconnect()
    process.exit(overCapacity.length > 0 || overbooked.length > 0 || uniqueTokenKeys.size !== tokenKeys.length ? 1 : 0)
}

main().catch((err) => { console.error(err); process.exit(1) })
