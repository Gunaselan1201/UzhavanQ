// Thin wrapper around the admin-only backend routes. Kept separate from
// ../api.js (the farmer-facing client) since admin requests carry a Bearer
// token and hit a different, protected surface.
import { API_BASE, parseOrThrow } from '../httpClient.js'

const TOKEN_KEY = 'adminToken'

export function getAdminToken() {
    return localStorage.getItem(TOKEN_KEY)
}

export function setAdminSession({ token, username, centre }) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem('adminUsername', username)
    localStorage.setItem('adminCentre', centre)
}

export function clearAdminSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('adminUsername')
    localStorage.removeItem('adminCentre')
}

export async function adminLoginRequest(username, password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
    return parseOrThrow(res)
}

function authHeaders() {
    return { Authorization: `Bearer ${getAdminToken()}` }
}

export async function fetchAdminBookingsRequest(date) {
    const params = date ? `?date=${encodeURIComponent(date)}` : ''
    const res = await fetch(`${API_BASE}/admin/bookings${params}`, { headers: authHeaders() })
    return parseOrThrow(res)
}

export async function updateBookingStatusRequest(id, { status, delayMinutes }) {
    const res = await fetch(`${API_BASE}/admin/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status, delayMinutes }),
    })
    return parseOrThrow(res)
}

export async function updateBookingArrivedRequest(id, { arrived }) {
    const res = await fetch(`${API_BASE}/admin/bookings/${id}/arrived`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ arrived }),
    })
    return parseOrThrow(res)
}

export async function updateBookingPaymentRequest(id, { amount, status }) {
    const res = await fetch(`${API_BASE}/admin/bookings/${id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ amount, status }),
    })
    return parseOrThrow(res)
}

// ── slot / day closure ──

export async function fetchSlotsForDateRequest(date) {
    const res = await fetch(`${API_BASE}/admin/slots?date=${encodeURIComponent(date)}`, { headers: authHeaders() })
    return parseOrThrow(res)
}

export async function closeSlotRequest(date, time) {
    const res = await fetch(`${API_BASE}/admin/slots/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ date, time }),
    })
    return parseOrThrow(res)
}

export async function reopenSlotRequest(date, time) {
    const res = await fetch(`${API_BASE}/admin/slots/reopen`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ date, time }),
    })
    return parseOrThrow(res)
}

export async function closeDayRequest(date, reason) {
    const res = await fetch(`${API_BASE}/admin/days/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ date, reason }),
    })
    return parseOrThrow(res)
}

export async function reopenDayRequest(date) {
    const res = await fetch(`${API_BASE}/admin/days/close`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ date }),
    })
    return parseOrThrow(res)
}

// ── stats / history / trends ──

export async function fetchAdminStatsRequest() {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() })
    return parseOrThrow(res)
}

export async function fetchAdminHistoryRequest({ page = 1, startDate, endDate } = {}) {
    const params = new URLSearchParams({ page: String(page) })
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const res = await fetch(`${API_BASE}/admin/history?${params}`, { headers: authHeaders() })
    return parseOrThrow(res)
}

export async function fetchAdminTrendsRequest() {
    const res = await fetch(`${API_BASE}/admin/trends`, { headers: authHeaders() })
    return parseOrThrow(res)
}
