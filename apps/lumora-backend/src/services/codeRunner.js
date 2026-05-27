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

async function directExecute(code, runtime) {
  const id = randomUUID();
  const tmpBase = join(tmpdir(), `lumora-${id}`);

  // ── Interpreted languages ──
  if (INTERPRETED[runtime]) {
    const { cmd, ext } = INTERPRETED[runtime];
    const srcPath = `${tmpBase}${ext}`;
    await writeFile(srcPath, code, 'utf8');
    try {
      const bin = await which(cmd);
      if (!bin) throw new Error(`Runtime '${cmd}' not found on server`);
      let result = await runCommand(cmd, [srcPath]);
      // Auto-install missing packages and retry (up to 5 different imports)
      for (let attempt = 0; attempt < 5 && result.exitCode !== 0; attempt++) {
        const mod = missingModule(result.stderr);
        if (!mod) break;
        const ok = await pipInstall(mod);
        if (!ok) break;
        result = await runCommand(cmd, [srcPath]);
      }
      if (result.exitCode !== 0) return { direct_output: result.stderr ? `Error:\n${result.stderr}` : 'Execution failed' };
      const out = result.stderr ? `${result.stdout}\n[stderr]: ${result.stderr}` : result.stdout;
      return { direct_output: out.trim() || emptyOutputHint(code, runtime) };
    } finally {
      await unlink(srcPath).catch(() => {});
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
      const { stdout, stderr, exitCode } = await runCommand(cmd, args, { timeout: COMPILE_TIMEOUT_MS });
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
      const { stdout, stderr, exitCode } = await runCommand(binPath, []);
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
      const { stdout, stderr, exitCode } = await runCommand('java', ['-cp', srcDir, className]);
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

const _funcMatch = _userCode.match(/function\\s+(\\w+)|(?:const|let|var)\\s+(\\w+)\\s*=/);
if (_funcMatch) {
    const _fnName = _funcMatch[1] || _funcMatch[2];
    const _fn = eval(_fnName);
    if (typeof _fn === 'function') {
        const _result = _fn(..._parseParams(_input));
        console.log(JSON.stringify(_result));
    }
} else {
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

const BUILDERS = {
  python: buildPythonRunner,
  javascript: buildJavascriptRunner,
  ruby: buildRubyRunner,
  bash: buildBashRunner,
};

// ---------------------------------------------------------------------------
// Output comparison
// ---------------------------------------------------------------------------

function normalizeValue(s) {
  s = s.trim();
  if (!s) return s;
  try { return JSON.parse(s); } catch { /* continue */ }
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
  return expected.trim() === actual.trim();
}

// ---------------------------------------------------------------------------
// Auto-install missing Python packages
// ---------------------------------------------------------------------------

const PIP_TIMEOUT_MS = 30_000;
// Known import→package name mismatches
const PIP_ALIAS = {
  cv2: 'opencv-python',
  PIL: 'Pillow',
  sklearn: 'scikit-learn',
  bs4: 'beautifulsoup4',
  yaml: 'PyYAML',
  dotenv: 'python-dotenv',
  Crypto: 'pycryptodome',
  google: 'google-api-python-client',
};

async function pipInstall(importName) {
  // Only allow safe package name characters
  if (!/^[a-zA-Z0-9._-]+$/.test(importName)) return false;
  const pkgName = PIP_ALIAS[importName] ?? importName;
  const pip = await which('pip3') ?? await which('pip');
  if (!pip) return false;
  const result = await runCommand(pip, ['install', '--quiet', '--user', pkgName], { timeout: PIP_TIMEOUT_MS });
  return result.exitCode === 0;
}

function missingModule(stderr) {
  return stderr?.match(/ModuleNotFoundError: No module named '([\w.]+)'/)?.[1]?.split('.')?.[0] ?? null;
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

export async function executeCode(code, language, testCases = []) {
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

  // No test cases → direct execution
  const validTestCases = testCases.filter(tc => tc.input?.trim());

  if (validTestCases.length === 0) {
    return directExecute(code, runtime);
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
