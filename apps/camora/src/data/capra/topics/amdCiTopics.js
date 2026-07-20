// AMD ROCm / TheRock CI — interview prep topics.
//
// Sourced from public repositories only, read 2026-07-19. Every claim
// below is traceable to a file, PR, or doc in one of:
//   - https://github.com/ROCm/TheRock
//   - https://github.com/ROCm/therock-ci-config   (public: real pool counts)
//   - https://github.com/ROCm/rocm-libraries , rocm-systems
//   - https://community.opengroup.org/osdu/platform/ci-cd-pipelines
//
// Where something is NOT publicly documented it says so explicitly in the
// text — those are framed as questions to ask, never as asserted fact.
// Do not "improve" this file by filling those gaps from memory.

export const amdCiCategories = [
  { id: 'ci-arch',    name: 'CI Architecture & Cross-Repo',  icon: 'gitBranch',     color: '#3b82f6' },
  { id: 'test-infra', name: 'Test Infrastructure & Cost',    icon: 'activity',      color: '#22c55e' },
  { id: 'gpu-fleet',  name: 'GPU Runners & Fleet Ops',       icon: 'zap',           color: '#f59e0b' },
  { id: 'multicloud', name: 'Multi-Cloud CI/CD Patterns',    icon: 'shield',        color: '#8b5cf6' },
];

export const amdCiTopicCategoryMap = {
  'therock-ci-architecture':   'ci-arch',
  'therock-cross-repo-dedup':  'ci-arch',
  'therock-test-topology':     'test-infra',
  'therock-selective-builds':  'test-infra',
  'therock-gpu-runners':       'gpu-fleet',
  'osdu-multicloud-cicd':      'multicloud',
};

export const amdCiTopics = [
  {
    id: 'therock-ci-architecture',
    title: 'TheRock CI Architecture — Python over YAML',
    description:
      'How AMD structures CI for a CMake super-project that builds ROCm from source across submodules, and why almost none of the logic lives in workflow YAML.',
    introduction:
      "TheRock is a CMake super-project that builds HIP/ROCm from source. It is not a code monorepo — it is a build and orchestration layer over git submodules. Sources come from two consolidated super repos, rocm-libraries and rocm-systems, which AMD created by merging dozens of individual component repos.\n\nThe defining architectural decision is that almost no logic lives in the workflow YAML. Roughly 55 Python scripts under build_tools/github_actions/ carry matrix generation, path filtering, version computation, stage impact analysis, and artifact routing — each with unit tests under tests/. The workflows themselves are thin orchestration.\n\nReuse happens through workflow_call, not composite actions. This is a deliberate constraint rather than a style preference: composite actions cannot express job-level fan-out or matrix strategy, which is exactly what a per-GPU-architecture build requires. The cost of that choice is that workflow_call inputs are scalar-only, so structured configuration has to be serialized as JSON strings and parsed back with fromJSON on the consuming side.\n\nThe entry point is multi_arch_ci.yml, which calls setup_multi_arch.yml to compute the matrix, then fans out to per-platform build and test workflows. Concurrency uses group: workflow-headref-or-runid with cancel-in-progress. Because head_ref is defined only for pull requests, PR runs coalesce and cancel each other while push and dispatch runs accumulate — a deliberate asymmetry that frees scarce GPU runners the moment someone force-pushes.",
    whenToUse: [
      'Designing CI for a build system that spans multiple independently-owned repositories',
      'Deciding whether orchestration logic belongs in YAML or in a tested programming language',
      'Evaluating workflow_call versus composite actions for cross-repo reuse',
      'Explaining why CI-of-CI changes are hard to roll out safely',
    ],
    keyConcepts: [
      {
        term: 'Logic in Python, not YAML',
        definition:
          'CI decision-making lives in ~55 unit-tested Python modules under build_tools/github_actions/ rather than in workflow expressions. This is the single most transferable design decision in the repo: YAML expressions cannot be tested in isolation, so pushing logic into Python makes CI behavior verifiable without running CI.',
      },
      {
        term: 'workflow_call over composite actions',
        definition:
          'Composite actions cannot express job-level fan-out or matrix strategy, so cross-repo reuse uses reusable workflows invoked with workflow_call. The tradeoff is that workflow_call inputs are limited to scalars.',
      },
      {
        term: 'JSON-string smuggling',
        definition:
          "Because workflow_call inputs are scalar-only, structured config travels as a serialized JSON string — for example external_repo: '{\"repository\":\"...\",\"ref\":\"...\"}' — and is read back via fromJSON(needs.setup.outputs.linux_build_config). The consequence is that input-contract errors surface at runtime rather than at parse time.",
      },
      {
        term: 'Asymmetric concurrency',
        definition:
          'The concurrency group uses github.head_ref || github.run_id with cancel-in-progress. head_ref exists only for pull requests, so PR runs cancel their own predecessors while push and scheduled runs never cancel each other. This is the primary mechanism that returns scarce GPU capacity when a PR is force-pushed.',
      },
    ],
    questions: [
      {
        question: 'Why does TheRock keep CI logic in Python instead of GitHub Actions expressions?',
        answer:
          'Testability and reuse. YAML expressions cannot be unit tested in isolation, and this CI has to make genuinely complex decisions — which GPU families to build, which stages a change impacts, which artifacts a test job needs. Those decisions live in Python modules with tests under build_tools/github_actions/tests/, so the behavior can be verified without triggering a multi-hour build. It also makes the logic reusable from three different repositories rather than copy-pasted into each. The workflows become thin orchestration over tested code.',
      },
      {
        question: 'Why use workflow_call rather than composite actions for cross-repo CI reuse?',
        answer:
          'Composite actions run inside a single job and cannot express job-level fan-out or a matrix strategy. TheRock needs to fan out one job per GPU architecture, so the reusable unit has to be a workflow, not an action. The cost is that workflow_call inputs are scalar-only, which forces structured configuration to be passed as serialized JSON strings and parsed back with fromJSON. That works, but it moves contract validation to runtime — a malformed blob fails mid-run rather than at parse time.',
      },
      {
        question: 'Why does the concurrency group treat pull requests differently from pushes?',
        answer:
          'The group key is github.head_ref || github.run_id. head_ref is only defined for pull requests, so every run of the same PR shares a key and cancel-in-progress kills the older one. For pushes and dispatches head_ref is empty, so run_id makes every run unique and nothing cancels. That asymmetry matters because GPU runners are fixed, scarce inventory: cancelling superseded PR runs immediately frees hardware, while main-branch and release runs must all complete.',
      },
    ],
    references: [
      'https://github.com/ROCm/TheRock',
      'https://github.com/ROCm/TheRock/blob/main/docs/development/ci_overview.md',
      'https://github.com/ROCm/TheRock/blob/main/.github/workflows/multi_arch_ci.yml',
    ],
  },

  {
    id: 'therock-cross-repo-dedup',
    title: 'Cross-Repo CI Deduplication & the Submodule-Inversion Problem',
    description:
      'How a super-project and its component repos share one CI definition when each needs to be the "outer" repo, and what the revert history teaches about rolling out CI-of-CI changes.',
    introduction:
      "TheRock consumes rocm-libraries as a git submodule. But when rocm-libraries runs CI for its own pull request, that PR's code must replace the submodule. The same workflow therefore has to support two opposite source topologies, and which repository is the outer one depends on which repository triggered the run. This is the submodule-inversion problem.\n\nBefore consolidation, each consuming repo carried hand-copied versions of TheRock's CI logic — three copies of the GPU family matrix, three copies of the configuration code, drifting independently. Adding a GPU family meant three synchronized pull requests.\n\nThe solution is detect_external_repo_config.py, which holds a REPO_CONFIGS map keyed by repository name yielding cmake_source_var, submodule_path, and skip_submodules. CI points CMake at the external checkout and tells fetch_sources.py to skip that submodule.\n\nThe rollout history is the more instructive part. PR #2771 landed the consolidation on 2026-01-05 as a single change: +2177/-208 across 17 files, adding the detection module, an external-repo project map, a rewritten configure_ci.py, three test files, and a test_external_repo_integration.yml workflow — CI for the CI. Ten days later PR #2955 reverted the whole thing, with the entire stated reason being \"Deduplication design requires further changes.\" There is no public post-mortem.\n\nThe re-land was incremental. #3181 landed the detection module alone — pure, testable, decoupled from any workflow rewiring. Then a long tail: #5059, #5254, #5257, and notably #5450 which was itself reverted by #5698 and re-landed as #5799. The revert cycle repeated even at the smaller granularity. Work is still open as of #6660.",
    whenToUse: [
      'Consolidating duplicated CI logic across repositories that depend on each other',
      'Designing a rollout for a change no canary can cover',
      'Explaining why decomposition alone does not make a risky change safe',
      'Arguing for pinned versus floating references between repositories',
    ],
    keyConcepts: [
      {
        term: 'Submodule inversion',
        definition:
          'A super-project consumes component repos as submodules, but each component repo must run the super-project\'s CI against its own HEAD — so the submodule has to be replaced by the triggering checkout. Which repo is "outer" depends on the trigger.',
      },
      {
        term: 'Config-mapped source substitution',
        definition:
          'detect_external_repo_config.py maps a repository name to cmake_source_var (e.g. THEROCK_ROCM_LIBRARIES_SOURCE_DIR), submodule_path, and skip_submodules. Every new external repo needs a hand-written entry, and edge cases keep surfacing: case sensitivity (#6023), DVC support (#6222), null family_overrides (#6407).',
      },
      {
        term: 'No safe partial rollout for CI-of-CI',
        definition:
          'Normal canarying needs a traffic split; CI has events, not traffic, and every event flows through one workflow definition. Worse, a broken change to the system that validates changes can block its own fix.',
      },
      {
        term: 'Unpinned cross-repo refs as accepted debt',
        definition:
          'Consuming repos call ROCm/TheRock/.github/workflows/...@main rather than a pinned SHA. An in-repo comment acknowledges this: "using main until full migration, then switch to pinned SHA (#3343)." A TheRock CI change therefore reaches both consuming repos immediately.',
      },
    ],
    questions: [
      {
        question: 'Three repositories carry near-identical CI logic. How would you consolidate them?',
        answer:
          'Establish one repository as the single source of truth and have the others invoke its reusable workflows, rather than copying files. The hard part is not the consolidation itself but the inversion: when a component repo runs its own CI, its code must replace the submodule the super-project would normally fetch. That needs a source-substitution mechanism — point the build system at the external checkout and skip the corresponding submodule fetch.\n\nOn sequencing: land the pure, testable pieces first and rewire the workflows last. TheRock learned this the expensive way — the big-bang version was reverted after ten days, and the detection module was later landed alone as its own reviewable change. I would also pin consumers to a SHA rather than a branch before starting, because pinning is what makes a staged rollout possible at all: you bump one consumer, watch it, then bump the next.',
      },
      {
        question: 'You cannot canary a change to the entry-point workflow of three repositories. How do you de-risk it?',
        answer:
          'Three things beyond making the change smaller.\n\nFirst, shadow runs: trigger the new path in parallel with the old on the same events, non-blocking, and diff the computed outputs — the matrix JSON, the stage impact, the artifact routing. Since the logic is already Python emitting JSON, you can compare decisions without running the builds. That is the closest thing to a canary CI can have.\n\nSecond, contract tests at the boundary. Because structured config travels as JSON strings, contract errors currently surface at runtime via fromJSON. Schema-validate those blobs where they are produced and test the schema, which turns a mid-run failure into a fast local one.\n\nThird — and this is the reframe — make rollback cheaper rather than only making changes smaller. Decomposition reduces the size of each failure but does not give you a rollback faster than noticing. Pinned consumer refs would let you bump one repo at a time and revert one repo at a time. The unpinned refs and the un-canary-able rollout are the same problem.',
      },
      {
        question: 'What does the #2771 revert and re-land actually teach?',
        answer:
          'Less than the tidy version suggests. The common telling is "big change reverted, decomposed, re-landed cleanly." What actually happened is that the re-land took roughly six months, and the revert cycle recurred at the smaller granularity — #5450 was reverted by #5698 and re-landed as #5799. Work is still open under #6660.\n\nSo the lesson is not "decompose and you will be fine." It is that some changes are hard because the problem is hard, not because the pull request was too big. Decomposition helped — landing the detection module alone as #3181 was clearly right — but it was not sufficient. What was missing is a way to exercise the new path against real events before it becomes the only path.',
      },
    ],
    references: [
      'https://github.com/ROCm/TheRock/pull/2771',
      'https://github.com/ROCm/TheRock/pull/2955',
      'https://github.com/ROCm/TheRock/pull/3181',
      'https://github.com/ROCm/TheRock/blob/main/build_tools/github_actions/detect_external_repo_config.py',
    ],
  },

  {
    id: 'therock-test-topology',
    title: 'Test Pipeline Topology & Enforced Cost Budgets',
    description:
      'How TheRock separates build from test, tiers test suites by cost, and enforces those budgets as hard CI timeouts rather than guidelines.',
    introduction:
      "BUILD_TOPOLOGY.toml is the single source of truth, and it drives three separate things: CMake feature generation, CI stage sharding, and partial source checkouts. That last one matters more than it sounds — fetch_sources.py --stage clones only the submodules a given stage needs, so a job never pays to check out code it will not build.\n\nThe hierarchy runs source_sets to build_stages to artifact_groups to artifacts. Artifacts are typed target-neutral (built once with all architecture targets) or target-specific (built per GPU family). That typing is what keeps per-architecture fan-out affordable: only target-specific work multiplies by the number of architectures.\n\nThe flow is build on CPU runners, upload artifacts to public-read S3, download and test on GPU runners. Artifacts are sliced by sub-component — lib, run, dev, doc, test — so a rocBLAS test job fetches --blas --tests while a sanity job fetches --base-only.\n\nTest suites are tiered into four filters, and the budgets are contracts rather than aspirations. From the docs: these execution times are enforced with GitHub Actions step timeouts, and going over the timeout causes a CI failure. A component team whose quick suite drifts past five minutes breaks CI.\n\nNote a common misconception: TheRock has no smoke test tier. A unit test asserts explicitly that smoke is not in VALID_TEST_CATEGORIES. The word survives only inside individual component scripts.",
    whenToUse: [
      'Designing a test pipeline where compute is expensive and fixed',
      'Deciding how to enforce test-suite cost budgets across many owning teams',
      'Separating build and test stages to keep expensive hardware idle less often',
      'Explaining artifact slicing and why test jobs should not download whole builds',
    ],
    keyConcepts: [
      {
        term: 'Four test tiers',
        definition:
          'quick (under 5 min, for build/CI-infra changes), standard (under 30 min, for component changes), comprehensive (under 2 hr, nightly and on-demand), full (2+ hr, prereleases and submodule bumps). Selected via CTest labels driven by TEST_TYPE and AMDGPU_FAMILIES.',
      },
      {
        term: 'Budgets as hard timeouts',
        definition:
          'Tier budgets are enforced as GitHub Actions step timeouts, so exceeding one fails CI. Per-config timeouts are derived arithmetically with the reasoning in comments — rocBLAS: 24 hours over 6 shards is 4 hours per shard, 240 minutes plus 20% margin gives timeout_minutes: 288.',
      },
      {
        term: 'target-neutral vs target-specific artifacts',
        definition:
          'Artifacts built once for all architectures versus artifacts built per GPU family. This typing is the mechanism that keeps per-architecture fan-out cheap, because only target-specific work multiplies by architecture count.',
      },
      {
        term: 'Sanity gate before the matrix',
        definition:
          'test_sanity_check runs first with a 5-minute timeout and --base-only artifacts; the full component matrix depends on it. A cheap gate avoids committing scarce GPU time to a fundamentally broken build. The component matrix itself uses fail-fast: false so one architecture failing does not kill the fleet-wide run.',
      },
    ],
    questions: [
      {
        question: 'How would you make full test suites affordable when GPU runners are scarce?',
        answer:
          'Tier the suites by cost and bind each tier to a trigger class, then enforce the budget mechanically. TheRock uses four tiers — roughly 5 minutes, 30 minutes, 2 hours, and 2+ hours — where pull requests touching build infrastructure get the cheapest tier, pull requests touching a component get the second, and the expensive tiers run nightly or on demand.\n\nThe part worth copying is enforcement: the budgets are GitHub Actions step timeouts, so a suite that drifts over its tier fails CI rather than quietly costing more. That pushes the cost-versus-coverage decision onto the team that owns the tests, who are the people with the context to make it.\n\nThe part worth questioning is the failure mode. When a slow test threatens the budget, the cheap fix is to demote or delete it, and nothing in the system tracks that erosion. I would want a report on what moved between tiers over time, otherwise coverage decays invisibly while CI stays green.',
      },
      {
        question: 'One GPU architecture fails to build. Should that block the others?',
        answer:
          'No — each architecture should be an independent lane, and TheRock does this with fail-fast: false on the component matrix. But the more interesting version of the question is which architectures get tested at all.\n\nOlder families are nightly-only, and several have an empty test-runs-on value, meaning no GPU runner exists for them — they are build-only. Some carry sanity_check_only_for_family, so they get a build and a sanity check and nothing more, permanently. That is a deliberate decision to abandon coverage on old hardware rather than a gap.\n\nI think that is defensible when the hardware is genuinely scarce and the user base has moved on, but it should be a stated policy with a review date, not an emergent property of which runners someone happened to provision.',
      },
      {
        question: 'Where does the sanity gate fit, and why does it exist?',
        answer:
          'It runs before the full component matrix, with a 5-minute timeout and only base artifacts downloaded, and the matrix depends on it. The purpose is to avoid spending scarce GPU time discovering that a build is fundamentally broken. It is the cheapest possible check placed at the most expensive decision point.\n\nThis is the same instinct as the tiering: order checks by cost and let the cheap ones gate the expensive ones. The design question underneath is what fraction of failures the gate actually catches — if it is low, the gate is pure overhead, and that is worth measuring rather than assuming.',
      },
    ],
    references: [
      'https://github.com/ROCm/TheRock/blob/main/docs/development/test_filtering.md',
      'https://github.com/ROCm/TheRock/blob/main/BUILD_TOPOLOGY.toml',
      'https://github.com/ROCm/TheRock/blob/main/docs/development/ci_overview.md',
    ],
  },

  {
    id: 'therock-selective-builds',
    title: 'Selective Builds & Affected-Component Detection',
    description:
      'The three-layer cascade that decides whether CI runs at all, which build stages rebuild, and which tests execute — and where its dependency graph is only an approximation.',
    introduction:
      "Selective builds in TheRock are not a single flag but a three-layer cascade, and each layer answers a different question.\n\nThe first layer asks whether CI needs to run at all. configure_ci_path_filters.py diffs changed paths and skips documentation-only changes. It includes a real-world correctness fix — _ensure_git_commit_available() fetches a missing SHA into a shallow checkout before diffing, because shallow clones otherwise produce wrong diffs.\n\nThe second layer asks which build stages must rebuild. stage_impact.py maps changed paths to submodules to source sets to artifact groups to build stages. It is deliberately conservative: touching .github/, build_tools/, docs/, scripts/, BUILD_TOPOLOGY.toml, or CMakeLists.txt forces full CI. The analyzer refuses to reason about changes to its own inputs.\n\nThe third layer asks which tests to run, and this is the fragile one. determine_rocm_test_dependencies.py derives the test dependency graph by regex-parsing every CMakeLists.txt for therock_cmake_subproject_declare with its TEST_SUBPROJECTS argument, computing a reverse-dependency closure. Changing rocSPARSE also tests hipSPARSE. An empty changed-projects list falls back to a wildcard that runs everything.\n\nThat third layer is a textual approximation of a graph the build system already knows, which is the most interesting weakness in the whole pipeline.",
    whenToUse: [
      'Building affected-component detection for a large dependency graph',
      'Deciding how conservative a change-impact analyzer should be',
      'Explaining why a derived source of truth beats a maintained parallel one',
      'Discussing failure asymmetry between over-testing and under-testing',
    ],
    keyConcepts: [
      {
        term: 'Three-layer cascade',
        definition:
          'Path filters decide whether to run CI; stage_impact.py decides which build stages rebuild; determine_rocm_test_dependencies.py decides which tests execute. Each layer narrows the work, and each fails open to running more rather than less.',
      },
      {
        term: 'Conservative self-exclusion',
        definition:
          'stage_impact.py forces full CI on any change to build_tools/, .github/, BUILD_TOPOLOGY.toml, or CMakeLists.txt. Correct, because the analyzer cannot reason about changes to its own inputs — but it means CI-infrastructure changes, which most need fast iteration, always pay the full cost.',
      },
      {
        term: 'Regex-derived dependency graph',
        definition:
          'The test graph comes from regex-parsing roughly a thousand CMakeLists.txt files rather than from the build system itself. Dependencies expressed through variables, macros, or generator expressions are invisible to it, and reformatting a file can change what gets tested without changing build semantics.',
      },
      {
        term: 'Failure asymmetry',
        definition:
          'A false positive costs GPU minutes; a false negative ships an untested regression. That asymmetry is why every layer fails toward running more work, and why the wildcard fallback on empty input is the right default.',
      },
    ],
    questions: [
      {
        question: 'The test dependency graph is a regex over a thousand CMake files. What breaks, and how would you fix it?',
        answer:
          'Three failure classes. False negatives are the dangerous one — a dependency expressed through a CMake variable, a macro, or a generator expression will not match the regex, so a real dependency becomes invisible and you ship untested code, silently. Second, formatting sensitivity: reformatting a CMakeLists can change what gets tested without changing any build semantics. Third, staleness — the parser encodes an assumption about a macro signature, and changing the macro degrades it quietly.\n\nThe asymmetry matters. A false positive costs GPU minutes; a false negative ships a regression. So the conservative fallbacks elsewhere are the right instinct — the system already knows it cannot fully trust this layer.\n\nThe fix is to have CMake emit the graph rather than parse for it. At configure time the declaration macro already has the dependency data, so write it to a machine-readable artifact and have CI consume that. Configure is cheap relative to build, and you can configure without compiling. Now the graph is produced by the same code that consumes it and cannot drift.\n\nMigration matters as much as the design: run both, diff them, alert on disagreement, change no behavior. Once the diff is quiet, make the generated graph authoritative and keep the regex as a loudly-warning fallback, then delete it. The caveat worth stating out loud is that this depends on configure being cheap enough to run per-PR — on a project with multi-hour builds that is worth verifying, and if it is not, cache the graph keyed on a hash of all CMakeLists files.',
      },
      {
        question: 'Why does the impact analyzer force full CI when you touch build_tools/?',
        answer:
          'Because it cannot reason about changes to its own inputs. If you modify the code that decides what to rebuild, the safe assumption is that its decisions are now untrustworthy, so it falls back to rebuilding everything. That is correct.\n\nThe problem is circular: CI-infrastructure changes are exactly the changes that most need fast iteration, and they always pay the full cost. Making the cost analyzer cheaper requires editing files that trigger the expensive path.\n\nI would break that by treating the analyzer as a testable unit rather than as part of the pipeline. It already emits structured output, so you can run it against a corpus of historical changes and assert its decisions in unit tests — fast, local, no GPU. Then a change to build_tools/ still forces full CI in production, but the iteration loop while developing it is seconds, not hours. You are not removing the conservative fallback; you are making it rarely the thing you wait on.',
      },
      {
        question: 'How would you determine what a change affects across a large service or component graph?',
        answer:
          'Derive the graph from whatever system already owns it rather than maintaining a parallel copy. Whatever declares dependencies — the build system, the package manifests, the deployment descriptors — already knows the edges, so emit them as data at configure or resolve time and let CI consume that artifact.\n\nThen compute the reverse-dependency closure of the changed set, not just direct dependents, because a change to a leaf library affects everything transitively above it.\n\nThen decide the failure direction deliberately. Over-testing costs compute; under-testing ships regressions. I would fail open — unknown input means test everything — and treat any narrowing as an optimization that has to earn its place with evidence.\n\nThe failure mode to watch for is drift between the declared graph and the real one. Where a system keeps dependencies in two places, they will diverge; TheRock has exactly this, with component dependencies in CMake and again in artifact-set declarations, and PR #6203 is a link failure caused by that divergence.',
      },
    ],
    references: [
      'https://github.com/ROCm/TheRock/blob/main/build_tools/github_actions/stage_impact.py',
      'https://github.com/ROCm/TheRock/blob/main/test_tools/determine_rocm_test_dependencies.py',
      'https://github.com/ROCm/TheRock/pull/6203',
    ],
  },

  {
    id: 'therock-gpu-runners',
    title: 'Ephemeral Kubernetes Runners & GPU Fleet Operations',
    description:
      'Running GitHub Actions on AKS with ephemeral pods, why fixed GPU inventory makes autoscaling the wrong frame, and how weighted random selection differs from a scheduler.',
    introduction:
      "AMD runs GitHub Actions Runner Controller on AKS. This is confirmed by the debugging documentation, which instructs engineers to run az aks get-credentials and then kubectl exec into a pod in the arc-runners namespace. That namespace is the ARC scale-set convention, and pod-per-job naming confirms EphemeralRunner mode rather than the legacy deployment model.\n\nWhat is not publicly documented: the ARC Helm values, minRunners and maxRunners, the listener configuration, node taints on GPU nodes, namespace resource quotas, and — importantly — whether containerMode is dind or the kubernetes hook mode. A code search across the public ROCm organization returns nothing for these. Treat them as questions to ask, not facts to assert.\n\nThe genuinely interesting engineering is public, in ROCm/therock-ci-config. Runner labels are centralized in a repository that consuming workflows check out at runtime and read through a versioned API — load_config_v1() with adapters, so old and new workflows coexist during migration. Every run logs the config commit SHA.\n\nBuild pools are weighted across clouds: Linux runs entirely on AWS with the Azure pool held live at weight 0.0, a zero-traffic fallback; Windows splits 90/10. Sanitizer builds get a dedicated heavy-ramdisk pool because ASan and TSan are memory and IO hungry.\n\nGPU test pools carry an explicit count field — the physical pool size. That field is the crux of the whole problem: you cannot autoscale capacity that does not physically exist.",
    whenToUse: [
      'Designing CI on Kubernetes where the constrained resource is fixed hardware',
      'Explaining why GPU CI differs structurally from CPU CI',
      'Evaluating ephemeral versus persistent runners and their caching consequences',
      'Discussing untrusted code execution in a cluster with privileged containers',
    ],
    keyConcepts: [
      {
        term: 'Fixed inventory, not autoscaling',
        definition:
          'ARC autoscales on queue depth, which works for CPU pools because you provision more. GPU pools carry a count field describing physical hardware. Autoscaling degenerates into distributing load over fixed inventory, which is a scheduling problem, not a provisioning one.',
      },
      {
        term: 'Weighted random selection is not a scheduler',
        definition:
          'select_weighted_label() draws random.random() against cumulative weights to pick a pool. It spreads load and prevents hot-spotting, but has no queue-depth awareness, no priority for main over PR, no fairness across teams, and no gang scheduling for jobs that need all eight GPUs simultaneously.',
      },
      {
        term: 'Config as a runtime-fetched versioned API',
        definition:
          'Runner topology lives in ROCm/therock-ci-config, checked out at runtime by consuming workflows and read via load_config_v1(). Changes propagate without a pull request per repo, the API is explicitly versioned with adapters, and each run logs the config SHA for reproducibility.',
      },
      {
        term: 'Ephemeral pods, warm nodes',
        definition:
          'Ephemeral pods cannot carry a local build cache, so ccache lives in shared object storage. But multi-gigabyte ROCm images mean pull time can exceed job time, which argues for keeping nodes warm and cycling only pods — the expensive, slow-to-provision thing is the GPU node, not the pod.',
      },
    ],
    questions: [
      {
        question: 'GPU pools are fixed inventory allocated by weighted random selection. Design something better.',
        answer:
          'First, name the constraint. ARC autoscales on queue depth, which is right for CPU pools because you provision more. You cannot autoscale hardware that does not physically exist. So this is not an autoscaling problem, it is scheduling over fixed inventory — the problem HPC schedulers have solved for thirty years.\n\nWeighted random does give you something real: it spreads load and prevents hot-spotting a pool, cheaply. What it lacks is queue-depth awareness, so a job can be placed on a saturated pool while another sits idle; priority, so a main-branch build queues behind a draft PR; fairness, so one team firing fifty PRs starves everyone; and gang scheduling, which the eight-GPU jobs need because they require all eight simultaneously.\n\nIn priority order I would add: a real queue with priority classes, which is a policy change rather than an architecture change and is the cheapest win; fairshare with decay, tracking recent consumption per team, which is what stops a PR storm from monopolizing a family; backfill, which is unusually effective here because the quick tier gives you a well-defined class of five-minute jobs to slot into gaps; and reservations for the multi-GPU pool to prevent fragmentation starving the large jobs.\n\nThe cost, unprompted: you are introducing a stateful component into a system whose current appeal is a stateless JSON file. Weighted selection cannot fail; a scheduler can, and it needs HA and an on-call owner.\n\nIf that is too much for a first step, make the weights dynamic instead of static — feed pool queue depth back into the weight calculation. That fits inside the existing config API and buys most of the load-balancing benefit without the operational surface.',
      },
      {
        question: 'The runner labels say ossci, meaning fork pull requests. If dind needs privileged, how do you square that?',
        answer:
          'First I would confirm the premise, because containerMode is not publicly documented. The kubernetes hook mode spawns sibling pods and avoids the privileged requirement, at the cost of needing read-write-many storage. Which mode is in use is a real question, not a rhetorical one.\n\nIf it is dind, the sidecar needs privileged, which is effectively root on the node — other containers\' filesystems, kubelet credentials, whatever that node can reach. Combined with fork pull requests, that is a container escape waiting to be attempted.\n\nThe layered answer starts with not running untrusted code near anything valuable. The primary control is not sandbox hardening, it is that fork pull requests run without organization secrets and need maintainer approval to run at all — the pull_request versus pull_request_target distinction, where the latter on untrusted code is the classic catastrophic misconfiguration.\n\nThen blast-radius isolation: untrusted workloads land on a separate tainted node pool with no access to internal registries or the control plane and short-lived node identity, so escape buys nothing. Ephemerality helps as containment rather than prevention — the pod dies with the job, so persistence requires escaping to the node, which is why the node pool boundary is the one that matters. Then the ordinary hardening: seccomp and AppArmor where dind tolerates them, dropping capabilities to the minimum the daemon needs rather than blanket privileged, no host network, and resource limits.\n\nThe honest summary is that you do not make privileged dind safe for untrusted code. You keep untrusted code and privileged dind out of the same blast radius.',
      },
      {
        question: 'How do you tell a flaky test from a dying GPU?',
        answer:
          'You need per-job hardware attribution, and the fleet already has the pieces. device-metrics-exporter emits temperature, utilization, memory, power, PCIe bandwidth, and clocks in Prometheus format, and its dashboards correlate to both Kubernetes and SLURM job identifiers. That job-level attribution is the whole point — it lets you pin a thermal throttle or an ECC event to the specific workflow run that hit it.\n\nSo the loop is: on test failure, join the job to the device metrics for its window. If failures cluster on a device rather than on a test, it is hardware. If they cluster on a test across devices, it is the test.\n\nThen close the loop automatically. There is a pre-start health gate in the exporter\'s testrunner component that validates a device before a job schedules onto it, which is the primitive for draining bad hardware out of the pool rather than letting it silently fail jobs. I would wire failure clustering into automatic cordon, with an alert rather than a silent drain, because taking scarce GPUs out of a pool has its own cost and someone should know it happened.',
      },
    ],
    references: [
      'https://github.com/ROCm/therock-ci-config',
      'https://github.com/ROCm/TheRock/blob/main/docs/development/github_actions_debugging.md',
      'https://github.com/ROCm/device-metrics-exporter',
      'https://github.com/ROCm/k8s-device-plugin',
    ],
  },

  {
    id: 'osdu-multicloud-cicd',
    title: 'Multi-Cloud CI/CD at Platform Scale — the OSDU Pattern',
    description:
      'How OSDU structures cloud-agnostic services with per-CSP implementations, what shared pipeline templates cost, and why hand-applied infrastructure drifts.',
    introduction:
      "OSDU is a cloud-agnostic subsurface data platform with per-cloud-service-provider implementations for AWS, Azure, GCP, IBM, and a reference OpenShift target. Its CI/CD is worth studying because it shows both the shared-template pattern and its costs at real scale.\n\nThe hub is osdu/platform/ci-cd-pipelines. Its cloud-providers/ directory holds 71 YAML files grouped by CSP, plus a cloud-agnostic core set. The canonical pipeline in standard-setup.yml defines sixteen stages: review, code-quality, build, csp-build, coverage, containerize, scan, deploy, bootstrap, integration, acceptance, reporting, clean, performance-testing, publish, deploy_preship. Note csp-build as a distinct stage after the cloud-agnostic build — that is the seam where per-cloud implementations compile — and bootstrap between deploy and integration, because services need data partitions and entitlements seeded before tests can run.\n\nA consuming service pulls roughly sixteen include: entries from that hub, without ref pins, so it tracks the template's default branch. One edit to a shared template changes every service's pipeline simultaneously, with no staged rollout.\n\nThe infrastructure repositories show a striking asymmetry. The Azure provisioning repo has a six-stage pipeline — lint, validate, test, build, scan, publish — with Terraform tested in Go via Terratest and Mage, state separated by workspace prefix, published as a versioned container image. The AWS Terraform repo's entire pipeline is a scan stage plus a no-op stub job whose comment reads \"Dummy job required by gitlab-ultimate.yml.\" AWS infrastructure is applied by operators from a Makefile. Same platform, same organization, two entirely different maturity levels for the same job.",
    whenToUse: [
      'Explaining Terraform drift as a structural consequence rather than an accident',
      'Discussing shared CI templates and the coupling they create',
      'Comparing approaches to giving fork contributors CI without cloud credentials',
      'Describing multi-cloud abstraction at build time versus runtime',
    ],
    keyConcepts: [
      {
        term: 'Build-time vs runtime cloud abstraction',
        definition:
          'OSDU abstracts clouds twice: at build time through per-CSP pipeline includes, and at runtime through pluggable backend implementations — object store mapper, blob, queue, and auth provider — pinned by version in each service. A plugin bump is therefore an N-repository change.',
      },
      {
        term: 'Unpinned includes as blast radius',
        definition:
          'Services include shared templates by file path with no ref pin, so they track the default branch. One template edit changes every consumer at once. This is structurally identical to unpinned cross-repo workflow refs in other systems.',
      },
      {
        term: 'Drift as a structural outcome',
        definition:
          'Where infrastructure is applied by hand rather than through a gated pipeline, nothing ever compares declared state to actual state. Drift is then the steady state rather than an incident, and it surfaces at the next apply as an unexpected destroy in the plan.',
      },
      {
        term: 'Trusted-branch pipelines for fork contributors',
        definition:
          'standard-setup.yml runs trusted-merge-branch-verification in the review stage, with trusted- prefixed branches running as child pipelines, specifically so fork merge requests never receive cloud credentials. A different solution to the same problem as gating fork pull requests in GitHub Actions.',
      },
    ],
    questions: [
      {
        question: 'Why does Terraform drift happen, and what actually prevents it?',
        answer:
          'Drift happens when the declared state and the real state diverge and nothing in the loop compares them. The common causes are a console hotfix during an incident that never gets backported, provider-side mutation such as autoscaling group sizes or policy-injected tags, two states owning overlapping resources, and provider version bumps changing how an existing resource is read.\n\nThe structural point is that drift is not bad luck when apply happens by hand. If infrastructure is applied from an operator\'s laptop rather than a gated pipeline, there is no record of who applied what, no enforced plan review, and nothing that periodically reconciles. You then find out at the next apply, when the plan proposes a destroy you did not ask for — the worst possible moment.\n\nWhat prevents it, roughly in order of value: plan on every merge request so the diff is reviewed; apply from CI so it is recorded and gated; scheduled drift detection running plan on a cron and alerting on non-empty diffs, which converts discovery from incidental to routine; and restricting console write access so the hotfix path is deliberate rather than default.\n\nWhat I would not claim is that you eliminate it. During an incident people will reach for the console, and that is often correct. The realistic goal is to detect drift quickly and make reconciliation cheap, not to forbid it.',
      },
      {
        question: 'What does a shared CI template cost, concretely?',
        answer:
          'Coupling that shows up in unrelated repositories. The clearest example in OSDU is a Terraform repository whose entire pipeline is a security scan plus a job that does nothing but echo its own name, with a comment stating it exists only because the shared scanner template requires it. That is a dead job in a real repository, caused by a contract in a template it did not write.\n\nThere is also sprawl: 71 files in one flat directory, three per-CSP variants of a single service, and two naming generations for the same cloud coexisting mid-rename. And there is version drift within a single repository — one file pinning Terraform 1.12.1 and Go 1.24.0 while another pins 1.9.8 and 1.18.8.\n\nThe underlying tension is real. Templates included without a ref pin propagate instantly, which is fast but unsafe. Versions pinned per consumer are safe but require an N-repository change to move. Most platforms pick one and live with its failure mode; the better answer is pinning plus tooling to bump many consumers at once, so you get staged rollout without the manual fan-out.',
      },
      {
        question: 'How do you give fork contributors CI without giving them cloud credentials?',
        answer:
          'The general principle is that credentials follow trust, not code. Untrusted code runs with no secrets; anything needing secrets runs only after a human with commit rights vouches for it.\n\nOSDU implements this with trusted-branch child pipelines — branches with a trusted- prefix run inside merge requests from a dedicated container, gated by a verification job in the review stage. GitHub Actions implements the same idea through the pull_request versus pull_request_target distinction plus environment approval gates, where running pull_request_target against untrusted code is the classic catastrophic misconfiguration because it grants secrets to code the fork controls.\n\nHaving seen both, the thing I would carry across is that the boundary belongs at credential issuance rather than at sandboxing. Sandbox hardening is a second line — useful, but if untrusted code and live credentials are in the same execution context you are relying on the sandbox holding, and sandboxes eventually do not.',
      },
    ],
    references: [
      'https://community.opengroup.org/osdu/platform/ci-cd-pipelines',
      'https://community.opengroup.org/osdu/platform/deployment-and-operations/infra-azure-provisioning',
      'https://community.opengroup.org/osdu/platform/deployment-and-operations/terraform-deployment-aws',
    ],
  },
];
