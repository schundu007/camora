# syntax=docker/dockerfile:1
# build-marker: 2026-04-26T05:55:00Z (forces Railway to invalidate stale Nixpacks snapshot)
# Custom Dockerfile (replaces nixpacks.toml). See ascend-backend/Dockerfile
# for the full rationale — short version: Nixpacks bakes every Railway service
# variable into the image as ARG/ENV, leaking secrets into the layer history.
# A custom Dockerfile lets us avoid touching secrets at build time entirely.

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# Lumora's "run code in N languages" feature (services/codeRunner.js) needs
# interpreters/compilers for the supported languages. We mirror the previous
# nixpacks `nixPkgs` list using Debian apt packages where they exist.
#
# NOT included here (require third-party install paths and aren't worth the
# build risk for the immediate deploy fix): dart, kotlin, swift. The runner
# already returns a clear "language not supported" error if the binary is
# absent. Re-add them in a follow-up commit when needed.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      # Audio + diagnostics
      ffmpeg curl ca-certificates bash \
      # Core toolchains
      python3 python3-venv \
      ruby \
      gcc g++ build-essential \
      openjdk-17-jdk-headless \
      golang \
      rustc cargo \
      # Scripting languages
      php-cli \
      perl \
      lua5.4 \
      # Functional + statistical
      ghc \
      r-base-core \
      elixir \
      ocaml \
      # JVM ecosystem
      scala \
      clojure \
      # .NET via Mono
      mono-runtime mono-mcs \
      # Dynamic
      tcl \
 && rm -rf /var/lib/apt/lists/*

# Julia — installed via juliaup because the Debian-packaged Julia is older
# than the language pack expects, and the upstream nixpkgs julia binary
# wasn't cache-available (which is why the old nixpacks.toml also went
# through juliaup).
RUN curl -fsSL https://install.julialang.org \
      | sh -s -- --yes -p /opt/juliaup --default-channel release \
 && ln -sf /opt/juliaup/bin/julia /usr/local/bin/julia \
 && ln -sf /opt/juliaup/bin/juliaup /usr/local/bin/juliaup

WORKDIR /app

# Install JS deps first so source-only changes don't bust this layer.
COPY package.json ./
RUN npm install --no-audit --no-fund --omit=optional

# App source last — most-changed layer, smallest cache invalidation cost.
COPY src/ ./src/

EXPOSE 8000

# Runtime env (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, OPENAI_API_KEY,
# DEEPGRAM_API_KEY, STRIPE_*, etc.) is injected by Railway at container
# start — NOT baked into the image.
CMD ["node", "src/index.js"]
