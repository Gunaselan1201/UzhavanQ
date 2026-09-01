import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageShell from './pageshell.jsx'
import './languagesettingspage.css'

const LANGUAGES = [
    { code: 'ta', label: 'தமிழ்' },
    { code: 'en', label: 'English' },
]

function LanguageSettingsPage() {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const [selected, setSelected] = useState(() => sessionStorage.getItem('farmerLanguage') || i18n.language || 'ta')
    const timerRef = useRef(null)

    useEffect(() => () => clearTimeout(timerRef.current), [])

    const choose = (code) => {
        setSelected(code)
        sessionStorage.setItem('farmerLanguage', code)
        i18n.changeLanguage(code)
        // brief pause so the selected checkmark registers before returning
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => navigate(-1), 260)
    }

    return (
        <PageShell title={t('language.selectLanguage')}>
            <div className="lang-list">
                {LANGUAGES.map((lang) => (
                    <button
                        type="button"
                        key={lang.code}
                        className="lang-list-row"
                        lang={lang.code}
                        aria-pressed={selected === lang.code}
                        onClick={() => choose(lang.code)}
                    >
                        <span className="lang-list-label">{lang.label}</span>
                        {selected === lang.code && (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <path d="M4 10.5L8 14.5L16 5.5" stroke="#28A745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>
        </PageShell>
    )
}

export default LanguageSettingsPage
