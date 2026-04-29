# syntax=docker/dockerfile:1
# build-marker: 2026-04-28T22:00:00Z (forces Railway to invalidate stale snapshot
# after the language-runtime slimdown — drops ~2 GB of rarely-used languages)
#
# Custom Dockerfile (replaces nixpacks.toml). See ascend-backend/Dockerfile
# for the full rationale — short version: Nixpacks bakes every Railway service
# variable into the image as ARG/ENV, leaking secrets into the layer history.
# A custom Dockerfile lets us avoid touching secrets at build time entirely.

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# Lumora's "run code in N languages" feature (services/codeRunner.js) needs
# interpreters/compilers for the supported languages. The KEPT set covers
# the languages that actually show up in coding interviews.
#
# DROPPED for image-size + boot-time savings (~2 GB total):
#   - GHC (Haskell)         ~800 MB
#   - Mono (.NET)           ~300 MB
#   - R (r-base-core)       ~400 MB
#   - Scala + Clojure       ~600 MB
#   - OCaml                 ~80 MB
#   - Elixir                ~80 MB
#   - Julia (juliaup)       ~200 MB
#   - TCL                   ~30 MB
#
# Users in those languages still see the LLM-generated code (the model
# happily writes Haskell). Only the in-app "Run" button is unavailable —
# codeRunner.js returns a clear "language not supported" error.
#
# Re-add a language by adding the apt package here, restoring the runner
# config in services/codeRunner.js, and re-listing it in routes/coding.js
# SUPPORTED_LANGUAGES.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      # Audio + diagnostics
      ffmpeg curl ca-certificates bash \
      # Always-needed core
      python3 python3-venv \
      ruby \
      gcc g++ build-essential \
      openjdk-17-jdk-headless \
      golang \
      rustc cargo \
      # Common scripting
      php-cli \
      perl \
      lua5.4 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install JS deps first so source-only changes don't bust this layer.
COPY package.json ./
RUN npm install --no-audit --no-fund --omit=optional \
 && npm cache clean --force

# App source last — most-changed layer, smallest cache invalidation cost.
COPY src/ ./src/

EXPOSE 8000

# Runtime env (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, OPENAI_API_KEY,
# DEEPGRAM_API_KEY, STRIPE_*, etc.) is injected by Railway at container
# start — NOT baked into the image.
CMD ["node", "src/index.js"]
