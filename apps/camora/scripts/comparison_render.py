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


# Enterprise light palette — matches the white Eraser architecture diagrams.
# Muted, low-chroma: PROS/CONS are signalled by a small coloured header label
# and a coloured bullet only; body text stays neutral slate and sans-serif so
# the tables read as clean documentation, not a red/green wall.
BG        = "#ffffff"
BORDER    = "#e5e9f0"
TITLE_BG  = "#1e293b"   # slate-800 header bar
TITLE_FG  = "#f8fafc"
OPT_BG    = "#f4f6fa"   # column header
OPT_FG    = "#1e293b"
BODY_FG   = "#334155"   # slate-700 — all bullet text
PROS_BG   = "#f7fbf8"   # barely-there tint
PROS_FG   = "#0f7a52"   # muted emerald — label + bullet only
CONS_BG   = "#fdf7f7"
CONS_FG   = "#b4413c"   # muted brick — label + bullet only
REC_BG    = "#f6f8fc"
REC_FG    = "#1e3a5f"   # navy
SANS      = "Helvetica"


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


def _esc(text: str) -> str:
    """HTML-escape text for safe use inside Graphviz HTML labels."""
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))


def _wrap(text: str, width: int = 36) -> str:
    """HTML-escape and wrap long text for HTML labels."""
    return "<BR/>".join(textwrap.wrap(_esc(text), width=width))


def _bullet_rows(items: list[str], fg: str, bg: str, width: int = 36) -> str:
    # Coloured bullet, neutral sans body — the colour cue without a colour wall.
    rows = "".join(
        f'<TR><TD ALIGN="LEFT" BGCOLOR="{bg}">'
        f'<FONT COLOR="{fg}" FACE="{SANS}" POINT-SIZE="11"><B>•</B> </FONT>'
        f'<FONT COLOR="{BODY_FG}" FACE="{SANS}" POINT-SIZE="11">{_wrap(item, width)}</FONT>'
        f"</TD></TR>"
        for item in items
    )
    return rows


def build_dot(diagram: TradeoffDiagram) -> str:
    n = len(diagram.options)
    col_width = max(36, 110 // n)

    opt_headers = "".join(
        f'<TD BORDER="1" BGCOLOR="{OPT_BG}" ALIGN="CENTER" WIDTH="{260}">'
        f'<FONT COLOR="{OPT_FG}" FACE="{SANS}" POINT-SIZE="14"><B>{_esc(opt.name)}</B></FONT>'
        f"</TD>"
        for opt in diagram.options
    )

    pros_cells = "".join(
        f'<TD BORDER="1" BGCOLOR="{PROS_BG}" ALIGN="LEFT" VALIGN="TOP">'
        f'<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="1" BGCOLOR="{PROS_BG}">'
        + _bullet_rows(opt.pros or ["—"], PROS_FG, PROS_BG, col_width)
        + f"</TABLE></TD>"
        for opt in diagram.options
    )

    cons_cells = "".join(
        f'<TD BORDER="1" BGCOLOR="{CONS_BG}" ALIGN="LEFT" VALIGN="TOP">'
        f'<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="1" BGCOLOR="{CONS_BG}">'
        + _bullet_rows(opt.cons or ["—"], CONS_FG, CONS_BG, col_width)
        + f"</TABLE></TD>"
        for opt in diagram.options
    )

    rec_row = ""
    if diagram.recommendation:
        rec_row = (
            f'<TR><TD COLSPAN="{n}" BORDER="1" BGCOLOR="{REC_BG}" ALIGN="LEFT">'
            f'<FONT COLOR="{REC_FG}" FACE="{SANS}" POINT-SIZE="12">'
            f"<B>Recommendation:</B> {_wrap(diagram.recommendation[:300], 80)}"
            f"</FONT></TD></TR>"
        )

    label = (
        f'<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="2" BGCOLOR="{BG}">'
        f'<TR><TD COLSPAN="{n}" BORDER="1" BGCOLOR="{TITLE_BG}" ALIGN="CENTER">'
        f'<FONT COLOR="{TITLE_FG}" FACE="{SANS}" POINT-SIZE="18"><B>{_esc(diagram.title)}</B></FONT>'
        f"</TD></TR>"
        f'<TR><TD COLSPAN="{n}" HEIGHT="4" BORDER="0"></TD></TR>'
        f"<TR>{opt_headers}</TR>"
        f'<TR>'
        + "".join(
            f'<TD BORDER="1" BGCOLOR="{PROS_BG}" ALIGN="CENTER">'
            f'<FONT COLOR="{PROS_FG}" FACE="{SANS}" POINT-SIZE="11"><B>PROS</B></FONT>'
            f"</TD>"
            for _ in diagram.options
        )
        + f"</TR>"
        f"<TR>{pros_cells}</TR>"
        f'<TR>'
        + "".join(
            f'<TD BORDER="1" BGCOLOR="{CONS_BG}" ALIGN="CENTER">'
            f'<FONT COLOR="{CONS_FG}" FACE="{SANS}" POINT-SIZE="11"><B>CONS</B></FONT>'
            f"</TD>"
            for _ in diagram.options
        )
        + f"</TR>"
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
