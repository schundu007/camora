FROM ubuntu:22.04

LABEL maintainer="chundubabu@gmail.com"
LABEL description="Camora etcd cluster-node playground (etcd v3.5.14) — run 3 of these"

ENV DEBIAN_FRONTEND=noninteractive \
    ETCD_VERSION=3.5.14 \
    TTYD_VERSION=1.7.7 \
    ETCDCTL_API=3

# ---------------------------------------------------------------------------
# System packages
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    bash \
    coreutils \
    procps \
    iproute2 \
    iputils-ping \
    dnsutils \
    jq \
    vim \
    nano \
    less \
    tree \
    htop \
    sudo \
    openssl \
    tar \
    gzip \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# etcd + etcdctl + etcdutl
# ---------------------------------------------------------------------------
RUN ARCH=amd64 && \
    curl -fsSL "https://github.com/etcd-io/etcd/releases/download/v${ETCD_VERSION}/etcd-v${ETCD_VERSION}-linux-${ARCH}.tar.gz" \
        -o /tmp/etcd.tar.gz && \
    tar xzf /tmp/etcd.tar.gz -C /tmp && \
    mv "/tmp/etcd-v${ETCD_VERSION}-linux-${ARCH}/etcd"    /usr/local/bin/etcd && \
    mv "/tmp/etcd-v${ETCD_VERSION}-linux-${ARCH}/etcdctl"  /usr/local/bin/etcdctl && \
    mv "/tmp/etcd-v${ETCD_VERSION}-linux-${ARCH}/etcdutl"  /usr/local/bin/etcdutl && \
    chmod +x /usr/local/bin/etcd /usr/local/bin/etcdctl /usr/local/bin/etcdutl && \
    rm -rf /tmp/etcd*

# ---------------------------------------------------------------------------
# ttyd (web terminal)
# ---------------------------------------------------------------------------
RUN curl -fsSL "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64" \
        -o /usr/local/bin/ttyd && \
    chmod +x /usr/local/bin/ttyd

# ---------------------------------------------------------------------------
# code-server (VS Code in browser)
# ---------------------------------------------------------------------------
RUN curl -fsSL https://code-server.dev/install.sh | sh

# ---------------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------------
RUN mkdir -p \
    /var/lib/etcd \
    /etc/etcd \
    /var/log \
    /home/learner/labs \
    /usr/share/etcd

# ---------------------------------------------------------------------------
# Environment (persistent for all shells)
# Set ETCDCTL_ENDPOINTS to all 3 nodes for cluster-wide commands.
# NODE_NAME and CLUSTER_NODES are injected at runtime via docker run -e.
# ---------------------------------------------------------------------------
RUN echo '' >> /etc/bash.bashrc && \
    echo '# etcd cluster environment' >> /etc/bash.bashrc && \
    echo 'export ETCDCTL_API=3' >> /etc/bash.bashrc && \
    echo 'export ETCDCTL_ENDPOINTS="http://etcd1:2379,http://etcd2:2379,http://etcd3:2379"' >> /etc/bash.bashrc && \
    echo "alias etcd-logs='tail -f /var/log/etcd.log'" >> /etc/bash.bashrc && \
    echo "alias cluster-status='etcdctl endpoint status --cluster -w table'" >> /etc/bash.bashrc && \
    echo "alias cluster-health='etcdctl endpoint health --cluster'" >> /etc/bash.bashrc && \
    echo "alias ll='ls -la'" >> /etc/bash.bashrc

# ---------------------------------------------------------------------------
# Helper scripts and labs
# ---------------------------------------------------------------------------
COPY usr/share/etcd/ /usr/share/etcd/
COPY labs/ /home/learner/labs/
COPY README.md /home/learner/README.md

RUN chmod +x /usr/share/etcd/*.sh && \
    chmod +x /home/learner/labs/*.sh && \
    chown -R root:root /home/learner /usr/share/etcd

# ---------------------------------------------------------------------------
# start.sh
# ---------------------------------------------------------------------------
COPY start.sh /start.sh
RUN chmod +x /start.sh

# ---------------------------------------------------------------------------
# code-server config (no auth)
# ---------------------------------------------------------------------------
RUN mkdir -p /root/.config/code-server && \
    cat > /root/.config/code-server/config.yaml << 'EOF'
bind-addr: 0.0.0.0:8080
auth: none
password:
cert: false
EOF

# ---------------------------------------------------------------------------
# Ports
# ---------------------------------------------------------------------------
EXPOSE 2379 2380 8080 7681

# ---------------------------------------------------------------------------
# Data volume
# ---------------------------------------------------------------------------
VOLUME ["/var/lib/etcd"]

WORKDIR /home/learner

CMD ["/start.sh"]
