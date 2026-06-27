#!/usr/bin/env python3
"""Generate professional Graphviz PNG diagrams for AI Systems Performance Engineering topics."""

import graphviz
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'ai-perf')
os.makedirs(OUT_DIR, exist_ok=True)

# ─── Shared style ────────────────────────────────────────────────────────────
BASE_GRAPH = {
    'bgcolor': '#ffffff',
    'fontname': 'Helvetica',
    'pad': '0.5',
    'nodesep': '0.55',
    'ranksep': '0.8',
    'dpi': '200',
    'splines': 'ortho',
}
BASE_NODE = {
    'fontname': 'Helvetica',
    'fontsize': '11',
    'penwidth': '1.5',
    'height': '0.45',
    'margin': '0.18,0.10',
    'style': 'filled,rounded',
    'shape': 'box',
}
BASE_EDGE = {
    'fontname': 'Helvetica',
    'fontsize': '9',
    'penwidth': '1.6',
    'color': '#64748b',
    'fontcolor': '#475569',
}

P = {
    'gpu':    {'fill': '#ede9fe', 'border': '#7c3aed', 'font': '#4c1d95'},
    'sm':     {'fill': '#ddd6fe', 'border': '#7c3aed', 'font': '#3b0764'},
    'mem':    {'fill': '#bfdbfe', 'border': '#2563eb', 'font': '#1e3a8a'},
    'hbm':    {'fill': '#dbeafe', 'border': '#3b82f6', 'font': '#1e40af'},
    'nvlink': {'fill': '#bbf7d0', 'border': '#16a34a', 'font': '#14532d'},
    'fast':   {'fill': '#dcfce7', 'border': '#22c55e', 'font': '#166534'},
    'slow':   {'fill': '#fee2e2', 'border': '#ef4444', 'font': '#7f1d1d'},
    'warn':   {'fill': '#fef3c7', 'border': '#f59e0b', 'font': '#78350f'},
    'good':   {'fill': '#d1fae5', 'border': '#10b981', 'font': '#064e3b'},
    'blue':   {'fill': '#e0f2fe', 'border': '#0284c7', 'font': '#0c4a6e'},
    'indigo': {'fill': '#e0e7ff', 'border': '#4f46e5', 'font': '#312e81'},
    'slate':  {'fill': '#f1f5f9', 'border': '#64748b', 'font': '#1e293b'},
    'teal':   {'fill': '#ccfbf1', 'border': '#0d9488', 'font': '#134e4a'},
    'rose':   {'fill': '#ffe4e6', 'border': '#e11d48', 'font': '#881337'},
    'amber':  {'fill': '#fef9c3', 'border': '#ca8a04', 'font': '#713f12'},
    'sky':    {'fill': '#e0f2fe', 'border': '#0ea5e9', 'font': '#0c4a6e'},
    'header': {'fill': '#1e1b4b', 'border': '#1e1b4b', 'font': '#ffffff'},
}

def node(g, n, label, pk):
    c = P[pk]
    g.node(n, label, fillcolor=c['fill'], color=c['border'], fontcolor=c['font'], **BASE_NODE)

def header_node(g, n, label):
    c = P['header']
    g.node(n, label, fillcolor=c['fill'], color=c['border'], fontcolor=c['font'],
           fontsize='12', fontname='Helvetica', penwidth='0', style='filled,rounded',
           shape='box', height='0.4', margin='0.2,0.1')

def edge(g, a, b, label='', **kw):
    attrs = {**BASE_EDGE, **kw}
    if label:
        attrs['label'] = label
    g.edge(a, b, **attrs)

def save(g, name):
    path = os.path.join(OUT_DIR, name)
    g.render(path, format='png', cleanup=True)
    print(f'  ok {name}.png')


# ─── 1. GPU Architecture Overview ────────────────────────────────────────────
def gpu_architecture_overview():
    g = graphviz.Digraph('gpu_arch', graph_attr={**BASE_GRAPH, 'rankdir': 'TB'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'NVIDIA H100 SXM5 — Architecture Overview')

    with g.subgraph(name='cluster_gpu') as c:
        c.attr(label='GPU Die', style='filled,rounded', fillcolor='#f8fafc',
               color='#94a3b8', fontname='Helvetica', fontsize='11', penwidth='1.5')

        with c.subgraph(name='cluster_sms') as s:
            s.attr(label='132 x Streaming Multiprocessor (SM)', style='filled,rounded',
                   fillcolor='#ede9fe', color='#7c3aed', fontname='Helvetica',
                   fontsize='10', penwidth='1.2')
            node(s, 'cuda_cores', '128 FP32 CUDA Cores', 'sm')
            node(s, 'tc', '4x Tensor Core Groups\n(BF16 / FP8)', 'gpu')
            node(s, 'smem', 'Shared Mem / L1\n256 KB', 'mem')
            node(s, 'rf', 'Register File\n64 KB / SM', 'indigo')
            node(s, 'warp_sched', 'Warp Scheduler\n64 warps max', 'slate')

        node(c, 'l2', 'L2 Cache — 50 MB', 'hbm')
        node(c, 'hbm', 'HBM3 — 80 GB · 3.35 TB/s', 'blue')

    with g.subgraph(name='cluster_connect') as c:
        c.attr(label='Interconnect', style='filled,rounded', fillcolor='#f0fdf4',
               color='#16a34a', fontname='Helvetica', fontsize='10', penwidth='1.2')
        node(c, 'nvlink', 'NVLink 4.0\n900 GB/s bidi', 'nvlink')
        node(c, 'pcie', 'PCIe 5.0\n128 GB/s bidi', 'slate')

    with g.subgraph(name='cluster_roof') as c:
        c.attr(label='Roofline Ceilings (H100 SXM5)', style='filled,rounded', fillcolor='#fefce8',
               color='#ca8a04', fontname='Helvetica', fontsize='10', penwidth='1.2')
        node(c, 'fp32', 'FP32: 67 TFLOPS', 'warn')
        node(c, 'bf16', 'BF16 Tensor: 1979 TFLOPS', 'good')
        node(c, 'fp8', 'FP8 Tensor: 3958 TFLOPS', 'teal')

    g.edge('H', 'cuda_cores', style='invis')
    edge(g, 'cuda_cores', 'tc', 'SIMT warp')
    edge(g, 'tc', 'smem', 'D=A*B+C\ntile 16x16')
    edge(g, 'smem', 'rf', 'register\nspill/fill')
    edge(g, 'smem', 'l2', 'L1 miss', color='#dc2626')
    edge(g, 'l2', 'hbm', 'L2 miss ~500ns', color='#dc2626')
    edge(g, 'hbm', 'nvlink', 'NVLink transfer')
    edge(g, 'hbm', 'pcie', 'CPU transfer')
    edge(g, 'hbm', 'bf16', 'ridge point ~591 FLOPs/byte')

    save(g, 'gpu-architecture-overview')


# ─── 2. CUDA Memory Hierarchy ────────────────────────────────────────────────
def cuda_memory_hierarchy():
    g = graphviz.Digraph('cuda_mem', graph_attr={**BASE_GRAPH, 'rankdir': 'LR', 'ranksep': '1.0'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'CUDA Memory Hierarchy — Latency, Bandwidth & Optimization')
    g.edge('H', 'regs', style='invis')

    node(g, 'regs',  'Registers\n~255/thread\n1 cycle', 'fast')
    node(g, 'smem',  'Shared Mem (L1)\n32-256 KB/SM\n4-20 cycles\n32 banks', 'good')
    node(g, 'l2',    'L2 Cache\n50 MB (H100)\n100-200 cycles', 'warn')
    node(g, 'hbm',   'HBM3 (Global)\n80 GB · 3.35 TB/s\n500-800 cycles', 'slow')

    edge(g, 'regs', 'smem',  'spill/fill\n(avoid)')
    edge(g, 'smem', 'l2',    'L1 miss')
    edge(g, 'l2',   'hbm',   'L2 miss BOTTLENECK')

    with g.subgraph(name='cluster_opt') as c:
        c.attr(label='Optimization Techniques', style='filled,rounded',
               fillcolor='#f0f9ff', color='#0284c7', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'coal',   'Coalesced Access\nthread[i] -> base+i\n1 transaction/warp', 'blue')
        node(c, 'tile',   'Tiling (GEMM)\nNaive: 0.25 FLOPs/B\nT=32: 8 FLOPs/B', 'teal')
        node(c, 'bank',   'Bank Conflict Fix\nPad SMEM dim+1\n-> zero conflicts', 'indigo')
        node(c, 'tma',    'TMA / cp.async\nAsync HBM->SMEM\nOverlap compute', 'sky')
        node(c, 'flash',  'FlashAttention\nO(N^2)->O(N*d)\n50x HBM savings', 'good')

    edge(g, 'hbm', 'coal',  'access pattern', color='#0284c7')
    edge(g, 'smem', 'bank', 'bank conflict', color='#4f46e5')
    edge(g, 'smem', 'tile', 'reuse data', color='#0d9488')
    edge(g, 'hbm', 'tma',   'async prefetch', color='#0ea5e9')
    edge(g, 'hbm', 'flash', 'attention fusion', color='#10b981')

    save(g, 'cuda-memory-hierarchy')


# ─── 3. CUDA Kernel Profiling ─────────────────────────────────────────────────
def cuda_kernel_profiling():
    g = graphviz.Digraph('cuda_prof', graph_attr={**BASE_GRAPH, 'rankdir': 'TB', 'ranksep': '0.7'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'CUDA Profiling Workflow — Nsight Systems -> Nsight Compute -> Fix')

    node(g, 'slow', 'Slow Kernel\n(measure first)', 'slow')
    node(g, 'nsys', 'Nsight Systems\nSystem Timeline', 'blue')
    node(g, 'ncu',  'Nsight Compute\nKernel Microarch', 'indigo')

    with g.subgraph(name='cluster_nsys') as c:
        c.attr(label='Nsight Systems Findings', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'gpu_idle', 'GPU Idle Gap\n-> CPU bottleneck', 'warn')
        node(c, 'h2d',      'H2D Transfer Stall\n-> async prefetch', 'warn')
        node(c, 'nccl_dom', 'NCCL Dominates\n-> overlap comms', 'warn')

    with g.subgraph(name='cluster_ncu') as c:
        c.attr(label='Nsight Compute Sections', style='filled,rounded',
               fillcolor='#f5f3ff', color='#7c3aed', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'mem_bw',  'Memory BW < 60%\n-> coalescing issue', 'mem')
        node(c, 'tc_util', 'TC Util < 50%\n-> bad tile size', 'gpu')
        node(c, 'occ',     'Occupancy\nLimited by regs/SMEM', 'indigo')
        node(c, 'stalls',  'Warp Stalls\nLong SB / Barrier', 'rose')

    with g.subgraph(name='cluster_fix') as c:
        c.attr(label='Targeted Fixes', style='filled,rounded',
               fillcolor='#f0fdf4', color='#16a34a', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'fix_coal',  'Coalesce Access\nunit-stride loads', 'good')
        node(c, 'fix_tile',  'Tile into SMEM\nboost arith intensity', 'good')
        node(c, 'fix_occ',   '--maxrregcount\nreduce SMEM/block', 'good')
        node(c, 'fix_graph', 'CUDA Graph\n800 launches -> 1 call\n7.9ms saved', 'teal')

    g.edge('H', 'slow', style='invis')
    edge(g, 'slow', 'nsys',  'step 1')
    edge(g, 'slow', 'ncu',   'step 2')
    edge(g, 'nsys', 'gpu_idle')
    edge(g, 'nsys', 'h2d')
    edge(g, 'nsys', 'nccl_dom')
    edge(g, 'ncu',  'mem_bw')
    edge(g, 'ncu',  'tc_util')
    edge(g, 'ncu',  'occ')
    edge(g, 'ncu',  'stalls')
    edge(g, 'mem_bw',   'fix_coal',  color='#16a34a')
    edge(g, 'stalls',   'fix_tile',  color='#16a34a')
    edge(g, 'occ',      'fix_occ',   color='#16a34a')
    edge(g, 'gpu_idle', 'fix_graph', color='#16a34a')

    save(g, 'cuda-kernel-profiling')


# ─── 4. Distributed Training — NCCL & Parallelism ───────────────────────────
def distributed_training_nccl():
    g = graphviz.Digraph('dist_train', graph_attr={**BASE_GRAPH, 'rankdir': 'LR', 'ranksep': '1.1'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'Distributed Training — NCCL Collectives & Parallelism Strategies')
    g.edge('H', 'dp', style='invis')

    with g.subgraph(name='cluster_coll') as c:
        c.attr(label='NCCL Collective Operations', style='filled,rounded',
               fillcolor='#f0fdf4', color='#16a34a', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'allreduce',     'AllReduce\nSum grads all GPUs\n2P x N_gpu FLOPs', 'good')
        node(c, 'reducescatter', 'ReduceScatter\nEach GPU gets 1/N shard\n(FSDP backward)', 'teal')
        node(c, 'allgather',     'AllGather\nRebuild full tensor\n(FSDP forward)', 'nvlink')
        node(c, 'broadcast',     'Broadcast\nInit weights\nfrom checkpoint', 'slate')
        edge(c, 'reducescatter', 'allgather', 'AllReduce = RS + AG')

    with g.subgraph(name='cluster_par') as c:
        c.attr(label='Parallelism Strategies', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'dp',   'Data Parallel (DP)\nReplicate model\nAllReduce grads', 'blue')
        node(c, 'fsdp', 'FSDP\nShard params+grads+opt\nAllGather fwd / RS bwd', 'sky')
        node(c, 'tp',   'Tensor Parallel (TP)\nSplit weight matrices\nAllReduce per layer', 'indigo')
        node(c, 'pp',   'Pipeline Parallel (PP)\nLayer stages\n1F1B schedule', 'mem')
        node(c, 'sp',   'Sequence Parallel (SP)\nShard seq dim\nRS/AG per layer', 'gpu')

    with g.subgraph(name='cluster_inter') as c:
        c.attr(label='Interconnect', style='filled,rounded', fillcolor='#fef9c3',
               color='#ca8a04', fontname='Helvetica', fontsize='10', penwidth='1.2')
        node(c, 'nvl', 'NVLink 4.0\n900 GB/s -> TP within node', 'nvlink')
        node(c, 'ib',  'InfiniBand NDR\n50 GB/s -> PP/DP across nodes', 'warn')

    edge(g, 'dp',   'allreduce',     'gradient sync')
    edge(g, 'fsdp', 'allgather',     'fwd pass')
    edge(g, 'fsdp', 'reducescatter', 'bwd pass')
    edge(g, 'tp',   'allreduce',     'partial activations')
    edge(g, 'tp',   'nvl',           'requires')
    edge(g, 'pp',   'ib',            'cross-node activations')

    save(g, 'distributed-training-nccl')


# ─── 5. LLM KV Cache & Batching ──────────────────────────────────────────────
def llm_kv_cache_batching():
    g = graphviz.Digraph('kv_cache', graph_attr={**BASE_GRAPH, 'rankdir': 'TB', 'ranksep': '0.75'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'LLM Inference — KV Cache, Batching & Scheduling')

    with g.subgraph(name='cluster_kv') as c:
        c.attr(label='KV Cache Mechanics', style='filled,rounded',
               fillcolor='#eff6ff', color='#3b82f6', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'prefill',  'Prefill Phase\nProcess prompt tokens\n(compute-bound)', 'blue')
        node(c, 'decode',   'Decode Phase\nGenerate 1 token/step\n(memory-bound)', 'indigo')
        node(c, 'kvcache',  'KV Cache\nK,V per layer per token\nL x 2 x H x D bytes', 'mem')
        node(c, 'kv_size',  'KV Size\nLLaMA-3 70B, 4k ctx\n~34 GB (FP16)', 'warn')
        edge(c, 'prefill',  'kvcache', 'store K,V\nall prompt tokens')
        edge(c, 'kvcache',  'decode',  'load K,V\nevery decode step')
        edge(c, 'kvcache',  'kv_size', 'scales with\nbatch x ctx len')

    with g.subgraph(name='cluster_batch') as c:
        c.attr(label='Batching Strategies', style='filled,rounded',
               fillcolor='#f0fdf4', color='#16a34a', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'static_b',  'Static Batching\nWait for batch fill\n-> high latency', 'slow')
        node(c, 'cont_b',    'Continuous Batching\nInsert req mid-flight\n-> high throughput', 'good')
        node(c, 'paged',     'PagedAttention\nKV blocks like OS pages\nElim 60-80% fragmentation', 'teal')
        node(c, 'chunked',   'Chunked Prefill\nSplit long prompts\nCo-schedule w/ decode', 'nvlink')
        edge(c, 'static_b',  'cont_b',   'replaced by')
        edge(c, 'cont_b',    'paged',    'enabled by')
        edge(c, 'paged',     'chunked',  'combined for TTFT')

    g.edge('H', 'prefill', style='invis')
    edge(g, 'decode', 'cont_b', 'scheduling decisions')

    save(g, 'llm-kv-cache-batching')


# ─── 6. Disaggregated Prefill-Decode ──────────────────────────────────────────
def disaggregated_prefill_decode():
    g = graphviz.Digraph('disagg', graph_attr={**BASE_GRAPH, 'rankdir': 'LR', 'ranksep': '1.2'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'Disaggregated Prefill-Decode (PD Disaggregation)')
    g.edge('H', 'router', style='invis')

    node(g, 'router', 'Load Balancer / Router', 'slate')

    with g.subgraph(name='cluster_p') as c:
        c.attr(label='Prefill Fleet (compute-bound)', style='filled,rounded',
               fillcolor='#eff6ff', color='#2563eb', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'p1', 'Prefill GPU 0\nPrompt -> K,V', 'blue')
        node(c, 'p2', 'Prefill GPU 1\nPrompt -> K,V', 'blue')
        node(c, 'p3', 'Prefill GPU N\nPrompt -> K,V', 'blue')

    with g.subgraph(name='cluster_xfer') as c:
        c.attr(label='KV Transfer Layer', style='filled,rounded',
               fillcolor='#fef9c3', color='#ca8a04', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'kv_xfer', 'KV Cache Transfer\nNVLink / RDMA', 'warn')

    with g.subgraph(name='cluster_d') as c:
        c.attr(label='Decode Fleet (memory-bound)', style='filled,rounded',
               fillcolor='#f0fdf4', color='#16a34a', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'd1', 'Decode GPU 0\nToken generation', 'good')
        node(c, 'd2', 'Decode GPU 1\nToken generation', 'good')
        node(c, 'd3', 'Decode GPU N\nToken generation', 'good')

    with g.subgraph(name='cluster_why') as c:
        c.attr(label='Why Disaggregate?', style='filled,rounded',
               fillcolor='#f5f3ff', color='#7c3aed', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'co_loc',   'Coupled (vLLM v1)\nPrefill preempts decode\n-> TPOT jitter', 'rose')
        node(c, 'disagg_b', 'Disaggregated\nScale P & D independently\n-> TTFT + TPOT SLOs', 'gpu')

    edge(g, 'router', 'p1',     'prompt')
    edge(g, 'router', 'p2',     'prompt')
    edge(g, 'router', 'p3',     'prompt')
    edge(g, 'p1',     'kv_xfer','K,V tensors')
    edge(g, 'p2',     'kv_xfer','K,V tensors')
    edge(g, 'p3',     'kv_xfer','K,V tensors')
    edge(g, 'kv_xfer','d1',     'hydrate cache')
    edge(g, 'kv_xfer','d2',     'hydrate cache')
    edge(g, 'kv_xfer','d3',     'hydrate cache')
    edge(g, 'co_loc', 'disagg_b','solves', color='#7c3aed')

    save(g, 'disaggregated-prefill-decode')


# ─── 7. Speculative Decoding ──────────────────────────────────────────────────
def speculative_decoding():
    g = graphviz.Digraph('spec_dec', graph_attr={**BASE_GRAPH, 'rankdir': 'LR', 'ranksep': '1.0'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'Speculative Decoding — Draft-then-Verify Architecture')
    g.edge('H', 'prompt', style='invis')

    node(g, 'prompt', 'Prompt (input tokens)', 'slate')

    with g.subgraph(name='cluster_draft') as c:
        c.attr(label='Draft Phase (fast)', style='filled,rounded',
               fillcolor='#f0fdf4', color='#16a34a', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'draft_model', 'Draft Model\n(small: 1B-7B)\nautoregressive\ngamma tokens', 'good')
        node(c, 'candidates',  'Candidate Tokens\nt1, t2, ..., t_gamma', 'teal')

    with g.subgraph(name='cluster_verify') as c:
        c.attr(label='Verify Phase (single forward pass)', style='filled,rounded',
               fillcolor='#eff6ff', color='#2563eb', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'target_model', 'Target Model\n(large: 70B-405B)\ngamma+1 tokens\nONE pass', 'blue')
        node(c, 'accept',       'Acceptance Sampling\nalpha = min(1, p_target/p_draft)', 'indigo')

    with g.subgraph(name='cluster_out') as c:
        c.attr(label='Outcome', style='filled,rounded',
               fillcolor='#fef9c3', color='#ca8a04', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'accept_all', 'All Accepted\ngamma+1 tokens/step\ngamma x throughput', 'good')
        node(c, 'partial',    'Partial Accept\nk+1 tokens/step\nfallback at first reject', 'warn')
        node(c, 'reject_all', 'All Rejected\n1 token/step\n(rare with good draft)', 'slow')

    edge(g, 'prompt',       'draft_model',  'generate gamma')
    edge(g, 'draft_model',  'candidates',   'gamma draft tokens')
    edge(g, 'candidates',   'target_model', 'verify batch')
    edge(g, 'target_model', 'accept',       'compare distributions')
    edge(g, 'accept',       'accept_all',   'all match')
    edge(g, 'accept',       'partial',      'partial match')
    edge(g, 'accept',       'reject_all',   'no match')

    save(g, 'speculative-decoding')


# ─── 8. Quantization & Model Compression ─────────────────────────────────────
def quantization_model_compression():
    g = graphviz.Digraph('quant', graph_attr={**BASE_GRAPH, 'rankdir': 'TB', 'ranksep': '0.75'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'Quantization & Model Compression — Precision vs. Efficiency')

    with g.subgraph(name='cluster_prec') as c:
        c.attr(label='Precision Formats (Memory per Parameter)', style='filled,rounded',
               fillcolor='#f5f3ff', color='#7c3aed', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'fp32', 'FP32 — 4 bytes\nBaseline compute', 'slow')
        node(c, 'bf16', 'BF16 — 2 bytes\nTraining standard\n1979 TFLOPS (H100 TC)', 'warn')
        node(c, 'fp8',  'FP8 — 1 byte\nFinetune + inference\n3958 TFLOPS', 'good')
        node(c, 'int8', 'INT8 — 1 byte\nW8A8 LLM.int8()', 'teal')
        node(c, 'int4', 'INT4 — 0.5 bytes\nGPTQ / AWQ\nWeight-only quant', 'nvlink')
        node(c, 'fp4',  'FP4 — 0.5 bytes\nBlackwell native\n2x FP8 throughput', 'gpu')
        edge(c, 'fp32', 'bf16', '2x compression')
        edge(c, 'bf16', 'fp8',  '2x compression')
        edge(c, 'fp8',  'int8', 'dynamic range trade')
        edge(c, 'int8', 'int4', '2x compression')
        edge(c, 'fp8',  'fp4',  'Blackwell only')

    with g.subgraph(name='cluster_methods') as c:
        c.attr(label='Quantization Methods', style='filled,rounded',
               fillcolor='#eff6ff', color='#2563eb', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'ptq',  'PTQ\nNo retraining\nCalibration dataset', 'blue')
        node(c, 'qat',  'QAT\nFine-tune w/ fake quant\nBest accuracy', 'indigo')
        node(c, 'gptq', 'GPTQ\nLayer-wise OBQ\nW4A16 production', 'sky')
        node(c, 'awq',  'AWQ\nActivation-aware\npreserve salient weights', 'mem')
        node(c, 'sq',   'SmoothQuant\nW8A8 activation quant\nrescale outliers', 'indigo')
        edge(c, 'ptq', 'gptq', 'implements')
        edge(c, 'ptq', 'awq',  'implements')
        edge(c, 'ptq', 'sq',   'implements')

    with g.subgraph(name='cluster_tradeoff') as c:
        c.attr(label='Tradeoffs', style='filled,rounded',
               fillcolor='#f0fdf4', color='#16a34a', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'mem_save', 'Memory: 2-8x reduction\n-> larger batch size\n-> higher throughput', 'good')
        node(c, 'acc_loss', 'Accuracy: <1% loss\nfor W4/W8 on LLMs\n(task-dependent)', 'warn')

    g.edge('H', 'fp32', style='invis')
    edge(g, 'gptq', 'mem_save', 'result')
    edge(g, 'awq',  'acc_loss', 'result')

    save(g, 'quantization-model-compression')


# ─── 9. MoE Inference Optimization ───────────────────────────────────────────
def moe_inference_optimization():
    g = graphviz.Digraph('moe', graph_attr={**BASE_GRAPH, 'rankdir': 'LR', 'ranksep': '1.1'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'Mixture-of-Experts (MoE) — Architecture & Inference Challenges')
    g.edge('H', 'input', style='invis')

    node(g, 'input', 'Input Tokens (batch)', 'slate')

    with g.subgraph(name='cluster_arch') as c:
        c.attr(label='MoE Layer (replaces dense FFN)', style='filled,rounded',
               fillcolor='#f5f3ff', color='#7c3aed', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'router',  'Router\nlinear + softmax\nselects Top-K experts', 'gpu')
        node(c, 'exp1',    'Expert 1\nFFN (active)', 'good')
        node(c, 'exp2',    'Expert 2\nFFN (active)', 'good')
        node(c, 'exp_n',   'Expert N\nFFN (inactive\n-> zero compute)', 'slate')
        node(c, 'combine', 'Weighted Combine\nsum gate_i x ffn_i', 'teal')
        edge(c, 'router', 'exp1',    'gate_1')
        edge(c, 'router', 'exp2',    'gate_2')
        edge(c, 'router', 'exp_n',   'gate_0 sparse')
        edge(c, 'exp1',   'combine', 'output_1')
        edge(c, 'exp2',   'combine', 'output_2')

    with g.subgraph(name='cluster_models') as c:
        c.attr(label='Production MoE Models', style='filled,rounded',
               fillcolor='#eff6ff', color='#2563eb', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'mixtral', 'Mixtral 8x7B\n8 experts, Top-2\n~13B active params', 'blue')
        node(c, 'grok',    'Grok-1 (314B)\n8 experts, Top-2\n~52B active params', 'indigo')
        node(c, 'ds_moe',  'DeepSeek-V3 (671B)\n256 experts, Top-8\n~37B active params', 'sky')

    with g.subgraph(name='cluster_challenges') as c:
        c.attr(label='Inference Challenges', style='filled,rounded',
               fillcolor='#fff7ed', color='#ea580c', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'load_imb',  'Load Imbalance\nHot experts bottleneck\n-> capacity factor', 'rose')
        node(c, 'comm',      'Expert Parallelism\nAll2All collective\nexpensive at scale', 'warn')
        node(c, 'mem_total', 'Total Params in VRAM\nDeepSeek-V3: 671B\nneed 80-GPU cluster', 'slow')

    edge(g, 'input',   'router',    'token embedding')
    edge(g, 'combine', 'load_imb',  'challenge')
    edge(g, 'combine', 'comm',      'challenge')
    edge(g, 'combine', 'mem_total', 'challenge')

    save(g, 'moe-inference-optimization')


# ─── 10. PyTorch compile & FSDP ──────────────────────────────────────────────
def pytorch_compile_fsdp():
    g = graphviz.Digraph('pt_compile', graph_attr={**BASE_GRAPH, 'rankdir': 'TB', 'ranksep': '0.75'})
    g.attr('node', **BASE_NODE)

    header_node(g, 'H', 'PyTorch 2.x — torch.compile, FSDP2 & AMP Training Stack')

    with g.subgraph(name='cluster_compile') as c:
        c.attr(label='torch.compile Pipeline', style='filled,rounded',
               fillcolor='#f5f3ff', color='#7c3aed', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'eager',    'Eager PyTorch\nPython interpreter\nper op', 'slow')
        node(c, 'dynamo',   'TorchDynamo\nCapture FX Graph\nbytecode rewrite', 'gpu')
        node(c, 'inductor', 'TorchInductor\nLower to Triton/C++\nKernel fusion + CG', 'indigo')
        node(c, 'compiled', 'Compiled Kernel\nFused ops\n1.5-3x speedup', 'good')
        edge(c, 'eager',    'dynamo',   'torch.compile()')
        edge(c, 'dynamo',   'inductor', 'FX graph optimizations')
        edge(c, 'inductor',  'compiled', 'generated kernels')

    with g.subgraph(name='cluster_fsdp') as c:
        c.attr(label='FSDP2 — Fully Sharded Data Parallel', style='filled,rounded',
               fillcolor='#eff6ff', color='#2563eb', fontname='Helvetica',
               fontsize='11', penwidth='1.5')
        node(c, 'shard_p',  'Shard Params\n1/N weights per GPU\n(DTensor)', 'blue')
        node(c, 'ag_fwd',   'AllGather (Fwd)\nReconstruct layer\nbefore compute', 'sky')
        node(c, 'rs_bwd',   'ReduceScatter (Bwd)\nAggregate + re-shard\ngradients', 'mem')
        node(c, 'cpu_offld','CPU Offload\nOptimizer state -> RAM\n40GB -> 8GB VRAM', 'warn')
        edge(c, 'shard_p',  'ag_fwd',    'pre-fetch next layer')
        edge(c, 'ag_fwd',   'rs_bwd',    'backward pass')
        edge(c, 'shard_p',  'cpu_offld', 'optional')

    with g.subgraph(name='cluster_amp') as c:
        c.attr(label='AMP — Mixed Precision', style='filled,rounded',
               fillcolor='#f0fdf4', color='#16a34a', fontname='Helvetica',
               fontsize='10', penwidth='1.2')
        node(c, 'amp_fwd',  'FP16/BF16 Fwd\nActivations + weights', 'good')
        node(c, 'grad_sc',  'GradScaler\nPrevent FP16 underflow', 'teal')
        node(c, 'fp32_opt', 'FP32 Master Weights\nOptimizer step', 'nvlink')
        edge(c, 'amp_fwd', 'grad_sc',  'scale loss')
        edge(c, 'grad_sc', 'fp32_opt', 'unscale + optimizer step')

    g.edge('H', 'eager', style='invis')
    edge(g, 'compiled', 'amp_fwd', 'runs inside AMP context')
    edge(g, 'rs_bwd',   'grad_sc', 'grads fed to scaler')

    save(g, 'pytorch-compile-fsdp')


if __name__ == '__main__':
    print('Generating AI Systems Performance Engineering diagrams...')
    gpu_architecture_overview()
    cuda_memory_hierarchy()
    cuda_kernel_profiling()
    distributed_training_nccl()
    llm_kv_cache_batching()
    disaggregated_prefill_decode()
    speculative_decoding()
    quantization_model_compression()
    moe_inference_optimization()
    pytorch_compile_fsdp()
    print('Done — 10 diagrams saved to public/diagrams/ai-perf/')
