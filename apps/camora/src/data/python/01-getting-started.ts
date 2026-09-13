import type { Topic } from './types';

export const GETTING_STARTED_TOPICS: Topic[] = [
  {
    id: 'variables',
    title: 'Variables & Data Types',
    chapter: 'getting-started',
    track: 'beginner',
    estimatedMins: 15,
    summary: `How Python stores values without type declarations, and why mutable and immutable types behave so differently when you assign them.`,
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
    edgeCases: [
      `-7 // 2 is -4, not -3. Floor division rounds toward negative infinity, not toward zero.`,
      `2 ** 3 ** 2 equals 512, not 64. ** is right-associative: it evaluates as 2 ** (3 ** 2) = 2 ** 9.`,
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
    edgeCases: [
      `range(5, 0) produces nothing (empty). To count down: range(5, 0, -1) gives 5, 4, 3, 2, 1.`,
      `Modifying a list while iterating over it causes skipped or repeated items. Iterate over a copy: for item in my_list[:]:`,
      `A while loop with no way to make the condition False runs forever. Always include a path that changes the condition or a break.`,
    ],
    gotcha: `for i in range(len(my_list)) is a common beginner pattern that is usually the wrong choice. Use for item in my_list: directly, or for i, item in enumerate(my_list): when you need the index too.`,
    tip: `Use while only when you do not know the number of iterations in advance. If you know the count or are going through a sequence, use for. while True: with an explicit break inside is fine for 'keep running until a condition inside triggers'.`,
  },
];
