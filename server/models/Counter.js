const mongoose = require('mongoose')

// One document per (centre + produce + day) bucket. Incrementing `seq`
// atomically via findOneAndUpdate — not a separate find-then-increment —
// is what keeps two simultaneous bookings in the same bucket from ever
// landing on the same sequence number.
const counterSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
})

module.exports = mongoose.model('Counter', counterSchema)
