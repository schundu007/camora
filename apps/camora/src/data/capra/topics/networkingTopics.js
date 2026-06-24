// Cloud & DevOps Networking — interview prep.
// Content sourced from AceCloudInterviews.com, RFC documents,
// AWS networking documentation, and production engineering practices.

export const networkingCategories = [
  { id: 'fundamentals',      name: 'TCP/IP & OSI Fundamentals',     icon: 'globe',        color: '#3b82f6' },
  { id: 'dns',               name: 'DNS & Service Discovery',        icon: 'search',       color: '#22c55e' },
  { id: 'loadbalancing',     name: 'Load Balancing & Proxies',       icon: 'gitBranch',    color: '#06b6d4' },
  { id: 'firewalls',         name: 'Firewalls & Zero Trust',         icon: 'shield',       color: '#ef4444' },
  { id: 'protocols',         name: 'Routing Protocols',              icon: 'share2',       color: '#8b5cf6' },
  { id: 'cloud-networking',  name: 'Cloud Networking (AWS/GCP/AZ)', icon: 'cloud',        color: '#f59e0b' },
  { id: 'troubleshooting',   name: 'Networking Troubleshooting',     icon: 'tool',         color: '#f97316' },
];

export const networkingTopicCategoryMap = {
  // Fundamentals
  'osi-model':                  'fundamentals',
  'tcp-ip-stack':               'fundamentals',
  'tcp-vs-udp':                 'fundamentals',
  'http-https-tls':             'fundamentals',
  'tls-ssl-handshake':          'fundamentals',
  'http2-http3':                'fundamentals',
  'websockets':                 'fundamentals',
  'ip-addressing-cidr':         'fundamentals',
  'nat-pat':                    'fundamentals',
  'router-vs-switch':           'fundamentals',
  'tcp-congestion-control':     'fundamentals',
  // DNS
  'dns-resolution':             'dns',
  'dns-record-types':           'dns',
  'dnssec':                     'dns',
  'dns-route53':                'dns',
  'split-horizon-dns':          'dns',
  'service-discovery':          'dns',
  'dns-caching':                'dns',
  // Load Balancing
  'lb-algorithms':              'loadbalancing',
  'l4-vs-l7-lb':                'loadbalancing',
  'health-checks':              'loadbalancing',
  'sticky-sessions':            'loadbalancing',
  'anycast':                    'loadbalancing',
  'nginx-haproxy':              'loadbalancing',
  'cdn-architecture':           'loadbalancing',
  'envoy-proxy':                'loadbalancing',
  'network-rate-limiting':      'loadbalancing',
  // Firewalls
  'iptables-nftables':          'firewalls',
  'aws-security-groups':        'firewalls',
  'aws-nacls':                  'firewalls',
  'zero-trust-networking':      'firewalls',
  'waf-ddos-protection':        'firewalls',
  'network-policies-k8s':       'firewalls',
  'mtls-spiffe':                'firewalls',
  // Protocols
  'bgp-routing':                'protocols',
  'ospf-eigrp':                 'protocols',
  'vlan-vxlan':                 'protocols',
  'sd-wan':                     'protocols',
  'mpls':                       'protocols',
  'grpc-vs-rest':               'protocols',
  'overlay-underlay-network':   'protocols',
  'quic-protocol':              'protocols',
  'ebpf-xdp':                   'protocols',
  // Cloud Networking
  'aws-vpc-design':             'cloud-networking',
  'vpc-peering':                'cloud-networking',
  'transit-gateway':            'cloud-networking',
  'aws-privatelink':            'cloud-networking',
  'direct-connect-vpn':        'cloud-networking',
  'hybrid-connectivity':        'cloud-networking',
  'service-mesh':               'cloud-networking',
  'wireguard-protocol':         'cloud-networking',
  // Troubleshooting
  'network-debugging-tools':    'troubleshooting',
  'packet-capture-analysis':    'troubleshooting',
  'latency-diagnosis':          'troubleshooting',
  'connectivity-failures':      'troubleshooting',
  'mtu-fragmentation':          'troubleshooting',
  'network-observability':      'troubleshooting',
  'network-chaos-engineering':  'troubleshooting',
  // New additions
  'ipv6-fundamentals':          'fundamentals',
  'cni-plugins-comparison':     'cloud-networking',
  'ipsec-vpn':                  'firewalls',
  'dns-over-https-tls':         'dns',
};

export const networkingTopics = [
  // ─── FUNDAMENTALS ──────────────────────────────────────────────────────────
  {
    id: 'osi-model',
    title: 'OSI & TCP/IP Models',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'Seven-layer OSI model, four-layer TCP/IP stack, encapsulation, and how HTTP maps to each layer.',
    visualizations: [
      {
        title: 'OSI vs TCP/IP Layer Mapping',
        caption: 'Seven-layer OSI model mapped to the four-layer TCP/IP stack, with the canonical diagnostic tool for each layer.',
        image: '/diagrams/networking/osi-model-layers.png',
      },
      {
        title: 'HTTP Request Encapsulation',
        caption: 'A single HTTPS GET request shown as nested protocol headers at each OSI layer, with AWS Security Group and NACL inspection points called out.',
        image: '/diagrams/networking/osi-model-encapsulation.png',
      },
    ],
    introduction: `The **OSI model** is a conceptual framework dividing network communication into seven layers:
- **Layer 1 — Physical**: bits and signals (cables, radio, fiber)
- **Layer 2 — Data Link**: MAC addressing, Ethernet frames, switches
- **Layer 3 — Network**: IP addressing and routing (routers, VPC route tables)
- **Layer 4 — Transport**: TCP (reliable, ordered) and UDP (connectionless)
- **Layer 5 — Session**: session establishment and teardown
- **Layer 6 — Presentation**: encoding, encryption (TLS spans L4-L6)
- **Layer 7 — Application**: HTTP, HTTPS, DNS, SMTP, gRPC

The **TCP/IP model** (the actual Internet stack) collapses OSI into four layers: **Link** (OSI 1-2), **Internet** (OSI 3), **Transport** (OSI 4), **Application** (OSI 5-7).

**Encapsulation** means each layer wraps the payload above with its own header as data travels down the stack, and strips headers traveling up (**decapsulation**). An HTTP request becomes: Application HTTP payload wrapped in Transport TCP segment wrapped in Network IP packet wrapped in Link Ethernet frame.

## Layers that matter most for DevOps

Understanding which layer a problem lives at determines the right tools and fixes:
- **Layer 3** — IP routing, VPC routing tables, Security Groups (stateful packet filter), ICMP
- **Layer 4** — TCP ports, NACLs (stateless L4 rules), TCP load balancers, connection tracking
- **Layer 7** — HTTP, ALB (application load balancer), WAF rules, application authentication

"Cannot reach the server" at Layer 3 (routing) requires different tools than "SSL handshake failed" at Layer 6 (TLS) or "authentication rejected" at Layer 7.`,
    whenToUse: [
      'Structuring a network debugging session — start at Layer 1/2/3 and work up',
      'Explaining the difference between ALB (L7) and NLB (L4) in AWS',
      'Explaining why NACLs are stateless (Layer 4) and Security Groups are stateful',
      'Justifying tool choice: ping for L3, nc for L4, curl for L7',
    ],
    keyConcepts: [
      { term: 'Encapsulation', definition: 'Each layer wraps the payload from the layer above with its own header (and sometimes trailer). TCP adds source/dest port; IP adds source/dest IP; Ethernet adds MAC addresses.' },
      { term: 'Layer 3 (Network)', definition: 'IP addressing and routing. Routers operate here. AWS VPC routing tables, Security Groups (stateful packet filter), and ICMP all operate at Layer 3.' },
      { term: 'Layer 4 (Transport)', definition: 'TCP (reliable, ordered, connection-oriented) and UDP (unreliable, connectionless). NACLs, NLB, and connection tracking operate here. TCP state machine lives here.' },
      { term: 'Layer 7 (Application)', definition: 'HTTP, HTTPS, DNS, SMTP, gRPC. ALB, WAF, API Gateway, and application authentication all operate here. Payloads are protocol-specific and require parsing.' },
      { term: 'PDU names by layer', definition: 'Layer 7: message/data; Layer 4: segment (TCP) / datagram (UDP); Layer 3: packet; Layer 2: frame; Layer 1: bit/signal.' },
    ],
    pitfalls: [
      'Diagnosing Layer 7 problems with Layer 3 tools — ping works but curl fails because the application is broken, not the network. Always test at the right layer.',
      'Confusing stateless vs stateful firewalls — NACLs are stateless (you must allow inbound AND outbound explicitly); Security Groups are stateful (return traffic is automatically allowed).',
      'Assuming OSI is implemented exactly as described — real protocols blur layer boundaries (e.g., TLS spans L4-L6, DNS runs on both UDP and TCP at L7).',
    ],
    keyQuestions: [
      {
        question: 'What happens at each layer when you type a URL in a browser and press Enter?',
        answer: `Layer 7 (Application): Browser parses the URL, determines scheme (HTTPS), hostname, and path. It constructs an HTTP/1.1 or HTTP/2 GET request. Before sending, it needs the IP address.

DNS resolution (Layer 7): Browser checks cache, then OS resolver, then recurses through DNS hierarchy to get the A record (IP address) for the hostname.

Layer 4 (Transport): Browser initiates a TCP three-way handshake to port 443 on the resolved IP. SYN sent, SYN-ACK received, ACK sent. Connection established. For TLS (HTTPS), a TLS handshake follows: ClientHello, ServerHello, certificate exchange, session key derivation.

Layer 3 (Network): The OS selects the source IP and the routing table determines the next hop (default gateway or a more specific route). IP packets are created with source and destination IP.

Layer 2 (Data Link): ARP resolves the next-hop IP to a MAC address. Ethernet frames are created with source and destination MAC. On a multi-hop path, MACs change at each router hop but IPs remain constant end-to-end.

Layer 1 (Physical): Electrical/optical/RF signals carry the bits to the network.

Return path follows the same layers in reverse. The HTTP response is decapsulated at each layer until the browser receives the HTML/CSS/JS and renders the page.`,
      },
      {
        question: 'What is the difference between AWS ALB and NLB? When do you choose each?',
        answer: `ALB (Application Load Balancer) operates at Layer 7 (HTTP/HTTPS). It can make routing decisions based on HTTP content: path (/api/* to service-a, /web/* to service-b), host headers, query strings, HTTP methods, and request headers. It terminates TLS and can serve multiple certificates via SNI. It has native WebSocket support. Targets are EC2, Lambda, ECS tasks, or IP addresses. It provides detailed access logs and request-level metrics.

NLB (Network Load Balancer) operates at Layer 4 (TCP/UDP/TLS). It passes packets through without reading HTTP content — pure TCP/UDP forwarding. Ultra-low latency (microseconds vs milliseconds for ALB). Preserves source IP (clients see the actual client IP). Supports static Elastic IP addresses (useful for IP whitelisting by third parties). Handles millions of requests per second.

Choose ALB when:
- You need content-based routing (microservices behind a single entry point)
- You need path-based or host-based routing
- Your targets are Lambda functions
- You need HTTP header manipulation, WAF integration, or request authentication
- gRPC is involved (ALB natively supports gRPC)

Choose NLB when:
- You need to preserve the client source IP at the target
- You need static IPs for the load balancer
- Ultra-low latency is required (gaming, trading, VoIP)
- You're load balancing non-HTTP protocols (custom TCP, UDP, SMTP)
- You need PrivateLink (NLB is the only type that integrates with AWS PrivateLink)

Both integrate with Auto Scaling, support health checks, and work with ECS and EKS.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html',
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html',
    ],
    quickFire: [
      { q: 'How many layers are in the OSI model?', a: 'Seven layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.' },
      { q: 'What layer does IP operate at?', a: 'Layer 3 (Network). IP handles addressing and routing between hosts.' },
      { q: 'What is the difference between TCP/IP and OSI models?', a: 'TCP/IP collapses OSI into 4 layers: Link (OSI 1-2), Internet (3), Transport (4), Application (5-7). OSI is conceptual; TCP/IP is the actual implemented stack.' },
      { q: 'What layer does a switch operate at versus a router?', a: 'A switch operates at Layer 2 (Data Link) using MAC addresses. A router operates at Layer 3 (Network) using IP addresses.' },
      { q: 'What is encapsulation in networking?', a: 'Each layer adds its own header (and sometimes trailer) wrapping the payload from the layer above as data travels down the stack toward transmission.' },
      { q: 'What is the PDU at Layer 4 for TCP?', a: 'A segment. Layer 3 uses packets, Layer 2 uses frames, Layer 1 uses bits.' },
      { q: 'At what layer does AWS ALB operate?', a: 'Layer 7 (Application). It routes based on HTTP content like path, host headers, and query strings.' },
      { q: 'At what layer does AWS NLB operate?', a: 'Layer 4 (Transport). It forwards TCP/UDP packets without reading HTTP content, preserving source IP.' },
      { q: 'Why are AWS NACLs stateless but Security Groups stateful?', a: 'NACLs operate at Layer 4 and evaluate each packet independently -- return traffic must be explicitly allowed. Security Groups track connection state so return traffic is automatically permitted.' },
      { q: 'Which OSI layer does TLS primarily operate at?', a: 'TLS spans Layers 4-6, but is commonly associated with Layer 4 (Transport) for connection security and Layer 6 (Presentation) for encryption/encoding.' },
    ],
  },

  {
    id: 'tls-ssl-handshake',
    title: 'TLS Handshake & Certificates',
    icon: 'globe',
    color: '#3b82f6',
    questions: 7,
    description: 'TLS 1.2 vs 1.3 handshake, certificate chain, mTLS, certificate rotation, and SNI.',
    visualizations: [
      {
        title: 'TLS 1.2 vs TLS 1.3 Handshake',
        caption: 'Side-by-side comparison of the 2-RTT TLS 1.2 and 1-RTT TLS 1.3 handshake flows, including the 0-RTT replay risk.',
        image: '/diagrams/networking/tls-ssl-handshake-comparison.png',
      },
      {
        title: 'mTLS — Mutual Certificate Authentication',
        caption: 'How a CA hierarchy issues client and server certs for mutual authentication, and how Istio/Envoy sidecars automate the rotation.',
        image: '/diagrams/networking/tls-ssl-handshake-mtls.png',
      },
    ],
    introduction: `TLS (Transport Layer Security) provides confidentiality, integrity, and authentication for network communications. TLS 1.3 (RFC 8446, 2018) is the current standard; TLS 1.2 is still widely deployed. TLS 1.0 and 1.1 are deprecated.

TLS 1.2 handshake (2 round trips): ClientHello (TLS version, cipher suites, random), ServerHello (chosen cipher, random), Certificate (server's cert chain), ServerKeyExchange (for ECDHE), ServerHelloDone; ClientKeyExchange, ChangeCipherSpec, Finished; ChangeCipherSpec, Finished. Then application data.

TLS 1.3 handshake (1 round trip): ClientHello includes key share (no more separate ServerKeyExchange). Server responds with all handshake messages in one flight. Application data can flow immediately after the server Finished. TLS 1.3 also supports 0-RTT session resumption (caution: 0-RTT data is replay-vulnerable).

Certificate chain: a server certificate is signed by an intermediate CA, which is signed by a root CA. Browsers trust root CAs in their trust store (managed by the OS or browser vendor). The server must send the full chain (leaf + intermediates) so the client can build the trust path to a trusted root.

SNI (Server Name Indication): a TLS extension in ClientHello that tells the server which hostname the client wants. This allows one IP to host multiple TLS sites with different certificates (virtual hosting for HTTPS). Load balancers use SNI to route TLS traffic before termination.

mTLS (mutual TLS): the client also presents a certificate, and the server validates it. Used for service-to-service authentication in microservices (service mesh) and API authentication. Both sides prove their identity cryptographically.`,
    whenToUse: [
      'Debugging "SSL handshake failed" errors with openssl s_client',
      'Explaining why HTTPS requires the full certificate chain, not just the leaf certificate',
      'Designing mTLS for internal service authentication in a microservices architecture',
      'Justifying TLS 1.3 over TLS 1.2 for performance-sensitive services',
    ],
    keyConcepts: [
      { term: 'Certificate chain', definition: 'Leaf cert (server) signed by intermediate CA, signed by root CA. Server must present the full chain. Client validates by building up to a trusted root in its trust store.' },
      { term: 'SNI (Server Name Indication)', definition: 'Extension in TLS ClientHello containing the desired hostname. Allows one IP to serve multiple TLS domains. Required for HTTPS virtual hosting.' },
      { term: 'ECDHE', definition: 'Elliptic Curve Diffie-Hellman Ephemeral. Key exchange algorithm providing forward secrecy — even if the private key is compromised later, past sessions cannot be decrypted.' },
      { term: 'mTLS', definition: 'Both client and server present and validate certificates. Client certificate authentication at the TLS layer. Used in service meshes (Istio, Linkerd) for zero-trust service auth.' },
      { term: 'Certificate transparency', definition: 'Public logs of all certificates issued by CAs. Browsers require CT logs for issued certs. Enables detection of mis-issued or fraudulent certificates.' },
    ],
    pitfalls: [
      'Sending only the leaf certificate without the intermediate CA chain — browsers may still work (they fetch intermediates via AIA) but mobile clients, curl, and microservices often fail with "unable to verify certificate chain."',
      'Setting certificate expiry without automated renewal — Let\'s Encrypt certs expire in 90 days. Use certbot renew in a cron job or cert-manager in Kubernetes. Many outages are caused by forgotten cert expiry.',
      'Using self-signed certificates in production without distributing the CA to all clients — every client must trust the CA that signed the certificate, or TLS validation fails.',
    ],
    keyQuestions: [
      {
        question: 'What is mTLS and when would you use it instead of regular TLS?',
        answer: `Regular TLS authenticates the server to the client (the client verifies the server's certificate). The client is not authenticated cryptographically at the TLS layer — authentication happens at the application layer (username/password, JWT tokens, API keys).

mTLS adds client certificate verification: the server also presents a "Certificate Request" during the handshake, the client responds with its own certificate and a signature proving it holds the private key, and the server validates the client certificate against a trusted CA.

When to use mTLS:
1. Service-to-service authentication: in a microservices architecture, each service has a certificate issued by an internal CA. Services only accept connections from other services with valid certificates. This is the zero-trust network model — "trust nothing, verify everything." Service meshes (Istio, Linkerd) automate mTLS provisioning, rotation, and enforcement.
2. API authentication: B2B APIs that require strong client identity without passwords. Stripe, AWS API, and mutual TLS-authenticated webhooks use client certificates.
3. Internal tooling: administrative APIs that should only be accessible with a hardware token or machine certificate.

Operational considerations: certificates must be rotated before expiry; short-lived certificates (24 hours) require automated issuance. Certificate revocation (CRL/OCSP) is operationally complex — short-lived certs sidestep this. Vault PKI or cert-manager are common solutions. Service meshes handle rotation transparently.`,
      },
      {
        question: 'How do you inspect a TLS connection to debug a certificate issue?',
        answer: `openssl s_client is the essential tool. It performs the full TLS handshake and shows the server's certificate chain, negotiated cipher, TLS version, and validation result.

Basic inspection:
openssl s_client -connect api.example.com:443 -servername api.example.com 2>/dev/null | openssl x509 -noout -dates -subject -issuer

Full chain and handshake details:
openssl s_client -connect api.example.com:443 -showcerts

Common problems and output to look for:
- "verify error:num=20:unable to get local issuer certificate": server is not sending the intermediate CA. Check server config — nginx needs ssl_certificate to include the full chain.
- "verify error:num=10:certificate has expired": cert expired. Check dates with -dates flag.
- "ssl handshake failure": TLS version or cipher mismatch. Try specifying: openssl s_client -tls1_2 or -tls1_3
- Certificate for wrong domain: check -subject for the CN and -ext san for Subject Alternative Names.

Testing specific TLS versions:
openssl s_client -connect api.example.com:443 -tls1_2   # Test TLS 1.2
openssl s_client -connect api.example.com:443 -no_tls1_3   # Disable TLS 1.3

Check expiry across multiple hosts (useful for monitoring):
echo | openssl s_client -connect $host:443 2>/dev/null | openssl x509 -noout -enddate

For containerized services, also check if the trust store inside the container has the CA: the container might have a different CA bundle than your laptop, causing "works locally, fails in pod."`,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc8446',
      'https://istio.io/latest/docs/concepts/security/#mutual-tls-authentication',
    ],
    quickFire: [
      { q: 'How many round trips does a TLS 1.3 handshake require?', a: '1 RTT for a new connection, 0-RTT for session resumption (though 0-RTT data is replay-vulnerable).' },
      { q: 'How many round trips does TLS 1.2 require?', a: '2 RTTs before application data can flow, compared to 1 RTT for TLS 1.3.' },
      { q: 'What is SNI and why is it needed?', a: 'Server Name Indication is a TLS ClientHello extension that tells the server which hostname the client wants, enabling one IP to host multiple TLS certificates (virtual hosting).' },
      { q: 'What is the difference between TLS and mTLS?', a: 'Standard TLS only authenticates the server. mTLS (mutual TLS) also authenticates the client via a client certificate, enabling cryptographic service-to-service identity.' },
      { q: 'What does ECDHE provide that RSA key exchange does not?', a: 'Forward secrecy -- each session uses ephemeral keys, so compromising the long-term private key cannot decrypt past sessions.' },
      { q: 'What is a certificate chain and why must the full chain be sent?', a: 'A chain of trust from the leaf certificate through intermediate CAs to a root CA. Servers must send leaf plus intermediates; clients need the chain to verify trust up to a trusted root.' },
      { q: 'What openssl command inspects a live TLS connection?', a: 'openssl s_client -connect hostname:443 -servername hostname -- shows certificate chain, cipher suite, TLS version, and validation errors.' },
      { q: 'What causes "unable to get local issuer certificate" in openssl?', a: 'The server is not sending the intermediate CA certificate. nginx needs ssl_certificate to include the full chain, not just the leaf cert.' },
      { q: 'Why do Let\'s Encrypt certificates expire in 90 days?', a: 'Short lifetimes limit exposure from key compromise and encourage automation (certbot, cert-manager). Manual renewal risk is the main cause of TLS outages.' },
      { q: 'How do service meshes like Istio handle mTLS?', a: 'Istio injects Envoy sidecar proxies that automatically issue short-lived certificates from an internal CA (Citadel/istiod) and rotate them, making mTLS transparent to application code.' },
    ],
  },

  // ─── DNS ───────────────────────────────────────────────────────────────────
  {
    id: 'dns-resolution',
    title: 'DNS Resolution',
    icon: 'search',
    color: '#22c55e',
    questions: 7,
    description: 'DNS hierarchy, recursive resolution, caching, TTL, negative caching, and DNSSEC validation.',
    visualizations: [
      {
        title: 'DNS Recursive Query Flow',
        caption: 'Full recursive resolution path from browser cache through root, TLD, and authoritative nameservers, with cache-hit and NXDOMAIN short-circuits.',
        image: '/diagrams/networking/dns-resolution-flow.png',
      },
      {
        title: 'DNS TTL & Propagation Delay',
        caption: 'Why changing an A record does not take effect immediately, and the standard pre-cutover TTL-lowering procedure to minimize stale-cache windows.',
        image: '/diagrams/networking/dns-resolution-ttl.png',
      },
    ],
    introduction: `DNS (Domain Name System) is the distributed hierarchical naming system that translates human-readable names to IP addresses. It is often called the "phone book of the internet," but a more accurate analogy is a distributed key-value store with hierarchical delegation and time-to-live caching.

The resolution hierarchy: root servers (13 root server clusters managed by IANA; they know who manages .com, .org, etc.) -> TLD nameservers (Verisign manages .com; they know who manages example.com) -> authoritative nameservers (your DNS provider, e.g., Route53; they have the actual A, CNAME, MX records).

Recursive resolution: when a client queries a recursive resolver (e.g., your ISP's DNS, 8.8.8.8, 1.1.1.1), the resolver walks the hierarchy on the client's behalf. Resolvers cache responses up to the record's TTL, dramatically reducing load on authoritative servers.

TTL (Time To Live) controls caching. Low TTL (60s) means changes propagate quickly but increase query load and latency. High TTL (86400s = 1 day) reduces load but means changes take a day to propagate. Before a DNS migration, reduce TTL to 60s a day in advance, perform the migration, then restore TTL. This gives you a rollback window of only 60 seconds.

Negative caching (NXDOMAIN): when a name does not exist, resolvers cache the NXDOMAIN response up to the SOA record's negative TTL (typically 5 minutes). This means if you query for a name that does not exist, wait the negative TTL before re-querying — the resolver will return cached NXDOMAIN.`,
    whenToUse: [
      'Debugging DNS propagation delays after changing a record',
      'Explaining why lowering TTL before a migration is essential',
      'Diagnosing Kubernetes pod DNS failures with nslookup from inside the pod',
      'Understanding why flush caches does not help if the authoritative TTL is still high',
    ],
    keyConcepts: [
      { term: 'TTL (Time To Live)', definition: 'Seconds a DNS record may be cached by resolvers. Low TTL = fast propagation, high query load. High TTL = slow propagation, low load. Reduce TTL 24h before migrations.' },
      { term: 'Recursive resolver', definition: 'A DNS server that performs the full resolution on behalf of the client. Caches results per TTL. Examples: 8.8.8.8 (Google), 1.1.1.1 (Cloudflare), CoreDNS in Kubernetes.' },
      { term: 'Authoritative nameserver', definition: 'The server that holds the actual DNS records for a zone. Returns authoritative answers. Route53, Cloudflare DNS, and GoDaddy are authoritative nameservers.' },
      { term: 'Negative caching', definition: 'Caching of NXDOMAIN (name does not exist) responses. Resolvers cache these up to the SOA minimum TTL. Queries for non-existent names fail fast after the first miss.' },
      { term: 'NXDOMAIN vs SERVFAIL', definition: 'NXDOMAIN means the name definitively does not exist. SERVFAIL means the resolver could not complete the query (nameserver unreachable, DNSSEC failure). Different root causes.' },
    ],
    pitfalls: [
      'Changing a DNS record without first lowering TTL — if TTL is 86400, clients will use the old record for up to 24 hours after the change. Reduce TTL days before a migration, not minutes.',
      'Flushing local DNS cache and testing without accounting for upstream resolver caching — your laptop may return the new record, but your users\' ISP resolver still has the old cached value for the remaining TTL.',
      'Confusing authoritative vs recursive resolvers — dig @8.8.8.8 queries Google\'s resolver, which may have a cached result. dig @ns1.example.com queries the authoritative server for the live record.',
    ],
    keyQuestions: [
      {
        question: 'Walk through a full DNS resolution for api.example.com from a Kubernetes pod.',
        answer: `A Kubernetes pod's DNS resolution follows this path:

1. Pod's stub resolver (in /etc/resolv.conf) is configured with nameserver 10.96.0.10 (CoreDNS ClusterIP) and search domains: default.svc.cluster.local, svc.cluster.local, cluster.local.

2. For api.example.com (FQDN with trailing dot not present, treated as relative), the resolver tries:
   api.example.com.default.svc.cluster.local first, then
   api.example.com.svc.cluster.local, then
   api.example.com.cluster.local, then
   api.example.com. (absolute)
   This "search list" behavior causes extra DNS queries for external names.

3. CoreDNS receives the query. For internal names (*.svc.cluster.local), it answers from the in-memory Kubernetes service registry. For external names, it forwards to upstream resolvers (configured in CoreDNS ConfigMap — usually the node's /etc/resolv.conf nameservers or a specified upstream like 8.8.8.8).

4. The upstream recursive resolver walks the DNS hierarchy: queries a root server to find .com TLD servers, queries the .com TLD server to find example.com's nameservers, queries the authoritative nameserver for api.example.com's A record.

5. The A record (e.g., 203.0.113.5) is returned through the chain, cached at each hop per TTL, and returned to the pod.

Debugging commands inside a pod:
cat /etc/resolv.conf           # Check nameserver and search list
nslookup api.example.com       # Basic resolution test
dig api.example.com @10.96.0.10   # Query CoreDNS directly
dig api.example.com +trace     # Full resolution from root (requires external resolver access)`,
      },
    ],
    references: [
      'https://datatracker.ietf.org/doc/html/rfc1034',
      'https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/',
    ],
    quickFire: [
      { q: 'What are the four types of DNS servers in the resolution chain?', a: 'Recursive resolver, root nameserver, TLD nameserver, and authoritative nameserver.' },
      { q: 'What does a DNS recursive resolver do?', a: 'It queries other DNS servers on behalf of the client, walking the hierarchy from root to TLD to authoritative nameserver, then caches and returns the result.' },
      { q: 'What is a DNS TTL and what happens when it expires?', a: 'TTL (Time to Live) is how long a resolver caches a DNS record. After expiry the resolver must query the authoritative server again for a fresh answer.' },
      { q: 'Why does lowering DNS TTL before a migration matter?', a: 'Lowering TTL (e.g., to 60s) before a cutover ensures cached stale records expire quickly after you change the IP, reducing the propagation window.' },
      { q: 'What is negative caching in DNS?', a: 'Caching of NXDOMAIN (non-existent domain) responses so the same failed lookup is not repeatedly queried. Governed by the SOA record\'s negative TTL (RFC 2308).' },
      { q: 'What is the difference between a recursive and an iterative DNS query?', a: 'Recursive: the resolver does all the work and returns the final answer. Iterative: each server returns a referral to the next server, and the client follows the chain itself.' },
      { q: 'How does CoreDNS serve DNS in Kubernetes?', a: 'CoreDNS runs as a Deployment in kube-system. Pods are configured with its ClusterIP as their nameserver; it resolves service names via the cluster DNS search domains (svc.cluster.local).' },
      { q: 'What dig command shows the full DNS resolution path from root?', a: 'dig example.com +trace -- this forces the resolver to walk from root nameservers down, showing each delegation step.' },
      { q: 'What is the search domain in /etc/resolv.conf used for?', a: 'Short hostnames are expanded by appending each search domain in order until a match is found. In Kubernetes, this resolves short service names to fully qualified cluster DNS names.' },
    ],
  },

  {
    id: 'dns-record-types',
    title: 'DNS Record Types',
    icon: 'search',
    color: '#22c55e',
    questions: 5,
    description: 'A, AAAA, CNAME, MX, TXT, SRV, NS, PTR, SOA — use cases and common configuration mistakes.',
    visualizations: [
      {
        title: 'DNS Record Types Reference',
        caption: 'All major record types (A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, PTR, ALIAS) with their purpose, format, and the zone-apex CNAME restriction.',
        image: '/diagrams/networking/dns-record-types-overview.png',
      },
    ],
    introduction: `DNS record types define what kind of data a zone entry contains. Each record type has a specific format and use case.

A and AAAA: Map a hostname to an IPv4 (A) or IPv6 (AAAA) address. The most basic record type. Multiple A records for the same name implement round-robin DNS load balancing.

CNAME (Canonical Name): An alias that points a name to another name (the canonical name). CNAME is followed recursively until an A or AAAA is found. Critical limitation: a CNAME cannot coexist with other records at the same name. A zone apex (the root domain, e.g., example.com itself) cannot have a CNAME. This is why Route53 provides ALIAS records and Cloudflare provides CNAME flattening — they resolve the CNAME at the authoritative level and return A records, bypassing the apex restriction.

MX (Mail Exchanger): Specifies the mail server for a domain. Must point to a hostname (not an IP), with a priority number (lower is preferred). SPF, DKIM, and DMARC records live in TXT records and work alongside MX.

TXT: Free-form text records. Used for SPF (sender policy framework), DKIM (domain keys), DMARC (domain-based authentication), domain ownership verification (Google, Cloudflare, AWS), and ACME DNS challenges for cert issuance.

SRV: Service records. Specify host, port, priority, and weight for a given service and protocol. Format: _service._proto.name. Kubernetes uses SRV records for headless services to enumerate pod endpoints.

NS: Delegates a zone (or subdomain) to specific nameservers. The NS records at the parent zone determine where queries are sent.

PTR: Reverse DNS. Maps an IP to a hostname. Stored under the in-addr.arpa zone. Used by mail servers for spam filtering.`,
    whenToUse: [
      'Configuring a new domain for email delivery (MX, SPF TXT, DKIM TXT, DMARC TXT)',
      'Explaining why a CNAME cannot be used at the zone apex and what alternatives exist',
      'Configuring DNS for Kubernetes headless services (SRV records for pod discovery)',
      'Setting up a domain ownership verification for AWS ACM or Google Search Console',
    ],
    keyConcepts: [
      { term: 'CNAME limitation', definition: 'Cannot coexist with other records at the same node. Cannot be at the zone apex (root domain). Use ALIAS (Route53) or CNAME flattening (Cloudflare) for apex CNAMEs.' },
      { term: 'ALIAS record (Route53)', definition: 'Route53-specific record type that works like CNAME but can be used at the zone apex and with other records. Resolves the target and returns A records. Supports ALB, CloudFront, S3 website endpoints.' },
      { term: 'MX priority', definition: 'Lower priority number means preferred. Multiple MX records provide redundancy. Priority 10 is tried before priority 20.' },
      { term: 'SPF TXT record', definition: 'Specifies which mail servers may send email on behalf of the domain. Example: "v=spf1 include:_spf.google.com ~all". Without SPF, email appears to fail DMARC checks.' },
      { term: 'Headless service DNS', definition: 'A Kubernetes headless service (clusterIP: None) creates individual A records for each pod IP and SRV records for port discovery, enabling direct pod addressing.' },
    ],
    pitfalls: [
      'Putting an MX record directly on an IP address instead of a hostname — MX must point to a hostname (which has its own A record), never directly to an IP.',
      'Adding a CNAME for the root domain (example.com) in providers that do not support CNAME flattening — it breaks the zone. Use Route53 ALIAS or Cloudflare CNAME at root.',
      'Forgetting to include all sending IPs in SPF — if a sending service is added later without updating the SPF record, its email fails SPF and may be marked as spam.',
    ],
    keyQuestions: [
      {
        question: 'You want to point your root domain (example.com) to an ALB. How do you do it and why cannot you just use a CNAME?',
        answer: `A CNAME cannot be used at the zone apex (root domain, example.com) because a CNAME record must be the only record at its node — no MX, no NS, no TXT alongside it. Zone apex must have NS records (they cannot be removed) and typically has MX and TXT records for email. Placing a CNAME there would be invalid per RFC 1034 and most DNS providers reject it.

How to point example.com to an ALB:

Route53 ALIAS record (recommended for AWS): Create an A record for example.com with the ALIAS option enabled, targeting the ALB's DNS name (my-alb-123456789.us-east-1.elb.amazonaws.com). Route53 resolves the ALB DNS name at query time and returns the ALB's current IPs as A record responses. This works at the apex, is free (no extra query cost), and automatically follows ALB IP changes.

Cloudflare CNAME flattening: If using Cloudflare DNS, you can put a CNAME at the root. Cloudflare resolves it server-side and returns A records to clients. Functionally equivalent to ALIAS.

Why not just find the ALB's IP and use an A record: ALB IPs are dynamic — AWS may change them. An A record pointing to a stale IP will break. Always use the ALB's DNS name via ALIAS/CNAME flattening, never hardcode IPs.`,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc1034',
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html',
    ],
    quickFire: [
      { q: 'What does an A record do?', a: 'Maps a hostname to an IPv4 address. The most fundamental DNS record type.' },
      { q: 'What is the difference between a CNAME and an ALIAS record?', a: 'CNAME creates an alias to another hostname but cannot be used at a zone apex. ALIAS (Route 53) resolves at the DNS level to an IP and works at the apex.' },
      { q: 'What does an MX record specify?', a: 'The mail exchange servers responsible for accepting email for a domain, with a priority value (lower = higher priority).' },
      { q: 'What is a TXT record used for?', a: 'Arbitrary text data -- commonly used for domain ownership verification (Google, Stripe), SPF email policies, and DKIM public keys.' },
      { q: 'What does an NS record do?', a: 'Delegates a DNS zone to specific nameservers. NS records at the TLD tell resolvers which authoritative nameservers hold the zone.' },
      { q: 'What is a PTR record?', a: 'Reverse DNS lookup -- maps an IP address back to a hostname. Lives in the in-addr.arpa zone. Used by mail servers to verify sender identity.' },
      { q: 'What is a SRV record?', a: 'Specifies hostname, port, priority, and weight for a service. Used by SIP, XMPP, and Kubernetes headless services for service discovery.' },
      { q: 'What is a CAA record?', a: 'Certificate Authority Authorization -- specifies which CAs are allowed to issue certificates for the domain, preventing unauthorized cert issuance.' },
      { q: 'Why can\'t a CNAME be used at the zone apex?', a: 'RFC 1034 forbids CNAME coexistence with other records at the same name. The apex must have NS and SOA records, making CNAME technically invalid there.' },
    ],
  },

  // ─── LOAD BALANCING ────────────────────────────────────────────────────────
  {
    id: 'l4-vs-l7-lb',
    title: 'L4 vs L7 Load Balancing',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 7,
    description: 'Layer 4 TCP/UDP forwarding vs Layer 7 HTTP routing, when to use each, and hybrid architectures.',
    visualizations: [
      {
        title: 'NLB vs ALB Decision Matrix',
        caption: 'Feature comparison and selection criteria for AWS Network Load Balancer (L4) versus Application Load Balancer (L7), including target type support.',
        image: '/diagrams/networking/l4-vs-l7-lb-comparison.png',
      },
      {
        title: 'Load Balancing Algorithms',
        caption: 'Round-robin, least-connections, IP-hash, weighted, power-of-two-choices, and sticky-session algorithms with their ideal workload profiles.',
        image: '/diagrams/networking/l4-vs-l7-lb-algorithms.png',
      },
    ],
    introduction: `Load balancers are categorised by the OSI layer at which they make routing decisions. This determines what information they can use to route traffic and what overhead they introduce.

Layer 4 (L4) load balancers operate at the TCP/UDP level. They see source IP, destination IP, and port number but not the content of the payload. Routing decisions are made purely on connection-level metadata. The LB acts as a TCP proxy: it accepts the connection, forwards packets to a backend, and tracks the connection state for the duration of the session. Because it does not parse HTTP, it cannot route based on URL, headers, or cookies. L4 LBs are extremely fast (no protocol parsing) and support any TCP/UDP protocol.

Layer 7 (L7) load balancers operate at the HTTP level. They terminate the TLS connection, parse the HTTP request (URL, headers, body, method), and make routing decisions based on that content. This enables: path-based routing (/api to service-A, /static to CDN), host-based routing (api.example.com vs web.example.com), header-based routing (canary with X-Version: beta header), cookie-based sticky sessions. L7 LBs add latency (TLS termination, HTTP parsing, new connection to backend) and are limited to HTTP/HTTPS/gRPC/WebSocket.

In AWS: NLB (Network Load Balancer) = L4. ALB (Application Load Balancer) = L7. A common pattern is L4 NLB in front of L7 ALB for environments requiring static IPs (NLB has Elastic IPs) while still needing HTTP routing (ALB).

HAProxy and nginx support both L4 (stream block) and L7 (http block) mode in the same binary. Envoy Proxy (used in service meshes) operates at L7 with rich HTTP/gRPC routing and observability.`,
    whenToUse: [
      'Choosing between ALB and NLB for a new AWS service',
      'Implementing blue-green or canary deployments using L7 routing rules',
      'Routing WebSocket connections that must stay on the same backend',
      'Exposing a non-HTTP service (SMTP, custom TCP protocol) through a load balancer',
    ],
    keyConcepts: [
      { term: 'L4 passthrough', definition: 'L4 LB forwards TCP/UDP packets without parsing the content. Backend sees the original connection (source IP preservation is possible). No TLS termination unless TLS passthrough is configured.' },
      { term: 'L7 termination', definition: 'L7 LB terminates TLS and the TCP connection. Backend receives a new connection from the LB, not from the client. Source IP is sent via X-Forwarded-For header.' },
      { term: 'Sticky sessions', definition: 'Routing subsequent requests from the same client to the same backend. L4: based on source IP hash. L7: based on a cookie the LB sets/reads. Breaks stateless assumptions.' },
      { term: 'Health checks', definition: 'L4: TCP connection success. L7: HTTP 200 response from a specific path (/healthz). L7 health checks are more accurate but require HTTP parsing.' },
      { term: 'Connection draining', definition: 'Before removing a backend, the LB waits for in-flight connections to complete (with a timeout). L7 LBs can drain gracefully at the request level; L4 drains at the connection level.' },
    ],
    pitfalls: [
      'Using L4 load balancing and losing the client source IP — configure proxy protocol (HAProxy) or X-Forwarded-For (L7) so backends can see the real client IP for logging and rate limiting.',
      'Enabling sticky sessions for stateful applications without a fallback — if the pinned backend fails, the client session is lost. Session state should live in Redis/Memcached, not on the app server.',
      'Placing an L7 LB in front of a service that sends large binary payloads — the L7 LB must buffer the full response to parse headers, adding memory pressure. Use L4 passthrough for bulk data transfers.',
    ],
    keyQuestions: [
      {
        question: 'How do you implement a canary deployment using an ALB?',
        answer: `AWS ALB supports weighted target groups for canary releases (the simplest approach):

1. Create two target groups: stable (v1 pods) and canary (v2 pods).
2. Create a listener rule with a weighted forward action:
   Forward to:
     stable target group: weight 95
     canary target group: weight 5
3. Monitor error rates and latency in CloudWatch for the canary target group.
4. Gradually shift weight: 5/95 → 20/80 → 50/50 → 100/0.
5. Rollback: set weight to 0/100 to send all traffic back to stable.

For more advanced canary based on request headers (easier to test manually):
Create a rule that matches header X-Canary: true → forward to canary target group.
Add another rule (default) → forward to stable.
QA and developers add the header in requests to test the canary version.

Alternative with Kubernetes:
Use Argo Rollouts or Flagger with Ingress-based traffic splitting:
spec.steps: - setWeight: 5, pause: 10m, setWeight: 25, pause: 10m, setWeight: 100
The controller automatically adjusts NGINX Ingress or ALB target group weights.

Metrics to watch: error rate (5xx%), p99 latency, application-specific metrics (checkout success rate). Use CloudWatch alarms or Datadog to automatically trigger rollback if error rate exceeds threshold.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html',
    ],
    quickFire: [
      { q: 'What is the key difference between L4 and L7 load balancers?', a: 'L4 forwards TCP/UDP packets without reading content. L7 reads HTTP headers and can route based on path, host, or query string.' },
      { q: 'At what layer does an AWS ALB operate?', a: 'Layer 7 (Application). It terminates HTTP/HTTPS and routes based on request content.' },
      { q: 'At what layer does an AWS NLB operate?', a: 'Layer 4 (Transport). It forwards TCP/UDP without HTTP parsing, offering microsecond latency.' },
      { q: 'Which AWS load balancer preserves the client source IP?', a: 'NLB preserves source IP natively. ALB uses X-Forwarded-For header since it terminates the connection.' },
      { q: 'When would you choose NLB over ALB?', a: 'When you need static IPs, sub-millisecond latency, non-HTTP protocols, or AWS PrivateLink -- NLB is the only type PrivateLink supports.' },
      { q: 'What is connection draining (deregistration delay)?', a: 'When a target is removed, the load balancer waits for in-flight requests to complete (default 300s) before fully deregistering it, preventing request failures during deploys.' },
      { q: 'How does an L7 load balancer enable blue/green deployments?', a: 'By routing a percentage of traffic to a new target group (green) while keeping the rest on old (blue), then shifting 100% once verified -- all via weighted target group rules.' },
      { q: 'What is proxy protocol and when is it needed?', a: 'A header prepended by L4 load balancers/proxies to pass original client IP and port info to backends that need it for logging or rate limiting.' },
      { q: 'Why is buffering a concern with L7 load balancers on large payloads?', a: 'L7 LBs buffer the full response to parse HTTP headers, consuming memory. For bulk binary transfers, L4 passthrough avoids this overhead.' },
    ],
  },

  {
    id: 'cdn-architecture',
    title: 'CDN Architecture',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 6,
    description: 'Edge PoPs, cache hierarchies, cache invalidation, origin shield, and CloudFront vs Fastly.',
    visualizations: [
      {
        title: 'CDN Request Flow & Cache Hierarchy',
        caption: 'End-to-end CDN flow from DNS anycast routing through edge PoP L1 cache, regional L2 shield cache, to origin, with cache-hit/miss paths and invalidation strategy.',
        image: '/diagrams/networking/cdn-architecture-flow.png',
      },
    ],
    introduction: `A CDN (Content Delivery Network) is a geographically distributed network of cache servers (Points of Presence, PoPs) that serve content from locations close to the user, reducing latency and origin load.

When a user requests a resource, DNS routes them to the nearest PoP via anycast or GeoDNS. The PoP checks its cache (cache hit): returns the cached response. Cache miss: fetches from origin (or from a parent PoP in a hierarchy), caches the response, returns it to the user.

Cache hierarchy: edge PoP (closest to user) → regional PoP (mid-tier, optional) → origin shield (single point of entry to origin) → origin server. The origin shield concentrates all cache misses into one location, dramatically reducing the number of requests hitting the origin. Without it, a cache miss on the edge sends requests from 200 PoPs directly to the origin during a spike.

Cache keys determine uniqueness. By default: URL. Custom cache keys can include headers (Accept-Language, User-Agent), cookies (session cookie), or query parameters. The wider the cache key, the lower the hit rate. The narrower the key, the higher the hit rate but the less personalised content can be cached.

Cache invalidation: TTL-based (content expires and is re-fetched), explicit invalidation (CDN API call to purge a URL or pattern), surrogate keys (tag resources with a key, purge all resources with that tag). Instant invalidation is expensive (it propagates to all PoPs). Batch and tag-based invalidation (Fastly, Varnish) are more efficient.

Cloudfront behaviors map URL patterns to cache policies and origins. You can serve HTML from an S3 bucket (static), API calls from an ALB (dynamic, cache bypass), and assets from another S3 bucket (long TTL), all behind the same CloudFront distribution.`,
    whenToUse: [
      'Designing a global web application serving users across regions',
      'Explaining cache invalidation strategies after a content update',
      'Configuring CloudFront to serve both static assets and dynamic API through a single domain',
      'Reducing S3 origin costs by caching assets at CDN edges with long TTLs',
    ],
    keyConcepts: [
      { term: 'Edge PoP', definition: 'CDN server in a specific geographic location. Responds to DNS queries routed by anycast or GeoDNS. First cache layer for users in that region.' },
      { term: 'Origin shield', definition: 'A single CDN PoP that acts as the sole point of contact with the origin. All other PoPs that miss fetch from the shield. Reduces origin load dramatically during traffic spikes.' },
      { term: 'Cache key', definition: 'The combination of attributes (URL, headers, cookies, query params) that uniquely identifies a cached response. Narrower key = higher hit rate. Wider key = more variation cached.' },
      { term: 'Surrogate keys (cache tags)', definition: 'Tags applied to cached objects that allow bulk invalidation. Purge all objects tagged "product-123" to clear a product page across all PoPs without listing every URL.' },
      { term: 'Stale-while-revalidate', definition: 'Cache serves the stale response immediately while fetching a fresh version in the background. Eliminates user-facing latency on cache misses at the cost of briefly serving stale content.' },
    ],
    pitfalls: [
      'Not configuring an origin shield — cache misses on all 200 edge PoPs simultaneously hit the origin during a traffic spike, potentially overwhelming it.',
      'Setting very long cache TTLs without a cache invalidation strategy — a bug fix or content update is invisible to users for hours or days. Either use short TTLs, versioned asset URLs, or implement cache invalidation.',
      'Caching authenticated or personalised responses — if the cache key does not include the session cookie or auth token, user A may receive user B\'s response. Always bypass cache for authenticated content.',
    ],
    keyQuestions: [
      {
        question: 'How would you architect a CloudFront distribution to serve both static assets and a dynamic API through the same domain?',
        answer: `Use **CloudFront behaviors** (ordered routing rules) to route different URL patterns to different origins with different cache policies.

## Architecture

Domain: cdn.example.com → CloudFront distribution

**Behavior 1 — /api/* (most specific)**
- Origin: ALB at api.example.com
- Cache policy: CachingDisabled (all requests forwarded to origin)
- Origin request policy: include all headers (preserve Authorization, Content-Type)
- TTL: 0

**Behavior 2 — /static/***
- Origin: S3 bucket
- Cache policy: long TTL (max-age=31536000, 1 year)
- Cache key: URL only (no headers, no cookies)

**Behavior 3 — /* (default)**
- Origin: ALB at web.example.com (SSR HTML)
- Cache policy: short TTL (max-age=60s) or CachingDisabled
- Cache key: URL + Accept-Language header (for language variants)

Enable **origin shield** on the S3 origin to consolidate misses for popular assets.

## Versioned assets

Deploy static JS/CSS with content-hash filenames (main.abc123.js). Long TTL is safe because the URL changes when content changes — no manual invalidation needed.

## Emergency invalidation

\`\`\`bash
aws cloudfront create-invalidation --distribution-id E123 --paths "/index.html" "/api/*"
\`\`\`yaml

**Result**: static assets cached at edges indefinitely (low cost, low latency), API always fresh (bypass cache), HTML pages short TTL with fast invalidation capability.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html',
      'https://developer.fastly.com/learning/concepts/cache-invalidation/',
    ],
    quickFire: [
      { q: 'What is a CDN PoP?', a: 'Point of Presence -- an edge server located geographically close to users that caches and serves content, reducing round-trip time to the origin.' },
      { q: 'What is cache hit ratio and why does it matter?', a: 'The percentage of requests served from edge cache vs. forwarded to origin. Higher ratio means lower origin load and faster responses for users.' },
      { q: 'What HTTP headers control CDN caching behavior?', a: 'Cache-Control (max-age, s-maxage, no-store, private), ETag for validation, and Vary for content negotiation. s-maxage overrides max-age for shared caches.' },
      { q: 'What is CDN cache invalidation and what is its drawback?', a: 'Purging cached objects before their TTL expires. It is operationally expensive and error-prone -- the preferred approach is versioned URLs (content-hash filenames) that never need invalidation.' },
      { q: 'How do versioned asset filenames eliminate cache invalidation?', a: 'Naming files with a content hash (main.abc123.js) means the URL changes when content changes, so long TTLs are safe -- stale content is never served from an unchanged URL.' },
      { q: 'What is origin shielding in a CDN?', a: 'A single CDN PoP designated as the sole traffic source to the origin. All other PoPs check shield before hitting origin, dramatically reducing origin request volume.' },
      { q: 'What is the difference between a CDN and a reverse proxy?', a: 'A CDN is a globally distributed network of reverse proxies optimized for caching and edge delivery. A reverse proxy is a single server that forwards requests to backends.' },
      { q: 'What CloudFront feature routes to different origins based on URL path?', a: 'Cache behaviors -- each behavior maps a path pattern (e.g., /api/*) to a different origin with independent TTL and forwarding settings.' },
      { q: 'How does a CDN help with DDoS mitigation?', a: 'Absorbs volumetric attacks at the edge across many PoPs, preventing traffic from reaching origin. Combined with rate limiting and WAF rules at the edge.' },
    ],
  },

  // ─── CLOUD NETWORKING ──────────────────────────────────────────────────────
  {
    id: 'aws-vpc-design',
    title: 'VPC Design',
    icon: 'cloud',
    color: '#f59e0b',
    questions: 8,
    description: 'Subnet design, CIDR planning, route tables, internet gateway, NAT gateway, and multi-tier architectures.',
    visualizations: [
      {
        title: 'VPC Three-Tier Subnet Design',
        caption: 'Production VPC pattern with public subnets (ALB, NAT GW), private subnets (app servers), and isolated subnets (RDS, Redis), including Security Group and route table rules.',
        image: '/diagrams/networking/aws-vpc-design-tiers.png',
      },
      {
        title: 'VPC Connectivity Options',
        caption: 'Comparison of VPC Peering (non-transitive 1:1), Transit Gateway (hub-and-spoke, transitive), PrivateLink (service endpoint, no CIDR clash), and Direct Connect/VPN for hybrid.',
        image: '/diagrams/networking/aws-vpc-design-connectivity.png',
      },
    ],
    introduction: `A **VPC (Virtual Private Cloud)** is an isolated virtual network in AWS. Every VPC has a CIDR block (e.g., 10.0.0.0/16) defining its address space. Subnets are subdivisions of the VPC CIDR, each tied to one Availability Zone.

## Subnet types

- **Public subnets** — route table has a route to an **Internet Gateway (IGW)**. Resources need a public or Elastic IP for direct internet connectivity.
- **Private subnets** — no IGW route. Outbound internet access goes through a **NAT Gateway** deployed in a public subnet. Inbound internet access is not possible.
- **Isolated subnets** — no internet route at all. Used for databases (RDS, ElastiCache) and internal services.

## CIDR planning

CIDR is **hard to undo** — plan carefully upfront. AWS reserves 5 IPs per subnet (network address, VPC router, DNS, future use, broadcast). A /24 has 251 usable IPs; a /28 has only 11. ECS tasks, Lambda VPC functions, and Kubernetes pods each consume an ENI IP. Plan for **2-3x your expected peak**.

Avoid CIDR conflicts with on-premises networks if you plan VPN or Direct Connect.

## Multi-tier architecture

- **Public subnet** — ALB, NAT Gateway, bastion host
- **Private-app subnet** — ECS tasks, EC2 application servers
- **Private-data subnet** — RDS, ElastiCache (no internet route)

Security groups chain the tiers: ALB SG allows 0.0.0.0/0:443 → app SG allows only from ALB SG → data SG allows only from app SG.

## NAT Gateway per AZ

A NAT Gateway is **single-AZ**. If you use one NAT Gateway for all private subnets, an AZ failure takes out internet connectivity for all private subnets. Best practice: deploy one NAT Gateway per AZ and configure each AZ's private route table to use its local NAT Gateway.`,
    whenToUse: [
      'Designing a multi-tier VPC for a new AWS workload from scratch',
      'Explaining why private subnets still need a NAT Gateway for outbound internet',
      'Calculating the right subnet CIDR size for a Kubernetes cluster node pool',
      'Avoiding cross-AZ NAT Gateway traffic costs by deploying per-AZ NAT',
    ],
    keyConcepts: [
      { term: 'Internet Gateway (IGW)', definition: '**Horizontally scaled, redundant** gateway attached to a VPC. Resources in public subnets use it for inbound and outbound internet traffic (requires Elastic IP or public IP).' },
      { term: 'NAT Gateway', definition: '**Managed NAT device** in a public subnet. Allows private subnet resources to initiate outbound internet connections without exposing inbound ports. **Single-AZ** — deploy one per AZ for HA.' },
      { term: 'Route table', definition: '**Per-subnet routing rules**. Main route table applies to all unassociated subnets. Custom route tables for public (with IGW route) and private (with NAT route) subnets.' },
      { term: 'VPC Endpoint', definition: '**Private connection** between VPC and AWS services (S3, DynamoDB, SSM) without internet. **Gateway endpoints** (S3, DynamoDB) are free. **Interface endpoints** use PrivateLink (per-hour + data cost).' },
      { term: 'Security group vs NACL', definition: '**Security groups**: stateful, instance-level, allow rules only, evaluated as a set. **NACLs**: stateless, subnet-level, allow and deny rules, evaluated in order by rule number.' },
    ],
    pitfalls: [
      'Choosing a VPC CIDR that overlaps with on-premises networks — VPC peering and VPN/Direct Connect require non-overlapping CIDRs. Use RFC 1918 ranges not used by corporate networks.',
      'Undersizing subnets — you cannot resize a subnet after creation. Small subnets exhaust available IPs as ECS tasks, pods, and ENIs consume IPs rapidly. Use /22 or larger for application subnets.',
      'Using a single NAT Gateway for all AZs — a NAT Gateway is in one AZ. If that AZ fails, all private subnets in other AZs lose internet access. Deploy one NAT Gateway per AZ.',
    ],
    keyQuestions: [
      {
        question: 'Design the VPC architecture for a three-tier web application that must be highly available across two AZs.',
        answer: `**VPC CIDR**: 10.0.0.0/16 (65,536 addresses)

## Subnets

\`\`\`bash
AZ-a:
  Public:       10.0.0.0/24   (251 IPs — ALB, NAT Gateway)
  Private-app:  10.0.2.0/23   (507 IPs — ECS tasks, EC2)
  Private-data: 10.0.4.0/24   (251 IPs — RDS primary, ElastiCache)

AZ-b:
  Public:       10.0.1.0/24
  Private-app:  10.0.6.0/23
  Private-data: 10.0.8.0/24
\`\`\`yaml

## Gateways

- **Internet Gateway**: attached to VPC (shared across both AZs)
- **NAT Gateway AZ-a**: deployed in 10.0.0.0/24 (public-a), has Elastic IP
- **NAT Gateway AZ-b**: deployed in 10.0.1.0/24 (public-b), has Elastic IP

## Route tables

- **public-rt**: 0.0.0.0/0 → IGW (associated with both public subnets)
- **private-app-a-rt**: 0.0.0.0/0 → NAT-Gateway-AZ-a
- **private-app-b-rt**: 0.0.0.0/0 → NAT-Gateway-AZ-b
- **private-data-rt**: no internet route (fully isolated)

## Security groups

- **alb-sg**: inbound 443 from 0.0.0.0/0; outbound 8080 to app-sg
- **app-sg**: inbound 8080 from alb-sg; outbound 5432 to data-sg, 443 to internet (for AWS API calls)
- **data-sg**: inbound 5432 from app-sg only

If AZ-a fails, AZ-b continues fully independently. Each AZ has its own NAT Gateway, so a NAT failure is contained to one AZ.

**Cost note**: two NAT Gateways cost ~$65/month base plus data transfer. For dev environments, use a single NAT Gateway to save cost and accept reduced redundancy.`,
      },
      {
        question: 'What is the difference between VPC peering, Transit Gateway, and PrivateLink? When do you use each?',
        answer: `## VPC Peering

A **direct private link** between two specific VPCs (same or different accounts/regions). Traffic routes through the AWS backbone. **Non-transitive**: if A peers B and B peers C, A cannot reach C through B. Requires non-overlapping CIDRs. Same-AZ traffic is free; cross-AZ and cross-region incur transfer costs.

**Best for**: small number of VPC pairs, simple mesh topologies, precise routing control.

## Transit Gateway

A **hub-and-spoke routing service**. Attach multiple VPCs (and VPNs, Direct Connect) to one TGW. Each VPC only needs one attachment; TGW routes between all attached networks. Supports thousands of VPCs, route domains (for isolation), and cross-region peering.

**Cost**: per-hour attachment cost plus data processing fee.
**Best for**: large multi-VPC architectures, hybrid cloud (on-premises + AWS), complex routing policies.

## PrivateLink

Exposes a **specific service** (behind an NLB) to other VPCs via interface endpoints (private IPs in the consumer VPC). The service never enters the consumer VPC — only the endpoint IP does. Works across accounts and regions without peering or CIDR constraints.

**Best for**: SaaS integrations, sharing one service across accounts/VPCs without full network peering, AWS service access (SSM, Secrets Manager) that stays off the internet.

## Summary

- **VPC Peering** — few VPCs, simple full-mesh
- **Transit Gateway** — many VPCs, hub-and-spoke, on-premises connectivity
- **PrivateLink** — expose one service (not a full network) to other VPCs/accounts`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html',
      'https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html',
    ],
    quickFire: [
      { q: 'What is an AWS VPC?', a: 'A Virtual Private Cloud -- a logically isolated network within AWS where you control IP ranges, subnets, route tables, and gateways.' },
      { q: 'What is the difference between a public and a private subnet?', a: 'A public subnet has a route to an Internet Gateway. A private subnet does not -- it routes internet traffic through a NAT Gateway (outbound only).' },
      { q: 'What does a NAT Gateway do in a VPC?', a: 'Lets instances in private subnets initiate outbound internet connections (e.g., to download packages) while blocking unsolicited inbound connections.' },
      { q: 'What is VPC peering?', a: 'A direct private connection between two VPCs that routes traffic via AWS backbone without traversing the internet. Non-transitive -- A-B and B-C does not give A-C connectivity.' },
      { q: 'When should you use Transit Gateway instead of VPC peering?', a: 'When connecting many VPCs (hub-and-spoke model), or connecting VPCs to on-premises networks. Transit Gateway is transitive; VPC peering is not.' },
      { q: 'What CIDR range considerations matter when designing a VPC?', a: 'Avoid overlap with other VPCs you will peer with, on-premises networks, and future growth. RFC 1918 ranges (10.x, 172.16-31.x, 192.168.x) are common. /16 gives 65k IPs.' },
      { q: 'What is an Availability Zone subnet pattern for high availability?', a: 'Deploy subnets in at least 2-3 AZs. Place load balancers and NAT Gateways in each AZ to avoid cross-AZ dependency during AZ failure.' },
      { q: 'What is AWS PrivateLink?', a: 'Exposes a single service (not a full network) from one VPC to another via an endpoint, without VPC peering or internet exposure. Uses NLB on the provider side.' },
      { q: 'What are VPC Flow Logs used for?', a: 'Capture metadata about accepted and rejected IP traffic in a VPC (source/dest IP, port, protocol, bytes, action). Used for security auditing and connectivity debugging.' },
    ],
  },

  {
    id: 'service-mesh',
    title: 'Service Mesh',
    icon: 'cloud',
    color: '#f59e0b',
    questions: 6,
    description: 'Envoy sidecar, Istio vs Linkerd, mTLS between services, traffic management, observability, and eBPF alternatives.',
    visualizations: [
      {
        title: 'Istio/Envoy Control & Data Planes',
        caption: 'Service mesh architecture showing Istiod control plane (Pilot xDS, Citadel certs, Galley config) pushing configuration to Envoy sidecars that intercept all pod traffic for mTLS and telemetry.',
        image: '/diagrams/networking/service-mesh-architecture.png',
      },
    ],
    introduction: `A **service mesh** is an infrastructure layer that handles service-to-service communication in a microservices architecture. It uses a **sidecar proxy pattern**: a proxy (Envoy) is injected into every pod. All inbound and outbound traffic from the application flows through the sidecar, transparent to the application code.

## Control plane vs data plane

- **Control plane (Istiod)** — distributes configuration to all sidecars: service endpoints, traffic policies (retries, timeouts, circuit breakers), and certificates for mTLS
- **Data plane (sidecars)** — enforces policies on every request

## Key capabilities

- **mTLS** — each sidecar gets a short-lived certificate from the mesh CA; all service-to-service traffic is automatically encrypted and mutually authenticated
- **Traffic management** — weighted routing (canary, A/B), retries, timeouts, circuit breaking, fault injection for chaos testing
- **Observability** — L7 metrics for every service pair (request rate, error rate, p99 latency), distributed traces via OpenTelemetry, access logs — without any application instrumentation

## Istio vs Linkerd vs Cilium

- **Istio** — Envoy sidecar; powerful, feature-rich, higher resource usage (~50-100 MB RAM per sidecar)
- **Linkerd** — Rust micro-proxy; lighter, simpler, less feature-rich
- **Cilium** — eBPF kernel programs instead of sidecar proxies; near-zero overhead, no proxy containers, fewer features

**Sidecar overhead**: each Envoy adds ~0.5-2ms latency per hop. For high-throughput latency-sensitive services, eBPF (Cilium) eliminates this at the cost of some feature richness.`,
    whenToUse: [
      'Implementing zero-trust networking for microservices without modifying application code',
      'Getting L7 observability (request rate, error rate, latency) across all services automatically',
      'Implementing progressive delivery (canary, A/B) at the traffic level without application changes',
      'Replacing custom retry/timeout code in services with mesh-level policies',
    ],
    keyConcepts: [
      { term: 'Sidecar proxy', definition: '**Envoy container** injected into every pod by a mutating webhook. All pod network traffic flows through the proxy via iptables REDIRECT rules. Application code is unchanged.' },
      { term: 'mTLS in mesh', definition: 'Each sidecar gets a **short-lived certificate** from the mesh CA (SPIFFE/SPIRE standard). Sidecars authenticate each other and encrypt all traffic automatically. No application code changes needed.' },
      { term: 'VirtualService (Istio)', definition: 'Defines **routing rules**: weight-based (canary), header-based (A/B), fault injection (delay/abort), retries, and timeouts. Applied on top of existing Kubernetes Services.' },
      { term: 'DestinationRule (Istio)', definition: 'Configures **post-routing behavior**: load balancing algorithm, circuit breaker settings (outlier detection), and TLS settings to the destination.' },
      { term: 'eBPF service mesh (Cilium)', definition: 'Uses **eBPF kernel programs** instead of sidecar proxies. Near-zero overhead, no proxy containers, policies enforced in the kernel networking stack.' },
    ],
    pitfalls: [
      'Forgetting that mTLS in the mesh does not encrypt traffic before the sidecar — intra-pod traffic (between app container and sidecar on loopback) is plaintext. Not an issue in practice but worth knowing for threat models.',
      'Enabling the mesh without setting resource requests/limits on sidecars — the Envoy sidecar will consume unbounded memory under high load, causing node memory pressure.',
      'Not disabling retries for non-idempotent POST requests — the mesh retry policy can resend a request that already succeeded, causing duplicate operations. Always scope retries to idempotent methods.',
    ],
    keyQuestions: [
      {
        question: 'How does Istio implement mTLS between two microservices without changing the application code?',
        answer: `The mechanism relies on four components working together:

## 1. Certificate issuance

When a pod starts, Istio's mutating webhook injects an Envoy sidecar. The sidecar's init container rewrites iptables rules to intercept all traffic. The sidecar authenticates to Istiod using the pod's Kubernetes service account JWT and receives a **short-lived X.509 certificate** from Istio's CA. The certificate's SPIFFE URI encodes the service identity: spiffe://cluster.local/ns/default/sa/my-service.

## 2. Outbound mTLS

When service A calls service B, the app connects to 127.0.0.1:servicePort. iptables redirects this to the sidecar's outbound port (15001). The sidecar looks up the destination in its config, sees mTLS is required, and establishes a TLS connection to service B's sidecar presenting its SPIFFE identity certificate.

## 3. Inbound mTLS

Service B's sidecar receives the connection on port 15006. It **validates the client certificate** against the Istio CA. If valid, it forwards the decrypted request to the application on localhost:appPort.

## 4. Policy enforcement

The sidecar enforces **AuthorizationPolicy** rules: "only allow requests from service A's SPIFFE identity to endpoint /api/v1/.*". Applied at the sidecar level, not in the application.

The application code never sees TLS — it sends and receives plaintext on localhost. The mesh handles encryption, authentication, and authorization transparently.`,
      },
    ],
    references: [
      'https://istio.io/latest/docs/concepts/security/',
      'https://linkerd.io/2.12/features/automatic-mtls/',
    ],
    quickFire: [
      { q: 'What problem does a service mesh solve?', a: 'Moves cross-cutting concerns (mTLS, retries, circuit breaking, observability) out of application code into a sidecar proxy, making them consistent across all services.' },
      { q: 'What is a sidecar proxy in a service mesh?', a: 'A proxy (typically Envoy) injected into each pod that intercepts all inbound and outbound traffic, applying mesh policies transparently to the application.' },
      { q: 'What is the control plane vs data plane in Istio?', a: 'Data plane: Envoy sidecars that handle actual traffic. Control plane (istiod): manages certificate issuance, pushes routing/policy config to sidecars via xDS API.' },
      { q: 'How does a service mesh implement zero-trust networking?', a: 'Every service gets a SPIFFE X.509 identity. mTLS is enforced between all sidecars so no service can communicate without a valid, mesh-issued certificate.' },
      { q: 'What is a VirtualService in Istio?', a: 'An Istio CRD that defines traffic routing rules -- canary splits, retries, timeouts, fault injection, and header-based routing -- applied by sidecars.' },
      { q: 'What is a DestinationRule in Istio?', a: 'Configures upstream connection policies: load balancing algorithm, circuit breaker thresholds, TLS settings, and subset definitions for traffic splitting.' },
      { q: 'What is circuit breaking in a service mesh?', a: 'Stops sending requests to a failing backend after a threshold of errors/latency is exceeded, allowing it to recover instead of cascading failures across services.' },
      { q: 'How does Linkerd differ from Istio?', a: 'Linkerd uses a lightweight Rust-based proxy (not Envoy), has simpler configuration, lower resource overhead, and automatic mTLS on by default. Istio is more feature-rich but complex.' },
      { q: 'What is SPIFFE and how does it relate to service mesh?', a: 'SPIFFE (Secure Production Identity Framework for Everyone) is a standard for workload identity using X.509 SVIDs. Service meshes use SPIFFE IDs (spiffe://trust-domain/path) as service identities.' },
    ],
  },

  // ─── TROUBLESHOOTING ────────────────────────────────────────────────────────
  {
    id: 'network-debugging-tools',
    title: 'Network Debugging Toolkit',
    icon: 'tool',
    color: '#f97316',
    questions: 6,
    description: 'Layered debugging methodology, tcpdump, Wireshark, mtr, netstat, and cloud-specific tools.',
    visualizations: [
      {
        title: 'Debugging Tools by OSI Layer',
        caption: 'Canonical tool for each network layer — ethtool at L1/2, ping/traceroute at L3, nc/ss at L4, curl/dig/openssl at L7 — plus a four-step debugging ladder.',
        image: '/diagrams/networking/network-debugging-tools-by-layer.png',
      },
    ],
    introduction: `Effective network debugging follows a **structured layered approach**: start at the lowest layer that could explain the symptom and work upward. Form a hypothesis about which layer is failing, then choose the tool that confirms or refutes it.

## Debugging ladder by layer

- **Layer 1-2 (Physical/Link)**: \`ip -s link show\` — check error counters, drops, collisions. \`ethtool eth0\` — link speed, duplex, PHY errors.
- **Layer 3 (IP)**: \`ping\` (ICMP reachability), \`ip route get\` (routing decision), \`traceroute\` / \`mtr\` (path and per-hop latency).
- **Layer 4 (TCP)**: \`nc -zv host port\` (can we connect?), \`ss -tulpn\` (what is listening?), \`tcpdump\` (what is on the wire?).
- **Layer 7 (Application)**: \`curl -v\` (HTTP), \`openssl s_client\` (TLS), \`dig\` (DNS).

## Key tools

**mtr** combines traceroute and ping: continuously probes each hop and shows real-time loss% and latency. Essential for finding which hop is dropping packets.

**ss** (socket statistics) is the production standard. Common invocations:
- \`ss -s\` — summary of connection counts
- \`ss -tulpn\` — all listening sockets with process names and PIDs
- \`ss -t state established\` — all established TCP connections
- \`ss -t state time-wait\` — TIME_WAIT count (useful for diagnosing port exhaustion)

## Cloud-specific tools

- **VPC Flow Logs** — per-ENI accept/reject records; invaluable for diagnosing security group/NACL issues
- **Route53 Resolver Query Logs** — DNS queries from VPC resources
- **CloudFront access logs** — edge cache behavior and error codes
- **CloudWatch Network Monitor** — continuous network latency and packet loss metrics`,
    whenToUse: [
      'Systematically diagnosing a network connectivity issue in production',
      'Using mtr to find which network hop is causing packet loss',
      'Reading VPC Flow Logs to determine if a security group is rejecting traffic',
      'Building a network debugging runbook for an on-call team',
    ],
    keyConcepts: [
      { term: 'mtr', definition: '**Combines traceroute and ping**. Continuously probes each hop and shows real-time loss% and latency. Essential for finding which specific hop is dropping or delaying packets.' },
      { term: 'VPC Flow Logs', definition: '**AWS per-ENI network logs**: source IP, destination IP, port, protocol, bytes, and ACCEPT/REJECT action. Stored in CloudWatch Logs or S3. Query with Logs Insights to diagnose SG/NACL issues.' },
      { term: 'ss -tulpn', definition: 'List all **listening TCP/UDP sockets** with process name and PID. Faster than netstat. Use to verify a service is listening on the expected port and interface (0.0.0.0 vs 127.0.0.1).' },
      { term: 'tcpdump filtering', definition: '**BPF filter syntax**: host 10.0.1.5 and port 5432 and tcp — combines IP, port, and protocol filters. Use not port 22 to exclude SSH noise.' },
      { term: 'MTU issues', definition: '**Maximum Transmission Unit**. AWS instances use MTU 9001 (jumbo frames) within a VPC. Crossing an IGW or VPN drops to 1500. PMTUD (Path MTU Discovery) uses ICMP type 3 code 4 — blocking ICMP causes silent packet drops.' },
    ],
    pitfalls: [
      'Diagnosing connectivity issues on the wrong host — check both ends of the connection. A security group on the source instance may block outbound; a NACL on the target subnet may block inbound.',
      'Running tcpdump without privilege — tcpdump requires root or CAP_NET_RAW. In Kubernetes, run a debug container: kubectl debug node/<node> -it --image=nicolaka/netshoot.',
      'Ignoring MTU as a cause of intermittent failures — packets up to ~1460 bytes work; larger packets are silently dropped if ICMP is blocked (PMTUD blackhole). Test with: ping -M do -s 1450 <host>.',
    ],
    keyQuestions: [
      {
        question: 'A microservice in Kubernetes cannot reach another microservice in a different namespace. Walk through your diagnosis.',
        answer: `I follow a layered approach from inside the pod outward:

## Step 1 — Verify the target service and endpoints

\`\`\`bash
kubectl get svc -n target-ns my-service
kubectl get endpoints -n target-ns my-service
\`\`\`

If endpoints are empty, the Service selector does not match any pods — check labels.

## Step 2 — DNS resolution (Layer 7)

\`\`\`bash
kubectl exec -n source-ns source-pod -- nslookup my-service.target-ns.svc.cluster.local
kubectl get pods -n kube-system -l k8s-app=kube-dns
\`\`\`

If nslookup fails, CoreDNS is not resolving the name. Check CoreDNS pods and ConfigMap.

## Step 3 — TCP connectivity (Layer 4)

\`\`\`bash
kubectl exec -n source-ns source-pod -- nc -zv my-service.target-ns.svc.cluster.local 80 -w 3
\`\`\`

- **Connection refused** — pod is listening on wrong port or not listening at all
- **Connection timed out** — NetworkPolicy is blocking traffic

## Step 4 — NetworkPolicy check

\`\`\`bash
kubectl get networkpolicy -n target-ns
kubectl get networkpolicy -n source-ns
\`\`\`

A default-deny ingress policy with no exception for source-ns will block all cross-namespace traffic.

## Step 5 — Packet capture

\`\`\`bash
kubectl exec -n target-ns target-pod -- tcpdump -i any -n port 80
\`\`\`

If packets arrive but get no response, it is an app issue. If no packets arrive, the CNI or NetworkPolicy is dropping them.

## Step 6 — CNI plugin logs

\`\`\`bash
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50
\`\`\`yaml

**Common root causes**: NetworkPolicy blocks cross-namespace traffic, Service selector typo, CoreDNS returning wrong IP, port number mismatch.`,
      },
    ],
    references: [
      'https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/',
      'https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html',
    ],
    quickFire: [
      { q: 'What does ping test and what does it not test?', a: 'ping tests ICMP reachability at Layer 3. It does not test TCP ports, application availability, or TLS -- a host can respond to ping but have a closed application port.' },
      { q: 'What is traceroute used for?', a: 'Shows each hop between source and destination with round-trip latency per hop. Helps identify where packets are being dropped or high latency is introduced.' },
      { q: 'What does netstat -tlnp show?', a: 'Lists all listening TCP sockets with the port, local address, and owning process ID -- useful to confirm a service is bound to the expected port.' },
      { q: 'What is the difference between ss and netstat?', a: 'ss is the modern replacement for netstat, faster and with richer socket state info. Both show socket connections, but ss queries the kernel directly via netlink.' },
      { q: 'How do you test TCP port connectivity without telnet?', a: 'nc -zv hostname port or curl -v telnet://hostname:port. Both test the TCP handshake without requiring a full application protocol exchange.' },
      { q: 'What do VPC Flow Logs capture that ping does not?', a: 'Flow Logs capture actual accepted/rejected traffic metadata (IP, port, protocol, bytes, action) at the ENI level, revealing Security Group or NACL drops invisible to ping.' },
      { q: 'What is the OSI-layer debugging approach?', a: 'Start at Layer 1/2 (physical/link), verify Layer 3 (ping, route), then Layer 4 (nc, telnet), then Layer 7 (curl). Each layer confirms the one below is working.' },
      { q: 'What does tcpdump -i eth0 port 443 do?', a: 'Captures all TCP packets on interface eth0 involving port 443, showing SYN/ACK handshakes, data packets, and RST/FIN flags for connection-level debugging.' },
      { q: 'What tool measures DNS resolution time?', a: 'dig hostname +stats shows query time. time nslookup hostname also works. dig +trace shows per-hop resolution timing through the DNS hierarchy.' },
    ],
  },

  {
    id: 'latency-diagnosis',
    title: 'Latency Diagnosis',
    icon: 'tool',
    color: '#f97316',
    questions: 6,
    description: 'Diagnosing network vs application latency, p99 vs average, cross-region trade-offs, and queuing theory.',
    visualizations: [
      {
        title: 'Latency Sources & Fixes',
        caption: 'Systematic isolation of latency contributors from client DNS/TCP/TLS through network RTT, load balancer, application, and database, each with targeted remediation.',
        image: '/diagrams/networking/latency-diagnosis-sources.png',
      },
      {
        title: 'End-to-End Latency Budget',
        caption: 'Per-phase latency budget (DNS, TCP, TLS, TTFB, transfer, render) with target p95 thresholds and techniques to eliminate each component.',
        image: '/diagrams/networking/latency-diagnosis-budget.png',
      },
    ],
    introduction: `Latency diagnosis requires distinguishing between different types of latency and their causes.

## Network vs application latency

**Network latency** (propagation + transmission delay) is largely physics: ~1ms per 100km in fiber, ~70ms New York to London. **Application latency** adds queuing delay, processing time, and database round trips on top of network latency.

## Percentile distributions matter

Average latency hides outliers. Use percentiles:
- **p50** — median; half of requests are faster
- **p99** — 1% of requests are slower than this value
- **p99.9 (tail latency)** — often 5-10x p99; the worst users experience

In **fan-out systems** (one request calls 10 downstream services), the overall p99 approaches the p99.9 of each individual service. Reducing tail latency matters more than improving average latency in microservices.

## Queuing theory — Little's Law

L = λW (L = items in system, λ = arrival rate, W = time per item). When arrival rate exceeds service rate, the queue grows unboundedly and latency spikes. This explains why a service at **80% CPU shows 2-3x latency** vs 50% CPU — queuing effects are nonlinear near saturation.

## Common latency sources (cloud)

- **DNS resolution** — 5-50ms on first request to a new hostname
- **TCP handshake** — ~1 RTT (3-way handshake)
- **TLS handshake** — 1-2 RTTs (TLS 1.2) or 1 RTT (TLS 1.3)
- **Database queries** — dominant for most OLTP applications
- **Cross-AZ traffic** — 1-2ms within the same AWS region
- **Cross-region traffic** — 40-200ms depending on geography`,
    whenToUse: [
      'Diagnosing a p99 latency spike that does not show up in the average',
      'Explaining why a service at 70% CPU shows 3x more latency than at 30% CPU',
      'Choosing the right AWS region pair to minimise cross-region latency for real-time features',
      'Understanding why fan-out patterns amplify tail latency',
    ],
    keyConcepts: [
      { term: 'p99 latency', definition: '**99th percentile** — 1% of requests are slower than this value. Use p99 and p99.9 for SLOs. Averages hide the long tail that users experience during spikes.' },
      { term: 'Queuing delay', definition: 'Time waiting for the server to free up capacity. **Grows nonlinearly** as utilisation approaches 100%. At 90% CPU, queuing delay often exceeds actual processing time.' },
      { term: 'RTT (Round Trip Time)', definition: 'Time for a packet to travel from source to destination and back. Propagation delay is ~5ms per 1000km in fiber. **TLS handshake adds 1-2 RTTs** before data flows.' },
      { term: 'Connection keep-alive', definition: '**Reusing TCP connections** across HTTP requests eliminates the 3-way handshake and TLS renegotiation per request. Essential for high-throughput services.' },
      { term: 'Hedged requests', definition: 'Sending a **duplicate request** to a second backend after a small timeout (e.g., 5ms), then using whichever responds first. Effectively eliminates tail latency at the cost of extra backend load (~1% overhead).' },
    ],
    pitfalls: [
      'Using average latency in SLOs — a system with 10ms average but 2000ms p99 appears healthy by average but is failing 1% of users. Always use percentile-based SLOs.',
      'Placing your primary database in a different region from the application server — every database query adds one cross-region RTT (40-200ms). A page that queries the DB 20 times adds 4 seconds of latency.',
      'Ignoring DNS latency for first connections — if connection pooling is not used, DNS resolution adds 5-50ms per new hostname. Use persistent connections and connection pools to amortize this.',
    ],
    keyQuestions: [
      {
        question: 'Your API p99 latency is 2000ms but p50 is 50ms. What are the most likely causes and how do you diagnose?',
        answer: `A large p50-to-p99 gap indicates **tail latency** — most requests are fast but a small fraction are very slow. Likely causes:

## 1. Garbage collection pauses (JVM, Go)

GC stop-the-world events freeze all threads for 50-500ms. Requests in-flight during GC become the slow tail.
- **Diagnose**: correlate GC logs with latency spikes; look for JVM pause_ms or Go runtime.gc.pause_ns metrics
- **Fix**: tune GC (G1GC MaxGCPauseMillis, Go GOGC), reduce object allocation, increase heap

## 2. Lock contention

A shared resource (mutex, DB row lock) causes occasional serialization.
- **Diagnose**: thread dump during spike (jstack PID), or async-profiler for lock contention flame graphs
- **Fix**: reduce lock scope, use lock-free data structures

## 3. Cold cache misses

The 99th percentile request hits an empty cache entry.
- **Diagnose**: correlate cache hit rate with latency percentiles; check Redis latency histogram
- **Fix**: cache warm-up on startup, stale-while-revalidate

## 4. Network tail events

Packet retransmissions (TCP retransmit timer defaults to 200ms) or TCP slow start on new connections.
- **Diagnose**: \`ss -tio | grep retrans\`, /proc/net/tcp retransmit counters, tcpdump for SYN retransmissions
- **Fix**: connection keep-alive to avoid new TCP handshakes, tune TCP retransmit timeout

## 5. Resource saturation

Database connection pool exhausted — requests queue waiting for a connection.
- **Diagnose**: monitor active vs total pool connections; if active == max, requests are queuing
- **Fix**: increase pool size or reduce query duration

**Best diagnostic tool**: distributed tracing (Jaeger, Tempo). Sample a slow request trace — each span shows exactly where time was spent. The widest span is the bottleneck.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/addressing-cascading-failures/',
      'https://www.brendangregg.com/usemethod.html',
    ],
    quickFire: [
      { q: 'What are the three components of network latency?', a: 'Propagation delay (speed of light over distance), transmission delay (bandwidth/packet size), and queuing/processing delay (congestion, CPU).' },
      { q: 'What is the USE method for diagnosing latency?', a: 'Utilization, Saturation, Errors -- check each resource (CPU, network, disk) for these three symptoms to pinpoint the bottleneck.' },
      { q: 'What does p99 latency mean?', a: 'The 99th percentile latency -- 99% of requests complete faster than this value. Tail latency matters for user experience; averages hide outliers.' },
      { q: 'What curl flag measures time-to-first-byte?', a: 'curl -w "%{time_starttransfer}" -o /dev/null -s url -- shows the time until the first response byte, isolating server processing from transfer time.' },
      { q: 'How does TCP slow start cause latency on new connections?', a: 'TCP starts with a small congestion window and doubles it per RTT until reaching the threshold. New connections deliver lower throughput until the window grows.' },
      { q: 'What is head-of-line blocking and which protocol solves it?', a: 'A queued request blocks subsequent ones if it stalls. HTTP/2 multiplexes streams over one TCP connection but still suffers TCP HOL blocking. HTTP/3 over QUIC eliminates it.' },
      { q: 'What is DNS latency and how do you reduce it?', a: 'Time to resolve a hostname -- can be 50-200ms for an uncached lookup. Reduce with lower TTLs + pre-warming, DNS prefetching, and placing resolvers close to clients.' },
      { q: 'How does connection reuse reduce latency?', a: 'Reusing TCP (and TLS) connections eliminates the 1-3 RTT handshake cost per request. HTTP keep-alive, connection pools, and gRPC persistent streams all exploit this.' },
      { q: 'What is a flame graph used for in latency diagnosis?', a: 'Visualizes CPU stack traces as proportional horizontal bars. Shows where CPU time is spent across the call stack, identifying the hottest code paths causing latency.' },
    ],
  },

  // ─── DNS ───────────────────────────────────────────────────────────────────
  {
    id: 'dnssec',
    title: 'DNSSEC',
    icon: 'search',
    color: '#22c55e',
    questions: 5,
    description: 'DNSSEC chain of trust, ZSK/KSK key pairs, RRSIG/DNSKEY/DS records, validation process, and real-world adoption challenges.',
    visualizations: [],
    introduction: `DNSSEC (Domain Name System Security Extensions) adds cryptographic authentication to DNS, protecting against cache poisoning and man-in-the-middle attacks. Without DNSSEC, a resolver has no way to verify that the answer it received for a query actually came from the authoritative nameserver and was not tampered with in transit. The 2008 Kaminsky attack demonstrated how DNS cache poisoning could be weaponized at scale, accelerating DNSSEC adoption.

DNSSEC does not encrypt DNS traffic — it only signs DNS responses so resolvers can verify authenticity. Each DNS zone signs its resource records with a private key, and resolvers validate those signatures using the corresponding public key, which is itself authenticated by the parent zone.

The trust chain starts at the DNS root (managed by IANA). The root zone signs the keys for TLDs (.com, .org), TLDs sign the keys for second-level domains, and so on down the hierarchy. A validating resolver only needs to trust the root's public key (the Root Trust Anchor, updated via RFC 5011) to validate any signed zone.

DNSSEC introduces several new record types: DNSKEY (public keys), RRSIG (cryptographic signatures over resource record sets), DS (Delegation Signer, a hash linking parent to child zone), and NSEC/NSEC3 (authenticated denial of existence for NXDOMAIN responses).

In practice, DNSSEC adoption remains incomplete. Many registrars support it, but configuration complexity, key rollover procedures, and the risk of SERVFAIL on misconfiguration cause many operators to skip it. High-value domains (banking, government) are more likely to be signed. Cloud DNS services like Route 53 and Cloud DNS support DNSSEC signing. DNSSEC does not protect against DDoS amplification (it makes responses larger), and it cannot prevent compromised authoritative servers from serving false signed records.`,
    whenToUse: [
      'Evaluating whether a domain is properly secured against cache poisoning and BGP hijacking attacks.',
      'Debugging SERVFAIL errors caused by DNSSEC validation failures at the resolver.',
      'Configuring a new domain on a registrar that supports DS record submission.',
      'Designing a certificate issuance pipeline using DANE (TLSA records anchored by DNSSEC).',
      'Auditing DNS security posture for compliance frameworks that require authenticated DNS.',
    ],
    keyConcepts: [
      {
        term: 'Zone Signing Key (ZSK)',
        definition: `The ZSK is the key pair used to sign individual resource record sets (RRSets) within a zone. The private ZSK signs each RRSIG record; the public ZSK is published in the zone as a DNSKEY record. ZSKs are rotated frequently (monthly to quarterly) because they are used heavily. Rollover is done using either pre-publication (publish new key before using it) or double-signature (sign with both keys simultaneously) methods.`,
      },
      {
        term: 'Key Signing Key (KSK)',
        definition: `The KSK signs only the DNSKEY RRSet (which contains the public ZSK). The KSK's public key hash is submitted to the parent zone as a DS record, anchoring the chain of trust. KSKs are rotated less frequently (annually) because changing them requires coordination with the parent zone registrar to update the DS record. A KSK rollover that fails to update the DS record in the parent zone will cause SERVFAIL for all validators.`,
      },
      {
        term: 'DS Record (Delegation Signer)',
        definition: `A DS record lives in the parent zone (e.g., .com) and contains a hash of the child zone's KSK public key. When a resolver queries child.example.com and receives a referral, it fetches the DS record from the parent and compares it to the DNSKEY in the child zone. A match means the child zone's keys are authenticated by the parent. DS records use algorithm numbers (e.g., 13 = ECDSA P-256 SHA-256, 8 = RSA SHA-256) to identify the signing algorithm.`,
      },
      {
        term: 'RRSIG Record',
        definition: `An RRSIG record is a cryptographic signature over a specific RRSet (e.g., the A records for www.example.com). It contains the signature itself, the algorithm used, the key tag identifying which DNSKEY signed it, and an expiration timestamp. Resolvers verify the RRSIG by fetching the DNSKEY, reconstructing the canonical RRSet wire format, and verifying the signature. Expired RRSIGs cause SERVFAIL — zone signing must re-sign before expiry.`,
      },
      {
        term: 'NSEC and NSEC3',
        definition: `Authenticated denial of existence records. NSEC links zone names in sorted order, allowing resolvers to prove that a queried name does not exist (NXDOMAIN) without requiring the zone to be online to sign each negative response. However, NSEC allows zone enumeration (walking the chain reveals all names). NSEC3 hashes the names with a salt before chaining, preventing trivial enumeration. NSEC3 with opt-out mode reduces signing overhead for large zones with many unsigned delegations.`,
      },
      {
        term: 'Chain of Trust',
        definition: `The unbroken cryptographic path from the DNS root to the queried zone. Root zone signs TLD DNSKEY via DS record in root, TLD signs second-level domain DNSKEY via DS record in TLD, and so on. A validating resolver starts at the Root Trust Anchor (a hardcoded or RFC 5011-managed public key) and follows DS records down to the queried zone. Any break in the chain — missing DS record, mismatched key, expired RRSIG — causes SERVFAIL for strict validators.`,
      },
    ],
    pitfalls: [
      'Rotating the KSK without updating the DS record in the parent zone. The new KSK is not trusted by validators, causing SERVFAIL for all clients using validating resolvers. Always verify the DS record is published in the parent before decommissioning the old KSK.',
      'Letting RRSIG records expire. RRSIGs have a validity window (typically 2-4 weeks). If zone signing automation fails silently, signatures expire and validators return SERVFAIL. Monitor RRSIG expiry as an operational metric with alerting at 7 days before expiry.',
      'Assuming DNSSEC protects confidentiality. DNSSEC only authenticates responses; it does not encrypt them. DNS queries and responses are still visible to network observers. Use DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT) for confidentiality.',
      'DNSSEC amplification in DDoS attacks. DNSSEC responses are much larger than unsigned responses (DNSKEY and RRSIG records add hundreds of bytes). Attackers use DNSSEC-signed zones as amplifiers in UDP reflection attacks. Mitigate with rate limiting and Response Rate Limiting (RRL) on authoritative servers.',
      'Enabling DNSSEC validation on resolvers without handling validation failures gracefully. Applications that treat SERVFAIL identically to NXDOMAIN will silently fail when DNSSEC validation breaks. Log and alert on validation failures separately from authoritative NXDOMAIN responses.',
    ],
    keyQuestions: [
      {
        question: 'Explain the DNSSEC chain of trust from the root to a leaf domain. What records are involved at each step?',
        answer: `## Chain of Trust Overview

The chain of trust is a cryptographic delegation path from the DNS root to the queried domain. Each level signs the keys of the level below it.

## Step-by-Step: resolving www.example.com with DNSSEC

### Step 1: Root Trust Anchor
The validating resolver has the Root Trust Anchor hardcoded (or updated via RFC 5011). This is the public KSK of the root zone. The resolver implicitly trusts this key.

### Step 2: Root -> .com delegation
The root zone contains a DS record for .com:

\`\`\`
com.   86400  IN  DS  30909 8 2 E2D3C916F6DEEAC73294E8268FB5885044A833FC...
\`\`\`

The resolver fetches .com's DNSKEY records and verifies that the hash of the KSK matches the DS record signed by the root. The root's RRSIG over the DS record is verified using the Root Trust Anchor.

### Step 3: .com -> example.com delegation
The .com zone contains a DS record for example.com. The resolver verifies this DS record's RRSIG using .com's ZSK (which was authenticated in Step 2).

### Step 4: example.com zone
The resolver fetches example.com's DNSKEY records and verifies the KSK hash matches the DS record from .com. The ZSK is verified because it is signed by the KSK (RRSIG over the DNSKEY RRSet).

### Step 5: www.example.com A record
The resolver fetches the A record for www.example.com along with its RRSIG. It verifies the RRSIG using example.com's ZSK.

## Verification commands

\`\`\`bash
# Check if a domain is DNSSEC-signed
dig +dnssec example.com A

# Check DS record in parent zone
dig +dnssec example.com DS

# Check DNSKEY records in the zone
dig +dnssec example.com DNSKEY

# Verify the full chain (requires dnssec-verify or delv)
delv @8.8.8.8 example.com A +rtrace

# Check RRSIG validity and expiry
dig +dnssec +multiline example.com A | grep -A5 RRSIG
\`\`\`

## What causes SERVFAIL?

- DS record in parent does not match the DNSKEY in child zone (key mismatch after rotation)
- RRSIG has expired (zone signing automation failed)
- Signature algorithm not supported by the resolver
- Missing NSEC/NSEC3 records for authenticated denial

The key insight: the chain is only as strong as its weakest link. A missing DS update after KSK rollover breaks the entire chain for that domain for all validating resolvers worldwide.`,
      },
      {
        question: 'How would you debug a SERVFAIL that you suspect is caused by a DNSSEC validation failure?',
        answer: `## Diagnosis Strategy

First, distinguish between a DNSSEC validation failure and an authoritative server problem. A DNSSEC failure returns SERVFAIL from validating resolvers but a correct answer from non-validating resolvers.

## Step 1: Compare validating vs non-validating resolver

\`\`\`bash
# Query Google's validating resolver (DNSSEC-validating)
dig @8.8.8.8 example.com A

# Query a non-validating resolver or use +cd (checking disabled)
dig @8.8.8.8 +cd example.com A

# If +cd returns an answer but without +cd it returns SERVFAIL:
# => DNSSEC validation is failing, not the authoritative server
\`\`\`

## Step 2: Use delv for detailed chain tracing

\`\`\`bash
# delv performs full DNSSEC validation and reports each step
delv @8.8.8.8 example.com A +rtrace +vtrace

# Look for: "no valid signature found", "signature expired", "key not found"
\`\`\`

## Step 3: Check RRSIG expiry

\`\`\`bash
dig +dnssec +multiline example.com A | grep -A8 "RRSIG"
# The "20260619" style timestamps are YYYYMMDDHHmmSS UTC
# If expiry timestamp is in the past, signatures have expired
\`\`\`

## Step 4: Verify DS record matches DNSKEY

\`\`\`bash
# Get DS record from parent zone
dig example.com DS

# Get DNSKEY from zone
dig example.com DNSKEY

# Use dnssec-dsfromkey to compute expected DS from DNSKEY output
# The tag number and hash must match
\`\`\`

## Step 5: Use online validators

- dnsviz.net — visualizes the entire chain of trust with color-coded pass/fail
- dnssec-analyzer.verisignlabs.com — Verisign's DNSSEC debugger

## Common root causes found

- KSK was rotated but DS record was not updated at the registrar (most common)
- Zone signing daemon (e.g., OpenDNSSEC, BIND inline-signing) crashed and RRSIGs expired
- Algorithm mismatch between what was signed and what the resolver supports
- Clock skew on the authoritative server causing signatures with future inception times

## Fix procedure

Once the root cause is identified:
1. If DS mismatch: update DS record at registrar to match current KSK, wait for TTL expiry in parent zone
2. If expired RRSIGs: re-sign the zone immediately, verify new RRSIGs are served by authoritative
3. If automation failure: fix the signing daemon, add monitoring on RRSIG expiry dates`,
      },
      {
        question: 'What is the difference between ZSK and KSK, and why are two key pairs used instead of one?',
        answer: `## Single Key Approach — Why It Fails

A single key signing everything in a zone would require that key's hash (DS record) to be updated in the parent zone every time the key is rotated. Updating a DS record requires registrar interaction, which is slow, error-prone, and cannot be automated end-to-end without registrar API support. Rotating keys frequently under this model creates operational risk.

## Two-Key Solution

The ZSK/KSK split separates concerns:

- The KSK signs only the DNSKEY RRSet (the set of public keys for the zone)
- The ZSK signs all other RRSets (A, AAAA, MX, CNAME, etc.)
- The DS record in the parent zone contains a hash of the KSK only

This means:

- ZSKs can be rotated frequently (monthly) without touching the parent zone DS record — only the zone itself changes
- KSKs are rotated infrequently (annually) because each rotation requires updating the DS record at the registrar

## Operational consequences

\`\`\`bash
# During ZSK rollover (pre-publication method):
# 1. Publish new ZSK alongside old ZSK in DNSKEY RRSet
# 2. Wait for old ZSK TTL to expire from caches (1-2 days)
# 3. Start signing new RRSets with new ZSK
# 4. Remove old ZSK from DNSKEY RRSet after old RRSIG TTLs expire

# During KSK rollover:
# 1. Generate new KSK
# 2. Add new KSK to DNSKEY RRSet (double-KSK period)
# 3. Submit new DS record to registrar — CRITICAL STEP
# 4. Wait for parent DS TTL to expire
# 5. Remove old KSK
\`\`\`

## Key sizes

- ZSK: typically 1024-bit RSA or 256-bit ECDSA (P-256). Smaller is acceptable because rotation is frequent.
- KSK: typically 2048-bit RSA or 384-bit ECDSA (P-384). Larger for long-term security since rotation is infrequent.

Algorithm 13 (ECDSA P-256 SHA-256) is now the modern default, producing smaller signatures than RSA while maintaining equivalent security, which matters for UDP response size limits.`,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc4033',
      'https://www.rfc-editor.org/rfc/rfc4034',
      'https://www.rfc-editor.org/rfc/rfc4035',
      'https://dnsviz.net/',
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec.html',
      'https://www.icann.org/resources/pages/dnssec-what-is-it-why-important-2019-03-05-en',
    ],
    quickFire: [
      { q: 'What attack does DNSSEC prevent?', a: 'DNS cache poisoning (Kaminsky attack) -- an attacker injecting forged DNS responses. DNSSEC cryptographically signs records so resolvers can verify authenticity.' },
      { q: 'Does DNSSEC encrypt DNS responses?', a: 'No. DNSSEC only provides authentication and integrity via digital signatures. Responses are still transmitted in plaintext; use DNS over HTTPS (DoH) or DoT for encryption.' },
      { q: 'What is a DNSKEY record?', a: 'Publishes the public key used to verify RRSIG signatures for a DNS zone. There are two types: ZSK (Zone Signing Key) for records and KSK (Key Signing Key) for the DNSKEY set.' },
      { q: 'What is an RRSIG record?', a: 'A cryptographic signature over a DNS resource record set. Resolvers use the matching DNSKEY to verify the signature, confirming the records have not been tampered with.' },
      { q: 'What is a DS record and where does it live?', a: 'Delegation Signer -- a hash of the child zone\'s KSK, published in the parent zone. It chains trust from the parent to the child, forming the DNSSEC chain of trust.' },
      { q: 'What is the DNSSEC root of trust?', a: 'The IANA root zone KSK (Root Trust Anchor). All DNSSEC validation chains up to this key, which is managed by ICANN and rolled periodically.' },
      { q: 'What does NSEC/NSEC3 provide in DNSSEC?', a: 'Authenticated denial of existence -- proof that a queried name does not exist, preventing an attacker from spoofing NXDOMAIN responses. NSEC3 adds zone enumeration protection.' },
      { q: 'What tool visualizes the DNSSEC chain of trust?', a: 'DNSViz (dnsviz.net) -- renders the full chain of trust graphically, showing valid signatures, broken links, and misconfigured DS records.' },
      { q: 'What happens if a DNSSEC signature expires?', a: 'Validating resolvers return SERVFAIL for all records in the zone, making the domain unreachable. Key rotation and signature refresh must be automated to prevent this.' },
    ],
  },

  {
    id: 'dns-route53',
    title: 'Route 53 & DNS Routing Policies',
    icon: 'search',
    color: '#22c55e',
    questions: 6,
    description: 'AWS Route 53 hosted zones, routing policies (simple/weighted/latency/failover/geolocation), health checks, and alias records.',
    visualizations: [],
    introduction: `AWS Route 53 is a globally distributed authoritative DNS service with additional traffic management capabilities that go far beyond standard DNS. It operates from 13 geographically distributed DNS server clusters, providing low-latency responses worldwide and SLA-backed availability of 100% for authoritative DNS.

Route 53 combines three functions: domain registration, authoritative DNS hosting (hosted zones), and health check-based traffic routing. This combination makes it a core building block for multi-region availability, blue/green deployments, and gradual traffic shifting in AWS architectures.

Hosted zones come in two types. Public hosted zones serve DNS responses to the public internet for your domain. Private hosted zones are associated with one or more VPCs and answer DNS queries only from within those VPCs, enabling internal service naming without exposing records publicly. Private hosted zones are commonly used to provide readable names for internal services and override public DNS records inside the VPC boundary (split-horizon DNS).

Route 53 routing policies determine how Route 53 responds when it receives a query for a record set. Simple routing returns a single resource. Weighted routing splits traffic by percentage across multiple resources. Latency-based routing directs each query to the AWS region with the lowest measured latency from the query origin. Failover routing directs traffic to a primary resource and switches to a secondary when the primary's health check fails. Geolocation routing directs users based on the geographic origin of the DNS query. Geoproximity routing (requires Traffic Flow) directs based on geographic coordinates with adjustable bias.

Alias records are a Route 53-specific extension that behave like CNAME records but work at the zone apex (e.g., example.com pointing to an ELB). Standard DNS forbids CNAME at the apex; alias records resolve this by returning the actual IP addresses of the target resource, not a CNAME chain. Alias records to AWS resources (ELB, CloudFront, S3, API Gateway) are also free of per-query charges, unlike regular A records resolving external IPs.`,
    whenToUse: [
      'Designing multi-region active-active or active-passive architectures with automatic DNS-based failover.',
      'Gradually shifting traffic between application versions using weighted routing for canary deployments.',
      'Routing users to the geographically nearest deployment for latency optimization.',
      'Setting up internal service DNS inside a VPC without exposing names to the public internet.',
      'Pointing a root domain (zone apex) to an Application Load Balancer or CloudFront distribution.',
      'Implementing blue/green deployments at the DNS layer by swapping weighted records from 0/100 to 100/0.',
    ],
    keyConcepts: [
      {
        term: 'Hosted Zone',
        definition: `A container for DNS records for a specific domain. Public hosted zones answer queries from the internet; private hosted zones answer queries only from associated VPCs. Each hosted zone gets four Route 53 nameservers (NS records) from different top-level domains for redundancy. You must update your domain registrar's NS records to point to these Route 53 nameservers for the zone to be authoritative.`,
      },
      {
        term: 'Alias Record',
        definition: `A Route 53-specific record type that maps a name to an AWS resource endpoint (ALB, NLB, CloudFront, S3 website, API Gateway, Elastic Beanstalk, another Route 53 record). Alias records resolve to the actual IP addresses of the target, not a CNAME chain, making them usable at the zone apex. Route 53 automatically reflects IP changes when the target resource's IPs change. Alias records to AWS resources incur no per-query charge.`,
      },
      {
        term: 'Health Checks',
        definition: `Route 53 health checkers poll endpoints from multiple AWS regions and aggregate results. Health check types: HTTP/HTTPS (checks status code and optionally response body), TCP (checks connection establishment), and Calculated health checks (logical AND/OR over other health checks). Health check status affects routing for failover, weighted, latency, and geolocation routing policies. Health checks can also monitor CloudWatch alarms, enabling complex composite conditions.`,
      },
      {
        term: 'Weighted Routing',
        definition: `Multiple records for the same name, each with a weight from 0-255. Route 53 selects a record probabilistically in proportion to weights. Weight 0 means the record receives no traffic unless all records have weight 0 (in which case traffic is distributed equally). Weighted routing is commonly used for canary releases (e.g., 95/5 weight split between stable and new version) and blue/green deployments.`,
      },
      {
        term: 'Latency-Based Routing',
        definition: `Route 53 maintains a latency table mapping resolver IP ranges to AWS regions based on empirical measurements. When a query arrives, Route 53 looks up which region has the lowest latency from the resolver's location and returns the record set associated with that region. Latency records are created per-region; each record specifies its associated region. This is not the same as geolocation — a user in London might be routed to eu-west-1 or us-east-1 depending on measured latency at query time.`,
      },
      {
        term: 'Failover Routing',
        definition: `Designates one record as Primary and one as Secondary for the same name. Route 53 returns the Primary record when its health check passes and switches to the Secondary when the Primary is unhealthy. Failover is DNS-layer only — switching adds DNS propagation latency (TTL of the record). For faster failover, use low TTL values (30-60 seconds) at the cost of higher DNS query volume and charges.`,
      },
    ],
    pitfalls: [
      'Using high TTLs (300+ seconds) on failover records. When the primary fails, clients with cached DNS responses continue sending traffic to the failed endpoint for the duration of the TTL. For critical failover scenarios, use TTL of 30-60 seconds and accept the additional query cost.',
      'Confusing latency routing with geolocation routing. Latency routing measures actual network latency from the resolver to AWS regions; it can route a user in Europe to us-east-1 if transatlantic latency is somehow lower. Geolocation routing uses the geographic origin of the query regardless of measured latency.',
      'Using CNAME at the zone apex. Standard DNS prohibits CNAME records at the zone apex (e.g., example.com). A CNAME at the apex would prevent all other records at the apex (SOA, NS) from existing. Use Alias records to point the apex to an AWS resource.',
      'Assuming health checks are instant. Route 53 health checkers check every 30 seconds by default (10 seconds for fast health checks at extra cost). A failed resource must fail 3 consecutive checks before being marked unhealthy. This means up to 90 seconds of failure before DNS failover begins, plus the TTL for cached responses to expire.',
      'Forgetting to associate private hosted zones with all relevant VPCs. A private hosted zone only answers queries from explicitly associated VPCs. Queries from non-associated VPCs fall through to public DNS, potentially exposing internal naming schemes or routing to wrong endpoints.',
      'Over-relying on DNS-based failover for sub-second recovery. DNS failover takes TTL + health check failure detection time (30-90 seconds minimum). For sub-second failover, use Application Load Balancer health checks, which operate at the connection level within a region.',
    ],
    keyQuestions: [
      {
        question: 'Design a multi-region active-passive architecture using Route 53. What routing policies and health checks would you use, and what are the failure mode timelines?',
        answer: `## Architecture

Two regions: us-east-1 (primary), eu-west-1 (secondary). API behind ALBs in each region.

## Route 53 Configuration

\`\`\`bash
# Create health check for primary ALB
aws route53 create-health-check \\
  --caller-reference "primary-$(date +%s)" \\
  --health-check-config '{
    "Type": "HTTPS",
    "FullyQualifiedDomainName": "api-primary.us-east-1.elb.amazonaws.com",
    "Port": 443,
    "ResourcePath": "/health",
    "RequestInterval": 10,
    "FailureThreshold": 3
  }'

# Create primary failover record (us-east-1 ALB alias)
aws route53 change-resource-record-sets \\
  --hosted-zone-id ZONE_ID \\
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "primary",
        "Failover": "PRIMARY",
        "HealthCheckId": "HEALTH_CHECK_ID",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "api-primary.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Create secondary failover record (eu-west-1 ALB alias)
# No health check needed on secondary — receives traffic when primary fails
\`\`\`

## Failure Timeline

1. Primary ALB health check fails (connection refused, 5xx, timeout)
2. Route 53 health checker marks it unhealthy after 3 consecutive failures x 10-second interval = 30 seconds
3. Route 53 stops returning the primary record, starts returning secondary
4. Clients with cached DNS must wait for TTL to expire before re-resolving
5. Total failover time: 30 seconds (health check detection) + TTL (set to 30-60s) = 60-90 seconds

## TTL Tradeoff

- TTL 30s: failover in ~60s, ~2x DNS query volume, higher Route 53 cost
- TTL 300s: failover in ~6 minutes, normal query volume
- For SLA-critical services: TTL 30s with fast health checks (10s, extra charge)

## EvaluateTargetHealth

Setting EvaluateTargetHealth: true on the alias record means Route 53 also considers the ALB's own health checks. If all ALB targets are unhealthy, Route 53 treats the alias as unhealthy automatically, even without an explicit Route 53 health check on the ALB DNS name. This provides a second layer of protection.

## Multi-region active-active variant

Use latency routing instead of failover, with health checks on each record. Route 53 routes each query to the lowest-latency healthy region. If a region fails its health check, Route 53 excludes it from responses automatically.`,
      },
      {
        question: 'What is the difference between an Alias record and a CNAME, and when must you use an Alias record?',
        answer: `## CNAME Behavior

A CNAME record maps one name to another name. DNS resolvers must recursively resolve the CNAME target to get an IP. This adds a DNS lookup hop and CNAME targets cannot be at the zone apex due to the DNS specification (RFC 1034): an apex zone must have SOA and NS records, and a CNAME at a name means no other record type can exist there.

\`\`\`bash
# A CNAME works for subdomains:
www.example.com.  CNAME  d123.cloudfront.net.

# This is ILLEGAL — apex cannot have CNAME:
# example.com.  CNAME  d123.cloudfront.net.  # RFC violation
\`\`\`

## Alias Record Behavior

Alias records are a Route 53 extension. They behave as an A/AAAA record to resolvers but internally map to an AWS resource endpoint. Route 53 resolves the alias target and returns the actual IPs directly in the response. No additional DNS hop for the client.

\`\`\`bash
# Alias record at apex — fully legal:
example.com.  A  ALIAS  d123.cloudfront.net.
# Route 53 returns the actual CloudFront IPs for the A record

# Query to see alias resolution:
dig example.com A  # Returns IP addresses, not a CNAME chain
\`\`\`

## When you must use Alias instead of CNAME

1. Zone apex (root domain): example.com must use Alias to point to CloudFront, ALB, S3, or API Gateway
2. AWS resource endpoints that change IPs: ELBs frequently change their IPs. Alias records automatically track these changes; hardcoded A records would break.
3. Cost: Alias records to AWS resources are free per-query; CNAME resolution involves additional queries that are charged

## Alias targets supported by Route 53

- Application/Network/Classic Load Balancers
- CloudFront distributions
- Elastic Beanstalk environments
- S3 website endpoints
- API Gateway regional/edge endpoints
- VPC endpoints
- Another Route 53 record in the same hosted zone

## Alias limitations

- Alias targets must be in AWS (cannot alias to external domains like GitHub Pages)
- Cannot create Alias record pointing to a CNAME record
- Alias records do not support TTL configuration — TTL is inherited from the target resource`,
      },
      {
        question: 'How does Route 53 weighted routing work, and how would you implement a canary release?',
        answer: `## Weighted Routing Mechanics

Route 53 calculates each record's probability as weight / sum(all weights). With records weighted 95 and 5, the probability split is 95% and 5%. Weight 0 means the record receives no traffic (useful to temporarily disable a version without deleting the record).

\`\`\`bash
# Create weighted records for canary deployment

# Stable version (weight 95)
aws route53 change-resource-record-sets \\
  --hosted-zone-id ZONE_ID \\
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "stable",
        "Weight": 95,
        "TTL": 60,
        "ResourceRecords": [{"Value": "1.2.3.4"}]
      }
    }]
  }'

# Canary version (weight 5)
aws route53 change-resource-record-sets \\
  --hosted-zone-id ZONE_ID \\
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "canary",
        "Weight": 5,
        "TTL": 60,
        "ResourceRecords": [{"Value": "5.6.7.8"}]
      }
    }]
  }'
\`\`\`

## Canary Release Progression

\`\`\`bash
# Step 1: Deploy canary at 5% traffic
# Monitor error rate, latency, business metrics for 30 minutes

# Step 2: If healthy, increase to 25%
aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID \\
  --change-batch '{"Changes": [{"Action": "UPSERT", "ResourceRecordSet": {
    "Name": "api.example.com", "Type": "A",
    "SetIdentifier": "canary", "Weight": 25,
    "TTL": 60, "ResourceRecords": [{"Value": "5.6.7.8"}]
  }}]}'

# Step 3: 50/50 split — validate parity
# Step 4: Promote canary to 100%, set stable to 0
# Step 5: Eventually delete the stable record

# Emergency rollback: set canary weight to 0
\`\`\`

## Sticky Sessions Caveat

DNS-level routing is not sticky. A single user can receive responses from both the stable and canary version within the TTL window (as DNS resolvers re-query, or different resolvers are used). This is acceptable for stateless APIs but problematic for session-based applications. For sticky canary traffic, use ALB weighted target groups instead, which provide connection-level routing consistency.

## Combining with Health Checks

Attach health checks to each weighted record. If the canary crashes, Route 53 stops returning it and sends all traffic to the stable record, providing automatic rollback without manual intervention.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html',
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html',
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html',
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html',
    ],
    quickFire: [
      { q: 'What is the difference between a Route 53 Alias and a CNAME record?', a: 'Alias resolves at the DNS level to the target\'s IP (free, works at zone apex). CNAME is a standard DNS redirect, cannot be at the apex, and incurs an extra DNS lookup.' },
      { q: 'What Route 53 routing policy distributes traffic by geographic region?', a: 'Geolocation routing -- routes based on the DNS query origin country/continent. Latency-based routing routes to the lowest-latency AWS region instead.' },
      { q: 'How does Route 53 failover routing work?', a: 'A primary record is served while its health check passes. When the check fails, Route 53 automatically returns the secondary record, achieving DNS-level failover.' },
      { q: 'What is weighted routing in Route 53?', a: 'Assigns a numeric weight to each record; traffic is distributed proportionally. A weight of 0 removes a record from rotation without deleting it -- useful for canary deploys.' },
      { q: 'What is Route 53 Resolver and what problem does it solve?', a: 'A regional DNS resolver that handles DNS forwarding between AWS VPCs and on-premises networks, enabling hybrid environments to resolve both private zone and corporate DNS names.' },
      { q: 'What does a Route 53 health check monitor?', a: 'HTTP/HTTPS/TCP endpoints or CloudWatch alarms. It polls from multiple AWS regions; a configurable number of consecutive failures marks the endpoint unhealthy.' },
      { q: 'What is a Route 53 private hosted zone?', a: 'A DNS zone visible only within associated VPCs. Used for internal service names (db.internal, api.internal) that should not be resolvable from the public internet.' },
      { q: 'What is Route 53 Traffic Flow?', a: 'A visual policy editor for combining routing policies (geolocation, latency, weighted, failover) into a single traffic policy applied to one or more DNS names.' },
      { q: 'What is the default TTL recommendation for Route 53 records during a migration?', a: 'Lower to 60s 24-48 hours before cutover so stale caches expire quickly after the change. Restore to 300-3600s after migration completes to reduce query volume.' },
    ],
  },

  {
    id: 'split-horizon-dns',
    title: 'Split-Horizon DNS',
    icon: 'search',
    color: '#22c55e',
    questions: 4,
    description: 'Internal vs external DNS views for the same domain, use in VPCs and split-tunnel VPNs, and private hosted zones.',
    visualizations: [],
    introduction: `Split-horizon DNS (also called split-brain DNS or split-view DNS) is a configuration where the same domain name returns different DNS responses depending on the source of the query. External clients resolving api.example.com receive the public IP of a load balancer; internal clients within the VPC receive the private IP of the same service, bypassing the load balancer and NAT gateway entirely.

This pattern is fundamental to cloud networking. In AWS, Route 53 private hosted zones implement split-horizon DNS natively — you create a private hosted zone for example.com, associate it with specific VPCs, and records in that private zone shadow the public hosted zone for queries originating inside those VPCs. The resolver inside the VPC (169.254.169.253, the VPC's built-in resolver at the second IP of the VPC CIDR) checks private hosted zones first, then falls through to public DNS.

Split-horizon DNS solves the hairpinning problem. Without it, an application inside a VPC that calls api.example.com would resolve to the public ELB IP, send traffic out through the internet gateway, have it NATted back in, traverse the ELB, and reach the target — adding latency and NAT gateway cost. With a private hosted zone pointing api.example.com to the internal ALB or directly to service IPs, traffic stays on the AWS private network.

The same pattern applies to split-tunnel VPNs. Employees connected to a corporate VPN with split tunneling receive internal DNS responses for company domains (routing those queries through the VPN tunnel to an internal resolver) while public internet traffic bypasses the VPN. The VPN client is configured with DNS search domains that determine which queries go to the internal resolver.

Split-horizon DNS introduces operational complexity. When internal and external views diverge, debugging connectivity issues requires knowing which view a client is using. Certificate management must account for both views — internal services may use private CAs or self-signed certificates that external clients should not trust.`,
    whenToUse: [
      'Preventing VPC traffic from hairpinning through the internet gateway when calling internal services by their public domain name.',
      'Providing internal services with human-readable names without exposing those names or IPs publicly.',
      'Configuring split-tunnel VPNs so corporate DNS queries resolve internally while public traffic bypasses the tunnel.',
      'Overriding public DNS records inside a VPC to point to a different backend (e.g., pointing an external SaaS vendor domain to an internal mock during testing).',
    ],
    keyConcepts: [
      {
        term: 'Private Hosted Zone (Route 53)',
        definition: `A Route 53 hosted zone associated with one or more VPCs. Queries from within an associated VPC resolve using the private zone records first; if no record exists in the private zone, the query falls through to public DNS. Private hosted zones are not visible outside the associated VPCs. They can override public records (e.g., a private zone for example.com with an api record pointing to a private IP shadows the public api.example.com record for VPC clients).`,
      },
      {
        term: 'VPC Resolver (AmazonProvidedDNS)',
        definition: `Each AWS VPC has a built-in DNS resolver at the base of the VPC CIDR + 2 (e.g., 10.0.0.2 for a 10.0.0.0/16 VPC), also accessible via the link-local address 169.254.169.253. This resolver checks Route 53 private hosted zones associated with the VPC, then resolves public DNS. Route 53 Resolver endpoints extend this to on-premises networks via inbound and outbound resolver rules.`,
      },
      {
        term: 'DNS Search Domain',
        definition: `A list of domain suffixes appended to unqualified hostnames for resolution. In split-tunnel VPN setups, the VPN client pushes internal search domains (e.g., corp.example.com) to the client's resolver. Queries for internal services (api.corp.example.com) are sent to the internal resolver through the tunnel; everything else uses the public resolver. This avoids routing all DNS traffic through the VPN while still resolving internal names correctly.`,
      },
      {
        term: 'Hairpinning',
        definition: `When traffic exits a private network to a public address and immediately re-enters the same network. A VM calling an ELB by its public DNS name sends packets out through the internet gateway, the packets are NATted to the ELB's public IP, the ELB routes them to targets inside the same VPC, and responses travel back the same path. Split-horizon DNS eliminates hairpinning by resolving the service to its private IP, keeping traffic on the internal network.`,
      },
      {
        term: 'Route 53 Resolver Rules',
        definition: `Rules that forward DNS queries matching specified domain names to specific IP addresses (resolver endpoints). Used to extend split-horizon DNS to hybrid cloud environments. Outbound rules forward internal domain queries from the VPC to on-premises resolvers. Inbound rules allow on-premises servers to resolve Route 53 private hosted zone names by querying the inbound endpoint IPs. This creates bidirectional split-horizon DNS across VPN or Direct Connect.`,
      },
    ],
    pitfalls: [
      'Forgetting to associate the private hosted zone with all VPCs that need internal resolution. A new VPC peered with the main VPC does not automatically inherit private hosted zone associations. Each VPC must be explicitly associated, and VPC peering does not extend DNS resolution across the peer by default — you must enable DNS resolution support on the peering connection.',
      'Assuming split-horizon DNS works over VPC peering automatically. Peered VPCs cannot use each other\'s private hosted zones by default. You must share the private hosted zone using RAM (Resource Access Manager) or configure Route 53 Resolver rules with forwarding endpoints in each VPC.',
      'Creating split-horizon ambiguity during debugging. If a service is unreachable, the first question is which DNS view the client is using. Always check which resolver is being used (dig +norecurse, check /etc/resolv.conf) before assuming the record is wrong.',
      'Overlapping private hosted zones causing unexpected shadowing. If you create a private hosted zone for example.com, ALL queries for example.com and its subdomains from associated VPCs resolve against that private zone. Records not present in the private zone will return NXDOMAIN even if they exist in the public zone. Use specific subzones (internal.example.com) rather than shadowing the entire public zone.',
    ],
    keyQuestions: [
      {
        question: 'How does split-horizon DNS work in AWS, and how would you implement it for a service that has both internal and external clients?',
        answer: `## Scenario

Service api.example.com is served by an internet-facing ALB (public IP) and an internal ALB (private IP 10.0.10.100). External clients should hit the public ALB; internal VPC clients should hit the internal ALB directly.

## Implementation

### Step 1: Public hosted zone (already exists)
\`\`\`
api.example.com.  60  A  ALIAS  external-alb-123.us-east-1.elb.amazonaws.com
\`\`\`

### Step 2: Create a private hosted zone for example.com

\`\`\`bash
aws route53 create-hosted-zone \\
  --name example.com \\
  --caller-reference "private-$(date +%s)" \\
  --hosted-zone-config '{"PrivateZone": true, "Comment": "Internal VPC resolution"}' \\
  --vpc '{"VPCRegion": "us-east-1", "VPCId": "vpc-12345"}'
\`\`\`

### Step 3: Add the internal A record

\`\`\`bash
aws route53 change-resource-record-sets \\
  --hosted-zone-id PRIVATE_ZONE_ID \\
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "10.0.10.100"}]
      }
    }]
  }'
\`\`\`

### Step 4: Associate additional VPCs

\`\`\`bash
aws route53 associate-vpc-with-hosted-zone \\
  --hosted-zone-id PRIVATE_ZONE_ID \\
  --vpc '{"VPCRegion": "us-east-1", "VPCId": "vpc-67890"}'
\`\`\`

## Verification

\`\`\`bash
# From inside the VPC — should return private IP
dig api.example.com @169.254.169.253

# From outside — should return public ALB IPs
dig api.example.com @8.8.8.8

# Check which resolver is configured on a Linux instance
cat /etc/resolv.conf
# nameserver 10.0.0.2  (VPC resolver)
\`\`\`

## Cross-account private hosted zone sharing

\`\`\`bash
# Share the private hosted zone via RAM
aws ram create-resource-share \\
  --name "internal-dns-share" \\
  --resource-arns "arn:aws:route53:::hostedzone/PRIVATE_ZONE_ID" \\
  --principals "123456789012"  # target account ID

# Target account associates their VPC
aws route53 associate-vpc-with-hosted-zone \\
  --hosted-zone-id PRIVATE_ZONE_ID \\
  --vpc '{"VPCRegion": "us-east-1", "VPCId": "vpc-target"}'
\`\`\`

## Key operational note

The private zone for example.com shadows the entire public zone for associated VPCs. Any public subdomain not replicated in the private zone will return NXDOMAIN for internal clients. Either replicate all records needed internally, or use a dedicated internal subdomain (internal.example.com) for the private zone to avoid shadowing.`,
      },
      {
        question: 'How does DNS resolution work over VPC peering, and what do you need to enable for split-horizon DNS to work across peered VPCs?',
        answer: `## Default Behavior

VPC peering connects two VPCs at the network layer, but DNS resolution is not automatically shared. By default, instances in VPC-B cannot resolve Route 53 private hosted zone records from VPC-A even if they have network connectivity through the peering connection.

## Required Configuration

\`\`\`bash
# Step 1: Enable DNS resolution support on the peering connection
# Both sides must enable this:

# VPC-A (requester side)
aws ec2 modify-vpc-peering-connection-options \\
  --vpc-peering-connection-id pcx-12345 \\
  --requester-peering-connection-options '{"AllowDnsResolutionFromRemoteVpc": true}'

# VPC-B (accepter side)
aws ec2 modify-vpc-peering-connection-options \\
  --vpc-peering-connection-id pcx-12345 \\
  --accepter-peering-connection-options '{"AllowDnsResolutionFromRemoteVpc": true}'
\`\`\`

## What this enables

With DNS resolution enabled on the peering connection, instances in either VPC can resolve the private DNS hostnames (ec2-internal hostnames like ip-10-0-1-5.ec2.internal) of instances in the peered VPC to their private IPs.

## Private Hosted Zone Sharing Across Peered VPCs

DNS resolution on the peering connection does NOT automatically share Route 53 private hosted zones. You must explicitly associate the private hosted zone with VPC-B:

\`\`\`bash
# Associate private hosted zone from VPC-A's account with VPC-B
aws route53 associate-vpc-with-hosted-zone \\
  --hosted-zone-id ZONE_ID \\
  --vpc '{"VPCRegion": "us-east-1", "VPCId": "vpc-B-id"}'
\`\`\`

## Transit Gateway DNS Consideration

VPC peering is a one-to-one connection. For hub-and-spoke DNS across many VPCs, use Transit Gateway with Route 53 Resolver endpoints:

- Deploy an inbound resolver endpoint in the central DNS VPC
- Create resolver rules in spoke VPCs forwarding internal domain queries to the central endpoint
- This scales to hundreds of VPCs without point-to-point peering for DNS`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-private.html',
      'https://docs.aws.amazon.com/vpc/latest/peering/modify-peering-connections.html',
      'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html',
      'https://aws.amazon.com/blogs/networking-and-content-delivery/centralized-dns-management-of-hybrid-cloud-with-amazon-route-53-and-aws-transit-gateway/',
    ],
    quickFire: [
      { q: 'What is split-horizon DNS?', a: 'Serving different DNS answers for the same name depending on where the query originates -- internal clients get a private IP, external clients get a public IP.' },
      { q: 'What problem does split-horizon DNS solve?', a: 'Allows a single hostname (api.example.com) to route internal traffic to a private endpoint while external traffic goes to the public endpoint, without separate names.' },
      { q: 'How is split-horizon DNS implemented in AWS?', a: 'Create a Route 53 private hosted zone with the same name as the public zone. Associate it with VPCs. VPC resolvers query the private zone first; external queries hit the public zone.' },
      { q: 'What is a common security risk with split-horizon DNS?', a: 'DNS rebinding attacks -- a malicious external site returns an internal IP in a DNS response, causing the browser to make requests to internal services. Mitigated by DNS rebinding protection.' },
      { q: 'How does split-horizon DNS interact with VPN or Direct Connect?', a: 'On-premises clients connected via VPN/Direct Connect should be configured to use the internal DNS resolver so they resolve the private IP, not the public one.' },
      { q: 'What is the difference between split-horizon and split-brain DNS?', a: 'The terms are used interchangeably. Both describe serving different answers based on query source. Split-brain emphasizes that two independent zone views exist.' },
      { q: 'How do you verify which DNS view a client is using?', a: 'dig hostname from the client -- compare the returned IP to the expected private or public address. Check the query path with dig +trace or by inspecting /etc/resolv.conf nameserver.' },
      { q: 'What happens if a private hosted zone is not associated with a VPC?', a: 'The private zone is unreachable -- Route 53 will not serve it to any resolver. The public zone answers instead, potentially leaking internal hostnames externally.' },
    ],
  },

  {
    id: 'service-discovery',
    title: 'Service Discovery',
    icon: 'search',
    color: '#22c55e',
    questions: 6,
    description: 'Consul service mesh, CoreDNS in Kubernetes, headless services, SRV records, and client-side vs server-side discovery patterns.',
    visualizations: [],
    introduction: `Service discovery is the mechanism by which services in a distributed system locate each other's network endpoints without hardcoded IPs or configuration files. In dynamic environments where containers, pods, and instances start, stop, and move frequently, static service endpoints are impractical. Service discovery solves this by maintaining a real-time registry of healthy service endpoints and providing a consistent interface for clients to query it.

There are two primary discovery patterns. In client-side discovery, the client queries a service registry (such as Consul or Eureka) directly, receives a list of healthy endpoints, and applies its own load balancing logic to select an instance. Netflix Ribbon used this pattern extensively. In server-side discovery, the client sends requests to a fixed intermediary (a load balancer or service mesh proxy), which queries the registry and routes the request. Kubernetes services and AWS ECS use server-side discovery, where kube-proxy or the cloud load balancer handles the routing transparently.

Kubernetes implements service discovery through its built-in DNS system, powered by CoreDNS. Every Service object gets a DNS name in the format service-name.namespace.svc.cluster.local. A ClusterIP service returns a single virtual IP; the traffic is intercepted by kube-proxy (or eBPF-based solutions like Cilium) and load-balanced to healthy pods. Headless services (ClusterIP: None) return the individual pod IPs directly via DNS instead of a virtual IP, enabling client-side load balancing and direct pod addressing.

SRV records extend DNS-based discovery to include port and protocol information. A SRV record encodes the hostname, port, priority, and weight for a service instance, allowing clients to discover not just where a service runs but what port it listens on. etcd, Consul, and gRPC name resolvers all support SRV-based discovery.

Consul goes beyond DNS to provide health-checked service registration, service mesh (with Envoy sidecar proxies), key-value storage, and ACL-based access control. Its DNS interface integrates service discovery into standard DNS resolution while its HTTP API enables programmatic registry access.`,
    whenToUse: [
      'Connecting microservices in Kubernetes without hardcoding service IPs or ports.',
      'Implementing zero-downtime deployments where service endpoints change as pods roll over.',
      'Building a service mesh where policy, mTLS, and observability are applied at the discovery layer.',
      'Enabling stateful service discovery where clients need to talk to specific instances (e.g., Kafka brokers, Cassandra nodes) rather than any healthy replica.',
      'Cross-cluster or multi-cloud service discovery where services span multiple Kubernetes clusters or cloud providers.',
      'Replacing static configuration files with dynamic service registries in legacy application migrations.',
    ],
    keyConcepts: [
      {
        term: 'Client-Side vs Server-Side Discovery',
        definition: `In client-side discovery, the client queries the service registry, gets a list of endpoints, and picks one using its own load balancing policy. This gives the client control but requires each client to implement discovery logic. In server-side discovery, the client sends requests to a stable endpoint (load balancer, service mesh proxy); the proxy queries the registry and forwards the request. Kubernetes services use server-side discovery — the client only knows the Service ClusterIP, not individual pod IPs.`,
      },
      {
        term: 'CoreDNS in Kubernetes',
        definition: `CoreDNS is the cluster DNS server in Kubernetes, running as a Deployment in the kube-system namespace. It serves the cluster.local domain. Every Service gets an A record (service.namespace.svc.cluster.local) resolving to the ClusterIP. Pods get A records (pod-ip.namespace.pod.cluster.local). CoreDNS is configured via a Corefile, which specifies plugins for forwarding, caching, health checking, and custom zone handling. Cluster DNS is configured in /etc/resolv.conf of each pod via the kubelet.`,
      },
      {
        term: 'Headless Service',
        definition: `A Kubernetes Service with spec.clusterIP: None. Instead of creating a virtual ClusterIP, Kubernetes DNS returns the individual pod IPs directly for the service's DNS name. This enables client-side load balancing, direct pod addressing, and StatefulSet pod discovery (each pod gets a stable DNS name like pod-0.service.namespace.svc.cluster.local). Headless services are used by stateful applications (Cassandra, Kafka, MongoDB) where clients need to address specific instances.`,
      },
      {
        term: 'SRV Record',
        definition: `A DNS SRV record encodes service location information: priority, weight, port, and target hostname. Format: _service._proto.name. TTL class SRV priority weight port target. Example: _http._tcp.myservice.example.com SRV 10 20 8080 host1.example.com. Clients query SRV records to discover both hostname and port dynamically. gRPC uses SRV records for name resolution; Kubernetes creates SRV records for named ports in Services (e.g., _http._tcp.service.namespace.svc.cluster.local).`,
      },
      {
        term: 'Consul Service Mesh',
        definition: `Consul operates as a service registry (agents register services with health checks), DNS resolver (consul.service.consul format), and service mesh (Consul Connect injects Envoy sidecars that handle mTLS, traffic policies, and observability). The Consul catalog stores service name, address, port, tags, and health status. Services are registered via API, CLI, or configuration files. Consul supports multiple datacenters with WAN gossip federation, enabling multi-region service discovery.`,
      },
      {
        term: 'Service Mesh vs DNS Discovery',
        definition: `DNS discovery returns endpoints for a service name, leaving load balancing and health checking to the client or a proxy. A service mesh (Istio, Linkerd, Consul Connect) injects a sidecar proxy alongside each service instance that intercepts all traffic, enforces mTLS, applies traffic policies (circuit breaking, retries, rate limiting), and emits telemetry. The mesh control plane (Pilot/Istiod) distributes endpoint information to sidecars using xDS APIs, not DNS. DNS discovery is simpler; service meshes add security and observability at the cost of operational complexity.`,
      },
    ],
    pitfalls: [
      'Relying on DNS TTL for fast failover in Kubernetes. Kubernetes DNS records for ClusterIP services have a TTL (typically 5 seconds in CoreDNS cache). When a pod becomes unhealthy, kube-proxy updates iptables rules within seconds, but DNS clients with cached responses continue to resolve to the same ClusterIP — which kube-proxy handles correctly. The real issue is with headless services and client-side discovery: cached pod IPs may point to terminated pods until TTL expires.',
      'Using ClusterIP services for stateful workloads that need specific instance routing. A ClusterIP service load-balances across all ready pods. For Kafka consumers, Cassandra tokens, or Redis clusters where clients must connect to a specific node, use headless services and StatefulSet stable DNS names (pod-0.service.namespace.svc.cluster.local).',
      'Forgetting ndots configuration in Kubernetes. The default resolv.conf in pods has ndots:5, meaning any hostname with fewer than 5 dots triggers search domain appended resolution attempts before the absolute name is tried. A call to api.example.com generates up to 6 DNS queries (api.example.com.default.svc.cluster.local, api.example.com.svc.cluster.local, api.example.com.cluster.local, then api.example.com). For external hostnames, append a trailing dot (api.example.com.) to force absolute resolution and avoid the search domain overhead.',
      'Not configuring health checks in Consul before using the service in routing. Consul registers services immediately when the agent receives the registration; if health checks are not configured, the service is marked healthy by default even if the process has not finished starting. Always define health checks (HTTP, TCP, or script-based) and set DeregisterCriticalServiceAfter to automatically remove services that fail health checks for too long.',
      'Assuming Consul DNS and Kubernetes DNS can be trivially merged. Running Consul inside Kubernetes requires configuring CoreDNS to forward .consul queries to the Consul DNS server. Without this, services registered in Consul are not resolvable via Kubernetes DNS. Add a stub zone to the CoreDNS Corefile for the consul domain.',
    ],
    keyQuestions: [
      {
        question: 'Explain how Kubernetes service discovery works end-to-end, from a pod making a DNS request to receiving a response from another service.',
        answer: `## Full Request Path

### Step 1: DNS configuration in the pod

\`\`\`bash
# Check pod's DNS config
kubectl exec -it mypod -- cat /etc/resolv.conf
# nameserver 10.96.0.10        (CoreDNS ClusterIP)
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
\`\`\`

The nameserver 10.96.0.10 is the CoreDNS Service ClusterIP. The search domains are added by kubelet when the pod starts.

### Step 2: Application calls a service

\`\`\`python
# Application calls: requests.get("http://payment-service/charge")
# Resolver sees "payment-service" with no dots (< ndots:5)
# Appends search domains in order:
# 1. payment-service.default.svc.cluster.local  <-- matches!
\`\`\`

### Step 3: CoreDNS receives the query

\`\`\`bash
# CoreDNS checks its zone data for the cluster.local domain
# Finds the Service "payment-service" in namespace "default"
# Returns the ClusterIP: 10.100.200.30

# Verify what CoreDNS returns:
kubectl exec -it mypod -- dig payment-service.default.svc.cluster.local A
# Answer: 10.100.200.30
\`\`\`

### Step 4: kube-proxy intercepts the packet

The pod sends a TCP SYN to 10.100.200.30:80. kube-proxy (or eBPF/Cilium) has installed iptables DNAT rules:

\`\`\`bash
# On a node, see the DNAT rules:
iptables -t nat -L KUBE-SERVICES | grep payment-service
# DNAT rules redirect 10.100.200.30:80 to one of the pod IPs
# e.g., 10.244.1.5:8080 (round-robin or random selection)
\`\`\`

### Step 5: Packet reaches the pod

The packet arrives at pod 10.244.1.5 with destination address rewritten to the pod IP. The pod processes the request and responds.

## Headless Service variant

\`\`\`bash
# For a headless service (clusterIP: None):
kubectl exec -it mypod -- dig payment-service.default.svc.cluster.local A
# Returns multiple A records — one per ready pod:
# 10.244.1.5
# 10.244.2.8
# 10.244.3.1
# Client chooses an endpoint; no kube-proxy involvement
\`\`\`

## StatefulSet stable DNS

\`\`\`bash
# StatefulSet "kafka" with 3 replicas in namespace "messaging"
# Each pod gets a stable DNS name:
dig kafka-0.kafka.messaging.svc.cluster.local  # always pod-0's IP
dig kafka-1.kafka.messaging.svc.cluster.local  # always pod-1's IP
# These names are stable even through pod restarts
\`\`\`

## SRV records for named ports

\`\`\`bash
# Service with a named port "http":
dig _http._tcp.payment-service.default.svc.cluster.local SRV
# Returns: priority weight port hostname
# 0 100 80 payment-service.default.svc.cluster.local.
\`\`\``,
      },
      {
        question: 'What is the difference between client-side and server-side service discovery, and what are the tradeoffs of each pattern?',
        answer: `## Client-Side Discovery

The client queries the service registry directly (e.g., Consul HTTP API, Eureka REST endpoint, etcd key lookup), receives a list of healthy endpoints, and applies its own load balancing policy to select one.

\`\`\`python
# Client-side discovery with Consul HTTP API
import requests

def discover_endpoint(service_name):
    response = requests.get(
        f"http://consul:8500/v1/health/service/{service_name}?passing=true"
    )
    services = response.json()
    # Client picks one — round-robin, random, least-connections
    instance = services[0]
    return f"{instance['Service']['Address']}:{instance['Service']['Port']}"

endpoint = discover_endpoint("payment-service")
# Returns: "10.0.1.5:8080"
\`\`\`

Advantages:
- Client has full control over load balancing policy (affinity, circuit breaking)
- No additional network hop through a proxy
- Lower latency per request

Disadvantages:
- Every client must implement discovery and load balancing logic
- Adds dependency on the registry (if Consul is down, discovery fails)
- Harder to enforce traffic policies centrally

## Server-Side Discovery

The client sends requests to a fixed, stable address. The intermediary (load balancer, service mesh proxy) queries the registry and routes to a healthy instance.

\`\`\`bash
# Kubernetes service — client always calls "payment-service:80"
# kube-proxy intercepts and routes to a healthy pod
# Client never sees individual pod IPs

curl http://payment-service/charge
# kube-proxy translates to: 10.244.1.5:8080 or 10.244.2.8:8080
\`\`\`

Advantages:
- Simple client — just a hostname and port, no registry SDK needed
- Policies (retries, circuit breaking, mTLS) enforced centrally by the proxy
- Registry changes are transparent to clients

Disadvantages:
- Extra network hop through proxy (adds ~0.2-1ms per request)
- Single point of failure if proxy is not distributed/replicated
- Less flexible per-client load balancing

## When to choose each

| Criteria | Client-Side | Server-Side |
|---|---|---|
| Many different client languages | Bad (each needs SDK) | Good (HTTP to fixed endpoint) |
| Need custom load balancing | Good | Bad |
| Policy enforcement | Hard | Easy |
| Kubernetes native workloads | Use server-side (Services) | Default |
| gRPC with streaming | Client-side often preferred | Proxy must support HTTP/2 |

## Service mesh as a hybrid

A service mesh (Istio, Linkerd) is server-side discovery (the Envoy sidecar is the proxy) with client-side flexibility (each sidecar has the full endpoint list and applies sophisticated routing). The application sees server-side simplicity; the mesh provides client-side control.`,
      },
      {
        question: 'How would you set up Consul for service discovery in a multi-datacenter environment? What is the WAN gossip pool?',
        answer: `## Consul Architecture

Each datacenter runs a cluster of Consul servers (3 or 5 for quorum). Consul agents run on every node and register services. The WAN gossip pool connects server agents across datacenters.

## Single datacenter setup

\`\`\`hcl
# consul server config (server.hcl)
datacenter = "us-east-1"
data_dir   = "/opt/consul/data"
server     = true
bootstrap_expect = 3

bind_addr   = "0.0.0.0"
client_addr = "0.0.0.0"

retry_join = ["10.0.0.1", "10.0.0.2", "10.0.0.3"]

ui_config {
  enabled = true
}
\`\`\`

\`\`\`bash
# Register a service via API
curl -X PUT http://localhost:8500/v1/agent/service/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "Name": "payment-service",
    "ID": "payment-1",
    "Address": "10.0.1.5",
    "Port": 8080,
    "Tags": ["v2", "primary"],
    "Check": {
      "HTTP": "http://10.0.1.5:8080/health",
      "Interval": "10s",
      "DeregisterCriticalServiceAfter": "1m"
    }
  }'

# Discover via DNS
dig @127.0.0.1 -p 8600 payment-service.service.consul SRV
# Returns: priority weight port host

# Discover via HTTP API
curl http://localhost:8500/v1/health/service/payment-service?passing=true
\`\`\`

## Multi-datacenter with WAN gossip

\`\`\`hcl
# Add to server config in each datacenter
retry_join_wan = ["10.1.0.1", "10.1.0.2"]  # server IPs in other DCs
\`\`\`

The WAN gossip pool is a separate Serf gossip ring that connects only server nodes across datacenters. It uses port 8302 (default). LAN gossip (all agents within a datacenter) uses port 8301.

\`\`\`bash
# Query a service in another datacenter
curl "http://localhost:8500/v1/health/service/payment-service?dc=eu-west-1&passing=true"

# Via DNS: service.datacenter.consul format
dig @127.0.0.1 -p 8600 payment-service.service.eu-west-1.consul SRV
\`\`\`

## Prepared queries for failover

\`\`\`bash
# Create a prepared query that fails over to another DC
curl -X POST http://localhost:8500/v1/query \\
  -d '{
    "Name": "payment-with-failover",
    "Service": {
      "Service": "payment-service",
      "Failover": {
        "NearestN": 2,
        "Datacenters": ["us-east-1", "eu-west-1"]
      }
    }
  }'

# Query via DNS uses the nearest healthy DC automatically
dig @127.0.0.1 -p 8600 payment-with-failover.query.consul
\`\`\`

## Consul Connect for service mesh

\`\`\`hcl
# Enable sidecar proxy in service registration
service {
  name = "payment-service"
  port = 8080
  connect {
    sidecar_service {
      proxy {
        upstreams = [{
          destination_name = "database"
          local_bind_port  = 5432
        }]
      }
    }
  }
}
\`\`\`

Services connect to upstreams via localhost:local_bind_port; the Envoy sidecar handles mTLS and service identity automatically.`,
      },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/',
      'https://developer.hashicorp.com/consul/docs/architecture',
      'https://coredns.io/plugins/',
      'https://kubernetes.io/docs/concepts/services-networking/service/#headless-services',
      'https://istio.io/latest/docs/concepts/traffic-management/',
    ],
    quickFire: [
      { q: 'What is service discovery?', a: 'The mechanism by which services find each other\'s network location (IP:port) dynamically, without hardcoded addresses, as instances scale up/down.' },
      { q: 'What is DNS-based service discovery?', a: 'Services register with a DNS server; clients resolve the service name to get current IPs. Kubernetes uses CoreDNS: my-svc.my-namespace.svc.cluster.local resolves to the ClusterIP.' },
      { q: 'What is a Kubernetes headless service?', a: 'A Service with clusterIP: None -- DNS returns the individual pod IPs instead of a single VIP, enabling clients to load-balance or connect to specific pods directly.' },
      { q: 'How does Consul service discovery differ from Kubernetes DNS?', a: 'Consul uses a distributed key-value store with health-check-filtered DNS. It also supports multi-datacenter service discovery and is not limited to Kubernetes.' },
      { q: 'What is client-side vs server-side service discovery?', a: 'Client-side: the client queries the registry and load-balances itself (Ribbon, Envoy). Server-side: a load balancer queries the registry and forwards on the client\'s behalf (ALB, Nginx).' },
      { q: 'What is a service registry?', a: 'A database of available service instances and their addresses. Examples: Kubernetes etcd (via kube-apiserver), Consul, Eureka, Zookeeper.' },
      { q: 'What DNS name format does Kubernetes use for services?', a: 'service-name.namespace.svc.cluster.local -- the cluster domain is configurable. Within the same namespace, just service-name resolves via search domain expansion.' },
      { q: 'What happens to DNS when a Kubernetes pod restarts?', a: 'The pod gets a new IP. The Endpoints object is updated, CoreDNS reflects the new IP on the next query. TTL is very short (default 5s) so clients get the new address quickly.' },
      { q: 'What is xDS in the context of service discovery?', a: 'The Envoy API protocol (Endpoint Discovery Service, Cluster DS, etc.) used by service mesh control planes to push live service endpoint updates to sidecar proxies without DNS.' },
    ],
  },

  {
    id: 'dns-caching',
    title: 'DNS Caching & TTL',
    icon: 'search',
    color: '#22c55e',
    questions: 5,
    description: 'TTL mechanics, negative caching, NXDOMAIN propagation, stale-while-revalidate, cache poisoning attacks, and resolver hierarchies.',
    visualizations: [],
    introduction: `DNS caching is fundamental to the scalability of the internet. Without caching, every DNS query would traverse from the client to the root nameservers, through TLD nameservers, to the authoritative nameservers for every single request. Caching allows resolvers to store and reuse responses for the duration specified by the Time-To-Live (TTL) value in each DNS record, dramatically reducing query volume to authoritative servers and decreasing resolution latency for clients.

The TTL field in a DNS resource record specifies how long, in seconds, the record may be cached by resolvers. When an authoritative nameserver returns a record, it includes the TTL; each resolver that caches the response decrements the TTL as time passes and re-queries the authoritative server when it reaches zero. A record with TTL 300 cached by a resolver five minutes ago has TTL 0 — the resolver must re-query before serving the record to the next client.

The resolver hierarchy has several layers. Clients first check their local DNS cache (maintained by the OS resolver), then query a stub resolver (typically the router or DHCP-provided nameserver), which queries a recursive resolver (often the ISP's resolver or a public resolver like 8.8.8.8). The recursive resolver caches responses and serves them to multiple clients, making its cache the most impactful layer for TTL decisions.

Negative caching handles NXDOMAIN (non-existent domain) responses. RFC 2308 standardizes that NXDOMAIN responses should be cached for the duration specified in the SOA record's minimum field or the SOA TTL, whichever is smaller. This prevents resolvers from hammering authoritative servers with repeated queries for domains that do not exist.

Cache poisoning is the most serious security threat to DNS caching. An attacker who can inject a fraudulent DNS response into a resolver's cache can redirect traffic for any domain the resolver serves. The Kaminsky attack in 2008 showed how an attacker could poison the cache of any resolver by racing to inject a forged response before the legitimate one arrived. DNSSEC provides cryptographic protection against cache poisoning; source port randomization and 0x20 encoding are mitigations for non-DNSSEC resolvers.`,
    whenToUse: [
      'Planning DNS record TTL values for a deployment that requires fast failover vs one that prioritizes caching efficiency.',
      'Debugging why DNS changes are not propagating to all clients despite being updated on the authoritative nameserver.',
      'Investigating elevated DNS query rates on authoritative nameservers and determining whether resolver-side caching is working correctly.',
      'Understanding the blast radius of a DNS cache poisoning attack and evaluating mitigations.',
      'Implementing stale-while-revalidate behavior in application-level DNS caching to reduce resolution latency on the hot path.',
    ],
    keyConcepts: [
      {
        term: 'TTL (Time-To-Live)',
        definition: `A 32-bit integer in each DNS resource record specifying the maximum number of seconds the record may be cached by resolvers. When an authoritative server returns a record with TTL 300, a recursive resolver caches it for up to 300 seconds. The resolver decrements the TTL in real time and returns the remaining TTL to clients who query it. Clients see the TTL decrement as records age in the resolver's cache. Once TTL reaches 0, the resolver must query the authoritative server again. Setting TTL low (30-60s) enables fast propagation of record changes; high TTL (3600-86400s) reduces authoritative server query volume.`,
      },
      {
        term: 'Negative Caching (NXDOMAIN)',
        definition: `RFC 2308 defines how NXDOMAIN responses are cached. When an authoritative server returns NXDOMAIN, it includes the SOA record for the zone. Resolvers cache the NXDOMAIN for min(SOA minimum field, SOA TTL) seconds. During this period, the resolver returns NXDOMAIN to clients without re-querying the authoritative server. Negative caching is why a newly created DNS record takes time to become accessible — resolvers that previously received NXDOMAIN for that name will not re-query until the negative cache entry expires.`,
      },
      {
        term: 'Resolver Hierarchy',
        definition: `DNS resolution passes through multiple caching layers. The OS resolver maintains a small local cache (Windows DNS Client, nscd on Linux, mDNSResponder on macOS). The stub resolver forwards to a recursive resolver (configured via DHCP or /etc/resolv.conf). The recursive resolver (ISP, corporate DNS, or public resolvers like 8.8.8.8 or 1.1.1.1) caches responses and serves many clients. Because recursive resolvers serve many clients, their cache is the most impactful — a record served from a popular recursive resolver cache effectively bypasses the authoritative server entirely.`,
      },
      {
        term: 'Cache Poisoning',
        definition: `An attack where a malicious party injects a fraudulent DNS record into a resolver's cache. The classic method exploits the fact that DNS queries use predictable transaction IDs and source ports. An attacker floods the resolver with forged responses; if one arrives before the legitimate response and matches the transaction ID, the forged record is cached and served to all clients. The Kaminsky attack (2008) demonstrated this at scale. Mitigations: DNSSEC (cryptographic authentication), random source port selection (now standard), 0x20 encoding (randomize case in queries and verify case matches in responses), and Response Rate Limiting.`,
      },
      {
        term: 'Stale-While-Revalidate',
        definition: `An extension to caching behavior (RFC 8767) where a resolver serves a stale (expired TTL) record to the client immediately while simultaneously fetching a fresh copy from the authoritative server in the background. This eliminates the latency spike that occurs when a cached record expires and the client must wait for the authoritative query to complete (typically 10-100ms). The risk is that clients receive an outdated record for one request after the TTL expires. Unbound, BIND 9.12+, and Knot Resolver support stale-while-revalidate.`,
      },
      {
        term: 'Minimum TTL Floor',
        definition: `Many DNS resolvers enforce a minimum TTL floor regardless of what the authoritative server specifies. Cloudflare's resolver enforces a 1-second minimum; Google's 8.8.8.8 enforces a minimum of approximately 30 seconds for practical purposes. AWS Route 53 alias records inherit the TTL of the target resource. This means setting TTL to 0 or 1 on your authoritative records does not guarantee that resolvers will re-query on every request — most public resolvers will cache for at least 30 seconds, limiting how fast DNS-based failover can propagate.`,
      },
    ],
    pitfalls: [
      'Setting TTL to 0 expecting real-time DNS propagation. Most recursive resolvers enforce a minimum cache floor (30-300 seconds). Zero TTL increases authoritative server query volume significantly without guaranteeing cache-free resolution at clients. Use low but non-zero TTLs (30-60 seconds) for records requiring fast failover, and accept that propagation takes at least one resolver cache interval.',
      'Changing DNS records without accounting for resolver caches. When you update a record on the authoritative nameserver, existing resolvers continue serving the old record until their cache TTL expires. If the record had TTL 3600 and was cached 59 minutes ago, a resolver will serve the old record for another hour after your change. For planned migrations, reduce the TTL 24-48 hours before the change to allow resolver caches to drain.',
      'Forgetting negative cache TTL when creating new records. If a resolver previously queried a name that did not exist (NXDOMAIN), it cached that negative response for the SOA minimum TTL. Creating the record afterward does not immediately clear resolver caches — clients using those resolvers still receive NXDOMAIN until the negative cache entry expires. This is a common source of confusion during new service rollouts.',
      'Ignoring OS-level DNS cache. The operating system maintains its own DNS cache independent of the recursive resolver. On macOS, the mDNSResponder process caches DNS responses. On Windows, the DNS Client service maintains its cache. Application-level DNS caching (in JVM, Golang net package, Python dnspython) adds another layer. A record change may be live on the authoritative server and recursive resolver but still return the old value from OS or application cache.',
      'Using long TTLs for records that may need to change for security reasons. If an IP address or endpoint is compromised and needs to be removed or changed immediately, long TTL values mean the change propagates slowly. High-security records (mail servers, authentication endpoints) should use moderate TTLs to allow reasonable incident response speed without excessive query volume.',
    ],
    keyQuestions: [
      {
        question: 'You update a DNS A record on Route 53 but some users still see the old IP an hour later. Walk me through all the caching layers that could explain this.',
        answer: `## Complete Cache Hierarchy

When a DNS record is updated at the authoritative server, the change propagates through multiple independent caching layers, each with its own TTL counter.

## Layer 1: Route 53 propagation

Route 53 propagates changes to all its authoritative nameserver clusters globally. This typically takes 60 seconds or less. After this, any resolver that queries Route 53 directly receives the new record.

\`\`\`bash
# Verify the authoritative server has the new record
dig @ns-1234.awsdns-12.org example.com A
# If this returns the old IP, the Route 53 propagation is not complete yet
\`\`\`

## Layer 2: Recursive resolver cache

The recursive resolver (ISP resolver, 8.8.8.8, 1.1.1.1, or corporate DNS) cached the old record with its original TTL. If the record had TTL 3600 and was cached 30 minutes before your change, the resolver serves the old IP for another 30 minutes.

\`\`\`bash
# Check what a recursive resolver returns (note the TTL in the answer)
dig @8.8.8.8 example.com A
# ;; ANSWER SECTION:
# example.com.  1823  IN  A  1.2.3.4
# The "1823" is the remaining TTL in the resolver's cache
# This resolver has 1823 more seconds of cached old record

# Check 1.1.1.1 for comparison (different resolver = different cache state)
dig @1.1.1.1 example.com A
\`\`\`

## Layer 3: OS resolver cache

Even after the recursive resolver has the new record, the local OS cache may still hold the old value.

\`\`\`bash
# Check macOS DNS cache
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Check Windows DNS cache
ipconfig /displaydns | findstr example.com
ipconfig /flushdns

# Check Linux (if nscd is running)
nscd --invalidate=hosts

# Check what your OS resolver is returning
nslookup example.com  # uses OS resolver
dig example.com       # uses resolver in /etc/resolv.conf directly
\`\`\`

## Layer 4: Application-level cache

Java JVM, Python dnspython, Go net package, and many HTTP clients cache DNS results in-process.

\`\`\`bash
# JVM caches DNS results — default is 30 seconds for positive, 10 for negative
# Override in Java:
# -Dsun.net.inetaddr.ttl=0 (no caching — not recommended for production)

# Node.js does NOT cache DNS by default
# HTTP keep-alive connections bypass DNS entirely — the connection reuses
# an existing socket to the old IP even after DNS changes
\`\`\`

## Layer 5: Persistent HTTP connections

This is the most counterintuitive layer. If a client has an established HTTP keep-alive connection to the old IP, DNS changes have no effect on that connection. The client continues using the old IP until the connection closes.

## Diagnosis workflow

\`\`\`bash
# 1. Verify authoritative has new record
dig @ns-1234.awsdns-12.org example.com A

# 2. Check recursive resolver cache TTL remaining
dig @8.8.8.8 example.com A  # look at TTL in answer

# 3. Check from the affected client's machine
ssh affected-client "dig example.com A; nslookup example.com"

# 4. Check OS cache on affected client
ssh affected-client "cat /etc/resolv.conf"  # see which resolver is configured

# 5. Check for active TCP connections to old IP
ssh affected-client "ss -tnp | grep OLD_IP"
\`\`\`

## Prevention: pre-change TTL reduction

\`\`\`bash
# 48 hours before a planned DNS change, reduce TTL to 60 seconds
# This drains resolver caches and ensures fast propagation on change day
aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID \\
  --change-batch '{"Changes": [{"Action": "UPSERT", "ResourceRecordSet": {
    "Name": "example.com", "Type": "A", "TTL": 60,
    "ResourceRecords": [{"Value": "1.2.3.4"}]
  }}]}'
# Wait 48 hours (original TTL drain time) then make the actual change
\`\`\``,
      },
      {
        question: 'Explain the Kaminsky DNS cache poisoning attack and what mitigations are in place today.',
        answer: `## Background

Dan Kaminsky discovered in 2008 that DNS cache poisoning was much more practical than previously understood. Prior to this, the assumption was that an attacker would need to correctly guess both the transaction ID (16-bit, 65536 possibilities) and arrive before the legitimate response — a narrow window.

## The Classic Attack

\`\`\`
1. Attacker controls an authoritative server for attacker.com
2. Attacker sends thousands of queries to target resolver:
   GET random123.example.com (a name that does not exist)
3. Resolver must query example.com's authoritative server for random123
4. Attacker simultaneously floods the resolver with forged responses
   claiming to be the authoritative server for example.com
5. Each forged response has a guessed transaction ID (0-65535)
6. ONE of the 65536 responses matches the transaction ID
7. The forged response includes a malicious glue record:
   example.com NS attacker-ns.attacker.com
   attacker-ns.attacker.com A 1.2.3.4 (attacker's server)
8. Resolver caches the poisoned NS record
9. All subsequent queries for example.com go to attacker's server
10. Attacker returns any records they want for example.com
\`\`\`

The key insight Kaminsky found: by querying for random non-existent subdomains, the attacker forces the resolver to send thousands of queries, each creating a new poisoning opportunity. The birthday paradox means with enough concurrent attempts, collisions happen rapidly.

## Modern Mitigations

### 1. Source port randomization (RFC 5452)

\`\`\`bash
# UDP source port is now randomized (0-65535 range)
# An attacker must guess BOTH transaction ID (16-bit) AND source port (16-bit)
# = 2^32 = 4 billion combinations instead of 65536
# Makes the attack computationally infeasible within a response window

# Check if a resolver uses randomized source ports
dig +short @8.8.8.8 porttest.dns.measurement-factory.com TXT
# Returns how many unique source ports were seen from the resolver
\`\`\`

### 2. DNSSEC (cryptographic authentication)

\`\`\`bash
# DNSSEC signs all records with RSA/ECDSA signatures
# A forged response cannot produce a valid RRSIG without the private key
# Validating resolvers discard unsigned or incorrectly signed responses

# Check if a resolver validates DNSSEC
dig @8.8.8.8 sigfail.verteiltesysteme.net A
# Should return SERVFAIL if resolver validates DNSSEC (the zone is intentionally broken)
\`\`\`

### 3. 0x20 encoding

\`\`\`bash
# Mix uppercase and lowercase letters randomly in the query:
# "ExAmPlE.CoM" instead of "example.com"
# The authoritative server reflects the same case in the response
# An attacker cannot know the random case pattern to forge a matching response
# Not widely deployed but effective as a complementary control
\`\`\`

### 4. Response Rate Limiting (RRL)

Authoritative servers can limit the rate of identical responses, reducing amplification value of poisoning attacks.

### 5. DNS-over-HTTPS and DNS-over-TLS

\`\`\`bash
# DoH/DoT encrypt the entire DNS transaction, preventing MITM injection
# Resolvers: 1.1.1.1 (DoH), 8.8.8.8 (DoH), Cloudflare DoT (:853)

# Test DoH with curl
curl -H 'accept: application/dns-json' \\
  'https://cloudflare-dns.com/dns-query?name=example.com&type=A'
\`\`\`

## Remaining risks

- Resolvers without DNSSEC validation remain vulnerable to sophisticated attackers who can position themselves between the resolver and authoritative server (on-path attacks)
- Internal/corporate resolvers often skip source port randomization and DNSSEC validation, making them easier targets
- BGP hijacking can redirect legitimate authoritative server traffic to an attacker, bypassing all DNS-layer mitigations (requires RPKI to address at the routing layer)`,
      },
      {
        question: 'How does negative caching work, and how does it affect new service deployments?',
        answer: `## Negative Caching Overview

RFC 2308 defines how DNS resolvers cache NXDOMAIN (non-existent domain) and NODATA (name exists but no records of requested type) responses.

## SOA Record and Negative TTL

When a resolver queries for a name that does not exist, the authoritative server returns:

\`\`\`
;; AUTHORITY SECTION:
example.com.  3600  IN  SOA  ns1.example.com. admin.example.com. (
                    2024061901  ; serial
                    3600        ; refresh
                    900         ; retry
                    604800      ; expire
                    300         ; minimum TTL  <-- negative cache TTL
                )
\`\`\`

The resolver caches the NXDOMAIN for min(SOA TTL, SOA minimum field) = min(3600, 300) = 300 seconds.

\`\`\`bash
# See a negative cache entry in action:
dig @8.8.8.8 definitelynotareal.example.com A
# NXDOMAIN in status, SOA in authority section

# The remaining negative TTL is visible in the SOA TTL in the authority section
dig @8.8.8.8 definitelynotareal.example.com A
# If queried again 60 seconds later, SOA TTL will be ~240 seconds
\`\`\`

## Impact on New Service Deployments

### Scenario: deploying api.newservice.example.com

\`\`\`bash
# Before deployment, testers query the name and get NXDOMAIN
dig api.newservice.example.com
# Status: NXDOMAIN
# SOA minimum: 300 seconds -> cached negative for 5 minutes

# You deploy the service and create the DNS record
aws route53 change-resource-record-sets \\
  --hosted-zone-id ZONE_ID \\
  --change-batch '{"Changes": [{"Action": "CREATE", "ResourceRecordSet": {
    "Name": "api.newservice.example.com", "Type": "A",
    "TTL": 60, "ResourceRecords": [{"Value": "10.0.1.5"}]
  }}]}'

# Resolvers that cached NXDOMAIN still return NXDOMAIN for up to 300 seconds
# Even though the record now exists on the authoritative server
dig @8.8.8.8 api.newservice.example.com
# Still returns NXDOMAIN from cached negative entry
\`\`\`

### Mitigation strategies

\`\`\`bash
# 1. Reduce SOA minimum TTL before deployment to limit negative cache window
# Edit the SOA record's minimum TTL field at the zone level

# 2. Use a low SOA minimum for zones with frequent additions (e.g., 60 seconds)
# Tradeoff: negative queries hit authoritative server more often

# 3. Flush caches on internal resolvers before testing
# For BIND9:
rndc flushname api.newservice.example.com

# For Unbound:
unbound-control flush api.newservice.example.com

# For corporate resolvers, request cache flush from DNS admins

# 4. Test against the authoritative server directly during deployment
dig @ns-1234.awsdns-12.org api.newservice.example.com A
# Bypasses any cached negative entries in recursive resolvers
\`\`\`

## NODATA vs NXDOMAIN negative caching

\`\`\`bash
# NXDOMAIN: name does not exist at all
dig api.newservice.example.com A  # name doesn't exist -> NXDOMAIN

# NODATA: name exists but has no records of this type
dig api.newservice.example.com AAAA  # name exists (A record) but no AAAA -> NODATA
# NODATA responses are also negatively cached per SOA minimum TTL
# Adding an AAAA record to an existing name that got NODATA cached
# has the same propagation delay as NXDOMAIN resolution for new records
\`\`\``,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc2308',
      'https://www.rfc-editor.org/rfc/rfc5452',
      'https://www.rfc-editor.org/rfc/rfc8767',
      'https://www.kaminsky.com/kaminsky_7_10_08.pdf',
      'https://support.dnsimple.com/articles/what-is-dns-ttl/',
      'https://developers.cloudflare.com/dns/manage-dns-records/reference/ttl/',
    ],
    quickFire: [
      { q: 'Where is DNS cached on a typical client system?', a: 'Four layers: browser cache, OS stub resolver cache (/etc/nscd or systemd-resolved), recursive resolver cache (ISP or 8.8.8.8), and authoritative server (no cache -- source of truth).' },
      { q: 'What controls how long a DNS record is cached?', a: 'The TTL (Time to Live) value in the DNS response, set by the authoritative nameserver. Each layer caches for at most TTL seconds.' },
      { q: 'What is negative caching in DNS?', a: 'Caching of NXDOMAIN (non-existent domain) and NODATA responses. The negative TTL is taken from the SOA record\'s minimum field (RFC 2308). Prevents repeated failed lookups.' },
      { q: 'What is the Kaminsky DNS cache poisoning attack?', a: 'An attacker floods a resolver with forged responses guessing the 16-bit transaction ID, racing to poison the cache with a malicious IP before the real response arrives. DNSSEC mitigates it.' },
      { q: 'What is DNS source port randomization?', a: 'A post-Kaminsky mitigation where resolvers use random UDP source ports (not just random transaction IDs), increasing the entropy an attacker must guess from 2^16 to 2^32.' },
      { q: 'What TTL value does Kubernetes CoreDNS use for service records?', a: 'Default 5 seconds, making DNS-based service discovery update quickly when pod IPs change after restarts or scaling events.' },
      { q: 'What is stale-while-revalidate in DNS caching?', a: 'RFC 8767 extension allowing resolvers to serve expired (stale) records while asynchronously fetching fresh ones, trading slight staleness for zero latency on cache misses.' },
      { q: 'How do you flush the DNS cache on Linux?', a: 'systemd-resolved: systemd-resolve --flush-caches. nscd: nscd -i hosts. On macOS: dscacheutil -flushcache && killall -HUP mDNSResponder.' },
      { q: 'Why is a very low TTL (below 30s) problematic for public DNS?', a: 'Dramatically increases authoritative server query volume and resolver CPU load. It also bypasses caching benefits. Use 60s pre-cutover, then restore to 300s+ after migration.' },
    ],
  },
  // ─── TCP/IP FUNDAMENTALS (new) ─────────────────────────────────────────────
  {
    id: 'tcp-ip-stack',
    title: 'TCP/IP Stack & Handshake',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'TCP 3-way handshake, SYN/ACK/FIN/RST flags, TCP state machine, congestion control algorithms, and Nagle algorithm tradeoffs.',
    visualizations: [],
    introduction: `The TCP/IP stack is the foundational protocol suite that powers virtually all internet communication. Understanding it deeply is essential for any engineer working on distributed systems, backend services, or infrastructure.

TCP (Transmission Control Protocol) operates at Layer 4 of the OSI model and provides reliable, ordered, and error-checked delivery of data between applications. It achieves this through a combination of sequence numbers, acknowledgments, retransmissions, and flow control mechanisms.

The 3-way handshake is the mechanism by which a TCP connection is established. The client sends a SYN (synchronize) segment, the server responds with SYN-ACK (synchronize-acknowledge), and the client completes the handshake with an ACK (acknowledge). This exchange allows both sides to agree on initial sequence numbers and establish connection parameters. Tearing down a connection is a 4-way process: FIN, ACK, FIN, ACK — because each direction of data flow is closed independently.

TCP flags carry semantic meaning: SYN initiates connections, ACK acknowledges received data, FIN initiates graceful close, RST abruptly terminates a connection, PSH requests immediate delivery to the application layer, and URG marks urgent data.

Congestion control is one of TCP's most sophisticated features. Algorithms like CUBIC (default on Linux), BBR (Bottleneck Bandwidth and Round-trip propagation time), and Reno use different signals — packet loss, RTT variance, and explicit congestion notification (ECN) — to probe available bandwidth without overwhelming the network.

The Nagle algorithm reduces small-packet overhead by coalescing writes into fewer, larger segments. While this improves throughput on high-latency links, it introduces latency for interactive applications like SSH and database protocols, which often disable it with TCP_NODELAY.

In cloud and SRE contexts, understanding TCP's state machine, TIME_WAIT accumulation, SYN flood protection, and keep-alive settings is critical for diagnosing connection exhaustion, latency spikes, and cascading failures under load.`,
    whenToUse: [
      'Diagnosing connection establishment failures or latency spikes between microservices',
      'Tuning TCP socket options for high-throughput or low-latency services',
      'Investigating SYN floods, TIME_WAIT accumulation, or connection pool exhaustion',
      'Understanding why a service is slow to recover after a network partition',
      'Evaluating whether to use TCP keep-alives or application-level heartbeats',
    ],
    keyConcepts: [
      {
        term: '3-Way Handshake',
        definition: `The TCP connection establishment sequence: client sends SYN with its initial sequence number (ISN), server responds with SYN-ACK containing its own ISN and acknowledging the client's ISN+1, then the client sends ACK. After this, the connection enters ESTABLISHED state on both sides.`,
      },
      {
        term: 'TCP State Machine',
        definition: `TCP connections transition through a defined set of states: CLOSED, LISTEN, SYN_SENT, SYN_RECEIVED, ESTABLISHED, FIN_WAIT_1, FIN_WAIT_2, CLOSE_WAIT, CLOSING, LAST_ACK, TIME_WAIT. TIME_WAIT lasts 2*MSL (typically 60-120 seconds) to ensure delayed packets from the old connection do not corrupt a new one on the same 4-tuple.`,
      },
      {
        term: 'Congestion Control',
        definition: `TCP's mechanism to avoid overwhelming the network. It uses a congestion window (cwnd) that starts small and grows. Slow Start doubles cwnd each RTT until a threshold is reached, then Congestion Avoidance increases linearly. On loss, the window is reduced. Modern algorithms like BBR model the bottleneck bandwidth rather than relying solely on loss signals.`,
      },
      {
        term: 'Nagle Algorithm',
        definition: `An optimization that buffers small TCP writes and sends them as one segment when either the previous send is acknowledged or the buffer reaches MSS. Reduces chatty small-packet traffic but adds up to one RTT of latency per write. Disabled with the TCP_NODELAY socket option for latency-sensitive protocols.`,
      },
      {
        term: 'RST vs FIN',
        definition: `FIN initiates a graceful half-close: data already in flight is delivered before the connection closes. RST abruptly terminates the connection; any unread data is discarded. RST is sent when a packet arrives for a non-existent connection, when a process crashes without closing sockets, or when a firewall drops a connection mid-stream.`,
      },
      {
        term: 'TCP Keep-Alive',
        definition: `An optional mechanism where the kernel sends empty ACK probes after a period of inactivity to detect dead peers. Controlled by tcp_keepalive_time, tcp_keepalive_intvl, and tcp_keepalive_probes. Not enabled by default on sockets; must be set with SO_KEEPALIVE. Application-level heartbeats are often preferred for faster detection.`,
      },
    ],
    pitfalls: [
      'Ignoring TIME_WAIT accumulation: with high connection rates and short-lived connections, TIME_WAIT sockets can exhaust the local port range (ephemeral ports 32768-60999 on Linux). Enable SO_REUSEADDR and tune net.ipv4.tcp_tw_reuse rather than blindly setting tcp_tw_recycle, which is broken in NAT environments and removed in kernel 4.12.',
      'Assuming TCP keep-alive detects failures quickly: default tcp_keepalive_time is 7200 seconds (2 hours). A dead peer will not be detected for 2+ hours by default. Always set application-level heartbeats or tune keep-alive intervals for service mesh and database connections.',
      'Disabling Nagle globally: setting TCP_NODELAY for all connections can dramatically increase packet rate and CPU overhead on bulk transfer services. Only disable it for latency-sensitive interactive protocols, not for bulk data transfers.',
      'Conflating TCP retransmission with packet loss in the cloud: in virtualized environments, retransmissions can be triggered by CPU steal, hypervisor scheduling jitter, or NIC queue saturation — not actual network loss. Check /proc/net/snmp and ss -s before blaming the network.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through the TCP 3-way handshake and explain what information is exchanged at each step.',
        answer: `## TCP 3-Way Handshake

The handshake establishes a bidirectional connection by synchronizing sequence numbers and negotiating options.

## Step 1: SYN (Client to Server)
- Client picks a random Initial Sequence Number (ISN), e.g., ISN_c = 1000
- Sends: SYN, seq=1000
- Also advertises: MSS (max segment size), window scale, SACK permitted, timestamps

## Step 2: SYN-ACK (Server to Client)
- Server picks its own ISN, e.g., ISN_s = 5000
- Sends: SYN + ACK, seq=5000, ack=1001 (ISN_c + 1)
- Server also advertises its own TCP options

## Step 3: ACK (Client to Server)
- Client sends: ACK, seq=1001, ack=5001
- Connection is now ESTABLISHED on both sides

## What is negotiated
- MSS: maximum payload per segment (usually 1460 bytes for Ethernet MTU 1500 minus 40 bytes IP+TCP headers)
- Window scale: allows receive window > 65535 bytes (needed for high-BDP paths)
- SACK: selective acknowledgment, allows retransmitting only lost segments

## Observing with tcpdump

\`\`\`bash
# Capture the handshake to/from port 443
tcpdump -n -i eth0 'tcp port 443 and (tcp[tcpflags] & (tcp-syn|tcp-ack|tcp-fin|tcp-rst) != 0)'

# Show connection states
ss -tn state established
ss -tn state syn-sent
ss -tn state time-wait | wc -l
\`\`\`

## Security note
SYN cookies are used to defend against SYN flood attacks. When the SYN backlog is full, the server encodes connection state into the ISN rather than allocating a socket, deferring state allocation until the ACK is received.`,
      },
      {
        question: 'Explain TCP congestion control. How does BBR differ from CUBIC, and when would you choose one over the other?',
        answer: `## TCP Congestion Control Overview

Congestion control prevents any single TCP flow from overwhelming the network. The core mechanism is the congestion window (cwnd), which limits how much unacknowledged data can be in flight.

## Classic phases (Reno/CUBIC)
- Slow Start: cwnd doubles each RTT until ssthresh is reached
- Congestion Avoidance: cwnd increases by ~1 MSS per RTT (linear)
- On packet loss (triple duplicate ACK): ssthresh = cwnd/2, cwnd = ssthresh (fast recovery)
- On timeout (RTO): ssthresh = cwnd/2, cwnd = 1 MSS (slow start restarts)

## CUBIC (default on Linux since 2.6.19)
- Uses a cubic function of time since last congestion event to set cwnd
- Grows faster after a drop, plateaus near the previous max, probes slowly above it
- Loss-based: treats any packet loss as a congestion signal
- Works well on high-bandwidth, high-latency paths but backs off unnecessarily on noisy wireless links

## BBR (Bottleneck Bandwidth and Round-trip propagation time)
- Model-based: continuously estimates bottleneck bandwidth (BtlBw) and minimum RTT (RTprop)
- Sets cwnd = BtlBw * RTprop (the BDP — bandwidth delay product)
- Does NOT rely on loss as the primary signal; uses RTT inflation to detect queue buildup
- Probes for more bandwidth periodically, drains the queue regularly

## When to choose

Use BBR when:
- Long-fat networks (intercontinental links, satellite)
- High packet loss due to wireless, not congestion
- You control both endpoints (internal services, CDN)

Stick with CUBIC when:
- Mixed environment with CUBIC peers (fairness concerns)
- Short RTT datacenter links where the difference is negligible

\`\`\`bash
# Check current congestion control algorithm
sysctl net.ipv4.tcp_congestion_control

# Switch to BBR
sysctl -w net.ipv4.tcp_congestion_control=bbr

# Verify available algorithms
sysctl net.ipv4.tcp_available_congestion_control

# Watch congestion window in real time with ss
watch -n0.5 'ss -tin dst :443 | grep -E "cwnd|rtt"'
\`\`\``,
      },
      {
        question: 'What happens to TCP connections when a server crashes mid-connection, and how do you detect and handle this in production?',
        answer: `## Half-Open Connections After Server Crash

When a server crashes (kernel panic, OOM kill, power loss), it does not send FIN or RST. The client is left with a half-open connection: it believes the connection is ESTABLISHED, but the server has no state for it.

## Detection methods

1. Application-level heartbeat (fastest, most reliable)
   - Send a ping message every N seconds; expect pong within timeout
   - Used by Redis, PostgreSQL, gRPC, AMQP

2. TCP keep-alive (slower, OS-managed)
   - After tcp_keepalive_time of inactivity, kernel sends empty ACK probes
   - Default: 2 hours idle, 75s between probes, 9 probes before giving up
   - Override per socket:

\`\`\`python
import socket
sock = socket.socket()
sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 10)   # 10s idle before probing
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 5)   # 5s between probes
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 3)     # 3 probes before RST
\`\`\`

3. Read timeout at the application layer
   - Any blocking read with a timeout will surface the dead connection when the timer fires

## What the client sees
- If the server rebooted and the port is open: server sends RST, client gets ECONNRESET
- If the server is unreachable: no RST; client times out via keep-alive or app timeout
- If a firewall or NAT drops the connection silently: same as unreachable

## Production pattern
\`\`\`bash
# Check for established connections with no traffic (potential zombies)
ss -tn state established | awk 'NR>1 {print $4, $5}'

# Check TCP retransmit stats — a spike indicates stale connections being probed
cat /proc/net/snmp | grep Tcp
# Look for: TcpRetransSegs increasing
\`\`\`

## Best practice
Use connection pools with validation-on-borrow (test-on-acquire), short TCP keep-alive intervals (10s idle, 5s probe, 3 retries), and application-level heartbeats at the protocol layer. Never rely solely on OS defaults.`,
      },
    ],
    references: [
      'https://datatracker.ietf.org/doc/html/rfc793',
      'https://datatracker.ietf.org/doc/html/rfc5681',
      'https://cloud.google.com/blog/products/networking/tcp-bbr-congestion-control-comes-to-gcp-your-internet-just-got-faster',
      'https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html',
      'https://man7.org/linux/man-pages/man8/ss.8.html',
    ],
    quickFire: [
      { q: 'What are the four layers of the TCP/IP model?', a: 'Link (physical + data link), Internet (IP), Transport (TCP/UDP), Application (HTTP, DNS, TLS, etc.).' },
      { q: 'What is the TCP three-way handshake?', a: 'SYN (client initiates), SYN-ACK (server acknowledges and sends its own SYN), ACK (client acknowledges). Establishes sequence numbers for both sides.' },
      { q: 'What is TCP slow start?', a: 'TCP begins with a small congestion window (cwnd) and doubles it each RTT until reaching the slow-start threshold, then grows linearly. Prevents flooding a new connection.' },
      { q: 'What is TCP congestion control?', a: 'Algorithms (Reno, CUBIC, BBR) that adjust the send rate based on detected packet loss or delay to avoid overwhelming the network and causing congestion collapse.' },
      { q: 'What is the TIME_WAIT state and why does it exist?', a: 'After a connection closes, the initiating side waits 2*MSL (typically 60s) before reusing the port, ensuring stale packets from the old connection don\'t corrupt a new one.' },
      { q: 'What causes TCP connection reset (RST)?', a: 'A firewall or load balancer closing idle connections, the server process dying, a port not being listened on, or a security group rejecting mid-stream traffic.' },
      { q: 'What sysctl knob controls the TCP listen backlog?', a: 'net.core.somaxconn (system-wide max) and net.ipv4.tcp_max_syn_backlog (SYN queue). Under high load, increase these to avoid dropped connection attempts.' },
      { q: 'What is BBR congestion control and why is it faster?', a: 'BBR (Bottleneck Bandwidth and RTT) models the network pipe directly instead of reacting to loss. It maintains higher throughput on lossy or high-latency links.' },
      { q: 'What does ss -s show?', a: 'A summary of socket state counts (ESTABLISHED, TIME_WAIT, CLOSE_WAIT, etc.) -- a fast way to spot connection exhaustion or stuck sockets on a server.' },
    ],
  },
  {
    id: 'tcp-vs-udp',
    title: 'TCP vs UDP',
    icon: 'globe',
    color: '#3b82f6',
    questions: 5,
    description: 'Reliability vs speed tradeoffs, head-of-line blocking, QUIC protocol, and choosing the right transport for each use case.',
    visualizations: [],
    introduction: `TCP and UDP are the two dominant Layer 4 protocols in the TCP/IP stack, and choosing between them is one of the most fundamental decisions in protocol design. They represent fundamentally different philosophies: TCP provides a reliable, ordered byte stream with built-in congestion control, while UDP is a lightweight datagram protocol that provides no guarantees beyond best-effort delivery.

TCP's reliability comes at a cost. The 3-way handshake adds at minimum one round-trip before data can flow. Retransmissions of lost packets introduce latency spikes. Head-of-line (HOL) blocking means a single lost packet stalls all subsequent data in a stream until the retransmission arrives. For bulk transfers, file downloads, API calls, and any use case where data integrity is required and latency is secondary, TCP is the right choice.

UDP trades reliability for speed. There is no connection establishment, no retransmission, no ordering. Each datagram is independent. This makes UDP ideal for real-time applications where stale data is worse than missing data — live video, voice calls, online gaming, DNS queries, and NTP synchronization. A late video frame is useless; better to skip it and render the next one.

QUIC, standardized in RFC 9000, is a modern transport protocol built on UDP that reimplements many of TCP's reliability features while solving TCP's most significant problems. QUIC multiplexes multiple streams over a single UDP connection, so a lost packet only stalls the stream it belongs to, not all concurrent streams. QUIC integrates TLS 1.3 natively, achieving 1-RTT connection establishment (and 0-RTT for resumed connections). It also handles connection migration — if a mobile client switches from WiFi to LTE, the QUIC connection persists because connection identity is a connection ID, not the 4-tuple.

For SRE and cloud engineers, the decision matrix goes beyond TCP vs UDP. It involves understanding which applications benefit from QUIC's improved multiplexing (HTTP/3, MASQUE), which require UDP's raw datagram semantics (gaming, media), and which are best served by TCP's proven reliability and broad firewall support.`,
    whenToUse: [
      'Deciding the transport protocol for a new service or protocol design',
      'Diagnosing latency issues in streaming or real-time applications',
      'Evaluating whether to migrate HTTP/1.1 or HTTP/2 services to HTTP/3 over QUIC',
      'Understanding why VoIP or video conferencing uses UDP despite packet loss',
      'Explaining head-of-line blocking in interview contexts for distributed systems roles',
    ],
    keyConcepts: [
      {
        term: 'Head-of-Line Blocking',
        definition: `A phenomenon where a single lost or delayed packet blocks all subsequent packets in a stream from being delivered to the application, even if those later packets have already arrived. TCP suffers from HOL blocking because it delivers data in strict order. HTTP/2 multiplexes streams over one TCP connection, so a single lost TCP segment stalls all HTTP/2 streams. QUIC eliminates TCP-level HOL blocking by multiplexing over UDP.`,
      },
      {
        term: 'QUIC Protocol',
        definition: `A general-purpose transport protocol (RFC 9000) built over UDP, originally developed by Google. QUIC provides stream multiplexing without HOL blocking, integrated TLS 1.3 encryption, connection migration via connection IDs (survives IP/port changes), and 0-RTT connection resumption. It is the transport for HTTP/3. QUIC handles its own reliability, flow control, and congestion control in user space, enabling faster iteration than kernel TCP.`,
      },
      {
        term: '0-RTT Resumption',
        definition: `A QUIC (and TLS 1.3) feature that allows a client to send application data in the very first packet of a resumed connection, eliminating the round-trip required for connection establishment. The server provides a session ticket in a previous connection; the client uses it to reconstruct shared keys. Security caveat: 0-RTT data is vulnerable to replay attacks and should only be used for idempotent operations.`,
      },
      {
        term: 'Datagram vs Stream',
        definition: `UDP is message-oriented: each send() produces exactly one datagram with defined boundaries, received as one unit by the peer. TCP is stream-oriented: boundaries between writes are not preserved; the OS may coalesce or split writes. Application protocols over TCP must implement their own framing (e.g., length-prefixed messages, newline delimiters).`,
      },
      {
        term: 'UDP Receive Buffer Overflow',
        definition: `Unlike TCP, UDP has no flow control. If the receiving application cannot drain the socket buffer fast enough, incoming datagrams are silently dropped by the kernel. This is a common production issue with high-rate UDP metrics pipelines (StatsD, syslog) under load. Monitor with netstat -su or /proc/net/udp for RcvbufErrors.`,
      },
    ],
    pitfalls: [
      'Assuming UDP is always faster: UDP avoids handshake and retransmission overhead, but at the application layer you often implement your own reliability, which can be slower than TCP if done naively. The benefit is control over latency/reliability tradeoffs, not unconditional speed.',
      'Using TCP for DNS in performance-critical paths: DNS over TCP is used for large responses and zone transfers, but for typical query/response patterns, UDP with fallback to TCP is standard. Many resolvers have UDP receive buffers too small for EDNS0 extension responses, causing silent truncation and retries.',
      'Ignoring that QUIC is blocked by many enterprise firewalls: corporate firewalls and middleboxes often block UDP 443 entirely. HTTP/3 clients must fall back to HTTP/2 over TCP. Always implement the fallback path and monitor QUIC adoption rates in your client telemetry.',
      'Building reliable application protocols over UDP without understanding amplification risk: UDP source addresses are spoofable. Protocols that send large responses to small requests (like DNS, NTP, SSDP) are used in amplification DDoS attacks. Always rate-limit responses to new sources and validate source addresses where possible.',
    ],
    keyQuestions: [
      {
        question: 'Why does HTTP/2 still suffer from head-of-line blocking if it multiplexes streams?',
        answer: `## HTTP/2 and Head-of-Line Blocking

HTTP/2 solves application-layer HOL blocking (HTTP/1.1 pipelining issues) but introduces TCP-layer HOL blocking.

## HTTP/1.1 HOL blocking
In HTTP/1.1 pipelining, requests are serialized: the second request cannot be sent until the first response is complete (in practice, browsers open 6 parallel TCP connections to work around this).

## What HTTP/2 fixes
HTTP/2 multiplexes multiple request/response streams over a single TCP connection using binary framing. Stream 1 and Stream 2 can send frames interleaved. The server can send responses out of order by stream ID.

## What HTTP/2 does NOT fix
HTTP/2 runs over a single TCP connection. TCP delivers bytes in strict order. If a single TCP segment is lost:
- The kernel buffers all subsequent segments that have arrived
- None of those segments are delivered to the HTTP/2 parser
- ALL streams are stalled, not just the one whose data was lost
- The application sees latency spikes proportional to the retransmission timeout (RTO)

## QUIC's solution
QUIC multiplexes streams over UDP. Each QUIC stream has its own flow control. A lost UDP datagram only stalls the QUIC stream whose data it carried — other streams continue delivering data to the application unaffected.

\`\`\`bash
# Observe HTTP/2 streams in use
curl -v --http2 https://example.com 2>&1 | grep -E "Stream|frame"

# Check if a server supports HTTP/3
curl -v --http3 https://example.com

# Simulate packet loss to observe HOL blocking impact
tc qdisc add dev eth0 root netem loss 1%
curl -w "@curl-format.txt" -o /dev/null -s https://your-service/large-file
tc qdisc del dev eth0 root
\`\`\`

## Key insight for interviews
HTTP/2 moved HOL blocking from the application layer to the transport layer. QUIC moves transport-layer reliability to user space where it can be stream-scoped, eliminating HOL blocking entirely.`,
      },
      {
        question: 'When would you choose UDP over TCP for a production service, and what reliability mechanisms would you implement?',
        answer: `## When to Choose UDP

UDP is appropriate when:
- Data has a short useful lifetime (stale = useless): live video frames, game state, sensor readings
- Latency matters more than completeness: VoIP, real-time trading ticks
- You need multicast or broadcast (TCP is point-to-point only)
- Request/response fits in one datagram with low loss risk: DNS queries, NTP

## What you give up and must reimplement (selectively)

### 1. Sequence numbers and deduplication
Attach a monotonically increasing sequence number to each datagram. Receiver tracks last-seen sequence number and discards older ones (handles reordering) or duplicates.

### 2. Selective reliability (NACK-based)
Instead of ACK-every-packet, receiver sends NACKs for missing sequence numbers. Sender only retransmits on NACK. Much lower overhead than TCP's ACK-every-segment for high-rate streams.

### 3. Forward Error Correction (FEC)
Send redundant parity packets so receivers can reconstruct lost packets without a retransmission round-trip. Used in WebRTC video, QUIC's DATAGRAM extension.

### 4. Congestion control
UDP has none. Without it, your UDP flow will starve TCP flows sharing the same bottleneck link. Implement a rate limiter or use QUIC which has its own congestion control.

\`\`\`python
import socket, struct, time

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
seq = 0
while True:
    payload = struct.pack('!IQ', seq, int(time.time_ns())) + b'data'
    sock.sendto(payload, ('10.0.0.2', 9000))
    seq += 1
    time.sleep(0.016)  # 60Hz game tick
\`\`\`

\`\`\`bash
# Monitor UDP drop rate on a busy socket
netstat -su | grep -E "receive buffer errors|packets received"

# Increase UDP receive buffer
sysctl -w net.core.rmem_max=26214400
sysctl -w net.core.rmem_default=26214400
\`\`\`

## Production examples
- WebRTC: UDP with DTLS-SRTP for media, SCTP over DTLS for data channels
- QUIC: UDP with its own reliability, used for HTTP/3
- DNS: UDP with 512-byte limit (or EDNS0 for larger), fallback to TCP for truncated responses
- StatsD metrics: fire-and-forget UDP datagrams; drops are acceptable vs. adding latency to application code`,
      },
    ],
    references: [
      'https://datatracker.ietf.org/doc/html/rfc768',
      'https://datatracker.ietf.org/doc/html/rfc9000',
      'https://www.chromium.org/quic/',
      'https://hpbn.co/transport-layer-security-tls/',
      'https://www.rfc-editor.org/rfc/rfc9114',
    ],
    quickFire: [
      { q: 'What is the main difference between TCP and UDP?', a: 'TCP is connection-oriented, reliable, ordered, and congestion-controlled. UDP is connectionless, unreliable (no retransmit), and has minimal overhead -- about 8 bytes vs 20+ for TCP.' },
      { q: 'When should you use UDP instead of TCP?', a: 'When low latency matters more than reliability: video/audio streaming, online games, DNS queries, VoIP. Applications implement their own reliability if needed (e.g., QUIC over UDP).' },
      { q: 'What is UDP used for in DNS?', a: 'All standard DNS queries use UDP on port 53 (responses under 512 bytes). TCP is used for large responses (DNSSEC, zone transfers) and when UDP responses are truncated.' },
      { q: 'Why does TCP have a 3-way handshake but UDP does not?', a: 'TCP needs to negotiate sequence numbers and confirm both sides can send/receive before data flows. UDP has no connection state -- the first datagram is the first message.' },
      { q: 'What is head-of-line blocking in TCP and how does it affect HTTP/2?', a: 'TCP delivers bytes in order; a lost packet blocks all subsequent data until retransmitted. HTTP/2 multiplexes streams over one TCP connection, so one lost packet blocks all streams.' },
      { q: 'What protocol does QUIC use at the transport layer?', a: 'UDP. QUIC implements its own reliability, ordering, and congestion control on top of UDP, adding encryption (TLS 1.3) and multiplexing without TCP head-of-line blocking.' },
      { q: 'What is a UDP amplification attack?', a: 'An attacker sends small spoofed UDP requests to servers that return large responses (DNS, NTP, memcached), amplifying traffic toward the victim by 10-10000x.' },
      { q: 'What is the TCP TIME_WAIT equivalent in UDP?', a: 'There is none -- UDP has no connection state or teardown. The application layer must handle any needed cleanup or duplicate packet detection.' },
    ],
  },
  {
    id: 'http-https-tls',
    title: 'HTTP/HTTPS & TLS',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'HTTP/1.1 keep-alive and pipelining, request/response structure, TLS certificate chain validation, and HTTPS security model.',
    visualizations: [],
    introduction: `HTTP (Hypertext Transfer Protocol) is the application-layer protocol that underpins the web and the vast majority of API communication in modern distributed systems. Understanding it deeply — beyond just knowing that GET fetches and POST creates — is essential for building reliable, performant, and secure services.

HTTP/1.1, standardized in RFC 7230-7235, introduced persistent connections (keep-alive) as the default, allowing multiple requests to reuse a single TCP connection. This eliminated the per-request TCP handshake overhead of HTTP/1.0. Pipelining extended this by allowing a client to send multiple requests without waiting for responses, though it suffered from head-of-line blocking at the response level and was never reliably implemented in practice.

An HTTP request consists of a method, request target (URI), HTTP version, headers, an optional body, and terminates with CRLF. The response contains a status line (version + status code + reason phrase), headers, and an optional body. Status codes carry semantic meaning: 1xx informational, 2xx success, 3xx redirection, 4xx client error, 5xx server error. Knowing which codes to use and what they imply for caching, retries, and client behavior is critical for API design.

TLS (Transport Layer Security) adds encryption, authentication, and integrity to HTTP, creating HTTPS. The TLS handshake occurs after TCP connection establishment and before any HTTP data flows. It negotiates cipher suites, authenticates the server (and optionally the client) via X.509 certificates, and establishes shared symmetric keys using asymmetric cryptography.

Certificate chain validation is a critical security mechanism. The browser or client must verify that the server's certificate was signed by an intermediate CA, which was in turn signed by a trusted root CA in the client's trust store. Certificate Transparency logs, OCSP stapling, and HSTS (HTTP Strict Transport Security) are additional layers of the modern HTTPS security model.

For SREs and backend engineers, understanding connection reuse, TLS session resumption, certificate rotation without downtime, cipher suite selection, and debugging TLS errors (certificate mismatch, chain validation failures, expired certificates) are daily operational concerns.`,
    whenToUse: [
      'Debugging connection latency and determining how many TLS handshakes are occurring per unit time',
      'Configuring nginx or HAProxy TLS termination with appropriate cipher suites and certificate chains',
      'Rotating TLS certificates without dropping active connections',
      'Implementing mTLS (mutual TLS) for service-to-service authentication in a microservices environment',
      'Diagnosing HTTPS errors in curl or browser: certificate mismatch, chain incomplete, HSTS violations',
      'Understanding why a CDN or load balancer shows a different certificate than the origin',
    ],
    keyConcepts: [
      {
        term: 'HTTP Keep-Alive',
        definition: `HTTP/1.1 persistent connections allow multiple request/response cycles over a single TCP connection. The Connection: keep-alive header (implicit in HTTP/1.1) requests this behavior. The server may close the connection after a configurable idle timeout or max request count. Without keep-alive, each HTTP request requires a new TCP handshake (and TLS handshake for HTTPS), adding 1-3 RTTs of latency.`,
      },
      {
        term: 'TLS Handshake',
        definition: `The TLS 1.3 handshake completes in 1 RTT. The client sends ClientHello with supported cipher suites and key shares. The server responds with ServerHello (selecting cipher and key share), its certificate, CertificateVerify (signature proving it holds the private key), and Finished. The client verifies the certificate chain and sends its own Finished. Application data can then flow. TLS 1.2 required 2 RTTs.`,
      },
      {
        term: 'Certificate Chain Validation',
        definition: `A client validates a server certificate by building a chain from the leaf certificate to a trusted root CA. Each certificate in the chain must be signed by the next, the leaf must match the server hostname (CN or SAN), each certificate must be within its validity period, and none must appear on a CRL or OCSP revocation list. Servers must send the full chain (leaf + intermediates) since clients cannot reliably fetch intermediates themselves.`,
      },
      {
        term: 'HSTS (HTTP Strict Transport Security)',
        definition: `A response header (Strict-Transport-Security: max-age=31536000; includeSubDomains) that instructs browsers to only connect to the domain over HTTPS for the specified duration. After the first visit, the browser refuses HTTP connections without a roundtrip. HSTS preload lists (submitted to browsers) eliminate the trust-on-first-use vulnerability entirely.`,
      },
      {
        term: 'OCSP Stapling',
        definition: `Online Certificate Status Protocol (OCSP) allows clients to check if a certificate has been revoked. Without stapling, the client must make a separate HTTP request to the CA's OCSP responder for every TLS connection, adding latency and privacy concerns. With OCSP stapling, the server fetches and caches the OCSP response and includes (staples) it in the TLS handshake, eliminating the client round-trip.`,
      },
      {
        term: 'mTLS (Mutual TLS)',
        definition: `Standard TLS authenticates only the server. In mTLS, both parties present X.509 certificates. The client sends its certificate during the handshake; the server validates it against a trusted CA. mTLS provides strong service-to-service authentication and is commonly used in service meshes (Istio, Linkerd), zero-trust architectures, and API gateways to replace bearer tokens for inter-service calls.`,
      },
    ],
    pitfalls: [
      'Sending an incomplete certificate chain: if the server sends only the leaf certificate and not the intermediate CA certificate, clients that have not previously cached the intermediate will fail validation with "unable to verify the first certificate". Always configure servers to send the full chain including intermediates.',
      'Neglecting TLS session resumption at scale: each new TLS 1.2 handshake is computationally expensive. Session tickets and session IDs allow resumption in 1 RTT. In clustered environments, session tickets must use a shared key across all nodes, or clients connecting to different nodes will perform full handshakes every time.',
      'Using wildcard certificates for internal services without understanding their blast radius: a wildcard for *.example.com covers all subdomains. If any service using that certificate is compromised, the certificate must be revoked and replaced across every service using it. Short-lived certificates per service with automated rotation (via ACME/cert-manager) is more operationally sound.',
      'Ignoring cipher suite order and negotiation: the server cipher suite preference list matters. Weak ciphers left at the top will be selected by clients that support them. Always prioritize AEAD ciphers (AES-GCM, ChaCha20-Poly1305), ECDHE for forward secrecy, and disable RC4, 3DES, and export ciphers. Use Mozilla SSL Configuration Generator for tested recommendations.',
    ],
    keyQuestions: [
      {
        question: 'Describe the full sequence of events from when a user types https://example.com in their browser to when the first byte of HTML is received.',
        answer: `## Full HTTPS Request Lifecycle

## 1. DNS Resolution
- Browser checks local cache, then OS cache, then stub resolver
- Stub resolver queries recursive resolver (ISP or 8.8.8.8)
- Recursive resolver walks the DNS tree: root → .com TLD → example.com authoritative
- Returns A/AAAA record with TTL

\`\`\`bash
# Trace DNS resolution
dig +trace example.com
# Measure DNS time
curl -w "DNS: %{time_namelookup}s\n" -o /dev/null -s https://example.com
\`\`\`

## 2. TCP Connection
- Browser opens socket to the resolved IP on port 443
- 3-way handshake: SYN → SYN-ACK → ACK
- Cost: 1 RTT

## 3. TLS 1.3 Handshake
- Client sends ClientHello: TLS version, cipher suites, key shares (X25519)
- Server sends ServerHello + Certificate + CertificateVerify + Finished
- Client validates certificate chain against trusted root store
- Client verifies server's signature proving private key ownership
- Both sides derive session keys from the shared DH secret
- Cost: 1 RTT (TLS 1.3), 2 RTT (TLS 1.2)

## 4. HTTP Request
- Client sends: GET / HTTP/1.1 followed by Host and other headers

## 5. Server Response
- Server processes request and returns HTTP/1.1 200 OK with headers and body

## Total minimum latency (single datacenter region)
- DNS: 1 RTT (if uncached)
- TCP: 1 RTT
- TLS 1.3: 1 RTT
- HTTP: 1 RTT
- Total: 4 RTTs before first byte

## Optimizations that reduce this
- DNS prefetch: browser resolves DNS for known links before they are clicked
- TLS 0-RTT resumption: skip TLS RTT on resumed sessions
- HTTP/2 or HTTP/3: multiplex resources over one connection
- CDN: reduce geographic RTT by serving from edge nodes

\`\`\`bash
# Full timing breakdown
curl -w "DNS: %{time_namelookup}s | TCP: %{time_connect}s | TLS: %{time_appconnect}s | TTFB: %{time_starttransfer}s | Total: %{time_total}s\n" -o /dev/null -s https://example.com
\`\`\``,
      },
      {
        question: 'How does TLS certificate chain validation work, and what are the failure modes you see in production?',
        answer: `## TLS Certificate Chain Validation

## Chain structure
Leaf certificate (server) → Intermediate CA → Root CA

The client must build a valid chain from the leaf to a root CA in its trust store.

## Validation steps
1. Hostname verification: leaf cert's SAN must match the server hostname
2. Validity period: NotBefore <= now <= NotAfter for each cert in the chain
3. Signature verification: each cert must be signed by the key in the next cert
4. Key usage: leaf cert must have TLS Server Authentication in Extended Key Usage
5. Revocation check: OCSP or CRL (often skipped in practice due to performance)
6. Chain completeness: server must send leaf + all intermediates

## Common production failure modes

### 1. Incomplete chain (most common)
- Server sends only leaf cert, not intermediate
- Fix: configure server to send full chain bundle

\`\`\`bash
# Check what chain the server is sending
openssl s_client -connect example.com:443 -showcerts 2>/dev/null | grep -E "subject|issuer"

# Verify chain with openssl
openssl verify -CAfile ca-bundle.crt server.crt
\`\`\`

### 2. Expired certificate
\`\`\`bash
# Check cert expiry
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates
\`\`\`

### 3. Hostname mismatch
- Cert was issued for www.example.com but request is to api.example.com
- Check SANs: openssl x509 -noout -ext subjectAltName -in cert.pem

### 4. Untrusted CA in container or service mesh
\`\`\`bash
# Trust a custom CA in curl
curl --cacert /path/to/custom-ca.crt https://internal-service

# Add CA to system trust store (Debian/Ubuntu)
cp custom-ca.crt /usr/local/share/ca-certificates/
update-ca-certificates
\`\`\`

### 5. Self-signed cert in production
- Never appropriate for production; triggers hard failures in all HTTP clients
- Fix: use Let's Encrypt (ACME) or an internal CA with cert-manager

## Certificate rotation without downtime
1. Generate new cert/key pair
2. Load new cert into server alongside old cert (SNI-based selection or dual binding)
3. Wait for old cert's sessions to drain (max TLS session lifetime, typically 24h)
4. Remove old cert`,
      },
      {
        question: 'What is HSTS and how does it protect against downgrade attacks?',
        answer: `## HSTS: HTTP Strict Transport Security

## The attack HSTS prevents: SSL stripping
Without HSTS, an on-path attacker (on a public WiFi network) can intercept an HTTP request to example.com and respond before the server does, serving a fake HTTP version of the site. The victim never negotiates HTTPS; the attacker proxies HTTPS to the real server and HTTP to the victim.

## How HSTS works
When a browser connects to a site over HTTPS and receives:

Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

It records this policy. For the next 31536000 seconds (1 year):
- Any HTTP request to example.com is internally rewritten to HTTPS before leaving the browser
- No HTTP request is ever sent; the browser refuses HTTP connections to that host
- If the HTTPS connection fails (invalid cert), the browser shows an error and does NOT fall back to HTTP

## includeSubDomains
Extends the policy to all subdomains. Any subdomain must also serve valid HTTPS.

## preload
Submits the domain to the browser preload list (hstspreload.org). The domain is hardcoded into Chrome, Firefox, Safari, and Edge source code, eliminating the trust-on-first-use vulnerability entirely.

## Trust-on-first-use vulnerability
HSTS from the response header only protects after the first successful HTTPS visit. Preloading eliminates this window entirely.

\`\`\`bash
# Check if a domain has HSTS header
curl -sI https://example.com | grep -i strict-transport

# Check preload status
curl https://hstspreload.org/api/v2/status?domain=example.com

# Nginx HSTS configuration
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
\`\`\`

## Removal caveat
Once submitted to the preload list, removal takes months and requires browsers to ship an update. Only preload if you are committed to HTTPS-only permanently.`,
      },
    ],
    references: [
      'https://datatracker.ietf.org/doc/html/rfc7230',
      'https://datatracker.ietf.org/doc/html/rfc8446',
      'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
      'https://ssl-config.mozilla.org/',
      'https://www.ssllabs.com/ssltest/',
      'https://hstspreload.org/',
    ],
    quickFire: [
      { q: 'What is the default port for HTTP and HTTPS?', a: 'HTTP uses port 80, HTTPS uses port 443.' },
      { q: 'What does HTTPS add over HTTP?', a: 'TLS encryption for confidentiality, server authentication via certificates, and data integrity -- prevents eavesdropping and man-in-the-middle attacks.' },
      { q: 'What is HSTS and what does it do?', a: 'HTTP Strict Transport Security -- a response header (Strict-Transport-Security: max-age=31536000) that instructs browsers to only connect via HTTPS for the specified duration, preventing SSL stripping.' },
      { q: 'What is an HTTP 301 vs 302 redirect?', a: '301 is a permanent redirect (browsers and CDNs cache it). 302 is temporary (not cached). Use 301 for domain migrations; 302 for A/B testing or temporary changes.' },
      { q: 'What is the difference between HTTP GET and POST?', a: 'GET retrieves data; parameters in URL; idempotent and cacheable. POST submits data in the request body; not idempotent; not cached by default.' },
      { q: 'What HTTP status code means "too many requests"?', a: '429 Too Many Requests -- used for rate limiting. The Retry-After header optionally tells the client when to retry.' },
      { q: 'What is mixed content and why does it matter?', a: 'An HTTPS page loading HTTP sub-resources. Browsers block active mixed content (scripts, iframes) and warn on passive (images). All resources must be served over HTTPS.' },
      { q: 'What is HTTP keep-alive?', a: 'Persistent TCP connections that handle multiple HTTP requests without closing/reopening the socket. Enabled by default in HTTP/1.1 via Connection: keep-alive, reducing handshake overhead.' },
      { q: 'What does the X-Forwarded-For header contain?', a: 'The original client IP address when a request passes through a proxy or load balancer. The leftmost IP is the original client; subsequent IPs are added by each proxy.' },
    ],
  },
  {
    id: 'http2-http3',
    title: 'HTTP/2 & HTTP/3',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'Multiplexing streams, HPACK/QPACK header compression, server push, QUIC UDP transport, and 0-RTT connection resumption.',
    visualizations: [],
    introduction: `HTTP/2 and HTTP/3 are major protocol revisions designed to address the performance limitations of HTTP/1.1. Understanding them is critical for engineers working on high-performance web services, CDNs, API gateways, and load balancers.

HTTP/2, standardized in RFC 7540, introduced binary framing as a replacement for HTTP/1.1's text-based format. Requests and responses are split into frames, which are multiplexed over a single TCP connection using stream IDs. This eliminates the need for multiple TCP connections to parallelize requests (HTTP/1.1 required 6 parallel connections per origin in browsers). HTTP/2 also introduced HPACK header compression, which significantly reduces header overhead for APIs that send the same headers repeatedly, and server push, which allows the server to proactively send resources the client will need before it asks.

However, HTTP/2 still runs over TCP, which means it inherits TCP's head-of-line blocking at the transport layer. A single lost packet stalls all multiplexed streams until the retransmission arrives. On lossy networks, HTTP/2 can perform worse than HTTP/1.1 with 6 parallel connections because HTTP/1.1's parallel connections are independent TCP streams that do not block each other.

HTTP/3, standardized in RFC 9114, solves this by running over QUIC instead of TCP. QUIC is a UDP-based transport that implements reliable delivery per-stream — a lost packet only stalls the stream it belongs to, not all streams. QUIC also integrates TLS 1.3 natively, reducing connection establishment to 1 RTT (or 0 RTT for resumed connections). Connection migration allows QUIC connections to survive IP address changes (e.g., switching from WiFi to LTE on mobile), which is impossible with TCP-based protocols.

For production systems, HTTP/3 support requires that UDP port 443 is not firewalled, and servers must advertise HTTP/3 availability via the Alt-Svc response header. Clients that cannot use QUIC fall back to HTTP/2 transparently. Major CDNs (Cloudflare, Fastly, Google Cloud) and servers (nginx, Caddy, Envoy) support HTTP/3, making it increasingly relevant for SRE and infrastructure teams.`,
    whenToUse: [
      'Evaluating whether to enable HTTP/3 on an nginx or Caddy load balancer',
      'Debugging why HTTP/2 performance degrades on lossy mobile networks',
      'Configuring a CDN or API gateway for maximum throughput to global clients',
      'Explaining to an interviewer why HTTP/2 multiplexing did not fully solve the HOL blocking problem',
      'Implementing gRPC services (which use HTTP/2 framing) and understanding its transport constraints',
      'Analyzing pcap or tcpdump traces to identify HTTP/2 stream multiplexing behavior',
    ],
    keyConcepts: [
      {
        term: 'HTTP/2 Streams and Frames',
        definition: `In HTTP/2, a stream is a bidirectional sequence of frames on a single TCP connection. Each stream has a unique integer ID (odd IDs for client-initiated, even for server-initiated). Frames are the unit of communication: HEADERS, DATA, PRIORITY, RST_STREAM, SETTINGS, PUSH_PROMISE, PING, GOAWAY, WINDOW_UPDATE, CONTINUATION. Multiple streams are multiplexed over one connection, with per-stream flow control via WINDOW_UPDATE frames.`,
      },
      {
        term: 'HPACK Header Compression',
        definition: `HTTP/2's header compression format (RFC 7541). Maintains a dynamic table on both client and server of recently seen headers. Headers can be sent as indices into a static table (common headers like :method, :path, :status pre-defined), dynamic table references, or literal values with or without table insertion. Eliminates the repetitive overhead of large Cookie and Authorization headers sent on every request.`,
      },
      {
        term: 'QPACK',
        definition: `HTTP/3's header compression format (RFC 9204), designed to work with QUIC's out-of-order stream delivery. HPACK cannot be used with QUIC because HPACK assumes in-order delivery: referencing a dynamic table entry that was inserted in a not-yet-received earlier request would cause a decoding error. QPACK separates the encoder/decoder streams from the request streams and uses a required-insert-count mechanism to handle out-of-order delivery safely.`,
      },
      {
        term: 'Server Push',
        definition: `An HTTP/2 feature allowing servers to send resources to clients before they are requested. The server sends a PUSH_PROMISE frame containing the request headers for the resource it will push, then sends the resource in a new server-initiated stream. In practice, server push proved difficult to use correctly and has been removed from Chrome in 2022. HTTP/3 does not support server push.`,
      },
      {
        term: '0-RTT Connection Resumption',
        definition: `A QUIC/TLS 1.3 feature enabling a client to send application data in the first packet of a resumed connection, bypassing the handshake round-trip. The server provides a session ticket containing resumption keys at the end of the previous connection. On reconnect, the client includes early data in its first message. Restriction: 0-RTT data is not forward-secret and is replay-vulnerable; it should only carry idempotent read requests.`,
      },
      {
        term: 'Connection Migration',
        definition: `A QUIC feature that decouples connection identity from the network 4-tuple (src IP, src port, dst IP, dst port). QUIC connections are identified by connection IDs exchanged during the handshake. If a client's IP or port changes (mobile switching from WiFi to LTE, NAT rebinding), it can send a path challenge on the new path. The server validates it and continues the connection without renegotiation. TCP connections are always bound to the 4-tuple and are disrupted by any address change.`,
      },
    ],
    pitfalls: [
      'Enabling HTTP/2 server push without cache-digest support: push is effective only for resources the client does not already have cached. Without a mechanism for the client to advertise its cache state, the server either never pushes (conservative) or always pushes (wastes bandwidth). Most implementations default to not pushing, making the feature largely unused.',
      'Assuming HTTP/3 works everywhere: many enterprise firewalls, corporate proxies, and cloud provider security groups block UDP port 443. HTTP/3 must always have an HTTP/2 fallback path. Monitor your Alt-Svc success rate in client telemetry to measure actual HTTP/3 adoption vs. fallback.',
      'Running HTTP/2 over plaintext in production without understanding the risk: HTTP/2 technically supports plaintext (h2c), but browsers only support HTTP/2 over TLS. Server-to-server gRPC commonly uses h2c on internal networks. This means gRPC traffic between services is unencrypted — use mTLS or a service mesh for internal service authentication and encryption.',
      'Ignoring HTTP/2 stream priority deprecation: HTTP/2 had a complex stream prioritization scheme (PRIORITY frames, dependency trees) that most servers ignored or implemented incorrectly. HTTP/3 (RFC 9218) replaces it with Extensible Priorities, a simpler urgency + incremental model. Do not build systems that rely on HTTP/2 priority signaling being honored.',
    ],
    keyQuestions: [
      {
        question: 'How does HTTP/2 multiplexing work, and why does it not fully eliminate head-of-line blocking?',
        answer: `## HTTP/2 Multiplexing

## Binary framing layer
HTTP/2 replaces HTTP/1.1's text-based messages with a binary framing layer. Each message is split into frames:
- HEADERS frame: request/response headers (compressed with HPACK)
- DATA frames: request/response body chunks

Frames from different streams are interleaved on the wire, each carrying a stream_id field.

## How it eliminates application-layer HOL blocking
In HTTP/1.1 without pipelining:
- Request 2 cannot be sent until Response 1 is fully received
- Browsers work around this by opening 6 TCP connections per origin

In HTTP/1.1 with pipelining:
- Requests can be sent sequentially without waiting for responses
- BUT responses must be returned in request order
- A slow response for request 1 blocks responses 2, 3, 4...

In HTTP/2:
- Client sends HEADERS frames for streams 1, 3, 5 all at once
- Server can return responses in any order using stream IDs
- Stream 3's response arrives before stream 1's without blocking stream 5

## Why TCP-layer HOL blocking remains
All HTTP/2 streams share one TCP connection. TCP delivers bytes in strict order to the HTTP/2 parser. If a TCP segment is lost:

1. Kernel receives segments for other streams (later sequence numbers)
2. Kernel buffers them — cannot deliver out-of-order to the application
3. HTTP/2 parser receives nothing for any stream
4. Server must wait for TCP retransmission before parsing any frame
5. Under 1% packet loss, HTTP/2 can be slower than 6 parallel HTTP/1.1 connections

## QUIC solves this
- QUIC stream 1: packet lost → only stream 1 stalls
- QUIC stream 3: arrives normally → delivered immediately
- QUIC stream 5: arrives normally → delivered immediately

\`\`\`bash
# Check if nginx is serving HTTP/2
curl -I --http2 https://example.com 2>/dev/null | head -5

# Test HTTP/3 support
curl -I --http3 https://example.com 2>/dev/null | head -5

# Check Alt-Svc header that advertises HTTP/3 availability
curl -sI https://www.google.com | grep alt-svc
\`\`\``,
      },
      {
        question: 'What is QUIC and how does HTTP/3 use it? What are the tradeoffs vs HTTP/2?',
        answer: `## QUIC Protocol Overview

QUIC (RFC 9000) is a general-purpose transport protocol built over UDP. Originally developed at Google, it addresses TCP's limitations while retaining reliability.

## What QUIC provides over raw UDP
- Reliable, ordered delivery per stream (not globally)
- Flow control per stream and per connection
- Integrated TLS 1.3 (encryption is mandatory, not optional)
- Multiplexing without HOL blocking
- Connection migration via connection IDs
- Improved loss recovery

## HTTP/3 over QUIC
HTTP/3 (RFC 9114) maps HTTP semantics to QUIC streams:
- Each HTTP request/response pair uses a dedicated QUIC stream
- A lost QUIC packet only stalls the stream it belongs to
- QPACK replaces HPACK for header compression
- Connection establishment: 1 RTT (0 RTT for resumption) vs TCP+TLS 1.3's 2 RTTs

## Connection establishment comparison

| | HTTP/1.1 HTTPS | HTTP/2 HTTPS | HTTP/3 |
|---|---|---|---|
| TCP handshake | 1 RTT | 1 RTT | 0 (UDP) |
| TLS handshake | 1 RTT (1.3) | 1 RTT (1.3) | Integrated |
| Total (new) | 2 RTT | 2 RTT | 1 RTT |
| Total (resumed) | 1-2 RTT | 1-2 RTT | 0 RTT possible |

## Tradeoffs: HTTP/3 vs HTTP/2

Advantages of HTTP/3:
- No TCP HOL blocking
- Faster connection establishment
- Connection migration (mobile resilience)
- Better performance on lossy networks

Disadvantages of HTTP/3:
- UDP blocked by many firewalls and middleboxes
- Higher CPU per connection (QUIC in userspace vs kernel TCP)
- Harder to debug (no standard tcpdump-level visibility without QUIC-aware tools)
- Less mature server implementations

\`\`\`bash
# Test HTTP/3 with curl (built with quic support)
curl --http3 -v https://cloudflare.com 2>&1 | grep -E "Using HTTP|Connected"

# Check Alt-Svc header that advertises HTTP/3 availability
curl -sI https://www.google.com | grep alt-svc
\`\`\`

## When to use HTTP/3
- CDN edge to client traffic: high benefit (lossy last-mile, mobile)
- Internal datacenter service-to-server: low benefit (low latency, low loss, firewalls may block UDP)
- gRPC: currently HTTP/2 only; HTTP/3 gRPC is in development`,
      },
    ],
    references: [
      'https://datatracker.ietf.org/doc/html/rfc7540',
      'https://datatracker.ietf.org/doc/html/rfc9000',
      'https://datatracker.ietf.org/doc/html/rfc9114',
      'https://hpbn.co/http2/',
      'https://blog.cloudflare.com/http3-the-past-present-and-future/',
      'https://quicwg.org/',
    ],
    quickFire: [
      { q: 'What is the key performance improvement of HTTP/2 over HTTP/1.1?', a: 'Multiplexing -- multiple requests and responses are interleaved over a single TCP connection, eliminating HTTP/1.1 head-of-line blocking per connection.' },
      { q: 'What is server push in HTTP/2?', a: 'The server proactively sends resources the client will need before it requests them. Largely superseded by preload link headers in practice.' },
      { q: 'What is HPACK?', a: 'HTTP/2 header compression. It maintains a dynamic table of recently seen headers, sending index references instead of full strings -- cuts overhead for large repeated headers like Cookie.' },
      { q: 'What transport protocol does HTTP/3 use?', a: 'QUIC over UDP. HTTP/3 moves reliability and multiplexing from TCP to QUIC, eliminating TCP head-of-line blocking.' },
      { q: 'What is QUIC and what problem does it solve?', a: 'A transport protocol over UDP with built-in TLS 1.3, multiplexed streams, and 0-RTT resumption. Solves TCP head-of-line blocking and reduces connection setup round trips.' },
      { q: 'What is head-of-line blocking in HTTP/2?', a: 'A lost TCP packet blocks all HTTP/2 streams until retransmitted. HTTP/3 over QUIC eliminates this because each QUIC stream is independently reliable.' },
      { q: 'What does QPACK do in HTTP/3?', a: 'Header compression designed for QUIC\'s out-of-order stream delivery. Unlike HPACK, it handles stream interleaving without blocking on dynamic table updates.' },
      { q: 'How many TCP connections does HTTP/1.1 open per domain in a browser?', a: '6-8 parallel connections per origin to work around the one-request-at-a-time limit. HTTP/2 needs only one connection.' },
      { q: 'What is 0-RTT in QUIC?', a: 'Session resumption where the client sends application data in the first packet using cached credentials -- zero additional round trips for repeat connections. Replay-vulnerable for non-idempotent requests.' },
    ],
  },
  {
    id: 'websockets',
    title: 'WebSockets & Real-Time Protocols',
    icon: 'globe',
    color: '#3b82f6',
    questions: 5,
    description: 'WebSocket upgrade handshake, full-duplex frames, ping/pong heartbeat, and comparison with SSE and long-polling.',
    visualizations: [],
    introduction: `Real-time communication between clients and servers is a fundamental requirement for chat applications, live dashboards, collaborative editing, trading platforms, and online games. HTTP was designed as a request/response protocol — the client always initiates. WebSockets, Server-Sent Events (SSE), and long-polling are three approaches that work around or extend HTTP to enable server-initiated data delivery.

WebSockets (RFC 6455) provide a full-duplex, persistent, bidirectional communication channel over a single TCP connection. The protocol begins with an HTTP upgrade handshake: the client sends an HTTP/1.1 Upgrade request with specific WebSocket headers (Upgrade: websocket, Connection: Upgrade, Sec-WebSocket-Key), and the server responds with 101 Switching Protocols. After the upgrade, the connection is no longer HTTP — data flows as WebSocket frames, which have a compact binary header (2-10 bytes) followed by payload. Either side can send frames at any time, and either side can initiate close.

Server-Sent Events (SSE) is a simpler alternative for one-way server-to-client streaming. The server sends text/event-stream content over a persistent HTTP connection. SSE has built-in reconnection (the browser automatically reconnects with Last-Event-ID), works over HTTP/2 (where WebSockets do not), and is trivially proxied by any HTTP infrastructure. Its limitation is that it is unidirectional — clients can only receive, not send over the SSE stream.

Long-polling is the oldest technique and works on any HTTP infrastructure. The client sends a request; the server holds it open until data is available (or a timeout), then responds. The client immediately re-sends. Long-polling has high overhead (HTTP headers on every message) and is largely replaced by WebSockets and SSE for new development.

For production systems, WebSocket scaling requires sticky sessions or a shared pub/sub backend (Redis, Kafka) since WebSocket connections are stateful. Understanding ping/pong heartbeats, frame types, masking (required for client-to-server frames by the RFC), and graceful closure is essential for building reliable real-time infrastructure.`,
    whenToUse: [
      'Building a chat application, collaborative editor, or live dashboard requiring bidirectional real-time communication',
      'Choosing between WebSockets and SSE for a server-push notification system',
      'Debugging disconnecting WebSocket connections behind a load balancer or proxy',
      'Designing WebSocket scalability with sticky sessions or a pub/sub fan-out backend',
      'Implementing heartbeat probes to detect and recover from dead WebSocket connections',
    ],
    keyConcepts: [
      {
        term: 'WebSocket Upgrade Handshake',
        definition: `WebSocket connections start as HTTP/1.1 requests with Upgrade: websocket and Connection: Upgrade headers. The client sends a random 16-byte base64-encoded nonce in Sec-WebSocket-Key. The server concatenates the key with a magic GUID, SHA-1 hashes the result, base64-encodes it, and returns it in Sec-WebSocket-Accept. This proves the server genuinely understands the WebSocket protocol. After the 101 response, the TCP connection switches protocols.`,
      },
      {
        term: 'WebSocket Frames',
        definition: `WebSocket data is carried in frames. Each frame has a 2-byte minimum header: FIN bit (last frame of a message), opcode (0=continuation, 1=text, 2=binary, 8=close, 9=ping, 10=pong), MASK bit, and payload length. Client-to-server frames must be masked with a 4-byte masking key XOR'd against the payload. Server-to-client frames must NOT be masked. Masking prevents cache poisoning attacks against proxies that might cache WebSocket frames as HTTP responses.`,
      },
      {
        term: 'Ping/Pong Heartbeat',
        definition: `Either side can send a Ping frame (opcode 9) with optional payload up to 125 bytes. The recipient must respond with a Pong frame (opcode 10) containing the same payload. Ping/pong is used to detect dead connections when no application data flows and to keep NAT bindings and load balancer connections alive. Many load balancers (nginx, ALB) close idle WebSocket connections after a configurable timeout; heartbeats prevent this.`,
      },
      {
        term: 'Server-Sent Events (SSE)',
        definition: `A W3C standard for server-to-client streaming over HTTP. The server sets Content-Type: text/event-stream and sends events in the format "data: payload\n\n". SSE supports named events, event IDs for resumption, and retry intervals. Browser EventSource API handles automatic reconnection with the Last-Event-ID header. SSE works over HTTP/2 (multiple SSE streams can share one connection), unlike WebSockets which require HTTP/1.1 for the upgrade.`,
      },
      {
        term: 'Sticky Sessions for WebSockets',
        definition: `WebSocket connections are long-lived and stateful — in-memory state (subscriptions, cursors, presence) lives on the specific server handling the connection. A load balancer must route all requests from the same client to the same backend server. This is done via cookie-based sticky sessions (AWS ALB: AWSALB cookie) or IP hash routing. The alternative is to externalize all state to a shared store (Redis pub/sub, Kafka consumer groups) so any server can handle any connection.`,
      },
    ],
    pitfalls: [
      'Not implementing application-level heartbeats and relying on TCP keep-alive: most load balancers (nginx default: 60s, AWS ALB: 60s, Cloudflare: 100s) will close idle WebSocket connections. TCP keep-alive (default 2h) fires far too late. Send application-level ping frames every 20-30 seconds and close/reconnect if pong is not received within a timeout.',
      'Forgetting that WebSocket connections are not automatically multiplexed over HTTP/2: WebSocket is defined for HTTP/1.1. RFC 8441 defines WebSocket over HTTP/2 streams, but browser and server support is limited. A page using HTTP/2 for resource loading will open a separate HTTP/1.1 connection for WebSockets, consuming an extra TCP connection.',
      'Scaling WebSocket backends with round-robin load balancing without sticky sessions: if a client sends an HTTP request routed to a different backend than its WebSocket connection, the backends have inconsistent views of state. Either use sticky sessions, share state in Redis, or route all traffic through the WebSocket connection.',
      'Not handling reconnection with exponential backoff: clients that reconnect immediately on disconnect will thundering-herd a recovering server. Always implement reconnection with exponential backoff and jitter (e.g., 1s, 2s, 4s, 8s, max 30s with +/- 20% jitter).',
    ],
    keyQuestions: [
      {
        question: 'How does the WebSocket upgrade handshake work, and how would you debug a WebSocket connection that fails to establish?',
        answer: `## WebSocket Upgrade Handshake

## Client request
\`\`\`http
GET /ws HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://example.com
\`\`\`

## Server response (success)
\`\`\`http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
\`\`\`

## Key verification: Sec-WebSocket-Accept
\`\`\`python
import hashlib, base64
key = "dGhlIHNhbXBsZSBub25jZQ=="
magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
accept = base64.b64encode(hashlib.sha1((key + magic).encode()).digest()).decode()
# Result: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
\`\`\`

## Debugging connection failures

### 1. Check if the upgrade is being rejected
\`\`\`bash
curl -v -H "Upgrade: websocket" -H "Connection: Upgrade" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     -H "Sec-WebSocket-Version: 13" \
     https://example.com/ws
# Look for: 101 Switching Protocols vs 400/403/404
\`\`\`

### 2. Proxy stripping upgrade headers
Nginx by default does not forward Upgrade/Connection headers in proxy_pass:
\`\`\`nginx
location /ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
\`\`\`

### 3. Load balancer closing the connection
\`\`\`bash
# Test with websocat (ws curl equivalent)
websocat wss://example.com/ws
# Observe: does it connect then immediately disconnect?
# Check server logs for close codes (1001 = going away, 1006 = abnormal close)
\`\`\`

### 4. TLS certificate issues on WSS
\`\`\`bash
# WSS = WebSocket Secure = WebSocket over TLS
# Same cert validation as HTTPS; same failure modes
openssl s_client -connect example.com:443 -showcerts
\`\`\`

### 5. CORS issues (browser only)
The WebSocket API uses the Origin header but does not enforce CORS at the browser level — the server must validate Origin if cross-origin connections should be restricted. A server that rejects the Origin header returns 403.`,
      },
      {
        question: 'Compare WebSockets, Server-Sent Events, and long-polling. When would you use each?',
        answer: `## Real-Time Protocol Comparison

## Long-Polling

Mechanism: client sends HTTP request, server holds it until data is available or timeout, client immediately re-sends.

\`\`\`javascript
async function longPoll() {
  while (true) {
    const res = await fetch(\`/api/events?since=\${lastEventId}\`);
    const data = await res.json();
    processEvents(data.events);
    lastEventId = data.lastId;
  }
}
\`\`\`

Pros: works everywhere, no special protocol
Cons: high overhead (headers on every poll), latency = server timeout on empty queue

Use for: legacy systems, environments where WebSockets/SSE are blocked, low-frequency events

## Server-Sent Events (SSE)

Mechanism: client opens one HTTP request, server streams events indefinitely.

\`\`\`javascript
const es = new EventSource('/api/stream');
es.onmessage = e => processEvent(JSON.parse(e.data));
es.addEventListener('notification', e => handleNotification(e.data));
// Browser auto-reconnects with Last-Event-ID on disconnect
\`\`\`

Pros: simple, built-in reconnection with Last-Event-ID, works over HTTP/2, easy to proxy
Cons: server-to-client only, text format only

Use for: live feeds, notifications, dashboards where client does not need to send data on the stream

## WebSockets

Mechanism: HTTP upgrade to full-duplex binary-framed protocol.

\`\`\`javascript
const ws = new WebSocket('wss://example.com/ws');
ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', channel: 'prices' }));
ws.onmessage = e => processMessage(JSON.parse(e.data));
ws.onclose = e => scheduleReconnect(e.code);
\`\`\`

Pros: full-duplex, low overhead per message, binary or text, sub-millisecond latency
Cons: stateful (hard to scale horizontally), requires sticky sessions or external state

Use for: chat, collaborative editing, multiplayer games, trading platforms

## Decision matrix

| Requirement | Use |
|---|---|
| Server pushes only, infrequent | SSE |
| Server pushes only, high rate | SSE or WebSocket |
| Bidirectional, low latency | WebSocket |
| Binary data, bidirectional | WebSocket |
| Works behind corporate proxy | SSE or long-poll |
| Mobile with frequent reconnection | SSE (auto-reconnect built-in) |
| Works over HTTP/2 multiplexing | SSE |`,
      },
    ],
    references: [
      'https://datatracker.ietf.org/doc/html/rfc6455',
      'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API',
      'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events',
      'https://web.dev/eventsource-basics/',
      'https://nginx.org/en/docs/http/websocket.html',
    ],
    quickFire: [
      { q: 'How does a WebSocket connection start?', a: 'With an HTTP upgrade handshake: client sends Upgrade: websocket and Connection: Upgrade; server responds 101 Switching Protocols, converting to a full-duplex persistent connection.' },
      { q: 'What is the difference between WebSocket and HTTP long polling?', a: 'WebSocket is a persistent full-duplex connection -- either side can send at any time. Long polling holds an HTTP request open until data arrives, then closes and reconnects.' },
      { q: 'What is Server-Sent Events and when is it preferred over WebSocket?', a: 'SSE is a one-way server-to-client stream over HTTP. Preferred for read-only push (live feeds, dashboards) because it uses standard HTTP, works through proxies, and auto-reconnects.' },
      { q: 'What nginx config is needed to proxy WebSocket connections?', a: 'proxy_set_header Upgrade $http_upgrade; and proxy_set_header Connection "upgrade"; -- without these nginx closes the connection on the upgrade request.' },
      { q: 'What problem do WebSocket ping/pong frames solve?', a: 'Keepalive -- they detect broken connections and prevent idle-timeout disconnection by load balancers and firewalls that drop inactive TCP connections.' },
      { q: 'How do you scale WebSocket connections across multiple servers?', a: 'Use sticky sessions to pin each client to one backend, or use pub/sub (Redis, Kafka) so any server can push to any client regardless of which holds the connection.' },
      { q: 'What HTTP status code is returned when a WebSocket upgrade succeeds?', a: '101 Switching Protocols.' },
      { q: 'Can WebSocket work over HTTP/2?', a: 'Yes, via RFC 8441 (WebSocket over HTTP/2), which tunnels the WebSocket over a single HTTP/2 stream, sharing the multiplexed connection.' },
    ],
  },
  {
    id: 'ip-addressing-cidr',
    title: 'IP Addressing & CIDR',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'CIDR notation, subnetting, private RFC 1918 ranges, IPv6 basics, and calculating usable hosts per subnet.',
    visualizations: [],
    introduction: `IP addressing and subnetting are foundational networking knowledge that every cloud engineer, SRE, and backend developer working with infrastructure must understand. Whether you are designing VPC address spaces, configuring Kubernetes pod CIDR ranges, debugging why two services cannot communicate, or understanding why a security group rule is not matching, IP addressing knowledge is directly applied.

An IP address is a 32-bit (IPv4) or 128-bit (IPv6) number that identifies a network interface. IPv4 addresses are written in dotted-decimal notation as four octets (e.g., 192.168.1.100). The address is divided into a network portion and a host portion, determined by the subnet mask.

CIDR (Classless Inter-Domain Routing, RFC 4632) replaced the rigid class-based addressing (Class A/B/C) with prefix notation. A CIDR block like 10.0.0.0/16 means the first 16 bits are the network prefix, leaving 16 bits for host addresses. This allows arbitrary prefix lengths, enabling efficient allocation of IP address space without wasting entire Class C blocks on networks with a handful of hosts.

RFC 1918 defines three private address ranges that are not routed on the public internet: 10.0.0.0/8 (16 million addresses), 172.16.0.0/12 (1 million addresses), and 192.168.0.0/16 (65,536 addresses). These ranges are used for private networks, VPCs, Kubernetes pod networks, and corporate LANs. They reach the internet via NAT (Network Address Translation).

IPv6 uses 128-bit addresses written as eight groups of four hex digits separated by colons (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334). Consecutive groups of zeros can be replaced with :: once per address. IPv6 has a vast address space (340 undecillion addresses), making NAT unnecessary — every device can have a globally unique address. IPv6 also introduces link-local addresses (fe80::/10) for communication within a network segment without configuration.

For cloud environments, VPC design decisions — CIDR block size, subnet allocation, reserved addresses, peering constraints — have long-term operational consequences that are expensive to change. Getting subnetting right the first time matters.`,
    whenToUse: [
      'Designing a VPC address space for a cloud environment (AWS, GCP, Azure) with room for future growth',
      'Calculating available IP addresses in a subnet to ensure enough addresses for EC2 instances or Kubernetes pods',
      'Debugging why two VPCs cannot be peered (overlapping CIDR ranges)',
      'Configuring Kubernetes pod CIDR, service CIDR, and node CIDR without conflicts',
      'Understanding security group and firewall rules that filter by IP range',
      'Explaining IP address exhaustion and why IPv6 adoption matters',
    ],
    keyConcepts: [
      {
        term: 'CIDR Notation',
        definition: `CIDR (Classless Inter-Domain Routing) represents an IP address block as a base address and prefix length: network/prefix (e.g., 192.168.1.0/24). The prefix length (0-32 for IPv4) indicates how many leading bits are fixed (the network prefix). The remaining bits identify individual hosts within the network. A /24 has 24 fixed bits and 8 host bits (256 addresses); a /16 has 16 fixed bits and 16 host bits (65,536 addresses).`,
      },
      {
        term: 'Subnet Mask',
        definition: `A 32-bit mask where 1s denote the network portion and 0s denote the host portion. /24 corresponds to 255.255.255.0 (24 ones followed by 8 zeros). The network address is the IP bitwise-AND'd with the mask. The broadcast address is the network address OR'd with the inverted mask. Usable host addresses are all addresses between network address+1 and broadcast-1.`,
      },
      {
        term: 'RFC 1918 Private Ranges',
        definition: `Three IPv4 address blocks reserved for private networks, not routed on the public internet: 10.0.0.0/8 (10.0.0.0 to 10.255.255.255, ~16.7M addresses), 172.16.0.0/12 (172.16.0.0 to 172.31.255.255, ~1M addresses), and 192.168.0.0/16 (192.168.0.0 to 192.168.255.255, 65,536 addresses). Internet access from these ranges requires NAT. All three ranges may appear in VPCs, home networks, container networks, and corporate LANs.`,
      },
      {
        term: 'IPv6 Address Structure',
        definition: `IPv6 uses 128-bit addresses in 8 groups of 4 hex digits. The /64 prefix is standard for subnets, leaving 64 bits for interface identifiers. Key address types: global unicast (2000::/3, globally routable), link-local (fe80::/10, auto-configured, not routable), loopback (::1/128), and unique local (fc00::/7, analogous to RFC 1918).`,
      },
      {
        term: 'AWS Reserved Addresses per Subnet',
        definition: `AWS reserves 5 IP addresses in every subnet: .0 (network address), .1 (VPC router), .2 (AWS DNS), .3 (reserved for future use), and the broadcast address. A /24 subnet has 256 total addresses minus 5 reserved = 251 usable. This matters when sizing subnets for large EC2 fleets or Kubernetes node groups where each node consumes multiple IPs for pod addresses.`,
      },
      {
        term: 'Supernetting and Route Summarization',
        definition: `Supernetting (the inverse of subnetting) combines multiple contiguous networks into a single larger CIDR block for routing efficiency. For example, 10.0.0.0/24 and 10.0.1.0/24 can be summarized as 10.0.0.0/23. Route summarization reduces the number of entries in routing tables. BGP heavily relies on prefix aggregation to keep the global routing table manageable.`,
      },
    ],
    pitfalls: [
      'Designing VPCs with CIDR blocks that are too small and cannot be changed: AWS does not allow reducing a VPC CIDR block. Adding secondary CIDRs later is possible but complicates routing. Always over-provision — a /16 for the primary VPC costs nothing extra but gives room to grow and create large subnets for different tiers.',
      'Creating overlapping CIDR ranges between VPCs you plan to peer: VPC peering and Transit Gateway require non-overlapping CIDRs. If two VPCs both use 10.0.0.0/16, they can never be peered. Plan your IP address scheme across all VPCs and environments (dev/staging/prod) before deploying.',
      'Forgetting that Kubernetes pod CIDR must not overlap with VPC CIDR or node CIDR: Kubernetes assigns pod IPs from the pod CIDR; nodes get IPs from the VPC subnet. If pod CIDR overlaps with any on-premises or peered VPC range, pod-to-pod traffic may be incorrectly routed. Common clusters use 10.244.0.0/16 or 172.20.0.0/16 for pods, 10.96.0.0/12 for services.',
      'Not accounting for IPv6 link-local addresses in firewall rules: every IPv6-capable interface automatically generates a link-local address (fe80::/10) that is not filtered by rules targeting global unicast ranges. Applications listening on all interfaces (:: in IPv6) will also listen on link-local addresses; ensure firewall rules account for this.',
    ],
    keyQuestions: [
      {
        question: 'How do you calculate the number of usable hosts in a /26 subnet, and what is its network and broadcast address if the base is 192.168.10.64?',
        answer: `## Subnet Calculation: 192.168.10.64/26

## Step 1: Determine host bits
/26 means 26 bits are the network prefix. IPv4 has 32 total bits.
Host bits = 32 - 26 = 6 bits

## Step 2: Total addresses
2^6 = 64 total addresses

## Step 3: Usable hosts
Subtract 2 (network address and broadcast address):
64 - 2 = 62 usable host addresses

## Step 4: Network address
192.168.10.64 AND 255.255.255.192 = 192.168.10.64

## Step 5: Broadcast address
Network address OR inverted mask:
255.255.255.192 inverted = 0.0.0.63
192.168.10.64 OR 0.0.0.63 = 192.168.10.127

## Step 6: Usable host range
192.168.10.65 to 192.168.10.126 (62 hosts)

## Summary
| Property | Value |
|---|---|
| Network | 192.168.10.64 |
| Subnet mask | 255.255.255.192 |
| First host | 192.168.10.65 |
| Last host | 192.168.10.126 |
| Broadcast | 192.168.10.127 |
| Usable hosts | 62 |

## Quick reference: common prefix sizes
| CIDR | Total | Usable | Use case |
|---|---|---|---|
| /30 | 4 | 2 | Point-to-point links |
| /28 | 16 | 14 | Small subnet |
| /26 | 64 | 62 | Small service tier |
| /24 | 256 | 254 | Standard subnet |
| /22 | 1024 | 1022 | AZ subnet in AWS |
| /16 | 65,536 | 65,534 | VPC block |

\`\`\`bash
# Verify with ipcalc
ipcalc 192.168.10.64/26

# Python calculation
python3 -c "
import ipaddress
net = ipaddress.IPv4Network('192.168.10.64/26')
print(f'Network: {net.network_address}')
print(f'Broadcast: {net.broadcast_address}')
print(f'Hosts: {net.num_addresses - 2}')
print(f'First: {list(net.hosts())[0]}')
print(f'Last: {list(net.hosts())[-1]}')
"
\`\`\``,
      },
      {
        question: 'How do you design a VPC address scheme for a multi-account AWS environment with dev, staging, and production?',
        answer: `## Multi-Account VPC CIDR Design

## Key constraints
- VPCs you want to peer or connect via Transit Gateway must have non-overlapping CIDRs
- AWS reserves 5 IPs per subnet
- Secondary CIDRs can be added but primary cannot be changed
- On-premises networks must also not overlap with any VPC

## Common approach: allocate a super-block, divide by account/environment

Start with a large RFC 1918 block not used on-premises, e.g., 10.0.0.0/8.

Divide into /10 blocks per major division:
- 10.0.0.0/10 → Production VPCs (10.0.0.0 - 10.63.255.255)
- 10.64.0.0/10 → Staging VPCs (10.64.0.0 - 10.127.255.255)
- 10.128.0.0/10 → Development VPCs (10.128.0.0 - 10.191.255.255)
- 10.192.0.0/10 → Shared/Platform (10.192.0.0 - 10.255.255.255)

Within Production, divide into /16 per region:
- 10.0.0.0/16 → us-east-1 prod
- 10.1.0.0/16 → us-west-2 prod
- 10.2.0.0/16 → eu-west-1 prod

Within each VPC /16, divide into /24 subnets per AZ and tier:
- 10.0.0.0/24 → us-east-1a public
- 10.0.1.0/24 → us-east-1b public
- 10.0.10.0/24 → us-east-1a private (app tier)
- 10.0.20.0/24 → us-east-1a database

## Kubernetes considerations
Kubernetes needs additional CIDR blocks that do not overlap:
- Pod CIDR: 100.64.0.0/10 (RFC 6598 shared address space)
- Service CIDR: 172.20.0.0/16

\`\`\`bash
# Verify no overlaps between planned CIDRs
python3 -c "
import ipaddress
networks = ['10.0.0.0/16', '10.1.0.0/16', '172.20.0.0/16']
nets = [ipaddress.IPv4Network(n) for n in networks]
for i, a in enumerate(nets):
    for j, b in enumerate(nets):
        if i < j and a.overlaps(b):
            print(f'OVERLAP: {a} and {b}')
print('No overlaps found')
"

# Check current VPC CIDRs in AWS
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,CidrBlock]' --output table
\`\`\`

## Anti-patterns to avoid
- Using 192.168.0.0/16 for production VPCs (conflicts with home routers on employee VPNs)
- VPCs with /28 or smaller (too few IPs for growth)
- All environments in the same VPC separated only by security groups (blast radius too large)`,
      },
    ],
    references: [
      'https://datatracker.ietf.org/doc/html/rfc4632',
      'https://datatracker.ietf.org/doc/html/rfc1918',
      'https://docs.aws.amazon.com/vpc/latest/userguide/configure-your-vpc.html',
      'https://kubernetes.io/docs/concepts/cluster-administration/networking/',
      'https://jodies.de/ipcalc',
    ],
    quickFire: [
      { q: 'What does CIDR notation like 10.0.0.0/24 mean?', a: 'The /24 prefix means 24 bits are the network portion, 8 bits for hosts -- 256 total addresses, 254 usable after network and broadcast.' },
      { q: 'What are the RFC 1918 private IP ranges?', a: '10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16. These are non-routable on the public internet and require NAT for outbound access.' },
      { q: 'How many usable IPs are in a /28 subnet?', a: '16 total addresses minus 2 (network + broadcast) = 14 usable. AWS reserves 3 more per subnet, leaving 11 usable.' },
      { q: 'What is the difference between /16 and /24?', a: '/16 has 65,536 addresses. /24 has 256. Larger prefix number = smaller network. /16 is typical for a VPC, /24 per AZ subnet.' },
      { q: 'Why must VPC CIDRs not overlap with on-premises ranges?', a: 'Overlapping CIDRs prevent VPC peering and VPN routing -- the router cannot distinguish which network a packet belongs to.' },
      { q: 'What is a /32 used for?', a: 'A single host route -- exactly one IP. Used in security group rules to allow a specific IP, and in BGP to advertise a single host.' },
      { q: 'How many AWS-reserved IPs does each VPC subnet lose?', a: 'Five: network (.0), VPC router (.1), AWS DNS (.2), reserved (.3), and broadcast (last). A /24 has 251 usable IPs.' },
      { q: 'What is supernetting / route summarization?', a: 'Combining contiguous subnets into a single larger prefix. 10.0.0.0/24 + 10.0.1.0/24 = 10.0.0.0/23. Reduces routing table size in BGP and VPC route tables.' },
      { q: 'How do you determine if two IPs are in the same subnet?', a: 'AND both IPs with the subnet mask. If the results are equal, they share the same subnet. E.g., 10.0.1.5 AND 255.255.255.0 = 10.0.1.0.' },
    ],
  },
  {
    id: 'nat-pat',
    title: 'NAT & PAT',
    icon: 'globe',
    color: '#3b82f6',
    questions: 5,
    description: 'SNAT vs DNAT, connection tracking, port forwarding, NAT traversal techniques, and why NAT breaks peer-to-peer connectivity.',
    visualizations: [],
    introduction: `Network Address Translation (NAT) is the mechanism by which IP addresses are rewritten in packet headers as they traverse a router or firewall. NAT was originally designed as a stopgap to address IPv4 exhaustion — by hiding many private RFC 1918 addresses behind a single public IP, NAT allowed billions of devices to share a relatively small pool of public addresses. Today NAT is ubiquitous: home routers, cloud NAT gateways, container runtimes, and Kubernetes kube-proxy all rely on it.

Source NAT (SNAT) rewrites the source IP address of outgoing packets. This is the standard form of NAT used in home routers and cloud NAT gateways: a device with a private IP (10.0.0.5) sends a packet; the router rewrites the source to its public IP (203.0.113.1) and records the mapping in a connection tracking table. When the response arrives, the router looks up the connection and rewrites the destination back to 10.0.0.5.

PAT (Port Address Translation), also called NAPT or IP masquerade, is the most common form of SNAT. It maps multiple private (IP, port) pairs to a single public IP using different ports. This allows thousands of connections to share one public IP. The connection tracking table maps (private_ip, private_port, protocol) to (public_ip, public_port, protocol).

Destination NAT (DNAT) rewrites the destination IP (and optionally port) of incoming packets. DNAT is used for port forwarding: an external request to public_ip:80 is rewritten to private_ip:8080 and forwarded to an internal server. This is how Docker port publishing, Kubernetes NodePort and LoadBalancer services, and AWS Network Load Balancers work.

NAT fundamentally breaks the internet's end-to-end connectivity model. Two peers behind separate NATs cannot establish a direct connection by simply dialing each other's IP, because neither has a stable, reachable public endpoint. NAT traversal techniques — STUN, TURN, ICE, hole punching — are required to establish peer-to-peer connections in the presence of NAT. This complexity is a major driver of VPN adoption, WebRTC infrastructure costs, and the push toward IPv6.`,
    whenToUse: [
      'Designing container networking with port publishing and understanding how Docker iptables rules work',
      'Configuring AWS NAT Gateway for private subnet internet access vs VPC peering',
      'Debugging why a Kubernetes LoadBalancer service source IP is showing the node IP instead of the client IP',
      'Understanding how STUN/TURN servers enable WebRTC peer-to-peer media connections through NAT',
      'Explaining to an interviewer why NAT is a problem for peer-to-peer applications and IPv6 adoption',
    ],
    keyConcepts: [
      {
        term: 'Connection Tracking (conntrack)',
        definition: `The kernel module that maintains a table of active network connections to enable stateful packet inspection and NAT. Each entry records the tuple (src_ip, src_port, dst_ip, dst_port, protocol), the connection state (NEW, ESTABLISHED, RELATED, INVALID), and the NAT translation to apply. conntrack entries expire after timeouts (TCP ESTABLISHED: 5 days, TIME_WAIT: 120s, UDP: 30s). Conntrack table exhaustion causes new connections to be dropped and is a common production incident on high-connection-rate systems.`,
      },
      {
        term: 'SNAT (Source NAT)',
        definition: `Rewrites the source IP address of outgoing packets. Used in NAT gateways (cloud and home routers) to allow private IP hosts to communicate with the internet. The router records the original (src_ip, src_port) to (nat_ip, nat_port) mapping and applies the reverse translation to incoming response packets. MASQUERADE is a dynamic form of SNAT that uses the outgoing interface's current IP, useful for connections where the public IP changes.`,
      },
      {
        term: 'DNAT (Destination NAT)',
        definition: `Rewrites the destination IP address (and optionally port) of incoming packets. Used for port forwarding, load balancers (which rewrite the VIP to a backend IP), and Kubernetes Services. The connection tracking table enables the router to apply the reverse translation to response packets so they return through the same NAT path. iptables PREROUTING chain applies DNAT before routing decisions.`,
      },
      {
        term: 'NAT Traversal and Hole Punching',
        definition: `Techniques to establish direct peer-to-peer connections between hosts behind NAT. STUN (RFC 8489) allows a host to discover its public (IP, port) by querying a STUN server. UDP hole punching involves both peers sending packets to each other's STUN-discovered endpoints simultaneously; NAT routers create conntrack entries for each outgoing packet, so when the peer's packet arrives, it matches an existing entry and is forwarded. TURN (RFC 8656) is a relay fallback when direct connection fails.`,
      },
      {
        term: 'Hairpin NAT (NAT Reflection)',
        definition: `A configuration that allows hosts on the internal network to reach internal services by their public (external) IP address. Without hairpin NAT, a packet from an internal host to the router's public IP destined for an internal service may be dropped or returned incorrectly. With hairpin NAT, the router applies DNAT to rewrite the destination to the internal server's IP and SNAT to rewrite the source. Required for split-horizon DNS to work correctly.`,
      },
    ],
    pitfalls: [
      'Conntrack table exhaustion causing connection drops with no obvious error: when the conntrack table is full, new connections are silently dropped. The error appears in dmesg as "nf_conntrack: table full, dropping packet" but not in application logs. Monitor with conntrack -S and tune nf_conntrack_max and nf_conntrack_buckets based on expected concurrent connections.',
      'Source IP preservation loss in Kubernetes LoadBalancer services: by default, Kubernetes NodePort and LoadBalancer services SNAT the client IP to the node IP before forwarding to the pod. To preserve the original client IP, set externalTrafficPolicy: Local on the Service. This limits pod selection to pods on the same node as the incoming request, which may cause uneven load distribution.',
      'Assuming NAT protects internal hosts as a firewall: NAT is not a security mechanism. A NAT router only blocks unsolicited inbound connections because there is no conntrack entry for them — not because it inspects or filters traffic. Always use explicit firewall rules (security groups, NACLs, iptables) for security.',
      'High-rate UDP flows exhausting PAT port space: a single public IP with PAT supports at most ~65,000 concurrent connections per destination IP/port (the available port range). High-rate UDP applications (DNS forwarders, SYSLOG aggregators, StatsD) that send to a single destination may exhaust port space. Use multiple NAT gateway IPs, reduce UDP conntrack timeout, or use multiple source IPs.',
    ],
    keyQuestions: [
      {
        question: 'Explain how Docker port publishing works under the hood using DNAT and iptables.',
        answer: `## Docker Port Publishing: Under the Hood

When you run "docker run -p 8080:80 nginx", Docker sets up iptables rules to forward traffic from host port 8080 to the container's port 80.

## Container network setup
Docker creates a Linux bridge (docker0) and assigns the container a veth pair:
- Container side: eth0 with IP 172.17.0.2/16
- Host side: vethXXXX attached to docker0 bridge (172.17.0.1)

## iptables rules created by Docker

### DNAT in PREROUTING (for external traffic)
\`\`\`bash
# Packets arriving on any interface destined for host:8080 are DNATed to container
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 172.17.0.2:80

# Inspect existing rules
iptables -t nat -L PREROUTING -n -v
iptables -t nat -L DOCKER -n -v
\`\`\`

### DNAT in OUTPUT (for host-originated traffic)
\`\`\`bash
# Traffic from host processes to 127.0.0.1:8080 is also DNATed
iptables -t nat -A OUTPUT -p tcp -d 127.0.0.1 --dport 8080 -j DNAT --to-destination 172.17.0.2:80
\`\`\`

### MASQUERADE (SNAT for return traffic)
\`\`\`bash
# Responses from the container are SNATed to the docker0 bridge IP
iptables -t nat -A POSTROUTING -s 172.17.0.2/32 -j MASQUERADE
\`\`\`

### FORWARD chain allows traffic through the bridge
\`\`\`bash
iptables -A FORWARD -i docker0 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o docker0 -j ACCEPT
\`\`\`

## Packet flow: external client to container

1. Packet arrives: src=1.2.3.4:54321, dst=host_public_ip:8080
2. PREROUTING DNAT: dst rewritten to 172.17.0.2:80
3. Routing: packet routed to docker0 bridge
4. FORWARD: allowed through
5. Container receives: src=1.2.3.4:54321, dst=172.17.0.2:80

## Why the container sees the bridge IP in some cases

With Docker's default bridge mode, MASQUERADE also SNATs the source. The container sees the docker0 bridge IP (172.17.0.1) as the source, not the real client IP. To see the real client IP, use host networking or a reverse proxy that sets X-Forwarded-For.

\`\`\`bash
# Debug: watch conntrack entries for a connection
conntrack -L | grep 8080
conntrack -E | grep 8080  # live event stream

# Show all iptables NAT rules for Docker
iptables -t nat -L -n -v --line-numbers
\`\`\``,
      },
      {
        question: 'Why does NAT break peer-to-peer connectivity, and how do STUN and TURN solve this for WebRTC?',
        answer: `## Why NAT Breaks Peer-to-Peer Connectivity

## The end-to-end connectivity problem
Peer A is at 10.0.0.5 behind NAT (public IP 203.0.113.1).
Peer B is at 192.168.1.10 behind NAT (public IP 198.51.100.1).

If A tries to connect to B's private IP, the packet is not routable on the internet. If A tries to connect to B's public IP, B's NAT router has no DNAT rule for the port and drops the packet — there is no conntrack entry matching this unsolicited inbound connection.

Neither peer knows its own public-facing IP:port, and neither has a stable, reachable public endpoint.

## STUN: Session Traversal Utilities for NAT (RFC 8489)

STUN allows a peer to discover its public IP and port by querying a STUN server on the public internet.

\`\`\`
Peer A                    STUN Server (public internet)
  |--- STUN Binding Req ------->|
  |                             | sees src: 203.0.113.1:44321
  |<-- STUN Binding Resp -------|
  |    (mapped_address: 203.0.113.1:44321)
\`\`\`

Now Peer A knows its public endpoint. It shares this with Peer B via a signaling channel (WebRTC SDP/ICE exchange over HTTPS).

## UDP Hole Punching

Both peers simultaneously send UDP packets to each other's STUN-discovered public endpoint. Sending the packet creates a conntrack entry on each NAT. When the peer's packet arrives, it matches the conntrack entry and is forwarded.

## Types of NAT and hole punching success rate
- Full Cone NAT: all external IPs can reach the mapped port → hole punching always works
- Restricted Cone: only if peer sent to the NAT first → hole punching works
- Port Restricted Cone: only if peer sent to the exact IP:port → hole punching works
- Symmetric NAT: different external port per destination → STUN discovers wrong port, hole punching fails

## TURN: Traversal Using Relays around NAT (RFC 8656)

TURN is the fallback when direct connection fails (symmetric NAT, strict firewalls). The TURN server acts as a relay:

- Peer A sends media to TURN server
- TURN server forwards to Peer B
- Media flows through the TURN server, not peer-to-peer

TURN is expensive (bandwidth, server cost) and adds latency. WebRTC's ICE framework tries all candidate pairs in priority order: direct connection, STUN hole punching, TURN relay.

## ICE candidate priority order
1. host: direct LAN connection (lowest latency)
2. srflx (server reflexive): STUN-discovered public endpoint
3. relay: TURN relay (highest latency, always works)

\`\`\`bash
# Test STUN server
npm install -g stuntman
stun stun.l.google.com:19302

# Check ICE candidates in a WebRTC session (browser DevTools)
# RTCPeerConnection.getStats() shows candidate types: host, srflx, relay
\`\`\`

## Why IPv6 eliminates this
Every IPv6 host can have a globally unique, publicly reachable address. No NAT required → direct peer-to-peer without STUN/TURN/hole punching. This is one of IPv6's strongest operational arguments beyond just address space.`,
      },
    ],
    references: [
      'https://datatracker.ietf.org/doc/html/rfc2663',
      'https://datatracker.ietf.org/doc/html/rfc8489',
      'https://datatracker.ietf.org/doc/html/rfc8656',
      'https://www.netfilter.org/documentation/HOWTO/NAT-HOWTO.html',
      'https://docs.docker.com/network/iptables/',
      'https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols',
    ],
    quickFire: [
      { q: 'What is NAT and why is it used?', a: 'Network Address Translation maps private IPs to a public IP for outbound traffic, conserving IPv4 addresses and hiding internal topology from the internet.' },
      { q: 'What is PAT (Port Address Translation)?', a: 'A form of NAT where many private IP:port pairs map to a single public IP using different source ports. Also called NAPT or NAT overload -- how home routers and AWS NAT Gateways work.' },
      { q: 'What is SNAT vs DNAT?', a: 'SNAT rewrites the source IP (outbound masquerading). DNAT rewrites the destination IP (inbound port forwarding / load balancing). Both use conntrack to match return traffic.' },
      { q: 'What is conntrack and why does table exhaustion matter?', a: 'The kernel connection tracking table that records active NAT mappings. When full, new connections are silently dropped. Monitor with conntrack -S; tune nf_conntrack_max for high-throughput systems.' },
      { q: 'Does NAT provide security like a firewall?', a: 'No. NAT blocks unsolicited inbound connections only because there is no conntrack entry -- not due to policy inspection. Always use explicit firewall rules (security groups, iptables) for security.' },
      { q: 'What is STUN used for in NAT traversal?', a: 'STUN lets a host behind NAT discover its public (IP, port) by querying an external STUN server. Used by WebRTC and VoIP to find reachable endpoints for peer-to-peer connections.' },
      { q: 'What is UDP hole punching?', a: 'Both peers send UDP packets to each other\'s STUN-discovered public endpoints simultaneously, causing each NAT to create a conntrack entry that allows the other peer\'s return traffic through.' },
      { q: 'What is an AWS NAT Gateway?', a: 'A managed PAT device in a public subnet that lets private subnet instances initiate outbound internet connections while blocking all unsolicited inbound traffic. Billed per GB processed.' },
      { q: 'What limits the number of concurrent connections through a single NAT IP?', a: 'Port exhaustion -- PAT uses source port numbers (max ~65,000 per destination). High-rate flows to a single destination can exhaust available ports, causing new connection drops.' },
    ],
  },
  {
    id: 'bgp-routing',
    title: 'BGP Routing',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 6,
    description: 'AS numbers, iBGP vs eBGP, path selection attributes (MED/LocalPref/AS_PATH), route aggregation, and BGP hijacking attacks.',
    visualizations: [],
    introduction: `BGP (Border Gateway Protocol) is the routing protocol that holds the internet together. As an exterior gateway protocol standardized in RFC 4271, BGP exchanges reachability information between autonomous systems (AS) — collections of IP prefixes under a single administrative domain identified by a unique AS number. Unlike interior routing protocols that optimize for shortest path within a network, BGP is a path-vector protocol that makes routing decisions based on policies and a rich set of attributes.

BGP sessions operate over TCP port 179, ensuring reliable delivery of routing updates. Two fundamental session types exist: eBGP (external BGP) connects routers in different autonomous systems and is the basis of inter-domain internet routing, while iBGP (internal BGP) connects routers within the same AS to distribute externally learned routes internally.

Understanding BGP is critical for SRE and network engineering roles at large-scale companies. Google, Amazon, and Meta each operate large autonomous systems and peer with hundreds of ISPs globally. BGP misconfigurations have caused some of the internet's most severe outages, including the 2021 Facebook incident where an erroneous BGP withdrawal made all Facebook properties unreachable worldwide for over six hours.

In cloud environments, BGP is used extensively: AWS Direct Connect uses BGP to exchange routes between on-premises networks and AWS, Transit Gateway route tables propagate BGP-learned prefixes, and Kubernetes CNI plugins like Calico use BGP to distribute pod CIDR routes across nodes. Mastery of BGP path selection, attribute manipulation, and troubleshooting is expected at the senior SRE and network engineer level.`,
    whenToUse: [
      'Designing multi-homed internet connectivity with multiple ISPs',
      'Configuring AWS Direct Connect or Azure ExpressRoute BGP sessions',
      'Building large-scale Kubernetes clusters using Calico or similar CNI with BGP',
      'Investigating internet routing incidents, prefix hijacks, or route leaks',
      'Architecting anycast routing for global load distribution',
    ],
    keyConcepts: [
      { term: 'Autonomous System (AS)', definition: `A collection of IP prefixes under a single administrative domain, identified by a 16-bit (1-65535) or 32-bit AS number. Public AS numbers are assigned by RIRs. Private AS numbers (64512-65535 for 16-bit) are used internally and stripped at eBGP boundaries.` },
      { term: 'Path Vector Protocol', definition: `BGP carries the full AS_PATH attribute listing every AS a route has traversed. This prevents routing loops (a router will not accept a route containing its own AS number) and enables policy-based path selection beyond simple hop count.` },
      { term: 'LOCAL_PREF', definition: `A BGP attribute used within an AS (iBGP only) to influence outbound traffic. Higher LOCAL_PREF is preferred. Routers use this to prefer one exit point over another. Default value is 100. Not advertised to eBGP peers.` },
      { term: 'MED (Multi-Exit Discriminator)', definition: `A BGP attribute advertised to eBGP peers to suggest a preferred entry point into your AS for a given prefix. Lower MED is preferred. Comparison is only done between routes from the same neighboring AS by default.` },
      { term: 'BGP Path Selection Order', definition: `BGP selects the best path using a deterministic algorithm: highest WEIGHT (Cisco-proprietary, local only), highest LOCAL_PREF, locally originated routes, shortest AS_PATH, lowest ORIGIN code (IGP less than EGP less than incomplete), lowest MED, eBGP over iBGP, lowest IGP metric to next-hop, lowest router ID.` },
      { term: 'Route Reflector', definition: `In iBGP, a full mesh of sessions is required between all routers (n*(n-1)/2 sessions). Route reflectors solve this scaling problem by acting as a hub, re-advertising iBGP-learned routes to other iBGP peers (clients). The route reflector does not modify path attributes except adding CLUSTER_LIST and ORIGINATOR_ID to prevent loops.` },
    ],
    pitfalls: [
      'iBGP requires either a full mesh or route reflectors — failing to configure this means iBGP-learned routes will not be redistributed to other iBGP peers, causing black holes.',
      'BGP next-hop is not changed for iBGP updates by default, so the next-hop IP learned via eBGP must be reachable via IGP inside the AS, or you must use next-hop-self on iBGP sessions.',
      'Accepting overly specific prefixes from peers without prefix-list filtering enables BGP hijacking and route leak incidents. Always apply inbound prefix filters.',
      'MED comparison is only between routes from the same AS by default. Comparing MEDs across different ASes requires bgp always-compare-med, which can cause unexpected path selection.',
      'Forgetting to aggregate routes before advertising to upstream ISPs results in leaking internal topology details and wastes global routing table space.',
    ],
    keyQuestions: [
      {
        question: 'Explain the BGP path selection algorithm. Given multiple paths to the same prefix, how does BGP choose the best one?',
        answer: `## BGP Best Path Selection

BGP evaluates candidate paths in strict order, stopping at the first differentiator:

## Selection Order

- WEIGHT: Highest wins. Cisco-proprietary, local to the router only, not advertised.
- LOCAL_PREF: Highest wins. Shared within an AS via iBGP. Used to prefer one exit point.
- Locally originated: Routes originated via network statement or redistribution preferred over learned routes.
- AS_PATH length: Shortest wins. Can be manipulated with AS_PATH prepending to make a path less preferred.
- ORIGIN code: IGP (i) preferred over EGP (e) preferred over Incomplete (?).
- MED: Lowest wins. Compared only between routes from same neighboring AS unless always-compare-med is set.
- eBGP over iBGP: External routes preferred over internal routes.
- IGP metric to next-hop: Lowest wins. Picks the closest exit in the AS.
- Oldest eBGP route: Prefers the route learned first (stability over change).
- Lowest BGP Router ID: Tiebreaker using the router's RID.

## Practical Example

\`\`\`bash
# View BGP table and best path on Cisco IOS
show bgp ipv4 unicast 10.0.0.0/8

# On Linux with FRR/Quagga
vtysh -c "show bgp ipv4 unicast 203.0.113.0/24"

# Check path attributes in detail
vtysh -c "show bgp ipv4 unicast 203.0.113.0/24 detail"
\`\`\`

## Manipulation Strategies

- Outbound (influence how others reach you): Increase AS_PATH length with prepending, adjust MED.
- Inbound (influence how you exit): Set LOCAL_PREF high on preferred paths, use WEIGHT for per-router control.`,
      },
      {
        question: 'What is a BGP route leak and a BGP hijack? How would you detect and mitigate each?',
        answer: `## BGP Route Leak

A route leak occurs when an AS re-advertises routes it received from one peer to another peer, violating the expected routing policy. Example: a customer AS receives routes from ISP-A and re-advertises them to ISP-B, causing traffic intended for ISP-A's customers to flow through the customer AS.

Famous example: In 2010, China Telecom (AS23724) leaked around 40,000 prefixes, redirecting traffic for US military, government, and commercial sites through China for 18 minutes.

## BGP Hijack

A hijack occurs when an AS originates a prefix it does not own. More specific prefixes win BGP selection, so an attacker announcing 1.2.3.0/25 can steal traffic for 1.2.3.0/24. Can be used for traffic interception or denial of service.

## Detection

\`\`\`bash
# Check who is originating a prefix using routing looking glasses
curl "https://stat.ripe.net/data/bgp-state/data.json?resource=8.8.8.0/24" | jq '.data.routes[].attrs.origin'

# Monitor with BGPmon or Kentik for unexpected origin AS changes
# Check IRR (Internet Routing Registry) consistency
whois -h whois.radb.net 8.8.8.0/24
\`\`\`

## Mitigations

- RPKI (Resource Public Key Infrastructure): Cryptographically signs Route Origin Authorizations (ROAs) that specify which AS is allowed to originate a prefix. Routers with ROV (Route Origin Validation) drop RPKI-invalid prefixes.
- IRR filtering: Filter based on IRRDB records (RADB, RIPE DB). Less secure than RPKI but widely deployed.
- BGPsec: Signs the full AS_PATH but has poor adoption due to performance overhead.
- Prefix lists: Apply strict inbound prefix filters on all BGP sessions, accepting only expected prefixes from each peer.`,
      },
      {
        question: 'How does BGP work over AWS Direct Connect? Walk through the configuration and what happens if the BGP session drops.',
        answer: `## BGP Over Direct Connect

AWS Direct Connect uses BGP to exchange routes between your on-premises router and the AWS Direct Connect router. Each virtual interface (VIF) type uses BGP differently:

## Virtual Interface Types

- Private VIF: BGP session to a VGW (Virtual Private Gateway) or Direct Connect Gateway. Exchanges VPC CIDRs.
- Public VIF: BGP session for AWS public IP space. Used to reach S3, DynamoDB endpoints without internet.
- Transit VIF: BGP session to a Direct Connect Gateway attached to a Transit Gateway.

## Configuration Steps

\`\`\`bash
# Create a private virtual interface
aws directconnect create-private-virtual-interface \
  --connection-id dxcon-xxxxxxxx \
  --new-private-virtual-interface \
    virtualInterfaceName=my-private-vif,\
    vlan=101,\
    asn=65000,\
    authKey=yourBGPauthKey,\
    amazonAddress=169.254.100.1/30,\
    customerAddress=169.254.100.2/30,\
    virtualGatewayId=vgw-xxxxxxxx

# Verify BGP session state
aws directconnect describe-virtual-interfaces \
  --virtual-interface-id dxvif-xxxxxxxx \
  --query 'virtualInterfaces[0].bgpPeers'
\`\`\`

## On-Premises Router (Cisco IOS example)

\`\`\`
router bgp 65000
 neighbor 169.254.100.1 remote-as 7224
 neighbor 169.254.100.1 password yourBGPauthKey
 network 10.0.0.0 mask 255.255.0.0
\`\`\`

## Failover Behavior

When the BGP session drops, AWS withdraws the advertised routes. If you have a Site-to-Site VPN configured as backup with lower LOCAL_PREF or higher AS_PATH length, traffic automatically fails over to VPN. The failover time depends on BGP hold timer (default 90 seconds, often tuned to 30s with keepalive 10s) plus VPN establishment time.`,
      },
    ],
    references: [
      'https://tools.ietf.org/html/rfc4271',
      'https://docs.aws.amazon.com/directconnect/latest/UserGuide/virtualgateways.html',
      'https://www.cloudflare.com/learning/security/glossary/bgp-hijacking/',
      'https://rpki.cloudflare.com/',
    ],
    quickFire: [
      { q: 'What is BGP used for?', a: 'Border Gateway Protocol is the routing protocol that exchanges reachability information between autonomous systems (ASes) on the internet and in large private networks.' },
      { q: 'What is an Autonomous System (AS)?', a: 'A network under a single administrative control with a unique ASN (Autonomous System Number). ISPs, cloud providers, and large enterprises each have one or more ASes.' },
      { q: 'What is the difference between eBGP and iBGP?', a: 'eBGP runs between routers in different ASes (external BGP). iBGP runs between routers within the same AS (internal BGP) to distribute externally learned routes.' },
      { q: 'What is a BGP prefix hijack?', a: 'When an AS advertises IP prefixes it does not own, attracting traffic destined for another network. RPKI (Resource Public Key Infrastructure) cryptographically signs route origins to prevent this.' },
      { q: 'What BGP attribute determines the preferred outbound path?', a: 'LOCAL_PREF (higher is preferred) for iBGP decisions within an AS. MED (lower is preferred) suggests preferred entry points to neighboring ASes. AS_PATH length is the primary eBGP tiebreaker.' },
      { q: 'How does AWS Direct Connect use BGP?', a: 'A BGP session runs between the customer router and the AWS Direct Connect router over a private virtual interface. Both sides advertise their prefixes; AWS advertises VPC CIDRs, customer advertises on-premises CIDRs.' },
      { q: 'What is RPKI?', a: 'Resource Public Key Infrastructure -- a cryptographic system where IP prefix owners sign Route Origin Authorizations (ROAs) certifying which ASes may originate their prefixes, blocking hijacks.' },
      { q: 'What is BGP route aggregation and why does it matter?', a: 'Summarizing many specific prefixes into a single less-specific prefix (e.g., /24s into a /20) to reduce the global routing table size, which exceeded 900,000 prefixes in 2024.' },
      { q: 'What caused the 2021 Facebook BGP outage?', a: 'Facebook\'s backbone routers withdrew all BGP routes due to a misconfigured maintenance command, making Facebook\'s DNS servers and services unreachable worldwide for ~6 hours.' },
    ],
  },
  {
    id: 'vlan-vxlan',
    title: 'VLAN & VXLAN',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 5,
    description: '802.1Q tagging, trunk vs access ports, VXLAN encapsulation over UDP port 4789, VTEP endpoints, and NVO3 overlay networks.',
    visualizations: [],
    introduction: `VLANs (Virtual Local Area Networks) and VXLAN (Virtual Extensible LAN) are foundational technologies for network segmentation and overlay networking, both critical in modern cloud and data center infrastructure.

A VLAN is a logical partition of a Layer 2 network. Using IEEE 802.1Q tagging, a 12-bit VLAN ID (1-4094) is inserted into the Ethernet frame header, allowing switches to segregate traffic into isolated broadcast domains without requiring separate physical infrastructure. VLANs are the building block of traditional enterprise network segmentation, used to separate departments, isolate tenants, and reduce broadcast domain size.

However, VLANs have a fundamental limitation: the 4094 VLAN limit is grossly insufficient for large multi-tenant environments like public clouds. AWS, GCP, and Azure each host millions of customer VPCs, far exceeding what 802.1Q can address. VXLAN was designed to solve this.

VXLAN encapsulates Layer 2 Ethernet frames inside UDP packets, creating an overlay network across an existing Layer 3 underlay. The VXLAN header includes a 24-bit VNI (VXLAN Network Identifier), allowing over 16 million virtual segments. Traffic flows between VTEP (VXLAN Tunnel Endpoint) devices, which perform encapsulation and decapsulation.

VXLAN is the backbone of OpenStack Neutron, VMware NSX-T, and Kubernetes CNI plugins like Flannel and Cilium. AWS uses a proprietary variant (Nitro hypervisor encapsulation) for VPC networking. Understanding VTEP behavior, multicast vs unicast VXLAN, and EVPN control plane is expected knowledge for senior networking and cloud platform engineers.`,
    whenToUse: [
      'Designing multi-tenant data center overlays exceeding 4094 VLAN limit',
      'Troubleshooting Kubernetes pod-to-pod networking with overlay CNI plugins',
      'Configuring VXLAN-based SDN in OpenStack or VMware NSX environments',
      'Understanding AWS VPC and ENI networking at the hypervisor level',
      'Implementing network segmentation in bare-metal cloud or colocation environments',
    ],
    keyConcepts: [
      { term: '802.1Q Tagging', definition: `The IEEE standard for VLAN tagging. A 4-byte tag is inserted into the Ethernet frame between the source MAC and EtherType fields. The tag contains: Tag Protocol Identifier (0x8100), Priority Code Point (3 bits, QoS), Drop Eligible Indicator (1 bit), and VLAN ID (12 bits, 1-4094).` },
      { term: 'Trunk Port vs Access Port', definition: `An access port carries traffic for a single VLAN and does not tag frames — used for connecting end hosts. A trunk port carries traffic for multiple VLANs and tags frames with 802.1Q headers — used for switch-to-switch and switch-to-router links. A native VLAN on a trunk port carries untagged traffic.` },
      { term: 'VTEP (VXLAN Tunnel Endpoint)', definition: `The device that performs VXLAN encapsulation and decapsulation. A VTEP has an IP address in the underlay network and one or more VNIs in the overlay. VTEPs can be implemented in hardware (ToR switches), hypervisor kernel (Linux VXLAN driver), or software (OVS, Cilium).` },
      { term: 'VNI (VXLAN Network Identifier)', definition: `The 24-bit segment identifier in the VXLAN header, equivalent to a VLAN ID but with 16 million possible values (2^24). Each VNI defines an independent Layer 2 domain in the overlay. Equivalent to an AWS VPC segment ID internally.` },
      { term: 'EVPN (Ethernet VPN)', definition: `A BGP-based control plane for VXLAN that replaces flood-and-learn MAC discovery. EVPN uses BGP route types to distribute MAC/IP bindings (Type 2), IP prefix routes (Type 5), and multicast membership (Type 3) between VTEPs. This eliminates broadcast flooding and enables scale-out data center fabrics.` },
    ],
    pitfalls: [
      'VXLAN adds 50 bytes of overhead (8 VXLAN + 8 UDP + 20 IP + 14 Ethernet outer headers). If the underlay MTU is 1500, inner frames must be limited to 1450 bytes or the outer MTU must be increased to 1550+ (jumbo frames). Failing to set jumbo frames causes silent packet drops for large transfers.',
      'Native VLAN mismatch on trunk ports causes untagged traffic to land in the wrong VLAN, leading to subtle security and connectivity issues that are difficult to diagnose.',
      'Flood-and-learn VXLAN without an EVPN control plane relies on multicast in the underlay for BUM (Broadcast, Unknown unicast, Multicast) traffic. If multicast is not configured or supported, VXLAN falls back to head-end replication, which is inefficient at scale.',
      'VLAN pruning on trunk links is often forgotten. Without it, all VLAN traffic floods across all trunk links, wasting bandwidth and creating unnecessary broadcast domains on links that have no members for those VLANs.',
    ],
    keyQuestions: [
      {
        question: 'How does VXLAN encapsulation work, and how would you troubleshoot a scenario where pods in different Kubernetes nodes cannot communicate using a VXLAN-based CNI?',
        answer: `## VXLAN Encapsulation

A VXLAN frame wraps an inner Ethernet frame:

\`\`\`
Outer Ethernet | Outer IP (VTEP src/dst) | UDP dst:4789 | VXLAN (VNI) | Inner Ethernet | Inner IP | Payload
\`\`\`

The sending VTEP looks up the destination MAC in its FDB (Forwarding Database) to find the remote VTEP IP, encapsulates the frame, and sends it over UDP. The receiving VTEP decapsulates and delivers to the local interface.

## Kubernetes VXLAN CNI Troubleshooting

\`\`\`bash
# 1. Verify VXLAN interface exists on the node (Flannel example)
ip link show flannel.1
ip -d link show flannel.1  # Shows VXLAN details including VNI and local VTEP IP

# 2. Check FDB entries — maps remote pod MAC to remote VTEP IP
bridge fdb show dev flannel.1

# 3. Verify route to remote pod CIDR goes via VXLAN interface
ip route show | grep 10.244.2.0  # Should show: via <remote-VTEP-IP> dev flannel.1

# 4. Capture VXLAN traffic on the underlay
tcpdump -i eth0 -n udp port 4789

# 5. Check if underlay UDP 4789 is blocked by security groups or iptables
iptables -L -n | grep 4789
# AWS: ensure security group allows UDP 4789 between nodes

# 6. Test inner connectivity with explicit source
ping -I flannel.1 <remote-pod-IP>
\`\`\`

## Common Root Causes

- UDP port 4789 blocked by cloud security group rules between nodes
- MTU mismatch: VXLAN overhead not accounted for, causing fragmentation or drops
- Stale FDB entries after node restart: entries point to wrong VTEP IP
- Missing routes: pod CIDR routes not propagated after node addition`,
      },
      {
        question: 'What is the difference between VLAN and VXLAN and when would you choose one over the other in a data center design?',
        answer: `## VLAN vs VXLAN Comparison

## VLAN (802.1Q)

- Layer 2 segmentation within a single broadcast domain
- 12-bit ID: maximum 4094 segments
- No encapsulation overhead
- Requires Layer 2 adjacency — all switches must participate
- Simple to configure and debug
- Limited to Layer 2 topology (STP, no ECMP)

## VXLAN

- Layer 2 overlay over Layer 3 underlay
- 24-bit VNI: 16 million segments
- 50-byte encapsulation overhead
- Works across any routed underlay (IP fabric, Internet)
- Requires VTEP implementation (hardware or software)
- Enables ECMP in underlay with Layer 3 fabrics

## When to Choose VLAN

- Small to medium enterprise networks (under 1000 servers)
- Single-site deployments where 4094 segments is sufficient
- Simple segmentation needs without multi-tenancy at scale
- Environments with Layer 2-dependent applications (clustering, PXE boot)

## When to Choose VXLAN

- Multi-tenant environments (cloud provider, large enterprise)
- Data centers spanning multiple physical sites or availability zones
- Kubernetes or containerized workloads needing overlay networking
- Modern Clos/spine-leaf fabrics using BGP EVPN
- Any environment requiring more than 4094 network segments

## Modern Best Practice

Modern data centers use a combination: a Layer 3 IP underlay (BGP between spine and leaf switches) with VXLAN overlay and EVPN control plane. This provides ECMP in the underlay, eliminates STP, and allows VM and container mobility without Layer 2 stretching.`,
      },
    ],
    references: [
      'https://tools.ietf.org/html/rfc7348',
      'https://docs.kernel.org/networking/vxlan.html',
      'https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip',
    ],
    quickFire: [
      { q: 'What is a VLAN?', a: 'Virtual LAN -- a logical Layer 2 network segment created by tagging Ethernet frames with an 802.1Q VLAN ID (12-bit, up to 4094 VLANs). Isolates broadcast domains on shared physical switches.' },
      { q: 'What is 802.1Q tagging?', a: 'A 4-byte header inserted into Ethernet frames containing the VLAN ID (VID) and priority bits. Switches use it to forward frames only to ports in the same VLAN.' },
      { q: 'What is the difference between a trunk and access port?', a: 'An access port carries traffic for a single VLAN (untagged). A trunk port carries traffic for multiple VLANs (tagged with 802.1Q) between switches or to hypervisors.' },
      { q: 'What problem does VXLAN solve that VLANs cannot?', a: 'VLANs are limited to 4094 IDs and are Layer 2 -- they cannot span Layer 3 boundaries. VXLAN uses a 24-bit VNI (16M segments) and tunnels Layer 2 frames over UDP/IP, enabling overlay networks across routed fabrics.' },
      { q: 'What UDP port does VXLAN use?', a: 'UDP port 4789 (IANA assigned). VXLAN encapsulates Layer 2 frames in UDP packets that route over existing Layer 3 infrastructure.' },
      { q: 'What is a VTEP?', a: 'VXLAN Tunnel Endpoint -- the device (physical NIC, hypervisor vSwitch, or software bridge) that encapsulates/decapsulates VXLAN traffic. Each VTEP has an IP address on the underlay network.' },
      { q: 'How does Kubernetes use VXLAN?', a: 'CNI plugins like Flannel and Calico (in VXLAN mode) create a VXLAN overlay so pods on different nodes can communicate using pod CIDRs, with the node IPs as VTEP addresses on the underlay.' },
      { q: 'What is the overhead of VXLAN encapsulation?', a: '50 bytes per packet: 8-byte VXLAN header + 8-byte UDP + 20-byte outer IP + 14-byte outer Ethernet. Underlay MTU should be at least 1550 to avoid fragmentation of standard 1500-byte frames.' },
      { q: 'What is the difference between VXLAN and GENEVE?', a: 'GENEVE is a newer, more flexible tunnel protocol (used by AWS Nitro, OVN) with a variable-length header supporting arbitrary metadata. VXLAN has a fixed 8-byte header. Both use UDP.' },
    ],
  },
  {
    id: 'grpc-vs-rest',
    title: 'gRPC vs REST',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 6,
    description: 'Protocol Buffers vs JSON serialization, streaming modes (unary/server/client/bidirectional), HTTP/2 multiplexing, and choosing the right API style.',
    visualizations: [],
    introduction: `gRPC and REST are the two dominant API paradigms in modern distributed systems, and choosing between them has significant performance, developer experience, and operational implications. Understanding both deeply is expected at senior engineering levels at Google, Amazon, and Meta.

REST (Representational State Transfer) is an architectural style using HTTP/1.1 with JSON. It relies on standard HTTP verbs (GET, POST, PUT, DELETE, PATCH), stateless request-response patterns, and human-readable JSON payloads. REST's simplicity, browser compatibility, and universal tooling have made it the default for public-facing APIs.

gRPC is a high-performance RPC framework developed by Google, built on HTTP/2 and Protocol Buffers (protobuf). It uses a schema-first approach where services and messages are defined in .proto files, and code is generated for both client and server in dozens of languages. gRPC supports four communication patterns: unary (single request-response, like REST), server streaming (one request, multiple responses), client streaming (multiple requests, one response), and bidirectional streaming.

The performance difference is substantial in high-throughput scenarios. Protobuf serialization is 3-10x faster than JSON and produces payloads 2-5x smaller. HTTP/2 multiplexing eliminates head-of-line blocking and allows hundreds of concurrent requests over a single TCP connection. gRPC also supports flow control, header compression (HPACK), and built-in deadline propagation.

In production systems, gRPC is used for internal service-to-service communication (Google's internal Stubby protocol inspired gRPC), while REST or GraphQL is typically used for external APIs. Kubernetes uses gRPC for its API server communication with kubelets. Envoy proxy uses gRPC for its xDS configuration protocol.`,
    whenToUse: [
      'Designing high-throughput internal microservice APIs requiring low latency',
      'Building streaming APIs for real-time data feeds, logging pipelines, or chat systems',
      'Generating strongly-typed clients in multiple languages from a single contract',
      'Choosing between REST and gRPC for a new service in a polyglot microservices architecture',
      'Evaluating API gateway and service mesh configuration for gRPC traffic',
    ],
    keyConcepts: [
      { term: 'Protocol Buffers (protobuf)', definition: `A language-neutral, platform-neutral binary serialization format developed by Google. Messages are defined in .proto schema files and compiled to code. Protobuf uses field numbers instead of field names in serialized format, making it compact and backward-compatible. A 1KB JSON payload often serializes to 200-400 bytes in protobuf.` },
      { term: 'HTTP/2 Multiplexing', definition: `HTTP/2 allows multiple logical streams over a single TCP connection using a framing layer. Each gRPC call is a stream. This eliminates the head-of-line blocking of HTTP/1.1 where a slow response blocks subsequent requests on the same connection. HTTP/2 also compresses headers with HPACK, reducing overhead for repeated headers like authentication tokens.` },
      { term: 'gRPC Streaming Modes', definition: `Unary: single request, single response (equivalent to REST). Server streaming: client sends one request, server returns a stream of responses (e.g., log tailing). Client streaming: client sends a stream of requests, server returns one response (e.g., file upload). Bidirectional streaming: both sides send streams concurrently (e.g., real-time collaboration).` },
      { term: 'Deadlines and Cancellation', definition: `gRPC has built-in deadline propagation. A client sets a deadline on a call, and the deadline is propagated to downstream services via gRPC metadata. If the deadline expires, all downstream calls are cancelled. This prevents cascading failures caused by hung upstream requests — a critical feature for production reliability.` },
      { term: 'gRPC Transcoding', definition: `A technique to expose gRPC services via HTTP/JSON, typically using an API gateway (like Envoy or Google Cloud Endpoints) that translates REST requests to gRPC calls. Allows internal gRPC services to be consumed by HTTP clients without changing the service implementation. Defined via google.api.http annotations in .proto files.` },
    ],
    pitfalls: [
      'gRPC is not natively supported in browsers without grpc-web and a proxy layer. Assuming gRPC works directly in browser JavaScript will result in failure — browsers cannot access HTTP/2 trailers that gRPC relies on for status codes.',
      'Protobuf requires schema synchronization between clients and servers. Deploying a server with a new required field before updating clients will break existing clients. Always add new fields as optional and use field numbers carefully to maintain backward compatibility.',
      'gRPC load balancing is connection-level by default in most load balancers. Since all calls share one HTTP/2 connection, a single gRPC connection to one backend can carry all traffic. Requires client-side load balancing or an L7 proxy (Envoy, nginx) that understands gRPC framing.',
      'REST APIs with JSON have trivially readable payloads in tools like curl and browser devtools. gRPC binary payloads require grpcurl or specialized tools. This makes ad-hoc debugging significantly harder.',
    ],
    keyQuestions: [
      {
        question: 'When would you choose gRPC over REST for a new microservice, and what operational considerations does that choice introduce?',
        answer: `## Choosing gRPC vs REST

## Choose gRPC When

- High throughput internal service-to-service calls (thousands of RPS per connection)
- Streaming is a first-class requirement (log ingestion, real-time feeds)
- Polyglot environment needing strongly typed, generated clients in Go, Python, Java, etc.
- You need built-in deadline propagation across a call graph
- Payload size matters (IoT, mobile, high-frequency data)

## Choose REST When

- Public-facing API consumed by browsers or third-party clients
- Simple CRUD operations with infrequent calls
- Team unfamiliar with protobuf toolchain
- Caching at CDN/HTTP layer is important (gRPC caching is complex)
- Integration with existing REST ecosystems (OAuth, Swagger/OpenAPI)

## Operational Considerations for gRPC

\`\`\`bash
# Test a gRPC service without a generated client
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext -d '{"user_id": "123"}' localhost:50051 users.UserService/GetUser

# Debug gRPC traffic with envoy access logs
# gRPC status codes are in HTTP/2 trailers, not response bodies
# Look for grpc-status: 0 (OK) vs grpc-status: 13 (INTERNAL)

# Check gRPC health using standard protocol
grpcurl -plaintext localhost:50051 grpc.health.v1.Health/Check
\`\`\`

## Infrastructure Impact

- Load balancers must support L7 gRPC (HTTP/2): AWS ALB supports gRPC, classic ELB does not
- Service mesh (Istio/Linkerd) handles gRPC load balancing and observability natively
- Monitoring: gRPC status codes are separate from HTTP status codes. A gRPC error returns HTTP 200 with grpc-status trailer set to non-zero
- Distributed tracing: propagate trace context via gRPC metadata, not HTTP headers`,
      },
      {
        question: 'Explain how gRPC bidirectional streaming works and give a real-world use case where it is the right choice.',
        answer: `## Bidirectional Streaming in gRPC

In bidirectional streaming, both the client and server can send a stream of messages independently over the same connection. Neither side needs to wait for the other to finish. The stream is established with a single HTTP/2 connection and both sides write to their respective streams concurrently.

## Proto Definition

\`\`\`protobuf
service ChatService {
  rpc StreamChat(stream ChatMessage) returns (stream ChatMessage);
}

message ChatMessage {
  string user_id = 1;
  string content = 2;
  int64 timestamp = 3;
}
\`\`\`

## Server Implementation (Go)

\`\`\`go
func (s *server) StreamChat(stream pb.ChatService_StreamChatServer) error {
    for {
        msg, err := stream.Recv()
        if err == io.EOF {
            return nil
        }
        if err != nil {
            return err
        }
        response := &pb.ChatMessage{Content: "Echo: " + msg.Content}
        if err := stream.Send(response); err != nil {
            return err
        }
    }
}
\`\`\`

## Real-World Use Cases

- Real-time collaborative editing (Google Docs-style): client sends keystrokes, server sends changes from other users
- Live telemetry ingestion: client streams metrics, server sends alerting threshold updates
- Kubernetes watch API: kubectl watches resource changes via server streaming (one request, continuous stream of events)
- Online game state synchronization: player sends inputs, server sends world state updates

## When Bidirectional Streaming Beats Alternatives

Compared to WebSockets: gRPC streaming has built-in flow control, multiplexing, and typed schemas via protobuf. WebSockets are simpler for browser use but lack these features.

Compared to polling: bidirectional streaming eliminates polling overhead entirely, reducing latency from seconds to milliseconds and reducing server load dramatically.`,
      },
    ],
    references: [
      'https://grpc.io/docs/what-is-grpc/introduction/',
      'https://developers.google.com/protocol-buffers/docs/overview',
      'https://http2.github.io/',
      'https://grpc.io/docs/guides/deadlines/',
      'https://github.com/fullstorydev/grpcurl',
    ],
    quickFire: [
      { q: 'What transport protocol does gRPC use?', a: 'HTTP/2. This enables multiplexed streams, bidirectional streaming, header compression (HPACK), and low-latency persistent connections.' },
      { q: 'What serialization format does gRPC use by default?', a: 'Protocol Buffers (protobuf) -- a binary format that is 3-10x smaller and faster to serialize/deserialize than JSON.' },
      { q: 'What are the four gRPC communication patterns?', a: 'Unary (single request/response), server streaming (one request, stream of responses), client streaming (stream of requests, one response), bidirectional streaming (both sides stream simultaneously).' },
      { q: 'When would you choose gRPC over REST?', a: 'Internal microservice communication needing low latency, strong typing, or streaming. gRPC is ideal for polyglot services where protobuf generates typed clients in any language.' },
      { q: 'When would you choose REST over gRPC?', a: 'Public APIs, browser-facing endpoints (gRPC requires gRPC-Web proxy in browsers), or when human-readable JSON payloads and wide tooling support matter more than performance.' },
      { q: 'What is a .proto file?', a: 'The Interface Definition Language (IDL) file that defines gRPC services, RPC methods, and message types. Used to generate typed client and server stubs in any supported language.' },
      { q: 'What is gRPC deadlines and why are they important?', a: 'A deadline specifies how long a client will wait for a response. Without deadlines, slow RPCs accumulate, cascade into resource exhaustion, and cause system-wide slowdowns. Always set deadlines.' },
      { q: 'What tool can you use to call gRPC endpoints from the command line?', a: 'grpcurl -- the curl equivalent for gRPC. It uses server reflection or a .proto file to invoke methods: grpcurl -plaintext localhost:50051 my.Service/Method.' },
      { q: 'What is gRPC-Web?', a: 'A JavaScript client library that lets browsers call gRPC services via a proxy (e.g., Envoy) that translates between the browser\'s HTTP/1.1 fetch and the backend\'s HTTP/2 gRPC protocol.' },
    ],
  },
  {
    id: 'ospf-eigrp',
    title: 'OSPF & EIGRP',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 5,
    description: 'Link-state vs distance-vector algorithms, OSPF areas and DR/BDR election, EIGRP DUAL algorithm, and enterprise routing tradeoffs.',
    visualizations: [],
    introduction: `OSPF (Open Shortest Path First) and EIGRP (Enhanced Interior Gateway Routing Protocol) are the two dominant interior gateway protocols (IGPs) used within enterprise and service provider networks. While BGP handles inter-AS routing, IGPs handle routing within a single autonomous system.

OSPF is an open-standard link-state protocol defined in RFC 2328. Each router maintains a complete map of the network topology (the Link State Database or LSDB) and runs Dijkstra's SPF algorithm to compute the shortest path tree. OSPF is organized into areas — the backbone area 0 is required, with all other areas connecting to it. This hierarchy limits the size of the LSDB and reduces SPF computation overhead. OSPF is widely used in enterprise networks, service provider cores, and is the IGP of choice for large-scale deployments.

EIGRP is a Cisco-proprietary (later partially open-sourced) advanced distance-vector protocol. Unlike classical distance-vector protocols (like RIP) that simply share routing tables, EIGRP uses the DUAL (Diffusing Update Algorithm) to maintain loop-free paths and provides instant convergence using pre-computed feasible successor routes. EIGRP is unequal-cost load balancing capable and has lower overhead than OSPF in stable networks.

In cloud and SRE contexts, OSPF appears in on-premises enterprise networks, SD-WAN underlay routing, and sometimes within large VPN environments. EIGRP appears in Cisco-centric enterprise environments. Understanding convergence behavior, neighbor relationships, and failure recovery is critical when dealing with network outages and SRE incident response.`,
    whenToUse: [
      'Designing enterprise campus or branch office routing with OSPF multi-area hierarchy',
      'Troubleshooting convergence issues after a link failure in an enterprise network',
      'Evaluating IGP choices for an SD-WAN underlay or MPLS backbone',
      'Understanding how on-premises routing affects hybrid cloud failover behavior',
      'Responding to SRE incidents involving routing convergence delays',
    ],
    keyConcepts: [
      { term: 'Link-State vs Distance-Vector', definition: `Link-state protocols (OSPF, IS-IS) flood topology information to all routers. Each router builds a complete network map and computes its own shortest paths using SPF. Distance-vector protocols (RIP, EIGRP) share computed routing tables with neighbors. Distance-vector is simpler but slower to converge and more prone to loops.` },
      { term: 'OSPF DR/BDR Election', definition: `On multi-access networks (Ethernet segments with multiple routers), OSPF elects a Designated Router (DR) and Backup Designated Router (BDR) to reduce LSA flooding overhead. All other routers (DROther) form adjacencies only with DR and BDR, not with each other. DR is elected based on highest OSPF priority (default 1, range 0-255), then highest router ID. A priority of 0 disqualifies a router from DR/BDR election.` },
      { term: 'OSPF Areas', definition: `Area 0 (backbone) is required. All non-backbone areas must connect to area 0 (directly or via virtual link). Area Border Routers (ABRs) connect areas and summarize routes between them. Stub areas block external LSAs (Type 5). Totally stubby areas block both external and inter-area LSAs, receiving only a default route.` },
      { term: 'DUAL Algorithm (EIGRP)', definition: `DUAL computes loop-free paths by maintaining a Feasibility Condition: a neighbor's reported distance (RD) to a destination must be less than the local best distance (FD) to use it as a feasible successor. Feasible successors are pre-computed backup paths. When the primary path fails, EIGRP promotes a feasible successor instantly without running Bellman-Ford.` },
      { term: 'Administrative Distance', definition: `When multiple routing protocols provide routes to the same destination, the router uses Administrative Distance (AD) to choose between them. Lower AD wins. Directly connected: 0, Static: 1, EIGRP summary: 5, eBGP: 20, EIGRP internal: 90, OSPF: 110, IS-IS: 115, RIP: 120, iBGP: 200.` },
    ],
    pitfalls: [
      'OSPF requires all areas to connect to area 0. If a non-backbone area becomes disconnected from area 0, inter-area routing breaks. Virtual links can fix this but are complex and considered a workaround.',
      'OSPF neighbor adjacency will not form if there are mismatches in hello/dead timers, area ID, authentication, subnet mask, or MTU. The router will show neighbors in INIT or 2WAY state but never reach FULL state.',
      'EIGRP stuck-in-active (SIA) occurs when a router queries neighbors for a route and does not receive a reply within the active timer (default 3 minutes). This puts the route in SIA state and forces a neighbor reset, causing widespread route flaps. Often caused by slow WAN links or unresponsive routers.',
      'Redistributing routes between OSPF and EIGRP without careful metric and filtering configuration can cause routing loops and suboptimal paths. Always set explicit metrics and use route-maps with prefix-lists when redistributing between protocols.',
    ],
    keyQuestions: [
      {
        question: 'Describe the OSPF neighbor adjacency formation process and what causes routers to get stuck in each state.',
        answer: `## OSPF Neighbor State Machine

## States in Order

- Down: No hellos received from neighbor.
- Init: Hello received, but our router ID is not in the hello packet yet (one-way communication).
- 2-Way: Bidirectional communication established. DR/BDR election happens here. DROther routers stay in 2-Way with each other.
- ExStart: Master/slave relationship negotiated using DBD packets. Higher router ID becomes master.
- Exchange: Full DBD (Database Description) packets exchanged listing LSA headers.
- Loading: Router sends LSR (Link State Request) for missing LSAs, receives LSU (Link State Update).
- Full: LSDB synchronized. Adjacency is complete.

## Common Stuck States and Causes

\`\`\`bash
# Check OSPF neighbor state
show ip ospf neighbor

# Stuck in INIT: one-way hello — check if ACLs block OSPF multicast (224.0.0.5/224.0.0.6)
# Stuck in 2-WAY: this is normal for DROther pairs on multi-access segments
# Stuck in EXSTART: MTU mismatch (ip ospf mtu-ignore workaround), duplicate router IDs
# Stuck in EXCHANGE: MTU mismatch causing DBD packet drops
# Stuck in LOADING: corrupted LSA or database corruption
\`\`\`

## Verification Commands

\`\`\`bash
# Verify hello/dead timer match
show ip ospf interface GigabitEthernet0/0

# Check OSPF database
show ip ospf database

# Debug adjacency formation (use carefully in production)
debug ip ospf adj
\`\`\`

MTU mismatch is the most common production cause of OSPF not reaching FULL state. OSPF checks MTU during DBD exchange and will not proceed if MTUs differ.`,
      },
      {
        question: 'How does EIGRP achieve fast convergence compared to OSPF, and when would EIGRP converge faster or slower?',
        answer: `## EIGRP Convergence via DUAL

EIGRP pre-computes backup paths (feasible successors) that satisfy the Feasibility Condition. When the primary route (successor) fails, EIGRP immediately promotes the feasible successor without any query process.

## Instant Convergence Case

\`\`\`
Router A -> B (primary, FD = 100)
Router A -> C -> B (feasible successor, RD from C = 80 < FD 100, FC satisfied)
\`\`\`

When A-B link fails, A immediately installs A-C-B. Convergence is sub-second, faster than OSPF SPF recalculation.

## Query Process (Slow Case)

If no feasible successor exists, EIGRP goes Active for that route and queries all neighbors. Queries propagate outward until a router with a valid route responds. In large networks with many routers, this query process can take seconds and cause the stuck-in-active problem.

## OSPF Convergence

OSPF convergence involves: LSA flood, SPF trigger delay, SPF calculation, route install. With fast timers (hello 1s/dead 3s, SPF initial 0ms), OSPF can converge in under 1 second on modern hardware. BFD (Bidirectional Forwarding Detection) can detect failures in milliseconds regardless of routing protocol.

## Summary

- EIGRP with feasible successors: sub-second convergence, often faster than OSPF
- EIGRP without feasible successors: query process, potentially slower than OSPF
- OSPF with BFD: consistent sub-second convergence regardless of topology
- Both protocols benefit significantly from BFD for fast failure detection`,
      },
    ],
    references: [
      'https://tools.ietf.org/html/rfc2328',
      'https://tools.ietf.org/html/rfc7868',
      'https://www.cisco.com/c/en/us/support/docs/ip/enhanced-interior-gateway-routing-protocol-eigrp/16406-eigrp-toc.html',
    ],
    quickFire: [
      { q: 'What OSI layer does OSPF operate at?', a: 'Layer 3 (Network). OSPF uses IP protocol number 89 and operates entirely within the IP layer.' },
      { q: 'What algorithm does OSPF run to compute shortest paths?', a: "Dijkstra's SPF (Shortest Path First) algorithm, run locally on each router's Link State Database." },
      { q: 'Why must all OSPF areas connect to Area 0?', a: 'Area 0 is the backbone. Inter-area routing transits the backbone to prevent routing loops between non-backbone areas.' },
      { q: 'What is the purpose of DR and BDR election on an Ethernet segment?', a: 'To reduce LSA flooding overhead. DROther routers only form adjacencies with DR/BDR, not with each other.' },
      { q: 'What is the EIGRP Feasibility Condition?', a: "A neighbor's Reported Distance must be strictly less than the local Feasible Distance -- guaranteeing the path is loop-free." },
      { q: 'What causes EIGRP Stuck-in-Active?', a: 'A router queries neighbors for a route but receives no reply within the active timer (default 3 min), forcing a neighbor reset.' },
      { q: 'What are the Administrative Distances for OSPF and EIGRP internal routes?', a: 'OSPF is 110; EIGRP internal is 90. Lower AD wins when both protocols advertise the same destination.' },
      { q: 'What OSPF neighbor state indicates an MTU mismatch?', a: 'Routers get stuck in EXSTART or EXCHANGE because DBD packets exceed the MTU and are dropped.' },
      { q: 'How does EIGRP converge faster than OSPF when a feasible successor exists?', a: 'EIGRP instantly promotes the pre-computed feasible successor without querying neighbors or running SPF -- sub-second convergence.' },
      { q: 'What does BFD add on top of routing protocol hello timers?', a: 'BFD detects link failures in milliseconds regardless of hello intervals, allowing OSPF or EIGRP to trigger immediate reconvergence.' },
    ],
  },
  {
    id: 'sd-wan',
    title: 'SD-WAN',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 4,
    description: 'Underlay vs overlay separation, intelligent path selection, WAN optimization, and SD-WAN vendor landscape (Cisco Viptela, VMware, Palo Alto).',
    visualizations: [],
    introduction: `SD-WAN (Software-Defined Wide Area Network) decouples network control from physical hardware, enabling centralized management and intelligent traffic routing across multiple WAN transport links (MPLS, broadband internet, LTE/5G). It emerged as enterprises sought to reduce expensive MPLS costs while maintaining application performance and security.

Traditional WAN relied on static routing with MPLS circuits providing guaranteed QoS but at high cost and with slow provisioning lead times (weeks to months). SD-WAN introduces a software overlay that monitors all available transport links in real time and routes application traffic based on policy, measured performance metrics (latency, jitter, packet loss), and application identity.

The architecture separates the underlay (physical transport connections — MPLS, internet, LTE) from the overlay (encrypted tunnels forming a virtual network across all underlay paths). The SD-WAN controller (control plane) pushes policies to edge devices. Edge devices (vEdge, vSmart in Viptela) make local forwarding decisions based on current link quality measurements.

Key capabilities include application-aware routing (recognizing Salesforce, Office 365, Zoom by deep packet inspection), zero-touch provisioning (devices phone home to controller and self-configure), centralized security policy, and direct cloud breakout (sending cloud-destined traffic directly to internet rather than backhauling to data center).

In cloud/SRE contexts, SD-WAN is often the connectivity method used by enterprise branch offices connecting to AWS or Azure via public internet tunnels, with SD-WAN handling failover between MPLS and broadband automatically. Understanding SD-WAN topology is essential when designing hybrid cloud architectures.`,
    whenToUse: [
      'Designing hybrid cloud connectivity for enterprise branch offices',
      'Replacing expensive MPLS circuits with broadband internet plus SD-WAN',
      'Implementing application-aware routing to optimize SaaS application performance',
      'Building redundant WAN paths with automatic failover between MPLS and internet',
      'Evaluating vendor solutions (Cisco Viptela, VMware SD-WAN, Palo Alto Prisma) for procurement',
    ],
    keyConcepts: [
      { term: 'Underlay vs Overlay', definition: `The underlay is the physical transport: MPLS circuits, broadband internet, LTE/5G. The overlay is the SD-WAN virtual network: encrypted IPsec tunnels built on top of all underlay transports. SD-WAN devices maintain tunnels over every underlay path simultaneously and measure quality on each. Application traffic is steered to the best-performing overlay path dynamically.` },
      { term: 'Application-Aware Routing', definition: `SD-WAN identifies application flows using DPI (Deep Packet Inspection), recognizing thousands of applications by signature (e.g., Zoom, Salesforce, Microsoft Teams). Policies define which applications use which paths. For example, real-time voice/video goes via MPLS if available, while bulk backup traffic uses cheaper broadband.` },
      { term: 'Zero-Touch Provisioning (ZTP)', definition: `SD-WAN edge devices ship to branch offices and self-configure by calling home to a cloud-hosted controller. The controller authenticates the device and pushes the site-specific configuration. This eliminates truck rolls and enables branch deployment without on-site networking expertise.` },
      { term: 'vSmart Controller', definition: `In Cisco Viptela architecture, the vSmart controller is the control plane, distributing routing and policy information to vEdge routers using OMP (Overlay Management Protocol). The vBond orchestrator handles ZTP and facilitates NAT traversal between edge devices. The vManage NMS provides centralized configuration and monitoring.` },
    ],
    pitfalls: [
      'SD-WAN over internet does not provide guaranteed QoS like MPLS. Real-time applications (voice, video conferencing) on pure internet SD-WAN links will experience quality degradation during internet congestion. MPLS or dedicated circuits remain necessary for latency-sensitive applications in many environments.',
      'Improper traffic classification leads to misrouting. If DPI signatures are outdated or encrypted traffic is not identified, high-priority applications may be sent over lower-quality links.',
      'SD-WAN controller is a critical single point of failure for policy management. Without local policy cache on edge devices, a controller outage can prevent new policies from being applied, though existing policies typically continue to function.',
      'Cloud integration requires careful planning. Direct cloud breakout bypasses data center security stacks. Ensuring firewall, DLP, and threat inspection for cloud-bound traffic requires either cloud-delivered security (SASE) or backhauling through security inspection.',
    ],
    keyQuestions: [
      {
        question: 'How does SD-WAN handle link failover, and what is the difference between active-active and active-passive WAN configurations?',
        answer: `## SD-WAN Link Failover

SD-WAN continuously measures performance metrics on all active tunnels using BFD (Bidirectional Forwarding Detection) or probe packets: latency, jitter, packet loss. When a link degrades beyond a configured threshold, traffic is immediately moved to a better-performing path.

## Active-Active Configuration

All WAN links carry traffic simultaneously. Traffic is distributed based on application policy and real-time quality metrics. A voice call may use MPLS while a file download uses broadband internet in parallel.

- Advantage: full bandwidth utilization, instant failover (traffic already on secondary link)
- Disadvantage: complexity in traffic classification, potential for asymmetric routing

## Active-Passive Configuration

Primary link carries all traffic. Secondary link is idle (or carries only backup traffic) until primary fails.

- Advantage: simpler, predictable path
- Disadvantage: wasted bandwidth on secondary, slightly slower failover (tunnel may need to be established)

## Failover Detection and Timing

\`\`\`
BFD failure detection: 300ms (3x 100ms intervals) typical
Traffic switchover: sub-second after BFD failure detection
Total failover: typically under 1 second for active-active, 1-3 seconds for active-passive
\`\`\`

## Viptela OMP Route Failover

In Cisco SD-WAN, OMP redistributes route changes from vSmart to all vEdge devices. When a tunnel goes down, vSmart updates OMP routes and all remote sites learn the new best path within seconds. Local site switching is BFD-driven and happens independently of OMP reconvergence.`,
      },
    ],
    references: [
      'https://www.cisco.com/c/en/us/solutions/enterprise-networks/sd-wan/what-is-sd-wan.html',
      'https://docs.vmware.com/en/VMware-SD-WAN/index.html',
      'https://www.paloaltonetworks.com/sase/sd-wan',
    ],
    quickFire: [
      { q: 'What does SD-WAN separate that traditional WAN does not?', a: 'The control plane (software policies) from the data plane (physical transport), enabling centralized management over diverse WAN links.' },
      { q: 'What are the three underlay transport types SD-WAN typically uses?', a: 'MPLS circuits, broadband internet (cable/DSL/fiber), and LTE/5G cellular.' },
      { q: 'What is Zero-Touch Provisioning in SD-WAN?', a: 'Edge devices phone home to a cloud controller at first boot, receive their configuration automatically -- no on-site engineer required.' },
      { q: 'How does SD-WAN choose which path to send application traffic on?', a: 'It continuously measures latency, jitter, and packet loss on all tunnels and steers each application to the path that meets its SLA policy.' },
      { q: 'What is the Cisco SD-WAN (Viptela) control plane component?', a: 'The vSmart controller distributes routing and policy via OMP (Overlay Management Protocol) to vEdge routers.' },
      { q: 'What is a key limitation of internet-based SD-WAN for real-time traffic?', a: 'Internet does not provide guaranteed QoS. Voice/video quality degrades during internet congestion even with intelligent path selection.' },
      { q: 'How fast does SD-WAN typically detect and switch away from a failed link?', a: 'BFD detects failure in about 300ms; traffic switchover adds another few hundred milliseconds -- total under 1 second for active-active.' },
      { q: 'What security concern arises when using SD-WAN direct cloud breakout?', a: 'Traffic bypasses the data center security stack (firewall, DLP). Cloud-delivered security (SASE) or inspection is required.' },
      { q: 'Name three major SD-WAN vendors.', a: 'Cisco (Viptela), VMware SD-WAN (formerly VeloCloud), and Palo Alto Networks Prisma SD-WAN.' },
      { q: 'What is SASE and how does it relate to SD-WAN?', a: 'SASE (Secure Access Service Edge) combines SD-WAN with cloud-delivered security (CASB, SWG, ZTNA) in one service from a single vendor.' },
    ],
  },
  {
    id: 'mpls',
    title: 'MPLS',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 4,
    description: 'Label switching, Label Switched Paths, LDP and RSVP-TE signaling, MPLS VPN services, and traffic engineering capabilities.',
    visualizations: [],
    introduction: `MPLS (Multiprotocol Label Switching) is a high-performance packet forwarding technology that uses short fixed-length labels instead of long IP address lookups to forward packets. Standardized by the IETF in the early 2000s, MPLS became the backbone technology for service provider networks and enterprise WAN services for over two decades.

In traditional IP routing, each router performs a full IP lookup in the routing table for every packet. MPLS replaces this with label-based forwarding: the ingress Label Edge Router (LER) assigns a label to an incoming packet, and all subsequent Label Switching Routers (LSRs) in the MPLS network forward the packet based solely on the label using a simple table lookup — much faster than full IP routing on older hardware.

Labels are 32-bit values inserted between the Layer 2 header and Layer 3 IP header (the "shim header"). Labels can be stacked, enabling VPN services where an outer label identifies the LSP (Label Switched Path) tunnel and an inner label identifies the VPN instance (VRF).

MPLS enables several critical services: Layer 3 VPNs (RFC 4364) where service providers deliver private IP connectivity between enterprise sites, Layer 2 VPNs (VPLS, VPWS) for transparent Ethernet services, and Traffic Engineering (MPLS-TE) where explicit paths are established using RSVP-TE to guarantee bandwidth and route around congestion.

While MPLS is mature technology being replaced at the edge by SD-WAN, it remains ubiquitous in service provider cores and is still offered as a premium enterprise WAN service. Understanding MPLS VPN architecture is directly applicable to understanding how AWS Direct Connect Virtual Interfaces and Transit VIFs work under the hood.`,
    whenToUse: [
      'Understanding service provider WAN services offered to enterprise customers',
      'Designing traffic engineering policies to route around congestion in backbone networks',
      'Configuring MPLS L3VPN for multi-site enterprise connectivity',
      'Troubleshooting traceroute behavior that skips hops inside an MPLS cloud',
      'Evaluating MPLS vs SD-WAN vs direct internet for WAN strategy',
    ],
    keyConcepts: [
      { term: 'Label Switching Router (LSR)', definition: `An MPLS router that forwards packets based on label lookup rather than IP routing table lookup. The ingress LER (Label Edge Router) pushes a label onto packets entering the MPLS network. Core LSRs swap labels. The egress LER pops the label and delivers the original IP packet to the destination.` },
      { term: 'LDP (Label Distribution Protocol)', definition: `The protocol used by MPLS routers to distribute label bindings for IP prefixes. Each router advertises a label for each prefix in its routing table to its LDP neighbors. LDP creates LSPs that follow the existing IGP routing topology. Simple but cannot engineer specific paths.` },
      { term: 'RSVP-TE (Resource Reservation Protocol - Traffic Engineering)', definition: `A signaling protocol that establishes explicit LSPs along administratively specified paths with reserved bandwidth. Used for MPLS traffic engineering. RSVP-TE enables bandwidth guarantees and explicit route constraints (must traverse specific routers, avoid specific links). Used in service provider cores for QoS guarantees.` },
      { term: 'MPLS L3VPN (RFC 4364)', definition: `The most common MPLS VPN service. Each enterprise VPN uses a VRF (Virtual Routing and Forwarding) instance at the PE (Provider Edge) router. Routes are distributed between PE routers using MP-BGP with VPNv4 address family. An outer label identifies the LSP to the remote PE; an inner label (VPN label) identifies the destination VRF. CE (Customer Edge) routers are unaware of MPLS.` },
    ],
    pitfalls: [
      'Traceroute through an MPLS cloud often shows only the ingress PE and egress PE, hiding all core LSR hops. This is because LSRs perform ICMP TTL-exceeded using their MPLS interface address which may not be reachable from the internet, or the ICMP response is generated at the egress LER only. This makes troubleshooting opaque without MPLS traceroute tools.',
      'LDP and IGP synchronization issues can cause black holes. If LDP labels are not yet distributed when IGP converges after a failure, packets are forwarded toward a destination but dropped because no MPLS label exists for the path. Requires LDP-IGP synchronization configuration.',
      'PHP (Penultimate Hop Popping) removes the outer MPLS label one hop before the egress LER. This is a performance optimization but means the egress LER receives unlabeled IP packets. If the egress LER needs the label for QoS or VPN lookup, explicit null must be configured instead of PHP.',
      'VRF route leaking between VPN customers on the same PE must be carefully controlled. Importing the wrong route targets can accidentally leak routes between customer VRFs, violating network isolation.',
    ],
    keyQuestions: [
      {
        question: 'Explain how MPLS L3VPN works end-to-end. How does a packet from a branch office reach another branch in the same VPN?',
        answer: `## MPLS L3VPN Packet Flow

## Architecture Components

- CE (Customer Edge): Customer router, speaks BGP or OSPF with PE, unaware of MPLS
- PE (Provider Edge): Provider router, maintains per-customer VRFs, runs MP-BGP with other PEs
- P (Provider Core): Core MPLS LSRs, only see outer labels, unaware of VPN content

## Control Plane (Route Distribution)

\`\`\`
1. CE-A advertises 10.1.1.0/24 to PE-A via eBGP or OSPF
2. PE-A imports the route into VRF "CustomerA" and assigns a VPN label (inner label, e.g., 24)
3. PE-A distributes the route via MP-BGP (VPNv4) to PE-B:
   Route Distinguisher: 65000:100 (makes prefix globally unique)
   Route Target: 65000:100 (export RT, determines which VRFs import the route)
   Next-hop: PE-A loopback IP
   Label: 24 (VPN label)
4. PE-B checks VRF "CustomerA" import RTs, imports the route into its VRF
\`\`\`

## Data Plane (Packet Forwarding)

\`\`\`
CE-B sends packet destined for 10.1.1.1
  -> PE-B looks up 10.1.1.1 in VRF "CustomerA" -> next-hop PE-A, VPN label 24
  -> PE-B pushes: [LSP label to PE-A | VPN label 24] + IP packet
  -> Core P routers swap outer LSP label (pure label switching)
  -> Penultimate P router pops outer label (PHP)
  -> PE-A receives packet with VPN label 24 -> identifies VRF "CustomerA"
  -> PE-A pops VPN label, routes IP packet to CE-A
\`\`\`

The CE routers never see MPLS labels. The entire MPLS VPN is transparent to the customer.`,
      },
    ],
    references: [
      'https://tools.ietf.org/html/rfc3031',
      'https://tools.ietf.org/html/rfc4364',
    ],
    quickFire: [
      { q: 'What does MPLS replace for packet forwarding in the core?', a: 'It replaces per-hop IP routing table lookups with simple fixed-length label swaps -- much faster on older hardware.' },
      { q: 'Where in the packet is the MPLS label inserted?', a: 'Between the Layer 2 (Ethernet) header and the Layer 3 (IP) header -- called the shim header.' },
      { q: 'What protocol distributes labels in a basic MPLS network?', a: 'LDP (Label Distribution Protocol) distributes labels for IP prefixes following the existing IGP topology.' },
      { q: 'What is a Label Switched Path (LSP)?', a: 'A predetermined path through the MPLS network along which packets with a specific label are forwarded from ingress to egress LER.' },
      { q: 'What is Penultimate Hop Popping (PHP)?', a: 'The second-to-last router pops the MPLS label before forwarding to the egress LER, saving the egress an extra lookup operation.' },
      { q: 'How does an MPLS L3VPN (RFC 4364) isolate customer traffic?', a: 'Each customer VPN uses a separate VRF at PE routers. An outer LSP label routes to the remote PE; an inner VPN label identifies the customer VRF.' },
      { q: 'What signaling protocol enables MPLS traffic engineering with bandwidth reservation?', a: 'RSVP-TE (Resource Reservation Protocol -- Traffic Engineering) establishes explicit LSPs with reserved bandwidth.' },
      { q: 'Why does traceroute often show only ingress and egress PE hops through MPLS?', a: 'Core LSRs may not generate ICMP TTL-exceeded responses visible from the internet, making inner hops appear invisible.' },
      { q: 'What is an MPLS VRF?', a: 'A Virtual Routing and Forwarding instance -- a separate routing table on the PE router for each customer, providing L3 isolation.' },
      { q: 'How is SD-WAN replacing MPLS at the enterprise edge?', a: 'SD-WAN runs on cheaper internet circuits with intelligent path selection, eliminating the need for expensive MPLS circuits for most enterprise traffic.' },
    ],
  },
  {
    id: 'vpc-peering',
    title: 'VPC Peering',
    icon: 'cloud',
    color: '#f59e0b',
    questions: 5,
    description: 'Transitive peering limitations, non-overlapping CIDR requirement, inter-region peering, and routing table configuration.',
    visualizations: [],
    introduction: `VPC Peering is an AWS networking feature that creates a direct, private network connection between two VPCs, enabling instances in either VPC to communicate as if they were on the same network. Traffic remains on the AWS backbone and never traverses the public internet, providing low latency and high bandwidth.

Peering connections can be established between VPCs in the same account, between different AWS accounts, or across AWS regions (inter-region VPC peering). The connection is established through a request-accept workflow: the requester VPC sends a peering request, and the accepter VPC owner approves it. Once active, both sides must update their route tables to direct traffic destined for the peer CIDR through the peering connection.

The most critical limitation of VPC peering is that it is non-transitive. If VPC A is peered with VPC B, and VPC B is peered with VPC C, traffic from VPC A cannot reach VPC C through VPC B. A separate peering connection between A and C is required. This fundamental constraint means that connecting N VPCs requires N*(N-1)/2 peering connections — a scaling problem that Transit Gateway was designed to solve.

VPC peering also requires non-overlapping CIDR blocks. VPCs with overlapping IP ranges cannot be peered, which makes CIDR planning a critical architectural consideration, especially for organizations that did not design CIDR spaces with future growth and connectivity in mind.

In production architectures, VPC peering is appropriate for small numbers of VPCs with specific connectivity needs (e.g., a shared services VPC peered with each application VPC), while Transit Gateway is preferred for hub-and-spoke architectures connecting many VPCs.`,
    whenToUse: [
      'Connecting a small number of VPCs (fewer than 10) with specific bilateral connectivity needs',
      'Providing access from application VPCs to a shared services VPC (DNS, monitoring, tooling)',
      'Enabling cross-account access without exposing services to the internet',
      'Low-cost option when Transit Gateway pricing is a concern for simple use cases',
      'Inter-region data replication between VPCs in different AWS regions',
    ],
    keyConcepts: [
      { term: 'Non-Transitive Peering', definition: `VPC peering is strictly point-to-point. Traffic cannot flow through a VPC to reach another VPC via a chain of peering connections. If A-B and B-C are peered, A cannot reach C through B. This is by design for security isolation. The only workarounds are direct peering (A-C) or using Transit Gateway.` },
      { term: 'Non-Overlapping CIDR Requirement', definition: `Two VPCs cannot be peered if their IPv4 CIDR blocks overlap. AWS will reject the peering request. This requires careful IP address planning across accounts and regions. Many organizations use RFC 1918 space (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) exhaustion plans to ensure unique CIDRs for every VPC.` },
      { term: 'Route Table Configuration', definition: `After accepting a peering connection, administrators must manually add routes in both VPCs' route tables. Each route specifies the peer VPC's CIDR as the destination and the peering connection ID as the target. Without these routes, traffic will not flow even though the peering is active.` },
      { term: 'Inter-Region Peering', definition: `VPC peering supports connections across AWS regions. Traffic is encrypted and uses AWS backbone infrastructure, not the public internet. Inter-region peering incurs data transfer charges (typically $0.01-0.02 per GB depending on regions). DNS resolution for private hostnames across regions requires specific DNS resolver configuration.` },
      { term: 'Security Group Cross-References', definition: `In VPC peering within the same region and account, security groups can reference the peer VPC's security group IDs as sources/destinations. This provides dynamic, identity-based access control rather than CIDR-based rules. Cross-account security group references require explicit sharing configuration.` },
    ],
    pitfalls: [
      'Forgetting to update route tables on both sides of the peering connection is the most common operational mistake. The peering connection shows as Active but traffic does not flow because routes are missing.',
      'CIDR overlap discovery after deployment is a painful situation. Organizations that use the same CIDR ranges (e.g., 10.0.0.0/16) in every VPC cannot peer them without re-CIDRing one side, which requires re-deploying infrastructure.',
      'Security group rules still apply across peered VPCs. A peering connection does not bypass security groups. Instances must explicitly allow traffic from the peer VPC CIDR in their security groups.',
      'DNS hostnames for private IPs do not resolve across peering boundaries by default. The DNS Resolution and DNS Hostnames options must be enabled on both VPCs and the peering connection for private DNS to work across peers.',
    ],
    keyQuestions: [
      {
        question: 'What are the limitations of VPC peering and when would you use Transit Gateway instead?',
        answer: `## VPC Peering Limitations

## Non-Transitivity

The core limitation: peering A-B and B-C does not allow A-C traffic. With N VPCs requiring full mesh, you need N*(N-1)/2 peering connections.

- 5 VPCs: 10 peerings
- 10 VPCs: 45 peerings
- 20 VPCs: 190 peerings

This is unmanageable at scale.

## Other Limitations

- Overlapping CIDRs: cannot peer VPCs with overlapping IP ranges
- No route aggregation: must add specific routes for each peer CIDR in every route table
- No centralized routing policy: each peering is independently managed
- Edge-to-edge routing not supported: cannot route through a VPC to reach VPN, Direct Connect, or internet gateway on the other side

## When to Use VPC Peering

\`\`\`bash
# Check existing peering connections
aws ec2 describe-vpc-peering-connections \
  --filters "Name=status-code,Values=active"

# Check route tables for peering routes
aws ec2 describe-route-tables \
  --filters "Name=route.gateway-id,Values=pcx-xxxxxxxx"
\`\`\`

Use peering for:
- Fewer than 10 VPCs with specific bilateral connectivity needs
- Cost-sensitive environments (no TGW attachment fees per VPC per hour)
- Simple shared services VPC (monitoring, DNS) accessed from many app VPCs

## When to Use Transit Gateway

- More than 10 VPCs needing connectivity
- Centralized routing policy and inspection required
- VPN or Direct Connect needs to be shared across multiple VPCs
- Multi-account hub-and-spoke architecture (AWS Organizations)
- Need to connect VPCs with overlapping CIDRs (TGW with static routing + NAT)`,
      },
      {
        question: 'Walk through the complete steps to establish a VPC peering connection between two accounts, including all configurations required for traffic to flow.',
        answer: `## Cross-Account VPC Peering Setup

## Step 1: Gather VPC Information

\`\`\`bash
# Account A - get VPC ID and CIDR
aws ec2 describe-vpcs --vpc-ids vpc-aaaaaa \
  --query 'Vpcs[0].{VpcId:VpcId,Cidr:CidrBlock}'

# Account B - same
aws ec2 describe-vpcs --vpc-ids vpc-bbbbbb \
  --query 'Vpcs[0].{VpcId:VpcId,Cidr:CidrBlock}'
\`\`\`

## Step 2: Create Peering Request (Account A)

\`\`\`bash
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-aaaaaa \
  --peer-vpc-id vpc-bbbbbb \
  --peer-owner-id 123456789012 \
  --peer-region us-east-1
\`\`\`

## Step 3: Accept Peering Request (Account B)

\`\`\`bash
aws ec2 describe-vpc-peering-connections \
  --filters "Name=status-code,Values=pending-acceptance"

aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-xxxxxxxx
\`\`\`

## Step 4: Add Routes (Both Accounts)

\`\`\`bash
# Account A: route to VPC B via peering
aws ec2 create-route \
  --route-table-id rtb-aaaa \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id pcx-xxxxxxxx

# Account B: route to VPC A via peering
aws ec2 create-route \
  --route-table-id rtb-bbbb \
  --destination-cidr-block 10.0.0.0/16 \
  --vpc-peering-connection-id pcx-xxxxxxxx
\`\`\`

## Step 5: Update Security Groups (Both Accounts)

\`\`\`bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-aaaa \
  --protocol tcp \
  --port 443 \
  --cidr 10.1.0.0/16
\`\`\`

## Step 6: Enable DNS Resolution

\`\`\`bash
aws ec2 modify-vpc-peering-connection-options \
  --vpc-peering-connection-id pcx-xxxxxxxx \
  --requester-peering-connection-options AllowDnsResolutionFromRemoteVpc=true \
  --accepter-peering-connection-options AllowDnsResolutionFromRemoteVpc=true
\`\`\``,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html',
      'https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html',
    ],
    quickFire: [
      { q: 'What is the most critical limitation of VPC peering?', a: 'Peering is non-transitive. If A-B and B-C are peered, A cannot reach C through B -- a direct A-C peering is required.' },
      { q: 'Can you peer two VPCs with overlapping CIDR blocks?', a: 'No. VPCs must have non-overlapping IPv4 CIDR ranges. AWS rejects the peering request if CIDRs overlap.' },
      { q: 'After accepting a peering connection, what must you still configure?', a: 'Route tables on both sides -- add routes pointing the peer VPC CIDR to the peering connection ID.' },
      { q: 'Does VPC peering traffic traverse the public internet?', a: 'No. Traffic uses the AWS backbone network and never touches the internet, even for inter-region peering.' },
      { q: 'How many peering connections does a full mesh of 10 VPCs require?', a: 'N*(N-1)/2 = 45 peering connections -- illustrating why Transit Gateway is preferred at scale.' },
      { q: 'Does private DNS resolution work automatically across a peering connection?', a: 'No. You must enable DNS Resolution and DNS Hostnames on both VPCs and the peering connection.' },
      { q: 'Can you reference a security group from a peered VPC in the same account?', a: 'Yes, within the same region -- you can use the peer VPC security group ID as a source/destination in rules.' },
      { q: 'What is the data transfer cost for inter-region VPC peering?', a: 'Approximately $0.01-0.02 per GB depending on the region pair -- unlike intra-region peering which is free.' },
      { q: 'When is VPC peering preferable to Transit Gateway?', a: 'For fewer than ~10 VPCs with simple bilateral connectivity, or when avoiding TGW per-attachment hourly costs matters.' },
      { q: 'Can traffic from a peered VPC reach your VPN or internet gateway?', a: 'No. Edge-to-edge routing is not supported -- a peered VPC cannot route through your VPC to reach your VPN or internet gateway.' },
    ],
  },
  {
    id: 'transit-gateway',
    title: 'Transit Gateway',
    icon: 'cloud',
    color: '#f59e0b',
    questions: 5,
    description: 'Hub-and-spoke topology for VPCs, centralized routing tables, TGW peering across regions, and comparison with VPC peering.',
    visualizations: [],
    introduction: `AWS Transit Gateway (TGW) is a regional network transit hub that enables customers to connect VPCs, VPNs, and Direct Connect connections through a single gateway, implementing a hub-and-spoke network topology at scale. Launched in 2018, it solved the fundamental scalability problem of VPC peering's non-transitive, full-mesh requirement.

Every VPC, VPN, or Direct Connect attachment connects to the Transit Gateway, and the TGW routes traffic between all connected networks according to its route tables. A single TGW supports up to 5,000 VPC attachments, making it suitable for large enterprise multi-account AWS environments managed via AWS Organizations.

TGW uses a routing table model distinct from VPC route tables. Each TGW has one or more route tables. Each attachment is associated with a route table (for inbound route lookup) and can propagate its CIDR to one or more route tables. This enables sophisticated network segmentation: for example, a production route table that allows VPC-to-VPC communication, a development route table that only allows access to shared services, and a shared services route table accessible from all environments.

Transit Gateway peering extends this capability across AWS regions: two TGWs in different regions can be peered, creating a global network fabric. Cross-region TGW peering uses static routes (no dynamic propagation) and traverses the AWS backbone.

For connectivity with on-premises networks, TGW integrates with Site-to-Site VPN (each VPN tunnel terminates on TGW rather than individual VGWs) and Direct Connect Gateway (DXGW attaches to TGW via Transit VIF). This centralization means all VPCs share a single Direct Connect connection, dramatically reducing costs compared to per-VPC VGW configuration.`,
    whenToUse: [
      'Connecting more than 10 VPCs with any-to-any or selective connectivity requirements',
      'Centralizing VPN and Direct Connect connectivity shared across multiple VPCs',
      'Implementing network segmentation between environments (prod/dev/shared services) at scale',
      'Building a global network spanning multiple AWS regions with TGW peering',
      'Centralized traffic inspection via a firewall VPC in a security hub-and-spoke architecture',
    ],
    keyConcepts: [
      { term: 'TGW Attachment', definition: `The connection between a resource and the Transit Gateway. Attachment types include VPC attachments (one per VPC, choosing subnets in each AZ), VPN attachments (Site-to-Site VPN tunnels), Direct Connect Gateway attachments (via Transit VIF), TGW Peering attachments (cross-region), and Appliance Mode attachments (for stateful inspection).` },
      { term: 'TGW Route Tables', definition: `TGW has its own route tables separate from VPC route tables. Each attachment is associated with a TGW route table for route lookups. Routes can be static (manually added) or dynamic (propagated from attachments). VPC CIDRs are auto-propagated when propagation is enabled. Multiple route tables enable network segmentation.` },
      { term: 'Route Propagation', definition: `When propagation is enabled for an attachment to a route table, the attachment automatically advertises its CIDR blocks to that route table. VPC attachments propagate their VPC CIDR. VPN attachments propagate BGP-learned routes from on-premises. Disabling propagation requires manual static routes and is used for isolation policies.` },
      { term: 'TGW Peering', definition: `Two TGWs in different AWS regions (or different accounts) can be peered. Unlike VPC peering, TGW peering does not use dynamic route propagation — all routes across the peering must be configured as static routes in the respective TGW route tables. This is a key operational difference from intra-region behavior.` },
      { term: 'Appliance Mode', definition: `For stateful firewall appliances in a centralized inspection VPC, all traffic flows from a specific source VPC must use the same Availability Zone path through the firewall (to maintain flow state). Appliance mode overrides TGW's default per-flow ECMP load balancing to ensure symmetric routing through the firewall.` },
    ],
    pitfalls: [
      'TGW does not automatically route between all attached VPCs. You must explicitly enable route propagation or add static routes. A common mistake is creating attachments without configuring the route tables, resulting in no connectivity between VPCs.',
      'Overlapping CIDRs across attached VPCs cause routing conflicts. Unlike VPC peering (which prevents you from connecting overlapping VPCs), TGW will accept the attachment but routing will be nondeterministic. CIDR planning is still essential.',
      'Cross-region TGW peering requires static routes on both sides. There is no dynamic route propagation across TGW peering connections. Missing a static route is a common cause of cross-region connectivity failures.',
      'TGW pricing is based on attachment-hours plus data processing. For VPCs with low traffic and simple connectivity needs, TGW can be more expensive than VPC peering. Analyze traffic patterns before choosing.',
    ],
    keyQuestions: [
      {
        question: 'Design a Transit Gateway architecture for a company with 50 VPCs across 3 environments (production, staging, development) where prod cannot communicate with dev, but all environments can reach a shared services VPC.',
        answer: `## Multi-Environment TGW Design

## Architecture

Create one TGW with separate route tables per environment:

- Production RT: routes to all prod VPCs + shared services VPC
- Staging RT: routes to all staging VPCs + shared services VPC
- Development RT: routes to all dev VPCs + shared services VPC
- Shared Services RT: routes to all VPCs (or specific CIDRs only)

## Route Table Configuration

\`\`\`bash
# Create separate route tables for each environment
aws ec2 create-transit-gateway-route-table \
  --transit-gateway-id tgw-xxxxxxxxx \
  --tag-specifications 'ResourceType=transit-gateway-route-table,Tags=[{Key=Name,Value=production-rt}]'

# Associate prod VPC attachments with production-rt
aws ec2 associate-transit-gateway-route-table \
  --transit-gateway-route-table-id tgw-rtb-prod \
  --transit-gateway-attachment-id tgw-attach-prod-vpc1

# Enable propagation from prod VPCs to production-rt
aws ec2 enable-transit-gateway-route-table-propagation \
  --transit-gateway-route-table-id tgw-rtb-prod \
  --transit-gateway-attachment-id tgw-attach-prod-vpc1

# Add static route to shared services from production-rt
aws ec2 create-transit-gateway-route \
  --transit-gateway-route-table-id tgw-rtb-prod \
  --destination-cidr-block 10.255.0.0/16 \
  --transit-gateway-attachment-id tgw-attach-shared-svc
\`\`\`

## Isolation Enforcement

Prod VPCs are associated with production-rt. Production-rt only contains routes to prod VPCs and shared services. Dev routes are not propagated to or statically added to production-rt, so prod instances cannot reach dev VPCs at the network layer even if security groups allowed it.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html',
      'https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html',
      'https://aws.amazon.com/transit-gateway/pricing/',
    ],
    quickFire: [
      { q: 'What networking problem does Transit Gateway primarily solve?', a: "VPC peering's non-transitive, full-mesh scaling problem. TGW is a regional hub connecting up to 5,000 VPCs." },
      { q: 'What are the four main attachment types for Transit Gateway?', a: 'VPC attachments, Site-to-Site VPN attachments, Direct Connect Gateway (Transit VIF), and TGW peering (cross-region).' },
      { q: 'Does TGW automatically route between all attached VPCs?', a: 'No. You must enable route propagation or add static routes in TGW route tables -- attachments without routes have no connectivity.' },
      { q: 'How does TGW peering differ from intra-region TGW behavior?', a: 'Cross-region TGW peering requires all routes to be manually configured as static routes -- no dynamic propagation across the peering.' },
      { q: 'What is Appliance Mode and when is it needed?', a: 'It forces all traffic from a source VPC through the same AZ path in TGW, ensuring symmetric routing through stateful firewall appliances.' },
      { q: 'How do you implement environment isolation (prod cannot reach dev) with TGW?', a: 'Create separate TGW route tables per environment. Associate each VPC with its environment RT and only propagate shared-services routes into each RT.' },
      { q: 'What is the pricing model for Transit Gateway?', a: 'Per-attachment-hour charge plus a per-GB data processing fee. This can exceed VPC peering costs for low-traffic simple topologies.' },
      { q: 'Can overlapping VPC CIDRs be attached to the same TGW?', a: 'TGW accepts the attachment but routing becomes nondeterministic. CIDR planning is still essential.' },
      { q: 'How does Direct Connect connect to Transit Gateway?', a: 'Via a Transit VIF on the Direct Connect connection terminating on a Direct Connect Gateway, which attaches to the TGW.' },
      { q: 'What is the maximum number of VPC attachments per Transit Gateway?', a: 'Up to 5,000 VPC attachments per TGW.' },
    ],
  },
  {
    id: 'aws-privatelink',
    title: 'AWS PrivateLink',
    icon: 'cloud',
    color: '#f59e0b',
    questions: 5,
    description: 'Interface VPC endpoints, NLB-backed endpoint services, private connectivity without internet traversal, and endpoint service sharing.',
    visualizations: [],
    introduction: `AWS PrivateLink provides private connectivity between VPCs, AWS services, and on-premises applications without exposing traffic to the public internet. It enables service providers (whether AWS itself or third-party SaaS vendors) to offer services that consumers can access privately from within their own VPCs.

PrivateLink works through two complementary constructs: VPC Endpoints (on the consumer side) and Endpoint Services (on the provider side). An Interface VPC Endpoint creates one or more Elastic Network Interfaces (ENIs) with private IP addresses in your VPC subnets. Traffic to the service is routed through these ENIs, never leaving the AWS network. This is fundamentally different from internet-based access or even VPC peering — the service's actual infrastructure can be in a completely separate VPC or account.

The provider side uses a Network Load Balancer (NLB) as the front door to an Endpoint Service. The NLB receives traffic from consumers' ENIs and forwards to the actual service targets (EC2 instances, ECS tasks, Lambda functions via ALB). AWS manages the cross-VPC networking transparently.

AWS uses PrivateLink for its own services: S3 Interface Endpoints, DynamoDB Interface Endpoints, SSM, Secrets Manager, ECR, and dozens more all support private connectivity via PrivateLink. This allows EC2 instances in private subnets with no internet gateway to still access AWS APIs securely.

Third-party SaaS vendors (Datadog, Snowflake, New Relic) offer their services via PrivateLink, allowing enterprise customers to consume SaaS without traffic leaving their private network perimeter — critical for compliance-sensitive industries like healthcare and finance.`,
    whenToUse: [
      'Accessing AWS services (S3, SSM, ECR) from private subnets without NAT Gateway',
      'Consuming third-party SaaS (Datadog, Snowflake) without internet exposure for compliance',
      'Exposing internal microservices to other teams or accounts without VPC peering',
      'Reducing data transfer costs for high-volume AWS API calls (PrivateLink vs NAT Gateway pricing)',
      'Meeting regulatory requirements that prohibit any internet-traversing traffic for sensitive data',
    ],
    keyConcepts: [
      { term: 'Interface VPC Endpoint', definition: `A PrivateLink endpoint that creates ENIs with private IPs in your VPC subnets. Traffic to the endpoint service is routed through these ENIs using AWS-internal networking. Supports security groups for access control. DNS entries are created automatically so that the service regional hostname resolves to the private ENI IP.` },
      { term: 'Gateway Endpoint', definition: `An older endpoint type for S3 and DynamoDB only. Unlike Interface Endpoints, Gateway Endpoints work by adding entries to your VPC route table pointing to the endpoint, not by creating ENIs. Gateway Endpoints have no per-hour charge (unlike Interface Endpoints) but do not support private DNS or cross-region access.` },
      { term: 'Endpoint Service', definition: `The provider-side PrivateLink construct. Built on top of an NLB in the provider's VPC. The provider configures which AWS accounts or principals can create endpoints to the service. Once a consumer creates an interface endpoint, the provider can accept or auto-accept the connection request.` },
      { term: 'Private DNS', definition: `When Private DNS is enabled on an Interface Endpoint, AWS creates a private hosted zone in Route 53 that overrides the public DNS hostname for the service within your VPC. For example, s3.us-east-1.amazonaws.com resolves to the ENI private IP instead of the public S3 endpoint. This allows existing code to use PrivateLink without DNS changes.` },
      { term: 'Endpoint Policies', definition: `Resource-based policies attached to VPC endpoints that restrict which actions and resources can be accessed through the endpoint. For example, an S3 endpoint policy can restrict access to specific S3 buckets, preventing use of the private endpoint to access other accounts' buckets.` },
    ],
    pitfalls: [
      'Interface Endpoints are AZ-specific ENIs. For high availability, you must create endpoints in multiple AZs. An endpoint in a single AZ creates a single point of failure. Use the zonal DNS names (or the regional name with private DNS enabled) to distribute traffic.',
      'PrivateLink does not support transitive routing. An endpoint in VPC A cannot be reached from VPC B via VPC peering. Each consumer VPC that needs private access must create its own VPC endpoint.',
      'Endpoint policies are separate from the service IAM policies. A permissive endpoint policy does not bypass IAM. Both must allow the action. Conversely, a restrictive endpoint policy blocks access even if IAM allows it.',
      'DNS resolution must work correctly for Private DNS to function. If your VPC does not have DNS Support and DNS Hostnames enabled, Private DNS for interface endpoints will not work, and traffic may still route to public endpoints.',
    ],
    keyQuestions: [
      {
        question: 'How would you design private connectivity for an EC2 instance in a private subnet (no NAT Gateway, no internet gateway) to access S3, SSM Parameter Store, and ECR for container image pulls?',
        answer: `## Private Subnet AWS Service Access via PrivateLink

## Required Interface Endpoints

For an EC2 instance to work fully without internet access (especially for SSM and ECR):

\`\`\`bash
# SSM requires 3 endpoints
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxx \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ssm \
  --subnet-ids subnet-private-a subnet-private-b \
  --security-group-ids sg-endpoints

aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxx \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ssmmessages \
  --subnet-ids subnet-private-a subnet-private-b \
  --security-group-ids sg-endpoints

aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxx \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ec2messages \
  --subnet-ids subnet-private-a subnet-private-b \
  --security-group-ids sg-endpoints

# ECR endpoints (2 required: api + docker)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxx \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ecr.api \
  --subnet-ids subnet-private-a subnet-private-b \
  --security-group-ids sg-endpoints

aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxx \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ecr.dkr \
  --subnet-ids subnet-private-a subnet-private-b \
  --security-group-ids sg-endpoints

# S3 Gateway Endpoint (free, for ECR layer pulls from S3)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxxxxx \
  --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-private
\`\`\`

## Security Group for Endpoint ENIs

\`\`\`bash
# Allow HTTPS from VPC CIDR to endpoint ENIs
aws ec2 authorize-security-group-ingress \
  --group-id sg-endpoints \
  --protocol tcp \
  --port 443 \
  --cidr 10.0.0.0/16
\`\`\`

## Important Notes

- ECR image layers are stored in S3. ECR docker endpoint pulls metadata, but layer blobs come from S3. Both ECR and S3 endpoints are required.
- Private DNS must be enabled on each Interface Endpoint (default: enabled)
- VPC must have enableDnsHostnames and enableDnsSupport set to true
- SSM requires 3 separate endpoints: ssm, ssmmessages, and ec2messages`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html',
      'https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html',
      'https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html',
    ],
    quickFire: [
      { q: 'What does AWS PrivateLink provide that VPC peering does not?', a: 'Private connectivity to a service without network-level access to the provider VPC -- the consumer only reaches the specific service endpoint.' },
      { q: 'What AWS construct does a provider use to back an Endpoint Service?', a: 'A Network Load Balancer (NLB) in the provider VPC. The NLB forwards traffic from consumer ENIs to actual service targets.' },
      { q: 'What is the difference between an Interface Endpoint and a Gateway Endpoint?', a: 'Interface Endpoints create private ENIs in your subnets (hourly charge). Gateway Endpoints add entries to route tables -- free but only for S3 and DynamoDB.' },
      { q: 'What does enabling Private DNS on an Interface Endpoint do?', a: "It overrides the service's public DNS hostname within your VPC so it resolves to the private ENI IP -- no code changes needed." },
      { q: 'Why do you need multiple endpoints for ECR in a private subnet?', a: 'ECR requires ecr.api and ecr.dkr endpoints for metadata/auth, plus an S3 Gateway Endpoint because image layers are stored in S3.' },
      { q: 'Is PrivateLink traffic transitive across VPC peering?', a: 'No. An endpoint in VPC A cannot be reached from VPC B via VPC peering. Each consumer VPC must create its own endpoint.' },
      { q: 'What VPC settings must be enabled for Private DNS to work?', a: 'Both enableDnsHostnames and enableDnsSupport must be true on the VPC.' },
      { q: 'For high availability, how many Interface Endpoints should you create?', a: 'At minimum one per AZ you use -- endpoint ENIs are AZ-specific and a single-AZ endpoint is a single point of failure.' },
      { q: 'What are Endpoint Policies?', a: 'Resource-based policies on the endpoint that restrict which actions and resources can be accessed through it -- separate from IAM policies.' },
      { q: 'Name three AWS services that support PrivateLink interface endpoints.', a: 'SSM, Secrets Manager, ECR, S3 (interface type), DynamoDB (interface type), and dozens more.' },
    ],
  },
  {
    id: 'direct-connect-vpn',
    title: 'Direct Connect & Site-to-Site VPN',
    icon: 'cloud',
    color: '#f59e0b',
    questions: 6,
    description: 'Dedicated circuits, hosted connections, virtual interface types (public/private/transit), BGP over Direct Connect, and VPN as failover.',
    visualizations: [],
    introduction: `AWS Direct Connect and Site-to-Site VPN are the two primary mechanisms for establishing private connectivity between on-premises data centers and AWS. They serve different use cases and are frequently deployed together for redundancy.

AWS Direct Connect provides dedicated network connections from your premises to AWS via a physical fiber circuit. Connections are established at one of AWS's Direct Connect locations (co-location facilities operated by partners). You can order a Dedicated Connection (1G or 10G port owned by you) or a Hosted Connection (sub-1G or 1G/10G shared on a partner's port). Direct Connect provides consistent network performance, reduced data transfer costs compared to internet, and higher bandwidth than VPN.

Once the physical connection is established, you create Virtual Interfaces (VIFs) on it. A Private VIF connects to a Virtual Private Gateway or Direct Connect Gateway to access your VPCs' private resources. A Public VIF connects you to AWS public services (S3, DynamoDB, SQS) over the AWS backbone using public IP addresses. A Transit VIF connects to a Direct Connect Gateway attached to a Transit Gateway, enabling connectivity to all TGW-attached VPCs.

AWS Site-to-Site VPN creates IPsec VPN tunnels over the public internet between your on-premises VPN device and an AWS Virtual Private Gateway or Transit Gateway. Each VPN connection consists of two tunnels for redundancy. VPN is faster to provision (minutes vs weeks for Direct Connect), lower cost, and typically used as backup for Direct Connect or as primary connectivity for smaller offices.

BGP is mandatory for Direct Connect and optional but recommended for Site-to-Site VPN. BGP enables dynamic route exchange, making failover between Direct Connect and VPN automatic when properly configured with appropriate route preferences.`,
    whenToUse: [
      'Designing hybrid cloud connectivity for data centers requiring consistent, high-bandwidth AWS access',
      'Configuring BGP route preferences to implement Direct Connect primary with VPN failover',
      'Choosing between dedicated vs hosted Direct Connect connections based on bandwidth requirements',
      'Troubleshooting BGP session issues or route exchange problems on a Direct Connect VIF',
      'Planning Direct Connect redundancy with multiple connections or diverse locations',
    ],
    keyConcepts: [
      { term: 'Direct Connect Location', definition: `A co-location facility (e.g., Equinix, CyrusOne) where AWS has installed Direct Connect routers. Your router must be physically present or connected via a partner in the same facility. AWS provides a Letter of Authorization (LOA) to cross-connect your equipment to the AWS router.` },
      { term: 'Virtual Interface (VIF) Types', definition: `Private VIF: BGP session to VGW or Direct Connect Gateway; exchanges private IP routes for VPC access. Public VIF: BGP session for AWS public IP prefixes; access S3, EC2 APIs, etc. over AWS backbone. Transit VIF: BGP session to a Direct Connect Gateway that is attached to Transit Gateway; enables access to all TGW-connected VPCs.` },
      { term: 'Direct Connect Gateway', definition: `A global resource (not region-specific) that can be associated with multiple VGWs across different regions, or with a Transit Gateway. Allows a single Direct Connect connection to access VPCs in multiple AWS regions. Supports up to 10 VGW associations. Cannot be used for VPC-to-VPC routing (only for on-premises to VPC).` },
      { term: 'IPsec Site-to-Site VPN', definition: `Creates two IPsec tunnels (IKEv1 or IKEv2) between your on-premises VPN device and an AWS VGW or TGW. Tunnels run over the public internet. Each tunnel can carry up to 1.25 Gbps. Both tunnels are active but AWS prefers one; use BGP AS_PATH prepending or LOCAL_PREF manipulation to control which tunnel carries traffic.` },
      { term: 'BGP Route Preference for Failover', definition: `With Direct Connect primary and VPN backup, use BGP route attributes to prefer Direct Connect. For outbound traffic (from on-premises to AWS): advertise more specific routes via Direct Connect or use LOCAL_PREF. For inbound traffic (AWS to on-premises): AWS prefers Direct Connect routes by default. Adjust MED or AS_PATH on VPN routes to deprioritize them.` },
    ],
    pitfalls: [
      'Direct Connect does not provide encryption by default. Traffic on the Direct Connect circuit is not encrypted at the link layer. For compliance requirements, you must run an IPsec tunnel over the Direct Connect connection (MACsec is also supported on Dedicated connections for link-layer encryption).',
      'A single Direct Connect connection is a single point of failure even with two VIFs. For production resilience, use two Direct Connect connections from different Direct Connect locations, ideally with diverse physical paths.',
      'BGP hold timer defaults (90 second dead timer, 30 second keepalive) mean BGP failure detection takes up to 90 seconds. Use BFD over Direct Connect to achieve sub-second failure detection and faster VPN failover.',
      'Public VIF BGP sessions exchange AWS public IP prefixes. AWS advertises thousands of prefixes including all CloudFront, EC2 public IPs. Your router must have sufficient memory and processing capacity to handle this routing table.',
    ],
    keyQuestions: [
      {
        question: 'How do you configure Direct Connect with VPN failover? Walk through the BGP configuration on both sides.',
        answer: `## Direct Connect Primary + VPN Failover

## Architecture

- On-premises router with Direct Connect private VIF (BGP AS 65000)
- AWS VGW or TGW (BGP AS 64512)
- Site-to-Site VPN as backup (same VGW or TGW)

## Route Preference Principles

AWS prefers Direct Connect routes over VPN routes by default. Configure VPN routes with lower preference using AS_PATH prepending.

## On-Premises BGP Configuration (Cisco IOS example)

\`\`\`
router bgp 65000
 neighbor 169.254.100.1 remote-as 64512
 neighbor 169.254.100.1 description AWS-DX-Primary
 neighbor 169.254.100.1 password your-bgp-auth-key

 neighbor 169.254.200.1 remote-as 64512
 neighbor 169.254.200.1 description AWS-VPN-Backup
 neighbor 169.254.200.1 route-map VPN-BACKUP-OUT out

 network 10.0.0.0 mask 255.255.0.0

route-map VPN-BACKUP-OUT permit 10
 set as-path prepend 65000 65000 65000
\`\`\`

## Verification

\`\`\`bash
# Check Direct Connect BGP session status
aws directconnect describe-virtual-interfaces \
  --query 'virtualInterfaces[].{VIF:virtualInterfaceName,BGP:bgpPeers[0].bgpStatus}'

# Check VPN tunnel status
aws ec2 describe-vpn-connections \
  --query 'VpnConnections[].{VPN:VpnConnectionId,Tunnels:VgwTelemetry[*].{IP:OutsideIpAddress,Status:Status}}'
\`\`\`

## BFD for Fast Failure Detection

\`\`\`
interface GigabitEthernet0/0.101
 bfd interval 300 min_rx 300 multiplier 3

router bgp 65000
 neighbor 169.254.100.1 fall-over bfd
\`\`\``,
      },
      {
        question: 'What is MACsec and when would you use it over a Direct Connect connection instead of IPsec VPN?',
        answer: `## MACsec vs IPsec Over Direct Connect

## MACsec (IEEE 802.1AE)

MACsec provides Layer 2 encryption hop-by-hop on the Direct Connect link itself. It encrypts all traffic at the Ethernet frame level between your router and the AWS Direct Connect device.

- Operates at Layer 2 (no IP overhead)
- Near-zero latency overhead (hardware encryption)
- Available on Dedicated Connections (10Gbps, 100Gbps) only
- Not available on Hosted Connections
- Requires MACsec-capable router (Cisco, Juniper hardware)

\`\`\`bash
# Enable MACsec on a Direct Connect connection
aws directconnect update-connection \
  --connection-id dxcon-xxxxxxxx \
  --encryption-mode must_encrypt

# Associate a MACsec key
aws directconnect associate-mac-sec-key \
  --connection-id dxcon-xxxxxxxx \
  --ckn your-connectivity-key-name \
  --cak your-connectivity-association-key
\`\`\`

## IPsec VPN Over Direct Connect

Running IPsec over the Direct Connect circuit provides Layer 3 encryption. Used when:
- You need encryption but have a Hosted Connection (no MACsec support)
- Compliance requires end-to-end encryption (MACsec only encrypts the last mile)
- You need to encrypt traffic to specific destinations differently

## When to Choose MACsec

- 10G or 100G Dedicated Connections requiring link-layer encryption
- Compliance mandates encrypting the physical circuit
- Lowest possible latency overhead required
- Simpler key management than IPsec IKE negotiation

## When to Choose IPsec Over Direct Connect

- Hosted Connections (MACsec not available)
- Need end-to-end encryption beyond the Direct Connect link
- Existing IPsec infrastructure and tooling`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html',
      'https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html',
      'https://docs.aws.amazon.com/directconnect/latest/UserGuide/MACsec.html',
      'https://aws.amazon.com/directconnect/resiliency-recommendation/',
    ],
    quickFire: [
      { q: 'What are the two types of AWS Direct Connect connections?', a: 'Dedicated Connections (1G, 10G, 100G port you own at a DX location) and Hosted Connections (sub-rate or shared bandwidth via a partner).' },
      { q: 'What are the three Virtual Interface types on Direct Connect?', a: 'Private VIF (access VPC private IPs via VGW or DXGW), Public VIF (access AWS public IPs over backbone), and Transit VIF (access TGW-attached VPCs via DXGW).' },
      { q: 'Does Direct Connect encrypt traffic by default?', a: 'No. Direct Connect provides a dedicated path but no encryption. Use MACsec for link-layer encryption or IPsec over the DX circuit for end-to-end encryption.' },
      { q: 'How many IPsec tunnels does each Site-to-Site VPN connection have?', a: 'Two tunnels for redundancy. Each tunnel supports up to 1.25 Gbps. AWS prefers one tunnel by default.' },
      { q: 'How do you make Direct Connect primary and VPN backup using BGP?', a: 'Advertise the same on-premises prefix via both paths. Prepend AS_PATH on the VPN route -- AWS prefers DX by default; longer AS_PATH further deprioritizes VPN.' },
      { q: 'What is a Direct Connect Gateway?', a: 'A global resource (not region-specific) that lets one DX connection access VPCs in multiple AWS regions via VGW associations or TGW attachment.' },
      { q: 'What is MACsec and when can you use it on Direct Connect?', a: 'MACsec is IEEE 802.1AE Layer 2 encryption. It is only available on Dedicated Connections (10G/100G) -- not on Hosted Connections.' },
      { q: 'What BGP feature provides sub-second failure detection on Direct Connect?', a: 'BFD (Bidirectional Forwarding Detection). Configure it on both sides to detect DX failure in 300ms and trigger fast VPN failover.' },
      { q: 'What is the minimum number of Direct Connect connections recommended for production?', a: 'Two connections from different DX locations for resilience -- a single DX connection is a single point of failure.' },
      { q: 'Why does a Public VIF BGP session receive thousands of routes?', a: 'AWS advertises all its public IP prefixes -- CloudFront, EC2, S3 public endpoints -- over the Public VIF, which can be a very large routing table.' },
    ],
  },
  {
    id: 'hybrid-connectivity',
    title: 'Hybrid Cloud Connectivity',
    icon: 'cloud',
    color: '#f59e0b',
    questions: 5,
    description: 'Site-to-site VPN architecture, SD-WAN to cloud integration, Transit Gateway with Direct Connect, and latency considerations.',
    visualizations: [],
    introduction: `Hybrid cloud connectivity is the practice of linking on-premises infrastructure with public cloud environments (AWS, Azure, GCP) in a secure, performant, and resilient manner. It is one of the most common architectural challenges faced by enterprise SREs and cloud architects, as most large organizations have existing on-premises systems that must coexist and interoperate with cloud-native workloads.

The connectivity options exist on a spectrum of cost, bandwidth, latency, and reliability. At one end, public internet with TLS provides basic connectivity but with unpredictable latency and no bandwidth guarantees. VPN tunnels over internet add IPsec encryption and are cost-effective for low-to-medium bandwidth needs. SD-WAN solutions improve internet-based connectivity with intelligent path selection and application awareness. At the other end, dedicated circuits (AWS Direct Connect, Azure ExpressRoute, GCP Dedicated Interconnect) provide consistent performance, high bandwidth, and reduced data transfer costs at higher fixed expense and longer provisioning times.

Transit Gateway with Direct Connect Gateway represents the modern AWS reference architecture for large-scale hybrid connectivity: a single TGW acts as the centralized hub, all VPCs attach to it, a Direct Connect Gateway bridges the on-premises Direct Connect circuit to the TGW, and a Site-to-Site VPN provides backup. This architecture centralizes routing policy, enables any-to-any connectivity between on-premises and all VPCs, and provides redundancy.

Latency is a critical consideration in hybrid architectures. Even with Direct Connect, round-trip latency from an on-premises data center to an AWS region can be 5-50ms. Applications with synchronous calls crossing the hybrid boundary — particularly databases and distributed transactions — are highly sensitive to this latency and may require architectural changes.`,
    whenToUse: [
      'Designing on-premises to cloud connectivity for a multi-account AWS Organization',
      'Planning failover between Direct Connect and VPN for production hybrid workloads',
      'Integrating SD-WAN branch offices with cloud-hosted applications',
      'Analyzing latency impact of hybrid architecture on distributed application performance',
      'Migrating on-premises workloads to cloud while maintaining connectivity during transition',
    ],
    keyConcepts: [
      { term: 'Hybrid Connectivity Options Spectrum', definition: `Public internet (no guarantee, cheapest) to IPsec VPN over internet (encrypted, 1.25Gbps/tunnel, minutes to provision) to SD-WAN with cloud integration (intelligent path selection, multiple internet paths) to Direct Connect Hosted Connection (dedicated bandwidth, partner-provisioned) to Direct Connect Dedicated Connection (physical port, 1G/10G/100G, highest performance).` },
      { term: 'Transit VIF + Direct Connect Gateway + TGW', definition: `The AWS reference architecture for scale. A Transit VIF on the Direct Connect connection terminates on a Direct Connect Gateway (global resource). The DXGW attaches to the TGW in each region. On-premises traffic enters via Direct Connect, routes through DXGW to TGW, and TGW routes to any attached VPC. This provides centralized connectivity without per-VPC VGW configuration.` },
      { term: 'Latency Considerations', definition: `Direct Connect typically provides 1-20ms RTT to AWS regions depending on geographic proximity. Over internet VPN, latency is higher and variable (10-100ms+). Applications using synchronous distributed transactions, database replication, or chatty RPC calls across the hybrid boundary should measure actual latency and consider async patterns or caching to absorb the round-trip overhead.` },
      { term: 'SD-WAN to Cloud Integration', definition: `SD-WAN vendors provide cloud-native integration: Cisco SD-WAN (Viptela) integrates with AWS Transit Gateway Connect using GRE tunnels and BGP for dynamic routing. VMware SD-WAN provides cloud gateways in AWS and Azure. Palo Alto Prisma SD-WAN connects to cloud via IPsec. These integrations allow SD-WAN-managed branches to reach cloud resources through the SD-WAN overlay.` },
      { term: 'DNS in Hybrid Environments', definition: `Hybrid environments require DNS resolution to work bidirectionally: on-premises clients resolving AWS private hostnames, and cloud workloads resolving on-premises hostnames. AWS Route 53 Resolver endpoints (inbound for on-premises queries, outbound for cloud queries to on-premises DNS) are the standard solution. Forwarding rules route queries for specific domains to the appropriate DNS server.` },
    ],
    pitfalls: [
      'Not accounting for asymmetric routing in hybrid environments. A packet may enter via Direct Connect but return via VPN if routes are not properly weighted on both sides. Stateful firewalls and NAT devices will drop asymmetrically routed flows.',
      'MTU mismatches across hybrid connections. VPN encapsulation reduces effective MTU by 50-100 bytes. If on-premises hosts set DF bit and the MSS is not clamped correctly, large packets will be silently dropped, causing connections to hang after the initial handshake.',
      'Single Direct Connect connection with no redundancy is a common cost-saving mistake that creates a critical single point of failure. AWS recommends at least two connections from different DX locations for production workloads.',
      'Failing to test failover regularly. Organizations configure DX primary and VPN backup but never test the failover. When DX actually fails, the VPN backup may be misconfigured, expired, or the VPN devices may have been decommissioned.',
    ],
    keyQuestions: [
      {
        question: 'Design a resilient hybrid connectivity architecture for an enterprise with a main data center and 20 branch offices needing to access AWS workloads.',
        answer: `## Resilient Hybrid Connectivity Architecture

## Main Data Center Connectivity

\`\`\`
Main DC -> Direct Connect (10G) x2 -> AWS Direct Connect Gateway -> Transit Gateway
                                                                   |-> VPC-Prod
                                                                   |-> VPC-Dev
                                                                   |-> VPC-Shared

Main DC -> Site-to-Site VPN (backup) -> Transit Gateway (same TGW)
\`\`\`

\`\`\`bash
# Create Transit VIF on primary Direct Connect
aws directconnect create-transit-virtual-interface \
  --connection-id dxcon-primary \
  --new-transit-virtual-interface \
    virtualInterfaceName=main-dc-primary,\
    vlan=100,\
    asn=65000,\
    directConnectGatewayId=dxgw-xxxxxxxxx

# Attach DXGW to TGW
aws directconnect create-direct-connect-gateway-association \
  --direct-connect-gateway-id dxgw-xxxxxxxxx \
  --gateway-id tgw-xxxxxxxxx \
  --add-allowed-prefixes-to-direct-connect-gateway \
    cidr=10.0.0.0/8
\`\`\`

## Branch Office Connectivity (20 offices)

Option A: SD-WAN with cloud integration
- Each branch runs an SD-WAN edge device
- All branches connect to SD-WAN regional hubs
- Regional hubs connect to TGW via SD-WAN cloud gateway (IPsec/GRE + BGP)
- Benefit: centralized management, intelligent path selection per office

Option B: VPN per branch
- Create Site-to-Site VPN for each branch to TGW
- 20 VPN connections x 2 tunnels = 40 tunnels (TGW supports 5000)
- Higher management overhead but simpler for small branch count

## DNS Architecture

\`\`\`bash
# Inbound resolver endpoint (on-premises to AWS)
aws route53resolver create-resolver-endpoint \
  --creator-request-id my-inbound-endpoint \
  --direction INBOUND \
  --security-group-ids sg-resolver \
  --ip-addresses SubnetId=subnet-a,Ip=10.0.1.10 SubnetId=subnet-b,Ip=10.0.2.10

# Outbound resolver endpoint (AWS to on-premises DNS)
aws route53resolver create-resolver-endpoint \
  --creator-request-id my-outbound-endpoint \
  --direction OUTBOUND \
  --security-group-ids sg-resolver \
  --ip-addresses SubnetId=subnet-a SubnetId=subnet-b

# Forward rule for on-premises domain
aws route53resolver create-resolver-rule \
  --creator-request-id my-rule \
  --rule-type FORWARD \
  --domain-name corp.example.com \
  --resolver-endpoint-id rslvr-out-xxxxxxxx \
  --target-ips Ip=10.100.0.53,Port=53
\`\`\``,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/whitepapers/latest/hybrid-connectivity/hybrid-connectivity.html',
      'https://aws.amazon.com/directconnect/resiliency-recommendation/',
      'https://docs.aws.amazon.com/route53/latest/DeveloperGuide/resolver.html',
    ],
    quickFire: [
      { q: 'What is the AWS reference architecture for large-scale hybrid connectivity?', a: 'Transit Gateway + Direct Connect Gateway via Transit VIF. All VPCs attach to TGW; DXGW bridges the DX circuit to TGW.' },
      { q: 'What causes asymmetric routing in hybrid environments and why is it a problem?', a: 'Forward and return paths traverse different routers. Stateful firewalls drop flows they only see one direction of, breaking connections.' },
      { q: 'How does AWS Route 53 Resolver support hybrid DNS?', a: 'Inbound Resolver Endpoints let on-premises resolvers query AWS private hostnames. Outbound Endpoints with forwarding rules let AWS workloads query on-premises DNS.' },
      { q: 'What is the typical round-trip latency over AWS Direct Connect?', a: '1-20ms RTT depending on geographic proximity to the DX location -- consistent but not zero.' },
      { q: 'How does SD-WAN integrate with AWS Transit Gateway?', a: 'Via Transit Gateway Connect using GRE tunnels and BGP. SD-WAN head-end peers with TGW and advertises/learns routes dynamically.' },
      { q: 'What VPN encapsulation overhead causes MTU issues in hybrid networks?', a: 'IPsec adds 50-100 bytes. If inner hosts send 1500-byte packets with DF bit set and ICMP Frag-Needed is blocked, connections hang after handshake.' },
      { q: 'What is the fastest option to provision hybrid connectivity for a new branch?', a: 'Site-to-Site VPN -- provisioned in minutes over the internet. Direct Connect takes weeks to physically provision.' },
      { q: 'What type of applications are most impacted by hybrid connectivity latency?', a: 'Synchronous distributed transactions, database replication with tight RPO, and chatty RPC-style microservices crossing the hybrid boundary.' },
      { q: 'Why should you test Direct Connect failover to VPN regularly?', a: 'VPN backup can be misconfigured, certificates expired, or VPN devices decommissioned. Untested failover often fails during an actual DX outage.' },
      { q: 'For 20 branch offices connecting to AWS, what is better: per-branch VPN or SD-WAN hub?', a: 'SD-WAN regional hubs with a single cloud gateway integration is operationally simpler. Per-branch VPN works but creates 40 tunnels to manage individually.' },
    ],
  },
  {
    id: 'packet-capture-analysis',
    title: 'Packet Capture & Analysis',
    icon: 'tool',
    color: '#f97316',
    questions: 6,
    description: 'tcpdump syntax and BPF expressions, Wireshark display filters, pcap format, and decoding protocol layers from a capture.',
    visualizations: [],
    introduction: `Packet capture and analysis is a fundamental SRE and network engineering skill for diagnosing connectivity issues, performance problems, protocol errors, and security incidents that cannot be solved with higher-level metrics and logs alone. When an application reports "connection refused" or "timeout" and log analysis is inconclusive, packet-level inspection is often the only way to determine ground truth.

tcpdump is the standard command-line packet capture tool available on nearly every Linux system. It uses the libpcap library and supports Berkeley Packet Filter (BPF) expressions for efficient kernel-level packet filtering. BPF filtering happens in the kernel before packets are copied to userspace, making tcpdump efficient even on high-traffic interfaces. Understanding BPF syntax — filtering by host, port, protocol, direction, and combining expressions with and/or/not — is essential for targeted captures that don't overwhelm disk or memory.

Wireshark is the standard GUI analysis tool that processes pcap files captured by tcpdump or libpcap. Wireshark dissects protocol layers, reconstructs TCP streams, identifies retransmissions and out-of-order packets, decodes application-layer protocols, and provides powerful display filter syntax separate from capture filters. The combination of tcpdump for capture and Wireshark for offline analysis is the standard production workflow.

In cloud environments, traditional packet capture requires some adaptation. On AWS, VPC Traffic Mirroring mirrors ENI traffic to a network monitoring appliance. EC2 instances can run tcpdump directly on their interfaces. In Kubernetes, tcpdump can be run in a privileged pod or using tools like kubectl-sniff that inject a tcpdump sidecar. Understanding how encapsulation affects what you see in a capture — VXLAN outer headers, TLS encryption, VPN tunnels — is critical for correct interpretation.`,
    whenToUse: [
      'Diagnosing TCP connection failures, RST injections, or handshake issues',
      'Verifying TLS certificate negotiation and cipher suite selection',
      'Identifying dropped packets, retransmissions, and TCP window size issues affecting throughput',
      'Analyzing DNS query failures, NXDOMAIN responses, or resolution timing',
      'Capturing traffic during a security incident for forensic analysis',
    ],
    keyConcepts: [
      { term: 'BPF (Berkeley Packet Filter)', definition: `A kernel-level filtering mechanism that efficiently selects packets before copying them to userspace. BPF expressions filter by protocol (tcp, udp, icmp), host (src host, dst host), port (port, src port, dst port), network (net), and combine with and/or/not. BPF runs in the kernel, dramatically reducing CPU overhead compared to userspace filtering.` },
      { term: 'pcap File Format', definition: `The standard packet capture file format used by tcpdump, Wireshark, and virtually all network analysis tools. Contains a global header (magic number, snap length, link type) followed by packet records (timestamp, captured length, original length, raw packet bytes). Can be read offline by any pcap-compatible tool.` },
      { term: 'TCP Stream Reassembly', definition: `Wireshark reassembles TCP byte streams from individual packets, allowing analysis of complete application-layer exchanges (HTTP requests, SMTP conversations). Follow TCP Stream (right-click then Follow then TCP Stream) shows the complete bidirectional conversation. Essential for debugging application protocol issues where the payload spans multiple packets.` },
      { term: 'Wireshark Display Filters', definition: `Display filters in Wireshark are applied after capture and do not affect captured data. They are more expressive than BPF capture filters. Examples: ip.addr==10.0.0.1, tcp.port==443, http.response.code==500, dns.qry.name contains "example.com", tcp.flags.reset==1. Can be combined with and/or/not and parentheses.` },
      { term: 'Promiscuous Mode', definition: `Normally, a network interface only passes packets addressed to its own MAC address to the OS. Promiscuous mode configures the interface to capture all packets on the segment, including those destined for other hosts. Essential for capturing on a hub or port span/mirror. tcpdump enables promiscuous mode by default unless -p is specified.` },
    ],
    pitfalls: [
      'Running tcpdump without a snaplen limit on a high-traffic interface captures full packet payloads and can exhaust disk space within seconds. Use -s 96 for headers-only capture when payload content is not needed.',
      'Not rotating capture files during long captures. A single pcap file with hours of traffic is difficult to analyze. Use tcpdump -C (file size) and -W (number of files) for automatic rotation into a ring buffer.',
      'Forgetting that TLS-encrypted traffic shows only the TLS handshake in a capture, not the application payload. To decrypt, you need either the server private key (for RSA key exchange) or the session master secrets (exported via SSLKEYLOGFILE environment variable in the client).',
      'Confusing capture filters (BPF, applied at capture time) with display filters (Wireshark syntax, applied during analysis). They have different syntax. A mistake like writing a Wireshark display filter in tcpdump will either fail or silently capture nothing.',
    ],
    keyQuestions: [
      {
        question: 'Write tcpdump commands for the following capture scenarios: capturing HTTP traffic, capturing DNS queries, capturing only TCP RST packets, and capturing traffic to/from a specific host while excluding SSH.',
        answer: `## tcpdump Capture Scenarios

## HTTP Traffic (port 80)

\`\`\`bash
# Capture HTTP request/response headers (snap first 512 bytes)
tcpdump -i eth0 -s 512 -A 'tcp port 80'

# Write to file for Wireshark analysis
tcpdump -i eth0 -s 0 -w /tmp/http-capture.pcap 'tcp port 80'
\`\`\`

## DNS Queries

\`\`\`bash
# Capture all DNS (UDP and TCP on port 53)
tcpdump -i eth0 -n 'port 53'

# Show DNS query names in ascii
tcpdump -i eth0 -n -s 0 -A 'udp port 53'
\`\`\`

## TCP RST Packets

\`\`\`bash
# Capture all TCP RST packets
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-rst != 0'

# RSTs with verbose source/destination info
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-rst != 0'

# RSTs on a specific port
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-rst != 0 and port 8080'
\`\`\`

## Specific Host Excluding SSH

\`\`\`bash
# Traffic to/from 10.0.0.5, excluding port 22 (SSH)
tcpdump -i eth0 -n 'host 10.0.0.5 and not port 22'

# Extended: also exclude monitoring traffic
tcpdump -i eth0 -n 'host 10.0.0.5 and not (port 22 or port 161 or port 162)'

# Write to rotating files (100MB max, keep last 10)
tcpdump -i eth0 -n -w /tmp/capture.pcap -C 100 -W 10 \
  'host 10.0.0.5 and not port 22'
\`\`\`

## Kubernetes Pod Capture

\`\`\`bash
# Run tcpdump in a Kubernetes pod namespace using debug container
NODE=$(kubectl get pod mypod -o jsonpath='{.spec.nodeName}')
kubectl debug node/\${NODE} -it --image=nicolaka/netshoot -- \
  tcpdump -i eth0 -n -s 0 -w /tmp/pod-capture.pcap
\`\`\``,
      },
      {
        question: 'How do you use Wireshark to analyze a TCP connection problem? Walk through diagnosing a scenario where connections complete the handshake but data transfer is slow.',
        answer: `## Wireshark TCP Performance Analysis

## Capture and Open

\`\`\`bash
# Capture on server side while client runs transfer
tcpdump -i eth0 -s 0 -w /tmp/slow-transfer.pcap 'host client-ip and port 8080'
# Open in Wireshark
wireshark slow-transfer.pcap
\`\`\`

## Step 1: Check TCP Handshake

Display filter: tcp.flags.syn==1
- Verify SYN, SYN-ACK, ACK all present with normal timing
- Check initial Window Size in SYN-ACK (client receive window)

## Step 2: TCP Stream Statistics

Statistics then TCP Stream Graphs then Time-Sequence (tcptrace)
- Flat lines indicate sender is stalled (waiting for ACKs or window to open)
- Spiky retransmission markers indicate packet loss

## Step 3: Find Retransmissions

\`\`\`
Display filter: tcp.analysis.retransmission or tcp.analysis.fast_retransmission
\`\`\`

## Step 4: Check Window Size

\`\`\`
Display filter: tcp.window_size_value < 8192
\`\`\`

A small receive window limits throughput. TCP throughput = window_size / RTT. If window is 65535 bytes and RTT is 50ms, max throughput is about 10Mbps regardless of bandwidth.

## Step 5: Check for Zero Window

\`\`\`
Display filter: tcp.analysis.zero_window
\`\`\`

Zero window means the receiver buffer is full. The sender stops until a Window Update is received. Indicates slow receiver processing.

## Common Root Causes

- Receiver buffer full (zero window): increase application read rate or socket buffer size
- Packet loss causing retransmissions: investigate network path for congestion or errors
- Window scaling not negotiated: limits window to 65535 bytes, throttling long-RTT transfers
- Nagle's algorithm plus delayed ACK interaction: causes 200ms delays for small writes`,
      },
    ],
    references: [
      'https://www.tcpdump.org/manpages/tcpdump.1.html',
      'https://www.wireshark.org/docs/wsug_html_chunked/',
      'https://wiki.wireshark.org/DisplayFilters',
      'https://www.kernel.org/doc/html/latest/networking/filter.html',
    ],
    quickFire: [
      { q: 'What does BPF stand for and where does filtering happen?', a: 'Berkeley Packet Filter. Filtering happens in the kernel before packets are copied to userspace -- very efficient at high traffic rates.' },
      { q: 'How do you capture only TCP RST packets with tcpdump?', a: "Use the BPF expression: tcp[tcpflags] & tcp-rst != 0" },
      { q: 'What is the difference between tcpdump -s 0 and -s 96?', a: '-s 0 captures full packet payloads (can fill disk fast). -s 96 captures only headers -- sufficient for most troubleshooting.' },
      { q: 'How do you prevent a single pcap file from filling disk during a long capture?', a: 'Use tcpdump -C <size_MB> -W <file_count> for automatic file rotation into a ring buffer.' },
      { q: 'What Wireshark display filter finds all TCP retransmissions?', a: 'tcp.analysis.retransmission or tcp.analysis.fast_retransmission' },
      { q: 'What does a zero TCP window in a capture indicate?', a: "The receiver's buffer is full. The sender stalls until a Window Update arrives. Indicates the application is not reading data fast enough." },
      { q: 'Why can you see a TLS handshake but not the encrypted payload in a capture?', a: 'TLS encrypts the application payload. To decrypt you need the server private key (RSA) or session keys via SSLKEYLOGFILE.' },
      { q: 'What is promiscuous mode in tcpdump?', a: 'The NIC captures all frames on the segment, not just those addressed to its own MAC. tcpdump enables it by default.' },
      { q: 'How do you capture packets in a Kubernetes pod without installing tcpdump in it?', a: 'Use kubectl debug to attach a debug container with network tools to the pod namespace, or use kubectl-sniff / netshoot.' },
      { q: 'What does pcap file format store besides raw packet bytes?', a: 'A global header (magic number, snap length, link type) and per-packet records with timestamp, captured length, and original length.' },
    ],
  },
  {
    id: 'connectivity-failures',
    title: 'Diagnosing Connectivity Failures',
    icon: 'tool',
    color: '#f97316',
    questions: 6,
    description: 'Interpreting ping and traceroute output, firewall drop vs reject behavior, MTU black holes, and asymmetric routing issues.',
    visualizations: [],
    introduction: `Connectivity failures are one of the most common and frustrating categories of production incidents. A service that worked yesterday suddenly cannot be reached, or a new deployment fails to connect to a dependency. Systematic diagnosis using the right tools and a layered OSI-model approach dramatically reduces mean time to resolution.

The fundamental diagnostic loop is: determine what layer the failure is at (physical, IP, transport, application), then use layer-appropriate tools to isolate the exact failure point. Starting with ping and traceroute provides an initial map of IP-layer connectivity. If IP connectivity exists but TCP connections fail, tcpdump at both endpoints reveals whether SYN packets are arriving and whether RST or ICMP unreachable messages are being sent back. If TCP connects but application responses are wrong, curl and application-layer debugging tools take over.

Understanding the difference between ICMP unreachable (connection rejected, usually a firewall rule returning an explicit deny) and connection timeout (packet dropped silently, usually a stateful firewall or network ACL with no return) is critical. A firewall that sends TCP RST or ICMP port-unreachable is actually more helpful for diagnosis than one that silently drops — the error is immediate and informative. A silent drop causes the client to wait for the full connection timeout (typically 120 seconds) before failing.

MTU black holes are a notoriously difficult class of connectivity failure. TCP connections establish successfully (SYN/SYN-ACK/ACK use small packets) but data transfer fails or hangs. This happens when the Path MTU is smaller than the sender assumes, the DF (Don't Fragment) bit is set, and ICMP "fragmentation needed" messages are blocked by a firewall. The result is silent packet drops for any packet larger than the Path MTU.

In cloud environments, additional failure modes include security group misconfiguration, network ACL issues, route table problems, and DNS resolution failures that masquerade as connectivity issues.`,
    whenToUse: [
      'Responding to service unavailability incidents where the root cause is network-related',
      'Validating network configuration after infrastructure changes or deployments',
      'Diagnosing intermittent connectivity issues that do not appear in application logs',
      'Investigating asymmetric routing causing stateful firewall session drops',
      'Troubleshooting cross-region or cross-account connectivity in AWS environments',
    ],
    keyConcepts: [
      { term: 'ICMP Unreachable vs Silent Drop', definition: `A firewall returning ICMP port-unreachable or TCP RST tells the client immediately that the connection is refused. The client gets an immediate error (Connection refused). A silent drop causes the client to wait until the connection attempt timeout expires (TCP SYN is retransmitted 3-6 times over 60-120 seconds before giving up).` },
      { term: 'Traceroute Interpretation', definition: `Traceroute sends packets with incrementing TTL values. Each hop decrements TTL by 1; when TTL reaches 0 the router sends ICMP Time Exceeded back, revealing its IP. Asterisks indicate the router did not respond to the probe — not necessarily a failure; many routers rate-limit or drop ICMP TTL-exceeded. A final asterisk means the destination did not respond.` },
      { term: 'Asymmetric Routing', definition: `When forward-path packets traverse different routers than return-path packets. Stateful firewalls track connection state: if they see a TCP SYN on the forward path but the SYN-ACK returns via a different path (not through the firewall), the firewall has no state for the flow and drops the SYN-ACK. Results in connections that initiate but never complete.` },
      { term: 'MTU Black Hole', definition: `Occurs when Path MTU Discovery fails because ICMP Fragmentation Needed messages (type 3, code 4) are blocked by firewalls. The sender sets DF bit, sends a packet larger than a link in the path can handle, the intermediate router cannot fragment (DF set), sends ICMP Frag-Needed, but that ICMP is blocked. The sender never learns to use a smaller MTU and retransmits silently discarded large packets.` },
      { term: 'Network ACL vs Security Group', definition: `In AWS, Security Groups are stateful (return traffic automatically allowed), applied at the ENI level, and support allow-only rules. Network ACLs are stateless (must explicitly allow both inbound and outbound), applied at the subnet level, support both allow and deny rules, and process rules in numbered order (lowest first). A common mistake is configuring the SG correctly but forgetting to allow the return traffic in the NACL.` },
    ],
    pitfalls: [
      'Chasing symptoms rather than isolating layers. Jumping to application log analysis before confirming basic IP and TCP connectivity often leads to incorrect conclusions. Always verify layer by layer: ping (IP), telnet/nc (TCP), curl (HTTP).',
      'Assuming firewall rules are the problem before verifying routing. A packet that is routed to the wrong interface will be dropped before any firewall rules apply. Check routing tables before firewall rules.',
      'Ignoring DNS as a connectivity failure cause. Cannot connect to service often turns out to be DNS returning NXDOMAIN or the wrong IP. Always resolve the hostname manually before diagnosing network-layer issues.',
      'Testing from the wrong vantage point. Testing connectivity from a jump host does not prove the application server can reach the same destination. Security groups, NACLs, and routing can differ between the jump host subnet and the application server subnet.',
    ],
    keyQuestions: [
      {
        question: 'Walk through your systematic process for diagnosing "service X cannot reach service Y" in a Kubernetes cluster deployed on AWS.',
        answer: `## Systematic Connectivity Diagnosis: K8s on AWS

## Layer 1-2: Node Connectivity

\`\`\`bash
# Verify nodes are Ready
kubectl get nodes

# Check node network interfaces
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- ip addr
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- ip route
\`\`\`

## Layer 3: Pod IP Connectivity

\`\`\`bash
# Get pod IPs for both services
kubectl get pod -l app=service-x -o wide
kubectl get pod -l app=service-y -o wide

# Test ICMP from service-x pod to service-y pod IP
kubectl exec -it <service-x-pod> -- ping -c 3 <service-y-pod-ip>

# If ping fails, check CNI:
kubectl get pods -n kube-system | grep -E 'flannel|calico|cilium|aws-node'
kubectl describe pod -n kube-system <cni-pod-on-failing-node>
\`\`\`

## Layer 4: TCP Port Connectivity

\`\`\`bash
# Test TCP connectivity to service-y's container port
kubectl exec -it <service-x-pod> -- nc -zv <service-y-pod-ip> 8080

# Test via Kubernetes Service
kubectl exec -it <service-x-pod> -- nc -zv service-y.namespace.svc.cluster.local 80

# Check if service endpoints exist
kubectl get endpoints service-y -n <namespace>
\`\`\`

## DNS Resolution

\`\`\`bash
# Verify DNS resolution from service-x pod
kubectl exec -it <service-x-pod> -- nslookup service-y.namespace.svc.cluster.local
kubectl exec -it <service-x-pod> -- cat /etc/resolv.conf

# Check CoreDNS is healthy
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
\`\`\`

## AWS Network Layer

\`\`\`bash
# Check security groups allow traffic between node ENIs
aws ec2 describe-security-groups --group-ids <node-sg-id>

# For VPC CNI (aws-node), check ENI secondary IPs assigned
aws ec2 describe-network-interfaces \
  --filters "Name=attachment.instance-id,Values=<node-instance-id>"

# Check VPC route tables include pod CIDR routes
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=<node-subnet-id>"
\`\`\`

## Network Policy Check

\`\`\`bash
# Check if NetworkPolicy is blocking traffic
kubectl get networkpolicy -n <namespace>
kubectl describe networkpolicy <policy-name>
\`\`\``,
      },
      {
        question: 'How do you diagnose and fix an MTU black hole causing TCP connections to hang after the handshake?',
        answer: `## MTU Black Hole Diagnosis

## Symptoms

- TCP 3-way handshake completes successfully (small SYN/SYN-ACK/ACK packets)
- Small HTTP requests (GET /) work
- Large requests or responses hang indefinitely
- SSH session connects but commands with large output stall

## Why It Happens

\`\`\`
Client (MTU 1500) -> Tunnel/VPN (MTU 1450 effective) -> Server
Client sends 1460-byte TCP segment with DF bit set
Tunnel router cannot fragment (DF bit set)
Tunnel router sends ICMP type 3 code 4 "Fragmentation Needed" to client
ICMP is blocked by firewall
Client never adjusts segment size
Large packets are silently dropped indefinitely
\`\`\`

## Diagnosis

\`\`\`bash
# Test with explicit packet sizes to find the drop point
ping -M do -s 1400 <destination>  # Linux: force DF bit
ping -M do -s 1450 <destination>  # Increase until drops

# Check if ICMP frag-needed is being received
tcpdump -i eth0 -n 'icmp[0] == 3 and icmp[1] == 4'

# Check current MTU on interface
ip link show eth0
ip link show tun0
\`\`\`

## Fixes

\`\`\`bash
# MSS clamping at VPN/tunnel endpoint
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Or set explicit MSS value (1500 - 40 IP+TCP header - 50 VPN overhead = 1410)
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1410

# Reduce MTU on the tunnel interface
ip link set tun0 mtu 1450

# Allow ICMP fragmentation needed through firewalls
iptables -A INPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -A FORWARD -p icmp --icmp-type fragmentation-needed -j ACCEPT

# AWS Security Group: allow ICMP type 3 (Destination Unreachable)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxx \
  --ip-permissions IpProtocol=icmp,FromPort=3,ToPort=-1,IpRanges=[{CidrIp=0.0.0.0/0}]
\`\`\``,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc1191',
      'https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html',
      'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html',
    ],
    quickFire: [
      { q: 'What is the difference between a connection timeout and connection refused?', a: 'Timeout means packets are silently dropped (no response). Refused means the target sent an explicit TCP RST or ICMP port-unreachable.' },
      { q: 'What tool tests Layer 4 TCP connectivity without an application protocol?', a: 'nc (netcat): nc -zv <host> <port> attempts a TCP connection and reports success or failure.' },
      { q: 'What does an asterisk (*) in traceroute output mean?', a: 'That hop did not respond to the TTL-expired probe -- not necessarily a failure. Many routers rate-limit or suppress ICMP TTL-exceeded.' },
      { q: 'What is asymmetric routing and why does it break stateful firewalls?', a: 'Forward and return packets traverse different paths. A stateful firewall only sees one direction of the flow and drops the unseen direction.' },
      { q: 'What is an MTU black hole?', a: 'ICMP Fragmentation Needed messages are blocked, so the sender never learns to reduce packet size. Large packets are silently dropped while small packets (like SYN) succeed.' },
      { q: 'In AWS, what is the key operational difference between Security Groups and NACLs?', a: 'Security Groups are stateful (return traffic auto-allowed), ENI-level, allow-only. NACLs are stateless, subnet-level, support explicit deny.' },
      { q: 'Why should you always check DNS resolution before diagnosing network-layer failures?', a: 'DNS returning NXDOMAIN or the wrong IP looks like a network failure but is actually a DNS issue -- wasting time at the wrong layer.' },
      { q: 'What is the correct layer-by-layer diagnostic sequence for connectivity failures?', a: 'ping (IP) -> nc/telnet (TCP port) -> curl (HTTP/application). Confirm each layer before moving up.' },
      { q: 'How do you check if a Kubernetes NetworkPolicy is blocking traffic?', a: 'kubectl get networkpolicy -n <namespace> and kubectl describe networkpolicy <name> to review ingress/egress selectors.' },
      { q: 'Why must you test connectivity from the correct vantage point?', a: 'Security groups, NACLs, and routing differ per subnet. A test from a jump host does not prove the application server has the same connectivity.' },
    ],
  },
  {
    id: 'mtu-fragmentation',
    title: 'MTU & IP Fragmentation',
    icon: 'tool',
    color: '#f97316',
    questions: 5,
    description: 'Ethernet 1500-byte MTU, jumbo frames at 9000 bytes, Path MTU Discovery, DF bit, VPN encapsulation overhead, and MSS clamping.',
    visualizations: [],
    introduction: `Maximum Transmission Unit (MTU) and IP fragmentation are foundational networking concepts that become critical in cloud and overlay networking environments where encapsulation overhead can silently degrade or break connectivity.

The MTU is the largest IP packet that can be transmitted over a network link without fragmentation. Ethernet's standard MTU is 1500 bytes. This has been the dominant link MTU for decades. However, the effective MTU for application data is smaller: IP headers consume 20 bytes, TCP headers consume 20-60 bytes, leaving a Maximum Segment Size (MSS) of approximately 1460 bytes for TCP payload.

When a packet exceeds the MTU of a link in its path, one of two things happens depending on the IP header's Don't Fragment (DF) bit. If DF is not set, the router fragments the packet into smaller pieces that each fit within the MTU, then reassembles them at the destination (IPv4 only — IPv6 has removed router fragmentation entirely). If DF is set, the router discards the packet and sends an ICMP Type 3 Code 4 "Fragmentation Needed" message back to the sender, which should then reduce its packet size. This mechanism is called Path MTU Discovery (PMTUD).

Fragmentation is generally undesirable: it adds processing overhead at routers and end hosts, increases the number of packets, and any fragment loss requires retransmission of the entire original datagram. VPN and overlay encapsulation aggravate the MTU situation: an IPsec VPN adds 50-100 bytes of overhead, VXLAN adds 50 bytes, and GRE adds 24 bytes. If the outer MTU is 1500 bytes and the encapsulation adds 50 bytes, the inner payload must be 1450 bytes or less — but if inner senders assume 1500 bytes is safe, they will be setting DF and their packets will be dropped with ICMP messages that are often filtered by firewalls.

MSS clamping is the practical fix used in most VPN and tunnel deployments: a firewall or router rewrites the MSS value in TCP SYN packets to a safe value, preventing TCP endpoints from ever sending segments large enough to require fragmentation.`,
    whenToUse: [
      'Configuring VPN or VXLAN tunnels and ensuring inner traffic is not silently dropped',
      'Diagnosing mysterious TCP session hangs where handshake succeeds but data transfer fails',
      'Enabling jumbo frames in AWS VPCs or on-premises Ethernet for high-throughput workloads',
      'Configuring MSS clamping on VPN gateway iptables rules',
      'Explaining why IPv6 behaves differently from IPv4 regarding fragmentation',
    ],
    keyConcepts: [
      { term: 'MTU vs MSS', definition: `MTU (Maximum Transmission Unit) is the maximum Layer 3 IP packet size for a link, typically 1500 bytes for Ethernet. MSS (Maximum Segment Size) is the maximum TCP payload in a single segment, negotiated during the 3-way handshake. MSS = MTU - IP header (20 bytes) - TCP header (20 bytes) = 1460 bytes for standard Ethernet. MSS ensures TCP does not create IP packets that exceed the MTU.` },
      { term: 'DF Bit (Don\'t Fragment)', definition: `A flag in the IPv4 header that instructs routers not to fragment the packet. When set, a router that cannot forward the packet without fragmentation must drop it and send ICMP Type 3 Code 4 (Fragmentation Needed) back to the source with the next-hop MTU. Most TCP stacks set DF by default to enable PMTUD. UDP applications often do not set DF.` },
      { term: 'Path MTU Discovery (PMTUD)', definition: `The mechanism by which an IP sender discovers the smallest MTU along the path to a destination. The sender sends packets with DF set. If a router must fragment but cannot (due to DF), it returns ICMP Fragmentation Needed with the max segment size it can handle. The sender reduces its packet size accordingly. PMTUD breaks when ICMP is filtered, causing MTU black holes.` },
      { term: 'Jumbo Frames', definition: `Ethernet frames larger than the standard 1500-byte MTU. Jumbo frames typically carry 9000-byte MTU payloads. Require all devices in the path (NICs, switches, routers) to support the larger frame size. Common in storage networks (iSCSI, NFS), high-performance computing, and cloud provider backbone networks. AWS VPC supports 9001-byte MTU within a VPC.` },
      { term: 'MSS Clamping', definition: `A technique where a router or firewall rewrites the MSS value in TCP SYN and SYN-ACK packets to a safe value that accounts for encapsulation overhead. Prevents TCP endpoints from negotiating an MSS that would result in IP packets too large for the tunnel. Implemented with iptables TCPMSS target on Linux. The recommended MSS for a 1500-byte outer MTU VPN with 50-byte overhead is 1410 bytes (1500 - 20 IP - 20 TCP - 50 tunnel).` },
    ],
    pitfalls: [
      'Filtering ICMP completely for security breaks PMTUD. ICMP Type 3 messages (Destination Unreachable, including Fragmentation Needed) must be allowed through firewalls for PMTUD to function. Blocking all ICMP while allowing TCP/UDP is a well-intentioned but harmful security policy.',
      'IPv6 does not support router fragmentation at all. Only the source host can fragment IPv6 packets. If the path MTU is smaller than the packet, the router sends ICMPv6 Type 2 Packet Too Big and the packet is dropped. PMTUD is mandatory for IPv6, making ICMP filtering even more harmful in IPv6 environments.',
      'Jumbo frame configuration must be consistent end-to-end. A single switch in the path with standard 1500-byte MTU will silently fragment or drop jumbo frames. Verify every device in the data path — NICs, switches, load balancers — before enabling jumbo frames for production traffic.',
      'GRE and VXLAN encapsulation overhead is often overlooked in capacity planning. Adding a 50-byte VXLAN header to a path already running at 1500 MTU means inner packets must be 1450 bytes. If the existing application traffic assumes 1500-byte MSS, the encapsulation addition immediately creates an MTU black hole for all traffic.',
    ],
    keyQuestions: [
      {
        question: 'Explain Path MTU Discovery and how it breaks. Give a concrete example with VPN encapsulation.',
        answer: `## Path MTU Discovery (PMTUD) - Mechanics and Failure

## Normal PMTUD Operation

\`\`\`
1. Host A wants to send data to Host B via VPN gateway
2. Host A TCP stack negotiates MSS=1460 (standard Ethernet 1500 - 40 headers)
3. Host A sends a 1500-byte IP packet with DF bit set
4. The VPN gateway adds 50 bytes overhead -> 1550 bytes total
5. VPN gateway outbound interface MTU is 1500 bytes -> cannot forward
6. VPN gateway drops packet, sends ICMP Type 3 Code 4 to Host A:
   "Fragmentation Needed, next-hop MTU = 1450"
7. Host A reduces its IP packet size to 1450 bytes
8. Subsequent packets fit through the tunnel
\`\`\`

## PMTUD Failure (MTU Black Hole)

\`\`\`
Steps 1-5 same as above
6. VPN gateway sends ICMP Fragmentation Needed
7. Firewall between VPN and Host A blocks all ICMP -> message dropped
8. Host A never receives the ICMP -> never reduces packet size
9. Host A retransmits the 1500-byte packet (with DF) -> dropped again
10. After retransmit timeout, TCP session appears to hang
\`\`\`

## Real VPN Diagnosis

\`\`\`bash
# On VPN gateway: identify the MTU black hole
# Capture ICMP frag-needed being generated
tcpdump -i eth0 -n 'icmp[0] == 3 and icmp[1] == 4'

# Check VPN interface MTU
ip link show tun0

# Test PMTUD yourself
ping -M do -s 1472 <destination>  # 1472 data + 28 IP+ICMP = 1500
ping -M do -s 1422 <destination>  # 1422 data + 28 = 1450 (should pass through VPN)
\`\`\`

## Remediation

\`\`\`bash
# Fix 1: MSS clamping (adjust TCP MSS in SYN packets)
# Account for VPN overhead: 1500 - 20(IP) - 20(TCP) - 50(VPN) = 1410
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1410

# Fix 2: Allow ICMP Fragmentation Needed through all firewalls
iptables -A INPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -A FORWARD -p icmp --icmp-type fragmentation-needed -j ACCEPT

# Fix 3: Reduce VPN interface MTU
ip link set tun0 mtu 1400
\`\`\``,
      },
      {
        question: 'When should you enable jumbo frames in a cloud environment, and what must you verify before doing so?',
        answer: `## Jumbo Frames in Cloud Environments

## When Jumbo Frames Help

Jumbo frames (9000-byte MTU) reduce CPU overhead for large data transfers by requiring fewer frames to transmit the same amount of data. Fewer frames means fewer interrupt requests, fewer header processing cycles, and lower CPU utilization at high throughput.

Most beneficial for:
- Storage traffic: NFS, iSCSI, Ceph between storage nodes and compute
- High-throughput data pipelines: Kafka, Spark data shuffle, ETL workloads
- High-performance computing with large message passing

## AWS VPC Jumbo Frame Support

\`\`\`bash
# AWS VPC supports 9001-byte MTU within a VPC and across VPC peering
# Check current instance MTU
ip link show eth0

# Enable jumbo frames on an EC2 instance
ip link set eth0 mtu 9001

# Verify effective MTU
cat /sys/class/net/eth0/mtu
\`\`\`

## What to Verify Before Enabling

\`\`\`bash
# 1. Test jumbo frame connectivity between nodes
ping -M do -s 8972 <destination>  # 8972 + 28 ICMP header = 9000 bytes
# If this fails, jumbo frames are not working end-to-end

# 2. Check application socket buffer sizes
sysctl net.core.rmem_max   # Should be at least 16MB for high throughput
sysctl net.core.wmem_max

# Increase if needed
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
sysctl -w net.ipv4.tcp_rmem='4096 87380 16777216'
sysctl -w net.ipv4.tcp_wmem='4096 65536 16777216'
\`\`\`yaml

## Caveats

- Traffic leaving the VPC (internet, VPN, Direct Connect) reverts to 1500-byte MTU at the boundary
- AWS NLB uses 1500-byte MTU for health checks regardless of instance MTU
- EKS/Kubernetes: pod MTU must account for CNI overhead (VPC CNI uses 9001, Flannel VXLAN uses 8951)
- EBS volumes: EBS communication is over the AWS network internally and benefits from jumbo frames automatically`,
      },
    ],
    references: [
      'https://tools.ietf.org/html/rfc1191',
      'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html',
      'https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html',
    ],
    quickFire: [
      { q: 'What is the standard Ethernet MTU?', a: '1500 bytes. This is the maximum IP packet size (including IP header) that can be transmitted over a standard Ethernet link.' },
      { q: 'What is the difference between MTU and MSS?', a: 'MTU is the max IP packet size for a link (1500). MSS is the max TCP payload per segment -- MTU minus IP (20) and TCP (20) headers = 1460 bytes.' },
      { q: "What does the DF (Don't Fragment) bit do?", a: 'It tells routers not to fragment the packet. If the packet is too large, the router drops it and sends ICMP Type 3 Code 4 (Fragmentation Needed) back to the sender.' },
      { q: 'What is Path MTU Discovery (PMTUD)?', a: 'The sender sends DF-bit packets and reduces size in response to ICMP Fragmentation Needed messages until packets fit through all links.' },
      { q: 'How does VXLAN encapsulation affect effective MTU?', a: 'VXLAN adds 50 bytes of overhead. With a 1500-byte underlay MTU, the effective inner MTU is 1450 bytes.' },
      { q: 'What is MSS clamping and how does it fix MTU black holes?', a: 'A router rewrites the MSS in TCP SYN packets to a safe value (e.g., 1410 for VPN with 50-byte overhead), preventing TCP from sending oversized segments.' },
      { q: 'What is a jumbo frame and what MTU does AWS VPC support?', a: 'Frames with MTU > 1500, typically 9000 bytes. AWS VPC supports 9001-byte MTU within a VPC and across VPC peering.' },
      { q: 'Does IPv6 support router fragmentation?', a: 'No. Only the source host can fragment IPv6 packets. PMTUD is mandatory in IPv6 -- blocking ICMPv6 Type 2 Packet Too Big breaks all IPv6 PMTUD.' },
      { q: 'What iptables command clamps MSS to the path MTU automatically?', a: 'iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu' },
      { q: 'Why is filtering ICMP completely a harmful security policy?', a: 'It blocks ICMP Type 3 Fragmentation Needed messages, breaking PMTUD and causing MTU black holes for any path with encapsulation overhead.' },
    ],
  },
  // ─── LOAD BALANCING ────────────────────────────────────────────────────────
  {
    id: 'lb-algorithms',
    title: 'Load Balancing Algorithms',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 6,
    description: 'Round-robin, weighted, least-connections, IP hash, random, power-of-two-choices, and consistent hashing with virtual nodes.',
    visualizations: [],
    introduction: `Load balancing algorithms determine how a load balancer distributes incoming requests across a pool of backend servers. Choosing the wrong algorithm for your traffic pattern causes hot spots, wasted capacity, or session loss.

Round-robin is the simplest: requests cycle through servers in order. It works well when all servers are homogeneous and request cost is uniform. Weighted round-robin assigns a weight to each server proportional to its capacity, so a server with weight 3 receives three requests for every one sent to a server with weight 1.

Least-connections routes each new request to the server with the fewest active connections at that moment. This naturally adapts to variable-cost requests. Weighted least-connections combines both approaches.

IP hash computes a hash of the client IP address and always routes that client to the same server. This provides basic session stickiness without cookies but breaks if the client changes IP (NAT, mobile, VPN) or if a server is added/removed and the hash modulo changes.

Power-of-two choices (P2C) is used in Nginx Plus and Envoy: pick two servers at random, route to the one with fewer active requests. This achieves near-optimal load distribution with O(1) per-request overhead.

Consistent hashing with virtual nodes is used in distributed caches (Memcached, Redis Cluster). Each server is mapped to multiple points on a hash ring. A request key hashes to a position on the ring and is routed to the nearest server clockwise. Adding or removing a server only remaps a fraction of keys. Virtual nodes (vnodes) improve key distribution uniformity by giving each physical server multiple ring positions.`,
    whenToUse: [
      'Selecting a load balancing algorithm for a new service based on traffic characteristics',
      'Explaining why consistent hashing is used in distributed caches instead of modulo hashing',
      'Diagnosing hot spots where one backend server is overloaded while others are idle',
      'Choosing between ALB (round-robin / least-outstanding) and custom HAProxy algorithms',
    ],
    keyConcepts: [
      { term: 'Round-Robin', definition: `Requests are distributed to backends in sequential order. Simple and fair for homogeneous workloads with uniform request cost. No server state is tracked.` },
      { term: 'Least Connections', definition: `New requests are sent to the backend with the fewest active connections. Adapts to heterogeneous request cost — slow requests accumulate connections and the server receives fewer new ones.` },
      { term: 'Consistent Hashing', definition: `Servers are mapped to positions on a hash ring. A key hashes to a ring position and is routed to the nearest server. Adding or removing a server only remaps 1/N of keys, minimizing cache misses on topology changes.` },
      { term: 'Virtual Nodes (Vnodes)', definition: `Each physical server is assigned multiple positions on the hash ring. This improves key distribution uniformity and means that when a server leaves the ring, its load is spread across all remaining servers.` },
      { term: 'Power-of-Two Choices (P2C)', definition: `Pick two candidate backends at random; route to the one with fewer active requests. Achieves near-optimal load distribution in O(1) without tracking global state. Used in Envoy and Nginx Plus.` },
      { term: 'IP Hash', definition: `The client source IP is hashed to determine the backend. Provides basic session affinity without cookies but is fragile under NAT and breaks when backends are added or removed.` },
    ],
    pitfalls: [
      'Using round-robin for requests with highly variable cost — a server handling a 10-second DB query becomes a hot spot. Use least-connections instead.',
      'Using modulo hashing (server = hash(key) % N) in distributed caches — adding or removing one server remaps nearly all keys, causing a cache stampede. Use consistent hashing.',
      'Assuming IP hash provides reliable stickiness — corporate users behind NAT share one IP, so all are pinned to the same backend. Use cookie-based affinity for true session pinning.',
      'Ignoring slow-start when bringing new backends online — adding a server to a least-connections pool immediately routes maximum traffic because it has zero connections. Use nginx or HAProxy slow-start (ramp-up period).',
    ],
    keyQuestions: [
      {
        question: 'Explain consistent hashing and why it is preferred over modulo hashing for distributed caches.',
        answer: `## The Problem with Modulo Hashing

With modulo hashing, server = hash(key) % N. When you add or remove one server, N changes and nearly every key remaps to a different server — causing a cache stampede where all remapped keys miss and hit the database simultaneously.

## Consistent Hashing

Servers are placed on a circular hash ring (0 to 2^32 - 1). A key is hashed to a point on the ring and routed to the first server clockwise. When a server is added or removed, only the keys between that server and its predecessor are remapped — approximately 1/N of keys.

## Virtual Nodes

Without vnodes, servers cluster unevenly on the ring. With 150 vnodes per server, each physical server occupies 150 ring positions, making key distribution statistically uniform. When a server leaves, its load is spread across all remaining servers.

\`\`\`python
import hashlib

class ConsistentHash:
    def __init__(self, servers, vnodes=150):
        self.ring = {}
        self.sorted_keys = []
        for server in servers:
            for i in range(vnodes):
                key = hashlib.md5(f"{server}:{i}".encode()).hexdigest()
                h = int(key, 16)
                self.ring[h] = server
                self.sorted_keys.append(h)
        self.sorted_keys.sort()

    def get_server(self, request_key):
        h = int(hashlib.md5(request_key.encode()).hexdigest(), 16)
        for ring_key in self.sorted_keys:
            if h <= ring_key:
                return self.ring[ring_key]
        return self.ring[self.sorted_keys[0]]
\`\`\`

## Real-World Usage

- Memcached clients use consistent hashing by default
- Redis Cluster uses 16,384 hash slots assigned to nodes
- Cassandra uses consistent hashing for partition key to node mapping
- Envoy and Nginx Plus support consistent hashing for upstream selection`,
      },
      {
        question: 'When would you choose power-of-two choices over least-connections?',
        answer: `## Least-Connections

A centralized load balancer tracks the active connection count per backend and routes to the minimum. This is optimal when one entity has global visibility into all connections.

In a distributed proxy mesh (Envoy sidecar per pod), there is no shared global state. Each proxy only knows its own connection counts, so least-connections decisions based on local state may route to a backend saturated from the perspective of other proxies.

## Power-of-Two Choices (P2C)

Pick two backends uniformly at random. Route to the one with fewer active requests. Using the "balls into bins" mathematical result: P2C achieves O(log log N) maximum load versus O(log N / log log N) for random — exponentially better, and within a constant factor of the global optimum.

\`\`\`go
func (p *p2cBalancer) Pick() *backend {
    a := p.backends[rand.Intn(len(p.backends))]
    b := p.backends[rand.Intn(len(p.backends))]
    if a.activeRequests < b.activeRequests {
        return a
    }
    return b
}
\`\`\`

## When to Use Which

- Use least-connections: centralized load balancer (HAProxy, nginx) with full visibility
- Use P2C: service meshes (Envoy LEAST_REQUEST policy) where no global state exists
- Use round-robin: stateless uniform workloads where simplicity beats optimality
- Use consistent hashing: same key must always reach the same backend (caching, stateful)`,
      },
      {
        question: 'How does nginx implement load balancing, and how do you configure weighted least-connections?',
        answer: `\`\`\`nginx
upstream api_backends {
    least_conn;

    server 10.0.1.10:8080 weight=3 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 weight=3 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 weight=1 max_fails=3 fail_timeout=30s;

    keepalive 32;  # persistent connections per worker
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://api_backends;
        proxy_http_version 1.1;
        proxy_set_header Connection "";  # required for keepalive
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }
}
\`\`\`

## Available Algorithms

- Round-robin: default, no directive needed
- Weighted round-robin: add weight= parameter
- least_conn: route to backend with fewest active connections
- ip_hash: hash client IP for basic affinity
- hash \${variable}: hash on any nginx variable

## Reload Without Downtime

\`\`\`bash
nginx -t && nginx -s reload
\`\`\``,
      },
    ],
    references: [
      'https://nginx.org/en/docs/http/ngx_http_upstream_module.html',
      'https://www.haproxy.org/download/2.8/doc/configuration.txt',
      'https://en.wikipedia.org/wiki/Consistent_hashing',
    ],
    quickFire: [
      { q: 'Which load balancing algorithm is best for heterogeneous request cost?', a: 'Least-connections -- it routes new requests to the server with fewest active connections, naturally adapting to variable-cost workloads.' },
      { q: 'Why is modulo hashing bad for distributed caches?', a: 'Adding or removing one server changes N, remapping nearly all keys to different servers and causing a cache stampede.' },
      { q: 'How does consistent hashing limit remapping when a server is added?', a: 'Only keys between the new server and its predecessor on the hash ring are remapped -- approximately 1/N of total keys.' },
      { q: 'What problem do virtual nodes (vnodes) solve in consistent hashing?', a: 'Without vnodes, servers cluster unevenly on the ring. With 150 vnodes per server, key distribution becomes statistically uniform.' },
      { q: 'What is Power-of-Two Choices (P2C)?', a: 'Pick two backends at random; route to the one with fewer active requests. Achieves near-optimal distribution in O(1) without global state.' },
      { q: 'Why is IP hash unreliable for session affinity?', a: 'Corporate users behind NAT share one IP, pinning all to one backend. IP changes (mobile, VPN) also break the affinity.' },
      { q: 'When does round-robin perform poorly?', a: 'When requests have highly variable processing cost -- a server handling a slow DB query accumulates connections and becomes a hot spot.' },
      { q: 'Which AWS load balancer uses least-outstanding-requests by default?', a: 'ALB supports least outstanding requests as an alternative to round-robin. NLB uses flow hash (source IP/port/dest/proto).' },
      { q: 'What nginx directive enables least-connections load balancing?', a: 'Place least_conn; inside the upstream {} block.' },
      { q: 'Where is consistent hashing used in production systems?', a: 'Memcached clients, Redis Cluster (16,384 hash slots), Cassandra partition key to node mapping, and some CDN request routing.' },
    ],
  },

  {
    id: 'health-checks',
    title: 'Health Checks and Circuit Breaking',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 5,
    description: 'Active vs passive health checks, HTTP 200 probes, TCP checks, intervals and thresholds, and circuit breaker patterns.',
    visualizations: [],
    introduction: `Health checks are the mechanism by which a load balancer determines whether a backend is capable of serving traffic. Without them, requests are sent to dead or degraded backends, resulting in timeouts and errors that the client experiences directly.

Active health checks are periodic requests the load balancer sends to each backend independently of real traffic. A typical HTTP active check sends a GET to /health every 10 seconds. If the backend returns 200 within a timeout window, it is considered healthy. After a configurable number of consecutive failures (the unhealthy threshold — typically 2 or 3), the backend is removed from the rotation. After a number of consecutive successes (the healthy threshold — typically 2), it is reinstated. TCP active checks simply test that the port accepts a connection, which is faster but verifies less.

Passive health checks (circuit breakers) infer health from real traffic. The load balancer or proxy watches response codes and latency on production requests. If a backend returns 5xx errors above a threshold, it is ejected. Envoy's outlier detection is the canonical implementation: if a host returns 5 consecutive 5xx responses, it is ejected for a base ejection time (e.g., 30 seconds), exponentially backing off on repeated ejections.

The circuit breaker pattern has three states: Closed (normal, requests flow through), Open (backend is unhealthy, requests are short-circuited with an error), and Half-Open (a probe request is allowed through to test recovery). Failing fast with a circuit-breaker error is better than letting requests queue up against a dead backend, exhausting thread pools and propagating the failure upstream.

Combining active and passive checks is best practice: active checks catch total failures quickly; passive outlier detection catches partial degradation on a subset of requests.`,
    whenToUse: [
      'Configuring health checks on an AWS ALB target group for an ECS or EC2 service',
      'Implementing circuit breaking in Envoy or Istio service mesh to prevent cascading failures',
      'Tuning health check intervals and thresholds to balance fast failure detection against false positives',
      'Designing a /health endpoint that accurately reflects application readiness',
      'Explaining the difference between liveness and readiness probes in Kubernetes',
    ],
    keyConcepts: [
      { term: 'Active Health Check', definition: `A synthetic probe the load balancer sends to each backend on a fixed interval, independent of real traffic. Detects total outages quickly. Requires a dedicated health endpoint that tests dependencies.` },
      { term: 'Passive Health Check (Outlier Detection)', definition: `Infers health from production traffic. The proxy watches error rates and latency. If a backend exceeds thresholds, it is ejected from the pool. Catches partial degradation that active checks miss.` },
      { term: 'Unhealthy / Healthy Threshold', definition: `Unhealthy threshold: consecutive failures before a backend is removed (e.g., 3). Healthy threshold: consecutive successes before a backend is reinstated (e.g., 2). Prevents flapping.` },
      { term: 'Circuit Breaker States', definition: `Closed: normal operation. Open: backend ejected, requests fail fast. Half-Open: one probe request is allowed to test recovery. Transitions are governed by thresholds and timeouts.` },
      { term: 'Liveness vs Readiness (Kubernetes)', definition: `Liveness probe: is the container alive? Failing it causes a restart. Readiness probe: is the container ready to serve traffic? Failing it removes the pod from the Service endpoints.` },
    ],
    pitfalls: [
      'Health endpoint that always returns 200 — if /health does not check database connectivity or critical dependencies, a backend can pass health checks while serving errors to real users.',
      'Tight intervals with low thresholds causing flapping — a 5-second interval with an unhealthy threshold of 1 removes backends on a single transient timeout. Use 2-3 consecutive failures to absorb network jitter.',
      'Not accounting for startup time — a newly deployed container may not be ready for 30-60 seconds. Set initialDelaySeconds or use readiness probes to prevent premature traffic.',
      'Circuit breaker without fallback — opening the circuit breaker returns errors to callers unless there is a fallback response (cached data, degraded mode). A raw connection refused is worse than a graceful degraded response.',
    ],
    keyQuestions: [
      {
        question: 'How do you configure health checks on an AWS ALB target group, and what makes a good /health endpoint?',
        answer: `\`\`\`bash
aws elbv2 create-target-group \\
  --name my-api-tg \\
  --protocol HTTP --port 8080 \\
  --vpc-id vpc-0abc123 \\
  --health-check-protocol HTTP \\
  --health-check-path /health \\
  --health-check-interval-seconds 15 \\
  --health-check-timeout-seconds 5 \\
  --healthy-threshold-count 2 \\
  --unhealthy-threshold-count 3 \\
  --matcher HttpCode=200
\`\`\`

## What a Good /health Endpoint Checks

\`\`\`javascript
app.get('/health', async (req, res) => {
  const checks = {};
  let status = 200;

  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch (err) {
    checks.database = 'error';
    status = 503;
  }

  try {
    await redis.ping();
    checks.cache = 'ok';
  } catch (err) {
    checks.cache = 'degraded'; // non-critical, do not fail health check
  }

  res.status(status).json({ status: status === 200 ? 'healthy' : 'unhealthy', checks });
});
\`\`\`

## Liveness vs Readiness in Kubernetes

\`\`\`yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 20
  periodSeconds: 5
  failureThreshold: 2
\`\`\``,
      },
      {
        question: 'Explain the circuit breaker pattern and how Envoy implements outlier detection.',
        answer: `## Circuit Breaker States

- Closed: requests flow normally. Failures are counted.
- Open: threshold exceeded. Requests fail immediately without hitting the backend. A timer starts.
- Half-Open: timer expires, one probe request is allowed. Success transitions to Closed; failure resets the timer.

The benefit: short-circuiting returns errors in microseconds, freeing threads that would otherwise queue up against a dead service.

## Envoy Outlier Detection

\`\`\`yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
\`\`\`

## How Ejection Works

1. Host returns 5 consecutive 5xx responses
2. Envoy ejects the host for baseEjectionTime * (ejection count) — exponential backoff
3. After the ejection time expires, the host re-enters the pool (half-open)
4. If it fails again, it is ejected for 2x the previous duration

## Connection-Level Circuit Breaking

\`\`\`yaml
trafficPolicy:
  connectionPool:
    tcp:
      maxConnections: 100
    http:
      http1MaxPendingRequests: 50
      http2MaxRequests: 200
\`\`\`

When these limits are exceeded, Envoy returns 503 immediately rather than queuing.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html',
      'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier',
      'https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/',
      'https://martinfowler.com/bliki/CircuitBreaker.html',
    ],
    quickFire: [
      { q: 'What is the difference between active and passive health checks?', a: 'Active checks are synthetic probes sent on a fixed interval. Passive checks (outlier detection) infer health from production traffic error rates.' },
      { q: 'What are the unhealthy and healthy thresholds on an AWS ALB?', a: 'Unhealthy threshold: consecutive failures before removal (default 3). Healthy threshold: consecutive successes before reinstatement (default 2).' },
      { q: 'What is wrong with a /health endpoint that always returns 200?', a: 'It passes health checks even when the app cannot serve users -- e.g., database is down. Health endpoints must probe critical dependencies.' },
      { q: 'What are the three states of a circuit breaker?', a: 'Closed (normal -- requests flow), Open (backend ejected -- fail fast), Half-Open (one probe request to test recovery).' },
      { q: 'What is the difference between a Kubernetes liveness probe and a readiness probe?', a: 'Liveness failure triggers a container restart. Readiness failure removes the pod from Service endpoints without restarting it.' },
      { q: 'What is Envoy outlier detection?', a: 'A passive health check that ejects a host after N consecutive 5xx errors for an exponentially increasing ejection time.' },
      { q: 'What does Envoy connection pool circuit breaking do?', a: "It returns 503 immediately when the backend's max connections or pending requests are exceeded, rather than queuing indefinitely." },
      { q: 'Why should initialDelaySeconds be set on Kubernetes health probes?', a: 'Containers may need 30-60 seconds to initialize. Without a startup delay, probes fire before the app is ready and cause unnecessary restarts.' },
      { q: 'What happens to a circuit breaker after the ejection timer expires?', a: 'It enters Half-Open state -- one probe request is allowed through. Success moves to Closed; failure resets the ejection timer with exponential backoff.' },
      { q: 'Why combine both active and passive health checks?', a: 'Active checks catch total outages quickly. Passive outlier detection catches partial degradation that affects only a subset of real requests.' },
    ],
  },

  {
    id: 'sticky-sessions',
    title: 'Sticky Sessions',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 4,
    description: 'Cookie-based affinity, source IP hashing, JSESSIONID pinning, and how sticky sessions conflict with horizontal scaling.',
    visualizations: [],
    introduction: `Sticky sessions (also called session affinity) ensure that a client's requests are consistently routed to the same backend server. This is necessary when server-side session state is stored in-process (in memory) rather than in a shared external store. If a subsequent request lands on a different server, that server has no knowledge of the session and the user experiences an authentication failure or lost cart.

Cookie-based affinity is the most common implementation. The load balancer inserts a cookie (e.g., AWSALB on AWS ALB) into the first response. On subsequent requests, the load balancer reads this cookie and routes to the pinned backend.

Source IP hashing is an alternative that requires no cookie insertion. The client IP is hashed to select a backend. This is weaker: clients behind NAT share one IP and all land on the same backend. IP changes (mobile roaming, VPN) break the affinity.

The fundamental problem with sticky sessions is that they undermine horizontal scaling. If a pinned backend is removed (deployment, failure, scale-in), all its pinned clients lose their session. Sticky sessions also complicate blue-green and canary deployments.

The correct long-term solution is to externalize session state to a shared store (Redis, DynamoDB) so any backend can serve any request. Sticky sessions should be treated as a temporary workaround, not an architecture goal.`,
    whenToUse: [
      'Migrating a legacy stateful Java EE or PHP application to a load-balanced deployment without refactoring session handling',
      'Understanding why ALB stickiness must be disabled before autoscaling works correctly',
      'Designing a session migration strategy for a monolith decomposition project',
      'Explaining to a team why an autoscaling event caused user logouts',
    ],
    keyConcepts: [
      { term: 'Cookie-Based Affinity', definition: `The load balancer inserts a cookie (e.g., AWSALB) into the first HTTP response identifying the backend. All subsequent requests carrying the cookie are routed to the same backend. The most reliable form of stickiness.` },
      { term: 'Source IP Hashing', definition: `The client IP address is hashed to select a backend. No cookie required but fragile: NAT concentrates many clients on one backend; IP changes break affinity.` },
      { term: 'JSESSIONID Pinning', definition: `Some load balancers read the JSESSIONID cookie set by the Java application server and use it as the affinity key, avoiding the need to insert a separate load-balancer cookie.` },
      { term: 'Externalized Session State', definition: `Session data stored in a shared external store (Redis, DynamoDB). Any backend can serve any request because session state is not local. Enables true stateless horizontal scaling.` },
    ],
    pitfalls: [
      'Enabling sticky sessions on an autoscaling group — scale-in events terminate instances with pinned sessions, causing forced logouts. Sticky sessions and autoscaling are fundamentally at odds.',
      'Using IP hash behind a NAT gateway or CDN — the load balancer sees the NAT/CDN IP, routing all users through that hop to the same backend. Use cookie affinity instead.',
      'Treating sticky sessions as equivalent to session security — AWSALB cookies are signed but not encrypted. Application-level session tokens are still required for authentication.',
      'Forgetting sticky sessions during blue-green deployments — existing sticky cookies from the old target group are invalid after a traffic cut. Plan for a drain period.',
    ],
    keyQuestions: [
      {
        question: 'How do you enable sticky sessions on an AWS ALB, and what are the tradeoffs?',
        answer: `\`\`\`bash
aws elbv2 modify-target-group-attributes \\
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-tg/abc \\
  --attributes \\
    Key=stickiness.enabled,Value=true \\
    Key=stickiness.type,Value=lb_cookie \\
    Key=stickiness.lb_cookie.duration_seconds,Value=86400
\`\`\`

## How It Works

ALB inserts an AWSALB cookie signed with a key known only to ALB. Subsequent requests are routed to the same registered target. If the target becomes unhealthy, ALB ignores the cookie and routes to a healthy target.

## ALB vs App Cookie Stickiness

- lb_cookie: ALB manages the cookie, duration is wall-clock time
- app_cookie: ALB reads a cookie your app sets (e.g., JSESSIONID) and pins to the backend that set it

## Tradeoffs

Pros: simple fix for stateful legacy apps without code changes.

Cons:
- Breaks autoscaling — scale-in terminates instances with active pinned sessions
- Uneven load distribution — clients with long sessions monopolize backends
- Complicates blue-green deployments
- Masks the real problem — externalize session state to Redis or DynamoDB

## Disable When Sessions Are Externalized

\`\`\`bash
aws elbv2 modify-target-group-attributes \\
  --target-group-arn arn:aws:elasticloadbalancing:... \\
  --attributes Key=stickiness.enabled,Value=false
\`\`\``,
      },
      {
        question: 'A team complains users are being logged out during deployments. What causes this and how do you fix it?',
        answer: `## Common Causes

1. In-memory session state: Sessions stored in the JVM heap or PHP session files. When the instance is terminated, sessions are lost.
2. Sticky sessions with instance replacement: The pinned instance is removed; ALB routes to a new backend with no session data.
3. JWT signing key not shared: Each instance generates its own key; new instances cannot verify tokens from old instances.
4. No connection draining: Old instance terminated before active requests complete.

## Fix: Externalize Session State

\`\`\`javascript
const RedisStore = require('connect-redis')(session);
const redis = require('redis').createClient({ url: process.env.REDIS_URL });

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 86400000 },
}));
\`\`\`

## Fix: Enable Connection Draining

\`\`\`bash
aws elbv2 modify-target-group-attributes \\
  --target-group-arn arn:aws:elasticloadbalancing:... \\
  --attributes Key=deregistration_delay.timeout_seconds,Value=60
\`\`\`

## Fix: Share JWT Signing Key

Store the JWT secret in AWS Secrets Manager or SSM Parameter Store. All instances read the same key at startup.

## Verify

\`\`\`bash
aws elbv2 describe-target-group-attributes \\
  --target-group-arn arn:... | jq '.Attributes[] | select(.Key | contains("stickiness"))'
\`\`\``,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/sticky-sessions.html',
      'https://redis.io/docs/manual/client-side-caching/',
    ],
    quickFire: [
      { q: 'What is session affinity (sticky sessions)?', a: 'A load balancer feature that routes all requests from the same client to the same backend, needed when session state is stored in server memory.' },
      { q: 'What cookie does AWS ALB insert for sticky sessions?', a: 'AWSALB -- a signed cookie identifying the pinned target. It is signed but not encrypted.' },
      { q: 'Why do sticky sessions conflict with autoscaling?', a: 'Scale-in events terminate instances with active pinned sessions, causing forced user logouts. Sticky sessions and autoscaling are fundamentally at odds.' },
      { q: 'What is the correct long-term solution to session affinity requirements?', a: 'Externalize session state to a shared store (Redis, DynamoDB) so any backend can serve any request -- enabling true stateless scaling.' },
      { q: 'Why is source IP hashing unreliable behind a NAT gateway?', a: 'All users behind the NAT share one IP, routing them all to the same backend regardless of load.' },
      { q: 'What is the difference between lb_cookie and app_cookie stickiness on ALB?', a: 'lb_cookie is ALB-managed. app_cookie uses a cookie your application sets (e.g., JSESSIONID) as the affinity key.' },
      { q: 'What causes user logouts during a blue-green deployment with sticky sessions?', a: 'AWSALB cookies from the old target group are invalid after traffic cuts to the new group. A drain period is needed.' },
      { q: 'What ALB setting should be configured to allow in-flight requests to complete before deregistering a target?', a: 'deregistration_delay.timeout_seconds (default 300s) -- allows existing connections to drain before the target is removed.' },
      { q: 'Why is a JWT signing key stored in Secrets Manager instead of per-instance?', a: 'All instances must verify tokens signed by any previous instance. A per-instance key means new instances cannot validate old tokens, causing logouts.' },
      { q: 'Name the two ALB stickiness types.', a: 'lb_cookie (ALB manages the cookie and duration) and app_cookie (ALB reads your application-set cookie as the affinity key).' },
    ],
  },

  {
    id: 'anycast',
    title: 'Anycast Routing',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 4,
    description: 'Same IP announced from multiple PoPs, BGP selects closest, DDoS resilience, and how 1.1.1.1 and 8.8.8.8 work.',
    visualizations: [],
    introduction: `Anycast is a network addressing and routing method where the same IP address is announced from multiple geographically distributed locations (Points of Presence, or PoPs). BGP selects the "closest" PoP based on AS path length and routing policy, so a client in Tokyo reaches the Tokyo PoP while a client in Frankfurt reaches the Frankfurt PoP — both using the same destination IP.

The mechanism works through BGP route announcements. Each PoP originates a BGP route for the same prefix (e.g., 1.1.1.1/32). BGP routers on the Internet receive multiple paths to the same prefix and select the best path based on the BGP decision process — typically shortest AS path, then lowest MED.

Anycast is the foundation of the public DNS infrastructure. Cloudflare's 1.1.1.1, Google's 8.8.8.8, and all 13 DNS root server clusters use anycast. Every DNS resolver in the world reaches its nearest instance, distributing the query load globally.

DDoS resilience is a key operational benefit: a volumetric attack (e.g., 1 Tbps UDP flood) is absorbed across all PoPs simultaneously rather than overwhelming a single IP's physical infrastructure. Cloudflare Magic Transit, AWS Global Accelerator, and Akamai all use anycast as the core mechanism for DDoS absorption.

The tradeoff is that anycast is not designed for TCP sessions that span routing changes: if a client's traffic shifts to a different PoP mid-session (due to BGP convergence), the TCP connection breaks. This makes anycast ideal for stateless protocols (DNS/UDP) and short-lived TCP connections.`,
    whenToUse: [
      'Designing a globally distributed DNS or API endpoint that routes users to the nearest PoP',
      'Explaining how DDoS scrubbing services absorb volumetric attacks across multiple locations',
      'Comparing anycast with GeoDNS as strategies for latency reduction',
      'Understanding how AWS Global Accelerator and Cloudflare Magic Transit work under the hood',
    ],
    keyConcepts: [
      { term: 'Anycast', definition: `A routing scheme where the same IP prefix is announced from multiple locations. BGP routes each client to the topologically nearest PoP. Used by DNS resolvers, CDNs, and DDoS scrubbing services.` },
      { term: 'BGP Route Announcement', definition: `Each PoP uses BGP to advertise the anycast prefix to its upstream ISPs. The rest of the Internet learns multiple paths to the same prefix and each router selects the best path based on AS path length and policy.` },
      { term: 'PoP (Point of Presence)', definition: `A physical location where a network operator has deployed servers and BGP routing infrastructure. Each PoP independently announces the anycast prefix and handles traffic routed to it.` },
      { term: 'GeoDNS vs Anycast', definition: `GeoDNS returns different A records based on the resolver's IP geolocation. It requires DNS TTL expiry to reroute. Anycast routes at the IP layer with no DNS dependency and is faster to converge.` },
      { term: 'DDoS Absorption via Anycast', definition: `A volumetric DDoS targeting an anycast IP is spread across all PoPs simultaneously. Each PoP absorbs a fraction of the attack traffic, preventing any single location from being overwhelmed.` },
    ],
    pitfalls: [
      'Using anycast for long-lived TCP sessions — BGP path changes shift a client to a different PoP mid-session, breaking the TCP connection. Anycast is best for UDP or short-lived TCP.',
      'Assuming BGP selects the geographically closest PoP — BGP selects the shortest AS path, which correlates with geography but is not identical.',
      'Not monitoring per-PoP traffic distribution — anycast can create asymmetric load. Each PoP must be capacity-planned independently.',
      'Confusing anycast with load balancing — anycast routes at the network layer and selects one PoP per client. Within a PoP, a separate load balancer distributes requests across individual servers.',
    ],
    keyQuestions: [
      {
        question: 'How does anycast work, and how does it provide DDoS resilience?',
        answer: `## How Anycast Works

In unicast, each IP address is assigned to exactly one location. In anycast, the same IP prefix is assigned to multiple locations and each announces the prefix via BGP.

Cloudflare operates 1.1.1.1 from 300+ PoPs. Each PoP announces the route 1.1.1.1/32. A DNS resolver in Singapore reaches the Singapore PoP; a resolver in London reaches the London PoP — both querying the same IP.

\`\`\`bash
# traceroute to 1.1.1.1 from different locations gives different final hops
traceroute 1.1.1.1
# From US East: terminates at Cloudflare Atlanta or Ashburn PoP
# From Tokyo: terminates at Cloudflare Tokyo or Osaka PoP
\`\`\`

## BGP Mechanics

Each PoP originates:
\`\`\`
BGP UPDATE: NLRI 1.1.1.1/32, AS_PATH: [13335], NEXT_HOP: <PoP BGP peer IP>
\`\`\`

The Internet converges so each router has a path to 1.1.1.1 terminating at the nearest PoP.

## DDoS Resilience

A 1 Tbps UDP flood targeting 1.1.1.1 is distributed across all PoPs by anycast routing. If Cloudflare has 300 PoPs each with 100 Gbps capacity, total capacity is 30 Tbps. A 1 Tbps attack is a small fraction. Each PoP also runs scrubbing (rate limiting, SYN cookies, BPF filtering).

## Limitations

- Not suitable for long-lived stateful TCP sessions
- BGP path != shortest physical distance
- Requires BGP infrastructure`,
      },
      {
        question: 'Compare anycast with GeoDNS. When would you use each?',
        answer: `## GeoDNS

Returns different DNS A records based on the geographic location of the DNS resolver making the query.

\`\`\`bash
# Route 53 latency-based routing
aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "api.example.com", "Type": "A",
      "Region": "us-east-1", "SetIdentifier": "us-east-1",
      "TTL": 60, "ResourceRecords": [{"Value": "1.2.3.4"}]
    }
  }]
}'
\`\`\`

## Comparison

| Dimension | GeoDNS | Anycast |
|-----------|--------|---------|
| Resolution layer | DNS (Layer 7) | IP routing (Layer 3) |
| Failover time | DNS TTL (60-300s) | BGP convergence (seconds) |
| Protocol support | Any | Best for UDP, short TCP |
| Requires BGP | No | Yes |
| Cost | Lower | Higher |

## When to Use GeoDNS

- Routing HTTP/HTTPS traffic to regional endpoints (most web applications)
- When you lack BGP infrastructure (most organizations)
- AWS Route 53 latency routing is a practical GeoDNS implementation

## When to Use Anycast

- DNS resolver infrastructure (Cloudflare 1.1.1.1, Google 8.8.8.8)
- DDoS scrubbing services where attack absorption must happen at Layer 3
- Services where BGP convergence speed (seconds) matters more than DNS TTL (minutes)`,
      },
    ],
    references: [
      'https://www.cloudflare.com/learning/cdn/glossary/anycast-network/',
      'https://aws.amazon.com/global-accelerator/',
      'https://datatracker.ietf.org/doc/html/rfc4786',
    ],
    quickFire: [
      { q: 'What makes anycast different from unicast routing?', a: 'The same IP prefix is announced from multiple locations simultaneously. BGP routes each client to the topologically nearest PoP.' },
      { q: 'How does anycast provide DDoS resilience?', a: 'A volumetric attack targeting the anycast IP is spread across all PoPs simultaneously. Each absorbs a fraction -- total capacity far exceeds a typical attack.' },
      { q: 'Why is anycast ideal for DNS but problematic for long-lived TCP sessions?', a: 'If a BGP path change shifts traffic to a different PoP mid-session, the TCP connection breaks. DNS uses UDP with short transactions.' },
      { q: 'What does each PoP announce to the internet for anycast to work?', a: 'A BGP UPDATE advertising the same IP prefix (e.g., 1.1.1.1/32), routing each client to the nearest PoP via shortest AS path.' },
      { q: 'Name two public DNS resolvers that use anycast.', a: 'Cloudflare 1.1.1.1 and Google 8.8.8.8 both use anycast to route queries to the nearest PoP globally.' },
      { q: 'Does BGP route to the geographically closest PoP?', a: 'Not exactly -- BGP selects the shortest AS path, which correlates with geography but is not identical. A shorter physical distance may have a longer AS path.' },
      { q: 'What AWS service uses anycast to accelerate global traffic?', a: 'AWS Global Accelerator -- it provides static anycast IP addresses that route to the nearest AWS edge location.' },
      { q: 'What is the difference between anycast and GeoDNS?', a: 'Anycast routes at Layer 3 (IP); GeoDNS routes at Layer 7 (DNS). Anycast failover takes seconds (BGP convergence); GeoDNS takes DNS TTL minutes.' },
      { q: 'What infrastructure is required to deploy anycast?', a: 'BGP peering with upstream ISPs at multiple geographic PoPs -- not available to most organizations without significant network infrastructure.' },
      { q: 'Within a PoP, how is traffic distributed across individual servers?', a: 'A separate load balancer (L4 or L7) distributes requests across servers within the PoP. Anycast only selects the PoP.' },
    ],
  },

  {
    id: 'nginx-haproxy',
    title: 'nginx and HAProxy Configuration',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 6,
    description: 'nginx upstream blocks and proxy_pass directives, HAProxy ACLs and backend pools, stats page, and connection limit tuning.',
    visualizations: [],
    introduction: `nginx and HAProxy are the two dominant open-source load balancers and reverse proxies used in production infrastructure.

nginx was designed as a high-performance web server and reverse proxy. Its event-driven, asynchronous architecture handles tens of thousands of concurrent connections per worker process with low memory overhead. nginx excels at HTTP/HTTPS proxying, SSL termination, static file serving, caching, rate limiting, and gzip compression — a full layer-7 feature set in one binary.

HAProxy (High Availability Proxy) is a dedicated TCP and HTTP proxy built specifically for load balancing. It has the richest feature set for traffic management: a powerful ACL system that can inspect any field in a TCP or HTTP request, health checking with fine-grained control, connection draining, and a real-time statistics interface. HAProxy's configuration model separates concerns cleanly into frontend (listen), backend (server pool), and defaults sections.

Key differences: nginx is a web server that also does load balancing, making it a natural choice when the proxy also serves static content or needs caching. HAProxy is a pure proxy with no web server capability, making it more focused for complex routing requirements.

Both support keepalive connections to backends (critical for performance), TLS termination, and health checks. Both are used at massive scale: nginx runs on a large fraction of all web servers; HAProxy routes traffic at major social networks and financial institutions.`,
    whenToUse: [
      'Configuring a reverse proxy and load balancer for a multi-instance Node.js or Python application',
      'Writing HAProxy ACL rules to route traffic based on URL path, Host header, or source IP',
      'Tuning worker_connections and keepalive settings for high-throughput nginx deployments',
      'Setting up the HAProxy stats page for real-time backend health monitoring',
      'Comparing nginx and HAProxy for a new infrastructure decision',
      'Implementing rate limiting and connection limits to protect backend services',
    ],
    keyConcepts: [
      { term: 'nginx upstream block', definition: `Defines a named group of backend servers with their load balancing algorithm, weights, and health check parameters. Referenced by proxy_pass in server/location blocks.` },
      { term: 'HAProxy frontend/backend split', definition: `frontend defines what HAProxy listens on (IP, port, ACL rules, default backend). backend defines the pool of servers, algorithm, and health checks. This separation makes routing logic explicit and testable.` },
      { term: 'HAProxy ACL', definition: `Named conditions that match request attributes (URL path, HTTP method, header values, source IP). ACLs can be combined with AND/OR logic and used to select backends, block requests, or redirect traffic.` },
      { term: 'proxy_pass', definition: `nginx directive that forwards a request to an upstream group or a specific server. When pointing to an upstream block name, the upstream's algorithm applies.` },
      { term: 'keepalive (to backends)', definition: `Maintaining persistent TCP connections to backends rather than opening a new connection per request. Eliminates TCP handshake overhead. nginx uses keepalive N in upstream blocks.` },
      { term: 'HAProxy stats page', definition: `A built-in real-time HTTP dashboard showing backend health, current connections, request rate, error counts, and session statistics per server. Accessible via a dedicated frontend on a management port.` },
    ],
    pitfalls: [
      'Not configuring keepalive connections to backends — without keepalive, nginx or HAProxy opens a new TCP connection for every proxied request. At high traffic this exhausts ephemeral ports and adds latency.',
      'Forgetting proxy_http_version 1.1 with keepalive — nginx defaults to HTTP/1.0 for backend requests, which does not support keepalive. You must explicitly set proxy_http_version 1.1 and proxy_set_header Connection "".',
      'Setting worker_connections too low in nginx — the default is 1024. In high-traffic deployments, set worker_connections = 10000+ and ensure the OS file descriptor limit (ulimit -n) matches.',
      'HAProxy sending requests to a degraded backend — too-lenient health check thresholds mean error traffic continues flowing. Tune rise/fall to detect failures quickly.',
    ],
    keyQuestions: [
      {
        question: 'Write an nginx configuration for load balancing a Node.js API across four backends with health checks, keepalive, and rate limiting.',
        answer: `\`\`\`nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 10000;
    use epoll;
    multi_accept on;
}

http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    upstream node_api {
        least_conn;
        server 10.0.1.10:3000 weight=1 max_fails=3 fail_timeout=30s;
        server 10.0.1.11:3000 weight=1 max_fails=3 fail_timeout=30s;
        server 10.0.1.12:3000 weight=1 max_fails=3 fail_timeout=30s;
        server 10.0.1.13:3000 weight=1 max_fails=3 fail_timeout=30s;
        keepalive 64;
        keepalive_timeout 60s;
    }

    server {
        listen 443 ssl http2;
        server_name api.example.com;

        ssl_certificate     /etc/ssl/certs/api.crt;
        ssl_certificate_key /etc/ssl/private/api.key;
        ssl_protocols       TLSv1.2 TLSv1.3;

        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            limit_conn conn_limit 10;

            proxy_pass http://node_api;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

            proxy_connect_timeout 5s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;

            proxy_next_upstream error timeout http_500 http_502 http_503;
            proxy_next_upstream_tries 2;
        }

        location /health {
            access_log off;
            return 200 "OK";
        }
    }
}
\`\`\`

## Key Settings

- least_conn: routes to backend with fewest active connections
- max_fails=3 fail_timeout=30s: backend removed after 3 failures in 30s
- keepalive 64: each worker maintains up to 64 idle persistent connections
- proxy_http_version 1.1 + Connection "": required for keepalive to backends
- proxy_next_upstream: retry on another backend on error or timeout

\`\`\`bash
nginx -t && nginx -s reload
\`\`\``,
      },
      {
        question: 'How do you configure HAProxy with ACLs to route /api/* to one backend and /static/* to another?',
        answer: `\`\`\`haproxy
global
    maxconn 50000
    log /dev/log local0
    stats socket /run/haproxy/admin.sock mode 660 level admin

defaults
    log global
    mode http
    option httplog
    option forwardfor
    option http-server-close
    timeout connect 5s
    timeout client  30s
    timeout server  30s

listen stats
    bind *:9000
    stats enable
    stats uri /stats
    stats refresh 5s
    stats auth admin:supersecret

frontend http_in
    bind *:80
    bind *:443 ssl crt /etc/haproxy/certs/example.pem alpn h2,http/1.1
    redirect scheme https code 301 if !{ ssl_fc }

    acl is_api    path_beg /api/
    acl is_static path_beg /static/

    use_backend api_servers    if is_api
    use_backend static_servers if is_static
    default_backend api_servers

backend api_servers
    balance leastconn
    option httpchk GET /health HTTP/1.1
    http-check expect status 200
    server api1 10.0.1.10:3000 check inter 10s rise 2 fall 3 maxconn 500
    server api2 10.0.1.11:3000 check inter 10s rise 2 fall 3 maxconn 500
    server api3 10.0.1.12:3000 check inter 10s rise 2 fall 3 maxconn 500

backend static_servers
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    server static1 10.0.2.10:8080 check inter 15s rise 2 fall 2
    server static2 10.0.2.11:8080 check inter 15s rise 2 fall 2
\`\`\`

## Runtime Management

\`\`\`bash
# Drain a backend gracefully
echo "set server api_servers/api1 state drain" | socat stdio /run/haproxy/admin.sock

# Re-enable
echo "set server api_servers/api1 state ready" | socat stdio /run/haproxy/admin.sock

# Reload without dropping connections
haproxy -f /etc/haproxy/haproxy.cfg -p /run/haproxy.pid -sf $(cat /run/haproxy.pid)
\`\`\``,
      },
    ],
    references: [
      'https://nginx.org/en/docs/http/ngx_http_upstream_module.html',
      'https://www.haproxy.com/documentation/haproxy-configuration-manual/',
      'https://www.haproxy.org/download/2.8/doc/management.txt',
    ],
    quickFire: [
      { q: 'What nginx directive is required for keepalive connections to backends?', a: 'proxy_http_version 1.1 and proxy_set_header Connection "" are required alongside keepalive N in the upstream block.' },
      { q: "What does HAProxy's frontend/backend split provide that nginx upstream blocks do not?", a: 'A clean separation between listen configuration (frontend) and server pool (backend), making complex routing rules explicit and testable.' },
      { q: 'How do you perform a zero-downtime HAProxy reload?', a: 'haproxy -f /etc/haproxy/haproxy.cfg -p /run/haproxy.pid -sf $(cat /run/haproxy.pid) -- the -sf flag gracefully terminates the old process.' },
      { q: 'What is the nginx directive for least-connections load balancing?', a: 'Place least_conn; inside the upstream {} block.' },
      { q: 'How does nginx rate limiting work?', a: 'limit_req_zone defines a shared memory zone tracking requests per key (e.g., $binary_remote_addr). limit_req applies the zone with burst tolerance.' },
      { q: 'What does max_fails and fail_timeout do in an nginx upstream server?', a: 'After max_fails failures within fail_timeout seconds, the server is marked unavailable for fail_timeout seconds.' },
      { q: 'What HAProxy directive routes traffic based on URL path?', a: 'acl is_api path_beg /api/ -- then use_backend api_servers if is_api in the frontend block.' },
      { q: 'Why is worker_connections important in nginx and what should it be set to?', a: 'It limits concurrent connections per worker process. Default 1024 is too low for high-traffic deployments -- set to 10000+ with matching OS ulimit -n.' },
      { q: 'What is the HAProxy stats page and how do you access it?', a: 'A built-in real-time HTTP dashboard showing backend health and request rates. Expose it via a separate frontend listener on a management port.' },
      { q: 'What nginx directive makes it retry a failed request on another upstream server?', a: 'proxy_next_upstream error timeout http_500 http_502 http_503; with proxy_next_upstream_tries to limit retries.' },
    ],
  },

  // ─── FIREWALLS ──────────────────────────────────────────────────────────────
  {
    id: 'iptables-nftables',
    title: 'iptables and nftables',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'Netfilter chains (INPUT/OUTPUT/FORWARD/PREROUTING/POSTROUTING), tables (filter/nat/mangle), rule evaluation order, and nft syntax.',
    visualizations: [],
    introduction: `iptables and nftables are the primary tools for configuring the Linux kernel's packet filtering framework, Netfilter. Every major Linux firewall, container networking system, and cloud hypervisor ultimately uses Netfilter under the hood — Docker, Kubernetes (kube-proxy), and UFW all write iptables rules or nftables rules.

Netfilter uses the concept of tables and chains. The filter table handles allow/drop decisions. The nat table handles Network Address Translation (SNAT, DNAT, masquerade). The mangle table modifies packet headers (TTL, DSCP, marks). The raw table is evaluated first and can exempt packets from connection tracking.

Within each table, chains represent hook points in the packet processing path. The INPUT chain processes packets destined for the local machine. The OUTPUT chain processes packets originating from the local machine. The FORWARD chain processes packets being routed through the machine. The PREROUTING chain is evaluated before routing decisions — this is where DNAT happens. The POSTROUTING chain is evaluated after routing decisions — this is where SNAT and masquerade happen.

Rules within a chain are evaluated sequentially from top to bottom. The first matching rule applies its target (ACCEPT, DROP, REJECT, LOG, DNAT, SNAT, RETURN, a user-defined chain). If no rule matches, the chain's default policy applies.

nftables replaced iptables as the default in most Linux distributions starting around kernel 5.2. nftables has a cleaner syntax, a single binary (nft) replacing iptables/ip6tables/arptables/ebtables, atomic rule replacement, and better performance for large rulesets.`,
    whenToUse: [
      'Debugging connectivity issues caused by firewall rules on a Linux server or container host',
      'Writing firewall rules to restrict inbound/outbound traffic on an EC2 instance or on-premises server',
      'Understanding how Docker and Kubernetes (kube-proxy) use iptables for NAT and service routing',
      'Migrating a server from iptables to nftables',
      'Implementing port forwarding (DNAT) for a service exposed through a Linux router',
    ],
    keyConcepts: [
      { term: 'Tables', definition: `Groups of chains organized by function. filter: allow/drop. nat: address translation. mangle: packet header modification. raw: connection tracking exemption. Each table has its own set of valid chains.` },
      { term: 'Chains', definition: `Ordered lists of rules evaluated at a specific hook point. Built-in chains: INPUT (to local), OUTPUT (from local), FORWARD (through), PREROUTING (before routing), POSTROUTING (after routing). User-defined chains act as subroutines.` },
      { term: 'Rule evaluation order', definition: `Rules are evaluated top-to-bottom. The first matching rule applies its target. No further rules are checked after a terminal target (ACCEPT, DROP, REJECT). RETURN exits a user-defined chain back to the calling chain.` },
      { term: 'Connection tracking (conntrack)', definition: `Netfilter tracks the state of TCP connections and UDP sessions. States: NEW, ESTABLISHED, RELATED, INVALID. Stateful rules use -m conntrack --ctstate ESTABLISHED,RELATED to allow return traffic.` },
      { term: 'DNAT and SNAT', definition: `DNAT (Destination NAT) changes the destination IP/port. Applied in PREROUTING. Used for port forwarding. SNAT changes the source IP. Applied in POSTROUTING. MASQUERADE is SNAT using the outgoing interface's IP automatically.` },
      { term: 'nftables', definition: `The successor to iptables. Uses a single binary (nft), supports atomic rule replacement, has set and map data structures for efficient matching, and handles IPv4, IPv6, ARP, and bridge filtering in one framework.` },
    ],
    pitfalls: [
      'Adding an ACCEPT rule but forgetting the DROP default policy — if the chain default is ACCEPT, all unmatched traffic is allowed. Always set a default DROP policy and explicitly allow required traffic.',
      'Rule order mistakes — a broad ACCEPT rule before a specific DROP rule makes the DROP unreachable. Use iptables -L -n --line-numbers; insert rules with -I (insert at position) not -A (append).',
      'Losing SSH access by applying a DROP default policy — always insert an ACCEPT rule for port 22 from your management IP before setting -P INPUT DROP.',
      'iptables rules not surviving reboot — rules are in-memory only. Use iptables-save > /etc/iptables/rules.v4 and iptables-persistent to reload on boot.',
      'Conflicting rules from Docker — Docker uses the DOCKER chain. Flushing all rules (iptables -F) breaks Docker networking. Always use the DOCKER-USER chain for custom rules.',
    ],
    keyQuestions: [
      {
        question: 'Walk through how iptables processes a packet and explain the table and chain evaluation order.',
        answer: `## Netfilter Hook Points

### Inbound packet to local process:
1. PREROUTING (raw, mangle, nat)
2. Routing decision
3. INPUT (mangle, filter)
4. Local process receives packet

### Forwarded packet (router/NAT gateway):
1. PREROUTING (raw, mangle, nat)
2. Routing decision
3. FORWARD (mangle, filter)
4. POSTROUTING (mangle, nat)

### Outbound packet from local process:
1. Routing decision
2. OUTPUT (raw, mangle, nat, filter)
3. POSTROUTING (mangle, nat)

## Table Order at Each Hook

- PREROUTING: raw then mangle then nat
- INPUT: mangle then filter
- FORWARD: mangle then filter
- OUTPUT: raw then mangle then nat then filter
- POSTROUTING: mangle then nat

## Practical Example: Port Forwarding

\`\`\`bash
# DNAT: forward external port 8080 to internal server 10.0.1.10:80
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 10.0.1.10:80

# Allow forwarding of the translated packets
iptables -A FORWARD -p tcp -d 10.0.1.10 --dport 80 \\
  -m conntrack --ctstate NEW,ESTABLISHED,RELATED -j ACCEPT

# MASQUERADE so return packets route back through this machine
iptables -t nat -A POSTROUTING -p tcp -d 10.0.1.10 --dport 80 -j MASQUERADE

# Verify
iptables -t nat -L PREROUTING -n -v
\`\`\``,
      },
      {
        question: 'Write a minimal iptables ruleset for a web server that allows SSH, HTTP, HTTPS, and established traffic, and drops everything else.',
        answer: `\`\`\`bash
#!/bin/bash
iptables -F && iptables -X && iptables -Z

iptables -P INPUT ACCEPT   # start permissive, tighten below
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established and related connections (return traffic)
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow ICMP ping
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# Allow SSH from management CIDR only
iptables -A INPUT -p tcp -s 203.0.113.0/24 --dport 22 \\
  -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# Allow HTTP and HTTPS
iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# Log and drop everything else
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "iptables DROP: " --log-level 4
iptables -A INPUT -j DROP

# Set default DROP policy
iptables -P INPUT DROP

# Persist
iptables-save > /etc/iptables/rules.v4
\`\`\`

## Equivalent nftables

\`\`\`bash
nft flush ruleset
nft add table ip filter
nft add chain ip filter input { type filter hook input priority 0 \; policy drop \; }
nft add chain ip filter output { type filter hook output priority 0 \; policy accept \; }

nft add rule ip filter input iif lo accept
nft add rule ip filter input ct state established,related accept
nft add rule ip filter input ip protocol icmp accept
nft add rule ip filter input ip saddr 203.0.113.0/24 tcp dport 22 ct state new,established accept
nft add rule ip filter input tcp dport { 80, 443 } ct state new,established accept
nft add rule ip filter input limit rate 5/minute log prefix '"nft DROP: "' drop

nft list ruleset > /etc/nftables.conf
\`\`\``,
      },
      {
        question: 'How does Docker use iptables, and why should you never flush all iptables rules on a Docker host?',
        answer: `## How Docker Uses iptables

Docker inserts iptables rules to manage container networking:

1. nat PREROUTING: the DOCKER chain DNATs published port traffic to container IP:port
2. filter FORWARD: DOCKER-ISOLATION chains enforce network isolation between Docker networks

\`\`\`bash
iptables -t nat -L -n -v   # see DOCKER chain with DNAT rules
iptables -L FORWARD -n -v  # see DOCKER-ISOLATION chains
\`\`\`

## Why You Must Not Flush All Rules

\`\`\`bash
# DO NOT DO THIS on a Docker host:
iptables -F         # destroys DOCKER, DOCKER-USER, DOCKER-ISOLATION chains
iptables -t nat -F

# Result: all container port publishing breaks, inter-container communication breaks,
# and Docker does not automatically recreate rules until daemon restart
\`\`\`

## The DOCKER-USER Chain

DOCKER-USER is called before DOCKER and is not managed by Docker. Put your custom rules here.

\`\`\`bash
# Allow only specific source IPs to access a published port
iptables -I DOCKER-USER -p tcp --dport 8080 ! -s 10.0.0.0/8 -j DROP

# Block all external access, allow internal subnet
iptables -I DOCKER-USER -i eth0 -j DROP
iptables -I DOCKER-USER -i eth0 -s 10.0.0.0/8 -j RETURN
\`\`\`

## Safe Rule Management on Docker Hosts

- Never use iptables -F; target specific chains instead
- Always use DOCKER-USER for custom rules
- Use docker network inspect to understand bridge IPs and CIDR ranges`,
      },
    ],
    references: [
      'https://www.netfilter.org/documentation/',
      'https://wiki.nftables.org/wiki-nftables/index.php/Main_Page',
      'https://docs.docker.com/network/iptables/',
    ],
    quickFire: [
      { q: 'What are the five built-in Netfilter chains and where are they evaluated?', a: 'INPUT (to local process), OUTPUT (from local process), FORWARD (through the machine), PREROUTING (before routing decision), POSTROUTING (after routing decision).' },
      { q: 'Which table and chain handles DNAT (port forwarding)?', a: 'nat table, PREROUTING chain -- evaluated before the routing decision so the destination can be rewritten before the packet is routed.' },
      { q: 'Which table and chain handles SNAT and MASQUERADE?', a: 'nat table, POSTROUTING chain -- evaluated after routing, once the outgoing interface is known.' },
      { q: 'What is the default iptables policy and how do you change it to DROP?', a: 'Default is ACCEPT. Use iptables -P INPUT DROP -- always insert ALLOW rules for SSH first or you will lock yourself out.' },
      { q: 'What conntrack states allow return traffic without explicit rules?', a: 'ESTABLISHED and RELATED -- use -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT to allow return traffic statefully.' },
      { q: 'Why should you never run iptables -F on a Docker host?', a: 'It destroys the DOCKER, DOCKER-USER, and DOCKER-ISOLATION chains, breaking all container port publishing and inter-container networking.' },
      { q: 'What is the DOCKER-USER chain and why is it the right place for custom rules?', a: 'DOCKER-USER is called before the DOCKER chain and is not managed by Docker -- custom rules here persist through Docker daemon restarts.' },
      { q: 'How does nftables differ from iptables?', a: 'Single binary (nft), atomic rule replacement, built-in set/map data structures for efficient matching, handles IPv4/IPv6/ARP/bridge in one framework.' },
      { q: 'How do you make iptables rules survive a reboot?', a: 'Run iptables-save > /etc/iptables/rules.v4 and install iptables-persistent to reload rules at boot.' },
      { q: 'In what order are tables evaluated at the PREROUTING hook?', a: 'raw, then mangle, then nat -- raw first so it can exempt packets from connection tracking before other tables process them.' },
    ],
  },

  {
    id: 'aws-security-groups',
    title: 'AWS Security Groups',
    icon: 'shield',
    color: '#ef4444',
    questions: 5,
    description: 'Stateful filtering, inbound/outbound rules, port ranges, security group references as sources, and no-deny-rule model.',
    visualizations: [],
    introduction: `AWS Security Groups are the primary layer of network access control for EC2 instances, RDS databases, Lambda functions in VPCs, ECS tasks, and most other AWS resources that have network interfaces (ENIs).

A security group is a stateful virtual firewall attached to an ENI. Stateful means that if you allow inbound traffic on port 443, the return traffic is automatically allowed without any outbound rule. The connection tracking is handled by the underlying hypervisor.

Security groups operate on an implicit-deny model: there are no explicit deny rules. All traffic is denied by default, and rules only add allow entries. You cannot write a security group rule that denies a specific IP. If you need explicit deny, use a Network ACL. By default, a new security group allows all outbound traffic.

The most powerful feature is the ability to use another security group as the source or destination of a rule. This means you can write rules like "allow port 3306 from anything in the web-tier security group" — as instances join or leave that group, the rule automatically applies without any IP management. This is the idiomatic AWS pattern for inter-tier communication.

Security groups are applied at the ENI level. A single ENI can have up to 5 security groups applied simultaneously. An instance can have multiple ENIs, each with its own set of security groups.`,
    whenToUse: [
      'Designing security group rules for a three-tier web application (ALB, EC2, RDS)',
      'Explaining the difference between security groups and NACLs',
      'Troubleshooting connectivity between EC2 instances in the same VPC',
      'Implementing least-privilege network access for microservices in ECS',
      'Auditing security group rules for overly permissive access (0.0.0.0/0 on sensitive ports)',
    ],
    keyConcepts: [
      { term: 'Stateful filtering', definition: `Return traffic for allowed connections is automatically permitted without an explicit outbound rule. Connection tracking happens at the hypervisor level. This is the key difference from NACLs, which require explicit rules in both directions.` },
      { term: 'Implicit deny model', definition: `All traffic is denied by default. Rules only ADD allow entries — there are no deny rules in security groups. To block specific traffic you must use NACLs or not add an allow rule.` },
      { term: 'Security group as source/destination', definition: `Instead of a CIDR range, a rule can reference another security group ID. Traffic from any ENI with that security group attached is allowed. This eliminates IP management for dynamic environments.` },
      { term: 'ENI attachment', definition: `Security groups are applied to Elastic Network Interfaces. Up to 5 security groups per ENI, up to 60 inbound and 60 outbound rules per security group (default, adjustable via Service Quotas).` },
      { term: 'Default security group', definition: `Every VPC has a default security group that allows all inbound from itself and all outbound. Avoid using the default in production; create named, purpose-specific security groups.` },
    ],
    pitfalls: [
      'Opening port 0-65535 from 0.0.0.0/0 — this effectively disables network-level isolation. Only open specific ports from specific sources, and use security group references for internal traffic.',
      'Relying solely on security groups without NACLs — if an instance is compromised, security groups do not block outbound connections (default allows all outbound). Use NACLs for stateless deny rules.',
      'Security group sprawl — over time, environments accumulate dozens of security groups with overlapping rules and undocumented purposes. Use resource tags, AWS Config rules, and regular audits.',
    ],
    keyQuestions: [
      {
        question: 'Design security groups for a three-tier application: ALB, EC2 web tier, and RDS database.',
        answer: `## Architecture

Internet -> ALB -> EC2 (web tier) -> RDS (database tier)

\`\`\`bash
# 1. ALB Security Group: allow HTTP and HTTPS from the Internet
aws ec2 authorize-security-group-ingress --group-id sg-alb --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id sg-alb --protocol tcp --port 443 --cidr 0.0.0.0/0

# 2. EC2 Web Tier: only allow from ALB security group
aws ec2 authorize-security-group-ingress --group-id sg-web --protocol tcp --port 8080 --source-group sg-alb

# SSH from bastion only
aws ec2 authorize-security-group-ingress --group-id sg-web --protocol tcp --port 22 --source-group sg-bastion

# 3. RDS: only allow from web tier security group
aws ec2 authorize-security-group-ingress --group-id sg-rds --protocol tcp --port 3306 --source-group sg-web
\`\`\`

## Why Security Group References

By using sg IDs as sources:
- New EC2 instances added to sg-web automatically get RDS access
- Terminated instances automatically lose access
- No IP address management required
- Works correctly with autoscaling

## Verify

\`\`\`bash
aws ec2 describe-security-groups --group-ids sg-rds --output table
\`\`\``,
      },
      {
        question: 'What is the difference between security groups and NACLs? When do you need both?',
        answer: `## Security Groups vs NACLs

| Dimension | Security Groups | Network ACLs |
|-----------|----------------|--------------|
| Applied to | ENI (instance level) | Subnet (all traffic in/out) |
| Statefulness | Stateful | Stateless |
| Rule model | Allow only | Allow and Deny |
| Rule evaluation | All rules evaluated, most permissive wins | Numbered order, first match wins |
| Default behavior | Deny all inbound, allow all outbound | Allow all in both directions |

## When You Need Both

Use NACLs for:

1. Explicit deny rules — block a known attacking IP range:

\`\`\`bash
aws ec2 create-network-acl-entry \\
  --network-acl-id acl-12345678 --rule-number 100 \\
  --protocol -1 --rule-action deny \\
  --cidr-block 185.220.101.0/24 --ingress
\`\`\`

2. Subnet-wide rules — apply to all instances in a subnet regardless of their security groups.

## Defense in Depth

- Private subnets with NACLs that deny all inbound from the Internet
- Security groups that allow only specific ports from specific security groups
- NACLs as a backstop for anomalous traffic

A misconfigured security group (too permissive) is still blocked by the NACL. A NACL misconfiguration is still limited by security groups.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html',
      'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html',
    ],
    quickFire: [
      { q: 'Are AWS Security Groups stateful or stateless?', a: 'Stateful -- return traffic for allowed connections is automatically permitted without an explicit outbound rule.' },
      { q: 'Do Security Groups support explicit DENY rules?', a: 'No. Security Groups use an implicit-deny model -- only ALLOW rules exist. For explicit deny, use a Network ACL.' },
      { q: 'What is the default outbound rule on a new Security Group?', a: 'Allow all outbound traffic (0.0.0.0/0 on all ports). This is often left in place but should be restricted for defense-in-depth.' },
      { q: 'What is the advantage of using a Security Group ID as a rule source?', a: 'Dynamic membership -- any instance added to that security group automatically gets access; removed instances lose access with no IP management.' },
      { q: 'At what level are Security Groups applied?', a: 'At the ENI (Elastic Network Interface) level. One ENI can have up to 5 security groups; each security group allows up to 60 inbound and 60 outbound rules.' },
      { q: 'Can a Security Group reference another security group from a peered VPC?', a: 'Yes, within the same region -- cross-account security group references require explicit sharing configuration.' },
      { q: 'What is the default Security Group behavior for a new VPC?', a: 'The default SG allows all inbound from itself (same SG) and all outbound. Avoid using it in production -- create named purpose-specific SGs.' },
      { q: 'Why are Security Groups insufficient alone for blocking a known attacking IP?', a: 'SGs have no DENY rules -- you cannot block a specific IP. Use a Network ACL DENY rule for explicit IP blocking.' },
      { q: 'How do Security Group changes take effect?', a: 'Immediately and without interruption to existing connections. No reboot or reload required.' },
      { q: 'How do you audit for overly permissive Security Groups in AWS?', a: 'Use AWS Config rules (e.g., restricted-ssh, restricted-common-ports), AWS Security Hub, or describe-security-groups filtered for 0.0.0.0/0 on sensitive ports.' },
    ],
  },

  {
    id: 'aws-nacls',
    title: 'AWS Network ACLs',
    icon: 'shield',
    color: '#ef4444',
    questions: 5,
    description: 'Stateless rule evaluation, numbered rules, explicit allow and deny, ephemeral port ranges, and differences from security groups.',
    visualizations: [],
    introduction: `AWS Network Access Control Lists (NACLs) are stateless subnet-level firewalls that provide an additional layer of network security beyond Security Groups. NACLs operate at the subnet boundary and inspect each packet independently without tracking connection state.

Every subnet in a VPC is associated with exactly one NACL. The VPC's default NACL allows all inbound and outbound traffic by default. NACLs affect all instances in the subnet regardless of their individual security group configurations.

The stateless nature of NACLs has a critical practical implication: you must write rules for both the request and the response direction. For a web server receiving HTTPS on port 443, you need an inbound ALLOW rule for port 443, but you also need an outbound ALLOW rule for the ephemeral port range (1024-65535) so the server's response can exit the subnet. The client's source port is an ephemeral port chosen by the OS — typically 32768-60999 on Linux or 49152-65535 on Windows. Forgetting this ephemeral port outbound rule is the most common NACL mistake.

NACL rules are evaluated in ascending numeric order (lowest number first). The first rule that matches determines the action — ALLOW or DENY. After a matching rule is found, no further rules are evaluated. NACLs support explicit DENY rules (Security Groups do not). There is always an implicit DENY at the end (rule *) that drops all unmatched traffic.

NACLs are best used as a coarse-grained subnet boundary control and IP blocklist mechanism, complementing the fine-grained per-instance control provided by Security Groups.`,
    whenToUse: [
      'Blocking specific IP ranges (known attackers, Tor exit nodes) at the subnet level',
      'Adding defense in depth where a misconfigured security group should not expose all subnet traffic',
      'Restricting traffic between subnets in a VPC',
      'Troubleshooting connectivity failures caused by NACL rules',
      'Understanding why adding an inbound allow rule alone is not sufficient',
    ],
    keyConcepts: [
      { term: 'Stateless evaluation', definition: `NACLs do not track TCP connection state. Every packet is evaluated independently. You must write explicit allow rules for both directions — including outbound ephemeral ports for server responses. Return traffic is NOT automatically allowed.` },
      { term: 'Numbered rules, first-match wins', definition: `Rules are evaluated from lowest number to highest. The first rule that matches determines the action. Rule numbers 1-32766 are user-configurable; rule 32767 is an implicit deny-all.` },
      { term: 'Explicit ALLOW and DENY', definition: `Unlike Security Groups (allow-only), NACLs support both ALLOW and DENY actions. This enables IP blocklisting — a DENY rule with a lower number blocks specific sources while higher-numbered ALLOW rules permit others.` },
      { term: 'Ephemeral ports', definition: `TCP/UDP clients use an ephemeral (temporary) source port for each connection. Linux: 32768-60999. Windows: 49152-65535. When a server responds, the response destination port is this ephemeral port. Outbound NACL rules must allow this range.` },
      { term: 'Subnet association', definition: `Each subnet is associated with exactly one NACL. A NACL can be associated with multiple subnets. Changing a subnet's NACL association takes effect immediately for new connections.` },
    ],
    pitfalls: [
      'Forgetting ephemeral port outbound rules — adding an inbound ALLOW for port 443 but not an outbound ALLOW for ports 1024-65535 means the server can receive the request but the response is blocked. Traffic appears to connect but then hangs.',
      'Rule number collisions — not planning the number space. Use increments of 100 to leave room for future insertions.',
      'Using NACLs as the primary security control — NACL rules apply to all instances in the subnet. Fine-grained per-instance control belongs in Security Groups; NACLs are for subnet-boundary coarse control and explicit deny.',
      'Not accounting for VPC internal traffic — a NACL blocking 0.0.0.0/0 also blocks traffic from other subnets in your own VPC unless you add explicit allow rules.',
    ],
    keyQuestions: [
      {
        question: 'A web server in a private subnet can receive HTTPS connections but the responses never reach clients. What is the most likely cause and how do you fix it?',
        answer: `## Root Cause: Missing Ephemeral Port Outbound Rule

NACLs are stateless. When a client connects on port 443:

1. Client sends TCP SYN from source port ~54321 (ephemeral) to destination port 443
2. Inbound NACL ALLOW rule for port 443 matches — packet reaches the server
3. Server responds from port 443 to destination port 54321 (client's ephemeral port)
4. Outbound NACL evaluates the response — destination port 54321 must be explicitly allowed
5. If no outbound rule allows ports 1024-65535, the implicit deny drops the packet — client sees a timeout

## Diagnosis

\`\`\`bash
# Check current NACL outbound rules
aws ec2 describe-network-acls \\
  --filters Name=association.subnet-id,Values=subnet-12345678 \\
  --query 'NetworkAcls[].Entries[?Egress==\`true\`]' \\
  --output table
# VPC Flow Logs will show REJECT on outbound traffic to client IP on ports 1024-65535
\`\`\`

## Fix

\`\`\`bash
aws ec2 create-network-acl-entry \\
  --network-acl-id acl-12345678 \\
  --rule-number 200 --protocol tcp --rule-action allow \\
  --cidr-block 0.0.0.0/0 --port-range From=1024,To=65535 \\
  --egress
\`\`\`

## Complete Minimal NACL for a Public Web Subnet

\`\`\`bash
# Inbound: allow HTTPS
aws ec2 create-network-acl-entry --network-acl-id acl-xxx \\
  --rule-number 100 --protocol tcp --rule-action allow \\
  --cidr-block 0.0.0.0/0 --port-range From=443,To=443 --ingress

# Inbound: allow ephemeral return traffic
aws ec2 create-network-acl-entry --network-acl-id acl-xxx \\
  --rule-number 200 --protocol tcp --rule-action allow \\
  --cidr-block 0.0.0.0/0 --port-range From=1024,To=65535 --ingress

# Outbound: allow HTTPS
aws ec2 create-network-acl-entry --network-acl-id acl-xxx \\
  --rule-number 100 --protocol tcp --rule-action allow \\
  --cidr-block 0.0.0.0/0 --port-range From=443,To=443 --egress

# Outbound: allow ephemeral ports (responses to clients)
aws ec2 create-network-acl-entry --network-acl-id acl-xxx \\
  --rule-number 200 --protocol tcp --rule-action allow \\
  --cidr-block 0.0.0.0/0 --port-range From=1024,To=65535 --egress
\`\`\``,
      },
      {
        question: 'How do you use NACLs to block a specific IP range that is attacking your application, and how quickly does the block take effect?',
        answer: `## Strategy: DENY Rule with Lower Number Than ALLOW

\`\`\`bash
# Block a known attacking range — rule 50 is lower than the existing ALLOW at 100
aws ec2 create-network-acl-entry \\
  --network-acl-id acl-12345678 \\
  --rule-number 50 --protocol -1 --rule-action deny \\
  --cidr-block 185.220.101.0/24 --ingress

# Verify
aws ec2 describe-network-acls --network-acl-ids acl-12345678 \\
  --query 'NetworkAcls[].Entries[?Egress==\`false\`]' --output table
\`\`\`

## How Quickly It Takes Effect

NACL rule changes take effect immediately for new connections — no propagation delay within a region. However, existing TCP connections established before the change are NOT immediately dropped. The NACL only applies to new packets.

## Automating IP Blocklisting

\`\`\`python
import boto3

def block_ip(ip_cidr, nacl_id, rule_number):
    ec2 = boto3.client('ec2')
    ec2.create_network_acl_entry(
        NetworkAclId=nacl_id,
        RuleNumber=rule_number,
        Protocol='-1',
        RuleAction='deny',
        CidrBlock=ip_cidr,
        Ingress=True
    )

for i, ip in enumerate(attacking_ips[:20]):
    block_ip(f"{ip}/32", 'acl-12345678', 50 + i)
\`\`\`

## NACL Rule Limits

Default: 20 inbound + 20 outbound rules per NACL (adjustable via Service Quotas). For large IP blocklists, use AWS WAF (managed IP set supports 10,000 IPs) or GuardDuty with Lambda auto-remediation instead.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html',
      'https://repost.aws/knowledge-center/resolve-connection-sg-acl-inbound',
    ],
    quickFire: [
      { q: 'Are Network ACLs stateful or stateless?', a: 'Stateless -- every packet is evaluated independently. Return traffic must be explicitly allowed in both inbound and outbound rules.' },
      { q: 'What is the most common NACL mistake when allowing inbound HTTPS?', a: 'Forgetting to add an outbound ALLOW rule for ephemeral ports (1024-65535) so the server response can leave the subnet.' },
      { q: 'What are the Linux ephemeral port range and Windows ephemeral port range?', a: 'Linux: 32768-60999. Windows: 49152-65535. Always allow 1024-65535 outbound to cover both.' },
      { q: 'How are NACL rules evaluated?', a: 'In ascending numeric order -- lowest number first. The first matching rule wins. No further rules are evaluated after a match.' },
      { q: 'What is the implicit rule at the end of every NACL?', a: 'Rule * -- deny all -- drops all traffic that did not match any explicit rule.' },
      { q: 'How many subnets can one NACL be associated with?', a: 'Multiple subnets can share one NACL. But each subnet is associated with exactly one NACL at a time.' },
      { q: 'How quickly do NACL rule changes take effect?', a: 'Immediately for new connections. Existing established TCP connections before the rule change are not immediately dropped.' },
      { q: 'What is the maximum number of NACL rules per direction by default?', a: '20 inbound and 20 outbound rules per NACL (adjustable via AWS Service Quotas).' },
      { q: 'For large IP blocklists, what is better than NACL rules?', a: 'AWS WAF with managed IP sets (supports 10,000 IPs) or GuardDuty with Lambda auto-remediation -- NACLs are limited to 20 rules per direction by default.' },
      { q: 'What is the key use case for NACLs over Security Groups?', a: 'Explicit DENY rules -- blocking specific known-bad IP ranges at the subnet level before they reach any instance.' },
    ],
  },

  {
    id: 'zero-trust-networking',
    title: 'Zero Trust Networking',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'BeyondCorp identity-based access, microsegmentation, ZTNA architecture, mTLS everywhere, and never-trust-always-verify model.',
    visualizations: [],
    introduction: `Zero Trust Networking (ZTN) is a security model that eliminates the concept of a trusted network perimeter. Traditional security assumes that traffic inside the corporate network or VPC is trusted. Zero Trust rejects this assumption: "never trust, always verify" — every request must be authenticated and authorized regardless of where it originates.

The model emerged from Google's BeyondCorp initiative (2014-2016). BeyondCorp moved access control from the network layer to the application layer. Employees access corporate applications via a proxy that verifies their device certificate, identity token, and risk posture — not their network location. A laptop on a coffee shop WiFi receives the same treatment as one on the corporate network.

The key principles are: verify explicitly (authenticate and authorize every request using all available signals), use least privilege access (grant minimum necessary permissions), and assume breach (design systems assuming an attacker is already inside; limit blast radius through microsegmentation).

Microsegmentation applies fine-grained network policies that allow only the specific communication paths required by business logic. In Kubernetes, this is implemented via NetworkPolicy. In AWS, via security group references. In a service mesh, via authorization policies on the mTLS-authenticated service identity.

mTLS (mutual TLS) is the cryptographic mechanism underlying Zero Trust service-to-service communication. Unlike standard TLS where only the server presents a certificate, mTLS requires both client and server to present and verify certificates. Service meshes like Istio and Linkerd automate mTLS certificate provisioning, rotation, and enforcement.`,
    whenToUse: [
      'Designing access control for a remote workforce accessing internal applications from untrusted networks',
      'Implementing service-to-service authentication in a microservices architecture',
      'Explaining microsegmentation as an alternative to VPN-based network isolation',
      'Designing mTLS with Istio or Linkerd for a Kubernetes-based service mesh',
      'Scoping the blast radius of a potential security breach in a microservices environment',
      'Replacing a VPN-based remote access architecture with a ZTNA solution',
    ],
    keyConcepts: [
      { term: 'Never Trust, Always Verify', definition: `No user, device, or service is implicitly trusted based on network location. Every access request must be authenticated and authorized. Being inside the VPC or corporate network confers no trust by itself.` },
      { term: 'BeyondCorp', definition: `Google's implementation of Zero Trust. Access is controlled by a central access proxy evaluating user identity, device certificate, device inventory status, and request context — not network IP.` },
      { term: 'Microsegmentation', definition: `Dividing a network into small segments with fine-grained access controls. Each workload can only communicate with the specific other workloads it needs to. Limits lateral movement after a breach.` },
      { term: 'mTLS (Mutual TLS)', definition: `Both the client and server present X.509 certificates during the TLS handshake. Each service has a cryptographic identity (SPIFFE SVID in service meshes). Requests are authenticated at the transport layer.` },
      { term: 'ZTNA (Zero Trust Network Access)', definition: `A modern replacement for VPN. Users connect to a ZTNA proxy that evaluates device posture, identity, and context before proxying access to specific applications. Users never have broad network access.` },
      { term: 'SPIFFE/SPIRE', definition: `Secure Production Identity Framework for Everyone. An open standard for workload identity. SPIRE issues short-lived X.509 SVIDs to workloads. Istio uses SPIFFE-compatible identities automatically.` },
    ],
    pitfalls: [
      'Treating Zero Trust as a product rather than a model — vendors sell "Zero Trust" solutions that are really VPN replacements. True Zero Trust requires identity-aware access at every layer and cannot be achieved by a single product.',
      'Implementing mTLS without automated certificate rotation — mTLS certificates expire. Without automated rotation (Istio handles this every 24 hours by default), services stop communicating.',
      'Microsegmentation without service dependency mapping — applying restrictive NetworkPolicy before understanding actual communication paths breaks production traffic. Map dependencies first via service mesh observability or VPC Flow Logs.',
      'Conflating authentication with authorization — mTLS proves the identity of the calling service. It does not control what that service is authorized to do. Authorization policies must be explicitly defined separately.',
    ],
    keyQuestions: [
      {
        question: 'Explain how Istio implements Zero Trust service-to-service authentication using mTLS.',
        answer: `## How Istio mTLS Works

Istio injects an Envoy sidecar proxy into every pod. All network traffic flows through the sidecar. The sidecars handle mTLS transparently — the application code makes plain HTTP calls; the sidecar encrypts and authenticates them.

## Certificate Provisioning (SPIFFE)

Istio's control plane (istiod) acts as a Certificate Authority. Each sidecar receives a short-lived X.509 certificate with a SPIFFE identity as the SAN:

\`\`\`
spiffe://cluster.local/ns/production/sa/payment-service
\`\`\`

This identity is derived from the pod's Kubernetes service account — not its IP address.

## mTLS Handshake

1. A's Envoy sidecar initiates TLS to B's Envoy sidecar
2. B presents its certificate; A verifies against istiod's CA
3. A presents its certificate; B verifies against istiod's CA
4. Encrypted, mutually authenticated connection established
5. B's sidecar checks authorization policy: is payment-service allowed to call order-service?

## Enabling Strict mTLS

\`\`\`yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT  # rejects plaintext, requires valid client cert
\`\`\`

## Authorization Policy

\`\`\`yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-policy
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/payment-service"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/orders/*"]
\`\`\`

\`\`\`bash
# Verify mTLS is active
kubectl get peerauthentication -n production
istioctl x describe pod payment-service-xxx -n production
\`\`\``,
      },
      {
        question: 'Compare VPN-based remote access with ZTNA. What are the architectural differences and when do you migrate?',
        answer: `## Traditional VPN

A VPN creates an encrypted tunnel between the user's device and a VPN concentrator. Once connected, the user joins the corporate network segment and can reach any host on it.

Problems:
- Network-level access is too broad — a compromised device can reach all internal services
- No application-level authorization — VPN only controls network access
- Poor performance — backhauling traffic to a central concentrator adds latency for global workforces
- No device posture checking

## ZTNA Architecture

\`\`\`
User Device -> ZTNA Client -> ZTNA Proxy (Edge PoP)
  -> Identity Provider authentication (Okta/Azure AD)
  -> Device posture check (certificate, MDM, patch level)
  -> Policy Engine: is this user+device allowed to access this app?
  -> If allowed: proxy forwards to internal app via outbound connector
\`\`\`

The user never joins the corporate network. The application connector initiates an outbound tunnel to the ZTNA proxy — no inbound firewall rules needed.

## Key Differences

| Dimension | VPN | ZTNA |
|-----------|-----|------|
| Access scope | Full network segment | Per-application |
| Authorization | Network ACLs only | Identity + device + context |
| Lateral movement risk | High | Minimal |
| Device posture | Usually not checked | Mandatory |
| Firewall requirements | Inbound ports open | Outbound-only connector |

## When to Migrate

- Contractors or third parties need limited application access, not full network access
- Security audit identifies overly broad VPN access as a risk
- Globally distributed employees experience VPN backhauling latency
- Adopting SaaS applications (ZTNA integrates with SSO natively)

## Migration Approach

Phase 1: Deploy ZTNA in parallel, migrate low-risk apps (wiki, ticketing, CI/CD dashboard).
Phase 2: Migrate sensitive apps with mandatory device posture.
Phase 3: Decommission VPN when all applications are accessible via ZTNA.`,
      },
    ],
    references: [
      'https://cloud.google.com/beyondcorp',
      'https://istio.io/latest/docs/concepts/security/',
      'https://www.cloudflare.com/learning/access-management/what-is-ztna/',
      'https://spiffe.io/',
      'https://www.nist.gov/publications/zero-trust-architecture',
    ],
    quickFire: [
      { q: 'What is the core principle of Zero Trust networking?', a: 'Never trust, always verify -- no user, device, or service is implicitly trusted based on network location or being inside the VPC.' },
      { q: 'What Google initiative popularized Zero Trust?', a: 'BeyondCorp (2014-2016) -- moved access control from the network perimeter to an application proxy verifying device certificate and identity.' },
      { q: 'What is mTLS and how does it differ from standard TLS?', a: 'Mutual TLS -- both client and server present X.509 certificates. Standard TLS only requires the server to present a certificate.' },
      { q: 'What is SPIFFE and how does it relate to service mesh?', a: 'SPIFFE is a standard for workload identity using short-lived X.509 SVIDs. Istio uses SPIFFE-compatible identities for every pod.' },
      { q: 'What is microsegmentation?', a: 'Fine-grained network policies that allow only the specific communication paths required by business logic -- limiting lateral movement after a breach.' },
      { q: 'What is the difference between ZTNA and VPN?', a: 'VPN gives network-level access to a segment. ZTNA gives access to specific applications only, evaluated per-request against identity and device posture.' },
      { q: 'In Istio, what resource enforces which services can call which?', a: 'AuthorizationPolicy -- defines allowed source principals (SPIFFE identities), HTTP methods, and paths for each destination service.' },
      { q: 'What Istio resource sets mTLS to STRICT mode?', a: 'PeerAuthentication with mtls.mode: STRICT -- rejects all plaintext connections and requires valid client certificates.' },
      { q: 'Why must mTLS certificate rotation be automated?', a: 'mTLS certificates expire. Without automated rotation (Istio rotates every 24 hours by default), services stop communicating when certs expire.' },
      { q: 'What is the blast radius benefit of microsegmentation?', a: 'A compromised service can only reach the specific services its policy allows -- lateral movement to unrelated services is blocked at the network layer.' },
    ],
  },

  {
    id: 'waf-ddos-protection',
    title: 'WAF and DDoS Protection',
    icon: 'shield',
    color: '#ef4444',
    questions: 5,
    description: 'WAF rule sets (OWASP CRS), rate limiting, AWS Shield Standard vs Advanced, Cloudflare Magic Transit, and scrubbing centers.',
    visualizations: [],
    introduction: `Web Application Firewalls (WAFs) and DDoS protection are two distinct but complementary defenses. A WAF operates at Layer 7 (HTTP) and inspects request content to detect and block application-layer attacks — SQL injection, XSS, path traversal, and other OWASP Top 10 threats. DDoS protection operates at Layers 3, 4, and 7 to absorb volumetric attacks that aim to exhaust bandwidth or compute capacity.

A WAF inspects individual HTTP requests and applies a set of rules (signatures, rate limits, geographic restrictions, IP reputation) to make a per-request decision to allow, block, or challenge. The OWASP Core Rule Set (CRS) is the open-source baseline used by ModSecurity, AWS WAF, and Cloudflare WAF. It contains hundreds of rules detecting common attack patterns.

AWS WAF protects ALBs, CloudFront distributions, API Gateway, and AppSync via Web ACLs containing rule groups. Rules are evaluated in priority order; the default action applies to requests matching no rules.

DDoS protection differs in scale and mechanism. A volumetric attack may send 1-10 Tbps of traffic. Effective DDoS protection requires absorbing or filtering traffic close to its source using a scrubbing infrastructure with global anycast presence and BGP-based traffic diversion.

AWS Shield Standard provides automatic protection against common Layer 3 and Layer 4 attacks for all AWS customers at no cost. AWS Shield Advanced adds SRT (Shield Response Team) support, protection for Elastic IPs and Route 53, cost protection, and Layer 7 DDoS protection. Cloudflare Magic Transit provides anycast-based DDoS protection for your own IP prefixes.`,
    whenToUse: [
      'Configuring AWS WAF on an ALB or CloudFront distribution to protect against OWASP Top 10 attacks',
      'Evaluating AWS Shield Standard vs Advanced for a production workload',
      'Designing a DDoS mitigation strategy for a high-value public-facing application',
      'Implementing rate limiting at the WAF layer to prevent credential stuffing or API abuse',
      'Explaining the difference between WAF and DDoS protection to a stakeholder',
    ],
    keyConcepts: [
      { term: 'WAF (Web Application Firewall)', definition: `An L7 proxy that inspects HTTP request content and applies rules to allow, block, or challenge individual requests. Defends against OWASP Top 10 application-layer attacks. Does not defend against volumetric DDoS.` },
      { term: 'OWASP Core Rule Set (CRS)', definition: `An open-source collection of rules detecting SQL injection, XSS, path traversal, local/remote file inclusion, command injection, and other common web attacks. Used as the baseline by AWS WAF Managed Rules and Cloudflare WAF.` },
      { term: 'AWS Shield Standard vs Advanced', definition: `Shield Standard: automatic, free, protects all AWS resources from L3/L4 attacks. Shield Advanced: paid ($3K/month), adds L7 DDoS protection, SRT access, cost protection, Route 53 and Elastic IP protection.` },
      { term: 'DDoS Scrubbing', definition: `Traffic destined for a protected IP is diverted to a scrubbing center via BGP route advertisement. The scrubbing center filters malicious traffic using rate limiting, connection validation, and signature matching, then forwards clean traffic to the origin.` },
      { term: 'Rate Limiting', definition: `WAF rules that track request counts from a source IP over a time window and block or challenge sources exceeding a threshold. AWS WAF rate-based rules evaluate counts over 5-minute windows.` },
    ],
    pitfalls: [
      'WAF in monitor mode in production — WAF rules default to COUNT mode during testing (log matches but do not block). Always verify rule actions are set to Block for production.',
      'Blocking legitimate traffic with OWASP CRS at default sensitivity — the CRS may generate false positives for applications that accept complex input. Always run in COUNT mode first and tune before enabling BLOCK mode.',
      'Assuming AWS Shield Standard protects against application-layer DDoS — Shield Standard handles volumetric L3/L4 floods. An HTTP flood is an L7 attack that Shield Standard does not mitigate. You need WAF rate limiting plus Shield Advanced for L7 DDoS.',
      'Not restricting ALB access to CloudFront IP ranges — if the ALB has a public IP and no IP restriction, attackers can bypass the WAF by targeting the ALB directly.',
    ],
    keyQuestions: [
      {
        question: 'How do you configure AWS WAF on a CloudFront distribution to block SQL injection and rate limit API abuse?',
        answer: `## Step 1: Create Web ACL (must be in us-east-1 for CloudFront)

\`\`\`bash
aws wafv2 create-web-acl \\
  --name production-web-acl \\
  --scope CLOUDFRONT \\
  --region us-east-1 \\
  --default-action Allow={} \\
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=ProductionWAF
\`\`\`

## Step 2: Add SQLi Managed Rule + Rate-Based Rule

\`\`\`bash
TOKEN=$(aws wafv2 get-web-acl --name production-web-acl --scope CLOUDFRONT \\
  --region us-east-1 --query LockToken --output text)

aws wafv2 update-web-acl \\
  --name production-web-acl --scope CLOUDFRONT --region us-east-1 \\
  --lock-token $TOKEN --default-action Allow={} \\
  --rules '[
    {
      "Name": "SQLiRuleSet", "Priority": 10,
      "OverrideAction": {"Count": {}},
      "Statement": {"ManagedRuleGroupStatement": {"VendorName": "AWS", "Name": "AWSManagedRulesSQLiRuleSet"}},
      "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "SQLi"}
    },
    {
      "Name": "APIRateLimit", "Priority": 30, "Action": {"Block": {}},
      "Statement": {
        "RateBasedStatement": {
          "Limit": 1000, "AggregateKeyType": "IP",
          "ScopeDownStatement": {
            "ByteMatchStatement": {
              "SearchString": "/api/",
              "FieldToMatch": {"UriPath": {}},
              "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}],
              "PositionalConstraint": "STARTS_WITH"
            }
          }
        }
      },
      "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "APIRate"}
    }
  ]' \\
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=ProductionWAF
\`\`\`

## Step 3: Monitor Sampled Requests Before Enabling Block

\`\`\`bash
aws wafv2 get-sampled-requests \\
  --web-acl-arn $WEB_ACL_ARN \\
  --rule-metric-name SQLi --scope CLOUDFRONT \\
  --time-window StartTime=$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ),EndTime=$(date -u +%Y-%m-%dT%H:%M:%SZ) \\
  --max-items 100 --region us-east-1
\`\`\`

## Key Notes

- Rate-based rules evaluate counts over a 5-minute rolling window
- ScopeDownStatement narrows rate limiting to /api/ paths only
- Start all managed rule groups with OverrideAction Count for 1-2 weeks, then switch to Block
- Associate the Web ACL with your CloudFront distribution in the distribution configuration`,
      },
      {
        question: 'Explain AWS Shield Standard vs Advanced and when you would recommend Shield Advanced.',
        answer: `## Shield Standard

Included at no cost for all AWS accounts. Automatically enabled. Protects against:
- Volumetric attacks (UDP flood, SYN flood, ICMP flood)
- Protocol attacks (TCP state exhaustion)
- Reflection attacks (NTP amplification, DNS amplification)

No SLA, no DDoS cost protection, no advanced event visibility, no SRT access.

## Shield Advanced

$3,000/month plus data transfer fees. 1-year minimum commitment.

Additional protections:
- L7 DDoS protection (HTTP floods) via WAF integration
- Elastic IP protection (Shield Standard does not cover EIPs)
- Route 53 hosted zone protection
- Advanced DDoS event visibility in the console

Operational benefits:
- DDoS cost protection: AWS credits EC2/CloudFront/ELB costs incurred during an attack
- Shield Response Team (SRT): 24/7 access to AWS DDoS experts who can write WAF rules during active attacks
- Proactive engagement: SRT contacts you when an attack is detected

\`\`\`bash
aws shield create-subscription
aws shield describe-subscription
\`\`\`

## When to Recommend Shield Advanced

1. Revenue impact from downtime exceeds $3K/month (a 2-hour outage on a $100K/day service costs more than a month of Shield Advanced)
2. The application is publicly known and likely to be targeted (financial services, gaming, media)
3. You need guaranteed SRT access during an incident
4. You run on EC2 with Elastic IPs
5. DDoS cost protection matters — a large attack can generate significant CloudFront egress charges

## Cost-Effective Alternative

For most workloads, Shield Standard + CloudFront + AWS WAF rate limiting provides strong protection at much lower cost. Shield Advanced value is primarily SRT access and cost protection.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html',
      'https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html',
      'https://coreruleset.org/',
      'https://www.cloudflare.com/magic-transit/',
      'https://owasp.org/www-project-top-ten/',
    ],
    quickFire: [
      { q: 'What OSI layer does a WAF operate at?', a: 'Layer 7 (HTTP). It inspects individual HTTP request content -- SQL injection, XSS, path traversal -- not volumetric traffic floods.' },
      { q: 'What is the OWASP Core Rule Set (CRS)?', a: 'An open-source collection of WAF rules detecting SQL injection, XSS, command injection, and other OWASP Top 10 attack patterns. Used by AWS WAF and Cloudflare.' },
      { q: 'What is the difference between AWS Shield Standard and Shield Advanced?', a: 'Standard is free and covers L3/L4 volumetric attacks automatically. Advanced ($3K/month) adds L7 DDoS, SRT access, EIP protection, and DDoS cost protection.' },
      { q: 'Does AWS Shield Standard protect against HTTP floods?', a: 'No. HTTP floods are Layer 7 attacks. Shield Standard only handles L3/L4 volumetric attacks. You need WAF rate-based rules or Shield Advanced for L7.' },
      { q: 'What is the risk of enabling OWASP CRS rules in BLOCK mode immediately?', a: 'False positives can block legitimate traffic. Always run in COUNT mode first, review sampled requests, then switch to BLOCK after tuning.' },
      { q: 'How does AWS WAF rate-based rule work?', a: 'It counts requests from a source IP over a 5-minute rolling window and blocks IPs exceeding the configured limit.' },
      { q: 'What is a DDoS scrubbing center?', a: 'Traffic is BGP-diverted to a facility that filters malicious packets (rate limiting, SYN cookies, signatures) and forwards only clean traffic to the origin.' },
      { q: 'How do you prevent attackers from bypassing CloudFront WAF by targeting the ALB directly?', a: 'Restrict the ALB security group to allow inbound only from CloudFront IP ranges (maintained via AWS-managed prefix lists).' },
      { q: 'In which AWS region must a WAF Web ACL be created for CloudFront?', a: 'us-east-1 -- CloudFront WAF Web ACLs must be in us-east-1 regardless of where the CloudFront distribution serves traffic.' },
      { q: 'What is Cloudflare Magic Transit?', a: 'An anycast-based DDoS protection service that advertises your own IP prefixes via BGP, routing all traffic through Cloudflare for scrubbing before delivery.' },
    ],
  },

  {
    id: 'network-policies-k8s',
    title: 'Kubernetes Network Policies',
    icon: 'shield',
    color: '#ef4444',
    questions: 5,
    description: 'NetworkPolicy spec, ingress/egress rules, podSelector and namespaceSelector, and CNI support (Calico/Cilium).',
    visualizations: [],
    introduction: `Kubernetes NetworkPolicy resources define rules for how pods can communicate with each other and with endpoints outside the cluster. By default, Kubernetes applies no network isolation — all pods can communicate with all other pods regardless of namespace. NetworkPolicy is the mechanism for implementing Zero Trust microsegmentation within a Kubernetes cluster.

A NetworkPolicy applies to a set of pods (selected by a podSelector label query) and defines which inbound (ingress) and outbound (egress) traffic is allowed. Once at least one NetworkPolicy selects a pod, that pod's traffic is restricted to what the policies explicitly allow — unmatched traffic is denied. A pod with no NetworkPolicy selecting it remains unrestricted.

The NetworkPolicy spec has three key selectors: podSelector (which pods this policy applies to), ingress rules (inbound traffic — from which pods/namespaces/CIDR blocks), and egress rules (outbound traffic — to which pods/namespaces/CIDR blocks). Each ingress or egress rule can specify a combination of podSelector, namespaceSelector, and ipBlock.

A critical implementation detail: NetworkPolicy is enforced by the CNI (Container Network Interface) plugin, not by the Kubernetes control plane itself. The default CNI plugins (Flannel, kubenet) do not enforce NetworkPolicy — they simply ignore the resources. You must use Calico, Cilium, Weave Net, or Antrea. If you apply NetworkPolicy rules without a supporting CNI, the policies exist in the API server but have no effect.

Calico implements NetworkPolicy using iptables rules on each node. It also provides GlobalNetworkPolicy (cluster-wide policies) and host endpoint policies. Cilium implements NetworkPolicy using eBPF programs, achieving higher performance and adding L7-aware policies (HTTP path and method matching) that standard NetworkPolicy cannot express.`,
    whenToUse: [
      'Implementing network isolation between namespaces in a multi-tenant Kubernetes cluster',
      'Restricting pod-to-pod communication so only specific services can reach the database pods',
      'Implementing a default-deny posture and selectively allowing required traffic',
      'Choosing between Calico and Cilium CNI for a cluster that requires NetworkPolicy enforcement',
      'Debugging a connectivity failure caused by a NetworkPolicy blocking expected traffic',
    ],
    keyConcepts: [
      { term: 'Default deny vs default allow', definition: `Without any NetworkPolicy, all pod-to-pod traffic is allowed. Once a NetworkPolicy selects a pod, that pod is isolated — only explicitly allowed traffic passes. To achieve cluster-wide deny-all, apply a policy selecting all pods with empty ingress/egress rules.` },
      { term: 'podSelector', definition: `A label selector that determines which pods a NetworkPolicy applies to. An empty podSelector ({}) matches all pods in the namespace.` },
      { term: 'namespaceSelector', definition: `Selects traffic from (ingress) or to (egress) pods in namespaces matching the label query. Combined with podSelector in the same rule element with AND semantics. Separate rule elements combine with OR.` },
      { term: 'CNI enforcement requirement', definition: `NetworkPolicy resources are enforced by the CNI plugin, not Kubernetes itself. Flannel and kubenet do not enforce NetworkPolicy. Calico (iptables), Cilium (eBPF), Weave Net, and Antrea enforce NetworkPolicy.` },
      { term: 'Cilium L7 policy', definition: `Cilium extends standard NetworkPolicy with L7-aware rules that can restrict HTTP methods, paths, gRPC service methods, and Kafka topics. Standard Kubernetes NetworkPolicy only operates at L3/L4.` },
    ],
    pitfalls: [
      'Applying NetworkPolicy without a CNI that enforces it — if your cluster uses Flannel, NetworkPolicy resources are silently ignored. Verify CNI support before relying on NetworkPolicy for security.',
      'Selecting pods for egress without a corresponding DNS allow rule — egress policies that restrict outbound traffic block port 53 (DNS) unless explicitly allowed. A pod that cannot resolve DNS fails all service name lookups.',
      'Confusing AND vs OR semantics — within a single ingress/egress rule element, multiple selectors combine with AND. Separate rule elements combine with OR.',
      'Namespace labels not applied — namespaceSelector matches against namespace labels. If the target namespace lacks the expected labels, the selector matches nothing. Verify with kubectl get namespace --show-labels.',
    ],
    keyQuestions: [
      {
        question: 'Write Kubernetes NetworkPolicy resources to implement a three-tier isolation: frontend can talk to backend, backend can talk to database, no other pod-to-pod traffic allowed.',
        answer: `\`\`\`bash
kubectl label namespace frontend tier=frontend
kubectl label namespace backend tier=backend
kubectl label namespace database tier=database
\`\`\`

## Policy 1: Default Deny All

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: backend  # repeat for frontend and database
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  # No rules = deny all
\`\`\`

## Policy 2: Allow Frontend to Backend

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tier: frontend
      podSelector:
        matchLabels:
          app: web-server
    ports:
    - protocol: TCP
      port: 8080
\`\`\`

## Policy 3: Allow Backend to Database

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-to-database
  namespace: database
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tier: backend
      podSelector:
        matchLabels:
          app: api-server
    ports:
    - protocol: TCP
      port: 5432
\`\`\`

## Policy 4: Allow DNS Egress (Critical)

\`\`\`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
\`\`\`

\`\`\`bash
kubectl get networkpolicy -n backend
kubectl run test --image=busybox --rm -it --namespace=frontend -- \\
  wget -qO- http://api-server.backend.svc.cluster.local:8080/health
\`\`\``,
      },
      {
        question: 'What is the difference between Calico and Cilium for NetworkPolicy enforcement, and when would you choose Cilium?',
        answer: `## Calico

Implements NetworkPolicy using iptables rules on each node. Felix agent watches the Kubernetes API and translates NetworkPolicy into iptables chains.

Extensions beyond standard NetworkPolicy:
- GlobalNetworkPolicy: cluster-wide rules not scoped to a namespace
- HostEndpoint: policies on node network interfaces
- Tiered policy ordering for multi-team environments

\`\`\`bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl get pods -n calico-system
\`\`\`

## Cilium

Implements NetworkPolicy using eBPF programs loaded directly into the Linux kernel, bypassing the iptables rule chain.

Advantages:
- Performance: eBPF runs in kernel space, avoiding iptables traversal (critical at 10K+ rules)
- L7 policy: can enforce HTTP path/method, gRPC method, and Kafka topic
- Observability: Hubble provides per-flow network visibility
- No kube-proxy: Cilium can replace kube-proxy for Service load balancing using eBPF

\`\`\`yaml
# Cilium L7 HTTP policy -- not possible with standard NetworkPolicy
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: l7-api-policy
  namespace: backend
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: web-server
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "GET"
          path: "/api/v1/.*"
\`\`\`

## When to Choose Cilium

- You need L7-aware policies (HTTP path/method, gRPC, Kafka)
- You need deep network observability (Hubble flow logs)
- You have a large cluster (1000+ nodes) where iptables rule count is a bottleneck
- You want to eliminate kube-proxy
- You are building a multi-cluster architecture (Cilium Cluster Mesh)

## When to Choose Calico

- Simpler operational model and more mature deployment history
- You need GlobalNetworkPolicy (cluster-wide rules)
- Your team has existing Calico expertise
- Standard L4 enforcement is sufficient`,
      },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/services-networking/network-policies/',
      'https://docs.tigera.io/calico/latest/network-policy/',
      'https://docs.cilium.io/en/latest/network/kubernetes/policy/',
      'https://github.com/ahmetb/kubernetes-network-policy-recipes',
    ],
    quickFire: [
      { q: 'Does Kubernetes enforce NetworkPolicy natively?', a: 'No. NetworkPolicy is enforced by the CNI plugin. Flannel and kubenet ignore NetworkPolicy resources. Calico, Cilium, and Weave Net enforce them.' },
      { q: 'What happens to a pod with no NetworkPolicy selecting it?', a: 'All traffic is allowed -- the pod is completely unrestricted. Isolation only applies once at least one policy selects the pod.' },
      { q: 'How do you implement cluster-wide default-deny in Kubernetes?', a: 'Apply a NetworkPolicy with empty podSelector ({}) and empty ingress/egress rules to each namespace -- this selects all pods and denies all traffic.' },
      { q: 'What is the most common mistake when applying restrictive egress policies?', a: 'Forgetting to allow port 53 (DNS) -- egress policies that block all traffic also block DNS resolution, breaking all service name lookups.' },
      { q: 'What is the AND vs OR semantics for selectors in a NetworkPolicy rule?', a: 'Within one from/to rule element, multiple selectors combine with AND. Separate from/to elements combine with OR.' },
      { q: 'What does Cilium offer beyond standard Kubernetes NetworkPolicy?', a: 'L7-aware policies (HTTP path/method, gRPC service method, Kafka topic) via CiliumNetworkPolicy -- standard NetworkPolicy only operates at L3/L4.' },
      { q: 'How does Calico implement NetworkPolicy at the kernel level?', a: 'Felix agent on each node translates NetworkPolicy resources into iptables rules that enforce ingress/egress at the pod network interface.' },
      { q: 'What is a Calico GlobalNetworkPolicy?', a: 'A cluster-wide policy not scoped to a namespace -- useful for baseline rules that apply to all pods (e.g., deny all inter-namespace traffic by default).' },
      { q: 'How do you verify namespace labels used in namespaceSelector rules?', a: 'kubectl get namespace --show-labels -- if the expected label is missing, the selector matches nothing and no traffic is allowed.' },
      { q: 'When would you choose Cilium over Calico?', a: 'When you need L7 HTTP/gRPC policies, deep network observability via Hubble, better performance at large scale (eBPF vs iptables), or want to replace kube-proxy.' },
    ],
  },

  {
    id: 'router-vs-switch',
    title: 'Router vs Switch',
    icon: 'share2',
    color: '#3b82f6',
    questions: 4,
    description: 'Router operates at Layer 3 (Network) using IP addresses to connect DIFFERENT networks. Switch operates at Layer 2 (Data Link) using MAC addresses to connect devices within the SAME network.',
    visualizations: [
      {
        title: 'Router vs Switch — Layer Comparison',
        caption: 'Router (Layer 3) connecting Network A 192.168.1.0/24 to Network B 192.168.2.0/24 via IP routing, vs Switch (Layer 2) connecting devices within the same 192.168.1.0/24 network via MAC addresses.',
        image: '/diagrams/linkdiags/router-vs-switch.png',
      },
    ],
    introduction: `**Router** and **Switch** are both network devices but operate at different OSI layers and serve different purposes.

## Router — Layer 3 (Network Layer)
- Operates at **Layer 3 (Network Layer)**
- Uses **IP addresses** to make forwarding decisions
- Connects **DIFFERENT networks** together
- Routes packets between Network A and Network B
- Example: home router connecting your LAN (192.168.1.0/24) to the internet
- Maintains a **routing table** of known networks and next-hop paths

## Switch — Layer 2 (Data Link Layer)
- Operates at **Layer 2 (Data Link Layer)**
- Uses **MAC addresses** to make forwarding decisions
- Connects devices within the **SAME network**
- Forwards Ethernet frames between devices on the same subnet
- Example: office switch connecting desktops, printers, servers on 192.168.1.0/24
- Maintains a **MAC address table** (CAM table) mapping MAC → port

## Key Difference Table

| Feature | Router | Switch |
|---------|--------|--------|
| OSI Layer | Layer 3 (Network) | Layer 2 (Data Link) |
| Connects | Different Networks | Same Network |
| Address Used | IP Address | MAC Address |
| Function | Routing | Switching |
| Device | Packet | Frame |

## Quick Tip
- **Router** = go OUTSIDE the network (between networks)
- **Switch** = connect INSIDE the network (within a network)

## Modern L3 Switches
Modern **Layer 3 switches** combine both capabilities — switching (L2) within VLANs and routing (L3) between VLANs. They are common in enterprise data centers for inter-VLAN routing without a dedicated router.`,
    whenToUse: [
      'Explaining why a home router connects you to the internet (different networks) but a switch just connects your local devices',
      'Designing a network topology — routers at the perimeter/between subnets, switches within each subnet',
      'Troubleshooting connectivity: Layer 2 (MAC/ARP) issues go to the switch, Layer 3 (IP/routing) issues go to the router',
      'Justifying L3 switch use in a data center for inter-VLAN routing',
    ],
    keyConcepts: [
      { term: 'Router', definition: 'Layer 3 device using IP addresses to route packets between different networks. Maintains a routing table. Example: AWS VPC route table, home router, border router.' },
      { term: 'Switch', definition: 'Layer 2 device using MAC addresses to forward frames within the same network. Maintains a MAC address table (CAM table). Example: office Ethernet switch, AWS VPC at the subnet level.' },
      { term: 'MAC Address Table (CAM Table)', definition: 'Switch\'s internal table mapping MAC addresses to physical ports. Learned dynamically as frames arrive. Used to forward frames only to the correct port rather than flooding.' },
      { term: 'Routing Table', definition: 'Router\'s table of known network prefixes and their next-hop addresses. Used to forward packets toward the destination network. Can be populated statically or via routing protocols (BGP, OSPF).' },
      { term: 'L3 Switch', definition: 'A switch with built-in Layer 3 routing capability. Can route between VLANs without a separate router. Common in enterprise data center top-of-rack designs.' },
    ],
    pitfalls: [
      'Confusing a home "router" with a pure Layer 3 device — home routers typically combine a router, switch, NAT, DHCP server, and Wi-Fi access point in one box.',
      'Thinking switches only do Layer 2 — modern managed switches support VLANs (still L2) and L3 switches do inter-VLAN routing.',
      'Using a switch to connect two different subnets — switches do not route between subnets; you need a router or L3 switch for inter-subnet traffic.',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between a router and a switch?',
        answer: `A **router** operates at Layer 3 (Network Layer) and uses IP addresses to route packets between different networks. It connects Network A to Network B — for example, connecting your home LAN (192.168.1.0/24) to the internet. Routers maintain a routing table of known network prefixes and next-hop paths.

A **switch** operates at Layer 2 (Data Link Layer) and uses MAC addresses to forward Ethernet frames between devices within the same network. It connects multiple devices on the same subnet — for example, desktops and servers on 192.168.1.0/24. Switches maintain a MAC address table mapping MAC addresses to ports.

Quick memory rule: Router = go outside the network (between networks). Switch = connect inside the network (within a network).`,
      },
      {
        question: 'When would you use a Layer 3 switch instead of a router?',
        answer: `A **Layer 3 switch** is used for **inter-VLAN routing** within a data center or campus network. When you have multiple VLANs (e.g., VLAN 10 for servers, VLAN 20 for workstations) and need traffic to flow between them, an L3 switch routes between VLANs at wire speed using dedicated ASICs — much faster than a general-purpose router for this use case.

Choose an L3 switch when:
- You need high-speed inter-VLAN routing within a single data center
- You want to eliminate a separate router for internal routing
- You are building a collapsed-core or spine-leaf architecture

Keep a dedicated router when:
- You need to connect to the internet or external networks (BGP peering, WAN links)
- You need advanced firewall, NAT, or VPN features
- Connecting geographically separate networks`,
      },
      {
        question: 'How does a switch learn which MAC address is on which port?',
        answer: `Switches use **MAC learning** to build their CAM (Content Addressable Memory) table dynamically:

1. When a frame arrives on a port, the switch reads the **source MAC address** and records it in the CAM table mapped to that port.
2. When the switch needs to forward a frame to a destination MAC, it looks up the CAM table.
3. If the destination MAC is known, it forwards only to that port (**unicast forwarding**).
4. If the destination MAC is unknown, it **floods** the frame to all ports except the source port.
5. CAM table entries age out after an inactivity timeout (typically 300 seconds) to handle devices that move ports.

This is why a new device on the network causes a brief flood until the switch learns its MAC address.`,
      },
      {
        question: 'In AWS, what plays the role of a router and what plays the role of a switch?',
        answer: `In AWS VPC networking:

**Router equivalent**: The **VPC route table** acts as the router. Each subnet is associated with a route table that determines where traffic is sent — to the internet gateway, NAT gateway, VPC peering connection, Transit Gateway, or local within the VPC. The implicit local route (e.g., 10.0.0.0/16 → local) routes traffic between subnets.

**Switch equivalent**: Within a single subnet, AWS handles the Layer 2 switching transparently. Instances in the same subnet communicate directly via the VPC's underlying fabric without explicit routing — similar to being on the same switch.

**Security Groups** are stateful L3/L4 filters attached to instances (like per-host ACLs), while **NACLs** are stateless L4 filters at the subnet boundary.`,
      },
    ],
    references: [
      'https://www.cisco.com/c/en/us/solutions/small-business/resource-center/networking/what-is-a-network-switch.html',
      'https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html',
    ],
    quickFire: [
      { q: 'At which OSI layer does a router operate?', a: 'Layer 3 (Network). It uses IP addresses to forward packets between different networks.' },
      { q: 'At which OSI layer does a switch operate?', a: 'Layer 2 (Data Link). It uses MAC addresses to forward Ethernet frames within the same network segment.' },
      { q: 'What table does a switch use to forward frames?', a: 'The MAC address table (CAM table) -- maps MAC addresses to physical switch ports, learned dynamically as frames arrive.' },
      { q: 'What table does a router use to forward packets?', a: 'The routing table -- maps destination IP prefixes to next-hop addresses or outgoing interfaces.' },
      { q: 'What is a Layer 3 switch?', a: 'A switch with built-in IP routing capability. It performs L2 switching within VLANs and L3 routing between VLANs without a separate router.' },
      { q: 'What happens when a switch receives a frame with an unknown destination MAC?', a: 'It floods the frame to all ports except the source port -- unicast flooding. The CAM table learns the destination MAC when the device responds.' },
      { q: 'In AWS, what serves the role of a router?', a: 'The VPC route table -- it determines where traffic is sent (internet gateway, NAT gateway, peering connection, TGW, or local within the VPC).' },
      { q: 'When would you use an L3 switch instead of a dedicated router?', a: 'For high-speed inter-VLAN routing within a data center or campus network using ASICs. Use a router for WAN links, BGP peering, or advanced NAT/VPN features.' },
      { q: 'How long do CAM table entries persist before aging out?', a: 'Typically 300 seconds (5 minutes) of inactivity -- entries are cleared to handle devices that move to different ports.' },
      { q: 'What is the key difference between a home router and a pure Layer 3 router?', a: 'A home router combines a router, switch, NAT, DHCP server, and Wi-Fi access point in one device -- it is not a pure Layer 3 device.' },
    ],
  },

  {
    id: 'overlay-underlay-network',
    title: 'Overlay vs Underlay Networking',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 5,
    description: 'Underlay is the real physical network. Overlay is a virtual network built on top using encapsulation (VXLAN, GRE, Geneve). VXLAN most widely used in Kubernetes CNI, SDN, and cloud.',
    visualizations: [
      {
        title: 'Overlay vs Underlay — Encapsulation Flow',
        caption: 'Physical underlay network (IP fabric) with VXLAN overlay tunnels connecting virtual networks across physical nodes. Shows encapsulation adding UDP/VXLAN headers around the original L2 frame.',
        image: '/diagrams/linkdiags/overlay-underlay.png',
      },
    ],
    introduction: `## Underlay Network
The **underlay** is the real physical network infrastructure — the actual switches, routers, cables, and IP addressing that physically exists. It provides basic IP connectivity between nodes. The underlay only needs to route IP packets between endpoints; it has no knowledge of the virtual networks running on top.

## Overlay Network
An **overlay** is a virtual network built on top of the underlay using **encapsulation**. Overlay protocols wrap (encapsulate) original network frames inside another protocol's packets, creating logical tunnels across the physical network.

## Encapsulation Protocols

| Protocol | Encapsulation | Port | Use Case |
|----------|--------------|------|----------|
| VXLAN | L2 frame in UDP | 4789/UDP | Kubernetes CNI, SDN, cloud |
| GRE | IP in GRE header | Protocol 47 | Point-to-point tunnels |
| Geneve | L2 frame in UDP | 6081/UDP | Extensible, SDN controllers |
| IP-in-IP | IP packet in IP | Protocol 4 | Simple tunneling |

## VXLAN — Most Widely Used
**VXLAN (Virtual Extensible LAN)** is the dominant overlay protocol:
- Encapsulates L2 Ethernet frames inside UDP packets
- Adds **50-byte overhead** (14 VXLAN + 8 UDP + 20 IP + 14 Ethernet outer)
- Default UDP port **4789**
- Uses 24-bit **VNI (VXLAN Network Identifier)** — supports 16 million virtual networks vs VLAN's 4096

## Kubernetes Use
Kubernetes CNI plugins use overlay networking to connect pods across nodes:
- **Flannel**: simple VXLAN overlay, all pods in one flat network
- **Calico**: can use VXLAN or IP-in-IP overlay, or pure BGP underlay routing
- **Weave**: VXLAN or encrypted overlay
- **Cilium**: eBPF-based, supports VXLAN overlay or native routing`,
    whenToUse: [
      'Designing Kubernetes pod networking — choosing between VXLAN overlay (simpler) vs BGP underlay (better performance)',
      'Building multi-tenant cloud networks where different customers need isolated L2 segments across shared physical infrastructure',
      'Explaining how AWS VPC, Azure VNet, and GCP VPC isolate tenant traffic on shared hardware (all use VXLAN-like encapsulation)',
      'Troubleshooting MTU issues — VXLAN\'s 50-byte overhead requires MTU 1550 on the underlay if VMs use MTU 1500',
    ],
    keyConcepts: [
      { term: 'Underlay', definition: 'The physical IP network providing basic connectivity between nodes. Routers and switches form the underlay. It only needs to forward IP packets between endpoints — no knowledge of virtual networks.' },
      { term: 'Overlay', definition: 'A virtual network built on top of the underlay using encapsulation. Creates logical tunnels that appear as direct connections between endpoints even when they are physically distant.' },
      { term: 'VXLAN', definition: 'Virtual Extensible LAN. Encapsulates L2 Ethernet frames in UDP (port 4789). Adds 50-byte overhead. Supports 16M virtual networks via 24-bit VNI. Most common overlay in Kubernetes and cloud.' },
      { term: 'VTEP (VXLAN Tunnel Endpoint)', definition: 'The endpoint that performs VXLAN encapsulation and decapsulation. In Kubernetes, each node runs a VTEP. The VTEP encapsulates outgoing frames and decapsulates incoming VXLAN packets.' },
      { term: 'VNI (VXLAN Network Identifier)', definition: '24-bit field in the VXLAN header identifying the virtual network segment. Allows 16,777,216 distinct virtual networks on the same underlay — vs VLAN\'s 12-bit 4096 limit.' },
      { term: 'MTU considerations', definition: 'VXLAN adds 50 bytes of overhead. If the underlay MTU is 1500, the overlay effective MTU is 1450. Mismatched MTU causes silent packet drops for large frames. Always set underlay MTU to 1550+ or configure overlay MTU to 1450.' },
    ],
    pitfalls: [
      'MTU mismatch — VXLAN 50-byte overhead causes fragmentation or drops when underlay MTU is 1500 and overlay also uses 1500. Always verify MTU end-to-end and configure the CNI plugin\'s MTU setting.',
      'Performance overhead — encapsulation and decapsulation consume CPU. On high-throughput nodes, overlay networking can become a bottleneck. Consider native routing (BGP underlay with Calico) for performance-sensitive workloads.',
      'Debugging complexity — packet captures look different inside vs outside the overlay. A problem visible at the overlay may be an underlay routing issue. Use tools that understand overlay protocols (e.g., cilium monitor for Cilium, weave status for Weave).',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between overlay and underlay networking?',
        answer: `The **underlay** is the physical network — real routers, switches, cables, and IP addresses. It provides basic IP connectivity between physical or virtual machines. The underlay has no knowledge of virtual networks running on top of it.

The **overlay** is a virtual network built on top of the underlay using encapsulation. Overlay protocols (VXLAN, GRE, Geneve) wrap original network packets inside new packet headers, creating logical tunnels that make physically distant endpoints appear directly connected.

Analogy: the underlay is the road system; the overlay is a dedicated private lane painted on top of the same roads. Traffic on the private lane follows the road system but appears isolated from other traffic.`,
      },
      {
        question: 'How does VXLAN work and why is it used in Kubernetes?',
        answer: `**VXLAN (Virtual Extensible LAN)** encapsulates an entire L2 Ethernet frame inside a UDP packet. Each VXLAN packet has:
- Outer Ethernet + IP + UDP headers (routing across the underlay)
- VXLAN header with a 24-bit VNI (identifies the virtual network)
- Inner Ethernet frame (the original L2 traffic)

Total overhead: 50 bytes. Default UDP port: 4789.

Kubernetes uses VXLAN because pods need a flat L2 network where any pod can reach any other pod by IP, regardless of which physical node they run on. Without overlay networking, pods on different nodes would be on different L2 segments. VXLAN creates the illusion of a single flat L2 network across all nodes.

CNI plugins like **Flannel** deploy a VTEP (VXLAN Tunnel Endpoint) on each node. When Pod A on Node 1 sends a packet to Pod B on Node 2, the VTEP on Node 1 encapsulates it in VXLAN/UDP and sends it to Node 2's VTEP, which decapsulates and delivers it to Pod B.`,
      },
      {
        question: 'What are the tradeoffs between VXLAN overlay and BGP-based underlay routing for Kubernetes?',
        answer: `**VXLAN overlay** (Flannel, Calico in VXLAN mode):
- Simpler to set up — works on any IP network without router configuration
- No dependency on the physical network — works in clouds where you cannot configure BGP
- Overhead: 50-byte encapsulation per packet, CPU cost for encap/decap
- Best for: most Kubernetes deployments, cloud environments, teams without network team access

**BGP underlay routing** (Calico in BGP mode, Cilium with native routing):
- No encapsulation overhead — pods use real routable IPs
- Better performance for high-throughput, low-latency workloads
- Requires the physical network to support BGP and advertise pod CIDRs
- Pods are directly reachable from outside the cluster without NAT
- Best for: on-premises data centers, bare-metal clusters, performance-critical workloads

Choose overlay for simplicity and portability. Choose underlay routing when performance matters and you have control over the physical network.`,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc7348',
      'https://kubernetes.io/docs/concepts/cluster-administration/networking/',
      'https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip',
      'https://docs.cilium.io/en/latest/network/concepts/routing/',
    ],
    quickFire: [
      { q: 'What is the underlay network?', a: 'The physical infrastructure -- real routers, switches, cables, and IP addresses that provide basic IP connectivity between nodes.' },
      { q: 'What is an overlay network?', a: 'A virtual network built on top of the underlay using encapsulation protocols (VXLAN, GRE, Geneve) that create logical tunnels between endpoints.' },
      { q: 'What does VXLAN stand for and what protocol does it use?', a: 'Virtual Extensible LAN. It encapsulates L2 Ethernet frames inside UDP packets on port 4789.' },
      { q: 'How much overhead does VXLAN add to each packet?', a: '50 bytes -- 14 VXLAN + 8 UDP + 20 IP + 8 outer Ethernet. With a 1500-byte underlay MTU, inner effective MTU is 1450.' },
      { q: 'How many virtual networks does VXLAN support vs VLANs?', a: 'VXLAN supports 16,777,216 virtual networks via its 24-bit VNI. VLANs support only 4,096 via a 12-bit ID.' },
      { q: 'What is a VTEP?', a: 'VXLAN Tunnel Endpoint -- the component that encapsulates outgoing frames and decapsulates incoming VXLAN packets. Each Kubernetes node runs a VTEP.' },
      { q: 'Why does Kubernetes use overlay networking?', a: 'Pods need a flat L2 network where any pod can reach any other pod by IP across different physical nodes. VXLAN creates this virtual L2 network.' },
      { q: 'What CNI plugin uses a simple VXLAN overlay for Kubernetes pod networking?', a: 'Flannel -- it deploys a VTEP on each node and encapsulates pod traffic in VXLAN for cross-node delivery.' },
      { q: 'What is the performance advantage of BGP underlay routing over VXLAN overlay?', a: 'No encapsulation overhead -- pods use real routable IPs and packets travel without VXLAN wrapping, reducing CPU cost and latency.' },
      { q: 'What MTU issue arises when enabling VXLAN on a 1500-byte MTU underlay?', a: 'VXLAN adds 50 bytes, leaving only 1450 bytes for the inner payload. Applications assuming 1500-byte MTU will have large packets silently dropped.' },
    ],
  },

  // ─── NEW TOPICS ────────────────────────────────────────────────────────────

  {
    id: 'ipv6-fundamentals',
    title: 'IPv6 Addressing & Dual Stack',
    icon: 'globe',
    color: '#3b82f6',
    questions: 6,
    description: 'IPv6 address format, address types, SLAAC vs DHCPv6, NDP, dual-stack vs NAT64, and Kubernetes dual-stack clusters.',
    visualizations: [],
    introduction: `IPv6 uses 128-bit addresses written as eight 16-bit groups in colon-hex notation (e.g., 2001:0db8:85a3::8a2e:0370:7334). Leading zeros in each group can be omitted, and one consecutive run of all-zero groups can be replaced with ::.

**Address types:**
- Link-local (fe80::/10): auto-configured, not routable, used on-link for NDP. Every interface has one.
- Global unicast (2000::/3): globally routable, equivalent to IPv4 public addresses.
- Unique local (fc00::/7): like RFC 1918, not globally routable.
- Multicast (ff00::/8): replaces IPv4 broadcast. NDP uses multicast for neighbor discovery.
- Anycast: same address assigned to multiple nodes; routing delivers to nearest.

**Address configuration:**
- SLAAC (Stateless Address Autoconfiguration): host generates its own address from the link-local prefix + EUI-64 (derived from MAC). No DHCP server needed. Router sends RA (Router Advertisement) with prefix.
- DHCPv6: like DHCPv4 but stateful. Assigns addresses from a pool. Required when you need to control specific assignments.

**NDP (Neighbor Discovery Protocol):** replaces ARP. Uses ICMPv6 multicast instead of broadcast. Key messages: Router Solicitation (RS), Router Advertisement (RA), Neighbor Solicitation (NS), Neighbor Advertisement (NA).

**Dual-stack** runs IPv4 and IPv6 simultaneously. A host gets both addresses and prefers IPv6 (Happy Eyeballs RFC 8305). **NAT64** + **DNS64** translates IPv6-only client connections to IPv4 backends — the DNS64 resolver synthesizes AAAA records for IPv4-only destinations.

**Kubernetes dual-stack** (stable in 1.23): pods and services get both IPv4 and IPv6 addresses. Requires two pod CIDRs, two service CIDRs, and a CNI that supports dual-stack (Calico, Cilium).`,
    whenToUse: [
      'Explaining why modern cloud environments prefer IPv6 for scale (AWS assigns /56 blocks to VPCs)',
      'Debugging NDP failures when IPv6 hosts cannot reach the gateway',
      'Configuring Kubernetes dual-stack and explaining CIDR planning',
      'Explaining NAT64 when deploying IPv6-only infrastructure with IPv4 dependencies',
    ],
    keyConcepts: [
      { term: 'EUI-64', definition: 'Method to derive a 64-bit interface ID from a 48-bit MAC address by inserting ff:fe in the middle and flipping bit 7. Used in SLAAC to generate the host portion of a link-local address.' },
      { term: 'SLAAC', definition: 'Stateless Address Autoconfiguration. Host listens for Router Advertisements containing the /64 prefix, then appends its EUI-64 to form a global unicast address — no DHCP server required.' },
      { term: 'NDP', definition: 'Neighbor Discovery Protocol (ICMPv6 types 133-137). Replaces ARP. Used for router discovery, prefix discovery, address resolution, and duplicate address detection.' },
      { term: 'NAT64 / DNS64', definition: 'Transition mechanism for IPv6-only clients reaching IPv4 servers. DNS64 synthesizes AAAA records from A records; NAT64 gateway translates packets between IPv6 and IPv4.' },
      { term: 'Happy Eyeballs', definition: 'RFC 8305 algorithm where clients race IPv4 and IPv6 connections with a 250ms delay preference for IPv6. Ensures IPv6 is used when available without penalizing IPv6-only delays.' },
    ],
    pitfalls: [
      'Forgetting to allow ICMPv6 in firewall rules — NDP requires ICMPv6 types 133-137. Blocking all ICMPv6 breaks IPv6 routing entirely.',
      'Planning /64 subnets too small — IPv6 subnets are always /64 for SLAAC compatibility. Never subnet below /64 for host-facing networks.',
      'Missing IPv6 in security group rules — IPv4 and IPv6 are separate stacks. An IPv4 allow rule does not cover the same traffic on IPv6.',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between SLAAC and DHCPv6, and when do you use each?',
        answer: `SLAAC (Stateless Address Autoconfiguration) lets hosts generate their own IPv6 addresses without a server. The router sends a Router Advertisement with the /64 prefix; the host appends its EUI-64 interface ID. There is no central record of which host has which address (stateless). Fast, zero-config for hosts.

DHCPv6 is stateful: a DHCPv6 server assigns specific addresses from a pool and keeps a lease database, just like DHCPv4. Use DHCPv6 when you need:
- Specific address assignments for servers/VMs (for firewall rules or DNS records)
- DNS suffix or other options that SLAAC RA cannot deliver (RFC 8106 adds DNS via RA, but support varies)
- Audit trail of address-to-host mappings

In practice: end-user LANs use SLAAC (no admin overhead), data center / cloud VM environments use DHCPv6 or static assignment for predictability. Kubernetes uses static pod CIDR allocation via the CNI plugin, not SLAAC.`,
      },
      {
        question: 'How does Kubernetes dual-stack work, and what changes when you enable it?',
        answer: `Kubernetes dual-stack (stable since 1.23) allows pods and Services to have both IPv4 and IPv6 addresses simultaneously.

Configuration requirements:
- Two pod CIDRs: --cluster-cidr=10.244.0.0/16,fd00:10:244::/56
- Two service CIDRs: --service-cluster-ip-range=10.96.0.0/16,fd00:10:96::/112
- CNI plugin with dual-stack support (Calico, Cilium, kindnet)
- kube-proxy in dual-stack mode

Pod behavior: each pod gets one IPv4 and one IPv6 address. The CNI assigns both. Both are routable within the cluster.

Service behavior: Services get a .spec.ipFamilyPolicy field — SingleStack (one family), PreferDualStack (dual if available), or RequireDualStack (fails if not supported). A dual-stack Service gets a ClusterIP in each family.

External access: dual-stack nodes expose both a 4-in-6 mapped address and a native IPv6 address for NodePort Services. LoadBalancer Services require the cloud provider LB to support dual-stack.

Main operational change: firewall rules and network policies must be written for both address families — an IPv4 NetworkPolicy does not restrict IPv6 traffic to the same pod.`,
      },
    ],
    references: [
      'https://kubernetes.io/docs/concepts/services-networking/dual-stack/',
      'https://www.rfc-editor.org/rfc/rfc4862',
      'https://www.rfc-editor.org/rfc/rfc8305',
    ],
    quickFire: [
      { q: 'How many bits are in an IPv6 address?', a: '128 bits, written as eight 16-bit groups in colon-hex notation.' },
      { q: 'What prefix denotes a link-local IPv6 address?', a: 'fe80::/10 — link-local addresses are auto-configured on every interface and are not routable beyond the local link.' },
      { q: 'What replaces ARP in IPv6?', a: 'NDP (Neighbor Discovery Protocol) using ICMPv6 multicast messages — specifically Neighbor Solicitation and Neighbor Advertisement.' },
      { q: 'What is SLAAC?', a: 'Stateless Address Autoconfiguration — hosts generate their own IPv6 global address by combining the router-advertised /64 prefix with their EUI-64 interface ID.' },
      { q: 'What is EUI-64?', a: 'A 64-bit interface identifier derived from a 48-bit MAC address by inserting ff:fe at the midpoint and flipping the universal/local bit.' },
      { q: 'What is NAT64?', a: 'A transition mechanism translating between IPv6-only clients and IPv4-only servers. DNS64 synthesizes AAAA records; NAT64 gateway translates packet headers.' },
      { q: 'What is the Happy Eyeballs algorithm?', a: 'RFC 8305 — clients race IPv4 and IPv6 connections with 250ms IPv6 preference. IPv6 wins if it connects first or within the delay window.' },
      { q: 'What is the minimum subnet size for SLAAC compatibility?', a: '/64 — SLAAC requires the host portion to be 64 bits for EUI-64 generation. Never subnet below /64 for host-facing networks.' },
      { q: 'Why does blocking all ICMPv6 break IPv6?', a: 'NDP (Neighbor Discovery) uses ICMPv6 types 133-137 for router discovery and address resolution. Without ICMPv6, hosts cannot discover routers or resolve neighbor addresses.' },
      { q: 'What Kubernetes version made dual-stack stable?', a: '1.23 (released December 2021). Dual-stack requires two pod CIDRs, two service CIDRs, and a dual-stack capable CNI plugin.' },
    ],
  },

  {
    id: 'quic-protocol',
    title: 'QUIC Protocol & Transport',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 6,
    description: 'QUIC over UDP, 0-RTT handshake, multiplexed streams without HOL blocking, connection migration, and HTTP/3.',
    visualizations: [],
    introduction: `QUIC (originally Google Quick UDP Internet Connections, now standardized as RFC 9000) is a multiplexed transport protocol built over UDP. It is the transport layer for HTTP/3 (RFC 9114).

**Why QUIC?** TCP + TLS has two fundamental problems at scale:
1. **Head-of-line blocking**: TCP delivers bytes in order. One lost packet stalls all data behind it, even data from unrelated requests.
2. **Slow connection setup**: TCP handshake (1 RTT) + TLS 1.3 handshake (1 RTT) = 2 RTTs before the first byte of application data.

**QUIC solves both:**
- **Multiplexed streams**: QUIC runs multiple independent byte streams over one connection. A lost packet only blocks the stream it belongs to, not other streams.
- **0-RTT / 1-RTT handshake**: QUIC merges the transport and TLS handshakes into a single 1-RTT exchange. With session resumption, 0-RTT allows data in the first packet (with replay caveats).
- **Connection migration**: QUIC connections are identified by a Connection ID, not the (IP, port) tuple. A mobile client can switch from Wi-Fi to LTE and maintain the same QUIC connection.

**QUIC packet structure**: encrypted at the QUIC layer (not just TLS). Even QUIC headers are partially encrypted to prevent middlebox ossification. Only the Connection ID and packet number are visible.

**Deployment**: Cloudflare, Google, Facebook, and Akamai carry significant QUIC traffic. In Kubernetes, HTTP/3 Ingress support is available in nginx-ingress (experimental) and Envoy (stable). gRPC over HTTP/3 is in progress.`,
    whenToUse: [
      'Explaining why HTTP/3 uses UDP instead of TCP',
      'Justifying QUIC for mobile applications with frequent network changes',
      'Debugging connection migration or 0-RTT replay issues',
      'Comparing QUIC with WebSockets or gRPC for real-time systems',
    ],
    keyConcepts: [
      { term: 'Head-of-line blocking', definition: 'TCP delivers bytes strictly in order. A single lost packet blocks all subsequent data on that connection, even from unrelated requests. QUIC eliminates this with independent streams.' },
      { term: '0-RTT handshake', definition: 'QUIC session resumption allows the client to send application data in the very first packet using a cached session ticket. Caution: 0-RTT data is replay-vulnerable (not idempotent-safe).' },
      { term: 'Connection ID', definition: 'A QUIC connection identifier that is independent of the client IP and port. Enables connection migration: the client can change networks and keep the same QUIC connection.' },
      { term: 'Stream multiplexing', definition: 'QUIC runs multiple independent byte streams over one UDP connection. A lost packet blocks only its own stream, not others — eliminating the TCP head-of-line blocking problem.' },
      { term: 'Connection migration', definition: 'When the client IP or port changes (e.g., Wi-Fi to LTE), QUIC sends a PATH_CHALLENGE to the new path and continues the same logical connection using the Connection ID.' },
    ],
    pitfalls: [
      '0-RTT replay vulnerability — 0-RTT data can be replayed by a network attacker. Never use 0-RTT for non-idempotent requests (POST, payment operations). Safe for GETs with cache semantics.',
      'UDP blocking by enterprise firewalls — many corporate networks block or rate-limit UDP 443. QUIC clients must fall back to TCP+TLS (Alt-Svc header informs clients of QUIC availability). Plan for TCP fallback.',
      'Middlebox interference — NAT devices and stateful firewalls expect TCP connection tracking. QUIC uses UDP, so NAT state times out faster. Clients must send keep-alive packets more aggressively.',
    ],
    keyQuestions: [
      {
        question: 'How does QUIC eliminate head-of-line blocking that TCP suffers from?',
        answer: `TCP delivers bytes as a single ordered byte stream. If packet N is lost, the TCP receiver cannot deliver packets N+1, N+2, ... to the application even if they arrived — it waits for retransmission of N. This stalls every HTTP/2 stream multiplexed over the same TCP connection.

QUIC sends each HTTP stream as an independent QUIC stream within the same UDP flow. Streams are identified by a stream ID in the QUIC packet. A lost packet carrying stream 5 data only blocks stream 5 — the QUIC layer delivers stream 1, 3, 7 data to the application immediately. Each stream has its own flow control.

Result: HTTP/3 over QUIC achieves true application-layer multiplexing without transport-layer blocking. In high-loss environments (mobile, satellite), this is a significant latency improvement over HTTP/2.

Note: QUIC still has head-of-line blocking within a single stream — a lost packet for stream 5 blocks later stream 5 data. The improvement is cross-stream isolation.`,
      },
      {
        question: 'What is QUIC connection migration and why does it matter for mobile users?',
        answer: `QUIC identifies connections by a Connection ID (an opaque byte string negotiated at handshake), not by the (source IP, source port, destination IP, destination port) 4-tuple that TCP uses.

When a mobile client switches from Wi-Fi (192.168.1.5:54321) to LTE (10.0.0.2:62000), the TCP connection is dead — the 4-tuple changed, the server has no matching connection. The client must reconnect: new TCP handshake, new TLS handshake, HTTP/2 re-establishment.

With QUIC, the client sends a PATH_CHALLENGE on the new path (LTE). The server verifies the new path and updates the destination tuple while keeping the same Connection ID and session state. The connection continues with no re-handshake, no session restart, and no application-visible interruption.

This matters for: mobile apps on trains/elevators, laptop users moving between networks, and IoT devices with intermittent connectivity. Services like Google Meet and YouTube use QUIC to maintain streams across network changes.

Caveat: connection migration requires that the server's IP does not change. For load-balanced deployments, consistent hashing on Connection ID (not 5-tuple) is required so migrated connections reach the same backend.`,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc9000',
      'https://www.rfc-editor.org/rfc/rfc9114',
      'https://blog.cloudflare.com/http3-the-past-present-and-future/',
    ],
    quickFire: [
      { q: 'What transport protocol does QUIC use?', a: 'UDP. QUIC implements its own reliability, ordering, and congestion control on top of UDP.' },
      { q: 'What is HTTP/3?', a: 'HTTP/3 is HTTP semantics (methods, headers, status codes) running over QUIC instead of TCP+TLS. RFC 9114.' },
      { q: 'How many RTTs does a new QUIC connection require before sending data?', a: '1 RTT — QUIC merges the transport and TLS 1.3 handshakes into a single exchange.' },
      { q: 'What is 0-RTT in QUIC and what is its security risk?', a: '0-RTT allows clients to send application data in the first packet using a cached session ticket. Risk: 0-RTT data is replay-vulnerable — an attacker can replay the first packet.' },
      { q: 'How does QUIC identify connections?', a: 'By a Connection ID, not by the (IP, port) 4-tuple. This enables connection migration when the client changes networks.' },
      { q: 'What problem does QUIC stream multiplexing solve?', a: 'TCP head-of-line blocking — a lost packet blocks all subsequent data on the TCP connection. QUIC streams are independent; a loss only blocks that stream.' },
      { q: 'Why do enterprise firewalls often block QUIC?', a: 'Many firewalls block or rate-limit UDP 443. QUIC clients fall back to TCP+TLS via the Alt-Svc header.' },
      { q: 'How does QUIC handle connection migration when a mobile user switches networks?', a: 'The client sends a PATH_CHALLENGE on the new network path. The server validates and updates the routing tuple while keeping the same Connection ID and session.' },
      { q: 'Is QUIC encryption optional like TCP?', a: 'No. QUIC encrypts all payload and most header fields using TLS 1.3. There is no unencrypted QUIC.' },
      { q: 'What is the QUIC Connection ID used for?', a: 'To identify the QUIC connection independently of the client IP and port, enabling connection migration and consistent load balancer routing.' },
    ],
  },

  {
    id: 'ebpf-xdp',
    title: 'eBPF Networking & XDP',
    icon: 'share2',
    color: '#8b5cf6',
    questions: 6,
    description: 'eBPF program types, XDP packet processing pipeline, Cilium eBPF dataplane, BPF maps, and bpftrace for network debugging.',
    visualizations: [],
    introduction: `eBPF (extended Berkeley Packet Filter) allows safely running sandboxed programs in the Linux kernel without modifying kernel source code. Originally designed for packet filtering (classic BPF in tcpdump), eBPF now powers networking, observability, and security in production at scale.

**eBPF program types for networking:**
- **XDP (eXpress Data Path)**: attaches at the lowest point in the network driver, before the kernel networking stack allocates an sk_buff. Three modes: DRV (driver-native, fastest), SKB (generic, slower), HW (offloaded to NIC). Actions: XDP_DROP, XDP_PASS, XDP_TX (hairpin), XDP_REDIRECT.
- **TC (Traffic Control)**: attaches at the tc ingress/egress hook. Has access to sk_buff metadata. Used for NAT, packet mangling, and policy after sk_buff allocation.
- **Socket programs**: sk_filter for per-socket packet filtering, sockops for TCP socket option manipulation, sk_msg for redirecting between sockets.

**BPF maps**: kernel data structures shared between eBPF programs and user space. Types: hash, array, LRU hash, per-CPU variants, ring buffer. Used for connection tracking, rate limit counters, policy rules, and observability data export.

**Cilium**: Kubernetes CNI that uses eBPF to replace kube-proxy (iptables) entirely. Policy enforcement, load balancing, encryption (WireGuard/IPSec), and observability (Hubble) are all implemented as eBPF programs. At 1M iptables rules, iptables lookups are O(n); eBPF hash maps are O(1).

**bpftrace**: high-level tracing language for writing eBPF probes. Single-line network debugging: bpftrace -e 'tracepoint:net:net_dev_queue { @[args->name] = count(); }' — counts packets per interface in real time.`,
    whenToUse: [
      'Explaining why Cilium outperforms iptables-based kube-proxy at scale',
      'Debugging network performance with bpftrace one-liners',
      'Designing DDoS mitigation at the XDP layer (drop before kernel stack)',
      'Understanding how Kubernetes network policy is enforced at the eBPF level',
    ],
    keyConcepts: [
      { term: 'XDP (eXpress Data Path)', definition: 'eBPF hook at the NIC driver level, before sk_buff allocation. Fastest possible packet processing — can drop/redirect millions of packets per second per core. Used for DDoS mitigation and load balancing.' },
      { term: 'BPF map', definition: 'Kernel data structure (hash, array, ring buffer, etc.) shared between eBPF programs and user space via file descriptors. Persists across program invocations — used for connection state, counters, and policy tables.' },
      { term: 'Cilium', definition: 'Kubernetes CNI using eBPF for all networking: pod-to-pod routing, L3/L4/L7 NetworkPolicy, kube-proxy replacement (eBPF load balancing), encryption, and Hubble flow observability.' },
      { term: 'Hubble', definition: 'Cilium observability layer built on eBPF. Provides per-flow L3/L4/L7 visibility without sidecar proxies — DNS queries, HTTP requests, TCP connections, drop reasons — all exported as structured flow records.' },
      { term: 'bpftrace', definition: 'High-level language for writing eBPF tracing probes. Supports tracepoints, kprobes, uprobes, and USDT. Enables one-liner kernel debugging without C programming or kernel recompilation.' },
    ],
    pitfalls: [
      'XDP DRV mode requires driver support — not all NIC drivers implement XDP natively. Check with ethtool -i and ip link show for xdp support. Fall back to SKB mode if needed (slower but universal).',
      'BPF map size is fixed at creation — hash maps do not grow dynamically. Choose map sizes conservatively based on expected maximum entries; a full map causes ENOSPC errors and silent drops.',
      'Mixing Cilium with kube-proxy causes conflicts — Cilium in kube-proxy replacement mode installs its own BPF load-balancing programs. Running kube-proxy alongside creates duplicate NAT rules and unpredictable behavior. Disable kube-proxy when using Cilium full replacement.',
    ],
    keyQuestions: [
      {
        question: 'How does Cilium eBPF replace iptables for Kubernetes networking, and why is it better at scale?',
        answer: `Traditional Kubernetes uses kube-proxy to program iptables rules for Service load balancing and NetworkPolicy enforcement. iptables is a linear chain of rules — adding a Service adds multiple rules (DNAT for each endpoint). At 10,000 Services, a packet traverses thousands of iptables rules per lookup. This is O(n) per packet and causes measurable latency at scale. Rule updates also require a full iptables-restore, which holds a lock and causes brief packet drops.

Cilium replaces kube-proxy entirely with eBPF programs:
- Service load balancing uses a BPF hash map keyed by (VIP, port) → (endpoint list). Lookup is O(1) regardless of the number of Services.
- NetworkPolicy is enforced in BPF programs attached at the TC hook per pod veth interface. Policy rules are compiled into BPF bytecode and loaded into the kernel — no iptables chains at all.
- Connection tracking uses a BPF LRU hash map instead of the kernel conntrack table, which also has scaling issues.

Results at scale: at 100,000 Services, iptables update takes >11 seconds; Cilium eBPF update takes <1 second. Per-packet latency is lower because packets hit the BPF program at XDP or TC before traversing iptables chains.

Hubble adds zero-overhead observability by reading flow data from BPF ring buffer maps — no sidecar required.`,
      },
      {
        question: 'What is XDP and how is it used for DDoS mitigation?',
        answer: `XDP (eXpress Data Path) attaches eBPF programs at the network driver hook — before the kernel allocates an sk_buff (socket buffer). This is the earliest possible point in the kernel receive path.

DDoS mitigation with XDP:
1. The XDP program reads the packet header (Ethernet, IP, TCP/UDP) directly from the DMA ring buffer.
2. It looks up the source IP in a BPF hash map of known attack sources.
3. If the source is in the blocklist, it returns XDP_DROP — the packet is discarded immediately without touching the kernel stack, allocating memory, or waking up user space.
4. Legitimate traffic returns XDP_PASS and flows normally through the kernel network stack.

Performance: XDP DRV mode on modern NICs can drop 20-30 million packets per second per core. This is sufficient to absorb volumetric UDP/ICMP floods without impacting legitimate traffic.

Cloudflare uses XDP in production for their DDoS mitigation pipeline. Their system processes flow metadata in BPF maps to detect attack signatures and push block rules to XDP programs across all edge servers within seconds.

Key advantage over iptables DROP: iptables operates after sk_buff allocation (CPU + memory overhead). XDP drops before allocation — the kernel never processes the packet, making it nearly free per dropped packet.`,
      },
    ],
    references: [
      'https://docs.cilium.io/en/latest/network/ebpf/',
      'https://www.kernel.org/doc/html/latest/bpf/index.html',
      'https://github.com/iovisor/bpftrace',
    ],
    quickFire: [
      { q: 'What does eBPF stand for?', a: 'Extended Berkeley Packet Filter. Originally for packet filtering, now a general-purpose kernel extension mechanism.' },
      { q: 'What is XDP and at what point in the network stack does it run?', a: 'eXpress Data Path — eBPF hook at the NIC driver level, before sk_buff allocation. The earliest possible packet processing point.' },
      { q: 'What are the three XDP driver modes?', a: 'DRV (driver-native, fastest), SKB (generic fallback), HW (offloaded to NIC hardware).' },
      { q: 'What XDP action drops a packet without processing?', a: 'XDP_DROP — the packet is discarded at the driver level without allocating kernel memory.' },
      { q: 'What is a BPF map?', a: 'A kernel data structure (hash, array, ring buffer) shared between eBPF programs and user space via file descriptors. Used for connection state, counters, and policy tables.' },
      { q: 'Why does Cilium outperform iptables at scale?', a: 'iptables rules are O(n) linear lookup. Cilium uses BPF hash maps with O(1) lookup for Service load balancing and NetworkPolicy, regardless of rule count.' },
      { q: 'What is Hubble in the Cilium ecosystem?', a: 'The observability layer — reads per-flow L3/L4/L7 data from BPF ring buffers to provide DNS, HTTP, and TCP visibility without sidecar proxies.' },
      { q: 'What is bpftrace used for?', a: 'Writing eBPF tracing probes in a high-level language for one-liner kernel debugging — tracepoints, kprobes, uprobes — without C or kernel recompilation.' },
      { q: 'What happens when a BPF map is full?', a: 'Hash map inserts return ENOSPC. Packets requiring new map entries may be silently dropped. Size maps conservatively at creation.' },
      { q: 'Why should Cilium not run alongside kube-proxy?', a: 'Both install NAT rules for Services. Cilium in kube-proxy replacement mode installs its own BPF programs; kube-proxy iptables rules create duplicates and unpredictable routing.' },
    ],
  },

  {
    id: 'mtls-spiffe',
    title: 'mTLS & SPIFFE/SPIRE Workload Identity',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'mTLS handshake mechanics, SPIFFE workload identity, SPIRE attestation, Istio PeerAuthentication, and certificate rotation.',
    visualizations: [],
    introduction: `mTLS (mutual TLS) extends standard TLS so both the client and server present and validate certificates. It provides cryptographic service-to-service identity — neither side can be impersonated without the corresponding private key.

**mTLS handshake additions vs TLS:**
1. Server sends CertificateRequest after its own Certificate message.
2. Client responds with its certificate and a CertificateVerify (signature over the handshake transcript using its private key).
3. Server validates the client certificate against its trusted CA.

**SPIFFE (Secure Production Identity Framework for Everyone):** a CNCF standard that defines workload identity. A SPIFFE ID is a URI: spiffe://trust-domain/path (e.g., spiffe://example.com/ns/payments/sa/billing-service). The X.509 certificate encoding a SPIFFE ID is called an SVID (SPIFFE Verifiable Identity Document).

**SPIRE (SPIFFE Runtime Environment):** the reference implementation. The SPIRE Server is the CA; SPIRE Agents run on each node and attest workloads (by UID, binary hash, Kubernetes service account, or cloud metadata). On attestation, the agent issues a short-lived SVID (typically 1 hour). SVIDs are automatically rotated before expiry.

**Istio integration:** Istio's control plane (istiod) is a SPIFFE-compatible CA. It issues SVIDs to each Envoy sidecar. PeerAuthentication policy enforces mTLS: STRICT (reject plaintext), PERMISSIVE (allow both — for migration). Authorization policy uses SPIFFE IDs for allow/deny decisions at L7.

**Certificate pinning:** pins a specific certificate or public key instead of trusting any cert from a CA. More brittle but eliminates CA compromise risk. Used for critical internal APIs.`,
    whenToUse: [
      'Designing zero-trust service-to-service authentication in microservices',
      'Explaining why Istio/Linkerd use short-lived certs instead of long-lived API keys',
      'Debugging mTLS handshake failures (wrong trust domain, expired SVIDs)',
      'Comparing SPIFFE vs traditional PKI for dynamic cloud workloads',
    ],
    keyConcepts: [
      { term: 'SPIFFE ID', definition: 'A URI workload identity: spiffe://trust-domain/path. Encoded in the X.509 SAN (Subject Alternative Name) field. Uniquely identifies a workload regardless of IP address or hostname.' },
      { term: 'SVID', definition: 'SPIFFE Verifiable Identity Document. An X.509 certificate or JWT encoding a SPIFFE ID. Issued by SPIRE and typically valid for 1 hour with automatic rotation.' },
      { term: 'SPIRE Agent', definition: 'Runs on each node. Attests workloads via selectors (UID, binary checksum, K8s service account, AWS instance identity). Issues SVIDs to attested workloads via the Workload API.' },
      { term: 'PeerAuthentication', definition: 'Istio policy that controls mTLS mode per namespace or workload. STRICT rejects plaintext; PERMISSIVE accepts both (for brownfield migration). Applied via Kubernetes CRD.' },
      { term: 'Short-lived certificates', definition: 'SVIDs valid for 1 hour (vs traditional certs valid for 1 year). Compromise of a short-lived cert is bounded in time. Eliminates the need for CRL/OCSP revocation infrastructure.' },
    ],
    pitfalls: [
      'PERMISSIVE mode is not zero-trust — plaintext connections are accepted. Use PERMISSIVE only during migration; switch to STRICT once all services are meshed. Monitor plaintext traffic in Hubble/Kiali during transition.',
      'Trust domain mismatch causes silent mTLS failures — SPIFFE IDs must share a trust domain or have explicit federated trust. A workload from spiffe://cluster-a.example.com cannot authenticate to a service expecting spiffe://cluster-b.example.com without federation.',
      'Clock skew breaks certificate validation — SVIDs have tight validity windows. Nodes with NTP drift >5 minutes will have SVIDs rejected as "not yet valid" or "expired." Ensure time sync across all nodes.',
    ],
    keyQuestions: [
      {
        question: 'How does SPIFFE/SPIRE provide workload identity without secrets or API keys?',
        answer: `Traditional service authentication requires secrets (API keys, shared passwords) embedded in the application or environment. These are static, hard to rotate, and create a secret distribution problem.

SPIFFE eliminates static secrets by using attestation:
1. The SPIRE Agent on each node attests itself to the SPIRE Server using a node-level trust anchor (e.g., AWS instance identity document, cloud provider metadata).
2. When a workload starts, it calls the Workload API (Unix domain socket on the node). The SPIRE Agent attests the workload using selectors — on Kubernetes, this includes the pod service account, namespace, and pod name.
3. If attestation passes, the SPIRE Agent issues a short-lived SVID (X.509 cert with the workload's SPIFFE ID in the SAN). The private key never leaves the node.
4. The workload uses the SVID for mTLS with other services. The receiving service validates the SPIFFE ID against its authorization policy.

Rotation: SVIDs expire in ~1 hour. SPIRE agents automatically renew before expiry. If a node is compromised and an SVID stolen, it is valid for at most 1 hour.

No secret distribution: there are no long-lived API keys. Workload identity is bound to runtime properties (service account, node attestation) rather than static credentials.`,
      },
      {
        question: 'What is the difference between Istio PERMISSIVE and STRICT mTLS mode, and when do you use each?',
        answer: `Istio PeerAuthentication policy controls whether Envoy sidecars require mTLS from peers:

STRICT mode: all incoming connections must present a valid client certificate with a SPIFFE ID. Plaintext connections are rejected with a TLS handshake error. This is the zero-trust target state — only meshed services with valid SVIDs can communicate.

PERMISSIVE mode: sidecars accept both mTLS and plaintext. They upgrade mTLS connections to mutual auth but do not reject plaintext. Authorization policy can still apply to mTLS-authenticated traffic.

When to use each:
- PERMISSIVE during migration: when adding a service to the mesh, it may receive traffic from unmeshed clients. PERMISSIVE allows incremental rollout without breaking existing connections.
- STRICT in steady state: once all services that talk to a workload are meshed, switch to STRICT. This is the security goal.

Migration pattern:
1. Deploy new service with PERMISSIVE.
2. Monitor in Kiali/Hubble for plaintext traffic sources.
3. Mesh those sources one by one.
4. Switch to STRICT once all traffic sources are identified and meshed.

Important: PERMISSIVE does not mean insecure mTLS — the mTLS connections are still fully authenticated. PERMISSIVE just allows the fallback path for unmeshed clients.`,
      },
    ],
    references: [
      'https://spiffe.io/docs/latest/spiffe-about/overview/',
      'https://istio.io/latest/docs/concepts/security/#mutual-tls-authentication',
      'https://www.rfc-editor.org/rfc/rfc8705',
    ],
    quickFire: [
      { q: 'What does mTLS add to standard TLS?', a: 'The client also presents a certificate, and the server validates it — mutual authentication instead of server-only authentication.' },
      { q: 'What is a SPIFFE ID?', a: 'A URI workload identity: spiffe://trust-domain/path. Encoded in the X.509 SAN field to uniquely identify a workload.' },
      { q: 'What is an SVID?', a: 'SPIFFE Verifiable Identity Document — an X.509 certificate encoding a SPIFFE ID, issued by SPIRE with a short lifetime (typically 1 hour).' },
      { q: 'How does SPIRE attest a Kubernetes workload?', a: 'The SPIRE Agent uses selectors (pod service account, namespace, pod name) to attest workloads and issues an SVID via the Unix domain socket Workload API.' },
      { q: 'What is Istio PeerAuthentication STRICT mode?', a: 'Envoy sidecars reject all plaintext connections. Only mTLS with a valid SPIFFE client certificate is accepted.' },
      { q: 'What is PERMISSIVE mode used for?', a: 'Migration — allows both mTLS and plaintext so unmeshed services can still connect while the mesh is being rolled out incrementally.' },
      { q: 'Why are short-lived SVIDs (1 hour) better than long-lived certificates?', a: 'A compromised SVID is valid for at most 1 hour. Eliminates the need for CRL/OCSP revocation infrastructure.' },
      { q: 'What causes a trust domain mismatch error in SPIFFE?', a: 'Two services with SPIFFE IDs in different trust domains without federated trust configuration. The receiving service rejects the client certificate.' },
      { q: 'What infrastructure issue can break SVID validation?', a: 'NTP clock skew >5 minutes causes SVIDs to be rejected as "not yet valid" or "expired" due to their tight validity windows.' },
      { q: 'What is certificate pinning vs CA-based trust?', a: 'Pinning trusts a specific certificate or public key. CA-based trust accepts any cert signed by a trusted CA. Pinning eliminates CA compromise risk but is brittle to certificate rotation.' },
    ],
  },

  {
    id: 'network-observability',
    title: 'Network Observability & Flow Analysis',
    icon: 'tool',
    color: '#f97316',
    questions: 6,
    description: 'NetFlow/sFlow/IPFIX, VPC flow logs, Hubble, Prometheus network metrics, East-West traffic visibility, and anomaly detection.',
    visualizations: [],
    introduction: `Network observability provides visibility into what traffic is flowing where — without full packet capture. Modern network observability stacks use flow records, metrics, and structured logs rather than raw PCAP.

**Flow record protocols:**
- **NetFlow v9 / IPFIX (RFC 7011):** Cisco-originated, now standardized. Network devices export flow records (5-tuple + byte/packet counts + timestamps) to a collector. IPFIX is the IETF standardization of NetFlow v9.
- **sFlow:** samples 1-in-N packets rather than tracking all flows. Lower overhead, suitable for high-speed links. Less accurate for small flows.
- **VPC Flow Logs (AWS/GCP/Azure):** cloud-managed flow logging. AWS VPC Flow Logs write to CloudWatch Logs or S3. Fields: srcaddr, dstaddr, srcport, dstport, protocol, packets, bytes, action (ACCEPT/REJECT). Enable per-ENI, per-subnet, or per-VPC. Critical for security incident investigation.

**Kubernetes-native observability:**
- **Hubble (Cilium):** exports L3/L4/L7 flow records from eBPF ring buffers. DNS queries, HTTP method/path/status, TCP RSTs, drop reasons — all without sidecar overhead. Queried via hubble observe CLI or Hubble UI.
- **Prometheus + kube-state-metrics + node-exporter:** metrics-based. Track interface bytes/packets/errors, TCP socket states (ss -s), conntrack table utilization.

**Distributed tracing:** correlates network calls with application spans. Jaeger/Tempo track latency across microservice calls. Istio injects trace headers (X-B3-TraceId) automatically.

**Anomaly detection patterns:** baseline normal traffic profiles (bytes/s per service pair, connection counts, error rates). Alert on: sudden bandwidth spikes, new service-to-service connections, abnormal port usage, high TCP RST rates, or REJECT spikes in VPC flow logs.`,
    whenToUse: [
      'Investigating a security incident — which external IPs communicated with a compromised host?',
      'Capacity planning — which service pairs generate the most East-West traffic?',
      'Debugging Kubernetes DNS failures — is the query reaching CoreDNS?',
      'Detecting lateral movement in a compromised cluster via abnormal connection patterns',
    ],
    keyConcepts: [
      { term: 'IPFIX', definition: 'IP Flow Information Export (RFC 7011). IETF standardization of NetFlow v9. Network devices export flow records (5-tuple, bytes, packets, timestamps) to a collector. The standard format for NetFlow-compatible systems.' },
      { term: 'VPC Flow Logs', definition: 'Cloud-managed flow record service. AWS logs per-ENI flows to CloudWatch/S3 with ACCEPT/REJECT action. GCP logs per-VM flows with project/region metadata. Essential for security investigations and compliance.' },
      { term: 'Hubble', definition: 'Cilium\'s network observability layer. Reads eBPF ring buffer data to export per-flow L3/L4/L7 records — DNS, HTTP, TCP drops — without sidecars. Accessible via hubble observe CLI.' },
      { term: 'East-West traffic', definition: 'Traffic between services within the same data center or cluster. Often invisible to traditional network monitoring (which focuses on North-South ingress/egress). Service mesh and CNI observability cover East-West.' },
      { term: 'sFlow', definition: 'Statistical sampling of 1-in-N packets. Lower overhead than NetFlow for high-throughput links. Less accurate for bursty small flows. Common in data center switching fabrics.' },
    ],
    pitfalls: [
      'VPC Flow Logs capture accepted and rejected traffic but not metadata about why — a REJECT from a Security Group does not tell you which rule matched. Correlate with Security Group audit logs or AWS Config for the rule.',
      'Hubble does not capture traffic outside the Cilium-managed interfaces — hostNetwork pods and node-level traffic bypass Cilium and are not visible in Hubble. Use node-level tools (tcpdump, bpftrace) for host network namespace traffic.',
      'Flow sampling (sFlow) misses short-lived connections — a connection that completes in one packet may never be sampled. Use IPFIX (full flow tracking) for security investigations where completeness matters.',
    ],
    keyQuestions: [
      {
        question: 'How do you use VPC Flow Logs to investigate a security incident?',
        answer: `VPC Flow Logs capture a record per flow per network interface. For a security investigation:

1. Enable VPC Flow Logs at the VPC level (not just subnet) to capture all ENI traffic. Send to S3 for long-term retention and Athena queries.

2. For an incident investigation, identify the compromised EC2 instance's ENI ID. Query flow logs for that ENI:
   - All ACCEPT records from unusual source IPs (external scanning or C2 callback)
   - All REJECT records (port scanning against the instance — what was probed?)
   - Outbound connections from the instance to unusual destinations

3. Athena query example:
   SELECT srcaddr, dstaddr, dstport, action, SUM(bytes) as total_bytes
   FROM vpc_flow_logs
   WHERE (srcaddr = '10.0.1.15' OR dstaddr = '10.0.1.15')
   AND start > 1700000000
   GROUP BY srcaddr, dstaddr, dstport, action
   ORDER BY total_bytes DESC

4. Look for: data exfiltration (large outbound bytes to external IPs), lateral movement (connections to other private IPs not in normal baselines), C2 beaconing (periodic small connections to external IPs).

Limitation: VPC Flow Logs do not capture HTTP-level data (URLs, request bodies). For that, use ALB access logs or WAF logs in addition to flow logs.`,
      },
      {
        question: 'How does Hubble provide L7 network visibility without sidecar proxies?',
        answer: `Traditional service mesh observability (Istio + Envoy sidecars) intercepts traffic by inserting a proxy container alongside each application pod. The proxy logs all HTTP requests and responses. This adds ~50-100ms startup latency per pod, ~10MB memory per sidecar, and latency per request.

Hubble uses eBPF instead:
1. Cilium attaches eBPF programs at the TC (Traffic Control) hook on each pod's veth interface.
2. For L7 visibility, Cilium parses HTTP/DNS/Kafka protocol headers in the eBPF program (Cilium Layer 7 proxy feature uses Envoy as a per-node shared proxy, not per-pod).
3. Flow records are written to a BPF ring buffer in the kernel.
4. The Hubble agent (one per node) reads from the ring buffer and exports structured flow records via gRPC to the Hubble Relay.

Result: full L7 visibility (HTTP method, path, status code; DNS query, response, NXDOMAIN; Kafka topic, produce/consume) with zero per-pod sidecar overhead.

CLI usage:
hubble observe --namespace payments --protocol http
hubble observe --namespace kube-system --type drop
hubble observe --from-pod payments/billing-service --to-pod payments/database

Hubble UI provides a service map showing which services communicate and their error rates.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html',
      'https://docs.cilium.io/en/latest/observability/hubble/',
      'https://www.rfc-editor.org/rfc/rfc7011',
    ],
    quickFire: [
      { q: 'What is IPFIX?', a: 'IP Flow Information Export (RFC 7011) — the IETF standard for exporting network flow records (5-tuple, bytes, packets, timestamps) from network devices to collectors.' },
      { q: 'What is the difference between NetFlow and sFlow?', a: 'NetFlow tracks every flow (complete records). sFlow samples 1-in-N packets (lower overhead, less accurate for small/short flows).' },
      { q: 'What does AWS VPC Flow Logs capture?', a: '5-tuple (src/dst IP, src/dst port, protocol), bytes, packets, start/end time, and ACCEPT/REJECT action per flow per ENI.' },
      { q: 'What traffic does VPC Flow Logs miss?', a: 'Instance metadata service traffic (169.254.169.254), Windows license activation traffic, DNS to the VPC DNS server (Route 53 Resolver). These are filtered by default.' },
      { q: 'What is East-West traffic?', a: 'Traffic between services within the same data center or cluster. Service mesh and CNI observability tools (Hubble, Cilium) provide East-West visibility; traditional monitoring focuses on North-South.' },
      { q: 'How does Hubble achieve L7 visibility without per-pod sidecars?', a: 'eBPF programs on each pod veth interface parse HTTP/DNS headers; a per-node shared Envoy proxy handles L7 policy. Flow records are exported from BPF ring buffers with zero per-pod overhead.' },
      { q: 'What Hubble command shows HTTP traffic in a namespace?', a: 'hubble observe --namespace <ns> --protocol http -- shows HTTP flows with method, path, and status codes.' },
      { q: 'What is a good anomaly detection signal in VPC flow logs?', a: 'REJECT action spike (port scanning), new destination IPs not in baseline, large outbound bytes to external IPs (exfiltration), or periodic small connections to external IPs (C2 beaconing).' },
      { q: 'What tool queries VPC Flow Logs stored in S3?', a: 'Amazon Athena — allows SQL queries over flow log Parquet/text files in S3 with no data movement.' },
      { q: 'What is distributed tracing and how does it relate to network observability?', a: 'Distributed tracing (Jaeger, Tempo) correlates application spans across microservice calls by propagating trace headers. Istio auto-injects X-B3-TraceId headers, linking network flow data to application traces.' },
    ],
  },

  {
    id: 'wireguard-protocol',
    title: 'WireGuard VPN Protocol',
    icon: 'shield',
    color: '#ef4444',
    questions: 5,
    description: 'WireGuard cryptographic design, configuration, kernel integration, Kubernetes use (Cilium/Flannel encryption), and comparison with IPSec and OpenVPN.',
    visualizations: [],
    introduction: `WireGuard is a modern, cryptographically opinionated VPN protocol built into the Linux kernel (5.6+). It is designed to be simpler, faster, and more secure than IPSec or OpenVPN.

**Cryptographic design (no negotiation):** WireGuard does not negotiate algorithms. It uses a fixed modern suite: X25519 for key exchange, ChaCha20-Poly1305 for encryption/authentication, and BLAKE2s for hashing. No cipher suites, no downgrade attacks.

**Peers and allowed IPs:** WireGuard is connectionless — there are no sessions. Each peer is identified by its public key and configured with AllowedIPs (the IP ranges it routes to/from). When a packet arrives, WireGuard looks up the source IP in the AllowedIPs of known peers and validates the packet signature. Invalid packets are dropped silently.

**Roaming / stealth:** WireGuard endpoints do not respond to unauthenticated packets. A WireGuard server is invisible to port scanners — no response to probes without a valid handshake. The client always initiates.

**Kernel implementation:** the userspace implementation is wg-quick; the kernel module handles all crypto in kernel space (or hardware offload). The entire implementation is ~4,000 lines of code (vs OpenVPN's ~70,000 or StrongSwan IPSec's ~300,000).

**Kubernetes use:** Cilium and Flannel both support WireGuard for transparent pod-to-pod encryption. Cilium activates WireGuard per-node with --enable-wireguard. All inter-node pod traffic is encrypted without application changes. Tailscale uses WireGuard as its underlying protocol.`,
    whenToUse: [
      'Selecting a VPN protocol for cloud-to-on-premises connectivity',
      'Explaining why Cilium WireGuard encryption adds less overhead than IPSec',
      'Configuring site-to-site VPN between two cloud VPCs',
      'Justifying WireGuard over OpenVPN for Kubernetes pod encryption',
    ],
    keyConcepts: [
      { term: 'AllowedIPs', definition: 'Per-peer IP ranges that WireGuard routes through that peer. Acts as both the routing table and access control — packets from a peer must have source IPs within its AllowedIPs.' },
      { term: 'Cryptographic key routing', definition: 'WireGuard matches incoming packets to peers by public key + source IP. No session state, no connection setup — stateless design makes it resilient to roaming.' },
      { term: 'ChaCha20-Poly1305', definition: 'The WireGuard AEAD cipher. Faster than AES-GCM on CPUs without AES-NI (ARM, older x86). Provides both encryption and authentication in one pass.' },
      { term: 'Silent drop', definition: 'WireGuard drops unauthenticated packets without responding. A port scan of a WireGuard endpoint returns nothing — the server appears offline to non-peers.' },
      { term: 'wg-quick', definition: 'Userspace configuration tool for WireGuard. Manages /etc/wireguard/*.conf files, brings up wg0 interfaces, and configures AllowedIPs routing.' },
    ],
    pitfalls: [
      'WireGuard has no built-in key distribution — each peer must have the other\'s public key pre-configured. For large meshes, use a control plane (Tailscale, Netbird, Headscale) instead of manual wg.conf management.',
      'AllowedIPs must not overlap between peers — WireGuard uses AllowedIPs as a routing table and drops packets if the source IP matches multiple peers. Design CIDR ranges carefully.',
      'WireGuard does not hide traffic patterns — payload is encrypted but packet timing, size, and source/destination IP are visible. For traffic analysis resistance, use Tor or obfuscation layers on top.',
    ],
    keyQuestions: [
      {
        question: 'How does WireGuard differ from IPSec and OpenVPN in design philosophy?',
        answer: `IPSec is a framework with hundreds of configurable parameters: IKE version (v1/v2), DH group, cipher (3DES, AES-128, AES-256), hash (MD5, SHA-1, SHA-256), mode (transport/tunnel), etc. Configuration requires matching every parameter on both sides. This flexibility creates attack surface (downgrade attacks, weak cipher negotiation) and operational complexity.

OpenVPN is an SSL/TLS-based VPN running in userspace. It uses standard TLS cipher negotiation (inheriting all TLS complexity), has a large codebase (~70,000 lines), and runs entirely in userspace (higher latency than kernel bypass).

WireGuard's philosophy: no negotiation, no options. One modern cipher suite (X25519, ChaCha20-Poly1305, BLAKE2s), fixed. The surface area for protocol-level attacks is minimal. The entire implementation is ~4,000 lines — small enough for meaningful security audits.

Performance: WireGuard runs in the Linux kernel (5.6+). Crypto operations happen in kernel space (or hardware offload). Benchmarks show WireGuard throughput 3-10x faster than OpenVPN on the same hardware. Latency is lower because there is no TLS session setup per connection.

Trade-off: WireGuard's simplicity means less flexibility. No built-in certificate infrastructure (IPSec IKEv2 supports X.509 certs). No dynamic routing protocol support (BGP over WireGuard requires manual setup). For enterprise compliance that mandates specific cipher suites or cert-based auth, IPSec may be required.`,
      },
    ],
    references: [
      'https://www.wireguard.com/papers/wireguard.pdf',
      'https://docs.cilium.io/en/latest/network/wireguard/',
    ],
    quickFire: [
      { q: 'What Linux kernel version includes WireGuard natively?', a: '5.6 (released March 2020). Earlier kernels require the wireguard-dkms out-of-tree module.' },
      { q: 'What cipher does WireGuard use for encryption?', a: 'ChaCha20-Poly1305 — AEAD cipher, faster than AES-GCM on CPUs without AES-NI hardware acceleration.' },
      { q: 'What is AllowedIPs in WireGuard?', a: 'Per-peer IP ranges for routing. WireGuard both routes traffic to the peer for those IPs and validates that incoming packets from the peer have source IPs within AllowedIPs.' },
      { q: 'How does WireGuard handle a port scan from a non-peer?', a: 'Silent drop -- WireGuard does not respond to unauthenticated packets. The server appears offline to scanners.' },
      { q: 'Does WireGuard negotiate cipher suites?', a: 'No -- the cipher suite (X25519, ChaCha20-Poly1305, BLAKE2s) is fixed. No negotiation means no downgrade attacks.' },
      { q: 'How does Cilium use WireGuard?', a: 'Cilium enables WireGuard with --enable-wireguard. All inter-node pod traffic is encrypted transparently without application changes. Each node has a WireGuard key pair.' },
      { q: 'What is the WireGuard codebase size vs OpenVPN?', a: 'WireGuard: ~4,000 lines. OpenVPN: ~70,000 lines. Smaller surface area for security audits.' },
      { q: 'What tool manages WireGuard interfaces in userspace?', a: 'wg-quick -- manages /etc/wireguard/*.conf files and brings up/down wg0 interfaces.' },
    ],
  },

  {
    id: 'network-chaos-engineering',
    title: 'Network Chaos Engineering',
    icon: 'tool',
    color: '#f97316',
    questions: 5,
    description: 'tc netem for latency/loss injection, Toxiproxy, chaos mesh network faults, testing circuit breakers and timeout behavior.',
    visualizations: [],
    introduction: `Network chaos engineering deliberately injects network failures — latency, packet loss, bandwidth limits, corruption, reordering — to verify that distributed systems behave correctly under adverse conditions.

**Linux tc netem (network emulator):**
tc qdisc add dev eth0 root netem delay 100ms 20ms distribution normal
tc qdisc add dev eth0 root netem loss 1% 25%  # correlated loss
tc qdisc add dev eth0 root netem corrupt 0.1%
tc qdisc add dev eth0 root netem duplicate 1% reorder 5% 50%

**Toxiproxy (Shopify):** a TCP proxy that injects network conditions at the application layer. Supports: latency, slow_close, timeout, bandwidth, slicer (chunked delivery), reset_peer. Configurable via HTTP API — ideal for integration tests. Run as a sidecar in CI/CD.

**Chaos Mesh (CNCF):** Kubernetes-native chaos engineering. NetworkChaos CRD supports: network partition, delay, loss, corrupt, bandwidth, duplicate. Applies faults using tc and iptables under the hood via a privileged DaemonSet. Faults can be targeted to specific pod label selectors and namespaces.

**What to test:**
- Timeout behavior: does the service return an error within its declared timeout? Does it release resources?
- Retry storms: under 50% packet loss, do retries amplify load on downstream services?
- Circuit breaker activation: does the circuit open under sustained failure rates?
- Graceful degradation: does the service fall back to cached data under 1000ms backend latency?
- Cascading failure prevention: does a single slow service degrade the entire request path?`,
    whenToUse: [
      'Verifying circuit breaker configuration before a production deployment',
      'Testing that timeouts are set correctly across all service dependencies',
      'Validating graceful degradation under database latency spikes',
      'CI/CD integration tests that include network fault scenarios',
    ],
    keyConcepts: [
      { term: 'tc netem', definition: 'Linux traffic control network emulator. Injects delay, loss, duplication, reordering, and corruption on a network interface. Requires root or CAP_NET_ADMIN. Applied via tc qdisc commands.' },
      { term: 'Toxiproxy', definition: 'Shopify\'s TCP proxy for chaos testing. Injects network conditions via HTTP API. Runs in CI/CD to test timeout and retry logic without kernel-level privileges.' },
      { term: 'Chaos Mesh NetworkChaos', definition: 'Kubernetes CRD for network fault injection. Targets specific pods by label selector. Implements faults via tc and iptables on node DaemonSets. Supports partition, delay, loss, corrupt, bandwidth.' },
      { term: 'Retry storm', definition: 'When a downstream service slows, upstream services retry — amplifying load on the already-slow service. Exponential backoff with jitter prevents synchronized retry waves.' },
      { term: 'Circuit breaker', definition: 'Pattern that stops sending requests to a failing service after a threshold of errors. Returns a fast error immediately instead of waiting for timeout. Prevents cascading failures. Implemented in Istio via DestinationRule outlier detection.' },
    ],
    pitfalls: [
      'Running chaos experiments in production without a rollback plan — always scope experiments to specific pods/namespaces, set a maximum duration, and have a kill switch (kubectl delete networkchaos). Never run open-ended experiments in production.',
      'Testing only happy-path retries — test what happens when retries are exhausted. Does the service return a meaningful error? Or does it hang waiting for a timeout that never fires?',
      'Ignoring inter-cluster network faults — most chaos testing focuses on pod-to-pod within a cluster. Cross-cluster, cross-region, and cloud-provider edge network paths have different failure modes.',
    ],
    keyQuestions: [
      {
        question: 'How do you use tc netem to simulate a flaky network for integration testing?',
        answer: `tc (traffic control) with the netem qdisc allows precise network condition simulation:

Add 100ms latency with 20ms normal distribution jitter:
tc qdisc add dev eth0 root netem delay 100ms 20ms distribution normal

Add 1% packet loss with 25% correlation (bursted loss, not random):
tc qdisc add dev eth0 root netem loss 1% 25%

Combine latency and loss:
tc qdisc replace dev eth0 root netem delay 200ms loss 5%

Remove all netem rules:
tc qdisc del dev eth0 root

For integration testing, apply netem to the container's veth interface from the host or within the container with CAP_NET_ADMIN. Alternatively, use Toxiproxy in CI/CD (no kernel privileges required):
toxiproxy-cli create --listen 127.0.0.1:5432 --upstream db:5432 mydb
toxiproxy-cli toxic add --type latency --attribute latency=200 mydb

Then point your application at localhost:5432. The Toxiproxy HTTP API allows dynamically adjusting faults without restarting the service — useful for testing circuit breaker activation and recovery.`,
      },
    ],
    references: [
      'https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/',
      'https://github.com/Shopify/toxiproxy',
      'https://www.man7.org/linux/man-pages/man8/tc-netem.8.html',
    ],
    quickFire: [
      { q: 'What Linux command adds 100ms latency to eth0?', a: 'tc qdisc add dev eth0 root netem delay 100ms' },
      { q: 'What is Toxiproxy used for?', a: 'TCP proxy for injecting network faults (latency, loss, timeout, bandwidth) in CI/CD integration tests via HTTP API, without kernel privileges.' },
      { q: 'What Kubernetes CRD injects network faults in Chaos Mesh?', a: 'NetworkChaos -- supports partition, delay, loss, corrupt, bandwidth targeting specific pods by label selector.' },
      { q: 'What is a retry storm?', a: 'When a slow service causes upstream clients to retry, amplifying load on the already-slow service. Prevented with exponential backoff and jitter.' },
      { q: 'How does a circuit breaker prevent cascading failures?', a: 'After a threshold of failures, the circuit opens and returns fast errors immediately instead of waiting for timeouts. Prevents the slow service from backing up all upstream callers.' },
      { q: 'What capability does tc netem require?', a: 'CAP_NET_ADMIN -- or running as root. Without it, tc qdisc commands fail with RTNETLINK answers: Operation not permitted.' },
      { q: 'How do you remove netem rules from an interface?', a: 'tc qdisc del dev eth0 root -- removes all queuing disciplines on the interface.' },
      { q: 'What is correlated packet loss in netem?', a: 'Loss with a correlation percentage (e.g., 1% 25%) means a lost packet increases the probability the next packet is also lost -- simulating burst loss patterns seen in real networks.' },
    ],
  },

  {
    id: 'cni-plugins-comparison',
    title: 'CNI Plugin Comparison',
    icon: 'cloud',
    color: '#f59e0b',
    questions: 6,
    description: 'Calico, Flannel, Cilium, Antrea CNI plugins — routing modes, NetworkPolicy support, performance, and selection criteria.',
    visualizations: [],
    introduction: `CNI (Container Network Interface) is the standard interface between a container runtime and a network plugin. When a pod is created, the kubelet calls the CNI binary to allocate an IP, configure routes, and set up network policy. When a pod is deleted, CNI cleans up.

**Major CNI plugins:**

**Flannel:** the simplest CNI. VXLAN overlay by default (can also use host-gw for pure L3 routing on the same subnet). No NetworkPolicy support — requires a separate policy engine (Calico policy-only mode). Best for: small clusters, learning environments, or when simplicity outweighs features.

**Calico:** L3 routing with BGP. In BGP mode, Calico advertises pod CIDRs via BGP directly on the physical network — no overlay overhead. In VXLAN mode, works like Flannel but with full NetworkPolicy. eBPF dataplane available (replaces iptables). Supports: GlobalNetworkPolicy, HostEndpoint policy, Egress gateway. Best for: bare-metal, on-premises, performance-sensitive workloads.

**Cilium:** eBPF-native. Replaces kube-proxy for Service load balancing. Hubble provides L3/L4/L7 observability. Supports: L7 NetworkPolicy (HTTP method/path, gRPC service/method, Kafka topic), transparent encryption (WireGuard/IPSec), multi-cluster (ClusterMesh), bandwidth management. Best for: large-scale clusters, zero-trust security, observability.

**Antrea:** based on Open vSwitch (OVS). Tight VMware/vSphere integration. Supports NetworkPolicy with Antrea-native policies (ANP). Flows exported via IPFIX. Best for: VMware environments, vSphere with Tanzu.

**Multus:** meta-CNI that chains multiple CNI plugins. Pods can have multiple network interfaces (eth0 from Cilium + net1 from SR-IOV for high-performance workloads). Required for telco/NFV deployments.`,
    whenToUse: [
      'Selecting a CNI plugin for a new Kubernetes cluster',
      'Explaining why Cilium outperforms Calico BGP at 100k+ Services',
      'Debugging network policy not being enforced (which CNI implements it?)',
      'Justifying Multus for telco or GPU-accelerated networking use cases',
    ],
    keyConcepts: [
      { term: 'BGP mode (Calico)', definition: 'Calico advertises pod CIDRs via BGP to the physical network. Pods are directly routable without overlay encapsulation. Requires physical network routers to support BGP — not available in most cloud managed networks.' },
      { term: 'VXLAN mode', definition: 'Overlay networking that encapsulates L2 frames in UDP (port 4789). Works on any IP network without BGP. All major CNIs support VXLAN mode. Adds 50-byte overhead per packet.' },
      { term: 'NetworkPolicy enforcement', definition: 'CNI plugins vary in policy support. Flannel has none (needs Calico policy-only). Calico and Cilium enforce NetworkPolicy natively. Cilium extends to L7 (HTTP/gRPC/Kafka). Antrea uses ANP for additional policy types.' },
      { term: 'Multus', definition: 'Meta-CNI that allows pods to have multiple network interfaces. Each interface is managed by a different CNI (e.g., eth0 by Cilium for cluster networking, net1 by SR-IOV for high-throughput data plane). Required for NFV and DPDK workloads.' },
      { term: 'eBPF dataplane', definition: 'Calico and Cilium both offer eBPF modes that replace iptables/kube-proxy with BPF programs. O(1) Service lookup vs O(n) iptables. Cilium uses eBPF natively; Calico eBPF is an opt-in mode.' },
    ],
    pitfalls: [
      'BGP mode requires physical network support — Calico BGP mode needs the top-of-rack switches to peer with the cluster nodes. Most cloud managed networks (EKS, GKE) block BGP. Use VXLAN mode in cloud unless you have bare-metal.',
      'NetworkPolicy is CNI-dependent — a Flannel-only cluster silently ignores NetworkPolicy objects (no enforcement). Add Calico in policy-only mode alongside Flannel, or switch to a CNI with built-in policy support.',
      'CNI migration is disruptive — changing CNI plugins on a running cluster requires draining and re-creating all pods (and sometimes nodes). Plan CNI selection before initial deployment. There is no in-place CNI migration path.',
    ],
    keyQuestions: [
      {
        question: 'How do you choose between Calico, Cilium, and Flannel for a Kubernetes cluster?',
        answer: `Decision framework:

Flannel: choose if you need the simplest possible CNI with minimal operational overhead and do not need NetworkPolicy. Learning environment, hobbyist cluster, or when another team manages networking. Not recommended for production without adding Calico policy-only mode.

Calico: choose for bare-metal or on-premises clusters where you control the physical network and can peer BGP. BGP mode eliminates overlay overhead. Full NetworkPolicy support including GlobalNetworkPolicy for host endpoints. Mature, widely deployed. Also available as a managed add-on on EKS (AWS VPC CNI + Calico for policy).

Cilium: choose when you need: (a) observability — Hubble L7 flow visibility without sidecars; (b) scale — 100k+ Services where iptables kube-proxy hits performance limits; (c) L7 policy — block specific HTTP paths or Kafka topics at the CNI layer; (d) multi-cluster networking via ClusterMesh; (e) transparent encryption (WireGuard). Best choice for greenfield large-scale or security-focused clusters.

Cloud-managed environments: EKS defaults to aws-vpc-cni (pods get VPC ENI IPs). GKE defaults to Calico or Cilium (via Dataplane V2). AKS defaults to Azure CNI or Azure CNI Overlay. Most cloud CNIs are replaced or supplemented with Cilium for advanced features.

Summary: Flannel for simplicity, Calico for bare-metal BGP, Cilium for scale/observability/security. Antrea for VMware vSphere.`,
      },
      {
        question: 'What is Multus CNI and when do you need it?',
        answer: `Multus is a meta-CNI plugin that enables Kubernetes pods to have multiple network interfaces simultaneously. Normally, a pod has one interface (eth0) managed by the cluster CNI. Multus reads a NetworkAttachmentDefinition CRD annotation on the pod and invokes additional CNI plugins to create additional interfaces (net1, net2, ...).

Use cases:
1. Telco / NFV (Network Function Virtualization): a virtual router or firewall pod needs a management interface (eth0, routed via Cilium) and data plane interfaces (net1, net2 backed by SR-IOV VFs for line-rate throughput).
2. DPDK workloads: high-performance packet processing applications need a dedicated NIC interface bypassing the kernel network stack.
3. Storage networks: pods that need a dedicated high-bandwidth NIC for Ceph or NVMe-oF storage separate from the cluster network.
4. Security isolation: a pod needs interfaces on two separate VLANs (management + data) and should not bridge them in software.

Configuration example:
annotations:
  k8s.v1.cni.cncf.io/networks: '[{"name":"sriov-net1","interface":"net1"}]'

The cluster CNI (e.g., Cilium) still manages eth0 for Kubernetes Service access. SR-IOV CNI manages net1 for direct hardware access.

Multus is required for OpenShift Telco/RAN deployments and is part of the CNCF reference architecture for cloud-native network functions.`,
      },
    ],
    references: [
      'https://www.cni.dev/docs/',
      'https://docs.cilium.io/en/latest/network/concepts/',
      'https://docs.tigera.io/calico/latest/networking/',
      'https://github.com/k8snetworkplumbingwg/multus-cni',
    ],
    quickFire: [
      { q: 'What does CNI stand for?', a: 'Container Network Interface — the standard interface between a container runtime and network plugins for pod IP allocation and routing.' },
      { q: 'Which CNI plugin has no built-in NetworkPolicy support?', a: 'Flannel — it requires a separate policy engine like Calico in policy-only mode.' },
      { q: 'What routing mode does Calico use for zero-overhead pod networking?', a: 'BGP mode — pod CIDRs are advertised via BGP to physical routers, eliminating VXLAN encapsulation overhead.' },
      { q: 'Which CNI plugin provides L7 NetworkPolicy (HTTP/gRPC/Kafka)?', a: 'Cilium — it enforces L7 policy via Envoy filters attached as eBPF TC hooks per pod interface.' },
      { q: 'What is Multus CNI used for?', a: 'Enabling pods to have multiple network interfaces from different CNI plugins — needed for telco/NFV workloads requiring separate management and data plane NICs.' },
      { q: 'What observability tool is built into Cilium?', a: 'Hubble — provides L3/L4/L7 flow visibility (DNS, HTTP, TCP drops) from eBPF ring buffers without sidecars.' },
      { q: 'Why is Calico BGP mode not available in most cloud environments?', a: 'Cloud managed networks block BGP from VM/node NICs. BGP mode requires physical network BGP peering, available only in bare-metal or on-premises deployments.' },
      { q: 'What happens to NetworkPolicy objects in a Flannel-only cluster?', a: 'They are silently ignored — Flannel does not implement NetworkPolicy enforcement. No error is shown; traffic is simply not restricted.' },
      { q: 'What is the main operational risk of changing CNI plugins?', a: 'CNI migration requires draining all pods (and often nodes). There is no in-place migration path. Plan CNI selection before initial cluster deployment.' },
      { q: 'What CNI is best for VMware vSphere Kubernetes clusters?', a: 'Antrea — built on Open vSwitch, with tight VMware/vSphere integration and native Antrea NetworkPolicy (ANP) support.' },
    ],
  },

  {
    id: 'ipsec-vpn',
    title: 'IPSec & VPN Deep Dive',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'IPSec transport vs tunnel mode, IKEv1 vs IKEv2, ESP vs AH, AWS Site-to-Site VPN, and debugging phase 1/2 failures.',
    visualizations: [],
    introduction: `IPSec (Internet Protocol Security) is a suite of protocols for authenticating and encrypting IP traffic. It operates at Layer 3, making it transport-agnostic — any TCP/UDP/ICMP traffic is protected transparently.

**IPSec modes:**
- **Transport mode:** encrypts only the IP payload (TCP/UDP segment). Original IP header is preserved. Used for host-to-host or host-to-gateway communication.
- **Tunnel mode:** encrypts the entire original IP packet and wraps it in a new IP header. Used for site-to-site VPNs — the original packet is hidden inside the tunnel. The new outer IP header routes between VPN gateways.

**IPSec protocols:**
- **ESP (Encapsulating Security Payload):** provides confidentiality (encryption), integrity, and optional authentication. The standard choice for VPNs.
- **AH (Authentication Header):** provides integrity and authentication but no encryption. Rarely used alone; incompatible with NAT (AH covers the outer IP header, which NAT modifies).

**IKE (Internet Key Exchange):** negotiates and manages IPSec SAs (Security Associations).
- **IKEv1:** two phases. Phase 1: establishes IKE SA (authenticated channel). Phase 2: negotiates IPSec SA (encryption parameters for data). Main mode (6 messages) or aggressive mode (3 messages, less secure).
- **IKEv2:** single exchange, faster, more reliable NAT traversal, built-in EAP support, dead peer detection. Preferred for all new deployments.

**AWS Site-to-Site VPN:** managed IPSec VPN. Creates two tunnels (active/standby) between a Virtual Private Gateway (VGW) or Transit Gateway and the customer gateway (on-premises device). Uses IKEv2 by default (IKEv1 available). Pre-shared keys or certificates. BGP optional for dynamic routing.`,
    whenToUse: [
      'Designing hybrid cloud connectivity between on-premises data center and AWS/GCP',
      'Debugging AWS Site-to-Site VPN phase 1 or phase 2 negotiation failures',
      'Explaining why AH is incompatible with NAT',
      'Choosing between IPSec, WireGuard, and OpenVPN for a new VPN deployment',
    ],
    keyConcepts: [
      { term: 'Security Association (SA)', definition: 'A one-way logical connection with defined encryption/authentication parameters. Full IPSec communication requires two SAs (one per direction). SAs are identified by SPI (Security Parameter Index).' },
      { term: 'IKE Phase 1', definition: 'Establishes an authenticated, encrypted IKE SA between peers. Negotiates: encryption algorithm, hash, DH group, and authentication method (PSK or certificates). Result: ISAKMP SA.' },
      { term: 'IKE Phase 2', definition: 'Uses the IKE SA to negotiate IPSec SAs for data. Negotiates: ESP algorithm, hash, PFS (perfect forward secrecy), and selectors (which traffic to encrypt). Result: IPSec SA pair.' },
      { term: 'NAT-T (NAT Traversal)', definition: 'Encapsulates ESP in UDP port 4500 to traverse NAT devices. Required when either endpoint is behind NAT, since NAT modifies IP headers that ESP protects.' },
      { term: 'PFS (Perfect Forward Secrecy)', definition: 'Each Phase 2 SA uses a new Diffie-Hellman key exchange. Compromising the long-term private key cannot decrypt past sessions. IKEv2 with PFS is the recommended configuration.' },
    ],
    pitfalls: [
      'Phase 1/Phase 2 parameter mismatch causes silent failures — both sides must agree on every parameter (DH group, cipher, hash, lifetime). A mismatch causes the SA to not establish. Check logs on both sides: on Linux, strongSwan journalctl; AWS, use VPN tunnel telemetry in CloudWatch.',
      'AH breaks with NAT — AH authenticates the entire IP header including source IP. When NAT rewrites the source IP, AH validation fails. Always use ESP (not AH) when NAT is in the path.',
      'One-tunnel failure in AWS Site-to-Site VPN — AWS provides two tunnels for redundancy. If the customer gateway only configures one tunnel and it goes down, the VPN is lost. Always configure both tunnels with BGP failover or static route priority.',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between IPSec transport mode and tunnel mode?',
        answer: `Transport mode protects only the payload of the original IP packet. The original IP header (source/destination IP) remains in the clear. The ESP header is inserted between the original IP header and the payload. Used for host-to-host encryption where both endpoints are the IPSec peers.

Tunnel mode wraps the entire original IP packet inside a new IP packet. The original packet (including its header) is encrypted and becomes the payload of the outer IP packet. The outer IP header routes between VPN gateways. Used for site-to-site VPNs.

Example — site-to-site VPN:
- Host A (10.0.1.5) in Site A sends a packet to Host B (192.168.1.10) in Site B.
- VPN Gateway A receives the packet. In tunnel mode, it encrypts the entire original packet and sends a new packet: src=VPN-GW-A-public-IP, dst=VPN-GW-B-public-IP, payload=encrypted(original packet).
- VPN Gateway B receives it, decrypts, and delivers the original packet to Host B.
- Host A and Host B are unaware of the VPN tunnel — it is transparent.

In transport mode, Host A would need to directly IPSec-encrypt its packet to Host B's IP — requiring Host B to also be an IPSec peer. This works for host-to-host (e.g., two servers in the same data center) but not for network-to-network VPNs.`,
      },
      {
        question: 'How do you debug a failing AWS Site-to-Site VPN tunnel?',
        answer: `AWS Site-to-Site VPN creates two IPSec tunnels. Each tunnel has a status: UP (IKE SA established, routing works) or DOWN (Phase 1 or Phase 2 negotiation failed, or no traffic).

Step 1 — Check tunnel status in AWS Console: VPC > Site-to-Site VPN > your VPN > Tunnel details. Note which tunnel is DOWN and the "Last status change" timestamp.

Step 2 — Check CloudWatch metrics: VPN TunnelState (0=down, 1=up), TunnelDataIn, TunnelDataOut. Zero data for a supposedly UP tunnel means routing is broken.

Step 3 — Check on-premises VPN device logs. Common errors:
- "no proposal chosen" → Phase 1 parameter mismatch. Compare your IKE settings with AWS VPN configuration file (downloadable from console). AWS supports: DH groups 2, 14-24; ciphers AES-128, AES-256; hashes SHA-1, SHA-256, SHA-384, SHA-512.
- "AUTHENTICATION_FAILED" → pre-shared key mismatch. Regenerate PSK in AWS and update both sides.
- Phase 2 fails after Phase 1 succeeds → IPSec proposal mismatch. Ensure PFS group matches (or disable PFS on both sides).
- NAT-T issues → if either endpoint is behind NAT, enable NAT-T (UDP 4500). AWS requires UDP 500 and 4500 to be open on the on-premises firewall.

Step 4 — For persistent issues, enable VPN logs in AWS (send to CloudWatch Logs). Provides IKE negotiation details.

Step 5 — Verify BGP: if using BGP routing, check that BGP session is UP after the tunnel comes up. Missing BGP routes = tunnel UP but no routes exchanged.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html',
      'https://www.rfc-editor.org/rfc/rfc7296',
      'https://docs.strongswan.org/docs/5.9/config/quickstart.html',
    ],
    quickFire: [
      { q: 'What is the difference between IPSec transport mode and tunnel mode?', a: 'Transport mode encrypts only the payload, leaving the original IP header visible. Tunnel mode encrypts the entire original packet and adds a new outer IP header — used for site-to-site VPNs.' },
      { q: 'What does ESP provide vs AH in IPSec?', a: 'ESP provides encryption + integrity + auth. AH provides integrity + auth but no encryption. AH breaks with NAT; ESP with NAT-T handles NAT.' },
      { q: 'What is an IPSec Security Association (SA)?', a: 'A one-way logical connection with agreed encryption/auth parameters, identified by SPI. Full bidirectional communication requires two SAs.' },
      { q: 'What is IKE Phase 1 responsible for?', a: 'Establishing an authenticated encrypted channel (ISAKMP SA) between peers, negotiating: cipher, hash, DH group, and auth method (PSK or certs).' },
      { q: 'What is IKE Phase 2 responsible for?', a: 'Negotiating IPSec SAs for protecting actual data traffic — cipher, hash, PFS, and traffic selectors (which flows to encrypt).' },
      { q: 'Why is IKEv2 preferred over IKEv1?', a: 'IKEv2 is simpler (fewer messages), has built-in NAT-T, supports EAP authentication, and has better dead peer detection. IKEv1 main mode uses 9+ messages; IKEv2 uses 4.' },
      { q: 'What is NAT-T in IPSec?', a: 'NAT Traversal — encapsulates ESP in UDP port 4500 to pass through NAT devices that would otherwise break ESP authentication.' },
      { q: 'How many tunnels does AWS Site-to-Site VPN provide?', a: 'Two tunnels for redundancy (active/standby). Only one is active unless using BGP ECMP. Always configure both tunnels.' },
      { q: 'What causes "no proposal chosen" in IPSec negotiation?', a: 'Parameter mismatch between peers — DH group, cipher, hash, or lifetime differ. Both sides must agree on every IKE and IPSec SA parameter.' },
      { q: 'What is PFS in IPSec?', a: 'Perfect Forward Secrecy — each Phase 2 negotiation uses a new DH key exchange. Past sessions cannot be decrypted even if the long-term key is compromised.' },
    ],
  },

  {
    id: 'dns-over-https-tls',
    title: 'DNS over HTTPS & TLS (DoH/DoT)',
    icon: 'search',
    color: '#22c55e',
    questions: 5,
    description: 'DoH vs DoT vs classic DNS, RFC 7858 and RFC 8484, privacy guarantees, enterprise interception challenges, and split-horizon compatibility.',
    visualizations: [],
    introduction: `Classic DNS (RFC 1035, 1987) transmits queries and responses in plaintext over UDP/TCP port 53. Anyone on the network path — ISP, Wi-Fi operator, government — can observe which domains are queried. DNS over TLS (DoT) and DNS over HTTPS (DoH) address this by encrypting DNS traffic.

**DNS over TLS (DoT — RFC 7858):**
- DNS queries sent over a persistent TLS connection on TCP port 853.
- The resolver authenticates with a certificate (PKIX or DANE).
- Traffic is distinguishable from other traffic (port 853 is DNS-specific). Network operators can identify and block or filter it.
- Supported by: Android 9+ (Private DNS), Linux systemd-resolved (systemd 239+), Unbound, Knot Resolver.

**DNS over HTTPS (DoH — RFC 8484):**
- DNS queries sent as HTTPS requests on TCP/443 (POST /dns-query or GET with dns= parameter).
- Traffic is indistinguishable from normal HTTPS traffic — cannot be blocked without blocking all HTTPS to the resolver's IP.
- Supported by: Firefox (uses Cloudflare DoH by default unless enterprise policy disables it), Chrome, iOS/macOS 14+, Edge.
- Resolver URL examples: https://cloudflare-dns.com/dns-query, https://dns.google/dns-query.

**DNSSEC vs DoH:** different problem spaces. DNSSEC validates that DNS responses have not been tampered with (data integrity, not confidentiality). DoH/DoT encrypts the query/response channel (confidentiality from the network path). Both can be used together.

**Enterprise challenges:** corporate DNS filtering (Pi-hole, corporate resolver for internal domains) relies on intercepting port-53 DNS. DoH bypasses this — browsers sending DoH to Cloudflare never hit the corporate resolver. Enterprises must: detect DoH traffic (block DoH resolvers at firewall), deploy enterprise DoH resolvers, or use browser policy (DoH managed policy via MDM).`,
    whenToUse: [
      'Explaining why Firefox defaults to DoH and how enterprises can override it',
      'Designing a privacy-preserving DNS architecture for users on public Wi-Fi',
      'Debugging split-horizon DNS failures when browsers use DoH instead of the corporate resolver',
      'Comparing DoH vs DoT for a mobile app DNS privacy requirement',
    ],
    keyConcepts: [
      { term: 'DoT (DNS over TLS)', definition: 'DNS queries transmitted over TLS on TCP port 853 (RFC 7858). Traffic is encrypted and authenticated but distinguishable from other traffic by port number.' },
      { term: 'DoH (DNS over HTTPS)', definition: 'DNS queries as HTTPS requests on TCP 443 (RFC 8484). Traffic is mixed with regular HTTPS, making it indistinguishable and resistant to blocking at the port level.' },
      { term: 'Oblivious DoH (ODoH)', definition: 'Extension to DoH that routes queries through a proxy, so the resolver sees the client\'s query but not its IP, and the proxy sees the client IP but not the query. Cloudflare + Apple deployed ODoH.' },
      { term: 'Enterprise DNS policy', definition: 'Browsers support DoH policy overrides via MDM/group policy. When a corporate DNS server is detected or policy is set, browsers disable DoH and use the configured resolver.' },
      { term: 'Canary domain', definition: 'use-application-dns.net — Firefox queries this domain at startup. If it returns NXDOMAIN or SERVFAIL, Firefox disables DoH (indicating the network uses filtering that DoH would bypass). Corporate resolvers can serve this canary to disable Firefox DoH.' },
    ],
    pitfalls: [
      'DoH breaks corporate split-horizon DNS — internal hostnames (app.corp.internal) are only resolvable by the corporate resolver. If browsers use DoH to Cloudflare instead, internal name resolution fails. Resolve by serving the DoH canary domain or deploying an enterprise DoH resolver.',
      'Pi-hole / network-level DNS filtering becomes ineffective with DoH — browsers bypass the Pi-hole resolver. Solutions: block DNS-over-HTTPS at the firewall by IP (block Cloudflare 1.1.1.1 and Google 8.8.8.8), or deploy a local DoH resolver that Pi-hole fronts.',
      'DoT on port 853 is easily blocked — network operators can block port 853. DoH on 443 is nearly impossible to block without also blocking all HTTPS. For maximum privacy resistance, DoH is more robust.',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between DNS over TLS and DNS over HTTPS, and which provides more privacy?',
        answer: `DNS over TLS (DoT) wraps classic DNS queries in TLS and sends them over TCP port 853. The TLS encryption prevents the query contents from being read on the network path. However, port 853 is clearly identifiable as DNS traffic — a network firewall or ISP can detect and block DoT connections without reading the encrypted content.

DNS over HTTPS (DoH) sends DNS queries as standard HTTPS POST or GET requests to an HTTPS endpoint on port 443. The queries are encrypted with TLS and appear identical to any other HTTPS traffic. A firewall cannot distinguish DoH to https://cloudflare-dns.com/dns-query from any other HTTPS request to Cloudflare unless it blocks the entire IP range.

Privacy comparison:
- Both protect query contents from passive network monitoring.
- DoH provides more resistance to blocking and identification — a censoring network cannot block DoH without blocking all HTTPS to the resolver's IPs.
- DoT is easier to monitor (port 853 is a clear signal) — useful for enterprises that want to allow encrypted DNS but log it.

Resolver privacy: both DoH and DoT still send queries to the resolver (Cloudflare, Google) — the resolver sees all queries. ODoH (Oblivious DoH, RFC 9230) adds a proxy layer so the resolver does not see the client IP.

For enterprises: DoH is harder to manage because it bypasses corporate DNS filtering. For users on public Wi-Fi: DoH provides stronger protection against ISP-level surveillance.`,
      },
      {
        question: 'How does DoH affect corporate DNS filtering and how do enterprises address it?',
        answer: `Corporate DNS filtering works by intercepting all DNS queries on port 53 and routing them through a corporate resolver (which may block malware domains, enforce acceptable use policy, and resolve internal hostnames). If a browser uses DoH directly to Cloudflare, it bypasses the corporate resolver entirely.

Problems caused by DoH in corporate environments:
1. Internal hostname resolution fails — app.corp.internal is not in Cloudflare's DNS. The browser gets NXDOMAIN.
2. DNS-based content filtering is bypassed — malware/phishing domains that are blocked by the corporate resolver are reachable via DoH.
3. DNS query visibility is lost — IT security teams use DNS logs for threat detection; DoH queries to external resolvers are invisible.

Enterprise mitigation options:
1. Canary domain: configure the corporate resolver to return NXDOMAIN for use-application-dns.net. Firefox disables DoH when it sees this response. Other browsers have similar mechanisms.
2. Browser policy: deploy MDM/group policy to disable DoH or configure the enterprise DoH resolver. Chrome: DnsOverHttps policy. Firefox: network.trr.mode = 5 (disabled).
3. Firewall blocking: block outbound connections to known DoH resolver IPs (1.1.1.1, 8.8.8.8 on port 443 for DoH endpoints). However, this also blocks regular HTTPS to those IPs.
4. Enterprise DoH resolver: deploy an internal DoH endpoint (using Unbound + stunnel or CoreDNS with DoH plugin) that resolves both internal and external names. Configure browsers to use this resolver via policy.

Best practice: deploy an enterprise DoH resolver + MDM policy directing browsers to it. This gives employees encrypted DNS (privacy from network sniffing) while maintaining corporate DNS control and split-horizon resolution.`,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc7858',
      'https://www.rfc-editor.org/rfc/rfc8484',
      'https://support.mozilla.org/en-US/kb/firefox-dns-over-https',
    ],
    quickFire: [
      { q: 'What port does DoT (DNS over TLS) use?', a: 'TCP port 853 (RFC 7858).' },
      { q: 'What port does DoH (DNS over HTTPS) use?', a: 'TCP port 443 — standard HTTPS, indistinguishable from regular web traffic.' },
      { q: 'What RFC defines DNS over HTTPS?', a: 'RFC 8484.' },
      { q: 'What RFC defines DNS over TLS?', a: 'RFC 7858.' },
      { q: 'Why is DoH harder to block than DoT?', a: 'DoT traffic is on port 853 (easily blocked). DoH is on port 443 mixed with HTTPS — blocking it requires blocking all HTTPS to the resolver IP.' },
      { q: 'What is the Firefox DoH canary domain?', a: 'use-application-dns.net — if this returns NXDOMAIN/SERVFAIL, Firefox disables DoH. Corporate resolvers can serve this to prevent DoH bypass.' },
      { q: 'Does DoH replace DNSSEC?', a: 'No — they solve different problems. DoH encrypts the DNS channel (confidentiality). DNSSEC validates DNS response integrity (tamper detection). Both can be used together.' },
      { q: 'What is Oblivious DoH (ODoH)?', a: 'Extension (RFC 9230) routing DoH queries through a proxy. The proxy sees the client IP but not the query; the resolver sees the query but not the client IP. Maximum privacy.' },
      { q: 'Why does DoH break split-horizon DNS in corporate environments?', a: 'Internal hostnames (app.corp.internal) only resolve via the corporate resolver. DoH sends queries to Cloudflare/Google, which return NXDOMAIN for internal names.' },
      { q: 'How can an enterprise prevent browsers from using public DoH resolvers?', a: 'Serve NXDOMAIN for use-application-dns.net (Firefox canary), deploy MDM browser policy disabling DoH or pointing to an internal DoH resolver, or block resolver IPs at the firewall.' },
    ],
  },

  // ─── TCP CONGESTION CONTROL ─────────────────────────────────────────────────
  {
    id: 'tcp-congestion-control',
    title: 'TCP Congestion Control',
    icon: 'activity',
    color: '#3b82f6',
    questions: 5,
    description: 'Slow start, congestion avoidance, CUBIC and BBR algorithms, congestion window vs receive window, and tuning TCP for high-bandwidth long-latency paths.',
    visualizations: [],
    introduction: `TCP congestion control prevents senders from overloading the network. Without it, a fast sender fills every buffer in the path, causing queue overflow and packet drops, which trigger retransmissions that worsen congestion (congestive collapse). TCP probes for available bandwidth while backing off when it detects congestion.

The sender maintains a congestion window (cwnd) limiting unacknowledged data in flight. Effective throughput = min(cwnd, rwnd) / RTT, where rwnd is the receiver's advertised window. Slow start doubles cwnd each RTT until reaching ssthresh or packet loss. Congestion avoidance grows cwnd linearly after that.

CUBIC (Linux default since 2.6.19) uses a cubic growth function for faster recovery on high-BDP paths. BBR (Bottleneck Bandwidth and Round-trip propagation time) takes a fundamentally different approach -- it measures the bottleneck bandwidth and minimum RTT to model the pipe, keeping exactly BDP worth of data in flight rather than reacting to packet loss. BBR dramatically improves throughput on lossy paths (satellite, 4G) where packet loss is not purely caused by congestion.`,
    whenToUse: [
      'Diagnosing why throughput between datacenters is well below the link bandwidth (BDP not fully utilized).',
      'Tuning Linux TCP parameters (tcp_rmem, tcp_wmem, tcp_congestion_control) for high-throughput transfers between AWS regions.',
      'Explaining why a 100ms RTT link is harder to saturate than a 1ms RTT link at the same bandwidth.',
    ],
    keyConcepts: [
      {
        term: 'Bandwidth-Delay Product (BDP)',
        definition: `BDP = bandwidth * round-trip-time. It represents the data that can be in transit on the path at any instant to fully utilize the link. For a 1Gbps link with 100ms RTT: BDP = 1e9 * 0.1 = 100 megabits = 12.5MB. TCP needs at least 12.5MB in flight to saturate this link. If the socket buffer (SO_RCVBUF) is smaller than BDP, throughput is capped. Linux auto-tunes up to tcp_rmem_max (default ~6MB, often too small for cross-continent transfers).`,
      },
      {
        term: 'BBR vs CUBIC',
        definition: `CUBIC reacts to packet loss: on loss, cut cwnd by 30% then grow using a cubic function. Better than Reno (50% cut, linear growth) on high-BDP paths. BBR does not use loss as a congestion signal. It continuously estimates bottleneck bandwidth (BtlBw) and minimum RTT (RTprop), then sets cwnd = BtlBw * RTprop. BBR periodically probes for more bandwidth by briefly increasing the send rate. On lossy paths (mobile, satellite), BBR maintains higher throughput because it does not interpret every lost packet as congestion.`,
      },
      {
        term: 'Buffer Bloat',
        definition: `When network equipment has very large buffers, packet loss may not occur even under heavy congestion -- instead, RTT inflates as packets queue in the buffer. Loss-based algorithms keep increasing cwnd while RTT rises to hundreds of milliseconds. BBR and AQM (Active Queue Management: CoDel, fq_codel) detect and react to this earlier because they monitor RTT, not just loss.`,
      },
    ],
    pitfalls: [
      'Not tuning socket buffers on high-BDP paths. Default Linux tcp_rmem_max is too small for cross-continent links. Set tcp_rmem and tcp_wmem max to at least the BDP. Test with iperf3 -P 8 to rule out per-stream cwnd limits.',
      'BBR fairness issues with CUBIC flows. A BBR flow on a shared bottleneck can starve concurrent CUBIC flows. BBR v1 has known fairness problems in buffer-bloated environments. In homogeneous environments (all BBR or all CUBIC), this is less of a concern.',
    ],
    keyQuestions: [
      {
        question: 'You have a 10Gbps link between AWS regions with 80ms RTT but iperf3 shows only 200Mbps. What are the likely causes?',
        answer: `## BDP calculation

10Gbps * 0.08s = 800 megabits = 100MB required in flight. With default tcp_rmem_max ~6MB, max throughput = 6MB / 0.08s = 75MB/s = 600Mbps. 200Mbps suggests even smaller buffers or a single slow stream.

## Fix 1: Socket buffers

\`\`\`bash
sysctl -w net.ipv4.tcp_rmem="4096 87380 134217728"  # max 128MB
sysctl -w net.ipv4.tcp_wmem="4096 87380 134217728"
\`\`\`

## Fix 2: Multiple parallel streams

\`\`\`bash
iperf3 -c <server> -P 8  # 8 parallel TCP streams
\`\`\`
If aggregate throughput jumps, cwnd per stream is the bottleneck.

## Fix 3: Switch to BBR

\`\`\`bash
sysctl -w net.ipv4.tcp_congestion_control=bbr
\`\`\`
Check retransmissions in iperf3 output -- even 0.01% loss at 10Gbps causes thousands of CUBIC cwnd reductions per second.`,
      },
    ],
    references: [
      'https://www.rfc-editor.org/rfc/rfc5681',
      'https://cloud.google.com/blog/products/networking/tcp-bbr-congestion-control-comes-to-gcp-your-internet-just-got-faster',
      'https://hpbn.co/building-blocks-of-tcp/',
    ],
    quickFire: [
      { q: 'What is the congestion window (cwnd)?', a: 'The sender-side limit on unacknowledged in-flight data. Effective throughput = min(cwnd, rwnd) / RTT.' },
      { q: 'What is Bandwidth-Delay Product (BDP)?', a: 'BDP = bandwidth * RTT. The data that must be in flight to fully saturate a link. Socket buffers must be at least BDP-sized.' },
      { q: 'How does slow start work?', a: 'cwnd doubles every RTT from initcwnd (10 MSS) until exceeding ssthresh or packet loss, then switches to linear congestion avoidance.' },
      { q: 'What congestion signal does BBR use instead of packet loss?', a: 'Measured bottleneck bandwidth (BtlBw) and minimum RTT (RTprop) to model the pipe, filling it exactly without relying on loss.' },
      { q: 'What Linux sysctl controls the congestion control algorithm?', a: 'net.ipv4.tcp_congestion_control. Set to "bbr" or "cubic".' },
      { q: 'What is buffer bloat?', a: 'Large router buffers absorb bursts without dropping packets but cause RTT inflation to hundreds of ms. Loss-based congestion control fails to detect this.' },
    ],
  },

  // ─── ENVOY PROXY ────────────────────────────────────────────────────────────
  {
    id: 'envoy-proxy',
    title: 'Envoy Proxy & xDS API',
    icon: 'gitBranch',
    color: '#06b6d4',
    questions: 5,
    description: 'Envoy listener-filter-cluster pipeline, the xDS dynamic configuration protocol, circuit breaking, outlier detection, and Envoy as the Istio data plane.',
    visualizations: [],
    introduction: `Envoy is an open-source edge and service proxy written in C++. Originally developed at Lyft and donated to the CNCF, Envoy is the data plane for most production service meshes (Istio, AWS App Mesh, Consul Connect) and is used standalone in projects like Contour and Emissary-ingress.

Traffic flows through a layered pipeline: Listeners bind to ports and define filter chains. Network Filters process the raw byte stream. The HTTP Connection Manager (HCM) is the most important network filter, parsing HTTP. HTTP Filters process individual requests. Clusters define upstream endpoints. Envoy selects an endpoint using the configured load balancing policy (round-robin, least request, ring hash).

The xDS API (discovery services) is Envoy's dynamic configuration protocol. Control planes (Istio's Istiod, Consul) push configuration updates via gRPC streams without restarts. LDS pushes listener configs, CDS pushes cluster definitions, EDS pushes endpoint lists, RDS pushes route tables. An Envoy receiving xDS updates can shift traffic from v1 to v2 within seconds -- zero-downtime canary deployments without pod restarts or DNS changes.`,
    whenToUse: [
      'Debugging Istio traffic management by reading Envoy admin interface (port 15000) config dump and access logs.',
      'Configuring circuit breaking and outlier detection for upstream services in a service mesh.',
      'Implementing traffic shifting for canary deployments via Istio VirtualService and DestinationRule.',
      'Understanding why Envoy xDS enables incremental config updates while static Nginx config requires reload.',
    ],
    keyConcepts: [
      {
        term: 'xDS Protocol',
        definition: `xDS is a collection of gRPC streaming APIs between a control plane and Envoy. LDS (Listener DS) pushes listener configurations. CDS (Cluster DS) pushes upstream cluster definitions. EDS (Endpoint DS) pushes IP:port lists per cluster. RDS (Route DS) pushes HTTP route tables. Changes stream immediately to all connected Envoys without restart, enabling live traffic shifting (canary: route 20% to v2) by updating route weights in real time.`,
      },
      {
        term: 'Circuit Breaking',
        definition: `Envoy implements circuit breaking per cluster with thresholds: max_connections, max_pending_requests, max_requests, max_retries. When a threshold is exceeded, Envoy returns 503 immediately to new requests instead of queuing. This prevents cascading failures where a slow upstream causes the caller to accumulate threads waiting for connections. Monitor cx_overflow and rq_overflow metrics to detect when the circuit breaker is triggering.`,
      },
      {
        term: 'Outlier Detection',
        definition: `Outlier detection automatically ejects unhealthy upstream endpoints from the load balancing pool using real traffic signals. Envoy tracks consecutive 5xx errors and success rate per endpoint. When an endpoint exceeds thresholds, it is ejected for base_ejection_time and periodically retested. Unlike health checks (synthetic probes), outlier detection uses production traffic. Combined with circuit breaking: outlier detection removes bad pods, circuit breaking protects against overloading the remaining ones.`,
      },
    ],
    pitfalls: [
      'Envoy retries amplifying load on struggling upstreams. A retry policy with 3 attempts multiplies traffic to a slow service by 3x, turning minor slowdowns into full overloads. Configure retry budgets (max concurrent retries) and retry-on conditions carefully.',
      'Not monitoring circuit breaker overflow. cx_overflow / rq_overflow spikes mean clients are receiving immediate 503s from Envoy -- often mistaken for upstream failures. The circuit breaker is working; the upstream capacity needs to increase.',
    ],
    keyQuestions: [
      {
        question: 'How does Istio use Envoy xDS to implement canary traffic shifting without pod restarts?',
        answer: `## Components

Istiod implements an xDS server. Each Envoy sidecar connects to Istiod on startup via gRPC and receives full config via LDS, CDS, RDS, EDS streams. Istiod watches Kubernetes VirtualService and DestinationRule objects and translates them into xDS resources.

## Canary flow

Step 1: Create DestinationRule defining two subsets -- v1 (label: version=v1) and v2 (label: version=v2). Istiod creates two CDS clusters: reviews-v1 and reviews-v2 with EDS endpoints from matching pods.

Step 2: Create VirtualService with weighted routing: 80% to reviews-v1, 20% to reviews-v2. Istiod generates an RDS RouteConfiguration with two weighted routes to the two clusters.

Step 3: Istiod pushes the updated xDS RouteConfiguration to all sidecars via the RDS stream. Per-entry atomic updates -- not full config reload.

Result: Within 100ms-2s, all sidecars route 20% of reviews traffic to v2 pods. No pod restarts, no DNS changes. Gradually update weight (20% -> 50% -> 100%) as confidence grows. Tools like Flagger or Argo Rollouts can drive weight changes automatically based on Prometheus error rate/latency metrics.`,
      },
    ],
    references: [
      'https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy',
      'https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol',
      'https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/',
    ],
    quickFire: [
      { q: 'What company developed Envoy?', a: 'Lyft. Donated to CNCF in 2017.' },
      { q: 'What does EDS stand for in xDS?', a: 'Endpoint Discovery Service -- dynamically updates the IP:port list for each upstream cluster.' },
      { q: 'What port does Envoy admin interface use in Istio sidecars?', a: 'Port 15000. Access: kubectl exec <pod> -c istio-proxy -- curl localhost:15000/config_dump' },
      { q: 'What is a Cluster in Envoy?', a: 'A named group of upstream endpoints that Envoy load balances across.' },
      { q: 'What does Envoy outlier detection do?', a: 'Automatically ejects endpoints exceeding consecutive failure thresholds from the load balancing pool using real traffic signals.' },
      { q: 'What happens when Envoy max_pending_requests is exceeded?', a: 'Envoy returns 503 immediately to new requests instead of queuing them, preventing cascading failures.' },
    ],
  },

  // ─── NETWORK RATE LIMITING ──────────────────────────────────────────────────
  {
    id: 'network-rate-limiting',
    title: 'Rate Limiting Algorithms',
    icon: 'sliders',
    color: '#06b6d4',
    questions: 5,
    description: 'Token bucket, leaky bucket, sliding window counter, fixed window -- tradeoffs, boundary bursts, and Redis-based distributed rate limiting patterns.',
    visualizations: [],
    introduction: `Rate limiting controls how frequently a client can perform an action within a time window. It protects API servers from abuse, ensures fair resource sharing among tenants, and prevents single clients from exhausting server capacity.

Four fundamental algorithms: Fixed window counter divides time into discrete buckets and counts requests -- simple but allows boundary bursts. Sliding window log tracks every request timestamp -- accurate but memory-intensive. Sliding window counter approximates the sliding window by interpolating between two adjacent fixed window counts -- efficient and nearly accurate. Token bucket maintains a bucket that refills at a fixed rate; each request consumes a token, allowing bursts up to the bucket size. Leaky bucket queues requests and drains at a fixed rate regardless of burst -- smoothing traffic for rate-sensitive downstreams.

In distributed systems, rate limiting must be distributed. Local-only state on each API gateway instance enforces N times the limit when traffic is load-balanced across N instances. Redis atomic operations (INCR+EXPIRE for fixed window, Lua scripts for token bucket) provide shared state with sub-millisecond lookup latency.`,
    whenToUse: [
      'Protecting an API endpoint from being hammered by misbehaving clients or bots.',
      'Implementing usage-based billing tiers (100 req/min free, 10,000 req/min paid).',
      'Designing a rate limiter in a system design interview -- classic question.',
      'Configuring Envoy local rate limiting or global rate limit service in Kubernetes.',
    ],
    keyConcepts: [
      {
        term: 'Token Bucket',
        definition: `A bucket with capacity N tokens refills at a fixed rate (e.g., 100 tokens/sec). Each request consumes a token. If empty, reject. The bucket accumulates up to N tokens during idle periods, allowing short bursts. Token bucket is the most common algorithm because it accommodates legitimate bursty traffic while enforcing a long-term average rate. AWS API Gateway uses token bucket (burst capacity + steady-state RPS limits).`,
      },
      {
        term: 'Sliding Window Counter',
        definition: `Approximates a sliding window using two fixed window counters. Estimate for the last 60 seconds: prev_count * (1 - elapsed_fraction) + current_count. Small error (< 1% at low rates) but uses only two Redis keys instead of a full timestamp log. Used by Cloudflare for distributed rate limiting because it is memory-efficient and maps to two INCR+EXPIRE operations.`,
      },
      {
        term: 'Redis Lua for Atomic Rate Limiting',
        definition: `Redis Lua scripts execute atomically (Redis is single-threaded). A token bucket in Redis stores (token_count, last_refill_timestamp) in a hash. The Lua script computes tokens to add since last refill, caps at bucket size, decrements if > 0, and stores the updated state. Without atomicity, two concurrent requests both reading count=99 could both be allowed, exceeding the limit. Lua eliminates this race condition.`,
      },
    ],
    pitfalls: [
      'Fixed window boundary burst. A client sends N requests just before midnight and N more just after -- getting 2N in a 2-second window. Use sliding window counter or token bucket if boundary bursts are harmful.',
      'Not returning Retry-After in 429 responses. Without it, clients retry immediately, generating more rejected requests. Always return Retry-After: <seconds> and X-RateLimit-Remaining headers.',
      'Redis unavailability. Design for Redis being down: fail open (allow requests with imprecise local limiting) to avoid a full outage. Log the failure and alert.',
    ],
    keyQuestions: [
      {
        question: 'Design a distributed rate limiter allowing 100 requests per minute per user across 10 API gateway instances.',
        answer: `## Algorithm: Sliding window counter

Two Redis keys per user: ratelimit:{user}:{current_minute} and ratelimit:{user}:{prev_minute}.

## Lua script (atomic)

\`\`\`lua
local current_window = tonumber(ARGV[1])   -- Unix time / 60
local elapsed = tonumber(ARGV[2])          -- seconds into current minute (0-59)
local limit = tonumber(ARGV[3])

local curr = tonumber(redis.call("GET", "rl:" .. KEYS[1] .. ":" .. current_window) or 0)
local prev = tonumber(redis.call("GET", "rl:" .. KEYS[1] .. ":" .. (current_window-1)) or 0)

local estimated = prev * ((60 - elapsed) / 60) + curr
if estimated >= limit then return {0, math.ceil(estimated)} end

redis.call("INCR", "rl:" .. KEYS[1] .. ":" .. current_window)
redis.call("EXPIRE", "rl:" .. KEYS[1] .. ":" .. current_window, 120)
return {1, math.ceil(estimated + 1)}
\`\`\`

## Response headers

- 429: Retry-After: {60 - elapsed}
- 200: X-RateLimit-Remaining: {limit - estimated}

## Failure mode

If Redis is unavailable: fall back to local in-memory token bucket (imprecise but functional). Log and alert on Redis failure.`,
      },
    ],
    references: [
      'https://stripe.com/blog/rate-limiters',
      'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/',
      'https://redis.io/docs/manual/patterns/rate-limiting/',
    ],
    quickFire: [
      { q: 'What is the token bucket algorithm?', a: 'A bucket filled with tokens at a fixed rate (up to max N). Each request consumes a token; requests are rejected when empty. Allows bursts up to N.' },
      { q: 'What is the main flaw of fixed window rate limiting?', a: 'Boundary burst: clients can send N requests at window end and N at window start, getting 2N processed in a short burst.' },
      { q: 'What HTTP status code does a rate limiter return?', a: '429 Too Many Requests, with Retry-After header.' },
      { q: 'Why use Redis Lua scripts for distributed rate limiting?', a: 'Lua scripts execute atomically in Redis, preventing race conditions where concurrent requests both read the same count and both get allowed.' },
      { q: 'Difference between token bucket and leaky bucket?', a: 'Token bucket allows bursts (sends accumulated tokens at once). Leaky bucket smooths to a fixed output rate regardless of input bursts.' },
      { q: 'What should a rate limiter do when Redis is unavailable?', a: 'Fail open with local imprecise limiting to avoid a full outage. Log the failure.' },
    ],
  },
];