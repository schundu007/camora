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
\`\`\`

**Result**: static assets cached at edges indefinitely (low cost, low latency), API always fresh (bypass cache), HTML pages short TTL with fast invalidation capability.`,
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
\`\`\`

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
\`\`\`

**Common root causes**: NetworkPolicy blocks cross-namespace traffic, Service selector typo, CoreDNS returning wrong IP, port number mismatch.`,
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
  },
];
