// Shared fetch-response handling for both api.js (farmer-facing) and
// admin/adminApi.js (admin-facing) — was defined identically in each.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function parseOrThrow(res) {
    let data = null
    try {
        data = await res.json()
    } catch {
        // no JSON body (e.g. a 204, or the server didn't respond as expected)
    }
    if (!res.ok) {
        const err = new Error(data?.error || `Request failed (${res.status})`)
        err.status = res.status
        throw err
    }
    return data
}
