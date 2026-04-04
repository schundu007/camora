import { Router } from 'express';
import { validate } from '../middleware/validators.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { safeLog } from '../services/utils.js';

const router = Router();

const MAX_CODE_SIZE = 100_000;

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'go', 'rust', 'bash'];

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
    }
    return { success: false, error: `Unsupported language: ${language}`, output: '' };
  } catch (err) {
    return { success: false, error: err.stderr || err.message || 'Execution failed', output: err.stderr || err.message };
  }
}

router.post('/', validate('run'), async (req, res, next) => {
  try {
    const { code, language, input } = req.body;

    const result = await executeCode(code, language, input);
    res.json(result);
  } catch (error) {
    next(new AppError(
      'Failed to execute code',
      ErrorCode.INTERNAL_ERROR,
      error.message
    ));
  }
});

export default router;
