const Booking = require('../models/Booking')

const DAYS = 7

// tokenDate is stored as 'YYYY-MM-DD' (see models/Booking.js) — that format
// sorts and compares lexicographically the same as chronologically, so a
// plain string $gte works here without parsing dates on the DB side.
function last7DaysStart() {
    const d = new Date()
    d.setDate(d.getDate() - (DAYS - 1))
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// GET /api/admin/trends
async function getTrends(req, res) {
    const centre = req.admin.centre
    const startDate = last7DaysStart()

    try {
        const [bookingsPerDayRaw, produceBreakdownRaw] = await Promise.all([
            Booking.aggregate([
                { $match: { centre, tokenDate: { $gte: startDate } } },
                { $group: { _id: '$tokenDate', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Booking.aggregate([
                { $match: { centre, tokenDate: { $gte: startDate } } },
                { $group: { _id: '$produce', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ])

        // Fill in every date in the 7-day window, even ones with 0
        // bookings — otherwise a quiet centre gets a chart with gaps
        // instead of a flat line at 0, and an empty-array response is
        // harder for the frontend to distinguish from "still loading".
        const byDate = Object.fromEntries(bookingsPerDayRaw.map((d) => [d._id, d.count]))
        const bookingsPerDay = []
        for (let i = 0; i < DAYS; i += 1) {
            const d = new Date()
            d.setDate(d.getDate() - (DAYS - 1) + i)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            bookingsPerDay.push({ date: key, count: byDate[key] || 0 })
        }

        const produceBreakdown = produceBreakdownRaw.map((p) => ({ produce: p._id, count: p.count }))

        res.json({ bookingsPerDay, produceBreakdown })
    } catch (err) {
        console.error('admin getTrends failed:', err.message)
        res.status(500).json({ error: 'Could not fetch trends' })
    }
}

module.exports = { getTrends }
