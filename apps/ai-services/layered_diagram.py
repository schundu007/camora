"""
Pure-Graphviz renderer for Camora's "Layered Design" topic diagrams.

Each layer is a single HTML-table node (guarantees clean top-to-bottom
stacking without compound-edge drift). The table has three rows:
  1. Colored header band  — bold layer name, white text
  2. Purpose row          — italic muted description (BR-wrapped)
  3. Component chips row  — rounded colored pills, fixed-width cells

Usage:
    python3 layered_diagram.py layered <out_path.png> < spec.json
    python3 layered_diagram.py flow    <out_path.png> < spec.json
"""

from __future__ import annotations

import json
import sys
import textwrap
from pathlib import Path

import graphviz


BG_GRAPH    = "#f8fafc"
ARROW_COLOR = "#94a3b8"

FONT_HEADING = "Helvetica-Bold"
FONT_BODY    = "Helvetica"

_LAYER_PALETTES = [
    {
        "band_bg":    "#1d4ed8",   "band_fg":   "#ffffff",
        "layer_bg":   "#eff6ff",   "layer_bd":  "#3b82f6",
        "comp_bg":    "#dbeafe",   "comp_bd":   "#3b82f6",  "comp_fg":  "#1e3a5f",
        "purpose_fg": "#3b6cb7",
    },
    {
        "band_bg":    "#15803d",   "band_fg":   "#ffffff",
        "layer_bg":   "#f0fdf4",   "layer_bd":  "#22c55e",
        "comp_bg":    "#dcfce7",   "comp_bd":   "#16a34a",  "comp_fg":  "#14532d",
        "purpose_fg": "#166534",
    },
    {
        "band_bg":    "#b45309",   "band_fg":   "#ffffff",
        "layer_bg":   "#fffbeb",   "layer_bd":  "#f59e0b",
        "comp_bg":    "#fef3c7",   "comp_bd":   "#d97706",  "comp_fg":  "#78350f",
        "purpose_fg": "#92400e",
    },
    {
        "band_bg":    "#7c3aed",   "band_fg":   "#ffffff",
        "layer_bg":   "#fdf4ff",   "layer_bd":  "#a855f7",
        "comp_bg":    "#f3e8ff",   "comp_bd":   "#9333ea",  "comp_fg":  "#581c87",
        "purpose_fg": "#6d28d9",
    },
    {
        "band_bg":    "#be123c",   "band_fg":   "#ffffff",
        "layer_bg":   "#fff1f2",   "layer_bd":  "#f43f5e",
        "comp_bg":    "#ffe4e6",   "comp_bd":   "#e11d48",  "comp_fg":  "#881337",
        "purpose_fg": "#9f1239",
    },
]

# Minimum component cell width (points). Prevents slivers when many comps.
_COMP_CELL_W = 170


def _esc(s: str) -> str:
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;"))


def _br_wrap(text: str, width: int = 72) -> str:
    """Wrap text into Graphviz HTML <BR/> lines."""
    return "<BR/>".join(_esc(l) for l in textwrap.wrap(text, width=width))


def _plain_wrap(text: str, width: int = 22) -> str:
    """Wrap text with \\n for plain Graphviz labels."""
    return "\\n".join(textwrap.wrap(text, width=width))


def render_layered(spec: dict, out_path: Path) -> None:
    layers = spec.get("layers") or []
    title  = spec.get("title", "")
    if not layers:
        raise SystemExit("layered: empty layers")

    max_comps = max((len(layer.get("components") or []) for layer in layers), default=1)
    max_comps = max(max_comps, 1)

    g = graphviz.Digraph(format="png")
    g.attr(
        "graph",
        bgcolor=BG_GRAPH,
        pad="0.85,0.85",
        fontname=FONT_HEADING,
        fontcolor="#0f172a",
        label=(
            f'<<FONT FACE="{FONT_HEADING}" POINT-SIZE="24" COLOR="#0f172a">'
            f'{_esc(title)}</FONT>>'
            if title else ""
        ),
        labelloc="t",
        size="16,40",
        dpi="200",
    )
    g.attr("node", shape="none", margin="0")

    # Build all layers as rows in a SINGLE HTML table so every row is
    # automatically the same width — the only reliable way in Graphviz.
    rows: list[str] = []

    for i, layer in enumerate(layers):
        pal   = _LAYER_PALETTES[i % len(_LAYER_PALETTES)]
        name  = _esc(layer.get("name", f"Layer {i + 1}"))
        purp  = layer.get("purpose", "")
        comps = layer.get("components") or []

        # Thin gap + arrow separator between layers
        if i > 0:
            rows.append(
                f'<TR><TD COLSPAN="{max_comps}" BORDER="0" HEIGHT="4"'
                f' BGCOLOR="{BG_GRAPH}"></TD></TR>'
            )
            rows.append(
                f'<TR><TD COLSPAN="{max_comps}" BORDER="0" ALIGN="CENTER"'
                f' CELLPADDING="2" BGCOLOR="{BG_GRAPH}">'
                f'<FONT FACE="{FONT_BODY}" POINT-SIZE="18" COLOR="{ARROW_COLOR}">'
                f'&#8595;'
                f'</FONT></TD></TR>'
            )
            rows.append(
                f'<TR><TD COLSPAN="{max_comps}" BORDER="0" HEIGHT="4"'
                f' BGCOLOR="{BG_GRAPH}"></TD></TR>'
            )

        # ── Header band ───────────────────────────────────────────────────
        rows.append(
            f'<TR>'
            f'<TD COLSPAN="{max_comps}" BGCOLOR="{pal["band_bg"]}" BORDER="0"'
            f' CELLPADDING="11" ALIGN="LEFT"'
            f' STYLE="ROUNDED">'
            f'<FONT FACE="{FONT_HEADING}" POINT-SIZE="14" COLOR="{pal["band_fg"]}">'
            f'&#160;&#160;{name}'
            f'</FONT>'
            f'</TD>'
            f'</TR>'
        )

        # ── Purpose text ──────────────────────────────────────────────────
        if purp:
            wrapped = _br_wrap(purp, width=90)
            rows.append(
                f'<TR>'
                f'<TD COLSPAN="{max_comps}" BGCOLOR="{pal["layer_bg"]}" BORDER="0"'
                f' CELLPADDING="8" ALIGN="LEFT">'
                f'<FONT FACE="{FONT_BODY}" POINT-SIZE="10.5" COLOR="{pal["purpose_fg"]}">'
                f'<I>{wrapped}</I>'
                f'</FONT>'
                f'</TD>'
                f'</TR>'
            )

        # ── Spacer before chips ───────────────────────────────────────────
        rows.append(
            f'<TR><TD COLSPAN="{max_comps}" BGCOLOR="{pal["layer_bg"]}"'
            f' BORDER="0" HEIGHT="6"></TD></TR>'
        )

        # ── Component chips ───────────────────────────────────────────────
        if comps:
            cells = "".join(
                f'<TD BGCOLOR="{pal["comp_bg"]}" STYLE="ROUNDED" BORDER="1"'
                f' COLOR="{pal["comp_bd"]}" CELLPADDING="9" WIDTH="{_COMP_CELL_W}">'
                f'<FONT FACE="{FONT_BODY}" POINT-SIZE="11" COLOR="{pal["comp_fg"]}">'
                f'<B>{_esc(c)}</B>'
                f'</FONT>'
                f'</TD>'
                for c in comps
            )
            rows.append(f'<TR BGCOLOR="{pal["layer_bg"]}">{cells}</TR>')
        else:
            rows.append(
                f'<TR><TD COLSPAN="{max_comps}" BGCOLOR="{pal["layer_bg"]}"'
                f' BORDER="0" CELLPADDING="6">'
                f'<FONT COLOR="#94a3b8">(no components)</FONT>'
                f'</TD></TR>'
            )

        # ── Bottom spacer ─────────────────────────────────────────────────
        rows.append(
            f'<TR><TD COLSPAN="{max_comps}" BGCOLOR="{pal["layer_bg"]}"'
            f' BORDER="0" HEIGHT="8"></TD></TR>'
        )

    label = (
        f'<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"'
        f' BGCOLOR="{BG_GRAPH}">'
        + "".join(rows) +
        f'</TABLE>>'
    )
    g.node("layers", label=label)
    _render_to_file(g, out_path)


def render_flow(spec: dict, out_path: Path) -> None:
    steps = spec.get("steps") or []
    title = spec.get("title", "")
    if not steps:
        raise SystemExit("flow: empty steps")

    g = graphviz.Digraph(format="png")
    g.attr(
        "graph",
        bgcolor=BG_GRAPH,
        rankdir="LR",
        splines="ortho",
        nodesep="0.6",
        ranksep="0.7",
        pad="0.6",
        fontname=FONT_BODY,
        fontcolor="#0f172a",
        label=(
            f'<<FONT FACE="{FONT_HEADING}" POINT-SIZE="20" COLOR="#0f172a">'
            f'{_esc(title)}</FONT>>'
            if title else ""
        ),
        labelloc="t",
        size="16,!",
        dpi="150",
    )
    g.attr(
        "node",
        shape="box",
        style="rounded,filled",
        fillcolor="#dbeafe",
        color="#2563eb",
        fontname=FONT_HEADING,
        fontsize="12",
        fontcolor="#1e3a5f",
        margin="0.26,0.16",
        penwidth="1.8",
    )
    g.attr("edge", color=ARROW_COLOR, penwidth="2.2",
           arrowsize="0.9", arrowhead="vee")

    for i, step in enumerate(steps):
        g.node(f"s{i}", label=_plain_wrap(step, width=24))
    for i in range(len(steps) - 1):
        g.edge(f"s{i}", f"s{i + 1}")

    _render_to_file(g, out_path)


def _render_to_file(g: graphviz.Digraph, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    stem = out_path.with_suffix("")
    g.render(filename=str(stem), cleanup=True, format="png")


def main(argv: list[str]) -> int:
    if len(argv) != 3 or argv[1] not in ("layered", "flow"):
        print("usage: layered_diagram.py [layered|flow] <out.png>  (spec on stdin)",
              file=sys.stderr)
        return 2
    kind, out = argv[1], Path(argv[2])
    spec = json.load(sys.stdin)
    if kind == "layered":
        render_layered(spec, out)
    else:
        render_flow(spec, out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
