-- SmartDesk Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    password_hash TEXT NOT NULL,
    fcm_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posture_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    posture TEXT NOT NULL CHECK (posture IN ('good', 'bad', 'unknown')),
    neck_angle FLOAT,
    shoulder_angle FLOAT,
    confidence FLOAT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    distance_cm FLOAT NOT NULL,
    is_safe BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 25,
    break_minutes INTEGER DEFAULT 5,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'stopped')),
    interruptions INTEGER DEFAULT 0,
    completed_cycles INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    warning_type TEXT NOT NULL CHECK (warning_type IN ('posture', 'distance', 'inactivity')),
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_posture_logs_user_created
    ON posture_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_distance_logs_user_created
    ON distance_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pomodoro_user_started
    ON pomodoro_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_warnings_user_created
    ON warnings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warnings_acknowledged
    ON warnings(user_id, acknowledged, created_at DESC);

-- Row Level Security (enable if using Supabase Auth directly)
-- ALTER TABLE posture_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE distance_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;
