/**
 * Python Diagrams Service
 *
 * Wrapper for the Python diagram_engine.py script that generates
 * cloud architecture diagrams using mingrammer/diagrams library.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Engine selection — Python `diagrams` + Graphviz is the primary engine.
// The D2 (Terrastruct) cutover was reverted on user feedback (D2 output
// quality fell short of the Graphviz + cloud-icon set). D2 stays in the
// repo as an opt-in via DIAGRAM_ENGINE=d2 for future iteration but
// nothing serves it by default and there is no automatic fallback to it.
const DIAGRAM_ENGINE = (process.env.DIAGRAM_ENGINE || 'graphviz').toLowerCase();
// Cross-engine fallback is OFF by default now that Graphviz is primary.
// Set DIAGRAM_FALLBACK=1 explicitly to re-enable if a future operator
// wants belt-and-suspenders coverage.
const FALLBACK_ENABLED = process.env.DIAGRAM_FALLBACK === '1';
const GRAPHVIZ_ENGINE_PATH = path.join(__dirname, 'diagram_engine.py');
const D2_ENGINE_PATH = path.join(__dirname, 'diagram_d2.py');
function resolveEnginePath(name) {
  return name === 'graphviz' ? GRAPHVIZ_ENGINE_PATH : D2_ENGINE_PATH;
}
const DIAGRAM_ENGINE_PATH = resolveEnginePath(DIAGRAM_ENGINE);

// Output directory for diagrams
const OUTPUT_DIR = process.env.DIAGRAM_OUTPUT_DIR || '/tmp/chundu_diagrams';

// Runtime API key storage (for Electron mode)
let runtimeApiKey = null;

/**
 * Set API key at runtime (used by Electron secure storage)
 */
export function setApiKey(key) {
  runtimeApiKey = key;
}

/**
 * Get API key (runtime takes precedence over environment)
 */
export function getApiKey() {
  return runtimeApiKey || process.env.ANTHROPIC_API_KEY;
}

/**
 * Check if the diagram engine is configured and available
 */
export function isConfigured() {
  return !!getApiKey();
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Generate a cloud architecture diagram
 *
 * @param {Object} options
 * @param {string} options.question - The system design question
 * @param {string} [options.cloudProvider='auto'] - Cloud provider (gcp/aws/azure/auto)
 * @param {string} [options.difficulty='medium'] - Difficulty level
 * @param {string} [options.category='System Design'] - Category
 * @param {string} [options.format='png'] - Output format (png/svg)
 * @param {string} [options.detailLevel='overview'] - Detail level: 'overview' (simple) or 'detailed' (comprehensive)
 * @returns {Promise<Object>} - Diagram result
 */
export async function generateDiagram(opts) {
  const {
    question,
    cloudProvider = 'auto',
    difficulty = 'medium',
    category = 'System Design',
    format = 'png',
    detailLevel = 'overview',
    direction = 'LR',
  } = opts;

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  ensureOutputDir();

  // Try the configured engine first; if it fails AND fallback is enabled
  // AND the engines differ, retry once with the other engine. The most
  // common failure modes for D2 are icon-CDN flakiness and (rarely) the
  // LLM emitting malformed DSL — both transient enough that a Graphviz
  // retry rescues the user-facing experience.
  const tryOrder = (DIAGRAM_ENGINE === 'd2' && FALLBACK_ENABLED)
    ? ['d2', 'graphviz']
    : (DIAGRAM_ENGINE === 'graphviz' && FALLBACK_ENABLED)
      ? ['graphviz', 'd2']
      : [DIAGRAM_ENGINE];

  let lastError = null;
  for (const engine of tryOrder) {
    try {
      const result = await runEngine(engine, {
        question, cloudProvider, difficulty, category,
        format, detailLevel, direction, apiKey,
      });
      if (engine !== DIAGRAM_ENGINE) {
        console.warn(`[PythonDiagrams] Primary engine '${DIAGRAM_ENGINE}' failed; succeeded on fallback '${engine}'`);
      }
      result.engine_used = engine;
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`[PythonDiagrams] Engine '${engine}' failed: ${err.message}`);
    }
  }
  throw lastError || new Error('All configured diagram engines failed');
}

/**
 * Spawn one engine and resolve to the parsed result, or reject. Wrapped
 * by generateDiagram() so the fallback loop can drive multiple attempts.
 */
function runEngine(engine, { question, cloudProvider, difficulty, category, format, detailLevel, direction, apiKey }) {
  const enginePath = resolveEnginePath(engine);
  return new Promise((resolve, reject) => {
    console.log('[PythonDiagrams] Generating diagram...');
    console.log('[PythonDiagrams] Engine:', engine);
    console.log('[PythonDiagrams] Detail level:', detailLevel);
    console.log('[PythonDiagrams] Engine path:', enginePath);
    console.log('[PythonDiagrams] Output dir:', OUTPUT_DIR);

    const args = [
      enginePath,
      '--question', question,
      '--provider', cloudProvider,
      '--difficulty', difficulty,
      '--category', category,
      '--format', format,
      '--output-dir', OUTPUT_DIR,
      '--api-key', apiKey,
      '--detail-level', detailLevel,
      '--direction', direction
    ];

    // Use venv Python on Railway, fall back to system python3 locally
    const pythonBin = fs.existsSync('/app/.venv/bin/python3') ? '/app/.venv/bin/python3' : 'python3';
    const pythonProcess = spawn(pythonBin, args, {
      cwd: OUTPUT_DIR,
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: apiKey
      }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      console.log('[PythonDiagrams] Process exited with code:', code);
      console.log('[PythonDiagrams] stdout:', stdout);
      console.log('[PythonDiagrams] stderr:', stderr);

      if (code !== 0) {
        const errorMsg = stderr || stdout || 'Unknown error';
        console.error('[PythonDiagrams] Generation failed:', errorMsg);
        reject(new Error(`Diagram generation failed: ${errorMsg}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (!result.success) {
          reject(new Error(result.error || 'Engine reported failure'));
          return;
        }

        // Convert absolute path to relative URL path
        if (result.image_path) {
          const filename = path.basename(result.image_path);
          result.image_url = `/static/diagrams/${filename}`;
        }

        resolve(result);
      } catch (parseErr) {
        console.error('[PythonDiagrams] Failed to parse output:', stdout);
        reject(new Error(`Failed to parse diagram result: ${parseErr.message}`));
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('[PythonDiagrams] Process error:', err);
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });

    // Timeout after 150 seconds (3 Claude attempts + import validation)
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Diagram generation timed out after 150 seconds'));
    }, 150000);
  });
}

/**
 * Get the output directory path
 */
export function getOutputDir() {
  return OUTPUT_DIR;
}

/**
 * Clean up old diagram files (older than 1 hour)
 */
export function cleanupOldDiagrams() {
  const maxAge = 10 * 60 * 1000; // 10 minutes (staging area only — images persist in DB)
  const now = Date.now();

  try {
    if (!fs.existsSync(OUTPUT_DIR)) return;

    const files = fs.readdirSync(OUTPUT_DIR);
    for (const file of files) {
      const filePath = path.join(OUTPUT_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error('[PythonDiagrams] Cleanup error:', err);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldDiagrams, 30 * 60 * 1000);
