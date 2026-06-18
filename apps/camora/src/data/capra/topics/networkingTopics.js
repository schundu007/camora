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
  // Firewalls
  'iptables-nftables':          'firewalls',
  'aws-security-groups':        'firewalls',
  'aws-nacls':                  'firewalls',
  'zero-trust-networking':      'firewalls',
  'waf-ddos-protection':        'firewalls',
  'network-policies-k8s':       'firewalls',
  // Protocols
  'bgp-routing':                'protocols',
  'ospf-eigrp':                 'protocols',
  'vlan-vxlan':                 'protocols',
  'sd-wan':                     'protocols',
  'mpls':                       'protocols',
  'grpc-vs-rest':               'protocols',
  // Cloud Networking
  'aws-vpc-design':             'cloud-networking',
  'vpc-peering':                'cloud-networking',
  'transit-gateway':            'cloud-networking',
  'aws-privatelink':            'cloud-networking',
  'direct-connect-vpn':        'cloud-networking',
  'hybrid-connectivity':        'cloud-networking',
  'service-mesh':               'cloud-networking',
  // Troubleshooting
  'network-debugging-tools':    'troubleshooting',
  'packet-capture-analysis':    'troubleshooting',
  'latency-diagnosis':          'troubleshooting',
  'connectivity-failures':      'troubleshooting',
  'mtu-fragmentation':          'troubleshooting',
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
        answer: `Use CloudFront behaviors (ordered routing rules) to route different URL patterns to different origins with different cache policies.

Architecture:
Domain: cdn.example.com → CloudFront distribution

Behavior 1 (most specific): /api/*
  Origin: ALB at api.example.com
  Cache policy: CachingDisabled (all requests forwarded to origin)
  Origin request policy: include all headers (preserve Authorization, Content-Type)
  TTL: 0 (no caching)

Behavior 2: /static/*
  Origin: S3 bucket s3://static.example.com
  Cache policy: long TTL (max-age=31536000, 1 year)
  Cache key: URL only (no headers, no cookies)

Behavior 3 (default /*):
  Origin: ALB at web.example.com (SSR HTML)
  Cache policy: short TTL (max-age=60s) or CachingDisabled
  Cache key: URL + Accept-Language header (for language variants)

Origin shield: enable on the S3 origin to consolidate misses for popular assets.

Versioned assets: deploy static JS/CSS with content-hash filenames (main.abc123.js). Long TTL is safe because the URL changes when content changes. No manual invalidation needed.

For emergency cache invalidation:
aws cloudfront create-invalidation --distribution-id E123 --paths "/index.html" "/api/*"

This design: static assets are cached at edges indefinitely (low cost, low latency), API is always fresh (bypass cache), HTML pages have a short TTL with fast invalidation capability.`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html',
      'https://developer.fastly.com/learning/concepts/cache-invalidation/',
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
    introduction: `A VPC (Virtual Private Cloud) is an isolated virtual network in AWS. Every VPC has a CIDR block (e.g., 10.0.0.0/16) that defines its address space. Subnets are subdivisions of the VPC CIDR, each associated with one Availability Zone.

Subnet types and their route tables: public subnets have a route to an Internet Gateway (IGW), enabling direct internet connectivity for resources with Elastic IPs. Private subnets have no IGW route; outbound internet access goes through a NAT Gateway deployed in a public subnet. Isolated subnets have no internet route at all — used for databases and backend services.

CIDR planning is critical and hard to undo. AWS reserves 5 IPs per subnet (network address, VPC router, DNS, future use, broadcast). A /24 subnet has 251 usable IPs. A /28 has 11. Common mistake: subnets that are too small for the number of ECS tasks or Lambda VPC functions that will consume IPs. Plan for 2-3x your expected peak. Avoid CIDR conflicts with on-premises networks if you plan VPN or Direct Connect.

Multi-tier architecture: public subnet (ALB, bastion host), private-app subnet (ECS tasks, EC2 application servers), private-data subnet (RDS, ElastiCache). Security groups control traffic between tiers: ALB security group allows 0.0.0.0/0 on 443; app security group allows traffic only from ALB security group; data security group allows traffic only from app security group.

One NAT Gateway per AZ: a NAT Gateway is single-AZ. If you use one NAT Gateway for all private subnets and that AZ fails, all private subnets lose internet connectivity. Best practice: deploy a NAT Gateway in each AZ and configure each AZ's private subnet route table to use its local NAT Gateway.`,
    whenToUse: [
      'Designing a multi-tier VPC for a new AWS workload from scratch',
      'Explaining why private subnets still need a NAT Gateway for outbound internet',
      'Calculating the right subnet CIDR size for a Kubernetes cluster node pool',
      'Avoiding cross-AZ NAT Gateway traffic costs by deploying per-AZ NAT',
    ],
    keyConcepts: [
      { term: 'Internet Gateway (IGW)', definition: 'Horizontally scaled, redundant gateway attached to a VPC. Resources in public subnets use it for inbound and outbound internet traffic (requires Elastic IP or public IP).' },
      { term: 'NAT Gateway', definition: 'Managed NAT device in a public subnet. Allows private subnet resources to initiate outbound internet connections without exposing inbound ports. Single-AZ — deploy one per AZ.' },
      { term: 'Route table', definition: 'Per-subnet routing rules. Main route table applies to all unassociated subnets. Custom route tables for public (with IGW route) and private (with NAT route) subnets.' },
      { term: 'VPC Endpoint', definition: 'Private connection between VPC and AWS services (S3, DynamoDB, SSM) without internet. Gateway endpoints (S3, DynamoDB) are free. Interface endpoints use PrivateLink (cost per hour + data).' },
      { term: 'Security group vs NACL', definition: 'Security groups: stateful, instance-level, allow rules only, evaluated as a set. NACLs: stateless, subnet-level, allow and deny rules, evaluated in order by rule number.' },
    ],
    pitfalls: [
      'Choosing a VPC CIDR that overlaps with on-premises networks — VPC peering and VPN/Direct Connect require non-overlapping CIDRs. Use RFC 1918 ranges not used by corporate networks.',
      'Undersizing subnets — you cannot resize a subnet after creation. Small subnets exhaust available IPs as ECS tasks, pods, and ENIs consume IPs rapidly. Use /22 or larger for application subnets.',
      'Using a single NAT Gateway for all AZs — a NAT Gateway is in one AZ. If that AZ fails, all private subnets in other AZs lose internet access. Deploy one NAT Gateway per AZ.',
    ],
    keyQuestions: [
      {
        question: 'Design the VPC architecture for a three-tier web application that must be highly available across two AZs.',
        answer: `VPC CIDR: 10.0.0.0/16 (65,536 addresses)

AZ-a subnets:
  Public:       10.0.0.0/24   (251 IPs — ALB, NAT Gateway)
  Private-app:  10.0.2.0/23   (507 IPs — ECS tasks, EC2)
  Private-data: 10.0.4.0/24   (251 IPs — RDS primary, ElastiCache)

AZ-b subnets:
  Public:       10.0.1.0/24
  Private-app:  10.0.6.0/23
  Private-data: 10.0.8.0/24

Internet Gateway: attached to VPC (shared).

NAT Gateway AZ-a: deployed in 10.0.0.0/24 (public-a), has Elastic IP.
NAT Gateway AZ-b: deployed in 10.0.1.0/24 (public-b), has Elastic IP.

Route tables:
  public-rt: 0.0.0.0/0 → IGW (associated with both public subnets)
  private-app-a-rt: 0.0.0.0/0 → NAT-Gateway-AZ-a
  private-app-b-rt: 0.0.0.0/0 → NAT-Gateway-AZ-b
  private-data-rt: no internet route (fully isolated)

Security groups:
  alb-sg: inbound 443 from 0.0.0.0/0; outbound 8080 to app-sg
  app-sg: inbound 8080 from alb-sg; outbound 5432 to data-sg, 443 to internet (for AWS API calls)
  data-sg: inbound 5432 from app-sg only

This gives AZ-level isolation: if AZ-a fails, AZ-b continues fully independently. Each AZ has its own NAT Gateway, so a NAT failure is contained to one AZ.

Cost note: two NAT Gateways cost ~$65/month base plus data transfer. For dev environments, use a single NAT Gateway to save cost and accept the reduced redundancy.`,
      },
      {
        question: 'What is the difference between VPC peering, Transit Gateway, and PrivateLink? When do you use each?',
        answer: `VPC Peering: a direct private link between two specific VPCs (in the same or different accounts/regions). Traffic routes through AWS backbone. Non-transitive: if A peers with B, and B peers with C, A cannot reach C through B. Requires non-overlapping CIDRs. Free for traffic within the same AZ; cross-AZ and cross-region transfer costs apply. Best for: small number of VPC pairs, simple mesh topologies, or when you need to control routing precisely.

Transit Gateway: a hub-and-spoke routing service. Attach multiple VPCs (and VPNs, Direct Connect) to a Transit Gateway. Each VPC only needs one attachment to the TGW; the TGW routes between all attached networks. Supports thousands of VPCs. Supports route domains (isolating groups of VPCs). Cross-region connectivity via inter-region peering. Cost: per-hour attachment cost plus data processing fee. Best for: large multi-VPC architectures, hub-and-spoke with on-premises connectivity, complex routing policies.

PrivateLink: exposes a service (behind an NLB) to other VPCs via interface endpoints (private IPs in the consumer VPC). The service never enters the consumer VPC; only the endpoint IP does. Works across accounts, regions (with interface endpoints), and does not require peering or non-overlapping CIDRs. Used for: SaaS integrations, sharing a service across accounts/VPCs without full peering, AWS service access (SSM, Secrets Manager via interface endpoints). Traffic to AWS services via PrivateLink stays on the AWS backbone and does not go through the internet.

Summary:
VPC Peering — few VPCs, simple full-mesh
Transit Gateway — many VPCs, hub-and-spoke, mixed on-premises
PrivateLink — expose a specific service, not a full network, to other VPCs/accounts`,
      },
    ],
    references: [
      'https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html',
      'https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html',
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
    introduction: `A service mesh is an infrastructure layer that handles service-to-service communication in a microservices architecture. It typically uses a sidecar proxy pattern: a proxy (Envoy) is injected into every pod as a sidecar container. All inbound and outbound network traffic from the application container flows through the sidecar proxy.

The control plane (Istiod in Istio) distributes configuration to all sidecars: which services exist, their endpoints, traffic policies (retries, timeouts, circuit breakers), and certificate authority (for mTLS). The data plane (the sidecars) enforces these policies on every request.

Key capabilities: mTLS (each sidecar gets a short-lived certificate from the mesh CA; all service-to-service traffic is automatically encrypted and mutually authenticated), traffic management (weighted routing for canary, A/B testing; retries; timeouts; circuit breaking; fault injection for chaos), observability (L7 metrics for every service pair: request rate, error rate, p99 latency; distributed traces via OpenTelemetry; access logs).

Istio vs Linkerd: Istio uses Envoy sidecar (powerful, complex, high resource usage); Linkerd uses a Rust-based micro-proxy (lighter, simpler, less feature-rich). Cilium Service Mesh uses eBPF instead of sidecar proxies — kernel-level enforcement with near-zero overhead, no proxy containers.

Sidecar overhead is real: each Envoy sidecar uses ~50-100 MB of RAM and adds ~0.5-2ms to request latency per hop. For high-throughput, latency-sensitive services, this matters. The eBPF-based approach (Cilium) eliminates this at the cost of feature richness.`,
    whenToUse: [
      'Implementing zero-trust networking for microservices without modifying application code',
      'Getting L7 observability (request rate, error rate, latency) across all services automatically',
      'Implementing progressive delivery (canary, A/B) at the traffic level without application changes',
      'Replacing custom retry/timeout code in services with mesh-level policies',
    ],
    keyConcepts: [
      { term: 'Sidecar proxy', definition: 'A proxy container (Envoy) injected into every pod by a mutating webhook. All pod network traffic flows through the proxy via iptables REDIRECT rules. Application code is unchanged.' },
      { term: 'mTLS in mesh', definition: 'Each sidecar gets a certificate from the mesh CA (SPIFFE/SPIRE standard). Sidecars authenticate each other and encrypt traffic. No application code changes needed.' },
      { term: 'VirtualService (Istio)', definition: 'Defines routing rules: weight-based (canary), header-based (A/B), fault injection (delay/abort), retries, and timeouts. Applied on top of existing Kubernetes Services.' },
      { term: 'DestinationRule (Istio)', definition: 'Configures what happens after routing: load balancing algorithm, circuit breaker settings, outlier detection, and TLS settings to the destination.' },
      { term: 'eBPF service mesh (Cilium)', definition: 'Uses eBPF kernel programs instead of sidecar proxies. Near-zero overhead, no sidecar containers. Enforces policies in the kernel networking stack.' },
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

1. Certificate issuance: when a pod starts, Istio's mutating webhook injects an Envoy sidecar. The sidecar's init container rewrites iptables rules to intercept all inbound/outbound traffic. The sidecar authenticates to Istiod using the pod's Kubernetes service account JWT and receives a short-lived X.509 certificate issued by Istio's built-in CA (or an external CA). The certificate's SPIFFE URI encodes the service identity: spiffe://cluster.local/ns/default/sa/my-service.

2. Outbound mTLS: when service A calls service B, the app container connects to 127.0.0.1:servicePort. iptables redirects this to the sidecar's outbound port (15001). The sidecar looks up the destination service in its configuration, sees that mTLS is required, establishes a TLS connection to service B's sidecar using its certificate, presenting the SPIFFE identity.

3. Inbound mTLS: service B's sidecar receives the connection on port 15006. It validates the client certificate against the Istio CA certificate. If valid, it forwards the decrypted request to the application on localhost:appPort.

4. Policy enforcement: the sidecar can enforce AuthorizationPolicy rules: "only allow requests from service A's SPIFFE identity to endpoint /api/v1/.*". These are applied at the sidecar level, not in the application.

The application code never sees TLS — it sends and receives plaintext on localhost. The mesh handles encryption, authentication, and authorization transparently.`,
      },
    ],
    references: [
      'https://istio.io/latest/docs/concepts/security/',
      'https://linkerd.io/2.12/features/automatic-mtls/',
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
    introduction: `Effective network debugging follows a structured layered approach: start at the lowest layer that could explain the symptom and work upward. An experienced engineer does not randomly run tools — they form a hypothesis about which layer is failing and choose the tool that confirms or refutes that hypothesis.

The debugging ladder:
Layer 1-2 (Physical/Link): ip -s link show — check error counters, drops, collisions. ethtool eth0 — link speed, duplex, PHY errors.
Layer 3 (IP): ping (ICMP reachability), ip route get (routing decision), traceroute/mtr (path and per-hop latency).
Layer 4 (TCP): nc -zv host port (can we connect?), ss -tulpn (what is listening?), tcpdump (what is on the wire?).
Layer 7 (Application): curl -v (HTTP), openssl s_client (TLS), dig (DNS).

mtr (Matt's Traceroute) combines traceroute and ping: it continuously sends probes and shows per-hop latency and packet loss in real time. Invaluable for diagnosing intermittent packet loss on a specific hop.

ss (socket statistics) is the production standard for listing open connections. ss -s (summary), ss -t state established (all established TCP), ss -tulpn (listening ports with process names), ss -t state time-wait (TIME_WAIT counts).

Cloud-specific: VPC Flow Logs (AWS) record accept/reject decisions at the ENI level — invaluable for diagnosing security group/NACL issues. Route53 Resolver Query Logs record DNS queries from VPC resources. CloudFront access logs show edge behavior. CloudWatch Network Monitor (new) provides continuous network metrics.`,
    whenToUse: [
      'Systematically diagnosing a network connectivity issue in production',
      'Using mtr to find which network hop is causing packet loss',
      'Reading VPC Flow Logs to determine if a security group is rejecting traffic',
      'Building a network debugging runbook for an on-call team',
    ],
    keyConcepts: [
      { term: 'mtr', definition: 'Combines traceroute and ping. Continuously probes each hop and shows real-time loss% and latency. Essential for finding which hop is losing packets.' },
      { term: 'VPC Flow Logs', definition: 'AWS logs recording per-ENI network traffic: source IP, destination IP, port, protocol, bytes, and ACCEPT/REJECT action. Stored in CloudWatch Logs or S3. Filter with Logs Insights.' },
      { term: 'ss -tulpn', definition: 'List all listening TCP/UDP sockets with process name and PID. Faster than netstat. Use to verify a service is listening on the expected port and interface.' },
      { term: 'tcpdump filtering', definition: 'BPF filter syntax: host <ip> (traffic to/from IP), port 443 (port), tcp (protocol), not port 22 (exclusion). Combine: host 10.0.1.5 and port 5432 and tcp.' },
      { term: 'MTU issues', definition: 'Maximum Transmission Unit. AWS instances have MTU 9001 (jumbo frames) within a VPC. Crossing an IGW or VPN reduces MTU to 1500. PMTUD (Path MTU Discovery) handles this with ICMP type 3 code 4.' },
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

Step 1 — Verify the target service and endpoints:
kubectl get svc -n target-ns my-service   # Does the Service exist?
kubectl get endpoints -n target-ns my-service   # Does it have healthy endpoints?
# If endpoints are empty, the Service selector does not match any pods — check labels.

Step 2 — DNS resolution (Layer 7):
kubectl exec -n source-ns source-pod -- nslookup my-service.target-ns.svc.cluster.local
# If this fails, CoreDNS is not resolving it. Check CoreDNS pods and ConfigMap.
kubectl get pods -n kube-system -l k8s-app=kube-dns   # Are CoreDNS pods running?

Step 3 — TCP connectivity (Layer 4):
kubectl exec -n source-ns source-pod -- nc -zv my-service.target-ns.svc.cluster.local 80 -w 3
# Connection refused → pod is listening on wrong port or not listening at all
# Connection timed out → NetworkPolicy is blocking traffic

Step 4 — NetworkPolicy check:
kubectl get networkpolicy -n target-ns   # Any policies restricting inbound?
# A default-deny ingress policy with no exception for source-ns will block traffic.
kubectl get networkpolicy -n source-ns   # Any policies restricting outbound?

Step 5 — Packet capture on the target pod:
kubectl exec -n target-ns target-pod -- tcpdump -i any -n port 80
# Then retry the connection. If packets arrive but get no response, it's an app issue.
# If no packets arrive, the CNI or NetworkPolicy is dropping them.

Step 6 — Check CNI plugin logs:
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50   # For Calico
# CNI plugins log NetworkPolicy enforcement decisions here.

Common root causes: NetworkPolicy blocks cross-namespace traffic, Service selector has a typo, CoreDNS is returning the wrong IP, port number mismatch.`,
      },
    ],
    references: [
      'https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/',
      'https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html',
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
    introduction: `Latency diagnosis requires distinguishing between different types of latency and their causes. Network latency (propagation delay + transmission delay) is largely determined by physics: 1ms per 100km for fiber, 70ms New York to London. Application latency adds queuing delay, processing time, and database round trips on top of network latency.

Understanding the percentile distribution is essential. Average latency hides outliers. p99 latency is the 99th percentile — 1% of requests are slower than this value. p99.9 (tail latency) is often 5-10x p99. In systems with fan-out (a request calls 10 downstream services), the overall p99 approaches the p99.9 of each individual service. This is why reducing tail latency in microservices matters more than improving average latency.

Queuing theory (Little's Law): L = λW. L = average number of items in the system; λ = arrival rate; W = average time spent in the system. If arrival rate exceeds service rate, the queue grows without bound and latency spikes. This explains why a service at 80% CPU utilisation shows 2-3x latency compared to 50% utilisation — queuing effects become nonlinear near saturation.

Common latency sources in cloud environments: DNS resolution (first request to a new hostname, 5-50ms), TCP connection setup (3-way handshake, ~1 RTT), TLS handshake (1-2 RTTs for TLS 1.2, 1 RTT for TLS 1.3), TTFB (time to first byte from origin), database query time, cross-AZ traffic (1-2ms within same region), cross-region traffic (40-200ms depending on distance).`,
    whenToUse: [
      'Diagnosing a p99 latency spike that does not show up in the average',
      'Explaining why a service at 70% CPU shows 3x more latency than at 30% CPU',
      'Choosing the right AWS region pair to minimise cross-region latency for real-time features',
      'Understanding why fan-out patterns amplify tail latency',
    ],
    keyConcepts: [
      { term: 'p99 latency', definition: '99th percentile — 1% of requests are slower than this value. Use p99 and p999 for SLOs. Averages hide the long tail that users experience during spikes.' },
      { term: 'Queuing delay', definition: 'Time waiting for the server to free up capacity. Grows nonlinearly as utilisation approaches 100%. At 90% CPU, queuing delay often exceeds processing time.' },
      { term: 'RTT (Round Trip Time)', definition: 'Time for a packet to travel from source to destination and back. Propagation delay is ~5ms per 1000km in fiber. TLS handshake adds 1-2 RTTs before data flows.' },
      { term: 'Connection keep-alive', definition: 'Reusing TCP connections across HTTP requests eliminates the 3-way handshake and TLS renegotiation per request. Essential for high-throughput services.' },
      { term: 'Hedged requests', definition: 'Sending a duplicate request to a second backend after a small timeout (e.g., 5ms), then using whichever responds first. Effectively eliminates tail latency at the cost of extra backend load.' },
    ],
    pitfalls: [
      'Using average latency in SLOs — a system with 10ms average but 2000ms p99 appears healthy by average but is failing 1% of users. Always use percentile-based SLOs.',
      'Placing your primary database in a different region from the application server — every database query adds one cross-region RTT (40-200ms). A page that queries the DB 20 times adds 4 seconds of latency.',
      'Ignoring DNS latency for first connections — if connection pooling is not used, DNS resolution adds 5-50ms per new hostname. Use persistent connections and connection pools to amortize this.',
    ],
    keyQuestions: [
      {
        question: 'Your API p99 latency is 2000ms but p50 is 50ms. What are the most likely causes and how do you diagnose?',
        answer: `A large gap between p50 and p99 latency indicates tail latency — most requests are fast but a small fraction are very slow. Likely causes:

1. Garbage collection pauses (JVM, Go): GC stop-the-world events freeze all threads for 50-500ms. The requests in-flight during GC become the slow tail.
   Diagnosis: correlate GC logs with latency spikes. Look for JVM pause_ms in GC logs or runtime.gc.pause_ns in Go runtime metrics. Fix: tune GC settings (G1GC's MaxGCPauseMillis, Go's GOGC), reduce object allocation, increase heap.

2. Lock contention: a shared resource (mutex, database row lock) causes occasional serialization.
   Diagnosis: thread dump during spike (jstack PID), or async-profiler to capture lock contention flame graphs. Fix: reduce lock scope, use lock-free data structures.

3. Cold cache misses: the 99th percentile request hits an empty cache entry.
   Diagnosis: correlate cache hit rate with latency percentiles. Redis latency histogram (redis-cli --latency-history). Fix: cache warm-up on startup, stale-while-revalidate.

4. Network tail events: packet retransmissions, TCP retransmit timer (default 200ms), or TCP slow start on new connections.
   Diagnosis: ss -tio | grep retrans, /proc/net/tcp retransmit counters, tcpdump looking for SYN retransmissions.

5. Resource saturation: database connection pool exhausted — requests queue waiting for a connection.
   Diagnosis: monitor active vs total connections in the pool. If active == max, requests queue. Fix: increase pool size or reduce query duration.

Tool for diagnosing: add distributed tracing (Jaeger, Tempo). Look at the trace for a slow request — each span shows where the time was spent. The slow span identifies the bottleneck.`,
      },
    ],
    references: [
      'https://sre.google/sre-book/addressing-cascading-failures/',
      'https://www.brendangregg.com/usemethod.html',
    ],
  },
];
