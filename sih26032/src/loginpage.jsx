import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import tnLogo from './assets/Tn logo.png'
import { generateOtpCode, savePendingOtp } from './otp.js'
import './loginpage.css'

function LoginPage() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [digits, setDigits] = useState('')
    const [touched, setTouched] = useState(false)

    const valid = digits.length === 10
    const showError = touched && !valid && digits.length > 0
    const display = digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits

    const handleChange = (e) => {
        setDigits(e.target.value.replace(/\D/g, '').slice(0, 10))
        setTouched(true)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!valid) {
            setTouched(true)
            return
        }
        const phone = `+91 ${display}`
        const code = generateOtpCode()
        savePendingOtp(phone, code)
        navigate('/login/otp', { state: { phone, code } })
    }

    const fieldClass = showError
        ? 'phone-field phone-field--error'
        : valid
            ? 'phone-field phone-field--valid'
            : 'phone-field'

    return (
        <div className="login-page page-shell-outer">
            <div className="login-shell">
                <div className="login-brand">
                    <img src={tnLogo} alt={t('language.govName')} />
                </div>

                <div className="login-heading">
                    <h1 className="login-title">{t('login.mobileTitle')}</h1>
                    <p className="login-subtitle">{t('login.mobileSubtitle')}</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className={fieldClass}>
                        <span className="phone-prefix">+91</span>
                        <input
                            className="phone-input"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="00000 00000"
                            aria-label={t('login.mobileTitle')}
                            value={display}
                            onChange={handleChange}
                        />
                    </div>

                    <p className={`login-hint${showError ? ' login-hint--error' : ''}`}>
                        {showError ? t('login.hintError') : t('login.hintDefault')}
                    </p>

                    <div className="login-spacer" />

                    <button
                        type="submit"
                        className={`login-submit-btn${valid ? ' login-submit-btn--ready' : ''}`}
                        disabled={!valid}
                    >
                        {t('login.sendCode')}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default LoginPage
