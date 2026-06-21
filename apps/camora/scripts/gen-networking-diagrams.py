#!/usr/bin/env python3
import graphviz, os

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'cyan':   ('#cffafe', '#06b6d4', '#155e75'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
}
def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def base_graph(name, title, rankdir='LR'):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.25', nodesep='0.5', ranksep='0.45',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'networking')
os.makedirs(OUT, exist_ok=True)


# ─── OSI Model ───────────────────────────────────────────────────────────────

def diag_osi_layers():
    g = base_graph('osi_layers', 'OSI vs TCP/IP — Layer Mapping & Diagnostic Tools', rankdir='TB')
    # OSI layers
    n(g, 'l7', 'L7 Application\nHTTP, DNS, SMTP, gRPC\nTool: curl, dig, grpcurl', 'navy')
    n(g, 'l6', 'L6 Presentation\nTLS/SSL, encoding\nTool: openssl s_client', 'purple')
    n(g, 'l5', 'L5 Session\nSession management\nTCP state machine', 'gray')
    n(g, 'l4', 'L4 Transport\nTCP / UDP ports\nTool: nc, ss, netstat', 'navy')
    n(g, 'l3', 'L3 Network\nIP routing, ICMP\nTool: ping, traceroute, ip route', 'teal')
    n(g, 'l2', 'L2 Data Link\nMAC, ARP, Ethernet\nTool: arp, tcpdump eth', 'green')
    n(g, 'l1', 'L1 Physical\nBits, cables, NICs\nTool: ethtool, link lights', 'gray')
    # TCP/IP mapping
    n(g, 'tcpapp',  'TCP/IP: Application\n(L5-L7)', 'cyan')
    n(g, 'tcptrans','TCP/IP: Transport\n(L4)', 'navy')
    n(g, 'tcpinet', 'TCP/IP: Internet\n(L3)', 'teal')
    n(g, 'tcplink', 'TCP/IP: Link\n(L1-L2)', 'green')
    # OSI stack flow
    e(g, 'l7', 'l6', 'encapsulate')
    e(g, 'l6', 'l5')
    e(g, 'l5', 'l4')
    e(g, 'l4', 'l3')
    e(g, 'l3', 'l2')
    e(g, 'l2', 'l1')
    # TCP/IP mappings
    e(g, 'tcpapp',  'l7', 'maps to', '#94a3b8', 'dashed')
    e(g, 'tcptrans','l4', 'maps to', '#94a3b8', 'dashed')
    e(g, 'tcpinet', 'l3', 'maps to', '#94a3b8', 'dashed')
    e(g, 'tcplink', 'l2', 'maps to', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'osi-model-layers'), cleanup=True)
    print('Generated: osi-model-layers')


def diag_osi_encapsulation():
    g = base_graph('osi_encap', 'HTTP Request Encapsulation — OSI Layer by Layer', rankdir='LR')
    n(g, 'app',  'HTTP GET /index.html\n[Application payload]', 'navy')
    n(g, 'tls',  'TLS record header\n+ encrypted HTTP payload', 'purple')
    n(g, 'tcp',  'TCP segment\nsrc:48210 dst:443\nseq/ack/flags', 'navy')
    n(g, 'ip',   'IP packet\nsrc:10.0.1.5 dst:93.184.216.34\nTTL=64, proto=TCP', 'teal')
    n(g, 'eth',  'Ethernet frame\nsrc MAC dst MAC\nEtherType=0x0800', 'green')
    n(g, 'phys', 'Electrical / optical\nsignal on wire', 'gray')
    n(g, 'awssg',  'AWS Security Group\nstateful L4 filter\nallows port 443 out', 'gold')
    n(g, 'awsnacl','AWS NACL\nstateless L4 filter\ncheck both directions', 'red')
    e(g, 'app',  'tls',  'L6 wraps')
    e(g, 'tls',  'tcp',  'L4 wraps')
    e(g, 'tcp',  'ip',   'L3 wraps')
    e(g, 'ip',   'eth',  'L2 wraps')
    e(g, 'eth',  'phys', 'L1 sends')
    e(g, 'awssg',  'tcp', 'inspects', '#f59e0b', 'dashed')
    e(g, 'awsnacl','ip',  'inspects', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'osi-model-encapsulation'), cleanup=True)
    print('Generated: osi-model-encapsulation')


# ─── TLS/SSL Handshake ────────────────────────────────────────────────────────

def diag_tls_handshake():
    g = base_graph('tls_handshake', 'TLS 1.2 vs TLS 1.3 Handshake Comparison', rankdir='LR')
    # TLS 1.2
    with g.subgraph(name='cluster_12') as s:
        s.attr(label='TLS 1.2  (2 RTT)', style='filled', fillcolor='#f8fafc',
               color='#94a3b8', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'c12_ch',   'ClientHello\nciphers, TLS version\nclient random', 'navy')
        n(s, 'c12_sh',   'ServerHello\nchosen cipher\nserver random', 'teal')
        n(s, 'c12_cert', 'Certificate\n+ ServerKeyExchange\n(ECDHE params)', 'green')
        n(s, 'c12_ckx',  'ClientKeyExchange\nChangeCipherSpec\nFinished', 'navy')
        n(s, 'c12_done', 'ChangeCipherSpec\nFinished\n→ App data', 'green')
        e(s, 'c12_ch',   'c12_sh',   'RTT 1→')
        e(s, 'c12_sh',   'c12_cert', '')
        e(s, 'c12_cert', 'c12_ckx',  'RTT 1←')
        e(s, 'c12_ckx',  'c12_done', 'RTT 2→')
    # TLS 1.3
    with g.subgraph(name='cluster_13') as s:
        s.attr(label='TLS 1.3  (1 RTT, 0-RTT resumption)', style='filled', fillcolor='#f0fdf4',
               color='#22c55e', fontname='Helvetica Neue Bold', fontsize='12')
        n(s, 'c13_ch',   'ClientHello\n+ key_share (ECDHE)\n+ supported versions', 'navy')
        n(s, 'c13_sh',   'ServerHello\n+ key_share + Finished\n+ Certificate + CertVerify', 'green')
        n(s, 'c13_fin',  'Client Finished\n→ App data immediately\n(0-RTT: send early data)', 'green')
        n(s, 'c13_0rtt', '0-RTT caution:\nreplay-vulnerable!\nonly idempotent requests', 'red')
        e(s, 'c13_ch',  'c13_sh',  'RTT 1→')
        e(s, 'c13_sh',  'c13_fin', 'RTT 1←')
        e(s, 'c13_fin', 'c13_0rtt','risk', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'tls-ssl-handshake-comparison'), cleanup=True)
    print('Generated: tls-ssl-handshake-comparison')


def diag_tls_mtls():
    g = base_graph('tls_mtls', 'mTLS — Mutual Certificate Authentication Flow', rankdir='LR')
    n(g, 'client',   'Service A\n(client)', 'navy')
    n(g, 'rootca',   'Root CA\n(trusted anchor)', 'gold')
    n(g, 'intca',    'Intermediate CA\n(signs leaf certs)', 'gold')
    n(g, 'clientca', 'Client cert\nsigned by IntCA', 'green')
    n(g, 'serverca', 'Server cert\nsigned by IntCA', 'teal')
    n(g, 'server',   'Service B\n(server)', 'teal')
    n(g, 'sidecar',  'Sidecar proxy\n(Envoy / Istio)\nautomated cert rotation', 'purple')
    e(g, 'rootca',   'intca',    'signs')
    e(g, 'intca',    'clientca', 'signs')
    e(g, 'intca',    'serverca', 'signs')
    e(g, 'client',   'server',   'ClientHello + client cert', '#3b82f6')
    e(g, 'server',   'client',   'ServerHello + server cert\n→ both verified', '#22c55e')
    e(g, 'clientca', 'client',   'installed in', '#94a3b8', 'dashed')
    e(g, 'serverca', 'server',   'installed in', '#94a3b8', 'dashed')
    e(g, 'sidecar',  'client',   'manages', '#6366f1', 'dashed')
    e(g, 'sidecar',  'server',   'manages', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'tls-ssl-handshake-mtls'), cleanup=True)
    print('Generated: tls-ssl-handshake-mtls')


# ─── DNS Resolution ───────────────────────────────────────────────────────────

def diag_dns_resolution():
    g = base_graph('dns_resolution', 'DNS Resolution — Recursive Query Flow with Caching', rankdir='LR')
    n(g, 'browser',  'Browser\ncache check\n(TTL-based)', 'navy')
    n(g, 'os',       'OS resolver\n/etc/hosts\nstub resolver', 'navy')
    n(g, 'recurse',  'Recursive Resolver\n(ISP / 8.8.8.8)\ncaches all responses', 'teal')
    n(g, 'root',     'Root Nameserver\n13 clusters (A-M)\nrefers to TLD', 'gold')
    n(g, 'tld',      'TLD Nameserver\n.com / .io / .org\nrefers to authoritative', 'gold')
    n(g, 'auth',     'Authoritative NS\nRoute 53 / Cloudflare\nholds actual records', 'green')
    n(g, 'cache_hit','Cache hit:\nskip upstream\nTTL remaining', 'green')
    n(g, 'neg',      'NXDOMAIN\nnegative cache\nnegative TTL', 'red')
    e(g, 'browser',  'os',      '1. lookup')
    e(g, 'os',       'recurse', '2. query')
    e(g, 'recurse',  'root',    '3. who owns .com?')
    e(g, 'root',     'recurse', '4. ask TLD')
    e(g, 'recurse',  'tld',     '5. who owns example.com?')
    e(g, 'tld',      'recurse', '6. ask auth NS')
    e(g, 'recurse',  'auth',    '7. A record for www?')
    e(g, 'auth',     'recurse', '8. 93.184.216.34 TTL 300')
    e(g, 'recurse',  'browser', '9. answer + cache')
    e(g, 'recurse',  'cache_hit','if cached', '#22c55e', 'dashed')
    e(g, 'auth',     'neg',     'if missing', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'dns-resolution-flow'), cleanup=True)
    print('Generated: dns-resolution-flow')


def diag_dns_negative():
    g = base_graph('dns_negative', 'DNS TTL, Negative Caching & Propagation Delay', rankdir='TB')
    n(g, 'change',  'Change A record\n93.184.216.34 → 1.2.3.4\nat authoritative NS', 'gold')
    n(g, 'old_cache','Recursive resolvers\nstill serving old IP\nuntil cached TTL expires', 'red')
    n(g, 'ttl_low', 'Low TTL (60s)\nfast propagation\nhigh DNS query load', 'green')
    n(g, 'ttl_high','High TTL (86400s)\nslow propagation\nlow DNS query load', 'navy')
    n(g, 'negcache','Negative caching\n(NXDOMAIN TTL)\nblocks re-lookup\nuntil SOA minimum TTL', 'purple')
    n(g, 'best',    'Best practice:\nLower TTL 24h before\ncutover → change\n→ raise TTL after', 'teal')
    e(g, 'change',  'old_cache', 'propagation gap')
    e(g, 'change',  'ttl_low',   'tradeoff')
    e(g, 'change',  'ttl_high',  'tradeoff')
    e(g, 'ttl_low', 'best',      'use for')
    e(g, 'ttl_high','best',      'use after')
    e(g, 'negcache','old_cache', 'NXDOMAIN also cached', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'dns-resolution-ttl'), cleanup=True)
    print('Generated: dns-resolution-ttl')


# ─── DNS Record Types ─────────────────────────────────────────────────────────

def diag_dns_record_types():
    g = base_graph('dns_records', 'DNS Record Types — Purpose & Common Use Cases', rankdir='TB')
    n(g, 'a',      'A\nHostname → IPv4\nexample.com → 93.184.216.34', 'navy')
    n(g, 'aaaa',   'AAAA\nHostname → IPv6\n2606:2800:220:1::/32', 'navy')
    n(g, 'cname',  'CNAME\nAlias → canonical name\nwww → example.com\nNot valid at zone apex', 'teal')
    n(g, 'mx',     'MX\nMail server + priority\n10 mail.example.com', 'purple')
    n(g, 'txt',    'TXT\nFree-form text\nSPF, DKIM, domain verify\nLet\'s Encrypt challenge', 'gold')
    n(g, 'ns',     'NS\nDelegation to nameserver\nexample.com NS → ns1.route53.com', 'green')
    n(g, 'soa',    'SOA\nZone authority\nserial, refresh, retry\nnegative TTL (minimum)', 'gray')
    n(g, 'srv',    'SRV\nService location\n_http._tcp priority weight port host', 'cyan')
    n(g, 'ptr',    'PTR\nReverse DNS\nIP → hostname\nin-addr.arpa', 'teal')
    n(g, 'alias',  'ALIAS / ANAME\n(AWS Route 53)\nAPEX alias to ALB/CF\nresolves at query time', 'green')
    n(g, 'apex',   'Zone apex\nexample.com (no www)\nCNAME forbidden here\nuse ALIAS/ANAME', 'red')
    e(g, 'a',    'alias',  'replaced by', '#22c55e', 'dashed')
    e(g, 'cname','apex',   'forbidden at', '#ef4444', 'dashed')
    e(g, 'alias','apex',   'works at', '#22c55e', 'dashed')
    e(g, 'txt',  'mx',     'SPF validates\nemail auth', '#94a3b8', 'dashed')
    e(g, 'ns',   'soa',    'zone contains')
    g.render(os.path.join(OUT, 'dns-record-types-overview'), cleanup=True)
    print('Generated: dns-record-types-overview')


# ─── L4 vs L7 Load Balancing ─────────────────────────────────────────────────

def diag_l4_vs_l7_lb():
    g = base_graph('l4_v_l7', 'L4 vs L7 Load Balancer — Decision & Feature Matrix', rankdir='LR')
    n(g, 'client',  'Client\nbrowser / mobile\nservice-to-service', 'gray')
    n(g, 'nlb',     'NLB (L4)\nTCP/UDP forwarding\nStatic Elastic IP\nSource IP preserved\nMicrosecond latency\nPrivateLink target', 'navy')
    n(g, 'alb',     'ALB (L7)\nHTTP/HTTPS/gRPC\nPath + host routing\nSNI multi-cert\nWAF integration\nLambda targets', 'teal')
    n(g, 'nlb_use', 'Choose NLB when:\n• Source IP at target\n• Non-HTTP protocol\n• Static IP required\n• Ultra-low latency\n• PrivateLink', 'navy')
    n(g, 'alb_use', 'Choose ALB when:\n• Path/host routing\n• Microservices\n• Lambda targets\n• Auth / WAF rules\n• gRPC / WebSocket', 'teal')
    n(g, 'backend_nlb','TCP targets\n(EC2, IP, ECS)', 'green')
    n(g, 'backend_alb','HTTP targets\n(EC2, IP, ECS,\nLambda)', 'green')
    e(g, 'client',  'nlb',        'TCP/UDP')
    e(g, 'client',  'alb',        'HTTP/HTTPS')
    e(g, 'nlb',     'backend_nlb','pass-through')
    e(g, 'alb',     'backend_alb','content-route')
    e(g, 'nlb',     'nlb_use',    '', '#94a3b8', 'dashed')
    e(g, 'alb',     'alb_use',    '', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'l4-vs-l7-lb-comparison'), cleanup=True)
    print('Generated: l4-vs-l7-lb-comparison')


def diag_lb_algorithms():
    g = base_graph('lb_algos', 'Load Balancing Algorithms — When to Use Each', rankdir='TB')
    n(g, 'rr',     'Round Robin\nSequential distribution\nBest: uniform requests\nNo state needed', 'navy')
    n(g, 'lc',     'Least Connections\nRoute to least-active\nBest: variable request\nduration (DB, streams)', 'green')
    n(g, 'iphash', 'IP Hash\nClient IP → server\nSticky by client\nBreaks with NAT/proxy', 'gold')
    n(g, 'wrr',    'Weighted Round Robin\nCapacity-aware split\nBest: mixed instance\nsizes (canary deploys)', 'teal')
    n(g, 'rand2',  'Power of Two Choices\nPick 2 random, take min\nConnections O(1)\nAmazon / Nginx Plus', 'purple')
    n(g, 'sticky', 'Sticky Sessions\n(Session affinity)\nCookie / src IP\nImpedes scale-out', 'red')
    e(g, 'rr',     'wrr',   'weighted variant')
    e(g, 'lc',     'rand2', 'scalable approx')
    e(g, 'iphash', 'sticky','similar goal')
    g.render(os.path.join(OUT, 'l4-vs-l7-lb-algorithms'), cleanup=True)
    print('Generated: l4-vs-l7-lb-algorithms')


# ─── CDN Architecture ─────────────────────────────────────────────────────────

def diag_cdn_architecture():
    g = base_graph('cdn_arch', 'CDN Architecture — Request Flow & Cache Hierarchy', rankdir='LR')
    n(g, 'user',    'End User\nbrowser / mobile\n(global, any PoP)', 'gray')
    n(g, 'dns_cdn', 'DNS Anycast\nRoutes to nearest\nPoP by latency', 'gold')
    n(g, 'pop',     'Edge PoP\n(Point of Presence)\nL1 cache — hot assets\nSSL termination\nHTTP/2 push', 'navy')
    n(g, 'regional','Regional Cache\n(L2 / Shield PoP)\nreduces origin load\nCloudFront shield\nFastly shielding', 'teal')
    n(g, 'origin',  'Origin Server\nS3 / EC2 / ALB\nonly on cache miss\n("cache fill")', 'green')
    n(g, 'hit',     'Cache HIT\n~1-5ms (edge)\nno origin request\nCache-Control header\ncontrols TTL', 'green')
    n(g, 'miss',    'Cache MISS\n~50-200ms round trip\nfetched from origin\ncached for next request', 'red')
    n(g, 'purge',   'Cache invalidation:\nversion in filename\n(app-v2.3.1.js)\nor CDN API purge', 'purple')
    e(g, 'user',     'dns_cdn',  '1. DNS lookup')
    e(g, 'dns_cdn',  'pop',      '2. route to PoP')
    e(g, 'pop',      'hit',      '3a. cache hit', '#22c55e')
    e(g, 'pop',      'regional', '3b. L2 check')
    e(g, 'regional', 'origin',   '4. cache miss\nfetch origin')
    e(g, 'origin',   'regional', '5. fill L2')
    e(g, 'regional', 'pop',      '6. fill L1')
    e(g, 'pop',      'user',     '7. respond')
    e(g, 'pop',      'miss',     '', '#ef4444', 'dashed')
    e(g, 'purge',    'pop',      'invalidate', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'cdn-architecture-flow'), cleanup=True)
    print('Generated: cdn-architecture-flow')


# ─── AWS VPC Design ───────────────────────────────────────────────────────────

def diag_aws_vpc_design():
    g = base_graph('vpc_design', 'AWS VPC Design — Public/Private/Isolated Subnet Tiers', rankdir='TB')
    with g.subgraph(name='cluster_internet') as s:
        s.attr(label='Internet', style='filled', fillcolor='#f1f5f9', color='#94a3b8',
               fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'igw', 'Internet Gateway\n(IGW)\nstateful, free', 'gold')

    with g.subgraph(name='cluster_pub') as s:
        s.attr(label='Public Subnets  (10.0.1.0/24, 10.0.2.0/24)', style='filled',
               fillcolor='#eff6ff', color='#3b82f6',
               fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'alb',  'ALB\n(internet-facing)', 'teal')
        n(s, 'nat',  'NAT Gateway\n(HA per AZ)', 'gold')
        n(s, 'bastion','Bastion Host\n(optional)', 'gray')

    with g.subgraph(name='cluster_priv') as s:
        s.attr(label='Private Subnets  (10.0.3.0/24, 10.0.4.0/24)', style='filled',
               fillcolor='#f0fdf4', color='#22c55e',
               fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'app1', 'App servers\n(ECS / EC2)', 'green')
        n(s, 'app2', 'App servers\n(ECS / EC2)', 'green')

    with g.subgraph(name='cluster_isolated') as s:
        s.attr(label='Isolated Subnets  (10.0.5.0/24, 10.0.6.0/24)', style='filled',
               fillcolor='#fef3c7', color='#f59e0b',
               fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'rds',   'RDS PostgreSQL\n(Multi-AZ)', 'navy')
        n(s, 'cache', 'ElastiCache\n(Redis)', 'purple')

    n(g, 'sg_alb',  'Security Groups:\nALB: 0.0.0.0/0:443 in\nApp: sg-alb:8080 in\nRDS: sg-app:5432 in', 'red')
    n(g, 'rtable',  'Route tables:\nPublic: 0.0.0.0/0 → IGW\nPrivate: 0.0.0.0/0 → NAT\nIsolated: local only', 'gray')
    e(g, 'igw',  'alb',  'inbound')
    e(g, 'alb',  'app1', 'routes')
    e(g, 'alb',  'app2', 'routes')
    e(g, 'app1', 'rds',  'SQL')
    e(g, 'app1', 'cache','cache')
    e(g, 'app1', 'nat',  'egress')
    e(g, 'nat',  'igw',  'egress')
    e(g, 'sg_alb', 'alb', 'governs', '#ef4444', 'dotted')
    e(g, 'rtable', 'nat', 'routes', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'aws-vpc-design-tiers'), cleanup=True)
    print('Generated: aws-vpc-design-tiers')


def diag_aws_vpc_connectivity():
    g = base_graph('vpc_connect', 'AWS VPC Connectivity Options — Peering vs TGW vs PrivateLink', rankdir='LR')
    n(g, 'vpc_a',  'VPC A\n10.0.0.0/16\n(app workload)', 'navy')
    n(g, 'vpc_b',  'VPC B\n10.1.0.0/16\n(shared services)', 'teal')
    n(g, 'vpc_c',  'VPC C\n10.2.0.0/16\n(data platform)', 'purple')
    n(g, 'peer',   'VPC Peering\ndirect 1-to-1\nnon-transitive\nno overlapping CIDRs', 'gold')
    n(g, 'tgw',    'Transit Gateway\nhub-and-spoke\ntransitive routing\ncross-account\nroute tables', 'green')
    n(g, 'pl',     'PrivateLink\nNLB endpoint\nservice consumer/provider\nno CIDR overlap needed\ncross-account safe', 'teal')
    n(g, 'dxvpn',  'Direct Connect /\nSite-to-Site VPN\non-prem hybrid\nDX: dedicated 1/10G\nVPN: IPSec over internet', 'gray')
    e(g, 'vpc_a',  'peer',  'simple 1:1')
    e(g, 'peer',   'vpc_b', 'non-transitive')
    e(g, 'vpc_a',  'tgw',   'attach')
    e(g, 'vpc_b',  'tgw',   'attach')
    e(g, 'vpc_c',  'tgw',   'attach')
    e(g, 'vpc_a',  'pl',    'consumer\nENI endpoint')
    e(g, 'pl',     'vpc_b', 'provider\nNLB service')
    e(g, 'tgw',    'dxvpn', 'TGW attach\nfor on-prem', '#94a3b8', 'dashed')
    g.render(os.path.join(OUT, 'aws-vpc-design-connectivity'), cleanup=True)
    print('Generated: aws-vpc-design-connectivity')


# ─── Service Mesh ─────────────────────────────────────────────────────────────

def diag_service_mesh():
    g = base_graph('svc_mesh', 'Service Mesh Architecture — Istio / Envoy Data & Control Planes', rankdir='LR')
    with g.subgraph(name='cluster_control') as s:
        s.attr(label='Control Plane (Istiod)', style='filled', fillcolor='#ede9fe',
               color='#6366f1', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'pilot',  'Pilot\nxDS API\nservice discovery\nrouting rules', 'purple')
        n(s, 'citadel','Citadel\ncert issuance\nmTLS identity\nSPIFFE/SVID', 'purple')
        n(s, 'galley', 'Galley\nconfiguration\nvalidation', 'purple')

    with g.subgraph(name='cluster_dp') as s:
        s.attr(label='Data Plane (Envoy sidecars)', style='filled', fillcolor='#f0fdf4',
               color='#22c55e', fontname='Helvetica Neue Bold', fontsize='11')
        n(s, 'svc_a',    'Service A\npod', 'navy')
        n(s, 'proxy_a',  'Envoy sidecar A\nmTLS, retries\ncircuit break\ntelemetry', 'green')
        n(s, 'svc_b',    'Service B\npod', 'navy')
        n(s, 'proxy_b',  'Envoy sidecar B\nmTLS, retries\ncircuit break\ntelemetry', 'green')

    n(g, 'obs',  'Observability:\nPrometheus metrics\nJaeger traces\nKiali topology', 'teal')
    n(g, 'nomesh','Without mesh:\nhand-code retry logic\nno mTLS identity\nno traffic policy\nper-language SDK', 'red')
    e(g, 'pilot',   'proxy_a', 'xDS config', '#6366f1', 'dashed')
    e(g, 'pilot',   'proxy_b', 'xDS config', '#6366f1', 'dashed')
    e(g, 'citadel', 'proxy_a', 'cert/key', '#6366f1', 'dashed')
    e(g, 'citadel', 'proxy_b', 'cert/key', '#6366f1', 'dashed')
    e(g, 'svc_a',   'proxy_a', 'all traffic\nintercepted')
    e(g, 'proxy_a', 'proxy_b', 'mTLS tunnel')
    e(g, 'proxy_b', 'svc_b',   'decrypted')
    e(g, 'proxy_a', 'obs',     'metrics/traces', '#14b8a6', 'dashed')
    e(g, 'proxy_b', 'obs',     'metrics/traces', '#14b8a6', 'dashed')
    e(g, 'nomesh',  'proxy_a', 'solved by\nmesh', '#22c55e', 'dashed')
    g.render(os.path.join(OUT, 'service-mesh-architecture'), cleanup=True)
    print('Generated: service-mesh-architecture')


# ─── Network Debugging Tools ──────────────────────────────────────────────────

def diag_network_debugging_tools():
    g = base_graph('net_debug', 'Network Debugging Tools — By OSI Layer & Use Case', rankdir='TB')
    n(g, 'l1_tools', 'Layer 1-2 Tools\nethtool — NIC stats, speed\nip link show — link state\nmii-tool — media status', 'gray')
    n(g, 'l3_tools', 'Layer 3 Tools\nping — ICMP reachability\ntraceroute / mtr — hop path\nip route — routing table\nip addr — IP assignment', 'teal')
    n(g, 'l4_tools', 'Layer 4 Tools\nss -tnp — TCP sockets\nnc -zv host port — port open\nnmap — port scan\ncurl -v — TCP + HTTP', 'navy')
    n(g, 'l7_tools', 'Layer 7 Tools\ncurl / httpie — HTTP\ndig / nslookup — DNS\nopenssl s_client — TLS\ngrpcurl — gRPC', 'purple')
    n(g, 'capture',  'Packet Capture\ntcpdump -i eth0 port 443\nWireshark — GUI dissect\naws VPC Flow Logs\ncloud packet mirror', 'gold')
    n(g, 'perf',     'Performance\niperf3 — bandwidth\nmtr — latency+loss\nss --stats — socket stats\nnethogs — per-PID traffic', 'green')
    n(g, 'ladder',   'Debugging ladder:\n1. ping (L3 up?)\n2. nc port (L4 open?)\n3. curl -v (L7/TLS ok?)\n4. tcpdump (packet trace)', 'red')
    e(g, 'l1_tools', 'l3_tools', 'if L2 ok, check L3')
    e(g, 'l3_tools', 'l4_tools', 'if L3 ok, check L4')
    e(g, 'l4_tools', 'l7_tools', 'if L4 ok, check L7')
    e(g, 'capture',  'l4_tools', 'deep dive', '#f59e0b', 'dashed')
    e(g, 'ladder',   'l3_tools', 'step 1', '#94a3b8', 'dotted')
    e(g, 'ladder',   'l4_tools', 'step 2', '#94a3b8', 'dotted')
    e(g, 'ladder',   'l7_tools', 'step 3', '#94a3b8', 'dotted')
    e(g, 'ladder',   'capture',  'step 4', '#94a3b8', 'dotted')
    g.render(os.path.join(OUT, 'network-debugging-tools-by-layer'), cleanup=True)
    print('Generated: network-debugging-tools-by-layer')


# ─── Latency Diagnosis ────────────────────────────────────────────────────────

def diag_latency_diagnosis():
    g = base_graph('latency_diag', 'Latency Diagnosis — Sources, Measurement & Reduction', rankdir='LR')
    n(g, 'client_lat', 'Client-side\nDNS lookup\nTCP handshake\nTLS handshake\nTime to first byte', 'navy')
    n(g, 'network_lat','Network\nRTT to server\nQueueing delay\nPacket loss → retransmit\ntraceroute/mtr', 'teal')
    n(g, 'lb_lat',     'Load Balancer\nConnection overhead\nHealth check cost\nSSL offload time', 'gold')
    n(g, 'app_lat',    'Application\nDB query time\nExternal API calls\nGC pause (JVM/Go)\nThread pool saturation', 'red')
    n(g, 'db_lat',     'Database\nQuery plan (EXPLAIN)\nIndex missing\nLock contention\nConnection pool exhausted', 'red')
    n(g, 'fix_client', 'Fix client:\nHTTP/2 multiplexing\nKeep-alive\nCDN for static assets\nDNS TTL pre-warm', 'green')
    n(g, 'fix_net',    'Fix network:\nChoose closer region\nAWS Global Accelerator\nExpressRoute / DX', 'green')
    n(g, 'fix_app',    'Fix app:\nAsync I/O, cache layer\nConnection pooling\nProfile with flamegraph\nReduce serial awaits', 'green')
    n(g, 'p99',        'Measure p50/p95/p99\nnot averages.\nAverages hide tail lat.\nUse histograms (HdrHist)', 'purple')
    e(g, 'client_lat', 'network_lat', 'if DNS/TCP fast')
    e(g, 'network_lat','lb_lat',      'if RTT ok')
    e(g, 'lb_lat',     'app_lat',     'if LB ok')
    e(g, 'app_lat',    'db_lat',      'if app ok')
    e(g, 'client_lat', 'fix_client',  'fix', '#22c55e', 'dashed')
    e(g, 'network_lat','fix_net',     'fix', '#22c55e', 'dashed')
    e(g, 'app_lat',    'fix_app',     'fix', '#22c55e', 'dashed')
    e(g, 'db_lat',     'fix_app',     'fix', '#22c55e', 'dashed')
    e(g, 'p99',        'app_lat',     'measure correctly', '#6366f1', 'dashed')
    g.render(os.path.join(OUT, 'latency-diagnosis-sources'), cleanup=True)
    print('Generated: latency-diagnosis-sources')


def diag_latency_budget():
    g = base_graph('latency_budget', 'Latency Budget — End-to-End Request Decomposition', rankdir='LR')
    n(g, 'dns',    'DNS\n~20ms cold\n~0ms cached\nCache via OS / CDN', 'gray')
    n(g, 'tcp',    'TCP handshake\n1 RTT (~10-100ms)\nRegion-dependent\nKeep-alive avoids', 'navy')
    n(g, 'tls',    'TLS handshake\n1-2 RTT (~10-200ms)\nTLS 1.3 = 1 RTT\nSession resume → 0-RTT', 'purple')
    n(g, 'ttfb',   'Server TTFB\n= queue + process\nTarget < 200ms\nP99 alert threshold', 'gold')
    n(g, 'xfer',   'Transfer time\nbody size / bandwidth\nHTTP/2 + gzip\nreduce payload', 'teal')
    n(g, 'render', 'Client render\nJS parse, layout\nNot server concern\nbut UX matters', 'gray')
    n(g, 'target', 'Target budgets:\nDNS: < 5ms (cache)\nTCP+TLS: < 50ms\nTTFB: < 200ms\nTotal: < 500ms p95', 'green')
    e(g, 'dns',   'tcp',    '+')
    e(g, 'tcp',   'tls',    '+')
    e(g, 'tls',   'ttfb',   '+')
    e(g, 'ttfb',  'xfer',   '+')
    e(g, 'xfer',  'render', '+')
    e(g, 'target','dns',    'budget', '#22c55e', 'dotted')
    e(g, 'target','ttfb',   'budget', '#22c55e', 'dotted')
    g.render(os.path.join(OUT, 'latency-diagnosis-budget'), cleanup=True)
    print('Generated: latency-diagnosis-budget')


if __name__ == '__main__':
    diag_osi_layers()
    diag_osi_encapsulation()
    diag_tls_handshake()
    diag_tls_mtls()
    diag_dns_resolution()
    diag_dns_negative()
    diag_dns_record_types()
    diag_l4_vs_l7_lb()
    diag_lb_algorithms()
    diag_cdn_architecture()
    diag_aws_vpc_design()
    diag_aws_vpc_connectivity()
    diag_service_mesh()
    diag_network_debugging_tools()
    diag_latency_diagnosis()
    diag_latency_budget()
    print('All networking diagrams generated.')
