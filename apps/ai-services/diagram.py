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
3. The Diagram constructor MUST be `Diagram("…", show=False, filename="output", outformat="png", direction="LR", graph_attr={{"splines": "ortho", "nodesep": "0.6", "ranksep": "1.0", "fontsize": "16"}})`. `direction="LR"` (left-to-right) keeps the diagram readable as nodes are added; the default top-down produces a narrow vertical column.
4. Group related services with `Cluster(...)` blocks AND give each cluster `graph_attr={{"bgcolor": "<pastel hex>", "pencolor": "<darker hex>", "style": "rounded", "fontsize": "14"}}` so the layers are visually distinct (e.g. Edge → Application → Data → Async → Observability are separate colored regions, not one undifferentiated grid).
5. Use descriptive labels for each node (one or two words).
6. Use `Edge(label="…")` on the hot-path connections; leave secondary links unlabeled to reduce visual clutter.
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
    """Heterogeneous-CSP / multi-cloud architecture.

    The single-provider _build_system_prompt forces an AWS-only stack
    even when the question explicitly spans cloud providers — the
    resulting diagram looks like one CSP doing everything, which
    misrepresents the answer. This prompt switches to a horizontal
    grouped-cluster layout where each CSP / on-prem region is its own
    side-by-side cluster, with shared control-plane / IaC / workload
    clusters above and below — matching the visual grammar of the
    references the user provided.
    """
    return f"""You are an expert multi-cloud architect. Generate Python code using the `diagrams` library to create a HETEROGENEOUS / MULTI-CLOUD architecture diagram.

REQUIREMENTS:
1. This is a MULTI-CSP question — the diagram MUST show two or more cloud provider regions side by side (e.g. "CSP A — API-driven", "CSP B — Bare-metal handoff", "CSP C — Hybrid", "On-prem"), each as its own `Cluster`. Do NOT collapse everything into a single AWS stack.
2. Use `from diagrams import Diagram, Cluster, Edge` plus a MIX of provider-specific and generic shape modules:

from diagrams.generic.compute import Rack
from diagrams.generic.storage import Storage
from diagrams.generic.network import Subnet, Switch, Router
from diagrams.generic.os import LinuxGeneral
from diagrams.programming.flowchart import Action, Document, Database
from diagrams.onprem.container import Docker, Containerd
from diagrams.k8s.compute import Pod, Deployment
from diagrams.onprem.ci import GitlabCI, GithubActions, Jenkins
from diagrams.onprem.gitops import ArgoCD, Flux
from diagrams.onprem.iac import Terraform, Ansible
from diagrams.onprem.monitoring import Prometheus, Grafana
from diagrams.onprem.vcs import Github, Gitlab
from diagrams.onprem.network import Nginx
from diagrams.aws.compute import EKS
from diagrams.gcp.compute import GKE
from diagrams.azure.compute import AKS

3. The Diagram constructor MUST be `Diagram("…", show=False, filename="output", outformat="png", direction="LR", graph_attr={{"splines": "ortho", "nodesep": "0.7", "ranksep": "1.2", "fontsize": "16", "compound": "true"}})`. Horizontal layout is REQUIRED — the per-CSP columns must read left-to-right.
4. Use NESTED `Cluster` blocks. Top-level groups (each their own colored cluster):
   - Control Plane / Orchestration  (bgcolor=#E8F0FF, pencolor=#3B5BDB)
   - IaC & Config Management        (bgcolor=#FFF8DC, pencolor=#C9A227)
   - Cloud Providers (Heterogeneous) (bgcolor=#FFE8F0, pencolor=#C9184A) — contains one nested Cluster per CSP
   - Production Workloads           (bgcolor=#F0E8FF, pencolor=#7048E8)
   Each cluster: `graph_attr={{"bgcolor": "<hex>", "pencolor": "<hex>", "style": "rounded", "fontsize": "14", "labeljust": "l"}}`.
5. Use `Edge(label="…", color="<hex>")` on cross-cluster flows ("provision", "import IPs", "bootstrap", "deploy AI apps", "GPU capacity"). Use `Edge(style="dashed")` for the "manual handoff" / fallback path so it's visually distinct from the API-driven happy path.
6. Each CSP cluster should show its differentiator: API-driven (Terraform → managed k8s), Bare-metal (Document for IP-list + Action for kubeconfig), Hybrid (mix of IaC + manual). Don't repeat the same node set in every CSP cluster.
7. Detail level: {detail_text}

IMPORTANT:
- Output ONLY the Python code, no explanations or markdown.
- The code must be a single self-contained script.
- Only import from the `diagrams` package.
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
    return f"""You are an expert software designer. Generate Python code using the `diagrams` library to create a CLASS / COMPONENT diagram for an application or OOP design.

REQUIREMENTS:
1. This is an APPLICATION DESIGN — show classes, methods, and module relationships. Do NOT draw a cloud architecture (no CDN, no Load Balancer, no S3).
2. Use `from diagrams import Diagram, Cluster, Edge` and these provider-agnostic shape modules:
{
"from diagrams.programming.flowchart import Action, Decision, Document, InputOutput, StartEnd, Database\n"
"from diagrams.generic.storage import Storage\n"
"from diagrams.generic.compute import Rack"
}
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
    return f"""You are an expert distributed-systems engineer. Generate Python code using the `diagrams` library to draw the TOPOLOGY of a single infrastructure component (CDN, message queue, distributed cache, rate limiter, load balancer, etc.).

REQUIREMENTS:
1. This is an INFRASTRUCTURE COMPONENT — show shards/replicas, the data plane, and a separate control plane. Do NOT draw a multi-tier app stack (no "App Servers" → "Cache" → "DB" sequence; that's product-system design).
2. Use `from diagrams import Diagram, Cluster, Edge` and these provider-agnostic shape modules:
{
"from diagrams.generic.compute import Rack\n"
"from diagrams.generic.storage import Storage\n"
"from diagrams.generic.network import Subnet, Switch, Router, Firewall\n"
"from diagrams.generic.database import SQL\n"
"from diagrams.programming.flowchart import Action"
}
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
        "open(", "io.open", "shutil.", "pathlib", "Path(",
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
