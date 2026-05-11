import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'
import './LiveChart.css'
import { DISTANCE_THRESHOLD_CM } from '../constants/distance'

Chart.register(...registerables)

export default function LiveChart({ postureData, distanceData }) {
  const postureRef = useRef(null)
  const distRef = useRef(null)
  const postureChart = useRef(null)
  const distChart = useRef(null)

  const buildPostureChart = () => {
    if (!postureRef.current) return
    if (postureChart.current) postureChart.current.destroy()

    const labels = postureData.slice(-20).map(r =>
      new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
    const values = postureData.slice(-20).map(r => {
  const p = (r.posture || "").toLowerCase().trim()

  if (p === "good") return 1
  if (p === "bad") return 0.2
  return 0.5
})
const colors = postureData.slice(-20).map(r => {
  const p = (r.posture || "").toLowerCase().trim()

  if (p === "good") return 'rgba(0,255,136,0.8)'
  if (p === "bad") return 'rgba(255,68,68,0.8)'
  return 'rgba(245,158,11,0.8)'
})
    postureChart.current = new Chart(postureRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Posture',
          data: values,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 0,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
  duration: 500,
  easing: 'easeInOutQuart'
},
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => 
  ctx.raw === 1 ? 'Good' : 
  ctx.raw === 0.2 ? 'Bad' : 
  'Unknown'
            },
            
            backgroundColor: '#071428',
            borderColor: 'rgba(0,212,255,0.2)',
            borderWidth: 1,
            titleColor: '#7eb8d4',
            bodyColor: '#e8f4fd',
          }
        },
        scales: {
          x: {
            ticks: { color: '#3d6a88', font: { size: 10, family: 'Space Mono' }, maxRotation: 0 },
            grid: { color: 'rgba(0,212,255,0.05)' },
          },
          y: {
            min: -0.1, max: 1.1,
            ticks: {
              color: '#3d6a88',
              callback: v => v === 1 ? 'Good' : v === 0 ? 'Bad' : '',
              font: { size: 10, family: 'Space Mono' },
            },
            grid: { color: 'rgba(0,212,255,0.05)' },
          }
        }
      }
    })
  }

  const buildDistChart = () => {
    if (!distRef.current) return
    if (distChart.current) distChart.current.destroy()

    const labels = distanceData.slice(-20).map(r =>
      new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
    const values = distanceData.slice(-20).map(r => r.distance_cm)

    distChart.current = new Chart(distRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Distance (cm)',
          data: values,
          borderColor: 'rgba(0,212,255,0.8)',
          backgroundColor: 'rgba(0,212,255,0.06)',
          pointBackgroundColor: values.map(v => v < DISTANCE_THRESHOLD_CM ? 'rgba(255,68,68,0.9)' : 'rgba(0,255,136,0.9)'),
          pointBorderColor: 'transparent',
          pointRadius: 5,
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#071428',
            borderColor: 'rgba(0,212,255,0.2)',
            borderWidth: 1,
            titleColor: '#7eb8d4',
            bodyColor: '#e8f4fd',
            callbacks: {
              label: ctx => `${ctx.raw} cm ${ctx.raw < DISTANCE_THRESHOLD_CM ? 'Too close' : 'Safe'}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#3d6a88', font: { size: 10, family: 'Space Mono' }, maxRotation: 0 },
            grid: { color: 'rgba(0,212,255,0.05)' },
          },
          y: {
            ticks: { color: '#3d6a88', font: { size: 10, family: 'Space Mono' } },
            grid: { color: 'rgba(0,212,255,0.05)' },
          }
        }
      }
    })
  }

  useEffect(() => { buildPostureChart() }, [postureData])
  useEffect(() => { buildDistChart() }, [distanceData])
  useEffect(() => () => {
    postureChart.current?.destroy()
    distChart.current?.destroy()
  }, [])

  return (
    <div className="live-charts">
      <div className="card">
        <div className="card-header">
          <span className="section-title">Posture Timeline</span>
          <span className="badge badge-info">Last 20 readings</span>
        </div>
        <div style={{ height: 160 }}>
          {postureData.length === 0
            ? <div className="chart-empty">No posture data yet — start the camera to begin monitoring</div>
            : <canvas ref={postureRef} />}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="section-title">Distance Timeline</span>
          <span className="badge badge-info">Last 20 readings</span>
        </div>
        <div style={{ height: 160 }}>
          {distanceData.length === 0
            ? <div className="chart-empty">No distance data yet — connect the ESP32 sensor</div>
            : <canvas ref={distRef} />}
        </div>
      </div>
    </div>
  )
}
