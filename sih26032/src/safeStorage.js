// sessionStorage access wrapped in try/catch — private browsing (and similar)
// can make every sessionStorage call throw, and otp.js, booking.js, and
// farmer.js each handled that identically before this was extracted.
export function safeGet(key) {
    try {
        return sessionStorage.getItem(key)
    } catch {
        return null
    }
}

export function safeSet(key, value) {
    try {
        sessionStorage.setItem(key, value)
    } catch {
        // storage unavailable — the flow still works, just without persistence
    }
}

export function safeRemove(key) {
    try {
        sessionStorage.removeItem(key)
    } catch {
        // nothing to clear
    }
}
