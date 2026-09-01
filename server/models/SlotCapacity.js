const mongoose = require('mongoose')

// One document per physical (centre + date + time) slot — deliberately NOT
// scoped by produce, since capacity is about how many farmers can physically
// be at the centre that hour, regardless of what each one is bringing.
const slotCapacitySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    capacity: { type: Number, default: 10 },
    // Admin-closed (equipment issue, etc.) — independent of count/capacity,
    // so a slot can be closed even with 0 bookings, and reopening it doesn't
    // touch count at all.
    closed: { type: Boolean, default: false },
})

module.exports = mongoose.model('SlotCapacity', slotCapacitySchema)
