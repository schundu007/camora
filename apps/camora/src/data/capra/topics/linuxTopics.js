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
    visualizations: [],
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
    visualizations: [],
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
    visualizations: [],
    introduction: `Linux uses the **Virtual Filesystem Switch (VFS)** as an abstraction layer between system calls (\`open\`, \`read\`, \`write\`) and specific filesystem implementations. Every filesystem presents the same VFS interface, so userspace code is filesystem-agnostic.\n\n## Inodes\n\nThe **inode** stores file metadata: type, permissions, owner/group, size, timestamps (\`atime\`, \`mtime\`, \`ctime\`), and pointers to data blocks. Critically, the **inode does not contain the filename** \u2014 filenames live in directory entries that map names to inode numbers.\n\n## Hard Links vs Symbolic Links\n\n**Hard links** are directory entries pointing to the same inode. The inode and data are freed only when link count reaches zero and no process has the file open. This is why you can delete a file that a running process holds open \u2014 the data is still accessible via \`/proc/PID/fd/\`.\n\n**Symbolic links** are special files containing a path string. They can cross filesystem boundaries. **Dangling symlinks** point to a non-existent target.\n\n## Common Production Problems\n\n- **Disk full** (\`df -h\`) vs **inode exhaustion** (\`df -i\`) \u2014 a filesystem can run out of inodes even when blocks are available, typically caused by millions of tiny files.`,
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
    visualizations: [],
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
    visualizations: [],
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
    visualizations: [],
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
    visualizations: [],
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
    visualizations: [],
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
    visualizations: [],
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
    visualizations: [],
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
    visualizations: [],
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
    visualizations: [],
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
    references: [
      'https://man7.org/linux/man-pages/man7/namespaces.7.html',
      'https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html',
    ],
  },
];
