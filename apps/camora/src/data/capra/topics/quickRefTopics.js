// Quick Reference topics for the DSA & Algorithms page.
//
// A "Quick References" category sits alongside the pattern categories
// (arrays, two-pointers, trees, dp, …). Pattern topics teach you WHAT to do;
// these teach you how to WRITE it without stalling on syntax.
//
// Modelled on quickref.me-style cheatsheets but pitched at interview depth:
// every section a general cheatsheet covers, plus the complexity tables,
// silent-failure gotcha lists, and version/dialect gates those omit.
//
// Rendering contract (see TopicDetail.jsx):
//   - `keyPatterns` MUST be present — the whole coding-style block is gated on
//     it (TopicDetail.jsx ~1507).
//   - `codeExamples[].title` must be unique WITHIN a topic; duplicates are
//     merged into language tabs rather than rendered as separate cards.
//   - `introduction` is passed through FormattedContent, which renders
//     markdown pipe-tables when every row starts with `|`.
//
// These topics are exempt from the free-topic paywall — see the
// ALWAYS_FREE_TOPICS allowlist in hooks/useContentAccess.ts. Keep the ids
// below in sync with that list.

import { pythonCoreCards } from './quickRefPythonCoreCards.js';
import { pythonDsaCards } from './quickRefPythonDsaCards.js';
import { sqlCards } from './quickRefSqlCards.js';
import { bashCards } from './quickRefBashCards.js';
import { gitCards } from './quickRefGitCards.js';

/** The single category row these topics group under on the DSA page. */
export const quickRefCategory = {
  id: 'quick-reference',
  name: 'Quick References',
  icon: 'bookOpen',
  color: '#0ea5e9',
};

/** Array form, for spreading into codingCategories. */
export const quickRefCategories = [quickRefCategory];

/** topic id -> category id, merged into codingCategoryMap. */
export const quickRefCategoryMap = {
  'python-quickref': 'quick-reference',
  'sql-quickref': 'quick-reference',
  'bash-quickref': 'quick-reference',
  'git-quickref': 'quick-reference',
};

const pythonCards = [...pythonCoreCards, ...pythonDsaCards];

export const quickRefTopics = [
  // ═══════════════════════════════════════════════════════════════
  // Python
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // SQL
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'sql-quickref',
    title: 'SQL',
    icon: 'database',
    color: '#0ea5e9',
    questions: sqlCards.length,
    description: `Interview-grade SQL cheatsheet — ${sqlCards.length} cards from query processing order through window functions, indexes and query plans, with the NULL and JOIN traps that return wrong answers silently.`,

    introduction: `## Overview

SQL interviews fail in a specific way: the query runs, returns rows, and the rows are wrong. There is no traceback and no error — just a number that is quietly off. Almost every case traces back to one of three things:

1. **NULL is not a value, it is "unknown."** Every comparison with it yields UNKNOWN, and \`WHERE\` keeps only TRUE. That is why \`NOT IN\` with a single NULL in the subquery returns *zero rows*.
2. **Clauses do not execute in the order you write them.** \`FROM\` » \`WHERE\` » \`GROUP BY\` » \`HAVING\` » \`SELECT\` » \`ORDER BY\` » \`LIMIT\`. That one line explains why you cannot use a SELECT alias in WHERE, why aggregates are illegal there, and why a filter on the right table turns your LEFT JOIN into an INNER JOIN.
3. **A JOIN multiplies rows.** Join to a table with three matches and every \`SUM()\` triples.

### The three-valued logic that catches everyone

| Expression | Result | Kept by WHERE? |
|---|---|---|
| \`1 = 1\` | TRUE | yes |
| \`1 = 2\` | FALSE | no |
| \`NULL = NULL\` | **UNKNOWN** | **no** |
| \`NULL <> 1\` | **UNKNOWN** | **no** |
| \`status = 'a'\` OR \`status <> 'a'\` | UNKNOWN when NULL | **neither branch matches** |
| \`col IS NULL\` | TRUE / FALSE | correctly |

A row with \`status = NULL\` appears in neither \`WHERE status = 'active'\` nor \`WHERE status <> 'active'\`. If your two "complementary" queries do not add up to the total, this is why.

### What this covers

Beyond the query-writing basics — SELECT, joins, aggregation, subqueries, CTEs — this goes into the parts that separate a working query from a production one:

- **Window functions** in depth: the ranking trio, LAG/LEAD, and frame clauses (including why \`LAST_VALUE\` returns the current row without an explicit frame).
- **Indexes and EXPLAIN**: the leftmost-prefix rule, covering and partial indexes, and *sargability* — why wrapping a column in a function silently disables its index.
- **Transactions and isolation levels**, including the lost-update problem and the three ways to prevent it.
- **Dialect differences** across PostgreSQL, MySQL, SQLite and SQL Server, so a query from a blog post does not fail on your engine.
- **Twenty gotchas** and ten classic interview queries with both window-function and portable forms.

### Dialect baseline

ANSI SQL by default, **PostgreSQL** as the reference implementation. Where MySQL, SQLite or SQL Server differ in a way that actually matters, it is called out inline; card 27 is the full comparison table.`,

    whenToUse: [
      'Writing a query with more than one join and needing to reason about which rows survive and how many times each is counted',
      'A result set has the wrong row count or a total that is too large — usually a join fan-out or a NULL semantics issue',
      'Reaching for a window function and needing the exact difference between `ROW_NUMBER`, `RANK` and `DENSE_RANK`',
      'A query is slow and you need to read the EXPLAIN output and decide whether an index will actually help',
      'Porting SQL between PostgreSQL, MySQL, SQLite or SQL Server',
      'Designing a schema and needing the constraint, type and index vocabulary',
    ],

    keyPatterns: [
      'Logical processing order: `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`',
      '`WHERE` filters rows, `HAVING` filters groups — put the condition as early as possible',
      'Right-table conditions belong in the `ON` clause of an outer join, never in `WHERE`',
      '`NOT EXISTS` over `NOT IN` for anti-joins — it is NULL-safe',
      '`ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)` wrapped in a subquery for "top N per group"',
      'Conditional aggregation (`SUM(CASE WHEN … )` / `FILTER`) to pivot in a single pass',
      'Keyset pagination over `OFFSET` once the offset gets large',
      'Sargable predicates: never wrap an indexed column in a function or arithmetic',
    ],

    timeComplexity: 'Index seek O(log n) · index + heap fetch O(log n + k) · hash join O(n + m) · sort / UNION dedupe O(n log n) · full scan O(n)',
    spaceComplexity: 'Index adds ~10-30% per indexed column; hash joins and sorts spill to disk past the working-memory limit',

    approach: [
      'State the grain first: what does one row of the result represent? Most join bugs are a grain mismatch.',
      'Build from `FROM` outward — get the joins and row count right before adding aggregation.',
      'Filter as early as possible: `WHERE` before `GROUP BY`, and push predicates into subqueries and CTEs.',
      'Aggregate at the correct level, using a subquery to pre-aggregate before joining when the join would otherwise fan out.',
      'Reach for a window function whenever you need a per-group calculation but still want every row.',
      'Run `EXPLAIN ANALYZE` with realistic parameters, find the slowest node, and check that predicates are sargable before adding an index.',
    ],

    codeExamples: sqlCards,

    commonMistakes: [
      'Using `= NULL` instead of `IS NULL`. The comparison yields UNKNOWN, so the row never matches.',
      '`NOT IN (subquery)` where the subquery can return NULL — the whole predicate becomes UNKNOWN and the query returns zero rows. Use `NOT EXISTS`.',
      'Putting a right-table condition in `WHERE` after a `LEFT JOIN` — it discards the NULL-extended rows and silently makes it an INNER JOIN. Move it into `ON`.',
      'Forgetting that a join multiplies rows: joining a 1:N table before `SUM()` double-counts the parent values. Pre-aggregate in a subquery first.',
      'Assuming `COUNT(col)` and `COUNT(*)` are the same — `COUNT(col)` skips NULLs, and `AVG` divides by the non-NULL count.',
      'Using `BETWEEN` for a timestamp range. It is inclusive on both ends, so it misses everything after midnight on the last day. Use `>= start AND < end`.',
      'Expecting `DISTINCT` to apply to one column — it applies to the entire select list.',
      '`ORDER BY` without a unique tiebreaker, which makes `LIMIT`/`OFFSET` pagination non-deterministic and silently skip or repeat rows.',
      'Using `UNION` when you meant `UNION ALL` — the dedupe forces a sort or hash over the whole result for no benefit.',
      'Wrapping an indexed column in a function (`WHERE YEAR(created_at) = 2026`) which makes the predicate non-sargable and forces a full scan.',
      'Relying on MySQL letting you select ungrouped columns — without `ONLY_FULL_GROUP_BY` it returns an arbitrary row with no error.',
      'Running `UPDATE` or `DELETE` without first testing the `WHERE` clause as a `SELECT`.',
      'Using `FLOAT`/`REAL` for money instead of `NUMERIC`/`DECIMAL`, which loses cents to binary rounding.',
      'Writing `LAST_VALUE(...) OVER (ORDER BY ...)` without an explicit frame — the default frame ends at the current row, so it returns the current row.',
      'Integer division: `3 / 2` is `1` in PostgreSQL and SQL Server. Cast one operand when you want a fraction.',
    ],

    tips: [
      'Card 01 (processing order) explains more confusing SQL behaviour than any other single fact — read it first.',
      'Set `merge.conflictstyle`-equivalent strictness on your engine: MySQL users should enable `ONLY_FULL_GROUP_BY` so silent wrong answers become loud errors.',
      'When a total looks too big, check the row count before the aggregation — `SELECT COUNT(*)` on the joined set usually reveals a fan-out immediately.',
      '`EXISTS` short-circuits on the first match; `IN` materialises the whole list. For correlated existence checks, `EXISTS` is both faster and NULL-safe.',
      'CTEs cost nothing in readability terms and PostgreSQL 12+ inlines them by default — use them to name each step instead of nesting subqueries.',
      'Window functions run after `WHERE` and before `ORDER BY`, so you must wrap them in a subquery to filter on their result.',
      '`EXPLAIN ANALYZE` and compare estimated vs actual rows. A large gap means stale statistics, and `ANALYZE` may fix the plan without any query change.',
      'Composite index column order: equality predicates first, then range, then the sort column.',
    ],

    interviewTips: [
      'State the grain of your result out loud before writing the query — "one row per customer per month" — it prevents most join mistakes and shows structured thinking.',
      'Say why you chose `LEFT JOIN` over `INNER JOIN`: "I want customers with zero orders to still appear." That single sentence is the whole point of the question in many screens.',
      'When you use a window function, name the alternative you rejected. "A correlated subquery would work but runs once per row; the window does it in one pass."',
      'Mention NULL handling before being asked. Volunteering "`NOT EXISTS` here because `NOT IN` breaks if the subquery has a NULL" is a strong signal.',
      'For "optimise this query", ask what the indexes are and what `EXPLAIN` shows before proposing anything. Guessing at indexes reads as pattern-matching.',
      'Write readable SQL under pressure: uppercase keywords, one clause per line, CTEs instead of triple-nested subqueries. Interviewers read your query more than they run it.',
      'If you do not know the dialect, say which one you are writing and note where it would differ. That is more impressive than silently writing PostgreSQL on a MySQL screen.',
    ],

    theoryQuestions: [
      {
        question: 'What is the logical processing order of a SELECT statement, and why does it matter?',
        difficulty: 'Easy',
        answer: '`FROM`/`JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. It matters because aliases are created in `SELECT`, which runs fifth: you cannot reference a select alias in `WHERE` (it does not exist yet) but you can in `ORDER BY` (it does). It also explains why aggregates are illegal in `WHERE` — grouping has not happened yet — and why `HAVING` is the clause that filters groups.',
      },
      {
        question: 'What is the difference between WHERE and HAVING?',
        difficulty: 'Easy',
        answer: '`WHERE` filters individual rows before grouping; `HAVING` filters groups after aggregation. Because `WHERE` runs first it can use an index and reduces the number of rows that must be grouped, so any condition that does not involve an aggregate belongs there. `HAVING` is only for conditions on aggregate results, such as `HAVING COUNT(*) > 5`.',
      },
      {
        question: 'Why does `NOT IN` with a subquery sometimes return zero rows?',
        difficulty: 'Hard',
        answer: 'If the subquery returns even one NULL, the predicate expands to `x <> a AND x <> b AND x <> NULL`. The last term is UNKNOWN, and `TRUE AND UNKNOWN` is UNKNOWN, which `WHERE` discards — so every row is filtered out regardless of the data. `NOT EXISTS` does not have this problem because it tests row existence rather than comparing values, so it is the correct choice for anti-joins. If you must use `NOT IN`, add `WHERE col IS NOT NULL` to the subquery.',
      },
      {
        question: 'Why does adding a WHERE clause on the right table turn a LEFT JOIN into an INNER JOIN?',
        difficulty: 'Medium',
        answer: 'The LEFT JOIN produces NULL-extended rows for unmatched left rows. `WHERE` runs after the join, and any comparison against those NULL columns yields UNKNOWN, which `WHERE` discards — so exactly the rows that made it a LEFT JOIN get removed. Putting the condition in the `ON` clause instead applies it while matching, so unmatched left rows survive with NULLs. The deliberate exception is `WHERE right.id IS NULL`, which is the anti-join idiom.',
      },
      {
        question: 'Explain the difference between ROW_NUMBER, RANK and DENSE_RANK.',
        difficulty: 'Medium',
        answer: 'They differ only in tie handling. For values 100, 90, 90, 80: `ROW_NUMBER` gives 1,2,3,4 — always unique, arbitrary among ties. `RANK` gives 1,2,2,4 — ties share a rank and the next value skips. `DENSE_RANK` gives 1,2,2,3 — ties share, no gap. Use `ROW_NUMBER` to pick exactly one row per group, `RANK` for competition ranking where ties should all be included, and `DENSE_RANK` for "the Nth distinct value" questions such as second-highest salary.',
      },
      {
        question: 'What is the difference between GROUP BY and a window function?',
        difficulty: 'Medium',
        answer: '`GROUP BY` collapses each group into a single output row, so the individual rows are gone. A window function computes across a set of rows defined by `OVER (PARTITION BY ...)` while keeping every input row, so each row can carry both its own values and its group aggregate. That is why `AVG(salary) OVER (PARTITION BY dept_id)` lets you compare each employee to their department average in one pass, whereas `GROUP BY` would require a self-join.',
      },
      {
        question: 'What does "sargable" mean and why does it matter?',
        difficulty: 'Hard',
        answer: 'A sargable (Search ARGument ABLE) predicate is one the engine can satisfy with an index seek. Wrapping the indexed column in a function or arithmetic destroys sargability, because the index stores the raw column values, not the function results: `WHERE YEAR(created_at) = 2026` forces a full scan, while `WHERE created_at >= \'2026-01-01\' AND created_at < \'2027-01-01\'` uses the index. The same applies to leading-wildcard `LIKE \'%x\'` and to implicit type casts, which are easy to introduce accidentally through an ORM passing a string for an integer column.',
      },
      {
        question: 'Explain the leftmost prefix rule for composite indexes.',
        difficulty: 'Hard',
        answer: 'A composite index on `(a, b, c)` is sorted by `a`, then `b` within equal `a`, then `c`. The engine can therefore use it for any leading prefix of the columns: `a`, `a+b`, or `a+b+c`. It cannot use it for `b` alone or `b+c`, because the rows for a given `b` are scattered throughout the index. It can use the `a` portion of `WHERE a = ? AND c = ?` but not the `c` portion. This is why column order matters: put equality predicates first, then the range predicate, then the sort column.',
      },
      {
        question: 'What is the lost update problem and how do you prevent it?',
        difficulty: 'Hard',
        answer: 'Two transactions read the same value (say 100), each computes a new value from it, and each writes back — the second write silently overwrites the first, so one update is lost. Three fixes: (1) do the arithmetic in the database (`SET balance = balance - 100`) so the read and write are one atomic statement; (2) pessimistic locking with `SELECT ... FOR UPDATE`, which blocks the second reader until the first commits; (3) optimistic locking with a version column, where the `UPDATE` includes `AND version = :seen` and an affected-row count of zero signals a conflict to retry.',
      },
      {
        question: 'What is the difference between UNION and UNION ALL, and which should you default to?',
        difficulty: 'Easy',
        answer: '`UNION` removes duplicate rows, which requires sorting or hashing the entire combined result — real cost on large inputs. `UNION ALL` simply concatenates. Default to `UNION ALL` and only use `UNION` when duplicates are genuinely possible and genuinely unwanted. When the branches are disjoint by construction (for example a tag column distinguishing them), `UNION` is pure wasted work.',
      },
      {
        question: 'Why does `COUNT(*)` differ from `COUNT(column)`?',
        difficulty: 'Easy',
        answer: '`COUNT(*)` counts rows. `COUNT(column)` counts rows where that column is NOT NULL. The same NULL-skipping applies to `SUM`, `AVG`, `MIN` and `MAX` — which is why `AVG` over (10, 20, NULL) is 15, not 10: it divides by the non-NULL count of 2. If you want NULLs treated as zero, wrap the column: `AVG(COALESCE(v, 0))`.',
      },
      {
        question: 'When would you use a CTE instead of a subquery?',
        difficulty: 'Medium',
        answer: 'For readability whenever the query has more than one logical step — a CTE names each step and reads top to bottom instead of inside out. For reuse when the same derived set is needed more than once. And necessarily for recursion, which subqueries cannot express: hierarchy traversal and series generation both require `WITH RECURSIVE`. Historically PostgreSQL materialised CTEs as an optimisation fence; since version 12 they are inlined by default, with `MATERIALIZED` and `NOT MATERIALIZED` available to force either behaviour.',
      },
      {
        question: 'How do you find the second highest salary, and what edge cases matter?',
        difficulty: 'Medium',
        answer: 'The cleanest form is `SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)`, which correctly returns NULL when there is no second value. The window form is `DENSE_RANK() OVER (ORDER BY salary DESC)` filtered to 2, which generalises to Nth. `LIMIT 1 OFFSET 1` also works but needs `DISTINCT` — otherwise two people on the top salary make the second row still the highest. The edge cases are: ties at the top, fewer than two distinct salaries, and whether the question means the second distinct salary or the second employee.',
      },
      {
        question: 'What does an index cost, and when should you not add one?',
        difficulty: 'Medium',
        answer: 'Every index consumes storage and must be updated on every `INSERT`, `UPDATE` of an indexed column, and `DELETE`, so write throughput drops roughly in proportion to the index count. Do not index a low-cardinality column where a large fraction of rows match (the planner will correctly prefer a scan), do not index a small table, and do not add an index that is a prefix of an existing composite one — it is redundant. Also drop indexes with zero scans; they are pure write overhead.',
      },
      {
        question: 'Why is OFFSET pagination slow at high page numbers, and what is the alternative?',
        difficulty: 'Hard',
        answer: '`OFFSET n` still has to produce and discard the first n rows, so cost grows linearly with the offset — page 10,000 reads 200,000 rows to return 20. It is also unstable: if rows are inserted or deleted between requests, users see duplicates or skipped rows. Keyset (seek) pagination instead carries the last row\'s sort key forward as a cursor: `WHERE (created_at, id) < (:last_ts, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20`. With a matching index that is O(log n) per page and stable under concurrent writes; the trade-off is losing random access to an arbitrary page number.',
      },
      {
        question: 'What is a covering index?',
        difficulty: 'Medium',
        answer: 'An index that contains every column the query needs, so the engine can answer entirely from the index without visiting the table — an "index-only scan". This eliminates one random I/O per result row and can be an order of magnitude faster. PostgreSQL 11+ and SQL Server support `INCLUDE` for non-key columns, which keeps them out of the sorted key while still making them available; otherwise you add the extra columns at the end of the composite key.',
      },
      {
        question: 'What are the four SQL isolation levels and what does each allow?',
        difficulty: 'Hard',
        answer: 'READ UNCOMMITTED allows dirty reads (seeing uncommitted data). READ COMMITTED prevents dirty reads but allows non-repeatable reads — re-reading a row can show a different value. REPEATABLE READ also prevents that, but the standard still permits phantom reads, where a re-run query returns new rows. SERIALIZABLE prevents all three. In practice, PostgreSQL and SQL Server default to READ COMMITTED while MySQL/InnoDB defaults to REPEATABLE READ, and both InnoDB (via next-key locks) and PostgreSQL (via snapshot isolation) actually block phantoms at REPEATABLE READ despite the standard allowing them.',
      },
      {
        question: 'How do you get the top 3 rows per group?',
        difficulty: 'Medium',
        answer: 'Assign a per-group row number and filter it in an outer query: `SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) rn FROM employees) t WHERE rn <= 3`. The wrapping is required because window functions are evaluated after `WHERE`. Use `RANK()` instead if ties at the boundary should all be included. On PostgreSQL, `LATERAL` with `LIMIT 3` per group is often faster when the group count is small, and `DISTINCT ON` handles the top-1 case directly.',
      },
      {
        question: 'What does EXPLAIN tell you, and what do you look for first?',
        difficulty: 'Hard',
        answer: '`EXPLAIN` shows the planner\'s chosen access path; `EXPLAIN ANALYZE` actually executes it and reports real row counts and timings. Look first at the node with the largest actual time — that is the bottleneck. Then compare estimated to actual rows: a large discrepancy means stale statistics and a plan chosen on bad information, fixable with `ANALYZE`. After that, look for sequential scans on large tables with selective predicates (a missing or unusable index), a high "Rows Removed by Filter" count (the index is not selective enough), and sorts spilling to disk.',
      },
      {
        question: 'When is denormalisation the right call?',
        difficulty: 'Medium',
        answer: 'Normalise by default — it prevents update anomalies and keeps a single source of truth. Denormalise only after measuring, when a read-heavy path repeatedly performs the same expensive join or aggregate and the query itself is already optimal. Typical forms are a cached counter, a duplicated lookup column to avoid a join, or a summary/materialised-view table refreshed on a schedule. The cost is that you now own consistency in application code or triggers, so it is a deliberate trade of write complexity for read latency, not a default.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Bash
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bash-quickref',
    title: 'Bash & Shell',
    icon: 'terminal',
    color: '#0ea5e9',
    questions: bashCards.length,
    description: `Interview-grade shell cheatsheet — ${bashCards.length} cards on scripting safely, text processing with grep/sed/awk, process and file management, and the quoting bugs that delete the wrong files.`,

    introduction: `## Overview

The shell's defaults are actively hostile: a failed command keeps going, an unset variable expands to nothing, and an unquoted variable gets split into multiple words. Nothing raises. The script completes "successfully" having done the wrong thing.

That is why every script here starts the same way:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
\`\`\`

\`-e\` exits on error, \`-u\` errors on an unset variable, and \`-o pipefail\` makes a pipeline fail when any stage fails rather than only the last. Those three flags convert an entire class of silent corruption into a loud, early failure.

### The one rule that prevents most shell bugs

**Quote every expansion.** An unquoted \`$var\` is subject to word splitting and glob expansion:

| Written | \`file="my report.txt"\` becomes | Result |
|---|---|---|
| \`rm $file\` | \`rm my report.txt\` | deletes **two** wrong files |
| \`rm "$file"\` | \`rm "my report.txt"\` | correct |
| \`[ -f $file ]\` | \`[ -f my report.txt ]\` | "too many arguments" |
| \`[[ -f $file ]]\` | — | fine, \`[[ ]]\` does not split |

The same applies to \`"$@"\` versus \`$@\`, and to \`"\${arr[@]}"\` versus \`\${arr[@]}\`.

### What this covers

- **Scripting**: strict mode, argument parsing with \`getopts\`, parameter expansion (defaults, substring, strip, replace — no subprocess needed), arrays and associative arrays, \`[[ ]]\` versus \`[ ]\`, functions and traps.
- **Redirection**: file descriptors, why \`2>&1 >file\` differs from \`>file 2>&1\`, heredocs, and process substitution.
- **Text processing**: grep, sed and awk each in depth, plus the sort/uniq/cut/tr toolkit and the frequency-count pipeline you will type a thousand times.
- **find and xargs**: including why \`-print0\` paired with \`-0\` is the only form that survives filenames with spaces.
- **Systems**: permissions, processes and signals, networking, SSH tunnels, and environment/startup-file order — which is why cron jobs cannot find your PATH.
- **Debugging**: \`set -x\`, \`PS4\`, \`PIPESTATUS\`, shellcheck, and the five usual causes of "works in my terminal, fails in the script."
- **Eighteen gotchas**, each one a silent failure.

### Baseline

**Bash 4+/5.x.** Arrays, \`[[ ]]\`, and \`\${var^^}\` do not exist in POSIX \`sh\` — and \`/bin/sh\` is dash on Debian/Ubuntu, not bash. Use \`#!/usr/bin/env bash\` whenever you use a Bash feature.`,

    whenToUse: [
      'Writing a deploy, CI or automation script that must fail loudly rather than half-succeed',
      'Processing logs or CSV on the command line — counting, grouping, extracting a column',
      'A script works when you paste it into a terminal but fails under cron, CI or systemd',
      'Bulk file operations where filenames may contain spaces and a wrong glob deletes real data',
      'Debugging a running system: what is using this port, what is eating memory, which process holds this file',
      'Reviewing someone else\'s shell script for quoting and error-handling bugs',
    ],

    keyPatterns: [
      '`set -euo pipefail` at the top of every script, always',
      'Quote every expansion: `"$var"`, `"$@"`, `"${arr[@]}"`',
      '`trap cleanup EXIT` so temp files are removed on every exit path',
      '`while IFS= read -r line; do ... done < file` — the only correct line-reading loop',
      'Process substitution `< <(cmd)` instead of a pipe, to keep the loop in the current shell',
      '`find -print0 | xargs -0` for any filename-safe bulk operation',
      'Arrays for building command arguments, never a space-separated string',
      '`sort | uniq -c | sort -rn | head` for any frequency question',
      '`"${var:?message}"` to fail fast on a missing required variable',
    ],

    timeComplexity: 'grep/sed/awk are single-pass O(n) streaming · sort is O(n log n) and may spill to disk · a per-file subprocess (`-exec cmd {} \\;`) multiplies constant cost by n, which `+` or `xargs` avoids',
    spaceComplexity: 'Streaming tools are O(1) in memory; `sort`, `awk` grouping arrays and `mapfile` are O(n)',

    approach: [
      'Start from the strict-mode skeleton — shebang, `set -euo pipefail`, `trap cleanup EXIT` — before writing any logic.',
      'Validate inputs immediately: `"${VAR:?message}"` for required values, and check that files and directories exist.',
      'Quote every expansion as you type it rather than auditing afterwards; use arrays for anything that becomes command arguments.',
      'Prefer built-in parameter expansion over spawning `basename`, `dirname` or `sed` — it is both faster and one less dependency.',
      'For bulk file work, always dry-run first (`find -print`, `git clean -n`, `rsync --dry-run`) before the destructive flag.',
      'Run `shellcheck` on the finished script; it catches most quoting and portability bugs statically.',
    ],

    codeExamples: bashCards,

    commonMistakes: [
      'Leaving an expansion unquoted, so a filename with a space becomes two arguments and the command hits the wrong files.',
      'Putting spaces around `=` in an assignment — `x = 1` tries to run a command named `x`.',
      'Piping into a `while read` loop: the loop runs in a subshell, so variables set inside it are lost afterwards. Use `< file` or `< <(cmd)`.',
      'Assuming `set -e` catches everything. It does not fire inside an `if`/`while` condition, to the left of `&&` or `||`, or for a command whose status you test.',
      'Checking `$?` after a pipeline — it only reflects the last stage. Use `set -o pipefail` or inspect `${PIPESTATUS[@]}`.',
      'Parsing `ls` output in a `for` loop. Use a glob (`for f in *`) or `find -print0`.',
      'Forgetting that a glob matching nothing stays literal, so the loop body runs once with the pattern as the value. Use `shopt -s nullglob` or guard with `[[ -e "$f" ]]`.',
      'Using `[ "$a" < "$b" ]` — inside single brackets `<` is a redirection and creates a file. Use `[[ ]]`.',
      'Comparing numbers with string operators: `[[ "10" < "9" ]]` is true lexicographically. Use `(( 10 < 9 ))`.',
      'Reading with plain `read` instead of `read -r`, which silently eats backslashes.',
      'Running `cd` without `|| exit`, so a failed `cd` leaves the script operating in the wrong directory.',
      '`rm -rf "$dir/"` with `$dir` unset. Combine `set -u` with `"${dir:?}"` to make it impossible.',
      'Using `echo` for anything non-trivial — it handles `-n` and backslashes differently across shells. Use `printf`.',
      'Writing `#!/bin/sh` while using arrays or `[[ ]]`, which do not exist in dash.',
      'Omitting `local` in a function, so its variables are global and collide with a caller\'s loop counter.',
      'Forgetting `git stash -u` / `rsync` trailing-slash semantics and similar "the tool did exactly what I typed" surprises.',
    ],

    tips: [
      'Add `shellcheck` to CI. It catches the quoting bugs that code review misses, and its wiki explains every rule.',
      '`set -x` with a rich `PS4` (`export PS4=\'+ ${BASH_SOURCE}:${LINENO}: \'`) usually locates a bug in a single run.',
      'Parameter expansion replaces whole subprocesses: `"${path##*/}"` is `basename`, `"${path%/*}"` is `dirname`, and both are free.',
      'Use `command -v` rather than `which` in scripts — it is a shell builtin and POSIX-specified.',
      '`mapfile -t arr < file` reads a file into an array correctly in one line, with no loop and no IFS trap.',
      'Log to stderr (`>&2`) inside functions so their diagnostics do not contaminate captured stdout.',
      'Always dry-run destructive operations: `find -print` before `-delete`, `rsync --dry-run` before `--delete`, `git clean -n` before `-fdx`.',
      'A cron job has a minimal PATH and never sources your `~/.bashrc` — use absolute paths or source your profile explicitly.',
    ],

    interviewTips: [
      'In a systems or SRE interview, reach for `set -euo pipefail` unprompted. Its absence is a common silent rejection signal.',
      'Say why you are quoting: "I quote this because a filename with a space would word-split." It shows you know the failure mode, not just the ritual.',
      'When asked to process a log, narrate the pipeline stages as you build them — extract, sort, count, sort, head. It is easier to follow than a single long line.',
      'Prefer `awk` over a chain of five tools when you need fields and a group-by; being able to say "one pass instead of four" is a good answer.',
      'For "find the top N", the `sort | uniq -c | sort -rn | head` idiom is expected. Type it fluently.',
      'When you use `find -print0 | xargs -0`, explain that it is NUL-delimited so filenames with spaces or newlines survive. That detail separates experience from memorisation.',
      'If asked to debug a script that "works locally", ask about PATH, shell, TTY and working directory before reading the code — that is the professional order.',
    ],

    theoryQuestions: [
      {
        question: 'What does `set -euo pipefail` do and why is each flag needed?',
        difficulty: 'Easy',
        answer: '`-e` exits immediately when any command returns non-zero, so a failed step does not silently continue into dependent logic. `-u` treats an unset variable as an error, which catches typos and prevents `rm -rf "$dir/"` becoming `rm -rf /`. `-o pipefail` makes a pipeline return the first non-zero status rather than only the last command\'s, so `false | true` correctly fails. Together they turn silent partial execution into a loud early failure. Note `-e` has real exceptions: it does not fire in an `if`/`while` condition, to the left of `&&` or `||`, or for a command whose status you explicitly test.',
      },
      {
        question: 'Why must you quote variable expansions?',
        difficulty: 'Easy',
        answer: 'An unquoted expansion undergoes word splitting on IFS and then pathname (glob) expansion. So `file="my report.txt"; rm $file` runs `rm` with two arguments and deletes the wrong things, and `pattern="*"; echo $pattern` prints every filename in the directory instead of an asterisk. Quoting suppresses both. The rule is to quote every expansion unless you specifically want splitting — and inside `[[ ]]` splitting does not happen, which is one reason to prefer it over `[ ]`.',
      },
      {
        question: 'What is the difference between `$@` and `$*`?',
        difficulty: 'Medium',
        answer: 'Quoted, `"$@"` expands to each positional parameter as a separate word, preserving argument boundaries — this is what you want when forwarding arguments, as in `main "$@"`. Quoted `"$*"` joins all parameters into a single word separated by the first character of IFS. Unquoted, both word-split and are almost always wrong. The same distinction applies to arrays: `"${arr[@]}"` gives you the elements individually, `"${arr[*]}"` gives you one joined string.',
      },
      {
        question: 'Why does a variable set inside a `while read` loop lose its value after the loop?',
        difficulty: 'Hard',
        answer: 'When the loop is the right-hand side of a pipe (`cat f | while read ...`), Bash runs it in a subshell, and variable assignments in a subshell do not propagate to the parent. The fix is to avoid the pipe: redirect directly with `done < file`, or use process substitution `done < <(cmd)` — both keep the loop in the current shell. This is also why `shopt -s lastpipe` exists, though it only applies in non-interactive shells with job control off.',
      },
      {
        question: 'Explain the difference between `>file 2>&1` and `2>&1 >file`.',
        difficulty: 'Hard',
        answer: 'Redirections are processed left to right and `2>&1` means "make fd 2 point wherever fd 1 currently points". In `>file 2>&1`, stdout is redirected to the file first, then stderr is pointed at the same place — both go to the file. In `2>&1 >file`, stderr is first pointed at the terminal (where stdout still points), and only then is stdout moved to the file — so stderr keeps going to the terminal. The second form is occasionally what you want, but it is usually a bug.',
      },
      {
        question: 'Why should you use `[[ ]]` instead of `[ ]` in Bash?',
        difficulty: 'Medium',
        answer: '`[` is an ordinary command, so its arguments undergo word splitting and glob expansion — `[ -f $file ]` breaks on a filename with a space. `[[ ]]` is shell syntax, so no splitting occurs, quoting is far less error-prone, `&&` and `||` work naturally, and it adds glob matching (`==`) and regex matching (`=~`) with capture groups in `BASH_REMATCH`. Critically, `<` inside `[ ]` is a redirection that creates a file, whereas in `[[ ]]` it is string comparison. The only reason to use `[ ]` is POSIX portability to dash or ash.',
      },
      {
        question: 'Why is `find -print0 | xargs -0` the recommended pairing?',
        difficulty: 'Medium',
        answer: 'By default `find` separates results with newlines and `xargs` splits on whitespace, so any filename containing a space, tab or newline is broken into multiple arguments — and a file named `-rf` is interpreted as a flag. NUL is the only byte that cannot appear in a filename, so `-print0` emits NUL-separated names and `xargs -0` splits on NUL, making the pipeline correct for every legal filename. The same reasoning applies to `read -d \'\'` when consuming that stream in a loop.',
      },
      {
        question: 'What is the difference between `-exec cmd {} \\;` and `-exec cmd {} +`?',
        difficulty: 'Medium',
        answer: '`\\;` runs the command once per matched file, so a thousand matches means a thousand process spawns. `+` batches as many filenames as fit into a single command line, dramatically reducing process creation — the same optimisation `xargs` performs. Use `+` whenever the command accepts multiple arguments; use `\\;` only when it must be invoked per file, for example because you need `{}` to appear more than once or in a non-final position.',
      },
      {
        question: 'What does `IFS= read -r line` mean, piece by piece?',
        difficulty: 'Medium',
        answer: '`IFS=` sets the field separator to empty for the duration of the `read`, which stops leading and trailing whitespace from being stripped. `-r` disables backslash interpretation, so a literal backslash in the input survives instead of being treated as an escape or a line continuation. `line` is the variable to fill. Without both, reading a file with indented lines or Windows paths silently corrupts the data — which is why this exact incantation is the standard line-reading idiom.',
      },
      {
        question: 'What is the difference between a hard link and a symbolic link?',
        difficulty: 'Medium',
        answer: 'A hard link is an additional directory entry pointing at the same inode, so it is indistinguishable from the "original"; the data persists until the last link is removed, and hard links cannot cross filesystems or point at directories. A symbolic link is a small file containing a path, so it can cross filesystems and target directories, but it breaks if the target moves or is deleted (a dangling link). `ln target link` makes a hard link; `ln -s target link` makes a symlink.',
      },
      {
        question: 'What do the three octal digits in `chmod 755` mean, and what does `x` do on a directory?',
        difficulty: 'Easy',
        answer: 'The digits are user, group and other, each a sum of read (4), write (2) and execute (1). So 755 is `rwxr-xr-x`. On a file, `x` means executable. On a directory the meanings shift: `r` lets you list the entry names, `w` lets you create and delete entries within it, and `x` lets you traverse into it and stat its contents. You need `x` on every ancestor directory to reach a file, which is why a directory with `r` but no `x` lets you see names but not open anything.',
      },
      {
        question: 'What is the difference between SIGTERM and SIGKILL?',
        difficulty: 'Medium',
        answer: 'SIGTERM (15) is the default for `kill` and is a polite request: the process can catch it, flush buffers, close connections and exit cleanly. SIGKILL (9) is handled by the kernel and cannot be caught, blocked or ignored, so the process dies immediately with no cleanup — leaving temp files, held locks and possibly corrupt state. The correct escalation is TERM, wait a few seconds, then KILL only if it is still alive. Reaching for `kill -9` first is how you get orphaned lock files.',
      },
      {
        question: 'Why does a cron job fail with "command not found" when the same command works in your terminal?',
        difficulty: 'Hard',
        answer: 'Cron runs a non-interactive, non-login shell with a minimal environment — typically `PATH=/usr/bin:/bin` — and it does not source `/etc/profile`, `~/.bash_profile` or `~/.bashrc`. Any PATH additions, shell functions, aliases or version-manager shims from your interactive setup simply do not exist. The fixes are to use absolute paths, set `PATH` explicitly at the top of the crontab, or source the needed profile in the job. The same reasoning explains failures under systemd units and CI runners.',
      },
      {
        question: 'When would you use awk instead of grep plus cut?',
        difficulty: 'Medium',
        answer: 'When you need field-level logic in a single pass. `awk` splits every line into fields automatically, so it does filtering, column extraction, arithmetic and grouping in one process where a pipeline would need three or four. It also handles repeated whitespace separators correctly, which `cut` cannot. The decisive case is aggregation: `awk \'{sum[$1] += $2} END {for (k in sum) print k, sum[k]}\'` is a group-by that has no clean equivalent in grep/cut, and it reads the input only once.',
      },
      {
        question: 'What is process substitution and when is it necessary?',
        difficulty: 'Hard',
        answer: '`<(cmd)` runs a command and exposes its output as a filename (a `/dev/fd` entry), so tools that require file arguments can consume a pipeline. `diff <(sort a) <(sort b)` is the canonical example — `diff` cannot read two stdins. It is also the fix for the subshell problem: `while read ...; done < <(cmd)` keeps the loop in the current shell so variable assignments survive, whereas `cmd | while read` does not. The output form `>(cmd)` exists too, used with `tee` to fan out to several consumers.',
      },
      {
        question: 'How do you check the exit status of each stage in a pipeline?',
        difficulty: 'Medium',
        answer: '`$?` reports only the last command in the pipeline, so `false | true` gives 0 and the failure is invisible. Bash exposes `${PIPESTATUS[@]}`, an array of every stage\'s status, which you must capture immediately since the next command overwrites it. Alternatively `set -o pipefail` makes the pipeline as a whole return the rightmost non-zero status, which is usually what you want in a script and is why it is part of the strict-mode trio.',
      },
      {
        question: 'What does `trap` do and what is the most useful thing to trap?',
        difficulty: 'Medium',
        answer: '`trap` registers a command to run when the shell receives a signal. The most useful is `trap cleanup EXIT`, which runs on every exit path — normal completion, an error under `set -e`, or an explicit `exit` — making it the reliable place to delete temp directories and release locks. Also common are `trap ... INT TERM` to handle interruption gracefully and `trap ... ERR` to log the failing line via `$LINENO` and `$BASH_COMMAND`. SIGKILL and SIGSTOP cannot be trapped.',
      },
      {
        question: 'How do you find which process is listening on a port?',
        difficulty: 'Easy',
        answer: '`ss -tulpn | grep :8080` is the modern approach — `ss` replaced `netstat` and the flags mean TCP, UDP, listening, process, numeric. `lsof -i :8080` gives the same answer with more detail about the owning process and is available on macOS. `fuser -k 8080/tcp` goes further and kills whatever holds it. You generally need root to see the process name for sockets owned by other users.',
      },
      {
        question: 'What is the difference between `$(cmd)` and back-quoted command substitution?',
        difficulty: 'Easy',
        answer: 'They do the same thing, but `$( )` nests cleanly — `$(dirname "$(readlink -f "$0")")` is readable, whereas the back-quote form requires escaping each inner level. Quoting rules inside `$( )` are also the normal ones, while back-quotes treat backslashes specially. `$( )` is POSIX and universally supported, so there is no reason to use back-quotes in new code. Both strip all trailing newlines from the output, which occasionally matters.',
      },
      {
        question: 'Why does `#!/bin/sh` sometimes break a working Bash script?',
        difficulty: 'Medium',
        answer: 'On Debian and Ubuntu, `/bin/sh` is a symlink to `dash`, a minimal POSIX shell, not to bash. Arrays, `[[ ]]`, `${var^^}`, `local` semantics, process substitution, `source` as an alias for `.`, and C-style `for (( ))` loops either do not exist or behave differently. The script may run for a while and then fail on the first Bash-only construct, or worse, silently misbehave. Use `#!/usr/bin/env bash` whenever you rely on Bash features, and run `shellcheck` with the correct shell directive to catch violations statically.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // Git
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'git-quickref',
    title: 'Git',
    icon: 'gitBranch',
    color: '#0ea5e9',
    questions: gitCards.length,
    description: `Interview-grade Git cheatsheet — ${gitCards.length} cards built around the three-tree model, with a recovery playbook that labels exactly which mistakes the reflog can undo and which are gone for good.`,

    introduction: `## Overview

Most Git confusion dissolves once you hold two facts in your head.

**First: a commit is a full snapshot, not a diff.** Diffs are computed on demand by comparing two trees. That is why branching is instant and why history rewriting produces genuinely new commits rather than editing old ones.

**Second: almost every command moves something between three trees.**

| Tree | What it is | Moved by |
|---|---|---|
| **Working tree** | your actual files on disk | \`git restore\`, \`git checkout\` |
| **Index** (staging) | what the next commit will contain | \`git add\`, \`git restore --staged\` |
| **HEAD** | the last commit on the current branch | \`git commit\`, \`git reset\` |

And the diff commands simply pick two of them:

| Command | Compares |
|---|---|
| \`git diff\` | working tree ↔ index |
| \`git diff --staged\` | index ↔ HEAD |
| \`git diff HEAD\` | working tree ↔ HEAD |

A branch, meanwhile, is a 41-byte file containing a commit SHA. That is the whole implementation.

### What is recoverable and what is not

This is the distinction worth memorising, because it decides how careful you need to be:

| Action | Recoverable? | How |
|---|---|---|
| \`git reset --hard\` (committed work) | **yes** | \`git reflog\` → \`git reset --hard HEAD@{n}\` |
| \`git reset --hard\` (uncommitted work) | **no** | gone — nothing ever recorded it |
| \`git restore file\` | **no** | gone |
| deleted branch | **yes** | reflog holds the tip for ~90 days |
| bad rebase / merge | **yes** | \`git reset --hard ORIG_HEAD\` |
| \`git clean -fdx\` | **no** | untracked files were never in Git |
| force-push over a colleague | **their** reflog only | yours cannot help them |

The reflog is the safety net for anything that was ever committed, and it is **local only** — it is never cloned, fetched or pushed.

### What this covers

The object model and revision syntax; the config that removes daily friction; staging with \`add -p\`; branches, merge and rebase with an explicit decision rule; interactive rebase; the three undo commands (\`reset\` / \`revert\` / \`restore\`) and when each is correct; the reflog; remotes and safe force-pushing; cherry-pick, tags and releases; stash; bisect and history archaeology; \`.gitignore\` and purging secrets; hooks, submodules and worktrees; plus twenty gotchas.

### The rules that matter most

1. **Never rebase or amend commits that others have pulled.** Rewriting shared history forces everyone into a painful recovery.
2. **Use \`--force-with-lease\`, never \`--force\`.** It aborts if the remote moved since your last fetch, which is exactly the case where forcing would destroy someone's work.
3. **If you commit a secret, rotate it.** Removing it from history does not un-leak it — forks, CI logs and caches may still hold it.`,

    whenToUse: [
      'You made a mistake and need to know whether it is recoverable and which command undoes it without making things worse',
      'Deciding between merge and rebase for a specific branch, and needing to justify the choice',
      'Cleaning up a messy branch into reviewable commits before opening a pull request',
      'Hunting the commit that introduced a bug, or working out why a line of code exists',
      'A push was rejected, or you need to force-push safely after rewriting history',
      'Resolving a conflict and needing to know which side "ours" and "theirs" refer to — they swap between merge and rebase',
    ],

    keyPatterns: [
      'Three trees: working tree → index → HEAD; every command moves between them',
      '`git add -p` to stage hunk by hunk, which forces you to read your own diff',
      '`revert` for pushed history, `reset` for local, `restore` for a single file',
      '`git reflog` first whenever something looks lost — it almost always is not',
      '`git push --force-with-lease` as the only acceptable force',
      '`git rebase -i --autosquash` with `--fixup` commits to clean a branch before review',
      '`git bisect run <script>` to find a regression in log2(n) automated steps',
      '`git switch` / `git restore` instead of the overloaded `git checkout`',
    ],

    timeComplexity: 'Branch create/switch O(1) · log and diff proportional to the commits and files touched · bisect O(log n) commits · clone O(history size), reducible with `--depth 1` or `--filter=blob:none`',
    spaceComplexity: 'Objects are compressed and deduplicated by content hash; a large binary is stored in full for every version, which is why history purges and LFS exist',

    approach: [
      'Identify which of the three trees your change currently lives in — that determines the command you need.',
      'Ask whether the commits involved have been pushed. Pushed means `revert` and no rewriting; local means `reset` and `rebase` are safe.',
      'Before any destructive operation, make sure the work is committed or stashed — the reflog protects commits, not uncommitted edits.',
      'Use `git status` and `git diff --staged` to confirm exactly what is about to be committed, rather than assuming.',
      'Clean the branch with an interactive rebase before review: squash fixups, reword unclear messages, drop dead ends.',
      'When something goes wrong, run `git reflog` before anything else, find the state from before the mistake, and branch from it rather than resetting blindly.',
    ],

    codeExamples: gitCards,

    commonMistakes: [
      '`git reset --hard` with uncommitted work in the tree. Committed history is recoverable from the reflog; uncommitted changes are not recorded anywhere and are simply gone.',
      '`git push --force` instead of `--force-with-lease`, which silently overwrites commits a colleague pushed since your last fetch.',
      'Rebasing or amending commits that have already been pushed and pulled by others, which rewrites SHAs and breaks every other clone.',
      'Assuming `.gitignore` applies to files already tracked. It only affects untracked files — you must `git rm --cached` first.',
      '`git stash` without `-u`, leaving untracked files behind and creating the impression the stash captured everything.',
      'Working in a detached HEAD and committing there — those commits belong to no branch and are eventually garbage-collected.',
      'Deleting a secret in a later commit and considering it handled. It remains in history permanently, and the credential must be rotated regardless.',
      '`git commit -a`, which stages tracked modifications but silently skips brand-new untracked files.',
      'Forgetting that tags are not pushed by `git push`, so a release tag never reaches the remote.',
      'Running `git clean -fdx` without `-n` first, which deletes ignored files including `.env` and `node_modules`.',
      'Confusing `--ours` and `--theirs` during a rebase, where they are inverted relative to a merge because your commits are being replayed onto their branch.',
      'Letting `git pull` create merge commits by default instead of configuring `pull.rebase` or `pull.ff-only`.',
      'Using `git checkout` for both switching branches and discarding files, then discarding a file by accident. `git switch` and `git restore` cannot be confused.',
      'Cloning without `--recurse-submodules` and then debugging an empty directory and a confusing build failure.',
      'Not running `git fetch --prune`, so remote-tracking branches for long-deleted remote branches accumulate forever.',
    ],

    tips: [
      'Set `pull.rebase true`, `push.autoSetupRemote true`, `fetch.prune true` and `rebase.autoStash true` once — they remove most daily friction permanently.',
      'Enable `rerere` (`git config --global rerere.enabled true`). It records how you resolved a conflict and replays it automatically, which is invaluable on long-lived branches.',
      'Set `merge.conflictstyle zdiff3` so conflict markers also show the common ancestor — knowing what both sides started from usually makes the resolution obvious.',
      '`git add -p` is the highest-value habit here: it makes you read your own diff and naturally produces small, reviewable commits.',
      '`git worktree add` gives you a second checkout of the same repo, so you can review a PR without stashing your half-finished feature.',
      'Put bulk-reformat commits in `.git-blame-ignore-revs` and set `blame.ignoreRevsFile` so `git blame` skips past them to the real author.',
      '`git commit --fixup=<sha>` plus `git rebase -i --autosquash` is the clean way to amend an older commit in a branch.',
      'Learn `git log -S\'string\'` (the pickaxe). "When was this function removed?" is a question it answers in one command.',
    ],

    interviewTips: [
      'When asked "merge or rebase?", give the rule rather than a preference: rebase local unpushed work for a linear history, merge to integrate into shared branches, and never rebase what others have pulled.',
      'Explain `reset` by naming which trees each mode touches — soft moves HEAD only, mixed also resets the index, hard also resets the working tree. That framing shows the model rather than memorised flags.',
      'Volunteer `--force-with-lease` when force-pushing comes up. Knowing why plain `--force` is dangerous is a senior signal.',
      'For "how would you find which commit broke this?", answer `git bisect run` with a test script and mention it is O(log n) — around 10 tests for 1000 commits.',
      'If asked about a leaked secret, lead with rotating the credential, then history rewriting. Candidates who only mention `filter-repo` miss the actual security issue.',
      'Describe the reflog as the reason most Git mistakes are recoverable, and be precise that it covers committed work only and is local to your machine.',
      'Mention your branching and commit-message conventions unprompted — Conventional Commits, small reviewable commits, squash-merge policy. It signals you have worked on a team, not just alone.',
    ],

    theoryQuestions: [
      {
        question: 'What are the three trees in Git and how do they relate?',
        difficulty: 'Easy',
        answer: 'The working tree is your actual files on disk. The index (or staging area) is a snapshot of what the next commit will contain. HEAD points to the last commit on the current branch. `git add` copies from working tree to index, `git commit` turns the index into a new commit and moves HEAD, and `git restore` copies back the other way. The diff commands simply choose two of these to compare: `git diff` is working tree versus index, `git diff --staged` is index versus HEAD, and `git diff HEAD` is working tree versus HEAD.',
      },
      {
        question: 'What is the difference between `git reset --soft`, `--mixed` and `--hard`?',
        difficulty: 'Medium',
        answer: 'All three move the branch pointer; they differ in how far the change propagates. `--soft` moves HEAD only, leaving the index and working tree untouched, so the undone commit\'s changes remain staged. `--mixed` (the default) also resets the index, so the changes remain in your files but unstaged. `--hard` additionally resets the working tree, discarding the changes entirely — this is the only destructive one, and uncommitted work lost this way is unrecoverable.',
      },
      {
        question: 'When should you use `git revert` instead of `git reset`?',
        difficulty: 'Easy',
        answer: 'Use `revert` whenever the commit has been pushed and others may have it. `revert` creates a *new* commit that applies the inverse change, so history is append-only and nobody else\'s clone breaks. `reset` moves the branch pointer backwards, rewriting history — fine for local commits, but on a shared branch it forces a force-push and leaves everyone else diverged. The rule of thumb: reset for private history, revert for public.',
      },
      {
        question: 'What is the difference between merge and rebase?',
        difficulty: 'Medium',
        answer: 'Merge creates a new commit with two parents, preserving the actual shape of what happened and leaving all existing commits untouched. Rebase replays your commits one at a time onto a new base, producing new commits with new SHAs and a linear history. Merge is non-destructive and safe on shared branches; rebase gives cleaner history but rewrites it. The common policy is to rebase your local feature branch to keep it current and tidy, then merge or squash-merge it into main via a pull request.',
      },
      {
        question: 'What is the golden rule of rebasing, and why does it exist?',
        difficulty: 'Medium',
        answer: 'Never rebase commits that exist outside your own machine. Rebase produces new commits with new SHAs, so if a colleague already has the originals, their history and yours diverge. Their next pull creates a confusing merge with duplicated commits, and resolving it requires a manual reset. The only safe force-push after a rebase is `--force-with-lease`, and even that only protects against the remote having moved, not against a colleague who already pulled.',
      },
      {
        question: 'What is the reflog and what can it recover?',
        difficulty: 'Medium',
        answer: 'The reflog records every position HEAD (and each branch) has held, including states no branch points to any more. It recovers anything that was ever committed: a `reset --hard` you regret, a deleted branch, a botched rebase (via `ORIG_HEAD`), even a dropped stash. You find the pre-mistake entry with `git reflog` and then `git reset --hard HEAD@{n}` or branch from that SHA. Two limits matter: it only covers committed work, so uncommitted changes are still gone; and it is purely local, never cloned or pushed, so it cannot rescue a colleague from your force-push. Entries expire after roughly 90 days.',
      },
      {
        question: 'What actually is a branch in Git?',
        difficulty: 'Easy',
        answer: 'A file under `.git/refs/heads/` containing a single commit SHA — about 41 bytes. Creating a branch writes that file; switching branches updates `.git/HEAD` to point at it and updates your working tree. Committing advances the SHA in the file. This is why branching is O(1) regardless of repository size, and why deleting a branch does not delete any commits — it only removes the pointer, leaving the commits reachable through the reflog until they are garbage-collected.',
      },
      {
        question: 'What is a fast-forward merge?',
        difficulty: 'Easy',
        answer: 'When the target branch has no commits that the source branch lacks, the two are not actually divergent — the source is simply ahead. Git can then just slide the target\'s pointer forward to the source\'s tip, with no merge commit at all. `--no-ff` forces a merge commit anyway, which preserves the visual grouping of a feature branch in the history graph. `--ff-only` refuses to merge unless it can fast-forward, which is a useful safety setting for pulls and for CI.',
      },
      {
        question: 'During a conflict, what do "ours" and "theirs" refer to?',
        difficulty: 'Hard',
        answer: 'In a merge, "ours" is the branch you are currently on and "theirs" is the branch being merged in — the intuitive reading. In a *rebase* they are swapped: rebase checks out the upstream branch and replays your commits onto it, so "ours" is the upstream you are rebasing onto and "theirs" is your own commit being applied. This inversion is a frequent source of wrong resolutions. Setting `merge.conflictstyle zdiff3` helps regardless, because it also shows the common ancestor so you can see what each side actually changed.',
      },
      {
        question: 'How does `git bisect` work and why is it efficient?',
        difficulty: 'Medium',
        answer: 'You mark a known-good commit and a known-bad one, and Git checks out the midpoint. You test and report good or bad, halving the remaining range each time — a binary search, so it takes about log2(n) steps: roughly 10 tests across 1000 commits. `git bisect run <script>` automates it entirely, using the script\'s exit status (0 = good, non-zero = bad, 125 = untestable/skip) so the whole search runs unattended. `git bisect reset` returns you to where you started.',
      },
      {
        question: 'What does `git cherry-pick` do and what is the catch?',
        difficulty: 'Medium',
        answer: 'It applies the change introduced by a specific commit onto your current branch, creating a *new* commit with a new SHA. The catch is that the original and the copy are now unrelated objects, so a later merge between the two branches does not recognise them as the same change and may conflict or produce a confusing duplicate. Use it deliberately — the standard case is backporting a hotfix to a release branch — and `-x` appends a "cherry picked from" line so the relationship is at least documented.',
      },
      {
        question: 'What is the difference between `git fetch` and `git pull`?',
        difficulty: 'Easy',
        answer: '`fetch` downloads objects and updates your remote-tracking refs (`origin/main`) but changes nothing about your working branch — it is always safe. `pull` is `fetch` followed immediately by a merge or rebase into your current branch, which is where the surprises come from: an unexpected merge commit or a conflict you were not ready for. Fetching first and inspecting with `git log HEAD..origin/main` before integrating is the more controlled workflow.',
      },
      {
        question: 'Why is `--force-with-lease` safer than `--force`?',
        difficulty: 'Medium',
        answer: '`--force` unconditionally replaces the remote branch with yours, silently discarding any commits pushed since you last looked. `--force-with-lease` first checks that the remote is still at the commit your remote-tracking ref recorded; if someone else pushed in the meantime, it aborts instead of overwriting. It converts "silently destroyed a colleague\'s work" into "push rejected, go fetch." It is not perfect — running `git fetch` right before it updates the lease and defeats the protection — but it is strictly better and should be the default.',
      },
      {
        question: 'What does interactive rebase let you do?',
        difficulty: 'Medium',
        answer: '`git rebase -i` opens an editable list of commits (oldest first) where each line can be `pick` (keep), `reword` (change the message), `edit` (stop to amend), `squash` (fold into the previous commit, combining messages), `fixup` (fold in, discarding this message), `drop` (delete), or `exec` (run a shell command). Reordering lines reorders commits. It is the standard way to turn a messy working branch into a reviewable series before opening a pull request. Combined with `git commit --fixup=<sha>` and `--autosquash`, Git pre-arranges the fixups for you.',
      },
      {
        question: 'How do you completely remove a secret from a repository?',
        difficulty: 'Hard',
        answer: 'First rotate the credential — that is the actual remediation, because the secret may already exist in forks, clones, CI logs and caches that you cannot reach. Then purge it from history with `git filter-repo --path secrets.env --invert-paths` (`filter-branch` is deprecated and slow). This rewrites every commit, so all collaborators must re-clone, and any open pull requests are invalidated. Follow with `git gc --prune=now` and force-push. Deleting the file in a new commit does nothing: the blob remains in every earlier commit forever.',
      },
      {
        question: 'What is the difference between `git stash` and committing to a WIP branch?',
        difficulty: 'Easy',
        answer: 'A stash is a local, unnamed stack entry — quick, but easy to forget, impossible to push, and by default it excludes untracked files, which is how people lose work they thought was saved. A WIP branch is a real commit: it is named, survives everything, can be pushed for backup or shared with a colleague, and is trivially recoverable. Use a stash for minutes-long interruptions, a WIP branch for anything longer, and `git worktree` when you actually need both states checked out at once.',
      },
      {
        question: 'Why do you sometimes get "Your branch and origin/main have diverged"?',
        difficulty: 'Medium',
        answer: 'Both your local branch and the remote have commits the other lacks, so neither can fast-forward. This happens normally when a colleague pushes while you were committing, and abnormally when someone rewrote the remote history with a force-push. The fix in the normal case is `git pull --rebase` to replay your commits on top of theirs, then push. Never resolve it by force-pushing without understanding which case you are in — in the second case, you may be about to discard someone else\'s work.',
      },
      {
        question: 'What are Git hooks and what is their main limitation?',
        difficulty: 'Medium',
        answer: 'Hooks are executable scripts in `.git/hooks/` that Git runs at defined points — `pre-commit` for linting, `commit-msg` for message validation, `pre-push` as a final gate — where a non-zero exit aborts the operation. The limitation is that `.git/hooks/` is not cloned, so hooks cannot be relied on for enforcement: a fresh clone has none, and `--no-verify` bypasses them anyway. Share them via `core.hooksPath` pointing at a tracked directory, or a tool like pre-commit or husky, and enforce the real rules server-side in CI.',
      },
      {
        question: 'What does `git log -S\'string\'` do, and how is it different from `--grep`?',
        difficulty: 'Hard',
        answer: '`-S` is the "pickaxe": it finds commits where the number of occurrences of that string in the diff changed — that is, commits that added or removed it. That makes it the right tool for "when was this function introduced or deleted?" `--grep` instead searches commit *messages*, which only helps if someone described the change usefully. `-G` is the regex counterpart of `-S`, matching commits whose diff text matches a pattern. Together with `git log --diff-filter=D -- path` (which finds the commit that deleted a file) they cover most history archaeology.',
      },
    ],
  },
];
