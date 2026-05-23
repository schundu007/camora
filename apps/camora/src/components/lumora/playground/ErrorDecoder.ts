// apps/camora/src/components/lumora/playground/ErrorDecoder.ts

interface ErrorRule {
  pattern: RegExp;
  explain: (m: RegExpMatchArray) => string;
}

const RULES: ErrorRule[] = [
  {
    pattern: /NameError: name '(.+?)' is not defined/,
    explain: m => `'${m[1]}' has not been assigned yet. Check for a typo or make sure you defined it before using it.`,
  },
  {
    pattern: /TypeError: unsupported operand type\(s\) for (.+?): '(.+?)' and '(.+?)'/,
    explain: m => `You tried to use '${m[1]}' on a ${m[2]} and a ${m[3]}. Convert one of them to the same type first (e.g. int(), str(), float()).`,
  },
  {
    pattern: /TypeError: '(.+?)' object is not subscriptable/,
    explain: m => `${m[1]} doesn't support indexing with []. You may be trying to index a number or None instead of a list/dict.`,
  },
  {
    pattern: /TypeError: '(.+?)' object is not iterable/,
    explain: m => `You're trying to loop over a ${m[1]}, which isn't iterable. Use a list, tuple, or generator instead.`,
  },
  {
    pattern: /TypeError: (.+?) takes (\d+) positional argument.? but (\d+) .+? given/,
    explain: m => `${m[1]} expects ${m[2]} argument(s) but got ${m[3]}. Check the number of arguments in your function call.`,
  },
  {
    pattern: /IndexError: list index out of range/,
    explain: () => `You're accessing an index that doesn't exist. Remember lists are 0-indexed — if your list has N items, valid indices are 0 to N-1.`,
  },
  {
    pattern: /KeyError: (.+)/,
    explain: m => `Key ${m[1]} doesn't exist in the dictionary. Use .get(key) to return None instead of raising an error, or check with 'if key in d' first.`,
  },
  {
    pattern: /AttributeError: '(.+?)' object has no attribute '(.+?)'/,
    explain: m => `${m[1]} objects don't have a '${m[2]}' attribute. Check the spelling or look up what methods ${m[1]} actually has.`,
  },
  {
    pattern: /ZeroDivisionError/,
    explain: () => `Division by zero. Add a guard: 'if divisor != 0' before dividing.`,
  },
  {
    pattern: /RecursionError: maximum recursion depth exceeded/,
    explain: () => `Your function calls itself too many times without a base case. Make sure your recursive function has a condition that stops the recursion.`,
  },
  {
    pattern: /IndentationError: (.+)/,
    explain: m => `Python cares about indentation — ${m[1]}. Use 4 spaces per indent level and never mix tabs and spaces.`,
  },
  {
    pattern: /SyntaxError: (.+)/,
    explain: m => `Python can't parse your code — ${m[1]}. Look for a missing colon, parenthesis, or quote near the line shown.`,
  },
  {
    pattern: /ImportError: cannot import name '(.+?)' from '(.+?)'/,
    explain: m => `'${m[1]}' doesn't exist in '${m[2]}'. Check the spelling and the library's documentation.`,
  },
  {
    pattern: /ModuleNotFoundError: No module named '(.+?)'/,
    explain: m => `The '${m[1]}' module is not installed in this environment. You can only import the Python standard library here.`,
  },
  {
    pattern: /ValueError: (.+)/,
    explain: m => `${m[1]}. You passed a value that the function can't handle — check the input you're providing.`,
  },
  {
    pattern: /FileNotFoundError: .+? '(.+?)'/,
    explain: m => `File '${m[1]}' doesn't exist at that path. The playground runs in a temporary directory — only files you write in your script are accessible.`,
  },
  {
    pattern: /StopIteration/,
    explain: () => `next() was called on an exhausted iterator. You've consumed all items — create a new iterator or use a for loop.`,
  },
  {
    pattern: /OverflowError/,
    explain: () => `A calculation produced a number too large for Python to represent. Consider using integer math or checking for unbounded growth in your algorithm.`,
  },
  {
    pattern: /MemoryError/,
    explain: () => `Your code ran out of memory. You may be creating a very large list or infinite structure. Add size limits to your collections.`,
  },
  {
    pattern: /TimeoutError|signal\.alarm/,
    explain: () => `Execution timed out (10s limit). Your code may have an infinite loop or a very slow algorithm. Check your loop conditions.`,
  },
];

/**
 * Returns a plain-English explanation of the first recognised Python exception
 * in stderr, or null if none matched.
 */
export function decodeError(stderr: string): string | null {
  for (const rule of RULES) {
    const m = stderr.match(rule.pattern);
    if (m) return rule.explain(m);
  }
  return null;
}
