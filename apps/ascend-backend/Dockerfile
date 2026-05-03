# syntax=docker/dockerfile:1
# build-marker: 2026-04-26T18:00:00Z (forces Railway to invalidate stale Nixpacks snapshot)
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
      ca-certificates curl bash \
      python3 python3-venv \
      graphviz \
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

WORKDIR /app

# Install JS deps first so source-only changes don't bust this layer.
# package.json no longer references `workspace:*`, so plain `npm install`
# works inside this single-package build context.
COPY package.json ./
RUN npm install --no-audit --no-fund --omit=optional

# Python venv used by the diagram generation pipeline (services/diagram-*).
RUN python3 -m venv /app/.venv \
 && /app/.venv/bin/pip install --no-cache-dir diagrams anthropic

# Rebuild the font cache so freshly-added fonts are visible to graphviz/rsvg.
RUN fc-cache -fv || true

# App source last — the most-changed layer, smallest cache invalidation cost.
COPY src/ ./src/
COPY scripts/ ./scripts/

ENV PATH="/app/.venv/bin:${PATH}"

EXPOSE 3009

# Runtime env (DATABASE_URL, JWT_SECRET, STRIPE_*, etc.) is injected by
# Railway at container start — NOT baked into the image.
CMD ["node", "src/index.js"]
