import type { Topic } from './types';

export const OOP_TOPICS: Topic[] = [
  {
    id: 'oop-basics',
    title: 'Classes & Objects',
    chapter: 'oop',
    track: 'beginner',
    estimatedMins: 25,
    summary: `How classes define blueprints for objects with shared methods and per-instance data, the foundation every deeper object-oriented Python question builds on.`,
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

  {
    id: 'dataclasses',
    title: 'Dataclasses',
    chapter: 'oop',
    track: 'advanced',
    estimatedMins: 15,
    summary: `The decorator that writes __init__, __repr__ and __eq__ for you from the field declarations, which interviewers use to check that you know what those generated methods actually do and why a mutable default is rejected outright.`,
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
    id: 'generators',
    title: 'Generators',
    chapter: 'oop',
    track: 'advanced',
    estimatedMins: 15,
    summary: `Functions that produce values lazily with yield instead of building a full list in memory, which interviewers ask about to test understanding of iterators and memory efficiency.`,
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
];
