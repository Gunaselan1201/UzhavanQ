import { useEffect, useState } from 'react'
import './otpnotification.css'

const ENTER_DELAY_MS = 500 // feels like an SMS arriving, not an instant popup
const VISIBLE_MS = 5000

// Remount this (e.g. via a changing `key` prop) to re-trigger the toast —
// used for both the initial "send" and each "resend".
function OtpNotification({ sender, message }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const showTimer = setTimeout(() => setVisible(true), ENTER_DELAY_MS)
        const hideTimer = setTimeout(() => setVisible(false), ENTER_DELAY_MS + VISIBLE_MS)
        return () => {
            clearTimeout(showTimer)
            clearTimeout(hideTimer)
        }
    }, [])

    return (
        <div
            className={`otp-toast${visible ? ' otp-toast--visible' : ''}`}
            role="status"
            aria-live="polite"
            onClick={() => setVisible(false)}
        >
            <span className="otp-toast-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="4" width="16" height="12" rx="2.5" stroke="#1F5C2E" strokeWidth="1.6" />
                    <path d="M3 5.5L10 11L17 5.5" stroke="#1F5C2E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
            <span className="otp-toast-body">
                <span className="otp-toast-sender">{sender}</span>
                <span className="otp-toast-text">{message}</span>
            </span>
        </div>
    )
}

export default OtpNotification
