# Research-Driven Diagram Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-phase Python pipeline that researches system design topics from YouTube transcripts and generates new deep-dive + trade-off comparison PNGs, added alongside existing diagrams in the Prepare section.

**Architecture:** Phase 1 (`--phase=research`) fetches transcripts via yt-dlp, calls Claude to identify diagram gaps, writes a research JSON. Phase 2 (`--phase=generate`) reads that JSON, generates Graphviz DOT via Claude, renders PNGs, and updates a TypeScript manifest imported by TopicDetail.jsx.

**Tech Stack:** Python 3.11, yt-dlp, anthropic SDK, Graphviz (`dot` binary), React/TypeScript frontend.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `apps/camora/scripts/research-topic.py` | Main pipeline script (both phases) |
| Create | `apps/camora/scripts/comparison_render.py` | Trade-off comparison diagram renderer |
| Create | `apps/camora/scripts/research/` | Phase 1 JSON output (gitignored) |
| Create | `apps/camora/src/data/capra/topics/__generated/diagram-manifests.ts` | Generated manifest imported by TopicDetail |
| Modify | `apps/camora/src/components/capra/docs/TopicDetail.jsx` | Add Deep Dives + Design Decisions sections |
| Modify | `.gitignore` (repo root) | Ignore `scripts/research/*.json` |

---

### Task 1: Setup — install yt-dlp, create directory structure, add gitignore

**Files:**
- Modify: `.gitignore`
- Create: `apps/camora/scripts/research/.gitkeep`

- [ ] **Step 1: Install yt-dlp locally**

```bash
pip install yt-dlp
```

Expected: `Successfully installed yt-dlp-...`

- [ ] **Step 2: Verify graphviz `dot` binary is available**

```bash
dot -V
```

Expected output contains: `dot - graphviz version`

If not found on macOS: `brew install graphviz`

- [ ] **Step 3: Create the research output directory**

```bash
mkdir -p apps/camora/scripts/research
touch apps/camora/scripts/research/.gitkeep
```

- [ ] **Step 4: Add research JSONs to gitignore**

Open the repo root `.gitignore` and append:

```
# Research pipeline — working files, not committed
apps/camora/scripts/research/*.json
```

- [ ] **Step 5: Commit**

```bash
git add apps/camora/scripts/research/.gitkeep .gitignore
git commit -m "chore: add research pipeline directory and gitignore"
```

---

### Task 2: comparison_render.py — trade-off diagram renderer

**Files:**
- Create: `apps/camora/scripts/comparison_render.py`

This renders a dark-themed two-or-three column comparison diagram (one column per option, pros/cons rows, recommendation banner) as a PNG using Graphviz HTML-like labels.

- [ ] **Step 1: Create `apps/camora/scripts/comparison_render.py`**

```python
"""
Renders trade-off comparison diagrams as dark-themed PNG using Graphviz.

Each diagram has:
  - Title bar across the top
  - One column per option (2 or 3)
  - Pros row (green tint) and cons row (red tint)
  - Recommendation banner at the bottom
"""
from __future__ import annotations

import subprocess
import textwrap
from dataclasses import dataclass, field
from typing import Optional


BG        = "#0d1117"
BORDER    = "#30363d"
TITLE_BG  = "#161b22"
TITLE_FG  = "#e6edf3"
PROS_BG   = "#0a2318"
PROS_FG   = "#3fb950"
CONS_BG   = "#2d0f0f"
CONS_FG   = "#f85149"
REC_BG    = "#0c1a2e"
REC_FG    = "#58a6ff"
OPT_BG    = "#161b22"
OPT_FG    = "#e6edf3"
MONO      = "Courier New"
SANS      = "Arial"


@dataclass
class TradeoffOption:
    name: str
    pros: list[str] = field(default_factory=list)
    cons: list[str] = field(default_factory=list)


@dataclass
class TradeoffDiagram:
    title: str
    options: list[TradeoffOption]
    recommendation: Optional[str] = None


def _wrap(text: str, width: int = 36) -> str:
    """Wrap long text for HTML labels."""
    return "<BR/>".join(textwrap.wrap(text, width=width))


def _bullet_rows(items: list[str], fg: str, bg: str, width: int = 36) -> str:
    rows = "".join(
        f'<TR><TD ALIGN="LEFT" BGCOLOR="{bg}">'
        f'<FONT COLOR="{fg}" FACE="{MONO}" POINT-SIZE="11">• {_wrap(item, width)}</FONT>'
        f"</TD></TR>"
        for item in items
    )
    return rows


def build_dot(diagram: TradeoffDiagram) -> str:
    n = len(diagram.options)
    # Each option column is one record cell in a horizontal table
    col_width = max(36, 110 // n)

    # Build per-option columns as separate nodes, then lay them out in a table
    # We use a single HTML-table node for the whole diagram.

    # Header row
    opt_headers = "".join(
        f'<TD BORDER="1" BGCOLOR="{OPT_BG}" ALIGN="CENTER" WIDTH="{260}">'
        f'<FONT COLOR="{OPT_FG}" FACE="{SANS}" POINT-SIZE="14"><B>{opt.name}</B></FONT>'
        f"</TD>"
        for opt in diagram.options
    )

    # Pros rows
    pros_cells = "".join(
        f'<TD BORDER="1" BGCOLOR="{PROS_BG}" ALIGN="LEFT" VALIGN="TOP">'
        + _bullet_rows(opt.pros or ["—"], PROS_FG, PROS_BG, col_width)
        .replace("<TR>", "").replace("</TR>", "")
        + "</TD>"
        for opt in diagram.options
    )

    # Cons rows
    cons_cells = "".join(
        f'<TD BORDER="1" BGCOLOR="{CONS_BG}" ALIGN="LEFT" VALIGN="TOP">'
        + _bullet_rows(opt.cons or ["—"], CONS_FG, CONS_BG, col_width)
        .replace("<TR>", "").replace("</TR>", "")
        + "</TD>"
        for opt in diagram.options
    )

    rec_row = ""
    if diagram.recommendation:
        rec_row = (
            f'<TR><TD COLSPAN="{n}" BORDER="1" BGCOLOR="{REC_BG}" ALIGN="LEFT">'
            f'<FONT COLOR="{REC_FG}" FACE="{SANS}" POINT-SIZE="12">'
            f"<B>Recommendation:</B> {_wrap(diagram.recommendation, 80)}"
            f"</FONT></TD></TR>"
        )

    label = (
        f'<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="2" BGCOLOR="{BG}">'
        # Title
        f'<TR><TD COLSPAN="{n}" BORDER="1" BGCOLOR="{TITLE_BG}" ALIGN="CENTER">'
        f'<FONT COLOR="{TITLE_FG}" FACE="{SANS}" POINT-SIZE="18"><B>{diagram.title}</B></FONT>'
        f"</TD></TR>"
        # Blank spacer
        f'<TR><TD COLSPAN="{n}" HEIGHT="4" BORDER="0"></TD></TR>'
        # Option headers
        f"<TR>{opt_headers}</TR>"
        # Pros label
        f'<TR>'
        + "".join(
            f'<TD BORDER="1" BGCOLOR="{PROS_BG}" ALIGN="CENTER">'
            f'<FONT COLOR="{PROS_FG}" FACE="{SANS}" POINT-SIZE="11"><B>✓ PROS</B></FONT>'
            f"</TD>"
            for _ in diagram.options
        )
        + f"</TR>"
        # Pros content
        f"<TR>{pros_cells}</TR>"
        # Cons label
        f'<TR>'
        + "".join(
            f'<TD BORDER="1" BGCOLOR="{CONS_BG}" ALIGN="CENTER">'
            f'<FONT COLOR="{CONS_FG}" FACE="{SANS}" POINT-SIZE="11"><B>✗ CONS</B></FONT>'
            f"</TD>"
            for _ in diagram.options
        )
        + f"</TR>"
        # Cons content
        f"<TR>{cons_cells}</TR>"
        + rec_row
        + f"</TABLE>>"
    )

    return (
        f'digraph {{\n'
        f'  graph [bgcolor="{BG}" pad="0.4" dpi="150"]\n'
        f'  node [shape=none margin=0]\n'
        f'  main [label={label}]\n'
        f'}}\n'
    )


def render_to_png(diagram: TradeoffDiagram, output_path: str) -> None:
    """Render a TradeoffDiagram to a PNG file using the local `dot` binary."""
    dot_src = build_dot(diagram)
    result = subprocess.run(
        ["dot", "-Tpng", "-o", output_path],
        input=dot_src.encode("utf-8"),
        capture_output=True,
        timeout=15,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"dot render failed: {result.stderr.decode('utf-8', 'replace')[:400]}"
        )
```

- [ ] **Step 2: Smoke-test comparison_render.py**

```python
# Run from repo root:
python - <<'EOF'
import sys
sys.path.insert(0, 'apps/camora/scripts')
from comparison_render import TradeoffDiagram, TradeoffOption, render_to_png

d = TradeoffDiagram(
    title="301 vs 302 Redirect",
    options=[
        TradeoffOption(
            name="301 Permanent",
            pros=["Browser caches — no repeat server hits", "Reduces load on redirect service"],
            cons=["Cannot track clicks after first visit", "Cannot change destination later"],
        ),
        TradeoffOption(
            name="302 Temporary",
            pros=["Every redirect hits server — full click analytics", "Destination changeable"],
            cons=["Higher server load at scale"],
        ),
    ],
    recommendation="Use 302 for analytics use cases; 301 only for pure redirect with no tracking.",
)
render_to_png(d, "/tmp/test-tradeoff.png")
print("Written to /tmp/test-tradeoff.png")
EOF
```

Expected: `Written to /tmp/test-tradeoff.png`
Then open: `open /tmp/test-tradeoff.png`
Verify: dark background, two columns, green pros, red cons, blue recommendation bar.

- [ ] **Step 3: Commit**

```bash
git add apps/camora/scripts/comparison_render.py
git commit -m "feat(pipeline): add comparison_render.py for trade-off diagrams"
```

---

### Task 3: research-topic.py Phase 1 — transcript fetch + Claude synthesis

**Files:**
- Create: `apps/camora/scripts/research-topic.py`

- [ ] **Step 1: Create `apps/camora/scripts/research-topic.py` with topic query map and transcript extractor**

```python
#!/usr/bin/env python3
"""
Two-phase research pipeline for Camora system design diagrams.

Usage:
  python research-topic.py --phase=research  --topic=url-shortener
  python research-topic.py --phase=generate  --topic=url-shortener
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap
from datetime import date
from pathlib import Path

import anthropic

ROOT       = Path(__file__).resolve().parents[2]          # repo root
SCRIPTS    = Path(__file__).resolve().parent
RESEARCH   = SCRIPTS / "research"
DIAGRAMS   = ROOT / "apps" / "camora" / "public" / "diagrams"
MANIFEST   = ROOT / "apps" / "camora" / "src" / "data" / "capra" / "topics" / "__generated" / "diagram-manifests.ts"

RESEARCH.mkdir(exist_ok=True)

# ── Channel handles (used as keywords in search to bias toward each source) ──
CHANNELS = [
    "ByteByteGo",
    "TechPrepYT",
    "hayk simonyan",
    "designgurus",
    "system design interview",
]

# ── Topic → search queries ────────────────────────────────────────────────────
TOPIC_QUERIES: dict[str, list[str]] = {
    "url-shortener":       ["design url shortener system design", "design tinyurl system design interview"],
    "tiny-url":            ["design tinyurl system design", "url shortener system design"],
    "chat-system":         ["design whatsapp system design interview", "chat system design"],
    "twitter":             ["design twitter system design interview", "design tweet feed system"],
    "instagram":           ["design instagram system design interview", "photo sharing system design"],
    "youtube":             ["design youtube system design interview", "video streaming platform design"],
    "netflix":             ["design netflix system design interview", "video streaming system design"],
    "uber":                ["design uber system design interview", "ride sharing app system design"],
    "dropbox":             ["design dropbox system design interview", "file storage system design"],
    "google-docs":         ["design google docs system design interview", "collaborative document editor design"],
    "facebook-newsfeed":   ["design facebook news feed system design", "social media feed system design"],
    "rate-limiter":        ["design rate limiter system design interview", "api rate limiting system design"],
    "typeahead":           ["design typeahead search system design", "autocomplete system design interview"],
    "notification-system": ["design notification system design interview", "push notification system design"],
    "web-crawler":         ["design web crawler system design interview", "search engine crawler design"],
    "search-engine":       ["design google search system design interview", "web search engine system design"],
    "payment-system":      ["design payment system design interview", "stripe payment system design"],
    "ticketmaster":        ["design ticketmaster system design interview", "event booking system design"],
    "key-value-store":     ["design key value store system design interview", "distributed cache design"],
    "unique-id-generator": ["design unique id generator system design", "distributed id generation snowflake"],
    "pastebin":            ["design pastebin system design interview", "text sharing service design"],
    "yelp":                ["design yelp system design interview", "proximity service system design"],
    "tinder":              ["design tinder system design interview", "dating app system design"],
    "spotify":             ["design spotify system design interview", "music streaming system design"],
    "google-maps":         ["design google maps system design interview", "location service system design"],
    "airbnb":              ["design airbnb system design interview", "hotel booking system design"],
    "doordash":            ["design doordash system design interview", "food delivery system design"],
    "zoom":                ["design zoom system design interview", "video conferencing system design"],
    "linkedin":            ["design linkedin system design interview", "professional network system design"],
    "leaderboard":         ["design leaderboard system design interview", "real time ranking system design"],
    "news-aggregator":     ["design news aggregator system design interview", "rss feed aggregator design"],
    "ad-click-aggregation":["design ad click aggregation system design", "click tracking analytics system"],
    "autocomplete-system": ["design autocomplete system design interview", "typeahead search system design"],
    "metrics-monitoring":  ["design metrics monitoring system design", "observability platform design"],
    "twitter-trends":      ["design trending topics system design", "twitter trending hashtags system design"],
    "distributed-cache":   ["design distributed cache system design", "redis cache system design interview"],
    "top-k-leaderboard":   ["design top k elements system design", "heavy hitters system design interview"],
    "hotel-booking":       ["design hotel booking system design interview", "reservation system design"],
    "ecommerce-platform":  ["design amazon ecommerce system design interview", "online shopping system design"],
    "messaging-app":       ["design messaging app system design interview", "slack chat system design"],
    "payment-gateway":     ["design payment gateway system design interview", "checkout system design"],
    "proximity-service":   ["design proximity service system design", "nearby places system design interview"],
    "web-crawler":         ["design web crawler system design interview", "google search crawler design"],
    "google-drive":        ["design google drive system design interview", "cloud file storage design"],
}


# ── yt-dlp helpers ────────────────────────────────────────────────────────────

def _search_video(query: str) -> str | None:
    """Return a YouTube video ID for the first search result, or None."""
    try:
        result = subprocess.run(
            ["yt-dlp", f"ytsearch1:{query}", "--print", "id", "--no-download",
             "--quiet", "--no-warnings"],
            capture_output=True, text=True, timeout=30,
        )
        vid = result.stdout.strip().split("\n")[0].strip()
        return vid if vid and len(vid) == 11 else None
    except Exception as e:
        print(f"  [warn] search failed for '{query}': {e}", file=sys.stderr)
        return None


def _fetch_transcript(video_id: str) -> str | None:
    """Download auto-captions for a YouTube video ID and return as plain text."""
    with tempfile.TemporaryDirectory() as tmp:
        try:
            subprocess.run(
                [
                    "yt-dlp",
                    f"https://www.youtube.com/watch?v={video_id}",
                    "--write-auto-sub", "--sub-format", "vtt",
                    "--sub-langs", "en",
                    "--skip-download", "--quiet", "--no-warnings",
                    "-o", f"{tmp}/%(id)s",
                ],
                capture_output=True, timeout=60,
            )
            vtt_files = list(Path(tmp).glob("*.vtt"))
            if not vtt_files:
                return None
            raw = vtt_files[0].read_text(encoding="utf-8", errors="replace")
            # Strip VTT headers + timestamps, collapse whitespace
            lines = []
            for line in raw.splitlines():
                if re.match(r"^\d{2}:\d{2}", line) or line.startswith("WEBVTT") or not line.strip():
                    continue
                text = re.sub(r"<[^>]+>", "", line).strip()
                if text:
                    lines.append(text)
            # Deduplicate consecutive identical lines (auto-captions repeat)
            deduped = [lines[0]] if lines else []
            for ln in lines[1:]:
                if ln != deduped[-1]:
                    deduped.append(ln)
            return " ".join(deduped)[:40_000]   # cap at 40k chars
        except Exception as e:
            print(f"  [warn] transcript failed for {video_id}: {e}", file=sys.stderr)
            return None
```

- [ ] **Step 2: Add the `phase_research()` function to research-topic.py**

Append to `apps/camora/scripts/research-topic.py`:

```python
# ── Claude client ─────────────────────────────────────────────────────────────

def _claude() -> anthropic.Anthropic:
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        sys.exit("ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(api_key=key)


# ── Existing asset inventory ───────────────────────────────────────────────────

def _existing_pngs(topic_id: str) -> list[str]:
    d = DIAGRAMS / topic_id
    if not d.exists():
        return []
    return [p.name for p in d.glob("*.png")]


# ── Phase 1: Research ─────────────────────────────────────────────────────────

def phase_research(topic_id: str) -> None:
    queries = TOPIC_QUERIES.get(topic_id)
    if not queries:
        sys.exit(f"Unknown topic '{topic_id}'. Add it to TOPIC_QUERIES.")

    print(f"\n=== Phase 1: Research — {topic_id} ===")

    # Fetch transcripts: one video per channel keyword + one per query
    sources = []
    transcripts = []
    seen_ids: set[str] = set()

    search_combos = []
    for q in queries:
        for ch in CHANNELS:
            search_combos.append((ch, f"{q} {ch}"))
        search_combos.append(("general", q))

    for label, search_q in search_combos:
        print(f"  Searching: {search_q!r} …")
        vid = _search_video(search_q)
        if not vid or vid in seen_ids:
            continue
        seen_ids.add(vid)
        print(f"  Fetching transcript: https://youtube.com/watch?v={vid}")
        transcript = _fetch_transcript(vid)
        if not transcript or len(transcript) < 500:
            print(f"  [skip] no usable transcript for {vid}")
            continue
        sources.append({"channel": label, "video_id": vid, "transcript_chars": len(transcript)})
        transcripts.append(f"--- Source: {label} (video {vid}) ---\n{transcript[:12_000]}\n")
        if len(sources) >= 6:
            break

    if not transcripts:
        sys.exit("No transcripts collected. Check network and yt-dlp installation.")

    print(f"\n  Collected {len(transcripts)} transcripts. Synthesizing with Claude …")

    existing = _existing_pngs(topic_id)
    existing_str = ", ".join(existing) if existing else "none"

    prompt = textwrap.dedent(f"""
        You are an expert system design educator. Analyze these video transcripts about
        "{topic_id}" system design and identify what NEW diagram content should be created.

        EXISTING diagrams already on file (DO NOT recreate these):
        {existing_str}

        TRANSCRIPTS:
        {chr(10).join(transcripts)}

        Your task: identify content that is genuinely missing from the existing diagrams.
        Output ONLY valid JSON in this exact schema — no explanation, no markdown:

        {{
          "deep_dives": [
            {{
              "id": "kebab-case-id",
              "title": "Human Readable Title",
              "description": "One sentence describing what this diagram shows.",
              "components": ["ComponentA", "ComponentB", "ComponentC"]
            }}
          ],
          "tradeoffs": [
            {{
              "id": "kebab-case-id",
              "title": "Option A vs Option B",
              "option_a": {{
                "name": "Short name",
                "pros": ["pro 1", "pro 2"],
                "cons": ["con 1", "con 2"]
              }},
              "option_b": {{
                "name": "Short name",
                "pros": ["pro 1", "pro 2"],
                "cons": ["con 1", "con 2"]
              }},
              "option_c": null,
              "recommendation": "One sentence recommendation."
            }}
          ]
        }}

        Rules:
        - deep_dives: 2-4 items. Each must be a distinct sub-system or data flow not
          already captured by architecture-basic.png or architecture-advanced.png.
        - tradeoffs: 2-3 items. Each must be a binary or ternary design decision with
          clear trade-offs. Skip if a decision diagram already exists in the file list.
        - Keep component names short (2-4 words). Keep pros/cons to one line each.
        - option_c is null unless there are genuinely 3 meaningful options.
    """).strip()

    client = _claude()
    msg = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()

    # Strip markdown fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        synthesis = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[error] Claude returned invalid JSON: {e}\nRaw:\n{raw[:500]}", file=sys.stderr)
        sys.exit(1)

    output = {
        "topic_id": topic_id,
        "researched_at": str(date.today()),
        "sources": sources,
        "synthesis": synthesis,
    }

    out_path = RESEARCH / f"{topic_id}.json"
    out_path.write_text(json.dumps(output, indent=2))
    print(f"\n  Written: {out_path}")
    print(f"  deep_dives: {len(synthesis.get('deep_dives', []))}")
    print(f"  tradeoffs:  {len(synthesis.get('tradeoffs', []))}")
    print(f"\nReview {out_path} before running Phase 2.")
```

- [ ] **Step 3: Test Phase 1 on url-shortener**

```bash
cd /path/to/camora  # repo root
ANTHROPIC_API_KEY=your-key python apps/camora/scripts/research-topic.py --phase=research --topic=url-shortener
```

Expected output:
```
=== Phase 1: Research — url-shortener ===
  Searching: 'design url shortener system design ByteByteGo' …
  Fetching transcript: https://youtube.com/watch?v=...
  ...
  Collected N transcripts. Synthesizing with Claude …
  Written: apps/camora/scripts/research/url-shortener.json
  deep_dives: 2
  tradeoffs: 2

Review apps/camora/scripts/research/url-shortener.json before running Phase 2.
```

- [ ] **Step 4: Inspect the research JSON**

```bash
cat apps/camora/scripts/research/url-shortener.json
```

Verify `synthesis.deep_dives` and `synthesis.tradeoffs` are populated and make sense. The IDs must be kebab-case (e.g., `hash-collision-resolution`, `base62-vs-md5`). If they look wrong, you can edit the JSON manually before Phase 2.

- [ ] **Step 5: Commit research-topic.py (Phase 1 only so far)**

```bash
git add apps/camora/scripts/research-topic.py
git commit -m "feat(pipeline): add research-topic.py Phase 1 — transcript fetch and synthesis"
```

---

### Task 4: research-topic.py Phase 2 — generate PNGs + update manifest

**Files:**
- Modify: `apps/camora/scripts/research-topic.py` (append phase_generate function)
- Create: `apps/camora/src/data/capra/topics/__generated/diagram-manifests.ts`

- [ ] **Step 1: Create the empty manifest file**

Create `apps/camora/src/data/capra/topics/__generated/diagram-manifests.ts`:

```typescript
/* AUTO-GENERATED by apps/camora/scripts/research-topic.py --phase=generate.
   Do not edit by hand. Re-run the script to regenerate. */

type DiagramEntry = { id: string; title: string; file: string };
type TopicDiagrams = { deepDives: DiagramEntry[]; tradeoffs: DiagramEntry[] };

export const GENERATED_DIAGRAMS: Record<string, TopicDiagrams> = {};
```

- [ ] **Step 2: Append `phase_generate()` to research-topic.py**

```python
# ── Phase 2: Generate ─────────────────────────────────────────────────────────

def _generate_dot_for_deep_dive(topic_id: str, entry: dict) -> str:
    """Ask Claude to produce Graphviz DOT source for a deep-dive flow diagram."""
    client = _claude()
    prompt = textwrap.dedent(f"""
        Generate a Graphviz DOT diagram for the following system design deep-dive.
        Topic: {topic_id}
        Diagram title: {entry['title']}
        Description: {entry['description']}
        Key components: {', '.join(entry.get('components', []))}

        Requirements:
        - Dark theme: graph bgcolor="#0d1117", node fillcolor="#161b22", fontcolor="#e6edf3"
        - Edge color="#58a6ff", node style=filled, node color="#30363d"
        - rankdir=LR for flow diagrams
        - Label each edge with the action/data flowing (e.g., "HTTP GET /r/abc")
        - Use subgraphs (cluster_*) to group related components
        - fontname="Courier New" on all nodes and edges
        - Output ONLY valid DOT source, no explanation, no markdown fences.
    """).strip()

    msg = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    dot = msg.content[0].text.strip()
    dot = re.sub(r"^```(?:dot|graphviz)?\s*", "", dot)
    dot = re.sub(r"\s*```$", "", dot)
    return dot


def _render_dot_to_png(dot_src: str, output_path: Path) -> None:
    result = subprocess.run(
        ["dot", "-Tpng", "-Gdpi=150", "-o", str(output_path)],
        input=dot_src.encode("utf-8"),
        capture_output=True,
        timeout=20,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.decode("utf-8", "replace")[:400])


def _update_manifest(topic_id: str, deep_dives: list[dict], tradeoffs: list[dict]) -> None:
    """Read diagram-manifests.ts, merge new entries, write back."""
    content = MANIFEST.read_text(encoding="utf-8")

    # Extract existing dict body between the outermost { }
    match = re.search(r"export const GENERATED_DIAGRAMS[^=]*=\s*(\{.*\});", content, re.DOTALL)
    existing: dict = {}
    if match:
        try:
            # Convert TS object literal to JSON (replace single-line comments, trailing commas)
            body = match.group(1)
            body = re.sub(r"//[^\n]*", "", body)
            body = re.sub(r",\s*([}\]])", r"\1", body)
            existing = json.loads(body)
        except Exception:
            existing = {}

    existing[topic_id] = {
        "deepDives": [
            {"id": d["id"], "title": d["title"], "file": f"deep-dive-{d['id']}.png"}
            for d in deep_dives
        ],
        "tradeoffs": [
            {"id": t["id"], "title": t["title"], "file": f"tradeoff-{t['id']}.png"}
            for t in tradeoffs
        ],
    }

    entries = ""
    for tid, data in sorted(existing.items()):
        dd = json.dumps(data["deepDives"], indent=4)
        tr = json.dumps(data["tradeoffs"], indent=4)
        entries += f"  '{tid}': {{\n    deepDives: {dd},\n    tradeoffs: {tr},\n  }},\n"

    new_content = (
        "/* AUTO-GENERATED by apps/camora/scripts/research-topic.py --phase=generate.\n"
        "   Do not edit by hand. Re-run the script to regenerate. */\n\n"
        "type DiagramEntry = { id: string; title: string; file: string };\n"
        "type TopicDiagrams = { deepDives: DiagramEntry[]; tradeoffs: DiagramEntry[] };\n\n"
        f"export const GENERATED_DIAGRAMS: Record<string, TopicDiagrams> = {{\n{entries}}};\n"
    )
    MANIFEST.write_text(new_content, encoding="utf-8")
    print(f"  Manifest updated: {MANIFEST}")


def phase_generate(topic_id: str) -> None:
    research_path = RESEARCH / f"{topic_id}.json"
    if not research_path.exists():
        sys.exit(f"No research file found for '{topic_id}'. Run --phase=research first.")

    data = json.loads(research_path.read_text())
    synthesis = data["synthesis"]
    topic_dir = DIAGRAMS / topic_id
    topic_dir.mkdir(exist_ok=True)

    generated_dd: list[dict] = []
    generated_tr: list[dict] = []

    # ── Deep-dive diagrams ────────────────────────────────────────────────────
    for entry in synthesis.get("deep_dives", []):
        out_png = topic_dir / f"deep-dive-{entry['id']}.png"
        if out_png.exists():
            print(f"  [skip] {out_png.name} already exists")
            generated_dd.append(entry)
            continue
        print(f"  Generating deep-dive: {entry['title']} …")
        try:
            dot = _generate_dot_for_deep_dive(topic_id, entry)
            _render_dot_to_png(dot, out_png)
            print(f"  Written: {out_png.name}")
            generated_dd.append(entry)
        except Exception as e:
            print(f"  [error] {entry['id']}: {e}", file=sys.stderr)

    # ── Trade-off comparison diagrams ─────────────────────────────────────────
    sys.path.insert(0, str(SCRIPTS))
    from comparison_render import TradeoffDiagram, TradeoffOption, render_to_png

    for entry in synthesis.get("tradeoffs", []):
        out_png = topic_dir / f"tradeoff-{entry['id']}.png"
        if out_png.exists():
            print(f"  [skip] {out_png.name} already exists")
            generated_tr.append(entry)
            continue
        print(f"  Generating trade-off: {entry['title']} …")
        try:
            options = []
            for key in ("option_a", "option_b", "option_c"):
                opt = entry.get(key)
                if opt:
                    options.append(TradeoffOption(
                        name=opt["name"],
                        pros=opt.get("pros", []),
                        cons=opt.get("cons", []),
                    ))
            diagram = TradeoffDiagram(
                title=entry["title"],
                options=options,
                recommendation=entry.get("recommendation"),
            )
            render_to_png(diagram, str(out_png))
            print(f"  Written: {out_png.name}")
            generated_tr.append(entry)
        except Exception as e:
            print(f"  [error] {entry['id']}: {e}", file=sys.stderr)

    _update_manifest(topic_id, generated_dd, generated_tr)
    print(f"\n=== Done: {len(generated_dd)} deep-dives, {len(generated_tr)} trade-offs ===")
```

- [ ] **Step 3: Add the CLI entry point at the bottom of research-topic.py**

```python
# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Research-driven diagram pipeline")
    parser.add_argument("--phase",  choices=["research", "generate"], required=True)
    parser.add_argument("--topic",  required=True, help="Topic ID, e.g. url-shortener")
    args = parser.parse_args()

    if args.phase == "research":
        phase_research(args.topic)
    else:
        phase_generate(args.topic)
```

- [ ] **Step 4: Run Phase 2 on url-shortener**

```bash
ANTHROPIC_API_KEY=your-key python apps/camora/scripts/research-topic.py --phase=generate --topic=url-shortener
```

Expected:
```
  Generating deep-dive: Hash Collision Resolution …
  Written: deep-dive-hash-collision-resolution.png
  Generating deep-dive: Click Analytics Pipeline …
  Written: deep-dive-analytics-pipeline.png
  Generating trade-off: Base62 vs MD5 vs UUID …
  Written: tradeoff-base62-vs-md5-vs-uuid.png
  ...
  Manifest updated: .../diagram-manifests.ts
  === Done: 2 deep-dives, 2 trade-offs ===
```

- [ ] **Step 5: Inspect the generated PNGs**

```bash
open apps/camora/public/diagrams/url-shortener/deep-dive-hash-collision-resolution.png
open apps/camora/public/diagrams/url-shortener/tradeoff-base62-vs-md5-vs-uuid.png
```

Verify: dark background, legible text, correct layout. If a PNG looks wrong, delete it and re-run Phase 2 (it skips existing files so only the deleted one re-generates).

- [ ] **Step 6: Commit Phase 2 + manifest**

```bash
git add apps/camora/scripts/research-topic.py \
        apps/camora/src/data/capra/topics/__generated/diagram-manifests.ts \
        apps/camora/public/diagrams/url-shortener/deep-dive-*.png \
        apps/camora/public/diagrams/url-shortener/tradeoff-*.png
git commit -m "feat(pipeline): add research-topic.py Phase 2 + pilot url-shortener diagrams"
```

---

### Task 5: Frontend — wire GENERATED_DIAGRAMS into TopicDetail.jsx

**Files:**
- Modify: `apps/camora/src/components/capra/docs/TopicDetail.jsx` (lines 13, ~630, ~1954)

- [ ] **Step 1: Add import at line 13 of TopicDetail.jsx**

Find:
```js
import { GENERATED_LAYERED_DESIGN } from '../../../data/capra/topics/__generated/layered-design';
```

Add immediately after:
```js
import { GENERATED_DIAGRAMS } from '../../../data/capra/topics/__generated/diagram-manifests';
```

- [ ] **Step 2: Add generated diagram nav items in the OnThisPage section (around line 636)**

Find the block:
```js
if (topicDetails.layeredDesign) s.push({ id: 'layered-design', label: 'Layered Design', children: topicDetails.layeredDesign.slice(0, 5).map(l => trunc(l.name)) });
```

Add immediately after:
```js
const _genDiagrams = GENERATED_DIAGRAMS[topicDetails.id || selectedTopic];
if (_genDiagrams?.deepDives?.length)  s.push({ id: 'deep-dives',       label: 'Deep Dives',       children: _genDiagrams.deepDives.map(d => trunc(d.title, 30)) });
if (_genDiagrams?.tradeoffs?.length)  s.push({ id: 'design-decisions',  label: 'Design Decisions', children: _genDiagrams.tradeoffs.map(t => trunc(t.title, 30)) });
```

- [ ] **Step 3: Add the Deep Dives + Design Decisions render sections**

Find the comment line (around line 1954):
```jsx
{/* 5c. Basic + Advanced Implementation — right after layered design, before flows */}
```

Insert immediately before it:

```jsx
              {/* 5b-extra. Deep Dives — generated by research pipeline */}
              {(() => {
                const gen = GENERATED_DIAGRAMS[topicDetails.id || selectedTopic];
                if (!gen?.deepDives?.length) return null;
                return (
                  <div id="deep-dives" className="scroll-mt-24 mt-14">
                    <ContentHeading
                      title="Deep Dives"
                      actions={<GlassPill>{gen.deepDives.length}</GlassPill>}
                    />
                    <div className="space-y-8 mt-4">
                      {gen.deepDives.map(d => (
                        <div key={d.id}>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2 landing-mono uppercase tracking-widest">{d.title}</p>
                          <TopicDiagram
                            topicId={topicDetails.id || selectedTopic}
                            kind={`deep-dive-${d.id}`}
                            alt={d.title}
                            caption={d.title}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 5b-extra. Design Decisions — generated by research pipeline */}
              {(() => {
                const gen = GENERATED_DIAGRAMS[topicDetails.id || selectedTopic];
                if (!gen?.tradeoffs?.length) return null;
                return (
                  <div id="design-decisions" className="scroll-mt-24 mt-14">
                    <ContentHeading
                      title="Design Decisions"
                      actions={<GlassPill>{gen.tradeoffs.length}</GlassPill>}
                    />
                    <div className="space-y-8 mt-4">
                      {gen.tradeoffs.map(t => (
                        <div key={t.id}>
                          <p className="text-[11px] font-bold text-[var(--text-muted)] mb-2 landing-mono uppercase tracking-widest">{t.title}</p>
                          <TopicDiagram
                            topicId={topicDetails.id || selectedTopic}
                            kind={`tradeoff-${t.id}`}
                            alt={t.title}
                            caption={t.title}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
cd apps/camora && npx vite build 2>&1 | tail -6
```

Expected: `✓ built in X.XXs` with no TypeScript errors.

- [ ] **Step 5: Start dev server and verify the url-shortener topic page**

```bash
pnpm dev:camora
```

Navigate to: `http://localhost:3000/capra/prepare` → System Design → URL Shortener

Verify:
- "Deep Dives" section appears with the generated PNGs
- "Design Decisions" section appears with trade-off comparison PNGs
- Both appear in the OnThisPage sidebar nav
- No duplication with existing architecture-basic / architecture-advanced sections

- [ ] **Step 6: Commit frontend integration**

```bash
git add apps/camora/src/components/capra/docs/TopicDetail.jsx
git commit -m "feat(frontend): wire GENERATED_DIAGRAMS into TopicDetail — Deep Dives + Design Decisions sections"
```

---

### Task 6: Push, deploy, and run remaining topics

**Files:** No new files — deploy and pipeline execution.

- [ ] **Step 1: Push and deploy**

```bash
git push origin main && vercel --prod 2>&1 | tail -3
```

- [ ] **Step 2: Verify the url-shortener pilot on production**

Open `https://camora.cariara.com/capra/prepare` → System Design → URL Shortener.
Confirm new sections render correctly in production.

- [ ] **Step 3: Run the full pipeline for remaining high-priority topics**

Run in sequence (each takes ~5-10 min for Phase 1, ~2 min for Phase 2):

```bash
for topic in chat-system twitter instagram youtube netflix uber dropbox google-docs rate-limiter typeahead; do
  echo "=== $topic ==="
  ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY python apps/camora/scripts/research-topic.py --phase=research --topic=$topic
  ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY python apps/camora/scripts/research-topic.py --phase=generate --topic=$topic
done
```

- [ ] **Step 4: Commit all generated diagrams and updated manifest**

```bash
git add apps/camora/public/diagrams/*/deep-dive-*.png \
        apps/camora/public/diagrams/*/tradeoff-*.png \
        apps/camora/src/data/capra/topics/__generated/diagram-manifests.ts
git commit -m "feat(diagrams): add deep-dive and trade-off diagrams for 10 system design topics"
git push origin main && vercel --prod 2>&1 | tail -3
```
