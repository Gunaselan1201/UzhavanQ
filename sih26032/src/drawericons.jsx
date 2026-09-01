// Stroke icons for the side drawer — all use currentColor so they inherit
// the drawer link's text colour automatically.

export function AccountIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 17c0-3.31 3.13-6 7-6s7 2.69 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    )
}

export function HomeIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 9.5L10 3l7 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 8v8.5a.5.5 0 0 0 .5.5H8v-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V17h2.5a.5.5 0 0 0 .5-.5V8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
    )
}

export function TokenIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
                d="M3 8.5a1.5 1.5 0 0 0 0-3V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1.5a1.5 1.5 0 0 0 0 3v3a1.5 1.5 0 0 0 0 3V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1.5a1.5 1.5 0 0 0 0-3v-3Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <path d="M10 4.5v11" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.6 1.8" strokeLinecap="round" />
        </svg>
    )
}

export function PaymentIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2.5" y="5" width="15" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.6" />
            <path d="M5.5 12.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    )
}

export function LanguageIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 10h14" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 3c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
    )
}

export function HelpIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M7.8 7.8a2.2 2.2 0 1 1 3.1 2c-.9.5-1.4.9-1.4 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="14.2" r="0.9" fill="currentColor" />
        </svg>
    )
}

export function HistoryIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10 6v4.5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function TrendsIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 16.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="4.5" y="10.5" width="2.6" height="6" rx="0.6" fill="currentColor" />
            <rect x="8.7" y="7" width="2.6" height="9.5" rx="0.6" fill="currentColor" />
            <rect x="12.9" y="4" width="2.6" height="12.5" rx="0.6" fill="currentColor" />
        </svg>
    )
}

// Used by the drawer's own close button (farmer homepage.jsx and admin
// AdminNavbar.jsx) — hardcoded stroke, not currentColor, since it's always
// dark-on-white regardless of which drawer it's closing.
export function CloseIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 2L16 16" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M16 2L2 16" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    )
}
