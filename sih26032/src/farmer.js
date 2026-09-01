import { upsertFarmerRequest, fetchFarmerByPhoneRequest } from './api.js'
import { safeGet, safeSet, safeRemove } from './safeStorage.js'

// Session-local cache of the signed-in farmer's profile, keyed by nothing
// but "the current session" since only one farmer is ever signed in at a
// time. The backend (server/models/Farmer.js) is the real source of truth.
const CACHE_KEY = 'farmerProfile'

// Used only if the backend is unreachable — keeps the demo usable offline.
const FALLBACK_NAME = 'Farmer'

function readCache() {
    const raw = safeGet(CACHE_KEY)
    if (!raw) return null
    try {
        return JSON.parse(raw)
    } catch {
        return null
    }
}

function writeCache(farmer) {
    safeSet(CACHE_KEY, JSON.stringify(farmer))
}

// The phone is the login identity itself (set at OTP verification), so it's
// available locally without a round trip — only the name/address live server-side.
export function getFarmerPhone() {
    return safeGet('farmerPhone') || ''
}

// Synchronous, like getFarmerPhone — but these only reflect real data once
// getFarmerProfile() has resolved at least once this session and cached it.
// Callers that render before then just see '' until the next re-render.
export function getFarmerTaluk() {
    return readCache()?.taluk || ''
}

export function getFarmerDistrict() {
    return readCache()?.district || ''
}

export function getFarmerState() {
    return readCache()?.state || ''
}

// Called right after OTP verification succeeds — creates the account on a
// first-ever login, or returns the existing one unchanged on every login
// after that (see server/controllers/farmerController.js).
export async function registerFarmer(phone, name) {
    const farmer = await upsertFarmerRequest({ phone, name })
    writeCache(farmer)
    return farmer
}

// Always fetches fresh — the profile can change server-side between calls
// (right now, by hand in Compass), so a cached copy is only used as a
// fallback when the fetch itself fails, never as a shortcut to skip it.
export async function getFarmerProfile() {
    const phone = getFarmerPhone()
    if (!phone) return null

    try {
        const farmer = await fetchFarmerByPhoneRequest(phone)
        writeCache(farmer)
        return farmer
    } catch {
        return readCache() || { phone, name: FALLBACK_NAME }
    }
}

export function clearFarmerProfile() {
    safeRemove(CACHE_KEY)
}
