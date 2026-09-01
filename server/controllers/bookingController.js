const Booking = require('../models/Booking')
const SlotCapacity = require('../models/SlotCapacity')
const CentreClosure = require('../models/CentreClosure')
const { generateToken, toDateKey } = require('../utils/generateToken')
const { reserveSlot, releaseSlot } = require('../utils/reserveSlot')
const { TIME_SLOTS, deriveStatus, findTimeLabel, buildCapacityKey } = require('../utils/timeSlots')

const REQUIRED_FIELDS = ['farmerName', 'phone', 'location', 'produce', 'weight', 'centre', 'slotDateTime']

async function createBooking(req, res) {
    const missing = REQUIRED_FIELDS.filter((field) => {
        const value = req.body[field]
        return value === undefined || value === null || value === ''
    })
    if (missing.length > 0) {
        return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` })
    }

    const { farmerName, phone, location, produce, weight, centre, slotDateTime } = req.body

    const parsedSlotDateTime = new Date(slotDateTime)
    if (Number.isNaN(parsedSlotDateTime.getTime())) {
        return res.status(400).json({ error: 'slotDateTime must be a valid date' })
    }

    const tokenDate = toDateKey(parsedSlotDateTime)
    const timeLabel = findTimeLabel(parsedSlotDateTime)
    if (!timeLabel) {
        return res.status(400).json({ error: 'slotDateTime does not match a bookable time slot' })
    }
    const slotKey = buildCapacityKey(centre, tokenDate, timeLabel)

    try {
        // A whole-day closure lives in a separate collection from
        // SlotCapacity, so it can't be folded into reserveSlot's single-
        // document atomic filter the way the per-slot `closed` flag is.
        // This read-then-act has a narrow race window (a day closed in the
        // same instant a booking lands could still let one through), but
        // that's a fundamentally lower-stakes gap than overbooking a
        // physical slot — worst case is one booking an admin manually
        // postpones, not a queue that's actually over capacity.
        const dayClosure = await CentreClosure.findOne({ centre, date: tokenDate })
        if (dayClosure) {
            return res.status(409).json({ error: 'This centre is closed on the selected date. Please choose a different date.' })
        }
    } catch (err) {
        console.error('createBooking: day closure check failed:', err.message)
        return res.status(500).json({ error: 'Could not create booking' })
    }

    let reserved = false
    try {
        // The real capacity gate — atomic, so it's the fix for the old
        // count-then-save race, not just a re-check of the same race.
        // Also atomically rejects a closed slot — see reserveSlot.js.
        const reservation = await reserveSlot(slotKey)
        if (!reservation.ok) {
            const message = reservation.reason === 'SLOT_CLOSED'
                ? 'This slot has been closed by the centre. Please choose a different time.'
                : 'This slot has just been fully booked. Please choose a different time.'
            return res.status(409).json({ error: message })
        }
        reserved = true

        const token = await generateToken({ centre, produce, dateKey: tokenDate })

        const booking = await Booking.create({
            farmerName,
            phone,
            location,
            produce,
            weight,
            centre,
            slotDateTime: parsedSlotDateTime,
            tokenDate,
            token,
        })
        return res.status(201).json(booking)
    } catch (err) {
        if (reserved) {
            // the spot was claimed but the booking itself never got saved —
            // give it back so it isn't lost to a phantom reservation
            await releaseSlot(slotKey).catch((releaseErr) => {
                console.error('releaseSlot failed after a failed booking save:', releaseErr.message)
            })
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message })
        }
        // the compound index in models/Booking.js is a defensive backstop —
        // the atomic token counter should make this practically unreachable
        if (err.code === 11000) {
            console.error('createBooking: unexpected token collision', err.keyValue)
            return res.status(409).json({ error: 'Token collision — please retry' })
        }
        console.error('createBooking failed:', err.message)
        return res.status(500).json({ error: 'Could not create booking' })
    }
}

async function getBookingById(req, res) {
    try {
        const booking = await Booking.findById(req.params.id)
        if (!booking) return res.status(404).json({ error: 'Booking not found' })
        res.json(booking)
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid booking id' })
        }
        console.error('getBookingById failed:', err.message)
        res.status(500).json({ error: 'Could not fetch booking' })
    }
}

// GET /api/bookings/availability?centre=X&date=YYYY-MM-DD
// Reads from the same SlotCapacity documents reserveSlot() writes to, so
// this always reflects the actual reservation state, not a separate count
// that could disagree with it. A closed slot (or a slot on a closed day)
// reports status "closed" regardless of its booked count — closed always
// wins over available/almost-full/full, the same way "past" wins over
// capacity on the frontend's own slot grid.
async function getSlotAvailability(req, res) {
    const { centre, date } = req.query
    if (!centre || !date) {
        return res.status(400).json({ error: 'centre and date are required' })
    }

    try {
        const dayClosure = await CentreClosure.findOne({ centre, date })
        const results = await Promise.all(
            TIME_SLOTS.map(async (time) => {
                const key = buildCapacityKey(centre, date, time)
                const doc = await SlotCapacity.findOne({ key })
                const bookedCount = doc ? doc.count : 0
                const closed = !!dayClosure || !!doc?.closed
                return { time, bookedCount, status: closed ? 'closed' : deriveStatus(bookedCount) }
            })
        )
        res.json(results)
    } catch (err) {
        console.error('getSlotAvailability failed:', err.message)
        res.status(500).json({ error: 'Could not fetch slot availability' })
    }
}

module.exports = { createBooking, getBookingById, getSlotAvailability }
