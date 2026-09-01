// Icon-only action buttons for the bookings table (Delay / Postpone /
// Complete / Payment / History). All use currentColor so the button's own
// text color (set via CSS, including the disabled/active states) drives them.

export function ClockIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 6v4.5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function PauseIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor" />
            <rect x="11" y="5" width="3" height="10" rx="1" fill="currentColor" />
        </svg>
    )
}

export function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function ReceiptIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M6 8h8M6 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="2.5" y="5" width="15" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    )
}

export function HistoryQuestionIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M7.2 8.2a2.8 2.8 0 1 1 3.5 2.7c-1 .3-1.7.8-1.7 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="8.9" cy="13.9" r="0.9" fill="currentColor" />
        </svg>
    )
}
