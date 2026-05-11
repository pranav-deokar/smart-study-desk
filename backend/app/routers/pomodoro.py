from fastapi import APIRouter, HTTPException
from app.models import PomodoroStart, PomodoroAction
from app.database import get_db
from app.services.firebase_service import send_push_notification
from datetime import datetime

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])


@router.post("/start")
async def start_session(body: PomodoroStart):
    db = get_db()
    active = db.table("pomodoro_sessions").select("id,status").eq("user_id", body.user_id).in_("status", ["active", "paused"]).execute()
    if active.data:
        raise HTTPException(status_code=400, detail="A session is already active or paused. Resume or stop it first.")

    result = db.table("pomodoro_sessions").insert({
        "user_id": body.user_id,
        "duration_minutes": body.duration_minutes,
        "break_minutes": body.break_minutes,
        "status": "active",
        "interruptions": 0,
        "completed_cycles": 0
    }).execute()

    return result.data[0]


@router.post("/pause")
async def pause_session(body: PomodoroAction):
    db = get_db()
    result = db.table("pomodoro_sessions").update({
        "status": "paused"
    }).eq("id", body.session_id).eq("user_id", body.user_id).eq("status", "active").execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Active session not found")

    db.table("pomodoro_sessions").update({
        "interruptions": result.data[0].get("interruptions", 0) + 1
    }).eq("id", body.session_id).execute()

    return result.data[0]


@router.post("/resume")
async def resume_session(body: PomodoroAction):
    db = get_db()
    result = db.table("pomodoro_sessions").update({
        "status": "active"
    }).eq("id", body.session_id).eq("user_id", body.user_id).eq("status", "paused").execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Paused session not found")

    return result.data[0]


@router.post("/complete")
async def complete_session(body: PomodoroAction):
    db = get_db()
    session_res = db.table("pomodoro_sessions").select("*").eq("id", body.session_id).eq("user_id", body.user_id).execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = session_res.data[0]
    new_cycles = session.get("completed_cycles", 0) + 1

    result = db.table("pomodoro_sessions").update({
        "status": "completed",
        "ended_at": datetime.utcnow().isoformat(),
        "completed_cycles": new_cycles
    }).eq("id", body.session_id).execute()

    user_res = db.table("users").select("fcm_token").eq("id", body.user_id).execute()
    if user_res.data and user_res.data[0].get("fcm_token"):
        send_push_notification(
            user_res.data[0]["fcm_token"],
            "Pomodoro Complete! 🍅",
            f"Great work! Take a {session['break_minutes']}-minute break.",
            {"type": "pomodoro_complete"}
        )

    return result.data[0]


@router.post("/stop")
async def stop_session(body: PomodoroAction):
    db = get_db()
    result = db.table("pomodoro_sessions").update({
        "status": "stopped",
        "ended_at": datetime.utcnow().isoformat()
    }).eq("id", body.session_id).eq("user_id", body.user_id).in_("status", ["active", "paused"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    return result.data[0]


@router.get("/active/{user_id}")
async def get_active_session(user_id: str):
    db = get_db()
    result = db.table("pomodoro_sessions").select("*").eq("user_id", user_id).in_("status", ["active", "paused"]).order("started_at", desc=True).limit(1).execute()
    return result.data[0] if result.data else None


@router.get("/history/{user_id}")
async def get_history(user_id: str, limit: int = 20):
    db = get_db()
    result = db.table("pomodoro_sessions").select("*").eq("user_id", user_id).order("started_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/stats/{user_id}")
async def get_stats(user_id: str):
    db = get_db()
    from datetime import timedelta
    since = (datetime.utcnow() - timedelta(days=7)).isoformat()
    result = db.table("pomodoro_sessions").select("*").eq("user_id", user_id).gte("started_at", since).execute()
    rows = result.data or []
    completed = [r for r in rows if r["status"] == "completed"]
    total_focus = sum(r["duration_minutes"] for r in completed)
    return {
        "total_sessions": len(rows),
        "completed": len(completed),
        "stopped": sum(1 for r in rows if r["status"] == "stopped"),
        "total_focus_minutes": total_focus,
        "completion_rate": round((len(completed) / len(rows) * 100) if rows else 0, 1),
        "sessions": rows
    }
