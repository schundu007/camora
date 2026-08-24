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
3. **Batches 1–5 are complete** — do not rewrite these:
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

## Notes

- Both backends and the frontend are unrelated to this work; only the topic
  data files and occasionally the renderer at
  `apps/camora/src/components/capra/docs/TopicDetail.jsx` are in scope.
- `FormattedContent.jsx` reflows hard-wrapped prose into paragraphs, so content
  may be written with normal line lengths.
