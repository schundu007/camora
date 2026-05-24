# Research-Driven Diagram Pipeline — Design Spec

**Goal:** For each system design problem in the Prepare section, automatically research the topic from authoritative video sources, identify diagram gaps, and generate new deep-dive and trade-off comparison diagrams that ship alongside the existing ones.

**Architecture:** Two-phase Python pipeline. Phase 1 fetches video transcripts and synthesizes a research JSON. Phase 2 reads that JSON and generates PNGs + updates the frontend manifest. Phases are independent — Phase 1 is slow and network-bound; Phase 2 is fast and re-runnable.

**Tech Stack:** yt-dlp (transcript extraction), Anthropic Python SDK (synthesis + spec generation), Graphviz via existing `dot_render.py` (flow diagrams), new `comparison_render.py` (trade-off panels), React + existing `TopicDetail.jsx` (display).

---

## Research Sources

Five video channels used as internal reference only. Never surfaced to users. Never credited in UI.

- `https://www.youtube.com/@ByteByteGo`
- `https://www.youtube.com/@TechPrepYT`
- `https://www.youtube.com/@hayk.simonyan`
- `https://www.youtube.com/@designgurus1173`
- General YouTube search: `design {topic} system design interview`

---

## Phase 1 — Research

**Script:** `apps/camora/scripts/research-topic.py --phase=research --topic=url-shortener`

### Steps

1. **Query mapping** — a `TOPIC_QUERIES` dict maps each topic ID to 1-2 search strings:
   ```python
   TOPIC_QUERIES = {
     'url-shortener': ['design tiny url system design', 'url shortener system design interview'],
     'chat-system':   ['design whatsapp system design', 'chat system design interview'],
     # ... all 45+ topics
   }
   ```

2. **Video discovery** — for each channel handle + query, run:
   ```
   yt-dlp "ytsearch1:{query}" --match-filter "channel_id=..." --print id,title --no-download
   ```
   Collects up to 1 video per channel (5 channels) + top 2 from general search = up to 7 videos per topic.

3. **Transcript extraction** — for each video ID:
   ```
   yt-dlp https://youtube.com/watch?v={id} --write-auto-sub --sub-format vtt --skip-download -o /tmp/{id}
   ```
   Parse VTT → strip timestamps → plain text transcript. Skip video if no captions available.

4. **Synthesis prompt** — send all transcripts to Claude (`claude-opus-4-7`) with:
   - Full text of each transcript (truncated to 8k tokens each)
   - List of existing diagram filenames in `public/diagrams/{topic-id}/`
   - List of existing `tradeoffs[]` IDs from the topic data JS file
   - Instruction: identify sub-systems for deep-dive diagrams and binary decisions for trade-off diagrams that are NOT already covered by existing assets

5. **Output** — write `apps/camora/scripts/research/{topic-id}.json`:

```json
{
  "topic_id": "url-shortener",
  "researched_at": "2026-05-23",
  "sources": [
    { "channel": "ByteByteGo", "video_id": "abc123", "title": "Design TinyURL", "transcript_chars": 18400 },
    { "channel": "TechPrepYT", "video_id": "def456", "title": "URL Shortener System Design", "transcript_chars": 12000 }
  ],
  "synthesis": {
    "deep_dives": [
      {
        "id": "hash-collision-resolution",
        "title": "Hash Collision Resolution",
        "description": "How the system detects and resolves hash collisions using bloom filters + DB check loop",
        "components": ["Client", "Hash Service", "Bloom Filter", "MySQL", "Retry Loop"]
      },
      {
        "id": "analytics-pipeline",
        "title": "Click Analytics Pipeline",
        "description": "Async event pipeline for tracking redirect clicks without adding latency to the hot path",
        "components": ["Redirect Service", "Kafka", "Stream Processor", "ClickHouse", "Dashboard"]
      }
    ],
    "tradeoffs": [
      {
        "id": "base62-vs-md5-vs-uuid",
        "title": "Base62 vs MD5 vs UUID for Short Codes",
        "option_a": { "name": "Base62 counter", "pros": ["Predictable length", "No collision"], "cons": ["Sequential — enumerable", "Single point of failure on counter"] },
        "option_b": { "name": "MD5 hash (first 7 chars)", "pros": ["Distributed generation", "No counter needed"], "cons": ["Collision possible", "Requires bloom filter"] },
        "option_c": { "name": "UUID v4", "pros": ["Globally unique", "No coordination"], "cons": ["22+ chars — too long for a URL shortener"] },
        "recommendation": "Base62 counter with distributed ID generator (Snowflake-style) for production scale"
      },
      {
        "id": "301-vs-302-redirect",
        "title": "301 vs 302 Redirect",
        "option_a": { "name": "301 Permanent", "pros": ["Browser caches — no repeat server hits"], "cons": ["Cannot track clicks after first visit", "Cannot change destination"] },
        "option_b": { "name": "302 Temporary", "pros": ["Every redirect hits server — full click analytics", "Destination can be changed"], "cons": ["Higher server load"] },
        "recommendation": "302 for analytics-critical use cases; 301 only for pure redirect with no tracking requirement"
      }
    ]
  }
}
```

---

## Phase 2 — Generate

**Script:** `apps/camora/scripts/research-topic.py --phase=generate --topic=url-shortener`

### Steps

1. **Load research JSON** from `scripts/research/{topic-id}.json`. Abort if missing (run Phase 1 first).

2. **Generate deep-dive diagrams** — for each entry in `synthesis.deep_dives`:
   - Ask Claude to produce a Graphviz DOT flow spec (same JSON format as `scripts/diagrams/specs/`)
   - Pipe through existing `dot_render.py` → PNG
   - Save to `public/diagrams/{topic-id}/deep-dive-{id}.png`
   - Skip if file already exists (idempotent)

3. **Generate trade-off diagrams** — for each entry in `synthesis.tradeoffs`:
   - Render via new `comparison_render.py`: two or three columns (one per option), pros/cons rows, recommendation banner at bottom
   - Uses Graphviz HTML-like labels for the table layout
   - Save to `public/diagrams/{topic-id}/tradeoff-{id}.png`
   - Skip if file already exists

4. **Update manifest** — append/merge into `src/data/capra/topics/__generated/diagram-manifests.js`:
   ```js
   export const GENERATED_DIAGRAMS = {
     'url-shortener': {
       deepDives: [
         { id: 'hash-collision-resolution', title: 'Hash Collision Resolution', file: 'deep-dive-hash-collision-resolution.png' },
         { id: 'analytics-pipeline',        title: 'Click Analytics Pipeline',  file: 'deep-dive-analytics-pipeline.png' },
       ],
       tradeoffs: [
         { id: 'base62-vs-md5-vs-uuid', title: 'Base62 vs MD5 vs UUID',   file: 'tradeoff-base62-vs-md5-vs-uuid.png' },
         { id: '301-vs-302-redirect',   title: '301 vs 302 Redirect',      file: 'tradeoff-301-vs-302-redirect.png' },
       ]
     },
     // ...other topics merged in as they are generated
   }
   ```

---

## comparison_render.py

New file at `apps/camora/scripts/comparison_render.py`. Generates a dark-themed Graphviz PNG with:

- Title bar across the top
- One column per option (2 or 3 columns)
- Option name as column header
- Pros row (green tinted) and cons row (red tinted) per column
- Recommendation banner at the bottom spanning all columns

Uses Graphviz `record` nodes with HTML-like labels. Dark theme matching existing diagram style (`#0d1117` background, bright border colors).

---

## Frontend Integration

### Import

In `TopicDetail.jsx`, add alongside the existing `GENERATED_LAYERED_DESIGN` import:

```js
import { GENERATED_DIAGRAMS } from '../../../data/capra/topics/__generated/diagram-manifests';
```

### Render — Deep Dives

After the existing architecture diagram section (section 5b), insert:

```jsx
{GENERATED_DIAGRAMS[topicId]?.deepDives?.length > 0 && (
  <div id="deep-dives" className="scroll-mt-24 mt-14">
    <ContentHeading title="Deep Dives" />
    {GENERATED_DIAGRAMS[topicId].deepDives.map(d => (
      <div key={d.id} className="mt-6 first:mt-0">
        <p className="text-[13px] font-semibold text-[var(--text-secondary)] mb-2 landing-mono uppercase tracking-wide">{d.title}</p>
        <TopicDiagram topicId={topicId} kind={`deep-dive-${d.id}`} alt={d.title} caption={d.title} />
      </div>
    ))}
  </div>
)}
```

### Render — Design Decisions

After Deep Dives:

```jsx
{GENERATED_DIAGRAMS[topicId]?.tradeoffs?.length > 0 && (
  <div id="design-decisions" className="scroll-mt-24 mt-14">
    <ContentHeading title="Design Decisions" />
    {GENERATED_DIAGRAMS[topicId].tradeoffs.map(t => (
      <div key={t.id} className="mt-6 first:mt-0">
        <p className="text-[13px] font-semibold text-[var(--text-secondary)] mb-2 landing-mono uppercase tracking-wide">{t.title}</p>
        <TopicDiagram topicId={topicId} kind={`tradeoff-${t.id}`} alt={t.title} caption={t.title} />
      </div>
    ))}
  </div>
)}
```

### On-This-Page nav

Add "Deep Dives" and "Design Decisions" anchors to the `OnThisPage` sidebar when entries exist for the current topic.

---

## File Layout

```
apps/camora/
  scripts/
    research-topic.py          # main script (both phases)
    comparison_render.py       # trade-off diagram renderer
    research/                  # Phase 1 output (not committed)
      url-shortener.json
      chat-system.json
      ...
  public/diagrams/
    url-shortener/
      deep-dive-hash-collision-resolution.png   # Phase 2 output
      deep-dive-analytics-pipeline.png
      tradeoff-base62-vs-md5-vs-uuid.png
      tradeoff-301-vs-302-redirect.png
  src/data/capra/topics/__generated/
    diagram-manifests.js       # Phase 2 output (committed with diagrams)
```

`scripts/research/` is gitignored — research JSONs are working files, not shipped. Only the rendered PNGs and the manifest JS are committed.

---

## Run Order (per topic)

```bash
# 1. Research (slow — network + Claude synthesis)
python apps/camora/scripts/research-topic.py --phase=research --topic=url-shortener

# 2. Review scripts/research/url-shortener.json — verify deep_dives and tradeoffs make sense

# 3. Generate (fast — deterministic from research JSON)
python apps/camora/scripts/research-topic.py --phase=generate --topic=url-shortener

# 4. Verify PNGs look correct, then commit
git add apps/camora/public/diagrams/url-shortener/ apps/camora/src/data/capra/topics/__generated/diagram-manifests.js
git commit -m "feat(diagrams): add deep-dive and trade-off diagrams for url-shortener"
```

---

## Scope

- 45+ system design problems in `systemDesignProblems.js` are eligible
- Start with `url-shortener` as the pilot topic to validate the pipeline end-to-end
- Each topic takes ~5-10 min for Phase 1 (network-bound) and ~2 min for Phase 2
- The `scripts/research/` directory is gitignored; only rendered PNGs and the manifest are committed
