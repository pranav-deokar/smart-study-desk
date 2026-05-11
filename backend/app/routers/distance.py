from fastapi import APIRouter
from app.models import DistanceData, DistanceResult
from app.services.firebase_service import send_push_notification
from app.database import get_db
from app.config import settings
from datetime import datetime, timedelta

router = APIRouter(prefix="/distance", tags=["distance"])


@router.post("/log", response_model=DistanceResult)
async def log_distance(body: DistanceData):
    is_safe = body.distance_cm >= settings.DISTANCE_THRESHOLD_CM
    warning = not is_safe

    if warning:
        if body.distance_cm < 20:
            message = f"Critically close! {body.distance_cm:.1f}cm — move back immediately."
            severity = "high"
        else:
            message = f"Too close to screen: {body.distance_cm:.1f}cm — recommended minimum is {int(settings.DISTANCE_THRESHOLD_CM)}cm."
            severity = "medium"
    else:
        message = f"Safe distance: {body.distance_cm:.1f}cm"
        severity = "low"

    db = get_db()
    db.table("distance_logs").insert({
        "user_id": body.user_id,
        "distance_cm": body.distance_cm,
        "is_safe": is_safe
    }).execute()

    if warning:
        db.table("warnings").insert({
            "user_id": body.user_id,
            "warning_type": "distance",
            "message": message,
            "severity": severity
        }).execute()

        user_res = db.table("users").select("fcm_token").eq("id", body.user_id).execute()
        if user_res.data and user_res.data[0].get("fcm_token"):
            send_push_notification(
                user_res.data[0]["fcm_token"],
                "Distance Warning",
                message,
                {"type": "distance", "distance_cm": str(body.distance_cm)}
            )

    return DistanceResult(
        distance_cm=body.distance_cm,
        is_safe=is_safe,
        warning=warning,
        message=message
    )


@router.get("/history/{user_id}")
async def get_history(user_id: str, limit: int = 50):
    db = get_db()
    result = db.table("distance_logs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/stats/{user_id}")
async def get_stats(user_id: str, hours: int = 24):
    db = get_db()
    since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
    result = db.table("distance_logs").select("distance_cm,is_safe,created_at").eq("user_id", user_id).gte("created_at", since).execute()
    rows = result.data or []
    safe = sum(1 for r in rows if r["is_safe"])
    total = len(rows)
    avg_dist = sum(r["distance_cm"] for r in rows) / total if total else 0
    return {
        "total": total,
        "safe": safe,
        "unsafe": total - safe,
        "safe_percent": round((safe / total * 100) if total else 0, 1),
        "avg_distance_cm": round(avg_dist, 1),
        "data": rows
    }
