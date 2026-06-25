"""Diagram generation endpoints.

Uses the Anthropic API to generate Python code that leverages the `diagrams`
library, then executes that code in a temp directory to produce a PNG
architecture diagram.
"""

import base64
import logging
import os
import re
import subprocess
import sys
import tempfile
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import anthropic

logger = logging.getLogger(__name__)

router = APIRouter()

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

VALID_PROVIDERS = {"aws", "gcp", "azure"}
VALID_DETAIL_LEVELS = {"high", "medium", "low"}
VALID_DESIGN_KINDS = {"application", "system", "infrastructure", "multi_cloud"}

# Maps detail_level to rough guidance for the LLM
DETAIL_GUIDANCE = {
    "high": "Include all relevant services, data flows, networking components, security layers, and redundancy. Use Clusters to group related services.",
    "medium": "Include the main services and their connections. Use Clusters for logical grouping. Keep it readable but informative.",
    "low": "Show only the core components and primary data flow. Keep it minimal and clean.",
}


class DiagramRequest(BaseModel):
    question: str
    cloud_provider: str = Field(default="aws")
    detail_level: Optional[str] = None
    design_kind: Optional[str] = Field(default="system")
    user_id: Optional[int] = None


class DiagramResponse(BaseModel):
    image: str  # base64-encoded PNG
    code: str   # Python source that produced it


_PROVIDER_IMPORTS = {
    "aws": (
        "from diagrams.aws.compute import EC2, ECS, Lambda\n"
        "from diagrams.aws.database import RDS, Dynamodb, ElastiCache\n"
        "from diagrams.aws.network import ELB, CloudFront, Route53, APIGateway\n"
        "from diagrams.aws.storage import S3\n"
        "from diagrams.aws.integration import SQS, SNS\n"
        "from diagrams.aws.security import IAM, Cognito\n"
        "from diagrams.aws.analytics import Kinesis"
    ),
    "gcp": (
        "from diagrams.gcp.compute import ComputeEngine, Functions, Run\n"
        "from diagrams.gcp.database import SQL, Datastore, Memorystore\n"
        "from diagrams.gcp.network import LoadBalancing, CDN, DNS\n"
        "from diagrams.gcp.storage import GCS\n"
        "from diagrams.gcp.analytics import PubSub, BigQuery"
    ),
    "azure": (
        "from diagrams.azure.compute import VM, FunctionApps, ContainerInstances\n"
        "from diagrams.azure.database import SQLDatabases, CosmosDb, CacheForRedis\n"
        "from diagrams.azure.network import LoadBalancers, FrontDoors, ApplicationGateway\n"
        "from diagrams.azure.storage import BlobStorage\n"
        "from diagrams.azure.integration import ServiceBus"
    ),
}


def _build_system_prompt(question: str, cloud_provider: str, detail_text: str) -> str:
    """Distributed system architecture (Twitter, Uber, WhatsApp).

    Cloud-provider-flavored layered diagram: clients → CDN/LB → app
    services → cache → DB → async/queue → monitoring. Tuned for a
    horizontal grouped-cluster layout — the previous version produced
    a narrow vertical AWS-icon stack that was hard to read once the
    diagram had more than ~10 nodes.
    """
    example_imports = _PROVIDER_IMPORTS.get(cloud_provider, _PROVIDER_IMPORTS["aws"])
    return f"""You are an expert cloud architect. Generate Python code using the `diagrams` library to create a cloud architecture diagram.

REQUIREMENTS:
1. The diagram should primarily use the `{cloud_provider}` provider, but you may also import from `diagrams.generic.*` and `diagrams.onprem.*` for components that don't have a clean provider equivalent (CI/CD, k8s, monitoring stacks).
2. Use `from diagrams import Diagram, Cluster, Edge` and relevant {cloud_provider} node imports.
3. The Diagram constructor MUST be `Diagram("…", show=False, filename="output", outformat="png", direction="LR", graph_attr={{"splines": "ortho", "nodesep": "0.5", "ranksep": "0.9", "fontsize": "12", "dpi": "200"}}, node_attr={{"fontsize": "10", "margin": "0.25,0.06", "labelloc": "b", "width": "0.8", "height": "0.8"}})`. `direction="LR"` (left-to-right) lays layers side-by-side. DO NOT use direction="TB".
4. Group related services with `Cluster(...)` blocks AND give each cluster `graph_attr={{"bgcolor": "<pastel hex>", "pencolor": "<darker hex>", "style": "rounded", "fontsize": "13"}}` so the layers are visually distinct (e.g. Edge → Application → Data → Async → Observability are separate colored regions).
5. Use SHORT labels — 1-2 words max per node (e.g. `EC2("API GW")` not `EC2("API Gateway Service")`). For compound names use `\\n` (e.g. `Lambda("Build\\nQueue")`). Long labels overflow the icon box and make the diagram unreadable.
6. Use `Edge(label="…")` on the hot-path connections only (3-5 total); leave all secondary links unlabeled to reduce clutter.
7. Detail level: {detail_text}

AVAILABLE IMPORTS (use only what is needed, you may import other valid diagrams.{cloud_provider}.* modules):
{example_imports}

IMPORTANT:
- Output ONLY the Python code, no explanations or markdown.
- Do NOT use `plt.show()` or any interactive display.
- Do NOT use `os.system()` or any shell commands.
- The code must be a single self-contained script.
- Only import from the `diagrams` package.
- The Diagram context manager MUST include `show=False, filename="output", outformat="png", direction="LR"`.

Generate a diagram for this architecture question:
{question}"""


def _build_multi_cloud_prompt(question: str, detail_text: str) -> str:
    """Heterogeneous-CSP / multi-cloud architecture — Excalidraw-style.

    The single-provider _build_system_prompt forces an AWS-only stack
    even when the question explicitly spans cloud providers — the
    resulting diagram looks like one CSP doing everything, which
    misrepresents the answer.

    This prompt deliberately AVOIDS provider logos (AWS / GCP / Azure /
    Terraform / Ansible / ArgoCD service marks) in favour of plain
    text-labeled rectangles grouped by colored clusters. The reference
    diagrams the user wants to match are whiteboard-style: a few crisp
    boxes per cluster, labels carry the meaning, no decorative service
    icons. `diagrams.generic.blank.Blank` is the closest the diagrams
    library gets to "rectangle with text", so we lean on it heavily.
    """
    return f"""You are an expert multi-cloud architect. Generate Python code using the `diagrams` library to create a HETEROGENEOUS / MULTI-CLOUD architecture diagram in WHITEBOARD / EXCALIDRAW style — clean text-labeled rectangles grouped into colored clusters, NO cloud-vendor service icons.

REQUIREMENTS:
1. This is a MULTI-CSP question — the diagram MUST show two or more cloud provider regions side by side (e.g. "CSP A — API-driven", "CSP B — Bare-metal handoff", "CSP C — Hybrid", "On-prem"), each as its own `Cluster`. Do NOT collapse everything into a single AWS stack.
2. Use `from diagrams import Diagram, Cluster, Edge` plus ONLY these shape modules — no AWS / GCP / Azure / Onprem provider icons:

from diagrams.generic.blank import Blank
from diagrams.generic.network import Subnet, Switch, Router, Firewall
from diagrams.generic.storage import Storage
from diagrams.programming.flowchart import Action, Document, Database, InputOutput, Decision

   `Blank` is the default — use it for ANY component that would otherwise be an AWS/GCP/Azure/Terraform/Ansible/ArgoCD logo. The label carries the meaning ("Provisioning API\\n(Cluster Spec)", "Terraform\\nAPI-driven CSPs", "Ansible\\nnode bootstrap"). Use `Document` for spec-files (IP lists, kubeconfigs), `Database` for state stores, `Storage` for blob/object storage, `InputOutput` for external feeds. Network shapes (Subnet/Switch/Router/Firewall) only when actually drawing network topology.
3. The Diagram constructor MUST be `Diagram("…", show=False, filename="output", outformat="png", direction="LR", graph_attr={{"splines": "ortho", "nodesep": "0.5", "ranksep": "0.9", "fontsize": "12", "dpi": "200", "compound": "true", "bgcolor": "white"}}, node_attr={{"fontsize": "10", "margin": "0.25,0.06"}})`. Horizontal layout is REQUIRED — the per-CSP columns must read left-to-right. DO NOT use direction="TB".
4. Use NESTED `Cluster` blocks with colored backgrounds + thick borders, mirroring the reference whiteboard style:
   - Control Plane / Orchestration   (bgcolor=#E8F0FF, pencolor=#3B5BDB, fontcolor=#1E40AF)
   - IaC & Config Management         (bgcolor=#FFFBEB, pencolor=#C9A227, fontcolor=#92400E)
   - Cloud Providers (Heterogeneous) (bgcolor=#FFE8F0, pencolor=#C9184A, fontcolor=#9D174D) — nested: one Cluster per CSP, each with its own pastel bgcolor
   - Production Workloads            (bgcolor=#F0E8FF, pencolor=#7048E8, fontcolor=#5B21B6)
   Each cluster: `graph_attr={{"bgcolor": "<hex>", "pencolor": "<hex>", "fontcolor": "<hex>", "style": "rounded", "fontsize": "14", "fontname": "Helvetica-Bold", "labeljust": "l", "penwidth": "2"}}`.
5. Multi-line labels are encouraged: `Blank("Provisioning API\\n(Cluster Spec)")`, `Blank("Manual Importer\\nIP list + kubeconfig")`. The second line gives context the way an Excalidraw diagram would.
6. Use `Edge(label="…", color="<hex>", fontsize="11")` on cross-cluster flows ("provision", "import IPs", "bootstrap", "deploy AI apps", "GPU capacity"). Use `Edge(style="dashed", color="#9CA3AF")` for the "manual handoff" / fallback path so it's visually distinct from the API-driven happy path.
7. Each CSP cluster should show its differentiator: API-driven (Blank "GPU VMs / Managed k8s\\nTerraform provider"), Bare-metal (Document "Google Doc\\nIP list" + Blank "kubeconfig\\nManual import"), Hybrid (mix). Don't repeat the same node set in every CSP cluster.
8. Detail level: {detail_text}

IMPORTANT:
- Output ONLY the Python code, no explanations or markdown.
- The code must be a single self-contained script.
- Only import from the `diagrams` package, and ONLY from the modules listed in requirement 2 (no diagrams.aws, diagrams.gcp, diagrams.azure, diagrams.onprem, diagrams.k8s — they all carry vendor logos that break the whiteboard aesthetic).
- The Diagram context manager MUST include `show=False, filename="output", outformat="png", direction="LR"`.
- Do NOT collapse to a single-provider stack — the multi-CSP grouping is the WHOLE POINT of this archetype.

Generate a multi-cloud architecture diagram for this question:
{question}"""


def _build_application_prompt(question: str, detail_text: str) -> str:
    """Application / OOP / LLD design (LRU cache, parking lot, REST API).

    Class-and-component diagram. NO cloud nodes — this is software
    structure, not infrastructure. Boxes are classes / modules /
    interfaces; edges are method calls or data flow between them.
    """
    app_imports = (
        "from diagrams.programming.flowchart import Action, Decision, Document, InputOutput, StartEnd, Database\n"
        "from diagrams.generic.storage import Storage\n"
        "from diagrams.generic.compute import Rack"
    )
    return f"""You are an expert software designer. Generate Python code using the `diagrams` library to create a CLASS / COMPONENT diagram for an application or OOP design.

REQUIREMENTS:
1. This is an APPLICATION DESIGN — show classes, methods, and module relationships. Do NOT draw a cloud architecture (no CDN, no Load Balancer, no S3).
2. Use `from diagrams import Diagram, Cluster, Edge` and these provider-agnostic shape modules:
{app_imports}
3. Each `Action(...)` represents a class or component (label = class name + ":<method>" if useful).
4. Use `Cluster` to group classes that belong to the same module / package.
5. Use `Edge(label="…")` to show method calls, data flow, or composition relationships ("uses", "creates", "stores in").
6. The Diagram constructor MUST be `Diagram("…", show=False, filename="output", outformat="png")`.
7. Detail level: {detail_text}

IMPORTANT:
- Output ONLY the Python code, no explanations or markdown.
- The diagram should reflect the CLASS STRUCTURE of the design, not infrastructure.
- For data structures (HashMap, DoublyLinkedList, Tree, Heap), use `Database(...)` from flowchart with the structure name.
- Only import from the `diagrams` package.
- The diagram must be a single self-contained script.

Generate a class/component diagram for this application design question:
{question}"""


def _build_infrastructure_prompt(question: str, detail_text: str) -> str:
    """Infrastructure component design (CDN, message queue, distributed cache).

    Topology / data-plane diagram. Emphasis: shards/replicas, control
    plane vs data plane, network paths. Avoids the multi-tier app
    stack — this is one infra component, drawn at protocol level.
    """
    infra_imports = (
        "from diagrams.generic.compute import Rack\n"
        "from diagrams.generic.storage import Storage\n"
        "from diagrams.generic.network import Subnet, Switch, Router, Firewall\n"
        "from diagrams.generic.database import SQL\n"
        "from diagrams.programming.flowchart import Action"
    )
    return f"""You are an expert distributed-systems engineer. Generate Python code using the `diagrams` library to draw the TOPOLOGY of a single infrastructure component (CDN, message queue, distributed cache, rate limiter, load balancer, etc.).

REQUIREMENTS:
1. This is an INFRASTRUCTURE COMPONENT — show shards/replicas, the data plane, and a separate control plane. Do NOT draw a multi-tier app stack (no "App Servers" → "Cache" → "DB" sequence; that's product-system design).
2. Use `from diagrams import Diagram, Cluster, Edge` and these provider-agnostic shape modules:
{infra_imports}
3. Use TWO Clusters: one for the DATA PLANE (the shards/replicas serving requests) and one for the CONTROL PLANE (config/coordination, e.g. ZK, etcd, gossip).
4. Use `Edge(label="replicate", style="dashed")` for replication links between data-plane nodes.
5. Use `Edge(label="…")` with descriptive labels on the request hot path (e.g. "consistent hash → shard").
6. The Diagram constructor MUST be `Diagram("…", show=False, filename="output", outformat="png")`.
7. Detail level: {detail_text}

IMPORTANT:
- Output ONLY the Python code, no explanations or markdown.
- The diagram should reflect the COMPONENT'S INTERNAL TOPOLOGY, not a multi-tier app stack.
- Only import from the `diagrams` package.
- The diagram must be a single self-contained script.

Generate a topology diagram for this infrastructure component design question:
{question}"""


def _build_prompt(question: str, cloud_provider: str, detail_level: str, design_kind: str = "system") -> str:
    """Construct the prompt for generating diagram code.

    Branches by design_kind so an LRU-cache question doesn't get a
    CDN-LB-Cache-DB diagram, a CDN question doesn't get a generic
    multi-tier app stack, and a multi-cloud question doesn't collapse
    to a single-provider AWS-icon column.
    """
    detail_text = DETAIL_GUIDANCE.get(detail_level, DETAIL_GUIDANCE["medium"])
    kind = design_kind if design_kind in VALID_DESIGN_KINDS else "system"
    if kind == "application":
        return _build_application_prompt(question, detail_text)
    if kind == "infrastructure":
        return _build_infrastructure_prompt(question, detail_text)
    if kind == "multi_cloud":
        return _build_multi_cloud_prompt(question, detail_text)
    return _build_system_prompt(question, cloud_provider, detail_text)


def _extract_python_code(text: str) -> str:
    """Extract Python code from the LLM response.

    Handles both raw code and markdown-fenced code blocks.
    """
    # Try to extract from markdown code fence
    match = re.search(r"```(?:python)?\s*\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # If no code fence, treat the whole response as code
    return text.strip()


import ast as _ast


# Modules the diagrams DSL needs. Anything else is rejected at import
# time. `diagrams.*` covers Diagram, Cluster, Edge, plus every cloud
# provider node submodule (diagrams.aws.compute, diagrams.gcp.network,
# etc.). The `diagrams` parent and the unconditional shape submodules
# are also added because some prompts use `from diagrams.generic`.
_ALLOWED_TOP_LEVEL_MODULES = ("diagrams",)

# Names that may NEVER appear as a Name / Attribute access in the
# generated code, regardless of context. These are the canonical
# Python sandbox-escape primitives — getting at any one of them is
# enough to construct a bypass via __subclasses__ / __mro__ etc.
_FORBIDDEN_NAMES = frozenset({
    "__import__", "__builtins__", "__loader__", "__spec__",
    "__class__", "__bases__", "__mro__", "__subclasses__",
    "__globals__", "__locals__", "__dict__", "__module__",
    "__init_subclass__", "__getattribute__", "__getattr__",
    "__base__", "__weakref__",
    "eval", "exec", "compile", "open",
    "getattr", "setattr", "delattr", "vars", "globals", "locals",
    "input", "exit", "quit", "help",
    "memoryview", "object",
    "breakpoint",
})


def _ast_walk_safe(tree: _ast.AST) -> None:
    """Walk every node and reject Python the diagram sandbox shouldn't
    accept. Defense-in-depth: this catches the bypasses the substring
    pre-check misses (Unicode escape, string concat, dunder traversal,
    `().__class__.__bases__[0].__subclasses__()`, etc.).

    Allowed:
      • Imports of `diagrams` and its submodules.
      • Name / attribute / call / literal / control flow within the
        `diagrams` DSL surface.
    Rejected:
      • Any Name in _FORBIDDEN_NAMES.
      • Any Attribute access whose attr is in _FORBIDDEN_NAMES (so
        `obj.__class__` is blocked even when the obj is unknown).
      • Any Attribute whose attr starts with `__` and ends with `__`
        — broad dunder block, no legit diagram code needs them.
      • Any `from X import Y` / `import X` where X isn't in
        _ALLOWED_TOP_LEVEL_MODULES.
      • Any Subscript whose value is a Name in _FORBIDDEN_NAMES
        (e.g. `__builtins__['eval']`).
    """
    for node in _ast.walk(tree):
        if isinstance(node, _ast.Import):
            for alias in node.names:
                root = alias.name.split(".", 1)[0]
                if root not in _ALLOWED_TOP_LEVEL_MODULES:
                    raise ValueError(
                        f"Generated code imports disallowed module: {alias.name}"
                    )
        elif isinstance(node, _ast.ImportFrom):
            mod = (node.module or "").split(".", 1)[0]
            if mod not in _ALLOWED_TOP_LEVEL_MODULES:
                raise ValueError(
                    f"Generated code imports disallowed module: {node.module}"
                )
        elif isinstance(node, _ast.Name):
            if node.id in _FORBIDDEN_NAMES:
                raise ValueError(
                    f"Generated code references forbidden name: {node.id}"
                )
        elif isinstance(node, _ast.Attribute):
            attr = node.attr
            if attr in _FORBIDDEN_NAMES:
                raise ValueError(
                    f"Generated code accesses forbidden attribute: .{attr}"
                )
            # Block every dunder attribute. Legit diagram code never
            # needs them; the only reason to walk dunder chains is to
            # break out of the sandbox.
            if attr.startswith("__") and attr.endswith("__") and len(attr) > 4:
                raise ValueError(
                    f"Generated code accesses dunder attribute: .{attr}"
                )
        elif isinstance(node, _ast.Subscript):
            value = node.value
            if isinstance(value, _ast.Name) and value.id in _FORBIDDEN_NAMES:
                raise ValueError(
                    f"Generated code subscripts forbidden name: {value.id}"
                )


def _sanitize_code(code: str) -> str:
    """Defense-in-depth code review on LLM output before subprocess exec.

    Two layers:
      1. A fast substring pre-check that rejects obviously dangerous
         tokens at literal text level. Bypassable in isolation but
         cheap and catches the common cases without parsing.
      2. An AST-level walk that catches the pre-check's blind spots —
         Unicode-escaped names (\\u006fs.system passes step 1), string-
         concat dunder access (`'ev'+'al'` resolved at runtime via
         getattr), `__class__.__bases__[0].__subclasses__()` walks,
         `__builtins__['eval']` subscripts, and disallowed imports.

    The real security boundary is still the OS-level subprocess
    sandbox (Docker user / seccomp / network namespace), which is
    NOT implemented here — these checks raise the cost of bypass but
    aren't a substitute for kernel-level isolation. Track the sandbox
    work in the security audit follow-ups.
    """
    blocked = [
        # Direct module access
        "os.system", "os.popen", "os.exec",
        "subprocess",
        "importlib", "import_module",
        "__import__",
        "__builtins__", "builtins.",
        # Dynamic execution
        "eval(", "exec(", "compile(",
        "getattr(", "vars(", "globals(", "locals(",
        # File / shell IO outside the diagrams render path
        "io.open", "shutil.", "pathlib", "Path(",
        # Networking
        "socket", "urllib", "requests",
        "http.client", "httpx",
        # Dangerous deserialisers
        "pickle", "marshal", "shelve", "yaml.load",
    ]
    lowered = code.lower()
    for pattern in blocked:
        if pattern.lower() in lowered:
            raise ValueError(f"Generated code contains blocked pattern: {pattern}")

    # AST pass — definitive check. Any parse failure here is itself a
    # rejection: legit diagrams code is always parseable Python.
    try:
        tree = _ast.parse(code, filename="<llm-diagram>", mode="exec")
    except SyntaxError as exc:
        raise ValueError(f"Generated code is not valid Python: {exc.msg}") from exc
    _ast_walk_safe(tree)

    # Ensure show=False is present
    if "show=False" not in code:
        code = code.replace(
            "Diagram(",
            'Diagram(show=False, ',
        )

    # Enforce direction="LR" — LLM often ignores the prompt and emits TB,
    # producing a narrow vertical stack that's unreadable in the panel.
    import re as _re
    if 'direction="LR"' not in code and "direction='LR'" not in code:
        code = _re.sub(r'Diagram\s*\(', 'Diagram(direction="LR", ', code, count=1)

    # Inject dpi="200" into graph_attr for crisp PNG output.
    # Clamp nodesep/ranksep down to avoid wasted whitespace, and cap fontsize
    # at 13 so cluster labels don't dwarf the node icons.
    def _patch_graph_attr(m: _re.Match) -> str:
        inner = m.group(1)
        if '"dpi"' not in inner and "'dpi'" not in inner:
            inner = '"dpi": "200", ' + inner
        else:
            inner = _re.sub(r'"dpi"\s*:\s*"\d+"', '"dpi": "200"', inner)
        inner = _re.sub(r'"nodesep"\s*:\s*"([\d.]+)"',
                        lambda fm: '"nodesep": "0.5"' if float(fm.group(1)) > 0.5 else fm.group(0),
                        inner)
        inner = _re.sub(r'"ranksep"\s*:\s*"([\d.]+)"',
                        lambda fm: '"ranksep": "0.9"' if float(fm.group(1)) > 0.9 else fm.group(0),
                        inner)
        inner = _re.sub(r'"fontsize"\s*:\s*"(\d+)"',
                        lambda fm: '"fontsize": "12"' if int(fm.group(1)) > 13 else fm.group(0),
                        inner)
        return 'graph_attr={' + inner + '}'

    code = _re.sub(r'graph_attr\s*=\s*\{([^}]+)\}', _patch_graph_attr, code, count=1)

    # Inject node_attr with tight margins and small font if the LLM omitted it.
    # This prevents long labels from overflowing the icon bounding box.
    if 'node_attr' not in code:
        code = _re.sub(
            r'(graph_attr\s*=\s*\{[^}]+\})',
            r'\1, node_attr={"fontsize": "10", "margin": "0.25,0.06", "labelloc": "b", "width": "0.8", "height": "0.8"}',
            code, count=1,
        )

    return code


@router.post("/diagram/generate")
async def generate_diagram(request: DiagramRequest):
    """Generate an architecture diagram from a natural-language question.

    1. Call the Anthropic API to produce Python `diagrams` library code.
    2. Execute the code in a temp directory to render a PNG.
    3. Return the base64-encoded PNG and the source code.
    """

    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not configured",
        )

    cloud_provider = request.cloud_provider.lower()
    if cloud_provider not in VALID_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail=f"cloud_provider must be one of {VALID_PROVIDERS}",
        )

    detail_level = (request.detail_level or "medium").lower()
    if detail_level not in VALID_DETAIL_LEVELS:
        raise HTTPException(
            status_code=400,
            detail=f"detail_level must be one of {VALID_DETAIL_LEVELS}",
        )

    # --- Step 1: generate code via Anthropic API ---
    prompt = _build_prompt(request.question, cloud_provider, detail_level, request.design_kind or "system")

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_response = message.content[0].text
    except anthropic.APIError as exc:
        logger.error("Anthropic API error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {exc}")

    # --- Step 2: extract and sanitise the generated code ---
    code = _extract_python_code(raw_response)

    try:
        code = _sanitize_code(code)
    except ValueError as exc:
        logger.warning("Generated code failed sanitisation: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Generated code failed safety check: {exc}",
        )

    # --- Step 3: execute in a temp directory ---
    with tempfile.TemporaryDirectory() as tmpdir:
        script_path = os.path.join(tmpdir, "generate_diagram.py")
        with open(script_path, "w") as f:
            f.write(code)

        # Lower timeout to 15s — a legitimate `diagrams` render is
        # sub-second; 60s only helped attacker-controlled code reach
        # external services. Strip env so the subprocess can't see the
        # parent's secrets (ANTHROPIC_API_KEY, AI_SERVICES_API_KEY,
        # DATABASE_URL, etc.); only PATH + a minimal HOME survive so
        # graphviz's `dot` binary can still be located.
        sandboxed_env = {
            "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
            "HOME": tmpdir,
            "PYTHONDONTWRITEBYTECODE": "1",
        }
        result = subprocess.run(
            [sys.executable, "-I", script_path],
            cwd=tmpdir,
            capture_output=True,
            timeout=15,
            env=sandboxed_env,
        )

        if result.returncode != 0:
            stderr = result.stderr.decode(errors="replace")
            logger.error("Diagram script failed:\n%s", stderr)
            raise HTTPException(
                status_code=500,
                detail=f"Diagram generation failed: {stderr[:500]}",
            )

        # The diagrams library writes <filename>.png. Earlier code fell
        # back to "first PNG in tmpdir" if output.png was missing — but
        # that's an exfil channel: a sandbox-bypassed payload could
        # write arbitrary bytes to any *.png filename in tmpdir and the
        # API would round-trip them as the answer. Now we only honour
        # the literal output.png path; missing-file is a 500 with a
        # clear error so the prompt can be tightened.
        png_path = os.path.join(tmpdir, "output.png")
        if not os.path.exists(png_path):
            raise HTTPException(
                status_code=500,
                detail="Diagram code ran but no PNG was produced",
            )

        with open(png_path, "rb") as img:
            image_bytes = img.read()

    # --- Step 4: return base64 JSON ---
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    return DiagramResponse(image=image_b64, code=code)
