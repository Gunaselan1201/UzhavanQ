import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarIcon } from './formicons.jsx'
import './datepicker.css'

// 'YYYY-MM-DD' in local time — ISO strings also compare correctly with < and >.
function toKey(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function fromKey(key) {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d)
}

// weekdays/months are the localized arrays from datepicker.weekdays / datepicker.months
function formatLong(key, weekdays, months) {
    const date = fromKey(key)
    return `${weekdays[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function DatePicker({ value, onChange, minDate, maxDate, placeholder }) {
    const { t } = useTranslation()
    const weekdays = t('datepicker.weekdays', { returnObjects: true })
    const months = t('datepicker.months', { returnObjects: true })
    const [open, setOpen] = useState(false)
    const [viewMonth, setViewMonth] = useState(() => fromKey(value || minDate))
    const wrapRef = useRef(null)

    useEffect(() => {
        if (!open) return
        const handlePointerDown = (e) => {
            if (!wrapRef.current?.contains(e.target)) setOpen(false)
        }
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [open])

    const cells = useMemo(() => {
        const year = viewMonth.getFullYear()
        const month = viewMonth.getMonth()
        const offset = new Date(year, month, 1).getDay()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const list = Array.from({ length: offset }, () => null)
        for (let d = 1; d <= daysInMonth; d += 1) list.push(new Date(year, month, d))
        return list
    }, [viewMonth])

    const monthKey = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`
    const atFirstMonth = monthKey <= minDate.slice(0, 7)
    const atLastMonth = monthKey >= maxDate.slice(0, 7)

    const shiftMonth = (delta) => {
        setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
    }

    const pick = (key) => {
        onChange(key)
        setOpen(false)
    }

    return (
        <div className="datepicker" ref={wrapRef}>
            <button
                type="button"
                className={`datepicker-field${open ? ' datepicker-field--open' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <CalendarIcon className="datepicker-field-icon" />
                <span className={`datepicker-value${value ? '' : ' datepicker-value--empty'}`}>
                    {value ? formatLong(value, weekdays, months) : (placeholder ?? t('datepicker.selectDate'))}
                </span>
            </button>

            {open && (
                <div className="datepicker-panel" role="dialog" aria-label={t('datepicker.selectDate')}>
                    <div className="datepicker-head">
                        <button
                            type="button"
                            className="datepicker-nav"
                            aria-label={t('datepicker.prevMonth')}
                            disabled={atFirstMonth}
                            onClick={() => shiftMonth(-1)}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <span className="datepicker-month">
                            {months[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                        </span>
                        <button
                            type="button"
                            className="datepicker-nav"
                            aria-label={t('datepicker.nextMonth')}
                            disabled={atLastMonth}
                            onClick={() => shiftMonth(1)}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>

                    <div className="datepicker-weekdays">
                        {weekdays.map((day, i) => (
                            <span key={i} className="datepicker-weekday">{day}</span>
                        ))}
                    </div>

                    <div className="datepicker-grid">
                        {cells.map((date, i) => {
                            if (!date) return <span key={`blank-${i}`} className="datepicker-day-blank" />
                            const key = toKey(date)
                            const selectable = key >= minDate && key <= maxDate
                            const selected = key === value
                            const isToday = key === toKey(new Date())
                            const classes = ['datepicker-day']
                            if (selected) classes.push('datepicker-day--selected')
                            else if (selectable) classes.push('datepicker-day--open')
                            if (isToday && !selected) classes.push('datepicker-day--today')
                            return (
                                <button
                                    type="button"
                                    key={key}
                                    className={classes.join(' ')}
                                    disabled={!selectable}
                                    aria-current={isToday ? 'date' : undefined}
                                    onClick={() => pick(key)}
                                >
                                    {date.getDate()}
                                </button>
                            )
                        })}
                    </div>

                    <p className="datepicker-note">{t('datepicker.windowNote')}</p>
                </div>
            )}
        </div>
    )
}

export default DatePicker
