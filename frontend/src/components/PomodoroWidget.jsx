import { useState, useEffect, useRef } from 'react'
import { pomodoroAPI } from '../services/api'
import toast from 'react-hot-toast'
import './PomodoroWidget.css'

export default function PomodoroWidget({ userId, activeSession, onUpdate }) {
  const [session, setSession] = useState(activeSession)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => { setSession(activeSession) }, [activeSession])

  useEffect(() => {
    clearInterval(timerRef.current)
    if (session?.status === 'active' && session.started_at) {
      const tick = () => {
        const startedAt = new Date(session.started_at).getTime()
        setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      }
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
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Action failed')
    } finally { setLoading(false) }
  }

  const start = () => act(pomodoroAPI.start, { user_id: userId, duration_minutes: 25, break_minutes: 5 })
  const pause = () => act(pomodoroAPI.pause, { session_id: session.id, user_id: userId })
  const resume = () => act(pomodoroAPI.resume, { session_id: session.id, user_id: userId })
  const complete = async () => {
    const result = await act(
      pomodoroAPI.complete,
      { session_id: session.id, user_id: userId },
      { clearSession: true }
    )
    if (result) toast.success('🍅 Session completed! Take a break.')
  }
  const stop = () => act(
    pomodoroAPI.stop,
    { session_id: session.id, user_id: userId },
    { clearSession: true }
  )

  const totalSecs = (session?.duration_minutes || 25) * 60
  const progress = session ? Math.min(elapsed / totalSecs, 1) : 0
  const remaining = Math.max(totalSecs - elapsed, 0)
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')

  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference * (1 - progress)

  const isActive = session?.status === 'active'
  const isPaused = session?.status === 'paused'

  return (
    <div className="card pomodoro-widget">
      <div className="card-header">
        <span className="section-title">Pomodoro Timer</span>
        {session && (
          <span className={`badge ${isActive ? 'badge-good' : isPaused ? 'badge-warn' : 'badge-info'}`}>
            {session.status}
          </span>
        )}
      </div>

      <div className="pomo-ring-wrap">
        <svg className="pomo-ring" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={isActive ? 'var(--accent-cyan)' : isPaused ? 'var(--accent-amber)' : 'var(--border)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
          />
          {isActive && (
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="var(--accent-cyan)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="4 200"
              strokeDashoffset={dashOffset - 4}
              transform="rotate(-90 60 60)"
              opacity="0.5"
            />
          )}
        </svg>
        <div className="pomo-ring-center">
          {session ? (
            <>
              <div className="pomo-time">{mins}:{secs}</div>
              <div className="pomo-label">{isActive ? 'Focus' : isPaused ? 'Paused' : session.status}</div>
            </>
          ) : (
            <>
              <div className="pomo-time">25:00</div>
              <div className="pomo-label">Ready</div>
            </>
          )}
        </div>
      </div>

      {session && (
        <div className="pomo-meta">
          <span>🔄 {session.interruptions} interruptions</span>
          <span>✓ {session.completed_cycles} cycles</span>
        </div>
      )}

      <div className="pomo-controls">
        {!session ? (
          <button className="btn btn-primary pomo-btn-main" onClick={start} disabled={loading}>
            ▶ Start Focus
          </button>
        ) : (
          <>
            {isActive ? (
              <button className="btn btn-secondary" onClick={pause} disabled={loading} style={{ flex: 1 }}>
                ⏸ Pause
              </button>
            ) : (
              <button className="btn btn-primary" onClick={resume} disabled={loading} style={{ flex: 1 }}>
                ▶ Resume
              </button>
            )}
            <button className="btn btn-ghost" onClick={complete} disabled={loading} title="Mark as complete">
              ✓
            </button>
            <button className="btn btn-danger" onClick={stop} disabled={loading} title="Stop session">
              ■
            </button>
          </>
        )}
      </div>
    </div>
  )
}
