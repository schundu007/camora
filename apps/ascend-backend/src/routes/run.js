import { Router } from 'express';
import { validate } from '../middleware/validators.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { safeLog } from '../services/utils.js';

const router = Router();

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const MAX_CODE_SIZE = 100_000; // 100KB max code size

const LANGUAGE_IDS = {
  python: 71,    // Python 3
  javascript: 63, // Node.js
  typescript: 74,
  java: 62,
  cpp: 54,       // C++ (GCC)
  c: 50,         // C (GCC)
  go: 60,
  rust: 73,
  bash: 46,
  sql: 82,
};

/**
 * Execute code via Judge0 API (sandboxed remote execution).
 * Falls back to local child_process for Python/JavaScript when no API key is set.
 */
async function executeCode(code, language, input = '') {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    return {
      success: false,
      error: `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_IDS).join(', ')}`,
    };
  }

  if (!code || typeof code !== 'string') {
    return { success: false, error: 'No code provided' };
  }

  if (code.length > MAX_CODE_SIZE) {
    return { success: false, error: `Code exceeds maximum size of ${MAX_CODE_SIZE} characters` };
  }

  // If no Judge0 API key, use a simple eval fallback for Python/JS
  if (!JUDGE0_API_KEY) {
    return executeFallback(code, language, input);
  }

  try {
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 30000); // 30s network timeout

    // Submit to Judge0 with wait=true (synchronous)
    const submitRes = await fetch(`${JUDGE0_API_URL}?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      signal: controller.signal,
      body: JSON.stringify({
        language_id: languageId,
        source_code: Buffer.from(code).toString('base64'),
        stdin: Buffer.from(input).toString('base64'),
      }),
    });

    clearTimeout(fetchTimeout);

    if (!submitRes.ok) {
      const errorText = await submitRes.text().catch(() => 'Unknown error');
      safeLog(`[CodeRunner] Judge0 API error: ${submitRes.status} - ${errorText}`);
      return {
        success: false,
        error: `Code execution service returned an error (HTTP ${submitRes.status}). Please try again later.`,
      };
    }

    const result = await submitRes.json();

    const stdout = result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '';
    const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '';
    const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : '';

    // Status ID 3 = Accepted (successful execution)
    if (result.status && result.status.id !== 3) {
      return {
        success: false,
        error: stderr || compileOutput || result.status.description || 'Execution failed',
        output: stderr || compileOutput || result.status.description || '',
      };
    }

    return {
      success: true,
      output: stdout || '(no output)',
      stdout,
      stderr,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      safeLog('[CodeRunner] Judge0 API request timed out');
      return { success: false, error: 'Code execution service timed out. Please try again later.' };
    }

    safeLog(`[CodeRunner] Judge0 API request failed: ${err.message}`);
    return {
      success: false,
      error: 'Code execution service is currently unavailable. Please try again later.',
    };
  }
}

// Fallback: use Node.js child_process for Python and JavaScript
async function executeFallback(code, language, input) {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const { writeFile, unlink } = await import('fs/promises');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  const { randomUUID } = await import('crypto');
  const execFileAsync = promisify(execFile);

  const id = randomUUID();
  const tmpDir = tmpdir();

  // Try multiple Python binary names
  async function runPython(filePath) {
    for (const bin of ['python3', 'python']) {
      try {
        return await execFileAsync(bin, [filePath], { timeout: 10000, maxBuffer: 1024 * 1024 });
      } catch (e) {
        if (e.code === 'ENOENT') continue;
        throw e;
      }
    }
    throw new Error('Python not found. Install python3 or set JUDGE0_API_KEY.');
  }

  try {
    if (language === 'python') {
      const filePath = join(tmpDir, `run-${id}.py`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await runPython(filePath);
        return { success: !stderr, stdout, stderr, output: stdout || stderr };
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'javascript' || language === 'typescript') {
      const ext = language === 'typescript' ? '.ts' : '.js';
      const filePath = join(tmpDir, `run-${id}${ext}`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await execFileAsync('node', [filePath], { timeout: 10000, maxBuffer: 1024 * 1024 });
        return { success: !stderr, stdout, stderr, output: stdout || stderr };
      } finally {
        await unlink(filePath).catch(() => {});
      }
    }
    if (language === 'go') {
      const filePath = join(tmpDir, `run-${id}.go`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await execFileAsync('go', ['run', filePath], { timeout: 15000, maxBuffer: 1024 * 1024 });
        return { success: !stderr, stdout, stderr, output: stdout || stderr };
      } finally {
        await unlink(filePath).catch(() => {});
      }
    } else if (language === 'java') {
      const filePath = join(tmpDir, `Main.java`);
      await writeFile(filePath, code);
      try {
        await execFileAsync('javac', [filePath], { timeout: 15000, cwd: tmpDir });
        const { stdout, stderr } = await execFileAsync('java', ['-cp', tmpDir, 'Main'], { timeout: 10000, maxBuffer: 1024 * 1024 });
        return { success: !stderr, stdout, stderr, output: stdout || stderr };
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
        await execFileAsync(compiler, [srcPath, '-o', binPath], { timeout: 15000 });
        const { stdout, stderr } = await execFileAsync(binPath, [], { timeout: 10000, maxBuffer: 1024 * 1024 });
        return { success: !stderr, stdout, stderr, output: stdout || stderr };
      } finally {
        await unlink(srcPath).catch(() => {});
        await unlink(binPath).catch(() => {});
      }
    } else if (language === 'rust') {
      const srcPath = join(tmpDir, `run-${id}.rs`);
      const binPath = join(tmpDir, `run-${id}-bin`);
      await writeFile(srcPath, code);
      try {
        await execFileAsync('rustc', [srcPath, '-o', binPath], { timeout: 30000 });
        const { stdout, stderr } = await execFileAsync(binPath, [], { timeout: 10000, maxBuffer: 1024 * 1024 });
        return { success: !stderr, stdout, stderr, output: stdout || stderr };
      } finally {
        await unlink(srcPath).catch(() => {});
        await unlink(binPath).catch(() => {});
      }
    } else if (language === 'bash') {
      const filePath = join(tmpDir, `run-${id}.sh`);
      await writeFile(filePath, code);
      try {
        const { stdout, stderr } = await execFileAsync('bash', [filePath], { timeout: 10000, maxBuffer: 1024 * 1024 });
        return { success: !stderr, stdout, stderr, output: stdout || stderr };
      } finally {
        await unlink(filePath).catch(() => {});
      }
    }
    return { success: false, stdout: '', stderr: `Unsupported language: ${language}`, output: '' };
  } catch (err) {
    return { success: false, stdout: '', stderr: err.message || 'Execution failed', output: err.stderr || err.message };
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
