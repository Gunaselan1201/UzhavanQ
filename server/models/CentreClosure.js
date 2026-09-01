const mongoose = require('mongoose')

// One document per (centre + date) that's fully closed — a holiday, staff
// shortage, etc. Existence of a document IS the closure; there's no
// boolean to toggle, so reopening a day means deleting its document
// (see adminBookingController.js's closeDay/reopenDay).
const centreClosureSchema = new mongoose.Schema(
    {
        centre: { type: String, required: true },
        date: { type: String, required: true }, // 'YYYY-MM-DD'
        reason: { type: String, trim: true },
    },
    { timestamps: true }
)

centreClosureSchema.index({ centre: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('CentreClosure', centreClosureSchema)
