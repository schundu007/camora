// Python Quick Reference — stdlib + algorithm cards.
//
// This is the half quickref.me/python has no equivalent for: the collections /
// heapq / bisect / itertools / functools surface that actually decides whether
// a coding-round answer is O(n) or O(n^2), plus complexity tables, reusable
// algorithm templates, the gotcha list, and the version-feature timeline.
//
// Titles must stay unique across BOTH card files — duplicates collapse into
// language tabs in TopicDetail's codeExamples renderer.

export const pythonDsaCards = [
  // ─────────────────────────────────────────────────────────────
  // 6. collections
  // ─────────────────────────────────────────────────────────────
  {
    title: '44 · collections.Counter',
    language: 'python',
    description: 'A dict subclass for frequency counting. most_common uses a heap internally, so top-k is O(n log k) rather than a full sort.',
    code: `from collections import Counter

c = Counter("mississippi")          # Counter({'i':4,'s':4,'p':2,'m':1})
c = Counter([1, 1, 2])
c = Counter({"a": 3})
c = Counter(a=3, b=1)

c["s"]                  # 4
c["zzz"]                # 0  <-- MISSING KEYS RETURN 0, they do not raise
                        #     ...but reading one does NOT insert it
c.most_common()         # all pairs, descending by count
c.most_common(2)        # top 2 — O(n log k) via heapq
c.total()               # 11 (3.10+); before that: sum(c.values())
list(c.elements())      # each key repeated count times

c.update("more")        # ADDS counts (dict.update would REPLACE)
c.subtract("mi")        # subtracts; counts may go negative
del c["m"]

a, b = Counter("abc"), Counter("bcd")
a + b       # sum counts, drops <= 0
a - b       # subtract, KEEPS ONLY POSITIVE counts
a & b       # min of each -> intersection
a | b       # max of each -> union

# Interview one-liners
Counter(s1) == Counter(s2)                      # anagram check, O(n)
[k for k, v in Counter(xs).items() if v > 1]    # duplicates
Counter(xs).most_common(1)[0][0]                # mode
len(Counter(xs))                                # distinct count

# Top-k frequent elements — the canonical use
def top_k_frequent(nums, k):
    return [x for x, _ in Counter(nums).most_common(k)]

# Bucket sort variant when k is large relative to n — O(n)
def top_k_bucket(nums, k):
    freq = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]
    for val, cnt in freq.items():
        buckets[cnt].append(val)
    out = []
    for cnt in range(len(buckets) - 1, 0, -1):
        out.extend(buckets[cnt])
        if len(out) >= k:
            return out[:k]
    return out`,
  },
  {
    title: '45 · collections.defaultdict',
    language: 'python',
    description: 'Supply a zero-argument factory and missing keys are created on access. It removes the setdefault boilerplate from every grouping and adjacency-list build.',
    code: `from collections import defaultdict

dd = defaultdict(int)       # missing -> 0
dd = defaultdict(list)      # missing -> []
dd = defaultdict(set)       # missing -> set()
dd = defaultdict(dict)      # missing -> {}
dd = defaultdict(lambda: -1)          # any zero-arg callable
nested = defaultdict(lambda: defaultdict(int))    # 2-level auto-vivify

# Counting
counts = defaultdict(int)
for w in words:
    counts[w] += 1          # no "if w not in counts" needed

# Grouping — anagram grouping in 3 lines
groups = defaultdict(list)
for w in words:
    groups["".join(sorted(w))].append(w)
list(groups.values())

# Adjacency list for a graph
graph = defaultdict(list)
for u, v in edges:
    graph[u].append(v)
    graph[v].append(u)      # undirected

# GOTCHA: merely READING a missing key INSERTS it
dd = defaultdict(list)
if dd["nope"]:              # dd now contains 'nope': []
    ...
len(dd)                     # 1  <-- use 'k in dd' or dd.get(k) to just test

"nope" in dd                # membership test does NOT insert
dd.get("other")             # returns None, does NOT insert

dict(dd)                    # convert back to a plain dict for output/compare

# dict.setdefault is the no-import equivalent for one-off use
plain = {}
plain.setdefault(k, []).append(v)`,
  },
  {
    title: '46 · collections.deque',
    language: 'python',
    description: 'A doubly linked list of blocks: O(1) append AND popleft. This is the queue for BFS — list.pop(0) is O(n) and turns BFS into O(V^2).',
    code: `from collections import deque

dq = deque([1, 2, 3])
dq = deque(maxlen=3)        # bounded: pushing past maxlen evicts the far end

dq.append(4)                # O(1) right
dq.appendleft(0)            # O(1) LEFT  <-- list.insert(0,x) is O(n)
dq.pop()                    # O(1) right
dq.popleft()                # O(1) LEFT  <-- list.pop(0) is O(n)
dq.extend([5, 6]); dq.extendleft([0, -1])    # extendleft REVERSES the input
dq.rotate(1)                # right by 1;  rotate(-1) rotates left
dq[0], dq[-1]               # O(1) at the ends
# dq[len(dq)//2]            # O(n) in the MIDDLE — deque is not a list

dq.remove(3); dq.clear(); len(dq); 3 in dq   # O(n) each

# BFS — the reason deque exists
def bfs(graph, start):
    seen = {start}
    q = deque([start])
    order = []
    while q:
        node = q.popleft()          # O(1); with a list this is O(n)
        order.append(node)
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)       # mark on ENQUEUE, not on dequeue,
                q.append(nxt)       # or nodes get queued multiple times
    return order

# Level-order BFS (shortest path in an unweighted graph)
def bfs_levels(graph, start):
    q, seen, depth = deque([start]), {start}, 0
    while q:
        for _ in range(len(q)):     # snapshot the level size FIRST
            node = q.popleft()
            for nxt in graph[node]:
                if nxt not in seen:
                    seen.add(nxt); q.append(nxt)
        depth += 1
    return depth

# Sliding-window maximum — monotonic deque of INDICES, O(n) total
def max_window(nums, k):
    dq, out = deque(), []
    for i, n in enumerate(nums):
        while dq and nums[dq[-1]] <= n:
            dq.pop()                    # drop values that can never win
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()                # drop the index that fell out
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out`,
  },
  {
    title: '47 · OrderedDict & LRU Cache',
    language: 'python',
    description: 'Plain dicts keep insertion order, but only OrderedDict has move_to_end and an O(1) popitem(last=False) — which is exactly the LRU eviction primitive.',
    code: `from collections import OrderedDict

od = OrderedDict([("a", 1), ("b", 2)])
od.move_to_end("a")             # -> back (most recent)
od.move_to_end("a", last=False) # -> front
od.popitem(last=False)          # pop the OLDEST, O(1)
od.popitem()                    # pop the newest
od == {"b": 2, "a": 1}          # True — vs another OrderedDict it is ORDER-SENSITIVE

# LRU cache in O(1) per op — a very common interview question
class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)             # mark as recently used
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)      # evict least recently used

# Ready-made function memoisation with LRU eviction
from functools import lru_cache
@lru_cache(maxsize=128)
def slow(n): return n * n
slow.cache_info()       # CacheInfo(hits=…, misses=…, maxsize=128, currsize=…)
slow.cache_clear()

# ChainMap — layered lookup without merging (defaults under overrides)
from collections import ChainMap
cfg = ChainMap({"debug": True}, {"debug": False, "port": 80})
cfg["debug"], cfg["port"]       # True 80 — first mapping wins`,
  },

  // ─────────────────────────────────────────────────────────────
  // 7. heapq / bisect
  // ─────────────────────────────────────────────────────────────
  {
    title: '48 · heapq: Priority Queues',
    language: 'python',
    description: 'Python only ships a MIN-heap. Negate for a max-heap, and push tuples with a tiebreaker so it never has to compare the payload objects.',
    code: `import heapq

h = []
heapq.heappush(h, 3)        # O(log n)
heapq.heappush(h, 1)
h[0]                        # 1 — PEEK the minimum, O(1)
heapq.heappop(h)            # 1 — pop the minimum, O(log n)

xs = [5, 1, 3]
heapq.heapify(xs)           # O(n) in place — cheaper than n pushes (O(n log n))

heapq.heappushpop(h, 4)     # push then pop — one sift
heapq.heapreplace(h, 4)     # pop then push — h must be non-empty
heapq.nlargest(3, xs)       # O(n log k)
heapq.nsmallest(3, xs)
heapq.nlargest(2, people, key=lambda p: p.age)
heapq.merge(sorted_a, sorted_b)     # lazy k-way merge of sorted inputs

# MAX-heap: negate on the way in and out
maxh = []
for v in xs:
    heapq.heappush(maxh, -v)
largest = -heapq.heappop(maxh)

# Tuples: (priority, tiebreaker, payload). The tiebreaker matters because
# heapq compares element-by-element and will try to compare payloads on ties.
import itertools
counter = itertools.count()
heapq.heappush(h, (priority, next(counter), task))   # task is never compared

# Top-k largest with a BOUNDED min-heap — O(n log k) time, O(k) space
def top_k(nums, k):
    h = []
    for n in nums:
        heapq.heappush(h, n)
        if len(h) > k:
            heapq.heappop(h)        # evict the smallest
    return sorted(h, reverse=True)

# Dijkstra
def dijkstra(graph, src):
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")):
            continue                        # stale entry — lazy deletion
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist

# Running median — two heaps (max-heap of the low half, min-heap of the high)
class MedianFinder:
    def __init__(self):
        self.lo, self.hi = [], []           # lo is negated (max-heap)
    def add(self, num):
        heapq.heappush(self.lo, -num)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))
        if len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))
    def median(self):
        if len(self.lo) > len(self.hi):
            return -self.lo[0]
        return (-self.lo[0] + self.hi[0]) / 2`,
  },
  {
    title: '49 · bisect: Binary Search on Sorted Data',
    language: 'python',
    description: 'bisect_left gives the first insertion point, bisect_right the last. Getting that distinction right is what turns a "find the element" search into a "count occurrences" or "find the boundary" search.',
    code: `import bisect

xs = [1, 3, 3, 5, 7]

bisect.bisect_left(xs, 3)     # 1 — FIRST index where 3 could go (leftmost)
bisect.bisect_right(xs, 3)    # 3 — LAST  index where 3 could go (rightmost)
bisect.bisect(xs, 3)          # alias for bisect_right

bisect.insort_left(xs, 4)     # insert keeping sorted order — search O(log n),
bisect.insort_right(xs, 4)    # but the LIST SHIFT is O(n)

# Bounded search window
bisect.bisect_left(xs, 3, lo=1, hi=4)

# key= (3.10+) — search without materialising a projection
people = sorted(people, key=lambda p: p.age)
bisect.bisect_left(people, 30, key=lambda p: p.age)

# Exact membership
def index_of(xs, target):
    i = bisect.bisect_left(xs, target)
    return i if i < len(xs) and xs[i] == target else -1

# Count occurrences in O(log n)
def count(xs, target):
    return bisect.bisect_right(xs, target) - bisect.bisect_left(xs, target)

# First element >= / > target  (lower_bound / upper_bound)
def first_ge(xs, t):  i = bisect.bisect_left(xs, t);  return xs[i] if i < len(xs) else None
def first_gt(xs, t):  i = bisect.bisect_right(xs, t); return xs[i] if i < len(xs) else None
def last_le(xs, t):   i = bisect.bisect_right(xs, t); return xs[i-1] if i else None
def last_lt(xs, t):   i = bisect.bisect_left(xs, t);  return xs[i-1] if i else None

# Longest Increasing Subsequence in O(n log n)
def lis(nums):
    tails = []
    for n in nums:
        i = bisect.bisect_left(tails, n)    # bisect_right -> non-decreasing LIS
        if i == len(tails):
            tails.append(n)
        else:
            tails[i] = n
    return len(tails)                       # tails is NOT the actual subsequence

# Hand-rolled binary search — the template that avoids overflow/off-by-one
def binary_search(xs, target):
    lo, hi = 0, len(xs) - 1
    while lo <= hi:
        mid = (lo + hi) // 2                # Python ints never overflow
        if xs[mid] == target:  return mid
        if xs[mid] < target:   lo = mid + 1
        else:                  hi = mid - 1
    return -1

# Binary search on the ANSWER (predicate must be monotonic)
def min_feasible(lo, hi, feasible):
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid): hi = mid
        else:             lo = mid + 1
    return lo`,
  },

  // ─────────────────────────────────────────────────────────────
  // 8. itertools / functools / builtins
  // ─────────────────────────────────────────────────────────────
  {
    title: '50 · itertools: The Interview Subset',
    language: 'python',
    description: 'Every one of these is a lazy C-level iterator. permutations/combinations replace hand-written backtracking when you only need to enumerate.',
    code: `from itertools import (product, permutations, combinations,
                       combinations_with_replacement, accumulate, groupby,
                       chain, islice, cycle, repeat, count, compress,
                       takewhile, dropwhile, starmap, tee, pairwise)

# COMBINATORICS
list(product([1, 2], "ab"))                 # cartesian product -> 4 pairs
list(product([0, 1], repeat=3))             # all 3-bit tuples -> 8
list(permutations([1, 2, 3]))               # 6 orderings
list(permutations([1, 2, 3], 2))            # 6 ordered pairs
list(combinations([1, 2, 3], 2))            # 3 unordered pairs
list(combinations_with_replacement([1, 2], 2))   # [(1,1),(1,2),(2,2)]

# All subsets (the power set)
def powerset(xs):
    return chain.from_iterable(combinations(xs, r) for r in range(len(xs) + 1))

# RUNNING AGGREGATES
list(accumulate([1, 2, 3, 4]))              # [1,3,6,10] — prefix sums
list(accumulate([1, 2, 3], initial=0))      # [0,1,3,6]  (3.8+) — the DP form
import operator
list(accumulate([1, 2, 3], operator.mul))   # [1,2,6] — running product
list(accumulate([3, 1, 4], max))            # [3,3,4] — running max

# GROUPING — input MUST be sorted by the same key first
data = sorted(words, key=len)
for length, group in groupby(data, key=len):
    print(length, list(group))              # the group is a one-shot iterator

# Run-length encoding falls straight out of groupby
[(ch, len(list(g))) for ch, g in groupby("aaabbc")]   # [('a',3),('b',2),('c',1)]

# CHAINING / SLICING
list(chain([1, 2], [3], [4]))               # flatten one level
list(chain.from_iterable([[1, 2], [3]]))    # flatten a list of lists
list(islice(count(10), 3))                  # [10,11,12] — slice any iterable
list(islice(range(100), 5, 20, 3))          # start/stop/step

# INFINITE
count(0, 2)         # 0,2,4,...
cycle("ab")         # a,b,a,b,...
repeat(7, 3)        # 7,7,7

# FILTERING
list(compress("abcd", [1, 0, 1, 0]))        # ['a','c']
list(takewhile(lambda x: x < 3, [1, 2, 5, 1]))   # [1,2] — stops at first False
list(dropwhile(lambda x: x < 3, [1, 2, 5, 1]))   # [5,1]
list(starmap(pow, [(2, 3), (3, 2)]))        # [8,9] — args pre-packed as tuples
list(pairwise([1, 2, 3]))                   # [(1,2),(2,3)]  (3.10+)

a, b = tee(iter([1, 2, 3]), 2)              # duplicate a one-shot iterator`,
  },
  {
    title: '51 · functools: Caching & Composition',
    language: 'python',
    description: 'One @cache line turns an exponential recursion into a linear one. Arguments must be hashable — pass tuples, never lists.',
    code: `from functools import cache, lru_cache, reduce, partial, cmp_to_key, wraps

# MEMOISATION — the single highest-leverage decorator for DP problems
@cache                          # 3.9+, unbounded, faster than lru_cache(None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
fib(100)                        # instant; without @cache it is O(2^n)

@lru_cache(maxsize=1024)        # bounded: evicts least-recently-used
def expensive(a, b): ...
expensive.cache_info(); expensive.cache_clear()

# Arguments must be HASHABLE — convert before the cached call
@cache
def solve(grid_tuple, i, j): ...
solve(tuple(map(tuple, grid)), 0, 0)

# On methods, @cache keeps 'self' alive -> a memory leak on long-lived objects.
# Prefer functools.cached_property, or cache a module-level helper.
from functools import cached_property
class Report:
    @cached_property            # computed once, then stored in the instance dict
    def total(self): return sum(self.rows)

# Top-down DP with memo is often the fastest path to a correct answer:
@cache
def coin_change(target):
    if target == 0:   return 0
    if target < 0:    return float("inf")
    return 1 + min((coin_change(target - c) for c in COINS), default=float("inf"))

# REDUCE — fold a sequence to one value
reduce(lambda a, b: a + b, [1, 2, 3])           # 6  (prefer sum())
reduce(lambda a, b: a * b, [1, 2, 3, 4], 1)     # 24 — with an initial value
import operator
reduce(operator.xor, [1, 1, 2])                 # 2  — find the single number
reduce(math.gcd, [12, 18, 24])                  # 6

# PARTIAL — pre-bind arguments
from functools import partial
int2 = partial(int, base=2)
int2("1010")                                    # 10
sorted(rows, key=partial(get_field, name="age"))

# cmp_to_key — port a Java/C++ comparator
def cmp(a, b):
    return (b + a > a + b) - (b + a < a + b)    # -1 / 0 / 1
"".join(sorted(map(str, nums), key=cmp_to_key(cmp)))   # "largest number"

# singledispatch — type-based overloading
from functools import singledispatch
@singledispatch
def describe(x): return f"object {x}"
@describe.register
def _(x: int): return f"int {x}"`,
  },
  {
    title: '52 · Built-ins Worth Memorising',
    language: 'python',
    description: 'These replace hand-written loops with C-speed single calls. The key= argument on min/max/sorted is the one people forget most often.',
    code: `xs = [3, 1, 4, 1, 5]

len(xs); sum(xs); min(xs); max(xs)
sum(xs, start=100)                      # 114
min(xs, default=0)                      # avoids ValueError on an empty iterable
max(people, key=lambda p: p.age)        # argmax by a projection
min(range(len(xs)), key=xs.__getitem__) # INDEX of the minimum

any(x > 4 for x in xs)                  # True  — short-circuits
all(x > 0 for x in xs)                  # True
any([]), all([])                        # False True   <-- vacuous truth

sorted(xs); sorted(xs, reverse=True); sorted(xs, key=abs)
reversed(xs); enumerate(xs); zip(xs, xs)
list(map(str, xs))                      # ['3','1',...]
list(map(lambda a, b: a + b, [1, 2], [3, 4]))   # multi-iterable map
list(filter(None, [0, 1, "", "a"]))     # [1,'a'] — None filters by truthiness

abs(-3); round(3.567, 2); pow(2, 10); pow(2, 10, 7); divmod(7, 2)
int(); float(); str(); bool(); list(); dict(); set(); tuple(); frozenset()

range(5); iter(xs); next(iter(xs))
isinstance(x, (int, float)); issubclass(bool, int)
hasattr(o, "x"); getattr(o, "x", None); setattr(o, "x", 1); delattr(o, "x")
id(x); hash("k"); type(x); repr(x); ascii(x)
print(*xs, sep=", ", end="\\n", flush=True)
input("prompt: ")
open(path, encoding="utf-8")
zip(*matrix)                            # transpose
eval("1+1"); exec("x=1")                # avoid on untrusted input
globals(); locals(); vars(o); dir(o); callable(f)

# Sorting stability lets you compose passes
sorted(sorted(rows, key=second), key=first)`,
  },

  // ─────────────────────────────────────────────────────────────
  // 9. Algorithm templates
  // ─────────────────────────────────────────────────────────────
  {
    title: '53 · Two Pointers & Sliding Window',
    language: 'python',
    description: 'Two reusable shapes that cover a large share of array/string problems. The variable window loop is the one to memorise verbatim.',
    code: `# OPPOSITE ENDS — sorted array, pair sum
def two_sum_sorted(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        s = nums[lo] + nums[hi]
        if s == target:  return [lo, hi]
        if s < target:   lo += 1
        else:            hi -= 1
    return []

# In-place reverse / palindrome
def is_palindrome(s):
    lo, hi = 0, len(s) - 1
    while lo < hi:
        while lo < hi and not s[lo].isalnum(): lo += 1
        while lo < hi and not s[hi].isalnum(): hi -= 1
        if s[lo].casefold() != s[hi].casefold(): return False
        lo += 1; hi -= 1
    return True

# FAST / SLOW — cycle detection (Floyd)
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast: return True
    return False

# SAME DIRECTION — in-place filter, O(1) extra space
def remove_val(nums, val):
    write = 0
    for read in range(len(nums)):
        if nums[read] != val:
            nums[write] = nums[read]
            write += 1
    return write                        # new length

# FIXED-SIZE WINDOW — max sum of k consecutive
def max_sum_k(nums, k):
    win = sum(nums[:k]); best = win
    for i in range(k, len(nums)):
        win += nums[i] - nums[i - k]    # slide: add new, drop old
        best = max(best, win)
    return best

# VARIABLE WINDOW — the template. Expand right, shrink left while invalid.
def longest_unique(s):
    seen, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1         # shrink past the duplicate
        seen[ch] = right
        best = max(best, right - left + 1)
    return best

# Minimum window covering a target multiset
from collections import Counter
def min_window(s, t):
    need, missing = Counter(t), len(t)
    best, left = (0, float("inf")), 0
    for right, ch in enumerate(s):
        if need[ch] > 0: missing -= 1
        need[ch] -= 1
        while missing == 0:                     # valid -> try to shrink
            if right - left < best[1] - best[0]:
                best = (left, right)
            need[s[left]] += 1
            if need[s[left]] > 0: missing += 1
            left += 1
    return "" if best[1] == float("inf") else s[best[0]:best[1] + 1]`,
  },
  {
    title: '54 · Graph Traversal Templates',
    language: 'python',
    description: 'BFS with a deque for shortest hops, iterative DFS with an explicit stack to dodge the recursion limit, and topological sort via Kahn\'s algorithm.',
    code: `from collections import deque, defaultdict

def build_graph(edges, directed=False):
    g = defaultdict(list)
    for u, v in edges:
        g[u].append(v)
        if not directed: g[v].append(u)
    return g

# BFS — shortest path in hops on an UNWEIGHTED graph
def shortest_path(g, src, dst):
    if src == dst: return [src]
    prev, q = {src: None}, deque([src])
    while q:
        u = q.popleft()
        for v in g[u]:
            if v not in prev:
                prev[v] = u
                if v == dst:
                    path = [v]
                    while prev[path[-1]] is not None:
                        path.append(prev[path[-1]])
                    return path[::-1]
                q.append(v)
    return []

# DFS recursive — concise, but bounded by the recursion limit (~1000)
def dfs(g, u, seen=None):
    seen = seen if seen is not None else set()
    seen.add(u)
    for v in g[u]:
        if v not in seen:
            dfs(g, v, seen)
    return seen

# DFS iterative — safe for deep graphs
def dfs_iter(g, src):
    seen, stack = set(), [src]
    while stack:
        u = stack.pop()
        if u in seen: continue
        seen.add(u)
        stack.extend(v for v in g[u] if v not in seen)
    return seen

# GRID BFS — the 4-direction idiom
DIRS = ((0, 1), (1, 0), (0, -1), (-1, 0))          # add diagonals for 8-dir
def grid_bfs(grid, start):
    R, C = len(grid), len(grid[0])
    q, seen = deque([start]), {start}
    while q:
        r, c = q.popleft()
        for dr, dc in DIRS:
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C and (nr, nc) not in seen \\
                    and grid[nr][nc] != "#":
                seen.add((nr, nc)); q.append((nr, nc))
    return seen

# TOPOLOGICAL SORT (Kahn) — also detects a cycle
def topo_sort(n, edges):
    g, indeg = defaultdict(list), [0] * n
    for u, v in edges:
        g[u].append(v); indeg[v] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in g[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return order if len(order) == n else []        # [] => the graph has a cycle

# UNION-FIND with path compression + union by rank — near O(1) amortised
class DSU:
    def __init__(self, n):
        self.p = list(range(n)); self.r = [0] * n; self.count = n
    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]      # path halving
            x = self.p[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb: return False
        if self.r[ra] < self.r[rb]: ra, rb = rb, ra
        self.p[rb] = ra
        if self.r[ra] == self.r[rb]: self.r[ra] += 1
        self.count -= 1
        return True`,
  },
  {
    title: '55 · Recursion, Backtracking & Limits',
    language: 'python',
    description: 'CPython caps recursion near 1000 frames and has no tail-call optimisation. Know how to raise the limit, and know when to convert to a loop instead.',
    code: `import sys
sys.getrecursionlimit()         # ~1000
sys.setrecursionlimit(10**6)    # raise it — but you can still blow the C stack

# Deep recursion in a thread with a bigger stack (the safe escape hatch)
import threading
threading.stack_size(64 * 1024 * 1024)
t = threading.Thread(target=main); t.start(); t.join()

# Python has NO tail-call optimisation. Convert to iteration when depth ~ n.
def sum_to(n):                  # recursive: RecursionError at n ~ 1000
    return 0 if n == 0 else n + sum_to(n - 1)
def sum_to_iter(n):             # iterative: fine at n = 10**7
    total = 0
    for i in range(1, n + 1): total += i
    return total

# BACKTRACKING TEMPLATE — choose, recurse, un-choose
def permute(nums):
    out, cur, used = [], [], [False] * len(nums)
    def bt():
        if len(cur) == len(nums):
            out.append(cur[:])           # COPY — cur is mutated in place
            return
        for i, n in enumerate(nums):
            if used[i]: continue
            used[i] = True; cur.append(n)
            bt()
            cur.pop(); used[i] = False   # undo
    bt()
    return out

# Subsets — include/exclude at each index
def subsets(nums):
    out, cur = [], []
    def bt(i):
        if i == len(nums):
            out.append(cur[:]); return
        bt(i + 1)                        # exclude
        cur.append(nums[i]); bt(i + 1); cur.pop()   # include
    bt(0)
    return out

# Combination sum with pruning — sort first so you can break early
def combo_sum(candidates, target):
    candidates.sort()
    out, cur = [], []
    def bt(start, remaining):
        if remaining == 0: out.append(cur[:]); return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining: break      # sorted -> prune the rest
            cur.append(candidates[i])
            bt(i, remaining - candidates[i])         # i (reuse) vs i+1 (no reuse)
            cur.pop()
    bt(0, target)
    return out

# Memoised recursion beats a hand-rolled dict in both speed and clarity
from functools import cache
@cache
def grid_paths(r, c):
    if r == 0 or c == 0: return 1
    return grid_paths(r - 1, c) + grid_paths(r, c - 1)`,
  },
  {
    title: '56 · Bit Manipulation',
    language: 'python',
    description: 'Python ints are arbitrary precision and conceptually two\'s-complement with infinite sign bits, so right-shifting a negative never underflows — but masking to a fixed width takes explicit work.',
    code: `x = 0b1011          # 11

x & 1               # 1     — test the low bit (odd/even)
x >> 1              # 5     — divide by 2 (floors, even for negatives)
x << 1              # 22    — multiply by 2
x | 0b100           # set a bit
x & ~0b10           # clear a bit
x ^ 0b1             # toggle a bit
(x >> i) & 1        # read bit i
x |= (1 << i)       # set bit i
x &= ~(1 << i)      # clear bit i
x ^= (1 << i)       # toggle bit i

x & -x              # 2 — LOWEST set bit (two's complement trick)
x & (x - 1)         # clear the lowest set bit
x & (x - 1) == 0    # power of two? (also require x > 0)
bin(x).count("1")   # popcount
x.bit_count()       # popcount, 3.10+, C-speed
x.bit_length()      # 4 — bits needed, excluding sign

# Fixed-width masking — Python has no int32, so emulate it
MASK = 0xFFFFFFFF
def to_int32(n):
    n &= MASK
    return n - (1 << 32) if n >= (1 << 31) else n

# XOR identities: a^a == 0, a^0 == a, XOR is commutative + associative
def single_number(nums):            # every value appears twice except one
    r = 0
    for n in nums: r ^= n
    return r

def missing_number(nums):           # 0..n with one missing
    r = len(nums)
    for i, n in enumerate(nums): r ^= i ^ n
    return r

# Bitmask as a subset / visited set — n <= ~20
for mask in range(1 << n):                      # every subset of n items
    subset = [xs[i] for i in range(n) if mask >> i & 1]

sub = mask
while sub:                                      # enumerate SUBMASKS of mask
    sub = (sub - 1) & mask

# Bitmask DP (travelling salesman shape)
from functools import cache
@cache
def tsp(mask, u):
    if mask == (1 << n) - 1: return dist[u][0]
    return min(dist[u][v] + tsp(mask | (1 << v), v)
               for v in range(n) if not mask >> v & 1)

# Careful: -5 >> 1 == -3 (floors). Python has no >>> operator.`,
  },
  {
    title: '57 · Sentinels, Infinity & Comparison Tricks',
    language: 'python',
    description: 'float("inf") as a DP initialiser removes an entire class of "first iteration" special cases, and tuple comparison gives you multi-key logic for free.',
    code: `INF = float("inf")          # or math.inf — identical
NEG = float("-inf")
INF > 10**100               # True — larger than any int or float
-INF < NEG_ANYTHING

best = INF
for cost in costs:
    best = min(best, cost)  # no "if first" branch needed

dp = [INF] * (target + 1)   # unreachable states start at infinity
dp[0] = 0

# NaN is the odd one out — it compares FALSE against everything, itself included
nan = float("nan")
nan == nan                  # False
math.isnan(nan)             # True — the only correct test
sorted([3, nan, 1])         # garbage: NaN breaks the sort's ordering assumption

# Tuple comparison is element-wise, left to right, and short-circuits
(1, 2) < (1, 3)             # True
(1, "b") < (2, "a")         # True — the first element decides
max([(2, "a"), (2, "b")])   # (2, 'b') — the tiebreak is the second element

# Multi-key min/max without a custom class
best = min(candidates, key=lambda c: (c.cost, -c.priority, c.name))

# Sentinel objects when None is a valid value
MISSING = object()
val = d.get(k, MISSING)
if val is MISSING: ...

# Bounds for integer problems
import sys
sys.maxsize                 # platform word size — NOT a real int max
2**31 - 1, -2**31           # the int32 bounds a problem statement means

# Comparing heterogeneous types raises in Python 3
# 1 < "a"                   -> TypeError
sorted(mixed, key=str)      # force a consistent ordering when types vary

# Clamp
clamped = max(lo, min(x, hi))`,
  },

  // ─────────────────────────────────────────────────────────────
  // 10. Complexity, gotchas, tooling
  // ─────────────────────────────────────────────────────────────
  {
    title: '58 · Complexity of Python Operations',
    language: 'python',
    description: 'The table interviewers expect you to know without looking up. Every "why is my solution slow" question in a Python round traces back to one of these rows.',
    code: `# LIST (dynamic array)                    n = len
#   xs[i] / xs[i]=v .......... O(1)
#   append / pop() ........... O(1) amortised
#   insert(0,v) / pop(0) ..... O(n)     <-- use deque instead
#   v in xs / index / remove . O(n)
#   xs[a:b] .................. O(b-a)
#   sort() ................... O(n log n)   Timsort, STABLE, O(n) on sorted input
#   min / max / sum .......... O(n)
#   len ...................... O(1)
#   copy / reverse ........... O(n)
#
# DEQUE (doubly linked blocks)
#   append/appendleft/pop/popleft . O(1)
#   dq[i] in the MIDDLE ........... O(n)
#   rotate(k) ..................... O(k)
#
# DICT / SET (open addressing hash table)
#   d[k], d[k]=v, del d[k], k in d . O(1) average, O(n) worst (collisions)
#   len ............................ O(1)
#   iteration ...................... O(n)
#   copy ........................... O(n)
#   NOTE: hashing a long string is O(len(key)), not O(1)
#
# HEAPQ (binary heap over a list)
#   heappush / heappop ....... O(log n)
#   h[0] (peek) .............. O(1)
#   heapify .................. O(n)     <-- cheaper than n pushes
#   nlargest(k) / nsmallest .. O(n log k)
#
# BISECT (on a sorted list)
#   bisect_left / bisect_right O(log n)
#   insort ................... O(log n) search + O(n) SHIFT = O(n)
#
# STRING (immutable)
#   s[i] ..................... O(1)
#   s + t .................... O(len(s)+len(t))   <-- += in a loop is O(n^2)
#   "".join(parts) ........... O(total)           <-- always prefer this
#   t in s ................... O(n·m) worst, fast in practice
#   s.split / .replace ....... O(n)
#
# COUNTER
#   construction ............. O(n)
#   most_common(k) ........... O(n log k);  most_common() = O(n log n)

# Rough CPython throughput: ~10^7 simple ops/sec.
#   n <= 10^6  -> O(n) or O(n log n)
#   n <= 10^5  -> O(n log n) comfortable, O(n^2) too slow
#   n <= 5000  -> O(n^2) ok
#   n <= 20    -> O(2^n) bitmask DP / O(n!) permutations viable`,
  },
  {
    title: '59 · The Gotcha List',
    language: 'python',
    description: 'The failures that cost real interview time. Every one of these is silent — the code runs and returns a wrong answer rather than raising.',
    code: `# 1. Mutable default argument — evaluated ONCE at def time
def f(acc=[]): acc.append(1); return acc       # grows across calls
def f(acc=None): acc = [] if acc is None else acc

# 2. [[0]*m]*n aliases one row into n slots
grid = [[0] * m for _ in range(n)]             # the correct build

# 3. Shallow copy shares the children
deep = [row[:] for row in grid]

# 4. Mutating a list/dict while iterating it
for x in list(xs): ...                         # iterate a snapshot
xs = [x for x in xs if keep(x)]                # or rebuild

# 5. Late binding in closures — lambdas capture the VARIABLE
fs = [lambda i=i: i for i in range(3)]         # bind now via a default

# 6. 'is' vs '==' — small ints and short strings are cached, so 'is' looks
#    correct until it isn't
a, b = 1000, 1000
a is b          # implementation-defined (False in a script, True in a REPL line)
a == b          # True — always use this

# 7. Float equality
0.1 + 0.2 == 0.3                # False
math.isclose(0.1 + 0.2, 0.3)    # True

# 8. Integer division floors toward -inf, unlike C/Java truncation
-7 // 2, int(-7 / 2)            # -4  -3
-7 % 3                          # 2, not -1

# 9. bool IS an int
isinstance(True, int)           # True
sum([True, True, False])        # 2 — occasionally useful, often a bug
{1: "a", True: "b"}             # {1: 'b'} — True and 1 are the SAME key

# 10. defaultdict inserts on READ
if dd["missing"]: ...           # dd now has 'missing'; use 'in' or .get()

# 11. Chained + on strings inside a loop is O(n^2) — use "".join

# 12. zip silently truncates to the shortest input
list(zip(a, b, strict=True))    # 3.10+ raises instead

# 13. sort() returns None
xs = xs.sort()                  # xs is now None!  use sorted(xs) or sort in place

# 14. range/slice stops are EXCLUSIVE; forgetting costs an off-by-one
range(1, n + 1)                 # 1..n inclusive

# 15. Catching Exception hides bugs; a bare 'except:' also catches
#     KeyboardInterrupt and SystemExit. Catch narrowly, re-raise.

# 16. Modifying a global inside a function silently creates a local
count = 0
def inc():
    global count                # without this: UnboundLocalError
    count += 1`,
  },
  {
    title: '60 · Version Feature Timeline (3.8 → 3.13)',
    language: 'python',
    description: 'Interview platforms lag. Know which version gates the syntax you are about to type — writing 3.10 match-case on a 3.8 judge is an instant SyntaxError.',
    code: `import sys
sys.version_info >= (3, 10)         # the runtime gate

# 3.8  ── walrus, positional-only, f-string =
n = len(xs)
if (n := len(xs)) > 3: ...
def f(a, b, /, c): ...              # a, b are positional-only
f"{n=}"                             # self-documenting debug
from functools import cached_property
from typing import TypedDict, Literal, Protocol, Final

# 3.9  ── builtin generics, dict merge, str strip helpers
def g(xs: list[int]) -> dict[str, int]: ...     # no more typing.List
a | b;  a |= b                                   # dict union
"file.txt".removeprefix("file").removesuffix("t")
from functools import cache                      # simpler than lru_cache(None)
math.lcm(4, 6); math.nextafter(0, 1)
zoneinfo.ZoneInfo("UTC")

# 3.10 ── match-case, X | Y unions, zip strict
match cmd:
    case ["go", d]: ...
    case _: ...
def h(x: int | None) -> str | bytes: ...
zip(a, b, strict=True)
itertools.pairwise(xs)
int.bit_count()
bisect.bisect_left(xs, v, key=fn)        # (key= landed in 3.10)
dataclass(slots=True)

# 3.11 ── speed, exception groups, Self
# ~10-60% faster than 3.10 on typical workloads
# try: ... except* ValueError as eg: ...
from typing import Self, Never, LiteralString
import tomllib                                   # TOML parsing in the stdlib
from enum import StrEnum

# 3.12 ── type-param syntax, f-string relaxation
# type Alias = list[int]
# def first[T](xs: list[T]) -> T: ...
f"{d["key"]}"                                    # same-quote nesting now legal
from itertools import batched                    # batched("abcdefg", 3)

# 3.13 ── better REPL, experimental free-threaded build
#   locals() semantics tightened; PEP 703 no-GIL build is opt-in

# SAFE-EVERYWHERE FALLBACKS when the judge is old:
#   list[int]        -> typing.List[int]
#   int | None       -> typing.Optional[int]
#   match/case       -> if/elif chain or dict dispatch
#   functools.cache  -> functools.lru_cache(maxsize=None)
#   removeprefix     -> s[len(p):] if s.startswith(p) else s
#   x.bit_count()    -> bin(x).count("1")
#   itertools.pairwise -> zip(xs, xs[1:])`,
  },
  {
    title: '61 · Regex Essentials',
    language: 'python',
    description: 'Always use raw strings for patterns, and compile once when the pattern is reused in a loop. finditer streams; findall materialises.',
    code: `import re

p = r"\\d{3}-\\d{4}"                  # r"" keeps backslashes literal

re.search(p, text)                  # first match ANYWHERE -> Match | None
re.match(p, text)                   # anchored at the START only
re.fullmatch(p, text)               # must consume the whole string
re.findall(r"\\w+", text)            # list of strings (or tuples if >1 group)
list(re.finditer(r"\\w+", text))     # lazy iterator of Match objects
re.sub(r"\\s+", " ", text)           # collapse whitespace
re.sub(r"(\\w+)@(\\w+)", r"\\2:\\1", text)      # \\1 \\2 backreferences
re.subn(p, "X", text)               # (result, count)
re.split(r"[,;]\\s*", text)          # split on a pattern

rx = re.compile(p, re.IGNORECASE | re.MULTILINE)   # compile once, reuse
rx.search(text)

m = re.search(r"(?P<area>\\d{3})-(?P<num>\\d{4})", "call 555-1234")
m.group(0)          # '555-1234'  the whole match
m.group(1), m["area"], m.groupdict()
m.start(), m.end(), m.span()

# CHARACTER CLASSES     QUANTIFIERS            ANCHORS
#  .   any but \\n        *   0+                ^   start
#  \\d  digit             +   1+                $   end
#  \\w  [a-zA-Z0-9_]      ?   0 or 1            \\b  word boundary
#  \\s  whitespace        {n,m} range           \\B  not a boundary
#  [^abc] negated        *?  +?  ??  LAZY      (?=) lookahead
#                                              (?!) negative lookahead

# Greedy vs lazy — the classic bug
re.findall(r"<.*>",  "<a><b>")      # ['<a><b>']  greedy
re.findall(r"<.*?>", "<a><b>")      # ['<a>','<b>'] lazy

re.escape("a.b*c")                  # escape user input before interpolating

# FLAGS: re.I ignorecase  re.M multiline (^ $ per line)  re.S dotall
#        re.X verbose     re.A ascii-only classes

# Catastrophic backtracking: avoid nested quantifiers on overlapping classes
# like (a+)+b. For simple work, str methods are far faster than regex.`,
  },
  {
    title: '62 · datetime, random & math Utilities',
    language: 'python',
    description: 'Naive vs aware datetimes are the trap: datetime.now() has no timezone and silently mis-compares against an aware one. Use timezone-aware UTC everywhere.',
    code: `from datetime import datetime, date, timedelta, timezone

now = datetime.now(timezone.utc)        # AWARE — always prefer this
naive = datetime.now()                  # no tzinfo; comparing to aware raises
today = date.today()

datetime(2026, 8, 14, 12, 30)
datetime.fromisoformat("2026-08-14T12:30:00+00:00")
datetime.strptime("14/08/2026", "%d/%m/%Y")     # parse
now.strftime("%Y-%m-%d %H:%M:%S")               # format
now.isoformat()
int(now.timestamp()); datetime.fromtimestamp(0, timezone.utc)

now + timedelta(days=7, hours=3)
delta = datetime(2026, 12, 25, tzinfo=timezone.utc) - now
delta.days, delta.total_seconds()

now.year, now.month, now.day, now.weekday()     # Monday == 0
now.replace(hour=0, minute=0, second=0, microsecond=0)

from zoneinfo import ZoneInfo                   # 3.9+
now.astimezone(ZoneInfo("America/Los_Angeles"))

import time
time.time()                 # epoch seconds (wall clock, can jump)
time.perf_counter()         # monotonic high-resolution — USE THIS for timing
time.monotonic()
time.sleep(0.1)

import random
random.seed(42)             # reproducible
random.random()             # [0.0, 1.0)
random.randint(1, 6)        # INCLUSIVE both ends
random.randrange(0, 10, 2)  # exclusive stop, like range
random.choice(xs)
random.choices(xs, weights=[1, 2, 3], k=5)   # WITH replacement
random.sample(xs, 3)                          # WITHOUT replacement
random.shuffle(xs)          # in place, returns None
random.uniform(1.0, 2.0); random.gauss(0, 1)

import secrets              # for tokens/passwords — never use random
secrets.token_hex(16); secrets.choice(xs)

import statistics as st
st.mean(xs); st.median(xs); st.mode(xs); st.stdev(xs); st.quantiles(xs, n=4)`,
  },
  {
    title: '63 · Debugging, Timing & Testing',
    language: 'python',
    description: 'Time with perf_counter, not time(). Profile before optimising — the bottleneck is rarely where you think, and cProfile settles it in one command.',
    code: `# QUICK INSPECTION
print(f"{var=}")                     # 3.8+, prints name AND value
import pprint; pprint.pp(nested, width=100)
breakpoint()                         # 3.7+ — drops into pdb right here
#   pdb:  n(ext) s(tep) c(ont) l(ist) p expr  pp expr  w(here) q(uit)

# TIMING
import time
t = time.perf_counter()
work()
print(f"{time.perf_counter() - t:.4f}s")

from timeit import timeit
timeit("sorted(xs)", globals=globals(), number=1000)
timeit(lambda: "".join(parts), number=10000)

# PROFILING — find the real hot spot
import cProfile, pstats
cProfile.run("main()", "prof.out")
pstats.Stats("prof.out").sort_stats("cumulative").print_stats(15)
#   $ python -m cProfile -s cumtime script.py

# MEMORY
import sys, tracemalloc
sys.getsizeof([1, 2, 3])             # shallow size in bytes
tracemalloc.start(); snap = tracemalloc.take_snapshot()
snap.statistics("lineno")[:5]

# LOGGING beats print in anything long-lived
import logging
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger(__name__)
log.info("processed %d rows", n)     # lazy args — do NOT f-string here
log.exception("failed")              # inside an except: logs the traceback

# TESTING
import unittest
class TestSolution(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(two_sum([2, 7], 9), [0, 1])
    def test_raises(self):
        with self.assertRaises(ValueError):
            parse("bad")
# if __name__ == "__main__": unittest.main()

# pytest style — plain asserts, parametrised cases
# import pytest
# @pytest.mark.parametrize("nums,target,want", [([2,7],9,[0,1])])
# def test_two_sum(nums, target, want):
#     assert two_sum(nums, target) == want

# Doctests live in the docstring and double as documentation
def add(a, b):
    """
    >>> add(2, 3)
    5
    """
    return a + b
# python -m doctest -v file.py`,
  },
  {
    title: '64 · Idioms Interviewers Recognise',
    language: 'python',
    description: 'The compressed vocabulary. Reaching for these signals fluency; writing the manual loop equivalent signals you learned Python second.',
    code: `# SWAP / MULTI-ASSIGN
a, b = b, a
lo, hi = 0, len(xs) - 1

# REVERSE
xs[::-1]; "".join(reversed(s)); list(reversed(xs))

# FLATTEN one level
[v for row in matrix for v in row]
list(itertools.chain.from_iterable(matrix))

# TRANSPOSE / ROTATE
list(zip(*matrix))
[list(r) for r in zip(*matrix[::-1])]           # 90° clockwise

# DEDUPE
list(set(xs))                                   # order LOST
list(dict.fromkeys(xs))                         # order KEPT (3.7+)

# FREQUENCY / GROUPING
Counter(xs); Counter(xs).most_common(1)[0][0]
groups = defaultdict(list); groups[key].append(v)

# SORT BY MULTIPLE KEYS
sorted(rows, key=lambda r: (-r.score, r.name))

# MIN / MAX BY PROJECTION
max(people, key=lambda p: p.age)
min(range(len(xs)), key=xs.__getitem__)         # argmin

# FIRST MATCH OR DEFAULT
next((x for x in xs if pred(x)), None)

# ANY / ALL instead of a flag loop
if any(x < 0 for x in xs): ...
if all(a <= b for a, b in pairwise(xs)): ...    # is it sorted?

# CONDITIONAL COUNT
sum(1 for x in xs if pred(x))
sum(pred(x) for x in xs)                        # bools sum as 0/1

# PREFIX SUMS
list(itertools.accumulate(xs, initial=0))

# CHAR ↔ INDEX
ord(c) - ord("a"); chr(i + ord("a"))

# DICT INVERT / MERGE
{v: k for k, v in d.items()}
{**a, **b};  a | b

# STRING BUILD
"".join(parts)                                  # never += in a loop

# SAFE NESTED GET
cfg.get("db", {}).get("port", 5432)

# ENUMERATE FROM 1
for rank, name in enumerate(names, 1): ...

# SENTINEL-FREE MIN
best = min(costs, default=float("inf"))

# IN-PLACE FILTER
xs[:] = [x for x in xs if keep(x)]              # mutates the CALLER's list

# UNPACK IGNORING FIELDS
_, mid, *_rest = row

# GRID BOUNDS CHECK
if 0 <= r < R and 0 <= c < C: ...

# TWO-LEVEL DEFAULT DICT
nested = defaultdict(lambda: defaultdict(int))`,
  },
];
