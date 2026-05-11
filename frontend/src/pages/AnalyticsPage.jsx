import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { postureAPI, distanceAPI, pomodoroAPI } from '../services/api'
import { Chart, registerables } from 'chart.js'
import './AnalyticsPage.css'

Chart.register(...registerables)

function DonutChart({ canvasId, good, bad, labels, colors }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    chartRef.current?.destroy()
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: [good, bad], backgroundColor: colors, borderWidth: 0, hoverBorderWidth: 2, hoverBorderColor: '#fff' }]
      },
      options: {
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#071428',
            borderColor: 'rgba(0,212,255,0.2)',
            borderWidth: 1,
            titleColor: '#7eb8d4',
            bodyColor: '#e8f4fd',
          }
        }
      }
    })
    return () => chartRef.current?.destroy()
  }, [good, bad])

  return <canvas ref={ref} />
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [pStats, setPStats] = useState(null)
  const [dStats, setDStats] = useState(null)
  const [pomoStats, setPomoStats] = useState(null)
  const [period, setPeriod] = useState(24)

  useEffect(() => {
    const uid = user.user_id
    Promise.all([
      postureAPI.stats(uid, period),
      distanceAPI.stats(uid, period),
      pomodoroAPI.stats(uid),
    ]).then(([p, d, po]) => {
      setPStats(p.data)
      setDStats(d.data)
      setPomoStats(po.data)
    }).catch(() => {})
  }, [period])

  return (
    <div>
      <header className="page-header animate-fade-up">
        <div>
          <h1 className="page-title">
            <span className="section-title">Data Analysis</span><br />Analytics
          </h1>
          <p className="page-subtitle">Deep dive into your study health metrics</p>
        </div>
        <div className="period-tabs">
          {[24, 48, 168].map(h => (
            <button key={h} className={`btn ${period === h ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPeriod(h)} style={{ padding: '6px 14px', fontSize: 12 }}>
              {h === 24 ? '24h' : h === 48 ? '48h' : '7d'}
            </button>
          ))}
        </div>
      </header>

      <div className="analytics-grid animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="card donut-card">
          <span className="section-title" style={{ display: 'block', marginBottom: 16 }}>Posture Quality</span>
          <div className="donut-wrap">
            {pStats ? (
              <>
                <div style={{ width: 160, height: 160 }}>
                  <DonutChart
                    labels={['Good', 'Bad', 'Unknown']}
                    good={pStats.good}
                    bad={pStats.bad}
                    colors={['rgba(0,255,136,0.8)', 'rgba(255,68,68,0.8)', 'rgba(61,106,136,0.5)']}
                  />
                </div>
                <div className="donut-center-label">
                  <div className="stat-value" style={{ fontSize: '2rem' }}>{pStats.good_percent}%</div>
                  <div className="stat-label">Good posture</div>
                </div>
                <div className="donut-legend">
                  <div className="legend-item"><span style={{ background: 'rgba(0,255,136,0.8)' }} /><span>Good ({pStats.good})</span></div>
                  <div className="legend-item"><span style={{ background: 'rgba(255,68,68,0.8)' }} /><span>Bad ({pStats.bad})</span></div>
                </div>
              </>
            ) : <div className="chart-placeholder">Loading...</div>}
          </div>
        </div>

        <div className="card donut-card">
          <span className="section-title" style={{ display: 'block', marginBottom: 16 }}>Screen Distance</span>
          <div className="donut-wrap">
            {dStats ? (
              <>
                <div style={{ width: 160, height: 160 }}>
                  <DonutChart
                    labels={['Safe', 'Unsafe']}
                    good={dStats.safe}
                    bad={dStats.unsafe}
                    colors={['rgba(0,212,255,0.8)', 'rgba(245,158,11,0.8)']}
                  />
                </div>
                <div className="donut-center-label">
                  <div className="stat-value" style={{ fontSize: '2rem' }}>{dStats.safe_percent}%</div>
                  <div className="stat-label">Safe distance</div>
                </div>
                <div className="donut-legend">
                  <div className="legend-item"><span style={{ background: 'rgba(0,212,255,0.8)' }} /><span>Safe ({dStats.safe})</span></div>
                  <div className="legend-item"><span style={{ background: 'rgba(245,158,11,0.8)' }} /><span>Too close ({dStats.unsafe})</span></div>
                </div>
              </>
            ) : <div className="chart-placeholder">Loading...</div>}
          </div>
        </div>

        <div className="card donut-card">
          <span className="section-title" style={{ display: 'block', marginBottom: 16 }}>Productivity</span>
          <div className="donut-wrap">
            {pomoStats ? (
              <>
                <div style={{ width: 160, height: 160 }}>
                  <DonutChart
                    labels={['Completed', 'Stopped']}
                    good={pomoStats.completed}
                    bad={pomoStats.stopped}
                    colors={['rgba(124,58,237,0.8)', 'rgba(61,106,136,0.5)']}
                  />
                </div>
                <div className="donut-center-label">
                  <div className="stat-value" style={{ fontSize: '2rem' }}>{pomoStats.completion_rate}%</div>
                  <div className="stat-label">Completion rate</div>
                </div>
                <div className="donut-legend">
                  <div className="legend-item"><span style={{ background: 'rgba(124,58,237,0.8)' }} /><span>Done ({pomoStats.completed})</span></div>
                  <div className="legend-item"><span style={{ background: 'rgba(61,106,136,0.5)' }} /><span>Stopped ({pomoStats.stopped})</span></div>
                </div>
              </>
            ) : <div className="chart-placeholder">Loading...</div>}
          </div>
        </div>
      </div>

      <div className="analytics-kpis animate-fade-up" style={{ animationDelay: '0.2s' }}>
        {[
          { label: 'Total Posture Readings', val: pStats?.total ?? '--', unit: 'samples' },
          { label: 'Avg Screen Distance', val: dStats?.avg_distance_cm ? `${dStats.avg_distance_cm}` : '--', unit: 'cm' },
          { label: 'Focus Time', val: pomoStats?.total_focus_minutes ?? '--', unit: 'min' },
          { label: 'Total Sessions', val: pomoStats?.total_sessions ?? '--', unit: 'sessions' },
        ].map(k => (
          <div key={k.label} className="card kpi-card">
            <div className="stat-value">{k.val}</div>
            <div className="stat-label" style={{ marginBottom: 2 }}>{k.label}</div>
            <div className="tooltip-text">{k.unit}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
