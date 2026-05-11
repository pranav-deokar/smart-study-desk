import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './AuthPage.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)

  const handle = async e => {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(form.email, form.password, form.full_name)
      toast.success('Account created! Welcome to SmartDesk.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
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
          </svg>
          <div>
            <h1 className="auth-brand">SmartDesk</h1>
            <p className="auth-tagline">Create your account</p>
          </div>
        </div>

        <div className="auth-card card">
          <div className="auth-card__header">
            <h2>Get Started</h2>
            <p>Set up your intelligent study companion</p>
          </div>

          <form onSubmit={handle} className="auth-form">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="input"
                type="text"
                placeholder="Your name"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                autoComplete="name"
              />
            </div>
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
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
              {loading ? <span className="spinner" style={{width:18,height:18,borderWidth:2}} /> : null}
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
