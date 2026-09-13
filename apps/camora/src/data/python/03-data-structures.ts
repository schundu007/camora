import type { Topic } from './types';

export const DATA_STRUCTURES_TOPICS: Topic[] = [
  {
    id: 'lists',
    title: 'Lists',
    chapter: 'data-structures',
    track: 'beginner',
    estimatedMins: 20,
    summary: `Python's ordered, mutable sequence type, including indexing, slicing, and the classic aliasing bug where two names end up pointing at the same list.`,
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
    chapter: 'data-structures',
    track: 'beginner',
    estimatedMins: 20,
    summary: `Python's hash-based collections for key-value lookups and unique membership testing, and why both give constant-time operations that lists cannot.`,
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
    chapter: 'data-structures',
    track: 'beginner',
    estimatedMins: 20,
    summary: `Python's immutable text type and its built-in methods for searching, splitting, and formatting, including why repeated concatenation in a loop is a performance trap.`,
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
    id: 'comprehensions',
    title: 'List Comprehensions',
    chapter: 'data-structures',
    track: 'advanced',
    estimatedMins: 15,
    summary: `The concise syntax for building a list, set, or dict from an existing sequence in one line, which interviewers use to check for both correctness and readability judgment.`,
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
];
