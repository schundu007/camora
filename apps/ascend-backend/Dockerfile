# syntax=docker/dockerfile:1
# build-marker: 2026-05-12T23:59:00Z (forces Railway to invalidate stale Nixpacks snapshot)
# Custom Dockerfile (replaces nixpacks.toml). Reason: Nixpacks bakes every
# Railway service variable into the image as ARG/ENV — including JWT_SECRET,
# STRIPE_SECRET_KEY, OPENAI_API_KEY, etc. — which lands those values in the
# image layer history (`docker history`). Owning the Dockerfile lets us NEVER
# reference secrets at build time; Railway still injects them at runtime via
# the container's process environment, which is what `process.env.X` reads.

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# System packages — mirrors the previous nixpacks `nixPkgs` list:
#   python3 + venv (diagrams + anthropic), graphviz (architecture diagrams),
#   gcc / golang / rustc / openjdk17 (used for code execution in solve flow),
#   font packages (so graphviz/librsvg render labels with our chosen fonts).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl bash unzip \
      python3 python3-venv \
      graphviz \
      git \
      gcc \
      golang \
      rustc cargo \
      openjdk-17-jdk-headless \
      fonts-liberation fonts-dejavu \
      fontconfig libfontconfig1 \
      libfreetype6 \
      librsvg2-bin \
      ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# TypeScript was in the old nixpkgs list — install via npm so we don't depend
# on Debian's TS packaging cadence.
RUN npm install -g typescript

# hadolint — Dockerfile linter for playground /run endpoint
# --retry: GitHub releases occasionally returns 5xx transiently
RUN curl -fsSL --retry 3 --retry-delay 5 \
    https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64 \
    -o /usr/local/bin/hadolint \
 && chmod +x /usr/local/bin/hadolint

# shfmt — Bash formatter; available in bookworm repos (avoids flaky GitHub download)
RUN apt-get update && apt-get install -y --no-install-recommends shfmt \
 && rm -rf /var/lib/apt/lists/*

# Terraform — validate + plan for playground /run endpoint
RUN curl -fsSL --retry 3 --retry-delay 5 \
    https://releases.hashicorp.com/terraform/1.9.5/terraform_1.9.5_linux_amd64.zip \
    -o /tmp/terraform.zip \
 && unzip /tmp/terraform.zip -d /usr/local/bin \
 && rm /tmp/terraform.zip \
 && mkdir -p /terraform-plugin-cache /tmp/tf-warmup \
 && printf 'terraform {\n  required_providers {\n    null   = { source = "hashicorp/null" }\n    random = { source = "hashicorp/random" }\n  }\n}\n' > /tmp/tf-warmup/main.tf \
 && TF_PLUGIN_CACHE_DIR=/terraform-plugin-cache terraform -chdir=/tmp/tf-warmup init -backend=false -no-color || true \
 && rm -rf /tmp/tf-warmup

WORKDIR /app

# Install JS deps first so source-only changes don't bust this layer.
# package.json no longer references `workspace:*`, so plain `npm install`
# works inside this single-package build context.
COPY package.json ./
RUN npm install --no-audit --no-fund --omit=optional

# Python venv used by the diagram generation pipeline (services/diagram-*).
RUN python3 -m venv /app/.venv \
 && /app/.venv/bin/pip install --no-cache-dir diagrams google-genai ruff black radon pytest

# Rebuild the font cache so freshly-added fonts are visible to graphviz/rsvg.
RUN fc-cache -fv || true

# App source last — the most-changed layer, smallest cache invalidation cost.
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY data/ ./data/

ENV PATH="/app/.venv/bin:${PATH}"

EXPOSE 3009

# Runtime env (DATABASE_URL, JWT_SECRET, STRIPE_*, etc.) is injected by
# Railway at container start — NOT baked into the image.
CMD ["node", "src/index.js"]
