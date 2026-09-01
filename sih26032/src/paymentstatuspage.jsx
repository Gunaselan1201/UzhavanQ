import { useTranslation } from 'react-i18next'
import PageShell from './pageshell.jsx'
import './placeholderpage.css'

function PaymentStatusPage() {
    const { t } = useTranslation()

    return (
        <PageShell title={t('paymentStatus.title')}>
            <div className="placeholder-body">
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                    <rect x="10" y="16" width="52" height="40" rx="6" stroke="#B6C7A8" strokeWidth="3" />
                    <path d="M10 28H62" stroke="#B6C7A8" strokeWidth="3" />
                    <path d="M20 40H44" stroke="#B6C7A8" strokeWidth="3" strokeLinecap="round" />
                    <path d="M20 48H32" stroke="#B6C7A8" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <p className="placeholder-title">{t('paymentStatus.comingSoon')}</p>
                <p className="placeholder-text">{t('paymentStatus.body')}</p>
            </div>
        </PageShell>
    )
}

export default PaymentStatusPage
