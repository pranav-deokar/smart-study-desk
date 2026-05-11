import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { pomodoroAPI } from '../services/api'
import { format } from 'date-fns'
import './PomodoroPage.css'

export default function PomodoroPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [activeSession, setActiveSession] = useState(null)

  const fetchAll = async (optimisticSession) => {
    if (optimisticSession !== undefined) setActiveSession(optimisticSession)
    try {
      const [s, h, a] = await Promise.all([
        pomodoroAPI.stats(user.user_id),
        pomodoroAPI.history(user.user_id, 10),
        pomodoroAPI.active(user.user_id),
      ])
      setStats(s.data)
      setHistory(h.data)
      setActiveSession(
        a.data ?? (optimisticSession && ['active', 'paused'].includes(optimisticSession.status)
          ? optimisticSession
          : null)
      )
    } catch {}
  }

  useEffect(() => { fetchAll() }, [])

  return (
    <div className="pomo-page">
      <header className="page-header animate-fade-up">
        <div>
          <h1 className="page-title">
            <span className="section-title">Focus Mode</span><br />Pomodoro Timer
          </h1>
          <p className="page-subtitle">Track your focus sessions and build productive habits</p>
        </div>
      </header>

      <div className="pomo-page-grid animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <FullPomodoroTimer userId={user.user_id} activeSession={activeSession} onUpdate={fetchAll} />

        <div className="pomo-right">
          {stats && (
            <div className="card pomo-stats-card">
              <span className="section-title" style={{ display: 'block', marginBottom: 16 }}>This Week</span>
              <div className="pomo-stat-grid">
                <div className="pomo-kpi">
                  <span className="stat-value">{stats.completed}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="pomo-kpi">
                  <span className="stat-value">{stats.total_sessions}</span>
                  <span className="stat-label">Total Sessions</span>
                </div>
                <div className="pomo-kpi">
                  <span className="stat-value">{stats.total_focus_minutes}</span>
                  <span className="stat-label">Focus Minutes</span>
                </div>
                <div className="pomo-kpi">
                  <span className="stat-value">{stats.completion_rate}%</span>
                  <span className="stat-label">Completion Rate</span>
                </div>
              </div>
              <div className="progress-bar" style={{ marginTop: 16 }}>
                <div className="progress-fill cyan" style={{ width: `${stats.completion_rate}%` }} />
              </div>
            </div>
          )}

          <div className="card">
            <span className="section-title" style={{ display: 'block', marginBottom: 16 }}>Session History</span>
            <div className="session-list">
              {history.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                  No sessions yet. Start your first Pomodoro!
                </p>
              ) : history.map(s => (
                <div key={s.id} className={`session-item session-item--${s.status}`}>
                  <div className="session-item__icon">
                    {s.status === 'completed' ? '✓' : s.status === 'stopped' ? '■' : s.status === 'active' ? '▶' : '⏸'}
                  </div>
                  <div className="session-item__info">
                    <div className="session-item__name">{s.duration_minutes} min session</div>
                    <div className="session-item__time">{format(new Date(s.started_at), 'MMM d, HH:mm')}</div>
                  </div>
                  <span className={`badge ${
                    s.status === 'completed' ? 'badge-good' :
                    s.status === 'stopped' ? 'badge-bad' :
                    s.status === 'active' ? 'badge-info' : 'badge-warn'
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useRef } from 'react'
import toast from 'react-hot-toast'

function FullPomodoroTimer({ userId, activeSession, onUpdate }) {
  const [session, setSession] = useState(activeSession)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState('focus')
  const timerRef = useRef(null)

  useEffect(() => { setSession(activeSession) }, [activeSession])

  useEffect(() => {
    clearInterval(timerRef.current)
    if (session?.status === 'active') {
      const tick = () => setElapsed(Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000))
      tick()
      timerRef.current = setInterval(tick, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [session?.id, session?.status])

  const act = async (fn, args, { clearSession = false } = {}) => {
    setLoading(true)
    try {
      const { data } = await fn(args)
      const nextSession = clearSession ? null : data
      setSession(nextSession)
      onUpdate?.(nextSession && ['active', 'paused'].includes(nextSession.status) ? nextSession : null)
      return data
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setLoading(false) }
  }

  const totalSecs = (session?.duration_minutes || 25) * 60
  const remaining = Math.max(totalSecs - elapsed, 0)
  const progress = session ? Math.min(elapsed / totalSecs, 1) : 0
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')

  const circumference = 2 * Math.PI * 100
  const dashOffset = circumference * (1 - progress)
  const isActive = session?.status === 'active'
  const isPaused = session?.status === 'paused'

  return (
    <div className="card full-timer">
      <div className="full-timer__ring-wrap">
        <svg viewBox="0 0 220 220" className="full-timer__ring">
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00b4d8" />
              <stop offset="100%" stopColor="#00d4ff" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth="8" />
          <circle
            cx="110" cy="110" r="100"
            fill="none"
            stroke={isActive ? 'url(#timerGrad)' : isPaused ? 'var(--accent-amber)' : 'var(--border)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 110 110)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s' }}
          />
          {isActive && Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
            const r = 114
            const x = 110 + r * Math.cos(angle)
            const y = 110 + r * Math.sin(angle)
            return (
              <circle key={i} cx={x} cy={y} r="2" fill="var(--accent-cyan)" opacity="0.3" />
            )
          })}
        </svg>

        <div className="full-timer__center">
          <div className="full-timer__phase">{phase.toUpperCase()}</div>
          <div className="full-timer__time">{mins}:{secs}</div>
          <div className="full-timer__sublabel">
            {session ? (isActive ? 'Stay focused...' : isPaused ? 'Paused' : session.status) : 'Ready to focus'}
          </div>
        </div>
      </div>

      <div className="full-timer__controls">
        {!session ? (
          <button className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 16 }}
            onClick={() => act(pomodoroAPI.start, { user_id: userId, duration_minutes: 25, break_minutes: 5 })}
            disabled={loading}>
            ▶ Start Focus Session
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            {isActive ? (
              <button className="btn btn-secondary" style={{ padding: '12px 28px' }}
                onClick={() => act(pomodoroAPI.pause, { session_id: session.id, user_id: userId })}
                disabled={loading}>⏸ Pause</button>
            ) : (
              <button className="btn btn-primary" style={{ padding: '12px 28px' }}
                onClick={() => act(pomodoroAPI.resume, { session_id: session.id, user_id: userId })}
                disabled={loading}>▶ Resume</button>
            )}
            <button className="btn btn-ghost" style={{ padding: '12px 20px' }}
              onClick={async () => {
                const result = await act(
                  pomodoroAPI.complete,
                  { session_id: session.id, user_id: userId },
                  { clearSession: true }
                )
                if (result) toast.success('Session complete! 🎉')
              }}
              disabled={loading} title="Complete">✓ Done</button>
            <button className="btn btn-danger" style={{ padding: '12px 16px' }}
              onClick={() => act(
                pomodoroAPI.stop,
                { session_id: session.id, user_id: userId },
                { clearSession: true }
              )}
              disabled={loading} title="Stop">■</button>
          </div>
        )}
      </div>

      {session && (
        <div className="session-meta">
          <span>Session: {session.duration_minutes}min work / {session.break_minutes}min break</span>
          <span>·</span>
          <span>{session.interruptions} interruptions</span>
        </div>
      )}
    </div>
  )
}
