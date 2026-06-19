FROM chundubabu/pg-k8s-single:latest

ENV ETCD_VERSION=3.5.14

RUN apt-get update && apt-get install -y curl wget && rm -rf /var/lib/apt/lists/*

# Install etcdctl + etcdutl
RUN curl -fsSL "https://github.com/etcd-io/etcd/releases/download/v${ETCD_VERSION}/etcd-v${ETCD_VERSION}-linux-amd64.tar.gz" \
    | tar xz --strip-components=1 -C /usr/local/bin \
      "etcd-v${ETCD_VERSION}-linux-amd64/etcdctl" \
      "etcd-v${ETCD_VERSION}-linux-amd64/etcdutl"

# Install code-server
RUN curl -fsSL https://code-server.dev/install.sh | sh

# learner user — idempotent (base image may already have it)
RUN id learner 2>/dev/null || useradd -m -s /bin/bash learner && \
    grep -q 'learner ALL' /etc/sudoers || echo 'learner ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    mkdir -p /home/learner/.kube /home/learner/labs/etcd

COPY labs/etcd/ /home/learner/labs/etcd/
RUN chmod +x /home/learner/labs/etcd/*.sh && \
    chown -R learner:learner /home/learner

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 7681 8080
CMD ["/start.sh"]
