#!/usr/bin/env python3
"""Generate Graphviz PNG diagrams for Agentic Orchestration topics."""

import graphviz
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'agentic')
os.makedirs(OUT_DIR, exist_ok=True)

BASE_GRAPH = {
    'bgcolor': '#ffffff',
    'pad': '0.6',
    'nodesep': '0.65',
    'ranksep': '0.85',
    'dpi': '200',
    'splines': 'spline',
}
BASE_NODE = {
    'fontname': 'Helvetica',
    'fontsize': '11',
    'penwidth': '1.5',
    'height': '0.45',
    'margin': '0.20,0.12',
    'style': 'filled,rounded',
    'shape': 'box',
}
BASE_EDGE = {
    'fontname': 'Helvetica',
    'fontsize': '9',
    'penwidth': '1.6',
}

P = {
    'header':   {'fill': '#1e1b4b', 'border': '#1e1b4b',  'font': '#ffffff'},
    'agent':    {'fill': '#ede9fe', 'border': '#7c3aed',  'font': '#4c1d95'},
    'state':    {'fill': '#dbeafe', 'border': '#2563eb',  'font': '#1e3a8a'},
    'tool':     {'fill': '#d1fae5', 'border': '#059669',  'font': '#064e3b'},
    'llm':      {'fill': '#fef3c7', 'border': '#d97706',  'font': '#78350f'},
    'store':    {'fill': '#e0f2fe', 'border': '#0284c7',  'font': '#0c4a6e'},
    'decision': {'fill': '#fce7f3', 'border': '#db2777',  'font': '#831843'},
    'async':    {'fill': '#ccfbf1', 'border': '#0d9488',  'font': '#134e4a'},
    'warn':     {'fill': '#fee2e2', 'border': '#ef4444',  'font': '#7f1d1d'},
    'slate':    {'fill': '#f1f5f9', 'border': '#64748b',  'font': '#1e293b'},
    'good':     {'fill': '#dcfce7', 'border': '#16a34a',  'font': '#166534'},
    'indigo':   {'fill': '#e0e7ff', 'border': '#4f46e5',  'font': '#312e81'},
    'amber':    {'fill': '#fef9c3', 'border': '#ca8a04',  'font': '#713f12'},
}

def node(g, n, label, pk):
    c = P[pk]
    g.node(n, label, fillcolor=c['fill'], color=c['border'], fontcolor=c['font'], **BASE_NODE)

def edge(g, a, b, label='', color='#64748b'):
    g.edge(a, b, label, color=color, fontcolor='#475569', **BASE_EDGE)


# ─── 1. LangGraph Supervisor Architecture ────────────────────────────────────
def gen_langgraph_supervisor():
    g = graphviz.Digraph('langgraph_supervisor', format='png')
    g.attr(rankdir='TB', label='LangGraph Supervisor Multi-Agent Architecture',
           labelloc='t', fontsize='14', fontname='Helvetica', fontcolor='#1e293b', **BASE_GRAPH)
    g.attr('node', **BASE_NODE)
    g.attr('edge', **BASE_EDGE)

    with g.subgraph(name='cluster_input') as s:
        s.attr(label='Input', style='rounded', color='#cbd5e1', bgcolor='#f8fafc', fontsize='10')
        node(s, 'user', 'User Request', 'slate')
        node(s, 'state', 'Shared State\n(TypedDict)', 'state')

    node(g, 'supervisor', 'Supervisor Node\n(LLM Router)', 'llm')

    with g.subgraph(name='cluster_agents') as s:
        s.attr(label='Specialist Agents', style='rounded', color='#c4b5fd', bgcolor='#faf5ff', fontsize='10')
        node(s, 'researcher', 'Researcher Agent\n(Web Search Tools)', 'agent')
        node(s, 'writer', 'Writer Agent\n(Draft + Edit)', 'agent')

    with g.subgraph(name='cluster_tools') as s:
        s.attr(label='Tools', style='rounded', color='#6ee7b7', bgcolor='#f0fdf4', fontsize='10')
        node(s, 'search', 'Tavily / Serper\nSearch API', 'tool')
        node(s, 'scrape', 'Web Scraper\nTool', 'tool')

    with g.subgraph(name='cluster_memory') as s:
        s.attr(label='Persistence', style='rounded', color='#93c5fd', bgcolor='#eff6ff', fontsize='10')
        node(s, 'checkpointer', 'Checkpointer\n(SqliteSaver)', 'store')
        node(s, 'memory_store', 'LangGraph Store\n(Cross-thread)', 'store')

    node(g, 'output', 'Final Report', 'good')

    edge(g, 'user', 'state')
    edge(g, 'state', 'supervisor')
    edge(g, 'supervisor', 'researcher', 'route: research')
    edge(g, 'supervisor', 'writer', 'route: write')
    edge(g, 'supervisor', 'output', 'FINISH')
    edge(g, 'researcher', 'search')
    edge(g, 'researcher', 'scrape')
    edge(g, 'researcher', 'supervisor', 'findings')
    edge(g, 'writer', 'supervisor', 'draft')
    edge(g, 'state', 'checkpointer', '', '#93c5fd')
    edge(g, 'state', 'memory_store', '', '#93c5fd')

    out = os.path.join(OUT_DIR, 'langgraph-supervisor')
    g.render(out, cleanup=True)
    print(f'  wrote {out}.png')


# ─── 2. LangGraph State Flow ──────────────────────────────────────────────────
def gen_langgraph_state_flow():
    g = graphviz.Digraph('langgraph_state', format='png')
    g.attr(rankdir='TB', label='LangGraph State and Message Flow',
           labelloc='t', fontsize='14', fontname='Helvetica', fontcolor='#1e293b',
           bgcolor='#ffffff', pad='0.7', nodesep='0.9', ranksep='1.1',
           dpi='200', splines='spline')
    g.attr('node', **BASE_NODE)
    g.attr('edge', **BASE_EDGE)

    # Tier 1 — entry
    with g.subgraph() as s:
        s.attr(rank='same')
        node(s, 'start', '__start__', 'slate')
        node(s, 'msgs', 'messages\n(add_messages)', 'state')

    # Tier 2 — supervisor
    node(g, 'sup', 'supervisor\n(LLM Router)', 'llm')

    # Tier 3 — routing decision
    node(g, 'next', 'next: str\n(route field)', 'decision')

    # Tier 4 — outcomes on same rank
    with g.subgraph() as s:
        s.attr(rank='same')
        node(s, 'res', 'researcher', 'agent')
        node(s, 'end', '__end__', 'good')
        node(s, 'wri', 'writer', 'agent')

    # Persistence — side branch
    node(g, 'check', 'Checkpoint\n(auto-persist)', 'store')

    # Main forward flow
    edge(g, 'start', 'msgs', 'init')
    edge(g, 'msgs', 'sup', 'read')
    edge(g, 'sup', 'next', 'set next')
    edge(g, 'next', 'res', '"researcher"')
    edge(g, 'next', 'end', '"FINISH"')
    edge(g, 'next', 'wri', '"writer"')

    # Feedback loops — constraint=false keeps them from distorting rank layout
    g.edge('res', 'msgs', 'append result',
           color='#7c3aed', fontcolor='#475569', fontname='Helvetica',
           fontsize='9', penwidth='1.6', constraint='false')
    g.edge('wri', 'msgs', 'append draft',
           color='#7c3aed', fontcolor='#475569', fontname='Helvetica',
           fontsize='9', penwidth='1.6', constraint='false')

    # Persistence side edge
    g.edge('msgs', 'check', '',
           color='#93c5fd', style='dashed', fontcolor='#475569',
           fontname='Helvetica', fontsize='9', penwidth='1.4',
           constraint='false')

    out = os.path.join(OUT_DIR, 'langgraph-state-flow')
    g.render(out, cleanup=True)
    print(f'  wrote {out}.png')


# ─── 3. Async Checkpoint + Webhook ───────────────────────────────────────────
def gen_async_checkpoint_webhook():
    g = graphviz.Digraph('async_checkpoint', format='png')
    g.attr(rankdir='LR', label='Async Long-Running Tool: Checkpoint + Webhook Pattern',
           labelloc='t', fontsize='14', fontname='Helvetica', fontcolor='#1e293b', **BASE_GRAPH)
    g.attr('node', **BASE_NODE)
    g.attr('edge', **BASE_EDGE)

    node(g, 'agent', 'Agent Node', 'agent')
    node(g, 'tool_call', 'trigger_pipeline()\nreturns job_id', 'tool')
    node(g, 'checkpoint', 'Checkpoint State\n{job_id, status: pending}', 'store')
    node(g, 'suspend', 'interrupt_before\nSUSPEND', 'decision')
    node(g, 'pipeline', 'External Pipeline\n(5-min job)', 'async')
    node(g, 'webhook', 'Webhook POST\n/agent/resume', 'async')
    node(g, 'api', 'Agent API\nresume(thread_id)', 'slate')
    node(g, 'resume', 'Agent Resumes\nwith tool result', 'agent')
    node(g, 'sse', 'SSE Stream\nto UI', 'good')

    edge(g, 'agent', 'tool_call', '1. call')
    edge(g, 'tool_call', 'checkpoint', '2. save job_id')
    edge(g, 'checkpoint', 'suspend', '3. interrupt')
    edge(g, 'suspend', 'pipeline', '4. async start')
    edge(g, 'pipeline', 'webhook', '5. complete')
    edge(g, 'webhook', 'api', '6. POST result')
    edge(g, 'api', 'resume', '7. graph.invoke')
    edge(g, 'resume', 'sse', '8. stream')

    out = os.path.join(OUT_DIR, 'async-checkpoint-webhook')
    g.render(out, cleanup=True)
    print(f'  wrote {out}.png')


# ─── 4. Retry State Counter & Circuit Breaker ────────────────────────────────
def gen_async_retry_state():
    g = graphviz.Digraph('async_retry', format='png')
    g.attr(rankdir='TB', label='Agent Loop Prevention: Retry Counter and Circuit Breaker',
           labelloc='t', fontsize='14', fontname='Helvetica', fontcolor='#1e293b',
           bgcolor='#ffffff', pad='0.7', nodesep='0.9', ranksep='1.1',
           dpi='200', splines='spline')
    g.attr('node', **BASE_NODE)
    g.attr('edge', **BASE_EDGE)

    # Entry
    node(g, 'agent', 'Agent Node', 'agent')
    node(g, 'incr', 'retries[tool]++', 'state')

    # Decision tier
    with g.subgraph() as s:
        s.attr(rank='same')
        node(s, 'check', 'retries >= MAX?', 'decision')
        node(s, 'escalate', 'Escalate\nto Human', 'amber')

    with g.subgraph() as s:
        s.attr(rank='same')
        node(s, 'circuit', 'Circuit\nBreaker Open?', 'decision')

    # Execution tier
    with g.subgraph() as s:
        s.attr(rank='same')
        node(s, 'exec', 'Execute Tool', 'tool')
        node(s, 'success', 'Success\ncontinue', 'good')

    with g.subgraph() as s:
        s.attr(rank='same')
        node(s, 'fail', 'Tool Error', 'warn')
        node(s, 'backoff', 'Exponential\nBackoff', 'async')

    # Forward flow
    edge(g, 'agent', 'incr', 'call tool')
    edge(g, 'incr', 'check')
    edge(g, 'check', 'escalate', 'YES →')
    edge(g, 'check', 'circuit', 'NO')
    edge(g, 'circuit', 'escalate', 'OPEN →')
    edge(g, 'circuit', 'exec', 'CLOSED')
    edge(g, 'exec', 'success', 'ok')
    edge(g, 'exec', 'fail', 'error')
    edge(g, 'fail', 'backoff', 'transient')

    # Feedback loops — constraint=false to avoid rank distortion
    g.edge('backoff', 'agent', 'retry',
           color='#0d9488', fontcolor='#475569', fontname='Helvetica',
           fontsize='9', penwidth='1.6', constraint='false')
    g.edge('fail', 'agent', 'semantic fix',
           color='#ef4444', fontcolor='#475569', fontname='Helvetica',
           fontsize='9', penwidth='1.6', constraint='false', style='dashed')

    out = os.path.join(OUT_DIR, 'async-retry-state')
    g.render(out, cleanup=True)
    print(f'  wrote {out}.png')


# ─── 5. Context Window Management 3-Tier ─────────────────────────────────────
def gen_context_window_mgmt():
    g = graphviz.Digraph('context_window', format='png')
    g.attr(rankdir='LR', label='Context Window Management: 3-Tier Hybrid Architecture',
           labelloc='t', fontsize='14', fontname='Helvetica', fontcolor='#1e293b', **BASE_GRAPH)
    g.attr('node', **BASE_NODE)
    g.attr('edge', **BASE_EDGE)

    with g.subgraph(name='cluster_active') as s:
        s.attr(label='Tier 1 - Active Context', style='rounded', color='#7c3aed', bgcolor='#faf5ff', fontsize='10')
        node(s, 'recent', 'Recent Messages\n(last N turns)', 'agent')
        node(s, 'summary', 'Running Summary\n(compressed)', 'state')

    with g.subgraph(name='cluster_summarize') as s:
        s.attr(label='Summarization Node', style='rounded', color='#d97706', bgcolor='#fffbeb', fontsize='10')
        node(s, 'threshold', 'tokens > threshold?', 'decision')
        node(s, 'llm_sum', 'LLM Compress\ntrim_messages()', 'llm')

    with g.subgraph(name='cluster_vector') as s:
        s.attr(label='Tier 2 - Episodic Memory', style='rounded', color='#0284c7', bgcolor='#eff6ff', fontsize='10')
        node(s, 'embed', 'Embed turns', 'store')
        node(s, 'pgvector', 'pgvector Store', 'store')
        node(s, 'retrieve', 'Top-k Retrieval', 'store')

    with g.subgraph(name='cluster_semantic') as s:
        s.attr(label='Tier 3 - Semantic Memory', style='rounded', color='#059669', bgcolor='#f0fdf4', fontsize='10')
        node(s, 'facts', 'Key Facts\n(user prefs)', 'tool')
        node(s, 'lg_store', 'LangGraph Store\n(PostgresStore)', 'tool')

    node(g, 'llm_call', 'LLM Call\n(assembled context)', 'llm')

    edge(g, 'recent', 'threshold')
    edge(g, 'threshold', 'llm_sum', 'YES')
    edge(g, 'llm_sum', 'summary')
    edge(g, 'recent', 'embed')
    edge(g, 'embed', 'pgvector')
    edge(g, 'pgvector', 'retrieve', 'similarity search')
    edge(g, 'facts', 'lg_store')
    edge(g, 'summary', 'llm_call', 'inject')
    edge(g, 'retrieve', 'llm_call', 'inject past turns')
    edge(g, 'lg_store', 'llm_call', 'inject facts')

    out = os.path.join(OUT_DIR, 'context-window-mgmt')
    g.render(out, cleanup=True)
    print(f'  wrote {out}.png')


# ─── 6. Summarization Flow ───────────────────────────────────────────────────
def gen_summarization_flow():
    g = graphviz.Digraph('summarization_flow', format='png')
    g.attr(rankdir='LR', label='Summarization Node: LangGraph Conditional Flow',
           labelloc='t', fontsize='14', fontname='Helvetica', fontcolor='#1e293b', **BASE_GRAPH)
    g.attr('node', **BASE_NODE)
    g.attr('edge', **BASE_EDGE)

    node(g, 'msg_in', 'New Message', 'slate')
    node(g, 'count', 'Count tokens', 'state')
    node(g, 'gate', 'tokens > 4000?', 'decision')
    node(g, 'sum_node', 'summarize_node\n(LLM call)', 'llm')
    node(g, 'trim', 'trim_messages()\nkeep last 2', 'amber')
    node(g, 'prepend', 'Prepend summary\nto messages[]', 'state')
    node(g, 'agent_node', 'agent_node\n(main LLM call)', 'agent')
    node(g, 'resp', 'Response', 'good')

    edge(g, 'msg_in', 'count')
    edge(g, 'count', 'gate')
    edge(g, 'gate', 'sum_node', 'YES')
    edge(g, 'gate', 'agent_node', 'NO')
    edge(g, 'sum_node', 'trim')
    edge(g, 'trim', 'prepend')
    edge(g, 'prepend', 'agent_node')
    edge(g, 'agent_node', 'resp')

    out = os.path.join(OUT_DIR, 'summarization-flow')
    g.render(out, cleanup=True)
    print(f'  wrote {out}.png')


if __name__ == '__main__':
    print('Generating agentic orchestration diagrams...')
    gen_langgraph_supervisor()
    gen_langgraph_state_flow()
    gen_async_checkpoint_webhook()
    gen_async_retry_state()
    gen_context_window_mgmt()
    gen_summarization_flow()
    print('Done.')
