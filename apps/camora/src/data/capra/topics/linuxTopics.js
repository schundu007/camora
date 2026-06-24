// Linux fundamentals — interview prep for cloud, DevOps, and SRE engineers.
// Content sourced from AceCloudInterviews.com, Linux Foundation docs,
// man pages, and production engineering best practices.

export const linuxCategories = [
  { id: 'fundamentals', name: 'Linux Fundamentals',        icon: 'book',       color: '#3b82f6' },
  { id: 'shell',        name: 'Shell & Scripting',         icon: 'terminal',   color: '#22c55e' },
  { id: 'networking',   name: 'Networking & Sockets',      icon: 'globe',      color: '#06b6d4' },
  { id: 'performance',  name: 'Performance & Profiling',   icon: 'activity',   color: '#f97316' },
  { id: 'storage',      name: 'Storage & Filesystems',     icon: 'database',   color: '#8b5cf6' },
  { id: 'security',     name: 'Security & Hardening',      icon: 'shield',     color: '#ef4444' },
  { id: 'systemd',      name: 'systemd & Process Mgmt',   icon: 'settings',   color: '#f59e0b' },
];

export const linuxTopicCategoryMap = {
  // Fundamentals
  'linux-filesystem':           'fundamentals',
  'linux-permissions':          'fundamentals',
  'linux-processes':            'fundamentals',
  'linux-users-groups':         'fundamentals',
  'linux-package-management':   'fundamentals',
  'linux-boot-process':         'fundamentals',
  'linux-kernel-basics':        'fundamentals',
  'linux-signals':              'fundamentals',
  // Shell
  'bash-scripting':             'shell',
  'bash-pipes-redirection':     'shell',
  'bash-variables-env':         'shell',
  'bash-conditionals-loops':    'shell',
  'bash-functions':             'shell',
  'bash-text-processing':       'shell',
  'bash-job-control':           'shell',
  // Networking
  'linux-networking-tools':     'networking',
  'linux-ip-routing':           'networking',
  'linux-iptables':             'networking',
  'linux-ss-netstat':           'networking',
  'linux-tcpdump':              'networking',
  'linux-dns-tools':            'networking',
  'linux-curl-wget':            'networking',
  // Performance
  'linux-top-htop':             'performance',
  'linux-vmstat-iostat':        'performance',
  'linux-perf-profiling':       'performance',
  'linux-strace-ltrace':        'performance',
  'linux-lsof':                 'performance',
  'linux-memory-management':    'performance',
  'linux-cpu-scheduling':       'performance',
  // Storage deep dives
  'linux-storage-deep-dive':     'storage',
  // Networking deep dives
  'linux-networking-l2l3':       'networking',
  // Storage
  'linux-disk-management':      'storage',
  'linux-lvm':                  'storage',
  'linux-raid':                 'storage',
  'linux-mount-fstab':          'storage',
  'linux-inodes':               'storage',
  'linux-ext4-xfs':             'storage',
  // Security
  'linux-selinux':              'security',
  'linux-apparmor':             'security',
  'linux-sudo-pam':             'security',
  'linux-ssh-hardening':        'security',
  'linux-audit':                'security',
  'linux-capabilities':         'security',
  // systemd
  'systemd-units':              'systemd',
  'systemd-journalctl':         'systemd',
  'systemd-cgroups':            'systemd',
  'systemd-namespaces':         'systemd',
  'linux-service-management':   'systemd',
  // New topics
  'linux-seccomp':              'security',
  'linux-ebpf':                 'performance',
  'linux-cgroup-v2':            'systemd',
  'linux-luks-dmcrypt':         'storage',
  'linux-vfs-overlayfs':        'storage',
  'linux-use-method':           'performance',
  'linux-ldap-sssd':            'security',
  'linux-ftrace-bpftrace':      'performance',
  'linux-numa':                 'performance',
  'linux-swap':                 'storage',
};

export const linuxTopics = [
  // ─── FUNDAMENTALS ──────────────────────────────────────────────────────────
  {
    id: 'linux-processes',
    title: 'Linux Processes',
    icon: 'cpu',
    color: '#3b82f6',
    questions: 8,
    description: 'Process lifecycle, states, PID namespaces, fork/exec, zombie processes, and process trees.',
    visualizations: [
      { title: 'Process Lifecycle', description: 'States and transitions: R→S→D→T→Z and what each means for DevOps debugging', image: '/diagrams/linux/linux-processes-lifecycle.png' },
      { title: 'Process Tree', description: 'fork/exec hierarchy from PID 1 systemd, PID namespaces, and zombie formation', image: '/diagrams/linux/linux-processes-tree.png' },
    ],
    introduction: `Every running program in Linux is a **process** \u2014 an instance of an executable with its own address space, file descriptors, and credentials. Processes are organised in a tree rooted at **PID 1** (\`init\` or \`systemd\`). Each process has a parent (**PPID**); when a parent exits before its children, those children are re-parented to PID 1.\n\n## Process States\n\n- **R (Running)** \u2014 on a CPU or ready to run\n- **S (Sleeping)** \u2014 waiting for an event, interruptible\n- **D (Disk sleep)** \u2014 waiting for I/O, uninterruptible\n- **T (Stopped)** \u2014 frozen by SIGSTOP or a debugger\n- **Z (Zombie)** \u2014 exited but parent hasn't called \`wait()\` yet\n\n## Creating Processes\n\n**\`fork()\`** duplicates the current process (copy-on-write pages). **\`exec()\`** replaces the process image with a new program. The shell uses \`fork\` then \`exec\` for every command. Threads are implemented as lightweight processes via \`clone()\`.\n\n## Zombie Processes\n\n**Zombie processes** accumulate when a parent ignores \`SIGCHLD\` or doesn't call \`wait()\`. The zombie holds its PID and exit status but no memory. A large number of zombies indicates a parent bug, not a resource leak, but it exhausts the PID namespace.`,
    whenToUse: [
      'Diagnosing high load average when CPU% is low — D-state processes blocked on I/O',
      'Explaining container isolation at the process level — PID namespaces give each container its own PID 1',
      'Debugging zombie accumulation in a service that spawns child processes',
      'Understanding why kill -9 on a zombie has no effect',
    ],
    keyConcepts: [
      { term: 'Process states', definition: `**R** (running), **S** (sleeping), **D** (uninterruptible disk sleep), **T** (stopped), **Z** (zombie). The \`D\` state is the main cause of high load with low CPU.` },
      { term: 'fork/exec', definition: `**\`fork()\`** duplicates the process (copy-on-write); **\`exec()\`** replaces the image. Shell runs every command via \`fork\` + \`exec\`.` },
      { term: 'Zombie', definition: `Exited but parent has not called \`wait()\`. Holds a PID slot but no memory. Fixed by repairing the parent or sending \`SIGCHLD\`.` },
      { term: 'PID namespace', definition: `Gives a container its **own PID 1** and isolated PID space. The container sees PIDs 1-N; the host sees a different PID for the same process.` },
      { term: 'PPID / reparenting', definition: `Every process tracks its parent PID. If the parent dies, orphaned children are reparented to PID 1 (\`systemd\`).` },
    ],
    pitfalls: [
      'Treating zombie count as a memory leak — zombies hold no memory, only a PID. The real bug is a parent that never calls wait().',
      'Sending SIGKILL to a D-state process — it has no effect because the process is in kernel code waiting for I/O.',
      'Confusing load average with CPU usage — load average counts R and D state processes.',
    ],
    keyQuestions: [
      {
        question: 'Your server load average is 50 but CPU usage is only 5%. What is happening and how do you diagnose it?',
        answer: `**Load average** counts all processes in **R** (runnable) and **D** (uninterruptible sleep) states. A high load with low CPU means processes are blocked waiting for I/O \u2014 they are in D state.\n\n## Diagnosis Steps\n\n\`\`\`bash\n# Check iowait \u2014 high %wa confirms an I/O problem\ntop        # look at the %wa column\n\n# Per-device utilisation\niostat -x 1\n\n# List all D-state processes\nps aux | awk '$8 ~ /D/'\n\n# Check for storage errors in kernel log\ndmesg | grep -E 'ata reset|I/O error'\njournalctl -k\n\`\`\`\n\n## Common Causes\n\n- Failing disk drive\n- NFS mount that went unresponsive\n- Ceph OSD in a degraded state\n- Network block device with packet loss\n\nFix depends on root cause: replace the disk, restore NFS connectivity, or add more IOPS.`,
      },
      {
        question: 'What is the difference between a zombie process and an orphan process?',
        answer: `## Zombie Process\n\nA **zombie** has exited but its parent has not called \`wait()\`. Holds a PID entry but **no memory, file descriptors, or CPU**. Cannot be killed with any signal.\n\n**Fix options:**\n- Fix the parent to call \`wait()\`\n- Send \`SIGCHLD\` to the parent\n- Kill the parent so zombies get reparented to init (PID 1), which reaps them\n\n## Orphan Process\n\nAn **orphan** is a process whose parent exited while the child is still running. Linux automatically **reparents orphans to PID 1** (\`systemd\`), which reaps them when they exit. Orphans are harmless \u2014 they continue running normally.\n\n## Practical Diagnosis\n\n\`\`\`bash\n# Find the parent of all zombies\nps aux --ppid <PPID>\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What does a Z state mean in ps output?', a: 'Zombie -- the process has exited but its parent has not called wait(). It holds a PID slot but consumes no memory or CPU.' },
      { q: 'Why does kill -9 not remove a zombie process?', a: 'The zombie is already dead. Only the parent can clear it by calling wait(). Killing the parent causes systemd (PID 1) to adopt and reap the zombie.' },
      { q: 'What causes a high load average when CPU usage is only 5%?', a: 'D-state (uninterruptible sleep) processes blocked on I/O count toward load average. Check iostat and dmesg for disk errors.' },
      { q: 'What is the difference between fork() and exec()?', a: 'fork() duplicates the current process with copy-on-write pages. exec() replaces the process image with a new program. The shell does fork then exec for every command.' },
      { q: 'What happens to orphan processes when a parent exits?', a: 'They are automatically reparented to PID 1 (systemd), which reaps them when they eventually exit. Orphans continue running normally.' },
      { q: 'What is a PID namespace and why does Kubernetes use it?', a: 'A PID namespace gives a container its own isolated PID space with its own PID 1. Each container cannot see or signal processes in other namespaces.' },
      { q: 'How do threads differ from processes in Linux?', a: 'Threads are lightweight processes created with clone() that share the same address space, file descriptors, and signal handlers. The kernel schedules them identically to processes.' },
      { q: 'What does the D process state indicate and can you kill it?', a: 'D means uninterruptible sleep -- the process is waiting in kernel code for I/O. SIGKILL has no effect; the process will resume when the I/O completes or the kernel times out.' },
      { q: 'How do you find which process spawned all the zombies?', a: 'Run ps -o ppid,pid,stat and identify the shared PPID of the zombies. That parent process is not calling wait(). Send it SIGCHLD or restart it.' },
      { q: 'What is copy-on-write in the context of fork()?', a: 'After fork(), parent and child share the same physical pages mapped read-only. A page is copied to a new frame only when either process writes to it, minimizing memory overhead.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man5/proc.5.html',
      'https://man7.org/linux/man-pages/man2/fork.2.html',
    ],
  },
  {
    id: 'linux-signals',
    title: 'Linux Signals',
    icon: 'zap',
    color: '#3b82f6',
    questions: 6,
    description: 'Signal delivery, common signals, signal masking, SIGTERM vs SIGKILL, and graceful shutdown patterns.',
    visualizations: [
      { title: 'Signal Delivery Flow', description: 'How signals travel from source → pending set → mask check → handler or default action', image: '/diagrams/linux/linux-signals-delivery.png' },
      { title: 'Key Signals Cheatsheet', description: 'SIGTERM (15) vs SIGKILL (9) vs SIGSTOP/CONT — which are catchable and when to use each', image: '/diagrams/linux/linux-signals-cheatsheet.png' },
    ],
    introduction: `**Signals** are asynchronous notifications sent to a process by the kernel, another process, or the process itself. There are 64 standard signals. Signals interrupt normal execution and invoke a registered handler, the default action (usually terminate or ignore), or are blocked via a **signal mask**.\n\n## Key Signals for Production\n\n- **SIGTERM (15)** \u2014 request graceful termination; processes can catch and clean up\n- **SIGKILL (9)** \u2014 unconditional termination; cannot be caught, blocked, or ignored\n- **SIGINT (2)** \u2014 Ctrl+C from the terminal\n- **SIGHUP (1)** \u2014 trigger **config reload** in daemons\n- **SIGCHLD (17)** \u2014 sent to parent when a child changes state\n- **SIGUSR1 / SIGUSR2 (10/12)** \u2014 user-defined signals\n\n## Signal Delivery\n\nIf a process has a signal **blocked** in its signal mask, it is queued (pending). Signals are **not queued past one** \u2014 if the same signal fires three times while blocked, only one delivery occurs when unblocked. Real-time signals (\`SIGRTMIN\` to \`SIGRTMAX\`) are queued and ordered.\n\n## Graceful Shutdown Pattern\n\nReceive \`SIGTERM\` \u2192 stop accepting new work \u2192 drain in-flight requests \u2192 close connections \u2192 exit 0. Kubernetes uses \`terminationGracePeriodSeconds\` for this.`,
    whenToUse: [
      'Explaining why kill -9 should be the last resort — it prevents graceful cleanup',
      'Designing container shutdown sequences in Kubernetes (preStop hooks + SIGTERM + grace period)',
      'Debugging why a daemon does not pick up config changes — likely needs SIGHUP',
    ],
    keyConcepts: [
      { term: 'SIGTERM (15)', definition: `Request **graceful shutdown**. Can be caught and handled. Always try first — allows the process to flush buffers and exit cleanly.` },
      { term: 'SIGKILL (9)', definition: `**Unconditional kill**. Cannot be caught, blocked, or ignored. Use as a last resort after SIGTERM has been given time to work.` },
      { term: 'SIGHUP (1)', definition: `Modern convention: **reload configuration** without restarting. \`nginx\`, \`sshd\`, and most daemons handle this via a registered SIGHUP handler.` },
      { term: 'Signal mask', definition: `Per-thread **bitmask of blocked signals**. Blocked signals are queued (pending) and delivered when unblocked.` },
      { term: 'Real-time signals', definition: `\`SIGRTMIN\` through \`SIGRTMAX\`. Unlike standard signals, they are **queued, ordered**, and can carry a payload.` },
    ],
    pitfalls: [
      'Sending SIGKILL immediately without trying SIGTERM — prevents log flushing, database checkpoint, and connection draining.',
      'Assuming kill -9 works on zombie processes — zombies are already dead. Kill the parent.',
      'Not handling SIGTERM in containerised applications — Kubernetes sends SIGTERM, waits terminationGracePeriodSeconds, then sends SIGKILL.',
    ],
    keyQuestions: [
      {
        question: 'What happens when you run kill -9 on a process vs kill -15? When should you use each?',
        answer: `## SIGTERM (kill -15) \u2014 Always Try First\n\n\`kill -15\` sends **SIGTERM**. The process can catch it to run cleanup: flush write buffers, close database connections, complete in-flight requests, remove lock files.\n\n## SIGKILL (kill -9) \u2014 Last Resort Only\n\n\`kill -9\` sends **SIGKILL**. The kernel tears the process down immediately \u2014 no cleanup runs. File buffers may not be flushed, database connections are cut hard.\n\n**Use SIGKILL only when:**\n- The process is hung and not responding to SIGTERM after a grace period\n- The process caught SIGTERM but is stuck in shutdown code\n\n## Practical Sequence\n\n\`\`\`bash\nkill -15 <pid>\nsleep 30\nkill -0 <pid> 2>/dev/null && kill -9 <pid>   # Still alive? Force kill.\n\`\`\``,
      },
      {
        question: 'How do you ensure your Docker container shuts down gracefully when Kubernetes drains a node?',
        answer: `Kubernetes sends **SIGTERM to PID 1** inside the container on pod deletion. If the app does not handle SIGTERM, Kubernetes waits \`terminationGracePeriodSeconds\` (default 30s) then sends SIGKILL.\n\n## Requirements for Graceful Shutdown\n\n**1. Be PID 1 or receive forwarded signals.** If you use \`CMD ["bash", "-c", "myapp"]\` the shell is PID 1 and does not forward signals. Use \`exec\`:\n\`\`\`bash\nCMD exec myapp\n\`\`\`\n\n**2. Install a SIGTERM handler** that stops accepting connections, drains requests, and exits 0.\n\n**3. Set \`terminationGracePeriodSeconds\`** in the pod spec to match your drain timeout.\n\n**4. Add a \`preStop\` hook** if needed to deregister from a load balancer before SIGTERM.\n\n## Common Mistake\n\nUsing \`npm start\` as PID 1 \u2014 the shell traps no signals. Use **\`dumb-init\`** or **\`tini\`** as a minimal init that forwards signals to children.`,
      },
    ],
    quickFire: [
      { q: 'Which signal cannot be caught, blocked, or ignored?', a: 'SIGKILL (9). The kernel terminates the process immediately with no cleanup possible.' },
      { q: 'What is SIGHUP used for in modern daemons?', a: 'Configuration reload. Sending SIGHUP to nginx, sshd, or most daemons causes them to re-read their config file without restarting.' },
      { q: 'What happens when the same signal fires twice while it is blocked?', a: 'Standard signals are not queued -- only one pending delivery is recorded. Real-time signals (SIGRTMIN to SIGRTMAX) are queued and ordered.' },
      { q: 'Why should you try SIGTERM before SIGKILL?', a: 'SIGTERM lets the process flush buffers, close database connections, drain in-flight requests, and exit cleanly. SIGKILL bypasses all cleanup.' },
      { q: 'What does Kubernetes send when deleting a pod?', a: 'SIGTERM to PID 1 in the container. After terminationGracePeriodSeconds (default 30s), it sends SIGKILL if the process has not exited.' },
      { q: 'Why does running a Node app via a shell script break Kubernetes graceful shutdown?', a: 'The shell becomes PID 1 and does not forward SIGTERM to child processes. Use exec myapp or a proper init like tini to ensure signal forwarding.' },
      { q: 'What are SIGUSR1 and SIGUSR2 for?', a: 'User-defined signals with no built-in meaning. Applications use them for custom actions -- for example, toggling debug logging or triggering a stats dump.' },
      { q: 'How do you send a signal to all processes in a process group?', a: 'Use a negative PID: kill -TERM -<pgid>. This sends the signal to every process in the group, useful for killing a pipeline of related processes.' },
      { q: 'What is the signal mask and how does it affect delivery?', a: 'A per-thread bitmask of blocked signals. Blocked signals are held pending and delivered atomically when the thread unblocks them, preventing race conditions during critical sections.' },
      { q: 'What signal does Ctrl+C send and to whom?', a: 'SIGINT (2) is sent to the entire foreground process group in the terminal, not just the parent shell process.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man7/signal.7.html',
      'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination',
    ],
  },
  {
    id: 'linux-filesystem',
    title: 'Linux Filesystem',
    icon: 'database',
    color: '#3b82f6',
    questions: 7,
    description: 'VFS layer, inodes, hard vs soft links, ext4 and XFS, mount points, and filesystem capacity diagnosis.',
    visualizations: [
      { title: 'Filesystem Hierarchy Standard', description: 'Key directories under / and their purpose — what lives in /etc, /var, /proc, /usr/bin', image: '/diagrams/linux/linux-filesystem-hierarchy.png' },
      { title: 'VFS Stack', description: 'System call → VFS abstraction → ext4/XFS/NFS → Page Cache → Block I/O → hardware', image: '/diagrams/linux/linux-filesystem-vfs.png' },
      { title: 'Inodes — Hard vs Soft Links', description: 'Hard links share the same inode; symlinks store a path string and can go dangling', image: '/diagrams/linux/linux-filesystem-inodes.png' },
    ],
    introduction: `Everything in Linux is a file — devices, processes, network sockets, even hardware. This mental model is the foundation. Before memorizing commands, understand where things live and why the filesystem is organised that way.\n\n## The Filesystem Hierarchy Standard (FHS)\n\nLinux follows the FHS so every distribution puts things in predictable places:\n- **/bin, /sbin** — essential binaries needed before /usr mounts (boot recovery)\n- **/usr/bin, /usr/sbin** — most user programs; this is where \`grep\`, \`ssh\`, \`python3\` live\n- **/etc** — all configuration files, always text, always editable\n- **/var** — variable data: logs in \`/var/log\`, databases, mail queues, runtime state\n- **/proc, /sys** — virtual filesystems exposing kernel state as files (read \`/proc/cpuinfo\`, write \`/sys/...\` to tune the kernel live)\n- **/home** — user home directories; \`~\` expands to yours\n- **/tmp** — temporary files cleared on reboot; world-writable with sticky bit\n- **/opt** — optional third-party packages installed outside the distro package manager\n\n**The 'everything is a file' principle** means: disk devices are files (\`/dev/sda\`), processes expose state as files (\`/proc/1/status\`), and network connections appear as files when using socketpair. This is why Unix tools that work on files compose so well.\n\nLinux uses the **Virtual Filesystem Switch (VFS)** as an abstraction layer between system calls (\`open\`, \`read\`, \`write\`) and specific filesystem implementations. Every filesystem presents the same VFS interface, so userspace code is filesystem-agnostic.\n\n## Inodes\n\nThe **inode** stores file metadata: type, permissions, owner/group, size, timestamps (\`atime\`, \`mtime\`, \`ctime\`), and pointers to data blocks. Critically, the **inode does not contain the filename** \u2014 filenames live in directory entries that map names to inode numbers.\n\n## Hard Links vs Symbolic Links\n\n**Hard links** are directory entries pointing to the same inode. The inode and data are freed only when link count reaches zero and no process has the file open. This is why you can delete a file that a running process holds open \u2014 the data is still accessible via \`/proc/PID/fd/\`.\n\n**Symbolic links** are special files containing a path string. They can cross filesystem boundaries. **Dangling symlinks** point to a non-existent target.\n\n## Common Production Problems\n\n- **Disk full** (\`df -h\`) vs **inode exhaustion** (\`df -i\`) \u2014 a filesystem can run out of inodes even when blocks are available, typically caused by millions of tiny files.`,
    whenToUse: [
      '"Disk is full but df shows space available" — inode exhaustion, check df -i',
      'Explaining why a deleted file still uses disk space — process holding open fd',
      'Understanding why mv is atomic within a filesystem but cp is not',
    ],
    keyConcepts: [
      { term: 'Inode', definition: `**Metadata structure** for a file: type, permissions, owner, size, timestamps, block pointers. Does **not** contain the filename. Check with \`ls -i\`.` },
      { term: 'Hard link', definition: `Additional directory entry pointing to the **same inode**. The file is deleted only when link count reaches 0 **and** no open file descriptors remain.` },
      { term: 'Symbolic link', definition: `A file containing a **path string**. Can cross filesystems. Becomes a **dangling symlink** if the target is moved or deleted.` },
      { term: 'VFS', definition: `**Virtual Filesystem Switch** — kernel abstraction routing system calls to the correct filesystem driver.` },
      { term: 'Inode exhaustion', definition: `Can run out of **inodes** before running out of blocks. Check with \`df -i\`. XFS uses dynamic inode allocation and rarely hits this.` },
    ],
    pitfalls: [
      'Running df -h and seeing free space but still getting "No space left on device" — check df -i for inode exhaustion.',
      'Assuming rm immediately frees disk space — if any process has the file open, the blocks are not freed until the fd is closed.',
      'Hard-linking across filesystems — hard links cannot cross filesystem boundaries.',
    ],
    keyQuestions: [
      {
        question: 'What is an inode and what happens when inodes are exhausted?',
        answer: `An **inode** stores metadata: file type, permissions (\`rwxrwxrwx\`), owner UID/GID, file size, three timestamps (\`atime\` = last access, \`mtime\` = last modification, \`ctime\` = last inode change), and pointers to data blocks. The **inode does not store the filename** \u2014 filenames are stored in directory entries.\n\nWhen inodes are exhausted, **new files cannot be created** even with available disk blocks.\n\n## Diagnosis\n\n\`\`\`bash\n# Check inode usage -- look for Use% near 100%\ndf -i\n\n# Find the directory with the most files\nfind / -xdev -printf '%h\\n' | sort | uniq -c | sort -k 1 -rn | head -20\n\`\`\`\n\n## Fix\n\nDelete excess small files (empty mail queue, clear tmp). To prevent recurrence, increase inode density at filesystem creation:\n\`\`\`bash\nmkfs.ext4 -N <count> /dev/sdX\n\`\`\`\nOr switch to **XFS**, which uses dynamic inode allocation and rarely exhausts inodes.`,
      },
      {
        question: 'A file is deleted but disk usage does not decrease. Why and how do you fix it?',
        answer: `When you delete a file (\`unlink\`), the directory entry is removed and link count decrements. If **any process has the file open**, the kernel keeps the inode and data blocks alive until the fd is closed. The file is invisible in the directory tree but still occupies disk space.\n\nThis is common with **log files**: a rotation script deletes the old log, but the application still has the old file descriptor open and is writing to the deleted file.\n\n## Diagnosis\n\n\`\`\`bash\n# List all deleted files still held open\nlsof | grep deleted\n\n# Files with link count < 1\nlsof +L1\n\`\`\`\n\n## Fix Options\n\n- **Restart or reload the process** \u2014 opens new file descriptors pointing to the new log file\n- **Truncate via /proc** (if restart not possible):\n\`\`\`bash\n> /proc/<PID>/fd/<FD>\n\`\`\`\n- **Send SIGHUP** to trigger log rotation (\`logrotate\` uses \`postrotate\` scripts for this)`,
      },
    ],
    quickFire: [
      { q: 'What does an inode store and what does it NOT store?', a: 'It stores type, permissions, owner/group, size, timestamps, and block pointers. It does NOT store the filename -- filenames live in directory entries.' },
      { q: 'Why is "No space left on device" possible when df -h shows free space?', a: 'Inode exhaustion. The filesystem ran out of inodes, commonly from millions of tiny files. Check with df -i.' },
      { q: 'A file is deleted but disk usage does not drop. Why?', a: 'A process still has the file open. The kernel keeps the inode and blocks until all file descriptors are closed. Find it with lsof +L1.' },
      { q: 'What is the difference between a hard link and a symbolic link?', a: 'A hard link is another directory entry pointing to the same inode and cannot cross filesystems. A symlink is a file containing a path string and can cross filesystems but may become dangling.' },
      { q: 'What does the VFS (Virtual Filesystem Switch) do?', a: 'It is the kernel abstraction layer that routes system calls like open() and read() to the correct filesystem driver (ext4, XFS, NFS, etc.), making userspace code filesystem-agnostic.' },
      { q: 'What are the three timestamps on a file and when does each update?', a: 'atime (last access), mtime (last data modification), ctime (last inode change including metadata). ctime updates on chmod, chown, and link count changes.' },
      { q: 'What happens when you mv a file within the same filesystem?', a: 'Only the directory entry is updated -- a rename() syscall. No data is copied. This is why mv is atomic within a filesystem but cp is not.' },
      { q: 'What is /proc and what kind of data does it expose?', a: '/proc is a virtual filesystem exposing kernel and process state as files. /proc/PID/status, /proc/cpuinfo, /proc/meminfo are generated in-memory on each read.' },
      { q: 'Why can you not hard link a directory?', a: 'To prevent cycles in the filesystem tree which would break tools like find and du. Only the kernel itself creates . and .. hard links for directories.' },
      { q: 'What is the sticky bit on /tmp?', a: 'The sticky bit on a world-writable directory prevents users from deleting files owned by other users. Even though anyone can write to /tmp, you can only delete your own files.' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/filesystems/vfs.html',
      'https://man7.org/linux/man-pages/man7/inode.7.html',
    ],
  },
  // ─── SHELL ─────────────────────────────────────────────────────────────────
  {
    id: 'bash-scripting',
    title: 'Bash Scripting',
    icon: 'terminal',
    color: '#22c55e',
    questions: 8,
    description: 'Variables, arrays, control flow, error handling, trap, and production-grade scripting patterns.',
    visualizations: [
      { title: 'Bash Script Anatomy', description: 'Shebang → set -euo pipefail → vars → functions → main logic → trap cleanup → exit code', image: '/diagrams/linux/bash-scripting-anatomy.png' },
      { title: 'Control Flow', description: 'if/elif/else, case, for, while, until, functions, and array iteration in Bash', image: '/diagrams/linux/bash-scripting-control-flow.png' },
    ],
    introduction: `**Bash** is the dominant shell for system automation. Production scripts must be written with defensive defaults.\n\n## Defensive Defaults\n\nAlways start scripts with:\n\`\`\`bash\nset -euo pipefail\n\`\`\`\n- **\`-e\`** \u2014 exit on any non-zero return\n- **\`-u\`** \u2014 treat unset variables as errors\n- **\`-o pipefail\`** \u2014 fail a pipeline if **any** command in it fails\n\n## Variables and Quoting\n\nAlways **double-quote variable expansions**: \`"$variable"\` not \`$variable\` \u2014 prevents word splitting and glob expansion. Use \`\${variable:-default}\` for a default when unset.\n\n## Exit Codes and trap\n\n\`0\` is success; anything else is failure. Use \`trap\` to register cleanup functions:\n\`\`\`bash\ntrap cleanup EXIT\n\`\`\`\n\n## Process Substitution\n\n**Process substitution** feeds command output as a file:\n\`\`\`bash\ndiff <(sort a.txt) <(sort b.txt)\n\`\`\`\nDiffs two sorted outputs without temporary files.`,
    whenToUse: [
      'Writing deployment scripts, cron jobs, and CI/CD pipeline steps',
      'Automating repetitive system administration tasks',
      'Designing error handling that cleans up temp files even on failure',
    ],
    keyConcepts: [
      { term: 'set -euo pipefail', definition: `**Defensive defaults** every production script should start with. \`-e\` exits on error, \`-u\` treats unset variables as an error, \`-o pipefail\` fails the whole pipeline on the first non-zero command.` },
      { term: 'Double quoting', definition: `Always quote variable expansions: \`"$var"\` not \`$var\`. Prevents **word splitting** and **glob expansion**.` },
      { term: 'trap', definition: `Register functions to run on shell exit or signals. \`trap cleanup EXIT\` ensures temp files are deleted even when the script exits early.` },
      { term: 'Exit codes', definition: `\`0\` is success; anything else is failure. Scripts should propagate exit codes correctly.` },
      { term: 'Process substitution', definition: `\`diff <(cmd1) <(cmd2)\` feeds command output as named pipes. Avoids temp files.` },
    ],
    pitfalls: [
      'Omitting set -euo pipefail — without it, a failed command is silently ignored.',
      'Using $* instead of "$@" — $* collapses all args into one string; "$@" preserves individual arguments.',
      'Not quoting variable expansions — rm $file with file="important file.txt" becomes rm important file.txt.',
    ],
    keyQuestions: [
      {
        question: 'Write a bash script that downloads a file, processes it, and cleans up temp files even if the script fails mid-way.',
        answer: `\`\`\`bash\n#!/usr/bin/env bash\nset -euo pipefail\n\nTMPDIR=\$(mktemp -d)\nTMPFILE="\$TMPDIR/download.dat"\n\ncleanup() {\n  rm -rf "\$TMPDIR"\n}\ntrap cleanup EXIT\n\nURL="\${1:?Usage: \$0 <url>}"\n\ncurl -fsSL "\$URL" -o "\$TMPFILE"\n\nprocess_data "\$TMPFILE"\n\necho "Done. Temp files cleaned up automatically by trap."\n\`\`\`\n\n## Key Points\n\n- **\`mktemp -d\`** creates a unique temp directory\n- **\`trap cleanup EXIT\`** runs cleanup whether the script succeeds, fails, or receives a signal\n- **\`\${1:?message}\`** exits with message if \`\$1\` is unset\n- **\`curl -f\`** fails on HTTP 4xx/5xx; without it, curl exits 0 even on a 404`,
      },
      {
        question: 'Explain the difference between $*, "$*", $@, and "$@" when passing arguments.',
        answer: `Without quotes, both \`\$*\` and \`\$@\` word-split on IFS and behave identically.\n\n## "\$*" \u2014 Single String\n\n\`"\$*"\` expands to a **single word** with all arguments joined by the first character of IFS. Useful when you want to pass all args as one string.\n\n## "\$@" \u2014 Preserved Words\n\n\`"\$@"\` expands to **separate words**, one per original argument, preserving internal spaces. This is almost always what you want when forwarding arguments.\n\n## Example\n\n\`\`\`bash\nargs() { for a in "\$@"; do echo "[\$a]"; done; }\nargs "hello world" "foo"\n# With "\$@": [hello world]  [foo]      -- correct\n# With "\$*": [hello world foo]         -- all joined\n# With  \$@:  [hello] [world] [foo]     -- split on space\n\`\`\`\n\n**Rule of thumb:** always use \`"\$@"\` when forwarding arguments.`,
      },
    ],
    quickFire: [
      { q: 'What does set -euo pipefail do?', a: '-e exits on any non-zero return, -u treats unset variables as errors, -o pipefail fails the whole pipeline if any command in it fails.' },
      { q: 'Why always double-quote variable expansions in bash?', a: 'Unquoted variables are subject to word splitting on IFS characters and glob expansion. "$var" prevents both, keeping the value as a single token.' },
      { q: 'What does trap cleanup EXIT do?', a: 'Registers the cleanup function to run whenever the shell exits -- whether from success, error, or a signal. Ensures temp files are always removed.' },
      { q: 'What is the difference between "$@" and "$*"?', a: '"$@" expands to separate quoted words, one per argument, preserving internal spaces. "$*" joins all arguments into one string. Always use "$@" when forwarding arguments.' },
      { q: 'How do you safely use a default value for an unset variable?', a: 'Use ${var:-default}. It returns default if var is unset or empty without aborting the script. Use ${var:?message} to abort with a message if unset.' },
      { q: 'What does [[ ]] provide over [ ] in bash?', a: '[[ ]] is a bash keyword that supports pattern matching (=~), avoids word splitting, and does not require quoting variables. [ ] is the POSIX test command.' },
      { q: 'How do you run multiple commands in parallel in a bash script and wait for them?', a: 'Run each with & to background it, capture each PID with $!, then call wait $pid for each. Check exit codes via wait return value.' },
      { q: 'What is process substitution and when is it useful?', a: 'diff <(sort a.txt) <(sort b.txt) feeds command output as named pipes. It avoids creating temp files when comparing or processing live command output.' },
      { q: 'How do you read a file line by line safely in bash?', a: 'Use while IFS= read -r line; do ...; done < file. IFS= preserves leading whitespace and -r prevents backslash interpretation.' },
      { q: 'What does the -f flag to curl do?', a: '-f (fail) makes curl exit with a non-zero code on HTTP 4xx/5xx responses. Without it, curl exits 0 even on a 404, silently hiding errors in scripts.' },
    ],
    references: [
      'https://www.gnu.org/software/bash/manual/bash.html',
      'https://mywiki.wooledge.org/BashPitfalls',
    ],
  },
  {
    id: 'bash-pipes-redirection',
    title: 'Pipes & Redirection',
    icon: 'terminal',
    color: '#22c55e',
    questions: 5,
    description: 'stdin/stdout/stderr, pipes, here-docs, process substitution, and tee for multi-destination output.',
    visualizations: [
      { title: 'File Descriptors & Pipes', description: 'stdin(0)/stdout(1)/stderr(2) and how pipe connects fd1 of one process to fd0 of the next', image: '/diagrams/linux/bash-pipes-redirection-fds.png' },
      { title: 'Pipeline Chain', description: 'grep→sort→uniq→awk — each stage and why set -o pipefail matters', image: '/diagrams/linux/bash-pipes-redirection-chain.png' },
    ],
    introduction: `Every process inherits three **file descriptors**: \`0\` (stdin), \`1\` (stdout), \`2\` (stderr). Redirection changes where these point.\n\n## Redirection Operators\n\n- \`> file\` \u2014 redirect stdout to file (truncating)\n- \`>> file\` \u2014 append stdout to file\n- \`2> file\` \u2014 redirect stderr to file\n- \`2>&1\` \u2014 merge stderr into stdout\n- \`&> file\` \u2014 redirect both stdout and stderr to file\n\n## Pipes and Subshells\n\nThe pipe operator \`|\` connects stdout of the left command to stdin of the right. Commands in a pipeline run in **subshells** \u2014 **variable assignments in a pipeline do not affect the parent shell**.\n\n## tee and Named Pipes\n\n**\`tee\`** copies stdin to both stdout and a file:\n\`\`\`bash\ncommand | tee logfile.txt | next-command\n\`\`\`\n\n**Named pipes (FIFOs)** created with \`mkfifo\` allow producer-consumer patterns between separate processes.`,
    whenToUse: [
      'Building complex data-processing pipelines in shell scripts',
      'Explaining why variables set inside a pipeline do not persist after the pipeline',
      'Logging output while still displaying it to the terminal',
    ],
    keyConcepts: [
      { term: 'File descriptors 0/1/2', definition: `**\`stdin\` (0)**, **\`stdout\` (1)**, **\`stderr\` (2)**. Redirection changes which file or pipe these descriptors point to.` },
      { term: '2>&1', definition: `Redirect **stderr (fd 2)** to wherever **stdout (fd 1)** currently points. Order matters: \`cmd > file 2>&1\` is correct; \`cmd 2>&1 > file\` sends stderr to terminal.` },
      { term: 'Pipeline subshell', definition: `Each command in a pipeline runs in a **subshell**. Variable assignments inside pipelines do not affect the parent shell.` },
      { term: 'Process substitution', definition: `\`<(cmd)\` substitutes command output as a **named pipe**. Enables comparing live output without temp files.` },
      { term: 'tee', definition: `Reads stdin and writes to both **stdout and one or more files**. \`tee -a\` appends instead of truncating.` },
    ],
    pitfalls: [
      'Putting 2>&1 before > file — sends stderr to terminal and stdout to file. Correct order: cmd > file 2>&1.',
      'Reading a variable set inside a pipeline — it is empty. Use input redirection or a temp file instead.',
      'Forgetting set -o pipefail — cmd1 | cmd2 | cmd3 exits 0 even if cmd1 failed.',
    ],
    keyQuestions: [
      {
        question: 'Why does this script not work: count=0; cat file.txt | while read line; do count=$((count+1)); done; echo $count?',
        answer: `The \`count\` variable is **always 0** after the loop because the \`while\` loop runs in a **subshell**. In bash, each command in a pipeline is a subprocess \u2014 variable assignments do not propagate to the parent shell.\n\n## Fix Options\n\n**Option 1 \u2014 Input redirection (idiomatic bash):**\n\`\`\`bash\ncount=0\nwhile read line; do\n  count=\$((count+1))\ndone < file.txt\necho \$count   # Correct count\n\`\`\`\n\n**Option 2 \u2014 Let \`wc -l\` do the work:**\n\`\`\`bash\ncount=\$(wc -l < file.txt)\n\`\`\`\n\nOption 1 (input redirection) is the idiomatic and most portable solution.`,
      },
      {
        question: 'You need to log all output of a script to a file while still displaying it on the terminal. How?',
        answer: `Use \`exec\` with \`tee\` at the top of the script:\n\n\`\`\`bash\n#!/usr/bin/env bash\nset -euo pipefail\nexec > >(tee -a /var/log/deploy.log) 2>&1\n\n# Everything below writes to both terminal and the log file\necho "Starting deployment..."\n\`\`\`\n\n**How it works:** \`exec > >(tee -a logfile)\` replaces stdout with a tee process. \`2>&1\` merges stderr into that same tee stream.\n\n## Capturing Exit Code with tee\n\n\`\`\`bash\nsome_command 2>&1 | tee output.log\nexit \${PIPESTATUS[0]}   # Exit code of some_command, not tee\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What are the three standard file descriptors and their numbers?', a: '0 is stdin, 1 is stdout, 2 is stderr. Every process inherits these from its parent unless explicitly redirected.' },
      { q: 'What does 2>&1 mean and what is the common ordering mistake?', a: 'Redirects stderr (fd 2) to wherever stdout (fd 1) currently points. cmd 2>&1 > file is wrong -- stderr goes to terminal. Correct order: cmd > file 2>&1.' },
      { q: 'Why does a variable set inside a pipeline not persist after it?', a: 'Each command in a pipeline runs in a subshell. Variable assignments in subshells do not affect the parent shell. Fix by using input redirection instead: while read line; do ...; done < file.' },
      { q: 'What does tee do and when do you use it?', a: 'tee reads stdin and writes to both stdout and one or more files simultaneously. Use it to log output while still piping it to the next command.' },
      { q: 'What is the difference between > and >> for redirection?', a: '> truncates the target file and writes from the beginning. >> appends to the existing file contents.' },
      { q: 'How do you discard both stdout and stderr?', a: 'Redirect both to /dev/null: cmd > /dev/null 2>&1 or using the shorthand cmd &> /dev/null.' },
      { q: 'What is a named pipe (FIFO) and how do you create one?', a: 'A FIFO is a special file that connects two processes via a persistent pipe in the filesystem. Create with mkfifo myfifo. One process writes to it, another reads.' },
      { q: 'What does exec > >(tee logfile) do at the top of a script?', a: 'Replaces the script\'s stdout with a tee process so all subsequent output goes to both the terminal and logfile without modifying individual commands.' },
      { q: 'How do you capture the exit code of the first command in a pipeline?', a: 'Use ${PIPESTATUS[0]} immediately after the pipeline. PIPESTATUS is an array of exit codes for each command in the last pipeline.' },
      { q: 'What does here-doc syntax do and when is it useful?', a: 'cmd <<EOF ... EOF feeds multiline text as stdin without a temp file. Useful for passing configuration blocks to ssh, psql, or other commands inline.' },
    ],
    references: [
      'https://www.gnu.org/software/bash/manual/bash.html#Redirections',
    ],
  },
  // ─── NETWORKING ─────────────────────────────────────────────────────────────
  {
    id: 'linux-networking-tools',
    title: 'Linux Networking Tools',
    icon: 'globe',
    color: '#06b6d4',
    questions: 8,
    description: 'ip, ss, curl, dig, tcpdump, nmap, traceroute, and nc — the production debugging toolkit.',
    visualizations: [
      { title: 'Networking Tools by Use Case', description: 'ss/nc for connections, tcpdump for traffic, dig/ip for DNS/routing, iperf3/mtr for performance', image: '/diagrams/linux/linux-networking-tools-map.png' },
      { title: 'Common Network Ports', description: 'Essential ports every DevOps engineer must know: SSH(22), HTTP(80), HTTPS(443), DNS(53), and DB ports', image: '/diagrams/linux/linux-common-ports.png' },
    ],
    introduction: `Linux networking diagnosis uses a **layered approach** matching the OSI model \u2014 start at the physical/IP layer and work up to the application layer.\n\n## Tools by Layer\n\n**Layer 3 (IP):**\n- \`ip addr\` \u2014 interface addresses\n- \`ip route\` \u2014 routing table\n- \`ping\` \u2014 ICMP reachability\n- \`traceroute\` / \`tracepath\` \u2014 path discovery\n\n**Layer 4 (TCP/UDP):**\n- \`ss\` \u2014 socket statistics, modern replacement for \`netstat\`\n- \`nc\` / \`ncat\` \u2014 raw TCP/UDP connections\n- \`tcpdump\` \u2014 packet capture\n\n**Layer 7 (Application):**\n- \`curl\` \u2014 HTTP/HTTPS\n- \`dig\` / \`nslookup\` \u2014 DNS\n- \`openssl s_client\` \u2014 TLS handshake inspection\n\n## Key Tools\n\n**\`ss -tulpn\`** shows all listening TCP/UDP ports with process names. Modern replacement for \`netstat -tulpn\`.\n\n**\`tcpdump\`** captures packets at the kernel level:\n\`\`\`bash\ntcpdump -i eth0 -n -vvv port 443\n\`\`\`\n\`-n\` disables name resolution. \`-w capture.pcap\` writes to a file for Wireshark analysis.`,
    whenToUse: [
      'Diagnosing "connection refused" vs "connection timed out" — one means the port is closed, the other means a firewall is dropping packets',
      'Verifying a service is listening on the expected port with ss -tulpn',
      'Tracing DNS resolution failures with dig +trace',
      'Inspecting TLS certificate chains with openssl s_client',
    ],
    keyConcepts: [
      { term: 'ss -tulpn', definition: `List all **listening sockets**: TCP, UDP, listening only, with process name, no name resolution. Modern replacement for \`netstat -tulpn\`.` },
      { term: 'ip route', definition: `Show the **kernel routing table**. \`ip route get 8.8.8.8\` shows which interface and gateway will be used for a specific IP.` },
      { term: 'tcpdump', definition: `**Kernel-level packet capture**. \`tcpdump -i any -n port 80\` captures HTTP on all interfaces.` },
      { term: 'dig +trace', definition: `Perform a **full DNS resolution from root servers**, showing each delegation step.` },
      { term: 'curl -v', definition: `Shows full request/response headers including TLS handshake details. \`curl --resolve\` overrides DNS for testing specific backends.` },
    ],
    pitfalls: [
      'Confusing "connection refused" with "connection timed out" — refused means the port is actively closed (RST); timed out means packets are being dropped.',
      'Using netstat instead of ss on modern systems — ss uses kernel socket tables directly and is much faster.',
      'Running tcpdump without -n — reverse DNS lookups slow down the capture.',
    ],
    keyQuestions: [
      {
        question: 'A service cannot connect to a remote endpoint. Walk through your network diagnosis steps.',
        answer: `I work from **Layer 3 up to Layer 7**:\n\n## Step 1 \u2014 Routing and Reachability (Layer 3)\n\n\`\`\`bash\nping -c 3 <remote-ip>         # Is the host reachable?\nip route get <remote-ip>      # Which interface/gateway will be used?\n\`\`\`\n\nIf ping fails: check \`ip route\`, verify the gateway is reachable, check for firewall rules blocking ICMP.\n\n## Step 2 \u2014 TCP Connectivity (Layer 4)\n\n\`\`\`bash\nnc -zv <remote-ip> <port> -w 5\n\`\`\`\n\n- **Connection refused** \u2014 port is closed or service not listening\n- **Connection timed out** \u2014 firewall is dropping packets\n\n## Step 3 \u2014 DNS (if using a hostname)\n\n\`\`\`bash\ndig +short <hostname>    # Does it resolve?\ndig +trace <hostname>    # Full resolution from root\n\`\`\`\n\n## Step 4 \u2014 Application Layer\n\n\`\`\`bash\ncurl -v http://<remote>:<port>/healthz\nopenssl s_client -connect <remote>:<port>\n\`\`\`\n\n## Step 5 \u2014 Packet Capture\n\n\`\`\`bash\ntcpdump -i any -n host <remote-ip> and port <port>\n\`\`\`\n\n**Common findings:** security group blocking port, service bound to \`127.0.0.1\` instead of \`0.0.0.0\`, DNS resolving to unexpected IP.`,
      },
      {
        question: 'How do you capture and analyse packets for an HTTPS connection?',
        answer: `Without the TLS session keys, you can capture the **TLS handshake** (certificate, cipher suite, SNI) but not the payload.\n\n## Capture with tcpdump\n\n\`\`\`bash\ntcpdump -i any -n -w capture.pcap host api.example.com and port 443\n\`\`\`\n\n## Analyse the Handshake\n\n\`\`\`bash\n# Inspect the full certificate chain\nopenssl s_client -connect api.example.com:443 -showcerts\n\`\`\`\n\n## Decrypt the Payload (Your Own Services Only)\n\n\`\`\`bash\n# Set the key log file before running the client\nSSLKEYLOGFILE=/tmp/keys.log curl https://api.example.com\n\`\`\`\n\nThen in Wireshark: **Edit > Preferences > Protocols > TLS > (Pre)-Master-Secret log file** \u2014 point to \`keys.log\`. This only works for services where you **control the client**.`,
      },
    ],
    quickFire: [
      { q: 'What is the modern replacement for netstat and why is it better?', a: 'ss reads socket information directly from kernel socket tables, making it much faster than netstat which parses /proc files. ss -tulpn lists all listening TCP/UDP sockets with process names.' },
      { q: 'What is the difference between "connection refused" and "connection timed out"?', a: 'Refused means the host is reachable but the port is closed -- it sent a TCP RST. Timed out means packets are being silently dropped, usually by a firewall.' },
      { q: 'How do you check which process is listening on a specific port?', a: 'ss -tulpn | grep :443 or lsof -i :443. Both show the PID and process name for each listening socket.' },
      { q: 'What does tcpdump -n do and why is it important?', a: '-n disables reverse DNS lookups. Without it, tcpdump pauses on each packet to resolve IPs to hostnames, drastically slowing capture and potentially missing packets.' },
      { q: 'How do you perform a full DNS trace from root servers?', a: 'dig +trace example.com follows each delegation step from root (.) through TLD to the authoritative nameserver, showing exactly where resolution fails.' },
      { q: 'How do you quickly test if a TCP port is open without curl or telnet?', a: 'nc -zv hostname port -w 5. -z means do not send data, -v is verbose, -w 5 is a 5-second timeout.' },
      { q: 'What does ip route get 8.8.8.8 tell you?', a: 'It shows exactly which interface, source IP, and gateway the kernel will use to reach that specific destination, accounting for all routing rules and policies.' },
      { q: 'How do you inspect a TLS certificate from the command line?', a: 'openssl s_client -connect host:443 </dev/null 2>/dev/null | openssl x509 -noout -text shows the full certificate chain, expiry, SANs, and cipher negotiated.' },
      { q: 'What flag makes curl fail with a non-zero exit code on HTTP errors?', a: 'curl -f (or --fail). Without it, curl exits 0 even on 404 or 500 responses, silently passing health checks that should fail.' },
      { q: 'How do you write a tcpdump capture to a file for later analysis in Wireshark?', a: 'tcpdump -i eth0 -w capture.pcap host 10.0.0.1. Open the .pcap in Wireshark. Use -C 100 to rotate files at 100 MB if capturing long-running traffic.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/ip.8.html',
      'https://man7.org/linux/man-pages/man8/ss.8.html',
    ],
  },
  {
    id: 'linux-iptables',
    title: 'iptables & nftables',
    icon: 'shield',
    color: '#06b6d4',
    questions: 6,
    description: 'Netfilter tables, chains, rules, NAT, connection tracking, and Kubernetes kube-proxy iptables rules.',
    visualizations: [
      { title: 'iptables Packet Flow', description: 'RAW PREROUTING → NAT PREROUTING → routing decision → INPUT/FORWARD → NAT POSTROUTING', image: '/diagrams/linux/linux-iptables-flow.png' },
      { title: 'iptables Rule Anatomy', description: 'Table → chain → protocol → port → target (ACCEPT/DROP/REJECT/MASQUERADE/LOG) + stateful matching', image: '/diagrams/linux/linux-iptables-rules.png' },
    ],
    introduction: `**iptables** is the userspace interface to the Linux kernel's **Netfilter** packet filtering framework. **nftables** is the modern replacement, but iptables knowledge remains essential because Kubernetes \`kube-proxy\` still uses iptables mode by default.\n\n## Tables and Purposes\n\n- **\`filter\`** (default) \u2014 INPUT / FORWARD / OUTPUT chains \u2014 packet filtering\n- **\`nat\`** \u2014 PREROUTING / POSTROUTING \u2014 address translation\n- **\`mangle\`** \u2014 packet modification\n- **\`raw\`** \u2014 connection tracking bypass\n\n## Chains and Rule Evaluation\n\nRules in a chain are checked **top-to-bottom**; the first matching rule's target is applied. Targets: \`ACCEPT\`, \`DROP\`, \`REJECT\` (sends RST/ICMP), \`RETURN\`, \`LOG\`.\n\n## Connection Tracking\n\n**Connection tracking (conntrack)** allows stateful firewalling:\n\`\`\`bash\n-m conntrack --ctstate ESTABLISHED,RELATED\n\`\`\`\nThis allows return traffic without explicit rules for each port.\n\n## Kubernetes kube-proxy\n\n\`kube-proxy\` (iptables mode) installs **thousands of rules** to implement Services. Large Kubernetes clusters with many services have slow iptables rule updates because iptables replaces the entire ruleset atomically \u2014 **O(n)** for n rules. eBPF-based alternatives (Cilium, IPVS mode) solve this.`,
    whenToUse: [
      'Debugging connectivity in Kubernetes when pods cannot reach a Service ClusterIP',
      'Explaining how NAT masquerade enables containers to reach the internet',
      'Auditing iptables rules that may be blocking expected traffic',
    ],
    keyConcepts: [
      { term: 'Chains', definition: `Ordered lists of rules. Built-in chains: **INPUT** (to local process), **FORWARD** (routed through), **OUTPUT** (locally generated), **PREROUTING**, **POSTROUTING**.` },
      { term: 'Connection tracking', definition: `\`-m conntrack --ctstate ESTABLISHED,RELATED\` allows return traffic automatically without symmetric rules.` },
      { term: 'DNAT / SNAT', definition: `**DNAT** rewrites the destination IP (used by kube-proxy). **SNAT** rewrites the source IP (used for internet egress from private IPs).` },
      { term: 'MASQUERADE', definition: `**Dynamic SNAT** that uses the outgoing interface IP automatically. Used for containers needing internet access through the host.` },
      { term: 'Default policy', definition: `Action taken if **no rule matches**. For production hardening, set \`INPUT\` and \`FORWARD\` to \`DROP\`.` },
    ],
    pitfalls: [
      'Setting INPUT policy to DROP before adding SSH ACCEPT rule — locks you out. Always add ACCEPT rules first.',
      'Assuming iptables rules persist across reboots — they do not without iptables-persistent.',
      'Forgetting the nat table for port forwarding — filter rules do not affect NAT.',
    ],
    keyQuestions: [
      {
        question: 'How does Kubernetes kube-proxy use iptables to implement a ClusterIP service?',
        answer: `When you create a Service of type \`ClusterIP\`, **kube-proxy** installs iptables rules in the \`nat\` table.\n\n## The Mechanism\n\n1. A \`KUBE-SERVICES\` chain matches packets destined for the \`ClusterIP:port\`.\n2. That chain jumps to a per-service chain that **randomly distributes traffic** across backends using statistic-module rules.\n3. Each backend has a \`KUBE-SEP-*\` chain that **DNATs** the packet \u2014 rewrites destination IP from ClusterIP to Pod IP.\n4. Return traffic is handled by **connection tracking**.\n\n## Inspecting the Rules\n\n\`\`\`bash\niptables -t nat -L KUBE-SERVICES -n    # All service ClusterIP rules\niptables -t nat -L KUBE-SVC-* -n       # Endpoint selection rules\n\`\`\`\n\n## Scalability Problem\n\niptables replaces the **entire ruleset atomically**. With 10,000 services, each update requires reloading all rules. **IPVS mode** uses a hash table for O(1) lookup. **Cilium** bypasses iptables entirely with eBPF programs.`,
      },
      {
        question: 'How do you allow all outbound traffic but only allow inbound SSH and established return traffic?',
        answer: `\`\`\`bash\niptables -F   # Flush existing rules\n\n# Allow return traffic for established connections\niptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT\n\n# Allow inbound SSH\niptables -A INPUT -p tcp --dport 22 -j ACCEPT\n\n# Always allow loopback\niptables -A INPUT -i lo -j ACCEPT\n\n# Default deny INPUT and FORWARD; allow all outbound\niptables -P INPUT DROP\niptables -P FORWARD DROP\niptables -P OUTPUT ACCEPT\n\`\`\`\n\n## Critical Order\n\nThe \`ESTABLISHED,RELATED\` rule **must come before** the default DROP policy. Without it, no TCP reply would be allowed back in.\n\n## Verify\n\n\`\`\`bash\niptables -L INPUT -n -v --line-numbers\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What are the four built-in iptables tables and what is each for?', a: 'filter (packet allow/deny), nat (address translation), mangle (packet modification), raw (connection tracking bypass). filter is the default.' },
      { q: 'What is the difference between DROP and REJECT as iptables targets?', a: 'DROP silently discards the packet -- the sender gets no response and times out. REJECT discards it and sends back an ICMP unreachable or TCP RST, giving the sender immediate feedback.' },
      { q: 'What does connection tracking (-m conntrack) enable?', a: 'Stateful firewalling. ESTABLISHED,RELATED allows return traffic for connections you initiated without needing symmetric inbound rules for every port.' },
      { q: 'What is the difference between DNAT and SNAT?', a: 'DNAT rewrites the destination IP/port (used by kube-proxy to redirect ClusterIP traffic to pod IPs). SNAT rewrites the source IP (used for containers accessing the internet via the host IP).' },
      { q: 'Why is the order of iptables rules critical?', a: 'Rules in a chain are evaluated top-to-bottom and the first match wins. An ACCEPT rule for SSH must come before a DROP-all rule, or SSH will be blocked.' },
      { q: 'How do iptables rules survive reboots?', a: 'They do not by default. Use iptables-save > /etc/iptables/rules.v4 and install iptables-persistent, or use firewalld/nftables which have persistent configuration files.' },
      { q: 'Why does kube-proxy in iptables mode slow down with thousands of services?', a: 'iptables replaces the entire ruleset atomically on every update -- O(n) for n rules. With 10,000 services each update rewrites all rules. IPVS mode uses a hash table for O(1) lookup.' },
      { q: 'What does MASQUERADE do and when do you use it over SNAT?', a: 'MASQUERADE is dynamic SNAT that automatically uses the current IP of the outgoing interface. Use it when the public IP may change (DHCP). Use SNAT when the IP is static -- it is faster.' },
      { q: 'What is nftables and how does it relate to iptables?', a: 'nftables is the modern replacement for iptables, offering a unified ruleset for all protocol families, better performance, atomic rule updates, and a simpler syntax. iptables now uses nftables as a backend on most distros.' },
      { q: 'How do you list all current iptables rules with line numbers?', a: 'iptables -L INPUT -n -v --line-numbers. -n skips DNS lookups, -v shows packet counts, --line-numbers shows position for inserting or deleting specific rules.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/iptables.8.html',
      'https://kubernetes.io/docs/reference/networking/virtual-ips/',
    ],
  },
  // ─── PERFORMANCE ─────────────────────────────────────────────────────────────
  {
    id: 'linux-memory-management',
    title: 'Memory Management',
    icon: 'activity',
    color: '#f97316',
    questions: 7,
    description: 'Virtual memory, page cache, OOM killer, swap, huge pages, and container memory limits.',
    visualizations: [
      { title: 'Process Virtual Address Space', description: 'Stack (grows down) → mmap → heap (grows up) → BSS → data → text → vDSO', image: '/diagrams/linux/linux-memory-management-layout.png' },
      { title: 'Memory Reclaim & OOM', description: 'kswapd reclaims page cache first, swaps anonymous pages, OOM killer as last resort', image: '/diagrams/linux/linux-memory-management-reclaim.png' },
    ],
    introduction: `Linux uses a **virtual memory** system where every process sees a flat 64-bit address space. Physical RAM is managed in **4 KB pages**.\n\n## Page Cache\n\nThe **page cache** is the kernel's disk cache. Linux **deliberately keeps almost no RAM truly idle**. \`free -h\` shows \`buffers\` and \`cached\` columns. **\`available\` memory** (not \`free\`) is the realistic estimate of memory new processes can use.\n\n## Memory Pressure and Reclaim\n\nMemory pressure triggers reclaim: **\`kswapd\`** daemon scans and reclaims LRU pages. **File-backed pages** are simply dropped. **Anonymous pages** (heap, stack) must be written to swap before reclaim.\n\n## OOM Killer\n\nThe **OOM killer** activates when the system cannot reclaim enough memory. To protect a critical process:\n\`\`\`bash\necho -1000 > /proc/PID/oom_score_adj   # Never kill\necho 1000  > /proc/PID/oom_score_adj   # Kill first\n\`\`\`\n\n## Huge Pages\n\n**Transparent Huge Pages (THP)** can cause latency spikes \u2014 databases (Oracle, Cassandra, MongoDB) recommend disabling:\n\`\`\`bash\necho never > /sys/kernel/mm/transparent_hugepage/enabled\n\`\`\``,
    whenToUse: [
      'Explaining why a server with 2% "free" RAM is not out of memory — the page cache fills free RAM',
      'Debugging container OOMKilled events — memory limit too low or memory leak',
      'Recommending huge pages for a database workload to reduce TLB misses',
    ],
    keyConcepts: [
      { term: 'Page cache', definition: `Kernel uses **all free RAM** as a disk cache. The \`available\` column in \`free -h\` (not \`free\`) is what matters.` },
      { term: 'OOM killer', definition: `Kills a process when memory **cannot be reclaimed**. Selects victim by \`oom_score\`. Adjust \`oom_score_adj\` per-process (\`-1000\` to \`+1000\`).` },
      { term: 'Anonymous vs file-backed pages', definition: `**Anonymous pages** (heap/stack) must be swapped to disk before reclaim. **File-backed pages** can be dropped and re-read — much cheaper.` },
      { term: 'Transparent Huge Pages (THP)', definition: `2 MB pages managed automatically. Can cause **latency spikes** in databases. Disable with \`echo never > /sys/kernel/mm/transparent_hugepage/enabled\`.` },
      { term: 'cgroup memory limit', definition: `**Hard memory cap** per container. When exceeded, an OOM kill occurs within the cgroup, visible in \`dmesg\`.` },
    ],
    pitfalls: [
      'Treating "free" memory as available — use the "available" column in free -h.',
      'Setting container memory limits equal to process RSS without headroom for JVM overhead.',
      'Leaving THP enabled for database workloads — causes unpredictable latency spikes.',
    ],
    keyQuestions: [
      {
        question: 'Your Java application in Kubernetes keeps getting OOMKilled. How do you diagnose and fix it?',
        answer: `## Step 1 \u2014 Confirm the OOMKill\n\n\`\`\`bash\nkubectl describe pod <name>    # Look for OOMKilled, exitCode 137\ndmesg | grep -i oom            # Shows which process was killed\n\`\`\`\n\n## Step 2 \u2014 JVM Memory Breakdown\n\nThe JVM uses **more than just heap**:\n- **Heap** \u2014 controlled by \`-Xmx\`\n- **Metaspace** \u2014 class metadata (no limit by default pre-Java 8)\n- **Thread stacks** \u2014 each thread uses ~1 MB by default\n- **Direct buffers** \u2014 NIO, Netty, native libraries\n- **Code cache** \u2014 JIT-compiled native code\n\n## Step 3 \u2014 Common Fixes\n\n- Set **\`-XX:MaxRAMPercentage=75\`** \u2014 leaves 25% for non-heap overhead\n- Set **\`-XX:+UseContainerSupport\`** (default in Java 10+) so JVM reads cgroup limits\n- Increase container limit: \`resources.limits.memory: 2Gi\`\n- Cap Metaspace: \`-XX:MaxMetaspaceSize=256m\`\n\n## Step 4 \u2014 Monitor\n\n\`\`\`bash\nkubectl top pod <name>\n\`\`\``,
      },
      {
        question: 'What is the Linux OOM killer and how do you control which process it kills?',
        answer: `The **OOM killer** activates when the system cannot reclaim enough memory. It calculates an \`oom_score\` for each process (0-1000) and kills the **highest-scoring process**.\n\n## Controlling oom_score_adj\n\n\`\`\`bash\n# Range: -1000 to +1000\necho -1000 > /proc/\$(pgrep sshd)/oom_score_adj   # Never kill sshd\necho 500   > /proc/<worker_pid>/oom_score_adj     # Kill this worker first\n\`\`\`\n\n- **\`+1000\`** \u2014 always kill this process first\n- **\`-1000\`** \u2014 never kill this process\n\n## Kubernetes QoS Classes\n\nKubernetes sets \`oom_score_adj\` via **QoS class**:\n- **Guaranteed** (requests == limits) \u2014 \`oom_score_adj = -997\` (protected)\n- **BestEffort** (no requests/limits) \u2014 \`oom_score_adj = 1000\` (first to be killed)\n\nThis is why setting **proper requests and limits** is critical for production reliability.`,
      },
    ],
    quickFire: [
      { q: 'Why does "free" memory near 0% not mean the system is out of memory?', a: 'Linux fills free RAM with the page cache (disk cache). The "available" column in free -h shows realistic free memory -- it accounts for reclaimable cache.' },
      { q: 'What is the OOM killer and how does it pick its victim?', a: 'When memory cannot be reclaimed, the kernel kills a process to free RAM. It selects by oom_score (0-1000), which factors in memory usage and time running.' },
      { q: 'How do you protect a critical process from the OOM killer?', a: 'echo -1000 > /proc/PID/oom_score_adj makes the kernel never kill that process. echo 1000 makes it the first target. Range is -1000 to +1000.' },
      { q: 'What is the difference between anonymous pages and file-backed pages?', a: 'File-backed pages (page cache) can be dropped and re-read from disk cheaply. Anonymous pages (heap, stack) must be written to swap before reclaim, which is much more expensive.' },
      { q: 'What are Transparent Huge Pages and why do databases disable them?', a: 'THP automatically uses 2 MB pages instead of 4 KB pages. The background compaction (khugepaged) causes unpredictable latency spikes in latency-sensitive databases like Oracle, Cassandra, and Redis.' },
      { q: 'What does kswapd do?', a: 'kswapd is the kernel swap daemon that runs in the background reclaiming memory pages under memory pressure, freeing LRU file-backed pages first before touching anonymous pages.' },
      { q: 'Why does a Kubernetes Guaranteed QoS pod get oom_score_adj of -997?', a: 'Guaranteed pods have requests == limits, so they are expected to use exactly what they claimed. Kubernetes protects them from OOM eviction by assigning a low oom_score_adj.' },
      { q: 'What is swap and when does Linux use it?', a: 'Swap is disk space used to store anonymous memory pages evicted from RAM. Linux prefers to evict page cache first. vm.swappiness (default 60) controls the balance between evicting cache vs swapping.' },
      { q: 'How do you check actual memory usage of a process excluding shared libraries?', a: 'Look at RSSanon in /proc/PID/status or use smem -p to see PSS (proportional set size), which distributes shared memory proportionally among processes using it.' },
      { q: 'What does mmap() do differently from malloc() for large allocations?', a: 'malloc() uses brk() for small allocations (heap extension). For large allocations (typically > 128 KB), glibc uses mmap() to map anonymous pages directly, which can be returned to the OS independently.' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/admin-guide/mm/concepts.html',
    ],
  },
  // ─── STORAGE ──────────────────────────────────────────────────────────────
  {
    id: 'linux-lvm',
    title: 'LVM & Disk Management',
    icon: 'database',
    color: '#8b5cf6',
    questions: 5,
    description: 'Physical volumes, volume groups, logical volumes, snapshots, thin provisioning, and live resize.',
    visualizations: [
      { title: 'LVM Architecture', description: 'Physical Volumes → Volume Group (PE pool) → Logical Volumes → ext4/XFS filesystem', image: '/diagrams/linux/linux-lvm-layers.png' },
      { title: 'Online LVM Resize', description: 'Add disk → pvcreate → vgextend → lvextend → resize2fs/xfs_growfs without unmounting', image: '/diagrams/linux/linux-lvm-resize.png' },
    ],
    introduction: `**LVM (Logical Volume Manager)** adds a layer of abstraction between physical storage and filesystems.\n\n## Three-Tier Hierarchy\n\n- **Physical Volumes (PVs)** \u2014 raw disks initialised for LVM: \`pvcreate /dev/sdb\`\n- **Volume Groups (VGs)** \u2014 pool of PVs: \`vgcreate myvg /dev/sdb /dev/sdc\`\n- **Logical Volumes (LVs)** \u2014 virtual partitions: \`lvcreate -L 100G -n data myvg\`\n\n## Online Storage Extension\n\n\`\`\`bash\npvcreate /dev/sdd\nvgextend myvg /dev/sdd\nlvextend -l +100%FREE /dev/myvg/data\nresize2fs /dev/myvg/data    # ext4\nxfs_growfs /mnt/data        # XFS\n\`\`\`\n\n## LVM Snapshots\n\n**LVM snapshots** are copy-on-write:\n\`\`\`bash\nlvcreate -s -n snap -L 10G /dev/myvg/data\n\`\`\`\nUse snapshots for consistent backups of running databases. **The snapshot must be large enough** to hold all writes during the backup window.\n\n## Thin Provisioning\n\n**Thin provisioning** overcommits storage \u2014 allocating real blocks only when written. Useful for dev environments but **dangerous in production** without monitoring.`,
    whenToUse: [
      'Growing a volume for a database that is running out of disk space without downtime',
      'Creating a consistent database backup snapshot while the database is running',
      'Migrating data across disks with pvmove without taking services offline',
    ],
    keyConcepts: [
      { term: 'Physical Volume (PV)', definition: `A disk or partition **initialised with \`pvcreate\`**. Contains LVM metadata and Physical Extents (PE, typically 4 MB each).` },
      { term: 'Volume Group (VG)', definition: `A **pool of one or more PVs**. Logical Volumes are allocated from VG free space.` },
      { term: 'Logical Volume (LV)', definition: `A **virtual partition** within a VG. Has its own device path (\`/dev/VG/LV\`). Can span multiple PVs.` },
      { term: 'LVM snapshot', definition: `**Copy-on-write** point-in-time copy of an LV. Used for online backups — the snapshot presents the state at creation time.` },
      { term: 'pvmove', definition: `Migrates physical extents **from one PV to another** within the same VG. Allows hot removal of a disk without downtime.` },
    ],
    pitfalls: [
      'Taking an LVM snapshot that is too small — when the difference area fills, the snapshot becomes invalid. Size at 20-30% of the source LV.',
      'Using thin provisioning in production without monitoring — when the pool fills, all thin LVs become read-only simultaneously.',
      'Running resize2fs before lvextend — always extend the LV first, then the filesystem.',
    ],
    keyQuestions: [
      {
        question: 'Your /data partition is 95% full. How do you extend it online without restarting the service?',
        answer: `## Step 1 \u2014 Check Current State\n\n\`\`\`bash\ndf -h /data\nlvdisplay\nvgdisplay   # Check available free space in the VG\n\`\`\`\n\n## Step 2a \u2014 If VG Has Free Space\n\n\`\`\`bash\nlvextend -l +100%FREE /dev/myvg/data_lv\n\n# For ext4:\nresize2fs /dev/myvg/data_lv\n\n# For XFS (mount must be active):\nxfs_growfs /data\n\`\`\`\n\n## Step 2b \u2014 If VG Has No Free Space: Add a New Disk\n\n\`\`\`bash\npvcreate /dev/xvdf\nvgextend myvg /dev/xvdf\nlvextend -l +100%FREE /dev/myvg/data_lv\nresize2fs /dev/myvg/data_lv\n\`\`\`\n\n## Step 3 \u2014 Verify\n\n\`\`\`bash\ndf -h /data   # Should show the new size immediately\n\`\`\`\n\nThe entire operation is **online** for XFS and ext4 on LVM. The service never needs to stop.`,
      },
    ],
    quickFire: [
      { q: 'What are the three layers of LVM in order from physical to logical?', a: 'Physical Volumes (PVs) are raw disks. Volume Groups (VGs) pool one or more PVs. Logical Volumes (LVs) are virtual partitions carved from VG free space.' },
      { q: 'How do you extend an LV and filesystem online without downtime?', a: 'lvextend -l +100%FREE /dev/vg/lv, then resize2fs for ext4 or xfs_growfs for XFS. Both filesystem resizes work on live, mounted filesystems.' },
      { q: 'What is an LVM snapshot and how does it work?', a: 'A snapshot is a copy-on-write point-in-time view of an LV. Original blocks are copied to the snapshot area only when overwritten, keeping the snapshot cheap to create.' },
      { q: 'What happens if an LVM snapshot fills up?', a: 'The snapshot becomes invalid and is automatically deactivated. Size the snapshot to at least 20-30% of the source LV or use thin snapshots for dynamic allocation.' },
      { q: 'What does pvmove do?', a: 'pvmove migrates physical extents from one PV to another within the same VG while the LV remains online. Used to evacuate a disk before removal without downtime.' },
      { q: 'What is thin provisioning in LVM?', a: 'Thin provisioning overcommits storage -- logical volumes report more space than physically exists and real blocks are allocated only on first write. Dangerous in production without monitoring because all thin LVs become read-only when the pool fills.' },
      { q: 'What command adds a new physical disk to an existing volume group?', a: 'pvcreate /dev/sdd initializes the disk, then vgextend myvg /dev/sdd adds it to the VG. The new space is immediately available for lvextend.' },
      { q: 'What is a Physical Extent (PE)?', a: 'The smallest allocatable unit in LVM, typically 4 MB. LVM allocates space in whole PEs. Logical Volume sizes are rounded to PE boundaries.' },
      { q: 'How do you take a consistent database backup using LVM snapshots?', a: 'Flush and lock the database writes, create an LVM snapshot (fast, seconds), then unlock the database. Back up from the snapshot at leisure without blocking production writes.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/lvm.8.html',
    ],
  },
  // ─── SECURITY ────────────────────────────────────────────────────────────
  {
    id: 'linux-ssh-hardening',
    title: 'SSH Hardening',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'Key-based authentication, sshd_config hardening, jump hosts, port forwarding, and certificate-based auth.',
    visualizations: [
      { title: 'SSH Authentication Flow', description: 'TCP:22 → key exchange (ECDH) → host key verification → pubkey challenge/sign/verify → shell', image: '/diagrams/linux/linux-ssh-hardening-auth.png' },
      { title: 'sshd Hardening Settings', description: 'PasswordAuthentication no, PermitRootLogin no, restrict algorithms, fail2ban, optional 2FA', image: '/diagrams/linux/linux-ssh-hardening-config.png' },
    ],
    introduction: `**SSH** is the primary remote access mechanism for Linux servers. Default configurations are permissive; production servers require explicit hardening.\n\n## Authentication Hardening\n\n- Disable password authentication: \`PasswordAuthentication no\`\n- Disable root login: \`PermitRootLogin no\`\n- Restrict to specific users/groups: \`AllowUsers\`, \`AllowGroups\`\n- Use **ed25519** keys \u2014 faster and stronger than RSA 2048\n\n## Network Hardening\n\n- Change the default port (\`Port 2222\`) to reduce automated scan noise\n- Set \`MaxAuthTries 3\` and \`LoginGraceTime 30\`\n- Disable \`AllowTcpForwarding no\` and \`X11Forwarding no\` unless needed\n\n## Brute-Force Protection\n\n**\`fail2ban\`** automatically bans IPs with repeated failed authentication attempts.\n\n## SSH Agent Forwarding Risk\n\n\`ForwardAgent yes\` is a security risk \u2014 a compromised jump host can use your local agent. Use **\`ProxyJump\`** instead:\n\`\`\`bash\nssh -J jumphost target\n\`\`\``,
    whenToUse: [
      'Hardening a new EC2 instance before making it production-facing',
      'Setting up a bastion/jump host pattern for VPC access without a VPN',
      'Replacing ad-hoc key distribution with a CA-based SSH trust model',
    ],
    keyConcepts: [
      { term: 'PasswordAuthentication no', definition: `Disables **password login** for SSH. Essential for any internet-facing server — set in \`/etc/ssh/sshd_config\`.` },
      { term: 'ed25519 keys', definition: `Modern **elliptic curve** algorithm. Stronger than RSA 2048, faster to generate and sign. Generate with \`ssh-keygen -t ed25519\`.` },
      { term: 'ProxyJump', definition: `SSH through a jump host **without agent forwarding**: \`ssh -J user@jumphost user@target\`. The jump host never sees your private key.` },
      { term: 'SSH CA', definition: `A keypair that **signs user SSH certificates**. Servers trust the CA public key. Enables expiry and revocation without per-server authorized_keys.` },
      { term: 'fail2ban', definition: `Bans IPs with repeated failed authentication attempts by writing iptables rules.` },
    ],
    pitfalls: [
      'Using SSH agent forwarding through untrusted jump hosts — the jump host can abuse your agent socket.',
      'Setting PermitRootLogin without-password instead of no — still allows root login if an attacker has a key.',
      'Manual authorized_keys management at scale — use a CA or secrets manager (Vault SSH CA) for centralized management.',
    ],
    keyQuestions: [
      {
        question: 'How do you set up a secure bastion host pattern for accessing private EC2 instances?',
        answer: `## Architecture\n\nA **bastion (jump host)** is a hardened EC2 instance in a public subnet. Private instances allow SSH **only from the bastion's security group ID**.\n\n## Bastion Hardening\n\n\`\`\`bash\n# /etc/ssh/sshd_config\nPasswordAuthentication no\nPermitRootLogin no\nAllowUsers ec2-user\nMaxAuthTries 3\nClientAliveInterval 300\nClientAliveCountMax 2\n\`\`\`\n\nAdditional steps:\n- Security group: allow port 22 **only from your corporate IP ranges**\n- Install \`fail2ban\`\n- Enable CloudTrail and VPC Flow Logs\n\n## Client Configuration\n\n\`\`\`bash\n# ~/.ssh/config\nHost bastion\n  HostName <bastion-public-ip>\n  User ec2-user\n  IdentityFile ~/.ssh/prod.pem\n\nHost private-*\n  User ec2-user\n  IdentityFile ~/.ssh/prod.pem\n  ProxyJump bastion\n\`\`\`\n\nAccess: \`ssh private-db-01\` \u2014 SSH tunnels through the bastion automatically.\n\n## Even Better: No SSH Port at All\n\n**AWS Systems Manager Session Manager** \u2014 uses IAM for auth, no open port 22, all sessions logged to CloudTrail.`,
      },
      {
        question: 'Explain how certificate-based SSH works and why it is better than authorized_keys management.',
        answer: `## The Problem with authorized_keys at Scale\n\nEach user public key must be added to \`~/.ssh/authorized_keys\` on every server. At 100 users, 500 servers: 50,000 key entries. Revoking a key requires removing it from every server.\n\n## Certificate-Based SSH\n\n\`\`\`bash\n# 1. Generate a CA keypair\nssh-keygen -t ed25519 -f /etc/ssh/ca\n\n# 2. Configure servers to trust the CA\nTrustedUserCAKeys /etc/ssh/ca.pub\n\n# 3. Sign a user's public key (8-hour validity)\nssh-keygen -s /etc/ssh/ca -I "alice@company" -n "alice" -V +8h alice.pub\n\`\`\`\n\nThe server validates the cert signature against the CA public key \u2014 **no per-user authorized_keys needed**.\n\n## Advantages\n\n- **Add a new server:** just add \`TrustedUserCAKeys\` \u2014 instantly trusts all existing users\n- **Revoke a user:** add the cert serial to a **KRL** via \`ssh-keygen -k\`\n- **Forced rotation:** an 8-hour cert forces re-issuance 3x per day\n\n**Tools that implement this:** HashiCorp Vault SSH Secrets Engine, Teleport, BeyondTrust.`,
      },
    ],
    quickFire: [
      { q: 'What are the two most critical sshd_config settings for hardening?', a: 'PasswordAuthentication no prevents password brute-force. PermitRootLogin no prevents direct root compromise. Both are essential on any internet-facing server.' },
      { q: 'Why is ed25519 preferred over RSA 2048 for SSH keys?', a: 'ed25519 uses elliptic curve cryptography -- faster to generate and sign, smaller key size (68 chars vs 372), and provides equivalent security to RSA 3072.' },
      { q: 'What is the security risk with SSH agent forwarding?', a: 'A compromised jump host can use your local agent socket to authenticate as you to other servers. Use ProxyJump (-J) instead -- the jump host only forwards encrypted data, never sees your key.' },
      { q: 'How does ProxyJump differ from agent forwarding?', a: 'ProxyJump establishes a direct encrypted tunnel from your local machine through the jump host to the target. Your private key is used only locally; the jump host is just a TCP relay.' },
      { q: 'What does AllowUsers do in sshd_config?', a: 'Restricts SSH logins to a whitelist of usernames. All other users are denied even with valid credentials. Use AllowGroups for group-based access control.' },
      { q: 'What is fail2ban and how does it work?', a: 'fail2ban monitors log files for repeated failed authentication attempts and automatically adds iptables DROP rules for the offending IP after a configurable threshold.' },
      { q: 'What is certificate-based SSH and why is it better than authorized_keys?', a: 'A CA signs user public keys. Servers trust the CA public key, so any CA-signed cert is accepted without per-server authorized_keys entries. Supports expiry, revocation, and automatic rotation.' },
      { q: 'What is the MaxAuthTries setting for?', a: 'Limits the number of authentication attempts per connection. Setting it to 3-6 reduces brute-force effectiveness. After the limit, the connection is dropped.' },
      { q: 'How do you restrict SSH to only a specific source IP or CIDR?', a: 'Configure the firewall (iptables/security group) to allow port 22 only from trusted CIDRs, or use AllowUsers with a FromIP pattern: AllowUsers alice@10.0.0.0/8 in sshd_config.' },
      { q: 'What is AWS Systems Manager Session Manager and why is it preferable to a bastion?', a: 'SSM Session Manager provides shell access over HTTPS using IAM authentication with no open port 22, no SSH keys to manage, and all sessions logged to CloudTrail automatically.' },
    ],
    references: [
      'https://man.openbsd.org/sshd_config',
      'https://developer.hashicorp.com/vault/docs/secrets/ssh',
    ],
  },
  // ─── SYSTEMD ─────────────────────────────────────────────────────────────
  {
    id: 'systemd-units',
    title: 'systemd Units & Services',
    icon: 'settings',
    color: '#f59e0b',
    questions: 7,
    description: 'Unit files, service types, dependency ordering, socket activation, and service hardening directives.',
    visualizations: [
      { title: 'systemd Unit Lifecycle', description: 'inactive → activating → active → deactivating → inactive (or failed) state machine', image: '/diagrams/linux/systemd-units-lifecycle.png' },
      { title: 'Unit File Structure', description: '[Unit] After= deps, [Service] Type/ExecStart/Restart, security sandbox options, [Install] WantedBy', image: '/diagrams/linux/systemd-units-file.png' },
    ],
    introduction: `**systemd** is the init system and service manager on virtually all modern Linux distributions. It parallelizes service startup by tracking inter-service dependencies.\n\n## Unit File Locations\n\n- \`/usr/lib/systemd/system/\` \u2014 distribution packages (do not edit)\n- \`/etc/systemd/system/\` \u2014 admin overrides (preferred)\n- \`~/.config/systemd/user/\` \u2014 user units\n\n## Service Types\n\n- **\`simple\`** (default) \u2014 main process is ExecStart\n- **\`forking\`** \u2014 daemon forks; \`PIDFile\` must be set\n- **\`notify\`** \u2014 process sends \`sd_notify("READY=1")\` when ready\n- **\`oneshot\`** \u2014 completes and exits\n\n## Dependency Keywords\n\n- **\`Requires=\`** \u2014 hard dependency\n- **\`Wants=\`** \u2014 soft dependency\n- **\`After=\`** / **\`Before=\`** \u2014 ordering only; \`Requires=\` does not imply \`After=\`\n\n## Hardening Directives\n\n\`PrivateTmp\`, \`NoNewPrivileges\`, \`ProtectSystem=strict\`, \`CapabilityBoundingSet\` \u2014 implement least-privilege for system services.`,
    whenToUse: [
      'Writing a systemd service for a custom application (API server, background worker)',
      'Diagnosing why a service fails to start with "Failed to start" in systemctl status',
      'Hardening a service unit to run with minimal privileges',
    ],
    keyConcepts: [
      { term: 'Service type=notify', definition: `Service sends \`sd_notify("READY=1")\` when **initialization is complete**. systemd waits before starting dependent services.` },
      { term: 'After= vs Requires=', definition: `\`After=network.target\` means start after networking (ordering only). \`Requires=postgresql.service\` means **fail if postgres is not running** (dependency).` },
      { term: 'WantedBy=multi-user.target', definition: `Running \`systemctl enable\` creates a symlink in \`multi-user.target.wants/\`, causing the service to **start at boot**.` },
      { term: 'Restart=on-failure', definition: `Automatically restart if the service exits with a **non-zero exit code**. Combine with \`RestartSec=5\` to prevent tight crash loops.` },
      { term: 'Socket activation', definition: `systemd holds the **listening socket open** and passes it to the service on first connection. The service can restart without dropping connections.` },
    ],
    pitfalls: [
      'Using Requires= without After= — the dependency may not be fully initialized when the service starts.',
      'Setting Type=simple for a service that forks — systemd considers the unit active as soon as ExecStart returns.',
      'Forgetting to run systemctl daemon-reload after editing a unit file.',
    ],
    keyQuestions: [
      {
        question: 'Write a systemd service unit for a Node.js API server that should restart on failure and start after the network is up.',
        answer: `\`\`\`ini\n[Unit]\nDescription=Node.js API Server\nAfter=network.target\nWants=network.target\n\n[Service]\nType=simple\nUser=nodeapp\nGroup=nodeapp\nWorkingDirectory=/opt/api\nExecStart=/usr/bin/node /opt/api/server.js\nRestart=on-failure\nRestartSec=5\nEnvironment=NODE_ENV=production\nEnvironmentFile=-/opt/api/.env\n\nNoNewPrivileges=yes\nPrivateTmp=yes\nProtectSystem=strict\nReadWritePaths=/opt/api/logs\n\nStandardOutput=journal\nStandardError=journal\nSyslogIdentifier=api-server\n\n[Install]\nWantedBy=multi-user.target\n\`\`\`\n\n## Install and Start\n\n\`\`\`bash\ncp api.service /etc/systemd/system/\nsystemctl daemon-reload\nsystemctl enable --now api.service\njournalctl -u api-server -f\n\`\`\`\n\n## Key Decisions\n\n- **\`Type=simple\`** because Node.js does not fork\n- **\`Restart=on-failure\`** with \`RestartSec=5\` prevents tight crash loops\n- **\`EnvironmentFile=-/opt/api/.env\`** \u2014 the \`-\` prefix means failure to read the file is non-fatal`,
      },
      {
        question: 'Your systemd service is stuck in "activating" state. How do you diagnose it?',
        answer: `## Initial Inspection\n\n\`\`\`bash\nsystemctl status myservice\njournalctl -u myservice -n 50 --no-pager\n\`\`\`\n\n## Common Causes\n\n**\`Type=simple\`:** ExecStart is running but blocking:\n\`\`\`bash\nstrace -p <PID>\n\`\`\`\n\n**\`Type=forking\`:** the parent did not exit after forking, or \`PIDFile\` path is wrong.\n\n**\`Type=notify\`:** service never called \`sd_notify("READY=1")\`. Add a timeout:\n\`\`\`bash\nTimeoutStartSec=30\n\`\`\`\n\n## Check the Dependency Chain\n\n\`\`\`bash\n# Shows dependency chain and timing\nsystemd-analyze critical-chain myservice.service\n\n# Lists all dependencies\nsystemctl list-dependencies myservice.service\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between Requires= and Wants= in a unit file?', a: 'Requires= is a hard dependency -- if the required unit fails, this unit also fails. Wants= is soft -- this unit starts regardless of whether the wanted unit succeeds.' },
      { q: 'Does Requires= imply After=?', a: 'No. Requires= only declares a dependency, not ordering. Without After=, both units may start simultaneously. Always pair Requires=postgres.service with After=postgres.service.' },
      { q: 'What is Type=notify and why is it better than Type=simple for complex services?', a: 'With Type=notify the service sends sd_notify("READY=1") when fully initialized. systemd waits for this signal before starting dependent services, preventing race conditions.' },
      { q: 'What does systemctl daemon-reload do and when must you run it?', a: 'Reloads unit files from disk into systemd memory. Required after creating or editing any unit file. Without it, systemd still uses the old version of the file.' },
      { q: 'What does WantedBy=multi-user.target mean?', a: 'systemctl enable creates a symlink in multi-user.target.wants/ causing the service to start automatically at boot when the system reaches multi-user (normal) mode.' },
      { q: 'What is socket activation and what problem does it solve?', a: 'systemd holds the listening socket open and passes it to the service on the first connection. Services can restart without dropping connections -- clients queue during the restart gap.' },
      { q: 'What does Restart=on-failure do and what should RestartSec be set to?', a: 'Restarts the service automatically if it exits with a non-zero code. Set RestartSec=5 to prevent a tight crash loop from spinning the CPU and filling logs.' },
      { q: 'What is the EnvironmentFile= directive and what does the leading - mean?', a: 'EnvironmentFile=/path loads environment variables from a file. The leading - (dash) means failure to read the file is non-fatal -- the service still starts even if the file is missing.' },
      { q: 'How do you view live logs for a specific systemd service?', a: 'journalctl -u service-name -f for live tail, or journalctl -u service-name -n 100 --no-pager for the last 100 lines.' },
      { q: 'What does NoNewPrivileges=yes do in a service unit?', a: 'Prevents the service process from gaining additional privileges via setuid binaries or capability-gaining exec. It is an important sandbox hardening directive that stops privilege escalation.' },
    ],
    references: [
      'https://www.freedesktop.org/software/systemd/man/systemd.service.html',
    ],
  },
  {
    id: 'systemd-cgroups',
    title: 'cgroups & Namespaces',
    icon: 'settings',
    color: '#f59e0b',
    questions: 6,
    description: 'cgroups v1 vs v2, resource limits, container isolation mechanics, and namespace types.',
    visualizations: [
      { title: 'cgroup v2 Hierarchy', description: 'root → system.slice/user.slice/machine.slice → per-service cgroups with resource limits', image: '/diagrams/linux/systemd-cgroups-hierarchy.png' },
      { title: 'cgroup Controllers', description: 'cpu (CPUQuota%), memory (MemoryMax), io (IOReadBandwidthMax), pids (TasksMax) controllers', image: '/diagrams/linux/systemd-cgroups-controllers.png' },
    ],
    introduction: `**Control groups (cgroups)** and **namespaces** are the two kernel features that make containers possible. Cgroups provide resource limiting; namespaces provide isolation.\n\n## cgroups (v2)\n\nCgroups v2 organise processes into a hierarchy with **resource controllers**:\n- **\`cpu\`** \u2014 CPU time share and quota\n- **\`memory\`** \u2014 max RSS, swap, page cache\n- **\`io\`** \u2014 disk bandwidth\n- **\`pids\`** \u2014 max number of processes\n\nWhen a cgroup's memory limit is exceeded, the kernel **OOM-kills a process within that cgroup**.\n\n## Linux Namespaces\n\n- **\`pid\`** \u2014 container gets its own PID 1\n- **\`net\`** \u2014 own network interfaces and routing table\n- **\`mnt\`** \u2014 own filesystem mount points\n- **\`uts\`** \u2014 own hostname and domainname\n- **\`ipc\`** \u2014 own System V IPC\n- **\`user\`** \u2014 UID/GID mapping (uid 0 in container maps to unprivileged uid on host)\n\n## Containers Are Just Processes\n\nA container is a **process running in its own set of namespaces and controlled by a cgroup**. There is no container kernel \u2014 the same host kernel serves all containers. This is why **container isolation is weaker than VM isolation**: a container escape exploit can reach the host kernel directly.`,
    whenToUse: [
      'Explaining the technical difference between containers and VMs',
      'Debugging why a container is hitting its memory limit even though the app seems fine',
      'Designing rootless containers with user namespace mapping for defense in depth',
    ],
    keyConcepts: [
      { term: 'cgroup memory.max', definition: `**Hard limit** on memory usage in cgroup v2. In Docker: \`--memory\` flag. In Kubernetes: \`resources.limits.memory\`.` },
      { term: 'PID namespace', definition: `Each container sees its **own PID space starting at 1**. Container PID 1 maps to a higher PID on the host.` },
      { term: 'Network namespace', definition: `Each container gets its **own network stack**: \`lo\`, virtual ethernet pair (\`eth0\` inside, \`vethXXXX\` on host), own routing table.` },
      { term: 'User namespace', definition: `Maps UIDs inside the namespace to **different UIDs on the host**. Rootless containers: uid=0 inside maps to unprivileged uid on host.` },
      { term: 'Cgroup v2 unified hierarchy', definition: `**Single cgroup tree** with all resource controllers. Required for Kubernetes cgroup v2 support since Kubernetes 1.25.` },
    ],
    pitfalls: [
      'Setting container memory limit without accounting for page cache — Java apps reading large files can OOMKill even if heap is within limits.',
      'Relying on container isolation as a security boundary — a kernel exploit can break all containers on the host. Use VMs for strong security boundaries.',
      'Not setting CPU limits on Kubernetes pods — a pod can consume all CPU on a node.',
    ],
    keyQuestions: [
      {
        question: 'How do Linux namespaces enable container isolation? Walk through each namespace type.',
        answer: `## pid namespace\n\nContainer gets its **own PID number space starting at 1**. Processes in the container cannot see host PIDs. Killing PID 1 in the container may cascade to all children.\n\n## net namespace\n\nContainer gets its **own network stack**: own \`lo\`, virtual ethernet pair (\`eth0\` inside, \`vethXXXX\` on host), own routing table and iptables rules.\n\n## mnt namespace\n\nContainer has its **own mount table**. The container sees its rootfs (overlay filesystem). Mounts inside the container do not appear on the host.\n\n## uts namespace\n\nContainer has its **own hostname and NIS domainname**. Setting hostname inside the container does not affect the host.\n\n## user namespace\n\nMaps UIDs inside the container to **different UIDs on the host**. uid=0 inside the container maps to uid=100000 on the host. Makes rootless containers safe \u2014 even if a process escapes, it has no host privileges.\n\n## How Containers Are Created\n\nA container is created by calling \`unshare()\` or \`clone()\` with namespace flags, then \`execve()\`. Docker, containerd, and runc all use this mechanism.`,
      },
    ],
    quickFire: [
      { q: 'What are the two kernel features that make containers possible?', a: 'cgroups provide resource limiting (CPU, memory, I/O). Namespaces provide isolation (PID, network, filesystem, user). A container is a process with both applied.' },
      { q: 'What is the difference between cgroups v1 and v2?', a: 'cgroups v2 uses a unified hierarchy where all controllers are mounted under one tree, enabling consistent delegation. v1 allowed each controller to have its own hierarchy, creating configuration complexity.' },
      { q: 'What happens when a process exceeds its cgroup memory limit?', a: 'The kernel OOM-kills a process within that cgroup. In Kubernetes this appears as OOMKilled with exit code 137. The event is visible in dmesg and kubectl describe pod.' },
      { q: 'What do Linux namespaces provide that cgroups do not?', a: 'Isolation -- each namespace type (pid, net, mnt, uts, ipc, user) gives the process a private view of that resource. cgroups only limit resource consumption, not visibility.' },
      { q: 'Why is container security weaker than VM security?', a: 'Containers share the host kernel. A kernel exploit inside a container can affect the host. VMs have a hypervisor boundary; compromising the guest kernel does not directly reach the host kernel.' },
      { q: 'What does a user namespace do in rootless containers?', a: 'It maps UID 0 (root) inside the container to an unprivileged UID on the host. A process that escapes the container has no host privileges, providing defense in depth.' },
      { q: 'What does CPUQuota=50% mean in a systemd service unit?', a: 'The service cgroup can use at most 50% of one CPU core per second. On a 4-core machine it is still limited to 0.5 CPU, not 2 CPUs.' },
      { q: 'How do you inspect the cgroup of a running process?', a: 'cat /proc/PID/cgroup shows which cgroup hierarchy paths the process belongs to. systemctl status service also shows the cgroup path and current resource usage.' },
      { q: 'What is the pids controller in cgroups used for?', a: 'It limits the maximum number of processes (TasksMax in systemd) within a cgroup. Prevents fork bombs from exhausting the PID namespace and taking down the host.' },
      { q: 'What is the net namespace and what does each container get?', a: 'Each net namespace has its own network interfaces, routing table, iptables rules, and sockets. Containers communicate via veth pairs connected through the host bridge or overlay network.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man7/namespaces.7.html',
      'https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html',
    ],
  },

  // ─── STORAGE ───────────────────────────────────────────────────────────────
  {
    id: 'linux-disk-management',
    title: 'Disk Management',
    icon: 'database',
    color: '#8b5cf6',
    questions: 7,
    description: 'fdisk, gdisk, parted, mkfs, fsck, blkid, and smartctl for partitioning, formatting, and drive health.',
    visualizations: [
      { title: 'Partition Table Layout', description: 'MBR vs GPT partition structures and field breakdown', image: '/diagrams/linux/linux-disk-partition-table.png' },
      { title: 'Disk Tool Workflow', description: 'lsblk → fdisk/parted → mkfs → mount decision flow', image: '/diagrams/linux/linux-disk-tools-workflow.png' },
    ],
    introduction: `Disk management is a foundational SRE skill. Whether you are adding a data volume to a database server, replacing a failed drive, or setting up a new host, you need to understand partitioning schemes, filesystem creation, integrity checking, and drive health monitoring.\n\n## MBR vs GPT\n\n**MBR (Master Boot Record)** is the legacy scheme stored in the first 512 bytes of a disk. It supports at most **4 primary partitions** (or 3 primary + 1 extended with logical partitions inside) and disks up to **2 TiB**. Use \`fdisk\` to work with MBR disks.\n\n**GPT (GUID Partition Table)** is the modern standard. It supports up to **128 partitions** per disk and disks beyond 2 TiB. GPT stores a backup partition table at the end of the disk for recovery. Use \`gdisk\` or \`parted\` for GPT disks. All disks over 2 TiB must use GPT.\n\n## Key Tools\n\n- **\`lsblk -f\`** — list block devices with filesystem type, UUID, and mount point in a tree view\n- **\`blkid\`** — print UUID and TYPE for all block devices; used in \`/etc/fstab\`\n- **\`fdisk\` / \`gdisk\`** — interactive partition editors for MBR and GPT respectively\n- **\`parted\`** — non-interactive partitioning, scriptable, supports both MBR and GPT\n- **\`mkfs.ext4\`** / **\`mkfs.xfs\`** — create filesystems\n- **\`fsck\`** — filesystem consistency checker; never run on mounted filesystems\n- **\`smartctl\`** — query SMART (Self-Monitoring Analysis and Reporting Technology) data from drive firmware\n\n## Why UUID Over Device Name\n\nDevice names like \`/dev/sdb\` can change between reboots depending on probe order, PCI slot changes, or adding new disks. **UUIDs are stable** and assigned at filesystem creation. Always reference disks by UUID in \`/etc/fstab\` and bootloader configs.`,
    whenToUse: [
      'Adding a new data disk to a database server — partition with parted, format with mkfs.xfs, add UUID to fstab',
      'Investigating "No space left on device" errors — check df -h for blocks and df -i for inodes',
      'Proactively monitoring drive health in production — smartctl weekly cron job checking reallocated sectors',
      'Recovering from filesystem corruption after power loss — fsck.ext4 in single-user mode',
      'Migrating from MBR to GPT on a disk over 2 TiB — gdisk or parted required',
    ],
    keyConcepts: [
      { term: 'MBR', definition: `**Master Boot Record** — legacy partition scheme in the first 512 bytes. Max 4 primary partitions, max 2 TiB disk. Use \`fdisk\` to manage.` },
      { term: 'GPT', definition: `**GUID Partition Table** — modern scheme supporting 128+ partitions and disks beyond 2 TiB. Stores a backup partition table at disk end. Use \`gdisk\` or \`parted\`.` },
      { term: 'UUID', definition: `**Universally Unique Identifier** assigned at filesystem creation. Stable across reboots unlike \`/dev/sdX\` names. Retrieve with \`blkid\`. Always use in \`/etc/fstab\`.` },
      { term: 'SMART attributes', definition: `Drive firmware counters exposed via \`smartctl -a /dev/sda\`. Key ones: **Reallocated_Sector_Ct** (bad sectors remapped — rising count = drive failing), **Spin_Retry_Count**, **Uncorrectable_Error_Cnt**, **Power_On_Hours**.` },
      { term: 'fsck', definition: `**Filesystem check** — scans and repairs inconsistencies. Run only on **unmounted** or **read-only** filesystems. Use \`-n\` flag for a dry-run (read-only check with no writes).` },
      { term: 'parted', definition: `Scriptable partition tool supporting both MBR and GPT. Preferred for automation. \`parted /dev/sdb mklabel gpt mkpart primary 0% 100%\` creates a single GPT partition.` },
    ],
    pitfalls: [
      'Running fsck on a mounted filesystem — causes severe corruption. Always unmount first or boot to single-user mode.',
      'Using /dev/sdX device names in fstab — probe order can change, causing boot failure. Always use UUID= from blkid.',
      'Ignoring rising Reallocated_Sector_Ct in smartctl output — each remapped sector means the drive is silently failing. Replace the drive before it reaches the spare sector pool.',
      'Creating an MBR partition table on a disk larger than 2 TiB — the space beyond 2 TiB is silently inaccessible. Use GPT.',
    ],
    keyQuestions: [
      {
        question: 'Walk me through adding a new 4 TiB data disk to a Linux server from raw device to mounted filesystem.',
        answer: `## Step 1 — Identify the New Disk\n\n\`\`\`bash\nlsblk                    # find the new device, e.g. /dev/sdb\nfdisk -l /dev/sdb        # confirm size and no existing partition table\n\`\`\`\n\n## Step 2 — Partition with GPT (required for 4 TiB)\n\n\`\`\`bash\nparted /dev/sdb mklabel gpt\nparted /dev/sdb mkpart primary 0% 100%\nparted /dev/sdb print    # verify\n\`\`\`\n\n## Step 3 — Create Filesystem\n\n\`\`\`bash\n# XFS for large files and parallel I/O\nmkfs.xfs -L datavol /dev/sdb1\n\n# or ext4 with a label\nmkfs.ext4 -L datavol /dev/sdb1\n\`\`\`\n\n## Step 4 — Get UUID and Mount\n\n\`\`\`bash\nblkid /dev/sdb1          # note the UUID\nmkdir -p /data\nmount /dev/sdb1 /data\ndf -h /data              # confirm mounted\n\`\`\`\n\n## Step 5 — Persist in fstab\n\n\`\`\`bash\n# Add to /etc/fstab (always use UUID)\nUUID=<your-uuid>  /data  xfs  defaults,noatime  0  2\n\n# Test fstab is correct before next reboot\numount /data\nmount -a                 # remounts all fstab entries — will error if broken\n\`\`\``,
      },
      {
        question: 'How do you check if a disk is failing in production without taking downtime?',
        answer: `## SMART Self-Test (Non-Disruptive)\n\n\`\`\`bash\n# Check overall SMART health\nsmartctl -H /dev/sda\n\n# Full attribute dump\nsmartctl -a /dev/sda\n\n# Run a short self-test in the background (takes ~2 min, drive stays online)\nsmartctl -t short /dev/sda\n\n# Check results after test\nsmartctl -l selftest /dev/sda\n\`\`\`\n\n## Key SMART Attributes to Watch\n\n| Attribute | Meaning |\n|---|---|\n| **Reallocated_Sector_Ct** | Bad sectors remapped to spares — rising = drive failing |\n| **Current_Pending_Sector** | Sectors waiting to be remapped on next write |\n| **Offline_Uncorrectable** | Errors detected during offline testing |\n| **Spin_Retry_Count** | Spinup failures (HDDs) |\n\n## Kernel Errors\n\n\`\`\`bash\n# Kernel logs SCSI/SATA errors in real time\ndmesg | grep -E 'ata[0-9]|sd[a-z]|I/O error|reset'\njournalctl -k --since today | grep -i error\n\`\`\`\n\n## What Triggers Immediate Replacement\n\n- \`SMART overall-health self-assessment: FAILED\`\n- Reallocated_Sector_Ct raw value **above 0 and rising**\n- Repeated kernel I/O errors on the same device\n\nPre-failure replacement: schedule replacement when trend is rising even if SMART is still PASSED.`,
      },
      {
        question: 'What is the difference between fdisk, gdisk, and parted? When do you use each?',
        answer: `## fdisk — MBR Only\n\n\`fdisk\` is the classic interactive partitioner. It only understands **MBR** (MS-DOS) partition tables. Maximum disk size 2 TiB. Use for legacy systems or when you specifically need MBR.\n\n\`\`\`bash\nfdisk /dev/sdb\n# m for help, n for new partition, p for print, w to write\n\`\`\`\n\n## gdisk — GPT Equivalent of fdisk\n\n\`gdisk\` is the **GPT-aware** equivalent of fdisk, with nearly identical interactive interface. Use when you want the fdisk-style workflow but on a GPT disk.\n\n\`\`\`bash\ngdisk /dev/sdb\n# same key bindings as fdisk, operates on GPT\n\`\`\`\n\n## parted — Scriptable, Supports Both\n\n\`parted\` supports both MBR and GPT and is **non-interactive by default** — ideal for automation and Ansible playbooks.\n\n\`\`\`bash\nparted /dev/sdb mklabel gpt\nparted /dev/sdb mkpart primary xfs 0% 100%\nparted /dev/sdb print\n\`\`\`\n\n## Rule of Thumb\n\n- Disk **<= 2 TiB, legacy system**: use \`fdisk\`\n- Disk **> 2 TiB or modern system**: use \`gdisk\` or \`parted\`\n- **Automation / scripts**: always use \`parted\``,
      },
    ],
    quickFire: [
      { q: 'What is the key difference between MBR and GPT partition tables?', a: 'MBR supports max 4 primary partitions and disks up to 2 TiB. GPT supports 128 partitions and disks beyond 2 TiB. Any disk over 2 TiB requires GPT.' },
      { q: 'Why use UUID instead of /dev/sdb in /etc/fstab?', a: 'Device names like /dev/sdb depend on probe order and can change when disks are added or PCI slots change. UUIDs are assigned at filesystem creation and remain stable.' },
      { q: 'What does fsck do and when must you never run it?', a: 'fsck checks and repairs filesystem inconsistencies. Never run it on a mounted filesystem -- it causes severe corruption. Always unmount first or use single-user/rescue mode.' },
      { q: 'What SMART attribute most reliably predicts imminent drive failure?', a: 'Reallocated_Sector_Ct -- the count of bad sectors the drive has remapped to spare areas. Any non-zero and rising value means the drive is failing and should be replaced.' },
      { q: 'What does lsblk -f show?', a: 'A tree view of all block devices showing filesystem type, UUID, label, and mount point. The most useful first command when inventorying disks on a new system.' },
      { q: 'What is the difference between fdisk, gdisk, and parted?', a: 'fdisk handles MBR only. gdisk handles GPT with a similar interactive interface. parted handles both and is scriptable -- preferred for automation.' },
      { q: 'How do you run a non-disruptive SMART test on a production disk?', a: 'smartctl -t short /dev/sda runs a short self-test in the drive firmware background without interrupting I/O. Check results with smartctl -l selftest /dev/sda after ~2 minutes.' },
      { q: 'What does blkid output and where is it used?', a: 'blkid prints UUID, TYPE (filesystem), and LABEL for each block device. The UUID is what you copy into /etc/fstab to ensure stable mount references.' },
      { q: 'What does the mkfs -L flag do?', a: 'Sets a human-readable filesystem label (e.g., mkfs.xfs -L datavol /dev/sdb1). Labels can be used in fstab as LABEL=datavol as an alternative to UUID.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/fdisk.8.html',
      'https://man7.org/linux/man-pages/man8/smartctl.8.html',
      'https://man7.org/linux/man-pages/man8/fsck.8.html',
    ],
  },
  {
    id: 'linux-raid',
    title: 'Software RAID with mdadm',
    icon: 'database',
    color: '#8b5cf6',
    questions: 6,
    description: 'mdadm RAID levels 0/1/5/6/10, degraded arrays, rebuild monitoring, and replacing failed drives.',
    visualizations: [
      { title: 'RAID Levels Comparison', description: 'RAID 0/1/5/6/10 redundancy, performance, and usable space', image: '/diagrams/linux/linux-raid-levels.png' },
      { title: 'mdadm State Machine', description: 'clean → active → degraded → resyncing state transitions', image: '/diagrams/linux/linux-raid-mdadm-states.png' },
    ],
    introduction: `**Software RAID** uses the Linux kernel's \`md\` (multiple devices) subsystem to combine physical disks into a logical array with redundancy, performance, or both. Unlike hardware RAID controllers, software RAID is transparent, portable, and doesn't tie you to proprietary firmware.\n\n## RAID Levels\n\n**RAID 0 — Striping.** Data is split across all disks in stripes. Delivers maximum throughput (reads and writes scale with disk count) but **zero redundancy** — one disk failure loses everything. Use for scratch/temp storage where speed matters and data is ephemeral.\n\n**RAID 1 — Mirroring.** Each disk is an exact copy of the other. Tolerates **one disk failure**. Read throughput doubles (each disk can serve reads independently); write throughput is limited to the slowest disk. Minimum 2 disks.\n\n**RAID 5 — Distributed Parity.** Data and parity are striped across all disks. Can survive **one disk failure**. Minimum 3 disks; usable capacity is (N-1) disks. Parity computation adds write overhead — beware write hole on unclean shutdown (mitigated by write-intent bitmaps).\n\n**RAID 6 — Dual Parity.** Like RAID 5 but with two independent parity blocks per stripe. Survives **two simultaneous disk failures**. Minimum 4 disks. Rebuild of a RAID 5 array can itself fail during the rebuild (URE on a second disk) — RAID 6 is safer for large arrays.\n\n**RAID 10 — Striped Mirrors.** RAID 1 arrays striped together. Combines mirroring redundancy with striping throughput. Minimum 4 disks. Can survive multiple failures as long as no mirror loses both disks.\n\n## Key Files\n\n- **\`/proc/mdstat\`** — live rebuild progress, array state, and per-device status\n- **\`/etc/mdadm/mdadm.conf\`** — array configuration for boot-time assembly`,
    whenToUse: [
      'Replacing a failed disk in a production RAID 1 or RAID 5 array — mdadm --remove then --add',
      'Diagnosing why a server is running slow — degraded RAID array causes write penalty; check /proc/mdstat',
      'Deciding between RAID levels for a new database server — RAID 10 for OLTP, RAID 6 for capacity-optimised storage',
      'Monitoring rebuild progress after a disk replacement — watch /proc/mdstat or mdadm --detail',
    ],
    keyConcepts: [
      { term: 'RAID 0', definition: `**Striping** — maximum throughput, zero redundancy. Any single disk failure destroys all data. Use only for ephemeral scratch space.` },
      { term: 'RAID 1', definition: `**Mirroring** — exact copy on every disk. Tolerates one failure. Read throughput scales, write throughput does not. Minimum 2 disks.` },
      { term: 'RAID 5', definition: `**Distributed parity** — parity block rotated across all disks. Tolerates one failure, usable capacity = (N-1) disks. Minimum 3 disks. Risk of data loss during rebuild if a second disk fails (URE).` },
      { term: 'RAID 6', definition: `**Dual parity** — tolerates two simultaneous failures. Preferred for arrays with 6+ large disks where rebuild time is long and URE risk is high.` },
      { term: 'RAID 10', definition: `**Striped mirrors** — combines throughput of RAID 0 with redundancy of RAID 1. Minimum 4 disks. Best for OLTP databases.` },
      { term: '/proc/mdstat', definition: `Live kernel view of all \`md\` arrays. Shows state (clean, degraded, recovering), rebuild speed, and ETA. Monitor with \`watch -n1 cat /proc/mdstat\`.` },
    ],
    pitfalls: [
      'Using RAID 5 with large (8 TiB+) disks — rebuild time can exceed 24 hours, during which another disk URE causes unrecoverable data loss. Use RAID 6 for large drives.',
      'Confusing RAID with backup — RAID protects against disk failure, not against accidental deletion, corruption, or ransomware. Always have off-site backups.',
      'Not configuring write-intent bitmaps on RAID 5/6 — without bitmaps, an unclean shutdown causes a full array resync instead of just resyncing the dirty regions.',
      'Replacing the wrong disk in a degraded array — always double-check the serial number with smartctl before physically removing a drive.',
    ],
    keyQuestions: [
      {
        question: 'How do you replace a failed disk in a software RAID 5 array using mdadm?',
        answer: `## Step 1 — Confirm the Array State\n\n\`\`\`bash\ncat /proc/mdstat\nmdadm --detail /dev/md0\n# Look for: 1 failed, 2 active — state: degraded\n\`\`\`\n\n## Step 2 — Identify the Failed Disk\n\n\`\`\`bash\nmdadm --detail /dev/md0 | grep faulty\n# e.g. /dev/sdc  faulty spare\n\`\`\`\n\n## Step 3 — Mark as Failed and Remove (if not auto-removed)\n\n\`\`\`bash\nmdadm /dev/md0 --fail /dev/sdc\nmdadm /dev/md0 --remove /dev/sdc\n\`\`\`\n\n## Step 4 — Physically Replace the Disk\n\nConfirm serial number with \`smartctl -i /dev/sdc\` before pulling. Hot-swap if the server and backplane support it.\n\n## Step 5 — Partition the New Disk to Match\n\n\`\`\`bash\n# Copy the partition table from a healthy member disk\nsgdisk --replicate=/dev/sdd /dev/sdb   # GPT arrays\n# or for MBR:\nsfdisk -d /dev/sdb | sfdisk /dev/sdd\n\`\`\`\n\n## Step 6 — Add the New Disk to the Array\n\n\`\`\`bash\nmdadm /dev/md0 --add /dev/sdd1\n# Rebuild starts automatically\n\`\`\`\n\n## Step 7 — Monitor Rebuild\n\n\`\`\`bash\nwatch -n5 cat /proc/mdstat\n# Shows: [====>................] recovery = 23.4% (speed, ETA)\n\`\`\``,
      },
      {
        question: 'What is the difference between RAID 5 and RAID 6, and when would you choose one over the other?',
        answer: `## RAID 5\n\n- **Parity**: single distributed parity block per stripe\n- **Failure tolerance**: 1 disk\n- **Usable capacity**: (N-1) / N\n- **Minimum disks**: 3\n- **Risk**: During rebuild, if any remaining disk has an **Uncorrectable Read Error (URE)**, the rebuild fails and all data is lost. On modern large disks (4–16 TiB), the probability of a URE during a multi-hour rebuild is non-trivial.\n\n## RAID 6\n\n- **Parity**: two independent parity blocks (P+Q) per stripe\n- **Failure tolerance**: 2 disks simultaneously\n- **Usable capacity**: (N-2) / N\n- **Minimum disks**: 4\n- **Trade-off**: Slightly higher write overhead, but dramatically safer rebuilds\n\n## Decision Rule\n\n| Scenario | Choose |\n|---|---|\n| Small array (3-4 disks), disks < 4 TiB | RAID 5 |\n| Large array (6+ disks), disks >= 4 TiB | RAID 6 |\n| Maximum IOPS for databases | RAID 10 |\n| Maximum capacity, cost-sensitive | RAID 6 |\n\n## Practical Note\n\nCloud providers (AWS, GCP) replicate data at the storage layer — you rarely need software RAID in cloud VMs. Software RAID shines in bare-metal servers and homelab/on-prem environments.`,
      },
    ],
    quickFire: [
      { q: 'What RAID level stripes data across all disks with no redundancy?', a: 'RAID 0 stripes for maximum performance and capacity but has zero fault tolerance. Any single disk failure loses all data.' },
      { q: 'How many disks can fail in RAID 6 without data loss?', a: 'Two disks simultaneously. RAID 6 uses two independent parity blocks (P+Q) per stripe, making it safer than RAID 5 during rebuild on large disks.' },
      { q: 'What is the rebuild risk problem with RAID 5 on large disks?', a: 'During a RAID 5 rebuild, reading all remaining disks risks a second failure from an Uncorrectable Read Error (URE). The probability is non-trivial on 8+ TiB disks, making RAID 6 safer.' },
      { q: 'What RAID level combines mirroring and striping for best read/write performance with redundancy?', a: 'RAID 10 (1+0) stripes across mirrored pairs. It tolerates one disk per mirror pair failing, delivers high IOPS, but uses 50% of total disk capacity.' },
      { q: 'How do you check mdadm RAID array status?', a: 'cat /proc/mdstat shows all arrays, their state (clean/degraded), rebuild progress, and estimated completion time. mdadm --detail /dev/md0 gives full detail for one array.' },
      { q: 'What does a "degraded" mdadm array mean?', a: 'One or more disks have failed but the array is still online using parity or mirror redundancy. It is running without fault tolerance -- a second failure will cause data loss. Replace the failed disk immediately.' },
      { q: 'What is the command to add a hot spare to an mdadm array?', a: 'mdadm /dev/md0 --add /dev/sdd. A hot spare sits idle until a disk fails, then automatically starts a rebuild, minimizing the degraded window.' },
      { q: 'What does usable capacity look like for RAID 5 with 5 x 4 TiB disks?', a: '(N-1)/N of total = 4/5 x 20 TiB = 16 TiB usable. One disk worth of capacity is consumed by distributed parity.' },
      { q: 'How do you monitor a RAID rebuild in progress?', a: 'watch -n 1 cat /proc/mdstat shows live rebuild progress with speed and estimated time remaining. mdadm rebuilds are intentionally throttled to avoid saturating I/O.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/mdadm.8.html',
      'https://raid.wiki.kernel.org/index.php/RAID_setup',
    ],
  },
  {
    id: 'linux-mount-fstab',
    title: 'Mount & fstab',
    icon: 'database',
    color: '#8b5cf6',
    questions: 6,
    description: 'mount command, /etc/fstab format, bind mounts, tmpfs, noatime optimization, and autofs lazy mounting.',
    visualizations: [
      { title: 'fstab Fields Anatomy', description: 'All 6 /etc/fstab fields explained with examples', image: '/diagrams/linux/linux-mount-fstab-fields.png' },
      { title: 'Mount Namespace Layers', description: 'VFS → host NS → bind mounts → container NS hierarchy', image: '/diagrams/linux/linux-mount-namespace-layers.png' },
    ],
    introduction: `Mounting is the act of attaching a filesystem to a directory in the Linux VFS tree. The kernel's mount table tracks every mounted filesystem, its options, and its relationship to other mounts. Understanding mount options and \`/etc/fstab\` is essential for building reliable, performant storage configurations.\n\n## The mount Command\n\n\`mount -t <fstype> <device> <mountpoint>\` is the basic form. Common examples:\n\n\`\`\`bash\nmount -t ext4 /dev/sdb1 /mnt/data\nmount -t nfs 10.0.0.5:/exports/data /mnt/nfs\nmount -t tmpfs -o size=512m tmpfs /tmp/ramdisk\n\`\`\`\n\n## /etc/fstab Format\n\nEach line has **6 whitespace-separated fields**:\n\n1. **Device** — UUID=xxx, LABEL=xxx, or /dev/sdX\n2. **Mount point** — absolute path\n3. **Filesystem type** — ext4, xfs, nfs, tmpfs, etc.\n4. **Mount options** — comma-separated (defaults, noatime, ro, ...)\n5. **dump** — 0 (most modern systems) or 1 (back up with dump utility)\n6. **pass** — fsck order at boot: 0 = skip, 1 = root fs first, 2 = other fs\n\nExample:\n\`\`\`\nUUID=abc123  /data  xfs  defaults,noatime  0  2\n\`\`\`\n\n## Key Mount Options\n\n- **\`noatime\`** — do not update access time on reads. Eliminates a write for every read; significant I/O saving on busy filesystems. Use on all data volumes.\n- **\`ro\`** — mount read-only. Use for rescue operations or read-only bind mounts.\n- **\`noexec\`** — prevent execution of binaries. Use on \`/tmp\` and \`/var/tmp\` for security hardening.\n- **\`nosuid\`** — ignore setuid/setgid bits. Prevents privilege escalation via setuid binaries on mounted volumes.\n- **\`relatime\`** — update atime only when mtime is newer (a middle ground between atime and noatime).`,
    whenToUse: [
      'Adding a persistent data volume to a server — write UUID-based fstab entry and test with mount -a',
      'Creating a ramdisk for fast temporary storage — tmpfs with size limit prevents OOM',
      'Bind-mounting a directory into a chroot or container — mount --bind /host/path /chroot/path',
      'Remounting root read-write during recovery — mount -o remount,rw /',
      'Explaining why a server boots slow — fstab entry for a missing NFS share causes 90-second timeout',
    ],
    keyConcepts: [
      { term: 'fstab 6 fields', definition: `device, mountpoint, fstype, options, dump, pass. Field 6 (pass) controls \`fsck\` order: root=1, others=2, skip=0.` },
      { term: 'noatime', definition: `Suppresses **access time updates** on reads. Eliminates one write iop per read — measurable improvement on busy filesystems. Safe for almost all workloads; logs still track mtime.` },
      { term: 'Bind mount', definition: `\`mount --bind /src /dst\` makes the same filesystem tree visible at two paths. Used heavily by containers and chroots. Does not copy data.` },
      { term: 'tmpfs', definition: `**In-memory filesystem** backed by RAM and swap. Size-limited via \`size=\` option. Perfect for \`/tmp\` and build caches. Data is lost on unmount/reboot.` },
      { term: 'findmnt', definition: `Modern replacement for reading \`/proc/mounts\`. Shows mount tree with options, source, and propagation. \`findmnt -t xfs\` filters by type.` },
      { term: 'mount -o remount', definition: `Change mount options **without unmounting**. Common recovery pattern: \`mount -o remount,rw /\` to make root writable in single-user mode.` },
    ],
    pitfalls: [
      'Using device names like /dev/sdb1 in fstab instead of UUIDs — probe order can change, causing boot failure or mounting the wrong disk.',
      'Forgetting to run mount -a after editing fstab — errors in fstab are only discovered at the next reboot, which may leave the server unbootable. Always test with mount -a immediately.',
      'Setting pass=1 on multiple filesystems — only root should be 1. Other filesystems should be 2 or 0, otherwise fsck runs them sequentially, slowing boot.',
      'Mounting an NFS share without nofail option — if the NFS server is unreachable, the server hangs at boot for 90 seconds per mount. Always add nofail,_netdev for network mounts.',
    ],
    keyQuestions: [
      {
        question: 'Explain the /etc/fstab format and how you would safely add a new entry.',
        answer: `## fstab Field Reference\n\n\`\`\`\n# <device>         <mountpoint>  <type>  <options>           <dump> <pass>\nUUID=abc-123       /data         xfs     defaults,noatime    0      2\nUUID=def-456       /boot         ext4    defaults            0      2\ntmpfs              /tmp          tmpfs   size=1g,mode=1777   0      0\n10.0.0.5:/exports  /mnt/nfs      nfs     defaults,nofail,_netdev  0  0\n\`\`\`\n\n## Field Meanings\n\n1. **Device**: \`UUID=\` preferred — stable across reboots. Get with \`blkid\`.\n2. **Mount point**: Must exist before mounting (\`mkdir -p /data\`).\n3. **fstype**: \`ext4\`, \`xfs\`, \`nfs\`, \`tmpfs\`, \`auto\`.\n4. **Options**: Comma-separated. \`defaults\` = rw,suid,dev,exec,auto,nouser,async.\n5. **dump**: Almost always \`0\`. Legacy flag for the \`dump\` backup utility.\n6. **pass**: \`0\` = skip fsck, \`1\` = root filesystem only, \`2\` = check after root.\n\n## Safe Procedure for Adding an Entry\n\n\`\`\`bash\n# 1. Get UUID\nblkid /dev/sdb1\n\n# 2. Create mountpoint\nmkdir -p /data\n\n# 3. Add line to /etc/fstab (edit with your preferred editor)\n# UUID=<uuid>  /data  xfs  defaults,noatime  0  2\n\n# 4. Test immediately — reveals errors before next reboot\nmount -a\n\n# 5. Verify\ndf -h /data\nfindmnt /data\n\`\`\``,
      },
      {
        question: 'What is a bind mount and what are common production use cases?',
        answer: `## What is a Bind Mount\n\nA **bind mount** makes an existing directory visible at a second path in the filesystem tree. The source and destination share the same underlying inode — they are not copies.\n\n\`\`\`bash\nmount --bind /data/appdata /var/lib/app\n# Now /data/appdata and /var/lib/app show the same contents\n\`\`\`\n\nIn fstab:\n\`\`\`\n/data/appdata  /var/lib/app  none  bind  0  0\n\`\`\`\n\n## Production Use Cases\n\n**1. Container bind mounts** — Docker and Kubernetes mount host directories into containers using bind mounts:\n\`\`\`bash\ndocker run -v /host/data:/container/data myimage\n\`\`\`\n\n**2. Chroot isolation** — bind-mount /proc, /sys, /dev into a chroot before chrooting in:\n\`\`\`bash\nmount --bind /proc /mnt/chroot/proc\n\`\`\`\n\n**3. Read-only exposure** — bind-mount a directory read-only to give a process access without write permission:\n\`\`\`bash\nmount --bind /data/configs /app/configs\nmount -o remount,ro,bind /app/configs\n\`\`\`\n\n**4. Redirecting application paths** — if an app hardcodes /var/log but you want logs on a separate volume:\n\`\`\`bash\nmount --bind /mnt/logvol /var/log\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What are the 6 fields in an /etc/fstab entry in order?', a: 'Device (UUID=...), mount point, filesystem type, mount options, dump flag (0/1), and pass (fsck order: 0=skip, 1=root, 2=others).' },
      { q: 'What does the noatime mount option do?', a: 'Prevents updating the file access time on every read, eliminating a write I/O per read. A significant performance improvement on busy filesystems with negligible cost.' },
      { q: 'How do you safely test an fstab change before rebooting?', a: 'Run mount -a, which mounts all unmounted fstab entries. If it errors, you have time to fix the entry before the next reboot would leave the system unbootable.' },
      { q: 'What is a bind mount?', a: 'A bind mount makes an existing directory visible at a second path. mount --bind /src /dst. Used heavily by containers to expose host directories and by chroots to access /proc and /dev.' },
      { q: 'What is tmpfs and what happens to its data on reboot?', a: 'tmpfs is an in-memory filesystem backed by RAM and swap. It is fast but non-persistent -- all data is lost on unmount or reboot. Size-limited with the size= option.' },
      { q: 'Why should NFS fstab entries include the nofail option?', a: 'Without nofail, a missing NFS server causes the boot process to hang for 90 seconds per entry waiting for the mount to time out, potentially blocking the server from coming online.' },
      { q: 'What does mount -o remount,rw / do?', a: 'Remounts the root filesystem read-write without unmounting it. Essential rescue operation in single-user mode when root is mounted read-only for recovery.' },
      { q: 'What does the _netdev fstab option tell the init system?', a: 'It marks the filesystem as requiring the network to be up before mounting. systemd waits for network-online.target before mounting entries with _netdev.' },
      { q: 'How do you list all currently mounted filesystems with their options?', a: 'findmnt or findmnt -t xfs to filter by type. It shows the mount tree with source, target, fstype, and all options. cat /proc/mounts is the raw kernel version.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man5/fstab.5.html',
      'https://man7.org/linux/man-pages/man8/mount.8.html',
    ],
  },
  {
    id: 'linux-inodes',
    title: 'Inodes & Links',
    icon: 'database',
    color: '#8b5cf6',
    questions: 6,
    description: 'Inode structure, stat output, hard links vs symlinks, inode exhaustion diagnosis, and df -i.',
    visualizations: [
      { title: 'Inode Structure', description: 'Inode metadata and direct/indirect block pointer layout', image: '/diagrams/linux/linux-inodes-structure.png' },
      { title: 'Hard vs Symbolic Links', description: 'How hard links share inodes vs symlinks store path strings', image: '/diagrams/linux/linux-inodes-links.png' },
    ],
    introduction: `Every file and directory in a Linux filesystem is represented by an **inode** — a data structure stored in the filesystem's inode table. Understanding inodes is critical for diagnosing a range of subtle production issues, from "disk full" errors when the disk has free space, to files that persist on disk after deletion.\n\n## What an Inode Contains\n\nAn inode stores all file metadata **except the filename**:\n\n- **File type** — regular file, directory, symlink, device, socket, FIFO\n- **Permissions** — owner, group, and other read/write/execute bits\n- **Owner UID and GID**\n- **File size** in bytes\n- **Three timestamps**: \`atime\` (last access), \`mtime\` (last data modification), \`ctime\` (last inode/metadata change)\n- **Link count** — number of directory entries pointing to this inode\n- **Block pointers** — direct, indirect, double-indirect pointers to data blocks\n\n## Filenames Live in Directories\n\nThe filename itself is stored in the **directory entry**, which maps a name string to an inode number. This design enables **hard links** — multiple filenames pointing to the same inode.\n\n## Hard Links vs Symbolic Links\n\n**Hard link** (\`ln source hardlink\`): creates a new directory entry pointing to the **same inode**. The inode's link count increments. The file data is only freed when link count reaches zero **and** no process holds the file open. Hard links cannot cross filesystem boundaries and cannot link to directories.\n\n**Symbolic link** (\`ln -s target symlink\`): a special file whose **data is the target path string**. The symlink has its own inode. Can cross filesystem boundaries, can point to directories. Breaks if the target is moved or deleted (dangling symlink).\n\n## Inode Exhaustion\n\nFilesystems have a **fixed number of inodes** allocated at creation time (ext4) or dynamic allocation (XFS). When inodes are exhausted, new files cannot be created even if gigabytes of block space remain. The symptom is \`No space left on device\` from \`df -h\` showing free space — check \`df -i\` instead.`,
    whenToUse: [
      '"No space left on device" but df -h shows free space — immediately check df -i for inode exhaustion',
      'Debugging why deleting files does not free disk space — process holds open file descriptor',
      'Explaining why you cannot hard link across filesystems or to directories',
      'Finding which directory has millions of tiny files consuming all inodes',
      'Understanding how log rotation works — hard link counts ensure the old log stays accessible while the new one is created',
    ],
    keyConcepts: [
      { term: 'Inode', definition: `Metadata structure for every file: type, permissions, owner, size, timestamps, block pointers. Does **not** contain the filename. View with \`stat filename\` or \`ls -i\` for inode number.` },
      { term: 'Hard link', definition: `Additional directory entry pointing to the **same inode**. Link count in inode increments. Data freed only when count reaches 0 and no open fds. Cannot cross filesystem boundaries.` },
      { term: 'Symbolic link', definition: `A file whose **content is the target path**. Has its own inode. Can cross filesystems and point to directories. Becomes a **dangling symlink** if target is moved or deleted.` },
      { term: 'Inode exhaustion', definition: `When all inodes are allocated, new files cannot be created even with free blocks. Check with \`df -i\`. Common cause: millions of tiny files in mail queues, session stores, or small log files.` },
      { term: 'Link count', definition: `Field in the inode tracking how many directory entries point to it. A new directory has link count 2 (the entry in parent + the \`.\` entry inside itself). Each subdirectory adds 1 via its \`..\` entry.` },
      { term: 'ctime vs mtime', definition: `**mtime** — last data modification. **ctime** — last inode change (permissions, ownership, link count). \`ctime\` cannot be set manually — it updates whenever the inode changes.` },
    ],
    pitfalls: [
      'Checking only df -h when getting "No space left on device" — always also check df -i. Inode exhaustion produces the same error with free block space.',
      'Expecting hard links to work across filesystems — they cannot. Inode numbers are only unique within a single filesystem.',
      'Deleting a log file while the application has it open and expecting disk space to free immediately — the kernel keeps the data until the file descriptor is closed. Use lsof | grep deleted to find such files.',
      'Confusing ctime with creation time — ctime is inode change time, not creation time. Linux does not store creation time in standard inodes (ext4 does store it in the crtime field accessible via debugfs).',
    ],
    keyQuestions: [
      {
        question: 'Your server reports "No space left on device" but df -h shows 40% free. What do you do?',
        answer: `## Diagnosis\n\nThe error comes from **inode exhaustion** — all inodes allocated, no space to create new directory entries.\n\n\`\`\`bash\n# Check inode usage — look for Use% at or near 100%\ndf -i\n\n# Filesystem   Inodes   IUsed   IFree IUse% Mounted on\n# /dev/sda1   1048576  1048576      0  100% /\n\`\`\`\n\n## Find the Offender\n\n\`\`\`bash\n# Count files per directory — find directories with huge counts\nfind / -xdev -printf '%h\\n' | sort | uniq -c | sort -rn | head -20\n\n# Or count files per top-level directory\nfor d in /*; do echo -n "$d: "; find "$d" -xdev | wc -l; done 2>/dev/null\n\`\`\`\n\n## Common Causes\n\n- **Mail queue** (\`/var/spool/\`) — thousands of queued messages\n- **PHP session files** (\`/var/lib/php/sessions/\`) — never purged\n- **Small log files** — per-request log files from misconfigured apps\n- **Temp file leaks** in \`/tmp\`\n\n## Fix\n\n\`\`\`bash\n# Delete excess files (after identifying the directory)\nfind /var/spool/mqueue -type f -delete\n\n# Prevent recurrence: clean session files\nfind /var/lib/php/sessions -type f -mtime +1 -delete\n\`\`\`\n\n## Long-term Prevention\n\nSwitch to **XFS** for workloads with millions of small files — XFS uses dynamic inode allocation and does not have a fixed inode count.`,
      },
      {
        question: 'What is the difference between a hard link and a symbolic link? Give practical examples.',
        answer: `## Hard Link\n\n\`\`\`bash\nln /data/file.txt /data/file-hardlink.txt\nls -li /data/file*\n# Both show the same inode number\n# 1234567 -rw-r--r-- 2 user group 1024 /data/file.txt\n# 1234567 -rw-r--r-- 2 user group 1024 /data/file-hardlink.txt\n\`\`\`\n\n**Key hard link properties:**\n- Same inode number — same file, two names\n- Deleting one name does not remove the data\n- Works **only within the same filesystem**\n- Cannot link to directories (prevents cycles in the tree)\n\n## Symbolic Link\n\n\`\`\`bash\nln -s /data/file.txt /data/file-symlink.txt\nls -li /data/file*\n# Symlink has a DIFFERENT inode number\n# 9999999 lrwxrwxrwx 1 user group 14 /data/file-symlink.txt -> /data/file.txt\n\`\`\`\n\n**Key symlink properties:**\n- Own inode containing the target path as data\n- Can cross filesystem boundaries\n- Can point to directories\n- Breaks if target is moved or deleted (dangling)\n\n## stat to Inspect\n\n\`\`\`bash\nstat /data/file.txt\n# Shows: Inode: 1234567  Links: 2  (because of hard link)\n\nstat /data/file-symlink.txt\n# Shows: File: /data/file-symlink.txt -> /data/file.txt\n# Different inode from the target\n\`\`\`\n\n## Practical Uses\n\n- **Hard links**: \`logrotate\` uses hard links to atomically rename the old log without breaking open file descriptors\n- **Symlinks**: \`/etc/alternatives\`, Python virtual environments, \`/usr/local/bin/python -> python3.11\``,
      },
    ],
    quickFire: [
      { q: 'What does an inode number tell you and how do you see it?', a: 'The inode number is the unique identifier for a file within a filesystem. See it with ls -i or stat filename. Hard links share the same inode number.' },
      { q: 'What is the maximum number of hard links a file can have?', a: 'On ext4 the limit is 65000 links. Directories have a minimum of 2 (from . and their parent entry). Each hard link increments the inode link count.' },
      { q: 'How do you find all hard links to a specific inode?', a: 'find / -inum <inode-number> -print locates all directory entries pointing to that inode number, revealing every hard link to the file.' },
      { q: 'What happens to the inode when all hard links are removed?', a: 'The link count drops to zero. If no process has the file open, the kernel immediately frees the inode and its data blocks. If a process has it open, blocks are freed when the last fd is closed.' },
      { q: 'What is a dangling symlink?', a: 'A symbolic link whose target path no longer exists. The symlink file itself is intact but following it returns ENOENT. Find them with find -L . -type l -! -e.' },
      { q: 'Can a symlink point to another symlink?', a: 'Yes. The kernel follows symlink chains up to a depth limit (typically 40 hops) to prevent infinite loops. Exceeding the limit returns ELOOP.' },
      { q: 'What is inode exhaustion and which filesystem is most resistant to it?', a: 'Inode exhaustion is when all inodes are consumed so no new files can be created even with free blocks. XFS uses dynamic inode allocation and rarely exhausts inodes unlike ext4 which pre-allocates them.' },
      { q: 'What does stat show that ls -l does not?', a: 'stat shows the inode number, number of hard links, block count, all three timestamps (atime/mtime/ctime) with nanosecond precision, and the device major/minor numbers.' },
      { q: 'Why does ctime change when you chmod a file?', a: 'ctime tracks the last inode change, not just data modification. Any metadata change (permissions, owner, link count, rename) updates ctime without changing mtime.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man7/inode.7.html',
      'https://man7.org/linux/man-pages/man1/stat.1.html',
    ],
  },
  {
    id: 'linux-ext4-xfs',
    title: 'ext4, XFS & btrfs',
    icon: 'database',
    color: '#8b5cf6',
    questions: 6,
    description: 'ext4 journal modes, XFS advantages, tune2fs, xfs_repair, btrfs copy-on-write, and filesystem selection.',
    visualizations: [
      { title: 'ext4 Journal Write Flow', description: 'JBD2 transaction lifecycle from write() to checkpoint', image: '/diagrams/linux/linux-ext4-journal-flow.png' },
      { title: 'XFS Allocation Groups', description: 'Per-AG B-trees enabling parallel concurrent writes', image: '/diagrams/linux/linux-xfs-allocation-groups.png' },
    ],
    introduction: `Choosing the right filesystem has significant implications for performance, data integrity, and operational complexity. Linux ships three mature general-purpose filesystems — **ext4**, **XFS**, and **btrfs** — each with distinct trade-offs.\n\n## ext4\n\n**ext4** is the evolution of ext2/ext3 and the default on most Debian/Ubuntu/RHEL systems. Key features: **extents** (contiguous block ranges replacing block maps), **dir_index** (htree-indexed directories for large dirs), **journal** for crash consistency, delayed allocation, and online defragmentation.\n\n**Journal modes** control what the journal protects:\n- **\`writeback\`** — only metadata is journaled, data may be written before or after metadata. Fastest, least safe — can expose stale data in files after a crash.\n- **\`ordered\`** (default) — data written to disk before metadata journaled. Prevents stale data exposure. Good balance of safety and performance.\n- **\`journal\`** — both data and metadata are journaled. Safest, but doubles write I/O. Only useful for high-integrity requirements.\n\n## XFS\n\n**XFS** is a high-performance 64-bit journaling filesystem originally from SGI. It excels at **parallel I/O** (multiple allocation groups enable concurrent writes), **large files**, and workloads with millions of files. It uses **dynamic inode allocation** — no fixed inode limit. \`xfs_repair\` replaces fsck; online defrag with \`xfs_fsr\`.\n\n## btrfs\n\n**btrfs** is a **copy-on-write (COW)** filesystem with built-in RAID, snapshots, deduplication, and checksums. COW means writes never overwrite existing blocks — new data is written to free blocks, then the metadata updated atomically. This enables instant snapshots at zero cost.`,
    whenToUse: [
      'New database server — XFS for parallel I/O, no fixed inode limit, and excellent large-file performance',
      'Default /boot and system partitions on RHEL/Debian — ext4 is well-understood and universally supported',
      'Snapshot-heavy workloads (CI build cache, container images on disk) — btrfs or ZFS for COW snapshots',
      'Diagnosing filesystem errors — tune2fs -l to inspect ext4 state, xfs_info for XFS parameters',
      'Recovery from XFS corruption — xfs_repair (requires unmounted filesystem)',
    ],
    keyConcepts: [
      { term: 'ext4 journal modes', definition: `**writeback** = metadata only, fastest; **ordered** = data before metadata (default, safe); **journal** = data+metadata both journaled, safest but 2x write I/O.` },
      { term: 'tune2fs', definition: `Reads and modifies ext4 filesystem parameters. \`tune2fs -l /dev/sda1\` prints all metadata. \`tune2fs -e remount-ro /dev/sda1\` sets error behavior to remount read-only on detected errors.` },
      { term: 'XFS allocation groups', definition: `XFS divides the filesystem into **allocation groups** (typically 8). Each has its own free space B-tree and inode B-tree, enabling **parallel allocation** from multiple threads without lock contention.` },
      { term: 'xfs_repair', definition: `XFS consistency checker and repair tool. Unlike \`fsck.ext4\`, it does **not** need to be run routinely — XFS journal replays automatically. Run only after forced unmount or detected corruption. Requires **unmounted** filesystem.` },
      { term: 'btrfs COW', definition: `**Copy-on-write**: writes always go to new blocks. Old blocks remain until all references are released. Enables **instant snapshots** (just copy the root inode reference) and **checksums** (detected silently correctable errors).` },
      { term: 'xfs_freeze', definition: `\`xfs_freeze -f /mountpoint\` flushes all in-flight I/O and suspends writes. Used to create a **crash-consistent snapshot** of the underlying block device (LVM snapshot, EBS snapshot). Resume with \`xfs_freeze -u\`.` },
    ],
    pitfalls: [
      'Running fsck.ext4 on a mounted filesystem — causes severe corruption. Always unmount first or pass -n for a read-only check.',
      'Using ext4 ordered mode for databases and expecting full data durability — ordered mode only guarantees the filesystem tree is consistent, not that application data was flushed. Applications must call fsync() for durability guarantees.',
      'Mixing XFS and ext4 in the same RAID array with different stripe parameters — always set mkfs stripe geometry to match the RAID stripe size for optimal performance.',
      'Relying on btrfs RAID 5/6 for production data — btrfs RAID 5/6 has known data loss bugs. Use mdadm for RAID with btrfs on top if needed.',
    ],
    keyQuestions: [
      {
        question: 'How do you inspect and tune an ext4 filesystem? What does tune2fs show you?',
        answer: `## Read Filesystem Metadata\n\n\`\`\`bash\ntune2fs -l /dev/sda1\n\`\`\`\n\nKey fields in the output:\n\n| Field | Meaning |\n|---|---|\n| **Filesystem state** | clean / with errors — "with errors" means fsck needed |\n| **Errors behavior** | continue / remount-ro / panic |\n| **Mount count** / **Maximum mount count** | Legacy fsck trigger (usually disabled now) |\n| **Filesystem features** | extents, dir_index, has_journal, metadata_csum |\n| **Journal size** | Larger journal = faster recovery but more RAM |\n| **Last checked** | When fsck last ran |\n\n## Tune Error Behavior\n\n\`\`\`bash\n# Remount read-only on detected errors (safer than panic for servers)\ntune2fs -e remount-ro /dev/sda1\n\n# Change journal mode to writeback (faster, use only for non-critical data)\ntune2fs -o journal_data_writeback /dev/sda1\n\n# Disable legacy periodic fsck (modern systems use journal instead)\ntune2fs -c 0 -i 0 /dev/sda1\n\`\`\`\n\n## Check Features\n\n\`\`\`bash\ntune2fs -l /dev/sda1 | grep features\n# Filesystem features: has_journal ext_attr resize_inode dir_index filetype\n#   extent 64bit flex_bg sparse_super large_file huge_file uninit_bg\n#   dir_nlink extra_isize metadata_csum\n\`\`\`\n\n\`metadata_csum\` = ext4 metadata checksums (enabled by default on modern mkfs.ext4).`,
      },
      {
        question: 'When would you choose XFS over ext4 for a production server?',
        answer: `## Choose XFS When\n\n**1. Large files** — XFS uses extents natively and has no practical file size limit. Better performance for files > 1 GB than ext4 without tune.\n\n**2. High-parallelism workloads** — XFS allocation groups enable multiple threads to write simultaneously without lock contention. ext4 has a single journal lock. For databases with many concurrent writers, XFS throughput is higher.\n\n**3. Millions of files** — XFS dynamic inode allocation never exhausts inodes. ext4 fixes inode count at mkfs time.\n\n**4. Large filesystems** — XFS scales to 500 TiB; ext4 to 1 EiB on paper but practically much smaller. XFS performance is more consistent at scale.\n\n**5. Online grow** — \`xfs_growfs /mountpoint\` grows the filesystem while mounted. ext4 also supports online grow (\`resize2fs\`) but not online shrink (neither does XFS).\n\n## Choose ext4 When\n\n- You need **online filesystem shrink** — only ext4 supports it (offline)\n- Compatibility with very old kernels or bootloaders is required\n- Small filesystems where ext4 tooling familiarity matters\n- The workload is many small files with random writes (ext4 and XFS perform similarly here)\n\n## Real-World Rule\n\nRHEL/CentOS 7+ default to **XFS** for all partitions except \`/boot\`. This is the right call for most server workloads.`,
      },
    ],
    quickFire: [
      { q: 'What is the key architectural difference between ext4 and XFS?', a: 'ext4 uses a single allocation group with a global lock for metadata; XFS uses multiple allocation groups in parallel, giving it far better scalability for large files and parallel I/O.' },
      { q: 'Which filesystem should you choose for large sequential workloads like databases?', a: 'XFS. Its extent-based allocation, parallel AG design, and delayed allocation make it superior for large files and high-throughput workloads. It is the RHEL/CentOS default.' },
      { q: 'What does the journal do in a journaling filesystem?', a: 'Before writing metadata changes, the journal records the intended operation. If the system crashes mid-write, the journal is replayed on next mount to bring the filesystem to a consistent state.' },
      { q: 'How do you repair a corrupted ext4 filesystem?', a: 'fsck.ext4 -y /dev/sdb1 on an unmounted device. -y auto-answers yes to all repairs. Boot to rescue mode or use a live USB if repairing the root filesystem.' },
      { q: 'How do you repair a corrupted XFS filesystem?', a: 'xfs_repair /dev/sdb1 on an unmounted device. For the root filesystem, mount it read-only first (mount -o ro,remount /) then run xfs_repair.' },
      { q: 'What does tune2fs -l /dev/sda1 show?', a: 'The complete ext4 superblock: inode count, block count, mount count, last mount time, filesystem state, journal settings, and feature flags.' },
      { q: 'What is extent-based allocation in XFS and why does it matter?', a: 'XFS stores file data as extents (start block + length) instead of per-block pointers. This reduces metadata overhead for large files and enables efficient pre-allocation with xfs_alloc.' },
      { q: 'What is the nobarrier mount option and when is it unsafe?', a: 'nobarrier disables write barrier flushes between journal commit and data write, improving performance. It is unsafe without a battery-backed write cache -- a crash can corrupt the filesystem.' },
      { q: 'What does xfs_growfs do differently from resize2fs?', a: 'xfs_growfs operates on the mounted filesystem path (xfs_growfs /data), not the device. XFS cannot shrink; ext4 can shrink with resize2fs but only when unmounted.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/tune2fs.8.html',
      'https://man7.org/linux/man-pages/man8/xfs_repair.8.html',
      'https://wiki.archlinux.org/title/Ext4',
    ],
  },

  // ─── SECURITY ──────────────────────────────────────────────────────────────
  {
    id: 'linux-selinux',
    title: 'SELinux',
    icon: 'shield',
    color: '#ef4444',
    questions: 7,
    description: 'SELinux enforcing/permissive modes, contexts, audit2allow, chcon, semanage, and restorecon.',
    visualizations: [
      { title: 'Security Hardening Layers', description: 'Defense in depth: firewall → SSH → patching → least-privilege → audit → SELinux/AppArmor', image: '/diagrams/linux/linux-security-hardening-layers.png' },
    ],
    introduction: `**SELinux (Security-Enhanced Linux)** is a Mandatory Access Control (MAC) system built into the Linux kernel. Unlike Discretionary Access Control (DAC — the traditional Unix permission model), SELinux enforces policy rules that even the root user cannot override. Every process and file is labeled with a **security context**, and the policy defines which process labels may access which file labels.\n\n## MAC vs DAC\n\n**DAC** (traditional Unix permissions): the file owner decides who can access the file. Root can bypass all DAC restrictions. If a process is compromised, it inherits all the permissions of the user running it.\n\n**MAC** (SELinux): the security policy — written by administrators and defined by the OS vendor — controls access. Even root cannot access a resource if the SELinux policy denies it. A compromised web server running as root cannot read \`/etc/shadow\` if the policy prohibits \`httpd_t\` from accessing \`shadow_t\` files.\n\n## Three Modes\n\n- **Enforcing** — policy is enforced. Denials block the operation and are logged to \`/var/log/audit/audit.log\`.\n- **Permissive** — policy is not enforced but denials are logged. Use for debugging.\n- **Disabled** — SELinux is off. Requires a reboot to re-enable (inode relabeling required).\n\n## Context Format\n\nEvery file and process has a label in the format: \`user:role:type:level\`\n\n- \`user\` — SELinux user identity (e.g., \`system_u\`, \`unconfined_u\`)\n- \`role\` — SELinux role (e.g., \`object_r\` for files, \`system_r\` for daemons)\n- \`type\` — the primary enforcement dimension (e.g., \`httpd_sys_content_t\`)\n- \`level\` — MLS/MCS sensitivity level (e.g., \`s0\`)\n\nThe **type** field is what policy rules typically reference.`,
    whenToUse: [
      'A service fails to start and logs show "Permission denied" — check audit.log for AVC denials before disabling SELinux',
      'A web server cannot read its docroot after moving files — restorecon -Rv /var/www/html to restore contexts',
      'Adding a new custom port for a service — semanage port -a -t http_port_t -p tcp 8443',
      'Granting a custom application access to a resource — audit2allow to convert AVC denial to a policy module',
      'Checking if SELinux is the cause of a problem — set to permissive temporarily, reproduce the issue, then read denials',
    ],
    keyConcepts: [
      { term: 'Security context', definition: `Four-part label \`user:role:type:level\` on every file and process. The **type** field drives most policy rules. View with \`ls -Z\` (files) or \`ps -Z\` (processes).` },
      { term: 'AVC denial', definition: `**Access Vector Cache denial** — the kernel's record that SELinux blocked an operation. Found in \`/var/log/audit/audit.log\` as \`type=AVC\` lines. Contains subject context, object context, and the operation denied.` },
      { term: 'chcon', definition: `Changes a file's SELinux context **temporarily** (reset by relabeling or restorecon). \`chcon -t httpd_sys_content_t /data/site/\` — use only for testing; use \`semanage fcontext\` for persistent changes.` },
      { term: 'semanage fcontext', definition: `Records a **persistent** context rule in the policy database. \`semanage fcontext -a -t httpd_sys_content_t '/srv/mysite(/.*)?'\` then \`restorecon -Rv /srv/mysite\` to apply.` },
      { term: 'restorecon', definition: `Resets file contexts to the **policy default**. \`restorecon -Rv /var/www/html\` — \`-R\` for recursive, \`-v\` for verbose. Always run after semanage fcontext.` },
      { term: 'audit2allow', definition: `Reads AVC denials from audit.log and generates a **policy module** allowing those operations. \`audit2allow -M mypolicy < /var/log/audit/audit.log\` then \`semodule -i mypolicy.pp\`.` },
      { term: 'setsebool', definition: `Sets named **SELinux booleans** that toggle policy behaviors. \`setsebool -P httpd_can_network_connect on\` allows Apache to make outbound network connections. \`-P\` makes it persistent across reboots.` },
    ],
    pitfalls: [
      'Disabling SELinux (setenforce 0 or disabled in config) to fix a permission error — this removes a critical security layer. Instead, read the AVC denial and write the correct policy.',
      'Using chcon for permanent context changes — chcon is reset by restorecon or a relabel. Always use semanage fcontext for persistence.',
      'Forgetting to run restorecon after semanage fcontext — semanage writes the rule to the database but does not apply it to existing files. Both steps are required.',
      'Assuming permissive mode is safe for production — permissive mode logs denials but does not enforce them, meaning your MAC protections are completely inactive.',
    ],
    keyQuestions: [
      {
        question: 'Nginx fails to serve files from /srv/mysite. You see "Permission denied" in the error log. Walk through the SELinux diagnosis and fix.',
        answer: `## Step 1 — Check SELinux Mode\n\n\`\`\`bash\ngetenforce\n# If Enforcing, SELinux may be the cause\n\`\`\`\n\n## Step 2 — Check AVC Denials\n\n\`\`\`bash\n# Look for recent denials\naudit2why < /var/log/audit/audit.log | tail -50\n\n# Or directly\ngrep AVC /var/log/audit/audit.log | tail -20\n# type=AVC msg=audit(1234): avc: denied { read } for pid=1234 comm=\"nginx\"\n#   scontext=system_u:system_r:httpd_t:s0\n#   tcontext=unconfined_u:object_r:user_home_t:s0 tclass=file\n\`\`\`\n\n## Step 3 — Check File Context\n\n\`\`\`bash\nls -Z /srv/mysite\n# Shows: unconfined_u:object_r:user_home_t:s0 index.html\n# Should be: httpd_sys_content_t\n\`\`\`\n\n## Step 4 — Set Persistent Context\n\n\`\`\`bash\n# Add policy rule for /srv/mysite and all files inside\nsemanage fcontext -a -t httpd_sys_content_t '/srv/mysite(/.*)?'\n\n# Apply the rule to existing files\nrestorecon -Rv /srv/mysite\n\`\`\`\n\n## Step 5 — Verify\n\n\`\`\`bash\nls -Z /srv/mysite\n# Now: system_u:object_r:httpd_sys_content_t:s0 index.html\n# Reload nginx and test\n\`\`\``,
      },
      {
        question: 'What is audit2allow and when should you use it vs writing a proper policy?',
        answer: `## What audit2allow Does\n\n\`audit2allow\` reads **AVC denials** from the audit log and generates SELinux policy allow rules that would permit those operations.\n\n\`\`\`bash\n# Generate a policy module from recent denials\naudit2allow -M mypolicy < /var/log/audit/audit.log\n\n# Review the generated rules BEFORE applying\ncat mypolicy.te\n\n# Load the module\nsemodule -i mypolicy.pp\n\`\`\`\n\n## When It Is Appropriate\n\n- A **custom application** has unique access patterns not covered by stock policy\n- You have reviewed the generated \`.te\` file and the rules are specific and narrow\n- The application is well-understood and the access is legitimate\n\n## When It Is Dangerous\n\n- **Never run audit2allow on a production system that was potentially compromised** — you would be writing policy to allow the attacker's actions\n- Avoid generating policy from large audit logs without filtering — you capture legitimate denials alongside attacker activity\n\n## Filter to the Specific Application\n\n\`\`\`bash\n# Filter to only nginx denials\ngrep httpd /var/log/audit/audit.log | audit2allow -M nginx-custom\n\n# Or use ausearch to filter by time\nausearch -m avc -ts today | audit2allow -M mypolicy\n\`\`\`\n\n## Proper Fix vs Module Workaround\n\nBefore using audit2allow, always check:\n1. Is there an **SELinux boolean** that handles this? (\`getsebool -a | grep httpd\`)\n2. Is the file in the **wrong location**? (move to a standard path vs custom policy)\n3. Is there a **semanage fcontext** rule that covers this?`,
      },
    ],
    quickFire: [
      { q: 'What are the three SELinux enforcement modes?', a: 'Enforcing blocks and logs policy violations. Permissive logs but does not block (safe for testing). Disabled turns SELinux off entirely (requires reboot to re-enable with relabeling).' },
      { q: 'What does an SELinux context label look like?', a: 'user:role:type:level, for example system_u:object_r:httpd_sys_content_t:s0. The type field (ending in _t) is what policy rules primarily match on.' },
      { q: 'How do you check why SELinux is denying an operation?', a: 'ausearch -m avc -ts recent or sealert -a /var/log/audit/audit.log. The AVC denial message shows the source context, target context, and denied permission.' },
      { q: 'What command temporarily puts SELinux into permissive mode?', a: 'setenforce 0 switches to permissive immediately without a reboot. setenforce 1 re-enables enforcing. The permanent setting is SELINUX= in /etc/selinux/config.' },
      { q: 'Why would a file copied to /var/www/html not be served by Apache despite correct Unix permissions?', a: 'cp does not preserve SELinux context. The file gets the source directory context, not httpd_sys_content_t. Fix with restorecon -Rv /var/www/html.' },
      { q: 'What does restorecon do?', a: 'Restores SELinux file contexts to the policy default for that path. restorecon -Rv /var/www/html recursively relabels an entire directory tree.' },
      { q: 'How do you allow a non-standard port for a service in SELinux?', a: 'semanage port -a -t http_port_t -p tcp 8080 adds port 8080 to the allowed HTTP port types. Without this, httpd cannot bind to non-default ports even in permissive filesystem permissions.' },
      { q: 'What is the difference between SELinux and DAC (standard Unix permissions)?', a: 'DAC (Discretionary Access Control) is enforced by file owner and group bits -- the owner decides access. SELinux is MAC (Mandatory Access Control) -- the kernel policy decides, overriding owner decisions.' },
      { q: 'What does audit2allow do?', a: 'Reads AVC denial messages from the audit log and generates SELinux policy module source that would allow the denied operations. Use for creating custom policy modules for legitimate app behavior.' },
      { q: 'How do you make an SELinux boolean change persistent across reboots?', a: 'setsebool -P httpd_can_network_connect on. The -P flag writes the change to the policy store permanently. Without -P, the boolean reverts on reboot.' },
    ],
    references: [
      'https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/index',
      'https://man7.org/linux/man-pages/man8/semanage.8.html',
    ],
  },
  {
    id: 'linux-apparmor',
    title: 'AppArmor',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'AppArmor profiles, complain vs enforce mode, aa-genprof, aa-logprof, and path-based MAC.',
    visualizations: [
      { title: 'AppArmor Enforcement Modes', description: 'Unconfined → Complain → Enforce mode transitions', image: '/diagrams/linux/linux-apparmor-modes.png' },
      { title: 'Rule Matching Flow', description: 'How LSM hooks check profile rules on every operation', image: '/diagrams/linux/linux-apparmor-rule-match.png' },
    ],
    introduction: `**AppArmor** is a Mandatory Access Control (MAC) system for Linux that confines programs to a limited set of resources. Unlike SELinux which labels every file with a security context, AppArmor uses **path-based profiles** — rules that reference filesystem paths directly. This makes AppArmor significantly easier to write and audit than SELinux, at the cost of some flexibility.\n\nAppArmor is the default MAC system on **Ubuntu**, **Debian**, and **SUSE** distributions, while RHEL/Fedora use SELinux.\n\n## Profile Anatomy\n\nA profile lives in \`/etc/apparmor.d/\` and has this general structure:\n\n\`\`\`\n#include <tunables/global>\n\nprofile nginx /usr/sbin/nginx {\n  #include <abstractions/base>\n  #include <abstractions/nameservice>\n\n  capability net_bind_service,\n  capability setgid,\n  capability setuid,\n\n  /var/www/html/** r,\n  /var/log/nginx/** w,\n  /etc/nginx/** r,\n  /run/nginx.pid rw,\n  network tcp,\n}\n\`\`\`\n\n## File Permission Letters\n\n- **\`r\`** — read\n- **\`w\`** — write\n- **\`x\`** — execute\n- **\`k\`** — lock\n- **\`m\`** — mmap\n- **\`l\`** — link\n\n## Two Enforcement Modes\n\n**Enforce** — violations are blocked and logged. The profile is fully active.\n\n**Complain** — violations are logged but **not blocked**. Use for profile development and auditing. Equivalent to SELinux permissive mode for that specific profile.\n\nProfiles can be in different modes simultaneously — you can put a new custom app profile in complain while leaving all system profiles in enforce.`,
    whenToUse: [
      'Confining a third-party application to only the paths it legitimately needs — aa-genprof to build an initial profile',
      'Hardening Docker/container workloads on Ubuntu — Docker ships a default AppArmor profile applied to all containers',
      'Investigating why an application is blocked — check /var/log/syslog or journalctl for DENIED messages',
      'Iteratively building a profile with aa-logprof — run in complain mode, exercise the app, then review and add denials as allow rules',
      'Auditing which profiles are loaded and their modes — aa-status',
    ],
    keyConcepts: [
      { term: 'Profile', definition: `A file in \`/etc/apparmor.d/\` defining which files, capabilities, and network resources a binary may access. Keyed by the **absolute path to the binary**.` },
      { term: 'Enforce mode', definition: `Policy violations are **blocked and logged**. The profile is fully active. Set with \`aa-enforce /etc/apparmor.d/profile\`.` },
      { term: 'Complain mode', definition: `Policy violations are **logged but allowed**. Used for profile development. Set with \`aa-complain /etc/apparmor.d/profile\`. Equivalent to SELinux permissive for that profile.` },
      { term: 'aa-genprof', definition: `**Interactive profile generator**. Runs the application, monitors what it accesses, and interactively asks you to allow or deny each access. Produces an initial profile.` },
      { term: 'aa-logprof', definition: `Reads log events from a profile in **complain mode** and interactively offers to add allow rules to the profile. Use after exercising the application in complain mode.` },
      { term: 'Abstractions', definition: `**Reusable profile snippets** in \`/etc/apparmor.d/abstractions/\`. \`#include <abstractions/base>\` grants access to common libraries. Reduces boilerplate in profiles.` },
    ],
    pitfalls: [
      'Disabling AppArmor entirely (apparmor=0 kernel param) when a profile blocks an application — put the profile in complain mode instead and fix the profile.',
      'Forgetting to reload the profile after editing — changes to /etc/apparmor.d/ files are not live until you run apparmor_parser -r or systemctl reload apparmor.',
      'Assuming complain mode protects the system — complain mode only logs, it does not block. Never consider complain mode as a security boundary.',
      'Not testing profiles with all application code paths — profiles written from a single run may miss access patterns exercised by less-common features. Use complain mode with comprehensive testing.',
    ],
    keyQuestions: [
      {
        question: 'How do you create an AppArmor profile for a new custom application?',
        answer: `## Method 1 — aa-genprof (Interactive)\n\n\`\`\`bash\n# Install apparmor-utils\napt install apparmor-utils\n\n# Start profile generation (put app in learning mode)\naa-genprof /usr/local/bin/myapp\n\n# In another terminal, run the application through its use cases\n/usr/local/bin/myapp --config /etc/myapp/config.yaml\n\n# Back in aa-genprof: press S to scan logs, answer allow/deny for each access\n# Press F when done — saves profile to /etc/apparmor.d/\n\`\`\`\n\n## Method 2 — Manual + Complain Mode\n\n\`\`\`bash\n# Create a minimal profile\ncat > /etc/apparmor.d/usr.local.bin.myapp << 'EOF'\n#include <tunables/global>\n\nprofile myapp /usr/local/bin/myapp flags=(complain) {\n  #include <abstractions/base>\n  /etc/myapp/** r,\n  /var/log/myapp/ w,\n  /var/log/myapp/*.log w,\n}\nEOF\n\n# Load it\napparmor_parser -r /etc/apparmor.d/usr.local.bin.myapp\n\n# Run app in complain mode, watch logs\njournalctl -f | grep ALLOWED\n\n# After testing, use aa-logprof to update profile\naa-logprof\n\n# Switch to enforce when satisfied\naa-enforce /etc/apparmor.d/usr.local.bin.myapp\n\`\`\``,
      },
      {
        question: 'How does AppArmor compare to SELinux? When would you choose one over the other?',
        answer: `## AppArmor — Path-Based MAC\n\n- Rules reference **filesystem paths** (e.g., \`/var/www/html/** r\`)\n- Much easier to write and understand — a human can read a profile directly\n- Profile keys on the **binary path** — moving the binary to a different path breaks the profile\n- Ships as default on Ubuntu, Debian, SUSE\n- Weaker against **symlink attacks** — path-based rules can be bypassed by symlinks in some configurations\n\n## SELinux — Label-Based MAC\n\n- Every file and process has a **security context label** — rules reference labels, not paths\n- More flexible and harder to bypass — labels follow the inode, not the path\n- Dramatically more complex to write and debug\n- Ships as default on RHEL, Fedora, CentOS\n- Provides **multi-level security (MLS)** for high-security environments\n\n## When to Choose\n\n| Situation | Choose |\n|---|---|\n| Ubuntu/Debian server, ops team unfamiliar with SELinux | AppArmor |\n| RHEL/Fedora environment (SELinux is default) | SELinux |\n| High-security / government / classified workloads | SELinux with MLS |\n| Containerized workloads on Ubuntu | AppArmor (Docker integrates with it) |\n| You need fine-grained control over network sockets and IPC | SELinux |\n\n## Practical Advice\n\nUse whichever is the **default on your distribution**. Never disable either in production — learn to write profiles/policies instead.`,
      },
    ],
    quickFire: [
      { q: 'What is the difference between AppArmor and SELinux?', a: 'AppArmor uses path-based profiles (per executable, per file path). SELinux uses label-based MAC applied to every object. AppArmor is simpler to configure; SELinux provides stronger guarantees.' },
      { q: 'What are the two AppArmor enforcement modes?', a: 'Enforce blocks and logs violations. Complain (permissive) logs violations but does not block, allowing safe profiling of an application before enforcement.' },
      { q: 'How do you check the AppArmor status of all profiles?', a: 'aa-status shows all loaded profiles and whether each is in enforce or complain mode. apparmor_status is an alias on some distros.' },
      { q: 'How do you put a specific AppArmor profile into complain mode?', a: 'aa-complain /etc/apparmor.d/usr.sbin.nginx. This is useful for testing a new profile without blocking application traffic.' },
      { q: 'Where are AppArmor profiles stored?', a: 'System profiles live in /etc/apparmor.d/. Local overrides and additions go in /etc/apparmor.d/local/. Profiles are plain text files named after the binary path with / replaced by dots.' },
      { q: 'How do you reload an AppArmor profile after editing it?', a: 'apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx reloads and enforces the updated profile without restarting the service.' },
      { q: 'What does a Kubernetes PodSecurityPolicy or securityContext appArmorProfile field do?', a: 'It applies a named AppArmor profile to a container at runtime. The profile must be loaded on every node the pod can schedule to. Enforces allowed syscalls and file access per container.' },
      { q: 'How do AppArmor denials appear in logs?', a: 'In /var/log/syslog or journalctl -k, AppArmor denials appear as: apparmor="DENIED" operation="open" profile="..." name="/path/to/file". Use aa-logprof to parse and suggest profile updates.' },
      { q: 'What does aa-genprof do?', a: 'aa-genprof generates an AppArmor profile by running the application in complain mode and interactively prompting you to allow or deny each logged access, building a profile from real behavior.' },
    ],
    references: [
      'https://apparmor.net/documentation/',
      'https://man7.org/linux/man-pages/man5/apparmor.d.5.html',
      'https://ubuntu.com/server/docs/security-apparmor',
    ],
  },
  {
    id: 'linux-sudo-pam',
    title: 'sudo & PAM',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'sudoers syntax, NOPASSWD, visudo, PAM modules, pam_faillock, and /etc/pam.d structure.',
    visualizations: [
      { title: 'PAM Authentication Stack', description: 'auth → account → session phases and control flags', image: '/diagrams/linux/linux-sudo-pam-stack.png' },
      { title: 'sudo Privilege Flow', description: 'sudoers parse → PAM auth → exec as target user', image: '/diagrams/linux/linux-sudo-privilege-flow.png' },
    ],
    introduction: `**sudo** and **PAM** are the two central pillars of privilege management and authentication on Linux systems. \`sudo\` controls **who can run what commands as which user**, while PAM (Pluggable Authentication Modules) controls **how users authenticate**.\n\n## sudo\n\n\`sudo\` allows permitted users to run commands with elevated (or different-user) privileges. The policy is defined in \`/etc/sudoers\` and files in \`/etc/sudoers.d/\`.\n\n**Always edit sudoers with \`visudo\`** — it locks the file, validates syntax before saving, and prevents saving a broken sudoers that would lock you out of sudo entirely.\n\nSudoers rule syntax:\n\n\`\`\`\nUSER HOST=(RUNAS) COMMAND\n%GROUP HOST=(RUNAS) COMMAND\n\`\`\`\n\nExamples:\n- \`alice ALL=(ALL) ALL\` — alice can run any command as any user on any host\n- \`%ops ALL=(ALL) NOPASSWD: /bin/systemctl\` — ops group can run systemctl without password\n- \`deploy ALL=(www-data) NOPASSWD: /usr/bin/git\` — deploy user can run git as www-data only\n\n## PAM — Pluggable Authentication Modules\n\nPAM is a **framework that decouples authentication logic from applications**. Instead of every application implementing its own authentication, they call PAM, which delegates to a stack of modules defined in \`/etc/pam.d/\`.\n\nPAM module types:\n- **\`auth\`** — authenticate the user (verify password, check TOTP, etc.)\n- **\`account\`** — check account validity (expired? locked? time restrictions?)\n- **\`session\`** — set up/tear down the session (mount home dir, set limits, logging)\n- **\`password\`** — handle password changes\n\nPAM control flags: **\`required\`** (must pass, continue stack), **\`requisite\`** (must pass, stop on failure), **\`sufficient\`** (if passes, stop stack), **\`optional\`** (result ignored unless only module).`,
    whenToUse: [
      'Granting a deployment user permission to restart a service without a password — sudoers NOPASSWD rule',
      'Locking out an account after 5 failed SSH attempts — pam_faillock in /etc/pam.d/sshd',
      'Auditing who has sudo access on a system — sudo -l or parsing /etc/sudoers and /etc/sudoers.d/',
      'Integrating LDAP authentication — pam_ldap or sssd modules in /etc/pam.d/',
      'Setting per-user resource limits — pam_limits and /etc/security/limits.conf',
    ],
    keyConcepts: [
      { term: 'visudo', definition: `**Safe editor for /etc/sudoers**. Locks the file, checks syntax before saving, and opens with $EDITOR. Never edit /etc/sudoers directly with vi — a syntax error locks everyone out of sudo.` },
      { term: 'NOPASSWD', definition: `Sudoers flag that allows a rule to execute without prompting for a password. Essential for automation. Always scope as narrowly as possible: \`NOPASSWD: /bin/systemctl restart myapp\` not \`NOPASSWD: ALL\`.` },
      { term: 'sudo -l', definition: `Lists the **current user's sudo permissions**. \`sudo -l -U username\` shows another user's permissions. Critical for auditing privilege escalation paths.` },
      { term: '/etc/pam.d/', definition: `Directory of PAM configuration files, one per service (\`sshd\`, \`login\`, \`sudo\`, \`su\`). Each file is a stack of module rules with control flags.` },
      { term: 'pam_faillock', definition: `PAM module that **locks accounts after N failed authentication attempts**. Replacement for the older pam_tally2. Configure in \`/etc/security/faillock.conf\` and \`/etc/pam.d/\`. Unlock with \`faillock --reset --user username\`.` },
      { term: 'pam_limits', definition: `PAM module that applies **resource limits** from \`/etc/security/limits.conf\` at session start. Sets \`nofile\` (max open files), \`nproc\` (max processes), \`memlock\`, etc. Soft vs hard limits.` },
    ],
    pitfalls: [
      'Editing /etc/sudoers directly with vi instead of visudo — a syntax error disables sudo for all users, potentially requiring recovery boot.',
      'Using NOPASSWD: ALL for service accounts — if the service account is compromised, the attacker has unrestricted root. Always restrict NOPASSWD to specific, necessary commands.',
      'Not including pam_faillock in the auth stack correctly — order matters in PAM. faillock must appear both before and after pam_unix to correctly count and enforce lockouts.',
      'Forgetting that sudo -l only shows the current host rules — the Host field in sudoers rules restricts by hostname. Always check the host field when rules seem to not apply.',
    ],
    keyQuestions: [
      {
        question: 'Walk through the sudoers file format and set up a deployment user that can restart a specific service without a password.',
        answer: `## sudoers Rule Format\n\n\`\`\`\n# Syntax: USER/GROUP  HOSTS=(RUNAS_USER:RUNAS_GROUP)  TAG: COMMANDS\nalice          ALL=(ALL:ALL)   ALL\n%wheel         ALL=(ALL)       NOPASSWD: ALL\ndeploy         ALL=(root)      NOPASSWD: /bin/systemctl restart myapp, /bin/systemctl status myapp\n\`\`\`\n\n## Field-by-Field\n\n| Field | Example | Meaning |\n|---|---|---|\n| User | \`deploy\` | Linux username (prefix % for group) |\n| Hosts | \`ALL\` | Any hostname (or specific FQDN) |\n| Runas | \`(root)\` | Run as this user |\n| Commands | \`/bin/systemctl restart myapp\` | Absolute path, may include args |\n\n## Setting Up the Deployment User\n\n\`\`\`bash\n# 1. Create user\nuseradd -r -s /bin/false deploy\n\n# 2. Edit sudoers safely\nvisudo -f /etc/sudoers.d/deploy\n\`\`\`\n\nContent of \`/etc/sudoers.d/deploy\`:\n\`\`\`\n# Allow deploy user to restart and check myapp without password\ndeploy ALL=(root) NOPASSWD: /bin/systemctl restart myapp, /bin/systemctl status myapp\n\`\`\`\n\n\`\`\`bash\n# 3. Test as deploy user\nsudo -u deploy sudo -l\n# Output: (root) NOPASSWD: /bin/systemctl restart myapp ...\n\nsudo -u deploy sudo systemctl restart myapp\n\`\`\``,
      },
      {
        question: 'How do you configure account lockout after failed SSH login attempts using PAM?',
        answer: `## Using pam_faillock (RHEL 8+ / Modern Systems)\n\n### /etc/security/faillock.conf\n\n\`\`\`ini\ndeny = 5           # lock after 5 failures\nfail_interval = 900  # within 15 minutes\nunlock_time = 600    # unlock after 10 minutes (0 = never, manual only)\naudit               # log to audit log\neven_deny_root      # also lock root (optional)\n\`\`\`\n\n### /etc/pam.d/sshd (order matters)\n\n\`\`\`\nauth  required  pam_faillock.so preauth\nauth  include   system-auth\nauth  required  pam_faillock.so authfail\n\naccount required pam_faillock.so\n\`\`\`\n\n## Check and Unlock\n\n\`\`\`bash\n# Check lock status for a user\nfaillock --user alice\n# Shows: failure count, timestamps, unlock time\n\n# Unlock a user\nfaillock --reset --user alice\n\`\`\`\n\n## Using pam_tally2 (Older Systems / Ubuntu)\n\n\`\`\`bash\n# In /etc/pam.d/sshd:\n# auth required pam_tally2.so deny=5 unlock_time=600 audit\n# account required pam_tally2.so\n\n# Check count\npam_tally2 --user alice\n\n# Reset\npam_tally2 --reset --user alice\n\`\`\`\n\n## Test Your Config\n\n\`\`\`bash\n# Attempt 6 bad logins and verify the 6th is blocked\n# Check /var/log/secure or journalctl -u sshd for the lockout event\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What does NOPASSWD in a sudoers rule mean?', a: 'The specified user or group can run the listed commands with sudo without entering a password. Scope it to specific commands, never to ALL, to limit blast radius.' },
      { q: 'Why must you always use visudo to edit /etc/sudoers?', a: 'visudo locks the file against concurrent edits and syntax-checks it before saving. A syntax error without visudo can lock out all sudo access on the system.' },
      { q: 'What are the four PAM management groups?', a: 'auth (authenticate identity), account (check account validity and expiry), password (handle password changes), session (set up and tear down the login environment).' },
      { q: 'What does the PAM required control flag mean?', a: 'The module must succeed for the overall result to succeed, but evaluation continues through all remaining modules. Failure is not reported until the end, preventing enumeration attacks.' },
      { q: 'What does the PAM sufficient control flag mean?', a: 'If this module succeeds and no prior required module failed, authentication is immediately granted without evaluating further modules. Used for fast-path authentication like biometrics.' },
      { q: 'What does pam_faillock do?', a: 'Tracks failed authentication attempts per user and locks the account after too many failures. Inspect with faillock --user alice; reset with faillock --user alice --reset.' },
      { q: 'What is the %wheel pattern in sudoers and what does % mean?', a: '% denotes a group. %wheel ALL=(ALL) ALL grants every member of the wheel group full sudo. On RHEL/CentOS, adding a user to the wheel group is the standard way to grant admin access.' },
      { q: 'How do you allow a deploy service account to restart one service only?', a: 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart myapp scopes sudo access to that exact command with no password prompt for automation.' },
      { q: 'What does pam_unix.so handle?', a: 'It validates credentials against the local /etc/shadow password database. It is the core module for traditional username/password authentication in most PAM stacks.' },
      { q: 'What is the difference between sudo -i and sudo -s?', a: 'sudo -i simulates a full root login shell and sets HOME=/root. sudo -s opens a shell as root but inherits the calling user environment including HOME.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man5/sudoers.5.html',
      'https://man7.org/linux/man-pages/man8/pam_faillock.8.html',
      'https://www.linux-pam.org/Linux-PAM-html/',
    ],
  },
  {
    id: 'linux-audit',
    title: 'Linux Audit System',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'auditd, auditctl rules, ausearch, aureport, and using audit logs for forensic investigation.',
    visualizations: [
      { title: 'auditd Event Pipeline', description: 'Syscall → kernel hook → ring buffer → auditd → audit.log', image: '/diagrams/linux/linux-audit-pipeline.png' },
      { title: 'Audit Rule Types', description: 'Control, filesystem watch, and syscall exit rule examples', image: '/diagrams/linux/linux-audit-rule-types.png' },
    ],
    introduction: `The **Linux Audit System** is a kernel-level event logging framework that records security-relevant events with high fidelity — far beyond what traditional application logs capture. Every syscall, file access, user authentication event, and privilege escalation can be recorded with full context: who did it (UID, PID, process name), what they did, and when.\n\n## Architecture\n\nThe audit system has two layers:\n\n**Kernel audit subsystem** — intercepts system calls and file accesses according to rules. Events are written to an in-kernel ring buffer.\n\n**\`auditd\`** daemon — reads from the kernel ring buffer and writes events to \`/var/log/audit/audit.log\` (default) or forwards to a remote audit server via \`audisp\`.\n\n## Audit Rules\n\nRules are loaded with \`auditctl\` or persistently via files in \`/etc/audit/rules.d/\`:\n\n**File watch** (\`-w\`): generates events when a file or directory is accessed in the specified way:\n\`\`\`bash\nauditctl -w /etc/passwd -p wa -k passwd-changes\n# -w = path to watch\n# -p = permissions to watch: r(read) w(write) x(execute) a(attribute change)\n# -k = key name for searching\n\`\`\`\n\n**Syscall audit** (\`-a\`): generates events when a specific syscall is called:\n\`\`\`bash\nauditctl -a always,exit -F arch=b64 -S execve -k exec-tracking\n# -a = action (always/never), list (exit/entry/task)\n# -F = filter field\n# -S = syscall name\n\`\`\`\n\n## Log Format\n\nAudit events are structured records with key=value pairs:\n\n\`\`\`\ntype=SYSCALL msg=audit(1704067200.123:456): arch=c000003e syscall=59\n  success=yes exit=0 a0=... a1=... a2=... a3=...\n  pid=12345 ppid=12344 uid=1000 gid=1000 euid=0\n  exe="/usr/bin/sudo" key="privilege-escalation"\n\`\`\``,
    whenToUse: [
      'Post-incident forensics — who deleted this critical file? ausearch -k file-deletion -ts 2024-01-15',
      'Compliance requirements (PCI-DSS, SOC 2, HIPAA) requiring audit trails for privileged command execution',
      'Detecting unauthorized changes to sensitive files like /etc/passwd, /etc/sudoers, /etc/ssh/sshd_config',
      'Tracking sudo usage across a fleet — aureport --summary shows privilege escalation frequency',
      'Monitoring a specific user account during an incident investigation — auditctl -F uid=1000',
    ],
    keyConcepts: [
      { term: 'auditd', definition: `**Audit daemon** that reads events from the kernel ring buffer and writes them to \`/var/log/audit/audit.log\`. Must be running for audit events to be persisted. Config at \`/etc/audit/auditd.conf\`.` },
      { term: 'auditctl', definition: `Command to **load audit rules at runtime**. Rules are lost on reboot unless saved to \`/etc/audit/rules.d/*.rules\`. \`auditctl -l\` lists active rules. \`auditctl -D\` deletes all rules.` },
      { term: 'ausearch', definition: `**Search audit logs** by key, user, time, or event type. \`ausearch -k passwd-changes -ts today\` finds all events for the "passwd-changes" key since midnight. Output is human-readable audit records.` },
      { term: 'aureport', definition: `**Summary reports** from audit logs. \`aureport --summary\` gives an overview. \`aureport --login\` shows all login events. \`aureport --exe\` shows executed commands. Useful for trend analysis.` },
      { term: '-k key', definition: `A **tag** applied to audit rules for easy searching. \`-k sudo-commands\` marks all events from that rule with the key "sudo-commands". Retrieve with \`ausearch -k sudo-commands\`.` },
      { term: '/etc/audit/rules.d/', definition: `**Persistent audit rules** loaded at auditd startup. Files end in \`.rules\`. \`augenrules --check\` validates rule syntax. RHEL ships \`30-stig.rules\` for STIG compliance.` },
    ],
    pitfalls: [
      'Relying on audit.log alone for forensics without verifying auditd was running — if auditd is stopped, no events are recorded. Check service status and log gaps.',
      'Writing overly broad audit rules like -S all — generates massive log volume and can slow the system. Always scope rules to specific files, syscalls, or users.',
      'Not configuring log rotation and size limits in auditd.conf — audit.log can fill the disk on a busy system. Set max_log_file_action=rotate and num_logs.',
      'Forgetting to run augenrules --load after modifying /etc/audit/rules.d/ — changes are not applied until rules are reloaded.',
    ],
    keyQuestions: [
      {
        question: 'A critical file /etc/sudoers was modified. How do you use auditd to find out who did it and when?',
        answer: `## Step 1 — Verify a Watch Rule Exists\n\n\`\`\`bash\nauditctl -l | grep sudoers\n# Should show: -w /etc/sudoers -p wa -k sudoers-changes\n\`\`\`\n\nIf not, add it for future monitoring:\n\`\`\`bash\nauditctl -w /etc/sudoers -p wa -k sudoers-changes\nauditctl -w /etc/sudoers.d/ -p wa -k sudoers-changes\n\`\`\`\n\n## Step 2 — Search the Audit Log\n\n\`\`\`bash\n# Search by key\nausearch -k sudoers-changes\n\n# Restrict to a time window\nausearch -k sudoers-changes -ts 2024-01-15 -te 2024-01-16\n\n# Human-readable output\nausearch -k sudoers-changes --interpret\n\`\`\`\n\n## Step 3 — Interpret the Output\n\n\`\`\`\ntype=SYSCALL msg=audit(1705276800.123:789):\n  syscall=openat success=yes\n  pid=5678 ppid=5677\n  uid=1001 gid=1001 euid=0 egid=0\n  exe="/usr/bin/vim"\n  key="sudoers-changes"\ntype=PATH msg=audit(1705276800.123:789):\n  name="/etc/sudoers" nametype=NORMAL\n\`\`\`\n\nFrom this: UID 1001 opened sudoers with vim, running as effective root (euid=0 — they used sudo). The audit timestamp gives the exact time.\n\n## Step 4 — Cross-Reference with User\n\n\`\`\`bash\n# Resolve UID 1001 to username\ngetent passwd 1001\n\n# See their sudo history\nausearch -ua 1001 -ts 2024-01-15 | grep sudo\n\`\`\``,
      },
      {
        question: 'How do you set up persistent audit rules that survive reboots?',
        answer: `## Persistent Rule Files\n\nAudit rules that survive reboots go in \`/etc/audit/rules.d/\`. The naming convention: lower numbers load first, providing ordering.\n\n\`\`\`bash\n# Create a rules file\ncat > /etc/audit/rules.d/50-security.rules << 'EOF'\n## Delete all existing rules on load\n-D\n\n## Buffer size\n-b 8192\n\n## Monitor sensitive files\n-w /etc/passwd -p wa -k identity\n-w /etc/shadow -p wa -k identity\n-w /etc/sudoers -p wa -k sudoers\n-w /etc/sudoers.d/ -p wa -k sudoers\n-w /etc/ssh/sshd_config -p wa -k sshd-config\n\n## Monitor privileged command execution\n-a always,exit -F arch=b64 -S execve -F euid=0 -k root-commands\n\n## Monitor logins\n-w /var/log/lastlog -p wa -k logins\n-w /var/run/faillock/ -p wa -k logins\nEOF\n\`\`\`\n\n\`\`\`bash\n# Validate and load rules\naugenrules --check\naugenrules --load\n\n# Verify loaded\nauditctl -l\n\`\`\`\n\n## auditd.conf Tuning\n\n\`\`\`bash\n# /etc/audit/auditd.conf — key settings\n# max_log_file = 50          # MB per file\n# num_logs = 10              # rotate, keep 10 files\n# max_log_file_action = ROTATE\n# space_left_action = SYSLOG # alert when disk low\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What does auditd record that application logs do not?', a: 'Kernel-level syscall events: which syscall, by which UID/PID, on which file, with success/failure -- written by the kernel before userspace can intercept or suppress it.' },
      { q: 'How do you watch for any write to /etc/passwd?', a: 'auditctl -w /etc/passwd -p wa -k passwd-changes. -p wa watches writes and attribute changes. -k assigns a key for ausearch.' },
      { q: 'What command searches audit logs for events by key?', a: 'ausearch -k passwd-changes. Add -ts today to narrow by time. --interpret resolves UIDs to usernames.' },
      { q: 'What is the difference between ausearch and aureport?', a: 'ausearch finds specific events matching criteria. aureport produces aggregate summaries -- logins per day, top executed commands, failed authentication counts.' },
      { q: 'Where do persistent audit rules go and how are they applied?', a: 'In /etc/audit/rules.d/*.rules. Run augenrules --load to compile and activate them. auditctl -l shows what is currently loaded in the kernel.' },
      { q: 'What does -a always,exit -F arch=b64 -S execve capture?', a: 'Every execve() syscall on 64-bit processes -- every command run on the system. Add -F euid=0 to capture only root commands and reduce log volume.' },
      { q: 'Why is auditd more reliable for forensics than bash history?', a: 'bash history can be cleared or disabled. Audit events are written by the kernel before userspace can interfere, and can be forwarded in real time to a remote immutable log server.' },
      { q: 'What does max_log_file_action=ROTATE in auditd.conf do?', a: 'Rotates audit.log when it reaches max_log_file size and starts a new file. num_logs controls how many rotated files to keep. Without this, audit.log can fill the disk.' },
      { q: 'What is audisp used for?', a: 'audisp forwards audit events in real time to SIEM systems, remote syslog, or security tools without those tools having to poll log files.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/auditd.8.html',
      'https://man7.org/linux/man-pages/man8/auditctl.8.html',
      'https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening',
    ],
  },
  {
    id: 'linux-capabilities',
    title: 'Linux Capabilities',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'Linux capabilities subdivide root privileges — getcap, setcap, capsh, and Docker cap-drop patterns.',
    visualizations: [
      { title: 'Capability Sets Model', description: 'Permitted/effective/inheritable/ambient/bounding set relationships', image: '/diagrams/linux/linux-capabilities-sets.png' },
      { title: 'Capability Drop Flow', description: 'Secure service: bind port → drop root → minimal caps → seccomp', image: '/diagrams/linux/linux-capabilities-drop-flow.png' },
    ],
    introduction: `Traditionally, Linux privilege was binary: you either had root (UID 0) and could do anything, or you were an unprivileged user. **Linux capabilities** break this model by dividing root's omnipotent authority into **~40 distinct privilege units** that can be independently granted or revoked.\n\n## Why Capabilities Matter\n\nRunning a process as root to bind port 80 is a massive security over-grant. With capabilities, you grant only \`CAP_NET_BIND_SERVICE\` and nothing else. A vulnerability in the service cannot be exploited to write to /etc/passwd or load kernel modules.\n\n## Key Capabilities\n\n| Capability | What It Allows |\n|---|---|\n| \`CAP_NET_BIND_SERVICE\` | Bind to ports below 1024 |\n| \`CAP_NET_RAW\` | Raw socket access (ping, tcpdump) |\n| \`CAP_SYS_PTRACE\` | Trace other processes (strace, gdb) |\n| \`CAP_SYS_ADMIN\` | Broad system administration — mount, namespace creation. Often called "almost root". |\n| \`CAP_CHOWN\` | Change file ownership |\n| \`CAP_SETUID\` / \`CAP_SETGID\` | Change process UID/GID |\n| \`CAP_DAC_OVERRIDE\` | Bypass DAC permission checks |\n| \`CAP_KILL\` | Send signals to any process |\n\n## Capability Sets\n\nEach thread has **five capability sets**:\n- **Permitted** — the maximum set a thread can ever have\n- **Effective** — the capabilities currently active for privilege checks\n- **Inheritable** — capabilities inherited across \`execve()\`\n- **Ambient** — inheritable even by unprivileged executables (Linux 4.3+)\n- **Bounding** — an upper bound; capabilities in permitted cannot exceed bounding\n\n## File Capabilities\n\nExecutable files can have capabilities attached, replacing setuid root:\n- **Permitted** — added to thread's permitted set on exec\n- **Inheritable** — ANDed with thread's inheritable\n- **Effective bit** — if set, permitted file capabilities are also effective`,
    whenToUse: [
      'Allowing a non-root service to bind to port 443 — setcap cap_net_bind_service+ep /usr/bin/myapp',
      'Hardening Docker containers — --cap-drop ALL --cap-add NET_BIND_SERVICE instead of --privileged',
      'Replacing a setuid-root binary with a capability-based equivalent',
      'Auditing what capabilities a running process has — cat /proc/PID/status | grep Cap, decode with capsh',
      'Designing least-privilege container security in Kubernetes securityContext',
    ],
    keyConcepts: [
      { term: 'CAP_NET_BIND_SERVICE', definition: `Allows binding to **privileged ports (<1024)** without root. The canonical replacement for running web servers as root.` },
      { term: 'CAP_SYS_ADMIN', definition: `The broadest capability — covers mount/unmount, namespace manipulation, kernel keyring access, device I/O, and more. Granting this is nearly equivalent to root. Avoid.` },
      { term: 'setcap', definition: `Set capabilities on an **executable file**. \`setcap cap_net_bind_service+ep /usr/bin/nginx\` — \`+e\` adds to effective set, \`+p\` to permitted. Use \`getcap\` to read.` },
      { term: 'getcap', definition: `Read capabilities from a file. \`getcap /usr/bin/ping\` returns \`cap_net_raw=ep\`. \`getcap -r /usr/bin/\` recursively scans a directory.` },
      { term: 'capsh', definition: `**Capability shell** — inspects and modifies capability state. \`capsh --print\` shows all five sets for the current process. \`capsh --decode=0000003fffffffff\` decodes a hex capability bitmask.` },
      { term: 'Docker --cap-drop/--cap-add', definition: `Docker containers start with a **restricted capability set** (not full root). \`--cap-drop ALL\` removes all capabilities; \`--cap-add NET_BIND_SERVICE\` adds back only what is needed. Far safer than \`--privileged\`.` },
    ],
    pitfalls: [
      'Granting CAP_SYS_ADMIN thinking it is a narrow capability — it is the most dangerous capability short of full root. Audit every grant of CAP_SYS_ADMIN carefully.',
      'Confusing effective and permitted sets — a capability in permitted is not active until raised to effective. Setuid binaries do this automatically; manual code must call cap_set_proc().',
      'Running Docker containers with --privileged "just to make it work" — --privileged grants all capabilities AND disables seccomp and AppArmor. Always use --cap-add to grant only what is needed.',
      'Not using +ep flag correctly in setcap — +p alone adds to permitted but not effective; the binary must then raise it to effective manually. For most use cases, +ep (both) is what you want.',
    ],
    keyQuestions: [
      {
        question: 'How do you allow a non-root application to bind to port 80 using capabilities instead of running as root?',
        answer: `## Option 1 — File Capabilities (Preferred)\n\n\`\`\`bash\n# Grant cap_net_bind_service to the binary\nsetcap cap_net_bind_service+ep /usr/local/bin/myapp\n\n# Verify\ngetcap /usr/local/bin/myapp\n# /usr/local/bin/myapp cap_net_bind_service=ep\n\n# Now run as a non-root user — it can bind port 80\n./myapp  # binding port 80 succeeds\n\`\`\`\n\n**Trade-off**: file capabilities are reset when the binary is replaced (package upgrades). Add a post-install step to re-apply.\n\n## Option 2 — systemd Unit with AmbientCapabilities\n\n\`\`\`ini\n[Service]\nUser=appuser\nGroup=appgroup\nAmbientCapabilities=CAP_NET_BIND_SERVICE\nCapabilityBoundingSet=CAP_NET_BIND_SERVICE\nNoNewPrivileges=true\n\`\`\`\n\nThis grants the capability to the process at startup without modifying the binary file. Survives binary upgrades.\n\n## Option 3 — Reverse Proxy (Most Common)\n\nRun the app on port 8080 (no privilege needed) and put nginx or HAProxy on port 80 as a reverse proxy. The app never needs elevated privileges at all.\n\n## Check Current Capabilities\n\n\`\`\`bash\n# Of a running process\ncat /proc/$(pgrep myapp)/status | grep Cap\n# CapPrm, CapEff, CapBnd, CapAmb — hex bitmasks\n\n# Decode a hex bitmask\ncapsh --decode=0000000000000400\n# = cap_net_bind_service\n\`\`\``,
      },
      {
        question: 'Walk through capability sets — permitted, effective, inheritable, ambient, and bounding. How do they interact?',
        answer: `## The Five Sets\n\n**Permitted (P)** — the **maximum ceiling** of what a thread can ever activate. A capability can only be added to Effective if it is in Permitted. Cannot exceed the Bounding set.\n\n**Effective (E)** — the capabilities **currently checked by the kernel** when the thread makes a privileged syscall. A thread can drop capabilities from Effective without losing them from Permitted (so it can regain them later).\n\n**Inheritable (I)** — capabilities that **survive execve()** — but only if they are also in the new binary's file Inheritable set. Classic inheritable is rarely useful for unprivileged processes.\n\n**Ambient (A)** — Linux 4.3+. An inheritable set that is **automatically added to Permitted and Effective** in child processes after execve(), even for binaries without file capabilities. Solves the gap where unprivileged users cannot inherit capabilities.\n\n**Bounding (B)** — a **one-way ratchet**: you can drop from bounding but never add back. The bounding set limits what can ever be in Permitted, even via setcap on files. Docker uses this to limit container capabilities.\n\n## Interaction on execve()\n\n\`\`\`\nFile permitted (Fp) ∩ Bounding → added to thread Permitted\nFile inheritable (Fi) ∩ thread Inheritable → added to Permitted\nAmbient → added to both Permitted and Effective\nIf file Effective bit set → Permitted becomes Effective\n\`\`\`\n\n## Inspect in Practice\n\n\`\`\`bash\ncapsh --print\n# Current: cap_net_bind_service+eip  (effective, inheritable, permitted)\n# Bounding set = ...\n# Ambient set =\n\ncat /proc/self/status | grep Cap\n# CapInh: 0000000000000000\n# CapPrm: 0000000000000400\n# CapEff: 0000000000000400\n# CapBnd: 000001ffffffffff\n# CapAmb: 0000000000000000\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What problem do Linux capabilities solve?', a: 'They split root\'s all-or-nothing privilege into ~40 distinct units. A service needing only port 80 binding gets CAP_NET_BIND_SERVICE, not full root, limiting blast radius if compromised.' },
      { q: 'What capability allows binding to ports below 1024?', a: 'CAP_NET_BIND_SERVICE. Grant it to a binary with setcap cap_net_bind_service+ep /usr/bin/myapp so the service can bind port 80/443 without running as root.' },
      { q: 'Why is CAP_SYS_ADMIN considered almost-root?', a: 'CAP_SYS_ADMIN covers mount/unmount, namespace creation, kernel keyring access, device I/O, and dozens of other privileged operations. It is the broadest capability and should almost never be granted.' },
      { q: 'What does setcap +ep mean on a file?', a: '+e adds the capability to the file effective set (active on exec). +p adds to the permitted set (can be raised later). +ep grants both, so the capability is immediately active when the binary runs.' },
      { q: 'What is the difference between Docker --privileged and --cap-add?', a: '--privileged grants all capabilities plus disables seccomp and AppArmor. --cap-add grants only the listed capabilities. Always prefer --cap-add to --cap-drop ALL then add back only what is needed.' },
      { q: 'How do you view the capabilities of a running process?', a: 'cat /proc/PID/status | grep Cap shows hex bitmasks for CapPrm/CapEff/CapBnd/CapAmb. Decode with capsh --decode=<hex> to see capability names.' },
      { q: 'What is the bounding set?', a: 'A one-way ratchet -- you can drop capabilities from bounding but never add them back. The bounding set is the ceiling of what can ever appear in permitted, even via setcap on a file.' },
      { q: 'What does the ambient capability set do?', a: 'Ambient capabilities (Linux 4.3+) are automatically inherited into permitted and effective by child processes after execve, even for binaries without file capabilities. Solves the inheritable set gap for unprivileged users.' },
      { q: 'How do you grant a systemd service a capability without modifying the binary?', a: 'Use AmbientCapabilities=CAP_NET_BIND_SERVICE and CapabilityBoundingSet=CAP_NET_BIND_SERVICE in the [Service] section. The capability is applied at process start without touching the file.' },
      { q: 'What capability does ping need and how was it granted historically?', a: 'ping needs CAP_NET_RAW for raw ICMP sockets. Historically ping was setuid root. Modern systems use setcap cap_net_raw+ep /usr/bin/ping instead.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man7/capabilities.7.html',
      'https://man7.org/linux/man-pages/man1/capsh.1.html',
    ],
  },

  // ─── SYSTEMD ───────────────────────────────────────────────────────────────
  {
    id: 'systemd-journalctl',
    title: 'journalctl & Log Management',
    icon: 'settings',
    color: '#f59e0b',
    questions: 6,
    description: 'journalctl filtering, persistent logs, vacuum, priority levels, and journald.conf tuning.',
    visualizations: [
      { title: 'Journal Storage Paths', description: 'Sources → journald → volatile /run vs persistent /var/log/journal', image: '/diagrams/linux/systemd-journalctl-storage.png' },
      { title: 'journalctl Filter Options', description: '-u unit, -p priority, -b boot, -k kernel, field matches', image: '/diagrams/linux/systemd-journalctl-filters.png' },
    ],
    introduction: `**journald** is systemd's logging daemon. It collects log entries from the kernel, systemd units, and any process that writes to \`stdout\`/\`stderr\` or calls \`syslog()\`. Unlike traditional text-based syslog, journald stores logs in a **structured binary format** that supports efficient filtering by time, unit, priority, PID, UID, and arbitrary fields.\n\n## Storage Locations\n\n**Volatile (default on many distros)**: \`/run/log/journal/\` — lost on reboot. Kernel events still survive if the machine reboots cleanly because the EFI pstore or pmsg captures crash logs.\n\n**Persistent**: \`/var/log/journal/\` — survives reboots. Enabled by setting \`Storage=persistent\` in \`/etc/systemd/journald.conf\` or by creating the directory: \`mkdir -p /var/log/journal && systemd-tmpfiles --create --prefix /var/log/journal\`.\n\n## Priority Levels\n\nJournald uses syslog priority numbers:\n\n| Level | Number | Meaning |\n|---|---|---|\n| emerg | 0 | System is unusable |\n| alert | 1 | Action must be taken immediately |\n| crit | 2 | Critical conditions |\n| err | 3 | Error conditions |\n| warning | 4 | Warning conditions |\n| notice | 5 | Normal but significant |\n| info | 6 | Informational |\n| debug | 7 | Debug-level messages |\n\n\`journalctl -p err\` shows messages at level 3 (err) and above — everything more severe.\n\n## Output Formats\n\n\`journalctl -o FORMAT\` supports: \`short\` (default), \`verbose\` (all fields), \`json\` (one JSON object per line), \`json-pretty\`, \`cat\` (message only), \`export\` (for piping to another journal).`,
    whenToUse: [
      'Tailing a specific service log — journalctl -u nginx.service -f',
      'Investigating an incident at a specific time — journalctl --since "2024-01-15 14:00" --until "2024-01-15 16:00"',
      'Finding all errors across all services — journalctl -p err --since today',
      'Checking disk usage and rotating old logs — journalctl --disk-usage then --vacuum-size or --vacuum-time',
      'Making logs persistent across reboots — Storage=persistent in journald.conf',
    ],
    keyConcepts: [
      { term: 'journald', definition: `**systemd logging daemon** that collects from all units. Binary format at \`/run/log/journal/\` (volatile) or \`/var/log/journal/\` (persistent). Supports structured fields for rich filtering.` },
      { term: 'journalctl -u', definition: `Filter to a **specific systemd unit**. \`journalctl -u nginx.service -f\` follows nginx logs in real time. Combine with \`--since\` for time-bounded queries.` },
      { term: '-p priority', definition: `Filter by **syslog priority**. \`-p err\` shows err(3) and above (err, crit, alert, emerg). \`-p warning..err\` shows a range. Lower number = higher severity.` },
      { term: '--vacuum-size / --vacuum-time', definition: `**Prune old journal data**. \`journalctl --vacuum-size=1G\` keeps only 1 GiB of logs. \`journalctl --vacuum-time=30d\` deletes logs older than 30 days.` },
      { term: 'Storage=persistent', definition: `Set in \`/etc/systemd/journald.conf\`. Writes journal to \`/var/log/journal/\` instead of \`/run/log/journal/\`. Required for logs to survive reboots.` },
      { term: '-o json', definition: `Output each log entry as a **JSON object** with all structured fields. Useful for piping to jq or ingesting into a log aggregator. \`-o json-pretty\` for human-readable.` },
    ],
    pitfalls: [
      'Assuming logs persist across reboots without configuring Storage=persistent — default volatile storage means all logs are lost on reboot. Always set persistent on production servers.',
      'Not setting SystemMaxUse in journald.conf — without a limit, journald can consume all available disk space on a verbose service. Set SystemMaxUse=2G as a sensible default.',
      'Using journalctl without --since on a production server with months of logs — the command outputs gigabytes. Always time-bound queries on production systems.',
      'Forgetting that journalctl -p err does not show only err — it shows err and all more severe levels (crit, alert, emerg). This is the correct behavior but can be surprising.',
    ],
    keyQuestions: [
      {
        question: 'How do you make systemd journal logs persist across reboots and manage their disk usage?',
        answer: `## Enable Persistent Logging\n\n**Method 1 — Create the directory** (journald detects this):\n\`\`\`bash\nmkdir -p /var/log/journal\nsystemd-tmpfiles --create --prefix /var/log/journal\nsystemctl restart systemd-journald\n\`\`\`\n\n**Method 2 — journald.conf**:\n\`\`\`bash\n# /etc/systemd/journald.conf\n[Journal]\nStorage=persistent\nSystemMaxUse=2G          # max total journal size\nSystemKeepFree=512M      # always keep this much free\nSystemMaxFileSize=100M   # max size of one journal file\nMaxRetentionSec=90day    # keep at most 90 days\nMaxFileSec=7day          # rotate after 7 days\n\`\`\`\n\n\`\`\`bash\n# Apply config\nsystemctl restart systemd-journald\n\`\`\`\n\n## Check Current Usage\n\n\`\`\`bash\njournalctl --disk-usage\n# Archived and active journals take up 1.2G in the filesystem.\n\`\`\`\n\n## Prune Old Logs\n\n\`\`\`bash\n# Keep only last 1 GB\njournalctl --vacuum-size=1G\n\n# Keep only last 30 days\njournalctl --vacuum-time=30d\n\n# Keep only last 100 journal files\njournalctl --vacuum-files=100\n\`\`\``,
      },
      {
        question: 'Show common journalctl query patterns for production incident investigation.',
        answer: `## Follow a Specific Service\n\n\`\`\`bash\n# Real-time tail\njournalctl -u nginx.service -f\n\n# Last 200 lines\njournalctl -u nginx.service -n 200\n\`\`\`\n\n## Time-Bounded Queries\n\n\`\`\`bash\n# Since a specific time\njournalctl --since "2024-01-15 14:00:00"\n\n# Time range\njournalctl -u postgresql.service --since "2024-01-15 14:00" --until "2024-01-15 15:00"\n\n# Relative time\njournalctl --since "1 hour ago"\n\`\`\`\n\n## Priority Filtering\n\n\`\`\`bash\n# All errors and above, today\njournalctl -p err --since today\n\n# Errors from a specific unit\njournalctl -u myapp.service -p err --since "7 days ago"\n\`\`\`\n\n## Multiple Units / Combining Filters\n\n\`\`\`bash\n# Multiple units\njournalctl -u nginx.service -u myapp.service --since today\n\n# Kernel messages only\njournalctl -k --since today\n\n# By PID\njournalctl _PID=12345\n\n# By UID (all logs from a user)\njournalctl _UID=1001 --since today\n\`\`\`\n\n## JSON Output for Automation\n\n\`\`\`bash\n# Pipe to jq for field extraction\njournalctl -u myapp.service -o json --since "1 hour ago" | \\\n  jq -r 'select(.PRIORITY <= "3") | [.__REALTIME_TIMESTAMP, .MESSAGE] | @tsv'\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'How do you tail logs for a specific systemd service in real time?', a: 'journalctl -u nginx.service -f. Combine with -n 50 to see the last 50 lines first before following.' },
      { q: 'What does journalctl -p err show?', a: 'All log entries at priority err(3) and above -- err, crit, alert, emerg. Lower number means higher severity. Use -p warning for a broader view.' },
      { q: 'How do you make journal logs persist across reboots?', a: 'Set Storage=persistent in /etc/systemd/journald.conf and restart systemd-journald, or create the directory mkdir -p /var/log/journal. Default volatile storage lives in /run/log/journal/ and is lost on reboot.' },
      { q: 'How do you query logs for a specific time range?', a: 'journalctl --since "2024-01-15 14:00" --until "2024-01-15 16:00". Relative times also work: --since "2 hours ago".' },
      { q: 'How do you check how much disk space the journal is using?', a: 'journalctl --disk-usage. Prune with --vacuum-size=1G to keep only 1 GiB, or --vacuum-time=30d to delete entries older than 30 days.' },
      { q: 'What does journalctl -k show?', a: 'Only kernel messages, equivalent to dmesg. Useful for diagnosing hardware errors, OOM kills, and filesystem errors without application log noise.' },
      { q: 'What is the SystemMaxUse setting in journald.conf for?', a: 'Sets the maximum disk space the journal may consume. Without it journald can fill the disk. A sensible default for production is SystemMaxUse=2G.' },
      { q: 'How do you view logs from the previous boot?', a: 'journalctl -b -1 shows logs from one boot ago. journalctl --list-boots lists all available boot records with their IDs and timestamps.' },
      { q: 'How do you get JSON output from journalctl for log aggregation?', a: 'journalctl -o json outputs one JSON object per log entry with all structured fields. -o json-pretty is human-readable. Pipe to jq for field extraction.' },
      { q: 'What does journalctl _UID=1001 do?', a: 'Filters journal entries by the login UID field to show all log entries generated by processes running as UID 1001, across all services.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man1/journalctl.1.html',
      'https://www.freedesktop.org/software/systemd/man/journald.conf.html',
    ],
  },
  {
    id: 'systemd-namespaces',
    title: 'systemd Service Sandboxing',
    icon: 'settings',
    color: '#f59e0b',
    questions: 6,
    description: 'PrivateTmp, PrivateNetwork, ProtectSystem, NoNewPrivileges, and systemd-analyze security.',
    visualizations: [
      { title: 'Linux Namespace Types', description: 'PID, NET, MNT, UTS, IPC, USER, CGROUP, TIME isolation domains', image: '/diagrams/linux/systemd-namespaces-types.png' },
    ],
    introduction: `systemd provides a rich set of **sandboxing directives** that restrict what a service can access — without writing custom seccomp profiles or AppArmor rules. These directives leverage the same Linux kernel primitives (namespaces, seccomp, cgroups, capabilities) used by containers, but are configured declaratively in unit files.\n\nEffective sandboxing follows **least privilege**: each service should have exactly the access it needs and nothing more. A compromised web server that cannot access /home/, /root, or the network (if it only serves static files) has severely limited blast radius.\n\n## Core Sandboxing Directives\n\n**Filesystem isolation:**\n- \`PrivateTmp=yes\` — the service gets its own private \`/tmp\` and \`/var/tmp\`. Other services cannot access its temp files.\n- \`ProtectSystem=strict\` — mounts \`/usr\`, \`/boot\`, and \`/etc\` **read-only**. The service cannot modify system files.\n- \`ProtectHome=yes\` — makes \`/home\`, \`/root\`, and \`/run/user\` **inaccessible**.\n- \`ReadOnlyPaths=\` — make specific paths read-only.\n- \`ReadWritePaths=\` — re-grant write access to specific paths (used together with ProtectSystem=strict).\n\n**Privilege isolation:**\n- \`NoNewPrivileges=yes\` — the service **cannot gain new privileges** via setuid binaries or file capabilities. This single directive blocks a large class of privilege escalation attacks.\n- \`User=\` / \`Group=\` — run the service as a non-root user.\n- \`CapabilityBoundingSet=\` — restrict which capabilities the service can ever hold.\n\n**Network isolation:**\n- \`PrivateNetwork=yes\` — the service gets its own network namespace with only a loopback interface. Cannot make outbound connections or listen on ports.\n\n## Auditing Security Score\n\n\`systemd-analyze security <service>\` prints a security score and lists which sandboxing directives are missing. A score of 10 (worst) means no sandboxing at all; 0.0 (best) is fully sandboxed.`,
    whenToUse: [
      'Hardening a third-party service unit — add PrivateTmp, NoNewPrivileges, ProtectSystem=strict as a baseline',
      'Auditing service security posture — systemd-analyze security nginx to see score and missing directives',
      'Preventing a compromised service from accessing other services tmp files — PrivateTmp=yes',
      'Blocking a service from making outbound network connections (e.g., a local metrics exporter) — PrivateNetwork=yes',
      'Running a service as non-root with filesystem write access only to its data directory — User=appuser + ReadWritePaths=/var/lib/myapp',
    ],
    keyConcepts: [
      { term: 'PrivateTmp=yes', definition: `Service gets its own **private /tmp and /var/tmp** via a mount namespace. Other services cannot read its temp files. Prevents /tmp race conditions and information leaks.` },
      { term: 'ProtectSystem=strict', definition: `Mounts **/usr, /boot, and /etc read-only**. The service cannot write to system directories. Combine with \`ReadWritePaths=\` to re-grant write access to specific paths.` },
      { term: 'ProtectHome=yes', definition: `Makes **/home, /root, and /run/user inaccessible** (tmpfs overlay). Service cannot read user home directories or SSH keys.` },
      { term: 'NoNewPrivileges=yes', definition: `Sets the \`PR_SET_NO_NEW_PRIVS\` bit. The process and all its children **cannot gain new privileges** via setuid executables or file capabilities. Blocks most local privilege escalation.` },
      { term: 'PrivateNetwork=yes', definition: `Gives the service its **own network namespace** with only loopback. Cannot connect to the network, listen on external ports, or interact with other services over the network.` },
      { term: 'systemd-analyze security', definition: `**Security auditing command** that scores a service from 0 (best) to 10 (worst) based on which sandboxing directives are applied. Lists missing directives with their risk contribution.` },
    ],
    pitfalls: [
      'Adding ProtectSystem=strict without ReadWritePaths — the service cannot write logs or state to its directories. Always pair with ReadWritePaths=/var/lib/myapp /var/log/myapp.',
      'Assuming NoNewPrivileges=yes prevents all privilege escalation — it blocks setuid/file-capability escalation but not exploiting a kernel vulnerability directly.',
      'Using PrivateNetwork=yes on a service that needs to connect to a database or external API — the service will silently fail all network calls. Read the service requirements before applying network isolation.',
      'Not running systemd-analyze security before and after adding directives — the score shows you what each directive contributes and warns about conflicts.',
    ],
    keyQuestions: [
      {
        question: 'How do you harden a systemd service unit for a web application? Show the unit file directives.',
        answer: `## Baseline Hardened Unit File\n\n\`\`\`ini\n[Unit]\nDescription=My Web Application\nAfter=network.target\n\n[Service]\nType=simple\nUser=myapp\nGroup=myapp\nWorkingDirectory=/opt/myapp\nExecStart=/opt/myapp/myapp --config /etc/myapp/config.yaml\n\n# Filesystem Isolation\nPrivateTmp=yes\nProtectSystem=strict\nProtectHome=yes\nReadWritePaths=/var/lib/myapp /var/log/myapp\nReadOnlyPaths=/etc/myapp\n\n# Privilege Restrictions\nNoNewPrivileges=yes\nCapabilityBoundingSet=CAP_NET_BIND_SERVICE\nAmbientCapabilities=CAP_NET_BIND_SERVICE\n\n# System Call Filtering\nSystemCallArchitectures=native\nSystemCallFilter=@system-service\n\n# Misc Security\nProtectKernelTunables=yes\nProtectKernelModules=yes\nProtectControlGroups=yes\nRestrictNamespaces=yes\nLockPersonality=yes\nRestrictRealtime=yes\n\n# Restart\nRestart=on-failure\nRestartSec=5s\n\n[Install]\nWantedBy=multi-user.target\n\`\`\`\n\n\`\`\`bash\n# Audit the result\nsystemd-analyze security myapp.service\n# Aim for a score below 4 (MEDIUM)\n\`\`\``,
      },
      {
        question: 'What does systemd-analyze security show and how do you use it to improve a unit?',
        answer: `## Running the Command\n\n\`\`\`bash\nsystemd-analyze security nginx.service\n\`\`\`\n\n## Example Output\n\n\`\`\`\nSETTING                       VALUE  EXPOSURE\nPrivateNetwork=               ---      0.5\nPrivateTmp=                   ---      0.5\nProtectSystem=                ---      1.0\nNoNewPrivileges=              yes      ✓\nUser=/DynamicUser=            yes      ✓\nProtectHome=                  yes      ✓\nCapabilityBoundingSet=        CAP_NET_BIND_SERVICE  ✓\nSystemCallFilter=             @system-service  ✓\n...\n-> Overall exposure level for nginx.service: 3.7 OK\n\`\`\`\n\n## Interpreting the Score\n\n| Score | Rating |\n|---|---|\n| 0.0–0.9 | SAFE |\n| 1.0–2.9 | OK |\n| 3.0–4.9 | MEDIUM |\n| 5.0–7.9 | UNSAFE |\n| 8.0–10.0 | EXPOSED |\n\n## Iterative Hardening Workflow\n\n\`\`\`bash\n# 1. Baseline score\nsystemd-analyze security myapp.service > /tmp/baseline.txt\n\n# 2. Add directives to unit file\n# PrivateTmp=yes\n# ProtectSystem=strict\n# NoNewPrivileges=yes\n\n# 3. Reload and rescore\nsystemctl daemon-reload\nsystemd-analyze security myapp.service\n\n# 4. Test the service still works\nsystemctl restart myapp.service\nsystemctl status myapp.service\ncurl -s http://localhost:8080/health\n\`\`\`\n\nAlways **test after each directive** — some directives break services in non-obvious ways (e.g., ProtectSystem=strict blocking a service from writing to /etc).`,
      },
    ],
    quickFire: [
      { q: 'What does PrivateTmp=yes do in a systemd unit?', a: 'Gives the service its own private /tmp and /var/tmp via a mount namespace. Other services cannot read its temp files, preventing /tmp races and data leaks.' },
      { q: 'What is the difference between ProtectSystem=full and ProtectSystem=strict?', a: 'full makes /usr and /boot read-only. strict also makes /etc read-only. Use strict with ReadWritePaths= to re-grant specific write paths.' },
      { q: 'What does NoNewPrivileges=yes prevent?', a: 'Prevents the process and all children from gaining new privileges via setuid binaries or file capabilities. Blocks most local privilege escalation paths.' },
      { q: 'How do you check the security score of a running service?', a: 'Run systemd-analyze security servicename.service. It prints a 0-10 score and lists missing sandboxing directives with their risk contribution.' },
      { q: 'What does PrivateNetwork=yes give the service?', a: 'An isolated network namespace with only a loopback interface. The service cannot make outbound connections or listen on any external port.' },
      { q: 'What does ProtectHome=yes do?', a: 'Makes /home, /root, and /run/user inaccessible to the service. The service cannot read user SSH keys, shell histories, or personal files.' },
      { q: 'How do you give a sandboxed service write access to exactly one directory?', a: 'Combine ProtectSystem=strict with ReadWritePaths=/var/lib/myapp. The system directories stay read-only while the service can write to its data path.' },
      { q: 'What is CapabilityBoundingSet= used for?', a: 'Restricts which Linux capabilities the service process can ever acquire. Setting it to an empty set or a minimal list like CAP_NET_BIND_SERVICE removes all unnecessary root-like powers.' },
      { q: 'What does SystemCallFilter=@system-service do?', a: 'Restricts syscalls to a curated allowlist suitable for most server processes. Any syscall outside the set causes the process to be killed with SIGSYS.' },
    ],
    references: [
      'https://www.freedesktop.org/software/systemd/man/systemd.exec.html',
      'https://www.freedesktop.org/software/systemd/man/systemd-analyze.html',
    ],
  },
  {
    id: 'linux-service-management',
    title: 'Service Management with systemctl',
    icon: 'settings',
    color: '#f59e0b',
    questions: 7,
    description: 'systemctl verbs, unit file Wants/Requires/After, target units, enable vs start, and daemon-reload.',
    visualizations: [
      { title: 'Troubleshooting Playbook', description: 'systemctl status → journalctl → ss → df/free → top → root cause → fix or escalate', image: '/diagrams/linux/linux-troubleshooting-playbook.png' },
    ],
    introduction: `**systemctl** is the primary interface to systemd — the init system, service manager, and system state machine on every major Linux distribution. Understanding systemctl deeply means understanding how services start, how dependencies are resolved, how to diagnose failures, and how the system boots.\n\n## Unit Types\n\nsystemd manages **units** — not just services. Unit types include: \`.service\` (daemons), \`.socket\` (socket activation), \`.target\` (dependency groups), \`.timer\` (cron replacement), \`.mount\` (filesystem mounts), \`.device\` (udev devices), \`.path\` (filesystem watch).\n\n## Essential systemctl Verbs\n\n| Verb | What it does |\n|---|---|\n| \`start\` | Start the unit now |\n| \`stop\` | Stop the unit now |\n| \`restart\` | Stop then start |\n| \`reload\` | Send SIGHUP (reload config without restart) |\n| \`status\` | Show unit state, last log lines, PID |\n| \`enable\` | Create symlink to start at boot |\n| \`disable\` | Remove boot symlink |\n| \`mask\` | Symlink to /dev/null — prevents any start |\n| \`unmask\` | Remove the /dev/null symlink |\n| \`daemon-reload\` | Re-read all unit files from disk |\n\n## Dependency Directives\n\nUnit file \`[Unit]\` section directives control ordering and dependencies:\n\n- **\`After=\`** — ordering only. This unit starts **after** the listed units are active. Does not require them to be present.\n- **\`Requires=\`** — hard dependency. If the required unit fails to start or stops, this unit is also stopped.\n- **\`Wants=\`** — soft dependency. Systemd will try to start the wanted unit, but this unit is not stopped if the wanted unit fails.\n- **\`Before=\`** — this unit must start **before** the listed units.\n- **\`BindsTo=\`** — like Requires but tighter: if the bound unit stops for any reason, this unit stops immediately.\n\n## Target Units\n\nTargets are grouping units with no executable payload. Key targets:\n\n- \`multi-user.target\` — multi-user text mode (server default)\n- \`graphical.target\` — GUI mode (extends multi-user.target)\n- \`network.target\` — network is up\n- \`rescue.target\` — minimal single-user recovery`,
    whenToUse: [
      'Reloading nginx config without dropping connections — systemctl reload nginx (SIGHUP, no downtime)',
      'Preventing a service from ever starting — systemctl mask servicename',
      'Diagnosing a service that fails to start — systemctl status + journalctl -u + systemd-analyze verify',
      'Understanding boot order — systemctl list-dependencies multi-user.target',
      'After editing a unit file — systemctl daemon-reload is required before the change takes effect',
    ],
    keyConcepts: [
      { term: 'start vs enable', definition: `**start** — runs the unit **now**. **enable** — creates a symlink so the unit starts at **next boot**. A service can be running but not enabled (starts manually) or enabled but stopped (will start at boot).` },
      { term: 'restart vs reload', definition: `**restart** — stops and starts the process (brief downtime, new PID). **reload** — sends SIGHUP; the process re-reads its config with no downtime. Only works if the service supports SIGHUP reload.` },
      { term: 'mask', definition: `Creates a symlink \`/etc/systemd/system/servicename.service -> /dev/null\`. The unit **cannot be started** by any means — not manually, not as a dependency. Stronger than disable.` },
      { term: 'daemon-reload', definition: `**Required after any unit file change**. Instructs systemd to re-read all unit files from disk. Without it, systemd runs the old unit definition even if the file has changed.` },
      { term: 'Wants= vs Requires=', definition: `**Wants=** is a soft dependency — the wanted unit is started if possible, but failure doesn't stop this unit. **Requires=** is hard — if the required unit fails, this unit is stopped too.` },
      { term: 'systemctl isolate', definition: `Switches the system to a specific target, stopping all units not wanted by that target. \`systemctl isolate rescue.target\` puts the system in rescue mode. Use with care — stops services.` },
    ],
    pitfalls: [
      'Editing a unit file and running systemctl restart without daemon-reload first — systemd restarts the service using the OLD unit file. Always daemon-reload first.',
      'Using Requires= when Wants= is more appropriate — if the dependency is not critical and its failure should not take down your service, use Wants=. Requires= creates fragile dependency chains.',
      'Confusing enable and start — a common mistake is enabling a service but not starting it, then wondering why it is not running until the next reboot.',
      'Not checking unit file syntax before loading — systemd-analyze verify /path/to/unit.service checks for errors without loading. Use before daemon-reload on production systems.',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between systemctl restart and systemctl reload? When should you use each?',
        answer: `## systemctl restart\n\n**Stops the process, then starts it again.** The old process is terminated (SIGTERM, then SIGKILL after timeout), and a new process starts with the updated configuration.\n\n- New PID\n- Brief downtime between stop and start\n- All in-flight requests are dropped\n- Required when: binary is updated, config changes require a full reinitialisation, environment variables changed\n\n\`\`\`bash\nsystemctl restart nginx\nsystemctl status nginx  # new PID\n\`\`\`\n\n## systemctl reload\n\n**Sends SIGHUP to the running process.** The process handles SIGHUP by re-reading its configuration file without terminating.\n\n- Same PID\n- **No downtime** — in-flight connections continue\n- Only works if the service implements a SIGHUP handler for config reload\n- Services that support reload: nginx, apache2, sshd, haproxy, rsyslog, bind\n\n\`\`\`bash\nnginx -t                # test config first\nsystemctl reload nginx  # zero-downtime reload\n\`\`\`\n\n## reload-or-restart\n\n\`\`\`bash\n# Use reload if the service supports it, otherwise restart\nsystemctl reload-or-restart nginx\n\`\`\`\n\n## Decision Rule\n\n| Situation | Use |\n|---|---|\n| Config file changed (nginx, sshd) | reload |\n| Binary updated (package upgrade) | restart |\n| Unit file changed | daemon-reload + restart |\n| Unsure if service supports reload | reload-or-restart |`,
      },
      {
        question: 'Walk through writing a systemd unit file for a custom application with proper dependencies.',
        answer: `## Complete Unit File\n\n\`\`\`ini\n[Unit]\nDescription=My Application Server\nDocumentation=https://myapp.example.com/docs\n\n# Ordering — start after network and database\nAfter=network.target postgresql.service\n\n# Soft dependency — try to start postgres, but don't fail if absent\nWants=postgresql.service\n\n[Service]\nType=simple\n\n# Identity\nUser=myapp\nGroup=myapp\n\n# Working directory and command\nWorkingDirectory=/opt/myapp\nExecStart=/opt/myapp/bin/server --port 8080\n\n# Zero-downtime reload via SIGHUP\nExecReload=/bin/kill -HUP $MAINPID\n\n# Environment\nEnvironmentFile=/etc/myapp/environment\n\n# Restart policy\nRestart=on-failure\nRestartSec=5s\nStartLimitIntervalSec=60s\nStartLimitBurst=5\n\n# Logging\nStandardOutput=journal\nStandardError=journal\nSyslogIdentifier=myapp\n\n[Install]\n# Start when entering multi-user mode (standard server target)\nWantedBy=multi-user.target\n\`\`\`\n\n## Validate and Load\n\n\`\`\`bash\n# Check syntax\nsystemd-analyze verify /etc/systemd/system/myapp.service\n\n# Load and start\nsystemctl daemon-reload\nsystemctl enable --now myapp.service\n\n# Verify\nsystemctl status myapp.service\njournalctl -u myapp.service -f\n\`\`\`\n\n## Key Unit File Decisions\n\n- **Type=simple** — process stays in foreground (most modern apps)\n- **Type=forking** — legacy daemons that fork into background and write a PID file\n- **Type=notify** — process sends sd_notify("READY=1") when fully started (most reliable)`,
      },
      {
        question: 'What does systemctl mask do, and when would you use it instead of disable?',
        answer: `## disable vs mask\n\n**disable**:\n- Removes the symlink from the \`.wants/\` directory\n- The service will not start automatically at boot\n- **Can still be started manually**: \`systemctl start servicename\` works\n- Can still be started as a dependency of another unit\n\n**mask**:\n- Creates a symlink \`/etc/systemd/system/servicename.service -> /dev/null\`\n- The service **cannot be started by any means** — manually, at boot, or as a dependency\n- systemd reads the unit file, finds \`/dev/null\`, and refuses to start it\n\n## When to Use mask\n\n\`\`\`bash\n# Prevent a conflicting service from ever starting\n# Example: system ships both firewalld and iptables — use only one\nsystemctl mask firewalld\n\n# Prevent a service with a security vulnerability from running\nsystemctl mask telnet.socket\n\n# Prevent an unnecessary default service (saves resources)\nsystemctl mask ModemManager\n\`\`\`\n\n## Unmask\n\n\`\`\`bash\n# Remove the /dev/null symlink, making the service manageable again\nsystemctl unmask firewalld\n\`\`\`\n\n## List All Masked Units\n\n\`\`\`bash\nsystemctl list-unit-files --state=masked\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between systemctl start and systemctl enable?', a: 'start runs the unit immediately. enable creates a symlink so it starts at next boot. A service can be started but not enabled, or enabled but currently stopped.' },
      { q: 'What does systemctl daemon-reload do and when is it required?', a: 'Instructs systemd to re-read all unit files from disk. Required after any unit file change -- without it, systemd restarts the service using the old definition.' },
      { q: 'What is the difference between Wants= and Requires= in a unit file?', a: 'Wants= is a soft dependency -- the wanted unit starts if possible but failure does not stop this unit. Requires= is hard -- if the required unit fails, this unit is also stopped.' },
      { q: 'What does systemctl mask do that disable does not?', a: 'mask symlinks the unit to /dev/null, preventing any start by any means including as a dependency. disable only removes the boot symlink; the service can still be started manually.' },
      { q: 'What is the difference between Type=simple and Type=notify?', a: 'simple considers the service ready as soon as ExecStart launches. notify waits for the process to send sd_notify(READY=1), giving a reliable ready signal for slow-starting services.' },
      { q: 'How do you reload nginx config with zero downtime using systemctl?', a: 'systemctl reload nginx sends SIGHUP to the running process, which re-reads config without restarting. The PID stays the same and in-flight connections are not dropped.' },
      { q: 'What unit file directive controls the restart retry limit?', a: 'StartLimitBurst= and StartLimitIntervalSec= together cap restarts. For example, Burst=5 and IntervalSec=60s allows up to 5 restarts per minute before systemd stops trying.' },
      { q: 'How do you check all failed units at once?', a: 'systemctl --failed lists all units in a failed state. Combine with journalctl -u unitname -n 50 to see the last 50 log lines explaining each failure.' },
      { q: 'What target does a typical server service belong to?', a: 'WantedBy=multi-user.target in the [Install] section. This makes the service start when the system reaches multi-user text mode, which is the default run level for servers.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man1/systemctl.1.html',
      'https://www.freedesktop.org/software/systemd/man/systemd.unit.html',
      'https://www.freedesktop.org/software/systemd/man/systemd.service.html',
    ],
  },

  // ─── FUNDAMENTALS (additional) ─────────────────────────────────────────────
  {
    id: 'linux-permissions',
    title: 'File Permissions & ACLs',
    icon: 'cpu',
    color: '#3b82f6',
    category: 'fundamentals',
    questions: 7,
    description: 'chmod, chown, umask, SUID/SGID/sticky bit, and POSIX ACLs for fine-grained access control.',
    visualizations: [
      { title: 'Permission Bits Model', description: 'rwx for owner/group/others, octal notation (4=r 2=w 1=x), special bits SUID/SGID/sticky', image: '/diagrams/linux/linux-permissions-model.png' },
    ],
    introduction: `**Understanding permissions is non-negotiable for DevOps.** Every SSH key must be 600. Every script needs +x. Every shared directory needs SGID. Get this wrong and you get 'Permission denied' with no obvious fix — or worse, a security hole.\n\n## Reading ls -l Output\n\nEvery ls -l line starts with 10 characters: \`drwxr-xr-x\`\n- Position 1: file type (\`-\`=file, \`d\`=directory, \`l\`=symlink, \`b\`=block device)\n- Positions 2-4: owner permissions (r/w/x)\n- Positions 5-7: group permissions (r/w/x)\n- Positions 8-10: others permissions (r/w/x)\n\n## The 4-2-1 Rule\n\nOctal permissions are three digits, each a sum of: **4**=read, **2**=write, **1**=execute.\n- **7** = 4+2+1 = rwx (full access)\n- **6** = 4+2+0 = rw- (read/write, no execute)\n- **5** = 4+0+1 = r-x (read and execute, no write)\n- **4** = 4+0+0 = r-- (read only)\n\nMemoise the pairs: **755** (web server), **644** (config files), **700** (~/.ssh), **600** (private keys).\n\nFile permissions are the foundation of Linux security. Every file and directory has an owner (user), an owning group, and permission bits split into three sets: owner, group, and others.

**Octal vs symbolic chmod notation**: chmod 755 is identical to chmod u=rwx,g=rx,o=rx. Octal maps directly: 4=read, 2=write, 1=execute, so 7=rwx, 6=rw-, 5=r-x, 4=r--.

**umask**: The user file-creation mask subtracts permissions from the default. Default umask 022 means new files get 644 (666 minus 022) and directories get 755 (777 minus 022). Change with umask 027 to give group read-only and no other access.

**SUID bit (4000)**: When set on an executable, the process runs as the file's owner, not the calling user. /usr/bin/passwd uses SUID to let any user write to /etc/shadow (owned by root). Set with chmod u+s or chmod 4755.

**SGID bit (2000)**: On executables, runs as the file's group. On directories, new files created inside inherit the directory's group rather than the creator's primary group — essential for shared project directories. Set with chmod g+s.

**Sticky bit (1000)**: On directories like /tmp, only the file owner (or root) can delete files even if the directory is world-writable. Set with chmod +t.

**POSIX ACLs**: Standard permissions support only one user and one group. getfacl shows ACLs, setfacl -m u:alice:rw file grants alice read/write without changing the owning group. setfacl -m d:u:alice:rw dir sets default ACL for new files in a directory. ACL entries are stored as extended attributes.`,
    whenToUse: [
      'Hardening file access on multi-user systems',
      'Setting up shared directories with SGID for consistent group ownership',
      'Granting fine-grained access without creating new groups (ACLs)',
      'Security audits — finding world-writable or SUID files',
    ],
    keyConcepts: [
      {
        term: 'chmod octal vs symbolic',
        definition: 'chmod 755 == chmod u=rwx,g=rx,o=rx. Octal: 4=r, 2=w, 1=x. Symbolic: u/g/o/a and +/-/= operators.',
      },
      {
        term: 'umask',
        definition: 'Mask subtracted from default permissions on creation. umask 022 → files 644, dirs 755. umask 027 → files 640, dirs 750.',
      },
      {
        term: 'SUID/SGID/sticky bit',
        definition: 'SUID (4xxx): execute as file owner. SGID (2xxx): execute as file group; on dirs, new files inherit group. Sticky (1xxx): on dirs, only owner can delete.',
      },
      {
        term: 'POSIX ACL (getfacl/setfacl)',
        definition: 'Extends standard ugo model to grant per-user and per-group permissions. setfacl -m u:alice:rw file; getfacl shows current ACL. Default ACLs apply to new files inside directories.',
      },
    ],
    pitfalls: [
      'World-writable files (o+w) are a security risk — find them with: find / -perm -002 -not -type l',
      'SUID on shell scripts does not work — Linux ignores SUID on interpreted scripts for security reasons',
      'chmod -R without care can remove execute bit from directories, making them inaccessible',
      'setfacl mask limits effective group/named-user ACL permissions — check with getfacl after setting',
    ],
    keyQuestions: [
      {
        question: 'Explain the difference between octal permissions 755 and 700, and when you would use each.',
        answer: `## 755 vs 700

\`\`\`bash
# 755: rwxr-xr-x
# Owner: read, write, execute
# Group: read, execute (can enter directory, can run executable)
# Others: read, execute

# 700: rwx------
# Owner: full access
# Group: no access
# Others: no access
\`\`\`

**Use 755 for**:
- Web server document roots that need to be readable by the web server process (www-data group or other)
- System binaries like /usr/bin/* that all users need to execute
- Project directories where team members need read access

**Use 700 for**:
- ~/.ssh directory (SSH will refuse to work if permissions are too open)
- Private key files — actually use 600 (no execute needed)
- Personal script directories with sensitive logic

\`\`\`bash
# Find files with insecure world-readable permissions in home dirs
find /home -maxdepth 3 -perm -o+r -name "*.key" -o -name "*.pem"

# Check SSH directory permissions (SSH requires this)
ls -la ~/.ssh
# Should be: drwx------ (700)
# Private keys: -rw------- (600)
\`\`\``,
      },
      {
        question: 'What is the SUID bit, where is it legitimately used, and what security risk does it pose?',
        answer: `## SUID Bit

When the SUID bit is set on an executable, the process runs with the **file owner's privileges** instead of the calling user's privileges.

\`\`\`bash
# Find all SUID executables on the system
find / -perm -4000 -type f 2>/dev/null

# Common legitimate SUID binaries
ls -la /usr/bin/passwd    # -rwsr-xr-x (s = SUID set)
ls -la /usr/bin/sudo      # -rwsr-xr-x
ls -la /usr/bin/ping      # May have SUID or capabilities

# The 's' in the owner execute position = SUID
# If it were 'S' (capital), it means SUID set but no execute — likely a mistake
\`\`\`

**Legitimate uses**:
- /usr/bin/passwd — must write to /etc/shadow (owned by root) so any user can change their password
- /usr/bin/sudo — needs root to elevate privileges
- /usr/bin/mount — historically needed root to mount filesystems

**Security risks**:
- Any SUID binary with a vulnerability can be exploited to gain root
- Custom SUID programs are high-value attack targets
- SUID shell scripts are ignored by the kernel, but this is a common misconception that leads to false confidence

\`\`\`bash
# Remove SUID from a file
chmod u-s /path/to/binary

# Never do this — SUID on a shell is an immediate root backdoor
chmod u+s /bin/bash  # DO NOT DO THIS
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What do the three octal digits in chmod 755 represent?', a: 'Owner, group, and others. Each digit is the sum of read(4) + write(2) + execute(1). 755 means owner can rwx, group and others can r-x.' },
      { q: "What does the SUID bit do on an executable?", a: "The binary runs with the file owner\'s UID rather than the invoking user\'s UID. passwd is the classic example -- it runs as root to write /etc/shadow." },
      { q: 'What does the sticky bit do on a directory?', a: 'Only the file owner, directory owner, or root can delete files in that directory. /tmp uses the sticky bit so users cannot delete each other\'s temp files.' },
      { q: 'How do ACLs extend standard Unix permissions?', a: 'ACLs add per-user and per-group entries beyond the owner/group/other triad. Use setfacl -m u:alice:rw file to grant a specific user access without changing group ownership.' },
      { q: 'What is the default umask and how does it work?', a: 'The default umask is 022. It masks off permissions from the maximum (666 for files, 777 for dirs). umask 022 produces 644 files and 755 directories.' },
      { q: 'How do you find all SUID binaries on a system?', a: 'find / -perm -4000 -type f 2>/dev/null lists all SUID files. These are high-value attack targets if they contain vulnerabilities.' },
      { q: 'What does chmod g+s on a directory do?', a: 'Sets the SGID bit. New files created inside inherit the directory\'s group rather than the creator\'s primary group. Essential for shared project directories.' },
      { q: 'How do you preserve ACLs when copying files?', a: 'Use cp -a or rsync -a --acls. Plain cp without flags drops extended ACL entries, leaving only the standard permission bits.' },
      { q: 'What does getfacl show that ls -l does not?', a: 'getfacl shows all ACL entries including named user and group entries, the effective permissions mask, and the default ACL for directories.' },
      { q: 'How do you remove all ACL entries from a file?', a: 'setfacl -b filename removes all extended ACL entries, leaving only the standard owner/group/other permissions.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man1/chmod.1.html',
      'https://man7.org/linux/man-pages/man5/acl.5.html',
    ],
  },
  {
    id: 'linux-users-groups',
    title: 'Users, Groups & Authentication',
    icon: 'cpu',
    color: '#3b82f6',
    category: 'fundamentals',
    questions: 6,
    description: '/etc/passwd, /etc/shadow, useradd/usermod, and the distinction between su and sudo.',
    visualizations: [
      { title: 'Linux User Types', description: 'Root (UID 0), regular users (UID ≥1000), service accounts (UID 1-999) and their storage files', image: '/diagrams/linux/linux-users-types.png' },
    ],
    introduction: `Linux has three categories of users, and knowing which type to use — and when — is a core sysadmin skill.\n\n## Three User Types\n\n- **Root (UID 0)** — unrestricted access to everything. Use sparingly, always via \`sudo\` rather than a direct root session. The golden rule: *grant the least access needed*.\n- **Regular users (UID ≥ 1000)** — standard login accounts with a home directory and a login shell. These are real humans.\n- **Service accounts (UID 1-999)** — created by packages for daemons (nginx, postgres, redis). No login shell (\`/sbin/nologin\`), no password, no home directory beyond what the service needs.\n\n## The Three Key Files\n\n\`\`\`bash\n/etc/passwd  # All accounts: username:x:UID:GID:GECOS:home:shell\n/etc/shadow  # Password hashes: root-only (mode 000), $6$=SHA-512\n/etc/group   # Group membership: groupname:x:GID:member1,member2\n\`\`\`\n\nLinux user management is built around two core files and a set of commands that modify them.

**/etc/passwd format** — seven colon-delimited fields: username:x:UID:GID:GECOS:home_directory:shell. The 'x' in the password field means the actual hash is in /etc/shadow. UID 0 is root; UIDs 1-999 are typically system accounts; UIDs 1000+ are regular users. The GECOS field holds the full name and other info (visible in finger command). The shell field determines the login shell — /sbin/nologin or /bin/false blocks interactive login for service accounts.

**/etc/shadow** stores the actual password hashes, readable only by root. Format: username:hash:last_change:min_days:max_days:warn_days:inactive_days:expiry. Hash format: $id$salt$hash where id identifies the algorithm (6=SHA-512, 5=SHA-256, 1=MD5-deprecated).

**useradd vs adduser**: useradd is the low-level tool (requires explicit flags for home dir, shell, etc.). adduser (Debian/Ubuntu) is a higher-level script with interactive prompts and sensible defaults. In RHEL/CentOS, useradd is configured via /etc/login.defs and /etc/default/useradd.

**Group management**: Each user has a primary group (set at login, files created with this GID) and supplementary groups (additional access). id command shows all. usermod -aG groupname username adds to a supplementary group without removing existing ones — the -a flag is critical.

**su vs sudo**: su switches to another user entirely (needs that user's password; switches environment). sudo runs a single command as another user (needs your own password; logged to syslog; controlled by /etc/sudoers). For system administration, sudo is preferred because it provides accountability.`,
    whenToUse: [
      'Provisioning new user accounts on a server',
      'Managing service accounts for applications',
      'Auditing who has access to what groups',
      'Troubleshooting permission denied errors related to group membership',
    ],
    keyConcepts: [
      {
        term: '/etc/passwd 7-field format',
        definition: 'username:x:UID:GID:GECOS:home:shell — the x means password hash is in /etc/shadow. UID 0=root, 1-999=system, 1000+=users.',
      },
      {
        term: '/etc/shadow',
        definition: 'Stores password hashes readable only by root. Format: user:$alg$salt$hash:last_change:min:max:warn:inactive:expiry. $6$=SHA-512.',
      },
      {
        term: 'useradd vs adduser',
        definition: 'useradd is low-level (requires flags). adduser (Debian) is a friendlier wrapper. useradd -m -s /bin/bash -G sudo username is a typical invocation.',
      },
      {
        term: 'su vs sudo',
        definition: 'su switches full user context (needs target password). sudo runs one command elevated (needs your password, logs to syslog, controlled by /etc/sudoers). sudo is preferred for auditability.',
      },
    ],
    pitfalls: [
      'usermod -G group user REPLACES all supplementary groups — always use -aG to append',
      'Not locking disabled accounts: usermod -L username locks the password, but the account can still authenticate via SSH keys unless also setting the shell to /sbin/nologin',
      'UID 0 accounts other than root are a security red flag — find with: awk -F: \'$3==0\' /etc/passwd',
      'getent passwd/group instead of reading files directly — works with LDAP and NIS, not just local files',
    ],
    keyQuestions: [
      {
        question: 'Walk through the /etc/passwd and /etc/shadow file formats. Why are they separate?',
        answer: `## /etc/passwd

\`\`\`bash
cat /etc/passwd | head -3
# root:x:0:0:root:/root:/bin/bash
# daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
# alice:x:1001:1001:Alice Smith:/home/alice:/bin/bash

# Fields: username:password:UID:GID:GECOS:home:shell
# 'x' means password hash is in /etc/shadow
\`\`\`

## /etc/shadow

\`\`\`bash
sudo cat /etc/shadow | grep alice
# alice:$6$salt$longhash...:19800:0:99999:7:::

# Fields: username:hash:last_change:min_days:max_days:warn_days:inactive:expiry:reserved
# $6$ = SHA-512 algorithm
# last_change: days since epoch (Jan 1 1970) when password was last changed
\`\`\`

## Why Separate?

/etc/passwd must be **world-readable** because many programs (ls, ps) need to map UIDs to usernames. If password hashes were in passwd, anyone could run offline dictionary attacks.

/etc/shadow is readable **only by root** (mode 000 or 640 with shadow group), protecting the hashes from offline cracking.

\`\`\`bash
ls -la /etc/passwd /etc/shadow
# -rw-r--r-- 1 root root   /etc/passwd   (world-readable)
# -rw-r----- 1 root shadow /etc/shadow   (root + shadow group only)
\`\`\``,
      },
      {
        question: 'What is the difference between su and sudo? When would you use each?',
        answer: `## su (Switch User)

\`\`\`bash
su alice          # Switch to alice — prompts for ALICE's password
su -              # Switch to root as login shell — prompts for root's password
su - alice        # Switch to alice with full login environment
su -c "command"   # Run single command as root
\`\`\`

- Requires the **target user's password**
- Switches full session context (environment, groups)
- No audit trail beyond PAM logs
- Root login via su requires knowing the root password

## sudo (Superuser Do)

\`\`\`bash
sudo command           # Run as root — prompts for YOUR password
sudo -u alice command  # Run as alice
sudo -i                # Interactive root shell
sudo -l                # List what you're allowed to run
sudo !!                # Re-run last command with sudo
\`\`\`

- Requires **your own password** (or NOPASSWD in sudoers)
- Every command logged to /var/log/auth.log or journald
- Controlled per-command by /etc/sudoers
- Root password can remain unknown/disabled

## When to Use Each

| Use su when... | Use sudo when... |
|---|---|
| You need a full root shell session | You need one or a few commands as root |
| On minimal systems without sudo | On any properly administered server |
| Switching to service accounts locally | You need auditability of elevated commands |`,
      },
    ],
    quickFire: [
      { q: 'What is the difference between useradd and adduser?', a: 'useradd is the low-level binary that creates the user with explicit flags. adduser is a higher-level Debian/Ubuntu wrapper that prompts interactively and creates home dirs by default.' },
      { q: 'What does /etc/shadow store and why is it separate from /etc/passwd?', a: '/etc/shadow stores hashed passwords and aging metadata. Separating it from /etc/passwd (world-readable) means only root and shadow group can read password hashes.' },
      { q: 'What is a service account and how does it differ from a login account?', a: 'A service account runs a daemon process with no interactive login shell (shell set to /sbin/nologin or /bin/false) and no home directory. It cannot be used to log into the system.' },
      { q: 'How do you lock a user account without deleting it?', a: 'passwd -l username or usermod -L username prepends a ! to the password hash in /etc/shadow, blocking password authentication. SSH key auth may still work unless also blocked.' },
      { q: 'What is the difference between primary and supplementary groups?', a: 'The primary group appears in /etc/passwd and is assigned to new files by default. Supplementary groups grant additional access. A user can have one primary group and up to 65535 supplementary groups.' },
      { q: 'What does the /etc/skel directory do?', a: '/etc/skel contains template files copied into every new user\'s home directory at creation time. Modify it to set default .bashrc, .profile, or other dotfiles for all new users.' },
      { q: 'How do you add an existing user to a supplementary group?', a: 'usermod -aG groupname username. The -a flag appends; omitting it replaces all supplementary groups. Changes take effect at the user\'s next login.' },
      { q: 'What does id command show?', a: 'id prints the current user\'s UID, primary GID, and all supplementary group memberships by name and number. id username shows the same for any user.' },
      { q: 'How do you check which groups a user belongs to?', a: 'groups username lists group memberships from /etc/group. id username shows the same with numeric IDs. getent group groupname shows all members of a specific group.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man5/passwd.5.html',
      'https://man7.org/linux/man-pages/man8/useradd.8.html',
    ],
  },
  {
    id: 'linux-package-management',
    title: 'Package Management',
    icon: 'cpu',
    color: '#3b82f6',
    category: 'fundamentals',
    questions: 6,
    description: 'apt/dpkg, yum/dnf/rpm, snap, and compiling from source — the full software installation stack.',
    visualizations: [
      { title: 'Package Manager Families', description: 'Debian/Ubuntu (apt/dpkg) vs RHEL/Fedora (dnf/rpm) + universal packages (snap/flatpak/pip/npm/Docker)', image: '/diagrams/linux/linux-package-families.png' },
    ],
    introduction: `Package managers are the first skill you use on any new server. Knowing both ecosystems is essential because job requirements don't pick one family for you.\n\n## Two Major Families\n\n| Distro | High-level | Low-level | Package format |\n|---|---|---|---|\n| Debian / Ubuntu | apt | dpkg | .deb |\n| RHEL / Fedora / CentOS | dnf / yum | rpm | .rpm |\n\n## Critical Rule\n\n**Always \`apt update\` before \`apt install\`** — without it you install from a stale package list and may get old versions or 'not found' errors.\n\n**Never \`curl https://... | bash\` in production.** Review the script first. Download it, read it, then run it.\n\n## Daily Commands (Debian/Ubuntu)\n\n\`\`\`bash\napt update                    # Refresh package lists\napt install nginx             # Install a package\napt upgrade                   # Upgrade all installed packages\napt remove nginx              # Remove (keep config files)\napt purge nginx               # Remove + delete config\napt search nginx              # Find packages by name\ndpkg -l | grep nginx          # Check if installed\n\`\`\`\n\n## Daily Commands (RHEL/Fedora)\n\n\`\`\`bash\ndnf check-update              # Check for updates\ndnf install nginx             # Install\ndnf remove nginx              # Remove\ndnf list installed            # All installed packages\nrpm -qa | grep nginx          # Check installed (low-level)\n\`\`\`\n\nLinux package management splits into two major ecosystems: Debian-based (apt/dpkg) and RHEL-based (yum/dnf/rpm). Understanding both is essential for working across distributions.

**Debian ecosystem (Ubuntu/Debian)**:
apt is the high-level tool that handles dependency resolution and downloads from repositories. dpkg is the low-level backend that actually installs .deb files. apt update refreshes the package index from sources. apt upgrade installs newer versions of currently installed packages. apt dist-upgrade additionally resolves dependency changes (may add or remove packages). apt full-upgrade is the modern equivalent of dist-upgrade. Repositories are defined in /etc/apt/sources.list and files under /etc/apt/sources.list.d/.

**RHEL ecosystem (CentOS/Fedora/RHEL)**:
dnf (Dandified YUM) replaced yum in Fedora 22+ and RHEL 8+. dnf is faster with better dependency resolution and memory usage. rpm is the low-level tool. rpm -qa queries all installed packages, rpm -qi package shows info, rpm -ql package lists files, rpm -qf /path/to/file identifies which package owns a file.

**Finding package ownership**: On Debian: dpkg -S /path/to/file. On RHEL: rpm -qf /path/to/file.

**snap**: Canonical's universal package format — self-contained with dependencies bundled. Confinement levels: strict (sandboxed), classic (full system access like traditional packages), devmode (for development). snap list shows installed snaps.

**Compiling from source**: ./configure --prefix=/usr/local checks dependencies and generates Makefile, make compiles, sudo make install installs. Use checkinstall instead of make install to create a proper package for later removal.`,
    whenToUse: [
      'Installing or removing software on Linux servers',
      'Auditing installed packages for security vulnerabilities',
      'Setting up reproducible server environments',
      'Troubleshooting missing library errors',
    ],
    keyConcepts: [
      {
        term: 'apt vs dpkg',
        definition: 'apt is the high-level frontend (handles dependencies, downloads). dpkg is the low-level backend (installs .deb files directly). apt uses dpkg under the hood.',
      },
      {
        term: 'dnf vs rpm',
        definition: 'dnf (next-gen yum) handles dependency resolution and repo downloads. rpm operates on local .rpm files. dnf install package vs rpm -ivh package.rpm.',
      },
      {
        term: '/etc/apt/sources.list format',
        definition: 'deb http://archive.ubuntu.com/ubuntu focal main restricted universe — fields: type, URL, suite (codename), components. deb-src for source packages.',
      },
      {
        term: 'snap confinement levels',
        definition: 'strict: sandboxed, limited system access. classic: full system access like traditional packages. devmode: debugging, all access, logs warnings.',
      },
    ],
    pitfalls: [
      'apt upgrade vs dist-upgrade: upgrade never removes packages; dist-upgrade will remove packages to resolve dependency conflicts — always review what dist-upgrade plans to remove',
      'Mixing apt and pip/gem/npm without virtual environments causes system Python/Ruby breakage',
      'Not pinning package versions in production: apt-mark hold packagename prevents accidental upgrades',
      'After adding a new repository, always run apt update before trying to install from it',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between apt update, apt upgrade, and apt dist-upgrade?',
        answer: `## apt update

\`\`\`bash
apt update
# Downloads the package index from all configured repositories
# Does NOT install or upgrade anything
# Must run before apt upgrade or apt install to see current versions
\`\`\`

## apt upgrade

\`\`\`bash
apt upgrade
# Installs newer versions of all currently installed packages
# WILL NOT remove any packages
# WILL NOT install new packages as dependencies if that would require removing others
# Safest for production — no packages removed
\`\`\`

## apt dist-upgrade (apt full-upgrade)

\`\`\`bash
apt dist-upgrade
# Same as upgrade but also handles changing dependencies
# WILL remove packages if necessary to resolve conflicts
# WILL install new packages to satisfy dependencies
# Used for major system upgrades and kernel updates

# Always preview what will happen:
apt dist-upgrade --simulate
apt dist-upgrade -s
\`\`\`

## Recommended Production Workflow

\`\`\`bash
apt update                          # Refresh index
apt upgrade --dry-run               # Preview changes
apt upgrade                         # Apply safe upgrades
# Then separately review and apply dist-upgrade changes
\`\`\``,
      },
      {
        question: 'How would you find which package owns a specific file on a Debian/Ubuntu system?',
        answer: `## Finding Package Ownership

\`\`\`bash
# Method 1: dpkg -S (searches installed packages)
dpkg -S /usr/bin/curl
# curl: /usr/bin/curl

dpkg -S /lib/x86_64-linux-gnu/libc.so.6
# libc6: /lib/x86_64-linux-gnu/libc.so.6

# Method 2: apt-file (searches ALL packages, even uninstalled)
apt install apt-file
apt-file update
apt-file search libssl.so.1.1
# libssl1.1: /usr/lib/x86_64-linux-gnu/libssl.so.1.1

# List all files owned by a package
dpkg -L curl
dpkg-query -L nginx

# On RHEL/CentOS:
rpm -qf /usr/bin/curl
# curl-7.76.1-14.el9.x86_64

# List all files in an rpm package
rpm -ql curl
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between apt update and apt upgrade?', a: 'apt update refreshes the local package index from repositories but installs nothing. apt upgrade downloads and installs newer versions of all installed packages.' },
      { q: 'How do you find which package owns a file in Debian/Ubuntu?', a: 'dpkg -S /path/to/file searches the installed package database. On RHEL/CentOS use rpm -qf /path/to/file.' },
      { q: 'What does apt-get install --no-install-recommends do?', a: 'Skips recommended packages, installing only strict dependencies. Essential for minimal container images where every megabyte counts.' },
      { q: 'How do you hold a package at its current version with apt?', a: 'apt-mark hold packagename prevents the package from being upgraded by apt upgrade. apt-mark unhold releases it.' },
      { q: 'What is the difference between rpm -i and rpm -U?', a: 'rpm -i installs a new package and fails if already installed. rpm -U upgrades an existing package or installs it fresh if not present. rpm -F upgrades only if already installed.' },
      { q: 'What does yum/dnf clean all do?', a: 'Removes all cached package data including metadata and downloaded RPMs. Fixes stale cache issues and recovers disk space but requires a slow re-download on next operation.' },
      { q: 'How do you list all files installed by a Debian package?', a: 'dpkg -L packagename lists every file path owned by that package. On RHEL use rpm -ql packagename.' },
      { q: 'What is a PPA and when would you add one?', a: 'A Personal Package Archive is a third-party apt repository hosted on Launchpad. Use it to get newer software versions not in the official Ubuntu repos. Risk: less vetting than official repos.' },
      { q: 'How do you pin a package to a specific version with apt?', a: 'Create /etc/apt/preferences.d/pinname with Pin: version X.Y and Pin-Priority: 1001. Higher priority than 1000 holds the version even against security upgrades.' },
    ],
    references: [
      'https://manpages.ubuntu.com/manpages/focal/man8/apt.8.html',
      'https://dnf.readthedocs.io/',
    ],
  },
  {
    id: 'linux-boot-process',
    title: 'Linux Boot Process',
    icon: 'cpu',
    color: '#3b82f6',
    category: 'fundamentals',
    questions: 7,
    description: 'BIOS/UEFI → GRUB2 → kernel → initramfs → systemd: understanding every stage of boot.',
    visualizations: [
      { title: 'Linux DevOps Learning Roadmap', description: 'Modules 1–4: Foundations → Users/Processes → Network/Packages → Automation/Security (10-day path)', image: '/diagrams/linux/linux-devops-roadmap.png' },
    ],
    introduction: `Understanding the Linux boot process helps diagnose startup failures and tune boot performance.

**Stage 1 — POST and firmware**: Power-On Self Test runs, then BIOS or UEFI firmware takes over. BIOS uses MBR (Master Boot Record, first 512 bytes of disk), limited to 4 primary partitions and 2TB disks. UEFI supports GPT (GUID Partition Table), Secure Boot (cryptographic signature verification of bootloader), and reads the EFI System Partition (ESP, typically /boot/efi, FAT32 formatted).

**Stage 2 — GRUB2**: The bootloader. In BIOS mode, GRUB stage 1 lives in the MBR and loads stage 1.5 from the gap after MBR, which loads stage 2 from /boot/grub/. In UEFI mode, GRUB lives on the ESP as a .efi file. GRUB reads /boot/grub/grub.cfg (generated by update-grub or grub2-mkconfig, never edited directly) to display the boot menu. Kernel parameters are passed here (root=UUID=..., ro, quiet, splash, init=/path for alternative init).

**Stage 3 — Kernel initialization**: GRUB decompresses the kernel image (vmlinuz) into RAM and passes control. The kernel initializes CPU, memory management, and devices. It mounts the initramfs (initial RAM filesystem) as a temporary root.

**Stage 4 — initramfs**: A small, compressed cpio archive containing just enough tools and drivers to mount the real root filesystem (drivers for disk controllers, LVM, RAID, crypto). After mounting real root, it performs pivot_root to switch over.

**Stage 5 — systemd**: PID 1 takes over, reads unit files, starts services in dependency order to reach the default target (usually multi-user.target or graphical.target). systemd-analyze blame shows which services are slowest to start.`,
    whenToUse: [
      'Diagnosing servers that fail to boot',
      'Adding kernel parameters for debugging (single user mode, no module loading)',
      'Understanding initramfs rebuild requirements after kernel module changes',
      'Performance tuning boot time with systemd-analyze',
    ],
    keyConcepts: [
      {
        term: 'UEFI vs BIOS',
        definition: 'BIOS: MBR, max 2TB, 4 primary partitions, no Secure Boot. UEFI: GPT, no practical size limit, 128 partitions, Secure Boot support, reads ESP partition.',
      },
      {
        term: 'GRUB2',
        definition: 'Bootloader that loads the kernel. Config in /boot/grub/grub.cfg (auto-generated). Kernel parameters passed here. GRUB rescue shell for recovery when config is broken.',
      },
      {
        term: 'initramfs',
        definition: 'Compressed cpio archive containing minimal drivers and tools needed to mount the real root filesystem. Lives at /boot/initrd.img-VERSION. Rebuilt with update-initramfs -u.',
      },
      {
        term: 'systemd targets vs runlevels',
        definition: 'multi-user.target = runlevel 3 (text multi-user), graphical.target = runlevel 5 (GUI), rescue.target = runlevel 1 (single user), emergency.target (minimal). systemctl get-default shows current.',
      },
    ],
    pitfalls: [
      'Editing /boot/grub/grub.cfg directly — it gets overwritten by update-grub. Edit /etc/grub.d/ scripts or /etc/default/grub instead',
      'Not rebuilding initramfs after adding kernel modules or changing dracut/initramfs-tools config — boot may fail',
      'UEFI Secure Boot blocking custom or third-party kernel modules (DKMS, NVIDIA drivers) — needs MOK enrollment',
      'Forgetting that GRUB timeout=0 makes recovery impossible without external boot media',
    ],
    keyQuestions: [
      {
        question: 'Describe every step from pressing the power button to the login prompt appearing.',
        answer: `## Complete Linux Boot Sequence

**1. Power On & POST**
\`\`\`
CPU resets → BIOS/UEFI firmware runs POST
→ Checks RAM, CPU, storage devices
→ BIOS: reads MBR from boot disk
→ UEFI: reads ESP partition, finds .efi bootloader
\`\`\`

**2. GRUB2 Bootloader**
\`\`\`bash
# GRUB displays menu from /boot/grub/grub.cfg
# User selects kernel entry (or timeout picks default)
# GRUB loads kernel image (vmlinuz) and initramfs into RAM
# Passes kernel command line: root=UUID=abc123 ro quiet splash
\`\`\`

**3. Kernel Initialization**
\`\`\`
vmlinuz decompresses itself into RAM
→ Initializes memory management (MMU, page tables)
→ Detects and initializes CPUs
→ Mounts initramfs as initial root filesystem
→ Runs /init script inside initramfs
\`\`\`

**4. initramfs**
\`\`\`bash
# initramfs /init script:
# - Loads storage drivers (SCSI, RAID, LVM, crypto)
# - Mounts real root filesystem
# - pivot_root: switches root to real filesystem
# - Execs /sbin/init (systemd) on real root
\`\`\`

**5. systemd (PID 1)**
\`\`\`bash
systemd-analyze                    # Total boot time
systemd-analyze blame              # Per-service startup time
systemd-analyze critical-chain     # Dependency bottleneck
journalctl -b                      # All logs from current boot
\`\`\``,
      },
      {
        question: 'What is initramfs and why does Linux need it?',
        answer: `## initramfs: Initial RAM Filesystem

initramfs (or initrd) is a **compressed cpio archive** loaded into RAM during boot before the real root filesystem is mounted.

## Why It's Needed

The kernel is modular — drivers for disk controllers, RAID, LVM, encryption are often loadable modules, not compiled in. But to load modules, you need to read from disk. To read from disk, you need the driver. This is the **chicken-and-egg problem**.

initramfs breaks the cycle by providing a minimal environment with just enough to get to the real disk:

\`\`\`bash
# What's inside initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | head -30
# Contains: /bin/sh, /lib/modules/..., /usr/bin/lvm, udev rules, etc.

# Rebuild after module changes:
update-initramfs -u -k $(uname -r)    # Debian/Ubuntu
dracut -f                               # RHEL/Fedora
\`\`\`

## Without initramfs You Would Need

- All storage drivers compiled into the kernel (bloated, one-size-fits-all)
- No LVM, RAID, or disk encryption support at boot
- No flexibility for different hardware configurations

## The Handoff

\`\`\`
initramfs mounts real root at /sysroot
→ chroot or pivot_root to /sysroot
→ exec /sbin/init (systemd)
→ initramfs RAM is freed
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What are the four main phases of the Linux boot process?', a: 'BIOS/UEFI firmware, bootloader (GRUB2), kernel initialization, and init system (systemd). Each phase hands off to the next.' },
      { q: 'What is the role of initramfs in the boot process?', a: 'initramfs is a temporary root filesystem loaded into RAM. It contains drivers and tools needed to mount the real root filesystem, including LVM, RAID, and encryption handlers.' },
      { q: 'What is the difference between BIOS and UEFI boot?', a: 'BIOS uses the MBR at the start of disk sector 0 and is limited to 2 TB disks with 4 primary partitions. UEFI uses the GPT partition table and a dedicated EFI System Partition, supporting larger disks and secure boot.' },
      { q: 'What does systemd-analyze blame show?', a: 'Lists all services sorted by their initialization time at boot. Use it to identify slow services that are delaying the boot sequence.' },
      { q: 'How do you boot into single-user or rescue mode?', a: 'At the GRUB menu press e to edit the kernel line, append systemd.unit=rescue.target, then Ctrl+X to boot. This starts a minimal environment for recovery tasks.' },
      { q: 'What is the significance of PID 1 in Linux?', a: 'PID 1 is the first process started by the kernel after boot. All other processes are its descendants. If PID 1 exits, the kernel panics. On modern systems PID 1 is systemd.' },
      { q: 'What does dracut do?', a: 'dracut generates the initramfs image. It discovers which kernel modules and binaries the system needs to mount root and bundles them into the initramfs. Run after kernel updates.' },
      { q: 'How do you add a kernel parameter permanently in GRUB2?', a: 'Edit /etc/default/grub and add the parameter to GRUB_CMDLINE_LINUX, then run grub2-mkconfig -o /boot/grub2/grub.cfg (RHEL) or update-grub (Debian) to regenerate grub.cfg.' },
      { q: 'What is the EFI System Partition?', a: 'A FAT32 partition flagged as EFI type in GPT. It stores bootloader files that UEFI firmware can directly execute. On Linux it is typically mounted at /boot/efi.' },
    ],
    references: [
      'https://www.gnu.org/software/grub/manual/grub/',
      'https://www.freedesktop.org/software/systemd/man/bootup.html',
    ],
  },
  {
    id: 'linux-kernel-basics',
    title: 'Linux Kernel & /proc',
    icon: 'cpu',
    color: '#3b82f6',
    category: 'fundamentals',
    questions: 6,
    description: 'Monolithic kernel design, loadable modules, /proc and /sys filesystems, and sysctl tunables.',
    visualizations: [
      { title: '/proc Filesystem Tree', description: 'Key /proc entries: cpuinfo, meminfo, net, sys, PID dirs', image: '/diagrams/linux/linux-kernel-proc-tree.png' },
      { title: 'Kernel Module Loading', description: 'modprobe → depmod → insmod → verify → module_init flow', image: '/diagrams/linux/linux-kernel-module-loading.png' },
    ],
    introduction: `The Linux kernel is monolithic: all core subsystems (memory management, process scheduling, filesystems, networking, device drivers) run in kernel space at the same privilege level. Unlike microkernels (where subsystems run as separate processes), this gives better performance at the cost of isolation — a kernel bug can crash the entire system.

**Loadable Kernel Modules (LKM)**: Despite being monolithic, Linux supports dynamically loading and unloading code (modules) without rebooting. lsmod lists loaded modules (from /proc/modules), modinfo shows module details (description, parameters, dependencies), modprobe loads a module and all its dependencies (reads /lib/modules/$(uname -r)/modules.dep), rmmod unloads (fails if module is in use), insmod loads a specific .ko file without dependency handling.

**/proc filesystem**: A virtual filesystem exposing kernel internal state as files. Nothing is stored on disk — files are generated on-the-fly when read. Key files: /proc/cpuinfo (CPU details including flags for virtualization support), /proc/meminfo (memory breakdown), /proc/loadavg (load averages and process counts), /proc/PID/ (per-process info: /proc/PID/cmdline, /proc/PID/maps for memory map, /proc/PID/fd/ for open file descriptors, /proc/PID/status), /proc/net/tcp for TCP connections (used by ss/netstat), /proc/sys/ for tunables.

**/sys filesystem (sysfs)**: Exposes device and driver information in a structured hierarchy. /sys/class/net/ for network interfaces, /sys/block/ for block devices.

**sysctl**: Reads and writes kernel parameters in /proc/sys/. sysctl -a shows all, sysctl net.ipv4.ip_forward reads one, sysctl -w net.ipv4.ip_forward=1 sets it (not persistent). Persistent in /etc/sysctl.conf or /etc/sysctl.d/*.conf, applied with sysctl -p.`,
    whenToUse: [
      'Tuning kernel parameters for performance or networking',
      'Debugging module loading failures',
      'Inspecting per-process memory maps and file descriptors',
      'Understanding what hardware capabilities a system has',
    ],
    keyConcepts: [
      {
        term: 'Monolithic kernel',
        definition: 'All subsystems run in kernel space (ring 0). Fast due to no IPC overhead between subsystems. LKMs extend functionality at runtime without recompiling.',
      },
      {
        term: 'Kernel modules (lsmod/modprobe)',
        definition: 'lsmod: list loaded modules. modprobe name: load module + dependencies. rmmod: unload. modinfo: show module details. Persistent loading via /etc/modules.',
      },
      {
        term: '/proc filesystem',
        definition: 'Virtual filesystem — files are kernel data structures exposed as files. /proc/PID/ per-process. /proc/sys/ for sysctl tunables. /proc/meminfo, /proc/cpuinfo for system info.',
      },
      {
        term: 'sysctl',
        definition: 'Tool to read/write kernel parameters in /proc/sys/. sysctl -w key=value for runtime changes. /etc/sysctl.d/*.conf for persistence. Common: net.ipv4.ip_forward, vm.swappiness, net.core.somaxconn.',
      },
    ],
    pitfalls: [
      'modprobe handles dependencies; insmod does not — use modprobe unless you know all deps are loaded',
      'sysctl changes are not persistent without adding to /etc/sysctl.d/ — they reset on reboot',
      'Not pinning kernel version in production — kernel upgrades can break out-of-tree modules (DKMS helps but is not guaranteed)',
      '/proc/sys changes made by Docker/containers can affect the host if the container runs privileged',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between lsmod, modprobe, and insmod? When would you use each?',
        answer: `## lsmod — List Loaded Modules

\`\`\`bash
lsmod
# Module                  Size  Used by
# ext4                  737280  2
# mbcache                16384  1 ext4
# jbd2                  122880  1 ext4

# Shows: module name, size in bytes, use count, dependent modules
# Used by column: count=0 means safe to unload
\`\`\`

## modprobe — Load with Dependencies

\`\`\`bash
modprobe dm_crypt        # Load dm-crypt + all dependencies automatically
modprobe -r dm_crypt     # Remove module and unused dependencies
modprobe --show-depends dm_crypt  # Show what would be loaded

# Module config in:
cat /etc/modules          # Modules to load at boot (Ubuntu/Debian)
ls /etc/modules-load.d/  # systemd-based loading
ls /etc/modprobe.d/       # Module options and aliases (blacklisting)
\`\`\`

## insmod — Insert Single Module

\`\`\`bash
insmod /lib/modules/$(uname -r)/kernel/drivers/net/dummy.ko
# Direct file path, no dependency handling
# Fails if dependencies are not already loaded
# Use case: loading a specific .ko file not in the standard tree
\`\`\`

## When to Use Each

| Tool | Use When |
|------|----------|
| lsmod | Checking what's currently loaded, verifying a module loaded successfully |
| modprobe | Normal module management — handles deps automatically |
| insmod | Loading a custom out-of-tree .ko file explicitly |`,
      },
      {
        question: 'How would you tune the kernel to allow a server to handle more concurrent TCP connections?',
        answer: `## Kernel TCP Tuning

\`\`\`bash
# View current values
sysctl net.core.somaxconn
sysctl net.ipv4.tcp_max_syn_backlog
sysctl net.ipv4.ip_local_port_range
sysctl fs.file-max

# Apply tuning (runtime, not persistent)
sysctl -w net.core.somaxconn=65535           # Max listen() backlog
sysctl -w net.ipv4.tcp_max_syn_backlog=65535 # SYN queue size
sysctl -w net.ipv4.ip_local_port_range="1024 65535"  # Ephemeral ports
sysctl -w fs.file-max=2097152                # Max open files kernel-wide
\`\`\`

## Persistent in /etc/sysctl.d/

\`\`\`bash
cat > /etc/sysctl.d/99-tcp-tuning.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.core.netdev_max_backlog = 65535
fs.file-max = 2097152
EOF

sysctl -p /etc/sysctl.d/99-tcp-tuning.conf
\`\`\`

## Also Check Application-Level Limits

\`\`\`bash
ulimit -n              # Current process file descriptor limit
# Edit /etc/security/limits.conf for persistent user limits
# Or LimitNOFILE= in systemd unit files
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between kernel space and user space?', a: 'Kernel space runs with full hardware access and no restrictions. User space runs with limited privileges and must request kernel services via system calls. A crash in kernel space is fatal; a crash in user space only kills that process.' },
      { q: 'What is a system call?', a: 'A controlled entry point into the kernel for user-space programs. Examples include read(), write(), fork(), and mmap(). The CPU switches privilege rings (ring 3 to ring 0) on every syscall.' },
      { q: 'How do you change a running kernel parameter with sysctl?', a: 'sysctl -w net.ipv4.ip_forward=1 changes the value immediately. To persist across reboots, add net.ipv4.ip_forward = 1 to /etc/sysctl.d/99-custom.conf and run sysctl -p.' },
      { q: 'What does /proc expose?', a: '/proc is a pseudo-filesystem that exposes kernel data structures as files. /proc/PID/ contains per-process info including fd links, status, and memory maps. /proc/sys/ exposes tunable kernel parameters.' },
      { q: 'What is a kernel module and how do you load one?', a: 'A kernel module is a piece of code that can be loaded into the kernel at runtime without rebooting. modprobe modulename loads it with dependencies; rmmod removes it; lsmod lists loaded modules.' },
      { q: 'What does dmesg show?', a: 'dmesg prints the kernel ring buffer -- messages from the kernel since boot including hardware detection, driver initialization, and runtime errors. Use dmesg -T for human-readable timestamps.' },
      { q: 'What is the OOM killer?', a: 'The Out-Of-Memory killer is a kernel mechanism that terminates processes when the system runs out of memory and swap. It scores processes by memory usage and oom_score_adj, killing the highest scorer first.' },
      { q: 'What is huge pages and why does it matter for databases?', a: 'Huge pages are 2 MB (or 1 GB) memory pages vs the default 4 KB. Fewer TLB entries are needed for the same memory, reducing TLB misses. Databases like PostgreSQL and Oracle benefit significantly from huge page allocation.' },
      { q: 'What is the difference between a hard and soft IRQ?', a: 'Hard IRQs are immediate hardware interrupts handled by the interrupt handler with preemption disabled. Soft IRQs (softirqs and tasklets) defer lower-priority work so the hard IRQ handler returns quickly.' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/admin-guide/sysctl/',
      'https://man7.org/linux/man-pages/man5/proc.5.html',
    ],
  },

  // ─── SHELL (additional) ────────────────────────────────────────────────────
  {
    id: 'bash-variables-env',
    title: 'Variables & Environment',
    icon: 'terminal',
    color: '#22c55e',
    category: 'shell',
    questions: 6,
    description: 'Variable scoping, export, environment inspection, $PATH, $IFS, and Bash special variables.',
    visualizations: [
      { title: 'Variable Scoping', description: 'shell vs export vs local — what child processes inherit', image: '/diagrams/linux/bash-variables-scoping.png' },
      { title: 'Environment Inheritance Chain', description: 'kernel → init → login shell → script → subshell env flow', image: '/diagrams/linux/bash-variables-env-chain.png' },
    ],
    introduction: `Bash variables and the environment are fundamental to shell scripting and interactive use. Getting them wrong causes subtle, hard-to-debug bugs.

**Variable assignment and types**: In bash, no type declaration is needed. var=value (no spaces around =). To use, prefix with $: echo $var or echo "\${var}". Curly braces are required for \${var}suffix to disambiguate from $varsuffix.

**Local vs global scope**: Variables set in a script are global within that script. Variables set inside a function are global within the script unless declared with local. local var=value restricts the variable to the function scope and its children.

**export**: Makes a variable available to child processes (subshells, commands run from the script). Without export, child processes cannot see the variable. export VAR=value sets and exports. env or printenv shows exported variables. set shows all variables including unexported shell variables (much more output).

**$PATH**: The colon-separated list of directories searched for commands. Order matters — the first match is used. Add to PATH safely: export PATH="$HOME/.local/bin:$PATH" (prepend — takes priority) or PATH="$PATH:/opt/myapp/bin" (append). Never overwrite PATH entirely.

**$IFS (Internal Field Separator)**: Controls word splitting. Default is space/tab/newline. Changing IFS affects for loop iteration and read. Set IFS=$'\n' to iterate over lines with spaces without splitting. Always restore: old_IFS="$IFS"; IFS=$'\n'; ...; IFS="$old_IFS".

**Special variables**: $? (exit code of last command), $$ (current shell PID), $! (PID of last background job), $0 (script name), $1-$9 (positional parameters), $@ (all args, preserves quoting), $* (all args as one string), $# (argument count), $RANDOM (0-32767), $LINENO (current line number).`,
    whenToUse: [
      'Writing robust shell scripts that pass data between functions',
      'Debugging PATH and command-not-found issues',
      'Setting up environments for deployment scripts',
      'Understanding why a script works interactively but fails in cron',
    ],
    keyConcepts: [
      {
        term: 'export keyword',
        definition: 'export VAR=value makes VAR visible to child processes. Without export, child processes (commands, subshells) cannot see the variable. env shows all exported variables.',
      },
      {
        term: '$PATH order',
        definition: 'Shell searches directories left-to-right, uses first match. Prepend to take priority: PATH="$HOME/bin:$PATH". Never overwrite PATH entirely — you lose all system commands.',
      },
      {
        term: '$IFS word splitting',
        definition: 'IFS (Internal Field Separator) controls how bash splits words. Default: space/tab/newline. Set IFS=$\'\\n\' to iterate over newline-separated data without splitting on spaces.',
      },
      {
        term: '$? and $@ vs $*',
        definition: '$? is last exit code. "$@" expands to separate quoted args (preserves spacing). "$*" expands to one string with args joined by IFS. Always use "$@" in scripts.',
      },
    ],
    pitfalls: [
      'Forgetting export — child processes cannot see unexported variables, causing silent failures in scripts calling subcommands',
      'Using unquoted $@ — it behaves like $* (word splitting) unless double-quoted: "$@"',
      'Modifying PATH without including existing $PATH — wipes all system commands',
      'Changing IFS without restoring it — causes unexpected word splitting in subsequent loops',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between $@ and $* in bash? When does it matter?',
        answer: `## $@ vs $*

Both expand to all positional parameters, but they differ critically when **double-quoted**.

\`\`\`bash
#!/bin/bash
show_args() {
    echo "Using \\$@:"
    for arg in "$@"; do
        echo "  [$arg]"
    done

    echo "Using \\$*:"
    for arg in "$*"; do
        echo "  [$arg]"
    done
}

show_args "hello world" "foo bar" "baz"
\`\`\`

**Output with "$@"**:
\`\`\`
Using $@:
  [hello world]
  [foo bar]
  [baz]
\`\`\`

**Output with "$*"**:
\`\`\`
Using $*:
  [hello world foo bar baz]
\`\`\`

"$@" preserves each argument as a separate word.
"$*" joins all arguments into one string (separated by first char of $IFS).

## Always Use "$@" in Scripts

\`\`\`bash
# CORRECT: passes arguments to another command preserving quoting
exec mycommand "$@"

# WRONG: args with spaces get split
exec mycommand $@
exec mycommand $*
\`\`\``,
      },
      {
        question: 'How does the export keyword work, and what happens to variables without it in subshells?',
        answer: `## export and Variable Inheritance

\`\`\`bash
# Without export:
MY_VAR="hello"
bash -c 'echo $MY_VAR'    # Prints nothing — child process can't see it

# With export:
export MY_VAR="hello"
bash -c 'echo $MY_VAR'    # Prints: hello

# Check if a variable is exported:
export -p | grep MY_VAR
# declare -x MY_VAR="hello"   (-x means exported)
\`\`\`

## env vs set vs printenv

\`\`\`bash
env           # Shows exported (environment) variables + their values
printenv      # Same as env, slightly different format
printenv PATH # Print specific variable

set           # Shows ALL shell variables — exported + local shell vars
              # Much more output, includes shell functions
\`\`\`

## Practical Pattern: Script Environment Setup

\`\`\`bash
#!/bin/bash
# These are just shell variables (not exported)
LOCAL_WORK_DIR="/tmp/work"
TEMP_FILE="data.tmp"

# This is exported to all child processes (python, node, etc.)
export DATABASE_URL="postgres://localhost/mydb"
export API_KEY="secret123"

# Subshell inherits exported vars but not local vars
(
    echo $DATABASE_URL  # works: exported
    echo $LOCAL_WORK_DIR  # empty: not exported
)
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between a shell variable and an environment variable?', a: 'A shell variable exists only in the current shell. An environment variable is exported and inherited by child processes. Use export VAR=value to promote a shell variable to an environment variable.' },
      { q: 'How do you make a variable read-only in bash?', a: 'declare -r VARNAME=value or readonly VARNAME=value. Any attempt to modify or unset the variable results in an error.' },
      { q: 'What does ${VAR:-default} do?', a: 'Returns the value of VAR if set and non-empty, otherwise returns "default". The variable itself is not changed. Use ${VAR:=default} to also assign the default if unset.' },
      { q: 'What is the difference between single quotes and double quotes in bash?', a: 'Single quotes preserve everything literally -- no variable expansion or command substitution. Double quotes allow $VAR expansion and $(cmd) substitution but prevent word splitting and glob expansion.' },
      { q: 'How do you unset an environment variable in bash?', a: 'unset VARNAME removes the variable from both the shell and the environment. Unsetting it in the current shell does not affect the parent process that set it.' },
      { q: 'What does set -u do in a bash script?', a: 'Causes the script to exit with an error when an unset variable is referenced. Prevents silent bugs where a missing variable results in empty string behavior.' },
      { q: 'How do you load environment variables from a .env file?', a: 'source .env or . .env loads the file in the current shell. For export of all variables, use set -a; source .env; set +a to auto-export every assigned variable.' },
      { q: 'What is the difference between $@ and $* in bash?', a: 'When double-quoted, "$@" expands each positional parameter as a separate word. "$*" joins them all with the first character of IFS. Always use "$@" when forwarding arguments to preserve spacing.' },
      { q: 'How do you strip a suffix from a variable value?', a: '${VAR%suffix} removes the shortest matching suffix. ${VAR%%suffix} removes the longest. For example, ${file%.txt} strips the .txt extension.' },
    ],
    references: [
      'https://www.gnu.org/software/bash/manual/bash.html#Shell-Variables',
      'https://tldp.org/LDP/abs/html/',
    ],
  },
  {
    id: 'bash-conditionals-loops',
    title: 'Conditionals & Loops',
    icon: 'terminal',
    color: '#22c55e',
    category: 'shell',
    questions: 6,
    description: 'if/case/for/while/until, the [ vs [[ vs (( )) test distinctions, and break/continue.',
    visualizations: [
      { title: 'Control Flow & Exit Codes', description: 'if/case/while/for/until with $? exit code semantics', image: '/diagrams/linux/bash-control-flow.png' },
    ],
    introduction: `Bash provides multiple conditional constructs, and choosing the right one is critical for correctness and portability.

**[ ] (test command)**: The POSIX-compatible test command. It is actually an external command (though bash has a builtin). It does not support regex, and unquoted variables with spaces cause word splitting bugs. Always quote variables: [ "$var" = "value" ].

**[[ ]] (bash keyword)**: Extended test construct — bash-specific. Supports: pattern matching with =~ (regex), = for string comparison with glob patterns, no word splitting so quoting is less critical (though still good practice), && and || inside the brackets. Preferred for bash scripts.

**((  )) (arithmetic evaluation)**: For numeric comparisons and math. (( i++ )), (( count > 5 )), (( result = a * b )). Returns exit code 0 if result is nonzero (truthy), 1 if zero.

**File tests**: -f (regular file), -d (directory), -r/-w/-x (permissions), -s (nonzero size), -e (exists), -L (symlink), -z (string is empty), -n (string is nonzero length), -nt/-ot (newer/older than).

**for loop forms**: for item in list (word-split list), for item in "$@" (all script args), for ((i=0; i<10; i++)) (C-style), for file in *.log (glob expansion).

**while read pattern**: The canonical way to process files line by line. while IFS= read -r line; do ... done < file.txt. IFS= prevents trimming leading/trailing whitespace. -r prevents backslash interpretation.

**case statement**: Cleaner than chained elif for string pattern matching. Supports wildcards: *, ?, [abc]. Multiple patterns per case with |.`,
    whenToUse: [
      'Writing conditional logic in shell scripts',
      'Processing files line by line',
      'Input validation in scripts',
      'Building menus or option parsers',
    ],
    keyConcepts: [
      {
        term: '[ ] vs [[ ]] vs (( ))',
        definition: '[ ]: POSIX test — no regex, word splitting on unquoted vars. [[ ]]: bash keyword — supports =~, glob, safer quoting. (( )): arithmetic — numeric comparisons and math, C-like syntax.',
      },
      {
        term: 'Numeric vs string comparison operators',
        definition: 'Numeric: -eq -ne -lt -le -gt -ge (only in [ ] or [[ ]]). String: = != < > (in [[ ]]). Arithmetic: == != < > <= >= (in (( ))). Mixing them causes bugs.',
      },
      {
        term: 'while read for file processing',
        definition: 'while IFS= read -r line; do ... done < file — IFS= preserves leading spaces, -r prevents backslash escape, < file redirects without subshell (variables persist after loop).',
      },
      {
        term: 'case pattern matching',
        definition: 'case $var in pattern) commands ;; esac. Patterns support *, ?, [abc]. Multiple patterns: pattern1|pattern2). Cleaner than long elif chains for fixed string matching.',
      },
    ],
    pitfalls: [
      'Using = in [ ] for numeric comparison — [ $a = $b ] does string comparison; use -eq for numbers',
      'Unquoted variables in [ ] — [ $file = "foo" ] fails if file has spaces or is empty; use [ "$file" = "foo" ]',
      'Loop variable scope after while read piped input — while IFS= read -r line; done <<< "$output" (herestring) or < <(command) keeps vars in scope; piping creates a subshell',
      'Not using break with a loop depth number in nested loops: break 2 exits two levels',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between [ ], [[ ]], and (( )) in bash conditionals?',
        answer: `## [ ] — POSIX Test

\`\`\`bash
# String comparison
[ "$name" = "alice" ]    # CORRECT: quoted
[ $name = "alice" ]      # BUG: unquoted, fails if name has spaces

# Numeric comparison — must use -eq, -lt, etc.
[ "$count" -gt 5 ]

# File tests
[ -f "$file" ] && echo "exists"
[ -d "$dir" ] || mkdir "$dir"
\`\`\`

## [[ ]] — Bash Extended Test

\`\`\`bash
# Regex matching (=~)
[[ "$email" =~ ^[a-zA-Z0-9.]+@[a-zA-Z0-9.]+$ ]] && echo "valid"

# Glob pattern matching
[[ "$file" == *.log ]] && echo "is a log file"

# No word splitting — safer with unquoted vars
[[ $name == "alice" ]]  # Safe even unquoted

# Logical operators inside (no need for -a/-o)
[[ -f "$file" && -r "$file" ]] && cat "$file"
\`\`\`

## (( )) — Arithmetic Evaluation

\`\`\`bash
# Numeric comparison with natural operators
count=10
(( count > 5 )) && echo "more than 5"
(( count++ ))        # Increment
(( result = a * b )) # Arithmetic
i=0
while (( i < 10 )); do
    (( i++ ))
done
\`\`\``,
      },
      {
        question: 'Write a bash script that reads a file line by line and processes each line safely, including lines with spaces.',
        answer: `## Safe Line-by-Line File Processing

\`\`\`bash
#!/bin/bash

process_file() {
    local filename="$1"

    if [[ ! -f "$filename" ]]; then
        echo "Error: file not found: $filename" >&2
        return 1
    fi

    local line_count=0

    # IFS= prevents trimming leading/trailing whitespace
    # -r prevents backslash from being treated as escape
    # Redirect < avoids a subshell (variables survive the loop)
    while IFS= read -r line; do
        (( line_count++ ))

        # Skip empty lines
        [[ -z "$line" ]] && continue

        # Skip comment lines
        [[ "$line" == \#* ]] && continue

        echo "Line $line_count: $line"

    done < "$filename"

    echo "Processed $line_count lines"
}

process_file "$1"
\`\`\`

## Common Mistake: Piping to while (subshell issue)

\`\`\`bash
# WRONG: line_count is in a subshell, lost after loop
cat file.txt | while IFS= read -r line; do
    (( line_count++ ))
done
echo $line_count  # Always 0!

# CORRECT: use process substitution to avoid subshell
while IFS= read -r line; do
    (( line_count++ ))
done < <(grep "pattern" file.txt)
echo $line_count  # Correct value
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between [ ] and [[ ]] in bash?', a: '[[ ]] is a bash built-in that supports regex matching with =~, logical operators && and ||, and no word splitting. [ ] is POSIX sh and requires quoting all variables.' },
      { q: 'How do you check if a file exists in bash?', a: 'if [[ -f /path/to/file ]]; then ... fi. Use -d for directory, -e for any path, -r for readable, -x for executable.' },
      { q: 'What does set -e do in a bash script?', a: 'Exits the script immediately when any command returns a non-zero exit code. Combined with set -o pipefail it also catches failures inside pipelines.' },
      { q: 'What is the difference between for i in list and for ((i=0; i<n; i++))?', a: 'for i in list iterates over words in the list. The C-style for ((expr)) is an arithmetic loop for counted iteration. Use the C-style form when you need an index counter.' },
      { q: 'How do you iterate over lines in a file in bash?', a: 'while IFS= read -r line; do ... done < file. IFS= preserves leading whitespace; -r prevents backslash interpretation. Never use for line in $(cat file) as it splits on whitespace.' },
      { q: 'What does the until loop do?', a: 'until condition; do ... done runs the body while the condition is false, opposite of while. Useful for polling: until ping -c1 host; do sleep 1; done.' },
      { q: 'What is the correct way to compare integers in bash?', a: 'Use arithmetic context: (( a > b )) or [[ a -gt b ]]. Never use = or == for numeric comparison -- they do string comparison and will fail on numbers like 10 vs 9.' },
      { q: 'How do you break out of a nested loop in bash?', a: 'break 2 exits two loop levels at once. break N exits N enclosing loops. continue 2 skips to the next iteration of the second enclosing loop.' },
      { q: 'What does select do in bash?', a: 'select generates a numbered menu from a list and reads the user\'s choice into a variable. Useful for interactive scripts. It loops until a break or EOF.' },
    ],
    references: [
      'https://www.gnu.org/software/bash/manual/bash.html#Conditional-Constructs',
      'https://mywiki.wooledge.org/BashFAQ',
    ],
  },
  {
    id: 'bash-functions',
    title: 'Bash Functions',
    icon: 'terminal',
    color: '#22c55e',
    category: 'shell',
    questions: 5,
    description: 'Function declaration, local variables, return codes, argument handling, and function libraries.',
    visualizations: [
      { title: 'Function Patterns', description: 'Declaration styles, argument handling, return vs stdout value', image: '/diagrams/linux/bash-functions-patterns.png' },
    ],
    introduction: `Bash functions allow code reuse and organization within scripts. They behave like mini-scripts within your script, with their own positional parameters but sharing the script's variable scope by default.

**Declaration syntax**: Two equivalent forms exist: function name { body; } and name() { body; }. The name() form is slightly more POSIX-compatible. Functions must be defined before they are called (bash is interpreted top-to-bottom).

**local keyword**: Critical for preventing variable pollution. Without local, any variable set inside a function is global within the script. local var=value creates a variable that only exists within the function and its children. Always use local for function-internal variables.

**Arguments**: Inside a function, $1 $2 $@ $# refer to the function's arguments, shadowing the script's positional params. $0 still refers to the script name.

**Return values — the key concept**: The return statement in bash only returns an exit code (0-255 integer). It cannot return strings or complex data. To "return" a string, use echo inside the function and capture with command substitution: result=$(my_function). For large data, write to a file or use a global variable (named explicitly, not local).

**$FUNCNAME**: An array containing the call stack. \${FUNCNAME[0]} is the current function, \${FUNCNAME[1]} is the caller. Useful for error messages: echo "Error in \${FUNCNAME[0]}: message" >&2.

**Sourcing libraries**: source /path/to/lib.sh or . /path/to/lib.sh loads functions and variables from another file into the current shell. Use this to build reusable function libraries. Source relative paths: source "$(dirname "$0")/lib.sh".`,
    whenToUse: [
      'Organizing complex scripts into reusable components',
      'Building shared function libraries sourced by multiple scripts',
      'Reducing duplication in deployment and automation scripts',
      'Creating wrapper functions for common operations with error handling',
    ],
    keyConcepts: [
      {
        term: 'local keyword',
        definition: 'local var=value restricts variable to the function scope. Without local, variables set inside a function are globally visible in the script. Always use local for internal function variables.',
      },
      {
        term: 'return vs echo for values',
        definition: 'return N only returns an exit code 0-255. To "return" a string, echo it and capture: result=$(my_func). For large data, write to a temp file or use a named global.',
      },
      {
        term: '$FUNCNAME array',
        definition: '\${FUNCNAME[0]} = current function name. \${FUNCNAME[1]} = caller. Useful for error messages and call stack tracing. Array automatically maintained by bash.',
      },
      {
        term: 'Sourcing function libraries',
        definition: 'source /path/lib.sh or . /path/lib.sh loads functions into current shell. Use "$(dirname "$0")/lib.sh" for relative paths. All sourced functions share the current shell environment.',
      },
    ],
    pitfalls: [
      'Forgetting local — a function that sets var=value modifies the global scope and affects callers',
      'Using return to send a string — return can only send an integer 0-255; use echo + command substitution',
      'Defining functions after calling them — bash reads top-to-bottom; function must be defined before the call',
      'Recursive functions without a base case — bash has no stack overflow protection, will hit resource limits',
    ],
    keyQuestions: [
      {
        question: 'How do you return a string value from a bash function? Why can\'t you use the return statement?',
        answer: `## Why return Doesn't Work for Strings

\`\`\`bash
# return only accepts integers 0-255 (exit codes)
get_greeting() {
    return "Hello, World!"  # SYNTAX ERROR or truncated to number
}
\`\`\`

## Correct Pattern: echo + Command Substitution

\`\`\`bash
get_greeting() {
    local name="$1"
    echo "Hello, $name!"   # Write to stdout
}

# Capture the output with $()
greeting=$(get_greeting "Alice")
echo "$greeting"
# Hello, Alice!
\`\`\`

## For Multiple Values: Use a Nameref or Global

\`\`\`bash
# Pattern: write result to a caller-specified variable name
get_stats() {
    local -n _result="$1"   # nameref: _result is an alias for the variable named in $1
    _result="count=42 size=1024"
}

declare stats
get_stats stats
echo "$stats"
# count=42 size=1024

# Or use a well-named global (document it clearly)
_LAST_RESULT=""
compute() {
    # ... computation ...
    _LAST_RESULT="computed_value"
}
compute
echo "$_LAST_RESULT"
\`\`\`

## Return for Error Signaling (Correct Use)

\`\`\`bash
validate_input() {
    [[ -z "$1" ]] && return 1   # Error: empty input
    [[ "$1" =~ ^[0-9]+$ ]] || return 2  # Error: not numeric
    return 0  # Success
}

if ! validate_input "$user_input"; then
    echo "Invalid input" >&2
    exit 1
fi
\`\`\``,
      },
      {
        question: 'Explain the difference between local and global variables in bash functions with an example.',
        answer: `## Global Variable Bug (no local)

\`\`\`bash
#!/bin/bash
counter=0

increment() {
    counter=$(( counter + 1 ))   # Modifies global counter — intentional here
    temp=$(( counter * 2 ))      # BUG: temp is global! Caller might use 'temp' too
}

process() {
    local temp="original"   # This local 'temp' is separate from increment's 'temp'
    increment
    echo "temp after increment: $temp"  # Shows "original" because of local
}

process
echo "counter: $counter"   # counter modified as intended
\`\`\`

## Correct Pattern with local

\`\`\`bash
#!/bin/bash

calculate_size() {
    local directory="$1"          # local — doesn't pollute caller's $directory
    local total=0                  # local — doesn't affect caller's $total
    local file                     # Declare loop var as local

    for file in "$directory"/*; do
        [[ -f "$file" ]] && (( total += $(stat -c%s "$file") ))
    done

    echo "$total"   # "return" value via stdout
}

# Caller's variables are safe
directory="/home/user"
total="previous_calculation"

result=$(calculate_size "/var/log")
echo "Log dir size: $result bytes"
echo "directory still: $directory"   # Still /home/user
echo "total still: $total"           # Still previous_calculation
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'How do you declare a function in bash?', a: 'function name { body; } or name() { body; }. Both are equivalent. The function keyword is optional. Define functions before calling them.' },
      { q: 'How do functions receive arguments in bash?', a: 'Via positional parameters $1, $2, ... $N inside the function body. $@ expands all arguments. Functions do not use parentheses when called: myfunc arg1 arg2.' },
      { q: 'How do you return a value from a bash function?', a: 'Use command substitution: result=$(myfunc). The function prints its output with echo or printf. return N sets the exit code (0-255), not a data value.' },
      { q: 'What does local do in a bash function?', a: 'Declares a variable scoped to the function and its children. Without local, variables are global and pollute the calling scope. Always use local for function-internal variables.' },
      { q: 'How do you make a bash function exit the entire script on failure?', a: 'With set -e active, any non-zero return from a function causes the script to exit. Alternatively, call the function and check: myfunc || exit 1.' },
      { q: 'What is a bash library and how do you source it?', a: 'A file of function definitions with no direct execution. Source it with . ./lib.sh or source ./lib.sh. Sourcing executes the file in the current shell, making its functions available.' },
      { q: 'How do you export a bash function to child processes?', a: 'export -f functionname. This serializes the function definition into the environment. Child bash processes (not other shells) inherit it.' },
      { q: 'What is the difference between function exit code and output?', a: 'The exit code (return value) is 0-255 and is tested with $? or if. The output is text written to stdout and captured with $(...). These are completely independent channels.' },
      { q: 'How do you pass an array to a bash function?', a: 'Pass the array name as a string and use nameref: local -n arr=$1. Then arr[@] accesses the caller\'s array. Direct array passing is not supported in bash.' },
    ],
    references: [
      'https://www.gnu.org/software/bash/manual/bash.html#Shell-Functions',
      'https://www.shellcheck.net/',
    ],
  },
  {
    id: 'bash-text-processing',
    title: 'Text Processing Tools',
    icon: 'terminal',
    color: '#22c55e',
    category: 'shell',
    questions: 7,
    description: 'grep, sed, awk, cut, sort, uniq, tr, wc, head/tail, and xargs for command-line data processing.',
    visualizations: [
      { title: 'Text Processing Pipeline', description: 'grep→awk→sed→sort→uniq→jq chain: filter, slice, replace, sort, deduplicate, parse JSON', image: '/diagrams/linux/linux-text-processing-chain.png' },
    ],
    introduction: `The Unix text processing toolkit is a core skill for Linux administration and DevOps. These tools are composable via pipes and form the basis of shell-based data processing pipelines.

**grep family**: grep searches for patterns. -E (or egrep) enables extended regex (|, +, ?, {n,m}, ()). -F (or fgrep) does fixed-string matching (faster, no regex). Key flags: -v (invert, print non-matching), -r (recursive directory search), -l (print filenames only), -n (line numbers), -c (count matches), -i (case-insensitive), -o (print only matching part), -A/-B/-C N (after/before/context lines).

**sed (stream editor)**: Processes text line by line. The s command is most common: sed 's/pattern/replacement/g'. Flags on s: g (global, all occurrences on line), i (case insensitive), p (print, use with -n). -i for in-place editing (use -i.bak on macOS for backup). Address ranges: sed '3,10d' (delete lines 3-10), sed '/start/,/end/d'.

**awk**: A full programming language for field-based text processing. Field separator: -F ':' or FS=":" inside. Fields: $1 $2 ... $NF (last field). NR=line number, NF=number of fields. BEGIN{} runs before input, END{} runs after. printf for formatted output. Ideal for summing columns, filtering on conditions, and reformatting structured text.

**Supporting tools**: cut -d: -f1,3 (extract specific fields by delimiter), sort -k2 -n (numeric sort on field 2), sort -u (unique), uniq -c (count duplicates — requires sorted input), tr -d '\\r' (delete carriage returns), tr -s ' ' (squeeze repeated spaces), wc -l (line count), head -n 20, tail -n 20, tail -f (follow), xargs -I{} command {} (pipe list to command arguments).`,
    whenToUse: [
      'Analyzing log files for errors and patterns',
      'Extracting specific fields from structured text (CSV, colon-delimited)',
      'Finding and replacing text across many files',
      'Building reporting pipelines from command output',
    ],
    keyConcepts: [
      {
        term: 'grep -E extended regex',
        definition: 'grep -E "pattern1|pattern2" — enables |, +, ?, (), {n,m}. Equivalent to egrep. grep -F for literal string (no regex), much faster for fixed patterns.',
      },
      {
        term: 'sed s/pattern/replace/',
        definition: 'sed s/old/new/g — global replace. -i for in-place. Address ranges: /regex/s/old/new/. sed -n p with -n suppresses default print. d deletes lines. p prints matched lines.',
      },
      {
        term: 'awk field processing',
        definition: 'awk -F: \'{print $1, $3}\' — print fields. BEGIN{}/END{} for setup/teardown. $NF=last field. sum+=$1 in body, print sum in END for column sums. printf for formatted output.',
      },
      {
        term: 'xargs for parallelism',
        definition: 'xargs -I{} command {} for substitution. xargs -P4 for 4 parallel processes. xargs -n1 for one arg per invocation. find ... | xargs grep is much faster than grep -r for large trees.',
      },
    ],
    pitfalls: [
      'grep -r without --include="*.log" searches ALL files including binaries — slow and noisy',
      'sed -i without .bak on macOS requires an empty string: sed -i \'\' (GNU sed does not need this)',
      'uniq without sort first — uniq only removes adjacent duplicates; always sort | uniq',
      'awk print vs printf — print adds newline automatically; printf requires \\n explicitly',
    ],
    keyQuestions: [
      {
        question: 'You have a log file where each line is an Apache access log entry. Write a one-liner to find the top 10 IP addresses by request count.',
        answer: `## Top 10 IPs from Apache Access Log

\`\`\`bash
# Apache Combined Log Format:
# 192.168.1.1 - alice [01/Jan/2024:12:00:00 +0000] "GET /page HTTP/1.1" 200 1234

# Solution: extract field 1 (IP), count, sort descending, take top 10
awk '{print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -rn | head -10

# Breakdown:
# awk '{print $1}'  — extract the first whitespace-delimited field (IP)
# sort              — sort IPs alphabetically (required before uniq)
# uniq -c           — count consecutive identical lines, prepend count
# sort -rn          — sort numerically (-n) in reverse (-r) order (highest first)
# head -10          — show only the top 10
\`\`\`

## Alternative with grep and cut

\`\`\`bash
# Using cut (faster than awk for simple field extraction)
cut -d' ' -f1 /var/log/apache2/access.log | sort | uniq -c | sort -rn | head -10
\`\`\`

## Extended: Top 10 IPs hitting 404 errors

\`\`\`bash
grep '" 404 ' /var/log/apache2/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
\`\`\`

## Extended: Requests per hour

\`\`\`bash
awk '{print substr($4, 2, 14)}' /var/log/apache2/access.log | sort | uniq -c
# substr extracts "[01/Jan/2024:12" — date + hour
\`\`\``,
      },
      {
        question: 'Explain the difference between grep, egrep, and fgrep. When would you use each?',
        answer: `## grep (Basic Regular Expressions)

\`\`\`bash
grep 'error' logfile             # Literal string
grep 'err[oa]r' logfile          # Character class
grep 'error\\|warning' logfile   # Alternation (must escape | in BRE)
grep 'err.*log' logfile          # .* wildcard
\`\`\`

BRE (Basic Regular Expressions): +, ?, |, (, ) must be escaped with backslash.

## egrep / grep -E (Extended Regular Expressions)

\`\`\`bash
grep -E 'error|warning' logfile  # Alternation without escaping
egrep 'error|warning' logfile    # Equivalent

grep -E '(ERROR|WARN): .{10,}' logfile  # Groups, length quantifiers
grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}' logfile  # Date at line start
\`\`\`

ERE: +, ?, |, (, ) work without escaping — simpler and more readable.

## fgrep / grep -F (Fixed Strings)

\`\`\`bash
fgrep 'config.error_handler()' logfile   # Literal dots, parens — no regex
grep -F '$PATH variable' logfile         # Dollar sign — no variable expansion
grep -F 'user[admin]' logfile            # Brackets — no character class
\`\`\`

Much faster than regex for fixed patterns — no regex engine overhead.

## When to Use Each

| Tool | Use When |
|------|----------|
      { q: 'What does tr do?', a: 'tr translates or deletes characters. tr a-z A-Z uppercases stdin. tr -d removes newlines; tr -s squeezes repeated spaces to one.' },
| grep -E | Complex patterns with alternation, groups |
| grep -F | Fixed strings — performance, or when pattern has regex metacharacters |`,
      },
    ],
    quickFire: [
      { q: 'What is the difference between grep and awk for text processing?', a: 'grep filters lines by pattern. awk processes fields and runs programs per line. Use grep for simple line selection; awk when you need field extraction, arithmetic, or multi-column output.' },
      { q: 'How do you extract the second column from whitespace-delimited output?', a: "awk '{print $2}' or cut -d' ' -f2. awk handles variable whitespace naturally; cut requires a specific delimiter. For colon-delimited files like /etc/passwd use cut -d: -f2." },
      { q: 'What does sed -i do?', a: 'Edits the file in-place, replacing the original. sed -i.bak makes a backup with .bak extension before editing. Always test without -i first.' },
      { q: 'How do you count occurrences of a pattern in a file?', a: 'grep -c pattern file counts matching lines. For total occurrences (multiple per line) use grep -o pattern file | wc -l.' },
      { q: 'What does sort -u do?', a: 'Sorts and removes duplicate lines in one pass. Equivalent to sort | uniq but more efficient. Use sort -nu for numeric sort with deduplication.' },
      { q: 'How do you replace a string in multiple files recursively?', a: "find . -type f -name '*.conf' -exec sed -i 's/old/new/g' {} + replaces in all matching files. The + batches files for efficiency." },
      { q: 'What does tr do?', a: 'tr translates or deletes characters. tr a-z A-Z uppercases stdin. tr -d removes newlines; tr -s squeezes repeated spaces to one.' },
      { q: 'How do you extract lines between two patterns with sed?', a: "sed -n '/START/,/END/p' file prints every line from the line matching START through the line matching END, inclusive." },
      { q: 'What is the difference between grep -E and grep -F?', a: '-E enables extended regex (ERE), equivalent to egrep. -F treats the pattern as a fixed string, not a regex -- much faster for literal matches.' },
    ],
    references: [
      'https://www.gnu.org/software/grep/manual/',
      'https://www.gnu.org/software/gawk/manual/gawk.html',
    ],
  },
  {
    id: 'bash-job-control',
    title: 'Job Control & Process Management',
    icon: 'terminal',
    color: '#22c55e',
    category: 'shell',
    questions: 5,
    description: 'fg/bg, jobs, disown, nohup, Ctrl+C/Z signals, process substitution, and pipeline control.',
    visualizations: [
      { title: 'Job Control States', description: 'Foreground ↔ suspended ↔ background state transitions', image: '/diagrams/linux/bash-job-control-states.png' },
    ],
    introduction: `Bash job control allows managing multiple processes from a single terminal session. Understanding it is essential for running background tasks, keeping processes alive after logout, and debugging pipeline behavior.

**Terminal signals**: Ctrl+C sends SIGINT (signal 2) to the foreground process group — typically terminates the process. Ctrl+Z sends SIGTSTP (signal 20) — suspends the process (pauses it, doesn't terminate). Ctrl+\\ sends SIGQUIT — terminates with core dump.

**Job control commands**: After Ctrl+Z suspends a process, jobs -l lists all jobs with their PIDs and states. fg %1 brings job 1 to foreground. bg %1 resumes job 1 in background (as if it were started with &). & at end of command starts directly in background. Job specs: %1 is first job, %% or %+ is most recent job, %- is previous job.

**disown vs nohup**: disown removes a job from the shell's job table — the process continues running but the shell won't send SIGHUP when the terminal closes. However, the process's stdin/stdout still point to the terminal. nohup makes a process immune to SIGHUP before starting — output goes to nohup.out by default. For long-running processes, use nohup command > output.log 2>&1 & and then optionally disown.

**Process substitution** <(command): Creates a named pipe (FIFO) and substitutes its path. Allows commands that expect files to receive command output: diff <(sort file1.txt) <(sort file2.txt). The command runs in a subshell.

**pipefail**: By default, a pipeline's exit code is the last command's exit code. set -o pipefail makes the pipeline fail if any command fails. Critical for reliable scripts.`,
    whenToUse: [
      'Running long operations in background while continuing work',
      'Keeping processes alive after SSH session disconnect',
      'Debugging pipeline failures where intermediate commands fail silently',
      'Process substitution to avoid temp files',
    ],
    keyConcepts: [
      {
        term: 'SIGINT vs SIGTSTP',
        definition: 'Ctrl+C sends SIGINT (terminate). Ctrl+Z sends SIGTSTP (suspend/pause). Suspended jobs can be resumed with fg or bg. SIGSTOP cannot be caught; SIGTSTP can.',
      },
      {
        term: 'disown vs nohup',
        definition: 'disown: removes job from shell table after it starts — SIGHUP not sent on shell exit, but stdout still points to terminal. nohup: before starting — immune to SIGHUP, stdout redirected to nohup.out.',
      },
      {
        term: 'Process substitution <()',
        definition: '<(command) creates a named pipe with command output. diff <(sort a) <(sort b) compares sorted versions. >(command) pipes output into command. Avoids temp files.',
      },
      {
        term: 'pipefail option',
        definition: 'set -o pipefail makes pipeline exit code the rightmost non-zero exit code. Without it: cmd1 | cmd2 exit code is only cmd2\'s. Critical for catching errors in pipelines.',
      },
    ],
    pitfalls: [
      'nohup without output redirection — output goes to nohup.out in current directory, which can fill up',
      'Not using set -o pipefail — grep "pattern" file | wc -l returns 0 even if grep fails (file not found)',
      'disown without redirecting output — process output still writes to closed terminal, may cause SIGPIPE',
      'Backgrounding interactive commands (programs that read from stdin) — they stop immediately waiting for terminal input',
    ],
    keyQuestions: [
      {
        question: 'What is the difference between disown and nohup? When would you use each?',
        answer: `## nohup — Before the Process Starts

\`\`\`bash
# nohup makes the process immune to SIGHUP before it starts
nohup ./long_running_script.sh > output.log 2>&1 &
echo $!  # PID of background process

# What nohup does:
# 1. Redirects stdin from /dev/null
# 2. Redirects stdout to nohup.out (or your redirect)
# 3. Process ignores SIGHUP signal

# The job appears in jobs list initially
jobs
# [1]+ Running  nohup ./long_running_script.sh > output.log 2>&1 &
\`\`\`

## disown — After the Process is Running

\`\`\`bash
# Start a process (forgot nohup)
./long_running_script.sh > output.log 2>&1 &
# [1] 12345

# Realize you need to disconnect — remove from job table
disown %1        # Remove by job number
disown 12345     # Remove by PID
disown -a        # Remove all jobs

# Shell won't send SIGHUP when you exit
# But: process stdout/stderr still point to the terminal
# If terminal closes, writes to stdout will get SIGPIPE
\`\`\`

## Best Practice: Use Both

\`\`\`bash
# Start correctly from the beginning
nohup ./script.sh > /var/log/script.log 2>&1 &
disown

# Or use a proper process manager:
# systemd, supervisord, tmux, screen
\`\`\``,
      },
      {
        question: 'Explain set -o pipefail. Why is it important for reliable shell scripts?',
        answer: `## The Problem Without pipefail

\`\`\`bash
#!/bin/bash
# Without pipefail, this script appears to succeed

grep "CRITICAL" /nonexistent/file.log | wc -l
echo "Exit code: $?"  # 0 — because wc -l succeeded!
# grep failed (exit 1) but its failure is masked by wc -l
\`\`\`

## With pipefail

\`\`\`bash
#!/bin/bash
set -o pipefail

grep "CRITICAL" /nonexistent/file.log | wc -l
echo "Exit code: $?"  # 1 — grep's failure propagates
# Output: grep: /nonexistent/file.log: No such file or directory
\`\`\`

## Real-World Script Pattern

\`\`\`bash
#!/bin/bash
set -euo pipefail
# -e: exit on any error
# -u: treat unset variables as errors
# -o pipefail: pipeline fails if any component fails

# Now pipeline errors are caught:
data=$(curl -s "https://api.example.com/data" | jq '.results[].name')
# If curl fails OR jq fails, the script exits immediately

# Process data safely
while IFS= read -r name; do
    process_item "$name"
done <<< "$data"
\`\`\`

## When pipefail Is Too Strict

\`\`\`bash
# grep returns exit 1 when no matches found (not an error in this context)
# Use || true to suppress
grep "optional_pattern" file.txt | process_matches || true
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What does Ctrl+Z do in bash?', a: 'Suspends the foreground process by sending SIGTSTP. The job is paused and placed in the stopped job list. Resume with fg to bring it back or bg to run it in the background.' },
      { q: 'What is the difference between fg and bg?', a: 'fg %jobnumber brings a stopped or background job to the foreground. bg %jobnumber resumes a stopped job in the background, freeing the terminal.' },
      { q: 'How do you run a command that survives terminal close?', a: 'nohup command & redirects stdout/stderr to nohup.out and ignores SIGHUP. Alternatively use disown %jobnumber after backgrounding, or run in a screen/tmux session.' },
      { q: 'What does the jobs command show?', a: 'Lists all active jobs in the current shell with their job numbers, state (Running/Stopped), and command. Job numbers are shell-local; use kill %1 to send signals by job number.' },
      { q: 'What does set -o pipefail do?', a: 'Makes a pipeline return the exit code of the first failing command rather than the last. Without it, cmd1 | cmd2 returns cmd2\'s exit code even if cmd1 failed.' },
      { q: 'How do you run multiple commands in parallel in bash?', a: 'cmd1 & cmd2 & wait starts both in background and waits for both to finish. Capture PIDs with PID1=$! after each & to check individual exit codes.' },
      { q: 'What is a process group and why does it matter for job control?', a: 'A process group is a set of processes sharing a PGID. Signals sent to a job in bash go to the entire process group, stopping all processes in a pipeline at once.' },
      { q: 'What does disown do in bash?', a: 'Removes a job from the shell\'s job table so it no longer receives SIGHUP when the shell exits. The process keeps running but can no longer be managed with fg/bg.' },
      { q: 'How do you limit CPU and memory for a background job?', a: 'Use ulimit -v BYTES before starting the process to limit virtual memory. For cgroup-based limits use systemd-run --scope -p MemoryMax=512M command &.' },
    ],
    references: [
      'https://www.gnu.org/software/bash/manual/bash.html#Job-Control',
      'https://man7.org/linux/man-pages/man1/nohup.1.html',
    ],
  },

  // ─── NETWORKING (additional) ───────────────────────────────────────────────
  {
    id: 'linux-ip-routing',
    title: 'IP Routing & Policy Routing',
    icon: 'globe',
    color: '#06b6d4',
    category: 'networking',
    questions: 6,
    description: 'ip route, routing tables, default gateway, policy routing with ip rule, and ECMP load balancing.',
    visualizations: [
      { title: 'Routing Table Decision Flow', description: 'Longest-prefix match: host /32 → network → default → unreachable', image: '/diagrams/linux/linux-ip-routing-decision.png' },
    ],
    introduction: `Linux kernel routing determines where outgoing packets are sent. Every packet consults the routing table, and the kernel applies longest prefix match to select the best route.

**The routing table**: ip route show (the modern replacement for the obsolete route command) displays the main routing table. Output fields: destination network, via (gateway IP), dev (outgoing interface), src (preferred source IP), metric (preference — lower is preferred). The default route (0.0.0.0/0) matches all destinations not covered by more specific routes.

**Longest prefix match**: When multiple routes match a destination, the most specific (longest prefix) wins. A /32 host route beats a /24 subnet route which beats the default /0 route.

**Adding and removing routes**:
\`\`\`
ip route add 10.0.0.0/8 via 192.168.1.1 dev eth0
ip route del 10.0.0.0/8
ip route add default via 192.168.1.254
\`\`\`

**Policy routing (ip rule)**: Linux supports multiple routing tables (0-252) plus main (253), default (254), and local (255). ip rule list shows policy rules ordered by priority. When a rule matches (by source IP, mark, interface, etc.), the kernel consults that rule's table. This enables source-based routing — essential for multi-homed servers where reply traffic must exit the same interface it arrived on.

**ECMP (Equal-Cost Multi-Path)**: Multiple gateways with equal cost: ip route add default nexthop via 10.0.0.1 weight 1 nexthop via 10.0.0.2 weight 1. Kernel hashes the packet's 5-tuple to select the path.

**ip route get IP**: Test which route and source IP would be used for a specific destination — invaluable for debugging routing issues.`,
    whenToUse: [
      'Multi-homed servers (multiple network interfaces/ISPs)',
      'VPN and overlay network configuration',
      'Debugging "traffic going out wrong interface" issues',
      'Container networking and Kubernetes node networking',
    ],
    keyConcepts: [
      {
        term: 'Longest prefix match',
        definition: 'When multiple routes match, the most specific (longest prefix) wins. /32 > /24 > /16 > /8 > /0 (default). This is the fundamental rule of IP routing.',
      },
      {
        term: 'ip route show/add/del',
        definition: 'ip route show: view table. ip route add NET via GW dev IF: add route. ip route del NET: remove. ip route get IP: test which route applies. Replaces obsolete route command.',
      },
      {
        term: 'Policy routing with ip rule',
        definition: 'ip rule add from 192.168.2.0/24 table 200 — route traffic from specific source through table 200. ip route add default via GW table 200. Enables source-based routing for multi-homed servers.',
      },
      {
        term: 'ECMP',
        definition: 'Equal-Cost Multi-Path: multiple nexthop entries for same destination. Kernel uses 5-tuple hash for consistent per-flow selection. ip route add default nexthop via GW1 nexthop via GW2.',
      },
    ],
    pitfalls: [
      'Routes added with ip route are not persistent — add to /etc/network/interfaces or NetworkManager config for persistence',
      'Wrong metric causing unexpected path selection when multiple default routes exist (ip route add default via X metric 100)',
      'ECMP load balancing is per-flow (hash-based), not per-packet — TCP sessions always use the same path',
      'Asymmetric routing causing stateful firewall (conntrack) to drop return traffic — must use policy routing for multi-homed setups',
    ],
    keyQuestions: [
      {
        question: 'A server has two network interfaces. HTTP requests come in on eth0 but replies go out eth1. How do you fix this with policy routing?',
        answer: `## The Asymmetric Routing Problem

When a server has two interfaces with default routes, responses may exit via a different interface than requests arrived on. Stateful firewalls drop these "asymmetric" flows.

## Solution: Policy Routing (Source-Based Routing)

\`\`\`bash
# Scenario:
# eth0: 192.168.1.10/24, gateway 192.168.1.1  (ISP1, public traffic)
# eth1: 10.0.0.10/24, gateway 10.0.0.1        (ISP2, backup)

# Step 1: Create two routing tables (edit /etc/iproute2/rt_tables)
echo "100 isp1" >> /etc/iproute2/rt_tables
echo "200 isp2" >> /etc/iproute2/rt_tables

# Step 2: Add routes for each ISP in their own table
ip route add default via 192.168.1.1 table isp1
ip route add 192.168.1.0/24 dev eth0 src 192.168.1.10 table isp1

ip route add default via 10.0.0.1 table isp2
ip route add 10.0.0.0/24 dev eth1 src 10.0.0.10 table isp2

# Step 3: Add policy rules — route based on SOURCE IP
# Traffic FROM eth0's IP uses isp1 table (replies go back via eth0)
ip rule add from 192.168.1.10 table isp1 priority 100
# Traffic FROM eth1's IP uses isp2 table
ip rule add from 10.0.0.10 table isp2 priority 200

# Verify
ip rule list
ip route show table isp1
ip route get 8.8.8.8 from 192.168.1.10
\`\`\``,
      },
      {
        question: 'How does the Linux kernel select a route when multiple routes match? Walk through the algorithm.',
        answer: `## Linux Route Selection Algorithm

\`\`\`bash
# View the routing table
ip route show
# 10.0.0.0/8 via 172.16.0.1 dev eth1
# 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10
# 192.168.1.100/32 via 192.168.1.254 dev eth0    (host route)
# default via 192.168.1.1 dev eth0
\`\`\`

## Selection Steps

**1. Policy rules first (ip rule list)**
\`\`\`bash
ip rule list
# 0:  from all lookup local    (always checked first — local addresses)
# 32766: from all lookup main  (main table, where user routes live)
# 32767: from all lookup default
\`\`\`

**2. Within a table: longest prefix match**
\`\`\`
Destination: 192.168.1.100
Matches: 192.168.1.0/24 (/24) AND 192.168.1.100/32 (/32)
Winner: 192.168.1.100/32 (longer prefix = more specific)
\`\`\`

**3. Tie-breaking (same prefix length)**
\`\`\`
Same prefix → compare metric (lower wins)
Same metric → ECMP if multiple nexthops configured
\`\`\`

**4. Test a specific lookup**
\`\`\`bash
ip route get 192.168.1.100
# 192.168.1.100 via 192.168.1.254 dev eth0 src 192.168.1.10

ip route get 8.8.8.8
# 8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.10
# (matched default route)
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'How do you add a static route in Linux?', a: 'ip route add 10.0.0.0/8 via 192.168.1.1 dev eth0. To persist, add it to /etc/netplan/ (Ubuntu) or /etc/sysconfig/network-scripts/ (RHEL). The old route add command is deprecated.' },
      { q: 'What does ip route show default show?', a: 'The default gateway entry -- the route used for all traffic that does not match a more specific prefix. It shows the next-hop IP and the outgoing interface.' },
      { q: 'How do you enable IP forwarding on Linux?', a: 'sysctl -w net.ipv4.ip_forward=1 enables immediately. Persist by adding net.ipv4.ip_forward = 1 to /etc/sysctl.d/99-routing.conf. Required for the host to act as a router or NAT gateway.' },
      { q: 'What is a routing table and how does Linux select a route?', a: 'The routing table is a list of prefixes with their next-hop and interface. Linux performs longest-prefix match -- the most specific route wins. ip route get DESTIP shows which route would be selected.' },
      { q: 'What is policy-based routing in Linux?', a: 'Multiple routing tables (numbered 1-252) with ip rules selecting which table to use based on source IP, mark, TOS, or interface. Used when different traffic classes must take different paths.' },
      { q: 'How do you test which interface traffic to a destination uses?', a: 'ip route get DESTIP shows the selected route, outgoing interface, and source IP that would be used. It accounts for policy routing rules and is more accurate than reading the table manually.' },
      { q: 'What does ARP do and how do you view the ARP cache?', a: 'ARP resolves IPv4 addresses to MAC addresses on the local segment. ip neigh show (or arp -n) displays the ARP cache. Stale entries show as STALE or FAILED state.' },
      { q: 'What is a null route and when would you use it?', a: 'ip route add blackhole 192.0.2.0/24 drops all matching traffic silently. Use it to block traffic to a known-bad prefix without firewall rules, or as a DDoS mitigation technique.' },
      { q: 'What is the difference between a connected route and a static route?', a: 'A connected route is automatically added when an interface IP is configured -- it covers the interface subnet. A static route is manually configured to reach remote networks via a gateway.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/ip-route.8.html',
      'https://lartc.org/howto/',
    ],
  },
  {
    id: 'linux-ss-netstat',
    title: 'Socket Statistics: ss & netstat',
    icon: 'globe',
    color: '#06b6d4',
    category: 'networking',
    questions: 5,
    description: 'ss -tulnp vs netstat, TCP socket state machine, TIME_WAIT, and CLOSE_WAIT diagnosis.',
    visualizations: [
      { title: 'TCP Socket State Machine', description: 'LISTEN → SYN_RECV → ESTABLISHED → FIN_WAIT → TIME_WAIT', image: '/diagrams/linux/linux-ss-socket-states.png' },
    ],
    introduction: `ss (socket statistics) is the modern replacement for netstat. It reads socket information directly from the kernel via netlink socket rather than parsing /proc/net/tcp, making it significantly faster on systems with many connections.

**ss -tulnp decoded**:
- t: TCP sockets
- u: UDP sockets
- l: listening sockets only (omit to see established connections too)
- n: numeric — show IP addresses and port numbers instead of resolving to hostnames and service names (much faster)
- p: show process name and PID

**Reading ss output**: Netid (tcp/udp/unix), State, Recv-Q (bytes received but not read by application — high value means app can't keep up), Send-Q (bytes in send buffer not yet acknowledged by remote), Local Address:Port, Peer Address:Port, Process.

**TCP state machine**: The full TCP handshake and teardown creates distinct connection states. LISTEN (server waiting), SYN_SENT (client sent SYN, waiting for SYN-ACK), SYN_RECV (server received SYN, sent SYN-ACK), ESTABLISHED (connected), FIN_WAIT_1/2 (initiator closing), TIME_WAIT (initiator waiting for delayed packets), CLOSE_WAIT (receiver's side acknowledged FIN, application hasn't called close()), LAST_ACK, CLOSED.

**TIME_WAIT**: After TCP connection closes, the initiating side enters TIME_WAIT for 2×MSL (Maximum Segment Lifetime, typically 30-60 seconds, so TIME_WAIT lasts 60-120 seconds). Purpose: ensure delayed/duplicate packets from the old connection don't corrupt a new connection with the same 4-tuple. Thousands of TIME_WAIT connections are normal on a busy server — the kernel manages them automatically.

**CLOSE_WAIT**: The remote sent FIN (wants to close) and the local acknowledged it, but the local application hasn't called close() yet. CLOSE_WAIT connections accumulate when there's an application bug (not calling close() on HTTP keep-alive connections, unclosed sockets in code). This is almost always an application bug, not a kernel issue.`,
    whenToUse: [
      'Checking what ports are listening on a server',
      'Diagnosing "address already in use" errors',
      'Investigating connection leaks (CLOSE_WAIT buildup)',
      'Monitoring connection counts and queue depths under load',
    ],
    keyConcepts: [
      {
        term: 'ss vs netstat speed',
        definition: 'ss reads from kernel netlink socket directly. netstat parses /proc/net/tcp (reads entire file). On systems with 100k+ connections, netstat is ~100x slower than ss.',
      },
      {
        term: '-tulnp flags',
        definition: 't=TCP, u=UDP, l=listening only, n=numeric (no DNS), p=show process. ss -tulnp is the standard "what\'s listening" command. Add -a to also show established.',
      },
      {
        term: 'TIME_WAIT 2MSL',
        definition: 'Normal after TCP close. Duration 60-120s. Prevents old duplicate packets corrupting new connections. High count on busy servers is expected. Tune net.ipv4.tcp_tw_reuse if needed.',
      },
      {
        term: 'CLOSE_WAIT as app bug',
        definition: 'CLOSE_WAIT means remote sent FIN but local app hasn\'t called close(). Unlike TIME_WAIT (kernel-managed), CLOSE_WAIT grows until the app is fixed or restarted. Check with: ss -tnp state close-wait.',
      },
    ],
    pitfalls: [
      'Panicking about TIME_WAIT — it is normal, kernel-managed, and does not cause connection failures',
      'Confusing CLOSE_WAIT (app bug) with TIME_WAIT (normal) — they require very different responses',
      'High Recv-Q means the application cannot keep up reading data — may indicate CPU or processing bottleneck in the app',
      'ss without -n on a busy server — DNS resolution for each IP is very slow with thousands of connections',
    ],
    keyQuestions: [
      {
        question: 'You see thousands of TIME_WAIT connections on a server. Is this a problem? How do you tune it?',
        answer: `## TIME_WAIT: Normal, Not a Problem

\`\`\`bash
# Count TIME_WAIT connections
ss -tn state time-wait | wc -l
# 15000 — this is fine on a busy HTTP server

# These are normal: each HTTP/1.1 connection that closes enters TIME_WAIT
# Duration: 60 seconds (2 × 30s MSL)
# 15000 connections × 60s = 250 new connections/second closing
# Completely manageable for the kernel
\`\`\`

## When TIME_WAIT Is Actually a Problem

TIME_WAIT prevents reusing the same 4-tuple (src IP:port + dst IP:port + protocol) for 60s. On a server making many outbound connections to the same IP:port (e.g., a proxy hitting one backend), ephemeral ports can run out.

\`\`\`bash
# Check ephemeral port range
sysctl net.ipv4.ip_local_port_range
# 32768 61000 — about 28,000 ports

# Enable TIME_WAIT socket reuse for outgoing connections
sysctl -w net.ipv4.tcp_tw_reuse=1
# Safe: only reuses for NEW outgoing connections to different remote endpoint
\`\`\`

## What NOT to Do

\`\`\`bash
# DEPRECATED and dangerous — can cause data corruption
# sysctl -w net.ipv4.tcp_tw_recycle=1  # Removed in kernel 4.12

# Better approach: use persistent HTTP connections (Connection: keep-alive)
# This prevents TIME_WAIT entirely by reusing connections
\`\`\``,
      },
      {
        question: 'What does CLOSE_WAIT mean in the TCP state machine? What usually causes it?',
        answer: `## TCP Teardown States

\`\`\`
Client (active close)          Server (passive close)
─────────────────────────────────────────────────────
     FIN →
                               ← ACK
                               (Server enters CLOSE_WAIT here)

                               ← FIN  (server calls close())
     ACK →
     (Client enters TIME_WAIT)
\`\`\`

## CLOSE_WAIT Means the App Hasn't Called close()

\`\`\`bash
# Find CLOSE_WAIT connections and which process owns them
ss -tnp state close-wait

# How many CLOSE_WAIT connections exist?
ss -tn | grep CLOSE-WAIT | wc -l

# If this number grows over time = application bug
\`\`\`

## Common Causes

**1. HTTP connection not closed in code**
\`\`\`python
# Bug: response body not fully read / connection not closed
conn = http.client.HTTPConnection("example.com")
conn.request("GET", "/")
resp = conn.getresponse()
# Missing: resp.read() and conn.close()
\`\`\`

**2. Database connection pool leak**
- Connection acquired but not returned to pool after exception
- try/finally or context managers prevent this

**3. File descriptor leak**
- Sockets opened but never closed when function exits abnormally

## Fix

CLOSE_WAIT connections cannot be fixed by kernel tuning. The application must be fixed to call close() on connections when done. Workaround: restart the app (clears all sockets). Permanent fix: add proper connection cleanup in error paths.`,
      },
    ],
    quickFire: [
      { q: 'What is the ss command and why is it preferred over netstat?', a: 'ss (socket statistics) queries kernel socket data directly via netlink, making it much faster than netstat which reads /proc. netstat is deprecated in iproute2 distributions.' },
      { q: 'How do you list all listening TCP ports with ss?', a: 'ss -tlnp shows TCP listening sockets with port numbers and PIDs. -t=TCP, -l=listening, -n=numeric, -p=process info. Add -u for UDP.' },
      { q: 'How do you find what process is listening on port 8080?', a: 'ss -tlnp | grep :8080 or ss -tlnp sport = :8080. The output includes the PID and process name in the last column.' },
      { q: 'What does TIME_WAIT state mean and when is it a problem?', a: 'TIME_WAIT holds the socket for 2*MSL (60 seconds) after connection close to absorb delayed packets. High TIME_WAIT counts are normal under load. Problems arise when you exhaust the local port range (net.ipv4.ip_local_port_range).' },
      { q: 'How do you count established connections to a service?', a: 'ss -tn state established | grep :443 | wc -l counts HTTPS connections. For a summary by state use ss -s.' },
      { q: 'What does the Recv-Q column in ss output mean?', a: 'Recv-Q is the number of bytes received but not yet read by the application. A persistently non-zero Recv-Q on a listening socket means the accept backlog is full -- the application cannot keep up.' },
      { q: 'What is the SYN backlog and how do you increase it?', a: 'The SYN backlog (net.ipv4.tcp_max_syn_backlog) holds half-open connections during the TCP handshake. The accept backlog (listen() syscall + net.core.somaxconn) holds fully established but unaccepted connections.' },
      { q: 'How do you show socket memory usage with ss?', a: 'ss -m displays the socket memory allocations. ss -mi shows memory info plus internal TCP details including cwnd, rtt, and retransmits -- useful for diagnosing throughput problems.' },
      { q: 'What is CLOSE_WAIT and why does it accumulate?', a: 'CLOSE_WAIT means the remote side closed its half of the connection but the local application has not called close(). A large number of CLOSE_WAIT sockets indicates a connection leak in the application.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/ss.8.html',
      'https://vincent.bernat.ch/en/blog/2014-tcp-time-wait-state-linux',
    ],
  },
  {
    id: 'linux-tcpdump',
    title: 'Packet Capture with tcpdump',
    icon: 'globe',
    color: '#06b6d4',
    category: 'networking',
    questions: 5,
    description: 'tcpdump capture syntax, BPF filters, writing pcap files, and tshark for terminal analysis.',
    visualizations: [
      { title: 'BPF Filter Syntax', description: 'host, port, proto filters and logic combinators', image: '/diagrams/linux/linux-tcpdump-filters.png' },
    ],
    introduction: `tcpdump is the essential command-line packet capture tool. It uses libpcap and BPF (Berkeley Packet Filter) to capture and filter network packets at the kernel level, minimizing the data sent to userspace.

**Basic usage**: tcpdump -i eth0 captures on eth0. tcpdump -i any captures on all interfaces (useful when you're not sure which interface traffic uses, but misses some VLAN information). tcpdump with no filter prints all packets — typically too much data.

**BPF filter expressions**: The filter language is concise and powerful. Primitives: host 1.2.3.4 (source or destination), src host 1.2.3.4 (source only), dst host, port 80 (source or destination port), src port, dst port, tcp (TCP only), udp, net 10.0.0.0/8 (network). Combinations: and (&&), or (||), not (!). Parentheses for grouping: 'tcp and (port 80 or port 443)'.

**Key flags**:
- -n: no DNS resolution (essential on busy servers)
- -nn: no DNS and no service name resolution
- -v/-vv/-vvv: increasing verbosity (protocol details)
- -s 0: full packet capture (default in modern tcpdump is already 262144 bytes)
- -e: include ethernet header (MAC addresses)
- -A: print packet data as ASCII
- -X: print as hex + ASCII
- -w file.pcap: write raw packets to file (for Wireshark analysis)
- -r file.pcap: read from file
- -c N: stop after N packets

**tshark**: Terminal-based Wireshark. tshark -r file.pcap for reading captures, -Y 'display filter' for Wireshark display filters (more expressive than BPF), -T fields -e field for extracting specific fields.`,
    whenToUse: [
      'Debugging application connectivity issues (can the server receive the packets?)',
      'Verifying TLS certificate presentation during HTTPS handshake',
      'Capturing traffic for offline analysis in Wireshark',
      'Confirming DNS queries and responses are as expected',
    ],
    keyConcepts: [
      {
        term: 'BPF filter syntax',
        definition: 'host IP, port N, tcp/udp, net CIDR, src/dst modifiers. Combine with and/or/not. Quote complex expressions. Applied in kernel — efficient filtering before data reaches userspace.',
      },
      {
        term: '-i any capture',
        definition: 'Capture on all interfaces simultaneously. Useful when unsure which interface carries traffic. -i lo for loopback (inter-process communication on same host).',
      },
      {
        term: 'snaplen with -s',
        definition: '-s 0 captures full packet. Default snaplen is 262144 bytes (effectively full). Older systems defaulted to 68 bytes (just headers). Use -s 0 to ensure full payload capture.',
      },
      {
        term: '-w/-r for pcap files',
        definition: '-w output.pcap saves raw binary capture. -r input.pcap reads back. Share pcap files with tshark or Wireshark for rich protocol analysis. Rotate files: -W N -G seconds for rolling.',
      },
    ],
    pitfalls: [
      'tcpdump without -n on a busy server — DNS lookup for each IP address adds huge overhead and slow output',
      'Capturing to disk with -w without a size limit — can quickly fill filesystem; use -C 100 (100MB files) with -W 10 (keep 10 files)',
      'Not capturing on the right interface — use tcpdump -i any first to identify which interface carries the traffic',
      'tcpdump shows the packet was sent but the app still fails — check the reply packets too, and check for RST or ICMP unreachable',
    ],
    keyQuestions: [
      {
        question: 'Write a tcpdump command to capture all HTTP traffic to/from port 80, excluding your SSH session, and save to a file.',
        answer: `## tcpdump HTTP Capture Excluding SSH

\`\`\`bash
# Capture HTTP (port 80) traffic, exclude SSH (port 22), save to file
tcpdump -i eth0 -n -s 0 -w /tmp/http_capture.pcap \
    'tcp port 80 and not tcp port 22'

# Breakdown:
# -i eth0       : capture on eth0 (change to your interface)
# -n            : no DNS resolution (faster, cleaner output)
# -s 0          : full packet capture
# -w /tmp/...   : write to pcap file for Wireshark analysis
# 'tcp port 80' : only TCP port 80 traffic
# not tcp port 22 : exclude SSH (your remote admin connection)
\`\`\`

## More Specific: Only HTTP to a Specific Server

\`\`\`bash
# Traffic between this host and specific destination on port 80
tcpdump -i any -nn -s 0 -w /tmp/capture.pcap \
    'host 10.0.0.50 and tcp port 80'

# Capture first 1000 packets then stop
tcpdump -i eth0 -c 1000 -w /tmp/capture.pcap 'tcp port 80'
\`\`\`

## Quick Terminal Analysis (without saving file)

\`\`\`bash
# Print HTTP request line (first line of HTTP request)
tcpdump -i eth0 -nn -A 'tcp port 80 and tcp[tcpflags] & tcp-push != 0' | grep -E "^(GET|POST|HTTP)"

# Show just src/dst for port 80 traffic
tcpdump -i eth0 -nn 'tcp port 80' | awk '{print $3, $5}'
\`\`\``,
      },
      {
        question: 'How would you capture and analyze a TLS handshake to debug a certificate issue?',
        answer: `## Capturing TLS Handshakes

\`\`\`bash
# Capture HTTPS traffic (port 443)
tcpdump -i eth0 -nn -s 0 -w /tmp/tls_capture.pcap 'tcp port 443'

# Or capture TLS on non-standard port
tcpdump -i eth0 -nn -s 0 -w /tmp/tls_capture.pcap 'tcp port 8443'

# After capturing (or for live analysis):
# -v shows TLS handshake version info in terminal
tcpdump -i eth0 -nn -v 'tcp port 443 and host target-server.com'
\`\`\`

## Analyzing with tshark

\`\`\`bash
# Show TLS handshake details
tshark -r /tmp/tls_capture.pcap -Y 'tls.handshake'

# Show certificate subject and issuer
tshark -r /tmp/tls_capture.pcap \
    -Y 'tls.handshake.type == 11' \
    -T fields \
    -e tls.handshake.certificate

# Check TLS version negotiated
tshark -r /tmp/tls_capture.pcap \
    -Y 'tls.handshake.type == 2' \
    -T fields \
    -e tls.record.version \
    -e tls.handshake.version
\`\`\`

## What to Look For

- ClientHello: client sends supported cipher suites and TLS versions
- ServerHello: server picks cipher suite and TLS version
- Certificate: server sends its certificate chain — check for expiry/wrong hostname
- Alert (fatal): look for certificate_unknown, handshake_failure, etc.
- Connection RST after Certificate: client rejected the cert`,
      },
    ],
    quickFire: [
      { q: 'How do you capture traffic on a specific port with tcpdump?', a: 'tcpdump -i eth0 -n port 443 captures all traffic to or from port 443. Use tcp port 443 to restrict to TCP only. -n skips DNS resolution for speed.' },
      { q: 'How do you save a tcpdump capture for analysis in Wireshark?', a: 'tcpdump -i eth0 -w capture.pcap saves raw packets. Open capture.pcap in Wireshark. Add -C 100 to rotate files at 100 MB and -W 5 to keep only 5 files.' },
      { q: 'How do you filter tcpdump to traffic between two specific hosts?', a: "tcpdump -i any -n 'host 10.0.0.1 and host 10.0.0.2' captures bidirectional traffic between the two IPs. Use and port 5432 to further restrict to PostgreSQL." },
      { q: 'What does tcpdump -e show?', a: '-e includes the Ethernet layer (MAC addresses and EtherType) in the output. Useful for debugging ARP issues, VLAN tagging, and layer-2 forwarding problems.' },
      { q: 'How do you capture only the first 100 bytes of each packet?', a: 'tcpdump -s 100 sets the snaplen to 100 bytes. The default in modern tcpdump is 262144 (unlimited). Reducing snaplen improves capture speed and reduces pcap file size.' },
      { q: 'What does the tcp[13] field in a tcpdump filter reference?', a: 'Byte 13 of the TCP header is the flags byte. tcp[13] & 2 != 0 matches SYN packets. tcp[13] & 1 != 0 matches FIN. This byte-offset syntax filters on raw header fields.' },
      { q: 'How do you filter out SSH traffic when capturing on port 22 host?', a: "tcpdump -i eth0 not port 22 excludes SSH. Combine: 'port 80 or port 443 and not host 10.0.0.5' to watch web traffic while excluding a noisy host." },
      { q: 'What is the difference between -i any and -i eth0?', a: '-i any captures on all interfaces but cannot be put in promiscuous mode and does not show the real interface in output. -i eth0 captures one interface in promiscuous mode, showing all traffic on that segment.' },
      { q: 'How do you count packets per second with tcpdump?', a: "tcpdump -i eth0 -q -ttt 2>&1 | awk '/^[0-9]/{count++} END{print count}' or use the -G flag for timed rotation. For live rates, pktstat or nload are purpose-built." },
    ],
    references: [
      'https://www.tcpdump.org/manpages/tcpdump.1.html',
      'https://danielmiessler.com/study/tcpdump/',
    ],
  },
  {
    id: 'linux-dns-tools',
    title: 'DNS Debugging Tools',
    icon: 'globe',
    color: '#06b6d4',
    category: 'networking',
    questions: 5,
    description: 'dig, nslookup, host, /etc/resolv.conf, /etc/nsswitch.conf, and systemd-resolved.',
    visualizations: [
      { title: 'Common Network Ports', description: 'Well-known ports: DNS 53, HTTP 80, HTTPS 443, SSH 22...', image: '/diagrams/linux/linux-common-ports.png' },
    ],
    introduction: `DNS debugging is a critical skill — many service failures are ultimately DNS failures. The tools and configuration files involved form a layered system.

**dig (Domain Information Groper)**: The preferred DNS debugging tool for its structured, unambiguous output. dig @server name type queries a specific nameserver. Without @server, uses the system resolver from /etc/resolv.conf. Common types: A (IPv4), AAAA (IPv6), CNAME (canonical name), MX (mail), TXT (text records, SPF/DKIM/verification), NS (nameservers), SOA (Start of Authority), PTR (reverse DNS). Key options: +short (just the answer), +trace (full delegation from root servers), +norecurse (non-recursive query), +time=2 (short timeout).

**Reading dig output**: QUESTION SECTION shows what was asked. ANSWER SECTION shows the records. AUTHORITY SECTION shows the authoritative nameservers for the domain. ADDITIONAL SECTION shows IP addresses for nameservers. ;; MSG SIZE shows query/response sizes. The TTL in the ANSWER shows how long the answer is cached.

**/etc/resolv.conf**: The system DNS configuration. nameserver IP specifies DNS servers (up to 3). search domain1 domain2 appends these domains to unqualified names (myservice resolves as myservice.domain1, then myservice.domain2). options ndots:5 means names with fewer than 5 dots get the search domains appended first (Kubernetes sets this to cause issues with external DNS).

**/etc/nsswitch.conf**: Controls the order of name resolution mechanisms. The hosts line: files dns — means check /etc/hosts first, then DNS. With just dns, /etc/hosts is ignored. compat includes NIS.

**systemd-resolved**: A caching stub resolver at 127.0.0.53. Modern Ubuntu/Debian use it by default. /etc/resolv.conf is a symlink to /run/systemd/resolve/stub-resolv.conf. resolvectl status shows configuration per interface. resolvectl query hostname shows resolution path. Flush cache: resolvectl flush-caches.`,
    whenToUse: [
      'Diagnosing DNS resolution failures in applications',
      'Verifying DNS propagation after DNS record changes',
      'Debugging Kubernetes pod DNS resolution issues',
      'Understanding split-horizon DNS and resolver configuration',
    ],
    keyConcepts: [
      {
        term: 'dig @server type',
        definition: 'dig @8.8.8.8 example.com A — query specific nameserver. +short for just the answer. +trace to follow delegation from root. dig MX domain for mail records.',
      },
      {
        term: '+trace for delegation chain',
        definition: 'dig +trace example.com follows the entire resolution path: root servers → TLD nameservers → authoritative nameservers. Shows exactly where delegation happens.',
      },
      {
        term: '/etc/resolv.conf search',
        definition: 'search domain1 domain2 appends domains to short names. options ndots:N controls threshold. In Kubernetes, ndots:5 causes 5 DNS lookups before trying the bare name.',
      },
      {
        term: 'systemd-resolved stub',
        definition: 'Caching stub resolver at 127.0.0.53. resolvectl status shows per-interface DNS. resolvectl flush-caches clears stale entries. /etc/resolv.conf → symlink to stub-resolv.conf.',
      },
    ],
    pitfalls: [
      'nsswitch.conf files before dns means /etc/hosts takes priority over DNS — useful for testing but can mask real DNS issues',
      'systemd-resolved caching stale entries — flush with resolvectl flush-caches after DNS record changes',
      'ndots:5 in Kubernetes causing 5 extra DNS lookups per external domain (6 total attempts) — impacts latency at scale',
      'dig and the application getting different answers — dig uses its own resolver, not systemd-resolved; use resolvectl query or dig @127.0.0.53 to match application behavior',
    ],
    keyQuestions: [
      {
        question: 'How would you trace a complete DNS resolution from root servers to final answer using dig?',
        answer: `## Full DNS Trace with dig +trace

\`\`\`bash
dig +trace example.com A

# Output shows each delegation step:

# Step 1: Query root servers (.)
# . 518400 IN NS a.root-servers.net.
# ... (13 root servers listed)
# ;; Received from 198.41.0.4 (a.root-servers.net)

# Step 2: Root refers to .com TLD servers
# com. 172800 IN NS a.gtld-servers.net.
# ...
# ;; Received from a.root-servers.net

# Step 3: TLD refers to authoritative nameservers for example.com
# example.com. 172800 IN NS a.iana-servers.net.
# ;; Received from a.gtld-servers.net

# Step 4: Authoritative server provides final answer
# example.com. 86400 IN A 93.184.216.34
# ;; Received from a.iana-servers.net
\`\`\`

## Find Authoritative Nameservers (Without Recursion)

\`\`\`bash
# Query authoritative server directly (bypass cache)
dig +norecurse @a.iana-servers.net example.com A

# Find who is authoritative for a domain
dig NS example.com
dig SOA example.com  # Serial number useful for checking propagation

# Compare cached answer vs fresh from authoritative
dig example.com A                        # Cached (via resolver)
dig @$(dig NS example.com +short | head -1) example.com A  # Direct from authoritative
\`\`\``,
      },
      {
        question: 'A Kubernetes pod can\'t resolve external DNS. Walk through your debugging process.',
        answer: `## Kubernetes Pod DNS Debugging

\`\`\`bash
# Step 1: Get a shell in the pod
kubectl exec -it mypod -- /bin/sh

# Step 2: Check /etc/resolv.conf inside pod
cat /etc/resolv.conf
# nameserver 10.96.0.10       (CoreDNS ClusterIP)
# search myns.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5

# Step 3: Test DNS from inside pod
# First test CoreDNS is reachable
nslookup kubernetes.default  # Should work — internal service

# Then test external
nslookup google.com 10.96.0.10    # Direct CoreDNS query
nslookup google.com 8.8.8.8       # Direct external query

# Step 4: Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Step 5: Check CoreDNS ConfigMap for forwarder config
kubectl get configmap -n kube-system coredns -o yaml
# Look for: forward . /etc/resolv.conf (CoreDNS uses node DNS)

# Step 6: Check node DNS resolution
# SSH to the node
cat /etc/resolv.conf  # Node's upstream DNS
resolvectl status     # If using systemd-resolved

# Common causes:
# - NetworkPolicy blocking pod → CoreDNS (port 53)
# - CoreDNS not running (kubectl get pods -n kube-system)
# - Node DNS broken (CoreDNS can't forward)
# - ndots:5 causing timeout on external names with few dots
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between dig and nslookup?', a: 'dig is the modern standard tool with full control over query type, server, and output format. nslookup is older, interactive, and less scriptable. Use dig for troubleshooting.' },
      { q: 'How do you query a specific DNS server with dig?', a: 'dig @8.8.8.8 example.com A queries Google\'s resolver for the A record. Without @server, dig uses the system resolver from /etc/resolv.conf.' },
      { q: 'What does dig +trace show?', a: 'Performs iterative resolution starting from the root servers, showing each delegation step. Essential for diagnosing NS delegation and glue record issues.' },
      { q: 'How do you do a reverse DNS lookup?', a: 'dig -x 8.8.8.8 queries the PTR record for that IP. Internally it looks up 8.8.8.8.in-addr.arpa. host 8.8.8.8 does the same more concisely.' },
      { q: 'What does /etc/resolv.conf configure?', a: 'The system stub resolver. nameserver sets upstream DNS servers (up to 3). search sets domain suffixes appended to unqualified names. options sets timeout and attempts.' },
      { q: 'What is systemd-resolved and how does it relate to /etc/resolv.conf?', a: 'systemd-resolved is a local stub resolver on 127.0.0.53. On Ubuntu 18+, /etc/resolv.conf is a symlink to its stub file. Use resolvectl status to see per-interface DNS servers.' },
      { q: 'How do you flush the DNS cache on Linux?', a: 'systemctl restart systemd-resolved flushes systemd-resolved\'s cache. resolvectl flush-caches is a lighter flush without restart. nscd has its own flush: nscd -i hosts.' },
      { q: 'What does dig SOA example.com show?', a: 'The Start of Authority record: primary nameserver, admin email, serial number, refresh, retry, expire, and negative cache TTL. The serial number is crucial for zone transfer synchronization.' },
      { q: 'How do you check if a DNS record has propagated globally?', a: 'Query multiple public resolvers: dig @1.1.1.1, @8.8.8.8, @9.9.9.9. A difference in answers indicates propagation is still in progress. Tools like dnschecker.org automate multi-region checks.' },
    ],
    references: [
      'https://linux.die.net/man/1/dig',
      'https://www.freedesktop.org/software/systemd/man/systemd-resolved.service.html',
    ],
  },
  {
    id: 'linux-curl-wget',
    title: 'curl & wget for HTTP Debugging',
    icon: 'globe',
    color: '#06b6d4',
    category: 'networking',
    questions: 5,
    description: 'curl -v for HTTP debugging, custom headers, authentication, TLS inspection, and REST API calls.',
    visualizations: [
      { title: 'curl HTTP Request Lifecycle', description: 'DNS → TCP → TLS → request → response → redirect flow', image: '/diagrams/linux/linux-curl-http-lifecycle.png' },
    ],
    introduction: `curl is the Swiss Army knife for HTTP debugging and API testing. It supports nearly every HTTP feature and provides detailed output of the full request/response cycle.

**curl -v (verbose mode)**: Shows the entire conversation — TCP connection, TLS handshake details, request headers (lines starting with >), and response headers (lines starting with <). Lines starting with * are informational (connecting, TLS version, SSL certificate details, connection reuse).

**Request construction flags**:
- -X METHOD: HTTP method (GET is default, POST/PUT/DELETE/PATCH/HEAD)
- -H "Header: Value": add request header
- -d "body": request body (implies POST if -X not given)
- --data-raw "body": like -d but no @ file interpretation
- --data-binary @file: send file contents as-is
- -F "field=value": multipart/form-data
- -u user:pass: HTTP Basic authentication
- -H "Authorization: Bearer token": JWT/OAuth authentication

**Response and output flags**:
- -o file: save response body to file
- -O: save with server filename
- -s: silent (no progress meter)
- -S: show errors even with -s
- -I or --head: HEAD request only
- -L: follow redirects
- -w "%{time_total}\n": write-out format string for timing metrics

**TLS debugging**:
- --cacert ca.pem: custom CA certificate
- --cert client.pem: client certificate
- -k/--insecure: skip certificate verification (debugging only — never in scripts)
- --resolve host:port:IP: override DNS without changing /etc/hosts

**wget vs curl**: wget is optimized for downloading files (recursive site download with -r, resume with -c). curl is better for API debugging, supports more protocols, and provides more output detail.`,
    whenToUse: [
      'Testing API endpoints during development and debugging',
      'Verifying HTTPS certificate and TLS configuration',
      'Debugging authentication and authorization issues',
      'Measuring endpoint response times',
    ],
    keyConcepts: [
      {
        term: 'curl -v request anatomy',
        definition: '* lines: informational (TLS, connection). > lines: request headers sent. < lines: response headers received. Response body follows. -v is the first flag to add when debugging.',
      },
      {
        term: '-H custom headers',
        definition: 'curl -H "Content-Type: application/json" -H "Authorization: Bearer token" URL. Multiple -H flags for multiple headers. -H "header;" removes a default header.',
      },
      {
        term: '-X HTTP methods',
        definition: '-X POST, -X PUT, -X DELETE, -X PATCH. Combine with -d for body. -X HEAD (or -I) for HEAD requests. Without -X, GET is default unless -d is given (implies POST).',
      },
      {
        term: '-k TLS skip (insecure)',
        definition: '-k skips TLS certificate verification. Use ONLY for debugging — never in scripts or production. For proper debugging, use --cacert to specify the correct CA.',
      },
    ],
    pitfalls: [
      '-k (--insecure) in production or automation scripts — disables certificate validation, enabling MITM attacks',
      'Not quoting URLs with query strings in shell — & is interpreted as background operator: always quote with single or double quotes',
      'curl exit code vs HTTP status: curl exits 0 even for 404/500 responses. Use -f/--fail to make curl exit non-zero on HTTP errors',
      'Forgetting Content-Type header with JSON body — APIs return 415 Unsupported Media Type without it',
    ],
    keyQuestions: [
      {
        question: 'Use curl to debug a failing HTTPS API call. What flags do you use and what do you look for in the output?',
        answer: `## Systematic HTTPS API Debugging with curl

\`\`\`bash
# Step 1: Basic verbose call
curl -v https://api.example.com/endpoint
# Look for:
# * Connected to api.example.com — confirms DNS and TCP work
# * SSL certificate verify — TLS handshake success/failure
# * TLSv1.3 / cipher — what was negotiated
# < HTTP/2 200 — response status code
# < content-type: application/json — response headers
\`\`\`

## What Each Section Tells You

\`\`\`bash
*   Trying 1.2.3.4:443...       # DNS resolved, TCP connecting
* Connected to api.example.com  # TCP connection established
* SSL certificate verify ok      # TLS handshake succeeded
*   Subject: CN=api.example.com  # Cert details
> GET /endpoint HTTP/2           # Request sent
> Host: api.example.com
> Authorization: Bearer token    # Headers sent
< HTTP/2 403                     # Response status — 403 = auth issue
< x-error: invalid-token         # Response headers — check for clues
{"error": "token expired"}       # Response body
\`\`\`

## Common Debugging Scenarios

\`\`\`bash
# TLS certificate issue?
curl -v https://api.example.com 2>&1 | grep "SSL\\|certificate\\|verify"

# Wrong CA? Use custom CA
curl --cacert /path/to/corporate-ca.pem https://internal-api.company.com

# Test without TLS verification (debug only!)
curl -vk https://api.example.com

# Timing breakdown
curl -w "\\nDNS: %{time_namelookup}s\\nConnect: %{time_connect}s\\nTTFB: %{time_starttransfer}s\\nTotal: %{time_total}s\\n" \
     -o /dev/null -s https://api.example.com
\`\`\``,
      },
      {
        question: 'How would you test a REST API endpoint that requires JWT authentication and a JSON body?',
        answer: `## JWT-Authenticated REST API Call

\`\`\`bash
# POST with JWT and JSON body
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST https://api.example.com/v1/users \
     -H "Authorization: Bearer \${TOKEN}" \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -d '{
       "name": "Alice Smith",
       "email": "alice@example.com",
       "role": "admin"
     }' \
     -v

# Common response codes to diagnose:
# 201 Created — success
# 400 Bad Request — check JSON body format
# 401 Unauthorized — token invalid or expired
# 403 Forbidden — token valid but insufficient permissions
# 422 Unprocessable Entity — validation failed (check response body)
\`\`\`

## Reusable Pattern with Variables

\`\`\`bash
#!/bin/bash
API_BASE="https://api.example.com"
TOKEN=$(cat ~/.api-token)  # Store token in file, not in script

# Function for authenticated API calls
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    curl -sS \
         -X "$method" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -H "Accept: application/json" \
         \${data:+--data-raw "$data"} \
         -w "\\nHTTP Status: %{http_code}\\n" \
         "$API_BASE$endpoint"
}

# Usage
api_call GET /v1/users ""
api_call POST /v1/users '{"name":"Alice"}'
api_call DELETE /v1/users/123 ""
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'How do you send a POST request with JSON body using curl?', a: 'curl -X POST -H "Content-Type: application/json" -d the-json-body https://api.example.com/endpoint. Use -s to suppress progress and -o /dev/null to discard body.' },
      { q: 'How do you follow HTTP redirects with curl?', a: 'curl -L follows Location headers through all redirects. Use -L --max-redirs 10 to cap the chain. Without -L, curl returns the 3xx response as-is.' },
      { q: 'How do you resume an interrupted download with curl?', a: 'curl -C - -O https://example.com/bigfile.iso. The -C - flag reads the current file size and sends a Range header to resume from that byte offset.' },
      { q: 'What does curl -v show?', a: 'Verbose output including TLS handshake details, all request headers (> lines) and response headers (< lines). Essential for debugging auth, redirect, and header issues.' },
      { q: 'How do you time how long each phase of a curl request takes?', a: "curl -o /dev/null -s -w '%{time_namelookup} %{time_connect} %{time_starttransfer} %{time_total}\n' URL prints DNS, TCP connect, TTFB, and total time." },
      { q: 'What is the difference between wget and curl for downloading files?', a: 'wget is optimized for recursive downloading and resuming. curl supports more protocols and output formats. For a single file download both work; for mirroring a site, use wget -r.' },
      { q: 'How do you skip SSL certificate verification with curl?', a: 'curl -k or curl --insecure skips cert validation. Only use this for testing -- never in production scripts as it allows MITM attacks.' },
      { q: 'How do you send a custom HTTP header with curl?', a: "curl -H 'Authorization: Bearer TOKEN' -H 'X-Request-ID: abc123' URL. Each -H adds one header. To remove a default header use -H 'Accept:' (empty value)." },
      { q: 'How do you download a file and save it with its original name?', a: 'curl -O URL saves with the URL filename. curl -o localname URL saves with a custom name. wget URL saves with the URL filename by default.' },
    ],
    references: [
      'https://curl.se/docs/manpage.html',
      'https://everything.curl.dev/',
    ],
  },

  // ─── PERFORMANCE (additional) ──────────────────────────────────────────────
  {
    id: 'linux-top-htop',
    title: 'top & htop: Process Monitoring',
    icon: 'activity',
    color: '#f97316',
    category: 'performance',
    questions: 6,
    description: 'Load average interpretation, CPU time breakdown columns, interactive commands, and htop advantages.',
    visualizations: [
      { title: 'top/htop Metric Breakdown', description: 'CPU us/sy/id/wa, memory VIRT/RES/SHR, load average explained', image: '/diagrams/linux/linux-top-metrics.png' },
    ],
    introduction: `top and htop are the first tools you reach for when investigating system performance. Understanding what you're looking at is critical — the numbers can be misleading without context.

**Load average**: The three numbers (e.g., 2.50 0.80 0.40) represent the average number of runnable or uninterruptible-sleep processes over the last 1, 5, and 15 minutes. A process in either state contributes 1.0 to the load. Rule of thumb: divide by CPU count. On a 4-core system, load 4.0 means fully loaded, 8.0 means severely overloaded (processes waiting for CPU). A rising trend (15-min higher than 1-min) means load is increasing.

**CPU time columns** (in top header): %us = user space (application code), %sy = system/kernel (time spent in kernel on behalf of processes), %ni = niced processes, %id = idle (available headroom), %wa = I/O wait (CPU idle while waiting for disk or network I/O — high value is a disk bottleneck indicator), %hi = hardware interrupts, %si = software interrupts, %st = steal time (CPU stolen by hypervisor for other VMs — on cloud instances, high %st means noisy neighbor).

**Process table columns**: PID, USER, PR (priority, lower=higher priority), NI (nice value -20 to 19), VIRT (virtual memory allocated), RES (resident set — actual RAM in use), SHR (shared memory), S (state: R=running, S=sleeping, D=uninterruptible, Z=zombie, T=stopped), %CPU, %MEM, TIME+, COMMAND.

**Interactive top commands**: k = kill by PID, r = renice, P = sort by CPU, M = sort by memory, T = sort by CPU time, u = filter by user, 1 = toggle per-CPU breakdown (shows all cores individually), H = show threads, q = quit.

**htop advantages over top**: Color-coded display, mouse support, visual CPU/memory bars, tree view (F5) for parent/child relationships, easier kill (F9 + signal selection), filter by string (F4), and sorting by column click. htop also shows CPU numbers rather than aggregate.

**Zombie processes**: Shown as Z in state column. Child process has exited but parent hasn't called wait() to collect its exit status. The zombie holds a PID but no resources. Fix: fix the parent process code or restart the parent.`,
    whenToUse: [
      'First-pass investigation of a slow or unresponsive system',
      'Identifying which process is consuming unexpected CPU or memory',
      'Monitoring CPU distribution across cores (top 1 key)',
      'Finding zombie processes and high load average root causes',
    ],
    keyConcepts: [
      {
        term: 'Load average vs CPU count',
        definition: 'Load = runnable + uninterruptible processes. Divide by CPU count for % saturation. Load 8 on 8-core = 100% loaded. Trend matters: 15min > 5min > 1min = increasing load.',
      },
      {
        term: '%wa for I/O wait',
        definition: '%wa shows CPU idle while waiting for I/O. High %wa indicates disk or network bottleneck — the CPU has work to do but is blocked on I/O. Check with iostat -x for disk details.',
      },
      {
        term: '%st steal time',
        definition: 'On VMs/cloud: time the hypervisor gave this VM\'s CPU to another VM. High %st (>5%) indicates noisy neighbor or VM undersizing. Not tunable by the guest — escalate to cloud provider.',
      },
      {
        term: 'Zombie processes',
        definition: 'State Z: process exited but parent hasn\'t called wait(). Holds PID only — no CPU or memory. Not a problem unless thousands accumulate (PID exhaustion). Fix: restart the parent.',
      },
    ],
    pitfalls: [
      'Load average alone doesn\'t indicate whether bottleneck is CPU or I/O — 8.0 load could be CPU-bound or I/O-bound (check %wa)',
      '%wa can be 0 even with heavy I/O if using async I/O (io_uring) where the kernel handles I/O without blocking the CPU in wait state',
      'High %sy (>20%) could indicate too many system calls (chatty apps), excessive context switching, or kernel bugs — investigate with strace or perf',
      'VIRT (virtual) is usually much larger than RES (resident) due to memory-mapped files and reserved-but-not-used memory — use RES for actual memory usage',
    ],
    keyQuestions: [
      {
        question: 'A server shows load average of 8.0 on a 4-CPU system. Walk through how you\'d diagnose what\'s causing it.',
        answer: `## Diagnosing Load Average 8.0 on 4-CPU System

Load 8.0 / 4 CPUs = 200% loaded — two CPU-worth of processes waiting at all times.

**Step 1: Check if it's CPU or I/O bound**

\`\`\`bash
top
# Look at the CPU row:
# %Cpu(s): 90.0 us, 5.0 sy, 0.0 ni, 0.0 id, 4.0 wa, 0.0 hi, 1.0 si

# id=0.0 (no idle) + wa=4.0 = mostly CPU bound
# If wa were 40.0+ = I/O bound, not CPU
\`\`\`

**Step 2: Find which processes are using CPU**

\`\`\`bash
# In top: press P to sort by CPU
# Or use ps:
ps aux --sort=-%cpu | head -10
\`\`\`

**Step 3: If I/O bound, investigate disk**

\`\`\`bash
iostat -x 1
# %util approaching 100% = disk saturated
# await >> svctm = queuing (too many I/O requests)

# Which process is doing I/O?
iotop -o  # Only show processes actively doing I/O
\`\`\`

**Step 4: Check for D-state (uninterruptible sleep)**

\`\`\`bash
# D-state processes contribute to load average but don't consume CPU
ps aux | grep " D "

# Large number of D-state processes = I/O or kernel wait problem
# Common cause: NFS hang, stuck disk I/O, kernel bug
\`\`\`

**Step 5: Historical trend**

\`\`\`bash
sar -q 1 10       # Load average history
uptime            # Current + quick comparison
\`\`\``,
      },
      {
        question: 'What does high %wa (I/O wait) in top indicate, and how is it different from high %us?',
        answer: `## %wa (I/O Wait) vs %us (User)

\`\`\`
%Cpu(s): 5.0 us, 2.0 sy, 0.0 ni, 15.0 id, 78.0 wa, 0.0 hi, 0.0 si
\`\`\`

**%wa = 78%**: CPU is mostly idle, waiting for I/O to complete. The disk (or network) is the bottleneck. Adding more CPUs won't help — the work is waiting on I/O.

**%us = 5%**: Application code running. If this were 95%, the bottleneck is CPU computation — more CPUs would help.

## How to Investigate High %wa

\`\`\`bash
# Identify which disk is bottlenecked
iostat -x 1
# DEVICE  r/s  w/s  rkB/s  wkB/s  await  %util
# sda     0.0  500  0.0    64000  120ms  98%
# High await + %util near 100% = disk saturated

# Which process is doing the I/O?
iotop -o         # Shows only active I/O processes
iotop -o -b -n 5 # Batch mode, 5 samples

# What files are being written?
strace -p PID -e trace=write,read
lsof -p PID | grep -v REG  # Non-regular files (pipes, sockets)
\`\`\`

## Key Distinction

| High %wa | High %us |
|----------|----------|
| Disk/network bottleneck | CPU computation bottleneck |
| More CPU won't help | More CPU will help (if parallelizable) |
| Investigate with iostat, iotop | Investigate with perf, flame graphs |
| Fix: faster disk, I/O optimization | Fix: profile hot code, optimize algorithm |`,
      },
    ],
    quickFire: [
      { q: 'What does load average represent in Linux?', a: 'The average number of processes in a runnable or uninterruptible state over 1, 5, and 15 minutes. A load average equal to the number of CPU cores means the system is fully utilized.' },
      { q: 'What is the difference between %us and %sy CPU in top?', a: '%us is time in user-space code. %sy is time in kernel-space (system calls, I/O handling). High %sy indicates excessive context switching or I/O-intensive workloads.' },
      { q: 'What does %wa (CPU wait) indicate in top?', a: 'The percentage of time CPUs were idle waiting for I/O to complete. High %wa (above 20-30%) indicates an I/O bottleneck -- the CPU has work to do but is waiting on disk or network.' },
      { q: 'What is the difference between VIRT, RES, and SHR in top?', a: 'VIRT is total virtual address space. RES is physical RAM currently in use. SHR is shared memory (mapped libraries). Memory consumption is best measured by RES minus SHR.' },
      { q: 'How do you see per-thread CPU usage in top?', a: "Press H in top to toggle thread mode, showing individual threads. Or top -H -p PID shows threads for a specific process." },
      { q: 'What does the zombie count in top indicate?', a: 'Processes that have exited but whose parent has not called wait(). Zombies hold a PID but no memory. A large count indicates a parent process with a bug. kill -9 on a zombie has no effect.' },
      { q: 'How do you sort top output by memory usage?', a: "Press M in top to sort by RES (resident memory). Or start with top -o %MEM. In htop use F6 to choose sort column." },
      { q: 'What is htop\'s advantage over top for troubleshooting?', a: 'htop shows a per-CPU core bar graph at the top, supports mouse clicks, color-codes processes, and allows tree view showing parent-child relationships. It is easier to navigate without memorizing key bindings.' },
      { q: 'How do you prevent top from scrolling output off screen?', a: "top -b -n 1 runs in batch mode for one iteration and prints to stdout, suitable for logging. top -d 5 sets the 5-second refresh interval." },
    ],
    references: [
      'https://man7.org/linux/man-pages/man1/top.1.html',
      'https://scoutapm.com/blog/understanding-load-averages',
    ],
  },
  {
    id: 'linux-vmstat-iostat',
    title: 'vmstat & iostat',
    icon: 'activity',
    color: '#f97316',
    category: 'performance',
    questions: 5,
    description: 'vmstat fields for system-level stats, iostat -x for disk I/O deep-dive, and await vs svctm.',
    visualizations: [
      { title: 'vmstat Fields Explained', description: 'procs r/b, memory swpd/free/cache, swap si/so, CPU wa% bottleneck', image: '/diagrams/linux/linux-vmstat-fields.png' },
    ],
    introduction: `vmstat and iostat provide system-wide and per-device performance statistics at a level of detail that top doesn't offer.

**vmstat 1** (run every 1 second): The first row after the header is averages since boot — ignore it. Subsequent rows are 1-second samples.

Column groups and key fields:
- **procs**: r = processes in run queue (waiting for CPU), b = processes in uninterruptible sleep (D state, blocked on I/O)
- **memory**: swpd = swap used, free = free RAM, buff = buffer cache (block I/O), cache = page cache (file data). In Linux, free RAM is intentionally low — the OS uses it for cache
- **swap**: si = swap in (KB/s, pages being read FROM swap TO RAM), so = swap out (KB/s, pages being WRITTEN TO swap). Any nonzero si/so means active swapping — serious performance problem
- **io**: bi = blocks in (from disk), bo = blocks out (to disk), in 512-byte blocks/second
- **system**: in = interrupts/sec, cs = context switches/sec. Very high cs (>100,000/sec) with low CPU can indicate excessive threading or system calls
- **cpu**: identical to top's CPU columns — us sy id wa st

**iostat -x 1** (extended I/O statistics per device):
- r/s, w/s: read/write operations per second (IOPS)
- rMB/s, wMB/s: throughput
- rrqm/s, wrqm/s: merged requests (OS combining adjacent requests before sending to device)
- r_await, w_await: average time (ms) for read/write I/O to complete including queue wait time
- aqu-sz (or avgqu-sz): average queue length (requests waiting + being serviced)
- %util: percentage of time the device is busy. Approaches 100% when the device is saturated

**The critical insight**: await is the total time from I/O request submission to completion. svctm (deprecated but historically present) was device service time. A large gap between await and svctm indicates queuing — the device can service I/O quickly but requests are piling up. With modern SSDs, %util can be 100% but the device is not truly saturated (SSDs queue internally).`,
    whenToUse: [
      'Confirming whether swapping is occurring before it becomes critical',
      'Identifying disk I/O bottlenecks during database or file system issues',
      'Checking context switch rate for heavily threaded applications',
      'Baselining system behavior to detect anomalies',
    ],
    keyConcepts: [
      {
        term: 'vmstat r/b columns',
        definition: 'r = run queue length (processes waiting for CPU — sustained >CPU_count means CPU bottleneck). b = blocked (uninterruptible D-state processes — sustained >0 means I/O bottleneck).',
      },
      {
        term: 'si/so for swap activity',
        definition: 'si (swap in) and so (swap out) measured in KB/s. Any nonzero si/so means active swapping — RAM is full, OS is paging. Severe performance impact. Tune vm.swappiness to reduce.',
      },
      {
        term: 'iostat await vs %util',
        definition: 'await: total I/O latency (ms) including queue wait. %util: device busy percentage. High await + high %util = disk saturated. High await + low %util = possible firmware or driver issue.',
      },
      {
        term: 'aqu-sz queue length',
        definition: 'Average number of I/O requests in flight (queued + being serviced). Greater than 1 on HDDs indicates queuing. SSDs handle deeper queues efficiently (NVMe queue depth 64+).',
      },
    ],
    pitfalls: [
      'vmstat first row is boot-time averages — always skip it, start reading from the second row',
      'si/so in vmstat are in 512-byte blocks on some kernel versions, not KB — check with free -m and monitor swpd',
      '%util 100% on NVMe SSDs does NOT mean saturated — SSDs have deep hardware queues and can sustain much more with %util=100%',
      'High cs (context switches) is normal for highly concurrent servers — only a problem if cs is unexpectedly high relative to throughput',
    ],
    keyQuestions: [
      {
        question: 'You see vmstat showing si and so values consistently above 0. What does this mean and how urgent is it?',
        answer: `## Interpreting Non-Zero si/so

\`\`\`bash
vmstat 1
# procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
# r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
# 4  2 524288  45000  12000 890000  120  250  1200  1800  800 1200 65 20  0 15  0
#                                   ^^^  ^^^
# si=120, so=250 KB/s -- ACTIVE SWAPPING
\`\`\`

## What si/so Mean

**si (swap in)**: Pages being read FROM swap device TO RAM. This happens when a process needs memory that was previously swapped out. Every si causes a disk read.

**so (swap out)**: Pages being written FROM RAM TO swap device. Kernel is pushing memory to disk to free up RAM for other processes.

## Urgency Assessment

| si/so value | Urgency | Action |
|-------------|---------|--------|
| 0, 0 | Normal | None |
| < 10 KB/s | Watch | Monitor trend |
| 10-100 KB/s | Concerning | Investigate memory usage |
| > 100 KB/s | Critical | Immediate action needed |

\`\`\`bash
# Find what's consuming memory
ps aux --sort=-%mem | head -20

# Check total memory picture
free -m
cat /proc/meminfo | grep -E "MemTotal|MemFree|SwapTotal|SwapFree|Cached"

# Reduce swappiness (default 60, lower = less aggressive swapping)
sysctl -w vm.swappiness=10
echo "vm.swappiness=10" >> /etc/sysctl.d/99-memory.conf
\`\`\``,
      },
      {
        question: 'Explain the difference between await and svctm in iostat -x output. What does a large gap between them indicate?',
        answer: `## iostat -x Output

\`\`\`bash
iostat -x 1
# Device    r/s  w/s  rkB/s  wkB/s  rrqm/s  wrqm/s  r_await  w_await  aqu-sz  %util
# sda       0.0  800  0.0    102400   0.0     50.0     85.0    120.0    8.5     98.0
\`\`\`

## await — Total I/O Latency

await includes ALL time from when the application submitted the I/O to when the device completed it:
- Time waiting in the OS I/O queue (if device is busy)
- Time the device physically processed the request

## svctm — Device Service Time (deprecated)

svctm was an estimate of just the device processing time, excluding queue wait. Removed in newer iostat because it was calculated inaccurately.

## The Gap = Queuing

\`\`\`
await = queue_wait_time + device_service_time
                          ^^^^^^^^^^^^^^^^^^^
                          (what svctm approximated)
\`\`\`

**Example analysis**:
\`\`\`
r_await = 85ms   (total read latency including wait)
HDD typical service time ≈ 8-10ms
Queue wait ≈ 75ms  -- I/O requests are waiting 7.5x longer than actual service time!

aqu-sz = 8.5  -- 8.5 requests in queue on average
%util = 98%   -- device is almost always busy
\`\`\`

**Interpretation**: The disk can physically service I/O in ~10ms, but requests wait 75ms in queue. Solution: reduce I/O rate, use faster storage, add I/O scheduling tuning, or investigate application for unnecessary I/O.

\`\`\`bash
# For SSDs: high await but low aqu-sz is unusual — check for driver issues
# For HDDs: await > 20ms under load is concerning
# For NVMe: await > 1ms under load is concerning
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What does vmstat 1 5 show?', a: 'Five snapshots of system activity one second apart: processes, memory, swap, I/O, system (interrupts/context switches), and CPU percentages. The first line is averages since boot; subsequent lines are since the previous sample.' },
      { q: 'What does the si/so column in vmstat mean?', a: 'si (swap in) and so (swap out) are kilobytes per second being moved between swap and RAM. Persistent non-zero so values mean the system is actively swapping under memory pressure.' },
      { q: 'What does the cs column in vmstat measure?', a: 'Context switches per second. A high cs value (hundreds of thousands) relative to CPU usage suggests excessive locking, many short-lived threads, or an over-threaded application.' },
      { q: 'What does iostat -x show that basic iostat does not?', a: 'Extended statistics including await (average I/O wait time in ms), %util (device busy percentage), r/s and w/s (read/write operations per second), and queue depth (avgqu-sz).' },
      { q: 'What does %util close to 100% in iostat mean?', a: 'The device is busy nearly 100% of the time. It does not directly mean the device is saturated -- SSDs can queue many operations. Check await time: if await is high alongside high %util, the device is a bottleneck.' },
      { q: 'What is the difference between await and svctm in iostat?', a: 'svctm is the service time (actual device time). await includes both queue wait time and service time. A large gap between await and svctm indicates I/O queue congestion.' },
      { q: 'How do you identify which process is causing high I/O?', a: 'iotop -o shows only processes with active I/O and their read/write rates. pidstat -d 1 from sysstat gives per-process I/O stats. Both require root or CAP_SYS_ADMIN.' },
      { q: 'What does the in column in vmstat measure?', a: 'Hardware interrupts per second. A sudden spike often correlates with a NIC receiving a burst of packets or a disk controller completing many I/Os.' },
      { q: 'How do you measure storage latency with iostat?', a: 'iostat -x 1 and watch the await column in milliseconds. Under 1 ms is excellent (NVMe), 1-10 ms is normal (SSD), over 20 ms is high (spinning disk under load).' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/vmstat.8.html',
      'https://man7.org/linux/man-pages/man1/iostat.1.html',
    ],
  },
  {
    id: 'linux-perf-profiling',
    title: 'perf & Flame Graphs',
    icon: 'activity',
    color: '#f97316',
    category: 'performance',
    questions: 5,
    description: 'perf stat, perf record/report, generating flame graphs, and off-CPU analysis for I/O bottlenecks.',
    visualizations: [
      { title: 'perf Event Types', description: 'Hardware (cycles/cache-miss), software, tracepoints, perf stat vs record', image: '/diagrams/linux/linux-perf-events.png' },
    ],
    introduction: `perf is the Linux performance profiling Swiss Army knife, built directly into the kernel subsystem. It uses hardware performance counters and software events to profile at near-zero overhead.

**perf stat**: Collects hardware counter statistics for a command run. Key metrics: task-clock (milliseconds of CPU time), cycles (CPU clock cycles), instructions (retired instructions), IPC = instructions/cycles (efficiency measure — 1.0+ is good, below 0.5 suggests memory-bound workload), cache-misses (LLC misses indicate memory access pattern problems), branch-misses (mispredicted branches cause pipeline stalls).

**perf record**: Samples the call stack at a configurable rate (default 4000 Hz, often set to 99 Hz with -F 99 to avoid frequency aliasing). Records to perf.data. Flags: -g (call graph/stack traces), -p PID (attach to running process), -a (system-wide), --call-graph fp (frame pointer unwinding — fastest), --call-graph dwarf (DWARF unwinding — works without frame pointers but more overhead).

**perf report**: Interactive TUI for analyzing perf.data. Shows functions sorted by CPU time with caller/callee breakdown.

**Flame Graphs** (invented by Brendan Gregg): A visualization where the x-axis represents alphabetically sorted stack frames (width = proportion of time), y-axis is call stack depth (bottom = root, top = leaf function). The key insight: **wide frames at the top** are where time is actually spent. Color is irrelevant. Look for wide plateaus that indicate hot code paths.

**Generating flame graphs**:
1. perf record -F 99 -g -p PID -- sleep 30
2. perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg

**Off-CPU analysis**: Regular CPU profiling misses time spent waiting (I/O, locks, sleep). Off-CPU flame graphs show where threads block, not just where they compute.`,
    whenToUse: [
      'Identifying CPU hotspots in production services',
      'Investigating high CPU usage with no obvious cause',
      'Comparing performance before and after optimization (differential flame graphs)',
      'Finding lock contention in multithreaded applications',
    ],
    keyConcepts: [
      {
        term: 'perf stat hardware counters',
        definition: 'perf stat cmd — shows cycles, instructions, IPC, cache-misses. IPC < 0.5 suggests memory-bound. High cache-misses suggest poor data locality. Branch-misses suggest unpredictable conditions.',
      },
      {
        term: 'IPC (instructions per cycle)',
        definition: 'IPC = instructions / cycles. > 1.0: CPU well utilized, efficient code. 0.5-1.0: moderate efficiency. < 0.5: memory-bound or poor branch prediction. Modern CPUs can achieve IPC 3-4 with ideal workloads.',
      },
      {
        term: 'Flame graph width=time',
        definition: 'Wider frames = more CPU time. Look for wide plateaus at the top of the flame (leaf functions). Alphabetical x-axis — position is irrelevant. Merge identical stacks for accurate width.',
      },
      {
        term: 'Off-CPU analysis',
        definition: 'CPU profiling shows where CPU runs. Off-CPU profiling shows where threads wait (I/O, locks, sleep). Use perf trace or bpftrace offcputime.bt for blocking time analysis.',
      },
    ],
    pitfalls: [
      'Frame pointers not compiled in (gcc -fomit-frame-pointer default) — use --call-graph dwarf but with higher overhead, or request frame pointers with -fno-omit-frame-pointer in build',
      'perf requires root or /proc/sys/kernel/perf_event_paranoid <= 1 — set sysctl -w kernel.perf_event_paranoid=1',
      'JIT-compiled code (Java, Node.js) needs special agents to expose symbols — use async-profiler for JVM or --perf-basic-prof for Node.js',
      'Profiling at too high a frequency (e.g., 10000 Hz) introduces observer effect — use 99 Hz to avoid aliasing with system timer at 100 Hz',
    ],
    keyQuestions: [
      {
        question: 'How do you generate a CPU flame graph on Linux? Walk through the entire process from profiling to visualization.',
        answer: `## Complete Flame Graph Generation

**Step 1: Get Brendan Gregg's FlameGraph tools**

\`\`\`bash
git clone https://github.com/brendangregg/FlameGraph
cd FlameGraph
\`\`\`

**Step 2: Record stack samples**

\`\`\`bash
# Profile a specific PID for 30 seconds at 99 samples/sec
sudo perf record -F 99 -p $(pgrep myapp) -g -- sleep 30

# Profile system-wide (all processes, all CPUs)
sudo perf record -F 99 -a -g -- sleep 30

# For Java/JVM (needs perf-map-agent or async-profiler instead):
# perf cannot resolve JIT symbols natively
\`\`\`

**Step 3: Convert to flame graph**

\`\`\`bash
# Generate the perf script output
sudo perf script > perf.output

# Collapse stack traces (combine identical stacks)
./stackcollapse-perf.pl perf.output > perf.folded

# Generate SVG flame graph
./flamegraph.pl perf.folded > flame.svg

# Open in browser
xdg-open flame.svg
\`\`\`

**Step 4: Interpret**

\`\`\`
- Widest frames at TOP = hottest code paths (most CPU time)
- Tall stacks = deep call chains
- Flat tops = CPU time in leaf function (likely the bottleneck)
- Plateaus that span many stacks = common code path
\`\`\`

**One-liner** (combining all steps):

\`\`\`bash
sudo perf record -F 99 -p $(pgrep myapp) -g -- sleep 30 && \
sudo perf script | ~/FlameGraph/stackcollapse-perf.pl | \
~/FlameGraph/flamegraph.pl > /tmp/flame.svg
\`\`\``,
      },
      {
        question: 'A service has high CPU usage but flame graphs show no obvious hotspot — it\'s spread thin. What techniques would you use next?',
        answer: `## Diagnosing Diffuse CPU Usage

When CPU is spread thin (no single function using >5% each), the problem is usually architectural.

**1. Check the system call profile**

\`\`\`bash
# What syscalls is the app making?
strace -c -p $(pgrep myapp)
# Counts and time per syscall type
# High futex count = lock contention
# High read/write count = too many small I/O ops
# High mmap/mprotect = memory allocation churn
\`\`\`

**2. Check context switch rate**

\`\`\`bash
vmstat 1 | awk '{print $12}'  # cs column
# High cs (>100k/sec per CPU) with threads = lock contention or too many threads

# Per-process context switches:
cat /proc/$(pgrep myapp)/status | grep ctxt
# voluntary_ctxt_switches   -- thread waiting (I/O, lock, sleep)
# nonvoluntary_ctxt_switches -- preempted by scheduler (CPU-bound)
\`\`\`

**3. Lock contention profiling**

\`\`\`bash
# Using perf lock (if available)
sudo perf lock record -p $(pgrep myapp) -- sleep 10
sudo perf lock report

# Or use bpftrace for futex analysis
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_futex { @[ustack] = count(); } interval:s:10 { print(@); exit(); }'
\`\`\`

**4. Differential flame graph**

\`\`\`bash
# Profile before optimization
perf record -F 99 -p PID -g -- sleep 30
perf script > before.perf

# After making a change, profile again
perf script > after.perf

# Generate differential graph (shows increase/decrease)
./stackcollapse-perf.pl before.perf > before.folded
./stackcollapse-perf.pl after.perf > after.folded
./difffolded.pl before.folded after.folded | ./flamegraph.pl > diff.svg
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between perf stat and perf record?', a: 'perf stat runs a command and prints aggregate hardware counter statistics (cycles, instructions, cache misses). perf record samples the call stack at intervals and writes to perf.data for post-analysis.' },
      { q: 'What does perf top show?', a: 'A live view of the hottest kernel and user-space functions sorted by CPU sample count, similar to top but at function granularity. Press a to annotate a function with its source and assembly.' },
      { q: 'What is a flame graph and what does it show?', a: 'A visualization of stack traces where the x-axis is time (or sample count) and the y-axis is call depth. Wide frames at the top are hot functions. Generated from perf script output via Brendan Gregg\'s flamegraph.pl.' },
      { q: 'What does perf record -g capture that -g omits?', a: '-g captures call graph (stack trace) information per sample. Without -g, perf record captures only the current IP with no call chain. Stack traces are essential for flame graphs.' },
      { q: 'What is the sampling frequency set with -F in perf record?', a: '-F 99 samples at 99 Hz (99 times per second). Using 99 instead of 100 avoids lockstep with 100 Hz timer-based events, giving a more representative sample.' },
      { q: 'What does a high IPC (instructions per cycle) indicate?', a: 'The CPU is executing many instructions per clock cycle -- the workload is compute-efficient with few stalls. Low IPC despite high CPU usage suggests memory latency or branch mispredictions.' },
      { q: 'What is the perf annotate command?', a: 'perf annotate shows the source code and disassembly of a function with per-instruction sample counts. Identifies which exact line or instruction is the hot path.' },
      { q: 'What does the eBPF-based profiler bpftrace offer over perf?', a: 'bpftrace writes programs in a high-level language and attaches to kernel/user probes at runtime without recompilation. It can trace arbitrary kernel data structures and correlate events across subsystems.' },
      { q: 'How do you profile a Python or Java application with perf?', a: 'Python needs --enable-shared and perf-map-agent. Java needs -XX:+PreserveFramePointer and the perf-map-agent jar. Both generate /tmp/perf-PID.map so perf can resolve JIT symbols.' },
    ],
    references: [
      'https://www.brendangregg.com/flamegraphs.html',
      'https://perf.wiki.kernel.org/index.php/Main_Page',
    ],
  },
  {
    id: 'linux-strace-ltrace',
    title: 'strace & ltrace',
    icon: 'activity',
    color: '#f97316',
    category: 'performance',
    questions: 5,
    description: 'Tracing system calls and library calls to debug mysterious application behavior.',
    visualizations: [
      { title: 'Troubleshooting Playbook', description: 'System call tracing workflow: symptoms → strace/ltrace → root cause', image: '/diagrams/linux/linux-troubleshooting-playbook.png' },
    ],
    introduction: `strace intercepts every interaction between a process and the Linux kernel. Since all I/O, file access, memory allocation (ultimately), and process management goes through system calls, strace reveals exactly what a program is doing at the lowest level.

**How strace works**: strace uses the ptrace() system call to attach to a process and intercept each syscall entry and exit. This introduces significant overhead (typically 10-100x slowdown) — use on production with caution, and use -c for summary first.

**Basic usage**:
- strace command: traces from process start
- strace -p PID: attach to a running process
- strace -f: follow child processes created by fork()
- strace -ff: follow forks and write each to a separate file (for threaded apps)

**Output format**: syscall_name(arguments) = return_value. On error: syscall_name(arguments) = -1 ERRNO (error description). Common errno: ENOENT (No such file or directory), EACCES (Permission denied), EAGAIN (Resource temporarily unavailable / try again), ECONNREFUSED (Connection refused), ETIMEDOUT (Connection timed out).

**Filtering**:
- -e trace=file: only file-related syscalls
- -e trace=network: only network syscalls (socket, connect, recv, send)
- -e trace=process: process management (fork, execve, wait)
- -e trace=memory: memory operations (mmap, brk, mprotect)
- -e trace=open,read,write: specific syscalls

**Performance analysis**:
- -c: count syscalls and show summary with time, calls, errors — great first step
- -T: show time spent in each syscall
- -tt: absolute timestamps with microseconds

**ltrace**: Similar to strace but for library function calls. ltrace command shows calls to shared library functions (malloc, free, fopen, strcmp, pthread_mutex_lock, etc.). Less overhead than strace for I/O-heavy workloads.`,
    whenToUse: [
      'Debugging "file not found" when the file seems to exist',
      'Understanding why an application is slow (where is it spending time?)',
      'Finding which network connections an application is making',
      'Diagnosing permission denied errors with complex file paths',
    ],
    keyConcepts: [
      {
        term: 'strace -p attach',
        definition: 'strace -p PID attaches to a running process without restarting it. -f follows forks. Output shows syscall(args) = return or ERRNO. Ctrl+C detaches without killing the process.',
      },
      {
        term: '-e trace categories',
        definition: '-e trace=file for filesystem ops, =network for sockets, =process for fork/exec, =memory for mmap. Combine: -e trace=file,network. Dramatically reduces output volume.',
      },
      {
        term: '-c for summary stats',
        definition: 'strace -c p PID sleeps N — shows count, time, and errors per syscall after detaching. Find where most time goes without reading thousands of lines of output.',
      },
      {
        term: 'ENOENT/EACCES/EAGAIN',
        definition: 'ENOENT: file/dir not found at exact path shown. EACCES: permission denied (check ownership and mode). EAGAIN: non-blocking resource not ready (normal in event loops). ECONNREFUSED: port not listening.',
      },
    ],
    pitfalls: [
      'strace overhead (10-100x) can make a slow app appear to hang — use -c for summary first, then targeted -e filters',
      'strace -f needed for multithreaded or multi-process apps — without -f you only see the parent',
      'Some syscalls replaced by vDSO (clock_gettime, gettimeofday) — these are invisible to strace because they execute in userspace via kernel-mapped memory',
      'strace shows the syscall path but not why — for why, you need ltrace (library calls) or a proper debugger (gdb)',
    ],
    keyQuestions: [
      {
        question: 'An application is mysteriously slow. How would you use strace to find where it\'s spending time?',
        answer: `## Using strace to Find Performance Bottlenecks

**Step 1: Get a summary (lowest overhead)**

\`\`\`bash
# Attach to running process, collect 30 seconds of data
strace -c -p $(pgrep myapp) sleep 30

# Output example:
# % time     seconds  usecs/call     calls    errors syscall
# ------ ----------- ----------- --------- --------- ----------------
#  78.50    0.785000        1000       785           read
#  15.20    0.152000         500       304           write
#   3.10    0.031000          10      3100           futex
#   2.30    0.023000           8      2875           poll
\`\`\`

**Step 2: Interpret the summary**

- High time in read: lots of small reads? Use -e trace=read to see sizes
- High time in futex: lock contention between threads
- High time in poll/select/epoll_wait: I/O bound (waiting for network/disk)
- High count but low time in any syscall: chatty but not bottlenecked

**Step 3: Drill into specific syscalls**

\`\`\`bash
# Show timing for each individual read call
strace -T -e trace=read -p $(pgrep myapp) 2>&1 | head -50

# Output:
# read(5, "data...", 4096) = 1024 <0.025000>
# read(5, "data...", 4096) = 1024 <0.024000>
# Lots of 1KB reads from fd 5 taking 25ms each!

# What is fd 5?
ls -la /proc/$(pgrep myapp)/fd/5
# -> /var/log/app.log  (reading log file 1KB at a time — needs buffering)
\`\`\`

**Step 4: Network-specific debugging**

\`\`\`bash
strace -T -e trace=network -p $(pgrep myapp) 2>&1 | grep connect
# connect(8, {sa_family=AF_INET, sin_port=htons(5432), ...}, 16) = 0 <0.150000>
# 150ms to connect to database! (every request connecting fresh)
\`\`\``,
      },
      {
        question: 'A program fails with "No such file or directory" but the file exists. How does strace help you debug this?',
        answer: `## Diagnosing ENOENT with strace

\`\`\`bash
# Run the failing command under strace, filter to file ops
strace -e trace=openat,stat,access,open ./myprogram 2>&1 | grep ENOENT

# Output reveals the EXACT path being tried:
# openat(AT_FDCWD, "/usr/lib/libssl.so.3", O_RDONLY) = -1 ENOENT (No such file or directory)
# openat(AT_FDCWD, "/usr/local/lib/libssl.so.3", O_RDONLY) = -1 ENOENT (No such file or directory)
# The error is about a library, not the file you thought!
\`\`\`

## Common Causes Revealed by strace

**Wrong path (typo, relative vs absolute)**:
\`\`\`bash
openat(AT_FDCWD, "/etc/myapp/conifg.json", ...) = -1 ENOENT
# Note: "conifg" not "config" — typo in the application
\`\`\`

**Missing shared library**:
\`\`\`bash
# Check library loading
strace -e trace=openat ./myprogram 2>&1 | grep ".so"
# Fix: ldconfig, LD_LIBRARY_PATH, or install the missing lib package
\`\`\`

**Wrong working directory**:
\`\`\`bash
openat(AT_FDCWD, "data/config.json", ...) = -1 ENOENT
# Relative path — the program expects to run from /opt/myapp
# but was started from /home/user
getcwd(buf) = "/home/user"  # Revealed by strace
\`\`\`

**Permissions, not existence**:
\`\`\`bash
openat(AT_FDCWD, "/etc/secret.conf", O_RDONLY) = -1 EACCES (Permission denied)
# The message says "no such file" but strace shows it's EACCES
# Some apps mask the error type — strace shows the truth
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is strace and what does it trace?', a: 'strace intercepts and logs all system calls made by a process and their arguments, return values, and timing. It works by using the ptrace() kernel mechanism.' },
      { q: 'How do you attach strace to a running process?', a: 'strace -p PID attaches to the running process. Multiple PIDs: strace -p PID1 -p PID2. Requires the same UID or root. The process continues running during tracing.' },
      { q: 'How do you filter strace to show only specific syscalls?', a: 'strace -e trace=open,read,write PID shows only those syscalls. Use -e trace=file for all file-related syscalls, -e trace=network for network, -e trace=signal for signal delivery.' },
      { q: 'What does strace -T show?', a: '-T prints the time spent inside each system call in seconds. Useful for finding which syscall is causing latency -- a slow openat() or futex() stands out immediately.' },
      { q: 'What is ltrace and how does it differ from strace?', a: 'ltrace traces calls to shared library functions (libc, libssl, etc.) rather than kernel syscalls. It intercepts the PLT (procedure linkage table) entries. Use it to trace calls to malloc, printf, or OpenSSL functions.' },
      { q: 'How do you trace all child processes with strace?', a: 'strace -f follows child processes created by fork(). Without -f, only the parent is traced. strace -ff -o prefix traces each process to a separate file prefix.PID.' },
      { q: 'What does strace -c produce?', a: '-c runs the program and prints a summary table of syscall counts, total time, time per call, and error counts. Useful for identifying the most frequent or slowest syscalls at a glance.' },
      { q: 'How do you use strace to find why a program cannot open a file?', a: 'strace -e trace=openat,access,stat program 2>&1 | grep -i "path\|ENOENT\|EACCES". You see the exact path tried, the flags used, and the error returned.' },
      { q: 'What performance overhead does strace impose?', a: 'strace can slow a process by 10-100x due to the ptrace stop on every syscall. Use it on production only for short targeted traces with -e filters, then detach promptly.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man1/strace.1.html',
      'https://www.brendangregg.com/blog/2014-05-11/strace-wow-much-syscall.html',
    ],
  },
  {
    id: 'linux-lsof',
    title: 'lsof: List Open Files',
    icon: 'activity',
    color: '#f97316',
    category: 'performance',
    questions: 5,
    description: 'lsof for open files, network connections, process file descriptors, and recovering deleted files.',
    visualizations: [
      { title: 'lsof Columns & FD Types', description: 'FD types (cwd/txt/mem/0r/1w/3u), TYPE column, deleted-but-open', image: '/diagrams/linux/linux-lsof-columns.png' },
    ],
    introduction: `lsof (List Open Files) is uniquely powerful on Linux because "everything is a file" — regular files, directories, sockets, pipes, devices, and more all appear in lsof output. It's an essential tool for diagnosing resource leaks, connection issues, and deleted-file problems.

**Basic usage and filtering**:
- lsof (no args): lists ALL open files for ALL processes — massive output, always filter
- lsof -i :80: files related to port 80 (TCP and UDP listeners and connections)
- lsof -i TCP:22: specifically TCP port 22
- lsof -i 4: IPv4 only, lsof -i 6: IPv6 only
- lsof -p PID: all files opened by a specific process
- lsof +D /var/log: all files open in a directory tree (+ means recursive)
- lsof /path/to/file: which processes have a specific file open
- lsof -u username: files opened by a user
- lsof -c nginx: files opened by processes with name matching "nginx"

**FD column meanings**: cwd (current working directory), txt (program executable), mem (memory-mapped file), DEL (deleted but still open), 0 (stdin), 1 (stdout), 2 (stderr), numbers (regular file descriptors). Suffix u=read+write, r=read, w=write.

**TYPE column**: REG (regular file), DIR (directory), CHR (character device), BLK (block device), FIFO (named pipe), IPv4/IPv6 (network socket), unix (Unix domain socket), PIPE (anonymous pipe).

**Recovering deleted files**: When a process has a file open that has been deleted (unlinked), the file's inode and data remain on disk until all references are closed. The FD column shows "DEL" and the TYPE is REG. Access via /proc/PID/fd/N: cat /proc/$(pgrep myapp)/fd/5 > /tmp/recovered_file.

**Performance**: lsof with no filters is slow (iterates /proc for every process). Always filter: lsof -n (no DNS) -P (no port names) for speed.`,
    whenToUse: [
      'Finding which process is listening on a specific port',
      'Diagnosing "device busy" errors when unmounting',
      'Recovering accidentally deleted files that are still open by a process',
      'Investigating file descriptor leaks',
    ],
    keyConcepts: [
      {
        term: 'lsof -i for network',
        definition: 'lsof -i :8080 shows all processes with port 8080 open. lsof -i TCP shows all TCP sockets. lsof -i @host shows connections to/from specific host.',
      },
      {
        term: '-p for process',
        definition: 'lsof -p PID shows all files/sockets a process has open. Useful for investigating file descriptor leaks (many open files) or unexpected connections.',
      },
      {
        term: 'FD column meaning',
        definition: 'cwd=current dir, txt=executable, mem=mmap, 0-2=stdin/out/err, numbers=file descriptors. Suffix: r=read, w=write, u=read+write. DEL=deleted but still open.',
      },
      {
        term: '/proc/PID/fd recovery',
        definition: 'Deleted files still open by a process remain accessible via /proc/PID/fd/N. cat /proc/PID/fd/5 > recovered. The inode is kept until all file descriptors are closed.',
      },
    ],
    pitfalls: [
      'lsof without -n and -P is slow on busy servers — DNS lookups for every IP and port name resolution add significant delay',
      'lsof -i without root shows only your own processes — use sudo lsof -i to see all processes',
      'lsof +D on large directory trees is very slow — it recursively opens every file entry',
      'A deleted file shown by lsof does not mean disk space is freed — it won\'t be freed until the process closes it or exits',
    ],
    keyQuestions: [
      {
        question: 'A process deleted a large log file but disk space didn\'t free up. How do you find and recover it?',
        answer: `## Finding and Recovering Deleted Open Files

**Step 1: Confirm the problem**

\`\`\`bash
df -h /var/log
# /dev/sda1  100G   95G  5G  95% /

# But "deleted" files still take space:
du -sh /var/log
# 12G  /var/log  (less than df shows!)
\`\`\`

**Step 2: Find the deleted file**

\`\`\`bash
# Find files marked as deleted (DEL) that are still open
lsof | grep deleted
# Or more specifically:
lsof +L1  # Files with link count < 1 (deleted from directory)

# Output:
# nginx  12345  root  7w  REG  8,1  45000000000  12345 /var/log/nginx/access.log (deleted)
# ^PID   ^FD                        ^45GB!
\`\`\`

**Step 3: Recover the file if needed**

\`\`\`bash
# Access the deleted file via /proc
PID=12345
FD=7

# Copy the deleted file contents
cp /proc/$PID/fd/$FD /var/log/nginx/access.log.recovered

# Or just truncate it to free space (if you don't need the content)
> /proc/$PID/fd/$FD
# This truncates the file through the open file descriptor — space freed immediately!
\`\`\`

**Step 4: Permanent fix**

\`\`\`bash
# The real fix: send SIGUSR1 to nginx to reopen log files after rotation
kill -USR1 $(cat /run/nginx.pid)

# Or use logrotate with postrotate script
# logrotate already does this for properly configured services
\`\`\``,
      },
      {
        question: 'How would you find which process is listening on port 8080 without using netstat or ss?',
        answer: `## Finding Port 8080 Listener Without netstat/ss

**Method 1: lsof**

\`\`\`bash
sudo lsof -i :8080 -n -P
# COMMAND   PID     USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# java     1234     app   47u  IPv6  12345      0t0  TCP *:8080 (LISTEN)

# The process is Java with PID 1234
# More detail:
sudo lsof -i TCP:8080 -n -P -s TCP:LISTEN
\`\`\`

**Method 2: /proc filesystem directly**

\`\`\`bash
# Port 8080 in hex
printf '%04X\n' 8080
# 1F90

# Search /proc/net/tcp for this hex port in local address
grep -i "1F90" /proc/net/tcp
# sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
# 42: 00000000:1F90 00000000:0000 0A ...                                      1000       0  34567

# st=0A means LISTEN, inode=34567
# Find which PID owns this inode
find /proc/*/fd -lname 'socket:\[34567\]' 2>/dev/null
# /proc/1234/fd/47

# PID is 1234
\`\`\`

**Method 3: fuser**

\`\`\`bash
fuser 8080/tcp
# 8080/tcp:  1234  (PID)

fuser -v 8080/tcp
# Shows USER, PID, ACCESS, COMMAND
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What does lsof stand for and what does it list?', a: 'lsof stands for list open files. It lists every file descriptor held by every process, including regular files, directories, sockets, pipes, and device files.' },
      { q: 'How do you find which process has a file open?', a: 'lsof /path/to/file shows all processes with that file open. lsof +D /path/to/dir shows all open files under a directory, useful before unmounting.' },
      { q: 'How do you list all open network connections with lsof?', a: 'lsof -i shows all network file descriptors. lsof -i TCP:443 shows processes with TCP connections on port 443. lsof -i @10.0.0.1 shows connections to a specific host.' },
      { q: 'How do you find which process is listening on a port with lsof?', a: 'lsof -i :8080 -sTCP:LISTEN shows the process listening on port 8080. The -s TCP:LISTEN filter excludes established connections.' },
      { q: 'What does the FD column in lsof output mean?', a: 'FD is the file descriptor type and number. cwd is the current working directory, txt is the executable, mem is memory-mapped, and numbers (0, 1, 2, 3...) are open file descriptors.' },
      { q: 'How do you recover the contents of a deleted file that is still open?', a: 'lsof | grep deleted finds processes holding deleted files. cat /proc/PID/fd/FDN reads the data through the open descriptor before the process closes it.' },
      { q: 'How do you list all files opened by a specific process?', a: 'lsof -p PID lists every file descriptor for that process. lsof -p PID | wc -l counts total open FDs, useful for diagnosing FD leaks against ulimit -n.' },
      { q: 'What does lsof -u username show?', a: 'All files and network connections opened by processes running as that user. Useful for auditing what a service account is accessing across all its processes.' },
      { q: 'How do you continuously monitor open files with lsof?', a: 'lsof -r 2 repeats the query every 2 seconds. lsof +r 5 repeats every 5 seconds and stops when no more files match (useful for waiting for a process to release a file).' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/lsof.8.html',
      'https://www.thegeekstuff.com/2012/08/lsof-command-examples/',
    ],
  },
  {
    id: 'linux-cpu-scheduling',
    title: 'CPU Scheduling & Affinity',
    icon: 'activity',
    color: '#f97316',
    category: 'performance',
    questions: 5,
    description: 'CFS scheduler, nice/renice, ionice, taskset for CPU affinity, numactl, and real-time priorities.',
    visualizations: [
      { title: 'DevOps Roadmap', description: '10-day Linux for DevOps learning progression and skill areas', image: '/diagrams/linux/linux-devops-roadmap.png' },
    ],
    introduction: `The Linux CPU scheduler determines which process runs on which CPU at any given moment. Understanding the scheduler helps optimize performance for both latency-sensitive and throughput-oriented workloads.

**CFS (Completely Fair Scheduler)**: The default scheduler since kernel 2.6.23. CFS tracks "virtual runtime" (vruntime) for each runnable process — how much CPU time it has received, weighted by its nice value. At each scheduling decision, the process with the lowest vruntime runs next. This ensures fairness: every process gets proportional CPU time relative to its weight.

**Nice values**: Range from -20 (highest priority, gets more CPU time) to +19 (lowest priority, "background" process). Default is 0. Each nice level changes weight by about 10%. nice -n 10 ./command starts a command with nice 10. renice -n 5 -p PID changes a running process. Non-root users can only increase nice (lower priority), not decrease below their starting value.

**ionice — I/O scheduling**: Linux's I/O scheduler also supports priority classes. Class 1 (real-time): gets I/O first, time-slice based. Class 2 (best-effort): default, priority levels 0-7. Class 3 (idle): only gets I/O when no other class wants disk access — perfect for background backups and indexing. ionice -c 3 -p PID changes a running process.

**taskset — CPU affinity**: Bind a process to specific CPUs using a CPU mask or list. taskset -c 0,1 command runs on CPUs 0 and 1 only. taskset -c 0 -p PID sets affinity of running process. Reduces cache misses by keeping process on same core (hot cache). Essential for latency-sensitive applications.

**numactl**: On multi-socket servers, memory access to a remote NUMA node is slower. numactl --cpunodebind=0 --membind=0 command keeps process and its memory on NUMA node 0. numactl --hardware shows NUMA topology. numastat shows per-node memory statistics.

**Real-time scheduling**: chrt -f 99 command uses FIFO scheduling at priority 99 (highest). chrt -r 50 command uses Round-Robin at priority 50. Real-time processes preempt all normal processes. Dangerous if a bug causes a busy loop — can lock up the system. Requires CAP_SYS_NICE or root.`,
    whenToUse: [
      'Protecting latency-sensitive services from noisy neighbor processes',
      'Running background jobs (backups, reindexing) without impacting production',
      'Optimizing cache performance for CPU-intensive applications',
      'NUMA-aware placement on multi-socket servers',
    ],
    keyConcepts: [
      {
        term: 'CFS vruntime fairness',
        definition: 'CFS tracks vruntime (weighted CPU time) per process. Lowest vruntime runs next. Nice value multiplies the weight: nice -20 gets 1024 weight units, nice +19 gets 15. Proportional fair scheduling.',
      },
      {
        term: 'nice -20 to +19',
        definition: 'nice -20 = highest priority (more CPU weight). nice +19 = lowest. nice -n N cmd starts with nice N. renice -n N -p PID changes running process. Only root can go negative.',
      },
      {
        term: 'ionice classes',
        definition: 'ionice -c 1 = real-time I/O (gets disk first). ionice -c 2 = best-effort (default, priority 0-7). ionice -c 3 = idle (only when nothing else wants I/O). Use class 3 for backups.',
      },
      {
        term: 'taskset CPU affinity',
        definition: 'taskset -c 0,1 cmd — bind to CPUs 0 and 1. taskset -c 0 -p PID — change running process. Keeps hot cache on same core. Use numactl for full NUMA-aware placement.',
      },
    ],
    pitfalls: [
      'ionice class 1 (real-time I/O) can starve other processes of disk access — use class 3 (idle) for background work, not class 1',
      'taskset without NUMA awareness: binding to CPUs on a different NUMA node from the memory causes high memory latency — use numactl instead',
      'Real-time scheduling (chrt -f) with a buggy busy loop can lock up the entire system — always test in controlled environment',
      'nice only affects scheduling relative to other processes at the same real-time priority — nice has no effect on real-time scheduled processes',
    ],
    keyQuestions: [
      {
        question: 'How does the CFS scheduler ensure fairness? What role does the nice value play?',
        answer: `## CFS: Completely Fair Scheduler

**Core Mechanism: Virtual Runtime (vruntime)**

\`\`\`
Every runnable process has a vruntime counter:
vruntime increases as process consumes CPU time
vruntime is weighted by nice value
Process with LOWEST vruntime runs next
\`\`\`

**The Red-Black Tree**:

\`\`\`
CFS stores runnable processes in a red-black tree ordered by vruntime.
Leftmost node (lowest vruntime) = next to run.
O(log N) insert/delete for scheduling operations.
\`\`\`

**Nice Value and Weights**:

\`\`\`bash
# Nice values map to weights:
# nice  -20 → weight 88761 (highest)
# nice    0 → weight  1024 (default)
# nice  +19 → weight    15 (lowest)

# vruntime_delta = actual_time * (NICE_0_WEIGHT / process_weight)
# High-priority process: smaller vruntime delta per ns → runs more
# Low-priority process: larger vruntime delta per ns → runs less

# Check a process's scheduler info:
cat /proc/$(pgrep myprocess)/sched
# nr_switches    (how many times scheduled)
# se.vruntime    (current virtual runtime)
# se.load.weight (derived from nice value)
\`\`\`

**Practical Impact**:

\`\`\`bash
# Start a CPU-intensive background job at low priority
nice -n 19 ./heavy_computation.sh &

# The foreground service (nice 0) gets proportionally more CPU
# Weight ratio: 1024 / 15 ≈ 68x more CPU weight than nice +19

# Real-time work? Use chrt (bypasses CFS entirely):
chrt -f 99 ./latency-critical-service
\`\`\``,
      },
      {
        question: 'You have a latency-sensitive service and a batch job on the same server. How do you configure scheduling to protect the service?',
        answer: `## Protecting Latency-Sensitive Service from Batch Job

**Scenario**: API server (must respond < 10ms) + nightly report generation (CPU and I/O intensive)

**CPU Scheduling**:

\`\`\`bash
# Give batch job lowest CPU priority
renice -n 19 -p $(pgrep report_generator)

# Pin API server to specific CPUs (avoid interference)
# Reserve CPUs 0-3 for API server
taskset -c 0-3 -p $(pgrep api_server)

# Pin batch job to remaining CPUs
taskset -c 4-7 -p $(pgrep report_generator)

# For absolute CPU isolation (Linux kernel feature):
# Add isolcpus=4-7 to kernel cmdline to reserve CPUs from scheduler
# Then use taskset to explicitly assign processes
\`\`\`

**I/O Priority**:

\`\`\`bash
# Batch job gets I/O only when API server doesn't need it
ionice -c 3 -p $(pgrep report_generator)   # Idle class

# Ensure API server gets priority I/O
ionice -c 2 -n 0 -p $(pgrep api_server)    # Best-effort, highest priority
\`\`\`

**systemd Unit Configuration** (persistent):

\`\`\`ini
# /etc/systemd/system/report-generator.service
[Service]
Nice=19
IOSchedulingClass=idle
CPUAffinity=4-7

# /etc/systemd/system/api-server.service
[Service]
Nice=-5
IOSchedulingClass=best-effort
IOSchedulingPriority=0
CPUAffinity=0-3
CPUWeight=800   # cgroup weight, default 100
\`\`\`

\`\`\`bash
systemctl daemon-reload
systemctl restart api-server report-generator
\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the difference between the CFS and RT scheduling classes in Linux?', a: 'CFS (Completely Fair Scheduler) is the default for normal processes using time-sharing. RT (real-time) classes SCHED_FIFO and SCHED_RR preempt CFS tasks and run at fixed priorities 1-99.' },
      { q: 'What does the nice value control?', a: 'Nice values (-20 to +19) influence the CFS scheduler weight. A nice of -20 gets the most CPU time; +19 gets the least. Only root can set negative nice values.' },
      { q: 'How do you change the nice value of a running process?', a: 'renice -n 10 -p PID changes the nice value of a running process. renice requires root for negative values. Start a new process with a nice value: nice -n 15 command.' },
      { q: 'What is SCHED_FIFO and when should you use it?', a: 'SCHED_FIFO is a real-time policy where a task runs until it voluntarily yields or is preempted by a higher-priority RT task. Use for hard real-time workloads like audio processing or industrial control.' },
      { q: 'What is CPU affinity and how do you set it?', a: 'CPU affinity restricts a process to specific CPU cores. taskset -c 0,1 PID pins the process to cores 0 and 1. numactl --cpunodebind=0 pins to all cores on NUMA node 0.' },
      { q: 'What is the run queue length and how does it relate to load average?', a: 'The run queue holds threads ready to run but waiting for a CPU. Load average approximates the average run queue length. A run queue longer than the number of CPUs means threads are waiting for CPU time.' },
      { q: 'What does cgroup cpu.shares control?', a: 'cpu.shares sets the relative weight for CPU time allocation among cgroups. Default is 1024. A group with 2048 shares gets twice the CPU time of a group with 1024 when CPUs are contended.' },
      { q: 'What is the difference between cpu.shares and cpu.cfs_quota_us?', a: 'cpu.shares is a soft relative weight -- only matters when CPUs are busy. cpu.cfs_quota_us is a hard cap -- the cgroup cannot use more CPU than the quota even on an idle system.' },
      { q: 'What does chrt -f 50 command do?', a: 'Runs command with SCHED_FIFO scheduling at priority 50. Priorities 1-99 are valid; higher number means higher priority. The process will preempt all normal CFS processes.' },
      { q: 'How do you identify CPU-bound vs I/O-bound processes?', a: 'A CPU-bound process shows high %cpu in top with low %wa system-wide. An I/O-bound process shows low %cpu but high D-state in ps and contributes to high %wa in top output.' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/scheduler/sched-design-CFS.html',
      'https://man7.org/linux/man-pages/man1/taskset.1.html',
    ],
  },

  // ─── STORAGE DEEP DIVE ──────────────────────────────────────────────────
{
  id: 'linux-storage-deep-dive',
  title: 'Linux Storage',
  icon: 'hardDrive',
  color: '#d97706',
  questions: 5,
  description: `Linux storage spans the full stack from physical block devices through partition tables, filesystems, and the Virtual Filesystem Switch (VFS) to application-level syscalls. Mastery of this stack is essential for tuning databases, container runtimes, and high-throughput services where I/O is the bottleneck.`,
  visualizations: [
    {
      title: `Linux Storage Stack Architecture`,
      description: `The Linux storage stack is a layered architecture where each tier provides a clean interface to the layer above it while abstracting the hardware below.

At the top sits the application layer, where processes issue POSIX calls such as open, read, write, and fsync. These calls enter the kernel through the system call interface, where the Virtual Filesystem Switch (VFS) acts as a unified abstraction layer. VFS defines common in-memory structures: the superblock (filesystem metadata), the inode (per-file metadata), the dentry (directory-entry cache), and the file object (per-open-file state). Any conforming filesystem plugs into VFS by implementing the inode_operations and file_operations function pointer tables.

Below VFS sits the concrete filesystem layer. ext4, XFS, btrfs, and tmpfs each implement the VFS contracts differently. ext4 uses a journal (the JBD2 layer) for crash consistency. XFS uses a separate log and allocation groups to achieve high parallelism. btrfs uses copy-on-write B-trees for everything.

Below the filesystem is the block layer. The filesystem calls submit_bio to issue block I/O requests. The I/O scheduler (historically CFQ or deadline, now mq-deadline or none/kyber on NVMe) orders and merges these requests before dispatching to the device driver. Device mapper (used by LVM) and md (software RAID) insert themselves as virtual block devices at this layer, intercepting bio requests and redirecting or mirroring them.

Finally the device driver communicates with the physical hardware via controller-specific protocols (SATA AHCI, NVMe, iSCSI). The path from application write to committed bits on a platter or NAND cell traverses every one of these layers.`,
      image: `/diagrams/devops/linux-storage-deep-dive-arch.png`,
    },
    {
      title: `Write Path: from write() to Disk`,
      description: `Tracing a single write() call end-to-end reveals where latency accumulates, where data can be lost on a crash, and what each durability guarantee actually covers.

When an application calls write(), the kernel first copies bytes from userspace into a page cache page marked dirty. Control returns to the application immediately — this is the source of "buffered I/O" performance. The dirty page sits in the page cache, visible to subsequent reads, but not yet on disk. The kernel's writeback threads (pdflush / bdi-writeback) flush dirty pages to disk according to two tunables: dirty_expire_centisecs (how old a dirty page can get, default 3000 = 30 s) and dirty_ratio / dirty_background_ratio (memory pressure thresholds).

For filesystems with journaling (ext4, XFS), metadata changes are first written to the journal before being applied to the main filesystem area. In ext4 ordered mode (the default), data blocks are written to their final location before the metadata commit is written to the journal, preserving the invariant that journal-committed metadata always points to valid data. In writeback mode, metadata is journaled but data order is not guaranteed, giving higher throughput at the cost of stale-data exposure after a crash. In full journal mode, both data and metadata go through the journal, providing the strongest guarantee but roughly halving write bandwidth.

An application that cannot tolerate data loss must call fsync() or fdatasync() after writing. fsync() triggers writeback of the file's dirty pages and then issues a FLUSH CACHE command to the storage device (or an FUA-tagged write on NVMe), ensuring data survives controller power loss. O_DIRECT bypasses the page cache entirely, issuing aligned DMA transfers straight to the device, which databases like PostgreSQL and MySQL use to manage their own caching and avoid double-buffering.

The final step is the storage device itself. SSDs and NVMe drives have volatile write-back caches. Without power-loss protection (PLP) capacitors, a power failure after the kernel flushes but before the device commits to NAND can still lose data. Enterprise-grade drives carry PLP and can safely advertise completion without risk.`,
      image: `/diagrams/devops/linux-storage-deep-dive-flow.png`,
    },
  ],
  introduction: `Linux presents storage to applications through a deep software stack that begins at the physical block device and surfaces to userspace as familiar POSIX file operations. Understanding the full path — block device, partition, filesystem, VFS, page cache, syscall — is critical for any engineer who needs to reason about performance, durability, or capacity on Linux systems.

The Virtual Filesystem Switch (VFS) is the kernel's unifying abstraction. It defines a common set of in-memory objects (superblock, inode, dentry, file) and function pointer tables (inode_operations, file_operations, address_space_operations) that every filesystem must implement. This design allows ext4, XFS, btrfs, tmpfs, and network filesystems to coexist and be mounted at different points in a single directory tree without the application caring which is which.

ext4 is the default filesystem on most Linux distributions. It extended the original ext2/3 design with extents (contiguous block ranges that replace indirect-block trees, dramatically reducing metadata for large files), a journal for crash consistency via the JBD2 layer, and delayed allocation (also called allocate-on-flush) to improve contiguity. Its three journal modes trade durability for performance: ordered mode protects against metadata corruption after a crash; writeback mode maximises throughput; full data journaling provides the strongest guarantee.

XFS was designed by SGI for high-concurrency, large-file workloads. It partitions the disk into allocation groups that each have their own inode allocator and free-space B-trees, allowing multiple threads to allocate simultaneously without a global lock. XFS pioneered delayed allocation and supports reflink (shared data extents, enabling instant CoW copies), sparse files, and direct I/O for database use cases. It does not support shrinking, and its lack of data journaling makes fsync-heavy workloads depend entirely on correct barrier ordering.

btrfs brings copy-on-write semantics to the filesystem layer. Every write goes to a new location, so the old version remains intact until a transaction commits. This enables atomic snapshots (a snapshot captures the B-tree root at a point in time in microseconds), subvolumes (independent filesystem trees within one btrfs pool), online defragmentation, and checksumming of both data and metadata. The CoW design also means that fragmentation grows over time on update-heavy workloads, and the recommended use case today is read-heavy or snapshot-heavy environments rather than high-IOPS databases.

LVM, md RAID, and overlay filesystems sit between raw block devices and the filesystem layer. LVM adds logical indirection: physical volumes are pooled into a volume group, and logical volumes are carved out on demand, with online resize, snapshots, thin provisioning, and live migration (pvmove) available. md provides software RAID, with RAID 1 for pure mirroring, RAID 5/6 for parity-based redundancy, and RAID 10 for the combined throughput and redundancy sweet spot. overlayfs layers two directory trees (lower read-only, upper read-write) into a unified mount, which is the mechanism Docker uses to implement image layers and container writable layers efficiently without copying.`,
  whenToUse: [
    `Sizing and partitioning new servers where choosing between ext4, XFS, or btrfs depends on workload (sequential vs random, file sizes, snapshot requirements)`,
    `Tuning database servers (PostgreSQL, MySQL, Cassandra) to use XFS with noatime, direct I/O, and appropriate readahead settings`,
    `Designing LVM layouts for production databases where online resize, thin provisioning, and pvmove (zero-downtime disk migration) are required`,
    `Building storage-resilient clusters using mdadm RAID arrays combined with LVM on top for flexible logical volume management`,
    `Diagnosing disk-full errors where df and du disagree due to deleted-but-open file handles, reserved blocks, or sparse file accounting`,
    `Architecting Docker or Kubernetes node storage, selecting between overlayfs, devicemapper, and btrfs storage drivers and understanding their durability trade-offs`,
    `Implementing backup strategies using btrfs or LVM snapshots to provide crash-consistent point-in-time copies without stopping the application`,
    `Investigating write latency spikes on SSDs where the culprit might be journaling mode, write-back cache policies, or kernel I/O scheduler selection`,
  ],
  keyConcepts: [
    {
      term: `ext4 Journal Modes and Inode Structure`,
      definition: `ext4 is the most widely deployed Linux filesystem. Its journaling layer (JBD2) operates in three modes selected at mount time with the data= option.

In ordered mode (the default), ext4 guarantees that data blocks reach their final on-disk location before the metadata transaction that references them is committed to the journal. This prevents the post-crash scenario where metadata says a block belongs to a file but the block contains garbage from a previous file. Ordered mode does not journal data, so a crash between the data write and the metadata commit can leave the file with its old size and old data, but it cannot expose another file's data.

In writeback mode, ext4 only journals metadata. Data writes and metadata commits are independent. This is the fastest mode but means a crash can expose stale data blocks through newly committed metadata — acceptable for databases that manage their own consistency but dangerous for general-purpose use.

In journal mode (data=journal), both data and metadata are written to the journal before being applied to the main filesystem. This gives the strongest durability guarantee but roughly halves write throughput because every write goes to disk twice.

ext4 stores file data location using extents rather than the block-pointer tree of ext2/3. An extent is a (logical_block, physical_block, length) triple. Up to four extents fit directly in the inode, covering contiguous files up to about 512 MB with zero indirection. Larger files use an extent tree. This design dramatically reduces metadata for large sequential files compared to the triple-indirect block maps of ext3.

\`\`\`bash
# check journal mode of a mounted ext4 filesystem
tune2fs -l /dev/sda1 | grep "Default mount options"

# mount with writeback mode for a database data directory
mount -o data=writeback,noatime,barrier=0 /dev/sda1 /var/lib/mysql

# inspect inode and extent info for a file
debugfs -R "stat /var/lib/mysql/ibdata1" /dev/sda1

# check inode usage (ext4 has a fixed inode table)
df -i /var/lib/mysql
\`\`\`

A critical operational fact: ext4 reserves 5% of disk space for the root user by default. On a data volume this is wasted capacity. Set it to 1% or 0% with tune2fs -m.`,
    },
    {
      term: `XFS Allocation Groups and Delayed Allocation`,
      definition: `XFS divides the filesystem into allocation groups (AGs). Each AG is a self-contained region of the disk with its own inode B-tree, free-space B-trees (one indexed by offset, one by size), and free inode B-tree. Because each AG is independent, multiple threads can allocate files simultaneously without a global lock, making XFS scale linearly with CPU count on multi-threaded create-heavy workloads.

Delayed allocation (also called allocate-on-flush or delalloc) means XFS does not assign real disk blocks to a write until writeback time. When an application writes, XFS marks the range as "delayed" and tracks it in an in-memory extent map. At writeback the allocator sees the full contiguous region to be written and can find the best physical placement, improving spatial locality compared to allocating one block at a time. The trade-off is that file size reported by stat may be larger than allocated space until flush.

XFS supports reflink, which lets two files share the same underlying data extents (like hard links but at the block level). A copy operation using cp --reflink=always completes in milliseconds regardless of file size. The first write to a shared extent triggers a copy-on-write split. This is used by btrfs-style snapshot workflows on XFS (since Linux 4.9).

Direct I/O bypasses the page cache and issues DMA transfers directly to/from user buffers. XFS handles direct I/O particularly well because its allocation group parallelism means concurrent O_DIRECT writes from multiple threads do not serialize on a single allocator lock. PostgreSQL, MySQL InnoDB, and Cassandra all default to or recommend direct I/O on XFS.

\`\`\`bash
# create an XFS filesystem with a specific allocation group size
mkfs.xfs -d agcount=16 /dev/sdb

# mount with noatime and allocsize hint for large sequential writes
mount -o noatime,allocsize=256m /dev/sdb /data

# show allocation group info
xfs_info /data

# defragment a file (XFS defrag rewrites extents for better locality)
xfs_fsr /data/bigfile

# reflink copy (instant, CoW)
cp --reflink=always /data/src/large.tar /data/dst/large.tar

# check fragmentation
xfs_db -c frag -r /dev/sdb
\`\`\`

XFS cannot be shrunk online — plan the initial size carefully. It can be grown online with xfs_growfs after expanding the underlying block device.`,
    },
    {
      term: `btrfs Copy-on-Write, Subvolumes, and Snapshots`,
      definition: `btrfs uses copy-on-write (CoW) for all writes. Rather than overwriting an existing block, btrfs writes the new data to a free location and updates the B-tree that maps logical addresses to physical addresses. The old block is freed only after the transaction commits. This design makes every write atomic at the filesystem level and enables instant snapshots.

A snapshot in btrfs is just a new subvolume whose root B-tree node is a reference to the same root as the source subvolume at the moment of the snapshot. No data is copied. The two subvolumes share extents; a write to either triggers CoW, allocating new space only for the changed blocks.

Subvolumes are independently mountable filesystem subtrees within one btrfs pool. Common layouts use a top-level subvolume named @ for the root filesystem and a subvolume @home for /home, allowing the root to be rolled back (by making @ point to a snapshot) without touching home data.

\`\`\`bash
# create a btrfs filesystem spanning two devices (RAID 1 metadata, single data)
mkfs.btrfs -m raid1 -d single /dev/sdb /dev/sdc

# create a subvolume
btrfs subvolume create /mnt/btrfs/@

# create a read-only snapshot (useful for backups)
btrfs subvolume snapshot -r /mnt/btrfs/@ /mnt/btrfs/@snapshots/2026-06-17

# list subvolumes
btrfs subvolume list /mnt/btrfs

# send a snapshot incrementally to another host
btrfs send -p /mnt/btrfs/@snapshots/2026-06-16 /mnt/btrfs/@snapshots/2026-06-17 \
  | ssh backup-host btrfs receive /backup/btrfs

# check filesystem usage (CoW means du and df diverge heavily)
btrfs filesystem df /mnt/btrfs
btrfs filesystem usage /mnt/btrfs
\`\`\`

The main operational hazard with btrfs is CoW fragmentation on database-style random-update workloads. Every small random write creates a new extent, scattering data across the disk. For databases, mount with nodatacow (disables checksumming and CoW for that file) or use a separate non-btrfs volume.`,
    },
    {
      term: `LVM: Physical Volumes, Volume Groups, Logical Volumes, and Thin Provisioning`,
      definition: `LVM inserts a logical indirection layer between block devices and filesystems. A physical volume (PV) is a block device (or partition) initialized for LVM use. Multiple PVs are pooled into a volume group (VG), which maintains a mapping of 4 MB physical extents (PEs) across all member PVs. Logical volumes (LVs) are carved from the VG's PE pool and appear to the OS as regular block devices on which you format a filesystem.

Thin provisioning allows LVs to be created larger than the actual available storage. A thin pool LV holds the actual data; thin LVs are virtual volumes that allocate real space on demand. This enables over-commitment: a VG with 100 GB can host five 50 GB thin LVs if average utilization is low. The risk is that if thin LVs collectively write more data than the pool holds, the pool runs out of space and thin LVs go into error state.

pvmove migrates extents from one PV to another while the filesystem remains mounted and the system stays online. This is used to drain a disk before replacement without downtime.

\`\`\`bash
# initialize disks as PVs and create a VG
pvcreate /dev/sdb /dev/sdc
vgcreate vg_data /dev/sdb /dev/sdc

# create a standard LV and format it
lvcreate -L 200G -n lv_pgdata vg_data
mkfs.xfs /dev/vg_data/lv_pgdata

# extend an LV and grow the filesystem online
lvextend -L +50G /dev/vg_data/lv_pgdata
xfs_growfs /var/lib/postgresql

# create a thin pool and thin LVs
lvcreate -L 100G --thinpool tp_pool vg_data
lvcreate -V 50G --thin -n lv_app1 vg_data/tp_pool
lvcreate -V 50G --thin -n lv_app2 vg_data/tp_pool

# monitor thin pool usage (watch for >80% to avoid outage)
lvs -o lv_name,lv_size,data_percent,metadata_percent vg_data

# migrate extents off a failing disk (online, zero downtime)
pvmove /dev/sdb /dev/sdd

# create an LVM snapshot (CoW, traditional thick snapshot)
lvcreate -L 10G -s -n lv_pgdata_snap /dev/vg_data/lv_pgdata
\`\`\`

A key pitfall is forgetting to set up automatic thin pool extension. Add thin_pool_autoextend_threshold = 80 and thin_pool_autoextend_percent = 20 in /etc/lvm/lvm.conf and enable lvm2-monitor.service so the pool grows automatically before hitting 100%.`,
    },
    {
      term: `mdadm Software RAID`,
      definition: `mdadm creates software RAID arrays from block devices managed by the Linux kernel's md (multiple devices) layer. The md layer sits below the filesystem and above device drivers, presenting a virtual block device to the filesystem. RAID is implemented entirely in kernel code, making it portable across hardware controllers.

RAID 0 stripes data across N disks with no redundancy. Read and write throughput scale with N but a single disk failure destroys the array. RAID 1 mirrors data to N disks; reads can be parallelized across mirrors, but write throughput is limited by the slowest member. RAID 5 uses N-1 disks for data and one parity stripe distributed across all disks; it survives one disk failure. RAID 6 uses two independent parity schemes and survives two simultaneous disk failures at the cost of two disks' worth of overhead. RAID 10 (1+0) stripes across mirrored pairs, combining RAID 1 redundancy with RAID 0 throughput — the most common production choice for database servers.

\`\`\`bash
# create a RAID 10 array from four disks
mdadm --create /dev/md0 --level=10 --raid-devices=4 /dev/sd{b,c,d,e}

# check array status
cat /proc/mdstat
mdadm --detail /dev/md0

# save the RAID config so it survives reboot
mdadm --detail --scan >> /etc/mdadm/mdadm.conf
update-initramfs -u   # Debian/Ubuntu

# simulate a disk failure and replace it
mdadm --fail /dev/md0 /dev/sdb
mdadm --remove /dev/md0 /dev/sdb
mdadm --add /dev/md0 /dev/sdf   # new disk — resync starts automatically

# set read policy (round-robin reads from mirrors)
echo 2 > /sys/block/md0/md/stripe_cache_size   # adjust stripe cache
mdadm --grow /dev/md0 --bitmap=internal         # add write-intent bitmap (faster resync)
\`\`\`

The write-intent bitmap (--bitmap=internal) records which stripes are being written. After a crash, only the stripes marked dirty need resyncing rather than the full array, dramatically reducing recovery time. Without it, a resync of a 4-disk RAID 10 array with 10 TB of data can take hours.`,
    },
    {
      term: `overlayfs, bind mounts, and tmpfs`,
      definition: `overlayfs is a union filesystem that merges two directory trees: a read-only lower layer and a read-write upper layer. Reads are served from upper if the file exists there, otherwise from lower. Writes create new files or modified copies in upper (the copy-up operation). A workdir directory (on the same filesystem as upper) is used for atomic copy-up staging. The merged view is presented at the mount point.

Docker uses overlayfs2 as its default storage driver. Each image layer maps to a lower directory. The running container adds an upper directory and a workdir. When the container writes to a file that exists in a lower layer, overlayfs copies the entire file to upper first (copy-up), then applies the write. This means the first write to a large file has latency proportional to the file size. Volumes (bind mounts or named volumes) bypass overlayfs entirely by mounting real host paths into the container, making them suitable for databases and any state that must survive container restarts.

A bind mount re-exposes a directory (or file) from one location in the VFS tree to another without creating a new filesystem. It is the mechanism behind Kubernetes hostPath volumes and Docker -v /host/path:/container/path.

tmpfs is an in-memory filesystem backed by anonymous memory and swap. It is used for /dev/shm (POSIX shared memory), /tmp on many modern systemd distros, and Kubernetes emptyDir volumes with medium: Memory. Because tmpfs data lives in RAM, it disappears on umount or reboot.

\`\`\`bash
# manual overlayfs mount (useful for understanding Docker internals)
mkdir -p /overlay/{lower,upper,work,merged}
echo "base content" > /overlay/lower/file.txt
mount -t overlay overlay \
  -o lowerdir=/overlay/lower,upperdir=/overlay/upper,workdir=/overlay/work \
  /overlay/merged

# bind mount a host directory into a container path
mount --bind /data/postgres /var/lib/postgresql/data

# make a bind mount read-only
mount --bind /etc/certs /run/secrets
mount -o remount,ro,bind /run/secrets

# tmpfs for shared memory with size limit
mount -t tmpfs -o size=512m tmpfs /dev/shm

# inspect what Docker overlayfs layers look like
docker inspect <container_id> | grep -A 10 GraphDriver
ls /var/lib/docker/overlay2/<layer_id>/diff
\`\`\`

overlayfs copy-up is a well-known performance gotcha for containers that modify large files (log rotation, SQLite databases, etc.). The solution is always to mount those paths as volumes, keeping hot write paths off the overlay stack.`,
    },
    {
      term: `/etc/fstab Options, UUIDs, and Mount Flags`,
      definition: `The /etc/fstab file defines how block devices are mounted at boot. Each line specifies the device, mount point, filesystem type, options, dump flag, and fsck pass order.

Using UUIDs instead of device names (/dev/sdb1) prevents breakage when disk enumeration order changes after adding hardware or rebooting after a kernel update. The UUID is stable across renames.

Key mount options that affect performance and durability:

noatime disables updating the access-time inode field on every read. On spinning disks this eliminates an extra write per read. For most workloads (databases, web servers) access time is irrelevant and noatime is a safe default. relatime (the kernel default since 2.6.30) is a compromise that updates atime only when it is older than mtime, avoiding most writes while remaining POSIX-compliant for applications that depend on atime ordering.

barrier controls whether the filesystem issues write barriers (cache flush commands) to enforce ordering between journal commit and data writes. On drives with reliable write-back caches and power-loss protection, barrier=0 can improve throughput. On consumer drives without PLP, disabling barriers risks corruption after a power failure.

nofail tells the kernel to continue booting even if the device is absent — essential for secondary data disks that should not prevent the system from starting.

\`\`\`bash
# find UUID for a block device
blkid /dev/sdb1
lsblk -o NAME,UUID,FSTYPE,MOUNTPOINT

# example /etc/fstab entries
# system root with relatime (kernel default)
UUID=a1b2c3d4-...  /              ext4  defaults,relatime     0 1

# XFS data volume for a database, noatime, no barriers (enterprise SSD with PLP)
UUID=e5f6a7b8-...  /var/lib/pgsql xfs   noatime,barrier=0     0 2

# tmpfs for /tmp, limited to 1 GB
tmpfs              /tmp           tmpfs size=1g,mode=1777    0 0

# bind mount (must use bind option)
/data/shared       /var/www/html  none  bind                  0 0

# NFS with nofail so boot continues if NAS is unreachable
nas:/exports/data  /mnt/nas       nfs   defaults,nofail,_netdev 0 0

# verify fstab without rebooting (mount all entries not yet mounted)
mount -a
systemctl daemon-reload   # for systemd-aware mount units
\`\`\`yaml

Always run mount -a after editing fstab to catch syntax errors before the next reboot. A typo in fstab can drop a server into emergency mode.`,
    },
  ],
  approach: [
    `Choose the filesystem based on workload: XFS for large files, high-concurrency, or database servers; ext4 for general-purpose workloads where inode count is a concern; btrfs where snapshots and subvolumes are the primary requirement; tmpfs for ephemeral in-memory scratch space.`,
    `Always mount database data directories with noatime and, on hardware with verified power-loss protection, barrier=0 to eliminate unnecessary cache-flush round-trips without sacrificing durability.`,
    `Use UUIDs in /etc/fstab instead of device names to prevent mount failures after disk re-enumeration; verify with mount -a after every edit before relying on the next reboot.`,
    `Place LVM thin pools under lvm2-monitor.service with autoextend thresholds configured at 80% so pools grow automatically before reaching 100% and pushing thin LVs into error state.`,
    `Add a write-intent bitmap (mdadm --bitmap=internal) to all software RAID arrays so that post-crash resync reads and rewrites only the stripes that were in-flight at the time of the crash rather than rebuilding the full array.`,
    `Reserve overlayfs (Docker storage driver) only for image layers and ephemeral container state; mount all database files, log directories, and any state that must survive container restart as named volumes or bind mounts to keep writes off the overlay stack and avoid copy-up latency.`,
    `Monitor thin pool and RAID resync progress separately from filesystem-level capacity; use lvs -o data_percent for thin pools and cat /proc/mdstat for RAID so alerts fire before capacity or redundancy is lost.`,
    `When using LVM over software RAID, put LVM on top of md (LVM PV on /dev/md0) rather than md on top of LVM; the md layer needs direct block device alignment information, and wrapping it in LVM first can misalign stripes.`,
  ],
  pitfalls: [
    `Disabling barriers on consumer SSDs or HDDs without power-loss protection: barrier=0 tells the filesystem it can skip cache flush commands, but if the drive's write-back cache is volatile and power fails between a journal commit write and the subsequent data write, the filesystem can be left in an inconsistent state that requires fsck and may involve data loss.`,
    `Letting LVM thin pools reach 100% utilization: when the pool is full, all thin LVs that depend on it transition to an error state simultaneously, causing every filesystem on those LVs to go read-only or emit I/O errors. Set autoextend at 80% and alert at 85%.`,
    `Forgetting that ext4 reserves 5% of disk space for root by default on data volumes: a 2 TB database volume loses 100 GB to reserved blocks that the database process (running as postgres, not root) cannot use; set tune2fs -m 1 at format time.`,
    `Using btrfs for write-intensive random-update workloads (databases, message queues): CoW means every random write allocates a new extent, fragments the free-space B-tree, and leaves dead extents until the background cleaner runs. Performance degrades over months and may require a filesystem balance operation that pauses write I/O.`,
    `Confusing df output with actual file content size: df reports filesystem-level block allocation, which includes reserved blocks, sparse file holes counted as allocated, and blocks belonging to deleted files whose file descriptors are still open. du reports the disk usage of directory trees, which misses the open-descriptor case. A process holding an open file descriptor to a deleted multi-GB log file keeps the blocks allocated until the fd is closed.`,
    `Running out of inodes on ext4 while disk space remains: ext4 pre-allocates a fixed inode table at format time (default one inode per 16 KB of capacity). Workloads that create millions of small files (email servers, object stores, package repositories) can exhaust inodes with gigabytes of disk still free. Set mkfs.ext4 -i 4096 (one inode per 4 KB) for small-file workloads, or use XFS which allocates inodes dynamically.`,
    `Nested virtualization of storage layers adding latency without benefit: stacking LVM on top of LVM, or btrfs on top of LVM on top of md, multiplies the metadata write amplification and makes I/O paths harder to reason about. Keep the stack shallow: md (if RAID needed) then LVM (if LV management needed) then one filesystem.`,
    `Not aligning partitions and RAID stripes to the underlying erase-block size: HDDs need 4K alignment; SSDs with 4 KB logical sectors need 4K alignment; RAID 5/6 with 256 KB chunk size benefits from volume-group alignment to 256 KB so RAID stripes land on chunk boundaries. Misalignment causes write amplification on SSDs and read-modify-write penalties on HDDs in parity RAID.`,
  ],
  keyQuestions: [
    {
      question: `Walk me through the full path of a write() system call from the application to the physical disk, including where data can be lost on a crash at each step.`,
      answer: `The journey begins in userspace. The application calls write(fd, buf, len), which crosses into the kernel via the system call interface. The kernel's VFS layer looks up the file's address_space object and calls the filesystem's write_begin / write_end page-cache operations.

The data is copied from the user buffer into one or more page cache pages, which are marked dirty. At this point write() returns to the application. The data is now in RAM but not on disk. A power failure here loses the write unless the application has been told otherwise.

The kernel's writeback subsystem (bdi-writeback kthreads per block device) periodically walks the dirty page list and submits write bios to the block layer. Two tunables govern this: vm.dirty_expire_centisecs (default 3000 = 30 s, maximum age before a page must be flushed) and vm.dirty_background_ratio / vm.dirty_ratio (memory pressure thresholds). A crash during this window, before writeback, loses the write.

For journaled filesystems (ext4 in ordered mode, which is the default): before the filesystem writes the metadata transaction (inode size update, extent map entry) to the journal, it first ensures all data blocks for that transaction have been written to their final on-disk locations. Once the metadata commit record lands in the journal, a crash and replay are safe — the journal commit is redone and metadata points to valid data. But the window between the application's write() return and the journal commit is still a loss window.

If the application calls fsync(fd) after writing, the kernel flushes all dirty pages belonging to the file, then issues a write barrier or FLUSH CACHE command to the block device. This command forces the device's volatile write-back cache to commit to persistent media before signaling completion. After fsync() returns, the data survives a power failure assuming the storage device honors the barrier (which enterprise drives with power-loss protection capacitors do; consumer drives sometimes lie).

O_DIRECT bypasses the page cache entirely. The application's buffer must be aligned to the logical block size. Reads and writes go directly to the device via DMA. There is no writeback delay, but there is also no read caching. Databases use O_DIRECT to manage their own buffer pool and ensure that fsync() semantics are predictable.

\`\`\`bash
# check current dirty page thresholds
sysctl vm.dirty_expire_centisecs vm.dirty_background_ratio vm.dirty_ratio

# open a file with O_DIRECT (application-level, shown in C-like pseudocode)
# int fd = open("/data/pg/base/16384/1259", O_RDWR | O_DIRECT);

# force all dirty pages for all files to disk
sync

# force journal commit on ext4 (flushes journal to disk, then checkpoints)
# mount option: sync forces per-write sync; for testing:
echo 3 > /proc/sys/vm/drop_caches   # not for production, educational only
\`\`\`

The short answer for an interview: write() puts data in the page cache and returns. Writeback moves it to the journal or directly to disk. fsync issues a device flush. Each step is a potential loss boundary.`,
    },
    {
      question: `When would you choose XFS over ext4 for a database server, and what specific mount and filesystem options would you configure?`,
      answer: `XFS is the better choice for a database server in several concrete scenarios:

First, when the database creates many concurrent write streams. PostgreSQL WAL writes, checkpoint writes, and backend heap writes can all proceed simultaneously. XFS allocation groups each have an independent free-space allocator and inode table, so ten concurrent allocating threads can proceed in parallel. ext4 serializes allocation through a single journal transaction, so concurrent allocations queue behind each other.

Second, for large databases with large files. XFS handles files in the tens or hundreds of gigabytes efficiently using its B-tree extent map. ext4 also uses extents, but XFS was designed from the ground up for large-file performance and shows measurably lower fragmentation on heavy-append workloads.

Third, when online capacity growth is required. XFS supports online filesystem expansion (xfs_growfs after lvextend). It cannot shrink, but databases almost never need to shrink a live filesystem.

Fourth, for workloads using direct I/O. PostgreSQL and MySQL InnoDB use O_DIRECT to bypass the page cache. XFS + direct I/O is a well-tested and recommended combination in production database deployments.

Recommended configuration:

\`\`\`bash
# format with default (inode size 512, sunit/swidth matching RAID or LVM stripe)
# assume LVM stripe size 512K across 4 disks (sunit=512K/512=1024, swidth=1024*4=4096)
mkfs.xfs -d su=512k,sw=4 /dev/vg_data/lv_pgdata

# /etc/fstab entry for a PostgreSQL data directory
UUID=<uuid>  /var/lib/postgresql  xfs  noatime,nobarrier,allocsize=64m,inode64  0 2

# noatime: skip access-time writes on every read
# nobarrier: safe only on enterprise SSD with power-loss protection
# allocsize=64m: hint the allocator to reserve 64 MB chunks for pre-allocation
# inode64: allow inodes to be placed anywhere on disk (not just the first 1 TB)

# after mounting, set readahead for the block device
blockdev --setra 256 /dev/vg_data/lv_pgdata   # 128 KB readahead

# PostgreSQL postgresql.conf for XFS + direct I/O
# wal_sync_method = fdatasync
# wal_level = replica
# checkpoint_completion_target = 0.9
\`\`\`

The one trade-off: XFS has no data journaling. If the server loses power between a data write and the metadata commit, fsync-careful applications like PostgreSQL are safe because they control their own fsync discipline. For applications that do not use fsync consistently, ext4 in ordered mode provides an extra safety net at a small throughput cost.`,
    },
    {
      question: `What are the risks of LVM thin provisioning in production, and how do you mitigate them?`,
      answer: `LVM thin provisioning is powerful but carries three primary production risks that have caused real outages.

The first and most serious risk is pool exhaustion. When a thin pool reaches 100% utilization, every thin LV backed by that pool simultaneously enters an error state. The kernel returns I/O errors to all filesystems on those LVs, causing databases to crash, applications to log-fail, and filesystems to remount read-only. Unlike running out of space on a regular LV (where only that LV's filesystem fills), a pool exhaustion event is a cascading failure affecting all tenants of the pool simultaneously.

Mitigation: configure automatic pool extension in lvm.conf (thin_pool_autoextend_threshold = 80, thin_pool_autoextend_percent = 20), enable lvm2-monitor.service, and set up alerts at 75% pool usage so you have time to add capacity before autoextend triggers.

\`\`\`bash
# check thin pool usage
lvs -o lv_name,lv_size,data_percent,metadata_percent vg_data

# manually extend the thin pool if autoextend is not set up
lvextend -L +50G /dev/vg_data/tp_pool

# check lvm.conf thin pool settings
grep -A 5 "thin_pool_autoextend" /etc/lvm/lvm.conf

# enable and verify lvm2-monitor
systemctl enable --now lvm2-monitor.service
systemctl status lvm2-monitor.service
\`\`\`

The second risk is metadata exhaustion. The thin pool stores a metadata LV alongside the data LV. The metadata LV tracks the mapping of virtual extents to physical extents for every thin LV. Heavy snapshot churn or millions of small writes can exhaust metadata even when data space remains. The default metadata LV size is often too small. Specify it explicitly at creation.

\`\`\`bash
# create a thin pool with an explicit, generous metadata size
lvcreate -L 200G --poolmetadatasize 2G --thinpool tp_pool vg_data
\`\`\`

The third risk is snapshot accumulation debt. Each thin LV snapshot holds divergent data separately from the origin. If many snapshots accumulate without being removed, the pool fills with snapshot delta data. A single large write to the origin LV may trigger copy-on-write for multiple snapshot extents simultaneously, causing write amplification proportional to the number of live snapshots.

Mitigation: implement a snapshot rotation policy. Keep no more than 5-10 snapshots per thin LV and automate deletion. Monitor per-snapshot delta size with lvs -o snap_percent.

In summary: never deploy thin provisioning without autoextend configured, metadata pre-sized generously, and active monitoring on data_percent. Treat a thin pool at 80% as an immediate on-call event.`,
    },
    {
      question: `How does overlayfs work, and how does Docker use it to implement image layers and container storage?`,
      answer: `overlayfs is a Linux union filesystem that presents a merged view of two or more directory trees without copying files. It works by stacking a read-write upper directory on top of one or more read-only lower directories. When the kernel resolves a path in the merged view, it checks upper first, then lower. Reads are transparent. Writes use a copy-up mechanism: the first time a process writes to a file that exists only in lower, overlayfs atomically copies the entire file to upper (using a staging workdir for atomicity), then applies the write to the upper copy. Subsequent writes to the same file go directly to upper without another copy-up.

Docker's overlayfs2 driver maps this mechanism onto image and container storage as follows:

An image is a stack of read-only layers. Each layer corresponds to a Dockerfile instruction that changed the filesystem (RUN, COPY, ADD). The layer is stored as a directory in /var/lib/docker/overlay2/<layer-id>/diff. When Docker constructs a merged view for a container, it passes all image layers as the lowerdir list (overlayfs supports multiple lower layers since Linux 4.0, which is what the "2" in overlayfs2 signifies).

When a container is created, Docker adds one more directory as upperdir (the container's writable layer) and a workdir for copy-up staging. The merged mount is the root filesystem the container processes see.

\`\`\`bash
# inspect a running container's overlay configuration
docker inspect <container_id> --format '{{json .GraphDriver}}' | python3 -m json.tool

# output shows something like:
# "Data": {
#   "LowerDir": "/var/lib/docker/overlay2/<id-n>/diff:...:<id-1>/diff",
#   "MergedDir": "/var/lib/docker/overlay2/<container-id>/merged",
#   "UpperDir":  "/var/lib/docker/overlay2/<container-id>/diff",
#   "WorkDir":   "/var/lib/docker/overlay2/<container-id>/work"
# }

# look at the upper (writable) layer contents for a running container
ls /var/lib/docker/overlay2/<container-id>/diff/

# understand copy-up cost: writing to a large file in a lower layer
# copies the entire file to upper before the write proceeds
# solution: mount the file as a volume to bypass overlayfs
docker run -v /host/data:/var/lib/mysql mysql:8

# kernel-level mount syntax (for understanding, not production)
mount -t overlay overlay \
  -o lowerdir=/layer3/diff:/layer2/diff:/layer1/diff,\
upperdir=/container/diff,workdir=/container/work \
  /container/merged
\`\`\`

Key performance implication: copy-up is triggered once per file per container lifetime. For small files the cost is negligible. For multi-GB files (database data files, large binaries), copy-up blocks the writing process for the duration of the file copy. This is why all database documentation for Docker instructs you to use named volumes or bind mounts — not because overlayfs cannot store the data, but because the first write to any file in a lower layer will cause a full-file copy before the write proceeds.

Container layers also do not survive container removal by default. Named volumes, by contrast, are managed by Docker's volume subsystem and persist independently of container lifecycle.`,
    },
    {
      question: `Why might df and du report different values for the same directory, and how do you diagnose and resolve each cause?`,
      answer: `df and du measure fundamentally different things. df asks the filesystem how many blocks are allocated and how many are free, using the statfs() syscall. du walks the directory tree using stat() on each file and sums the block counts the kernel reports. The two can diverge for several distinct reasons.

The most common production cause is deleted files with open file descriptors. When a process deletes a file (unlink()), the kernel removes the directory entry and marks the inode for reuse, but the blocks are not freed until every open file descriptor referring to that inode is closed. A log rotation script may delete a 10 GB log file that is still open by the application. df sees 10 GB of "used" space; du does not see the deleted file because it walks the directory tree and the file is no longer in any directory.

\`\`\`bash
# find processes holding open file descriptors to deleted files
lsof +L1 /var/log
# output shows files with link count 0 — these are deleted but still open

# restart the process or truncate in place (> /var/log/app.log) to free blocks immediately
# for systemd services:
systemctl restart myapp

# if you cannot restart, you can truncate the fd from outside the process
# (only frees data, inode stays open — a workaround, not a fix)
# find the fd path from lsof output, e.g. /proc/1234/fd/5
truncate -s 0 /proc/1234/fd/5
\`\`\`

The second cause is filesystem reserved blocks. ext4 reserves 5% of total disk space for the root user by default. df reports these as "used" in the context of available space to non-root users, but du never counts them because they are not assigned to any file.

\`\`\`bash
# check reserved block percentage
tune2fs -l /dev/sda1 | grep "Reserved block count"
# reduce reserved blocks on a data volume (not the root filesystem)
tune2fs -m 1 /dev/sda1
\`\`\`

The third cause is sparse files. A sparse file has "holes" — ranges of zeroes that are not actually stored on disk. du --apparent-size reports the logical size; du (without --apparent-size) reports actual disk blocks consumed. df reports allocated blocks.

\`\`\`bash
# create and inspect a sparse file
dd if=/dev/zero of=/tmp/sparse.img bs=1 count=0 seek=1G
ls -lh /tmp/sparse.img   # shows 1 GB apparent size
du -h /tmp/sparse.img    # shows nearly 0 actual usage
du --apparent-size -h /tmp/sparse.img  # shows 1 GB
\`\`\`yaml

The fourth cause is btrfs or snapshotted filesystems. btrfs filesystem df / btrfs filesystem usage shows actual CoW allocation including shared extents across subvolumes and snapshots, which can differ from both df and du significantly because shared extents are counted by both subvolumes but physically stored once.

The diagnostic flowchart: first run lsof +L1 to rule out deleted open files (this is the cause in at least half of production disk-full mysteries). Then check tune2fs -l for reserved blocks. Then consider sparse files and snapshot overhead.`,
    },
  ],
  references: [
    'https://www.kernel.org/doc/html/latest/filesystems/ext4/index.html',
    'https://xfs.wiki.kernel.org/',
    'https://btrfs.readthedocs.io/en/latest/',
    'https://www.sourceware.org/lvm2/',
    'https://raid.wiki.kernel.org/index.php/Linux_Raid',
    'https://www.kernel.org/doc/html/latest/filesystems/overlayfs.html',
    'https://www.kernel.org/doc/html/latest/admin-guide/devices.html',
    'https://man7.org/linux/man-pages/man8/tune2fs.8.html',
    'https://man7.org/linux/man-pages/man8/xfs_info.8.html',
    'https://man7.org/linux/man-pages/man8/mdadm.8.html',
    'https://www.postgresql.org/docs/current/storage.html',
    'https://docs.docker.com/storage/storagedriver/overlayfs-driver/',
  ],
},

  // ─── NETWORKING DEEP DIVE ───────────────────────────────────────────────
{
  id: 'linux-networking-l2l3',
  title: 'Linux Networking L2 and L3',
  icon: 'network',
  color: '#0891b2',
  questions: 5,
  description: `Linux networking spans two foundational OSI layers: Layer 2 handles Ethernet framing, MAC addressing, ARP, and bridging, while Layer 3 handles IP routing, policy rules, and the netfilter subsystem that powers iptables and container networking.`,
  visualizations: [
    {
      title: `Linux Network Stack: Layers, Namespaces, and Netfilter`,
      description: `This diagram illustrates the full Linux networking stack from a containerized workload to the physical NIC. At the bottom sits the physical or virtual NIC, above which the kernel network device layer exposes named interfaces. The netfilter framework hooks into the kernel at five well-defined points: PREROUTING intercepts every inbound packet before the routing decision, INPUT delivers locally destined packets to socket buffers, FORWARD passes transit packets between interfaces, OUTPUT catches locally generated packets after the routing decision, and POSTROUTING runs on every outgoing packet just before it leaves an interface.

Each hook is visited by four built-in tables in a fixed priority order. The raw table runs first and is used to exempt flows from connection tracking. The mangle table follows and allows packet field modification such as ToS and TTL changes. The nat table runs next and is responsible for DNAT in PREROUTING and SNAT or MASQUERADE in POSTROUTING. The filter table runs last and is the default location for ACCEPT and DROP rules.

Container networking introduces Linux network namespaces. Each namespace owns its own routing table, interface list, ARP cache, and netfilter rule set. Docker creates a veth pair for each container: one end lives inside the container namespace as eth0, and the other end lives in the root namespace with a generated name such as vethXXXXXX. Both ends are connected at Layer 2. The host-side veth is enslaved to the docker0 Linux bridge, which acts as a virtual Layer 2 switch. The bridge has an IP address (typically 172.17.0.1) which is the default gateway for all containers on that bridge.

Packets leaving a container travel from the container eth0, across the veth pair kernel boundary, onto the docker0 bridge, then through the root namespace routing table, through POSTROUTING where MASQUERADE rewrites the source IP to the host's outbound interface address, and finally onto the physical NIC. The return path reverses this sequence, with PREROUTING DNAT restoring the original destination and connection tracking matching replies to their originating flows.`,
      image: `/diagrams/devops/linux-networking-l2l3-arch.png`,
    },
    {
      title: `CNI Plugin Contract and Docker Bridge End-to-End Flow`,
      description: `This diagram traces a single TCP SYN packet from a Kubernetes pod through the CNI bridge plugin, across a veth pair, through every netfilter chain in the host namespace, through NAT, and out to the internet, then maps the return path.

The CNI interface is invoked by the container runtime (kubelet calling containerd or CRI-O) at pod creation time. The runtime executes the CNI binary found on disk (for example /opt/cni/bin/bridge), passes a JSON configuration blob on stdin, and sets environment variables: CNI_COMMAND is ADD, DEL, or CHECK; CNI_NETNS is the path to the network namespace file such as /proc/12345/ns/net; CNI_IFNAME is the desired interface name inside the namespace; CNI_CONTAINERID is an opaque identifier; and CNI_PATH lists directories to search for chained plugins.

The bridge CNI plugin reads the stdin config, creates the veth pair, moves one end into the pod namespace and renames it to eth0, enslaves the host-side veth to the specified bridge, and calls the IPAM delegate plugin (commonly host-local) to allocate an IP from a subnet range stored on disk. The IPAM plugin writes results back to the bridge plugin as JSON, which in turn emits the full CNI result JSON to stdout. The runtime reads stdout to learn the assigned IP and routes.

The packet flow on egress is: pod eth0 to veth peer in root namespace to bridge to ip_forward kernel flag to FORWARD chain filter rules to POSTROUTING MASQUERADE rule rewrites src IP to eth0 of host to physical NIC to internet. On ingress a reply arrives at the physical NIC, passes PREROUTING (no DNAT needed for established connections because conntrack handles it), matches the FORWARD chain, crosses the bridge, travels the veth pair into the pod namespace, and arrives at the application socket.

In Kubernetes pod-to-pod traffic across nodes the CNI overlay (Flannel, Calico, Cilium) encapsulates or routes at Layer 3 so ARP is resolved either via proxy ARP at the node or via BGP-distributed routes depending on the CNI choice.`,
      image: `/diagrams/devops/linux-networking-l2l3-flow.png`,
    },
  ],
  introduction: `Linux networking is built on a layered model where Layer 2 and Layer 3 each have distinct responsibilities but cooperate tightly inside the kernel. Layer 2, the data link layer, concerns itself with how bytes travel between two directly connected devices: it defines the Ethernet frame format (destination MAC, source MAC, EtherType, payload, FCS), address resolution via ARP, and logical grouping of interfaces using Linux bridges and 802.1Q VLAN tagging. Layer 3, the network layer, introduces the concept of logical addressing with IP, autonomous routing decisions based on destination prefix lookups, and policy-based routing that can forward packets based on source IP, firewall mark, or DSCP bits.

The netfilter framework is the kernel subsystem that ties these layers together with stateful packet inspection and manipulation. Every packet that enters, traverses, or leaves a Linux machine visits a sequence of netfilter hooks. Tables contain chains of rules, and iptables is the classical userspace tool for managing those rules. nftables is the modern replacement with a unified syntax, but iptables remains dominant in production environments, container runtimes, and Kubernetes data planes, so understanding both is essential for any DevOps or infrastructure engineer.

Linux network namespaces virtualize the network stack itself. A namespace owns a private view of interfaces, routing tables, iptables rules, ARP caches, and sockets. This is the kernel primitive that makes containers possible: each container runs inside its own namespace, isolated from every other container and from the host. Veth pairs are the wire between namespaces: they behave like a crossed Ethernet cable at the kernel level, delivering frames from one end to the other with essentially zero latency and no intermediate switching logic.

Docker and Kubernetes build their entire networking models on top of these primitives. Docker creates a Linux bridge (docker0), provisions veth pairs for each container, and installs iptables MASQUERADE rules so outbound traffic can reach the internet. Kubernetes delegates network setup entirely to CNI plugins, which are short-lived binaries invoked by the container runtime. The CNI specification defines a precise contract: the runtime passes configuration on stdin and reads a JSON result from stdout, allowing any conforming plugin to wire up pod networking without modifying the runtime.

Understanding this stack end-to-end is required for debugging packet drops (ip route, ip neigh, conntrack, iptables -L -n -v), for designing multi-tenant network isolation (namespaces, VLAN tags, policy routing tables), and for reasoning about the performance characteristics and failure modes of container networking overlays. A candidate who can trace a packet from a containerized application through every kernel layer to the physical wire, and back, demonstrates the depth needed for senior infrastructure, SRE, and platform engineering roles.`,
  whenToUse: [
    `Debugging why a container cannot reach an external service when the host can, requiring inspection of iptables FORWARD and POSTROUTING rules and the docker0 bridge ARP table`,
    `Designing multi-tenant isolation on a bare-metal host where different customer workloads must share a NIC but not see each other's traffic, using network namespaces, VLAN subinterfaces, and policy routing tables`,
    `Tracing intermittent connection resets in a Kubernetes cluster that turn out to be conntrack table exhaustion causing SYN packets to be dropped by the stateful FORWARD chain`,
    `Implementing a custom CNI plugin for a bare-metal environment where no existing plugin satisfies the required IP allocation or BGP peering model`,
    `Tuning ECMP routing on a host with multiple uplinks to achieve per-flow load balancing without packet reordering, using ip route multipath and sysctl rp_filter settings`,
    `Auditing iptables rules on a production node after a security incident to identify unauthorized DNAT or SNAT rules that redirect traffic to attacker-controlled endpoints`,
    `Setting up a Linux router between two subnets using ip_forward, static routes, and NAT masquerade during a lab or interview live-coding exercise`,
    `Diagnosing ARP thrashing on a host with bonded interfaces where gratuitous ARPs cause MAC table flapping on the upstream switch`,
  ],
  keyConcepts: [
    {
      term: `Ethernet Frame and ARP`,
      definition: `An Ethernet frame is the fundamental unit of Layer 2 communication. Its structure is: 6-byte destination MAC, 6-byte source MAC, optional 4-byte 802.1Q VLAN tag (EtherType 0x8100 followed by PCP, DEI, and 12-bit VID), 2-byte EtherType (0x0800 for IPv4, 0x0806 for ARP, 0x86DD for IPv6), variable payload (46-1500 bytes for standard MTU), and 4-byte FCS. When a host needs to send an IP packet to a destination on the same subnet, it must resolve the destination IP to a MAC address. The Address Resolution Protocol handles this: the sender broadcasts an ARP request containing the target IP, and the owner of that IP replies with its MAC. Linux caches these mappings in the neighbor (ARP) table managed by the kernel's neighbour subsystem.

\`\`\`bash
# Show the ARP / neighbor table
ip neigh show

# Force an ARP request for a specific IP
arping -I eth0 192.168.1.1

# Show Layer 2 details of an interface
ip link show eth0

# Add a static ARP entry
ip neigh add 192.168.1.50 lladdr de:ad:be:ef:00:01 dev eth0

# Capture ARP traffic
tcpdump -i eth0 arp
\`\`\`

ARP operates only within a broadcast domain. Routers do not forward ARP requests, so each subnet requires its own ARP resolution. In Kubernetes, each node is its own broadcast domain at Layer 2; pod-to-pod communication across nodes therefore relies on Layer 3 routing (or encapsulation) rather than ARP.`,
    },
    {
      term: `Linux Bridge and 802.1Q VLAN Tagging`,
      definition: `A Linux bridge is a software implementation of an Ethernet switch. It maintains a forwarding database (FDB) mapping MAC addresses to bridge ports. When a frame arrives on a port, the bridge looks up the destination MAC: if found, the frame is forwarded to the specific port; if not, it is flooded to all ports except the one it arrived on. The bridge learns source MACs from incoming frames and ages them out. Docker enslaves each container's host-side veth to the docker0 bridge, so containers on the same host communicate at Layer 2 without leaving the kernel.

\`\`\`bash
# Create a bridge
ip link add name br0 type bridge
ip link set br0 up

# Enslave an interface to the bridge
ip link set eth1 master br0

# Show bridge forwarding database
bridge fdb show br0

# Create a VLAN subinterface (802.1Q tag 100)
ip link add link eth0 name eth0.100 type vlan id 100
ip link set eth0.100 up
ip addr add 10.100.0.1/24 dev eth0.100

# Show VLANs on bridge ports
bridge vlan show
\`\`\`

802.1Q VLAN tagging inserts a 4-byte tag into the Ethernet frame between the source MAC and EtherType fields. The 12-bit VID field allows 4094 distinct VLANs. Linux VLAN subinterfaces strip the tag on ingress and insert it on egress, presenting a clean untagged interface to upper-layer protocols. Bridge VLAN filtering (bridge link set dev eth1 pvid 100 vid 100) can enforce VLAN membership at the port level, providing isolation equivalent to a managed switch.`,
    },
    {
      term: `IP Routing Table and ECMP`,
      definition: `The Linux routing table maps destination IP prefixes to nexthops. The kernel performs longest-prefix-match (LPM) lookup for every outbound packet. A route entry specifies the destination network, the nexthop (gateway IP or directly connected), the output interface, and metric. The main routing table (table 254) handles normal traffic; local (table 255) handles loopback and broadcast; policy routing adds user-defined tables (1-252) selected by ip rules.

\`\`\`bash
# Show the main routing table
ip route show table main

# Add a static route
ip route add 10.10.0.0/16 via 192.168.1.1 dev eth0

# Add a default route
ip route add default via 192.168.1.1

# ECMP: add two equal-cost nexthops for load balancing
ip route add 10.20.0.0/24 \
  nexthop via 192.168.1.1 dev eth0 weight 1 \
  nexthop via 192.168.2.1 dev eth1 weight 1

# Policy routing: route packets from 10.0.0.0/8 via table 100
ip rule add from 10.0.0.0/8 table 100
ip route add default via 10.0.0.254 table 100

# Show all routing rules
ip rule show
\`\`\`

ECMP (Equal-Cost Multi-Path) allows the kernel to distribute flows across multiple nexthops. Linux uses a hash of the 5-tuple (src IP, dst IP, protocol, src port, dst port) to select the nexthop, ensuring that all packets of a single TCP connection take the same path (preventing reordering). The sysctl net.ipv4.fib_multipath_hash_policy controls the hash inputs.`,
    },
    {
      term: `Netfilter Tables and Chains`,
      definition: `Netfilter is the kernel framework that processes packets at five hook points. iptables organizes rules into tables, each with a fixed set of chains. The raw table (chains: PREROUTING, OUTPUT) runs before connection tracking and is used to exempt specific flows via the NOTRACK target. The mangle table (all five chains) allows modification of packet fields like TTL, ToS, and firewall mark. The nat table (PREROUTING, INPUT, OUTPUT, POSTROUTING) performs address translation; DNAT rules appear in PREROUTING and SNAT/MASQUERADE appear in POSTROUTING. The filter table (INPUT, FORWARD, OUTPUT) is the default for allow/deny rules.

\`\`\`bash
# List all rules with counters in all chains of filter table
iptables -t filter -L -n -v --line-numbers

# Allow forwarding between two interfaces
iptables -A FORWARD -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT

# MASQUERADE outbound traffic on eth0
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# DNAT: redirect incoming port 80 to internal server
iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 10.0.0.5:80

# Show connection tracking table
conntrack -L

# Delete all rules in a table
iptables -t nat -F
\`\`\`

Connection tracking (conntrack) is the kernel module that maintains state for each flow. States are NEW (first packet of a new connection), ESTABLISHED (bidirectional traffic seen), RELATED (new connection related to an existing one, such as FTP data), and INVALID (packets that do not match any connection). Most FORWARD chains use -m state --state RELATED,ESTABLISHED to pass return traffic without explicit rules.`,
    },
    {
      term: `Linux Network Namespaces and Veth Pairs`,
      definition: `A network namespace is a complete virtualization of the Linux network stack: it owns its own interfaces, routing tables, iptables rules, neighbor cache, and socket namespace. The root namespace (pid 1's namespace) is the default. New namespaces are created with ip netns add or unshare --net. Processes join a namespace by calling setns() on the namespace file descriptor.

A veth pair is created as a single unit: two virtual Ethernet interfaces that are connected back-to-back in the kernel. A frame written to one end is immediately readable on the other end. They are the standard mechanism for connecting a network namespace to the root namespace or to a bridge.

\`\`\`bash
# Create a namespace
ip netns add container1

# Create a veth pair
ip link add veth0 type veth peer name veth1

# Move one end into the namespace
ip link set veth1 netns container1

# Configure addresses
ip addr add 172.17.0.1/24 dev veth0
ip link set veth0 up
ip netns exec container1 ip addr add 172.17.0.2/24 dev veth1
ip netns exec container1 ip link set veth1 up
ip netns exec container1 ip link set lo up

# Add a default route inside the namespace
ip netns exec container1 ip route add default via 172.17.0.1

# Run a command inside the namespace
ip netns exec container1 ping 8.8.8.8

# List all named namespaces
ip netns list
\`\`\`

Named network namespaces appear as files under /var/run/netns/. Container runtimes create anonymous namespaces via clone() or unshare() and reference them through /proc/PID/ns/net. The CNI specification requires the runtime to pass this path in the CNI_NETNS environment variable so the CNI plugin can open and configure the namespace.`,
    },
    {
      term: `CNI Plugin Contract`,
      definition: `The Container Network Interface specification defines a binary interface between a container runtime and a network plugin. At pod creation, the runtime executes a CNI binary with these environment variables set: CNI_COMMAND (ADD, DEL, or CHECK), CNI_CONTAINERID (opaque unique ID), CNI_NETNS (path to the network namespace file, e.g. /proc/12345/ns/net), CNI_IFNAME (interface name inside the namespace, typically eth0), CNI_ARGS (optional semicolon-separated key=value pairs), and CNI_PATH (colon-separated list of directories to search for plugin binaries).

The plugin reads a JSON network configuration from stdin. A typical bridge plugin config looks like this:

\`\`\`json
{
  "cniVersion": "0.4.0",
  "name": "mynet",
  "type": "bridge",
  "bridge": "cni0",
  "isGateway": true,
  "ipMasq": true,
  "ipam": {
    "type": "host-local",
    "subnet": "10.244.0.0/24",
    "routes": [{ "dst": "0.0.0.0/0" }]
  }
}
\`\`\`

On ADD the plugin must: create the bridge if absent, create a veth pair, move one end into the container namespace and rename it to CNI_IFNAME, enslave the host-side veth to the bridge, invoke the IPAM delegate to allocate an IP, assign the IP to the container interface, add routes inside the namespace, and write a JSON result to stdout containing the allocated IPs and routes. On DEL the plugin must tear down the veth pair and release the IP back to IPAM. On CHECK it must verify the configuration matches expectations and return an error if not.

\`\`\`bash
# Manually invoke a CNI plugin (useful for debugging)
CNI_COMMAND=ADD \
CNI_CONTAINERID=test123 \
CNI_NETNS=/var/run/netns/test \
CNI_IFNAME=eth0 \
CNI_PATH=/opt/cni/bin \
/opt/cni/bin/bridge < /etc/cni/net.d/10-bridge.conf

# Inspect what the host-local IPAM has allocated
cat /var/lib/cni/networks/mynet/*
\`\`\`

The host-local IPAM plugin stores allocations as files named by IP address under /var/lib/cni/networks/NETNAME/. Each file contains the container ID that owns the allocation, making it straightforward to audit or debug stale allocations after a crash.`,
    },
  ],
  approach: [
    `Always enable ip_forward before expecting the kernel to route packets between interfaces. Set net.ipv4.ip_forward=1 in /etc/sysctl.conf and apply with sysctl -p. Without this the kernel silently drops packets that arrive on one interface destined for a different subnet.`,
    `Use conntrack -L to inspect the connection tracking table when debugging NAT or stateful firewall issues. Stale entries after a process crash can cause new connections to be incorrectly classified as INVALID and dropped by rules that match only RELATED,ESTABLISHED.`,
    `When adding iptables rules for container networking, always use -m comment --comment to annotate rules with the container ID or workload name. Production nodes accumulate hundreds of rules; anonymous rules are impossible to audit.`,
    `Test veth pair connectivity with ip netns exec NAMESPACE ping HOST_IP before adding application-layer complexity. This isolates Layer 3 reachability problems from application or DNS issues.`,
    `Use tcpdump with -i any and -e (show Ethernet headers) to trace packets across all interfaces simultaneously. Packet captures on both ends of a veth pair confirm whether a frame is being delivered and whether VLAN tags or MACs are correct.`,
    `Configure rp_filter (reverse path filtering) carefully when using policy routing or ECMP. A value of 1 (strict) drops packets whose source address would not be reachable via the same interface, which breaks asymmetric routing. Set to 2 (loose) or 0 when asymmetric paths are intentional.`,
    `When writing a CNI plugin, always handle the DEL command idempotently. The runtime may call DEL multiple times after a crash or node failure. A plugin that returns an error on a second DEL (because the veth no longer exists) will block pod cleanup and leak namespace files.`,
    `Use ip route get DST_IP to simulate a routing decision without sending a packet. This shows which interface and nexthop the kernel would select, including the effects of policy routing rules, and is the fastest way to diagnose routing misconfigurations.`,
  ],
  pitfalls: [
    `Forgetting that iptables rules are stateless by default. A FORWARD rule that allows traffic from eth0 to eth1 does not automatically allow return traffic. Always pair forward rules with a RELATED,ESTABLISHED rule or use connection tracking explicitly, otherwise the first packet of a reply is dropped.`,
    `Assuming MASQUERADE and SNAT are equivalent. MASQUERADE looks up the outbound interface's IP at packet time (correct for DHCP interfaces that change IP), while SNAT requires a fixed IP specified at rule creation time. Using MASQUERADE on a static-IP interface adds a small per-packet lookup overhead, but the more dangerous mistake is using SNAT on a dynamic interface that gets a new IP after a lease renewal, causing all NAT sessions to break silently.`,
    `Creating a veth pair but forgetting to bring both ends up with ip link set up. A veth end that is DOWN will silently discard all frames. This is the most common cause of "container can ping the gateway but nothing else" bugs, often because the host-side veth is up but the bridge port is not.`,
    `Exhausting the conntrack table under high connection rates. The default nf_conntrack_max is sized for modest workloads. When the table fills, new connections are dropped without any error visible to the application. Monitor /proc/sys/net/netfilter/nf_conntrack_count against nf_conntrack_max and tune with sysctl net.netfilter.nf_conntrack_max and net.netfilter.nf_conntrack_buckets.`,
    `Relying on iptables -F to clear rules without also flushing the nat table. iptables -F flushes only the filter table by default. Use iptables -t nat -F, iptables -t mangle -F, and iptables -t raw -F separately, or wrap them in a loop over all tables to ensure a clean state.`,
    `Mixing ip route and route commands. The legacy route tool does not support policy routing, ECMP, or the full feature set of iproute2. It also interprets arguments differently. Use only ip route, ip rule, and ip neigh in any script or runbook that may run on modern kernels.`,
    `Ignoring MTU mismatches when using VLAN subinterfaces or overlay encapsulation. An 802.1Q VLAN tag adds 4 bytes, reducing the effective payload from 1500 to 1496 bytes if the parent interface MTU is 1500. VXLAN encapsulation adds 50 bytes. Failure to set the correct MTU on inner interfaces causes silent fragmentation or PMTUD blackholes, manifesting as connections that complete handshakes but stall when transferring large payloads.`,
    `Assuming that CNI ADD success means the pod has full connectivity. The bridge plugin only wires the pod to the local bridge. Pod-to-pod traffic across nodes requires a separate mechanism: an overlay like VXLAN installed by flannel, BGP route distribution by Calico, or eBPF datapath by Cilium. Forgetting to install or configure the cross-node component produces intermittent failures that look like DNS or application bugs rather than networking gaps.`,
  ],
  keyQuestions: [
    {
      question: `Trace a TCP SYN packet from a Docker container to the internet through every iptables chain it visits.`,
      answer: `A container on the docker0 bridge at 172.17.0.2 sends a SYN destined for 1.1.1.1:443. Here is the exact chain sequence in the root network namespace.

The packet arrives at the docker0 bridge interface in the root namespace. The bridge forwards it at Layer 2 to the kernel IP stack via the bridge's own IP device. At this point netfilter sees an incoming packet on docker0.

Chain 1: PREROUTING (raw table). The raw table runs first. If no rule exempts the flow, the packet enters connection tracking and is marked as a NEW connection. Docker does not normally add raw rules, so the packet continues.

Chain 2: PREROUTING (mangle table). No-op in a default Docker setup. Packet continues.

Chain 3: PREROUTING (nat table). Docker adds a DNAT rule here for published ports. Since this is outbound traffic from the container (not inbound to a published port), no DNAT rule matches. Packet continues.

The kernel now makes a routing decision. The destination 1.1.1.1 matches the default route via eth0 (the host's uplink). Because the output interface (eth0) differs from the input interface (docker0), the packet is a transit packet and hits the FORWARD chain, not INPUT.

Chain 4: FORWARD (mangle table). No-op default.

Chain 5: FORWARD (filter table). Docker installs a rule: -A DOCKER-USER and then -A FORWARD -i docker0 ! -o docker0 -j ACCEPT (for outbound) and -A FORWARD -i docker0 -o docker0 -j ACCEPT (for intra-bridge). The SYN matches the outbound rule and is ACCEPTed.

Chain 6: POSTROUTING (mangle table). No-op default.

Chain 7: POSTROUTING (nat table). Docker installs: -A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE. The SYN source (172.17.0.2) matches the source range and the output interface is eth0 (not docker0), so MASQUERADE rewrites the source IP to the host's eth0 IP (say 203.0.113.5) and records the mapping in the conntrack table. The packet leaves eth0 with src=203.0.113.5 and dst=1.1.1.1.

On the return path, the SYN-ACK arrives on eth0. It hits PREROUTING (nat), where conntrack identifies it as ESTABLISHED and automatically un-NATes the destination back to 172.17.0.2. The packet then hits FORWARD (filter) and matches the RELATED,ESTABLISHED rule. It exits via docker0 and crosses the veth pair into the container namespace.

\`\`\`bash
# Observe the conntrack entry for the flow
conntrack -L -p tcp --dport 443

# Watch iptables counters in real time
watch -n1 'iptables -t nat -L POSTROUTING -n -v'

# Trace a specific packet through all tables (kernel 4.11+)
iptables -t raw -A OUTPUT -p tcp --dport 443 -j TRACE
iptables -t raw -A PREROUTING -p tcp --sport 443 -j TRACE
# then read: dmesg | grep TRACE
\`\`\``,
    },
    {
      question: `Explain veth pair mechanics at the kernel level. What happens when you write a byte to one end?`,
      answer: `A veth pair is created by a single call to the veth driver's newlink function, which allocates two net_device structures and cross-links them: each end holds a pointer to its peer. Unlike a real NIC that passes frames through hardware, the veth driver's xmit function directly calls netif_rx() on the peer device, injecting the frame into the peer's receive queue in software. The entire transfer happens in the same CPU context if the peer is in the same namespace, or via a brief context switch if napi polling is involved.

From a performance standpoint, veth pairs achieve nearly the same throughput as loopback and far exceed what a physical NIC can sustain, because there is no PCI DMA, no interrupt coalescing, and no serialization across a PCIe bus. The limiting factors are CPU cache pressure and lock contention on the sk_buff allocation pool.

\`\`\`bash
# Demonstrate veth pair: namespace A can reach namespace B
ip netns add ns-a
ip netns add ns-b
ip link add veth-a type veth peer name veth-b
ip link set veth-a netns ns-a
ip link set veth-b netns ns-b
ip netns exec ns-a ip addr add 192.168.99.1/24 dev veth-a
ip netns exec ns-b ip addr add 192.168.99.2/24 dev veth-b
ip netns exec ns-a ip link set veth-a up
ip netns exec ns-b ip link set veth-b up
ip netns exec ns-a ping -c3 192.168.99.2
\`\`\`

Key behaviors to understand in interviews: if the peer end is DOWN (ip link set veth-b down), the xmit on veth-a silently discards frames (returns NETDEV_TX_OK but increments the dropped counter). There is no error propagated to the sender. This is the most common cause of "container can start but has no connectivity" bugs. The fix is always to check both ends with ip link show and ensure both are UP.

When a veth end is enslaved to a bridge, the bridge becomes the Layer 2 forwarder. Frames arriving on the bridge port are no longer delivered directly to the veth's net_device IP stack; instead the bridge makes the forwarding decision. The bridge then delivers frames to the correct port's peer, which in turn injects them into the target namespace via netif_rx.`,
    },
    {
      question: `What is the difference between PREROUTING and POSTROUTING in iptables? When would you use each?`,
      answer: `PREROUTING and POSTROUTING are netfilter hooks that run at opposite ends of the kernel's routing decision.

PREROUTING fires on every packet that arrives at any interface before the kernel makes the routing decision. At this point the kernel has not yet decided whether the packet is destined for a local socket (INPUT path) or for forwarding to another interface (FORWARD path). Because the routing decision has not happened, PREROUTING rules can rewrite the destination IP and port (DNAT) and thereby redirect the packet to a different host or port. The kernel will then make its routing decision on the modified destination. This is how Docker port publishing works: an incoming packet for the host's port 8080 hits PREROUTING DNAT and is rewritten to 172.17.0.5:80, after which the routing decision forwards it to the container.

POSTROUTING fires on every packet that is about to leave any interface, after the routing decision and after the FORWARD or OUTPUT chain. The source IP and port are still the original values at this point (unless a prior rule modified them). POSTROUTING is where SNAT and MASQUERADE live. The kernel uses the routing decision to determine the output interface, and POSTROUTING can rewrite the source to make the packet appear to originate from the host or from a specific IP.

\`\`\`bash
# DNAT: redirect packets arriving on port 443 to an internal TLS terminator
iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination 10.0.0.10:8443

# SNAT: make all traffic from the internal lab subnet appear to come from the host's public IP
iptables -t nat -A POSTROUTING -s 10.0.0.0/8 -o eth0 -j SNAT --to-source 203.0.113.5

# MASQUERADE: same as above but learns the outbound IP dynamically (for DHCP interfaces)
iptables -t nat -A POSTROUTING -s 10.0.0.0/8 -o eth0 -j MASQUERADE
\`\`\`

The critical distinction: PREROUTING modifies where a packet goes (destination), POSTROUTING modifies who it appears to come from (source). You can combine them: a load balancer might DNAT in PREROUTING to select a backend, and the backend's reply travels the return path where SNAT in POSTROUTING ensures the client sees the load balancer's IP in the reply, not the backend's. Connection tracking makes this transparent by storing the original tuple and automatically reversing the NAT on reply packets.`,
    },
    {
      question: `How does ARP work for pod-to-pod traffic across different Kubernetes nodes? Walk through the full resolution path.`,
      answer: `The answer depends on the CNI plugin, because Kubernetes does not mandate a single Layer 2 topology. The two dominant approaches are overlay networks (VXLAN) and pure Layer 3 routing (BGP). Here is how each handles ARP for cross-node pod-to-pod traffic.

Pure Layer 3 (Calico with BGP): Each node advertises its pod CIDR (/24 or /26) to the BGP fabric. The routing table on every node has a host route (/32) for every pod, with the nexthop being the node's IP. When pod A (10.244.1.2 on node 1) sends a packet to pod B (10.244.2.5 on node 2), the kernel on node 1 looks up 10.244.2.5, finds a route pointing to node 2's IP (192.168.0.2). It then ARPs for 192.168.0.2 on its eth0, which is a standard Layer 2 ARP on the physical network. Node 2 answers, and the packet travels as a normal IP packet between nodes. On node 2, a host route for 10.244.2.5 points to a veth that connects to pod B's namespace. There is no tunnel and no per-pod ARP across nodes.

\`\`\`bash
# On a Calico node, see per-pod host routes
ip route show | grep cali

# Example output:
# 10.244.2.5 dev cali1234abcd scope link
\`\`\`

VXLAN overlay (Flannel in VXLAN mode): Each node has a VTEP (VXLAN Tunnel Endpoint) interface (flannel.1). Flannel populates the VTEP's FDB and ARP proxy tables with entries learned from etcd or the Kubernetes API. When pod A sends a packet to pod B, the kernel on node 1 looks up 10.244.2.5, finds a route via flannel.1 nexthop 10.244.2.0 (the pod's gateway). Before encapsulating, the kernel needs the MAC of the nexthop. Instead of broadcasting an ARP, the flannel VTEP has a static ARP entry for 10.244.2.0 pointing to the MAC of node 2's VTEP, populated by flannel via netlink. The kernel encapsulates the entire original frame in a UDP/VXLAN packet (UDP port 4789) addressed to node 2's IP. Node 2's kernel decapsulates and delivers to the pod.

\`\`\`bash
# See the ARP proxy entries on the flannel VTEP
ip neigh show dev flannel.1

# See the VTEP FDB (which remote VTEP owns which inner MAC)
bridge fdb show dev flannel.1
\`\`\`

The key insight: in both cases, actual Layer 2 ARP between pods on different nodes is avoided. Pure L3 uses BGP routes so the kernel never broadcasts for remote pod IPs. Overlay uses pre-populated ARP and FDB tables in the VTEP so the kernel finds the answer locally. Broadcast ARP across nodes would be impossible anyway because each node is in a separate broadcast domain.`,
    },
    {
      question: `Describe the CNI plugin contract precisely. What must a plugin do on ADD, and what guarantees must it make on DEL?`,
      answer: `The CNI specification (currently 1.0.0, with 0.4.0 still widely deployed) defines a strict contract between the container runtime and the plugin binary.

Runtime responsibilities before calling ADD: the runtime must have already created the network namespace, which exists at the path passed in CNI_NETNS. The runtime must not yet have set up any network interfaces inside the namespace. The runtime sets five environment variables (CNI_COMMAND, CNI_CONTAINERID, CNI_NETNS, CNI_IFNAME, CNI_PATH) and writes the plugin's configuration JSON to the binary's stdin.

Plugin responsibilities on ADD:
1. Read the config JSON from stdin and parse it.
2. Create the requested network resources (bridge, veth pair, etc.).
3. Move the container-side veth into the namespace at CNI_NETNS and rename it to CNI_IFNAME.
4. Configure the interface: assign IP addresses, bring it UP, add routes inside the namespace.
5. If the config references an IPAM plugin, delegate to it by re-executing the IPAM binary with CNI_COMMAND=ADD and the ipam section of the config as stdin. Parse its JSON result to obtain the allocated IP, gateway, and routes.
6. Write a JSON result to stdout containing the CNI version, the list of IPs allocated, the DNS config, and the interface list. Return exit code 0 on success, nonzero on error.

\`\`\`json
{
  "cniVersion": "0.4.0",
  "interfaces": [
    { "name": "cni0", "mac": "0a:58:0a:f4:00:01" },
    { "name": "vethXXXXXX", "mac": "...", "sandbox": "" },
    { "name": "eth0", "mac": "...", "sandbox": "/proc/12345/ns/net" }
  ],
  "ips": [
    {
      "version": "4",
      "address": "10.244.0.5/24",
      "gateway": "10.244.0.1",
      "interface": 2
    }
  ],
  "routes": [{ "dst": "0.0.0.0/0" }]
}
\`\`\`

Plugin guarantees on DEL: the plugin must be idempotent. The runtime may call DEL multiple times (kubelet retry after crash, node draining, forced pod deletion). If the veth pair no longer exists, the plugin must not return an error that blocks the DEL from completing. The correct behavior is to attempt teardown, log a warning if resources are already gone, release the IP back to IPAM (also idempotent: host-local will silently succeed if the file is already absent), and return exit code 0. A plugin that returns an error on a missing veth will leak the pod namespace file and cause kubelet to retry indefinitely, eventually exhausting kernel namespace slots.

\`\`\`bash
# Invoke DEL manually for a stale container
CNI_COMMAND=DEL \
CNI_CONTAINERID=stale123 \
CNI_NETNS=/proc/99999/ns/net \
CNI_IFNAME=eth0 \
CNI_PATH=/opt/cni/bin \
/opt/cni/bin/bridge < /etc/cni/net.d/10-bridge.conf

# Check for leaked IPAM allocations
ls /var/lib/cni/networks/mynet/
\`\`\``,
    },
  ],
  references: [
    'https://www.kernel.org/doc/html/latest/networking/netfilter.html',
    'https://www.netfilter.org/documentation/HOWTO/netfilter-hacking-HOWTO.html',
    'https://www.cni.dev/docs/spec/',
    'https://www.cni.dev/plugins/current/main/bridge/',
    'https://docs.docker.com/network/drivers/bridge/',
    'https://linux.die.net/man/8/ip',
    'https://man7.org/linux/man-pages/man8/iptables.8.html',
    'https://man7.org/linux/man-pages/man8/conntrack.8.html',
    'https://www.projectcalico.org/blog/why-bgp',
    'https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md',
  ],
},
  // ─── NEW TOPICS: Kernel Security, eBPF, Performance, Storage ────────────────
  {
    id: 'linux-seccomp',
    title: 'seccomp Syscall Filtering',
    icon: 'shield',
    color: '#ef4444',
    questions: 6,
    description: 'seccomp and seccomp-BPF for syscall filtering in containers, Docker default profiles, and writing custom filters.',
    visualizations: [
      { title: 'seccomp Filter Chain', description: 'Process syscall → kernel → BPF filter → ALLOW/KILL/TRAP/ERRNO decision', image: '/diagrams/linux/linux-seccomp-chain.png' },
    ],
    introduction: `**seccomp** (Secure Computing Mode) is a Linux kernel feature that restricts which system calls a process can make. It is the primary attack-surface-reduction mechanism used by Docker, Kubernetes, and browsers (Chrome/Firefox sandbox).\n\n## Modes\n\n- **SECCOMP_MODE_STRICT** — allows only \`read\`, \`write\`, \`exit\`, and \`sigreturn\`. Rarely used directly.\n- **SECCOMP_MODE_FILTER** — attaches a BPF program that inspects each syscall and returns an action: **SECCOMP_RET_ALLOW**, **SECCOMP_RET_KILL_PROCESS**, **SECCOMP_RET_ERRNO**, or **SECCOMP_RET_TRAP**.\n\n## Docker Default Profile\n\nDocker ships a default seccomp profile that blocks ~44 dangerous syscalls including \`ptrace\`, \`kexec_load\`, \`create_module\`, and \`mount\`. Privileged containers (\`--privileged\`) disable seccomp entirely.\n\n## Kubernetes Integration\n\nPod-level: \`securityContext.seccompProfile.type: RuntimeDefault\` applies the container runtime's default. \`Localhost\` type loads a custom profile from the node's profile directory (\`/var/lib/kubelet/seccomp/\`).\n\n## Writing a Custom Filter\n\n\`\`\`json\n{\n  "defaultAction": "SCMP_ACT_ERRNO",\n  "syscalls": [\n    { "names": ["read","write","open","close","stat","mmap","exit_group"],\n      "action": "SCMP_ACT_ALLOW" }\n  ]\n}\n\`\`\`\n\nUse \`strace -c ./myapp\` to discover which syscalls your app actually needs before writing an allowlist.`,
    whenToUse: [
      'Explaining how Docker reduces container attack surface without full virtualization',
      'Hardening a Kubernetes workload against kernel exploit escalation',
      'Auditing what syscalls a binary needs before writing a restrictive profile',
    ],
    keyConcepts: [
      { term: 'BPF filter', definition: 'A bytecode program evaluated in-kernel on every syscall. Returns an action (ALLOW/KILL/ERRNO). Cannot be removed once installed by a process without exec.' },
      { term: 'SCMP_ACT_KILL_PROCESS', definition: 'Terminates the entire process (not just the thread) when a blocked syscall is attempted. More secure than ERRNO because it prevents the app from recovering.' },
      { term: 'Docker default profile', definition: 'Blocks ~44 high-risk syscalls. Applied automatically unless --security-opt seccomp=unconfined or --privileged is set.' },
      { term: 'RuntimeDefault', definition: 'Kubernetes seccompProfile type that delegates to the container runtime (containerd/cri-o) default profile.' },
    ],
    pitfalls: [
      'Running containers with --privileged disables seccomp, AppArmor, and SELinux simultaneously — maximum privilege, zero confinement.',
      'Allowlisting by syscall number is architecture-specific; use syscall names in JSON profiles for portability.',
      'Forgetting that seccomp filters are inherited by children (fork/exec) unless the child exec-loads a new profile.',
    ],
    keyQuestions: [
      {
        question: 'How does Docker use seccomp to reduce container attack surface, and what happens when you use --privileged?',
        answer: `Docker attaches a **default seccomp BPF filter** to every container at start time. The filter blocks ~44 dangerous syscalls that are valid on the host but unnecessary for application containers: \`ptrace\`, \`kexec_load\`, \`create_module\`, \`mount\`, \`pivot_root\`, \`clone\` with certain flags, etc.\n\nWhen you run \`docker run --privileged\`, Docker disables seccomp entirely (\`--security-opt seccomp=unconfined\`), removes all capability drops, and turns off AppArmor/SELinux confinement. The container has near-root-equivalent access to the host kernel.\n\n**Hardening alternative to --privileged for specific needs:**\n\`\`\`bash\n# Add only the cap you need instead of full privileged\ndocker run --cap-add SYS_PTRACE --security-opt seccomp=unconfined myapp\n\`\`\`\n\nFor production, prefer a **custom seccomp profile** that allowlists only the syscalls your binary actually uses, discovered via:\n\`\`\`bash\nstrace -qcf ./myapp   # -f follows forks, -q quiet, -c summary\n\`\`\``,
      },
      {
        question: 'A containerized application crashes with "Operation not permitted" only in production Kubernetes but works in dev Docker. What do you check?',
        answer: `The crash is likely a **blocked syscall** difference between environments.\n\n**Steps:**\n\n1. Check Kubernetes seccomp profile:\n\`\`\`bash\nkubectl get pod mypod -o jsonpath='{.spec.securityContext.seccompProfile}'\n\`\`\`\n\n2. Check container runtime default vs Docker default — \`containerd\`'s RuntimeDefault may block different syscalls than Docker's default profile.\n\n3. Run with seccomp disabled temporarily to confirm:\n\`\`\`yaml\nsecurityContext:\n  seccompProfile:\n    type: Unconfined\n\`\`\`\n\n4. Identify the blocked syscall:\n\`\`\`bash\n# On the pod node\nauditd or dmesg | grep 'seccomp'\n# In container logs look for SIGKILL or errno EPERM on specific syscall\n\`\`\`\n\n5. Add only the needed syscall to a custom Localhost profile rather than disabling seccomp entirely.`,
      },
    ],
    quickFire: [
      { q: 'What does SCMP_ACT_KILL_PROCESS do?', a: 'Terminates the entire process (not just the calling thread) when a blocked syscall is made. More secure than returning ERRNO because the process cannot handle the error.' },
      { q: 'How do you discover which syscalls an application uses?', a: 'Run strace -qcf ./myapp — it traces all syscalls including in child processes (-f) and prints a count summary (-c).' },
      { q: 'Does --privileged disable seccomp?', a: 'Yes. --privileged disables seccomp, AppArmor/SELinux confinement, and drops no capabilities. Avoid in production.' },
      { q: 'What Kubernetes seccompProfile type applies the runtime default?', a: 'RuntimeDefault — delegates to containerd or cri-o default profile.' },
      { q: 'Can a process remove its own seccomp filter?', a: 'No. Once a seccomp filter is installed it cannot be removed. An exec() can install a new (more restrictive) filter but cannot relax an existing one.' },
      { q: 'What syscall installs a seccomp filter?', a: 'prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog) or the newer seccomp() syscall directly.' },
    ],
    references: [
      'https://man7.org/linux/man-pages/man2/seccomp.2.html',
      'https://docs.docker.com/engine/security/seccomp/',
      'https://kubernetes.io/docs/tutorials/security/seccomp/',
    ],
  },
  {
    id: 'linux-ebpf',
    title: 'eBPF & bcc Toolset',
    icon: 'activity',
    color: '#f97316',
    questions: 7,
    description: 'Extended BPF programs for tracing, networking, and security — bcc tools, bpftrace one-liners, and production use cases.',
    visualizations: [
      { title: 'eBPF Architecture', description: 'User-space program → LLVM → BPF bytecode → verifier → JIT → kernel hooks (kprobes/tracepoints/XDP)', image: '/diagrams/linux/linux-ebpf-arch.png' },
    ],
    introduction: `**eBPF** (extended Berkeley Packet Filter) lets you run sandboxed programs in the Linux kernel without changing kernel source or loading kernel modules. The kernel verifies all eBPF programs for safety (no infinite loops, no out-of-bounds access) before running them.\n\n## How It Works\n\n1. Write a C program using the BPF API\n2. Compile with **Clang/LLVM** to BPF bytecode\n3. Load via \`bpf()\` syscall — kernel **verifier** checks safety\n4. **JIT compiler** translates to native machine code\n5. Program runs at a **hook point**: kprobe, tracepoint, XDP, cgroup, LSM hook, etc.\n\n## Key Hook Points\n\n- **kprobes/kretprobes** — dynamic instrumentation of any kernel function\n- **tracepoints** — stable kernel tracing interfaces\n- **uprobes** — user-space function tracing\n- **XDP** — network packet processing at driver level (before netstack)\n- **TC (Traffic Control)** — packet processing at tc ingress/egress\n- **LSM hooks** — security policy enforcement\n\n## bcc Toolset\n\nThe **BCC** (BPF Compiler Collection) provides ready-made tools:\n\n| Tool | What it does |\n|------|-------------|\n| \`execsnoop\` | Traces all exec() calls system-wide |\n| \`tcpconnect\` | Traces TCP connect() calls |\n| \`biolatency\` | Block I/O latency histogram |\n| \`opensnoop\` | Traces open() syscalls |\n| \`runqlat\` | CPU run queue latency |\n| \`funccount\` | Counts kernel function calls |\n\n## bpftrace One-liners\n\n\`\`\`bash\n# Trace all exec calls\nbpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("%s\\n", str(args->filename)); }'\n\n# TCP connection latency\nbpftrace -e 'kprobe:tcp_v4_connect { @start[tid] = nsecs; }\n  kretprobe:tcp_v4_connect /@start[tid]/ {\n    @latency = hist((nsecs - @start[tid]) / 1000); delete(@start[tid]); }'\n\n# Block I/O size histogram\nbpftrace -e 'tracepoint:block:block_rq_issue { @bytes = hist(args->bytes); }'\n\`\`\`\n\n## Cilium and eBPF Networking\n\nCilium replaces kube-proxy with eBPF programs that perform load balancing at XDP/TC layer, providing 10x lower latency for service-to-service traffic and enabling network policies without iptables rules.`,
    whenToUse: [
      'Profiling production systems with zero instrumentation overhead and no code changes',
      'Explaining how Cilium achieves iptables-free Kubernetes networking',
      'Security monitoring: detecting unusual exec or network patterns system-wide',
      'Tracing application performance without adding application-level instrumentation',
    ],
    keyConcepts: [
      { term: 'BPF verifier', definition: 'Statically analyzes every eBPF program before loading. Rejects: unbounded loops, out-of-bounds memory access, calling unsafe functions. Safety guarantee without kernel module risk.' },
      { term: 'XDP (eXpress Data Path)', definition: 'eBPF hook at the network driver level — processes packets before they enter the kernel network stack. Enables line-rate packet filtering, DDoS mitigation, and load balancing.' },
      { term: 'BPF maps', definition: 'Kernel data structures shared between eBPF programs and user-space. Types include hash, array, ring buffer, perf event array. Used to accumulate statistics and pass data out.' },
      { term: 'kprobe', definition: 'Dynamic instrumentation point on any kernel function. Can inspect arguments (entry) or return value (kretprobe). Not stable across kernel versions — prefer tracepoints for long-term tools.' },
    ],
    pitfalls: [
      'kprobes break across kernel versions — production observability tools should prefer stable tracepoints.',
      'eBPF programs run in interrupt context at many hook points — no sleeping, no blocking, no memory allocation that can fail.',
      'The verifier rejects programs with unbounded loops — use bounded loops with a compile-time limit or BPF_MAP_TYPE_PROG_ARRAY for tail calls.',
    ],
    keyQuestions: [
      {
        question: 'How does eBPF allow safe kernel instrumentation without kernel modules, and what does the verifier check?',
        answer: `eBPF programs are loaded via the \`bpf()\` syscall. Before execution, the kernel **verifier** performs static analysis:\n\n1. **Control flow** — must terminate. No unbounded loops. All paths must end in BPF_EXIT.\n2. **Memory safety** — all pointer arithmetic must stay within bounds. Map accesses validated at compile time.\n3. **Stack size** — limited to 512 bytes.\n4. **Helper calls only** — eBPF can only call approved kernel helper functions (\`bpf_map_lookup_elem\`, \`bpf_probe_read\`, etc.), not arbitrary kernel functions.\n5. **Type safety** — BTF (BPF Type Format) enables CO-RE (Compile Once, Run Everywhere), allowing programs to adapt to kernel struct layouts at load time.\n\nAfter verification, the JIT compiler translates BPF bytecode to native machine code. The program runs in the same privilege as the kernel but with hard safety boundaries — a buggy eBPF program cannot crash the kernel (unlike a kernel module).`,
      },
      {
        question: 'How does Cilium use eBPF to replace kube-proxy, and what are the performance benefits?',
        answer: `**kube-proxy** implements Kubernetes service load balancing using iptables rules. Each service adds O(n) iptables rules; at 10k services, connection setup requires traversing thousands of rules.\n\n**Cilium** replaces kube-proxy with eBPF programs attached at:\n- **XDP** — for external traffic, drops/forwards at driver level\n- **TC ingress/egress** — for pod-to-pod and service traffic\n- **Socket-level** — rewrites destination at connect() time, bypassing netstack entirely\n\n**Benefits:**\n- O(1) service lookup via BPF hash maps instead of O(n) iptables chain traversal\n- No conntrack for pod-to-pod traffic (Cilium tracks state in BPF maps)\n- Direct pod-to-pod routing without SNAT in many topologies\n- Network policy enforcement in eBPF — no iptables rules\n\nBenchmarks show 10-100x lower p99 latency at high connection rates and 3-5x higher throughput compared to iptables kube-proxy.`,
      },
    ],
    quickFire: [
      { q: 'What prevents an eBPF program from crashing the kernel?', a: 'The BPF verifier statically proves the program is safe before loading — no unbounded loops, no out-of-bounds memory access, only approved helper functions.' },
      { q: 'What is XDP and why is it faster than iptables?', a: 'XDP (eXpress Data Path) processes packets at the network driver level before the kernel network stack. It avoids memory allocation, skb allocation, and iptables chain traversal — achieving near line-rate packet processing.' },
      { q: 'What bcc tool shows which executables are being launched system-wide?', a: 'execsnoop — traces all exec() syscalls and prints the command, PID, and parent PID.' },
      { q: 'What are BPF maps?', a: 'Kernel data structures accessible from both eBPF programs and user-space via file descriptors. Used to accumulate stats, pass results out, and share state between programs.' },
      { q: 'What is CO-RE in eBPF?', a: 'Compile Once, Run Everywhere. Uses BTF type information to allow an eBPF binary to adapt to different kernel struct layouts at load time without recompilation.' },
      { q: 'How does bpftrace differ from bcc?', a: 'bpftrace is a high-level scripting language for one-liners and short scripts. bcc provides a Python/C API for building production observability tools with more complex logic.' },
      { q: 'What is the BPF stack size limit and why?', a: '512 bytes. BPF programs may run in interrupt context where there is no dynamic stack growth. Exceeding 512 bytes causes a verifier rejection.' },
    ],
    references: [
      'https://ebpf.io/what-is-ebpf/',
      'https://github.com/iovisor/bcc',
      'https://github.com/iovisor/bpftrace',
      'https://cilium.io/blog/2021/05/11/cni-benchmark/',
      'https://www.brendangregg.com/ebpf.html',
    ],
  },
  {
    id: 'linux-cgroup-v2',
    title: 'cgroup v2 Internals',
    icon: 'layers',
    color: '#f59e0b',
    questions: 6,
    description: 'cgroup v2 unified hierarchy, cpu/memory/io controllers, delegation for rootless containers, and Kubernetes integration.',
    visualizations: [
      { title: 'cgroup v2 Hierarchy', description: 'Single unified tree: /sys/fs/cgroup/ → systemd.slice → pod.scope → container cgroup with cpu/memory/io limits', image: '/diagrams/linux/linux-cgroup-v2-hierarchy.png' },
    ],
    introduction: `**cgroups v2** (control groups version 2) is the Linux mechanism for grouping processes and applying resource limits — CPU, memory, I/O, PIDs, and CPU sets. It supersedes cgroups v1 with a **unified hierarchy** (one tree instead of per-controller trees).\n\n## v1 vs v2\n\n| Feature | v1 | v2 |\n|---------|-----|-----|\n| Hierarchy | Per-controller (separate trees) | Single unified tree |\n| CPU accounting | cpuacct controller | Built into cpu controller |\n| I/O control | blkio controller | io controller (weight + BPS/IOPS limits) |\n| Memory OOM | Per-cgroup, inconsistent | Unified OOM, memory.oom.group |\n| Delegation | Complex, unsafe | Safe subtree delegation |\n\n## Key Controllers\n\n- **cpu** — \`cpu.weight\` (proportional shares 1-10000), \`cpu.max\` (hard limit: \`quota period\`)\n- **memory** — \`memory.max\` (hard limit), \`memory.high\` (soft limit that triggers throttling), \`memory.swap.max\`\n- **io** — \`io.weight\`, \`io.max\` (BPS and IOPS limits per device)\n- **pids** — \`pids.max\` (fork bomb protection)\n- **cpuset** — pin to specific CPUs and NUMA nodes\n\n## Kubernetes and cgroups v2\n\nKubernetes 1.25+ requires cgroups v2 for **memory QoS** (guaranteed/burstable distinction via \`memory.high\`) and for **rootless container support** (delegation chain from system cgroup to user session). Containerd and cri-o configure pod cgroups under \`/sys/fs/cgroup/kubepods/\`.\n\n## Delegation for Rootless Containers\n\nIn v2, a parent cgroup can delegate its subtree to a non-root user. The user can create sub-cgroups and apply limits without CAP_SYS_ADMIN on the root cgroup. This is how rootless Docker and Podman work: systemd delegates a user slice, and the container runtime manages sub-cgroups within it.`,
    whenToUse: [
      'Explaining how Kubernetes resource requests/limits translate to kernel cgroup settings',
      'Debugging OOMKilled pods and memory.high throttling behavior',
      'Explaining rootless container operation and delegation security model',
    ],
    keyConcepts: [
      { term: 'cpu.max', definition: '"quota period" format — e.g., "50000 100000" means 50ms CPU time per 100ms period (50% of one core). "max 100000" means unlimited.' },
      { term: 'memory.high', definition: 'Soft memory limit. When exceeded, the kernel throttles memory allocations and triggers reclaim before OOM. Burstable pods use this for QoS.' },
      { term: 'memory.oom.group', definition: 'When set to 1, OOM killer kills the entire cgroup as a unit rather than individual processes. Set by container runtimes so the whole container dies, not just one thread.' },
      { term: 'Delegation', definition: 'v2 allows a parent to grant a subtree to a non-root user. The user gets write access to cgroup.subtree_control and can manage their sub-hierarchy without root.' },
    ],
    pitfalls: [
      'cpu.max is not a reservation — it is a hard cap. A container limited to 0.5 CPU cannot burst above 500ms/s even if the host has idle CPUs.',
      'memory.max triggers OOM immediately; memory.high triggers throttling first. For burstable workloads, set memory.high < memory.max to get throttling behavior before OOM.',
      'cgroups v1 and v2 cannot run simultaneously on the same resource. Check which your distro uses: stat -fc %T /sys/fs/cgroup/ — "cgroup2fs" means v2.',
    ],
    keyQuestions: [
      {
        question: 'How does Kubernetes translate a pod resource request/limit into kernel cgroup settings?',
        answer: `**Requests** and **limits** in a pod spec map directly to cgroup v2 settings applied by the container runtime (containerd/cri-o):\n\n| Pod spec | cgroup v2 file | Effect |\n|----------|----------------|--------|\n| \`resources.limits.cpu: "500m"\` | \`cpu.max = 50000 100000\` | Hard cap: 50ms CPU per 100ms |\n| \`resources.requests.cpu: "250m"\` | \`cpu.weight\` | Proportional share for scheduling |\n| \`resources.limits.memory: "256Mi"\` | \`memory.max = 268435456\` | Hard OOM limit |\n| \`resources.requests.memory: "128Mi"\` | \`memory.high = 134217728\` | Soft throttle limit (Burstable QoS) |\n\n**QoS classes:**\n- **Guaranteed** — requests == limits for all containers. Gets highest priority.\n- **Burstable** — limits > requests. \`memory.high\` = request, \`memory.max\` = limit.\n- **BestEffort** — no requests or limits. OOM-killed first.\n\n\`\`\`bash\n# Inspect cgroup settings for a pod\ncat /sys/fs/cgroup/kubepods/pod<uid>/<container-id>/cpu.max\ncat /sys/fs/cgroup/kubepods/pod<uid>/<container-id>/memory.max\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is the main structural difference between cgroup v1 and v2?', a: 'v1 has a separate hierarchy (tree) per controller. v2 has a single unified hierarchy where all controllers coexist.' },
      { q: 'What does cpu.max "50000 100000" mean?', a: '50ms of CPU time per 100ms period — 50% of one core. Hard cap regardless of host idle capacity.' },
      { q: 'What is memory.high vs memory.max?', a: 'memory.high is a soft limit that triggers memory throttling and reclaim. memory.max is the hard limit that triggers OOM kill.' },
      { q: 'How does rootless Docker use cgroup v2 delegation?', a: 'systemd delegates a user cgroup subtree to the user session without CAP_SYS_ADMIN. Docker/Podman manages container cgroups as sub-cgroups within that delegated subtree.' },
      { q: 'What does pids.max protect against?', a: 'Fork bomb attacks. Limits the number of processes/threads in a cgroup, preventing a container from exhausting the system PID namespace.' },
      { q: 'How do you check whether a system uses cgroup v1 or v2?', a: 'Run: stat -fc %T /sys/fs/cgroup/ — "cgroup2fs" means v2, "tmpfs" means v1.' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html',
      'https://kubernetes.io/docs/concepts/architecture/cgroups/',
      'https://rootlesscontaine.rs/',
    ],
  },
  {
    id: 'linux-luks-dmcrypt',
    title: 'LUKS & dm-crypt Encryption',
    icon: 'lock',
    color: '#8b5cf6',
    questions: 5,
    description: 'Full-disk and partition encryption with dm-crypt and LUKS2, key management, TPM2 unlocking, and Kubernetes encrypted volumes.',
    visualizations: [
      { title: 'LUKS2 Stack', description: 'Block device → dm-crypt (kernel) → virtual /dev/mapper/name → filesystem. LUKS header stores key slots.', image: '/diagrams/linux/linux-luks-stack.png' },
    ],
    introduction: `**dm-crypt** is the Linux kernel's transparent block device encryption layer, built on the Device Mapper framework. **LUKS** (Linux Unified Key Setup) is the metadata format layered on top that manages key slots, algorithm parameters, and header backup.\n\n## Architecture\n\n\`\`\`\n/dev/sdb (raw block device)\n  └─ LUKS2 header (key slots, algorithm, UUID)\n       └─ dm-crypt (kernel AES-XTS encryption)\n            └─ /dev/mapper/cryptdisk (plaintext virtual device)\n                 └─ ext4 / XFS filesystem\n\`\`\`\n\n## Key Operations\n\n\`\`\`bash\n# Create LUKS2 container\ncryptsetup luksFormat --type luks2 /dev/sdb\n\n# Open (decrypt) → creates /dev/mapper/cryptdisk\ncryptsetup open /dev/sdb cryptdisk\n\n# Format and mount\nmkfs.ext4 /dev/mapper/cryptdisk\nmount /dev/mapper/cryptdisk /mnt/data\n\n# Add a second key slot (backup passphrase or TPM)\ncryptsetup luksAddKey /dev/sdb\n\n# Close on unmount\numount /mnt/data\ncryptsetup close cryptdisk\n\`\`\`\n\n## LUKS2 Improvements over LUKS1\n\n- **Argon2id** KDF (key derivation function) — memory-hard, GPU-resistant (vs PBKDF2 in LUKS1)\n- **JSON metadata** — extensible header, supports labels and tokens\n- **32 key slots** (vs 8 in LUKS1)\n- **Token plugins** — TPM2, FIDO2, Clevis for automated unlocking\n\n## Automatic Unlocking with TPM2\n\n**Clevis** + **Tang** implement Network Bound Disk Encryption (NBDE): the encryption key is sealed in the TPM2 chip and only released if the system boots in a known-good state (PCR measurements match). Useful for auto-unlock after reboot without human intervention.\n\n\`\`\`bash\nclevis luks bind -d /dev/sdb tpm2 '{\"pcr_ids\":\"7\"}'\n\`\`\``,
    whenToUse: [
      'Designing at-rest encryption for cloud VM data disks and Kubernetes PVs',
      'Explaining TPM2-based automated disk unlock for server reboots without human passphrase',
      'Auditing storage security for compliance (PCI-DSS, HIPAA) requirements',
    ],
    keyConcepts: [
      { term: 'Key slot', definition: 'LUKS stores the master key encrypted with up to 32 different passphrases/keys. Each is a separate key slot. Revoking a key slot does not require re-encrypting data.' },
      { term: 'Argon2id', definition: 'Memory-hard KDF used in LUKS2. Increases GPU/ASIC brute-force cost by requiring large amounts of RAM. Configurable memory and iteration count.' },
      { term: 'dm-crypt', definition: 'Kernel Device Mapper target that performs AES-XTS-256 encryption transparently. All reads/writes to the mapped device are automatically decrypted/encrypted.' },
      { term: 'NBDE (Network Bound Disk Encryption)', definition: 'Clevis + Tang: disk auto-unlocks only when the server can reach a Tang key server on a trusted network, preventing decryption if a disk is stolen offline.' },
    ],
    pitfalls: [
      'LUKS header is at the start of the device — a corrupted header means all data is unrecoverable. Always back up the header: cryptsetup luksHeaderBackup /dev/sdb --header-backup-file luks-header.bak',
      'AES-XTS does not authenticate (no AEAD). An attacker with physical access can flip bits in ciphertext. Use dm-integrity or dm-verity alongside for tamper detection.',
      'Wiping a LUKS volume only requires overwriting the header (the first 4MB for LUKS2) — the key material is gone, data is permanently inaccessible without decryption.',
    ],
    keyQuestions: [
      {
        question: 'How do you set up full-disk encryption on a Linux data disk, and how would you enable automatic unlocking on reboot for a server?',
        answer: `**Setup:**\n\`\`\`bash\n# 1. Format with LUKS2\ncryptsetup luksFormat --type luks2 --pbkdf argon2id /dev/sdb\n\n# 2. Open and format\ncryptsetup open /dev/sdb cryptdisk\nmkfs.xfs /dev/mapper/cryptdisk\n\n# 3. Add to /etc/crypttab for persistent mapping\necho "cryptdisk UUID=$(blkid -s UUID -o value /dev/sdb) none luks" >> /etc/crypttab\n\n# 4. Add to /etc/fstab\necho "/dev/mapper/cryptdisk /data xfs defaults 0 2" >> /etc/fstab\n\`\`\`\n\n**Automatic unlocking with TPM2 (Clevis):**\n\`\`\`bash\n# Bind LUKS slot to TPM2 PCR 7 (Secure Boot state)\nclevis luks bind -d /dev/sdb tpm2 '{\"pcr_ids\":\"7\"}'\n\n# Install dracut integration for initramfs\ndnf install clevis-dracut && dracut -f\n\`\`\`\n\nOn reboot, the initramfs runs Clevis which unseals the key from the TPM if PCR 7 matches (system booted with same Secure Boot keys). If the disk is removed or the boot chain changes, the TPM refuses to unseal — requiring manual passphrase entry.`,
      },
    ],
    quickFire: [
      { q: 'What is the difference between dm-crypt and LUKS?', a: 'dm-crypt is the kernel encryption layer. LUKS is a metadata format on top that manages key slots, algorithm parameters, and enables multiple passphrases for the same volume.' },
      { q: 'How do you add a backup passphrase to a LUKS volume?', a: 'cryptsetup luksAddKey /dev/sdb — adds a new key slot. The volume can then be unlocked with either the original or the new passphrase.' },
      { q: 'Why is Argon2id better than PBKDF2 for LUKS key derivation?', a: 'Argon2id is memory-hard — it requires large amounts of RAM, which limits GPU and ASIC brute-force speed. PBKDF2 is only compute-hard and fast to parallelize on GPUs.' },
      { q: 'What happens if the LUKS header is corrupted?', a: 'All data is permanently unrecoverable — the encrypted master key is stored only in the header. Always back up the header with: cryptsetup luksHeaderBackup /dev/sdb --header-backup-file backup.bin' },
      { q: 'What is dm-integrity and why use it with dm-crypt?', a: 'dm-integrity adds per-sector checksums for tamper detection. dm-crypt alone uses AES-XTS which encrypts but does not authenticate — an attacker can flip ciphertext bits without detection.' },
    ],
    references: [
      'https://gitlab.com/cryptsetup/cryptsetup/-/wikis/LUKS-standard',
      'https://man7.org/linux/man-pages/man8/cryptsetup.8.html',
      'https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/security_hardening/configuring-automated-unlocking-of-encrypted-volumes-using-policy-based-decryption_security-hardening',
    ],
  },
  {
    id: 'linux-vfs-overlayfs',
    title: 'VFS & OverlayFS',
    icon: 'layers',
    color: '#8b5cf6',
    questions: 5,
    description: 'Linux VFS abstraction, mount namespaces, bind mounts, OverlayFS layering for container images, and copy-on-write semantics.',
    visualizations: [
      { title: 'OverlayFS Layers', description: 'upperdir (writable) + lowerdir (read-only image layers) → merged view. Writes go to upper via copy-on-write.', image: '/diagrams/linux/linux-overlayfs-layers.png' },
    ],
    introduction: `The **Virtual File System (VFS)** is a kernel abstraction layer that provides a uniform file API (\`open\`, \`read\`, \`write\`, \`stat\`) across all filesystem types — ext4, XFS, NFS, procfs, tmpfs, and more. Every file operation passes through VFS before reaching the concrete filesystem driver.\n\n## VFS Key Concepts\n\n- **Superblock** — filesystem-wide metadata (block size, inode count)\n- **Inode** — file metadata (permissions, size, timestamps, block pointers) — no filename\n- **Dentry** — directory entry that maps a filename to an inode; cached in the dentry cache\n- **File object** — open file descriptor state (offset, flags)\n\n## Mount Namespaces\n\nMount namespaces isolate the filesystem tree. Each container gets its own mount namespace — changes to mounts inside are invisible outside. Created with \`clone(CLONE_NEWNS)\` or \`unshare --mount\`.\n\n## Bind Mounts\n\nBind mounts re-expose a directory at a second path:\n\`\`\`bash\nmount --bind /data /mnt/backup   # /mnt/backup now shows /data contents\nmount --bind --ro /etc /mnt/conf  # Read-only bind\n\`\`\`\nDocker \`-v /host/path:/container/path\` is a bind mount propagated into the container mount namespace.\n\n## OverlayFS — Container Image Layers\n\nOverlayFS stacks multiple directory trees into a unified view:\n\n\`\`\`bash\nmount -t overlay overlay \\\n  -o lowerdir=/layer2:/layer1,\\\n     upperdir=/writable,\\\n     workdir=/work \\\n  /merged\n\`\`\`\n\n- **lowerdir** — read-only base layers (Docker image layers, bottom to top separated by colons)\n- **upperdir** — read-write container layer (container writes go here)\n- **workdir** — internal kernel workspace (must be on same filesystem as upperdir)\n- **merged** — the unified view shown to the container process\n\n**Copy-on-write:** Reading a file from lowerdir is zero-copy. Writing a lower-layer file copies it to upperdir first (copy-up), then modifies it — the lower layer is unchanged.\n\n**Deletion:** A deleted lower-layer file creates a **whiteout** file in upperdir (\`char device 0,0\`) that masks the lower entry.`,
    whenToUse: [
      'Explaining how Docker image layers work and why containers share base layers efficiently',
      'Debugging "no space left on device" inside a container when the overlay upperdir is full',
      'Designing efficient CI build caches using overlayfs layer reuse',
    ],
    keyConcepts: [
      { term: 'Copy-up', definition: 'When a container writes to a file that exists only in a lower (image) layer, OverlayFS copies the entire file to upperdir first, then applies the write. First write is expensive; subsequent writes are fast.' },
      { term: 'Whiteout', definition: 'A special character device (0,0) created in upperdir to mask a deleted file in lowerdir. The merged view hides the lower file.' },
      { term: 'Mount namespace', definition: 'A per-process isolation of the filesystem tree. Containers use separate mount namespaces so their mounts do not affect the host.' },
      { term: 'Dentry cache', definition: 'Kernel cache of directory entries (name → inode mappings). High dentry cache usage indicates many small file operations or a large directory tree.' },
    ],
    pitfalls: [
      'Copy-up happens on the first write and copies the entire file. Writing one byte to a 1GB file triggers a 1GB copy-up — avoid large files in image layers.',
      'The upperdir filesystem determines available space for container writes. A full overlay device shows "no space" inside the container even if other disks have space.',
      'Layers must be on the same filesystem type (OverlayFS restriction). Mounting upperdir on a different fs type than lowerdir requires native overlay2 support.',
    ],
    keyQuestions: [
      {
        question: 'How does Docker use OverlayFS to share base image layers between containers, and what happens when a container writes to a file?',
        answer: `Each Docker image layer is stored as a directory on disk (\`/var/lib/docker/overlay2/<layer-id>/diff/\`). When a container starts, Docker mounts an OverlayFS combining:\n\n- **lowerdir** — all image layers stacked (most recent on top)\n- **upperdir** — an empty per-container directory for writes\n- **workdir** — OverlayFS internal use\n- **merged** — the view shown to the container\n\n**Sharing:** Multiple containers using the same image share identical lowerdir layers (they are read-only). Only the upperdir is unique per container. A 1GB image layer stored once can be shared across 100 containers.\n\n**Write path:**\n1. Container process writes to \`/app/config.yaml\` (exists in an image layer)\n2. Kernel detects the file is in lowerdir\n3. **Copy-up**: copies entire \`config.yaml\` from lowerdir to upperdir\n4. Write applied to upperdir copy\n5. Subsequent reads/writes go directly to upperdir (fast path)\n\n**Inspection:**\n\`\`\`bash\n# See what a container has written\ndocker diff <container-id>\n\n# Inspect overlay mount\ncat /proc/$(docker inspect --format '{{.State.Pid}}' <id>)/mounts | grep overlay\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What is a bind mount and how does Docker use it?', a: 'A bind mount exposes a host directory at a second path. Docker -v /host:/container creates a bind mount propagated into the container mount namespace.' },
      { q: 'What is copy-up in OverlayFS?', a: 'When a container writes to a read-only lower-layer file, OverlayFS copies the entire file to the writable upperdir before applying the write. The lower layer is never modified.' },
      { q: 'What is a whiteout file in OverlayFS?', a: 'A character device (major=0, minor=0) created in upperdir to mask a deleted file in lowerdir. The merged view hides the lower file as if it were deleted.' },
      { q: 'Why do containers share Docker image layers efficiently?', a: 'Image layers are read-only lowerdirs shared across all containers using that image. Only the per-container upperdir is unique. A 1GB base layer is stored once regardless of container count.' },
      { q: 'How do you inspect what a running container has written to its filesystem?', a: 'docker diff <container-id> — lists files added (A), changed (C), or deleted (D) in the container layer.' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/filesystems/overlayfs.html',
      'https://docs.docker.com/storage/storagedriver/overlayfs-driver/',
      'https://man7.org/linux/man-pages/man8/mount.8.html',
    ],
  },
  {
    id: 'linux-use-method',
    title: 'USE Method & Flame Graphs',
    icon: 'activity',
    color: '#f97316',
    questions: 6,
    description: 'Brendan Gregg USE Method for resource analysis, flame graph interpretation, off-CPU analysis, and production perf workflow.',
    visualizations: [
      { title: 'USE Method Checklist', description: 'CPU: utilization (top/mpstat) → saturation (runqlat) → errors (perf/dmesg). Memory, disk, network same pattern.', image: '/diagrams/linux/linux-use-method.png' },
      { title: 'Flame Graph Anatomy', description: 'x-axis = time (stack samples), y-axis = stack depth, width = time in function. Flat tops = CPU bottleneck.', image: '/diagrams/linux/linux-flame-graph.png' },
    ],
    introduction: `## USE Method\n\nBrendan Gregg's **USE Method** provides a systematic checklist for resource performance analysis. For every resource, measure:\n\n- **U — Utilization** — time resource was busy (0-100%). High utilization doesn't always mean saturation.\n- **S — Saturation** — work queued that cannot be serviced (run queue depth, I/O queue depth). Saturation causes latency.\n- **E — Errors** — hardware or software errors (disk errors, dropped packets, CPU machine checks).\n\n**Resources to check:** CPU, memory, network interfaces, storage devices, controllers, interconnects.\n\n\`\`\`bash\n# CPU utilization\nmpstat -P ALL 1\n\n# CPU saturation (run queue latency)\nbpftrace -e 'tracepoint:sched:sched_stat_wait { @us = hist(args->delay/1000); }'\n\n# Memory utilization\nfree -m\n\n# Memory saturation (paging/swapping)\nvmstat 1 | awk '{print $7,$8}'  # si/so columns\n\n# Disk utilization and saturation\niostat -xz 1\n\n# Network errors\nip -s link\nnetstat -s | grep -i error\n\`\`\`\n\n## Flame Graphs\n\nFlame graphs visualize **stack traces over time**, showing where CPUs spend their time:\n\n- **x-axis** — alphabetical (not time). Width = proportion of CPU samples in that function.\n- **y-axis** — stack depth. Bottom = on-CPU, top = leaf function.\n- **Wide flat tops** — the function where CPU is spending time (the bottleneck).\n- **Wide bases** — a common code path.\n\n\`\`\`bash\n# Capture perf data\nperf record -F 99 -ag -- sleep 30\n\n# Generate flame graph\nperf script | ./FlameGraph/stackcollapse-perf.pl | ./FlameGraph/flamegraph.pl > flame.svg\n\n# eBPF-based (no perf overhead)\nbpftrace -e 'profile:hz:99 { @[kstack] = count(); }'\n\`\`\`\n\n## Off-CPU Analysis\n\nOn-CPU flame graphs miss time spent **blocked** (waiting for I/O, locks, sleep). Off-CPU analysis captures time processes spend not executing:\n\n\`\`\`bash\n# bpftrace off-CPU time per process\nbpftrace -e 'tracepoint:sched:sched_switch {\n  if (args->prev_state) @offcpu[args->prev_comm] = count(); }'\n\`\`\``,
    whenToUse: [
      'Systematically triaging a performance problem on an unfamiliar system',
      'Identifying which function is consuming the most CPU time in a service',
      'Explaining why a service has high latency despite low CPU utilization (off-CPU / I/O wait)',
    ],
    keyConcepts: [
      { term: 'Utilization vs Saturation', definition: 'A disk at 70% utilization has headroom. The same disk with a queue depth of 32 (saturation) causes queuing latency even at 70% utilization. Both metrics are needed.' },
      { term: 'Flame graph width', definition: 'Width of a frame represents the proportion of CPU samples where that function was on the call stack. The widest frames at the top of the y-axis are bottlenecks.' },
      { term: 'Off-CPU time', definition: 'Time a thread is descheduled — waiting for I/O, sleeping, or blocked on a lock. Not visible in CPU flame graphs. Requires scheduler event tracing (sched_switch tracepoint).' },
      { term: 'iowait (%wa)', definition: 'Time CPUs are idle but at least one process is blocked waiting for I/O. High iowait means storage is the bottleneck, not the CPU.' },
    ],
    pitfalls: [
      'High CPU utilization alone is not a problem — a system at 95% CPU with no run queue latency is working efficiently. Check saturation (run queue length) for actual impact.',
      'On-CPU flame graphs miss lock contention and I/O wait. Always run off-CPU analysis for latency problems that are not explained by on-CPU time.',
      'perf record with frame pointers disabled (-fomit-frame-pointer) produces broken stacks. Use --call-graph dwarf or compile with -fno-omit-frame-pointer.',
    ],
    keyQuestions: [
      {
        question: 'Walk through how you would diagnose a production service with high latency but low CPU usage.',
        answer: `Low CPU + high latency = the service is waiting for something, not computing. Follow the USE Method:\n\n**Step 1: CPU saturation check**\n\`\`\`bash\n# Run queue latency — are threads waiting to get on CPU?\nsar -q 1 5   # runq-sz > 1 indicates CPU saturation\nmpstat -P ALL 1\n\`\`\`\n\n**Step 2: Memory saturation**\n\`\`\`bash\nvmstat 1   # si/so > 0 means swapping — severe latency impact\nfree -m    # check available vs buff/cache\n\`\`\`\n\n**Step 3: Disk saturation**\n\`\`\`bash\niostat -xz 1   # await > 10ms = disk latency. %util near 100 = saturated.\n\`\`\`\n\n**Step 4: Network errors**\n\`\`\`bash\nip -s link show eth0   # RX/TX errors, drops\nnetstat -s | grep retransmit\n\`\`\`\n\n**Step 5: Off-CPU flame graph**\n\`\`\`bash\n# Find what the service threads are blocked on\npid=$(pgrep myservice)\noffcputime-bpfcc -p $pid 30 | flamegraph.pl > offcpu.svg\n\`\`\`\n\nCommon findings: database queries (off-CPU waiting on network), lock contention (off-CPU waiting on futex), GC pauses (off-CPU in GC thread), or slow NFS/EBS mount.`,
      },
    ],
    quickFire: [
      { q: 'What do U, S, E stand for in the USE Method?', a: 'Utilization (how busy), Saturation (how much work is queued), Errors (hardware/software errors).' },
      { q: 'In a flame graph, what does a wide flat top indicate?', a: 'The function where CPU time is being spent — it is the bottleneck. Wide = large proportion of total CPU samples.' },
      { q: 'What is off-CPU analysis and why is it needed?', a: 'Off-CPU analysis captures time threads spend blocked (on I/O, locks, sleep). On-CPU flame graphs only show compute time, missing blocked latency entirely.' },
      { q: 'A system has 80% iowait. What does that mean?', a: 'CPUs are idle 80% of the time because processes are blocked waiting for I/O. Storage is the bottleneck. Check iostat -xz for the saturated device.' },
      { q: 'What perf option captures call stacks when frame pointers are missing?', a: 'perf record --call-graph dwarf — uses DWARF debug info for unwinding instead of frame pointers.' },
      { q: 'What is the difference between disk utilization and disk saturation?', a: 'Utilization is % of time the disk is busy. Saturation is the queue depth — requests waiting. A disk can be 60% utilized but heavily saturated with a queue depth of 50, causing high latency.' },
    ],
    references: [
      'https://www.brendangregg.com/usemethod.html',
      'https://www.brendangregg.com/flamegraphs.html',
      'https://www.brendangregg.com/offcpuanalysis.html',
    ],
  },
  {
    id: 'linux-ldap-sssd',
    title: 'LDAP & sssd Integration',
    icon: 'users',
    color: '#ef4444',
    questions: 5,
    description: 'Centralized authentication with LDAP/Active Directory via sssd, PAM integration, and Kerberos SSO for Linux hosts.',
    visualizations: [
      { title: 'sssd Authentication Stack', description: 'Login → PAM → sssd daemon → LDAP/AD/Kerberos → local cache. Offline mode serves from cache.', image: '/diagrams/linux/linux-sssd-stack.png' },
    ],
    introduction: `**sssd** (System Security Services Daemon) is the standard Linux daemon for integrating with centralized identity providers: LDAP, Active Directory, FreeIPA, and Kerberos. It caches identity and authentication data so Linux hosts can authenticate users even when the directory server is temporarily unreachable.\n\n## Components\n\n- **sssd** — main daemon. Spawns per-domain provider processes.\n- **PAM** — pluggable authentication modules. \`pam_sss.so\` hooks login, sudo, and SSH into sssd.\n- **NSS** — name service switch. \`nss_sss\` resolves usernames/groups via sssd.\n- **Kerberos** — sssd can obtain Kerberos tickets on login for SSO to other services.\n\n## Configuration\n\n\`\`\`ini\n# /etc/sssd/sssd.conf\n[sssd]\ndomains = corp.example.com\nservices = nss, pam\n\n[domain/corp.example.com]\nid_provider = ldap\nauth_provider = krb5\nldap_uri = ldap://dc1.corp.example.com\nldap_search_base = dc=corp,dc=example,dc=com\nkrb5_realm = CORP.EXAMPLE.COM\ncache_credentials = true\noffline_credentials_expiration = 7\n\`\`\`\n\n## Active Directory Integration\n\nFor AD, use \`id_provider = ad\` which automatically discovers DCs via DNS SRV records, handles Kerberos, and maps AD groups to Linux groups:\n\n\`\`\`bash\n# Join AD domain (requires kerberos ticket or admin password)\nrealm join --user=Administrator corp.example.com\n\n# Verify user lookup\nid user@corp.example.com\ngetent passwd user@corp.example.com\n\n# Test auth\nsss_client user@corp.example.com\n\`\`\`\n\n## Offline Caching\n\nWith \`cache_credentials = true\`, sssd stores hashed credentials. Users can authenticate for \`offline_credentials_expiration\` days without reaching the directory server. Cached credentials are stored in \`/var/lib/sss/db/\` (SQLite, root-only).`,
    whenToUse: [
      'Designing centralized Linux authentication for a fleet of servers joining Active Directory',
      'Explaining how Kubernetes node authentication integrates with corporate LDAP',
      'Debugging "user not found" or slow logins on Linux servers joined to AD',
    ],
    keyConcepts: [
      { term: 'PAM (pam_sss.so)', definition: 'PAM module that delegates authentication decisions to sssd. Inserted in PAM stack for password, sudo, and SSH authentication.' },
      { term: 'NSS (nss_sss)', definition: 'Name Service Switch plugin. Resolves getpwnam(), getgrnam() calls against sssd cache. Enables id user@domain to work.' },
      { term: 'Credential caching', definition: 'sssd stores hashed credentials locally. Users can authenticate offline for a configurable number of days. Mitigates AD outages.' },
      { term: 'realm join', definition: 'Discovers the AD domain via DNS, creates a computer account in AD, configures Kerberos (krb5.conf), and writes sssd.conf automatically.' },
    ],
    pitfalls: [
      'sssd.conf must be chmod 600 and owned by root — sssd refuses to start with world-readable config.',
      'Large LDAP groups (10k+ members) can cause slow group lookups. Use ldap_group_member_search_base to scope group lookups or enable enumerate = false.',
      'Clock skew > 5 minutes causes Kerberos authentication failures. Ensure ntpd/chrony is running and synchronized to the domain time source.',
    ],
    keyQuestions: [
      {
        question: 'Explain how sssd integrates Linux authentication with Active Directory and what happens when the AD server is unreachable.',
        answer: `**Join flow:**\n1. \`realm join corp.example.com\` discovers DCs via DNS SRV: \`_ldap._tcp.corp.example.com\`\n2. Creates a **computer account** in AD for the Linux host\n3. Writes \`/etc/krb5.conf\` and \`/etc/sssd/sssd.conf\`\n4. Configures PAM (\`/etc/pam.d/\`) to include \`pam_sss.so\`\n5. Configures NSS (\`/etc/nsswitch.conf\`) to include \`sss\`\n\n**Authentication flow:**\n1. User types password at login\n2. PAM calls \`pam_sss.so\`\n3. sssd checks local cache — if cached and not expired, validates against hashed credential\n4. If not cached or expired, contacts AD via Kerberos (AS-REQ/AS-REP) or LDAP bind\n5. On success, sssd creates a local session and optionally obtains a TGT for SSO\n\n**Offline operation:**\nWith \`cache_credentials = true\`:\n- sssd stores a hash of the password in SQLite under \`/var/lib/sss/db/\`\n- Users can authenticate for \`offline_credentials_expiration\` days without AD\n- Group memberships are served from the last successful cache refresh\n- New users or users who have never logged in cannot authenticate offline\n\n\`\`\`bash\n# Check sssd cache status\nsss_cache -E   # expire all cache (force AD lookup)\nsssctl user-status user@corp.example.com\n\`\`\``,
      },
    ],
    quickFire: [
      { q: 'What does sssd cache and why?', a: 'Identity data (users, groups) and hashed credentials from LDAP/AD. Cached so authentication works offline and repeated lookups do not hammer the directory server.' },
      { q: 'What file permissions does sssd.conf require?', a: '600 (rw-------) owned by root. sssd refuses to start if the config is group- or world-readable.' },
      { q: 'What causes Kerberos auth failures after sssd is configured?', a: 'Clock skew > 5 minutes between the Linux host and the KDC. Ensure chrony or ntpd is synced to the domain time source.' },
      { q: 'What command verifies a user is resolvable via sssd?', a: 'getent passwd user@domain — uses NSS (nss_sss) to query sssd. If this works, PAM authentication should also work.' },
      { q: 'How do you force sssd to re-fetch user data from AD?', a: 'sss_cache -u username — expires the cache entry and forces a fresh lookup on next access. Or sss_cache -E to expire everything.' },
    ],
    references: [
      'https://sssd.io/docs/',
      'https://www.freedesktop.org/software/realmd/docs/',
      'https://man7.org/linux/man-pages/man8/sssd.8.html',
    ],
  },
  {
    id: 'linux-ftrace-bpftrace',
    title: 'ftrace & bpftrace Tracing',
    icon: 'search',
    color: '#f97316',
    questions: 5,
    description: 'Kernel function tracing with ftrace, event tracing, bpftrace one-liners for production observability without kernel modules.',
    visualizations: [
      { title: 'ftrace vs bpftrace Layers', description: 'ftrace: tracefs interface → ring buffer → trace_pipe output. bpftrace: BPF program → map → user-space aggregation.', image: '/diagrams/linux/linux-ftrace-layers.png' },
    ],
    introduction: `## ftrace\n\n**ftrace** is the Linux kernel's built-in tracing framework, accessible through the **tracefs** virtual filesystem at \`/sys/kernel/debug/tracing/\` (or \`/sys/kernel/tracing/\` on modern kernels).\n\n### Key ftrace Tracers\n\n| Tracer | Use |\n|--------|-----|\n| \`function\` | Traces every kernel function call — very high overhead |\n| \`function_graph\` | Traces entry and exit with call graph indentation |\n| \`nop\` | Disables tracing (default) |\n| \`blk\` | Block I/O events |\n\n### Basic ftrace Usage\n\n\`\`\`bash\n# Set tracer to function_graph, filter to tcp functions\ncd /sys/kernel/debug/tracing\necho function_graph > current_tracer\necho \"tcp_*\" > set_ftrace_filter\necho 1 > tracing_on\ncat trace_pipe   # live output\necho 0 > tracing_on\necho nop > current_tracer   # reset\n\`\`\`\n\n### trace-cmd (ftrace frontend)\n\n\`\`\`bash\n# Record for 5 seconds\ntrace-cmd record -p function_graph -g tcp_connect sleep 5\ntrace-cmd report   # analyze saved trace\n\`\`\`\n\n## bpftrace\n\n**bpftrace** is a high-level scripting language for eBPF tracing. Programs are compiled to BPF bytecode at runtime.\n\n### Probe Types\n\n| Type | Syntax | Use |\n|------|--------|-----|\n| kprobe | \`kprobe:tcp_connect\` | Kernel function entry |\n| kretprobe | \`kretprobe:tcp_connect\` | Kernel function return |\n| tracepoint | \`tracepoint:syscalls:sys_enter_read\` | Stable kernel events |\n| uprobe | \`uprobe:/bin/bash:readline\` | User-space function |\n| profile | \`profile:hz:99\` | CPU sampling |\n\n### Practical One-liners\n\n\`\`\`bash\n# System call counts by process\nbpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'\n\n# Read/write latency histogram\nbpftrace -e 'kprobe:vfs_read { @start[tid] = nsecs; }\n  kretprobe:vfs_read /@start[tid]/ {\n    @us = hist((nsecs - @start[tid]) / 1000); delete(@start[tid]); }'\n\n# DNS query tracing (user-space probe)\nbpftrace -e 'uprobe:/lib/x86_64-linux-gnu/libc.so.6:getaddrinfo { printf(\"%s\\n\", str(arg0)); }'\n\n# TCP retransmits\nbpftrace -e 'kprobe:tcp_retransmit_skb { @[comm] = count(); }'\n\`\`\``,
    whenToUse: [
      'Tracing kernel function calls to debug an obscure I/O or networking issue without rebooting',
      'Writing custom observability that captures exactly the event and data needed',
      'Measuring syscall latency for a specific process in production without code changes',
    ],
    keyConcepts: [
      { term: 'tracefs', definition: 'Virtual filesystem mounted at /sys/kernel/debug/tracing/. ftrace is controlled by reading/writing files: current_tracer, set_ftrace_filter, tracing_on, trace_pipe.' },
      { term: 'function_graph tracer', definition: 'Traces kernel function entry and exit with indentation showing the call graph. Shows duration of each call. Use with set_graph_function to filter.' },
      { term: 'kprobe vs tracepoint', definition: 'kprobes attach to arbitrary kernel functions (fragile — break across versions). Tracepoints are stable kernel interfaces with stable argument names — prefer tracepoints for long-lived scripts.' },
      { term: 'bpftrace @maps', definition: 'BPF maps used to aggregate data. @[key] = count() builds a frequency map. @var = hist(value) builds a power-of-2 histogram. Printed on Ctrl+C.' },
    ],
    pitfalls: [
      'Enabling the function tracer without a filter traces ALL kernel functions — this causes 10-100x overhead and can make the system unresponsive. Always set set_ftrace_filter first.',
      'kprobe targets break silently across kernel versions — if the symbol is renamed, bpftrace reports "no probes". Check with: bpftrace -l "kprobe:tcp_*"',
      'bpftrace scripts running as non-root need CAP_BPF and CAP_PERFMON since kernel 5.8. Earlier kernels require CAP_SYS_ADMIN.',
    ],
    keyQuestions: [
      {
        question: 'How would you trace what system calls a specific process is making in production without using strace?',
        answer: `**strace problem:** strace uses ptrace which serializes every syscall through the tracer — it adds significant overhead (2-10x slowdown for syscall-heavy processes). Avoid in production.\n\n**bpftrace alternative (near-zero overhead):**\n\`\`\`bash\n# Count syscalls by name for a specific PID\npid=$(pgrep myservice)\nbpftrace -e "tracepoint:raw_syscalls:sys_enter /pid == $pid/ { @[ksym(args->id)] = count(); }"\n\n# Trace with arguments (slower, use carefully)\nbpftrace -e "tracepoint:syscalls:sys_enter_openat /pid == $pid/ {\n  printf(\"%s\\n\", str(args->filename)); }"\n\`\`\`\n\n**ftrace alternative:**\n\`\`\`bash\n# Trace syscalls for a PID using perf trace (perf-based, lower overhead than strace)\nperf trace -p $pid --no-syscalls -e 'syscalls:*' -- sleep 10\n\`\`\`\n\n**Overhead comparison:**\n- strace: 2-10x CPU overhead per syscall (ptrace stops process)\n- bpftrace tracepoint: ~50ns per event, runs in kernel context\n- perf trace: similar to bpftrace, uses perf_event_open`,
      },
    ],
    quickFire: [
      { q: 'What file do you write to in tracefs to limit which functions ftrace instruments?', a: 'set_ftrace_filter — write a glob like "tcp_*" to instrument only matching functions. Without this, the function tracer instruments ALL kernel functions.' },
      { q: 'Why prefer tracepoints over kprobes for production scripts?', a: 'Tracepoints are stable kernel interfaces with documented argument names. kprobes target internal function names that can change or disappear between kernel versions.' },
      { q: 'What does bpftrace @[comm] = count() do?', a: 'Builds a frequency map keyed by process name (comm), counting how many times each process triggered the probe. Printed as a sorted table on Ctrl+C.' },
      { q: 'Why is strace dangerous in production?', a: 'strace uses ptrace which serializes system calls through the tracer process, adding 2-10x overhead. bpftrace uses eBPF which runs in-kernel with nanosecond-level overhead.' },
      { q: 'What is trace-cmd?', a: 'A userspace frontend for ftrace that simplifies record/report workflow. Reads/writes tracefs files and saves traces to binary files for offline analysis.' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/trace/ftrace.html',
      'https://github.com/iovisor/bpftrace/blob/master/docs/reference_guide.md',
      'https://www.brendangregg.com/bpf-performance-tools-book.html',
    ],
  },
  {
    id: 'linux-numa',
    title: 'NUMA Topology & Memory Policy',
    icon: 'cpu',
    color: '#f97316',
    questions: 5,
    description: 'NUMA architecture, memory node locality, numactl policies, and NUMA-aware tuning for latency-sensitive workloads.',
    visualizations: [
      { title: 'NUMA Topology', description: 'Two sockets → two NUMA nodes. Local memory access ~60ns, remote (cross-QPI) ~120ns. CPU-to-memory distance matrix.', image: '/diagrams/linux/linux-numa-topology.png' },
    ],
    introduction: `**NUMA** (Non-Uniform Memory Access) is the memory architecture of modern multi-socket servers. Each processor socket has local RAM — access to local memory is ~60ns, access to RAM on another socket (via QPI/UPI interconnect) is ~120ns or higher.\n\n## Why NUMA Matters\n\nA process pinned to CPU 0 that allocates memory on NUMA node 1 incurs remote memory latency on every access. At scale, this causes throughput degradation and latency spikes invisible to top/htop.\n\n## Viewing NUMA Topology\n\n\`\`\`bash\n# Show NUMA nodes and CPU assignments\nnumactl --hardware\n\n# Show memory distance matrix (100=local, 200=remote approx)\nnuma_maps or numactl -H\n\n# Which NUMA node is a process using?\ncat /proc/<pid>/numa_maps\n\n# Check NUMA statistics\nnumastat\n\n# See NUMA topology via lscpu\nlscpu | grep -i numa\n\`\`\`\n\n## Memory Allocation Policies\n\n| Policy | Behavior |\n|--------|----------|\n| \`local\` (default) | Allocate from the node where the requesting CPU runs |\n| \`preferred <node>\` | Prefer node N, fall back to others if full |\n| \`bind <node>\` | Allocate only from node N — fail if insufficient |\n| \`interleave\` | Round-robin across nodes — maximizes bandwidth |\n\n## numactl Usage\n\n\`\`\`bash\n# Run a process pinned to NUMA node 0 (CPUs + memory)\nnumactl --cpunodebind=0 --membind=0 ./myapp\n\n# Interleave memory for a database (max bandwidth)\nnumactl --interleave=all /usr/bin/mysqld\n\n# Check if existing process is NUMA-local\ncat /proc/$(pgrep redis)/numa_maps | grep anon\n\`\`\`\n\n## Kubernetes and NUMA\n\nKubernetes Topology Manager (\`--topology-manager-policy=single-numa-node\`) ensures CPU and memory allocations for Guaranteed QoS pods are colocated on a single NUMA node, critical for latency-sensitive HPC and telco workloads. Check with:\n\`\`\`bash\nkubectl describe node | grep -A5 Topology\n\`\`\``,
    whenToUse: [
      'Diagnosing unexpected latency on a multi-socket server despite low overall CPU/memory usage',
      'Tuning database servers (Redis, PostgreSQL, MySQL) for maximum memory throughput',
      'Explaining Kubernetes Topology Manager for latency-sensitive Guaranteed pods',
    ],
    keyConcepts: [
      { term: 'NUMA node', definition: 'A group of CPUs and their directly attached memory. Access to local memory is ~2x faster than remote (cross-socket via QPI/UPI) memory.' },
      { term: 'numastat', definition: 'Shows per-node memory allocations and NUMA miss counters. High numa_foreign or other_node counts indicate remote memory access.' },
      { term: 'Topology Manager', definition: 'Kubernetes component that aligns CPU, memory, and device (RDMA/GPU) allocations to a single NUMA node for Guaranteed QoS pods.' },
      { term: 'Interleave policy', definition: 'Distributes memory pages round-robin across NUMA nodes. Trades locality for aggregate bandwidth — good for large working sets that exceed one node.' },
    ],
    pitfalls: [
      'Linux defaults to local allocation — but if the local node is full, it silently falls back to remote nodes. numastat shows if this is happening (numa_foreign counter).',
      'Container runtimes do not set NUMA policy by default. A container can allocate remote memory even if the CPU is pinned. Use numactl in the entrypoint or Topology Manager.',
      'Interleave policy reduces latency variance but does not reduce average latency for single-thread workloads. Use bind for low-latency, interleave for high-throughput.',
    ],
    keyQuestions: [
      {
        question: 'A Redis instance on a 2-socket server shows unexpectedly high latency at moderate load. How does NUMA factor in and how do you diagnose?',
        answer: `**NUMA effect on Redis:** Redis is single-threaded for commands. If the Redis process runs on CPU socket 0 but its memory was allocated on socket 1 (remote), every memory access costs ~120ns instead of ~60ns — effectively halving memory bandwidth.\n\n**Diagnosis:**\n\`\`\`bash\n# 1. Check NUMA topology\nnumactl --hardware\n\n# 2. Check where Redis memory is allocated\ncat /proc/$(pgrep redis)/numa_maps | head -20\n# Look for: N0=X N1=Y — high N1 on a node-0 CPU = remote allocation\n\n# 3. Check NUMA miss counters\nnumastat -p redis\n# numa_foreign > 0 = remote allocations happening\n\n# 4. Check which CPUs Redis is using\npid=$(pgrep redis)\ncat /proc/$pid/status | grep Cpu\nls /sys/devices/system/cpu/cpu*/topology/core_id\n\`\`\`\n\n**Fix:**\n\`\`\`bash\n# Restart Redis pinned to NUMA node 0 (CPU + memory)\nnumactl --cpunodebind=0 --membind=0 redis-server /etc/redis/redis.conf\n\n# Verify: numa_foreign should now be 0\nnumastat -p redis\n\`\`\`\n\n**Alternative:** Use \`taskset\` to pin CPUs, but still need \`numactl --membind\` for memory locality. taskset alone does not set memory policy.`,
      },
    ],
    quickFire: [
      { q: 'What is the typical latency difference between local and remote NUMA memory access?', a: 'Local: ~60-80ns. Remote (cross-QPI/UPI): ~120-160ns — roughly 2x slower. The exact ratio depends on socket interconnect speed.' },
      { q: 'What does numastat show?', a: 'Per-NUMA-node memory allocation statistics including numa_hit (local), numa_miss (needed local but fell back to remote), and numa_foreign (allocated remotely).' },
      { q: 'What is the Kubernetes Topology Manager?', a: 'A kubelet policy component that ensures CPU, memory, and devices (GPU/RDMA) for Guaranteed QoS pods are co-located on a single NUMA node to minimize remote access latency.' },
      { q: 'When should you use interleave NUMA policy vs bind?', a: 'Interleave: large datasets where aggregate bandwidth matters more than individual access latency (e.g., large in-memory databases, analytics). Bind: latency-sensitive single-threaded apps (e.g., Redis, real-time processing).' },
      { q: 'What command runs a process pinned to NUMA node 0 for both CPU and memory?', a: 'numactl --cpunodebind=0 --membind=0 ./myapp' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/admin-guide/mm/numa_memory_policy.html',
      'https://man7.org/linux/man-pages/man8/numactl.8.html',
      'https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/',
    ],
  },
  {
    id: 'linux-swap',
    title: 'Swap Management & Tuning',
    icon: 'refresh-cw',
    color: '#8b5cf6',
    questions: 5,
    description: 'Swap partitions vs swapfiles, swappiness tuning, zswap, and why swap matters even with large RAM on modern Linux systems.',
    visualizations: [
      { title: 'Linux Memory Hierarchy', description: 'Registers → L1/L2/L3 cache → RAM → swap (disk). Swappiness controls when Linux moves anonymous pages to swap vs reclaiming page cache.', image: '/diagrams/linux/linux-swap-hierarchy.png' },
    ],
    introduction: `**Swap** is disk space used as an overflow for RAM. Linux uses swap not only when RAM is exhausted but also proactively to free RAM for file cache — controlled by the **swappiness** kernel parameter.\n\n## Types of Swap\n\n- **Swap partition** — dedicated partition, kernel writes directly (slightly faster)\n- **Swap file** — regular file on any filesystem (on ext4/XFS; btrfs has restrictions). Flexible, resizable without partition tools.\n- **zswap** — a compressed in-RAM cache for swap pages. Compresses pages before writing to disk, reducing I/O. Transparent to applications.\n\n## Key Parameters\n\n### vm.swappiness (0-200, default 60)\n\n- **60** (default) — kernel proactively reclaims anonymous pages to swap when under memory pressure\n- **0** — avoid swap unless absolutely necessary (OOM risk increases)\n- **1** — minimal swap, use mostly for OOM prevention\n- **100** — swap anonymous memory as aggressively as page cache reclaim\n- **> 100** — cgroup v2 only: allows swapping anonymous pages before page cache reclaim\n\n### vm.vfs_cache_pressure (default 100)\n\nControls how aggressively the kernel reclaims dentry/inode cache vs anonymous memory. Higher = more aggressive inode cache reclaim (good for systems with millions of files).\n\n## Creating Swap\n\n\`\`\`bash\n# Swapfile\nfallocate -l 4G /swapfile   # or: dd if=/dev/zero of=/swapfile bs=1M count=4096\nchmod 600 /swapfile\nmkswap /swapfile\nswapon /swapfile\n\n# Persist in /etc/fstab\necho '/swapfile none swap sw 0 0' >> /etc/fstab\n\n# Check active swap\nswapon --show\nfree -h\n\`\`\`\n\n## zswap\n\n\`\`\`bash\n# Enable zswap (LZ4 compressor, z3fold allocator)\necho 1 > /sys/module/zswap/parameters/enabled\necho lz4 > /sys/module/zswap/parameters/compressor\necho z3fold > /sys/module/zswap/parameters/zpool\n\n# Stats\ncat /sys/kernel/debug/zswap/pool_total_size\ngrep zswap /proc/vmstat\n\`\`\`\n\n## Monitoring Swap\n\n\`\`\`bash\nvmstat 1        # si= swap-in, so= swap-out (KB/s)\nsar -B 1        # pgscank/s, pgsteal/s\niostat -x 1    # high write to swap device = swapping\ncatt /proc/meminfo | grep -i swap\n\`\`\``,
    whenToUse: [
      'Explaining why swap is still needed on systems with large RAM (OOM prevention, memory overcommit)',
      'Tuning swappiness for database workloads where swap latency is unacceptable',
      'Designing a cloud VM disk layout that includes swap without a dedicated partition',
    ],
    keyConcepts: [
      { term: 'swappiness', definition: 'Sysctl parameter (vm.swappiness, 0-200). Controls the trade-off between swapping anonymous memory and reclaiming page cache. Default 60. Set to 1-10 for latency-sensitive workloads.' },
      { term: 'Anonymous memory', definition: 'Process heap, stack, and mmap(MAP_ANONYMOUS) allocations — not backed by a file. Can only be saved to swap. Unlike file-backed pages, cannot be simply dropped from RAM.' },
      { term: 'zswap', definition: 'In-kernel compressed cache for swap pages. Compresses pages in RAM before writing to disk. Reduces swap I/O at the cost of CPU. Dramatically reduces latency compared to raw disk swap.' },
      { term: 'Swap priority', definition: 'Multiple swap devices can be active with different priorities. Higher priority swap is used first. Set with swapon -p <priority>. Use SSD swap at higher priority than HDD.' },
    ],
    pitfalls: [
      'Setting swappiness=0 on a system with no swap causes the OOM killer to fire more aggressively when memory is tight. Recommended: swappiness=1 (not 0) to retain OOM safety valve.',
      'Kubernetes recommends disabling swap entirely (or using swap=LimitedSwap feature gate) because swap memory is not accounted in cgroup memory limits, causing OOM behavior to be unpredictable.',
      'Swap on btrfs has restrictions — use swapfile only on single-device btrfs with no compression or CoW. The safer option is a separate ext4 partition or using a loop device.',
    ],
    keyQuestions: [
      {
        question: 'Why should you have swap enabled even on a server with 256GB of RAM, and how do you tune it to minimize latency impact?',
        answer: `**Reasons for swap on large-RAM servers:**\n\n1. **OOM safety valve** — without swap, the kernel OOM killer fires as soon as RAM is exhausted. With swap, it writes cold pages to disk first, buying time and preventing cascading kills.\n\n2. **Anonymous page migration** — even at 90% RAM utilization, some processes have cold heap pages that haven't been accessed in hours. Swapping these out frees RAM for hot data without OOM.\n\n3. **Memory overcommit** — Linux allows applications to allocate more virtual memory than physical RAM (overcommit). Swap backs overcommitted pages that are actually written.\n\n**Tuning for minimal latency impact:**\n\n\`\`\`bash\n# Set swappiness low — only swap under real pressure\nsysctl -w vm.swappiness=1\n\n# Enable zswap to compress before hitting disk\necho 1 > /sys/module/zswap/parameters/enabled\necho lz4 > /sys/module/zswap/parameters/compressor\n\n# Use SSD/NVMe swap, not HDD\n# Verify: swapon --show -- check Type column\n\n# Monitor: if so (swap-out) in vmstat is consistently > 0, tune app memory\nvmstat 1 | awk '{print $7, $8}'   # si= in, so= out\n\`\`\`\n\n**Database servers specifically:** Set \`swappiness=1\` and use huge pages for the buffer pool (innodb_buffer_pool_size / shared_buffers locked in RAM with mlock). This ensures the DB working set never swaps while still having a swap safety net.`,
      },
    ],
    quickFire: [
      { q: 'What does vm.swappiness=0 do?', a: 'Tells the kernel to avoid swapping unless absolutely necessary (OOM imminent). Does not disable swap entirely. Swappiness=1 is safer — retains swap as an OOM safety valve.' },
      { q: 'What is zswap?', a: 'An in-kernel compressed cache for swap pages. Instead of writing directly to disk, pages are compressed in RAM. Reduces I/O significantly at the cost of a small CPU overhead.' },
      { q: 'What does si and so mean in vmstat output?', a: 'si = swap-in (KB/s read from swap back to RAM). so = swap-out (KB/s written from RAM to swap). Persistent so > 0 indicates active swapping under memory pressure.' },
      { q: 'Why does Kubernetes recommend disabling swap?', a: 'Cgroup memory limits do not account for swap usage, so a container can exceed its memory limit via swap without triggering OOM — making resource isolation unpredictable.' },
      { q: 'How do you create a 4GB swapfile on Linux?', a: 'fallocate -l 4G /swapfile; chmod 600 /swapfile; mkswap /swapfile; swapon /swapfile. Persist in /etc/fstab with: /swapfile none swap sw 0 0' },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/admin-guide/sysctl/vm.html',
      'https://www.kernel.org/doc/html/latest/mm/zswap.html',
      'https://kubernetes.io/docs/concepts/architecture/nodes/#swap-memory',
    ],
  },
];