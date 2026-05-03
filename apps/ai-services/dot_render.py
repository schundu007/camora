"""Runtime Graphviz DOT renderer.

Sister to layered_diagram.py (which is build-time, deterministic, called
by the bake script) — this endpoint takes raw DOT source from the LLM
output stream and renders it to SVG inline so the browser doesn't have
to ship the heavy `mermaid` JS bundle just to draw a five-node sequence.

Hardened to make it safe-ish to expose behind the existing AI_SERVICES_API_KEY
gate:
  - Strict size cap on input (16 KB) — DOT is dense; legit diagrams are
    under 4 KB. Anything larger is almost certainly an LLM hallucination
    or an attempted DoS.
  - Subprocess `dot` invocation with a hard timeout so a malformed graph
    can't pin a CPU.
  - DOT shell-out via stdin (no temp files, no shell interpolation, no
    user-controlled filenames touching the FS).
  - Whitelist of attribute keys / engine flags. We only honour `engine`
    (dot|neato|sfdp) and `format` (svg|png) from the request; everything
    else in the DOT body is fed verbatim to graphviz.
"""

from __future__ import annotations

import base64
import logging
import subprocess
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_DOT_BYTES = 16 * 1024
RENDER_TIMEOUT_S = 8

ALLOWED_ENGINES = {"dot", "neato", "sfdp", "fdp", "twopi", "circo"}
ALLOWED_FORMATS = {"svg", "png"}


class DotRenderRequest(BaseModel):
    dot: str = Field(..., description="Raw Graphviz DOT source")
    engine: str = Field("dot", description="Layout engine — dot/neato/sfdp/etc.")
    format: str = Field("svg", description="Output format — svg or png")


class DotRenderResponse(BaseModel):
    format: str
    # SVG is returned as text; PNG as base64 so the JSON shape stays
    # consistent across both response paths.
    content: str
    encoding: str  # 'utf8' for svg, 'base64' for png


@router.post("/diagram/render-dot", response_model=DotRenderResponse)
async def render_dot(req: DotRenderRequest) -> DotRenderResponse:
    if not req.dot or not req.dot.strip():
        raise HTTPException(400, "Empty DOT body")
    if len(req.dot.encode("utf-8")) > MAX_DOT_BYTES:
        raise HTTPException(413, f"DOT body exceeds {MAX_DOT_BYTES} bytes")
    if req.engine not in ALLOWED_ENGINES:
        raise HTTPException(400, f"engine must be one of {sorted(ALLOWED_ENGINES)}")
    if req.format not in ALLOWED_FORMATS:
        raise HTTPException(400, f"format must be one of {sorted(ALLOWED_FORMATS)}")

    # graphviz is pre-installed on the ai-services container (Dockerfile
    # already pulls the system package for layered_diagram.py to work).
    cmd = [req.engine, "-T", req.format]
    try:
        result = subprocess.run(
            cmd,
            input=req.dot,
            text=(req.format == "svg"),
            capture_output=True,
            timeout=RENDER_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        logger.warning("dot render timed out (%ss)", RENDER_TIMEOUT_S)
        raise HTTPException(408, "Render timed out")
    except FileNotFoundError:
        logger.error("graphviz `%s` binary not on PATH", req.engine)
        raise HTTPException(500, "Render engine unavailable")

    if result.returncode != 0:
        # stderr from graphviz is short and human-readable ("syntax
        # error in line 3 near …") — surface it back so the caller can
        # show it in dev logs without having to retry.
        stderr = result.stderr if isinstance(result.stderr, str) else result.stderr.decode("utf-8", "replace")
        logger.warning("dot render failed: %s", stderr.strip()[:500])
        raise HTTPException(422, f"DOT render failed: {stderr.strip()[:200]}")

    if req.format == "svg":
        return DotRenderResponse(format="svg", content=result.stdout, encoding="utf8")

    # PNG bytes — base64-encode for a JSON-safe payload.
    png_b64 = base64.b64encode(result.stdout).decode("ascii")
    return DotRenderResponse(format="png", content=png_b64, encoding="base64")
