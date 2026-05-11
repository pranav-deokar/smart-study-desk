import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI } from '../services/api'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import './WarningsPage.css'

const TYPE_ICONS = { posture: '⬆', distance: '↔', inactivity: '⏱' }
const TYPE_LABELS = { posture: 'Posture', distance: 'Distance', inactivity: 'Inactivity' }

export default function WarningsPage() {
  const { user } = useAuth()
  const [warnings, setWarnings] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    try {
      const { data } = await analyticsAPI.warnings(user.user_id, 50)
      setWarnings(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const acknowledge = async (id) => {
    await analyticsAPI.acknowledge(id)
    setWarnings(w => w.map(x => x.id === id ? { ...x, acknowledged: true } : x))
    toast.success('Warning acknowledged')
  }

  const acknowledgeAll = async () => {
    const unread = warnings.filter(w => !w.acknowledged)
    await Promise.all(unread.map(w => analyticsAPI.acknowledge(w.id)))
    setWarnings(w => w.map(x => ({ ...x, acknowledged: true })))
    toast.success(`${unread.length} warnings acknowledged`)
  }

  const filtered = warnings.filter(w =>
    filter === 'all' ? true : filter === 'unread' ? !w.acknowledged : w.warning_type === filter
  )

  const unreadCount = warnings.filter(w => !w.acknowledged).length

  return (
    <div>
      <header className="page-header animate-fade-up">
        <div>
          <h1 className="page-title">
            <span className="section-title">Alert Center</span><br />Warnings
          </h1>
          <p className="page-subtitle">All health and posture alerts in one place</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary" onClick={acknowledgeAll}>
            ✓ Mark all read ({unreadCount})
          </button>
        )}
      </header>

      <div className="warnings-filters animate-fade-up" style={{ animationDelay: '0.1s' }}>
        {['all', 'unread', 'posture', 'distance', 'inactivity'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)} style={{ padding: '6px 16px', fontSize: 12 }}>
            {f === 'all' ? `All (${warnings.length})` :
             f === 'unread' ? `Unread (${unreadCount})` :
             TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="warnings-full-list animate-fade-up" style={{ animationDelay: '0.2s' }}>
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>No warnings found</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Your health metrics are looking great!</p>
          </div>
        ) : (
          filtered.map((w, i) => (
            <div key={w.id} className={`warning-full-item card ${w.acknowledged ? 'warning-full-item--read' : ''} animate-fade-up`}
              style={{ animationDelay: `${i * 0.04}s` }}>
              <div className={`warning-type-badge warning-type-badge--${w.warning_type}`}>
                <span>{TYPE_ICONS[w.warning_type]}</span>
                <span>{TYPE_LABELS[w.warning_type]}</span>
              </div>

              <div className="warning-content">
                <p className="warning-text">{w.message}</p>
                <span className="warning-ts">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</span>
              </div>

              <div className="warning-actions">
                <span className={`badge badge-${w.severity === 'high' ? 'bad' : w.severity === 'medium' ? 'warn' : 'info'}`}>
                  {w.severity}
                </span>
                {!w.acknowledged && (
                  <button className="btn btn-ghost" onClick={() => acknowledge(w.id)}
                    style={{ padding: '5px 12px', fontSize: 12 }}>
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
