import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BackArrowIcon } from './formicons.jsx'
import { getProduce } from './produce.js'
import { getFarmerPhone, getFarmerProfile } from './farmer.js'
import './formshell.css'

function FormPage() {
    const { produce } = useParams()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const produceEntry = getProduce(produce)
    const produceLabel = produceEntry ? t(`produce.${produceEntry.slug}`) : produce
    const phone = getFarmerPhone()

    const [farmerName, setFarmerName] = useState('')
    const [weight, setWeight] = useState('')
    const [location, setLocation] = useState('')

    useEffect(() => {
        let cancelled = false
        getFarmerProfile().then((farmer) => {
            if (!cancelled) setFarmerName(farmer?.name || '')
        })
        return () => { cancelled = true }
    }, [])

    const handleNext = (e) => {
        e.preventDefault()
        navigate(`/register/${produce}/slot`, {
            state: {
                name: farmerName,
                phone,
                produce: produceLabel,
                weight,
                location,
            },
        })
    }

    return (
        <div className="form-page">
            <div className="form-banner" />
            <button type="button" className="form-back-btn icon-btn-reset" aria-label={t('common.back')} onClick={() => navigate(-1)}>
                <BackArrowIcon />
            </button>

            <form className="form-card" onSubmit={handleNext}>
                <div className="form-fields">
                    <label className="form-field">
                        <span className="form-field-label">{t('form.name')}</span>
                        <input type="text" className="form-field-readonly" value={farmerName} readOnly />
                    </label>

                    <label className="form-field">
                        <span className="form-field-label">{t('form.phone')}</span>
                        <input type="tel" className="form-field-readonly" value={phone} readOnly />
                    </label>

                    <label className="form-field">
                        <span className="form-field-label">{t('form.produceType')}</span>
                        <input type="text" className="form-field-readonly" value={produceLabel} readOnly />
                    </label>

                    <label className="form-field">
                        <span className="form-field-label">{t('form.weight')}</span>
                        <input
                            type="number"
                            placeholder={t('form.weightPlaceholder')}
                            min="0.1"
                            step="0.1"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            required
                        />
                    </label>

                    <label className="form-field">
                        <span className="form-field-label">{t('form.location')}</span>
                        <input
                            type="text"
                            placeholder={t('form.locationPlaceholder')}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            required
                        />
                    </label>
                </div>

                <div className="form-actions">
                    <button type="submit" className="form-btn form-btn-primary">{t('form.next')}</button>
                </div>
            </form>
        </div>
    )
}

export default FormPage
