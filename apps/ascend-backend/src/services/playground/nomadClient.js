const NOMAD_ADDR = () => {
  const addr = process.env.NOMAD_ADDR;
  if (!addr) throw new Error('NOMAD_ADDR not configured');
  return addr;
};

const NOMAD_TOKEN = () => process.env.NOMAD_TOKEN || null;

const IMAGES = {
  ubuntu: 'chundubabu/pg-ubuntu:latest',
  docker: 'chundubabu/pg-docker:latest',
  'k8s-single': 'chundubabu/pg-k8s-single:latest',
  'k8s-multi': 'chundubabu/pg-k8s-multi:latest',
  'cloud-cli': 'chundubabu/pg-cloud-cli:latest',
};

const RESOURCES = {
  ubuntu: { CPU: 500, MemoryMB: 512 },
  docker: { CPU: 1000, MemoryMB: 1024 },
  'k8s-single': { CPU: 2000, MemoryMB: 2048 },
  'k8s-multi': { CPU: 3000, MemoryMB: 4096 },
  'cloud-cli': { CPU: 500, MemoryMB: 512 },
};

function nomadHeaders() {
  const token = NOMAD_TOKEN();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Nomad-Token'] = token;
  return headers;
}

export async function scheduleJob(sessionId, environment, scenarioId) {
  const addr = NOMAD_ADDR();
  const image = IMAGES[environment];
  if (!image) throw new Error(`Unknown environment: ${environment}`);
  const resources = RESOURCES[environment];

  const jobId = `pg-${sessionId}`;
  const taskEnv = { SESSION_ID: sessionId };
  if (scenarioId) taskEnv.SCENARIO_ID = scenarioId;

  const jobSpec = {
    Job: {
      ID: jobId,
      Name: jobId,
      Type: 'service',
      Datacenters: ['linode-us-east'],
      TaskGroups: [
        {
          Name: 'terminal',
          Count: 1,
          Tasks: [
            {
              Name: 'ttyd',
              Driver: 'docker',
              Config: {
                image,
                runtime: 'sysbox-runc',
                ports: ['ttyd'],
              },
              Env: taskEnv,
              Resources: resources,
              KillTimeout: 10_000_000_000,
            },
          ],
          Networks: [
            {
              DynamicPorts: [{ Label: 'ttyd', To: 7681 }],
            },
          ],
        },
      ],
    },
  };

  const res = await fetch(`${addr}/v1/jobs`, {
    method: 'POST',
    headers: nomadHeaders(),
    body: JSON.stringify(jobSpec),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nomad scheduleJob failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  return { jobId, evalId: data.EvalID };
}

export async function stopJob(jobId) {
  const addr = NOMAD_ADDR();
  const res = await fetch(`${addr}/v1/job/${encodeURIComponent(jobId)}?purge=true`, {
    method: 'DELETE',
    headers: nomadHeaders(),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Nomad stopJob failed ${res.status}: ${text}`);
  }
}

export async function getAllocations(jobId) {
  const addr = NOMAD_ADDR();
  const res = await fetch(`${addr}/v1/job/${encodeURIComponent(jobId)}/allocations`, {
    headers: nomadHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nomad getAllocations failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getTaskAddress(jobId) {
  const addr = NOMAD_ADDR();
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const allocs = await getAllocations(jobId);
    const running = allocs.find((a) => a.ClientStatus === 'running');

    if (running) {
      const allocRes = await fetch(
        `${addr}/v1/allocation/${running.ID}`,
        { headers: nomadHeaders() },
      );
      if (allocRes.ok) {
        const allocData = await allocRes.json();
        const ports = allocData?.AllocatedResources?.Shared?.Ports || [];
        const ttydPort = ports.find((p) => p.Label === 'ttyd');
        if (ttydPort) {
          return { host: ttydPort.HostIP || running.NodeID, port: ttydPort.Value };
        }
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error('Timed out waiting for Nomad allocation to become running');
}

export async function execInAlloc(allocId, taskName, command) {
  const addr = NOMAD_ADDR();
  const res = await fetch(
    `${addr}/v1/client/allocation/${encodeURIComponent(allocId)}/exec`,
    {
      method: 'POST',
      headers: nomadHeaders(),
      body: JSON.stringify({
        Command: Array.isArray(command) ? command : ['/bin/sh', '-c', command],
        Task: taskName,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nomad execInAlloc failed ${res.status}: ${text}`);
  }
  const data = await res.json();
  return { stdout: data.stdout || '', exitCode: data.exit_code ?? 0 };
}
