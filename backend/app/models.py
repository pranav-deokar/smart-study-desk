from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: Optional[str]


class PostureResult(BaseModel):
    posture: str
    neck_angle: Optional[float]
    shoulder_angle: Optional[float]
    confidence: float
    warning: bool
    message: str


class DistanceData(BaseModel):
    user_id: str
    distance_cm: float


class DistanceResult(BaseModel):
    distance_cm: float
    is_safe: bool
    warning: bool
    message: str


class PomodoroStart(BaseModel):
    user_id: str
    duration_minutes: int = 25
    break_minutes: int = 5


class PomodoroAction(BaseModel):
    session_id: str
    user_id: str


class PomodoroSession(BaseModel):
    id: str
    user_id: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration_minutes: int
    break_minutes: int
    status: str
    interruptions: int
    completed_cycles: int


class WarningOut(BaseModel):
    id: str
    user_id: str
    warning_type: str
    message: str
    severity: str
    acknowledged: bool
    created_at: datetime


class InsightsResponse(BaseModel):
    posture_score: float
    distance_score: float
    productivity_score: float
    total_study_minutes: int
    messages: list[str]
    recommendations: list[str]


class FCMTokenUpdate(BaseModel):
    user_id: str
    fcm_token: str
