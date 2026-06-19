FROM ubuntu:22.04

LABEL maintainer="chundubabu@gmail.com"
LABEL description="Camora etcd single-node playground (etcd v3.5.14)"

ENV DEBIAN_FRONTEND=noninteractive \
    ETCD_VERSION=3.5.14 \
    TTYD_VERSION=1.7.7 \
    ETCDCTL_API=3 \
    ETCDCTL_ENDPOINTS=http://127.0.0.1:2379

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
# learner user (non-root, passwordless sudo)
# ---------------------------------------------------------------------------
RUN useradd -m -s /bin/bash learner && \
    echo 'learner ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# ---------------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------------
RUN mkdir -p \
    /var/lib/etcd \
    /etc/etcd \
    /var/log \
    /home/learner/labs

# ---------------------------------------------------------------------------
# Environment (persistent for learner shells)
# ---------------------------------------------------------------------------
RUN echo '' >> /home/learner/.bashrc && \
    echo '# etcd environment' >> /home/learner/.bashrc && \
    echo 'export ETCDCTL_API=3' >> /home/learner/.bashrc && \
    echo 'export ETCDCTL_ENDPOINTS=http://127.0.0.1:2379' >> /home/learner/.bashrc && \
    echo "alias etcd-logs=\'tail -f /var/log/etcd.log\'" >> /home/learner/.bashrc && \
    echo "alias ll=\'ls -la\'" >> /home/learner/.bashrc

# ---------------------------------------------------------------------------
# Lab scripts
# ---------------------------------------------------------------------------
COPY labs/ /home/learner/labs/
COPY README.md /home/learner/README.md

RUN chmod +x /home/learner/labs/*.sh && \
    chown -R learner:learner /home/learner

# ---------------------------------------------------------------------------
# start.sh
# ---------------------------------------------------------------------------
COPY start.sh /start.sh
RUN chmod +x /start.sh

RUN mkdir -p /home/learner/.local/share/code-server/User && \
    printf '{\n  "workbench.startupEditor": "none",\n  "workbench.colorTheme": "Default Dark+"\n}\n' \
    > /home/learner/.local/share/code-server/User/settings.json && \
    chown -R learner:learner /home/learner/.local

# ---------------------------------------------------------------------------
# code-server config for learner (no auth, 0.0.0.0:8080)
# ---------------------------------------------------------------------------
RUN mkdir -p /home/learner/.config/code-server && \
    printf 'bind-addr: 0.0.0.0:8080\nauth: none\npassword:\ncert: false\n' \
    > /home/learner/.config/code-server/config.yaml && \
    chown -R learner:learner /home/learner/.config

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
