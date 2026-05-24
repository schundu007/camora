"""
Pure-Graphviz renderer for Camora's "Layered Design" topic diagrams.

Distinct from diagram.py (which is for AWS / cloud architecture diagrams
generated via the `diagrams` library and an LLM call). This module is
deterministic — given the same `layers`/`steps` JSON it produces the
same PNG every time, so it can be pre-baked at build time and served
from /public/diagrams/{topicId}/.

Two diagram types:
  - layered: a stack of horizontal clusters, top to bottom, each cluster
             a layer with its components as boxes inside. A thin arrow
             on the right rail connects layers in order.
  - flow:    a horizontal sequence of step boxes connected by arrows.

Usage (from a build script):

    python3 layered_diagram.py layered <out_path.png> < spec.json
    python3 layered_diagram.py flow    <out_path.png> < spec.json

JSON shapes:

    layered: { "title": "...", "layers": [
        { "name": "...", "purpose": "...", "components": ["...", ...] },
        ...
    ]}
    flow:    { "title": "...", "steps": ["...", ...] }
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import graphviz


# Enterprise architecture palette — white background, colored layers cycling
# through blue / green / amber / purple to match the excalidraw arch diagrams.
BG_GRAPH     = "#ffffff"
ARROW_COLOR  = "#64748b"
TEXT_PURPOSE = "#475569"

FONT_HEADING = "Helvetica-Bold"
FONT_BODY    = "Helvetica"

# Each layer cycles through these palettes (blue → green → amber → purple → rose)
_LAYER_PALETTES = [
    {"bg": "#eff6ff", "border": "#3b82f6", "comp_bg": "#3b82f6",  "comp_text": "#ffffff",  "name_color": "#1e3a5f"},
    {"bg": "#f0fdf4", "border": "#047857", "comp_bg": "#a7f3d0",  "comp_text": "#065f46",  "name_color": "#065f46"},
    {"bg": "#fffbeb", "border": "#b45309", "comp_bg": "#fef3c7",  "comp_text": "#92400e",  "name_color": "#92400e"},
    {"bg": "#fdf4ff", "border": "#7c3aed", "comp_bg": "#e9d5ff",  "comp_text": "#5b21b6",  "name_color": "#5b21b6"},
    {"bg": "#fff1f2", "border": "#be123c", "comp_bg": "#fecdd3",  "comp_text": "#9f1239",  "name_color": "#9f1239"},
]


def _normalize(s: str) -> str:
    """Graphviz node IDs must avoid quotes — all labels go through
    record-style escaping so we just need a stable id for grouping."""
    return "".join(c if c.isalnum() else "_" for c in s)[:80] or "x"


def render_layered(spec: dict, out_path: Path) -> None:
    """Render a stack of layers with components inside each.

    Layout: each layer is a single Graphviz node whose label is an HTML
    table (title row + purpose row + component cells). Sequential layers
    are connected by simple edges, which Graphviz routes center-bottom →
    center-top automatically — no cluster+compound-edge tricks needed.
    This avoids the left-rail misalignment that plagued the old cluster
    approach with splines=ortho.
    """
    layers = spec.get("layers") or []
    title = spec.get("title", "")

    if not layers:
        raise SystemExit("layered: empty layers")

    g = graphviz.Digraph(format="png")
    g.attr(
        "graph",
        bgcolor=BG_GRAPH,
        rankdir="TB",
        splines="ortho",
        nodesep="0.3",
        ranksep="0.28",
        pad="0.5,0.5",
        fontname=FONT_BODY,
        fontcolor="#1e293b",
        label=f"<{_html_escape(title)}>" if title else "",
        labelloc="t",
        fontsize="20",
    )
    g.attr("node", shape="none", margin="0")
    g.attr(
        "edge",
        color=ARROW_COLOR,
        penwidth="2.0",
        arrowsize="0.9",
        arrowhead="vee",
    )

    for i, layer in enumerate(layers):
        pal = _LAYER_PALETTES[i % len(_LAYER_PALETTES)]
        name = _html_escape(layer.get("name", f"Layer {i + 1}"))
        purpose = _html_escape(layer.get("purpose", ""))
        comps = layer.get("components") or []
        n = max(len(comps), 1)

        # Title + purpose rows span all component columns.
        title_row = (
            f'<TR><TD COLSPAN="{n}" CELLPADDING="10" BORDER="0">'
            f'<B><FONT FACE="{FONT_HEADING}" POINT-SIZE="13" COLOR="{pal["name_color"]}">'
            f'{name}</FONT></B></TD></TR>'
        )
        purpose_row = ""
        if purpose:
            purpose_row = (
                f'<TR><TD COLSPAN="{n}" CELLPADDING="2" BORDER="0">'
                f'<FONT FACE="{FONT_BODY}" POINT-SIZE="10" COLOR="{TEXT_PURPOSE}">'
                f'{purpose}</FONT></TD></TR>'
            )

        # Component cells — each in its own rounded box cell.
        if comps:
            comp_cells = "".join(
                f'<TD BGCOLOR="{pal["comp_bg"]}" STYLE="ROUNDED" BORDER="1"'
                f' COLOR="{pal["border"]}" CELLPADDING="7">'
                f'<FONT FACE="{FONT_BODY}" POINT-SIZE="11" COLOR="{pal["comp_text"]}">'
                f'{_html_escape(c)}</FONT></TD>'
                for c in comps
            )
            comp_row = f'<TR>{comp_cells}</TR>'
        else:
            comp_row = (
                f'<TR><TD BORDER="0" CELLPADDING="4">'
                f'<FONT COLOR="{TEXT_PURPOSE}">(no components)</FONT></TD></TR>'
            )

        label = (
            f'<<TABLE BORDER="2" CELLBORDER="0" CELLSPACING="6"'
            f' BGCOLOR="{pal["bg"]}" COLOR="{pal["border"]}" CELLPADDING="0"'
            f' STYLE="ROUNDED">'
            + title_row + purpose_row + comp_row +
            f'</TABLE>>'
        )
        g.node(f"layer_{i}", label=label)

    # Simple sequential edges — Graphviz routes them center-to-center.
    for i in range(len(layers) - 1):
        g.edge(f"layer_{i}", f"layer_{i + 1}")

    _render_to_file(g, out_path)


def render_flow(spec: dict, out_path: Path) -> None:
    """Horizontal flow of N steps connected by arrows."""
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
        nodesep="0.5",
        ranksep="0.6",
        pad="0.4",
        fontname=FONT_BODY,
        fontcolor="#1e293b",
        label=title or "",
        labelloc="t",
        fontsize="20",
    )
    g.attr(
        "node",
        shape="box",
        style="rounded,filled",
        fillcolor="#eff6ff",
        color="#3b82f6",
        fontname=FONT_HEADING,
        fontsize="12",
        fontcolor="#1e3a5f",
        margin="0.22,0.14",
        penwidth="1.8",
    )
    g.attr(
        "edge",
        color=ARROW_COLOR,
        penwidth="2",
        arrowsize="1",
        arrowhead="vee",
    )

    for i, step in enumerate(steps):
        g.node(f"s{i}", label=step)
    for i in range(len(steps) - 1):
        g.edge(f"s{i}", f"s{i + 1}")

    _render_to_file(g, out_path)


def _html_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
    )


def _render_to_file(g: graphviz.Digraph, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # graphviz.render() writes <out>.png — strip suffix so it lands at
    # the path the caller asked for.
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
