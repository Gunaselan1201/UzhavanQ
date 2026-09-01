import { createBookingRequest, fetchBookingByIdRequest } from './api.js'
import { safeGet, safeSet, safeRemove } from './safeStorage.js'

// The backend is the source of truth now — this only remembers *which*
// booking belongs to this browser session, as a Mongo _id.
const ID_KEY = 'activeBookingId'

// payload: { farmerName, phone, location, produce, weight, centre, slotDateTime }
// Returns the full saved booking document, including the server-generated
// token and _id.
export async function saveBooking(payload) {
    const booking = await createBookingRequest(payload)
    safeSet(ID_KEY, booking._id)
    return booking
}

export async function getBooking() {
    const id = safeGet(ID_KEY)
    if (!id) return null
    try {
        return await fetchBookingByIdRequest(id)
    } catch {
        // booking no longer exists, or the request failed — nothing usable to show
        clearBooking()
        return null
    }
}

export function clearBooking() {
    safeRemove(ID_KEY)
}

// Tracks which admin-side booking change (delay, postponement, completion,
// payment processed) the farmer has already been shown a blocking alert
// for, keyed by booking id + the booking's updatedAt (which the backend
// bumps on every admin-side save) — so a fresh change always looks "unseen"
// even if an earlier one on the same booking was already dismissed. Uses
// localStorage (not the sessionStorage helpers above) since this should
// survive a tab close/reopen, not just the tab that happened to be open
// when the change occurred.
const ALERT_SEEN_PREFIX = 'slotAlertSeen:'

function safeLocalGet(key) {
    try {
        return localStorage.getItem(key)
    } catch {
        return null
    }
}

function safeLocalSet(key, value) {
    try {
        localStorage.setItem(key, value)
    } catch {
        // storage unavailable — the alert just shows again next time, harmless
    }
}

export function hasSeenSlotUpdate(booking) {
    if (!booking?._id || !booking?.updatedAt) return true
    return safeLocalGet(ALERT_SEEN_PREFIX + booking._id) === booking.updatedAt
}

export function markSlotUpdateSeen(booking) {
    if (!booking?._id || !booking?.updatedAt) return
    safeLocalSet(ALERT_SEEN_PREFIX + booking._id, booking.updatedAt)
}

export function slotDateTime(booking) {
    if (!booking?.slotDateTime) return null
    const date = new Date(booking.slotDateTime)
    return Number.isNaN(date.getTime()) ? null : date
}

// Combines the slot picker's date ('YYYY-MM-DD') and slot label ('10:30 AM')
// into a real Date, ready to send to the API as slotDateTime.
export function combineDateAndSlot(dateStr, slotLabel) {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(slotLabel || '')
    if (!match || !dateStr) return null
    let hours = Number(match[1]) % 12
    if (match[3].toUpperCase() === 'PM') hours += 12
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d, hours, Number(match[2]), 0, 0)
}
