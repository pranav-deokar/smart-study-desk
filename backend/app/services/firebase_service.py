import firebase_admin
from firebase_admin import credentials, messaging
from app.config import settings
import logging

logger = logging.getLogger(__name__)

_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    creds_dict = settings.firebase_credentials
    if not creds_dict:
        logger.warning("Firebase credentials not configured — push notifications disabled.")
        return
    try:
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase initialized successfully.")
    except Exception as e:
        logger.error(f"Firebase init failed: {e}")


def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    if not _firebase_initialized:
        logger.warning("Firebase not initialized, skipping push notification.")
        return False
    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={str(k): str(v) for k, v in (data or {}).items()},
            token=fcm_token,
        )
        messaging.send(message)
        return True
    except Exception as e:
        logger.error(f"Push notification failed: {e}")
        return False
