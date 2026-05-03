"""Lightweight Python microservice for AI-specific tasks.

Handles speaker verification and architecture diagram generation —
features that require Python-only libraries (resemblyzer, diagrams).
Called by Lumora / Ascend backend via internal REST API.

Security:
  Every non-health endpoint requires an X-API-Key header that matches
  AI_SERVICES_API_KEY. /diagram/generate executes LLM-generated Python
  inside the host container and /speaker/* manages voice biometrics —
  neither should be reachable from the open internet without auth.
  Backends inject the key from their own AI_SERVICES_API_KEY env.
"""
import os
import secrets
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from speaker import router as speaker_router
from diagram import router as diagram_router
from dot_render import router as dot_render_router

app = FastAPI(title="Camora AI Services", version="1.0.0")

# Routes that don't require the X-API-Key gate. /health is the Railway
# healthcheck target; OpenAPI docs are kept open in dev for inspection.
_OPEN_PATHS = {"/", "/health", "/docs", "/redoc", "/openapi.json"}


class ApiKeyAuth(BaseHTTPMiddleware):
    """Reject any non-health request that doesn't present the shared
    secret in X-API-Key. Constant-time compare so a leaked timing
    side-channel can't be used to brute-force the key."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/") or "/"
        if path in _OPEN_PATHS or request.method == "OPTIONS":
            return await call_next(request)
        expected = os.getenv("AI_SERVICES_API_KEY", "").strip()
        if not expected:
            # Fail closed: an unset env in prod must not silently
            # disable auth. Dev can opt-in via AI_SERVICES_DEV_OPEN=1.
            if os.getenv("AI_SERVICES_DEV_OPEN") != "1":
                raise HTTPException(503, "AI_SERVICES_API_KEY not configured")
            return await call_next(request)
        provided = request.headers.get("x-api-key", "")
        if not secrets.compare_digest(provided.encode(), expected.encode()):
            raise HTTPException(401, "Invalid or missing X-API-Key")
        return await call_next(request)


app.add_middleware(ApiKeyAuth)

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

# Runtime DOT renderer (used by Lumora answer pipeline + Capra
# system-design fallback to draw flow/sequence diagrams without shipping
# the heavy mermaid client bundle to the browser).
app.include_router(dot_render_router)
