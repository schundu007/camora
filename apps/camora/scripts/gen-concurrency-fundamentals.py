#!/usr/bin/env python3
"""
Generate concurrency-fundamentals.png — fixes text overflow from original Excalidraw version.
Overflow fixes:
  1. PREEMPTED (context switch) now has adequate left margin inside Thread 1 box
  2. Happens-Before box is tall enough for all text including bottom two lines
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Ellipse
import matplotlib.pyplot as plt

BG           = '#0d1117'
PANEL        = '#0d1f33'
GOLD         = '#d4a00d'
RED          = '#ff4444'
TEAL         = '#00c4a0'
BLUE         = '#3b82f6'
PURPLE       = '#a855f7'
GREEN        = '#22c55e'
CYAN         = '#22d3ee'
TEXT         = '#e6edf3'
SUBTEXT      = '#8b949e'
INNER_BLUE   = '#0a1e33'
INNER_PURPLE = '#160a28'
INNER_AMBER  = '#1a1300'

MONO = 'DejaVu Sans Mono'

DPI = 100
W, H = 17, 12   # inches → 1700 × 1200 px (extra room eliminates clipping)

fig, ax = plt.subplots(figsize=(W, H), dpi=DPI)
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis('off')

# ── helpers ─────────────────────────────────────────────────────────────
def rbox(x, y, w, h, face, edge, lw=2.0, radius=0.18):
    p = FancyBboxPatch((x, y), w, h,
        boxstyle=f'round,pad=0,rounding_size={radius}',
        facecolor=face, edgecolor=edge, linewidth=lw,
        transform=ax.transData, clip_on=False, zorder=1)
    ax.add_patch(p)

def enode(cx, cy, rx, ry, face, edge, label, fs=10):
    e = Ellipse((cx, cy), 2*rx, 2*ry,
                facecolor=face, edgecolor=edge, linewidth=2.2, zorder=3)
    ax.add_patch(e)
    ax.text(cx, cy, label, ha='center', va='center', fontsize=fs,
            fontfamily=MONO, fontweight='bold', color='#e6edf3', zorder=4)

def dot(x, y, color, r=0.08):
    c = plt.Circle((x, y), r, color=color, zorder=5)
    ax.add_patch(c)

def arr(x1, y1, x2, y2, color=SUBTEXT, lw=1.6, rad=0.0, dashed=False, head='->'):
    ls = (0, (4, 3)) if dashed else 'solid'
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=head, color=color, lw=lw,
                               linestyle=ls,
                               connectionstyle=f'arc3,rad={rad}'),
                zorder=6)

# ════════════════════════════════════════════════════════════════════════
# TITLE
# ════════════════════════════════════════════════════════════════════════
ax.text(W/2, 11.55, 'Concurrency Fundamentals',
        ha='center', va='center', fontsize=28, fontfamily=MONO,
        fontweight='bold', color=TEXT)
ax.text(W/2, 11.1,
        'Thread lifecycle  |  Race conditions  |  Mutex/Lock solution  |  Happens-before & memory visibility',
        ha='center', va='center', fontsize=11, fontfamily=MONO, color=SUBTEXT)

# ════════════════════════════════════════════════════════════════════════
# THREAD LIFECYCLE PANEL  (y: 7.8 → 10.75)
# ════════════════════════════════════════════════════════════════════════
TLX, TLY, TLW, TLH = 0.25, 7.8, 16.5, 2.85
rbox(TLX, TLY, TLW, TLH, PANEL, GOLD, lw=2)
ax.text(TLX + 0.28, TLY + TLH - 0.3,
        'THREAD LIFECYCLE', fontsize=11, fontfamily=MONO,
        fontweight='bold', color=GOLD, va='top', zorder=5)

# Node positions
CY = TLY + TLH/2 - 0.05
RX, RY = 0.95, 0.48
ndata = [
    (1.7,  CY, 'NEW',        '#173d22', GREEN),
    (4.5,  CY, 'RUNNABLE',   '#0b1f3a', BLUE),
    (8.0,  CY, 'RUNNING',    '#2b1e00', GOLD),
    (11.6, CY, 'BLOCKED',    '#3a0000', RED),
    (15.1, CY, 'TERMINATED', '#271040', PURPLE),
]
for cx, cy, lbl, face, border in ndata:
    enode(cx, cy, RX, RY, face, border, lbl, fs=10)

# start()
arr(1.7+RX, CY, 4.5-RX, CY, SUBTEXT)
ax.text((1.7+RX + 4.5-RX)/2, CY+0.32, 'start()', ha='center',
        fontsize=9, fontfamily=MONO, color=SUBTEXT, style='italic', zorder=6)

# scheduled
arr(4.5+RX, CY, 8.0-RX, CY, SUBTEXT)
ax.text((4.5+RX + 8.0-RX)/2, CY+0.32, 'scheduled', ha='center',
        fontsize=9, fontfamily=MONO, color=SUBTEXT, style='italic', zorder=6)

# wait/lock acquire — curved up
arr(8.0+RX, CY, 11.6-RX, CY, RED, rad=-0.35)
ax.text(9.8, CY+0.78, 'wait/lock\nacquire', ha='center',
        fontsize=9, fontfamily=MONO, color=RED, zorder=6, linespacing=1.3)

# run() completes — curved further up over BLOCKED
arr(8.0+RX, CY, 15.1-RX, CY, SUBTEXT, rad=-0.42)
ax.text(11.8, CY+1.08, 'run() completes', ha='center',
        fontsize=9, fontfamily=MONO, color=SUBTEXT, style='italic', zorder=6)

# lock released — dashed back from BLOCKED to RUNNING (below)
arr(11.6-RX*0.5, CY-RY*0.9, 8.0+RX*0.5, CY-RY*0.9, SUBTEXT, dashed=True)
ax.text((8.0+RX*0.5 + 11.6-RX*0.5)/2, CY-RY*0.9-0.28, 'lock released',
        ha='center', va='top', fontsize=9, fontfamily=MONO,
        color=SUBTEXT, style='italic', zorder=6)

# ════════════════════════════════════════════════════════════════════════
# BOTTOM ROW  (y: 0.25 → 7.55)
# ════════════════════════════════════════════════════════════════════════
BOT_Y, BOT_H = 0.25, 7.3

# ── RACE CONDITION  (left half) ──────────────────────────────────────
RCX, RCW = 0.25, 7.9
rbox(RCX, BOT_Y, RCW, BOT_H, PANEL, RED, lw=2)
ax.text(RCX+0.28, BOT_Y+BOT_H-0.25,
        'RACE CONDITION – counter++',
        fontsize=9.5, fontfamily=MONO, fontweight='bold', color=RED, va='top', zorder=5)
ax.text(RCX+0.28, BOT_Y+BOT_H-0.57,
        '(not atomic!)',
        fontsize=9.5, fontfamily=MONO, fontweight='bold', color=RED, va='top', zorder=5)

# Inner boxes: top must stay below panel header line 2 (y≈6.70)
T1X, T1Y, T1W, T1H = 0.55, 0.55, 3.05, 5.90
rbox(T1X, T1Y, T1W, T1H, INNER_BLUE, BLUE, lw=1.5, radius=0.14)
ax.text(T1X+T1W/2, T1Y+T1H-0.3, 'Thread 1',
        ha='center', fontsize=11, fontfamily=MONO,
        fontweight='bold', color=CYAN, va='top', zorder=5)

# Steps (y from top of box downward; matplotlib y increases upward so we subtract)
step_top = T1Y + T1H
s1y = step_top - 0.82
dot(T1X+0.32, s1y, SUBTEXT)
ax.text(T1X+0.55, s1y, 'READ counter=5', va='center',
        fontsize=10, fontfamily=MONO, color=TEXT, zorder=5)

s2y = s1y - 0.72
dot(T1X+0.32, s2y, SUBTEXT)
ax.text(T1X+0.55, s2y, 'ADD  tmp = 5+1', va='center',
        fontsize=10, fontfamily=MONO, color=TEXT, zorder=5)

# PREEMPTED — leave generous horizontal margin so text stays inside box
preempt_y = s2y - 0.55
# Down-pointing arrow
arr(T1X+0.55, preempt_y+0.08, T1X+0.55, preempt_y-0.28, RED, lw=1.4)
ax.text(T1X+0.82, preempt_y-0.10,
        'PREEMPTED\n(context switch)',
        va='center', fontsize=8.5, fontfamily=MONO, color=RED,
        linespacing=1.3, zorder=5)

s3y = preempt_y - 0.85
dot(T1X+0.32, s3y, RED)
ax.text(T1X+0.55, s3y, 'WRITE counter=6', va='center',
        fontsize=10, fontfamily=MONO, color=RED, zorder=5)

# LOST UPDATE summary
luy = s3y - 0.45
ax.text(T1X+T1W/2, luy,
        'LOST UPDATE!\nThread2 also read 5\nand wrote 6.\nResult: 6 (not 7)\nExpected: 7',
        ha='center', va='top', fontsize=9, fontfamily=MONO, color=SUBTEXT,
        linespacing=1.45, zorder=5)

# Thread 2 inner box — positioned to show interleaving (shifted down & right)
T2X, T2Y, T2W, T2H = 3.8, 1.45, 4.0, 5.20
rbox(T2X, T2Y, T2W, T2H, INNER_PURPLE, PURPLE, lw=1.5, radius=0.14)
ax.text(T2X+T2W/2, T2Y+T2H-0.3, 'Thread 2  (interleaved)',
        ha='center', fontsize=10.5, fontfamily=MONO,
        fontweight='bold', color=PURPLE, va='top', zorder=5)

st_top2 = T2Y + T2H
r1y = st_top2 - 0.82
dot(T2X+0.32, r1y, PURPLE)
ax.text(T2X+0.55, r1y, 'READ counter=5  (stale!)', va='center',
        fontsize=10, fontfamily=MONO, color=TEXT, zorder=5)

r2y = r1y - 0.72
dot(T2X+0.32, r2y, PURPLE)
ax.text(T2X+0.55, r2y, 'ADD  tmp = 5+1', va='center',
        fontsize=10, fontfamily=MONO, color=TEXT, zorder=5)

r3y = r2y - 0.72
dot(T2X+0.32, r3y, RED)
ax.text(T2X+0.55, r3y, 'WRITE counter=6  WRONG!', va='center',
        fontsize=10, fontfamily=MONO, color=RED, zorder=5)

# ── MUTEX / LOCK SOLUTION  (right half) ─────────────────────────────
MLX, MLW = 8.4, 8.6
rbox(MLX, BOT_Y, MLW, BOT_H, PANEL, TEAL, lw=2)
ax.text(MLX+0.28, BOT_Y+BOT_H-0.25,
        'MUTEX / LOCK SOLUTION –',
        fontsize=9.5, fontfamily=MONO, fontweight='bold', color=TEAL, va='top', zorder=5)
ax.text(MLX+0.28, BOT_Y+BOT_H-0.57,
        'guaranteed atomicity',
        fontsize=9.5, fontfamily=MONO, fontweight='bold', color=TEAL, va='top', zorder=5)

# Thread 1 with lock inner box
MX, MY, MW, MH = 8.65, 0.55, 3.3, 5.90
rbox(MX, MY, MW, MH, INNER_BLUE, BLUE, lw=1.5, radius=0.14)
ax.text(MX+MW/2, MY+MH-0.3, 'Thread 1 – with lock',
        ha='center', fontsize=10.5, fontfamily=MONO,
        fontweight='bold', color=CYAN, va='top', zorder=5)

m_top = MY + MH
m1y = m_top - 0.82
dot(MX+0.32, m1y, GOLD)
ax.text(MX+0.55, m1y, 'LOCK acquire', va='center',
        fontsize=10, fontfamily=MONO, color=GOLD, zorder=5)

m2y = m1y - 0.80
dot(MX+0.32, m2y, SUBTEXT)
ax.text(MX+0.55, m2y, 'READ counter=5', va='center',
        fontsize=10, fontfamily=MONO, color=TEXT, zorder=5)

m3y = m2y - 0.80
dot(MX+0.32, m3y, SUBTEXT)
ax.text(MX+0.55, m3y, 'WRITE counter=6', va='center',
        fontsize=10, fontfamily=MONO, color=TEXT, zorder=5)

m4y = m3y - 0.80
dot(MX+0.32, m4y, GOLD)
ax.text(MX+0.55, m4y, 'LOCK release', va='center',
        fontsize=10, fontfamily=MONO, color=GOLD, zorder=5)

ax.text(MX+MW/2, m4y-0.5,
        'T2 now acquires lock\nReads correct 6, writes 7',
        ha='center', va='top', fontsize=9.5, fontfamily=MONO,
        color=TEXT, linespacing=1.4, zorder=5)

# Happens-Before inner box — extra tall so ALL text is fully visible
HX, HY, HW, HH = 12.2, 0.18, 4.55, 7.12
rbox(HX, HY, HW, HH, INNER_AMBER, GOLD, lw=1.5, radius=0.14)
ax.text(HX+HW/2, HY+HH-0.32, 'Happens-Before',
        ha='center', fontsize=11, fontfamily=MONO,
        fontweight='bold', color=GOLD, va='top', zorder=5)

hb_text = (
    'If A happens-before B:\n'
    '→ all writes by A are visible\n'
    '  to B when B executes\n'
    '\n'
    'Guarantees:\n'
    '• Thread.start() → thread body\n'
    '• Mutex unlock → next lock\n'
    '• volatile write → read\n'
    '• join() → thread end\n'
    '\n'
    'Memory Visibility:\n'
    'Without sync, CPU caches\n'
    'may hide stale values.\n'
    'volatile / synchronized\n'
    'forces flush to main memory.'
)
ax.text(HX+0.25, HY+HH-0.72, hb_text,
        va='top', fontsize=9.5, fontfamily=MONO, color=TEXT,
        linespacing=1.48, zorder=5)

# ════════════════════════════════════════════════════════════════════════
# Save
# ════════════════════════════════════════════════════════════════════════
OUT = '/Users/chundu/camora/apps/camora/public/diagrams/concurrency/concurrency-fundamentals.png'
plt.savefig(OUT, dpi=DPI, bbox_inches='tight', pad_inches=0.1, facecolor=BG)
plt.close()
print(f'Saved: {OUT}')
