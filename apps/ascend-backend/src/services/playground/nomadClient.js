import { Client } from 'ssh2';
import net from 'net';

const WORKER_HOST = () => process.env.WORKER_HOST || '172.104.210.63';
const WORKER_USER = () => process.env.WORKER_USER || 'pgrunner';

function workerKey() {
  const b64 = process.env.WORKER_SSH_KEY_B64;
  if (!b64) throw new Error('WORKER_SSH_KEY_B64 not configured');
  return Buffer.from(b64, 'base64').toString('utf8');
}

const IMAGES = {
  ubuntu: 'chundubabu/pg-ubuntu:latest',
  docker: 'chundubabu/pg-docker:latest',
  'agent-sandbox': 'chundubabu/pg-agent-sandbox:latest',
  'k8s-single': 'chundubabu/pg-k8s-single:latest',
  'k8s-multi': 'chundubabu/pg-k8s-multi:latest',
  'cloud-cli': 'chundubabu/pg-cloud-cli:latest',
};

const MEMORY_MB = {
  ubuntu: 512,
  docker: 1024,
  'agent-sandbox': 1536,
  'k8s-single': 2048,
  'k8s-multi': 4096,
  'cloud-cli': 1536,
};

function sshExec(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let done = false;
    const finish = (fn, val) => { if (!done) { done = true; conn.end(); fn(val); } };

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) return finish(reject, err);
        let stdout = '';
        let stderr = '';
        stream.on('data', (d) => { stdout += d; });
        stream.stderr.on('data', (d) => { stderr += d; });
        stream.on('close', (code) => {
          if (code !== 0) {
            finish(reject, new Error(`ssh exec exit ${code}: ${stderr.trim() || stdout.trim()}`));
          } else {
            finish(resolve, stdout.trim());
          }
        });
      });
    });

    conn.on('error', (err) => finish(reject, err));

    conn.connect({
      host: WORKER_HOST(),
      port: parseInt(process.env.WORKER_SSH_PORT || '20022', 10),
      username: WORKER_USER(),
      privateKey: workerKey(),
      readyTimeout: 10_000,
    });
  });
}

export async function scheduleJob(sessionId, environment, scenarioId) {
  const image = IMAGES[environment];
  if (!image) throw new Error(`Unknown environment: ${environment}`);

  const mem = MEMORY_MB[environment] || 512;
  const hostname = `playground-${environment}`;
  const envFlags = [
    `-e SESSION_ID=${sessionId}`,
    `-e force_color_prompt=yes`,
  ];
  if (scenarioId) envFlags.push(`-e SCENARIO_ID=${scenarioId}`);

  const cmd = `docker run -d --rm --pull=always --memory=${mem}m --hostname ${hostname} ${envFlags.join(' ')} -p 0:7681 -p 0:8080 ${image}`;
  const containerId = await sshExec(cmd);

  if (!containerId || containerId.length < 12) {
    throw new Error(`docker run returned unexpected output: ${containerId}`);
  }

  return { jobId: containerId };
}

export async function getTaskAddress(jobId) {
  const deadline = Date.now() + 60_000;

  // Wait for Docker port mappings for BOTH 7681 (ttyd) and 8080 (code-server).
  let ttydPort = null;
  let codeServerPort = null;
  while (Date.now() < deadline) {
    try {
      if (!ttydPort) {
        const out = await sshExec(`docker port ${jobId} 7681`);
        for (const line of out.split('\n')) {
          const port = parseInt(line.split(':').at(-1), 10);
          if (port > 0) { ttydPort = port; break; }
        }
      }
      if (!codeServerPort) {
        const out = await sshExec(`docker port ${jobId} 8080`);
        for (const line of out.split('\n')) {
          const port = parseInt(line.split(':').at(-1), 10);
          if (port > 0) { codeServerPort = port; break; }
        }
      }
      if (ttydPort && codeServerPort) break;
    } catch { /* container starting */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ttydPort) throw new Error('Timed out waiting for ttyd port mapping');
  if (!codeServerPort) throw new Error('Timed out waiting for code-server port mapping');

  // ttyd starts AFTER code-server readiness check (up to 30s). Probe until it accepts TCP.
  const probeDeadline = Date.now() + 90_000;
  while (Date.now() < probeDeadline) {
    const ready = await new Promise((resolve) => {
      const sock = net.connect(ttydPort, WORKER_HOST());
      sock.on('connect', () => { sock.destroy(); resolve(true); });
      sock.on('error', () => resolve(false));
      setTimeout(() => { sock.destroy(); resolve(false); }, 2000);
    });
    if (ready) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { host: WORKER_HOST(), ttydPort, codeServerPort };
}

export async function stopJob(jobId) {
  try {
    await sshExec(`docker stop ${jobId}`);
  } catch (err) {
    if (!err.message.includes('No such container')) throw err;
  }
}

export async function getAllocations() { return []; }
export async function execInAlloc() { return { stdout: '', exitCode: 0 }; }
