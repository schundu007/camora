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
    id: 'tuples',
    title: 'Tuples',
    chapter: 'data-structures',
    track: 'beginner',
    estimatedMins: 30,
    summary: `An ordered collection that cannot be changed once built, which is exactly why it can be a dictionary key when a list cannot — the difference interviewers probe with the list-versus-tuple question.`,
    intro: `A tuple holds a fixed sequence of values. You read it exactly like a list, with indexes and slices and loops, but you cannot add, remove or replace anything after it exists. That one restriction is what makes tuples useful: Python can hash them, so they work as dictionary keys and set members, and a reader can see at a glance that the data was never meant to move.`,
    sections: [
      {
        heading: 'The comma makes the tuple, not the parentheses',
        body: `This is the single most common tuple mistake. Writing (5) is just the number 5 with brackets around it, because the brackets here mean grouping, the same as in 2 * (3 + 4). What creates a tuple is the comma. So a one-item tuple is (5,) with a trailing comma, and 5, on its own is a tuple too. The empty tuple is the one exception, written () or tuple(), since there is nothing for a comma to separate. If a function is quietly receiving a string where you expected a one-item tuple, this is almost always why.`,
        code: `not_a_tuple = (5)
print(type(not_a_tuple))        # Output: <class 'int'>

one = (5,)                      # the trailing comma is the tuple
print(type(one), len(one))      # Output: <class 'tuple'> 1

also_one = 5,                   # parentheses are optional
print(also_one)                 # Output: (5,)

empty = ()
print(type(empty), len(empty))  # Output: <class 'tuple'> 0`,
      },
      {
        heading: 'Immutable means the tuple, not what is inside it',
        body: `A tuple freezes which objects it holds. It does not freeze those objects. If one of them is a list, that list can still be appended to, and the tuple is perfectly happy because it still points at the same list. This is why a tuple containing a list cannot be hashed and cannot be a dictionary key: Python checks every item, and a list has no stable hash. A tuple is hashable only if every item in it is hashable too.`,
        code: `t = (1, [2, 3])
t[1].append(4)               # the list inside is still mutable
print(t)                     # Output: (1, [2, 3, 4])
print(len(t))                # Output: 2   the tuple still holds the same two items

# hash(t)  -> TypeError: unhashable type: 'list'`,
      },
      {
        heading: 'Packing and unpacking',
        body: `Listing values separated by commas builds a tuple, and that is called packing. Going the other way, putting several names on the left of an assignment splits a tuple back out, which is unpacking. The counts must match or Python raises ValueError, unless you mark one name with a star to soak up whatever is left over as a list. Unpacking is everywhere in normal Python, often without parentheses in sight: returning two values from a function, swapping with a, b = b, a, and the i, value pair that enumerate() hands you on each loop are all tuple unpacking.`,
        code: `person = "Ada", 36, "London"     # packing — parentheses are optional
print(person)                    # Output: ('Ada', 36, 'London')

name, age, city = person         # unpacking
print(name, city)                # Output: Ada London

head, *tail = (1, 2, 3, 4)       # a starred name takes the rest, as a list
print(head, tail)                # Output: 1 [2, 3, 4]`,
      },
      {
        heading: 'Hashable, so it can be a dictionary key',
        body: `A hash is a number Python derives from a value so it can find that value again instantly in a dict or a set. The rule is that the hash must stay the same for as long as the object is in use. Immutability is the easiest way to guarantee that, which is why the immutable built-ins are hashable and a list is not — but immutability is not itself the rule. A tuple holding a list is immutable and still unhashable, and a class you write is hashable by identity even while you mutate its attributes, unless it defines __eq__ without __hash__. So a tuple of hashable items qualifies, and a coordinate pair, a (row, column) cell or a (function, args) cache key all work as dictionary keys. A list never does, because appending to it would change its hash and lose the entry.`,
        code: `grid = {(0, 0): "start", (1, 2): "treasure"}
print(grid[(1, 2)])          # Output: treasure

seen = {(1, 2), (3, 4), (1, 2)}
print(len(seen))             # Output: 2   the duplicate is dropped

print(hash((1, 2)) == hash((1, 2)))   # Output: True

# hash([1, 2])  -> TypeError: unhashable type: 'list'`,
      },
      {
        heading: 'There is no tuple comprehension',
        body: `Python has list, dict and set comprehensions, but not a tuple one, and the reason is syntax rather than principle: parentheses were already taken. Writing (n * n for n in range(5)) gives you a generator expression, which produces values lazily one at a time instead of building a collection. That is a genuinely useful thing to have, so Python kept it. When you want a real tuple, wrap the same expression in tuple(). Remember a generator is single-use: once you have walked it, it is empty.`,
        code: `squares_list = [n * n for n in range(5)]
print(squares_list)              # Output: [0, 1, 4, 9, 16]

gen = (n * n for n in range(5))  # parentheses give a GENERATOR, not a tuple
print(type(gen))                 # Output: <class 'generator'>

squares_tuple = tuple(n * n for n in range(5))
print(squares_tuple)             # Output: (0, 1, 4, 9, 16)

g = (n for n in range(3))
print(list(g))                   # Output: [0, 1, 2]
print(list(g))                   # Output: []   already exhausted`,
      },
      {
        heading: 'namedtuple gives the positions names',
        body: `The weakness of a plain tuple is that p[0] tells a reader nothing. collections.namedtuple builds a tuple subclass whose positions also have names, so you can write p.x while everything that worked before still works: indexing, unpacking, comparison, hashing and use as a dictionary key. It costs no more memory than a plain tuple. Since it is still immutable, _replace() returns a new instance rather than editing the old one, and _asdict() hands you a plain dictionary. If you want the same readability with defaults and type hints, typing.NamedTuple is the modern spelling of the same idea.`,
        code: `from collections import namedtuple

Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)

print(p.x, p.y)              # Output: 3 4
print(p[0])                  # Output: 3   still indexable like a tuple
print(p)                     # Output: Point(x=3, y=4)
print(isinstance(p, tuple))  # Output: True`,
      },
      {
        heading: 'Tuple or list: how to choose',
        body: `Ask one question: will this collection grow, shrink or change? If yes, use a list. If no, use a tuple. A fixed set of weekday labels, a coordinate, a colour channel triple and a function returning two values are all tuples. A shopping basket, a queue of jobs and a buffer of readings are all lists. There is a small performance edge too — a tuple takes slightly less memory and builds a little faster, because Python does not have to leave room for growth — but that is rarely the reason to pick one. The real reason is that a tuple documents intent and makes accidental modification a loud TypeError instead of a silent bug.`,
        code: `DAYS = ("Mon", "Tue", "Wed")     # a fixed set of labels — tuple
scores = [90, 85]                # this will grow — list

scores.append(78)
print(scores)                    # Output: [90, 85, 78]
print(hasattr(DAYS, "append"))   # Output: False
print(hasattr(scores, "append")) # Output: True

config = {("db", "host"): "localhost"}   # a tuple key works
print(config[("db", "host")])            # Output: localhost`,
      },
    ],
    keyTerms: [
      { term: 'Immutable',     meaning: 'Cannot be changed after creation. A tuple has no append, no remove, no sort and no item assignment.' },
      { term: 'Packing',       meaning: 'Building a tuple by writing values separated by commas, with or without parentheses.' },
      { term: 'Unpacking',     meaning: 'Splitting a tuple across several names in one assignment. The counts must match unless a name is starred.' },
      { term: 'Trailing comma', meaning: 'The comma that makes a one-item tuple. (5,) is a tuple; (5) is just the number 5.' },
      { term: 'Hashable',      meaning: 'Has a hash that never changes, so it can be a dictionary key or a set member. A tuple is hashable only if every item is.' },
      { term: 'Generator expression', meaning: 'What parentheses around a comprehension actually produce. It yields values one at a time instead of building a tuple.' },
      { term: 'namedtuple',    meaning: 'A tuple subclass from the collections module whose positions also have names, so p.x works alongside p[0].' },
      { term: 'Shallow immutability', meaning: 'A tuple fixes which objects it holds, but not the contents of any mutable object among them.' },
    ],
    cleanCode: `point = (3, 4)

print(point[0])          # Output: 3
print(point[-1])         # Output: 4
print(len(point))        # Output: 2

x, y = point             # unpacking: one name per item
print(x, y)              # Output: 3 4

# point[0] = 9           -> TypeError: 'tuple' object does not support item assignment

bigger = point + (5,)    # concatenation builds a NEW tuple
print(bigger)            # Output: (3, 4, 5)
print(point)             # Output: (3, 4)   the original is unchanged`,
    walkthrough: [
      {
        code: `point = (3, 4)`,
        explain: `Creates a tuple of two items. The comma is what makes it a tuple; the parentheses only group it. point = 3, 4 builds exactly the same object.`,
      },
      {
        code: `point[0]`,
        explain: `Indexing works just as it does on a list. Python counts from 0, so index 0 is the first item. Slicing works too, and a slice of a tuple is another tuple.`,
      },
      {
        code: `point[-1]`,
        explain: `Negative indexes count from the end, so -1 is the last item and -2 the one before it.`,
      },
      {
        code: `len(point)`,
        explain: `How many items the tuple holds. Unlike a list, that number can never change for the life of the object.`,
      },
      {
        code: `x, y = point`,
        explain: `Unpacking pairs each name on the left with each item on the right, and the counts have to match. Both mismatches raise ValueError, with different wording depending on which side is short: more items than names gives too many values to unpack, and fewer items than names gives not enough values to unpack. Marking one name with a star, as in x, *rest = point, absorbs whatever is left over and never raises.`,
      },
      {
        code: `point[0] = 9`,
        explain: `Not allowed. It raises TypeError: 'tuple' object does not support item assignment. There is no append, remove, insert or sort either — a tuple has exactly two methods, count and index.`,
      },
      {
        code: `point + (5,)`,
        explain: `Concatenation builds a new tuple and leaves both originals untouched. Note the trailing comma in (5,): without it Python sees the integer 5 and raises TypeError, because you cannot concatenate an int to a tuple.`,
      },
    ],
    examples: [
      {
        label: 'Unpacking in real code',
        code: `# A function that produces several related values returns one tuple,
# and the caller splits it open on the same line.
def stats(nums):
    return min(nums), max(nums), sum(nums) / len(nums)

low, high, avg = stats([4, 1, 9, 6])
print(low, high, avg)              # Output: 1 9 5.0

# Looping over a dict gives you a (key, value) tuple each time
scores = {"ada": 91, "linus": 78}
for name, score in scores.items():
    print(name, score)
# Output: ada 91
# Output: linus 78

# enumerate() hands you an (index, item) tuple
for rank, name in enumerate(["gold", "silver"], start=1):
    print(rank, name)
# Output: 1 gold
# Output: 2 silver

# Records sort by first item, then second, with no extra work
people = [("ada", 36), ("linus", 24), ("grace", 45)]
print(sorted(people, key=lambda p: p[1]))
# Output: [('linus', 24), ('ada', 36), ('grace', 45)]

oldest_name, oldest_age = max(people, key=lambda p: p[1])
print(oldest_name, oldest_age)     # Output: grace 45`,
      },
      {
        label: 'Tuples as keys',
        code: `from collections import Counter

# Counting pairs: the pair itself is the key
moves = [("a", "b"), ("b", "c"), ("a", "b")]
print(Counter(moves))
# Output: Counter({('a', 'b'): 2, ('b', 'c'): 1})

# A tuple of arguments makes a natural cache key
cache = {}

def slow_add(a, b):
    key = (a, b)
    if key not in cache:
        cache[key] = a + b
    return cache[key]

print(slow_add(2, 3))            # Output: 5
print(cache)                     # Output: {(2, 3): 5}

# A list cannot be a key at all:
# cache[[2, 3]] = 5  -> TypeError, a list is unhashable`,
      },
      {
        label: 'A record with named fields',
        code: `from collections import namedtuple

# Before: nothing tells the reader what row[1] holds.
rows = [("ada", 36, "London"), ("linus", 24, "Helsinki")]
for row in rows:
    print(row[0], "is", row[1])
# Output: ada is 36
# Output: linus is 24

# After: same tuple, but the positions have names.
Person = namedtuple("Person", ["name", "age", "city"])
people = [Person(*r) for r in rows]

for p in people:
    print(p.name, "lives in", p.city)
# Output: ada lives in London
# Output: linus lives in Helsinki

oldest = max(people, key=lambda p: p.age)
print(oldest)                # Output: Person(name='ada', age=36, city='London')

moved = oldest._replace(city="Paris")   # a NEW record; the original is untouched
print(moved.city, oldest.city)          # Output: Paris London
print(oldest._asdict())                 # Output: {'name': 'ada', 'age': 36, 'city': 'London'}`,
      },
      {
        label: 'The tuple that changed anyway',
        code: `# += on a list reached through a tuple index runs the in-place add first,
# then fails to store the result back. You get the error AND the change.
t = ([1, 2],)
try:
    t[0] += [3]
except TypeError as e:
    print("TypeError:", e)
    # Output: TypeError: 'tuple' object does not support item assignment
print(t)                     # Output: ([1, 2, 3],)   it changed regardless

# .extend() makes the same edit with no error at all
t[0].extend([4])
print(t)                     # Output: ([1, 2, 3, 4],)

# Which is why this tuple can never be a dictionary key
try:
    hash(t)
except TypeError as e:
    print("TypeError:", e)   # Output: TypeError: unhashable type: 'list'

frozen = (1, (2, 3))         # hashable all the way down
print(hash(frozen) == hash((1, (2, 3))))   # Output: True`,
      },
    ],
    cheatSheet: [
      {
        title: 'What you can call on a tuple',
        rows: [
          { call: 't.count(x)',              does: 'Counts how many times x appears in the tuple.',                                       returns: 'int' },
          { call: 't.index(x)',              does: 'Finds the position of the first x. Raises ValueError if x is not there.',             returns: 'int' },
          { call: 'len(t)',                  does: 'Reports how many items the tuple holds.',                                             returns: 'int' },
          { call: 'tuple(iterable)',         does: 'Builds a tuple from any iterable, including a generator expression or a string.',      returns: 'tuple' },
          { call: 't + other',               does: 'Joins two tuples into a new one. Neither original changes.',                          returns: 'tuple' },
          { call: 't * 3',                   does: 'Repeats the items three times in a new tuple.',                                       returns: 'tuple' },
          { call: 'x in t',                  does: 'Checks membership by scanning the tuple, so it costs time proportional to length.',   returns: 'bool' },
          { call: 'sorted(t)',               does: 'Sorts the items. It always hands back a list, so wrap it in tuple() if you need one.', returns: 'list' },
          { call: 'hash(t)',                 does: 'Computes the hash. Raises TypeError if any item inside is unhashable.',                   returns: 'int' },
          { call: 'namedtuple(name, fields)', does: 'Creates a tuple subclass whose positions also have names.',                          returns: 'type' },
          { call: 'p._replace(x=9)',         does: 'Returns a new namedtuple with one field changed. The original is untouched.',         returns: 'namedtuple' },
          { call: 'p._asdict()',             does: 'Converts a namedtuple into a plain dictionary of field to value.',                    returns: 'dict' },
        ],
      },
      {
        title: 'List versus tuple, side by side',
        columns: ['Question', 'list', 'tuple'],
        rows: [
          { call: 'Can it change after creation?', does: 'Yes, in place.',                                        returns: 'No.' },
          { call: 'Written as',                    does: '[1, 2]',                                                returns: '(1, 2) or 1, 2' },
          { call: 'Methods available',             does: 'append, extend, insert, remove, pop, sort, reverse, clear, copy, count, index', returns: 'count and index' },
          { call: 'Item assignment',               does: 'items[0] = 9 works.',                                   returns: 'Raises TypeError.' },
          { call: 'Hashable',                      does: 'Never.',                                                returns: 'Yes, if every item is.' },
          { call: 'Usable as a dict key or set member', does: 'No.',                                              returns: 'Yes, when hashable.' },
          { call: 'Memory for the same items',     does: 'Larger, because room is reserved for growth.',          returns: 'Smaller.' },
          { call: 'Reach for it when',             does: 'The collection will grow, shrink or be reordered.',     returns: 'The collection is a fixed record.' },
        ],
      },
    ],
    interviewQs: [
      {
        q: 'Differentiate between a list and a tuple.',
        a: `A list is mutable and a tuple is not. That single difference drives everything else. A list has append, remove, insert, sort and item assignment; a tuple has only count and index. A tuple is hashable when its items are, so it can be a dictionary key or a set member, while a list can never be either. A tuple uses slightly less memory and builds a little faster because Python does not reserve room for growth. Syntax is square brackets versus parentheses, though the comma is what actually makes a tuple. In practice I reach for a list when the collection will change, and a tuple for fixed records like a coordinate or a function returning two values.`,
      },
      {
        q: 'Is tuple comprehension possible? If yes how, if not why?',
        a: `No, there is no tuple comprehension. Putting a comprehension in parentheses gives you a generator expression instead, because that syntax was already claimed and generators are too useful to give up. So (n * n for n in range(5)) is a generator, not a tuple. To get an actual tuple you wrap it: tuple(n * n for n in range(5)). Nothing is lost, since the generator is consumed once to build the tuple. It also fits the type: a comprehension builds a collection up piece by piece, which is a mutable operation, so the natural result is a list.`,
      },
      {
        q: 'How do you create a tuple with a single element?',
        a: `With a trailing comma: (5,) or just 5,. The comma is what makes a tuple, not the parentheses, so (5) is simply the number 5 in grouping brackets. The empty tuple is the exception, written () or tuple(), because there is nothing to separate. This bites most often when a function returns (value) and the caller expects a one-item tuple.`,
      },
      {
        q: 'Why can a tuple be a dictionary key when a list cannot?',
        a: `Because a dictionary finds entries by hash, and a hash has to stay the same for as long as the key is in the dictionary. A tuple is immutable, so its hash is fixed and the entry stays findable. A list can be appended to, which would change its hash and strand the entry, so Python refuses to hash a list at all. The rule is per instance: a tuple that contains a list is itself unhashable, because hashing it means hashing the list inside.`,
      },
      {
        q: 'Are tuples always immutable?',
        a: `The tuple is, but its contents may not be. A tuple fixes which objects it points at, not what those objects contain. So in t = (1, [2, 3]) you cannot replace either item, but you can call t[1].append(4) and the tuple now prints as (1, [2, 3, 4]). There is a well-known consequence: t[0] += [3] on a tuple holding a list raises TypeError and still modifies the list, because the in-place add runs first and the failed assignment comes second.`,
      },
      {
        q: 'When would you choose a tuple over a list in real code?',
        a: `When the collection is a fixed record rather than a growing container. Coordinates, colour triples, database rows, a fixed set of labels, and anything used as a dictionary key or a set member. I also return a tuple from a function that produces two or three related values, because the caller unpacks it in one line. The immutability is documentation: a reader knows nothing will reassign it, and an accidental modification fails loudly instead of corrupting data quietly.`,
      },
      {
        q: 'What is a namedtuple and why would you use one?',
        a: `It is a tuple subclass from the collections module whose positions also have names, so you read p.x instead of p[0]. It is still a tuple underneath: it indexes, unpacks, compares, hashes and costs the same memory. It is the cheapest way to make a small record readable without writing a class, and _replace() gives you a changed copy while keeping immutability. For defaults and type hints I would use typing.NamedTuple, and for something mutable with behaviour a dataclass is the better fit.`,
      },
    ],
    references: [
      { label: 'Programiz — Python Tuple',                 url: 'https://www.programiz.com/python-programming/tuple' },
      { label: 'Python docs — Sequence Types',             url: 'https://docs.python.org/3/library/stdtypes.html#sequence-types-list-tuple-range' },
      { label: 'Python docs — collections.namedtuple',     url: 'https://docs.python.org/3/library/collections.html#collections.namedtuple' },
    ],
    edgeCases: [
      `(5) is the integer 5, not a tuple. Only the comma builds one: (5,) or 5,. The empty tuple () is the sole exception.`,
      `A tuple has exactly two methods, count and index. t.append("x") raises AttributeError: 'tuple' object has no attribute 'append'.`,
      `Unpacking must match the length. a, b = (1, 2, 3) raises a ValueError saying there are too many values to unpack. Use a, *rest to absorb the remainder.`,
      `A tuple holding a list is unhashable, so it cannot be a dictionary key or a set member even though the tuple itself cannot be reassigned.`,
      `t + (4,) builds a whole new tuple every time. Concatenating in a loop is quadratic work — collect into a list and call tuple() once at the end.`,
      `Comparison runs item by item from the left, so (1, 2) < (1, 3) is True and sorting a list of tuples sorts by first item, then second.`,
      `sorted() on a tuple returns a list, not a tuple. tuple(sorted(t)) gives you a tuple back.`,
      `A slice of a tuple is a tuple, so t[1:] on a three-item tuple gives a two-item tuple, never a list.`,
    ],
    gotcha: `t[0] += [3] on a tuple holding a list raises TypeError and modifies the list anyway. Python runs the in-place add on the list first, which succeeds, and only then tries to store the result back into the tuple, which fails. You end up with an error message and a changed list. Avoid in-place operators on anything reached through a tuple index.`,
    tip: `Let unpacking do the work. Return several values as one tuple and the caller reads lo, hi = min_max(nums) in a single line. Inside loops, for i, value in enumerate(items) and for key, value in d.items() are both tuple unpacking. When the positions start needing a comment to explain them, switch to namedtuple.`,
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
