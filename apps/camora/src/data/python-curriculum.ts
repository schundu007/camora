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
  // -- BEGINNER -------------------------------------------------------------------
  {
    id: 'variables',
    title: 'Variables & Data Types',
    track: 'beginner',
    estimatedMins: 15,
    summary: `If you come from Java or C, you are used to declaring a type before a name, like int x = 42, and the compiler nailing that name to that type forever. Python flips this on its head: when you write x = 42, you never mention a type at all, and x is not a box that holds the number 42, it is a name tag pointing at an integer object that lives elsewhere in memory. Because the name is untyped, you can immediately reassign x = 'hello' and Python will not complain, since you are only moving the tag to a different object, not changing a box's declared type. This is called dynamic typing, and it is why Python feels fast to write but can surprise you at runtime instead of compile time. The data itself still has a type, which you can inspect with type(x), and you check membership in a type hierarchy with isinstance(x, int). Understanding that variables are references to objects, not the objects themselves, is the single mental model that unlocks why mutable and immutable types behave so differently when you assign or pass them around.`,
    keyPoints: [
      `Python variables are names bound to objects, not typed storage boxes. When you write a = b, you do not copy b's value, you make a point at the exact same object b points at, which is why id(a) == id(b) afterward. This matters enormously the moment that object is mutable.`,
      `Dynamic typing means the name carries no type, only the object does. You can rebind a name to a value of any type at any time, so the same name can be an int now and a list later, and errors about wrong types surface when the code runs, not when it is parsed.`,
      `Use type(x) to ask exactly what class an object is, and isinstance(x, int) to ask whether it is that type or a subclass. isinstance is the one you almost always want, because it correctly handles inheritance and accepts a tuple of types like isinstance(x, (int, float)).`,
      `Immutable objects (int, str, tuple, bool) cannot be changed in place, so reassigning them creates a brand new object and leaves the old one untouched. Mutable objects (list, dict, set) can be modified through any name pointing at them, so a change via one name is visible through every other name bound to the same object.`,
      `bool is a subclass of int in Python, so True is literally 1 and False is literally 0 in arithmetic. This means True + True evaluates to 2 and sum([True, False, True]) counts the Trues, a trick that is genuinely useful for counting matches but can confuse readers who expect a type error.`,
    ],
    examples: [
      {
        label: 'Inspecting type and identity',
        code: `x = 42                      # bind the name x to an int object
print(type(x))             # <class 'int'> — the object's type, not x's

x = "now a string"        # rebind x to a totally different object; legal in Python
print(type(x))             # <class 'str'> — the name changed what it points at

n = 10
print(isinstance(n, int))           # True — n is an int
print(isinstance(n, (int, float)))  # True — pass a tuple to test several types at once
print(isinstance(True, int))        # True — bool is a subclass of int, surprising but real`,
      },
      {
        label: 'Mutable vs immutable references',
        code: `a = [1, 2, 3]              # a points at a list object (mutable)
b = a                      # b points at the SAME list, not a copy
print(id(a) == id(b))      # True — both names share one object
b.append(4)                # mutate the object through b
print(a)                   # [1, 2, 3, 4] — the change is visible through a too

s = "hi"                  # s points at a str object (immutable)
t = s                      # t points at the same str
s = s + "!"               # builds a NEW str, rebinds s; the old "hi" is untouched
print(s, t)                # hi! hi — t still sees the original object

print(True + True)         # 2 — bool counts as int, so this is 1 + 1`,
      },
      {
        label: 'Trace / Step-by-step: the a, b = b, a swap',
        code: `a = 5
b = 9
# Step 1: Python first evaluates the RIGHT side into a tuple: (b, a) -> (9, 5)
# Step 2: that tuple (9, 5) is then unpacked left-to-right into a, b
a, b = b, a
# After Step 2: a is bound to 9, b is bound to 5 — no temp variable needed
print(a, b)   # 9 5

# Trace of the values at each moment:
# before:        a=5   b=9
# RHS evaluated: tuple = (9, 5)   (uses the OLD a and b)
# unpacked:      a=9   b=5
# This is why the swap works in one line with no third variable.`,
      },
    ],
    gotcha: `Writing b = a on a mutable object does not copy it; both names point at one list, so b.append(4) silently changes a too. If you actually want an independent copy, use b = a.copy() (or b = a[:] for a list, or copy.deepcopy(a) for nested structures).`,
    tip: `Reach for isinstance(x, int) instead of type(x) == int when checking types, because isinstance respects subclassing and lets you test multiple types in one call with isinstance(x, (int, float)). Use type(x) only when you need the exact class with no subclass matching.`,
    realWorldNote: `Django's ORM leans on dynamic typing constantly: a model field can come back as an int, a str, or None depending on the row, and code uses isinstance checks before serializing. The mutable-reference trap is the single most common Python bug in production data pipelines at companies like Instagram, where a shared default list passed between functions accumulates stale data across requests. Pandas similarly relies on bool being an int so that df['col'].sum() on a boolean mask counts how many rows matched.`,
  },

  {
    id: 'operators',
    title: 'Operators',
    track: 'beginner',
    estimatedMins: 12,
    summary: `Most languages give you +, -, *, and / and call it a day, but Python's operators carry a few rules that will bite you if you assume they match C or JavaScript. The biggest surprise is integer division with //, which floors toward negative infinity rather than truncating toward zero, so -7 // 2 is -4 in Python and -3 in C. Exponentiation with ** is right-associative, meaning 2 ** 3 ** 2 is 2 ** (3 ** 2) which is 512, not (2 ** 3) ** 2 which would be 64. Python 3.8 added the walrus operator :=, which assigns a value and returns it inside an expression, perfect for read-a-chunk loops where you want to test and capture at once. Bitwise operators (&, |, ^, ~, <<, >>) let you pack boolean flags into a single integer the way real systems do for permissions. Finally, and and or short-circuit, evaluating left to right and stopping as soon as the result is known, which doubles as a clean guard against calling methods on None.`,
    keyPoints: [
      `The // operator does floor division, rounding toward negative infinity, not toward zero. So -7 // 2 is -4 (because -3.5 floors down to -4), which is different from C-style truncation that would give -3. The matching % operator always returns a result with the same sign as the divisor, keeping the identity a == (a // b) * b + (a % b) true.`,
      `The ** exponent operator is right-associative, the only common operator in Python that groups right to left. That means 2 ** 3 ** 2 is computed as 2 ** (3 ** 2) = 2 ** 9 = 512, which matches normal math notation but surprises people expecting strict left-to-right evaluation.`,
      `The walrus operator := assigns and returns a value in a single expression, which lets you both capture and test in a while or if condition. It is ideal for chunk = file.read(1024) style loops where you want while (chunk := f.read(1024)): to read, bind, and check for empty all at once.`,
      `Bitwise operators work on the binary representation of integers: & masks bits, | sets bits, ^ toggles bits, and << / >> shift them. This is how you pack many on/off flags into one int, for example READ = 1, WRITE = 2, EXEC = 4, then perms = READ | WRITE gives 3 and perms & WRITE tests the write bit.`,
      `and and or short-circuit: and stops at the first falsy operand and returns it, or stops at the first truthy operand and returns it. They return the actual operand, not a strict True/False, so user and user.name safely yields None when user is None instead of raising an AttributeError.`,
    ],
    examples: [
      {
        label: 'Floor division and exponent associativity',
        code: `print(7 // 2)      # 3  — normal floor division
print(-7 // 2)     # -4 — floors toward negative infinity, NOT -3 like C truncation
print(-7 % 2)      # 1  — remainder takes the sign of the divisor (2), so positive

print(2 ** 3 ** 2) # 512 — ** is right-associative: 2 ** (3 ** 2) = 2 ** 9
print((2 ** 3) ** 2)  # 64 — force left grouping with parentheses if that is what you meant`,
      },
      {
        label: 'Walrus operator and bitwise flags',
        code: `import io
f = io.StringIO("line1\nline2\nline3\n")  # stand-in for an open file

# := reads a line, binds it to \`line\`, and tests it for emptiness all in one go
while (line := f.readline()):       # empty string "" is falsy, so the loop ends cleanly
    print(line.strip())             # line1, line2, line3

READ, WRITE, EXEC = 1, 2, 4         # each flag is a distinct single bit
perms = READ | WRITE               # | sets both bits -> 0b011 -> 3
print(perms)                       # 3
print(bool(perms & WRITE))         # True  — & masks to test if the WRITE bit is on
print(bool(perms & EXEC))          # False — the EXEC bit was never set`,
      },
      {
        label: 'Trace / Step-by-step: short-circuit None guard',
        code: `def first_name(user):
    # \`user and user.get('name')\` evaluates left to right and short-circuits
    return user and user.get("name")

# Trace with user = None:
#   1. evaluate \`user\` -> None, which is falsy
#   2. \`and\` stops immediately (short-circuit) and returns None
#   3. user.get is NEVER called, so no AttributeError
print(first_name(None))               # None

# Trace with user = {'name': 'Ada'}:
#   1. evaluate \`user\` -> a dict, which is truthy
#   2. \`and\` does NOT stop, so it evaluates the right side
#   3. user.get('name') -> 'Ada' is returned
print(first_name({"name": "Ada"}))   # Ada`,
      },
    ],
    gotcha: `Assuming -7 // 2 equals -3 like C or Java will produce off-by-one bugs in pagination and indexing, because Python floors toward negative infinity and gives -4. If you genuinely need C-style truncation toward zero, use int(-7 / 2) or math.trunc(-7 / 2) instead of //.`,
    tip: `Use the walrus operator while (chunk := f.read(8192)): instead of the older read-once-then-loop-then-read-again pattern, because it captures and tests in one line and removes the duplicated read call that people forget to update. Keep := for genuine read-and-test cases though, not as a general replacement for normal assignment.`,
    realWorldNote: `The Linux kernel and Python's own os module use bitwise flag packing for file permissions, which is why os.open takes os.O_RDONLY | os.O_CREAT as a single int. Discord's permission system stores every channel permission as one bitfield integer and checks them with & exactly like the EXEC example above. The walrus operator was significant enough that its addition in PEP 572 famously prompted Guido van Rossum to step down as Python's BDFL, and it now appears throughout CPython's standard library for stream-reading loops.`,
  },

  {
    id: 'control-flow',
    title: 'Control Flow',
    track: 'beginner',
    estimatedMins: 15,
    summary: `In C, Java, or JavaScript, blocks are marked by curly braces and indentation is just a courtesy to human readers; in Python, the indentation IS the syntax, and there are no braces at all. When you write if x > 0: and then indent the next line by four spaces, that whitespace is literally what tells the interpreter the line belongs to the if. This brace-less design forces consistent formatting on every Python program ever written, which is why Python code from strangers tends to look alike. Beyond the basic if/elif/else, Python gives you a ternary expression value = a if condition else b for picking one of two values inline, and since version 3.10 a structural match/case statement that replaces long elif chains with pattern matching. Python also has a feature most languages lack: chained comparisons, so you can write 0 <= x <= 100 and it means exactly what the math says, evaluating x only once. These tools let you express branching logic with far less ceremony than brace-heavy languages.`,
    keyPoints: [
      `Indentation is the actual block syntax in Python, not a style choice. The colon ends the header line and the consistently indented lines below form the body, so mixing tabs and spaces or using an inconsistent number of spaces is a hard SyntaxError or IndentationError, not a warning. This is why every Python file in the world looks structurally similar.`,
      `The ternary expression reads x if condition else y, with the condition in the middle, which is the reverse of C's condition ? x : y. It is an expression that produces a value, so you can put it directly inside an assignment, a function call, or an f-string, unlike a full if statement which produces no value.`,
      `match/case (Python 3.10+) does structural pattern matching, not just value equality. It can destructure tuples, lists, and dataclasses, bind captured names, and use a wildcard case _: as the default, making it far more powerful than a switch and much cleaner than a long elif ladder when you are branching on shape.`,
      `Chained comparisons like 0 <= x <= 100 are a genuine Python feature, not a coincidence. Python expands a < b < c to (a < b) and (b < c) while evaluating b only once, so it is both readable and efficient, whereas in C the same expression silently compares a boolean against c and gives wrong answers.`,
      `Truthiness drives every condition: empty containers ([], {}, '', set()), the number 0, and None are all falsy, while non-empty containers and non-zero numbers are truthy. This lets you write if my_list: to mean if the list has items, instead of the more verbose if len(my_list) > 0.`,
    ],
    examples: [
      {
        label: 'Indentation, ternary, and chained comparison',
        code: `score = 87

# Indentation (4 spaces) is what binds these lines to the if/elif/else
if score >= 90:
    grade = "A"        # this line belongs to the if ONLY because it is indented
elif score >= 80:
    grade = "B"        # de-indenting back would end the block
else:
    grade = "C"
print(grade)            # B

# Ternary expression: condition sits in the MIDDLE (reverse of C's ? :)
label = "pass" if score >= 60 else "fail"
print(label)            # pass

# Chained comparison reads like math and evaluates \`score\` only once
print(0 <= score <= 100)   # True — equivalent to (0 <= score) and (score <= 100)`,
      },
      {
        label: 'match/case vs a long elif chain',
        code: `def describe(command):
    # match/case branches on the SHAPE of the value, not just equality
    match command.split():
        case ["go", direction]:           # a 2-element list; binds \`direction\`
            return f"moving {direction}"
        case ["quit"] | ["exit"]:         # | lets one case match several patterns
            return "shutting down"
        case [action, *rest]:             # *rest captures any remaining words
            return f"unknown action {action} with {rest}"
        case _:                           # _ is the wildcard default
            return "empty command"

print(describe("go north"))     # moving north
print(describe("quit"))         # shutting down
print(describe("jump high now"))# unknown action jump with ['high', 'now']`,
      },
      {
        label: 'Trace / Step-by-step: truthiness in a guard',
        code: `def greet(names):
    # \`if not names:\` uses truthiness — an empty list is falsy
    if not names:
        return "nobody here"
    return "hello " + ", ".join(names)

# Trace with names = []:
#   1. \`not names\` -> the empty list [] is falsy -> not False... wait:
#   2. [] is falsy, so \`not names\` is True
#   3. the if body runs and returns "nobody here"
print(greet([]))                 # nobody here

# Trace with names = ['Ada', 'Linus']:
#   1. the list is non-empty, so it is truthy
#   2. \`not names\` is False, the if is skipped
#   3. join runs and returns the greeting
print(greet(["Ada", "Linus"]))  # hello Ada, Linus`,
      },
    ],
    gotcha: `Mixing tabs and spaces for indentation looks identical on screen but raises TabError or silently misgroups your blocks, because Python treats them as different whitespace. Configure your editor to insert four spaces on Tab (PEP 8's rule) and never mix the two within a file.`,
    tip: `Use a chained comparison 0 <= x <= 100 instead of x >= 0 and x <= 100 because it reads like the math you mean, evaluates x only once, and removes the duplicated variable that invites typos. Save match/case for branching on the structure of data; for a simple two-way value pick, the ternary a if cond else b is clearer.`,
    realWorldNote: `Python's significant-whitespace design directly inspired tools like YAML and the Jinja2 templating engine used by Flask. FastAPI relies heavily on truthiness checks like if not user: to short-circuit request handlers before hitting the database. The match statement, added in Python 3.10 via PEP 634, was driven in part by Instagram's engineering team at Meta, who needed cleaner ways to dispatch on the shape of large message and event objects.`,
  },

  {
    id: 'loops',
    title: 'Loops',
    track: 'beginner',
    estimatedMins: 18,
    summary: `If you learned looping in C, you think of a for loop as a counter: for (i = 0; i < n; i++). Python's for loop is fundamentally different and more powerful: it iterates over any iterable, meaning anything that can hand out items one at a time, including a list, a string (character by character), a dictionary (key by key), an open file (line by line), or a range. You almost never manage an index yourself; instead you say for item in collection and Python feeds you the values directly. When you do need the index, enumerate(collection, start=1) gives you both the position and the item without a manual counter. To walk two sequences together you use zip(a, b), which stops at the shortest one. Python even offers a rarely-seen loop else clause that runs only when the loop finishes without hitting break, which is a surprisingly elegant fit for search-and-not-found patterns like checking whether a number is prime. Mastering these idioms is what makes Python loops read like English instead of bookkeeping.`,
    keyPoints: [
      `Python's for loop iterates over any iterable, not a counter, so for c in 'hello' yields each character and for line in open(path) yields each line lazily. This means you rarely write index arithmetic, and the same loop shape works across lists, strings, files, sets, and generators without changes.`,
      `enumerate(iterable, start=0) yields (index, item) pairs so you get the position without a hand-rolled counter that you might forget to increment. Pass start=1 when you want human-friendly numbering, as in for i, name in enumerate(names, start=1), which avoids the classic off-by-one of maintaining your own counter.`,
      `zip(a, b, ...) walks several iterables in lockstep and stops as soon as the shortest one runs out, silently discarding the leftover items of the longer ones. If you need to detect mismatched lengths, use zip(a, b, strict=True) in Python 3.10+, which raises instead of silently truncating.`,
      `Iterating a dict directly yields its keys, not its values or pairs, so for k in my_dict gives keys. Use my_dict.values() for values and my_dict.items() to unpack both as for k, v in my_dict.items(), which is the most common and readable form.`,
      `A loop can have an else clause that runs only if the loop completed without executing break. This reads as 'for ... else: ran to the end without finding anything,' which models search-then-handle-not-found cleanly, such as a prime check where break fires on the first divisor and the else declares the number prime.`,
    ],
    examples: [
      {
        label: 'Iterating different iterables, enumerate, and zip',
        code: `for ch in "hi":           # a string is iterable: yields each character
    print(ch)             # h, then i

names = ["Ada", "Linus", "Guido"]
for i, name in enumerate(names, start=1):  # get index AND item, numbered from 1
    print(i, name)        # 1 Ada, 2 Linus, 3 Guido — no manual counter needed

letters = ["a", "b", "c"]
numbers = [1, 2]          # deliberately shorter
for letter, num in zip(letters, numbers):  # zip stops at the SHORTEST
    print(letter, num)    # a 1, then b 2 — 'c' is dropped because numbers ran out`,
      },
      {
        label: 'Iterating a dict gives keys',
        code: `scores = {"Ada": 95, "Linus": 88}

for key in scores:                 # iterating a dict yields KEYS, not values
    print(key)                     # Ada, Linus

for value in scores.values():      # ask explicitly for values
    print(value)                   # 95, 88

for name, score in scores.items(): # .items() unpacks key and value together
    print(f"{name} scored {score}")# Ada scored 95, Linus scored 88`,
      },
      {
        label: 'Trace / Step-by-step: prime check with loop else',
        code: `def is_prime(n):
    if n < 2:
        return False
    # try every candidate divisor from 2 up to sqrt(n)
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            break            # found a divisor -> not prime -> skip the else
    else:
        return True          # else runs ONLY if the loop never hit break
    return False             # reached only when break fired

# Trace for n = 9:
#   range(2, int(3)+1) -> range(2, 4) -> tries d = 2, then 3
#   d=2: 9 % 2 == 1, no break
#   d=3: 9 % 3 == 0 -> break fires -> else is SKIPPED -> falls to \`return False\`
print(is_prime(9))   # False

# Trace for n = 7:
#   range(2, int(2)+1) -> range(2, 3) -> tries d = 2 only
#   d=2: 7 % 2 == 1, no break; loop ends naturally
#   no break ever fired -> the \`else\` runs -> return True
print(is_prime(7))   # True`,
      },
    ],
    gotcha: `Calling zip(a, b) on lists of different lengths silently drops the extra items of the longer one, so a pairing bug can hide for months. When the lengths must match, use zip(a, b, strict=True) (Python 3.10+) so a mismatch raises a ValueError instead of quietly losing data.`,
    tip: `Use for i, item in enumerate(seq) instead of for i in range(len(seq)) and then indexing seq[i], because enumerate hands you both at once, avoids a redundant index lookup, and reads more clearly. Reach for the loop else clause when you have a real search-then-not-found situation, since it removes the found = False flag boilerplate.`,
    realWorldNote: `Django querysets are iterables, so for obj in MyModel.objects.all() streams rows without loading everything into memory, exactly like iterating an open file. The zip idiom underpins how pandas and NumPy line up columns and how machine learning code at companies like OpenAI batches inputs with their labels via zip(features, targets). The loop else clause, though rare, appears in CPython's own standard library for search routines, and interviewers at firms like Google sometimes ask about it precisely because most candidates have never seen it.`,
  },

  {
    id: 'functions',
    title: 'Functions',
    track: 'beginner',
    estimatedMins: 20,
    summary: `If you came from Java or C, you are used to declaring a return type, listing typed parameters, and the compiler catching mistakes before you run anything. In Python a function is far looser and far more powerful: you write def greet(name): and that is it, no types required, and the function itself becomes a regular object you can store in a list, pass to another function, or hand to map(). That first-class nature is the single biggest mental shift, because it means functions are values, not just blocks of code. Python resolves the names you use inside a function with a fixed search order called LEGB (Local, then Enclosing, then Global, then Built-in), which explains a lot of surprising behavior once you internalize it. Default arguments look harmless but are evaluated exactly once when the def line runs, so a mutable default like an empty list is silently shared across every call, the classic beginner trap. You can also collect extra positional arguments with *args (which arrives as a tuple, not a list) and extra keyword arguments with **kwargs (a dict). Mastering these mechanics, plus a clear docstring, is what separates code that merely works from code a teammate can actually read.`,
    keyPoints: [
      `A function is a first-class object, meaning it has a value you can assign, store, and pass around just like an int or string. This is why you can write handlers = {'add': add_fn, 'sub': sub_fn} and call handlers['add'](2, 3); the dict holds the actual function objects, not their results, so nothing runs until you add the parentheses.`,
      `Name lookup follows LEGB: Python checks the Local scope inside the function first, then any Enclosing function scopes, then the module-level Global scope, and finally the Built-in names. The consequence is that a local variable shadows a global of the same name, and you need the global or nonlocal keyword to write to an outer-scope name rather than create a new local one.`,
      `Default argument values are evaluated a single time, at the moment the def statement executes, not on each call. If that default is mutable like a list or dict, every call that omits the argument shares the very same object, so mutations accumulate across calls and produce bugs that look like the function has memory.`,
      `*args packs leftover positional arguments into a tuple and **kwargs packs leftover keyword arguments into a dict. Because *args is a tuple it is immutable, so you cannot append to it directly; convert with list(args) first if you need to modify the collection, otherwise you get an AttributeError.`,
      `Parameters before a bare / are positional-only and cannot be passed by keyword, while parameters after a bare * are keyword-only and cannot be passed positionally. This lets you lock down a public API so callers cannot rely on argument names you might rename later, which is exactly how many standard-library functions protect their signatures.`,
    ],
    examples: [
      {
        label: 'First-class functions: store in a dict, pass to map()',
        code: `def square(n):           # a plain function, but also just an object
    return n * n

def cube(n):
    return n * n * n

# functions are values, so a dict can hold them as lookup table
ops = {'square': square, 'cube': cube}   # storing the function OBJECTS, not calls

chosen = ops['cube']     # pull one out; chosen now points to cube
print(chosen(3))         # 27 -> parentheses are what actually invokes it

# map() takes a function as its first argument and applies it lazily
result = map(square, [1, 2, 3, 4])       # square is passed, not called yet
print(list(result))      # [1, 4, 9, 16] -> list() drives the lazy map`,
      },
      {
        label: 'The mutable default argument trap (and the fix)',
        code: `# BUG: the empty list is created ONCE when def runs, then reused forever
def add_item_buggy(value, items=[]):     # items default is a single shared list
    items.append(value)                  # mutates that shared list every call
    return items

print(add_item_buggy(1))   # [1]      -> looks fine
print(add_item_buggy(2))   # [1, 2]   -> surprise: the 1 is still here
print(add_item_buggy(3))   # [1, 2, 3] -> the default has 'memory'

# FIX: use None as a sentinel and build a fresh list inside the body
def add_item(value, items=None):         # None is immutable, safe to share
    if items is None:                    # detect the 'no argument passed' case
        items = []                       # fresh list created on THIS call
    items.append(value)
    return items

print(add_item(1))   # [1]
print(add_item(2))   # [2]   -> independent now, no leakage`,
      },
      {
        label: 'Trace / Step-by-step: LEGB lookup and *args as a tuple',
        code: `x = 'global-x'           # lives in the Global scope

def outer():
    x = 'enclosing-x'    # lives in outer's Enclosing scope
    def inner(*args):    # args collects extra positionals into a TUPLE
        # Step 1: look up x -> not Local here, so check Enclosing -> found
        print('x resolves to:', x)
        # Step 2: args is a tuple, confirm its type
        print('args is a', type(args).__name__, '=', args)
        # Step 3: tuples are immutable; must convert to mutate
        as_list = list(args)         # copy tuple into a real list
        as_list.append('added')
        print('after append:', as_list)
    inner(10, 20, 30)

outer()
# x resolves to: enclosing-x     <- LEGB skipped Local, used Enclosing
# args is a tuple = (10, 20, 30)  <- *args is never a list
# after append: [10, 20, 30, 'added']  <- only the list copy changed`,
      },
    ],
    gotcha: `Writing def cache(key, store={}): to memoize results shares one dict across every call, so unrelated callers see each other's data; replace the default with None and do store = {} if store is None inside the body so each invocation that omits the argument gets its own dict.`,
    tip: `Reach for keyword-only parameters by adding a bare * in the signature, as in def connect(host, *, timeout=30, retries=3), instead of leaving timeout positional, because it forces callers to write connect('db', timeout=5) which stays readable and lets you reorder or rename the options later without breaking anyone.`,
    realWorldNote: `Django's class-based views and the Flask framework both lean on first-class functions: Flask's @app.route('/home') decorator literally takes your view function as an object and registers it in a URL-to-function dispatch table, the same dict-of-functions pattern shown above. The pytest framework relies on the mutable-default trap being well known, and its own fixtures sidestep it by generating fresh objects per test. Google's internal Python style guide explicitly bans mutable default arguments for this reason.`,
  },

  {
    id: 'lists',
    title: 'Lists & Tuples',
    track: 'beginner',
    estimatedMins: 20,
    summary: `A Python list looks like a Java ArrayList or a C array, but under the hood CPython implements it as a dynamic array of pointers, not a block of inlined values. That one detail explains almost everything about list behavior: each slot holds a reference to an object living elsewhere on the heap, so a list can mix ints, strings, and other lists freely, and copying a list copies the pointers rather than the underlying objects. Indexing is O(1) because it is pointer arithmetic, and appending is amortized O(1) because the array over-allocates room to grow. Slicing is one of Python's friendliest features: list[2:5] returns a new list, and crucially it never raises IndexError even when the bounds run past the end, which makes slice code wonderfully forgiving compared to manual index loops. Sorting uses Timsort, a stable hybrid algorithm that preserves the relative order of equal elements, so you can sort by one key and then another to get predictable multi-level ordering. Tuples are the immutable cousins of lists, which makes them hashable and safe to use as dictionary keys. Combine lists with starred unpacking and you get expressive one-liners like first, *middle, last = data that read like plain English.`,
    keyPoints: [
      `CPython stores a list as a contiguous array of pointers to objects, so the list itself is compact but each element can point anywhere on the heap. This is why a list can hold mixed types and why copying a list with list(orig) or orig[:] produces a shallow copy: the new list has its own pointer array, but those pointers still target the same inner objects.`,
      `Slicing returns a brand-new list and silently clamps out-of-range bounds instead of raising. So data[5:100] on a three-element list gives [] rather than an error, which makes slicing safe for pagination and chunking code where you cannot guarantee the length, unlike data[5] which would raise IndexError.`,
      `The slice data[::-1] reverses a list by walking it with a step of -1, returning a reversed copy without mutating the original. It is concise and works on any sequence including strings and tuples, though for in-place reversal of a large list data.reverse() avoids allocating a second array.`,
      `list.sort() and the sorted() builtin use Timsort, which is stable, meaning two elements that compare equal keep their original relative order. This guarantee lets you sort in stages: sort by secondary key first, then by primary key, and the secondary order survives within each primary group.`,
      `Starred unpacking lets one target absorb a variable number of elements, as in first, *middle, last = [1,2,3,4,5], where middle becomes the list [2,3,4]. Exactly one starred target is allowed per assignment, and it always collects into a list even when the source is a tuple, which is handy for peeling off head and tail elements in one readable line.`,
    ],
    examples: [
      {
        label: 'Slicing never throws, plus the [::-1] reversal trick',
        code: `data = [10, 20, 30]

# Indexing past the end RAISES, but slicing past the end does NOT
print(data[1:99])        # [20, 30] -> bounds clamped, no IndexError
print(data[50:60])       # []       -> entirely out of range, still safe
# print(data[50])        # would raise IndexError: list index out of range

# [start:stop:step] with step -1 walks backward = reversed COPY
reversed_copy = data[::-1]    # builds a new list, original untouched
print(reversed_copy)     # [30, 20, 10]
print(data)              # [10, 20, 30] -> original is unchanged

# works on strings too, since they are sequences
print('hello'[::-1])     # 'olleh'`,
      },
      {
        label: 'The [[0]*3]*3 shared-row trap',
        code: `# Looks like a 3x3 grid of zeros, but it is a trap
grid = [[0] * 3] * 3     # outer * 3 copies the SAME inner-list pointer 3x
grid[0][0] = 99          # mutate row 0...
print(grid)              # [[99,0,0],[99,0,0],[99,0,0]] -> all rows changed!
# Reason: the three rows are the same list object, just referenced 3 times

# FIX: build an independent inner list each iteration
grid2 = [[0] * 3 for _ in range(3)]   # comprehension creates 3 fresh rows
grid2[0][0] = 99
print(grid2)             # [[99,0,0],[0,0,0],[0,0,0]] -> only row 0 changed`,
      },
      {
        label: 'Trace / Step-by-step: stable Timsort and starred unpacking',
        code: `people = [('Ann', 30), ('Bob', 25), ('Cara', 30), ('Dan', 25)]

# Step 1: sort by name (secondary key) first
by_name = sorted(people, key=lambda p: p[0])
# [('Ann',30),('Bob',25),('Cara',30),('Dan',25)]

# Step 2: now sort by age (primary key); equal ages keep name order
by_age = sorted(by_name, key=lambda p: p[1])
# age 25 group: Bob then Dan (alphabetical survives from step 1)
# age 30 group: Ann then Cara
print(by_age)
# [('Bob',25),('Dan',25),('Ann',30),('Cara',30)]  <- stability at work

# Step 3: starred unpacking peels head and tail in one line
first, *middle, last = [1, 2, 3, 4, 5]
print(first)   # 1            <- single element
print(middle)  # [2, 3, 4]    <- starred target ALWAYS becomes a list
print(last)    # 5            <- single element`,
      },
    ],
    gotcha: `Building a matrix with grid = [[0]*cols]*rows makes every row the same list object, so grid[0][0] = 1 changes every row's first cell at once; use a comprehension grid = [[0]*cols for _ in range(rows)] so each row is a distinct list.`,
    tip: `Use data[:] or data.copy() to take a shallow copy before sorting or reversing in place when you must keep the original, instead of relying on sorted(data) and forgetting it returns a new list while data.sort() mutates and returns None, a None that bites people who write data = data.sort().`,
    realWorldNote: `NumPy was created precisely because CPython's list-of-pointers layout is cache-unfriendly for numerical work: a NumPy array packs raw values contiguously, which is why pandas and scikit-learn build on it for speed. Timsort itself was invented by Tim Peters for CPython in 2002 and was later adopted by Java's Arrays.sort for objects and by Android's runtime, making it one of Python's most widely-copied contributions to computer science.`,
  },

  {
    id: 'dicts-sets',
    title: 'Dictionaries & Sets',
    track: 'beginner',
    estimatedMins: 18,
    summary: `If you have used a Java HashMap or a C++ unordered_map, the Python dict will feel familiar in spirit but cleaner in practice: it is a hash table that gives you average O(1) lookup, insertion, and deletion, with a syntax so terse it almost disappears. The key insight is that dicts and sets both work by hashing their keys, which is why keys must be hashable, and that immediately rules out lists as keys while allowing tuples and frozensets. A modern surprise for veterans of older Python is that since version 3.7 dicts preserve insertion order as a language guarantee, so iterating a dict yields keys in the order you added them. Sets are essentially dicts with keys but no values, perfect for membership tests and de-duplication, and they too rely on hashing, which is why a set cannot contain a list. When you find yourself writing the same group-into-buckets logic over and over, the standard library offers cleaner tools: dict.setdefault for one-off cases, collections.defaultdict for repeated accumulation, and collections.Counter, which not only tallies items but supports arithmetic with +, -, &, and | so you can combine and intersect counts like algebra. Learning when to reach for each of these is what turns clumsy dict code into something elegant.`,
    keyPoints: [
      `A dict is a hash table, so getting, setting, and deleting a key is average-case O(1) regardless of how many keys exist. The price is that keys must be hashable, meaning they need a stable __hash__, which is why immutable tuples work as keys but mutable lists raise TypeError: unhashable type: 'list'.`,
      `Since Python 3.7 insertion order is part of the language spec, so iterating a dict, calling list(d) on it, or printing it yields keys in the order they were first inserted. This means you no longer need collections.OrderedDict just to preserve order, though OrderedDict still exists for its move_to_end and order-sensitive equality features.`,
      `dict.setdefault(key, default) returns the existing value if the key is present and otherwise inserts the default and returns it, all in one call. It is ideal for occasional grouping, but inside a tight loop it evaluates the default expression every time, so for heavy accumulation collections.defaultdict(list) is cleaner because it only constructs a new list when a missing key is actually accessed.`,
      `Sets and frozensets store their members by hash, so a set cannot contain a list because lists are unhashable; you must convert inner collections to tuples or frozensets first. A frozenset is the immutable, hashable version of a set, which is exactly why it can serve as a dictionary key or as a member of another set.`,
      `collections.Counter is a dict subclass that counts hashable items and supports arithmetic: c1 + c2 adds counts, c1 - c2 subtracts and drops non-positive results, c1 & c2 takes the per-key minimum (intersection), and c1 | c2 takes the per-key maximum (union). This lets you express tallies and comparisons declaratively instead of with nested loops.`,
    ],
    examples: [
      {
        label: 'setdefault vs dict.get(k, []) vs defaultdict',
        code: `from collections import defaultdict

pairs = [('fruit', 'apple'), ('veg', 'kale'), ('fruit', 'pear')]

# Approach A: dict.get returns a default but does NOT store it
buckets_a = {}
for category, item in pairs:
    # get(category, []) gives an empty list if missing, but we must reassign
    buckets_a[category] = buckets_a.get(category, []) + [item]
print(buckets_a)   # {'fruit': ['apple', 'pear'], 'veg': ['kale']}

# Approach B: setdefault inserts-and-returns in one step
buckets_b = {}
for category, item in pairs:
    buckets_b.setdefault(category, []).append(item)  # list created if absent
print(buckets_b)   # same result, no manual reassignment

# Approach C: defaultdict auto-creates the list on first access (cleanest)
buckets_c = defaultdict(list)        # factory 'list' runs only on missing keys
for category, item in pairs:
    buckets_c[category].append(item) # no setdefault, no get needed
print(dict(buckets_c))`,
      },
      {
        label: 'Hashability: lists fail, tuples and frozensets work as keys',
        code: `# A set hashes its members, so a list inside it is illegal
try:
    bad = {[1, 2], [3, 4]}           # lists are unhashable
except TypeError as e:
    print('Error:', e)               # unhashable type: 'list'

# Convert inner lists to tuples (immutable, hashable) to store them
ok = {(1, 2), (3, 4)}                # tuples hash fine
print((1, 2) in ok)                  # True -> O(1) membership test

# frozenset is hashable, so it can be a DICT KEY (a plain set cannot)
regions = {
    frozenset({'us', 'ca'}): 'north-america',  # frozenset key works
    frozenset({'fr', 'de'}): 'europe',
}
print(regions[frozenset({'ca', 'us'})])  # 'north-america' -> order-independent`,
      },
      {
        label: 'Trace / Step-by-step: Counter arithmetic',
        code: `from collections import Counter

cart_a = Counter(['apple', 'apple', 'pear'])   # {'apple':2, 'pear':1}
cart_b = Counter(['apple', 'banana'])          # {'apple':1, 'banana':1}

# + adds counts key by key
print(cart_a + cart_b)
# apple: 2+1=3, pear: 1+0=1, banana: 0+1=1
# Counter({'apple':3, 'pear':1, 'banana':1})

# - subtracts and DROPS zero/negative results
print(cart_a - cart_b)
# apple: 2-1=1, pear: 1-0=1, banana: 0-1 -> dropped
# Counter({'apple':1, 'pear':1})

# & takes the per-key MINIMUM (intersection)
print(cart_a & cart_b)
# apple: min(2,1)=1, everything else min with 0 -> dropped
# Counter({'apple':1})

# | takes the per-key MAXIMUM (union)
print(cart_a | cart_b)
# apple: max(2,1)=2, pear:1, banana:1
# Counter({'apple':2, 'pear':1, 'banana':1})`,
      },
    ],
    gotcha: `Trying to use a list as a dict key or set member with d[[1,2]] = 'x' raises TypeError: unhashable type: 'list' because lists can change and would invalidate their hash; convert the key to a tuple as d[(1,2)] = 'x', or use a frozenset when order should not matter.`,
    tip: `When you are accumulating values into per-key lists in a loop, use collections.defaultdict(list) and just call d[key].append(v) instead of d.setdefault(key, []).append(v), because defaultdict only builds the empty list when a key is genuinely missing and reads more cleanly, while setdefault is better for one-off lookups outside a loop.`,
    realWorldNote: `The insertion-order guarantee landed in CPython 3.6 as an implementation detail and became an official language promise in 3.7, which is why frameworks like Django can rely on QuerySet.values() returning fields in declared order. collections.Counter powers the most_common method behind countless analytics dashboards, and Python's own keyword-argument handling depends on dict ordering, so **kwargs now reliably reflects the order arguments were passed at the call site.`,
  },

  {
    id: 'strings',
    title: 'Strings',
    track: 'beginner',
    estimatedMins: 16,
    summary: `In C a string is a byte array terminated by a null, and in Java a String is a sequence of UTF-16 code units, but in Python 3 a str is an immutable sequence of Unicode code points, which is a cleaner abstraction than either. Immutable means every operation that looks like it changes a string actually builds a new one, so s += '!' does not edit s, it allocates a fresh string and rebinds the name. That immutability is why repeatedly concatenating with += inside a loop is secretly O(n squared), and why ''.join(parts) is the correct O(n) way to assemble many pieces. Because a str holds code points rather than bytes, you cross the bytes boundary explicitly: call .encode() to turn text into bytes for the network or disk, and .decode() to turn bytes back into text. Formatting is where Python shines through f-strings, where format specs like {value:.2f} for two decimals, {value:>10} for right-alignment, and {value!r} for the repr form let you control output precisely inside the braces. Two more tools round things out: textwrap.dedent strips the common leading whitespace from triple-quoted blocks so your source can stay indented, and str.casefold handles aggressive case-insensitive matching across languages where plain .lower falls short.`,
    keyPoints: [
      `A Python 3 str is an immutable sequence of Unicode code points, not bytes, so indexing s[0] gives you a single-character string representing one code point regardless of how many bytes it would take to encode. Immutability means you can safely use strings as dict keys and share them freely, but every transformation returns a new object rather than modifying the original in place.`,
      `Because strings are immutable, building a large string with += in a loop is O(n squared): each concatenation copies all characters accumulated so far into a new buffer. Using ''.join(list_of_parts) is O(n) because join measures the total length once and fills a single buffer, which is the standard idiom for assembling many fragments.`,
      `f-strings embed expressions and format specifications directly: {val:.2f} formats a float to two decimal places, {val:>10} right-aligns within a field ten characters wide, {val:<10} left-aligns, and {val!r} inserts the repr of the value with surrounding quotes. The spec after the colon is the same mini-language used by str.format, so what you learn transfers between both.`,
      `Crossing between text and raw bytes is explicit: str.encode('utf-8') produces a bytes object suitable for sockets and files opened in binary mode, and bytes.decode('utf-8') converts received bytes back into a str. Skipping this step or assuming the wrong codec is the root cause of most UnicodeDecodeError messages, so always state the encoding rather than relying on the platform default.`,
      `textwrap.dedent removes the longest common leading whitespace from every line of a multiline string, letting you indent triple-quoted blocks to match surrounding code without that indentation leaking into the output. For language-aware case-insensitive comparison use str.casefold rather than str.lower, because casefold applies fuller Unicode folding rules that handle edge cases lower misses.`,
    ],
    examples: [
      {
        label: 'f-string format specs: precision, alignment, repr',
        code: `price = 3.14159
name = 'kale'

# {:.2f} -> fixed-point with exactly 2 decimal places
print(f'{price:.2f}')        # 3.14

# {:>10} -> right-align in a field 10 chars wide (spaces pad the left)
print(f'[{name:>10}]')       # [      kale]

# {:<10} -> left-align; {:^10} -> center
print(f'[{name:<10}]')       # [kale      ]

# {!r} -> insert repr(), which adds quotes and shows it is a string
print(f'value is {name!r}')  # value is 'kale'

# specs combine: align AND pad a number with leading zeros
print(f'{42:05d}')           # 00042 -> width 5, zero-filled integer`,
      },
      {
        label: 'join is O(n), += in a loop is O(n^2) — timed',
        code: `import timeit

# SLOW: each += copies the whole accumulated string into a new buffer
def build_with_plus(n):
    s = ''
    for i in range(n):
        s += str(i)          # O(n) work each pass -> O(n^2) total
    return s

# FAST: collect parts, then join allocates ONE buffer of the right size
def build_with_join(n):
    parts = []
    for i in range(n):
        parts.append(str(i)) # cheap append to a list
    return ''.join(parts)    # single O(n) pass

slow = timeit.timeit(lambda: build_with_plus(5000), number=50)
fast = timeit.timeit(lambda: build_with_join(5000), number=50)
print(f'+=   took {slow:.3f}s')   # noticeably larger
print(f'join took {fast:.3f}s')   # noticeably smaller
print(f'join is ~{slow / fast:.1f}x faster')`,
      },
      {
        label: 'Trace / Step-by-step: encode/decode, dedent, casefold',
        code: `import textwrap

# Step 1: text -> bytes for the wire, then bytes -> text on the other side
text = 'café'                  # 'cafe' with an accented e (1 code point)
raw = text.encode('utf-8')          # the accented e takes 2 bytes in UTF-8
print(raw)                          # b'caf\xc3\xa9'
print(len(text), len(raw))          # 4 code points, 5 bytes -> not equal
back = raw.decode('utf-8')          # reverse the encoding
print(back == text)                 # True -> round-trip preserved

# Step 2: dedent strips the common leading whitespace from the block
message = textwrap.dedent('''\
    Dear user,
      Welcome aboard.
    Regards.''')
print(message)
# Dear user,
#   Welcome aboard.   <- inner indent kept, common 4 spaces removed
# Regards.

# Step 3: casefold handles cases lower() cannot, e.g. German sharp s
print('STRASSE'.lower() == 'straße'.casefold())  # True
# 'straße' is 'strasse' with sharp-s; casefold expands it to 'ss'`,
      },
    ],
    gotcha: `Assembling a report with result += line inside a loop over thousands of rows degrades to O(n squared) because each += copies the entire string so far; collect the lines in a list and call '\\n'.join(lines) once at the end for linear time.`,
    tip: `For case-insensitive matching of user input use s.casefold() rather than s.lower(), because casefold applies aggressive Unicode folding (turning the German sharp s into ss, for example) so two strings that should compare equal across languages actually do, which plain lower can miss.`,
    realWorldNote: `Python 3's strict separation of str from bytes was the headline breaking change in the 2008 transition from Python 2, and it eliminated an entire class of silent mojibake bugs that plagued web apps. Django and Flask both decode incoming request bodies to str at the framework boundary and re-encode responses, and the requests library auto-detects response encoding precisely because getting encode/decode wrong is the most common source of UnicodeDecodeError in production web services.`,
  },

  {
    id: 'file-io',
    title: 'File I/O',
    track: 'beginner',
    estimatedMins: 16,
    summary: `In Java you wrestle with BufferedReader, FileReader, and a try-finally just to read one file; in Python you write \`with open(path) as f:\` and you are done. The open() built-in is the single doorway to every file, and the mode string you pass it ('r', 'w', 'a', 'rb') decides everything about how bytes flow in and out. The most important habit to build early is the \`with\` statement: it guarantees the file is closed even if an exception is thrown halfway through, because Python calls the file object's __exit__ method on the way out of the block. Text mode hands you str and quietly translates platform newlines for you, while binary mode hands you raw bytes with no translation at all, which matters the moment you touch images or PDFs. For structured data you almost never hand-roll parsing: the json and csv modules in the standard library turn dicts and lists into files and back. And once you are comfortable, pathlib replaces fragile string-concatenated paths with real Path objects that work the same on Windows and macOS.`,
    keyPoints: [
      `The \`with open(...) as f:\` form is a context manager: when the block ends, normally or via an exception, Python invokes f.__exit__(), which closes the file and flushes any buffered writes. Without it, a crash mid-write can leave the file handle open and the last buffer unflushed, so data you thought you wrote silently vanishes.`,
      `Text mode (the default 'r'/'w') decodes bytes to str using an encoding and translates '\\r\\n' to '\\n' on read; binary mode ('rb'/'wb') gives you raw bytes with zero translation. Open images, PDFs, or anything non-text in binary mode, because newline translation in text mode will corrupt those files.`,
      `Iterating with \`for line in f:\` reads one line at a time and never loads the whole file into RAM, so it handles a 10GB log on a laptop fine. Calling f.read() or f.readlines() pulls the entire file into memory at once, which is convenient for small files but a memory bomb for large ones.`,
      `Always pass encoding='utf-8' explicitly, because Python's default text encoding depends on the operating system locale and can differ between your machine and production. An unspecified encoding is the classic cause of UnicodeDecodeError that only shows up on someone else's computer.`,
      `json.dumps with the indent parameter produces human-readable pretty-printed output, while csv.DictWriter maps each dict to a row by column name so you are not tracking positional order by hand. Both let you serialize Python objects to disk without writing a single parser yourself.`,
    ],
    examples: [
      {
        label: 'with open: read and write text safely',
        code: `# 'w' truncates and creates the file; encoding is explicit so it behaves the same everywhere
with open('notes.txt', 'w', encoding='utf-8') as f:
    f.write('first line\n')   # \n is the only newline you write; Python translates per-OS on disk
    f.write('second line\n')  # the buffer is flushed automatically when the block exits
# at this point __exit__ already ran: file is closed and fully flushed

# 'r' is read mode (the default); iterating reads ONE line at a time, memory-friendly
with open('notes.txt', 'r', encoding='utf-8') as f:
    for line in f:                 # never loads the whole file at once
        print(line.rstrip('\n'))  # rstrip drops the trailing newline so print does not double-space`,
      },
      {
        label: 'JSON and CSV via the standard library',
        code: `import json, csv

record = {'name': 'Ada', 'roles': ['eng', 'lead'], 'active': True}

# indent=2 makes the file readable; without it you get one dense line
with open('record.json', 'w', encoding='utf-8') as f:
    json.dump(record, f, indent=2)  # dump writes straight to the file object, no intermediate string

rows = [{'name': 'Ada', 'score': 9}, {'name': 'Linus', 'score': 7}]
# DictWriter keys rows by column name, so order is driven by fieldnames, not tuple position
with open('scores.csv', 'w', newline='', encoding='utf-8') as f:  # newline='' lets csv handle line endings
    writer = csv.DictWriter(f, fieldnames=['name', 'score'])
    writer.writeheader()           # writes the header row from fieldnames
    writer.writerows(rows)         # each dict becomes a row, matched by key`,
      },
      {
        label: 'Trace / Step-by-step: pathlib + line counting',
        code: `from pathlib import Path

base = Path('data')          # base -> PosixPath('data')
file = base / 'log.txt'      # the / operator joins paths; file -> PosixPath('data/log.txt')
file.parent.mkdir(exist_ok=True)  # creates 'data/' if missing; exist_ok=True avoids an error if it is there
file.write_text('a\nb\nc\n', encoding='utf-8')  # one-shot write helper, opens+writes+closes for you

count = 0
with open(file, encoding='utf-8') as f:
    for line in f:           # iteration 1: line='a\n', count becomes 1
        count += 1           # iteration 2: line='b\n', count becomes 2
                             # iteration 3: line='c\n', count becomes 3
print(count)                 # output: 3
# Output:
# 3`,
      },
    ],
    gotcha: `Opening a file with mode 'w' immediately truncates it to zero bytes the moment open() returns, even before you write anything, so if you meant to add to the end you have silently destroyed the existing content; use mode 'a' (append) to add to the end, or 'r+' to read and update in place.`,
    tip: `Prefer pathlib's \`Path('dir') / 'file.txt'\` over \`os.path.join\` or string concatenation like \`'dir/' + name\`, because the / operator builds paths that work identically on Windows and Unix and reads far more clearly; reach for Path.read_text() and Path.write_text() for quick one-shot reads and writes where you do not need streaming.`,
    realWorldNote: `Python's csv and json modules power countless data pipelines: pandas.read_csv is built on the same parsing concepts, and Apache Airflow tasks routinely stream large log and export files line by line to stay within container memory limits. The 'always pass encoding=utf-8' rule became official guidance in PEP 597, and CPython 3.10+ can warn you with the -X warn_default_encoding flag when you forget it, precisely because locale-dependent defaults caused real production incidents.`,
  },

  {
    id: 'errors',
    title: 'Error Handling',
    track: 'beginner',
    estimatedMins: 18,
    summary: `In C you check return codes after every call and hope you did not forget one; Python instead raises exceptions, objects that travel up the call stack until some try/except catches them, so an unhandled error stops the program with a full traceback instead of corrupting state silently. Every exception is an object in a class hierarchy: BaseException sits at the top, Exception sits just below it for ordinary errors, and specific types like ValueError and KeyError descend from there. That hierarchy is the whole point, because \`except Exception\` catches everything ordinary while \`except KeyError\` catches only the one case you know how to handle. The try statement has four clauses, and each earns its place: try holds the risky code, except handles a failure, else runs only when no exception fired, and finally runs no matter what for cleanup. When you re-raise an error as a different type you use \`raise NewError from original\` so the original traceback is preserved instead of lost. The cardinal rule is to never write a bare \`except:\`, because it also swallows KeyboardInterrupt and SystemExit and turns a hung program into an un-killable one.`,
    keyPoints: [
      `Exceptions form a tree: BaseException is the root, Exception is the base for normal recoverable errors, and concrete types like ValueError, KeyError, and FileNotFoundError are leaves. Catching a base class catches all of its descendants, so \`except Exception\` is broad and \`except KeyError\` is surgical; catch the most specific type you can actually handle.`,
      `The else clause runs only if the try block raised nothing, which lets you separate the code that might fail from the code that should run only on success. This keeps the try block tiny so you do not accidentally catch an exception from a line you never meant to guard.`,
      `The finally clause runs whether or not an exception occurred and even if you return early, making it the right place for cleanup like releasing a lock or closing a resource. Code in finally executes on the way out no matter the path, so it is the one guarantee you get during failures.`,
      `Re-raising with \`raise WrapperError('context') from original\` chains the exceptions so the printed traceback shows both the new error and the underlying cause. Using a plain raise inside the same wrapper without from would hide where the failure truly started, making production debugging far harder.`,
      `A bare \`except:\` catches BaseException, which includes KeyboardInterrupt (Ctrl+C) and SystemExit, so it can make a program impossible to interrupt or shut down cleanly. Always catch \`except Exception\` at minimum, or better, the specific exception you know how to recover from.`,
    ],
    examples: [
      {
        label: 'All four clauses with a custom exception',
        code: `class InsufficientFundsError(Exception):
    def __init__(self, balance, amount):
        # storing fields lets the handler inspect the failure, not just read a string
        self.balance = balance
        self.amount = amount
        super().__init__(f'need {amount}, have {balance}')  # the human-readable message

def withdraw(balance, amount):
    try:
        if amount > balance:
            raise InsufficientFundsError(balance, amount)  # raise our typed error
    except InsufficientFundsError as e:
        print(f'denied: short by {e.amount - e.balance}')   # handler reads the fields
        return balance
    else:
        # runs ONLY if no exception was raised: the success path
        print('approved')
        return balance - amount
    finally:
        # runs ALWAYS, success or failure: ideal for audit logging or cleanup
        print('transaction attempt logged')

withdraw(100, 30)   # approved, then logs
withdraw(50, 999)   # denied, then logs`,
      },
      {
        label: 'Exception chaining with raise from',
        code: `class ConfigError(Exception):
    pass

def load_port(raw):
    try:
        return int(raw)            # int('abc') raises ValueError
    except ValueError as original:
        # 'from original' preserves the ValueError traceback as the cause
        raise ConfigError(f'bad port value: {raw!r}') from original

try:
    load_port('not-a-number')
except ConfigError as e:
    print('caught:', e)            # caught: bad port value: 'not-a-number'
    print('caused by:', type(e.__cause__).__name__)  # caused by: ValueError
# the full traceback would show BOTH errors, so you know the root was a bad int conversion`,
      },
      {
        label: 'Trace / Step-by-step: which clause fires when',
        code: `def parse(value):
    try:
        n = int(value)        # step 1: attempt conversion
    except ValueError:
        print('except ran')   # only if int() failed
        return None
    else:
        print('else ran')     # only if int() succeeded
        return n
    finally:
        print('finally ran')  # every single call

print('--- parse("42") ---')
result = parse('42')
# step 1: int('42') -> 42, no error
# else ran
# finally ran
print('result =', result)   # result = 42

print('--- parse("x") ---')
result = parse('x')
# step 1: int('x') raises ValueError
# except ran
# finally ran  (still runs even though except returned None)
print('result =', result)   # result = None
# Output:
# --- parse("42") ---
# else ran
# finally ran
# result = 42
# --- parse("x") ---
# except ran
# finally ran
# result = None`,
      },
    ],
    gotcha: `Writing \`except (ValueError, KeyError) as e\` is correct, but writing \`except ValueError, KeyError:\` (the old Python 2 comma syntax) is a SyntaxError in Python 3, and writing \`except Exception, e:\` will not run at all; the modern form always uses parentheses for multiple types and the \`as\` keyword for the name.`,
    tip: `Catch the narrowest exception that you can actually recover from rather than \`except Exception\`, because a broad catch hides bugs like typos that raise NameError or AttributeError; if you truly must log everything, use \`except Exception as e: logging.exception(e)\` so the full traceback is recorded and then re-raise unless you can genuinely continue.`,
    realWorldNote: `Django's middleware and FastAPI's exception handlers both rely on catching specific exception subclasses to map them to HTTP status codes, for example turning a custom NotFound into a 404. Python 3.11 added ExceptionGroup and the \`except*\` syntax specifically so asyncio.TaskGroup and libraries like Trio can surface multiple concurrent failures at once instead of discarding all but the first, which was a long-standing pain point in async services at scale.`,
  },

  {
    id: 'modules',
    title: 'Modules & Packages',
    track: 'beginner',
    estimatedMins: 14,
    summary: `Every .py file you write is already a module, and the first time something imports it Python runs the whole file top to bottom, then caches the result so later imports are instant. That caching, held in sys.modules, is why importing the same module ten times executes its code exactly once, and why a circular import can deadlock if two files each need the other before either has finished loading. The famous \`if __name__ == '__main__':\` guard exists because Python sets a module's __name__ to '__main__' only when you run it directly, and to the module's real name when it is imported, so the guard lets a file be both a runnable script and an importable library without firing its script code on import. A package is just a directory that Python treats as a namespace, and inside one you use relative imports like \`from . import utils\` to refer to sibling modules. When you publish or develop a package locally you install it with \`pip install -e .\` so edits to your source take effect without reinstalling. Understanding this load-once, name-aware model is what turns import errors from mysterious into obvious.`,
    keyPoints: [
      `Python sets __name__ to '__main__' when a file is run directly with \`python file.py\`, but to the module's import name when another file imports it. Guarding script-only code behind \`if __name__ == '__main__':\` means the file can be imported for its functions without also executing its demo or CLI code.`,
      `Imports are cached in the sys.modules dictionary, so a module's top-level code runs exactly once per process no matter how many times it is imported. This is why module-level side effects (like opening a connection at import time) happen once, and why re-importing does not re-run setup.`,
      `A circular import happens when module A imports B while B imports A, and Python hits a half-initialized module before its names exist. The fixes are to move the import inside the function that needs it (deferring it until call time), or to extract the shared code into a third module both can import.`,
      `The __all__ list in a module defines exactly which names \`from module import *\` brings in, giving you control over the public surface. Without __all__, star import grabs every name not starting with an underscore, which can leak helpers you meant to keep private.`,
      `Inside a package, relative imports like \`from . import utils\` or \`from .helpers import clean\` resolve against the package's own location rather than the global path. This keeps intra-package references stable even if the package is renamed or nested, whereas absolute imports hard-code the top-level package name.`,
    ],
    examples: [
      {
        label: 'The __name__ guard: script vs import',
        code: `# file: greet.py
def greeting(name):
    return f'Hello, {name}'

def _demo():
    # an underscore prefix signals 'internal'; star import will skip it
    print(greeting('world'))

# __name__ is '__main__' ONLY when you run \`python greet.py\` directly
if __name__ == '__main__':
    _demo()        # runs as a script
# when another file does \`import greet\`, __name__ is 'greet', so _demo() does NOT run
# this lets greet.py be both a CLI tool and an importable library`,
      },
      {
        label: 'Fixing a circular import by deferring',
        code: `# file: orders.py
from . import billing  # if billing.py also imports orders at top level, this can break

def place(order):
    return billing.charge(order)

# file: billing.py  -- the fix is to import INSIDE the function, not at module top
def charge(order):
    from . import orders   # deferred: runs at call time, after both modules finished loading
    note = orders.format_receipt(order)  # by now orders is fully initialized
    return f'charged: {note}'
# alternative fix: move format_receipt + shared helpers into a third module both import`,
      },
      {
        label: 'Trace / Step-by-step: import runs once',
        code: `# file: config.py
print('config module executing')   # top-level code: runs the first time it is imported
VALUE = 42

# file: main.py
print('importing config the first time')
import config            # prints 'config module executing', then caches in sys.modules
print('config.VALUE =', config.VALUE)

print('importing config the second time')
import config            # NO print this time: served from sys.modules cache
print('done')

import sys
print('config' in sys.modules)   # True: it is cached for the rest of the process
# Output:
# importing config the first time
# config module executing
# config.VALUE = 42
# importing config the second time
# done
# True`,
      },
    ],
    gotcha: `If you put expensive or side-effecting code (like network calls or creating a database connection) at module top level instead of behind \`if __name__ == '__main__':\` or inside a function, it fires every time anything imports the module, including when a test runner merely discovers the file; keep top-level code limited to definitions and constants.`,
    tip: `When two modules need each other, do not reach for clever tricks: either defer one import by moving \`import other\` inside the function that uses it, or extract the shared types and helpers into a third neutral module that both import, because the third-module split removes the cycle entirely rather than papering over it.`,
    realWorldNote: `Large frameworks lean on these mechanics constantly: Flask and Django apps use \`if __name__ == '__main__':\` to make app.py both importable by gunicorn and runnable for local dev, and Django's app-loading machinery is carefully ordered to avoid circular imports between models. The editable install \`pip install -e .\` is the standard workflow for developing any library on PyPI, letting maintainers test changes against real consumers without a reinstall on every edit.`,
  },

  {
    id: 'oop-basics',
    title: 'OOP Basics',
    track: 'beginner',
    estimatedMins: 25,
    summary: `Coming from Java you expect a strict divide between primitives and objects, but in Python that divide does not exist: integers, functions, classes, and even modules are all objects with attributes you can inspect and pass around. A class is a blueprint, and when you call ClassName() two methods run in sequence, __new__ which allocates the raw instance and __init__ which fills in its attributes, though you will write __init__ almost every time and __new__ almost never. Python supports multiple inheritance, and it resolves which parent's method wins using the MRO, a deterministic ordering computed by the C3 linearization algorithm that you can inspect with ClassName.__mro__. To expose computed or validated attributes that still look like plain fields, you use the @property decorator and its getter/setter/deleter trio instead of Java-style getX/setX methods. The real expressiveness comes from dunder methods like __len__, __eq__, and __iter__, which hook your objects into Python's built-in syntax so len(obj) and \`for x in obj\` just work. Finally, @staticmethod and @classmethod let a method ignore the instance or receive the class itself, and @dataclass auto-generates the boilerplate __init__ and __eq__ for you.`,
    keyPoints: [
      `Everything in Python is an object, including functions and classes themselves, so you can assign a function to a variable, store classes in a list, and attach attributes to them. This uniformity is why decorators and higher-order functions feel natural: a function is just an object you can pass around like any value.`,
      `Calling a class runs __new__ first to create and return the empty instance, then __init__ to initialize its attributes on that instance. You override __init__ in nearly every class but only touch __new__ for special cases like immutable types or singletons, where you must control allocation itself.`,
      `With multiple inheritance, Python uses C3 linearization to compute a single consistent method resolution order, viewable as ClassName.__mro__. This guarantees each ancestor appears once in a predictable sequence, so super() walks the chain correctly even in diamond-shaped hierarchies instead of calling a parent twice.`,
      `The @property decorator turns a method into a read-only attribute, and pairing it with @name.setter and @name.deleter adds assignment and deletion hooks. This lets you add validation or computation behind what callers see as a plain attribute, so you never have to break the public API later to introduce a getter.`,
      `Dunder methods integrate your class with Python's syntax: __len__ enables len(obj), __eq__ defines ==, __hash__ lets instances live in sets and dict keys, __iter__ enables for-loops, and __contains__ powers the in operator. Implementing them means your objects behave like built-in types instead of requiring custom method calls.`,
    ],
    examples: [
      {
        label: 'Dunder methods make objects behave like built-ins',
        code: `class Playlist:
    def __init__(self, name, tracks):
        self.name = name
        self.tracks = list(tracks)   # store a copy so the caller's list is not aliased

    def __len__(self):               # enables len(playlist)
        return len(self.tracks)

    def __iter__(self):              # enables \`for track in playlist\`
        return iter(self.tracks)

    def __contains__(self, item):    # enables \`'song' in playlist\`
        return item in self.tracks

    def __eq__(self, other):         # defines == by value, not by identity
        return isinstance(other, Playlist) and self.tracks == other.tracks

    def __hash__(self):              # define __hash__ alongside __eq__ to stay usable in sets
        return hash(tuple(self.tracks))

pl = Playlist('road trip', ['a', 'b', 'c'])
print(len(pl))          # 3, via __len__
print('b' in pl)        # True, via __contains__
print([t for t in pl])  # ['a', 'b', 'c'], via __iter__`,
      },
      {
        label: '@property trio and the two method decorators',
        code: `class Temperature:
    def __init__(self, celsius):
        self._celsius = celsius      # underscore marks the backing field as internal

    @property
    def celsius(self):               # getter: callers read temp.celsius like a field
        return self._celsius

    @celsius.setter
    def celsius(self, value):        # setter: validation runs on \`temp.celsius = x\`
        if value < -273.15:
            raise ValueError('below absolute zero')
        self._celsius = value

    @celsius.deleter
    def celsius(self):               # deleter: runs on \`del temp.celsius\`
        self._celsius = 0.0

    @property
    def fahrenheit(self):            # computed, read-only: no setter defined
        return self._celsius * 9 / 5 + 32

    @staticmethod
    def is_valid(value):             # no self, no cls: a plain utility grouped on the class
        return value >= -273.15

    @classmethod
    def from_fahrenheit(cls, f):     # receives the class, returns an instance: alternate constructor
        return cls((f - 32) * 5 / 9)

t = Temperature(25)
print(t.fahrenheit)            # 77.0, computed on access
t.celsius = 30                # goes through the setter (validated)
print(Temperature.is_valid(-300))   # False, static utility
print(Temperature.from_fahrenheit(212).celsius)  # 100.0, classmethod constructor`,
      },
      {
        label: 'Trace / Step-by-step: MRO and __new__ vs __init__',
        code: `class Base:
    def __new__(cls, *args):
        print('1 __new__ creates the empty instance')
        return super().__new__(cls)   # allocate; must return the instance
    def __init__(self, x):
        print('2 __init__ fills attributes')
        self.x = x

b = Base(99)
# call order on Base(99):
#   __new__ runs first -> prints '1 ...', returns blank instance
#   __init__ runs next  -> prints '2 ...', sets self.x = 99
print('b.x =', b.x)

class A:    pass
class B(A): pass
class C(A): pass
class D(B, C): pass    # diamond: D inherits from B and C, both from A

# C3 linearization gives ONE consistent order, A appears once at the end
print([k.__name__ for k in D.__mro__])
# Output:
# 1 __new__ creates the empty instance
# 2 __init__ fills attributes
# b.x = 99
# ['D', 'B', 'C', 'A', 'object']`,
      },
    ],
    gotcha: `Defining __eq__ on a class without also defining __hash__ silently sets __hash__ to None, making instances unhashable so they raise TypeError the moment you put one in a set or use it as a dict key; whenever you write __eq__ and still need the object to be hashable, define __hash__ too (or use @dataclass(frozen=True) which handles both).`,
    tip: `Use @classmethod for alternate constructors that return cls(...) (like Temperature.from_fahrenheit) so subclasses get the right type automatically, and use @staticmethod only for a plain helper that logically belongs to the class but touches neither the instance nor the class; reach for @dataclass when a class is mostly data, since it auto-generates __init__, __repr__, and __eq__ and removes a dozen lines of boilerplate.`,
    realWorldNote: `Python's own standard library leans on these features everywhere: collections.OrderedDict and pathlib.Path implement dunder methods for equality and iteration, and Django model fields use the descriptor protocol that @property is built on. The dataclasses module, added in Python 3.7 via PEP 557, is now the default way teams at companies like Instagram and Dropbox define plain data containers, and Pydantic, the validation layer under FastAPI, extends the same class-and-descriptor machinery to enforce types at runtime.`,
  },

  // -- ADVANCED -------------------------------------------------------------------
  {
    id: 'comprehensions',
    title: 'Comprehensions',
    track: 'advanced',
    estimatedMins: 16,
    summary: `In Java or C you would write a for loop, declare an empty list, and append inside the loop just to build a transformed collection. Python lets you collapse that entire pattern into a single readable expression called a comprehension. There are four flavors that share one syntax skeleton: list comprehensions with square brackets, dict comprehensions and set comprehensions with curly braces, and generator expressions with parentheses. The first three build the whole collection in memory immediately, while the generator expression produces a lazy iterator that computes one value at a time. Comprehensions are not just shorthand; the Python interpreter runs them in optimized C-level loops, so they are usually faster than the equivalent manual loop. The mental model to carry forward is that the leftmost part is the output expression and everything after it reads top to bottom like the nested for loops it replaces.`,
    keyPoints: [
      `The four forms differ only by their brackets and output shape: [x for x in it] makes a list, {k: v for ...} makes a dict, {x for ...} makes a set, and (x for ...) makes a generator. Choosing the wrong bracket silently changes the type you get back, so a stray pair of braces turns an intended list into a set and quietly drops duplicates.`,
      `A list comprehension materializes every element at once, but a generator expression holds only the recipe and yields values on demand. This is why sys.getsizeof on a million-element list comprehension reports megabytes while the equivalent generator object reports under 200 bytes regardless of how many values it will eventually produce.`,
      `Nested comprehensions read in the same left-to-right order you would write the nested for loops, meaning the first for clause is the outer loop and the second is the inner loop. The common confusion is that the output expression sits before the loops even though it executes last, which is the reverse of how a normal loop body is positioned.`,
      `Functions like sum(), any(), all(), max(), and min() accept a generator expression directly without an extra pair of brackets, so you write sum(x*x for x in nums) rather than sum([x*x for x in nums]). Dropping the inner brackets avoids building a throwaway list and lets all() and any() short-circuit as soon as the answer is known.`,
      `Comprehensions are meant to compute and return a value, not to perform side effects like printing or mutating external state. Writing [print(x) for x in items] builds a useless list of None values and signals to every Python reader that the code is being misused as a loop.`,
    ],
    examples: [
      {
        label: 'The four forms side by side',
        code: `nums = [1, 2, 2, 3, 4]

# List comprehension: square brackets, builds a real list now
squares = [n * n for n in nums]           # [1, 4, 4, 9, 16] - order kept, dupes kept

# Set comprehension: curly braces, no key:value pair -> a set, dupes collapse
unique_squares = {n * n for n in nums}    # {16, 1, 4, 9} - the two 4s become one

# Dict comprehension: curly braces WITH key: value -> a dict
square_map = {n: n * n for n in nums}     # {1: 1, 2: 4, 3: 9, 4: 16} - dup key 2 overwrites

# Generator expression: parentheses, builds NOTHING yet, just a lazy recipe
square_gen = (n * n for n in nums)        # <generator object> - no values computed

print(squares, unique_squares, square_map)
print(next(square_gen))                    # 1 - first value produced only when asked`,
      },
      {
        label: 'Memory: list vs generator with getsizeof',
        code: `import sys

# Build a real list of one million squares - every value lives in RAM right now
big_list = [n * n for n in range(1_000_000)]

# Build a generator for the same values - only the recipe is stored
big_gen = (n * n for n in range(1_000_000))

# getsizeof measures the container itself, not the eventual contents
print(sys.getsizeof(big_list))   # ~8000000+ bytes - grows with element count
print(sys.getsizeof(big_gen))    # ~200 bytes - FIXED, independent of size

# any()/all()/sum() take the generator directly, no inner brackets needed
print(sum(n * n for n in range(1_000_000)))        # streams, never holds a list
print(any(n > 999_000 for n in range(1_000_000)))  # stops early at first True`,
      },
      {
        label: 'Trace / Step-by-step: nested comprehension reading order',
        code: `# Flatten a matrix - the for clauses run outer-then-inner, left to right
matrix = [[1, 2], [3, 4], [5, 6]]

flat = [value for row in matrix for value in row]
# Equivalent expanded loop, proving the reading order:
#   result = []
#   for row in matrix:        <- FIRST for clause = OUTER loop
#       for value in row:     <- SECOND for clause = INNER loop
#           result.append(value)   <- output expression runs LAST per iteration
#
# Trace of \`flat\` being built:
#   row=[1,2] -> value=1 -> flat=[1]
#   row=[1,2] -> value=2 -> flat=[1, 2]
#   row=[3,4] -> value=3 -> flat=[1, 2, 3]
#   row=[3,4] -> value=4 -> flat=[1, 2, 3, 4]
#   row=[5,6] -> value=5 -> flat=[1, 2, 3, 4, 5]
#   row=[5,6] -> value=6 -> flat=[1, 2, 3, 4, 5, 6]
print(flat)   # [1, 2, 3, 4, 5, 6]`,
      },
    ],
    gotcha: `Writing {n * n for n in nums} when you meant a list silently gives you a set, dropping duplicates and discarding order; use square brackets [n * n for n in nums] when you need every element in sequence. The same brace trap bites the other way: {k: v for ...} is a dict but {expr for ...} is a set, so forgetting the colon changes the type entirely.`,
    tip: `Reach for a generator expression instead of a list comprehension whenever you only iterate the result once or pass it straight into sum(), any(), all(), max(), or a for loop, because the generator streams values and never allocates the full collection. Switch to a list only when you genuinely need to index it, len() it, or walk it more than once.`,
    realWorldNote: `Django's queryset and ORM internals lean on generator expressions so that .values_list() and aggregate calls stream rows from the database cursor rather than loading an entire table into memory. Data pipelines built on libraries like Apache Beam and pandas chunked readers use the same lazy-generator pattern to process files larger than RAM. When you see a production OOM crash from a [row for row in giant_query] in a web handler, the fix is almost always swapping the brackets for parentheses.`,
  },

  {
    id: 'decorators',
    title: 'Decorators',
    track: 'advanced',
    estimatedMins: 20,
    summary: `If you have ever wanted to add logging, timing, caching, or access checks around a function without editing its body, decorators are Python's built-in answer, and they are simpler than they look once you see through the @ symbol. The key insight is that @my_decorator written above a function is pure syntactic sugar: at the moment the function is defined, Python silently runs func = my_decorator(func). Because functions are first-class objects in Python, a decorator is just a function that takes a function and returns a (usually wrapped) replacement. The wrapper you return should be tagged with functools.wraps so the new function keeps the original's name, docstring, and a reference back to the wrapped original. When your decorator needs its own arguments you add a third layer of nesting, and when it needs to hold state you can write it as a class with a __call__ method instead. Decorators stack, and the stacking order matters: the one closest to the function is applied first.`,
    keyPoints: [
      `The @decorator line is applied once, at definition time, and is exactly equivalent to reassigning the name: writing @timer above def work() means work = timer(work) runs immediately when the module loads. This is why an expensive setup inside the decorator body runs at import, not on every call.`,
      `Always wrap your inner function with @functools.wraps(func) so the returned wrapper copies the original __name__, __doc__, and __module__, and exposes the original through __wrapped__. Skip it and tools like help(), debuggers, and introspection-based frameworks will report the useless name 'wrapper' for every decorated function.`,
      `A decorator that takes its own arguments needs three nested levels: the outer function takes the decorator's args and returns the real decorator, which takes the function and returns the wrapper. Forgetting a level is the single most common decorator bug because @repeat(3) calls repeat first and then applies its return value to the function.`,
      `A class with a __call__ method can be a decorator and is the cleaner choice when the decorator must accumulate state across calls, since instance attributes survive between invocations. Use functools.update_wrapper(self, func) in __init__ to preserve metadata the way functools.wraps does for function-based decorators.`,
      `When multiple decorators stack, they apply bottom-up but execute top-down: the decorator nearest the def runs first to build the innermost wrapper, then each one above wraps that result. So @a @b def f means f = a(b(f)), and at call time a's wrapper code runs before b's.`,
    ],
    examples: [
      {
        label: 'Basic decorator with functools.wraps',
        code: `import functools

def timer(func):                          # takes the function to wrap
    @functools.wraps(func)                # copy __name__/__doc__/__wrapped__ over
    def wrapper(*args, **kwargs):         # accept ANY signature so it is reusable
        import time
        start = time.perf_counter()       # record before the real call
        result = func(*args, **kwargs)    # call the original, keep its return value
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.6f}s")
        return result                     # MUST return it or the caller gets None
    return wrapper                        # hand back the replacement function

@timer                                    # same as: slow_add = timer(slow_add)
def slow_add(a, b):
    """Add two numbers."""
    return a + b

print(slow_add(2, 3))           # prints timing line, then 5
print(slow_add.__name__)        # 'slow_add' not 'wrapper' - thanks to wraps
print(slow_add.__doc__)         # 'Add two numbers.' preserved
print(slow_add.__wrapped__)     # reference to the undecorated original`,
      },
      {
        label: 'Decorator factory (3 levels) and class-based decorator',
        code: `import functools

# THREE levels because the decorator itself takes an argument (times)
def repeat(times):                        # level 1: takes decorator's own arg
    def decorator(func):                  # level 2: the actual decorator
        @functools.wraps(func)
        def wrapper(*args, **kwargs):     # level 3: the call-time wrapper
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(3)                                # repeat(3) runs first, returns decorator
def greet(name):
    print(f"Hi {name}")

greet("Ada")                              # prints "Hi Ada" three times

# Class-based decorator: __call__ makes the instance callable, state lives on self
class CountCalls:
    def __init__(self, func):
        functools.update_wrapper(self, func)  # preserve metadata like wraps does
        self.func = func
        self.count = 0                    # state survives across calls
    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"call #{self.count} of {self.func.__name__}")
        return self.func(*args, **kwargs)

@CountCalls                               # ping = CountCalls(ping)
def ping():
    return "pong"

ping(); ping()                            # "call #1..." then "call #2..."`,
      },
      {
        label: 'Trace / Step-by-step: stacking order is bottom-up',
        code: `import functools

def shout(func):
    @functools.wraps(func)
    def w(*a, **k):
        return func(*a, **k).upper()      # wraps result in upper()
    return w

def exclaim(func):
    @functools.wraps(func)
    def w(*a, **k):
        return func(*a, **k) + "!"        # appends a bang
    return w

@shout                                    # applied SECOND (outer)
@exclaim                                  # applied FIRST (inner, nearest def)
def hello():
    return "hi"

# Definition-time trace (bottom-up build):
#   step 1: exclaim(hello)  -> function that returns "hi!"
#   step 2: shout(<that>)   -> function that returns "HI!"
#   so hello == shout(exclaim(hello))
#
# Call-time trace of hello():
#   shout's wrapper runs   -> calls exclaim's wrapper
#     exclaim's wrapper    -> calls real hello() -> "hi"
#     exclaim adds "!"     -> "hi!"
#   shout uppercases       -> "HI!"
print(hello())   # HI!`,
      },
    ],
    gotcha: `If your decorator returns the wrapper but the wrapper forgets to return func(*args, **kwargs), every decorated function silently returns None even though the original computed a real value; always end the wrapper with return result. The second classic trap is omitting @functools.wraps, which makes help() and stack traces show 'wrapper' for everything and breaks frameworks that read __name__.`,
    tip: `Use @functools.lru_cache(maxsize=N) when you want a bounded memoization cache and @functools.cache when you want an unbounded one, because cache (added in 3.9) is simply lru_cache(maxsize=None) with less overhead. Reach for a decorator factory only when you actually need a parameter; if there is no argument, a plain two-level decorator is simpler and avoids the @deco() versus @deco mistake.`,
    realWorldNote: `Flask routes every endpoint through the @app.route('/path') decorator factory, and Click builds entire command-line interfaces from stacked @click.command and @click.option decorators. Python's standard library ships @functools.lru_cache, which production services use to memoize expensive pure functions like config parsing or pricing lookups. Pytest's @pytest.fixture and @pytest.mark.parametrize are decorators that the test runner introspects, which is exactly why preserving __wrapped__ via functools.wraps matters in real test suites.`,
  },

  {
    id: 'generators',
    title: 'Generators & Iterators',
    track: 'advanced',
    estimatedMins: 22,
    summary: `In most languages, a function runs to completion and returns one value, then its local variables vanish. Python generators break that rule: a function containing yield does not run when you call it, and each yield freezes the entire function frame, including all locals, until you ask for the next value. This lets you write code that produces a sequence lazily, one item at a time, even an infinite sequence, while using ordinary loop and variable syntax. Under the hood this rests on the iterator protocol: an object is iterable if it has __iter__, and an iterator is something with __next__ that raises StopIteration when exhausted. A generator object satisfies both because its __iter__ returns itself. Beyond plain yield, generators support two-way communication through send() and throw(), composition through yield from, and the entire itertools module provides battle-tested building blocks like chain, islice, cycle, and groupby. You can also build the same behavior the manual way with a class implementing __iter__ and __next__, which is worth seeing once to understand what the generator syntax hides.`,
    keyPoints: [
      `Calling a generator function does not execute its body; it returns a generator object, and the body runs only as you pull values with next() or a for loop. Each yield suspends the frame in place, preserving every local variable, so execution resumes on the line after yield the next time you ask for a value.`,
      `A generator implements the full iterator protocol: its __iter__ returns the generator itself and its __next__ resumes execution until the next yield or raises StopIteration when the function ends. This is why you can pass a generator anywhere a for loop or list() or sum() expects an iterable.`,
      `send(value) resumes a paused generator and makes the paused yield expression evaluate to value, enabling two-way data flow, while throw(exc) raises an exception at the suspension point. You must call next() or send(None) once first to advance to the initial yield before any meaningful send() can land.`,
      `yield from delegates to a sub-iterable, yielding all of its items and transparently forwarding send() and throw() to it, which both flattens nested generators and is the foundation of generator-based coroutines. Without yield from you would write a manual for loop that re-yields and loses the send/throw forwarding.`,
      `itertools provides memory-efficient iterator tools: chain joins several iterables end to end, islice takes a slice without indexing, cycle repeats forever, and groupby clusters consecutive equal keys. These run in C and never build intermediate lists, so they compose cleanly over infinite or huge streams.`,
    ],
    examples: [
      {
        label: 'yield suspends the frame; the iterator protocol',
        code: `def countdown(n):
    print("start")             # proves body does NOT run on the call line
    while n > 0:
        yield n               # FREEZE here, hand n out, keep n and the loop alive
        n -= 1                # resumes HERE on the next next() call
    print("done")

gen = countdown(3)            # nothing printed yet - just a generator object
print(type(gen))             # <class 'generator'>
print(gen is iter(gen))      # True - a generator's __iter__ returns itself

print(next(gen))             # prints "start", then 3
print(next(gen))             # 2  (resumed right after the yield)
print(next(gen))             # 1
# next(gen) here would print "done" then raise StopIteration
for x in countdown(2):       # a for loop swallows StopIteration for you
    print("loop", x)`,
      },
      {
        label: 'send/throw, yield from, and itertools',
        code: `import itertools

def accumulator():
    total = 0
    while True:
        incoming = yield total    # value from send() lands in \`incoming\`
        if incoming is None:
            continue
        total += incoming

acc = accumulator()
next(acc)                         # prime it: advance to the first yield
print(acc.send(10))               # 10 - send resumes and feeds 10 in
print(acc.send(5))                # 15 - state (total) persisted

# yield from flattens AND forwards send/throw to the sub-generator
def chained():
    yield from range(3)           # 0,1,2 without a manual re-yield loop
    yield from "ab"               # 'a','b'
print(list(chained()))            # [0, 1, 2, 'a', 'b']

# itertools: lazy, C-speed, no intermediate lists
first5 = itertools.islice(itertools.cycle([1, 2]), 5)  # cycle is infinite
print(list(first5))               # [1, 2, 1, 2, 1]
print(list(itertools.chain([1], [2, 3])))              # [1, 2, 3]
data = [1, 1, 2, 2, 2, 3]
for key, group in itertools.groupby(data):             # groups CONSECUTIVE equals
    print(key, list(group))                            # 1 [1,1] / 2 [2,2,2] / 3 [3]`,
      },
      {
        label: 'Trace / Step-by-step: class iterator vs generator',
        code: `# Manual iterator class - shows exactly what the generator syntax hides
class Countdown:
    def __init__(self, n):
        self.n = n
    def __iter__(self):
        return self                # the object is its own iterator
    def __next__(self):
        if self.n <= 0:
            raise StopIteration    # you must raise this yourself
        self.n -= 1
        return self.n + 1

# Trace of for x in Countdown(3):
#   iter(obj)      -> returns obj (n=3)
#   __next__()     -> n becomes 2, returns 3   | loop sees 3
#   __next__()     -> n becomes 1, returns 2   | loop sees 2
#   __next__()     -> n becomes 0, returns 1   | loop sees 1
#   __next__()     -> n<=0, raises StopIteration | loop ends
print([x for x in Countdown(3)])   # [3, 2, 1]

# The generator equivalent - 3 lines do all of the above automatically
def countdown_gen(n):
    while n > 0:
        yield n
        n -= 1
print([x for x in countdown_gen(3)])   # [3, 2, 1]`,
      },
    ],
    gotcha: `A generator is single-use: once it raises StopIteration it is exhausted, so calling list(gen) twice gives the full list then an empty list, and reusing the same generator across two loops silently processes zero items the second time. If you need to iterate more than once, store list(gen) or call the generator function again to get a fresh object.`,
    tip: `Use yield from sub_iterable instead of a for loop that re-yields, because yield from is shorter and, critically, forwards send() and throw() to the delegated generator, which a manual loop cannot do. Prefer itertools.islice(gen, n) over slicing gen[:n], since generators are not subscriptable and islice consumes lazily without building a list.`,
    realWorldNote: `Python's file objects are iterators, so for line in open('huge.log') streams a multi-gigabyte file one line at a time without loading it into RAM, which is the standard pattern in log-processing tools. Django's StreamingHttpResponse and Flask's stream_with_context wrap generators to send large CSV exports and server-sent events chunk by chunk. The asyncio event loop and older Twisted coroutines were built on generator yield from delegation before async/await syntax made it native.`,
  },

  {
    id: 'context-managers',
    title: 'Context Managers',
    track: 'advanced',
    estimatedMins: 16,
    summary: `In C you must remember to fclose every file you fopen, and in Java you historically wrapped cleanup in a try/finally block that was easy to get wrong. Python's with statement and the context manager protocol behind it guarantee that setup and teardown happen as a pair, even when an exception fires mid-block. Any object with __enter__ and __exit__ methods is a context manager: __enter__ runs at the top of the with block and its return value is what the as variable binds to, while __exit__ always runs on the way out and receives the exception type, value, and traceback if one occurred. If __exit__ returns a truthy value it swallows that exception, which is a powerful and occasionally dangerous capability. Writing the protocol by hand is verbose, so contextlib.contextmanager lets you express a context manager as a single generator where the code before yield is the enter phase and the code after is the exit phase. The standard library also ships ready-made helpers like contextlib.suppress, ExitStack, and nullcontext for common patterns.`,
    keyPoints: [
      `The value returned by __enter__ is bound to the name after as, which is why with open('f') as fh gives you the file handle rather than the file object's context manager. Returning self from __enter__ is the most common choice, but you can return anything, including a fresh resource the caller should use.`,
      `__exit__ is called no matter how the block ends and receives three arguments: the exception type, the exception value, and the traceback, all None on a clean exit. Returning True from __exit__ suppresses the exception so it does not propagate, while returning False or None lets it continue to bubble up.`,
      `The @contextlib.contextmanager decorator turns a generator into a context manager where everything before the single yield is the __enter__ logic and everything after is the __exit__ logic. You should wrap the yield in try/finally so cleanup runs even when the with block raises, since the exception is re-raised at the yield point.`,
      `contextlib.suppress(SomeError) is a clean replacement for try/except SomeError: pass, and nullcontext() is a do-nothing context manager useful as a placeholder when a resource may or may not be needed. These remove boilerplate and make optional-resource code read uniformly.`,
      `contextlib.ExitStack lets you enter a dynamic, runtime-determined number of context managers and guarantees all of them are exited in reverse order even if one fails. It is the right tool when you open a list of files whose count you only know at runtime, replacing deeply nested with statements.`,
    ],
    examples: [
      {
        label: 'Class-based context manager with __enter__/__exit__',
        code: `class Transaction:
    def __enter__(self):
        print("BEGIN")
        self.committed = False
        return self                # this is what \`as tx\` binds to
    def __exit__(self, exc_type, exc_val, tb):
        # exc_type is None on a clean exit, or the exception class on failure
        if exc_type is None:
            print("COMMIT")
        else:
            print(f"ROLLBACK due to {exc_type.__name__}: {exc_val}")
        return False               # False -> do NOT suppress; let it propagate

with Transaction() as tx:          # __enter__ runs, returns tx
    print("doing work")
# clean path prints: BEGIN / doing work / COMMIT

try:
    with Transaction() as tx:
        raise ValueError("bad row")   # __exit__ still runs with the exc info
except ValueError:
    print("caught outside")           # because __exit__ returned False`,
      },
      {
        label: '@contextmanager generator form and stdlib helpers',
        code: `import contextlib

@contextlib.contextmanager
def tag(name):
    print(f"<{name}>")             # everything BEFORE yield == __enter__
    try:
        yield name                # the yielded value becomes the \`as\` variable
    finally:
        print(f"</{name}>")       # everything AFTER yield == __exit__, always runs

with tag("div") as t:
    print(f"content of {t}")
# prints <div> / content of div / </div>

# suppress: cleaner than try/except FileNotFoundError: pass
with contextlib.suppress(FileNotFoundError):
    open("does-not-exist.txt")    # error is swallowed, code continues
print("survived the missing file")

# nullcontext: a placeholder context manager that does nothing
use_lock = False
import threading
lock = threading.Lock() if use_lock else contextlib.nullcontext()
with lock:                        # works whether or not we actually have a lock
    print("critical-ish section")`,
      },
      {
        label: 'Trace / Step-by-step: ExitStack with N resources',
        code: `import contextlib

class Res:
    def __init__(self, name):
        self.name = name
    def __enter__(self):
        print(f"open {self.name}")
        return self
    def __exit__(self, *exc):
        print(f"close {self.name}")
        return False

names = ["a", "b", "c"]           # count known only at runtime
with contextlib.ExitStack() as stack:
    resources = [stack.enter_context(Res(n)) for n in names]
    print("using", [r.name for r in resources])

# Trace of enter/exit order:
#   open a            <- entered in list order
#   open b
#   open c
#   using ['a','b','c']
#   close c           <- exited in REVERSE order (LIFO), guaranteed
#   close b
#   close a
# If Res(b).__enter__ had raised, a would still be closed correctly.`,
      },
    ],
    gotcha: `Returning True from __exit__ silently swallows every exception in the block, so a context manager written to suppress one specific error will also hide unrelated bugs like a KeyError or a typo; inspect exc_type and return True only for the exact exception you intend to suppress. In the @contextmanager form, forgetting the try/finally around yield means cleanup is skipped whenever the with body raises.`,
    tip: `Reach for contextlib.ExitStack instead of nesting many with statements when the number of resources is dynamic or computed in a loop, because ExitStack guarantees reverse-order cleanup even if a later resource fails to open. Use @contextlib.contextmanager for one-off, single-yield managers and a full class only when you need reusable state or multiple methods.`,
    realWorldNote: `SQLAlchemy sessions and Django's transaction.atomic() are context managers that commit on a clean block exit and roll back automatically when an exception escapes the with body. pytest uses with pytest.raises(ValueError) as a context manager to assert that code inside the block raises, relying on __exit__ inspecting the exception type. Cloud SDKs like boto3 and the requests library expose sessions as context managers so connection pools are torn down deterministically rather than waiting on garbage collection.`,
  },

  {
    id: 'closures',
    title: 'Closures & Scope',
    track: 'advanced',
    estimatedMins: 18,
    summary: `When you write x = 42 inside a function in Python, where that name lives and who else can see it is governed by a precise lookup order called LEGB: Local, Enclosing, Global, Built-in. A closure happens when an inner function references a variable from its enclosing function and is then returned or stored, so the inner function carries that enclosing variable with it even after the outer function has finished. This is how Python lets a function remember state without a class. The crucial and surprising detail is that a closure captures the variable by reference, not by snapshotting its value, which leads directly to the famous loop-lambda bug where every closure created in a loop sees the loop variable's final value. To rebind names in outer scopes you need nonlocal for an enclosing scope and global for module scope, since plain assignment always creates a new local. functools.partial offers a cleaner alternative to hand-rolled closures for the simple case of pre-filling arguments, and inspect.getclosurevars lets you see exactly what a closure has captured.`,
    keyPoints: [
      `Name resolution follows LEGB: Python first checks the Local function scope, then any Enclosing function scopes, then the module Global scope, and finally the Built-in namespace. Understanding this order explains why a local variable shadows a global of the same name and why referencing a name you also assign later raises UnboundLocalError.`,
      `A closure is an inner function plus the enclosing variables it references, kept alive in the function's __closure__ cells even after the outer function returns. This lets you build factory functions and stateful callbacks without defining a class, since the captured variables persist between calls to the inner function.`,
      `Closures capture variables by reference, so a closure created inside a loop reads the loop variable's current value at call time, not at creation time. Every lambda built in for i in range(3): funcs.append(lambda: i) will print 2 because they all reference the same i, which ended at 2.`,
      `Use nonlocal name to rebind a variable in the nearest enclosing function scope and global name to rebind a module-level variable; without these, an assignment inside the inner function just creates a new local and shadows the outer one. This is the mechanism for a closure that mutates captured state, like a counter.`,
      `functools.partial(func, *fixed_args) pre-binds arguments and returns a new callable, which is a cleaner, introspectable alternative to writing a closure whose only job is to remember some constant arguments. Unlike a lambda, a partial exposes its .func, .args, and .keywords for debugging.`,
    ],
    examples: [
      {
        label: 'LEGB resolution and a stateful closure',
        code: `x = "global"                      # G: module scope

def outer():
    x = "enclosing"               # E: outer's local, enclosing for inner
    def inner():
        # no local x here, so Python walks L -> E -> G -> B
        print(x)                  # finds "enclosing" at the E level
    inner()
outer()                           # prints "enclosing"

# A closure that REMEMBERS state without a class
def make_counter():
    count = 0                     # captured by the inner function
    def increment():
        nonlocal count            # rebind the ENCLOSING count, not a new local
        count += 1
        return count
    return increment              # the returned func carries \`count\` with it

c = make_counter()
print(c(), c(), c())              # 1 2 3 - count persists between calls
print(c.__closure__[0].cell_contents)  # 3 - the captured value lives in a cell`,
      },
      {
        label: 'The loop-lambda bug and three fixes',
        code: `from functools import partial

# THE BUG: all lambdas capture the SAME i by reference
broken = [lambda: i for i in range(3)]
print([f() for f in broken])      # [2, 2, 2] - i ended at 2, shared by all

# FIX 1: default argument snapshots i's value at definition time
fixed1 = [lambda i=i: i for i in range(3)]
print([f() for f in fixed1])      # [0, 1, 2] - each binds its own i now

# FIX 2: a factory function gives each closure its own scope
def make(i):
    return lambda: i              # i is this call's local, frozen per call
fixed2 = [make(i) for i in range(3)]
print([f() for f in fixed2])      # [0, 1, 2]

# FIX 3: functools.partial pre-binds the argument explicitly
def identity(i):
    return i
fixed3 = [partial(identity, i) for i in range(3)]
print([f() for f in fixed3])      # [0, 1, 2]`,
      },
      {
        label: 'Trace / Step-by-step: nonlocal vs global and getclosurevars',
        code: `import inspect

calls = 0                         # module-global

def tracker():
    hits = 0                      # enclosing local
    def record():
        global calls              # rebinds the MODULE-level calls
        nonlocal hits             # rebinds the ENCLOSING hits
        calls += 1
        hits += 1
        return (calls, hits)
    return record

r1 = tracker()
r2 = tracker()                    # a SEPARATE closure, fresh \`hits\`

# Trace of the shared global vs the per-closure nonlocal:
print(r1())   # global calls 0->1, r1.hits 0->1  => (1, 1)
print(r1())   # global calls 1->2, r1.hits 1->2  => (2, 2)
print(r2())   # global calls 2->3, r2.hits 0->1  => (3, 1)  <- hits reset, calls shared

# inspect shows exactly what was captured
print(inspect.getclosurevars(r1).nonlocals)   # {'hits': 2}
print(inspect.getclosurevars(r1).globals)     # {'calls': 3}`,
      },
    ],
    gotcha: `Building closures in a loop with lambda: i captures the loop variable by reference, so all of them return the final value (commonly seen as event handlers that all fire on the last item); fix it by snapshotting per iteration with lambda i=i: i. A related trap is assigning to a name you also read from an outer scope, which makes Python treat it as local everywhere in the function and raises UnboundLocalError until you add nonlocal or global.`,
    tip: `Use functools.partial(func, fixed_arg) instead of lambda: func(fixed_arg) when your only goal is to pre-fill arguments, because partial avoids the loop-capture bug entirely and exposes .func and .args for introspection and pickling. Reserve handwritten closures for cases that genuinely need mutable captured state via nonlocal.`,
    realWorldNote: `React-style callback bugs have a direct Python twin in Tkinter and Qt, where attaching button.config(command=lambda: handler(i)) inside a loop wires every button to the last index unless you use the i=i default-argument fix. Flask's url_for and many plugin registries rely on closures to defer computation, and functools.partial is used throughout asyncio (loop.call_later(delay, partial(cb, arg))) and the multiprocessing module to ship pre-bound callables to worker processes.`,
  },

  {
    id: 'dataclasses',
    title: 'Dataclasses',
    track: 'advanced',
    estimatedMins: 18,
    summary: `In Java you write a class, then a constructor, then equals, then hashCode, then toString, mostly boilerplate that just shuffles the same fields around. Python's @dataclass decorator, added in 3.7, reads your class-level type annotations and generates all of that for you: a real __init__ that assigns each field, a readable __repr__, and an __eq__ that compares tuples of fields. You declare the shape once with annotations and Python writes the plumbing. Mutable defaults like lists need special handling through field(default_factory=list) to avoid the shared-default trap that bites every Python beginner. You can hook in validation with __post_init__, make instances immutable and hashable with frozen=True, generate ordering comparisons with order=True, and convert to plain dicts or copy-with-changes via dataclasses.asdict and dataclasses.replace. Newer flags like KW_ONLY in 3.10 force keyword-only fields and slots=True in 3.10 trade the per-instance __dict__ for __slots__ to cut memory. Dataclasses sit between a bare tuple and a full hand-written class, giving structure without ceremony.`,
    keyPoints: [
      `@dataclass inspects the class-level annotated fields and auto-generates __init__, __repr__, and __eq__, so writing name: str and age: int is enough to get a working constructor and value-based equality. The generated __eq__ compares instances field by field as if they were tuples, which is almost never what you get from a default object identity comparison.`,
      `Mutable defaults must use field(default_factory=list) rather than a literal, because a default like items: list = [] would be created once and shared across every instance. The dataclass machinery actually raises a ValueError if you try to use a mutable literal default, steering you to default_factory which calls the factory fresh per instance.`,
      `Define __post_init__(self) to run validation or derived-field computation right after the generated __init__ assigns all fields, which is the dataclass equivalent of extra constructor logic. It is the correct place to raise on bad input or compute a field marked with field(init=False).`,
      `frozen=True makes instances immutable by blocking attribute assignment and, in combination with eq, generates a __hash__ so the objects can be used as dict keys or set members. order=True additionally generates __lt__, __le__, __gt__, and __ge__ that compare the field tuple, letting you sort instances directly.`,
      `dataclasses.asdict() recursively converts an instance (and nested dataclasses) into a plain dict for serialization, and dataclasses.replace(obj, field=new) returns a copy with selected fields changed, which is the idiomatic way to update a frozen instance. KW_ONLY marks following fields keyword-only and slots=True swaps __dict__ for __slots__ to lower per-instance memory.`,
    ],
    examples: [
      {
        label: 'Generated methods and the mutable-default fix',
        code: `from dataclasses import dataclass, field

@dataclass
class Point:
    x: int                        # annotation = a field in the generated __init__
    y: int = 0                    # a default value, like a default arg

p = Point(1, 2)
print(p)                          # Point(x=1, y=2) - free __repr__
print(p == Point(1, 2))           # True - free field-by-field __eq__

@dataclass
class Cart:
    owner: str
    # WRONG: items: list = []  would be SHARED across all carts and raises ValueError
    items: list = field(default_factory=list)  # fresh list per instance

a = Cart("ada")
b = Cart("bob")
a.items.append("book")            # only a's list changes
print(a.items, b.items)           # ['book'] [] - not shared`,
      },
      {
        label: '__post_init__, frozen, order, asdict, replace',
        code: `from dataclasses import dataclass, field, asdict, replace

@dataclass(frozen=True, order=True)   # frozen -> immutable + hashable; order -> comparisons
class Money:
    amount: int
    currency: str = "USD"
    def __post_init__(self):          # runs after __init__ assigns fields
        if self.amount < 0:           # validation hook
            raise ValueError("amount must be non-negative")

m = Money(100)
print(m == Money(100))            # True
print(m < Money(150))             # True - order=True compares (amount, currency)
print({m})                        # frozen gives __hash__, so it fits in a set

# m.amount = 5  would raise FrozenInstanceError
m2 = replace(m, amount=200)       # copy-with-changes, the way to 'edit' a frozen obj
print(m2)                         # Money(amount=200, currency='USD')
print(asdict(m2))                 # {'amount': 200, 'currency': 'USD'} - ready to JSON`,
      },
      {
        label: 'Trace / Step-by-step: KW_ONLY (3.10) and slots=True memory',
        code: `from dataclasses import dataclass, KW_ONLY
import sys

@dataclass
class Config:
    host: str                     # positional-or-keyword
    _: KW_ONLY                    # everything BELOW becomes keyword-only
    port: int = 8080
    debug: bool = False

# Trace of allowed vs rejected construction:
#   Config("localhost")                 -> ok, port/debug defaulted
#   Config("localhost", port=9000)      -> ok, port passed by keyword
#   Config("localhost", 9000)           -> TypeError: port is keyword-only
c = Config("localhost", port=9000, debug=True)
print(c)                          # Config(host='localhost', port=9000, debug=True)

# slots=True removes per-instance __dict__, lowering memory and blocking typos
@dataclass(slots=True)
class Slim:
    a: int
    b: int

@dataclass
class Fat:
    a: int
    b: int

s, f = Slim(1, 2), Fat(1, 2)
print(hasattr(s, "__dict__"))     # False - slots used instead
print(hasattr(f, "__dict__"))     # True  - normal per-instance dict
# s.c = 3 would raise AttributeError, catching typos that Fat silently allows`,
      },
    ],
    gotcha: `Giving a dataclass field a mutable literal default like tags: list = [] raises ValueError at class definition time precisely because that one list would be shared by every instance; always use field(default_factory=list). A subtler trap with order=True is that comparisons use the field tuple in declaration order, so reordering fields silently changes how instances sort.`,
    tip: `Add slots=True to dataclasses you create in large quantities, because dropping the per-instance __dict__ can cut memory roughly in half and makes attribute typos raise instead of silently creating a junk attribute. Use dataclasses.replace(obj, field=value) rather than mutating, especially for frozen instances, since it is the only clean way to produce an edited copy.`,
    realWorldNote: `Pydantic v1 popularized annotation-driven models for FastAPI request bodies, and Python's own @dataclass is the lighter standard-library cousin used widely for config objects and DTOs without a third-party dependency. The attrs library predates dataclasses and inspired their design, and many codebases use dataclasses with slots=True for hot-path objects like graph nodes or parsed tokens where millions of instances exist. Tools like dataclasses.asdict feed directly into json.dumps in API responses and message-queue payloads across production services.`,
  },

  {
    id: 'async',
    title: 'Async / Await',
    track: 'advanced',
    estimatedMins: 25,
    summary: `If you have written a web scraper or an API client in plain Python, you have felt the pain: your program fires off a network request and then just sits there, frozen, doing nothing while it waits for bytes to come back over the wire. Async/await is Python's answer to that wasted waiting. Instead of spawning a thread per task (which costs memory and triggers the GIL dance), asyncio runs a single-threaded cooperative scheduler called the event loop that juggles thousands of tasks by switching between them whenever one is blocked on I/O. The mental shift from languages like Java is this: nothing runs in parallel here, but nothing sits idle either. When you mark a function async def, calling it does not run the body; it hands you back a coroutine object that does nothing until something awaits it or the loop drives it. The await keyword is the cooperative yield point where your coroutine says to the loop please go run something else while I wait, and the loop is free to do exactly that. Master where those suspension points are and you understand all of asyncio.`,
    keyPoints: [
      `Calling an async def function does not execute it. It returns a coroutine object, the way a generator function returns a generator. If you forget to await it you get the infamous RuntimeWarning: coroutine was never awaited and your code silently does nothing, which is why a missing await is the single most common asyncio bug.`,
      `The event loop is single-threaded and cooperative, not preemptive. A coroutine keeps the CPU until it hits an await on something that actually suspends. This means a CPU-heavy loop with no await calls will freeze every other task, because the loop never gets a chance to switch, which is why asyncio helps with I/O but not with number crunching.`,
      `asyncio.gather schedules all its awaitables to run concurrently and waits for every one of them, returning results in argument order. asyncio.create_task schedules a coroutine to start running in the background immediately and returns a Task handle you can await later, so the timing difference is when the work begins, not just when you collect it.`,
      `TaskGroup, added in Python 3.11, gives you structured concurrency: tasks created inside the async with block are guaranteed to be awaited before the block exits, and if any one raises, the rest are cancelled and the errors are bundled into an ExceptionGroup. This fixes gather's old foot-gun where a crashed sibling could leave orphan tasks leaking in the background.`,
      `asyncio.run is the one synchronous entry point that creates the loop, runs your top-level coroutine to completion, and tears the loop down cleanly. You call it once at the boundary of your program. Calling it twice, or calling it from inside an already-running loop, raises RuntimeError, which trips up people who try to nest asyncio.run inside a Jupyter cell.`,
    ],
    examples: [
      {
        label: 'Coroutine vs result, and the missing-await trap',
        code: `import asyncio

async def fetch(name):           # async def marks this a coroutine function
    await asyncio.sleep(1)        # await yields control to the loop for 1s
    return f"data from {name}"    # the value the awaiter finally receives

async def main():
    coro = fetch("api")          # this does NOT run fetch; coro is a coroutine object
    print(type(coro))           # <class 'coroutine'> -- not the string yet
    result = await coro         # NOW fetch actually runs and we get its return
    print(result)               # data from api

asyncio.run(main())              # the single sync entry point that drives the loop`,
      },
      {
        label: 'gather for concurrency vs sequential awaits',
        code: `import asyncio, time

async def task(n):
    await asyncio.sleep(1)            # each task waits 1 second
    return n * 10

async def sequential():
    start = time.perf_counter()
    a = await task(1)                # waits 1s here, fully, before moving on
    b = await task(2)                # then another full 1s -> 2s total
    return time.perf_counter() - start

async def concurrent():
    start = time.perf_counter()
    a, b = await asyncio.gather(task(1), task(2))  # both start together, overlap
    return time.perf_counter() - start             # ~1s total, not 2s

async def main():
    print(round(await sequential(), 1))   # ~2.0 -- awaits run one after another
    print(round(await concurrent(), 1))   # ~1.0 -- gather overlaps the waits

asyncio.run(main())`,
      },
      {
        label: 'Trace / Step-by-step: TaskGroup scheduling order',
        code: `import asyncio

async def worker(name, delay):
    print(f"{name} start")            # printed when the task first runs
    await asyncio.sleep(delay)         # suspends, loop switches to another task
    print(f"{name} done after {delay}s")
    return name

async def main():
    async with asyncio.TaskGroup() as tg:   # 3.11+ structured concurrency
        tg.create_task(worker("A", 2))      # scheduled, starts on next loop turn
        tg.create_task(worker("B", 1))      # scheduled too, both now pending
        print("both tasks created")          # runs BEFORE either worker prints
    # the 'async with' block does not exit until BOTH tasks finish
    print("group complete")

asyncio.run(main())

# Output trace, line by line:
# both tasks created      <- the create_task calls returned immediately
# A start                 <- loop begins running scheduled tasks
# B start
# B done after 1s         <- B's shorter sleep elapses first
# A done after 2s         <- A finishes later
# group complete          <- only now does the async with block exit`,
      },
    ],
    gotcha: `Putting a blocking call like time.sleep(5) or a synchronous requests.get inside a coroutine freezes the entire event loop, because those calls never yield control back, so every other task stalls for the full duration. The fix is to use the async equivalent (await asyncio.sleep(5), or an async HTTP client like aiohttp), or push the blocking call onto a thread with await asyncio.to_thread(requests.get, url).`,
    tip: `Reach for asyncio.TaskGroup instead of asyncio.gather on Python 3.11 and later, because TaskGroup automatically cancels sibling tasks and propagates errors as an ExceptionGroup when one task fails, whereas gather can silently leave the other tasks running in the background after one of them raises.`,
    realWorldNote: `FastAPI is built entirely on async/await: every async def route handler is a coroutine the event loop schedules, which is how a single FastAPI worker serves thousands of concurrent connections that are mostly waiting on a database or upstream API. Production deployments swap in uvloop, a drop-in Cython reimplementation of the event loop built on libuv (the same engine behind Node.js), which can roughly double throughput with one line: uvloop.install(). For file I/O, which the OS does not expose as truly non-blocking, libraries like aiofiles delegate reads and writes to a thread pool so your coroutines stay responsive.`,
  },

  {
    id: 'concurrency',
    title: 'Concurrency & Parallelism',
    track: 'advanced',
    estimatedMins: 22,
    summary: `Developers coming from Java or C++ are often shocked to learn that running ten Python threads on a ten-core machine will not give you ten times the CPU throughput. The reason is the Global Interpreter Lock, the GIL, a single mutex inside CPython that allows only one thread to execute Python bytecode at any instant. The GIL exists because CPython manages memory with reference counting, and incrementing or decrementing those counts from multiple threads at once without a lock would corrupt them and crash the interpreter. The crucial nuance, and the key to using Python concurrency well, is that the GIL is released during blocking I/O and inside many C extensions, so threads genuinely overlap when they are waiting on the network, the disk, or NumPy, just not when they are running pure Python loops. That gives you a clean rule of thumb: use threads for I/O-bound work where tasks spend their time waiting, and use separate processes for CPU-bound work where you need real parallel computation, since each process gets its own interpreter and its own GIL. The concurrent.futures module wraps both behind one tidy API so you can switch strategies by changing a single class name.`,
    keyPoints: [
      `The GIL is a mutex that serializes Python bytecode execution, and it is fundamentally about protecting CPython's reference-count-based memory management from data races. Without it, two threads decrementing the same object's refcount simultaneously could free memory that is still in use, so the GIL is the price CPython pays for a simple, fast single-threaded memory model.`,
      `The GIL is released during blocking I/O operations and inside C extensions that explicitly drop it, which is exactly why threads do speed up I/O-bound programs. A thread that calls a blocking socket read or a NumPy matrix multiply releases the GIL so another Python thread can run, meaning the waiting overlaps even though pure-Python execution never does.`,
      `Use threading (or a ThreadPoolExecutor) for I/O-bound workloads like fetching many URLs, and use multiprocessing (or a ProcessPoolExecutor) for CPU-bound workloads like image processing or numeric crunching. Picking threads for CPU work is the classic mistake: the GIL serializes the computation so you get concurrency overhead with zero speedup.`,
      `executor.map returns results in the same order as the inputs you submitted, which keeps your output aligned with your input list even though the tasks finished out of order. By contrast concurrent.futures.as_completed yields futures the instant each one finishes, so you process whichever result is ready first, which is what you want when latency to first result matters more than ordering.`,
      `Because spawned processes do not share memory, you need explicit channels to move data: a multiprocessing.Queue or Pipe for streaming, or arguments and return values through a Pool. multiprocessing.Pool.starmap is the variant that unpacks each tuple in your iterable as separate positional arguments, so [(1,2),(3,4)] calls f(1,2) then f(3,4) instead of passing the tuple whole.`,
    ],
    examples: [
      {
        label: 'Threads for I/O: overlapping network waits',
        code: `import concurrent.futures
import urllib.request

urls = ["https://example.com"] * 8   # 8 requests, each spends time waiting

def fetch(url):
    with urllib.request.urlopen(url) as r:  # blocking I/O -> GIL released here
        return len(r.read())                # so other threads run during the wait

# ThreadPoolExecutor is ideal because the work is waiting, not computing
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    sizes = list(pool.map(fetch, urls))     # map keeps results in input order

print(sizes)   # 8 byte counts, gathered ~8x faster than a serial loop`,
      },
      {
        label: 'Processes for CPU: real parallelism past the GIL',
        code: `import concurrent.futures

def count_primes(limit):
    count = 0
    for n in range(2, limit):              # pure-Python CPU work, GIL-bound
        if all(n % d for d in range(2, int(n ** 0.5) + 1)):
            count += 1
    return count

if __name__ == "__main__":                  # REQUIRED guard, see gotcha below
    workloads = [50_000, 50_000, 50_000, 50_000]
    # ProcessPoolExecutor sidesteps the GIL: each process has its own interpreter
    with concurrent.futures.ProcessPoolExecutor() as pool:
        results = list(pool.map(count_primes, workloads))  # true parallel CPU use
    print(results)`,
      },
      {
        label: 'Trace / Step-by-step: as_completed vs map ordering',
        code: `import concurrent.futures, time

def work(n):
    time.sleep(n)        # task with index 1 finishes first, 3 finishes last
    return n

with concurrent.futures.ThreadPoolExecutor() as pool:
    futures = [pool.submit(work, n) for n in (3, 1, 2)]  # submit in this order
    print("as_completed order:")
    for fut in concurrent.futures.as_completed(futures):  # yields by FINISH time
        print("  finished:", fut.result())

    print("map order:")
    for r in pool.map(work, (3, 1, 2)):   # yields by SUBMIT order, regardless
        print("  result:", r)

# Output trace, line by line:
# as_completed order:
#   finished: 1     <- 1s task done first
#   finished: 2     <- 2s task done second
#   finished: 3     <- 3s task done last
# map order:
#   result: 3       <- map preserves the (3, 1, 2) input order
#   result: 1       <- even though 3 actually finished last
#   result: 2`,
      },
    ],
    gotcha: `On macOS and Windows, multiprocessing uses the spawn start method, which re-imports your module in every child process; if your pool-creating code is not guarded by if __name__ == '__main__', each child re-runs that top-level code and recursively spawns more processes, producing a fork bomb or a RuntimeError. Always wrap the code that starts processes in the if __name__ == '__main__' guard.`,
    tip: `Decide between threads and processes by asking whether the task is waiting or computing: use ThreadPoolExecutor for I/O-bound work (network, disk, database calls) because the GIL is released during the wait, and use ProcessPoolExecutor for CPU-bound work because only separate processes escape the GIL and give real parallelism. The two have an identical API, so switching is a one-word change.`,
    realWorldNote: `Gunicorn, the standard WSGI server behind Django and Flask in production, runs multiple worker processes precisely to get around the GIL, since each process serves requests with its own interpreter and its own lock. Data libraries like NumPy, pandas, and scikit-learn release the GIL inside their C and Fortran kernels, which is why a ThreadPoolExecutor can actually parallelize heavy NumPy operations even though it would do nothing for a pure-Python loop. Note that Python 3.13 ships an experimental free-threaded build (PEP 703) that can disable the GIL entirely, a years-long effort that is gradually changing this whole calculus.`,
  },

  {
    id: 'type-hints',
    title: 'Type Hints',
    track: 'advanced',
    estimatedMins: 18,
    summary: `Python is dynamically typed, so for most of its life a function signature told you nothing about what it expected: def process(data) could take a list, a string, or a database connection, and you would only find out at runtime when it blew up. Type hints, introduced by PEP 484 in Python 3.5, let you annotate that intent directly in the code: def process(data: list[int]) -> int. The single most important thing to internalize, especially coming from Java or C++, is that the Python interpreter completely ignores these annotations at runtime. They are not enforced, not checked, and not cast; passing a string where you annotated an int runs perfectly fine until that string hits an operation it cannot do. The hints exist for two audiences: human readers, who get instant documentation, and static analysis tools like mypy and Pyright, which read your annotations and flag type mismatches before you ever run the program. If you want actual runtime enforcement, you reach for a separate library like pydantic, which validates incoming data against your types, or beartype, which checks at function-call boundaries. Beyond simple types, a rich vocabulary of generics, protocols, and literals lets you describe surprisingly precise contracts.`,
    keyPoints: [
      `Type hints are not enforced by the interpreter at runtime; they are pure annotations that static checkers read. A function annotated to return int can return a string and Python will not complain, which means hints catch bugs only if you actually run a tool like mypy or Pyright in your editor or CI pipeline.`,
      `TypeVar lets you write generic functions whose input and output types are linked, so a function declared with T = TypeVar('T') and signature (x: T) -> T tells the checker the return type matches the argument type exactly. Without it you would have to fall back to a loose object or Any, losing all the type information the caller cares about.`,
      `Protocol enables structural typing, which is duck typing the checker can verify: a class satisfies a Protocol just by having the right methods, with no explicit inheritance required. This lets you type accept anything with a .read() method without forcing every caller to inherit from a shared base class, which is far more Pythonic than nominal interfaces.`,
      `TypedDict describes the exact shape of a dictionary with known string keys and per-key value types, so a dict you treat like a record gets checked field by field. Literal narrows a value to specific allowed constants like Literal['get', 'post'], and Final marks a name as a constant the checker will flag if anyone reassigns it.`,
      `from __future__ import annotations turns every annotation into a lazily-evaluated string, which lets you reference a class inside its own methods or use names defined later in the file without quoting them, and it removes annotation evaluation cost at import time. It is the standard way to handle forward references in modern type-hinted code.`,
    ],
    examples: [
      {
        label: 'Hints are ignored at runtime',
        code: `def add(a: int, b: int) -> int:
    return a + b

# Python does NOT check the annotations -- this runs and returns '12'
print(add("1", "2"))     # string concatenation, no error at all

# mypy would flag the call above: error: Argument 1 has incompatible type 'str'
# but only if you actually run mypy; the interpreter happily executes it
print(add(1, 2))         # 3 -- the intended use`,
      },
      {
        label: 'TypeVar, Protocol, TypedDict, and Literal together',
        code: `from typing import TypeVar, Protocol, TypedDict, Literal

T = TypeVar("T")
def first(items: list[T]) -> T:   # return type is locked to the element type
    return items[0]               # checker knows first([1,2]) is an int

class Readable(Protocol):         # structural type: no inheritance needed
    def read(self) -> str: ...     # any object with read() -> str qualifies

def load(src: Readable) -> str:
    return src.read()             # accepts files, StringIO, custom classes alike

class User(TypedDict):            # a dict with a known, checked shape
    name: str
    age: int

def greet(u: User) -> str:
    return f"{u['name']} is {u['age']}"   # checker verifies the keys and types

Method = Literal["get", "post"]   # only these two exact strings are valid
def request(m: Method) -> None: ...   # request('delete') is a checker error`,
      },
      {
        label: 'Trace / Step-by-step: how mypy narrows a Literal value',
        code: `from typing import Literal

Mode = Literal["read", "write"]

def handle(mode: Mode) -> str:
    if mode == "read":
        # inside this branch the checker narrows mode to Literal['read']
        return "opening for input"
    else:
        # here mode is narrowed to Literal['write'], the only remaining option
        return "opening for output"

print(handle("read"))    # opening for input
print(handle("write"))   # opening for output

# Walking through what the static checker reasons about each line:
# 1. handle('append') -> error: 'append' is not assignable to Literal['read','write']
# 2. inside the if-branch, mode can ONLY be 'read', so a typo like mode == 'reed'
#    would be flagged as a comparison that is always False
# 3. after the if/else covers both Literal members, the function is exhaustive
# 4. at runtime none of this checking happens -- Python just runs the branches`,
      },
    ],
    gotcha: `People assume annotating def fn(x: int) makes Python reject a non-int argument, but it does not, so a bug like fn(None) passes silently until None hits an arithmetic operation deep in the call stack. The fix is to either run mypy or Pyright in CI to catch it statically, or use pydantic.BaseModel / a @validate_call decorator (or beartype) when you genuinely need the type checked at runtime.`,
    tip: `Add from __future__ import annotations at the top of every module instead of wrapping forward references in quotes, because it makes all annotations lazy strings so you can reference not-yet-defined classes and your own enclosing class without quoting, and it sidesteps import-time evaluation cost. Then turn on mypy --strict in CI so missing annotations and implicit Any are treated as errors rather than silently allowed.`,
    realWorldNote: `Pydantic, which powers request and response validation in FastAPI, is the canonical example of turning type hints into runtime enforcement: you declare a model with annotated fields and Pydantic parses, coerces, and validates incoming JSON against them, raising a detailed error if the data does not match. Large codebases at Dropbox (whose engineers created mypy) and Instagram run static type checkers across millions of lines to catch type errors before deployment. For typing decorators that must preserve a wrapped function's exact signature, PEP 612's ParamSpec lets the checker carry the original parameters through the wrapper instead of collapsing them to (*args, **kwargs).`,
  },

  {
    id: 'performance',
    title: 'Performance & Profiling',
    track: 'advanced',
    estimatedMins: 20,
    summary: `The first rule of Python performance is the one everyone learns the hard way: do not guess where your program is slow, measure it. Programmers fresh from compiled languages tend to micro-optimize the wrong loop while the real bottleneck is an unindexed database query or a hot function they never suspected. Python gives you a profiling toolkit for exactly this: cProfile shows you which functions consume the most cumulative time across a whole run, and timeit gives you precise timings of small snippets while controlling for one-off noise. Only once you know the actual hot path does optimization make sense, and Python offers a ladder of techniques from cheap to drastic: cache repeated calls with functools.lru_cache, replace Python-level loops over numbers with vectorized NumPy operations that run in C and can be tens of times faster, shrink per-instance memory with __slots__, and pull frequently-accessed names into local variables because local lookups are faster than global ones. When pure Python truly cannot keep up on a hot path, you escalate to Cython, which compiles annotated Python to C, or switch the whole runtime to PyPy, whose JIT compiler can dramatically speed up long-running pure-Python programs.`,
    keyPoints: [
      `Always profile before optimizing, using cProfile.run('expr') for a whole-program function-level breakdown or timeit.timeit for isolated snippet timing. Optimizing without measuring almost always wastes effort on code that was never the bottleneck, and timeit specifically runs the snippet many times and reports the best to filter out scheduler noise and warm-up effects.`,
      `functools.lru_cache memoizes a function's return value keyed by its arguments, turning repeated expensive calls into instant dictionary lookups, and its maxsize parameter caps how many results are retained before the least-recently-used ones are evicted. Setting maxsize=None makes the cache unbounded, which is fastest but can leak memory if the argument space is large.`,
      `NumPy vectorization replaces an explicit Python for-loop over numbers with a single array operation that executes in compiled C with no per-element interpreter overhead, commonly yielding speedups of tens of times on numeric work. The Python loop pays interpreter and object-boxing costs on every iteration, whereas the NumPy call processes the whole array in one tight C routine.`,
      `Defining __slots__ on a class tells Python to store instance attributes in a fixed array instead of a per-instance __dict__, which can cut memory use substantially when you create millions of small objects and also makes attribute access slightly faster. The tradeoff is you can no longer add arbitrary new attributes to instances at runtime.`,
      `Name lookup speed matters in tight loops: Python resolves local variable names through a fast array index but global and builtin names through dictionary lookups, so hoisting a global function or a repeated attribute access into a local variable before the loop measurably speeds up the hottest code. This is why you see patterns like _append = mylist.append before a million-iteration loop.`,
    ],
    examples: [
      {
        label: 'Profile first: find the real bottleneck',
        code: `import cProfile

def slow():
    total = 0
    for i in range(1_000_000):   # this loop dominates the runtime
        total += i * i
    return total

def helper():
    return sum(range(1000))      # cheap by comparison

def main():
    slow()
    helper()

# cProfile reports cumulative time per function so you SEE which is hot
cProfile.run("main()")
# The output table shows 'slow' eating nearly all the time, telling you
# exactly where to spend optimization effort -- not in helper()`,
      },
      {
        label: 'NumPy vectorization vs a Python loop',
        code: `import numpy as np, timeit

N = 1_000_000
data = list(range(N))
arr = np.arange(N)

def python_loop():
    return [x * x for x in data]     # interpreter runs N times, boxes each int

def numpy_vectorized():
    return arr * arr                 # one C-level op over the whole array

t_loop = timeit.timeit(python_loop, number=10)
t_np = timeit.timeit(numpy_vectorized, number=10)
print(f"python loop: {t_loop:.3f}s")
print(f"numpy:       {t_np:.3f}s")
print(f"speedup:     {t_loop / t_np:.0f}x")   # commonly ~40x on numeric work`,
      },
      {
        label: 'Trace / Step-by-step: __slots__ and local-variable hoisting',
        code: `import sys

class WithDict:
    def __init__(self, x, y):
        self.x = x          # stored in a per-instance __dict__
        self.y = y

class WithSlots:
    __slots__ = ("x", "y")   # fixed storage, no per-instance dict
    def __init__(self, x, y):
        self.x = x
        self.y = y

a = WithDict(1, 2)
b = WithSlots(1, 2)

# Step 1: compare memory footprint of one instance
print("with __dict__ :", sys.getsizeof(a) + sys.getsizeof(a.__dict__))  # larger
print("with __slots__:", sys.getsizeof(b))                              # smaller

# Step 2: __slots__ forbids new attributes at runtime
try:
    b.z = 3              # AttributeError: no slot named 'z'
except AttributeError as e:
    print("blocked:", e)

# Step 3: hoist a method into a local to skip repeated attribute lookup
results = []
append = results.append   # bind once; each call now skips the .append lookup
for i in range(5):
    append(i * i)         # faster in a hot loop than results.append(i*i) each time
print(results)           # [0, 1, 4, 9, 16]`,
      },
    ],
    gotcha: `Decorating a method or a function that takes unhashable arguments (like a list or dict) with functools.lru_cache raises TypeError: unhashable type, because the cache keys arguments in a dict and lists cannot be hashed; the fix is to convert the argument to a hashable form such as a tuple before the cached call, or restructure so the cached function only receives hashable inputs.`,
    tip: `Reach for NumPy vectorization instead of a Python for-loop whenever you are doing the same arithmetic across a large sequence of numbers, because the loop pays interpreter overhead on every element while the vectorized call runs once in C and is routinely tens of times faster. When you only need a quick win on a function called with repeating arguments, slap @functools.lru_cache(maxsize=1024) on it before reaching for anything heavier.`,
    realWorldNote: `Instagram famously profiled and optimized its Django backend with cProfile and the py-spy sampling profiler, which can attach to a running production process without modifying or slowing the code, making it the go-to tool for profiling live services. For memory specifically, the memory_profiler package gives you a line-by-line breakdown of which statements allocate the most. When a hot path genuinely outgrows pure Python, teams compile it with Cython (used heavily inside pandas and scikit-learn) for C-level speed, or run the entire workload on PyPy, whose tracing JIT can speed long-running pure-Python programs by an order of magnitude, at the cost of weaker support for some C-extension modules compared to CPython.`,
  },

];
