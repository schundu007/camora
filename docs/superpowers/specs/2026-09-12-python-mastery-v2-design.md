# Python Mastery v2 — Design

Date: 2026-09-12
Route: `/capra/learn/python`
Status: approved, not yet implemented

## Problem

Three complaints, three different causes.

1. **"Very basic, missing a lot of basic information."** The curriculum has 22
   topics. Measured against the 68 questions on the GeeksforGeeks Python
   interview list and the GeeksforGeeks Python tutorial syllabus, 23 whole
   concepts have zero coverage — tuples, slicing, iterators, MRO, dunder
   methods, the `collections` module, memory management, testing, and regular
   expressions among them. Several topics that do exist are thin: no
   docstrings, no mutable-default-argument trap, no custom exception classes,
   no dict comprehension, no `append` vs `extend`, no loop `else`.

2. **"Hard to read and understand."** Every topic opens with one dense
   unbroken paragraph, caps at two examples, and has no question-and-answer
   section — which is the format people actually revise from. This is a
   schema and renderer limitation, not a wording problem.

3. **Duplication.** `/capra/learn/programiz` is a second Python learning
   surface covering 37 of the same concepts, backed by 312K of pre-generated
   AI markdown. Two pages teach Python; neither is complete.

## Goal

One Python surface. Complete against both GeeksforGeeks sources and Programiz.
Structured so a reader can skim, study, or revise from the same page.

## Non-goals

- No progress tracking, quizzes, or cross-topic linking. That is a page
  redesign and was explicitly deferred.
- No data-science or web-framework content (NumPy, Pandas, Flask, Django).
  The GeeksforGeeks tutorial covers those; they are separate learning tracks,
  not Python-language mastery.
- `LearnTopicPage.tsx` keeps working. CodeSignal depends on it.

## Current state

`apps/camora/src/data/python-curriculum.ts` — 1,904 lines, one exported
`PYTHON_TOPICS: Topic[]` of 22 topics (12 `beginner`, 10 `advanced`).

Consumed by exactly one file, `apps/camora/src/pages/capra/PythonLearnPage.tsx`,
which renders: intro paragraph, reference code, line-by-line walkthrough,
tabbed examples, edge cases, gotcha + tip. Sidebar groups by `track`.

Blast radius is small. Nothing else imports the data.

The Programiz surface is three pieces: `data/capra/programizPaths.js` (37
curated external links), `pages/capra/ProgramizLearnPage.tsx` (card grid), and
`public/learn-content/programiz/*.json` (37 pre-generated markdown files, one
per slug — verified exact 1:1 match with the slug list). Clicking a card opens
`LearnTopicPage`, which serves the static file if present and otherwise streams
AI-generated content from the backend.

## Design

### 1. Schema

`Topic` gains seven fields. Only `chapter` and `summary` are required; the rest
are optional so the data stays valid throughout a phased migration.

```ts
type ChapterId =
  | 'getting-started' | 'functions' | 'data-structures'
  | 'oop' | 'errors-files' | 'stdlib' | 'advanced';

interface Section     { heading: string; body: string; code?: string }
interface KeyTerm     { term: string; meaning: string }
interface CheatRow    { call: string; does: string; returns: string }
interface InterviewQ  { q: string; a: string }
interface Reference   { label: string; url: string }

interface Topic {
  id: string;
  title: string;
  chapter: ChapterId;                  // NEW — drives sidebar grouping
  track: 'beginner' | 'advanced';      // kept — renders as the header chip
  estimatedMins: number;
  summary: string;                     // NEW — one line: what it is, why it is asked
  intro: string;
  sections?: Section[];                // NEW — replaces the wall-of-text intro
  keyTerms?: KeyTerm[];                // NEW
  cleanCode: string;
  walkthrough: WalkthroughStep[];
  examples: Example[];
  cheatSheet?: CheatRow[];             // NEW
  interviewQs?: InterviewQ[];          // NEW
  references?: Reference[];            // NEW — carries Programiz links forward
  edgeCases: string[];
  gotcha: string;
  tip: string;
}
```

`CHAPTERS` is an ordered array of `{ id, label, accent }` so the sidebar and the
hero both read chapter order from one place.

### 2. File layout

50 topics in one file is roughly 9,000 lines. Split by chapter:

```
apps/camora/src/data/python/
  types.ts              interfaces, ChapterId, CHAPTERS
  01-getting-started.ts
  02-functions.ts
  03-data-structures.ts
  04-oop.ts
  05-errors-files.ts
  06-stdlib.ts
  07-advanced.ts
  index.ts              PYTHON_TOPICS (concatenated in chapter order), re-exports
```

`python-curriculum.ts` is deleted, not left as a re-export shim. One import in
`PythonLearnPage.tsx` changes.

### 3. Topic map — 22 existing, 50 total

Beginner/Advanced with 25 items each is unscannable. The sidebar regroups by
chapter; `track` survives as the chip on the topic header.

#### Chapter 1 — Getting Started (8)

| id | status | must cover |
|---|---|---|
| `how-python-runs` | new | interpreted vs compiled, bytecode and `.pyc`, CPython, dynamic typing, why indentation is syntax |
| `variables` | deepen | built-in types, mutable vs immutable, naming, multiple assignment |
| `type-conversion` | new | implicit vs explicit, constructor functions, lossy conversions, truthiness of converted values |
| `input-output` | new | `input()` always returns str, `print` `sep`/`end`/`file`/`flush`, f-string format spec |
| `keywords` | new | the 35 reserved words grouped by purpose, identifier rules, PEP 8 naming |
| `operators` | deepen | `/` vs `//`, `%` with negatives, precedence, chained comparison, identity vs equality, membership |
| `control-flow` | deepen | ternary, truthiness table, nesting, guard clauses |
| `loops` | deepen | `for` vs `while`, `break`/`continue`/`pass`, loop `else`, `range`, `enumerate`, `zip`, `xrange` history |

#### Chapter 2 — Functions (7)

| id | status | must cover |
|---|---|---|
| `functions` | deepen | docstrings, return semantics, default arguments, the mutable default trap, keyword-only and positional-only |
| `args-kwargs` | new | `*args`, `**kwargs`, unpacking at call sites, argument order, pass-by-object-reference |
| `scope-namespaces` | new | LEGB, `global`, `nonlocal`, namespace lifetimes, `globals()`/`locals()` |
| `recursion` | new | base case, call stack, recursion limit, memoisation, when iteration is better |
| `lambda-hof` | new | `lambda`, first-class functions, `map`, `filter`, `reduce`, comprehension as the Pythonic alternative |
| `closures` | deepen | cell variables, `__closure__`, late-binding loop trap |
| `decorators` | deepen | `functools.wraps`, decorators with arguments, stacking, class decorators |

#### Chapter 3 — Data Structures (11)

| id | status | must cover |
|---|---|---|
| `lists` | deepen | `append` vs `extend` vs `insert`, `remove` vs `pop` vs `del`, concatenation, list vs `array` module |
| `tuples` | new | immutability, single-element trailing comma, packing and unpacking, hashability, why there is no tuple comprehension, `namedtuple` |
| `strings` | deepen | full method table, immutability, f-strings, `str` vs `bytes` and encoding, `join` over `+` |
| `slicing` | new | `[start:stop:step]`, negative indices and steps, slice assignment, copying via `[:]` |
| `dicts` | split + deepen | `get`/`setdefault`/`update`, views, insertion ordering, dict comprehension, key hashability |
| `sets` | split + deepen | set algebra, `frozenset`, deduplication, set vs dict |
| `comprehensions` | deepen | list/dict/set, nested, conditionals, generator expressions, when not to use |
| `sorting` | new | `sort` vs `sorted`, `key=`, `reverse`, stability, Timsort, `functools.cmp_to_key` |
| `copying` | new | assignment vs shallow vs deep, `copy` module, nested-structure aliasing |
| `matrices` | new | nested lists, indexing, transpose, row/column iteration, where NumPy takes over |
| `collections-module` | new | `Counter`, `defaultdict`, `deque`, `OrderedDict`, `namedtuple`, `heapq` |

#### Chapter 4 — Object-Oriented Python (8)

| id | status | must cover |
|---|---|---|
| `oop-basics` | deepen | `__init__`, `self`, instance vs class attributes, the shared-mutable-class-attribute trap |
| `inheritance-mro` | new | single and multiple inheritance, `super()`, C3 linearisation, `__mro__`, diamond problem |
| `oop-pillars` | new | polymorphism, encapsulation, `@property`, name mangling and access conventions, abstraction with `abc` |
| `methods-types` | new | instance vs `@classmethod` vs `@staticmethod`, `__new__` vs `__init__` |
| `dunder-methods` | new | `__str__`/`__repr__`, `__len__`, `__eq__`/`__hash__`, `__getitem__`, operator overloading, `__call__` |
| `dataclasses` | deepen | `field`, `frozen`, `order`, `__post_init__`, comparison with `namedtuple` and `TypedDict` |
| `iterators` | new | iterable vs iterator, `__iter__`/`__next__`, `StopIteration`, exhaustion, `iter()` |
| `generators` | deepen | `yield`, laziness, `yield from`, `send`, pipelines, memory profile vs a list |

#### Chapter 5 — Errors, Files & Modules (6)

| id | status | must cover |
|---|---|---|
| `errors` | deepen | `try`/`except`/`else`/`finally`, exception hierarchy, custom exception classes, `raise from`, bare-except anti-pattern |
| `file-io` | deepen | modes table, text vs binary, encoding, line iteration, `csv` and `json` |
| `os-pathlib` | new | `pathlib.Path`, `os` vs `os.path` vs `pathlib`, directory walking, create/move/delete, `shutil` |
| `serialization` | new | `json` vs `pickle`, custom encoders, `pickle` security warning, when each is right |
| `context-managers` | deepen | `with`, `__enter__`/`__exit__`, `contextlib.contextmanager`, `ExitStack`, suppressing exceptions |
| `modules` | deepen | import mechanics, packages and `__init__.py`, `if __name__ == "__main__"`, `pip`, virtual environments |

#### Chapter 6 — Standard Library & Tooling (4)

| id | status | must cover |
|---|---|---|
| `regex` | new | `re` core functions, groups, common patterns, raw strings, greedy vs lazy, `compile` |
| `itertools-functools` | new | `chain`, `groupby`, `product`, `combinations`, `islice`, `lru_cache`, `partial`, `reduce` |
| `testing` | new | `unittest` vs `pytest`, fixtures, parametrisation, mocking, `pdb`/`breakpoint()`, logging over print |
| `datetime` | new | `datetime`/`date`/`timedelta`, `strftime`/`strptime`, naive vs aware, UTC discipline |

#### Chapter 7 — Runtime & Advanced (6)

| id | status | must cover |
|---|---|---|
| `memory-model` | new | reference counting, generational GC, `id()`, `is` vs `==`, small-int and string interning, reference cycles |
| `gil-concurrency` | deepen | what the GIL is, threads vs processes, I/O-bound vs CPU-bound, `concurrent.futures` |
| `async` | deepen | event loop, coroutines, `gather`, `TaskGroup`, blocking-call trap |
| `type-hints` | deepen | annotations, `Optional`, generics, `Protocol`, `TypedDict`, `mypy`, runtime non-enforcement |
| `modern-python` | new | walrus `:=`, `match` statement, f-string `=`, exception groups and `except*` |
| `performance` | deepen | `timeit`, `cProfile`, big-O of built-in operations, comprehension vs loop, `__slots__` |

### 4. Coverage guarantees

Every one of the 68 GeeksforGeeks interview questions maps to exactly one topic
(the mapping is reproduced in the implementation plan as a checklist). Every one
of the 37 Programiz slugs maps to exactly one topic. No concept appears as the
primary subject of two topics.

Two Programiz topics have no planned Camora equivalent and become new topics:
`pz-type-conversion` and `pz-matrix`. One, `pz-property`, folds into
`oop-pillars` because `@property` is the encapsulation mechanism rather than a
subject of its own.

### 5. Renderer

`PythonLearnPage.tsx` gains five cards, each using the card pattern already on
the page — `rounded-2xl`, `var(--bg-surface)`, `1px solid var(--border)`, and an
accent strip header in `var(--cam-primary)` uppercase mono:

- **Concept** — `sections[]` as heading + body, with an optional code block.
  Sits between the intro card and Reference Code.
- **Key Terms** — `keyTerms[]` as a two-column table.
- **Cheat Sheet** — `cheatSheet[]` as a three-column table, after Examples.
- **Interview Questions** — `interviewQs[]` as collapsible rows, question
  visible, answer revealed on click. Placed after Edge Cases.
- **Go Deeper** — `references[]` as external links, last card.

Each renders only when its field is present.

`summary` renders as a single line directly under the topic title in the header
card. The sidebar replaces its two `track` groups with seven collapsible chapter
groups driven by `CHAPTERS`, the active topic's chapter expanded by default.
Chapters with no topics are not rendered.
Search extends to match `keyTerms` and `interviewQs` alongside title and intro.
The hero subtitle reports topic count, chapter count, and total hours.

Prose fields render as plain text nodes, so content must not contain markdown
syntax or emoji — they would display literally. This is why the 37 pre-generated
Programiz files are rewritten rather than copied; they are full of `**bold**`.

### 6. Programiz retirement

Deleted:

- `apps/camora/src/pages/capra/ProgramizLearnPage.tsx`
- `apps/camora/src/data/capra/programizPaths.js`
- `apps/camora/public/learn-content/programiz/` — 37 files, 312K

Changed:

- `App.tsx` — the `/capra/learn/programiz` route becomes a redirect to
  `/capra/learn/python`, following the legacy-alias pattern already in the file.
  Its title-map entry is removed along with the lazy import.
- `components/layout/Sidebar.tsx` — the Programiz nav entry is removed.
- `pages/capra/LearnTopicPage.tsx` — the `programiz` source default and
  back-link branch are dropped; it defaults to `codesignal`, its only remaining
  consumer.

Each Programiz URL is carried forward as a `references` entry on the topic that
absorbed it, so nothing becomes unreachable.

**Accepted consequence:** a Programiz card with no static file currently falls
back to on-demand AI generation via `POST /api/v1/learn/topic/:slug`. Retiring
the page removes that path for Python topics. Hand-written content replaces it.
The backend route is untouched and still serves CodeSignal.

### 7. Testing

`apps/camora/src/data/python/python-curriculum.test.ts`, run under the existing
vitest setup:

- topic ids are unique
- every topic has non-empty `id`, `title`, `summary`, `intro`, `cleanCode`,
  `gotcha`, `tip`, at least one `walkthrough` step, at least one `example`, at
  least one `edgeCase`
- every `chapter` is a declared `ChapterId`
- no declared chapter is empty. Chapter 6 (Standard Library) consists entirely
  of new topics, so it is empty until Phase 3 — this assertion is added in
  Phase 3, not Phase 1. Until then the sidebar renders only non-empty chapters,
  which it does permanently as a robustness measure
- `PYTHON_TOPICS` is ordered by chapter, matching `CHAPTERS` order
- no prose field contains markdown syntax (`**`, `__`, backtick-fence) or emoji
- every one of the 37 retired Programiz slugs is claimed by exactly one topic,
  asserted against a slug-to-topic map kept in the test file
- every topic with `references` has well-formed absolute URLs

`npx vite build` must pass before any push. This is a type-level refactor of a
shared interface, so a green tsc is the real gate.

### 8. Phases

Each phase ends with a build, then approval, then a push to `main`.

**Phase 1 — foundation and pilot.** `types.ts` with the new interfaces and
`CHAPTERS`; the seven chapter files created with existing topics moved across
unchanged except for an added `chapter` and `summary` (`dicts-sets` moves as a
single topic and is split into `dicts` and `sets` in Phase 2); `index.ts`;
`python-curriculum.ts` deleted and the import in `PythonLearnPage.tsx` updated;
all five new renderer cards; the chapter sidebar; the data test. Two topics
written to the full new schema as pilots — `variables` (migrated) and `tuples`
(new). Everything else renders with the optional fields absent.

Exit: the page shows 23 topics in 7 chapters, the two pilots show every new
card, and the layout is confirmed before 48 more topics are written against it.

**Phase 2 — Chapters 1 to 3.** All 26 topics in Getting Started, Functions and
Data Structures written or deepened to the full schema.

**Phase 3 — Chapters 4 to 7 and retirement.** All 24 remaining topics, then the
Programiz deletion, redirect, sidebar entry, and `LearnTopicPage` cleanup. The
slug-coverage test is what makes retirement safe, so it lands with this phase.

## Risks

- **Scale.** 50 topics at full schema depth is the bulk of the work and the
  main source of drift. The per-topic "must cover" table above is the contract;
  the implementation plan turns it into a checklist.
- **Interface change mid-flight.** New fields are optional, so a partially
  migrated dataset stays valid and the page keeps rendering. Only `chapter` and
  `summary` are required, and both are added to all 22 existing topics in
  Phase 1.
- **Rendering regressions.** The page is one component with no tests. The data
  test covers the data; the build covers the types; the pilot phase covers the
  layout visually before the content volume lands.
