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

export const nvidiaGfnToolTopics = [
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
          "Bounded concurrency with cancellation. In Go, since the operator work is Go:\n\n```go\n// DrainNodes drains nodes with at most maxConcurrent in flight. It returns\n// per-node results rather than the first error, because a partial drain is a\n// real outcome an operator needs to see — knowing three of twenty nodes\n// failed and which three is actionable; a bare error is not.\nfunc DrainNodes(ctx context.Context, nodes []string, maxConcurrent int,\n\tdrain func(context.Context, string) error) map[string]error {\n\n\tif maxConcurrent < 1 {\n\t\tmaxConcurrent = 1\n\t}\n\n\tvar (\n\t\tmu      sync.Mutex\n\t\tresults = make(map[string]error, len(nodes))\n\t\twg      sync.WaitGroup\n\t\tsem     = make(chan struct{}, maxConcurrent)\n\t)\n\n\tfor _, node := range nodes {\n\t\t// Stop dispatching once cancelled; already-running drains observe\n\t\t// ctx themselves and wind down.\n\t\tselect {\n\t\tcase <-ctx.Done():\n\t\t\tmu.Lock()\n\t\t\tif _, seen := results[node]; !seen {\n\t\t\t\tresults[node] = ctx.Err()\n\t\t\t}\n\t\t\tmu.Unlock()\n\t\t\tcontinue\n\t\tcase sem <- struct{}{}:\n\t\t}\n\n\t\twg.Add(1)\n\t\tgo func(n string) {\n\t\t\tdefer wg.Done()\n\t\t\tdefer func() { <-sem }()\n\t\t\terr := drain(ctx, n)\n\t\t\tmu.Lock()\n\t\t\tresults[n] = err\n\t\t\tmu.Unlock()\n\t\t}(n)\n\t}\n\n\twg.Wait()\n\treturn results\n}\n```\n\nCalled with a deadline:\n\n```go\nctx, cancel := context.WithTimeout(ctx, 4*time.Hour)\ndefer cancel()\nresults := DrainNodes(ctx, zone.Nodes, capacityHeadroom, drainOneNode)\n```\n\nWhat I would say out loud. The semaphore is a buffered channel, which is the idiomatic Go bound — I am not spawning a goroutine per node over an unbounded list. Cancellation is checked before dispatch so a cancelled context stops issuing new work immediately, and in-flight drains get ctx so they wind down themselves. Results are collected per node rather than returning the first error, because for a drain a partial result is the useful thing: three of twenty failed, and which three. The map is mutex-guarded, and I would run the test under -race.\n\nThe domain-specific part I would raise: maxConcurrent here is not a tuning constant, it is a capacity constraint. You can only drain as many nodes at once as the region's free capacity allows, or players cannot start games. So in the real version that number comes from the lease service — free seats in the region divided by seats per node, with a safety margin — and I would take out a maintenance reservation for it so two automations cannot independently decide they each have the headroom.",
      },
      {
        question: 'Given CI run records, find the jobs wasting the most engineer time.',
        answer:
          "This is close to something I actually built — git-dboard at Trackonomy and then at IBM — so I would say that up front and then write it.\n\nThe clarifying question first: waste is not the same as slow. A twenty-minute job that always passes is not waste, it is cost. Waste is time spent on runs that produced no signal — failures that were reruns of the same commit, and flaky jobs that passed on retry. I would confirm that definition before coding, because it changes the answer entirely.\n\n```python\nfrom collections import defaultdict\nfrom dataclasses import dataclass\n\n@dataclass\nclass JobWaste:\n    job: str\n    runs: int\n    wasted_seconds: float\n    flake_rate: float          # passed-on-retry / retried\n    rerun_rate: float\n\ndef rank_wasted_time(records, top_n=10):\n    \"\"\"records: iterable of {job, commit, status, duration_s, attempt}\n\n    Waste = duration of any attempt that did not produce final signal:\n    every non-final attempt on a commit. A job that fails once and passes\n    on retry burned its first attempt AND the engineer's context switch.\n    \"\"\"\n    # job -> commit -> [attempts]\n    by_job_commit = defaultdict(lambda: defaultdict(list))\n    for r in records:\n        by_job_commit[r['job']][r['commit']].append(r)\n\n    out = []\n    for job, commits in by_job_commit.items():\n        wasted = 0.0\n        runs = retried = flaked = 0\n        for _commit, attempts in commits.items():\n            attempts.sort(key=lambda a: a['attempt'])\n            runs += len(attempts)\n            final = attempts[-1]\n            # Every attempt before the last produced no lasting signal.\n            wasted += sum(a['duration_s'] for a in attempts[:-1])\n            if len(attempts) > 1:\n                retried += 1\n                # Failed, then passed on the same commit: flake, not a real break.\n                if final['status'] == 'success':\n                    flaked += 1\n        n_commits = len(commits)\n        out.append(JobWaste(\n            job=job,\n            runs=runs,\n            wasted_seconds=wasted,\n            flake_rate=flaked / retried if retried else 0.0,\n            rerun_rate=retried / n_commits if n_commits else 0.0,\n        ))\n\n    out.sort(key=lambda j: j.wasted_seconds, reverse=True)\n    return out[:top_n]\n```\n\nComplexity is linear in the number of records with a sort at the end, O(n + m log m) for m jobs, and it is a single pass over the input so it streams if the record set does not fit in memory.\n\nWhat I would add while talking. Ranking by wasted seconds alone favours slow jobs; I would surface flake_rate next to it because a fast job flaking on thirty percent of commits costs more in context switches than the raw seconds suggest — and context switching is the real cost, which is why I would also report rerun_rate per team rather than only per job. That per-team view is what made the dashboard useful at IBM: 'CI is slow' became 'these four jobs are burning your team eleven hours a week', which is a sentence someone can act on.",
      },
    ],
  },
];
