"""Render every spec in scripts/specs/*.json to the production diagram paths
for all three providers: public/diagrams/<topic>/eraser-<provider>.png."""
import json
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
from diagram_render import render

SPECS = SCRIPTS / "specs"
DIAGRAMS = SCRIPTS.parent / "public" / "diagrams"

ok, fail = 0, 0
for spec_file in sorted(SPECS.glob("*.json")):
    topic = spec_file.stem
    try:
        spec = json.loads(spec_file.read_text())
    except Exception as e:
        print(f"[bad json] {topic}: {e}", file=sys.stderr)
        fail += 1
        continue
    out_dir = DIAGRAMS / topic
    out_dir.mkdir(parents=True, exist_ok=True)
    for provider in ("aws", "azure", "gcp"):
        try:
            render(spec, provider, str(out_dir / f"eraser-{provider}"))
            ok += 1
        except Exception as e:
            print(f"[render fail] {topic}/{provider}: {e}", file=sys.stderr)
            fail += 1

print(f"rendered {ok} PNGs across {len(list(SPECS.glob('*.json')))} topics ({fail} failures)")
