// Platform Control Plane & Automation. Learning track for platform engineers
// who BUILD the deployment platform, not just operate on it.
//
// Fills the depth gaps in Camora's already-strong cloud-native DevOps content:
// the Go you write the control plane in, authoring operators (not just using
// them), Vault as a system rather than a mention, event-driven automation,
// ChatOps, MCP APIs, bare metal, ephemeral environments, lease systems,
// Cluster API, PCI/SOC 2, and AI-assisted engineering practice.
//
// Diagrams: /diagrams/devops/cp-*.png from scripts/gen-controlplane-diagrams.py.
// Category wiring: 'controlplane' in devopsCategories + devopsTopicCategoryMap
// (devopsTopics.js), merged into the devops chunk by loader.js.

export const controlPlaneTopics = [

  // ─────────────────────────────────────────────────────────────────────
  // 1. Go for Control-Plane Development
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'cp-go-control-plane',
    title: 'Go for Control-Plane Development',
    icon: 'code',
    color: '#475569',
    questions: 6,
    description: 'The subset of Go that matters when you are writing controllers, admission webhooks, and platform APIs — context propagation, the error model, concurrency failure modes, and production diagnostics.',
    visualizations: [
      {
        title: 'What a Go control-plane service is actually made of',
        image: '/diagrams/devops/cp-1-go.png',
        description: `Every piece of infrastructure you touch on a Kubernetes platform is a Go binary: kube-apiserver, kubelet, etcd, containerd, Prometheus, Envoy control planes, Terraform, Vault, Consul, Helm, Argo CD, Flux. That is not fashion. It is four properties that happen to line up exactly with what a control-plane process needs.

Static binaries. CGO_ENABLED=0 go build produces one file with no dynamic linker dependency. That file goes into a FROM scratch or FROM gcr.io/distroless/static container image of a few megabytes. There is no interpreter to install, no virtualenv, no glibc version skew between the build host and the node. Cross-compilation is a pair of environment variables: GOOS=linux GOARCH=arm64 go build. For a controller that ships as a container image to clusters you do not own, this removes an entire class of deployment failure.

Compile speed and a single toolchain. go build on a mid-size controller is a few seconds. go vet, go test, gofmt, the race detector, the profiler, and the module system all ship in the same distribution. There is no separate build tool, formatter war, or dependency resolver to argue about. On a platform team where six people rotate through the same repo, that uniformity is worth more than any individual language feature.

Concurrency that maps onto the workload. A controller is a fan-in of watch events into a work queue, plus a fan-out of N workers doing API calls. Goroutines are a few kilobytes of stack that grow on demand, so ten thousand in-flight informer callbacks is unremarkable. Channels plus select give you cancellation, timeout, and fan-in in a form you can read. The Kubernetes client-go informer/workqueue machinery is exactly this pattern wearing a library.

A standard library that already speaks the protocols. net/http with TLS, crypto/x509 for the cert rotation you will inevitably write, encoding/json for the API machinery, context for deadlines. You can write a working admission webhook with zero third-party dependencies. Dependency count matters when your code runs in the critical path of every pod admission in a cluster.

Context is the spine of the whole thing. Every Kubernetes client call takes a context.Context as its first argument, and every controller Reconcile is handed one. The context carries a deadline and a cancellation signal down through your call graph. When the manager shuts down, it cancels the root context; every in-flight API call sees its Done channel close and returns ctx.Err(). If you drop the context on the floor — pass context.TODO(), or spawn a goroutine that closes over context.Background() — you have created a goroutine that outlives shutdown and a request that ignores its deadline. That is the single most common structural defect in first-draft controller code.

Errors are values, not exceptions. A function returns (T, error). You check it. fmt.Errorf with the %w verb wraps an error so the chain is preserved, and errors.Is compares against a sentinel anywhere in that chain while errors.As type-asserts into a concrete type anywhere in that chain. In controller code this is how you distinguish "the object is gone" from "the API server is unhappy":

    if err := r.Get(ctx, req.NamespacedName, &obj); err != nil {
        if apierrors.IsNotFound(err) {
            return ctrl.Result{}, nil     // deleted; nothing to do
        }
        return ctrl.Result{}, fmt.Errorf("get cluster %s: %w", req.NamespacedName, err)
    }

Panic is not control flow. A panic in a reconcile goroutine kills the process unless controller-runtime recovers it, and a crash-looping controller stops reconciling every object in the cluster, not just the one that panicked. Panic is for programmer error that makes continuing meaningless — a nil scheme, an impossible switch default. Everything a remote system can do to you is an error value.

Interfaces are small and defined at the point of use. The Go convention is accept interfaces, return structs: a function takes the narrowest interface it needs (io.Reader, client.Reader) and returns a concrete type. Interfaces are satisfied implicitly, so you can define a two-method interface in your package that the upstream controller-runtime client already satisfies, and now your reconciler is testable with a fake without either side knowing about the other.

Struct tags carry the serialization contract. A CRD API type is a plain struct whose fields carry \`json:"..."\` tags; controller-gen reads those tags plus // +kubebuilder: marker comments to emit the OpenAPI schema in the CRD YAML. Get the omitempty wrong and you will ship a required field you meant to be optional.`,
      },
      {
        title: 'Quick-fire interview answers — Go for control planes',
        description: `Q: Why does infrastructure tooling overwhelmingly ship in Go rather than Python or Java?
A: Static single-file binaries with trivial cross-compilation, so distribution is a container image with no runtime to install. Compile times measured in seconds, which keeps the edit-test loop tight. Goroutines that make the watch-plus-worker-pool shape of a controller cheap. And a standard library that already covers HTTP, TLS, x509, and JSON, so a webhook can have almost no third-party dependencies.

Q: What does context.Context actually do?
A: It carries a cancellation signal, an optional deadline, and request-scoped values across API boundaries. Done() returns a channel closed on cancellation or deadline; Err() says which. It is a tree — cancelling a parent cancels every derived context. Convention is to pass it as the first parameter named ctx and never store it in a struct.

Q: When do you wrap an error with %w versus %v?
A: Use %w when callers should be able to match the underlying error with errors.Is or errors.As — that makes the wrapped error part of your API contract. Use %v when you want the text for humans but do not want to commit to exposing the implementation detail. Wrapping a sql.ErrNoRows out of a repository layer with %w commits you forever to being SQL-backed.

Q: What does the -race flag do and why is it not enough on its own?
A: go test -race and go build -race instrument every memory access with the ThreadSanitizer runtime, reporting when two goroutines touch the same address without synchronization and at least one is a write. It only reports races that actually occur on the paths your test exercises, and it costs roughly 5-10x CPU and 5-10x memory, so it is a CI and staging tool, not a production one. It finds nothing in code your tests never run concurrently.

Q: How do you profile a controller that is already running in a cluster?
A: Import net/http/pprof, serve it on a loopback or non-ingress port, then kubectl port-forward and point go tool pprof at it. go tool pprof http://localhost:6060/debug/pprof/heap for allocations, .../profile?seconds=30 for CPU, and .../goroutine?debug=2 for a full goroutine dump — that last one is the fastest way to see a goroutine leak, because the leaked goroutines all share one stack frame.

Q: What is the classic loop-variable bug and is it still a bug?
A: Before Go 1.22, for i := range xs declared one variable reused across iterations, so closures and goroutines capturing it all observed the final value. Go 1.22 made loop variables per-iteration when the module's go directive is 1.22 or later. It is still a live hazard in older modules and in any code that bumps the toolchain without bumping the go line in go.mod.`,
      },
    ],
    introduction: `This topic is not a Go tutorial. It is the slice of Go you get asked about when the job is writing control-plane software: operators, admission webhooks, platform APIs, CLI tooling that talks to the Kubernetes API. The assumption is that you can already write a for loop and a struct, and that what you need is the model behind the idioms — why the code you are reading in controller-runtime, client-go, and Terraform providers looks the way it does.

The organizing idea is that a control-plane process is mostly a loop that observes remote state, compares it with desired state, and issues remote writes. Everything hard about that is either cancellation (the remote call must not outlive its deadline or the process shutdown) or concurrency (many of these loops run at once and share caches). Go gives you two primitives aimed squarely at those problems — context.Context and goroutines plus channels — and a third, the error value, that keeps failure explicit instead of unwinding a stack.

Go 1.26 is the current release as of February 2026, with 1.25 still supported under the two-release policy. Two changes in recent history are worth having in your head for interviews. Go 1.22 changed loop variables to be per-iteration, which retroactively deleted the single most common goroutine bug in Go history — but only for modules whose go.mod declares go 1.22 or newer. And modules, not GOPATH, are the dependency model; anyone still describing GOPATH workflows is signalling they have not written Go since 2019.

Where this fits in the platform-engineering stack: your operator is a Go binary, your webhook is a Go binary, the tooling that patches your CRs in CI is a Go binary. When an interviewer asks about Go here, they are almost never asking about syntax. They are asking whether you know what happens when the API server closes a watch mid-reconcile, whether your worker goroutines exit on SIGTERM, and whether you can find a leak in a process you cannot restart.

What an interviewer probes: how context propagates and what breaks when it does not; whether you can articulate the difference between errors.Is and errors.As without hedging; whether you reach for a mutex or a channel and why; how you would diagnose a controller whose memory grows monotonically over three days; and whether your shutdown path actually drains work or just calls os.Exit. Those five questions separate people who have shipped a controller from people who have read about one.`,
    whenToUse: [
      'Writing a Kubernetes operator, admission webhook, or scheduler extender — controller-runtime and client-go are Go-only',
      'Building a platform API or internal CLI that must ship as a single static binary to machines you do not control',
      'Any long-lived service where you need deterministic shutdown, in-process profiling, and low memory overhead per concurrent request',
      'Extending existing infrastructure — Terraform providers, Prometheus exporters, CSI drivers, and CNI plugins all have Go plugin interfaces',
      'Replacing a pile of Bash or Python glue whose failure mode is "it worked on the build box"',
    ],
    keyConcepts: [
      {
        term: 'context.Context',
        definition: 'An immutable value carrying a cancellation signal, an optional deadline, and request-scoped values. Done() returns a channel closed on cancel or deadline; Err() returns context.Canceled or context.DeadlineExceeded. Derived with context.WithCancel, WithTimeout, WithDeadline, WithValue. Passed as the first argument named ctx; never stored in a struct field. Every Kubernetes client method takes one.',
      },
      {
        term: 'Goroutine',
        definition: 'A function scheduled onto an OS thread by the Go runtime, starting with a few kilobytes of stack that grows on demand. Cheap enough that tens of thousands are routine. There is no goroutine ID and no way to kill one from outside — a goroutine exits only by returning, so every long-lived goroutine must select on a context Done channel or it leaks.',
      },
      {
        term: 'select',
        definition: 'Blocks until one of several channel operations is ready, choosing pseudo-randomly among ready cases. A default case makes the whole select non-blocking. The canonical control-plane form is select on ctx.Done() versus a result channel versus a time.After timer — that one statement expresses cancellation, success, and timeout together.',
      },
      {
        term: 'Error wrapping',
        definition: 'fmt.Errorf("get pod %s: %w", name, err) embeds err in a chain reachable by errors.Is (compare against a sentinel value) and errors.As (assert into a concrete type). Using %v instead of %w formats the text but breaks the chain deliberately, hiding an implementation detail from callers. Wrapping makes the wrapped error part of your public API.',
      },
      {
        term: 'Accept interfaces, return structs',
        definition: 'Take the narrowest interface a function needs as a parameter (io.Reader, client.Reader) and return a concrete type. Interfaces are satisfied implicitly, so the interface is declared in the consuming package, not the producing one. This is what makes a reconciler testable against a fake client without the reconciler importing a test package.',
      },
      {
        term: 'Struct tags',
        definition: 'Backtick-quoted metadata on struct fields read at runtime by reflection: json, yaml, protobuf. In a CRD API type the json tag names the field in the serialized object and omitempty controls whether a zero value is emitted. controller-gen reads these tags plus marker comments to generate the CRD OpenAPI schema, so a wrong tag becomes a wrong API.',
      },
      {
        term: 'Race detector',
        definition: 'go test -race and go build -race enable a ThreadSanitizer-based runtime that flags unsynchronized concurrent access where at least one access is a write. Roughly 5-10x CPU and memory cost. Reports only races actually executed, so its value is proportional to how concurrent your tests are.',
      },
      {
        term: 'pprof',
        definition: 'Sampling profiler built into the runtime. Profiles: cpu, heap (alloc and inuse), goroutine, block, mutex, threadcreate. Exposed over HTTP by importing net/http/pprof, or written from tests with -cpuprofile / -memprofile. go tool pprof renders text, graphs, and flame graphs. The goroutine profile at debug=2 is the fastest leak diagnosis available.',
      },
    ],
    approach: [
      'Lay the module out the way the Go docs describe: go.mod at the root, entrypoints under cmd/<binary>/main.go, everything not meant for import under internal/. Do not import a community "standard layout" with a pkg/ directory unless something forces it',
      'Thread context.Context from main through every layer. Build the root with signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM) and derive per-request contexts with WithTimeout',
      'Return errors, wrap with %w where the caller may need to match, and define sentinel errors or typed errors for the conditions you branch on. Reserve panic for invariants that make continuing meaningless',
      'Give every goroutine an owner and an exit condition — either a sync.WaitGroup the parent waits on or a context whose cancellation the goroutine selects on. A goroutine with neither is a leak waiting for load',
      'Write table-driven tests: a slice of anonymous structs with a name field, iterated with t.Run(tc.name, func(t *testing.T){...}) so subtests report individually. Use net/http/httptest for anything that speaks HTTP',
      'Run go test -race ./... in CI, not just go test. Add go vet and a linter; both catch context and error-handling mistakes statically',
      'Wire net/http/pprof into the binary behind a non-public listener from day one, and implement shutdown as: cancel root context, srv.Shutdown(shutdownCtx) with its own timeout, wait on the WaitGroup, then return from main',
    ],
    pitfalls: [
      'Passing context.Background() or context.TODO() deep inside a request path — the call becomes uncancellable and outlives both its deadline and process shutdown',
      'Starting a goroutine that writes to an unbuffered channel nobody will ever read from, usually because the reader returned early on an error path. The goroutine blocks forever and its stack, closures, and any cached objects are never collected — a slow leak that looks like a memory leak',
      'Capturing a loop variable in a goroutine in a module whose go.mod still declares go 1.21 or earlier, where the variable is shared across iterations. Bumping the toolchain does not fix it; bumping the go directive does',
      'Calling os.Exit or log.Fatal from a request handler or reconcile path — deferred functions do not run, in-flight work is lost, and a leader-election lease is left held until it times out',
      'Treating panic and recover as exception handling. A recovered panic in one worker leaves the shared state that panic interrupted in an unknown condition, and the next reconcile operates on it',
      'Ignoring the error return from Close, Flush, or the second value of a type assertion because the code compiles without it. errcheck and go vet exist precisely because the compiler will not save you here',
    ],
    keyQuestions: [
      {
        question: 'Explain context.Context and how it flows through a controller. What actually breaks if you ignore it?',
        answer: `context.Context is an immutable value that carries three things across API boundaries: a cancellation signal, an optional deadline, and request-scoped values. The interface is four methods:

\`\`\`go
type Context interface {
    Deadline() (deadline time.Time, ok bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
\`\`\`

Done() returns a channel that is closed when the context is cancelled or its deadline passes. Err() then returns context.Canceled or context.DeadlineExceeded. Contexts form a tree: context.WithCancel, WithTimeout, and WithDeadline derive a child, and cancelling a parent cancels every descendant. There is no Cancel method on the interface itself — only whoever created the context gets the CancelFunc, so a callee can observe cancellation but cannot cancel its caller.

How it flows in a controller. The manager builds a root context, usually from ctrl.SetupSignalHandler(), which cancels on SIGINT or SIGTERM. That context is handed to every Runnable the manager owns. When a work item is dequeued, controller-runtime calls Reconcile(ctx, req) with a context derived from that root. Every client call inside — r.Get, r.Update, r.Status().Update — takes ctx as its first argument and passes it down to the underlying net/http request, where it becomes the request's cancellation.

So the chain is: SIGTERM arrives, root context cancels, every in-flight HTTP request to the API server has its Done channel closed, the transport aborts the connection, and each client call returns an error wrapping context.Canceled. Reconcile returns, the worker sees the shutdown signal, the manager waits for the work queue to drain, and the process exits.

What breaks when you ignore it. Three concrete failures.

First, uncancellable work. If you call context.Background() inside a reconciler — a very common shortcut when a helper function did not originally take a ctx — that call is not cancelled by shutdown. During a rolling update of your controller Deployment you now have a pod in Terminating with an outstanding API write. If terminationGracePeriodSeconds expires first, the pod is SIGKILLed mid-write.

Second, unbounded latency. A context with no deadline plus a hung API server means a worker goroutine blocked forever. Controller-runtime defaults to a fixed number of concurrent reconciles (MaxConcurrentReconciles, default 1). Block all of them and the controller stops reconciling every object of that kind. It looks alive: the process is up, the metrics endpoint answers, leader election keeps renewing. Nothing reconciles.

Third, goroutine leaks. Any goroutine you spawn from a reconcile — to poll an external system, say — must select on ctx.Done() or it survives the reconcile that created it. Do that once per reconcile on a resource that reconciles every thirty seconds and you have a linear goroutine leak.

Rules that keep this straight. Pass ctx as the first parameter, always named ctx. Never store a Context in a struct field — it makes the lifetime of the context implicit and usually wrong. Do not pass nil; use context.TODO() only as a deliberate marker that you have not plumbed it yet. Use context.WithValue only for request-scoped metadata such as a trace ID or a logger, never for optional arguments, and always with an unexported key type so packages cannot collide.

A good answer names the actual failure — "the controller looks healthy and reconciles nothing" — rather than reciting the interface.`,
      },
      {
        question: 'How does Go error handling work in a control-plane service, and when is panic acceptable?',
        answer: `Errors are ordinary values of the built-in interface type error, returned as the last return value and checked at the call site. There is no stack unwinding, so control flow stays local and visible.

Wrapping. Since Go 1.13, fmt.Errorf with the %w verb embeds an error in a chain:

\`\`\`go
if err := r.Get(ctx, key, &cluster); err != nil {
    return fmt.Errorf("get cluster %s: %w", key, err)
}
\`\`\`

The chain is walked by two functions. errors.Is(err, target) reports whether any error in the chain equals a sentinel value — errors.Is(err, context.DeadlineExceeded). errors.As(err, &target) reports whether any error in the chain is assignable to a concrete type and assigns it:

\`\`\`go
var statusErr *apierrors.StatusError
if errors.As(err, &statusErr) {
    code := statusErr.ErrStatus.Code
}
\`\`\`

Is is for identity; As is for type. That is the whole distinction, and the single most common precision failure in interviews is fumbling it.

%w versus %v is an API decision, not a style one. Wrapping with %w promises callers that the underlying error is matchable forever. If your storage layer wraps sql.ErrNoRows with %w and a caller starts testing errors.Is(err, sql.ErrNoRows), you can no longer swap the backend without breaking them. Use %v to keep the message but sever the chain when the cause is an implementation detail.

In Kubernetes controllers the pattern is a small set of predicates from k8s.io/apimachinery/pkg/api/errors that you branch on: IsNotFound, IsConflict, IsAlreadyExists, IsForbidden. Not-found on the primary object means the object was deleted after the event was queued — return success, not an error, or you will requeue forever against an object that no longer exists. Conflict on an update means resourceVersion moved under you — re-fetch and retry, or return the error and let the workqueue back off. Forbidden means your RBAC is wrong and no amount of retrying will help; log it loudly.

Sentinels and typed errors. Define package-level sentinels with errors.New for conditions callers branch on (var ErrNotReady = errors.New("not ready")), and a struct type implementing error when the caller needs data out of the failure (which field was invalid, what the retry-after was). Both compose with wrapping.

When panic is acceptable. Panic is for programmer error that makes continuing meaningless: a nil scheme passed to a manager, an impossible default branch in a switch over an exhaustive enum, a failed init-time registration. The idiomatic marker is a helper named MustX — regexp.MustCompile, schema.MustParse — that panics on bad input, called only with compile-time-constant arguments at package init.

Panic is not acceptable for anything a remote system can cause. A malformed CR spec, an API server timeout, a webhook rejection — all errors. The consequence is concrete: controller-runtime recovers panics in reconcile by default (RecoverPanic defaults on in recent versions), but a panic anywhere else takes the process down, and a crash-looping controller stops reconciling every object it owns, not just the one that triggered the panic. In a webhook it is worse: a crash-looping validating webhook with failurePolicy: Fail blocks admission for every matching object in the cluster, which is how a bad operator release turns into a cluster-wide outage.

Recover, when used at all, belongs at a goroutine boundary that you own, logging and re-queueing rather than swallowing. Recovering and continuing as if nothing happened is how you get corrupted shared state.`,
      },
      {
        question: 'Walk me through the concurrency bugs that actually bite in controllers and how you find them.',
        answer: `Four failure modes cover almost everything I have seen in production controller code.

Goroutine leaks. A goroutine exits only by returning. There is no kill. So any goroutine spawned per-request or per-reconcile that can block indefinitely is a leak. The two common shapes:

\`\`\`go
// leaks if the caller returns before reading ch
ch := make(chan Result)
go func() { ch <- doWork() }()
if err := validate(); err != nil {
    return err          // nobody ever reads ch; the goroutine blocks forever
}
\`\`\`

and the polling goroutine with no cancellation:

\`\`\`go
go func() {
    for range time.Tick(time.Second) {   // time.Tick never stops
        poll()
    }
}()
\`\`\`

Fixes: buffer the channel with capacity 1 so the send always completes, or select on ctx.Done() in the sender; and use time.NewTicker with a defer Stop plus a select on ctx.Done() instead of time.Tick.

Symptom in production: memory grows monotonically and never plateaus, and the go_goroutines Prometheus metric climbs linearly. Diagnosis is one command — hit /debug/pprof/goroutine?debug=2 and read the stacks. Leaked goroutines are all parked on the same line, so the dump is trivially clustered.

Unbuffered channel deadlock. An unbuffered channel send blocks until a receiver is ready. Two goroutines each sending to a channel the other will only read after its own send completes is a classic deadlock. Within a single process with all goroutines asleep the runtime detects it and prints "fatal error: all goroutines are asleep - deadlock!", but that only fires when every goroutine is blocked — in a controller with an informer and a metrics server running, it never fires. You just get a hung worker.

Loop variable capture. Before Go 1.22, for _, item := range items declared one variable reused across every iteration, so a goroutine closing over item observed whichever value was current when it ran — usually the last. Go 1.22 changed this to per-iteration variables, gated on the go directive in go.mod. A module that declares go 1.21 and builds with the Go 1.26 toolchain still gets the old semantics. This bug produced the Let's Encrypt incident that required revoking roughly three million certificates, so it is worth naming.

Shared mutable state under concurrent reconciles. Controller-runtime lets you set MaxConcurrentReconciles above 1. The moment you do, two goroutines run your Reconcile simultaneously for different objects and share whatever is on the reconciler struct — a map cache, a counter, a client wrapper. Maps in Go are not safe for concurrent read/write and the runtime will throw "concurrent map writes" and kill the process, not return an error. Guard with sync.Mutex, or use sync.Map for the read-mostly case, or keep the reconciler struct immutable after construction, which is the cleanest option.

Finding them. The race detector first: go test -race ./... in CI. It instruments every memory access via ThreadSanitizer and reports unsynchronized access where at least one side writes. Two caveats worth stating out loud — it only reports races your test actually executes, so it is worthless against a serial test suite, and it costs roughly 5-10x CPU and memory, which is why it is a CI and staging tool rather than something you run in production.

Second, goroutine profiles under load, compared over time. A steady-state controller has a flat goroutine count; a rising line is a leak and the pprof stacks name the culprit.

Third, go vet plus a linter. go vet catches lost cancel functions and copied mutexes. Anything that flags an unchecked error or a context stored in a struct pays for itself.

Fourth, deliberate concurrency in tests. Run the same reconcile against N objects from N goroutines under -race. That is the only way the detector sees the paths that matter.`,
      },
      {
        question: 'A controller pod has been running for three days and its RSS has grown from 80 MB to 1.4 GB. Walk me through diagnosing it in place.',
        answer: `The goal is to distinguish four causes without restarting the pod, because a restart destroys the evidence.

Step one: is it goroutines or heap? If the binary exposes controller-runtime metrics, go_goroutines and go_memstats_heap_inuse_bytes answer this immediately. A linearly rising goroutine count is a goroutine leak; flat goroutines with rising heap is an allocation problem. If there are no metrics, port-forward pprof:

\`\`\`bash
kubectl port-forward -n my-system deploy/my-controller 6060:6060
curl -s localhost:6060/debug/pprof/goroutine?debug=1 | head -40
\`\`\`

debug=1 gives counts grouped by stack; debug=2 gives every goroutine's full stack. A leak shows as one stack with a count in the thousands. Read the top frame and you have the offending call site — almost always a spawned goroutine blocked on a channel send or a client call with no context.

Step two: if it is heap, take a live heap profile and compare inuse against alloc.

\`\`\`bash
go tool pprof http://localhost:6060/debug/pprof/heap
(pprof) top10 -cum
(pprof) list <suspectFunction>
\`\`\`

By default the heap profile reports inuse_space — memory still reachable. Switch with -sample_index=alloc_space to see total allocation since start. High alloc with low inuse means you are churning garbage, which costs CPU but is not a leak. High inuse that grows is a real retention problem.

Step three: take two profiles thirty minutes apart and diff them. This is the single most useful move and the one people forget:

\`\`\`bash
curl -s localhost:6060/debug/pprof/heap > h1.pb.gz
sleep 1800
curl -s localhost:6060/debug/pprof/heap > h2.pb.gz
go tool pprof -base h1.pb.gz h2.pb.gz
\`\`\`

The diff shows only what grew, which cuts through the steady-state noise of the informer caches.

The four causes, in the order I would suspect them in a controller.

Informer cache growth. controller-runtime's Manager runs a shared cache backed by informers, and by default it caches every object of every type you watch, cluster-wide. A controller that Watches Pods in a large cluster holds every Pod in memory. This is not a bug, it is configuration: set cache.Options with ByObject field selectors or label selectors, or scope DefaultNamespaces, so you cache only what you reconcile. In the heap profile this shows up under the informer store and reflector frames.

Goroutine leaks, per the above. Each leaked goroutine retains its stack plus everything its closure captures, which is often a whole object.

Unbounded in-process caches. A map[string]something on the reconciler struct that is written on every reconcile and never evicted. Obvious in the heap diff.

Slice and substring retention. A large byte slice held alive by a small slice of it — s := big[:10] keeps the whole backing array. Common when parsing large API responses or logs. The fix is an explicit copy.

Step four: confirm before you fix. Set GOMEMLIMIT if the process is simply running with a heap target the container cannot afford, and check GOGC — if someone set GOGC=off or a very high value, the heap grows by design. runtime/metrics and GODEBUG=gctrace=1 in a staging replica will show whether the GC is running and reclaiming.

The thing to say out loud in an interview: I do not restart the pod first. A restart makes the symptom disappear and guarantees another three days before you can look again.`,
      },
      {
        question: 'Implement graceful shutdown for a Go service that serves HTTP, runs background workers, and holds a leader-election lease.',
        answer: `Graceful shutdown has three obligations: stop accepting new work, finish or abandon in-flight work within a bounded time, and release anything the process holds so a successor can take over immediately.

The signal context. os/signal gives you a context that cancels on the signals you name:

\`\`\`go
func NotifyContext(parent context.Context, signals ...os.Signal) (ctx context.Context, stop context.CancelFunc)
\`\`\`

So main starts:

\`\`\`go
ctx, stop := signal.NotifyContext(context.Background(),
    syscall.SIGINT, syscall.SIGTERM)
defer stop()
\`\`\`

Kubernetes sends SIGTERM on pod termination and SIGKILL after terminationGracePeriodSeconds (default 30). Everything below has to fit inside that window, which is why the shutdown timeout must be strictly less than the grace period.

The HTTP server. http.Server.Shutdown stops listeners, closes idle connections, and waits for active requests to finish. It takes its own context because the parent is already cancelled by this point:

\`\`\`go
srv := &http.Server{Addr: ":8080", Handler: mux}

go func() {
    if err := srv.ListenAndServe(); err != nil &&
        !errors.Is(err, http.ErrServerClosed) {
        log.Error(err, "server failed")
    }
}()

<-ctx.Done()                       // SIGTERM arrived

shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
defer cancel()
if err := srv.Shutdown(shutdownCtx); err != nil {
    srv.Close()                    // hard close anything still hanging
}
\`\`\`

Two details people get wrong. ListenAndServe returns http.ErrServerClosed on a clean Shutdown — treating that as a failure produces a scary log line on every normal rollout. And Shutdown does not close hijacked or WebSocket connections; you must signal those yourself.

Background workers. Each worker takes the root ctx and selects on it; the parent tracks them with a WaitGroup and waits with a timeout so one stuck worker cannot pin the process past the grace period:

\`\`\`go
var wg sync.WaitGroup
for i := 0; i < workers; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        for {
            select {
            case <-ctx.Done():
                return
            case item := <-queue:
                process(ctx, item)
            }
        }
    }()
}

done := make(chan struct{})
go func() { wg.Wait(); close(done) }()
select {
case <-done:
case <-time.After(15 * time.Second):
    log.Info("workers did not drain in time")
}
\`\`\`

The load-balancer race. This is the part that separates a real answer from a textbook one. When Kubernetes terminates a pod it sends SIGTERM and removes the pod from Endpoints concurrently — there is no ordering guarantee. If you shut down the listener the instant SIGTERM lands, in-flight requests routed by a not-yet-updated kube-proxy get connection refused. The fix is to flip readiness to failing, sleep a few seconds so endpoint propagation completes, and only then call Shutdown. A preStop hook with a sleep achieves the same thing outside the binary.

Leader election. controller-runtime's manager handles this: when the manager's context is cancelled, it stops the runnables and then releases the lease, provided LeaderElectionReleaseOnCancel is true. Setting that matters — without it the successor waits for the full LeaseDuration (default 15s) to observe the lease expire, so every rollout has a fifteen-second control-plane gap. With it, release is immediate and the standby acquires on its next retry period. The caveat the docs are explicit about: only set it if the process exits immediately after mgr.Start returns, because a process that keeps working after releasing the lease has two active leaders.

What never appears in a correct answer: os.Exit or log.Fatal on the shutdown path. Both skip deferred functions, so the lease is not released, the WaitGroup is not waited on, and buffered writes are lost.`,
      },
      {
        question: 'How would you structure and test a Go control-plane package so it is actually testable?',
        answer: `Structure first, because untestable Go is almost always a structure problem.

Layout. Follow the official module guidance rather than a community template. go.mod at the repository root. Entry points in cmd/<binary>/main.go, and main does nothing but parse flags, build dependencies, and call into a Run function. Everything not intended for external import goes under internal/, which the Go toolchain enforces — a package under internal/ is importable only by code rooted at the parent of internal. Exported library code, if any, sits at the top level. Do not create pkg/ reflexively; the Go docs do not recommend it and it adds a directory level that carries no meaning.

Dependency injection through narrow interfaces. Declare the interface in the package that consumes it, listing only the methods you call:

\`\`\`go
type clusterReader interface {
    Get(ctx context.Context, key client.ObjectKey, obj client.Object,
        opts ...client.GetOption) error
}

type Reconciler struct {
    reader clusterReader
    clock  func() time.Time
}
\`\`\`

controller-runtime's client.Client satisfies clusterReader implicitly, so production wiring is unchanged and a test can pass a two-line fake. Injecting the clock the same way removes time.Now from your assertions, which is the second-biggest source of flaky tests after real network calls.

Table-driven tests with subtests. This is the dominant Go idiom and interviewers expect to see it:

\`\`\`go
func TestParseTTL(t *testing.T) {
    tests := []struct {
        name    string
        in      string
        want    time.Duration
        wantErr error
    }{
        {name: "seconds", in: "30s", want: 30 * time.Second},
        {name: "empty defaults", in: "", want: time.Minute},
        {name: "garbage", in: "banana", wantErr: ErrBadDuration},
    }
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            got, err := ParseTTL(tc.in)
            if !errors.Is(err, tc.wantErr) {
                t.Fatalf("err = %v, want %v", err, tc.wantErr)
            }
            if got != tc.want {
                t.Errorf("got %v, want %v", got, tc.want)
            }
        })
    }
}
\`\`\`

t.Run gives each case its own name in output and its own failure, so one broken case does not mask the rest. t.Parallel inside the subtest runs them concurrently, which is also how you get the race detector to earn its keep.

httptest for anything HTTP. httptest.NewServer gives a real server on a real ephemeral port, so you exercise the actual transport, TLS behaviour, and timeout handling rather than a mock. httptest.NewRecorder tests a handler directly without a socket. For a webhook, NewRecorder plus a hand-built AdmissionReview is the fast path; NewServer is right when you are testing the client side.

Assertions. The standard library is sufficient: compare with ==, use reflect.DeepEqual or google/go-cmp for structs, and t.Errorf with a "got X, want Y" message. testify is widely used and fine — require.NoError and assert.Equal read well — but it is a preference, not a requirement, and a codebase should pick one and stop. What matters more than the assertion library is that failures print both values.

The rest of the toolchain, briefly. go test -race ./... in CI, always. go test -cover, and -coverprofile piped into go tool cover -html for the report. Benchmarks as func BenchmarkX(b *testing.B) with a b.N loop, compared across commits with benchstat rather than by eyeballing ns/op. Fuzz targets (func FuzzX(f *testing.F)) for anything that parses untrusted input — a webhook decoding arbitrary user YAML is exactly that.

The one structural rule that buys the most: no package-level mutable state. Globals make tests order-dependent and impossible to parallelize, and they are the reason people reach for build tags and init hacks.`,
      },
    ],
    references: [
      'https://go.dev/blog/context',
      'https://go.dev/blog/go1.13-errors',
      'https://go.dev/doc/diagnostics',
      'https://go.dev/doc/modules/layout',
      'https://go.dev/wiki/LoopvarExperiment',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. Writing Kubernetes Operators in Go
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'cp-writing-operators',
    title: 'Writing Kubernetes Operators in Go',
    icon: 'gitBranch',
    color: '#475569',
    questions: 6,
    description: 'Authoring an operator with kubebuilder and controller-runtime: the Manager/Cache/Client architecture, idempotent level-triggered reconciliation, finalizers, status conditions, RBAC markers, and envtest.',
    visualizations: [
      {
        title: 'controller-runtime architecture and the path of a single reconcile',
        image: '/diagrams/devops/cp-2-operators.png',
        description: `An operator is a Go process running the controller-runtime Manager. Understanding what that Manager owns is the difference between writing a controller and copying one.

Manager. The top-level object. It owns the shared Cache, the Client, the Scheme, the metrics listener, the health probes, leader election, the webhook server, and the lifecycle of every Runnable registered with it. mgr.Start(ctx) blocks until ctx is cancelled, then stops everything in order. Because the Cache and Client are shared across every controller in the process, one binary running five controllers opens one set of watches, not five.

Scheme. A runtime.Scheme maps Go types to GroupVersionKinds and back. Your generated api/v1/groupversion_info.go registers your types via AddToScheme, and main.go calls utilruntime.Must(myv1.AddToScheme(scheme)). Forget that and every client call for your type fails with "no kind is registered for the type" — a first-day error worth recognizing on sight.

Cache. A set of shared informers. When a controller declares interest in a Kind, the Cache starts a List-then-Watch against the API server for it, keeps every observed object in an in-memory store, and delivers add/update/delete events. Cache size is a function of what you watch: a controller that watches Pods cluster-wide holds every Pod in RAM. cache.Options lets you constrain this per-object with label selectors, field selectors, or a namespace list, and on a large cluster that is a required optimization, not a nicety.

Client. The default client from mgr.GetClient() is a split client: reads are served from the Cache, writes go straight to the API server. That asymmetry is the source of the most common operator bug. Immediately after you Create an object, a Get through the cached client may return NotFound, because the write went to the API server but the watch event has not yet come back and populated the cache. controller-runtime explicitly does not promise read-after-write coherence. When you genuinely need a live read, use mgr.GetAPIReader(), which bypasses the cache and hits the API server directly — at the cost of a real network round trip and API server load, so use it deliberately.

Reconciler. Your code. One method:

    func (r *ClusterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error)

ctrl.Request contains only a NamespacedName. It does not contain the object, and it does not tell you what happened to it. That is deliberate. Events are coalesced in the workqueue by key, so a hundred rapid updates to one object produce one reconcile of the current state. Your reconciler fetches the object itself, observes the world as it is now, and drives toward the spec. This is level-triggered reconciliation, and it is why an operator recovers correctly after a crash, a missed watch event, or a resync — none of which it can distinguish.

Builder. SetupWithManager wires the sources:

    ctrl.NewControllerManagedBy(mgr).
        For(&appsv1alpha1.Cluster{}).
        Owns(&appsv1.StatefulSet{}).
        Watches(&corev1.ConfigMap{}, handler.EnqueueRequestsFromMapFunc(r.mapConfig)).
        Complete(r)

For declares the primary Kind: an event on a Cluster enqueues that Cluster's key. Owns declares a secondary Kind whose events are mapped back to the owner through ownerReferences: an event on a StatefulSet enqueues the Cluster named in its controller ownerReference. Watches is the general form for anything with no ownership relationship, where you supply a function mapping the observed object to zero or more Requests.

ownerReferences do double duty. controllerutil.SetControllerReference stamps one onto the child, which both enables Owns mapping and hands lifecycle to the Kubernetes garbage collector — delete the Cluster and the API server cascades to the StatefulSet without your controller doing anything. Cross-namespace ownership does not work, and cluster-scoped objects cannot be owned by namespaced ones; both silently orphan.

Result and requeue. Returning a non-nil error requeues with exponential backoff (5ms doubling to 1000s by default) and increments controller_runtime_reconcile_errors_total. Returning ctrl.Result{RequeueAfter: 30 * time.Second} requeues at a fixed delay with no error recorded — that is the right form for "I am waiting on something external to become ready", because backoff on a poll is not what you want and a stream of errors on a normal wait poisons your alerting.

Around all of this sit the generated artifacts: CRD YAML and RBAC ClusterRoles emitted by controller-gen from // +kubebuilder: markers in your Go source, a Kustomize tree under config/, and a Makefile that ties make manifests, make install, make run, and make deploy together.`,
      },
      {
        title: 'Quick-fire interview answers — writing operators',
        description: `Q: Why does Reconcile receive only a NamespacedName instead of the changed object?
A: Because reconciliation is level-triggered. The workqueue deduplicates by key, so N rapid events collapse into one reconcile, and your code must read current state rather than react to a delta. Handing you the object would encourage edge-triggered logic that breaks after a missed event, a controller restart, or a periodic resync.

Q: What is the difference between the cached Client and the APIReader?
A: mgr.GetClient() serves reads from the shared informer cache and sends writes to the API server. mgr.GetAPIReader() reads directly from the API server, uncached. Use the cached client for everything normal; use the APIReader when you need read-after-write consistency or must read an object type you deliberately do not cache, and accept the extra API server load.

Q: What does Owns actually do?
A: It watches the secondary type and maps each event back to the owner named in the object's controller ownerReference, enqueuing the owner's key. It does not create the ownerReference — you do that with controllerutil.SetControllerReference. The same reference is what makes the Kubernetes garbage collector delete children when the parent goes away.

Q: What causes a resource to hang in Terminating forever?
A: A finalizer that is never removed. Deletion sets metadata.deletionTimestamp instead of removing the object, and the API server will not complete deletion while metadata.finalizers is non-empty. If the controller that owns that finalizer is uninstalled, crash-looping, or blocked on an external system that is gone, nothing clears it. The manual escape is patching the finalizers array to empty, which skips the cleanup it was protecting.

Q: Why is spec/status separation with a status subresource important?
A: With subresources.status enabled, writes to /status do not touch spec and writes to the main resource do not touch status. That means your controller updating status cannot clobber a concurrent user edit to spec, and it stops status writes from bumping metadata.generation, which is what lets you compare status.observedGeneration to metadata.generation to know whether you have processed the current spec.

Q: What does envtest give you and what does it not?
A: It runs a real etcd and a real kube-apiserver locally, so your CRDs, validation, admission, and RBAC behave exactly as in a cluster. It does not run kube-controller-manager or a kubelet, so there is no garbage collection of ownerReferences, no Deployment-to-Pod expansion, Pods stay Pending forever, and deleted namespaces stay in Terminating. Anything depending on those needs a real cluster or kind.`,
      },
    ],
    introduction: `The concepts topic covers what a CRD is, what the Operator Framework capability levels mean, and when an operator is the right answer. This topic assumes all of that and deals with the part that actually takes the time: writing one that survives production.

kubebuilder is the scaffolding tool and controller-runtime is the library underneath it. Operator SDK's Go path is a wrapper around the same controller-runtime, so what you learn here transfers directly. kubebuilder init lays down a module, a Makefile, a Dockerfile, and a config/ Kustomize tree. kubebuilder create api --group apps --version v1alpha1 --kind Cluster adds api/v1alpha1/cluster_types.go (your Go API type) and internal/controller/cluster_controller.go (your reconciler), and registers both. controller-gen turns marker comments in those files into CRD YAML and RBAC ClusterRoles via make manifests.

The single most important idea is level-triggered reconciliation. Your Reconcile function is handed a namespace and name — nothing else. It is not told whether the object was created, updated, or whether a child was deleted. It must fetch current state, compare it against the spec, and take whatever action closes the gap. Run it twice in a row and the second run must be a no-op. That property, idempotency, is what lets the framework requeue freely, resync periodically, and recover from a controller restart that dropped every event in flight. Code that assumes it sees every event is edge-triggered and will be wrong within a week of shipping.

The second idea is that the API server is a concurrent, optimistic-concurrency database. Every object carries a resourceVersion. An Update fails with a 409 Conflict if the resourceVersion you read has been superseded. In a controller this is normal, not exceptional — your own status write races with a user edit, another controller's annotation, or the garbage collector. The correct handling is to re-fetch and retry, or return the conflict and let the workqueue re-drive you. Building a controller that treats conflicts as failures produces a controller that alerts constantly and fixes nothing.

The third is that deletion is cooperative. If you created something outside Kubernetes — a cloud load balancer, a DNS record, a database — the garbage collector cannot clean it up. You add a finalizer, which converts deletion into a deletionTimestamp being set, do your cleanup, and remove the finalizer to let the API server finish. Get that wrong in either direction and you leak external resources or you wedge objects in Terminating permanently, which then wedges the namespace containing them.

What an interviewer probes: whether you can explain why Reconcile takes only a key; what happens when you Get immediately after Create through the cached client; how you handle a 409 on status update; where ownerReferences do and do not work; what happens to a namespace when a finalizer is never cleared; and whether your reconciler is genuinely idempotent or just usually is.`,
    whenToUse: [
      'Automating operational knowledge for a stateful system — the reconcile loop encodes the runbook for backup, failover, version upgrade, and scaling',
      'Exposing a platform capability as a Kubernetes API so consumers declare intent in YAML and get it reconciled, rather than filing tickets',
      'Managing resources outside the cluster whose lifecycle must track a Kubernetes object — cloud databases, DNS records, IAM roles, TLS certificates',
      'Coordinating multi-object rollouts where ordering, health gating, and rollback cannot be expressed by a Deployment alone',
      'Replacing a CI job that runs kubectl apply on a cron — a controller reconciles continuously and corrects drift, which a cron job cannot',
    ],
    keyConcepts: [
      {
        term: 'Manager',
        definition: 'The controller-runtime top-level object. Owns the shared Cache, Client, Scheme, metrics and health servers, webhook server, and leader election. mgr.Start(ctx) runs every registered Runnable and blocks until ctx is cancelled. All controllers in one binary share its Cache, so one process opens one set of watches.',
      },
      {
        term: 'Cache and split Client',
        definition: 'The Cache is a set of shared informers backing an in-memory store per watched Kind. mgr.GetClient() returns a split client — reads from the Cache, writes to the API server — with no read-after-write guarantee. mgr.GetAPIReader() reads uncached, directly from the API server, for the cases where you need consistency.',
      },
      {
        term: 'Level-triggered reconciliation',
        definition: 'Reconcile receives only a NamespacedName and must derive all action from the object as it is now. Events are coalesced by key in the workqueue, so many rapid changes produce one reconcile. The consequence is a hard requirement: reconcile must be idempotent and must never assume it observed every intermediate state.',
      },
      {
        term: 'ctrl.Result and requeue',
        definition: 'Returning an error requeues the key with exponential backoff (default 5ms base, 1000s cap) and increments the error metric. Returning ctrl.Result{RequeueAfter: d} requeues after a fixed delay with no error recorded — the correct form for polling an external system. Returning an empty Result and nil error means done until the next event.',
      },
      {
        term: 'ownerReference',
        definition: 'A field in metadata linking a child object to its owner. controllerutil.SetControllerReference sets it with controller: true. It drives both Kubernetes garbage collection (delete the owner, children cascade) and the Owns() event mapping. It does not work across namespaces, and a namespaced object cannot own a cluster-scoped one.',
      },
      {
        term: 'Status subresource and conditions',
        definition: 'Enabled by // +kubebuilder:subresource:status. Splits writes so /status updates do not modify spec and do not bump metadata.generation. Conditions are the standard status shape: type, status (True/False/Unknown), reason, message, lastTransitionTime, observedGeneration — managed with meta.SetStatusCondition from apimachinery.',
      },
      {
        term: 'Finalizer',
        definition: 'A string in metadata.finalizers that blocks actual deletion. A delete request sets metadata.deletionTimestamp; the object remains until every finalizer is removed. Controllers add one with controllerutil.AddFinalizer, perform external cleanup when deletionTimestamp is non-zero, then RemoveFinalizer. A finalizer nobody removes wedges the object, and then its namespace, in Terminating.',
      },
      {
        term: 'envtest',
        definition: 'A test harness that starts a real etcd and kube-apiserver from binaries fetched by setup-envtest, loads your CRDs from config/crd/bases, and hands your tests a rest.Config. It has no kube-controller-manager and no kubelet, so there is no garbage collection, no Pod scheduling, and namespaces never finish terminating.',
      },
    ],
    approach: [
      'Scaffold: kubebuilder init --domain example.com --repo github.com/org/repo, then kubebuilder create api --group platform --version v1alpha1 --kind Cluster with both resource and controller',
      'Design the API before the controller. Put everything the user declares in Spec with validation markers, everything you observe in Status, and enable the status subresource. Model status as Conditions plus observedGeneration, not ad-hoc booleans',
      'Write Reconcile as: fetch the object (return nil on NotFound), branch on deletionTimestamp for the finalizer path, ensure each child exists and matches spec with CreateOrUpdate or a server-side-apply Patch, then update status once at the end',
      'Declare permissions with // +kubebuilder:rbac markers directly above Reconcile, run make manifests, and read the generated ClusterRole — if it grants more than the controller uses, tighten the markers rather than editing the YAML',
      'Wire SetupWithManager with For for the primary Kind, Owns for every child you create with a controller ownerReference, and Watches with an explicit map function for anything unowned. Add predicates to drop events you do not care about, GenerationChangedPredicate being the common one',
      'Test with envtest for API-level behaviour (validation, defaulting, real Create/Get/Update semantics) and plain unit tests with a fake client for reconcile branching. Reserve a kind cluster for anything needing garbage collection or running Pods',
      'Before shipping: enable leader election, set a sane MaxConcurrentReconciles, constrain cache.Options with label or field selectors, and confirm the reconcile is idempotent by running it twice against a converged object and asserting zero writes',
    ],
    pitfalls: [
      'Assuming the cached client is read-after-write consistent. Create followed immediately by Get through mgr.GetClient() can return NotFound because the watch event has not landed. Either tolerate it and requeue, or use the APIReader deliberately',
      'Writing edge-triggered logic — reconciling based on what changed rather than current state. It passes tests and then loses an event during a controller restart, leaving an object permanently half-converged',
      'Returning an error for a normal wait condition. Every "not ready yet" becomes exponential backoff plus an error metric increment; use RequeueAfter instead so the poll is regular and the error rate reflects real errors',
      'Updating spec and status in the same call, or calling Update on the whole object when only status changed. Without the status subresource this clobbers concurrent user edits to spec; with it, the spec write is silently dropped',
      'Adding a finalizer without a bounded cleanup path. When the external system is unreachable and cleanup can never succeed, the object hangs in Terminating and takes its namespace with it — and the operator being uninstalled makes it unrecoverable without manually patching finalizers',
      'Caching too much. A controller that watches Secrets or Pods cluster-wide with no selector holds them all in memory; on a large cluster the operator OOMKills and nobody connects it to the Watches call added last sprint',
    ],
    keyQuestions: [
      {
        question: 'Why does Reconcile take only a NamespacedName, and what does level-triggered actually mean for the code you write?',
        answer: `The signature is:

\`\`\`go
func (r *ClusterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error)
\`\`\`

and ctrl.Request contains exactly one field, a types.NamespacedName. No object, no event type, no old-versus-new pair.

This is a design decision, not an omission. Watch events flow into a rate-limited workqueue keyed by namespace/name. The queue deduplicates: if an object is updated fifty times in two seconds while a reconcile is running, the key is present once and one reconcile runs afterward against the final state. Handing you the object would imply the object you were given is the one you should act on, which is false — by the time your reconcile runs, the object may have changed again or been deleted.

Level-triggered versus edge-triggered. Edge-triggered means reacting to transitions: "a Pod was deleted, therefore create a replacement." Level-triggered means reacting to state: "the spec asks for three replicas, I observe two, therefore create one." Kubernetes controllers are level-triggered throughout, and the API is designed to make edge-triggered logic impossible to write correctly.

The practical consequences.

You cannot rely on seeing every event. A controller restart loses the queue. A watch can be closed by the API server and re-established with a relist. controller-runtime performs a periodic resync (SyncPeriod, defaulting to 10 hours with jitter) that re-delivers everything. Any of these breaks a controller that counts events.

Reconcile must be idempotent. Running it twice against converged state must produce no writes. The usual shape is ensure functions: read the desired child, read the actual child, create if absent, patch if different, do nothing if equal. controllerutil.CreateOrUpdate encodes this, and server-side apply with a field manager is the modern alternative that also handles field ownership.

Deletion is not an event you handle. If the object is gone by the time you reconcile, Get returns NotFound and you return success — there is nothing to reconcile. Actual cleanup of external resources goes through a finalizer, which converts deletion into a state you can observe (deletionTimestamp set) rather than an edge you might miss.

You must handle partial progress. Your reconcile may be killed at any point — process crash, SIGTERM mid-rollout, context deadline. The next reconcile picks up from whatever actually got written. So write in an order where every intermediate state is safe, and record progress in status rather than in memory.

A concrete example of the difference. Edge-triggered: "on Cluster create, provision a bucket." If the process crashes after the bucket call but before status is written, nothing ever re-triggers and the bucket is orphaned or absent. Level-triggered: "if status.bucketName is empty, provision a bucket and record its name; if it is set, verify it exists." That converges from any interrupted state, which is the entire point.

The interviewer is listening for the phrase "must be idempotent" and for one concrete failure mode of edge-triggered code. Reciting "level-triggered means it looks at state" without an example lands as memorized.`,
      },
      {
        question: 'Walk me through kubebuilder scaffolding. What does each generated piece do, and what does make manifests actually generate?',
        answer: `kubebuilder init --domain example.com --repo github.com/org/platform-operator produces the skeleton:

- go.mod with controller-runtime pinned
- cmd/main.go, which builds the Scheme, constructs the Manager with metrics, probe, leader-election and webhook options, registers each controller's SetupWithManager, and calls mgr.Start(ctrl.SetupSignalHandler())
- Makefile with the full toolchain: manifests, generate, fmt, vet, test, build, docker-build, install, deploy
- Dockerfile, a multi-stage build ending in distroless static
- config/, a Kustomize tree: crd/bases for generated CRDs, rbac for generated roles plus the service account and bindings, manager for the controller Deployment, default as the top-level overlay, samples, and prometheus and webhook components
- PROJECT, the metadata file kubebuilder reads to know which APIs exist

kubebuilder create api --group platform --version v1alpha1 --kind Cluster then adds:

- api/v1alpha1/cluster_types.go — ClusterSpec, ClusterStatus, Cluster (with TypeMeta and ObjectMeta embedded), and ClusterList. This is the file you actually design
- api/v1alpha1/groupversion_info.go — GroupVersion, SchemeBuilder, AddToScheme
- api/v1alpha1/zz_generated.deepcopy.go — generated DeepCopyObject implementations; every API type must satisfy runtime.Object and you never hand-write these
- internal/controller/cluster_controller.go — the Reconciler struct (client.Client plus *runtime.Scheme), the Reconcile stub, and SetupWithManager
- internal/controller/suite_test.go — envtest bootstrap
- config/crd/bases/platform.example.com_clusters.yaml and config/samples/platform_v1alpha1_cluster.yaml

make manifests runs controller-gen and produces two categories of output from marker comments.

CRDs. controller-gen walks api/ and derives the OpenAPI v3 schema from the Go struct fields, their json tags, and // +kubebuilder:validation: markers. So:

\`\`\`go
type ClusterSpec struct {
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=9
    // +kubebuilder:default=3
    Replicas int32 \`json:"replicas"\`

    // +kubebuilder:validation:Enum=postgres;mysql
    Engine string \`json:"engine"\`

    // +optional
    StorageClass *string \`json:"storageClass,omitempty"\`
}
\`\`\`

becomes required/optional lists, minimum and maximum, an enum, and a default in the CRD YAML. Type-level markers control the resource itself: +kubebuilder:object:root=true, +kubebuilder:subresource:status, +kubebuilder:resource:shortName=cl,scope=Namespaced, +kubebuilder:printcolumn:name="Ready",type=string,JSONPath=".status.conditions[?(@.type=='Ready')].status".

RBAC. Markers above Reconcile become a ClusterRole:

\`\`\`go
// +kubebuilder:rbac:groups=platform.example.com,resources=clusters,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=platform.example.com,resources=clusters/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=platform.example.com,resources=clusters/finalizers,verbs=update
// +kubebuilder:rbac:groups=apps,resources=statefulsets,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=events,verbs=create;patch
\`\`\`

Note the three markers for your own type: the resource, the /status subresource, and /finalizers. Missing the status one is the classic cause of "clusters.platform.example.com is forbidden" only on the status write path, which shows up late because everything else works.

make generate is separate and runs controller-gen object to regenerate zz_generated.deepcopy.go. Both must be re-run after editing types; CI should run them and fail if the working tree is dirty, otherwise generated files drift from source.

The rest of the loop: make install applies CRDs only, make run runs the controller locally against your kubeconfig with no leader election, make docker-build docker-push builds and pushes, make deploy renders config/default and applies the whole operator. make run against a real cluster is the fastest inner loop there is.`,
      },
      {
        question: 'Your status update fails with "the object has been modified; please apply your changes to the latest version." Explain the mechanism and how you fix it properly.',
        answer: `That message is a 409 Conflict from the API server, and it is optimistic concurrency working correctly.

The mechanism. Every object carries metadata.resourceVersion, an opaque string set by etcd. When you send an Update, the API server compares the resourceVersion in your payload to the current one. If they differ, someone else wrote the object between your read and your write, and the API server rejects your update rather than silently discarding their change. apierrors.IsConflict(err) reports it.

In a controller this is routine. Sources of the race include your own controller running two reconciles concurrently (MaxConcurrentReconciles above 1), a second controller annotating the object, a mutating webhook, a user kubectl edit, and the garbage collector adding or removing ownerReferences.

Fix one: retry with a fresh read. The important part is that the read must be inside the retry, not outside:

\`\`\`go
err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
    var cluster platformv1alpha1.Cluster
    if err := r.Get(ctx, req.NamespacedName, &cluster); err != nil {
        return err
    }
    meta.SetStatusCondition(&cluster.Status.Conditions, metav1.Condition{
        Type:               "Ready",
        Status:             metav1.ConditionTrue,
        Reason:             "AllReplicasReady",
        ObservedGeneration: cluster.Generation,
    })
    return r.Status().Update(ctx, &cluster)
})
\`\`\`

retry.RetryOnConflict comes from k8s.io/client-go/util/retry. Re-fetching inside the closure is what makes it correct — retrying with the same stale object just fails again.

Fix two, usually better: patch instead of update. A merge patch sends only the fields you are changing and carries no resourceVersion precondition, so it cannot conflict:

\`\`\`go
patch := client.MergeFrom(cluster.DeepCopy())
meta.SetStatusCondition(&cluster.Status.Conditions, cond)
if err := r.Status().Patch(ctx, &cluster, patch); err != nil { ... }
\`\`\`

The tradeoff is that you lose the concurrency check, so patch is right for fields only your controller owns (your own status conditions) and wrong where you are doing read-modify-write on a shared field. client.MergeFromWithOptimisticLock re-adds the resourceVersion precondition when you want both.

Fix three: server-side apply. Patch with client.Apply and a stable FieldManager name. The API server tracks per-field ownership in metadata.managedFields, so two managers writing disjoint fields never conflict, and a genuine conflict over the same field is reported explicitly rather than resolved by last-write-wins. This is the direction the ecosystem has moved and the right answer for a controller that co-manages objects with users or other controllers.

Fix four, structural: do not update status more than once per reconcile. A common shape is updating status at three points during a long reconcile, which triples the conflict surface. Accumulate the status you intend to write in a local copy and issue a single write via a deferred function at the end.

Two related points worth raising unprompted. First, use r.Status().Update, not r.Update, and enable the status subresource — otherwise your status write also submits spec, and you will overwrite a user's concurrent spec edit. Second, if conflicts are constant rather than occasional, that is a signal, not noise: usually two controllers are fighting over the same field, or your controller is writing status on every reconcile even when nothing changed, which also generates a watch event that re-triggers your own reconcile. Compare before writing.`,
      },
      {
        question: 'Explain finalizers, and walk through what happens when one is never removed.',
        answer: `Finalizers exist because the Kubernetes garbage collector can only delete Kubernetes objects. If your controller created something outside the cluster — an S3 bucket, a Route53 record, a cloud SQL instance, an entry in a CMDB — deleting the CR must trigger cleanup, and that cleanup has to happen before the object disappears.

The mechanism. metadata.finalizers is an array of strings. When a delete request arrives for an object with a non-empty finalizers list, the API server does not delete it. It sets metadata.deletionTimestamp and persists the object. The object stays visible, kubectl shows it as Terminating, and it is only actually removed when the finalizers array becomes empty.

The reconcile shape:

\`\`\`go
const finalizerName = "platform.example.com/cleanup"

if cluster.ObjectMeta.DeletionTimestamp.IsZero() {
    // not being deleted: ensure our finalizer is present
    if !controllerutil.ContainsFinalizer(&cluster, finalizerName) {
        controllerutil.AddFinalizer(&cluster, finalizerName)
        if err := r.Update(ctx, &cluster); err != nil {
            return ctrl.Result{}, err
        }
    }
} else {
    // being deleted
    if controllerutil.ContainsFinalizer(&cluster, finalizerName) {
        if err := r.deleteExternalResources(ctx, &cluster); err != nil {
            return ctrl.Result{}, err   // requeue with backoff; do not remove yet
        }
        controllerutil.RemoveFinalizer(&cluster, finalizerName)
        if err := r.Update(ctx, &cluster); err != nil {
            return ctrl.Result{}, err
        }
    }
    return ctrl.Result{}, nil           // stop reconciling a deleted object
}
\`\`\`

Ordering matters in both directions. Add the finalizer before you create any external resource, or a delete arriving in the window between creation and finalizer registration leaks the resource. Remove it only after cleanup has actually succeeded. And deleteExternalResources must be idempotent, because it will be called again on every requeue — deleting an already-deleted bucket must return success, not NotFound-as-error.

What happens when it is never removed. The object sits in Terminating indefinitely. Concretely:

The object is not deleted, so a user cannot recreate one with the same name. Anything gating on its absence blocks.

If the object is namespaced, the namespace cannot finish terminating. Namespace deletion deletes all contained objects and waits; one wedged object holds the whole namespace in Terminating forever, which then blocks recreating that namespace. This is the most common way this failure becomes visible, and it is usually reported as "the namespace is stuck", not "my CR has a finalizer".

If the operator is uninstalled while finalized objects exist, nothing is left running that knows how to remove the finalizer. This is the trap: uninstalling the operator before deleting its CRs makes every one of them permanently undeletable through normal means. Any operator with finalizers needs an uninstall order documented, and ideally a pre-delete hook that clears them.

The escape hatch is patching the finalizers array to empty:

\`\`\`bash
kubectl patch cluster my-cluster --type=merge -p '{"metadata":{"finalizers":[]}}'
\`\`\`

The object is then deleted immediately. Say clearly in an interview that this skips the cleanup the finalizer existed to guarantee, so you have just chosen to leak whatever external resource it managed. It is an incident action, followed by manual reconciliation of the external system.

Design guidance that separates a good answer. Bound the cleanup. If the external system has been unreachable for longer than some threshold, emit an Event, set a status condition explaining why deletion is blocked, and consider giving up after a deadline rather than blocking forever — a finalizer that can never succeed is worse than a leaked resource, because it takes the namespace with it. Also note that the RBAC marker for clusters/finalizers is required when your operator sets finalizers on objects it does not own, and its absence produces a forbidden error only on the delete path.`,
      },
      {
        question: 'How do you test an operator? Compare unit tests, envtest, and end-to-end, and be specific about what envtest cannot do.',
        answer: `Three layers, each buying something different.

Unit tests with a fake client. sigs.k8s.io/controller-runtime/pkg/client/fake builds an in-memory client seeded with objects. Fast, no binaries, good for reconcile branching: does a missing child get created, does an unready dependency produce a RequeueAfter, does the finalizer path fire on a non-zero deletionTimestamp. The limitations are real and worth naming — the fake client historically does not run validation, does not apply defaults, has weak status-subresource semantics unless you configure WithStatusSubresource, and does not implement server-side apply faithfully. Anything that depends on the API server behaving like an API server does not belong here.

envtest. This is the layer that matters most for operators. setup-envtest downloads matching etcd, kube-apiserver, and kubectl binaries into ./bin/k8s/; envtest.Environment starts a real control plane, installs your CRDs from config/crd/bases, and returns a rest.Config:

\`\`\`go
testEnv = &envtest.Environment{
    CRDDirectoryPaths:     []string{filepath.Join("..", "..", "config", "crd", "bases")},
    ErrorIfCRDPathMissing: true,
}
cfg, err := testEnv.Start()
\`\`\`

Because it is a real API server, you get real OpenAPI validation, real CEL rules, real defaulting, real optimistic concurrency and 409s, real admission webhooks if you configure WebhookInstallOptions, real RBAC, and real watch semantics. You can start a Manager against cfg, register your reconciler, and assert on eventual state with Eventually. This is where you catch the bugs that actually ship: a marker that produced the wrong schema, a status update that conflicts, a finalizer path that never clears.

What envtest does not give you, because there is no kube-controller-manager and no kubelet:

No garbage collection. Setting an ownerReference does nothing on owner deletion — the child survives. So you can assert that the reference was set correctly, but you cannot test cascade deletion.

No workload controllers. Creating a Deployment produces no ReplicaSet and no Pods. Creating a Job produces nothing. If your controller waits on Deployment.status.readyReplicas, that field stays zero unless your test writes it directly, which is the standard workaround.

No scheduler or kubelet. Pods you create stay Pending forever, never get an IP, never run. Anything that reads Pod status or logs cannot be tested here.

Namespaces never finish deleting. Delete a namespace and it sits in Terminating, because namespace cleanup is a kube-controller-manager job. The consequence is you cannot reuse namespace names across tests — the convention is a fresh randomly-named namespace per test case and never bothering to delete them.

No Services, no networking, no DNS, no PVC binding, no metrics-server or HPA behaviour.

End-to-end against a real cluster. kind or k3d in CI, make deploy, then apply a sample CR and assert real convergence. This is the only place that exercises garbage collection, actual Pod scheduling, your RBAC as deployed (envtest usually runs the manager with admin credentials, which hides missing rbac markers entirely), your image build, and your Kustomize overlays. Slow, so keep it to a handful of representative flows rather than duplicating envtest coverage.

Practical guidance for the answer. Put reconcile decision logic in pure functions taking observed state and returning desired state, and unit-test those exhaustively without any client at all — that is where the real logic density is. Use envtest for the API-contract behaviour. Use one e2e path for the deploy-and-converge smoke test. And run the envtest suite with -race, since it starts a real Manager with real concurrency.`,
      },
      {
        question: 'What do you configure before an operator is production-ready — leader election, caching, RBAC, and CRD validation?',
        answer: `Five things, in roughly the order they bite you.

Leader election. Without it, two replicas of the operator both reconcile everything, race each other's writes, and produce conflict storms and duplicated external resources. Enable it in the Manager options:

\`\`\`go
mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
    Scheme:                        scheme,
    LeaderElection:                true,
    LeaderElectionID:              "platform-operator.example.com",
    LeaderElectionNamespace:       "platform-system",
    LeaderElectionReleaseOnCancel: true,
})
\`\`\`

It uses a coordination.k8s.io Lease. Defaults are LeaseDuration 15s, RenewDeadline 10s, RetryPeriod 2s. LeaderElectionReleaseOnCancel makes a graceful shutdown release the lease immediately so the standby takes over without waiting out the lease — but the documentation is explicit that the binary must exit promptly after Start returns, otherwise you get two active leaders. Note that leader election gives you failover, not throughput: the standby is idle, so scale reconcile capacity with MaxConcurrentReconciles, not replicas.

Cache scoping. The default Manager caches every object of every watched Kind, cluster-wide. Watch Secrets or Pods on a large cluster and the operator holds them all in memory and OOMKills. Constrain it:

\`\`\`go
Cache: cache.Options{
    ByObject: map[client.Object]cache.ByObject{
        &corev1.Secret{}: {
            Label: labels.SelectorFromSet(labels.Set{"platform.example.com/managed": "true"}),
        },
    },
    DefaultNamespaces: map[string]cache.Config{"platform-system": {}},
},
\`\`\`

Label-select the objects you actually manage, or restrict to namespaces. Every object you exclude is memory you do not spend and watch traffic the API server does not send.

RBAC, least privilege. The generated ClusterRole is only as tight as your markers. Audit it: does the controller need delete on Secrets or only get, list, watch? Does it need cluster scope or would a namespaced Role do? Remember the three markers for your own kind — resource, /status, /finalizers — because missing the status one produces a forbidden error only on the status path, which is easy to miss until a rollout. And verify against the deployed ServiceAccount, not against your admin kubeconfig, since make run and envtest both typically use credentials that hide the gap.

CRD validation, pushed as far left as possible. Every constraint you express as an OpenAPI marker is enforced by the API server at admission, so bad specs never reach your controller and the user gets an immediate, precise rejection. Minimum, Maximum, MinLength, MaxLength, Pattern, Enum, Format, and default cover most of it. For cross-field invariants, use CEL via x-kubernetes-validations:

\`\`\`go
// +kubebuilder:validation:XValidation:rule="self.maxReplicas >= self.minReplicas",message="maxReplicas must be >= minReplicas"
type ClusterSpec struct { ... }
\`\`\`

CEL also supports transition rules with oldSelf for immutability — rule: "self == oldSelf" on a field that must never change after creation. CEL runs in the API server with no network call, so prefer it over a webhook whenever the rule is expressible.

Webhooks only for what CEL cannot do: validation requiring a lookup of other objects, or non-trivial defaulting. Two operational cautions. failurePolicy: Fail means a down webhook blocks admission for every matching object, which is a cluster-wide outage vector — scope namespaceSelector and objectSelector narrowly, run at least two replicas, and never let the webhook's own namespace match its own selector. And webhooks need a serving certificate, which in practice means cert-manager or the operator managing its own CA and patching caBundle.

Beyond those: set resource requests and limits with GOMEMLIMIT aligned to the memory limit, expose the controller-runtime metrics and alert on workqueue_depth and controller_runtime_reconcile_errors_total, wire the health and ready probes the scaffold provides, and pick a real MaxConcurrentReconciles rather than leaving it at 1 on a controller managing thousands of objects.`,
      },
    ],
    references: [
      'https://book.kubebuilder.io/quick-start',
      'https://book.kubebuilder.io/reference/markers/crd-validation',
      'https://book.kubebuilder.io/reference/using-finalizers',
      'https://book.kubebuilder.io/reference/envtest',
      'https://pkg.go.dev/sigs.k8s.io/controller-runtime',
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. HashiCorp Vault
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'cp-vault',
    title: 'HashiCorp Vault',
    icon: 'lock',
    color: '#475569',
    questions: 6,
    description: 'Vault as a system: seal and unseal, Raft storage and HA, the secret engines and auth methods that matter on Kubernetes, policy design, leases, and what happens to your applications when Vault is unavailable.',
    visualizations: [
      {
        title: 'Vault architecture: seal, storage, engines, auth, and the path into a pod',
        image: '/diagrams/devops/cp-3-vault.png',
        description: `Vault is a server with a barrier. Everything below the barrier is ciphertext; everything above it requires an authenticated token carrying policies. Understanding the layering is what makes the operational behaviour predictable.

The encryption layers. Data is encrypted with a keyring. The keyring is encrypted with the root key. The root key is encrypted with the unseal key. Vault starts sealed: the process is running and answering /sys/health, but it cannot decrypt anything, so every API call fails. Unsealing is the act of reconstructing the unseal key so Vault can decrypt the root key and read the keyring.

Shamir versus auto-unseal. By default vault operator init splits the unseal key with Shamir's Secret Sharing into N shares with a threshold of K (5 and 3 by default). Operators feed shares in one at a time until the threshold is reached. This distributes trust, and it means a restarted Vault stays sealed until humans show up — which is exactly wrong for a Kubernetes-native deployment where pods restart on node drains. Auto-unseal delegates the unwrap to a cloud KMS: AWS KMS, Azure Key Vault, GCP KMS, or an HSM over PKCS#11. Vault calls the KMS at startup, decrypts the root key, and unseals itself. The tradeoff is a hard dependency — if that KMS key is deleted or the IAM permission is revoked, Vault cannot unseal and the data is unrecoverable. Auto-unseal deployments still generate recovery keys, which serve the same quorum role for operations like generating a new root token.

The root token is a separate thing from unseal keys and interviewers like to check this. Unseal keys decrypt the root key so Vault can operate. The root token is a credential with the root policy, used for initial configuration. Best practice is to configure an auth method, then revoke the initial root token and generate one on demand from a quorum of recovery keys when you genuinely need it.

Storage and HA. Integrated Storage (Raft) is the default recommendation and removes the external Consul dependency. Each node has a node_id and a raft stanza; retry_join lets nodes find the cluster on startup. Raft replicates the full dataset to every node, so each node has a complete copy. One node is the leader and serves all writes; the others are standbys that forward or redirect client requests. Autopilot handles dead-server cleanup and stabilization. Snapshots for backup come from vault operator raft snapshot save. A three or five node cluster tolerates one or two node failures respectively while retaining quorum; lose quorum and Vault is read-unavailable until you restore.

Secret engines are mounted at paths, and the path is the API surface. Enabling an engine at a path is what makes secret/, database/, pki/, or transit/ exist.

KV is the static one. Version 1 is a plain key-value store: read and write at the mount path. Version 2 adds versioning, and the API path changes — a secret logically at kv/myapp/config is read at kv/data/myapp/config and its version history is managed at kv/metadata/myapp/config. That path difference is the number one migration bug, because policies written for kv/myapp/* silently grant nothing after an upgrade. KV v2 also distinguishes delete (soft, recoverable) from destroy (permanent) and supports check-and-set to prevent lost updates.

The database engine is the one that changes how you think. Instead of storing a password, Vault holds the privileged connection and issues credentials on demand from a role's creation_statements, each with its own lease. Read database/creds/app-role and you get a fresh username and password valid for the role's TTL. When the lease expires or is revoked, Vault runs the revocation statement and the database user is dropped. Nothing long-lived is stored anywhere. Static roles are the variant where Vault owns and rotates one existing user's password on a schedule instead of creating new users.

PKI issues X.509 certificates from a CA Vault holds, with short TTLs and per-role constraints on allowed domains and key usage. Transit is encryption as a service: your application sends plaintext to transit/encrypt/key and gets ciphertext back, and Vault never stores the data. Key rotation plus rewrap lets you re-encrypt existing ciphertext to a new key version without ever decrypting it in your application. The AWS, Azure, and GCP engines mint short-lived cloud credentials the same way the database engine mints database users.

Auth methods are the mirror image: they turn some existing identity into a Vault token with policies attached. On Kubernetes, the kubernetes method takes the pod's ServiceAccount JWT, validates it against the cluster's TokenReview API, and matches it against a role bound by bound_service_account_names and bound_service_account_namespaces. AppRole is the machine-identity method for workloads outside Kubernetes, splitting a role_id from a secret_id. JWT/OIDC covers CI systems and human SSO. The cloud IAM methods authenticate an instance or workload identity directly.

Policies are HCL granting capabilities on paths, deny by default, with deny always winning. Every token gets a lease and a TTL; every dynamic secret gets a lease you can renew or revoke. Audit devices log every request and response with sensitive strings HMACed — and if no enabled audit device can write, Vault refuses to serve requests, which is a deliberate availability-for-auditability trade you must plan for.`,
      },
      {
        title: 'Quick-fire interview answers — Vault',
        description: `Q: What is the difference between unseal keys and the root token?
A: Unseal keys reconstruct the key that decrypts Vault's root key, which is what lets Vault read its own storage at all. The root token is an authentication credential carrying the root policy. You need unseal keys to make Vault operational and a token to do anything with it. Best practice is to revoke the initial root token after configuring an auth method and regenerate one from a quorum only when needed.

Q: Why does KV v2 break my policies when I migrate from v1?
A: KV v2 inserts a segment into the API path. A secret at kv/myapp/config is read via kv/data/myapp/config, and its versions are managed at kv/metadata/myapp/config. A policy granting read on kv/myapp/* no longer matches anything. You need paths on kv/data/... for the values and kv/metadata/... for version operations and listing.

Q: How does the Kubernetes auth method actually verify a pod?
A: The pod presents its projected ServiceAccount JWT. Vault sends that token to the cluster's TokenReview API to confirm it is valid and to learn the service account name and namespace. Vault then matches those against a role's bound_service_account_names and bound_service_account_namespaces and issues a token with the role's policies and TTL. Vault needs its own credential with permission to call TokenReview, configured as token_reviewer_jwt, or it can use the incoming client JWT.

Q: What happens when a dynamic database credential's lease expires while the application is still using it?
A: Vault revokes the lease and runs the revocation statement, which drops or disables the database user. The application's existing connections may survive until the driver reconnects, then authentication fails. The application must either renew the lease before expiry, or re-read the credential and reconnect. This is why the agent sidecar or Vault Secrets Operator exists — something has to own renewal.

Q: Agent Injector, Vault Secrets Operator, or External Secrets Operator?
A: The Agent Injector is a mutating webhook that adds a Vault Agent init container and sidecar to annotated pods and renders secrets to a shared memory volume at /vault/secrets — no Kubernetes Secret object is created. VSO is a controller that syncs Vault into native Kubernetes Secrets via CRDs and can restart Deployments on rotation. ESO is the vendor-neutral equivalent that also speaks AWS, GCP, Azure, and others. Injector when you want secrets never to become etcd objects; VSO or ESO when you want normal Kubernetes Secret consumption.

Q: What happens to your applications when Vault is down?
A: Anything that reads at startup fails to start; anything that renews leases fails to renew and eventually loses its credentials. Already-issued tokens and credentials keep working until their TTL expires, so a short outage is usually survivable and a long one is not. The mitigations are HA with Raft and auto-unseal so restarts self-heal, generous TTLs on the credentials whose loss you cannot tolerate, and caching at the agent or operator layer so a read failure does not immediately break a running pod.`,
      },
    ],
    introduction: `Vault appears inside other secret-management topics as one option among several. This topic treats it as the system it actually is, because on a platform team Vault is rarely a component you consume — it is a component you operate, and the interview questions are operational.

The core proposition is that secrets should be short-lived and identity-bound rather than long-lived and file-bound. A static password in a Kubernetes Secret has an unbounded lifetime, is base64 in etcd, is visible to anyone with get on that Secret, and has no audit trail tying a use to a caller. Vault replaces that with: authenticate an identity, receive a token carrying policies, use that token to read a credential that Vault mints on the spot with a lease and a TTL, and have Vault destroy the credential when the lease ends. The database secrets engine is the clearest expression of it — the application never knows a password that outlives its session, and every credential traces to an authenticated identity in the audit log.

The architecture is worth internalizing because it explains the operational surprises. Vault stores everything encrypted; the key to decrypt it is not in storage. So a restarted Vault is sealed and useless until it is unsealed, which is either a manual quorum ceremony with Shamir shares or an automatic call to a cloud KMS. Integrated Storage (Raft) replicates the data across nodes with one leader serving writes, which is where HA comes from. And audit devices are a hard dependency by design: if Vault cannot write an audit record, it refuses the request, so a full audit disk is a Vault outage.

On Kubernetes, the piece that ties it together is the kubernetes auth method. A pod already has a cryptographically verifiable identity — its projected ServiceAccount token. Vault validates that token against the cluster's TokenReview API and maps the service account and namespace onto a Vault role with policies. That means no bootstrap secret: the pod authenticates with something Kubernetes gave it, which is the secret-zero problem solved rather than moved. Getting the resulting secrets into the container is a separate choice between the Agent Injector, the Vault Secrets Operator, and External Secrets Operator, and each makes a different trade about whether the secret ever becomes a Kubernetes Secret object.

Where interviewers push: the seal model and what auto-unseal costs you; the KV v1 to v2 path change, because it catches everyone; how the Kubernetes auth method verifies a pod and what Vault itself needs permission to do; lease lifecycle and what breaks when a credential expires under a running application; policy design for multi-tenancy including whether you reach for namespaces (Enterprise) or path conventions (open source); and the blast radius question — Vault is down, what still works.`,
    whenToUse: [
      'Any workload needing database, cloud, or API credentials that should be short-lived and per-instance rather than a shared static password',
      'Centralizing secret access with an audit trail that ties every read to an authenticated identity, which a Kubernetes Secret cannot provide',
      'Encryption as a service, where applications must encrypt data but must not hold or manage the key — the transit engine',
      'Internal PKI at scale: issuing short-lived service certificates from a CA with per-role domain and key-usage constraints, without a manual CSR workflow',
      'Multi-cluster or hybrid estates where secrets must be reachable from Kubernetes, VMs, and CI with one policy model instead of three',
    ],
    keyConcepts: [
      {
        term: 'Seal and unseal',
        definition: 'Vault starts sealed and cannot decrypt its storage. Unsealing reconstructs the unseal key that decrypts the root key that decrypts the keyring. Shamir mode splits the unseal key into N shares with threshold K, requiring a manual quorum after every restart. Auto-unseal delegates the unwrap to a cloud KMS or HSM so a restarted node unseals itself; recovery keys replace unseal shares for quorum operations.',
      },
      {
        term: 'Integrated Storage (Raft)',
        definition: 'The default storage backend. Every node holds a full replica; the Raft leader serves writes and standbys redirect or forward. Configured with a node_id and retry_join stanzas. Autopilot handles dead-server cleanup and stabilization. Backups are vault operator raft snapshot save. Losing quorum halts writes until nodes return or a snapshot is restored.',
      },
      {
        term: 'KV v2 path split',
        definition: 'A secret at kv/myapp/config is read and written at kv/data/myapp/config, while versions, soft-delete state, and custom metadata live at kv/metadata/myapp/config. Delete is a recoverable soft delete; destroy is permanent. check-and-set (cas) prevents lost updates. Policies must target the data/ and metadata/ paths, not the logical path.',
      },
      {
        term: 'Dynamic secrets and leases',
        definition: 'Reading database/creds/<role> or aws/creds/<role> makes Vault create a credential on demand and attach a lease with a lease_id and TTL. Clients renew before expiry with an advisory increment the backend may cap at max_ttl. On expiry or explicit revocation, Vault runs the revocation path and the credential ceases to exist. Revoking a token revokes every lease created with it.',
      },
      {
        term: 'Kubernetes auth method',
        definition: 'Exchanges a pod ServiceAccount JWT for a Vault token. Vault validates the JWT through the cluster TokenReview API, then matches the resulting service account name and namespace against a role bound by bound_service_account_names and bound_service_account_namespaces. Configured with kubernetes_host, kubernetes_ca_cert, and either a token_reviewer_jwt or reliance on the client JWT.',
      },
      {
        term: 'Policies',
        definition: 'HCL granting capabilities on paths. Deny by default, so an empty policy grants nothing. Capabilities are create, read, update, patch, delete, list, sudo, and deny; deny always wins regardless of any other grant, including sudo. Trailing * globs match everything below a point, + matches a single path segment, and templated policies interpolate identity values such as the entity id.',
      },
      {
        term: 'Transit engine',
        definition: 'Encryption as a service. The application posts base64 plaintext to transit/encrypt/<key> and receives ciphertext prefixed with the key version; Vault never stores the data. Key rotation creates a new version, min_decryption_version retires old ones, and rewrap re-encrypts existing ciphertext to the current version without exposing plaintext.',
      },
      {
        term: 'Audit devices',
        definition: 'file, syslog, or socket sinks recording every request and response, with most string values written as an HMAC-SHA256 rather than plaintext. Vault guarantees the record reaches at least one enabled device and refuses the API request if it cannot, so a full disk on the only audit device is a Vault outage. Enable at least two devices.',
      },
    ],
    approach: [
      'Deploy a three or five node cluster on Integrated Storage with auto-unseal against a cloud KMS. Manual Shamir unseal is not viable where pods restart on node drains',
      'Initialize once, record the recovery key shares under split custody, configure an admin auth method, then revoke the initial root token. Enable at least two audit devices before anything else touches the cluster',
      'Enable the kubernetes auth method per cluster, configure kubernetes_host and the CA, and create one role per application bound to its exact ServiceAccount name and namespace with a short token TTL',
      'Model paths before you write policies: a stable convention such as kv/data/<team>/<app>/<env> makes least-privilege policies mechanical and templated policies possible. Retrofitting a path scheme is far harder than choosing one',
      'Prefer dynamic over static wherever a backend supports it — database, aws, gcp, azure, pki. Reserve KV for configuration that genuinely has no issuing authority behind it',
      'Choose the delivery mechanism deliberately: Agent Injector when the secret must never become a Kubernetes Secret, VSO or ESO when applications should consume normal Secrets and you want rollout-on-rotation',
      'Rehearse the failure paths before production: kill the leader and watch failover, restore a Raft snapshot into a scratch cluster, seal a node and confirm auto-unseal recovers it, and fill the audit disk in staging to see exactly how the outage presents',
    ],
    pitfalls: [
      'Writing policies against KV v1 paths after migrating to v2. kv/myapp/* matches nothing once reads go to kv/data/myapp/config, and the failure is a permission denied that looks like an auth problem rather than a path problem',
      'Running a single Vault node with Shamir unseal in Kubernetes. The first node drain seals it, nothing recovers automatically, and every application that reads secrets at startup fails until a human assembles a quorum',
      'Handing out long TTLs to avoid dealing with renewal. It converts dynamic secrets back into static ones, defeats the revocation model, and leaves credentials alive long after the workload that held them is gone',
      'Enabling exactly one audit device on a disk that shares a volume with logs. When it fills, Vault stops serving every request — the fail-closed behaviour is documented and intentional, and it surprises people during an incident',
      'Granting broad policies such as read on secret/* to a shared service account because per-app roles felt like too much work. The audit log then proves only that something in the cluster read a secret',
      'Treating the initial root token as a service credential and leaving it live in a CI variable. It bypasses every policy, and its use is indistinguishable in the audit log from legitimate root operations',
    ],
    keyQuestions: [
      {
        question: 'Walk me through what happens from Vault process start to a pod reading a database credential.',
        answer: `Six stages, and naming the boundary at each one is what a strong answer sounds like.

Start and unseal. The Vault process starts sealed. It can serve /sys/health and /sys/seal-status and nothing else, because the keyring that decrypts storage is itself encrypted. With Shamir, an operator submits unseal key shares until the threshold is met and Vault reconstructs the unseal key. With auto-unseal, Vault calls the configured KMS at startup, asks it to decrypt the stored root key, and unseals itself with no human involved. Only after unsealing does the node join or resume its Raft role and, if it wins the leadership election, become active. Standbys either forward or redirect client requests to the leader.

Configuration, done once beforehand. An operator has enabled the kubernetes auth method and configured it with the cluster API address and CA:

\`\`\`bash
vault auth enable kubernetes
vault write auth/kubernetes/config \\
    kubernetes_host="https://kubernetes.default.svc:443" \\
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
\`\`\`

and created a role binding a specific ServiceAccount to a policy:

\`\`\`bash
vault write auth/kubernetes/role/orders-api \\
    bound_service_account_names=orders-api \\
    bound_service_account_namespaces=orders \\
    policies=orders-db ttl=1h
\`\`\`

The database engine is configured with a privileged connection and a role whose creation_statements define what a generated user looks like and what TTLs apply.

Authentication. The pod has a projected ServiceAccount token mounted at /var/run/secrets/kubernetes.io/serviceaccount/token. It posts that JWT to auth/kubernetes/login along with the role name. Vault does not trust the JWT on its face — it calls the cluster's TokenReview API to validate it, which is why Vault needs a credential of its own with permission to create TokenReviews (token_reviewer_jwt), or must be configured to use the client's own JWT. TokenReview returns the service account name and namespace; Vault checks them against the role's bound_service_account_names and bound_service_account_namespaces.

Token issuance. On a match, Vault returns a client token carrying the role's policies and its own TTL and lease. That token is the credential for every subsequent call. It is renewable up to a max TTL, after which the workload must re-authenticate — which it can always do, because its ServiceAccount token is regenerated by the kubelet.

Reading the secret. The application calls GET database/creds/orders-ro with that token in the X-Vault-Token header. Vault checks the token's policies against the path. If read is granted, Vault opens its privileged connection to the database, executes the role's creation_statements to create a new user with a generated username and password, and returns them together with a lease_id and lease_duration. Nothing was stored — the credential did not exist a moment ago.

Lease lifecycle. The client renews before lease_duration elapses by calling sys/leases/renew with the lease_id and an advisory increment; the backend may cap it at max_ttl. When the lease finally expires, or someone calls vault lease revoke, Vault executes the revocation statement and the database user disappears. Revoking the parent token revokes every lease created under it, which is how you kill a compromised workload's entire credential footprint in one call.

In practice, stages three through six are not application code. Either a Vault Agent sidecar performs the login, the read, the template render, and the renewal, or the Vault Secrets Operator does it in a controller and writes the result into a Kubernetes Secret. The application just reads a file or an environment variable. But the interview answer should describe the underlying flow, because when it breaks — a role bound to the wrong namespace, a missing TokenReview permission, a lease nobody renews — you debug at that level.`,
      },
      {
        question: 'Compare KV v1 and KV v2, and explain the policy and migration consequences.',
        answer: `KV v1 is a plain key-value store. You write a set of fields at a path and read them back. Writing again replaces the value; there is no history. Delete removes it. The API path is the logical path: a secret at secret/myapp/config is read at secret/myapp/config.

KV v2 adds versioning, and to do that it restructures the API surface. The same logical secret now has two API prefixes under the mount:

- <mount>/data/<path> for the secret values. Reading returns a payload with data and metadata sub-objects; writing creates a new version rather than overwriting.
- <mount>/metadata/<path> for version history, custom metadata, max_versions configuration, listing, and permanent deletion of all versions.

Plus <mount>/delete, <mount>/undelete, and <mount>/destroy for per-version operations.

The CLI hides this. vault kv get -mount=kv myapp/config works for both because the kv command translates the path for you. The HTTP API and, critically, the policy engine do not. That is the trap.

Policy consequences. A v1 policy:

\`\`\`hcl
path "secret/myapp/*" {
  capabilities = ["read", "list"]
}
\`\`\`

grants exactly nothing after migrating to v2, because reads now go to secret/data/myapp/config. The v2 equivalent needs both prefixes:

\`\`\`hcl
path "kv/data/myapp/*" {
  capabilities = ["create", "read", "update"]
}

path "kv/metadata/myapp/*" {
  capabilities = ["read", "list", "delete"]
}
\`\`\`

And the distinction between the two prefixes is a real access-control decision, not a formality. Granting metadata delete permanently removes all versions of a secret; granting only data delete does a soft delete that another operator can undelete. If you want a role that can read current values but must never see history, give it read on data/ and nothing on metadata/.

Delete versus destroy. In v2, delete is a soft delete: the version is marked deleted and reads return no data, but the ciphertext is still there and undelete restores it. destroy permanently removes the underlying version data and marks the metadata as destroyed. Deleting the metadata path removes every version irrecoverably. Interviewers ask this because people assume delete means gone and are surprised that a "deleted" secret is recoverable — which matters both for incident recovery and for compliance claims about erasure.

check-and-set. v2 supports a cas parameter on writes: cas=0 means "only create if it does not exist", cas=N means "only write if the current version is N". Setting cas_required on the mount forces every write to specify it, which eliminates lost updates when two writers race. v1 has no equivalent; last write wins silently.

max_versions and cleanup. v2 keeps a configurable number of versions per secret (10 by default) and prunes beyond that. Version history costs storage, so a secret rewritten by a CI job every few minutes with a high max_versions is a real storage growth pattern.

Migration guidance. There is no in-place upgrade of a mount from v1 to v2 that is transparent to clients; the practical path is to enable a new v2 mount, copy secrets across, update every policy to the data/ and metadata/ form, update every client that speaks raw HTTP, and then unmount the old path. The order matters — update policies before cutting clients over, because the failure mode is a permission denied that looks like an auth outage.

When v1 is still the right choice: high write rates where version history is pure overhead, and replication or storage-constrained deployments. Otherwise v2 is the default for a reason — accidental overwrite recovery alone justifies it.`,
      },
      {
        question: 'Design the auth and policy model for a multi-team Kubernetes platform on Vault. How do you get tenant isolation?',
        answer: `Start from the identity you already have. Every pod carries a projected ServiceAccount token that Kubernetes will vouch for. That is the primitive; everything else is mapping it onto Vault policies.

Auth topology. Enable the kubernetes auth method once per cluster, mounted at a path that names the cluster:

\`\`\`bash
vault auth enable -path=k8s-prod-eu kubernetes
vault write auth/k8s-prod-eu/config \\
    kubernetes_host="https://api.prod-eu.example.com" \\
    kubernetes_ca_cert=@prod-eu-ca.crt
\`\`\`

Per-cluster mounts matter because ServiceAccount names collide across clusters — orders/orders-api exists in dev, staging, and prod. Without separate mounts you cannot distinguish them, and a compromised dev pod authenticates as production.

Then one role per application, bound as tightly as the method allows:

\`\`\`bash
vault write auth/k8s-prod-eu/role/orders-api \\
    bound_service_account_names=orders-api \\
    bound_service_account_namespaces=orders \\
    token_policies=orders-api-prod \\
    token_ttl=1h token_max_ttl=8h
\`\`\`

Resist bound_service_account_names="*" and multi-namespace bindings. A role bound to a wildcard means any pod in those namespaces can assume it, and namespaces usually contain more than one workload.

Path convention first, policies second. Decide the secret path layout before writing a single policy, because policies are path globs and a bad layout makes least privilege impossible:

  kv/data/<team>/<app>/<env>/...        static configuration
  database/creds/<team>-<app>-<env>     dynamic DB credentials
  pki-int/issue/<team>-<app>            certificate issuance
  transit/keys/<team>-<app>             encryption keys

Now a policy is mechanical:

\`\`\`hcl
path "kv/data/orders/orders-api/prod/*" {
  capabilities = ["read"]
}

path "kv/metadata/orders/orders-api/prod/*" {
  capabilities = ["list"]
}

path "database/creds/orders-orders-api-prod" {
  capabilities = ["read"]
}
\`\`\`

Note what is absent: no create or update on kv, because the application reads config it does not write. Deployment pipelines get a separate role with write capability on the same prefix. Separating the read identity from the write identity is the single highest-value split in the model.

Deny is absolute. Policies are deny by default, and an explicit deny overrides every other grant including sudo. That makes a broad-grant-plus-targeted-deny pattern workable for carve-outs, but it is a blunt instrument — prefer narrow grants.

Templated policies for self-service. Where you want one policy definition to serve many entities, interpolate identity metadata:

\`\`\`hcl
path "kv/data/{{identity.entity.aliases.auth_kubernetes_a1b2c3d4.metadata.service_account_namespace}}/*" {
  capabilities = ["read"]
}
\`\`\`

Every namespace gets access to its own subtree with one policy. Use identity IDs rather than names where possible, since names can be changed.

Isolation: namespaces versus paths. Vault Enterprise namespaces give true multi-tenancy — each namespace is effectively a mini-Vault with its own auth methods, secret engines, policies, entities, and tokens, addressed by the X-Vault-Namespace header. A tenant admin can manage their own engines and policies without seeing or affecting anyone else. That is the answer when tenants must self-administer or when regulatory separation is required.

Open-source Vault has no namespaces, so isolation is by path convention plus policy discipline, and there is one central team writing policies. It works, but be honest about the limits: everyone shares one policy store and one set of mounts, a mistake in a glob can cross tenants, and there is no delegated administration. Naming namespaces as Enterprise-only, and describing the path-based fallback, is exactly the distinction interviewers are checking.

Operational glue worth mentioning. Manage roles and policies as code through the Vault Terraform provider so a policy change is a reviewed diff, not a CLI session. Keep token TTLs short — an hour with an eight hour max — and let the agent or operator re-authenticate. Enable two audit devices and ship them somewhere the Vault operators cannot silently edit.`,
      },
      {
        question: 'Compare the Vault Agent Injector, the Vault Secrets Operator, and External Secrets Operator. When do you pick each?',
        answer: `All three solve the same problem — get a secret from Vault into a container — and they make different trades about where the secret lives and who owns renewal.

Vault Agent Injector. A mutating admission webhook running in the cluster. When a pod is created with vault.hashicorp.com/agent-inject: "true", the webhook rewrites the pod spec to add a Vault Agent init container and, usually, a sidecar. Configuration is annotations:

\`\`\`yaml
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/role: "orders-api"
  vault.hashicorp.com/agent-inject-secret-db: "database/creds/orders-ro"
  vault.hashicorp.com/agent-inject-template-db: |
    {{- with secret "database/creds/orders-ro" -}}
    postgres://{{ .Data.username }}:{{ .Data.password }}@pg:5432/orders
    {{- end -}}
\`\`\`

The init container authenticates via the kubernetes auth method using the pod's ServiceAccount and renders secrets before the app container starts, so the app never races the secret. The sidecar stays resident, renews leases, and re-renders on rotation. Rendered files land in a shared in-memory volume at /vault/secrets.

The defining property: no Kubernetes Secret object is ever created. The secret is never in etcd, never visible to anyone with get on Secrets in that namespace, and disappears with the pod. That is the strongest argument for it. The costs are two extra containers per pod (real memory and CPU at scale), templates living in annotations where they are awkward to review and test, and the fact that the application must read a file — anything that only accepts a Kubernetes Secret reference for env vars, TLS, or imagePullSecrets cannot use it.

Vault Secrets Operator. A controller with CRDs: VaultConnection describes how to reach Vault, VaultAuth describes how to authenticate, and then VaultStaticSecret, VaultDynamicSecret, and VaultPKISecret each declare a source in Vault and a destination Kubernetes Secret. The operator watches those CRs, reads from Vault, and writes the result into a native Secret, keeping it in sync as the source changes.

Because the output is a normal Secret, everything in Kubernetes consumes it normally — env vars, volume mounts, TLS for Ingress. VSO also supports rolling Deployments, StatefulSets, and ReplicaSets when a secret rotates, which closes the loop that plain Secret updates leave open (a mounted Secret updates in place, but an env var does not, and most applications do not re-read either). One controller serves the whole cluster, so per-pod overhead is zero.

The cost is the thing you avoided with the Injector: the secret is now a Kubernetes Secret, which means it is in etcd and readable by any principal with RBAC on Secrets in that namespace. If your threat model includes cluster-internal access to Secrets, that is a step backwards.

External Secrets Operator. Architecturally the same shape as VSO — CRDs (SecretStore or ClusterSecretStore plus ExternalSecret) that sync a provider into a Kubernetes Secret — but vendor-neutral, with providers for Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, 1Password, and many more. It is a CNCF project rather than a HashiCorp one.

Pick it when the estate is genuinely multi-provider, when you want one secret-sync abstraction that survives replacing Vault, or when teams already run it. Pick VSO when Vault is the only backend and you want first-party support for Vault-specific behaviour — dynamic secret leases and renewal, PKI issuance, Vault Enterprise features — which ESO's Vault provider covers less deeply.

How I would actually choose. Default to VSO or ESO, because normal Kubernetes Secret consumption removes an enormous amount of friction and the per-pod cost is zero. Use the Agent Injector specifically for the workloads whose secrets must not exist as Kubernetes objects — the ones handling payment data, signing keys, or anything where a Secret read is a reportable event. Mixing both in one cluster is fine and common. What is not fine is picking the Injector cluster-wide for security theatre reasons and then discovering half your workloads need a Secret reference anyway.`,
      },
      {
        question: 'Vault becomes unavailable. Walk me through the blast radius and how you design so it is survivable.',
        answer: `Separate three distinct failure modes, because they have different effects.

Sealed. The process is running, /sys/health responds with a sealed status, and every API call fails. This happens after any restart in Shamir mode, and after a KMS or IAM failure in auto-unseal mode. Vault is up and useless.

Leader loss with quorum intact. In a Raft cluster the standbys elect a new leader within seconds. Clients see connection errors or redirects during the election and then recover. Barely an incident if clients retry.

Quorum loss. More than the tolerated number of nodes are down — two of three, or three of five. No leader can be elected, so no writes and no new leases. Recovery is bringing nodes back or restoring a snapshot into a fresh cluster, which is a real outage measured in the tens of minutes if you have rehearsed it and hours if you have not.

What breaks immediately. Anything performing a Vault read fails: pods starting up that fetch config at boot, Agent init containers (so those pods never become Ready), VSO or ESO reconciles (the existing Kubernetes Secret keeps its last value, which is a genuine advantage), CI jobs pulling deploy credentials, and any application calling transit to encrypt or decrypt — which is a hard, immediate, user-visible failure because it is in the request path rather than the startup path.

What survives, and for how long. Already-issued tokens and already-issued dynamic credentials keep working until their TTLs elapse, because the database does not consult Vault to authenticate a user Vault created earlier. Certificates issued by the PKI engine keep validating until they expire. Kubernetes Secrets already written by VSO or ESO keep being mounted. So a running fleet that is not restarting and not renewing can ride out a short outage entirely.

The clock that matters is the shortest TTL in the system. If database credentials have a one-hour TTL and renewal fails, applications lose their database at the hour mark whether or not they restarted. If token TTL is fifteen minutes, the agents fall off even sooner. This is the direct tension with the "short TTLs are more secure" instinct: shorter TTLs mean a shorter tolerance for Vault being down. Choose deliberately per credential class rather than applying one number everywhere.

Design measures, in order of value.

Auto-unseal. This is the single biggest one. It converts every restart from an incident requiring humans with key shares into a self-healing event. Without it, a node drain at 3am is a page.

Three or five node Raft cluster with anti-affinity across zones, so a single node or zone loss keeps quorum. Take and test raft snapshots, and rehearse the restore — an untested snapshot is not a backup.

Cache at the delivery layer. VSO and ESO write to Kubernetes Secrets, which persist through a Vault outage; pods continue to mount the last-synced value. The Agent sidecar can be configured to keep serving the last rendered secret rather than failing. This is why the delivery mechanism choice is also an availability choice.

Decide TTLs per blast radius. Long-lived-enough tokens for the workloads you cannot afford to lose during a Vault outage, short ones for the credentials whose compromise is expensive.

Keep transit out of the synchronous request path where you can, or accept that Vault availability is now your application's availability and size the cluster accordingly. Envelope encryption helps: use transit to wrap a data key, cache the unwrapped data key in memory, and you only need Vault at key-rotation boundaries rather than per request.

Two operational traps worth naming unprompted. First, audit devices are fail-closed by design: if no enabled device can write, Vault refuses requests. A full audit disk presents exactly like a Vault outage, which is why the documentation says enable at least two devices. Second, if the applications that must come up during a disaster read their secrets from Vault, and Vault's own recovery depends on those applications, you have a circular dependency — check that Vault can be restored using only credentials held outside Vault.`,
      },
      {
        question: 'Explain dynamic database credentials end to end, and compare them with static roles and with plain KV.',
        answer: `The point of the database engine is that no long-lived database password exists anywhere in your system except inside Vault.

Setup. Enable the engine and give Vault a privileged connection — a database account whose only job is to create and drop other accounts:

\`\`\`bash
vault secrets enable database

vault write database/config/orders-pg \\
    plugin_name=postgresql-database-plugin \\
    allowed_roles="orders-ro,orders-rw" \\
    connection_url="postgresql://{{username}}:{{password}}@pg.internal:5432/orders" \\
    username="vault-admin" password="initial"

vault write -force database/rotate-root/orders-pg
\`\`\`

That last command is important and frequently skipped: it rotates the root credential immediately so the password you typed is no longer valid anywhere. After it, nobody — including you — knows the privileged password. Vault does.

Then a role, which is a template for what a generated user looks like:

\`\`\`bash
vault write database/roles/orders-ro \\
    db_name=orders-pg \\
    creation_statements="CREATE ROLE \\"{{name}}\\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \\
                         GRANT SELECT ON ALL TABLES IN SCHEMA public TO \\"{{name}}\\";" \\
    default_ttl="1h" max_ttl="24h"
\`\`\`

The {{name}}, {{password}}, and {{expiration}} placeholders are filled by the plugin. Note VALID UNTIL — belt and braces, so the account expires at the database level even if Vault never gets to run revocation.

Issuance. A client with read on database/creds/orders-ro calls it and receives a fresh username and password plus a lease_id and lease_duration. Vault executed the creation statements against the database at that moment. Two pods reading the same path get two different users, which is what makes the audit trail useful: a slow query traced to user v-kubernetes-orders-ro-x7f2 maps to exactly one lease, one token, one authenticated identity, and one point in time.

Renewal and revocation. The holder renews before lease_duration elapses; the backend may cap the extension at max_ttl. At max_ttl the credential cannot be extended and the client must request a new one. On expiry or explicit revocation, Vault runs the revocation statement and the user is dropped. Revoking the parent token revokes every lease under it, and vault lease revoke -prefix database/creds/orders-ro kills every outstanding credential from that role at once — the correct incident response when you believe a role has been abused.

The failure mode to be honest about. When a lease expires under a running application, existing connections in the pool often survive because the database authenticated them at connect time, but any new connection fails and any pooler that reconnects fails. The symptom is an application that works fine for an hour and then fails on the first connection churn, which is a confusing incident if nobody remembers Vault is issuing the credentials. Something must own renewal — the Vault Agent sidecar, VSO with a rollout on rotation, or explicit renewal in the application via a Vault client library. This is the operational cost of dynamic credentials and the reason people wrongly retreat to static ones.

Static roles. The variant where Vault manages the password of one pre-existing database user and rotates it on a schedule:

\`\`\`bash
vault write database/static-roles/legacy-app \\
    db_name=orders-pg username="legacy_app" rotation_period=24h
\`\`\`

There is one user, one password at a time, and no lease — reads return the current password. Use it for applications that cannot handle changing usernames, or where the database user must own objects with a stable identity. The docs are explicit that you must not point a static role at the root credential the engine itself uses, because rotating it breaks every dynamic user. The cost is that a static role gives you rotation but not per-instance attribution: every pod uses the same user, so the audit trail stops at the application boundary.

Plain KV, for contrast. You store a password as data and hand it out. Vault gives you access control, encryption at rest, and an audit record of who read it — real value over a Kubernetes Secret. What it does not give you is rotation, expiry, per-consumer credentials, or revocation. If the secret leaks, the only remedy is a manual rotation coordinated with every consumer. KV is the right answer when there is no issuing authority behind the secret — a third-party API key you did not mint — and the wrong answer whenever a backend plugin exists.

The progression to state in an interview: KV is better than a Kubernetes Secret, static roles are better than KV, and dynamic credentials are better than static roles, with the cost rising at each step in the form of who has to handle renewal.`,
      },
    ],
    references: [
      'https://developer.hashicorp.com/vault/docs/concepts/seal',
      'https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2',
      'https://developer.hashicorp.com/vault/docs/auth/kubernetes',
      'https://developer.hashicorp.com/vault/docs/secrets/databases',
      'https://developer.hashicorp.com/vault/docs/concepts/policies',
    ],
  },

];
