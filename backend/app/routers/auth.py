from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from app.models import UserCreate, UserLogin, TokenResponse, FCMTokenUpdate
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def verify_token(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/register", response_model=TokenResponse)
async def register(body: UserCreate):
    db = get_db()
    existing = db.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = pwd_context.hash(body.password.encode('utf-8')[:72])
    result = db.table("users").insert({
        "email": body.email,
        "full_name": body.full_name,
        "password_hash": hashed
    }).execute()

    user = result.data[0]
    token = create_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        email=user["email"],
        full_name=user.get("full_name")
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    db = get_db()
    result = db.table("users").select("*").eq("email", body.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = result.data[0]
    if not pwd_context.verify(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token({"sub": user["id"], "email": user["email"]})
    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        email=user["email"],
        full_name=user.get("full_name")
    )


@router.post("/fcm-token")
async def update_fcm_token(body: FCMTokenUpdate, claims: dict = Depends(verify_token)):
    db = get_db()
    db.table("users").update({"fcm_token": body.fcm_token}).eq("id", body.user_id).execute()
    return {"status": "updated"}


@router.get("/me")
async def get_me(claims: dict = Depends(verify_token)):
    db = get_db()
    result = db.table("users").select("id,email,full_name,created_at").eq("id", claims["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]
