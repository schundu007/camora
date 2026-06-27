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


# ─── linux-disk-management ────────────────────────────────────────────────────

def diag_disk_partition_table():
    g = base_graph('disk_partition', 'MBR vs GPT Partition Table Layout', rankdir='TB')
    with g.subgraph(name='cluster_mbr') as s:
        s.attr(label='MBR (Master Boot Record)', style='filled', fillcolor='#f0f9ff', color='#3b82f6')
        n(s, 'mbr_bs', 'Boot Sector\n446 bytes', 'navy')
        n(s, 'mbr_pt', 'Partition Table\n64 bytes (4 entries)', 'navy')
        n(s, 'mbr_sig', 'Magic Signature\n0x55AA', 'gray')
        n(s, 'mbr_p1', 'Primary /boot', 'green')
        n(s, 'mbr_p2', 'Primary /root', 'green')
        n(s, 'mbr_ext', 'Extended\n(logical partitions)', 'gold')
    with g.subgraph(name='cluster_gpt') as s:
        s.attr(label='GPT (GUID Partition Table)', style='filled', fillcolor='#f0fdf4', color='#22c55e')
        n(s, 'gpt_pmbr', 'Protective MBR', 'gray')
        n(s, 'gpt_hdr', 'GPT Header\n(primary)', 'purple')
        n(s, 'gpt_ent', 'Partition Entries\n128 entries × 128 bytes', 'purple')
        n(s, 'gpt_data', 'Data Partitions\n(up to 128)', 'green')
        n(s, 'gpt_bkup', 'Backup GPT Header\n(at disk end)', 'teal')
    e(g, 'mbr_bs', 'mbr_pt', '')
    e(g, 'mbr_pt', 'mbr_p1', '')
    e(g, 'mbr_pt', 'mbr_p2', '')
    e(g, 'mbr_pt', 'mbr_ext', '')
    e(g, 'gpt_pmbr', 'gpt_hdr', '')
    e(g, 'gpt_hdr', 'gpt_ent', '')
    e(g, 'gpt_ent', 'gpt_data', '')
    e(g, 'gpt_data', 'gpt_bkup', 'backup')
    g.render(os.path.join(OUT, 'linux-disk-partition-table'), cleanup=True)
    print('Generated: linux-disk-partition-table')


def diag_disk_tools():
    g = base_graph('disk_tools', 'Disk Management Tool Workflow', rankdir='LR')
    n(g, 'lsblk', 'lsblk\nList block devices\ntree view', 'navy')
    n(g, 'fdisk', 'fdisk\nMBR partitioning\ninteractive', 'gold')
    n(g, 'parted', 'parted / gdisk\nGPT partitioning\nscriptable', 'gold')
    n(g, 'mkfs', 'mkfs.ext4\nmkfs.xfs\nFormat partition', 'green')
    n(g, 'mount', 'mount\nAttach to tree\n/mnt/data', 'teal')
    n(g, 'df', 'df -h\nDisk usage\n% used', 'cyan')
    n(g, 'du', 'du -sh *\nDirectory size\nfind hogs', 'cyan')
    n(g, 'fsck', 'fsck\nFilesystem check\n& repair', 'red')
    e(g, 'lsblk', 'fdisk', 'MBR disk')
    e(g, 'lsblk', 'parted', 'GPT disk')
    e(g, 'fdisk', 'mkfs', 'create partition')
    e(g, 'parted', 'mkfs', 'create partition')
    e(g, 'mkfs', 'mount', 'format done')
    e(g, 'mount', 'df', 'verify space')
    e(g, 'mount', 'du', 'find usage')
    e(g, 'mount', 'fsck', 'unmount first')
    g.render(os.path.join(OUT, 'linux-disk-tools-workflow'), cleanup=True)
    print('Generated: linux-disk-tools-workflow')


# ─── linux-raid ───────────────────────────────────────────────────────────────

def diag_raid_levels():
    g = base_graph('raid_levels', 'RAID Levels — Redundancy vs Performance', rankdir='TB')
    n(g, 'r0', 'RAID 0 — Striping\nDisks: 2+\nRedundancy: NONE\nRead/Write: Fast\nUsable: 100%', 'red')
    n(g, 'r1', 'RAID 1 — Mirroring\nDisks: 2+\nRedundancy: 1 disk fail\nRead: Fast, Write: Same\nUsable: 50%', 'green')
    n(g, 'r5', 'RAID 5 — Striping+Parity\nDisks: 3+\nRedundancy: 1 disk fail\nRead: Fast, Write: Overhead\nUsable: (N-1)/N', 'navy')
    n(g, 'r6', 'RAID 6 — Double Parity\nDisks: 4+\nRedundancy: 2 disk fail\nRead: Fast, Write: More overhead\nUsable: (N-2)/N', 'purple')
    n(g, 'r10', 'RAID 10 — Mirror+Stripe\nDisks: 4+\nRedundancy: 1 per mirror\nRead/Write: Best\nUsable: 50%', 'teal')
    n(g, 'choose', 'Choose based on:\nRedundancy need\nWrite performance\nCost per GB', 'gold')
    e(g, 'choose', 'r0', 'speed only')
    e(g, 'choose', 'r1', '2 disks, simple')
    e(g, 'choose', 'r5', 'balanced')
    e(g, 'choose', 'r6', 'high safety')
    e(g, 'choose', 'r10', 'DB workload')
    g.render(os.path.join(OUT, 'linux-raid-levels'), cleanup=True)
    print('Generated: linux-raid-levels')


def diag_mdadm_states():
    g = base_graph('mdadm_states', 'mdadm RAID State Machine', rankdir='LR')
    n(g, 'create', 'mdadm --create\n/dev/md0', 'navy')
    n(g, 'clean', 'clean\nAll in-sync', 'green')
    n(g, 'active', 'active\nI/O in progress', 'green')
    n(g, 'degraded', 'degraded\nMissing member', 'gold')
    n(g, 'resyncing', 'resyncing\nRebuild in progress', 'teal')
    n(g, 'failed', 'failed\nToo many missing', 'red')
    n(g, 'add', 'mdadm --add\nHot spare / new disk', 'navy')
    e(g, 'create', 'resyncing', 'initial sync')
    e(g, 'resyncing', 'clean', 'sync complete')
    e(g, 'clean', 'active', 'I/O starts')
    e(g, 'active', 'clean', 'I/O idle')
    e(g, 'active', 'degraded', 'disk fails')
    e(g, 'degraded', 'resyncing', 'spare added')
    e(g, 'degraded', 'failed', 'another disk fails')
    e(g, 'add', 'degraded', '--add spare')
    g.render(os.path.join(OUT, 'linux-raid-mdadm-states'), cleanup=True)
    print('Generated: linux-raid-mdadm-states')


# ─── linux-mount-fstab ────────────────────────────────────────────────────────

def diag_fstab_fields():
    g = base_graph('fstab_fields', '/etc/fstab Fields Anatomy', rankdir='TB')
    n(g, 'line', 'UUID=abc123 /mnt/data ext4 defaults,noatime 0 2', 'gray')
    n(g, 'dev', 'Field 1: Device\nUUID=... / LABEL=...\n/dev/sda1', 'navy')
    n(g, 'mnt', 'Field 2: Mount Point\n/mnt/data\n/ or /boot etc.', 'navy')
    n(g, 'fs', 'Field 3: Filesystem\next4 / xfs / vfat\nbtrfs / nfs / tmpfs', 'green')
    n(g, 'opts', 'Field 4: Options\ndefaults = rw,suid,dev,\nexec,auto,nouser,async\nnoatime saves writes', 'teal')
    n(g, 'dump', 'Field 5: Dump (backup)\n0 = skip\n1 = dump eligible', 'gold')
    n(g, 'pass', 'Field 6: fsck pass\n0 = skip\n1 = root first\n2 = other', 'gold')
    e(g, 'line', 'dev', '')
    e(g, 'line', 'mnt', '')
    e(g, 'line', 'fs', '')
    e(g, 'line', 'opts', '')
    e(g, 'line', 'dump', '')
    e(g, 'line', 'pass', '')
    g.render(os.path.join(OUT, 'linux-mount-fstab-fields'), cleanup=True)
    print('Generated: linux-mount-fstab-fields')


def diag_mount_namespace():
    g = base_graph('mount_ns', 'Mount Namespace Layers', rankdir='TB')
    n(g, 'kernel', 'Linux VFS Layer\n(Virtual File System)', 'purple')
    n(g, 'rootns', 'Root Mount Namespace\n/ (host filesystem)', 'navy')
    n(g, 'proc', '/proc\n(virtual kernel state)', 'teal')
    n(g, 'sys', '/sys\n(device/driver tree)', 'teal')
    n(g, 'dev', '/dev\n(device nodes)', 'teal')
    n(g, 'tmpfs', 'tmpfs\n(/tmp, /run)\nin RAM', 'cyan')
    n(g, 'bind', 'Bind Mount\n--bind src dst\nshare dir into container', 'green')
    n(g, 'cns', 'Container Mount Namespace\nclone(CLONE_NEWNS)', 'gold')
    e(g, 'kernel', 'rootns', 'host ns')
    e(g, 'rootns', 'proc', 'automount')
    e(g, 'rootns', 'sys', 'automount')
    e(g, 'rootns', 'dev', 'automount')
    e(g, 'rootns', 'tmpfs', 'mount -t tmpfs')
    e(g, 'rootns', 'bind', 'mount --bind')
    e(g, 'kernel', 'cns', 'unshare --mount')
    e(g, 'bind', 'cns', 'shared into container')
    g.render(os.path.join(OUT, 'linux-mount-namespace-layers'), cleanup=True)
    print('Generated: linux-mount-namespace-layers')


# ─── linux-inodes ─────────────────────────────────────────────────────────────

def diag_inode_structure():
    g = base_graph('inode_struct', 'Inode Structure & Data Block Pointers', rankdir='TB')
    n(g, 'inode', 'Inode (metadata only)\nUID/GID | permissions\nsize | timestamps\natime/mtime/ctime\nlink count', 'purple')
    n(g, 'direct', '12 Direct Block Pointers\n→ 12 × 4KB = 48 KB', 'navy')
    n(g, 'single', 'Single Indirect\n→ 1 × (1024 ptrs × 4KB) = 4 MB', 'green')
    n(g, 'double', 'Double Indirect\n→ 1 × 1024 × 1024 × 4KB = 4 GB', 'teal')
    n(g, 'triple', 'Triple Indirect\n(ext4 rarely used)', 'gray')
    n(g, 'data', 'Data Blocks\n(actual file content)', 'gold')
    e(g, 'inode', 'direct', '')
    e(g, 'inode', 'single', '')
    e(g, 'inode', 'double', '')
    e(g, 'inode', 'triple', '')
    e(g, 'direct', 'data', '')
    e(g, 'single', 'data', 'via ptr block')
    g.render(os.path.join(OUT, 'linux-inodes-structure'), cleanup=True)
    print('Generated: linux-inodes-structure')


def diag_hard_soft_links():
    g = base_graph('links', 'Hard Links vs Soft (Symbolic) Links', rankdir='LR')
    n(g, 'file_a', 'filename: report.txt\n(directory entry)', 'navy')
    n(g, 'hard_b', 'Hard link: backup.txt\n(same inode number)', 'green')
    n(g, 'inode', 'Inode #1042\nlink count: 2\nUID, perms, size\nblock pointers', 'purple')
    n(g, 'data', 'Data Blocks\n(actual content)', 'gold')
    n(g, 'sym', 'Symlink: link.txt\n(separate inode)\nstores path string\n"../report.txt"', 'teal')
    n(g, 'target', 'Resolves to:\nreport.txt inode', 'navy')
    e(g, 'file_a', 'inode', 'points to')
    e(g, 'hard_b', 'inode', 'same inode')
    e(g, 'inode', 'data', 'block ptrs')
    e(g, 'sym', 'target', 'path lookup', color='#f59e0b', style='dashed')
    e(g, 'target', 'inode', 'resolves')
    g.render(os.path.join(OUT, 'linux-inodes-links'), cleanup=True)
    print('Generated: linux-inodes-links')


# ─── linux-ext4-xfs ───────────────────────────────────────────────────────────

def diag_ext4_journal():
    g = base_graph('ext4_journal', 'ext4 Journal (JBD2) Write Flow', rankdir='LR')
    n(g, 'app', 'Application\nwrite() syscall', 'navy')
    n(g, 'pagecache', 'Page Cache\n(dirty pages)', 'cyan')
    n(g, 'jstart', 'Journal Start\n(transaction begin)', 'gold')
    n(g, 'jdata', 'Journal Block\n(metadata + optional data)', 'gold')
    n(g, 'jcommit', 'Journal Commit\n(fsync barrier)', 'green')
    n(g, 'checkpoint', 'Checkpoint\nWrite to main FS', 'teal')
    n(g, 'jfree', 'Journal Space\nFreed', 'gray')
    n(g, 'crash', 'Crash Recovery:\nReplay journal\nfrom last commit', 'red')
    e(g, 'app', 'pagecache', 'write()')
    e(g, 'pagecache', 'jstart', 'writeback')
    e(g, 'jstart', 'jdata', 'log metadata')
    e(g, 'jdata', 'jcommit', 'commit record')
    e(g, 'jcommit', 'checkpoint', 'flush to disk')
    e(g, 'checkpoint', 'jfree', 'release')
    e(g, 'jcommit', 'crash', 'power loss here →\nreplay on reboot', color='#ef4444', style='dashed')
    g.render(os.path.join(OUT, 'linux-ext4-journal-flow'), cleanup=True)
    print('Generated: linux-ext4-journal-flow')


def diag_xfs_allocation():
    g = base_graph('xfs_alloc', 'XFS Allocation Groups Architecture', rankdir='TB')
    n(g, 'fs', 'XFS Filesystem', 'purple')
    n(g, 'ag0', 'AG 0 (Superblock)\nAG Header\nFree Space B-tree\nInode B-tree', 'navy')
    n(g, 'ag1', 'AG 1\nIndependent\nallocation unit', 'navy')
    n(g, 'ag2', 'AG 2\nParallel I/O\nno AG lock contention', 'navy')
    n(g, 'agn', 'AG N\n(size = 1 TB default)', 'navy')
    n(g, 'btree', 'B+ Trees per AG:\nFree space (2)\nInode map\nRefcount (reflink)', 'teal')
    n(g, 'perf', 'Parallel writes:\nEach AG locked\nindependently\n→ high concurrency', 'green')
    e(g, 'fs', 'ag0', '')
    e(g, 'fs', 'ag1', '')
    e(g, 'fs', 'ag2', '')
    e(g, 'fs', 'agn', '...')
    e(g, 'ag0', 'btree', 'per-AG structure')
    e(g, 'ag1', 'perf', 'parallel alloc')
    g.render(os.path.join(OUT, 'linux-xfs-allocation-groups'), cleanup=True)
    print('Generated: linux-xfs-allocation-groups')


# ─── linux-apparmor ───────────────────────────────────────────────────────────

def diag_apparmor_modes():
    g = base_graph('aa_modes', 'AppArmor Profile Enforcement Modes', rankdir='LR')
    n(g, 'unconfined', 'Unconfined\nNo profile loaded\nAll access allowed', 'red')
    n(g, 'complain', 'Complain Mode\nViolations logged\nNot blocked\naa-logprof → tune', 'gold')
    n(g, 'enforce', 'Enforce Mode\nViolations BLOCKED\n+ logged in audit.log', 'green')
    n(g, 'profile', 'Profile: /etc/apparmor.d/\n/usr/bin/nginx\n→ capability net_bind_service\n→ /var/www/** r\n→ /var/log/nginx/** rw', 'navy')
    n(g, 'lsm', 'LSM Hook\n(Linux Security Module)\nChecked on every\nfile/cap/network op', 'purple')
    e(g, 'unconfined', 'complain', 'aa-complain')
    e(g, 'complain', 'enforce', 'aa-enforce')
    e(g, 'enforce', 'complain', 'aa-complain (debug)')
    e(g, 'profile', 'lsm', 'loaded into kernel')
    e(g, 'lsm', 'enforce', 'enforces')
    g.render(os.path.join(OUT, 'linux-apparmor-modes'), cleanup=True)
    print('Generated: linux-apparmor-modes')


def diag_apparmor_rule_match():
    g = base_graph('aa_rules', 'AppArmor Rule Matching Flow', rankdir='TB')
    n(g, 'op', 'Operation\n(open file, exec, socket)', 'navy')
    n(g, 'check', 'AppArmor LSM Hook\nCheck process profile', 'purple')
    n(g, 'no_profile', 'No profile?\n→ Unconfined\n→ Allow', 'gray')
    n(g, 'match', 'Scan profile rules\n(path globs, caps, nets)\nin order', 'teal')
    n(g, 'deny_rule', 'deny rule matches?\n→ Block (always wins)', 'red')
    n(g, 'allow_rule', 'allow rule matches?\n→ Permit', 'green')
    n(g, 'no_match', 'No rule matches?\n→ BLOCK (default deny)\n→ Log if complain mode', 'red')
    e(g, 'op', 'check', '')
    e(g, 'check', 'no_profile', 'no profile')
    e(g, 'check', 'match', 'profile active')
    e(g, 'match', 'deny_rule', 'deny match')
    e(g, 'match', 'allow_rule', 'allow match')
    e(g, 'match', 'no_match', 'no match')
    g.render(os.path.join(OUT, 'linux-apparmor-rule-match'), cleanup=True)
    print('Generated: linux-apparmor-rule-match')


# ─── linux-sudo-pam ───────────────────────────────────────────────────────────

def diag_pam_stack():
    g = base_graph('pam_stack', 'PAM Authentication Stack Phases', rankdir='TB')
    n(g, 'app', 'Application\n(sudo, ssh, login)', 'navy')
    n(g, 'auth', 'auth phase\nVerify identity\n(password, biometric, MFA)', 'purple')
    n(g, 'account', 'account phase\nAuthorization check\n(expired? locked? time?)', 'gold')
    n(g, 'password', 'password phase\nUpdate credential\n(passwd, chpasswd)', 'teal')
    n(g, 'session', 'session phase\nSetup / teardown\n(mount home, limits, env)', 'green')
    n(g, 'required', 'required: MUST pass\nfailure continues stack\nthen returns fail', 'red')
    n(g, 'requisite', 'requisite: MUST pass\nfailure stops immediately', 'red')
    n(g, 'sufficient', 'sufficient: if pass → ok\n(skip remaining)', 'green')
    n(g, 'optional', 'optional: result ignored\n(info only)', 'gray')
    e(g, 'app', 'auth', 'start')
    e(g, 'auth', 'account', 'pass')
    e(g, 'account', 'session', 'pass')
    e(g, 'account', 'password', 'if changing pw')
    e(g, 'required', 'requisite', 'control flags')
    e(g, 'requisite', 'sufficient', '')
    e(g, 'sufficient', 'optional', '')
    g.render(os.path.join(OUT, 'linux-sudo-pam-stack'), cleanup=True)
    print('Generated: linux-sudo-pam-stack')


def diag_sudo_flow():
    g = base_graph('sudo_flow', 'sudo Privilege Escalation Flow', rankdir='LR')
    n(g, 'user', 'User runs:\nsudo command', 'navy')
    n(g, 'sudoers', 'Parse /etc/sudoers\n+ /etc/sudoers.d/*\nvisudo validates syntax', 'gold')
    n(g, 'match', 'Match rule:\nwho  host=(as_who) cmd', 'teal')
    n(g, 'nopass', 'NOPASSWD tag?\n→ Skip auth', 'green')
    n(g, 'pam', 'PAM auth\n(user\'s own password)\ntimestamp cached ~5min', 'purple')
    n(g, 'exec', 'exec() as target user\n(default: root)', 'green')
    n(g, 'deny', 'DENIED\n(logged to syslog)', 'red')
    n(g, 'log', '/var/log/auth.log\n/var/log/sudo.log', 'gray')
    e(g, 'user', 'sudoers', '')
    e(g, 'sudoers', 'match', 'rule found')
    e(g, 'sudoers', 'deny', 'no rule')
    e(g, 'match', 'nopass', 'NOPASSWD')
    e(g, 'match', 'pam', 'password needed')
    e(g, 'nopass', 'exec', '')
    e(g, 'pam', 'exec', 'auth ok')
    e(g, 'pam', 'deny', 'auth fail')
    e(g, 'exec', 'log', 'audit')
    e(g, 'deny', 'log', 'audit')
    g.render(os.path.join(OUT, 'linux-sudo-privilege-flow'), cleanup=True)
    print('Generated: linux-sudo-privilege-flow')


# ─── linux-audit ──────────────────────────────────────────────────────────────

def diag_auditd_pipeline():
    g = base_graph('audit_pipeline', 'auditd Event Pipeline', rankdir='LR')
    n(g, 'syscall', 'Kernel Syscall\n(open, execve, connect\nchmod, setuid...)', 'purple')
    n(g, 'hook', 'Audit Hook\nin kernel (LSM/netlink)', 'navy')
    n(g, 'rule', 'Audit Rules:\nauditctl -a always,exit\n-F arch=b64 -S execve', 'gold')
    n(g, 'buf', 'Kernel Audit Buffer\n(ring buffer)', 'teal')
    n(g, 'auditd', 'auditd daemon\n/sbin/auditd', 'green')
    n(g, 'log', '/var/log/audit/audit.log\ntype=SYSCALL msg=audit(...)', 'cyan')
    n(g, 'ausearch', 'ausearch -k tag\nausearch -x /bin/sudo', 'navy')
    n(g, 'aureport', 'aureport --auth\naureport --exec', 'navy')
    e(g, 'syscall', 'hook', '')
    e(g, 'rule', 'hook', 'filter')
    e(g, 'hook', 'buf', 'match → enqueue')
    e(g, 'buf', 'auditd', 'netlink socket')
    e(g, 'auditd', 'log', 'write')
    e(g, 'log', 'ausearch', 'query')
    e(g, 'log', 'aureport', 'report')
    g.render(os.path.join(OUT, 'linux-audit-pipeline'), cleanup=True)
    print('Generated: linux-audit-pipeline')


def diag_audit_rule_types():
    g = base_graph('audit_rules', 'Audit Rule Types & Examples', rankdir='TB')
    n(g, 'types', 'Audit Rule Types', 'purple')
    n(g, 'control', 'Control Rules\nauditctl -b 8192\n(buffer size)\nauditctl -e 1\n(enable)', 'navy')
    n(g, 'fs', 'Filesystem Watch\nauditctl -w /etc/passwd\n-p wa (write+attr)\n-k identity', 'gold')
    n(g, 'syscall', 'Syscall Rules\nauditctl -a always,exit\n-F arch=b64\n-S execve -k exec', 'green')
    n(g, 'exit', 'Exit Filters\nalways,exit: log on exit\nnever: suppress\nexclude: drop by field', 'teal')
    n(g, 'persist', 'Persistent Rules:\n/etc/audit/rules.d/*.rules\naugenrules --load', 'gray')
    e(g, 'types', 'control', '')
    e(g, 'types', 'fs', '')
    e(g, 'types', 'syscall', '')
    e(g, 'types', 'exit', '')
    e(g, 'syscall', 'persist', 'save in rules.d')
    e(g, 'fs', 'persist', 'save in rules.d')
    g.render(os.path.join(OUT, 'linux-audit-rule-types'), cleanup=True)
    print('Generated: linux-audit-rule-types')


# ─── linux-capabilities ───────────────────────────────────────────────────────

def diag_capability_sets():
    g = base_graph('cap_sets', 'Linux Capability Sets — Thread Model', rankdir='LR')
    n(g, 'permitted', 'Permitted Set\nMax capabilities\nthread can have', 'purple')
    n(g, 'effective', 'Effective Set\nCurrenly active\n(kernel checks this)', 'red')
    n(g, 'inheritable', 'Inheritable Set\nPassed across exec()\nif binary also sets it', 'gold')
    n(g, 'ambient', 'Ambient Set (kernel 4.3+)\nGranted to unprivileged\nexec without file caps', 'teal')
    n(g, 'bounding', 'Bounding Set\nCeiling — caps can only\nbe dropped, not raised\nCAP_SETPCAP needed', 'navy')
    n(g, 'file', 'File Capabilities\n(xattr: security.capability)\npermitted, inheritable,\neffective bit', 'green')
    e(g, 'permitted', 'effective', 'raise cap\n(prctl PR_SET_SECUREBITS)', color='#22c55e')
    e(g, 'effective', 'permitted', 'drop cap', color='#ef4444')
    e(g, 'bounding', 'permitted', 'limits', style='dashed')
    e(g, 'file', 'inheritable', 'exec intersection')
    e(g, 'ambient', 'effective', 'exec grant')
    g.render(os.path.join(OUT, 'linux-capabilities-sets'), cleanup=True)
    print('Generated: linux-capabilities-sets')


def diag_capability_drop():
    g = base_graph('cap_drop', 'Capability Drop Flow — Secure Service Launch', rankdir='LR')
    n(g, 'root', 'Start as root\nAll caps permitted', 'red')
    n(g, 'bind', 'CAP_NET_BIND_SERVICE\nbind port < 1024', 'gold')
    n(g, 'drop_root', 'setuid(nobody)\nDrop root UID\nKeep needed caps', 'navy')
    n(g, 'cap_drop', 'capsh --drop=\nCAP_SYS_ADMIN,\nCAP_NET_ADMIN,...', 'teal')
    n(g, 'minimal', 'Minimal caps only\n(principle of least privilege)', 'green')
    n(g, 'seccomp', 'Combine with seccomp\n+ no_new_privs\nfor defense-in-depth', 'purple')
    e(g, 'root', 'bind', 'bind port')
    e(g, 'bind', 'drop_root', 'after bind')
    e(g, 'drop_root', 'cap_drop', 'drop unneeded')
    e(g, 'cap_drop', 'minimal', 'hardened process')
    e(g, 'minimal', 'seccomp', '+ filter syscalls')
    g.render(os.path.join(OUT, 'linux-capabilities-drop-flow'), cleanup=True)
    print('Generated: linux-capabilities-drop-flow')


# ─── systemd-journalctl ───────────────────────────────────────────────────────

def diag_journal_storage():
    g = base_graph('journal_storage', 'systemd Journal Storage & Query Flow', rankdir='LR')
    n(g, 'sources', 'Log Sources:\nsyslog socket\nkmsg (kernel)\nstdout/stderr\nnative journal protocol', 'navy')
    n(g, 'journald', 'systemd-journald\n/run/systemd/journal/', 'purple')
    n(g, 'volatile', 'Volatile Storage\n/run/log/journal/\nLost on reboot\n(default if no persist dir)', 'gold')
    n(g, 'persist', 'Persistent Storage\n/var/log/journal/\nmkdir -p /var/log/journal\njournald.conf: Storage=persistent', 'green')
    n(g, 'binary', 'Binary Journal Files\n*.journal (indexed, compressed)\nRotated by size/time', 'teal')
    n(g, 'query', 'journalctl queries:\n-u nginx.service\n-k (kernel only)\n--since "1 hour ago"\n-f (follow)\n-p err (priority)', 'cyan')
    e(g, 'sources', 'journald', 'collect')
    e(g, 'journald', 'volatile', 'default')
    e(g, 'journald', 'persist', 'if /var/log/journal exists')
    e(g, 'volatile', 'binary', 'write')
    e(g, 'persist', 'binary', 'write')
    e(g, 'binary', 'query', 'read')
    g.render(os.path.join(OUT, 'systemd-journalctl-storage'), cleanup=True)
    print('Generated: systemd-journalctl-storage')


def diag_journal_filters():
    g = base_graph('journal_filters', 'journalctl Filter Options Cheatsheet', rankdir='TB')
    n(g, 'jctl', 'journalctl', 'purple')
    n(g, 'unit', '-u SERVICE\n--unit=nginx.service', 'navy')
    n(g, 'time', '--since "2024-01-01"\n--until "1 hour ago"\n-S today -U now', 'teal')
    n(g, 'prio', '-p err\n-p warning..err\n(emerg/alert/crit/err\n/warning/notice/info/debug)', 'red')
    n(g, 'follow', '-f  (tail -f style)\n-n 50 (last 50 lines)', 'green')
    n(g, 'boot', '-b (current boot)\n-b -1 (previous boot)\n--list-boots', 'gold')
    n(g, 'kernel', '-k / --dmesg\n(kernel ring buffer)', 'cyan')
    n(g, 'field', 'SYSLOG_IDENTIFIER=nginx\n_PID=1234\n_UID=0', 'gray')
    e(g, 'jctl', 'unit', '')
    e(g, 'jctl', 'time', '')
    e(g, 'jctl', 'prio', '')
    e(g, 'jctl', 'follow', '')
    e(g, 'jctl', 'boot', '')
    e(g, 'jctl', 'kernel', '')
    e(g, 'jctl', 'field', 'field match')
    g.render(os.path.join(OUT, 'systemd-journalctl-filters'), cleanup=True)
    print('Generated: systemd-journalctl-filters')


# ─── systemd-namespaces ───────────────────────────────────────────────────────

def diag_namespace_types():
    g = base_graph('ns_types', 'Linux Namespace Types — Isolation Domains', rankdir='TB')
    n(g, 'ns', 'Linux Namespaces\n(kernel isolation)', 'purple')
    n(g, 'pid', 'PID\nProcess tree isolation\nPID 1 in container\nclone(CLONE_NEWPID)', 'navy')
    n(g, 'net', 'NET\nNetwork stack isolation\neth0 per container\nclone(CLONE_NEWNET)', 'navy')
    n(g, 'mnt', 'MNT\nFilesystem view\npivot_root / chroot\nclone(CLONE_NEWNS)', 'navy')
    n(g, 'uts', 'UTS\nhostname + domainname\nisolated per ns\nclone(CLONE_NEWUTS)', 'green')
    n(g, 'ipc', 'IPC\nSysV SHM, semaphores\nmessage queues\nclone(CLONE_NEWIPC)', 'green')
    n(g, 'user', 'USER\nUID/GID mapping\nroot in ns → uid 1000 host\nclone(CLONE_NEWUSER)', 'gold')
    n(g, 'cgroup', 'CGROUP\nHide cgroup hierarchy\ncontainer sees own root\nclone(CLONE_NEWCGROUP)', 'teal')
    n(g, 'time', 'TIME (kernel 5.6+)\nIsolate CLOCK_REALTIME\nper-container time', 'cyan')
    e(g, 'ns', 'pid', '')
    e(g, 'ns', 'net', '')
    e(g, 'ns', 'mnt', '')
    e(g, 'ns', 'uts', '')
    e(g, 'ns', 'ipc', '')
    e(g, 'ns', 'user', '')
    e(g, 'ns', 'cgroup', '')
    e(g, 'ns', 'time', '')
    g.render(os.path.join(OUT, 'systemd-namespaces-types'), cleanup=True)
    print('Generated: systemd-namespaces-types')


# ─── linux-kernel-basics ──────────────────────────────────────────────────────

def diag_proc_tree():
    g = base_graph('proc_tree', '/proc Filesystem — Key Entries', rankdir='TB')
    n(g, 'proc', '/proc\n(virtual fs, kernel state)', 'purple')
    n(g, 'pid', '/proc/PID/\ncmdline fd/ maps\nstatus net/ io', 'navy')
    n(g, 'cpuinfo', '/proc/cpuinfo\nCPU flags, cores\nvirtualization support', 'teal')
    n(g, 'meminfo', '/proc/meminfo\nMemTotal MemFree\nBuffers Cached Slab', 'teal')
    n(g, 'net', '/proc/net/tcp\n/proc/net/dev\n(used by ss/ip)', 'green')
    n(g, 'sys', '/proc/sys/\nsysctl tunables\nnet.ipv4.ip_forward', 'gold')
    n(g, 'load', '/proc/loadavg\n1m 5m 15m\nrunning/total procs', 'cyan')
    n(g, 'mods', '/proc/modules\nlsmod reads this\nloaded kernel modules', 'gray')
    e(g, 'proc', 'pid', 'per-process')
    e(g, 'proc', 'cpuinfo', '')
    e(g, 'proc', 'meminfo', '')
    e(g, 'proc', 'net', '')
    e(g, 'proc', 'sys', '')
    e(g, 'proc', 'load', '')
    e(g, 'proc', 'mods', '')
    g.render(os.path.join(OUT, 'linux-kernel-proc-tree'), cleanup=True)
    print('Generated: linux-kernel-proc-tree')


def diag_module_loading():
    g = base_graph('mod_load', 'Kernel Module Loading Flow', rankdir='LR')
    n(g, 'modprobe', 'modprobe MODULE\n(with deps)', 'navy')
    n(g, 'insmod', 'insmod mod.ko\n(no dep resolution)', 'navy')
    n(g, 'depmod', '/lib/modules/$(uname -r)/\nmodules.dep\n(depmod -a builds this)', 'gold')
    n(g, 'verify', 'Kernel verifies:\nELF format\nsignature (if secure boot)\nversion magic', 'purple')
    n(g, 'init', 'module_init()\nRun in kernel space', 'green')
    n(g, 'loaded', '/proc/modules\nlsmod output', 'teal')
    n(g, 'rmmod', 'rmmod MODULE\n(fails if in use)\nmodule_exit()', 'red')
    e(g, 'modprobe', 'depmod', 'read deps')
    e(g, 'depmod', 'insmod', 'load in order')
    e(g, 'insmod', 'verify', '')
    e(g, 'verify', 'init', 'pass')
    e(g, 'init', 'loaded', 'registered')
    e(g, 'loaded', 'rmmod', 'unload')
    g.render(os.path.join(OUT, 'linux-kernel-module-loading'), cleanup=True)
    print('Generated: linux-kernel-module-loading')


# ─── bash-variables-env ───────────────────────────────────────────────────────

def diag_variable_scoping():
    g = base_graph('var_scope', 'Bash Variable Scoping & Inheritance', rankdir='LR')
    n(g, 'shell', 'Shell Variable\nNAME=value\nLocal to current shell', 'navy')
    n(g, 'export', 'Environment Variable\nexport NAME=value\nor declare -x NAME', 'green')
    n(g, 'local', 'Function Local\nlocal NAME=value\nVisible only in function', 'teal')
    n(g, 'child', 'Child Process\n(subshell, cmd, script)\nInherits env vars only', 'purple')
    n(g, 'unset', 'unset NAME\nRemoves variable', 'red')
    n(g, 'env_cmd', 'env / printenv\nShows env vars\nexport -p for all', 'gold')
    n(g, 'special', 'Special vars:\n$? exit code  $$ PID\n$0 script name\n$@ all args  $# count', 'cyan')
    e(g, 'shell', 'export', 'export NAME')
    e(g, 'export', 'child', 'inherited by child')
    e(g, 'shell', 'child', 'NOT inherited', color='#ef4444', style='dashed')
    e(g, 'shell', 'local', 'inside function')
    e(g, 'shell', 'unset', 'unset NAME')
    e(g, 'export', 'env_cmd', 'visible in env')
    g.render(os.path.join(OUT, 'bash-variables-scoping'), cleanup=True)
    print('Generated: bash-variables-scoping')


def diag_env_inheritance():
    g = base_graph('env_inherit', 'Environment Inheritance Chain', rankdir='LR')
    n(g, 'kernel', 'Kernel\n(execve argv+envp)', 'purple')
    n(g, 'init', 'PID 1: systemd\nMinimal env:\nPATH, HOME, TERM', 'navy')
    n(g, 'login', 'Login Shell\n/etc/profile\n~/.bash_profile\n~/.bashrc', 'teal')
    n(g, 'user_env', 'User Environment\nPATH extended\nalias defined\nPS1 prompt set', 'green')
    n(g, 'script', 'Child Script\n./script.sh\nInherits exported vars', 'gold')
    n(g, 'subshell', '$(subshell)\nInherits env\nChanges NOT visible\nto parent', 'cyan')
    n(g, 'source', 'source ./script\n. ./script\nRuns in current shell\n(changes stick)', 'navy')
    e(g, 'kernel', 'init', 'boot')
    e(g, 'init', 'login', 'fork+exec')
    e(g, 'login', 'user_env', 'dot files')
    e(g, 'user_env', 'script', 'exec')
    e(g, 'user_env', 'subshell', '$(...)')
    e(g, 'user_env', 'source', 'source/dot')
    g.render(os.path.join(OUT, 'bash-variables-env-chain'), cleanup=True)
    print('Generated: bash-variables-env-chain')


# ─── bash-conditionals-loops ──────────────────────────────────────────────────

def diag_control_flow():
    g = base_graph('ctrl_flow', 'Bash Control Flow & Exit Codes', rankdir='LR')
    n(g, 'if', 'if [ condition ]\nthen commands\nelif ...\nelse ...\nfi', 'navy')
    n(g, 'case', 'case $var in\n  pattern) cmds;;\n  *) default;;\nesac', 'navy')
    n(g, 'while', 'while [ condition ]\ndo\n  commands\ndone', 'green')
    n(g, 'until', 'until [ condition ]\ndo\n  commands\ndone', 'teal')
    n(g, 'for', 'for var in list\ndo commands done\nfor ((i=0;i<10;i++))', 'gold')
    n(g, 'exit0', '$? = 0\nSuccess / True', 'green')
    n(g, 'exitN', '$? = 1-255\nFailure / False', 'red')
    n(g, 'ops', 'Test operators:\n[ -f file ] file exists\n[ -z str ] empty string\n[ $a -eq $b ] numeric eq\n[[ =~ ]] regex match', 'purple')
    e(g, 'if', 'exit0', 'then branch')
    e(g, 'if', 'exitN', 'else branch')
    e(g, 'while', 'exit0', 'loop continues')
    e(g, 'while', 'exitN', 'loop exits')
    e(g, 'ops', 'if', 'used in condition')
    e(g, 'ops', 'while', 'used in condition')
    g.render(os.path.join(OUT, 'bash-control-flow'), cleanup=True)
    print('Generated: bash-control-flow')


# ─── bash-functions ───────────────────────────────────────────────────────────

def diag_function_patterns():
    g = base_graph('func_patterns', 'Bash Function Declaration & Return Patterns', rankdir='TB')
    n(g, 'style1', 'POSIX style:\nfunc_name() {\n  commands\n}', 'navy')
    n(g, 'style2', 'bash style:\nfunction func_name {\n  commands\n}', 'navy')
    n(g, 'args', 'Arguments:\n$1 $2 $3... positional\n$@ all as array\n$# count', 'teal')
    n(g, 'local', 'Scope:\nlocal var=value\n(avoid global pollution)', 'gold')
    n(g, 'return', 'return N\nSets $? (0-255)\nNOT a value return', 'purple')
    n(g, 'output', 'Return a value:\necho output\ncapture: result=$(func)', 'green')
    n(g, 'nameref', 'nameref (bash 4.3+):\nlocal -n ref=$1\nref=value  (modify caller)', 'cyan')
    e(g, 'style1', 'args', 'called with args')
    e(g, 'args', 'local', 'local copies')
    e(g, 'local', 'return', 'exit status')
    e(g, 'local', 'output', 'value via stdout')
    e(g, 'local', 'nameref', 'value via ref')
    g.render(os.path.join(OUT, 'bash-functions-patterns'), cleanup=True)
    print('Generated: bash-functions-patterns')


# ─── bash-job-control ─────────────────────────────────────────────────────────

def diag_job_control():
    g = base_graph('job_ctrl', 'Bash Job Control — Process States', rankdir='LR')
    n(g, 'fg', 'Foreground\nRunning in terminal\nCtrl+C to kill\nCtrl+Z to suspend', 'green')
    n(g, 'suspended', 'Suspended (Stopped)\nCtrl+Z or SIGTSTP\n(process still exists)', 'gold')
    n(g, 'bg', 'Background Running\ncmd & to start\nbg %1 to resume\n(no terminal I/O)', 'teal')
    n(g, 'done', 'Job Completed\nshell notifies\n(when fg comes back)', 'gray')
    n(g, 'jobs', 'jobs -l\nList all jobs\n[1]+ Running ...\n[2]- Stopped ...', 'navy')
    n(g, 'wait', 'wait PID / wait %1\nWait for job to finish\nCapture exit code', 'purple')
    n(g, 'disown', 'disown %1\nDetach from shell\n(survives logout)\nnohup for immune to HUP', 'cyan')
    e(g, 'fg', 'suspended', 'Ctrl+Z')
    e(g, 'suspended', 'fg', 'fg %1')
    e(g, 'suspended', 'bg', 'bg %1')
    e(g, 'bg', 'fg', 'fg %1')
    e(g, 'bg', 'done', 'completes')
    e(g, 'fg', 'done', 'completes')
    e(g, 'jobs', 'fg', 'manage')
    e(g, 'bg', 'disown', 'detach')
    e(g, 'bg', 'wait', 'wait for')
    g.render(os.path.join(OUT, 'bash-job-control-states'), cleanup=True)
    print('Generated: bash-job-control-states')


# ─── linux-ip-routing ─────────────────────────────────────────────────────────

def diag_routing_decision():
    g = base_graph('routing_decision', 'IP Routing Table Decision Flow', rankdir='TB')
    n(g, 'pkt', 'Outgoing Packet\ndst IP = 10.20.1.5', 'navy')
    n(g, 'rt', 'Routing Table\nip route show\n(kernel FIB)', 'purple')
    n(g, 'host', 'Host Route /32?\n10.20.1.5 via dev eth0\n(most specific wins)', 'green')
    n(g, 'net', 'Network Route /24?\n10.20.0.0/24 via 192.168.1.1', 'teal')
    n(g, 'default', 'Default Route 0.0.0.0/0\nvia 192.168.1.1 dev eth0', 'gold')
    n(g, 'unreachable', 'UNREACHABLE\nICMP net unreachable', 'red')
    n(g, 'forward', 'Forward to\nnext-hop / interface', 'green')
    n(g, 'policy', 'Policy Routing\n(ip rule show)\nroute based on src/tos/fwmark', 'cyan')
    e(g, 'pkt', 'rt', 'lookup dst')
    e(g, 'rt', 'host', 'longest prefix match')
    e(g, 'rt', 'net', 'prefix match')
    e(g, 'rt', 'default', 'catch-all')
    e(g, 'rt', 'unreachable', 'no match')
    e(g, 'host', 'forward', 'matched')
    e(g, 'net', 'forward', 'matched')
    e(g, 'default', 'forward', 'matched')
    e(g, 'policy', 'rt', 'selects table')
    g.render(os.path.join(OUT, 'linux-ip-routing-decision'), cleanup=True)
    print('Generated: linux-ip-routing-decision')


# ─── linux-ss-netstat ─────────────────────────────────────────────────────────

def diag_socket_states():
    g = base_graph('socket_states', 'TCP Socket State Machine', rankdir='LR')
    n(g, 'closed', 'CLOSED', 'gray')
    n(g, 'listen', 'LISTEN\n(server ready)', 'green')
    n(g, 'syn_sent', 'SYN_SENT\n(client sent SYN)', 'navy')
    n(g, 'syn_recv', 'SYN_RECEIVED\n(server got SYN)', 'navy')
    n(g, 'estab', 'ESTABLISHED\n(data transfer)', 'green')
    n(g, 'fin_wait1', 'FIN_WAIT_1\n(active close sent FIN)', 'gold')
    n(g, 'fin_wait2', 'FIN_WAIT_2\n(got ACK for FIN)', 'gold')
    n(g, 'close_wait', 'CLOSE_WAIT\n(passive got FIN)\nApp must call close()', 'red')
    n(g, 'last_ack', 'LAST_ACK\n(passive sent FIN)', 'teal')
    n(g, 'time_wait', 'TIME_WAIT\n2×MSL (60s-240s)\nPort held', 'purple')
    e(g, 'closed', 'listen', 'bind+listen')
    e(g, 'closed', 'syn_sent', 'connect()')
    e(g, 'listen', 'syn_recv', 'SYN recv')
    e(g, 'syn_recv', 'estab', 'ACK recv')
    e(g, 'syn_sent', 'estab', 'SYN+ACK recv')
    e(g, 'estab', 'fin_wait1', 'close() active')
    e(g, 'estab', 'close_wait', 'FIN recv passive')
    e(g, 'fin_wait1', 'fin_wait2', 'ACK recv')
    e(g, 'fin_wait2', 'time_wait', 'FIN recv')
    e(g, 'close_wait', 'last_ack', 'close() called')
    e(g, 'last_ack', 'closed', 'ACK recv')
    e(g, 'time_wait', 'closed', '2×MSL timeout')
    g.render(os.path.join(OUT, 'linux-ss-socket-states'), cleanup=True)
    print('Generated: linux-ss-socket-states')


# ─── linux-tcpdump ────────────────────────────────────────────────────────────

def diag_tcpdump_filters():
    g = base_graph('tcpdump_filters', 'tcpdump Capture Filter Syntax (BPF)', rankdir='TB')
    n(g, 'root', 'tcpdump [options] [filter]', 'purple')
    n(g, 'host', 'host 10.0.0.1\nsrc host 10.0.0.1\ndst host 10.0.0.1', 'navy')
    n(g, 'port', 'port 80\nsrc port 443\ndst port 22\nportrange 8000-9000', 'navy')
    n(g, 'proto', 'tcp / udp / icmp\nnot arp\nip6', 'green')
    n(g, 'logic', 'and / or / not\n( ) grouping\nExample:\nhost 10.0.0.1 and port 80', 'gold')
    n(g, 'output', 'Output options:\n-n no DNS\n-v verbose\n-X hex+ascii\n-w file.pcap\n-r file.pcap', 'teal')
    n(g, 'iface', '-i eth0\n-i any (all interfaces)\n-i lo (loopback)', 'cyan')
    e(g, 'root', 'host', 'filter by IP')
    e(g, 'root', 'port', 'filter by port')
    e(g, 'root', 'proto', 'filter by proto')
    e(g, 'host', 'logic', 'combine')
    e(g, 'port', 'logic', 'combine')
    e(g, 'proto', 'logic', 'combine')
    e(g, 'root', 'output', 'output opts')
    e(g, 'root', 'iface', '-i option')
    g.render(os.path.join(OUT, 'linux-tcpdump-filters'), cleanup=True)
    print('Generated: linux-tcpdump-filters')


# ─── linux-curl-wget ──────────────────────────────────────────────────────────

def diag_http_lifecycle():
    g = base_graph('http_lifecycle', 'curl HTTP Request Lifecycle', rankdir='LR')
    n(g, 'dns', 'DNS Resolution\ncurl resolves FQDN\n(--resolve to override)', 'teal')
    n(g, 'tcp', 'TCP Connect\n(port 80/443)\n--connect-timeout', 'navy')
    n(g, 'tls', 'TLS Handshake\n(HTTPS)\n--cacert / --insecure\n--cert client.pem', 'purple')
    n(g, 'req', 'HTTP Request\nGET /path HTTP/1.1\nHost: example.com\n-H "Header: value"', 'green')
    n(g, 'body', 'Request Body\n-d "data"\n-F file=@upload.txt\n--data-raw', 'gold')
    n(g, 'resp', 'HTTP Response\nStatus code + headers\n-i to show headers\n-o to save body', 'green')
    n(g, 'follow', 'Redirect?\n-L to follow\n301/302 → new URL', 'cyan')
    n(g, 'auth', 'Auth options:\n-u user:pass (Basic)\n-H "Authorization: Bearer"\n--negotiate (Kerberos)', 'red')
    e(g, 'dns', 'tcp', '')
    e(g, 'tcp', 'tls', 'HTTPS')
    e(g, 'tls', 'req', '')
    e(g, 'tcp', 'req', 'HTTP')
    e(g, 'body', 'req', '-d / -F')
    e(g, 'auth', 'req', '-u / -H')
    e(g, 'req', 'resp', '')
    e(g, 'resp', 'follow', '3xx')
    e(g, 'follow', 'dns', 'new URL')
    g.render(os.path.join(OUT, 'linux-curl-http-lifecycle'), cleanup=True)
    print('Generated: linux-curl-http-lifecycle')


# ─── linux-top-htop ───────────────────────────────────────────────────────────

def diag_top_metrics():
    g = base_graph('top_metrics', 'top/htop CPU & Memory Metric Breakdown', rankdir='TB')
    n(g, 'header', 'top Header Line\nload avg: 1m 5m 15m\ntasks: running sleeping zombie\n%Cpu(s):', 'purple')
    n(g, 'cpu', 'CPU Breakdown:\nus: user space\nsy: kernel/system\nni: nice (low-prio)\nid: idle\nwa: I/O wait ←bottleneck\nhi: HW IRQ  si: SW IRQ\nst: stolen (VM hypervisor)', 'navy')
    n(g, 'mem', 'Memory Lines:\nMiB Mem: total free used buff/cache\nMiB Swap: total free used avail', 'teal')
    n(g, 'proc', 'Process Columns:\nPID USER PR NI\nVIRT RES SHR S\n%CPU %MEM\nTIME+ COMMAND', 'green')
    n(g, 'virt', 'VIRT: virtual memory mapped\n(includes shared, not all in RAM)', 'gold')
    n(g, 'res', 'RES: resident (physical RAM)\nActual RAM used by process', 'gold')
    n(g, 'shr', 'SHR: shared memory\n(libraries counted here)', 'gold')
    e(g, 'header', 'cpu', 'CPU stats')
    e(g, 'header', 'mem', 'memory stats')
    e(g, 'header', 'proc', 'process list')
    e(g, 'proc', 'virt', 'column explain')
    e(g, 'proc', 'res', 'column explain')
    e(g, 'proc', 'shr', 'column explain')
    g.render(os.path.join(OUT, 'linux-top-metrics'), cleanup=True)
    print('Generated: linux-top-metrics')


# ─── linux-vmstat-iostat ──────────────────────────────────────────────────────

def diag_vmstat_fields():
    g = base_graph('vmstat_fields', 'vmstat Fields — System Activity Snapshot', rankdir='TB')
    n(g, 'procs', 'procs:\nr: run queue length\nb: blocked on I/O\n(r>cores = CPU bound)', 'red')
    n(g, 'memory', 'memory (KB):\nswpd: swap used\nfree: free RAM\nbuff: buffer cache\ncache: page cache', 'navy')
    n(g, 'swap', 'swap:\nsi: swap-in KB/s ← pressure!\nso: swap-out KB/s ← pressure!', 'gold')
    n(g, 'io', 'io:\nbi: blocks in (disk reads)\nbo: blocks out (disk writes)', 'teal')
    n(g, 'system', 'system:\nin: interrupts/s\ncs: context switches/s\n(high cs = lock contention)', 'purple')
    n(g, 'cpu', 'cpu (%):\nus sy id wa st\n(wa>20% = I/O bottleneck)', 'green')
    n(g, 'iostat', 'iostat -x 1:\n%iowait %util rkB/s wkB/s\navgqu-sz await svctm\n(util>80% = disk bottleneck)', 'cyan')
    e(g, 'procs', 'swap', 'si/so = memory pressure')
    e(g, 'swap', 'io', 'swap → disk I/O')
    e(g, 'io', 'cpu', 'I/O wait → wa%')
    e(g, 'memory', 'procs', 'free→0 → swap')
    e(g, 'io', 'iostat', 'more detail')
    g.render(os.path.join(OUT, 'linux-vmstat-fields'), cleanup=True)
    print('Generated: linux-vmstat-fields')


# ─── linux-perf-profiling ─────────────────────────────────────────────────────

def diag_perf_events():
    g = base_graph('perf_events', 'perf Event Types & Profiling Commands', rankdir='TB')
    n(g, 'perf', 'perf tool\n(kernel perf_events)', 'purple')
    n(g, 'hw', 'Hardware Events:\ncycles instructions\ncache-misses\nbranch-misses', 'navy')
    n(g, 'sw', 'Software Events:\ncpu-clock task-clock\npage-faults\ncontext-switches', 'teal')
    n(g, 'tracepoints', 'Tracepoints:\nsched:sched_switch\nnet:net_dev_xmit\nsyscalls:sys_enter_*', 'green')
    n(g, 'stat', 'perf stat -e cycles,instructions ./prog\n→ IPC = instructions/cycles\n(IPC<1 = CPU stalls)', 'gold')
    n(g, 'record', 'perf record -g -F 99 -p PID\n(sample at 99 Hz\nwith call graph)', 'gold')
    n(g, 'report', 'perf report\n(TUI flame hierarchy)\nperf script → flamegraph.pl', 'green')
    e(g, 'perf', 'hw', '')
    e(g, 'perf', 'sw', '')
    e(g, 'perf', 'tracepoints', '')
    e(g, 'hw', 'stat', '-e events')
    e(g, 'record', 'report', 'analyze samples')
    e(g, 'tracepoints', 'record', 'trace events')
    g.render(os.path.join(OUT, 'linux-perf-events'), cleanup=True)
    print('Generated: linux-perf-events')


# ─── linux-lsof ───────────────────────────────────────────────────────────────

def diag_lsof_columns():
    g = base_graph('lsof_columns', 'lsof Output Columns & FD Types', rankdir='TB')
    n(g, 'cmd', 'COMMAND  PID  USER  FD  TYPE  DEVICE  SIZE  NODE  NAME', 'gray')
    n(g, 'fd_types', 'FD Types:\ncwd current dir\ntxt program text\nmem memory mapped\n0r 1w 2u stdin/out/err\n3u socket/file fd', 'navy')
    n(g, 'type_col', 'TYPE column:\nREG regular file\nDIR directory\nCHR char device\nIPv4/IPv6 socket\nunix unix socket\nFIFO pipe', 'teal')
    n(g, 'filters', 'Common filters:\nlsof -p PID  (by process)\nlsof -u user  (by user)\nlsof /path  (file users)\nlsof -i :80  (port 80)\nlsof -i TCP  (all TCP)', 'green')
    n(g, 'deleted', 'Deleted but open:\nNAME shows "(deleted)"\nProcess holds fd → inode\nDisk space NOT freed\nuntil fd closed', 'red')
    e(g, 'cmd', 'fd_types', 'FD column')
    e(g, 'cmd', 'type_col', 'TYPE column')
    e(g, 'cmd', 'filters', 'filter options')
    e(g, 'fd_types', 'deleted', 'deleted files')
    g.render(os.path.join(OUT, 'linux-lsof-columns'), cleanup=True)
    print('Generated: linux-lsof-columns')


if __name__ == '__main__':
    diag_disk_partition_table()
    diag_disk_tools()
    diag_raid_levels()
    diag_mdadm_states()
    diag_fstab_fields()
    diag_mount_namespace()
    diag_inode_structure()
    diag_hard_soft_links()
    diag_ext4_journal()
    diag_xfs_allocation()
    diag_apparmor_modes()
    diag_apparmor_rule_match()
    diag_pam_stack()
    diag_sudo_flow()
    diag_auditd_pipeline()
    diag_audit_rule_types()
    diag_capability_sets()
    diag_capability_drop()
    diag_journal_storage()
    diag_journal_filters()
    diag_namespace_types()
    diag_proc_tree()
    diag_module_loading()
    diag_variable_scoping()
    diag_env_inheritance()
    diag_control_flow()
    diag_function_patterns()
    diag_job_control()
    diag_routing_decision()
    diag_socket_states()
    diag_tcpdump_filters()
    diag_http_lifecycle()
    diag_top_metrics()
    diag_vmstat_fields()
    diag_perf_events()
    diag_lsof_columns()
    print('All batch 2 diagrams generated.')
