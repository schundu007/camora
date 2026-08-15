// Python Quick Reference — core language cards.
//
// Rendered by TopicDetail's `codeExamples` block (grouped by `title`, so every
// title in here MUST be unique — duplicates silently collapse into language
// tabs instead of separate cards).
//
// Scope: everything quickref.me/python covers (getting started, built-in types,
// strings, f-strings, lists, flow control, loops, functions, modules, files,
// classes/inheritance, misc) — rewritten at interview depth, with the version
// gates and gotchas that reference omits. The algorithm/stdlib layer lives in
// quickRefPythonDsaCards.js.

export const pythonCoreCards = [
  // ─────────────────────────────────────────────────────────────
  // 1. Getting started
  // ─────────────────────────────────────────────────────────────
  {
    title: '01 · Script Skeleton & Fast I/O',
    language: 'python',
    description: 'The entry-point guard matters in interviews: without it, importing your module executes your driver code. sys.stdin.readline is 3-5x faster than input() on large inputs.',
    code: `#!/usr/bin/env python3
"""One-line module summary."""
import sys


def solve(nums: list[int]) -> int:
    return sum(nums)


def main() -> None:
    data = sys.stdin.read().split()      # fastest bulk read
    n, *rest = map(int, data)
    print(solve(rest[:n]))


if __name__ == "__main__":               # only runs when executed directly,
    main()                               # not when imported

# Line-at-a-time when input is huge:
#   input = sys.stdin.readline           # rebind, keeps .strip() semantics off
#   line = input().rstrip("\\n")

# Speed ranking for reading 10^6 ints:
#   sys.stdin.read().split()  <  sys.stdin.readline  <  input()`,
  },
  {
    title: '02 · Variables, Multiple Assignment & Swap',
    language: 'python',
    description: 'Names bind to objects; there are no declarations. Tuple packing/unpacking gives you the swap idiom interviewers expect instead of a temp variable.',
    code: `x = 10                      # int
name = "Ada"                # str
pi = 3.14159                # float
ok = True                   # bool
nothing = None              # NoneType

a, b = 1, 2                 # tuple unpacking
a, b = b, a                 # swap — RHS is evaluated first, so no temp needed

x = y = z = 0               # chained assignment (same object!)
first, *middle, last = [1, 2, 3, 4, 5]   # star unpacking -> 1 [2,3] 5

count = 0
count += 1                  # augmented assignment
count -= 1; count *= 2; count //= 2; count **= 2; count %= 7

# Walrus := assigns inside an expression (3.8+)
if (n := len(middle)) > 1:
    print(f"{n} middle items")

# Constants are convention only — UPPER_SNAKE, not enforced
MAX_RETRIES = 3

del x                       # unbind the name (does not "free" memory directly)`,
  },
  {
    title: '03 · Built-in Types at a Glance',
    language: 'python',
    description: 'The single table worth memorising: mutability decides whether an object can be a dict key or set member, and whether passing it to a function can mutate the caller.',
    code: `# TYPE        LITERAL             MUTABLE?  HASHABLE?  ORDERED?
# int         42                  no        yes        -
# float       3.14                no        yes        -
# complex     2+3j                no        yes        -
# bool        True                no        yes        -        (subclass of int!)
# str         "hi"                no        yes        yes
# bytes       b"hi"               no        yes        yes
# bytearray   bytearray(b"hi")    YES       no         yes
# list        [1, 2]              YES       no         yes
# tuple       (1, 2)              no        yes*       yes      (*if contents are)
# set         {1, 2}              YES       no         no
# frozenset   frozenset({1, 2})   no        yes        no
# dict        {"a": 1}            YES       no         yes      (insertion, 3.7+)
# NoneType    None                no        yes        -

type(42)                # <class 'int'>
isinstance(42, int)     # True — prefer over type(x) == int (respects subclasses)
isinstance(True, int)   # True  <-- bool IS an int; a classic trap
id(42)                  # identity (CPython: memory address)

# Hashable == usable as dict key / set element
{(1, 2): "ok"}          # fine — tuple of immutables
# {[1, 2]: "boom"}      # TypeError: unhashable type: 'list'`,
  },
  {
    title: '04 · Truthiness & Boolean Semantics',
    language: 'python',
    description: 'Empty containers are falsy, which is why `if not stack:` is the idiomatic emptiness check. and/or return operands, not booleans.',
    code: `# Falsy: False  None  0  0.0  0j  ""  []  ()  {}  set()  range(0)
# Everything else is truthy — including "0", "False", [0], and {0: None}.

stack = []
if not stack:               # idiomatic; beats len(stack) == 0
    print("empty")

# and/or SHORT-CIRCUIT and return an operand (not a bool)
name = "" or "anonymous"    # -> "anonymous"
val  = 0 and 1 / 0          # -> 0, the division never runs
x = None
safe = x and x.attr         # -> None instead of AttributeError

# Prefer an explicit None check when 0/"" are legitimate values
def f(timeout=None):
    if timeout is None:     # NOT 'if not timeout:' — 0 is a valid timeout
        timeout = 30

# Chained comparison evaluates the middle operand once
if 0 <= idx < len(stack):
    pass

# is vs ==
a, b = [1], [1]
a == b      # True  — same value
a is b      # False — different objects
# Use 'is' ONLY for None / True / False / sentinels.

bool([]), bool("0"), all([]), any([])   # False True True False`,
  },
  {
    title: '05 · Casting & Numeric Bases',
    language: 'python',
    description: 'int() with a base parses any radix; bin/oct/hex produce prefixed strings. int() truncates toward zero while // floors — they differ on negatives.',
    code: `int("42")            # 42
int("1010", 2)       # 10   — base 2..36
int("ff", 16)        # 255
int(3.99)            # 3    — truncates TOWARD ZERO
int(-3.99)           # -3   (but -3.99 // 1 == -4.0, which FLOORS)
float("3.14")        # 3.14
float("inf")         # inf
str(42)              # "42"
bool(0), bool("")    # False False

bin(10)              # '0b1010'
oct(10)              # '0o12'
hex(255)             # '0xff'
f"{255:b}"           # '11111111'  — no prefix
f"{255:#010b}"       # '0b11111111' — prefixed, zero-padded to width 10

list("abc")          # ['a','b','c']
tuple([1, 2])        # (1, 2)
set([1, 1, 2])       # {1, 2}
dict([("a", 1)])     # {'a': 1}
list({"a": 1})       # ['a']  — iterating a dict yields KEYS

ord("A"), chr(65)    # 65 'A'
ord("a") - ord("a")  # 0 — the letter-to-index idiom for 26-slot arrays

# Safe parse
try:
    n = int(user_input)
except (ValueError, TypeError):
    n = 0`,
  },
  {
    title: '06 · Numbers, Division & Precision',
    language: 'python',
    description: 'Python ints are arbitrary precision (no overflow), but // and % floor toward negative infinity — the #1 source of off-by-one bugs when porting C/Java solutions.',
    code: `7 / 2        # 3.5   — true division, ALWAYS float
7 // 2       # 3     — floor division
-7 // 2      # -4    <-- FLOORS, unlike C/Java which give -3
7 % 3        # 1
-7 % 3       # 2     <-- sign follows the DIVISOR (Python), not the dividend
divmod(7, 2) # (3, 1) — quotient and remainder in one call
2 ** 100     # arbitrary precision, no overflow ever
pow(2, 100, 1_000_000_007)   # modular exponentiation, fast + memory-safe

abs(-5), round(2.675, 2), round(0.5), round(1.5)
# 5  2.67 (binary float!)  0  2   <-- banker's rounding: ties go to EVEN

import math
math.floor(-3.2), math.ceil(-3.2)    # -4 -3
math.isqrt(17)          # 4  — exact integer sqrt, no float error
math.gcd(12, 18), math.lcm(4, 6)     # 6 12   (lcm is 3.9+)
math.inf, -math.inf, math.nan
math.comb(5, 2), math.perm(5, 2)     # 10 20  (3.8+)
math.isclose(0.1 + 0.2, 0.3)         # True — the correct float comparison

# 0.1 + 0.2 == 0.3  ->  False. Use isclose, or Decimal for money:
from decimal import Decimal
Decimal("0.1") + Decimal("0.2") == Decimal("0.3")    # True

(10).bit_length()    # 4
(10).bit_count()     # 2   (3.10+) — popcount`,
  },

  // ─────────────────────────────────────────────────────────────
  // 2. Strings
  // ─────────────────────────────────────────────────────────────
  {
    title: '07 · Strings: Basics & Immutability',
    language: 'python',
    description: 'Strings are immutable sequences, so every "mutation" allocates a new object. That single fact drives the join-vs-+= performance rule below.',
    code: `s = "Hello, World!"
s2 = 'single quotes are identical'
multi = """spans
lines"""
raw = r"C:\\new\\table"      # backslashes stay literal — use for regex
concat = "auto" "matic"     # adjacent literals join at compile time

len(s)          # 13
s[0], s[-1]     # 'H' '!'
s * 3           # repetition
"World" in s    # True — substring test, O(n·m) worst case

# s[0] = "h"    -> TypeError: 'str' object does not support item assignment
s = "h" + s[1:] # rebuild instead

# Iteration
for ch in s: ...
for i, ch in enumerate(s): ...

# Comparison is lexicographic by code point
"apple" < "banana"      # True
"Z" < "a"               # True — uppercase sorts first (ord 'Z'=90, 'a'=97)

# Interning: short/identifier-like literals may share objects.
# NEVER compare strings with 'is'; always use ==.
a = "hi"; b = "hi"; a is b      # True here, False for runtime-built strings`,
  },
  {
    title: '08 · Slicing: The Full Grammar',
    language: 'python',
    description: 'seq[start:stop:step] applies identically to str, list, tuple, bytes and range. Slices never raise IndexError — they clamp, which makes them safe for window logic.',
    code: `s = "abcdefghij"       # indices 0..9,  negatives -10..-1

s[2:5]      # 'cde'      start inclusive, stop EXCLUSIVE
s[:3]       # 'abc'      omit start -> 0
s[7:]       # 'hij'      omit stop  -> len
s[:]        # full (shallow) copy
s[::2]      # 'acegi'    every 2nd
s[1::2]     # 'bdfhj'
s[::-1]     # 'jihgfedcba'  <-- the reverse idiom
s[::-2]     # 'jhfdb'
s[-3:]      # 'hij'      last three
s[:-3]      # 'abcdefg'  all but last three
s[5:2]      # ''         empty, NOT an error
s[100:200]  # ''         out-of-range slices clamp silently

# On lists, slices assign and delete
nums = [0, 1, 2, 3, 4, 5]
nums[1:3] = [9, 9, 9]   # length may change -> [0,9,9,9,3,4,5]
nums[::2] = [0, 0, 0, 0]  # extended slice assign must MATCH length
del nums[1:3]

# Explicit slice objects (useful when the window is computed)
window = slice(2, 5)
s[window]               # 'cde'

# Copy semantics: a list slice is a NEW shallow list
orig = [[1], [2]]
copy = orig[:]
copy[0].append(99)      # orig is affected — inner lists are shared`,
  },
  {
    title: '09 · String Methods: Search & Test',
    language: 'python',
    description: 'find returns -1 while index raises — pick by whether "missing" is an error. The is* predicates are the fast way to classify characters without regex.',
    code: `s = "  Hello, World!  "

s.find("World")      # 9   — -1 if absent
s.rfind("l")         # last occurrence, -1 if absent
s.index("World")     # 9   — raises ValueError if absent
s.count("l")         # 3   — non-overlapping
s.startswith("  He") # True; accepts a TUPLE of prefixes
s.endswith((".py", ".txt"))   # True if ANY match

t = "Hello123"
t.isalpha(), t.isdigit(), t.isalnum()      # False False True
t.isspace(), t.islower(), t.isupper()      # False False False
"3.14".isdecimal()   # False — '.' is not a decimal digit
"abc".isidentifier() # True — valid Python name

# Case
t.lower(), t.upper(), t.casefold()   # casefold is the aggressive, Unicode-correct one
t.title(), t.capitalize(), t.swapcase()
"Straße".casefold() == "strasse".casefold()   # True; .lower() would be False

# Comparison helpers for interview problems
def is_palindrome(x: str) -> bool:
    cleaned = [c.casefold() for c in x if c.isalnum()]
    return cleaned == cleaned[::-1]

def is_anagram(a: str, b: str) -> bool:
    from collections import Counter
    return Counter(a) == Counter(b)`,
  },
  {
    title: '10 · String Methods: Transform',
    language: 'python',
    description: 'Every one of these returns a NEW string. split() with no argument is special-cased to collapse all whitespace runs — that is almost always what you want for token parsing.',
    code: `s = "  a,b,,c  "

s.strip()            # 'a,b,,c'    both ends, whitespace by default
s.lstrip(), s.rstrip()
"xxhixx".strip("x")  # 'hi'  — strips any char IN the set, not a prefix
"file.txt".removeprefix("file")   # '.txt'  (3.9+) — the correct prefix strip
"file.txt".removesuffix(".txt")   # 'file'  (3.9+)

"a,b,,c".split(",")        # ['a','b','','c']  — keeps empties
"  a  b  ".split()         # ['a','b']         — no arg: collapses whitespace
"a,b,c".split(",", 1)      # ['a', 'b,c']      — maxsplit
"a,b,c".rsplit(",", 1)     # ['a,b', 'c']
"l1\\nl2\\n".splitlines()    # ['l1','l2']       — no trailing empty
"a=b=c".partition("=")     # ('a','=','b=c')   — always a 3-tuple

",".join(["a", "b"])       # 'a,b'  — the ONLY fast way to build strings
"-".join(str(n) for n in [1, 2, 3])   # '1-2-3'; join needs str, not int

"aXbXc".replace("X", "-")      # 'a-b-c'
"aXbXc".replace("X", "-", 1)   # 'a-bXc'  — count limit

# translate is the fastest bulk char map (C-level, single pass)
table = str.maketrans("abc", "xyz", "!")   # map a->x,b->y,c->z; DELETE '!'
"a!b!c".translate(table)                   # 'xyz'

"7".zfill(3)              # '007'
"hi".center(6, "*")       # '**hi**'
"hi".ljust(5, "."), "hi".rjust(5, ".")`,
  },
  {
    title: '11 · f-Strings: Format Mini-Language',
    language: 'python',
    description: 'The full spec is [[fill]align][sign][#][0][width][,][.precision][type]. Memorise the four you actually use in interviews: width, precision, comma grouping, and base conversion.',
    code: `name, pi, n = "Ada", 3.14159, 1234567

f"{name} is {len(name)} chars"      # expressions allowed inside braces
f"{pi:.2f}"          # '3.14'      fixed precision
f"{pi:8.3f}"         # '   3.142'  width 8, right-aligned (numbers default right)
f"{n:,}"             # '1,234,567' thousands separator
f"{n:_}"             # '1_234_567'
f"{0.256:.1%}"       # '25.6%'
f"{12345:.2e}"       # '1.23e+04'

# fill + align:  <  left   >  right   ^  center   =  pad after sign
f"{name:<10}|"       # 'Ada       |'
f"{name:>10}|"       # '       Ada|'
f"{name:^10}|"       # '   Ada    |'
f"{name:*^10}|"      # '***Ada****|'
f"{42:08.2f}"        # '00042.00'
f"{-42:=8}"          # '-     42'

# sign:  +  always   -  only negatives (default)   space  space for positives
f"{42:+d}", f"{42: d}"       # '+42' ' 42'

# type: b o d x X e f g % ; # adds the 0b/0o/0x prefix
f"{255:x}", f"{255:#X}", f"{255:b}", f"{255:o}"    # 'ff' '0XFF' '11111111' '377'

# Dynamic width/precision via nesting
w, p = 10, 3
f"{pi:{w}.{p}f}"     # '     3.142'

# = self-documenting debug (3.8+) — prints the EXPRESSION and its value
f"{pi=}"             # 'pi=3.14159'
f"{n * 2 = }"        # 'n * 2 = 2469134'

# !r calls repr(), !s str(), !a ascii()
f"{name!r}"          # "'Ada'"

# Literal braces
f"{{not a field}}"   # '{not a field}'

# Quote reuse inside braces requires 3.12+; below that, use a different quote.
d = {"k": 1}
f"{d['k']}"          # safe everywhere`,
  },
  {
    title: '12 · Other Formatting & Templates',
    language: 'python',
    description: 'f-strings cannot be used where the template is chosen at runtime (i18n, config files) — that is what str.format and Template are for.',
    code: `# str.format — template first, values later
tpl = "{name} scored {score:.1f}"
tpl.format(name="Ada", score=99.456)     # 'Ada scored 99.5'
"{0} {1} {0}".format("a", "b")           # 'a b a'  — positional reuse
"{d[k]}".format(d={"k": 1})              # '1'

# %-style (legacy, still all over logging)
"%s is %d" % ("Ada", 36)
"%(name)s" % {"name": "Ada"}

# logging: pass args, do NOT f-string — lazy formatting skips the cost
# when the level is disabled, and keeps messages groupable.
import logging
logging.warning("user %s failed %d times", "ada", 3)     # correct
# logging.warning(f"user {u} failed {n} times")          # eager, avoid

# string.Template — safest for untrusted templates (no attribute access)
from string import Template
Template("Hi $name").substitute(name="Ada")
Template("Hi $name").safe_substitute()   # leaves $name if missing

# textwrap for output formatting
import textwrap
textwrap.dedent("""
    indented
    block
""").strip()
textwrap.shorten("a very long sentence here", width=15)   # 'a very long...'`,
  },
  {
    title: '13 · Building Strings Efficiently',
    language: 'python',
    description: 'Because strings are immutable, += inside a loop is O(n^2). Interviewers watch for this; the list+join pattern is the expected answer.',
    code: `# WRONG — quadratic: each += copies the whole accumulated string
out = ""
for w in words:
    out += w + " "          # O(total^2)

# RIGHT — linear: collect, then join once
parts = []
for w in words:
    parts.append(w)
out = " ".join(parts)       # O(total)

# Even better when it fits a comprehension
out = " ".join(w.upper() for w in words)

# CPython has a refcount-1 optimisation that sometimes makes += look fast.
# It is an implementation detail, is not guaranteed, and disappears the moment
# another name references the string. Do not rely on it.

# Streaming / very large builds
import io
buf = io.StringIO()
for w in words:
    buf.write(w)
    buf.write(" ")
out = buf.getvalue()

# Building a char array you need to mutate in place (in-place reverse etc.)
chars = list("hello")
i, j = 0, len(chars) - 1
while i < j:
    chars[i], chars[j] = chars[j], chars[i]
    i += 1; j -= 1
"".join(chars)              # 'olleh'

# bytes for pure-ASCII hot loops
ba = bytearray(b"hello")
ba[0] = ord("H")
bytes(ba).decode()          # 'Hello'`,
  },
  {
    title: '14 · Text vs Bytes & Encoding',
    language: 'python',
    description: 'str is a sequence of Unicode code points; bytes is a sequence of 0-255 integers. Every file/network boundary is an encode/decode boundary.',
    code: `s = "café"
b = s.encode("utf-8")       # b'caf\\xc3\\xa9'
len(s), len(b)              # 4 5   <-- chars != bytes
b.decode("utf-8")           # 'café'

b[0]                        # 99  — indexing bytes gives an INT
b[0:1]                      # b'c' — slicing gives bytes

s.encode("ascii", errors="ignore")     # b'caf'
s.encode("ascii", errors="replace")    # b'caf?'
b"\\xff".decode("utf-8", errors="replace")   # '\\ufffd'

# Files: text mode encodes/decodes for you; binary mode does not.
open("f.txt", encoding="utf-8")        # ALWAYS pass encoding explicitly
open("f.bin", "rb")                    # bytes in, bytes out

import unicodedata
unicodedata.normalize("NFC", "e\\u0301") == "é"    # True — combining vs precomposed

# Common interview use: char frequency over an alphabet
counts = [0] * 26
for ch in "banana":
    counts[ord(ch) - ord("a")] += 1

import base64
base64.b64encode(b"hi")     # b'aGk='
base64.b64decode(b"aGk=")   # b'hi'`,
  },

  // ─────────────────────────────────────────────────────────────
  // 3. Lists / tuples / sets / dicts
  // ─────────────────────────────────────────────────────────────
  {
    title: '15 · Lists: Create, Access, Slice-Assign',
    language: 'python',
    description: 'A Python list is a dynamic array of pointers: O(1) index and append, O(n) insert/delete at the front. That asymmetry is why deque exists.',
    code: `xs = [1, 2, 3]
xs = list(range(5))         # [0,1,2,3,4]
xs = [0] * 5                # [0,0,0,0,0] — fine for IMMUTABLE fill values
xs = [x * x for x in range(5)]

xs[0], xs[-1]               # first, last
xs[1:3]                     # slice -> new list
# xs[99]                    -> IndexError (slices clamp, indices do NOT)

xs[0] = 99                  # in-place item assign
xs[1:3] = [7, 7, 7]         # slice assign may change length
del xs[0]
xs.clear()

# Membership is O(n) on a list — use a set when you test repeatedly
3 in [1, 2, 3]              # O(n)
3 in {1, 2, 3}              # O(1)

# Length / bounds
len(xs)
if 0 <= i < len(xs): ...    # explicit bounds check

# Negative indices wrap; this is why xs[-1] never needs len()
xs = [1, 2, 3]
xs[-1], xs[len(xs) - 1]     # identical

# Unpacking with a guaranteed arity
head, *tail = xs            # 1 [2,3]
*init, last = xs            # [1,2] 3

# Comparison is element-wise lexicographic
[1, 2] < [1, 3]             # True
[1, 2] < [1, 2, 0]          # True — shorter prefix sorts first`,
  },
  {
    title: '16 · Lists: Add, Remove & Their Costs',
    language: 'python',
    description: 'append/pop at the end are amortised O(1); insert(0, x) and pop(0) are O(n) because every element shifts. Memorise this table.',
    code: `xs = [1, 2, 3]

xs.append(4)        # O(1) amortised — add ONE item at the end
xs.extend([5, 6])   # O(k) — add many;  xs += [5,6] is the same
xs.insert(0, 0)     # O(n) <-- shifts everything right
xs = [0] + xs       # O(n) too, and allocates a new list

xs.pop()            # O(1) — remove & RETURN last
xs.pop(0)           # O(n) <-- use collections.deque if you need this often
xs.remove(3)        # O(n) — removes FIRST occurrence by VALUE; ValueError if absent
del xs[2]           # O(n) — by index, returns nothing
xs.clear()          # O(n)

xs.index(2)         # O(n), ValueError if absent
xs.count(2)         # O(n)

# COST SUMMARY (n = len)
#   xs[i]        O(1)      xs.append(v)   O(1)*    xs.pop()     O(1)
#   xs[i] = v    O(1)      xs.insert(0,v) O(n)     xs.pop(0)    O(n)
#   v in xs      O(n)      xs.remove(v)   O(n)     len(xs)      O(1)
#   xs[a:b]      O(b-a)    xs.sort()      O(n log n)
#   min/max/sum  O(n)      xs.reverse()   O(n)     xs.copy()    O(n)

# Removing while iterating is a classic bug — iterate a COPY or rebuild
xs = [1, 2, 3, 4]
xs = [v for v in xs if v % 2]        # correct
# for v in xs:  xs.remove(v)         # skips elements — never do this`,
  },
  {
    title: '17 · Lists: Sorting, Keys & Stability',
    language: 'python',
    description: 'Timsort is stable, which lets you sort by a secondary key first, then a primary key, to get multi-level ordering without a composite key function.',
    code: `xs = [3, 1, 2]
xs.sort()                     # IN PLACE, returns None
ys = sorted(xs)               # returns a NEW list, works on any iterable
xs.sort(reverse=True)

words = ["banana", "kiwi", "apple"]
sorted(words, key=len)                       # by length
sorted(words, key=str.lower)                 # case-insensitive
sorted(words, key=lambda w: (len(w), w))     # length, then alphabetical

people = [("ada", 36), ("bob", 25), ("cy", 36)]
sorted(people, key=lambda p: p[1])                    # age asc
sorted(people, key=lambda p: (-p[1], p[0]))           # age DESC, name asc
from operator import itemgetter
sorted(people, key=itemgetter(1, 0))                  # faster than lambda

# Mixed directions on NON-numeric keys: exploit stability — sort by the
# LEAST significant key first, then the most significant.
rows = sorted(people, key=itemgetter(0))              # name asc
rows = sorted(rows, key=itemgetter(1), reverse=True)  # then age desc, ties keep name order

# Custom objects: give them __lt__, or pass a key
from functools import cmp_to_key
def cmp(a, b):  return (a > b) - (a < b)
sorted([3, 1, 2], key=cmp_to_key(cmp))       # port of a C++/Java comparator

xs.reverse()                  # in place, O(n)
list(reversed(xs))            # new list via iterator
sorted(xs)[::-1]              # works but allocates twice — prefer reverse=True`,
  },
  {
    title: '18 · Comprehensions (List / Set / Dict / Gen)',
    language: 'python',
    description: 'Read left to right as nested for-loops. The condition after the for filters; a conditional expression before the for transforms — a distinction people get backwards.',
    code: `nums = range(10)

[x * x for x in nums]                       # list
{x % 3 for x in nums}                       # set
{x: x * x for x in nums}                    # dict
(x * x for x in nums)                       # GENERATOR — lazy, no list built

# Filter goes AFTER the for
[x for x in nums if x % 2 == 0]

# Transform with a conditional goes BEFORE the for (needs else)
["even" if x % 2 == 0 else "odd" for x in nums]

# Both together
[x * 2 for x in nums if x > 3]

# Nested loops: same order as the written-out for statements
matrix = [[1, 2], [3, 4]]
[v for row in matrix for v in row]          # flatten -> [1,2,3,4]
# for row in matrix:
#     for v in row:

# Nested comprehension (a comprehension as the element)
[[v * 2 for v in row] for row in matrix]    # [[2,4],[6,8]]

# Walrus lets you reuse an expensive computation
[y for x in nums if (y := x * x) > 20]

# Comprehensions have their OWN scope — the loop var does not leak (Python 3)
x = "safe"
[x for x in range(3)]
x                                            # still 'safe'

# When to use a generator instead: huge/infinite input, or you only need
# to consume once.  sum(x*x for x in range(10**7)) allocates nothing.`,
  },
  {
    title: '19 · 2D Grids: The Aliasing Trap',
    language: 'python',
    description: 'The most common Python bug in a DP or matrix interview. [[0]*m]*n creates n references to ONE row, so writing one cell writes a whole column.',
    code: `n, m = 3, 4

# WRONG — every row is the SAME list object
grid = [[0] * m] * n
grid[0][0] = 1
grid            # [[1,0,0,0], [1,0,0,0], [1,0,0,0]]   <-- all rows changed
grid[0] is grid[1]      # True

# RIGHT — a fresh list per row
grid = [[0] * m for _ in range(n)]
grid[0][0] = 1
grid            # [[1,0,0,0], [0,0,0,0], [0,0,0,0]]

# The same trap with dicts / sets
buckets = [set() for _ in range(n)]     # correct
# buckets = [set()] * n                 # wrong

# [0] * m is SAFE because ints are immutable — you can never mutate one
row = [0] * m
row[0] = 1                              # rebinds the slot, no aliasing

# Access, dimensions, iteration
rows, cols = len(grid), len(grid[0])
for r in range(rows):
    for c in range(cols):
        grid[r][c]

for r, row in enumerate(grid):
    for c, val in enumerate(row):
        ...

# Transpose / rotate
list(zip(*grid))                        # transpose -> list of TUPLES
[list(t) for t in zip(*grid)]           # transpose -> list of lists
[list(t) for t in zip(*grid[::-1])]     # rotate 90° clockwise
[list(t) for t in zip(*grid)][::-1]     # rotate 90° counter-clockwise

# Deep copy of a grid
import copy
snapshot = copy.deepcopy(grid)
snapshot = [row[:] for row in grid]     # faster for a flat 2D grid`,
  },
  {
    title: '20 · Tuples, Unpacking & NamedTuple',
    language: 'python',
    description: 'Tuples are immutable and hashable, which makes them the default key type for memoisation, visited-sets and heap entries.',
    code: `t = (1, 2, 3)
t = 1, 2, 3                 # parens optional
single = (1,)               # <-- the trailing comma makes it a tuple
empty = ()

t[0], t[-1], t[1:]          # index and slice like a list
# t[0] = 9                  -> TypeError (immutable)
len(t), 2 in t, t.count(2), t.index(2)
t + (4,)                    # concatenation makes a NEW tuple
t * 2

a, b, c = t                 # unpack (arity must match)
a, *rest = t                # star unpack
for i, (x, y) in enumerate([(1, 2), (3, 4)]):    # nested unpack in a loop
    ...

def min_max(xs):
    return min(xs), max(xs)          # returning a tuple == "multiple returns"
lo, hi = min_max([3, 1, 2])

# Hashable -> usable as dict key / set member / heap entry
seen = {(0, 0), (1, 2)}
memo = {}
memo[(r, c, k)] = 42
# A tuple containing a LIST is not hashable.

from collections import namedtuple
Point = namedtuple("Point", "x y")
p = Point(1, 2)
p.x, p[0], p._replace(x=9), p._asdict()

from typing import NamedTuple
class Node(NamedTuple):     # typed, still a tuple — sorts/compares field-wise
    dist: int
    name: str
sorted([Node(2, "b"), Node(1, "a")])       # sorts by dist, then name`,
  },
  {
    title: '21 · Sets & Frozensets',
    language: 'python',
    description: 'O(1) membership is the reason sets show up in almost every optimised interview answer. They are unordered and hold only hashable elements.',
    code: `s = {1, 2, 3}
s = set([1, 1, 2])          # {1, 2} — dedupe
empty = set()               # NOT {} — that is an empty dict

s.add(4)                    # O(1)
s.update([5, 6])            # add many
s.discard(9)                # O(1), no error if absent
s.remove(9)                 # KeyError if absent
s.pop()                     # removes an ARBITRARY element
s.clear()

3 in s                      # O(1) average  <-- the whole point
len(s)

a, b = {1, 2, 3}, {3, 4}
a | b        # union            {1,2,3,4}     a.union(b)
a & b        # intersection     {3}           a.intersection(b)
a - b        # difference       {1,2}         a.difference(b)
a ^ b        # symmetric diff   {1,2,4}
a <= b       # subset           a.issubset(b)
a >= b       # superset
a.isdisjoint(b)

# The operator forms require BOTH sides to be sets; the method forms
# accept any iterable:  a.union([3, 4]) works, a | [3, 4] does not.

# In-place variants: |=  &=  -=  ^=
seen = set()
for x in stream:
    if x in seen: continue
    seen.add(x)

# frozenset is hashable -> can be a dict key or a set element
groups = {frozenset({1, 2}): "pair"}

{x * x for x in range(5)}   # set comprehension
sorted(s)                   # sets have NO order; sort when you need one`,
  },
  {
    title: '22 · Dicts: Access & Safe Defaults',
    language: 'python',
    description: 'get/setdefault/defaultdict are three answers to "key might be missing" — get for reads, setdefault for one-off inserts, defaultdict when it happens in a loop.',
    code: `d = {"a": 1, "b": 2}
d = dict(a=1, b=2)
d = dict([("a", 1)])
d = {k: v for k, v in pairs}

d["a"]                # 1;  KeyError if absent
d.get("z")            # None — never raises
d.get("z", 0)         # 0    — supply a default
d["c"] = 3            # insert or overwrite
d.setdefault("c", []) # returns existing value, or inserts+returns the default

"a" in d              # O(1) key test  (NOT a value test)
len(d)

d.pop("a")            # remove & return; KeyError if absent
d.pop("z", None)      # ...unless you give a default
d.popitem()           # remove & return the LAST inserted pair (3.7+)
del d["b"]
d.clear()

# Counting / grouping without defaultdict
counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1

groups = {}
for w in words:
    groups.setdefault(len(w), []).append(w)

# CAUTION: setdefault always EVALUATES its default, even on a hit.
# d.setdefault(k, expensive())  calls expensive() every time.

# Merge
{**a, **b}            # b wins on conflicts
a | b                 # 3.9+, same semantics
a |= b                # in place;  a.update(b) is equivalent`,
  },
  {
    title: '23 · Dicts: Iteration, Order & Sorting',
    language: 'python',
    description: 'Insertion order has been guaranteed since 3.7. The views (.keys/.values/.items) are live — they reflect later mutations and must not be mutated during iteration.',
    code: `d = {"b": 2, "a": 1, "c": 3}

for k in d: ...                 # iterates KEYS
for k in d.keys(): ...          # explicit, same thing
for v in d.values(): ...
for k, v in d.items(): ...      # the one you want 95% of the time

list(d)                         # ['b','a','c'] — keys, in insertion order
list(d.values()), list(d.items())

# Views are LIVE windows, not snapshots
ks = d.keys()
d["z"] = 0
len(ks)                         # 4 — it saw the insert

# Mutating size during iteration -> RuntimeError. Iterate a snapshot:
for k in list(d):
    if d[k] < 2:
        del d[k]

# Sorting
sorted(d)                                   # keys ascending
sorted(d.items(), key=lambda kv: kv[1])     # by value
sorted(d.items(), key=lambda kv: (-kv[1], kv[0]))   # value desc, key asc
max(d, key=d.get)                           # key with the largest value
dict(sorted(d.items()))                     # a NEW, key-ordered dict

# Invert (values must be hashable and unique-ish)
{v: k for k, v in d.items()}

# Keys views support set algebra
d.keys() & {"a", "z"}           # {'a'}
d.keys() - other.keys()

# Nested access without a KeyError chain
cfg = {"db": {"host": "x"}}
cfg.get("db", {}).get("port", 5432)         # 5432`,
  },
  {
    title: '24 · Copying: Assign vs Shallow vs Deep',
    language: 'python',
    description: 'Assignment binds a second name to the SAME object. Shallow copy duplicates the container but shares the children. Only deepcopy is fully independent.',
    code: `import copy

orig = [[1, 2], [3, 4]]

alias   = orig                  # SAME object — no copy at all
shallow = orig[:]               # new outer list, SHARED inner lists
shallow = list(orig)            # same
shallow = copy.copy(orig)       # same
deep    = copy.deepcopy(orig)   # fully independent

orig[0].append(99)
alias                           # [[1,2,99],[3,4]]  changed
shallow                         # [[1,2,99],[3,4]]  ALSO changed
deep                            # [[1,2],[3,4]]     safe

orig.append([5])
alias                           # changed
shallow                         # NOT changed — outer list is separate

# Same rules for dicts and sets
d = {"k": [1]}
d.copy()["k"].append(2)         # mutates d["k"] too

# Fast idiomatic copies
row_copy  = row[:]                       # 1-D list
grid_copy = [row[:] for row in grid]     # 2-D grid, faster than deepcopy
dict_copy = dict(d)
set_copy  = set(s)

# Function arguments are passed by OBJECT REFERENCE
def bad(xs):  xs.append(1)      # mutates the caller's list
def good(xs): return xs + [1]   # returns a new list

# deepcopy handles cycles correctly but is slow — avoid it inside hot loops.
# For plain JSON-ish data, json.loads(json.dumps(x)) is often faster.`,
  },

  // ─────────────────────────────────────────────────────────────
  // 4. Flow control, loops, functions
  // ─────────────────────────────────────────────────────────────
  {
    title: '25 · Conditionals & Ternary',
    language: 'python',
    description: 'Python has no switch before 3.10 — the dict-dispatch idiom below is what replaced it, and it is still the fastest option for simple value mapping.',
    code: `n = 200
if n > 100:
    label = "big"
elif n > 10:
    label = "medium"
else:
    label = "small"

# Conditional expression (ternary): VALUE if COND else VALUE
label = "big" if n > 100 else "small"
label = "big" if n > 100 else "medium" if n > 10 else "small"   # chainable

# Guard-clause style beats deep nesting
def process(user):
    if user is None:
        return None
    if not user.active:
        return None
    return user.name

# Chained comparison — evaluates the middle once, short-circuits
if 0 <= i < len(xs) and xs[i] > 0: ...

# Dict dispatch instead of a long elif chain
handlers = {"add": lambda a, b: a + b, "mul": lambda a, b: a * b}
handlers.get(op, lambda *_: None)(2, 3)

# pass / ... as a no-op body
if debug:
    pass

# Single-line bodies are legal but discouraged
if n: print(n)`,
  },
  {
    title: '26 · match-case: Structural Pattern Matching',
    language: 'python',
    description: 'Python 3.10+. Not a switch — it destructures. Capture patterns bind names, so a bare name always matches; use dotted names or literals for constants.',
    code: `# Requires Python 3.10+
def handle(command):
    match command:
        case "quit" | "exit":                 # OR pattern
            return "bye"
        case ["move", direction]:             # sequence pattern, BINDS direction
            return f"moving {direction}"
        case ["move", direction, int(n)]:     # with a type guard
            return f"moving {direction} x{n}"
        case {"action": "set", "key": k, "value": v}:   # mapping pattern
            return f"{k}={v}"                 # extra dict keys are allowed
        case Point(x=0, y=0):                 # class pattern
            return "origin"
        case Point(x=x, y=y) if x == y:       # guard
            return "diagonal"
        case [first, *rest]:                  # star capture
            return f"{first} + {len(rest)} more"
        case _:                               # wildcard, does NOT bind
            return "unknown"

# GOTCHA: a bare lowercase name is a CAPTURE, matching everything.
MAX = 10
match n:
    # case MAX:        # WRONG — binds n to MAX, always matches
    case 10: ...        # right: literal
    case config.MAX: ...  # right: dotted name is a value pattern

from dataclasses import dataclass
@dataclass
class Point:
    x: int
    y: int

# Positional class patterns need __match_args__ (dataclasses set it for free)
match Point(0, 5):
    case Point(0, y): print(f"on the y-axis at {y}")`,
  },
  {
    title: '27 · Loops: for, while, range',
    language: 'python',
    description: 'range is a lazy sequence object, not a list — range(10**9) costs O(1) memory. Prefer iterating the object directly over indexing by range(len(...)).',
    code: `for x in [1, 2, 3]: ...
for ch in "abc": ...
for k, v in d.items(): ...

range(5)            # 0..4
range(2, 5)         # 2,3,4
range(0, 10, 2)     # 0,2,4,6,8
range(5, 0, -1)     # 5,4,3,2,1  — countdown
len(range(10**9))   # 1000000000 — O(1), nothing materialised
list(range(3))      # [0,1,2] when you actually need a list
7 in range(0, 10, 2)   # O(1) — range membership is computed, not scanned

for _ in range(3):  # _ = "I do not use this"
    ...

# Prefer direct iteration
for x in xs: ...                    # good
for i in range(len(xs)): xs[i]      # only when you truly need the index

i = 0
while i < len(xs):
    i += 1

while True:
    if done: break                  # the idiomatic do-while

# break / continue / else
for x in xs:
    if x < 0:
        continue                    # skip to next iteration
    if x == target:
        break                       # exit, SKIPS the else
else:
    print("loop finished without break")     # runs only if no break fired

# The for/else search idiom (no found-flag needed)
for p in primes:
    if n % p == 0:
        break
else:
    print(f"{n} is prime")`,
  },
  {
    title: '28 · Loop Helpers: enumerate, zip, reversed',
    language: 'python',
    description: 'These three eliminate almost every manual index variable. zip stops at the shortest input silently — strict=True (3.10+) turns that into an error.',
    code: `xs = ["a", "b", "c"]

for i, x in enumerate(xs):          # 0 a / 1 b / 2 c
    ...
for i, x in enumerate(xs, start=1): # 1-based
    ...

names, ages = ["ada", "bob"], [36, 25]
for n, a in zip(names, ages): ...
dict(zip(names, ages))              # {'ada':36,'bob':25}

# zip TRUNCATES to the shortest — a silent bug source
list(zip([1, 2, 3], [1, 2]))            # [(1,1),(2,2)]
list(zip([1, 2, 3], [1, 2], strict=True))   # ValueError (3.10+)

from itertools import zip_longest
list(zip_longest([1, 2, 3], [1], fillvalue=0))   # [(1,1),(2,0),(3,0)]

# Unzip
pairs = [(1, "a"), (2, "b")]
nums, letters = zip(*pairs)         # (1,2) ('a','b')

for x in reversed(xs): ...          # lazy, O(1) memory
for i in range(len(xs) - 1, -1, -1): ...   # index countdown
for i, x in reversed(list(enumerate(xs))): ...   # index + value, backwards

# Adjacent pairs (3.10+)
from itertools import pairwise
list(pairwise([1, 2, 3, 4]))        # [(1,2),(2,3),(3,4)]

# Sliding window over indices
for i in range(len(xs) - k + 1):
    window = xs[i:i + k]

# Iterate two collections in lockstep with their index
for i, (n, a) in enumerate(zip(names, ages)): ...`,
  },
  {
    title: '29 · Functions: Parameters & Arguments',
    language: 'python',
    description: 'The / and * markers in a signature are the underused half of Python function definitions — they let you evolve an API without breaking callers.',
    code: `def greet(name, greeting="Hello"):        # default parameter
    return f"{greeting}, {name}!"

greet("Ada")                    # positional
greet(name="Ada")               # keyword
greet("Ada", greeting="Hi")     # mixed — positionals must come first

def f(*args, **kwargs):
    # args   -> tuple of extra positionals
    # kwargs -> dict of extra keywords
    return args, kwargs

f(1, 2, a=3)                    # ((1,2), {'a':3})

xs, opts = [1, 2], {"a": 3}
f(*xs, **opts)                  # unpack at the CALL site

# Positional-only (before /) and keyword-only (after *)
def clamp(x, lo, hi, /, *, strict=False):
    ...
clamp(5, 0, 10, strict=True)
# clamp(x=5, lo=0, hi=10)       -> TypeError: positional-only

# Keyword-only without extra positionals
def connect(host, *, port=5432, timeout=30): ...
connect("db", port=6432)

# Multiple return values = a tuple
def divmod2(a, b):
    return a // b, a % b
q, r = divmod2(7, 2)

# Type hints (3.9+ builtin generics, 3.10+ union syntax)
def top_k(nums: list[int], k: int = 3) -> list[int]:
    return sorted(nums, reverse=True)[:k]

def find(xs: list[int], t: int) -> int | None: ...

from typing import Optional, Callable, Iterable, Any, TypeVar
T = TypeVar("T")
def first(xs: Iterable[T], pred: Callable[[T], bool]) -> Optional[T]:
    return next((x for x in xs if pred(x)), None)`,
  },
  {
    title: '30 · The Mutable Default Argument Trap',
    language: 'python',
    description: 'Defaults are evaluated ONCE at definition time, so a mutable default is shared across every call. This is the most-asked Python gotcha in interviews.',
    code: `# WRONG — the same list is reused forever
def add_item(item, basket=[]):
    basket.append(item)
    return basket

add_item("a")       # ['a']
add_item("b")       # ['a', 'b']   <-- not a fresh list!
add_item.__defaults__               # ([ 'a', 'b' ],) — proof it is shared

# RIGHT — None sentinel, build inside
def add_item(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket

# Same trap with dicts, sets, and any object built at def time
def f(cache={}): ...            # shared
def g(when=datetime.now()): ... # frozen at import time!

# Sometimes the sharing is INTENTIONAL — a memo cache:
def fib(n, memo={}):
    if n < 2: return n
    if n not in memo:
        memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]
# ...but functools.cache is clearer and thread-safe.

# A distinct sentinel when None is a legal value
_MISSING = object()
def get(key, default=_MISSING):
    if default is _MISSING:
        raise KeyError(key)
    return default`,
  },
  {
    title: '31 · Lambdas, Closures & Late Binding',
    language: 'python',
    description: 'A lambda is a single-expression function. Closures capture the VARIABLE, not its value at creation — the loop-in-lambda bug follows directly.',
    code: `square = lambda x: x * x            # legal, but prefer def for named funcs
sorted(pairs, key=lambda p: p[1])   # the real use: inline key/callback

# Closure — inner function keeps a reference to the enclosing scope
def make_counter():
    count = 0
    def inc():
        nonlocal count              # without this, count = ... makes a LOCAL
        count += 1
        return count
    return inc

c = make_counter()
c(); c()                            # 1 2

# LATE BINDING: all three lambdas see the FINAL i
fs = [lambda: i for i in range(3)]
[f() for f in fs]                   # [2, 2, 2]   <-- surprise

# Fix 1: bind now via a default argument
fs = [lambda i=i: i for i in range(3)]
[f() for f in fs]                   # [0, 1, 2]

# Fix 2: functools.partial
from functools import partial
fs = [partial(lambda i: i, i) for i in range(3)]

# Scope resolution order: LEGB
#   Local -> Enclosing -> Global -> Builtins
x = "global"
def outer():
    x = "enclosing"
    def inner():
        # global x     -> rebinds the module-level name
        # nonlocal x   -> rebinds the enclosing name
        return x
    return inner()

# Reading a global is fine; ASSIGNING to it inside a function makes it local
# unless you declare 'global'.`,
  },

  // ─────────────────────────────────────────────────────────────
  // 5. Modules, files, OOP, errors
  // ─────────────────────────────────────────────────────────────
  {
    title: '32 · Modules, Imports & Packages',
    language: 'python',
    description: 'Wildcard imports hide name origins and break linters; import the module or the specific names. Circular imports are almost always a design smell.',
    code: `import math                          # module
import numpy as np                   # alias
from math import pi, sqrt            # specific names
from math import sqrt as square_root
from . import sibling                # relative (inside a package only)
from .models import User
# from math import *                 # avoid — pollutes the namespace

math.pi
dir(math)                            # every public name
help(math.sqrt)
math.__file__, math.__name__

import sys
sys.path                             # the module search path
sys.modules                          # already-imported module cache
sys.version_info >= (3, 10)          # version gate

# A package is a directory; __init__.py makes it explicit (optional since 3.3)
#   mypkg/
#     __init__.py       <- runs on 'import mypkg'
#     core.py
#     util/__init__.py

# Lazy / optional dependency
try:
    import ujson as json
except ImportError:
    import json

# importlib for dynamic imports
import importlib
mod = importlib.import_module("json")
importlib.reload(mod)

# Module-level code runs ONCE, on first import, and is cached.
# Guard anything with side effects behind 'if __name__ == "__main__":'

# Standard-library heavy hitters worth knowing by name:
#   collections  itertools  functools  heapq  bisect  math  re  json
#   os  sys  pathlib  datetime  random  typing  dataclasses  enum
#   statistics  decimal  fractions  copy  string  textwrap  unittest`,
  },
  {
    title: '33 · File Handling: Read & Write',
    language: 'python',
    description: 'Always use `with` — it closes the handle even on an exception. Always pass encoding explicitly; the platform default differs between Windows and Linux.',
    code: `# READ whole file
with open("f.txt", encoding="utf-8") as fh:
    text = fh.read()

# READ line by line — streaming, O(1) memory for a huge file
with open("f.txt", encoding="utf-8") as fh:
    for line in fh:                  # keeps the trailing newline
        process(line.rstrip("\\n"))

with open("f.txt", encoding="utf-8") as fh:
    lines = fh.read().splitlines()   # no trailing newlines
    # fh.readlines()                 # keeps them

# WRITE  ("w" truncates, "a" appends, "x" fails if it exists)
with open("out.txt", "w", encoding="utf-8") as fh:
    fh.write("line\\n")
    fh.writelines([f"{i}\\n" for i in range(3)])
    print("also works", file=fh)

# BINARY
with open("img.png", "rb") as fh:
    blob = fh.read()

# Multiple files in one with
with open("a.txt") as a, open("b.txt", "w") as b:
    b.write(a.read())

# Seek / tell
with open("f.txt", "rb") as fh:
    fh.seek(0, 2)      # 0=start, 1=current, 2=end
    size = fh.tell()
    fh.seek(0)

# JSON / CSV
import json, csv
with open("d.json", encoding="utf-8") as fh:
    data = json.load(fh)
with open("d.json", "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2, ensure_ascii=False)

with open("d.csv", newline="", encoding="utf-8") as fh:
    for row in csv.DictReader(fh):
        print(row["name"])`,
  },
  {
    title: '34 · Paths: pathlib, os & Deletion',
    language: 'python',
    description: 'pathlib replaces most of os.path with an object API that handles separators for you. Prefer missing_ok / exist_ok over try-except for the common cases.',
    code: `from pathlib import Path

p = Path("data") / "raw" / "f.txt"    # / operator joins, OS-correct
p.name, p.stem, p.suffix             # 'f.txt' 'f' '.txt'
p.parent, p.parents[1]
p.absolute(), p.resolve()            # resolve() follows symlinks
Path.cwd(), Path.home()

p.exists(), p.is_file(), p.is_dir()
p.stat().st_size                     # bytes
p.read_text(encoding="utf-8")        # whole-file convenience
p.write_text("hi", encoding="utf-8")
p.read_bytes(), p.write_bytes(b"hi")

Path("out").mkdir(parents=True, exist_ok=True)   # mkdir -p
p.rename("new.txt")
p.unlink(missing_ok=True)            # delete a FILE (3.8+ for missing_ok)
Path("emptydir").rmdir()             # only if empty

import shutil
shutil.rmtree("tree", ignore_errors=True)   # recursive delete — DESTRUCTIVE
shutil.copy("a", "b"); shutil.move("a", "b")
shutil.disk_usage("/")

list(Path(".").glob("*.py"))         # non-recursive
list(Path(".").rglob("*.py"))        # recursive
[f for f in Path(".").iterdir() if f.is_file()]

import os
os.getcwd(); os.listdir(".")
os.environ.get("HOME", "/tmp")
os.path.join("a", "b"); os.path.exists("f")   # the pre-pathlib API
for root, dirs, files in os.walk("."): ...

import tempfile
with tempfile.TemporaryDirectory() as td:     # auto-cleaned
    Path(td, "scratch.txt").write_text("x")`,
  },
  {
    title: '35 · Classes: Definition & Attributes',
    language: 'python',
    description: 'Class variables are shared by every instance; instance variables live in self.__dict__. Mixing them up produces the mutable-class-attribute bug.',
    code: `class Dog:
    species = "Canis familiaris"        # CLASS variable — shared by all

    def __init__(self, name, age):      # constructor
        self.name = name                # INSTANCE variables
        self.age = age

    def speak(self, sound="Woof"):      # instance method
        return f"{self.name} says {sound}"

    @classmethod                        # gets the CLASS — used for factories
    def from_string(cls, s):
        name, age = s.split(",")
        return cls(name, int(age))

    @staticmethod                       # plain function in the class namespace
    def is_adult(age):
        return age >= 2

    @property                           # computed attribute, read like data
    def human_years(self):
        return self.age * 7

    @human_years.setter
    def human_years(self, v):
        self.age = v // 7

d = Dog("Rex", 3)
d.speak(); d.human_years; Dog.from_string("Rex,3"); Dog.is_adult(3)

# The mutable class-attribute trap
class Bad:
    tricks = []                         # SHARED across instances
    def learn(self, t): self.tricks.append(t)
class Good:
    def __init__(self): self.tricks = []   # per-instance

# Conventions: _internal (soft private), __mangled (name-mangled to
# _Class__mangled, not truly private)
d.__dict__                              # instance attributes
isinstance(d, Dog), issubclass(Dog, object)
getattr(d, "name", None); setattr(d, "name", "Rex"); hasattr(d, "tail")

class Slim:                             # __slots__ removes __dict__:
    __slots__ = ("x", "y")              # less memory, no new attributes`,
  },
  {
    title: '36 · Dunder Methods You Actually Need',
    language: 'python',
    description: 'Implementing __lt__ lets your objects go straight into sorted() and heapq. __eq__ without __hash__ makes a class unhashable — a subtle break.',
    code: `from functools import total_ordering

@total_ordering                 # fills in <=, >, >= from __lt__ and __eq__
class Task:
    def __init__(self, pri, name):
        self.pri, self.name = pri, name

    def __repr__(self):         # unambiguous, for DEVELOPERS (debuggers, REPL)
        return f"Task({self.pri!r}, {self.name!r})"

    def __str__(self):          # readable, for USERS; falls back to __repr__
        return f"{self.name} (p{self.pri})"

    def __eq__(self, other):
        if not isinstance(other, Task): return NotImplemented
        return (self.pri, self.name) == (other.pri, other.name)

    def __hash__(self):         # REQUIRED: defining __eq__ sets __hash__ = None
        return hash((self.pri, self.name))

    def __lt__(self, other):    # unlocks sorted(), min(), max(), heapq
        return self.pri < other.pri

    def __len__(self):          # len(obj)  — also drives truthiness if no __bool__
        return 1

    def __iter__(self):         # for x in obj
        yield self.pri; yield self.name

    def __contains__(self, x):  # x in obj
        return x in (self.pri, self.name)

    def __getitem__(self, i):   # obj[i]  — also enables iteration as a fallback
        return (self.pri, self.name)[i]

    def __call__(self, *a):     # obj()
        return self.name

    def __bool__(self):         # if obj:
        return self.pri > 0

import heapq
heapq.heappush([], Task(1, "a"))        # works because of __lt__
sorted([Task(2, "b"), Task(1, "a")])

# Other useful ones: __add__ __sub__ __mul__ __enter__/__exit__ (context
# manager), __next__ (iterator), __format__ (f-string spec), __init_subclass__`,
  },
  {
    title: '37 · Inheritance, super() & MRO',
    language: 'python',
    description: 'super() follows the method resolution order, not the literal parent — which is why cooperative multiple inheritance works only if every class calls super().',
    code: `class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        raise NotImplementedError            # abstract-ish

class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)               # ALWAYS call the parent __init__
        self.breed = breed
    def speak(self):                         # override
        return f"{self.name}: Woof"

class Puppy(Dog):
    def speak(self):
        return super().speak() + " (squeaky)"   # extend, don't replace

# Polymorphism — one loop, many types
for a in [Dog("Rex", "lab"), Puppy("Bit", "pug")]:
    print(a.speak())

# Multiple inheritance & MRO (C3 linearisation)
class A:
    def go(self): return "A"
class B(A):
    def go(self): return "B" + super().go()
class C(A):
    def go(self): return "C" + super().go()
class D(B, C): pass

D().go()            # 'BCA'  — B, then C, then A
D.__mro__           # (D, B, C, A, object)
D.mro()

# Abstract base classes — enforce the contract at instantiation time
from abc import ABC, abstractmethod
class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...
    def describe(self):                      # concrete methods are allowed
        return f"area={self.area()}"

class Circle(Shape):
    def __init__(self, r): self.r = r
    def area(self): return 3.14159 * self.r ** 2

# Shape()          -> TypeError: Can't instantiate abstract class
isinstance(Circle(1), Shape)     # True

# Prefer COMPOSITION when the relationship is "has-a", not "is-a".`,
  },
  {
    title: '38 · dataclasses & enum',
    language: 'python',
    description: 'A dataclass writes __init__, __repr__, __eq__ (and optionally ordering) for you. frozen=True makes instances hashable and safe as dict keys.',
    code: `from dataclasses import dataclass, field, asdict, replace

@dataclass
class Point:
    x: int
    y: int = 0                              # defaults come last
    tags: list[str] = field(default_factory=list)   # NEVER  tags: list = []

p = Point(1, 2)
p                                            # Point(x=1, y=2, tags=[])
p == Point(1, 2)                             # True — __eq__ generated
asdict(p); replace(p, x=9)

@dataclass(frozen=True, slots=True)          # slots is 3.10+
class Key:
    a: int
    b: str
{Key(1, "x"): "value"}                       # hashable because frozen

@dataclass(order=True)                       # generates <, <=, >, >=
class Ranked:
    score: int
    name: str = field(compare=False)         # excluded from ordering/equality
sorted([Ranked(2, "b"), Ranked(1, "a")])

def __post_init__(self): ...                 # validation hook

from enum import Enum, IntEnum, auto, StrEnum
class Color(Enum):
    RED = auto()
    GREEN = auto()

Color.RED, Color.RED.name, Color.RED.value, Color("RED" and 1)
list(Color)                                  # iterable
Color.RED in Color                           # True

class Status(IntEnum):                       # compares equal to ints
    OK = 200
    NOT_FOUND = 404
Status.OK == 200                             # True

class Env(StrEnum):                          # 3.11+, compares equal to str
    PROD = "prod"`,
  },
  {
    title: '39 · Exceptions: Handling & Raising',
    language: 'python',
    description: 'Catch the narrowest exception you can. `raise ... from e` preserves the original traceback — dropping it is the difference between a debuggable and an opaque failure.',
    code: `try:
    val = int(text)
    result = 10 / val
except ValueError as e:                 # narrow first
    print(f"bad input: {e}")
except ZeroDivisionError:
    result = float("inf")
except (KeyError, IndexError) as e:     # group related handlers
    raise
except Exception as e:                  # broad last; NEVER a bare 'except:'
    logging.exception("unexpected")     # logs with traceback
    raise                               # re-raise, keep the traceback
else:
    print("no exception fired")         # runs only if try succeeded
finally:
    cleanup()                           # ALWAYS runs, even on return/raise

raise ValueError("must be positive")
raise ValueError(f"got {n}") from e     # chain: preserves the cause
raise                                   # bare re-raise inside an except block

# Custom hierarchy — one base per library so callers can catch broadly
class AppError(Exception): ...
class NotFound(AppError):
    def __init__(self, key):
        super().__init__(f"missing: {key}")
        self.key = key

try:
    raise NotFound("user:1")
except AppError as e:
    print(e.key if isinstance(e, NotFound) else e)

# EAFP (ask forgiveness) is idiomatic Python; LBYL (look before you leap)
# is only better when the exception path is the common case.
try:                    val = d[k]          # EAFP
except KeyError:        val = default
val = d.get(k, default)                     # simplest of all

# Cheap guards
assert n > 0, "n must be positive"          # stripped by python -O; not for validation

# Exception groups (3.11+)
# try: ...
# except* ValueError as eg: ...`,
  },
  {
    title: '40 · Context Managers & with',
    language: 'python',
    description: 'Any object with __enter__/__exit__ works with `with`. contextlib.contextmanager turns a generator into one, which is the shortest way to write setup/teardown.',
    code: `with open("f.txt") as fh:               # closed even if the body raises
    data = fh.read()

with open("a") as a, open("b") as b:   # multiple
    ...

# Class-based
class Timer:
    def __enter__(self):
        import time; self.t = time.perf_counter()
        return self                     # bound to the 'as' name
    def __exit__(self, exc_type, exc, tb):
        import time
        self.elapsed = time.perf_counter() - self.t
        return False                    # False -> propagate any exception
                                        # True  -> SUPPRESS it

with Timer() as t:
    heavy()
print(t.elapsed)

# Generator-based — everything before yield is setup, after is teardown
from contextlib import contextmanager
@contextmanager
def temp_value(obj, attr, value):
    old = getattr(obj, attr)
    setattr(obj, attr, value)
    try:
        yield old
    finally:
        setattr(obj, attr, old)         # runs even on exception

from contextlib import suppress, redirect_stdout, ExitStack
with suppress(FileNotFoundError):       # cleaner than try/except/pass
    Path("gone").unlink()

import io
buf = io.StringIO()
with redirect_stdout(buf):
    print("captured")

with ExitStack() as stack:              # a dynamic number of managers
    files = [stack.enter_context(open(n)) for n in names]

import threading
lock = threading.Lock()
with lock:                              # acquire/release
    shared += 1`,
  },
  {
    title: '41 · Decorators',
    language: 'python',
    description: 'A decorator is a function that takes a function and returns a replacement. Always apply functools.wraps or you destroy the wrapped function\'s name, docstring and signature.',
    code: `import functools, time

def timed(fn):
    @functools.wraps(fn)                # preserves __name__, __doc__, __wrapped__
    def wrapper(*args, **kwargs):
        t = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__} took {time.perf_counter() - t:.4f}s")
    return wrapper

@timed
def work(n): return sum(range(n))
# equivalent to:  work = timed(work)

# Decorator WITH arguments — one more layer of nesting
def retry(times=3, exc=Exception):
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*a, **kw):
            for attempt in range(times):
                try:
                    return fn(*a, **kw)
                except exc:
                    if attempt == times - 1:
                        raise
        return wrapper
    return deco

@retry(times=5, exc=ConnectionError)
def fetch(url): ...

# Stacking — bottom-up:  work = timed(retry()(work))
@timed
@retry()
def work2(): ...

# Class-based decorator (when you need state)
class CountCalls:
    def __init__(self, fn):
        functools.update_wrapper(self, fn)
        self.fn, self.n = fn, 0
    def __call__(self, *a, **kw):
        self.n += 1
        return self.fn(*a, **kw)

# Built-in decorators you already use:
#   @property  @staticmethod  @classmethod  @functools.cache
#   @functools.lru_cache  @dataclass  @abstractmethod  @total_ordering`,
  },
  {
    title: '42 · Iterators & the Iteration Protocol',
    language: 'python',
    description: 'for x in obj is sugar for iter() + repeated next(). Knowing the protocol is what lets you write memory-flat pipelines over data that does not fit in RAM.',
    code: `xs = [1, 2, 3]
it = iter(xs)                   # calls xs.__iter__()
next(it)                        # 1  -> calls it.__next__()
next(it, "default")             # avoids StopIteration when exhausted

# for-loop desugared
it = iter(xs)
while True:
    try:
        x = next(it)
    except StopIteration:
        break

# Iterators are ONE-SHOT — consuming exhausts them
it = iter(xs)
list(it)        # [1,2,3]
list(it)        # []   <-- empty the second time

# A list is ITERABLE (many iterators); an iterator is its own iterator
iter(xs) is xs          # False
it2 = iter(it); it2 is it   # True

# Custom iterator class
class Countdown:
    def __init__(self, n): self.n = n
    def __iter__(self): return self
    def __next__(self):
        if self.n <= 0: raise StopIteration
        self.n -= 1
        return self.n + 1

list(Countdown(3))              # [3,2,1]

# The two-argument next(callable, sentinel) form
with open("f.bin", "rb") as fh:
    for chunk in iter(lambda: fh.read(4096), b""):
        process(chunk)

# next() with a generator = "find first match or None"
first_even = next((x for x in xs if x % 2 == 0), None)`,
  },
  {
    title: '43 · Generators & yield',
    language: 'python',
    description: 'A generator function returns a lazy iterator; state is suspended at each yield. This is how you stream gigabytes or model infinite sequences in constant memory.',
    code: `def count_up(n):
    i = 0
    while i < n:
        yield i                 # suspend here, resume on the next next()
        i += 1

g = count_up(3)
next(g), next(g), list(g)       # 0 1 [2]

# Generator expression — same laziness, comprehension syntax
squares = (x * x for x in range(10**9))     # allocates nothing
sum(x * x for x in range(1000))             # parens optional as a sole argument

# Infinite generators are fine because they are lazy
def naturals():
    n = 0
    while True:
        yield n
        n += 1

from itertools import islice
list(islice(naturals(), 5))                 # [0,1,2,3,4]

# yield from delegates to a sub-iterable (and forwards send/throw)
def flatten(nested):
    for item in nested:
        if isinstance(item, list):
            yield from flatten(item)        # recursive flatten
        else:
            yield item

list(flatten([1, [2, [3, [4]]]]))           # [1,2,3,4]

# Pipeline — each stage is lazy, memory stays O(1)
def read(path):
    with open(path, encoding="utf-8") as fh:
        yield from fh
lines   = read("big.log")
errors  = (l for l in lines if "ERROR" in l)
stamps  = (l.split()[0] for l in errors)
print(next(stamps, None))

# Generators can RECEIVE values (coroutine style)
def accumulator():
    total = 0
    while True:
        total += yield total
acc = accumulator(); next(acc); acc.send(10); acc.send(5)   # 10, 15

# list vs generator: build a list when you need len(), indexing, or reuse.`,
  },
];
