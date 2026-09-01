import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import confetti from './assets/confetti.svg'
import './bookedpage.css'

const HOLD_SECONDS = 3

function BookedPage() {
    const { produce } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const booking = location.state || {}
    const [secondsLeft, setSecondsLeft] = useState(HOLD_SECONDS)

    const goToToken = useCallback(() => {
        // replace: the interstitial should not sit in the back-button history
        navigate(`/register/${produce}/confirm`, { state: booking, replace: true })
    }, [navigate, produce, booking])

    useEffect(() => {
        if (secondsLeft <= 0) {
            goToToken()
            return
        }
        const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
        return () => clearTimeout(id)
    }, [secondsLeft, goToToken])

    return (
        <div className="booked-page page-shell-outer">
            <div className="booked-shell">
                <img className="booked-confetti" src={confetti} alt="" aria-hidden="true" />

                <div className="booked-content" role="status" aria-live="polite">
                    <svg
                        className="booked-icon"
                        width="123"
                        height="123"
                        viewBox="0 0 123 123"
                        fill="none"
                        aria-hidden="true"
                    >
                        <circle cx="61.5" cy="61.5" fill="white" r="58.5" stroke="#34C759" strokeWidth="6" />
                        <path
                            d="M91.0058 41.1926L52.8793 79.319L35.5491 61.9888"
                            stroke="#34C759"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="7.10983"
                        />
                    </svg>

                    <p className="booked-message">{t('booked.message')}</p>

                    <p className="booked-countdown">
                        {t('booked.openingIn', { seconds: secondsLeft })}
                    </p>

                    <button type="button" className="booked-btn" onClick={goToToken}>
                        {t('booked.viewToken')}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default BookedPage
