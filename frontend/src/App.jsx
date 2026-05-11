import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { onForegroundMessage } from './services/firebase'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import PomodoroPage from './pages/PomodoroPage'
import AnalyticsPage from './pages/AnalyticsPage'
import InsightsPage from './pages/InsightsPage'
import WarningsPage from './pages/WarningsPage'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload?.notification?.title || 'SmartDesk Alert'
      const body = payload?.notification?.body || 'You have a new notification.'

      toast(title === body ? title : `${title}: ${body}`)

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body })
      }
    })

    return unsubscribe
  }, [])

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0a1e38',
              color: '#e8f4fd',
              border: '1px solid rgba(0,212,255,0.2)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#00ff88', secondary: '#040d18' } },
            error: { iconTheme: { primary: '#ff4444', secondary: '#040d18' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pomodoro" element={<PomodoroPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="warnings" element={<WarningsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
