/**
 * Git — branching, integration at scale, and history forensics.
 *
 * Split out of the single `git-for-devops` command reference, which covered
 * syntax but none of the questions engineers actually get asked: which
 * branching model to pick and why, how to ship a change that depends on
 * another unmerged change, what happens when forty developers merge into one
 * branch, and how to find the commit that broke something three weeks ago.
 *
 * Structure follows the reviewed DevOps convention: description (standfirst
 * plus overview), introduction, topics[] as chapters, quickFire[], references.
 */
import { devopsCategories } from './devopsTopics.js';

export const gitTopics = [
  // ── 1 ────────────────────────────────────────────────────────────────
  {
    id: 'git-branching-strategies',
    title: 'Branching Strategies — Trunk-Based, GitFlow, and the Cost of a Long-Lived Branch',
    icon: 'gitBranch',
    color: '#f97316',
    questions: 10,
    description: 'Choosing a branching model is choosing how much merge debt you are willing to carry. Trunk-based development, GitHub Flow, GitLab Flow, GitFlow and release branches compared on the one axis that predicts pain: how long a branch lives before it is integrated.',
    introduction: `## Overview
Branching arguments are usually framed as taste. They are not. Every branching model is a bet about **integration frequency**, and the cost of the bet is measurable.

The mechanism is divergence. Two branches that both change the same codebase drift apart at a rate set by how fast the team commits. The work required to reconcile them grows faster than linearly with that divergence, because conflicts interact — resolving one can create another, and a semantic conflict (two changes that merge cleanly but are wrong together) is invisible to the merge algorithm entirely. **A branch that lives one day carries a day of divergence. A branch that lives six weeks carries six weeks of it, and nobody has been testing the combination in the meantime.**

This is why the DORA research repeatedly finds trunk-based development predictive of delivery performance: the specific practices it measured were branches living less than a day and fewer than three active branches in the repository. The finding is not that short branches are virtuous; it is that long branches hide integration risk until the worst possible moment.

The models below differ mainly in how many long-lived branches they mandate and what those branches are for.`,
    topics: [
      {
        title: 'The four models, and the situation each one is actually for',
        content: `**Trunk-based development.** Everyone commits to one branch, main. Work either lands directly or through a short-lived branch measured in hours. Anything unfinished is hidden behind a feature flag or built as dark code that nothing calls yet, so main is always releasable even when features are not finished. This decouples deploy from release, which is the property that makes the model work at all — without flags, trunk-based development degrades into either broken mains or long branches wearing a different name.

The cost is real and worth stating: you need a fast, trustworthy test suite, feature-flag hygiene including a process for removing dead flags, and the cultural willingness to review small increments rather than finished features. Teams that adopt the branching rule without those three usually revert within a quarter.

**GitHub Flow.** One long-lived branch (main), plus a short-lived branch per change, merged through a pull request and deployed on merge. It is trunk-based development with the pull request made mandatory as the review and CI gate. This is the right default for most web services and for anything continuously deployed from a single production version.

**GitLab Flow.** GitHub Flow with explicit environment branches — main flows to a staging branch, then to production — or with release branches for versioned software. It exists to answer the question GitHub Flow ignores: what is deployed right now, and how do I promote a known-good commit rather than whatever landed last? Where GitOps is in use, the environment branch is often replaced by an environment directory in a config repo, which is the same idea with better auditability.

**GitFlow** (Vincent Driessen, 2010). Two permanent branches, main and develop, plus feature, release and hotfix branches. It was designed for software with **multiple versions live in the field simultaneously** — desktop applications, firmware, on-premise products where customers sit on 3.2 while you develop 4.0. In that setting it is correct and hard to replace.

For a continuously deployed web service it is a poor fit, and Driessen himself later added a note to the original post saying so. The costs are that develop and main diverge continuously, that every change is integrated twice, and that release branches are exactly the long-lived divergence the model is supposed to manage. **The question that settles it: do you support more than one production version at once? If not, the second permanent branch is pure overhead.**

**Release branches without GitFlow.** A common and sensible middle position: trunk-based day to day, but cut a release branch at the moment you ship, and cherry-pick only fixes onto it. The branch is short-lived by policy, exists to stabilise one release, and is deleted after. This is roughly how the Linux kernel, Chromium and Kubernetes operate, and it scales to very large contributor counts.`,
      },
      {
        title: 'Long-lived branches — the failure modes and the ways out',
        content: `Divergence causes four distinct problems, and they need different remedies.

**Textual conflicts** are the visible ones: two branches edited the same lines. These are annoying but tractable, and they scale with how much code both branches touched.

**Semantic conflicts** are the dangerous ones. Branch A renames a function's contract; branch B adds a caller using the old contract. Both merge cleanly. Nothing conflicts. The build breaks, or worse, it does not and the behaviour is wrong. **No merge algorithm can detect this, which is the fundamental argument for integrating often** — only running the combined code finds it, and the only way to run the combined code is to combine it.

**Rebase-versus-merge** is downstream of this and much less important than the arguments suggest. Merge preserves the true history and creates a merge commit; rebase produces a linear history by replaying commits onto a new base, at the cost of rewriting commit hashes. A workable house rule: rebase your own unpushed work to keep it tidy, merge shared branches, and never rebase a branch that someone else has based work on. The golden rule of rewriting is that you may rewrite history nobody else has.

**Drift in review.** A long branch accumulates review debt too — a 3,000-line pull request gets a worse review than six 500-line ones, because reviewer defect detection falls off sharply with size. This is a quality cost, not just a merge cost.

Practical mitigations, in order of leverage:

- **Feature flags** to decouple merge from release, so the branch does not need to live until the feature is finished.
- **Branch by abstraction** for large refactors: introduce an abstraction layer on trunk, migrate callers incrementally behind it, then delete the old path. This turns a six-week branch into thirty small merges.
- **Expand and contract** (also called parallel change) for anything with a contract — schema, API, config. Add the new form, support both, migrate readers and writers, remove the old form. Each step is independently shippable and independently revertible.
- **Rebase the long branch daily** if it must exist, so conflicts are found in daily-sized pieces rather than all at once at the end.
- **Merge upstream into the branch frequently** if it is shared and rebasing is unsafe. The direction differs; the point is the same.`,
      },
    ],
    quickFire: [
      { q: 'What does trunk-based development actually require?', a: 'Branches that live under a day, few active branches, and feature flags or dark code so unfinished work can merge without being released. Without the flags it degrades into broken mains or long branches under another name. It also needs a fast trustworthy test suite and reviewers willing to review increments rather than finished features.' },
      { q: 'Why does DORA associate trunk-based development with performance?', a: 'The measured practices were branches living less than a day and fewer than three active branches. The causal story is integration risk: long branches hide it until merge time, and semantic conflicts only surface when the combined code actually runs.' },
      { q: 'When is GitFlow the right choice?', a: 'When multiple versions are live in the field at once — desktop apps, firmware, on-premise products where customers sit on 3.2 while you build 4.0. There the hotfix and release branches earn their keep. For a single continuously deployed production version the second permanent branch is pure overhead, as Driessen himself later noted.' },
      { q: 'What is a semantic conflict?', a: 'Two changes that merge cleanly but are wrong together — one renames a contract, the other adds a caller using the old one. No merge algorithm can detect it because nothing textually conflicts. Only running the combined code finds it, which is the fundamental argument for integrating frequently.' },
      { q: 'Rebase or merge?', a: 'Rebase your own unpushed work to keep it tidy; merge shared branches; never rebase a branch someone else has based work on. Rebase gives linear history at the cost of rewriting hashes, merge preserves true history. The golden rule: you may rewrite only history nobody else has.' },
      { q: 'How do you land a six-week refactor without a six-week branch?', a: 'Branch by abstraction — introduce an abstraction on trunk, migrate callers incrementally behind it, delete the old path. Thirty small merges instead of one enormous one. For anything with a contract, use expand and contract: add the new form, support both, migrate, remove the old.' },
      { q: 'What is GitLab Flow for?', a: 'It answers what GitHub Flow ignores: what is deployed right now, and how do I promote a known-good commit rather than whatever landed last. Environment branches (main to staging to production) or release branches for versioned software. Under GitOps the environment branch is usually replaced by an environment directory in a config repo — same idea, better audit trail.' },
      { q: 'How do very large projects branch?', a: 'Trunk-based day to day, with a release branch cut at ship time that receives only cherry-picked fixes and is deleted after. Linux, Chromium and Kubernetes work roughly this way, and it scales to very large contributor counts because the branch is short-lived by policy.' },
      { q: 'Why is a 3,000-line pull request worse than six 500-line ones?', a: 'Reviewer defect detection falls off sharply with size, so the large PR gets a worse review as well as a harder merge. Divergence costs quality, not just time.' },
      { q: 'If a long-lived branch is unavoidable, what do you do?', a: 'Reduce the batch of conflict rather than the conflict itself: rebase it daily (or merge upstream into it daily if it is shared) so conflicts arrive in daily-sized pieces instead of all at once, and keep it releasable so it can be abandoned cheaply.' },
    ],
    references: [
      'https://trunkbaseddevelopment.com/',
      'https://nvie.com/posts/a-successful-git-branching-model/',
      'https://docs.github.com/en/get-started/using-github/github-flow',
      'https://martinfowler.com/articles/branching-patterns.html',
      'https://dora.dev/capabilities/trunk-based-development/',
      'https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow',
      'https://www.atlassian.com/git/tutorials/comparing-workflows',
      'https://martinfowler.com/bliki/BranchByAbstraction.html',
      'https://martinfowler.com/bliki/ParallelChange.html',
    ],
  },

  // ── 2 ────────────────────────────────────────────────────────────────
  {
    id: 'git-stacked-prs',
    title: 'Stacked Pull Requests and PR Dependencies',
    icon: 'gitPullRequest',
    color: '#8b5cf6',
    questions: 10,
    description: 'How to ship a change that depends on another change that has not merged yet — without waiting, and without opening a 2,000-line pull request. Stacking, restacking after review, the tooling, and the failure modes.',
    introduction: `## Overview
Two forces pull in opposite directions. Small pull requests get better reviews and merge faster. But real work arrives in dependent chunks: the refactor that enables the feature, the API change the client needs, the migration before the query.

The usual responses are both bad. Waiting for PR 1 to merge before opening PR 2 serialises your own work behind someone else's review latency. Bundling everything into one PR produces the 2,000-line change that nobody reviews properly.

**Stacking is the third option: open PR 2 against PR 1's branch rather than against main.** Each PR stays small and independently reviewable, the diff shown for PR 2 contains only its own changes, and the stack merges bottom-up as reviews complete. Meta, Google and several large open-source projects work almost exclusively this way, which is why the workflow is often called stacked diffs — the Phabricator and Critique lineage rather than the GitHub one.

The cost is that Git has no native concept of a stack, so keeping one coherent after review feedback is manual unless you adopt tooling.`,
    topics: [
      {
        title: 'Building a stack, and the restack problem that defines the workflow',
        content: `The construction is straightforward. Branch feature-1 from main and open a PR targeting main. Branch feature-2 from feature-1 and open a PR **targeting feature-1**. Branch feature-3 from feature-2, and so on. Because each PR's base is its parent, the diff each reviewer sees contains only that increment.

The hard part is what happens next, and it is worth understanding precisely because it is the interview question. Suppose a reviewer asks for a change in PR 1. You amend the commit on feature-1. That rewrites the commit, giving it a new hash. feature-2 was branched from the **old** commit, which now has no descendant relationship to the new one, so feature-2's base has effectively vanished. Every branch above it in the stack is now stale.

Fixing that is called **restacking**: rebase feature-2 onto the new feature-1, then feature-3 onto the new feature-2, all the way up. Done by hand this is a sequence of rebases where a mistake in the middle silently duplicates or drops commits. Two Git features make it survivable:

- **git rebase --update-refs** (Git 2.38+) rebases a branch and moves the other branch pointers that lie within the rebased range at the same time — a one-command restack for simple stacks. Set rebase.updateRefs=true to make it the default.
- **git rerere** ("reuse recorded resolution") records how you resolved a conflict and replays it automatically the next time the same conflict appears. Since restacking replays the same conflicts repeatedly, enabling rerere.enabled=true removes most of the repetition. This is the single highest-value config change for anyone stacking by hand.

The other constant hazard is force-pushing. Restacking rewrites branches, so pushing requires force. **Always use --force-with-lease rather than --force**: it refuses the push if the remote moved since you last fetched, which is what stops you silently destroying a colleague's commit or a suggestion committed from the review UI. Better still is --force-with-lease with an explicit expected ref.

When merging, merge bottom-up: PR 1 into main, then retarget PR 2 to main (most platforms do this automatically when the base branch merges), and continue. Squash-merging each PR is common and keeps main linear, but be aware it rewrites the commit that the branch above expects, so a restack usually follows each merge.`,
      },
      {
        title: 'Tooling, alternatives, and when stacking is the wrong answer',
        content: `Plain Git plus --update-refs and rerere is workable for stacks of two or three. Beyond that, tooling pays for itself:

- **Graphite** — hosted, GitHub-native; tracks the stack, restacks on demand, and can merge the whole stack.
- **git-town** — open source; adds commands such as sync, append and ship that understand parent-child branch relationships.
- **spr** and **ghstack** — map local commits one-to-one onto GitHub PRs, closest to the Phabricator model, popular in Rust and PyTorch circles.
- **Gerrit** — a different model entirely, worth knowing because the comparison is illuminating. Gerrit reviews *commits* rather than branches, with a Change-Id trailer identifying a logical change across revisions. Dependencies between changes are first-class, so stacking is the default rather than a workaround. Used by Android, Chromium and Go.
- **GitLab merge trains** and **GitHub merge queue** solve the adjacent problem of serialising merges safely, covered in the merge-at-scale topic.

Alternatives worth considering before reaching for a stack. **Feature flags** often remove the dependency entirely — if PR 2 can merge behind a disabled flag, it does not need PR 1 to land first. **Expand and contract** does the same for contract changes. And if the chunks are genuinely independent, they should simply be separate PRs against main, not a stack; stacking independent work adds sequencing cost for nothing.

Where stacking goes wrong:

- **Stacks that grow too deep.** Beyond four or five, the restack cost after any feedback exceeds the review benefit. Keep stacks shallow and merge the bottom promptly.
- **Reviewers who cannot see the whole picture.** Each PR is small, which is the point, but the reviewer may not understand why. Write the stack's overall intent in every PR description, with a link to the others.
- **CI cost.** Each PR in a stack runs CI, and every restack re-runs all of them. On an expensive suite this multiplies quickly; some teams run only the full suite on the bottom PR and a fast subset above it.
- **The bottom PR stalls.** The entire stack is blocked behind one review. This is the real risk, and it is organisational rather than technical: stacking makes review latency the binding constraint, so it only works in a culture with a genuine review SLA.`,
      },
    ],
    quickFire: [
      { q: 'What is a stacked pull request?', a: 'A PR opened against another unmerged PR\'s branch rather than against main. Each PR stays small and independently reviewable, the reviewer sees only that increment, and the stack merges bottom-up. It is the standard workflow at Meta and Google, inherited from Phabricator and Critique rather than GitHub.' },
      { q: 'What problem does stacking solve?', a: 'Dependent work. Waiting for PR 1 to merge serialises your work behind someone else\'s review latency; bundling everything gives a 2,000-line PR nobody reviews properly. Stacking gets small reviewable units without the wait.' },
      { q: 'What is restacking and why is it needed?', a: 'Amending a commit in a lower PR rewrites it into a new hash, so every branch above was forked from a commit that no longer has a descendant relationship — the stack is stale. Restacking rebases each branch onto its new parent, bottom-up.' },
      { q: 'What is git rebase --update-refs?', a: 'Git 2.38+ — rebases a branch and simultaneously moves the other branch pointers inside the rebased range, giving a one-command restack for simple stacks. Set rebase.updateRefs=true to make it default.' },
      { q: 'What is git rerere and why does it matter for stacks?', a: 'Reuse recorded resolution: it records how you resolved a conflict and replays it automatically when the same conflict reappears. Restacking replays the same conflicts repeatedly, so rerere.enabled=true is the single highest-value config change for anyone stacking by hand.' },
      { q: 'Why --force-with-lease instead of --force?', a: 'It refuses the push if the remote moved since your last fetch, so you cannot silently destroy a colleague\'s commit or a suggestion committed from the review UI. Restacking requires force-pushing constantly, which makes this the difference between a safe workflow and an occasional data-loss incident.' },
      { q: 'How does Gerrit differ, and why is that interesting?', a: 'Gerrit reviews commits rather than branches, with a Change-Id trailer identifying a logical change across revisions, so dependencies between changes are first-class and stacking is the default rather than a workaround. Android, Chromium and Go use it. It shows that stacking is awkward in GitHub because of the branch-based review model, not because the idea is hard.' },
      { q: 'When should you not stack?', a: 'When the chunks are genuinely independent — then they are just separate PRs against main, and stacking adds sequencing cost for nothing. When a feature flag or expand-and-contract removes the dependency outright. And beyond about four or five deep, where restack cost after feedback exceeds the review benefit.' },
      { q: 'What is the real risk of stacking?', a: 'The bottom PR stalls and blocks the whole stack. That is organisational, not technical — stacking makes review latency the binding constraint, so it only works where there is a genuine review SLA.' },
      { q: 'What happens to CI cost with stacks?', a: 'Every PR in the stack runs CI and every restack re-runs all of them, so cost multiplies with depth and churn. A common mitigation is the full suite on the bottom PR and a fast subset above it, with the full suite gating the merge.' },
    ],
    references: [
      'https://git-scm.com/docs/git-rerere',
      'https://git-scm.com/docs/git-rebase#Documentation/git-rebase.txt---update-refs',
      'https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-with-leaseltrefnamegt',
      'https://www.gerritcodereview.com/',
      'https://graphite.dev/docs',
      'https://www.git-town.com/',
      'https://github.com/ezyang/ghstack',
    ],
  },

  // ── 3 ────────────────────────────────────────────────────────────────
  {
    id: 'git-merge-at-scale',
    title: 'Merging at Scale — Merge Queues, Semantic Conflicts, and N Developers on One Branch',
    icon: 'gitMerge',
    color: '#0ea5e9',
    questions: 11,
    description: 'What breaks when forty developers merge into one branch, why a green PR can still break main, and how merge queues, batching and bisect-on-failure keep an always-green trunk without serialising everyone behind a single build.',
    introduction: `## Overview
There is a specific bug that every large repository hits, and it has a name worth knowing: the **semantic merge conflict**, or more usefully, the fact that **CI passing on your branch does not mean CI will pass after your branch merges.**

The mechanism is simple. You branch from main at commit X and CI goes green. While you were working, someone else merged commit Y. Your PR still shows green — it was tested against X — but main is now X+Y, and nobody has ever tested X+Y+yours. If Y renamed something your change calls, main breaks the moment you merge, and it breaks for everybody.

The probability of this is not small. It rises with the number of developers, the merge rate and the size of changes, and it becomes near-certain at a few dozen active contributors. A broken main is expensive out of proportion to the bug: it blocks every other merge, every deploy, and every developer who pulls.

The naive fix — require every PR to be up to date with main before merging — works and is what "require branches to be up to date" does on GitHub. It also serialises the entire team: each merge invalidates every other open PR, which must then rebase and re-run CI. At scale this collapses throughput to one merge per CI cycle.

Merge queues exist to get the safety without the serialisation.`,
    topics: [
      {
        title: 'How a merge queue works, and why batching is the whole trick',
        content: `A merge queue takes approved PRs and, instead of merging them immediately, tests each one **as it would be after merging** — against the current tip plus everything ahead of it in the queue. Only if that speculative combination passes does it actually merge. Main therefore only ever receives commits that have been tested in their true final state.

Done one at a time this is correct but slow: throughput is capped at one merge per full CI run. The optimisation that makes queues practical is **speculative batching**. The queue takes the next N PRs, builds the combined result, and if it passes, merges all N at once — one CI run for N merges.

The interesting case is failure. If the batch of five fails, at least one PR is bad but the queue does not know which. Two strategies:

- **Bisect the batch.** Split it in half, test both halves, recurse. This finds the culprit in about log2(N) additional runs and is what Bors and Zuul-style systems do. It is the same idea as git bisect applied to a queue.
- **Speculate optimistically.** Test several possible futures in parallel — the batch as-is, and the batch minus the most suspicious PR — trading compute for latency. Zuul pioneered this with its concept of testing changes in dependent pipelines ahead of merge.

Either way, the offending PR is ejected, its author is told, and the rest of the batch proceeds. This is why batch size is a tuning parameter: large batches maximise throughput when the failure rate is low, and small batches minimise wasted work when it is high. A queue with a high ejection rate should shrink its batches.

The implementations worth knowing: **GitHub merge queue** (native, batches and speculative checks), **GitLab merge trains** (the same idea, with trains that rebuild on failure), **Bors-NG** (the Rust project's, bisect-on-failure), **Zuul** (OpenStack's, cross-repository dependent pipelines — the most sophisticated of the lot), and **Aviator** or **Mergify** as hosted options.`,
      },
      {
        title: 'Everything else that breaks with many developers, and what to do about it',
        content: `**Conflicts on shared generated files.** Lockfiles, generated clients, snapshot files and changelogs conflict on nearly every concurrent PR because everyone touches the same lines. Three remedies, in order of preference: stop committing the artefact if it can be generated deterministically in CI; use a **merge driver** (a custom entry in .gitattributes) that knows how to combine the format — the union driver works for append-only files such as changelogs; or move to a format that does not collide, such as one file per entry with a fragment directory, which is what changelog tools like towncrier do.

**Repeated identical conflicts.** Enable rerere.enabled=true globally. On a busy shared branch the same conflict reappears constantly, and rerere resolves it silently after the first time.

**A merge that went wrong.** Reverting a merge commit needs -m to say which parent is the mainline: git revert -m 1 <merge-sha> keeps the first parent, which is the branch you merged into. The subtlety that bites people: reverting a merge undoes the *code* but not the *merge relationship*, so re-merging that branch later brings nothing back — Git still believes it is merged. The fix is to revert the revert before re-merging.

**Losing the shape of history.** With many merges, git log becomes unreadable. git log --first-parent follows only the mainline, showing one entry per merged PR rather than every constituent commit — this is the view you want for release notes and for bisecting, and it is why keeping merge commits (rather than squashing everything) has real operational value.

**Ownership at scale.** A CODEOWNERS file routes review automatically by path, which stops the single-senior-reviewer bottleneck. Combine it with a review SLA; automated routing without a response commitment just relocates the queue.

**Repository size and clone time.** Covered properly under monorepo scale, but the headline for CI is: use partial clone (--filter=blob:none) rather than shallow clone (--depth=1) when history is needed, since shallow clones break bisect and blame outright.

**The organisational failure mode.** All of this machinery assumes a green main is a shared priority. If a broken main is normal, the queue will simply be bypassed under deadline pressure. The health metric to watch is not merge throughput but **time-to-green** — how long main stays broken when it breaks. If that number is measured in hours, the tooling is not the problem.`,
      },
    ],
    quickFire: [
      { q: 'Why can a green PR still break main?', a: 'Because it was tested against the commit it branched from, not against the current main. If someone merged in between, the combination of both changes has never been tested. That is a semantic merge conflict, and it becomes near-certain at a few dozen active contributors.' },
      { q: 'What does a merge queue do?', a: 'It tests each approved PR as it would be after merging — against the current tip plus everything ahead of it in the queue — and merges only if that speculative combination passes. Main therefore only receives commits tested in their true final state.' },
      { q: 'Why not just require every PR to be up to date with main?', a: 'It is correct but serialises the team: every merge invalidates every other open PR, which must rebase and re-run CI. Throughput collapses to one merge per CI cycle. Merge queues get the same safety without the serialisation.' },
      { q: 'What is speculative batching?', a: 'Testing the next N queued PRs as one combined result and merging all N if it passes — one CI run for N merges. Batch size is a tuning parameter: large batches win when the failure rate is low, small batches waste less when it is high.' },
      { q: 'A batch of five fails. How do you find the bad PR?', a: 'Bisect the batch — split, test both halves, recurse — finding the culprit in about log2(N) extra runs, which is what Bors does. Or speculate optimistically, testing several possible futures in parallel and trading compute for latency, which is Zuul\'s approach. Then eject the offender and let the rest proceed.' },
      { q: 'Name the merge queue implementations.', a: 'GitHub merge queue, GitLab merge trains, Bors-NG (Rust, bisect-on-failure), Zuul (OpenStack, cross-repository dependent pipelines and the most sophisticated), and hosted options such as Aviator and Mergify.' },
      { q: 'How do you stop lockfiles conflicting on every PR?', a: 'Best: do not commit the artefact if CI can regenerate it deterministically. Next: a custom merge driver via .gitattributes — the union driver handles append-only files like changelogs. Next: change format so entries do not collide, such as a fragment directory with one file per entry.' },
      { q: 'How do you revert a merge commit?', a: 'git revert -m 1 <merge-sha>, where -m 1 names the mainline parent (the branch you merged into). The trap: this undoes the code but not the merge relationship, so re-merging that branch later brings nothing back — Git still thinks it is merged. Revert the revert before re-merging.' },
      { q: 'What is git log --first-parent for?', a: 'Following only the mainline, so you see one entry per merged PR instead of every constituent commit. It is the right view for release notes and for bisecting a merge-heavy history, and it is a concrete reason to keep merge commits rather than squashing everything.' },
      { q: 'What does CODEOWNERS solve, and what does it not?', a: 'It routes review automatically by path, removing the single-senior-reviewer bottleneck. It does not create a response commitment — automated routing without a review SLA just relocates the queue.' },
      { q: 'What is the right health metric for trunk stability?', a: 'Time-to-green — how long main stays broken when it breaks — not merge throughput. If that is measured in hours, no queue will help, because the queue will be bypassed under deadline pressure.' },
    ],
    references: [
      'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue',
      'https://docs.gitlab.com/ee/ci/pipelines/merge_trains.html',
      'https://zuul-ci.org/docs/zuul/latest/gating.html',
      'https://github.com/bors-ng/bors-ng',
      'https://git-scm.com/docs/gitattributes#_defining_a_custom_merge_driver',
      'https://git-scm.com/docs/git-revert',
      'https://github.blog/2022-12-08-experiment-the-hidden-costs-of-waiting-on-slow-build-times/',
    ],
  },

  // ── 4 ────────────────────────────────────────────────────────────────
  {
    id: 'git-bisect-forensics',
    title: 'Finding the Commit That Broke It — Bisect, Pickaxe, and History Forensics',
    icon: 'search',
    color: '#ef4444',
    questions: 12,
    description: 'A test that passed three weeks ago fails today and 400 commits sit in between. How to find the exact commit in about nine steps with git bisect run, how to handle flaky tests and unbuildable commits, and the pickaxe and blame techniques for when bisect is the wrong tool.',
    introduction: `## Overview
The situation: something worked at some point in the past and is broken now, and the range of suspects is large. Reading 400 commits is not a plan. Binary search is.

**git bisect** performs binary search over commit history. Given one known-good commit and one known-bad commit, it checks out the midpoint and asks you to classify it; each answer halves the remaining range. Over 400 commits that is about nine tests instead of 400 — log2(400) is a little under nine. Over 10,000 commits it is fourteen.

The single most valuable thing to know about it is that **the classification can be a script.** git bisect run turns the whole thing into one non-interactive command that finds the offending commit while you do something else, and that is what separates people who use bisect occasionally from people who reach for it first.

Bisect answers "which commit changed the behaviour". It is the wrong tool for "when did this line get written" or "which commit touched this string", and the second half of this topic covers those.`,
    topics: [
      {
        title: 'git bisect run — the automated form, and the cases that complicate it',
        content: `The manual loop is: start the search, mark the endpoints, and classify each commit Git checks out until it reports the first bad one.

    git bisect start
    git bisect bad                 # current commit is broken
    git bisect good v2.14.0        # this tag was fine
    # Git checks out the midpoint; test it, then:
    git bisect good                # or: git bisect bad
    # ... repeat until Git prints the first bad commit
    git bisect reset               # return to where you started

The automated form replaces every classification with a script's exit status. **Exit 0 means good, exit 1 to 124 means bad, and exit 125 means skip — untestable.** Exit 128 or above aborts the bisect.

    git bisect start HEAD v2.14.0  # bad first, then good
    git bisect run ./scripts/check.sh

The check script is where the skill is. A robust one builds first and returns 125 if the build fails, so commits that cannot be compiled are skipped rather than misclassified as bad:

    #!/usr/bin/env bash
    make build || exit 125          # untestable, not bad
    ./run-one-test --name flaky_repro || exit 1
    exit 0

For a test-suite regression, git bisect run is often just the test command, since most test runners already exit non-zero on failure. Two refinements matter in practice. Narrow the test to the single failing case — bisect will run it up to fourteen times, so a five-minute full suite becomes an hour, while a five-second targeted test finishes before you have made coffee. And make sure the script is not itself part of the bisected history, or you will be running a different version of it at every step; keep it outside the repo or copy it to a temporary path first.

**Complications and their handling:**

- **Flaky tests.** Binary search assumes a reliable oracle. A flaky test will send bisect down the wrong half and confidently report an innocent commit. Fix the flakiness first if you can; otherwise make the script run the test several times and only report bad on consistent failure, which trades runtime for correctness.
- **Untestable commits.** git bisect skip, or exit 125 in a run script. Git will pick a nearby commit instead. If a whole region is unbuildable, Git may end up reporting a range rather than a single commit — that is honest output, not a failure.
- **Merge-heavy history.** By default bisect descends into the individual commits of merged branches, many of which were never independently tested. git bisect --first-parent (Git 2.29+) restricts the search to the mainline, so it identifies the merge — that is, the PR — that introduced the problem. For finding which PR broke main, this is almost always what you want, and it is much faster.
- **Inverted searches.** The good and bad terms can be renamed with git bisect start --term-old=slow --term-new=fast, which makes bisecting a performance regression or a fix read sensibly.
- **Resuming.** git bisect log writes the session out; git bisect replay reads it back. Useful when you realise you misclassified a step — replay the log up to the mistake instead of starting over.`,
      },
      {
        title: 'When bisect is the wrong tool — pickaxe, line log, and blame forensics',
        content: `Bisect finds the commit that changed a **behaviour**. Different questions want different tools.

**"Which commit added or removed this string?"** — the pickaxe. git log -S'<string>' finds commits where the *number of occurrences* of the string changed, which is the precise question you want when hunting where a config key, a feature flag or a magic constant came from. Its relative git log -G'<regex>' matches commits whose diff text matches a pattern, including moves that -S would consider a no-op. Add --pickaxe-all to show the whole commit rather than only the matching file.

    git log -S'MAX_RETRY_COUNT' --oneline -- src/

**"How did this function evolve?"** — line log. git log -L follows a range of lines through history, including across renames, and prints the diff at each change:

    git log -L :parseConfig:src/config.go       # follow a function by name
    git log -L 40,60:src/config.go              # follow a line range

This is often faster than bisect for a small, localised regression, because it shows you the actual sequence of edits to the code in question.

**"Who last touched this line, and why?"** — blame, with two essential refinements. Large reformat commits (a Prettier or gofmt sweep) destroy blame by attributing every line to the reformatter. The fix is to record those commits in a file and teach Git to look past them:

    git blame --ignore-rev <sha> src/app.js
    # or permanently:
    echo <sha> >> .git-blame-ignore-revs
    git config blame.ignoreRevsFile .git-blame-ignore-revs

GitHub and GitLab both honour .git-blame-ignore-revs, so the web UI improves too. The second refinement is git blame -C -M, which detects lines that were *moved or copied* from another file and blames the original author rather than the person who moved the code.

**"The commit exists but I cannot find the branch"** — reflog. git reflog records every movement of HEAD locally, including commits orphaned by a reset, rebase or amend, and it is how you recover work that appears lost. It is local and expires (90 days by default for reachable entries, 30 for unreachable), so it rescues your own mistakes, not a colleague's. For objects with no reflog entry at all, git fsck --lost-found lists dangling commits.

**Putting it together — a realistic workflow.** A test that passed in the last release fails today. Start with git bisect --first-parent and a run script narrowed to that one test, to find the offending PR in a handful of runs. Then, inside that PR's diff, use git log -L or -S to identify the specific hunk. Then git blame -C on that hunk to find the author and the original context. Bisect narrows to the change; the pickaxe and blame explain it.

One preventative note: all of this depends on history being useful. Squashing every PR into a single commit makes bisect coarse but keeps main clean, which is a reasonable trade. Rewriting or dropping history is not — and shallow clones (--depth=1) in CI break bisect and blame entirely, which is why partial clone (--filter=blob:none) is the better CI optimisation when history matters.`,
      },
    ],
    quickFire: [
      { q: 'How many steps does bisect need over 400 commits?', a: 'About nine — log2(400) is just under nine. Over 10,000 commits it is fourteen. That is the whole argument for using it rather than reading the log.' },
      { q: 'What are the exit codes for git bisect run?', a: '0 means good, 1 to 124 means bad, 125 means skip (untestable — for example the commit does not build), and 128 or above aborts the bisect. Returning 125 on build failure is what stops unbuildable commits being misclassified as bad.' },
      { q: 'Write a bisect run script for a regression.', a: 'A build guard then a narrow test: "make build || exit 125" to skip untestable commits, then the single failing test, exiting 1 on failure and 0 on success. Narrow the test to one case — bisect may run it fourteen times, so a five-minute suite becomes an hour.' },
      { q: 'Why must the bisect script live outside the repository?', a: 'Because bisect checks out historical commits, so a script inside the repo changes underneath you at every step and you end up testing with different versions of your own oracle. Keep it outside, or copy it to a temporary path first.' },
      { q: 'What does a flaky test do to bisect?', a: 'It breaks the assumption of a reliable oracle. One wrong answer sends the search down the wrong half and bisect will confidently name an innocent commit. Fix the flake, or have the script run the test several times and report bad only on consistent failure.' },
      { q: 'What is git bisect --first-parent for?', a: 'Restricting the search to mainline commits so it identifies the merge — that is, the PR — that introduced the problem, rather than descending into individual branch commits that were never independently tested. For "which PR broke main" it is almost always what you want, and it is much faster.' },
      { q: 'How do you bisect something that is not a pass/fail bug?', a: 'Rename the terms: git bisect start --term-old=slow --term-new=fast. That makes bisecting a performance regression, or finding where a bug was fixed rather than introduced, read correctly.' },
      { q: 'You misclassified a step halfway through a long bisect. What now?', a: 'git bisect log writes the session out and git bisect replay reads it back — edit the log to remove the bad classification and replay, rather than starting over.' },
      { q: 'Which commit introduced this string?', a: 'The pickaxe: git log -S\'STRING\' finds commits where the number of occurrences changed. git log -G\'regex\' matches diff text instead, catching moves that -S treats as a no-op. Add --pickaxe-all to see the whole commit.' },
      { q: 'How do you follow one function through history?', a: 'git log -L :funcName:path/file.go, or a line range with git log -L 40,60:path/file.go. It follows across renames and prints the diff at each change, which is often faster than bisect for a small localised regression.' },
      { q: 'A formatting sweep destroyed git blame. Fix it.', a: 'Record the sweep commits in .git-blame-ignore-revs and set blame.ignoreRevsFile to it, or pass --ignore-rev for a one-off. GitHub and GitLab both honour that file, so the web UI improves too. Also use git blame -C -M so moved or copied lines blame the original author.' },
      { q: 'Why is a shallow clone a bad CI optimisation?', a: 'Because --depth=1 breaks bisect and blame outright — the history they need is not there. Use partial clone, --filter=blob:none, which keeps the full commit graph and fetches blobs on demand.' },
    ],
    references: [
      'https://git-scm.com/docs/git-bisect',
      'https://git-scm.com/docs/git-log#Documentation/git-log.txt--Sltstringgt',
      'https://git-scm.com/docs/git-log#Documentation/git-log.txt--Lltstartgtltendgtltfilegt',
      'https://git-scm.com/docs/git-blame#Documentation/git-blame.txt---ignore-revltrevgt',
      'https://git-scm.com/docs/git-reflog',
      'https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files#ignore-commits-in-the-blame-view',
      'https://git-scm.com/docs/partial-clone',
    ],
  },

  // ── 5 ────────────────────────────────────────────────────────────────
  {
    id: 'git-history-rewriting',
    title: 'Rewriting History Safely — Interactive Rebase, Force-Push, and Purging Secrets',
    icon: 'edit',
    color: '#f59e0b',
    questions: 10,
    description: 'Interactive rebase, autosquash and fixup commits, the difference between reset modes, why --force-with-lease is not optional, and the full procedure for removing a leaked credential from history — including the part everyone forgets.',
    introduction: `## Overview
Git history is append-only in the sense that commits are immutable — a commit's hash is a checksum over its content, its metadata and its parent, so changing anything produces a *different commit*. Rewriting history therefore never edits a commit; it creates new ones and moves a branch pointer to them, leaving the originals unreferenced.

That has two consequences that explain almost every rewriting rule. First, rewriting is safe locally, because the old commits linger in the reflog and can be recovered. Second, it is dangerous once shared, because everyone else's branch still points at commits your branch has abandoned, and their next merge will try to reconcile two versions of the same work.

The **golden rule** follows directly: rewrite freely any history that exists only on your machine; never rewrite history that others have based work on. Everything below is an application of that rule.`,
    topics: [
      {
        title: 'Interactive rebase, autosquash, and the three resets',
        content: `**Interactive rebase** replays a range of commits, letting you reorder, edit, combine or drop them. git rebase -i HEAD~5 opens a todo list where each line names an action:

- **pick** — keep the commit as is.
- **reword** — keep the change, edit the message.
- **edit** — stop at this commit so you can amend it or split it.
- **squash** — combine into the previous commit, opening an editor to merge the messages.
- **fixup** — the same, but discard this commit's message.
- **drop** — remove the commit entirely.
- **exec** — run a shell command at this point, which is useful for running tests at each step: git rebase -i --exec 'make test' HEAD~10 verifies that every commit in the range builds.

**Autosquash** is the ergonomic version and is underused. When you notice a problem in an earlier commit, commit the fix with git commit --fixup=<sha> (or --squash=<sha>). That creates a commit whose message marks it as belonging to the target. Then git rebase -i --autosquash HEAD~N pre-arranges the todo list so each fixup sits directly under its target with the right action already set. Set rebase.autoSquash=true to make it the default. This turns "clean up my branch before review" from careful manual reordering into two commands.

**Splitting a commit** is the one operation people find fiddly: mark it edit, and when the rebase stops, run git reset HEAD~ to unstage its changes while keeping them in the working tree, then commit them in pieces (git add -p is the tool for selecting hunks), and finish with git rebase --continue.

**The three resets** are worth being able to state exactly, because it is a standard interview question:

| Mode | Moves HEAD | Resets index | Resets working tree |
| --- | --- | --- | --- |
| --soft | yes | no | no |
| --mixed (default) | yes | yes | no |
| --hard | yes | yes | yes |

So --soft leaves everything staged (useful for recombining several commits into one), --mixed leaves changes present but unstaged, and --hard discards them. Only --hard loses work — and even then, committed work is recoverable from the reflog.

Related and often confused: **git revert** creates a *new* commit that undoes an earlier one, which is the correct tool for shared history because it rewrites nothing. **git restore** (Git 2.23+) discards working-tree or index changes, and **git switch** changes branches — these two exist specifically to split the overloaded git checkout into comprehensible halves.

**Force-pushing.** After any rewrite, the remote must be updated with force. Use --force-with-lease, which refuses the push if the remote moved since your last fetch. Plain --force will silently discard a colleague's commit, or a suggestion someone committed from the review UI. Note one sharp edge: --force-with-lease compares against your remote-tracking ref, so running git fetch immediately before the push updates that ref and defeats the protection. The stricter form --force-with-lease=<ref>:<expected-sha> states explicitly what you expect the remote to be, and --force-if-includes (Git 2.30+) adds a check that your local branch actually incorporates what the remote had.`,
      },
      {
        title: 'Purging a secret from history — the whole procedure',
        content: `A credential is committed and pushed. Rewriting history to remove it is necessary but **it is the second step, not the first**, and the ordering is what most answers get wrong.

**1. Rotate the credential immediately.** Assume it is compromised the moment it reaches a remote. Public repositories are scraped continuously — measured exposure times for keys pushed to public GitHub are seconds to minutes, not hours. Rewriting history without rotating is theatre: forks, clones, CI caches, and GitHub's own unreferenced-commit views may still hold it, and anyone who already fetched has it regardless.

**2. Rewrite the history.** The maintained tool is **git-filter-repo**, which replaced the built-in git filter-branch — filter-branch is officially discouraged for being slow and full of foot-guns, and Git's own documentation now points at filter-repo instead. For a file:

    git filter-repo --path path/to/secrets.env --invert-paths

For a string, replacing every occurrence throughout history:

    echo 'AKIAIOSFODNN7EXAMPLE==>REDACTED' > replacements.txt
    git filter-repo --replace-text replacements.txt

**BFG Repo-Cleaner** is a faster alternative for the common cases of deleting files or replacing text. Note that filter-repo deliberately removes the origin remote after rewriting, to force you to think before pushing.

**3. Force-push all rewritten refs**, including every branch and tag: git push --force --all and git push --force --tags. Every rewritten ref matters; a secret left on one stale release tag is still leaked.

**4. Deal with the copies you do not control.** Every collaborator must re-clone or hard-reset — a normal pull will merge the old history back in and reintroduce the secret. Forks are separate repositories and keep their own copy; on GitHub, contacting support to garbage-collect unreferenced commits is required because old commits stay reachable by SHA through the web UI even after a force-push. Also purge CI caches, build artefacts, container images and log output that may embed the value.

**5. Prevent recurrence.** Push protection and secret scanning at the forge (GitHub secret scanning with push protection, GitLab secret detection), a pre-commit hook using gitleaks or trufflehog, and a .gitignore that covers the file patterns that carry credentials. Prevention is dramatically cheaper than this procedure.

One related technique worth knowing: **git replace** can graft a modified commit over an existing one without rewriting, which lets you present a different history locally while leaving the real objects intact. It is a niche tool, but it is the honest answer to "can you change history without rewriting it".`,
      },
    ],
    quickFire: [
      { q: 'Why does rewriting history change commit hashes?', a: 'Because a hash is a checksum over the commit\'s content, metadata and parent. Change any of those and you get a different commit. Rewriting never edits a commit — it creates new ones and moves the branch pointer, orphaning the originals.' },
      { q: 'State the golden rule of rewriting.', a: 'Rewrite freely any history that exists only on your machine; never rewrite history others have based work on. It follows from the hash property: their branches still point at the commits yours abandoned.' },
      { q: 'What is autosquash and why should it be on by default?', a: 'Commit fixes with git commit --fixup=<sha>, then git rebase -i --autosquash pre-arranges the todo list so each fixup sits under its target with the right action set. Set rebase.autoSquash=true. It turns branch clean-up from manual reordering into two commands.' },
      { q: 'Difference between soft, mixed and hard reset?', a: 'All three move HEAD. --soft stops there, leaving everything staged. --mixed (the default) also resets the index, so changes are present but unstaged. --hard also resets the working tree, discarding changes. Only --hard loses work, and committed work is still recoverable from the reflog.' },
      { q: 'How do you split one commit into two?', a: 'Mark it edit in an interactive rebase; when it stops, git reset HEAD~ to unstage the changes while keeping them in the working tree, commit them in pieces using git add -p to select hunks, then git rebase --continue.' },
      { q: 'How do you run tests on every commit in a range?', a: 'git rebase -i --exec \'make test\' HEAD~10 — the exec action runs after each commit is applied, so you find which commit in the range stopped building.' },
      { q: 'Why is --force-with-lease not always enough?', a: 'It compares against your remote-tracking ref, so a git fetch immediately before pushing updates that ref and defeats the check. Use --force-with-lease=<ref>:<expected-sha> to state what you expect explicitly, or --force-if-includes (2.30+) to assert your branch incorporates what the remote had.' },
      { q: 'A secret was pushed. What is the first step?', a: 'Rotate the credential. Assume compromise the moment it reaches a remote — public repos are scraped in seconds. Rewriting first is theatre: forks, clones, CI caches and unreferenced-commit views may still hold it, and anyone who already fetched has it anyway.' },
      { q: 'Which tool removes a secret from history, and why not filter-branch?', a: 'git-filter-repo — with --path --invert-paths for a file, or --replace-text for a string. filter-branch is officially discouraged as slow and full of foot-guns, and Git\'s own docs now point at filter-repo. BFG Repo-Cleaner is a faster alternative for the simple cases.' },
      { q: 'After rewriting to remove a secret, what do people forget?', a: 'Force-pushing all branches AND tags; telling collaborators to re-clone or hard-reset rather than pull, since a pull merges the old history back; forks, which are separate repositories with their own copy; asking the forge to garbage-collect unreferenced commits, because old commits stay reachable by SHA in the web UI; and purging CI caches, images and logs that embed the value.' },
    ],
    references: [
      'https://git-scm.com/docs/git-rebase',
      'https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---fixupamendrewordltcommitgt',
      'https://git-scm.com/docs/git-reset',
      'https://github.com/newren/git-filter-repo',
      'https://rtyley.github.io/bfg-repo-cleaner/',
      'https://docs.github.com/en/code-security/secret-scanning/push-protection-for-repositories-and-organizations',
      'https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-if-includes',
    ],
  },

  // ── 6 ────────────────────────────────────────────────────────────────
  {
    id: 'git-monorepo-scale',
    title: 'Git at Repository Scale — Partial Clone, Sparse Checkout, and Monorepo Mechanics',
    icon: 'database',
    color: '#14b8a6',
    questions: 10,
    description: 'Why a large repository gets slow, and the mechanisms that fix it: partial clone versus shallow clone, sparse checkout and sparse index, commit-graph and FSMonitor, LFS, and the submodule versus subtree versus monorepo decision.',
    introduction: `## Overview
Git was designed for the Linux kernel — large history, moderate file count, text. Repositories that break it usually break it in one of three distinct ways, and the fixes are different, so the first job is identifying which one you have.

**Too much history.** Millions of commits make graph traversal — log, blame, and the revision walking behind almost everything — slow.

**Too many files.** A working tree with hundreds of thousands of paths makes git status slow, because it must stat every one of them.

**Too much content.** Large binaries make clone and fetch slow, and because every version is stored forever, one 200 MB asset committed fifty times is 10 GB in every clone, permanently.

The modern answers are all forms of *not downloading or materialising what you do not need*, and they compose: partial clone for content, sparse checkout for files, commit-graph for history.`,
    topics: [
      {
        title: 'Partial clone, sparse checkout, and making status fast',
        content: `**Partial clone** omits object content at clone time and fetches it on demand:

    git clone --filter=blob:none <url>      # skip all file contents
    git clone --filter=tree:0 <url>         # skip trees too — most aggressive

With blob:none you get the full commit graph and all history metadata, but a file's content is downloaded only when something actually needs it. Crucially, log, bisect and blame all still work; they simply fetch as they go.

**This is the key distinction against shallow clone.** git clone --depth=1 truncates history itself, which makes clones small but breaks bisect, blame and any merge-base computation — and it makes later deepening expensive. For CI where you only ever build the current commit, --depth=1 is fine. For anything that inspects history, --filter=blob:none is the correct optimisation, and it is what tools like the GitHub CLI and most modern CI templates now default to.

**Sparse checkout** limits which paths are materialised in the working tree:

    git sparse-checkout init --cone
    git sparse-checkout set services/payments libs/common

Cone mode restricts patterns to whole directories, which is less expressive than the original pattern mode but allows a much faster implementation. Combined with a partial clone, a developer on a 20 GB monorepo gets a working tree containing only their service.

The **sparse index** (Git 2.32+, enabled with index.sparse=true) extends this to the index itself: directories outside the sparse cone are stored as a single entry rather than one per file, which is what makes git status fast on a repository with a million paths. Without it, sparse checkout shrinks the working tree but the index still carries every path.

**Speeding up traversal and status:**

- **commit-graph** — a precomputed file of commit metadata and generation numbers that avoids walking objects for every traversal. git commit-graph write --reachable, or set fetch.writeCommitGraph=true. On a large repo this is often an order of magnitude on git log operations.
- **FSMonitor** — core.fsmonitor=true uses the OS file-watching service so git status does not have to stat the entire tree. With untrackedCache it is the difference between seconds and milliseconds on a large checkout.
- **Maintenance** — git maintenance start registers background jobs for incremental repack, commit-graph refresh and prefetch, which keeps the repository fast without manual gc.
- **Scalar** — ships with Git and applies all of the above as a preset: scalar clone <url> gives you partial clone, sparse checkout, FSMonitor, commit-graph and background maintenance in one command. It is the descendant of Microsoft's VFS for Git work on the Windows repository.

**Large binaries.** Git LFS replaces the file in history with a small pointer and stores content in a separate service, so clones no longer carry every version of every asset. Two caveats: LFS is a separate service with its own auth and quotas, and it does not retroactively fix history — a repository already fat with binaries needs filter-repo to excise them before LFS helps.`,
      },
      {
        title: 'Monorepo, submodules, or subtree — and what each actually costs',
        content: `**Submodules** pin one repository inside another at a specific commit. The parent records a gitlink — a pointer to an exact SHA in the child — so the composition is precisely reproducible, which is their genuine strength for vendored dependencies and for firmware or OS images that must pin an exact source revision.

Their costs are equally real and are what make them unpopular. Clones need --recurse-submodules or the directories are empty. A submodule sits in detached HEAD by default, so work committed inside it is easy to lose. Updating means committing in the child, then committing the new pointer in the parent — two commits, two reviews, and an easy state to get wrong. And branch switching in the parent does not automatically move submodules unless submodule.recurse=true is set. Set that, and set status.submoduleSummary=true so the parent's status tells you when a submodule has moved.

**Subtree** copies another project's content into a subdirectory of your repository, optionally preserving its history. There is nothing extra to clone and no special commands for consumers, which is its appeal. The cost is that merging upstream changes back and forth is manual and history becomes intertwined, so it suits vendoring something you rarely update rather than an actively co-developed dependency.

**Monorepo** puts everything in one repository. What you buy is atomic cross-project changes — one commit updates the API and every caller, so the repository is never internally inconsistent — plus one version of every dependency, trivially discoverable code, and a single CI configuration. Google, Meta and Microsoft all made this trade deliberately.

What you pay is tooling. A monorepo demands, at minimum: **build-graph-aware CI** so a change to one service does not rebuild everything (Bazel, Buck, Pants, Nx, Turborepo), **CODEOWNERS** for review routing, and the scale mechanisms from the previous chapter. Without the first of those, CI time grows with the size of the repository rather than the size of the change, and that is the failure mode that makes people conclude monorepos do not work.

**Choosing.** The question is not repository layout, it is **how often changes cross the boundary**. If a typical change touches two components together, a boundary between them will be paid for on every change, in coordination and in version skew — that argues for one repository. If components genuinely release independently, on different cadences, to different consumers, separate repositories with real versioned interfaces are simpler and the boundary is doing useful work.

Two things not to do. Do not adopt a monorepo without the build tooling, because the CI cost arrives immediately and the benefits arrive slowly. And do not use submodules as a poor substitute for a package manager — if the dependency has releases and a version number, depend on it as a package.`,
      },
    ],
    quickFire: [
      { q: 'What are the three ways a repository gets slow?', a: 'Too much history (graph traversal — log, blame), too many files (status must stat every path), and too much content (clone and fetch, and every version is kept forever). The fixes differ, so identify which one you have first.' },
      { q: 'Partial clone versus shallow clone?', a: 'Partial clone (--filter=blob:none) omits file content but keeps the full commit graph, so log, bisect and blame still work and fetch on demand. Shallow clone (--depth=1) truncates history itself and breaks bisect, blame and merge-base. Shallow is fine for build-only CI; partial is correct whenever history matters.' },
      { q: 'What is sparse checkout cone mode?', a: 'A restriction of sparse patterns to whole directories, which is less expressive than pattern mode but allows a much faster implementation. git sparse-checkout init --cone then set the directories you need.' },
      { q: 'Why is sparse checkout alone not enough for a million-file repo?', a: 'Because the index still contains every path, so git status stays slow. The sparse index (index.sparse=true, Git 2.32+) stores out-of-cone directories as a single entry each, which is what actually makes status fast.' },
      { q: 'What does commit-graph do?', a: 'Precomputes commit metadata and generation numbers so traversals do not walk objects. git commit-graph write --reachable, or fetch.writeCommitGraph=true. Often an order of magnitude on log operations in a large repository.' },
      { q: 'What is Scalar?', a: 'A preset that ships with Git: scalar clone applies partial clone, sparse checkout, FSMonitor, commit-graph and background maintenance in one command. It descends from Microsoft\'s VFS for Git work on the Windows repository.' },
      { q: 'What does Git LFS fix, and what does it not?', a: 'It replaces large files in history with pointers and stores content in a separate service, so clones stop carrying every version of every asset. It does not fix history retroactively — a repo already fat with binaries needs filter-repo to excise them first — and it introduces a separate service with its own auth and quotas.' },
      { q: 'Submodule versus subtree?', a: 'Submodule pins an exact child commit via a gitlink — precisely reproducible, good for vendored deps and firmware pinning, but needs --recurse-submodules, sits in detached HEAD, and every update is two commits in two repos. Subtree copies content in, so consumers need no special commands, but syncing upstream is manual and histories intertwine. Subtree suits rarely-updated vendoring; submodule suits exact pinning.' },
      { q: 'What settings make submodules survivable?', a: 'submodule.recurse=true so branch switching moves submodules, and status.submoduleSummary=true so the parent\'s status reports when a submodule has moved. Without those, the common failure is committing a stale pointer.' },
      { q: 'How do you decide between monorepo and multi-repo?', a: 'By how often changes cross the boundary. If a typical change touches two components together, the boundary is paid for on every change in coordination and version skew — one repository. If components genuinely release independently on different cadences to different consumers, separate repos with versioned interfaces are simpler. And never adopt a monorepo without build-graph-aware CI, or CI time scales with repository size instead of change size.' },
    ],
    references: [
      'https://git-scm.com/docs/partial-clone',
      'https://git-scm.com/docs/git-sparse-checkout',
      'https://github.blog/2020-12-21-get-up-to-speed-with-partial-clone-and-shallow-clone/',
      'https://devblogs.microsoft.com/devops/introducing-scalar/',
      'https://git-scm.com/docs/git-commit-graph',
      'https://git-lfs.com/',
      'https://git-scm.com/book/en/v2/Git-Tools-Submodules',
    ],
  },

  // ── 7 ────────────────────────────────────────────────────────────────
  {
    id: 'git-internals-objects-refs',
    title: 'Git Internals — Objects, Refs, the Index, and Packfiles',
    icon: 'database',
    color: '#6366f1',
    questions: 11,
    description: 'Git is a content-addressed object store with a thin porcelain over it. Blobs, trees, commits and tags; how refs and the index really work; what a packfile is; and why understanding the DAG turns most Git confusion into arithmetic.',
    introduction: `## Overview
Almost every confusing Git behaviour becomes obvious once you know what is actually stored. There are exactly **four object types**, every object is addressed by the hash of its own content, and refs are just files containing a hash. That is the whole model.

**Blob** — file contents, with no name and no metadata. Two identical files anywhere in history are one blob.
**Tree** — a directory listing: names, modes, and the hash of the blob or tree each name points to.
**Commit** — a root tree hash, zero or more parent commit hashes, author, committer, and a message.
**Tag** — an annotated tag object: a target hash, a tagger, a message, optionally a signature.

Because a commit's hash covers its tree, its parents and its metadata, **the hash is an integrity checksum over all reachable history**. Change anything anywhere in the past and every descendant hash changes. This single fact explains why rewriting history produces new commits, why Git can detect corruption, and why a shared hash is a reliable identifier.

Commits form a directed acyclic graph, not a line. A branch is not a container of commits — it is a pointer to one commit, and the "contents" of a branch are whatever is reachable by walking parents from it.`,
    topics: [
      {
        title: 'The object store, refs, and the index',
        content: `**Inspecting objects.** Every object is stored under .git/objects, either loose (zlib-compressed, path derived from its hash) or inside a packfile. The plumbing commands read them directly:

    git cat-file -t <sha>          # type: blob, tree, commit or tag
    git cat-file -p <sha>          # pretty-print the content
    git rev-parse HEAD             # resolve any revision expression to a sha
    git ls-tree HEAD               # the root tree of the current commit
    git hash-object -w file.txt    # write a blob, print its hash

Running git cat-file -p on a commit is the fastest way to internalise the model: you see a tree line, parent lines, author, committer and message — and nothing else. There is no diff stored. **Git stores snapshots, not deltas**; diffs are computed on demand, and delta compression happens later at the packfile level as a storage optimisation, not as the data model.

**Refs** are files under .git/refs whose content is a hash — .git/refs/heads/main holds the commit that main points to. Creating a branch writes a 41-byte file, which is why branching is instantaneous. HEAD is usually a *symbolic* ref, containing "ref: refs/heads/main"; when it contains a raw hash instead you are in **detached HEAD**, which is not an error state, just HEAD pointing directly at a commit rather than through a branch. Commits made there are unreferenced once you leave, which is why they seem to vanish. Packed refs (.git/packed-refs) is an optimisation that stores many refs in one file.

**The index** (.git/index, also called the staging area) is a binary file listing every tracked path with its blob hash, mode and stat data. It is neither the working tree nor the last commit, which is exactly what makes three-way comparisons meaningful: git diff compares working tree to index, git diff --cached compares index to HEAD, and git diff HEAD compares working tree to HEAD. The cached stat data is what lets git status avoid re-hashing unchanged files, and it is why a stat-only change can make Git briefly think a file is modified.

**Packfiles.** Loose objects are inefficient at scale, so git gc packs them into a .pack with an .idx index, applying delta compression between similar objects. This is a *storage* representation only — logically the objects are still full snapshots. git count-objects -vH reports loose versus packed, and git verify-pack -v inspects one.

**Reachability and garbage.** An object is alive if it is reachable from any ref, the index, or the reflog. Anything else is garbage and will eventually be pruned by gc. This is precisely why the reflog is a safety net: it holds references to commits that no branch points at any more.`,
      },
      {
        title: 'Revision syntax, and reading the DAG fluently',
        content: `Most Git commands take revisions, and the syntax is more expressive than people use.

**Single commits.** HEAD~3 walks back three *first parents*. HEAD^2 selects the *second parent* of a merge — so on a merge commit, ^1 is the branch you merged into and ^2 is the branch you merged in. HEAD@{2} is the reflog entry, and HEAD@{yesterday} works too. main@{u} (or @{push}) is the upstream of main.

**Ranges.** This is where confusion usually lives:

| Expression | Meaning |
| --- | --- |
| A..B | commits reachable from B but not A — "what is on B that is not on A" |
| A...B | symmetric difference — on either, but not both |
| B --not A | the same as A..B, in a form that extends to many refs |
| A..B --left-right | with ...B, marks which side each commit came from |

git log main..feature is the canonical "what does my branch add", and git log feature..main is "what has main gained that I do not have". Getting these the right way round is most of practical range usage.

**Merge bases.** git merge-base A B is the common ancestor from which a three-way merge is computed. git merge-base --is-ancestor A B answers containment questions in scripts, and git merge-base --fork-point handles the case where the upstream has itself been rebased.

**Useful graph reading:**

    git log --oneline --graph --decorate --all      # the whole DAG
    git log --first-parent --oneline                # mainline only: one entry per PR
    git log --merges / --no-merges                  # only merges / only real work
    git branch --contains <sha>                     # which branches include this commit
    git tag --contains <sha>                        # which releases include this fix
    git cherry -v main feature                       # commits not yet upstream, by patch-id

That last pair answers the question that comes up during incident review — "is the fix in the release?" — without reading any history at all.

**Why this matters practically.** Once the DAG is concrete, the operations stop being magic. Rebase is: compute the commits in upstream..mine, replay each as a new commit on the new base. Merge is: find the merge base, three-way merge the two trees, write a commit with two parents. Cherry-pick is: compute one commit's diff against its parent, apply it here, write a new commit. Reset is: move a ref, and optionally the index and working tree. **Each is a small operation on hashes and pointers, and the "confusing" behaviour is nearly always the DAG being exactly what you told it to be.**`,
      },
    ],
    quickFire: [
      { q: 'What are the four Git object types?', a: 'Blob (file content, no name), tree (directory listing of names, modes and hashes), commit (root tree, parents, author, committer, message) and annotated tag (target, tagger, message, optional signature). Everything else in Git is built on those.' },
      { q: 'Does Git store diffs?', a: 'No — it stores full snapshots. Each commit points at a complete tree, and diffs are computed on demand. Delta compression exists inside packfiles as a storage optimisation, not as the data model.' },
      { q: 'What is a branch, physically?', a: 'A file under .git/refs/heads containing one 40-character hash. That is why branching is instantaneous. The "contents" of a branch is whatever is reachable by walking parents from that commit.' },
      { q: 'What is detached HEAD?', a: 'HEAD containing a raw commit hash instead of a symbolic "ref: refs/heads/...". It is not an error, just HEAD pointing at a commit rather than through a branch — but commits made there are unreferenced once you leave, which is why they appear to vanish (and why the reflog recovers them).' },
      { q: 'What exactly is the index?', a: 'A binary file listing every tracked path with its blob hash, mode and cached stat data. It sits between the working tree and HEAD, which is what makes git diff (tree vs index), git diff --cached (index vs HEAD) and git diff HEAD (tree vs HEAD) three distinct questions.' },
      { q: 'Why does the hash cover the whole history?', a: 'A commit hash is a checksum over its tree, its parents and its metadata — and the parents\' hashes cover theirs. So any change anywhere in the past changes every descendant hash. That is the integrity guarantee, and the reason rewriting history produces new commits.' },
      { q: 'What makes an object garbage?', a: 'Being unreachable from any ref, the index or the reflog. gc prunes those. It is exactly why the reflog is a safety net — it keeps references to commits no branch points at any more.' },
      { q: 'What does HEAD^2 mean?', a: 'The second parent. On a merge commit, ^1 is the branch you merged into and ^2 is the branch you merged in — which is why git revert -m 1 keeps the mainline. Contrast HEAD~2, which walks back two first-parents.' },
      { q: 'Difference between A..B and A...B?', a: 'A..B is commits reachable from B but not A — "what does B add". A...B is the symmetric difference, on either but not both. git log main..feature is what your branch adds; git log feature..main is what you are missing.' },
      { q: 'Is this fix in the release?', a: 'git tag --contains <sha> lists the tags that include it, and git branch --contains <sha> the branches. git cherry -v main feature compares by patch-id, so it still works when the commit was cherry-picked and has a different hash.' },
      { q: 'Explain rebase in terms of the object model.', a: 'Compute the commits in upstream..mine, then replay each one as a new commit on the new base — new parents, therefore new hashes, therefore the originals become unreferenced. Merge, by contrast, finds the merge base, three-way merges the trees and writes one commit with two parents, leaving both histories intact.' },
    ],
    references: [
      'https://git-scm.com/book/en/v2/Git-Internals-Git-Objects',
      'https://git-scm.com/book/en/v2/Git-Internals-Git-References',
      'https://git-scm.com/docs/gitrevisions',
      'https://git-scm.com/docs/git-cat-file',
      'https://git-scm.com/docs/git-merge-base',
      'https://git-scm.com/book/en/v2/Git-Internals-Packfiles',
      'https://www.atlassian.com/git/tutorials/what-is-git',
      'https://kodekloud.com/blog/git-interview-questions/',
    ],
  },

  // ── 8 ────────────────────────────────────────────────────────────────
  {
    id: 'git-merge-conflicts-strategies',
    title: 'Merge Strategies and Resolving Conflicts Properly',
    icon: 'gitMerge',
    color: '#dc2626',
    questions: 11,
    description: 'The ort strategy, why diff3 and zdiff3 conflict styles make resolution dramatically easier, strategy options like ours and theirs (and how they invert during a rebase), custom merge drivers, and how to verify a resolution was actually correct.',
    introduction: `## Overview
A conflict is not a failure — it is Git declining to guess. A three-way merge compares each side against the **merge base**, the common ancestor. Where only one side changed a region, that change is taken automatically. Where both sides changed the same region differently, Git cannot know which was intended, so it writes a conflict.

That framing has a direct practical consequence: **the merge base is the missing information in most difficult resolutions.** The default conflict presentation hides it, which is why so many resolutions are guesswork, and why the single most valuable configuration change in this whole topic is turning it back on.

Since Git 2.34 the default strategy is **ort** ("ostensibly recursive's twin"), a rewrite of the old recursive strategy. It is faster, handles renames far better, and fixes a number of correctness bugs — notably around directory renames and merges involving submodules.`,
    topics: [
      {
        title: 'Strategies, conflict styles, and strategy options',
        content: `**Strategies.**

- **ort** — the default since 2.34, for two-head merges. Detects renames, handles directory renames, and is substantially faster on large trees. It replaced **recursive**, which is still selectable but has no reason to be used.
- **ours** — a *strategy*, distinct from the -X option below: it produces a merge commit whose tree is entirely the current branch, discarding the other side's changes while recording the merge relationship. Its legitimate use is marking a branch as merged (so it will not be offered again) without taking its content.
- **octopus** — merges more than two heads at once, the default when you name several branches. It refuses to run if there are any conflicts, so it is only for combining topic branches that are known to be independent.
- **subtree** — a variant of ort for merging a project into a subdirectory.

**Conflict styles — the highest-leverage setting.** The default "merge" style shows only the two sides:

    <<<<<<< HEAD
    timeout = 30
    =======
    timeout = 60
    >>>>>>> feature

You cannot tell who changed what. If the base was 30, the other side raised it and you should probably take 60. If the base was 60, *you* lowered it and taking 60 reverts your change. **The two cases look identical.** The diff3 style adds the base:

    git config --global merge.conflictStyle zdiff3

    <<<<<<< HEAD
    timeout = 30
    ||||||| base
    timeout = 15
    =======
    timeout = 60
    >>>>>>> feature

Now it is clear that both sides raised it from 15, and the resolution is a judgement about which value is wanted rather than a guess about intent. **zdiff3** (Git 2.35+) is diff3 with common lines hoisted out of the conflict region, producing noticeably smaller conflicts. Use zdiff3; there is essentially no reason to prefer plain diff3, and none at all to keep the default.

**Strategy options (-X).** These resolve *only the conflicting hunks* automatically, keeping every non-conflicting change from both sides — quite different from the ours *strategy*, which discards a whole side.

    git merge -X ours feature      # on conflict, prefer current branch's hunk
    git merge -X theirs feature    # on conflict, prefer incoming hunk

The trap that catches everyone: **during a rebase, "ours" and "theirs" are inverted.** A rebase replays your commits onto the upstream, so at each step the upstream is the thing being merged *into* (ours) and your commit is what is being applied (theirs). During git rebase, -X theirs means "prefer my commit's version". Same words, opposite meaning, and it is a common interview question precisely because it is so easy to get backwards.

Other useful options: -X ignore-all-space for conflicts caused purely by whitespace, and -X renormalize when line-ending normalisation is generating spurious conflicts.

**Custom merge drivers.** For file formats where a textual merge is meaningless, define a driver in .gitattributes:

    # .gitattributes
    CHANGELOG.md      merge=union
    *.generated.go    merge=ours
    package-lock.json merge=npm-lockfile

The built-in **union** driver concatenates both sides without conflict markers, which is right for append-only files such as changelogs. A custom driver is any program taking the base, ours and theirs files; the ecosystem provides them for lockfiles, Jupyter notebooks (nbdime) and similar formats. This is the correct fix for "this file conflicts on every single PR".

**binary** in .gitattributes stops Git attempting a textual merge on images and archives at all.`,
      },
      {
        title: 'Working through a conflict, and proving the resolution is right',
        content: `**Orientation first.** git status names the conflicted paths and the operation in progress. git diff during a conflict shows a combined diff against both parents. And git log --merge lists only the commits that touched the conflicted files on either side since the merge base — usually the fastest way to understand *why* both sides changed.

    git log --merge -p <conflicted-file>

**Taking one side wholesale** for a specific file:

    git checkout --ours  path/file      # current branch's version
    git checkout --theirs path/file     # incoming version
    git restore --source=MERGE_HEAD --  path/file    # modern equivalent

**Seeing all three versions** — this is the technique that resolves genuinely hard conflicts. The index holds every stage during a conflict: 1 is the base, 2 is ours, 3 is theirs.

    git show :1:path/file > /tmp/base
    git show :2:path/file > /tmp/ours
    git show :3:path/file > /tmp/theirs

**git mergetool** launches a configured three-way tool; merge.tool set to vimdiff, meld, kdiff3 or your IDE. Set mergetool.keepBackup=false unless you want .orig files everywhere.

**Bailing out.** git merge --abort, git rebase --abort and git cherry-pick --abort all restore the pre-operation state. ORIG_HEAD also records where you were, so git reset --hard ORIG_HEAD recovers from a merge already completed in error. There is no situation where you have to push through a bad merge.

**Not repeating yourself.** rerere.enabled=true records each resolution and replays it automatically when the same conflict recurs — essential when rebasing a long branch repeatedly or restacking PRs, where the identical conflict appears at every attempt. git rerere diff shows what it will apply; git rerere forget <path> discards a recorded resolution you got wrong, which matters because a wrong resolution will otherwise be replayed silently forever.

**Verifying the resolution.** This is the step that is almost always skipped, and it is where semantic conflicts survive. A resolution can be textually plausible and still wrong.

- **Compile and test after resolving, before committing.** A merge that compiles is not a merge that is correct, but one that does not compile is definitely wrong.
- **Read the merge as a diff against each parent.** git show <merge> --remerge-diff (Git 2.36+) shows exactly what the *human* changed relative to what an automatic merge would have produced. That is the highest-value review artefact for a hairy merge, because it isolates your resolution from the mechanical part.
- **Look for lost changes.** git diff <merge-base>..<merge-result> should contain both sides' intent; a change that has quietly disappeared is the classic bad-resolution signature.
- **Never resolve a conflict you do not understand by picking a side.** Ask the author of the other change. Semantic conflicts merge cleanly and break at runtime; the ones that produce markers are the easy ones.`,
      },
    ],
    quickFire: [
      { q: 'What causes a conflict?', a: 'A three-way merge compares both sides against the merge base. Where only one side changed a region, that change is taken. Where both changed the same region differently, Git declines to guess and writes a conflict. Conflicts are Git refusing to invent intent.' },
      { q: 'What is the ort strategy?', a: 'The default two-head merge strategy since Git 2.34 — a rewrite of recursive that is faster, much better at renames including directory renames, and fixes correctness bugs. recursive is still selectable but has no reason to be used.' },
      { q: 'What is the single most valuable merge config change?', a: 'merge.conflictStyle=zdiff3. The default style hides the merge base, so you cannot tell whether the other side raised a value or you lowered it — the two cases look identical. diff3 shows the base; zdiff3 (2.35+) also hoists common lines out, giving smaller conflicts.' },
      { q: 'Difference between the ours strategy and -X ours?', a: 'The ours *strategy* discards the other side entirely, producing a merge commit whose tree is your branch — used to mark a branch merged without taking its content. -X ours is a strategy *option* that only decides conflicting hunks, keeping every non-conflicting change from both sides.' },
      { q: 'Why are ours and theirs inverted during a rebase?', a: 'Rebase replays your commits onto the upstream, so at each step the upstream is what is being merged into (ours) and your commit is what is being applied (theirs). During a rebase, -X theirs means "prefer my commit". Same words, opposite meaning.' },
      { q: 'A lockfile conflicts on every PR. Fix it.', a: 'A custom merge driver in .gitattributes. The built-in union driver suits append-only files like changelogs; lockfiles and notebooks have purpose-built drivers (nbdime for Jupyter). Better still, stop committing the artefact if CI can regenerate it deterministically.' },
      { q: 'How do you see all three versions of a conflicted file?', a: 'The index holds them as stages: git show :1:file is the base, :2: is ours, :3: is theirs. Dumping all three is the technique for genuinely hard conflicts, because it lets you diff base against each side separately.' },
      { q: 'What does git log --merge do?', a: 'Lists only the commits that touched the conflicted files on either side since the merge base — usually the fastest way to learn why both sides changed. Add -p to read the actual changes.' },
      { q: 'What is --remerge-diff?', a: 'Git 2.36+: git show <merge> --remerge-diff shows what the human changed relative to what an automatic merge would have produced, isolating the resolution from the mechanical part. It is the highest-value review artefact for a difficult merge.' },
      { q: 'How do you undo a merge you already committed?', a: 'git reset --hard ORIG_HEAD, which Git set to your pre-merge position. Before committing, git merge --abort. There is no situation where you must push through a bad merge.' },
      { q: 'What is the danger of rerere?', a: 'It replays recorded resolutions silently — including a wrong one, forever. git rerere diff shows what it will apply and git rerere forget <path> discards a recorded resolution. Enable it, but know how to clear a bad entry.' },
    ],
    references: [
      'https://git-scm.com/docs/merge-strategies',
      'https://git-scm.com/docs/git-merge#_how_conflicts_are_presented',
      'https://github.blog/2022-04-18-highlights-from-git-2-36/',
      'https://git-scm.com/docs/gitattributes#_defining_a_custom_merge_driver',
      'https://git-scm.com/docs/git-rerere',
      'https://git-scm.com/docs/git-mergetool',
      'https://www.atlassian.com/git/tutorials/using-branches/merge-conflicts',
    ],
  },

  // ── 9 ────────────────────────────────────────────────────────────────
  {
    id: 'git-recovery-and-reflog',
    title: 'Recovering Lost Work — Reflog, Dangling Objects, and Undoing Anything',
    icon: 'refreshCw',
    color: '#22c55e',
    questions: 11,
    description: 'Almost nothing committed to Git is ever really lost. The reflog, ORIG_HEAD, fsck and dangling objects, recovering a deleted branch, a bad rebase, a dropped stash, or a force-push that overwrote someone — plus the cases that genuinely are unrecoverable.',
    introduction: `## Overview
The recovery model rests on one property: **an object is deleted only when it is unreachable *and* garbage collection runs.** Between those two conditions there is a wide window, and the reflog holds the window open.

The reflog records every movement of every ref. Every commit, checkout, merge, rebase, reset and pull writes an entry saying where the ref was and where it went. Because a reflog entry is itself a reference, a commit mentioned in it is reachable, and therefore safe from gc.

Default expiry is **90 days for entries whose commits are still reachable and 30 days for unreachable ones** (gc.reflogExpire, gc.reflogExpireUnreachable). So the practical rule is: if it was ever committed, and it happened within a month, it is almost certainly recoverable.

Two limits define the boundaries. The reflog is **local and per-clone** — it recovers your mistakes, not a colleague's, and a fresh clone has none. And work that was never committed or staged has no object at all, so it cannot be recovered by Git.`,
    topics: [
      {
        title: 'The reflog, ORIG_HEAD, and undoing each operation',
        content: `**Reading the reflog.**

    git reflog                      # HEAD movements
    git reflog show main            # one branch's history of positions
    git log -g --oneline            # reflog with full commit formatting

Each entry is addressable as HEAD@{n}, and time expressions work: HEAD@{2.hours.ago}, main@{yesterday}. The operation name in each line (commit, rebase -i (finish), reset: moving to, pull) tells you what moved it, which is usually enough to identify the moment things went wrong.

**ORIG_HEAD** is set by any operation that moves HEAD significantly — merge, rebase, reset, pull. It is a one-slot undo for the most recent such operation:

    git reset --hard ORIG_HEAD

**Recovering specific disasters:**

*Accidental git reset --hard.* The commits still exist; only the ref moved.

    git reflog                       # find the sha before the reset
    git reset --hard HEAD@{1}

*A rebase that went wrong.* The pre-rebase position is in the reflog, and ORIG_HEAD usually points at it. For an interactive rebase mid-flight, git rebase --abort is cleaner.

    git reset --hard ORIG_HEAD

*A deleted branch.* Deleting a branch removes only the ref file; the commits remain until gc.

    git reflog                       # find its tip
    git branch recovered <sha>
    # if the reflog is gone:
    git fsck --lost-found

*An amended commit whose original you want back.* The pre-amend commit is in the reflog as the entry before the amend. git reflog show <branch> shows both positions.

*A dropped or cleared stash.* Stashes are commits, and git stash drop leaves them dangling. There is no stash reflog after dropping, so use fsck:

    git fsck --unreachable | grep commit
    git show <sha>                   # identify the right one
    git stash apply <sha>            # or: git branch recovered <sha>

*A force-push that overwrote someone else's work.* On the machine that pushed, the old commits are usually still present — the remote-tracking reflog (git reflog show origin/main) records what the remote was before. Push the recovered sha back. If they are only on the *server*, GitHub's REST API events, the Activity view, or support can often surface the orphaned sha; forges keep unreferenced objects for a period.

**Finding objects with no ref at all.**

    git fsck --full --unreachable --lost-found

fsck walks the whole object database and reports what nothing points at. --lost-found writes dangling commits and blobs into .git/lost-found for inspection. Dangling *blobs* matter too: content that was staged (git add) but never committed still exists as a blob, so even an uncommitted-but-staged file is recoverable this way.

**Not making it worse.** If you suspect you have lost something, **stop running commands and do not run git gc or git prune**. Copy the .git directory first. gc is what turns a recoverable situation into an unrecoverable one, and aggressive settings or a repack can trigger it.`,
      },
      {
        title: 'What is genuinely unrecoverable, and how to make recovery cheap',
        content: `**Truly gone:**

- **Uncommitted, unstaged working-tree changes** destroyed by git reset --hard, git checkout -- file, git restore, or a clean. No object was ever written, so Git has nothing. (An editor's local history or an IDE's local-history feature is often the only recourse — worth knowing that JetBrains IDEs and VS Code both keep one.)
- **Untracked files** removed by git clean -fd. Same reason.
- **Objects already garbage-collected** and past their reflog expiry.
- **A stash that was dropped and then gc'd.**

The pattern is consistent: **Git protects what it has hashed.** Anything committed or staged has an object; anything else does not exist as far as Git is concerned. This is the strongest practical argument for committing early and often on a local branch — commits are free, and they convert an unrecoverable situation into a reflog lookup.

**Making recovery cheap:**

- **Commit work-in-progress freely.** git commit -m wip on a local branch costs nothing and can be squashed away later with autosquash or an interactive rebase.
- **Prefer git stash over discarding**, since a stash is a real commit and therefore recoverable, whereas a discard is not.
- **Use --force-with-lease** rather than --force, so a force-push cannot silently destroy work the remote had. Add --force-if-includes (2.30+) for a stricter check.
- **Enable protected branches** on the forge — blocking force-push and deletion on main removes the whole category server-side, which is more reliable than discipline.
- **Extend the safety window** on repositories where it matters: gc.reflogExpire and gc.reflogExpireUnreachable can both be set to a longer period, or to never.
- **Keep a second remote.** git remote add backup and pushing all refs there periodically means the objects exist in two places, which no local mistake can undo.
- **Use worktrees rather than stash-juggling** when switching context, so half-finished work stays committed on its own branch instead of living in the index.

**A diagnostic worth internalising.** When something appears lost, ask one question: *was it ever committed or staged?* If yes, it is an object, and the job is finding the hash — reflog first, ORIG_HEAD second, fsck third. If no, Git never had it, and the answer is outside Git. That single question resolves nearly every "I lost my work" situation in seconds, and it is what an interviewer is listening for.`,
      },
    ],
    quickFire: [
      { q: 'What makes recovery possible at all?', a: 'An object is deleted only when it is unreachable AND gc runs. The reflog holds the window open by referencing commits no branch points at — which makes them reachable, and therefore safe from collection.' },
      { q: 'How long does the reflog keep things?', a: '90 days for entries whose commits are still reachable, 30 days for unreachable ones (gc.reflogExpire and gc.reflogExpireUnreachable). Both can be extended, or set to never on repositories where it matters.' },
      { q: 'You ran git reset --hard by mistake. Recover.', a: 'The commits still exist; only the ref moved. git reflog to find the sha before the reset, then git reset --hard HEAD@{1}. ORIG_HEAD usually points there too.' },
      { q: 'What is ORIG_HEAD?', a: 'A one-slot undo, set by any operation that moves HEAD significantly — merge, rebase, reset, pull. git reset --hard ORIG_HEAD undoes the last such operation, including a merge you already committed.' },
      { q: 'You deleted a branch. Recover it.', a: 'Deleting a branch removes only the ref file; the commits remain until gc. Find the tip in git reflog and git branch recovered <sha>. If the reflog is gone, git fsck --lost-found lists dangling commits.' },
      { q: 'You dropped a stash. Recover it.', a: 'Stashes are commits, and dropping leaves them dangling with no reflog entry. git fsck --unreachable | grep commit, identify the right one with git show, then git stash apply <sha> or git branch recovered <sha>.' },
      { q: 'Someone force-pushed over your work. What now?', a: 'On the machine that pushed, the old commits are usually still local, and git reflog show origin/main records what the remote was before — push that sha back. If it exists only server-side, forge APIs and support can often surface the orphaned sha, since unreferenced objects are retained for a period.' },
      { q: 'What is the first thing to do when you think work is lost?', a: 'Stop running commands, and do not run git gc or git prune. Copy the .git directory. gc is what converts a recoverable situation into an unrecoverable one.' },
      { q: 'What is genuinely unrecoverable?', a: 'Uncommitted, unstaged changes destroyed by reset --hard, restore or checkout -- file; untracked files removed by git clean; and objects already collected past reflog expiry. No object was ever hashed, so Git has nothing to find.' },
      { q: 'Can you recover a file that was staged but never committed?', a: 'Yes — git add writes a blob, so the content exists as an object. git fsck --lost-found surfaces dangling blobs, and git show <sha> prints the content. This is the practical difference between staged and merely saved.' },
      { q: 'What single question resolves most "I lost my work" cases?', a: 'Was it ever committed or staged? If yes it is an object, and the job is finding the hash — reflog, then ORIG_HEAD, then fsck. If no, Git never had it and the answer lies outside Git, in editor local history or backups.' },
    ],
    references: [
      'https://git-scm.com/docs/git-reflog',
      'https://git-scm.com/docs/git-fsck',
      'https://git-scm.com/docs/git-gc#Documentation/git-gc.txt-gcreflogExpire',
      'https://git-scm.com/docs/git-stash',
      'https://git-scm.com/book/en/v2/Git-Internals-Maintenance-and-Data-Recovery',
      'https://www.atlassian.com/git/tutorials/undoing-changes',
      'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
    ],
  },

  // ── 10 ───────────────────────────────────────────────────────────────
  {
    id: 'git-cherry-pick-backports',
    title: 'Cherry-Pick, Backports, and Managing Release Branches',
    icon: 'gitBranch',
    color: '#a855f7',
    questions: 10,
    description: 'Getting one fix onto three supported release branches without dragging unrelated work along. Cherry-pick and its -x trail, rebase --onto for moving a range, patch-id and git cherry for detecting duplicates, and range-diff for reviewing a backport.',
    introduction: `## Overview
Backporting is the standard shape of production work in anything that supports more than one version: a fix lands on main, and it must also reach 3.1, 3.2 and the current release branch — without carrying along the twenty unrelated commits that landed on main in the meantime.

Cherry-pick is the primitive. It takes a commit, computes its diff against its own parent, applies that diff where you are, and writes a **new commit with a new hash**. That last part is the source of every complication in this topic: the same logical change now exists as two unrelated objects, so Git's normal reachability answers ("is this commit in that branch?") stop working.

Everything below is either a way to move changes efficiently or a way to answer questions about them despite the hash difference.`,
    topics: [
      {
        title: 'Cherry-picking well, and moving ranges with rebase --onto',
        content: `**Basic use, and the flag that should always be on.**

    git cherry-pick <sha>
    git cherry-pick -x <sha>          # append "cherry picked from commit <sha>"

**-x is essentially mandatory for backports.** It records the source commit in the message, which is the only durable link between the two objects. Six months later, when someone asks whether the fix on 3.1 is the same as the one on main, that trailer is the answer. Kernel and distribution workflows treat it as required.

Other useful forms:

    git cherry-pick A..B              # a range, exclusive of A
    git cherry-pick A^..B             # a range, inclusive of A
    git cherry-pick -n <sha>          # apply without committing (stage only)
    git cherry-pick -m 1 <merge-sha>  # pick a merge, relative to parent 1
    git cherry-pick --continue / --skip / --abort

Picking a merge commit requires -m because a merge has no single parent to diff against; -m 1 means "the change this merge brought in relative to the mainline". It usually indicates you should have picked the individual commits instead.

**Moving a range of commits — rebase --onto.** Cherry-pick is fine for one or two commits; for a range, rebase --onto expresses the intent better. The form is:

    git rebase --onto <new-base> <old-base> <branch>

Read it as: take the commits in old-base..branch, and replay them onto new-base. Two common cases:

*A branch was cut from the wrong base.* You branched feature from develop but it should have come from main:

    git rebase --onto main develop feature

*You want only the last three commits of a branch.*

    git rebase --onto main feature~3 feature

**Conflicts during a backport** are expected and informative. A clean cherry-pick means the surrounding code is identical on both branches. A conflicting one means the branches have genuinely diverged there — and that is a signal to check whether the fix is even correct in the older context, not just to force the text through. **A backport that resolves cleanly but was never tested on the target branch is the classic source of "the fix broke the old release".** Always run the target branch's tests, not main's.

**When a fix is hard to backport,** the usual cause is that it depends on a refactor that only exists on main. Two honest options: backport the refactor first as a separate commit, or write a different, smaller fix for the old branch. Forcing the main version through with heavy conflict resolution produces a commit that resembles neither branch and that nobody can reason about later.`,
      },
      {
        title: 'Tracking what has been backported — patch-id, cherry, and range-diff',
        content: `Because a cherry-pick produces a new hash, git branch --contains <sha> will say the fix is *not* in the release branch even when it is. The tools below answer the question properly.

**patch-id** computes a hash of a diff's *content*, ignoring line numbers, whitespace and commit metadata. Two commits that make the same change have the same patch-id even with different hashes. That is the mechanism underneath the next two commands.

**git cherry** lists commits on one branch that have no equivalent upstream:

    git cherry -v main release-3.1

Each line is prefixed with + (not present upstream) or - (an equivalent change exists upstream). This is the direct answer to "what still needs backporting?" and it is patch-id based, so it sees through the hash change.

**git log --cherry-mark --left-right main...release-3.1** gives the same information as part of a normal log, marking equivalent commits with =.

**git range-diff** compares two *sequences* of commits — the single best tool for reviewing a backport:

    git range-diff main~5..main release-3.1~5..release-3.1

It pairs up corresponding commits and shows a diff **of the diffs**, so a reviewer sees exactly how the backported version differs from the original: usually nothing, and where it does differ, precisely what conflict resolution changed. Reviewing a backport by reading the full diff is far weaker, because it cannot distinguish "adapted for the old branch" from "accidentally dropped a hunk". range-diff is also the right tool for showing what changed between two versions of a rebased pull request.

**Release branch discipline.** A workable model, and roughly what Kubernetes, Chromium and most distributions use:

- **Fix on main first.** Always. A fix that lands only on a release branch is a regression waiting for the next release, and "forward-porting" is how that happens.
- **Backport by cherry-pick -x**, never by merging main into the release branch — merging drags in everything.
- **Gate what qualifies.** A release branch takes fixes, security patches and nothing else. Features on a release branch are how a stabilisation branch destabilises.
- **Automate the tracking.** A label such as needs-backport-3.1 plus a bot that opens the cherry-pick PR is standard; the automation matters more than the tool, because the failure mode is a fix that everyone assumed someone else had backported.
- **Tag and verify.** After backporting, git tag --contains and git cherry -v confirm the fix is where you believe it is — before the release, not after the incident.`,
      },
    ],
    quickFire: [
      { q: 'What does cherry-pick actually do?', a: 'Computes a commit\'s diff against its own parent, applies it where you are, and writes a NEW commit with a new hash. The hash difference is the source of every complication — reachability questions like branch --contains stop working.' },
      { q: 'Why is -x essentially mandatory for backports?', a: 'It appends "cherry picked from commit <sha>" to the message, which is the only durable link between the two objects. Months later it is how anyone establishes that the fix on 3.1 is the same one from main. Kernel and distro workflows treat it as required.' },
      { q: 'How do you cherry-pick a merge commit?', a: 'git cherry-pick -m 1 <merge-sha> — a merge has no single parent to diff against, so -m names the mainline parent. Needing it usually means you should be picking the individual commits instead.' },
      { q: 'Explain git rebase --onto.', a: 'git rebase --onto <new-base> <old-base> <branch> takes the commits in old-base..branch and replays them onto new-base. It fixes a branch cut from the wrong base (--onto main develop feature) or extracts a subrange (--onto main feature~3 feature).' },
      { q: 'What does a conflict during a backport tell you?', a: 'That the branches have genuinely diverged in that area — which is a signal to check whether the fix is even correct in the older context, not just to force the text through. Always run the target branch\'s tests, not main\'s.' },
      { q: 'What is patch-id?', a: 'A hash of a diff\'s content, ignoring line numbers, whitespace and metadata, so two commits making the same change share a patch-id despite different commit hashes. It is the mechanism behind git cherry and --cherry-mark.' },
      { q: 'What still needs backporting to 3.1?', a: 'git cherry -v main release-3.1. Lines prefixed + have no equivalent upstream, - means an equivalent change already exists. It is patch-id based, so it sees through the hash change that defeats branch --contains.' },
      { q: 'How do you review a backport properly?', a: 'git range-diff main~5..main release-3.1~5..release-3.1 — it pairs corresponding commits and shows a diff of the diffs, so you see exactly how the backport differs from the original. Reading the raw diff cannot distinguish "adapted for the old branch" from "accidentally dropped a hunk".' },
      { q: 'Why fix on main first, always?', a: 'A fix that lands only on a release branch is a regression waiting for the next release, because forward-porting is unreliable and easily forgotten. Fix on main, then cherry-pick -x down.' },
      { q: 'Why never merge main into a release branch?', a: 'It drags in every unrelated change on main, which is precisely what a stabilisation branch exists to exclude. Backport by cherry-pick, and gate the branch to fixes and security patches only.' },
    ],
    references: [
      'https://git-scm.com/docs/git-cherry-pick',
      'https://git-scm.com/docs/git-rebase#Documentation/git-rebase.txt---ontoltnewbasegt',
      'https://git-scm.com/docs/git-cherry',
      'https://git-scm.com/docs/git-range-diff',
      'https://git-scm.com/docs/git-patch-id',
      'https://www.kernel.org/doc/html/latest/process/stable-kernel-rules.html',
    ],
  },

  // ── 11 ───────────────────────────────────────────────────────────────
  {
    id: 'git-hooks-and-commit-standards',
    title: 'Hooks, Commit Conventions, and Signed Commits',
    icon: 'shield',
    color: '#0891b2',
    questions: 11,
    description: 'Client and server hooks and why client hooks are never a security control, the pre-commit framework, Conventional Commits driving semantic-release, and commit signing with GPG, SSH or Sigstore — including what a verified badge actually proves.',
    introduction: `## Overview
Three separate concerns get bundled together under "commit hygiene", and keeping them apart makes each one tractable.

**Hooks** run code at points in the Git lifecycle. **Commit conventions** impose structure on messages so tooling can act on them. **Signing** provides cryptographic evidence of who authored a commit.

The single most important principle spans all three: **client-side hooks are a convenience, never a control.** They live in .git/hooks, which is not part of the repository, are trivially bypassed with --no-verify, and do not exist at all in a fresh clone until something installs them. Any rule that actually matters must be enforced server-side — in CI, in a branch protection rule, or in a server-side hook. Client hooks exist to give fast feedback, not to guarantee anything.`,
    topics: [
      {
        title: 'Hooks — the useful ones, and how to distribute them',
        content: `**Client-side hooks**, in the order they fire:

- **pre-commit** — before the message editor. The place for linting and formatting. Keep it fast; anything over a second or two gets bypassed habitually.
- **prepare-commit-msg** — populate the message template, for example injecting a ticket ID parsed from the branch name.
- **commit-msg** — validate the message. Where Conventional Commits enforcement lives.
- **post-commit** — notifications; cannot affect the commit.
- **pre-push** — the last client-side gate. Better than pre-commit for a test suite, since it runs once per push rather than once per commit.
- **post-checkout / post-merge** — reinstall dependencies when a lockfile changes, a genuinely useful ergonomic hook.

**Server-side hooks**, which are the enforcing ones:

- **pre-receive** — runs once for the whole push, with all refs; rejecting here rejects the entire push. This is where real policy lives: message format, file size limits, secret scanning, protected paths.
- **update** — runs per ref, allowing partial acceptance.
- **post-receive** — after acceptance; triggers CI, notifications, deployments.

On hosted forges you usually cannot install server hooks (GitHub does not permit them; GitLab offers them on self-managed, and push rules on Premium). The equivalents are **branch protection rules**, **required status checks**, and **push protection** for secrets. The mental model stays the same: the check must live somewhere the developer cannot skip.

**Distributing client hooks.** Because .git/hooks is not versioned, hooks must be installed. Options:

- **core.hooksPath** — point Git at a versioned directory: git config core.hooksPath .githooks. Simple, no dependencies, but requires each developer to run it once.
- **pre-commit** (the framework, pre-commit.com) — a versioned .pre-commit-config.yaml declaring hooks with pinned versions, each in its own isolated environment. Language-agnostic, and the de facto standard in the Python ecosystem and increasingly beyond. It also runs in CI, which is what closes the bypass gap: pre-commit run --all-files as a required check means the same rules are enforced where they cannot be skipped.
- **Husky** — the JavaScript ecosystem equivalent, installed via a package.json prepare script, so it is set up by npm install. Usually paired with **lint-staged** so only staged files are processed, which is what keeps it fast.

The key design point: **whatever you run client-side, run the identical check in CI.** The client hook makes it fast; CI makes it true.`,
      },
      {
        title: 'Conventional Commits, release automation, and signing',
        content: `**Conventional Commits** is a message format that makes history machine-readable:

    <type>[optional scope][!]: <description>

    [optional body]

    [optional footer(s)]

Types are feat, fix, docs, style, refactor, perf, test, build, ci, chore. A ! before the colon, or a BREAKING CHANGE: footer, marks an incompatible change.

    feat(auth): add SAML login
    fix(api): handle null tenant in rate limiter
    refactor(db)!: drop legacy connection pool

The payoff is mechanical semantic versioning: **feat gives a minor bump, fix gives a patch, a breaking marker gives a major.** Tools such as **semantic-release**, **release-please** and **changesets** read the log, compute the next version, generate the changelog and publish — removing the "what version is this?" conversation entirely. **commitlint** enforces the format in a commit-msg hook and in CI.

Two caveats worth stating. The convention only pays for itself where releases are automated; imposing it without that is ceremony. And it describes the *type* of change, not its importance — a fix can matter far more than a feat, so a changelog generated purely from types still needs editorial judgement.

Independent of the convention, a good message answers **why**, not what: the diff already says what changed. The Linux kernel and Git's own guidelines both ask for a short imperative subject under about 50 characters, a blank line, and a body wrapped at 72 explaining motivation and context. A trailer such as Fixes: #123 or Refs: JIRA-456 links to the issue.

**Signing.** Commits carry an author field that is **plain text you can set to anything** — git config user.email is not authentication. Signing is what makes authorship verifiable.

- **GPG** — the original mechanism. git config user.signingkey <key>, commit.gpgsign=true, and upload the public key to the forge. Powerful, but key distribution and expiry make it operationally heavy.
- **SSH signing** (Git 2.34+) — sign with the SSH key you already have: gpg.format=ssh, user.signingkey=~/.ssh/id_ed25519.pub. Verification uses an allowed-signers file (gpg.ssh.allowedSignersFile). This is dramatically simpler and is now the pragmatic default for most teams; GitHub and GitLab both verify SSH signatures.
- **Sigstore / gitsign** — keyless signing using short-lived certificates tied to an OIDC identity, with the signature recorded in a public transparency log. It removes long-lived key management entirely and fits supply-chain frameworks such as SLSA.

Sign tags as well as commits (git tag -s), since a release tag is the artefact people actually trust.

**What a verified badge proves, and what it does not.** It proves the commit was signed by a key the forge associates with that account. It does **not** prove the code is good, that the author reviewed it, or that the account is not compromised. And because Git's author field is free text, an *unsigned* commit can claim any identity at all — which is the actual attack, and the reason to require signatures on protected branches rather than merely allowing them.

**DCO versus CLA.** A Developer Certificate of Origin is a Signed-off-by trailer (git commit -s) asserting the contributor has the right to submit the code — lightweight, enforced by a bot, used by the kernel and CNCF projects. A Contributor Licence Agreement is a separate legal document. They solve provenance-of-rights, not identity; signing solves identity. Projects frequently need both.`,
      },
    ],
    quickFire: [
      { q: 'Why are client-side hooks never a security control?', a: 'They live in .git/hooks, which is not part of the repository, are bypassed with --no-verify, and do not exist in a fresh clone until something installs them. Anything that must hold has to be enforced server-side — CI, branch protection, or a pre-receive hook.' },
      { q: 'Which hook enforces policy on a push?', a: 'pre-receive — it runs once for the whole push with all refs, so rejecting there rejects everything. update runs per ref and allows partial acceptance. post-receive runs after and triggers CI or deploys.' },
      { q: 'Hosted forges do not allow server hooks. What replaces them?', a: 'Branch protection rules, required status checks and push protection for secrets. GitLab self-managed offers server hooks and push rules on Premium. The model is unchanged: the check must live where the developer cannot skip it.' },
      { q: 'How do you distribute client hooks to a team?', a: 'core.hooksPath pointing at a versioned directory (simple, but each developer runs it once); the pre-commit framework with a pinned .pre-commit-config.yaml (language-agnostic, and runs in CI too); or Husky with lint-staged in the JS ecosystem, installed via a package.json prepare script.' },
      { q: 'What closes the --no-verify bypass gap?', a: 'Running the identical check in CI — for example pre-commit run --all-files as a required status check. The client hook makes it fast; CI makes it true.' },
      { q: 'Why pre-push rather than pre-commit for tests?', a: 'It runs once per push instead of once per commit. A pre-commit hook that takes more than a second or two gets habitually bypassed, which makes it worse than not having it.' },
      { q: 'What is Conventional Commits and what does it buy?', a: 'A message format — type(scope)!: description — with types feat, fix, docs, refactor, perf, test, build, ci, chore. It makes versioning mechanical: feat is a minor bump, fix a patch, a ! or BREAKING CHANGE footer a major. semantic-release, release-please and changesets consume it to version, changelog and publish automatically.' },
      { q: 'When is Conventional Commits not worth it?', a: 'When releases are not automated — then it is ceremony. And note it encodes the type of change, not its importance: a fix can matter more than a feat, so a generated changelog still needs editorial judgement.' },
      { q: 'What should a commit message say?', a: 'Why, not what — the diff already says what. Short imperative subject under ~50 characters, blank line, body wrapped at 72 covering motivation and context, plus a trailer like Fixes: #123. That is both the kernel and Git\'s own guidance.' },
      { q: 'GPG or SSH signing?', a: 'SSH signing (Git 2.34+) for most teams: gpg.format=ssh with your existing key, verified against an allowed-signers file, and supported by GitHub and GitLab. GPG is the original but key distribution and expiry make it heavy. Sigstore/gitsign is keyless — short-lived certs tied to an OIDC identity with a transparency log — and fits SLSA-style supply-chain requirements.' },
      { q: 'What does a "verified" badge actually prove?', a: 'That the commit was signed by a key the forge associates with that account. Not that the code is good, that the author reviewed it, or that the account is uncompromised. Since Git\'s author field is free text, an unsigned commit can claim any identity — which is why signatures should be required on protected branches, not merely permitted.' },
    ],
    references: [
      'https://git-scm.com/docs/githooks',
      'https://pre-commit.com/',
      'https://www.conventionalcommits.org/',
      'https://semantic-release.gitbook.io/',
      'https://git-scm.com/docs/git-config#Documentation/git-config.txt-gpgformat',
      'https://docs.sigstore.dev/cosign/signing/gitsign/',
      'https://developercertificate.org/',
    ],
  },

  // ── 12 ───────────────────────────────────────────────────────────────
  {
    id: 'git-worktrees-and-daily-workflow',
    title: 'Worktrees, Stash, and the Daily Workflow That Scales',
    icon: 'layers',
    color: '#eab308',
    questions: 10,
    description: 'Handling interruptions without losing context: worktrees for genuinely parallel checkouts, what stash really is and where it bites, fetch versus pull and why pull --rebase is a better default, plus the config that removes most day-to-day friction.',
    introduction: `## Overview
The interrupt is the defining event of a working day: you are mid-change and something urgent arrives. How you handle it determines how much context you lose.

The reflexive answer is git stash. It is often the wrong one. A stash is opaque (a name like "WIP on main: 3f2a1b" tells you nothing three days later), it is a stack that people push onto and never pop, it does not include untracked files unless you ask, and it forces you to keep switching one working directory back and forth.

**git worktree** is usually the better tool: it checks out a second branch into a second directory backed by the same repository. Both checkouts are live simultaneously, so the interrupt gets its own directory and the original work is never disturbed. No stashing, no context switch, no rebuild of the first tree when you come back.`,
    topics: [
      {
        title: 'Worktrees, and using stash correctly when you do use it',
        content: `**Worktrees.**

    git worktree add ../hotfix-tree hotfix-branch      # existing branch
    git worktree add -b urgent-fix ../urgent main      # create a branch too
    git worktree list
    git worktree remove ../hotfix-tree
    git worktree prune                                  # clean stale metadata

All worktrees share one object database, so this is far cheaper than a second clone — no re-fetch, and disk cost is only the checked-out files. Fetches and commits are immediately visible everywhere.

Where worktrees earn their keep:

- **Handling an interrupt** without touching the tree you are working in.
- **Long-running builds.** Keep a worktree pinned to main building while you develop elsewhere.
- **Bisecting** in a separate worktree, so your feature work is untouched while bisect checks out dozens of historical commits.
- **Comparing two versions side by side**, including running both at once.
- **Reviewing a PR** while keeping your own work live.

Constraints to know: **the same branch cannot be checked out in two worktrees** (Git refuses, which prevents divergent index states); worktrees are local, not shared or pushed; and they need occasional pruning after directories are deleted manually. Submodules and worktrees together remain awkward.

**Stash, when you do use it.** A stash is a real commit — in fact a small merge commit referenced by refs/stash — which is why it is recoverable via fsck after being dropped. The flags that matter:

    git stash push -m "descriptive message" -- path/  # name it, and scope it
    git stash -u                                      # include untracked files
    git stash -a                                      # include ignored files too
    git stash list
    git stash show -p stash@{1}                       # view the diff
    git stash apply stash@{1}                         # keep it in the list
    git stash pop                                     # apply and drop
    git stash branch new-branch stash@{1}             # apply onto a new branch

The two sharp edges: **-u is not the default**, so a plain git stash leaves new untracked files sitting in the tree, and people then switch branches and are confused about where they came from. And **pop drops the stash even if applying it produced conflicts** in some situations, so prefer apply followed by an explicit drop when the stash is valuable. Always use -m; an unlabelled stash more than a day old is usually deleted rather than understood.

**git stash branch** is the underused one: it creates a branch from the commit the stash was made on and applies the stash there, which is exactly what you want when a quick experiment turned into real work.`,
      },
      {
        title: 'Fetch, pull, and the configuration that removes daily friction',
        content: `**Fetch versus pull.** git fetch downloads objects and updates remote-tracking refs (origin/main) without touching your branch or working tree — always safe. git pull is fetch followed by an integration step, and that second half is where surprises live.

Plain git pull merges, producing a merge commit for every incidental sync. On a busy branch this creates a history full of "Merge branch main of github.com:..." commits that carry no information. **git pull --rebase** instead replays your local commits on top of the fetched ones, keeping history linear.

    git config --global pull.rebase true
    git config --global rebase.autoStash true

The second line matters: with autoStash, a rebase stashes dirty changes, rebases, and restores them, so pull --rebase stops failing because the tree is not clean. The caveat is the usual one — do not rebase commits others have already based work on — which is fine for the normal case of your own unpushed local commits.

Git 2.27+ warns when pull.rebase is unset precisely because there is no safe default; choosing explicitly is the point.

**Configuration worth setting once.** Each of these removes a recurring annoyance:

    # Safety
    git config --global merge.conflictStyle zdiff3      # show the merge base
    git config --global rerere.enabled true             # remember conflict resolutions
    git config --global push.default simple             # push only the current branch
    git config --global transfer.fsckObjects true       # verify objects on transfer

    # Ergonomics
    git config --global pull.rebase true
    git config --global rebase.autoStash true
    git config --global rebase.updateRefs true          # restack stacked branches
    git config --global rebase.autoSquash true          # honour fixup! commits
    git config --global diff.algorithm histogram        # better diffs than myers
    git config --global diff.colorMoved zebra           # distinguish moved code
    git config --global branch.sort -committerdate      # most recent branches first
    git config --global column.ui auto
    git config --global help.autocorrect prompt

    # Large repositories
    git config --global core.fsmonitor true
    git config --global fetch.writeCommitGraph true
    git maintenance start

Three of those repay explanation. **diff.algorithm=histogram** produces materially more readable diffs than the default myers, particularly on code with repeated structural lines. **diff.colorMoved=zebra** colours moved lines differently from added ones, which makes a refactor diff readable at a glance. And **branch.sort=-committerdate** turns git branch from an alphabetical list into a recency list, which is what you actually want.

**A note on aliases.** Aliases for composite operations are worth it; aliases for single commands mostly train you out of fluency. The genuinely useful ones tend to be log formats:

    git config --global alias.lg "log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) %C(dim white)%an%C(reset) %C(auto)%d%C(reset) %s'"
    git config --global alias.last "log -1 HEAD --stat"
    git config --global alias.unstage "restore --staged --"

**Finally, prefer switch and restore over checkout.** git checkout was overloaded to do two unrelated things — change branches and discard file changes — which is why "I ran checkout and lost my work" is such a common story. Git 2.23 split it: **git switch** changes branches, **git restore** changes files. Using them makes the destructive operation explicit rather than incidental.`,
      },
    ],
    quickFire: [
      { q: 'Why prefer a worktree over a stash for an interrupt?', a: 'A worktree checks the other branch out into a second directory backed by the same repository, so both are live at once — no stashing, no context switch, no rebuild of the first tree. Stashes are opaque, stack up unpopped, and force one directory to serve two tasks.' },
      { q: 'What do worktrees share, and what does that save?', a: 'One object database. So there is no re-fetch and the only extra disk cost is the checked-out files, unlike a second clone. Commits and fetches are visible from every worktree immediately.' },
      { q: 'What are the worktree constraints?', a: 'The same branch cannot be checked out in two worktrees — Git refuses, preventing divergent index states. They are local and not shared or pushed, need git worktree prune after manual directory deletion, and remain awkward with submodules.' },
      { q: 'What is a stash, really?', a: 'A real commit — a small merge commit referenced by refs/stash — which is why a dropped stash is recoverable via git fsck --unreachable.' },
      { q: 'What are the two sharp edges of stash?', a: '-u is not the default, so plain git stash leaves untracked files in the tree; and pop drops the stash even when applying produced conflicts in some cases, so prefer apply then an explicit drop for anything valuable. Always use -m — an unlabelled stash is usually deleted rather than understood.' },
      { q: 'What is git stash branch for?', a: 'It creates a branch from the commit the stash was made on and applies the stash there — exactly what you want when a quick experiment turned into real work, and it sidesteps conflicts from the branch having moved on.' },
      { q: 'Fetch versus pull?', a: 'fetch downloads objects and updates remote-tracking refs without touching your branch or working tree, so it is always safe. pull is fetch plus an integration step, and that step is where the surprises are.' },
      { q: 'Why pull.rebase true?', a: 'Plain pull merges, producing an uninformative "Merge branch main of..." commit on every sync. Rebase replays your local commits on top instead, keeping history linear. Pair it with rebase.autoStash so it stops failing on a dirty tree.' },
      { q: 'Name three config settings that materially improve daily Git.', a: 'merge.conflictStyle=zdiff3 (shows the merge base, making resolutions decidable), rerere.enabled=true (stops re-resolving identical conflicts), and diff.algorithm=histogram with diff.colorMoved=zebra (far more readable diffs, and moved code distinguished from added code).' },
      { q: 'Why use switch and restore instead of checkout?', a: 'checkout was overloaded to both change branches and discard file changes, which is why "I ran checkout and lost my work" is so common. Git 2.23 split it — switch for branches, restore for files — making the destructive operation explicit rather than incidental.' },
    ],
    references: [
      'https://git-scm.com/docs/git-worktree',
      'https://git-scm.com/docs/git-stash',
      'https://git-scm.com/docs/git-pull#Documentation/git-pull.txt---rebasefalsetruemergesinteractive',
      'https://git-scm.com/docs/git-switch',
      'https://git-scm.com/docs/git-restore',
      'https://git-scm.com/docs/git-config#Documentation/git-config.txt-diffalgorithm',
      'https://git-scm.com/docs/git-maintenance',
      'https://www.atlassian.com/git/tutorials/syncing',
      'https://kodekloud.com/blog/git-interview-questions/',
    ],
  },

  // ── 13 ───────────────────────────────────────────────────────────────
  {
    id: 'git-learn-branching-course',
    title: 'Learn Git Branching — The Full Level Tree, Explained',
    icon: 'gitBranch',
    color: '#3b82f6',
    questions: 12,
    description: 'A walkthrough of every level in learngitbranching.js.org, the interactive visual Git tutorial — Introduction, Ramping Up, Moving Work Around, A Mixed Bag and Advanced Topics on the local side, then Push & Pull and To Origin And Beyond for remotes — with the concept each level is actually teaching.',
    introduction: `## Overview
[learngitbranching.js.org](https://learngitbranching.js.org/) is the most effective Git tutorial available, and the reason is its premise: **it draws the commit graph.** Most Git confusion is not about command syntax, it is about not having a mental picture of what the DAG looks like before and after an operation. The site gives you that picture, animates the transition, and then makes you produce a target graph yourself.

It has two courses, each with a main sequence and a set of optional side levels:

**Local** — Introduction Sequence, Ramping Up, Moving Work Around, A Mixed Bag, Advanced Topics.
**Remote** — Push & Pull (Git Remotes), To Origin And Beyond (advanced remotes).

A sandbox is always available: type levels to see the tree, level <id> to jump, help, undo, reset, show goal, and hint. The command set is real Git, executed against a simulated repository, so everything transfers.

This topic mirrors that structure level by level and states the concept behind each, so it can be used as a companion while working through the site or as a revision sheet afterwards.`,
    topics: [
      {
        title: 'Local course — Introduction, Ramping Up, and Moving Work Around',
        content: `**Introduction Sequence — four levels establishing the graph.**

*Introduction to Git Commits.* Each commit records a snapshot and points at its parent, so history is a chain rather than a list of patches. The visual point: a commit is a node, and committing adds a node below the current one.

*Branching in Git.* A branch is a **pointer to a commit**, nothing more — the tutorial's phrasing, "branches are lightweight movable pointers", is the single most useful sentence in it. git branch bugFix creates a pointer; git checkout bugFix moves HEAD onto it. The modern equivalent is git switch, and git switch -c does the create-and-move in one step.

*Merging in Git.* git merge bugFix creates a commit with **two parents**, so both histories are preserved and reachable. The picture makes clear why nothing is lost and why the graph diverges then rejoins.

*Rebase Introduction.* git rebase main takes your commits and **replays them as new commits** on top of main, producing a linear history. The animation shows the originals fading out — which is exactly the point that hashes change and the old commits become unreferenced.

**Ramping Up — four levels on moving HEAD precisely.**

*Detach yo' HEAD.* HEAD normally points at a branch, which points at a commit. Checking out a commit directly detaches HEAD so it references the commit itself — the state you land in during a bisect or when inspecting an old revision.

*Relative Refs (^).* The caret moves one commit up: main^ is main's parent, main^^ its grandparent. On a **merge commit**, ^2 selects the second parent — the branch that was merged in — which is how you reach either side of a merge.

*Relative Refs #2 (~).* The tilde with a number moves multiple commits: HEAD~4 goes back four. Combined with git branch -f, you can forcibly relocate a branch pointer: git branch -f main HEAD~3 moves main three back, without checking anything out.

*Reversing Changes in Git.* The two mechanisms, and when each is correct. **git reset** moves a branch pointer backwards, rewriting local history as if the commits never happened — fine locally. **git revert** creates a *new* commit that undoes an earlier one, leaving history intact — the correct choice for anything already shared. This distinction is the whole level, and it is a standard interview question.

**Moving Work Around — three levels on relocating commits.**

*Cherry-pick Intro.* git cherry-pick C2 C4 copies specific commits onto your current location. The tutorial calls it the most straightforward way to move work, and the visual shows copies appearing with new identifiers — the hash change that makes backport tracking non-trivial in real life.

*Interactive Rebase Intro.* git rebase -i opens a list you can reorder, drop, or squash. Use it when you know you want to reorganise a range but not exactly how; cherry-pick when you know precisely which commits you want.

*Grabbing Just 1 Commit.* The realistic debugging scenario: you added debug commits alongside a fix and want only the fix on main. Solved either by cherry-picking the one commit, or by an interactive rebase that drops the others.`,
      },
      {
        title: 'Local course — A Mixed Bag and Advanced Topics; then the Remote course',
        content: `**A Mixed Bag — seven levels of realistic combinations.**

*Juggling Commits* and *Juggling Commits #2.* Amending a commit that sits in the middle of a stack. The first solves it with rebase -i to bring the commit to the top, git commit --amend, then rebase back. The second does the same with cherry-pick, which avoids the reordering problem — the underlying lesson being that **there are usually several correct routes**, and the one with fewer conflict opportunities is preferable.

*Git Tags.* Tags are permanent markers for a commit — unlike branches, they do not move. This is why releases are tagged rather than branched.

*Git Describe.* git describe outputs <tag>_<numCommits>_g<hash>: the nearest tag, how far you are past it, and the abbreviated hash. It answers "where am I relative to a known release", which is why build systems embed it in version strings.

*Rebasing over 9000 times*, *Multiple parents*, *Branch Spaghetti.* Composite exercises. Multiple parents introduces the **^ with a number** modifier and the fact that these can be chained — HEAD~^2~ is a legitimate and readable path through a merge-heavy graph once you can see it.

**Advanced Topics — three hard levels.** *Rebasing Multiple Branches*, *Selective Rebase*, *The Ultimate Rebase*. No new commands; these combine everything above and are genuinely difficult. Finishing them is a fair signal that you can reason about the DAG rather than recall command recipes.

**Remote course, part 1 — Push & Pull.**

*Clone Intro.* A clone is a full copy of the repository, history included — a distributed model rather than a checkout.

*Remote Branches.* origin/main is a **remote-tracking branch**: your local record of where main was on the remote at your last fetch. It is not live, and it is why an out-of-date origin/main is such a common source of confusion. Checking one out puts you in detached HEAD, because it is not a branch you can commit to.

*Git Fetchin'.* fetch downloads new objects and **updates remote-tracking branches only** — it does not touch your local branches or working tree. This is why fetch is always safe.

*Git Pullin'.* pull is fetch plus merge. Naming the two halves is what makes pull predictable.

*Faking Teamwork.* A simulation command for generating upstream commits, so later levels can pose realistic divergence.

*Git Pushin'.* push uploads your commits and updates the remote branch.

*Diverged History.* The core problem of collaboration: the remote moved while you worked, so a plain push is rejected. You must integrate first — **git pull --rebase** to replay your work on top (linear history), or git pull to merge (a merge commit). Rebase is presented as the tidier default, with the standard caveat about rewriting shared commits.

*Locked Main.* Push is rejected because main is protected. The answer is the actual industry workflow: commit to a feature branch and open a pull request. A tutorial ending on branch protection is a good sign of its practicality.

**Remote course, part 2 — To Origin And Beyond.**

*Push Main!* Getting work onto a protected main via a side branch and a rebase.

*Merging with Remotes.* Merge instead of rebase — safer for shared branches, at the cost of a non-linear graph. The trade-off is explicitly framed as: rebase gives clean history but rewrites commits, merge preserves truth but produces a busier graph.

*Remote Tracking.* How a local branch knows which remote branch it corresponds to. Set it with git checkout -b foo origin/main, or explicitly with git branch -u origin/main foo. This is what makes a bare git push or git pull know where to go.

*Git push arguments*, *…arguments expanded*, *Oh sh*t remote branches*, *Git fetch arguments*, *Source of nothing*, *Pull arguments.* Six levels on the full refspec form: git push origin <source>:<destination>. Two special cases worth remembering — pushing an **empty source** (git push origin :sideBranch) *deletes* the remote branch, and fetching into an empty source (git fetch origin :bugFix) creates a local branch. Refspecs are rarely typed by hand, but they explain what the shorthand commands actually do, and they appear in CI configuration constantly.

**How to use this well.** Do the Introduction and Ramping Up sequences until the picture is automatic, then use the sandbox to reproduce a real problem you hit at work — that transfer step is what converts the tutorial into working knowledge. The Advanced Topics levels are worth returning to after a few months of real use rather than grinding through immediately.`,
      },
    ],
    quickFire: [
      { q: 'What is a branch, in the tutorial\'s phrasing?', a: 'A lightweight movable pointer to a commit. It is not a container of commits — the "contents" of a branch is whatever is reachable by walking parents from the commit it points at.' },
      { q: 'Difference between ^ and ~ in relative refs?', a: '^ moves one commit up and, with a number, selects which parent of a merge (main^2 is the merged-in branch). ~ with a number moves that many commits back along first parents (HEAD~4). They compose: HEAD~^2~ is a valid path through a merge-heavy graph.' },
      { q: 'reset versus revert — the level\'s core lesson?', a: 'reset moves a branch pointer backwards, rewriting history as if the commits never happened — fine locally. revert creates a new commit that undoes an earlier one, leaving history intact — the correct choice for anything already pushed.' },
      { q: 'What does git branch -f do?', a: 'Forcibly relocates a branch pointer without checking anything out: git branch -f main HEAD~3 moves main back three commits. It is the direct expression of "a branch is just a pointer".' },
      { q: 'When cherry-pick and when interactive rebase?', a: 'Cherry-pick when you know exactly which commits you want. Interactive rebase when you know you want to reorganise a range but not precisely how. The "Grabbing Just 1 Commit" level shows both solving the same debug-commits problem.' },
      { q: 'What does git describe output and why does it matter?', a: '<tag>_<numCommits>_g<hash> — the nearest tag, how far past it you are, and the abbreviated hash. It answers "where am I relative to a known release", which is why build systems embed it in version strings.' },
      { q: 'What is origin/main exactly?', a: 'A remote-tracking branch — your local record of where main was on the remote at your last fetch. It is not live, which is why a stale origin/main causes so much confusion, and checking it out gives detached HEAD because it is not a branch you can commit to.' },
      { q: 'Why is fetch always safe?', a: 'It downloads objects and updates remote-tracking branches only. It does not touch your local branches or working tree. pull is fetch plus an integration step, and that second half is where the surprises are.' },
      { q: 'Your push was rejected because history diverged. Options?', a: 'Integrate first: git pull --rebase replays your work on top of the remote for a linear history, or git pull merges and creates a merge commit. Rebase is the tidier default, with the usual caveat about not rewriting commits others have built on.' },
      { q: 'What is a refspec, and what does an empty source mean?', a: 'git push origin <source>:<destination>. An empty source deletes the remote branch — git push origin :sideBranch — and git fetch origin :bugFix creates a local branch from nothing. Rarely typed by hand, but they explain what the shorthand commands do and appear constantly in CI config.' },
      { q: 'How do you set up remote tracking explicitly?', a: 'git checkout -b foo origin/main sets it at creation, or git branch -u origin/main foo afterwards. It is what lets a bare git push or git pull know where to go.' },
      { q: 'What is the tutorial\'s final lesson?', a: 'Locked Main — push to a protected branch is rejected, and the answer is the real industry workflow: commit to a feature branch and open a pull request. Ending on branch protection rather than on a clever rebase is a good indication of how practical the course is.' },
    ],
    references: [
      'https://learngitbranching.js.org/',
      'https://github.com/pcottle/learnGitBranching',
      'https://www.atlassian.com/git/tutorials',
      'https://www.atlassian.com/git/tutorials/comparing-workflows',
      'https://git-scm.com/docs/gitrevisions',
      'https://git-scm.com/docs/git-push#Documentation/git-push.txt-ltrefspecgt82308203',
    ],
  },
];

export const gitTopicCategoryMap = Object.fromEntries(
  gitTopics.map((t) => [t.id, 'git']),
);

export const gitCategories = devopsCategories.filter((c) => c.id === 'git');
