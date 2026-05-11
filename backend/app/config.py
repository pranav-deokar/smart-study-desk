from pydantic_settings import BaseSettings
from typing import Optional
import json
from urllib.parse import urlsplit, urlunsplit


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str
    JWT_SECRET: str
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    DISTANCE_THRESHOLD_CM: float = 55.0
    BAD_POSTURE_ANGLE_THRESHOLD: float = 160.0
    CAMERA_BASE_URL: Optional[str] = None
    CAMERA_CAPTURE_PATH: str = "/capture"
    CAMERA_STREAM_URL: Optional[str] = None
    CAMERA_STREAM_PATH: str = "/stream"
    CAMERA_STREAM_PORT: int = 81

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def firebase_credentials(self) -> Optional[dict]:
        if self.FIREBASE_CREDENTIALS_JSON:
            return json.loads(self.FIREBASE_CREDENTIALS_JSON)
        return None

    @property
    def camera_capture_url(self) -> Optional[str]:
        if not self.CAMERA_BASE_URL:
            return None

        base_url = self.CAMERA_BASE_URL.rstrip("/")
        capture_path = self.CAMERA_CAPTURE_PATH.strip() or "/capture"
        if not capture_path.startswith("/"):
            capture_path = f"/{capture_path}"

        return f"{base_url}{capture_path}"

    @property
    def camera_stream_url(self) -> Optional[str]:
        if self.CAMERA_STREAM_URL:
            return self.CAMERA_STREAM_URL.strip()

        if not self.CAMERA_BASE_URL:
            return None

        parsed = urlsplit(self.CAMERA_BASE_URL.rstrip("/"))
        if not parsed.scheme or not parsed.hostname:
            return None

        stream_path = self.CAMERA_STREAM_PATH.strip() or "/stream"
        if not stream_path.startswith("/"):
            stream_path = f"/{stream_path}"

        netloc = parsed.hostname
        if parsed.port:
            netloc = f"{parsed.hostname}:{self.CAMERA_STREAM_PORT}"
        else:
            netloc = f"{parsed.hostname}:{self.CAMERA_STREAM_PORT}"

        return urlunsplit((parsed.scheme, netloc, stream_path, "", ""))

    class Config:
        env_file = ".env"


settings = Settings()
