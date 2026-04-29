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
    user_id: Optional[int] = None


class DiagramResponse(BaseModel):
    image: str  # base64-encoded PNG
    code: str   # Python source that produced it


def _build_prompt(question: str, cloud_provider: str, detail_level: str) -> str:
    """Construct the system + user prompt for generating diagrams code."""
    detail_text = DETAIL_GUIDANCE.get(detail_level, DETAIL_GUIDANCE["medium"])

    provider_imports = {
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

    example_imports = provider_imports.get(cloud_provider, provider_imports["aws"])

    return f"""You are an expert cloud architect. Generate Python code using the `diagrams` library to create a cloud architecture diagram.

REQUIREMENTS:
1. The diagram must use the `{cloud_provider}` provider from the diagrams library.
2. Use `from diagrams import Diagram, Cluster, Edge` and relevant {cloud_provider} node imports.
3. The code MUST use `show=False` and `filename="output"` in the Diagram constructor so it saves to a file without trying to open a viewer.
4. The `outformat` parameter MUST be set to `"png"`.
5. Use `Cluster` blocks to logically group related services.
6. Use descriptive labels for each node.
7. Use `Edge` with labels where helpful to show data flow.
8. Detail level: {detail_text}

AVAILABLE IMPORTS (use only what is needed, you may import other valid diagrams.{cloud_provider}.* modules):
{example_imports}

IMPORTANT:
- Output ONLY the Python code, no explanations or markdown.
- Do NOT use `plt.show()` or any interactive display.
- Do NOT use `os.system()` or any shell commands.
- The code must be a single self-contained script.
- Only import from the `diagrams` package.
- Make sure the Diagram context manager has `show=False, filename="output", outformat="png"`.

Generate a diagram for this architecture question:
{question}"""


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


def _sanitize_code(code: str) -> str:
    """Basic sanitisation to block obviously dangerous patterns."""
    blocked = [
        "os.system",
        "subprocess",
        "__import__",
        "eval(",
        "exec(",
        "open(",
        "shutil.rmtree",
        "pathlib",
        "importlib",
    ]
    for pattern in blocked:
        if pattern in code:
            raise ValueError(f"Generated code contains blocked pattern: {pattern}")

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
    prompt = _build_prompt(request.question, cloud_provider, detail_level)

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

        result = subprocess.run(
            [sys.executable, script_path],
            cwd=tmpdir,
            capture_output=True,
            timeout=60,
        )

        if result.returncode != 0:
            stderr = result.stderr.decode(errors="replace")
            logger.error("Diagram script failed:\n%s", stderr)
            raise HTTPException(
                status_code=500,
                detail=f"Diagram generation failed: {stderr[:500]}",
            )

        # The diagrams library writes <filename>.png
        png_path = os.path.join(tmpdir, "output.png")
        if not os.path.exists(png_path):
            # Sometimes the library appends the diagram name — search for any PNG
            pngs = [f for f in os.listdir(tmpdir) if f.endswith(".png")]
            if pngs:
                png_path = os.path.join(tmpdir, pngs[0])
            else:
                raise HTTPException(
                    status_code=500,
                    detail="Diagram code ran but no PNG was produced",
                )

        with open(png_path, "rb") as img:
            image_bytes = img.read()

    # --- Step 4: return base64 JSON ---
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    return DiagramResponse(image=image_b64, code=code)
