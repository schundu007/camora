# DevOps topic review — handoff

Working instructions for continuing the Camora DevOps content review. Written
so a session with no prior context can pick it up.

## Goal

Every DevOps topic in the Capra catalogue should read like a chapter of a good
technical book, written by a highly skilled DevOps / platform SRE: advanced,
accurate, current, and structured. Work in **batches of five topics**, and
commit + push after each batch.

The catalogue renders at
`https://camora.cariara.com/capra/prepare?page=devops`.

## Where the data lives

`apps/camora/src/data/capra/topics/` — the DevOps page merges these files
(see the `devops` entry in `loader.js`):

    devopsTopics.js  devopsTopicsExtra.js  helmTopics.js  fluxTopics.js
    controlPlaneTopics.js  nativeBuildTopics.js  k8sTopics.js  gitTopics.js

## Target topic shape

```js
{
  id, title, icon, color, questions,
  description,      // one-or-two sentence standfirst; long ones are trimmed
                    // in the header and shown in full as the Overview
  introduction,     // optional; Overview falls back to description
  topics: [         // the chapters — this is the important part
    { title, image?, content }
  ],
  visualizations: [ // ONLY real figures with a genuinely short caption
    { title, description, image }
  ],
  keyQuestions: [{ question, answer }],   // long-form
  quickFire: [{ q, a }],                  // short Q&A
  references: [ 'https://...' ],
}
```

A chapter's `image` renders at the head of that chapter, so a diagram should
sit with the prose that explains it rather than in a separate section.

## What is already done — do not redo

1. **Structural pass, all 245 topics.** Prose used to live inside
   `visualizations[].description` on entries with no image, so it rendered as a
   caption under a picture. It was all moved into `topics[]` chapters and
   `quickFire[]`, and figures whose captions were really essays were promoted
   into the chapter they illustrate. The conversion scripts are idempotent, but
   there is nothing left for them to do.
2. **A `git` category** with 13 topics (`gitTopics.js`) was added and is
   finished. Leave it alone.
3. **Batches 1–11 are complete — every topic now has chapters.**
   `devops-review-status.mjs` reports **245 done / 245 total, 0 remaining**,
   and `next-review-batch.mjs` returns an empty queue. Do not re-run the
   "write chapters for topics that have none" pass; there is nothing left
   for it to find.

   Batches 1–5 (earlier sessions):
   - three-ways, westrum-calms-culture, value-stream-mapping, dora-metrics,
     team-topologies
   - dora-2024-capabilities, opentelemetry-collector-pipelines,
     kubernetes-gateway-api, platform-engineering-maturity,
     gitops-secrets-management
   - ace-cicd-tbd-cd-adoption, ace-cicd-cost-optimized-runner-fleet,
     ace-cicd-software-supply-chain-security,
     ace-observability-alerting-pipeline-debug, ci-self-hosted-runners
   - k8s-pod-networking, k8s-network-policy-guide, k8s-traffic-flow-deep,
     k8s-deployment-strategies-guide, k8s-pod-troubleshooting-guide
   - release-manifests-lkg, hardware-in-the-loop-ci (introduction split)

   Batches 6–11 (all in `devopsTopicsExtra.js`):
   - ansible-roles-vs-collections, ansible-project-structure,
     terraform-cicd-pipeline, terraform-count-vs-for-each,
     terraform-remote-state
   - jenkins-controller-vs-agent, jenkinsfile-pipeline-code,
     devsecops-pipeline-architecture, high-availability-system-design,
     overlay-underlay-networking-deep
   - chaos-engineering, finops-cloud-cost, developer-productivity-space,
     sigstore-supply-chain-security, webassembly-cloud-native
   - ai-augmented-devops, dev-containers-environments,
     openfeature-feature-flags, cncf-landscape-navigation,
     toil-reduction-automation
   - internal-developer-platform, gitops-pull-model, slsa-supply-chain,
     dora-metrics-advanced, karpenter-node-autoscaling
   - crossplane-cloud-control, external-secrets-operator,
     dora-four-keys-implementation, platform-engineering-idp-design,
     grpc-protobuf-services

## What a future pass could do instead

The structural work is finished, so the next useful pass is qualitative
rather than mechanical. Candidates, roughly in order of value:

1. **Second-pass the topics written in batches 1–5**, which are shorter and
   less consistently rewritten than 6–11.
2. **Currency sweep.** Several topics now cite versions and statuses that
   will age (Terraform `use_lockfile`, Karpenter v1, WASI 0.2, CNCF
   maturity tiers, DORA report years). Re-check these annually.
3. **Cross-topic duplication.** `dora-metrics`, `dora-metrics-advanced` and
   `dora-four-keys-implementation` were deliberately given different angles
   (concepts / measurement / implementation), as were
   `internal-developer-platform` and `platform-engineering-idp-design`, and
   `sigstore-supply-chain-security` and `slsa-supply-chain`. Keep them
   distinct if any is edited.
4. **Figures.** Most topics in batches 6–11 either have one real diagram or
   none. Chapters that describe a mechanism in prose (VXLAN encapsulation,
   the Jenkins controller/agent trust boundary, GitOps credential
   direction) would benefit from a diagram attached to the chapter.

## Tools

    # what still has no chapters, and the next batch with full context
    node apps/camora/scripts/next-review-batch.mjs 5

    # category-wide progress
    node apps/camora/scripts/devops-review-status.mjs [-v]

    # dump a topic's current content
    node apps/camora/scripts/dump-topic-essays.mjs <id> [<id> ...]

    # apply new chapters / quickFire / introduction to one topic
    node apps/camora/scripts/restructure-topic.mjs <datafile> <id> <payload.json>
    # payload: { "sections": [{title, image?, content}],
    #            "quickFire": [{q, a}], "introduction": "..." }

`restructure-topic.mjs` **replaces** the keys it is given, so a payload must
contain the complete desired array, not a delta.

## Batch procedure

1. `node apps/camora/scripts/next-review-batch.mjs 5` to pick the batch and
   read each topic's current content.
2. For each topic, write two or more chapters. Rewrite the prose — do not just
   move it. Add the reasoning the original asserted without: the mechanism, the
   trade-off, the number that matters, the failure mode. Correct anything
   inaccurate or out of date and say so in the commit message.
3. Apply with `restructure-topic.mjs`. Write payloads as JSON files; if you
   author them in a JS script using template literals, **escape inline
   backticks** or the string terminates early.
4. `pnpm build:camora` must pass.
5. Sanity-check the result by importing the data file in node and printing
   chapter counts and lengths.
6. Commit with a message that says what was wrong and what changed, then push
   to `main`.

## Quality bar

- Explain *why*, not just *what*. The mechanism is the content.
- Prefer concrete numbers, named tools, exact flags and real failure modes.
- Say when something changed — renamed metrics, deprecated tools, new defaults.
- Mark emphasis with `**bold**`; the renderer styles it. Inline code in
  backticks renders as code. Markdown tables render; space-aligned ASCII tables
  do NOT (HTML collapses runs of spaces), so use pipe tables.
- Do not pad. A shorter accurate chapter beats a long vague one.

## Deployment

Vercel auto-deploy from `main` is unreliable on this project, so after pushing
the owner normally runs `vercel --prod` from the repo root. A cloud session will
not have Vercel credentials — **push to `main` and state clearly in your final
summary that `vercel --prod` still needs to be run locally.**

> **Outstanding as of the batch 6–11 session:** batches 6–11 are pushed to
> `main` but **have not been deployed**. `vercel --prod` still needs to be run
> from the repo root for those 30 topics to appear on
> camora.cariara.com.

## Notes

- Both backends and the frontend are unrelated to this work; only the topic
  data files and occasionally the renderer at
  `apps/camora/src/components/capra/docs/TopicDetail.jsx` are in scope.
- `FormattedContent.jsx` reflows hard-wrapped prose into paragraphs, so content
  may be written with normal line lengths.
