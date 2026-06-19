FROM chundubabu/pg-k8s-single:latest

ENV ETCD_VERSION=3.5.14

RUN apt-get update && apt-get install -y curl wget && rm -rf /var/lib/apt/lists/*

# Remove any broken alias lines the base image may have baked into bash.bashrc
RUN sed -i '/^alias etcd-logs=/d; /^alias ll=/d' /etc/bash.bashrc 2>/dev/null || true

# Install etcdctl + etcdutl
RUN curl -fsSL "https://github.com/etcd-io/etcd/releases/download/v${ETCD_VERSION}/etcd-v${ETCD_VERSION}-linux-amd64.tar.gz" \
    | tar xz --strip-components=1 -C /usr/local/bin \
      "etcd-v${ETCD_VERSION}-linux-amd64/etcdctl" \
      "etcd-v${ETCD_VERSION}-linux-amd64/etcdutl"

# Install code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh

RUN mkdir -p /home/learner/labs/etcd

COPY labs/etcd/ /home/learner/labs/etcd/
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 7681 8080
CMD ["/start.sh"]

# learner user (non-root, passwordless sudo)
RUN useradd -m -s /bin/bash learner && \
    echo 'learner ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    mkdir -p /home/learner/.kube /home/learner/labs/etcd

COPY labs/etcd/ /home/learner/labs/etcd/
RUN chmod +x /home/learner/labs/etcd/*.sh && \
    chown -R learner:learner /home/learner

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 7681 8080
CMD ["/start.sh"]
