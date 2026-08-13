// NVIDIA GeForce NOW — Platform & Infrastructure Engineering interview deck.
//
// Companion file: nvidiaGfnToolTopics.js (per-tool depth: Argo CD, Flux CD,
// StackStorm, GitLab CI, Jenkins, Vault/Terraform/Ansible, observability,
// Backstage/MCP). Both index under source `capra-nvidia-gfn`.
//
// ── PROVENANCE ──────────────────────────────────────────────────────────
// NVIDIA-side facts are from public sources only, read 2026-08-12:
//   - blogs.nvidia.com / nvidianews.nvidia.com  (SuperPOD specs, RTX 5080
//     rollout cities, GeForce NOW Alliance partners)
//   - forums.developer.nvidia.com/t/details-about-geforce-now-infrastructure/237485
//     (NVIDIA staff: custom Linux-based OS running VMs; hypervisor, VM density
//     and capacity/queueing orchestration explicitly NOT disclosed)
//   - github.com/NVIDIA/KAI-Scheduler , github.com/NVIDIA/NVSentinel
//     (NVIDIA's own open-source GPU scheduler and fault-remediation service)
//   - docs.stackstorm.com (rule/Orquesta YAML in the companion file)
// Anything NOT publicly documented is written as a question to ask, never as
// asserted fact. Do not "improve" this file by filling those gaps from memory.
//
// ── VOICE RULE — THE ONE THAT MATTERS ───────────────────────────────────
// The candidate does NOT work at NVIDIA and has not been hired. Every answer
// speaks from HIS OWN experience — Trackonomy, IBM watsonx, Wipro/OSDU, NTT
// Data, TCS, Camora — mapped onto what this JD asks for. NVIDIA specifics are
// context he has read about and questions he would ask, phrased as "from
// outside", "the posting says", "I'd want to know". Never "we", never "our
// SuperPODs", never any claim of NVIDIA employment or insider knowledge.
//
// This is why the deck is registered in STUDY_ONLY_SOURCES and gated behind
// the `nvidia-gfn` mode: an earlier company deck (capra-amd-ci) leaked into
// unfiltered retrieval and produced "I work at AMD" in behavioral answers.
//
// NOTE ON SHAPE: `questions` MUST be an array of { question, answer } — that
// is what chunker.js turns into per-Q/A chunks, the highest-value grounding
// for a live interview. A bare count (`questions: 3`) silently indexes nothing.

const ALL_GFN_TOPICS = [
  {
    id: 'gfn-platform-model',
    title: 'What GeForce NOW Actually Is — And The Three Constraints',
    icon: 'cloud',
    color: '#76b900',
    description:
      'The mental model that drives every other answer: GFN rents a gaming PC that lives in a data centre, so latency and session continuity constrain every platform decision.',
    introduction:
      "GeForce NOW streams a rendered game from a GPU in a data centre to whatever device the player is holding. The player's input travels one way, video travels the other, and the whole product is judged on latency and on the stream never stuttering.\n\nPublicly documented facts worth knowing: a GFN SuperPOD is described as over 1,000 GPUs delivering more than 39 petaflops. The RTX 5080 / Blackwell SuperPOD generation rolled out city by city rather than all at once — San Jose, Los Angeles, Chicago and Newark first in the US, Paris and Frankfurt in Europe. That region-by-region pattern is a wave-based rollout visible from outside the company. NVIDIA operates its own data centres and ALSO has the GeForce NOW Alliance, where telco partners — KDDI and SoftBank in Japan, LG U+ in Korea, Taiwan Mobile, Turkcell, Zain KSA, Pentanet in Australia — run RTX server infrastructure inside their own networks. NVIDIA staff have said publicly that GFN runs a custom Linux-based OS hosting VMs, and have explicitly declined to disclose the hypervisor, the VM-per-server density, and the capacity and queueing orchestration.\n\nThree constraints follow, and they are what make this different from an ordinary cloud platform job:\n\nOne — compute has to be near the player. That is why the estate is edge sites and partner data centres rather than three big cloud regions. Each site is a small cluster at the far end of a wide-area link you do not own and that will sometimes be down.\n\nTwo — a node is never idle-safe to touch. On a normal platform you cordon and drain and pods reschedule. Here, draining a node with a live session drops a person mid-game. Deployment, patching and hardware repair all have to be session-aware.\n\nThree — capacity is a scarce, bookable resource. A GPU seat serves one session at a time. So something has to hand out and track claims on capacity, and everything else has to ask it before acting. That is the zone reservation and lease system the posting names, and it is what makes every other operation safe.",
    whenToUse: [
      'Opening a GFN interview — establish the mental model before any technical detail',
      'Any question of the form "how would you roll this out / patch this / repair this"',
      'Explaining why an edge estate needs pull-based GitOps rather than a central push',
      'Justifying why capacity management is a platform problem, not a scheduling detail',
    ],
    keyConcepts: [
      {
        term: 'SuperPOD',
        definition:
          "NVIDIA's public term for a GFN capacity unit — described as 1,000+ GPUs and 39+ petaflops. Useful as the concrete noun for what a design answer calls a zone: the unit of rollout, drain and reservation. Use the public number; do not invent a per-SuperPOD session count.",
      },
      {
        term: 'GeForce NOW Alliance',
        definition:
          'Telco partners (KDDI, SoftBank, LG U+, Taiwan Mobile, Turkcell, Zain KSA, Pentanet) running RTX server infrastructure in their own data centres and networks. Architecturally decisive: a central control plane cannot assume inbound network reachability or credential authority into a partner\'s network, which is the strongest available argument for pull-based delivery.',
      },
      {
        term: 'Session-aware everything',
        definition:
          'The rule that no operation — deploy, patch, driver upgrade, hardware repair, autoscale-down — may proceed on a node without first asking whether a session is live on it. This converts four separate operational problems into one shared dependency on the lease system.',
      },
      {
        term: 'Wave rollout, publicly observable',
        definition:
          'The RTX 5080 SuperPOD upgrade landed city by city. Whatever the internal mechanism, the externally visible behaviour is a staged rollout with per-region gating — which is exactly what an ApplicationSet with a wave annotation or a Flux dependsOn chain produces.',
      },
      {
        term: 'What is NOT public',
        definition:
          'Hypervisor, VM density per server, and the capacity/queueing orchestration were explicitly declined by NVIDIA staff on the developer forum. Treat all three as questions to ask. Asserting them is the fastest way to lose credibility with an eighteen-year insider.',
      },
    ],
    questions: [
      {
        question: 'Tell me about yourself. (Opening, tuned for a tools-and-software manager)',
        answer:
          "Eighteen plus years across platform engineering, site reliability, DevOps and security. The consistent thread is that I build the platform and the tooling other engineers ship on.\n\nAt IBM I run the shared CI and test platform for watsonx — six thousand pipeline runs a day, distributed test execution with sharding and runner pools, flaky-test detection and quality gating — and the CI health dashboard on top of it started because I could not answer which jobs were burning our engineers' week, so I built the thing that answers it. Before that at Trackonomy I owned a sixty-five GPU bare-metal cluster — A100, V100 and T4 — alongside AWS, Azure and OCI, ran the schedulers on it, and held ninety-nine point nine seven percent uptime while taking infrastructure cost from ten million to two point seven million a year. And earlier, eleven years at TCS growing from Linux and Unix administration through middleware leadership into DevOps.\n\nWhat draws me to this role is the constraint that makes it different from a normal platform job: every safe operation depends on knowing whether someone is mid-game on that machine. Get that right and rollout, patching, repair and capacity planning stop being four problems and become one.\n\n[Delivery note: open on tooling, not cloud. Name test infrastructure explicitly — he spent eleven years in tools with Selenium in his skill list. Slip the eleven-year TCS run in before tenure can become a question. Land on the lease problem so the conversation goes where you are strongest.]",
      },
      {
        question: 'What do you know about GeForce NOW, and what would you want to know?',
        answer:
          "From the outside: it is cloud gaming where the render happens on an NVIDIA GPU in a data centre near the player and the frames are streamed down. Publicly, a SuperPOD is described as a thousand-plus GPUs and thirty-nine-plus petaflops; the RTX 5080 generation rolled out city by city — San Jose, LA, Chicago, Newark, then Paris and Frankfurt. And there is the Alliance model, where telcos like KDDI, LG U+ and Turkcell run the infrastructure inside their own networks.\n\nThat last part is the one that changes the platform design most, and it is where my questions start. If a meaningful share of capacity sits in partner data centres, then the deployment platform cannot assume it can reach in — no inbound path, no central credential authority, and a wide-area link you do not control. That pushes you hard toward a pull model: the control plane computes intent and commits it, and each site reconciles it locally.\n\nWhat I would actually want to know before proposing anything: what fraction of zones are partner-operated versus NVIDIA-operated, and does the same delivery mechanism serve both? And second — what fraction of node drains complete today without dropping a session, and is that even measured? Because from outside, the deployment platform, drain safety and staging parity all look like they could be the constraint, and usually only one of them actually is.",
      },
      {
        question: 'Why is this harder than deploying a normal stateless microservice fleet?',
        answer:
          "Three reasons, and they compound.\n\nFirst, the workload is stateful in the way that matters least conveniently: a session is pinned to a specific GPU and cannot be migrated mid-frame. There is no equivalent of draining a pod and letting the scheduler place it elsewhere. So the eviction primitive Kubernetes gives you is the wrong primitive — you need wait-for-natural-completion, not evict.\n\nSecond, the estate is geographically wide and partly not yours. Latency forces sites near players; the Alliance model puts some of those sites inside partner networks. A central controller holding credentials to every site is both a reachability problem and a blast-radius problem.\n\nThird, capacity is genuinely finite per seat. On a normal platform, if you take ten percent of nodes out for patching, you get slightly slower responses. Here you get players who cannot start a game, which is a revenue and churn event, not a latency percentile.\n\nThe thing I would carry over from my own estate: at Trackonomy the sixty-five GPU cluster had the same property at smaller scale — a training job on an A100 was not evictable without throwing away hours of work. So I built cordon-drain-repair automation that keyed off actual workload state, not node state, and the automation waited rather than evicted. Same shape, different tenant.",
      },
    ],
  },

  {
    id: 'zone-lease-service',
    title: 'Zone Reservation & Lease System — The Design Centrepiece',
    icon: 'database',
    color: '#76b900',
    description:
      'The backend service the posting names first. Leases with TTL, fencing tokens, idempotency, concurrency control, and delegation for partitioned sites — plus the gRPC/REST/MCP surface.',
    introduction:
      "A GPU seat serves one session at a time, and at least five systems want to know or change who holds a seat: the session manager when a player clicks play; the deployment system before it touches a node; the remediation automation when a GPU faults; the staging and load-test systems that need capacity that does not eat production seats; and capacity planning, which wants real utilisation rather than allocation.\n\nWithout one system of record, each grows its own idea of what is in use, and the disagreements surface as dropped sessions. So one service owns capacity claims and everything else asks it.\n\nData model, four objects. A Zone is a bookable pool of capacity at one site — the unit of rollout, drain and reservation; fields are id, datacentre, infrastructure (bare-metal or cloud or partner), gpu_sku, region, state (bootstrapping, active, draining, quarantined, retired), version. A Seat is one schedulable GPU — id, zone_id, node, gpu_index, state (free, leased, draining, quarantined), health. A Lease is a time-bounded claim on a seat by a named holder — id, seat_id, holder, purpose (session, canary, maintenance, staging), granted_at, expires_at, ttl, fencing_token, state. A Reservation is a claim on N seats in a zone for a window, consumed by leases — id, zone_id, seat_count, window, purpose, priority, owner.\n\nThe distinction that matters: a reservation is a promise about capacity, a lease is possession of a specific seat. A load test reserves forty seats in a staging zone for two hours; each worker then takes a lease on a specific seat as it starts. Deployment logic cares about leases. Capacity planning cares about reservations.",
    whenToUse: [
      'Asked to design a backend service end to end — this is the answer to reach for',
      'Any question about how deployments avoid dropping sessions',
      'Distributed systems probing: what happens on retry, on pause, on partition',
      'When asked to pick a datastore and defend it',
    ],
    keyConcepts: [
      {
        term: 'Leases expire — nothing is held forever',
        definition:
          'Every lease has a TTL and must be renewed by heartbeat. If the session manager crashes, a node loses its network, or a test worker is killed, leases expire on their own and capacity returns. No cleanup job, no leaked seats, no operator unsticking capacity at 2am. Same reasoning as Kubernetes Lease objects and Consul sessions. Set TTL longer than your worst plausible network blip and shorter than your tolerance for stranded capacity — 30-60s with a 10s heartbeat is a defensible start, and it must be a config value with a documented reason, because that is the follow-up question.',
      },
      {
        term: 'Fencing tokens — the failure-path answer',
        definition:
          'A lease alone is not enough, because a holder can pause for longer than its lease: long GC or a partition, lease expires, seat is regranted, then the zombie wakes and carries on as though it still owns the seat. Two sessions, one GPU. Fix: every grant carries a monotonically increasing token, and the node agent that actually places the workload remembers the highest token it has seen and rejects anything lower. The lease gives mutual exclusion in the happy path; the token gives it in the failure path.',
      },
      {
        term: 'Idempotency keys',
        definition:
          'Grant requests carry a client-supplied idempotency key. If the response is lost and the client retries, it gets the same lease back rather than a second seat. Without this, every network timeout during a traffic spike quietly double-books capacity — and timeouts happen precisely during spikes.',
      },
      {
        term: 'Concurrency control — SELECT FOR UPDATE SKIP LOCKED',
        definition:
          'Two grants racing for the last free seat must not both succeed. Postgres with SELECT ... FOR UPDATE SKIP LOCKED is the defensible default: a real transaction, and SKIP LOCKED means concurrent grabbers do not queue behind each other. Alternatives worth naming: etcd/Consul compare-and-swap (natural if Kubernetes-adjacent, gives watch semantics, weaker for range queries and reporting) and a version column with optimistic concurrency (cheap, portable, needs a retry loop). Say why you picked one and what measurement would make you change.',
      },
      {
        term: 'Lease delegation for partitioned sites',
        definition:
          'The strongest question they can ask: the regional lease service is central, the edge or partner site is behind a link that just dropped. Answer: the region hands each site a block of seats — a sub-lease over capacity, not over individual seats — with its own TTL. A local agent grants individual seats out of that block without talking to the region. If the link drops, the site keeps serving from the block until it expires, then stops accepting new sessions but never interrupts existing ones. On reconnect it reconciles granted leases upward. Graceful degradation, not a hard stop.',
      },
      {
        term: 'Three protocols, three callers',
        definition:
          'gRPC for the hot path (session manager, node agents): low latency, binary, generated clients, bidirectional streaming so heartbeat renewal is one long-lived stream rather than an RPC per beat, and first-class deadlines and cancellation. REST/JSON for the self-service surface (Backstage, Slack bot, dashboards, CI jobs, curl). MCP for AI assistants helping on-call — typed tools with schemas against the same API and the same authorisation, rather than handing a model kubectl.',
      },
    ],
    questions: [
      {
        question: 'Design the zone reservation and lease system. Walk me through it.',
        answer:
          "Start with why it exists: a GPU seat serves one session at a time, and five different systems all want to know or change who holds a seat — session management, deployment, remediation, staging and load test, and capacity planning. Without one system of record they each grow their own view and the disagreements show up as dropped sessions.\n\nFour objects. Zone is a bookable pool of capacity at one site — the unit of rollout, drain and reservation. Seat is one schedulable GPU. Lease is a time-bounded claim on a specific seat by a named holder. Reservation is a claim on N seats in a zone for a window, which leases are then drawn from. The distinction: a reservation is a promise about capacity, a lease is possession. Deployment cares about leases; capacity planning cares about reservations.\n\nFive design decisions carry it. One, leases expire — TTL plus heartbeat renewal, so a crashed holder returns capacity without a cleanup job. Two, fencing tokens — every grant carries a monotonically increasing token and the node agent rejects anything below the highest it has seen, so a paused holder that wakes up cannot act. Three, idempotency keys on grant, so a lost response and a retry return the same lease instead of double-booking. Four, real concurrency control at the store — I would start with Postgres and SELECT FOR UPDATE SKIP LOCKED because the correctness story is easy to explain and easy to test, and the read patterns for capacity reporting are relational. Five, delegation for partitioned sites — the region hands a site a block of seats with its own TTL and a local agent grants out of that block, so a link failure degrades to 'no new sessions when the block expires' rather than an outage at a site whose hardware is perfectly healthy.\n\nThen the payoff: once this exists, everything else in the posting gets easier. The rollout controller asks for lease count on a node before touching it and waits instead of evicting. Remediation drains at the lease layer first, so a hardware repair never drops a session. A staging zone is just a zone whose reservations are held by test systems instead of players. A canary is one percent of seats in a real zone pinned to the new build. Utilisation is measured from leases — what was actually used — rather than from allocation. And every capacity change has an actor, a reason and a timestamp in one place, which is the compliance evidence PCI and SOC 2 actually ask for.",
      },
      {
        question: 'A session manager pauses for 90 seconds on a GC. Its lease expires and the seat is regranted. Then it wakes up. What happens?',
        answer:
          "Without protection, two sessions on one GPU — the classic stale-holder failure.\n\nThe lease alone cannot fix it, because the holder can always be paused for longer than the lease; there is no timeout you can pick that makes this impossible. So the grant carries a monotonically increasing fencing token, and the enforcement point is the thing at the far end — the node agent that actually places the workload. It remembers the highest token it has ever seen for that seat and rejects any request presenting a lower one. The woken-up process presents its old token and gets refused.\n\nThe general principle: the lease gives you mutual exclusion in the happy path, the token gives it to you in the failure path. And the enforcement has to live at the resource, not at the coordinator — if the check is in the lease service, a partitioned holder that can still reach the node bypasses it entirely.\n\nThe client-side half is that the holder should notice too. On the renewal stream, a failed renew is a signal to stop work immediately rather than to retry optimistically — I would have the node agent treat a closed renew stream as 'wind down now', which is also the mechanism a drain uses to tell a holder to finish.",
      },
      {
        question: 'Why gRPC, REST and MCP? Is that not just three ways to do the same thing?',
        answer:
          "They serve three genuinely different callers, and I would push back on any of them being dropped for symmetry.\n\ngRPC is the hot path — session manager and node agents. Grants happen under a latency budget, so I want binary encoding, generated clients in whatever languages the callers are written in, and first-class deadlines and cancellation. The one that really matters is bidirectional streaming: heartbeat renewal becomes one long-lived stream instead of an RPC per beat per seat, which at SuperPOD scale is the difference between a manageable request rate and a self-inflicted DDoS. And the server closing that stream is a clean way to say 'your lease is revoked, wind down' — which is exactly what a drain needs to signal.\n\nREST and JSON is the self-service surface — Backstage, the Slack release bot, dashboards, CI jobs, and a human with curl at two in the morning. Everything can call it, it debugs easily, and it traverses ordinary proxies. Nobody wants to write a gRPC client to ask how many seats are free.\n\nMCP is for AI assistants helping on-call, and this is the part I have actually built rather than read about — I co-founded Camora, which is an agentic AI and MCP platform, so I have written MCP servers in production. The value is not that a model can do things. It is that the model calls a typed tool with a schema, against the same API a human uses, with the same authorisation and the same audit trail. Compare that to giving an assistant kubectl, where the blast radius is whatever the token can reach and the audit log is a shell history. I would split read tools — list_zones, get_zone_capacity, explain_drain, get_node_health, find_blocked_rollouts — from write tools like open_maintenance_reservation, quarantine_node and extend_drain_deadline, put an approval token on every write, and stamp the calling identity onto the audit record so the reservation opened at three in the morning is attributable.",
      },
      {
        question: 'What is your datastore, and what breaks first at scale?',
        answer:
          "I would start with Postgres. The grant path is SELECT ... FOR UPDATE SKIP LOCKED over free seats in the zone, take one, insert the lease, commit. SKIP LOCKED matters because without it, concurrent grabbers serialise behind the same row and your p99 grant latency becomes a queue depth.\n\nWhy Postgres first: the correctness story is easy to state and easy to test, and half the read traffic is relational reporting — capacity by zone, longest-running lease on this node, utilisation over a window. etcd would give me watch semantics for free and would be a natural fit if the service were Kubernetes-adjacent, but range queries and reporting get painful, and I would rather not discover that after committing.\n\nWhat breaks first: the heartbeat write rate, not the grant rate. Grants happen at session-start frequency; renewals happen every ten seconds per live seat, and at a thousand-plus GPUs per SuperPOD across many sites, that is a lot of small writes to a row you are also reading for capacity. Two mitigations, in order. First, do not write the renewal through to the row at all — keep expiry in memory in the regional service and persist lazily, accepting that a service restart re-reads and grants a grace window. Second, and this is the one that actually scales, the delegation model: once a site holds a block, its renewals are local and never touch the regional store. Regional write volume then tracks block turnover, not session turnover, which is orders of magnitude lower.\n\nThe measurement I would want before changing anything is renewal writes per second and store commit latency at p99 — I would not migrate off Postgres on a hunch.",
      },
      {
        question: 'How do you test this? It is a distributed system with time-dependent behaviour.',
        answer:
          "Three layers, and the middle one is where the bugs actually are.\n\nUnit level, the thing that makes it testable at all is injecting the clock. No direct calls to time.Now inside lease logic — a Clock interface, real in production, controllable in tests. Then expiry, renewal-just-in-time, renewal-just-too-late and token monotonicity are ordinary table-driven tests with no sleeps in them. If a test suite for a lease system contains sleeps, it is both slow and flaky.\n\nConcurrency level, the one that matters: a test that fires N concurrent grants at a zone with M free seats and asserts exactly M succeed, zero double-grants, and every failure is a clean 'no capacity' rather than an error. Run it against a real Postgres, not a mock, because the whole point is the SKIP LOCKED semantics — a mocked store tests my code and not the property I care about. I would run that under Go's race detector too.\n\nFailure level, deterministic simulation rather than chaos. Model the pause-and-wake scenario explicitly: grant to holder A, freeze A, expire, grant to B, unfreeze A, assert A's write is rejected by the node agent's token check. Same for the partition case — cut the site from the region, assert existing leases survive, assert new grants continue until block expiry, assert they stop cleanly after, assert reconciliation on reconnect does not double-count. These are the four behaviours the design claims, so they should each be a named test, and if someone breaks one the test name should tell them which promise they broke.\n\nWhat I did at IBM that is relevant: the shared test platform runs distributed execution with sharding and runner pools, and the highest-value thing I added was not more tests but flaky-test detection — because a concurrency suite that fails one time in fifty gets muted by the third engineer who hits it, and then you have no coverage at all and do not know it.",
      },
    ],
  },

  {
    id: 'session-aware-drain-rollout',
    title: 'Session-Aware Drain, Progressive Delivery & Automatic Rollback',
    icon: 'shield',
    color: '#76b900',
    description:
      'Zero-downtime rollout when you cannot evict: wave-based delivery, drain that waits rather than kills, the rollback trap in GitOps, and drift detection at three layers.',
    introduction:
      "Kubernetes gives you cordon and drain, and drain's primitive is eviction. That primitive is wrong here: evicting a pod running a live session drops a player mid-game. So the drain has to be reimplemented at the lease layer.\n\nThe sequence: mark the zone draining so no new leases are granted into it; existing leases keep running and keep renewing; watch the lease count fall as sessions end naturally; when it hits zero, cordon at the Kubernetes layer and do the actual work. The property that makes this safe is that stopping new grants is instant and cheap, while waiting for existing work is the slow part you simply have to tolerate.\n\nThat introduces the hard question, which is the long tail. Most sessions end in tens of minutes; some player will sit in a game for eight hours. You cannot wait forever and you cannot kill them silently. The answer is a drain deadline with an explicit, auditable escalation: notify the holder through the renewal stream so the client can surface 'this session will end at X' in the UI, offer to migrate at a natural boundary if the product supports one, and only then — with a recorded justification and a named actor — force. Every one of those forced drains is a defect to review, not a routine event. The metric I would want on a dashboard is the fraction of drains that complete without a forced eviction, because that single number tells you whether the platform is actually session-aware or just claims to be.",
    whenToUse: [
      'Any rollout, patching, driver-upgrade or hardware-repair question',
      'When asked how you achieve zero downtime with stateful, non-migratable workloads',
      'Explaining the difference between Kubernetes drain and what this platform needs',
      'Discussing automated rollback and why GitOps makes it subtle',
    ],
    keyConcepts: [
      {
        term: 'Drain at the lease layer, not the pod layer',
        definition:
          'Stop granting, let existing leases expire naturally, then cordon. Kubernetes eviction is the last resort with a recorded justification, not the mechanism. The rollout controller asks the lease service for the lease count on a node before it touches it, and waits.',
      },
      {
        term: 'Waves, not a global switch',
        definition:
          'Roll by blast radius: internal/staging zones, then one small production zone in one region, then a percentage of zones per region, then everything. Each wave has a bake time and an automated analysis gate. The publicly visible RTX 5080 city-by-city rollout is this shape from outside.',
      },
      {
        term: 'The GitOps rollback trap',
        definition:
          'The single most useful thing to say unprompted. Under GitOps, "roll back" by rolling back the deployment is immediately undone: the controller sees live state diverge from Git, calls it drift, and re-applies the bad version. Rollback must be a Git operation — revert the commit — or you must first suspend reconciliation for that Application/Kustomization. A rollback path that fights the reconciler is worse than no automation, because it fails at the exact moment you need it.',
      },
      {
        term: 'Automated rollback needs a signal, not a timer',
        definition:
          'Rollback triggers on the analysis gate: SLI comparison between canary seats and the rest of the zone over a bake window. For GFN the signals a player would recognise — session start success rate, stream stutter/frame-drop rate, disconnect rate — not CPU. Argo Rollouts AnalysisTemplate or Flagger against Prometheus. Trigger on burn rate, and require a minimum sample size or a low-traffic zone will roll back on two unlucky sessions.',
      },
      {
        term: 'Drift detection at three layers',
        definition:
          'Layer one, Kubernetes object drift — the reconciler already handles it (Argo OutOfSync, Flux re-apply); the decision is auto-heal on or off, and I would have it on for everything except deliberate break-glass. Layer two, infrastructure drift below Kubernetes — Terraform plan on a schedule with the diff posted, not auto-applied. Layer three, the drift nobody instruments: host-level state that neither Git nor Terraform owns — driver version, kernel module, BIOS/firmware, CUDA. That is where a GPU estate actually diverges, and the answer is inventory reported by a node agent and compared against the declared target, with divergence as an alert.',
      },
    ],
    questions: [
      {
        question: 'You need to patch every node in a zone. There are live gaming sessions. How?',
        answer:
          "The first thing is that Kubernetes drain is the wrong tool, because its primitive is eviction and eviction drops a player mid-game. So the drain moves up to the lease layer.\n\nThe sequence: mark the zone draining, which stops new lease grants into it immediately — that part is instant and costs nothing. Existing leases keep running and keep renewing. Watch the lease count fall as sessions end naturally. When it reaches zero, cordon at the Kubernetes layer, patch, validate, and return the zone to active. Because new grants stopped at the start, capacity drains monotonically instead of the whack-a-mole of cordoning while the scheduler keeps placing work.\n\nCapacity is the constraint you have to respect while doing it: you can only drain as many zones concurrently as your headroom allows, or players in that region cannot start games. So the rollout controller has to reason about regional free capacity, not just about node counts — that is a reservation the maintenance workflow takes out before it starts, which also stops two independent automations from draining the same region at once.\n\nAnd then the long tail, which is the real question. Most sessions end in tens of minutes; someone will be eight hours into a game. Drain deadline with explicit escalation: notify through the renewal stream so the client can tell the player their session ends at a specific time, migrate at a natural boundary if the product allows it, and force only with a recorded justification and a named actor. I would put 'percentage of drains completing with zero forced evictions' on a dashboard and treat every forced one as a defect to review.\n\nThe closest thing in my own experience is the sixty-five GPU cluster at Trackonomy — training jobs on A100s were not evictable without throwing away hours of compute, so the cordon-drain-repair automation keyed off actual workload state and waited. Different tenant, same rule: the automation waits, it does not kill.",
      },
      {
        question: 'The new build is bad and it is on twenty percent of zones. Roll it back.',
        answer:
          "The immediate move is to stop the bleeding before the clean fix: halt the rollout so wave three never starts. In Argo Rollouts that is an abort; with an ApplicationSet driving waves it is pausing the generator. That is one action and it caps the blast radius while I do the rest properly.\n\nThen the rollback itself, and here is the trap I would name out loud: under GitOps you cannot roll back by rolling back the deployment. The moment you do, the reconciler sees live state diverge from Git, calls it drift, and re-applies the bad version — auto-heal fights you at exactly the wrong moment. So rollback is a Git operation: revert the commit that promoted the version, and let the same reconciliation path that shipped it ship the revert. If the situation is urgent enough that waiting for a Git round-trip is unacceptable, then the correct emergency move is to suspend the Kustomization or Application first, act directly, and reconcile the Git state afterwards — but that is break-glass, it gets an audit trail, and it is not the normal path.\n\nThe session-aware part still applies on the way back. Rolling back is another rollout: same wave discipline, same lease-aware drain, because a panicked global revert that force-evicts everyone converts a degraded experience into an outage.\n\nAnd afterwards the question I would actually care about is why the analysis gate did not catch it in wave one. Either the SLI does not represent what the player experiences — CPU looked fine while frames were dropping — or the bake window was shorter than the failure's onset, or the canary sample was too small to be significant. That is the fix worth making; a faster rollback is just a better bandage.",
      },
      {
        question: 'How do you know a zone has drifted from what Git says?',
        answer:
          "I would separate it into three layers, because they have different owners and different fixes, and most people only answer the first.\n\nLayer one is Kubernetes object drift, and the reconciler handles it: Argo CD shows OutOfSync and Flux simply re-applies on its interval. The real decision is whether auto-heal is on. I would have it on everywhere except a deliberate break-glass window, because 'someone kubectl edited production and it stuck' is how a fleet becomes unreproducible.\n\nLayer two is infrastructure below Kubernetes — the node pool, the network, the load balancer. Git does not know about that; Terraform does. So a scheduled terraform plan with the diff posted to a channel and never auto-applied. Auto-applying infrastructure drift correction is how you delete a subnet at 3am.\n\nLayer three is the one nobody instruments and the one that actually bites a GPU estate: host state that neither Git nor Terraform owns. Driver version, kernel module, firmware and BIOS, CUDA runtime. A node can be perfectly in sync at layers one and two and still be the odd one out because a driver rollout half-completed. The fix is a node agent reporting an inventory of exactly those things, compared against the declared target for the zone, and divergence raised as an alert rather than discovered during an incident. On the sixty-five GPU cluster I ran staged driver rollouts with kernel-module compatibility validation for exactly this reason — a driver and kernel pair that works on eight nodes and not the ninth is invisible to every layer above it.\n\nNVIDIA's own NVSentinel project is public and does the health half of this — DCGM-based detection, CEL rules for quarantine, then cordon, drain and a maintenance CRD. I would want to know whether GFN already uses it or something in-house, because if so the integration question is how it interacts with the lease layer: it needs to drain at the lease level, not evict, or the self-healing itself becomes the thing dropping sessions.",
      },
    ],
  },

  {
    id: 'go-operator-crd',
    title: 'Go Operators & CRDs — controller-runtime Done Correctly',
    icon: 'code',
    color: '#76b900',
    description:
      'What a senior reviewer checks in a reconcile loop: spec vs status, conditions, observedGeneration, finalizers, owner references, requeue strategy, and honest multi-cluster.',
    introduction:
      "The team writes operators in Go, and the hiring manager lists Golang himself, so 'the posting says Go or Python' is not a usable dodge here. The bar is a real controller-runtime conversation.\n\nThe single most important idea, and the one that separates people who have written an operator from people who have read about one: spec is what I want, status is what I observe. A controller reads spec, acts on the world, and writes back what it saw. It never writes desired numbers into its own status — if the controller is the only thing incrementing a counter in status, nothing is actually happening anywhere and the status is fiction. Real scaling writes desired replicas into a child object and reads the actual count back on the next pass.\n\nThe second idea is that a reconcile loop must be level-triggered and idempotent, not edge-triggered. It is called with an object name, not an event description. It should read current state, compute desired state, converge, and be safe to run a thousand times in a row. Anything that assumes 'this is the create event' is a bug waiting for a controller restart.\n\nAnd requeue: a controller only wakes on watch events for objects it owns. If a decision depends on an external metric — GPU utilisation, a lease count from another service — nothing in Kubernetes changes when that metric moves, so the loop sleeps forever. Either return ctrl.Result{RequeueAfter: interval} to poll, or better, have a separate watcher write the observed value onto the object so the write triggers a normal watch event. Polling in reconcile is the simple version; event-driven is what scales to thousands of objects.",
    whenToUse: [
      'Any CRD or operator question — this team owns operators for scheduling, autoscaling and compliance',
      'When shown code and asked to review it',
      'Multi-cluster fleet management design',
      'Explaining why admission control beats in-controller policy checks',
    ],
    keyConcepts: [
      {
        term: 'Spec vs status',
        definition:
          'Spec is desired, status is observed. Writing a desired value into your own status makes nothing happen and makes the status a lie. Scaling means writing replicas into a child Deployment/StatefulSet or a per-cluster manifest, then reading the real count back into status next pass.',
      },
      {
        term: 'Conditions, not phase strings',
        definition:
          'A free-text phase field cannot be waited on: nobody can run kubectl wait --for=condition=Ready, and Argo CD cannot use it as a custom health check. Use metav1.Condition with types like Ready, Compliant, Synchronized, each with reason, message and observedGeneration. This is what makes an operator composable with the rest of the ecosystem.',
      },
      {
        term: 'observedGeneration',
        definition:
          'Set status.observedGeneration = obj.Generation every pass. Without it you cannot tell whether the status reflects the current spec or a spec from three edits ago — which means neither a human nor a health check can trust it.',
      },
      {
        term: 'Finalizers',
        definition:
          'Deleting the CR must release what it holds. For a GFN-shaped operator that means remote state on edge clusters and, critically, leased capacity — otherwise deleting an object strands seats. Add a finalizer, handle DeletionTimestamp before anything else in Reconcile, release, then remove the finalizer.',
      },
      {
        term: 'Owner references and .Owns()',
        definition:
          'controllerutil.SetControllerReference on children plus .Owns(&appsv1.Deployment{}) in SetupWithManager. Without owner refs, children are not garbage collected with the parent; without .Owns(), the controller never wakes when a child is edited or deleted, so someone can delete your Deployment and the operator will not notice.',
      },
      {
        term: 'Patch from a DeepCopy base',
        definition:
          'Take base := obj.DeepCopy() at the top, mutate, then Status().Patch(ctx, obj, client.MergeFrom(base)). A full Update clobbers concurrent writers and loses fields written by another controller between your read and your write.',
      },
      {
        term: 'Policy belongs at admission first',
        definition:
          'Registry allow-listing, digest pinning and similar rules belong in Kyverno or Gatekeeper, cluster-wide, so they catch every workload rather than only the ones wrapped in your CRD. The in-controller check is a second layer and an evidence source for audit. Saying this unprompted is worth more than the code.',
      },
    ],
    questions: [
      {
        question: 'Walk me through the structure of a reconcile loop for a deployment CRD across many clusters.',
        answer:
          "I would draw it as six stages.\n\nOne, get the object, and return client.IgnoreNotFound on error — a delete that already happened is not an error.\n\nTwo, the deletion path, before anything else. If DeletionTimestamp is set, run the release logic — remote state on the edge clusters, and any leased capacity this object holds — then drop the finalizer and return. Otherwise ensure the finalizer is present. Getting this order wrong is how you strand seats on a delete.\n\nThree, take base := obj.DeepCopy() so all my writes are patches against a known base rather than a full Update that clobbers a concurrent writer, and set status.ObservedGeneration = obj.Generation so the status I am about to write is attributable to this spec.\n\nFour, policy as a second line of defence — admission control is the first. If it fails, set a Compliant=False condition with a reason, emit a Kubernetes Event so it shows in kubectl describe, patch status, and return without an error so the work queue does not hot-loop on something a retry cannot fix.\n\nFive, converge per target. For each scheduling target, compute the desired replica count and apply it — to a child object or as an intent commit — and collect what actually came back. On failure, set Ready=False with the target named and return the error so the work queue backs off exponentially.\n\nSix, status is what I observed, not what I asked for. Write the per-target observed counts, set the conditions, patch once. And decide the requeue: if any input is an external metric that Kubernetes cannot watch, return RequeueAfter rather than an empty Result, or the loop never runs again.\n\nOn multi-cluster I would be honest that there are two architectures and I can argue both. Push means the central controller holds a client per remote cluster from a registry of kubeconfigs and applies directly — simple, immediate, but it needs reachability and credentials to every site, it is an attractive blast radius, and a dropped link stops reconciliation for that site. Pull means the controller writes rendered manifests to Git or an OCI artefact and each site runs its own Argo or Flux. For an estate that includes partner-operated data centres inside someone else's network, I would default to pull: no inbound path, credentials stay local, and a partitioned site degrades to 'stale but working' rather than 'unmanaged'. I would keep push only for genuine break-glass like an emergency global cordon, with its own audit trail.",
      },
      {
        question: 'Here is a controller that scales GPU pools. What would you check first?',
        answer:
          "Six things, roughly in the order I would find them.\n\nFirst, does the loop ever run again? If it returns an empty ctrl.Result and the scaling decision depends on GPU utilisation — an external metric that changes without any Kubernetes object changing — then after the first pass it sleeps until someone edits the spec. The autoscaler silently never fires. Fix is RequeueAfter, or better, a metrics watcher that writes the observed value onto the object so the write is a normal watch event.\n\nSecond, does scaling actually scale? If the code does something like status.ActiveReplicas += 5, nothing was created anywhere — status is the observed state of the world, and incrementing it just makes the status wrong. Desired counts go into a child object's spec.\n\nThird, is any phase or condition overwritten before it is persisted? A common one is setting phase to Scaling inside a helper and then unconditionally setting it to Synchronized a few lines later before the single status write, so the Scaling state is never observable by anyone.\n\nFourth, conditions and observedGeneration. A free-text phase cannot be waited on and Argo CD cannot use it as a health check, and without observedGeneration nobody can tell if the status matches the current spec.\n\nFifth, lifecycle: owner references on children plus .Owns() in SetupWithManager, and a finalizer that releases remote state and leases. Without .Owns() someone can delete a child and the controller will never notice.\n\nSixth, the policy check — I would look at whether it validates the workload or the config. A registry allow-list check that iterates the allow-list and flags entries not containing a registry host is checking the policy against itself, not checking the image. The correct version parses the image reference, compares its registry host against the allow list, and separately requires a digest rather than a mutable tag if the compliance profile demands it. And I would say that this belongs at admission with Kyverno or Gatekeeper as the primary control, because that catches every workload rather than just the ones wrapped in this CRD; the controller check is layer two and an evidence source.",
      },
      {
        question: 'Python is your primary language. This team writes Go. Talk to me about that.',
        answer:
          "Straight answer: Python is my primary language — control-plane services, platform APIs, FastAPI backends, automation. Go is a language I read fluently and have worked in around the Kubernetes ecosystem, but I have not shipped a large Go service as the primary author, and I would rather say that plainly than have it discovered in week two.\n\nWhat I would put against it. The hard part of operator work is not Go syntax, it is the reconciliation model — level-triggered convergence, spec versus status, conditions and observedGeneration, finalizers and owner references, requeue strategy, and knowing that policy belongs at admission rather than in the loop. That model I know well, because it is the same model I have been operating from the other side for years: I have run Argo CD and Flux across a hundred-plus applications and debugged plenty of controllers behaving badly, which is a good way to learn what a correct one looks like.\n\nOn ramp-up, Go is a deliberately small language and the ecosystem here is narrow and well-trodden — controller-runtime, kubebuilder, client-go. I would expect to be productive on well-scoped controller work quickly and to want review on idiomatic error wrapping, context propagation and concurrency patterns for the first while. I also use Claude Code, Copilot and Cursor daily, which genuinely compresses the syntax-fluency part of picking up a language — the part it does not compress is knowing what correct looks like, which is the part I already have.\n\nAnd I would not claim it without doing it. I have been building a throwaway operator with kubebuilder specifically so that this is a demonstrated statement rather than a promise.",
      },
    ],
  },

  {
    id: 'hm-round-positioning',
    title: 'Hiring Manager Round — Positioning, Risks and Questions',
    icon: 'users',
    color: '#76b900',
    description:
      'A tools engineer of eleven years, then four as a backend software engineer, now managing GFN. What that changes about the pitch, and the four objections to close before he raises them.',
    introduction:
      "The manager's career is the single most useful piece of preparation. Eighteen years at NVIDIA: four years as a software tools development engineer, nearly seven more as a senior tools development engineer, then four years as a senior software engineer, then manager of the GFN system software team. Eleven years in developer tools and automation, then backend software, then management. His own skill list, in his own order, leads with Java Spring, Golang, Python and MicroServices; DevOps, Ansible and CI/CD sit in the middle; Selenium is there because of the test-automation heritage.\n\nFive things follow. One: lead the second half of the pitch with developer tooling, not cloud infrastructure — every other candidate opens with Kubernetes and multi-cloud, and the part of this background that speaks his first language is usually put second. Two: treat this as a backend software interview with an infrastructure context; the first responsibility in the posting is backend microservices and REST/gRPC/MCP APIs, and the lease service is the centrepiece, not a gap-filler. Three: ask before prescribing — he has watched this platform evolve through every generation and knows why the parts that look wrong from outside are the way they are. Four: the Go gap is more exposed with him than it would be with an infrastructure manager. Five: OCI appears on his skill list and not in the posting, and there is real OCI experience to mention when cloud coverage comes up — as an overlap, never as a claim about what GFN runs on.\n\nAnd one more, on depth: eighteen years in one place produces a bias toward depth over breadth. A pitch that lists ten technologies reads as thin. Pick two or three and go all the way down — the lease and drain problem, the CI and test-health platform, and the GPU cluster actually operated — and let him pull the rest out.",
    whenToUse: [
      'The hiring manager round specifically',
      'Any "tell me about yourself" or "why this role" question',
      'When tenure, seniority or location comes up',
      'Choosing which project to lead with',
    ],
    keyConcepts: [
      {
        term: 'Lead with the tool-building habit',
        definition:
          'git-dboard (CI and test health — run history, pipeline duration, failure clustering, rerun-heavy jobs per team, runner and queue visibility; grew at IBM into gate evaluation and auto-merge) and cloudforge (a pipeline and Terraform generator that became an agentic coding tool with a verification loop). Tell it as a habit, not a portfolio: "I keep building the tool the team needed and nobody had time to build." A manager who spent eleven years in tools recognises his own story.',
      },
      {
        term: 'Test infrastructure is the most under-used asset',
        definition:
          'Distributed test execution with sharding, runner pools, result aggregation, retry policy, plus flaky-test and test-health detection at IBM. Given eleven years in tools and Selenium on his skill list, unreliable tests and unreliable staging are his lived pain. This is the item most likely to land and least likely to be mentioned by other candidates.',
      },
      {
        term: 'Risk — tenure, read by a lifer',
        definition:
          'IBM contract since Feb 2026 and Trackonomy Oct 2023 to Jan 2026 can read as movement to someone who has been at one company since 2008. Counter with the truth and lead with it: eleven years at TCS from 2007 to 2018, growing from systems administration through middleware leadership into DevOps. "I am not looking for another two-year stop — this is a platform problem you only solve properly if you stay long enough to own it through a few generations."',
      },
      {
        term: 'Risk — fifteen years leading, applying as an IC',
        definition:
          'Close it yourself, once, early: what I want now is senior IC scope, owning a platform end to end rather than staffing plans; what the leadership years give me is usefulness at the parts of a senior IC job people find hardest — unblocking others, mentoring, getting a design agreed across teams that do not report to each other. Then let it go. Repeating it makes it sound unconvincing.',
      },
      {
        term: 'Risk — Pune and San Jose',
        definition:
          'He manages from Pune; the req exists in both Santa Clara and Pune. Ask early and as logistics, not as a concern, then give the positive framing: a San Jose engineer gives US-hours coverage and proximity to US sites, and what to agree up front is the overlap window and how on-call splits, because that is what quietly decides whether it works.',
      },
      {
        term: 'Ask before you prescribe',
        definition:
          '"I would not want to propose changes to something I have not seen. What I would want to know first is which of these problems is actually costing you time today — because from outside, the deployment platform, the drain safety and the staging parity all look like they could be the constraint, and only one of them usually is."',
      },
    ],
    questions: [
      {
        question: 'Why do you want this role? / Why NVIDIA?',
        answer:
          "Two reasons, one about the problem and one about the fit.\n\nThe problem first. Most platform jobs are variations on the same thing — ship containers safely, keep them up. This one has a constraint I have not had at this scale: every safe operation depends on knowing whether a person is mid-game on that specific machine. That single constraint reorganises everything above it. Rollout, patching, hardware repair and capacity planning stop being four separate workflows and become one dependency on a capacity system. I find that genuinely interesting, and it is the kind of problem where getting the primitive right pays off across the whole platform rather than in one workflow.\n\nThe fit is the hybrid shape. I have spent the last few years with one foot in each world — a sixty-five GPU bare-metal cluster at Trackonomy with A100s, V100s and T4s, PXE and image provisioning, IPMI and BMC recovery, driver and CUDA lifecycle, staged driver rollouts with kernel-module validation — running alongside AWS, Azure and OCI clusters, all delivered from one declarative control plane. Most candidates have one or the other. The posting asks for both, plus bare metal and partner sites, and that is unusually close to what I have actually done.\n\nAnd the honest third reason: this is a platform I would want to still be working on in five years. My last two roles were shorter for specific reasons — Trackonomy was build-from-nothing, IBM is a contract — but the shape of my career is long tenure; I was at TCS for eleven years. This is a problem you only get to solve properly if you stay through a few generations of it.",
      },
      {
        question: 'You have led teams for fifteen years. This is an individual contributor role.',
        answer:
          "I have led teams for most of my career and I have enjoyed it. What I want now is senior individual contributor scope — owning a platform end to end and being deep in it, rather than in staffing plans and performance cycles.\n\nWhat the leadership years actually give me is that I am useful at the parts of a senior IC job people tend to find hardest: unblocking other engineers, mentoring, and getting a design agreed across teams that do not report to each other. On a platform team that last one is most of the job — you are asking other teams to adopt your golden path, and that is influence without authority.\n\nI am not looking to manage here, and I am not going to be restless about it. The thing I actually miss when I am managing is being deep enough in the system to fix it myself.\n\n[Delivery note: say it once, early, and then let it go. Do not return to it. Repeating it makes it sound like something you are convincing yourself of.]",
      },
      {
        question: 'What would you change about our deployment platform?',
        answer:
          "Honestly — I would not want to propose changes to something I have not seen. You have been building this through several generations, and the parts that look wrong from outside are usually the parts with the most history behind them.\n\nWhat I would want to know first is which of these is actually costing you time today. From outside, three things all look like they could be the constraint: the deployment platform itself, drain safety — whether a rollout can reliably avoid dropping sessions — and staging parity, whether teams can catch a regression before a real player does. In my experience only one of those is usually the real bottleneck and the other two are noise, and I would rather find out which than arrive with a list.\n\nIf I can ask one diagnostic question, it is this: what fraction of node drains complete without dropping a session, and is that measured today? Because if it is measured and the number is high, the platform is genuinely session-aware and the interesting work is elsewhere. If it is not measured, that is usually the first thing I would build, because you cannot improve a safety property you cannot see — and it tends to be cheap to instrument relative to what it tells you.\n\nThe pattern I would bring is the one I keep repeating: at Trackonomy and again at IBM, the highest-leverage thing was not a new pipeline, it was building the dashboard that answered a question nobody could answer. git-dboard started because I could not tell which jobs were burning our engineers' week.",
      },
      {
        question: 'Your last two roles have been about two years each. (Tenure probe)',
        answer:
          "They have, and both were deliberate rather than drift. Trackonomy was a build-it-from-nothing platform role — I went in to stand up the Kubernetes deployment platform and the GPU cluster, led a six-engineer team, and got it to a hundred-plus applications and fifty-plus zero-downtime deployments a day. The IBM engagement is a contract, and it is scoped as one.\n\nBut the shape of my career is actually long tenure. I was at TCS for eleven years, 2007 to 2018 — I started in Linux and Unix administration, led a four-person admin team, then a fourteen-person middleware engineering team, and moved into cloud and DevOps from there. That is the pattern I am most comfortable in: stay long enough to own something through several generations and to live with your own decisions.\n\nThat is part of why this role interests me specifically. A deployment platform for a live service is not something you can meaningfully change in eighteen months — you learn what actually breaks in year two and you fix the architecture in year three. I am not looking for another two-year stop.",
      },
      {
        question: 'How do you use AI tools in your work?',
        answer:
          "Daily, and in two different ways that I would keep separate.\n\nThe first is ordinary: Claude Code, Copilot and Cursor for platform and pipeline development — writing Terraform modules, controller scaffolding, pipeline definitions, tests. The honest framing is that it compresses the syntax-fluency part of the work and does nothing for the judgement part. It is very good at producing a plausible reconcile loop and it will happily give you one with no requeue and a status write that scales nothing. So I treat generated code as a draft from a fast junior: useful, reviewed line by line, and never shipped because it looked right.\n\nThe second is the part most candidates do not have. I co-founded Camora, an agentic AI and MCP platform — MCP servers exposing operational tooling to LLM agents, multi-provider LLM orchestration with routing and fallback, and a hybrid BM25-plus-vector retrieval pipeline with reranking. So I have built the agent-facing side in production, not just consumed it. That matters for this posting because it names MCP APIs in the first responsibility, and the useful opinion I have from building them is about safety rather than capability: the point of exposing operations through MCP is that the model calls a typed tool with a schema, against the same API a human uses, with the same authorisation and the same audit trail — instead of being handed a shell. Read tools open, write tools behind an approval token, calling identity stamped on the audit record.\n\nWhere I would actually apply it here: on-call. 'Which zones are draining and why is this one stuck' is a question that takes a human several dashboards and takes a typed tool one call.",
      },
      {
        question: 'What questions do you have for me?',
        answer:
          "[Ask three or four. These are tuned to him specifically rather than to the team generally.]\n\n1. You spent about eleven years in tools development before moving to the platform side. How much of your team's time now goes into building the platform versus operating it? — Shows you read his background properly, and the answer tells you whether this is a building role or an on-call role.\n\n2. How is the team split between Pune and the US, and where would this role sit day to day? — Ask this early. Practical, not presumptuous, and it changes your working life.\n\n3. What fraction of node drains complete without dropping a session — and is that measured today? — The best question on the list. It signals you understand GFN specifically rather than platforms generally.\n\n4. How much of this role is backend service development versus infrastructure automation? The posting leads with APIs and I want to calibrate. — Given his language list, the answer matters, and asking shows you noticed the ordering.\n\n5. What is the biggest recurring source of unplanned work for the team right now? — A manager's question; gets a more honest answer than asking about challenges.\n\n6. What would you want this person to have done by month six that nobody is doing today? — Forces specificity and tells you whether the role is actually defined.",
      },
    ],
  },
];

// ── Source split: whose voice is the content in? ─────────────────────────
//
// Two sources, because behavioral mode must be able to reach one and not the
// other.
//
// capra-nvidia-gfn is technical study material ABOUT NVIDIA's systems. It must
// never ground a behavioral answer — that is how a model ends up narrating a
// company's architecture as the candidate's own job history.
//
// capra-nvidia-gfn-personal is the candidate's OWN positioning: his career, his
// metrics, his reasons, his answers to questions about himself. Blocking that
// from behavioral was the bug — it is exactly what a behavioral answer should
// be grounded on, and it is already written in his first-person voice.
const PERSONAL_TOPIC_IDS = new Set(['hm-round-positioning']);

export const nvidiaGfnTopics = ALL_GFN_TOPICS.filter((t) => !PERSONAL_TOPIC_IDS.has(t.id));
export const nvidiaGfnPersonalTopics = ALL_GFN_TOPICS.filter((t) => PERSONAL_TOPIC_IDS.has(t.id));
