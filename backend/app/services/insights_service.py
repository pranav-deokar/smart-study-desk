from app.database import get_db
from datetime import datetime, timedelta


def generate_insights(user_id: str) -> dict:
    db = get_db()
    since = (datetime.utcnow() - timedelta(days=7)).isoformat()

    posture_res = db.table("posture_logs").select("posture").eq("user_id", user_id).gte("created_at", since).execute()
    distance_res = db.table("distance_logs").select("is_safe").eq("user_id", user_id).gte("created_at", since).execute()
    pomodoro_res = db.table("pomodoro_sessions").select("status,duration_minutes,interruptions,completed_cycles").eq("user_id", user_id).gte("started_at", since).execute()
    warnings_res = db.table("warnings").select("warning_type").eq("user_id", user_id).gte("created_at", since).execute()

    posture_rows = posture_res.data or []
    distance_rows = distance_res.data or []
    pomodoro_rows = pomodoro_res.data or []
    warning_rows = warnings_res.data or []

    good_posture = sum(1 for r in posture_rows if r["posture"] == "good")
    total_posture = len(posture_rows) or 1
    posture_score = round((good_posture / total_posture) * 100, 1)

    safe_distance = sum(1 for r in distance_rows if r["is_safe"])
    total_distance = len(distance_rows) or 1
    distance_score = round((safe_distance / total_distance) * 100, 1)

    completed = sum(1 for r in pomodoro_rows if r["status"] == "completed")
    total_sessions = len(pomodoro_rows) or 1
    productivity_score = round((completed / total_sessions) * 100, 1)

    total_study_minutes = sum(
        r["duration_minutes"] for r in pomodoro_rows
        if r["status"] in ("completed", "stopped") and r.get("duration_minutes")
    )

    messages = []
    recommendations = []

    if posture_score < 50:
        messages.append("Bad posture detected in more than half your sessions this week.")
        recommendations.append("Place your monitor at eye level and consider a lumbar support cushion.")
    elif posture_score < 75:
        messages.append("Your posture needs some improvement — you leaned forward frequently.")
        recommendations.append("Set a posture reminder every 20 minutes.")
    else:
        messages.append("Excellent posture maintained throughout the week!")

    if distance_score < 50:
        messages.append("You sat too close to your screen often — risk of eye strain is high.")
        recommendations.append("Keep at least 55 cm distance from your monitor.")
    elif distance_score < 80:
        messages.append("Distance from screen was sometimes too close.")
        recommendations.append("Use the 20-20-20 rule: every 20 min, look 20 feet away for 20 seconds.")
    else:
        messages.append("Great screen distance maintained — your eyes will thank you!")

    if productivity_score < 40:
        messages.append("Low Pomodoro session completion rate — many sessions were interrupted.")
        recommendations.append("Eliminate distractions before starting a session. Put your phone in another room.")
    elif productivity_score < 70:
        messages.append("Moderate productivity — about half your Pomodoro sessions completed.")
        recommendations.append("Try shorter 15-minute focus sessions if 25 minutes feels too long.")
    else:
        messages.append("Strong productivity! Most Pomodoro sessions completed successfully.")

    avg_interruptions = (
        sum(r.get("interruptions", 0) for r in pomodoro_rows) / total_sessions
        if pomodoro_rows else 0
    )
    if avg_interruptions > 2:
        messages.append(f"Average of {avg_interruptions:.1f} interruptions per session — focus is fragmented.")
        recommendations.append("Use noise-cancelling headphones and close unnecessary browser tabs.")

    posture_warnings = sum(1 for w in warning_rows if w["warning_type"] == "posture")
    if posture_warnings > 10:
        messages.append(f"{posture_warnings} posture warnings triggered this week.")

    if not recommendations:
        recommendations.append("Keep up the great work! Consistency is the key to long-term health and productivity.")

    return {
        "posture_score": posture_score,
        "distance_score": distance_score,
        "productivity_score": productivity_score,
        "total_study_minutes": total_study_minutes,
        "messages": messages,
        "recommendations": recommendations
    }
