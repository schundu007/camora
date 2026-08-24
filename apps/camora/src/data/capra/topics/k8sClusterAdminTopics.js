// Kubernetes — Cluster Administration & Operations.
//
// Tier 1: kubernetes.io /docs/reference/using-api/api-concepts/,
// /docs/tasks/debug/ (CC BY 4.0, paraphrased), fetched 2026-08-24.
// Tier 2: ingress-nginx and Gateway API project docs.
//
// These topics exist because parity with /docs/concepts/ alone produces no
// error taxonomy — operational content lives under /docs/tasks/debug/ and
// status-code semantics under /docs/reference/. See k8s-doc-coverage.json.
//
// Category wiring: 'k8s-cluster-admin' in devopsCategories.

export const k8sClusterAdminTopics = [
  {
    id: 'k8s-apiserver-status-codes',
    title: 'Kubernetes API Errors — 4xx and 5xx Explained',
    icon: 'alertTriangle',
    color: '#ef4444',
    questions: 20,
    description:
      'What the API server actually returns and why: 401 versus 403, when 403 is really an admission webhook, 409 on optimistic concurrency, 410 Gone on expired watches, 422 on validation, 429 with Retry-After from API Priority and Fairness, and the 5xx family including etcd timeouts. Each with the retry strategy that belongs with it.',
    introduction: `Every interaction with Kubernetes is an HTTP call to the API server, so every failure arrives as an HTTP status code. Reading them correctly is the difference between "RBAC is broken" and "my controller has a stale cache", and those two have nothing in common.

The codes are not decorative. Kubernetes maps a specific internal \`reason\` onto each one — \`Unauthorized\`, \`Forbidden\`, \`Conflict\`, \`Gone\`, \`Invalid\`, \`TooManyRequests\` — and the response body carries a \`Status\` object with that reason and a human message. When you get an error from \`kubectl\`, the message you see is that \`Status.message\` field. Reading the code *and* the reason tells you which subsystem rejected you: authentication, authorization, admission, validation, concurrency control, or flow control.

Two distinctions cause most of the confusion in practice. First, **401 and 403 are different subsystems**: 401 means the API server could not work out who you are, 403 means it knows exactly who you are and you are not allowed. Second, **403 is overloaded**: RBAC denials and admission-webhook denials both return 403, and telling them apart is a matter of reading the message, not the code.

The other thing worth internalising early: several of these are *normal*. A 409 on a controller's update is expected under concurrent writes and the correct response is to re-read and retry, not to alert. A 410 on a watch is expected after etcd compaction and the correct response is to re-list. Treating routine codes as incidents is a common source of noise.`,
    topics: [
      {
        title: '401, 403 and 404 — authentication, authorization, and admission',
        content: `**401 Unauthorized — "I do not know who you are."** The authentication stage failed before any permission check happened. Causes: no credentials presented, an expired or malformed bearer token, a client certificate signed by a CA the API server does not trust, or an expired certificate. On bare-metal clusters the classic cause is expired kubeadm certificates — they are valid for one year and renew on control-plane upgrade, so the cluster nobody upgraded starts returning 401 to everything.

\`\`\`
error: You must be logged in to the server (Unauthorized)
\`\`\`

Check what the API server thinks you are:

\`\`\`bash
kubectl auth whoami
\`\`\`

**403 Forbidden — "I know who you are, and no."** Authentication succeeded; something after it refused. Two very different causes share this code:

*RBAC denial.* The message names the user, the verb and the resource:

\`\`\`
Error from server (Forbidden): pods is forbidden:
User "system:serviceaccount:dev:builder" cannot list resource "pods"
in API group "" in the namespace "prod"
\`\`\`

Diagnose without guessing, using the impersonation-based check:

\`\`\`bash
kubectl auth can-i list pods -n prod --as system:serviceaccount:dev:builder
kubectl auth can-i --list --as system:serviceaccount:dev:builder -n prod
\`\`\`

*Admission-webhook denial.* Same 403, entirely different subsystem — the request passed RBAC and was rejected by a validating webhook or a ValidatingAdmissionPolicy. The message says so explicitly:

\`\`\`
Error from server (Forbidden): admission webhook "validation.gatekeeper.sh"
denied the request: container must not run as root
\`\`\`

The tell is the phrase \`admission webhook "..." denied the request\`. If you see it, stop looking at RBAC — no Role change will help. Find the webhook:

\`\`\`bash
kubectl get validatingwebhookconfigurations
\`\`\`

Pod Security Admission rejections also land here, naming the violated standard and the specific field.

**404 Not Found — the object does not exist.** Worth stating clearly because people expect otherwise: Kubernetes does **not** hide the existence of objects behind 404 the way some systems do. If you lack permission you get 403, not 404. So a 404 genuinely means the object is not there — wrong name, wrong namespace, or a CRD whose custom resource type is not installed. That last case is distinctive: \`the server doesn't have a resource type "foo"\` means the CRD itself is missing, not the object.`,
      },
      {
        title: '409, 410 and 422 — concurrency, expired versions, and validation',
        content: `**409 Conflict — optimistic concurrency, and usually not a bug.** Every object carries an opaque \`metadata.resourceVersion\` that increases when the object changes. On a PUT or PATCH, if the resourceVersion you send does not match the server's current value, you get 409:

\`\`\`
Operation cannot be fulfilled on pods "my-pod": the object has been modified;
please apply your changes to the latest version and try again
\`\`\`

The documented retry strategy is exactly what it says: re-read the object, re-apply your change to the fresh copy, retry. Controllers do this constantly and it is normal — a burst of 409s under contention is the mechanism working, not failing. Client libraries provide \`RetryOnConflict\` helpers for precisely this loop.

Do not parse the resourceVersion. It is explicitly opaque, cluster-scoped, and not a number you should reason about.

409 also appears on **create** when the object already exists (\`AlreadyExists\`), which is a different situation with the same code — read the reason field.

**410 Gone — "that resourceVersion is too old."** The version you are watching from has been compacted out of etcd's history:

\`\`\`
too old resource version: 1000 (1234567)
\`\`\`

This is the single most misread error for anyone writing a controller. It does not mean data loss and it does not mean the API is broken. It means your watch fell far enough behind — or your process was paused long enough — that the change history you asked to resume from no longer exists. It becomes common after heavy cluster activity or a long client outage.

Recovery: for a watch, restart it without a resourceVersion (or from a recent one) to resync from current state; for a list, retry without the parameter. Back off exponentially before retrying. Informer frameworks handle this by relisting automatically, which is why a well-written controller survives it silently and a hand-rolled watch loop does not.

**422 Unprocessable Entity — the object is malformed.** Schema validation failed: a field of the wrong type, a required field missing, a value outside its allowed range. The reason is \`Invalid\` and the message enumerates each failing field path:

\`\`\`
Deployment.apps "web" is invalid: spec.replicas: Invalid value: -1:
must be greater than or equal to 0
\`\`\`

Note the boundary against 403: **structural validity is 422; policy is 403.** A negative replica count is 422. A perfectly valid Deployment your admission policy dislikes is 403. Getting this backwards sends people to the wrong subsystem.

**406 Not Acceptable** — you asked for a media type the server cannot produce, via an \`Accept\` header it does not support. Rare in practice, and almost always a client-library or content-negotiation problem rather than a cluster one.`,
      },
      {
        title: '429 and API Priority and Fairness — the one you must not retry naively',
        content: `**429 Too Many Requests** means the API server shed your request deliberately to protect itself. The response carries a **\`Retry-After\`** header, and honouring it matters more than for any other code here.

API Priority and Fairness is the mechanism. Rather than one global rate limit, APF classifies every request into a *flow schema* and assigns it to a *priority level* with its own concurrency share and queue. A misbehaving controller hammering the API is isolated to its own priority level instead of starving \`kubectl\` and the scheduler. That isolation is the entire point, and it is why 429 is a targeted signal about *your* client rather than a statement that the cluster is overloaded.

Inspect the configuration:

\`\`\`bash
kubectl get flowschemas
kubectl get prioritylevelconfigurations
\`\`\`

The relevant response headers name which flow schema and priority level handled the request — \`X-Kubernetes-PF-FlowSchema-UID\` and \`X-Kubernetes-PF-PriorityLevel-UID\` — which is how you find out which bucket you landed in.

**Why naive retry is actively harmful.** Retrying immediately on 429 turns backpressure into a retry storm: the server sheds more, the client retries more, and the queue never drains. This is the classic metastable failure — the system stays broken after the original trigger is gone, because the retries are now the load. Correct handling is to honour \`Retry-After\`, then back off exponentially **with jitter** so a fleet of clients does not resynchronise into waves. A retry budget — cap retries as a fraction of total requests — is the stronger version.

**Distinguish from client-side throttling.** kubectl and controllers also self-throttle, which looks similar but is not a 429:

\`\`\`
Waited for 1.14s due to client-side throttling, not priority and fairness
\`\`\`

That message is the client's own rate limiter (\`--qps\` / \`--burst\`), and the message explicitly says it is *not* APF. The fix is client configuration, not cluster capacity.`,
      },
      {
        title: 'The 5xx family — when it is the cluster, not you',
        content: `4xx means the request was rejected. 5xx means the server failed to process it, and the causes are worth separating.

**500 Internal Server Error.** A genuine server-side failure. The most operationally important variant on self-managed clusters is an etcd problem surfacing through the API:

\`\`\`
etcdserver: request timed out
etcdserver: too many requests
rpc error: code = DeadlineExceeded
\`\`\`

\`etcdserver: request timed out\` is almost always **disk latency**, not network. etcd is deliberately sensitive to fsync latency; a leader that cannot commit its Raft log in time loses leadership, and past a threshold this becomes an election storm where no leader lasts long enough to make progress. The visible symptom is exactly this: writes timing out, \`kubectl\` hanging. Check \`etcd_disk_wal_fsync_duration_seconds\` p99 against the 25 ms working SLO before looking anywhere else.

A second 500 source is a **failing admission webhook**. A webhook whose \`failurePolicy\` is \`Fail\` and whose service is down will fail every matching request. This is the classic self-inflicted cluster outage: a webhook that intercepts Pods, deployed *into* the cluster, whose own Pods cannot start because the webhook is down. Mitigations are a \`namespaceSelector\` excluding \`kube-system\`, a sensible \`timeoutSeconds\`, and thinking hard before choosing \`Fail\`.

**503 Service Unavailable.** The API server is up but cannot serve. Common forms:

- \`apiserver is shutting down\` — during a rolling control-plane restart or upgrade. Transient; retry.
- An **aggregated API** is unavailable: \`no endpoints available for service "v1beta1.metrics.k8s.io"\`. Only that API group fails — \`kubectl top\` and HPAs break while core resources work fine. Check \`kubectl get apiservices\` for any not \`Available\`. A stale APIService whose backing service is gone also blocks namespace deletion, which is the usual reason a namespace hangs in \`Terminating\`.

**504 Gateway Timeout.** The API server proxied a request and the far end did not answer in time — a webhook exceeding its timeout, or the apiserver-to-kubelet path failing on \`kubectl logs\` or \`exec\`. On bare metal that path is worth remembering from the architecture topic: it is the direction that needs \`--kubelet-certificate-authority\` or Konnectivity.

**Triage order.** Distinguish "the API server is unreachable" from "the API server is rejecting me". If \`kubectl get --raw /readyz\` answers, the server is alive and your problem is a 4xx. If it does not, work through the control plane:

\`\`\`bash
kubectl get --raw /readyz?verbose
kubectl get --raw /livez?verbose
crictl ps -a | grep -E 'apiserver|etcd'     # on a control-plane node
journalctl -u kubelet -f
\`\`\``,
      },
    ],
    quickFire: [
      { q: '401 versus 403 — what is the difference?', a: '401 means authentication failed: the API server could not determine who you are. 403 means authentication succeeded and authorization or admission refused you. Different subsystems entirely.' },
      { q: 'You get 403 — how do you know whether it is RBAC or an admission webhook?', a: 'Read the message. RBAC says \'User "x" cannot <verb> resource "y"\'. Admission says \'admission webhook "z" denied the request\'. No Role change fixes the second.' },
      { q: 'Does Kubernetes return 404 to hide objects you cannot see?', a: 'No. Lacking permission gives 403, not 404. A 404 genuinely means the object is absent — wrong name, wrong namespace, or a missing CRD.' },
      { q: 'What does "the server doesn\'t have a resource type" mean?', a: 'The CRD is not installed. The resource type itself is unknown, not just the object.' },
      { q: 'What causes 409 Conflict on an update?', a: 'The resourceVersion you sent no longer matches the server. Optimistic concurrency detected a concurrent modification. Re-read, re-apply, retry.' },
      { q: 'Is a burst of 409s a bug?', a: 'No — it is contention, and the mechanism working. Controllers hit this routinely and use RetryOnConflict helpers.' },
      { q: 'Can you parse resourceVersion to compare versions?', a: 'No. It is explicitly opaque and cluster-scoped. Treat it as a token, never as a number.' },
      { q: 'What does "too old resource version" mean?', a: '410 Gone — the resourceVersion you resumed a watch from has been compacted out of etcd history. Not data loss and not a broken API.' },
      { q: 'How do you recover from 410 on a watch?', a: 'Restart the watch without a resourceVersion (or from a recent one) to resync from current state; relist for a list. Back off first. Informers do this automatically.' },
      { q: 'When do you get 422 rather than 403?', a: '422 is structural — malformed object, wrong type, out-of-range value. 403 is policy — a valid object your admission rules reject.' },
      { q: 'What does 429 mean, and what must you honour?', a: 'The API server shed the request deliberately. Honour the Retry-After header, then back off exponentially with jitter.' },
      { q: 'What is API Priority and Fairness for?', a: 'Classifying requests into flow schemas and priority levels with separate concurrency and queues, so a misbehaving client is isolated to its own level rather than starving kubectl and the scheduler.' },
      { q: 'Why is retrying a 429 immediately harmful?', a: 'It converts backpressure into a retry storm. The server sheds more, clients retry more, and the queue never drains — a metastable failure that outlives its trigger.' },
      { q: 'How do you tell APF throttling from client-side throttling?', a: 'The client message says so: "Waited ... due to client-side throttling, not priority and fairness". That is the client\'s own qps/burst limiter, not a 429.' },
      { q: 'What does "etcdserver: request timed out" usually mean?', a: 'Disk latency, not network. Check etcd_disk_wal_fsync_duration_seconds p99 against the 25 ms SLO. Left alone it becomes a leader-election storm.' },
      { q: 'How can an admission webhook take down a cluster?', a: 'failurePolicy: Fail plus a webhook whose own Pods cannot start — it intercepts the Pods needed to run itself. Exclude kube-system via namespaceSelector, set a tight timeout, and think hard before choosing Fail.' },
      { q: 'What does 503 with "no endpoints available for service v1beta1.metrics.k8s.io" mean?', a: 'An aggregated API is down. Only that group fails — kubectl top and HPAs break while core resources are fine. Check kubectl get apiservices.' },
      { q: 'Why would a namespace hang in Terminating?', a: 'Commonly a stale APIService whose backing service is gone: namespace deletion enumerates all API groups and blocks on the unavailable one. Also finalizers that no controller is left to clear.' },
      { q: 'What causes 504 from the API server?', a: 'A proxied request timed out — a slow admission webhook, or the apiserver-to-kubelet path on kubectl logs/exec.' },
      { q: 'First command to tell "unreachable" from "rejecting me"?', a: 'kubectl get --raw /readyz?verbose. If it answers, the server is alive and you have a 4xx. If not, go to the control-plane node — crictl ps and journalctl -u kubelet.' },
    ],
    references: [
      'https://kubernetes.io/docs/reference/using-api/api-concepts/',
      'https://kubernetes.io/docs/concepts/cluster-administration/flow-control/',
      'https://kubernetes.io/docs/reference/access-authn-authz/authentication/',
      'https://kubernetes.io/docs/reference/access-authn-authz/rbac/',
      'https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/',
      'https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/',
      'https://kubernetes.io/docs/concepts/security/pod-security-admission/',
      'https://kubernetes.io/docs/tasks/debug/debug-cluster/',
      'https://etcd.io/docs/v3.5/op-guide/hardware/',
    ],
  },

  {
    id: 'k8s-ingress-5xx-debugging',
    title: 'Ingress 4xx and 5xx — Debugging the Data Path',
    icon: 'share2',
    color: '#f59e0b',
    questions: 18,
    description:
      'The errors users actually see: 502 versus 503 versus 504 and what each proves about where the failure is, why rolling updates emit 502s without a preStop hook, the Service-to-EndpointSlice checks that explain an empty upstream, and the 4xx caused by proxy limits rather than by clients.',
    introduction: `API-server errors are what *you* see. Ingress errors are what your *users* see, and they are a separate diagnostic problem with a separate method.

The single most useful idea: **each 5xx tells you how far the request got.** A 502 means the proxy reached an upstream and the connection failed. A 503 usually means there was no upstream to try. A 504 means an upstream accepted the request and never answered. Those three point at three different subsystems, and reading them precisely removes most of the guesswork before you touch a log.

The second idea is that the most common production 5xx is not a bug in anyone's code. It is **503 with no ready endpoints**, and it is a configuration or lifecycle problem: a selector that matches nothing, probes failing so nothing is Ready, or a rolling update that removed endpoints faster than the proxy learned about it. That last one is the one that generates support tickets during deploys, and it is fixable in a few lines of Pod spec.

Work outside-in: the proxy's own logs first, then endpoints, then the Pod. Most people start at the Pod and waste time, because a healthy Pod tells you nothing about whether the proxy could reach it.`,
    topics: [
      {
        title: '502, 503, 504 — reading the code as a location',
        content: `**502 Bad Gateway — the proxy reached an upstream and the connection failed.** Something is listening, or was, and the conversation broke. Causes:

- The container is listening on a different port than \`targetPort\`. The endpoint exists, so the proxy tries it; the connect is refused.
- The application binds \`127.0.0.1\` instead of \`0.0.0.0\`. It works when you \`exec\` in and curl locally, and refuses everything from outside the Pod. A very common cause of "it works in the container but not through the Service".
- The upstream crashed mid-request, or reset the connection.
- Protocol mismatch — the proxy speaks HTTP to a TLS-only backend, or plain HTTP/2 (gRPC) to something expecting HTTP/1.1. gRPC upstreams need the backend protocol annotation, or the proxy speaks the wrong thing.

**503 Service Unavailable — usually there was nothing to try.** In ingress-nginx this is what an empty upstream group produces. Almost always one of:

- **Selector mismatch.** The Service selector does not match the Pod labels, so the EndpointSlice is empty. Silent by design: nothing errors, the Service simply has no backends.
- **No Ready Pods.** Pods exist but readiness probes fail, so they are excluded from endpoints. \`kubectl get pods\` showing \`Running\` is not enough — check the READY column.
- **Wrong namespace.** An Ingress can only reference a Service in its own namespace.
- **Rolling update timing** — see the next section.

**504 Gateway Timeout — an upstream accepted the request and did not answer in time.** The connection worked, so this is not networking. It is the application being slow, a dependency of the application hanging, or a proxy timeout set below the real p99. Raise \`proxy-read-timeout\` only after establishing the request genuinely needs longer — otherwise you are hiding a latency regression rather than fixing it.

**The method, outside-in:**

\`\`\`bash
# 1. What does the proxy think happened? upstream_status and upstream_addr are the fields that matter
kubectl -n ingress-nginx logs -l app.kubernetes.io/name=ingress-nginx --tail=100

# 2. Does the Service have endpoints at all? Empty here explains most 503s
kubectl get endpointslices -l kubernetes.io/service-name=<svc>
kubectl get endpoints <svc>

# 3. Do the selector and the Pod labels actually agree?
kubectl get svc <svc> -o jsonpath='{.spec.selector}'; echo
kubectl get pods --show-labels -l <that-selector>

# 4. Bypass the proxy — does the Service work from inside the cluster?
kubectl run t --rm -it --restart=Never --image=nicolaka/netshoot -- \\
  curl -sv http://<svc>.<ns>.svc.cluster.local:<port>
\`\`\`

Step 4 is the bisection that matters. If the in-cluster curl works, the Pod and Service are fine and the problem is the Ingress, its class, its TLS, or the controller. If it fails too, stop looking at the Ingress entirely.`,
      },
      {
        title: 'Why rolling updates emit 502s — and the fix',
        content: `A deployment with correct probes and a healthy application still returns 502s to real users during a rollout. This surprises people because everything looks right, and it is worth understanding precisely because the fix is small and the cause is structural.

**The race.** When a Pod is deleted, two things happen *concurrently and independently*:

1. The endpoints controller removes it from the EndpointSlice, which propagates to every kube-proxy and every ingress controller — an asynchronous, cluster-wide update that takes time.
2. The kubelet sends \`SIGTERM\` to the container, which typically begins shutting down immediately.

Nothing orders these. The container commonly stops accepting connections *before* the proxies stop sending them, and every request routed in that window fails — a 502, because the proxy connected to something that then refused or reset.

**The fix, and it is a few lines.** Give the endpoint removal time to propagate before the application stops listening:

\`\`\`yaml
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 15"]
\`\`\`

The \`preStop\` hook runs **before** SIGTERM is sent. Sleeping there keeps the container serving while the deregistration propagates. Fifteen seconds is a reasonable starting point; the correct value is however long your slowest proxy takes to notice, which you can measure.

\`terminationGracePeriodSeconds\` must exceed the preStop sleep *plus* the application's own drain time, or the kubelet escalates to \`SIGKILL\` and cuts off in-flight requests — trading 502s at the start of shutdown for truncated responses at the end.

**The other half: handle SIGTERM.** The container must actually drain — stop accepting new connections, finish in-flight requests, then exit. Two frequent failures: an application that ignores SIGTERM entirely and gets SIGKILLed at the end of the grace period, and a shell-wrapped entrypoint where PID 1 is \`sh\` and never forwards the signal to the real process. Check by running \`ps\` in the container — if PID 1 is not your application, signals are probably not reaching it.

**Also set \`maxUnavailable: 0\`** on the rolling update strategy so new Pods are Ready before old ones go away. Combined with the preStop hook, this is what makes a deploy invisible to users.`,
      },
      {
        title: '4xx from the proxy, and the checks that are not about your app',
        content: `Not every 4xx comes from a client. Several are the proxy enforcing its own limits, and they are misdiagnosed as application bugs constantly.

**413 Payload Too Large.** The request body exceeded the proxy's limit, not the application's. ingress-nginx defaults to 1 MB, which file uploads exceed immediately:

\`\`\`yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
\`\`\`

**400 Bad Request on large headers.** Long JWTs and large cookie jars overflow the proxy's header buffers. The tell is that the same request works with a fresh session and fails for users who have accumulated cookies. Tuning \`proxy-buffer-size\` is the fix.

**499 Client Closed Request** (nginx-specific, not a real HTTP status). The client hung up before the proxy answered. Usually a symptom rather than a cause — the upstream was slow and the client timed out first. A rise in 499 alongside rising upstream latency is a latency problem, not a client problem.

**404 from the ingress controller rather than your app.** The request reached the controller and matched no rule. Check, in order:

- **\`ingressClassName\`.** If it is missing or wrong, no controller claims the Ingress. It exists in the API and does nothing — a genuinely silent failure.
- **Host and path.** \`pathType: Exact\` versus \`Prefix\` versus \`ImplementationSpecific\` behave differently; \`Exact\` matching where you meant \`Prefix\` produces 404s on every sub-path.
- **Namespace.** An Ingress can only reference Services in its own namespace.

\`\`\`bash
kubectl get ingress <name> -o yaml | grep -E 'ingressClassName|host|path|pathType'
kubectl describe ingress <name>          # events name the controller that claimed it
kubectl get ingressclass
\`\`\`

**TLS-specific failures.** A certificate error is not a 5xx — the connection fails before HTTP. Check the referenced Secret exists in the same namespace, is type \`kubernetes.io/tls\`, and that its SAN covers the host. With cert-manager, \`kubectl describe certificate\` and \`kubectl get challenges\` explain a stuck issuance faster than reading controller logs.

**A NetworkPolicy can produce both 502 and 504** by dropping proxy-to-Pod traffic. The signature is a Service that works from a Pod in the same namespace but not from the ingress namespace. If a default-deny policy is in place, the ingress controller's namespace needs an explicit ingress rule — this is easy to overlook when a policy is added long after the application shipped.`,
      },
    ],
    quickFire: [
      { q: 'What does 502 prove about where the failure is?', a: 'The proxy reached an upstream and the connection failed — refused, reset, or protocol mismatch. Something was there to try.' },
      { q: 'What is the most common cause of 503 from an ingress?', a: 'No ready endpoints — an empty upstream group. Selector mismatch, failing readiness probes, or rolling-update timing.' },
      { q: 'What does 504 tell you that 502 does not?', a: 'The upstream accepted the request and never answered. The connection worked, so it is not networking — it is application latency or a proxy timeout below the real p99.' },
      { q: 'App works when you exec in and curl localhost, but 502 through the Service. Why?', a: 'It is bound to 127.0.0.1 instead of 0.0.0.0, so it accepts nothing from outside the Pod network namespace.' },
      { q: 'Why do rolling updates cause 502s even with correct probes?', a: 'Endpoint removal and SIGTERM happen concurrently and unordered. The container usually stops accepting connections before proxies stop sending them.' },
      { q: 'How do you fix rolling-update 502s?', a: 'A preStop hook that sleeps (~15s) so deregistration propagates before SIGTERM, terminationGracePeriodSeconds longer than that sleep plus drain time, and maxUnavailable: 0.' },
      { q: 'When does preStop run relative to SIGTERM?', a: 'Before it. That is the whole point — it keeps the container serving while the endpoint removal propagates.' },
      { q: 'What happens if terminationGracePeriodSeconds is too short?', a: 'The kubelet escalates to SIGKILL and cuts off in-flight requests — trading 502s at the start of shutdown for truncated responses at the end.' },
      { q: 'Why might an app ignore SIGTERM entirely?', a: 'A shell-wrapped entrypoint makes PID 1 the shell, which does not forward signals. Run ps in the container: if PID 1 is not your application, signals are not reaching it.' },
      { q: 'First command when an ingress returns 503?', a: 'Check endpoints — kubectl get endpointslices -l kubernetes.io/service-name=<svc>. Empty explains most 503s immediately.' },
      { q: 'How do you bisect proxy problems from Service problems?', a: 'Curl the Service DNS name from a Pod inside the cluster. Works means the problem is the Ingress, class or TLS. Fails means stop looking at the Ingress.' },
      { q: 'Which two log fields matter most in ingress-nginx?', a: 'upstream_status and upstream_addr — they say which backend was tried and what it returned, separating proxy-side from upstream-side failures.' },
      { q: 'What causes 413, and is it your app?', a: 'No — the proxy body-size limit. ingress-nginx defaults to 1MB. Raise it with the proxy-body-size annotation.' },
      { q: 'Requests fail only for long-signed-in users. Why?', a: 'Accumulated cookies and large JWTs overflow the proxy header buffers, producing 400. Tune proxy-buffer-size.' },
      { q: 'What is a 499?', a: 'An nginx-specific code meaning the client hung up before the proxy answered. Usually a symptom of upstream slowness, not a client fault.' },
      { q: 'An Ingress exists but nothing routes. What is the first thing to check?', a: 'ingressClassName. Missing or wrong means no controller claims it — it exists in the API and does nothing, silently.' },
      { q: 'pathType Exact versus Prefix?', a: 'Exact matches the path only; Prefix matches sub-paths. Exact where you meant Prefix returns 404 on every sub-path.' },
      { q: 'How can a NetworkPolicy cause 502 and 504?', a: 'By dropping proxy-to-Pod traffic. Signature: the Service works from a Pod in its own namespace but not from the ingress namespace. A default-deny policy needs an explicit rule for the ingress controller.' },
    ],
    references: [
      'https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/',
      'https://kubernetes.io/docs/concepts/services-networking/service/',
      'https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/',
      'https://kubernetes.io/docs/concepts/services-networking/ingress/',
      'https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/',
      'https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/',
      'https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/',
      'https://kubernetes.io/docs/concepts/services-networking/network-policies/',
      'https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/',
    ],
  },
];

export const k8sClusterAdminTopicCategoryMap = {
  'k8s-apiserver-status-codes': 'k8s-cluster-admin',
  'k8s-ingress-5xx-debugging': 'k8s-cluster-admin',
};
