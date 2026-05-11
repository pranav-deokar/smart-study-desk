# 🖥️ SmartDesk — Intelligent Study System

An AI-powered smart desk monitoring system with real-time posture detection, distance monitoring, Pomodoro timer, and productivity analytics.

---

## 📁 Project Structure

```
smart-study-desk/
├── backend/                 # FastAPI Python backend
│   ├── app/
│   │   ├── config.py        # Environment-based settings
│   │   ├── database.py      # Supabase client & schema
│   │   ├── models.py        # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── auth.py      # Register, login, FCM token
│   │   │   ├── posture.py   # Image analysis endpoint
│   │   │   ├── distance.py  # Distance logging endpoint
│   │   │   ├── pomodoro.py  # Timer session management
│   │   │   └── analytics.py # Dashboard, insights, warnings
│   │   └── services/
│   │       ├── posture_detection.py  # MediaPipe pose analysis
│   │       ├── firebase_service.py   # FCM push notifications
│   │       └── insights_service.py   # AI insight generation
│   ├── main.py              # FastAPI app entry point
│   ├── requirements.txt
│   ├── render.yaml          # Render deployment config
│   └── .env.example
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── pages/           # Full page components
│   │   ├── components/      # Reusable UI components
│   │   ├── services/        # API & Firebase clients
│   │   ├── context/         # Auth context (React)
│   │   └── styles/          # Global CSS
│   ├── public/
│   │   └── firebase-messaging-sw.js
│   ├── vercel.json
│   └── .env.example
├── esp32/
│   ├── smart_desk_esp32.ino # Complete Arduino firmware
│   └── README.md            # Wiring & upload guide
└── docs/
    └── schema.sql           # Supabase schema reference
```

---

## ⚙️ Hardware Setup

### Components
| Component | Purpose |
|-----------|---------|
| ESP32-CAM (AI-Thinker) | Image capture & WiFi |
| HC-SR04 | Ultrasonic distance measurement |
| Buzzer (optional) | Audio warning alerts |
| USB-TTL Programmer | Uploading firmware |

### Wiring Diagram
```
ESP32-CAM         HC-SR04
─────────         ───────
GPIO 12  ───────→ TRIG
GPIO 13  ←─────── ECHO
5V       ───────→ VCC
GND      ───────→ GND

Optional Buzzer:
GPIO 14  ──[ buzzer ]── GND
```

> ⚠️ System works fully without buzzer/LED — warnings appear on dashboard regardless.

---

## 🚀 Local Setup

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL**, **anon key**, and **service_role key**
3. In Supabase SQL editor, run the schema in `docs/schema.sql`
4. Under Authentication → Settings → disable "Email confirmation" for easy dev

### 2. Backend (FastAPI)

```bash
cd backend
cp .env.example .env
# Fill in your Supabase credentials in .env

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Frontend (React)

```bash
cd frontend
cp .env.example .env
# For local development keep VITE_API_URL=/api
# Vite proxies requests to the backend on localhost:8000

npm install
npm run dev
```

Open: http://localhost:3000

### 4. ESP32 Firmware

1. Install Arduino IDE 2.x
2. Add ESP32 board URL in Preferences:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Install: **ArduinoJson** library via Library Manager
4. Open `esp32/smart_desk_esp32.ino`
5. Edit the 4 config lines at the top (WiFi, API URL, User ID)
6. Select board: **AI-Thinker ESP32-CAM**, upload

### 5. Avoid Changing IPs In Code

Use this setup so reconnecting to WiFi or a phone hotspot does not force source-code edits:

1. Keep the frontend on `VITE_API_URL=/api` during local development.
2. Put the camera address in `backend/.env` with `CAMERA_BASE_URL` and `CAMERA_CAPTURE_PATH`.
3. Point the ESP32 device to a stable backend domain such as Render instead of your laptop IP whenever possible.
4. For the ESP32-CAM on your local network, use either a DHCP reservation/static lease or an mDNS hostname like `smartdesk-cam.local`.

Example backend camera config:

```env
CAMERA_BASE_URL=http://smartdesk-cam.local
CAMERA_CAPTURE_PATH=/capture
```

The frontend now loads the ESP32 camera preview through the backend, so the camera IP no longer needs to be hardcoded in React.

---

## 🌐 Deployment

### Backend → Render

1. Push `backend/` folder to a GitHub repo
2. Create new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — just set the env vars:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `SUPABASE_ANON_KEY` | Anon key |
| `JWT_SECRET` | Any long random string |
| `FIREBASE_CREDENTIALS_JSON` | Firebase service account JSON (one line) |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` |

5. Deploy → copy the `https://xxx.onrender.com` URL

### Frontend → Vercel

1. Push `frontend/` folder to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Set environment variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com` |
| `VITE_FIREBASE_API_KEY` | From Firebase console |
| `VITE_FIREBASE_AUTH_DOMAIN` | |
| `VITE_FIREBASE_PROJECT_ID` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |
| `VITE_FIREBASE_VAPID_KEY` | From Firebase → Cloud Messaging |

4. Deploy → use the Vercel URL as `ALLOWED_ORIGINS` in Render

---

## 🔔 Firebase Notifications (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com) → New project
2. Project Settings → Service accounts → Generate new private key (download JSON)
3. Paste the entire JSON (minified to one line) as `FIREBASE_CREDENTIALS_JSON` in Render
4. Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
5. Copy the VAPID key → set as `VITE_FIREBASE_VAPID_KEY` in Vercel
6. Register your frontend URL in Firebase → Authentication → Authorized domains

---

## 🔗 ESP32 Final Configuration

After deploying backend, update the ESP32 firmware:

```cpp
const char* API_BASE_URL = "https://your-backend.onrender.com";
const char* USER_ID      = "uuid-from-your-supabase-users-table";
```

Find your User ID: After logging in, check Supabase → Table Editor → users table.

---

## 🏗️ Architecture

```
ESP32-CAM ─── HTTP POST ──→ FastAPI Backend ─── Supabase (PostgreSQL)
                                    ↓
                              MediaPipe Pose
                              Detection Engine
                                    ↓
                            Firebase FCM (push)
                                    ↓
React Frontend ←── REST API ────────┘
  Dashboard
  Pomodoro
  Analytics
  Insights
```

---

## 🔍 Troubleshooting

| Problem | Fix |
|---------|-----|
| ESP32 not connecting to WiFi | Double-check SSID/password, ensure 2.4GHz band |
| Camera shows black image | Power supply issue — use 5V 2A+ adapter |
| Backend 422 errors | Check Content-Type headers; ensure user_id is valid UUID |
| Posture always "unknown" | Ensure you're visible in frame and well-lit |
| Supabase auth errors | Check service_role key (not anon key) in backend .env |
| CORS errors | Add frontend URL to `ALLOWED_ORIGINS` in backend env |
| Firebase notifications not working | Check VAPID key and service worker registration |
| Distance readings erratic | Check HC-SR04 wiring; ensure stable 5V supply |

---

## 📊 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| POST | `/posture/analyze` | Analyze posture from image |
| GET | `/posture/stats/{user_id}` | Posture statistics |
| POST | `/distance/log` | Log distance reading |
| GET | `/distance/stats/{user_id}` | Distance statistics |
| POST | `/pomodoro/start` | Start Pomodoro session |
| POST | `/pomodoro/pause` | Pause session |
| POST | `/pomodoro/resume` | Resume session |
| POST | `/pomodoro/complete` | Mark complete |
| POST | `/pomodoro/stop` | Stop session |
| GET | `/analytics/dashboard/{user_id}` | Full dashboard data |
| GET | `/analytics/insights/{user_id}` | AI-generated insights |
| GET | `/analytics/warnings/{user_id}` | Warning history |

---

## 📝 License

MIT — Free for personal and commercial use.
