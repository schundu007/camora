# ─────────────────────────────────────────────────────────────────────────────
# Camora AI Services — multi-stage build, CPU-only PyTorch
#
# The previous single-stage build came out at ~3 GB. Two changes:
#
# 1. CPU-only PyTorch wheel (saves ~1 GB).
#    `resemblyzer` depends on `torch`. PyPI's default torch wheel ships
#    with the CUDA bundle (~1.4 GB). Railway has no GPU and resemblyzer's
#    speaker-verification inference runs fine on CPU. Pulling from
#    https://download.pytorch.org/whl/cpu drops it to ~200 MB.
#
# 2. Multi-stage build (saves ~500 MB).
#    The previous image shipped `gcc`, `build-essential`, `python3-dev`
#    in the runtime layer. Those are install-time only — multi-stage
#    leaves them in the builder image and copies just the installed
#    site-packages into a clean runtime.
#
# Net: ~3 GB → ~1.2 GB.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: builder — has compiler toolchain + dev headers ────────────────
FROM python:3.11-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        build-essential \
        python3-dev \
        graphviz \
        graphviz-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Install CPU-only torch FIRST so resemblyzer's transitive `torch`
# dependency resolves to the already-present CPU wheel instead of
# downloading the CUDA-bundled default.
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
       --index-url https://download.pytorch.org/whl/cpu \
       torch==2.5.1 torchaudio==2.5.1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime — slim, no compiler toolchain ─────────────────────────
FROM python:3.11-slim

# Runtime-only system packages: graphviz binary (the diagrams library
# shells out to `dot` at request time), ffmpeg (audio decoding for
# resemblyzer / speaker verification).
# libgd3 + libpng16-16: required for Graphviz to render PNG stencil icons
# in `diagrams` cloud architecture nodes (image= attribute in DOT source).
# Without these, `dot -Tpng` silently produces empty rectangles instead.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        graphviz \
        libgd3 \
        libpng16-16 \
        libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

# Bring over the installed Python packages and console scripts. We skip
# the entire build toolchain.
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /app
COPY . .

RUN mkdir -p /data/embeddings

# Verify diagrams library PNG resources are bundled and Graphviz can render
# icons into a PNG. A diagram without icons is tiny (<5 KB); the test fails
# the build if icons are missing so this is caught before deployment.
RUN python3 - <<'EOF'
import os, sys, subprocess, tempfile

# 1. Check icon files are present in the installed package
import diagrams as _d
icons_dir = os.path.join(os.path.dirname(_d.__file__), "resources", "aws", "compute")
if not os.path.isdir(icons_dir):
    sys.exit(f"FAIL: diagrams resources missing at {icons_dir}")
pngs = [f for f in os.listdir(icons_dir) if f.endswith(".png")]
if not pngs:
    sys.exit(f"FAIL: no PNG icons found in {icons_dir}")
print(f"OK: {len(pngs)} AWS compute icons found")

# 2. Render a minimal diagram and check the output is large enough to
#    contain icon data (icon-free PNGs are typically < 5 KB).
code = """
from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
with Diagram("smoke", show=False, filename="output", outformat="png", direction="LR"):
    EC2("API") >> RDS("DB")
"""
with tempfile.TemporaryDirectory() as tmp:
    script = os.path.join(tmp, "t.py")
    with open(script, "w") as f:
        f.write(code)
    r = subprocess.run([sys.executable, script], cwd=tmp, capture_output=True, timeout=30)
    if r.returncode != 0:
        sys.exit(f"FAIL: diagram render: {r.stderr.decode()[:400]}")
    png = os.path.join(tmp, "output.png")
    size = os.path.getsize(png) if os.path.exists(png) else 0
    if size < 5000:
        sys.exit(f"FAIL: output.png is {size} bytes — icons are likely not rendering")
    print(f"OK: diagram rendered with icons ({size} bytes)")
EOF

# Pre-download resemblyzer weights at build time so first-request inference
# is instant. Without this, VoiceEncoder() downloads on the first enroll
# call, blocks the async event loop for several seconds (CPU-bound + network),
# and causes /speaker/status to time out while /speaker/enroll returns 500.
RUN python -c "from resemblyzer import VoiceEncoder; VoiceEncoder(); print('resemblyzer weights cached')"

EXPOSE 8001
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}
