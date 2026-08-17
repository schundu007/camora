/**
 * Code execution service — sandboxed runner for 30+ languages.
 *
 * Supports interpreted, compiled, and special-case languages.
 * Uses child_process.execFile (not exec) for sandboxed execution.
 * Timeout: 20s per run, 20s for compilation.
 */
import { execFile } from 'node:child_process';
import { writeFile, unlink, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { which } from '../utils/which.js';

const TIMEOUT_MS = 20_000;
const COMPILE_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Language → runtime mapping
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
  coffeescript: 'javascript',
  // Ruby
  ruby: 'ruby', rails: 'ruby',
  // Compiled
  java: 'java', spring: 'java',
  c: 'c',
  cpp: 'cpp',
  go: 'go',
  rust: 'rust',
  // Interpreted
  php: 'php',
  bash: 'bash',
  perl: 'perl',
  lua: 'lua',
  // Note: csharp, objective-c, swift, kotlin, scala, r, haskell, elixir,
  // erlang, ocaml, dart, julia, tcl, clojure, fsharp, vb were dropped from
  // the runtime image to reduce backend Docker size from 1.4 GB to ~700 MB.
  // The Sona model still GENERATES code in those languages (free with the
  // LLM); only the in-app "Run" button is unavailable for them.
};

// ---------------------------------------------------------------------------
// Execution configs by type
// ---------------------------------------------------------------------------

// Interpreted: execFile(cmd, [filePath])
// Trimmed set — see normalize-aliases comment above for what was dropped.
const INTERPRETED = {
  python:     { cmd: 'python3',  ext: '.py' },
  javascript: { cmd: 'node',     ext: '.js' },
  ruby:       { cmd: 'ruby',     ext: '.rb' },
  php:        { cmd: 'php',      ext: '.php' },
  perl:       { cmd: 'perl',     ext: '.pl' },
  lua:        { cmd: 'lua',      ext: '.lua' },
  bash:       { cmd: 'bash',     ext: '.sh' },
};

// Subcommand: execFile(cmd, [subcmd, filePath])
const SUBCOMMAND = {
  go: { cmd: 'go', subcmd: 'run', ext: '.go' },
};

// Compiled: compile first, then run the binary
const COMPILED = {
  c:    { compiler: 'gcc',   ext: '.c',  args: (s, o) => [s, '-o', o, '-lm'] },
  cpp:  { compiler: 'g++',   ext: '.cpp', args: (s, o) => [s, '-o', o, '-lm'] },
  rust: { compiler: 'rustc', ext: '.rs', args: (s, o) => [s, '-o', o] },
};

// Java needs class name matching
const JAVA_EXT = '.java';

// ---------------------------------------------------------------------------
// General command runner
// ---------------------------------------------------------------------------

function runCommand(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      timeout: opts.timeout || TIMEOUT_MS,
      cwd: opts.cwd || tmpdir(),
      maxBuffer: 1024 * 1024,
      env: { ...process.env, PATH: process.env.PATH },
    }, (error, stdout, stderr) => {
      if (error?.killed) {
        resolve({ stdout: '', stderr: 'Execution timed out (20s limit)', exitCode: 1 });
      } else {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? error.code || 1 : 0,
        });
      }
    });
    if (child.stdin) {
      if (opts.stdin) child.stdin.write(opts.stdin);
      child.stdin.end(); // always close — prevents input()/readline() from blocking forever
    }
  });
}

// Keep legacy runInSandbox for test case builders
function runInSandbox(cmd, filePath, stdinData) {
  return runCommand(cmd, [filePath], { stdin: stdinData });
}

// ---------------------------------------------------------------------------
// Direct execution — no test cases
// ---------------------------------------------------------------------------

/**
 * When stdout is empty AND the code contains function/class definitions
 * but no print / call at the top level, "(no output)" is technically
 * correct but unhelpful — users tend to read it as "my code is broken."
 * Return a friendlier hint pointing them at the Test Cases tab or
 * inline print() instead.
 */
function emptyOutputHint(code, runtime) {
  const trimmed = String(code || '').trim();
  if (!trimmed) return '(empty file — nothing to run)';

  const definesFn = /(^|\n)\s*(def\s+\w+|function\s+\w+|class\s+\w+|fn\s+\w+|func\s+\w+|public\s+\w+|sub\s+\w+)/i.test(trimmed);
  const printCalls = {
    python:     /\bprint\s*\(/,
    javascript: /(console\.(log|info|warn|error)|process\.stdout\.write)\s*\(/,
    ruby:       /\b(puts|print|p)\s+/,
    php:        /\b(echo|print_r?|var_dump)\s*\(/,
    perl:       /\b(print|say|warn)\b/,
    lua:        /\bprint\s*\(/,
    bash:       /\b(echo|printf)\b/,
    java:       /System\.out\.print/,
    c:          /\b(printf|puts|fputs)\b/,
    cpp:        /\b(printf|puts|std::cout|cout\s*<<)/,
    rust:       /\bprintln!\s*\(/,
    go:         /\bfmt\.(Print|Println|Printf)\s*\(/,
  };
  const printRe = printCalls[runtime];
  const hasPrint = printRe ? printRe.test(trimmed) : false;

  if (definesFn && !hasPrint) {
    return '(no output) — your code only defines a function. Add a test case in the "Test Cases" tab to call it, or include a print/console.log in the code itself.';
  }
  return '(no output)';
}

async function directExecute(code, runtime, stdin = null) {
  const id = randomUUID();
  const tmpBase = join(tmpdir(), `lumora-${id}`);

  // ── Interpreted languages ──
  if (INTERPRETED[runtime]) {
    const { cmd, ext } = INTERPRETED[runtime];
    const srcPath = `${tmpBase}${ext}`;
    const tmpDir  = join(tmpdir(), `lumora-nm-${id}`); // node_modules dir for JS
    await writeFile(srcPath, code, 'utf8');
    try {
      const bin = await which(cmd);
      if (!bin) throw new Error(`Runtime '${cmd}' not found on server`);
      let runOpts = stdin != null ? { stdin } : {};
      let result = await runCommand(cmd, [srcPath], runOpts);
      // Auto-install missing packages and retry (up to 5 different imports)
      for (let attempt = 0; attempt < 5 && result.exitCode !== 0; attempt++) {
        if (runtime === 'python') {
          const mod = missingModule(result.stderr);
          if (!mod) break;
          const ok = await pipInstall(mod);
          if (!ok) break;
        } else if (runtime === 'javascript') {
          const mod = missingNodeModule(result.stderr);
          if (!mod) break;
          await mkdir(tmpDir, { recursive: true });
          const ok = await npmInstall(mod, tmpDir);
          if (!ok) break;
          runOpts = { ...runOpts, env: { ...process.env, NODE_PATH: join(tmpDir, 'node_modules') } };
        } else {
          break;
        }
        result = await runCommand(cmd, [srcPath], runOpts);
      }
      if (result.exitCode !== 0) {
        const err = result.stderr || '';
        if (stdin == null && (err.includes('EOFError') || err.includes('NoSuchElementException') || err.includes('End of input'))) {
          return { direct_output: '(no stdin input) — this code reads from stdin. Add test cases in the Test Cases tab to run with input.' };
        }
        return { direct_output: err ? `Error:\n${err}` : 'Execution failed' };
      }
      const out = result.stderr ? `${result.stdout}\n[stderr]: ${result.stderr}` : result.stdout;
      return { direct_output: out.trim() || emptyOutputHint(code, runtime) };
    } finally {
      await unlink(srcPath).catch(() => {});
      await rm(tmpDir, { recursive: true }).catch(() => {});
    }
  }

  // ── Subcommand languages (go run, dart run, kotlinc -script) ──
  if (SUBCOMMAND[runtime]) {
    const { cmd, subcmd, ext } = SUBCOMMAND[runtime];
    const srcPath = `${tmpBase}${ext}`;
    await writeFile(srcPath, code, 'utf8');
    try {
      const bin = await which(cmd);
      if (!bin) throw new Error(`Runtime '${cmd}' not found on server`);
      const args = subcmd ? [subcmd, srcPath] : [srcPath];
      const { stdout, stderr, exitCode } = await runCommand(cmd, args, { timeout: COMPILE_TIMEOUT_MS, stdin });
      if (exitCode !== 0) return { direct_output: stderr ? `Error:\n${stderr}` : 'Execution failed' };
      const out = stderr ? `${stdout}\n[stderr]: ${stderr}` : stdout;
      return { direct_output: out.trim() || emptyOutputHint(code, runtime) };
    } finally {
      await unlink(srcPath).catch(() => {});
    }
  }

  // ── Compiled languages (C, C++, Rust, Objective-C) ──
  if (COMPILED[runtime]) {
    const { compiler, ext, args: makeArgs } = COMPILED[runtime];
    const srcPath = `${tmpBase}${ext}`;
    const binPath = tmpBase;
    await writeFile(srcPath, code, 'utf8');
    try {
      const bin = await which(compiler);
      if (!bin) throw new Error(`Compiler '${compiler}' not found on server`);
      const compile = await runCommand(compiler, makeArgs(srcPath, binPath), { timeout: COMPILE_TIMEOUT_MS });
      if (compile.exitCode !== 0) return { direct_output: `Compilation Error:\n${compile.stderr}` };
      const { stdout, stderr, exitCode } = await runCommand(binPath, [], { stdin });
      if (exitCode !== 0) return { direct_output: stderr ? `Runtime Error:\n${stderr}` : 'Execution failed' };
      const out = stderr ? `${stdout}\n[stderr]: ${stderr}` : stdout;
      return { direct_output: out.trim() || emptyOutputHint(code, runtime) };
    } finally {
      await unlink(srcPath).catch(() => {});
      await unlink(binPath).catch(() => {});
    }
  }

  // ── Java (class name must match filename) ──
  if (runtime === 'java') {
    const classMatch = code.match(/(?:public\s+)?class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : 'Main';
    const srcDir = join(tmpdir(), `lumora-java-${id}`);
    const srcPath = join(srcDir, `${className}.java`);
    await mkdir(srcDir, { recursive: true });
    await writeFile(srcPath, code, 'utf8');
    try {
      const javac = await which('javac');
      if (!javac) throw new Error("Runtime 'javac' not found on server");
      const compile = await runCommand('javac', [srcPath], { timeout: COMPILE_TIMEOUT_MS });
      if (compile.exitCode !== 0) return { direct_output: `Compilation Error:\n${compile.stderr}` };
      const { stdout, stderr, exitCode } = await runCommand('java', ['-cp', srcDir, className], { stdin });
      if (exitCode !== 0) return { direct_output: stderr ? `Runtime Error:\n${stderr}` : 'Execution failed' };
      const out = stderr ? `${stdout}\n[stderr]: ${stderr}` : stdout;
      return { direct_output: out.trim() || emptyOutputHint(code, runtime) };
    } finally {
      await rm(srcDir, { recursive: true }).catch(() => {});
    }
  }

  // C# / Mono branch removed — Mono runtime dropped from the Docker
  // image to slim the build (~300 MB savings). The model still GENERATES
  // C# code; only in-app execution is unavailable.

  throw new Error(`Language not supported for execution on the server: ${runtime}. Generation works fine; only the Run button is disabled for this language.`);
}

// ---------------------------------------------------------------------------
// Test case runner builders (Python, JS, Ruby)
// ---------------------------------------------------------------------------

/**
 * Drop module-level print() statements from a call-and-return solution.
 *
 * Models like to append a demo driver:
 *
 *     print(Solution().trap([0,1,0,2,1,0,1,3,2,1,2,1]))
 *     print(Solution().trap([4,2,0,3,2,5]))
 *
 * Those run at module level, so their output lands in the captured stdout BEFORE
 * the harness prints the test-case result: every case then compares "6\n9\n6"
 * against "6" and fails, which reads as the first two test cases being hardcoded.
 *
 * Safe here because the stdin/print model returns verbatim earlier in
 * buildPythonRunner — reaching this point means the harness supplies the only
 * print we want to compare, so a module-level print is noise by definition.
 *
 * Line-based with a paren-balance check, so a print() spanning several lines is
 * removed whole rather than cut in half.
 */
export function stripModuleLevelPrints(code) {
  const lines = String(code).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    // Column 0 only: an indented print belongs to a function body and may well be
    // the solution's actual job.
    if (!/^print\s*\(/.test(lines[i])) { out.push(lines[i]); continue; }

    let depth = 0;
    let j = i;
    for (; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      if (depth <= 0) break;
    }
    if (depth <= 0) {
      i = j;              // balanced print(...) — drop lines i..j
    } else {
      // Never closed. Keep it: a syntax error naming the stray line beats a
      // silently truncated program.
      out.push(...lines.slice(i));
      i = lines.length;
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function buildPythonRunner(code, testInput) {
  const codeB64 = Buffer.from(code).toString('base64');
  const inputB64 = Buffer.from(testInput).toString('base64');

  // Stdin/print passthrough — mirror buildJavascriptRunner's `console.log`
  // short-circuit. If the solution reads stdin AND prints, it targets the
  // HackerRank stdin/print model, not the LeetCode call-and-return model.
  // Run it VERBATIM so runInSandbox pipes the test input to stdin and we
  // compare its stdout. Wrapping+calling such code instead would discard its
  // printed output, print its `None` return, and double-execute it (the
  // module-level self-call plus the harness call) — the exact cause of the
  // "correct Out but IndexError/FAILED" symptom.
  // Only pass through when the code actually EXECUTES at module level — either a
  // top-level input()/print() or a top-level call (e.g. `solve()`). If the
  // stdin/print logic lives only inside an uncalled `def`, running verbatim would
  // define but never invoke it → "(no output)". In that case fall through to the
  // harness, which detects the entry function and calls it (feeding stdin).
  const readsStdin = /\b(?:sys\.stdin|input\s*\()/.test(code);
  const printsOut = /\bprint\s*\(/.test(code);
  const moduleLevelIO = /^\S[^\n]*\b(?:input|print)\s*\(/m.test(code);
  const moduleLevelCall = /^(?!def\b|class\b|if\b|elif\b|else\b|for\b|while\b|with\b|try\b|except\b|finally\b|return\b|import\b|from\b|@)[A-Za-z_]\w*\s*\(/m.test(code);
  if (readsStdin && printsOut && (moduleLevelIO || moduleLevelCall) && !/class\s+Solution\b/.test(code)) {
    return code;
  }

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

  let cleanCode = code.replace(/\n*if\s+__name__\s*==\s*['"]__main__['"]\s*:[\s\S]*/m, '');
  // Also drop a trailing module-level bare call of a defined function (a footer
  // like `solve()` / `main()`), so wrapping in the call-model doesn't execute
  // the solution twice — once via the footer, once via `_func(*_params)`.
  cleanCode = cleanCode.replace(
    /\n[ \t]*([a-zA-Z_]\w*)\s*\([^\n]*\)\s*$/,
    (m, name) => (new RegExp(`\\bdef\\s+${name}\\s*\\(`).test(cleanCode) ? '' : m),
  );
  // The footer rule above only catches a trailing call to a DEFINED function, so
  // `print(Solution().trap([...]))` slipped through: `print` is not one of ours.
  cleanCode = stripModuleLevelPrints(cleanCode);

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
    # Peel call wrappers down to the argument list. buildTestCases emits a
    # complete runnable statement, so a LeetCode class problem arrives as
    # print(Solution().trap([0,1,0,...])) — two wrappers deep, with a receiver in
    # the middle. The old single-level regex stripped only print(...) and handed
    # "Solution().trap([0,1,...])" to the method as its FIRST ARGUMENT, so every
    # test case died on a str where a list was expected.
    for _peel in range(3):
        call_match = re.match(r'^(?:[A-Za-z_]\\w*\\s*\\(\\s*\\)\\s*\\.)?[A-Za-z_]\\w*\\s*\\((.*)\\)$', s, re.DOTALL)
        if not call_match:
            break
        inner = call_match.group(1).strip()
        if not inner:
            return []
        s = inner
        # Stop as soon as what is left is actually a value (or a value list).
        try:
            ast.literal_eval(s)
            break
        except Exception:
            try:
                ast.literal_eval('(' + s + ',)')
                break
            except Exception:
                continue
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
    # Fallback: whitespace/newline-separated values when the function
    # takes multiple params. Handles common interview-stdin formats:
    #   "5 3"      → [5, 3]
    #   "5\\n3"     → [5, 3]
    #   "hello world" with 2 string params → ['hello', 'world']
    # Without this, "5 3" parses as the single string "5 3" and the
    # call becomes add(s="5 3") — missing positional argument.
    if param_names and len(param_names) > 1:
        parts = re.split(r'[\\s,]+', s.strip())
        parts = [p for p in parts if p]
        if len(parts) == len(param_names):
            return [_eval(p) for p in parts]
        # Pad/truncate gracefully — fewer parts than params means the
        # final ones default to None; extra parts collapse into the last
        # via _eval so e.g. variadic helpers still work.
        if len(parts) > len(param_names):
            head = [_eval(p) for p in parts[:len(param_names) - 1]]
            tail = ' '.join(parts[len(param_names) - 1:])
            return head + [_eval(tail)]
    return [_eval(s)]

def _find_target_func(user_code):
    if 'class Solution' in user_code:
        m = re.search(r'class Solution.*?def (?!__)(\\w+)\\s*\\(\\s*self', user_code, re.DOTALL)
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
    # No standalone function — look for a custom class with a public method that
    # takes arguments (self, ...). Scan classes LAST-first so the named solution
    # class (e.g. DevImageBuilder) wins over dataclass helpers (Layer, Job).
    for _cn in reversed(re.findall(r'^class (\\w+)', user_code, re.MULTILINE)):
        _mm = re.search(r'class ' + _cn + r'\\b[\\s\\S]*?\\n\\s+def (?!__)(\\w+)\\s*\\(\\s*self\\s*,', user_code)
        if _mm:
            return 'class_method', _cn + '.' + _mm.group(1)
    return None, None

_input = base64.b64decode("${inputB64}").decode()
_user_code = base64.b64decode("${codeB64}").decode()
_has_ll = 'arrayToList' in dir()

_kind, _fn_name = _find_target_func(_user_code)

import json as _json_mod

def _try_simulation():
    lines = [l.strip() for l in _input.strip().splitlines() if l.strip()]
    if not lines:
        return False
    try:
        if len(lines) >= 2:
            _ops_s = _json_mod.loads(lines[0])
            _args_s = _json_mod.loads(lines[1])
        elif len(lines) == 1:
            _parsed = _json_mod.loads(lines[0])
            if (isinstance(_parsed, list) and len(_parsed) == 2 and
                    isinstance(_parsed[0], list) and isinstance(_parsed[1], list)):
                _ops_s, _args_s = _parsed[0], _parsed[1]
            else:
                return False
        else:
            return False
        if not (isinstance(_ops_s, list) and len(_ops_s) > 0 and
                all(isinstance(o, str) for o in _ops_s)):
            return False
        if not (isinstance(_args_s, list) and all(isinstance(a, list) for a in _args_s)):
            return False
        _cls_name = _ops_s[0]
        _cls = globals().get(_cls_name)
        if not (_cls and callable(_cls)):
            return False
        _obj = None
        _results = []
        for _op, _arg in zip(_ops_s, _args_s):
            if _obj is None:
                _obj = _cls(*_arg)
                _results.append(None)
            else:
                _r = getattr(_obj, _op)(*_arg)
                _results.append(_r)
        print(_json_mod.dumps(_results))
        return True
    except Exception:
        return False

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
    if _result is not None:
        print(_result)
elif _kind == 'class_method':
    _cn, _mn = _fn_name.split('.', 1)
    _cls = globals().get(_cn)
    _obj = _cls()
    _method = getattr(_obj, _mn)
    try:
        _sig = inspect.signature(_method)
        _n_params = len([p for p in _sig.parameters.values() if p.name != 'self'])
    except:
        _n_params = 99
    _params = [] if _n_params == 0 else _parse_params(_input, _method)
    _result = _method(*_params)
    if _result is not None:
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
    if _result is not None:
        print(_result)
else:
    _try_simulation()
`;
}

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

let _done = false;
const _funcMatch = _userCode.match(/function\\s+(\\w+)|(?:const|let|var)\\s+(\\w+)\\s*=\\s*(?:function|\\(|async)/);
if (_funcMatch) {
    const _fnName = _funcMatch[1] || _funcMatch[2];
    try {
        const _fn = eval(_fnName);
        if (typeof _fn === 'function') {
            const _result = _fn(..._parseParams(_input));
            console.log(JSON.stringify(_result));
            _done = true;
        }
    } catch (_e) {}
}
if (!_done) {
    // Custom-class solution (e.g. class DevImageBuilder { findBuildSchedule(a,b){} }).
    // Scan classes LAST-first so the solution class wins over helper classes;
    // instantiate and call its last public method that takes args.
    const _classNames = [..._userCode.matchAll(/class\\s+(\\w+)/g)].map(m => m[1]).reverse();
    for (const _cn of _classNames) {
        try {
            const _Cls = eval(_cn);
            if (typeof _Cls !== 'function') continue;
            const _proto = _Cls.prototype;
            const _methods = Object.getOwnPropertyNames(_proto)
                .filter(n => n !== 'constructor' && typeof _proto[n] === 'function' && _proto[n].length >= 1);
            if (!_methods.length) continue;
            const _obj = new _Cls();
            const _result = _obj[_methods[_methods.length - 1]](..._parseParams(_input));
            console.log(JSON.stringify(_result));
            _done = true;
            break;
        } catch (_e) {}
    }
}
if (!_done) {
    try {
        const _lines = _input.trim().split('\\n').filter(l => l.trim());
        let _ops, _simArgs;
        if (_lines.length >= 2) {
            _ops = JSON.parse(_lines[0]);
            _simArgs = JSON.parse(_lines[1]);
        } else if (_lines.length === 1) {
            const _parsed = JSON.parse(_lines[0]);
            if (Array.isArray(_parsed) && _parsed.length === 2 && Array.isArray(_parsed[0]) && Array.isArray(_parsed[1])) {
                _ops = _parsed[0]; _simArgs = _parsed[1];
            }
        }
        if (Array.isArray(_ops) && _ops.every(o => typeof o === 'string') &&
            Array.isArray(_simArgs) && _simArgs.every(a => Array.isArray(a))) {
            const _Cls = eval(_ops[0]);
            if (typeof _Cls === 'function') {
                let _obj = null;
                const _results = [];
                for (let _i = 0; _i < _ops.length; _i++) {
                    if (_obj === null) { _obj = new _Cls(..._simArgs[_i]); _results.push(null); }
                    else { const _r = _obj[_ops[_i]](..._simArgs[_i]); _results.push(_r !== undefined ? _r : null); }
                }
                console.log(JSON.stringify(_results));
            }
        }
    } catch (_e) {}
}
`;
}

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
else
  begin
    _sim_lines = _input.strip.split("\\n").reject { |l| l.strip.empty? }
    _sim_ops = _sim_args_s = nil
    if _sim_lines.length >= 2
      _sim_ops = JSON.parse(_sim_lines[0])
      _sim_args_s = JSON.parse(_sim_lines[1])
    elsif _sim_lines.length == 1
      _sim_parsed = JSON.parse(_sim_lines[0])
      if _sim_parsed.is_a?(Array) && _sim_parsed.length == 2 && _sim_parsed[0].is_a?(Array) && _sim_parsed[1].is_a?(Array)
        _sim_ops, _sim_args_s = _sim_parsed
      end
    end
    if _sim_ops.is_a?(Array) && _sim_ops.all? { |o| o.is_a?(String) } &&
       _sim_args_s.is_a?(Array) && _sim_args_s.all? { |a| a.is_a?(Array) }
      _sim_cls = Object.const_get(_sim_ops[0]) rescue nil
      if _sim_cls
        _sim_obj = nil
        _sim_results = []
        _sim_ops.zip(_sim_args_s).each do |_op, _arg|
          if _sim_obj.nil?
            _sim_obj = _sim_cls.new(*_arg)
            _sim_results << nil
          else
            _sim_r = _sim_obj.send(_op, *_arg)
            _sim_results << _sim_r
          end
        end
        puts _sim_results.to_json
      end
    end
  rescue => _sim_e
  end
end
`;
}

function buildBashRunner(code, testInput) {
  // Detect the first user-defined function (the entry point)
  const fnMatch = code.match(/^([a-zA-Z_]\w*)\s*\(\s*\)\s*\{/m) ||
                  code.match(/^function\s+([a-zA-Z_]\w*)\b/m);
  const fnName = fnMatch?.[1] ?? null;

  // Strip "varname = " prefix to get raw values
  const argValues = testInput
    .trim()
    .split('\n')
    .map(l => {
      const eq = l.indexOf('=');
      return (eq >= 0 ? l.slice(eq + 1) : l).trim();
    })
    .filter(Boolean);

  const quotedArgs = argValues.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ');

  // set positional params, paste code, then call the detected entry function
  let runner = `#!/bin/bash\nset -- ${quotedArgs}\n${code}`;
  if (fnName) {
    runner += `\n${fnName} "$@"`;
  }
  return runner;
}

// Java test-case runner. Java is statically typed and compiled, so we can't
// just append a call. Strip `public` from the user's types (so our own public
// __Main can live in the same file), then a reflection driver finds the solution
// class (custom class or Solution), picks its public arg-taking method, marshals
// the parsed test input into the method's real parameter types, calls it, and
// prints the return value in a stable form. Quote chars use numeric codes (34/39)
// to avoid JS-template escaping bugs.
function buildJavaRunner(code, testInput) {
  const userCode = code.replace(/\bpublic\s+(?=(?:final\s+|abstract\s+)*(?:class|interface|enum|record)\b)/g, '');
  const classNames = [...code.matchAll(/\bclass\s+([A-Za-z_]\w*)/g)].map(m => m[1]).reverse();
  const namesArr = classNames.map(n => JSON.stringify(n)).join(', ');
  const inputB64 = Buffer.from(testInput).toString('base64');
  return `import java.util.*;
import java.lang.reflect.*;

${userCode}

public class __Main {
  static String[] __names = new String[]{${namesArr}};
  public static void main(String[] __a) throws Throwable {
    String in = new String(Base64.getDecoder().decode("${inputB64}"));
    for (String cn : __names) {
      Class<?> cls; try { cls = Class.forName(cn); } catch (Throwable t) { continue; }
      Method m = pick(cls); if (m == null) continue;
      Object obj; try { Constructor<?> c = cls.getDeclaredConstructor(); c.setAccessible(true); obj = c.newInstance(); } catch (Throwable t) { continue; }
      Class<?>[] pt = m.getParameterTypes();
      String[] parts = split(in);
      Object[] call = new Object[pt.length];
      for (int i = 0; i < pt.length; i++) call[i] = parse(i < parts.length ? parts[i] : "", pt[i]);
      m.setAccessible(true);
      Object r = m.invoke(obj, call);
      System.out.println(fmt(r));
      return;
    }
    System.out.println("(no callable class method found)");
  }
  static Method pick(Class<?> cls) {
    Method best = null;
    for (Method mm : cls.getDeclaredMethods()) {
      if (mm.isSynthetic() || mm.getName().equals("main") || mm.getParameterCount() < 1) continue;
      if (!Modifier.isPublic(mm.getModifiers())) continue;
      if (best == null || mm.getParameterCount() > best.getParameterCount()) best = mm;
    }
    return best;
  }
  static int topEq(String t) {
    int d = 0; boolean q = false; char qc = 0;
    for (int i = 0; i < t.length(); i++) { char c = t.charAt(i);
      if (q) { if (c == qc) q = false; }
      else if (c == 34 || c == 39) { q = true; qc = c; }
      else if (c == '[' || c == '(' || c == '{') d++;
      else if (c == ']' || c == ')' || c == '}') d--;
      else if (c == '=' && d == 0 && (i + 1 >= t.length() || t.charAt(i + 1) != '=') && (i == 0 || (t.charAt(i - 1) != '!' && t.charAt(i - 1) != '<' && t.charAt(i - 1) != '>'))) return i;
    }
    return -1;
  }
  static String[] split(String s) {
    s = s.trim(); List<String> out = new ArrayList<>();
    int d = 0; boolean q = false; char qc = 0; StringBuilder cur = new StringBuilder();
    for (int i = 0; i < s.length(); i++) { char c = s.charAt(i);
      if (q) { cur.append(c); if (c == qc) q = false; }
      else if (c == 34 || c == 39) { q = true; qc = c; cur.append(c); }
      else if (c == '[' || c == '(' || c == '{') { d++; cur.append(c); }
      else if (c == ']' || c == ')' || c == '}') { d--; cur.append(c); }
      else if (c == ',' && d == 0) { out.add(cur.toString()); cur = new StringBuilder(); }
      else cur.append(c);
    }
    if (cur.length() > 0) out.add(cur.toString());
    List<String> vals = new ArrayList<>();
    for (String p : out) { String t = p.trim(); int eq = topEq(t); if (eq >= 0) t = t.substring(eq + 1).trim(); vals.add(t); }
    return vals.toArray(new String[0]);
  }
  static String[] elems(String s) {
    s = s.trim();
    if (s.length() >= 2 && (s.charAt(0) == '[' || s.charAt(0) == '{')) s = s.substring(1, s.length() - 1);
    s = s.trim(); if (s.isEmpty()) return new String[0];
    List<String> out = new ArrayList<>(); int d = 0; boolean q = false; char qc = 0; StringBuilder cur = new StringBuilder();
    for (int i = 0; i < s.length(); i++) { char c = s.charAt(i);
      if (q) { cur.append(c); if (c == qc) q = false; }
      else if (c == 34 || c == 39) { q = true; qc = c; cur.append(c); }
      else if (c == '[' || c == '{') { d++; cur.append(c); }
      else if (c == ']' || c == '}') { d--; cur.append(c); }
      else if (c == ',' && d == 0) { out.add(cur.toString()); cur = new StringBuilder(); }
      else cur.append(c);
    }
    if (cur.length() > 0) out.add(cur.toString());
    return out.toArray(new String[0]);
  }
  static String unq(String s) { s = s.trim(); if (s.length() >= 2 && (s.charAt(0) == 34 || s.charAt(0) == 39) && s.charAt(s.length() - 1) == s.charAt(0)) return s.substring(1, s.length() - 1); return s; }
  static Object parse(String s, Class<?> t) {
    s = s.trim();
    if (t == int.class || t == Integer.class) return Integer.parseInt(s);
    if (t == long.class || t == Long.class) return Long.parseLong(s);
    if (t == double.class || t == Double.class) return Double.parseDouble(s);
    if (t == float.class || t == Float.class) return Float.parseFloat(s);
    if (t == boolean.class || t == Boolean.class) return Boolean.parseBoolean(s.toLowerCase());
    if (t == char.class || t == Character.class) { String u = unq(s); return u.isEmpty() ? ' ' : u.charAt(0); }
    if (t == String.class) return unq(s);
    if (t == int[].class) { String[] e = elems(s); int[] a = new int[e.length]; for (int i = 0; i < e.length; i++) a[i] = Integer.parseInt(e[i].trim()); return a; }
    if (t == long[].class) { String[] e = elems(s); long[] a = new long[e.length]; for (int i = 0; i < e.length; i++) a[i] = Long.parseLong(e[i].trim()); return a; }
    if (t == double[].class) { String[] e = elems(s); double[] a = new double[e.length]; for (int i = 0; i < e.length; i++) a[i] = Double.parseDouble(e[i].trim()); return a; }
    if (t == boolean[].class) { String[] e = elems(s); boolean[] a = new boolean[e.length]; for (int i = 0; i < e.length; i++) a[i] = Boolean.parseBoolean(e[i].trim().toLowerCase()); return a; }
    if (t == char[].class) { String u = unq(s); return u.toCharArray(); }
    if (t == String[].class) { String[] e = elems(s); String[] a = new String[e.length]; for (int i = 0; i < e.length; i++) a[i] = unq(e[i]); return a; }
    if (t == int[][].class) { String[] rows = elems(s); int[][] a = new int[rows.length][]; for (int i = 0; i < rows.length; i++) { String[] e = elems(rows[i]); a[i] = new int[e.length]; for (int j = 0; j < e.length; j++) a[i][j] = Integer.parseInt(e[j].trim()); } return a; }
    if (List.class.isAssignableFrom(t)) { String[] e = elems(s); List<Object> l = new ArrayList<>(); for (String x : e) { x = x.trim(); try { l.add(Integer.parseInt(x)); } catch (Exception ex) { try { l.add(Double.parseDouble(x)); } catch (Exception e2) { l.add(unq(x)); } } } return l; }
    try { return Integer.parseInt(s); } catch (Exception e) { return unq(s); }
  }
  static String fmt(Object r) {
    if (r == null) return "null";
    if (r instanceof int[]) return Arrays.toString((int[]) r);
    if (r instanceof long[]) return Arrays.toString((long[]) r);
    if (r instanceof double[]) return Arrays.toString((double[]) r);
    if (r instanceof boolean[]) return Arrays.toString((boolean[]) r);
    if (r instanceof char[]) return new String((char[]) r);
    if (r instanceof int[][]) return Arrays.deepToString((int[][]) r);
    if (r instanceof Object[]) return Arrays.deepToString((Object[]) r);
    return String.valueOf(r);
  }
}
`;
}

const BUILDERS = {
  python: buildPythonRunner,
  javascript: buildJavascriptRunner,
  ruby: buildRubyRunner,
  bash: buildBashRunner,
};

// Compiled languages: build a full program, compile it, run the binary, capture
// stdout. Keyed by runtime; each entry knows how to produce the source and how
// to compile+run it (Java needs a fixed class name; others use COMPILED[]).
// C++ test-case runner. No reflection, so we parse the solution method's
// signature (class + public method, or a free function), marshal the parsed
// example input into typed C++ locals, call it, and print the result via a
// generic toStr() that formats vectors Python-style ("[1, 2, 3]") to match the
// expected values. Covers int/long/double/bool/char/string, their vectors, and
// vector<vector<...>>.
function cppSplitTop(s) {
  const out = []; let d = 0, q = false, qc = 0; let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === qc) q = false; }
    else if (c === '"' || c === "'") { q = true; qc = c; cur += c; }
    else if (c === '<' || c === '(' || c === '[' || c === '{') { d++; cur += c; }
    else if (c === '>' || c === ')' || c === ']' || c === '}') { d--; cur += c; }
    else if (c === ',' && d === 0) { out.push(cur); cur = ''; }
    else cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map(x => x.trim());
}
function cppLiteral(type, jsVal) {
  const t = type.replace(/\bconst\b/g, '').replace(/&/g, '').trim();
  if (/^vector\s*<([\s\S]+)>$/.test(t)) {
    const inner = t.match(/^vector\s*<([\s\S]+)>$/)[1].trim();
    const arr = Array.isArray(jsVal) ? jsVal : [];
    return '{' + arr.map(v => cppLiteral(inner, v)).join(', ') + '}';
  }
  if (/^(string|std::string)$/.test(t)) return JSON.stringify(String(jsVal ?? ''));
  if (/^char$/.test(t)) return "'" + String(jsVal ?? ' ').slice(0, 1).replace(/'/g, "\\'") + "'";
  if (/^bool$/.test(t)) return jsVal ? 'true' : 'false';
  if (/^(double|float|long double)$/.test(t)) return String(Number(jsVal));
  return String(parseInt(jsVal, 10)); // int/long/long long/short
}
function buildCppRunner(code, testInput) {
  // Detect entry: last class with a public method taking args, else a free fn.
  const classNames = [...code.matchAll(/\bclass\s+(\w+)/g)].map(m => m[1]);
  let cls = null, method = null, params = null;
  const methodRe = /(?:public:\s*)?(?:static\s+)?([\w:]+(?:\s*<[^;{}]*?>)?[\s\*&]+)(\w+)\s*\(([^;{}]*?)\)\s*(?:const\s*)?\{/g;
  const byClass = {};
  let mm;
  while ((mm = methodRe.exec(code)) !== null) {
    if (mm[2] === 'main' || /\breturn\b/.test(mm[1])) continue;
    byClass[mm[2]] = { ret: mm[1].trim(), name: mm[2], args: mm[3].trim() };
  }
  // Prefer a method inside the last-defined class; else any free function.
  for (const cn of [...classNames].reverse()) {
    const clsBody = code.slice(code.indexOf('class ' + cn));
    for (const k of Object.keys(byClass)) {
      if (clsBody.includes(byClass[k].name + '(') && !cls) { cls = cn; method = byClass[k]; break; }
    }
    if (cls) break;
  }
  if (!method) { const k = Object.keys(byClass)[0]; if (k) method = byClass[k]; }

  let callArgs = '', decls = '';
  if (method && method.args) {
    const paramList = cppSplitTop(method.args);
    // Parse input values (name = value / positional).
    const vals = cppSplitTop(testInput).map(p => {
      const eq = p.indexOf('=');
      const raw = eq >= 0 ? p.slice(eq + 1).trim() : p.trim();
      try { return JSON.parse(raw.replace(/'/g, '"')); } catch { return raw.replace(/^["']|["']$/g, ''); }
    });
    const names = [];
    paramList.forEach((p, i) => {
      const m2 = p.match(/^([\s\S]+?)(\w+)\s*$/);
      if (!m2) return;
      const type = m2[1].trim(); const nm = '__a' + i;
      names.push(nm);
      const baseType = type.replace(/\bconst\b/g, '').replace(/&/g, '').trim();
      decls += `  ${baseType} ${nm} = ${cppLiteral(type, vals[i])};\n`;
    });
    callArgs = names.join(', ');
  }
  const callExpr = cls
    ? `${cls} __sol; auto __r = __sol.${method ? method.name : ''}(${callArgs});`
    : `auto __r = ${method ? method.name : ''}(${callArgs});`;

  return `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <deque>
#include <cmath>
#include <climits>
#include <numeric>
#include <utility>
#include <functional>
using namespace std;
template<typename T> string __toStr(const T& v){ ostringstream o; o<<v; return o.str(); }
string __toStr(bool v){ return v?"true":"false"; }
string __toStr(const string& v){ return v; }
template<typename T> string __toStr(const vector<T>& v){ string s="["; for(size_t i=0;i<v.size();i++){ if(i) s+=", "; s+=__toStr(v[i]); } s+="]"; return s; }

${code}

int main(){
${decls}  ${callExpr}
  cout << __toStr(__r) << endl;
  return 0;
}
`;
}

const COMPILED_TEST_BUILDERS = {
  java: buildJavaRunner,
  cpp: buildCppRunner,
};

// ---------------------------------------------------------------------------
// Output comparison
// ---------------------------------------------------------------------------

function normalizeValue(s) {
  s = s.trim();
  if (!s) return s;
  try { return JSON.parse(s); } catch { /* continue */ }
  // Python-repr → JSON best-effort: Python prints collections with single
  // quotes and True/False/None (e.g. [['eat', 'tea']]), but expected outputs
  // are usually JSON-style. Only attempt on collection-shaped strings, and
  // only as a fallback after strict JSON.parse already failed.
  if (/^[[{]/.test(s)) {
    try {
      const j = s
        .replace(/'/g, '"')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null');
      return JSON.parse(j);
    } catch { /* continue */ }
  }
  if (s === 'True' || s === 'true') return true;
  if (s === 'False' || s === 'false') return false;
  if (s === 'None' || s === 'null') return null;
  const num = Number(s);
  if (!isNaN(num) && s !== '') return num;
  return s;
}

function compareOutput(expected, actual) {
  const expVal = normalizeValue(expected);
  const actVal = normalizeValue(actual);
  if (JSON.stringify(expVal) === JSON.stringify(actVal)) return true;
  if (Array.isArray(expVal) && Array.isArray(actVal)) {
    if (expVal.length === actVal.length) {
      const eSorted = [...expVal].map(String).sort();
      const aSorted = [...actVal].map(String).sort();
      if (JSON.stringify(eSorted) === JSON.stringify(aSorted)) return true;
    }
  }
  // Whitespace-insensitive fallback: collapse all runs of whitespace (incl.
  // newlines) to single spaces so a per-line print output ("8\n-2\n15") matches
  // a space-joined expected ("8 -2 15") and vice versa — interview-coding
  // outputs rarely depend on exact interior whitespace.
  const normWs = (x) => x.trim().replace(/\s+/g, ' ');
  return normWs(expected) === normWs(actual);
}

// ---------------------------------------------------------------------------
// Auto-install missing Python packages
// ---------------------------------------------------------------------------

const PIP_TIMEOUT_MS = 90_000; // boto3 + deps can take 60s+
// Known import→package name mismatches
const PIP_ALIAS = {
  cv2:        'opencv-python',
  PIL:        'Pillow',
  sklearn:    'scikit-learn',
  bs4:        'beautifulsoup4',
  yaml:       'PyYAML',
  dotenv:     'python-dotenv',
  Crypto:     'pycryptodome',
  google:     'google-api-python-client',
  serial:     'pyserial',
  usb:        'pyusb',
  gi:         'PyGObject',
  wx:         'wxPython',
  dateutil:   'python-dateutil',
  jwt:        'PyJWT',
  paramiko:   'paramiko',
  MySQLdb:    'mysqlclient',
  psycopg2:   'psycopg2-binary',
  redis:      'redis',
  pymongo:    'pymongo',
  celery:     'celery',
  pydantic:   'pydantic',
  aiohttp:    'aiohttp',
  httpx:      'httpx',
  attr:       'attrs',
  click:      'click',
  rich:       'rich',
  loguru:     'loguru',
};

async function pipInstall(importName) {
  if (!/^[a-zA-Z0-9._-]+$/.test(importName)) return false;
  const pkgName = PIP_ALIAS[importName] ?? importName;
  const pip = await which('pip3') ?? await which('pip');
  if (!pip) return false;
  // Debian bookworm marks system Python as "externally managed" — need
  // --break-system-packages to install into the system site-packages.
  // Fall back to --user if that flag isn't recognised (older images).
  let result = await runCommand(
    pip, ['install', '--quiet', '--break-system-packages', pkgName],
    { timeout: PIP_TIMEOUT_MS },
  );
  if (result.exitCode !== 0) {
    result = await runCommand(
      pip, ['install', '--quiet', '--user', pkgName],
      { timeout: PIP_TIMEOUT_MS },
    );
  }
  if (result.exitCode === 0) {
    console.log(`[codeRunner] pip installed: ${pkgName}`);
  } else {
    console.warn(`[codeRunner] pip install failed for ${pkgName}:`, result.stderr?.slice(0, 200));
  }
  return result.exitCode === 0;
}

function missingModule(stderr) {
  return stderr?.match(/ModuleNotFoundError: No module named '([\w.]+)'/)?.[1]?.split('.')?.[0] ?? null;
}

function missingNodeModule(stderr) {
  return stderr?.match(/Cannot find (?:module|package) '([@\w/.-]+)'/)?.[1] ?? null;
}

async function npmInstall(pkgName, cwd) {
  if (!/^[@\w/.-]+$/.test(pkgName)) return false;
  const npm = await which('npm');
  if (!npm) return false;
  const result = await runCommand(
    npm, ['install', '--no-save', '--quiet', pkgName],
    { timeout: 60_000, cwd },
  );
  if (result.exitCode === 0) {
    console.log(`[codeRunner] npm installed: ${pkgName} in ${cwd}`);
  } else {
    console.warn(`[codeRunner] npm install failed for ${pkgName}:`, result.stderr?.slice(0, 200));
  }
  return result.exitCode === 0;
}

// ---------------------------------------------------------------------------
// Not executable languages
// ---------------------------------------------------------------------------

const NOT_EXECUTABLE = new Set([
  'sql', 'mysql', 'postgresql', 'html', 'terraform', 'kubernetes', 'docker',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function executeCode(code, language, testCases = [], opts = {}) {
  const lang = language.toLowerCase();

  // Check for non-executable languages
  if (NOT_EXECUTABLE.has(lang)) {
    throw new Error(
      `'${language}' is not directly executable. ` +
      `Solution generation works for all languages, but code execution is only available for programming languages.`,
    );
  }

  const runtime = RUNTIME_MAP[lang];
  if (!runtime) {
    throw new Error(
      `Code execution for '${language}' is not available. ` +
      `Solution generation works for all languages, but execution requires a server runtime.`,
    );
  }

  // Custom-input run ("Test against custom input"): execute once feeding the raw
  // stdin, bypassing the test-case harness entirely, and return direct output.
  if (typeof opts.stdin === 'string') {
    return directExecute(code, runtime, opts.stdin);
  }

  // No test cases → direct execution
  const validTestCases = testCases.filter(tc => tc.input?.trim());

  if (validTestCases.length === 0) {
    return directExecute(code, runtime);
  }

  // Compiled languages (Java, …) — compile a reflection driver per test case,
  // run the binary, compare stdout.
  const compiledBuilder = COMPILED_TEST_BUILDERS[runtime];
  if (compiledBuilder) {
    return runCompiledTestCases(code, runtime, validTestCases, compiledBuilder);
  }

  // With test cases → use builder if available, otherwise fall back to direct execution
  const builder = BUILDERS[runtime];
  if (!builder) {
    // For languages without test runners, run directly and return as single result
    const result = await directExecute(code, runtime);
    return {
      direct_output: result.direct_output,
      results: [],
      all_passed: false,
    };
  }

  // Get the interpreter command for test execution
  const interpreted = INTERPRETED[runtime];
  if (!interpreted) {
    return directExecute(code, runtime);
  }

  const { cmd, ext } = interpreted;
  const binaryPath = await which(cmd);
  if (!binaryPath) {
    throw new Error(`Runtime '${cmd}' not found on server`);
  }

  const results = [];

  for (const tc of validTestCases) {
    const tmpPath = join(tmpdir(), `lumora-${randomUUID()}${ext}`);
    try {
      const runnerCode = builder(code, tc.input);
      await writeFile(tmpPath, runnerCode, 'utf8');

      let tcResult = await runInSandbox(cmd, tmpPath, tc.input);
      // Auto-install missing packages and retry
      for (let attempt = 0; attempt < 5 && tcResult.exitCode !== 0; attempt++) {
        const mod = missingModule(tcResult.stderr);
        if (!mod) break;
        const ok = await pipInstall(mod);
        if (!ok) break;
        tcResult = await runInSandbox(cmd, tmpPath, tc.input);
      }
      const { stdout, stderr, exitCode } = tcResult;
      const output = stdout.trim();
      let error = null;

      if (exitCode !== 0) {
        error = stderr?.slice(0, 500) || 'Execution failed';
      } else if (stderr && !output) {
        error = stderr.slice(0, 500);
      }

      // Decide correctness on STDOUT FIRST. A stdout that matches expected is a
      // PASS even if the process later exits non-zero (e.g. a harness crash
      // AFTER the solution already printed the right answer). Previously
      // `passed = !error && ...` let any non-zero exit veto an already-correct
      // stdout — the "Out == Exp yet FAILED, with a traceback" symptom.
      const matched = !!output && compareOutput(tc.expected, output);
      const passed = matched;

      results.push({
        input: tc.input,
        expected: tc.expected,
        // Keep the correct stdout as the shown Out; only fall back to the error
        // text when there was no usable output. Never show a matching Out next
        // to a failure.
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

// Compile-and-run test execution for statically-typed languages (Java, …).
// For each test case: build a full driver program, compile it, run the binary,
// and compare stdout to the expected value — same result shape as the
// interpreted path so the API/UI are unchanged.
async function runCompiledTestCases(code, runtime, validTestCases, builder) {
  const results = [];
  for (const tc of validTestCases) {
    const srcDir = join(tmpdir(), `lumora-${runtime}-${randomUUID()}`);
    await mkdir(srcDir, { recursive: true });
    try {
      const src = builder(code, tc.input);
      let output = '';
      let error = null;

      if (runtime === 'java') {
        const srcPath = join(srcDir, '__Main.java');
        await writeFile(srcPath, src, 'utf8');
        const javac = await which('javac');
        if (!javac) throw new Error("Runtime 'javac' not found on server");
        const compile = await runCommand('javac', [srcPath], { timeout: COMPILE_TIMEOUT_MS });
        if (compile.exitCode !== 0) {
          error = `Compilation Error:\n${compile.stderr}`.slice(0, 500);
        } else {
          const run = await runCommand('java', ['-cp', srcDir, '__Main'], { timeout: COMPILE_TIMEOUT_MS });
          output = (run.stdout || '').trim();
          if (run.exitCode !== 0 && !output) error = (run.stderr || 'Execution failed').slice(0, 500);
        }
      } else {
        // Compiled via COMPILED[] (e.g. cpp): source → compile → run binary.
        const spec = COMPILED[runtime];
        const srcPath = join(srcDir, `main${spec.ext}`);
        const binPath = join(srcDir, 'a.out');
        await writeFile(srcPath, src, 'utf8');
        const bin = await which(spec.compiler);
        if (!bin) throw new Error(`Runtime '${spec.compiler}' not found on server`);
        const compile = await runCommand(spec.compiler, spec.args(srcPath, binPath), { timeout: COMPILE_TIMEOUT_MS });
        if (compile.exitCode !== 0) {
          error = `Compilation Error:\n${compile.stderr}`.slice(0, 500);
        } else {
          const run = await runCommand(binPath, [], { timeout: COMPILE_TIMEOUT_MS });
          output = (run.stdout || '').trim();
          if (run.exitCode !== 0 && !output) error = (run.stderr || 'Execution failed').slice(0, 500);
        }
      }

      const matched = !!output && compareOutput(tc.expected, output);
      results.push({
        input: tc.input,
        expected: tc.expected,
        output: output || error || '(no output)',
        passed: matched,
        error: matched ? null : error,
      });
    } catch (e) {
      results.push({ input: tc.input, expected: tc.expected, output: `Error: ${e.message}`, passed: false, error: e.message });
    } finally {
      await rm(srcDir, { recursive: true }).catch(() => {});
    }
  }
  return { results, all_passed: results.length > 0 && results.every(r => r.passed) };
}


