export function BackArrowIcon({ dark } = {}) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
                d="M15 5L8 12L15 19"
                stroke={dark ? '#1a1a1a' : '#ffffff'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function ChevronDownIcon({ className }) {
    return (
        <svg className={className} width="18" height="10" viewBox="0 0 12 7.41" fill="none">
            <path d="M1 1L6 6L11 1" stroke="#323232" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function CalendarIcon({ className }) {
    return (
        <svg className={className} width="18" height="18" viewBox="0 0 20 21" fill="none">
            <rect x="2" y="3.5" width="16" height="15" rx="2" stroke="#979797" strokeWidth="1.4" />
            <path d="M2 8H18" stroke="#979797" strokeWidth="1.4" />
            <path d="M6 1.5V5" stroke="#979797" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M14 1.5V5" stroke="#979797" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
    )
}
