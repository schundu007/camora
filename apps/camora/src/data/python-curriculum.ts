export interface Example {
  label: string;
  code: string;
}

export interface Topic {
  id: string;
  title: string;
  track: 'beginner' | 'advanced';
  estimatedMins: number;
  summary: string;
  keyPoints: string[];
  examples: Example[];
  gotcha: string;
  tip: string;
  realWorldNote: string;
}

export const PYTHON_TOPICS: Topic[] = [
  // ── BEGINNER ─────────────────────────────────────────────────────────────
  {
    id: 'variables',
    title: 'Variables & Data Types',
    track: 'beginner',
    estimatedMins: 15,
    summary:
      'In Python, variables are created the moment you assign a value to them — no explicit declaration needed. Python is dynamically typed, meaning the same variable can hold different types at different times. The core built-in types are int (whole numbers of unlimited precision), float (64-bit decimal, accurate to ~15 places), str (immutable Unicode text), bool (True/False, a subclass of int), and NoneType (the singleton None). The built-in type() function returns an object\'s class, and isinstance() checks type membership including subclasses.',
    keyPoints: [
      'Python uses dynamic typing: variables are labels, not typed containers',
      'bool is a subclass of int — True == 1 and False == 0 in arithmetic',
      "None is a singleton; always compare with 'is None', not '== None'",
      'int has unlimited precision — no integer overflow in Python',
      'Type conversion functions int(), float(), str(), bool() coerce values but can raise ValueError on invalid input',
    ],
    examples: [
      {
        label: 'Core built-in types',
        code: `# Python infers type from the literal
x = 42            # int  (unlimited precision)
pi = 3.14159      # float (64-bit, ~15 sig. digits)
name = 'Alice'    # str  (immutable Unicode)
is_active = True  # bool (subclass of int)
empty = None      # NoneType singleton

print(type(x))           # <class 'int'>
print(type(pi))          # <class 'float'>
print(isinstance(x, int))  # True
print(isinstance(True, int))  # True — bool IS an int`,
      },
      {
        label: 'Type conversion and coercion',
        code: `# Explicit conversion
num = int('123')        # 123
f   = float('3.14')    # 3.14
s   = str(42)          # '42'
b   = bool(0)          # False  (0, '', [], None are falsy)

# int() truncates toward zero — it does NOT round
print(int(9.9))    # 9
print(int(-2.7))   # -2

# Mixing int and float widens to float automatically
print(1 + 2.0)     # 3.0

# Dangerous: silently wrong
result = True + True   # 2  (not an error!)`,
      },
      {
        label: 'Dynamic typing and multiple assignment',
        code: `# Multiple assignment in one line
a, b, c = 10, 20.5, 'hello'

# Swap without a temp variable
a, b = b, a
print(a, b)   # 20.5  10

# A variable can be rebound to a different type
x = 100
x = 'now a string'   # perfectly legal
print(type(x))       # <class 'str'>`,
      },
    ],
    gotcha:
      "Comparing to None with == instead of 'is' can give wrong results if an object overrides __eq__. Always write 'if x is None' or 'if x is not None'.",
    tip: 'Use type annotations (x: int = 42) to document intent without restricting runtime behaviour. Run mypy or pyright in CI to catch type mismatches before they reach production.',
    realWorldNote:
      "Google's TensorFlow and NumPy rely heavily on Python's numeric type system — int tensors and float32 tensors are distinct dtypes, and accidental int/float coercion is a top source of shape mismatches in ML pipelines.",
  },

  {
    id: 'operators',
    title: 'Operators',
    track: 'beginner',
    estimatedMins: 12,
    summary:
      'Python provides arithmetic operators (+, -, *, /, //, %, **), comparison operators (==, !=, <, >, <=, >=), logical operators (and, or, not), and bitwise operators (&, |, ^, ~, <<, >>). The floor division operator // discards the fractional part, ** is exponentiation, and % gives the remainder. Python 3.8 introduced the walrus operator := which assigns and returns a value in a single expression, useful in while loops and comprehensions.',
    keyPoints: [
      '/ always returns float; // returns int (truncates toward negative infinity)',
      '** is right-associative: 2**3**2 == 2**(3**2) == 512, not (2**3)**2',
      'and/or short-circuit: they stop evaluating as soon as the result is determined',
      'Walrus := assigns and returns in one expression — avoids redundant function calls',
    ],
    examples: [
      {
        label: 'Arithmetic and floor division',
        code: `print(10 / 3)    # 3.3333...  (true division, always float)
print(10 // 3)   # 3          (floor division)
print(10 % 3)    # 1          (modulo)
print(2 ** 10)   # 1024       (exponentiation)

# // floors toward negative infinity (not toward zero)
print(-7 // 2)   # -4  (not -3!)
print(-7 % 2)    # 1   (always non-negative when divisor is positive)`,
      },
      {
        label: 'Short-circuit and walrus',
        code: `# Short-circuit evaluation
data = None
name = data and data['name']   # None — data falsy, right side never evaluated

# Walrus operator — assign and test in one step
import re
text = 'Order #12345 confirmed'
if m := re.search(r'#(\\d+)', text):
    print(f'Order ID: {m.group(1)}')  # Order ID: 12345

# Walrus in a while loop — classic use case
import sys
while chunk := sys.stdin.readline():  # assign, then test truthiness
    print(chunk.upper(), end='')`,
      },
    ],
    gotcha:
      'The is operator checks identity (same object in memory), not equality. 1 is 1 may be True due to integer caching, but 1000 is 1000 can be False in some contexts. Always use == for value comparison.',
    tip: 'Use parentheses freely to make operator precedence explicit. ** and unary minus interact unexpectedly: -2**2 == -(2**2) == -4, not (-2)**2 == 4.',
    realWorldNote:
      "Netflix uses Python's bitwise operators extensively in feature-flag systems where user segment membership is encoded as a bitmask — a single integer storing 64 boolean flags with O(1) set/test operations.",
  },

  {
    id: 'control-flow',
    title: 'Control Flow',
    track: 'beginner',
    estimatedMins: 15,
    summary:
      "Python's control flow is indent-driven: if/elif/else chains, match/case (Python 3.10+), and ternary expressions. There are no switch statements before 3.10 — chained elif handles multiple branches. The match statement supports structural pattern matching on sequences, mappings, class instances, and guard clauses, making complex dispatch far more readable than nested if trees.",
    keyPoints: [
      'Python has no braces: indentation IS the block structure',
      'elif is the idiomatic multi-branch alternative to nested if/else',
      'match/case (3.10+) supports value, sequence, mapping, class, and OR patterns',
      'Ternary: value_if_true if condition else value_if_false',
    ],
    examples: [
      {
        label: 'if/elif/else and ternary',
        code: `score = 85

if score >= 90:
    grade = 'A'
elif score >= 80:
    grade = 'B'
elif score >= 70:
    grade = 'C'
else:
    grade = 'F'

print(grade)   # B

# Ternary expression
label = 'pass' if score >= 60 else 'fail'
print(label)   # pass

# Chained comparisons (Pythonic)
if 0 <= score <= 100:
    print('valid score')`,
      },
      {
        label: 'match/case (Python 3.10+)',
        code: `command = {'action': 'move', 'direction': 'north', 'steps': 3}

match command:
    case {'action': 'move', 'direction': d, 'steps': n} if n > 0:
        print(f'Moving {d} by {n} steps')
    case {'action': 'stop'}:
        print('Stopping')
    case {'action': 'jump', 'height': h}:
        print(f'Jumping {h}m')
    case _:
        print(f'Unknown command: {command}')
# Moving north by 3 steps

# Sequence pattern
point = (0, 5)
match point:
    case (0, 0): print('Origin')
    case (0, y): print(f'Y-axis at y={y}')   # matches
    case (x, 0): print(f'X-axis at x={x}')
    case (x, y): print(f'Point at ({x},{y})')`,
      },
    ],
    gotcha:
      "A match statement does not fall through like C's switch. Each case is independent. To match multiple values in one case, use the OR pattern: case 'quit' | 'exit' | 'q':",
    tip: "Use match/case over long if/elif chains whenever you're dispatching on the structure or type of an object — the pattern matching engine is more readable and handles None/missing keys gracefully.",
    realWorldNote:
      "Google's internal command routers and Discord's slash-command dispatch systems use structural pattern matching to route API payloads to handlers without brittle isinstance chains.",
  },

  {
    id: 'loops',
    title: 'Loops',
    track: 'beginner',
    estimatedMins: 18,
    summary:
      'Python has two loop constructs: for iterates over any iterable (list, range, string, dict, file lines), while loops until a condition is false. enumerate() adds an index to any iteration. zip() pairs elements from multiple iterables. Both loops support break (exit immediately), continue (skip to next iteration), and an else clause (runs only if the loop completed without break — rarely seen but elegant for search patterns).',
    keyPoints: [
      'for iterates over any iterable — not just ranges',
      'enumerate(iterable, start=0) yields (index, value) pairs',
      'zip() stops at the shortest iterable; use itertools.zip_longest for full coverage',
      'Loop else clause runs only when the loop exits naturally (no break)',
    ],
    examples: [
      {
        label: 'for loop, range, enumerate, zip',
        code: `# range(start, stop, step)
for i in range(0, 10, 2):
    print(i, end=' ')   # 0 2 4 6 8
print()

# enumerate — get index and value together
fruits = ['apple', 'banana', 'cherry']
for i, fruit in enumerate(fruits, start=1):
    print(f'{i}. {fruit}')
# 1. apple  2. banana  3. cherry

# zip — iterate multiple sequences in parallel
names = ['Alice', 'Bob', 'Carol']
scores = [92, 87, 95]
for name, score in zip(names, scores):
    print(f'{name}: {score}')`,
      },
      {
        label: 'while, break, continue, and loop else',
        code: `# while loop with break
secret = 42
guess = 0
attempts = 0
while guess != secret:
    guess = int(input('Guess: '))  # imagine user enters 42
    attempts += 1
    if attempts >= 5:
        break

# Loop else: runs only if loop completed without break
for n in range(2, 20):
    for factor in range(2, n):
        if n % factor == 0:
            break
    else:
        print(f'{n} is prime', end=' ')
# 2 3 5 7 11 13 17 19

# continue — skip even numbers
for i in range(10):
    if i % 2 == 0:
        continue
    print(i, end=' ')   # 1 3 5 7 9`,
      },
    ],
    gotcha:
      'Modifying a list while iterating over it causes items to be skipped or visited twice. Always iterate over a copy (for item in mylist[:]:) or build a new list with a comprehension.',
    tip: 'Prefer enumerate() over manual counter variables (i = 0; i += 1). Prefer zip() over index-based parallel iteration. Both are more readable, less error-prone, and faster.',
    realWorldNote:
      "Netflix's content recommendation pipeline processes billions of viewing events using Python generators and itertools.islice to stream data in bounded chunks — never loading the full dataset into RAM.",
  },

  {
    id: 'functions',
    title: 'Functions',
    track: 'beginner',
    estimatedMins: 20,
    summary:
      'Functions are first-class objects in Python — they can be stored in variables, passed as arguments, and returned from other functions. def defines a named function; lambda creates a one-expression anonymous function. Parameters can have default values, accept any number of positional args (*args), or any number of keyword args (**kwargs). LEGB rule governs scope: Local, Enclosing, Global, Built-in lookup order. Closures capture enclosing scope variables.',
    keyPoints: [
      'Default argument values are evaluated ONCE at function definition, not at each call',
      '*args collects extra positional arguments into a tuple; **kwargs collects extra keyword arguments into a dict',
      'Functions without a return statement return None implicitly',
      'Python 3.8+ positional-only parameters (before /) and keyword-only parameters (after *)',
    ],
    examples: [
      {
        label: 'Defaults, *args, **kwargs',
        code: `def greet(name: str, greeting: str = 'Hello') -> str:
    return f'{greeting}, {name}!'

print(greet('Alice'))            # Hello, Alice!
print(greet('Bob', 'Hi'))       # Hi, Bob!
print(greet(greeting='Hey', name='Carol'))  # Hey, Carol!

def summarise(*values: float, label: str = 'Total') -> str:
    return f'{label}: {sum(values):.2f} (n={len(values)})'

print(summarise(1.5, 2.5, 3.0, label='Sum'))  # Sum: 7.00 (n=3)

def make_request(url: str, **options) -> dict:
    return {'url': url, **options}

print(make_request('https://api.example.com', timeout=5, retry=3))`,
      },
      {
        label: 'First-class functions and lambda',
        code: `# Functions stored in variables and passed as arguments
def apply(func, values):
    return [func(v) for v in values]

print(apply(str.upper, ['hello', 'world']))  # ['HELLO', 'WORLD']
print(apply(lambda x: x**2, [1, 2, 3, 4]))  # [1, 4, 9, 16]

# Positional-only (/) and keyword-only (*) parameters (3.8+)
def parse(src: str, /, *, encoding: str = 'utf-8') -> bytes:
    return src.encode(encoding)

parse('hello')                   # OK
parse('hello', encoding='ascii') # OK
# parse(src='hello')             # TypeError — src is positional-only`,
      },
    ],
    gotcha:
      'Never use a mutable object as a default argument (def f(items=[]): ...). The list is created once and shared across all calls. Use None as default and create fresh inside the function.',
    tip: 'Use functools.lru_cache on pure functions that are called repeatedly with the same arguments. A single decorator line can turn an exponential-time recursive function into a linear-time one.',
    realWorldNote:
      "Django's view functions, FastAPI's route handlers, and every AWS Lambda function are plain Python functions — the frameworks discover and call them by convention. Mastering function signatures is mastering every major Python framework.",
  },

  {
    id: 'lists',
    title: 'Lists & Tuples',
    track: 'beginner',
    estimatedMins: 20,
    summary:
      'Lists are ordered, mutable sequences. Tuples are ordered, immutable sequences. Both support indexing (zero-based), negative indexing (from end), and slicing [start:stop:step]. Lists provide append(), extend(), insert(), remove(), pop(), sort(), and reverse(). List comprehensions build new lists in one readable line. Tuples are hashable when their elements are, making them usable as dict keys and set members.',
    keyPoints: [
      'Slicing never raises IndexError — out-of-range slices return shorter (or empty) sequences',
      'list.sort() sorts in-place; sorted(list) returns a new sorted list',
      'Tuple packing/unpacking works anywhere — a, b = 1, 2 is tuple unpacking',
      'List multiplication (list * n) creates shallow copies — mutable elements are shared',
    ],
    examples: [
      {
        label: 'Indexing, slicing, and common methods',
        code: `nums = [10, 20, 30, 40, 50]

print(nums[0])     # 10   (first)
print(nums[-1])    # 50   (last)
print(nums[1:4])   # [20, 30, 40]
print(nums[::2])   # [10, 30, 50]  (every 2nd)
print(nums[::-1])  # [50, 40, 30, 20, 10]  (reversed)

nums.append(60)           # [10, 20, 30, 40, 50, 60]
nums.insert(0, 5)         # [5, 10, 20, ...]
nums.remove(30)           # removes first 30
popped = nums.pop(-1)     # removes and returns last
nums.sort(reverse=True)   # in-place descending sort

# sorted() — returns new list, doesn't mutate original
words = ['banana', 'apple', 'cherry']
print(sorted(words, key=len))  # ['apple', 'banana', 'cherry']`,
      },
      {
        label: 'List comprehensions and tuple unpacking',
        code: `# List comprehension: [expression for item in iterable if condition]
squares = [x**2 for x in range(10) if x % 2 == 0]
print(squares)  # [0, 4, 16, 36, 64]

# Nested comprehension — flatten a 2D list
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [num for row in matrix for num in row]
print(flat)  # [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Tuple unpacking
coordinates = (37.7749, -122.4194, 16.0)
lat, lon, alt = coordinates   # exact match
first, *rest = [1, 2, 3, 4, 5]   # starred unpacking
print(first, rest)  # 1  [2, 3, 4, 5]`,
      },
    ],
    gotcha:
      'list * n creates n references to the SAME inner objects, not n independent copies. [[0]*3]*3 gives 3 rows pointing to the same list. Use [[0]*3 for _ in range(3)] for independent rows.',
    tip: 'Use list.sort(key=...) with a key function instead of a custom comparison. key=str.lower sorts case-insensitively; key=lambda x: (x[1], x[0]) sorts by second element then first.',
    realWorldNote:
      "Google's MapReduce — and its Python descendant Apache Beam — process data as sequences of (key, value) tuples. Tuple immutability makes them safe to share across distributed workers without copying.",
  },

  {
    id: 'dicts-sets',
    title: 'Dictionaries & Sets',
    track: 'beginner',
    estimatedMins: 18,
    summary:
      'Dictionaries are ordered (Python 3.7+) key-value mappings. Keys must be hashable. .get(key, default) avoids KeyError on missing keys. Dict comprehensions, the merge operator | (3.9+), and dict unpacking (**d) make dict manipulation expressive. Sets are unordered collections of unique hashable elements supporting O(1) membership test, union, intersection, difference, and symmetric difference — the mathematical set operations.',
    keyPoints: [
      'dict.get(key, default) is safer than dict[key] — returns default instead of raising KeyError',
      'Python 3.9+ supports d1 | d2 for merge and d1 |= d2 for in-place update',
      'set membership test (x in s) is O(1) vs O(n) for lists — use sets for large membership checks',
      'Collections.defaultdict and collections.Counter are dict subclasses for common patterns',
    ],
    examples: [
      {
        label: 'Dict CRUD, get, comprehension, and merge',
        code: `user = {'name': 'Alice', 'age': 30, 'city': 'NYC'}

# Access
print(user['name'])                  # Alice
print(user.get('email', 'N/A'))      # N/A  (no KeyError)

# Iterate
for key, value in user.items():
    print(f'{key}: {value}')

# Dict comprehension
scores = {'Alice': 92, 'Bob': 78, 'Carol': 88}
passed = {name: score for name, score in scores.items() if score >= 80}
print(passed)  # {'Alice': 92, 'Carol': 88}

# Merge (Python 3.9+)
defaults = {'color': 'blue', 'size': 'M'}
overrides = {'size': 'L', 'weight': 'heavy'}
config = defaults | overrides         # {'color': 'blue', 'size': 'L', 'weight': 'heavy'}
print(config)`,
      },
      {
        label: 'Set operations and Counter',
        code: `from collections import Counter, defaultdict

# Set operations
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}
print(a | b)   # {1,2,3,4,5,6}  union
print(a & b)   # {3, 4}         intersection
print(a - b)   # {1, 2}         difference
print(a ^ b)   # {1,2,5,6}      symmetric difference

# Counter — count hashable objects
words = 'the quick brown fox jumps over the lazy dog'.split()
freq = Counter(words)
print(freq.most_common(3))  # [('the', 2), ('quick', 1), ('brown', 1)]

# defaultdict — no KeyError on missing keys
graph = defaultdict(list)
graph['A'].append('B')   # no need to check if 'A' exists first
graph['A'].append('C')
print(dict(graph))  # {'A': ['B', 'C']}`,
      },
    ],
    gotcha:
      "Dictionary keys must be hashable. Lists and other dicts cannot be keys. Use a tuple instead of a list when you need a compound key: d[(row, col)] instead of d[[row, col]].",
    tip: "Use collections.Counter for frequency counting — it's a dict subclass with .most_common(n), arithmetic operations, and set-like behaviour built in. It handles the tally pattern in one line.",
    realWorldNote:
      "Redis — used by Twitter, GitHub, and Airbnb — stores its entire data model as hash tables (Python dicts) in memory. Python's dict merge operator mirrors Redis's HSET/HGETALL pattern for bulk key-value updates.",
  },

  {
    id: 'strings',
    title: 'Strings',
    track: 'beginner',
    estimatedMins: 16,
    summary:
      'Strings are immutable Unicode sequences in Python 3. They support slicing, len(), and the full iteration protocol. f-strings (Python 3.6+) embed expressions directly with format specifiers. Key methods include strip(), split(), join(), replace(), startswith(), endswith(), find(), and the case methods upper()/lower()/title()/casefold(). Raw strings (r\'...\') disable backslash escapes — essential for regex patterns and Windows paths.',
    keyPoints: [
      'Strings are immutable — every "modification" creates a new string',
      "f-strings evaluate expressions at runtime: f'{2+2}' == '4'",
      "str.join(iterable) is far faster than concatenation in a loop for many strings",
      'casefold() is more aggressive than lower() — use it for locale-aware case-insensitive comparison',
    ],
    examples: [
      {
        label: 'f-strings, slicing, and common methods',
        code: `name = 'Python'
version = 3.12

# f-string with format spec
print(f'Language: {name!r}')        # Language: 'Python'
print(f'Version: {version:.1f}')    # Version: 3.1
print(f'Upper: {name.upper()}')     # Upper: PYTHON
print(f'Pi: {3.14159:.3f}')         # Pi: 3.142

# Slicing (strings are sequences)
text = 'Hello, World!'
print(text[7:12])    # World
print(text[-6:-1])   # World
print(text[::-1])    # !dlroW ,olleH  (reversed)

# Methods
csv_line = '  Alice, 30, NYC  '
fields = [f.strip() for f in csv_line.split(',')]
print(fields)   # ['Alice', '30', 'NYC']`,
      },
      {
        label: 'join, replace, find, raw strings, multiline',
        code: `# join — always faster than + in a loop
words = ['Python', 'is', 'awesome']
sentence = ' '.join(words)
print(sentence)     # Python is awesome

# find vs index: find returns -1, index raises ValueError
text = 'hello world'
print(text.find('world'))   # 6
print(text.find('xyz'))     # -1 (no exception)

# Raw strings — disable backslash escape
path = r'C:\\Users\\Alice\\Documents'  # no \\U, \\A, \\D escape
import re
pattern = re.compile(r'\\b\\w+@\\w+\\.\\w+\\b')  # raw regex

# Multiline strings
sql = """
    SELECT *
    FROM users
    WHERE active = 1
"""
print(sql.strip())`,
      },
    ],
    gotcha:
      "String concatenation with + in a loop is O(n) because strings are immutable — each + creates a new string. Collect parts in a list and use ''.join(parts) at the end for O(n) performance.",
    tip: "Use f'{value!r}' to get the repr() of a value inside an f-string — shows the type unambiguously (quotes for strings, None for None). Invaluable for debugging.",
    realWorldNote:
      "NVIDIA's CUDA toolkit ships Python bindings where kernel names are passed as strings. Python's string methods (strip, split, f-strings) are used to parse compiler output, generate CUDA kernel launch configurations, and format debug logs.",
  },

  {
    id: 'file-io',
    title: 'File I/O',
    track: 'beginner',
    estimatedMins: 16,
    summary:
      "Python's built-in open() opens files in text mode (default) or binary mode. The with statement guarantees the file is closed even if an exception occurs. Read modes: 'r' (read text), 'rb' (read binary). Write modes: 'w' (overwrite), 'a' (append), 'wb' (write binary). pathlib.Path provides an object-oriented file system API that works cross-platform and composably.",
    keyPoints: [
      "Always use 'with open(...)' — it closes the file even on exceptions",
      "'w' truncates the existing file; 'a' appends to it — be deliberate",
      'read() loads the whole file; readline() reads one line; readlines() gives a list of lines; iterating the file object is most memory-efficient',
      'pathlib.Path is the modern alternative to os.path — use / operator to join paths',
    ],
    examples: [
      {
        label: 'Reading and writing with context manager',
        code: `# Write a file
with open('/tmp/demo.txt', 'w', encoding='utf-8') as f:
    f.write('Hello, file!\\n')
    f.writelines(['line 2\\n', 'line 3\\n'])

# Read entire file
with open('/tmp/demo.txt', 'r', encoding='utf-8') as f:
    content = f.read()
print(content)

# Iterate line by line (memory-efficient for large files)
with open('/tmp/demo.txt') as f:
    for line_num, line in enumerate(f, 1):
        print(f'{line_num}: {line}', end='')

# Append mode
with open('/tmp/demo.txt', 'a') as f:
    f.write('line 4\\n')`,
      },
      {
        label: 'pathlib.Path and CSV/JSON',
        code: `from pathlib import Path
import json
import csv

# pathlib — cross-platform, object-oriented
base = Path('/tmp')
log_file = base / 'logs' / 'app.log'  # / operator joins paths
log_file.parent.mkdir(parents=True, exist_ok=True)
log_file.write_text('startup\\nshutdown\\n')
print(log_file.read_text())
print(list(base.glob('*.txt')))  # all .txt files in /tmp

# JSON I/O
data = {'user': 'Alice', 'scores': [92, 87, 95]}
path = Path('/tmp/data.json')
path.write_text(json.dumps(data, indent=2))
loaded = json.loads(path.read_text())
print(loaded['scores'])  # [92, 87, 95]

# CSV I/O
with open('/tmp/scores.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['name', 'score'])
    writer.writeheader()
    writer.writerows([{'name':'Alice','score':92},{'name':'Bob','score':87}])`,
      },
    ],
    gotcha:
      "Opening a file with 'w' immediately truncates (empties) it, even before you write anything. If you want to append, use 'a'. If you want to read and then write, use 'r+' but seek(0) first.",
    tip: "Use Path.read_text() / Path.write_text() for short files — they open, read/write, and close in one call. Reserve the with open() pattern for streaming large files line-by-line.",
    realWorldNote:
      "Netflix's data engineering team uses Python pathlib extensively in ETL pipelines to discover and process thousands of Parquet files across S3-mounted paths, using .glob() patterns and .rglob() for recursive discovery.",
  },

  {
    id: 'errors',
    title: 'Error Handling',
    track: 'beginner',
    estimatedMins: 18,
    summary:
      "Python uses exceptions for error signalling. try/except catches exceptions; else runs only if no exception was raised; finally always runs (cleanup). raise re-raises or raises new exceptions. Custom exception classes inherit from Exception. Python's exception hierarchy groups related errors (OSError, ValueError, TypeError, etc.) so you can catch at the right level of specificity.",
    keyPoints: [
      "Catch the most specific exception first — bare 'except:' catches SystemExit and KeyboardInterrupt too",
      'else clause runs only when NO exception occurred — ideal for code that should only run on success',
      'finally always runs — use it for cleanup (closing files, releasing locks, network disconnects)',
      'raise from original_exc preserves the original traceback chain',
    ],
    examples: [
      {
        label: 'try/except/else/finally',
        code: `def safe_divide(a: float, b: float) -> float | None:
    try:
        result = a / b
    except ZeroDivisionError:
        print('Cannot divide by zero')
        return None
    except TypeError as e:
        print(f'Type error: {e}')
        raise          # re-raise after logging
    else:
        print(f'Success: {a}/{b} = {result}')
        return result
    finally:
        print('safe_divide() exiting')  # always runs

print(safe_divide(10, 2))    # Success: 5.0  →  safe_divide() exiting  →  5.0
print(safe_divide(10, 0))    # Cannot divide by zero  →  ... exiting  →  None`,
      },
      {
        label: 'Custom exceptions and exception chaining',
        code: `class AppError(Exception):
    """Base for all app-specific exceptions."""

class ValidationError(AppError):
    def __init__(self, field: str, value, message: str):
        self.field = field
        self.value = value
        super().__init__(f'Invalid {field}={value!r}: {message}')

class NotFoundError(AppError):
    def __init__(self, resource: str, id_):
        super().__init__(f'{resource} with id={id_!r} not found')

def get_user(user_id: int) -> dict:
    if not isinstance(user_id, int):
        raise ValidationError('user_id', user_id, 'must be int')
    if user_id <= 0:
        raise NotFoundError('User', user_id)
    return {'id': user_id, 'name': 'Alice'}

try:
    user = get_user(-1)
except ValidationError as e:
    print(f'Validation: {e.field} — {e}')
except NotFoundError as e:
    print(f'Not found: {e}')   # Not found: User with id=-1 not found
except AppError as e:
    print(f'App error: {e}')   # catches both above if unhandled`,
      },
    ],
    gotcha:
      "Catching bare 'Exception' is usually too broad and 'except:' (no type) is almost always wrong — it catches SystemExit, KeyboardInterrupt, and GeneratorExit, which should propagate. Always specify at least 'except Exception:'.",
    tip: "Use 'raise SpecificError(...) from original_exc' to chain exceptions and preserve the original traceback. This is essential for library code — it lets callers see both the library error and the underlying cause.",
    realWorldNote:
      "Google's gRPC Python library maps every network and server error to a specific status.StatusCode exception subclass. Stripe's Python SDK wraps every HTTP error into StripeError subclasses (CardError, InvalidRequestError) — both follow this custom exception hierarchy pattern.",
  },

  {
    id: 'modules',
    title: 'Modules & Packages',
    track: 'beginner',
    estimatedMins: 14,
    summary:
      'A module is any .py file. A package is a directory containing __init__.py. import runs the module code once and caches it in sys.modules. from module import name imports specific names. __name__ == \'__main__\' guards script-specific code from running on import. Virtual environments (venv) isolate project dependencies. pip installs packages from PyPI.',
    keyPoints: [
      "Python caches modules in sys.modules — importing the same module twice does NOT re-run its code",
      "__all__ controls what 'from module import *' exports",
      "__name__ == '__main__' runs only when the file is executed directly, not when imported",
      'Virtual environments are non-optional for real projects — always create one per project',
    ],
    examples: [
      {
        label: "import, from, as, and __name__",
        code: `# Absolute import
import math
print(math.sqrt(16))         # 4.0
print(math.pi)               # 3.141592...

# Import specific names
from datetime import datetime, timedelta
now = datetime.now()
tomorrow = now + timedelta(days=1)
print(f'Tomorrow: {tomorrow:%Y-%m-%d}')

# Alias
import numpy as np           # community convention
import pandas as pd          # community convention

# Guard — runs only when executed directly
def main():
    print('Running as script')

if __name__ == '__main__':
    main()`,
      },
      {
        label: 'Package structure and virtual environments',
        code: `# Package structure:
# myproject/
#   pyproject.toml
#   src/
#     myapp/
#       __init__.py    <- makes it a package
#       utils.py
#       models/
#         __init__.py
#         user.py

# In utils.py:
# def add(a, b): return a + b

# In main.py:
# from myapp.utils import add
# from myapp.models.user import User

# Virtual environment commands:
# python -m venv .venv           # create
# source .venv/bin/activate      # activate (macOS/Linux)
# .venv\\Scripts\\activate.bat     # activate (Windows)
# pip install requests pandas    # install packages
# pip freeze > requirements.txt  # lock dependencies
# pip install -r requirements.txt # restore dependencies

# sys.path — where Python looks for modules
import sys
print(sys.path[:3])   # ['', '/usr/lib/python312.zip', ...]`,
      },
    ],
    gotcha:
      'Circular imports (A imports B, B imports A) cause ImportError or partially-initialised modules. Restructure to break the cycle: move shared code to a third module, or move the import inside a function.',
    tip: "Use 'python -m package.module' to run a module that's inside a package — it sets up sys.path correctly so relative imports work. Running 'python src/myapp/main.py' directly often breaks imports.",
    realWorldNote:
      'PyPI hosts 500,000+ packages. Google, Netflix, and NVIDIA all publish internal tools as private PyPI packages using Google Artifact Registry / AWS CodeArtifact, treating Python packages as first-class deployment artifacts.',
  },

  {
    id: 'oop-basics',
    title: 'OOP Basics',
    track: 'beginner',
    estimatedMins: 25,
    summary:
      "Classes in Python are blueprints for objects. __init__ is the initialiser (not the constructor — __new__ is). self is the conventional first parameter referring to the instance. Inheritance uses the class Base syntax; super() calls parent methods. @property turns a method into a computed attribute. Dunder (double-underscore) methods like __str__, __repr__, __len__, and __eq__ customise built-in behaviour.",
    keyPoints: [
      '__init__ is called after the object is created — it initialises attributes, not allocates memory (__new__ does that)',
      'super() without arguments works in Python 3 — use it instead of super(ClassName, self)',
      '@property creates a getter; add @attr.setter to support assignment',
      '__repr__ should be unambiguous (for developers); __str__ should be readable (for users)',
    ],
    examples: [
      {
        label: 'class, __init__, self, and methods',
        code: `class BankAccount:
    interest_rate = 0.02   # class attribute (shared)

    def __init__(self, owner: str, balance: float = 0.0):
        self.owner = owner          # instance attribute
        self._balance = balance     # _single_underscore = 'protected by convention'

    @property
    def balance(self) -> float:
        return self._balance

    def deposit(self, amount: float) -> 'BankAccount':
        if amount <= 0:
            raise ValueError('Deposit must be positive')
        self._balance += amount
        return self   # enables method chaining

    def withdraw(self, amount: float) -> 'BankAccount':
        if amount > self._balance:
            raise ValueError('Insufficient funds')
        self._balance -= amount
        return self

    def __str__(self) -> str:
        return f'Account({self.owner}, \${self._balance:.2f})'

    def __repr__(self) -> str:
        return f'BankAccount({self.owner!r}, {self._balance})'

acc = BankAccount('Alice', 1000)
acc.deposit(500).withdraw(200)   # method chaining
print(acc)                        # Account(Alice, $1300.00)
print(repr(acc))                  # BankAccount('Alice', 1300.0)`,
      },
      {
        label: 'Inheritance, super(), and dunder methods',
        code: `class Animal:
    def __init__(self, name: str, sound: str):
        self.name = name
        self.sound = sound

    def speak(self) -> str:
        return f'{self.name} says {self.sound}'

    def __len__(self) -> int:
        return len(self.name)

class Dog(Animal):
    def __init__(self, name: str, breed: str):
        super().__init__(name, 'Woof')   # call parent __init__
        self.breed = breed

    def fetch(self, item: str) -> str:
        return f'{self.name} fetches the {item}!'

    def speak(self) -> str:   # override parent method
        base = super().speak()
        return f'{base}! {base}!'

class ServiceDog(Dog):
    def __init__(self, name: str, breed: str, role: str):
        super().__init__(name, breed)
        self.role = role

d = Dog('Rex', 'Labrador')
print(d.speak())        # Rex says Woof! Rex says Woof!
print(len(d))           # 3  (len of 'Rex')
print(isinstance(d, Animal))  # True
print(issubclass(Dog, Animal))  # True`,
      },
    ],
    gotcha:
      'Class attributes are shared across all instances. If a class attribute is mutable (list, dict), modifying it through one instance modifies it for all. Use instance attributes in __init__ for per-instance state.',
    tip: 'Use @dataclass for simple data-holding classes to avoid writing __init__, __repr__, and __eq__ by hand. Reserve hand-written classes for objects with significant behaviour.',
    realWorldNote:
      "Django's Model class, SQLAlchemy's declarative_base, and Pydantic's BaseModel all use Python's class machinery. When you write class UserModel(Base): with field annotations, Python's metaclass executes that definition and registers the schema.",
  },

  // ── ADVANCED ─────────────────────────────────────────────────────────────
  {
    id: 'comprehensions',
    title: 'Comprehensions',
    track: 'advanced',
    estimatedMins: 16,
    summary:
      'Python supports four comprehension forms: list [...], dict {...:...}, set {...}, and generator (...). They are syntactic sugar over for-loops with an optional filter clause. Generator expressions produce values lazily — they yield one item at a time without building the full collection in memory, making them ideal for large datasets. Nested comprehensions can replace nested for-loops but should be limited to two levels for readability.',
    keyPoints: [
      'List comprehensions are faster than equivalent for-loops because they are optimised at the bytecode level',
      'Generator expressions use () instead of [] and are lazy — they produce one item at a time',
      'Dict and set comprehensions follow the same syntax pattern as list comprehensions',
      'Nested comprehensions read inner-loop-first: [x for row in matrix for x in row]',
    ],
    examples: [
      {
        label: 'List, dict, and set comprehensions',
        code: `# List comprehension with filter
evens = [x for x in range(20) if x % 2 == 0]
print(evens)  # [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

# Dict comprehension — invert a mapping
original = {'a': 1, 'b': 2, 'c': 3}
inverted = {v: k for k, v in original.items()}
print(inverted)  # {1: 'a', 2: 'b', 3: 'c'}

# Set comprehension — unique lengths
words = ['apple', 'banana', 'cherry', 'date', 'fig']
lengths = {len(w) for w in words}
print(lengths)  # {3, 4, 5, 6}  (order not guaranteed)

# Nested: transpose a matrix
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
transposed = [[row[i] for row in matrix] for i in range(3)]
print(transposed)  # [[1,4,7],[2,5,8],[3,6,9]]`,
      },
      {
        label: 'Generator expressions and memory efficiency',
        code: `import sys

# List comprehension — builds full list in memory
list_comp = [x**2 for x in range(1_000_000)]
print(f'List size: {sys.getsizeof(list_comp):,} bytes')   # ~8 MB

# Generator expression — lazy, tiny memory footprint
gen_exp = (x**2 for x in range(1_000_000))
print(f'Generator size: {sys.getsizeof(gen_exp)} bytes')  # 112 bytes

# Generators work anywhere an iterable is expected
total = sum(x**2 for x in range(1_000_000))   # no [] needed
print(f'Sum: {total:,}')

# Chain generators for pipeline processing
lines = ['  Alice,30  ', '  Bob,25  ', '  Carol,35  ']
pipeline = (
    (name.strip(), int(age.strip()))
    for line in lines
    for name, age in [line.strip().split(',')]
)
for name, age in pipeline:
    print(f'{name} is {age}')`,
      },
    ],
    gotcha:
      'A generator can only be iterated once. After exhaustion, it yields nothing. If you need to iterate multiple times, convert to a list first — or recreate the generator expression.',
    tip: 'Prefer generator expressions over list comprehensions when you only need to iterate once or pass to an aggregation function (sum, max, any, all). The memory savings are substantial for large datasets.',
    realWorldNote:
      "Google's BigQuery Python client and pandas use generator-based chunking internally — read_gbq() streams result pages as generators so a 10 GB query result never fully lands in RAM.",
  },

  {
    id: 'decorators',
    title: 'Decorators',
    track: 'advanced',
    estimatedMins: 20,
    summary:
      'A decorator is a callable that takes a function (or class) and returns a replacement. The @syntax is syntactic sugar: @dec applied to f is equivalent to f = dec(f). Decorators are used to add cross-cutting concerns — logging, timing, caching, authentication, retry logic — without modifying the original function. functools.wraps preserves the original function\'s metadata (__name__, __doc__) through the wrapper.',
    keyPoints: [
      '@decorator is syntactic sugar for func = decorator(func) — applied at class/function definition time',
      'functools.wraps copies __name__, __doc__, and __wrapped__ — always use it in wrappers',
      'Decorator factories (decorators with arguments) need three levels of nesting',
      'Class decorators work the same way — @dec on a class calls dec(MyClass)',
    ],
    examples: [
      {
        label: 'Basic decorator and functools.wraps',
        code: `import functools
import time

def timer(func):
    """Measure and print execution time."""
    @functools.wraps(func)  # preserves __name__, __doc__
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f'{func.__name__!r} took {elapsed:.4f}s')
        return result
    return wrapper

@timer
def slow_sum(n: int) -> int:
    return sum(range(n))

print(slow_sum(10_000_000))   # 'slow_sum' took 0.2341s  →  49999995000000
print(slow_sum.__name__)       # slow_sum  (not 'wrapper', thanks to wraps)`,
      },
      {
        label: 'Decorator factory and stacking',
        code: `import functools

def retry(max_attempts: int = 3, delay: float = 0.5):
    """Decorator factory — retries on exception."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            import time
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    print(f'Attempt {attempt} failed: {e}')
                    if attempt < max_attempts:
                        time.sleep(delay)
            raise last_exc
        return wrapper
    return decorator

def log_call(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f'Calling {func.__name__}')
        return func(*args, **kwargs)
    return wrapper

# Stacking decorators — applied bottom-up
@log_call
@retry(max_attempts=3, delay=0.1)
def fetch_data(url: str) -> dict:
    raise ConnectionError('Network error')  # simulate failure

try:
    fetch_data('https://api.example.com')
except ConnectionError:
    print('All attempts failed')`,
      },
    ],
    gotcha:
      'Without functools.wraps, the wrapper function replaces __name__ and __doc__ with the wrapper\'s own. This breaks introspection, help(), and some testing frameworks that rely on function metadata.',
    tip: 'Decorators are evaluated at import time, not at call time. Expensive setup in a decorator runs once per decorated function. Use this for one-time compilation, schema validation, or route registration.',
    realWorldNote:
      "Flask's @app.route('/') and FastAPI's @router.get('/') are decorator factories that register URL → handler mappings at import time. Every web framework with a routing DSL uses this pattern.",
  },

  {
    id: 'generators',
    title: 'Generators & Iterators',
    track: 'advanced',
    estimatedMins: 22,
    summary:
      'A generator function uses yield instead of return. Calling it returns a generator object — an iterator that resumes where it left off each time next() is called. yield from delegates to a sub-iterable, flattening nested generators. The iterator protocol requires __iter__ and __next__. Generators are the foundation of Python\'s async/await system and enable memory-efficient data pipelines.',
    keyPoints: [
      'yield suspends the function and returns a value; the function resumes on the next next() call',
      'yield from sub_gen is equivalent to for item in sub_gen: yield item — but faster',
      'Generators implement the iterator protocol: __iter__ returns self, __next__ runs to the next yield',
      'send(value) resumes the generator and sends a value back in — the yield expression evaluates to it',
    ],
    examples: [
      {
        label: 'Generator functions and yield',
        code: `def fibonacci(limit: int):
    """Yield Fibonacci numbers up to limit."""
    a, b = 0, 1
    while a <= limit:
        yield a
        a, b = b, a + b

# Use like any iterable
print(list(fibonacci(100)))
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]

# Generators are lazy — only compute on demand
fib_gen = fibonacci(1_000_000)
print(next(fib_gen))   # 0
print(next(fib_gen))   # 1
print(next(fib_gen))   # 1

# yield from — delegate to a sub-generator
def chain_sequences(*iterables):
    for it in iterables:
        yield from it   # flattens

print(list(chain_sequences([1,2], 'ab', (3,4))))
# [1, 2, 'a', 'b', 3, 4]`,
      },
      {
        label: 'Custom iterator and generator pipeline',
        code: `class CountUp:
    """Custom iterator — counts from start to stop."""
    def __init__(self, start: int, stop: int):
        self.current = start
        self.stop = stop

    def __iter__(self):
        return self   # iterator returns itself

    def __next__(self):
        if self.current > self.stop:
            raise StopIteration
        value = self.current
        self.current += 1
        return value

print(list(CountUp(1, 5)))  # [1, 2, 3, 4, 5]

# Generator pipeline — process large files without loading all into RAM
def read_lines(path: str):
    with open(path) as f:
        yield from f

def grep(pattern: str, lines):
    import re
    for line in lines:
        if re.search(pattern, line):
            yield line.rstrip()

def head(n: int, lines):
    for i, line in enumerate(lines):
        if i >= n: break
        yield line

# Compose the pipeline
# results = list(head(10, grep(r'ERROR', read_lines('/var/log/app.log'))))`,
      },
    ],
    gotcha:
      "Generators don't support len() or random access — they're single-pass. If you call list() on a generator, it's exhausted. Wrap in itertools.tee() only as a last resort; prefer recreating the generator.",
    tip: 'Use itertools — chain, islice, groupby, product, combinations, permutations — before writing any custom iteration logic. The module provides battle-tested, C-speed implementations of the most common patterns.',
    realWorldNote:
      "Python's asyncio event loop is built on generator-based coroutines. CPython's async/await compiles to a generator state machine under the hood. Every async framework — aiohttp, FastAPI, Starlette — relies on this generator protocol.",
  },

  {
    id: 'context-managers',
    title: 'Context Managers',
    track: 'advanced',
    estimatedMins: 16,
    summary:
      "Context managers implement the with statement protocol: __enter__ runs setup and returns the managed resource; __exit__ runs teardown (even if an exception occurred). contextlib.contextmanager turns a generator function into a context manager with a single yield. They are ideal for resource management: files, database connections, locks, temporary directories, and mocking in tests.",
    keyPoints: [
      '__enter__ return value is bound to the as variable in the with statement',
      '__exit__ receives exception type, value, and traceback — return True to suppress the exception',
      '@contextlib.contextmanager wraps a generator: code before yield is __enter__, code after is __exit__',
      'contextlib.suppress(ExcType) is a one-liner context manager that silences specific exceptions',
    ],
    examples: [
      {
        label: 'Class-based context manager',
        code: `import time

class Timer:
    """Measure elapsed time as a context manager."""
    def __enter__(self):
        self.start = time.perf_counter()
        return self   # bound to 'as' variable

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.perf_counter() - self.start
        print(f'Elapsed: {self.elapsed:.4f}s')
        return False  # don't suppress exceptions

with Timer() as t:
    total = sum(range(10_000_000))
print(f'Sum: {total:,}, time: {t.elapsed:.4f}s')

# Stacking context managers
with open('/tmp/a.txt', 'w') as a, open('/tmp/b.txt', 'w') as b:
    a.write('hello')
    b.write('world')`,
      },
      {
        label: '@contextmanager and contextlib utilities',
        code: `from contextlib import contextmanager, suppress
import tempfile, os

@contextmanager
def temp_directory():
    """Create a temp dir; clean up on exit even if exception."""
    import tempfile, shutil
    tmpdir = tempfile.mkdtemp()
    try:
        yield tmpdir          # __enter__: gives caller the path
    finally:
        shutil.rmtree(tmpdir) # __exit__: always cleans up

with temp_directory() as path:
    filename = os.path.join(path, 'data.txt')
    with open(filename, 'w') as f:
        f.write('temporary data')
    print(os.listdir(path))   # ['data.txt']
# directory is deleted here

# suppress — silently ignore specific exceptions
with suppress(FileNotFoundError):
    os.remove('/tmp/does_not_exist.txt')   # no exception raised
print('Still running')`,
      },
    ],
    gotcha:
      '__exit__ is called even when no exception occurs — exc_type, exc_val, and exc_tb are all None in the happy path. Return False (or None) to let exceptions propagate; return True only when you intentionally want to swallow them.',
    tip: 'Use @contextmanager for simple context managers instead of writing a full class. The generator form is cleaner for one-off use cases. Use the class form when you need state, multiple methods, or subclassing.',
    realWorldNote:
      "SQLAlchemy's session management (with Session() as session:), pytest's tmp_path fixture, and Django's TestCase.assertRaises all use context managers. Every database ORM uses them for transaction scope.",
  },

  {
    id: 'closures',
    title: 'Closures & Scope',
    track: 'advanced',
    estimatedMins: 18,
    summary:
      'A closure is a function that remembers variables from its enclosing scope even after that scope has finished. Python\'s LEGB scope rule (Local, Enclosing, Global, Built-in) determines name lookup order. The nonlocal keyword allows a nested function to rebind enclosing-scope variables. Closures are the foundation of decorators, factory functions, and partial application.',
    keyPoints: [
      'A closure captures variables by reference, not by value — the captured variable can change after the closure is created',
      'nonlocal allows writing to an enclosing scope variable (not just reading it)',
      'global declares that an assignment targets the module-level name, not a local one',
      'Each call to a factory function creates an independent closure with its own cell variables',
    ],
    examples: [
      {
        label: 'Closure and factory function',
        code: `def make_multiplier(factor: int):
    """Returns a closure that multiplies by factor."""
    def multiply(x: int) -> int:
        return x * factor   # 'factor' is captured from enclosing scope
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(10))   # 20
print(triple(10))   # 30
print(double.__closure__[0].cell_contents)   # 2

# Closure captures by reference — classic loop gotcha
funcs_bad = [lambda x: x * i for i in range(3)]
print([f(10) for f in funcs_bad])   # [20, 20, 20]  — all see i=2!

# Fix: capture by value via default argument
funcs_ok = [lambda x, i=i: x * i for i in range(3)]
print([f(10) for f in funcs_ok])    # [0, 10, 20]  — correct`,
      },
      {
        label: 'nonlocal and stateful closures',
        code: `def make_counter(start: int = 0):
    """A stateful closure — counter lives in cell variable."""
    count = start

    def increment(step: int = 1) -> int:
        nonlocal count   # allow reassignment of enclosing variable
        count += step
        return count

    def reset():
        nonlocal count
        count = start

    def current():
        return count

    return increment, reset, current

inc, reset, cur = make_counter(10)
print(inc())    # 11
print(inc(5))   # 16
print(cur())    # 16
reset()
print(cur())    # 10  (back to start)`,
      },
    ],
    gotcha:
      'The classic loop + lambda gotcha: lambdas in a list comprehension all share the same loop variable by reference. By the time any lambda is called, the loop has finished and the variable holds its final value. Use a default argument (lambda x, i=i: ...) to capture the value at each iteration.',
    tip: 'Use functools.partial instead of a manual closure when you just want to fix some arguments of a function: double = functools.partial(operator.mul, 2). It is more explicit and shows up better in tracebacks.',
    realWorldNote:
      "JavaScript's module pattern and Python's factory functions both use closures to create private state. Flask's application factory (create_app()) uses a closure to capture the config object and return a configured WSGI app.",
  },

  {
    id: 'dataclasses',
    title: 'Dataclasses',
    track: 'advanced',
    estimatedMins: 18,
    summary:
      'The @dataclass decorator (Python 3.7+) auto-generates __init__, __repr__, and __eq__ from annotated class attributes. Fields can have defaults, default_factory for mutable defaults, and metadata. frozen=True makes the class immutable (and hashable). field() gives fine-grained control. dataclasses integrate with type checkers and are the idiomatic replacement for namedtuple and NamedTuple for simple data containers.',
    keyPoints: [
      '@dataclass generates __init__, __repr__, and __eq__ automatically from field annotations',
      'Use field(default_factory=list) for mutable defaults — never use a bare [] as a default',
      'frozen=True adds __hash__ and makes the instance immutable (like a named tuple)',
      '__post_init__ runs after the generated __init__ — use it for validation and derived fields',
    ],
    examples: [
      {
        label: 'Basic dataclass with validation',
        code: `from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class User:
    id: int
    name: str
    email: str
    tags: list[str] = field(default_factory=list)   # mutable default
    created_at: datetime = field(default_factory=datetime.now)
    active: bool = True

    def __post_init__(self):
        if '@' not in self.email:
            raise ValueError(f'Invalid email: {self.email!r}')
        self.name = self.name.strip()   # normalise on create

u1 = User(id=1, name='Alice ', email='alice@example.com', tags=['admin'])
u2 = User(id=1, name='Alice', email='alice@example.com')
print(u1)       # User(id=1, name='Alice', email='alice@example.com', ...)
print(u1 == u2) # True  (generated __eq__ compares all fields)`,
      },
      {
        label: 'Frozen dataclass and field options',
        code: `from dataclasses import dataclass, field

@dataclass(frozen=True, order=True)  # immutable + orderable
class Point:
    x: float
    y: float
    label: str = field(default='', compare=False)   # excluded from == and <

p1 = Point(1.0, 2.0, label='A')
p2 = Point(1.0, 2.0, label='B')
print(p1 == p2)   # True  (label excluded from comparison)
print(p1 < Point(2.0, 0.0))  # True  (order=True, compares x then y)

# Frozen dataclasses are hashable — can be dict keys / set members
cache: dict[Point, str] = {}
cache[p1] = 'cached result'

# Inheritance — child inherits parent fields
@dataclass
class Point3D(Point):
    z: float = 0.0

p3d = Point3D(1.0, 2.0, z=3.0)
print(p3d)  # Point3D(x=1.0, y=2.0, label='', z=3.0)`,
      },
    ],
    gotcha:
      'If a parent dataclass has a field with a default, all child fields must also have defaults (Python limitation on positional arguments). Reorder fields or use field(default=...) on the parent to work around this.',
    tip: 'Use dataclasses.asdict() to convert a dataclass to a plain dict (recursively) for JSON serialisation. Use dataclasses.replace(instance, field=new_value) to create a modified copy without mutating the original.',
    realWorldNote:
      "Pydantic v2 (used by FastAPI, OpenAI SDK, LangChain) compiles dataclass-like models to Rust-backed validators. The @dataclass pattern is so universal that Pydantic's BaseModel mirrors it exactly — migrating between them requires only changing the base class.",
  },

  {
    id: 'async',
    title: 'Async / Await',
    track: 'advanced',
    estimatedMins: 25,
    summary:
      "Python's async/await (PEP 492) enables cooperative concurrency — coroutines yield control voluntarily at await points, letting the event loop run other tasks. asyncio is the standard library event loop. async def defines a coroutine function; await suspends it until the awaitable completes. asyncio.gather() runs multiple coroutines concurrently. aiohttp and httpx provide async HTTP clients; asyncpg provides async PostgreSQL.",
    keyPoints: [
      'async def creates a coroutine function — calling it returns a coroutine object, not the result',
      'await can only be used inside async def — it suspends the current coroutine and yields control',
      'asyncio.gather(*coros) runs coroutines concurrently and returns results in order',
      "async for and async with work with objects that implement __aiter__ and __aenter__/__aexit__",
    ],
    examples: [
      {
        label: 'Coroutines and asyncio.gather',
        code: `import asyncio
import time

async def fetch(url: str, delay: float) -> str:
    """Simulate a network request."""
    await asyncio.sleep(delay)   # yields control — other tasks run here
    return f'Response from {url}'

async def main():
    start = time.perf_counter()

    # Sequential — total ~3s
    # r1 = await fetch('https://api.example.com/a', 1.0)
    # r2 = await fetch('https://api.example.com/b', 2.0)

    # Concurrent — total ~2s (the slowest)
    results = await asyncio.gather(
        fetch('https://api.example.com/a', 1.0),
        fetch('https://api.example.com/b', 2.0),
        fetch('https://api.example.com/c', 0.5),
    )
    elapsed = time.perf_counter() - start
    for r in results:
        print(r)
    print(f'Total: {elapsed:.2f}s')

asyncio.run(main())`,
      },
      {
        label: 'Async context manager and async for',
        code: `import asyncio

class AsyncDB:
    """Fake async database connection."""
    async def __aenter__(self):
        await asyncio.sleep(0.01)  # simulate connect
        print('DB connected')
        return self

    async def __aexit__(self, *args):
        await asyncio.sleep(0.01)  # simulate disconnect
        print('DB disconnected')

    async def query(self, sql: str):
        await asyncio.sleep(0.05)  # simulate query
        return [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]

async def stream_rows():
    """Async generator — yields rows one at a time."""
    for i in range(5):
        await asyncio.sleep(0.01)
        yield {'row': i}

async def main():
    async with AsyncDB() as db:
        rows = await db.query('SELECT * FROM users')
        print(rows)

    # async for — iterates an async generator
    async for row in stream_rows():
        print(row)

asyncio.run(main())`,
      },
    ],
    gotcha:
      "Calling a coroutine without await doesn't execute it — it just creates a coroutine object. Python 3.10+ warns about unawaited coroutines, but silently dropping them is a common bug. Always await or pass to asyncio.create_task().",
    tip: 'Use asyncio.create_task() instead of await when you want to start a coroutine and continue without waiting for it. Collect the tasks and await them later with asyncio.gather() for structured concurrency.',
    realWorldNote:
      "Discord's bot library (discord.py), FastAPI, and Sanic are all built on asyncio. Discord handles 200M+ users with Python async — each WebSocket connection is a coroutine, allowing thousands of concurrent connections on a single thread.",
  },

  {
    id: 'concurrency',
    title: 'Concurrency & Parallelism',
    track: 'advanced',
    estimatedMins: 22,
    summary:
      "Python has three concurrency models: asyncio for I/O-bound cooperative concurrency, threading for I/O-bound preemptive concurrency, and multiprocessing for CPU-bound parallelism. The GIL (Global Interpreter Lock) prevents true parallel execution of Python bytecode across threads, making multiprocessing necessary for CPU-bound work. concurrent.futures provides a high-level ThreadPoolExecutor and ProcessPoolExecutor that unify both models.",
    keyPoints: [
      "The GIL allows only one thread to execute Python bytecode at a time — use multiprocessing for CPU-bound parallel work",
      'ThreadPoolExecutor is ideal for I/O-bound work: HTTP requests, file I/O, database queries',
      'ProcessPoolExecutor spawns separate Python processes — each has its own GIL, enabling true parallelism',
      'executor.map(func, iterable) is the simplest parallel map; submit() gives individual Future handles',
    ],
    examples: [
      {
        label: 'ThreadPoolExecutor for I/O-bound work',
        code: `from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def download(url: str) -> str:
    """Simulate a slow network request."""
    time.sleep(0.5)
    return f'Downloaded: {url}'

urls = [f'https://example.com/{i}' for i in range(10)]

# Sequential — 5 seconds
# results = [download(u) for u in urls]

# Concurrent with threads — ~0.5 seconds (10 requests in parallel)
start = time.perf_counter()
with ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(download, u): u for u in urls}
    for future in as_completed(futures):
        url = futures[future]
        result = future.result()
        print(result)

print(f'Done in {time.perf_counter() - start:.2f}s')`,
      },
      {
        label: 'ProcessPoolExecutor for CPU-bound work',
        code: `from concurrent.futures import ProcessPoolExecutor
import time

def is_prime(n: int) -> bool:
    if n < 2: return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

def count_primes(start: int, end: int) -> int:
    return sum(1 for n in range(start, end) if is_prime(n))

if __name__ == '__main__':   # REQUIRED for multiprocessing on Windows/macOS
    N = 1_000_000
    chunks = [(i * N//4, (i+1) * N//4) for i in range(4)]

    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda args: count_primes(*args), chunks))
    total = sum(results)
    elapsed = time.perf_counter() - start
    print(f'Primes up to {N:,}: {total:,} in {elapsed:.2f}s')`,
      },
    ],
    gotcha:
      "The if __name__ == '__main__': guard is REQUIRED when using multiprocessing on macOS and Windows. Without it, each spawned process reimports the script and tries to spawn more processes — causing a fork bomb.",
    tip: "Use asyncio for many concurrent I/O operations (hundreds of HTTP calls). Use ThreadPoolExecutor for a handful of blocking I/O calls you can't make async. Use ProcessPoolExecutor only when you've confirmed the bottleneck is CPU-bound computation.",
    realWorldNote:
      "Instagram's backend runs on Python with a combination of asyncio (for async ORM queries via Django Channels) and Celery workers (multiprocessing) for background job processing. They handle 500M+ daily actives this way.",
  },

  {
    id: 'type-hints',
    title: 'Type Hints',
    track: 'advanced',
    estimatedMins: 18,
    summary:
      'Type hints (PEP 484) annotate function signatures and variables with type information. They are ignored at runtime but used by static analysers (mypy, pyright, pylance) and IDEs to catch type errors before execution. Python 3.10+ introduced X | Y union syntax; 3.12 added type aliases with the type keyword. Generic types (list[int], dict[str, int]) express container element types without importing from typing.',
    keyPoints: [
      'Type hints are NOT enforced at runtime — they are documentation + static analysis hooks',
      'Python 3.10+: use X | Y instead of Union[X, Y]; use X | None instead of Optional[X]',
      'TypeVar enables generic functions that work on multiple types while preserving type relationships',
      'Protocol defines structural subtyping (duck typing) without inheritance',
    ],
    examples: [
      {
        label: 'Function annotations, generics, and Union',
        code: `from typing import TypeVar, Generic, Protocol

# Basic annotations
def greet(name: str, repeat: int = 1) -> str:
    return (f'Hello, {name}! ' * repeat).strip()

# Python 3.10+ union syntax
def safe_int(value: str | int | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

# Generic function — T is preserved through the call
T = TypeVar('T')
def first(items: list[T]) -> T | None:
    return items[0] if items else None

print(first([1, 2, 3]))         # int: 1
print(first(['a', 'b']))        # str: 'a'

# Built-in generics (3.9+) — no need to import List, Dict, Tuple
def process(data: dict[str, list[int]]) -> list[tuple[str, int]]:
    return [(k, sum(v)) for k, v in data.items()]`,
      },
      {
        label: 'Protocol for structural typing and TypedDict',
        code: `from typing import Protocol, TypedDict, runtime_checkable

@runtime_checkable
class Drawable(Protocol):
    """Any object with a draw() method satisfies this protocol."""
    def draw(self) -> str: ...

class Circle:
    def draw(self) -> str: return 'drawing circle'

class Square:
    def draw(self) -> str: return 'drawing square'

def render(shape: Drawable) -> None:
    print(shape.draw())

render(Circle())   # works — Circle is structurally compatible
render(Square())   # works — no explicit inheritance needed
print(isinstance(Circle(), Drawable))   # True (runtime_checkable)

# TypedDict — typed dict with specific key shapes
class UserRecord(TypedDict):
    id: int
    name: str
    email: str
    active: bool

def get_user() -> UserRecord:
    return {'id': 1, 'name': 'Alice', 'email': 'a@b.com', 'active': True}`,
      },
    ],
    gotcha:
      'Type hints are not validated at runtime by default. Passing the wrong type to a hinted function raises no error unless you use a runtime validator like pydantic or beartype. Use mypy/pyright in CI to get the safety guarantees.',
    tip: "Use 'from __future__ import annotations' at the top of any file to enable postponed evaluation of annotations — this makes forward references and recursive types work without quotes, and is the default in Python 3.14+.",
    realWorldNote:
      "Microsoft's Pylance (used in VS Code) and Google's pytype both use Python type hints to provide real-time error detection and autocompletion. Meta's Pyre type checker runs on the entire Instagram codebase — 2M+ lines of typed Python.",
  },

  {
    id: 'performance',
    title: 'Performance & Profiling',
    track: 'advanced',
    estimatedMins: 20,
    summary:
      "Python is not the fastest language, but there are well-established techniques to make it fast enough: avoid pure-Python loops over large datasets (use NumPy vectorisation), cache repeated computations (functools.lru_cache), profile before optimising (cProfile, line_profiler), and reach for C extensions (NumPy, pandas, Cython) or JIT compilers (PyPy, Numba) for hot paths. The first rule of optimisation: measure first.",
    keyPoints: [
      'Profile first: cProfile identifies hot functions; line_profiler identifies hot lines',
      'functools.lru_cache / functools.cache memoises pure functions with a one-line decorator',
      'NumPy vectorised operations run C code over arrays — 100x faster than Python loops for numerical work',
      'slots=True in @dataclass (or __slots__ in class) reduces per-instance memory by ~40%',
    ],
    examples: [
      {
        label: 'Profiling and lru_cache',
        code: `import cProfile
import functools
import time

# Without memoisation — O(2^n) tree recursion
def fib_slow(n: int) -> int:
    if n <= 1: return n
    return fib_slow(n-1) + fib_slow(n-2)

# With memoisation — O(n) with cache
@functools.cache   # functools.lru_cache(maxsize=None) equivalent
def fib_fast(n: int) -> int:
    if n <= 1: return n
    return fib_fast(n-1) + fib_fast(n-2)

# Timing comparison
t0 = time.perf_counter(); fib_slow(35); slow = time.perf_counter() - t0
t0 = time.perf_counter(); fib_fast(35); fast = time.perf_counter() - t0
print(f'Slow: {slow:.3f}s  Fast: {fast:.6f}s  Speedup: {slow/fast:.0f}x')

# Profile a function
def profile_me():
    return sum(i**2 for i in range(100_000))

cProfile.run('profile_me()', sort='cumulative')`,
      },
      {
        label: 'NumPy vectorisation vs Python loops',
        code: `import numpy as np
import time

N = 1_000_000

# Pure Python loop
def python_norm(data: list) -> list:
    total = sum(data)
    return [x / total for x in data]

# NumPy vectorised
def numpy_norm(data: np.ndarray) -> np.ndarray:
    return data / data.sum()

data_list = list(range(1, N + 1))
data_arr  = np.arange(1, N + 1, dtype=np.float64)

t0 = time.perf_counter(); python_norm(data_list); py_t = time.perf_counter()-t0
t0 = time.perf_counter(); numpy_norm(data_arr);   np_t = time.perf_counter()-t0

print(f'Python: {py_t:.3f}s')
print(f'NumPy:  {np_t:.4f}s')
print(f'Speedup: {py_t/np_t:.0f}x')
# Typical output: Python 0.08s, NumPy 0.002s, Speedup ~40x`,
      },
    ],
    gotcha:
      "premature optimisation is the root of all evil. Profile first with cProfile or timeit — 90% of runtime is usually in 10% of code. Rewriting clean Python in Cython before measuring is almost always wasted effort.",
    tip: "Use timeit.timeit() for microbenchmarks instead of time.time() — it runs the code thousands of times to average out OS jitter and disables garbage collection during measurement for stable results.",
    realWorldNote:
      "Spotify's music recommendation model runs in Python backed by NumPy and scikit-learn. NVIDIA's cuML replicates scikit-learn's API but runs on GPU — the same vectorised programming model, just on CUDA cores instead of CPU.",
  },
];
