import { Router } from 'express';
import { validate } from '../middleware/validators.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { safeLog } from '../services/utils.js';

const router = Router();

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';
const RUN_TIMEOUT = 10000; // 10 seconds for code execution
const MAX_CODE_SIZE = 100_000; // 100KB max code size

// Language whitelist with Piston language identifiers and versions
const SUPPORTED_LANGUAGES = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  bash: { language: 'bash', version: '5.2.0' },
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
  sql: { language: 'sqlite3', version: '3.36.0' },
};

/**
 * Execute code via the Piston API (sandboxed remote execution).
 * No local execution is performed — all code runs in Piston's isolated containers.
 */
async function executeCode(code, language, input = '') {
  const langConfig = SUPPORTED_LANGUAGES[language];
  if (!langConfig) {
    return {
      success: false,
      error: `Unsupported language: ${language}. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
    };
  }

  if (!code || typeof code !== 'string') {
    return { success: false, error: 'No code provided' };
  }

  if (code.length > MAX_CODE_SIZE) {
    return { success: false, error: `Code exceeds maximum size of ${MAX_CODE_SIZE} characters` };
  }

  try {
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 30000); // 30s network timeout

    const response = await fetch(PISTON_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        language: langConfig.language,
        version: '*',
        files: [{ content: code }],
        stdin: input || '',
        run_timeout: RUN_TIMEOUT,
        compile_timeout: RUN_TIMEOUT,
        compile_memory_limit: 256_000_000, // 256MB
        run_memory_limit: 256_000_000,     // 256MB
      }),
    });

    clearTimeout(fetchTimeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      safeLog(`[CodeRunner] Piston API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Code execution service returned an error (HTTP ${response.status}). Please try again later.`,
      };
    }

    const result = await response.json();

    // Piston returns { run: { stdout, stderr, code, signal, output }, compile?: { ... } }
    // Check for compilation errors first
    if (result.compile && result.compile.code !== 0) {
      return {
        success: false,
        error: result.compile.stderr || result.compile.output || 'Compilation failed',
      };
    }

    const run = result.run;
    if (!run) {
      return { success: false, error: 'Unexpected response from code execution service' };
    }

    if (run.signal === 'SIGKILL') {
      return { success: false, error: 'Execution timeout or memory limit exceeded' };
    }

    if (run.code !== 0) {
      return {
        success: false,
        error: run.stderr || run.output || `Exit code: ${run.code}`,
      };
    }

    return {
      success: true,
      output: run.stdout || run.output || '(no output)',
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      safeLog('[CodeRunner] Piston API request timed out');
      return { success: false, error: 'Code execution service timed out. Please try again later.' };
    }

    safeLog(`[CodeRunner] Piston API request failed: ${err.message}`);
    return {
      success: false,
      error: 'Code execution service is currently unavailable. Please try again later.',
    };
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
