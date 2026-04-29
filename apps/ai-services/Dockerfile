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
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        graphviz \
    && rm -rf /var/lib/apt/lists/*

# Bring over the installed Python packages and console scripts. We skip
# the entire build toolchain.
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /app
COPY . .

RUN mkdir -p /data/embeddings

EXPOSE 8001
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}
