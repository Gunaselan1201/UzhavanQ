import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { getCentre } from '../centres.js'
import {
    fetchAdminBookingsRequest,
    updateBookingStatusRequest,
    updateBookingArrivedRequest,
    updateBookingPaymentRequest,
    fetchSlotsForDateRequest,
    closeSlotRequest,
    reopenSlotRequest,
    closeDayRequest,
    reopenDayRequest,
    fetchAdminStatsRequest,
    clearAdminSession,
} from './adminApi.js'
import AdminNavbar from './AdminNavbar.jsx'
import { formatClock, formatHistoryTimestamp } from './adminFormat.js'
import {
    ClockIcon,
    PauseIcon,
    CheckIcon,
    ReceiptIcon,
    HistoryQuestionIcon,
} from './adminIcons.jsx'
import './AdminDashboard.css'

const DELAY_OPTIONS = [
    { label: '10 min', value: 10 },
    { label: '20 min', value: 20 },
    { label: '30 min', value: 30 },
    { label: '1 hr', value: 60 },
    { label: '2 hr', value: 120 },
]

const STATUS_LABEL = {
    confirmed: 'Confirmed',
    delayed: 'Delayed',
    postponed: 'Postponed',
    completed: 'Completed',
}

function toLocalDateInput(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function AdminDashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const [date, setDate] = useState(() => toLocalDateInput(new Date()))
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [openDelayId, setOpenDelayId] = useState(null)
    const [actingIds, setActingIds] = useState(() => new Set())
    const [selectedIds, setSelectedIds] = useState(() => new Set())
    const [bulkDelayOpen, setBulkDelayOpen] = useState(false)
    // Screen position (viewport coords) for whichever delay dropdown is open.
    // Rendered through a portal so the table's overflow-x:auto wrapper can't
    // clip it, so this has to be tracked separately from open/closed state.
    const [delayMenuPos, setDelayMenuPos] = useState(null)

    // Manage Slots panel — keyed off the same `date` the booking table uses,
    // so picking one date drives both at once.
    const [manageSlotsOpen, setManageSlotsOpen] = useState(false)
    const [slotsData, setSlotsData] = useState(null)
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [slotActionError, setSlotActionError] = useState('')
    const [dayCloseReason, setDayCloseReason] = useState('')
    const [closingSlotTime, setClosingSlotTime] = useState(null) // which slot's request is in flight

    // Per-row audit trail — toggling a row's History button expands it
    // in place using the history[] already present on each booking, no
    // extra request needed.
    const [expandedHistoryId, setExpandedHistoryId] = useState(null)

    // Compact Recent Activity widget on the dashboard itself
    const [stats, setStats] = useState(null)

    // Bottom-right confirmation toast for the most recent action.
    const [toast, setToast] = useState('')
    const toastTimerRef = useRef(null)
    const showToast = (message) => {
        setToast(message)
        clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setToast(''), 3000)
    }
    useEffect(() => () => clearTimeout(toastTimerRef.current), [])

    const delayMenuOpen = openDelayId !== null || bulkDelayOpen

    useEffect(() => {
        if (!delayMenuOpen) return
        const closeMenu = () => {
            setOpenDelayId(null)
            setBulkDelayOpen(false)
        }
        // Portaled content still bubbles native events to document, so a
        // click or scroll inside the trigger button or the dropdown itself
        // (which scrolls internally when options overflow its max-height)
        // must be excluded — otherwise this would close the menu before an
        // option's own click handler gets a chance to fire.
        const isInsideMenu = (e) => e.target.closest?.('.admin-delay-wrap, .admin-delay-picker')
        const closeOnScroll = (e) => {
            if (isInsideMenu(e)) return
            closeMenu()
        }
        const closeOnOutsideClick = (e) => {
            if (isInsideMenu(e)) return
            closeMenu()
        }
        window.addEventListener('scroll', closeOnScroll, true)
        window.addEventListener('resize', closeMenu)
        document.addEventListener('mousedown', closeOnOutsideClick)
        return () => {
            window.removeEventListener('scroll', closeOnScroll, true)
            window.removeEventListener('resize', closeMenu)
            document.removeEventListener('mousedown', closeOnOutsideClick)
        }
    }, [delayMenuOpen])

    const openDelayMenuAt = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setDelayMenuPos({ top: rect.bottom + 4, left: rect.left })
    }

    const centreName = localStorage.getItem('adminCentre') || ''
    const username = localStorage.getItem('adminUsername') || ''

    const loadBookings = async () => {
        setLoading(true)
        setError('')
        setSelectedIds(new Set())
        try {
            const results = await fetchAdminBookingsRequest(date)
            setBookings(results)
        } catch (err) {
            if (err.status === 401) {
                clearAdminSession()
                navigate('/admin/login', { replace: true })
                return
            }
            setError(err.message || 'Could not load bookings')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadBookings()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date])

    const loadSlots = async () => {
        setSlotsLoading(true)
        setSlotActionError('')
        try {
            const result = await fetchSlotsForDateRequest(date)
            setSlotsData(result)
        } catch (err) {
            setSlotActionError(err.message || 'Could not load slots')
        } finally {
            setSlotsLoading(false)
        }
    }

    useEffect(() => {
        if (!manageSlotsOpen) return
        loadSlots()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manageSlotsOpen, date])

    // The navbar's "Manage Slots" button now lives outside this page (it's
    // reachable from History/Trends too), so it navigates here and asks for
    // the panel to open via location state rather than local button state.
    // Keyed on location.key so it still fires when already on this route.
    useEffect(() => {
        if (location.state?.openManageSlots) setManageSlotsOpen(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key])

    const loadStats = async () => {
        try {
            const result = await fetchAdminStatsRequest()
            setStats(result)
        } catch {
            // the compact widget just stays empty — not worth a page-level error
        }
    }

    useEffect(() => {
        loadStats()
    }, [])

    const applyUpdate = (updated) => {
        setBookings((prev) => prev.map((b) => (b._id === updated._id ? updated : b)))
    }

    const runAction = async (id, action, successMessage) => {
        setActingIds((prev) => new Set(prev).add(id))
        try {
            const updated = await action()
            applyUpdate(updated)
            if (successMessage) showToast(successMessage(updated))
        } catch (err) {
            setError(err.message || 'Action failed')
        } finally {
            setActingIds((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
            setOpenDelayId(null)
        }
    }

    // Fires the same status update for every selected token at once, so a
    // staff member marking a whole batch delayed/postponed doesn't have to
    // click through each row individually.
    const runBulkAction = async (ids, actionForId, successMessage) => {
        if (ids.length === 0) return
        setActingIds((prev) => new Set([...prev, ...ids]))
        const results = await Promise.allSettled(ids.map((id) => actionForId(id)))
        const updates = []
        let failedCount = 0
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                updates.push(result.value)
            } else {
                failedCount += 1
            }
        })
        if (updates.length > 0) {
            setBookings((prev) =>
                prev.map((b) => updates.find((u) => u._id === b._id) || b)
            )
        }
        if (failedCount > 0) {
            setError(`Failed to update ${failedCount} token(s)`)
        } else {
            setError('')
            if (successMessage) showToast(successMessage(updates.length))
        }
        setActingIds((prev) => {
            const next = new Set(prev)
            ids.forEach((id) => next.delete(id))
            return next
        })
        setSelectedIds(new Set())
        setBulkDelayOpen(false)
        setOpenDelayId(null)
    }

    const handleDelay = (id, minutes) =>
        runAction(
            id,
            () => updateBookingStatusRequest(id, { status: 'delayed', delayMinutes: minutes }),
            (b) => `Token ${b.token} delayed by ${minutes} min`
        )

    const handlePostpone = (id) =>
        runAction(id, () => updateBookingStatusRequest(id, { status: 'postponed' }), (b) => `Token ${b.token} postponed`)

    const handleComplete = (id) =>
        runAction(id, () => updateBookingStatusRequest(id, { status: 'completed' }), (b) => `Token ${b.token} marked completed`)

    const handlePaymentProcessed = (id) =>
        runAction(id, () => updateBookingPaymentRequest(id, { status: 'processed' }), (b) => `Token ${b.token} payment processed`)

    const handleToggleArrived = (id, arrived) =>
        runAction(id, () => updateBookingArrivedRequest(id, { arrived }), (b) => `Token ${b.token} marked ${arrived ? 'arrived' : 'not arrived'}`)

    const selectedIdList = Array.from(selectedIds)

    const handleBulkDelay = (minutes) =>
        runBulkAction(
            selectedIdList,
            (id) => updateBookingStatusRequest(id, { status: 'delayed', delayMinutes: minutes }),
            (n) => `${n} token(s) delayed by ${minutes} min`
        )

    const handleBulkPostpone = () =>
        runBulkAction(selectedIdList, (id) => updateBookingStatusRequest(id, { status: 'postponed' }), (n) => `${n} token(s) postponed`)

    const handleBulkComplete = () =>
        runBulkAction(selectedIdList, (id) => updateBookingStatusRequest(id, { status: 'completed' }), (n) => `${n} token(s) marked completed`)

    const handleBulkArrived = () =>
        runBulkAction(selectedIdList, (id) => updateBookingArrivedRequest(id, { arrived: true }), (n) => `${n} token(s) marked arrived`)

    // Closing a slot/day can postpone bookings on the currently-visible
    // date, so both the slot list and the booking table refresh afterward.
    const handleCloseSlot = async (time) => {
        setClosingSlotTime(time)
        setSlotActionError('')
        try {
            await closeSlotRequest(date, time)
            await Promise.all([loadSlots(), loadBookings()])
            showToast(`Slot ${time} closed`)
        } catch (err) {
            setSlotActionError(err.message || 'Could not close slot')
        } finally {
            setClosingSlotTime(null)
        }
    }

    const handleReopenSlot = async (time) => {
        setClosingSlotTime(time)
        setSlotActionError('')
        try {
            await reopenSlotRequest(date, time)
            await loadSlots()
            showToast(`Slot ${time} reopened`)
        } catch (err) {
            setSlotActionError(err.message || 'Could not reopen slot')
        } finally {
            setClosingSlotTime(null)
        }
    }

    const handleCloseDay = async () => {
        setSlotActionError('')
        try {
            await closeDayRequest(date, dayCloseReason)
            setDayCloseReason('')
            await Promise.all([loadSlots(), loadBookings()])
            showToast('Day closed')
        } catch (err) {
            setSlotActionError(err.message || 'Could not close day')
        }
    }

    const handleReopenDay = async () => {
        setSlotActionError('')
        try {
            await reopenDayRequest(date)
            await loadSlots()
            showToast('Day reopened')
        } catch (err) {
            setSlotActionError(err.message || 'Could not reopen day')
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const allSelected = bookings.length > 0 && selectedIds.size === bookings.length

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(bookings.map((b) => b._id)))
    }

    const handleLogout = () => {
        clearAdminSession()
        navigate('/admin/login', { replace: true })
    }

    // Stat row — computed from the bookings already loaded for `date`, so
    // every figure here is real (no fabricated revenue/farmer totals).
    const farmersServed = new Set(bookings.filter((b) => b.status === 'completed').map((b) => b.farmerName)).size
    const pendingCount = bookings.filter((b) => b.status === 'confirmed' || b.status === 'delayed').length
    const completedCount = bookings.filter((b) => b.status === 'completed').length
    const postponedCount = bookings.filter((b) => b.status === 'postponed').length

    return (
        <div className="admin-dashboard">
            <AdminNavbar
                username={username}
                centreName={getCentre(centreName)?.name || centreName}
                onLogout={handleLogout}
            />

            <div className="admin-dashboard-body">
                <div className="admin-content">
                    <div className="admin-toolbar">
                        <h1 className="admin-toolbar-title">Bookings</h1>
                        <div className="admin-toolbar-actions">
                            <label className="admin-date-filter">
                                <span>Date</span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </label>
                        </div>
                    </div>

                    {!loading && bookings.length > 0 && (
                        <div className="admin-stats-row">
                            <div className="admin-stat">
                                <span className="admin-stat-value">{farmersServed}</span>
                                <span className="admin-stat-label">Farmers Served</span>
                            </div>
                            <div className="admin-stat">
                                <span className="admin-stat-value">{bookings.length}</span>
                                <span className="admin-stat-label">Bookings Received</span>
                            </div>
                            <div className="admin-stat">
                                <span className="admin-stat-value admin-stat-value--delayed">{pendingCount}</span>
                                <span className="admin-stat-label">Pending</span>
                            </div>
                            <div className="admin-stat">
                                <span className="admin-stat-value">{completedCount}</span>
                                <span className="admin-stat-label">Completed</span>
                            </div>
                            <div className="admin-stat">
                                <span className="admin-stat-value admin-stat-value--postponed">{postponedCount}</span>
                                <span className="admin-stat-label">Postponed</span>
                            </div>
                        </div>
                    )}

                    {error && <p className="admin-dashboard-error">{error}</p>}

                    {manageSlotsOpen && (
                        <div className="admin-manage-slots">
                            <div className="admin-manage-slots-header">
                                <h2 className="admin-panel-title">Manage Slots — {date}</h2>
                                <button type="button" className="admin-btn" onClick={() => setManageSlotsOpen(false)}>
                                    Hide
                                </button>
                            </div>

                            {slotActionError && <p className="admin-dashboard-error">{slotActionError}</p>}

                            {slotsLoading || !slotsData ? (
                                <p className="admin-dashboard-status">Loading…</p>
                            ) : (
                                <>
                                    {slotsData.dayClosed ? (
                                        <div className="admin-day-closure admin-day-closure--closed">
                                            <span>
                                                This entire day is closed{slotsData.reason ? ` — ${slotsData.reason}` : ''}.
                                            </span>
                                            <button type="button" className="admin-btn" onClick={handleReopenDay}>
                                                Reopen day
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="admin-day-closure">
                                            <input
                                                type="text"
                                                className="admin-day-reason-input"
                                                placeholder="Reason (optional) — e.g. Public holiday"
                                                value={dayCloseReason}
                                                onChange={(e) => setDayCloseReason(e.target.value)}
                                            />
                                            <button type="button" className="admin-btn admin-btn--danger" onClick={handleCloseDay}>
                                                Close entire day
                                            </button>
                                        </div>
                                    )}

                                    <ul className="admin-slot-list">
                                        {slotsData.slots.map((slot) => (
                                            <li key={slot.time} className={`admin-slot-row${slot.closed ? ' admin-slot-row--closed' : ''}`}>
                                                <span className="admin-slot-time">{slot.time}</span>
                                                <span className="admin-slot-count">
                                                    {slot.bookedCount} booked · {slot.closed ? 'Closed' : 'Open'}
                                                </span>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={!slot.closed}
                                                    aria-label={`${slot.closed ? 'Reopen' : 'Close'} slot ${slot.time}`}
                                                    className={`admin-toggle${!slot.closed ? ' admin-toggle--on' : ''}`}
                                                    disabled={closingSlotTime === slot.time || slotsData.dayClosed}
                                                    onClick={() => (slot.closed ? handleReopenSlot(slot.time) : handleCloseSlot(slot.time))}
                                                >
                                                    <span className="admin-toggle-knob" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}

                    {stats && (
                        <div className="admin-recent-activity">
                            <div className="admin-recent-activity-header">
                                <h2 className="admin-panel-title">Recent Activity</h2>
                                <Link to="/admin/history" className="admin-view-full-link">View full history →</Link>
                            </div>
                            {stats.recentActivity.length === 0 ? (
                                <p className="admin-dashboard-status">No activity yet.</p>
                            ) : (
                                <ul className="admin-activity-list">
                                    {stats.recentActivity.slice(0, 8).map((entry, i) => (
                                        <li key={i} className="admin-activity-item">
                                            <span className="admin-activity-detail">
                                                #{entry.token} — {entry.detail}
                                            </span>
                                            <span className="admin-activity-meta">
                                                {entry.admin} · {formatHistoryTimestamp(entry.timestamp)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {selectedIds.size > 0 && (
                        <div className="admin-bulk-toolbar">
                            <span className="admin-bulk-count">{selectedIds.size} selected</span>
                            <span className="admin-delay-wrap">
                                <button
                                    type="button"
                                    className="admin-btn admin-btn--warn"
                                    onClick={(e) => {
                                        if (bulkDelayOpen) {
                                            setBulkDelayOpen(false)
                                            return
                                        }
                                        openDelayMenuAt(e)
                                        setOpenDelayId(null)
                                        setBulkDelayOpen(true)
                                    }}
                                >
                                    Delay
                                </button>
                                {bulkDelayOpen && delayMenuPos && createPortal(
                                    <div
                                        className="admin-delay-picker admin-delay-picker--portal"
                                        style={{ top: delayMenuPos.top, left: delayMenuPos.left }}
                                    >
                                        {DELAY_OPTIONS.map((opt) => (
                                            <button
                                                type="button"
                                                key={opt.value}
                                                className="admin-delay-option"
                                                onClick={() => handleBulkDelay(opt.value)}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>,
                                    document.body
                                )}
                            </span>
                            <button type="button" className="admin-btn admin-btn--danger" onClick={handleBulkPostpone}>
                                Postpone
                            </button>
                            <button
                                type="button"
                                className="admin-btn admin-btn--info"
                                onClick={handleBulkArrived}
                            >
                                Mark Arrived
                            </button>
                            <button
                                type="button"
                                className="admin-btn admin-btn--primary"
                                onClick={handleBulkComplete}
                            >
                                Mark Completed
                            </button>
                            <button
                                type="button"
                                className="admin-btn admin-bulk-clear"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <p className="admin-dashboard-status">Loading…</p>
                    ) : bookings.length === 0 ? (
                        <p className="admin-dashboard-status">No bookings for this date.</p>
                    ) : (
                        <div className="admin-booking-table-wrap">
                        <table className="admin-booking-table">
                            <thead>
                                <tr>
                                    <th className="admin-booking-checkbox-col">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                            aria-label="Select all tokens"
                                        />
                                    </th>
                                    <th>Token</th>
                                    <th>Farmer</th>
                                    <th>Produce</th>
                                    <th>Weight</th>
                                    <th>Slot</th>
                                    <th>Status</th>
                                    <th>Arrived</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((b) => {
                                    const slotTime = b.slotDateTime ? formatClock(new Date(b.slotDateTime)) : '—'
                                    const busy = actingIds.has(b._id)
                                    // Payment Processed is the final step in the workflow — once set,
                                    // nothing about the booking's status should be editable anymore.
                                    const paymentProcessed = b.payment?.status === 'processed'
                                    const locked = busy || paymentProcessed
                                    const delayOpenHere = openDelayId === b._id
                                    return (
                                    <Fragment key={b._id}>
                                        <tr className={selectedIds.has(b._id) ? 'admin-row-selected' : ''}>
                                            <td data-label="Select" className="admin-booking-checkbox-col">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(b._id)}
                                                    disabled={locked}
                                                    onChange={() => toggleSelect(b._id)}
                                                    aria-label={`Select token ${b.token}`}
                                                />
                                            </td>
                                            <td data-label="Token" className="admin-booking-token">#{b.token}</td>
                                            <td data-label="Farmer">{b.farmerName}</td>
                                            <td data-label="Produce">{b.produce}</td>
                                            <td data-label="Weight">{b.weight}</td>
                                            <td data-label="Slot">
                                                {slotTime}
                                                {b.status === 'delayed' && b.delayMinutes > 0 && (
                                                    <span className="admin-delay-tag"> +{b.delayMinutes}m</span>
                                                )}
                                            </td>
                                            <td data-label="Status">
                                                <span className={`admin-status admin-status--${b.status}`}>
                                                    {STATUS_LABEL[b.status] || b.status}
                                                </span>
                                            </td>
                                            <td data-label="Arrived" className="admin-booking-checkbox-col">
                                                <input
                                                    type="checkbox"
                                                    checked={!!b.arrived}
                                                    disabled={locked}
                                                    onChange={() => handleToggleArrived(b._id, !b.arrived)}
                                                    aria-label={`Mark token ${b.token} as arrived`}
                                                />
                                            </td>
                                            <td data-label="Actions" className="admin-booking-actions">
                                                <span className="admin-delay-wrap">
                                                    <button
                                                        type="button"
                                                        className={`admin-icon-btn admin-icon-btn--delay${delayOpenHere ? ' admin-icon-btn--active-warning' : ''}`}
                                                        disabled={locked}
                                                        aria-label={`Delay token ${b.token}`}
                                                        title="Delay"
                                                        onClick={(e) => {
                                                            if (delayOpenHere) {
                                                                setOpenDelayId(null)
                                                                return
                                                            }
                                                            openDelayMenuAt(e)
                                                            setBulkDelayOpen(false)
                                                            setOpenDelayId(b._id)
                                                        }}
                                                    >
                                                        <ClockIcon />
                                                    </button>
                                                    {delayOpenHere && delayMenuPos && createPortal(
                                                        <div
                                                            className="admin-delay-picker admin-delay-picker--portal"
                                                            style={{ top: delayMenuPos.top, left: delayMenuPos.left }}
                                                        >
                                                            {DELAY_OPTIONS.map((opt) => (
                                                                <button
                                                                    type="button"
                                                                    key={opt.value}
                                                                    className="admin-delay-option"
                                                                    onClick={() => handleDelay(b._id, opt.value)}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>,
                                                        document.body
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="admin-icon-btn admin-icon-btn--postpone"
                                                    disabled={locked}
                                                    aria-label={`Postpone token ${b.token}`}
                                                    title="Postpone"
                                                    onClick={() => handlePostpone(b._id)}
                                                >
                                                    <PauseIcon />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-icon-btn admin-icon-btn--complete"
                                                    disabled={locked || b.status === 'completed'}
                                                    aria-label={`Mark token ${b.token} completed`}
                                                    title="Mark Completed"
                                                    onClick={() => handleComplete(b._id)}
                                                >
                                                    <CheckIcon />
                                                </button>
                                                {b.status === 'completed' ? (
                                                    paymentProcessed ? (
                                                        <span className="admin-payment-paid">Paid</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="admin-icon-btn admin-icon-btn--payment"
                                                            disabled={busy}
                                                            aria-label={`Mark token ${b.token} payment processed`}
                                                            title="Mark Payment Processed"
                                                            onClick={() => handlePaymentProcessed(b._id)}
                                                        >
                                                            <ReceiptIcon />
                                                        </button>
                                                    )
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn admin-icon-btn--payment"
                                                        disabled
                                                        aria-label="Payment (available once completed)"
                                                        title="Payment (available once completed)"
                                                    >
                                                        <ReceiptIcon />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className={`admin-icon-btn${expandedHistoryId === b._id ? ' admin-icon-btn--active-info' : ''}`}
                                                    aria-label={`History for token ${b.token}${b.history?.length > 0 ? ` (${b.history.length})` : ''}`}
                                                    title="History"
                                                    onClick={() => setExpandedHistoryId((id) => (id === b._id ? null : b._id))}
                                                >
                                                    <HistoryQuestionIcon />
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedHistoryId === b._id && (
                                            <tr className="admin-history-row">
                                                <td colSpan={9}>
                                                    {(!b.history || b.history.length === 0) ? (
                                                        <p className="admin-dashboard-status">No history yet for this booking.</p>
                                                    ) : (
                                                        <ul className="admin-history-list">
                                                            {[...b.history].reverse().map((h, i) => (
                                                                <li key={i} className="admin-history-item">
                                                                    <span className="admin-history-action">{h.action}</span>
                                                                    <span className="admin-history-detail">{h.detail}</span>
                                                                    <span className="admin-history-meta">{h.admin} · {formatHistoryTimestamp(h.timestamp)}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            </div>

            {toast && (
                <div className="admin-toast" role="status">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="8.5" stroke="#1C8A4B" strokeWidth="1.6" />
                        <path d="M6.3 10.3l2.4 2.4 5-5.4" stroke="#1C8A4B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{toast}</span>
                </div>
            )}
        </div>
    )
}

export default AdminDashboard
