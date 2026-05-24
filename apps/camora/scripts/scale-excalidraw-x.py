#!/usr/bin/env python3
"""
Scale all excalidraw source files to 80% of current horizontal width.
Only x positions and widths are scaled — y positions, heights, and font sizes are unchanged.
"""
import json
import glob
from pathlib import Path

DIAGRAMS_ROOT = Path(__file__).resolve().parent.parent / "public" / "diagrams"
FACTOR = 0.8


def scale_element(el: dict) -> dict:
    e = dict(el)
    if "x" in e:
        e["x"] = round(e["x"] * FACTOR, 1)
    if "width" in e:
        e["width"] = round(e["width"] * FACTOR, 1)
    if "points" in e:
        e["points"] = [[round(p[0] * FACTOR, 1), p[1]] for p in e["points"]]
    return e


def process_file(path: Path):
    data = json.loads(path.read_text(encoding="utf-8"))
    data["elements"] = [scale_element(el) for el in data.get("elements", [])]
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  scaled: {path.relative_to(DIAGRAMS_ROOT)}")


files = sorted(DIAGRAMS_ROOT.rglob("*.excalidraw"))
print(f"Processing {len(files)} excalidraw files at {FACTOR*100:.0f}% horizontal scale...")
for f in files:
    process_file(f)
print("Done.")
