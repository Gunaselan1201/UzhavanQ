const Booking = require('../models/Booking')
const SlotCapacity = require('../models/SlotCapacity')
const CentreClosure = require('../models/CentreClosure')
const { TIME_SLOTS, buildCapacityKey, buildSlotDateTime } = require('../utils/timeSlots')

const STATUS_VALUES = ['confirmed', 'delayed', 'postponed', 'completed']
const PAYMENT_STATUS_VALUES = ['pending', 'processed']

// dateStr: 'YYYY-MM-DD' -> the local-time [start, end) window for that day,
// matching how server/utils/timeSlots.js builds slotDateTime elsewhere.
function dayRange(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number)
    const start = new Date(year, month - 1, day, 0, 0, 0, 0)
    const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0)
    return { start, end }
}

// The one place that appends to a booking's history array — every admin
// write path (status, payment, arrived, and the closure-triggered
// auto-postpone) calls this so the audit trail never has a gap. Mutates
// the in-memory doc/array; caller is responsible for persisting it
// (booking.save(), or the $push equivalent in a bulk update).
function logHistory(booking, { action, admin, detail }) {
    booking.history.push({ action, admin, detail, timestamp: new Date() })
}

// GET /api/admin/bookings?date=YYYY-MM-DD
async function getBookings(req, res) {
    const { date } = req.query
    const filter = { centre: req.admin.centre }

    if (date) {
        const { start, end } = dayRange(date)
        filter.slotDateTime = { $gte: start, $lt: end }
    }

    try {
        const bookings = await Booking.find(filter).sort({ slotDateTime: 1 })
        res.json(bookings)
    } catch (err) {
        console.error('admin getBookings failed:', err.message)
        res.status(500).json({ error: 'Could not fetch bookings' })
    }
}

// PATCH /api/admin/bookings/:id/status
async function updateStatus(req, res) {
    const { status, delayMinutes } = req.body

    if (!STATUS_VALUES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${STATUS_VALUES.join(', ')}` })
    }
    if (status === 'delayed' && typeof delayMinutes !== 'number') {
        return res.status(400).json({ error: 'delayMinutes (number) is required when status is "delayed"' })
    }

    try {
        // Scoped to the admin's own centre so one centre's staff can never
        // touch another centre's bookings, even by guessing an id.
        const booking = await Booking.findOne({ _id: req.params.id, centre: req.admin.centre })
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        booking.status = status
        booking.delayMinutes = status === 'delayed' ? delayMinutes : 0
        logHistory(booking, {
            action: 'status_changed',
            admin: req.admin.username,
            detail: status === 'delayed' ? `Delayed +${delayMinutes} min` : `Status changed to ${status}`,
        })
        await booking.save()

        res.json(booking)
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid booking id' })
        }
        console.error('admin updateStatus failed:', err.message)
        res.status(500).json({ error: 'Could not update booking status' })
    }
}

// PATCH /api/admin/bookings/:id/arrived
async function updateArrived(req, res) {
    const { arrived } = req.body

    if (typeof arrived !== 'boolean') {
        return res.status(400).json({ error: 'arrived (boolean) is required' })
    }

    try {
        const booking = await Booking.findOne({ _id: req.params.id, centre: req.admin.centre })
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        booking.arrived = arrived
        logHistory(booking, {
            action: 'arrived_updated',
            admin: req.admin.username,
            detail: arrived ? 'Marked arrived' : 'Marked not arrived',
        })
        await booking.save()

        res.json(booking)
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid booking id' })
        }
        console.error('admin updateArrived failed:', err.message)
        res.status(500).json({ error: 'Could not update arrival status' })
    }
}

// PATCH /api/admin/bookings/:id/payment
async function updatePayment(req, res) {
    const { amount, status } = req.body

    if (status !== undefined && !PAYMENT_STATUS_VALUES.includes(status)) {
        return res.status(400).json({ error: `payment status must be one of: ${PAYMENT_STATUS_VALUES.join(', ')}` })
    }

    try {
        const booking = await Booking.findOne({ _id: req.params.id, centre: req.admin.centre })
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' })
        }

        const parts = []
        if (amount !== undefined) {
            booking.payment.amount = amount
            parts.push(`amount set to ${amount}`)
        }
        if (status !== undefined) {
            booking.payment.status = status
            parts.push(`payment ${status}`)
        }
        if (parts.length > 0) {
            logHistory(booking, {
                action: 'payment_updated',
                admin: req.admin.username,
                detail: parts.join(', '),
            })
        }
        await booking.save()

        res.json(booking)
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid booking id' })
        }
        console.error('admin updatePayment failed:', err.message)
        res.status(500).json({ error: 'Could not update booking payment' })
    }
}

// Shared by closeSlot and closeDay — postpones every booking matching
// `extraFilter` (merged with centre + tokenDate, and excluding bookings
// already completed/postponed) in one atomic bulk update, each getting
// its own history entry in the same operation. Returns how many were
// affected, for the response body.
async function postponeAndLog({ centre, tokenDate, extraFilter = {}, admin, detail }) {
    const filter = {
        centre,
        tokenDate,
        status: { $nin: ['completed', 'postponed'] },
        ...extraFilter,
    }
    const result = await Booking.updateMany(filter, {
        $set: { status: 'postponed' },
        $push: { history: { action: 'status_changed', admin, detail, timestamp: new Date() } },
    })
    return result.modifiedCount
}

// PATCH /api/admin/slots/close — body: { date, time }
async function closeSlot(req, res) {
    const { date, time } = req.body
    if (!date || !time || !TIME_SLOTS.includes(time)) {
        return res.status(400).json({ error: `time must be one of: ${TIME_SLOTS.join(', ')}` })
    }

    try {
        const key = buildCapacityKey(req.admin.centre, date, time)
        await SlotCapacity.findOneAndUpdate(
            { key },
            { $set: { closed: true }, $setOnInsert: { key, count: 0, capacity: 10 } },
            { upsert: true }
        )

        const postponedCount = await postponeAndLog({
            centre: req.admin.centre,
            tokenDate: date,
            extraFilter: { slotDateTime: buildSlotDateTime(date, time) },
            admin: req.admin.username,
            detail: `Postponed automatically — ${time} slot closed by admin`,
        })

        res.json({ closed: true, date, time, postponedCount })
    } catch (err) {
        console.error('admin closeSlot failed:', err.message)
        res.status(500).json({ error: 'Could not close slot' })
    }
}

// PATCH /api/admin/slots/reopen — body: { date, time }
// Does NOT un-postpone anything — that stays a manual admin decision.
async function reopenSlot(req, res) {
    const { date, time } = req.body
    if (!date || !time || !TIME_SLOTS.includes(time)) {
        return res.status(400).json({ error: `time must be one of: ${TIME_SLOTS.join(', ')}` })
    }

    try {
        const key = buildCapacityKey(req.admin.centre, date, time)
        await SlotCapacity.findOneAndUpdate(
            { key },
            { $set: { closed: false }, $setOnInsert: { key, count: 0, capacity: 10 } },
            { upsert: true }
        )
        res.json({ closed: false, date, time })
    } catch (err) {
        console.error('admin reopenSlot failed:', err.message)
        res.status(500).json({ error: 'Could not reopen slot' })
    }
}

// POST /api/admin/days/close — body: { date, reason }
async function closeDay(req, res) {
    const { date, reason } = req.body
    if (!date) {
        return res.status(400).json({ error: 'date is required' })
    }

    try {
        await CentreClosure.findOneAndUpdate(
            { centre: req.admin.centre, date },
            { $set: { reason: reason || '' } },
            { upsert: true }
        )

        const postponedCount = await postponeAndLog({
            centre: req.admin.centre,
            tokenDate: date,
            admin: req.admin.username,
            detail: reason ? `Postponed automatically — day closed: ${reason}` : 'Postponed automatically — day closed by admin',
        })

        res.json({ closed: true, date, reason: reason || '', postponedCount })
    } catch (err) {
        console.error('admin closeDay failed:', err.message)
        res.status(500).json({ error: 'Could not close day' })
    }
}

// DELETE /api/admin/days/close — body: { date }
async function reopenDay(req, res) {
    const { date } = req.body
    if (!date) {
        return res.status(400).json({ error: 'date is required' })
    }

    try {
        await CentreClosure.deleteOne({ centre: req.admin.centre, date })
        res.json({ closed: false, date })
    } catch (err) {
        console.error('admin reopenDay failed:', err.message)
        res.status(500).json({ error: 'Could not reopen day' })
    }
}

// GET /api/admin/slots?date=YYYY-MM-DD — powers the Manage Slots panel:
// every fixed time slot for that date, its booked count, and whether
// it's closed, plus whether the whole day is closed.
async function getSlotsForDate(req, res) {
    const { date } = req.query
    if (!date) {
        return res.status(400).json({ error: 'date is required' })
    }

    try {
        const dayClosure = await CentreClosure.findOne({ centre: req.admin.centre, date })
        const slots = await Promise.all(
            TIME_SLOTS.map(async (time) => {
                const key = buildCapacityKey(req.admin.centre, date, time)
                const doc = await SlotCapacity.findOne({ key })
                return {
                    time,
                    bookedCount: doc ? doc.count : 0,
                    closed: doc ? doc.closed : false,
                }
            })
        )
        res.json({ date, dayClosed: !!dayClosure, reason: dayClosure?.reason || '', slots })
    } catch (err) {
        console.error('admin getSlotsForDate failed:', err.message)
        res.status(500).json({ error: 'Could not fetch slots' })
    }
}

// GET /api/admin/stats
async function getStats(req, res) {
    const centre = req.admin.centre
    const { start, end } = dayRange(new Date().toISOString().slice(0, 10))

    try {
        const completedBookings = await Booking.find({
            centre,
            status: 'completed',
            slotDateTime: { $gte: start, $lt: end },
        }).sort({ updatedAt: -1 })

        const completedToday = completedBookings.map((b) => {
            const lastStatusChange = [...b.history].reverse().find((h) => h.action === 'status_changed')
            return {
                token: b.token,
                farmerName: b.farmerName,
                produce: b.produce,
                weight: b.weight,
                timeCompleted: lastStatusChange ? lastStatusChange.timestamp : b.updatedAt,
            }
        })

        const recentActivity = await Booking.aggregate([
            { $match: { centre } },
            { $unwind: '$history' },
            { $sort: { 'history.timestamp': -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    bookingId: '$_id',
                    token: 1,
                    farmerName: 1,
                    action: '$history.action',
                    admin: '$history.admin',
                    detail: '$history.detail',
                    timestamp: '$history.timestamp',
                },
            },
        ])

        res.json({
            completedToday: { count: completedToday.length, bookings: completedToday },
            recentActivity,
        })
    } catch (err) {
        console.error('admin getStats failed:', err.message)
        res.status(500).json({ error: 'Could not fetch stats' })
    }
}

const HISTORY_PAGE_SIZE = 20

// GET /api/admin/history?page=1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
async function getHistory(req, res) {
    const centre = req.admin.centre
    const page = Math.max(1, Number(req.query.page) || 1)
    const { startDate, endDate } = req.query

    const timestampMatch = {}
    if (startDate) timestampMatch.$gte = dayRange(startDate).start
    if (endDate) timestampMatch.$lt = dayRange(endDate).end

    const matchStage = { centre }

    try {
        const pipeline = [
            { $match: matchStage },
            { $unwind: '$history' },
            ...(Object.keys(timestampMatch).length > 0 ? [{ $match: { 'history.timestamp': timestampMatch } }] : []),
            { $sort: { 'history.timestamp': -1 } },
            {
                $facet: {
                    entries: [
                        { $skip: (page - 1) * HISTORY_PAGE_SIZE },
                        { $limit: HISTORY_PAGE_SIZE },
                        {
                            $project: {
                                _id: 0,
                                bookingId: '$_id',
                                token: 1,
                                farmerName: 1,
                                action: '$history.action',
                                admin: '$history.admin',
                                detail: '$history.detail',
                                timestamp: '$history.timestamp',
                            },
                        },
                    ],
                    totalCount: [{ $count: 'count' }],
                },
            },
        ]

        const [result] = await Booking.aggregate(pipeline)
        const total = result.totalCount[0]?.count || 0

        res.json({
            entries: result.entries,
            page,
            pageSize: HISTORY_PAGE_SIZE,
            totalCount: total,
            totalPages: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)),
        })
    } catch (err) {
        console.error('admin getHistory failed:', err.message)
        res.status(500).json({ error: 'Could not fetch history' })
    }
}

module.exports = {
    getBookings,
    updateStatus,
    updateArrived,
    updatePayment,
    closeSlot,
    reopenSlot,
    closeDay,
    reopenDay,
    getSlotsForDate,
    getStats,
    getHistory,
}
