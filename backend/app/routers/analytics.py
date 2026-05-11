from fastapi import APIRouter
from app.database import get_db
from app.services.insights_service import generate_insights
from app.models import InsightsResponse

from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/insights/{user_id}", response_model=InsightsResponse)
async def get_insights(user_id: str):
    return generate_insights(user_id)


@router.get("/warnings/{user_id}")
async def get_warnings(user_id: str, limit: int = 30, unread_only: bool = False):
    db = get_db()
    query = db.table("warnings").select("*").eq("user_id", user_id)

    if unread_only:
        query = query.eq("acknowledged", False)

    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.post("/warnings/{warning_id}/acknowledge")
async def acknowledge_warning(warning_id: str):
    db = get_db()
    result = db.table("warnings") \
        .update({"acknowledged": True}) \
        .eq("id", warning_id) \
        .execute()

    return result.data[0] if result.data else {"status": "not_found"}


@router.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    db = get_db()

    # ✅ FIXED timezone-aware datetime
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    # 🚀 FIXED: always get LATEST 20 records (NO old data issue)
    
    posture_query = db.table("posture_logs") \
        .select("posture,created_at") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()

    distance_query = db.table("distance_logs") \
        .select("distance_cm,is_safe,created_at") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()

    # reverse so chart goes left → right correctly
    posture_rows = list(reversed(posture_query.data or []))
    distance_rows = list(reversed(distance_query.data or []))

    pomodoro_week = db.table("pomodoro_sessions") \
        .select("*") \
        .eq("user_id", user_id) \
        .gte("started_at", week_ago) \
        .execute()

    warnings_today = db.table("warnings") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(30) \
        .execute()

    active_session = db.table("pomodoro_sessions") \
        .select("*") \
        .eq("user_id", user_id) \
        .in_("status", ["active", "paused"]) \
        .order("started_at", desc=True) \
        .limit(1) \
        .execute()

    pomodoro_rows = pomodoro_week.data or []

    # calculations
    posture_good = sum(1 for r in posture_rows if r["posture"] == "good")
    posture_total = len(posture_rows) or 1

    dist_safe = sum(1 for r in distance_rows if r["is_safe"])
    dist_total = len(distance_rows) or 1

    pomo_completed = sum(1 for r in pomodoro_rows if r["status"] == "completed")
    pomo_total = len(pomodoro_rows) or 1

    return {
        "posture": {
            "good_percent": round(posture_good / posture_total * 100, 1),
            "total_readings": posture_total,
            "timeline": posture_rows
        },
        "distance": {
            "safe_percent": round(dist_safe / dist_total * 100, 1),
            "total_readings": dist_total,
            "avg_cm": round(
                sum(r["distance_cm"] for r in distance_rows) / dist_total, 1
            ),
            "timeline": distance_rows
        },
        "pomodoro": {
            "completed_this_week": pomo_completed,
            "total_this_week": pomo_total,
            "completion_rate": round(pomo_completed / pomo_total * 100, 1),
            "sessions": pomodoro_rows
        },
        "warnings": warnings_today.data or [],
        "active_session": active_session.data[0] if active_session.data else None
    }