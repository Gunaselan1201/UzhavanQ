// Pure "has this time slot already passed?" logic, extracted from
// slotpage.jsx so it's unit-testable in isolation without mounting the
// SlotPage component. Mirrors server/utils/timeSlots.js's parseTimeLabel
// so both sides agree on what a label like "10:30 AM" means in 24h time —
// keep them in sync if the slot format ever changes.

// "10:30 AM" -> minutes since midnight.
export function timeLabelToMinutes(label) {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label || '')
    if (!match) return null
    let hours = Number(match[1]) % 12
    if (match[3].toUpperCase() === 'PM') hours += 12
    return hours * 60 + Number(match[2])
}

function toLocalDateInput(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// dateStr: 'YYYY-MM-DD' the farmer selected, timeLabel: e.g. '10:30 AM'.
// A slot only counts as "past" on today's date — the same time label on
// any future date is always still bookable.
export function isSlotPast(dateStr, timeLabel, now = new Date()) {
    if (dateStr !== toLocalDateInput(now)) return false
    const minutes = timeLabelToMinutes(timeLabel)
    if (minutes === null) return false
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    return minutes < nowMinutes
}
