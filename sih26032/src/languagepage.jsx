import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import tnLogo from './assets/Tn logo.png'
import './languagepage.css'

const LANGUAGES = [
    { code: 'ta', label: 'தமிழ்' },
    { code: 'en', label: 'English' },
]

function LanguagePage() {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const [selected, setSelected] = useState(() => sessionStorage.getItem('farmerLanguage') || 'ta')
    const timerRef = useRef(null)

    useEffect(() => () => clearTimeout(timerRef.current), [])

    const choose = (code) => {
        setSelected(code)
        sessionStorage.setItem('farmerLanguage', code)
        i18n.changeLanguage(code)
        // brief pause so the selected colour registers before moving on
        clearTimeout(timerRef.current)
        // reached from the drawer while already logged in: return home, not to login
        const destination = sessionStorage.getItem('farmerPhone') ? '/' : '/login'
        timerRef.current = setTimeout(() => navigate(destination), 260)
    }

    return (
        <div className="langpage page-shell-outer">
            <div className="langpage-shell">
                <div className="langpage-brand">
                    <img className="langpage-emblem" src={tnLogo} alt={t('language.govName')} />
                    <h1 className="langpage-title">{t('language.govName')}</h1>
                    <p className="langpage-subtitle">{t('language.department')}</p>
                </div>

                <div className="langpage-spacer" />

                <div className="langpage-actions">
                    {LANGUAGES.map((lang) => (
                        <button
                            type="button"
                            key={lang.code}
                            className={`lang-btn${selected === lang.code ? ' lang-btn--selected' : ''}`}
                            lang={lang.code}
                            aria-pressed={selected === lang.code}
                            onClick={() => choose(lang.code)}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default LanguagePage
