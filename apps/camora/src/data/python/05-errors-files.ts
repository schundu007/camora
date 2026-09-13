import type { Topic } from './types';

export const ERRORS_FILES_TOPICS: Topic[] = [
  {
    id: 'errors',
    title: 'Error Handling',
    chapter: 'errors-files',
    track: 'beginner',
    estimatedMins: 15,
    summary: `How try, except, and finally let a Python program recover from failures instead of crashing, and why catching exceptions too broadly hides real bugs.`,
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
    references: [
      { label: 'Programiz — Exception Handling', url: 'https://www.programiz.com/python-programming/exception-handling' },
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
    id: 'file-io',
    title: 'File I/O',
    chapter: 'errors-files',
    track: 'beginner',
    estimatedMins: 15,
    summary: `How to read and write files safely with the with statement, which guarantees a file is closed even when an error occurs inside the block.`,
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
    references: [
      { label: 'Programiz — File I/O', url: 'https://www.programiz.com/python-programming/file-operation' },
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
    id: 'context-managers',
    title: 'Context Managers — with',
    chapter: 'errors-files',
    track: 'advanced',
    estimatedMins: 15,
    summary: `The __enter__ and __exit__ pair that every with statement calls, which interviewers ask about to see whether you can guarantee cleanup on the error path and not just the happy one.`,
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
    id: 'modules',
    title: 'Modules & Imports',
    chapter: 'errors-files',
    track: 'beginner',
    estimatedMins: 12,
    summary: `How Python files import code from the standard library, installed packages, or other files, and the pitfalls of wildcard imports and circular dependencies.`,
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
    references: [
      { label: 'Programiz — Python Modules', url: 'https://www.programiz.com/python-programming/modules' },
    ],
    edgeCases: [
      `from math import * imports everything and can cause name clashes with your own functions. Avoid it in production code.`,
      `Module names are case-sensitive on Linux and macOS. import Math fails even though the file is math.py.`,
      `Circular imports — module A imports B, B imports A — cause ImportError. Restructure to break the cycle.`,
    ],
    gotcha: `import module runs the entire module file on first import. Slow code at the top level of a module (database connections, file reads) runs every time any file imports it.`,
    tip: `Use import aliases to shorten long module names: import numpy as np, import pandas as pd. These are community conventions — follow them so your code looks familiar to other Python developers.`,
  },
];
