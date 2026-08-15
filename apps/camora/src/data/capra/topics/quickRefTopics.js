// Quick Reference topics for the DSA & Algorithms page.
//
// A "Quick References" category sits alongside the pattern categories
// (arrays, two-pointers, trees, dp, …). Pattern topics teach you WHAT to do;
// these teach you how to WRITE it without stalling on syntax.
//
// Modelled on quickref.me-style cheatsheets but pitched at interview depth:
// every section that quickref.me/python covers, plus the stdlib/algorithm
// surface (collections, heapq, bisect, itertools, functools), complexity
// tables, the silent-failure gotcha list, and a version-feature timeline.
//
// Rendering contract (see TopicDetail.jsx):
//   - `keyPatterns` MUST be present — the whole coding-style block is gated on
//     it (TopicDetail.jsx ~1507).
//   - `codeExamples[].title` must be unique across the topic; duplicates are
//     merged into language tabs rather than rendered as separate cards.
//   - `introduction` is passed through FormattedContent, which renders
//     markdown pipe-tables when every row starts with `|`.

import { pythonCoreCards } from './quickRefPythonCoreCards.js';
import { pythonDsaCards } from './quickRefPythonDsaCards.js';

/** Category row shown on the DSA page. */
export const quickRefCategory = {
  id: 'quick-reference',
  name: 'Quick References',
  icon: 'bookOpen',
  color: '#0ea5e9',
};

/** topic id -> category id, merged into codingCategoryMap. */
export const quickRefCategoryMap = {
  'python-quickref': 'quick-reference',
};

const pythonCards = [...pythonCoreCards, ...pythonDsaCards];

export const quickRefTopics = [
  {
    id: 'python-quickref',
    title: 'Python',
    icon: 'code',
    color: '#0ea5e9',
    questions: pythonCards.length,
    description: `Interview-grade Python cheatsheet — ${pythonCards.length} copy-ready cards covering syntax, the standard library, complexity, and the gotchas that silently return wrong answers.`,

    introduction: `## Overview

This is a **reference**, not a tutorial. It is built to be scanned mid-problem: you know the algorithm, you need the exact call signature, and you need it in five seconds.

It covers everything a general Python cheatsheet covers — getting started, built-in types, strings, f-strings, lists, flow control, loops, functions, modules, file handling, classes and inheritance — and then keeps going into the layer that actually decides whether a coding round goes well:

- **The stdlib that changes your complexity class.** \`collections\`, \`heapq\`, \`bisect\`, \`itertools\`, \`functools\`. A \`deque\` instead of a list turns BFS from O(V²) into O(V+E). One \`@cache\` line turns exponential recursion into linear.
- **Reusable algorithm templates.** Two pointers, sliding window, BFS/DFS, topological sort, union-find, backtracking, binary search on the answer, bitmask DP.
- **Complexity tables for the built-ins**, so you can defend a design decision out loud instead of guessing.
- **The gotcha list** — sixteen failures that run cleanly and return the wrong answer.
- **A version-feature timeline**, because judges lag and \`match\`/\`case\` on a 3.8 runtime is an instant SyntaxError.

### Why the built-in costs matter

The same line of Python is O(1) or O(n) depending on the container you picked:

| Operation | list | deque | dict / set | heapq |
|---|---|---|---|---|
| Index \`x[i]\` | O(1) | O(n) middle | — | — |
| Append right | O(1)* | O(1) | — | O(log n) push |
| Pop right | O(1) | O(1) | — | — |
| Insert / pop LEFT | **O(n)** | **O(1)** | — | — |
| Membership \`v in x\` | **O(n)** | O(n) | **O(1)** | O(n) |
| Get minimum | O(n) | O(n) | O(n) | **O(1)** peek |
| Sort | O(n log n) | — | — | O(n) heapify |

\\* amortised

Two rows in that table cause most Python-specific interview failures: \`list.pop(0)\` inside a BFS loop, and \`v in list\` inside a nested loop that should have used a set.

### How to use it

1. **Before the round** — read cards 58 (complexity), 59 (gotchas) and 64 (idioms). Those three are the highest-yield.
2. **During** — jump to the section you need; every card is self-contained and copy-ready.
3. **After** — cards 53 to 57 are templates. Type them from memory until they are muscle memory.

### Version baseline

Everything here targets **Python 3.8+**, with version gates called out inline (\`3.9+\`, \`3.10+\`, …). Card 60 lists safe fallbacks for every modern feature, so you can downgrade a solution on the spot when the judge is old.`,

    whenToUse: [
      'Mid-problem and you need an exact signature — `bisect_left` vs `bisect_right`, `heapq.nlargest`, `Counter.most_common`',
      'Deciding which container to reach for, and needing the complexity to justify it out loud',
      'Porting a C++/Java solution and hitting Python-specific semantics (floor division, no overflow, no tail calls, comparator → `cmp_to_key`)',
      'Your solution is correct but times out, and you need to find the accidental O(n²) — string `+=`, `list.pop(0)`, or `in` on a list',
      'A solution returns a wrong answer with no traceback — check the gotcha list before re-reading the algorithm',
      'Writing on an unfamiliar judge and needing to know which syntax its Python version supports',
    ],

    keyPatterns: [
      'Pick the container by its cost: list for indexing, deque for both ends, dict/set for membership, heap for the running min',
      '`"".join(parts)` to build strings — never `+=` in a loop',
      '`@cache` on a pure recursive function to convert exponential DP to linear',
      'Tuples as composite keys: memo keys, heap entries `(priority, tiebreak, payload)`, multi-key sorts',
      '`Counter` / `defaultdict` to collapse counting and grouping into one line',
      '`bisect` for O(log n) boundaries on sorted data — and for binary search on the answer',
      'Comprehensions and generators to stay lazy and flat instead of building intermediate lists',
    ],

    timeComplexity: 'O(1) dict/set lookup · O(log n) heap & bisect · O(n log n) Timsort (O(n) on already-sorted input)',
    spaceComplexity: 'O(n) for the container; generators and `range` stay O(1)',

    approach: [
      'Identify the dominant operation in your loop — membership test, min extraction, insert at front, or string build.',
      'Look up that operation in card 58 and pick the container whose cost is O(1) or O(log n) for it, not O(n).',
      'Reach for the stdlib before hand-rolling: `Counter`, `defaultdict`, `deque`, `heapq`, `bisect`, `itertools` are all C-level.',
      'Write the algorithm from the template cards (53-57) so the control flow is already correct, then fill in the problem-specific predicate.',
      'Add `@cache` if the recursion has overlapping subproblems and the arguments are hashable.',
      'Before submitting, scan the gotcha list (card 59) for the three that bite most: mutable defaults, `[[0]*m]*n` aliasing, and mutation during iteration.',
    ],

    codeExamples: pythonCards,

    commonMistakes: [
      'Building strings with `+=` in a loop — strings are immutable, so this is O(n²). Collect into a list and `"".join(parts)`.',
      'Using `list.pop(0)` or `list.insert(0, x)` as a queue — both are O(n). `collections.deque` gives O(1) at both ends and is the difference between O(V+E) and O(V²) BFS.',
      'Writing `[[0] * m] * n` for a 2D grid — that creates n references to ONE row, so writing one cell writes an entire column. Use `[[0] * m for _ in range(n)]`.',
      'A mutable default argument (`def f(acc=[])`) — defaults are evaluated once at definition time, so the list persists across every call. Use `None` and build inside.',
      'Testing membership with `v in some_list` inside a loop — O(n) each time. Convert to a `set` once for O(1) lookups.',
      'Assuming `-7 // 2 == -3`. Python floors toward negative infinity, so it is `-4`, and `-7 % 3` is `2`, not `-1`. Ported C/Java index math breaks here.',
      'Forgetting that `list.sort()` returns `None` — `xs = xs.sort()` silently sets `xs` to `None`.',
      'Mutating a list or dict while iterating it — elements get skipped or a `RuntimeError` is raised. Iterate `list(d)` or rebuild with a comprehension.',
      'Shallow-copying a nested structure with `grid[:]` and expecting independence — the inner lists are still shared. Use `[row[:] for row in grid]`.',
      'Reading a missing key from a `defaultdict` to test for it — the read INSERTS the key. Use `k in dd` or `dd.get(k)`.',
      'Comparing floats with `==`. `0.1 + 0.2 != 0.3`; use `math.isclose`, or `Decimal` for money.',
      'Pushing raw objects onto a heap without a tiebreaker — `heapq` falls through to comparing the payload and raises `TypeError` on ties. Push `(priority, counter, payload)`.',
      'Recursing deeper than ~1000 frames. CPython has no tail-call optimisation; raise the limit or convert to an explicit stack.',
      'Using `is` to compare values. It works for small ints and interned strings by accident, then fails in production. `is` is only for `None`, `True`, `False` and sentinels.',
    ],

    tips: [
      'Learn card 58 (complexity) cold — it is the fastest way to explain *why* your solution is fast, which is half the score in a coding round.',
      '`from collections import Counter, defaultdict, deque` and `import heapq, bisect` cover most interview needs; type it as one reflex at the top of the file.',
      '`@cache` is the single highest-leverage line in a DP problem. Just make sure every argument is hashable — pass tuples, never lists.',
      'Timsort is stable, so multi-key sorts with mixed directions work by sorting the least significant key first, then the most significant.',
      '`float("inf")` as a DP initialiser removes every "is this the first iteration" branch.',
      '`sorted(x, key=lambda v: (-v.score, v.name))` gives descending-then-ascending in one pass, but only when the descending key is numeric.',
      '`list(dict.fromkeys(xs))` dedupes while preserving order; `list(set(xs))` does not.',
      'Generators keep memory flat. `sum(x*x for x in range(10**7))` allocates nothing; the list comprehension version allocates 10 million ints.',
    ],

    interviewTips: [
      'Say the complexity of the container operation as you choose it — "I want O(1) popleft, so deque, not list" — rather than after being asked.',
      'When you use `Counter` or `defaultdict`, mention what it replaces. Showing you know the manual version reads as understanding, not memorisation.',
      'If you write `@cache`, state the recurrence and the state space out loud. The decorator hides the memo table, and the interviewer needs to see you know its size.',
      'Prefer the explicit template over a clever one-liner in a live round. `"".join(...)` is idiomatic; a four-level nested comprehension is unreadable under time pressure.',
      'If the judge is on an older Python, say so and downgrade deliberately (`typing.List`, `lru_cache(maxsize=None)`) instead of getting surprised by a SyntaxError.',
      'When your solution times out, narrate the hunt: "the loop body is O(n) because membership on a list is linear — switching to a set makes the whole thing O(n)."',
      'Knowing the gotchas is a differentiator. Saying "I will not use a mutable default here because it is evaluated once at definition time" is a strong senior signal.',
    ],

    theoryQuestions: [
      {
        question: 'Why is `list.pop(0)` O(n) while `list.pop()` is O(1)?',
        difficulty: 'Easy',
        answer: 'A CPython list is a contiguous dynamic array of pointers. Popping from the end just decrements the length. Popping from the front has to shift every remaining element one slot left, which is O(n). Use `collections.deque`, a doubly linked list of fixed-size blocks, when you need O(1) at both ends — this is exactly why BFS uses a deque.',
      },
      {
        question: 'Why is building a string with `+=` in a loop O(n²), and what is the fix?',
        difficulty: 'Easy',
        answer: 'Strings are immutable, so `s += t` allocates a new string and copies both operands. Doing that n times copies a growing prefix each iteration, giving O(n²) total. The fix is to append the pieces to a list and call `"".join(parts)` once, which computes the final size up front and copies each piece exactly once — O(total). CPython has a refcount-1 optimisation that sometimes makes `+=` look fast, but it is an implementation detail that disappears the moment another name references the string.',
      },
      {
        question: 'What does `[[0] * 3] * 2` produce, and why is it usually a bug?',
        difficulty: 'Medium',
        answer: 'It produces `[[0,0,0], [0,0,0]]`, but both rows are *the same list object* — `grid[0] is grid[1]` is True. The outer `* 2` copies the reference, not the list. Writing `grid[0][0] = 1` makes every row show a 1 in column 0. The correct build is `[[0] * 3 for _ in range(2)]`, which evaluates the inner expression once per row. `[0] * 3` itself is safe because ints are immutable — assigning to a slot rebinds it rather than mutating a shared object.',
      },
      {
        question: 'Explain the mutable default argument trap.',
        difficulty: 'Medium',
        answer: 'Default values are evaluated once, when the `def` statement executes — not on each call. So `def f(acc=[])` creates one list that is reused by every call that omits the argument, and it accumulates across calls. You can see the shared object in `f.__defaults__`. The fix is a `None` sentinel: `def f(acc=None): acc = [] if acc is None else acc`. The same applies to dicts, sets, and anything computed at def time such as `datetime.now()`.',
      },
      {
        question: 'What is the difference between `bisect_left` and `bisect_right`?',
        difficulty: 'Medium',
        answer: '`bisect_left(xs, v)` returns the leftmost index where `v` could be inserted while keeping the list sorted, so with duplicates it lands *before* them. `bisect_right(xs, v)` returns the rightmost such index, landing *after* them. `bisect_left` is the lower bound and the right choice for "find the element" and "first element >= v". The difference `bisect_right(xs, v) - bisect_left(xs, v)` counts occurrences of `v` in O(log n).',
      },
      {
        question: 'Python only has a min-heap. How do you get a max-heap, and how do you avoid a TypeError when priorities tie?',
        difficulty: 'Medium',
        answer: 'Negate values on the way in and on the way out: push `-v`, and negate again after `heappop`. For ties, `heapq` compares tuples element by element, so if two entries share a priority it falls through to comparing the payload — which raises `TypeError` if the payload is not orderable. Push a three-element tuple `(priority, unique_counter, payload)` using `itertools.count()` for the counter; the counter is always unique, so the payload is never compared.',
      },
      {
        question: 'What does `is` compare, and why does `a is b` sometimes appear to work for integers?',
        difficulty: 'Medium',
        answer: '`is` compares object identity (the same object in memory); `==` compares value. CPython interns small integers (-5 to 256) and short identifier-like strings, so `256 is 256` is True while `1000 is 1000` may be False depending on whether the compiler folded them into one constant. Relying on it is a latent bug. Use `is` only for `None`, `True`, `False` and sentinel objects; use `==` for everything else.',
      },
      {
        question: 'Why does `-7 // 2` give `-4` rather than `-3`?',
        difficulty: 'Medium',
        answer: 'Python floor division rounds toward negative infinity, not toward zero, so `-7 / 2 = -3.5` floors to `-4`. C, C++ and Java truncate toward zero and give `-3`. The `%` operator follows: Python guarantees `a == (a // b) * b + a % b`, so the remainder takes the sign of the *divisor* — `-7 % 3` is `2`, not `-1`. This is convenient for cyclic indexing (`(i - 1) % n` always lands in range) but breaks ported C/Java index arithmetic. Use `int(a / b)` or `math.trunc` when you genuinely want truncation.',
      },
      {
        question: 'Why does defining `__eq__` without `__hash__` make a class unusable in a set?',
        difficulty: 'Hard',
        answer: 'Hash-based containers require that equal objects have equal hashes. When you define `__eq__`, Python cannot know your new equality is consistent with the inherited identity-based `__hash__`, so it sets `__hash__ = None` and instances become unhashable. You must define `__hash__` yourself, typically `hash((self.a, self.b))` over the same fields `__eq__` uses. A `@dataclass` sets `eq=True` and `__hash__ = None` by default; `frozen=True` makes it generate a matching `__hash__`.',
      },
      {
        question: 'What does `@functools.cache` actually do, and when is it wrong to use?',
        difficulty: 'Hard',
        answer: 'It wraps the function in an unbounded dict keyed by the call arguments, so repeated calls with the same arguments return the stored result. It converts an exponential recursion with overlapping subproblems into one that visits each state once. It is wrong when: arguments are unhashable (lists, dicts, sets — convert to tuples first); the function is impure or its result depends on external state; the state space is unbounded, since `cache` never evicts (use `lru_cache(maxsize=N)`); or it is applied to a method, where caching `self` keeps every instance alive and leaks memory — use `cached_property` or a module-level helper instead.',
      },
      {
        question: 'What guarantees does Python\'s sort give, and how do you sort by one key ascending and another descending?',
        difficulty: 'Hard',
        answer: 'Timsort is stable — equal elements keep their relative order — and runs in O(n log n) worst case, O(n) on already-sorted or reverse-sorted runs. For a numeric descending key, negate it: `key=lambda r: (-r.score, r.name)`. For a non-numeric descending key you cannot negate, so exploit stability instead: sort by the least significant key first, then re-sort by the most significant with `reverse=True`. The second sort preserves the first sort\'s order within ties.',
      },
      {
        question: 'What is the difference between a list comprehension and a generator expression?',
        difficulty: 'Medium',
        answer: 'A list comprehension builds the entire list eagerly in memory. A generator expression returns a lazy iterator that produces values on demand, using O(1) memory regardless of input size, and can model infinite sequences. Use a generator when you consume the values once and never need `len()`, indexing, or a second pass — `sum(x*x for x in range(10**7))` allocates nothing. Use a list when you need random access, repeated iteration, or a length. Generators are one-shot: iterating a second time yields nothing.',
      },
      {
        question: 'Why do all three lambdas in `[lambda: i for i in range(3)]` return 2?',
        difficulty: 'Hard',
        answer: 'Closures capture the *variable*, not its value at creation time. All three lambdas reference the same `i`, and by the time any of them is called the comprehension has finished and `i` is 2. This is late binding. Fix it by binding at definition time with a default argument — `[lambda i=i: i for i in range(3)]` — since defaults ARE evaluated eagerly, or with `functools.partial`. The same bug appears with loop-created callbacks and event handlers.',
      },
      {
        question: 'How do you decide between a dict, a set, and a list for a given problem?',
        difficulty: 'Easy',
        answer: 'Ask what the dominant operation is. Repeated membership tests or dedupe → set, O(1) versus a list\'s O(n). Key-to-value association or counting → dict (or `Counter`/`defaultdict`). Ordered data with index access, or where duplicates and position matter → list. If you also need order *and* O(1) membership, keep both a list and a set; the extra O(n) memory buys you an O(n) rather than O(n²) algorithm.',
      },
      {
        question: 'What is the difference between `__str__` and `__repr__`?',
        difficulty: 'Easy',
        answer: '`__repr__` is for developers: unambiguous, ideally valid Python that would recreate the object, and it is what the REPL, debuggers, and container displays use. `__str__` is for end users: readable. If you only define one, define `__repr__` — `str()` falls back to it, but not the other way around. Note that printing a list calls `__repr__` on the elements, not `__str__`, which is why a class with only `__str__` shows as `<Foo object at 0x…>` inside a list.',
      },
      {
        question: 'Why is `sorted()` sometimes preferable to `.sort()` even when you own the list?',
        difficulty: 'Easy',
        answer: '`.sort()` mutates in place and returns `None`, so `xs = xs.sort()` silently destroys your data — a common bug. It also mutates a list that a caller may still hold a reference to, since arguments are passed by object reference. `sorted()` returns a new list and accepts any iterable, not just lists, so it composes with generators, dict views, and sets. Use `.sort()` only when the list is local and you want to avoid the O(n) copy.',
      },
      {
        question: 'What happens if you mutate a dict while iterating over it?',
        difficulty: 'Medium',
        answer: 'Changing the *size* — inserting or deleting keys — raises `RuntimeError: dictionary changed size during iteration`, because the views are live windows over the underlying table rather than snapshots. Changing a *value* for an existing key is safe. To delete while iterating, iterate a snapshot: `for k in list(d)`. Lists behave worse: mutating during a `for` loop does not raise at all, it silently skips elements as the indices shift, which is why the `[x for x in xs if keep(x)]` rebuild is the idiomatic filter.',
      },
      {
        question: 'How deep can Python recursion go, and what do you do about it?',
        difficulty: 'Medium',
        answer: 'CPython caps the interpreter at roughly 1000 frames (`sys.getrecursionlimit()`) and has no tail-call optimisation, so even a linear tail recursion overflows around n=1000. You can raise it with `sys.setrecursionlimit()`, but the real C stack can still segfault; the safer escape hatch is running the work in a thread created after `threading.stack_size(64 << 20)`. For interviews, the right answer is usually to convert the recursion to an explicit stack — the iterative DFS template — which has no depth limit beyond available memory.',
      },
      {
        question: 'When would you reach for `itertools` instead of writing the loop yourself?',
        difficulty: 'Medium',
        answer: 'When the iteration shape is a known primitive: cartesian products and orderings (`product`, `permutations`, `combinations`) instead of hand-rolled backtracking when you only need to enumerate; running aggregates (`accumulate` for prefix sums, which is the base of many range-query solutions); consecutive-run grouping (`groupby`, remembering the input must be sorted by the same key first); and flattening (`chain.from_iterable`). All of them are lazy and implemented in C, so they are both faster and clearer than the equivalent loop. Write the loop yourself when the logic is problem-specific rather than a standard shape.',
      },
      {
        question: 'Your solution is correct but times out. What is your Python-specific checklist?',
        difficulty: 'Hard',
        answer: 'Four things, in order. (1) String concatenation with `+=` in a loop — swap to `"".join`. (2) `in` against a list inside a loop — convert the haystack to a set once. (3) `pop(0)` / `insert(0, x)` used as a queue — swap to `deque`. (4) Recomputation of overlapping subproblems — add `@cache`. If none apply, check whether you are re-slicing inside a loop (`s[i:j]` copies, so it is O(j-i) not O(1)) or calling `sorted` inside a loop that could sort once outside. Only after all of that is it worth reaching for `sys.stdin.read()` bulk I/O, which mostly matters when input exceeds ~10⁵ lines.',
      },
    ],
  },
];
