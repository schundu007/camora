// Concurrency topics

export const concurrencyTopics = [
    {
      id: 'concurrency-fundamentals',
      title: 'Concurrency Fundamentals',
      icon: 'cpu',
      color: '#10b981',
      description: 'Core concepts of concurrent programming',

      introduction: `Concurrency is the ability of a system to deal with multiple tasks during overlapping time periods—not necessarily simultaneously. It's one of the most frequently tested topics in system design and backend engineering interviews because virtually every production system must handle concurrent requests, background jobs, and shared state safely.

Understanding concurrency means knowing the difference between processes and threads (and when to use each), recognizing race conditions before they become bugs, preventing deadlocks through design rather than debugging, and choosing the right synchronization primitive for the job. In interviews, you'll be expected to explain these concepts clearly, write thread-safe code, and reason about the correctness of concurrent systems.

The distinction between concurrency and parallelism matters: concurrency is about structure (managing multiple tasks), parallelism is about execution (running tasks simultaneously on multiple cores). A single-core machine can be concurrent but not parallel. A Go program with goroutines is concurrent by design; whether it's parallel depends on GOMAXPROCS and the hardware.`,

      basicImplementation: {
        title: 'Process vs Thread',
        description: 'Concurrency manages multiple tasks through time-slicing (illusion of parallelism). Parallelism executes tasks truly simultaneously on multiple cores. Processes have isolated memory (higher overhead, IPC needed). Threads share memory within a process (lower overhead, need synchronization).',
        svgTemplate: 'concurrencyFundamentals'
      },

      coreEntities: [
        { name: 'Process vs Thread', description: 'Process has own memory space; threads share memory within a process' },
        { name: 'Parallelism vs Concurrency', description: 'Parallelism is simultaneous execution; concurrency is managing multiple tasks' },
        { name: 'Race Condition', description: 'When output depends on timing of uncontrollable events' },
        { name: 'Critical Section', description: 'Code section accessing shared resources that needs protection' },
        { name: 'Deadlock', description: 'Circular wait where threads block each other forever' },
        { name: 'Starvation', description: 'Thread never gets resources despite being ready to run' },
        { name: 'Livelock', description: 'Threads keep responding to each other without making progress' }
      ],

      keyQuestions: [
        {
          question: 'What is the difference between concurrency and parallelism?',
          answer: `**Concurrency** is about dealing with multiple things at once (structure). A web server handling 1000 connections on a single core is concurrent—it interleaves request processing using event loops or thread context-switching.

**Parallelism** is about doing multiple things at once (execution). A map-reduce job processing data across 100 cores is parallel—computation happens simultaneously.

**Analogy**: A chef making 3 dishes by switching between them is concurrent. Three chefs each making one dish simultaneously is parallel.

**In Practice**:
- Python's GIL makes CPython threads concurrent but not parallel for CPU-bound work (use multiprocessing for true parallelism)
- Go's goroutines are concurrent by design; GOMAXPROCS controls parallelism
- Java's threads can be both concurrent and parallel depending on the thread pool and hardware
- Node.js is single-threaded but highly concurrent via the event loop`
        },
        {
          question: 'What are the four conditions for deadlock, and how do you prevent it?',
          answer: `**Coffman's Four Conditions** (ALL must hold for deadlock):

1. **Mutual Exclusion**: At least one resource is held in a non-sharable mode
2. **Hold and Wait**: A thread holds at least one resource while waiting for another
3. **No Preemption**: Resources cannot be forcibly taken from a thread
4. **Circular Wait**: A circular chain of threads, each waiting for a resource held by the next

**Prevention Strategies** (break any one condition):

- **Break Circular Wait**: Impose a global ordering on resources. Always acquire locks in the same order (e.g., lock A before lock B). This is the most common and practical approach.
- **Break Hold and Wait**: Require threads to request all resources at once (all-or-nothing). Reduces concurrency but prevents deadlock.
- **Break No Preemption**: Use tryLock() with timeout. If you can't acquire a lock within T milliseconds, release all held locks and retry.
- **Break Mutual Exclusion**: Use lock-free data structures (CAS operations) where possible.

**Detection**: Run a wait-for graph analysis periodically. If a cycle exists, abort one thread to break the deadlock (databases do this automatically with deadlock detection).`
        },
        {
          question: 'When should you use processes vs threads vs async?',
          answer: `**Threads** (shared memory):
- Best for: I/O-bound tasks with shared state, medium concurrency
- Examples: Web servers, database connection pools
- Trade-offs: Lower overhead than processes, but need synchronization

**Processes** (isolated memory):
- Best for: CPU-bound tasks, isolation requirements, multi-core parallelism
- Examples: Worker pools, data processing pipelines, sandboxed execution
- Trade-offs: Higher memory overhead, communication via IPC (pipes, sockets, shared memory)

**Async/Event Loop** (single thread, non-blocking):
- Best for: High-concurrency I/O-bound tasks with minimal shared state
- Examples: Web servers (Node.js, Python asyncio), API gateways, WebSocket servers
- Trade-offs: Great scalability for I/O, but CPU-bound work blocks the event loop

**Decision Framework**:
- Need CPU parallelism? → Processes (or threads in Java/Go)
- Need shared state with moderate concurrency? → Threads
- Need 10K+ concurrent connections? → Async/event loop
- Need fault isolation? → Processes
- In Python? → Processes for CPU-bound, asyncio for I/O-bound (GIL limits threads)`
        }
      ]
    },
    {
      id: 'synchronization-primitives',
      title: 'Synchronization Primitives',
      icon: 'lock',
      color: '#3b82f6',
      description: 'Locks, mutexes, semaphores, and more',

      introduction: `Synchronization primitives are the building blocks for coordinating access to shared resources in concurrent programs. They prevent race conditions and ensure thread safety.`,

      primitives: [
        { name: 'Mutex', description: 'Mutual exclusion lock - only one thread can hold it', example: 'threading.Lock() in Python' },
        { name: 'Semaphore', description: 'Counting lock allowing N concurrent accesses', example: 'threading.Semaphore(n)' },
        { name: 'Condition Variable', description: 'Wait for specific condition with notification', example: 'threading.Condition()' },
        { name: 'Read-Write Lock', description: 'Multiple readers OR one writer', example: 'threading.RLock()' },
        { name: 'Barrier', description: 'Wait until all threads reach a point', example: 'threading.Barrier(n)' }
      ],

      keyQuestions: [
        {
          question: 'What is the difference between a mutex and a semaphore?',
          answer: `**Mutex** (binary):
- Only ONE thread can hold it at a time
- Has ownership: only the thread that acquired it can release it
- Used for: protecting critical sections with shared state
- Example: protecting a shared counter, database connection

**Semaphore** (counting):
- Up to N threads can hold it simultaneously
- No ownership: any thread can signal (release) it
- Used for: limiting concurrent access to a pool of resources
- Example: connection pool of 10 connections → Semaphore(10)

**Key Distinction**: A mutex is for mutual exclusion (only one thread in the critical section). A semaphore is for signaling and resource counting (control how many threads can proceed).

**Common Interview Trap**: A binary semaphore (initialized to 1) looks like a mutex but lacks ownership semantics. A mutex can detect if the same thread tries to lock it twice (reentrant mutex), while a binary semaphore would deadlock.`
        },
        {
          question: 'When should you use a condition variable vs polling?',
          answer: `**Condition Variable** (event-driven):
- Thread sleeps until notified—zero CPU usage while waiting
- Uses: Producer-consumer, bounded buffers, event coordination
- Pattern: \`while (!condition) { cv.wait(lock); }\`
- Always use a while loop (not if) due to spurious wakeups

**Polling / Busy-Wait** (spin):
- Thread continuously checks a flag in a tight loop
- Uses: Very short waits (< microseconds), lock-free algorithms
- Pattern: \`while (!flag.load()) { /* spin */ }\`
- Wastes CPU cycles but avoids context-switch overhead

**Decision Framework**:
- Expected wait > 1 microsecond → condition variable
- Wait time unpredictable → condition variable
- Ultra-low latency critical (HFT, kernel code) → spinlock
- Multiple waiters possible → condition variable (can notify_all)
- Simple flag with one producer/one consumer → atomic variable may suffice

**In Practice**: Almost always use condition variables in application code. Spinlocks are for OS kernels and lock-free data structure internals.`
        },
        {
          question: 'What is a read-write lock and when would you use one?',
          answer: `**Read-Write Lock** allows multiple concurrent readers OR one exclusive writer. This is a significant improvement over a plain mutex for read-heavy workloads.

**When to Use**:
- Read:write ratio > 10:1 (e.g., configuration stores, caches, DNS lookup tables)
- Reads are non-trivial (long-running queries, large data traversals)
- Write frequency is low enough that writer starvation isn't a concern

**When NOT to Use**:
- Balanced read/write ratio → plain mutex is simpler and often faster
- Very short critical sections → RWLock overhead may exceed mutex
- Write-heavy workload → writers constantly starve readers or vice versa

**Variants**:
- **Readers-preference**: Readers never wait if another reader holds the lock. Risk: writer starvation
- **Writers-preference**: New readers wait if a writer is queued. Risk: reader starvation
- **Fair**: FIFO ordering. No starvation but lower throughput

**Java Tip**: StampedLock (Java 8+) offers an optimistic read mode that doesn't actually acquire a lock—ideal for very read-heavy scenarios where writes are rare.`
        }
      ]
    },
    {
      id: 'classic-problems',
      title: 'Classic Concurrency Problems',
      icon: 'alertTriangle',
      color: '#ef4444',
      description: 'Producer-Consumer, Readers-Writers, Dining Philosophers',

      introduction: `These classic problems are frequently asked in interviews and demonstrate fundamental concurrency patterns. Understanding their solutions helps you tackle real-world synchronization challenges.`,

      basicImplementation: {
        title: 'Producer-Consumer Pattern',
        description: 'Producers add items to a bounded buffer while consumers remove them. Uses semaphores (empty_slots, filled_slots) and mutex for synchronization. Producer: wait(empty)→lock→add→unlock→signal(filled). Consumer: wait(filled)→lock→remove→unlock→signal(empty).',
        svgTemplate: 'producerConsumer'
      },

      problems: [
        {
          name: 'Producer-Consumer',
          description: 'Producers add items to buffer, consumers remove. Must handle full/empty buffer.',
          solution: 'Use bounded queue with semaphores or condition variables'
        },
        {
          name: 'Readers-Writers',
          description: 'Multiple readers can read simultaneously, but writers need exclusive access.',
          solution: 'Read-write locks with reader/writer preference strategies'
        },
        {
          name: 'Dining Philosophers',
          description: 'N philosophers share N forks, need 2 forks to eat. Avoid deadlock.',
          solution: 'Resource hierarchy, arbitrator, or Chandy-Misra solution'
        }
      ],

      keyQuestions: [
        {
          question: 'Walk through the Producer-Consumer solution with a bounded buffer',
          answer: `**Problem**: Producers add items to a fixed-size buffer; consumers remove items. Buffer must not overflow (producers block when full) or underflow (consumers block when empty).

**Solution Using Two Semaphores + Mutex**:
\`\`\`
empty_slots = Semaphore(BUFFER_SIZE)  # tracks empty space
filled_slots = Semaphore(0)           # tracks items in buffer
mutex = Mutex()                        # protects buffer access

Producer:
  empty_slots.wait()    # block if buffer is full
  mutex.lock()
  buffer.add(item)
  mutex.unlock()
  filled_slots.signal() # notify consumers

Consumer:
  filled_slots.wait()   # block if buffer is empty
  mutex.lock()
  item = buffer.remove()
  mutex.unlock()
  empty_slots.signal()  # notify producers
\`\`\`

**Why Two Semaphores?**:
- \`empty_slots\` prevents overflow: producers block when buffer is full
- \`filled_slots\` prevents underflow: consumers block when buffer is empty
- The mutex is BETWEEN the semaphore operations, not wrapping them (to avoid deadlock)

**Real-World Examples**: Kafka (producers/consumers with bounded queues), web server request queues, logging pipelines.`
        },
        {
          question: 'How do you solve the Dining Philosophers problem without deadlock?',
          answer: `**Problem**: 5 philosophers sit around a table, each with a fork between them. Each needs 2 forks to eat. Naive solution: each picks up their left fork first → all hold one fork → deadlock.

**Solution 1: Resource Ordering** (most common in interviews):
Number forks 0-4. Always pick up the lower-numbered fork first. Philosopher 4 picks up fork 0 (not fork 4) first, breaking the circular wait.

**Solution 2: Limit Diners**
Use a semaphore initialized to 4. At most 4 philosophers can attempt to eat simultaneously. With 5 forks and at most 4 diners, at least one philosopher can always acquire both forks.

**Solution 3: Chandy-Misra**
Each fork starts "dirty." A philosopher requests forks from neighbors. If a neighbor's fork is dirty, they clean it and send it. Clean forks are kept. This allows full parallelism with no central coordinator.

**Interview Tip**: Start with resource ordering (simplest, most practical). Mention the Chandy-Misra solution to show depth. Explain which Coffman condition each solution breaks.`
        }
      ]
    },
    {
      id: 'thread-pools',
      title: 'Thread Pools',
      icon: 'layers',
      color: '#8b5cf6',
      description: 'Managing worker threads efficiently',

      introduction: `Thread pools manage a collection of reusable worker threads to execute tasks. They reduce overhead from thread creation/destruction and prevent resource exhaustion from unbounded thread spawning.`,

      basicImplementation: {
        title: 'Thread Pool Architecture',
        description: 'Managing worker threads efficiently with task queue and bounded concurrency',
        svgTemplate: 'threadPool',
        architecture: `
┌──────────────────────────────────────────────────────────────────────────┐
│                           Thread Pool                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐    ┌──────────────────────────────────────────────┐ │
│  │  Task Submitter │───►│              Task Queue                       │ │
│  │  (Main Thread)  │    │  [Task1][Task2][Task3][Task4][Task5]...      │ │
│  └─────────────────┘    └──────────────────────────────────────────────┘ │
│                                         │                                 │
│                                         ▼                                 │
│         ┌───────────────────────────────────────────────────────┐        │
│         │                   Worker Threads                       │        │
│         │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │        │
│         │  │Worker 1 │  │Worker 2 │  │Worker 3 │  │Worker 4 │   │        │
│         │  │ [busy]  │  │ [idle]  │  │ [busy]  │  │ [idle]  │   │        │
│         │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │        │
│         │       │            │            │            │         │        │
│         │       ▼            ▼            ▼            ▼         │        │
│         │   Execute      Wait for      Execute     Wait for     │        │
│         │   Task 1       next task     Task 3      next task    │        │
│         └───────────────────────────────────────────────────────┘        │
│                                         │                                 │
│                                         ▼                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        Completed Results                          │   │
│  │                    Future1 ✓  Future2 ✓  Future3 ...              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Benefits:                                                                │
│  • Reuse threads (no creation overhead)                                  │
│  • Bounded concurrency (prevent resource exhaustion)                     │
│  • Task queue handles bursts gracefully                                  │
└──────────────────────────────────────────────────────────────────────────┘`
      },

      concepts: [
        'Reuse threads instead of creating/destroying',
        'Bounded pool prevents resource exhaustion',
        'Task queue for work distribution',
        'ThreadPoolExecutor in Python, ExecutorService in Java'
      ],

      keyQuestions: [
        {
          question: 'How do you size a thread pool?',
          answer: `**CPU-Bound Tasks**: Pool size = number of CPU cores (or cores + 1). Adding more threads just adds context-switching overhead.

**I/O-Bound Tasks**: Pool size = cores × (1 + wait_time/compute_time). If threads spend 90% of time waiting on I/O, you can have ~10x more threads than cores.

**Mixed Workloads**: Separate CPU-bound and I/O-bound work into different pools. This prevents I/O-bound tasks from starving CPU-bound work.

**Practical Rules of Thumb**:
- Web server: 2× CPU cores for a starting point, tune based on load testing
- Database connection pool: Match to DB's max_connections / number of app instances
- Background job processor: Start small (4-8 threads), monitor queue depth, scale up

**What Happens if the Pool is Too Large?**:
- Excessive context switching (CPU spends time switching instead of working)
- Memory exhaustion (each thread = ~1MB stack in Java)
- Resource contention (too many threads competing for locks)

**What Happens if Too Small?**:
- Tasks queue up, latency increases
- Throughput doesn't scale with available hardware

**Interview Answer**: "I'd start with cores × 2 for a mixed workload, instrument with metrics (queue depth, thread utilization, latency percentiles), and tune based on actual production behavior."`
        },
        {
          question: 'What are the different thread pool rejection policies?',
          answer: `When a thread pool's queue is full and all threads are busy, a rejection policy determines what happens to new tasks:

**AbortPolicy** (default in Java): Throws RejectedExecutionException. Caller must handle the error. Best for: critical tasks where silent data loss is unacceptable.

**CallerRunsPolicy**: The submitting thread executes the task itself. Creates natural backpressure—if the pool is overwhelmed, the caller slows down. Best for: graceful degradation.

**DiscardPolicy**: Silently drops the task. Best for: non-critical tasks like metrics/logging where occasional loss is acceptable.

**DiscardOldestPolicy**: Drops the oldest task in the queue and retries the new one. Best for: time-sensitive tasks where old tasks are less valuable.

**Custom Policy**: Log, enqueue to a secondary system, or apply circuit breaker logic.

**In Practice**: Most production systems use CallerRunsPolicy (for backpressure) or a custom policy that logs dropped tasks and triggers alerts.`
        }
      ],

      implementation: `from concurrent.futures import ThreadPoolExecutor
import time

def task(n):
    print(f"Task {n} starting")
    time.sleep(1)
    return n * 2

# Create pool with 4 workers
with ThreadPoolExecutor(max_workers=4) as executor:
    # Submit tasks
    futures = [executor.submit(task, i) for i in range(10)]

    # Get results
    for future in futures:
        print(f"Result: {future.result()}")`
    },
    {
      id: 'concurrent-data-structures',
      title: 'Concurrent Data Structures',
      icon: 'database',
      color: '#06b6d4',
      description: 'Thread-safe collections and atomic operations',

      introduction: `Concurrent data structures are designed for safe access by multiple threads without external synchronization. They use techniques like lock-free algorithms, fine-grained locking, and copy-on-write semantics.`,

      structures: [
        { name: 'ConcurrentHashMap', description: 'Segment-level locking for high concurrency' },
        { name: 'BlockingQueue', description: 'Thread-safe queue with blocking operations' },
        { name: 'CopyOnWriteArrayList', description: 'Snapshot semantics for read-heavy workloads' },
        { name: 'AtomicInteger', description: 'Lock-free atomic operations via CAS' }
      ],

      keyQuestions: [
        {
          question: 'How does ConcurrentHashMap achieve better performance than a synchronized HashMap?',
          answer: `**synchronized HashMap**: Every operation locks the entire map. One thread reading blocks all other threads from reading OR writing.

**ConcurrentHashMap** (Java):
- **Java 7**: Divides the map into 16 segments, each with its own lock. Different threads can read/write to different segments concurrently.
- **Java 8+**: Lock-free reads (volatile reads), fine-grained locking (locks individual hash buckets on writes), and uses CAS operations for simple updates. Falls back to synchronized blocks only when hash bucket becomes a tree (high collision).

**Performance Comparison**:
- 16 threads, 90% reads: ConcurrentHashMap is ~10-15x faster
- 16 threads, 50% writes: ConcurrentHashMap is ~3-5x faster
- Single thread: Nearly identical performance

**When to Use What**:
- Read-heavy with rare writes → ConcurrentHashMap
- Simple key-value with atomic operations → ConcurrentHashMap
- Need sorted order → ConcurrentSkipListMap
- Full snapshot iteration → Collections.synchronizedMap() or CopyOnWriteMap

**Go Equivalent**: sync.Map (optimized for stable keys with rare writes), or a map protected by sync.RWMutex for general use.`
        },
        {
          question: 'What are lock-free data structures and when should you use them?',
          answer: `**Lock-Free Data Structures** use atomic operations (Compare-And-Swap / CAS) instead of locks. No thread can be blocked by another thread—if one thread is suspended, others can still make progress.

**CAS Operation**: \`compareAndSwap(expected, new)\` — atomically: if current value equals expected, set to new and return true; otherwise return false.

**Examples**:
- **AtomicInteger/AtomicLong**: Lock-free counters using CAS
- **ConcurrentLinkedQueue**: Lock-free FIFO queue (Michael-Scott algorithm)
- **LongAdder** (Java 8+): Striped counters that reduce CAS contention—better than AtomicLong for high-contention counting

**When to Use**:
- Very high contention where lock overhead dominates
- Simple operations (counters, flags, pointers)
- Real-time systems where blocking is unacceptable

**When NOT to Use**:
- Complex multi-step operations (locks are simpler and correct)
- Low contention (lock overhead is negligible, lock-free adds complexity)
- When you need to protect invariants across multiple variables

**Interview Insight**: Lock-free doesn't mean faster in all cases. Under low contention, a simple mutex is often faster because CAS retry loops can cause more overhead than a quick lock/unlock.`
        }
      ]
    },
    {
      id: 'thread-lifecycle',
      title: 'Thread Lifecycle',
      icon: 'refreshCw',
      color: '#f59e0b',
      description: 'Thread states, transitions, and daemon threads',

      introduction: `Understanding the thread lifecycle is fundamental to writing correct concurrent programs. A thread transitions through well-defined states from creation to termination, and knowing these states helps you diagnose deadlocks, understand scheduling behavior, and use synchronization primitives correctly.

In Java, threads have six states defined by Thread.State: NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, and TERMINATED. In Python and other languages the model is similar conceptually, though the APIs differ. Daemon threads are background threads that do not prevent the JVM/process from exiting, making them suitable for housekeeping tasks.`,

      coreEntities: [
        { name: 'NEW', description: 'Thread object created but start() not yet called; no OS thread allocated' },
        { name: 'RUNNABLE', description: 'Thread is eligible to run; may be actively executing or waiting for CPU time from the scheduler' },
        { name: 'BLOCKED', description: 'Thread is waiting to acquire a monitor lock held by another thread (e.g., entering a synchronized block)' },
        { name: 'WAITING', description: 'Thread is waiting indefinitely for another thread to perform an action (e.g., Object.wait(), Thread.join(), LockSupport.park())' },
        { name: 'TIMED_WAITING', description: 'Thread is waiting with a timeout (e.g., Thread.sleep(ms), Object.wait(ms), Thread.join(ms))' },
        { name: 'TERMINATED', description: 'Thread has completed execution (run() returned) or was stopped due to an uncaught exception' },
        { name: 'Daemon Thread', description: 'Background thread that does not prevent JVM shutdown; set via setDaemon(true) before start()' }
      ]
    },
    {
      id: 'fork-join-framework',
      title: 'Fork/Join Framework',
      icon: 'gitBranch',
      color: '#6366f1',
      description: 'Work stealing, recursive decomposition, and parallel computation',

      introduction: `The Fork/Join framework is designed for divide-and-conquer parallelism. It splits a large task into smaller subtasks (fork), processes them in parallel, and combines the results (join). The framework uses a work-stealing algorithm where idle threads steal tasks from the queues of busy threads, ensuring all cores stay utilized.

Java's ForkJoinPool is the backbone of parallel streams and CompletableFuture. Understanding fork/join helps you reason about when parallelism actually improves performance versus when the overhead of task splitting and merging outweighs the benefits.`,

      basicImplementation: {
        title: 'Fork/Join Architecture',
        description: 'Recursive decomposition with work-stealing across worker threads. Each worker has a deque: it pushes/pops its own tasks from one end, while thieves steal from the other end. This minimizes contention between the task owner and stealers.',
        svgTemplate: 'forkJoin'
      },

      coreEntities: [
        { name: 'ForkJoinPool', description: 'Thread pool optimized for fork/join tasks; defaults to number-of-cores threads with work-stealing enabled' },
        { name: 'RecursiveTask<V>', description: 'A task that returns a result; override compute() to split work and combine sub-results' },
        { name: 'RecursiveAction', description: 'A task with no return value; used for parallel side-effect operations like array sorting' },
        { name: 'Work Stealing', description: 'Idle threads steal tasks from the tail of busy threads deques, balancing load dynamically without central coordination' },
        { name: 'Threshold', description: 'Base case size below which the task is computed sequentially; tuning this is critical for performance' }
      ],

      implementation: `import java.util.concurrent.*;

// Sum an array using Fork/Join
class SumTask extends RecursiveTask<Long> {
    private final int[] array;
    private final int start, end;
    private static final int THRESHOLD = 10_000;

    SumTask(int[] array, int start, int end) {
        this.array = array;
        this.start = start;
        this.end = end;
    }

    @Override
    protected Long compute() {
        if (end - start <= THRESHOLD) {
            // Base case: compute sequentially
            long sum = 0;
            for (int i = start; i < end; i++) sum += array[i];
            return sum;
        }
        int mid = (start + end) / 2;
        SumTask left = new SumTask(array, start, mid);
        SumTask right = new SumTask(array, mid, end);

        left.fork();           // Submit left to pool
        long rightResult = right.compute();  // Compute right in current thread
        long leftResult = left.join();       // Wait for left result

        return leftResult + rightResult;
    }
}

// Usage
ForkJoinPool pool = new ForkJoinPool();  // default parallelism = #cores
int[] data = new int[1_000_000];
long sum = pool.invoke(new SumTask(data, 0, data.length));`
    },
    {
      id: 'read-write-locks',
      title: 'Read-Write Locks',
      icon: 'bookOpen',
      color: '#ec4899',
      description: 'Shared vs exclusive access and the reader-writer problem',

      introduction: `A Read-Write Lock (RWLock) allows multiple concurrent readers OR a single exclusive writer. This is a significant improvement over a plain mutex for read-heavy workloads: instead of serializing all access, multiple readers can proceed simultaneously, and only writes require exclusive access.

The classic reader-writer problem has three variants: readers-preference (readers never wait if the lock is held by another reader, risking writer starvation), writers-preference (new readers wait if a writer is queued, risking reader starvation), and fair (strict FIFO ordering, no starvation for either). Java's ReentrantReadWriteLock supports both fair and non-fair modes.`,

      primitives: [
        { name: 'ReadLock', description: 'Shared lock acquired by readers; multiple threads can hold it simultaneously', example: 'rwlock.readLock().lock()' },
        { name: 'WriteLock', description: 'Exclusive lock acquired by writers; blocks all readers and other writers', example: 'rwlock.writeLock().lock()' },
        { name: 'Lock Downgrade', description: 'Acquiring a read lock while holding the write lock, then releasing the write lock; supported by ReentrantReadWriteLock', example: 'writeLock -> readLock -> release writeLock' },
        { name: 'Lock Upgrade', description: 'Attempting to acquire write lock while holding read lock; NOT supported by ReentrantReadWriteLock (causes deadlock)', example: 'Use StampedLock.tryConvertToWriteLock() instead' },
        { name: 'StampedLock (Java 8+)', description: 'Optimistic read mode that does not actually acquire a lock, plus read/write modes; higher throughput than ReentrantReadWriteLock', example: 'long stamp = lock.tryOptimisticRead()' }
      ],

      implementation: `import threading
import time

class ReadWriteLock:
    """Fair read-write lock implementation."""
    def __init__(self):
        self._lock = threading.Lock()
        self._readers = 0
        self._writer_active = False
        self._writer_waiting = 0
        self._can_read = threading.Condition(self._lock)
        self._can_write = threading.Condition(self._lock)

    def acquire_read(self):
        with self._lock:
            # Wait if a writer is active or writers are waiting (fair policy)
            while self._writer_active or self._writer_waiting > 0:
                self._can_read.wait()
            self._readers += 1

    def release_read(self):
        with self._lock:
            self._readers -= 1
            if self._readers == 0:
                self._can_write.notify()

    def acquire_write(self):
        with self._lock:
            self._writer_waiting += 1
            while self._writer_active or self._readers > 0:
                self._can_write.wait()
            self._writer_waiting -= 1
            self._writer_active = True

    def release_write(self):
        with self._lock:
            self._writer_active = False
            self._can_read.notify_all()  # Wake all waiting readers
            self._can_write.notify()     # Wake one waiting writer

# Usage: thread-safe cache
class ThreadSafeCache:
    def __init__(self):
        self._data = {}
        self._rw_lock = ReadWriteLock()

    def get(self, key):
        self._rw_lock.acquire_read()
        try:
            return self._data.get(key)
        finally:
            self._rw_lock.release_read()

    def put(self, key, value):
        self._rw_lock.acquire_write()
        try:
            self._data[key] = value
        finally:
            self._rw_lock.release_write()`
    },
    {
      id: 'condition-variables',
      title: 'Condition Variables',
      icon: 'bell',
      color: '#14b8a6',
      description: 'Wait/notify patterns, spurious wakeups, and producer-consumer with conditions',

      introduction: `Condition variables allow threads to wait for a specific condition to become true, rather than busy-waiting or polling. A thread acquires a lock, checks the condition, and if it is not met, calls wait() which atomically releases the lock and suspends the thread. When another thread changes the state and calls notify/notifyAll, waiting threads are woken up to re-check the condition.

The critical rule is to ALWAYS check conditions in a while loop, not an if statement, because of spurious wakeups: a thread may be woken up even when no notify was called. The while loop ensures the condition is actually true before proceeding.`,

      coreEntities: [
        { name: 'wait()', description: 'Atomically releases the associated lock and suspends the calling thread until notified' },
        { name: 'notify()', description: 'Wakes up one arbitrary thread waiting on this condition; the awakened thread must re-acquire the lock' },
        { name: 'notifyAll()', description: 'Wakes up all threads waiting on this condition; they compete to re-acquire the lock' },
        { name: 'Spurious Wakeup', description: 'A thread may wake from wait() without any thread calling notify; always use a while loop to re-check the condition' },
        { name: 'Predicate', description: 'The boolean condition being checked (e.g., buffer not empty, count > 0); must be protected by the same lock' }
      ],

      implementation: `import threading

class BoundedBuffer:
    """Producer-consumer buffer using condition variables."""
    def __init__(self, capacity: int):
        self.buffer = []
        self.capacity = capacity
        self.lock = threading.Lock()
        self.not_full = threading.Condition(self.lock)
        self.not_empty = threading.Condition(self.lock)

    def produce(self, item):
        with self.not_full:
            # MUST use while loop—not if—due to spurious wakeups
            while len(self.buffer) >= self.capacity:
                self.not_full.wait()
            self.buffer.append(item)
            self.not_empty.notify()  # Signal one waiting consumer

    def consume(self):
        with self.not_empty:
            while len(self.buffer) == 0:
                self.not_empty.wait()
            item = self.buffer.pop(0)
            self.not_full.notify()  # Signal one waiting producer
            return item

# Multiple producers and consumers
buffer = BoundedBuffer(capacity=10)

def producer(name, count):
    for i in range(count):
        buffer.produce(f"{name}-item-{i}")
        print(f"{name} produced item {i}")

def consumer(name, count):
    for _ in range(count):
        item = buffer.consume()
        print(f"{name} consumed {item}")

threads = [
    threading.Thread(target=producer, args=("P1", 20)),
    threading.Thread(target=producer, args=("P2", 20)),
    threading.Thread(target=consumer, args=("C1", 20)),
    threading.Thread(target=consumer, args=("C2", 20)),
]
for t in threads: t.start()
for t in threads: t.join()`
    },
    {
      id: 'barriers-latches',
      title: 'Barriers & Latches',
      icon: 'shield',
      color: '#f97316',
      description: 'CyclicBarrier, CountDownLatch, Phaser, and Exchanger',

      introduction: `Barriers and latches are synchronization constructs that coordinate groups of threads reaching a common point. A CountDownLatch is a one-shot gate: threads wait until a counter reaches zero. A CyclicBarrier is reusable: threads wait until all parties arrive, then all proceed and the barrier resets. A Phaser generalizes both with dynamic registration and multiple phases.

These are commonly used for parallel initialization (wait until all services are ready), batch processing (process data in parallel then merge), testing (start N threads simultaneously to simulate load), and multi-phase algorithms (all threads complete phase 1 before any starts phase 2).`,

      coreEntities: [
        { name: 'CountDownLatch', description: 'One-shot barrier; initialized with a count, await() blocks until count reaches 0 via countDown() calls; cannot be reset' },
        { name: 'CyclicBarrier', description: 'Reusable barrier; all N parties call await(), all block until the last arrives, then all proceed; barrier resets automatically' },
        { name: 'Phaser', description: 'Flexible barrier supporting dynamic registration/deregistration and multiple numbered phases' },
        { name: 'Exchanger', description: 'Synchronization point where two threads swap objects; useful for pipeline handoffs between producer and consumer stages' },
        { name: 'CompletionService', description: 'Combines executor with completion queue; poll/take completed futures in order of completion rather than submission' }
      ],

      implementation: `import java.util.concurrent.*;

// CountDownLatch: wait for all services to initialize
class ServiceInitializer {
    private final CountDownLatch latch;

    ServiceInitializer(int serviceCount) {
        this.latch = new CountDownLatch(serviceCount);
    }

    void initService(String name) {
        new Thread(() -> {
            System.out.println(name + " initializing...");
            try { Thread.sleep(1000); } catch (InterruptedException e) {}
            System.out.println(name + " ready");
            latch.countDown();
        }).start();
    }

    void awaitAll() throws InterruptedException {
        latch.await();  // Blocks until count reaches 0
        System.out.println("All services ready. Starting application.");
    }
}

// CyclicBarrier: multi-phase parallel computation
class ParallelMatrixMultiply {
    private final CyclicBarrier barrier;
    private final int[][] result;

    ParallelMatrixMultiply(int workers, int[][] result) {
        this.result = result;
        // Barrier action runs after all workers arrive
        this.barrier = new CyclicBarrier(workers, () -> {
            System.out.println("Phase complete. Merging results...");
        });
    }

    void computeRows(int startRow, int endRow) {
        new Thread(() -> {
            // Phase 1: compute assigned rows
            for (int r = startRow; r < endRow; r++) {
                // ... compute result[r]
            }
            try {
                barrier.await();  // Wait for all workers
                // Phase 2: all workers can now read the full result
            } catch (Exception e) {
                Thread.currentThread().interrupt();
            }
        }).start();
    }
}

// Phaser: dynamic participants across phases
Phaser phaser = new Phaser(1); // register self as coordinator
for (int i = 0; i < 3; i++) {
    phaser.register(); // dynamically add participant
    new Thread(() -> {
        System.out.println(Thread.currentThread().getName() + " phase 0");
        phaser.arriveAndAwaitAdvance(); // wait for phase 0

        System.out.println(Thread.currentThread().getName() + " phase 1");
        phaser.arriveAndDeregister(); // leave after phase 1
    }).start();
}
phaser.arriveAndDeregister(); // coordinator deregisters`
    },
    {
      id: 'concurrency-coding-problems',
      title: 'Concurrency Coding Problems',
      icon: 'terminal',
      color: '#ef4444',
      description: 'Classic multithreaded coding challenges from interviews',

      introduction: `Concurrency coding problems are increasingly common in interviews at top tech companies. Unlike algorithmic problems, these test your ability to coordinate multiple threads safely. The problems typically require using locks, semaphores, condition variables, or barriers to ensure threads execute in a specific order or share resources correctly.

The key pattern: identify what shared state exists, what ordering constraints are required, and which synchronization primitive best enforces those constraints. Always think about edge cases like spurious wakeups, thread starvation, and deadlock prevention.`,

      problems: [
        {
          name: 'FizzBuzz Multithreaded',
          description: 'Four threads printing numbers 1-N: thread A prints "fizz" for multiples of 3, thread B prints "buzz" for multiples of 5, thread C prints "fizzbuzz" for multiples of 15, thread D prints the number otherwise. Threads must coordinate so output is in order.',
          solution: 'Use a shared counter protected by a lock and four condition variables (one per thread). Each thread waits until the counter matches its condition, prints, increments the counter, and notifies all threads.'
        },
        {
          name: 'Print in Order',
          description: 'Three methods first(), second(), third() are called by three threads. Ensure they execute in order regardless of scheduling.',
          solution: 'Use two barriers (CountDownLatch or semaphores initialized to 0). first() runs then signals latch1. second() waits on latch1, runs, then signals latch2. third() waits on latch2 then runs.'
        },
        {
          name: 'Building H2O',
          description: 'Multiple threads call hydrogen() or oxygen(). Each water molecule needs exactly 2 hydrogen and 1 oxygen thread to proceed together.',
          solution: 'Use a CyclicBarrier(3) with two semaphores: hydrogen_sem initialized to 2, oxygen_sem initialized to 1. Hydrogen threads acquire hydrogen_sem; oxygen threads acquire oxygen_sem. After the barrier releases, reset the semaphores.'
        },
        {
          name: 'Dining Philosophers',
          description: 'Five philosophers sit around a table with one fork between each pair. Each needs both adjacent forks to eat. Prevent deadlock and starvation.',
          solution: 'Resource ordering: number forks 0-4, always pick up the lower-numbered fork first. This breaks the circular wait condition. Alternatively, use a semaphore initialized to 4 to allow at most 4 philosophers to attempt eating.'
        },
        {
          name: 'Traffic Light Controller',
          description: 'An intersection with two roads (A and B). Cars arrive from both roads. Only one road can have a green light at a time. Minimize unnecessary light changes.',
          solution: 'Use a mutex to protect the current green road state. When a car arrives, check if its road is green. If yes, proceed immediately. If not, change the light (set new road as green) then proceed. The mutex ensures only one car changes the light at a time.'
        }
      ]
    }
  ];

  // Behavioral Topics
  // Behavioral topic categories for organized display
