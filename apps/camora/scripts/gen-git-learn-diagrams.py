#!/usr/bin/env python3
"""Generate diagrams for the Git learning track.

Covers: the three-trees fundamentals (Visual Git Reference), the commit-graph
model (Pro Git ch1-3, ch5, ch7, ch10), remotes, Learn Git Branching start/goal
trees, and three existing-topic figures (gitflow, reflog, submodules).

Style matches gen-git-diagrams.py: white bg, dpi 200, rankdir=LR, Helvetica,
commit circles via cn()/bp()/ce(), Before/After clusters for single-command
figures. All landscape; multi-stage stories are folded into side-by-side
panels inside one image rather than separate files.

IMPORTANT: Graphviz node names are global to the whole digraph, not scoped to
a subgraph/cluster. Every panel (Before/After, or a 3-4 stage story) therefore
uses its OWN prefixed node ids (b_/a_, p1_/p2_/p3_, s_/g_ ...) even when two
panels draw "the same" commit -- reusing a bare id across panels silently
merges the nodes and duplicates every edge between them (renders as a
lens-shaped double arc). Keep every panel's ids unique within the function.

Output: apps/camora/public/diagrams/git/<slug>.png + manifest.json
"""
import graphviz
import json
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'git')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica', fontsize='10', penwidth='1.5')
C = {
    'navy':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'gold':   ('#fef3c7', '#f59e0b', '#92400e'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'cyan':   ('#cffafe', '#06b6d4', '#155e75'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
    'sky':    ('#e0f2fe', '#0ea5e9', '#075985'),
    'amber':  ('#fef3c7', '#f59e0b', '#92400e'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
    'orange': ('#ffedd5', '#f97316', '#9a3412'),
}

MANIFEST = []


# ---------------------------------------------------------------- helpers --

def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)


def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '',
           color=color, fontcolor=color, style=style, **EDGE)


def base_graph(name, title):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.3', nodesep='0.5', ranksep='0.55',
           splines='spline', rankdir='LR',
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Bold', fontcolor='#1e293b')
    return g


def cn(g, name, label, c='navy', lost=False):
    """Commit circle node."""
    style = 'filled,dashed' if lost else 'filled'
    g.node(name, label, shape='circle', style=style,
           fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2],
           fontname='Helvetica Bold', fontsize='11',
           width='0.5', height='0.5', fixedsize='true', penwidth='2.0')


def bp(g, name, label, c='green', lost=False):
    """Branch / tag / remote pointer label box (no HEAD)."""
    style = 'filled,dashed' if lost else 'filled'
    g.node(name, label, shape='box', style=style,
           fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2],
           fontname='Helvetica', fontsize='10',
           height='0.28', margin='0.12,0.04', penwidth='1.2')


def head_on(g, name, label, c='green', lost=False):
    """HEAD stacked on a branch pill as one two-row box (attached HEAD)."""
    if lost:
        hb, hf, bb, bf, bd = '#f1f5f9', '#cbd5e1', '#f8fafc', '#cbd5e1', '#e2e8f0'
    else:
        hb, hf, bb, bf, bd = C['gray'][0], C['gray'][2], C[c][0], C[c][2], C[c][1]
    html = (f'<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5" '
            f'STYLE="ROUNDED" COLOR="{bd}">'
            f'<TR><TD BGCOLOR="{hb}"><FONT COLOR="{hf}" FACE="Helvetica Bold" POINT-SIZE="10">HEAD</FONT></TD></TR>'
            f'<TR><TD BGCOLOR="{bb}"><FONT COLOR="{bf}" FACE="Helvetica Bold" POINT-SIZE="10">{label}</FONT></TD></TR>'
            f'</TABLE>>')
    g.node(name, html, shape='plaintext')


def ce(g, a, b, color='#64748b', style='solid', label=''):
    """Commit edge: a=older/parent, b=newer/child. Arrowhead drawn at a
    (visually child points to parent) while dot still ranks a left of b."""
    g.edge(a, b, color=color, penwidth='1.8', style=style, arrowsize='0.7', dir='back',
           label=f'  {label}  ' if label else '', fontname='Helvetica', fontsize='9', fontcolor=color)


def ptr(g, ref, commit, color='#64748b', style='dashed'):
    """Branch/HEAD pointer -> commit, forced onto the SAME rank as its commit
    (same column in LR) so the pill sits directly next to it with a short edge,
    instead of drifting off to one side."""
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node(ref)
        s.node(commit)
    g.edge(ref, commit, color=color, penwidth='1.3', style=style, arrowsize='0.6')


def order(g, *ids):
    """Chain invisible edges between one anchor node per panel so Graphviz
    lays the panels out left to right instead of stacking them vertically."""
    for i in range(len(ids) - 1):
        g.edge(ids[i], ids[i + 1], style='invis', weight='0', constraint='true')


def moved(g, old, new, color='#94a3b8'):
    """Old ref/HEAD moved to new position (dashed)."""
    g.edge(old, new, color=color, penwidth='1.3', style='dashed', arrowsize='0.6', constraint='false')


def copied(g, src, dst, color='#94a3b8'):
    """Commit copied/replayed from src into dst (cherry-pick / rebase)."""
    g.edge(src, dst, color=color, penwidth='1.3', style='dotted', arrowsize='0.6', constraint='false')


def flow(g, a, b, label='', color='#475569', style='solid'):
    """Solid data-flow arrow (files moving between trees)."""
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color,
           style=style, fontname='Helvetica', fontsize='9', penwidth='1.4', arrowsize='0.7')


def note(g, name, label, color='#64748b'):
    g.node(name, label, shape='plaintext', fontcolor=color, fontname='Helvetica', fontsize='10')


PANEL_GRAY = dict(fillcolor='#f8fafc', color='#cbd5e1', fontcolor='#475569')
PANEL_GREEN = dict(fillcolor='#f0fdf4', color='#86efac', fontcolor='#166534')
PANEL_GOLD = dict(fillcolor='#fffbeb', color='#fcd34d', fontcolor='#92400e')
PANEL_PURPLE = dict(fillcolor='#fdf4ff', color='#d8b4fe', fontcolor='#6b21a8')
PANEL_RED = dict(fillcolor='#fef2f2', color='#fca5a5', fontcolor='#991b1b')
PANEL_NAVY = dict(fillcolor='#eff6ff', color='#93c5fd', fontcolor='#1e40af')


_PANEL_SEQ = [0]


def panel(g, name, label, style, build):
    # sortv = creation order, so packmode='array_cu1' keeps frames in sequence
    _PANEL_SEQ[0] += 1
    with g.subgraph(name=name) as c:
        c.attr(label=label, style='rounded,filled', fontsize='13',
               fontname='Helvetica Bold', margin='18', sortv=str(_PANEL_SEQ[0]), **style)
        c.attr('node', sortv=str(_PANEL_SEQ[0]))
        build(c)


def save(g, filename, title, shows):
    g.render(os.path.join(OUT, filename), cleanup=True)
    MANIFEST.append({'file': f'{filename}.png', 'title': title, 'shows': shows})
    print('Generated:', filename)


def save_grid(filename, title, rows, shows, gap=60):
    """Render each frame as its own graph and compose them in the given row
    order with PIL. Graphviz's component packer does not honour sortv, so
    multi-row sequences are assembled here to keep the frames in reading order.
    rows: list of rows; each row is a list of (panel_label, panel_style, builder)."""
    from PIL import Image, ImageDraw, ImageFont
    import tempfile
    tmp = tempfile.mkdtemp()
    row_images = []
    for r, row in enumerate(rows):
        imgs = []
        for i, (label, style, build) in enumerate(row):
            g = graphviz.Digraph(f'{filename}_{r}_{i}', format='png')
            g.attr(bgcolor='#ffffff', dpi='200', pad='0.15', nodesep='0.5', ranksep='0.55',
                   splines='spline', rankdir='LR')
            panel(g, f'cluster_{r}_{i}', label, style, build)
            out = g.render(os.path.join(tmp, f'{r}_{i}'), cleanup=True)
            imgs.append(Image.open(out).convert('RGB'))
        row_images.append(imgs)
    title_h = 90
    row_w = [sum(im.width for im in imgs) + gap * (len(imgs) - 1) for imgs in row_images]
    row_h = [max(im.height for im in imgs) for imgs in row_images]
    W = max(row_w) + 2 * gap
    H = title_h + sum(row_h) + gap * (len(rows) + 1)
    canvas = Image.new('RGB', (W, H), '#ffffff')
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 40, index=1)
    except Exception:
        font = ImageFont.load_default()
    tw = draw.textlength(title, font=font)
    draw.text(((W - tw) / 2, 30), title, fill='#1e293b', font=font)
    y = title_h + gap
    for imgs, rw, rh in zip(row_images, row_w, row_h):
        x = (W - rw) // 2
        for im in imgs:
            canvas.paste(im, (x, y + (rh - im.height) // 2))
            x += im.width + gap
        y += rh + gap
    canvas.save(os.path.join(OUT, f'{filename}.png'))
    MANIFEST.append({'file': f'{filename}.png', 'title': title, 'shows': shows})
    print('Generated:', filename, f'({W}x{H})')


def chain(g, items, edge_color='#64748b'):
    """items: list of (id, label, color, lost). Draws a linear commit chain."""
    for cid, lbl, col, lost in items:
        cn(g, cid, lbl, col, lost)
    for i in range(len(items) - 1):
        ce(g, items[i][0], items[i + 1][0], edge_color)


# =====================================================================
# FUNDAMENTALS -- Visual Git Reference (three trees, F1-F21)
# =====================================================================

def diag_fund_basic_usage():
    g = base_graph('fund_basic_usage', 'The Three Trees -- Every Command Copies Files Between Them')
    n(g, 'wd', 'Working Directory', 'red')
    n(g, 'idx', 'Stage (Index)', 'navy')
    n(g, 'hist', 'History', 'green')
    e(g, 'wd', 'idx', 'git add files', '#166534')
    e(g, 'idx', 'hist', 'git commit', '#166534')
    e(g, 'hist', 'idx', 'git reset -- files', '#6366f1', 'dashed')
    e(g, 'idx', 'wd', 'git checkout -- files', '#6366f1', 'dashed')
    e(g, 'wd', 'hist', 'git commit (files | -a)', '#92400e')
    e(g, 'hist', 'wd', 'git checkout HEAD -- files', '#9d174d', 'dashed')
    save(g, 'fund-basic-usage', 'The Three Trees',
         'Three boxes left to right -- Working Directory, Stage (Index), History -- with six labelled arrows: '
         'add/commit moving files rightward toward history, reset/checkout moving files back leftward, and two long '
         'arcs (commit files|-a, checkout HEAD -- files) that jump straight between Working Directory and History, skipping the stage.')


def diag_fund_conventions():
    g = base_graph('fund_conventions', 'Conventions -- Commits, Branches, and HEAD')
    note(g, 'ellipsis', '...', '#94a3b8')
    cn(g, 'a', 'a47c3', 'green')
    cn(g, 'b', 'b325c', 'green')
    cn(g, 'c', 'c10b9', 'green')
    cn(g, 'd', 'da985', 'green')
    cn(g, 'e', 'ed489', 'green')
    g.edge('ellipsis', 'a', style='dotted', color='#94a3b8', arrowsize='0.5', dir='back', constraint='true')
    ce(g, 'a', 'b', '#166534', label='child points to parent')
    ce(g, 'b', 'c', '#166534')
    ce(g, 'c', 'd', '#166534')
    ce(g, 'd', 'e', '#166534')
    head_on(g, 'main', 'main', 'gold')
    bp(g, 'stable', 'stable', 'gold')
    ptr(g, 'main', 'e', '#92400e')
    ptr(g, 'stable', 'a', '#92400e')
    n(g, 'idx', 'Stage (Index)\nfiles for next commit', 'navy')
    n(g, 'wd', 'Working Directory\nfiles you see', 'red')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('c')
        s.node('idx')
        s.node('wd')
    g.edge('c', 'idx', style='invis', weight='0')
    g.edge('idx', 'wd', style='invis', weight='0')
    save(g, 'fund-conventions', 'Conventions',
         'Five green commit circles a47c3 through ed489 chained oldest to newest, with gold branch pill "main" '
         '(carrying HEAD) pointing at ed489 and gold branch pill "stable" pointing at a47c3, plus a Stage and a '
         'Working Directory box below labelled with their role.')


def diag_fund_diff():
    g = base_graph('fund_diff', 'git diff -- Five Forms, Five Comparisons')
    items = [('a', 'a47c3', 'green', False), ('b', 'b325c', 'green', False),
              ('c', 'c10b9', 'green', False), ('d', 'da985', 'green', False),
              ('e', 'ed489', 'green', False)]
    chain(g, items, '#166534')
    head_on(g, 'main', 'main', 'gold')
    bp(g, 'stable', 'stable', 'gold')
    ptr(g, 'main', 'e', '#92400e')
    ptr(g, 'stable', 'a', '#92400e')
    n(g, 'idx', 'Stage (Index)', 'navy')
    n(g, 'wd', 'Working Directory', 'red')
    flow(g, 'idx', 'wd', 'git diff', '#475569')
    flow(g, 'e', 'idx', 'git diff --cached', '#1e40af')
    flow(g, 'e', 'wd', 'git diff HEAD', '#991b1b')
    flow(g, 'a', 'wd', 'git diff stable', '#3730a3')
    flow(g, 'b', 'd', 'git diff b325c da985', '#115e59')
    save(g, 'fund-diff', 'git diff Forms',
         'The same five-commit chain with five labelled comparison arrows: stage-vs-worktree (plain diff), '
         'HEAD-vs-stage (--cached), HEAD-vs-worktree (diff HEAD), an old commit vs worktree (diff stable), and '
         'commit-vs-commit (diff b325c da985) arcing over the chain. No pointer moves and no new commits.')


def _chain5(c, p):
    """Standard five-commit a47c3..ed489 chain + main(HEAD)/stable, ids prefixed with p."""
    items = [(f'{p}a', 'a47c3', 'green', False), (f'{p}b', 'b325c', 'green', False),
              (f'{p}c', 'c10b9', 'green', False), (f'{p}d', 'da985', 'green', False),
              (f'{p}e', 'ed489', 'green', False)]
    chain(c, items, '#166534')
    head_on(c, f'{p}main', 'main', 'gold')
    bp(c, f'{p}stable', 'stable', 'gold')
    ptr(c, f'{p}main', f'{p}e', '#92400e')
    ptr(c, f'{p}stable', f'{p}a', '#92400e')


def diag_fund_commit():
    g = base_graph('fund_commit', 'git commit -- main Advances to a New Commit')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: _chain5(c, 'b'))
    def after(c):
        _chain5(c, 'a')
        cn(c, 'af', 'f0cec', 'gold')
        ce(c, 'ae', 'af', '#166534')
        ptr(c, 'amain', 'af', '#92400e')
        n(c, 'aidx', 'Stage (Index)', 'navy')
        flow(c, 'aidx', 'af', 'files from stage', '#1e40af')
    panel(g, 'cluster_after', 'After: git commit', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    save(g, 'fund-commit', 'git commit',
         'Before: main and HEAD point at ed489, the tip of a five-commit chain. After: a new gold commit f0cec is '
         'created as a child of ed489, and main (with HEAD) moves to point at f0cec; the stage feeds its content into the new commit.')


def diag_fund_commit_stable():
    g = base_graph('fund_commit_stable', 'git commit on an Ancestor Branch -- History Diverges')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: _chain5(c, 'b'))
    def after(c):
        items = [('aa', 'a47c3', 'green', False), ('ab', 'b325c', 'green', False),
                  ('ac', 'c10b9', 'green', False), ('ad', 'da985', 'green', False),
                  ('ae', 'ed489', 'green', False)]
        chain(c, items, '#166534')
        cn(c, 'ax', '1800b', 'gold')
        ce(c, 'aa', 'ax', '#92400e')
        bp(c, 'amain', 'main', 'navy')
        ptr(c, 'amain', 'ae', '#1e40af')
        head_on(c, 'astable', 'stable', 'gold')
        ptr(c, 'astable', 'ax', '#92400e')
    panel(g, 'cluster_after', 'After: git commit (on stable)', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    save(g, 'fund-commit-stable', 'Commit on an Ancestor Branch',
         'Before: stable (an ancestor of main) points at a47c3. After: a commit made while on stable creates gold '
         'commit 1800b as a47c3\'s child; stable now points at 1800b, forking the history away from main\'s '
         'unchanged chain -- a merge or rebase will be needed to rejoin them.')


def diag_fund_commit_amend():
    g = base_graph('fund_commit_amend', 'git commit --amend -- New Sibling, Same Parent')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: _chain5(c, 'b'))
    def after(c):
        items = [('aa', 'a47c3', 'green', False), ('ab', 'b325c', 'green', False),
                  ('ac', 'c10b9', 'green', False), ('ad', 'da985', 'green', False)]
        chain(c, items, '#166534')
        cn(c, 'ae', 'ed489', 'gray', lost=True)
        ce(c, 'ad', 'ae', '#94a3b8', 'dashed')
        cn(c, 'af', '4ca87', 'gold')
        ce(c, 'ad', 'af', '#92400e')
        bp(c, 'astable', 'stable', 'gold')
        ptr(c, 'astable', 'aa', '#92400e')
        head_on(c, 'amain', 'main', 'gold')
        ptr(c, 'amain', 'af', '#92400e')
        note(c, 'lbl', 'ed489 orphaned -- same parent (da985) as the new commit', '#94a3b8')
    panel(g, 'cluster_after', 'After: git commit --amend', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    save(g, 'fund-commit-amend', 'git commit --amend',
         'Before: main points at ed489, child of da985. After: amend creates gold commit 4ca87 with the SAME '
         'parent da985; main moves to 4ca87 and the original ed489 is left drawn but orphaned, referenced by nothing.')


def diag_fund_checkout_files():
    g = base_graph('fund_checkout_files', "git checkout HEAD~ files -- Copy an Old File Into Stage and Worktree")
    _chain5(g, '')
    n(g, 'idx', 'Stage (Index)', 'navy')
    n(g, 'wd', 'Working Directory', 'red')
    flow(g, 'd', 'idx', '', '#1e40af')
    flow(g, 'd', 'wd', '', '#991b1b')
    save(g, 'fund-checkout-files', 'git checkout HEAD~ files',
         'The unchanged five-commit chain with main on ed489 and stable on a47c3. Two solid arrows run from da985 '
         '(HEAD~, the parent of ed489) into both the Stage and the Working Directory -- nothing else moves, no branch changes.')


def diag_fund_checkout_branch():
    g = base_graph('fund_checkout_branch', 'git checkout stable -- HEAD Re-attaches, No Branch Moves')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: _chain5(c, 'b'))
    def after(c):
        items = [('aa', 'a47c3', 'green', False), ('ab', 'b325c', 'green', False),
                  ('ac', 'c10b9', 'green', False), ('ad', 'da985', 'green', False),
                  ('ae', 'ed489', 'green', False)]
        chain(c, items, '#166534')
        bp(c, 'amain', 'main', 'navy')
        ptr(c, 'amain', 'ae', '#1e40af')
        head_on(c, 'astable', 'stable', 'gold')
        ptr(c, 'astable', 'aa', '#92400e')
        n(c, 'aidx', 'Stage (Index)', 'navy')
        n(c, 'awd', 'Working Directory', 'red')
        flow(c, 'aa', 'aidx', '', '#1e40af')
        flow(c, 'aa', 'awd', '', '#991b1b')
    panel(g, 'cluster_after', 'After: git checkout stable', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    save(g, 'fund-checkout-branch', 'git checkout stable',
         'Before: HEAD is attached to main (at ed489). After: HEAD detaches from main and re-attaches to stable '
         '(at a47c3); neither branch pointer moves, only HEAD does, and a47c3\'s files flow into the stage and worktree.')


def diag_fund_checkout_detached():
    g = base_graph('fund_checkout_detached', 'git checkout main~3 -- Detached HEAD')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: _chain5(c, 'b'))
    def after(c):
        items = [('aa', 'a47c3', 'green', False), ('ab', 'b325c', 'green', False),
                  ('ac', 'c10b9', 'green', False), ('ad', 'da985', 'green', False),
                  ('ae', 'ed489', 'green', False)]
        chain(c, items, '#166534')
        bp(c, 'amain', 'main', 'navy')
        ptr(c, 'amain', 'ae', '#1e40af')
        bp(c, 'astable', 'stable', 'navy')
        ptr(c, 'astable', 'aa', '#1e40af')
        bp(c, 'ahead', 'HEAD', 'gray')
        ptr(c, 'ahead', 'ab', '#374151', 'solid')
        n(c, 'aidx', 'Stage (Index)', 'navy')
        n(c, 'awd', 'Working Directory', 'red')
        flow(c, 'ab', 'aidx', '', '#1e40af')
        flow(c, 'ab', 'awd', '', '#991b1b')
    panel(g, 'cluster_after', 'After: git checkout main~3', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    save(g, 'fund-checkout-detached', 'Detached HEAD',
         'Before: HEAD is attached to main. After: HEAD becomes a standalone gray pill pointing straight at '
         'b325c (main~3) instead of at a branch -- an "anonymous branch" -- while main and stable stay put.')


def diag_fund_detached_sequence():
    g = base_graph('fund_detached_sequence', 'Committing on a Detached HEAD, Then Losing or Rescuing It')

    def p1(c):
        items = [('1a', 'a47c3', 'green', False), ('1b', 'b325c', 'green', False),
                  ('1c', 'c10b9', 'green', False), ('1d', 'da985', 'green', False),
                  ('1e', 'ed489', 'green', False)]
        chain(c, items, '#166534')
        cn(c, '1x', '2eecb', 'gold')
        ce(c, '1b', '1x', '#92400e')
        bp(c, '1main', 'main', 'navy')
        ptr(c, '1main', '1e', '#1e40af')
        bp(c, '1stable', 'stable', 'navy')
        ptr(c, '1stable', '1a', '#1e40af')
        bp(c, '1head', 'HEAD', 'gray')
        ptr(c, '1head', '1x', '#374151', 'solid')
    panel(g, 'cluster_p1', '1. git commit (detached)', PANEL_GOLD, p1)

    def p2(c):
        items = [('2a', 'a47c3', 'green', False), ('2b', 'b325c', 'green', False),
                  ('2c', 'c10b9', 'green', False), ('2d', 'da985', 'green', False),
                  ('2e', 'ed489', 'green', False)]
        chain(c, items, '#166534')
        cn(c, '2x', '2eecb', 'gray', lost=True)
        ce(c, '2b', '2x', '#94a3b8', 'dashed')
        head_on(c, '2main', 'main', 'gold')
        ptr(c, '2main', '2e', '#92400e')
        bp(c, '2stable', 'stable', 'navy')
        ptr(c, '2stable', '2a', '#1e40af')
        note(c, '2lbl', '2eecb now referenced by nothing', '#94a3b8')
    panel(g, 'cluster_p2', '2. git checkout main', PANEL_GRAY, p2)

    def p3(c):
        items = [('3a', 'a47c3', 'green', False), ('3b', 'b325c', 'green', False),
                  ('3c', 'c10b9', 'green', False), ('3d', 'da985', 'green', False),
                  ('3e', 'ed489', 'green', False)]
        chain(c, items, '#166534')
        cn(c, '3x', '2eecb', 'green')
        ce(c, '3b', '3x', '#166534')
        bp(c, '3main', 'main', 'navy')
        ptr(c, '3main', '3e', '#1e40af')
        bp(c, '3stable', 'stable', 'navy')
        ptr(c, '3stable', '3a', '#1e40af')
        head_on(c, '3new', 'new', 'gold')
        ptr(c, '3new', '3x', '#92400e')
    panel(g, 'cluster_p3', '3. git checkout -b new', PANEL_GOLD, p3)
    order(g, '1e', '2a', '2e', '3a')
    save(g, 'fund-detached-sequence', 'Detached HEAD: Commit, Lose, Rescue',
         'Three panels: (1) committing on a detached HEAD creates gold commit 2eecb with HEAD pointing straight at '
         'it; (2) checking out main leaves 2eecb faded and unreferenced; (3) git checkout -b new creates a new gold '
         'branch pointing at 2eecb, rescuing it before garbage collection.')


def diag_fund_reset_commit():
    g = base_graph('fund_reset_commit', 'git reset HEAD~3 -- main Moves Back, Later Commits Orphaned')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: _chain5(c, 'b'))
    def after(c):
        cn(c, 'aa', 'a47c3', 'green')
        cn(c, 'ab', 'b325c', 'green')
        cn(c, 'ac', 'c10b9', 'gray', lost=True)
        cn(c, 'ad', 'da985', 'gray', lost=True)
        cn(c, 'ae', 'ed489', 'gray', lost=True)
        ce(c, 'aa', 'ab', '#166534')
        ce(c, 'ab', 'ac', '#94a3b8', 'dashed')
        ce(c, 'ac', 'ad', '#94a3b8', 'dashed')
        ce(c, 'ad', 'ae', '#94a3b8', 'dashed')
        bp(c, 'astable', 'stable', 'navy')
        ptr(c, 'astable', 'aa', '#1e40af')
        head_on(c, 'amain', 'main', 'gold')
        ptr(c, 'amain', 'ab', '#92400e')
        n(c, 'aidx', 'Stage (Index)', 'navy')
        n(c, 'awd', 'Working Directory', 'red')
        flow(c, 'ab', 'aidx', '(if not --soft)', '#1e40af')
        flow(c, 'ab', 'awd', '(if --hard)', '#991b1b')
    panel(g, 'cluster_after', 'After: git reset HEAD~3', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    save(g, 'fund-reset-commit', 'git reset HEAD~3',
         'Before: main points at ed489. After: main moves back three commits to b325c; c10b9, da985 and ed489 stay '
         'drawn but faded, now unreferenced. The stage updates unless --soft; the worktree updates only if --hard.')


def diag_fund_reset_bare():
    g = base_graph('fund_reset_bare', 'git reset -- Sync Stage (and Worktree if --hard) to HEAD')
    _chain5(g, '')
    n(g, 'idx', 'Stage (Index)', 'navy')
    n(g, 'wd', 'Working Directory', 'red')
    flow(g, 'e', 'idx', '', '#1e40af')
    flow(g, 'e', 'wd', '(if --hard)', '#991b1b')
    save(g, 'fund-reset-bare', 'git reset',
         'The unchanged chain with main on ed489. ed489 always flows into the Stage; it only flows into the '
         'Working Directory when --hard is given. No branch pointer moves.')


def diag_fund_reset_files():
    g = base_graph('fund_reset_files', 'git reset -- files -- Stage Only, Never the Worktree')
    _chain5(g, '')
    n(g, 'idx', 'Stage (Index)', 'navy')
    n(g, 'wd', 'Working Directory', 'red')
    flow(g, 'e', 'idx', '', '#1e40af')
    save(g, 'fund-reset-files', 'git reset -- files',
         'The unchanged chain with main on ed489. A single arrow copies ed489 into the Stage only -- the Working '
         'Directory box is untouched, which is why this form is always working-directory safe.')


def diag_fund_reset_modes():
    g = base_graph('fund_reset_modes', 'reset --soft / --mixed / --hard -- Which Trees Move')

    def build(p, head_matches_tip, idx_matches_tip, wd_matches_tip, style):
        def inner(c):
            cn(c, f'{p}v1', 'v1', 'green')
            cn(c, f'{p}v2', 'v2', 'green')
            cn(c, f'{p}v3', 'v3', 'green')
            ce(c, f'{p}v1', f'{p}v2', '#166534')
            ce(c, f'{p}v2', f'{p}v3', '#166534')
            bp(c, f'{p}main', 'main', 'gold')
            ptr(c, f'{p}main', f'{p}v2', '#92400e')
            n(c, f'{p}head_cell', 'HEAD: v2', 'gold')
            n(c, f'{p}idx_cell', f'Index: {"v2" if idx_matches_tip else "v3"}', 'gold' if idx_matches_tip else 'gray')
            n(c, f'{p}wd_cell', f'Working Dir: {"v2" if wd_matches_tip else "v3"}', 'gold' if wd_matches_tip else 'gray')
            flow(c, f'{p}head_cell', f'{p}idx_cell', '', '#94a3b8', 'invis')
            flow(c, f'{p}idx_cell', f'{p}wd_cell', '', '#94a3b8', 'invis')
        return inner

    panel(g, 'cluster_soft', 'git reset --soft HEAD~', PANEL_GOLD, build('s_', True, False, False, PANEL_GOLD))
    panel(g, 'cluster_mixed', 'git reset --mixed HEAD~', PANEL_NAVY, build('m_', True, True, False, PANEL_NAVY))
    panel(g, 'cluster_hard', 'git reset --hard HEAD~', PANEL_RED, build('h_', True, True, True, PANEL_RED))
    order(g, 's_v3', 'm_v1', 'm_v3', 'h_v1')
    save(g, 'fund-reset-modes', 'reset --soft vs --mixed vs --hard',
         'Three panels sharing the same v1-v2-v3 commit chain: --soft only moves HEAD/main back to v2, leaving '
         'Index and Working Directory at v3; --mixed also resyncs the Index to v2; --hard resyncs both the Index '
         'and the Working Directory to v2, the only mode that can discard uncommitted work.')


def diag_fund_merge_ff():
    g = base_graph('fund_merge_ff', 'git merge main -- Fast-Forward, No New Commit')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: _chain5(c, 'b'))
    def after(c):
        items = [('aa', 'a47c3', 'green', False), ('ab', 'b325c', 'green', False),
                  ('ac', 'c10b9', 'green', False), ('ad', 'da985', 'green', False),
                  ('ae', 'ed489', 'green', False)]
        chain(c, items, '#166534')
        bp(c, 'amain', 'main', 'navy')
        ptr(c, 'amain', 'ae', '#1e40af')
        head_on(c, 'astable', 'stable', 'gold')
        ptr(c, 'astable', 'ae', '#92400e')
        n(c, 'aidx', 'Stage (Index)', 'navy')
        n(c, 'awd', 'Working Directory', 'red')
        flow(c, 'ae', 'aidx', '', '#1e40af')
        flow(c, 'ae', 'awd', '', '#991b1b')
        note(c, 'lbl', 'no new commit -- stable just slides up to ed489', '#166534')
    panel(g, 'cluster_after', 'After: git merge main (on stable)', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    save(g, 'fund-merge-ff', 'Fast-Forward Merge',
         'Before: stable is behind main, at a47c3. After: merging main into stable just slides the stable pointer '
         'up to ed489 -- no merge commit is created -- and ed489\'s files flow into the stage and worktree.')


def _merge3way_topic(c, p):
    items = [(f'{p}a', 'a47c3', 'green', False), (f'{p}b', 'b325c', 'green', False),
              (f'{p}c', 'c10b9', 'green', False), (f'{p}d', 'da985', 'green', False),
              (f'{p}e', 'ed489', 'green', False)]
    chain(c, items, '#166534')
    cn(c, f'{p}f1', '2eecb', 'purple')
    cn(c, f'{p}f2', '33104', 'purple')
    ce(c, f'{p}b', f'{p}f1', '#3730a3')
    ce(c, f'{p}f1', f'{p}f2', '#3730a3')
    bp(c, f'{p}other', 'other', 'purple')
    ptr(c, f'{p}other', f'{p}f2', '#3730a3')
    head_on(c, f'{p}main', 'main', 'gold')
    ptr(c, f'{p}main', f'{p}e', '#92400e')


def diag_fund_merge_3way():
    g = base_graph('fund_merge_3way', 'git merge other -- Three-Way Merge Commit')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: _merge3way_topic(c, 'b'))
    def after(c):
        _merge3way_topic(c, 'a')
        cn(c, 'am', 'f8bc5', 'gold')
        ce(c, 'ae', 'am', '#92400e')
        ce(c, 'af2', 'am', '#92400e')
        note(c, 'merge3', '3-way merge', '#1e40af')
        flow(c, 'ae', 'merge3', 'current commit', '#1e40af')
        flow(c, 'af2', 'merge3', 'other commit', '#3730a3')
        flow(c, 'ab', 'merge3', 'common ancestor', '#166534')
        n(c, 'aidx', 'Stage', 'navy')
        n(c, 'awd', 'Working Directory', 'red')
        flow(c, 'merge3', 'aidx', '', '#1e40af')
        flow(c, 'merge3', 'awd', '', '#991b1b')
        flow(c, 'aidx', 'am', '(if no conflicts)', '#92400e')
        ptr(c, 'amain', 'am', '#92400e')
    panel(g, 'cluster_after', 'After: git merge other (on main)', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    save(g, 'fund-merge-3way', 'Three-Way Merge',
         'Before: main is at ed489 and other has diverged through 2eecb to 33104 off the shared ancestor b325c. '
         'After: a 3-way-merge combines the current commit ed489, the other commit 33104 and their common ancestor '
         'b325c into a new gold merge commit f8bc5 with two parents; main advances to it once the stage lands with no conflicts.')


def diag_fund_cherry_pick():
    g = base_graph('fund_cherry_pick', 'git cherry-pick 2c33a -- Copy One Commit Onto main')

    def topic(c, p):
        _chain5(c, p)
        cn(c, f'{p}t1', '169a6', 'purple')
        cn(c, f'{p}t2', '2c33a', 'purple')
        cn(c, f'{p}t3', '3ba22', 'purple')
        ce(c, f'{p}a', f'{p}t1', '#3730a3')
        ce(c, f'{p}t1', f'{p}t2', '#3730a3')
        ce(c, f'{p}t2', f'{p}t3', '#3730a3')
        bp(c, f'{p}topic', 'topic', 'purple')
        ptr(c, f'{p}topic', f'{p}t3', '#3730a3')

    panel(g, 'cluster_before', 'Before', PANEL_GRAY, lambda c: topic(c, 'b'))
    def after(c):
        topic(c, 'a')
        cn(c, 'af', 'f142b', 'gold')
        ce(c, 'ae', 'af', '#92400e')
        copied(c, 'at2', 'af')
        ptr(c, 'amain', 'af', '#92400e')
    panel(g, 'cluster_after', 'After: git cherry-pick 2c33a (on main)', PANEL_GOLD, after)
    order(g, 'be', 'aa')
    g.edge('bt3', 'aa', style='invis', weight='0')
    save(g, 'fund-cherry-pick', 'git cherry-pick',
         'Before: topic branches off main through 169a6, 2c33a, 3ba22. After: a new gold commit f142b is created '
         'as a child of main\'s ed489, linked to 2c33a by a dotted "copied from" line; main advances to f142b while topic is untouched.')


def diag_fund_rebase():
    g = base_graph('fund_rebase', 'git rebase main -- Replay topic Onto main\'s Tip')

    def base4(c, p):
        items = [(f'{p}a', 'a47c3', 'green', False), (f'{p}b', 'b325c', 'green', False),
                  (f'{p}c', 'c10b9', 'green', False), (f'{p}d', 'da985', 'green', False)]
        chain(c, items, '#166534')
        bp(c, f'{p}main', 'main', 'navy')
        ptr(c, f'{p}main', f'{p}d', '#1e40af')

    def before(c):
        base4(c, 'b')
        cn(c, 'bt1', '169a6', 'purple')
        cn(c, 'bt2', '2c33a', 'purple')
        ce(c, 'ba', 'bt1', '#3730a3')
        ce(c, 'bt1', 'bt2', '#3730a3')
        head_on(c, 'btopic', 'topic', 'gold')
        ptr(c, 'btopic', 'bt2', '#92400e')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, before)

    def after(c):
        base4(c, 'a')
        cn(c, 'at1', '169a6', 'gray', lost=True)
        cn(c, 'at2', '2c33a', 'gray', lost=True)
        ce(c, 'aa', 'at1', '#94a3b8', 'dashed')
        ce(c, 'at1', 'at2', '#94a3b8', 'dashed')
        cn(c, 'ar1', 'e57cf', 'gold')
        cn(c, 'ar2', 'f7e63', 'gold')
        ce(c, 'ad', 'ar1', '#92400e')
        ce(c, 'ar1', 'ar2', '#92400e')
        copied(c, 'at1', 'ar1')
        copied(c, 'at2', 'ar2')
        head_on(c, 'atopic', 'topic', 'gold')
        ptr(c, 'atopic', 'ar2', '#92400e')
    panel(g, 'cluster_after', 'After: git rebase main (on topic)', PANEL_GOLD, after)
    order(g, 'bd', 'aa')
    save(g, 'fund-rebase', 'git rebase',
         'Before: topic forks off main through 169a6 and 2c33a. After: those two commits are replayed as new gold '
         'commits e57cf and f7e63 directly on top of main\'s tip da985; topic moves to f7e63 and the two originals '
         'are left faded and unreferenced, pending garbage collection.')


def diag_fund_rebase_onto():
    g = base_graph('fund_rebase_onto', 'git rebase --onto main 169a6 -- Replay Only the Commits Since 169a6')

    def base4(c, p):
        items = [(f'{p}a', 'a47c3', 'green', False), (f'{p}b', 'b325c', 'green', False),
                  (f'{p}c', 'c10b9', 'green', False), (f'{p}d', 'da985', 'green', False)]
        chain(c, items, '#166534')
        bp(c, f'{p}main', 'main', 'navy')
        ptr(c, f'{p}main', f'{p}d', '#1e40af')

    def before(c):
        base4(c, 'b')
        cn(c, 'bt1', '169a6', 'purple')
        cn(c, 'bt2', '2c33a', 'purple')
        ce(c, 'ba', 'bt1', '#3730a3')
        ce(c, 'bt1', 'bt2', '#3730a3')
        head_on(c, 'btopic', 'topic', 'gold')
        ptr(c, 'btopic', 'bt2', '#92400e')
    panel(g, 'cluster_before', 'Before', PANEL_GRAY, before)

    def after(c):
        base4(c, 'a')
        cn(c, 'at1', '169a6', 'purple')
        cn(c, 'at2', '2c33a', 'gray', lost=True)
        ce(c, 'aa', 'at1', '#3730a3')
        ce(c, 'at1', 'at2', '#94a3b8', 'dashed')
        cn(c, 'ar1', 'e918c', 'gold')
        ce(c, 'ad', 'ar1', '#92400e')
        copied(c, 'at2', 'ar1')
        head_on(c, 'atopic', 'topic', 'gold')
        ptr(c, 'atopic', 'ar1', '#92400e')
        note(c, 'lbl', '169a6 stays put -- it is NOT replayed', '#3730a3')
    panel(g, 'cluster_after', 'After: git rebase --onto main 169a6', PANEL_GOLD, after)
    order(g, 'bd', 'aa')
    save(g, 'fund-rebase-onto', 'git rebase --onto',
         'Before: topic has two commits past main, 169a6 then 2c33a. After: only 2c33a (the commit AFTER 169a6) is '
         'replayed, as gold commit e918c on main\'s tip; 169a6 itself is left exactly where it was, untouched and not replayed.')


# =====================================================================
# COMMIT GRAPH -- Pro Git ch1-3, ch5, ch7, ch10
# =====================================================================

def diag_graph_snapshots_vs_deltas():
    g = base_graph('graph_snapshots_vs_deltas', 'Storing Changes as Deltas vs. as Snapshots')

    def deltas(c):
        rows = ''.join(
            f'<TR><TD><FONT COLOR="#166534">File {f}</FONT></TD>' +
            ''.join(f'<TD BGCOLOR="{"#dcfce7" if v else "#ffffff"}">{v if v else ""}</TD>' for v in cells) +
            '</TR>'
            for f, cells in [
                ('A', ['v1', 'D1', '', 'D2', '']),
                ('B', ['v1', '', '', 'D1', 'D2']),
                ('C', ['v1', 'D1', 'D2', '', 'D3']),
            ]
        )
        header = ''.join(f'<TD><FONT POINT-SIZE="9">V{i}</FONT></TD>' for i in range(1, 6))
        html = (f'<<TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#166534">'
                f'<TR><TD></TD>{header}</TR>{rows}</TABLE>>')
        c.node('deltas', html, shape='plaintext')
    panel(g, 'cluster_deltas', 'Deltas -- each file stores its own history of changes', PANEL_GREEN, deltas)

    def snaps(c):
        cells = [
            ['A', 'B', 'C'],
            ['A1', 'B*', 'C1'],
            ['A1*', 'B*', 'C2'],
            ['A2', 'B1', 'C2*'],
            ['A2*', 'B2', 'C3'],
        ]
        rows_html = []
        for r in range(3):
            row = ''.join(f'<TD BGCOLOR="{"#fef3c7" if not cells[v][r].endswith("*") else "#ffffff"}">{cells[v][r]}</TD>' for v in range(5))
            rows_html.append(f'<TR>{row}</TR>')
        header = ''.join(f'<TD><FONT POINT-SIZE="9">V{i}</FONT></TD>' for i in range(1, 6))
        html = (f'<<TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="6" COLOR="#92400e">'
                f'<TR>{header}</TR>{"".join(rows_html)}</TABLE>>')
        c.node('snaps', html, shape='plaintext')
        c.node('legend', '* = unchanged, links to previous blob', shape='plaintext', fontsize='9', fontcolor='#92400e')
    panel(g, 'cluster_snaps', 'Snapshots -- each version is a full snapshot of every file', PANEL_GOLD, snaps)
    order(g, 'deltas', 'snaps')
    save(g, 'graph-snapshots-vs-deltas', 'Deltas vs. Snapshots',
         'Two tables side by side across five checkins. The delta model stores each file\'s own chain of changes '
         'with gaps where a file did not change; the snapshot model gives every version a full row per file, '
         'marking cells with a star where Git reuses the previous unchanged blob instead of storing new content.')


def diag_graph_three_states():
    g = base_graph('graph_three_states', 'The Three States -- Working Tree, Staging Area, .git Directory')
    n(g, 'git', '.git Directory\n(Repository)', 'gray')
    n(g, 'wd', 'Working Tree', 'red')
    n(g, 'idx', 'Staging Area', 'navy')
    e(g, 'git', 'wd', 'Checkout the project', '#374151')
    e(g, 'wd', 'idx', 'Stage fixes', '#991b1b')
    e(g, 'idx', 'git', 'Commit', '#1e40af')
    save(g, 'graph-three-states', 'The Three States',
         'Three boxes -- .git Directory, Working Tree, Staging Area -- in a cycle: checkout unpacks the repository '
         'into the working tree, staging copies edited files into the staging area, and commit seals the staging area back into the repository.')


def diag_graph_file_lifecycle():
    g = base_graph('graph_file_lifecycle', 'The Lifecycle of File Status')
    n(g, 'untracked', 'Untracked', 'gray')
    n(g, 'unmodified', 'Unmodified', 'teal')
    n(g, 'modified', 'Modified', 'gold')
    n(g, 'staged', 'Staged', 'red')
    e(g, 'untracked', 'staged', 'Add the file', '#166534')
    e(g, 'unmodified', 'modified', 'Edit the file', '#92400e')
    e(g, 'modified', 'staged', 'Stage the file', '#991b1b')
    e(g, 'unmodified', 'untracked', 'Remove the file', '#374151', 'dashed')
    e(g, 'staged', 'unmodified', 'Commit', '#1e40af', 'dashed')
    save(g, 'graph-file-lifecycle', 'File Status Lifecycle',
         'Four states -- Untracked, Unmodified, Modified, Staged -- left to right, with five labelled transitions: '
         'add moves untracked straight to staged, edit moves unmodified to modified, stage moves modified to '
         'staged, remove moves unmodified back to untracked, and commit moves staged back to unmodified.')


def diag_graph_commit_and_tree():
    g = base_graph('graph_commit_and_tree', 'A Commit and Its Tree')
    cn(g, 'commit', '98ca9', 'green')
    n(g, 'tree', 'tree 92ec2', 'teal')
    n(g, 'b1', 'blob 5b1d3\nREADME', 'amber')
    n(g, 'b2', 'blob 911e7\nLICENSE', 'amber')
    n(g, 'b3', 'blob cba0a\ntest.rb', 'amber')
    e(g, 'commit', 'tree', '', '#166534')
    e(g, 'tree', 'b1', '', '#115e59')
    e(g, 'tree', 'b2', '', '#115e59')
    e(g, 'tree', 'b3', '', '#115e59')
    save(g, 'graph-commit-and-tree', 'A Commit and Its Tree',
         'Commit 98ca9 points to one tree object 92ec2, which in turn points to three blob objects -- README, '
         'LICENSE and test.rb -- the top-level directory listing for that snapshot.')


def diag_graph_commits_and_parents():
    g = base_graph('graph_commits_and_parents', 'Commits and Their Parents')
    items = [('a', '98ca9', 'green', False), ('b', '34ac2', 'green', False), ('c', 'f30ab', 'green', False)]
    chain(g, items, '#166534')
    n(g, 'sa', 'Snapshot A', 'teal')
    n(g, 'sb', 'Snapshot B', 'teal')
    n(g, 'sc', 'Snapshot C', 'teal')
    e(g, 'a', 'sa', '', '#115e59')
    e(g, 'b', 'sb', '', '#115e59')
    e(g, 'c', 'sc', '', '#115e59')
    save(g, 'graph-commits-and-parents', 'Commits and Their Parents',
         'A three-commit chain 98ca9 to 34ac2 to f30ab, each one a child pointing back to its parent, and each '
         'commit also pointing down to the snapshot (tree) it recorded.')


def diag_graph_branches_head():
    g = base_graph('graph_branches_head', 'Branches Are Pointers; HEAD Points to the Current Branch')
    items = [('a', '98ca9', 'green', False), ('b', '34ac2', 'green', False), ('c', 'f30ab', 'green', False)]
    chain(g, items, '#166534')
    bp(g, 'tag', 'v1.0', 'amber')
    ptr(g, 'tag', 'c', '#92400e')
    head_on(g, 'testing', 'testing', 'gold')
    ptr(g, 'testing', 'c', '#92400e')
    bp(g, 'master', 'master', 'navy')
    ptr(g, 'master', 'c', '#1e40af')
    save(g, 'graph-branches-head', 'Branches, Tags and HEAD',
         'A three-commit chain with master and testing both pointing at the tip commit f30ab, a v1.0 tag on the '
         'same commit, and HEAD attached to testing -- showing several refs can point at one commit at once.')


def diag_graph_divergent_history():
    g = base_graph('graph_divergent_history', 'Divergent History -- testing and master Drift Apart')

    def p1(c):
        items = [('1a', '98ca9', 'green', False), ('1b', '34ac2', 'green', False), ('1c', 'f30ab', 'green', False), ('1d', '87ab2', 'green', False)]
        chain(c, items, '#166534')
        bp(c, '1main', 'master', 'navy')
        ptr(c, '1main', '1c', '#1e40af')
        head_on(c, '1testing', 'testing', 'gold')
        ptr(c, '1testing', '1d', '#92400e')
    panel(g, 'cluster_p1', '1. Advance testing', PANEL_GOLD, p1)

    def p2(c):
        items = [('2a', '98ca9', 'green', False), ('2b', '34ac2', 'green', False), ('2c', 'f30ab', 'green', False), ('2d', '87ab2', 'green', False)]
        chain(c, items, '#166534')
        head_on(c, '2main', 'master', 'gold')
        ptr(c, '2main', '2c', '#92400e')
        bp(c, '2testing', 'testing', 'navy')
        ptr(c, '2testing', '2d', '#1e40af')
    panel(g, 'cluster_p2', '2. git checkout master', PANEL_GRAY, p2)

    def p3(c):
        items = [('3a', '98ca9', 'green', False), ('3b', '34ac2', 'green', False), ('3c', 'f30ab', 'green', False)]
        chain(c, items, '#166534')
        cn(c, '3d', '87ab2', 'green')
        ce(c, '3c', '3d', '#166534')
        cn(c, '3e', 'c2b9e', 'gold')
        ce(c, '3c', '3e', '#92400e')
        bp(c, '3testing', 'testing', 'navy')
        ptr(c, '3testing', '3d', '#1e40af')
        head_on(c, '3main', 'master', 'gold')
        ptr(c, '3main', '3e', '#92400e')
    panel(g, 'cluster_p3', '3. Advance master', PANEL_GOLD, p3)
    order(g, '1d', '2a', '2d', '3a')
    save(g, 'graph-divergent-history', 'Divergent History',
         'Three panels: testing advances to 87ab2 while master stays at f30ab; checking out master moves HEAD '
         'without moving either branch; then master advances on its own to a sibling commit c2b9e, so f30ab now has two children.')


def diag_graph_basic_branching():
    g = base_graph('graph_basic_branching', 'Basic Branching -- iss53, a hotfix, and a Fast-Forward')

    def p1(c):
        items = [('1c0', 'C0', 'green', False), ('1c1', 'C1', 'green', False), ('1c2', 'C2', 'green', False)]
        chain(c, items, '#166534')
        bp(c, '1main', 'master', 'navy')
        ptr(c, '1main', '1c2', '#1e40af')
        head_on(c, '1iss53', 'iss53', 'gold')
        ptr(c, '1iss53', '1c2', '#92400e')
    panel(g, 'cluster_p1', '1. git checkout -b iss53', PANEL_GOLD, p1)

    def p2(c):
        items = [('2c0', 'C0', 'green', False), ('2c1', 'C1', 'green', False), ('2c2', 'C2', 'green', False)]
        chain(c, items, '#166534')
        cn(c, '2c4', 'C4', 'gold')
        cn(c, '2c3', 'C3', 'purple')
        ce(c, '2c2', '2c4', '#92400e')
        ce(c, '2c2', '2c3', '#3730a3')
        head_on(c, '2hotfix', 'hotfix', 'gold')
        ptr(c, '2hotfix', '2c4', '#92400e')
        bp(c, '2iss53', 'iss53', 'purple')
        ptr(c, '2iss53', '2c3', '#3730a3')
        bp(c, '2main', 'master', 'navy')
        ptr(c, '2main', '2c2', '#1e40af')
    panel(g, 'cluster_p2', '2. hotfix branched off master', PANEL_GOLD, p2)

    def p3(c):
        items = [('3c0', 'C0', 'green', False), ('3c1', 'C1', 'green', False), ('3c2', 'C2', 'green', False), ('3c4', 'C4', 'navy', False)]
        chain(c, items, '#166534')
        cn(c, '3c3', 'C3', 'purple')
        ce(c, '3c2', '3c3', '#3730a3')
        head_on(c, '3main', 'master', 'gold')
        ptr(c, '3main', '3c4', '#92400e')
        bp(c, '3hotfix', 'hotfix', 'navy')
        ptr(c, '3hotfix', '3c4', '#1e40af')
        bp(c, '3iss53', 'iss53', 'purple')
        ptr(c, '3iss53', '3c3', '#3730a3')
    panel(g, 'cluster_p3', '3. git merge hotfix (fast-forward)', PANEL_NAVY, p3)
    order(g, '1c2', '2c0', '2c4', '3c0')
    save(g, 'graph-basic-branching', 'Basic Branching and a Fast-Forward',
         'Three panels: iss53 is created at C2; a hotfix branch also forks from C2 into C4 while iss53 moves on to '
         'its own C3; merging hotfix into master fast-forwards master straight to C4 since master had not moved.')


def diag_graph_three_way_merge():
    g = base_graph('graph_three_way_merge', 'A Three-Way Merge Commit')
    cn(g, 'c1', 'C1', 'green')
    cn(g, 'c2', 'C2', 'green')
    ce(g, 'c1', 'c2', '#166534')
    cn(g, 'c4', 'C4', 'navy')
    ce(g, 'c2', 'c4', '#1e40af')
    cn(g, 'c3', 'C3', 'purple')
    cn(g, 'c5', 'C5', 'purple')
    ce(g, 'c2', 'c3', '#3730a3')
    ce(g, 'c3', 'c5', '#3730a3')
    cn(g, 'c6', 'C6', 'gold')
    ce(g, 'c4', 'c6', '#92400e')
    ce(g, 'c5', 'c6', '#92400e')
    bp(g, 'iss53', 'iss53', 'purple')
    ptr(g, 'iss53', 'c5', '#3730a3')
    head_on(g, 'master', 'master', 'gold')
    ptr(g, 'master', 'c6', '#92400e')
    note(g, 'lbl1', 'C2 = common ancestor', '#166534')
    note(g, 'lbl2', 'C4 = merge into (master)', '#1e40af')
    note(g, 'lbl3', 'C5 = merge in (iss53)', '#3730a3')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('lbl1')
        s.node('lbl2')
        s.node('lbl3')
    g.edge('lbl1', 'lbl2', style='invis', weight='0')
    g.edge('lbl2', 'lbl3', style='invis', weight='0')
    g.edge('c2', 'lbl1', style='invis', weight='3')
    g.edge('c4', 'lbl2', style='invis', weight='3')
    g.edge('c5', 'lbl3', style='invis', weight='3')
    save(g, 'graph-three-way-merge', 'Three-Way Merge',
         'master (C4) and iss53 (C5) both descend from the common ancestor C2. Merging iss53 into master creates '
         'gold merge commit C6 with two parent edges, one to C4 and one to C5; master advances to C6.')


def diag_graph_rebase_vs_merge():
    g = base_graph('graph_rebase_vs_merge', 'Merge vs. Rebase -- Same Divergence, Two Resolutions')

    def base(c, prefix):
        cn(c, f'{prefix}c0', 'C0', 'green')
        cn(c, f'{prefix}c1', 'C1', 'green')
        cn(c, f'{prefix}c2', 'C2', 'green')
        ce(c, f'{prefix}c0', f'{prefix}c1', '#166534')
        ce(c, f'{prefix}c1', f'{prefix}c2', '#166534')
        cn(c, f'{prefix}c3', 'C3', 'navy')
        ce(c, f'{prefix}c2', f'{prefix}c3', '#1e40af')
        cn(c, f'{prefix}c4', 'C4', 'purple')
        ce(c, f'{prefix}c2', f'{prefix}c4', '#3730a3')

    def merge_panel(c):
        base(c, 'm')
        cn(c, 'mc5', 'C5', 'gold')
        ce(c, 'mc3', 'mc5', '#92400e')
        ce(c, 'mc4', 'mc5', '#92400e')
        head_on(c, 'mmaster', 'master', 'gold')
        ptr(c, 'mmaster', 'mc5', '#92400e')
        bp(c, 'mexp', 'experiment', 'purple')
        ptr(c, 'mexp', 'mc4', '#3730a3')
    panel(g, 'cluster_merge', 'git merge experiment', PANEL_GOLD, merge_panel)

    def rebase_panel(c):
        base(c, 'r')
        cn(c, 'rc4p', "C4'", 'gold')
        ce(c, 'rc3', 'rc4p', '#92400e')
        cn(c, 'rc4', 'C4', 'gray', lost=True)
        ce(c, 'rc2', 'rc4', '#94a3b8', 'dashed')
        copied(c, 'rc4', 'rc4p')
        head_on(c, 'rmaster', 'master', 'gold')
        ptr(c, 'rmaster', 'rc4p', '#92400e')
        bp(c, 'rexp', 'experiment', 'gold')
        ptr(c, 'rexp', 'rc4p', '#92400e')
    panel(g, 'cluster_rebase', 'git rebase master (on experiment), then fast-forward', PANEL_NAVY, rebase_panel)
    order(g, 'mc5', 'rc0')
    save(g, 'graph-rebase-vs-merge', 'Merge vs. Rebase',
         'Both panels start from the same fork: master at C3, experiment at C4, both off C2. Merging creates a new '
         'two-parent commit C5 on master. Rebasing instead replays C4 as a new commit C4\' directly on top of C3, '
         'fades the original C4, and lets master fast-forward to the now-linear tip.')


def diag_graph_rebase_onto_topic():

    def p1(c):
        cn(c, '1c1', 'C1', 'green')
        cn(c, '1c2', 'C2', 'green')
        cn(c, '1c5', 'C5', 'navy')
        cn(c, '1c6', 'C6', 'navy')
        ce(c, '1c1', '1c2', '#166534')
        ce(c, '1c2', '1c5', '#1e40af')
        ce(c, '1c5', '1c6', '#1e40af')
        head_on(c, '1master', 'master', 'gold')
        ptr(c, '1master', '1c6', '#92400e')
        cn(c, '1c3', 'C3', 'purple')
        cn(c, '1c4', 'C4', 'purple')
        cn(c, '1c10', 'C10', 'purple')
        ce(c, '1c2', '1c3', '#3730a3')
        ce(c, '1c3', '1c4', '#3730a3')
        ce(c, '1c4', '1c10', '#3730a3')
        bp(c, '1server', 'server', 'purple')
        ptr(c, '1server', '1c10', '#3730a3')
        cn(c, '1c8', 'C8', 'teal')
        cn(c, '1c9', 'C9', 'teal')
        ce(c, '1c3', '1c8', '#115e59')
        ce(c, '1c8', '1c9', '#115e59')
        bp(c, '1client', 'client', 'teal')
        ptr(c, '1client', '1c9', '#115e59')

    def p2(c):
        cn(c, '2c1', 'C1', 'green')
        cn(c, '2c2', 'C2', 'green')
        cn(c, '2c5', 'C5', 'navy')
        cn(c, '2c6', 'C6', 'navy')
        ce(c, '2c1', '2c2', '#166534')
        ce(c, '2c2', '2c5', '#1e40af')
        ce(c, '2c5', '2c6', '#1e40af')
        bp(c, '2master', 'master', 'navy')
        ptr(c, '2master', '2c6', '#1e40af')
        cn(c, '2c3', 'C3', 'purple')
        cn(c, '2c4', 'C4', 'purple')
        cn(c, '2c10', 'C10', 'purple')
        ce(c, '2c2', '2c3', '#3730a3')
        ce(c, '2c3', '2c4', '#3730a3')
        ce(c, '2c4', '2c10', '#3730a3')
        bp(c, '2server', 'server', 'purple')
        ptr(c, '2server', '2c10', '#3730a3')
        cn(c, '2c8p', "C8'", 'gold')
        cn(c, '2c9p', "C9'", 'gold')
        ce(c, '2c6', '2c8p', '#92400e')
        ce(c, '2c8p', '2c9p', '#92400e')
        cn(c, '2c8', 'C8', 'gray', lost=True)
        cn(c, '2c9', 'C9', 'gray', lost=True)
        ce(c, '2c3', '2c8', '#94a3b8', 'dashed')
        ce(c, '2c8', '2c9', '#94a3b8', 'dashed')
        copied(c, '2c9', '2c9p')
        head_on(c, '2client', 'client', 'gold')
        ptr(c, '2client', '2c9p', '#92400e')

    def p3(c):
        cn(c, '3c1', 'C1', 'green')
        cn(c, '3c2', 'C2', 'green')
        cn(c, '3c5', 'C5', 'navy')
        cn(c, '3c6', 'C6', 'navy')
        cn(c, '3c8p', "C8'", 'gold')
        cn(c, '3c9p', "C9'", 'gold')
        cn(c, '3c3p', "C3'", 'gold')
        cn(c, '3c4p', "C4'", 'gold')
        cn(c, '3c10p', "C10'", 'gold')
        ce(c, '3c1', '3c2', '#166534')
        ce(c, '3c2', '3c5', '#1e40af')
        ce(c, '3c5', '3c6', '#1e40af')
        ce(c, '3c6', '3c8p', '#92400e')
        ce(c, '3c8p', '3c9p', '#92400e')
        ce(c, '3c9p', '3c3p', '#92400e')
        ce(c, '3c3p', '3c4p', '#92400e')
        ce(c, '3c4p', '3c10p', '#92400e')
        head_on(c, '3master', 'master', 'gold')
        ptr(c, '3master', '3c10p', '#92400e')
        bp(c, '3client', 'client', 'gold')
        ptr(c, '3client', '3c9p', '#92400e')
        bp(c, '3server', 'server', 'gold')
        ptr(c, '3server', '3c10p', '#92400e')
    save_grid('graph-rebase-onto-topic', 'git rebase --onto: client, server, and master',
              [[('1. Start -- client forks off server, server off master', PANEL_GRAY, p1)],
               [('2. git rebase --onto master server client', PANEL_GOLD, p2),
                ('3. git rebase master server, then fast-forward master', PANEL_GOLD, p3)]],
         'Three panels: client forks off server which forks off master; --onto master server client lifts just '
         'client\'s two commits onto master, skipping server entirely; finally rebasing server onto master and '
         'fast-forwarding master produces one straight line client-server-master, all traceable back through C1.')


def diag_graph_perils_of_rebasing():

    def p1(c):
        cn(c, '1c1', 'C1', 'green')
        cn(c, '1c2', 'C2', 'navy')
        cn(c, '1c3', 'C3', 'navy')
        ce(c, '1c1', '1c2', '#1e40af')
        ce(c, '1c2', '1c3', '#1e40af')
        bp(c, '1to', 'teamone/master', 'purple')
        ptr(c, '1to', '1c1', '#3730a3')
        head_on(c, '1master', 'master', 'gold')
        ptr(c, '1master', '1c3', '#92400e')

    def p2(c):
        cn(c, '2c1', 'C1', 'green')
        cn(c, '2c4', 'C4', 'teal')
        cn(c, '2c6', 'C6', 'teal')
        cn(c, '2c5', 'C5', 'teal')
        ce(c, '2c1', '2c4', '#115e59')
        ce(c, '2c4', '2c6', '#115e59')
        ce(c, '2c1', '2c5', '#115e59')
        ce(c, '2c5', '2c6', '#115e59')
        cn(c, '2c2', 'C2', 'navy')
        cn(c, '2c3', 'C3', 'navy')
        cn(c, '2c7', 'C7', 'gold')
        ce(c, '2c1', '2c2', '#1e40af')
        ce(c, '2c2', '2c3', '#1e40af')
        ce(c, '2c3', '2c7', '#92400e')
        ce(c, '2c6', '2c7', '#92400e')
        bp(c, '2to', 'teamone/master', 'teal')
        ptr(c, '2to', '2c6', '#115e59')
        head_on(c, '2master', 'master', 'gold')
        ptr(c, '2master', '2c7', '#92400e')

    def p3(c):
        cn(c, '3c1', 'C1', 'green')
        cn(c, '3c5', 'C5', 'teal')
        cn(c, '3c4p', "C4'", 'gold')
        ce(c, '3c1', '3c5', '#115e59')
        ce(c, '3c5', '3c4p', '#92400e')
        cn(c, '3c4', 'C4', 'gray', lost=True)
        cn(c, '3c6', 'C6', 'gray', lost=True)
        ce(c, '3c1', '3c4', '#94a3b8', 'dashed')
        ce(c, '3c4', '3c6', '#94a3b8', 'dashed')
        ce(c, '3c5', '3c6', '#94a3b8', 'dashed')
        cn(c, '3c2', 'C2', 'navy')
        cn(c, '3c3', 'C3', 'navy')
        cn(c, '3c7', 'C7', 'navy')
        ce(c, '3c1', '3c2', '#1e40af')
        ce(c, '3c2', '3c3', '#1e40af')
        ce(c, '3c3', '3c7', '#1e40af')
        ce(c, '3c6', '3c7', '#1e40af', 'dashed')
        bp(c, '3to', 'teamone/master', 'gold')
        ptr(c, '3to', '3c4p', '#92400e')
        head_on(c, '3master', 'master', 'gold')
        ptr(c, '3master', '3c7', '#92400e')
        note(c, '3lbl', 'teammate force-pushed a rebase: C4/C6 abandoned upstream', '#991b1b')

    def p4(c):
        cn(c, '4c1', 'C1', 'green')
        cn(c, '4c5', 'C5', 'teal')
        cn(c, '4c4p', "C4'", 'teal')
        cn(c, '4c2p', "C2'", 'gold')
        cn(c, '4c3p', "C3'", 'gold')
        ce(c, '4c1', '4c5', '#115e59')
        ce(c, '4c5', '4c4p', '#115e59')
        ce(c, '4c4p', '4c2p', '#92400e')
        ce(c, '4c2p', '4c3p', '#92400e')
        bp(c, '4to', 'teamone/master', 'teal')
        ptr(c, '4to', '4c4p', '#115e59')
        head_on(c, '4master', 'master', 'gold')
        ptr(c, '4master', '4c3p', '#92400e')
        note(c, '4lbl', 'fix: git rebase teamone/master -- your work replays on the new base', '#166534')
    save_grid('graph-perils-of-rebasing', 'The Perils of Rebasing a Shared Branch',
              [[('1. Clone, then commit locally (C2, C3)', PANEL_GRAY, p1),
                ('2. Fetch teamone, merge -> C7', PANEL_GOLD, p2)],
               [('3. Teamone force-pushes a rebase (C4 -> C4\')', PANEL_RED, p3),
                ('4. Fix: rebase your work onto teamone/master', PANEL_GOLD, p4)]],
         'Four panels tell the cautionary story: you build C2-C3 on a shared C1; the team merges in C7; the team '
         'then force-pushes a rebase that replaces C4 with C4\', abandoning C4 and C6 upstream while your repo still '
         'has the old commits; the fix is to rebase your own work onto the new teamone/master rather than merging again.')


def diag_graph_double_dot():
    g = base_graph('graph_double_dot', 'Double-Dot and Triple-Dot Revision Ranges')
    cn(g, 'a', 'A', 'green')
    cn(g, 'b', 'B', 'green')
    cn(g, 'e', 'E', 'navy')
    cn(g, 'f', 'F', 'navy')
    ce(g, 'a', 'b', '#166534')
    ce(g, 'b', 'e', '#1e40af')
    ce(g, 'e', 'f', '#1e40af')
    cn(g, 'cc', 'C', 'purple')
    cn(g, 'd', 'D', 'purple')
    ce(g, 'b', 'cc', '#3730a3')
    ce(g, 'cc', 'd', '#3730a3')
    head_on(g, 'master', 'master', 'gold')
    ptr(g, 'master', 'f', '#92400e')
    bp(g, 'experiment', 'experiment', 'purple')
    ptr(g, 'experiment', 'd', '#3730a3')
    note(g, 'n1', 'master..experiment = {D, C}', '#3730a3')
    note(g, 'n2', 'experiment..master = {F, E}', '#1e40af')
    note(g, 'n3', 'master...experiment = {F, E, D, C}', '#166534')
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('n1')
        s.node('n2')
        s.node('n3')
    g.edge('n1', 'n2', style='invis', weight='0')
    g.edge('n2', 'n3', style='invis', weight='0')
    g.edge('a', 'n1', style='invis', weight='3')
    save(g, 'graph-double-dot', 'Double-Dot / Triple-Dot Ranges',
         'A line A-B-E-F holds master, with a second line B-C-D holding experiment forking off B. Three caption '
         'lines below spell out what each dotted range selects: master..experiment is {D,C}, experiment..master is '
         '{F,E}, and the triple-dot master...experiment is the union of all four.')


# =====================================================================
# REMOTES
# =====================================================================

def diag_remote_clone_and_tracking():
    g = base_graph('remote_clone_and_tracking', 'Clone, Diverge, Fetch -- Remote-Tracking Branches')

    def p1(c):
        cn(c, '1s1', '0b743', 'green')
        cn(c, '1s2', 'a6b4c', 'green')
        cn(c, '1s3', 'f4265', 'green')
        ce(c, '1s1', '1s2', '#166534')
        ce(c, '1s2', '1s3', '#166534')
        bp(c, '1servermaster', 'server: master', 'green')
        ptr(c, '1servermaster', '1s3', '#166534')
        cn(c, '1l1', '0b743', 'navy')
        cn(c, '1l2', 'a6b4c', 'navy')
        cn(c, '1l3', 'f4265', 'navy')
        ce(c, '1l1', '1l2', '#1e40af')
        ce(c, '1l2', '1l3', '#1e40af')
        bp(c, '1origin', 'origin/master', 'purple')
        ptr(c, '1origin', '1l3', '#3730a3')
        head_on(c, '1localmaster', 'master', 'gold')
        ptr(c, '1localmaster', '1l3', '#92400e')
    panel(g, 'cluster_p1', '1. After git clone', PANEL_GRAY, p1)

    def p2(c):
        cn(c, '2s3', 'f4265', 'green')
        cn(c, '2s4', '31b8e', 'green')
        cn(c, '2s5', '190a3', 'green')
        ce(c, '2s3', '2s4', '#166534')
        ce(c, '2s4', '2s5', '#166534')
        bp(c, '2servermaster', 'server: master', 'green')
        ptr(c, '2servermaster', '2s5', '#166534')
        cn(c, '2l3', 'f4265', 'navy')
        cn(c, '2l4', 'a38de', 'navy')
        cn(c, '2l5', '893cf', 'navy')
        ce(c, '2l3', '2l4', '#1e40af')
        ce(c, '2l4', '2l5', '#1e40af')
        bp(c, '2origin', 'origin/master', 'purple')
        ptr(c, '2origin', '2l3', '#3730a3')
        head_on(c, '2localmaster', 'master', 'gold')
        ptr(c, '2localmaster', '2l5', '#92400e')
    panel(g, 'cluster_p2', '2. Both sides commit -- history diverges', PANEL_GOLD, p2)

    def p3(c):
        cn(c, '3s3', 'f4265', 'green')
        cn(c, '3s4', '31b8e', 'green')
        cn(c, '3s5', '190a3', 'green')
        ce(c, '3s3', '3s4', '#166534')
        ce(c, '3s4', '3s5', '#166534')
        cn(c, '3l3', 'f4265', 'navy')
        cn(c, '3l4', 'a38de', 'navy')
        cn(c, '3l5', '893cf', 'navy')
        cn(c, '3l6', '31b8e', 'purple')
        cn(c, '3l7', '190a3', 'purple')
        ce(c, '3l3', '3l4', '#1e40af')
        ce(c, '3l4', '3l5', '#1e40af')
        ce(c, '3l3', '3l6', '#3730a3')
        ce(c, '3l6', '3l7', '#3730a3')
        bp(c, '3origin', 'origin/master', 'purple')
        ptr(c, '3origin', '3l7', '#3730a3')
        head_on(c, '3localmaster', 'master', 'gold')
        ptr(c, '3localmaster', '3l5', '#92400e')
    panel(g, 'cluster_p3', '3. git fetch origin -- only origin/master moves', PANEL_NAVY, p3)
    order(g, '1s3', '2s3')
    g.edge('1l3', '2l3', style='invis', weight='0')
    order(g, '2s5', '3s3')
    g.edge('2l5', '3l3', style='invis', weight='0')
    save(g, 'remote-clone-and-tracking', 'Clone, Diverge, Fetch',
         'Three panels: right after clone, local master and origin/master both match the server; after both sides '
         'commit independently the two histories diverge while origin/master stays frozen at the old point; '
         'running git fetch downloads the new server commits and slides origin/master forward, without touching local master.')


def diag_remote_second_remote():
    g = base_graph('remote_second_remote', 'A Second Remote -- origin and teamone')

    def servers(c):
        cn(c, 'a', 'f4265', 'green')
        cn(c, 'b', '31b8e', 'green')
        cn(c, 'cc', '190a3', 'green')
        ce(c, 'a', 'b', '#166534')
        ce(c, 'b', 'cc', '#166534')
        bp(c, 'originmaster', 'origin: master', 'green')
        ptr(c, 'originmaster', 'cc', '#166534')
        bp(c, 'teamonemaster', 'teamone: master', 'teal')
        ptr(c, 'teamonemaster', 'b', '#115e59')
    panel(g, 'cluster_servers', 'Two remote servers', PANEL_GREEN, servers)

    def local(c):
        cn(c, 'l1', 'f4265', 'navy')
        cn(c, 'l2', '31b8e', 'purple')
        cn(c, 'l3', '190a3', 'purple')
        cn(c, 'l4', 'a38de', 'navy')
        cn(c, 'l5', '893cf', 'navy')
        ce(c, 'l1', 'l2', '#3730a3')
        ce(c, 'l2', 'l3', '#3730a3')
        ce(c, 'l1', 'l4', '#1e40af')
        ce(c, 'l4', 'l5', '#1e40af')
        bp(c, 'origintrack', 'origin/master', 'purple')
        ptr(c, 'origintrack', 'l3', '#3730a3')
        bp(c, 'teamonetrack', 'teamone/master', 'teal')
        ptr(c, 'teamonetrack', 'l2', '#115e59')
        head_on(c, 'localmaster', 'master', 'gold')
        ptr(c, 'localmaster', 'l5', '#92400e')
    panel(g, 'cluster_local', 'My computer (remote-tracking branches)', PANEL_NAVY, local)
    order(g, 'cc', 'l1')
    save(g, 'remote-second-remote', 'A Second Remote',
         'Two server boxes -- origin (further ahead) and teamone (behind) -- feed two separate remote-tracking '
         'branches in the local repository, origin/master and teamone/master, each frozen at the point it was last fetched, alongside the local master line.')


def diag_remote_fetch_vs_pull():
    g = base_graph('remote_fetch_vs_pull', 'git fetch vs. git pull')

    def fetch_panel(c):
        cn(c, 'fc0', 'C0', 'green')
        cn(c, 'fc1', 'C1', 'green')
        ce(c, 'fc0', 'fc1', '#166534')
        cn(c, 'fc2', 'C2', 'purple')
        ce(c, 'fc1', 'fc2', '#3730a3')
        bp(c, 'fomain', 'o/main', 'purple')
        ptr(c, 'fomain', 'fc2', '#3730a3')
        head_on(c, 'fmain', 'main', 'gold')
        ptr(c, 'fmain', 'fc1', '#92400e')
        note(c, 'flbl', 'main does not move -- only o/main advances', '#3730a3')
    panel(g, 'cluster_fetch', 'git fetch', PANEL_NAVY, fetch_panel)

    def pull_panel(c):
        cn(c, 'pc0', 'C0', 'green')
        cn(c, 'pc1', 'C1', 'green')
        ce(c, 'pc0', 'pc1', '#166534')
        cn(c, 'pc2', 'C2', 'navy')
        cn(c, 'pc3', 'C3', 'purple')
        ce(c, 'pc1', 'pc2', '#1e40af')
        ce(c, 'pc1', 'pc3', '#3730a3')
        cn(c, 'pc4', 'C4', 'gold')
        ce(c, 'pc2', 'pc4', '#92400e')
        ce(c, 'pc3', 'pc4', '#92400e')
        bp(c, 'pomain', 'o/main', 'purple')
        ptr(c, 'pomain', 'pc3', '#3730a3')
        head_on(c, 'pmain', 'main', 'gold')
        ptr(c, 'pmain', 'pc4', '#92400e')
        note(c, 'plbl', 'a merge commit is created locally', '#92400e')
    panel(g, 'cluster_pull', 'git pull (fetch + merge)', PANEL_GOLD, pull_panel)
    order(g, 'fc2', 'pc0')
    save(g, 'remote-fetch-vs-pull', 'Fetch vs. Pull',
         'Left panel: git fetch downloads C2 and slides o/main forward while local main stays put. Right panel: '
         'git pull does the same download but then also merges the fetched commit into main, creating a new merge commit C4.')


def diag_remote_diverged_push():
    g = base_graph('remote_diverged_push', 'Diverged History -- Rejected Push, Then Pull --rebase')

    def before(c):
        cn(c, 'bc1', 'C1', 'green')
        cn(c, 'bc2', 'C2', 'purple')
        ce(c, 'bc1', 'bc2', '#3730a3')
        bp(c, 'boriginm', 'origin: main', 'purple')
        ptr(c, 'boriginm', 'bc2', '#3730a3')
        cn(c, 'bc3', 'C3', 'red')
        ce(c, 'bc1', 'bc3', '#991b1b')
        head_on(c, 'blocalm', 'main', 'gold')
        ptr(c, 'blocalm', 'bc3', '#92400e')
        note(c, 'blbl', 'git push origin main -- REJECTED (non-fast-forward)', '#991b1b')
    panel(g, 'cluster_before', 'Before: push rejected', PANEL_RED, before)

    def after(c):
        cn(c, 'ac1', 'C1', 'green')
        cn(c, 'ac2', 'C2', 'purple')
        ce(c, 'ac1', 'ac2', '#3730a3')
        cn(c, 'ac3p', "C3'", 'gold')
        ce(c, 'ac2', 'ac3p', '#92400e')
        cn(c, 'ac3', 'C3', 'gray', lost=True)
        ce(c, 'ac1', 'ac3', '#94a3b8', 'dashed')
        copied(c, 'ac3', 'ac3p')
        bp(c, 'aoriginm', 'origin: main', 'gold')
        ptr(c, 'aoriginm', 'ac3p', '#92400e')
        head_on(c, 'alocalm', 'main', 'gold')
        ptr(c, 'alocalm', 'ac3p', '#92400e')
        note(c, 'albl', 'git pull --rebase; git push -- clean linear history', '#166534')
    panel(g, 'cluster_after', 'After: pull --rebase, then push', PANEL_GOLD, after)
    order(g, 'bc2', 'ac1')
    g.edge('bc3', 'ac1', style='invis', weight='0')
    save(g, 'remote-diverged-push', 'Diverged Push, Fixed by Rebase',
         'Before: your local C3 was based on C1, but origin has already moved to C2, so the push is rejected. '
         'After: git pull --rebase replays your commit as C3\' on top of C2, fades the original C3, and the push then succeeds cleanly.')


def diag_remote_refspec():
    g = base_graph('remote_refspec', 'Refspecs -- push src:dst, push :branch, fetch src:dst')
    def local(c):
        cn(c, 'lsrc', 'src', 'navy')
        bp(c, 'lfoo', 'foo', 'navy')
        ptr(c, 'lfoo', 'lsrc', '#1e40af')
        bp(c, 'lbranch', 'branch', 'red')
        ptr(c, 'lbranch', 'lsrc', '#991b1b')
    panel(g, 'cluster_local', 'Local', PANEL_NAVY, local)
    def remote(c):
        cn(c, 'rdst', 'dst', 'purple')
        bp(c, 'rdst_b', 'dst', 'purple')
        ptr(c, 'rdst_b', 'rdst', '#3730a3')
        bp(c, 'rbranch', 'branch', 'red', lost=True)
    panel(g, 'cluster_remote', 'Remote', PANEL_PURPLE, remote)
    e(g, 'lsrc', 'rdst', 'push origin src:dst', '#166534')
    e(g, 'lbranch', 'rbranch', 'push origin :branch (deletes)', '#991b1b', 'dashed')
    e(g, 'rdst', 'lsrc', 'fetch origin src:dst (creates local)', '#1e40af', 'dashed')
    order(g, 'lsrc', 'rdst')
    save(g, 'remote-refspec', 'Refspecs',
         'Local and remote panels connected by three labelled arrows: push origin src:dst uploads a commit onto a '
         'differently-named remote branch, push origin :branch (empty source) deletes the remote branch, and '
         'fetch origin src:dst downloads a remote commit onto a brand-new local branch.')


def diag_remote_bare_hub():
    g = base_graph('remote_bare_hub', 'A Bare Repository as a Shared Hub')
    n(g, 'hub', 'hello.git\n(bare -- no working directory)', 'gray')
    n(g, 'hello', 'hello\n(working clone)', 'navy')
    n(g, 'cloned', 'cloned_hello\n(working clone)', 'teal')
    e(g, 'hello', 'hub', 'git push shared main', '#1e40af')
    e(g, 'hub', 'hello', 'git pull shared main', '#1e40af', 'dashed')
    e(g, 'cloned', 'hub', 'git push shared main', '#115e59')
    e(g, 'hub', 'cloned', 'git pull shared main', '#115e59', 'dashed')
    save(g, 'remote-bare-hub', 'Bare Repository Hub',
         'A bare repository hello.git sits in the middle with no working directory of its own. Two ordinary '
         'working clones, hello and cloned_hello, each added it as a remote named "shared" and push/pull main to and from it -- a hub-and-spoke topology with no direct clone-to-clone edge.')


def diag_remote_centralized_workflow():
    g = base_graph('remote_centralized_workflow', 'Centralized Workflow')
    n(g, 'shared', 'shared repository', 'gold')
    n(g, 'd1', 'developer', 'navy')
    n(g, 'd2', 'developer', 'navy')
    n(g, 'd3', 'developer', 'navy')
    for d in ['d1', 'd2', 'd3']:
        g.edge('shared', d, dir='both', color='#92400e', penwidth='1.6', arrowsize='0.6')
    save(g, 'remote-centralized-workflow', 'Centralized Workflow',
         'One shared repository at the top with double-headed push/pull arrows to three separate developers below '
         'it -- every developer talks only to the shared repo, never to each other directly.')


def diag_remote_integration_manager():
    g = base_graph('remote_integration_manager', 'Integration-Manager Workflow')
    n(g, 'blessed', 'blessed repository', 'gold')
    n(g, 'im', 'integration manager', 'orange')
    n(g, 'dp1', 'developer public', 'teal')
    n(g, 'dp2', 'developer public', 'teal')
    n(g, 'dv1', 'developer private', 'gray')
    n(g, 'dv2', 'developer private', 'gray')
    e(g, 'im', 'blessed', 'pushes', '#9a3412')
    e(g, 'dv1', 'dp1', 'pushes to own public repo', '#115e59')
    e(g, 'dv2', 'dp2', 'pushes to own public repo', '#115e59')
    e(g, 'blessed', 'dv1', '', '#94a3b8', 'dashed')
    e(g, 'blessed', 'dv2', '', '#94a3b8', 'dashed')
    e(g, 'dp1', 'im', 'pulls', '#94a3b8', 'dashed')
    e(g, 'dp2', 'im', 'pulls', '#94a3b8', 'dashed')
    save(g, 'remote-integration-manager', 'Integration-Manager Workflow',
         'A blessed repository is fed only by the integration manager. Each developer pushes from a private repo '
         'to their own public repo, and the integration manager pulls from those public repos before deciding what lands in the blessed repository.')


# =====================================================================
# INTERNALS
# =====================================================================

def diag_walk_object_graph():
    g = base_graph('walk_object_graph', 'Walking the Object Graph -- Commits, Trees, Blobs, Refs')
    n(g, 'rmaster', 'refs/heads/master', 'red')
    n(g, 'rtest', 'refs/heads/test', 'red')
    cn(g, 'c1', 'fdf4fc', 'green')
    cn(g, 'c2', 'cac0ca', 'green')
    cn(g, 'c3', '1a410e', 'green')
    ce(g, 'c1', 'c2', '#166534')
    ce(g, 'c2', 'c3', '#166534')
    e(g, 'rmaster', 'c3', '', '#991b1b')
    e(g, 'rtest', 'c2', '', '#991b1b')
    n(g, 't1', 'tree d8329f', 'teal')
    n(g, 't2', 'tree 0155eb', 'teal')
    n(g, 't3', 'tree 3c4e9c', 'teal')
    e(g, 'c1', 't1', '', '#115e59')
    e(g, 'c2', 't2', '', '#115e59')
    e(g, 'c3', 't3', '', '#115e59')
    n(g, 'b1', 'blob 83baae\n"version 1"', 'amber')
    n(g, 'b2', 'blob 1f7a7a\n"version 2"', 'amber')
    n(g, 'b3', 'blob fa49b0\n"new file"', 'amber')
    e(g, 't1', 'b1', 'test.txt', '#92400e')
    e(g, 't2', 'b2', 'test.txt', '#92400e')
    e(g, 't3', 'b2', 'test.txt', '#92400e')
    e(g, 't3', 'b3', 'new.txt', '#92400e')
    e(g, 't3', 't1', 'bak', '#115e59')
    save(g, 'walk-object-graph', 'Walking the Object Graph',
         'Three commits fdf4fc, cac0ca, 1a410e chain to their parents and each point to a tree; refs/heads/master '
         'points at the newest commit while refs/heads/test points at the middle one, reaching only two of the '
         'three commits. Blob 1f7a7a ("version 2") is pointed to by two different trees, showing content-level de-duplication.')


# =====================================================================
# LEARN GIT BRANCHING -- start/goal trees
# =====================================================================

def diag_lgb_intro3_merge():
    g = base_graph('lgb_intro3_merge', 'LGB intro3 -- Merging in Git')
    def start(c):
        cn(c, 'sc0', 'C0', 'green')
        cn(c, 'sc1', 'C1', 'green')
        ce(c, 'sc0', 'sc1', '#166534')
        head_on(c, 'smain', 'main', 'gold')
        ptr(c, 'smain', 'sc1', '#92400e')
    panel(g, 'cluster_start', 'Start', PANEL_GRAY, start)
    def goal(c):
        cn(c, 'gc0', 'C0', 'green')
        cn(c, 'gc1', 'C1', 'green')
        ce(c, 'gc0', 'gc1', '#166534')
        cn(c, 'gc2', 'C2', 'purple')
        cn(c, 'gc3', 'C3', 'navy')
        ce(c, 'gc1', 'gc2', '#3730a3')
        ce(c, 'gc1', 'gc3', '#1e40af')
        cn(c, 'gc4', 'C4', 'gold')
        ce(c, 'gc3', 'gc4', '#92400e')
        ce(c, 'gc2', 'gc4', '#92400e')
        bp(c, 'gbugFix', 'bugFix', 'purple')
        ptr(c, 'gbugFix', 'gc2', '#3730a3')
        head_on(c, 'gmain', 'main', 'gold')
        ptr(c, 'gmain', 'gc4', '#92400e')
    panel(g, 'cluster_goal', 'Goal', PANEL_GOLD, goal)
    order(g, 'sc1', 'gc0')
    save(g, 'lgb-intro3-merge', 'LGB: Merging in Git',
         'Start: a two-commit main. Goal: bugFix commits C2 off C1, main commits its own C3 off C1, then a merge '
         'commit C4 with two parents (C3 first, C2 second) brings both together with main and HEAD on C4.')


def diag_lgb_intro4_rebase():
    g = base_graph('lgb_intro4_rebase', 'LGB intro4 -- Rebase Introduction')
    def start(c):
        cn(c, 'sc0', 'C0', 'green')
        cn(c, 'sc1', 'C1', 'green')
        ce(c, 'sc0', 'sc1', '#166534')
        head_on(c, 'smain', 'main', 'gold')
        ptr(c, 'smain', 'sc1', '#92400e')
    panel(g, 'cluster_start', 'Start', PANEL_GRAY, start)
    def goal(c):
        cn(c, 'gc0', 'C0', 'green')
        cn(c, 'gc1', 'C1', 'green')
        ce(c, 'gc0', 'gc1', '#166534')
        cn(c, 'gc3', 'C3', 'navy')
        ce(c, 'gc1', 'gc3', '#1e40af')
        cn(c, 'gc2', 'C2', 'gray', lost=True)
        ce(c, 'gc1', 'gc2', '#94a3b8', 'dashed')
        cn(c, 'gc2p', "C2'", 'gold')
        ce(c, 'gc3', 'gc2p', '#92400e')
        copied(c, 'gc2', 'gc2p')
        bp(c, 'gmain', 'main', 'navy')
        ptr(c, 'gmain', 'gc3', '#1e40af')
        head_on(c, 'gbugFix', 'bugFix', 'gold')
        ptr(c, 'gbugFix', 'gc2p', '#92400e')
    panel(g, 'cluster_goal', 'Goal', PANEL_GOLD, goal)
    order(g, 'sc1', 'gc0')
    save(g, 'lgb-intro4-rebase', 'LGB: Rebase Introduction',
         'Start: a two-commit main. Goal: bugFix\'s original commit C2 (faded) is replayed as C2\' directly on top '
         'of main\'s own new commit C3; bugFix and HEAD move to C2\', while main stays at C3, untouched by the rebase.')


def diag_lgb_rampup4_reset_revert():
    g = base_graph('lgb_rampup4_reset_revert', 'LGB rampup4 -- Reset vs. Revert')
    def start(c):
        cn(c, 'sc0', 'C0', 'green')
        cn(c, 'sc1', 'C1', 'green')
        ce(c, 'sc0', 'sc1', '#166534')
        cn(c, 'sc2', 'C2', 'navy')
        cn(c, 'sc3', 'C3', 'red')
        ce(c, 'sc1', 'sc2', '#1e40af')
        ce(c, 'sc1', 'sc3', '#991b1b')
        bp(c, 'smain', 'main', 'navy')
        ptr(c, 'smain', 'sc1', '#1e40af')
        bp(c, 'spushed', 'pushed', 'navy')
        ptr(c, 'spushed', 'sc2', '#1e40af')
        head_on(c, 'slocal', 'local', 'gold')
        ptr(c, 'slocal', 'sc3', '#92400e')
    panel(g, 'cluster_start', 'Start', PANEL_GRAY, start)
    def goal(c):
        cn(c, 'gc0', 'C0', 'green')
        cn(c, 'gc1', 'C1', 'green')
        ce(c, 'gc0', 'gc1', '#166534')
        cn(c, 'gc2', 'C2', 'navy')
        ce(c, 'gc1', 'gc2', '#1e40af')
        cn(c, 'gc3', 'C3', 'gray', lost=True)
        ce(c, 'gc1', 'gc3', '#94a3b8', 'dashed')
        cn(c, 'gc2p', "C2'", 'gold')
        ce(c, 'gc2', 'gc2p', '#92400e')
        bp(c, 'gmain', 'main', 'navy')
        ptr(c, 'gmain', 'gc1', '#1e40af')
        head_on(c, 'glocal', 'local', 'gold')
        ptr(c, 'glocal', 'gc1', '#92400e')
        bp(c, 'gpushed', 'pushed', 'navy')
        ptr(c, 'gpushed', 'gc2p', '#1e40af')
        note(c, 'glbl', 'local: git reset (moves back). pushed: git revert (adds C2\')', '#374151')
    panel(g, 'cluster_goal', 'Goal', PANEL_GOLD, goal)
    order(g, 'sc2', 'gc0')
    g.edge('sc3', 'gc0', style='invis', weight='0')
    save(g, 'lgb-rampup4-reset-revert', 'LGB: Reset vs. Revert',
         'Start: local and pushed each carry one extra commit past main. Goal contrasts the two undo tools side by '
         'side: local is rewound with reset straight back to C1 (C3 fades away), while pushed keeps C2 in history '
         'and gets a new commit C2\' appended by revert that undoes it -- safe for a shared branch.')


def diag_lgb_move1_cherry_pick():
    g = base_graph('lgb_move1_cherry_pick', 'LGB move1 -- Cherry-pick Intro')
    def start(c):
        cn(c, 'sc0', 'C0', 'green')
        cn(c, 'sc1', 'C1', 'green')
        ce(c, 'sc0', 'sc1', '#166534')
        cn(c, 'sc2', 'C2', 'purple')
        cn(c, 'sc3', 'C3', 'purple')
        ce(c, 'sc1', 'sc2', '#3730a3')
        ce(c, 'sc2', 'sc3', '#3730a3')
        cn(c, 'sc4', 'C4', 'teal')
        cn(c, 'sc5', 'C5', 'teal')
        ce(c, 'sc1', 'sc4', '#115e59')
        ce(c, 'sc4', 'sc5', '#115e59')
        cn(c, 'sc6', 'C6', 'pink')
        cn(c, 'sc7', 'C7', 'pink')
        ce(c, 'sc1', 'sc6', '#9d174d')
        ce(c, 'sc6', 'sc7', '#9d174d')
        head_on(c, 'smain', 'main', 'gold')
        ptr(c, 'smain', 'sc1', '#92400e')
        bp(c, 'sbugFix', 'bugFix', 'purple')
        ptr(c, 'sbugFix', 'sc3', '#3730a3')
        bp(c, 'sside', 'side', 'teal')
        ptr(c, 'sside', 'sc5', '#115e59')
        bp(c, 'sanother', 'another', 'pink')
        ptr(c, 'sanother', 'sc7', '#9d174d')
    panel(g, 'cluster_start', 'Start', PANEL_GRAY, start)
    def goal(c):
        cn(c, 'gc0', 'C0', 'green')
        cn(c, 'gc1', 'C1', 'green')
        ce(c, 'gc0', 'gc1', '#166534')
        cn(c, 'gc2', 'C2', 'purple')
        cn(c, 'gc3', 'C3', 'purple')
        ce(c, 'gc1', 'gc2', '#3730a3')
        ce(c, 'gc2', 'gc3', '#3730a3')
        cn(c, 'gc4', 'C4', 'teal')
        cn(c, 'gc5', 'C5', 'teal')
        ce(c, 'gc1', 'gc4', '#115e59')
        ce(c, 'gc4', 'gc5', '#115e59')
        cn(c, 'gc6', 'C6', 'pink')
        cn(c, 'gc7', 'C7', 'pink')
        ce(c, 'gc1', 'gc6', '#9d174d')
        ce(c, 'gc6', 'gc7', '#9d174d')
        cn(c, 'gc3p', "C3'", 'gold')
        cn(c, 'gc4p', "C4'", 'gold')
        cn(c, 'gc7p', "C7'", 'gold')
        ce(c, 'gc1', 'gc3p', '#92400e')
        ce(c, 'gc3p', 'gc4p', '#92400e')
        ce(c, 'gc4p', 'gc7p', '#92400e')
        copied(c, 'gc3', 'gc3p')
        copied(c, 'gc4', 'gc4p')
        copied(c, 'gc7', 'gc7p')
        head_on(c, 'gmain', 'main', 'gold')
        ptr(c, 'gmain', 'gc7p', '#92400e')
        bp(c, 'gbugFix', 'bugFix', 'purple')
        ptr(c, 'gbugFix', 'gc3', '#3730a3')
        bp(c, 'gside', 'side', 'teal')
        ptr(c, 'gside', 'gc5', '#115e59')
        bp(c, 'ganother', 'another', 'pink')
        ptr(c, 'ganother', 'gc7', '#9d174d')
    panel(g, 'cluster_goal', 'Goal', PANEL_GOLD, goal)
    order(g, 'sc3', 'gc0')
    g.edge('sc5', 'gc0', style='invis', weight='0')
    g.edge('sc7', 'gc0', style='invis', weight='0')
    save(g, 'lgb-move1-cherry-pick', 'LGB: Cherry-pick Intro',
         'Start: three side branches (bugFix, side, another) each fork off main\'s C1. Goal: git cherry-pick C3 C4 '
         'C7 copies those three commits, in that order, directly onto main as C3\', C4\', C7\' -- the original branches are untouched.')


def diag_lgb_move2_rebase_i():
    g = base_graph('lgb_move2_rebase_i', 'LGB move2 -- Interactive Rebase Intro')
    def start(c):
        cn(c, 'sc1', 'C1', 'navy')
        cn(c, 'sc2', 'C2', 'navy')
        cn(c, 'sc3', 'C3', 'navy')
        cn(c, 'sc4', 'C4', 'navy')
        cn(c, 'sc5', 'C5', 'navy')
        ce(c, 'sc1', 'sc2', '#1e40af')
        ce(c, 'sc2', 'sc3', '#1e40af')
        ce(c, 'sc3', 'sc4', '#1e40af')
        ce(c, 'sc4', 'sc5', '#1e40af')
        bp(c, 'soverHere', 'overHere', 'teal')
        ptr(c, 'soverHere', 'sc1', '#115e59')
        head_on(c, 'smain', 'main', 'gold')
        ptr(c, 'smain', 'sc5', '#92400e')
    panel(g, 'cluster_start', 'Start', PANEL_GRAY, start)
    def goal(c):
        cn(c, 'gc1', 'C1', 'navy')
        cn(c, 'gc2', 'C2', 'gray', lost=True)
        cn(c, 'gc3', 'C3', 'navy')
        cn(c, 'gc4', 'C4', 'navy')
        cn(c, 'gc5', 'C5', 'navy')
        ce(c, 'gc1', 'gc2', '#94a3b8', 'dashed')
        ce(c, 'gc2', 'gc3', '#94a3b8', 'dashed')
        ce(c, 'gc3', 'gc4', '#94a3b8', 'dashed')
        ce(c, 'gc4', 'gc5', '#94a3b8', 'dashed')
        cn(c, 'gc3p', "C3'", 'gold')
        cn(c, 'gc5p', "C5'", 'gold')
        cn(c, 'gc4p', "C4'", 'gold')
        ce(c, 'gc1', 'gc3p', '#92400e')
        ce(c, 'gc3p', 'gc5p', '#92400e')
        ce(c, 'gc5p', 'gc4p', '#92400e')
        copied(c, 'gc3', 'gc3p')
        copied(c, 'gc5', 'gc5p')
        copied(c, 'gc4', 'gc4p')
        bp(c, 'goverHere', 'overHere', 'teal')
        ptr(c, 'goverHere', 'gc1', '#115e59')
        head_on(c, 'gmain', 'main', 'gold')
        ptr(c, 'gmain', 'gc4p', '#92400e')
        note(c, 'glbl', 'C2 dropped, order reshuffled to C3, C5, C4', '#92400e')
    panel(g, 'cluster_goal', 'Goal', PANEL_GOLD, goal)
    order(g, 'sc5', 'gc1')
    save(g, 'lgb-move2-rebase-i', 'LGB: Interactive Rebase Intro',
         'Start: a straight five-commit line C1-C5 with overHere at the base. Goal: git rebase -i overHere drops '
         'C2 entirely and reorders the rest into C3\', C5\', C4\' on top of overHere; main ends on C4\', the last commit in the new order.')


def diag_lgb_mixed1_grab_one():
    g = base_graph('lgb_mixed1_grab_one', 'LGB mixed1 -- Grabbing Just 1 Commit')
    def start(c):
        cn(c, 'sc1', 'C1', 'navy')
        cn(c, 'sc2', 'C2', 'red')
        cn(c, 'sc3', 'C3', 'red')
        cn(c, 'sc4', 'C4', 'gold')
        ce(c, 'sc1', 'sc2', '#991b1b')
        ce(c, 'sc2', 'sc3', '#991b1b')
        ce(c, 'sc3', 'sc4', '#92400e')
        bp(c, 'smain', 'main', 'navy')
        ptr(c, 'smain', 'sc1', '#1e40af')
        bp(c, 'sdebug', 'debug', 'red')
        ptr(c, 'sdebug', 'sc2', '#991b1b')
        bp(c, 'sprintf', 'printf', 'red')
        ptr(c, 'sprintf', 'sc3', '#991b1b')
        head_on(c, 'sbugFix', 'bugFix', 'gold')
        ptr(c, 'sbugFix', 'sc4', '#92400e')
    panel(g, 'cluster_start', 'Start', PANEL_GRAY, start)
    def goal(c):
        cn(c, 'gc1', 'C1', 'navy')
        cn(c, 'gc2', 'C2', 'red')
        cn(c, 'gc3', 'C3', 'red')
        cn(c, 'gc4', 'C4', 'red')
        ce(c, 'gc1', 'gc2', '#991b1b')
        ce(c, 'gc2', 'gc3', '#991b1b')
        ce(c, 'gc3', 'gc4', '#991b1b')
        cn(c, 'gc4p', "C4'", 'gold')
        ce(c, 'gc1', 'gc4p', '#92400e')
        copied(c, 'gc4', 'gc4p')
        bp(c, 'gdebug', 'debug', 'red')
        ptr(c, 'gdebug', 'gc2', '#991b1b')
        bp(c, 'gprintf', 'printf', 'red')
        ptr(c, 'gprintf', 'gc3', '#991b1b')
        head_on(c, 'gmain', 'main', 'gold')
        ptr(c, 'gmain', 'gc4p', '#92400e')
        bp(c, 'gbugFix', 'bugFix', 'gold')
        ptr(c, 'gbugFix', 'gc4p', '#92400e')
    panel(g, 'cluster_goal', 'Goal', PANEL_GOLD, goal)
    order(g, 'sc4', 'gc1')
    save(g, 'lgb-mixed1-grab-one', 'LGB: Grabbing Just 1 Commit',
         'Start: bugFix\'s fix (C4) sits on top of two unrelated debug/printf commits (C2, C3). Goal: only C4 is '
         'copied over, as C4\', directly onto main -- the debug and printf commits are left behind on their own branches.')


def diag_lgb_advanced2_multiple_parents():
    g = base_graph('lgb_advanced2_multiple_parents', "LGB advanced2 -- Multiple Parents (main^^2^)")
    cn(g, 'c1', 'C1', 'green')
    cn(g, 'c2', 'C2', 'navy')
    cn(g, 'c3', 'C3', 'purple')
    cn(g, 'c4', 'C4', 'purple')
    cn(g, 'c5', 'C5', 'navy')
    ce(g, 'c1', 'c2', '#1e40af')
    ce(g, 'c2', 'c5', '#1e40af')
    ce(g, 'c1', 'c3', '#3730a3')
    ce(g, 'c3', 'c4', '#3730a3')
    cn(g, 'c6', 'C6', 'gold')
    ce(g, 'c5', 'c6', '#92400e')
    ce(g, 'c4', 'c6', '#92400e')
    cn(g, 'c7', 'C7', 'navy')
    ce(g, 'c6', 'c7', '#1e40af')
    head_on(g, 'main', 'main', 'gold')
    ptr(g, 'main', 'c7', '#92400e')
    bp(g, 'bugWork', 'bugWork', 'purple')
    ptr(g, 'bugWork', 'c2', '#3730a3')
    note(g, 'lbl', 'main^ -> C6 (merge)   ^2 -> C5   ^ -> C2', '#92400e')
    save(g, 'lgb-advanced2-multiple-parents', 'LGB: Multiple Parents',
         'A diamond: C1 forks into two lines (C2 and C3-C4) that rejoin at merge commit C6, which main then '
         'advances past to C7. git branch bugWork main^^2^ walks up through C6\'s first parent, C6\'s second parent C5, then one more parent step to land on C2.')


def diag_lgb_advanced1_rebase_9000():
    g = base_graph('lgb_advanced1_rebase_9000', 'LGB advanced1 -- Rebasing Over 9000 Times')
    def start(c):
        cn(c, 'sc1', 'C1', 'green')
        cn(c, 'sc2', 'C2', 'navy')
        cn(c, 'sc3', 'C3', 'purple')
        ce(c, 'sc1', 'sc2', '#1e40af')
        ce(c, 'sc1', 'sc3', '#3730a3')
        cn(c, 'sc4', 'C4', 'teal')
        cn(c, 'sc5', 'C5', 'teal')
        cn(c, 'sc6', 'C6', 'pink')
        cn(c, 'sc7', 'C7', 'pink')
        ce(c, 'sc1', 'sc4', '#115e59')
        ce(c, 'sc4', 'sc5', '#115e59')
        ce(c, 'sc5', 'sc6', '#9d174d')
        ce(c, 'sc5', 'sc7', '#9d174d')
        head_on(c, 'smain', 'main', 'gold')
        ptr(c, 'smain', 'sc2', '#92400e')
        bp(c, 'sbugFix', 'bugFix', 'purple')
        ptr(c, 'sbugFix', 'sc3', '#3730a3')
        bp(c, 'sside', 'side', 'pink')
        ptr(c, 'sside', 'sc6', '#9d174d')
        bp(c, 'sanother', 'another', 'pink')
        ptr(c, 'sanother', 'sc7', '#9d174d')
    panel(g, 'cluster_start', 'Start', PANEL_GRAY, start)
    def goal(c):
        cn(c, 'gc1', 'C1', 'green')
        cn(c, 'gc2', 'C2', 'navy')
        ce(c, 'gc1', 'gc2', '#1e40af')
        cn(c, 'gc3p', "C3'", 'gold')
        cn(c, 'gc4p', "C4'", 'gold')
        cn(c, 'gc5p', "C5'", 'gold')
        cn(c, 'gc6p', "C6'", 'gold')
        cn(c, 'gc7p', "C7'", 'gold')
        ce(c, 'gc2', 'gc3p', '#92400e')
        ce(c, 'gc3p', 'gc4p', '#92400e')
        ce(c, 'gc4p', 'gc5p', '#92400e')
        ce(c, 'gc5p', 'gc6p', '#92400e')
        ce(c, 'gc6p', 'gc7p', '#92400e')
        head_on(c, 'gmain', 'main', 'gold')
        ptr(c, 'gmain', 'gc7p', '#92400e')
        bp(c, 'gbugFix', 'bugFix', 'gold')
        ptr(c, 'gbugFix', 'gc3p', '#92400e')
        bp(c, 'gside', 'side', 'gold')
        ptr(c, 'gside', 'gc6p', '#92400e')
        bp(c, 'ganother', 'another', 'gold')
        ptr(c, 'ganother', 'gc7p', '#92400e')
        note(c, 'glbl', 'originals C3-C7 faded away (not drawn)', '#94a3b8')
    panel(g, 'cluster_goal', 'Goal', PANEL_GOLD, goal)
    order(g, 'sc6', 'gc1')
    g.edge('sc7', 'gc1', style='invis', weight='0')
    save(g, 'lgb-advanced1-rebase-9000', 'LGB: Rebasing Over 9000 Times',
         'Start: four scattered branches (bugFix, side, another) fork off main at different points. Goal: '
         'rebasing each branch onto the next in turn straightens everything into one line C3\'-C4\'-C5\'-C6\'-C7\', '
         'with every branch, including main, pointing somewhere along that single chain.')


def diag_lgb_remoteadv1_vs_2():
    g = base_graph('lgb_remoteadv1_vs_2', 'LGB remoteAdvanced1 vs. 2 -- Push Main! vs. Merging with Remotes')
    def start(c):
        cn(c, 'sc1', 'C1', 'green')
        cn(c, 'sc8', 'C8', 'navy')
        ce(c, 'sc1', 'sc8', '#1e40af')
        bp(c, 'somain', 'o/main', 'navy')
        ptr(c, 'somain', 'sc8', '#1e40af')
        cn(c, 'sc2', 'C2', 'teal')
        cn(c, 'sc4', 'C4', 'purple')
        cn(c, 'sc7', 'C7', 'pink')
        ce(c, 'sc1', 'sc2', '#115e59')
        ce(c, 'sc1', 'sc4', '#3730a3')
        ce(c, 'sc1', 'sc7', '#9d174d')
        bp(c, 'sside1', 'side1', 'teal')
        ptr(c, 'sside1', 'sc2', '#115e59')
        bp(c, 'sside2', 'side2', 'purple')
        ptr(c, 'sside2', 'sc4', '#3730a3')
        bp(c, 'sside3', 'side3', 'pink')
        ptr(c, 'sside3', 'sc7', '#9d174d')
        bp(c, 'smain', 'main', 'navy')
        ptr(c, 'smain', 'sc1', '#1e40af')
    panel(g, 'cluster_start', 'Shared Start', PANEL_GRAY, start)

    def rebase_goal(c):
        cn(c, 'rc1', 'C1', 'green')
        cn(c, 'rc8', 'C8', 'navy')
        ce(c, 'rc1', 'rc8', '#1e40af')
        cn(c, 'rc2p', "C2'", 'gold')
        cn(c, 'rc4p', "C4'", 'gold')
        cn(c, 'rc7p', "C7'", 'gold')
        ce(c, 'rc8', 'rc2p', '#92400e')
        ce(c, 'rc2p', 'rc4p', '#92400e')
        ce(c, 'rc4p', 'rc7p', '#92400e')
        bp(c, 'romain', 'o/main', 'gold')
        ptr(c, 'romain', 'rc7p', '#92400e')
        head_on(c, 'rmain', 'main', 'gold')
        ptr(c, 'rmain', 'rc7p', '#92400e')
    panel(g, 'cluster_rebase', 'remoteAdvanced1: rebase each side branch, then push -- straight line', PANEL_NAVY, rebase_goal)

    def merge_goal(c):
        cn(c, 'mc1', 'C1', 'green')
        cn(c, 'mc8', 'C8', 'navy')
        ce(c, 'mc1', 'mc8', '#1e40af')
        cn(c, 'mc2', 'C2', 'teal')
        cn(c, 'mc4', 'C4', 'purple')
        cn(c, 'mc7', 'C7', 'pink')
        ce(c, 'mc1', 'mc2', '#115e59')
        ce(c, 'mc1', 'mc4', '#3730a3')
        ce(c, 'mc1', 'mc7', '#9d174d')
        cn(c, 'mm1', 'C9', 'gold')
        cn(c, 'mm2', 'C10', 'gold')
        cn(c, 'mm3', 'C11', 'gold')
        ce(c, 'mc8', 'mm1', '#92400e')
        ce(c, 'mc2', 'mm1', '#92400e')
        ce(c, 'mm1', 'mm2', '#92400e')
        ce(c, 'mc4', 'mm2', '#92400e')
        ce(c, 'mm2', 'mm3', '#92400e')
        ce(c, 'mc7', 'mm3', '#92400e')
        bp(c, 'momain', 'o/main', 'gold')
        ptr(c, 'momain', 'mm3', '#92400e')
        head_on(c, 'mmain', 'main', 'gold')
        ptr(c, 'mmain', 'mm3', '#92400e')
    panel(g, 'cluster_merge', 'remoteAdvanced2: merge each side branch, then push -- 3 merge commits', PANEL_GOLD, merge_goal)
    order(g, 'sc8', 'rc1')
    g.edge('sc2', 'rc1', style='invis', weight='0')
    g.edge('sc4', 'rc1', style='invis', weight='0')
    g.edge('sc7', 'rc1', style='invis', weight='0')
    order(g, 'rc7p', 'mc1')
    save(g, 'lgb-remoteadv1-vs-2', 'Push by Rebase vs. Merge',
         'A shared start with three side branches off main. Push Main! integrates them by rebasing each in turn, '
         'ending in one straight pushed line. Merging with remotes solves the identical goal with git merge three '
         'times instead, producing three explicit merge commits C9, C10, C11 -- same end state, different-shaped history.')


def diag_lgb_remoteadv6_fetch_args():
    g = base_graph('lgb_remoteadv6_fetch_args', 'LGB remoteAdvanced6 -- Fetch Arguments (Colon Refspec)')
    def origin(c):
        cn(c, 'oc1', 'C1', 'green')
        cn(c, 'oc2', 'C2', 'navy')
        cn(c, 'oc3', 'C3', 'navy')
        cn(c, 'oc4', 'C4', 'navy')
        ce(c, 'oc1', 'oc2', '#1e40af')
        ce(c, 'oc2', 'oc3', '#1e40af')
        ce(c, 'oc3', 'oc4', '#1e40af')
        cn(c, 'oc5', 'C5', 'purple')
        cn(c, 'oc6', 'C6', 'purple')
        ce(c, 'oc1', 'oc5', '#3730a3')
        ce(c, 'oc5', 'oc6', '#3730a3')
        bp(c, 'omain', 'main', 'navy')
        ptr(c, 'omain', 'oc4', '#1e40af')
        bp(c, 'ofoo', 'foo', 'purple')
        ptr(c, 'ofoo', 'oc6', '#3730a3')
    panel(g, 'cluster_origin', 'Origin (remote)', PANEL_PURPLE, origin)
    def local(c):
        cn(c, 'lc1', 'C1', 'green')
        cn(c, 'lc2', 'C2', 'navy')
        cn(c, 'lc3', 'C3', 'navy')
        ce(c, 'lc1', 'lc2', '#1e40af')
        ce(c, 'lc2', 'lc3', '#1e40af')
        cn(c, 'lc5', 'C5', 'purple')
        cn(c, 'lc6', 'C6', 'purple')
        ce(c, 'lc1', 'lc5', '#3730a3')
        ce(c, 'lc5', 'lc6', '#3730a3')
        cn(c, 'lc7', 'C7', 'gold')
        ce(c, 'lc3', 'lc7', '#92400e')
        ce(c, 'lc6', 'lc7', '#92400e')
        bp(c, 'lomain', 'o/main', 'navy')
        ptr(c, 'lomain', 'lc1', '#1e40af')
        bp(c, 'lofoo', 'o/foo', 'purple')
        ptr(c, 'lofoo', 'lc1', '#3730a3')
        head_on(c, 'lfoo', 'foo', 'gold')
        ptr(c, 'lfoo', 'lc7', '#92400e')
        bp(c, 'lmain', 'main', 'navy')
        ptr(c, 'lmain', 'lc6', '#1e40af')
        note(c, 'llbl', 'fetch origin c3:foo lands C3 on local foo; fetch origin c6:main lands C6 on local main', '#374151')
    panel(g, 'cluster_local', 'Local -- after both colon-refspec fetches + merge', PANEL_GOLD, local)
    order(g, 'oc4', 'lc1')
    save(g, 'lgb-remoteadv6-fetch-args', 'LGB: Fetch Arguments',
         'Origin holds two lines, main (through C4) and foo (through C6). Colon-refspec fetches deliberately swap '
         'destinations: origin\'s C3 lands on local branch foo and origin\'s C6 lands on local branch main; o/main '
         'and o/foo themselves never move. Merging foo and main locally then produces C7.')


# =====================================================================
# EXISTING-TOPIC FIGURES
# =====================================================================

def diag_topic_gitflow():
    """Swimlane drawing of GitFlow. dot cannot pin lanes, so this one uses
    neato with fixed positions: one row per branch, time left to right."""
    g = graphviz.Digraph('topic_gitflow', format='png', engine='neato')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.4', splines='line',
           label='  Gitflow -- main, develop, feature, release, hotfix: who branches from whom, and who merges back  ',
           labelloc='t', fontsize='14', fontname='Helvetica Bold', fontcolor='#1e293b')
    lanes = [('main', 4.0, 'navy'), ('develop', 3.0, 'purple'), ('feature/*', 2.0, 'green'),
             ('release/*', 1.0, 'teal'), ('hotfix/*', 0.0, 'red')]
    for name, y, col in lanes:
        g.node('lane_' + name, name, shape='box', style='filled,rounded', pos=f'-1.2,{y}!',
               fillcolor=C[col][0], color=C[col][1], fontcolor=C[col][2],
               fontname='Helvetica Bold', fontsize='11', width='1.3', height='0.36', fixedsize='true')

    def c(name, label, x, y, col):
        g.node(name, label, shape='circle', style='filled', pos=f'{x},{y}!',
               fillcolor=C[col][0], color=C[col][1], fontcolor=C[col][2],
               fontname='Helvetica Bold', fontsize='10', width='0.55', height='0.55',
               fixedsize='true', penwidth='2.0')

    def e(a, b, col, style='solid', label=''):
        g.edge(a, b, color=col, style=style, penwidth='1.8', fontname='Helvetica',
               fontsize='9', fontcolor=col, label=label, arrowsize='0.8')

    # main
    c('m1', 'v0.1', 0.5, 4.0, 'navy'); c('m2', 'v0.2', 6.5, 4.0, 'navy'); c('m3', 'v0.2.1', 10.0, 4.0, 'navy')
    # develop
    c('d1', 'D1', 1.5, 3.0, 'purple'); c('d2', 'D2', 3.0, 3.0, 'purple'); c('d3', 'D3', 5.0, 3.0, 'purple')
    c('d4', 'D4', 7.5, 3.0, 'purple'); c('d5', 'D5', 11.0, 3.0, 'purple')
    # feature
    c('f1', 'F1', 3.8, 2.0, 'green'); c('f2', 'F2', 4.6, 2.0, 'green')
    # release
    c('r1', 'R1', 5.2, 1.0, 'teal'); c('r2', 'R2', 6.4, 1.0, 'teal')
    # hotfix
    c('h1', 'H1', 8.8, 0.0, 'red')

    navy, purple, green, teal, red = '#1e40af', '#3730a3', '#166534', '#115e59', '#991b1b'
    e('m1', 'm2', navy); e('m2', 'm3', navy)
    e('d1', 'd2', purple); e('d2', 'd3', purple); e('d3', 'd4', purple); e('d4', 'd5', purple)
    e('m1', 'd1', purple, 'dashed', 'branch develop')
    e('d2', 'f1', green, 'dashed', 'feature start'); e('f1', 'f2', green); e('f2', 'd3', green, 'solid', 'feature finish')
    e('d3', 'r1', teal, 'dashed', 'release start'); e('r1', 'r2', teal)
    e('r2', 'm2', teal, 'solid', 'release finish: tag v0.2'); e('r2', 'd4', teal, 'solid', 'merge back')
    e('m2', 'h1', red, 'dashed', 'hotfix start'); e('h1', 'm3', red, 'solid', 'hotfix finish: tag v0.2.1')
    e('h1', 'd5', red, 'solid', 'merge back')

    save(g, 'topic-gitflow', 'Gitflow branch roles',
         'Five horizontal lanes, one per branch type: main (tagged releases v0.1, v0.2, v0.2.1), develop, feature, '
         'release and hotfix. Dashed arrows are branch-offs (develop from main, feature and release from develop, '
         'hotfix from main); solid arrows are merges (feature into develop; release into main with a tag and back '
         'into develop; hotfix into main with a tag and back into develop). Time runs left to right.')


def diag_topic_reflog_dangling():
    g = base_graph('topic_reflog_dangling', 'Reflog Recovery -- Rescuing a Commit After reset --hard')
    cn(g, 'c1', 'C1', 'green')
    cn(g, 'c2', 'C2', 'green')
    ce(g, 'c1', 'c2', '#166534')
    cn(g, 'c3', 'C3', 'gray', lost=True)
    ce(g, 'c2', 'c3', '#94a3b8', 'dashed')
    bp(g, 'main_old', 'main (before)', 'gray', lost=True)
    ptr(g, 'main_old', 'c3', '#94a3b8')
    head_on(g, 'main', 'main', 'gold')
    ptr(g, 'main', 'c2', '#92400e')
    n(g, 'reflog', 'HEAD@{1}\n(reflog entry)', 'amber')
    ptr(g, 'reflog', 'c3', '#92400e', 'solid')
    cn(g, 'rescued', 'C3', 'gold')
    ce(g, 'c2', 'rescued', '#92400e')
    head_on(g, 'recovered', 'recovered', 'gold')
    ptr(g, 'recovered', 'rescued', '#92400e')
    note(g, 'lbl', 'git branch recovered HEAD@{1} points a new branch back at the abandoned commit', '#92400e')
    save(g, 'topic-reflog-dangling', 'Reflog Recovery',
         'main was reset back from C3 to C2, so C3 is abandoned and drawn faded -- but the reflog entry HEAD@{1} '
         'still remembers it. git branch recovered HEAD@{1} creates a brand-new branch pointing straight at that '
         'dangling commit, pulling it back into reachable history before garbage collection can claim it.')


def diag_topic_submodule_state():
    g = base_graph('topic_submodule_state', 'Submodule State -- Four Places Git Tracks It')
    g.attr(rankdir='TB', ranksep='0.7', nodesep='0.7')
    n(g, 'gitmodules', '.gitmodules\n(tracked, committed)', 'green')
    n(g, 'gitlink', 'gitlink in parent tree\nmode 160000, child commit SHA', 'navy')
    n(g, 'config', '.git/config\n(local, not committed)', 'gray')
    n(g, 'checkout', 'submodule working copy\n(checked out at that SHA)', 'teal')
    # Two rows: sources of truth on top (.gitmodules, gitlink), derived/local
    # state below (.git/config, the actual checkout).
    with g.subgraph() as s:
        s.attr(rank='same')
        s.node('gitmodules')
        s.node('gitlink')
    g.edge('gitmodules', 'gitlink', style='invis', weight='5')
    with g.subgraph() as s2:
        s2.attr(rank='same')
        s2.node('config')
        s2.node('checkout')
    g.edge('config', 'checkout', style='invis', weight='5')
    g.edge('gitmodules', 'config', style='invis', weight='3')
    g.edge('gitlink', 'checkout', style='invis', weight='3')
    e(g, 'gitmodules', 'config', 'submodule init', '#166534')
    e(g, 'gitmodules', 'config', 'submodule sync', '#166534', 'dashed')
    e(g, 'gitlink', 'checkout', 'submodule update', '#1e40af')
    e(g, 'checkout', 'gitlink', 'commit in parent', '#3730a3')
    save(g, 'topic-submodule-state', 'Submodule State',
         'A 2x2 layout: the tracked .gitmodules file and the gitlink entry in the parent tree (mode 160000, the '
         'submodule\'s exact commit SHA) sit on top as the two committed sources of truth; the local .git/config '
         'and the actual checked-out working copy sit below as derived state. git submodule init copies the URL '
         'from .gitmodules into .git/config, sync refreshes it, update reads the gitlink SHA and checks the '
         'working copy out at it, and committing in the parent writes the working copy\'s new SHA back into the gitlink.')


# =====================================================================

def main():
    diag_fund_basic_usage()
    diag_fund_conventions()
    diag_fund_diff()
    diag_fund_commit()
    diag_fund_commit_stable()
    diag_fund_commit_amend()
    diag_fund_checkout_files()
    diag_fund_checkout_branch()
    diag_fund_checkout_detached()
    diag_fund_detached_sequence()
    diag_fund_reset_commit()
    diag_fund_reset_bare()
    diag_fund_reset_files()
    diag_fund_reset_modes()
    diag_fund_merge_ff()
    diag_fund_merge_3way()
    diag_fund_cherry_pick()
    diag_fund_rebase()
    diag_fund_rebase_onto()

    diag_graph_snapshots_vs_deltas()
    diag_graph_three_states()
    diag_graph_file_lifecycle()
    diag_graph_commit_and_tree()
    diag_graph_commits_and_parents()
    diag_graph_branches_head()
    diag_graph_divergent_history()
    diag_graph_basic_branching()
    diag_graph_three_way_merge()
    diag_graph_rebase_vs_merge()
    diag_graph_rebase_onto_topic()
    diag_graph_perils_of_rebasing()
    diag_graph_double_dot()

    diag_remote_clone_and_tracking()
    diag_remote_second_remote()
    diag_remote_fetch_vs_pull()
    diag_remote_diverged_push()
    diag_remote_refspec()
    diag_remote_bare_hub()
    diag_remote_centralized_workflow()
    diag_remote_integration_manager()

    diag_walk_object_graph()

    diag_lgb_intro3_merge()
    diag_lgb_intro4_rebase()
    diag_lgb_rampup4_reset_revert()
    diag_lgb_move1_cherry_pick()
    diag_lgb_move2_rebase_i()
    diag_lgb_mixed1_grab_one()
    diag_lgb_advanced2_multiple_parents()
    diag_lgb_advanced1_rebase_9000()
    diag_lgb_remoteadv1_vs_2()
    diag_lgb_remoteadv6_fetch_args()

    diag_topic_gitflow()
    diag_topic_reflog_dangling()
    diag_topic_submodule_state()

    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(MANIFEST, f, indent=2)
    print(f'\nAll {len(MANIFEST)} git-learn diagrams generated. Manifest written.')


if __name__ == '__main__':
    main()
