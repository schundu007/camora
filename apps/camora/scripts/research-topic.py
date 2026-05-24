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

ROOT       = Path(__file__).resolve().parents[3]          # repo root (scripts/ → camora/ → apps/ → root)

# yt-dlp may be installed as a module only (pip3 install without script in PATH)
YT_DLP = ["python3", "-m", "yt_dlp"]
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
    "url-shortener":        ["design url shortener system design", "design tinyurl system design interview"],
    "tiny-url":             ["design tinyurl system design", "url shortener system design"],
    "chat-system":          ["design whatsapp system design interview", "chat system design"],
    "twitter":              ["design twitter system design interview", "design tweet feed system"],
    "instagram":            ["design instagram system design interview", "photo sharing system design"],
    "youtube":              ["design youtube system design interview", "video streaming platform design"],
    "netflix":              ["design netflix system design interview", "video streaming system design"],
    "uber":                 ["design uber system design interview", "ride sharing app system design"],
    "dropbox":              ["design dropbox system design interview", "file storage system design"],
    "google-docs":          ["design google docs system design interview", "collaborative document editor design"],
    "facebook-newsfeed":    ["design facebook news feed system design", "social media feed system design"],
    "rate-limiter":         ["design rate limiter system design interview", "api rate limiting system design"],
    "typeahead":            ["design typeahead search system design", "autocomplete system design interview"],
    "notification-system":  ["design notification system design interview", "push notification system design"],
    "web-crawler":          ["design web crawler system design interview", "search engine crawler design"],
    "search-engine":        ["design google search system design interview", "web search engine system design"],
    "payment-system":       ["design payment system design interview", "stripe payment system design"],
    "ticketmaster":         ["design ticketmaster system design interview", "event booking system design"],
    "key-value-store":      ["design key value store system design interview", "distributed cache design"],
    "unique-id-generator":  ["design unique id generator system design", "distributed id generation snowflake"],
    "pastebin":             ["design pastebin system design interview", "text sharing service design"],
    "yelp":                 ["design yelp system design interview", "proximity service system design"],
    "tinder":               ["design tinder system design interview", "dating app system design"],
    "spotify":              ["design spotify system design interview", "music streaming system design"],
    "google-maps":          ["design google maps system design interview", "location service system design"],
    "airbnb":               ["design airbnb system design interview", "hotel booking system design"],
    "doordash":             ["design doordash system design interview", "food delivery system design"],
    "zoom":                 ["design zoom system design interview", "video conferencing system design"],
    "linkedin":             ["design linkedin system design interview", "professional network system design"],
    "leaderboard":          ["design leaderboard system design interview", "real time ranking system design"],
    "news-aggregator":      ["design news aggregator system design interview", "rss feed aggregator design"],
    "ad-click-aggregation": ["design ad click aggregation system design", "click tracking analytics system"],
    "autocomplete-system":  ["design autocomplete system design interview", "typeahead search system design"],
    "metrics-monitoring":   ["design metrics monitoring system design", "observability platform design"],
    "twitter-trends":       ["design trending topics system design", "twitter trending hashtags system design"],
    "distributed-cache":    ["design distributed cache system design", "redis cache system design interview"],
    "top-k-leaderboard":    ["design top k elements system design", "heavy hitters system design interview"],
    "hotel-booking":        ["design hotel booking system design interview", "reservation system design"],
    "ecommerce-platform":   ["design amazon ecommerce system design interview", "online shopping system design"],
    "messaging-app":        ["design messaging app system design interview", "slack chat system design"],
    "payment-gateway":      ["design payment gateway system design interview", "checkout system design"],
    "proximity-service":    ["design proximity service system design", "nearby places system design interview"],
    "google-drive":         ["design google drive system design interview", "cloud file storage design"],
}


# ── yt-dlp helpers ────────────────────────────────────────────────────────────

def _search_video(query: str) -> str | None:
    """Return a YouTube video ID for the first search result, or None."""
    try:
        result = subprocess.run(
            YT_DLP + [f"ytsearch1:{query}", "--print", "id", "--no-download",
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
                YT_DLP + [
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
            lines = []
            for line in raw.splitlines():
                if re.match(r"^\d{2}:\d{2}", line) or line.startswith("WEBVTT") or not line.strip():
                    continue
                text = re.sub(r"<[^>]+>", "", line).strip()
                if text:
                    lines.append(text)
            deduped = [lines[0]] if lines else []
            for ln in lines[1:]:
                if ln != deduped[-1]:
                    deduped.append(ln)
            return " ".join(deduped)[:40_000]
        except Exception as e:
            print(f"  [warn] transcript failed for {video_id}: {e}", file=sys.stderr)
            return None


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
    if topic_id not in TOPIC_QUERIES:
        sys.exit(f"Unknown topic '{topic_id}'. Add it to TOPIC_QUERIES.")

    print(f"\n=== Phase 1: Research — {topic_id} ===")
    print(f"  Synthesizing with Claude …")

    existing = _existing_pngs(topic_id)
    existing_str = ", ".join(existing) if existing else "none"

    # Human-readable topic name for the prompt (convert kebab to words)
    topic_name = topic_id.replace("-", " ").title()

    prompt = textwrap.dedent(f"""
        You are a world-class system design educator and technical interviewer with deep
        expertise in distributed systems. Your job is to identify which additional
        diagrams would make a "{topic_name}" system design study page truly complete
        and comprehensive for engineers preparing for senior/staff-level interviews.

        EXISTING diagrams already on the page (do NOT recreate these):
        {existing_str}

        Based on your comprehensive knowledge of {topic_name} system design — covering
        all aspects discussed in top system design resources and interview prep courses —
        identify the most important content that is genuinely MISSING from the existing diagrams.

        Focus on:
        1. Deep-dive diagrams for specific sub-systems or critical data flows that
           interviewers commonly probe (e.g., hash collision resolution, analytics pipeline,
           cache invalidation, consistency protocols, failure recovery).
        2. Trade-off comparison diagrams for the key binary/ternary design decisions
           engineers must explain clearly (e.g., SQL vs NoSQL, push vs pull, CDN strategies,
           sharding approaches, consistency vs availability).

        Output ONLY valid JSON in this exact schema — no explanation, no markdown fences:

        {{
          "deep_dives": [
            {{
              "id": "kebab-case-id",
              "title": "Human Readable Title",
              "description": "One sentence describing the sub-system or data flow this diagram shows.",
              "components": ["ComponentA", "ComponentB", "ComponentC", "ComponentD"]
            }}
          ],
          "tradeoffs": [
            {{
              "id": "kebab-case-id",
              "title": "Option A vs Option B",
              "option_a": {{
                "name": "Short name (3-5 words)",
                "pros": ["pro 1 — one concise line", "pro 2 — one concise line"],
                "cons": ["con 1 — one concise line", "con 2 — one concise line"]
              }},
              "option_b": {{
                "name": "Short name (3-5 words)",
                "pros": ["pro 1 — one concise line", "pro 2 — one concise line"],
                "cons": ["con 1 — one concise line", "con 2 — one concise line"]
              }},
              "option_c": null,
              "recommendation": "One authoritative sentence on which to choose and when."
            }}
          ]
        }}

        Rules:
        - deep_dives: exactly 3 items. Each must be a distinct, important sub-system not
          already shown in architecture-basic.png or architecture-advanced.png.
        - tradeoffs: exactly 3 items. Each must be a genuine engineering decision with
          real trade-offs that a senior engineer must be able to articulate.
        - option_c: include only when there are genuinely 3 meaningful options (not just
          variations of the same approach).
        - Keep component names short (2-4 words max).
        - Pros/cons: one clear, specific line each — no vague platitudes.
    """).strip()

    client = _claude()
    msg = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()

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
        "sources": ["claude-opus-4-7 synthesis"],
        "synthesis": synthesis,
    }

    out_path = RESEARCH / f"{topic_id}.json"
    out_path.write_text(json.dumps(output, indent=2))
    print(f"\n  Written: {out_path}")
    print(f"  deep_dives: {len(synthesis.get('deep_dives', []))}")
    print(f"  tradeoffs:  {len(synthesis.get('tradeoffs', []))}")
    print(f"\nReview {out_path} before running Phase 2.")


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

        STRICT layout rules — follow all of these exactly:
        - graph attrs: bgcolor="#0d1117" rankdir=LR splines=ortho nodesep=1.0 ranksep=1.6 pad=0.6 dpi=150
        - node attrs: style="filled,rounded" shape=box fillcolor="#0f2744" color="#3b82f6" fontcolor="white" fontname="Arial" fontsize=14 margin="0.35,0.2"
        - edge attrs: color="#60a5fa" fontcolor="#cbd5e1" fontname="Arial" fontsize=12 penwidth=1.5
        - NEVER draw bidirectional arrows (a -> b AND b -> a). Pick one direction only.
        - Max 10 edges total. Show only the critical data flow path.
        - Edge labels must be SHORT — 3-5 words max, no parentheses.
        - No more than 2 subgraphs (cluster_*). Only use subgraphs for truly co-located components.
        - At least 3 nodes must be at the same rank — use {{ rank=same; A; B; C; }} OUTSIDE any cluster, never inside.
        - NEVER put rank=same inside a cluster/subgraph — it causes Graphviz assertion errors.
        - Subgraph style: style=filled bgcolor="#0a1628" color="#3b82f6" fontcolor="#93c5fd" fontname="Arial" fontsize=12
        - Output ONLY valid DOT source — no explanation, no markdown fences, no comments.
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

    match = re.search(r"export const GENERATED_DIAGRAMS[^=]*=\s*(\{.*\});", content, re.DOTALL)
    existing: dict = {}
    if match:
        try:
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
        clean_id = entry['id'].removeprefix('deep-dive-')
        entry = {**entry, 'id': clean_id}
        out_png = topic_dir / f"deep-dive-{clean_id}.png"
        if out_png.exists():
            print(f"  [skip] {out_png.name} already exists")
            generated_dd.append(entry)
            continue
        print(f"  Generating deep-dive: {entry['title']} …")
        success = False
        for attempt in range(3):
            try:
                dot = _generate_dot_for_deep_dive(topic_id, entry)
                _render_dot_to_png(dot, out_png)
                print(f"  Written: {out_png.name}")
                generated_dd.append(entry)
                success = True
                break
            except Exception as e:
                if attempt < 2:
                    print(f"  [retry {attempt+1}] {entry['id']}: {str(e)[:80]}", file=sys.stderr)
                else:
                    print(f"  [error] {entry['id']}: {e}", file=sys.stderr)

    # ── Trade-off comparison diagrams ─────────────────────────────────────────
    sys.path.insert(0, str(SCRIPTS))
    from comparison_render import TradeoffDiagram, TradeoffOption, render_to_png

    for entry in synthesis.get("tradeoffs", []):
        clean_id = entry['id'].removeprefix('tradeoff-')
        entry = {**entry, 'id': clean_id}
        out_png = topic_dir / f"tradeoff-{clean_id}.png"
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


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Research-driven diagram pipeline")
    parser.add_argument("--phase", choices=["research", "generate"], required=True)
    parser.add_argument("--topic", required=True, help="Topic ID, e.g. url-shortener")
    args = parser.parse_args()

    if args.phase == "research":
        phase_research(args.topic)
    else:
        phase_generate(args.topic)
