/**
 * Code execution service — sandboxed test runner for coding solutions.
 *
 * Supports: Python, JavaScript, Ruby.
 * Uses child_process.execFile (not exec) for sandboxed execution.
 * Timeout: 10 seconds per test case.
 *
 * Migrated from Python FastAPI — the `exec()` fallthrough from the Python
 * version is intentionally NOT ported (security issue).
 */
import { execFile } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { which } from '../utils/which.js';

const TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Runtime map: language -> base runtime
// ---------------------------------------------------------------------------

const RUNTIME_MAP = {
  // Python-based
  python: 'python', python2: 'python', python3: 'python',
  django: 'python', pyspark: 'python', pytorch: 'python',
  tensorflow: 'python', scipy: 'python',
  // JS/Node-based
  javascript: 'javascript', typescript: 'javascript',
  react: 'javascript', vue: 'javascript', angular: 'javascript',
  svelte: 'javascript', nextjs: 'javascript', nodejs: 'javascript',
  // Ruby
  ruby: 'ruby', rails: 'ruby',
};

const CMD_MAP = {
  python: 'python3',
  javascript: 'node',
  ruby: 'ruby',
};

const EXT_MAP = {
  python: '.py',
  javascript: '.js',
  ruby: '.rb',
};

// ---------------------------------------------------------------------------
// Runner builders — produce self-contained scripts that call user code
// ---------------------------------------------------------------------------

/**
 * Build a Python runner script.
 *
 * Strips any __main__ block, introspects the user's function, parses test
 * input, and prints the result.
 */
function buildPythonRunner(code, testInput) {
  const codeB64 = Buffer.from(code).toString('base64');
  const inputB64 = Buffer.from(testInput).toString('base64');

  const needsLinkedList = ['listnode', 'linked', '.next', '.val', 'head.next', 'current.next']
    .some(p => code.toLowerCase().includes(p));

  const llHelpers = needsLinkedList ? `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __repr__(self):
        vals, node = [], self
        while node:
            vals.append(str(node.val))
            node = node.next
        return "[" + ", ".join(vals) + "]"

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def arrayToList(arr):
    if not arr: return None
    head = ListNode(arr[0])
    cur = head
    for v in arr[1:]:
        cur.next = ListNode(v)
        cur = cur.next
    return head

def listToArray(head):
    r = []
    while head:
        r.append(head.val)
        head = head.next
    return r
` : '';

  // Strip __main__ block from user code
  const cleanCode = code.replace(/\n*if\s+__name__\s*==\s*['"]__main__['"]\s*:[\s\S]*/m, '');

  return `${llHelpers}
${cleanCode}

import ast, re, base64, inspect

def _parse_params(s, func):
    s = s.strip()
    if not s:
        return []
    try:
        sig = inspect.signature(func)
        param_names = [n for n, p in sig.parameters.items() if n != 'self']
    except:
        param_names = []
    if len(param_names) == 0:
        return []
    call_match = re.match(r'^[a-zA-Z_]\\w*\\((.*)\\)$', s, re.DOTALL)
    if call_match:
        s = call_match.group(1).strip()
        if not s:
            return []
    def _eval(val):
        val = val.strip()
        for old, new in [('true', 'True'), ('false', 'False'), ('null', 'None')]:
            if val == old:
                val = new
        try:
            return ast.literal_eval(val)
        except:
            return val
    if '=' in s and re.search(r'[a-zA-Z_]\\w*\\s*=', s):
        params_dict = {}
        depth = 0
        in_str = False
        str_char = None
        current = ''
        for ch in s + ',':
            if in_str:
                current += ch
                if ch == str_char and (len(current) < 2 or current[-2] != '\\\\'):
                    in_str = False
            elif ch in ('"', "'"):
                in_str = True
                str_char = ch
                current += ch
            elif ch in ('([{'):
                depth += 1
                current += ch
            elif ch in (')}]'):
                depth -= 1
                current += ch
            elif ch == ',' and depth == 0:
                current = current.strip()
                if '=' in current and re.match(r'[a-zA-Z_]', current):
                    key, val = current.split('=', 1)
                    params_dict[key.strip()] = _eval(val)
                current = ''
            else:
                current += ch
        if param_names and params_dict:
            params = []
            for name in param_names:
                if name in params_dict:
                    params.append(params_dict[name])
            if len(params) != len(params_dict):
                params = list(params_dict.values())
            return params
        return list(params_dict.values())
    try:
        result = ast.literal_eval(f'({s},)')
        params = list(result)
        if param_names and len(params) == 1 and len(param_names) > 1:
            if isinstance(params[0], (list, tuple)):
                pass
        return params
    except:
        pass
    return [_eval(s)]

def _find_target_func(user_code):
    if 'class Solution' in user_code:
        m = re.search(r'class Solution.*?def (?!__)(\w+)\\s*\\(\\s*self', user_code, re.DOTALL)
        if m:
            return 'solution_method', m.group(1)
    all_funcs = re.findall(r'^def (\\w+)\\s*\\(', user_code, re.MULTILINE)
    skip = {'__init__', '__str__', '__repr__', 'arrayToList', 'listToArray', 'toArray', 'toList', 'main'}
    main_funcs = [f for f in all_funcs if f not in skip and not f.startswith('_')]
    if main_funcs:
        return 'standalone', main_funcs[-1]
    main_funcs = [f for f in all_funcs if f not in skip and not f.startswith('__')]
    if main_funcs:
        return 'standalone', main_funcs[-1]
    return None, None

_input = base64.b64decode("${inputB64}").decode()
_user_code = base64.b64decode("${codeB64}").decode()
_has_ll = 'arrayToList' in dir()

_kind, _fn_name = _find_target_func(_user_code)

if _kind == 'solution_method':
    _sol = Solution()
    _method = getattr(_sol, _fn_name)
    try:
        _sig = inspect.signature(_method)
        _n_params = len([p for p in _sig.parameters.values() if p.name != 'self'])
    except:
        _n_params = 99
    if _n_params == 0:
        _params = []
    else:
        _params = _parse_params(_input, _method)
    if _has_ll:
        _params = [arrayToList(p) if isinstance(p, list) and _fn_name.lower().find('list') >= 0 else p for p in _params]
    _result = _method(*_params)
    if _has_ll and hasattr(_result, 'val'):
        _result = listToArray(_result)
    print(_result)
elif _kind == 'standalone':
    _func = globals()[_fn_name]
    try:
        _sig = inspect.signature(_func)
        _n_params = len([p for p in _sig.parameters.values() if p.name != 'self'])
    except:
        _n_params = 99
    if _n_params == 0:
        _params = []
    else:
        _params = _parse_params(_input, _func)
    if _has_ll:
        _params = [arrayToList(p) if isinstance(p, list) and _fn_name.lower().find('list') >= 0 else p for p in _params]
    _result = _func(*_params)
    if _has_ll and hasattr(_result, 'val'):
        _result = listToArray(_result)
    print(_result)
`;
}

/**
 * Build a JavaScript runner script.
 *
 * If user code already has console.log, run it as-is.
 * Otherwise, introspect for the main function and call it.
 */
function buildJavascriptRunner(code, testInput) {
  if (code.includes('console.log(')) {
    return code;
  }

  const codeB64 = Buffer.from(code).toString('base64');
  const inputB64 = Buffer.from(testInput).toString('base64');

  return `// User code
${code}

// Runner
const _input = Buffer.from("${inputB64}", 'base64').toString();
const _userCode = Buffer.from("${codeB64}", 'base64').toString();

function _parseParams(s) {
    const params = [];
    s = s.replace(/\\n\\s*(?=[a-zA-Z_])/g, ', ');
    if (s.includes('=')) {
        let current = '';
        let depth = 0;
        let inValue = false;
        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c === '=' && depth === 0) {
                inValue = true;
                current = '';
            } else if (c === '[') {
                depth++;
                if (inValue) current += c;
            } else if (c === ']') {
                depth--;
                if (inValue) current += c;
            } else if (c === ',' && depth === 0 && inValue) {
                try { params.push(JSON.parse(current.trim())); } catch { params.push(current.trim()); }
                inValue = false;
                current = '';
            } else if (inValue) {
                current += c;
            }
        }
        if (current.trim()) {
            try { params.push(JSON.parse(current.trim())); } catch { params.push(current.trim()); }
        }
    } else {
        try { return JSON.parse('[' + s + ']'); } catch { return [s]; }
    }
    return params;
}

const _funcMatch = _userCode.match(/function\\s+(\\w+)|(?:const|let|var)\\s+(\\w+)\\s*=/);
if (_funcMatch) {
    const _fnName = _funcMatch[1] || _funcMatch[2];
    const _fn = eval(_fnName);
    if (typeof _fn === 'function') {
        const _result = _fn(..._parseParams(_input));
        console.log(JSON.stringify(_result));
    }
}
`;
}

/**
 * Build a Ruby runner script.
 */
function buildRubyRunner(code, testInput) {
  const inputB64 = Buffer.from(testInput).toString('base64');
  const codeB64 = Buffer.from(code).toString('base64');

  return `${code}

require 'base64'
require 'json'

_input = Base64.decode64("${inputB64}")

def _parse_params(s)
  s = s.strip
  return [] if s.empty?
  if s.include?('=') && s.match?(/[a-zA-Z_]\\w*\\s*=/)
    params = []
    parts = []
    current = ''
    depth = 0
    (s + ',').each_char do |c|
      if c == '[' || c == '('
        depth += 1; current += c
      elsif c == ']' || c == ')'
        depth -= 1; current += c
      elsif c == ',' && depth == 0
        parts << current.strip; current = ''
      else
        current += c
      end
    end
    parts.each do |part|
      if part.include?('=')
        val = part.split('=', 2)[1].strip
        params << eval(val)
      end
    end
    params
  else
    [eval(s)]
  end
rescue
  [s]
end

_code_text = Base64.decode64("${codeB64}")
_methods = _code_text.scan(/^\\s*def\\s+(\\w+)/).flatten.reject { |m| m.start_with?('_') || m == 'initialize' }

if _code_text.include?('class Solution') || _code_text.include?('class solution')
  _sol = Solution.new
  _m = _methods.reject { |m| m == 'initialize' }.last
  if _m
    _params = _parse_params(_input)
    _result = _sol.send(_m, *_params)
    puts _result.is_a?(Array) || _result.is_a?(Hash) ? _result.to_json : _result.inspect
  end
elsif _methods.any?
  _params = _parse_params(_input)
  _result = send(_methods.last, *_params)
  puts _result.is_a?(Array) || _result.is_a?(Hash) ? _result.to_json : _result.inspect
end
`;
}

// ---------------------------------------------------------------------------
// Runner config
// ---------------------------------------------------------------------------

const BUILDERS = {
  python: buildPythonRunner,
  javascript: buildJavascriptRunner,
  ruby: buildRubyRunner,
};

// ---------------------------------------------------------------------------
// Core execution function
// ---------------------------------------------------------------------------

/**
 * Execute code in a temp file using child_process.execFile.
 *
 * Returns a promise that resolves with { stdout, stderr, exitCode }.
 */
function runInSandbox(cmd, filePath, stdinData) {
  return new Promise((resolve) => {
    const child = execFile(cmd, [filePath], {
      timeout: TIMEOUT_MS,
      cwd: tmpdir(),
      maxBuffer: 1024 * 1024, // 1 MB
      env: { ...process.env, PATH: process.env.PATH },
    }, (error, stdout, stderr) => {
      if (error?.killed) {
        resolve({ stdout: '', stderr: 'Execution timed out (10s limit)', exitCode: 1 });
      } else {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? error.code || 1 : 0,
        });
      }
    });

    // Pipe stdin if needed
    if (stdinData && child.stdin) {
      child.stdin.write(stdinData);
      child.stdin.end();
    }
  });
}

/**
 * Normalize output for comparison: strip whitespace, try JSON/literal parse.
 */
function normalizeValue(s) {
  s = s.trim();
  if (!s) return s;

  // Try JSON parse
  try { return JSON.parse(s); } catch { /* continue */ }

  // Boolean / null normalization
  if (s === 'True' || s === 'true') return true;
  if (s === 'False' || s === 'false') return false;
  if (s === 'None' || s === 'null') return null;

  // Number
  const num = Number(s);
  if (!isNaN(num) && s !== '') return num;

  return s;
}

/**
 * Compare expected vs actual output with fuzzy matching.
 */
function compareOutput(expected, actual) {
  const expVal = normalizeValue(expected);
  const actVal = normalizeValue(actual);

  // Strict equality
  if (JSON.stringify(expVal) === JSON.stringify(actVal)) return true;

  // Order-insensitive array comparison
  if (Array.isArray(expVal) && Array.isArray(actVal)) {
    if (expVal.length === actVal.length) {
      const eSorted = [...expVal].map(String).sort();
      const aSorted = [...actVal].map(String).sort();
      if (JSON.stringify(eSorted) === JSON.stringify(aSorted)) return true;
    }
  }

  // String fallback
  return expected.trim() === actual.trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute user code against test cases.
 *
 * @param {string} code       - The user's code
 * @param {string} language   - Target language (e.g. "python", "javascript", "ruby")
 * @param {Array}  testCases  - Array of { input, expected }
 * @returns {{ results: Array, all_passed: boolean, direct_output?: string }}
 */
export async function executeCode(code, language, testCases = []) {
  const lang = language.toLowerCase();
  const runtime = RUNTIME_MAP[lang];

  if (!runtime) {
    throw new Error(
      `Code execution for '${language}' is not available on the server. ` +
      `Solution generation works for all languages, but execution requires a local runtime.`,
    );
  }

  const cmd = CMD_MAP[runtime];
  if (!cmd) {
    throw new Error(`No command configured for runtime: ${runtime}`);
  }

  // Check that the binary exists
  const binaryPath = await which(cmd);
  if (!binaryPath) {
    throw new Error(`Runtime '${cmd}' not found on server`);
  }

  const ext = EXT_MAP[runtime] || '.txt';
  const builder = BUILDERS[runtime];

  // No test cases -> direct execution
  const validTestCases = testCases.filter(tc => tc.input?.trim());

  if (validTestCases.length === 0) {
    const tmpPath = join(tmpdir(), `lumora-${randomUUID()}${ext}`);
    try {
      await writeFile(tmpPath, code, 'utf8');
      const { stdout, stderr, exitCode } = await runInSandbox(cmd, tmpPath);

      if (exitCode !== 0) {
        return { direct_output: stderr ? `Error:\n${stderr}` : 'Execution failed' };
      }
      const fullOutput = stderr ? `${stdout}\n[stderr]: ${stderr}` : stdout;
      return { direct_output: fullOutput.trim() || '(no output)' };
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  // With test cases -> run each through the builder
  if (!builder) {
    throw new Error(`Test runner not available for ${runtime}. Direct execution only.`);
  }

  const results = [];

  for (const tc of validTestCases) {
    const tmpPath = join(tmpdir(), `lumora-${randomUUID()}${ext}`);
    try {
      const runnerCode = builder(code, tc.input);
      await writeFile(tmpPath, runnerCode, 'utf8');

      const { stdout, stderr, exitCode } = await runInSandbox(cmd, tmpPath, tc.input);
      const output = stdout.trim();
      let error = null;

      if (exitCode !== 0) {
        error = stderr?.slice(0, 500) || 'Execution failed';
      } else if (stderr && !output) {
        error = stderr.slice(0, 500);
      }

      const passed = !error && !!output && compareOutput(tc.expected, output);

      results.push({
        input: tc.input,
        expected: tc.expected,
        output: output || error || '(no output)',
        passed,
        error: passed ? null : error,
      });
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }

  return {
    results,
    all_passed: results.every(r => r.passed),
  };
}
