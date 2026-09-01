import { useTranslation } from 'react-i18next'
import PageShell from './pageshell.jsx'
import './placeholderpage.css'

// Placeholder contact details — replace with the real DoCA helpline before launch.
const CONTACT = {
    helpline: '1800-425-1556',
    email: 'support@tnagri.gov.in',
}

function HelpSupportPage() {
    const { t } = useTranslation()

    return (
        <PageShell title={t('help.title')}>
            <div className="placeholder-body placeholder-body--left">
                <p className="placeholder-text">{t('help.intro')}</p>

                <div className="contact-card">
                    <div className="contact-row">
                        <span className="contact-label">{t('help.helpline')}</span>
                        <a className="contact-value" href={`tel:${CONTACT.helpline}`}>{CONTACT.helpline}</a>
                    </div>
                    <div className="contact-row">
                        <span className="contact-label">{t('help.email')}</span>
                        <a className="contact-value" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                    </div>
                    <div className="contact-row">
                        <span className="contact-label">{t('help.hours')}</span>
                        <span className="contact-value">{t('help.hoursValue')}</span>
                    </div>
                </div>
            </div>
        </PageShell>
    )
}

export default HelpSupportPage
