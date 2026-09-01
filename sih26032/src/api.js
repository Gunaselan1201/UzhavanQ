// Thin wrapper around the Express + MongoDB backend in server/ —
// the farmer-facing routes (see admin/adminApi.js for the admin ones).
import { API_BASE, parseOrThrow } from './httpClient.js'

export async function createBookingRequest(payload) {
    const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    return parseOrThrow(res)
}

export async function fetchBookingByIdRequest(id) {
    const res = await fetch(`${API_BASE}/bookings/${id}`)
    return parseOrThrow(res)
}

// [{ time, bookedCount, status }, ...] — status is computed server-side
// (see server/utils/timeSlots.js) so the capacity thresholds live in one place.
export async function fetchSlotAvailabilityRequest(centre, date) {
    const params = new URLSearchParams({ centre, date })
    const res = await fetch(`${API_BASE}/bookings/availability?${params}`)
    return parseOrThrow(res)
}

// Creates the farmer's account on first login; returns the existing one
// unchanged on every login after that (see server/controllers/farmerController.js).
export async function upsertFarmerRequest(payload) {
    const res = await fetch(`${API_BASE}/farmers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    return parseOrThrow(res)
}

export async function fetchFarmerByPhoneRequest(phone) {
    const res = await fetch(`${API_BASE}/farmers/phone/${encodeURIComponent(phone)}`)
    return parseOrThrow(res)
}
