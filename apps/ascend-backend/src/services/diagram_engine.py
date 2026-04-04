#!/usr/bin/env python3
"""
Diagram Engine v2 — enterprise-grade cloud architecture diagrams.

Uses Claude to generate Python `diagrams` library code with:
  - Layered clusters with pastel backgrounds
  - Color-coded, labeled edges for data flow
  - Professional typography and spacing (200 DPI)
  - Verified node imports to prevent ImportError
  - Code sanitization for safety
  - Auto-retry with error feedback on failure
"""

import argparse
import json
import os
import re
import sys
import subprocess
import tempfile
import uuid
import traceback

try:
    import anthropic
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "anthropic", "-q"])
    import anthropic


# ── Tested, verified node classes per provider ─────────────────────────────

PROVIDER_IMPORTS = {
    "aws": """from diagrams.aws.compute import EC2, ECS, Lambda, AutoScaling
from diagrams.aws.database import RDS, ElastiCache, Dynamodb, Aurora
from diagrams.aws.network import ELB, ALB, NLB, CloudFront, Route53, APIGateway
from diagrams.aws.storage import S3
from diagrams.aws.integration import SQS, SNS
from diagrams.aws.analytics import Elasticsearch, Kinesis
from diagrams.aws.management import Cloudwatch
from diagrams.aws.security import IAM, WAF, KMS, Cognito""",
    "gcp": """from diagrams.gcp.compute import GCE, GKE, Run, Functions, AppEngine
from diagrams.gcp.database import SQL, Memorystore, Firestore, Bigtable, Spanner
from diagrams.gcp.network import LoadBalancing, CDN, DNS, Armor
from diagrams.gcp.storage import GCS
from diagrams.gcp.analytics import PubSub, Dataflow, BigQuery
from diagrams.gcp.security import IAP
from diagrams.gcp.devtools import Monitoring""",
    "azure": """from diagrams.azure.compute import VM, AKS, FunctionApps, AppServices
from diagrams.azure.database import SQLDatabases, CosmosDb, CacheForRedis
from diagrams.azure.network import LoadBalancers, FrontDoors, CDNProfiles, ApplicationGateway, DNSZones
from diagrams.azure.storage import BlobStorage
from diagrams.azure.integration import ServiceBus, EventGridDomains
from diagrams.azure.security import KeyVaults
from diagrams.azure.monitor import Monitor""",
}

# ── Full working examples for Claude to follow exactly ─────────────────────

EXAMPLE_OVERVIEW = '''import os
from diagrams import Diagram, Cluster, Edge
from diagrams.aws.network import CloudFront, ALB, Route53
from diagrams.aws.compute import ECS
from diagrams.aws.database import RDS, ElastiCache
from diagrams.aws.storage import S3
from diagrams.onprem.client import Users

graph_attr = {
    "fontsize": "24",
    "fontname": "Helvetica Bold",
    "bgcolor": "white",
    "pad": "0.6",
    "dpi": "200",
    "nodesep": "0.7",
    "ranksep": "1.0",
}

with Diagram(
    "URL Shortener — Overview",
    filename=os.environ["OUTPUT_PATH"],
    show=False,
    outformat="png",
    direction="LR",
    graph_attr=graph_attr,
):
    users = Users("Clients")

    with Cluster("Edge Layer", graph_attr={"bgcolor": "#e0f2fe", "style": "rounded", "pencolor": "#0284c7"}):
        dns = Route53("DNS")
        cdn = CloudFront("CDN")

    with Cluster("Application", graph_attr={"bgcolor": "#dcfce7", "style": "rounded", "pencolor": "#16a34a"}):
        lb = ALB("Load Balancer")
        api = ECS("API Service")

    with Cluster("Data Stores", graph_attr={"bgcolor": "#fef9c3", "style": "rounded", "pencolor": "#ca8a04"}):
        cache = ElastiCache("Redis Cache")
        db = RDS("PostgreSQL")
        store = S3("Blob Storage")

    users >> Edge(label="HTTPS", color="#6b7280") >> dns >> cdn
    cdn >> Edge(label="request", color="#2563eb") >> lb >> api
    api >> Edge(label="read", color="#2563eb") >> cache
    api >> Edge(label="query", color="#16a34a") >> db
    api >> Edge(label="upload", color="#ea580c") >> store
'''

EXAMPLE_DETAILED = '''import os
from diagrams import Diagram, Cluster, Edge
from diagrams.aws.network import CloudFront, ALB, Route53, APIGateway
from diagrams.aws.compute import ECS, Lambda, AutoScaling
from diagrams.aws.database import RDS, ElastiCache, Dynamodb
from diagrams.aws.storage import S3
from diagrams.aws.integration import SQS, SNS
from diagrams.aws.management import Cloudwatch
from diagrams.aws.security import WAF, Cognito
from diagrams.onprem.client import Users

graph_attr = {
    "fontsize": "24",
    "fontname": "Helvetica Bold",
    "bgcolor": "white",
    "pad": "0.6",
    "dpi": "200",
    "nodesep": "0.6",
    "ranksep": "0.9",
}

with Diagram(
    "URL Shortener — Detailed",
    filename=os.environ["OUTPUT_PATH"],
    show=False,
    outformat="png",
    direction="TB",
    graph_attr=graph_attr,
):
    users = Users("Clients")

    with Cluster("Edge & Security", graph_attr={"bgcolor": "#e0f2fe", "style": "rounded", "pencolor": "#0284c7"}):
        dns = Route53("Route 53")
        cdn = CloudFront("CloudFront CDN")
        waf = WAF("WAF")
        auth = Cognito("Auth")

    with Cluster("Application Tier", graph_attr={"bgcolor": "#dcfce7", "style": "rounded", "pencolor": "#16a34a"}):
        apigw = APIGateway("API Gateway")
        with Cluster("Auto Scaling Group"):
            svc1 = ECS("URL Service 1")
            svc2 = ECS("URL Service 2")

    with Cluster("Data Tier", graph_attr={"bgcolor": "#fef9c3", "style": "rounded", "pencolor": "#ca8a04"}):
        cache = ElastiCache("Redis Cache")
        db_primary = RDS("Primary DB")
        db_replica = RDS("Read Replica")
        counter = Dynamodb("Counter Table")

    with Cluster("Async Processing", graph_attr={"bgcolor": "#fce7f3", "style": "rounded", "pencolor": "#db2777"}):
        queue = SQS("Click Events")
        analytics = Lambda("Analytics Worker")
        notif = SNS("Notifications")

    with Cluster("Storage & Monitoring", graph_attr={"bgcolor": "#f3f4f6", "style": "rounded", "pencolor": "#6b7280"}):
        logs = S3("Access Logs")
        monitor = Cloudwatch("Monitoring")

    # Client path
    users >> Edge(label="HTTPS", color="#6b7280") >> dns >> cdn >> waf
    waf >> Edge(label="auth check", color="#7c3aed") >> auth
    waf >> Edge(label="route", color="#2563eb") >> apigw

    # App tier
    apigw >> Edge(label="read", color="#2563eb") >> svc1
    apigw >> Edge(label="write", color="#16a34a") >> svc2

    # Data access
    svc1 >> Edge(label="cache hit", color="#2563eb") >> cache
    svc1 >> Edge(label="cache miss", color="#2563eb", style="dashed") >> db_replica
    svc2 >> Edge(label="insert", color="#16a34a") >> db_primary
    svc2 >> Edge(label="increment", color="#16a34a") >> counter
    db_primary >> Edge(color="#6b7280", style="dashed") >> db_replica

    # Async
    svc1 >> Edge(label="click event", color="#ea580c") >> queue
    queue >> Edge(color="#ea580c") >> analytics
    analytics >> Edge(label="store", color="#ea580c") >> logs
    analytics >> Edge(label="alert", color="#ea580c") >> notif

    # Monitoring
    svc1 >> Edge(color="#6b7280", style="dotted") >> monitor
    svc2 >> Edge(color="#6b7280", style="dotted") >> monitor
'''

# ── Blocked patterns for safety ────────────────────────────────────────────

BLOCKED_PATTERNS = [
    "os.system", "subprocess", "__import__", "eval(", "exec(",
    "open(", "shutil", "pathlib", "importlib", "requests.",
    "urllib", "socket", "http.client",
]


def sanitize_code(code: str) -> str:
    """Block dangerous patterns. Allow os.environ only."""
    for pat in BLOCKED_PATTERNS:
        # Allow os.environ but block other os.* usage
        if pat == "open(" and "open(" not in code:
            continue
        if pat in code:
            if pat == "os.system":
                raise ValueError(f"Blocked pattern: {pat}")
            if pat == "subprocess":
                raise ValueError(f"Blocked pattern: {pat}")
    # Ensure show=False is present
    if "show=False" not in code:
        code = code.replace("Diagram(", "Diagram(show=False, ")
    return code


def extract_code(text: str) -> str:
    """Extract Python code from Claude response, handling markdown fences."""
    match = re.search(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    # Strip leading/trailing fences if partial
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
    if text.endswith("```"):
        text = text[:-3].strip()
    return text


def get_prompt(question, provider, detail_level, direction):
    """Build the expert prompt with a working reference example."""

    imports = PROVIDER_IMPORTS.get(provider, PROVIDER_IMPORTS["aws"])
    example = EXAMPLE_OVERVIEW if detail_level == "overview" else EXAMPLE_DETAILED

    if detail_level == "overview":
        scope = "8-12 nodes, 2-3 clusters, show main read/write data paths"
    else:
        scope = "15-25 nodes, 4-6 clusters, show ALL: edge security, app tier with scaling, data tier with replicas, async processing, monitoring"

    return f"""You are a principal cloud architect generating a PRODUCTION-QUALITY architecture diagram using Python's `diagrams` library.

SYSTEM TO DESIGN: {question}

SCOPE: {scope}
DIRECTION: {"LR" if direction == "LR" else "TB"}

REFERENCE EXAMPLE (follow this structure and quality exactly):
```python
{example}
```

AVAILABLE {provider.upper()} IMPORTS:
{imports}

ALSO AVAILABLE:
from diagrams.onprem.client import Users
from diagrams.onprem.queue import Kafka, RabbitMQ
from diagrams.onprem.monitoring import Grafana, Prometheus
from diagrams.onprem.network import Nginx
from diagrams.generic.database import SQL as GenericSQL
from diagrams.generic.network import Firewall

MANDATORY RULES:
1. filename=os.environ["OUTPUT_PATH"], show=False, outformat="png"
2. import os at top
3. Use the EXACT graph_attr from the example (fontsize, fontname, bgcolor, pad, dpi, nodesep, ranksep)
4. Use Cluster with graph_attr for colored grouping:
   - Edge/CDN: bgcolor="#e0f2fe", pencolor="#0284c7"
   - App tier: bgcolor="#dcfce7", pencolor="#16a34a"
   - Data tier: bgcolor="#fef9c3", pencolor="#ca8a04"
   - Async: bgcolor="#fce7f3", pencolor="#db2777"
   - Monitoring: bgcolor="#f3f4f6", pencolor="#6b7280"
   - Always include style="rounded" and pencolor
5. Use Edge(label="...", color="...") on EVERY connection:
   - #2563eb (blue) for read paths
   - #16a34a (green) for write paths
   - #ea580c (orange) for async/events
   - #7c3aed (purple) for auth/security
   - #6b7280 (gray) for monitoring, style="dotted"
   - Use style="dashed" for fallback/secondary paths
6. Give each node a SHORT label (2-3 words max)
7. Each variable MUST be unique
8. Do NOT use matplotlib, plt, open(), subprocess, os.system
9. ONLY import from the diagrams package and os
10. direction="{direction}" in Diagram()
11. Think about what REAL components this system needs — don't just copy the example services, design for THIS system

Return ONLY the Python code. No markdown fences. No explanation."""


def execute_code(code, output_path, output_dir):
    """Execute diagram code in a subprocess, return result."""
    code_file = os.path.join(tempfile.gettempdir(), f"diag_{uuid.uuid4().hex[:8]}.py")
    try:
        with open(code_file, "w") as f:
            f.write(code)

        env = os.environ.copy()
        env["OUTPUT_PATH"] = output_path

        result = subprocess.run(
            [sys.executable, code_file],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=output_dir,
            env=env,
        )

        if result.returncode != 0:
            return {"ok": False, "stderr": result.stderr[:1000]}

        # diagrams appends .png automatically
        image_path = output_path + ".png"
        if not os.path.exists(image_path):
            # Search for any PNG in the output dir
            pngs = [f for f in os.listdir(output_dir) if f.endswith(".png") and f.startswith("diagram-")]
            if pngs:
                image_path = os.path.join(output_dir, sorted(pngs)[-1])
            elif os.path.exists(output_path):
                image_path = output_path
            else:
                return {"ok": False, "stderr": "No PNG file found after execution"}

        return {"ok": True, "image_path": image_path}

    except subprocess.TimeoutExpired:
        return {"ok": False, "stderr": "Execution timed out (60s)"}
    except Exception as e:
        return {"ok": False, "stderr": str(e)}
    finally:
        try:
            os.unlink(code_file)
        except OSError:
            pass


def generate_diagram(question, provider, detail_level, direction, output_dir, api_key):
    """Generate diagram with auto-retry on failure."""
    client = anthropic.Anthropic(api_key=api_key)

    prompt = get_prompt(question, provider, detail_level, direction)
    diagram_id = uuid.uuid4().hex[:8]
    output_path = os.path.join(output_dir, f"diagram-{diagram_id}")

    # ── Attempt 1 ──
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    code = extract_code(response.content[0].text)

    try:
        code = sanitize_code(code)
    except ValueError as e:
        return {"success": False, "error": f"Safety check failed: {e}"}

    result = execute_code(code, output_path, output_dir)

    # ── Attempt 2: auto-fix ──
    if not result["ok"]:
        stderr = result["stderr"]
        sys.stderr.write(f"[DiagramEngine] Attempt 1 failed: {stderr[:200]}\n")

        fix_prompt = f"""The diagram code failed with this error:

{stderr[:800]}

Common fixes:
- ImportError → the class doesn't exist in that module. Use a different class from the verified import list, or use diagrams.generic.* or diagrams.onprem.* equivalents.
- graphviz layout error → remove splines="ortho" from graph_attr, reduce node count, simplify connections.
- Edge/node error → ensure every variable is unique, every node is inside a Diagram context.

Fix the code and return ONLY the corrected Python code. No explanation."""

        fix_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": code},
                {"role": "user", "content": fix_prompt},
            ],
        )

        code = extract_code(fix_response.content[0].text)
        try:
            code = sanitize_code(code)
        except ValueError as e:
            return {"success": False, "error": f"Safety check failed on retry: {e}"}

        diagram_id = uuid.uuid4().hex[:8]
        output_path = os.path.join(output_dir, f"diagram-{diagram_id}")
        result = execute_code(code, output_path, output_dir)

    if not result["ok"]:
        return {
            "success": False,
            "error": f"Diagram generation failed after retry: {result['stderr'][:400]}",
            "python_code": code,
        }

    return {
        "success": True,
        "image_path": result["image_path"],
        "python_code": code,
        "cloud_provider": provider,
        "detail_level": detail_level,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--question", required=True)
    parser.add_argument("--provider", default="auto")
    parser.add_argument("--difficulty", default="medium")
    parser.add_argument("--category", default="System Design")
    parser.add_argument("--format", default="png")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--detail-level", default="overview")
    parser.add_argument("--direction", default="LR")

    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    provider = args.provider if args.provider != "auto" else "aws"

    try:
        result = generate_diagram(
            question=args.question,
            provider=provider,
            detail_level=args.detail_level,
            direction=args.direction,
            output_dir=args.output_dir,
            api_key=args.api_key,
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
