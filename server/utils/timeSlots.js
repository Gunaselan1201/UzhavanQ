// Mirrors the fixed slot list in src/slotpage.jsx — keep both in sync if the
// available times ever change.
const TIME_SLOTS = ['10:30 AM', '11:30 AM', '12:30 PM', '02:00 PM', '03:00 PM', '04:00 PM']

const SLOT_CAPACITY = 10
const ALMOST_FULL_FROM = 6 // 0-5 booked -> available, 6-9 -> almost-full, 10 -> full

function deriveStatus(bookedCount) {
    if (bookedCount >= SLOT_CAPACITY) return 'full'
    if (bookedCount >= ALMOST_FULL_FROM) return 'almost-full'
    return 'available'
}

// "10:30 AM" -> { hours, minutes } in 24h time.
function parseTimeLabel(label) {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label || '')
    if (!match) return null
    let hours = Number(match[1]) % 12
    if (match[3].toUpperCase() === 'PM') hours += 12
    return { hours, minutes: Number(match[2]) }
}

// dateStr: 'YYYY-MM-DD', timeLabel: '10:30 AM' -> the exact Date a booking
// for that slot would have as slotDateTime (see src/booking.js's
// combineDateAndSlot, which this mirrors so the two sides agree byte-for-byte).
function buildSlotDateTime(dateStr, timeLabel) {
    const time = parseTimeLabel(timeLabel)
    if (!time || !dateStr) return null
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day, time.hours, time.minutes, 0, 0)
}

// The inverse of buildSlotDateTime — given a booking's slotDateTime, find
// which of the fixed labels it matches. A booking must correspond to one
// of these; if none match, the requested time isn't a real bookable slot.
function findTimeLabel(date) {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return TIME_SLOTS.find((label) => {
        const time = parseTimeLabel(label)
        return time && time.hours === hours && time.minutes === minutes
    }) || null
}

// centre + dateKey ('YYYY-MM-DD') + time label -> the SlotCapacity document's
// key. Used by both the reservation (on booking) and availability (on read)
// so they always agree on which document represents a given physical slot.
function buildCapacityKey(centre, dateKey, time) {
    return `${centre}-${dateKey}-${time.replace(/\s+/g, '')}`
}

module.exports = {
    TIME_SLOTS,
    SLOT_CAPACITY,
    ALMOST_FULL_FROM,
    deriveStatus,
    parseTimeLabel,
    buildSlotDateTime,
    findTimeLabel,
    buildCapacityKey,
}
