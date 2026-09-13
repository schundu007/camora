import type { Topic } from './types';

export const GETTING_STARTED_TOPICS: Topic[] = [
  {
    id: 'variables',
    title: 'Variables & Data Types',
    chapter: 'getting-started',
    track: 'beginner',
    estimatedMins: 35,
    summary: `How Python stores values without type declarations, and why mutable and immutable types behave so differently when you assign them.`,
    intro: `In Python you create a variable by writing name = value — no type declaration, no keyword like var or let. Python figures out the type from the value on the right. The same name can hold different types at different times.`,
    sections: [
      {
        heading: 'A variable is a name attached to an object',
        body: `A Python variable is not a box that holds a value. It is a name tag tied to an object that lives somewhere in memory. Assignment ties the name to the object and never copies it, which is why two names can end up pointing at the very same list. The built-in id() function returns the identity number of the object a name currently points at, and the is operator compares those identities. Reassigning a name only moves that one tag to a different object and leaves every other name alone.`,
        code: `x = 10
y = x
print(id(x) == id(y))   # Output: True   both names point at one object

x = 20                  # rebinds x only; y still points at 10
print(x, y)             # Output: 20 10`,
      },
      {
        heading: 'The built-in types you will be asked to name',
        body: `Python ships a fixed set of built-in types, and interviewers ask you to list them. Numbers come in three: int for whole numbers of any size, float for 64-bit binary floating point, and complex for a real part plus an imaginary one. Text is str. Truth values are bool, which is a subclass of int, so True + True is 2. Sequences are list, tuple and range. The mapping type is dict. Sets come as set and frozenset. Binary data is bytes, bytearray and memoryview. None is the single value of NoneType and means nothing here yet. One caveat worth saying out loud: a float is a binary approximation, so 0.1 + 0.2 does not land exactly on 0.3. When exactness matters, use Decimal from the standard library decimal module.`,
        code: `count   = 7                 # int       whole numbers, no size limit
ratio   = 0.5               # float     64-bit binary floating point
signal  = 2 + 3j            # complex   real + imaginary
label   = "on"              # str       text
active  = True              # bool      a subclass of int
items   = [1, 2]            # list      ordered, mutable
point   = (1, 2)            # tuple     ordered, immutable
lookup  = {"a": 1}          # dict      key to value
unique  = {1, 2}            # set       unique, mutable
frozen  = frozenset({1, 2}) # frozenset unique, immutable
raw     = b"\\x00\\x01"       # bytes     immutable binary
missing = None              # NoneType  the absence of a value

print(len(items), point[0], lookup["a"])  # Output: 2 1 1
print(active + active)                    # Output: 2   bool is an int
print(missing is None)                    # Output: True
print(0.1 + 0.2)                          # Output: 0.30000000000000004`,
      },
      {
        heading: 'Mutable versus immutable',
        body: `A mutable object can be changed in place after it is created. An immutable object cannot, so every apparent change actually builds a new object and rebinds the name. Mutable built-ins are list, dict, set and bytearray. Immutable ones are int, float, complex, bool, str, tuple, frozenset, bytes, range and None. The split matters in three places. Most immutable built-ins are hashable, so they work as dictionary keys and set members while a list, dict or set does not. Immutability is the usual reason for that rather than the rule itself: what Python actually requires of a key is a hash that stays the same for as long as the object is in use. That is why a tuple holding a list is immutable and still unhashable, and why a class you write is hashable by identity even while you mutate its attributes. A mutable object handed to a function can be changed by that function, and the caller sees the change. And s += "x" on a string quietly builds a new string, while nums += [1] on a list edits the one you already had.`,
        code: `s = "hello"
first_id = id(s)
s += " world"                  # builds a NEW string object
print(s)                       # Output: hello world
print(id(s) == first_id)       # Output: False  the name was rebound

nums = [1, 2]
first_id = id(nums)
nums += [3]                    # edits the SAME list in place
print(nums)                    # Output: [1, 2, 3]
print(id(nums) == first_id)    # Output: True   same object throughout`,
      },
      {
        heading: 'Naming rules, and the style everyone follows',
        body: `A name may contain letters, digits and underscores, and must not start with a digit. It cannot be one of Python's reserved keywords such as class, def, return, True or None, and the keyword module can check that for you. Names are case-sensitive, so name and Name are two different variables. Past the hard rules, PEP 8 (Python Enhancement Proposal 8, the official style guide) asks for snake_case on variables and functions, SCREAMING_SNAKE_CASE on constants, and a leading underscore on anything meant to stay internal. Shadowing a built-in by writing list = [1] or id = 5 is legal and is a real source of confusing bugs, so do not do it.`,
        code: `import keyword

print(keyword.iskeyword("class"))   # Output: True   reserved, cannot be a name
print(keyword.iskeyword("klass"))   # Output: False  free to use

name = "Ada"
Name = "Grace"                      # a different variable: names are case-sensitive
print(name, Name)                   # Output: Ada Grace`,
      },
      {
        heading: 'Multiple assignment and unpacking',
        body: `Python can bind several names in one statement. Writing a, b, c = 1, 2, 3 packs the right-hand side into a tuple and then unpacks it, pairing names with values left to right. Because the whole right side is evaluated before anything is assigned, a, b = b, a swaps two variables with no temporary. A starred name soaks up the leftovers, so first, *rest = [1, 2, 3, 4] gives 1 and a list of the remainder. The counts have to match or Python raises ValueError. Chained assignment is a different thing entirely: x = y = [] binds both names to one list, which is a trap the moment that list is mutable.`,
        code: `a, b, c = 1, 2, 3
print(a, b, c)          # Output: 1 2 3

a, b = b, a             # swap with no temp variable
print(a, b)             # Output: 2 1

first, *rest = [1, 2, 3, 4]
print(first, rest)      # Output: 1 [2, 3, 4]

x = y = []              # BOTH names get the SAME empty list
x.append(1)
print(y)                # Output: [1]`,
      },
      {
        heading: 'Dynamic typing, and what type hints do not do',
        body: `Python is dynamically typed: the type belongs to the object, not to the name, so one name can hold an int now and a str later. It is also strongly typed, which means it will not silently add the text "3" to the number 3 for you; that raises TypeError. Type hints such as def area(w: float, h: float) -> float are documentation for people and for checkers like mypy. The interpreter does not enforce them at runtime, so a hinted function will happily run with the wrong type and give you a surprising answer.`,
        code: `value = 42
print(type(value))      # Output: <class 'int'>
value = "forty two"     # same name, different type — this is legal
print(type(value))      # Output: <class 'str'>

def area(w: float, h: float) -> float:
    return w * h

print(area("ab", 3))    # Output: ababab   hints are not checked at runtime`,
      },
    ],
    keyTerms: [
      { term: 'Object',         meaning: 'The actual value in memory. It carries both the data and the type. Names point at objects; objects do not belong to names.' },
      { term: 'Name',           meaning: 'The label bound to an object by assignment. What most languages call a variable. Binding a name never copies the object.' },
      { term: 'Dynamic typing', meaning: 'The type travels with the object, not the name, so the same name can hold an int now and a str later.' },
      { term: 'Strong typing',  meaning: 'Python refuses to guess across types. "3" + 3 raises TypeError instead of quietly converting one side.' },
      { term: 'Mutable',        meaning: 'Can be changed in place after creation. list, dict, set and bytearray are mutable.' },
      { term: 'Immutable',      meaning: 'Cannot be changed after creation. int, float, str, tuple, frozenset, bytes and None are immutable.' },
      { term: 'Aliasing',       meaning: 'Two names pointing at one mutable object, so a change made through one name is visible through the other.' },
      { term: 'Rebinding',      meaning: 'Pointing a name at a different object. It affects only that name, never the object it used to point at.' },
      { term: 'Hashable',       meaning: 'Has a hash that stays the same for as long as the object lives, so it can be a dictionary key or a set member. Immutable built-ins such as int, str, bytes and frozenset qualify. A tuple qualifies only if every item in it does. A class you write is hashable by identity whether or not it is mutable, unless it defines __eq__ without __hash__.' },
      { term: 'NoneType',       meaning: 'The type of None, the single object meaning no value. Test for it with x is None, not x == None.' },
    ],
    cleanCode: `name = "Alice"              # a name bound to a str object
age  = 30                   # no type keyword, no declaration

print(name, age)            # Output: Alice 30
print(type(age))            # Output: <class 'int'>
print(isinstance(age, int)) # Output: True

age = "thirty"              # the SAME name, now a str — this is legal
print(type(age))            # Output: <class 'str'>

a, b = 1, 2                 # multiple assignment
a, b = b, a                 # swap: the right side is evaluated first
print(a, b)                 # Output: 2 1

scores = [90, 85]
alias  = scores             # a second NAME for one list, not a copy
alias.append(78)
print(scores)               # Output: [90, 85, 78]  changed through alias
print(scores is alias)      # Output: True

total = 0
total += 1                  # int is immutable, so this rebinds total
print(total)                # Output: 1`,
    walkthrough: [
      {
        code: `name = "Alice"`,
        explain: `Assignment does two things: it makes sure the object on the right exists, then it ties the name on the left to that object. Nothing is copied and nothing is declared. Quotes, single or double, are what make the value a str rather than a name Python would go looking for.`,
      },
      {
        code: `age = 30`,
        explain: `No type keyword, because the type belongs to the object and not to the name. Python never asks you to say int here, and it never stores int against the name age. 30 has a size limit of whatever memory allows, so factorials and cryptographic keys need no special type.`,
      },
      {
        code: `type(age)`,
        explain: `Reports the exact class of the object the name currently points at, which is how you check what you actually have rather than what you assumed. It prints as <class 'int'> because type() hands back the class object itself, not its name as text.`,
      },
      {
        code: `isinstance(age, int)`,
        explain: `The one you want for checks, because it accepts subclasses. isinstance(True, int) is True since bool subclasses int, while type(True) is int is False. It also takes a tuple, so isinstance(x, (int, float)) covers both numeric cases in one call.`,
      },
      {
        code: `age = "thirty"`,
        explain: `Rebinding. The name now points at a str and the integer 30 is left alone, to be reclaimed once nothing refers to it. This is dynamic typing, and it is why a type hint is documentation rather than a guarantee. It is also why reusing one name for two meanings makes code hard to follow.`,
      },
      {
        code: `a, b = 1, 2`,
        explain: `The right-hand side packs into a tuple, then unpacks across the names left to right. The counts must match or Python raises ValueError, unless a starred name such as first, *rest soaks up the remainder as a list.`,
      },
      {
        code: `a, b = b, a`,
        explain: `The entire right side is evaluated before any name is rebound, so both old values are captured before either is overwritten. That is why the swap needs no temporary variable and why it is not two statements in disguise.`,
      },
      {
        code: `alias = scores`,
        explain: `This is the line that surprises people. It binds a second name to the very same list; it does not copy anything. The is operator confirms it: scores is alias is True because there is only one list object. Use scores.copy() or scores[:] when you want an independent one, and copy.deepcopy(scores) when the list holds other mutable objects.`,
      },
      {
        code: `alias.append(78)`,
        explain: `A list is mutable, so append edits the one object both names point at, and the change is visible through either. A function you pass the list to can do the same thing, which is how a caller ends up with modified data it never assigned.`,
      },
      {
        code: `total += 1`,
        explain: `On an int this is not an edit. Integers are immutable, so Python computes a new object and rebinds total to it. The same += on a list edits in place instead, which is why id() changes after += on a number or a string but stays put after += on a list.`,
      },
    ],
    examples: [
      {
        label: 'Multiple assignment',
        code: `x = y = z = 0        # all three names start at 0
a, b, c = 1, 2, 3   # unpack three values at once
print(a, b, c)       # Output: 1 2 3

a, b = b, a          # swap in one line — no temp variable needed
print(a, b)          # Output: 2 1`,
      },
      {
        label: 'Mutable vs immutable',
        code: `# Strings cannot be changed in place (immutable)
s = "hello"
# s[0] = "H"  -> TypeError

# Lists CAN be changed (mutable)
items = [1, 2, 3]
items[0] = 99
print(items)          # Output: [99, 2, 3]

# Assigning one list to another does NOT copy it
a = [1, 2, 3]
b = a                 # b and a point at the SAME list
b.append(4)
print(a)              # Output: [1, 2, 3, 4]  <- a changed too!
copy = a.copy()       # this makes an independent copy`,
      },
      {
        label: 'Every built-in type',
        code: `print(type(42))              # Output: <class 'int'>
print(type(3.14))            # Output: <class 'float'>
print(type(2 + 3j))          # Output: <class 'complex'>
print(type("hi"))            # Output: <class 'str'>
print(type(True))            # Output: <class 'bool'>
print(type([1, 2]))          # Output: <class 'list'>
print(type((1, 2)))          # Output: <class 'tuple'>
print(type(range(3)))        # Output: <class 'range'>
print(type({"a": 1}))        # Output: <class 'dict'>
print(type({1, 2}))          # Output: <class 'set'>
print(type(frozenset([1])))  # Output: <class 'frozenset'>
print(type(b"bytes"))        # Output: <class 'bytes'>
print(type(bytearray(3)))    # Output: <class 'bytearray'>
print(type(memoryview(b"ab")))  # Output: <class 'memoryview'>
print(type(None))            # Output: <class 'NoneType'>`,
      },
      {
        label: 'Names and identity',
        code: `a = [1, 2, 3]
b = a                  # b is a second name for the SAME list
print(a is b)          # Output: True
print(id(a) == id(b))  # Output: True

b.append(4)            # mutating through b is visible through a
print(a)               # Output: [1, 2, 3, 4]

b = [9, 9]             # rebinding b points it at a NEW list
print(a)               # Output: [1, 2, 3, 4]   a is untouched
print(a is b)          # Output: False

n = 5
m = n
m += 1                 # ints are immutable, so m is rebound, not changed
print(n, m)            # Output: 5 6`,
      },
      {
        label: 'Naming rules',
        code: `user_age = 30              # snake_case — the style for variables
MAX_RETRIES = 3            # SCREAMING_SNAKE_CASE — reads as a constant
_cache = {}                # leading underscore — internal by convention
total2 = 0                 # digits are fine, just not in first position

# Each of these is a SyntaxError. The message Python actually prints:
# 2fast = 1     -> SyntaxError: invalid decimal literal
# class = "A"   -> SyntaxError: invalid syntax
# my-var = 1    -> SyntaxError: cannot assign to expression here. Maybe you meant '==' instead of '='?

# Shadowing a built-in is legal and painful:
list = [1, 2]              # the built-in list() is now unreachable here
print(list)                # Output: [1, 2]
del list                   # remove the shadow to get the built-in back
print(list((1, 2)))        # Output: [1, 2]`,
      },
      {
        label: 'Converting between types',
        code: `raw = "42"
n = int(raw)
print(n + 1)               # Output: 43

print(int(3.99))           # Output: 3      truncates toward zero, never rounds
print(round(3.99))         # Output: 4      round() is the one that rounds
print(float("3.5"))        # Output: 3.5
print(str(3.5) + "!")      # Output: 3.5!

# bool() follows truthiness: empty means False
print(bool(""), bool("0"), bool([]), bool([0]))   # Output: False True False True

# input() always hands you a string, so guard the conversion
try:
    int("hello")
except ValueError as e:
    print("ValueError:", e)
    # Output: ValueError: invalid literal for int() with base 10: 'hello'`,
      },
    ],
    cheatSheet: [
      {
        title: 'Inspecting and converting values',
        rows: [
          { call: 'type(x)',          does: 'Reports the exact class of x. Use it to see what you actually have.',                              returns: 'type' },
          { call: 'isinstance(x, C)', does: 'Checks whether x is a C or any subclass of C. Preferred over type() for checks.',                  returns: 'bool' },
          { call: 'id(x)',            does: 'Gives the identity number of the object x points at. Two aliases share one id.',                   returns: 'int' },
          { call: 'int(x)',           does: 'Converts text or a float to a whole number. Truncates floats, raises ValueError on bad text.',     returns: 'int' },
          { call: 'float(x)',         does: 'Converts text or an int to a decimal number.',                                                     returns: 'float' },
          { call: 'str(x)',           does: 'Builds the readable text form of any object.',                                                     returns: 'str' },
          { call: 'bool(x)',          does: 'Reports truthiness. Zero, empty text, empty containers and None are False; everything else True.', returns: 'bool' },
          { call: 'list.copy()',      does: 'Makes a shallow copy so the copy can be changed without touching the original.',                   returns: 'list' },
          { call: 'copy.deepcopy(x)', does: 'Copies an object and everything nested inside it, so no inner object stays shared.',               returns: 'same type as x' },
          { call: 'del name',         does: 'Removes the name. The object is freed only once no name points at it any more.',                   returns: 'nothing, it is a statement' },
        ],
      },
      {
        title: 'Mutable or immutable',
        columns: ['Type', 'Changes in place', 'Usable as a dict key'],
        rows: [
          { call: 'int, float, complex', does: 'No. Arithmetic builds a new object and rebinds the name.',                       returns: 'yes' },
          { call: 'bool',                does: 'No. It is a subclass of int, so True behaves as 1.',                             returns: 'yes' },
          { call: 'str',                 does: 'No. s += "x" builds a new string; s[0] = "H" raises TypeError.',                 returns: 'yes' },
          { call: 'bytes',               does: 'No. Immutable binary data.',                                                     returns: 'yes' },
          { call: 'tuple',               does: 'No, but a mutable object inside one can still change.',                          returns: 'only if every item is hashable' },
          { call: 'frozenset',           does: 'No. The immutable counterpart of set.',                                          returns: 'yes' },
          { call: 'range',               does: 'No. It recomputes values rather than storing them.',                             returns: 'yes' },
          { call: 'NoneType',            does: 'No. None is a single shared object.',                                            returns: 'yes' },
          { call: 'list',                does: 'Yes. append, insert, sort and item assignment all edit the same object.',        returns: 'no' },
          { call: 'dict',                does: 'Yes. Keys can be added, replaced and deleted in place.',                         returns: 'no' },
          { call: 'set',                 does: 'Yes. add and discard edit the same object.',                                     returns: 'no' },
          { call: 'bytearray',           does: 'Yes. The mutable counterpart of bytes.',                                         returns: 'no' },
        ],
      },
      {
        title: 'Truthiness of the values you meet most',
        columns: ['Value', 'bool(value)', 'Why'],
        rows: [
          { call: '0, 0.0, 0j',     does: 'False', returns: 'every numeric zero is falsy' },
          { call: '1, -1, 0.1',     does: 'True',  returns: 'any non-zero number is truthy' },
          { call: '""',             does: 'False', returns: 'an empty string has length 0' },
          { call: '"0", "False"',   does: 'True',  returns: 'a non-empty string is truthy whatever it spells' },
          { call: '[], (), {}, set()', does: 'False', returns: 'every empty container has length 0' },
          { call: '[0], (0,), {0: 0}', does: 'True', returns: 'a container with one item is truthy even if that item is falsy' },
          { call: 'None',           does: 'False', returns: 'the absence of a value' },
          { call: 'object()',       does: 'True',  returns: 'a plain object defines neither __bool__ nor __len__, so it defaults to True' },
        ],
      },
    ],
    interviewQs: [
      {
        q: 'What are the built-in data types in Python?',
        a: `Python groups them into a few families. Numbers are int, float and complex. Text is str. The boolean type is bool, which is a subclass of int. Sequences are list, tuple and range. The mapping type is dict. Sets are set and frozenset. Binary types are bytes, bytearray and memoryview. And NoneType, whose only value is None. Day to day you touch int, float, str, bool, list, tuple, dict, set and None; the rest show up when you handle binary data or need an immutable set.`,
      },
      {
        q: 'What is the difference between a mutable and an immutable data type?',
        a: `A mutable object can be changed in place; an immutable one cannot, so every change builds a new object and rebinds the name. list, dict, set and bytearray are mutable. int, float, complex, bool, str, tuple, frozenset, bytes and None are immutable. It matters for three reasons. The immutable built-ins are hashable, so they work as dictionary keys and set members while a list or a set does not — though I would not say only immutable objects are hashable, because a class I write is hashable by identity even when it is mutable, and a tuple holding a list is immutable and still unhashable. A mutable object passed into a function can be modified by that function and the caller sees it. And two names bound to one mutable object are aliases, so a change through one name shows up through the other.`,
      },
      {
        q: 'What actually happens when you write x = 5? Is that a declaration?',
        a: `There is no declaration. Python creates (or reuses) the integer object 5 and binds the name x to it in the current namespace. The name itself carries no type. Writing x = "five" on the next line converts nothing; it just points x at a different object and leaves the 5 alone.`,
      },
      {
        q: 'Why did changing one list also change a different variable?',
        a: `Because b = a bound a second name to the same list rather than copying it. b.append(4) mutates the one shared object, so a shows the change too. Use b = a.copy() or b = a[:] for an independent copy, and copy.deepcopy(a) when the list holds other mutable objects, because a shallow copy still shares those.`,
      },
      {
        q: 'When would you use isinstance() instead of type()?',
        a: `Almost always, for checks. isinstance respects inheritance, so isinstance(True, int) is True and a subclass of your class still passes. type(x) is C is an exact-match test that rejects subclasses, which you want only when the exact class genuinely matters. isinstance also accepts a tuple, so isinstance(x, (int, float)) covers both in one call.`,
      },
      {
        q: 'Strings are immutable, so why does s += "!" appear to work?',
        a: `It does not change the original string. Python builds a brand new string from the two pieces and rebinds s to it; the old object is left untouched and collected later. You can see it with id(), which changes after += on a string but stays the same after += on a list. That is also why building a long string in a loop with += is slow, and "".join(parts) is the right tool.`,
      },
      {
        q: 'What are the rules for naming a variable, and what does PEP 8 add?',
        a: `The hard rules: letters, digits and underscores only, never starting with a digit, and never a reserved keyword. Names are case-sensitive. PEP 8 (Python Enhancement Proposal 8) then asks for snake_case variables and functions, SCREAMING_SNAKE_CASE constants, a leading underscore for internal names, and descriptive words over single letters. It also warns against shadowing built-ins such as list, id or type, which Python allows but which breaks that built-in for the rest of the scope.`,
      },
    ],
    references: [
      { label: 'Programiz — Variables & Data Types', url: 'https://www.programiz.com/python-programming/variables-datatypes' },
      { label: 'Programiz — Python Introduction',    url: 'https://www.programiz.com/python-programming/introduction' },
      { label: 'Programiz — Python Input/Output',    url: 'https://www.programiz.com/python-programming/input-output-import' },
      { label: 'Programiz — Type Conversion',        url: 'https://www.programiz.com/python-programming/type-conversion-and-casting' },
      { label: 'Python docs — Built-in Types',       url: 'https://docs.python.org/3/library/stdtypes.html' },
      { label: 'PEP 8 — Naming Conventions',         url: 'https://peps.python.org/pep-0008/#naming-conventions' },
    ],
    edgeCases: [
      `True and False must be capitalized. true or false is read as a name Python has never heard of, so you get a NameError rather than a syntax complaint.`,
      `Variable names cannot start with a digit. 2fast = True is a SyntaxError; fast2 = True is fine. Underscores are allowed anywhere, including first.`,
      `Python is case-sensitive: name, Name and NAME are three different variables, and mixing them is a silent bug rather than an error.`,
      `bool is a subclass of int. True == 1 and False == 0, so True + True evaluates to 2 and sum([True, False, True]) counts the True values as 2.`,
      `x = y = [] binds BOTH names to one empty list, not to two. Appending through x shows up through y. Chained assignment is safe only for immutable values.`,
      `Use is only for None, True, False and your own sentinel objects. It compares identity, and Python reuses some small int and short str objects behind the scenes, so an accidental is between two equal numbers can come out True on one expression and False on another. Compare values with ==.`,
      `float is binary, so 0.1 + 0.2 does not land exactly on 0.3 and == between computed floats is unreliable. Use math.isclose for comparison, or Decimal from the decimal module when the exact figures matter, as they do for money.`,
      `Shadowing a built-in is legal. Writing list = [1, 2] or id = 5 makes that built-in unreachable for the rest of the scope, and the failure shows up later as a confusing TypeError. del the name to get the built-in back.`,
      `del name removes the name, not the object. The object survives for as long as any other name still points at it, and is only then reclaimed.`,
    ],
    gotcha: `b = a on a mutable object does not copy it — both names point at one object, so b.append(4) is visible through a. Use b = a.copy() or b = a[:] for an independent copy, and copy.deepcopy(a) when the list holds other mutable objects, because a shallow copy still shares those inner ones. The same rule bites through function calls: a list you pass in can be changed by the function and the caller sees it, which is also why a mutable default argument like def f(items=[]) keeps its changes between calls. Immutable values never have this problem, because every apparent change builds a new object instead.`,
    tip: `Name things for what they hold, not for their type: user_age beats x and beats age_int. PEP 8 (Python Enhancement Proposal 8) asks for snake_case on variables and functions, SCREAMING_SNAKE_CASE on constants, and a leading underscore on anything internal. Three habits save most of the debugging here: test for nothing with x is None rather than x == None, check types with isinstance rather than type(x) ==, and never reuse the name of a built-in such as list, dict, id, type or sum.`,
  },

  {
    id: 'operators',
    title: 'Operators',
    chapter: 'getting-started',
    track: 'beginner',
    estimatedMins: 10,
    summary: `The arithmetic, comparison, and logical operators Python provides, including the floor-division and modulo quirks that interviewers use to test attention to detail.`,
    intro: `Operators are the symbols Python uses to do math, compare values, and combine conditions. Most work exactly like a calculator, but a few have Python-specific rules worth knowing before they bite you.`,
    cleanCode: `x = 17
y = 5

print(x + y)   # Output: 22    addition
print(x - y)   # Output: 12    subtraction
print(x * y)   # Output: 85    multiplication
print(x / y)   # Output: 3.4   always a float in Python 3
print(x // y)  # Output: 3     floor division — drops the decimal
print(x % y)   # Output: 2     modulo — the remainder
print(x ** 2)  # Output: 289   exponentiation (x to the power 2)`,
    walkthrough: [
      {
        code: `x / y`,
        explain: `Regular division always returns a float in Python 3, even when the result is a whole number. 4 / 2 gives 2.0, not 2.`,
      },
      {
        code: `x // y`,
        explain: `Floor division drops the decimal and returns an integer. 17 // 5 is 3 because 5 goes into 17 three whole times (5*3 = 15, remainder 2).`,
      },
      {
        code: `x % y`,
        explain: `Modulo gives the remainder. 17 % 5 is 2 because 17 = 5*3 + 2. Classic use: n % 2 == 0 checks if n is even.`,
      },
      {
        code: `x ** 2`,
        explain: `Double star means to the power of. 2 ** 10 is 1024.`,
      },
    ],
    examples: [
      {
        label: 'Comparison & logic',
        code: `a, b = 10, 3
print(a == b)   # Output: False  (equal to)
print(a != b)   # Output: True   (not equal)
print(a > b)    # Output: True
print(a >= 10)  # Output: True

# and / or short-circuit left to right
x = None
print(x is None or len(x) == 0)  # Output: True
# len(x) == 0 is never evaluated because "x is None" was already True

print(not True)   # Output: False`,
      },
      {
        label: 'Walrus operator',
        code: `# Walrus := assigns AND returns the value in one expression (Python 3.8+)
data = [1, 2, 3, 4, 5]
if (n := len(data)) > 3:
    print(f"Long list: {n} items")  # Output: Long list: 5 items

# Useful in while loops to read and test in one line
import io
buf = io.StringIO("hello\nworld\n")
while line := buf.readline():
    print(line.strip())
# Output: hello
#         world`,
      },
    ],
    references: [
      { label: 'Programiz — Python Operators', url: 'https://www.programiz.com/python-programming/operators' },
    ],
    edgeCases: [
      `-7 // 2 is -4, not -3. Floor division rounds toward negative infinity, not toward zero.`,
      `2 ** 3 ** 2 equals 512, not 64. ** is right-associative: it evaluates as 2 ** (3**2) = 2**9.`,
      `and and or return one of their operands, not True/False. 'hello' or 'fallback' returns 'hello'.`,
    ],
    gotcha: `x / y always returns a float. If you need an integer for indexing or range(), use x // y or int(x / y).`,
    tip: `Use parentheses liberally in complex expressions. (a + b) * c is never ambiguous and is always easier to read.`,
  },

  {
    id: 'control-flow',
    title: 'Control Flow — if / elif / else',
    chapter: 'getting-started',
    track: 'beginner',
    estimatedMins: 12,
    summary: `How if, elif, and else branch execution in Python, and why understanding truthy and falsy values matters for writing correct conditions.`,
    intro: `Control flow is how you make Python make decisions. The if statement runs a block of code only when a condition is True. Python checks each branch in order and runs the FIRST one that matches — all others are skipped.`,
    cleanCode: `score = 75

if score >= 90:
    print("Grade: A")
elif score >= 80:
    print("Grade: B")
elif score >= 70:
    print("Grade: C")
else:
    print("Grade: F")

# Output: Grade: C`,
    walkthrough: [
      {
        code: `if score >= 90:`,
        explain: `Python checks this first. score is 75, so 75 >= 90 is False. Skip this entire block.`,
      },
      {
        code: `elif score >= 80:`,
        explain: `elif means 'else if'. Checked only if the previous condition was False. 75 >= 80 is False. Skip.`,
      },
      {
        code: `elif score >= 70:`,
        explain: `75 >= 70 is True. Run this block. Print 'Grade: C'. Python then skips the else entirely.`,
      },
      {
        code: `else:`,
        explain: `The fallback: runs only if every condition above was False. Here it is never reached.`,
      },
      {
        code: `indentation (4 spaces)`,
        explain: `Indentation tells Python which lines belong to which if block. Mixing tabs and spaces, or wrong amounts, causes IndentationError.`,
      },
    ],
    examples: [
      {
        label: 'Nested & one-liner',
        code: `age = 20
has_id = True

if age >= 18:
    if has_id:
        print("Welcome")    # Output: Welcome
    else:
        print("Need ID")
else:
    print("Too young")

# One-liner (ternary expression): value_if_true if condition else value_if_false
status = "adult" if age >= 18 else "minor"
print(status)  # Output: adult`,
      },
      {
        label: 'Truthy & falsy values',
        code: `# In Python, non-empty = truthy, empty/zero = falsy
# Falsy: 0, 0.0, "", [], {}, set(), None, False
# Truthy: anything else

name = ""
if not name:
    print("Name is empty")    # Output: Name is empty

items = [1, 2, 3]
if items:
    print("List has items")   # Output: List has items

# Chained comparisons — read like math
x = 5
print(1 < x < 10)     # Output: True`,
      },
    ],
    references: [
      { label: 'Programiz — Python if...elif...else', url: 'https://www.programiz.com/python-programming/if-elif-else' },
    ],
    edgeCases: [
      `Once one branch runs, Python skips ALL remaining elif/else. It is not like separate if statements checked independently.`,
      `A standalone if with no elif or else is perfectly valid — the else is optional.`,
      `Using = (assignment) instead of == (comparison) inside if is a SyntaxError: if x = 5: fails. Write if x == 5:.`,
    ],
    gotcha: `Using is to compare values (if x is 5:) checks object identity, not equality. It works for None, True, and False, but not for general numbers or strings. Use == for values.`,
    tip: `Keep nesting shallow. If you are 4 levels deep, extract the inner logic into its own function with a descriptive name.`,
  },

  {
    id: 'loops',
    title: 'Loops — for and while',
    chapter: 'getting-started',
    track: 'beginner',
    estimatedMins: 20,
    summary: `The for and while loops Python uses to repeat work, and the iteration helpers like enumerate, zip, break, and continue that interviewers expect you to know.`,
    intro: `Loops repeat a block of code without copy-pasting. Python has two kinds: for loops run once per item in a sequence, and while loops keep running as long as a condition is True.`,
    cleanCode: `# for loop — iterate over each item in a list
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)
# Output: apple  banana  cherry

# range() — loop a fixed number of times
for i in range(3):
    print(i)
# Output: 0  1  2   (range starts at 0, stops BEFORE 3)

# while loop — run until condition becomes False
count = 0
while count < 3:
    print(count)
    count += 1
# Output: 0  1  2`,
    walkthrough: [
      {
        code: `for fruit in fruits:`,
        explain: `Each iteration, fruit is set to the next item in the list. First pass: fruit = 'apple'. Second: fruit = 'banana'. Third: fruit = 'cherry'. Then the loop ends automatically.`,
      },
      {
        code: `range(3)`,
        explain: `Produces the sequence 0, 1, 2. It stops BEFORE the number you give. range(1, 4) gives 1, 2, 3. range(0, 10, 2) gives 0, 2, 4, 6, 8 with a step of 2.`,
      },
      {
        code: `while count < 3:`,
        explain: `Python checks count < 3 before every iteration. When count reaches 3, the condition is False and the loop stops.`,
      },
      {
        code: `count += 1`,
        explain: `Shorthand for count = count + 1. Without this, count never changes and you have an infinite loop. Press Ctrl+C to stop one.`,
      },
    ],
    examples: [
      {
        label: 'enumerate & zip',
        code: `# enumerate gives index AND value together
colors = ["red", "green", "blue"]
for i, color in enumerate(colors):
    print(i, color)
# Output:
# 0 red
# 1 green
# 2 blue

# zip pairs two lists element by element
names  = ["Alice", "Bob"]
scores = [95, 87]
for name, score in zip(names, scores):
    print(f"{name}: {score}")
# Output: Alice: 95   Bob: 87`,
      },
      {
        label: 'break, continue, else',
        code: `# break exits the loop immediately
for n in range(10):
    if n == 5:
        break
    print(n, end=" ")
# Output: 0 1 2 3 4

# continue skips to the next iteration
for n in range(6):
    if n % 2 == 0:
        continue
    print(n, end=" ")
# Output: 1 3 5

# for/else — else runs only if the loop ended WITHOUT a break
for n in range(5):
    if n == 10:
        break
else:
    print("10 not found in range")  # Output: 10 not found in range`,
      },
    ],
    references: [
      { label: 'Programiz — Python for Loop',       url: 'https://www.programiz.com/python-programming/for-loop' },
      { label: 'Programiz — Python while Loop',     url: 'https://www.programiz.com/python-programming/while-loop' },
      { label: 'Programiz — break and continue',    url: 'https://www.programiz.com/python-programming/break-continue' },
      { label: 'Programiz — pass Statement',        url: 'https://www.programiz.com/python-programming/pass-statement' },
    ],
    edgeCases: [
      `range(5, 0) produces nothing (empty). To count down: range(5, 0, -1) gives 5, 4, 3, 2, 1.`,
      `Modifying a list while iterating over it causes skipped or repeated items. Iterate over a copy: for item in my_list[:]:`,
      `A while loop with no way to make the condition False runs forever. Always include a path that changes the condition or a break.`,
    ],
    gotcha: `for i in range(len(my_list)) is a common beginner pattern that is usually the wrong choice. Use for item in my_list: directly, or for i, item in enumerate(my_list): when you need the index too.`,
    tip: `Use while only when you do not know the number of iterations in advance. If you know the count or are going through a sequence, use for. while True: with an explicit break inside is fine for 'keep running until a condition inside triggers'.`,
  },
];
