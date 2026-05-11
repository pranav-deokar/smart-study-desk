import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let messaging = null

export function initFirebase() {
  try {
    if (!app) {
      app = initializeApp(firebaseConfig)
      messaging = getMessaging(app)
    }
    return messaging
  } catch (e) {
    console.error("Firebase init error:", e)
    return null
  }
}

export async function requestNotificationPermission() {
  try {
    if (!messaging) {
      console.log("Messaging not initialized")
      return null
    }

    if (typeof Notification === 'undefined') {
      console.log("Notifications are not supported in this browser")
      return null
    }

    if (Notification.permission === "denied") {
      console.log("Notification permission denied")
      return null
    }

    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission()

    if (permission !== "granted") {
      console.log("Notification permission denied")
      return null
    }

    // 🔥 IMPORTANT: manually register service worker
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js'
    )

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    })

    if (!token) {
      console.log("No FCM token generated")
      return null
    }

    console.log("FCM TOKEN:", token)

    return token
  } catch (err) {
    console.error("FCM error:", err)
    return null
  }
}

export function onForegroundMessage(callback) {
  const activeMessaging = messaging || initFirebase()
  if (!activeMessaging) return () => {}
  return onMessage(activeMessaging, callback)
}
