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


# ── Provider icon palette ──────────────────────────────────────────────────
# Maps canonical service name → icons.terrastruct.com SVG URL. The prompt
# embeds this whole map for the chosen provider so the LLM can pick from a
# CLOSED set of icons. URL hallucination is the failure mode this guards
# against — if a service isn't in the palette, the LLM falls back to a
# labeled rectangle (which still renders cleanly in D2).
#
# To grow: add an entry. The URL pattern is:
#   https://icons.terrastruct.com/<vendor>%2F<category>%2F<file>.svg
# (the %2F is a URL-encoded slash). Verify a URL in a browser before
# adding so we don't pollute the palette with 404s.
# NOTE: AWS uses hyphens in filenames, Azure uses spaces. GCP uses hyphens.
# All paths verified against icons.terrastruct.com index. To verify a new
# entry: `curl -sI <url>` should return 200, not 403. URL-encode spaces as
# %20 and `&` as %26 (and `+` as %2B in the Azure Management category).
PROVIDER_ICONS = {
    "aws": {
        "CloudFront": "https://icons.terrastruct.com/aws%2FNetworking%20%26%20Content%20Delivery%2FAmazon-CloudFront.svg",
        "Route53": "https://icons.terrastruct.com/aws%2FNetworking%20%26%20Content%20Delivery%2FAmazon-Route-53.svg",
        "API Gateway": "https://icons.terrastruct.com/aws%2FNetworking%20%26%20Content%20Delivery%2FAmazon-API-Gateway.svg",
        "ALB": "https://icons.terrastruct.com/aws%2FNetworking%20%26%20Content%20Delivery%2FElastic-Load-Balancing.svg",
        "NLB": "https://icons.terrastruct.com/aws%2FNetworking%20%26%20Content%20Delivery%2FElastic-Load-Balancing.svg",
        "WAF": "https://icons.terrastruct.com/aws%2FSecurity%2C%20Identity%2C%20%26%20Compliance%2FAWS-WAF.svg",
        "EC2": "https://icons.terrastruct.com/aws%2FCompute%2FAmazon-EC2.svg",
        "Lambda": "https://icons.terrastruct.com/aws%2FCompute%2FAWS-Lambda.svg",
        "ECS": "https://icons.terrastruct.com/aws%2FCompute%2FAmazon-Elastic-Container-Service.svg",
        "EKS": "https://icons.terrastruct.com/aws%2FCompute%2FAmazon-Elastic-Kubernetes-Service.svg",
        "Fargate": "https://icons.terrastruct.com/aws%2FCompute%2FAWS-Fargate.svg",
        "S3": "https://icons.terrastruct.com/aws%2FStorage%2FAmazon-Simple-Storage-Service-S3.svg",
        "RDS": "https://icons.terrastruct.com/aws%2FDatabase%2FAmazon-RDS.svg",
        "Aurora": "https://icons.terrastruct.com/aws%2FDatabase%2FAmazon-Aurora.svg",
        "DynamoDB": "https://icons.terrastruct.com/aws%2FDatabase%2FAmazon-DynamoDB.svg",
        "ElastiCache": "https://icons.terrastruct.com/aws%2FDatabase%2FAmazon-ElastiCache.svg",
        "Redshift": "https://icons.terrastruct.com/aws%2FAnalytics%2FAmazon-Redshift.svg",
        "Athena": "https://icons.terrastruct.com/aws%2FAnalytics%2FAmazon-Athena.svg",
        "Glue": "https://icons.terrastruct.com/aws%2FAnalytics%2FAWS-Glue.svg",
        "Kinesis": "https://icons.terrastruct.com/aws%2FAnalytics%2FAmazon-Kinesis.svg",
        "SQS": "https://icons.terrastruct.com/aws%2FApplication%20Integration%2FAmazon-Simple-Queue-Service-SQS.svg",
        "SNS": "https://icons.terrastruct.com/aws%2FApplication%20Integration%2FAmazon-Simple-Notification-Service-SNS.svg",
        "EventBridge": "https://icons.terrastruct.com/aws%2FApplication%20Integration%2FAmazon-EventBridge.svg",
        "Cognito": "https://icons.terrastruct.com/aws%2FSecurity%2C%20Identity%2C%20%26%20Compliance%2FAmazon-Cognito.svg",
        "KMS": "https://icons.terrastruct.com/aws%2FSecurity%2C%20Identity%2C%20%26%20Compliance%2FAWS-Key-Management-Service.svg",
        "CloudWatch": "https://icons.terrastruct.com/aws%2FManagement%20%26%20Governance%2FAmazon-CloudWatch.svg",
        "X-Ray": "https://icons.terrastruct.com/aws%2FDeveloper%20Tools%2FAWS-X-Ray.svg",
    },
    "gcp": {
        "Cloud Load Balancing": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FNetworking%2FCloud%20Load%20Balancing.svg",
        "Cloud CDN": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FNetworking%2FCloud%20CDN.svg",
        "Cloud DNS": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FNetworking%2FCloud%20DNS.svg",
        "Compute Engine": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FCompute%2FCompute%20Engine.svg",
        "Cloud Functions": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FCompute%2FCloud%20Functions.svg",
        "Cloud Run": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FCompute%2FCloud%20Run.svg",
        "GKE": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FCompute%2FKubetnetes%20Engine.svg",
        "Cloud Storage": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FStorage%2FCloud%20Storage.svg",
        "Cloud SQL": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FDatabases%2FCloud%20SQL.svg",
        "Cloud Spanner": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FDatabases%2FCloud%20Spanner.svg",
        "Firestore": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FDatabases%2FCloud%20Firestore.svg",
        "Bigtable": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FDatabases%2FCloud%20Bigtable.svg",
        "Memorystore": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FDatabases%2FCloud%20Memorystore.svg",
        "BigQuery": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FData%20Analytics%2FBigQuery.svg",
        "Pub/Sub": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FData%20Analytics%2FCloud%20PubSub.svg",
        "Cloud IAM": "https://icons.terrastruct.com/gcp%2FProducts%20and%20services%2FSecurity%2FCloud%20IAM.svg",
    },
    "azure": {
        "Azure Front Door": "https://icons.terrastruct.com/azure%2FNetworking%20Service%20Color%2FFront%20Doors.svg",
        "Application Gateway": "https://icons.terrastruct.com/azure%2FNetworking%20Service%20Color%2FApplication%20Gateway.svg",
        "API Management": "https://icons.terrastruct.com/azure%2FIntegration%20Service%20Color%2FAPI%20Management%20Services.svg",
        "Azure Load Balancer": "https://icons.terrastruct.com/azure%2FNetworking%20Service%20Color%2FLoad%20Balancers.svg",
        "Azure CDN": "https://icons.terrastruct.com/azure%2FNetworking%20Service%20Color%2FCDN%20Profiles.svg",
        "Azure DNS": "https://icons.terrastruct.com/azure%2FNetworking%20Service%20Color%2FDNS%20Zones.svg",
        "Azure Functions": "https://icons.terrastruct.com/azure%2FCompute%20Service%20Color%2FFunction%20Apps.svg",
        "AKS": "https://icons.terrastruct.com/azure%2FContainer%20Service%20Color%2FKubernetes%20Services.svg",
        "App Service": "https://icons.terrastruct.com/azure%2FWeb%20Service%20Color%2FApp%20Services.svg",
        "Azure Blob Storage": "https://icons.terrastruct.com/azure%2FStorage%20Service%20Color%2FBlob%20Storage.svg",
        "Azure SQL Database": "https://icons.terrastruct.com/azure%2FDatabases%20Service%20Color%2FSQL%20Databases.svg",
        "Cosmos DB": "https://icons.terrastruct.com/azure%2FDatabases%20Service%20Color%2FAzure%20Cosmos%20DB.svg",
        "Azure Cache for Redis": "https://icons.terrastruct.com/azure%2FDatabases%20Service%20Color%2FAzure%20Cache%20for%20Redis.svg",
        "Service Bus": "https://icons.terrastruct.com/azure%2FIntegration%20Service%20Color%2FAzure%20Service%20Bus.svg",
        "Event Grid": "https://icons.terrastruct.com/azure%2FIntegration%20Service%20Color%2FEvent%20Grid%20Topics.svg",
        "Event Hubs": "https://icons.terrastruct.com/azure%2FAnalytics%20Service%20Color%2FEvent%20Hubs.svg",
        "Azure AD / Entra": "https://icons.terrastruct.com/azure%2FIdentity%20Service%20Color%2FActive%20Directory.svg",
        "Key Vault": "https://icons.terrastruct.com/azure%2FSecurity%20Service%20Color%2FKey%20Vaults.svg",
        "Azure Monitor": "https://icons.terrastruct.com/azure%2FManagement%20and%20Governance%20Service%20Color%2FMonitor.svg",
        "Application Insights": "https://icons.terrastruct.com/azure%2FDevOps%20Service%20Color%2FApplication%20Insights.svg",
    },
}


def _palette_block(provider: str) -> str:
    """Render the icon palette for the prompt — one service per line."""
    icons = PROVIDER_ICONS.get(provider, PROVIDER_ICONS["aws"])
    lines = [f'  "{name}" -> icon: {url}' for name, url in icons.items()]
    return "\n".join(lines)


# ── Prompt construction ────────────────────────────────────────────────────
def get_prompt(question: str, provider: str, detail_level: str, direction: str) -> str:
    icons_palette = _palette_block(provider)
    service_names = ", ".join(PROVIDER_ICONS.get(provider, PROVIDER_ICONS["aws"]).keys())

    if detail_level == "overview":
        scope = (
            "OVERVIEW MODE — 7 to 10 nodes in 3 logical groups (Edge, "
            "Application, Data). ONE primary request flow only. "
            "Connection discipline: each node has at most 2-3 outgoing "
            "edges. NO crossing connections — restructure clusters or "
            "drop the less-essential edge if any two would cross. "
            "NO async, NO observability, NO replicas in overview. Keep "
            "the spine: client → edge → app → data and back. Goal: 30s "
            "scannable, not an architecture audit."
        )
    else:
        scope = (
            "DETAILED MODE — 12 to 16 nodes in 4 to 5 logical groups "
            "(Edge & Security, Application Tier, Data Tier, Async "
            "Processing if relevant, Observability if relevant). "
            "Connection discipline: each node 2-4 edges max, NO mesh / "
            "NO fully-connected clusters. The async path reaches in "
            "ONCE — pick the single app service that publishes and "
            "draw one edge. Group replicas as 'DB Cluster' single node. "
            "NO nested sub-clusters."
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
{service_names}

{scope}

LAYOUT DIRECTION: {direction.upper()} ({direction_word}-flowing).
The first line of the body MUST be:
  direction: {direction_word}

ICON PALETTE — MANDATORY for every service node whose label matches an
entry in this list. Without icons the diagram is just labeled
rectangles; with them it's a real architecture sketch. Treat the
`icon:` directive as REQUIRED, not optional. Copy the URL verbatim —
do not modify, do not URL-decode, do not invent new URLs.

{icons_palette}

REQUIREMENTS:
1. Every node whose label appears in the palette above MUST include
   the matching `icon:` directive. If the diagram has 7 service
   nodes and 5 of them match palette entries, 5 of them MUST carry
   icons. NO EXCEPTIONS.
2. If a service is not in the palette (e.g. "Counter Service",
   "Custom Worker"), omit the icon directive — D2 renders a labeled
   rectangle and that's fine.
3. NEVER fabricate icons.terrastruct.com URLs — only use URLs from
   the palette above.

OUTPUT — D2 SOURCE ONLY. No prose, no markdown fences. Example shape:

  direction: right

  users: Clients {{
    shape: person
  }}

  edge: Edge & CDN {{
    style.fill: "#dbeafe"
    style.stroke: "#2563eb"
    cdn: CloudFront {{
      icon: https://icons.terrastruct.com/aws%2FNetworking%20%26%20Content%20Delivery%2FAmazon-CloudFront.svg
    }}
    dns: Route53 {{
      icon: https://icons.terrastruct.com/aws%2FNetworking%20%26%20Content%20Delivery%2FAmazon-Route-53.svg
    }}
  }}

  app: Application {{
    style.fill: "#dcfce7"
    style.stroke: "#16a34a"
    api: API Gateway {{
      icon: https://icons.terrastruct.com/aws%2FNetworking%20%26%20Content%20Delivery%2FAmazon-API-Gateway.svg
    }}
    svc: Lambda {{
      icon: https://icons.terrastruct.com/aws%2FCompute%2FAWS-Lambda.svg
    }}
  }}

  data: Data Stores {{
    style.fill: "#fef3c7"
    style.stroke: "#d97706"
    cache: ElastiCache {{
      icon: https://icons.terrastruct.com/aws%2FDatabase%2FAmazon-ElastiCache.svg
    }}
    db: DynamoDB {{
      icon: https://icons.terrastruct.com/aws%2FDatabase%2FAmazon-DynamoDB.svg
    }}
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
  monitoring:    #9ca3af (gray, dotted via style.stroke-dash: 3)

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
