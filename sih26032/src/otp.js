// Stands in for a real SMS provider (Twilio/MSG91) — generates a code and
// remembers it for this session so a page refresh mid-verification doesn't
// strand the farmer.
import { safeGet, safeSet, safeRemove } from './safeStorage.js'

const PHONE_KEY = 'pendingOtpPhone'
const CODE_KEY = 'pendingOtpCode'

export function generateOtpCode() {
    return String(Math.floor(1000 + Math.random() * 9000))
}

export function savePendingOtp(phone, code) {
    safeSet(PHONE_KEY, phone)
    safeSet(CODE_KEY, code)
}

export function getPendingOtp() {
    return { phone: safeGet(PHONE_KEY), code: safeGet(CODE_KEY) }
}

export function clearPendingOtp() {
    safeRemove(PHONE_KEY)
    safeRemove(CODE_KEY)
}
