// Concurrency topics

export const concurrencyTopics = [
    {
      id: 'concurrency-fundamentals',
      title: 'Concurrency Fundamentals',
      icon: 'cpu',
      color: '#10b981',
      description: 'Core concepts of concurrent programming',

      introduction: `Concurrency is the ability of a system to handle multiple tasks simultaneously. Understanding concurrency is essential for building efficient, scalable software systems.

In interviews, you'll be expected to understand the difference between processes and threads, recognize race conditions, and know how to prevent deadlocks.`,

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
