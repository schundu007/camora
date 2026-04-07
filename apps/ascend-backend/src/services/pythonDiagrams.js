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

// Path to Python script
const DIAGRAM_ENGINE_PATH = path.join(__dirname, 'diagram_engine.py');

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
export async function generateDiagram({
  question,
  cloudProvider = 'auto',
  difficulty = 'medium',
  category = 'System Design',
  format = 'png',
  detailLevel = 'overview',
  direction = 'LR'
}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  ensureOutputDir();

  return new Promise((resolve, reject) => {
    console.log('[PythonDiagrams] Generating diagram...');
    console.log('[PythonDiagrams] Detail level:', detailLevel);
    console.log('[PythonDiagrams] Engine path:', DIAGRAM_ENGINE_PATH);
    console.log('[PythonDiagrams] Output dir:', OUTPUT_DIR);

    const args = [
      DIAGRAM_ENGINE_PATH,
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

        // Convert absolute path to relative URL path
        if (result.image_path && result.success) {
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
