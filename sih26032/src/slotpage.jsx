import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BackArrowIcon, ChevronDownIcon } from './formicons.jsx'
import DatePicker from './datepicker.jsx'
import { CENTRES } from './centres.js'
import { getProduce } from './produce.js'
import { saveBooking, combineDateAndSlot } from './booking.js'
import { fetchSlotAvailabilityRequest } from './api.js'
import { isSlotPast } from './slotTime.js'
import './formshell.css'
import './slotpage.css'

function toLocalDateInput(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// The fixed slot list itself — mirrors server/utils/timeSlots.js's TIME_SLOTS.
const SLOT_TIMES = ['10:30 AM', '11:30 AM', '12:30 PM', '02:00 PM', '03:00 PM', '04:00 PM']

function SlotPage() {
    const { produce } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { t } = useTranslation()
    const formData = location.state || {}

    const [centre, setCentre] = useState(formData.centre || '')
    const [date, setDate] = useState('')
    const [slot, setSlot] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [availability, setAvailability] = useState(null) // null while unknown/loading
    const [now, setNow] = useState(() => Date.now())

    const { minDate, maxDate } = useMemo(() => {
        const today = new Date()
        const max = new Date(today)
        max.setDate(max.getDate() + 3)
        return { minDate: toLocalDateInput(today), maxDate: toLocalDateInput(max) }
    }, [])

    const loadAvailability = async () => {
        if (!centre || !date) {
            setAvailability(null)
            return
        }
        try {
            const results = await fetchSlotAvailabilityRequest(centre, date)
            setAvailability(results)
        } catch {
            // leave availability as-is; the server still enforces capacity on
            // submit either way, so a failed refresh here isn't unsafe
        }
    }

    useEffect(() => {
        loadAvailability()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [centre, date])

    // Keeps "already passed" correct if a farmer leaves the page open across
    // a slot's start time — cheap to recompute, no need for a live countdown.
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000)
        return () => clearInterval(id)
    }, [])

    const statusByTime = useMemo(() => {
        const map = {}
        for (const entry of availability || []) map[entry.time] = entry.status
        return map
    }, [availability])

    const handleClear = () => {
        setDate('')
        setSlot(null)
        setSubmitError('')
    }

    const handleNext = async (e) => {
        e.preventDefault()
        setSubmitError('')

        const slotDateTime = combineDateAndSlot(date, slot)
        if (!slotDateTime) {
            setSubmitError(t('common.somethingWentWrong'))
            return
        }

        setSubmitting(true)
        try {
            const booking = await saveBooking({
                farmerName: formData.name,
                phone: formData.phone,
                location: formData.location,
                produce: getProduce(produce)?.name || produce,
                weight: Number(formData.weight),
                centre,
                slotDateTime: slotDateTime.toISOString(),
            })
            navigate(`/register/${produce}/booked`, { state: booking })
        } catch (err) {
            // the slot filled up between selection and submit — the message
            // above already reflects that; drop the now-stale selection and
            // refresh so the grid shows the real current state, not old data
            setSubmitError(err.message || t('common.somethingWentWrong'))
            setSlot(null)
            await loadAvailability()
            setSubmitting(false)
        }
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
                        <span className="form-field-label">{t('slot.centre')}</span>
                        <span className="form-select-wrap">
                            <select
                                className="form-select"
                                value={centre}
                                onChange={(e) => { setCentre(e.target.value); setSlot(null) }}
                                required
                            >
                                <option value="" disabled>{t('slot.selectCentre')}</option>
                                {CENTRES.map((c) => (
                                    <option key={c.id} value={c.id}>{t(`centres.${c.key}.name`, c.name)}</option>
                                ))}
                            </select>
                            <ChevronDownIcon className="form-select-chevron" />
                        </span>
                    </label>

                    <div className="form-field">
                        <span className="form-field-label">{t('slot.date')}</span>
                        <DatePicker
                            value={date}
                            onChange={(value) => { setDate(value); setSlot(null) }}
                            minDate={minDate}
                            maxDate={maxDate}
                            placeholder={t('datepicker.selectDate')}
                        />
                    </div>

                    <h2 className="slot-heading">{t('slot.bookYourSlot')}</h2>
                    <div className="slot-grid">
                        {SLOT_TIMES.map((time) => {
                            const isSelected = slot === time
                            const capacityStatus = statusByTime[time] || 'available'
                            const isFull = capacityStatus === 'full'
                            const isPast = isSlotPast(date, time, new Date(now))
                            // Past always wins over capacity, even if the slot
                            // would otherwise still have room.
                            const disabled = isFull || isPast

                            const className = disabled
                                ? 'slot-chip slot-chip--disabled'
                                : isSelected
                                    ? 'slot-chip slot-chip--selected'
                                    : capacityStatus === 'almost-full'
                                        ? 'slot-chip slot-chip--almost-full'
                                        : 'slot-chip slot-chip--available'
                            return (
                                <button
                                    type="button"
                                    key={time}
                                    className={className}
                                    disabled={disabled}
                                    onClick={() => setSlot(time)}
                                >
                                    {time}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="form-btn form-btn-outline" onClick={handleClear} disabled={submitting}>
                        {t('slot.clear')}
                    </button>
                    <button type="submit" className="form-btn form-btn-primary" disabled={!date || !slot || submitting}>
                        {t('slot.book')}
                    </button>
                </div>

                {submitError && <p className="slot-submit-error">{submitError}</p>}
            </form>
        </div>
    )
}

export default SlotPage
