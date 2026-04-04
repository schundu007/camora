#!/usr/bin/env python3
"""
Diagram Engine — generates enterprise-grade cloud architecture diagrams.

Uses Claude API to generate Python code for mingrammer/diagrams library,
then executes it to produce a high-quality PNG image.

Features:
  - Layered architecture (Client → Edge → App → Data → Async)
  - Proper Cluster grouping (VPC, AZ, subnets)
  - Edge labels with data flow descriptions
  - Custom styling (colors, fonts, DPI)
  - Auto-retry on code execution failure
"""

import argparse
import json
import os
import sys
import subprocess
import tempfile
import uuid
import traceback

try:
    import anthropic
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'anthropic', '-q'])
    import anthropic


# ── Verified, commonly available node classes per provider ──────────────────

PROVIDER_NODES = {
    "aws": """
VERIFIED AWS NODE IMPORTS (use ONLY these):
  from diagrams.aws.compute import EC2, ECS, Lambda, ElasticBeanstalk, AutoScaling
  from diagrams.aws.database import RDS, ElastiCache, Dynamodb, Redshift
  from diagrams.aws.network import ELB, ALB, NLB, CloudFront, Route53, VPC, APIGateway
  from diagrams.aws.storage import S3
  from diagrams.aws.integration import SQS, SNS, Kinesis
  from diagrams.aws.analytics import Elasticsearch
  from diagrams.aws.management import Cloudwatch
  from diagrams.aws.security import IAM, WAF, KMS
  from diagrams.aws.general import Users, Client
""",
    "gcp": """
VERIFIED GCP NODE IMPORTS (use ONLY these):
  from diagrams.gcp.compute import GCE, GKE, Run, Functions, AppEngine
  from diagrams.gcp.database import SQL, Memorystore, Firestore, Bigtable, Spanner
  from diagrams.gcp.network import LoadBalancing, CDN, DNS, Armor
  from diagrams.gcp.storage import GCS
  from diagrams.gcp.analytics import PubSub, Dataflow
  from diagrams.gcp.security import IAP, KMS as GKMS
  from diagrams.gcp.devtools import Monitoring
""",
    "azure": """
VERIFIED AZURE NODE IMPORTS (use ONLY these):
  from diagrams.azure.compute import VM, AKS, FunctionApps, AppServices
  from diagrams.azure.database import SQLDatabases, CosmosDb, CacheForRedis
  from diagrams.azure.network import LoadBalancers, FrontDoors, CDNProfiles, ApplicationGateway, DNSZones
  from diagrams.azure.storage import BlobStorage
  from diagrams.azure.integration import ServiceBus, EventGridDomains
  from diagrams.azure.security import KeyVaults
  from diagrams.azure.monitor import Monitor
""",
}


def get_diagram_prompt(question, provider, detail_level, direction):
    """Build an expert-level prompt for enterprise architecture diagrams."""

    provider_nodes = PROVIDER_NODES.get(provider, PROVIDER_NODES["aws"])

    if detail_level == "overview":
        scope = """OVERVIEW SCOPE (8-12 nodes):
- Show the major architectural layers: Client/Edge → Application → Data
- 2-3 Clusters maximum (e.g., "Application Tier", "Data Tier")
- Focus on the primary read/write data paths
- Include: load balancer, app servers, primary DB, cache
- Edge labels on the 3-4 most important connections only"""
    else:
        scope = """DETAILED SCOPE (15-25 nodes):
- Show ALL architectural layers: Client → CDN/Edge → Load Balancing → Application → Cache → Database → Async/Workers → Monitoring
- 4-6 nested Clusters (e.g., VPC > "Application Tier", VPC > "Data Tier", "Monitoring")
- Include read AND write paths, async processing, monitoring
- Show: CDN, WAF, LB, multiple app servers, cache layer, primary DB + replicas, message queue, workers, object storage, monitoring
- Edge labels on ALL important connections describing data flow"""

    return f"""You are an expert cloud architect. Generate Python code using the `diagrams` library to create a PRODUCTION-QUALITY cloud architecture diagram.

SYSTEM: {question}

{scope}

{provider_nodes}

ALSO AVAILABLE:
  from diagrams import Diagram, Cluster, Edge
  from diagrams.generic.compute import Rack
  from diagrams.generic.database import SQL as GenericSQL
  from diagrams.generic.network import Firewall
  from diagrams.onprem.client import Users as OnPremUsers, Client as OnPremClient
  from diagrams.onprem.queue import Kafka, RabbitMQ, Celery
  from diagrams.onprem.monitoring import Grafana, Prometheus
  from diagrams.onprem.network import Nginx, HAProxy
  from diagrams.programming.language import Python, JavaScript, Go

STRICT RULES:
1. filename=os.environ["OUTPUT_PATH"], show=False, outformat="png"
2. Set graph_attr for professional styling:
   graph_attr = {{
       "fontsize": "28",
       "fontname": "Helvetica Bold",
       "bgcolor": "white",
       "pad": "0.8",
       "dpi": "200",
       "nodesep": "0.8",
       "ranksep": "1.2",
       "splines": "ortho",
   }}
3. Use Edge(label="...", color="...") for labeled, colored connections:
   - Blue (#2563eb) for read paths
   - Green (#16a34a) for write paths
   - Orange (#ea580c) for async/events
   - Gray (#6b7280) for monitoring/logging
   Example: app >> Edge(label="read", color="#2563eb") >> cache
4. Use Cluster(label, graph_attr={{"bgcolor": "..."}}) with distinct pastel backgrounds:
   - "#e8f4f8" light blue for networking/edge
   - "#f0fdf4" light green for application
   - "#fef3c7" light yellow for data
   - "#fdf2f8" light pink for async/workers
   - "#f3f4f6" light gray for monitoring
5. Give each node a SHORT, descriptive label: "API Gateway", "Redis Cache", "Primary DB"
6. Each variable name MUST be unique — no reuse
7. Do NOT import matplotlib or call plt.show()
8. Add `import os` at the top
9. Connection direction: {"left to right" if direction == "LR" else "top to bottom"} — set direction="{direction}" in Diagram()

ARCHITECTURE PATTERN:
- Think about the REAL components needed for this system
- Show the actual data flow: how a request enters, gets processed, and data is stored/retrieved
- Group components logically by responsibility
- Use proper cloud-native services (not generic boxes)

Return ONLY executable Python code. No markdown fences. No explanation."""


def execute_code(code, output_path, output_dir, attempt=1):
    """Execute the generated diagram code, return result dict."""
    code_file = os.path.join(tempfile.gettempdir(), f"diagram_code_{uuid.uuid4().hex[:8]}.py")
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
            return {"ok": False, "stderr": result.stderr[:800]}

        image_path = output_path + ".png"
        if not os.path.exists(image_path):
            if os.path.exists(output_path):
                image_path = output_path
            else:
                return {"ok": False, "stderr": "Image file not found after execution"}

        return {"ok": True, "image_path": image_path}

    except subprocess.TimeoutExpired:
        return {"ok": False, "stderr": "Timed out after 60s"}
    except Exception as e:
        return {"ok": False, "stderr": str(e)}
    finally:
        try:
            os.unlink(code_file)
        except OSError:
            pass


def generate_diagram(question, provider, detail_level, direction, output_dir, api_key):
    """Generate a diagram with auto-retry on failure."""
    client = anthropic.Anthropic(api_key=api_key)

    prompt = get_diagram_prompt(question, provider, detail_level, direction)
    diagram_id = uuid.uuid4().hex[:8]
    output_path = os.path.join(output_dir, f"diagram-{diagram_id}")

    # First attempt
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
    )

    code = response.content[0].text.strip()
    # Strip markdown fences
    if code.startswith("```"):
        code = "\n".join(code.split("\n")[1:])
    if code.endswith("```"):
        code = code[:-3].strip()

    result = execute_code(code, output_path, output_dir)

    # Auto-retry: if first attempt fails, send the error back to Claude for a fix
    if not result["ok"]:
        error_msg = result["stderr"]
        sys.stderr.write(f"[DiagramEngine] Attempt 1 failed: {error_msg[:200]}\n")

        fix_prompt = f"""The previous diagram code failed with this error:

ERROR: {error_msg[:600]}

ORIGINAL CODE:
{code}

Fix the code. Common issues:
- ImportError: the node class doesn't exist in that module — use a different class from the VERIFIED list, or use a generic node from diagrams.generic.*
- AttributeError: wrong class name — check exact spelling
- graphviz errors: simplify the layout, reduce nodes, remove splines="ortho" if layout fails

Return ONLY the fixed Python code. No explanation."""

        fix_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": code},
                {"role": "user", "content": fix_prompt},
            ],
        )

        code = fix_response.content[0].text.strip()
        if code.startswith("```"):
            code = "\n".join(code.split("\n")[1:])
        if code.endswith("```"):
            code = code[:-3].strip()

        # New output path for retry
        diagram_id = uuid.uuid4().hex[:8]
        output_path = os.path.join(output_dir, f"diagram-{diagram_id}")
        result = execute_code(code, output_path, output_dir)

    if not result["ok"]:
        return {
            "success": False,
            "error": f"Diagram generation failed after retry: {result['stderr'][:300]}",
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
    parser = argparse.ArgumentParser(description="Generate cloud architecture diagrams")
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
