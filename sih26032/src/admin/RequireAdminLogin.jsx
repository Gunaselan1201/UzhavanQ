import { Navigate } from 'react-router-dom'
import { getAdminToken } from './adminApi.js'

function RequireAdminLogin({ children }) {
    return getAdminToken()
        ? children
        : <Navigate to="/admin/login" replace />
}

export default RequireAdminLogin
