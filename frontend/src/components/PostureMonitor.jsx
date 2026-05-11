import { useEffect, useRef, useState } from 'react'
import { postureAPI, resolveApiUrl } from '../services/api'
import './PostureMonitor.css'

export default function PostureMonitor({ userId, onUpdate }) {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(null)
  const [cameraType, setCameraType] = useState('esp')
  const [cameraConfig, setCameraConfig] = useState(null)

  const intervalRef = useRef(null)

  const fetchStats = async () => {
    try {
      const { data } = await postureAPI.stats(userId)
      setStats(data)
    } catch {}
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (cameraType !== 'esp') return

    const loadCameraConfig = async () => {
      try {
        const { data } = await postureAPI.cameraConfig()
        setCameraConfig(data)
      } catch {}
    }

    loadCameraConfig()
  }, [cameraType])

  const captureAndAnalyze = async () => {
    if (status === 'analyzing') return
    setStatus('analyzing')

    try {
      let data

      if (cameraType === 'esp') {
        const res = await postureAPI.analyzeCamera(userId)
        data = res.data
      } else {
        const video = document.getElementById('posture-video')
        const canvas = document.createElement('canvas')

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'))
        const res = await postureAPI.analyze(userId, blob)
        data = res.data
      }

      setResult(data)
      fetchStats()
      onUpdate?.()
    } catch {
      setResult({ posture: 'error', message: 'Analysis failed - check connection' })
    } finally {
      setStatus('monitoring')
    }
  }

  const startMonitoring = async () => {
    if (cameraType === 'laptop') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        const video = document.getElementById('posture-video')
        video.srcObject = stream
      } catch {
        setStatus('no-camera')
        return
      }
    }

    setStatus('monitoring')
    intervalRef.current = setInterval(captureAndAnalyze, 5000)
  }

  const stopMonitoring = () => {
    clearInterval(intervalRef.current)

    if (cameraType === 'laptop') {
      const video = document.getElementById('posture-video')
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop())
        video.srcObject = null
      }
    }

    setStatus('idle')
    setResult(null)
  }

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const isGood = result?.posture === 'good'
  const isBad = result?.posture === 'bad'
  const cameraPreviewSrc =
    cameraType === 'esp' && status !== 'idle'
      ? resolveApiUrl('/posture/camera-stream')
      : null

  return (
    <div className="card posture-monitor">
      <div className="card-header">
        <span className="section-title">Posture Detection</span>

        <div className="posture-controls">
          <div className="camera-select-wrap">
            <select
              className="camera-select"
              value={cameraType}
              onChange={event => setCameraType(event.target.value)}
              aria-label="Choose camera source"
            >
              <option value="esp">ESP32 Camera</option>
              <option value="laptop">Laptop Camera</option>
            </select>
          </div>

          {status === 'idle' || status === 'no-camera' ? (
            <button className="btn btn-primary" onClick={startMonitoring}>
              Start Camera
            </button>
          ) : (
            <button className="btn btn-danger" onClick={stopMonitoring}>
              Stop
            </button>
          )}
        </div>
      </div>

      <div className="posture-layout">
        <div className="camera-section">
          <div
            className={`camera-frame ${status === 'monitoring' ? 'camera-frame--active' : ''} ${isBad ? 'camera-frame--bad' : ''}`}
          >
            {cameraType === 'esp' ? (
              <img
                src={cameraPreviewSrc || undefined}
                alt="ESP32 camera preview"
                className="camera-feed"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <video
                id="posture-video"
                autoPlay
                playsInline
                muted
                className="camera-feed"
              />
            )}

            {status === 'idle' && (
              <div className="camera-placeholder">
                <div className="camera-icon">O</div>
                <p>Camera not started</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Click Start Camera to begin
                </p>
              </div>
            )}

            {status === 'monitoring' && (
              <div className="camera-hud">
                <div className="hud-corner hud-corner--tl" />
                <div className="hud-corner hud-corner--tr" />
                <div className="hud-corner hud-corner--bl" />
                <div className="hud-corner hud-corner--br" />
                {status === 'analyzing' && (
                  <div className="analyzing-overlay">Analyzing...</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="posture-info">
          {result ? (
            <>
              <div
                className={`posture-status ${isGood ? 'posture-status--good' : isBad ? 'posture-status--bad' : 'posture-status--unknown'}`}
              >
                <div className="posture-status__icon">
                  {isGood ? 'OK' : isBad ? '!' : '?'}
                </div>
                <div>
                  <div className="posture-status__label">
                    {result.posture?.toUpperCase()}
                  </div>
                  <div className="posture-status__msg">
                    {result.message}
                  </div>
                </div>
              </div>

              <div className="angle-meters">
                {result.neck_angle != null && (
                  <div className="angle-meter">
                    <div className="angle-meter__label">
                      <span>Neck Angle</span>
                      <span className="angle-value">{result.neck_angle} deg</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill cyan"
                        style={{ width: `${Math.min((result.neck_angle / 180) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {result.shoulder_angle != null && (
                  <div className="angle-meter">
                    <div className="angle-meter__label">
                      <span>Shoulder Angle</span>
                      <span className="angle-value">{result.shoulder_angle} deg</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill cyan"
                        style={{ width: `${Math.min((result.shoulder_angle / 180) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {result.confidence != null && (
                  <div className="angle-meter">
                    <div className="angle-meter__label">
                      <span>Confidence</span>
                      <span className="angle-value">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill green"
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="posture-idle-msg">
              <p>Posture analysis will begin automatically once the camera is active.</p>
              <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 12 }}>
                Detection runs every 5 seconds
              </p>
            </div>
          )}

          {stats && (
            <div className="posture-stats">
              <div className="divider" />
              <div className="mini-stats">
                <div className="mini-stat">
                  <span className="mini-stat__val" style={{ color: 'var(--accent-green)' }}>
                    {stats.good}
                  </span>
                  <span className="mini-stat__lbl">Good</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-stat__val" style={{ color: 'var(--accent-red)' }}>
                    {stats.bad}
                  </span>
                  <span className="mini-stat__lbl">Bad</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-stat__val">{stats.good_percent}%</span>
                  <span className="mini-stat__lbl">Score</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
