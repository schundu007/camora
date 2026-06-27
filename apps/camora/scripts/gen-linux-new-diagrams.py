#!/usr/bin/env python3
"""New diagrams for the Linux DevOps 10-day article content."""
import graphviz, os

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5')
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
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.55',
           splines='spline', rankdir=rankdir,
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica-Bold', fontcolor='#1e293b')
    return g

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'linux')
os.makedirs(OUT, exist_ok=True)


# ─── linux-filesystem-hierarchy ───────────────────────────────────────────────

def diag_filesystem_hierarchy():
    g = base_graph('fhs', 'Linux Filesystem Hierarchy Standard (FHS)', rankdir='TB')
    n(g, 'root',   '/ (root)\nTop of the tree', 'navy')
    n(g, 'bin',    '/bin\nEssential user\nbinaries (ls, cp)', 'green')
    n(g, 'sbin',   '/sbin\nSystem binaries\n(fsck, ip)', 'green')
    n(g, 'etc',    '/etc\nConfig files\n(text, editable)', 'gold')
    n(g, 'home',   '/home\nUser home dirs\n(~ expands here)', 'navy')
    n(g, 'var',    '/var\nVariable data\nlogs, DBs, queues', 'teal')
    n(g, 'proc',   '/proc\nKernel state\n(virtual, read-only)', 'purple')
    n(g, 'sys',    '/sys\nDevice/driver info\n(writable for tuning)', 'purple')
    n(g, 'tmp',    '/tmp\nTemp files\n(cleared on reboot)', 'gray')
    n(g, 'usr',    '/usr\nUser programs\n/usr/bin /usr/sbin', 'navy')
    n(g, 'opt',    '/opt\nOptional packages\n(3rd-party installs)', 'gray')
    n(g, 'dev',    '/dev\nDevice files\n(disks, tty, null)', 'teal')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('bin'); s.node('sbin'); s.node('etc'); s.node('home')
        s.node('var'); s.node('proc'); s.node('sys')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('tmp'); s.node('usr'); s.node('opt'); s.node('dev')

    for child in ['bin', 'sbin', 'etc', 'home', 'var', 'proc', 'sys', 'tmp', 'usr', 'opt', 'dev']:
        e(g, 'root', child)

    g.render(os.path.join(OUT, 'linux-filesystem-hierarchy'), cleanup=True)
    print('Generated: linux-filesystem-hierarchy')


# ─── linux-permissions-model ──────────────────────────────────────────────────

def diag_permissions_model():
    g = base_graph('perms', 'Linux Permission Bits — Octal & Special Bits', rankdir='TB')
    n(g, 'ls',     'ls -l output:\n-rwxr-xr-x  1 user grp  4096 file', 'navy')
    n(g, 'owner',  'Owner (u)\nrwx = 7\n4+2+1', 'green')
    n(g, 'group',  'Group (g)\nr-x = 5\n4+0+1', 'teal')
    n(g, 'others', 'Others (o)\nr-- = 4\n4+0+0', 'navy')
    n(g, 'octal',  'Octal 755\n4=read  2=write\n1=execute', 'gold')
    n(g, 'suid',   'SUID (4000)\nRun as file owner\n/usr/bin/passwd', 'red')
    n(g, 'sgid',   'SGID (2000)\nInherit group\nShared dirs', 'red')
    n(g, 'sticky', 'Sticky (1000)\nOnly owner deletes\n/tmp', 'purple')
    n(g, 'ssh',    'Common pairs:\n600 = private key\n700 = ~/.ssh\n755 = web root', 'gray')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('owner'); s.node('group'); s.node('others')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('suid'); s.node('sgid'); s.node('sticky')

    e(g, 'ls', 'owner')
    e(g, 'ls', 'group')
    e(g, 'ls', 'others')
    e(g, 'owner', 'octal')
    e(g, 'octal', 'suid', 'special')
    e(g, 'octal', 'sgid', 'special')
    e(g, 'octal', 'sticky', 'special')
    e(g, 'octal', 'ssh', 'examples')

    g.render(os.path.join(OUT, 'linux-permissions-model'), cleanup=True)
    print('Generated: linux-permissions-model')


# ─── linux-users-types ────────────────────────────────────────────────────────

def diag_users_types():
    g = base_graph('users', 'Linux User Types & Storage Files', rankdir='LR')
    n(g, 'root',    'Root (UID 0)\nUnrestricted access\nUse via sudo only', 'red')
    n(g, 'regular', 'Regular Users\nUID ≥ 1000\nHome dir + login shell', 'green')
    n(g, 'service', 'Service Accounts\nUID 1-999\n/sbin/nologin shell', 'teal')
    n(g, 'passwd',  '/etc/passwd\nAll accounts\nWorld-readable', 'navy')
    n(g, 'shadow',  '/etc/shadow\nPassword hashes\nRoot-only (mode 000)', 'red')
    n(g, 'group',   '/etc/group\nGroup membership\nGroupname:x:GID:members', 'navy')
    n(g, 'sudo',    'sudo / visudo\nGrant least privilege\nAudit trail in syslog', 'gold')
    n(g, 'rule',    'Golden rule:\nGrant least access\nneeded — no blanket root', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('root'); s.node('regular'); s.node('service')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('passwd'); s.node('shadow'); s.node('group')

    e(g, 'root',    'passwd')
    e(g, 'regular', 'passwd')
    e(g, 'service', 'passwd')
    e(g, 'passwd',  'shadow',  'hashes stored')
    e(g, 'passwd',  'group',   'GID ref')
    e(g, 'root',    'sudo',    'use instead')
    e(g, 'sudo',    'rule')

    g.render(os.path.join(OUT, 'linux-users-types'), cleanup=True)
    print('Generated: linux-users-types')


# ─── linux-package-families ───────────────────────────────────────────────────

def diag_package_families():
    g = base_graph('pkgfam', 'Linux Package Manager Families & Universal Packages', rankdir='TB')
    n(g, 'deb',     'Debian Family\nUbuntu / Debian /\nLinux Mint', 'navy')
    n(g, 'apt',     'apt (high-level)\napt install / update\napt upgrade / purge', 'green')
    n(g, 'dpkg',    'dpkg (low-level)\ndpkg -i pkg.deb\ndpkg -l | grep pkg', 'teal')
    n(g, 'rhel',    'RHEL Family\nFedora / CentOS /\nRocky / AlmaLinux', 'navy')
    n(g, 'dnf',     'dnf / yum (high)\ndnf install / remove\ndnf check-update', 'gold')
    n(g, 'rpm',     'rpm (low-level)\nrpm -qa | grep pkg\nrpm -ivh pkg.rpm', 'teal')
    n(g, 'univ',    'Universal Packages\n(distro-agnostic)', 'purple')
    n(g, 'snap',    'snap\n(Canonical)', 'purple')
    n(g, 'flatpak', 'flatpak\n(desktop apps)', 'purple')
    n(g, 'docker',  'Docker images\n(containers)', 'cyan')
    n(g, 'pip',     'pip3 / npm\n(language pkgs)', 'gray')
    n(g, 'rule',    'Rule: always\napt update before\napt install', 'red')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('deb'); s.node('rhel')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('apt'); s.node('dpkg'); s.node('dnf'); s.node('rpm')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('snap'); s.node('flatpak'); s.node('docker'); s.node('pip')

    e(g, 'deb',  'apt')
    e(g, 'deb',  'dpkg')
    e(g, 'rhel', 'dnf')
    e(g, 'rhel', 'rpm')
    e(g, 'univ', 'snap')
    e(g, 'univ', 'flatpak')
    e(g, 'univ', 'docker')
    e(g, 'univ', 'pip')
    e(g, 'apt',  'rule')

    g.render(os.path.join(OUT, 'linux-package-families'), cleanup=True)
    print('Generated: linux-package-families')


# ─── linux-common-ports ───────────────────────────────────────────────────────

def diag_common_ports():
    g = base_graph('ports', 'Common Network Ports — DevOps Reference', rankdir='TB')
    n(g, 'infra',  'Infrastructure', 'navy')
    n(g, 'ssh',    'SSH :22\nRemote access\nChmod 600 key', 'green')
    n(g, 'dns',    'DNS :53\nUDP + TCP\nnslookup / dig', 'green')
    n(g, 'ntp',    'NTP :123\nTime sync\nchronyd / ntpd', 'teal')
    n(g, 'web',    'Web', 'navy')
    n(g, 'http',   'HTTP :80\nUnencrypted\nRedirect to 443', 'gold')
    n(g, 'https',  'HTTPS :443\nTLS encrypted\ncert required', 'gold')
    n(g, 'db',     'Databases', 'navy')
    n(g, 'pg',     'PostgreSQL\n:5432', 'purple')
    n(g, 'mysql',  'MySQL/MariaDB\n:3306', 'purple')
    n(g, 'redis',  'Redis\n:6379', 'red')
    n(g, 'mongo',  'MongoDB\n:27017', 'red')
    n(g, 'cache',  'Cache / Queue', 'navy')
    n(g, 'mq',     'RabbitMQ\n:5672 / :15672', 'teal')
    n(g, 'kafka',  'Kafka\n:9092', 'teal')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('infra'); s.node('web'); s.node('db'); s.node('cache')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('ssh'); s.node('dns'); s.node('ntp')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('http'); s.node('https')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('pg'); s.node('mysql'); s.node('redis'); s.node('mongo')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('mq'); s.node('kafka')

    e(g, 'infra', 'ssh')
    e(g, 'infra', 'dns')
    e(g, 'infra', 'ntp')
    e(g, 'web',   'http')
    e(g, 'web',   'https')
    e(g, 'db',    'pg')
    e(g, 'db',    'mysql')
    e(g, 'db',    'redis')
    e(g, 'db',    'mongo')
    e(g, 'cache', 'mq')
    e(g, 'cache', 'kafka')

    g.render(os.path.join(OUT, 'linux-common-ports'), cleanup=True)
    print('Generated: linux-common-ports')


# ─── linux-text-processing-chain ──────────────────────────────────────────────

def diag_text_processing_chain():
    g = base_graph('txtchain', 'Text Processing Pipeline — Log Analysis Chain', rankdir='LR')
    n(g, 'src',   'Input\n/var/log/syslog\n| stdin', 'gray')
    n(g, 'grep',  'grep "ERROR"\nFilter matching\nlines by pattern', 'navy')
    n(g, 'awk',   'awk \'{print $2}\'\nExtract columns\nfrom structured text', 'navy')
    n(g, 'sed',   'sed \'s/old/new/g\'\nFind & replace\nin-stream', 'navy')
    n(g, 'sort',  'sort -k1,1\nSort lines\n(needed for uniq)', 'navy')
    n(g, 'uniq',  'uniq -c\nCount duplicates\n(sorted input only)', 'navy')
    n(g, 'jq',    'jq \'.level\'\nParse & filter\nJSON logs', 'teal')
    n(g, 'out',   'stdout / file\n> output.txt\nor next command', 'green')
    n(g, 'tip',   'When in doubt:\nread the logs first\njournalctl -u svc -f', 'gold')

    e(g, 'src',  'grep')
    e(g, 'grep', 'awk')
    e(g, 'awk',  'sed')
    e(g, 'sed',  'sort')
    e(g, 'sort', 'uniq')
    e(g, 'uniq', 'jq',  'if JSON')
    e(g, 'jq',   'out')
    e(g, 'uniq', 'out', 'if not JSON')
    e(g, 'tip',  'grep', '', '#f59e0b', 'dashed')

    g.render(os.path.join(OUT, 'linux-text-processing-chain'), cleanup=True)
    print('Generated: linux-text-processing-chain')


# ─── linux-security-hardening-layers ──────────────────────────────────────────

def diag_security_hardening_layers():
    g = base_graph('secharden', 'Linux Security Hardening — Defense in Depth', rankdir='LR')
    n(g, 'fw',      'Firewall\nufw / iptables / nftables\nAllow only needed ports', 'red')
    n(g, 'ssh',     'SSH Hardening\nPasswordAuth no\nPermitRootLogin no\nfail2ban', 'red')
    n(g, 'patch',   'Keep Patched\napt upgrade regularly\nunattended-upgrades', 'gold')
    n(g, 'priv',    'Least Privilege\nNo blanket root\nService accounts\nSudo per-command', 'gold')
    n(g, 'audit',   'Audit Logging\nauditd / journald\nLog all sudo usage\n/var/log/auth.log', 'teal')
    n(g, 'mac',     'MAC (optional)\nSELinux / AppArmor\nPolicy-based access\nkills lateral movement', 'purple')
    n(g, 'result',  'Hardened Server\nSmall attack surface\nAudit trail\nFast incident response', 'green')

    e(g, 'fw',    'ssh',    'layer 2')
    e(g, 'ssh',   'patch',  'layer 3')
    e(g, 'patch', 'priv',   'layer 4')
    e(g, 'priv',  'audit',  'layer 5')
    e(g, 'audit', 'mac',    'layer 6')
    e(g, 'mac',   'result')

    g.render(os.path.join(OUT, 'linux-security-hardening-layers'), cleanup=True)
    print('Generated: linux-security-hardening-layers')


# ─── linux-troubleshooting-playbook ───────────────────────────────────────────

def diag_troubleshooting_playbook():
    g = base_graph('trouble', 'Linux Troubleshooting Playbook — Step-by-Step Diagnostic Flow', rankdir='LR')
    n(g, 'start',   'Something\nbroke', 'red')
    n(g, 'status',  'systemctl status\n<service>\ncheck state + logs', 'navy')
    n(g, 'journal', 'journalctl -u svc -f\nRecent log lines\nExact error message', 'navy')
    n(g, 'port',    'ss -tulnp\nIs the port\nlistening?', 'navy')
    n(g, 'disk',    'df -h / df -i\nDisk or inode\nexhaustion?', 'navy')
    n(g, 'mem',     'free -h / top\nMemory pressure\nor OOM kill?', 'navy')
    n(g, 'cpu',     'top / htop\nHigh CPU?\nD-state processes?', 'navy')
    n(g, 'fix',     'Apply fix\nRestart service\nVerify status', 'green')
    n(g, 'escalate','Escalate\nCollect evidence\nOpen incident', 'gold')

    e(g, 'start',   'status')
    e(g, 'status',  'journal',  'failed?')
    e(g, 'journal', 'port',     'network err?')
    e(g, 'port',    'disk',     'conn refused?')
    e(g, 'disk',    'mem',      'space OK?')
    e(g, 'mem',     'cpu',      'mem OK?')
    e(g, 'cpu',     'fix',      'cause found', '#22c55e')
    e(g, 'cpu',     'escalate', 'unknown', '#f59e0b', 'dashed')

    g.render(os.path.join(OUT, 'linux-troubleshooting-playbook'), cleanup=True)
    print('Generated: linux-troubleshooting-playbook')


# ─── linux-devops-roadmap ─────────────────────────────────────────────────────

def diag_devops_roadmap():
    g = base_graph('roadmap', 'Linux for DevOps — 10-Day Learning Roadmap', rankdir='LR')
    with g.subgraph(name='cluster_m1') as c:
        c.attr(label='Module 1 — Foundations', style='rounded,filled',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica-Bold',
               fontsize='11', fontcolor='#1e40af')
        n(c, 'd1', 'Day 1\nFilesystem\nhierarchy', 'navy')
        n(c, 'd2', 'Day 2\nEssential\ncommands', 'navy')
    with g.subgraph(name='cluster_m2') as c:
        c.attr(label='Module 2 — Users & Processes', style='rounded,filled',
               fillcolor='#f0fdfa', color='#14b8a6', fontname='Helvetica-Bold',
               fontsize='11', fontcolor='#115e59')
        n(c, 'd3', 'Day 3\nPermissions\n& ownership', 'teal')
        n(c, 'd4', 'Day 4\nUsers, groups\n& sudo', 'teal')
        n(c, 'd5', 'Day 5\nProcesses\n& systemd', 'teal')
    with g.subgraph(name='cluster_m3') as c:
        c.attr(label='Module 3 — System & Network', style='rounded,filled',
               fillcolor='#f0fdf4', color='#22c55e', fontname='Helvetica-Bold',
               fontsize='11', fontcolor='#166534')
        n(c, 'd6', 'Day 6\nPackage\nmanagement', 'green')
        n(c, 'd7', 'Day 7\nNetworking\n& SSH', 'green')
    with g.subgraph(name='cluster_m4') as c:
        c.attr(label='Module 4 — Automation & Security', style='rounded,filled',
               fillcolor='#fffbeb', color='#f59e0b', fontname='Helvetica-Bold',
               fontsize='11', fontcolor='#92400e')
        n(c, 'd8',  'Day 8\nBash\nscripting', 'gold')
        n(c, 'd9',  'Day 9\nText processing\n& log analysis', 'gold')
        n(c, 'd10', 'Day 10\nSecurity &\nhardening', 'red')

    e(g, 'd1', 'd2')
    e(g, 'd3', 'd4')
    e(g, 'd4', 'd5')
    e(g, 'd6', 'd7')
    e(g, 'd8', 'd9')
    e(g, 'd9', 'd10')
    e(g, 'd2', 'd3', 'next module')
    e(g, 'd5', 'd6', 'next module')
    e(g, 'd7', 'd8', 'next module')

    g.render(os.path.join(OUT, 'linux-devops-roadmap'), cleanup=True)
    print('Generated: linux-devops-roadmap')


if __name__ == '__main__':
    diag_filesystem_hierarchy()
    diag_permissions_model()
    diag_users_types()
    diag_package_families()
    diag_common_ports()
    diag_text_processing_chain()
    diag_security_hardening_layers()
    diag_troubleshooting_playbook()
    diag_devops_roadmap()
    print('All new linux diagrams generated.')
