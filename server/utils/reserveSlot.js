const SlotCapacity = require('../models/SlotCapacity')
const { SLOT_CAPACITY } = require('./timeSlots')

// Atomically claims one spot in a physical (centre, date, time) slot.
//
// This is the fix for the count-then-save race: counting existing bookings
// and then saving a new one are two separate operations, so two concurrent
// requests can both see count=9, both decide "there's room", and both save
// — landing on 11 bookings for a 10-capacity slot. The findOneAndUpdate in
// step 2 below closes that gap: MongoDB evaluates the filter (count < 10)
// and applies $inc as a single atomic step per document, so once count
// reaches 10, every subsequent attempt's filter simply fails to match and
// findOneAndUpdate returns null — there is no window where two requests can
// both succeed past the same threshold.
//
// `closed` is checked in the SAME atomic filter as capacity, not as a
// separate read beforehand — an admin closing a slot in the same instant a
// booking request lands must never leave a window where the request reads
// "open" and then claims a spot after the close takes effect.
async function reserveSlot(key) {
    // Step 1: make sure the document exists. Two simultaneous first-ever
    // requests for a brand-new slot can both race on this upsert — that
    // raises a duplicate-key error on `key`'s unique index, which just means
    // the other request's upsert already created the document. Either way,
    // it exists by the time we reach step 2, so there's nothing to recover.
    try {
        await SlotCapacity.findOneAndUpdate(
            { key },
            { $setOnInsert: { key, count: 0, capacity: SLOT_CAPACITY, closed: false } },
            { upsert: true, new: true }
        )
    } catch (err) {
        if (err.code !== 11000) throw err
    }

    // Step 2: the actual atomic claim. $ne: true (not $eq: false) so it
    // still matches documents from before `closed` existed on the schema.
    const updated = await SlotCapacity.findOneAndUpdate(
        { key, closed: { $ne: true }, count: { $lt: SLOT_CAPACITY } },
        { $inc: { count: 1 } },
        { new: true }
    )

    if (!updated) {
        // A second read purely to give the caller an accurate reason —
        // the atomicity guarantee above doesn't depend on this being
        // race-free too, it's just for a better error message.
        const doc = await SlotCapacity.findOne({ key })
        if (doc?.closed) return { ok: false, reason: 'SLOT_CLOSED' }
        return { ok: false, reason: 'SLOT_FULL' }
    }
    return { ok: true, count: updated.count }
}

// Gives back a spot that was reserved but never turned into a real booking
// (e.g. the Booking.create() after reserveSlot() failed validation).
async function releaseSlot(key) {
    await SlotCapacity.findOneAndUpdate({ key }, { $inc: { count: -1 } })
}

module.exports = { reserveSlot, releaseSlot }
