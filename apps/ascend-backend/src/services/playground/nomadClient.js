import { Client } from 'ssh2';

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
  'k8s-etcd': 'chundubabu/pg-k8s-single:latest',
  'cloud-cli': 'chundubabu/pg-cloud-cli:latest',
};

const MEMORY_MB = {
  ubuntu: 512,
  docker: 1024,
  'agent-sandbox': 1536,
  'k8s-single': 2048,
  'k8s-multi': 4096,
  'k8s-etcd': 2048,
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

  // Return as soon as port mappings exist — don't wait for TCP readiness.
  // The frontend shows real-time boot progress via SSE while the container finishes starting.
  return { host: WORKER_HOST(), ttydPort, codeServerPort };
}

export async function stopJob(jobId) {
  try {
    await sshExec(`docker stop ${jobId}`);
  } catch (err) {
    if (!err.message.includes('No such container')) throw err;
  }
}

export async function execScriptInContainer(containerId, scriptContent) {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const tmpFile = `/tmp/pg-setup-${containerId.slice(0, 8)}.sh`;
  await sshExec(
    `echo '${b64}' | base64 -d > ${tmpFile} && ` +
    `docker cp ${tmpFile} ${containerId}:/tmp/setup.sh && ` +
    `docker exec ${containerId} bash /tmp/setup.sh && ` +
    `rm -f ${tmpFile}`,
  );
}

export async function execScriptInContainerStream(containerId, scriptContent, onLine) {
  const b64 = Buffer.from(scriptContent).toString('base64');
  const tmpFile = `/tmp/pg-setup-${containerId.slice(0, 8)}.sh`;
  await sshExec(
    `echo '${b64}' | base64 -d > ${tmpFile} && docker cp ${tmpFile} ${containerId}:/tmp/setup.sh && rm -f ${tmpFile}`,
  );

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let done = false;
    const finish = (fn, val) => { if (!done) { done = true; conn.end(); fn(val); } };

    conn.on('ready', () => {
      conn.exec(`docker exec ${containerId} bash /tmp/setup.sh`, (err, stream) => {
        if (err) return finish(reject, err);
        let buf = '';
        stream.on('data', (d) => {
          buf += d.toString();
          const parts = buf.split('\n');
          buf = parts.pop();
          for (const line of parts) { if (line.trim()) onLine(line); }
        });
        stream.stderr.on('data', () => {});
        stream.on('close', (code) => {
          if (buf.trim()) onLine(buf);
          if (code !== 0) finish(reject, new Error(`setup script exit ${code}`));
          else finish(resolve, undefined);
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

export async function getAllocations() { return []; }
export async function execInAlloc() { return { stdout: '', exitCode: 0 }; }

export function getWorkerHost() {
  return WORKER_HOST();
}

async function scheduleEtcdCluster(sessionId, networkName) {
  const image = 'chundubabu/pg-etcd-node:latest';
  const initialCluster = 'etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380';
  const nodes = [];
  for (let i = 1; i <= 3; i++) {
    const nodeName = `etcd${i}`;
    const envFlags = [
      `-e SESSION_ID=${sessionId}`,
      `-e force_color_prompt=yes`,
      `-e NODE_NAME=${nodeName}`,
      `-e INITIAL_CLUSTER=${initialCluster}`,
    ].join(' ');
    const cmd = `docker run -d --rm --pull=always --memory=512m --network ${networkName} --hostname ${nodeName} --name pg-${sessionId}-${nodeName} ${envFlags} -p 0:7681 ${image}`;
    const containerId = await sshExec(cmd);
    if (!containerId || containerId.length < 12) throw new Error(`etcd node ${nodeName} failed to start`);
    nodes.push({ nodeIndex: i - 1, nodeName, containerId, role: 'etcd' });
  }
  return nodes;
}

async function scheduleK8sMultiCluster(sessionId, networkName) {
  const image = 'chundubabu/pg-k8s-multi:latest';
  const serverEnvFlags = `-e SESSION_ID=${sessionId} -e force_color_prompt=yes`;
  const serverCmd = `docker run -d --rm --pull=always --memory=2048m --network ${networkName} --hostname k8s-master --name pg-${sessionId}-master --privileged ${serverEnvFlags} -p 0:7681 -p 0:8080 ${image}`;
  const serverContainerId = await sshExec(serverCmd);
  if (!serverContainerId || serverContainerId.length < 12) throw new Error('k8s-multi server failed to start');

  let token = null;
  const tokenDeadline = Date.now() + 90_000;
  while (Date.now() < tokenDeadline) {
    try {
      const out = await sshExec(`docker exec ${serverContainerId} cat /var/lib/rancher/k3s/server/node-token 2>/dev/null`);
      if (out && out.trim().length > 10) { token = out.trim(); break; }
    } catch {}
    await new Promise(r => setTimeout(r, 3000));
  }
  if (!token) throw new Error('k3s server did not generate node-token in time');

  const nodes = [{ nodeIndex: 0, nodeName: 'k8s-master', containerId: serverContainerId, role: 'server' }];

  for (let i = 1; i <= 2; i++) {
    const nodeName = `k8s-node${i}`;
    const agentEnvFlags = [
      `-e SESSION_ID=${sessionId}`,
      `-e force_color_prompt=yes`,
      `-e K3S_ROLE=agent`,
      `-e K3S_URL=https://k8s-master:6443`,
      `-e K3S_TOKEN=${token}`,
    ].join(' ');
    const cmd = `docker run -d --rm --memory=1024m --network ${networkName} --hostname ${nodeName} --name pg-${sessionId}-${nodeName} --privileged ${agentEnvFlags} -p 0:7681 ${image}`;
    const containerId = await sshExec(cmd);
    if (!containerId || containerId.length < 12) throw new Error(`k8s agent ${nodeName} failed to start`);
    nodes.push({ nodeIndex: i, nodeName, containerId, role: 'agent' });
  }
  return nodes;
}

export async function scheduleCluster(sessionId, environment) {
  const networkName = `pg-net-${sessionId}`;
  await sshExec(`docker network create ${networkName}`);
  let nodes;
  if (environment === 'etcd-cluster') {
    nodes = await scheduleEtcdCluster(sessionId, networkName);
  } else if (environment === 'k8s-multi') {
    nodes = await scheduleK8sMultiCluster(sessionId, networkName);
  } else {
    throw new Error(`Unknown cluster environment: ${environment}`);
  }
  return { networkName, nodes };
}

export async function getClusterAddresses(nodes) {
  const deadline = Date.now() + 90_000;
  const host = WORKER_HOST();
  return Promise.all(nodes.map(async (node) => {
    let ttydPort = null;
    while (Date.now() < deadline && !ttydPort) {
      try {
        const out = await sshExec(`docker port ${node.containerId} 7681`);
        for (const line of out.split('\n')) {
          const port = parseInt(line.split(':').at(-1), 10);
          if (port > 0) { ttydPort = port; break; }
        }
      } catch {}
      if (!ttydPort) await new Promise(r => setTimeout(r, 500));
    }
    if (!ttydPort) throw new Error(`Timed out waiting for ttyd port on ${node.nodeName}`);

    let codeServerPort = null;
    if (node.role === 'server') {
      const ideDeadline = Date.now() + 30_000;
      while (Date.now() < ideDeadline && !codeServerPort) {
        try {
          const out = await sshExec(`docker port ${node.containerId} 8080`);
          for (const line of out.split('\n')) {
            const port = parseInt(line.split(':').at(-1), 10);
            if (port > 0) { codeServerPort = port; break; }
          }
        } catch {}
        if (!codeServerPort) await new Promise(r => setTimeout(r, 500));
      }
    }
    return { ...node, host, ttydPort, codeServerPort, status: 'provisioning' };
  }));
}

export async function stopCluster(networkName, containerIds) {
  await Promise.allSettled(containerIds.map(id => sshExec(`docker stop ${id}`).catch(() => {})));
  try { await sshExec(`docker network rm ${networkName}`); } catch {}
}
