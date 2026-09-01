import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { getCentre } from './centres.js'
import { getProduceByName } from './produce.js'
import { getBooking } from './booking.js'
import { fetchBookingByIdRequest } from './api.js'
import { BackArrowIcon } from './formicons.jsx'
import './tokenpage.css'

// Slots are hourly per the procurement brief, so a slot start implies a 1h window.
const SLOT_MINUTES = 60

const STATUS_CLASS = {
    confirmed: 'token-status--confirmed',
    delayed: 'token-status--delayed',
    postponed: 'token-status--postponed',
    completed: 'token-status--completed',
}

function pad2(n) {
    return String(n).padStart(2, '0')
}

function formatDate(date) {
    if (!date) return '—'
    return `${pad2(date.getDate())} / ${pad2(date.getMonth() + 1)} / ${date.getFullYear()}`
}

function formatClock(date) {
    let hours = date.getHours() % 12
    if (hours === 0) hours = 12
    const suffix = date.getHours() >= 12 ? 'PM' : 'AM'
    return `${hours}:${pad2(date.getMinutes())} ${suffix}`
}

function formatTimeRange(date, minutes) {
    if (!date) return '—'
    const end = new Date(date.getTime() + minutes * 60000)
    return `${formatClock(date)} - ${formatClock(end)}`
}

function TokenPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const [remoteBooking, setRemoteBooking] = useState(null)
    const [loading, setLoading] = useState(!location.state)
    const [showQr, setShowQr] = useState(false)
    const [liveBooking, setLiveBooking] = useState(null)

    // location.state already carries the full booking after a fresh booking
    // (bookedpage → confirm) or a click from the homepage countdown/drawer
    // (both already hold it in React state). Only a direct/refreshed visit
    // to /token has nothing to start from and needs to fetch it.
    useEffect(() => {
        if (location.state) return
        let cancelled = false
        getBooking().then((booking) => {
            if (!cancelled) {
                setRemoteBooking(booking)
                setLoading(false)
            }
        })
        return () => { cancelled = true }
    }, [location.state])

    const booking = liveBooking || location.state || remoteBooking || {}

    // Picks up a status/delay change made from the admin panel without
    // requiring a manual refresh — the admin side has no push channel to the
    // farmer's browser, so a short poll is the simplest way to close that gap.
    const bookingId = booking._id
    useEffect(() => {
        if (!bookingId) return
        let cancelled = false
        const intervalId = setInterval(async () => {
            try {
                const fresh = await fetchBookingByIdRequest(bookingId)
                if (!cancelled) setLiveBooking(fresh)
            } catch {
                // transient network hiccup — the next tick will retry
            }
        }, 15000)
        return () => {
            cancelled = true
            clearInterval(intervalId)
        }
    }, [bookingId])

    // Titled when viewed as "Issued Tokens"; bare on the confirmation after booking.
    const showTitle = location.pathname === '/token'
    const hasToken = Boolean(booking.token)
    const token = booking.token || '--'

    const centre = getCentre(booking.centre)
    const centreName = centre ? t(`centres.${centre.key}.name`, centre.name) : (booking.centre || '—')
    const centreAddress = centre ? t(`centres.${centre.key}.address`, centre.address) : ''

    const produceEntry = getProduceByName(booking.produce)
    const produceName = produceEntry ? t(`produce.${produceEntry.slug}`, booking.produce) : (booking.produce || '—')

    const statusKey = booking.status || 'confirmed'
    const statusLabel = t(`token.status${statusKey.charAt(0).toUpperCase()}${statusKey.slice(1)}`)
    const statusClassName = STATUS_CLASS[statusKey] || STATUS_CLASS.confirmed

    const slotDate = booking.slotDateTime ? new Date(booking.slotDateTime) : null

    // Encodes the booking's id so a centre officer's scanner can look it up
    // via GET /api/bookings/:id — the QR carries a reference, not a data dump.
    const qrPayload = useMemo(() => booking._id || '', [booking._id])

    return (
        <div className="token-page page-shell-outer">
            <div className="token-shell">
                <header className="token-topbar">
                    <button
                        type="button"
                        className="token-back-btn icon-btn-reset"
                        aria-label={t('common.back')}
                        onClick={() => navigate('/')}
                    >
                        <BackArrowIcon dark />
                    </button>
                    {showTitle && <h1 className="token-title">{t('token.issuedTitle')}</h1>}
                </header>

                {!hasToken ? (
                    <div className="token-empty">
                        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                            <rect x="10" y="18" width="52" height="36" rx="6" stroke="#B6C7A8" strokeWidth="3" />
                            <path d="M10 32H62" stroke="#B6C7A8" strokeWidth="3" />
                            <path d="M24 44H34" stroke="#B6C7A8" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <p className="token-empty-title">{loading ? t('common.loading') : t('token.emptyTitle')}</p>
                        {!loading && <p className="token-empty-text">{t('token.emptyText')}</p>}
                        {!loading && (
                            <button
                                type="button"
                                className="token-empty-btn"
                                onClick={() => navigate('/')}
                            >
                                {t('token.bookASlot')}
                            </button>
                        )}
                    </div>
                ) : (
                <div className="token-card-area">
                    <button
                        type="button"
                        className="token-card"
                        aria-pressed={showQr}
                        aria-label={showQr ? t('token.tapForDetails') : t('token.tapForQr')}
                        onClick={() => setShowQr((v) => !v)}
                    >
                        {showQr ? (
                            <div className="token-back">
                                <span className="token-qr-label">{t('token.qrLabel')}</span>
                                <div className="token-qr">
                                    <QRCodeSVG value={qrPayload} size={224} level="M" />
                                </div>
                            </div>
                        ) : (
                            <div className="token-front">
                                <div className="token-header">
                                    <div className="token-header-text">
                                        <span className="token-centre">{centreName}</span>
                                        <span className="token-centre-address">{centreAddress}</span>
                                    </div>
                                    <span className="token-number">#{token}</span>
                                </div>

                                <div className="token-when">
                                    <span className="token-date">{formatDate(slotDate)}</span>
                                    <span className="token-time">{formatTimeRange(slotDate, SLOT_MINUTES)}</span>
                                </div>

                                <div className="token-divider" />

                                <dl className="token-rows">
                                    <div className="token-row">
                                        <dt>{t('token.farmerName')}</dt>
                                        <dd>{booking.farmerName || '—'}</dd>
                                    </div>
                                    <div className="token-row">
                                        <dt>{t('token.location')}</dt>
                                        <dd>{booking.location || '—'}</dd>
                                    </div>
                                    <div className="token-row">
                                        <dt>{t('token.produce')}</dt>
                                        <dd>{produceName}</dd>
                                    </div>
                                    <div className="token-row">
                                        <dt>{t('token.weight')}</dt>
                                        <dd>{booking.weight || '—'}</dd>
                                    </div>
                                    <div className="token-row">
                                        <dt>{t('token.status')}</dt>
                                        <dd className={`token-status ${statusClassName}`}>{statusLabel}</dd>
                                    </div>
                                </dl>
                            </div>
                        )}

                        <span className="token-tap-hint">
                            {showQr ? t('token.tapForDetails') : t('token.tapForQr')}
                        </span>
                    </button>
                </div>
                )}
            </div>
        </div>
    )
}

export default TokenPage
