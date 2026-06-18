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
      { title: 'Process Lifecycle', caption: 'All five Linux process states (R, S, D, T, Z) and every kernel-driven transition between them, including the fork/exec entry point and zombie reaping path.', image: '/diagrams/linux/linux-processes-lifecycle.png' },
      { title: 'Process Tree & PID Namespaces', caption: 'How systemd (PID 1) spawns a process tree via fork/exec, where zombie processes appear when a parent skips wait(), and how PID namespaces give containers an isolated PID 1.', image: '/diagrams/linux/linux-processes-tree.png' },
    ],
    introduction: `Every running program in Linux is a process — an instance of an executable with its own address space, file descriptors, and credentials. Processes are organised in a tree rooted at PID 1 (init or systemd). Each process has a parent (PPID); when a parent exits before its children, those children are re-parented to PID 1.

Process states control scheduling: Running (R) — on a CPU or ready to run; Sleeping (S) — waiting for an event, interruptible; Disk sleep (D) — waiting for I/O, uninterruptible; Stopped (T) — frozen by SIGSTOP or debugger; Zombie (Z) — exited but parent hasn't called wait() yet.

Creating processes uses two system calls. fork() duplicates the current process — parent and child get identical address spaces (copy-on-write). exec() replaces the process image with a new program. The shell uses fork then exec for every command. Threads share the same address space and are implemented as lightweight processes via clone().

Zombie processes accumulate when a parent ignores SIGCHLD or doesn't call wait(). The zombie holds its PID and exit status but no memory. If the parent itself exits, zombies are re-parented to init and cleaned up. A large number of zombies indicates a parent bug, not a resource leak, but it does exhaust the PID namespace.`,
    whenToUse: [
      'Diagnosing high load average when CPU% is low — D-state processes blocked on I/O',
      'Explaining container isolation at the process level — PID namespaces give each container its own PID 1',
      'Debugging zombie accumulation in a service that spawns child processes',
      'Understanding why kill -9 on a zombie has no effect',
    ],
    keyConcepts: [
      { term: 'Process states', definition: 'R (running), S (sleeping), D (uninterruptible disk sleep), T (stopped), Z (zombie). D-state is the main cause of high load with low CPU.' },
      { term: 'fork/exec', definition: 'fork() duplicates the process (copy-on-write); exec() replaces the image. Shell runs every command via fork+exec.' },
      { term: 'Zombie', definition: 'A process that has exited but whose parent has not called wait(). Holds a PID slot but no memory. Fixed by fixing the parent or killing the parent.' },
      { term: 'PID namespace', definition: 'Kernel feature that gives a container its own PID 1 and isolated PID space. The container sees PIDs 1-N; the host sees a different PID for the same process.' },
      { term: 'PPID / reparenting', definition: 'Every process tracks its parent PID. If the parent dies, orphaned children are reparented to PID 1 (systemd) which will reap them.' },
    ],
    pitfalls: [
      'Treating zombie count as a memory leak — zombies hold no memory, only a PID. The real bug is a parent that never calls wait().',
      'Sending SIGKILL to a D-state process — it has no effect because the process is in kernel code waiting for I/O. Fix the underlying I/O hang or reboot.',
      'Confusing load average with CPU usage — load average counts R and D state processes. A load of 10 on a 2-core machine with 5% CPU means 9 processes are stuck in D-state.',
    ],
    keyQuestions: [
      {
        question: 'Your server load average is 50 but CPU usage is only 5%. What is happening and how do you diagnose it?',
        answer: `Load average counts all processes in R (runnable) and D (uninterruptible sleep) states. A high load with low CPU means processes are blocked waiting for I/O — they are in D state consuming a slot in the load calculation without using the CPU.

Diagnosis steps:
1. Run top or htop and look at the %wa column (iowait). High iowait confirms the problem is I/O.
2. Run iostat -x 1 to see per-device utilisation. Look for devices at 100% util or high await (milliseconds waiting per request).
3. Run ps aux | awk '$8 ~ /D/' to list all D-state processes and see which ones are stuck.
4. Use dmesg or journalctl -k to check for storage errors: "ata reset", "I/O error", "blk_update_request".
5. If it's NFS, check nfsstat and confirm the NFS server is reachable.
6. If it's a block device, check iostat -dxt for the device and look at avgqu-sz (queue depth) and svctm.

Common causes: a failing disk, an NFS mount that went unresponsive, a ceph OSD that is degraded, or a network block device with packet loss. The fix depends on the root cause — replace the disk, fix NFS connectivity, or add more IOPS capacity.`,
      },
      {
        question: 'What is the difference between a zombie process and an orphan process?',
        answer: `A zombie has exited but its parent has not called wait() to collect its exit status. The zombie holds a PID entry in the process table but no memory, file descriptors, or CPU. You cannot kill a zombie with any signal — it is already dead. Fix: either fix the parent to call wait(), send SIGCHLD to the parent to prompt it to reap children, or kill the parent so zombies get reparented to init (PID 1), which will reap them.

An orphan is a process whose parent has exited while the child is still running. Linux automatically reparents orphans to PID 1 (systemd), which will eventually reap them when they exit. Orphans are harmless — they continue running normally under their new parent.

The practical interview point: if you see hundreds of zombie processes, look at the PPID column (ps aux --ppid N) to find the offending parent process and investigate why it is not reaping its children.`,
      },
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
      { title: 'Signal Delivery Flow', caption: 'How a signal travels from its source through the pending set and signal mask before landing on a custom handler, the default action, or being ignored.', image: '/diagrams/linux/linux-signals-delivery.png' },
      { title: 'Key Signals Reference', caption: 'The eight most-cited signals grouped by number, default action, and whether they can be caught — including SIGKILL and SIGSTOP as the two uncatchable exceptions.', image: '/diagrams/linux/linux-signals-cheatsheet.png' },
    ],
    introduction: `Signals are asynchronous notifications sent to a process by the kernel, another process, or the process itself. There are 64 standard signals (numbered 1-64 on x86-64). Signals interrupt normal execution and invoke a registered handler, the default action (usually terminate or ignore), or are blocked via a signal mask.

The most important signals for production work: SIGTERM (15) — request graceful termination; the default action is terminate, but processes can catch it and clean up. SIGKILL (9) — unconditional termination; cannot be caught, blocked, or ignored. The kernel delivers it directly. SIGINT (2) — Ctrl+C from the terminal. SIGHUP (1) — originally "terminal hangup," now widely used to trigger config reload in daemons. SIGCHLD (17) — sent to parent when a child changes state. SIGUSR1/SIGUSR2 (10/12) — user-defined signals for application-specific purposes.

Signal delivery is not instantaneous — if a process has the signal blocked in its signal mask, it is queued (pending). Signals are not queued past one: if the same signal fires three times while blocked, only one delivery occurs when unblocked. Real-time signals (SIGRTMIN to SIGRTMAX) are queued and ordered.

Graceful shutdown pattern: receive SIGTERM, stop accepting new work, drain in-flight requests with a deadline, close connections, flush buffers, exit 0. If the process does not exit within the deadline, the orchestrator sends SIGKILL. Kubernetes uses terminationGracePeriodSeconds for this.`,
    whenToUse: [
      'Explaining why kill -9 should be the last resort — it prevents graceful cleanup',
      'Designing container shutdown sequences in Kubernetes (preStop hooks + SIGTERM + grace period)',
      'Debugging why a daemon does not pick up config changes — likely needs SIGHUP',
      'Understanding why Ctrl+C sometimes does not kill a process running in a shell pipeline',
    ],
    keyConcepts: [
      { term: 'SIGTERM (15)', definition: 'Request graceful shutdown. Can be caught and handled. Always try this first before SIGKILL.' },
      { term: 'SIGKILL (9)', definition: 'Unconditional kill. Cannot be caught, blocked, or ignored. The kernel tears down the process directly. Use as last resort.' },
      { term: 'SIGHUP (1)', definition: 'Historically "hangup." Modern convention: reload configuration without restarting. nginx, sshd, and most daemons handle this.' },
      { term: 'Signal mask', definition: 'Per-thread bitmask of blocked signals. Blocked signals are queued (pending) and delivered when unblocked. Used to protect critical sections.' },
      { term: 'Real-time signals', definition: 'SIGRTMIN through SIGRTMAX (34-64). Unlike standard signals, they are queued, ordered, and can carry a payload. Used by POSIX timers and custom IPC.' },
    ],
    pitfalls: [
      'Sending SIGKILL immediately without trying SIGTERM — prevents log flushing, database checkpoint, and connection draining, causing data loss and client errors.',
      'Assuming kill -9 works on zombie processes — zombies are already dead. Kill the parent or wait for parent cleanup.',
      'Not handling SIGTERM in containerised applications — Kubernetes sends SIGTERM, waits terminationGracePeriodSeconds, then sends SIGKILL. If your app ignores SIGTERM, every pod restart causes a hard kill.',
    ],
    keyQuestions: [
      {
        question: 'What happens when you run kill -9 on a process vs kill -15? When should you use each?',
        answer: `kill -15 sends SIGTERM. The process receives the signal and can catch it to run cleanup code: flush write buffers, close database connections, complete in-flight requests, remove lock files, and log shutdown reason. The process then exits cleanly. This is always the correct first step.

kill -9 sends SIGKILL. The kernel tears the process down immediately without giving it any chance to run cleanup code. File buffers may not be flushed, database connections are cut hard (causing timeouts on the server side), lock files are not removed. Use SIGKILL only when: (1) the process is hung and not responding to SIGTERM after a reasonable grace period (typically 30s), or (2) the process has caught SIGTERM but is stuck in shutdown code.

Practical sequence for a hung process:
kill -15 <pid>    # Give it 30 seconds to clean up
sleep 30
kill -0 <pid> 2>/dev/null && kill -9 <pid>   # Still alive? Force kill.

Never use SIGKILL as the default — it causes unnecessary errors in dependent services. Always give SIGTERM first.`,
      },
      {
        question: 'How do you ensure your Docker container shuts down gracefully when Kubernetes drains a node?',
        answer: `Kubernetes sends SIGTERM to PID 1 inside the container when a pod is deleted or a node is drained. If the application does not handle SIGTERM, Kubernetes waits terminationGracePeriodSeconds (default 30s) and then sends SIGKILL.

Requirements for graceful shutdown:
1. The application must be PID 1, or must receive signals forwarded to it. If you use CMD ["bash", "-c", "myapp"] the shell is PID 1 and does not forward signals. Use exec to replace the shell: CMD exec myapp.
2. Install a SIGTERM handler that stops accepting new connections, drains in-flight requests, and exits 0.
3. Set terminationGracePeriodSeconds in the pod spec to match your drain timeout (e.g., 60s for slow drains).
4. Add a preStop hook if you need to deregister from a load balancer before SIGTERM lands: preStop: exec: command: ["/bin/sh", "-c", "sleep 5"].

Common mistake: using npm start or a shell wrapper as PID 1. The shell traps no signals, so SIGTERM is never forwarded to Node.js. Use dumb-init or tini as a minimal init that properly forwards signals to children.`,
      },
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
      { title: 'VFS Stack', caption: 'The full path from a user-space open() call down through the VFS abstraction layer, multiple concrete filesystems, the page cache, the block I/O layer, and finally the device driver.', image: '/diagrams/linux/linux-filesystem-vfs.png' },
      { title: 'Inodes — Hard vs Soft Links', caption: 'Why two hard links share one inode and one link count, while a symlink is its own inode that stores a path string resolved at access time.', image: '/diagrams/linux/linux-filesystem-inodes.png' },
    ],
    introduction: `Linux uses the Virtual Filesystem Switch (VFS) as an abstraction layer between system calls (open, read, write) and specific filesystem implementations (ext4, XFS, tmpfs, NFS). Every filesystem presents the same VFS interface, so userspace code is filesystem-agnostic.

The inode (index node) is the core data structure. Each file or directory has exactly one inode containing: file type, permissions, owner/group, size, timestamps (atime, mtime, ctime), and pointers to data blocks. Critically, the inode does not contain the filename — filenames live in directory entries (dentries) that map names to inode numbers.

Hard links are directory entries pointing to the same inode. Deleting a file decrements the inode's link count; the inode and data are freed only when link count reaches zero and no process has the file open. This is why you can "delete" a file that a running process holds open — the data is still accessible via /proc/PID/fd/.

Symbolic (soft) links are special files containing a path string. They can cross filesystem boundaries and point to directories. Dangling symlinks point to a non-existent target.

Common production problems: disk full (df -h) vs inode exhaustion (df -i). A filesystem can be full of inodes even when blocks are available — typically caused by millions of tiny files (mail queues, temp directories, poorly written log rotation).`,
    whenToUse: [
      '"Disk is full but df shows space available" — inode exhaustion, check df -i',
      'Explaining why a deleted file still uses disk space — process holding open fd, check /proc/PID/fd',
      'Designing backup strategies that leverage hard links for space efficiency (rsync --link-dest)',
      'Understanding why mv is atomic within a filesystem but cp is not',
    ],
    keyConcepts: [
      { term: 'Inode', definition: 'Metadata structure for a file: type, permissions, owner, size, timestamps, block pointers. Does not contain the filename. Identified by inode number within a filesystem.' },
      { term: 'Hard link', definition: 'Additional directory entry pointing to the same inode. All hard links are equal — there is no "original." File is deleted only when link count reaches 0 and no open fds remain.' },
      { term: 'Symbolic link', definition: 'A file containing a path string. Can cross filesystems and point to directories. Dangling if target does not exist.' },
      { term: 'VFS', definition: 'Virtual Filesystem Switch — kernel abstraction that routes open/read/write system calls to the correct filesystem driver. Makes ext4, XFS, NFS, and tmpfs interchangeable from userspace.' },
      { term: 'Inode exhaustion', definition: 'A filesystem can run out of inodes before running out of blocks. df -i shows inode usage. Common cause: millions of small files in /tmp or a mail queue.' },
    ],
    pitfalls: [
      'Running df -h and seeing free space but still getting "No space left on device" — check df -i for inode exhaustion.',
      'Assuming rm immediately frees disk space — if any process has the file open, the blocks are not freed until the file descriptor is closed. Use lsof | grep deleted to find them.',
      'Hard-linking across filesystems — hard links cannot cross filesystem boundaries. Use symlinks instead, but be aware they break if the target is moved.',
    ],
    keyQuestions: [
      {
        question: 'What is an inode and what happens when inodes are exhausted?',
        answer: `An inode is a kernel data structure that stores metadata for a file or directory: file type, permissions (rwxrwxrwx), owner UID/GID, file size in bytes, three timestamps (atime=last access, mtime=last modification, ctime=last inode change), and pointers to the data blocks on disk. Critically, the inode does not store the filename — filenames are stored in directory entries (dentries) that map a name to an inode number.

Each filesystem is created with a fixed inode count. When inodes are exhausted, new files cannot be created even if the filesystem still has available disk blocks.

Diagnosis:
df -i   # Shows inode usage per filesystem. Look for Use% near 100%.
df -i /var/spool/postfix   # Common culprit: mail queues

Finding the directory with the most files:
find / -xdev -printf '%h\n' | sort | uniq -c | sort -k 1 -rn | head -20

Fix: delete the excess small files (empty mail queue, clear tmp directory). If the problem recurs, increase the inode density when creating the filesystem (mkfs.ext4 -N <count>) or switch to XFS which uses dynamic inode allocation and rarely exhausts inodes.`,
      },
      {
        question: 'A file is deleted but disk usage does not decrease. Why and how do you fix it?',
        answer: `When you delete a file (unlink), the directory entry is removed and the inode link count decrements. However, if any process has the file open (an open file descriptor), the kernel keeps the inode and data blocks alive until the fd is closed. The file is invisible in the directory tree but still occupies disk space.

This is very common with log files: a log rotation script renames and deletes the old log, but the application (nginx, Java app) still has the old file descriptor open, writing to the deleted file.

Diagnosis:
lsof | grep deleted   # Lists all deleted files still held open
lsof +L1              # All files with link count < 1 (effectively deleted but open)

Output shows the PID, process name, fd number, and size of the deleted file.

Fix options:
1. Restart or reload the process — it opens new file descriptors pointing to the new log file.
2. If you cannot restart: truncate the file via its /proc fd: > /proc/<PID>/fd/<FD>. This frees disk space without closing the fd. The process continues writing to the same fd but the file is now empty.
3. Send SIGHUP to the process to trigger log rotation (logrotate uses postrotate scripts to do this).`,
      },
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
      { title: 'Script Anatomy', caption: 'The canonical top-to-bottom structure of a production-grade Bash script: shebang, set -euo pipefail, readonly variables, local-scoped functions, main logic, and trap-based cleanup.', image: '/diagrams/linux/bash-scripting-anatomy.png' },
      { title: 'Control Flow Constructs', caption: 'Side-by-side comparison of if/case conditionals, for/while/until loops, function definitions, and array operations — the building blocks of any non-trivial script.', image: '/diagrams/linux/bash-scripting-control-flow.png' },
    ],
    introduction: `Bash is the dominant shell for system automation in Linux environments. Production scripts must be written with defensive defaults that are not set by the shell unless you opt in.

Always start scripts with: set -euo pipefail. set -e exits on any non-zero return. set -u treats unset variables as errors. set -o pipefail makes a pipeline fail if any command in it fails (without this, echo "data" | grep "x" | process would succeed even though grep found nothing).

Variables are untyped strings by default. Use double quotes around variable expansions to prevent word splitting and glob expansion: "$variable" not $variable. Use \${variable:-default} for a default when unset. Arrays use parentheses: arr=(a b c); access with "\${arr[@]}" to expand all elements preserving word boundaries.

Exit codes are the primary error-handling mechanism. 0 is success; anything else is failure. Use $? immediately after a command to check its exit code. Use trap to register cleanup functions that run on exit or signals: trap cleanup EXIT.

Here documents (heredocs) allow multi-line strings as stdin: command <<EOF ... EOF. Use <<'EOF' (single-quoted) to prevent variable expansion inside the heredoc.

Process substitution feeds command output as a file: diff <(sort a.txt) <(sort b.txt) diffs two sorted outputs without temporary files.`,
    whenToUse: [
      'Writing deployment scripts, cron jobs, and CI/CD pipeline steps',
      'Automating repetitive system administration tasks',
      'Explaining why "$@" is correct and $* is not for passing arguments',
      'Designing error handling that cleans up temp files even on failure',
    ],
    keyConcepts: [
      { term: 'set -euo pipefail', definition: 'Defensive defaults every production script should start with. -e exit on error, -u treat unset vars as error, -o pipefail fail pipeline on first error.' },
      { term: 'Double quoting', definition: 'Always quote variable expansions: "$var" not $var. Prevents word splitting (spaces in values) and glob expansion (asterisks in values).' },
      { term: 'trap', definition: 'Register functions to run on shell exit or signals. trap cleanup EXIT ensures temp files are deleted even when the script exits early due to set -e.' },
      { term: 'Exit codes', definition: '0 is success. Anything else is failure. Scripts should propagate exit codes correctly. Use exit $? to pass through the last command\'s code.' },
      { term: 'Process substitution', definition: 'diff <(cmd1) <(cmd2) feeds command output as named pipes. Avoids temp files and lets commands read output of other commands as if they were files.' },
    ],
    pitfalls: [
      'Omitting set -euo pipefail — without it, a failed command in the middle of a script is silently ignored and subsequent commands run on bad state.',
      'Using $* instead of "$@" for argument passing — $* collapses all args into one string; "$@" preserves individual arguments including those with spaces.',
      'Not quoting variable expansions — rm $file with file="important file.txt" becomes rm important file.txt and deletes two files.',
    ],
    keyQuestions: [
      {
        question: 'Write a bash script that downloads a file, processes it, and cleans up temp files even if the script fails mid-way.',
        answer: `#!/usr/bin/env bash
set -euo pipefail

TMPDIR=$(mktemp -d)
TMPFILE="$TMPDIR/download.dat"

cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

URL="\${1:?Usage: $0 <url>}"

curl -fsSL "$URL" -o "$TMPFILE"

# Process the file
process_data "$TMPFILE"

echo "Done. Temp files cleaned up automatically by trap."

Key points: mktemp -d creates a unique temp directory. The cleanup function removes it. trap cleanup EXIT ensures cleanup runs whether the script succeeds (exit 0), fails (set -e triggers early exit), or receives a signal. The :? in \${1:?message} prints the message and exits if $1 is unset. curl -f fails on HTTP 4xx/5xx (without -f, curl exits 0 even on 404).`,
      },
      {
        question: 'Explain the difference between $*, "$*", $@, and "$@" when passing arguments.',
        answer: `Without quotes both $* and $@ expand to all positional parameters, word-split on IFS. They behave identically and both break arguments containing spaces.

"$*" expands to a single word with all arguments joined by the first character of IFS (usually space): "arg1 arg2 arg3". Useful when you want to pass all args as one string to another command.

"$@" expands to separate words, one per original argument, preserving internal spaces: "arg1" "arg2" "arg with spaces". This is almost always what you want when forwarding arguments.

Example that shows the difference:
args() { for a in "$@"; do echo "[$a]"; done; }
args "hello world" "foo"
# With "$@": [hello world] then [foo]  -- correct
# With "$*": [hello world foo]         -- all joined, wrong
# With  $@:  [hello] [world] [foo]     -- split on space, wrong

Rule of thumb: always use "$@" when forwarding arguments to another function or command.`,
      },
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
      { title: 'Pipes & File Descriptors', caption: 'How the kernel anonymous pipe buffer connects stdout of one process to stdin of the next, and how 2>/dev/null and 2>&1 redirect or merge stderr.', image: '/diagrams/linux/bash-pipes-redirection-fds.png' },
      { title: 'Pipeline Chain', caption: 'A real grep | sort | uniq | awk pipeline showing data flowing stage-by-stage, and where set -o pipefail causes the whole pipeline to fail if any stage exits non-zero.', image: '/diagrams/linux/bash-pipes-redirection-chain.png' },
    ],
    introduction: `Every process inherits three file descriptors: 0 (stdin), 1 (stdout), 2 (stderr). Redirection changes where these point. > file redirects stdout to file (truncating). >> file appends. 2> file redirects stderr. 2>&1 merges stderr into stdout. &> file redirects both to file. < file connects stdin to file.

The pipe operator | connects stdout of the left command to stdin of the right command. Commands in a pipeline run in subshells. This has a critical implication: variable assignments in a pipeline do not affect the parent shell. In bash, the last command in a pipeline runs in the current shell only with lastpipe enabled.

Process substitution <(cmd) creates a named pipe (FIFO) and passes its path as a filename argument. This lets commands that expect file arguments consume live command output: diff <(ssh host1 cat /etc/hosts) <(ssh host2 cat /etc/hosts).

tee copies stdin to both stdout and a file: command | tee logfile.txt | next-command. Useful when you want to log output while also piping it forward.

Named pipes (FIFOs) created with mkfifo allow producer-consumer patterns between separate processes. Unlike anonymous pipes, FIFOs persist on the filesystem and do not require a parent-child relationship.`,
    whenToUse: [
      'Building complex data-processing pipelines in shell scripts',
      'Explaining why variables set inside a pipeline do not persist after the pipeline',
      'Logging output while still displaying it to the terminal',
      'Comparing remote file contents without transferring them locally',
    ],
    keyConcepts: [
      { term: 'File descriptors 0/1/2', definition: 'stdin (0), stdout (1), stderr (2). Redirection changes which file or pipe these descriptors point to.' },
      { term: '2>&1', definition: 'Redirect stderr (fd 2) to wherever stdout (fd 1) currently points. Order matters: cmd > file 2>&1 is correct; cmd 2>&1 > file sends stderr to the terminal.' },
      { term: 'Pipeline subshell', definition: 'Each command in a pipeline runs in a subshell. Variable assignments inside pipelines do not affect the parent shell without lastpipe (bash) or special syntax.' },
      { term: 'Process substitution', definition: '<(cmd) substitutes command output as a named pipe that another command can read as a file argument.' },
      { term: 'tee', definition: 'Reads stdin and writes it to both stdout and one or more files simultaneously. tee -a appends instead of truncating.' },
    ],
    pitfalls: [
      'Putting 2>&1 before > file: cmd 2>&1 > file sends stderr to the terminal and stdout to the file — the opposite of what was intended. Correct order: cmd > file 2>&1.',
      'Reading a variable set inside a pipeline after the pipeline ends — it is empty. Use process substitution or a temp file instead.',
      'Forgetting set -o pipefail — without it, cmd1 | cmd2 | cmd3 exits 0 even if cmd1 failed, because bash reports the exit code of the last command only.',
    ],
    keyQuestions: [
      {
        question: 'Why does this script not work as expected: count=0; cat file.txt | while read line; do count=$((count+1)); done; echo $count?',
        answer: `The count variable is always 0 after the loop because the while loop runs in a subshell. In bash, each command in a pipeline is a subprocess. Variable assignments in a subprocess do not propagate to the parent shell.

Fixes:

Option 1 — process substitution (reads from a file-like object, no subshell for the loop body):
count=0
while read line; do
  count=$((count+1))
done < file.txt
echo $count   # Correct count

Option 2 — set lastpipe so the last pipeline segment runs in current shell:
set +m  # Disable job control
shopt -s lastpipe
count=0
cat file.txt | while read line; do count=$((count+1)); done
echo $count

Option 3 — let wc -l do the counting (avoids the issue entirely):
count=$(wc -l < file.txt)

Option 1 (process substitution / input redirection) is the idiomatic bash solution.`,
      },
      {
        question: 'You need to log all output of a script to a file while still displaying it on the terminal. How do you do it?',
        answer: `Use exec with tee at the top of the script to redirect all subsequent output:

#!/usr/bin/env bash
set -euo pipefail
exec > >(tee -a /var/log/deploy.log) 2>&1

# Everything from here writes to both terminal and the log file
echo "Starting deployment..."

Explanation: exec > >(tee -a logfile) replaces stdout with a process substitution that tees to the log file. The 2>&1 then merges stderr into that same tee stream, so both stdout and stderr go to both the terminal and the file.

Alternative for a single command:
some_command 2>&1 | tee output.log

Or to capture the exit code of some_command (not tee):
some_command 2>&1 | tee output.log; exit \${PIPESTATUS[0]}
PIPESTATUS[0] gives the exit code of the first command in the pipeline.`,
      },
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
      { title: 'Tools by Use Case', caption: 'Four diagnostic categories — connection state, traffic capture, DNS/routing, and bandwidth — mapped to the specific command-line tools used for each, with their modern replacements called out.', image: '/diagrams/linux/linux-networking-tools-map.png' },
    ],
    introduction: `Linux networking diagnosis uses a layered approach matching the OSI model — start at the physical/IP layer and work up to the application layer. The core tools and their layer:

Layer 3 (IP): ip addr (interface addresses), ip route (routing table), ping (ICMP reachability), traceroute/tracepath (path discovery).

Layer 4 (TCP/UDP): ss (socket statistics, replacement for netstat), nc/ncat (raw TCP/UDP connections), tcpdump (packet capture).

Layer 7 (Application): curl (HTTP/HTTPS), wget, dig/nslookup/host (DNS), openssl s_client (TLS handshake inspection).

The ip command family replaces the deprecated ifconfig and route. ip addr show shows all interfaces and addresses. ip route show shows the routing table. ip -s link shows interface statistics including errors and dropped packets.

ss is the modern replacement for netstat. ss -tulpn shows all listening TCP/UDP ports with process names. ss -s shows a summary. ss -t state established shows all established TCP connections. ss has lower overhead than netstat on systems with thousands of connections.

tcpdump captures packets at the kernel level. tcpdump -i eth0 -n -vvv port 443 captures HTTPS traffic. -n disables name resolution. -w capture.pcap writes to a file for analysis in Wireshark.`,
    whenToUse: [
      'Diagnosing "connection refused" vs "connection timed out" — one means the port is closed, the other means a firewall is dropping packets',
      'Verifying a service is listening on the expected port and interface with ss -tulpn',
      'Tracing DNS resolution failures with dig +trace',
      'Inspecting TLS certificate chains with openssl s_client',
    ],
    keyConcepts: [
      { term: 'ss -tulpn', definition: 'List all listening sockets: TCP (-t), UDP (-u), listening (-l), process name (-p), no name resolution (-n). Replacement for netstat -tulpn.' },
      { term: 'ip route', definition: 'Show the kernel routing table. ip route get 8.8.8.8 shows exactly which interface and gateway will be used to reach a specific IP.' },
      { term: 'tcpdump', definition: 'Kernel-level packet capture. tcpdump -i any -n port 80 captures HTTP on all interfaces. Write with -w, read with -r. Minimal overhead.' },
      { term: 'dig +trace', definition: 'Perform a full DNS resolution from root servers, showing each delegation step. Invaluable for diagnosing DNS propagation issues.' },
      { term: 'curl -v vs -I', definition: 'curl -v shows full request/response headers including TLS handshake. curl -I sends a HEAD request. curl --resolve overrides DNS for testing specific backends.' },
    ],
    pitfalls: [
      'Confusing "connection refused" with "connection timed out" — refused means the port is actively closed (RST); timed out means packets are being dropped (firewall, wrong IP, no route).',
      'Using netstat instead of ss on modern systems — netstat reads /proc and is slow with many connections. ss uses kernel socket tables directly and is orders of magnitude faster.',
      'Running tcpdump without -n — reverse DNS lookups slow down the capture and can fail, causing gaps in output.',
    ],
    keyQuestions: [
      {
        question: 'A service cannot connect to a remote endpoint. Walk through your network diagnosis steps.',
        answer: `I work from Layer 3 up to Layer 7:

1. Routing and reachability (Layer 3):
   ping -c 3 <remote-ip>   # Is the host reachable at all?
   ip route get <remote-ip>   # Which interface/gateway will be used?
   If ping fails: check ip route, check if the gateway is reachable, check for firewall rules blocking ICMP.

2. TCP connectivity (Layer 4):
   nc -zv <remote-ip> <port> -w 5   # Can we open a TCP connection?
   # Or: timeout 5 bash -c "< /dev/tcp/<remote-ip>/<port>"
   Connection refused: port is closed or service not listening.
   Connection timed out: firewall dropping packets (check security groups, iptables, NACLs).

3. DNS if using a hostname:
   dig +short <hostname>   # Does it resolve?
   dig +trace <hostname>   # Full resolution from root to see where it fails.

4. Application layer:
   curl -v http://<remote>:<port>/healthz   # For HTTP services
   openssl s_client -connect <remote>:<port>   # For TLS

5. Packet capture to see exactly what is on the wire:
   tcpdump -i any -n host <remote-ip> and port <port>

Common findings: security group on the remote side blocking the port, wrong VPC routing, service bound to 127.0.0.1 instead of 0.0.0.0, DNS resolving to a different IP than expected.`,
      },
      {
        question: 'How do you capture and analyse packets for an HTTPS connection without decrypting the content?',
        answer: `Without the TLS session keys, you can capture the TLS handshake (certificate, cipher suite, SNI) but not the payload.

Capture with tcpdump:
tcpdump -i any -n -w capture.pcap host api.example.com and port 443

Analyse the handshake without decryption:
tcpdump -r capture.pcap -v   # Shows TLS Client Hello with SNI, TLS version negotiated
openssl s_client -connect api.example.com:443 -showcerts   # Inspect the certificate chain

To also decrypt the payload (for debugging your own services):
1. Set SSLKEYLOGFILE=/tmp/keys.log in the environment before running the client (curl, Firefox, Chrome all support this).
2. Capture packets as above.
3. In Wireshark: Edit > Preferences > Protocols > TLS > (Pre)-Master-Secret log file. Point to keys.log. Wireshark decrypts all sessions whose keys are in the log.

This only works for services where you control the client. For production traffic inspection, use application-level logging or a service mesh with TLS inspection before re-encryption.`,
      },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/ip.8.html',
      'https://man7.org/linux/man-pages/man8/ss.8.html',
      'https://man7.org/linux/man-pages/man8/tcpdump.8.html',
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
      { title: 'Packet Flow Through Chains', caption: 'The exact sequence a packet traverses — RAW PREROUTING, NAT PREROUTING, routing decision, FILTER INPUT/FORWARD, FILTER OUTPUT, NAT POSTROUTING — for both locally-destined and forwarded traffic.', image: '/diagrams/linux/linux-iptables-flow.png' },
      { title: 'Rule Anatomy & Targets', caption: 'The structure of an iptables rule and the five core jump targets (ACCEPT, DROP, REJECT, MASQUERADE, LOG) plus the connection-tracking state match module.', image: '/diagrams/linux/linux-iptables-rules.png' },
    ],
    introduction: `iptables is the userspace interface to the Linux kernel's Netfilter packet filtering framework. It organises rules into tables, chains, and rules. nftables is the modern replacement with a cleaner syntax and better performance, but iptables knowledge remains essential because Kubernetes kube-proxy still uses iptables mode by default.

Tables and their purposes: filter (default, INPUT/FORWARD/OUTPUT chains — packet filtering), nat (PREROUTING/POSTROUTING — address translation), mangle (packet modification), raw (connection tracking bypass).

Chains are evaluated in order. Rules in a chain are checked top-to-bottom; the first matching rule's target is applied. Targets: ACCEPT, DROP, REJECT (sends RST/ICMP), RETURN (go back to calling chain), LOG, and jumps to user-defined chains.

Connection tracking (conntrack) is essential to stateful firewalling. The kernel tracks TCP state machines and UDP/ICMP flows. Rules can match by state: -m conntrack --ctstate ESTABLISHED,RELATED allows return traffic without explicit rules for each port.

Kubernetes kube-proxy (iptables mode) installs thousands of rules to implement Services. Every ClusterIP service gets DNAT rules in the nat table that randomly select a backing Pod IP. NodePort services add rules to PREROUTING. This is why large Kubernetes clusters with many services have slow iptables rule updates — iptables replaces the entire ruleset atomically, which is O(n) for n rules. eBPF-based alternatives (Cilium, kube-proxy ipvs mode) solve this.`,
    whenToUse: [
      'Debugging connectivity in Kubernetes when pods cannot reach a Service ClusterIP',
      'Understanding why adding a security group rule does not work until the EC2 network ACL is also updated',
      'Explaining how NAT masquerade enables containers to reach the internet',
      'Auditing iptables rules that may be blocking expected traffic',
    ],
    keyConcepts: [
      { term: 'Chains', definition: 'Ordered lists of rules within a table. Built-in chains: INPUT (packets to local), FORWARD (packets routed through), OUTPUT (locally generated), PREROUTING (before routing decision), POSTROUTING (after routing).' },
      { term: 'Connection tracking', definition: 'Kernel tracks flow state. -m conntrack --ctstate ESTABLISHED,RELATED allows return traffic. Without it, you must write symmetric rules for both directions.' },
      { term: 'DNAT / SNAT', definition: 'Destination NAT rewrites the destination IP (used by kube-proxy to send traffic to a Pod). Source NAT rewrites the source IP (used for internet egress from private IPs).' },
      { term: 'MASQUERADE', definition: 'Dynamic SNAT that uses the outgoing interface IP. Used for containers and VMs that need internet access through the host.' },
      { term: 'Default policy', definition: 'The action taken if no rule matches. ACCEPT is the default default. For production hardening, set INPUT and FORWARD to DROP and allow only what is needed.' },
    ],
    pitfalls: [
      'Setting INPUT policy to DROP before adding an ACCEPT rule for SSH — locks you out of the server. Always add ACCEPT rules for established connections and SSH before changing the default policy.',
      'Assuming iptables rules persist across reboots — they do not without iptables-persistent or systemd unit to restore them.',
      'Forgetting the nat table for port forwarding — filter rules do not affect NAT; you need both the nat table PREROUTING rule and a FORWARD rule to allow the forwarded connection.',
    ],
    keyQuestions: [
      {
        question: 'How does Kubernetes kube-proxy use iptables to implement a ClusterIP service?',
        answer: `When you create a Service of type ClusterIP, kube-proxy installs a set of iptables rules in the nat table that implement the virtual IP (ClusterIP).

The mechanism:
1. A KUBE-SERVICES chain in the nat PREROUTING and OUTPUT chains matches packets destined for the ClusterIP:port.
2. That chain jumps to a per-service chain (e.g., KUBE-SVC-XYZABC). This chain uses statistic-module rules to randomly distribute traffic across backends with equal probability.
3. Each backend has a KUBE-SEP-* chain that DNATs the packet — rewrites the destination IP from the ClusterIP to the Pod IP.
4. Return traffic is handled by connection tracking: the reply from the Pod is SNATed back to the ClusterIP so the client sees a consistent connection.

iptables -t nat -L KUBE-SERVICES -n   # See all service ClusterIP rules
iptables -t nat -L KUBE-SVC-* -n      # See endpoint selection rules

The scalability problem: iptables replaces the entire ruleset atomically. With 10,000 services, each update to any service rule requires reloading all 10,000+ rules. IPVS mode (ip_vs kernel module) uses a hash table for O(1) lookup and incremental updates. Cilium bypasses iptables entirely with eBPF programs that are O(log n).`,
      },
      {
        question: 'How do you allow all outbound traffic from a server but only allow inbound SSH and established return traffic?',
        answer: `iptables -F   # Flush existing rules
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT   # Always allow loopback
iptables -P INPUT DROP   # Default deny for INPUT
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT   # Allow all outbound

Critical order: the ESTABLISHED,RELATED rule must come before the default DROP policy. Without it, no TCP reply would ever be allowed back in because TCP return packets go through INPUT.

Persist rules:
apt install iptables-persistent && netfilter-persistent save   # Debian/Ubuntu
iptables-save > /etc/iptables/rules.v4   # Saves current ruleset

Verify:
iptables -L INPUT -n -v --line-numbers   # List INPUT rules with counters`,
      },
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
      { title: 'Virtual Address Space Layout', caption: 'The classic high-to-low layout of a Linux process: stack growing down, mmap region for shared libraries, heap growing up, BSS/data/text segments, vDSO, and where the OOM killer intervenes.', image: '/diagrams/linux/linux-memory-management-layout.png' },
      { title: 'Memory Reclaim & OOM', caption: 'How kswapd reclaims page cache before anonymous pages, uses LRU eviction to push cold pages to swap, and escalates to the OOM killer when no reclaimable memory remains.', image: '/diagrams/linux/linux-memory-management-reclaim.png' },
    ],
    introduction: `Linux uses a virtual memory system where every process sees a flat 64-bit address space. Physical RAM is managed in 4 KB pages. The kernel maps virtual pages to physical frames using page tables maintained per-process.

The page cache is the kernel's disk cache. When a file is read, its contents are stored in the page cache. Subsequent reads are served from RAM without disk I/O. The page cache uses all "free" memory — Linux deliberately keeps almost no RAM truly idle. The output of free -h shows buffers (kernel data structures) and cached (page cache). "Available" memory (not "free") is the realistic estimate of memory new processes can use, because cache pages are reclaimed on demand.

Memory pressure triggers reclaim: the kernel's kswapd daemon scans pages and reclaims Least Recently Used pages. File-backed pages are simply dropped (they can be re-read from disk). Anonymous pages (heap, stack) must be written to swap before reclaim.

The OOM killer activates when the system cannot reclaim enough memory to satisfy an allocation. It selects a victim process based on oom_score (adjusted by oom_score_adj). Containers typically set oom_score_adj to 0 (default). To protect a critical process: echo -1000 > /proc/PID/oom_score_adj. To make a process the preferred victim: echo 1000 > /proc/PID/oom_score_adj. cgroup memory limits trigger a cgroup-level OOM kill instead of a system-level one.

Huge pages (2 MB or 1 GB) reduce TLB pressure for large-memory workloads like databases and JVMs. Transparent Huge Pages (THP) enable them automatically but can cause latency spikes for databases; databases (Oracle, Cassandra, MongoDB) recommend disabling THP.`,
    whenToUse: [
      'Explaining why a server with 2% "free" RAM is not out of memory — the page cache fills free RAM',
      'Debugging container OOMKilled events — memory limit too low or memory leak',
      'Recommending huge pages for a database workload to reduce TLB misses',
      'Understanding why swap usage is high even when RAM appears available',
    ],
    keyConcepts: [
      { term: 'Page cache', definition: 'Kernel uses all free RAM as a disk cache. "Available" memory (free + reclaimable cache) is what matters, not "free." See free -h, column "available."' },
      { term: 'OOM killer', definition: 'Kills a process when memory cannot be reclaimed. Selects victim by oom_score. Adjust oom_score_adj per-process to protect critical services or designate sacrifice targets.' },
      { term: 'Anonymous vs file-backed pages', definition: 'Anonymous pages (heap/stack) must be swapped to disk before reclaim. File-backed pages can be dropped and re-read. High anonymous page usage makes reclaim expensive.' },
      { term: 'Transparent Huge Pages (THP)', definition: '2 MB pages managed automatically by the kernel. Reduces TLB pressure for large allocations. Can cause latency spikes in databases. Most DBs recommend: echo never > /sys/kernel/mm/transparent_hugepage/enabled.' },
      { term: 'cgroup memory limit', definition: 'Hard memory cap per container/cgroup. When exceeded, a cgroup-level OOM kill occurs (SIGKILL to the process that breached the limit), visible in dmesg as "oom-kill: constraint=CONSTRAINT_MEMCG."' },
    ],
    pitfalls: [
      'Treating "free" memory as available — Linux aggressively uses free RAM for page cache. Use the "available" column in free -h, which accounts for reclaimable cache.',
      'Setting container memory limits equal to the process RSS without headroom for page cache and JVM overhead — the container OOMKills under normal load.',
      'Leaving THP enabled for database workloads — causes unpredictable latency spikes when 2 MB pages are collapsed or split. Always check database documentation for THP recommendations.',
    ],
    keyQuestions: [
      {
        question: 'Your Java application in Kubernetes keeps getting OOMKilled. How do you diagnose and fix it?',
        answer: `Diagnosis steps:

1. Confirm OOMKill:
   kubectl describe pod <name>   # Look for "OOMKilled" in Last State, exitCode 137
   dmesg | grep -i oom            # On the node: shows which process was killed and memory stats at time of kill

2. Understand the memory breakdown — JVM uses more than just heap:
   - Heap: -Xmx sets the max, but JVM actually uses more.
   - Metaspace: class metadata (no limit by default pre-Java 8).
   - Thread stacks: each thread uses ~1 MB by default.
   - Direct buffers: NIO, Netty, native libraries.
   - Native code: JIT compiled code cache.

3. Measure actual JVM memory:
   kubectl exec -it <pod> -- java -XX:+PrintFlagsFinal -version | grep -i heapsize
   kubectl exec -it <pod> -- jcmd 1 VM.native_memory summary   # Full breakdown

4. Common fixes:
   - Set -XX:MaxRAMPercentage=75 instead of hardcoded -Xmx. This sets heap to 75% of container limit, leaving room for non-heap.
   - Set -XX:+UseContainerSupport (default in Java 10+) so JVM reads cgroup limits instead of host RAM.
   - Increase the container limit: resources.limits.memory: 2Gi
   - If Metaspace is growing: set -XX:MaxMetaspaceSize=256m

5. Monitor going forward:
   kubectl top pod <name>   # Current RSS
   Set up Prometheus jvm_memory_used_bytes metric from the Micrometer/JMX exporter.`,
      },
      {
        question: 'What is the Linux OOM killer and how do you control which process it kills?',
        answer: `The OOM (Out of Memory) killer is a kernel mechanism that activates when the system cannot reclaim enough memory to satisfy an allocation request. It calculates an oom_score for each process (0-1000) and kills the highest-scoring process to free memory.

The score factors in: process RSS (resident memory), age (long-running processes score lower), whether it is running as root (roots score lower), and whether it is flagged as protected.

Control via /proc/PID/oom_score_adj (-1000 to +1000):
- +1000: always kill this process first (make it the sacrifice target)
- -1000: never kill this process (protect it from OOM kill)
- 0: default behavior

To protect sshd and systemd:
echo -1000 > /proc/$(pgrep sshd)/oom_score_adj

To make a background worker the preferred victim:
echo 500 > /proc/<worker_pid>/oom_score_adj

In containers (Kubernetes), set oom_score_adj via the pod spec indirectly through QoS class:
- Guaranteed QoS (requests==limits): oom_score_adj = -997 (protected)
- Burstable QoS: proportional score based on memory ratio
- BestEffort QoS (no requests/limits): oom_score_adj = 1000 (first to be killed)

This is why setting proper requests and limits in Kubernetes is critical for production reliability.`,
      },
    ],
    references: [
      'https://www.kernel.org/doc/html/latest/admin-guide/mm/concepts.html',
      'https://www.kernel.org/doc/html/latest/admin-guide/mm/hugetlbpage.html',
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
      { title: 'LVM Layer Architecture', caption: 'How physical volumes (disks) aggregate into a volume group, which carves out logical volumes and CoW snapshots, each formatted with a filesystem and mounted independently.', image: '/diagrams/linux/linux-lvm-layers.png' },
      { title: 'Online LVM Resize', caption: 'Step-by-step flow to grow a logical volume without downtime: add a PV, vgextend, take a safety snapshot, lvextend, then resize2fs or xfs_growfs in place.', image: '/diagrams/linux/linux-lvm-resize.png' },
    ],
    introduction: `LVM (Logical Volume Manager) adds a layer of abstraction between physical storage and filesystems, enabling dynamic resizing, snapshots, and spanning of multiple disks.

The three-tier hierarchy: Physical Volumes (PVs) — raw disks or partitions initialised for LVM (pvcreate /dev/sdb). Volume Groups (VGs) — pool of PVs combined into a single storage pool (vgcreate myvg /dev/sdb /dev/sdc). Logical Volumes (LVs) — virtual partitions carved from VG storage (lvcreate -L 100G -n data myvg).

Extending storage online is one of LVM's killer features. Adding a new disk: pvcreate /dev/sdd, vgextend myvg /dev/sdd, lvextend -l +100%FREE /dev/myvg/data, resize2fs /dev/myvg/data (for ext4) or xfs_growfs /mnt/data (for XFS). The filesystem resize is hot — no unmounting needed for XFS.

LVM snapshots are copy-on-write: lvcreate -s -n snap -L 10G /dev/myvg/data creates a snapshot. Original writes go to the snapshot's difference area; the snapshot presents the original state. Use snapshots for consistent backups of running databases. The snapshot must be large enough to hold all writes during the backup window.

Thin provisioning overcommits storage: thin pools report more space than physically available, allocating real blocks only when written. Useful for dev environments but dangerous in production without monitoring — if the thin pool fills, all volumes in it go read-only.`,
    whenToUse: [
      'Growing a volume for a database that is running out of disk space without downtime',
      'Creating a consistent database backup snapshot while the database is running',
      'Migrating data across disks with pvmove without taking services offline',
      'Designing storage architecture for a Kubernetes cluster with local persistent volumes',
    ],
    keyConcepts: [
      { term: 'Physical Volume (PV)', definition: 'A disk or partition initialised with pvcreate. Contains LVM metadata and Physical Extents (PE, typically 4 MB each).' },
      { term: 'Volume Group (VG)', definition: 'A pool of one or more PVs. Provides a flat address space of PEs. LVs are allocated from VG space.' },
      { term: 'Logical Volume (LV)', definition: 'A virtual partition within a VG. Has its own device path (/dev/VG/LV). Can span multiple PVs. Formatted with a filesystem.' },
      { term: 'LVM snapshot', definition: 'Copy-on-write point-in-time copy of an LV. Original writes go to the snapshot difference area. Used for online backups.' },
      { term: 'pvmove', definition: 'Migrates physical extents from one PV to another within the same VG. Allows hot removal of a disk without data loss.' },
    ],
    pitfalls: [
      'Taking an LVM snapshot that is too small — when the snapshot difference area fills, the snapshot becomes invalid and is automatically removed. Size the snapshot at 20-30% of the source LV for a typical backup window.',
      'Using thin provisioning in production without monitoring thin pool usage — when the pool fills, all thin LVs become read-only simultaneously, causing outages across multiple services.',
      'Running resize2fs before lvextend — always extend the LV first, then the filesystem. Reverse order causes filesystem corruption.',
    ],
    keyQuestions: [
      {
        question: 'Your /data partition is 95% full. How do you extend it online without restarting the service?',
        answer: `Assuming the partition is on LVM and the filesystem is ext4 or XFS:

1. Check current state:
   df -h /data
   lvdisplay
   vgdisplay   # Check available free space in the VG

2a. If VG has free space:
   lvextend -l +100%FREE /dev/myvg/data_lv
   # For ext4:
   resize2fs /dev/myvg/data_lv
   # For XFS (mount must be active):
   xfs_growfs /data

2b. If VG has no free space — add a new disk:
   # After attaching new EBS volume or disk (e.g., /dev/xvdf):
   pvcreate /dev/xvdf
   vgextend myvg /dev/xvdf
   lvextend -l +100%FREE /dev/myvg/data_lv
   resize2fs /dev/myvg/data_lv   # or xfs_growfs /data

3. Verify:
   df -h /data   # Should show new size immediately

The entire operation is online for XFS and ext4 on LVM. The service never needs to stop. The resize2fs command for ext4 can take a few minutes on large filesystems but the filesystem remains mounted and accessible throughout.`,
      },
    ],
    references: [
      'https://man7.org/linux/man-pages/man8/lvm.8.html',
      'https://www.kernel.org/doc/html/latest/admin-guide/device-mapper/thin-provisioning.html',
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
      { title: 'SSH Authentication Flow', caption: 'The full handshake sequence from TCP connect through ECDH key exchange, host key verification against known_hosts (with TOFU warning on mismatch), and pubkey challenge-response auth.', image: '/diagrams/linux/linux-ssh-hardening-auth.png' },
      { title: 'sshd Hardening Checklist', caption: 'Seven independent sshd_config knobs — disabling password auth, blocking root login, restricting crypto algorithms, non-default port, idle timeouts, fail2ban, and optional TOTP 2FA.', image: '/diagrams/linux/linux-ssh-hardening-config.png' },
    ],
    introduction: `SSH is the primary remote access mechanism for Linux servers. Default configurations are deliberately permissive for broad compatibility; production servers require explicit hardening.

Authentication hardening: disable password authentication (PasswordAuthentication no), disable root login (PermitRootLogin no), restrict to specific users/groups (AllowUsers, AllowGroups). Use ed25519 keys — they are faster and the signature is smaller than RSA 2048. RSA 4096 is acceptable; RSA 2048 is the minimum; DSA is broken and should be removed.

Network hardening: change the default port (Port 2222) to reduce automated scan noise (security through obscurity, not a real control). Bind only to necessary interfaces (ListenAddress). Set MaxAuthTries 3 and LoginGraceTime 30. Enable AllowTcpForwarding no and X11Forwarding no unless specifically needed.

fail2ban or sshguard automatically bans IPs with repeated failed authentication attempts by writing iptables/nftables rules. Install and configure as a first line of defense against brute-force.

Certificate-based SSH (using OpenSSH CA) is the enterprise-grade approach: instead of distributing hundreds of public keys, you maintain a CA keypair, sign user public keys with it, and configure servers to trust the CA. Certificate expiry enforces rotation without hunting down old keys across servers.

SSH agent forwarding (ForwardAgent yes) is a security risk — it allows the remote server to use your local SSH agent to authenticate to other servers, meaning a compromised jump host can use your credentials. Use ProxyJump instead: ssh -J jumphost target.`,
    whenToUse: [
      'Hardening a new EC2 instance before making it production-facing',
      'Setting up a bastion/jump host pattern for VPC access without a VPN',
      'Replacing ad-hoc key distribution with a CA-based SSH trust model',
      'Explaining why SSH agent forwarding is dangerous and ProxyJump is the safe alternative',
    ],
    keyConcepts: [
      { term: 'PasswordAuthentication no', definition: 'Disables password login for SSH. Only key-based or certificate-based authentication succeeds. Essential for any internet-facing server.' },
      { term: 'ed25519 keys', definition: 'Modern elliptic curve algorithm. 256-bit keys with stronger security than RSA 2048, faster to generate and sign, shorter key material.' },
      { term: 'ProxyJump', definition: 'SSH through a jump host without agent forwarding: ssh -J user@jumphost user@target. The jump host only forwards encrypted packets — it never sees plaintext or your key.' },
      { term: 'SSH CA', definition: 'A keypair that signs user SSH certificates. Servers trust the CA public key instead of individual user keys. Enables expiry, revocation via KRL, and centralized trust management.' },
      { term: 'fail2ban', definition: 'Daemon that monitors log files for failed authentication attempts and bans offending IPs via iptables. Reduces brute-force noise on exposed SSH ports.' },
    ],
    pitfalls: [
      'Using SSH agent forwarding (ForwardAgent yes) through untrusted jump hosts — the jump host can abuse your agent socket to authenticate to any host that trusts your key.',
      'Setting PermitRootLogin without-password instead of no — still allows root login if an attacker has a key. Set to no and sudo from a named user instead.',
      'Trusting ~/.ssh/authorized_keys management to manual processes at scale — quickly gets out of sync. Use a CA or a secrets manager (Vault SSH CA, AWS Systems Manager) for centralized management.',
    ],
    keyQuestions: [
      {
        question: 'How do you set up a secure bastion host pattern for accessing private EC2 instances?',
        answer: `Architecture: a bastion (jump host) is a single, hardened EC2 instance in a public subnet. Private instances are in private subnets with no public IP. Security groups on private instances allow SSH only from the bastion's security group ID.

Bastion hardening:
1. Use an AMI with minimal installed packages.
2. /etc/ssh/sshd_config:
   PasswordAuthentication no
   PermitRootLogin no
   AllowUsers ec2-user
   MaxAuthTries 3
   ClientAliveInterval 300
   ClientAliveCountMax 2
3. Security group: only allow port 22 from your corporate IP ranges.
4. Install fail2ban.
5. Enable CloudTrail and VPC Flow Logs to audit all SSH sessions.

Client configuration (~/.ssh/config):
Host bastion
  HostName <bastion-public-ip>
  User ec2-user
  IdentityFile ~/.ssh/prod.pem

Host private-*
  User ec2-user
  IdentityFile ~/.ssh/prod.pem
  ProxyJump bastion

Access: ssh private-db-01 (SSH automatically tunnels through the bastion using ProxyJump).

For even better security: use AWS Systems Manager Session Manager (no open SSH port at all, uses IAM for auth, all sessions logged to CloudTrail). EC2 Instance Connect also eliminates long-lived keys by issuing short-lived certs.`,
      },
      {
        question: 'Explain how certificate-based SSH works and why it is better than authorized_keys management.',
        answer: `In traditional SSH, each user public key must be added to ~/.ssh/authorized_keys on every server they need to access. At scale (100 users, 500 servers), this is 50,000 key entries that must be kept synchronized. Revoking a key requires removing it from every server.

Certificate-based SSH uses a CA:
1. Generate a CA keypair: ssh-keygen -t ed25519 -f /etc/ssh/ca
2. Configure servers to trust the CA: TrustedUserCAKeys /etc/ssh/ca.pub in sshd_config
3. Sign a user's public key: ssh-keygen -s /etc/ssh/ca -I "alice@company" -n "alice" -V +8h alice.pub
   This creates alice-cert.pub with identity "alice", valid for 8 hours, for principal "alice."
4. User's SSH config: IdentityFile ~/.ssh/alice and Certificate ~/.ssh/alice-cert.pub
5. Server validates the cert signature against the CA public key — no per-user authorized_keys needed.

Advantages:
- Add a new server: just add TrustedUserCAKeys — instantly trusts all existing users.
- Revoke a user: put the cert serial in a KRL (Key Revocation List) via ssh-keygen -k. Servers check the KRL.
- Certificate expiry enforces rotation: an 8-hour cert forces re-issuance 3× per day. No stale keys.
- Audit trail: every cert is signed with an identity string that appears in auth logs.

Tools that implement this: HashiCorp Vault SSH Secrets Engine, Teleport, BeyondTrust. AWS Certificate Manager does not support SSH CAs — use SSM Session Manager or Vault for AWS.`,
      },
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
      { title: 'Unit State Machine', caption: 'Every state a systemd service unit passes through — inactive, activating, active, reloading, deactivating, failed — and the systemctl commands or events that drive each transition.', image: '/diagrams/linux/systemd-units-lifecycle.png' },
      { title: 'Unit File Sections', caption: 'The three mandatory sections of a .service file: [Unit] for ordering and dependencies, [Service] for process config and sandbox hardening, and [Install] for boot-time enablement.', image: '/diagrams/linux/systemd-units-file.png' },
    ],
    introduction: `systemd is the init system and service manager on virtually all modern Linux distributions. It parallelizes service startup by tracking inter-service dependencies and starting services simultaneously when their dependencies are met.

Unit files live in /usr/lib/systemd/system/ (distribution packages), /etc/systemd/system/ (admin overrides), and ~/.config/systemd/user/ (user units). The [Unit] section declares dependencies and ordering. The [Service] section defines execution. The [Install] section defines how to enable the unit.

Service types control how systemd tracks the main process: simple (default, main process is ExecStart), forking (daemon forks and parent exits; PIDFile must be set), notify (process sends sd_notify("READY=1") when ready), exec (waits for ExecStart to complete), oneshot (completes and exits, but service remains active).

Dependency keywords: Requires (hard dependency; if the dependency stops, this unit stops), Wants (soft dependency; unit starts even if the dependency fails), After/Before (ordering; Requires does not imply After). BindsTo is stronger than Requires — if the bound unit deactivates, this unit immediately deactivates.

Socket activation: systemd listens on a socket (myservice.socket unit), passes the fd to the service on first connection. The service only starts when needed. Used by sshd, dbus, and many others. This enables zero-downtime service restarts — the socket stays open while the service restarts.

Hardening directives in [Service]: PrivateTmp (private /tmp), NoNewPrivileges (no suid), ProtectSystem=strict, CapabilityBoundingSet, RestrictNamespaces. These implement least-privilege for system services.`,
    whenToUse: [
      'Writing a systemd service for a custom application (API server, background worker)',
      'Diagnosing why a service fails to start with "Failed to start" in systemctl status',
      'Implementing socket activation for a service that should only start on demand',
      'Hardening a service unit to run with minimal privileges',
    ],
    keyConcepts: [
      { term: 'Service type=notify', definition: 'Service sends sd_notify("READY=1") when initialization is complete. systemd waits for this notification before starting dependent services. Use for services with long startup sequences.' },
      { term: 'After= vs Requires=', definition: 'After=network.target means start after networking, but does not create a dependency. Requires=postgresql.service means fail if postgres is not running. Most services need both.' },
      { term: 'WantedBy=multi-user.target', definition: 'In [Install] section. Running systemctl enable creates a symlink in multi-user.target.wants/, causing the service to start at boot in multi-user mode.' },
      { term: 'Restart=on-failure', definition: 'Automatically restart the service if it exits with a non-zero exit code. RestartSec=5 adds a 5-second delay between restarts.' },
      { term: 'Socket activation', definition: 'systemd holds open the listening socket; passes it to the service process on first connection. Service can restart without dropping connections.' },
    ],
    pitfalls: [
      'Using Requires= without After= — the dependency may be "running" but not yet fully initialized. Services that share a Requires= without After= can start in any order.',
      'Setting Type=simple for a service that forks — systemd considers the unit active as soon as ExecStart returns, but the actual daemon is a child that may not yet be listening. Use Type=forking with PIDFile or Type=notify.',
      'Forgetting to run systemctl daemon-reload after editing a unit file — systemd continues using the cached version of the old unit.',
    ],
    keyQuestions: [
      {
        question: 'Write a systemd service unit for a Node.js API server that should restart on failure and start after the network is up.',
        answer: `[Unit]
Description=Node.js API Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=nodeapp
Group=nodeapp
WorkingDirectory=/opt/api
ExecStart=/usr/bin/node /opt/api/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=-/opt/api/.env

# Hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=/opt/api/logs

StandardOutput=journal
StandardError=journal
SyslogIdentifier=api-server

[Install]
WantedBy=multi-user.target

Install and start:
cp api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now api.service
systemctl status api-server

Verify logs:
journalctl -u api-server -f

Key decisions: Type=simple because Node.js does not fork. Restart=on-failure with RestartSec=5 prevents tight restart loops. EnvironmentFile=-/opt/api/.env (note the -) means failure to read the file is non-fatal. ProtectSystem=strict makes / read-only except for ReadWritePaths.`,
      },
      {
        question: 'Your systemd service is stuck in "activating" state. How do you diagnose it?',
        answer: `systemctl status myservice   # Shows current state and last 10 log lines
journalctl -u myservice -n 50 --no-pager   # More log context
journalctl -u myservice --since "10 min ago"   # Time-bounded

Common causes by service type:

Type=simple: the ExecStart process is running but something external is blocking — check if the process is actually doing work (ps aux | grep myservice, strace -p PID).

Type=forking: the parent process did not exit after forking, or the PIDFile does not contain the child PID. Check PIDFile path exists and is readable by systemd.

Type=notify: the service started but never called sd_notify("READY=1"). Add timeout: TimeoutStartSec=30 to fail fast. Check if the application supports sd_notify (look for libsystemd or sd_notify in the code).

Type=oneshot with RemainAfterExit=yes: ExecStart is still running or hung.

Dependencies: the service may be waiting for a dependency. Use:
systemd-analyze critical-chain myservice.service   # Shows dependency chain and timing
systemctl list-dependencies myservice.service   # Lists all deps

If a dependency is stuck, recursively apply the same diagnosis to it.`,
      },
    ],
    references: [
      'https://www.freedesktop.org/software/systemd/man/systemd.service.html',
      'https://www.freedesktop.org/software/systemd/man/systemd.unit.html',
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
      { title: 'cgroup v2 Hierarchy', caption: 'How systemd organises all processes under three top-level slices (system, user, machine), with each service unit getting its own leaf cgroup for resource accounting and limits.', image: '/diagrams/linux/systemd-cgroups-hierarchy.png' },
      { title: 'cgroup Controllers', caption: 'The five cgroup v2 resource controllers — cpu, memory, io, pids, net_cls — and the specific limit directives (CPUQuota, MemoryMax, TasksMax) that map to systemd unit-file settings.', image: '/diagrams/linux/systemd-cgroups-controllers.png' },
    ],
    introduction: `Control groups (cgroups) and namespaces are the two kernel features that make containers possible. Cgroups provide resource accounting and limiting; namespaces provide isolation of resources between groups of processes.

Cgroups (v2) organise processes into a hierarchy. Each cgroup has resource controllers: cpu (CPU time share and quota), memory (max RSS, swap, page cache), io (disk bandwidth), pids (max processes), network (via tc qdisc or eBPF). When a cgroup's memory limit is exceeded, the kernel OOM-kills a process within that cgroup. Docker and containerd use the memory cgroup for container limits.

Cgroups v1 vs v2: v1 has separate hierarchies per controller (one tree for cpu, another for memory). v2 (unified hierarchy) has a single tree with all controllers attached, enabling better coordination. systemd has managed cgroups since v232 (2016). Kubernetes defaults to cgroup v2 since 1.25.

Linux namespaces are the isolation mechanism: pid (process IDs — container gets its own PID 1), net (network interfaces and routing table), mnt (filesystem mount points), uts (hostname and domainname), ipc (System V IPC, POSIX message queues), user (UID/GID mapping — uid 0 in container maps to an unprivileged uid on the host), cgroup (cgroup view), time (system clock).

A container is just a process (or process group) that runs in its own set of namespaces and is controlled by a cgroup. There is no container kernel, no container hypervisor — the same host kernel serves all containers. This is why container isolation is weaker than VM isolation: a container escape exploit can reach the host kernel directly.`,
    whenToUse: [
      'Explaining the technical difference between containers and VMs to non-engineers',
      'Debugging why a container is hitting its memory limit even though the app seems fine — page cache included in limit',
      'Designing rootless containers with user namespace mapping for defense in depth',
      'Understanding why kubernetes Pod resource requests and limits map to cgroup settings',
    ],
    keyConcepts: [
      { term: 'cgroup memory.max', definition: 'Hard limit on memory usage in cgroup v2. When exceeded, the OOM killer kills a process within the cgroup. In containers: --memory flag in Docker, resources.limits.memory in Kubernetes.' },
      { term: 'PID namespace', definition: 'Each container sees its own PID space starting at 1. Container PID 1 maps to a higher PID on the host. Killing PID 1 in the container is SIGKILL from the namespace\'s perspective.' },
      { term: 'Network namespace', definition: 'Each container gets its own network interfaces, routing table, and socket table. Containers communicate through veth pairs connected to the host bridge.' },
      { term: 'User namespace', definition: 'Maps UIDs inside the namespace to different UIDs on the host. Rootless containers run with uid 0 inside but an unprivileged uid on the host, reducing privilege escalation risk.' },
      { term: 'Cgroup v2 unified hierarchy', definition: 'Single cgroup tree with all resource controllers. Enables cross-controller coordination (e.g., memory+swap limits together). Required for Kubernetes cgroup v2 support.' },
    ],
    pitfalls: [
      'Setting container memory limit without accounting for page cache — container cgroup memory includes file-backed pages (page cache). A Java app that reads large files can trigger OOM even if heap is within limits.',
      'Relying on container isolation as a security boundary — namespaces and cgroups isolate processes but a kernel exploit can break all containers on the host. Use VMs for strong security boundaries.',
      'Not setting CPU limits on Kubernetes pods — a pod with no limit can consume all CPU on a node, throttling other pods. Always set both requests (scheduling signal) and limits (enforcement).',
    ],
    keyQuestions: [
      {
        question: 'How do Linux namespaces enable container isolation? Walk through each namespace type.',
        answer: `Namespaces wrap global system resources in an abstraction that appears as its own instance to processes within the namespace. Six primary namespace types for containers:

pid namespace: Container gets its own PID number space starting at 1. The container's PID 1 (e.g., /sbin/init or the app binary) maps to some PID like 18473 on the host. Processes in the container cannot see host PIDs. Killing PID 1 in the container sends SIGKILL to the container init, which may cascade to all children.

net namespace: Container gets its own network stack: loopback (lo), virtual ethernet pair (eth0 inside, vethXXXX on host), its own routing table, iptables rules, and socket table. The container's ip addr shows only its own interfaces, not the host's. Communication between container and host/internet goes through the veth pair and a bridge (docker0 or CNI bridge).

mnt namespace: Container has its own mount table. The container sees its rootfs (an overlay filesystem). Mounts inside the container do not appear on the host's mount table (unless propagated with --bind).

uts namespace: Container has its own hostname and NIS domainname. hostname inside the container can be set without affecting the host.

ipc namespace: Container has its own System V IPC (shared memory segments, semaphores, message queues). Prevents one container's processes from sharing IPC with another container's processes.

user namespace: Maps UIDs inside the container to different UIDs on the host. uid=0 inside the container maps to uid=100000 on the host. This makes rootless containers safe — even if a process escapes the container, it has no host privileges.

A "container" is created by calling unshare() or clone() with namespace flags to enter new namespaces, then execve() to run the container process in that isolated environment. Docker, containerd, and runc all use this mechanism.`,
      },
    ],
    references: [
      'https://man7.org/linux/man-pages/man7/namespaces.7.html',
      'https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html',
    ],
  },
];
