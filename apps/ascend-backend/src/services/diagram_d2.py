#!/usr/bin/env python3
"""
Diagram Engine v5 — D2-based.

Why this exists alongside diagram_engine.py: the mingrammer/diagrams library
forces Claude to emit Python with strict class names (Dynamodb vs DynamoDB,
Run vs CloudRun, FunctionApps vs Functions). That brittleness drove a
60-entry alias map, a 3-attempt retry cascade, foreign-provider detection,
and import-validation in subprocess. D2's DSL accepts free-form labels —
class-name hallucinations stop being fatal — so the prompt is simpler and
the retry loop shrinks.

Output: SVG rendered by D2 (ELK layout), then rasterized to PNG via
rsvg-convert so the existing cache schema (image_data BYTEA) and the
frontend <img> render path don't change. ELK is bundled with d2 v0.7+.

CLI contract is identical to diagram_engine.py so pythonDiagrams.js can
swap engines via DIAGRAM_ENGINE env without other code changes.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import traceback
import uuid

try:
    import anthropic
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "anthropic", "-q"])
    import anthropic


# ── D2 binary discovery ───────────────────────────────────────────────────
def _d2_path() -> str:
    """Locate the d2 binary. Falls back to PATH lookup so this works locally
    (brew install d2 → /opt/homebrew/bin/d2) and on Railway (Dockerfile drops
    it at /usr/local/bin/d2)."""
    p = shutil.which("d2")
    if not p:
        raise RuntimeError(
            "d2 binary not found on PATH. Install via `brew install d2` "
            "locally, or check the Railway image build step in Dockerfile."
        )
    return p


def _rsvg_path() -> str | None:
    return shutil.which("rsvg-convert")


# ── Provider hints for the prompt ──────────────────────────────────────────
# D2 doesn't enforce strict service names — the model writes free-form
# labels — but we do want canonical naming so an Azure diagram says
# "Cosmos DB" not "DynamoDB". This list is the authoritative palette per
# provider; the prompt asks Claude to draw from it.
PROVIDER_PALETTE = {
    "aws": [
        "API Gateway", "ALB", "NLB", "CloudFront", "Route53", "WAF",
        "EC2", "Lambda", "ECS", "EKS", "Fargate", "Auto Scaling Group",
        "S3", "EBS", "EFS",
        "RDS", "Aurora", "DynamoDB", "ElastiCache (Redis)", "DocumentDB",
        "Redshift", "Athena", "Glue",
        "SQS", "SNS", "Kinesis", "EventBridge", "MSK (Kafka)",
        "Cognito", "IAM", "KMS", "Secrets Manager",
        "CloudWatch", "X-Ray", "CloudTrail",
    ],
    "gcp": [
        "API Gateway", "Cloud Load Balancing", "Cloud CDN", "Cloud DNS",
        "Compute Engine", "Cloud Functions", "Cloud Run", "GKE",
        "Cloud Storage", "Persistent Disk", "Filestore",
        "Cloud SQL", "Cloud Spanner", "Firestore", "Bigtable", "Memorystore",
        "BigQuery", "Dataproc", "Dataflow",
        "Pub/Sub", "Eventarc",
        "Identity Platform", "Cloud IAM", "Cloud KMS", "Secret Manager",
        "Cloud Monitoring", "Cloud Trace", "Cloud Audit Logs",
    ],
    "azure": [
        "API Management", "Azure Front Door", "Application Gateway",
        "Azure Load Balancer", "Azure CDN", "Azure DNS",
        "Azure VMs", "Azure Functions", "Container Instances",
        "Container Apps", "AKS", "App Service",
        "Azure Blob Storage", "Managed Disks", "Azure Files",
        "Azure SQL Database", "Cosmos DB", "Azure Cache for Redis",
        "Synapse Analytics", "Data Factory",
        "Service Bus", "Event Grid", "Event Hubs",
        "Azure AD / Entra", "Key Vault",
        "Azure Monitor", "Application Insights",
    ],
}


# ── Prompt construction ────────────────────────────────────────────────────
def get_prompt(question: str, provider: str, detail_level: str, direction: str) -> str:
    palette = ", ".join(PROVIDER_PALETTE.get(provider, PROVIDER_PALETTE["aws"]))

    if detail_level == "overview":
        scope = (
            "OVERVIEW MODE — 8 to 12 nodes in 3 logical groups (Edge & CDN, "
            "Application, Data Stores). Show the main request flow only."
        )
    else:
        scope = (
            "DETAILED MODE — 15 to 25 nodes in 5 to 6 logical groups "
            "(Edge & Security, Application Tier, Data Tier, Async Processing, "
            "Observability). Show CDN, WAF/auth, multiple app instances, "
            "primary DB + replica, cache, message queue, workers, "
            "monitoring."
        )

    direction_word = (
        "right" if direction in ("LR", "lr") else
        "down" if direction in ("TB", "tb") else
        "right"
    )

    return f"""You are an expert cloud architect. Produce a D2 diagram for the
system below. D2 is a modern declarative diagram language —
https://d2lang.com.

SYSTEM: {question}

CLOUD PROVIDER: {provider.upper()}. Use service names from this palette
ONLY — do not invent names or borrow from another cloud:
{palette}

{scope}

LAYOUT DIRECTION: {direction.upper()} ({direction_word}-flowing).
The first line of the body MUST be:
  direction: {direction_word}

OUTPUT — D2 SOURCE ONLY. No prose, no markdown fences. Use this shape:

  direction: right

  users: Clients {{
    shape: person
  }}

  edge: Edge & CDN {{
    style.fill: "#dbeafe"
    cdn: CloudFront
    dns: Route53
  }}

  app: Application {{
    style.fill: "#dcfce7"
    api: API Gateway
    svc: Lambda
  }}

  data: Data Stores {{
    style.fill: "#fef3c7"
    cache: ElastiCache (Redis)
    db: DynamoDB
  }}

  users -> edge.dns: HTTPS {{ style.stroke: "#2563eb" }}
  edge.dns -> edge.cdn {{ style.stroke: "#2563eb" }}
  edge.cdn -> app.api: route {{ style.stroke: "#2563eb" }}
  app.api -> app.svc {{ style.stroke: "#2563eb" }}
  app.svc -> data.cache: read {{ style.stroke: "#2563eb" }}
  app.svc -> data.db: write {{ style.stroke: "#16a34a" }}

EDGE COLORS — apply consistently:
  read/request:  #2563eb (blue)
  write/insert:  #16a34a (green)
  async/event:   #ea580c (orange)
  auth/security: #7c3aed (purple)
  monitoring:    #9ca3af (gray, dotted)

GROUP COLORS (style.fill on container):
  Edge/CDN:       #dbeafe
  Application:    #dcfce7
  Data:           #fef3c7
  Async:          #fce7f3
  Monitoring:     #f3f4f6

RULES:
1. EVERY connection has a label OR an explicit style.stroke color.
2. Group nodes via container blocks (`group: Name {{ ... }}`); reference
   children with dot notation (`group.child`).
3. Use short node labels (2-3 words).
4. Pick services from the {provider.upper()} palette only — never mix
   providers.
5. Return PURE D2 source. No code fences. No prose before or after.
"""


# ── Generation pipeline ────────────────────────────────────────────────────
def _strip_fences(text: str) -> str:
    """Strip leading/trailing markdown fences if Claude included them."""
    blocks = re.findall(r"```(?:d2)?\s*\n(.*?)```", text, re.DOTALL)
    if blocks:
        return "\n\n".join(b.strip() for b in blocks if b.strip())
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
    if text.endswith("```"):
        text = text[:-3].rstrip()
    return text.strip()


def _has_meaningful_body(d2_source: str) -> bool:
    """Reject empty/stub D2 — needs at least one connection."""
    if not d2_source:
        return False
    if "->" not in d2_source and "<-" not in d2_source and "--" not in d2_source:
        return False
    non_empty = [ln for ln in d2_source.splitlines() if ln.strip() and not ln.strip().startswith("#")]
    return len(non_empty) >= 4


def _run_d2(d2_source: str, output_dir: str, *, layout: str = "elk") -> dict:
    """Render D2 source → SVG, then rasterize to PNG via rsvg-convert.

    Returns {ok: bool, image_path?: str, stderr?: str}.
    """
    diagram_id = uuid.uuid4().hex[:8]
    base = os.path.join(output_dir, f"diagram-{diagram_id}")
    src_path = base + ".d2"
    svg_path = base + ".svg"
    png_path = base + ".png"

    with open(src_path, "w", encoding="utf-8") as f:
        f.write(d2_source)

    try:
        env = os.environ.copy()
        env["D2_LAYOUT"] = layout
        result = subprocess.run(
            [_d2_path(), src_path, svg_path],
            capture_output=True, text=True, timeout=45, env=env,
        )
        if result.returncode != 0:
            return {"ok": False, "stderr": (result.stderr or result.stdout)[:1200]}
        if not os.path.exists(svg_path):
            return {"ok": False, "stderr": "d2 returned 0 but no SVG produced"}

        # Rasterize SVG → PNG. rsvg-convert is already in the Dockerfile
        # (librsvg2-bin) and on macOS via `brew install librsvg`.
        rsvg = _rsvg_path()
        if rsvg:
            rast = subprocess.run(
                [rsvg, "-d", "150", "-p", "150", "-f", "png", "-o", png_path, svg_path],
                capture_output=True, text=True, timeout=20,
            )
            if rast.returncode != 0 or not os.path.exists(png_path):
                # PNG rasterization failed — fall back to serving SVG so the
                # spike isn't blocked by a missing librsvg locally.
                return {"ok": True, "image_path": svg_path}
            return {"ok": True, "image_path": png_path}

        # No rsvg available — serve the SVG. The cache layer accepts any
        # blob; the frontend <img src> renders SVG fine.
        return {"ok": True, "image_path": svg_path}
    except subprocess.TimeoutExpired:
        return {"ok": False, "stderr": "d2 timed out (45s)"}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "stderr": f"{type(e).__name__}: {e}"}


def generate_diagram(
    question: str,
    provider: str,
    detail_level: str,
    direction: str,
    output_dir: str,
    api_key: str,
) -> dict:
    """Public entry point — same shape as diagram_engine.generate_diagram()."""
    client = anthropic.Anthropic(api_key=api_key)
    prompt = get_prompt(question, provider, detail_level, direction)

    # Attempt 1 — straight prompt.
    resp = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    body = _strip_fences(resp.content[0].text)
    if not _has_meaningful_body(body):
        body_for_retry = body
        # Attempt 2 — with explicit reminder + last attempt's body.
        sys.stderr.write("[DiagramD2] Empty/trivial body on attempt 1; retrying\n")
        resp2 = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=3000,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": body_for_retry or "(empty)"},
                {"role": "user", "content": (
                    "That output was empty or had no connections. Return PURE D2 "
                    "source with at least 3 groups and at least 6 `->` "
                    "connections. No fences, no prose."
                )},
            ],
        )
        body = _strip_fences(resp2.content[0].text)

    if not _has_meaningful_body(body):
        return {"success": False, "error": "Model failed to produce a meaningful D2 body after 2 attempts", "source_code": body}

    # Render — try ELK first (better for architecture), fall back to dagre
    # if ELK rejects the source for any reason.
    result = _run_d2(body, output_dir, layout="elk")
    if not result["ok"]:
        sys.stderr.write(f"[DiagramD2] ELK failed ({result.get('stderr','')[:200]}); retrying with dagre\n")
        result = _run_d2(body, output_dir, layout="dagre")

    # Attempt 3 — ask Claude to fix the source given the d2 error.
    if not result["ok"]:
        sys.stderr.write(f"[DiagramD2] dagre failed ({result.get('stderr','')[:200]}); requesting fix\n")
        fix_resp = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=3000,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": body},
                {"role": "user", "content": (
                    f"D2 rejected your output:\n{result.get('stderr','')[:800]}\n\n"
                    "Return a corrected D2 source. Common fixes: balance "
                    "braces, use dot notation for child references, ensure "
                    "every `->` has both sides defined."
                )},
            ],
        )
        body = _strip_fences(fix_resp.content[0].text)
        result = _run_d2(body, output_dir, layout="elk")
        if not result["ok"]:
            return {"success": False, "error": result.get("stderr", "")[:400], "source_code": body}

    return {
        "success": True,
        "image_path": result["image_path"],
        "source_code": body,
        "engine": "d2",
        "cloud_provider": provider,
        "detail_level": detail_level,
    }


# ── CLI — identical args to diagram_engine.py ──────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--question", required=True)
    parser.add_argument("--provider", default="auto")
    parser.add_argument("--difficulty", default="medium")
    parser.add_argument("--category", default="System Design")
    parser.add_argument("--format", default="png")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--detail-level", default="overview")
    parser.add_argument("--direction", default="TB")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    if args.provider == "auto":
        q = (args.question or "").lower()
        if any(kw in q for kw in ("gcp", "google cloud", "cloud run", "gke", "bigquery", "firebase", "firestore", "spanner", "pub/sub", "pubsub", "dataflow", "bigtable")):
            provider = "gcp"
        elif any(kw in q for kw in ("azure", "aks", "cosmos", "blob storage", "service bus", "event grid", "front door", "synapse")):
            provider = "azure"
        else:
            provider = "aws"
    else:
        provider = args.provider

    try:
        result = generate_diagram(
            question=args.question, provider=provider,
            detail_level=args.detail_level, direction=args.direction,
            output_dir=args.output_dir, api_key=args.api_key,
        )
        print(json.dumps(result))
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"success": False, "error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(1)


if __name__ == "__main__":
    main()
