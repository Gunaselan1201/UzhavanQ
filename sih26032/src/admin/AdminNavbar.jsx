import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import tnLogo from '../assets/Tn logo.png'
import './AdminNavbar.css'

const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { key: 'slots', label: 'Manage Slots', path: '/admin/dashboard', state: { openManageSlots: true } },
    { key: 'trends', label: 'Trends', path: '/admin/trends' },
    { key: 'history', label: 'Full History', path: '/admin/history' },
]

// Top bar: TN government mark + centre identity on the left, a plain inline
// nav (same navbar-inline-link treatment as the farmer homepage's desktop
// nav — no hamburger/drawer here) + logout on the right.
function AdminNavbar({ centreName, onLogout }) {
    const navigate = useNavigate()
    const { t } = useTranslation()

    return (
        <header className="admin-navbar">
            <div className="admin-navbar-inner">
                <div className="admin-navbar-left">
                    <img src={tnLogo} alt={t('language.govName')} className="admin-navbar-logo" />

                    <div className="admin-navbar-titles">
                        <span className="admin-navbar-kicker">Procurement Admin</span>
                        {centreName && <span className="admin-navbar-centre">{centreName}</span>}
                    </div>
                </div>

                <nav className="admin-navbar-links">
                    {NAV_ITEMS.map(({ key, label, path, state }) => (
                        <button
                            type="button"
                            key={key}
                            className="admin-navbar-link"
                            onClick={() => navigate(path, state ? { state } : undefined)}
                        >
                            {label}
                        </button>
                    ))}
                    <button type="button" className="admin-navbar-link" onClick={() => navigate('/admin/help')}>
                        {t('drawer.helpSupport')}
                    </button>
                </nav>

                <div className="admin-navbar-right">
                    <span className="admin-navbar-divider" aria-hidden="true" />

                    <button type="button" className="admin-navbar-logout" onClick={onLogout}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path d="M7.5 17.5H4.5C3.67 17.5 3 16.83 3 16V4C3 3.17 3.67 2.5 4.5 2.5H7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M13 14L17 10L13 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M17 10H7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                        {t('drawer.logout')}
                    </button>
                </div>
            </div>
        </header>
    )
}

export default AdminNavbar
