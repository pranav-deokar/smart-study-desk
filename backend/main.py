from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.services.firebase_service import init_firebase
from app.routers import auth, posture, distance, pomodoro, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    init_firebase()
    yield


app = FastAPI(
    title="Smart Study Desk API",
    version="1.0.0",
    description="AI-powered smart desk monitoring system",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for now allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(posture.router)
app.include_router(distance.router)
app.include_router(pomodoro.router)
app.include_router(analytics.router)


@app.get("/")
async def root():
    return {"status": "Smart Study Desk API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
