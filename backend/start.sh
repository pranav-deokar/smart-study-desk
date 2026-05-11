#!/usr/bin/env bash
# SmartDesk Backend — Local Dev Startup
set -e

if [ ! -f ".env" ]; then
  echo "❌ .env file not found. Copy .env.example and fill in your values."
  exit 1
fi

if [ ! -d "venv" ]; then
  echo "📦 Creating virtual environment..."
  python -m venv venv
fi

echo "📦 Activating venv and installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt -q

echo "🚀 Starting SmartDesk API on http://localhost:8000"
echo "📖 Swagger UI: http://localhost:8000/docs"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
