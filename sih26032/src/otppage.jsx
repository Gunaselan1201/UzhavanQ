import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { generateOtpCode, savePendingOtp, getPendingOtp, clearPendingOtp } from './otp.js'
import { registerFarmer } from './farmer.js'
import OtpNotification from './otpnotification.jsx'
import './loginpage.css'

const OTP_LENGTH = 4
const RESEND_SECONDS = 24

// Stands in for a real name-entry step, which doesn't exist yet — only
// used the very first time a phone number ever logs in (see registerFarmer).
const DEFAULT_FARMER_NAME = 'Ramesh Kumar'

function OtpPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const pending = getPendingOtp()
    const phone = location.state?.phone || pending.phone || '+91 00000 00000'

    const [otpCode, setOtpCode] = useState(location.state?.code || pending.code || '')
    const [sendKey, setSendKey] = useState(0)
    const [code, setCode] = useState('')
    const [left, setLeft] = useState(RESEND_SECONDS)
    const [error, setError] = useState(false)
    const [verified, setVerified] = useState(false)
    const inputsRef = useRef([])

    useEffect(() => {
        inputsRef.current[0]?.focus()
    }, [])

    useEffect(() => {
        if (left <= 0) return
        const id = setInterval(() => setLeft((n) => (n > 0 ? n - 1 : 0)), 1000)
        return () => clearInterval(id)
    }, [left])

    const filled = code.trim().length
    const complete = filled === OTP_LENGTH

    const setDigit = (index, char) => {
        const arr = code.padEnd(OTP_LENGTH, ' ').split('')
        arr[index] = char || ' '
        setCode(arr.join('').replace(/\s+$/, ''))
        setError(false)
        if (char && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus()
    }

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            inputsRef.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e) => {
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH)
        if (!pasted) return
        e.preventDefault()
        setCode(pasted)
        setError(false)
        inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
    }

    const handleResend = () => {
        if (left > 0) return
        const freshCode = generateOtpCode()
        savePendingOtp(phone, freshCode)
        setOtpCode(freshCode)
        setSendKey((n) => n + 1) // remounts <OtpNotification> so it re-triggers
        setLeft(RESEND_SECONDS)
        setCode('')
        setError(false)
        inputsRef.current[0]?.focus()
    }

    const handleVerify = async (e) => {
        e.preventDefault()
        if (!complete) return
        if (code.trim() === otpCode) {
            setVerified(true)
            setError(false)
            clearPendingOtp()
            sessionStorage.setItem('farmerPhone', phone)
            try {
                // creates the account on a first-ever login for this phone,
                // or just confirms/caches the existing one — see farmer.js
                await registerFarmer(phone, DEFAULT_FARMER_NAME)
            } catch {
                // backend unreachable — let the farmer in anyway; pages that
                // read the profile fall back gracefully on their own
            }
            navigate('/')
        } else {
            setError(true)
        }
    }

    const statusText = error
        ? t('otp.wrongCode')
        : verified
            ? t('otp.verified')
            : left > 0
                ? t('otp.resendIn', { time: `0:${String(left).padStart(2, '0')}` })
                : t('otp.tapToResend')

    const statusClass = error
        ? 'otp-status otp-status--error'
        : verified
            ? 'otp-status otp-status--ok'
            : left > 0
                ? 'otp-status'
                : 'otp-status otp-status--action'

    return (
        <div className="login-page page-shell-outer">
            {otpCode && (
                <OtpNotification
                    key={sendKey}
                    sender={t('otpNotification.sender')}
                    message={t('otpNotification.message', { code: otpCode })}
                />
            )}

            <div className="login-shell">
                <div className="login-topbar">
                    <button
                        type="button"
                        className="login-back-btn icon-btn-reset"
                        aria-label={t('common.back')}
                        onClick={() => navigate(-1)}
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M12.5 4L6.5 10L12.5 16" stroke="#111511" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <span className="login-step">{t('otp.stepLabel')}</span>
                </div>

                <div className="login-heading">
                    <h1 className="login-title">{t('otp.title')}</h1>
                    <p className="login-subtitle">{t('otp.subtitle', { phone })}</p>
                </div>

                <form className="login-form" onSubmit={handleVerify}>
                    <div className="otp-cells">
                        {Array.from({ length: OTP_LENGTH }, (_, i) => {
                            const char = code[i] && code[i] !== ' ' ? code[i] : ''
                            const active = filled === i
                            const cellClass = error
                                ? 'otp-cell otp-cell--error'
                                : char
                                    ? 'otp-cell otp-cell--filled'
                                    : active
                                        ? 'otp-cell otp-cell--active'
                                        : 'otp-cell'
                            return (
                                <input
                                    key={i}
                                    ref={(el) => { inputsRef.current[i] = el }}
                                    className={cellClass}
                                    inputMode="numeric"
                                    maxLength={1}
                                    aria-label={`Digit ${i + 1}`}
                                    value={char}
                                    onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, '').slice(-1))}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    onPaste={handlePaste}
                                />
                            )
                        })}
                    </div>

                    <button type="button" className={statusClass} onClick={handleResend}>
                        {statusText}
                    </button>

                    <div className="login-spacer" />

                    <button
                        type="submit"
                        className={`login-submit-btn${complete ? ' login-submit-btn--ready' : ''}`}
                        disabled={!complete}
                    >
                        {verified ? t('otp.verified') : t('otp.verify')}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default OtpPage
