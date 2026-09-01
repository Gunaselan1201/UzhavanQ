// Shared formatting helpers for the admin pages (AdminDashboard, AdminHistory).

export function formatClock(date) {
    let hours = date.getHours() % 12
    if (hours === 0) hours = 12
    const suffix = date.getHours() >= 12 ? 'PM' : 'AM'
    return `${hours}:${String(date.getMinutes()).padStart(2, '0')} ${suffix}`
}

export function formatHistoryTimestamp(value) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return `${d.toLocaleDateString()} ${formatClock(d)}`
}
