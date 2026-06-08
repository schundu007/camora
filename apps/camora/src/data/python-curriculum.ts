export interface WalkthroughStep {
  code: string;
  explain: string;
}

export interface Example {
  label: string;
  code: string;
}

export interface Topic {
  id: string;
  title: string;
  track: 'beginner' | 'advanced';
  estimatedMins: number;
  intro: string;
  cleanCode: string;
  walkthrough: WalkthroughStep[];
  examples: Example[];
  edgeCases: string[];
  gotcha: string;
  tip: string;
}

export const PYTHON_TOPICS: Topic[] = [
  // -- BEGINNER -----------------------------------------------------------------
  {
    id: 'variables',
    title: 'Variables & Data Types',
    track: 'beginner',
    estimatedMins: 15,
    intro: `In Python you create a variable by writing name = value — no type declaration, no keyword like var or let. Python figures out the type from the value on the right. The same name can hold different types at different times.`,
    cleanCode: `name = "Alice"        # text (string)
age  = 30             # whole number (int)
height = 5.9          # decimal (float)
is_student = False    # True or False (bool)

print(name)           # Output: Alice
print(type(age))      # Output: <class 'int'>
print(isinstance(age, int))  # Output: True`,
    walkthrough: [
      {
        code: `name = "Alice"`,
        explain: `Creates a variable called name and stores the text "Alice". Quotes (single or double) make something a string.`,
      },
      {
        code: `age = 30`,
        explain: `Stores the integer 30. No quotes needed for numbers.`,
      },
      {
        code: `height = 5.9`,
        explain: `Decimals are called floats (floating-point numbers) and work the same as integers.`,
      },
      {
        code: `is_student = False`,
        explain: `Booleans hold only two values: True or False. Capital F is required — false (lowercase) causes a NameError.`,
      },
      {
        code: `type(age)`,
        explain: `The built-in type() function tells you what kind of value a variable holds. Useful for debugging.`,
      },
      {
        code: `isinstance(age, int)`,
        explain: `Returns True if age is an int. Preferred over type() for checks because it handles inheritance — isinstance(True, int) correctly returns True since bool is a subclass of int.`,
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
    ],
    edgeCases: [
      `True and False must be capitalized. true or false causes a NameError.`,
      `Variable names cannot start with a digit. 2fast = True is a SyntaxError. fast2 = True is fine.`,
      `Python is case-sensitive: name and Name are two different variables.`,
      `bool is a subclass of int. True == 1 and False == 0, so True + True evaluates to 2.`,
    ],
    gotcha: `b = a on a mutable object (list, dict) does NOT copy it — both names point at one object. Changes through b are visible through a. Use b = a.copy() or b = a[:] for an independent copy.`,
    tip: `Use descriptive names: user_age is clearer than x. Python style (PEP 8) uses snake_case — words joined by underscores, all lowercase.`,
  },

  {
    id: 'operators',
    title: 'Operators',
    track: 'beginner',
    estimatedMins: 10,
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
    track: 'beginner',
    estimatedMins: 12,
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
    track: 'beginner',
    estimatedMins: 20,
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
    edgeCases: [
      `range(5, 0) produces nothing (empty). To count down: range(5, 0, -1) gives 5, 4, 3, 2, 1.`,
      `Modifying a list while iterating over it causes skipped or repeated items. Iterate over a copy: for item in my_list[:]:`,
      `A while loop with no way to make the condition False runs forever. Always include a path that changes the condition or a break.`,
    ],
    gotcha: `for i in range(len(my_list)) is a common beginner pattern that is usually the wrong choice. Use for item in my_list: directly, or for i, item in enumerate(my_list): when you need the index too.`,
    tip: `Use while only when you do not know the number of iterations in advance. If you know the count or are going through a sequence, use for. while True: with an explicit break inside is fine for 'keep running until a condition inside triggers'.`,
  },

  {
    id: 'functions',
    title: 'Functions',
    track: 'beginner',
    estimatedMins: 20,
    intro: `A function is a named, reusable block of code. You define it once with def and call it as many times as you need. Functions let you give a name to a task so the code stays readable and avoids repetition.`,
    cleanCode: `def greet(name):
    message = "Hello, " + name + "!"
    return message

result = greet("Alice")
print(result)           # Output: Hello, Alice!
print(greet("Bob"))     # Output: Hello, Bob!`,
    walkthrough: [
      {
        code: `def greet(name):`,
        explain: `def means 'define a function'. greet is the name you choose. name is a parameter — a placeholder for the actual value the caller will pass in.`,
      },
      {
        code: `message = "Hello, " + name + "!"`,
        explain: `This line runs when the function is called. name will be whatever was passed in — 'Alice' or 'Bob'.`,
      },
      {
        code: `return message`,
        explain: `Sends a value back to the caller. The function ends here. Without a return statement, Python returns None automatically.`,
      },
      {
        code: `result = greet("Alice")`,
        explain: `Calls the function with 'Alice' as the argument. Python runs the body, hits return, and stores 'Hello, Alice!' in result.`,
      },
    ],
    examples: [
      {
        label: 'Default & keyword args',
        code: `def power(base, exponent=2):  # exponent defaults to 2
    return base ** exponent

print(power(3))             # Output: 9    (3**2, uses default)
print(power(3, 3))          # Output: 27   (3**3)
print(power(exponent=4, base=2))  # Output: 16  (keyword args, any order)

# *args collects extra positional arguments into a tuple
# **kwargs collects extra keyword arguments into a dict
def show_all(*args, **kwargs):
    print("args:", args)
    print("kwargs:", kwargs)

show_all(1, 2, name="Alice", age=30)
# Output:
# args: (1, 2)
# kwargs: {'name': 'Alice', 'age': 30}`,
      },
      {
        label: 'Multiple returns & lambda',
        code: `# Return a tuple — Python unpacks it automatically
def min_max(numbers):
    return min(numbers), max(numbers)

lo, hi = min_max([3, 1, 4, 1, 5, 9, 2])
print(lo, hi)    # Output: 1 9

# Lambda: a one-expression anonymous function
square = lambda x: x ** 2
print(square(5))  # Output: 25

# Common use: sort by a custom key
words = ["banana", "apple", "cherry"]
words.sort(key=lambda w: len(w))
print(words)     # Output: ['apple', 'banana', 'cherry']`,
      },
    ],
    edgeCases: [
      `Parameters without defaults are required. Calling greet() with no argument raises TypeError: greet() missing 1 required positional argument: 'name'.`,
      `Default values are evaluated ONCE when def runs, not each call. def append_to(item, lst=[]) reuses the same list across all calls. Use lst=None and create a fresh list inside.`,
      `A function always returns exactly one value. To return multiple values, return a tuple: return a, b. The caller unpacks it: x, y = func().`,
    ],
    gotcha: `Using a mutable object like [] or {} as a default argument value is a classic trap. The same list persists across all calls. Default to None and create the object inside the function body.`,
    tip: `Write short functions that do one thing. If you need to scroll to read a function, it probably does too much. Extract the middle part into a helper with a descriptive name.`,
  },

  {
    id: 'lists',
    title: 'Lists',
    track: 'beginner',
    estimatedMins: 20,
    intro: `A list is an ordered, changeable collection of items. You can put anything in a list — numbers, strings, even other lists — and you can add, remove, and change items at any time after creating it.`,
    cleanCode: `colors = ["red", "green", "blue"]

print(colors[0])        # Output: red      (index 0 = first item)
print(colors[-1])       # Output: blue     (index -1 = last item)
print(len(colors))      # Output: 3

colors.append("yellow") # add to end
print(colors)           # Output: ['red', 'green', 'blue', 'yellow']

colors[1] = "purple"    # change item at index 1
print(colors)           # Output: ['red', 'purple', 'blue', 'yellow']

colors.pop()            # remove and return last item
print(colors)           # Output: ['red', 'purple', 'blue']`,
    walkthrough: [
      {
        code: `colors[0]`,
        explain: `Square brackets with a number access an item by its position (index). Python counts from 0, so index 0 is the first item, index 1 is the second.`,
      },
      {
        code: `colors[-1]`,
        explain: `Negative indexes count from the end. -1 is the last item, -2 is second to last. Works for any list regardless of its size.`,
      },
      {
        code: `len(colors)`,
        explain: `Returns how many items are in the list. For a 3-item list, valid indexes are 0, 1, 2 (and -3, -2, -1 from the back).`,
      },
      {
        code: `colors.append('yellow')`,
        explain: `Adds one item to the end of the list. The list grows by 1. To add several at once: colors.extend(['x', 'y']).`,
      },
      {
        code: `colors[1] = 'purple'`,
        explain: `Replaces the item at index 1. Lists are mutable — any item can be changed in place.`,
      },
      {
        code: `colors.pop()`,
        explain: `Removes and returns the last item. colors.pop(0) removes the first item. colors.remove('red') removes the first matching value by content.`,
      },
    ],
    examples: [
      {
        label: 'Slicing',
        code: `nums = [10, 20, 30, 40, 50]

print(nums[1:3])     # Output: [20, 30]        index 1 up to but not including 3
print(nums[:2])      # Output: [10, 20]        start to index 2 exclusive
print(nums[2:])      # Output: [30, 40, 50]    index 2 to the end
print(nums[::-1])    # Output: [50, 40, 30, 20, 10]  reversed

copy = nums[:]       # an independent copy of the whole list
copy.append(60)
print(nums)          # Output: [10, 20, 30, 40, 50]  unchanged`,
      },
      {
        label: 'Sorting & searching',
        code: `nums = [3, 1, 4, 1, 5, 9, 2, 6]

nums.sort()                   # sorts in place, returns None
print(nums)                   # Output: [1, 1, 2, 3, 4, 5, 6, 9]

nums.sort(reverse=True)
print(nums)                   # Output: [9, 6, 5, 4, 3, 2, 1, 1]

print(nums.count(1))          # Output: 2   how many times 1 appears
print(1 in nums)              # Output: True

# sorted() leaves the original unchanged and returns a new list
original = [3, 1, 2]
new_list = sorted(original)
print(original, new_list)     # Output: [3, 1, 2] [1, 2, 3]`,
      },
    ],
    edgeCases: [
      `Accessing colors[3] on a 3-item list raises IndexError: list index out of range. Valid indexes are 0, 1, 2.`,
      `colors[1:10] does NOT raise an error even if there is no index 10 — it returns everything up to the end.`,
      `list.sort() sorts in place and returns None. result = my_list.sort() leaves result as None, which is a common mistake.`,
    ],
    gotcha: `copy = my_list does NOT make a copy. Both names point at the same list object. Use copy = my_list[:] or copy = my_list.copy() for a real independent copy.`,
    tip: `Use list comprehensions to transform lists: squares = [x**2 for x in range(10)]. They are more concise and often faster than a for loop with .append().`,
  },

  {
    id: 'dicts-sets',
    title: 'Dictionaries & Sets',
    track: 'beginner',
    estimatedMins: 20,
    intro: `A dictionary maps keys to values — like a real dictionary maps words to definitions. A set is a collection of unique items with no duplicates. Both use hash tables internally, giving instant lookups regardless of how many items they contain.`,
    cleanCode: `# Dictionary
person = {"name": "Alice", "age": 30, "city": "NYC"}

print(person["name"])        # Output: Alice
print(person.get("phone"))   # Output: None  (no crash if key missing)
person["email"] = "a@b.com"  # add a new key
print(len(person))           # Output: 4

# Set
tags = {"python", "coding", "python"}  # duplicate removed automatically
print(tags)                  # Output: {'python', 'coding'}
print("coding" in tags)      # Output: True  (O(1) lookup)`,
    walkthrough: [
      {
        code: `{"name": "Alice", "age": 30}`,
        explain: `Curly braces create a dictionary. Each entry is key: value. Keys are usually strings but any immutable type (numbers, tuples) works.`,
      },
      {
        code: `person["name"]`,
        explain: `Square brackets with the key retrieves the value. If the key does not exist, Python raises KeyError.`,
      },
      {
        code: `person.get("phone")`,
        explain: `Safer lookup: returns None if the key is missing, instead of crashing. You can supply your own default: person.get('phone', 'unknown').`,
      },
      {
        code: `person["email"] = "a@b.com"`,
        explain: `If the key exists this updates it. If not, it is added as a new entry. Dictionaries grow dynamically.`,
      },
      {
        code: `{"python", "coding", "python"}`,
        explain: `Curly braces with no colons create a set. The duplicate 'python' is removed automatically. Sets are unordered — you cannot index them.`,
      },
      {
        code: `"coding" in tags`,
        explain: `Membership testing in a set is O(1) — instant regardless of size. The same check on a list is O(n) — it scans every item from the beginning.`,
      },
    ],
    examples: [
      {
        label: 'Iterating dicts',
        code: `scores = {"Alice": 95, "Bob": 87, "Carol": 92}

for name in scores:                    # iterates over keys only
    print(name)
# Output: Alice  Bob  Carol

for name, score in scores.items():     # key AND value together
    print(f"{name}: {score}")
# Output: Alice: 95  Bob: 87  Carol: 92

print(list(scores.keys()))    # Output: ['Alice', 'Bob', 'Carol']
print(list(scores.values()))  # Output: [95, 87, 92]`,
      },
      {
        label: 'Set operations',
        code: `a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

print(a | b)   # Output: {1, 2, 3, 4, 5, 6}  union — all items
print(a & b)   # Output: {3, 4}               intersection — shared items
print(a - b)   # Output: {1, 2}               difference — in a but not b

# Remove duplicates from a list using a set
names = ["Alice", "Bob", "Alice", "Carol", "Bob"]
unique = list(set(names))
print(sorted(unique))   # Output: ['Alice', 'Bob', 'Carol']`,
      },
    ],
    edgeCases: [
      `Dictionary keys must be immutable. You cannot use a list as a key — it raises TypeError. Use a tuple instead.`,
      `Empty curly braces {} create a dict, not a set. To create an empty set write set() (not {}).`,
      `Iterating over a dict while adding or removing keys raises RuntimeError. Iterate over a copy: for k in list(d.keys()):`,
    ],
    gotcha: `dict.keys(), dict.values(), and dict.items() return view objects, not lists. They update in real time when the dict changes. Wrap in list() if you need to index them or freeze the snapshot.`,
    tip: `Use dict.get(key, default) rather than checking 'key in dict' then indexing it. It is shorter and avoids looking up the key twice.`,
  },

  {
    id: 'strings',
    title: 'Strings',
    track: 'beginner',
    estimatedMins: 20,
    intro: `Strings are text. Every string in Python is immutable — you can never change a character in place, only create a new string. Python ships with dozens of built-in string methods for searching, splitting, replacing, and formatting.`,
    cleanCode: `msg = "Hello, World!"

print(len(msg))                       # Output: 13
print(msg.upper())                    # Output: HELLO, WORLD!
print(msg.replace("World", "Python")) # Output: Hello, Python!
print(msg.split(", "))                # Output: ['Hello', 'World!']
print(msg[0:5])                       # Output: Hello

# f-strings: insert values directly into text
name = "Alice"
age  = 30
print(f"Name: {name}, Age: {age}")    # Output: Name: Alice, Age: 30`,
    walkthrough: [
      {
        code: `msg.upper()`,
        explain: `Returns a NEW string with all letters uppercased. The original msg is unchanged — strings are immutable.`,
      },
      {
        code: `msg.replace("World", "Python")`,
        explain: `Finds every occurrence of 'World' and substitutes 'Python'. Returns a new string. Original unchanged.`,
      },
      {
        code: `msg.split(", ")`,
        explain: `Splits on the separator ', ' and returns a list of pieces. Great for parsing CSV lines or space-separated input.`,
      },
      {
        code: `msg[0:5]`,
        explain: `Slicing works like with lists. Index 0 is included, index 5 is excluded. msg[0:5] returns the first 5 characters.`,
      },
      {
        code: `f"Name: {name}, Age: {age}"`,
        explain: `An f-string. The f prefix before the opening quote enables interpolation. Variables (or any expression) inside {} are substituted automatically.`,
      },
    ],
    examples: [
      {
        label: 'Search & test',
        code: `text = "  Hello, World!  "

print(text.strip())           # Output: 'Hello, World!'   removes whitespace
print("world" in text.lower())       # Output: True
print(text.lower().startswith(" "))  # Output: True

pos = text.find("World")
print(pos)                    # Output: 9   position of first match
                              #            returns -1 if not found (no crash)

print("abc123".isalpha())     # Output: False (has digits)
print("abc".isalpha())        # Output: True
print("  ".strip() == "")     # Output: True  (blank after strip)`,
      },
      {
        label: 'Build & join',
        code: `# join: assemble a list into a string — faster than +=
words = ["Python", "is", "great"]
sentence = " ".join(words)
print(sentence)    # Output: Python is great

csv = ",".join(["Alice", "30", "NYC"])
print(csv)         # Output: Alice,30,NYC

# Multi-line string with triple quotes
poem = """Roses are red,
Violets are blue."""
print(poem)
# Output:
# Roses are red,
# Violets are blue.`,
      },
    ],
    edgeCases: [
      `msg[0] = "h" raises TypeError. Strings are immutable — you cannot change a character in place. Build a new string instead.`,
      `"5" + 5 raises TypeError. You cannot add a string and a number. Use str(5) or an f-string.`,
      `"hello".index("xyz") raises ValueError. Use .find() if you want -1 instead of a crash when the substring is not found.`,
    ],
    gotcha: `String concatenation inside a loop with += is slow for large strings because each + creates a new string object. Build a list of parts and use ''.join(parts) at the end.`,
    tip: `f-strings (Python 3.6+) are the most readable and fastest formatting method. Prefer them over % formatting and .format(). You can put any expression inside the braces: f'{2+2}' gives '4'.`,
  },

  {
    id: 'file-io',
    title: 'File I/O',
    track: 'beginner',
    estimatedMins: 15,
    intro: `Python can read and write files on your hard drive. The safest way is the with statement — it automatically closes the file when the block ends, even if an error occurs inside.`,
    cleanCode: `# Write a file
with open("notes.txt", "w") as f:
    f.write("Line 1\n")
    f.write("Line 2\n")

# Read the whole file at once
with open("notes.txt", "r") as f:
    content = f.read()
    print(content)
# Output:
# Line 1
# Line 2

# Read line by line (efficient for large files)
with open("notes.txt") as f:
    for line in f:
        print(line.strip())   # strip() removes the trailing newline`,
    walkthrough: [
      {
        code: `open("notes.txt", "w")`,
        explain: `Opens (or creates) notes.txt for writing. Mode 'w' OVERWRITES the file if it already exists. Use 'a' to append without deleting.`,
      },
      {
        code: `as f`,
        explain: `f is your file handle — the object you use to read or write. The with statement guarantees f.close() is called when the block ends.`,
      },
      {
        code: `f.write("Line 1\n")`,
        explain: `Writes text to the file. write() does not add a newline automatically — you must include \\n yourself.`,
      },
      {
        code: `open("notes.txt", "r")`,
        explain: `Opens for reading. 'r' is the default mode, so open('notes.txt') with no mode also works.`,
      },
      {
        code: `f.read()`,
        explain: `Reads the ENTIRE file into one string. Fine for small files. For large files, iterate line by line to avoid loading everything into memory at once.`,
      },
      {
        code: `line.strip()`,
        explain: `Each line from a file includes the newline character at the end. strip() removes leading and trailing whitespace including that newline.`,
      },
    ],
    examples: [
      {
        label: 'Read lines into a list',
        code: `with open("notes.txt") as f:
    lines = f.readlines()     # list of strings, each ending with \n

print(len(lines))             # Output: 2
print(repr(lines[0]))         # Output: 'Line 1\n'
print(lines[0].strip())       # Output: Line 1

# Strip all lines at once
clean = [line.strip() for line in lines]
print(clean)                  # Output: ['Line 1', 'Line 2']`,
      },
      {
        label: 'JSON files',
        code: `import json

# Write a dict as JSON
data = {"name": "Alice", "scores": [95, 87, 91]}
with open("data.json", "w") as f:
    json.dump(data, f, indent=2)

# Read it back
with open("data.json") as f:
    loaded = json.load(f)

print(loaded["name"])         # Output: Alice
print(loaded["scores"])       # Output: [95, 87, 91]
print(type(loaded))           # Output: <class 'dict'>`,
      },
    ],
    edgeCases: [
      `Opening a file in 'r' mode that does not exist raises FileNotFoundError. Check with os.path.exists('file.txt') first, or use a try/except.`,
      `'rb' and 'wb' modes read/write raw bytes. Required for images, PDFs, and any non-text file.`,
      `Forgetting to close a file (not using with) can leave it locked or lose buffered data not yet written to disk.`,
    ],
    gotcha: `open('file', 'w') silently DELETES all existing content if the file already exists. Use 'a' to append, or 'x' mode to fail with FileExistsError if the file is already there.`,
    tip: `Use pathlib.Path for cleaner file operations: Path('notes.txt').read_text() reads the whole file, Path('notes.txt').write_text('hello') writes it — no open/close needed.`,
  },

  {
    id: 'errors',
    title: 'Error Handling',
    track: 'beginner',
    estimatedMins: 15,
    intro: `When Python hits a problem it cannot handle, it raises an exception — a built-in signal that something went wrong. You can catch exceptions with try/except to handle the problem gracefully instead of crashing the program.`,
    cleanCode: `def divide(a, b):
    try:
        result = a / b
        return result
    except ZeroDivisionError:
        print("Error: cannot divide by zero")
        return None

print(divide(10, 2))    # Output: 5.0
print(divide(10, 0))
# Output: Error: cannot divide by zero
#         None`,
    walkthrough: [
      {
        code: `try:`,
        explain: `Python runs everything in this block and watches for any exceptions that are raised.`,
      },
      {
        code: `result = a / b`,
        explain: `If b is 0, Python raises ZeroDivisionError and jumps immediately to the except block. Lines after the error inside try are skipped.`,
      },
      {
        code: `except ZeroDivisionError:`,
        explain: `Catches only ZeroDivisionError. Other exceptions still propagate. To catch any exception: except Exception as e: — then e holds the error details.`,
      },
      {
        code: `return None`,
        explain: `Returns None to signal failure instead of crashing the caller. The caller can check: if result is None: handle the error.`,
      },
    ],
    examples: [
      {
        label: 'Multiple exceptions',
        code: `def parse_number(text):
    try:
        return int(text)
    except ValueError:
        print(f"Cannot convert {text!r} to int")
        return None
    except TypeError:
        print("Expected a string, got:", type(text).__name__)
        return None

print(parse_number("42"))    # Output: 42
print(parse_number("abc"))
# Output: Cannot convert 'abc' to int
#         None
print(parse_number(None))
# Output: Expected a string, got: NoneType
#         None`,
      },
      {
        label: 'finally & raise',
        code: `# finally always runs — even after an exception
def read_config(path):
    f = None
    try:
        f = open(path)
        return f.read()
    except FileNotFoundError:
        raise ValueError(f"Config not found: {path}")
    finally:
        if f:
            f.close()     # always closes, even on error

# Define your own exception class
class InsufficientFundsError(Exception):
    pass

def withdraw(balance, amount):
    if amount > balance:
        raise InsufficientFundsError(
            f"Need {amount}, have {balance}")
    return balance - amount`,
      },
    ],
    edgeCases: [
      `Bare except: (no exception type) catches everything including KeyboardInterrupt and SystemExit, making the program impossible to stop. Always name the exception type.`,
      `else: after except runs only when NO exception occurred. finally: runs always — with or without an exception.`,
      `Catching Exception does not catch BaseException subclasses like SystemExit and KeyboardInterrupt. That is usually the right behaviour.`,
    ],
    gotcha: `Catching a broad exception and doing nothing (pass) silently swallows errors. You will have no idea why your program produces wrong results. At minimum log the error: print(f'Error: {e}').`,
    tip: `Raise exceptions early with clear messages: 'ValueError: age must be positive, got -5'. It is much easier to debug than a cryptic crash several function calls later.`,
  },

  {
    id: 'modules',
    title: 'Modules & Imports',
    track: 'beginner',
    estimatedMins: 12,
    intro: `A module is just a Python file. Imports let you use code from Python's standard library, from packages installed with pip, or from your own files — without copy-pasting.`,
    cleanCode: `import math
import random

print(math.sqrt(16))          # Output: 4.0
print(math.pi)                # Output: 3.141592653589793
print(math.floor(4.7))        # Output: 4

print(random.randint(1, 6))   # random number 1–6 (like a die roll)
print(random.choice(["rock", "paper", "scissors"]))

# Import specific names — no prefix needed
from math import sqrt, ceil
print(sqrt(25))   # Output: 5.0
print(ceil(4.2))  # Output: 5`,
    walkthrough: [
      {
        code: `import math`,
        explain: `Loads the entire math module. Every function and constant inside is accessed with the math. prefix.`,
      },
      {
        code: `math.sqrt(16)`,
        explain: `Calls the sqrt function from the math module. Returns a float.`,
      },
      {
        code: `math.pi`,
        explain: `A constant, not a function — no parentheses needed.`,
      },
      {
        code: `from math import sqrt, ceil`,
        explain: `Imports specific names directly into your code. No math. prefix needed afterwards. Useful when you use a function many times.`,
      },
    ],
    examples: [
      {
        label: 'Standard library highlights',
        code: `import os
import datetime
import json

print(os.getcwd())           # current working directory
print(os.path.join("a", "b", "c.txt"))  # a/b/c.txt  (OS-safe)

today = datetime.date.today()
print(today)                 # e.g. 2025-06-07
print(today.year)            # e.g. 2025

text = json.dumps({"x": 1})  # dict to JSON string
data = json.loads(text)       # JSON string to dict
print(data)                  # Output: {'x': 1}`,
      },
      {
        label: 'Your own module',
        code: `# --- file: utils.py ---
def add(a, b):
    return a + b

PI = 3.14159

# --- file: main.py ---
from utils import add, PI

print(add(3, 4))    # Output: 7
print(PI)           # Output: 3.14159

# Code inside this guard only runs when the file is executed
# directly, NOT when it is imported by another module
if __name__ == "__main__":
    print("Running utils.py directly")`,
      },
    ],
    edgeCases: [
      `from math import * imports everything and can cause name clashes with your own functions. Avoid it in production code.`,
      `Module names are case-sensitive on Linux and macOS. import Math fails even though the file is math.py.`,
      `Circular imports — module A imports B, B imports A — cause ImportError. Restructure to break the cycle.`,
    ],
    gotcha: `import module runs the entire module file on first import. Slow code at the top level of a module (database connections, file reads) runs every time any file imports it.`,
    tip: `Use import aliases to shorten long module names: import numpy as np, import pandas as pd. These are community conventions — follow them so your code looks familiar to other Python developers.`,
  },

  {
    id: 'oop-basics',
    title: 'Classes & Objects',
    track: 'beginner',
    estimatedMins: 25,
    intro: `A class is a blueprint for creating objects. Each object gets its own copy of the data (instance attributes) but shares the behavior (methods) defined on the class.`,
    cleanCode: `class Dog:
    def __init__(self, name, breed):
        self.name  = name
        self.breed = breed

    def bark(self):
        return f"{self.name} says: Woof!"

dog1 = Dog("Rex", "Labrador")
dog2 = Dog("Bella", "Poodle")

print(dog1.bark())   # Output: Rex says: Woof!
print(dog2.bark())   # Output: Bella says: Woof!
print(dog1.name)     # Output: Rex`,
    walkthrough: [
      {
        code: `class Dog:`,
        explain: `Defines a class named Dog. By convention, class names start with a capital letter. Everything indented inside belongs to the class.`,
      },
      {
        code: `def __init__(self, name, breed):`,
        explain: `The constructor — called automatically when you write Dog(...). self refers to the new object being created. name and breed are the values you pass in.`,
      },
      {
        code: `self.name = name`,
        explain: `Stores name on the object as an instance attribute. Each Dog gets its own self.name. Without self. this would just be a local variable that disappears when __init__ ends.`,
      },
      {
        code: `def bark(self):`,
        explain: `A method — a function that belongs to the class. The first parameter is always self, but you never pass it; Python inserts it automatically when you call dog1.bark().`,
      },
      {
        code: `dog1 = Dog("Rex", "Labrador")`,
        explain: `Creates a new Dog object. Python calls __init__ with the new object as self, 'Rex' as name, and 'Labrador' as breed.`,
      },
    ],
    examples: [
      {
        label: 'Inheritance',
        code: `class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return f"{self.name} makes a sound"

class Cat(Animal):            # Cat inherits from Animal
    def speak(self):          # override the parent method
        return f"{self.name} says: Meow!"

animals = [Animal("Generic"), Cat("Whiskers")]
for a in animals:
    print(a.speak())
# Output:
# Generic makes a sound
# Whiskers says: Meow!`,
      },
      {
        label: 'Class vs instance attributes',
        code: `class Counter:
    total = 0               # class attribute — shared by ALL instances

    def __init__(self):
        Counter.total += 1
        self.id = Counter.total  # instance attribute — unique per object

c1 = Counter()
c2 = Counter()
c3 = Counter()

print(Counter.total)   # Output: 3  (how many were created in total)
print(c1.id)           # Output: 1  (unique to c1)
print(c2.id)           # Output: 2
print(c3.id)           # Output: 3`,
      },
    ],
    edgeCases: [
      `Forgetting self. inside __init__ (writing name = name instead of self.name = name) means the value is a local variable that disappears. The object has no name attribute.`,
      `self is just a convention — you could name it anything — but do not. Every Python developer expects it to be self.`,
      `Class attributes are shared by ALL instances. If you mutate a class attribute (especially a list or dict) from one instance, all other instances see the change.`,
    ],
    gotcha: `If you set a class attribute to a mutable object like a list, all instances share that exact same list. Adding to it from one instance adds to it for all. Use self.items = [] inside __init__ to give each instance its own list.`,
    tip: `Use isinstance(obj, ClassName) to check if an object is an instance of a class or any subclass. It is more reliable than type(obj) == ClassName, which does not handle inheritance.`,
  },

  // -- ADVANCED -----------------------------------------------------------------
  {
    id: 'comprehensions',
    title: 'List Comprehensions',
    track: 'advanced',
    estimatedMins: 15,
    intro: `A list comprehension builds a new list from an existing sequence in one line. It combines a for loop and an optional filter into a single readable expression — no append(), no temp variable.`,
    cleanCode: `# Without comprehension
squares = []
for n in range(1, 6):
    squares.append(n ** 2)
print(squares)   # Output: [1, 4, 9, 16, 25]

# Same result as a comprehension
squares = [n ** 2 for n in range(1, 6)]
print(squares)   # Output: [1, 4, 9, 16, 25]

# With a filter
evens = [n for n in range(10) if n % 2 == 0]
print(evens)     # Output: [0, 2, 4, 6, 8]

# Dict comprehension
lengths = {w: len(w) for w in ["cat", "elephant", "ox"]}
print(lengths)   # Output: {'cat': 3, 'elephant': 8, 'ox': 2}`,
    walkthrough: [
      {
        code: `[n ** 2 for n in range(1, 6)]`,
        explain: `Read left to right: 'give me n**2 for each n in range(1, 6).' Evaluates to [1, 4, 9, 16, 25].`,
      },
      {
        code: `[n for n in range(10) if n % 2 == 0]`,
        explain: `The if clause at the end filters. Only values where n % 2 == 0 is True are included in the result.`,
      },
      {
        code: `{w: len(w) for w in [...]}`,
        explain: `A dict comprehension — same idea with curly braces and key: value. Produces a dict, not a list.`,
      },
    ],
    examples: [
      {
        label: 'Nested & flattening',
        code: `matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

# Flatten: for each row, for each cell
flat = [cell for row in matrix for cell in row]
print(flat)   # Output: [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Read the for clauses left to right — same order as nested loops:
# for row in matrix:
#     for cell in row:
#         flat.append(cell)

words = ["hello", "world", "python"]
titled = [w.title() for w in words]
print(titled)  # Output: ['Hello', 'World', 'Python']`,
      },
      {
        label: 'Set & generator expression',
        code: `# Set comprehension — unique values, no duplicates
letters = {c.lower() for c in "Hello World" if c != " "}
print(sorted(letters))  # Output: ['d', 'e', 'h', 'l', 'o', 'r', 'w']

# Generator expression — lazy, no list built in memory
# Use () instead of []
total = sum(n ** 2 for n in range(1_000_000))  # no million-item list
print(total)   # Output: 333332833333500000

# any() and all() short-circuit with generators
numbers = [2, 4, 6, 8, 10]
print(all(n % 2 == 0 for n in numbers))   # Output: True
print(any(n > 9 for n in numbers))         # Output: True`,
      },
    ],
    edgeCases: [
      `Nested comprehensions read left to right matching outer to inner loops. [[row[i] for row in matrix] for i in range(3)] transposes a 3-column matrix.`,
      `Comprehensions with side effects (print, file writes) are bad style. Use a regular for loop when the goal is effects, not building a new list.`,
    ],
    gotcha: `Do not force complexity into one line. If the expression or filter needs a comment to be understood, use a regular for loop. Readability beats brevity.`,
    tip: `Generator expressions use constant memory because values are produced one at a time. Use them with sum(), any(), all(), max(), min() when working with large sequences.`,
  },

  {
    id: 'decorators',
    title: 'Decorators',
    track: 'advanced',
    estimatedMins: 20,
    intro: `A decorator is a function that wraps another function to add behavior before or after it runs — without touching the original code. The @name syntax is shorthand for func = decorator(func).`,
    cleanCode: `import time

def timer(func):
    def wrapper(*args, **kwargs):
        start  = time.time()
        result = func(*args, **kwargs)   # call the original
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timer
def slow_sum(n):
    return sum(range(n))

print(slow_sum(1_000_000))
# Output: slow_sum took 0.0431s
#         499999500000`,
    walkthrough: [
      {
        code: `def timer(func):`,
        explain: `The decorator is a function that takes another function as its argument.`,
      },
      {
        code: `def wrapper(*args, **kwargs):`,
        explain: `The replacement function. *args and **kwargs forward any arguments the original function needs, so the decorator works with any signature.`,
      },
      {
        code: `result = func(*args, **kwargs)`,
        explain: `Calls the ORIGINAL function inside the wrapper. The decorator runs its setup/teardown code around this call.`,
      },
      {
        code: `return wrapper`,
        explain: `The decorator returns the wrapper function. That wrapper replaces the original function everywhere it is used.`,
      },
      {
        code: `@timer`,
        explain: `Syntactic sugar. @timer before def slow_sum is exactly equivalent to writing slow_sum = timer(slow_sum) after the definition.`,
      },
    ],
    examples: [
      {
        label: 'functools.wraps',
        code: `from functools import wraps
import time

def timer(func):
    @wraps(func)             # preserves __name__, __doc__, etc.
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__}: {time.time()-start:.4f}s")
        return result
    return wrapper

@timer
def my_func():
    """Does something useful."""
    pass

print(my_func.__name__)  # Output: my_func  (not "wrapper")
print(my_func.__doc__)   # Output: Does something useful.`,
      },
      {
        label: 'Decorator with arguments',
        code: `from functools import wraps

def retry(times=3):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == times:
                        raise
                    print(f"Attempt {attempt} failed: {e}")
        return wrapper
    return decorator

@retry(times=3)
def flaky_request():
    import random
    if random.random() < 0.7:
        raise ConnectionError("timeout")
    return "success"`,
      },
    ],
    edgeCases: [
      `Without @wraps(func), the wrapped function loses its __name__ and __doc__. Logging, debugging, and help() all rely on __name__ — always add @wraps.`,
      `Stacking decorators: @a @b def f() means f = a(b(f)). The decorator closest to the function is applied first.`,
    ],
    gotcha: `@decorator runs the decorator at definition time (module import), not at call time. Expensive setup inside the decorator body runs once when the module loads — not each time the function is called.`,
    tip: `Start with functools.lru_cache (memoization) and functools.wraps before writing your own decorators — they cover the most common use cases.`,
  },

  {
    id: 'generators',
    title: 'Generators',
    track: 'advanced',
    estimatedMins: 15,
    intro: `A generator produces values one at a time on demand instead of building an entire list in memory. Define one with yield instead of return, or use a generator expression with parentheses.`,
    cleanCode: `def countdown(n):
    while n > 0:
        yield n      # pause here, hand n back to caller
        n -= 1

gen = countdown(5)
print(next(gen))   # Output: 5
print(next(gen))   # Output: 4
print(next(gen))   # Output: 3

# for loops consume generators automatically
for value in countdown(3):
    print(value, end=" ")
# Output: 3 2 1`,
    walkthrough: [
      {
        code: `yield n`,
        explain: `Pauses the function, hands n back to the caller, and saves the entire function state (local variables, current position). Unlike return, the function is not finished — it resumes on the next call.`,
      },
      {
        code: `next(gen)`,
        explain: `Resumes the generator from where it last yielded and runs until the next yield. When no more yields remain, StopIteration is raised automatically.`,
      },
      {
        code: `for value in countdown(3):`,
        explain: `A for loop calls next() repeatedly and catches StopIteration automatically. This is the most common way to consume a generator.`,
      },
    ],
    examples: [
      {
        label: 'Infinite sequence',
        code: `# A generator CAN produce infinite values — impossible with a list
def naturals(start=1):
    n = start
    while True:
        yield n
        n += 1

from itertools import islice
first_ten = list(islice(naturals(), 10))
print(first_ten)  # Output: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Generator expression — lazy version of a list comprehension
total = sum(n ** 2 for n in range(1_000_000))  # no million-item list
print(total)     # Output: 333332833333500000`,
      },
      {
        label: 'Pipeline with generators',
        code: `# Generators chain naturally — each stage processes one item at a time
def read_lines(data):
    for line in data.splitlines():
        yield line.strip()

def filter_non_empty(lines):
    for line in lines:
        if line:
            yield line

def uppercase(lines):
    for line in lines:
        yield line.upper()

data = "hello\n\nworld\n"
pipeline = uppercase(filter_non_empty(read_lines(data)))
print(list(pipeline))  # Output: ['HELLO', 'WORLD']`,
      },
    ],
    edgeCases: [
      `A generator can only be iterated ONCE. After it is exhausted, all subsequent next() calls raise StopIteration. Call the function again to get a fresh generator.`,
      `Calling a generator function does NOT run any code. countdown(5) just creates the generator object. Code runs on the first next().`,
    ],
    gotcha: `Returning a value from a generator (return value) raises StopIteration with that value attached. It does not send the value to the caller the way yield does.`,
    tip: `Generator expressions (x**2 for x in range(n)) are the most concise generators. Use them with sum(), min(), max(), any(), all() to process large sequences without intermediate lists.`,
  },

  {
    id: 'context-managers',
    title: 'Context Managers — with',
    track: 'advanced',
    estimatedMins: 15,
    intro: `A context manager runs setup code before a block and teardown code after, automatically — even if an exception is raised inside. The with statement is how you use one. File I/O is the most common example.`,
    cleanCode: `# Built-in: file — f.close() called automatically
with open("data.txt", "w") as f:
    f.write("hello")
# File is closed here even if an error occurred above

from contextlib import contextmanager

@contextmanager
def managed_connect(host):
    print(f"Connecting to {host}")
    conn = {"host": host, "open": True}
    try:
        yield conn           # caller gets conn inside the with block
    finally:
        conn["open"] = False
        print("Disconnected")

with managed_connect("db.server") as c:
    print("Active:", c["open"])
# Output:
# Connecting to db.server
# Active: True
# Disconnected`,
    walkthrough: [
      {
        code: `with open(...) as f:`,
        explain: `Calls __enter__ on the file object (returns the file handle), then calls __exit__ at the end of the with block no matter what — success or exception.`,
      },
      {
        code: `@contextmanager`,
        explain: `The easiest way to write your own. Code before yield is the setup (__enter__). Code after yield in the finally block is the teardown (__exit__).`,
      },
      {
        code: `yield conn`,
        explain: `The value after yield becomes the as variable in the with statement. The function pauses here while the with block runs.`,
      },
      {
        code: `finally:`,
        explain: `Ensures teardown runs even if the caller raises an exception inside the with block. Without finally an exception would skip the cleanup.`,
      },
    ],
    examples: [
      {
        label: 'Class-based context manager',
        code: `import time

class Timer:
    def __enter__(self):
        self._start = time.time()
        return self         # becomes the "as" variable

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.time() - self._start
        print(f"Elapsed: {self.elapsed:.4f}s")
        return False        # do not suppress exceptions

with Timer() as t:
    total = sum(range(1_000_000))
# Output: Elapsed: 0.0423s
print(t.elapsed)   # still accessible after the with block`,
      },
      {
        label: 'Multiple & suppress',
        code: `# Two context managers in one with statement
with open("input.txt") as src, open("output.txt", "w") as dst:
    for line in src:
        dst.write(line.upper())

# contextlib.suppress: silently ignore a specific exception
from contextlib import suppress
with suppress(FileNotFoundError):
    open("maybe_missing.txt")  # silently ignored if file is absent`,
      },
    ],
    edgeCases: [
      `If __exit__ returns True, any exception raised inside the with block is suppressed. Return False or None to let it propagate normally.`,
      `contextmanager generators must yield exactly once. Yielding zero or more than once raises RuntimeError.`,
    ],
    gotcha: `Assigning the context manager to a variable without with loses the guarantee: f = open('file') — if code between open and f.close() raises, the file is never closed. Always use with.`,
    tip: `contextlib.ExitStack lets you manage a dynamic number of context managers (e.g. open N files determined at runtime) inside one with block.`,
  },

  {
    id: 'closures',
    title: 'Closures',
    track: 'advanced',
    estimatedMins: 15,
    intro: `A closure is a function that remembers variables from the scope where it was created, even after that outer scope has finished executing. It is the mechanism behind function factories and many decorator patterns.`,
    cleanCode: `def make_multiplier(factor):
    def multiply(x):
        return x * factor    # factor lives in the enclosing scope
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print(double(5))   # Output: 10
print(triple(5))   # Output: 15
print(double(7))   # Output: 14

print(double.__closure__[0].cell_contents)  # Output: 2`,
    walkthrough: [
      {
        code: `make_multiplier(2)`,
        explain: `Runs the outer function, creating a local variable factor = 2, then returns the inner multiply function.`,
      },
      {
        code: `def multiply(x): return x * factor`,
        explain: `multiply references factor from the enclosing scope. Python keeps factor alive inside a closure cell so multiply can still use it after make_multiplier finishes.`,
      },
      {
        code: `double = make_multiplier(2)`,
        explain: `double is the multiply function with factor = 2 captured. triple is a separate multiply function with factor = 3. They are completely independent.`,
      },
    ],
    examples: [
      {
        label: 'Counter factory',
        code: `def make_counter(start=0):
    count = [start]   # list so we can mutate without nonlocal
    def increment(by=1):
        count[0] += by
        return count[0]
    return increment

a = make_counter()
b = make_counter(100)

print(a())    # Output: 1
print(a())    # Output: 2
print(b())    # Output: 101
print(a())    # Output: 3  (independent from b)`,
      },
      {
        label: 'Loop closure gotcha & fix',
        code: `# WRONG: all lambdas share the same i variable
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])  # Output: [2, 2, 2]  not [0, 1, 2]!

# FIX 1: default argument captures the current value at loop time
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])  # Output: [0, 1, 2]

# FIX 2: factory function (same idea, more explicit)
def make_func(n):
    return lambda: n
funcs = [make_func(i) for i in range(3)]
print([f() for f in funcs])  # Output: [0, 1, 2]`,
      },
    ],
    edgeCases: [
      `To ASSIGN to a variable in the enclosing scope (not just read it), declare it with nonlocal: nonlocal count before the assignment.`,
      `Closures capture the VARIABLE, not the value at capture time. If the variable changes later the closure sees the new value — that is the source of the loop gotcha.`,
    ],
    gotcha: `Creating closures in a loop without capturing the current value is the most common closure bug. All closures end up sharing the final value of the loop variable.`,
    tip: `Closures are the backbone of decorators. Understanding closures explains exactly why wrappers inside decorators can access the original function via the enclosing scope.`,
  },

  {
    id: 'dataclasses',
    title: 'Dataclasses',
    track: 'advanced',
    estimatedMins: 15,
    intro: `The @dataclass decorator automatically writes __init__, __repr__, and __eq__ from the field declarations in your class body. It cuts boilerplate while keeping all the power of a normal class.`,
    cleanCode: `from dataclasses import dataclass, field

@dataclass
class Point:
    x: float
    y: float
    label: str = "origin"   # field with a default value

p1 = Point(3.0, 4.0)
p2 = Point(3.0, 4.0)
p3 = Point(1.0, 2.0, label="A")

print(p1)          # Output: Point(x=3.0, y=4.0, label='origin')
print(p1 == p2)    # Output: True   (compares field values)
print(p1 == p3)    # Output: False`,
    walkthrough: [
      {
        code: `@dataclass`,
        explain: `Reads the class body and generates __init__, __repr__, and __eq__ automatically. Without it, print(p1) shows <__main__.Point object at 0x...> and p1 == p2 is always False.`,
      },
      {
        code: `x: float`,
        explain: `A field declaration. The type annotation is used by tooling and documentation — Python does not enforce it at runtime.`,
      },
      {
        code: `label: str = "origin"`,
        explain: `A field with a default value. Fields with defaults must come after fields without defaults (same rule as function parameters).`,
      },
      {
        code: `print(p1 == p2)`,
        explain: `True because @dataclass generated __eq__ that compares all fields. x, y, and label are equal for both p1 and p2.`,
      },
    ],
    examples: [
      {
        label: 'frozen & ordering',
        code: `from dataclasses import dataclass

@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int
    patch: int = 0

v1 = Version(1, 2, 3)
v2 = Version(2, 0)

print(v1 < v2)            # Output: True   (order=True adds < > <= >=)
print(sorted([v2, v1]))   # Output: [Version(1,2,3), Version(2,0,0)]

# frozen=True makes it immutable and hashable (usable as dict key)
seen = {v1, v2}   # set of Version objects
# v1.major = 99   -> FrozenInstanceError`,
      },
      {
        label: 'field() for mutable defaults',
        code: `from dataclasses import dataclass, field

@dataclass
class Team:
    name: str
    # members: list = []  <- raises ValueError — all instances would share one list
    members: list = field(default_factory=list)

team_a = Team("Alpha")
team_b = Team("Beta")

team_a.members.append("Alice")
print(team_a.members)  # Output: ['Alice']
print(team_b.members)  # Output: []  (independent, not shared)`,
      },
    ],
    edgeCases: [
      `@dataclass(frozen=True) makes instances immutable AND hashable, so they can be used as dict keys or set members.`,
      `Fields with defaults must follow fields without defaults — same rule as function parameters.`,
    ],
    gotcha: `Using a mutable default like members: list = [] raises ValueError at class definition time. Python prevents it to stop accidental sharing. Use field(default_factory=list) instead.`,
    tip: `@dataclass(slots=True) (Python 3.10+) adds __slots__ automatically, reducing memory usage by roughly 40% per instance — useful for large collections of objects.`,
  },

  {
    id: 'async',
    title: 'Async / Await',
    track: 'advanced',
    estimatedMins: 20,
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
    track: 'advanced',
    estimatedMins: 20,
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
    track: 'advanced',
    estimatedMins: 12,
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
    track: 'advanced',
    estimatedMins: 20,
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
