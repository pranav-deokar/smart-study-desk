import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI } from '../services/api'
import './InsightsPage.css'

function ScoreRing({ score, color, label }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  return (
    <div className="score-ring-wrap">
      <svg viewBox="0 0 100 100" className="score-ring">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(0,212,255,0.08)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="score-ring-center">
        <span className="score-ring-val" style={{ color }}>{score}</span>
        <span className="score-ring-pct">%</span>
      </div>
      <div className="score-ring-label">{label}</div>
    </div>
  )
}

export default function InsightsPage() {
  const { user } = useAuth()
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.insights(user.user_id)
      .then(r => setInsights(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-loading"><div className="spinner" /><p>Generating insights...</p></div>
  )

  return (
    <div>
      <header className="page-header animate-fade-up">
        <div>
          <h1 className="page-title">
            <span className="section-title">AI Analysis</span><br />Smart Insights
          </h1>
          <p className="page-subtitle">Personalized recommendations based on your last 7 days</p>
        </div>
      </header>

      {insights && (
        <>
          <div className="insights-scores card animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <span className="section-title" style={{ display: 'block', marginBottom: 24 }}>Health Scores — Last 7 Days</span>
            <div className="scores-row">
              <ScoreRing score={insights.posture_score} color="var(--accent-green)" label="Posture" />
              <ScoreRing score={insights.distance_score} color="var(--accent-cyan)" label="Distance" />
              <ScoreRing score={insights.productivity_score} color="var(--accent-violet)" label="Productivity" />
              <div className="total-time">
                <div className="stat-value">{insights.total_study_minutes}</div>
                <div className="stat-label">Focus Minutes</div>
                <div className="tooltip-text" style={{ marginTop: 4 }}>This week</div>
              </div>
            </div>
          </div>

          <div className="insights-grid animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="card">
              <span className="section-title" style={{ display: 'block', marginBottom: 16 }}>Observations</span>
              <div className="insight-msgs">
                {insights.messages.map((m, i) => (
                  <div key={i} className="insight-msg animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="insight-msg__icon">◈</div>
                    <p>{m}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <span className="section-title" style={{ display: 'block', marginBottom: 16 }}>Recommendations</span>
              <div className="insight-recs">
                {insights.recommendations.map((r, i) => (
                  <div key={i} className="insight-rec animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="insight-rec__num">{String(i + 1).padStart(2, '0')}</div>
                    <p>{r}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
