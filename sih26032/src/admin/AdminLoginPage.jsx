import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import tnLogo from '../assets/Tn logo.png'
import { adminLoginRequest, setAdminSession } from './adminApi.js'
import './AdminLoginPage.css'

function AdminLoginPage() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
            const result = await adminLoginRequest(username, password)
            setAdminSession(result)
            navigate('/admin/dashboard', { replace: true })
        } catch (err) {
            setError(err.message || 'Login failed')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="admin-auth-page">
            <div className="admin-auth-panel">
                <div className="admin-auth-left">
                    <img className="admin-auth-logo" src={tnLogo} alt="Government of Tamil Nadu emblem" />
                    <h1 className="admin-auth-heading">Government of Tamil Nadu</h1>
                    <p className="admin-auth-subheading">Department of Agriculture</p>
                </div>

                <form className="admin-auth-right" onSubmit={handleSubmit}>
                    <label className="admin-field">
                        <span className="admin-field-label">User Id:</span>
                        <input
                            className="admin-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </label>

                    <label className="admin-field">
                        <span className="admin-field-label">Password:</span>
                        <input
                            className="admin-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {error && <p className="admin-auth-error">{error}</p>}

                    <button type="submit" className="admin-auth-submit" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default AdminLoginPage
