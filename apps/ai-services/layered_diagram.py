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


# Dark-mode color palette, hardcoded so PNGs look the same regardless of
# the page's theme (we render once at build time). Picked to match the
# Camora navy + gold-leaf accent grammar.
BG_GRAPH       = "#0F1218"   # page-app background
BG_LAYER       = "#1A1E26"   # bg-surface
BG_COMPONENT   = "#232830"   # bg-elevated
BORDER         = "#2E3440"   # subtle panel border
GOLD_LEAF      = "#D9B543"   # accent rail / arrows
GOLD_LEAF_DK   = "#A88817"   # text on light if needed
TEXT_PRIMARY   = "#E8EAEC"   # near-white
TEXT_SECONDARY = "#A6B0BD"   # muted body
NAVY           = "#1A4F86"   # connector edges between layers

FONT_HEADING = "Helvetica-Bold"
FONT_BODY    = "Helvetica"


def _normalize(s: str) -> str:
    """Graphviz node IDs must avoid quotes — all labels go through
    record-style escaping so we just need a stable id for grouping."""
    return "".join(c if c.isalnum() else "_" for c in s)[:80] or "x"


def render_layered(spec: dict, out_path: Path) -> None:
    """Render a stack of layers with components inside each.

    Layout: each layer is a single HTML-table node (shape="none"). A simple
    sequential edge between consecutive layer nodes produces a centered arrow
    without the left-boundary misalignment caused by compound cluster edges.
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
        splines="spline",
        nodesep="0.3",
        ranksep="0.5",
        pad="0.5",
        fontname=FONT_BODY,
        fontcolor=TEXT_PRIMARY,
        label=title or "",
        labelloc="t",
        fontsize="20",
    )
    # shape="none" lets the HTML table drive all geometry
    g.attr(
        "node",
        shape="none",
        margin="0",
    )
    g.attr(
        "edge",
        color=GOLD_LEAF,
        penwidth="2.5",
        arrowsize="1.0",
        arrowhead="vee",
    )

    for i, layer in enumerate(layers):
        name    = _html_escape(layer.get("name", f"Layer {i + 1}"))
        purpose = _html_escape(layer.get("purpose", ""))
        comps   = layer.get("components") or []

        # ── title row ────────────────────────────────────────────────
        title_row = (
            f'<TR><TD ALIGN="CENTER" CELLPADDING="10">'
            f'<FONT FACE="{FONT_HEADING}" POINT-SIZE="13"'
            f' COLOR="{TEXT_PRIMARY}"><B>{name}</B></FONT>'
            f'</TD></TR>'
        )

        # ── optional purpose row ─────────────────────────────────────
        purpose_row = ""
        if purpose:
            purpose_row = (
                f'<TR><TD ALIGN="CENTER" CELLPADDING="4">'
                f'<FONT FACE="{FONT_BODY}" POINT-SIZE="10"'
                f' COLOR="{TEXT_SECONDARY}">{purpose}</FONT>'
                f'</TD></TR>'
            )

        # ── components row ───────────────────────────────────────────
        if comps:
            cells = "".join(
                f'<TD ALIGN="CENTER" BGCOLOR="{BG_COMPONENT}"'
                f' STYLE="ROUNDED" CELLPADDING="8">'
                f'<FONT FACE="{FONT_BODY}" POINT-SIZE="11"'
                f' COLOR="{TEXT_PRIMARY}">{_html_escape(c)}</FONT>'
                f'</TD>'
                for c in comps
            )
            comp_row = (
                f'<TR><TD CELLPADDING="8"><TABLE BORDER="0"'
                f' CELLBORDER="1" CELLSPACING="6"'
                f' CELLPADDING="0" COLOR="{BORDER}">'
                f'<TR>{cells}</TR></TABLE></TD></TR>'
            )
        else:
            comp_row = (
                f'<TR><TD ALIGN="CENTER" CELLPADDING="8">'
                f'<FONT FACE="{FONT_BODY}" POINT-SIZE="10"'
                f' COLOR="{TEXT_SECONDARY}">(no components)</FONT>'
                f'</TD></TR>'
            )

        label = (
            f'<<TABLE BORDER="2" CELLBORDER="0" CELLSPACING="0"'
            f' BGCOLOR="{BG_LAYER}" COLOR="{GOLD_LEAF}"'
            f' CELLPADDING="0" STYLE="ROUNDED">'
            f'{title_row}{purpose_row}{comp_row}'
            f'</TABLE>>'
        )
        g.node(f"layer_{i}", label=label)

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
        fontcolor=TEXT_PRIMARY,
        label=title or "",
        labelloc="t",
        fontsize="20",
    )
    g.attr(
        "node",
        shape="box",
        style="rounded,filled",
        fillcolor=BG_LAYER,
        color=GOLD_LEAF,
        fontname=FONT_HEADING,
        fontsize="12",
        fontcolor=TEXT_PRIMARY,
        margin="0.22,0.14",
        penwidth="1.4",
    )
    g.attr(
        "edge",
        color=GOLD_LEAF,
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
