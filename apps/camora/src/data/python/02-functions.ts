import type { Topic } from './types';

export const FUNCTIONS_TOPICS: Topic[] = [
  {
    id: 'functions',
    title: 'Functions',
    chapter: 'functions',
    track: 'beginner',
    estimatedMins: 20,
    summary: `How to define and call reusable blocks of code with def, including default arguments, args and kwargs, and the mutable-default-argument trap interviewers love to ask about.`,
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
    id: 'closures',
    title: 'Closures',
    chapter: 'functions',
    track: 'advanced',
    estimatedMins: 15,
    summary: `How a nested function can remember variables from its enclosing scope after that scope has finished running, which is the mechanism behind decorators and function factories.`,
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
    id: 'decorators',
    title: 'Decorators',
    chapter: 'functions',
    track: 'advanced',
    estimatedMins: 20,
    summary: `How a function can wrap another function to add behavior without changing its code, a pattern interviewers ask about to test understanding of higher-order functions.`,
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
];
