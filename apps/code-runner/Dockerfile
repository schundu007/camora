FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 gcc g++ golang rustc cargo ruby perl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-package-lock
COPY src ./src

RUN useradd --create-home --shell /usr/sbin/nologin runner \
    && mkdir -p /tmp/code-runner \
    && chown -R runner:runner /app /tmp/code-runner

ENV NODE_ENV=production
ENV TMPDIR=/tmp/code-runner
USER runner

EXPOSE 4000
CMD ["node", "src/index.js"]
