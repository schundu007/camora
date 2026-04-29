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

/**
 * Mermaid fallback — generate Mermaid flowchart code via a single Claude call.
 * Much faster (~3s) than the full Python diagrams pipeline (60-150s).
 * Used as a fallback when generateDiagram() fails or times out.
 *
 * @param {Object} options
 * @param {string} options.question - The system design question
 * @param {string} [options.cloudProvider='aws'] - Cloud provider hint
 * @param {string} [options.detailLevel='overview'] - Detail level
 * @returns {Promise<Object>} - { success, type: 'mermaid', mermaid_code }
 */
export async function generateMermaidFallback({ question, cloudProvider = 'aws', detailLevel = 'overview', direction = 'LR' }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  const dir = direction === 'TB' ? 'TB' : 'LR';
  const isDetailed = detailLevel === 'detailed';

  const detailInstructions = isDetailed
    ? `This is a DETAILED diagram. Include:
- All microservices with specific responsibilities
- Primary and replica databases with replication arrows
- Cache layers (Redis/Memcached) with TTL notes
- Message queues (Kafka/RabbitMQ) with topic names
- CDN, DNS, load balancers with algorithms (round-robin, consistent hash)
- Monitoring, logging, rate limiting components
- Use subgraphs to group: Client, Edge, Application, Data, Infrastructure
- Add edge labels describing data flow (e.g., "write", "async", "cache miss")`
    : `This is an OVERVIEW diagram. Include only the key components:
- Clients, load balancer, main services (2-4), primary database, cache
- Keep it clean and readable — no more than 12-15 nodes
- Use subgraphs sparingly (max 2-3 groups)
- Add edge labels for key data flows only`;

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Generate a Mermaid flowchart diagram for this system design: "${question}"

Cloud provider: ${cloudProvider}
Direction: ${dir} (${dir === 'LR' ? 'left-to-right horizontal' : 'top-to-bottom vertical'})

${detailInstructions}

IMPORTANT: The diagram MUST start with "flowchart ${dir}" — use ${dir === 'LR' ? 'horizontal left-to-right' : 'vertical top-to-bottom'} layout.

Example format:
flowchart ${dir}
  subgraph Client
    A[Web Client]
    B[Mobile Client]
  end
  A & B --> C[Load Balancer]
  C --> D[API Gateway]
  subgraph Services
    D --> E[Auth Service]
    D --> F[Core Service]
  end
  F --> G[(PostgreSQL)]
  F --> H[(Redis Cache)]

Return ONLY the mermaid code, no markdown fences, no explanation.`
    }]
  });

  let code = resp.content[0].text.trim();
  // Strip markdown fences if present
  code = code.replace(/^```(?:mermaid)?\n?/g, '').replace(/\n?```$/g, '').trim();

  return { success: true, type: 'mermaid', mermaid_code: code };
}
