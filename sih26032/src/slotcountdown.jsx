import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function pad(n) {
    return String(n).padStart(2, '0')
}

function SlotCountdown({ target }) {
    const { t } = useTranslation()
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    const diff = Math.max(0, target - now)
    const units = [
        { value: Math.floor(diff / 86400000), label: t('countdown.days') },
        { value: Math.floor(diff / 3600000) % 24, label: t('countdown.hours') },
        { value: Math.floor(diff / 60000) % 60, label: t('countdown.minutes') },
        { value: Math.floor(diff / 1000) % 60, label: t('countdown.seconds') },
    ]

    return (
        <span className="cd-row">
            {units.map((unit, i) => (
                <Fragment key={unit.label}>
                    {i > 0 && <span className="cd-sep" aria-hidden="true" />}
                    <span className="cd-unit">
                        <span className="cd-number">{pad(unit.value)}</span>
                        <span className="cd-label">{unit.label}</span>
                    </span>
                </Fragment>
            ))}
        </span>
    )
}

export default SlotCountdown
