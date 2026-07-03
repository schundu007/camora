"""
Generic architecture-diagram renderer (Python `diagrams` + Graphviz).

Reads a provider-agnostic spec (nodes typed by role, clusters, edges) and
renders clean left-to-right PNGs with real AWS / Azure / GCP icons — free,
deterministic, and consistent across every topic. Replaces the costly,
top-to-bottom, unreadable Eraser renders.

Spec schema:
  {
    "title": str,
    "direction": "LR" | "TB",         # default LR
    "clusters": [{"id": str, "label": str}],
    "nodes":    [{"id": str, "label": str, "type": str, "cluster": str?}],
    "edges":    [{"from": str, "to": str, "label": str?,
                  "kind": "main"|"control"?, "style": "solid"|"dashed"?}]
  }

`type` is a role (dns, cdn, lb, cache, compute, storage, waf, tls, db, queue,
apigw, function, container, analytics, eventbus, users, client, mobile,
internet, firewall, monitor, secrets). Each role maps to an icon per provider,
with a neutral box fallback so an unknown type never breaks a render.
"""
from __future__ import annotations
import importlib

# role -> {provider: "module:ClassName"}
ICONS: dict[str, dict[str, str]] = {
    "users":     {"*": "diagrams.onprem.client:Users"},
    "client":    {"*": "diagrams.onprem.client:Client"},
    "internet":  {"*": "diagrams.generic.network:Firewall"},
    "dns":       {"aws": "diagrams.aws.network:Route53",       "azure": "diagrams.azure.network:DNSZones",           "gcp": "diagrams.gcp.network:DNS"},
    "cdn":       {"aws": "diagrams.aws.network:CloudFront",    "azure": "diagrams.azure.network:CDNProfiles",        "gcp": "diagrams.gcp.network:CDN"},
    "lb":        {"aws": "diagrams.aws.network:ELB",           "azure": "diagrams.azure.network:LoadBalancers",      "gcp": "diagrams.gcp.network:LoadBalancing"},
    "apigw":     {"aws": "diagrams.aws.network:APIGateway",    "azure": "diagrams.azure.integration:APIManagement",  "gcp": "diagrams.gcp.api:APIGateway"},
    "waf":       {"aws": "diagrams.aws.security:WAF",          "azure": "diagrams.azure.network:ApplicationGateway", "gcp": "diagrams.gcp.security:SecurityCommandCenter"},
    "firewall":  {"aws": "diagrams.aws.security:Shield",       "azure": "diagrams.azure.network:Firewall",           "gcp": "diagrams.gcp.security:SecurityCommandCenter"},
    "tls":       {"aws": "diagrams.aws.security:CertificateManager", "azure": "diagrams.azure.security:KeyVaults",   "gcp": "diagrams.gcp.security:KeyManagementService"},
    "secrets":   {"aws": "diagrams.aws.security:SecretsManager","azure": "diagrams.azure.security:KeyVaults",        "gcp": "diagrams.gcp.security:KeyManagementService"},
    "compute":   {"aws": "diagrams.aws.compute:EC2",          "azure": "diagrams.azure.compute:VM",                 "gcp": "diagrams.gcp.compute:ComputeEngine"},
    "container": {"aws": "diagrams.aws.compute:ECS",          "azure": "diagrams.azure.compute:ContainerInstances", "gcp": "diagrams.gcp.compute:KubernetesEngine"},
    "function":  {"aws": "diagrams.aws.compute:Lambda",       "azure": "diagrams.azure.compute:FunctionApps",       "gcp": "diagrams.gcp.compute:Functions"},
    "storage":   {"aws": "diagrams.aws.storage:S3",           "azure": "diagrams.azure.storage:BlobStorage",        "gcp": "diagrams.gcp.storage:Storage"},
    "db":        {"aws": "diagrams.aws.database:RDS",         "azure": "diagrams.azure.database:SQLDatabases",      "gcp": "diagrams.gcp.database:SQL"},
    "nosql":     {"aws": "diagrams.aws.database:Dynamodb",    "azure": "diagrams.azure.database:CosmosDb",          "gcp": "diagrams.gcp.database:Firestore"},
    "cache":     {"aws": "diagrams.aws.database:ElastiCache", "azure": "diagrams.azure.database:CacheForRedis",     "gcp": "diagrams.gcp.database:Memorystore"},
    "queue":     {"aws": "diagrams.aws.integration:SQS",      "azure": "diagrams.azure.integration:ServiceBus",     "gcp": "diagrams.gcp.analytics:PubSub"},
    "eventbus":  {"aws": "diagrams.aws.integration:Eventbridge","azure": "diagrams.azure.integration:EventGridTopics","gcp": "diagrams.gcp.analytics:PubSub"},
    "stream":    {"aws": "diagrams.aws.analytics:Kinesis",    "azure": "diagrams.azure.analytics:EventHubs",        "gcp": "diagrams.gcp.analytics:Dataflow"},
    "analytics": {"aws": "diagrams.aws.management:Cloudwatch","azure": "diagrams.azure.analytics:AnalysisServices", "gcp": "diagrams.gcp.analytics:Bigquery"},
    "monitor":   {"aws": "diagrams.aws.management:Cloudwatch","azure": "diagrams.azure.devops:ApplicationInsights", "gcp": "diagrams.gcp.operations:Monitoring"},
    "search":    {"aws": "diagrams.aws.analytics:ElasticsearchService", "azure": "diagrams.azure.web:Search",       "gcp": "diagrams.gcp.analytics:Dataproc"},
    "mobile":    {"*": "diagrams.onprem.client:Client"},
}

GRAPH_ATTR = {
    "splines": "ortho", "nodesep": "0.55", "ranksep": "1.25", "pad": "0.6",
    "fontname": "Helvetica", "fontsize": "13", "bgcolor": "white", "dpi": "150", "compound": "true",
}
NODE_ATTR = {"fontname": "Helvetica", "fontsize": "12"}
EDGE_ATTR = {"fontname": "Helvetica", "fontsize": "10", "color": "#64748b"}

MAIN_COLOR = "#1e3a5f"
FLOW_COLOR = "#334155"
CTRL_COLOR = "#b45309"


def _resolve(type_: str, provider: str):
    spec = ICONS.get(type_) or ICONS["compute"]
    ref = spec.get(provider) or spec.get("*") or next(iter(spec.values()))
    mod, cls = ref.split(":")
    try:
        return getattr(importlib.import_module(mod), cls)
    except Exception:
        from diagrams.generic.blank import Blank
        return Blank


def render(spec: dict, provider: str, out_path: str) -> None:
    from diagrams import Diagram, Cluster, Edge

    direction = spec.get("direction", "LR")
    clusters = {c["id"]: c for c in spec.get("clusters", [])}
    nodes_by_cluster: dict[str | None, list[dict]] = {}
    for n in spec["nodes"]:
        nodes_by_cluster.setdefault(n.get("cluster"), []).append(n)

    handles: dict[str, object] = {}

    with Diagram(spec.get("title", ""), filename=out_path, outformat="png", show=False,
                 direction=direction, graph_attr=GRAPH_ATTR, node_attr=NODE_ATTR, edge_attr=EDGE_ATTR):
        # Clustered nodes first (grouped), then loose nodes.
        for cid, cl in clusters.items():
            with Cluster(cl.get("label", "")):
                for n in nodes_by_cluster.get(cid, []):
                    handles[n["id"]] = _resolve(n["type"], provider)(n.get("label", n["id"]))
        for n in nodes_by_cluster.get(None, []):
            handles[n["id"]] = _resolve(n["type"], provider)(n.get("label", n["id"]))

        for e in spec.get("edges", []):
            a, b = handles.get(e["from"]), handles.get(e["to"])
            if a is None or b is None:
                continue
            control = e.get("kind") == "control"
            style = e.get("style") or ("dashed" if control else "solid")
            color = CTRL_COLOR if control else (MAIN_COLOR if e.get("kind") == "main" else FLOW_COLOR)
            a >> Edge(label=e.get("label", ""), style=style, color=color) >> b


if __name__ == "__main__":
    import json, sys
    spec = json.load(open(sys.argv[1]))
    render(spec, sys.argv[2], sys.argv[3])
    print("rendered", sys.argv[3] + ".png")
