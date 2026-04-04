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
        "devtools": ["Monitoring"],
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
{{IMPORTS}}

graph_attr = {
    "fontsize": "20",
    "fontname": "Helvetica Bold",
    "bgcolor": "white",
    "pad": "0.3",
    "dpi": "300",
    "nodesep": "1.0",
    "ranksep": "1.2",
    "splines": "spline",
    "size": "24,14!",
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


def build_import_lines(provider):
    """Build import statements for the given provider."""
    modules = PROVIDER_IMPORTS.get(provider, PROVIDER_IMPORTS["aws"])
    prefix = f"diagrams.{provider}"
    lines = []
    for module, classes in modules.items():
        lines.append(f"from {prefix}.{module} import {', '.join(classes)}")
    # Always include generic/onprem nodes
    lines.append("from diagrams.onprem.client import Users")
    lines.append("from diagrams.onprem.queue import Kafka, RabbitMQ")
    lines.append("from diagrams.onprem.monitoring import Grafana, Prometheus")
    lines.append("from diagrams.onprem.network import Nginx")
    return "\n".join(lines)


def get_prompt(question, provider, detail_level, direction):
    """Ask Claude to generate ONLY nodes, clusters, and connections."""

    import_lines = build_import_lines(provider)

    if detail_level == "overview":
        scope = """OVERVIEW MODE: Generate 8-12 nodes in 3 clusters.
Clusters: "Edge & CDN", "Application", "Data Stores"
Show the main request flow from clients to data and back."""
    else:
        scope = """DETAILED MODE: Generate 15-25 nodes in 5-6 clusters.
Clusters: "Edge & Security", "Application Tier" (with nested "Auto Scaling" sub-cluster), "Data Tier", "Async Processing", "Observability"
Show: CDN, WAF, auth, API gateway, multiple app instances, cache, primary DB + replica, message queue, workers, log storage, monitoring."""

    return f"""Generate the BODY of a Python `diagrams` architecture diagram.

SYSTEM: {question}
{scope}

I will wrap your output inside a pre-built template that already has:
- All imports: {import_lines}
- Diagram() with graph_attr (300 DPI, spline arrows, white bg, compressed layout)
- node_attr and edge_attr with Helvetica fonts and 2.0 penwidth

You generate ONLY the indented body (4 spaces indent) that goes inside the `with Diagram(...)` block.

CLUSTER graph_attr PRESETS — copy these exactly:
  Edge/CDN cluster:   graph_attr={CLUSTER_COLORS["edge"]}
  Application cluster: graph_attr={CLUSTER_COLORS["app"]}
  Data cluster:        graph_attr={CLUSTER_COLORS["data"]}
  Async cluster:       graph_attr={CLUSTER_COLORS["async"]}
  Monitoring cluster:  graph_attr={CLUSTER_COLORS["monitor"]}
  Sub-cluster (e.g. Auto Scaling): graph_attr={CLUSTER_COLORS["sub"]}

{EDGE_COLORS}

RULES:
1. Start with: users = Users("Clients")
2. Use short labels (2-3 words): "Redis Cache", "Primary DB", "API Gateway"
3. EVERY connection MUST use Edge(label="...", color="...", penwidth="2.0") — NO bare >> without Edge
4. NEVER chain: a >> Edge() >> b >> c. Always: a >> Edge() >> b (newline) b >> Edge() >> c
5. Each variable name must be unique
6. Only use node classes from the imports listed above
7. No import statements — I add those
8. No Diagram() call — I add that
9. 4-space indent for everything (it goes inside a with block)

EXAMPLE BODY for a URL shortener (overview):
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

NOW generate the body for: {question}
Return ONLY the indented Python code. No explanation. No imports. No Diagram()."""


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


def assemble_code(body, provider, direction):
    """Wrap Claude's body inside the hardcoded template."""
    import_lines = build_import_lines(provider)

    # Ensure body is indented with 4 spaces
    lines = body.split("\n")
    indented = []
    for line in lines:
        stripped = line.lstrip()
        if not stripped:
            indented.append("")
            continue
        # If line doesn't start with spaces, add 4
        if not line.startswith("    "):
            indented.append("    " + stripped)
        else:
            indented.append(line)
    body_indented = "\n".join(indented)

    code = TEMPLATE.replace("{{IMPORTS}}", import_lines)
    code = code.replace("{{DIRECTION}}", direction)
    code = code.replace("{{BODY}}", body_indented)
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
