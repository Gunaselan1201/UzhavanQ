import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BackArrowIcon } from './formicons.jsx'
import './pageshell.css'

function PageShell({ title, children }) {
    const navigate = useNavigate()
    const { t } = useTranslation()

    return (
        <div className="pageshell">
            <header className="pageshell-header">
                <button
                    type="button"
                    className="pageshell-back-btn icon-btn-reset"
                    aria-label={t('common.back')}
                    onClick={() => navigate(-1)}
                >
                    <BackArrowIcon dark />
                </button>
                <h1 className="pageshell-title">{title}</h1>
            </header>

            <div className="pageshell-body">{children}</div>
        </div>
    )
}

export default PageShell
