const Counter = require('../models/Counter')

// Server-local YYYY-MM-DD from a Date — the slot's date, not "now", so a
// booking made today for tomorrow's slot gets tomorrow's sequence.
function toDateKey(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Atomically issues the next token for a (centre, produce, day) bucket —
// e.g. the 7th Onion booking at the Namakkal centre today becomes "O07".
//
// The single findOneAndUpdate below is what makes this race-condition-safe:
// MongoDB applies $inc to one document atomically, so two requests hitting
// the same bucket at the same instant cannot both read/write seq 7 — one
// gets 7, the other gets 8, deterministically. A separate
// "find the counter, then save seq + 1" would NOT be safe: two concurrent
// requests could both read seq=6 before either writes back seq=7.
async function generateToken({ centre, produce, dateKey }) {
    const key = `${centre}-${produce}-${dateKey}`

    const counter = await Counter.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
    )

    const letter = (produce[0] || '?').toUpperCase()
    const sequence = String(counter.seq).padStart(2, '0')
    return `${letter}${sequence}`
}

module.exports = { generateToken, toDateKey }
