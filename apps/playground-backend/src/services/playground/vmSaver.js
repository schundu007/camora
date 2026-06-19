// apps/playground-backend/src/services/playground/vmSaver.js
import { Client } from 'ssh2';
import { presignPut, presignGet, deleteObject, headObject } from './r2Client.js';

const WORKER_HOST = () => process.env.WORKER_HOST || '172.104.210.63';
const WORKER_USER = () => process.env.WORKER_USER || 'pgrunner';

function workerKey() {
  const b64 = process.env.WORKER_SSH_KEY_B64;
  if (!b64) throw new Error('WORKER_SSH_KEY_B64 not configured');
  return Buffer.from(b64, 'base64').toString('utf8');
}

function sshExec(command, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let done = false;
    const finish = (fn, val) => { if (!done) { done = true; conn.end(); fn(val); } };
    const timer = setTimeout(() => finish(reject, new Error(`SSH exec timeout`)), timeoutMs);

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timer); return finish(reject, err); }
        let stdout = '', stderr = '';
        stream.on('data', d => { stdout += d; });
        stream.stderr.on('data', d => { stderr += d; });
        stream.on('close', code => {
          clearTimeout(timer);
          if (code !== 0) finish(reject, new Error(`exit ${code}: ${stderr.trim() || stdout.trim()}`));
          else finish(resolve, stdout.trim());
        });
      });
    });
    conn.on('error', err => { clearTimeout(timer); finish(reject, err); });
    conn.connect({
      host: WORKER_HOST(),
      port: parseInt(process.env.WORKER_SSH_PORT || '20022', 10),
      username: WORKER_USER(),
      privateKey: workerKey(),
      readyTimeout: 10_000,
    });
  });
}

export async function exportVmToR2(containerId, r2Key) {
  // 2hr presigned PUT — export can be slow for large containers
  const putUrl = await presignPut(r2Key, 7200);
  // Worker streams docker export directly to R2 — no data routes through backend
  await sshExec(
    `docker export ${containerId} | curl -sf -X PUT -T - -H "Content-Type: application/octet-stream" "${putUrl}"`,
    15 * 60 * 1000
  );
  const { ContentLength } = await headObject(r2Key);
  return { sizeBytes: ContentLength };
}

export async function importVmFromR2(r2Key, imageTag) {
  const getUrl = await presignGet(r2Key, 3600);
  // Worker downloads from R2 and imports — no data routes through backend
  await sshExec(
    `curl -sf "${getUrl}" | docker import - "${imageTag}"`,
    15 * 60 * 1000
  );
}

export async function deleteVmImage(imageTag) {
  try {
    await sshExec(`docker rmi "${imageTag}" 2>/dev/null || true`);
  } catch { /* best effort */ }
}

export async function deleteR2Object(r2Key) {
  try { await deleteObject(r2Key); } catch { /* best effort */ }
}
