#!/usr/bin/env python3
"""Generate professional Graphviz PNG diagrams for Uber system design topic.
Follows the exact same pattern as gen-whatsapp-diagrams.py."""

import graphviz
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'uber')
os.makedirs(OUT, exist_ok=True)

COMMON = dict(bgcolor='#ffffff', dpi='200', pad='0.4', nodesep='0.6', ranksep='0.7', splines='spline')
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='11', penwidth='1.5', height='0.45', margin='0.15,0.08')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')

C = {
    'blue':   ('#dbeafe', '#3b82f6', '#1e40af'),
    'green':  ('#dcfce7', '#22c55e', '#166534'),
    'yellow': ('#fef3c7', '#f59e0b', '#92400e'),
    'purple': ('#e0e7ff', '#6366f1', '#3730a3'),
    'pink':   ('#fce7f3', '#ec4899', '#9d174d'),
    'orange': ('#ffedd5', '#f97316', '#9a3412'),
    'teal':   ('#ccfbf1', '#14b8a6', '#115e59'),
    'gray':   ('#f3f4f6', '#6b7280', '#374151'),
    'red':    ('#fee2e2', '#ef4444', '#991b1b'),
}

def n(g, name, label, c):
    g.node(name, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)

def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)


# ── Deep Dive 1: Cell-Based Geospatial Architecture ──
def gen_cell_architecture():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Cell-Based Geospatial Architecture  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'rider', 'Rider App\nPickup Location', 'blue')
    n(g, 'gw', 'API Gateway\n(S2 Cell Lookup)', 'gray')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'cell_a', 'Cell A Service\nDowntown\n2K drivers', 'green')
        n(s, 'cell_b', 'Cell B Service\nMidtown\n3K drivers', 'green')
        n(s, 'cell_c', 'Cell C Service\nAirport\n1K drivers', 'orange')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'redis_a', 'Redis Geo\n(Cell A)', 'pink')
        n(s, 'redis_b', 'Redis Geo\n(Cell B)', 'pink')
        n(s, 'redis_c', 'Redis Geo\n(Cell C)', 'pink')

    n(g, 'match', 'Matching\nEngine', 'purple')
    n(g, 'driver', 'Driver App\n(Dispatched)', 'blue')

    e(g, 'rider', 'gw', 'ride request', '#3b82f6')
    e(g, 'gw', 'cell_b', 'route to\ncell B', '#22c55e')
    e(g, 'gw', 'cell_a', 'cross-cell\nquery', '#22c55e', 'dashed')
    e(g, 'cell_a', 'redis_a', 'GEORADIUS', '#ec4899')
    e(g, 'cell_b', 'redis_b', 'GEORADIUS\n5km', '#ec4899')
    e(g, 'cell_c', 'redis_c', 'GEORADIUS', '#ec4899')
    e(g, 'redis_b', 'match', 'nearby\ndrivers', '#6366f1')
    e(g, 'match', 'driver', 'dispatch\ntop driver', '#3b82f6')

    g.render(os.path.join(OUT, 'deep-dive-cell-architecture'), cleanup=True)


# ── Deep Dive 2: Location Ingestion Pipeline ──
def gen_location_pipeline():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Location Update Pipeline — 10M+ GPS/sec  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'drivers', '10M Drivers\nGPS every 3s', 'blue')
    n(g, 'lb', 'Load Balancer\nhash(cellId)', 'gray')
    n(g, 'loc', 'Location Service\nValidate + Snap', 'green')
    n(g, 'redis', 'Redis Geo\nGEOADD\n(HOT PATH)', 'pink')
    n(g, 'kafka', 'Kafka\nlocation-events\n(ASYNC)', 'yellow')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'ws', 'WS Broadcaster\n→ Rider tracking', 'blue')
        n(s, 'eta', 'ETA Service\nRecalculate 30s', 'teal')
        n(s, 'analytics', 'Traffic Analytics\nSpeed/segment', 'purple')
        n(s, 'surge', 'Surge Engine\nSupply/demand', 'orange')

    e(g, 'drivers', 'lb', '3.3M/sec\navg', '#3b82f6')
    e(g, 'lb', 'loc', 'shard by\ncell', '#6b7280')
    e(g, 'loc', 'redis', 'critical\npath <5ms', '#ec4899')
    e(g, 'loc', 'kafka', 'async\npublish', '#f59e0b', 'dashed')
    e(g, 'kafka', 'ws', 'push to\nriders', '#3b82f6')
    e(g, 'kafka', 'eta', 'recalc\nETAs', '#14b8a6')
    e(g, 'kafka', 'analytics', 'aggregate', '#6366f1')
    e(g, 'kafka', 'surge', 'compute\nsurge', '#f97316')

    g.render(os.path.join(OUT, 'deep-dive-location-pipeline'), cleanup=True)


# ── Deep Dive 3: Surge Pricing Engine ──
def gen_surge_pricing():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Surge Pricing Engine  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'requests', 'Ride Requests\nper Cell', 'blue')
    n(g, 'drivers', 'Available\nDrivers/Cell', 'green')
    n(g, 'compute', 'Surge Compute\nratio × smoothing\n(every 60s)', 'yellow')
    n(g, 'cap', 'Regulatory Cap\nper City Config', 'gray')
    n(g, 'redis', 'Redis Cache\nsurge:{cellId}\nTTL 60s', 'pink')
    n(g, 'pricing', 'Pricing API\nfare × surge', 'purple')
    n(g, 'heatmap', 'Driver\nHeat Map', 'orange')
    n(g, 'rider', 'Rider App\nUpfront Price', 'blue')

    e(g, 'requests', 'compute', 'demand', '#3b82f6')
    e(g, 'drivers', 'compute', 'supply', '#22c55e')
    e(g, 'cap', 'compute', 'max limit', '#6b7280', 'dashed')
    e(g, 'compute', 'redis', 'multiplier\nper cell', '#ec4899')
    e(g, 'redis', 'pricing', 'lookup', '#6366f1')
    e(g, 'redis', 'heatmap', 'visualize', '#f97316')
    e(g, 'pricing', 'rider', 'locked\nat booking', '#3b82f6')

    g.render(os.path.join(OUT, 'deep-dive-surge-pricing'), cleanup=True)


# ── Deep Dive 4: ETA Prediction ──
def gen_eta():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  ETA Prediction — Road Graph + Live Traffic + ML  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'road', 'Road Network\nGraph (OSM)', 'gray')
    n(g, 'traffic', 'Live Traffic\nfrom Driver GPS', 'orange')
    n(g, 'history', 'Historical\nTravel Times', 'yellow')
    n(g, 'events', 'Events +\nWeather', 'teal')

    n(g, 'ch', 'Contraction\nHierarchies\n(sub-ms route)', 'green')
    n(g, 'overlay', 'Traffic\nOverlay\n(edge weights)', 'orange')
    n(g, 'ml', 'ML Model\nGBDT per city\n(weekly retrain)', 'purple')
    n(g, 'eta', 'ETA Output\n7 min ± 2\n(95% accurate)', 'blue')

    e(g, 'road', 'ch', '', '#6b7280')
    e(g, 'traffic', 'overlay', 'speed per\nsegment', '#f97316')
    e(g, 'history', 'ml', 'features', '#f59e0b')
    e(g, 'events', 'ml', 'context', '#14b8a6')
    e(g, 'ch', 'ml', 'base route', '#22c55e')
    e(g, 'overlay', 'ml', 'live adjust', '#f97316')
    e(g, 'ml', 'eta', 'prediction', '#6366f1')

    g.render(os.path.join(OUT, 'deep-dive-eta-prediction'), cleanup=True)


# ── Deep Dive 5: Matching Optimization ──
def gen_matching():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Matching — Greedy vs Batch vs Pool  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'requests', 'Ride Requests', 'blue')
    g.node('check', 'Demand > Supply?', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.6')

    n(g, 'greedy', 'Greedy Match\nNearest driver\nO(n), <50ms', 'green')
    n(g, 'batch', 'Batch Match\nHungarian Algo\nO(n³), ~100ms\n20-30% better', 'purple')
    n(g, 'pool', 'Pool (shared)\nVRP insertion\n25% detour cap', 'orange')
    n(g, 'dispatch', 'Dispatch\nto Driver\n(15s timer)', 'blue')

    e(g, 'requests', 'check', '', '#f59e0b')
    e(g, 'check', 'greedy', 'No\n(supply > demand)', '#22c55e')
    e(g, 'check', 'batch', 'Yes\n(2s batch window)', '#6366f1')
    e(g, 'check', 'pool', 'UberPool\nrequest', '#f97316')
    e(g, 'greedy', 'dispatch', '', '#22c55e')
    e(g, 'batch', 'dispatch', 'optimal\nassignment', '#6366f1')
    e(g, 'pool', 'dispatch', 'insert into\nexisting route', '#f97316')

    g.render(os.path.join(OUT, 'deep-dive-matching'), cleanup=True)


# ── Algorithm 1: S2/H3 Geometry ──
def gen_algo_s2():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  S2 / H3 Hexagonal Indexing  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'point', 'Pickup\nLocation\n(lat, lng)', 'blue')
    n(g, 'h3', 'H3 Index\nlat_lng_to_cell()\nLevel 9 (~0.1km²)', 'purple')
    n(g, 'center', 'Center Cell\n(pickup cell)', 'green')
    n(g, 'neighbors', '6 Neighbor\nCells\n(uniform dist)', 'green')
    n(g, 'redis', 'Redis\nGEORADIUS\nper cell', 'pink')
    n(g, 'drivers', 'Nearby\nDrivers\n(sorted)', 'blue')

    e(g, 'point', 'h3', 'convert', '#6366f1')
    e(g, 'h3', 'center', 'primary', '#22c55e')
    e(g, 'h3', 'neighbors', 'k_ring(1)', '#22c55e', 'dashed')
    e(g, 'center', 'redis', 'query', '#ec4899')
    e(g, 'neighbors', 'redis', 'boundary\nquery', '#ec4899', 'dashed')
    e(g, 'redis', 'drivers', 'merge +\nsort by dist', '#3b82f6')

    g.render(os.path.join(OUT, 'algo-s2-geometry'), cleanup=True)


# ── Algorithm 2: Hungarian Matching ──
def gen_algo_hungarian():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Hungarian Algorithm — Batch Matching  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'window', '2-Second\nBatch Window', 'yellow')
    n(g, 'riders', 'N Ride\nRequests', 'blue')
    n(g, 'drivers', 'M Available\nDrivers', 'green')
    n(g, 'cost', 'Cost Matrix\ncost[i][j] = ETA\nfrom driver j\nto rider i', 'purple')
    n(g, 'hungarian', 'Hungarian\nAlgorithm\nO(n³)\nMin-cost matching', 'pink')
    n(g, 'result', 'Optimal\nAssignment\n20-30% better\nthan greedy', 'green')

    e(g, 'window', 'riders', 'collect', '#3b82f6')
    e(g, 'window', 'drivers', 'snapshot', '#22c55e')
    e(g, 'riders', 'cost', '', '#3b82f6')
    e(g, 'drivers', 'cost', '', '#22c55e')
    e(g, 'cost', 'hungarian', 'solve', '#ec4899')
    e(g, 'hungarian', 'result', 'dispatch all', '#22c55e')

    g.render(os.path.join(OUT, 'algo-hungarian'), cleanup=True)


# ── Algorithm 3: Contraction Hierarchies ──
def gen_algo_ch():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Contraction Hierarchies — Sub-ms ETA Queries  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'graph', 'Road Graph\n(intersections\n= nodes)', 'gray')
    n(g, 'preprocess', 'Pre-process\nContract low-\nimportance nodes\n(hours)', 'yellow')
    n(g, 'hierarchy', 'Hierarchy\nShortcut edges\nadded', 'purple')
    n(g, 'query', 'Query\nBidirectional\nupward search', 'green')
    n(g, 'result', 'Shortest Path\n< 1ms\nvs 50ms Dijkstra', 'blue')

    e(g, 'graph', 'preprocess', 'offline', '#6b7280')
    e(g, 'preprocess', 'hierarchy', 'build\nshortcuts', '#f59e0b')
    e(g, 'hierarchy', 'query', 'at request\ntime', '#6366f1')
    e(g, 'query', 'result', 'sub-ms', '#22c55e')

    g.render(os.path.join(OUT, 'algo-contraction-hierarchies'), cleanup=True)


# ── Algorithm 4: Consistent Hashing ──
def gen_algo_consistent_hashing():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Consistent Hashing — Location Sharding  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'driver', 'Driver Location\nUpdate', 'blue')
    n(g, 'hash', 'hash(cellId)\non ring', 'purple')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'r1', 'Redis A\n(range 0-99)', 'pink')
        n(s, 'r2', 'Redis B\n(range 100-199)', 'pink')
        n(s, 'r3', 'Redis C\n(range 200-299)', 'pink')

    n(g, 'vnodes', 'Virtual Nodes\n150-200 per server\n→ even distribution', 'yellow')
    n(g, 'scale', 'Add Redis D\nonly 1/N keys\nre-map (25%)', 'green')

    e(g, 'driver', 'hash', 'cellId', '#3b82f6')
    e(g, 'hash', 'r1', 'cell=42', '#ec4899')
    e(g, 'hash', 'r2', 'cell=150', '#ec4899')
    e(g, 'hash', 'r3', 'cell=250', '#ec4899')
    e(g, 'hash', 'vnodes', 'uses', '#f59e0b', 'dashed')
    e(g, 'vnodes', 'scale', 'minimal\nremapping', '#22c55e', 'dashed')

    g.render(os.path.join(OUT, 'algo-consistent-hashing'), cleanup=True)


# ── Discussion 1: ETA Calculation ──
def gen_discuss_eta():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  ETA Calculation — Multi-Source Prediction  ', labelloc='t',
           fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'road', 'Road Graph', 'gray')
    n(g, 'gps', 'Driver Fleet\nGPS Speed', 'orange')
    n(g, 'hist', 'Historical\nPatterns', 'yellow')
    n(g, 'ml', 'GBDT Model\n(per city)', 'purple')
    n(g, 'eta', 'ETA: 7 min\n±2 min (95%)', 'green')

    e(g, 'road', 'ml', 'base route', '#6b7280')
    e(g, 'gps', 'ml', 'live traffic', '#f97316')
    e(g, 'hist', 'ml', 'time/day\npatterns', '#f59e0b')
    e(g, 'ml', 'eta', 'prediction', '#22c55e')

    g.render(os.path.join(OUT, 'discuss-eta-calculation'), cleanup=True)


# ── Discussion 2: Surge Pricing ──
def gen_discuss_surge():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Surge Pricing — Supply/Demand per Cell  ', labelloc='t',
           fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'demand', 'Ride Requests\n(per cell)', 'blue')
    n(g, 'supply', 'Available\nDrivers', 'green')
    n(g, 'compute', 'surge = demand\n÷ supply\n× smoothing', 'yellow')
    n(g, 'redis', 'Redis\nTTL 60s', 'pink')
    n(g, 'price', 'Upfront\nPrice\n(locked)', 'purple')

    e(g, 'demand', 'compute', '', '#3b82f6')
    e(g, 'supply', 'compute', '', '#22c55e')
    e(g, 'compute', 'redis', 'per cell', '#ec4899')
    e(g, 'redis', 'price', 'fare × surge', '#6366f1')

    g.render(os.path.join(OUT, 'discuss-surge-pricing'), cleanup=True)


# ── Discussion 3: Dispatch ──
def gen_discuss_dispatch():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='TB', label='  Dispatch Optimization — Mode Selection  ', labelloc='t',
           fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'req', 'Ride Request', 'blue')
    g.node('check', 'Demand\nvs Supply?', shape='diamond', style='filled',
           fillcolor='#fef3c7', color='#f59e0b', fontcolor='#92400e',
           fontname='Helvetica Neue', fontsize='11', height='0.6')
    n(g, 'greedy', 'Greedy\nNearest O(n)\n<50ms', 'green')
    n(g, 'batch', 'Hungarian\nO(n³) ~100ms\n20-30% better', 'purple')
    n(g, 'pool', 'VRP Insert\n25% detour\n+60% rev', 'orange')

    e(g, 'req', 'check', '', '#f59e0b')
    e(g, 'check', 'greedy', 'supply >\ndemand', '#22c55e')
    e(g, 'check', 'batch', 'demand >\nsupply', '#6366f1')
    e(g, 'check', 'pool', 'UberPool', '#f97316')

    g.render(os.path.join(OUT, 'discuss-dispatch'), cleanup=True)


# ── Discussion 4: Safety ──
def gen_discuss_safety():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Safety & Compliance System  ', labelloc='t',
           fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'trip', 'Active\nTrip', 'blue')
    n(g, 'share', 'Trip Sharing\nLive URL', 'green')
    n(g, 'sos', 'Emergency\nGPS + Audio', 'red')
    n(g, 'route', 'Route\nDeviation\nAlert', 'orange')
    n(g, 'pin', 'PIN Verify\n4-digit code', 'teal')
    n(g, 'ridecheck', 'RideCheck\n5min stop\nauto-check', 'yellow')
    n(g, 'config', 'City Config\nSurge caps\nGeofences\nTax rules', 'gray')

    e(g, 'trip', 'share', '', '#22c55e')
    e(g, 'trip', 'sos', '', '#ef4444')
    e(g, 'trip', 'route', 'monitor', '#f97316')
    e(g, 'trip', 'pin', 'start', '#14b8a6')
    e(g, 'trip', 'ridecheck', 'monitor', '#f59e0b')
    e(g, 'config', 'trip', 'per-city\nrules', '#6b7280', 'dashed')

    g.render(os.path.join(OUT, 'discuss-safety'), cleanup=True)


# ── Flowchart: Ride Request Flow ──
def gen_flow_ride_request():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Ride Request Flow — End to End  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'rider', 'Rider App\nSend Pickup\n+ Dropoff', 'blue')
    n(g, 'gw', 'API Gateway\nAuth + Rate Limit', 'gray')
    n(g, 'cell', 'Cell Router\nS2 Lookup', 'purple')
    n(g, 'match', 'Matching\nEngine', 'green')
    n(g, 'redis', 'Redis Geo\nGEORADIUS\n5km', 'pink')
    n(g, 'push', 'Push Notify\n15s Timer', 'orange')
    n(g, 'driver', 'Driver App\nAccept/Decline', 'blue')
    n(g, 'ws', 'WebSocket\nTracking', 'teal')

    e(g, 'rider', 'gw', 'request', '#3b82f6')
    e(g, 'gw', 'cell', 'route', '#6b7280')
    e(g, 'cell', 'match', 'cell B', '#6366f1')
    e(g, 'match', 'redis', 'find nearby', '#ec4899')
    e(g, 'redis', 'match', 'drivers[]', '#ec4899', 'dashed')
    e(g, 'match', 'push', 'top driver', '#f97316')
    e(g, 'push', 'driver', 'ride offer', '#f97316')
    e(g, 'driver', 'ws', 'accept\n→ MATCHED', '#14b8a6')
    e(g, 'ws', 'rider', 'live\ntracking', '#3b82f6', 'dashed')

    g.render(os.path.join(OUT, 'flow-ride-request'), cleanup=True)


# ── Flowchart: Location Update Pipeline ──
def gen_flow_location():
    g = graphviz.Digraph(format='png')
    g.attr(**COMMON, rankdir='LR', label='  Driver Location Update Pipeline  ', labelloc='t',
           fontsize='14', fontname='Helvetica Neue Bold', fontcolor='#1e293b')

    n(g, 'driver', 'Driver GPS\nevery 3-4s', 'blue')
    n(g, 'lb', 'Load Balancer\nhash(cellId)', 'gray')
    n(g, 'loc', 'Location Svc\nValidate\nSnap-to-road', 'green')
    n(g, 'redis', 'Redis GEOADD\n(hot path)\n<5ms p99', 'pink')
    n(g, 'kafka', 'Kafka\n(async)', 'yellow')
    n(g, 'consumers', 'WS / ETA /\nAnalytics /\nSurge', 'purple')

    e(g, 'driver', 'lb', '3.3M/s\navg', '#3b82f6')
    e(g, 'lb', 'loc', 'shard', '#6b7280')
    e(g, 'loc', 'redis', 'critical\npath', '#ec4899')
    e(g, 'loc', 'kafka', 'publish', '#f59e0b', 'dashed')
    e(g, 'kafka', 'consumers', 'fan out', '#6366f1')

    g.render(os.path.join(OUT, 'flow-location-update'), cleanup=True)


if __name__ == '__main__':
    print('Generating Uber diagrams...')
    gen_cell_architecture()
    print('  ✓ deep-dive-cell-architecture.png')
    gen_location_pipeline()
    print('  ✓ deep-dive-location-pipeline.png')
    gen_surge_pricing()
    print('  ✓ deep-dive-surge-pricing.png')
    gen_eta()
    print('  ✓ deep-dive-eta-prediction.png')
    gen_matching()
    print('  ✓ deep-dive-matching.png')
    gen_algo_s2()
    print('  ✓ algo-s2-geometry.png')
    gen_algo_hungarian()
    print('  ✓ algo-hungarian.png')
    gen_algo_ch()
    print('  ✓ algo-contraction-hierarchies.png')
    gen_algo_consistent_hashing()
    print('  ✓ algo-consistent-hashing.png')
    gen_discuss_eta()
    print('  ✓ discuss-eta-calculation.png')
    gen_discuss_surge()
    print('  ✓ discuss-surge-pricing.png')
    gen_discuss_dispatch()
    print('  ✓ discuss-dispatch.png')
    gen_discuss_safety()
    print('  ✓ discuss-safety.png')
    gen_flow_ride_request()
    print('  ✓ flow-ride-request.png')
    gen_flow_location()
    print('  ✓ flow-location-update.png')
    print('Done! All Uber diagrams generated.')
