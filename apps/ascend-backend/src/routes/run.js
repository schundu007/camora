import { Router } from 'express';
import { validate } from '../middleware/validators.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { safeLog } from '../services/utils.js';

const router = Router();

const MAX_CODE_SIZE = 100_000;

const SUPPORTED_LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'go', 'rust', 'bash',
  'sql', 'mysql', 'postgresql',
  'ruby', 'php', 'kotlin', 'swift', 'csharp', 'scala', 'perl', 'lua', 'r',
];

/**
 * Run a command with optional stdin support.
 * Uses spawn when input is provided (execFile doesn't support async stdin).
 */
async function runProcess(cmd, args, input, options = {}) {
  if (!input) {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    return promisify(execFile)(cmd, args, options);
  }

  const { spawn } = await import('child_process');
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(Object.assign(new Error('Execution timed out'), { stderr }));
    }, options.timeout || 10000);

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', () => { clearTimeout(timer); resolve({ stdout, stderr }); });

    child.stdin.write(input);
    child.stdin.end();
  });
}

/** Format run result with consistent fields (frontend expects .error) */
function formatResult(stdout, stderr) {
  const hasError = !!stderr && !stdout.trim();
  return { success: !hasError, stdout, stderr, error: stderr || undefined, output: stdout || stderr };
}

/**
 * Execute code locally using installed compilers/interpreters.
 * All languages run on the server — no external API needed.
 */
async function executeCode(code, language, input = '') {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return { success: false, error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}` };
  }
  if (!code || typeof code !== 'string') {
    return { success: false, error: 'No code provided' };
  }
  if (code.length > MAX_CODE_SIZE) {
    return { success: false, error: `Code exceeds maximum size of ${MAX_CODE_SIZE} characters` };
  }
  return executeFallback(code, language, input);
}

// Local code execution using installed compilers/interpreters
async function executeFallback(code, language, input) {
  const { writeFile, unlink } = await import('fs/promises');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { randomUUID } = await import('crypto');

  const id = randomUUID();
  const tmpDir = tmpdir();
  const execOpts = { timeout: 10000, maxBuffer: 1024 * 1024 };

  // Try multiple Python binary names
  async function runPython(filePath, stdinInput) {
    for (const bin of ['python3', 'python']) {
      try {
        return await runProcess(bin, [filePath], stdinInput, execOpts);
      } catch (e) {
        if (e.code === 'ENOENT') continue;
        throw e;
      }
    }
    throw new Error('Python not found');
  }

  try {
    if (language === 'python') {
      const filePath = join(tmpDir, `run-${id}.py`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runPython(filePath, input);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'javascript' || language === 'typescript') {
      const ext = language === 'typescript' ? '.ts' : '.js';
      const filePath = join(tmpDir, `run-${id}${ext}`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('node', [filePath], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    }
    if (language === 'go') {
      const filePath = join(tmpDir, `run-${id}.go`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('go', ['run', filePath], input, { ...execOpts, timeout: 15000 });
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'java') {
      const filePath = join(tmpDir, `Main.java`);
      await writeFile(filePath, code);
      try {
        await runProcess('javac', [filePath], null, { timeout: 15000, cwd: tmpDir });
        const { stdout, stderr } = await runProcess('java', ['-cp', tmpDir, 'Main'], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
        await unlink(join(tmpDir, 'Main.class')).catch(() => {});
      }
    } else if (language === 'cpp' || language === 'c') {
      const ext = language === 'cpp' ? '.cpp' : '.c';
      const srcPath = join(tmpDir, `run-${id}${ext}`);
      const binPath = join(tmpDir, `run-${id}`);
      await writeFile(srcPath, code);
      try {
        const compiler = language === 'cpp' ? 'g++' : 'gcc';
        await runProcess(compiler, [srcPath, '-o', binPath], null, { timeout: 15000 });
        const { stdout, stderr } = await runProcess(binPath, [], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(srcPath).catch(() => {});
        await unlink(binPath).catch(() => {});
      }
    } else if (language === 'rust') {
      const srcPath = join(tmpDir, `run-${id}.rs`);
      const binPath = join(tmpDir, `run-${id}-bin`);
      await writeFile(srcPath, code);
      try {
        await runProcess('rustc', [srcPath, '-o', binPath], null, { timeout: 30000 });
        const { stdout, stderr } = await runProcess(binPath, [], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(srcPath).catch(() => {});
        await unlink(binPath).catch(() => {});
      }
    } else if (language === 'bash') {
      const filePath = join(tmpDir, `run-${id}.sh`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('bash', [filePath], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'sql' || language === 'mysql' || language === 'postgresql') {
      // Run SQL against an in-memory SQLite database via Python's stdlib.
      // Splits by semicolons and prints each result set as ASCII tables.
      // Works for any standard SQL the user pastes — CREATE/INSERT/SELECT/etc.
      const harnessPath = join(tmpDir, `run-${id}-sql.py`);
      const sqlPath = join(tmpDir, `run-${id}.sql`);
      const harness = `import sqlite3, sys, re
sql = open(${JSON.stringify(sqlPath)}).read()
con = sqlite3.connect(':memory:'); con.isolation_level = None
cur = con.cursor()
# Naive split on ';' boundaries (good enough for interview-style snippets).
stmts = [s.strip() for s in re.split(r';\\s*(?:\\n|$)', sql) if s.strip()]
out_blocks = []
for stmt in stmts:
    try:
        cur.execute(stmt)
        if cur.description:
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
            widths = [max(len(str(c)), *(len(str(r[i])) for r in rows)) if rows else len(str(c)) for i, c in enumerate(cols)]
            line = ' | '.join(c.ljust(widths[i]) for i, c in enumerate(cols))
            sep = '-+-'.join('-' * w for w in widths)
            block = [line, sep]
            for r in rows:
                block.append(' | '.join(str(r[i]).ljust(widths[i]) for i in range(len(cols))))
            block.append(f'({len(rows)} row{"s" if len(rows) != 1 else ""})')
            out_blocks.append('\\n'.join(block))
    except sqlite3.Error as e:
        print(f'SQL error: {e}', file=sys.stderr)
        sys.exit(1)
print('\\n\\n'.join(out_blocks))
`;
      await writeFile(sqlPath, code);
      await writeFile(harnessPath, harness);
      try {
        const { stdout, stderr } = await runPython(harnessPath, input);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(sqlPath).catch(() => {});
        await unlink(harnessPath).catch(() => {});
      }
    } else if (language === 'ruby') {
      const filePath = join(tmpDir, `run-${id}.rb`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('ruby', [filePath], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'php') {
      const filePath = join(tmpDir, `run-${id}.php`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('php', [filePath], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'perl') {
      const filePath = join(tmpDir, `run-${id}.pl`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('perl', [filePath], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'lua') {
      const filePath = join(tmpDir, `run-${id}.lua`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('lua', [filePath], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'r') {
      const filePath = join(tmpDir, `run-${id}.R`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('Rscript', [filePath], input, execOpts);
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'kotlin') {
      const filePath = join(tmpDir, `run-${id}.kts`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('kotlinc', ['-script', filePath], input, { ...execOpts, timeout: 30000 });
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'swift') {
      const filePath = join(tmpDir, `run-${id}.swift`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('swift', [filePath], input, { ...execOpts, timeout: 20000 });
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'csharp') {
      // dotnet-script if available; fall back to mcs+mono.
      const filePath = join(tmpDir, `run-${id}.csx`);
      await writeFile(filePath, code);
      try {
        try {
          const { stdout, stderr } = await runProcess('dotnet-script', [filePath], input, { ...execOpts, timeout: 30000 });
          return formatResult(stdout, stderr);
        } catch (e) {
          if (e.code !== 'ENOENT') throw e;
          // Fallback: compile with mcs as Main.cs
          const csPath = join(tmpDir, `run-${id}.cs`);
          const exePath = join(tmpDir, `run-${id}.exe`);
          await writeFile(csPath, code);
          try {
            await runProcess('mcs', [csPath, '-out:' + exePath], null, { timeout: 20000 });
            const { stdout, stderr } = await runProcess('mono', [exePath], input, execOpts);
            return formatResult(stdout, stderr);
          } finally {
            await unlink(csPath).catch(() => {});
            await unlink(exePath).catch(() => {});
          }
        }
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'scala') {
      const filePath = join(tmpDir, `run-${id}.scala`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runProcess('scala', [filePath], input, { ...execOpts, timeout: 30000 });
        return formatResult(stdout, stderr);
      } finally {
        await unlink(filePath).catch(() => {});
      }
    }
    return { success: false, error: `Unsupported language: ${language}`, output: '' };
  } catch (err) {
    return { success: false, error: err.stderr || err.message || 'Execution failed', output: err.stderr || err.message };
  }
}

// Fire-and-forget cross-service hook: index a successful Practice run
// into the user's Lumora code kit so future Sona answers can ground on
// the user's own past attempts. Failures are logged-only — never block
// or surface to the Practice page.
async function indexUserCodeFireAndForget({ authHeader, problem, language, code, success }) {
  if (!authHeader || !problem || !language || !code) return;
  const url = process.env.LUMORA_BACKEND_URL || 'http://localhost:8000';
  try {
    await fetch(`${url}/api/v1/usercode/index`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ problem, language, code, success }),
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    // Non-fatal: kit-building is best-effort.
    safeLog('warn', '[run] usercode index hook failed:', err.message);
  }
}

router.post('/', validate('run'), async (req, res, next) => {
  try {
    const { code, language, input, problem } = req.body;

    const result = await executeCode(code, language, input);
    res.json(result);

    // Fire-and-forget: index the user's code attempt for future RAG
    // grounding. Only when the caller named the problem (so the kit
    // stays organized by problem-slug) and the run succeeded.
    if (problem && result.success) {
      indexUserCodeFireAndForget({
        authHeader: req.headers.authorization,
        problem,
        language,
        code,
        success: true,
      });
    }
  } catch (error) {
    next(new AppError(
      'Failed to execute code',
      ErrorCode.INTERNAL_ERROR,
      error.message
    ));
  }
});

export default router;
