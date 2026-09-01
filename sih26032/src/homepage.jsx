import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import heroImg from './assets/Image 7.png'
import tnLogo from './assets/Tn logo.png'
import { PRODUCE } from './produce.js'
import { getBooking, clearBooking, slotDateTime, hasSeenSlotUpdate, markSlotUpdateSeen } from './booking.js'
import { clearFarmerProfile } from './farmer.js'
import SlotCountdown from './slotcountdown.jsx'
import { AccountIcon, HomeIcon, TokenIcon, PaymentIcon, LanguageIcon, HelpIcon, CloseIcon } from './drawericons.jsx'

const VARIANT_CLASS = {
    photo: 'produce-card--photo',
    cutout: 'produce-card--cutout',
    plain: 'produce-card--plain',
}

// Admin-side changes worth blocking the homepage for — delay/postpone (plan
// changed), completed, and payment processed. Marked-arrived is excluded:
// that's the farmer's own action reflected back, not news to them.
function isNotableBookingChange(booking) {
    return (
        booking.status === 'delayed' ||
        booking.status === 'postponed' ||
        booking.status === 'completed' ||
        booking.payment?.status === 'processed'
    )
}

// Payment can only be processed once status is already 'completed', so a
// single save could make both true at once — this order picks the more
// specific line ("payment processed") over the generic "completed" one.
function slotAlertMessage(t, booking) {
    if (booking.status === 'postponed') return t('slotAlert.postponed')
    if (booking.status === 'delayed') return t('slotAlert.delayed', { minutes: booking.delayMinutes })
    if (booking.payment?.status === 'processed') return t('slotAlert.paymentProcessed')
    if (booking.status === 'completed') return t('slotAlert.completed')
    return ''
}

function Homepage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [query, setQuery] = useState('')
    const searchRef = useRef(null)

    const [booking, setBooking] = useState(null)
    const slotTime = booking ? slotDateTime(booking) : null

    // A delay/postponement made from the admin panel has no push channel to
    // the farmer's browser — this is the moment that gap gets closed: the
    // first homepage load after the change blocks the page behind a modal
    // until the farmer dismisses it, rather than a status pill they might
    // never scroll down to (token page) or open.
    const [slotAlert, setSlotAlert] = useState(null)

    useEffect(() => {
        let cancelled = false
        getBooking().then((b) => {
            if (cancelled) return
            setBooking(b)
            if (b && isNotableBookingChange(b) && !hasSeenSlotUpdate(b)) {
                setSlotAlert(b)
            }
        })
        return () => { cancelled = true }
    }, [])

    const dismissSlotAlert = () => {
        if (slotAlert) markSlotUpdateSeen(slotAlert)
        setSlotAlert(null)
    }

    // Search matches either language regardless of which one is on screen —
    // typing "onion" while in Tamil mode (or "வெங்காயம்" while in English
    // mode) should still find the card.
    const produceList = PRODUCE.map((item) => ({
        ...item,
        label: t(`produce.${item.slug}`),
        labelEn: t(`produce.${item.slug}`, { lng: 'en' }),
        labelTa: t(`produce.${item.slug}`, { lng: 'ta' }),
    }))
    const term = query.trim().toLowerCase()
    const visibleProduce = term
        ? produceList.filter((item) =>
            item.labelEn.toLowerCase().includes(term) || item.labelTa.toLowerCase().includes(term)
        )
        : produceList

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 0)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (!menuOpen) return
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setMenuOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [menuOpen])

    useEffect(() => {
        if (!searchOpen) return
        searchRef.current?.focus()
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSearchOpen(false)
                setQuery('')
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [searchOpen])

    const closeSearch = () => {
        setSearchOpen(false)
        setQuery('')
    }

    const handleLogout = () => {
        sessionStorage.removeItem('farmerPhone')
        clearBooking()
        clearFarmerProfile()
        setMenuOpen(false)
        navigate('/login')
    }

    const openToken = () => {
        setMenuOpen(false)
        // already resolved here if a booking exists — skip tokenpage's own fetch
        navigate('/token', booking ? { state: booking } : undefined)
    }

    // Backs both the off-canvas drawer (<900px) and the inline nav bar
    // (900px+) — a hamburger is a mobile-only pattern; at desktop widths
    // these render as plain links in the navbar instead. See NAV_ITEMS
    // usage below for both renderings.
    const NAV_ITEMS = [
        { key: 'account', Icon: AccountIcon, label: t('drawer.account'), onClick: () => { setMenuOpen(false); navigate('/account') } },
        { key: 'home', Icon: HomeIcon, label: t('drawer.home'), onClick: () => { setMenuOpen(false); navigate('/') } },
        { key: 'tokens', Icon: TokenIcon, label: t('drawer.issuedTokens'), onClick: openToken },
        { key: 'payment', Icon: PaymentIcon, label: t('drawer.paymentStatus'), onClick: () => { setMenuOpen(false); navigate('/payment-status') } },
        { key: 'language', Icon: LanguageIcon, label: t('drawer.language'), onClick: () => { setMenuOpen(false); navigate('/language-settings') } },
        { key: 'help', Icon: HelpIcon, label: t('drawer.helpSupport'), onClick: () => { setMenuOpen(false); navigate('/help') } },
    ]

    return (
    <>
    <nav className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}>
        {searchOpen ? (
            <>
                <input
                    ref={searchRef}
                    type="search"
                    className="navbar-search-input"
                    placeholder={t('navbar.searchPlaceholder')}
                    aria-label={t('navbar.searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button
                    type="button"
                    className="navbar-icon-btn icon-btn-reset"
                    aria-label={t('common.closeSearch')}
                    onClick={closeSearch}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M2.5 2.5L15.5 15.5" stroke="#374957" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M15.5 2.5L2.5 15.5" stroke="#374957" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </button>
            </>
        ) : (
            <>
                <button
                    type="button"
                    className="navbar-icon-btn navbar-menu-btn icon-btn-reset"
                    aria-label={t('common.openMenu')}
                    onClick={() => setMenuOpen(true)}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H21" stroke="#323232" strokeWidth="2" strokeLinecap="round" />
                        <path d="M3 12H21" stroke="#323232" strokeWidth="2" strokeLinecap="round" />
                        <path d="M3 18H21" stroke="#323232" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <span className="navbar-title">{t('navbar.title')}</span>

                {/* 900px+ only (hidden on mobile via CSS) — a hamburger is a
                    mobile-only pattern, so desktop gets inline links instead
                    of an off-canvas drawer. Text-only (no icons): the visible
                    label is the accessible name, so no title/aria-label is
                    needed. Logout lives on the account page instead, not
                    here — this bar scrolls horizontally (see CSS) if the
                    combined label widths ever exceed the pill's width. */}
                <div className="navbar-inline-nav">
                    {NAV_ITEMS.map(({ key, label, onClick }) => (
                        <button type="button" key={key} className="navbar-inline-link" onClick={onClick}>
                            {label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    className="navbar-icon-btn icon-btn-reset"
                    aria-label={t('common.search')}
                    onClick={() => setSearchOpen(true)}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="7.5" cy="7.5" r="5.5" stroke="#374957" strokeWidth="1.8" />
                        <path d="M12.5 12.5L16.5 16.5" stroke="#374957" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </button>
            </>
        )}
    </nav>

    <div
        className={`drawer-overlay${menuOpen ? ' drawer-overlay-visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
    />

    <aside className={`side-drawer${menuOpen ? ' side-drawer-open' : ''}`}>
        <button
            type="button"
            className="drawer-close-btn icon-btn-reset"
            aria-label={t('common.closeMenu')}
            onClick={() => setMenuOpen(false)}
        >
            <CloseIcon />
        </button>
        <nav className="drawer-nav">
            {NAV_ITEMS.map(({ key, Icon, label, onClick }) => (
                <button type="button" key={key} className="drawer-link" onClick={onClick}>
                    <Icon />
                    {label}
                </button>
            ))}
        </nav>

        <button type="button" className="drawer-logout-btn" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 17.5H4.5C3.67 17.5 3 16.83 3 16V4C3 3.17 3.67 2.5 4.5 2.5H7.5" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 14L17 10L13 6" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 10H7.5" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {t('drawer.logout')}
        </button>
    </aside>

    <main className="homepage">
        <section className="hero">
            <img src={heroImg} alt="" className="hero-bg" />
            <img src={tnLogo} alt={t('language.govName')} className="hero-logo" />
            {slotTime ? (
                <button type="button" className="hero-countdown-wrap" onClick={openToken}>
                    <span className="hero-countdown-bg" />
                    <span className="hero-slot-label">{t('homepage.yourSlotIn')}</span>
                    <SlotCountdown target={slotTime.getTime()} />
                </button>
            ) : (
                <div className="hero-title-wrap">
                    <div className="hero-title-bg" />
                    <h1 className="hero-title">{t('homepage.selectProduce')}</h1>
                </div>
            )}
        </section>

        {visibleProduce.length === 0 ? (
            <p className="produce-empty">{t('homepage.noProduceMatch', { query: query.trim() })}</p>
        ) : (
            <section className="produce-list">
                {visibleProduce.map((item) => (
                    <button
                        type="button"
                        key={item.slug}
                        className={`produce-card ${VARIANT_CLASS[item.variant]} produce-card--${item.slug}`}
                        style={{
                            backgroundColor: item.color,
                            ...(item.image ? { backgroundImage: `url(${item.image})` } : null),
                        }}
                        onClick={() => navigate(`/register/${item.slug}`)}
                    >
                        <span className="produce-name">{item.label}</span>
                    </button>
                ))}
            </section>
        )}
    </main>

    {slotAlert && (
        <div className="slot-alert-overlay">
            <div className="slot-alert-card" role="alertdialog" aria-modal="true" aria-labelledby="slot-alert-title">
                <button
                    type="button"
                    className="slot-alert-close icon-btn-reset"
                    aria-label={t('slotAlert.close')}
                    onClick={dismissSlotAlert}
                >
                    <CloseIcon />
                </button>
                <h2 id="slot-alert-title" className="slot-alert-title">{t('slotAlert.title')}</h2>
                <p className="slot-alert-message">
                    {slotAlertMessage(t, slotAlert)}
                </p>
                <button type="button" className="slot-alert-dismiss" onClick={dismissSlotAlert}>
                    {t('slotAlert.close')}
                </button>
            </div>
        </div>
    )}
    </>
    )
}

export default Homepage
