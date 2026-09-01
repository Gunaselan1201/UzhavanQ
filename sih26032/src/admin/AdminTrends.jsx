import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'
import { getCentre } from '../centres.js'
import { fetchAdminTrendsRequest, clearAdminSession } from './adminApi.js'
import AdminNavbar from './AdminNavbar.jsx'
import './AdminDashboard.css'
import './AdminTrends.css'

function formatShortDate(dateStr) {
    const [, month, day] = dateStr.split('-')
    return `${day}/${month}`
}

function AdminTrends() {
    const navigate = useNavigate()
    const centreName = localStorage.getItem('adminCentre') || ''
    const username = localStorage.getItem('adminUsername') || ''

    const [trends, setTrends] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchAdminTrendsRequest()
            .then(setTrends)
            .catch((err) => {
                if (err.status === 401) {
                    clearAdminSession()
                    navigate('/admin/login', { replace: true })
                    return
                }
                setError(err.message || 'Could not load trends')
            })
            .finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleLogout = () => {
        clearAdminSession()
        navigate('/admin/login', { replace: true })
    }

    const chartData = (trends?.bookingsPerDay || []).map((d) => ({ ...d, label: formatShortDate(d.date) }))
    const hasAnyBookings = chartData.some((d) => d.count > 0)
    const produceBreakdown = trends?.produceBreakdown || []
    const maxProduceCount = Math.max(1, ...produceBreakdown.map((p) => p.count))

    return (
        <div className="admin-dashboard">
            <AdminNavbar
                username={username}
                centreName={getCentre(centreName)?.name || centreName}
                onLogout={handleLogout}
            />

            <div className="admin-dashboard-body">
                <div className="admin-content">
                    <h1 className="admin-toolbar-title">Trends</h1>

                    {error && <p className="admin-dashboard-error">{error}</p>}

                    {loading ? (
                        <p className="admin-dashboard-status">Loading…</p>
                    ) : (
                        <div className="admin-trends-grid">
                            <section className="admin-trends-chart-card">
                                <h2 className="admin-panel-title">Bookings per Day — Last 7 Days</h2>
                                {!hasAnyBookings ? (
                                    <div className="admin-trends-empty">
                                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                            <path d="M6 26V16M16 26V8M26 26V19" stroke="var(--admin-text-faint)" strokeWidth="2.2" strokeLinecap="round" />
                                        </svg>
                                        <span>No bookings in the last 7 days for this centre yet.</span>
                                    </div>
                                ) : (
                                    <div className="admin-trends-chart-area">
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEEE9" />
                                                <XAxis dataKey="label" tick={{ fontSize: 16, fill: '#726F66', fontFamily: "'Inter', sans-serif" }} axisLine={{ stroke: '#E4E2DB' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fontSize: 16, fill: '#726F66', fontFamily: "'Inter', sans-serif" }} axisLine={false} tickLine={false} />
                                                <Tooltip cursor={{ fill: 'rgba(107, 174, 35, 0.08)' }} />
                                                <Bar dataKey="count" name="Bookings" fill="#6BAE23" radius={[8, 8, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </section>

                            <section className="admin-trends-chart-card">
                                <h2 className="admin-panel-title">Produce Breakdown — Last 7 Days</h2>
                                {produceBreakdown.length === 0 ? (
                                    <div className="admin-trends-empty">
                                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                            <circle cx="16" cy="16" r="11" stroke="var(--admin-text-faint)" strokeWidth="2.2" />
                                            <path d="M16 5v11l8 5" stroke="var(--admin-text-faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>No produce booked in the last 7 days for this centre yet.</span>
                                    </div>
                                ) : (
                                    <ul className="admin-trends-produce-list">
                                        {produceBreakdown.map((entry) => (
                                            <li key={entry.produce} className="admin-trends-produce-item">
                                                <span className="admin-trends-produce-name">{entry.produce}</span>
                                                <span className="admin-trends-produce-track">
                                                    <span
                                                        className="admin-trends-produce-fill"
                                                        style={{ width: `${(entry.count / maxProduceCount) * 100}%` }}
                                                    />
                                                </span>
                                                <span className="admin-trends-produce-count">{entry.count}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminTrends
