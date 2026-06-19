FROM chundubabu/pg-k8s-multi:latest

ENV ETCD_VERSION=3.5.14

RUN apt-get update && apt-get install -y --no-install-recommends curl wget && rm -rf /var/lib/apt/lists/*

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
