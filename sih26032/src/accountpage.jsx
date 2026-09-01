import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageShell from './pageshell.jsx'
import { AccountIcon } from './drawericons.jsx'
import { getFarmerPhone, getFarmerProfile, clearFarmerProfile } from './farmer.js'
import { clearBooking } from './booking.js'
import './placeholderpage.css'
import './accountpage.css'

function AccountPage() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [farmer, setFarmer] = useState(null)

    const handleLogout = () => {
        sessionStorage.removeItem('farmerPhone')
        clearBooking()
        clearFarmerProfile()
        navigate('/login')
    }

    useEffect(() => {
        let cancelled = false
        getFarmerProfile().then((result) => {
            if (!cancelled) setFarmer(result)
        })
        return () => { cancelled = true }
    }, [])

    return (
        <PageShell title={t('account.title')}>
            <div className="placeholder-body placeholder-body--left">
                <div className="account-avatar">
                    <AccountIcon />
                </div>
                <p className="account-name">{farmer?.name || t('common.loading')}</p>

                <div className="contact-card">
                    <div className="contact-row">
                        <span className="contact-label">{t('account.phone')}</span>
                        <span className="contact-value">{getFarmerPhone()}</span>
                    </div>
                    <div className="contact-row">
                        <span className="contact-label">{t('account.taluk')}</span>
                        <span className="contact-value">{farmer?.taluk || '—'}</span>
                    </div>
                    <div className="contact-row">
                        <span className="contact-label">{t('account.district')}</span>
                        <span className="contact-value">{farmer?.district || '—'}</span>
                    </div>
                    <div className="contact-row">
                        <span className="contact-label">{t('account.state')}</span>
                        <span className="contact-value">{farmer?.state || '—'}</span>
                    </div>
                </div>

                <p className="placeholder-text">{t('account.note')}</p>

                <button type="button" className="account-logout-btn" onClick={handleLogout}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7.5 17.5H4.5C3.67 17.5 3 16.83 3 16V4C3 3.17 3.67 2.5 4.5 2.5H7.5" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13 14L17 10L13 6" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M17 10H7.5" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    {t('drawer.logout')}
                </button>
            </div>
        </PageShell>
    )
}

export default AccountPage
