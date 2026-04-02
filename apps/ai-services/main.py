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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-services"}

# Speaker verification endpoints
app.include_router(speaker_router)

# Diagram generation endpoints
app.include_router(diagram_router)
