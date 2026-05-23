// apps/ascend-backend/src/routes/playground.js
import { Router } from 'express';
import { promisify } from 'util';
import { execFile, spawn } from 'child_process';
import { writeFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { query } from '../config/database.js';

const execFileAsync = promisify(execFile);
const router = Router();

const CODE_LIMIT = 50 * 1024; // 50KB
const EXEC_OPTS = { maxBuffer: 1024 * 1024 }; // 1MB

// Wrapper reads code.py from disk — avoids any string-escaping issues.
// Emits __VARS__:<json> to stderr so backend can parse variables separately.
const PYTHON_WRAPPER = `import json as _j, sys as _s, traceback as _t, io as _io

with open('code.py', 'r') as _f:
    _src = _f.read()

_cap = _io.StringIO()
_s.stdout = _cap
_loc = {}

try:
    exec(compile(_src, 'code.py', 'exec'), {}, _loc)
except Exception:
    _s.stdout = _s.__stdout__
    _s.stdout.write(_cap.getvalue())
    _s.stderr.write(_t.format_exc())
    _s.exit(1)

_s.stdout = _s.__stdout__
_s.stdout.write(_cap.getvalue())
_safe = {}
for _k, _v in _loc.items():
    if not _k.startswith('_'):
        try:
            _safe[_k] = {'type': type(_v).__name__, 'repr': repr(_v)[:200]}
        except Exception:
            pass
_s.stderr.write('__VARS__:' + _j.dumps(_safe) + '\\n')
`;

function parseVarsSentinel(stderr = '') {
  const lines = stderr.split('\n');
  const varsLine = lines.find(l => l.startsWith('__VARS__:'));
  const cleanStderr = lines.filter(l => !l.startsWith('__VARS__:')).join('\n').trimEnd();
  let variables = {};
  if (varsLine) {
    try { variables = JSON.parse(varsLine.slice('__VARS__:'.length)); } catch {}
  }
  return { cleanStderr, variables };
}

async function withTmpDir(fn) {
  const dir = join(tmpdir(), `playground-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runPython(code) {
  return withTmpDir(async (dir) => {
    await writeFile(join(dir, 'code.py'), code, 'utf8');
    await writeFile(join(dir, 'main.py'), PYTHON_WRAPPER, 'utf8');
    const start = Date.now();
    try {
      const { stdout, stderr } = await execFileAsync(
        'python3', ['main.py'],
        { cwd: dir, timeout: 10000, ...EXEC_OPTS }
      );
      const { cleanStderr, variables } = parseVarsSentinel(stderr);
      return { stdout, stderr: cleanStderr, exitCode: 0, duration: Date.now() - start, variables };
    } catch (err) {
      const { cleanStderr, variables } = parseVarsSentinel(err.stderr);
      return {
        stdout: err.stdout || '',
        stderr: cleanStderr || err.message,
        exitCode: typeof err.code === 'number' ? err.code : 1,
        duration: Date.now() - start,
        variables,
      };
    }
  });
}

async function runBash(code) {
  return withTmpDir(async (dir) => {
    const file = join(dir, 'script.sh');
    await writeFile(file, code, { encoding: 'utf8', mode: 0o755 });
    const start = Date.now();
    try {
      const { stdout, stderr } = await execFileAsync(
        'bash', [file],
        { cwd: dir, timeout: 10000, ...EXEC_OPTS }
      );
      return { stdout, stderr, exitCode: 0, duration: Date.now() - start, variables: {} };
    } catch (err) {
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        exitCode: typeof err.code === 'number' ? err.code : 1,
        duration: Date.now() - start,
        variables: {},
      };
    }
  });
}

function spawnWithStdin(cmd, args, input, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.stdin.write(input, 'utf8');
    child.stdin.end();
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, exitCode: 1 });
    });
  });
}

async function runDockerLint(code) {
  const start = Date.now();
  const result = await spawnWithStdin('hadolint', ['-'], code, 5000);
  return {
    stdout: result.stdout || (result.exitCode === 0 ? 'Dockerfile is valid. No issues found.' : ''),
    stderr: result.stderr,
    exitCode: result.exitCode,
    duration: Date.now() - start,
    variables: {},
  };
}

const TF_PROVIDERS_TF = `terraform {
  required_providers {
    null   = { source = "hashicorp/null" }
    random = { source = "hashicorp/random" }
  }
}
`;

async function runTerraform(code) {
  return withTmpDir(async (dir) => {
    await writeFile(join(dir, 'main.tf'), code, 'utf8');
    if (!code.includes('terraform {')) {
      await writeFile(join(dir, 'providers.tf'), TF_PROVIDERS_TF, 'utf8');
    }
    const env = {
      ...process.env,
      TF_PLUGIN_CACHE_DIR: '/terraform-plugin-cache',
      TF_INPUT: 'false',
    };
    const start = Date.now();
    const output = [];
    try {
      const init = await execFileAsync(
        'terraform', ['init', '-backend=false', '-no-color'],
        { cwd: dir, timeout: 30000, env, ...EXEC_OPTS }
      );
      output.push(init.stdout.trim());

      const validate = await execFileAsync(
        'terraform', ['validate', '-no-color'],
        { cwd: dir, timeout: 10000, env, ...EXEC_OPTS }
      );
      output.push(validate.stdout.trim());

      const plan = await execFileAsync(
        'terraform', ['plan', '-no-color'],
        { cwd: dir, timeout: 30000, env, ...EXEC_OPTS }
      );
      output.push(plan.stdout.trim());

      return { stdout: output.filter(Boolean).join('\n\n'), stderr: '', exitCode: 0, duration: Date.now() - start, variables: {} };
    } catch (err) {
      // exit code 2 = plan has changes (not an error)
      if (err.code === 2) {
        output.push(err.stdout || '');
        return { stdout: output.filter(Boolean).join('\n\n'), stderr: '', exitCode: 0, duration: Date.now() - start, variables: {} };
      }
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
        exitCode: typeof err.code === 'number' ? err.code : 1,
        duration: Date.now() - start,
        variables: {},
      };
    }
  });
}

// POST /run
router.post('/run', async (req, res, next) => {
  try {
    const { language, code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'code is required' });
    }
    if (code.length > CODE_LIMIT) {
      return res.status(413).json({ error: 'Code exceeds 50 KB limit' });
    }

    const lang = String(language || '').toLowerCase();
    let result;
    switch (lang) {
      case 'python3': result = await runPython(code); break;
      case 'bash':    result = await runBash(code);   break;
      case 'docker':  result = await runDockerLint(code); break;
      case 'terraform': result = await runTerraform(code); break;
      default:
        return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as playgroundRouter };
