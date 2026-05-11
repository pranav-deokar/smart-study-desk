import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI, pomodoroAPI } from '../services/api'
import toast from 'react-hot-toast'
import PostureMonitor from '../components/PostureMonitor'
import DistanceMonitor from '../components/DistanceMonitor'
import PomodoroWidget from '../components/PomodoroWidget'
import LiveChart from '../components/LiveChart'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshRef = useRef(null)

  const fetchDashboard = async (optimisticSession) => {
    try {
      const { data } = await analyticsAPI.dashboard(user.user_id)
      setDashboard({
        ...data,
        active_session: data.active_session ?? (
          optimisticSession && ['active', 'paused'].includes(optimisticSession.status)
            ? optimisticSession
            : null
        ),
        posture: {
          ...data.posture,
          timeline: [...(data.posture?.timeline || [])]
        },
        distance: {
          ...data.distance,
          timeline: [...(data.distance?.timeline || [])]
        }
      })
    } catch {
      // silent refresh
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    refreshRef.current = setInterval(fetchDashboard, 15000)
    return () => clearInterval(refreshRef.current)
  }, [])

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
      <p>Initializing SmartDesk...</p>
    </div>
  )

  const posture = dashboard?.posture || {}
  const distance = dashboard?.distance || {}
  const pomo = dashboard?.pomodoro || {}
  const warnings = dashboard?.warnings || []
  const activeSession = dashboard?.active_session

  return (
    <div className="dashboard">
      <header className="page-header animate-fade-up">
        <div>
          <h1 className="page-title">
            <span className="section-title">System Status</span>
            <br />Command Center
          </h1>
          <p className="page-subtitle">Real-time desk monitoring & health analytics</p>
        </div>
        <div className="header-status">
          <span className="status-dot active" />
          <span style={{ fontSize: 13, color: 'var(--accent-green)' }}>Live Monitoring</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
            Auto-refresh 15s
          </span>
        </div>
      </header>

      <div className="stats-row animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card card">
          <div className="stat-card__icon" style={{ '--c': '#00d4ff' }}>◉</div>
          <div>
            <div className="stat-value">{posture.good_percent ?? '--'}%</div>
            <div className="stat-label">Good Posture Today</div>
            <div className="progress-bar" style={{ marginTop: 10, width: 100 }}>
              <div className="progress-fill cyan" style={{ width: `${posture.good_percent || 0}%` }} />
            </div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-card__icon" style={{ '--c': '#00ff88' }}>◈</div>
          <div>
            <div className="stat-value">{distance.safe_percent ?? '--'}%</div>
            <div className="stat-label">Safe Distance</div>
            <div className="progress-bar" style={{ marginTop: 10, width: 100 }}>
              <div className="progress-fill green" style={{ width: `${distance.safe_percent || 0}%` }} />
            </div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-card__icon" style={{ '--c': '#f59e0b' }}>◎</div>
          <div>
            <div className="stat-value">{pomo.completed_this_week ?? 0}</div>
            <div className="stat-label">Sessions This Week</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {pomo.completion_rate ?? 0}% completion rate
            </div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-card__icon" style={{ '--c': '#ff4444' }}>⚠</div>
          <div>
            <div className="stat-value" style={{ color: warnings.filter(w => !w.acknowledged).length > 0 ? 'var(--accent-red)' : undefined }}>
              {warnings.filter(w => !w.acknowledged).length}
            </div>
            <div className="stat-label">Unread Warnings</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {warnings.length} total today
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <div className="monitors-col">
          <PostureMonitor userId={user.user_id} onUpdate={fetchDashboard} />
          <DistanceMonitor userId={user.user_id} liveData={distance} onUpdate={fetchDashboard} />
        </div>

        <div className="side-col">
          <PomodoroWidget userId={user.user_id} activeSession={activeSession} onUpdate={fetchDashboard} />

          <div className="card warnings-card">
            <div className="card-header">
              <span className="section-title">Recent Warnings</span>
              <span className="badge badge-warn">{warnings.length} today</span>
            </div>
            <div className="warnings-list">
              {warnings.length === 0 ? (
                <p className="empty-msg">✓ No warnings — you're doing great!</p>
              ) : warnings.slice(0, 5).map(w => (
                <div key={w.id} className={`warning-item warning-item--${w.severity}`}>
                  <div className="warning-icon">
                    {w.warning_type === 'posture' ? '⬆' : w.warning_type === 'distance' ? '↔' : '⏱'}
                  </div>
                  <div>
                    <div className="warning-msg">{w.message}</div>
                    <div className="warning-time">{new Date(w.created_at).toLocaleTimeString()}</div>
                  </div>
                  {!w.acknowledged && <span className="unread-dot" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <LiveChart postureData={posture.timeline || []} distanceData={distance.timeline || []} />
      </div>
    </div>
  )
}
