#!/usr/bin/env python3
"""
Auto-fix common layout issues across all excalidraw source files:
  1. Text wider than container box → reduce text width to fit with 15px margin
  2. Text taller than container box → reduce fontSize proportionally
  3. Arrows starting inside a box → move start point to nearest box edge
  4. Diagonal arrows (both dx≠0 and dy≠0) → snap to dominant axis
  5. Arrow end point inside a box → move to nearest box edge

Run after scale-excalidraw-x.py.
"""
import json, math
from pathlib import Path

DIAGRAMS = Path(__file__).resolve().parent.parent / "public" / "diagrams"
MARGIN = 15.0  # minimum gap between text edge and box edge


def rects(elements):
    return [e for e in elements if e["type"] == "rectangle" and not e.get("isDeleted")]


def find_container(el, boxes):
    """Find smallest rectangle that contains this element's top-left corner."""
    candidates = []
    ex, ey = el["x"], el.get("y", 0)
    for b in boxes:
        if (b["x"] <= ex < b["x"] + b["width"] and
                b["y"] <= ey < b["y"] + b["height"]):
            candidates.append(b)
    if not candidates:
        return None
    return min(candidates, key=lambda b: b["width"] * b["height"])


def fix_text_overflow(el, container):
    changed = False
    max_w = container["width"] - 2 * MARGIN
    max_h = container["height"] - 2 * MARGIN

    # Fix horizontal overflow
    if el.get("width", 0) > max_w + 2:
        el["width"] = max(max_w, 60)
        changed = True

    # Fix vertical overflow: reduce fontSize
    text = el.get("text", "")
    lines = text.count("\n") + 1
    fs = el.get("fontSize", 14)
    est_line_h = fs * 1.5
    est_h = lines * est_line_h
    if est_h > max_h and lines > 0 and max_h > 10:
        new_fs = max(10, int((max_h / lines) / 1.5))
        if new_fs < fs:
            el["fontSize"] = new_fs
            changed = True

    return changed


def find_box_at_point(x, y, boxes):
    """Return box that contains point (x, y)."""
    for b in boxes:
        if (b["x"] < x < b["x"] + b["width"] and
                b["y"] < y < b["y"] + b["height"]):
            return b
    return None


def nearest_edge(x, y, box):
    """Find nearest edge of box to point (x,y). Returns (edge_x, edge_y, 'h'|'v')."""
    # distances to each edge
    dist_left   = abs(x - box["x"])
    dist_right  = abs(x - (box["x"] + box["width"]))
    dist_top    = abs(y - box["y"])
    dist_bottom = abs(y - (box["y"] + box["height"]))
    mn = min(dist_left, dist_right, dist_top, dist_bottom)
    if mn == dist_left:
        return box["x"], y, "h"
    elif mn == dist_right:
        return box["x"] + box["width"], y, "h"
    elif mn == dist_top:
        return x, box["y"], "v"
    else:
        return x, box["y"] + box["height"], "v"


def fix_arrow(el, boxes):
    pts = el.get("points", [])
    if len(pts) < 2:
        return False
    changed = False

    # Absolute start and end
    sx, sy = el["x"] + pts[0][0], el.get("y", 0) + pts[0][1]
    ex2, ey2 = el["x"] + pts[-1][0], el.get("y", 0) + pts[-1][1]

    # Fix start inside a box
    start_box = find_box_at_point(sx, sy, boxes)
    if start_box:
        nx, ny, _ = nearest_edge(sx, sy, start_box)
        el["x"] = nx - pts[0][0]
        el["y"] = ny - pts[0][1]
        sx, sy = nx, ny
        changed = True

    # Fix end inside a box
    end_box = find_box_at_point(ex2, ey2, boxes)
    if end_box:
        nx, ny, _ = nearest_edge(ex2, ey2, end_box)
        dx = pts[-1][0]
        dy = pts[-1][1]
        # Adjust last point so absolute end = (nx, ny)
        pts[-1][0] = nx - el["x"]
        pts[-1][1] = ny - el.get("y", 0)
        el["points"] = pts
        el["width"] = abs(pts[-1][0] - pts[0][0])
        el["height"] = abs(pts[-1][1] - pts[0][1])
        ex2, ey2 = nx, ny
        changed = True

    # Snap diagonal arrows to dominant axis (for 2-point arrows only)
    if len(pts) == 2:
        p0, p1 = pts[0], pts[1]
        dx = p1[0] - p0[0]
        dy = p1[1] - p0[1]
        # Only snap if both components are significant
        if abs(dx) > 5 and abs(dy) > 5:
            if abs(dx) >= abs(dy):
                # Dominant horizontal: zero out dy
                pts[1][1] = pts[0][1]
                el["height"] = 0
            else:
                # Dominant vertical: zero out dx
                pts[1][0] = pts[0][0]
                el["width"] = 0
            el["points"] = pts
            changed = True

    return changed


def process_file(path: Path) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    elements = data.get("elements", [])
    boxes = rects(elements)
    fixes = 0

    for el in elements:
        if el.get("isDeleted"):
            continue
        if el["type"] == "text":
            container = find_container(el, boxes)
            if container:
                if fix_text_overflow(el, container):
                    fixes += 1
        elif el["type"] == "arrow":
            if fix_arrow(el, boxes):
                fixes += 1

    if fixes:
        data["elements"] = elements
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return fixes


files = sorted(DIAGRAMS.rglob("*.excalidraw"))
# Skip twitter archive
files = [f for f in files if "_excalidraw-archive" not in str(f)]
total = 0
for f in files:
    n = process_file(f)
    if n:
        print(f"  {n:3d} fixes: {f.relative_to(DIAGRAMS)}")
    total += n
print(f"\nTotal fixes applied: {total} across {len(files)} files.")
