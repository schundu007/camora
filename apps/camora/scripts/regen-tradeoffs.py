"""Regenerate all trade-off comparison PNGs from the persisted research JSON
using the (restyled) comparison_render. No LLM calls — pure re-render."""
import json
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from comparison_render import TradeoffDiagram, TradeoffOption, render_to_png

RESEARCH = SCRIPTS / "research"
DIAGRAMS = SCRIPTS.parent / "public" / "diagrams"

wrote, skipped = 0, 0
for jf in sorted(RESEARCH.glob("*.json")):
    d = json.loads(jf.read_text())
    topic_id = d.get("topic_id") or jf.stem
    tradeoffs = (d.get("synthesis") or {}).get("tradeoffs") or []
    topic_dir = DIAGRAMS / topic_id
    if not topic_dir.exists():
        continue  # topic has no generated diagram folder — leave it alone
    for entry in tradeoffs:
        clean_id = str(entry["id"]).removeprefix("tradeoff-")
        options = []
        for key in ("option_a", "option_b", "option_c"):
            opt = entry.get(key)
            if opt:
                options.append(TradeoffOption(
                    name=opt["name"], pros=opt.get("pros", []), cons=opt.get("cons", []),
                ))
        if not options:
            skipped += 1
            continue
        diagram = TradeoffDiagram(
            title=entry["title"], options=options, recommendation=entry.get("recommendation"),
        )
        out_png = topic_dir / f"tradeoff-{clean_id}.png"
        try:
            render_to_png(diagram, str(out_png))
            wrote += 1
        except Exception as e:
            print(f"  [error] {topic_id}/{clean_id}: {e}", file=sys.stderr)
            skipped += 1

print(f"regenerated {wrote} tradeoff PNGs ({skipped} skipped)")
