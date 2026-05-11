import axios from 'axios'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
export const resolveApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ssd_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ssd_token')
      localStorage.removeItem('ssd_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: d => api.post('/auth/register', d),
  login: d => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
  updateFCM: d => api.post('/auth/fcm-token', d),

}

export const postureAPI = {
  cameraConfig: () => api.get('/posture/camera-config'),
  analyze: (userId, imageBlob) => {
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('image', imageBlob, 'frame.jpg')
    return api.post('/posture/analyze', fd)
  },

  history: (userId, limit = 50) =>
    api.get(`/posture/history/${userId}?limit=${limit}`),

  stats: (userId, hours = 24) =>
    api.get(`/posture/stats/${userId}?hours=${hours}`),

  // ✅ FIXED
  analyzeCamera: (userId) =>
    api.post('/posture/analyze-camera', { user_id: userId }),
}

export const distanceAPI = {
  log: d => api.post('/distance/log', d),
  history: (userId, limit = 50) => api.get(`/distance/history/${userId}?limit=${limit}`),
  stats: (userId, hours = 24) => api.get(`/distance/stats/${userId}?hours=${hours}`),
}

export const pomodoroAPI = {
  start: d => api.post('/pomodoro/start', d),
  pause: d => api.post('/pomodoro/pause', d),
  resume: d => api.post('/pomodoro/resume', d),
  complete: d => api.post('/pomodoro/complete', d),
  stop: d => api.post('/pomodoro/stop', d),
  active: userId => api.get(`/pomodoro/active/${userId}`),
  history: (userId, limit = 20) => api.get(`/pomodoro/history/${userId}?limit=${limit}`),
  stats: userId => api.get(`/pomodoro/stats/${userId}`),
}

export const analyticsAPI = {
  dashboard: userId => api.get(`/analytics/dashboard/${userId}`),
  insights: userId => api.get(`/analytics/insights/${userId}`),
  warnings: (userId, limit = 30, unreadOnly = false) =>
    api.get(`/analytics/warnings/${userId}?limit=${limit}&unread_only=${unreadOnly}`),
  acknowledge: id => api.post(`/analytics/warnings/${id}/acknowledge`),
}


export default api
