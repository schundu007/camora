#!/usr/bin/env python3
"""
Diagram Engine v4 — hardcoded styling, Claude only generates body.

Key insight: Claude doesn't reliably follow styling instructions.
Solution: We hardcode ALL styling (graph_attr, node_attr, edge_attr,
Diagram constructor) in a template, and only ask Claude to generate
the nodes, clusters, and connections.

Output: 300 DPI PNG with spline arrows, colored edges, pastel clusters.
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


# ── Verified imports per provider ──────────────────────────────────────────

PROVIDER_IMPORTS = {
    "aws": {
        "compute": ["EC2", "ECS", "Lambda", "AutoScaling"],
        "database": ["RDS", "ElastiCache", "Dynamodb", "Aurora"],
        "network": ["ELB", "ALB", "NLB", "CloudFront", "Route53", "APIGateway"],
        "storage": ["S3"],
        "integration": ["SQS", "SNS"],
        "analytics": ["Elasticsearch", "Kinesis"],
        "management": ["Cloudwatch"],
        "security": ["IAM", "WAF", "KMS", "Cognito"],
    },
    "gcp": {
        "compute": ["GCE", "GKE", "Run", "Functions", "AppEngine"],
        "database": ["SQL", "Memorystore", "Firestore", "Bigtable", "Spanner"],
        "network": ["LoadBalancing", "CDN", "DNS", "Armor"],
        "storage": ["GCS"],
        "analytics": ["PubSub", "Dataflow", "BigQuery"],
        "security": ["IAP"],
        "operations": ["Monitoring"],
    },
    "azure": {
        "compute": ["VM", "AKS", "FunctionApps", "AppServices"],
        "database": ["SQLDatabases", "CosmosDb", "CacheForRedis"],
        "network": ["LoadBalancers", "FrontDoors", "CDNProfiles", "ApplicationGateway", "DNSZones"],
        "storage": ["BlobStorage"],
        "integration": ["ServiceBus", "EventGridDomains"],
        "security": ["KeyVaults"],
        "monitor": ["Monitor"],
    },
}

# ── Template: Claude fills ONLY the {{BODY}} ───────────────────────────────

TEMPLATE = '''import os
from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.client import Users
{{IMPORTS}}
graph_attr = {
    "fontsize": "20",
    "fontname": "Helvetica Bold",
    "bgcolor": "white",
    "pad": "0.3",
    "dpi": "150",
    "nodesep": "0.8",
    "ranksep": "1.0",
    "splines": "spline",
    "size": "16,10!",
    "ratio": "compress",
}

node_attr = {
    "fontsize": "11",
    "fontname": "Helvetica",
    "imagepos": "tc",
}

edge_attr = {
    "fontsize": "10",
    "fontname": "Helvetica",
    "penwidth": "2.0",
    "arrowsize": "0.8",
}

with Diagram(
    "",
    filename=os.environ["OUTPUT_PATH"],
    show=False,
    outformat="png",
    direction="{{DIRECTION}}",
    graph_attr=graph_attr,
    node_attr=node_attr,
    edge_attr=edge_attr,
):
{{BODY}}
'''

# ── Cluster color presets ──────────────────────────────────────────────────

CLUSTER_COLORS = {
    "edge":    '{"bgcolor": "#dbeafe", "style": "rounded", "pencolor": "#2563eb", "penwidth": "2.5", "fontsize": "13", "fontname": "Helvetica Bold"}',
    "app":     '{"bgcolor": "#dcfce7", "style": "rounded", "pencolor": "#16a34a", "penwidth": "2.5", "fontsize": "13", "fontname": "Helvetica Bold"}',
    "data":    '{"bgcolor": "#fef3c7", "style": "rounded", "pencolor": "#d97706", "penwidth": "2.5", "fontsize": "13", "fontname": "Helvetica Bold"}',
    "async":   '{"bgcolor": "#fce7f3", "style": "rounded", "pencolor": "#db2777", "penwidth": "2.5", "fontsize": "13", "fontname": "Helvetica Bold"}',
    "monitor": '{"bgcolor": "#f3f4f6", "style": "rounded", "pencolor": "#6b7280", "penwidth": "2.5", "fontsize": "13", "fontname": "Helvetica Bold"}',
    "sub":     '{"bgcolor": "#f0fdf4", "style": "dashed", "pencolor": "#22c55e", "penwidth": "1.5", "fontsize": "11", "fontname": "Helvetica"}',
}

# ── Edge color presets ─────────────────────────────────────────────────────

EDGE_COLORS = """
EDGE COLORS (you MUST use these):
  Read/request path:  Edge(label="...", color="#2563eb", penwidth="2.0")
  Write/insert path:  Edge(label="...", color="#16a34a", penwidth="2.0")
  Async/event path:   Edge(label="...", color="#ea580c", penwidth="2.0")
  Auth/security path: Edge(label="...", color="#7c3aed", penwidth="2.0")
  Monitoring/logs:    Edge(label="...", color="#9ca3af", style="dotted", penwidth="1.5")
  Secondary/fallback: Edge(label="...", color="#2563eb", style="dashed", penwidth="1.5")
  Replication:        Edge(label="...", color="#6b7280", style="dashed", penwidth="1.5")
"""


def build_import_list(provider):
    """Build a human-readable list of available classes (for the prompt, not code)."""
    modules = PROVIDER_IMPORTS.get(provider, PROVIDER_IMPORTS["aws"])
    prefix = f"diagrams.{provider}"
    lines = []
    for module, classes in modules.items():
        lines.append(f"  from {prefix}.{module} import {', '.join(classes)}")
    lines.append("  from diagrams.onprem.client import Users")
    lines.append("  from diagrams.onprem.queue import Kafka, RabbitMQ")
    lines.append("  from diagrams.onprem.monitoring import Grafana, Prometheus")
    lines.append("  from diagrams.onprem.network import Nginx")
    return "\n".join(lines)


def get_prompt(question, provider, detail_level, direction):
    """Ask Claude to generate imports + body (no Diagram/graph_attr — those are hardcoded)."""

    available = build_import_list(provider)

    if detail_level == "overview":
        scope = """OVERVIEW MODE: Generate 8-12 nodes in 3 clusters.
Clusters: "Edge & CDN", "Application", "Data Stores"
Show the main request flow from clients to data and back."""
    else:
        scope = """DETAILED MODE: Generate 15-25 nodes in 5-6 clusters.
Clusters: "Edge & Security", "Application Tier" (with nested "Auto Scaling" sub-cluster), "Data Tier", "Async Processing", "Observability"
Show: CDN, WAF, auth, API gateway, multiple app instances, cache, primary DB + replica, message queue, workers, log storage, monitoring."""

    return f"""Generate Python code for a cloud architecture diagram using the `diagrams` library.

SYSTEM: {question}
{scope}

I will wrap your output inside a template that already has:
- `import os`, `from diagrams import Diagram, Cluster, Edge`
- Diagram() constructor with graph_attr (300 DPI, spline arrows, white bg)
- node_attr and edge_attr already set

YOUR OUTPUT must have TWO parts:

PART 1 — IMPORTS: Only import the specific node classes you actually use. Pick from:
{available}

PART 2 — BODY: The indented code (4 spaces) that goes inside `with Diagram(...):`

CLUSTER graph_attr PRESETS — copy exactly:
  Edge/CDN cluster:   graph_attr={CLUSTER_COLORS["edge"]}
  Application cluster: graph_attr={CLUSTER_COLORS["app"]}
  Data cluster:        graph_attr={CLUSTER_COLORS["data"]}
  Async cluster:       graph_attr={CLUSTER_COLORS["async"]}
  Monitoring cluster:  graph_attr={CLUSTER_COLORS["monitor"]}
  Sub-cluster (nested): graph_attr={CLUSTER_COLORS["sub"]}

{EDGE_COLORS}

RULES:
1. Start body with: users = Users("Clients")
2. Short labels (2-3 words): "Redis Cache", "Primary DB", "API Gateway"
3. EVERY connection MUST use Edge(label="...", color="...", penwidth="2.0")
4. NEVER chain: WRONG: a >> Edge() >> b >> c. RIGHT: a >> Edge() >> b (newline) b >> Edge() >> c
5. Each variable name must be unique
6. Only import classes you actually use — don't import everything
7. Do NOT include `import os`, `from diagrams import Diagram, Cluster, Edge`, or the Diagram() call — I add those
8. Design REAL components for THIS system

EXAMPLE OUTPUT:
from diagrams.aws.network import CloudFront, ALB, Route53
from diagrams.aws.compute import ECS
from diagrams.aws.database import RDS, ElastiCache
from diagrams.aws.storage import S3
from diagrams.onprem.client import Users

    users = Users("Clients")

    with Cluster("Edge & CDN", graph_attr={CLUSTER_COLORS["edge"]}):
        dns = Route53("DNS")
        cdn = CloudFront("CDN")

    with Cluster("Application", graph_attr={CLUSTER_COLORS["app"]}):
        lb = ALB("Load Balancer")
        api = ECS("API Server")

    with Cluster("Data Stores", graph_attr={CLUSTER_COLORS["data"]}):
        cache = ElastiCache("Redis Cache")
        db = RDS("PostgreSQL")
        store = S3("File Storage")

    users >> Edge(label="HTTPS", color="#2563eb", penwidth="2.0") >> dns
    dns >> Edge(color="#2563eb", penwidth="2.0") >> cdn
    cdn >> Edge(label="route", color="#2563eb", penwidth="2.0") >> lb
    lb >> Edge(color="#2563eb", penwidth="2.0") >> api
    api >> Edge(label="cache read", color="#2563eb", penwidth="2.0") >> cache
    api >> Edge(label="write", color="#16a34a", penwidth="2.0") >> db
    api >> Edge(label="upload", color="#ea580c", penwidth="2.0") >> store

NOW generate for: {question}
Return ONLY the Python code (imports + indented body). No explanation. No markdown fences."""


def extract_code(text):
    """Extract code, strip markdown fences."""
    match = re.search(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
    if text.endswith("```"):
        text = text[:-3].strip()
    return text


def _build_class_to_import(provider):
    """Build a map of ClassName -> full import line for auto-fixing missing imports."""
    mapping = {}
    modules = PROVIDER_IMPORTS.get(provider, PROVIDER_IMPORTS["aws"])
    prefix = f"diagrams.{provider}"
    for module, classes in modules.items():
        for cls in classes:
            mapping[cls] = f"from {prefix}.{module} import {cls}"
    # Add common onprem classes
    mapping["Kafka"] = "from diagrams.onprem.queue import Kafka"
    mapping["RabbitMQ"] = "from diagrams.onprem.queue import RabbitMQ"
    mapping["Grafana"] = "from diagrams.onprem.monitoring import Grafana"
    mapping["Prometheus"] = "from diagrams.onprem.monitoring import Prometheus"
    mapping["Nginx"] = "from diagrams.onprem.network import Nginx"
    mapping["Redis"] = "from diagrams.onprem.inmemory import Redis"
    mapping["PostgreSQL"] = "from diagrams.onprem.database import PostgreSQL"
    mapping["MySQL"] = "from diagrams.onprem.database import MySQL"
    mapping["MongoDB"] = "from diagrams.onprem.database import MongoDB"
    return mapping


def assemble_code(raw_output, provider, direction):
    """Split Claude's output into imports + body, wrap in template."""
    lines = raw_output.split("\n")
    imports = []
    body_lines = []
    in_body = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_body:
                body_lines.append("")
            continue
        # Import lines: start with "from" or "import", anywhere in the output
        if stripped.startswith("from diagrams") or stripped.startswith("import diagrams"):
            # Skip base imports we already have in template
            if "from diagrams import Diagram" in stripped:
                continue
            if stripped == "import os":
                continue
            if "from diagrams.onprem.client import Users" in stripped:
                continue
            imports.append(stripped)
            # Don't set in_body — imports can appear after body lines in Claude's output
        elif stripped.startswith("import "):
            continue  # Skip any other imports
        else:
            in_body = True
            # Ensure 4-space indent
            if not line.startswith("    "):
                body_lines.append("    " + stripped)
            else:
                body_lines.append(line)

    # Auto-detect missing imports: scan body for class names that aren't imported
    class_map = _build_class_to_import(provider)
    imported_classes = set()
    for imp in imports:
        # Extract class names from "from x.y import A, B, C"
        match = re.search(r'import\s+(.+)$', imp)
        if match:
            for cls in match.group(1).split(','):
                imported_classes.add(cls.strip())

    body_text = "\n".join(body_lines)
    for cls_name, import_line in class_map.items():
        # Check if class is used in body but not imported
        if re.search(rf'\b{cls_name}\s*\(', body_text) and cls_name not in imported_classes:
            imports.append(import_line)
            imported_classes.add(cls_name)

    # Deduplicate and merge imports from the same module
    import_block = "\n".join(sorted(set(imports)))
    body_block = "\n".join(body_lines)

    code = TEMPLATE.replace("{{IMPORTS}}", import_block)
    code = code.replace("{{DIRECTION}}", direction)
    code = code.replace("{{BODY}}", body_block)
    return code


BLOCKED = ["os.system", "__import__", "eval(", "exec(", "shutil", "importlib",
           "requests.", "urllib", "socket", "http.client"]


def sanitize(code):
    for pat in BLOCKED:
        if pat in code:
            raise ValueError(f"Blocked: {pat}")
    return code


def execute_code(code, output_path, output_dir):
    code_file = os.path.join(tempfile.gettempdir(), f"diag_{uuid.uuid4().hex[:8]}.py")
    try:
        with open(code_file, "w") as f:
            f.write(code)
        env = os.environ.copy()
        env["OUTPUT_PATH"] = output_path
        result = subprocess.run(
            [sys.executable, code_file],
            capture_output=True, text=True, timeout=60,
            cwd=output_dir, env=env,
        )
        if result.returncode != 0:
            return {"ok": False, "stderr": result.stderr[:1200]}

        image_path = output_path + ".png"
        if not os.path.exists(image_path):
            pngs = [f for f in os.listdir(output_dir) if f.endswith(".png") and "diagram-" in f]
            if pngs:
                image_path = os.path.join(output_dir, sorted(pngs)[-1])
            elif os.path.exists(output_path):
                image_path = output_path
            else:
                return {"ok": False, "stderr": "No PNG produced"}
        return {"ok": True, "image_path": image_path}
    except subprocess.TimeoutExpired:
        return {"ok": False, "stderr": "Timed out (60s)"}
    except Exception as e:
        return {"ok": False, "stderr": str(e)}
    finally:
        try:
            os.unlink(code_file)
        except OSError:
            pass


def generate_diagram(question, provider, detail_level, direction, output_dir, api_key):
    client = anthropic.Anthropic(api_key=api_key)
    prompt = get_prompt(question, provider, detail_level, direction)

    diagram_id = uuid.uuid4().hex[:8]
    output_path = os.path.join(output_dir, f"diagram-{diagram_id}")

    # Attempt 1
    resp = client.messages.create(
        model="claude-sonnet-4-20250514", max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    body = extract_code(resp.content[0].text)
    full_code = assemble_code(body, provider, direction)
    try:
        full_code = sanitize(full_code)
    except ValueError as e:
        return {"success": False, "error": str(e)}

    result = execute_code(full_code, output_path, output_dir)

    # Attempt 2 — fix
    if not result["ok"]:
        sys.stderr.write(f"[DiagramEngine] Attempt 1 failed: {result['stderr'][:200]}\n")

        fix_resp = client.messages.create(
            model="claude-sonnet-4-20250514", max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": body},
                {"role": "user", "content": f"ERROR:\n{result['stderr'][:800]}\n\nFix the body code. If ImportError, use a different class or diagrams.onprem/generic equivalent. Return ONLY the fixed body code (indented, no imports, no Diagram)."},
            ],
        )
        body = extract_code(fix_resp.content[0].text)
        full_code = assemble_code(body, provider, direction)
        try:
            full_code = sanitize(full_code)
        except ValueError as e:
            return {"success": False, "error": str(e)}

        diagram_id = uuid.uuid4().hex[:8]
        output_path = os.path.join(output_dir, f"diagram-{diagram_id}")
        result = execute_code(full_code, output_path, output_dir)

    if not result["ok"]:
        return {"success": False, "error": result["stderr"][:400], "python_code": full_code}

    return {
        "success": True,
        "image_path": result["image_path"],
        "python_code": full_code,
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
            question=args.question, provider=provider,
            detail_level=args.detail_level, direction=args.direction,
            output_dir=args.output_dir, api_key=args.api_key,
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(1)

if __name__ == "__main__":
    main()
