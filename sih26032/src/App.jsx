import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import './homepage.css'
import './tokenpage.css'
import Homepage from './homepage.jsx'
import LanguagePage from './languagepage.jsx'
import LanguageSettingsPage from './languagesettingspage.jsx'
import LoginPage from './loginpage.jsx'
import OtpPage from './otppage.jsx'
import FormPage from './formpage.jsx'
import SlotPage from './slotpage.jsx'
import BookedPage from './bookedpage.jsx'
import TokenPage from './tokenpage.jsx'
import PaymentStatusPage from './paymentstatuspage.jsx'
import HelpSupportPage from './helpsupportpage.jsx'
import AccountPage from './accountpage.jsx'
import AdminLoginPage from './admin/AdminLoginPage.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import AdminHistory from './admin/AdminHistory.jsx'
import AdminTrends from './admin/AdminTrends.jsx'
import RequireAdminLogin from './admin/RequireAdminLogin.jsx'

// Until a real auth token exists, a verified phone in the session stands in for "logged in".
function RequireLogin({ children }) {
  return sessionStorage.getItem('farmerPhone')
    ? children
    : <Navigate to="/language" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RequireLogin><Homepage /></RequireLogin>} />
      <Route path="/language" element={<LanguagePage />} />
      <Route path="/language-settings" element={<RequireLogin><LanguageSettingsPage /></RequireLogin>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/otp" element={<OtpPage />} />
      <Route path="/register/:produce" element={<RequireLogin><FormPage /></RequireLogin>} />
      <Route path="/register/:produce/slot" element={<RequireLogin><SlotPage /></RequireLogin>} />
      <Route path="/register/:produce/booked" element={<RequireLogin><BookedPage /></RequireLogin>} />
      <Route path="/register/:produce/confirm" element={<RequireLogin><TokenPage /></RequireLogin>} />
      <Route path="/token" element={<RequireLogin><TokenPage /></RequireLogin>} />
      <Route path="/payment-status" element={<RequireLogin><PaymentStatusPage /></RequireLogin>} />
      <Route path="/help" element={<RequireLogin><HelpSupportPage /></RequireLogin>} />
      <Route path="/account" element={<RequireLogin><AccountPage /></RequireLogin>} />

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<RequireAdminLogin><AdminDashboard /></RequireAdminLogin>} />
      <Route path="/admin/help" element={<RequireAdminLogin><HelpSupportPage /></RequireAdminLogin>} />
      <Route path="/admin/history" element={<RequireAdminLogin><AdminHistory /></RequireAdminLogin>} />
      <Route path="/admin/trends" element={<RequireAdminLogin><AdminTrends /></RequireAdminLogin>} />
    </Routes>
  )
}

export default App
