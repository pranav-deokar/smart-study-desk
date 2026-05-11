import './DistanceMonitor.css'
import { DISTANCE_CRITICAL_CM, DISTANCE_THRESHOLD_CM } from '../constants/distance'

const MAX_DIST = 100

export default function DistanceMonitor({ liveData }) {
  const dist = liveData?.avg_cm ?? null
  const safe = liveData?.safe_percent ?? null

  const pct = dist !== null ? Math.min((dist / MAX_DIST) * 100, 100) : 0
  const isSafe = dist !== null && dist >= DISTANCE_THRESHOLD_CM
  const color = dist === null ? 'var(--text-muted)'
    : dist < DISTANCE_CRITICAL_CM ? 'var(--accent-red)'
    : dist < DISTANCE_THRESHOLD_CM ? 'var(--accent-amber)'
    : 'var(--accent-green)'

  return (
    <div className="card distance-monitor">
      <div className="card-header">
        <span className="section-title">Distance Monitor</span>
        <span className={`badge ${isSafe ? 'badge-good' : dist !== null ? 'badge-bad' : 'badge-info'}`}>
          {dist === null ? 'No Data' : isSafe ? 'Safe' : 'Too Close'}
        </span>
      </div>

      <div className="distance-layout">
        <div className="sonar-display">
          <div className="sonar-rings">
            <div className="sonar-ring" style={{ '--d': 0.3 }} />
            <div className="sonar-ring" style={{ '--d': 0.6 }} />
            <div className="sonar-ring" style={{ '--d': 0.9 }} />
          </div>
          <div className="sonar-needle" style={{ '--pct': pct, '--c': color }}>
            <div className="sonar-needle__line" />
            <div className="sonar-needle__head" />
          </div>
          <div className="sonar-center">
            <span className="sonar-value" style={{ color }}>
              {dist !== null ? `${dist}` : '--'}
            </span>
            <span className="sonar-unit">cm</span>
          </div>
          <div className="sonar-labels">
            <span>0</span>
            <span>50</span>
            <span>100+</span>
          </div>
          <div className="sonar-threshold" title={`Safe threshold: ${DISTANCE_THRESHOLD_CM}cm`}>
            <span>{`Safe >= ${DISTANCE_THRESHOLD_CM}cm`}</span>
          </div>
        </div>

        <div className="distance-stats">
          <div className="dist-stat">
            <span className="dist-stat__val" style={{ color: 'var(--accent-green)' }}>
              {safe !== null ? `${safe}%` : '--'}
            </span>
            <span className="dist-stat__lbl">Safe % Today</span>
          </div>
          <div className="dist-stat">
            <span className="dist-stat__val">
              {liveData?.total_readings ?? '--'}
            </span>
            <span className="dist-stat__lbl">Total Readings</span>
          </div>

          <div className="dist-zones">
            <div className="zone zone--danger">
              <span className="zone__dot" style={{ background: 'var(--accent-red)' }} />
              <span>{`< ${DISTANCE_CRITICAL_CM}cm`}</span>
              <span className="zone__label">Critical</span>
            </div>
            <div className="zone zone--warn">
              <span className="zone__dot" style={{ background: 'var(--accent-amber)' }} />
              <span>{`${DISTANCE_CRITICAL_CM}-${DISTANCE_THRESHOLD_CM}cm`}</span>
              <span className="zone__label">Too close</span>
            </div>
            <div className="zone zone--safe">
              <span className="zone__dot" style={{ background: 'var(--accent-green)' }} />
              <span>{`>= ${DISTANCE_THRESHOLD_CM}cm`}</span>
              <span className="zone__label">Safe</span>
            </div>
          </div>

          <div className="dist-info">
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Distance data is sent by the ESP32 ultrasonic sensor. Readings update in real-time via the IoT device.
            </p>
          </div>
        </div> 
      </div>
    </div>
  )
}
