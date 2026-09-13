import type { Topic } from './types';

export const ADVANCED_TOPICS: Topic[] = [
  {
    id: 'async',
    title: 'Async / Await',
    chapter: 'advanced',
    track: 'advanced',
    estimatedMins: 20,
    summary: `How async def and await let a Python program overlap input and output waits instead of blocking, a distinction interviewers test to see if you understand concurrency versus parallelism.`,
    intro: `Async lets Python do other work while waiting for slow operations like network requests to complete. async def defines a coroutine; await suspends it until a result is ready, without blocking the rest of the program.`,
    cleanCode: `import asyncio

async def fetch_user(uid):
    print(f"Fetching {uid}...")
    await asyncio.sleep(1)       # simulate a 1-second network call
    return {"id": uid}

async def main():
    # Run both fetches concurrently — total time ~1s, not 2s
    results = await asyncio.gather(
        fetch_user(1),
        fetch_user(2),
    )
    for r in results:
        print(r)

asyncio.run(main())
# Output (both start together, finish in ~1s):
# Fetching 1...
# Fetching 2...
# {'id': 1}
# {'id': 2}`,
    walkthrough: [
      {
        code: `async def fetch_user(uid):`,
        explain: `Makes the function a coroutine. Calling it returns a coroutine object immediately — no code runs yet. You must await it or pass it to asyncio.gather.`,
      },
      {
        code: `await asyncio.sleep(1)`,
        explain: `Suspends fetch_user for 1 second. While it waits, the event loop runs other coroutines. Both fetches sleep at the same time — total elapsed is ~1s.`,
      },
      {
        code: `asyncio.gather(fetch_user(1), fetch_user(2))`,
        explain: `Starts both coroutines concurrently. They overlap at their await points. Total time is the duration of the longest task, not the sum.`,
      },
      {
        code: `asyncio.run(main())`,
        explain: `Creates the event loop, runs main() until it completes, then closes the loop. The standard entry point for async programs.`,
      },
    ],
    examples: [
      {
        label: 'async for (async generator)',
        code: `import asyncio

async def stream_numbers():
    for i in range(5):
        await asyncio.sleep(0.1)
        yield i

async def main():
    async for num in stream_numbers():
        print(num, end=" ")

asyncio.run(main())
# Output: 0 1 2 3 4`,
      },
      {
        label: 'Timeout & cancellation',
        code: `import asyncio

async def slow_task():
    await asyncio.sleep(5)
    return "done"

async def main():
    try:
        result = await asyncio.wait_for(slow_task(), timeout=2)
    except asyncio.TimeoutError:
        print("Task timed out after 2s")

asyncio.run(main())
# Output: Task timed out after 2s`,
      },
    ],
    edgeCases: [
      `You can only await inside an async def function. await in regular code raises SyntaxError.`,
      `Using time.sleep() inside an async function (instead of await asyncio.sleep()) blocks the entire event loop, freezing all other coroutines.`,
      `async does NOT speed up CPU-bound work (math, image processing). It only helps I/O-bound work (waiting for network, disk). For CPU use multiprocessing.`,
    ],
    gotcha: `Forgetting await: result = fetch_user(1) returns a coroutine object, not the actual result. You will get a RuntimeWarning about a never-awaited coroutine and unexpected behavior.`,
    tip: `Use asyncio.TaskGroup (Python 3.11+) for structured concurrency instead of asyncio.gather. It propagates exceptions cleanly and cancels remaining tasks when one fails.`,
  },

  {
    id: 'concurrency',
    title: 'Concurrency — Threads & Processes',
    chapter: 'advanced',
    track: 'advanced',
    estimatedMins: 20,
    summary: `The tradeoffs between threads, processes, and async in Python, and why the global interpreter lock makes threads useful for input and output but not for CPU-bound work.`,
    intro: `Python has three tools for parallel work: threads (shared memory, I/O-bound), processes (separate memory, CPU-bound), and async (cooperative, I/O-bound). Choosing the wrong tool costs either speed or correctness.`,
    cleanCode: `import concurrent.futures, time

def fetch(url):
    time.sleep(1)           # simulate network latency
    return f"Got {url}"

urls = ["a.com", "b.com", "c.com"]

# Sequential — 3 seconds total
start = time.time()
[fetch(u) for u in urls]
print(f"Sequential: {time.time()-start:.1f}s")   # Output: 3.0s

# Threaded — ~1 second (all three sleep concurrently)
start = time.time()
with concurrent.futures.ThreadPoolExecutor(3) as ex:
    list(ex.map(fetch, urls))
print(f"Threaded: {time.time()-start:.1f}s")     # Output: 1.0s`,
    walkthrough: [
      {
        code: `ThreadPoolExecutor(3)`,
        explain: `Creates a pool of 3 worker threads. Each thread runs fetch() on one URL. Because threads overlap and each one blocks on time.sleep (I/O), all three sleep at the same time — total ~1s.`,
      },
      {
        code: `ex.map(fetch, urls)`,
        explain: `Distributes urls across the thread pool. Results come back in the same order as the input. Use ex.submit() for more control over individual futures.`,
      },
      {
        code: `ProcessPoolExecutor`,
        explain: `Swap this in for CPU-bound work. Each worker is a separate process with its own Python interpreter, bypassing the GIL. Use for image processing, parsing, heavy computation.`,
      },
    ],
    examples: [
      {
        label: 'ProcessPoolExecutor (CPU-bound)',
        code: `import concurrent.futures, math

def is_prime(n):
    if n < 2: return False
    for i in range(2, math.isqrt(n) + 1):
        if n % i == 0: return False
    return True

numbers = list(range(10_000_000, 10_000_100))

# CPU-bound: use processes to bypass the GIL
with concurrent.futures.ProcessPoolExecutor() as ex:
    primes = [n for n, p in zip(numbers, ex.map(is_prime, numbers)) if p]

print(primes[:5])   # first 5 primes in the range`,
      },
      {
        label: 'threading.Lock',
        code: `import threading

counter = 0
lock = threading.Lock()

def increment():
    global counter
    for _ in range(100_000):
        with lock:       # acquire lock, run, release automatically
            counter += 1

threads = [threading.Thread(target=increment) for _ in range(5)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)   # Output: 500000  (correct — no race condition)`,
      },
    ],
    edgeCases: [
      `On Windows, ProcessPoolExecutor code must be inside if __name__ == '__main__': to prevent recursive process spawning.`,
      `The GIL prevents multiple threads from executing Python bytecode simultaneously. Threads help I/O-bound work (I/O releases the GIL) but not CPU-bound work.`,
    ],
    gotcha: `Shared mutable state between threads without a lock causes race conditions — intermittent bugs where the final result depends on which thread ran last. Always protect shared state with a Lock.`,
    tip: `When in doubt: threads for I/O (network, files, databases), processes for CPU (heavy computation), async for high-concurrency I/O (thousands of simultaneous connections).`,
  },

  {
    id: 'type-hints',
    title: 'Type Hints',
    chapter: 'advanced',
    track: 'advanced',
    estimatedMins: 12,
    summary: `Optional annotations that document expected argument and return types for readers and tools like mypy, without Python enforcing them at runtime.`,
    intro: `Type hints are optional annotations that document what types a function expects and returns. Python ignores them at runtime — their value is for human readers and static analysis tools like mypy and pyright.`,
    cleanCode: `from typing import Optional

def greet(name: str, times: int = 1) -> str:
    return (name + " ") * times

def find_user(uid: int) -> Optional[dict]:
    users = {1: {"name": "Alice"}, 2: {"name": "Bob"}}
    return users.get(uid)   # returns None if not found

print(greet("Hi", 3))       # Output: Hi Hi Hi 
print(find_user(1))         # Output: {'name': 'Alice'}
print(find_user(99))        # Output: None`,
    walkthrough: [
      {
        code: `name: str`,
        explain: `Annotates the parameter as a string. Python will not stop you passing an int at runtime, but mypy will flag greet(42) as a type error before you run.`,
      },
      {
        code: `times: int = 1`,
        explain: `Type annotation combined with a default value. Write the annotation before the = sign.`,
      },
      {
        code: `-> str`,
        explain: `The return type. Goes between the closing ) and the colon. -> None means the function returns nothing useful.`,
      },
      {
        code: `Optional[dict]`,
        explain: `Means the function returns either a dict or None. In Python 3.10+ write dict | None instead.`,
      },
    ],
    examples: [
      {
        label: 'Collections & Union',
        code: `# Python 3.9+: built-in generics work directly
def first(items: list[int]) -> int | None:
    return items[0] if items else None

def process(value: int | str) -> str:
    return str(value)

# Callable: a function that takes two ints and returns bool
from typing import Callable
def apply(fn: Callable[[int, int], bool], a: int, b: int) -> bool:
    return fn(a, b)

print(apply(lambda x, y: x > y, 5, 3))  # Output: True`,
      },
      {
        label: 'TypedDict',
        code: `from typing import TypedDict

class UserRecord(TypedDict):
    name: str
    age: int
    email: str

def display(user: UserRecord) -> str:
    return f"{user['name']} ({user['age']})"

user: UserRecord = {"name": "Alice", "age": 30, "email": "a@b.com"}
print(display(user))  # Output: Alice (30)

# Run mypy to check types statically:
# python -m mypy yourfile.py`,
      },
    ],
    edgeCases: [
      `list[int] (Python 3.9+) means a list of ints. In Python 3.8 write from typing import List and use List[int].`,
      `Type hints are NOT enforced at runtime. greet(123) runs fine even with name: str. Enforcement requires running mypy or pyright.`,
      `Use TYPE_CHECKING to import heavy modules only during static analysis: from typing import TYPE_CHECKING / if TYPE_CHECKING: / import MyHeavyClass.`,
    ],
    gotcha: `Type hints are documentation, not validation. If you need runtime validation of external data use pydantic, which enforces types and converts values automatically.`,
    tip: `Annotate function signatures (parameters and return types) first. Skip annotating local variables — mypy infers them. Add from __future__ import annotations at the top of a file to use modern syntax in Python 3.8.`,
  },

  {
    id: 'performance',
    title: 'Performance & Profiling',
    chapter: 'advanced',
    track: 'advanced',
    estimatedMins: 20,
    summary: `How to measure where a Python program is actually slow before optimizing it, using tools like timeit and cProfile instead of guessing.`,
    intro: `Before optimizing, measure. Python has built-in tools to find where slowdowns actually are. Optimizing the wrong place wastes time. The biggest gains usually come from choosing the right data structure, not rewriting algorithms.`,
    cleanCode: `import timeit

# Time a snippet — runs 1000 times, reports total seconds
result = timeit.timeit("sum(range(10000))", number=1000)
print(f"sum(range): {result:.3f}s for 1000 runs")

# Set vs list membership — the single biggest easy win
big_list = list(range(1_000_000))
big_set  = set(big_list)

print(999_999 in big_list)   # True — scans up to 1M items: O(n)
print(999_999 in big_set)    # True — instant hash lookup: O(1)`,
    walkthrough: [
      {
        code: `timeit.timeit(..., number=1000)`,
        explain: `Runs the snippet 1000 times and returns the total seconds. Averaging over many runs filters out OS scheduling noise. A single time.time() before/after is unreliable for fast operations.`,
      },
      {
        code: `999_999 in big_list`,
        explain: `Scans from index 0. For 1 million items, checks up to 1 million elements. Time grows linearly with list size: O(n).`,
      },
      {
        code: `999_999 in big_set`,
        explain: `Computes hash(999_999) and jumps directly to the right bucket — same tiny time whether the set has 10 or 10 million items: O(1).`,
      },
    ],
    examples: [
      {
        label: 'cProfile',
        code: `import cProfile

def work():
    data = []
    for i in range(100_000):
        data.append(i ** 2)
    return sum(data)

cProfile.run("work()")
# Output shows: ncalls tottime percall cumtime for every function
# "cumtime" = total time including called sub-functions

# From the terminal (sorts by time descending):
# python -m cProfile -s cumtime yourscript.py`,
      },
      {
        label: 'deque & lru_cache',
        code: `from collections import deque
from functools import lru_cache

# deque: O(1) append and pop from BOTH ends
# list.insert(0, x) is O(n) — shifts every element
q = deque([1, 2, 3])
q.appendleft(0)    # O(1)
q.popleft()        # O(1)
print(q)           # Output: deque([1, 2, 3])

# lru_cache: memoize expensive calls
@lru_cache(maxsize=None)
def fib(n):
    if n < 2: return n
    return fib(n-1) + fib(n-2)

print(fib(50))     # Output: 12586269025  (instant with cache)
print(fib.cache_info())  # hits=97, misses=51`,
      },
    ],
    edgeCases: [
      `String concatenation in a loop with += creates a new string each iteration — O(n^2) total. Build a list of parts and use ''.join(parts) once at the end.`,
      `Local variable lookups are faster than global or attribute lookups in hot loops. Cache a frequently used attribute before the loop: get = my_dict.get.`,
    ],
    gotcha: `Micro-optimizing before profiling is almost always wrong. Profile first, then optimize only the functions where the profiler shows significant time spent.`,
    tip: `For numerical work, NumPy operations run C code internally and are 10-100x faster than equivalent pure-Python loops. One vectorized NumPy call replaces a for loop over millions of items.`,
  },
];
