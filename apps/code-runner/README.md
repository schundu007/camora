# Code runner deployment

The code runner must be deployed as a private service. Set the same randomly
generated `CODE_RUNNER_API_KEY` on this service and on every backend that calls
it. Do not expose port 4000 publicly.

The included image runs as the unprivileged `runner` user and removes
application-level access to the parent process environment. The deployment
platform must additionally provide:

- no outbound network access for the runner container;
- read-only root filesystem with only the temporary directory writable;
- dropped Linux capabilities and `no-new-privileges`;
- per-process CPU, memory, process-count, and disk quotas.

These controls cannot be reliably enforced by Node or Express alone.
