"""Lightweight Python microservice for AI-specific tasks.

Handles speaker verification and architecture diagram generation —
features that require Python-only libraries (resemblyzer, diagrams).
Called by Lumora backend via internal REST API.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from speaker import router as speaker_router
from diagram import router as diagram_router

app = FastAPI(title="Camora AI Services", version="1.0.0")

# CORS allowlist — ai-services only accepts browser requests from known origins.
# Backend-to-backend traffic (lumora → ai-services) is server-to-server, so it
# isn't subject to CORS. Override in prod via AI_SERVICES_CORS_ORIGINS env (csv).
_default_origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8001",
    "https://camora.cariara.com",
    "https://app.cariara.com",
    "https://jobs.cariara.com",
    "https://lumora.cariara.com",
    "https://caprab.cariara.com",
    "https://lumorab.cariara.com",
]
_env_origins = os.getenv("AI_SERVICES_CORS_ORIGINS", "").strip()
allow_origins = [o.strip() for o in _env_origins.split(",") if o.strip()] if _env_origins else _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
    allow_credentials=True,
)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-services"}

# Speaker verification endpoints
app.include_router(speaker_router)

# Diagram generation endpoints
app.include_router(diagram_router)
