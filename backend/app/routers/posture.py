from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.services.posture_detection import analyze_posture
from app.services.firebase_service import send_push_notification
from app.database import get_db
from app.config import settings
import logging
from pydantic import BaseModel
import requests
router = APIRouter(prefix="/posture", tags=["posture"])
logger = logging.getLogger(__name__)


def fetch_camera_frame() -> tuple[bytes, str]:
    camera_url = settings.camera_capture_url
    if not camera_url:
        raise HTTPException(
            status_code=503,
            detail="Camera URL is not configured. Set CAMERA_BASE_URL in backend/.env",
        )

    try:
        response = requests.get(camera_url, timeout=5)
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Failed to fetch camera frame from %s: %s", camera_url, exc)
        raise HTTPException(status_code=502, detail="Camera fetch failed") from exc

    content_type = response.headers.get("content-type", "image/jpeg")
    return response.content, content_type


def open_camera_stream() -> requests.Response:
    stream_url = settings.camera_stream_url
    if not stream_url:
        raise HTTPException(
            status_code=503,
            detail="Camera stream URL is not configured. Set CAMERA_STREAM_URL in backend/.env",
        )

    try:
        response = requests.get(stream_url, stream=True, timeout=(5, None))
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Failed to open camera stream from %s: %s", stream_url, exc)
        raise HTTPException(status_code=502, detail="Camera stream failed") from exc

    return response


def iter_camera_stream(response: requests.Response):
    try:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                yield chunk
    finally:
        response.close()


@router.post("/analyze")
async def analyze(
    user_id: str = Form(...),
    image: UploadFile = File(...)
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await image.read()
    result = analyze_posture(image_bytes, settings.BAD_POSTURE_ANGLE_THRESHOLD)

    db = get_db()
    db.table("posture_logs").insert({
        "user_id": user_id,
        "posture": result["posture"],
        "neck_angle": result.get("neck_angle"),
        "shoulder_angle": result.get("shoulder_angle"),
        "confidence": result.get("confidence", 0)
    }).execute()

    if result["warning"]:
        db.table("warnings").insert({
            "user_id": user_id,
            "warning_type": "posture",
            "message": result["message"],
            "severity": "high" if result.get("neck_angle", 180) < 130 else "medium"
        }).execute()
        

        user_res = db.table("users").select("fcm_token").eq("id", user_id).execute()
        print("USER DATA:", user_res.data)
        if user_res.data and user_res.data[0].get("fcm_token"):
            send_push_notification(
                user_res.data[0]["fcm_token"],
                "Posture Warning",
                result["message"],
                {"type": "posture"}
            )
    print("RESULT:", result)
    return result


@router.get("/history/{user_id}")
async def get_history(user_id: str, limit: int = 50):
    db = get_db()
    result = db.table("posture_logs").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
    return result.data


@router.get("/stats/{user_id}")
async def get_stats(user_id: str, hours: int = 24):
    db = get_db()
    from datetime import datetime, timedelta
    since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
    result = db.table("posture_logs").select("posture,created_at").eq("user_id", user_id).gte("created_at", since).execute()
    rows = result.data or []
    good = sum(1 for r in rows if r["posture"] == "good")
    bad = sum(1 for r in rows if r["posture"] == "bad")
    total = len(rows)
    return {
        "total": total,
        "good": good,
        "bad": bad,
        "good_percent": round((good / total * 100) if total else 0, 1),
        "data": rows
    }


class CameraRequest(BaseModel):
    user_id: str


@router.get("/camera-config")
async def camera_config():
    return {
        "base_url": settings.CAMERA_BASE_URL,
        "capture_url": settings.camera_capture_url,
        "stream_url": settings.camera_stream_url,
    }


@router.get("/camera-preview")
async def camera_preview():
    image_bytes, content_type = fetch_camera_frame()
    return Response(content=image_bytes, media_type=content_type)


@router.get("/camera-stream")
async def camera_stream():
    response = open_camera_stream()
    media_type = response.headers.get(
        "content-type",
        "multipart/x-mixed-replace; boundary=frame",
    )
    return StreamingResponse(iter_camera_stream(response), media_type=media_type)


@router.post("/analyze-camera")
async def analyze_camera(req: CameraRequest):
    user_id = req.user_id

    image_bytes, _ = fetch_camera_frame()

    result = analyze_posture(image_bytes, settings.BAD_POSTURE_ANGLE_THRESHOLD)

    db = get_db()

    db.table("posture_logs").insert({
        "user_id": user_id,
        "posture": result["posture"],
        "neck_angle": result.get("neck_angle"),
        "shoulder_angle": result.get("shoulder_angle"),
        "confidence": result.get("confidence", 0)
    }).execute()

    if result["warning"]:
        db.table("warnings").insert({
            "user_id": user_id,
            "warning_type": "posture",
            "message": result["message"],
            "severity": "high" if result.get("neck_angle", 180) < 130 else "medium"
        }).execute()

        user_res = db.table("users").select("fcm_token").eq("id", user_id).execute()
        if user_res.data and user_res.data[0].get("fcm_token"):
            send_push_notification(
                user_res.data[0]["fcm_token"],
                "Posture Warning",
                result["message"],
                {"type": "posture"}
            )

    return result
