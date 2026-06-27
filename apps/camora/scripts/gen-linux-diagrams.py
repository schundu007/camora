#!/usr/bin/env python3
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


# ─── linux-processes ──────────────────────────────────────────────────────────

def diag_process_lifecycle():
    g = base_graph('proc_lifecycle', 'Linux Process Lifecycle — States & Transitions', rankdir='LR')
    n(g, 'created',  'fork() / exec()\nProcess Created', 'navy')
    n(g, 'running',  'RUNNING (R)\nOn CPU or\nrun-queue', 'green')
    n(g, 'sleeping', 'SLEEPING (S)\nInterruptible\nwait for event', 'navy')
    n(g, 'dstate',   'DISK SLEEP (D)\nUninterruptible\nI/O wait', 'red')
    n(g, 'stopped',  'STOPPED (T)\nSIGSTOP /\ndebugger', 'gold')
    n(g, 'zombie',   'ZOMBIE (Z)\nExited, parent\nnot called wait()', 'red')
    n(g, 'reaped',   'Reaped\nPID released', 'gray')

    e(g, 'created',  'running',  'scheduler')
    e(g, 'running',  'sleeping', 'I/O request')
    e(g, 'sleeping', 'running',  'event arrives')
    e(g, 'running',  'dstate',   'disk I/O')
    e(g, 'dstate',   'running',  'I/O complete')
    e(g, 'running',  'stopped',  'SIGSTOP')
    e(g, 'stopped',  'running',  'SIGCONT')
    e(g, 'running',  'zombie',   'exit()')
    e(g, 'zombie',   'reaped',   'parent wait()')

    g.render(os.path.join(OUT, 'linux-processes-lifecycle'), cleanup=True)
    print('Generated: linux-processes-lifecycle')


def diag_process_tree():
    g = base_graph('proc_tree', 'Process Tree — fork/exec & PID Namespaces', rankdir='LR')
    n(g, 'init',    'PID 1\nsystemd\n(host namespace)', 'purple')
    n(g, 'sshd',    'sshd\nPID 42', 'navy')
    n(g, 'bash',    'bash\nPID 107', 'navy')
    n(g, 'cmd',     'ls (fork+exec)\nPID 108', 'green')
    n(g, 'ns',      'PID Namespace\n(container)', 'teal')
    n(g, 'cinit',   'PID 1 (in ns)\nactual PID 520', 'teal')
    n(g, 'cproc',   'app PID 2 (in ns)\nactual PID 521', 'teal')
    n(g, 'zombie',  'defunct [zombie]\nPID 109', 'red')

    e(g, 'init', 'sshd',   'fork+exec')
    e(g, 'sshd', 'bash',   'fork+exec')
    e(g, 'bash', 'cmd',    'fork+exec')
    e(g, 'bash', 'zombie', 'fork, no wait()')
    e(g, 'init', 'ns',     'clone(CLONE_NEWPID)')
    e(g, 'ns',   'cinit',  'PID 1 in ns')
    e(g, 'cinit','cproc',  'fork')

    g.render(os.path.join(OUT, 'linux-processes-tree'), cleanup=True)
    print('Generated: linux-processes-tree')


# ─── linux-signals ────────────────────────────────────────────────────────────

def diag_signal_delivery():
    g = base_graph('sig_delivery', 'Signal Delivery Flow — Pending → Mask → Handler', rankdir='LR')
    n(g, 'src',     'Signal Source\nkill() / kernel\n/ Ctrl+C', 'navy')
    n(g, 'pending', 'Pending Set\n(queued if blocked)', 'gold')
    n(g, 'mask',    'Signal Mask\n(sigprocmask)\nblocked signals', 'gray')
    n(g, 'check',   'Unblocked?\n(not in mask)', 'navy')
    n(g, 'handler', 'Custom Handler\nsigaction()', 'green')
    n(g, 'default', 'Default Action\n(term / core /\nignore / stop)', 'red')
    n(g, 'ignored', 'Ignored\n(SIG_IGN)', 'gray')

    e(g, 'src',     'pending',  'deliver')
    e(g, 'pending', 'mask',     'check')
    e(g, 'mask',    'check',    'unblock')
    e(g, 'check',   'handler',  'registered?', '#22c55e')
    e(g, 'check',   'default',  'no handler', '#ef4444')
    e(g, 'check',   'ignored',  'SIG_IGN', '#6b7280')

    g.render(os.path.join(OUT, 'linux-signals-delivery'), cleanup=True)
    print('Generated: linux-signals-delivery')


def diag_signal_cheatsheet():
    g = base_graph('sig_cheat', 'Key Signals — Number, Default Action & Catchable', rankdir='TB')
    n(g, 'term',  'SIGTERM (15)\nGraceful shutdown\nCatchable: YES', 'green')
    n(g, 'kill',  'SIGKILL (9)\nForce kill\nCatchable: NO', 'red')
    n(g, 'hup',   'SIGHUP (1)\nConfig reload\n(by convention)\nCatchable: YES', 'navy')
    n(g, 'int',   'SIGINT (2)\nCtrl+C\nCatchable: YES', 'gold')
    n(g, 'chld',  'SIGCHLD (17)\nChild state change\nparent notified\nCatchable: YES', 'teal')
    n(g, 'stop',  'SIGSTOP (19)\nPause process\nCatchable: NO', 'purple')
    n(g, 'cont',  'SIGCONT (18)\nResume stopped\nCatchable: YES', 'purple')
    n(g, 'usr',   'SIGUSR1/2 (10/12)\nUser-defined\nApp-specific use\nCatchable: YES', 'cyan')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('term')
        s.node('kill')
        s.node('hup')
        s.node('int')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('chld')
        s.node('stop')
        s.node('cont')
        s.node('usr')

    g.render(os.path.join(OUT, 'linux-signals-cheatsheet'), cleanup=True)
    print('Generated: linux-signals-cheatsheet')


# ─── linux-filesystem ─────────────────────────────────────────────────────────

def diag_vfs_stack():
    g = base_graph('vfs_stack', 'Linux VFS Stack — System Call to Block Device', rankdir='LR')
    n(g, 'app',      'User Application\nopen() read() write()', 'gray')
    n(g, 'syscall',  'System Call Interface\n(glibc → kernel entry)', 'navy')
    n(g, 'vfs',      'VFS (Virtual Filesystem)\nCommon dentry/inode/file\nabstraction layer', 'purple')
    n(g, 'ext4',     'ext4', 'navy')
    n(g, 'xfs',      'XFS', 'navy')
    n(g, 'tmpfs',    'tmpfs', 'teal')
    n(g, 'nfs',      'NFS client', 'gold')
    n(g, 'pc',       'Page Cache\n(buffer cache)', 'green')
    n(g, 'bio',      'Block I/O Layer\n(request queue, elevator)', 'navy')
    n(g, 'dev',      'Block Device Driver\n(NVMe / SATA / virtio)', 'gray')

    e(g, 'app',     'syscall')
    e(g, 'syscall', 'vfs')
    e(g, 'vfs',     'ext4')
    e(g, 'vfs',     'xfs')
    e(g, 'vfs',     'tmpfs')
    e(g, 'vfs',     'nfs')
    e(g, 'ext4',    'pc')
    e(g, 'xfs',     'pc')
    e(g, 'pc',      'bio')
    e(g, 'bio',     'dev')

    g.render(os.path.join(OUT, 'linux-filesystem-vfs'), cleanup=True)
    print('Generated: linux-filesystem-vfs')


def diag_inode_links():
    g = base_graph('inode_links', 'Inodes — Hard Links vs Soft Links', rankdir='LR')
    n(g, 'dh1',  'dir entry\n"original"', 'navy')
    n(g, 'dh2',  'dir entry\n"hardlink"\n(same inode!)', 'navy')
    n(g, 'inode','inode #1042\nnlink=2\nblocks ptr', 'purple')
    n(g, 'data', 'Data Blocks\n(actual content)', 'green')
    n(g, 'ds',   'dir entry\n"symlink"', 'gold')
    n(g, 'si',   'inode #1099\ntype=symlink\npoints to path', 'gold')
    n(g, 'target','inode #1042\n(resolved target)', 'green')

    e(g, 'dh1',  'inode', 'hard ref')
    e(g, 'dh2',  'inode', 'hard ref')
    e(g, 'inode','data',  'block ptr')
    e(g, 'ds',   'si',    'dir→inode')
    e(g, 'si',   'target','path resolve', '#f59e0b', 'dashed')
    e(g, 'target','data', 'block ptr')

    g.render(os.path.join(OUT, 'linux-filesystem-inodes'), cleanup=True)
    print('Generated: linux-filesystem-inodes')


# ─── bash-scripting ───────────────────────────────────────────────────────────

def diag_bash_script_anatomy():
    g = base_graph('bash_anatomy', 'Bash Script Anatomy — Structure & Best Practices', rankdir='LR')
    n(g, 'shebang', '#!/usr/bin/env bash\nShebang line — picks\nright bash from PATH', 'navy')
    n(g, 'opts',    'set -euo pipefail\n-e exit on error\n-u unset var = error\n-o pipefail pipe fails', 'red')
    n(g, 'vars',    'readonly CONST="val"\nVAR="${1:-default}"\nVariable declarations', 'gold')
    n(g, 'funcs',   'function name() {\n  local var=...\n  ...\n}\nFunctions w/ local vars', 'purple')
    n(g, 'main',    'main() logic\nArgument parsing\n[[ $# -lt 1 ]] checks', 'navy')
    n(g, 'cleanup', 'trap cleanup EXIT\nRemove temp files\nGraceful cleanup', 'green')
    n(g, 'exit',    'exit 0 / exit 1\nExplicit exit codes\nfor scripting callers', 'teal')

    e(g, 'shebang', 'opts')
    e(g, 'opts',    'vars')
    e(g, 'vars',    'funcs')
    e(g, 'funcs',   'main')
    e(g, 'main',    'cleanup')
    e(g, 'cleanup', 'exit')

    g.render(os.path.join(OUT, 'bash-scripting-anatomy'), cleanup=True)
    print('Generated: bash-scripting-anatomy')


def diag_bash_control_flow():
    g = base_graph('bash_flow', 'Bash Control Flow — Conditionals, Loops & Functions', rankdir='TB')
    n(g, 'if',    'if [[ cond ]]\nthen ... elif\nelse ... fi', 'navy')
    n(g, 'case',  'case "$var" in\n  pat1) ;;\n  pat2) ;;\nesac', 'navy')
    n(g, 'for',   'for item in list\nfor ((i=0;i<n;i++))\ndo ... done', 'green')
    n(g, 'while', 'while [[ cond ]]\nread -r line\ndo ... done', 'green')
    n(g, 'until', 'until [[ cond ]]\ndo ... done\n(opposite of while)', 'teal')
    n(g, 'func',  'myfunc() {\n  local x="$1"\n  return 0\n}', 'purple')
    n(g, 'arr',   'arr=(a b c)\narr+=(d)\n${arr[@]}\n${#arr[@]}', 'gold')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('if'); s.node('case'); s.node('for'); s.node('while'); s.node('until')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('func'); s.node('arr')

    e(g, 'if',    'func', 'call')
    e(g, 'case',  'func', 'call')
    e(g, 'for',   'arr',  'iterate')
    e(g, 'while', 'arr',  'iterate')
    e(g, 'until', 'arr',  'iterate')

    g.render(os.path.join(OUT, 'bash-scripting-control-flow'), cleanup=True)
    print('Generated: bash-scripting-control-flow')


# ─── bash-pipes-redirection ───────────────────────────────────────────────────

def diag_pipes_fds():
    g = base_graph('pipes_fds', 'Bash Pipes & File Descriptors — stdin/stdout/stderr', rankdir='LR')
    n(g, 'cmd1',   'cmd1\n(producer)', 'navy')
    n(g, 'pipe',   'Kernel pipe\nbuffer (64KB)\nanonymous', 'purple')
    n(g, 'cmd2',   'cmd2\n(consumer)\nreads stdin', 'navy')
    n(g, 'stdout', 'stdout (fd 1)\ndefault: terminal', 'green')
    n(g, 'stderr', 'stderr (fd 2)\ndefault: terminal', 'red')
    n(g, 'file',   'File / /dev/null\n(redirect target)', 'gray')
    n(g, 'devnull','2>/dev/null\nDiscard stderr', 'gray')
    n(g, 'merge',  '2>&1\nMerge stderr\ninto stdout', 'gold')

    e(g, 'cmd1',  'pipe',   'write fd 1')
    e(g, 'pipe',  'cmd2',   'read fd 0')
    e(g, 'cmd2',  'stdout', 'fd 1')
    e(g, 'cmd2',  'stderr', 'fd 2')
    e(g, 'stdout','file',   '> file')
    e(g, 'stderr','devnull','2>/dev/null')
    e(g, 'stderr','merge',  '2>&1')
    e(g, 'merge', 'stdout', 'combined')

    g.render(os.path.join(OUT, 'bash-pipes-redirection-fds'), cleanup=True)
    print('Generated: bash-pipes-redirection-fds')


def diag_pipes_chain():
    g = base_graph('pipes_chain', 'Pipeline Chain — grep | sort | uniq | awk', rankdir='LR')
    n(g, 'src',   'Input\n/var/log/syslog\nor stdin', 'gray')
    n(g, 'grep',  'grep "ERROR"\nFilter lines\nmatching pattern', 'navy')
    n(g, 'sort',  'sort -k1,1\nSort by field\n(stable, locale)', 'navy')
    n(g, 'uniq',  'uniq -c\nCount duplicates\n(needs sorted input)', 'navy')
    n(g, 'awk',   'awk \'{print $2,$1}\'\nField extract /\nreformat output', 'navy')
    n(g, 'out',   'stdout or\n> output.txt', 'green')
    n(g, 'fail',  'pipefail:\nany stage fails\n→ whole pipe fails', 'red')

    e(g, 'src',  'grep')
    e(g, 'grep', 'sort')
    e(g, 'sort', 'uniq')
    e(g, 'uniq', 'awk')
    e(g, 'awk',  'out')
    e(g, 'fail', 'grep', 'set -o pipefail', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'bash-pipes-redirection-chain'), cleanup=True)
    print('Generated: bash-pipes-redirection-chain')


# ─── linux-networking-tools ───────────────────────────────────────────────────

def diag_net_tools_map():
    g = base_graph('net_tools', 'Linux Networking Tools — Use Case Map', rankdir='TB')
    n(g, 'conn',   'Connection\nDiagnosis', 'navy')
    n(g, 'ss',     'ss -tlnp\nSocket state\n(replaces netstat)', 'green')
    n(g, 'nc',     'nc / ncat\nTest TCP/UDP\nconnectivity', 'green')
    n(g, 'traffic','Traffic\nAnalysis', 'navy')
    n(g, 'tcp',    'tcpdump -i eth0\nPacket capture\n+ BPF filter', 'teal')
    n(g, 'tshark', 'tshark / wireshark\nProtocol decode\nGUI analysis', 'teal')
    n(g, 'dns',    'DNS &\nRouting', 'navy')
    n(g, 'dig',    'dig +short A @8.8.8.8\nDNS query\ndetailed output', 'purple')
    n(g, 'ip',     'ip route show\nip addr / ip link\n(replaces route/ifconfig)', 'purple')
    n(g, 'perf',   'Performance\nBaseline', 'navy')
    n(g, 'iperf',  'iperf3 -s / -c\nBandwidth\nbenchmark', 'gold')
    n(g, 'mtr',    'mtr --report\nTraceroute +\npacket loss %', 'gold')

    e(g, 'conn',    'ss')
    e(g, 'conn',    'nc')
    e(g, 'traffic', 'tcp')
    e(g, 'traffic', 'tshark')
    e(g, 'dns',     'dig')
    e(g, 'dns',     'ip')
    e(g, 'perf',    'iperf')
    e(g, 'perf',    'mtr')

    g.render(os.path.join(OUT, 'linux-networking-tools-map'), cleanup=True)
    print('Generated: linux-networking-tools-map')


# ─── linux-iptables ───────────────────────────────────────────────────────────

def diag_iptables_flow():
    g = base_graph('iptables_flow', 'iptables Packet Flow — Tables & Chains', rankdir='LR')
    n(g, 'wire',    'Network\nInterface\n(packet arrives)', 'gray')
    n(g, 'raw_pre', 'RAW\nPREROUTING\n(conntrack skip)', 'purple')
    n(g, 'nat_pre', 'NAT\nPREROUTING\n(DNAT / port fwd)', 'gold')
    n(g, 'route1',  'Routing\nDecision', 'navy')
    n(g, 'local',   'Local\nProcess', 'green')
    n(g, 'input',   'FILTER\nINPUT\n(firewall in)', 'red')
    n(g, 'forward', 'FILTER\nFORWARD\n(router mode)', 'red')
    n(g, 'output',  'FILTER\nOUTPUT\n(local out)', 'red')
    n(g, 'nat_post','NAT\nPOSTROUTING\n(SNAT / masq)', 'gold')
    n(g, 'egress',  'Egress\nInterface', 'gray')

    e(g, 'wire',    'raw_pre')
    e(g, 'raw_pre', 'nat_pre')
    e(g, 'nat_pre', 'route1')
    e(g, 'route1',  'input',   'for local')
    e(g, 'route1',  'forward', 'forward')
    e(g, 'input',   'local')
    e(g, 'local',   'output')
    e(g, 'output',  'nat_post')
    e(g, 'forward', 'nat_post')
    e(g, 'nat_post','egress')

    g.render(os.path.join(OUT, 'linux-iptables-flow'), cleanup=True)
    print('Generated: linux-iptables-flow')


def diag_iptables_rules():
    g = base_graph('iptables_rules', 'iptables Rule Anatomy & Common Patterns', rankdir='TB')
    n(g, 'rule',    'Rule Structure:\niptables -t TABLE -A CHAIN\n  -p PROTO --dport PORT\n  -j TARGET', 'navy')
    n(g, 'accept',  'TARGET: ACCEPT\nAllow the packet', 'green')
    n(g, 'drop',    'TARGET: DROP\nSilently discard\n(no RST/ICMP)', 'red')
    n(g, 'reject',  'TARGET: REJECT\nDiscard + send\nICMP unreachable', 'red')
    n(g, 'masq',    'TARGET: MASQUERADE\nSNAT to egress IP\n(dynamic NAT)', 'gold')
    n(g, 'log',     'TARGET: LOG\nLog + continue\n(not terminal)', 'teal')
    n(g, 'state',   '-m state\n--state NEW,\nESTABLISHED,\nRELATED', 'purple')

    e(g, 'rule', 'accept')
    e(g, 'rule', 'drop')
    e(g, 'rule', 'reject')
    e(g, 'rule', 'masq')
    e(g, 'rule', 'log')
    e(g, 'rule', 'state', 'match module')

    g.render(os.path.join(OUT, 'linux-iptables-rules'), cleanup=True)
    print('Generated: linux-iptables-rules')


# ─── linux-memory-management ──────────────────────────────────────────────────

def diag_memory_layout():
    g = base_graph('mem_layout', 'Linux Process Memory Layout — Virtual Address Space', rankdir='LR')
    n(g, 'stack',   'Stack\n(grows down)\nlocal vars, frames', 'navy')
    n(g, 'mmap',    'mmap region\nshared libs (.so)\nfile mappings', 'purple')
    n(g, 'heap',    'Heap\n(grows up)\nmalloc / new', 'gold')
    n(g, 'bss',     'BSS segment\nuninit globals\n(zeroed at start)', 'teal')
    n(g, 'data',    'Data segment\ninit globals\nstatic vars', 'teal')
    n(g, 'text',    'Text (code)\nread-only\nexecutable', 'green')
    n(g, 'vdso',    'vDSO / vsyscall\nKernel-mapped page\n(fast syscalls)', 'gray')
    n(g, 'oom',     'OOM Killer\nbadness score\nevicts highest', 'red')

    e(g, 'stack', 'mmap',  'below stack')
    e(g, 'mmap',  'heap',  'above heap')
    e(g, 'heap',  'bss',   'above BSS')
    e(g, 'bss',   'data')
    e(g, 'data',  'text')
    e(g, 'text',  'vdso',  'kernel page')
    e(g, 'heap',  'oom',   'if exhausted', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'linux-memory-management-layout'), cleanup=True)
    print('Generated: linux-memory-management-layout')


def diag_memory_reclaim():
    g = base_graph('mem_reclaim', 'Memory Reclaim — Page Cache, Swap & OOM', rankdir='LR')
    n(g, 'free',    'Free Pages\n(immediately\navailable)', 'green')
    n(g, 'pcache',  'Page Cache\n(reclaimable)\nfile data buffers', 'teal')
    n(g, 'anon',    'Anonymous Pages\nheap/stack\n(not file-backed)', 'navy')
    n(g, 'kswapd',  'kswapd\n(background reclaim)\nruns near watermark', 'purple')
    n(g, 'swap',    'Swap\n(disk-backed)\nhigh latency', 'gold')
    n(g, 'oom',     'OOM Killer\nbadness score\nkills process', 'red')
    n(g, 'evict',   'Page Eviction\nLRU active/\ninactive lists', 'navy')

    e(g, 'free',   'pcache',  'allocate')
    e(g, 'pcache', 'kswapd',  'reclaim first')
    e(g, 'anon',   'kswapd',  'reclaim')
    e(g, 'kswapd', 'evict',   'LRU evict')
    e(g, 'evict',  'swap',    'if vm.swappiness > 0')
    e(g, 'kswapd', 'oom',     'if no reclaimable', '#ef4444', 'dashed')
    e(g, 'swap',   'free',    'page in', '#22c55e', 'dashed')

    g.render(os.path.join(OUT, 'linux-memory-management-reclaim'), cleanup=True)
    print('Generated: linux-memory-management-reclaim')


# ─── linux-lvm ────────────────────────────────────────────────────────────────

def diag_lvm_layers():
    g = base_graph('lvm_layers', 'LVM Architecture — PV → VG → LV → Filesystem', rankdir='LR')
    n(g, 'pv1',  'Physical Volume\n/dev/sda\n(PV)', 'gray')
    n(g, 'pv2',  'Physical Volume\n/dev/sdb\n(PV)', 'gray')
    n(g, 'pv3',  'Physical Volume\n/dev/sdc\n(PV)', 'gray')
    n(g, 'vg',   'Volume Group\nvg_data\n(pool of PEs)', 'navy')
    n(g, 'lv1',  'Logical Volume\nlv_home\n(e.g. 100 GB)', 'purple')
    n(g, 'lv2',  'Logical Volume\nlv_var\n(e.g. 200 GB)', 'purple')
    n(g, 'lv3',  'LV Snapshot\nlv_home_snap\n(CoW)', 'gold')
    n(g, 'fs1',  'ext4 / XFS\nmkfs + mount', 'green')
    n(g, 'fs2',  'ext4 / XFS\nmkfs + mount', 'green')

    e(g, 'pv1', 'vg', 'pvcreate\n+ vgextend')
    e(g, 'pv2', 'vg')
    e(g, 'pv3', 'vg')
    e(g, 'vg',  'lv1', 'lvcreate -L')
    e(g, 'vg',  'lv2', 'lvcreate -L')
    e(g, 'lv1', 'lv3', 'lvcreate --snapshot')
    e(g, 'lv1', 'fs1', 'mkfs + mount')
    e(g, 'lv2', 'fs2', 'mkfs + mount')

    g.render(os.path.join(OUT, 'linux-lvm-layers'), cleanup=True)
    print('Generated: linux-lvm-layers')


def diag_lvm_resize():
    g = base_graph('lvm_resize', 'LVM Online Resize — Extend LV & Filesystem', rankdir='LR')
    n(g, 'add',    'Add new disk\npvcreate /dev/sdd', 'green')
    n(g, 'vgext',  'vgextend vg_data\n/dev/sdd\n(VG grows)', 'navy')
    n(g, 'lvext',  'lvextend -L +50G\n/dev/vg_data/lv_home\n(LV grows)', 'navy')
    n(g, 'fsext',  'resize2fs (ext4)\nor xfs_growfs (XFS)\n(online, no unmount)', 'green')
    n(g, 'snap',   'Take snapshot first\nlvcreate --snapshot\n(safety net)', 'gold')
    n(g, 'verify', 'df -h\nlvdisplay\nvgdisplay', 'teal')

    e(g, 'add',   'vgext')
    e(g, 'vgext', 'lvext')
    e(g, 'snap',  'lvext', 'before extend', '#f59e0b', 'dashed')
    e(g, 'lvext', 'fsext')
    e(g, 'fsext', 'verify')

    g.render(os.path.join(OUT, 'linux-lvm-resize'), cleanup=True)
    print('Generated: linux-lvm-resize')


# ─── linux-ssh-hardening ──────────────────────────────────────────────────────

def diag_ssh_auth_flow():
    g = base_graph('ssh_auth', 'SSH Authentication Flow — Key Exchange & Auth', rankdir='LR')
    n(g, 'client',  'SSH Client\n(user machine)', 'navy')
    n(g, 'tcp',     'TCP :22\nconnect', 'gray')
    n(g, 'kex',     'Key Exchange\n(ECDH / DH)\nSession key', 'purple')
    n(g, 'hostkey', 'Host Key\nVerification\n(known_hosts)', 'gold')
    n(g, 'auth',    'User Auth\npubkey or\npassword', 'navy')
    n(g, 'pubkey',  'Pubkey Auth\n1. Server sends challenge\n2. Client signs w/ privkey\n3. Server verifies pubkey', 'green')
    n(g, 'shell',   'Shell /\nCommand exec', 'green')
    n(g, 'tofu',    'TOFU warning\nHost key changed!\n(MITM risk)', 'red')

    e(g, 'client',  'tcp')
    e(g, 'tcp',     'kex')
    e(g, 'kex',     'hostkey')
    e(g, 'hostkey', 'auth',    'known_hosts OK', '#22c55e')
    e(g, 'hostkey', 'tofu',    'key mismatch', '#ef4444')
    e(g, 'auth',    'pubkey',  'pubkey method')
    e(g, 'pubkey',  'shell',   'auth OK')

    g.render(os.path.join(OUT, 'linux-ssh-hardening-auth'), cleanup=True)
    print('Generated: linux-ssh-hardening-auth')


def diag_ssh_hardening_config():
    g = base_graph('ssh_harden', 'sshd Hardening — Key Settings & Defense in Depth', rankdir='TB')
    n(g, 'deny',   'Disable password\nPasswordAuthentication no\nChallengeResponseAuth no', 'red')
    n(g, 'root',   'PermitRootLogin no\nor prohibit-password\nNo direct root SSH', 'red')
    n(g, 'algo',   'Restrict algorithms\nKexAlgorithms curve25519\nHostKeyAlgorithms ed25519', 'purple')
    n(g, 'port',   'Port 2222\n(non-default)\nAllowUsers ops@10.0.0.0/8', 'navy')
    n(g, 'idle',   'ClientAliveInterval 300\nClientAliveCountMax 2\nDrop idle sessions', 'gold')
    n(g, 'fail',   'fail2ban\nBan after N fails\niptables auto-block', 'teal')
    n(g, 'mfa',    '2FA (optional)\nlibpam-google-auth\nTOTP challenge', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('deny')
        s.node('root')
        s.node('algo')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('port')
        s.node('idle')
        s.node('fail')
        s.node('mfa')

    g.render(os.path.join(OUT, 'linux-ssh-hardening-config'), cleanup=True)
    print('Generated: linux-ssh-hardening-config')


# ─── systemd-units ────────────────────────────────────────────────────────────

def diag_systemd_unit_lifecycle():
    g = base_graph('sd_unit', 'systemd Unit Lifecycle — States & Transitions', rankdir='LR')
    n(g, 'inactive', 'inactive\n(not running)', 'gray')
    n(g, 'activating','activating\n(ExecStartPre\nrunning)', 'gold')
    n(g, 'active',   'active\n(running /\nlistening)', 'green')
    n(g, 'deact',    'deactivating\n(ExecStop\nrunning)', 'gold')
    n(g, 'failed',   'failed\n(non-zero exit\nor timeout)', 'red')
    n(g, 'reload',   'reloading\n(SIGHUP /\nExecReload)', 'teal')

    e(g, 'inactive',   'activating',  'systemctl start')
    e(g, 'activating', 'active',      'ExecStart OK')
    e(g, 'activating', 'failed',      'ExecStart fails')
    e(g, 'active',     'deact',       'systemctl stop')
    e(g, 'active',     'failed',      'process crash')
    e(g, 'active',     'reload',      'systemctl reload')
    e(g, 'reload',     'active',      'reload done')
    e(g, 'deact',      'inactive',    'ExecStop done')
    e(g, 'failed',     'inactive',    'systemctl reset-failed')

    g.render(os.path.join(OUT, 'systemd-units-lifecycle'), cleanup=True)
    print('Generated: systemd-units-lifecycle')


def diag_systemd_unit_file():
    g = base_graph('sd_unit_file', 'systemd Unit File — [Unit] [Service] [Install] Sections', rankdir='LR')
    n(g, 'unit',    '[Unit]\nDescription=\nAfter=network.target\nRequires=postgresql.service', 'navy')
    n(g, 'svc',     '[Service]\nType=simple|forking|notify\nExecStart=/usr/bin/myapp\nRestart=on-failure\nRestartSec=5s', 'purple')
    n(g, 'env',     'Environment=\nEnvironmentFile=-/etc/myapp.env\nUser=myuser Group=mygroup', 'teal')
    n(g, 'sec',     'Security hardening:\nPrivateTmp=yes\nNoNewPrivileges=yes\nProtectSystem=strict', 'red')
    n(g, 'install', '[Install]\nWantedBy=multi-user.target\n(enables at boot)', 'green')

    e(g, 'unit',    'svc')
    e(g, 'svc',     'env',     'env config')
    e(g, 'svc',     'sec',     'sandbox')
    e(g, 'sec',     'install')

    g.render(os.path.join(OUT, 'systemd-units-file'), cleanup=True)
    print('Generated: systemd-units-file')


# ─── systemd-cgroups ──────────────────────────────────────────────────────────

def diag_cgroup_hierarchy():
    g = base_graph('cgroup_hier', 'cgroups v2 Hierarchy — systemd Slice → Unit → Process', rankdir='TB')
    n(g, 'root',    'cgroup root\n/sys/fs/cgroup/', 'navy')
    n(g, 'sys',     'system.slice\nsystem services', 'navy')
    n(g, 'user',    'user.slice\nlogin sessions', 'navy')
    n(g, 'mach',    'machine.slice\nVMs / containers', 'navy')
    n(g, 'svc1',    'nginx.service\nCPU: 20%\nMem: 512MB', 'green')
    n(g, 'svc2',    'mysql.service\nCPU: 40%\nMem: 2GB', 'green')
    n(g, 'usersvc', 'user@1000.service\nsession scope', 'teal')
    n(g, 'docker',  'docker.service\ncontainer cgroups\nnested', 'purple')

    e(g, 'root',  'sys')
    e(g, 'root',  'user')
    e(g, 'root',  'mach')
    e(g, 'sys',   'svc1')
    e(g, 'sys',   'svc2')
    e(g, 'user',  'usersvc')
    e(g, 'mach',  'docker')

    g.render(os.path.join(OUT, 'systemd-cgroups-hierarchy'), cleanup=True)
    print('Generated: systemd-cgroups-hierarchy')


def diag_cgroup_controllers():
    g = base_graph('cgroup_ctrl', 'cgroup v2 Controllers — Resource Limits & Accounting', rankdir='LR')
    n(g, 'scope',   'cgroup scope\n(service or slice)', 'navy')
    n(g, 'cpu',     'cpu controller\nCPUWeight=100\nCPUQuota=50%\nCPUShares', 'gold')
    n(g, 'mem',     'memory controller\nMemoryMax=512M\nMemoryHigh=400M\n(soft limit)', 'red')
    n(g, 'io',      'io controller\nIOWeight=100\nIOReadBandwidthMax\nIOWriteBandwidthMax', 'teal')
    n(g, 'pids',    'pids controller\nTasksMax=512\nPrevents fork bombs', 'purple')
    n(g, 'net',     'net_cls (v1 only)\nmark packets\nfor tc/iptables', 'gray')
    n(g, 'oom',     'OOM handling\nmemory.oom.group\nkill whole cgroup', 'red')

    e(g, 'scope', 'cpu')
    e(g, 'scope', 'mem')
    e(g, 'scope', 'io')
    e(g, 'scope', 'pids')
    e(g, 'scope', 'net')
    e(g, 'mem',   'oom', 'at MemoryMax')

    g.render(os.path.join(OUT, 'systemd-cgroups-controllers'), cleanup=True)
    print('Generated: systemd-cgroups-controllers')


if __name__ == '__main__':
    diag_process_lifecycle()
    diag_process_tree()
    diag_signal_delivery()
    diag_signal_cheatsheet()
    diag_vfs_stack()
    diag_inode_links()
    diag_bash_script_anatomy()
    diag_bash_control_flow()
    diag_pipes_fds()
    diag_pipes_chain()
    diag_net_tools_map()
    diag_iptables_flow()
    diag_iptables_rules()
    diag_memory_layout()
    diag_memory_reclaim()
    diag_lvm_layers()
    diag_lvm_resize()
    diag_ssh_auth_flow()
    diag_ssh_hardening_config()
    diag_systemd_unit_lifecycle()
    diag_systemd_unit_file()
    diag_cgroup_hierarchy()
    diag_cgroup_controllers()
    print('All linux diagrams generated.')
