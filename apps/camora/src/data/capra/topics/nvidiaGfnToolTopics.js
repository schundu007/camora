// NVIDIA GeForce NOW deck — per-tool depth.
//
// Companion to nvidiaGfnTopics.js. Both index under source `capra-nvidia-gfn`,
// which is study-only: reachable solely through the `nvidia-gfn` mode. Read the
// PROVENANCE and VOICE RULE headers in nvidiaGfnTopics.js before editing — the
// same rules bind this file. Short version: the candidate does not work at
// NVIDIA, so every answer speaks from his own experience (Trackonomy, IBM
// watsonx, Wipro/OSDU, NTT Data, TCS, Camora) mapped onto what the posting asks.
//
// One topic per tool the job description names, because the posting is unusually
// specific and a lifer will probe the named tools rather than the categories:
//   Argo CD + Flux CD · StackStorm · GitLab CI + Jenkins + supply chain ·
//   Vault/Terraform/Ansible on bare metal · Prometheus/Grafana/Datadog/ELK +
//   SLOs · Backstage self-service + MCP · prod-like staging zones · the coding
//   round.
//
// StackStorm YAML below is from docs.stackstorm.com (rules.html, orquesta.html),
// read 2026-08-12. NVSentinel and KAI-Scheduler are NVIDIA's own public repos.

const ALL_GFN_TOOL_TOPICS = [
  {
    id: 'gfn-argocd-fluxcd',
    title: 'Argo CD and Flux CD — Running Both, and Why',
    icon: 'git-branch',
    color: '#76b900',
    description:
      'Pull-based delivery across an estate that includes partner-operated data centres: ApplicationSets, sync waves, Kustomization dependsOn, health gates, and the honest Argo-vs-Flux answer.',
    introduction:
      "The posting names both Argo CD and Flux CD, which usually means either a migration in progress or a deliberate split. Expect to be asked to justify running both, and have a real answer rather than a preference.\n\nThe honest comparison. Argo CD is an application delivery product: it has a UI and an API, an opinionated Application/ApplicationSet model, RBAC and SSO built for humans, sync waves and hooks, and a first-class health model that understands whether a rollout actually succeeded. That makes it strong where people need to see and drive state — promotions, rollbacks, on-call answering 'is wave two green'. Flux is a set of composable controllers — source, kustomize, helm, notification, image-automation — with no UI, driven entirely by CRs. That makes it strong as unattended machinery close to the workload: a small footprint at an edge site, image automation, and Kustomization dependsOn for ordering platform add-ons.\n\nThe split I would argue for on a GFN-shaped estate: Flux at the sites, because it is small, has no inbound requirement, and reconciles happily through a flaky wide-area link; Argo CD centrally as the human-facing control plane for the application estate, promotions and visibility. What I would not do is have both reconcile the same objects — two controllers with auto-heal on the same Kustomization is a fight that ends in a sync loop, and the fix is boring ownership boundaries written down: this namespace, this repo path, this controller.\n\nThe architectural point that matters more than either tool: with partner-operated sites, pull is not a preference, it is a requirement. There is no inbound path into a telco's network, credentials should stay local, and a partitioned site should degrade to stale-but-working rather than unmanaged.",
    whenToUse: [
      'Any GitOps question — the strongest area of this background',
      'Justifying push vs pull for edge and partner-operated sites',
      'Multi-cluster rollout ordering and promotion',
      'When asked why an organisation would run two GitOps tools',
    ],
    keyConcepts: [
      {
        term: 'ApplicationSet generators',
        definition:
          'The mechanism that makes many clusters manageable from one definition. A cluster generator templates one Application per registered cluster; a matrix generator crosses clusters with app definitions; a git generator drives from directory structure. Wave rollout comes from generator selectors on cluster labels — wave=1 for canary zones, then wave=2 — so promotion is a label change, which is auditable in Git.',
      },
      {
        term: 'Sync waves and hooks',
        definition:
          'argocd.argoproj.io/sync-wave orders resources within a sync (CRDs before the controllers that use them, namespace before its contents). PreSync/PostSync/SyncFail hooks run jobs at defined points — a PostSync smoke test that fails the sync is a cheap gate, and SyncFail is where you trigger notification rather than trying to be clever with rollback.',
      },
      {
        term: 'Flux dependsOn and health gating',
        definition:
          'Kustomization.spec.dependsOn plus healthChecks makes ordering explicit and real: the dependent Kustomization does not apply until the named resources report healthy, not merely until the previous apply returned. This is what makes automated zone bootstrapping work — CNI, then GPU Operator, then DCGM exporter, then the workload — with each stage genuinely ready before the next.',
      },
      {
        term: 'Custom health checks',
        definition:
          'Argo CD evaluates resource health with Lua scripts, so a custom CRD can report healthy/degraded/progressing to the UI and to sync waves. This is the payoff for writing proper status conditions in your operator — a phase string cannot be read by a health check, a Ready condition can. It also means a rollout can be gated on your own CRD converging.',
      },
      {
        term: 'Drift, auto-heal, and the rollback interaction',
        definition:
          'selfHeal reverts live drift automatically; prune deletes resources removed from Git. Both should be on for a fleet you want reproducible. The consequence to state unprompted: with selfHeal on, you cannot roll back by changing the cluster — the controller re-applies the bad version within the reconcile interval. Rollback is a Git revert, or you suspend the Application/Kustomization first as break-glass.',
      },
      {
        term: 'Secrets never in Git',
        definition:
          'SOPS with age or KMS, or External Secrets Operator pulling from Vault, or Sealed Secrets. On a partner-operated site the relevant property is that the decryption key lives at the site and never leaves it, so the Git repo is safe to replicate anywhere and a compromised central repo does not yield secrets.',
      },
    ],
    questions: [
      {
        question: 'You run both Argo CD and Flux. Why? Would you consolidate?',
        answer:
          "I would want to know the history before answering whether to consolidate, because two GitOps tools is usually either a migration someone stopped halfway through or a deliberate split — and those need opposite responses.\n\nIf it is deliberate, the split I would defend is Flux at the sites and Argo CD centrally. Flux is a handful of controllers driven by CRs with no UI and no inbound requirement, which is what you want running unattended at an edge site behind a link you do not control — small footprint, reconciles on its interval, and it does not care that nobody can reach it. Argo CD is an application delivery product with a UI, an API, RBAC and SSO, sync waves, and a real health model, which is what you want centrally where humans drive promotions and on-call needs to answer 'is wave two green' without kubectl.\n\nIf it is a stalled migration, I would consolidate — but on evidence, not taste. The cost of two tools is not the tools, it is two mental models, two failure modes and two sets of runbooks at 3am.\n\nThe one thing I would fix immediately in either case is overlap. Two controllers with auto-heal reconciling the same objects is a sync loop, and I have seen that turn into a genuinely confusing incident. The fix is unexciting: written ownership boundaries by repo path and namespace, and a check that fails CI if a path is claimed twice.\n\nI ran both at Trackonomy across a hundred-plus applications with fifty-plus zero-downtime deployments a day, and at Wipro on OSDU across Azure and AWS. The thing I would actually bring is less about which tool and more about the promotion model on top of them — environment overlays, gates, and the discipline that the only way state changes is a commit.",
      },
      {
        question: 'How do you roll a change out across many zones without a global switch?',
        answer:
          "Waves driven by cluster labels, so promotion is a Git change rather than a console action.\n\nConcretely with Argo CD: an ApplicationSet with a cluster generator, selecting on a label like gfn.rollout/wave. Wave zero is internal and staging zones. Wave one is one small production zone in one region. Wave two is a percentage per region. Wave three is everything. Promotion between waves is a commit that changes a label or a selector, which means the rollout history is the Git history and there is no 'who clicked what' question afterwards.\n\nEach wave needs three things or it is just a slower global switch. A bake time long enough for the failure mode you are afraid of to actually appear — if a memory leak takes forty minutes to bite, a ten-minute bake proves nothing. An automated analysis gate comparing the canary against the rest of the zone on signals a player would recognise: session start success rate, stream stutter or frame-drop rate, disconnect rate. Not CPU. And a minimum sample size, or a low-traffic zone rolls back on two unlucky sessions.\n\nThe GFN-specific part is that every wave is also a drain. You cannot swap a build under a live session, so entering a wave means marking zones draining at the lease layer, letting sessions end naturally, then applying. Which means the rollout controller has to reason about regional free capacity — you can only drain as many zones at once as your headroom allows, or players in that region cannot start games. I would model that as the rollout taking out a maintenance reservation before it starts, which also stops two automations draining the same region simultaneously.\n\nInterestingly the RTX 5080 SuperPOD rollout was publicly visible as exactly this shape — San Jose, LA, Chicago and Newark first, then Paris and Frankfurt. Whatever the internal mechanism, from outside it reads as staged regional gating.",
      },
      {
        question: 'A site has been unreachable for six hours. What is the state of the world when it comes back?',
        answer:
          "This is the question that decides push versus pull, and it is why I would default to pull for an estate with partner-operated data centres.\n\nUnder pull, the site was never unmanaged. Flux at the site kept reconciling its last-known-good Git state against the live cluster the entire time — it could not fetch new commits, but it kept correcting drift and kept the workload running. Sessions kept serving. When the link returns, it fetches, sees the commits it missed, and converges. The failure mode is 'stale but working', and staleness is visible: Flux exposes last successful reconcile time and source revision, so a dashboard of 'sites more than N minutes behind HEAD' is the alert I would build.\n\nUnder push, the same six hours mean the central controller could not reach the site at all, so the site was genuinely unmanaged — no drift correction, no reconciliation — and the controller's own status is stale in a way that is easy to misread as healthy.\n\nThe part that needs care on reconnect is the lease layer, not the config layer. If the site was running on a delegated block of seats, it granted leases locally for six hours and the regional service knows nothing about them. So reconciliation has to be upward and additive: the site reports the leases it granted, the region absorbs them, and the region must not treat a seat it thinks is free but the site says is leased as available. Design rule — the site is authoritative for seats inside its own block, the region is authoritative for block allocation. Without that rule you get exactly the double-booking the whole design exists to prevent.\n\nAnd if the block expired during the partition, the site stopped accepting new sessions but kept existing ones alive, which is the degradation I would want: no new work, no dropped players, hardware perfectly healthy the whole time.",
      },
    ],
  },

  {
    id: 'gfn-stackstorm',
    title: 'StackStorm — Event-Driven Automation and Self-Healing',
    icon: 'zap',
    color: '#76b900',
    description:
      'Sensors, triggers, rules and Orquesta workflows with real YAML — plus the judgement question a tools manager actually cares about: when NOT to automate.',
    introduction:
      "StackStorm is named explicitly in the posting, so know its vocabulary precisely rather than describing 'event-driven automation' generically.\n\nThe model has five nouns. A Sensor is a Python plugin that watches or receives external events. When something happens it emits a Trigger, which is StackStorm's representation of that event — either generic (core.st2.IntervalTimer, core.st2.CronTimer, core.st2.webhook) or integration-specific. A Rule is the connective tissue: it matches a trigger against criteria and maps the trigger payload onto the inputs of exactly one action or workflow. An Action is an outbound integration — SSH, HTTP, a Python script, a kubectl call. A Pack groups sensors, actions, rules and workflows as a deployable, version-controlled unit, which is what lets you treat automation as code rather than as console state.\n\nCriteria are richer than people expect and worth knowing by name: equals and nequals, lessthan and greaterthan, regex and iregex, matchwildcard, contains/ncontains and the case-insensitive variants, startswith and endswith, exists and nexists, inside and ninside, timediff_lt and timediff_gt, and search for matching inside arrays with child criteria. A rule holds exactly one action — multiple steps mean a workflow.\n\nOrquesta is the workflow language: version, input, vars, tasks and output, where each task has an action, input, and a next list of transitions with when conditions, publish to update context, and do to name the following tasks. It has join for barrier synchronisation (join: all or a count), with for iteration including a concurrency limit, retry with when/count/delay, and delay. Conditions are YAQL or Jinja — succeeded(), failed(), result(), ctx().\n\nThe reason StackStorm fits GFN is that hardware faults are events, not schedules. A DCGM Xid error, a thermal event, a failed health probe — each should trigger a bounded workflow that ends with the node out of rotation and a human informed, without a human in the loop for the routine path.",
    whenToUse: [
      'Any self-healing, auto-remediation or runbook-automation question',
      'When asked how a failed GPU comes out of rotation without dropping a session',
      'ChatOps and Slack release-bot questions',
      'The judgement question: when does automation make things worse',
    ],
    keyConcepts: [
      {
        term: 'Sensor → Trigger → Rule → Action/Workflow',
        definition:
          'The whole model in one line. Sensors watch, triggers represent the event, rules match criteria and map payload to inputs, actions and workflows do the work. Packs make all of it version-controlled and deployable, which is the difference between automation you can review in a PR and automation that lives in someone\'s console.',
      },
      {
        term: 'Rule YAML',
        definition:
          'name, pack, enabled, trigger {type, parameters}, criteria {trigger.field: {type, pattern}}, action {ref, parameters with Jinja {{ trigger.x }}}. One action per rule. Criteria types include equals, regex, iregex, matchwildcard, contains, startswith, endswith, exists, inside, timediff_lt/gt, and search for arrays.',
      },
      {
        term: 'Orquesta task transitions',
        definition:
          'next is a list of {when, publish, do}. when is a YAQL/Jinja condition like <% succeeded() %> or <% result().lease_count = 0 %>; publish writes into workflow context; do names the next task(s). join: all makes a barrier; with: gives iteration with an optional concurrency cap; retry: {when, count, delay} handles transient failures without a bespoke loop.',
      },
      {
        term: 'Bounded escalation, not unbounded retry',
        definition:
          'Every remediation workflow ends in one of three states: fixed, escalated to a human with context, or explicitly given up on with a reason. Never a silent loop. The workflow should also record what it did, because the artefact that makes automation trustworthy is the audit trail, not the success rate.',
      },
      {
        term: 'The repeat-offender rule',
        definition:
          'A node that gets auto-remediated three times in a rolling window stops being auto-remediated and gets quarantined for a human instead. Without this, automation converts a hardware fault into an invisible flapping loop, and the fleet quietly loses capacity to a node that keeps getting healed and re-breaking. This is the single best thing to say to a manager who has seen automation make things worse.',
      },
      {
        term: 'The lease-layer ordering',
        definition:
          'A GFN remediation workflow must drain at the lease layer before it cordons or evicts, or the self-healing itself becomes the thing dropping sessions. The order is: stop new grants into the seat/node, wait for existing leases, then cordon, then repair. NVIDIA\'s own public NVSentinel project does detection via DCGM, CEL-rule quarantine, cordon, drain and a maintenance CRD — worth asking whether GFN uses it, and if so how it interacts with session state.',
      },
    ],
    questions: [
      {
        question: 'A GPU throws an Xid error at 3am. Walk me through what happens, end to end.',
        answer:
          "In StackStorm terms: a sensor is watching the health signal — either DCGM metrics through Prometheus alerting into a webhook, or a sensor polling DCGM directly. It emits a trigger with the node, GPU index, Xid code and timestamp as payload. A rule matches on that trigger with criteria on the Xid code, because not every Xid means the same thing — some are application-level and some mean the board is going away — and routes to an Orquesta workflow rather than a single action, because this is multi-step.\n\nThe workflow, in order, and the order is the whole answer:\n\nFirst, ask the lease service what is on this seat. If a session is live, do not touch it. Mark the seat draining so no new lease is granted onto it, and wait — the workflow polls or subscribes for lease count to reach zero, with a deadline. This is the step people skip, and skipping it means your self-healing is what drops the player.\n\nSecond, once the seat is free, quarantine it and cordon the node at the Kubernetes layer so the scheduler stops placing work.\n\nThird, attempt the bounded remediation appropriate to the fault class — GPU reset, driver reload, or a node reboot — with retry when/count/delay for the transient case rather than an open-ended loop.\n\nFourth, validate before returning it: run a DCGM health check and only return the seat to the pool if it passes. Returning an unvalidated node to rotation is how one bad GPU takes several sessions instead of one.\n\nFifth, terminate in a defined state. Fixed, and record it. Or escalate with context — node, Xid history, what was attempted, what the health check said — into the on-call channel. Never silently loop.\n\nAnd the guard that matters most: a repeat-offender check at the top. If this node has been remediated three times in a rolling window, skip the automation, quarantine it for a human, and open a hardware ticket. Otherwise you have built a machine for hiding a dying board while quietly losing capacity to it.\n\nAt Trackonomy this is the pattern that took MTTR down sixty percent and incidents down sixty-five percent — anomaly-triggered runbooks that cordoned, drained, repaired and returned nodes without a human. The GPU-specific part, Xid and ECC and thermal handling on A100s and V100s, is the part I would carry straight over.",
      },
      {
        question: 'Show me what that rule and workflow actually look like.',
        answer:
          "The rule — one trigger, criteria, one action, payload mapped through Jinja:\n\n```yaml\n---\nname: gpu_xid_to_remediation\npack: gfn_ops\ndescription: Route hardware-class Xid events into the session-safe drain workflow.\nenabled: true\n\ntrigger:\n  type: core.st2.webhook          # Alertmanager posts DCGM alerts here\n  parameters:\n    url: gpu-health\n\ncriteria:\n  trigger.body.alertname:\n    type: equals\n    pattern: DcgmXidError\n  trigger.body.labels.xid:\n    # Hardware-class Xids only. Application-class ones are noise here.\n    type: regex\n    pattern: \"^(48|63|64|74|79|94|95)$\"\n  trigger.body.status:\n    type: equals\n    pattern: firing\n\naction:\n  ref: gfn_ops.remediate_gpu_fault\n  parameters:\n    node: \"{{ trigger.body.labels.instance }}\"\n    gpu_index: \"{{ trigger.body.labels.gpu }}\"\n    xid: \"{{ trigger.body.labels.xid }}\"\n```\n\nAnd the Orquesta workflow. Note the drain-before-cordon ordering and the repeat-offender guard at the top:\n\n```yaml\nversion: 1.0\ndescription: Session-safe GPU fault remediation.\n\ninput:\n  - node\n  - gpu_index\n  - xid\n  - drain_deadline_minutes: 240\n\nvars:\n  - outcome: unknown\n\ntasks:\n  check_repeat_offender:\n    # Automation that heals the same board forever hides a dying board.\n    action: gfn_ops.remediation_count node=<% ctx(node) %> window=24h\n    next:\n      - when: <% succeeded() and result().count >= 3 %>\n        publish: outcome=\"quarantined_for_human\"\n        do: quarantine_permanently\n      - when: <% succeeded() and result().count < 3 %>\n        do: stop_new_leases\n\n  stop_new_leases:\n    # Lease layer FIRST. Cordoning here would not protect a live session.\n    action: gfn_ops.seat_set_state node=<% ctx(node) %>\n            gpu_index=<% ctx(gpu_index) %> state=draining\n    next:\n      - when: <% succeeded() %>\n        do: await_session_end\n\n  await_session_end:\n    action: gfn_ops.wait_for_zero_leases\n            node=<% ctx(node) %> gpu_index=<% ctx(gpu_index) %>\n            timeout_minutes=<% ctx(drain_deadline_minutes) %>\n    next:\n      - when: <% succeeded() %>\n        do: cordon_and_repair\n      - when: <% failed() %>\n        publish: outcome=\"drain_deadline_exceeded\"\n        do: escalate      # a human decides whether to end someone's session\n\n  cordon_and_repair:\n    action: gfn_ops.gpu_reset node=<% ctx(node) %> gpu_index=<% ctx(gpu_index) %>\n    retry:\n      when: <% failed() %>\n      count: 2\n      delay: 30\n    next:\n      - when: <% succeeded() %>\n        do: validate_health\n      - when: <% failed() %>\n        publish: outcome=\"reset_failed\"\n        do: escalate\n\n  validate_health:\n    # Never return an unvalidated GPU to the pool.\n    action: gfn_ops.dcgm_diag node=<% ctx(node) %> level=3\n    next:\n      - when: <% succeeded() and result().passed %>\n        publish: outcome=\"repaired\"\n        do: return_to_pool\n      - when: <% succeeded() and not result().passed %>\n        publish: outcome=\"failed_diagnostics\"\n        do: quarantine_permanently\n\n  return_to_pool:\n    action: gfn_ops.seat_set_state node=<% ctx(node) %>\n            gpu_index=<% ctx(gpu_index) %> state=free\n    next:\n      - when: <% succeeded() %>\n        do: notify\n\n  quarantine_permanently:\n    action: gfn_ops.open_hardware_ticket node=<% ctx(node) %> xid=<% ctx(xid) %>\n    next:\n      - do: notify\n\n  escalate:\n    action: gfn_ops.page_oncall\n            node=<% ctx(node) %> xid=<% ctx(xid) %> outcome=<% ctx(outcome) %>\n    next:\n      - do: notify\n\n  notify:\n    join: all\n    action: slack.post_message channel=\"#gfn-fleet\"\n            message=\"<% ctx(node) %> gpu <% ctx(gpu_index) %> xid <% ctx(xid) %>: <% ctx(outcome) %>\"\n\noutput:\n  - outcome: <% ctx(outcome) %>\n```\n\nThe two things I would point at if asked what matters here: the lease check comes before the cordon, and every terminal path publishes an outcome and reaches notify through a join, so there is no branch that ends silently.",
      },
      {
        question: 'When would you NOT automate something?',
        answer:
          "Three cases, and I hold them fairly firmly because I have been burned by each.\n\nFirst, when the diagnosis is not reliable. Automation acts on a signal; if the signal is only right eighty percent of the time, you have built a machine that takes the wrong action twenty percent of the time, faster than a human would and with less attention. The fix is to automate the detection and the evidence-gathering first and leave the action to a human — a page that arrives with the node, the Xid history, the last three remediation attempts and the current lease count is enormously valuable even if a person still presses the button. Automate the boring half first.\n\nSecond, when the action is irreversible and the blast radius is wide. Reboot a node, fine. Reimage it, fine. Drain a whole zone during peak hours in a region, no — that gets a human, because the cost of being wrong is a region of players who cannot start games, and no amount of test coverage makes me confident enough to hand that to a rule with a regex on it.\n\nThird, when the failure is rare enough that the automation will rot. Something that fires twice a year will be broken the third time — the API changed, a credential rotated, an assumption moved — and now you have an automation that fails during an incident, which is worse than not having it, because someone is waiting for it to work. For those I would rather have a well-written runbook that a human executes and that gets read often enough to stay true.\n\nThe general rule I would state: automate the frequent and reversible, instrument the rare and dangerous. And put a repeat-offender guard on anything self-healing, because the failure mode of good automation is not that it breaks — it is that it succeeds at hiding a problem you needed to see.",
      },
    ],
  },

  {
    id: 'gfn-gitlab-jenkins-supplychain',
    title: 'GitLab CI, Jenkins and the Supply Chain',
    icon: 'settings',
    color: '#76b900',
    description:
      'Why both CI systems exist, hardware-attached testing in Jenkins, and what PCI and SOC 2 actually ask of a build pipeline.',
    introduction:
      "The posting names GitLab CI and Jenkins together. In practice that pairing almost always means the same thing: GitLab CI runs the software pipeline — build, unit test, container image, scan, publish, promote — and Jenkins survives because it is attached to hardware. Firmware flashing, driver validation across a matrix of GPU SKUs, lab machines with physical devices, long-running soak tests. Jenkins has thirty years of plugins for talking to things with cables in them, and pipeline-as-code with shared libraries makes it maintainable rather than a snowflake.\n\nThe answer to 'why not consolidate' is that consolidation is a real goal but hardware-attached testing is the last thing to move and often should not move. The thing I would actually insist on is that both feed one place: one artefact registry, one provenance record, one dashboard where a change's status is visible regardless of which system ran which stage. Two CI systems is tolerable. Two answers to 'did this change pass' is not.\n\nOn supply chain, the framing that lands with auditors and engineers simultaneously: PCI and SOC 2 do not ask 'do you scan images'. They ask whether you can prove what is running in production, who approved it, that it came from reviewed source, and that the record cannot be quietly edited. That translates into concrete controls — digest pinning rather than mutable tags, signing with cosign and verification at admission, SBOM generation at build time, provenance attestation, and protected branches with required review. The reason to state it that way is that it converts a compliance conversation into an engineering one.",
    whenToUse: [
      'CI/CD platform questions, especially "why two systems"',
      'Hardware and driver validation pipelines',
      'Any PCI, SOC 2 or CIS hardening question',
      'Build performance and scale questions',
    ],
    keyConcepts: [
      {
        term: 'GitLab CI at scale',
        definition:
          'needs: for a real DAG rather than stage-by-stage lockstep; rules: with changes: for path-based triggering so a docs change does not run the GPU matrix; cache:key:files for dependency caching keyed on the lockfile; parallel:matrix for fan-out; interruptible: true plus auto-cancel so a force-push frees runners immediately; and ephemeral runners so each job gets a clean machine and no credential survives it.',
      },
      {
        term: 'Jenkins that is maintainable',
        definition:
          'Declarative pipeline in a Jenkinsfile, shared libraries in vars/ for the logic so it is reviewed and versioned rather than pasted into job config, agents by label for hardware capability, and lockable resources for physical devices that only one job may hold. If the interesting logic lives in the Jenkins UI, it is not pipeline-as-code.',
      },
      {
        term: 'Hardware matrix testing',
        definition:
          'A GPU matrix is not a cloud matrix: agents are scarce, physically distinct and sometimes broken. That means labels describing capability rather than machine name, a lock on the device so two jobs cannot flash the same board, a health check before and after the job so a run does not silently execute on a degraded card, and quarantine of the agent rather than the test when the same machine fails repeatedly.',
      },
      {
        term: 'Digest pinning over tags',
        definition:
          'Tags are mutable, so a tag-pinned deployment is not reproducible and is not evidence. Deploy by digest, and enforce it at admission with Kyverno or Gatekeeper so it is a property of the cluster rather than a convention people follow. This is usually the single highest-value supply-chain control per unit of effort.',
      },
      {
        term: 'Sign and verify, SBOM, provenance',
        definition:
          'cosign sign at publish, cosign verify enforced by an admission policy so an unsigned image cannot run. SBOM (syft/trivy) generated at build and stored as an attestation, not regenerated later from the image, because after-the-fact SBOMs describe what you can see rather than what went in. SLSA provenance records which pipeline, which commit and which builder produced the artefact.',
      },
      {
        term: 'CIS hardening in one page',
        definition:
          'RBAC with no cluster-admin bindings for workloads and no wildcard verbs; Pod Security Admission at restricted for workload namespaces; default-deny NetworkPolicy per namespace with explicit allows; no privileged containers, read-only root filesystem, drop all capabilities and add back only what is needed; audit logging on and shipped off-cluster; etcd encrypted at rest; kubelet anonymous-auth off. Then measure it continuously with kube-bench rather than asserting it once.',
      },
    ],
    questions: [
      {
        question: 'Why would an organisation keep Jenkins when it has GitLab CI?',
        answer:
          "Usually because Jenkins is attached to hardware and GitLab CI is not — and that is a better reason than it first sounds.\n\nThe software pipeline belongs in GitLab CI: build, unit and integration tests, container image, scanning, publish, promote. It is a better fit for that work — cheaper ephemeral runners, a DAG with needs:, path-based rules so a docs change does not trigger a full build, and it lives next to the merge request.\n\nJenkins tends to survive where jobs talk to physical things: flashing firmware, validating a driver across a matrix of actual GPU SKUs, lab machines with devices cabled to them, long soak tests holding a specific board for hours. Jenkins has decades of plugins for that world, and lockable resources for 'only one job may hold this device' is genuinely useful and not something you want to reimplement.\n\nSo I would not treat consolidation as automatically correct. What I would insist on is that two CI systems do not become two answers to the same question. One artefact registry, one provenance record, one place where a change's overall status is visible regardless of which system ran which stage. Two pipelines is a cost you can live with; two truths is not.\n\nThe thing I would want to fix if it were not already true is the Jenkins side being pipeline-as-code — declarative Jenkinsfile, shared libraries in a versioned repo, nothing interesting configured in the UI. A Jenkins where the logic lives in job config is not CI, it is a machine nobody dares touch. That was a real part of my work at NTT Data, where I built the Jenkins and Ansible pipelines for healthcare applications and pushed DevSecOps controls — Vault, SonarQube, OWASP — into the delivery path itself rather than bolting them on.",
      },
      {
        question: 'Six thousand pipeline runs a day. How did you get there and what broke?',
        answer:
          "That is the IBM watsonx platform, and the honest version is that the scale-out was the easy part and the bottlenecks were not where I expected.\n\nWhat got us to a hundred-fold CI scale-out: ephemeral self-hosted runner fleets so capacity is elastic and every job gets a clean machine; aggressive build and layer caching keyed on lockfiles rather than branch, which is the difference between a cache that helps and a cache that thrashes; matrix parallelisation; and containerised build images so the toolchain is pinned and identical everywhere instead of drifting per agent.\n\nWhat actually broke, in order. First, queue wait — not job duration. Engineers experience CI as time-to-feedback, and we were optimising the wrong number for a while; once I instrumented queue wait and runner saturation separately from build duration, the real fix turned out to be scaling policy rather than faster builds. Second, cache correctness — a cache keyed too loosely gives you fast, wrong builds, which is worse than slow ones. Third, and the one that matters most at this volume, flaky tests. At six thousand runs a day a one-percent flake rate is sixty spurious failures daily, and what happens next is cultural: people start re-running as a reflex, then they stop believing red, and the gate stops being a gate. So I built flaky-test and test-health detection — repeatedly failing and rerun-heavy jobs surfaced per team — and turned delivery reliability into tracked SLOs with alerting rather than anecdote.\n\nThat is the same instinct behind git-dboard, which started at Trackonomy because I could not answer which jobs were burning our engineers' week, and grew at IBM into gate evaluation and auto-merge. The general lesson I would bring here: at scale, CI reliability is a product problem, not an infrastructure problem, and the highest-leverage thing is usually the dashboard that tells you which of your assumptions is wrong.",
      },
      {
        question: 'What does PCI or SOC 2 actually require of your pipeline?',
        answer:
          "Not the checklist people expect. The underlying question in both is: can you prove what is running in production, that it came from reviewed source, who approved it, and that the record cannot be quietly edited afterwards. Everything concrete falls out of that.\n\nProvenance: the artefact in production must be traceable to a commit and a pipeline run. That means deploying by digest rather than by tag — a tag is mutable, so a tag-pinned deployment is not evidence of anything — and generating SLSA-style provenance at build time recording the builder, the source revision and the inputs.\n\nIntegrity: sign at publish with cosign, and verify at admission with Kyverno or Gatekeeper so an unsigned or unknown-registry image physically cannot run. The important word is 'at admission' — a policy enforced in a pipeline is a convention, a policy enforced by the cluster is a control, and auditors understand that distinction better than engineers sometimes expect.\n\nContents: SBOM generated at build and stored as an attestation, not regenerated later by scanning the image, because a later scan tells you what is visible rather than what went in. Then continuous vulnerability scanning against those SBOMs so a newly disclosed CVE surfaces against things already deployed.\n\nApproval and separation of duties: protected branches, required review, and the deploy path being a Git commit — which is where GitOps genuinely helps, because the audit evidence is the repository history rather than a report someone generates.\n\nImmutability of the record: audit logs shipped off-cluster to somewhere the people who can deploy cannot edit.\n\nAt Trackonomy I hardened multi-tenant clusters against CIS with RBAC, network policy, admission control, resource quotas and Trivy and Falco under SOC 2 audit, and the thing that made the audit easy was not the controls, it was that every control produced evidence automatically. The one I would add for a GFN-shaped estate is that the lease system is itself a compliance artefact — every capacity change with an actor, a reason and a timestamp in one place answers a whole category of questions about who did what to production hardware.",
      },
    ],
  },

  {
    id: 'gfn-vault-terraform-ansible',
    title: 'Bare-Metal Bootstrap — Terraform, Ansible and Vault',
    icon: 'server',
    color: '#76b900',
    description:
      'Getting a rack from powered-on to serving sessions, and the bootstrap-secret problem that every honest answer has to address.',
    introduction:
      "Automated zone bootstrapping is a named responsibility. The useful way to answer it is as stages, because it makes clear which tool owns what and where the interesting problems are.\n\nStage one, physical and network: rack, cable, switch and VLAN config, out-of-band management reachable — IPMI or Redfish. Stage two, operating system: PXE or a golden image, disk layout, kernel version and boot parameters. Stage three, host configuration: NVIDIA driver and CUDA, kernel modules, NUMA and CPU pinning, hugepages, NIC tuning — Ansible's territory, because it is imperative convergence on a machine that already exists. Stage four, cluster join: kubeadm or equivalent, node labels and taints describing GPU SKU, zone and rollout wave. Stage five, identity and secrets: the node gets a workload identity and can authenticate to Vault. Stage six, platform stack: CNI, GPU Operator, DCGM exporter, log and metric agents, policy — and this is where GitOps takes over, ideally as a Flux Kustomization chain with dependsOn and health gates so each layer is genuinely ready before the next. Stage seven, capacity registration: the zone registers itself with the lease service, seats are enumerated, health-checked, and only then does the zone move from bootstrapping to active.\n\nThat last stage is the one candidates forget, and it is the one that matters most for this platform: a node that is in the cluster but not registered as capacity is invisible, and a node registered as capacity before it is validated will be handed a player.\n\nTerraform owns what has an API — cloud resources, DNS, load balancers, and increasingly bare metal through provider APIs or Redfish. Ansible owns in-host convergence. The boundary blurs, and the honest rule is that Terraform describes the existence and shape of a machine while Ansible describes what is true inside it.",
    whenToUse: [
      'Zone bootstrapping and bare-metal provisioning questions',
      'Any Vault, secrets management or credential rotation question',
      'Terraform module design and state management',
      'When asked how a new site comes online',
    ],
    keyConcepts: [
      {
        term: 'The bootstrap-secret problem',
        definition:
          'A machine that has nothing needs a credential to get its credentials, and if that credential is baked into the image, every machine shares it and it never rotates. Real answers: cloud instance identity documents (AWS/Azure/GCP auth methods in Vault) so the platform vouches for the machine; TPM-based attestation on bare metal; or a short-lived one-time Vault token injected at PXE time and valid for minutes. The key property is that the bootstrap credential is single-use or machine-attested, and never a long-lived shared secret in an image.',
      },
      {
        term: 'Vault at the edge',
        definition:
          'A partner or edge site cannot depend on a round trip to a central Vault for every secret read — the link fails and the site should keep working. Options: a Vault performance replica or a per-region cluster; or short-TTL secrets cached locally with the site continuing on last-known-good until expiry. The trade-off to state: cached secrets weaken revocation, so the TTL is a deliberate choice between availability during partition and how fast a revocation actually takes effect.',
      },
      {
        term: 'Dynamic secrets over static',
        definition:
          'Vault database and cloud secret engines mint credentials on demand with a lease and a TTL, so nothing long-lived sits in a config file and revocation is a real operation rather than a rotation project. Pipelines authenticate via JWT/OIDC — the CI system proves its identity and gets a scoped, short-lived credential, which removes the whole category of "a CI secret leaked".',
      },
      {
        term: 'Terraform module design',
        definition:
          'Small composable modules with explicit inputs, versioned and consumed by ref rather than by branch. State split per blast radius — one state file for the whole estate means one bad apply takes everything, and one lock serialises every team. Policy-as-code in the pipeline: OPA, Checkov, tfsec on the plan before apply. And drift detection as a scheduled plan whose diff is posted, never auto-applied.',
      },
      {
        term: 'Ansible for in-host convergence',
        definition:
          'Idempotent roles for driver and CUDA installation, kernel modules, NUMA and CPU pinning, hugepages and NIC tuning. Staged driver rollouts with kernel-module compatibility validation, because a driver-and-kernel pair that works on eight nodes and not the ninth is invisible to every layer above the host.',
      },
    ],
    questions: [
      {
        question: 'A new rack arrives at a site. Get it serving sessions.',
        answer:
          "I would describe it as seven stages, and name which tool owns each, because the interesting problems are at the boundaries.\n\nPhysical and network first — racked, cabled, switch and VLAN configured, and out-of-band management reachable over IPMI or Redfish, because everything after this depends on being able to power-cycle a machine you cannot physically touch.\n\nThen the OS: PXE boot or a golden image, disk layout, kernel version and boot parameters pinned to what the driver stack expects.\n\nThen host configuration, which is Ansible's job — NVIDIA driver and CUDA, kernel modules, NUMA and CPU pinning, hugepages, NIC tuning. On a latency-sensitive workload this stage is not cosmetic; pinning and NUMA locality are the difference between consistent frame delivery and a p99 nobody can explain.\n\nThen cluster join, with labels and taints that describe reality — GPU SKU, zone, rollout wave — because every later scheduling and rollout decision keys off those labels.\n\nThen identity and secrets: the node gets a workload identity and can authenticate to Vault, which is where the bootstrap-secret problem lives and I would want to talk about it separately.\n\nThen the platform stack, and here GitOps takes over: a Flux Kustomization chain with dependsOn and healthChecks so CNI is healthy before the GPU Operator applies, the GPU Operator is healthy before DCGM exporter, and so on. The health gate is the part that makes this reliable rather than a race — dependsOn without healthChecks only orders the applies, not the readiness.\n\nAnd last, the stage people forget: capacity registration. The zone registers with the lease service, seats are enumerated, each one health-checked with DCGM, and only then does the zone move from bootstrapping to active. A node in the cluster but not registered is invisible capacity; a node registered before validation gets handed a player. Both are bugs, and the second one is a customer-visible bug.\n\nThe measure of whether this is really automated is whether a rack can go from powered-on to serving without anyone SSH-ing into it. At Trackonomy I got the equivalent to a Git-commit-driven bootstrap — base add-ons, policy, secrets wiring, observability agents and application sets all applied automatically with no manual cluster preparation — and the honest caveat is that the physical and network stage always retained more human involvement than I wanted.",
      },
      {
        question: 'How does a brand-new machine get its first credential?',
        answer:
          "This is the bootstrap-secret problem and I would rather name it than skate past it, because most answers to 'we use Vault' quietly assume the machine already has a way to authenticate to Vault.\n\nThe bad answer is a token baked into the image. Every machine then shares one credential, it never rotates, and anyone who can read an image or a disk has it forever.\n\nWhat actually works depends on what can vouch for the machine. In cloud, the platform vouches for it: Vault's AWS, Azure and GCP auth methods verify an instance identity document, so the machine proves it is the instance it claims to be and Vault issues a scoped token. Nothing secret is stored anywhere.\n\nOn bare metal there is no cloud to vouch, so you need one of two things. TPM-based attestation is the strongest — the hardware attests its identity and measured boot state, and Vault trusts that. Where TPM is not available, a one-time-use token injected at PXE time, valid for minutes and single-use, so an intercepted token is worthless after first use and a machine that fails to bootstrap in its window fails loudly rather than silently retrying with a live credential.\n\nAfter that first exchange the machine has a workload identity and everything else is dynamic — database credentials, cloud credentials, registry pulls, all minted on demand with a lease and TTL.\n\nThe edge variant is worth raising unprompted for this estate: at a partner-operated site you cannot have every secret read depend on reaching a central Vault, because the link will fail. So either a performance replica or regional cluster at the site, or short-TTL secrets cached locally with the site continuing on last-known-good until expiry. That is a real trade-off and I would state it rather than hide it — caching weakens revocation, so the TTL is a deliberate choice between staying up during a partition and how quickly a revoked credential actually stops working. On a site inside someone else's network, I would lean toward the site keeping its own key material and staying independent.\n\nI integrated Vault into the delivery path at Wipro on OSDU for dynamic secret issuance to pipelines and workloads, and at IBM for rotation wired directly into the deployment path, so this is a road I have walked rather than read about.",
      },
    ],
  },

  {
    id: 'gfn-observability-slo',
    title: 'Observability and SLOs — Prometheus, Grafana, Datadog, ELK',
    icon: 'activity',
    color: '#76b900',
    description:
      'Indicators a player would recognise, multi-window burn-rate alerting, the GPU layer, and how to have four tools without four silos.',
    introduction:
      "The posting names Prometheus, Grafana, Datadog and ELK, plus SLOs and alerting for early detection. Two things separate a good answer from a generic one.\n\nFirst, pick indicators the customer would recognise. For GFN the player cares about: can I start a game (session start success rate, and time-to-first-frame), does it stay smooth (frame delivery / stutter rate, streamed frame latency), and does it stay up (unexpected disconnect rate). CPU utilisation and pod restarts are diagnostics, not indicators — they belong on the dashboard you open after the alert, not in the alert. The test of an SLI is whether a player could tell you it was violated.\n\nSecond, alert on burn rate, not on thresholds. A static 'error rate above one percent' either pages constantly or misses slow burns. Multi-window multi-burn-rate is the standard answer: a fast window (say 5 minutes at 14.4x burn) catches acute failures and pages; a slow window (say 6 hours at 6x) catches the gradual degradation that would exhaust the error budget by month end and files a ticket rather than paging at 3am. Two windows on each so a brief spike does not page. Being able to say why 14.4 — it exhausts a 30-day budget in about two days — is the detail that shows this is practice rather than recall.\n\nThe multi-tool question is really an ownership question. Four tools is only a problem when they disagree or when nobody knows which to open. Consistent labels across all of them — zone, region, gpu_sku, build_version — one alerting path so a page comes from one place with one runbook link, and a documented answer to 'which do I open first'. At Trackonomy I consolidated five monitoring platforms into Datadog while keeping Prometheus, Grafana and ELK where they were the better tool, and the win was not fewer tools, it was one alerting path and one label vocabulary.",
    whenToUse: [
      'Any monitoring, alerting or SLO question',
      'When asked what you would measure for a new platform',
      'GPU fleet health specifically',
      'On-call design and reducing alert fatigue',
    ],
    keyConcepts: [
      {
        term: 'Player-recognisable SLIs',
        definition:
          'Session start success rate, time-to-first-frame, frame delivery / stutter rate, unexpected disconnect rate, and — the platform-specific one — percentage of node drains completing with zero forced session terminations. Each is something a human could complain about. Infrastructure metrics are the diagnosis layer beneath them.',
      },
      {
        term: 'Multi-window multi-burn-rate alerting',
        definition:
          'Page on a fast burn (e.g. 14.4x over 5m and 1h — exhausts a 30-day budget in ~2 days), ticket on a slow burn (e.g. 6x over 6h and 3d). The second window on each pair suppresses momentary spikes. This replaces static thresholds and is the single biggest reduction in alert fatigue available.',
      },
      {
        term: 'Error budget as a decision tool',
        definition:
          'The budget is what makes the SLO more than a number on a wall: budget remaining decides whether a risky rollout proceeds this week. That connects observability directly to the deployment platform — the rollout gate reads the budget.',
      },
      {
        term: 'The GPU layer',
        definition:
          'DCGM exporter into Prometheus: utilisation, framebuffer, temperature, power, single- and double-bit ECC, and Xid events. Xid is the one to know by name — it is the hardware-fault signal that should feed remediation. NVIDIA\'s public NVSentinel wires exactly this into CEL-rule quarantine, cordon, drain and a maintenance CRD.',
      },
      {
        term: 'Pipeline and platform health as an SLO',
        definition:
          'Build duration, queue wait, runner saturation and flake rate as tracked SLOs with alerting, not anecdote. Queue wait is usually the metric that actually represents developer experience, and it is usually the one nobody is measuring.',
      },
      {
        term: 'Consistent label vocabulary',
        definition:
          'zone, region, gpu_sku, build_version, wave — the same names in Prometheus, Datadog and the log pipeline. Without this, correlating a stutter spike to a rollout wave becomes manual archaeology. This is the cheapest high-leverage thing on the list and the most frequently skipped.',
      },
    ],
    questions: [
      {
        question: 'What would you put on the dashboard for this platform?',
        answer:
          "I would split it into three tiers and be strict about which is which, because the usual failure is a dashboard full of diagnostics with no indicator on it.\n\nTier one, what the player experiences, and this is what goes on the wall. Session start success rate — did clicking play work. Time to first frame. Stream quality, meaning stutter or dropped-frame rate. Unexpected disconnect rate. Each one is something a player could complain about in their own words, which is my test for whether it belongs here.\n\nTier two, platform safety, and these are the ones specific to this problem. Percentage of drains completing with zero forced session terminations — I would argue for this being the headline platform metric, because it is the number that tells you whether the platform is genuinely session-aware or just says it is. Free capacity by region against the concurrent-session peak, because rollouts and repairs consume headroom and you want to see it before a player does. Rollout wave status and how many zones are behind the current build. And staleness: sites more than N minutes behind Git HEAD, which is the pull-model equivalent of 'is anything unmanaged'.\n\nTier three, diagnostics, on the page you open after an alert. GPU utilisation, framebuffer, temperature, power, ECC and Xid from DCGM exporter. Node and pod health. Lease service latency and grant failure rate. Renewal write throughput, which is the thing I said would break first.\n\nAnd separately, because it is a different audience but the posting asks for it: pipeline health as tracked SLOs — build duration, queue wait, runner saturation, flake rate. That is the dashboard I built at IBM, and the thing it changed was that 'CI is slow' became a number with an owner instead of a complaint.\n\nThe binding constraint on all of it is the label vocabulary — zone, region, gpu_sku, build_version, wave, consistent across Prometheus, Datadog and the log pipeline. Without that, 'did the stutter spike start with wave two' is an afternoon of archaeology instead of a filter change.",
      },
      {
        question: 'How do you alert without waking people up for nothing?',
        answer:
          "Burn-rate alerting on a small number of real SLOs, and near-nothing else paging.\n\nThe mechanics: define the SLO on a player-recognisable indicator — say ninety-nine point nine percent of session starts succeed over thirty days. That gives an error budget. Then alert on how fast the budget is being consumed rather than on a static threshold. A fast burn — around fourteen times normal, evaluated over five minutes and confirmed over an hour — exhausts a thirty-day budget in roughly two days, so that pages. A slow burn — around six times, over six hours and confirmed over three days — will quietly eat the budget by month end but nobody needs to be awake for it, so that opens a ticket. Two windows on each pair so a thirty-second blip does not page anyone.\n\nWhy this beats thresholds: a static one-percent error rate alert either fires constantly during normal variance or sits silent through a slow degradation. Burn rate is scale-free — it means the same thing in a small zone and a large one, which matters when zone sizes vary a lot.\n\nThen the discipline around it. Everything that is not a burn-rate alert on an SLO should be a ticket, not a page. Every page needs a runbook link and a named action — if the runbook says 'investigate', it is not a runbook. Alerts get reviewed on a cadence and anything that fired and required no action gets deleted or downgraded; an alert nobody acts on is training people to ignore the ones that matter.\n\nAnd the platform-specific addition here: I would page on the safety property, not just the availability one. Forced session terminations during a drain should be a paging signal even if availability looks fine, because it is a customer-visible harm that no aggregate SLI would necessarily catch — the sessions that got killed are not errors, they just ended.\n\nAt Trackonomy the combination of SLO-based alerting and anomaly-triggered remediation is what moved MTTR sixty percent and incidents sixty-five percent, and most of that was not better detection — it was removing the alerts that were teaching people not to look.",
      },
    ],
  },

  {
    id: 'gfn-staging-selfservice-mcp',
    title: 'Prod-Like Staging Zones, Self-Service and the MCP Surface',
    icon: 'layers',
    color: '#76b900',
    description:
      'Staging as a tenant class rather than a smaller copy, golden paths and the Slack release bot, and what makes an MCP tool surface safe.',
    introduction:
      "Two named responsibilities that most candidates handle vaguely.\n\nOn staging, the framing that lands: a staging zone is not a smaller copy of production, it is a zone in the same system with a different class of tenant. Parity has to come from construction rather than intention, because the moment anyone can change one without the other, they diverge. Concretely that means the same manifests with an overlay that changes only size and tenancy, the same bootstrap path, the same GPU SKUs at smaller count, and the same observability. If staging is built by a different pipeline it is not staging, it is a different system that shares a name.\n\nThe hard part is traffic, and it is worth saying so. Real players generate a load shape that synthetic tests do not — session length distribution with a long tail, regional diurnal peaks, and the specific game mix. Options in increasing fidelity: synthetic load with a distribution modelled on production; shadow or replayed traffic where the product allows it; and the highest-fidelity option, which is a canary in a real production zone — a small percentage of real seats pinned to the new build, compared against the rest of that same zone. The last one is a better regression detector than any staging environment, and the reason the lease system matters is that it makes it a one-line reservation rather than a project.\n\nOn self-service, the point is removing the platform team from the critical path of routine work. Golden path templates so a new service arrives with pipeline, Helm chart, GitOps wiring, dashboards and alerts already generated. A Slack release bot for the common operations. Backstage as the catalogue and front door. And MCP as the same surface exposed to assistants.",
    whenToUse: [
      'Staging environment and test-reliability questions',
      'Developer experience and platform-as-a-product questions',
      'Anything about Backstage or internal developer portals',
      'MCP and AI-assisted operations — a genuine differentiator here',
    ],
    keyConcepts: [
      {
        term: 'Staging as a tenant class',
        definition:
          'A staging zone is a zone whose reservations are held by test systems instead of players. Same lease service, same bootstrap, same manifests with a size overlay. This reuse is the parity mechanism: divergence becomes impossible-by-construction rather than a thing people are asked to remember.',
      },
      {
        term: 'Disposable by default',
        definition:
          'A staging zone that lives forever accumulates state nobody can explain, and then it is not prod-like, it is uniquely weird. Rebuild it from Git on a schedule. The rebuild is also a continuous test of the zone bootstrap path — if creating a zone is exercised weekly, creating a real one at 2am is a routine operation instead of an adventure.',
      },
      {
        term: 'Canary in production beats staging',
        definition:
          'Reserve a small percentage of seats in a real zone, pin them to the new build, compare stream quality against the rest of that zone. Same hardware, same network, same players, controlled blast radius. The lease and reservation model makes this cheap, which is the argument for building the lease system first.',
      },
      {
        term: 'Golden paths, not documentation',
        definition:
          'A new service arrives with pipeline, chart, GitOps wiring, dashboards and alerts generated from one request. The measure of success is that the platform team is not in the critical path of routine work — at Trackonomy this let 50+ engineers provision infrastructure, reserve environments, ship to Kubernetes and reach observability without a ticket.',
      },
      {
        term: 'The Slack release bot',
        definition:
          'ChatOps for the operations people actually repeat: what is deployed where, promote wave two, why is this drain stuck, reserve capacity for a load test. Every action authenticated as the human, authorised the same way the API would be, and audited. The bot is a client of the platform API, never a privileged side door — the moment it holds its own elevated credentials it becomes the least-audited path to production.',
      },
      {
        term: 'MCP done safely',
        definition:
          'Read tools open (list_zones, get_zone_capacity, explain_drain, get_node_health, find_blocked_rollouts); write tools behind an approval token and fully audited (open_maintenance_reservation, quarantine_node, extend_drain_deadline). The value is not model capability — it is that the model calls a typed, schema-validated tool against the same API and the same authorisation a human uses, instead of being handed a shell where the blast radius is whatever the token can reach.',
      },
    ],
    questions: [
      {
        question: 'How do you build a staging environment that actually catches regressions?',
        answer:
          "Start by rejecting the usual framing. Staging is not a smaller copy of production — the moment it is built by a separate path, it drifts, and a staging environment that has drifted does not catch regressions, it generates false confidence and occasional false alarms, both of which teach people to ignore it.\n\nSo parity by construction. A staging zone is a zone in the same system with a different class of tenant: same lease service, same bootstrap path, same manifests with an overlay that changes only size and tenancy, same GPU SKUs at lower count, same observability with the same labels. If I cannot describe staging as 'production with a different overlay', it is not staging.\n\nSecond, disposable. Rebuild it from Git on a schedule rather than letting it live for years accumulating state nobody can explain. That has a second benefit I would raise unprompted: it continuously exercises the zone bootstrap path. If creating a zone happens weekly in staging, then creating a real one during an incident is routine rather than the first time anyone has done it in eight months.\n\nThird — and this is where I would be honest about the limit — traffic is the hard part. Real players have a session-length distribution with a long tail, regional diurnal peaks and a specific game mix, and synthetic load does not reproduce that. You can get closer by modelling the distribution rather than firing uniform load, and closer still with shadow or replayed traffic if the product allows it. But the highest-fidelity regression detector is not staging at all, it is a canary in a real production zone: reserve one percent of seats, pin them to the new build, compare stream quality against the rest of that same zone. Same hardware, same network, same players, bounded blast radius.\n\nWhich is another argument for building the lease and reservation system first — it turns 'canary in production' from a project into a reservation with a purpose field.\n\nAt Trackonomy the prod-like staging work — mirroring production topology, data shape and traffic profile — is what cut production issues ninety percent, and the honest breakdown is that most of that came from topology and data-shape parity rather than from traffic realism, which we never fully solved.",
      },
      {
        question: 'What does good self-service look like, and how does MCP fit?',
        answer:
          "Good self-service means the platform team is not in the critical path of routine work, and the test is whether an engineer can go from idea to running in production without opening a ticket.\n\nThree layers. Golden paths: a new service arrives with its pipeline, Helm chart, GitOps wiring, dashboards and alerts already generated from a single request, so the default path is also the compliant path — that is the real trick, making the easy thing and the correct thing the same thing. A catalogue and front door, which is what Backstage is for: what services exist, who owns them, what is deployed where, links to dashboards and runbooks. And ChatOps for the repeated operations — what is deployed where, promote wave two, why is this drain stuck, reserve forty seats for a load test.\n\nThe rule I hold on the bot: it is a client of the platform API, never a privileged side door. Every action authenticated as the human who typed it, authorised exactly as the API would authorise them, and audited. The moment the bot holds its own elevated credentials, it becomes the least-audited path to production and someone will notice that before you do.\n\nMCP is the same surface exposed to an assistant, and this is the part I have actually built — Camora is an MCP platform, so I have written these servers in production rather than read about them. The value is not that a model can take actions. It is that the model calls a typed tool with a schema, against the same API a human uses, with the same authorisation and the same audit trail. Compare that to giving an assistant kubectl, where the blast radius is whatever the token can reach and the audit log is a shell history.\n\nConcretely I would split the surface. Read tools available freely to any on-call assistant: list_zones, get_zone_capacity, explain_drain — which answers why a drain is stuck, the longest remaining lease and an ETA — get_node_health with DCGM state and Xid history, find_blocked_rollouts. Write tools behind an approval token with the calling identity stamped on the audit record: open_maintenance_reservation, quarantine_node, extend_drain_deadline with a justification.\n\nThe on-call case is where it pays off. 'Why is zone forty-one still draining' is currently three dashboards and some kubectl; as a typed tool it is one call that returns the longest-held lease, its holder and the deadline. That is the kind of question I would want answerable at 3am without expertise.",
      },
    ],
  },

  {
    id: 'gfn-resume-jd-probes',
    title: 'JD × Resume — The Seams He Will Probe',
    icon: 'search',
    color: '#76b900',
    description:
      'Read the posting next to the resume and the questions write themselves: the metrics that sound too round, the JD lines with no resume evidence, and the two facts about the last three years that need an answer ready.',
    introduction:
      "A hiring manager with eighteen years at one company reads a resume looking for the seam between what it claims and what the person did. This topic is the list of seams, with the answer for each.\n\nThree categories. Metrics that invite verification — 50+ deployments a day, 99.97% uptime, 73% cost reduction, 100x CI scale-out, 2,317 commits. Each is true; each needs the mechanism behind it available immediately, because a number without a mechanism reads as a number someone was told to put on a resume. JD lines with thin or no resume evidence — StackStorm by name, gRPC specifically, zone reservation and lease systems as a named product surface, Backstage, and Go as an authored language. And personal-history questions the last three years raise on their own — a contract role, a co-founded company running alongside it, a mechanical engineering degree against a JD asking for CS, and fifteen years of leading teams against an IC posting.\n\nThe rule for all of them: answer in two or three sentences, lead with the mechanism or the fact, never over-explain. Over-explaining a gap converts a small honest answer into a large visible problem.",
    whenToUse: [
      'Preparing for the resume walk-through portion of the round',
      'Any question that starts "I see you..." or "How did you actually..."',
      'When a JD requirement has no obvious resume evidence behind it',
    ],
    keyConcepts: [
      {
        term: 'Every metric needs its mechanism in one breath',
        definition:
          '50+ deploys/day = 100+ apps on ArgoCD/FluxCD with automated promotion gates, so the number is a consequence of removing humans from the path, not of deploying frantically. 99.97% = node-level availability of the GPU pool measured over a year, with cordon-drain-repair automation absorbing single-node faults. 73% = $10M to $2.7M annually via bin-packing, right-sizing and automated scaling policies. Say the mechanism first and the number becomes credible.',
      },
      {
        term: 'The three real gaps, named honestly',
        definition:
          'StackStorm: never run it in production — know the model precisely (sensors, triggers, rules with criteria, Orquesta workflows, packs) and say the pattern is what I built with anomaly-triggered runbooks and alert-to-action workflows. gRPC: consumed it, not authored a large service in it — know streaming, deadlines, and protobuf compatibility rules. Go: read fluently, not shipped as primary author — currently building an operator with kubebuilder to make that a demonstrated statement rather than a promise.',
      },
      {
        term: 'The lease system is the one gap that closed',
        definition:
          '"Zone reservation and lease system" appears nowhere on the resume, and it is the first thing the posting names. That gap is now covered by design depth rather than by experience — leases with TTL, fencing tokens, idempotency, SKIP LOCKED, delegation for partitioned sites. Frame it as a design conversation, never as something already built.',
      },
      {
        term: 'Degree and title questions get short answers',
        definition:
          'BE Mechanical, 2005, plus eighteen years and CKA, AWS SA Pro, Azure SA Expert, Terraform Associate, CCNP. The JD says "or equivalent experience" and that is exactly the case. One sentence, no defensiveness, move on. The same applies to being a contractor at IBM and a co-founder of Camora: state the arrangement plainly and let it be ordinary.',
      },
      {
        term: 'What to volunteer that the resume under-sells',
        definition:
          'Test infrastructure at IBM — distributed execution with sharding, runner pools, result aggregation, retry policy, flaky-test detection. It is one line on the resume and it is the single most relevant item for a manager with eleven years in tools and Selenium in his skill list. Volunteer it; it will not be asked for.',
      },
    ],
    questions: [
      {
        question: 'Fifty zero-downtime deployments a day across a hundred applications. Walk me through how that is actually true.',
        answer:
          "The number is a consequence of the mechanism rather than a target anyone chased, so let me describe the mechanism.\n\nA hundred-plus applications were on GitOps through ArgoCD and FluxCD. A merge to the release branch built an image, updated the environment overlay, and the reconciler applied it — nobody ran a deploy. So the deployment count is really the merge count, and fifty a day across a hundred services is about half a merge per service per day, which is an ordinary rate for a team of that size. The scarce thing was never the deploying, it was the confidence to let it happen unattended.\n\nWhat made it zero-downtime: rolling updates with proper readiness gates so traffic never went to a pod that was not ready, PodDisruptionBudgets so a node operation could not take a whole replica set, progressive and canary rollouts on the services that warranted it, and one-command rollback. Promotion between environments was gated — integration and security scans had to pass before a change could move — and rollback was a Git revert so it went through the same path as everything else.\n\nWhat it cost to get there is the part I would actually want to talk about: the technical work was maybe a third of it. The rest was persuading teams to accept a standard pipeline and standard health checks in exchange for not owning their own deploy scripts. Golden path templates were the lever — a new service arrived with its pipeline, chart, GitOps wiring, dashboards and alerts already generated, so the standard path was also the easiest path.\n\nAnd the honest caveat: the fifty was a steady-state daily average, not a peak, and it was not uniform — a handful of services accounted for a large share of it.",
      },
      {
        question: 'The posting names StackStorm. I do not see it on your resume.',
        answer:
          "Correct — I have not run StackStorm in production, and I would rather say that than imply otherwise.\n\nWhat I have built is the pattern it implements. At Trackonomy the remediation system was anomaly-triggered runbooks and alert-to-action workflows: a health signal fired, a rule decided whether it was actionable, and a multi-step workflow cordoned, drained, repaired, validated and returned the node, escalating to a human with context when it could not. That is sensors, triggers, rules and workflows by another name, and it moved MTTR sixty percent and incidents sixty-five percent.\n\nI have gone and learned the actual vocabulary rather than hand-waving it, because I would expect you to check. A sensor is a Python plugin that emits a trigger; a rule matches that trigger against criteria — equals, regex, matchwildcard, timediff, exists and so on — and maps the payload onto exactly one action or workflow; Orquesta is the workflow language with tasks, next transitions carrying when, publish and do, plus join for barriers, with-items for iteration, and retry with count and delay; and packs make the whole thing version-controlled and deployable rather than console state.\n\nThe opinion I would bring rather than the tool experience: the hard part of event-driven remediation is not authoring workflows, it is knowing when to stop. Every workflow needs a bounded escalation — fixed, escalated with context, or explicitly given up on, never a silent loop — and a repeat-offender rule, so a node remediated three times in a window gets quarantined for a human instead of healed forever. Without that you have built a machine for hiding a dying board while quietly losing capacity to it.\n\nI would expect to be productive on StackStorm quickly because the model is not the difficult part; the judgement is, and that I have.",
          },
      {
        question: 'You have led teams for fifteen years and your degree is in mechanical engineering. Talk me through your path.',
        answer:
          "The degree is BE Mechanical, 2005, and I moved into infrastructure immediately — I joined TCS in 2007 in Linux and Unix systems administration and never went back. Eighteen years since, with CKA, AWS Solutions Architect Professional, Azure Solutions Architect Expert, Terraform Associate and CCNP along the way. The posting says bachelor's in CS or engineering or equivalent experience, and I read myself as the equivalent-experience case. That is the whole answer; I do not think it is the interesting part of my background.\n\nThe path itself is fairly linear once it started. Eleven years at TCS from 2007 to 2018: systems administration, then leading a four-person Linux team, then a fourteen-person middleware engineering team, then into cloud and DevOps as that became the work. Then Azure and AWS platform engineering on OSDU at Wipro, where the infrastructure-as-code was literally the product. Then Trackonomy, where I built the Kubernetes deployment platform and the GPU cluster from nothing and led a six-engineer team. Now the IBM contract on the watsonx CI and test platform.\n\nOn the leading: I have enjoyed it and I am not looking to do it here. What I want now is senior IC scope — owning a platform end to end and being deep enough in it to fix it myself, rather than being in staffing plans. What the leadership years give me is that I am useful at the parts of a senior IC job people find hardest: unblocking other engineers, mentoring, and getting a design agreed across teams that do not report to each other. On a platform team that last one is most of the job.\n\n[Say the IC part once. Do not raise it again.]",
      },
      {
        question: 'You are contracting at IBM and you co-founded a company. How does that work, and when could you start?',
        answer:
          "Straightforwardly, and I would rather be plain about both.\n\nThe IBM engagement is a contract and it is scoped as one — I own the deployment and CI/CD platform for watsonx data and AI. Being a contract role means the notice is short and clean, which for you is a practical advantage rather than a complication.\n\nCamora is a company I co-founded and where I am principal engineer — an agentic AI and MCP platform. I want to be clear about what that is and is not. It is real production engineering: MCP servers exposing operational tooling to LLM agents, REST APIs with multi-provider LLM orchestration and fallback, a hybrid retrieval pipeline. It is not something that competes for the hours of a full-time role, and I would not take a role where I thought it would. If it helps, I am happy to have that written into whatever form you need.\n\nWhere I would argue it is directly relevant: the posting names MCP APIs in its very first responsibility, and building MCP servers in production is not a common thing for a platform candidate to have done. Most people talking about MCP right now have consumed one. The opinion I have from building them is about safety rather than novelty — the value is that a model calls a typed, schema-validated tool against the same API and the same authorisation a human uses, with the same audit trail, instead of being handed a shell.\n\nOn timing: I could start within a standard notice period, and I would want to agree the Pune and US overlap window up front, because that is the detail that quietly decides whether a split-timezone arrangement works.",
      },
      {
        question: 'The posting leads with backend microservices and REST, gRPC and MCP APIs. Your resume reads as infrastructure. Convince me.',
        answer:
          "That is a fair reading of the resume, and it is the thing I would most want to correct, because the resume under-sells the software half.\n\nThe backend work is there. At Trackonomy I built the Python platform APIs and internal CLI tooling that fifty-plus engineers used to provision infrastructure, reserve environments, ship to Kubernetes and reach observability without a ticket — that is a platform service with real users, real contracts and real support burden, not a script. Camora is FastAPI services with REST and MCP APIs, multi-provider orchestration with routing and fallback, and a retrieval pipeline. And the CI health and test-health tooling at IBM and Trackonomy — git-dboard, cloudforge — are applications, with data models and interfaces, not pipelines.\n\nOn the three protocols specifically I would be precise about where I stand. REST and MCP I have built and shipped. gRPC I have consumed rather than authored at scale — I know the parts that matter for a design conversation: streaming for heartbeat renewal so you get one long-lived stream instead of an RPC per beat, first-class deadlines and cancellation, and the protobuf compatibility rules where you add and reserve fields and never renumber. But I would not claim to have run a large gRPC estate.\n\nWhere I think the fit is strongest is that this is not a pure backend role either — it is a backend role whose subject matter is infrastructure. The zone reservation and lease system is a distributed systems problem about capacity, leases, fencing and partitions, and answering it well needs someone who has both written services and operated GPU hardware at three in the morning. I have done both, and the second half is the rarer one.\n\nIf it is useful I would happily design the lease service with you now and you can judge the backend thinking directly rather than from the resume.",
      },
      {
        question: 'Which of the things on your resume are you actually strongest at, and where are you weakest?',
        answer:
          "Strongest, three things, and I would pick depth over listing.\n\nGitOps delivery at real scale — ArgoCD and FluxCD across a hundred-plus applications spanning bare metal and three clouds from one control plane, including the parts people skip: drift detection with auto-heal, promotion gates, and the fact that rollback has to be a Git operation or the reconciler undoes you.\n\nHybrid bare metal and cloud — the sixty-five GPU cluster with A100s, V100s and T4s alongside AWS, Azure and OCI. PXE and image provisioning, IPMI and BMC recovery, driver and CUDA lifecycle with staged rollouts and kernel-module validation, Xid and ECC and thermal faults, and node repair automation that waited on workload state rather than evicting. Most platform candidates have one side of that; the hardware side is the rarer half.\n\nAnd CI and test platforms — six thousand runs a day, a hundred-fold scale-out, and the test-health and flaky-test detection on top. That is the one the resume under-sells and probably the one most relevant to how you think about tooling.\n\nWeakest, honestly: Go as an authored language. I read it fluently and work in it around the Kubernetes ecosystem, but I have not shipped a large Go service as primary author, and on a team that writes operators in Go that matters. I have been building one with kubebuilder specifically so that is a demonstrated statement rather than a promise. Behind that, gRPC at scale and StackStorm by name — both cases where I know the model well and have built the equivalent pattern without the specific tool.\n\nAnd the one that is not a technology: I have spent fifteen years leading, so I am more practised at getting a design agreed than at being the fastest person writing the code. On a platform team I think that trade is usually worth it, but it is a real trade and I would not pretend otherwise.",
      },
    ],
  },

  {
    id: 'gfn-backend-and-test-surface',
    title: 'Java Spring, Microservices and Test Automation — His Own Skill Order',
    icon: 'box',
    color: '#76b900',
    description:
      'The manager lists Java Spring first and Selenium last. Both are under-served by a pure platform pitch. Honest language mapping, the microservices patterns he will probe, and the test-automation heritage.',
    introduction:
      "Read the skill list in his own order: Java Spring, Golang, Python, MicroServices, Cloud (GFN, OCI, AWS, Azure, GCP), Containers, K8s, DevOps, Ansible, CI/CD, Selenium, Scripting, Automation. Languages and microservices lead. DevOps and CI/CD — the things most candidates open with — sit in the middle. Selenium is near the end because it is heritage from eleven years in tools and test automation, not because it is unimportant to how he thinks.\n\nTwo consequences.\n\nFirst, Java is a real gap and it is first on his list. There is no Java on this resume. The wrong moves are pretending otherwise, or apologising for it at length. The right move is a short honest statement plus a demonstration that the concepts transfer, because they do: dependency injection, filters and interceptors, connection pooling, Actuator health and metrics endpoints, bean lifecycle, and the JVM's threading and GC behaviour all have direct analogues in the FastAPI and Python services actually built. If he asks a Spring question, answer the underlying design question in language-neutral terms, name the Spring construct if you know it, and say plainly when you are reasoning by analogy rather than from experience. A senior engineer respects a clean 'I know the shape, not the syntax' far more than a bluff he can puncture in one follow-up.\n\nSecond, the microservices half of his list is where a backend interview actually lives — service boundaries, contracts and versioning, resilience patterns, idempotency, backpressure. The zone lease service is the vehicle for all of it, so those questions land on prepared ground.\n\nAnd the Selenium tail matters more than its position suggests: unreliable tests and unreliable staging are the lived pain of a decade in tools. The IBM test-platform work — distributed execution with sharding, runner pools, result aggregation, retry policy, flaky-test detection — is the single most under-used item in this background for this specific manager.",
    whenToUse: [
      'When a Java or Spring question arrives and there is no Java on the resume',
      'Backend service-design questions framed in microservices terms',
      'Anything about test strategy, E2E testing, or test reliability',
      'Choosing what to volunteer when he asks an open question about your background',
    ],
    keyConcepts: [
      {
        term: 'The honest Java answer, in three sentences',
        definition:
          '"I have not shipped Java Spring — Python and FastAPI are where I work, plus Go around the Kubernetes ecosystem. The service concerns are the same ones I deal with daily: dependency injection, request filters, connection pooling, health and metrics endpoints, graceful shutdown. If you want to go into Spring specifics I will tell you where I am reasoning by analogy." Then answer the actual design question well. Short, unhedged, immediately followed by competence.',
      },
      {
        term: 'Spring → FastAPI concept map',
        definition:
          'Spring DI/@Autowired ↔ FastAPI Depends(). Filters and HandlerInterceptor ↔ ASGI middleware. @Transactional ↔ explicit transaction context (and the same reentrancy and propagation traps). Actuator /health, /metrics ↔ health endpoints plus a Prometheus exporter. Bean lifecycle ↔ lifespan startup/shutdown hooks. HikariCP pool sizing ↔ asyncpg/SQLAlchemy pool sizing, with the identical failure mode: a pool smaller than concurrency turns into an invisible queue.',
      },
      {
        term: 'Resilience patterns he will probe',
        definition:
          'Timeouts on every remote call (the most common omission), retry with full jitter and a cap, circuit breaker so a failing dependency fails fast instead of consuming your threads, bulkhead so one slow dependency cannot exhaust a shared pool, and backpressure — shed load with a clear error rather than queueing unboundedly. The lease service makes these concrete: what happens to session starts when the lease store is slow is a load-shedding question, not a retry question.',
      },
      {
        term: 'Contracts and versioning',
        definition:
          'Never reuse or renumber a protobuf field; add, deprecate, and reserve. Additive-only changes for rolling deploys, because during a rollout both versions are live by definition. Consumer-driven contract tests in CI so a breaking change fails at build rather than at 3am. Expand-then-contract for schema migrations: add the column, dual-write, backfill, switch reads, drop the old — each step independently deployable and reversible.',
      },
      {
        term: 'Test pyramid for a platform, not a web app',
        definition:
          'Unit tests with an injected clock for all TTL and expiry logic. Integration tests against a real Postgres for anything whose correctness IS the database semantics — SKIP LOCKED cannot be tested against a mock. Contract tests at service boundaries. A thin E2E layer: expensive, slow, and the first thing to go flaky, so keep it small and treat every flake as a defect rather than a retry.',
      },
      {
        term: 'Flakiness as a first-class problem',
        definition:
          'At 6,000 runs a day a 1% flake rate is 60 spurious failures daily. What breaks is not the pipeline, it is trust: engineers re-run as a reflex, then stop believing red, then the gate stops being a gate. Detection (repeatedly failing and rerun-heavy jobs surfaced per team) matters more than any individual fix. For a manager with a decade in test automation, this is the observation most likely to land.',
      },
    ],
    questions: [
      {
        question: 'Have you worked with Java and Spring Boot?',
        answer:
          "No — I have not worked in Java. Python is my language: control-plane services, platform APIs, FastAPI backends, and automation, plus Bash for anything at the system and pipeline layer.\n\n[Then redirect once, and move to ground you own. Do not offer a Spring concept map, do not compare annotations — every sentence spent on Java invites the next Java question, and the posting asks for Go or Python, not Java.]\n\nWhat I would say is that the parts of a backend service that decide whether it works are not language-specific, and those I have built repeatedly in Python: the service boundaries, the contract and how it versions, timeouts and circuit breaking on every remote call, connection pool sizing, idempotency on anything that grants a resource, graceful shutdown, and health and metrics endpoints. That is where I would want to be judged, and I am happy to go as deep as you like on any of it.\n\nIf Java is central to the team's services, that is worth knowing now and I would rather you tell me than have me guess — the posting says Go or Python for control-plane development, so I read the Java as your background rather than the role's requirement.",
      },
      {
        question: 'The lease service is getting slow — the store is at high latency. What happens to session starts?',
        answer:
          "The honest first answer is: it depends on what I built, and if I built it badly, everything queues and the whole platform stops. So let me describe what I would build so that does not happen.\n\nEvery call into the lease store has a timeout, and the timeout is shorter than the caller's own deadline. A grant that takes four seconds is useless anyway — the player has already felt it — so I would rather fail at, say, 250 milliseconds and do something deliberate than succeed at four seconds and have the session manager's thread pool full of waiting requests. Missing timeouts are the single most common cause of a slow dependency becoming a total outage.\n\nThen bulkhead the pool: the lease client gets its own bounded connection and concurrency budget so that when it saturates, it saturates alone and does not starve unrelated work in the same process.\n\nThen a circuit breaker. Once failures cross a threshold, stop calling and fail fast, with periodic probes to test recovery. The point is not to protect the caller, it is to take load off the store so it can actually recover — a thundering herd of retries against a struggling database is how a slow dependency becomes a dead one.\n\nAnd retries need full jitter and a low cap. Exponential backoff without jitter synchronises every client into the same retry wave, which is self-inflicted.\n\nThe interesting product question is what 'fail' means here, and I would want to make that decision explicitly rather than let it fall out of the code. Refusing a session start is bad but honest and recoverable — the player retries and it works. Granting a seat you cannot record is much worse, because now you risk two sessions on one GPU, and that is a corrupted invariant rather than a bad minute. So I would shed load: refuse new grants with a clear retryable error, keep renewals working since those keep live sessions alive, and never fabricate a grant.\n\nThat asymmetry is worth stating out loud — renewals and grants have different criticality, so under pressure I would give renewals the remaining budget and shed grants first. Live players before new players.\n\nThe delegation model helps here too: if sites hold blocks of seats, a slow regional store does not touch session starts at a site at all, because grants are local. The blast radius of the central store being slow is 'no new block allocations', not 'nobody can play'.",
      },
      {
        question: 'How would you test the deployment platform itself? (Test-automation heritage)',
        answer:
          "I would separate testing the platform's logic from testing that the platform does the right thing to real infrastructure, because they need completely different machinery.\n\nThe logic layer is ordinary and should be fast and deterministic. Reconcile loops are pure functions of observed state plus spec if you write them that way — given this cluster state and this CR, what actions are emitted. Table-driven tests, no cluster, no sleeps, and an injected clock for anything with a TTL. For the operator specifically, envtest gives a real API server without a real cluster, which catches the things a fake client will not: admission behaviour, defaulting, and status subresource semantics.\n\nThe correctness-is-the-database layer needs a real Postgres. The lease grant is SELECT FOR UPDATE SKIP LOCKED, and a mocked store tests my code rather than the property I care about — I would run N concurrent grants against M free seats and assert exactly M succeed with zero double-grants, under the race detector.\n\nThen the layer people skip: does the platform do the right thing to a cluster. A kind or k3s cluster in CI, apply a manifest, assert convergence, then assert the failure paths — delete a child object and assert the controller recreates it, which is what proves .Owns() is actually wired; delete the CR and assert leases were released, which proves the finalizer works. Those two tests catch the bugs that are otherwise found in production.\n\nAnd the GFN-specific one I would build first: a drain safety test. Fake a zone with live leases, trigger a drain, and assert that no lease was terminated before its holder released it. That is the platform's central safety promise, and a promise without a test is an intention.\n\nThe part I would bring from experience is less about the pyramid and more about reliability of the suite itself. At IBM, running six thousand pipeline runs a day, the thing that mattered most was not adding tests, it was flaky-test detection — surfacing repeatedly failing and rerun-heavy jobs per team. Because at that volume a one percent flake rate is sixty spurious failures a day, and what actually breaks is trust: people re-run reflexively, then stop believing red, and then you have a quality gate that is decorative. I would rather have a smaller suite everyone believes than a large one everyone retries.",
      },
      {
        question: 'How do you decide service boundaries? Would the lease system be one service or several?',
        answer:
          "I would start it as one service, and I would want to justify that rather than default to it.\n\nThe reason it is one: leases, seats and zones share a single invariant — a seat has at most one holder — and that invariant is enforced by a transaction. Split lease granting from seat state into two services and you have converted a database constraint into a distributed consistency problem, which you then solve with sagas and compensations and eventual reconciliation. That is a large amount of machinery bought in exchange for nothing, because the two halves have identical availability requirements and identical scaling characteristics. My rule of thumb is that a transaction boundary is a bad place to draw a service boundary.\n\nWhat I would separate, and would expect to eventually: the site-local lease agent is genuinely a different service, because it has a different failure domain by design — it must keep working when the region is unreachable, which is the whole point of it. That is a real boundary: different availability requirement, different deployment location, different owner of truth (the site is authoritative for seats within its block, the region for block allocation).\n\nAnd reporting and capacity analytics I would split off eventually, on read-pattern grounds — long analytical queries against the same store that serves a latency-critical grant path is a noisy-neighbour problem. But I would do that when I measured it hurting, not on the first diagram.\n\nThe general principle I would state: split on failure domain, rate of change, or ownership — not on nouns. 'Zone service, seat service, lease service' is a data model drawn as an architecture, and it produces a distributed monolith where every operation is three network calls and no operation is atomic.\n\nThe honest caveat is that starting as one service is only safe if the internal boundaries are clean enough to split later — clear module edges, no shared mutable state across them, and the API expressed in terms of operations rather than table rows. That is the discipline that makes the later split a refactor instead of a rewrite.",
      },
    ],
  },

  {
    id: 'gfn-coding-round',
    title: 'The Coding Round — Go and Python in a Tools Manager Idiom',
    icon: 'terminal',
    color: '#76b900',
    description:
      'What a tools-and-backend manager actually asks: concurrency with bounded workers, TTL expiry structures, rate limiting, retry with backoff, and log/pipeline parsing — plus how to talk while coding.',
    introduction:
      "Given the manager's background — eleven years in developer tools, four as a backend software engineer, Java Spring and Golang first on his skill list — the coding round is more likely to be practical backend work than a hard algorithms puzzle. The recurring shapes are: bounded concurrency over a work list, expiry and TTL handling, rate limiting, retry with backoff and jitter, and parsing structured output into a summary. All of these are things a platform engineer writes for real, which is precisely why a tools manager asks them.\n\nHow to behave, which matters as much as the code. State the approach before typing, and name the complexity. Ask about input scale and about failure semantics before choosing a structure — for a lease system, 'what happens if two callers race' is a legitimate clarifying question and asking it scores. Write the straightforward correct version first, then say out loud what you would change under load rather than prematurely optimising. Handle the empty input, the single element and the concurrent case explicitly; those are where interviewers actually probe. And say what you would test — for anything time-dependent, that the clock is injected so the tests contain no sleeps.\n\nOn language: the honest position is that Python is primary and Go is read fluently. If given a choice, take Python and be excellent, mention that Go is what you have been building an operator in, and do not pretend. If Go is required, write simple, obvious Go — a mutex over a map beats a clever channel design that you then have to defend.",
    whenToUse: [
      'The coding portion of the hiring-manager round',
      'When asked to implement anything with time, expiry or concurrency in it',
      'Live-coding conduct — what to say while writing',
    ],
    keyConcepts: [
      {
        term: 'Inject the clock',
        definition:
          'Never call time.Now() or datetime.now() inside logic you want to test. Pass a clock — real in production, fake in tests. This one habit turns every TTL, expiry, backoff and rate-limit test from a flaky sleep into a deterministic assertion, and mentioning it unprompted signals production experience more than any algorithm will.',
      },
      {
        term: 'Bounded concurrency',
        definition:
          'A worker pool over a channel in Go, or asyncio.Semaphore / ThreadPoolExecutor in Python. The interviewer is checking that you do not spawn one goroutine per item over an unbounded list, that errors from workers are collected rather than dropped, and that context cancellation actually stops the work.',
      },
      {
        term: 'Expiry structures',
        definition:
          'Scanning every entry to find expired ones is O(n) per tick and fine at small n — say so and move on. Under load, a min-heap keyed on expiry, or a timing wheel for very high churn, gives O(log n) or O(1) amortised. State the simple version, implement it, and name the upgrade path; implementing a timing wheel unasked is a red flag, not a green one.',
      },
      {
        term: 'Retry with jitter',
        definition:
          'Exponential backoff without jitter synchronises every client into the same retry wave and re-DDoSes the service you are trying to let recover. Full jitter — sleep a random value in [0, base * 2^attempt] capped at a maximum — is the standard fix. Also cap total attempts and distinguish retryable from terminal errors; retrying a 400 forever is a bug.',
      },
      {
        term: 'Idempotency in code',
        definition:
          'When implementing anything that grants a resource, take an idempotency key and return the existing grant on a repeat. It is three lines and it is the thing a backend interviewer is hoping you will do without being asked.',
      },
    ],
    questions: [
      {
        question: 'Implement a lease manager: grant, renew, release, and automatic expiry.',
        answer:
          "I would clarify two things first: is this in-process or the distributed case, and do repeated grants with the same key need to be idempotent. Assuming in-process with idempotency — which is the version worth writing — here is Python.\n\n```python\nimport heapq, threading, itertools\nfrom dataclasses import dataclass, field\n\n@dataclass\nclass Lease:\n    lease_id: str\n    seat_id: str\n    holder: str\n    expires_at: float\n    fencing_token: int\n\nclass LeaseManager:\n    \"\"\"In-process seat leasing with TTL expiry and fencing tokens.\n\n    The clock is injected so every expiry test is deterministic — a test\n    suite for a lease manager should contain no sleeps.\n    \"\"\"\n\n    def __init__(self, seats, clock, ttl=30.0):\n        self._clock = clock\n        self._ttl = ttl\n        self._lock = threading.Lock()\n        self._free = list(seats)\n        self._by_seat = {}            # seat_id  -> Lease\n        self._by_id = {}              # lease_id -> Lease\n        self._by_idem = {}            # idempotency key -> lease_id\n        self._expiry = []             # min-heap of (expires_at, lease_id)\n        self._tokens = itertools.count(1)   # monotonic, never reused\n\n    def grant(self, holder, idempotency_key=None):\n        with self._lock:\n            self._reap()\n            # A retry after a lost response must not consume a second seat.\n            if idempotency_key is not None:\n                existing = self._by_idem.get(idempotency_key)\n                if existing and existing in self._by_id:\n                    return self._by_id[existing]\n            if not self._free:\n                return None                      # no capacity; caller decides\n            seat = self._free.pop()\n            lease = Lease(\n                lease_id=f\"lease-{next(self._tokens)}\",\n                seat_id=seat,\n                holder=holder,\n                expires_at=self._clock.now() + self._ttl,\n                fencing_token=next(self._tokens),\n            )\n            self._by_seat[seat] = lease\n            self._by_id[lease.lease_id] = lease\n            if idempotency_key is not None:\n                self._by_idem[idempotency_key] = lease.lease_id\n            heapq.heappush(self._expiry, (lease.expires_at, lease.lease_id))\n            return lease\n\n    def renew(self, lease_id):\n        with self._lock:\n            self._reap()\n            lease = self._by_id.get(lease_id)\n            if lease is None:\n                return None        # already expired — caller must stop work\n            lease.expires_at = self._clock.now() + self._ttl\n            # Push a new entry rather than repairing the heap; the stale one\n            # is discarded in _reap by comparing against the authoritative\n            # expires_at on the lease itself.\n            heapq.heappush(self._expiry, (lease.expires_at, lease_id))\n            return lease\n\n    def release(self, lease_id):\n        with self._lock:\n            self._drop(lease_id)\n\n    def _reap(self):\n        now = self._clock.now()\n        while self._expiry and self._expiry[0][0] <= now:\n            _, lease_id = heapq.heappop(self._expiry)\n            lease = self._by_id.get(lease_id)\n            if lease is None:\n                continue                       # already released\n            if lease.expires_at > now:\n                continue                       # stale heap entry from a renew\n            self._drop(lease_id)\n\n    def _drop(self, lease_id):\n        lease = self._by_id.pop(lease_id, None)\n        if lease is None:\n            return\n        self._by_seat.pop(lease.seat_id, None)\n        self._free.append(lease.seat_id)\n```\n\nThings I would say while writing it. The clock is injected, so expiry tests are deterministic. Expiry is a min-heap rather than a scan — O(log n) per operation instead of O(n) per tick — and renewals push a new entry rather than repairing the heap, with stale entries discarded by comparing against the lease's own expires_at, which is the standard lazy-deletion trick. The fencing token is monotonic and never reused, so a holder that wakes up after expiry presents a stale token and the enforcement point rejects it. Idempotency keys mean a retried grant returns the same lease instead of consuming a second seat.\n\nAnd what I would flag as out of scope but real: this is in-process. Distributed, the same design needs the store to do the mutual exclusion — Postgres SELECT FOR UPDATE SKIP LOCKED — and the fencing token has to be enforced at the resource, not here, because a partitioned holder that can still reach the node bypasses any check that lives in this process.",
      },
      {
        question: 'Drain a set of nodes concurrently, at most N at a time, respecting a deadline.',
        answer:
          "Bounded concurrency with a deadline, in Python — I would say up front that Python is my language and ask if they would rather see it in something else.\n\n```python\nimport asyncio\n\nasync def drain_nodes(nodes, max_concurrent, drain, deadline_s):\n    \"\"\"Drain nodes with at most max_concurrent in flight.\n\n    Returns {node: None | Exception} rather than raising on the first failure.\n    A partial drain is a real operational outcome: knowing three of twenty\n    failed AND which three is actionable; a bare exception is not.\n    \"\"\"\n    sem = asyncio.Semaphore(max(1, max_concurrent))\n    results = {}\n\n    async def one(node):\n        async with sem:                 # bound is held for the work, not the spawn\n            try:\n                await drain(node)\n                results[node] = None\n            except asyncio.CancelledError:\n                results[node] = TimeoutError('deadline exceeded')\n                raise\n            except Exception as exc:    # noqa: BLE001 - record, never swallow\n                results[node] = exc\n\n    tasks = [asyncio.create_task(one(n)) for n in nodes]\n    try:\n        await asyncio.wait_for(asyncio.gather(*tasks, return_exceptions=True),\n                               timeout=deadline_s)\n    except asyncio.TimeoutError:\n        for t in tasks:\n            t.cancel()\n        # Let the cancellations land so every node has a recorded outcome.\n        await asyncio.gather(*tasks, return_exceptions=True)\n\n    for n in nodes:\n        results.setdefault(n, TimeoutError('never started before deadline'))\n    return results\n```\n\nWhat I would say while writing it. The semaphore is acquired inside the task, not around task creation, so the bound applies to work in flight rather than to spawning. Results are per node because a partial drain is the useful answer. Every node ends with a recorded outcome including the ones that never started — a silent missing key is how an operator concludes a node drained when it did not. And I would not let a bare except swallow anything; it records and moves on.\n\nThe domain point I would raise unprompted: max_concurrent is not a tuning constant, it is a capacity constraint. You can only drain as many nodes at once as the region's free capacity allows, or players cannot start games. So in the real version that number comes from the lease service — free seats in the region divided by seats per node, with a margin — and the drain takes out a maintenance reservation for it, so two automations cannot each independently conclude they have the headroom.\n\nIf they want Go, I would say honestly that Go is a language I read well and am actively learning by building an operator with kubebuilder, and that the structure would be a buffered channel as a semaphore with a WaitGroup and a context deadline — then write it, flagging that I would want review on idiom.",
      },
      {
        question: 'Given CI run records, find the jobs wasting the most engineer time.',
        answer:
          "This is close to something I actually built — git-dboard at Trackonomy and then at IBM — so I would say that up front and then write it.\n\nThe clarifying question first: waste is not the same as slow. A twenty-minute job that always passes is not waste, it is cost. Waste is time spent on runs that produced no signal — failures that were reruns of the same commit, and flaky jobs that passed on retry. I would confirm that definition before coding, because it changes the answer entirely.\n\n```python\nfrom collections import defaultdict\nfrom dataclasses import dataclass\n\n@dataclass\nclass JobWaste:\n    job: str\n    runs: int\n    wasted_seconds: float\n    flake_rate: float          # passed-on-retry / retried\n    rerun_rate: float\n\ndef rank_wasted_time(records, top_n=10):\n    \"\"\"records: iterable of {job, commit, status, duration_s, attempt}\n\n    Waste = duration of any attempt that did not produce final signal:\n    every non-final attempt on a commit. A job that fails once and passes\n    on retry burned its first attempt AND the engineer's context switch.\n    \"\"\"\n    # job -> commit -> [attempts]\n    by_job_commit = defaultdict(lambda: defaultdict(list))\n    for r in records:\n        by_job_commit[r['job']][r['commit']].append(r)\n\n    out = []\n    for job, commits in by_job_commit.items():\n        wasted = 0.0\n        runs = retried = flaked = 0\n        for _commit, attempts in commits.items():\n            attempts.sort(key=lambda a: a['attempt'])\n            runs += len(attempts)\n            final = attempts[-1]\n            # Every attempt before the last produced no lasting signal.\n            wasted += sum(a['duration_s'] for a in attempts[:-1])\n            if len(attempts) > 1:\n                retried += 1\n                # Failed, then passed on the same commit: flake, not a real break.\n                if final['status'] == 'success':\n                    flaked += 1\n        n_commits = len(commits)\n        out.append(JobWaste(\n            job=job,\n            runs=runs,\n            wasted_seconds=wasted,\n            flake_rate=flaked / retried if retried else 0.0,\n            rerun_rate=retried / n_commits if n_commits else 0.0,\n        ))\n\n    out.sort(key=lambda j: j.wasted_seconds, reverse=True)\n    return out[:top_n]\n```\n\nComplexity is linear in the number of records with a sort at the end, O(n + m log m) for m jobs, and it is a single pass over the input so it streams if the record set does not fit in memory.\n\nWhat I would add while talking. Ranking by wasted seconds alone favours slow jobs; I would surface flake_rate next to it because a fast job flaking on thirty percent of commits costs more in context switches than the raw seconds suggest — and context switching is the real cost, which is why I would also report rerun_rate per team rather than only per job. That per-team view is what made the dashboard useful at IBM: 'CI is slow' became 'these four jobs are burning your team eleven hours a week', which is a sentence someone can act on.",
      },
    ],
  },
];

// See the source-split note in nvidiaGfnTopics.js. The JD-vs-resume probes are
// answers about the candidate's own history and choices, so they belong in the
// personal source that behavioral mode can reach.
const PERSONAL_TOOL_TOPIC_IDS = new Set(['gfn-resume-jd-probes']);

export const nvidiaGfnToolTopics = ALL_GFN_TOOL_TOPICS.filter((t) => !PERSONAL_TOOL_TOPIC_IDS.has(t.id));
export const nvidiaGfnPersonalToolTopics = ALL_GFN_TOOL_TOPICS.filter((t) => PERSONAL_TOOL_TOPIC_IDS.has(t.id));
