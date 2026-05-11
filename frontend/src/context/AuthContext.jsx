import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import { initFirebase, requestNotificationPermission } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const setupFCM = async (userId) => {
    try {
      const token = await requestNotificationPermission()

      if (!token) {
        console.log("FCM token not generated")
        return
      }

      console.log("FCM TOKEN:", token)

      await authAPI.updateFCM({
        user_id: userId,
        fcm_token: token
      })

      console.log("FCM token saved to backend")

    } catch (err) {
      console.error("FCM setup error:", err)
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('ssd_user')
    const token = localStorage.getItem('ssd_token')
    let storedUser = null

    if (stored && token) {
      storedUser = JSON.parse(stored)
      setUser(storedUser)
    }

    // Initialize Firebase ONCE
    const messaging = initFirebase()
    if (!messaging) {
      console.log("Firebase not initialized")
    }

    if (storedUser?.user_id) {
      setupFCM(storedUser.user_id)
    }

    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })

    localStorage.setItem('ssd_token', data.access_token)
    localStorage.setItem('ssd_user', JSON.stringify(data))

    setUser(data)

    // IMPORTANT: wait for FCM setup
    await setupFCM(data.user_id)

    return data
  }

  const register = async (email, password, full_name) => {
    const { data } = await authAPI.register({ email, password, full_name })

    localStorage.setItem('ssd_token', data.access_token)
    localStorage.setItem('ssd_user', JSON.stringify(data))

    setUser(data)

    // IMPORTANT: wait for FCM setup
    await setupFCM(data.user_id)

    return data
  }

  const logout = () => {
    localStorage.removeItem('ssd_token')
    localStorage.removeItem('ssd_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
