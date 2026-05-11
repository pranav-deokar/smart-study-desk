import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './AuthPage.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handle = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div className="auth-grid" />

      <div className="auth-container animate-fade-up">
        <div className="auth-logo">
          <svg viewBox="0 0 60 60" fill="none">
            <rect x="6" y="12" width="48" height="30" rx="4" stroke="#00d4ff" strokeWidth="1.5"/>
            <rect x="21" y="42" width="18" height="6" fill="#00d4ff" opacity="0.2"/>
            <rect x="15" y="48" width="30" height="2" rx="1" fill="#00d4ff"/>
            <circle cx="30" cy="27" r="7" stroke="#00d4ff" strokeWidth="1.5"/>
            <circle cx="30" cy="27" r="3" fill="#00d4ff" opacity="0.4"/>
            <circle cx="30" cy="27" r="1" fill="#00d4ff"/>
          </svg>
          <div>
            <h1 className="auth-brand">SmartDesk</h1>
            <p className="auth-tagline">Intelligent Study System</p>
          </div>
        </div>

        <div className="auth-card card">
          <div className="auth-card__header">
            <h2>Sign In</h2>
            <p>Access your study dashboard</p>
          </div>

          <form onSubmit={handle} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : null}
              {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>

          <p className="auth-switch">
            New to SmartDesk? <Link to="/register">Create account</Link>
          </p>
        </div>

        <div className="auth-features">
          {['AI Posture Detection', 'Distance Monitor', 'Pomodoro Timer', 'Smart Insights'].map(f => (
            <span key={f} className="feature-chip">{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
