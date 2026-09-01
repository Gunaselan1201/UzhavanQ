const mongoose = require('mongoose')

// Phone is the identity — it's what OTP login verifies, so it's what a
// farmer's account is keyed by, not a separate login/password of its own.
const farmerSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true, trim: true, unique: true },
        name: { type: String, required: true, trim: true },
        // optional — no creation-time UI for this yet, set by hand for now
        taluk: { type: String, trim: true },
        district: { type: String, trim: true },
        state: { type: String, trim: true },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Farmer', farmerSchema)
