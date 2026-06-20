#!/usr/bin/env python3
"""Generate Git-for-DevOps diagrams. All landscape (LR) Graphviz PNGs.
Output: apps/camora/public/diagrams/git-for-devops/*.png
"""
import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'git-for-devops')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue',
            fontsize='12', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
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


def n(g, name, label, c='navy'):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)


def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '',
           color=color, fontcolor=color, style=style, **EDGE)


def base_graph(name, title):
    g = graphviz.Digraph(name, format='png')
    g.attr(bgcolor='#ffffff', dpi='120', pad='0.25', nodesep='0.5', ranksep='0.45',
           splines='spline', rankdir='LR',
           label=f'  {title}  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g


def diag_three_trees():
    g = base_graph('three_trees', 'Git Three Trees — Working Directory → Index → Repository')

    n(g, 'wd', 'Working Directory\n(what you see on disk)', 'gray')
    n(g, 'idx', 'Index / Staging Area\n(next commit being built)', 'gold')
    n(g, 'repo', 'Repository (HEAD)\n(committed history)', 'green')

    n(g, 'add', 'git add', 'navy')
    n(g, 'commit', 'git commit', 'navy')
    n(g, 'checkout', 'git checkout / restore', 'purple')
    n(g, 'reset_soft', 'git reset --soft\n(moves HEAD only)', 'amber')
    n(g, 'reset_mixed', 'git reset --mixed\n(HEAD + unstage)', 'orange')
    n(g, 'reset_hard', 'git reset --hard\n(discards everything)', 'red')

    e(g, 'wd', 'add', '', '#3b82f6')
    e(g, 'add', 'idx', '', '#3b82f6')
    e(g, 'idx', 'commit', '', '#22c55e')
    e(g, 'commit', 'repo', '', '#22c55e')
    e(g, 'repo', 'checkout', 'restore file', '#6366f1', 'dashed')
    e(g, 'checkout', 'wd', '', '#6366f1', 'dashed')
    e(g, 'reset_soft', 'repo', 'touches HEAD', '#f59e0b', 'dotted')
    e(g, 'reset_mixed', 'idx', 'touches HEAD+index', '#f97316', 'dotted')
    e(g, 'reset_hard', 'wd', 'touches all three', '#ef4444', 'dotted')

    g.render(os.path.join(OUT, 'deep-dive-three-trees'), cleanup=True)
    print('Generated: deep-dive-three-trees')


def diag_merge_vs_rebase():
    g = base_graph('merge_vs_rebase', 'Git Merge vs Rebase — History and Safety Comparison')

    n(g, 'main_start', 'main: A→B→C', 'navy')
    n(g, 'feat', 'feature: A→B→X→Y', 'purple')

    n(g, 'merge_result', 'Merge result\nmain: A→B→C→M\n(M = merge commit)\npreserves both histories', 'green')
    n(g, 'rebase_result', 'Rebase result\nmain: A→B→C→X\'→Y\'\n(X,Y replayed on C)\nlinear history, new SHAs', 'gold')

    n(g, 'merge_safe', 'Safe on shared branches\nNo history rewrite\nCreates extra commit', 'green')
    n(g, 'rebase_caution', 'Never rebase shared branches\nRewrites commit SHAs\nBreaks teammates\' history', 'red')

    e(g, 'main_start', 'merge_result', 'git merge feature', '#22c55e')
    e(g, 'feat', 'merge_result', '', '#22c55e')
    e(g, 'main_start', 'rebase_result', 'git rebase main', '#f59e0b')
    e(g, 'feat', 'rebase_result', '', '#f59e0b')
    e(g, 'merge_result', 'merge_safe', '', '#22c55e', 'dashed')
    e(g, 'rebase_result', 'rebase_caution', '', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-merge-vs-rebase'), cleanup=True)
    print('Generated: deep-dive-merge-vs-rebase')


def diag_gitops_flow():
    g = base_graph('gitops_flow', 'GitOps Workflow — Git as Single Source of Truth')

    n(g, 'dev', 'Developer\nworkstation', 'gray')
    n(g, 'pr', 'Pull Request\n+ Code Review', 'navy')
    n(g, 'git', 'Git Repository\n(declarative state)', 'green')
    n(g, 'ci', 'CI Pipeline\n(build, test, scan)', 'gold')
    n(g, 'registry', 'Container Registry\n(Docker image)', 'purple')
    n(g, 'operator', 'GitOps Operator\n(ArgoCD / Flux)\ncontinuous reconcile', 'teal')
    n(g, 'cluster', 'Kubernetes Cluster\n(live state)', 'sky')
    n(g, 'monitor', 'Monitoring\n(Prometheus / Grafana)', 'amber')
    n(g, 'no_kubectl', 'No direct\nkubectl apply\nin production', 'red')

    e(g, 'dev', 'pr', 'git push', '#3b82f6')
    e(g, 'pr', 'git', 'merge to main', '#22c55e')
    e(g, 'git', 'ci', 'push triggers', '#f59e0b')
    e(g, 'ci', 'registry', 'push image', '#6366f1')
    e(g, 'git', 'operator', 'operator watches', '#14b8a6')
    e(g, 'operator', 'cluster', 'reconcile', '#0ea5e9')
    e(g, 'cluster', 'monitor', 'metrics', '#f59e0b', 'dashed')
    e(g, 'monitor', 'dev', 'alert / observe', '#ef4444', 'dashed')
    e(g, 'no_kubectl', 'cluster', '', '#ef4444', 'dotted')

    g.render(os.path.join(OUT, 'deep-dive-gitops-flow'), cleanup=True)
    print('Generated: deep-dive-gitops-flow')


def diag_branching_strategies():
    g = base_graph('branching_strategies', 'Git Branching Strategies — Trunk-Based vs Gitflow vs GitHub Flow')

    n(g, 'trunk_lbl', 'Trunk-Based\nDevelopment', 'green')
    n(g, 'trunk_main', 'main (always deployable)', 'green')
    n(g, 'trunk_feat', 'short-lived feature branch\n< 2 days, direct to main', 'teal')
    n(g, 'trunk_ci', 'CI gate on every commit\nFeature flags for WIP', 'gold')

    n(g, 'gitflow_lbl', 'Gitflow', 'purple')
    n(g, 'gf_main', 'main (tagged releases)', 'purple')
    n(g, 'gf_develop', 'develop branch', 'pink')
    n(g, 'gf_feat', 'feature/*\nrelease/*\nhotfix/*', 'pink')

    n(g, 'ghflow_lbl', 'GitHub Flow', 'navy')
    n(g, 'gh_main', 'main (always deployable)', 'navy')
    n(g, 'gh_feat', 'feature branch +\nPull Request + Review', 'sky')

    e(g, 'trunk_lbl', 'trunk_feat', '', '#14b8a6')
    e(g, 'trunk_feat', 'trunk_main', 'merge fast', '#22c55e')
    e(g, 'trunk_main', 'trunk_ci', '', '#f59e0b')

    e(g, 'gitflow_lbl', 'gf_feat', '', '#ec4899')
    e(g, 'gf_feat', 'gf_develop', '', '#ec4899')
    e(g, 'gf_develop', 'gf_main', 'release branch', '#6366f1')

    e(g, 'ghflow_lbl', 'gh_feat', '', '#0ea5e9')
    e(g, 'gh_feat', 'gh_main', 'PR merged', '#3b82f6')

    g.render(os.path.join(OUT, 'deep-dive-branching-strategies'), cleanup=True)
    print('Generated: deep-dive-branching-strategies')


def diag_tradeoff_revert_vs_reset():
    g = base_graph('revert_vs_reset', 'git revert vs git reset — Safety for Shared Branches')

    n(g, 'bad', 'Bad commit (B)\non shared branch', 'red')

    n(g, 'revert', 'git revert B', 'green')
    n(g, 'revert_result', 'New commit B\'\nundoes B\'s changes\nHistory: A→B→B\'\nSafe: no rewrite', 'green')
    n(g, 'revert_use', 'Use on: main, production,\nany shared branch\n— teammates unaffected', 'green')

    n(g, 'reset', 'git reset --hard A', 'red')
    n(g, 'reset_result', 'HEAD moves to A\nCommit B erased\nHistory: A only\nDangerous: rewrites', 'red')
    n(g, 'reset_use', 'Use on: local private\nbranches only\n— never on shared refs', 'red')

    e(g, 'bad', 'revert', '', '#22c55e')
    e(g, 'revert', 'revert_result', '', '#22c55e')
    e(g, 'revert_result', 'revert_use', '', '#22c55e', 'dashed')

    e(g, 'bad', 'reset', '', '#ef4444')
    e(g, 'reset', 'reset_result', '', '#ef4444')
    e(g, 'reset_result', 'reset_use', '', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'tradeoff-revert-vs-reset'), cleanup=True)
    print('Generated: tradeoff-revert-vs-reset')


def diag_tradeoff_fetch_vs_pull():
    g = base_graph('fetch_vs_pull', 'git fetch vs git pull — Control vs Convenience')

    n(g, 'remote', 'Remote (origin/main)\nnew commits available', 'gray')

    n(g, 'fetch', 'git fetch origin', 'navy')
    n(g, 'fetch_local', 'origin/main updated\nYour local main: unchanged\nYou inspect the diff first', 'navy')
    n(g, 'fetch_merge', 'You decide:\ngit merge origin/main\nor git rebase origin/main', 'teal')

    n(g, 'pull', 'git pull', 'gold')
    n(g, 'pull_result', 'Fetch + merge in one step\ngit pull --rebase\nFetch + rebase in one step', 'gold')
    n(g, 'pull_risk', 'Fast but less control\nUnexpected merge commit\nif local diverged', 'orange')

    e(g, 'remote', 'fetch', '', '#3b82f6')
    e(g, 'fetch', 'fetch_local', '', '#3b82f6')
    e(g, 'fetch_local', 'fetch_merge', 'safe review', '#14b8a6')

    e(g, 'remote', 'pull', '', '#f59e0b')
    e(g, 'pull', 'pull_result', '', '#f59e0b')
    e(g, 'pull_result', 'pull_risk', '', '#f97316', 'dashed')

    g.render(os.path.join(OUT, 'tradeoff-fetch-vs-pull'), cleanup=True)
    print('Generated: tradeoff-fetch-vs-pull')


def diag_tradeoff_squash_vs_merge():
    g = base_graph('squash_vs_merge', 'Squash Merge vs Regular Merge vs Rebase Merge')

    n(g, 'feat', 'feature branch\nA→B→C→D (4 commits)', 'purple')
    n(g, 'main_before', 'main: 1→2→3', 'navy')

    n(g, 'squash', 'Squash Merge\ngit merge --squash', 'gold')
    n(g, 'squash_result', 'main: 1→2→3→S\n(S = all changes in 1 commit)\nClean history, loses detail', 'gold')

    n(g, 'merge', 'Regular Merge\ngit merge', 'green')
    n(g, 'merge_result', 'main: 1→2→3→M\n(M = merge commit with 4 parents)\nFull history preserved', 'green')

    n(g, 'rebase_merge', 'Rebase Merge\ngit rebase then merge', 'teal')
    n(g, 'rebase_result', 'main: 1→2→3→A\'→B\'→C\'→D\'\nLinear history, replayed commits\nRequires force-push on PR', 'teal')

    e(g, 'feat', 'squash', '', '#f59e0b')
    e(g, 'main_before', 'squash', '', '#f59e0b')
    e(g, 'squash', 'squash_result', '', '#f59e0b')

    e(g, 'feat', 'merge', '', '#22c55e')
    e(g, 'main_before', 'merge', '', '#22c55e')
    e(g, 'merge', 'merge_result', '', '#22c55e')

    e(g, 'feat', 'rebase_merge', '', '#14b8a6')
    e(g, 'main_before', 'rebase_merge', '', '#14b8a6')
    e(g, 'rebase_merge', 'rebase_result', '', '#14b8a6')

    g.render(os.path.join(OUT, 'tradeoff-squash-vs-merge'), cleanup=True)
    print('Generated: tradeoff-squash-vs-merge')


def cn(g, name, label, c='navy', lost=False):
    """Commit circle node."""
    style = 'filled,dashed' if lost else 'filled'
    g.node(name, label, shape='circle', style=style,
           fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2],
           fontname='Helvetica Neue Bold', fontsize='11',
           width='0.42', height='0.42', fixedsize='true', penwidth='2.0')


def bp(g, name, label, c='green'):
    """Branch pointer label box."""
    g.node(name, label, shape='box', style='filled,rounded',
           fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2],
           fontname='Helvetica Neue', fontsize='10',
           height='0.28', margin='0.12,0.04', penwidth='1.2')


def ce(g, a, b, color='#64748b', style='solid'):
    """Commit edge."""
    g.edge(a, b, color=color, penwidth='1.8', style=style, arrowsize='0.7')


def diag_rebase_before_after():
    g = base_graph('rebase_ba', 'git rebase — Replay Branch Commits on Top of main')

    with g.subgraph(name='cluster_before') as b:
        b.attr(label='Before', style='rounded,filled', fillcolor='#f8fafc',
               color='#cbd5e1', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#475569', margin='18')
        cn(b, 'bA', 'A', 'gray')
        cn(b, 'bB', 'B', 'navy')
        cn(b, 'bC', 'C', 'navy')
        cn(b, 'bD', 'D', 'purple')
        cn(b, 'bE', 'E', 'purple')
        bp(b, 'bMain', 'main', 'navy')
        bp(b, 'bBanana', 'banana', 'purple')
        ce(b, 'bA', 'bB', '#3b82f6')
        ce(b, 'bB', 'bC', '#3b82f6')
        ce(b, 'bA', 'bD', '#6366f1')
        ce(b, 'bD', 'bE', '#6366f1')
        ce(b, 'bC', 'bMain', '#3b82f6', 'dashed')
        ce(b, 'bE', 'bBanana', '#6366f1', 'dashed')

    with g.subgraph(name='cluster_after') as a:
        a.attr(label='After: git switch banana && git rebase main',
               style='rounded,filled', fillcolor='#f0fdf4',
               color='#86efac', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#166534', margin='18')
        cn(a, 'aA', 'A', 'gray')
        cn(a, 'aB', 'B', 'navy')
        cn(a, 'aC', 'C', 'navy')
        cn(a, 'aD_', "D'", 'purple')
        cn(a, 'aE_', "E'", 'purple')
        cn(a, 'aD', 'D', 'gray', lost=True)
        cn(a, 'aE', 'E', 'gray', lost=True)
        bp(a, 'aMain', 'main', 'navy')
        bp(a, 'aBanana', 'banana', 'purple')
        a.node('aLost', '"lost"', shape='plaintext', fontcolor='#94a3b8',
               fontname='Helvetica Neue', fontsize='10')
        ce(a, 'aA', 'aB', '#3b82f6')
        ce(a, 'aB', 'aC', '#3b82f6')
        ce(a, 'aC', 'aD_', '#6366f1')
        ce(a, 'aD_', 'aE_', '#6366f1')
        ce(a, 'aA', 'aD', '#94a3b8', 'dashed')
        ce(a, 'aD', 'aE', '#94a3b8', 'dashed')
        ce(a, 'aC', 'aMain', '#3b82f6', 'dashed')
        ce(a, 'aE_', 'aBanana', '#6366f1', 'dashed')
        ce(a, 'aE', 'aLost', '#94a3b8', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-rebase-before-after'), cleanup=True)
    print('Generated: deep-dive-rebase-before-after')


def diag_merge_before_after():
    g = base_graph('merge_ba', 'git merge — Merge Commit Joins Two Branch Histories')

    with g.subgraph(name='cluster_before') as b:
        b.attr(label='Before', style='rounded,filled', fillcolor='#f8fafc',
               color='#cbd5e1', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#475569', margin='18')
        cn(b, 'bA', 'A', 'gray')
        cn(b, 'bB', 'B', 'navy')
        cn(b, 'bC', 'C', 'navy')
        cn(b, 'bD', 'D', 'purple')
        cn(b, 'bE', 'E', 'purple')
        bp(b, 'bMain', 'main', 'navy')
        bp(b, 'bBanana', 'banana', 'purple')
        ce(b, 'bA', 'bB', '#3b82f6')
        ce(b, 'bB', 'bC', '#3b82f6')
        ce(b, 'bA', 'bD', '#6366f1')
        ce(b, 'bD', 'bE', '#6366f1')
        ce(b, 'bC', 'bMain', '#3b82f6', 'dashed')
        ce(b, 'bE', 'bBanana', '#6366f1', 'dashed')

    with g.subgraph(name='cluster_after') as a:
        a.attr(label='After: git switch main && git merge banana',
               style='rounded,filled', fillcolor='#f0fdf4',
               color='#86efac', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#166534', margin='18')
        cn(a, 'aA', 'A', 'gray')
        cn(a, 'aB', 'B', 'navy')
        cn(a, 'aC', 'C', 'navy')
        cn(a, 'aD', 'D', 'purple')
        cn(a, 'aE', 'E', 'purple')
        cn(a, 'aM', 'M', 'green')
        bp(a, 'aMain', 'main', 'navy')
        bp(a, 'aBanana', 'banana', 'purple')
        a.node('aMlbl', 'merge commit\n(two parents: C and E)', shape='plaintext',
               fontcolor='#166534', fontname='Helvetica Neue', fontsize='10')
        ce(a, 'aA', 'aB', '#3b82f6')
        ce(a, 'aB', 'aC', '#3b82f6')
        ce(a, 'aA', 'aD', '#6366f1')
        ce(a, 'aD', 'aE', '#6366f1')
        ce(a, 'aC', 'aM', '#22c55e')
        ce(a, 'aE', 'aM', '#22c55e')
        ce(a, 'aM', 'aMain', '#22c55e', 'dashed')
        ce(a, 'aE', 'aBanana', '#6366f1', 'dashed')
        ce(a, 'aM', 'aMlbl', '#86efac', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-merge-before-after'), cleanup=True)
    print('Generated: deep-dive-merge-before-after')


def diag_squash_before_after():
    g = base_graph('squash_ba', 'git merge --squash — Collapse Branch Into One Commit')

    with g.subgraph(name='cluster_before') as b:
        b.attr(label='Before', style='rounded,filled', fillcolor='#f8fafc',
               color='#cbd5e1', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#475569', margin='18')
        cn(b, 'bA', 'A', 'gray')
        cn(b, 'bB', 'B', 'navy')
        cn(b, 'bC', 'C', 'navy')
        cn(b, 'bD', 'D', 'purple')
        cn(b, 'bE', 'E', 'purple')
        bp(b, 'bMain', 'main', 'navy')
        bp(b, 'bBanana', 'banana', 'purple')
        ce(b, 'bA', 'bB', '#3b82f6')
        ce(b, 'bB', 'bC', '#3b82f6')
        ce(b, 'bA', 'bD', '#6366f1')
        ce(b, 'bD', 'bE', '#6366f1')
        ce(b, 'bC', 'bMain', '#3b82f6', 'dashed')
        ce(b, 'bE', 'bBanana', '#6366f1', 'dashed')

    with g.subgraph(name='cluster_after') as a:
        a.attr(label='After: git switch main && git merge --squash banana && git commit',
               style='rounded,filled', fillcolor='#fffbeb',
               color='#fcd34d', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#92400e', margin='18')
        cn(a, 'aA', 'A', 'gray')
        cn(a, 'aB', 'B', 'navy')
        cn(a, 'aC', 'C', 'navy')
        cn(a, 'aD', 'D', 'purple')
        cn(a, 'aE', 'E', 'purple')
        cn(a, 'aDE', 'DE', 'gold')
        bp(a, 'aMain', 'main', 'navy')
        bp(a, 'aBanana', 'banana', 'purple')
        a.node('aDElbl', 'D+E squashed\ninto one commit\n(one parent: C)', shape='plaintext',
               fontcolor='#92400e', fontname='Helvetica Neue', fontsize='10')
        ce(a, 'aA', 'aB', '#3b82f6')
        ce(a, 'aB', 'aC', '#3b82f6')
        ce(a, 'aA', 'aD', '#6366f1')
        ce(a, 'aD', 'aE', '#6366f1')
        ce(a, 'aC', 'aDE', '#f59e0b')
        ce(a, 'aDE', 'aMain', '#f59e0b', 'dashed')
        ce(a, 'aE', 'aBanana', '#6366f1', 'dashed')
        ce(a, 'aDE', 'aDElbl', '#fcd34d', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-squash-before-after'), cleanup=True)
    print('Generated: deep-dive-squash-before-after')


def diag_fast_forward_before_after():
    g = base_graph('ff_ba', 'Fast-Forward Merge — main Pointer Advances, No Merge Commit')

    with g.subgraph(name='cluster_before') as b:
        b.attr(label='Before (main is behind, no divergence)', style='rounded,filled',
               fillcolor='#f8fafc', color='#cbd5e1', fontsize='13',
               fontname='Helvetica Neue Bold', fontcolor='#475569', margin='18')
        cn(b, 'bA', 'A', 'navy')
        cn(b, 'bB', 'B', 'navy')
        cn(b, 'bC', 'C', 'navy')
        cn(b, 'bD', 'D', 'purple')
        cn(b, 'bE', 'E', 'purple')
        bp(b, 'bMain', 'main', 'navy')
        bp(b, 'bBanana', 'banana', 'purple')
        ce(b, 'bA', 'bB', '#3b82f6')
        ce(b, 'bB', 'bC', '#3b82f6')
        ce(b, 'bC', 'bD', '#6366f1')
        ce(b, 'bD', 'bE', '#6366f1')
        ce(b, 'bC', 'bMain', '#3b82f6', 'dashed')
        ce(b, 'bE', 'bBanana', '#6366f1', 'dashed')

    with g.subgraph(name='cluster_after') as a:
        a.attr(label='After: git switch main && git merge banana (no new commit created)',
               style='rounded,filled', fillcolor='#f0fdf4',
               color='#86efac', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#166534', margin='18')
        cn(a, 'aA', 'A', 'navy')
        cn(a, 'aB', 'B', 'navy')
        cn(a, 'aC', 'C', 'navy')
        cn(a, 'aD', 'D', 'navy')
        cn(a, 'aE', 'E', 'navy')
        bp(a, 'aMain', 'main', 'navy')
        bp(a, 'aBanana', 'banana', 'purple')
        a.node('aFFnote', 'main pointer just\nadvanced to E\nNo merge commit', shape='plaintext',
               fontcolor='#166534', fontname='Helvetica Neue', fontsize='10')
        ce(a, 'aA', 'aB', '#3b82f6')
        ce(a, 'aB', 'aC', '#3b82f6')
        ce(a, 'aC', 'aD', '#3b82f6')
        ce(a, 'aD', 'aE', '#3b82f6')
        ce(a, 'aE', 'aMain', '#22c55e', 'dashed')
        ce(a, 'aE', 'aBanana', '#6366f1', 'dashed')
        ce(a, 'aMain', 'aFFnote', '#86efac', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-fast-forward-before-after'), cleanup=True)
    print('Generated: deep-dive-fast-forward-before-after')


def diag_cherry_pick_before_after():
    g = base_graph('cherry_ba', 'git cherry-pick — Copy One Specific Commit onto Another Branch')

    with g.subgraph(name='cluster_before') as b:
        b.attr(label='Before', style='rounded,filled', fillcolor='#f8fafc',
               color='#cbd5e1', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#475569', margin='18')
        cn(b, 'bA', 'A', 'gray')
        cn(b, 'bB', 'B', 'navy')
        cn(b, 'bC', 'C', 'navy')
        cn(b, 'bD', 'D', 'purple')
        cn(b, 'bE', 'E', 'purple')
        bp(b, 'bMain', 'main', 'navy')
        bp(b, 'bBanana', 'banana', 'purple')
        b.node('bDlbl', 'want this\ncommit', shape='plaintext',
               fontcolor='#6366f1', fontname='Helvetica Neue', fontsize='10')
        ce(b, 'bA', 'bB', '#3b82f6')
        ce(b, 'bB', 'bC', '#3b82f6')
        ce(b, 'bA', 'bD', '#6366f1')
        ce(b, 'bD', 'bE', '#6366f1')
        ce(b, 'bC', 'bMain', '#3b82f6', 'dashed')
        ce(b, 'bE', 'bBanana', '#6366f1', 'dashed')
        ce(b, 'bD', 'bDlbl', '#6366f1', 'dashed')

    with g.subgraph(name='cluster_after') as a:
        a.attr(label="After: git cherry-pick <D's commit hash>",
               style='rounded,filled', fillcolor='#fdf4ff',
               color='#d8b4fe', fontsize='13', fontname='Helvetica Neue Bold',
               fontcolor='#6b21a8', margin='18')
        cn(a, 'aA', 'A', 'gray')
        cn(a, 'aB', 'B', 'navy')
        cn(a, 'aC', 'C', 'navy')
        cn(a, 'aD', 'D', 'purple')
        cn(a, 'aE', 'E', 'purple')
        cn(a, 'aD_', "D'", 'pink')
        bp(a, 'aMain', 'main', 'navy')
        bp(a, 'aBanana', 'banana', 'purple')
        a.node('aD_lbl', "D' = same changes as D\nnew commit SHA\napplied on top of C", shape='plaintext',
               fontcolor='#9d174d', fontname='Helvetica Neue', fontsize='10')
        ce(a, 'aA', 'aB', '#3b82f6')
        ce(a, 'aB', 'aC', '#3b82f6')
        ce(a, 'aA', 'aD', '#6366f1')
        ce(a, 'aD', 'aE', '#6366f1')
        ce(a, 'aC', 'aD_', '#ec4899')
        ce(a, 'aD_', 'aMain', '#ec4899', 'dashed')
        ce(a, 'aE', 'aBanana', '#6366f1', 'dashed')
        ce(a, 'aD_', 'aD_lbl', '#d8b4fe', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-cherry-pick-before-after'), cleanup=True)
    print('Generated: deep-dive-cherry-pick-before-after')


if __name__ == '__main__':
    diag_three_trees()
    diag_merge_vs_rebase()
    diag_gitops_flow()
    diag_branching_strategies()
    diag_tradeoff_revert_vs_reset()
    diag_tradeoff_fetch_vs_pull()
    diag_tradeoff_squash_vs_merge()
    diag_rebase_before_after()
    diag_merge_before_after()
    diag_squash_before_after()
    diag_fast_forward_before_after()
    diag_cherry_pick_before_after()
    print('All git-for-devops diagrams generated.')
