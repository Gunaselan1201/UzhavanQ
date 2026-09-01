import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCentre } from '../centres.js'
import { fetchAdminStatsRequest, fetchAdminHistoryRequest, clearAdminSession } from './adminApi.js'
import { formatHistoryTimestamp } from './adminFormat.js'
import AdminNavbar from './AdminNavbar.jsx'
// Reuses the page shell / table / button / activity-list styles already
// defined for AdminDashboard rather than redeclaring them here.
import './AdminDashboard.css'
import './AdminHistory.css'

function AdminHistory() {
    const navigate = useNavigate()
    const centreName = localStorage.getItem('adminCentre') || ''
    const username = localStorage.getItem('adminUsername') || ''

    const [stats, setStats] = useState(null)
    const [statsLoading, setStatsLoading] = useState(true)

    const [page, setPage] = useState(1)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [history, setHistory] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(true)
    const [error, setError] = useState('')

    const handleSessionError = (err) => {
        if (err.status === 401) {
            clearAdminSession()
            navigate('/admin/login', { replace: true })
            return true
        }
        return false
    }

    useEffect(() => {
        setStatsLoading(true)
        fetchAdminStatsRequest()
            .then(setStats)
            .catch((err) => {
                if (!handleSessionError(err)) setError(err.message || 'Could not load stats')
            })
            .finally(() => setStatsLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setHistoryLoading(true)
        fetchAdminHistoryRequest({ page, startDate, endDate })
            .then(setHistory)
            .catch((err) => {
                if (!handleSessionError(err)) setError(err.message || 'Could not load history')
            })
            .finally(() => setHistoryLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, startDate, endDate])

    const handleLogout = () => {
        clearAdminSession()
        navigate('/admin/login', { replace: true })
    }

    const applyDateFilter = (setter) => (e) => {
        setter(e.target.value)
        setPage(1)
    }

    return (
        <div className="admin-dashboard">
            <AdminNavbar
                username={username}
                centreName={getCentre(centreName)?.name || centreName}
                onLogout={handleLogout}
            />

            <div className="admin-dashboard-body">
                <div className="admin-content">
                    <h1 className="admin-toolbar-title">History</h1>

                    {error && <p className="admin-dashboard-error">{error}</p>}

                    <section className="admin-history-section">
                        <h2 className="admin-panel-title">Completed Today</h2>
                        {statsLoading ? (
                            <p className="admin-dashboard-status">Loading…</p>
                        ) : !stats || stats.completedToday.count === 0 ? (
                            <p className="admin-dashboard-status">No bookings completed today yet.</p>
                        ) : (
                            <div className="admin-booking-table-wrap">
                                <table className="admin-booking-table">
                                    <thead>
                                        <tr>
                                            <th>Token</th>
                                            <th>Farmer</th>
                                            <th>Produce</th>
                                            <th>Weight</th>
                                            <th>Time Completed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.completedToday.bookings.map((b) => (
                                            <tr key={b.token}>
                                                <td data-label="Token" className="admin-booking-token">#{b.token}</td>
                                                <td data-label="Farmer">{b.farmerName}</td>
                                                <td data-label="Produce">{b.produce}</td>
                                                <td data-label="Weight">{b.weight}</td>
                                                <td data-label="Time Completed">{formatHistoryTimestamp(b.timeCompleted)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className="admin-history-section">
                        <div className="admin-history-toolbar">
                            <h2 className="admin-panel-title">Full Activity Log</h2>
                            <div className="admin-history-filters">
                                <label className="admin-date-filter">
                                    <span>From</span>
                                    <input type="date" value={startDate} onChange={applyDateFilter(setStartDate)} />
                                </label>
                                <label className="admin-date-filter">
                                    <span>To</span>
                                    <input type="date" value={endDate} onChange={applyDateFilter(setEndDate)} />
                                </label>
                                {(startDate || endDate) && (
                                    <button
                                        type="button"
                                        className="admin-btn"
                                        onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}
                                    >
                                        Clear filter
                                    </button>
                                )}
                            </div>
                        </div>

                        {historyLoading ? (
                            <p className="admin-dashboard-status">Loading…</p>
                        ) : !history || history.entries.length === 0 ? (
                            <p className="admin-dashboard-status">No activity in this range.</p>
                        ) : (
                            <>
                                <ul className="admin-activity-list admin-activity-list--full">
                                    {history.entries.map((entry, i) => (
                                        <li key={i} className="admin-activity-item">
                                            <span className="admin-activity-detail">
                                                <span className="admin-activity-token">#{entry.token}</span> {entry.farmerName} — {entry.detail}
                                            </span>
                                            <span className="admin-activity-meta">
                                                {entry.admin} · {formatHistoryTimestamp(entry.timestamp)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="admin-pagination">
                                    <button
                                        type="button"
                                        className="admin-btn"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        ← Previous
                                    </button>
                                    <span className="admin-pagination-status">
                                        Page {history.page} of {history.totalPages} ({history.totalCount} total)
                                    </span>
                                    <button
                                        type="button"
                                        className="admin-btn"
                                        disabled={page >= history.totalPages}
                                        onClick={() => setPage((p) => Math.min(history.totalPages, p + 1))}
                                    >
                                        Next →
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}

export default AdminHistory
