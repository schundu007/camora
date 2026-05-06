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


# ── Class-name aliases ─────────────────────────────────────────────────────
# Claude regularly emits CamelCase variants that don't match the actual
# `diagrams` library class names (e.g. "DynamoDB" → real class is "Dynamodb",
# "CloudRun" → "Run", "Functions" for Azure → "FunctionApps"). Without this
# normalization, validate_imports flags the bad import, fix_bad_imports drops
# it, and the body still references the alias → NameError → triggers a full
# Claude retry. Each retry cascade burns ~2–3× the tokens of a clean run.
#
# The substitution runs against both the import lines AND the body call sites
# in assemble_code(), before validate_imports executes.
ALIAS_MAP = {
    "aws": {
        "DynamoDB": "Dynamodb",
        "Dynamo": "Dynamodb",
        "Cloudfront": "CloudFront",
        "CloudFRONT": "CloudFront",
        "ApiGateway": "APIGateway",
        "APIgateway": "APIGateway",
        "API_Gateway": "APIGateway",
        "ApiGW": "APIGateway",
        "Route_53": "Route53",
        "Route53DNS": "Route53",
        "ElasticCache": "ElastiCache",
        "Elasticache": "ElastiCache",
        "AutoScale": "AutoScaling",
        "AutoScalingGroup": "AutoScaling",
        "ASG": "AutoScaling",
        "Cloudwatch": "Cloudwatch",  # canonical (some prompts say CloudWatch)
        "CloudWatch": "Cloudwatch",
        "ElasticSearch": "ElasticsearchService",
        "Elasticsearch": "ElasticsearchService",
        "ES": "ElasticsearchService",
        "OpenSearch": "ElasticsearchService",
        "OpenSearchService": "ElasticsearchService",
        "AuroraDB": "Aurora",
        "AuroraDb": "Aurora",
        "S3Storage": "S3",
        "SimpleStorage": "S3",
        "LambdaFunction": "Lambda",
    },
    "gcp": {
        "CloudRun": "Run",
        "GoogleCloudRun": "Run",
        "CloudFunctions": "Functions",
        "GoogleCloudFunctions": "Functions",
        "GCF": "Functions",
        "Pubsub": "PubSub",
        "PUBSUB": "PubSub",
        "Pub_Sub": "PubSub",
        "Bigquery": "BigQuery",
        "BigQueryDB": "BigQuery",
        "BQ": "BigQuery",
        "CloudSQL": "SQL",
        "CloudSql": "SQL",
        "GoogleSQL": "SQL",
        "Memstore": "Memorystore",
        "MemoryStore": "Memorystore",
        "CloudCDN": "CDN",
        "CloudDNS": "DNS",
        "CloudArmor": "Armor",
        "CloudStorage": "GCS",
        "GoogleCloudStorage": "GCS",
        "Bigtable": "Bigtable",  # canonical
        "BigTable": "Bigtable",
        "CloudSpanner": "Spanner",
        "Kubernetes": "GKE",
        "K8s": "GKE",
        "ComputeEngine": "GCE",
    },
    "azure": {
        "Functions": "FunctionApps",
        "AzureFunctions": "FunctionApps",
        "FunctionApp": "FunctionApps",
        "AzFunctions": "FunctionApps",
        "CosmosDB": "CosmosDb",
        "Cosmos": "CosmosDb",
        "CosmosDatabase": "CosmosDb",
        "SQLDatabase": "SQLDatabases",
        "SqlDatabase": "SQLDatabases",
        "SqlDatabases": "SQLDatabases",
        "AzureSQL": "SQLDatabases",
        "Redis": "CacheForRedis",  # only when in azure context (handled below)
        "AzureRedis": "CacheForRedis",
        "ServiceBus": "ServiceBus",  # canonical
        "Service_Bus": "ServiceBus",
        "Servicebus": "ServiceBus",
        "EventGrid": "EventGridDomains",
        "EventGridTopic": "EventGridDomains",
        "EventGridDomain": "EventGridDomains",
        "Blob": "BlobStorage",
        "BlobStore": "BlobStorage",
        "AzureBlob": "BlobStorage",
        "FrontDoor": "FrontDoors",
        "AzureFrontDoor": "FrontDoors",
        "LoadBalancer": "LoadBalancers",
        "AppGateway": "ApplicationGateway",
        "AppGW": "ApplicationGateway",
        "CDN": "CDNProfiles",
        "CdnProfile": "CDNProfiles",
        "DNSZone": "DNSZones",
        "DnsZone": "DNSZones",
        "KeyVault": "KeyVaults",
        "AzKeyVault": "KeyVaults",
        "AppService": "AppServices",
        "WebApp": "AppServices",
    },
}


def normalize_aliases(code, provider):
    """Substitute common Claude class-name aliases with canonical diagrams-lib names.

    Runs whole-word substitutions on both import lines and call sites. Skips
    occurrences inside string literals so node labels containing service names
    (e.g. "DynamoDB Users Table") aren't rewritten.
    """
    aliases = ALIAS_MAP.get(provider, {})
    if not aliases:
        return code

    # Mask string literals so labels aren't touched
    literals = []
    def _mask(m):
        literals.append(m.group(0))
        return f"\x00LIT{len(literals)-1}\x00"
    masked = _STRING_LITERAL_RE.sub(_mask, code)

    # Order by length desc so longer aliases (CloudFunctions) match before
    # shorter overlaps (Functions). Apply word-boundary substitution.
    for alias in sorted(aliases.keys(), key=len, reverse=True):
        canonical = aliases[alias]
        if alias == canonical:
            continue
        masked = re.sub(rf'\b{re.escape(alias)}\b', canonical, masked)

    # Restore literals
    def _restore(m):
        return literals[int(m.group(1))]
    return re.sub(r'\x00LIT(\d+)\x00', _restore, masked)


# ── Verified imports per provider ──────────────────────────────────────────

PROVIDER_IMPORTS = {
    "aws": {
        "compute": ["EC2", "ECS", "Lambda", "AutoScaling"],
        "database": ["RDS", "ElastiCache", "Dynamodb", "Aurora"],
        "network": ["ELB", "ALB", "NLB", "CloudFront", "Route53", "APIGateway"],
        "storage": ["S3"],
        "integration": ["SQS", "SNS"],
        "analytics": ["ElasticsearchService", "Kinesis"],
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
    "fontname": "DejaVu Sans Bold",
    "fontcolor": "#111827",
    "bgcolor": "white",
    "pad": "0.4",
    # Layout tuning, post user-feedback:
    # - splines=ortho: right-angle connectors; previous "spline" produced
    #   diagonal crossings that read as spaghetti when the diagram had
    #   8+ nodes.
    # - nodesep / ranksep raised so labels don't touch their neighbors
    #   and clusters have visible gaps.
    # - ratio dropped: compress forced graphviz to flatten the layout
    #   into a tall narrow rectangle on TB direction; default
    #   (no ratio) lets the engine pick a natural aspect.
    # - size kept at 14,8 with the fixed-aspect ! marker so the panel
    #   has a stable canvas to fit-to-width against.
    "dpi": "110",
    "nodesep": "0.9",
    "ranksep": "1.1",
    "splines": "ortho",
    "size": "14,8!",
}

node_attr = {
    "fontsize": "14",
    "fontname": "DejaVu Sans Bold",
    "fontcolor": "#111827",
    "imagepos": "tc",
    "labelloc": "b",
}

edge_attr = {
    "fontsize": "12",
    "fontname": "DejaVu Sans",
    "fontcolor": "#111827",
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
    "edge":    '{"bgcolor": "#dbeafe", "style": "rounded", "pencolor": "#2563eb", "penwidth": "2.5", "fontsize": "16", "fontname": "DejaVu Sans Bold", "fontcolor": "#1e3a5f"}',
    "app":     '{"bgcolor": "#dcfce7", "style": "rounded", "pencolor": "#16a34a", "penwidth": "2.5", "fontsize": "16", "fontname": "DejaVu Sans Bold", "fontcolor": "#14532d"}',
    "data":    '{"bgcolor": "#fef3c7", "style": "rounded", "pencolor": "#d97706", "penwidth": "2.5", "fontsize": "16", "fontname": "DejaVu Sans Bold", "fontcolor": "#78350f"}',
    "async":   '{"bgcolor": "#fce7f3", "style": "rounded", "pencolor": "#db2777", "penwidth": "2.5", "fontsize": "16", "fontname": "DejaVu Sans Bold", "fontcolor": "#831843"}',
    "monitor": '{"bgcolor": "#f3f4f6", "style": "rounded", "pencolor": "#6b7280", "penwidth": "2.5", "fontsize": "16", "fontname": "DejaVu Sans Bold", "fontcolor": "#1f2937"}',
    "sub":     '{"bgcolor": "#f0fdf4", "style": "dashed", "pencolor": "#22c55e", "penwidth": "1.5", "fontsize": "13", "fontname": "DejaVu Sans"}',
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


def _get_application_prompt(question, detail_level, direction):
    """Application / OOP / LLD design — class & component diagram.

    NO cloud nodes. Boxes are classes / components / data structures.
    Edges are method calls / data flow / composition. Provider-neutral
    imports from diagrams.programming.flowchart + diagrams.generic.
    """
    direction_hint = (
        "LAYOUT: Left-to-right (LR). Public interface on the LEFT, internals on the RIGHT."
        if direction == "LR" else
        "LAYOUT: Top-to-bottom (TB). Public interface at the TOP, internals at the BOTTOM."
    )
    scope = (
        "5-8 boxes in 2-3 clusters" if detail_level == "overview"
        else "8-12 boxes in 3-4 clusters"
    )
    return f"""Generate Python code for a CLASS / COMPONENT diagram using the `diagrams` library.

PROBLEM: {question}
ARCHETYPE: APPLICATION DESIGN (OOP / LLD / API). This is software structure — boxes are CLASSES or COMPONENTS, NOT cloud services. Do NOT use any aws/gcp/azure imports.
{direction_hint}
SCOPE: {scope}.

I will wrap your output inside a template that already has:
- `import os`, `from diagrams import Diagram, Cluster, Edge`
- Diagram() constructor with graph_attr (white bg, spline arrows)
- node_attr and edge_attr already set

YOUR OUTPUT must have TWO parts:

PART 1 — IMPORTS: Pick from these provider-neutral classes:
from diagrams.programming.flowchart import Action, Decision, Document, InputOutput, StartEnd, Database
from diagrams.generic.storage import Storage
from diagrams.generic.compute import Rack

Mapping convention:
- Action(...)   = a class or component (label = ClassName)
- Decision(...) = a branching decision or strategy
- Database(...) = a data structure (HashMap, DoublyLinkedList, Tree, Heap)
- Document(...) = a config object / DTO
- InputOutput(...) = an external input source / external sink
- Storage(...)  = persistent storage (only if the design has it)

PART 2 — BODY: 4-space-indented code that goes inside `with Diagram(...):`

CLUSTER PRESETS — copy exactly:
  API surface cluster: graph_attr={CLUSTER_COLORS["edge"]}
  Core classes cluster: graph_attr={CLUSTER_COLORS["app"]}
  Data structures cluster: graph_attr={CLUSTER_COLORS["data"]}

{EDGE_COLORS}

RULES:
1. Do NOT start with users = Users(...). Application design has no end-users in the diagram — the surface is an API or a class interface.
2. Each box label is a short ClassName or "Class.method" (2-4 words). Examples: "LRUCache", "Node", "DoublyLinkedList", "get(key)", "evict()".
3. EVERY connection MUST use Edge(label="...", color="...", penwidth="2.0"). Labels describe the relationship: "calls", "creates", "stores in", "delegates to", "composes".
4. Use Cluster to group classes by module / package / responsibility.
5. NEVER chain: WRONG: a >> Edge() >> b >> c. RIGHT: split into separate lines.
6. Do NOT include `import os`, `from diagrams import Diagram, Cluster, Edge`, or the Diagram() call — I add those.
7. NO cloud-vendor imports. NO Users. NO ELB / RDS / EC2 / Lambda / etc.
8. Only import classes you actually use.

EXAMPLE OUTPUT (for an LRU Cache problem — adapt the boxes to the question above):
from diagrams.programming.flowchart import Action, Database
from diagrams.generic.storage import Storage

    with Cluster("API surface", graph_attr={CLUSTER_COLORS["edge"]}):
        get_op = Action("get(key)")
        put_op = Action("put(key, val)")

    with Cluster("Core classes", graph_attr={CLUSTER_COLORS["app"]}):
        cache = Action("LRUCache")
        node = Action("Node")
        dll = Action("DoublyLinkedList")

    with Cluster("Data structures", graph_attr={CLUSTER_COLORS["data"]}):
        hashmap = Database("HashMap")
        head_tail = Database("Sentinel head/tail")

    get_op >> Edge(label="lookup", color="#2563eb", penwidth="2.0") >> cache
    put_op >> Edge(label="insert", color="#2563eb", penwidth="2.0") >> cache
    cache >> Edge(label="O(1) get", color="#2563eb", penwidth="2.0") >> hashmap
    cache >> Edge(label="reorder", color="#16a34a", penwidth="2.0") >> dll
    dll >> Edge(label="composes", color="#16a34a", penwidth="2.0") >> node
    dll >> Edge(label="anchors", color="#16a34a", penwidth="2.0") >> head_tail

NOW generate for: {question}
REMEMBER: classes and components only. NO cloud services. Return ONLY the Python code."""


def _get_infrastructure_prompt(question, provider, detail_level, direction):
    """Infrastructure component design — topology diagram.

    Two clusters (data plane + control plane), replication edges,
    partitioning shown via labels. Provider-neutral imports.
    """
    direction_hint = (
        "LAYOUT: Left-to-right (LR). Clients on the LEFT, control plane on the RIGHT."
        if direction == "LR" else
        "LAYOUT: Top-to-bottom (TB). Clients at the TOP, control plane at the BOTTOM."
    )
    scope = (
        "Show 4-6 data-plane nodes + 2-3 control-plane nodes" if detail_level == "overview"
        else "Show 6-10 data-plane nodes + 3-4 control-plane nodes"
    )
    return f"""Generate Python code for a TOPOLOGY diagram using the `diagrams` library.

COMPONENT: {question}
ARCHETYPE: INFRASTRUCTURE COMPONENT (CDN, message queue, distributed cache, rate limiter, load balancer, consensus protocol). This is ONE component drawn at protocol level — NOT a multi-tier app stack. No "App Server" → "Cache" → "DB" sequence.
{direction_hint}
SCOPE: {scope}. Two clusters: DATA PLANE (the shards/replicas serving the hot path) + CONTROL PLANE (config / coordination / failure detection).

I will wrap your output inside a template that already has the Diagram() constructor.

YOUR OUTPUT must have TWO parts:

PART 1 — IMPORTS: Pick from these provider-neutral classes:
from diagrams.generic.compute import Rack
from diagrams.generic.storage import Storage
from diagrams.generic.network import Subnet, Switch, Router, Firewall
from diagrams.programming.flowchart import Action
from diagrams.onprem.client import Users

Mapping convention:
- Rack(...)    = a server / shard / replica node in the data plane
- Storage(...) = a storage backend behind a node
- Switch(...)  = a routing layer (e.g. consistent-hash router, ingress)
- Action(...)  = a control-plane component (config server, coordinator, gossip layer)
- Users(...)   = clients hitting the component (only one node, labeled "Clients")

PART 2 — BODY: 4-space-indented code that goes inside `with Diagram(...):`

CLUSTER PRESETS — copy exactly:
  Data plane cluster:    graph_attr={CLUSTER_COLORS["app"]}
  Control plane cluster: graph_attr={CLUSTER_COLORS["edge"]}

{EDGE_COLORS}

RULES:
1. Start with: clients = Users("Clients")
2. Create EXACTLY one Cluster("Data plane", ...) and one Cluster("Control plane", ...).
3. In the data plane, use Rack(...) for shards/replicas. Label them "Shard 1", "Shard 2", "Replica A", etc.
4. Replication edges between data-plane nodes MUST use Edge(label="replicate", style="dashed", color="#16a34a", penwidth="2.0").
5. Hot-path edges use Edge(label="<route reason>", color="#2563eb", penwidth="2.0"). Examples: "consistent hash", "round-robin", "leader read".
6. Control plane should connect to data-plane nodes with Edge(label="config", style="dotted", color="#6b7280", penwidth="1.5").
7. Do NOT include `import os`, `from diagrams import Diagram, Cluster, Edge`, or the Diagram() call.
8. NO multi-tier app stack. NO RDS / DynamoDB / EC2 / S3 / etc.

EXAMPLE OUTPUT (for a distributed cache — adapt to the question above):
from diagrams.generic.compute import Rack
from diagrams.generic.network import Switch
from diagrams.programming.flowchart import Action
from diagrams.onprem.client import Users

    clients = Users("Clients")
    router = Switch("Consistent-hash router")

    with Cluster("Data plane", graph_attr={CLUSTER_COLORS["app"]}):
        shard1 = Rack("Shard 1\\n(primary)")
        shard2 = Rack("Shard 2\\n(primary)")
        shard3 = Rack("Shard 3\\n(primary)")
        rep1 = Rack("Replica A")
        rep2 = Rack("Replica B")

    with Cluster("Control plane", graph_attr={CLUSTER_COLORS["edge"]}):
        coord = Action("Coordinator (etcd)")
        gossip = Action("Gossip / membership")

    clients >> Edge(label="key request", color="#2563eb", penwidth="2.0") >> router
    router >> Edge(label="hash bucket 1", color="#2563eb", penwidth="2.0") >> shard1
    router >> Edge(label="hash bucket 2", color="#2563eb", penwidth="2.0") >> shard2
    shard1 >> Edge(label="replicate", style="dashed", color="#16a34a", penwidth="2.0") >> rep1
    shard2 >> Edge(label="replicate", style="dashed", color="#16a34a", penwidth="2.0") >> rep2
    coord >> Edge(label="config", style="dotted", color="#6b7280", penwidth="1.5") >> shard1
    gossip >> Edge(label="health", style="dotted", color="#6b7280", penwidth="1.5") >> shard2

NOW generate for: {question}
REMEMBER: ONE infrastructure component, two clusters (data plane + control plane). Return ONLY the Python code."""


def get_prompt(question, provider, detail_level, direction, design_kind="system"):
    """Dispatch to the right prompt by archetype.

    Branches added 2026-05 to fix the "every design problem gets the
    same diagram" bug. The original system-archetype prompt is
    preserved unchanged (as `_get_system_prompt` below) so distributed-
    system questions (Twitter, Uber, etc.) never regress.
    """
    if design_kind == "application":
        return _get_application_prompt(question, detail_level, direction)
    if design_kind == "infrastructure":
        return _get_infrastructure_prompt(question, provider, detail_level, direction)
    return _get_system_prompt(question, provider, detail_level, direction)


def _get_system_prompt(question, provider, detail_level, direction):
    """Ask Claude to generate imports + body (no Diagram/graph_attr — those are hardcoded)."""

    available = build_import_list(provider)

    # Provider-specific example. The previous version hardcoded AWS imports
    # in the example, which biased the model so heavily that picking GCP /
    # Azure still emitted AWS diagrams. Now the example uses the provider's
    # actual imports so picking GCP gets a GCP diagram.
    examples_by_provider = {
        "aws": {
            "imports": (
                "from diagrams.aws.network import CloudFront, ALB, Route53\n"
                "from diagrams.aws.compute import ECS\n"
                "from diagrams.aws.database import RDS, ElastiCache\n"
                "from diagrams.aws.storage import S3"
            ),
            "edge": "dns = Route53(\"DNS\")\n        cdn = CloudFront(\"CDN\")",
            "app": "lb = ALB(\"Load Balancer\")\n        api = ECS(\"API Server\")",
            "data": "cache = ElastiCache(\"Redis Cache\")\n        db = RDS(\"PostgreSQL\")\n        store = S3(\"File Storage\")",
        },
        "gcp": {
            "imports": (
                "from diagrams.gcp.network import LoadBalancing, CDN, DNS\n"
                "from diagrams.gcp.compute import GKE\n"
                "from diagrams.gcp.database import SQL, Memorystore\n"
                "from diagrams.gcp.storage import GCS"
            ),
            "edge": "dns = DNS(\"DNS\")\n        cdn = CDN(\"Cloud CDN\")",
            "app": "lb = LoadBalancing(\"Load Balancer\")\n        api = GKE(\"GKE Cluster\")",
            "data": "cache = Memorystore(\"Redis Cache\")\n        db = SQL(\"Cloud SQL\")\n        store = GCS(\"Cloud Storage\")",
        },
        "azure": {
            "imports": (
                "from diagrams.azure.network import FrontDoors, CDNProfiles, DNSZones\n"
                "from diagrams.azure.compute import AKS\n"
                "from diagrams.azure.database import SQLDatabases, CacheForRedis\n"
                "from diagrams.azure.storage import BlobStorage"
            ),
            "edge": "dns = DNSZones(\"DNS\")\n        cdn = CDNProfiles(\"CDN\")",
            "app": "lb = FrontDoors(\"Front Door\")\n        api = AKS(\"AKS Cluster\")",
            "data": "cache = CacheForRedis(\"Redis Cache\")\n        db = SQLDatabases(\"SQL Database\")\n        store = BlobStorage(\"Blob Storage\")",
        },
    }
    example = examples_by_provider.get(provider, examples_by_provider["aws"])

    if detail_level == "overview":
        scope = """OVERVIEW MODE: 8-11 nodes in 3 clusters. Tight, readable, no spaghetti.
Clusters (left to right): "Edge" (1-2 nodes), "Application" (3-5 nodes), "Data" (2-4 nodes).
Goal: a candidate could explain this in 30 seconds.

Connection discipline (CRITICAL):
- Each node has AT MOST 2-3 outgoing edges. Aggressively dedupe.
- The diagram has ONE primary forward request path. Don't draw the same
  request flowing into every backend if it conceptually fans out — pick
  the most important downstream and draw that one edge.
- NO crossing edges. If two edges would cross, restructure clusters or
  drop the less essential edge.
- NO bidirectional arrows. Use Edge() with one direction; if a flow is
  duplex, label it ("read+write") instead of drawing two edges.
- Keep async / monitoring / replicas OUT of overview entirely.

Preserve the real architectural points: load balancer, primary store,
cache layer, async queue (if domain demands it). Don't over-simplify."""
    else:
        scope = """DETAILED MODE: 12-16 nodes in 4-5 clusters MAX.
Clusters: "Edge & Security" (CDN + WAF), "Application Tier" (LB + 2-4 services),
"Data Tier" (cache + DB), "Async Processing" (queue + workers if applicable),
"Observability" (one metrics + one logs node). Skip "Observability" if the
core architecture doesn't depend on it.

Connection discipline:
- Each node 2-4 edges max. NO mesh / fully-connected clusters.
- Async path is its OWN flow — don't connect every app service to the queue,
  pick the one that publishes and draw a single edge to the queue.
- NO replica nodes (group them as "DB Cluster" with 1 node).
- NO nested sub-clusters.
- Keep the layout linear-with-side-branches: main path goes Edge → App → Data,
  side cluster (Async or Observability) reaches in once.

Goal: senior interview-grade diagram that's still scannable in 60 seconds."""

    direction_hint = (
        "LAYOUT DIRECTION: Left-to-right (LR). Position upstream nodes (clients, DNS, CDN) on the LEFT and downstream data stores on the RIGHT."
        if direction == "LR" else
        "LAYOUT DIRECTION: Top-to-bottom (TB). Position upstream nodes (clients, DNS, CDN) at the TOP and downstream data stores at the BOTTOM."
    )

    return f"""Generate Python code for a cloud architecture diagram using the `diagrams` library.

SYSTEM: {question}
CLOUD PROVIDER: {provider.upper()} — you MUST use ONLY {provider} imports listed below. Do NOT use imports from any other cloud provider.
{direction_hint}
DETAIL LEVEL: {detail_level.upper()}
{scope}

I will wrap your output inside a template that already has:
- `import os`, `from diagrams import Diagram, Cluster, Edge`
- Diagram() constructor with graph_attr (white bg, spline arrows)
- node_attr and edge_attr already set

YOUR OUTPUT must have TWO parts:

PART 1 — IMPORTS: Only import the specific {provider} node classes you actually use. Pick from:
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
8. Design REAL components for THIS system using {provider.upper()} services
9. NEVER mix providers (no aws.* if provider is gcp; no gcp.* if provider is azure, etc.)

EXAMPLE OUTPUT (using {provider.upper()} services for clarity — adapt to the question above):
{example["imports"]}
from diagrams.onprem.client import Users

    users = Users("Clients")

    with Cluster("Edge & CDN", graph_attr={CLUSTER_COLORS["edge"]}):
        {example["edge"]}

    with Cluster("Application", graph_attr={CLUSTER_COLORS["app"]}):
        {example["app"]}

    with Cluster("Data Stores", graph_attr={CLUSTER_COLORS["data"]}):
        {example["data"]}

    users >> Edge(label="HTTPS", color="#2563eb", penwidth="2.0") >> dns
    dns >> Edge(color="#2563eb", penwidth="2.0") >> cdn
    cdn >> Edge(label="route", color="#2563eb", penwidth="2.0") >> lb
    lb >> Edge(color="#2563eb", penwidth="2.0") >> api
    api >> Edge(label="cache read", color="#2563eb", penwidth="2.0") >> cache
    api >> Edge(label="write", color="#16a34a", penwidth="2.0") >> db
    api >> Edge(label="upload", color="#ea580c", penwidth="2.0") >> store

NOW generate for: {question}
REMEMBER: Use {provider.upper()} services only. {direction_hint}
Return ONLY the Python code (imports + indented body). No explanation. No markdown fences."""


def extract_code(text):
    """Extract code, strip markdown fences. Handles multiple code blocks.

    Some prompts cause Claude to split its response into multiple fenced
    blocks (e.g. a 'here are the imports' block followed by a 'here is the
    body' block, often with prose in between). The previous regex grabbed
    only the FIRST block — when that was just the imports section, the
    body never reached assemble_code, body_lines stayed empty, and the
    rendered Python file was a `with Diagram(...):` with no body →
    IndentationError on every attempt. Now we concatenate all fenced
    blocks so imports + body both survive.
    """
    blocks = re.findall(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
    if blocks:
        return "\n\n".join(b.strip() for b in blocks if b.strip())
    text = text.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
    if text.endswith("```"):
        text = text[:-3].strip()
    return text


def has_meaningful_body(body_block):
    """Reject assembled code where the body is empty or stub-only.

    A "real" architecture diagram body has at least a few non-blank lines
    and at least one connection (>>) or cluster. If Claude returned only
    `users = Users("Clients")` (or nothing), the with-block is effectively
    empty — executing it just produces an IndentationError. Treat that as
    a soft failure so generate_diagram retries with a stronger prompt
    instead of crashing.
    """
    lines = [l.strip() for l in body_block.split("\n") if l.strip()]
    if len(lines) < 2:
        return False
    return any(">>" in l or "Cluster(" in l for l in lines)


def _extract_body_from_assembled(code):
    """Pull the {{BODY}}-replaced section out of an assembled file.

    The template structure ends with "with Diagram(\\n...args...\\n):\\n{{BODY}}",
    so splitting on "\\n):\\n" cleanly separates header from body.
    """
    parts = code.split("\n):\n", 1)
    return parts[1] if len(parts) > 1 else ""


def _build_class_to_import(provider):
    """Build a map of ClassName -> full import line for auto-fixing missing imports."""
    mapping = {}
    modules = PROVIDER_IMPORTS.get(provider, PROVIDER_IMPORTS["aws"])
    prefix = f"diagrams.{provider}"
    for module, classes in modules.items():
        for cls in classes:
            mapping[cls] = f"from {prefix}.{module} import {cls}"
    # Common onprem classes Claude frequently uses
    mapping["Kafka"] = "from diagrams.onprem.queue import Kafka"
    mapping["RabbitMQ"] = "from diagrams.onprem.queue import RabbitMQ"
    mapping["Celery"] = "from diagrams.onprem.queue import Celery"
    mapping["Grafana"] = "from diagrams.onprem.monitoring import Grafana"
    mapping["Prometheus"] = "from diagrams.onprem.monitoring import Prometheus"
    mapping["Datadog"] = "from diagrams.onprem.monitoring import Datadog"
    mapping["Splunk"] = "from diagrams.onprem.monitoring import Splunk"
    mapping["Nginx"] = "from diagrams.onprem.network import Nginx"
    mapping["HAProxy"] = "from diagrams.onprem.network import HAProxy"
    mapping["Traefik"] = "from diagrams.onprem.network import Traefik"
    mapping["Consul"] = "from diagrams.onprem.network import Consul"
    mapping["Envoy"] = "from diagrams.onprem.network import Envoy"
    mapping["Redis"] = "from diagrams.onprem.inmemory import Redis"
    mapping["Memcached"] = "from diagrams.onprem.inmemory import Memcached"
    mapping["PostgreSQL"] = "from diagrams.onprem.database import PostgreSQL"
    mapping["MySQL"] = "from diagrams.onprem.database import MySQL"
    mapping["MongoDB"] = "from diagrams.onprem.database import MongoDB"
    mapping["Cassandra"] = "from diagrams.onprem.database import Cassandra"
    mapping["HBase"] = "from diagrams.onprem.database import HBase"
    mapping["ClickHouse"] = "from diagrams.onprem.database import ClickHouse"
    mapping["Neo4J"] = "from diagrams.onprem.database import Neo4J"
    mapping["Spark"] = "from diagrams.onprem.analytics import Spark"
    mapping["Flink"] = "from diagrams.onprem.analytics import Flink"
    mapping["Docker"] = "from diagrams.onprem.container import Docker"
    mapping["FluentBit"] = "from diagrams.onprem.logging import FluentBit"
    mapping["Fluentd"] = "from diagrams.onprem.logging import Fluentd"
    mapping["Loki"] = "from diagrams.onprem.logging import Loki"
    mapping["Jenkins"] = "from diagrams.onprem.ci import Jenkins"
    mapping["Vault"] = "from diagrams.onprem.security import Vault"
    mapping["Users"] = "from diagrams.onprem.client import Users"
    # Generic / programming
    mapping["Rust"] = "from diagrams.programming.language import Rust"
    mapping["Go"] = "from diagrams.programming.language import Go"
    mapping["NodeJS"] = "from diagrams.programming.language import NodeJS"
    mapping["Python"] = "from diagrams.programming.language import Python"
    # K8s classes
    mapping["Pod"] = "from diagrams.k8s.compute import Pod"
    mapping["Deployment"] = "from diagrams.k8s.compute import Deployment"
    mapping["STS"] = "from diagrams.k8s.compute import STS"
    mapping["Service"] = "from diagrams.k8s.network import Service"
    mapping["Ingress"] = "from diagrams.k8s.network import Ingress"
    mapping["HPA"] = "from diagrams.k8s.compute import HPA"
    return mapping


def assemble_code(raw_output, provider, direction):
    """Split Claude's output into imports + body, wrap in template."""
    # Normalize common class-name aliases (e.g. DynamoDB → Dynamodb,
    # CloudRun → Run) before parsing so import dedup and class-detection
    # operate on canonical names.
    raw_output = normalize_aliases(raw_output, provider)

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


BLOCKED_PATTERNS = [
    (r'\bos\.system\b', 'os.system'),
    (r'\b__import__\b', '__import__'),
    (r'\beval\s*\(', 'eval('),
    (r'\bexec\s*\(', 'exec('),
    (r'\b(?:import|from)\s+shutil\b|\bshutil\.', 'shutil'),
    (r'\b(?:import|from)\s+importlib\b|\bimportlib\.', 'importlib'),
    (r'\brequests\.', 'requests.'),
    (r'\b(?:import|from)\s+urllib\b|\burllib\.', 'urllib'),
    (r'\b(?:import|from)\s+socket\b|\bsocket\.', 'socket'),
    (r'\b(?:import|from)\s+http\.client\b|\bhttp\.client\.', 'http.client'),
]

_STRING_LITERAL_RE = re.compile(
    r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\''
)


def sanitize(code):
    # Strip string literals so node labels like "WebSocket connections"
    # don't false-match dangerous-module substrings.
    stripped = _STRING_LITERAL_RE.sub('""', code)
    for pat, label in BLOCKED_PATTERNS:
        if re.search(pat, stripped):
            raise ValueError(f"Blocked: {label}")
    return code


def validate_imports(code):
    """Pre-check that all import lines resolve. Returns list of bad import lines."""
    bad = []
    for line in code.split("\n"):
        stripped = line.strip()
        if stripped.startswith("from diagrams") and "import" in stripped:
            try:
                # Test import in a subprocess to avoid polluting this process
                result = subprocess.run(
                    [sys.executable, "-c", stripped],
                    capture_output=True, text=True, timeout=10,
                )
                if result.returncode != 0:
                    bad.append(stripped)
            except Exception:
                bad.append(stripped)
    return bad


def find_foreign_provider_imports(code, provider):
    """Return import lines that pull from a different cloud provider.

    Claude is biased toward AWS and frequently emits `from diagrams.aws.*`
    even when the prompt says "use Azure ONLY". Those imports are valid at
    runtime so validate_imports doesn't catch them — the resulting diagram
    has AWS icons under an Azure label. This scan flags them so we can
    retry with a stronger prompt or fail visibly instead of silently
    serving the wrong provider.

    `diagrams.onprem.*`, `diagrams.k8s.*`, `diagrams.programming.*`, and
    `diagrams.generic.*` are provider-neutral and always allowed.
    """
    foreign = []
    other_providers = {p for p in PROVIDER_IMPORTS.keys() if p != provider}
    for line in code.split("\n"):
        stripped = line.strip()
        if not stripped.startswith("from diagrams."):
            continue
        m = re.match(r'from\s+diagrams\.([a-z0-9_]+)\.', stripped)
        if not m:
            continue
        ns = m.group(1)
        if ns in other_providers:
            foreign.append(stripped)
    return foreign


def fix_bad_imports(code, bad_imports, provider):
    """Remove bad import lines and replace with onprem equivalents where possible."""
    class_map = _build_class_to_import(provider)
    lines = code.split("\n")
    fixed = []
    added = set()
    for line in lines:
        stripped = line.strip()
        if stripped in bad_imports:
            # Extract class names from the bad import and try to find alternatives
            match = re.search(r'import\s+(.+)$', stripped)
            if match:
                for cls in match.group(1).split(','):
                    cls = cls.strip()
                    if cls in class_map and class_map[cls] not in added:
                        fixed.append(class_map[cls])
                        added.add(class_map[cls])
            continue
        fixed.append(line)
    return "\n".join(fixed)


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


def generate_diagram(question, provider, detail_level, direction, output_dir, api_key, design_kind="system"):
    client = anthropic.Anthropic(api_key=api_key)
    prompt = get_prompt(question, provider, detail_level, direction, design_kind)

    diagram_id = uuid.uuid4().hex[:8]
    output_path = os.path.join(output_dir, f"diagram-{diagram_id}")

    # Attempt 1
    resp = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    body = extract_code(resp.content[0].text)
    full_code = assemble_code(body, provider, direction)
    try:
        full_code = sanitize(full_code)
    except ValueError as e:
        return {"success": False, "error": str(e)}

    # Pre-validate imports and fix bad ones before execution
    bad_imports = validate_imports(full_code)
    if bad_imports:
        sys.stderr.write(f"[DiagramEngine] Fixing {len(bad_imports)} bad imports: {bad_imports}\n")
        full_code = fix_bad_imports(full_code, bad_imports, provider)

    # Provider lock — reject and retry if Claude emitted wrong-provider imports.
    # We treat this as a soft failure (don't execute) so attempt 2 can rebuild
    # cleanly with a stronger prompt instead of producing a wrong-provider PNG.
    foreign_imports = find_foreign_provider_imports(full_code, provider)
    empty_body = not has_meaningful_body(_extract_body_from_assembled(full_code))
    if foreign_imports:
        sys.stderr.write(f"[DiagramEngine] Foreign-provider imports detected (provider={provider}): {foreign_imports}\n")
        result = {"ok": False, "stderr": f"Wrong cloud provider — used {len(foreign_imports)} non-{provider} imports: {foreign_imports[:3]}"}
    elif empty_body:
        # Claude returned only imports / a stub — likely split its response into
        # multiple code blocks. extract_code now concatenates blocks so this is
        # rarer, but if it still happens, retrying with a stronger prompt is
        # cheaper than executing an IndentationError-guaranteed file.
        sys.stderr.write(f"[DiagramEngine] Empty/trivial body — soft fail to retry\n")
        result = {"ok": False, "stderr": "Generated body is empty or trivial — only imports/stub returned. Diagram needs at least one Cluster() and one >> connection."}
    else:
        result = execute_code(full_code, output_path, output_dir)

    # Attempt 2 — fix with full context
    if not result["ok"]:
        sys.stderr.write(f"[DiagramEngine] Attempt 1 failed: {result['stderr'][:200]}\n")

        error_text = result["stderr"][:800]
        # Extract the offending import if it's an ImportError
        import_err = re.search(r"cannot import name '(\w+)' from '([^']+)'", error_text)
        import_hint = ""
        if import_err:
            bad_class, bad_module = import_err.group(1), import_err.group(2)
            import_hint = f"\nThe class '{bad_class}' does NOT exist in '{bad_module}'. Remove it and use a diagrams.onprem equivalent instead (e.g. from diagrams.onprem.database, diagrams.onprem.inmemory, diagrams.onprem.queue, etc)."

        # Surface foreign-provider violations explicitly so the retry actually
        # uses the right provider instead of falling back to AWS bias.
        if foreign_imports:
            wrong_lines = "\n".join(f"  - {imp}" for imp in foreign_imports[:5])
            import_hint += (
                f"\n\nCRITICAL: Your previous output used the WRONG cloud provider. "
                f"You imported from non-{provider} namespaces:\n{wrong_lines}\n"
                f"REWRITE the diagram using ONLY `from diagrams.{provider}.*` imports. "
                f"NEVER import from diagrams.aws/azure/gcp other than {provider}."
            )

        fix_resp = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": body},
                {"role": "user", "content": f"ERROR:\n{error_text}{import_hint}\n\nFix the code. Return the COMPLETE output in the SAME format: imports first, then indented body. Do NOT include `import os`, `from diagrams import Diagram, Cluster, Edge`, or the Diagram() constructor."},
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
        if not has_meaningful_body(_extract_body_from_assembled(full_code)):
            sys.stderr.write(f"[DiagramEngine] Attempt 2 produced empty body — falling through to attempt 3\n")
            result = {"ok": False, "stderr": "Generated body is empty or trivial — only imports/stub returned"}
        else:
            result = execute_code(full_code, output_path, output_dir)

    # Attempt 3 — last resort with minimal safe imports
    if not result["ok"]:
        sys.stderr.write(f"[DiagramEngine] Attempt 2 failed: {result['stderr'][:200]}\n")

        available = build_import_list(provider)
        fallback_resp = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=4096,
            messages=[
                {"role": "user", "content": f"""Generate a simple cloud architecture diagram for: {question}

Use ONLY these verified imports:
{available}

Return imports + indented body (4 spaces). Keep it simple: 6-10 nodes, 2-3 clusters.
Do NOT include `import os`, `from diagrams import Diagram, Cluster, Edge`, or Diagram() call.
The body MUST contain at least 2 Cluster() blocks and at least 4 connections using >>.
EVERY connection must use Edge(label="...", color="...", penwidth="2.0").
Start body with: users = Users("Clients")
Return ONLY ONE Python code block (everything wrapped in a single ```python ... ``` fence). No prose, no multiple blocks, no explanation."""},
            ],
        )
        body = extract_code(fallback_resp.content[0].text)
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
    parser.add_argument(
        "--design-kind",
        default="system",
        choices=["application", "system", "infrastructure"],
        help="Archetype that controls prompt + diagram style. application=class diagram, system=cloud architecture (default), infrastructure=topology.",
    )
    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)
    # When provider is "auto", infer from question keywords. Falling back
    # to AWS unconditionally (the previous behavior) meant users never
    # got GCP / Azure diagrams unless they explicitly picked the
    # provider — even when the question literally said "Cloud Run" or
    # "Azure Functions".
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
            design_kind=args.design_kind,
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(1)

if __name__ == "__main__":
    main()
