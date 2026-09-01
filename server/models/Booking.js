const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
    {
        farmerName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true, index: true },
        location: { type: String, required: true, trim: true },
        produce: { type: String, required: true }, // e.g. "Onion" — matches produce.js
        weight: { type: Number, required: true }, // tons
        centre: { type: String, required: true }, // matches centres.js entries

        // Single combined value, not separate date/time strings — this is what
        // slotcountdown.jsx subtracts Date.now() from.
        slotDateTime: { type: Date, required: true },

        // YYYY-MM-DD portion of slotDateTime, stored separately so the compound
        // index below can scope "same day" without being defeated by
        // slotDateTime's differing time-of-day component (see utils/generateToken.js).
        tokenDate: { type: String, required: true },

        // Generated server-side (see controllers/utils/generateToken.js) — never
        // accepted from the client. No longer globally unique on its own: it's
        // only unique within a (centre + produce + day) bucket, enforced by the
        // compound index below.
        token: { type: String, required: true },

        status: {
            type: String,
            enum: ['confirmed', 'delayed', 'postponed', 'completed'],
            default: 'confirmed',
        },
        delayMinutes: { type: Number, default: 0 },

        // Whether the farmer has physically reached the centre for this
        // token — independent of `status`, which tracks the booking's
        // schedule/lifecycle rather than physical presence.
        arrived: { type: Boolean, default: false },

        payment: {
            amount: { type: Number },
            status: {
                type: String,
                enum: ['pending', 'processed'],
                default: 'pending',
            },
        },

        // Every admin-triggered change to this booking, oldest first —
        // status/payment/arrived updates and the auto-postpone from a slot
        // or day closure all push an entry here. See
        // adminBookingController.js's logHistory helper, which is the one
        // place that appends to this array so every write path stays
        // consistent.
        history: [
            {
                action: { type: String, required: true }, // e.g. "status_changed", "payment_updated"
                admin: { type: String, required: true }, // admin username, from req.admin.username
                detail: { type: String, required: true }, // human-readable summary, e.g. "delayed +20 min"
                timestamp: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
)

// Supports fast slot-capacity lookups: "how many bookings already exist
// for this centre at this date/time?"
bookingSchema.index({ centre: 1, slotDateTime: 1 })

// DB-level safeguard on top of the atomic counter in utils/generateToken.js:
// two bookings in the same (centre, produce, day) bucket can never share a
// token, even if some future bug bypassed the counter.
bookingSchema.index({ centre: 1, produce: 1, tokenDate: 1, token: 1 }, { unique: true })

module.exports = mongoose.model('Booking', bookingSchema)
