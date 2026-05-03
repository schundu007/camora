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
    """Render a stack of layer clusters with components inside each.

    Layout: each layer is a subgraph cluster, top to bottom. Inside each
    cluster, components flow left to right and wrap. A vertical chain of
    invisible edges (between the last cluster's anchor and the next
    cluster's anchor) gives the cluster ordering a "down" semantic.
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
        compound="true",
        nodesep="0.18",
        ranksep="0.45",
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
        fillcolor=BG_COMPONENT,
        color=BORDER,
        fontname=FONT_BODY,
        fontsize="11",
        fontcolor=TEXT_PRIMARY,
        margin="0.16,0.08",
        penwidth="1",
    )
    g.attr(
        "edge",
        color=NAVY,
        penwidth="1.6",
        arrowsize="0.7",
        arrowhead="vee",
    )

    # Each cluster gets one anchor node we use to chain clusters
    # vertically (Graphviz can't `edge` between clusters directly without
    # a node on each end).
    anchors: list[str] = []

    for i, layer in enumerate(layers):
        cid = f"cluster_l{i}_{_normalize(layer.get('name', f'layer{i}'))}"
        with g.subgraph(name=cid) as c:
            label = layer.get("name", f"Layer {i + 1}")
            purpose = layer.get("purpose", "")
            cluster_label = (
                f"<<B>{_html_escape(label)}</B>"
                + (f"<BR/><FONT POINT-SIZE='10' COLOR='{TEXT_SECONDARY}'>"
                   f"{_html_escape(purpose)}</FONT>" if purpose else "")
                + ">"
            )
            c.attr(
                label=cluster_label,
                style="rounded,filled",
                fillcolor=BG_LAYER,
                color=GOLD_LEAF,
                penwidth="1.2",
                fontname=FONT_HEADING,
                fontsize="13",
                fontcolor=TEXT_PRIMARY,
                margin="14",
            )

            comps = layer.get("components") or []
            anchor_id = f"_anchor_{i}"
            # Hidden anchor — pinned at top of the cluster so the
            # vertical chain edges can attach without leaking visually.
            c.node(
                anchor_id,
                label="",
                shape="point",
                width="0.01",
                height="0.01",
                style="invis",
            )
            anchors.append(anchor_id)

            if not comps:
                # Empty layer still needs at least one visible node.
                c.node(f"l{i}_empty", label="(no components)",
                       fontcolor=TEXT_SECONDARY, color=BORDER)
            else:
                # Force same rank inside cluster so components sit on
                # one row (Graphviz wraps if too wide for the page).
                with c.subgraph() as row:
                    row.attr(rank="same")
                    for j, comp in enumerate(comps):
                        row.node(f"l{i}_c{j}", label=comp)

    # Chain anchors top-to-bottom to enforce layer order; the gold edges
    # form the right-rail connector between layers.
    for i in range(len(anchors) - 1):
        g.edge(
            anchors[i],
            anchors[i + 1],
            ltail=f"cluster_l{i}_{_normalize(layers[i].get('name', f'layer{i}'))}",
            lhead=f"cluster_l{i + 1}_{_normalize(layers[i + 1].get('name', f'layer{i + 1}'))}",
            color=GOLD_LEAF,
            penwidth="2",
            arrowsize="0.9",
        )

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
