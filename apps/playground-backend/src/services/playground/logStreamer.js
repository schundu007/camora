import { Client } from 'ssh2';

const WORKER_HOST = () => process.env.WORKER_HOST || '172.104.210.63';
const WORKER_USER = () => process.env.WORKER_USER || 'pgrunner';

function workerKey() {
  const b64 = process.env.WORKER_SSH_KEY_B64;
  if (!b64) throw new Error('WORKER_SSH_KEY_B64 not configured');
  return Buffer.from(b64, 'base64').toString('utf8');
}

export async function streamContainerLogs(jobId, onLine, abortSignal) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let resolved = false;
    const finish = (err) => {
      if (!resolved) {
        resolved = true;
        try { conn.end(); } catch {}
        if (err) reject(err); else resolve();
      }
    };

    conn.on('ready', () => {
      conn.exec(`docker logs -f ${jobId} 2>&1`, (err, stream) => {
        if (err) return finish(err);

        let buf = '';
        const handleData = (chunk) => {
          buf += chunk.toString();
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (line.trim()) onLine(line.trim());
          }
        };

        stream.on('data', handleData);
        stream.stderr.on('data', handleData);
        stream.on('close', () => finish(null));

        if (abortSignal) {
          abortSignal.addEventListener('abort', () => {
            try { stream.close(); } catch {}
            finish(null);
          }, { once: true });
        }
      });
    });

    conn.on('error', finish);
    conn.connect({
      host: WORKER_HOST(),
      port: parseInt(process.env.WORKER_SSH_PORT || '20022', 10),
      username: WORKER_USER(),
      privateKey: workerKey(),
      readyTimeout: 10_000,
    });
  });
}
