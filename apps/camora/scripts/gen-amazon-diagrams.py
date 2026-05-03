#!/usr/bin/env python3
"""
Generate research-informed diagrams for Amazon E-commerce topic.
Based on AWS Prime Day metrics, DesignGurus, and engineering blogs.
"""
import graphviz, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'amazon')
os.makedirs(OUT, exist_ok=True)

NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='11',
            penwidth='1.5', height='0.5', margin='0.15,0.1')
EDGE = dict(fontname='Helvetica Neue', fontsize='10', penwidth='1.5')
C = {
    'client':  ('#dbeafe', '#3b82f6', '#1e40af'),
    'service': ('#dcfce7', '#22c55e', '#166534'),
    'queue':   ('#fef3c7', '#f59e0b', '#92400e'),
    'db':      ('#e0e7ff', '#6366f1', '#3730a3'),
    'cache':   ('#fce7f3', '#ec4899', '#9d174d'),
    'process': ('#ffedd5', '#f97316', '#9a3412'),
    'output':  ('#ccfbf1', '#14b8a6', '#115e59'),
    'alert':   ('#fee2e2', '#ef4444', '#991b1b'),
    'gray':    ('#f3f4f6', '#6b7280', '#374151'),
}
def n(g, name, label, ck):
    fill, border, font = C[ck]
    g.node(name, label, fillcolor=fill, color=border, fontcolor=font, **NODE)
def e(g, a, b, label='', color='#475569', style='solid'):
    g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor=color, style=style, **EDGE)
def mk(title, direction='LR'):
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.5', nodesep='0.7', ranksep='0.8',
           splines='spline', rankdir=direction,
           label=f'  {title}  ', labelloc='t',
           fontsize='15', fontname='Helvetica Neue Bold', fontcolor='#1e293b')
    return g

# ═══════════════════════════════════════════════════════════════════
# 1. CHECKOUT + INVENTORY RESERVATION FLOW
# ═══════════════════════════════════════════════════════════════════
def checkout_flow():
    g = mk('Checkout Flow with Inventory Reservation')
    n(g, 'user', 'Customer\nclicks Checkout', 'client')
    n(g, 'order', 'Order Service\ncreate order\nstatus=CREATED\n(15-min TTL)', 'service')
    n(g, 'inv', 'Inventory Service\nRESERVE stock\n(optimistic lock)\navail→reserved', 'db')
    n(g, 'pay', 'Payment Service\n(idempotency key)\nStripe authorize\n+ capture', 'process')
    n(g, 'confirm', 'Order Confirmed\nstatus=PLACED\nreserved→committed', 'output')
    n(g, 'kafka', 'Kafka\n(OrderPlaced\nevent)', 'queue')
    n(g, 'notify', 'Notification\nService\n(email + push)', 'output')
    n(g, 'expire', 'TTL Expiry\n(15 min)\nrelease stock\nstatus=EXPIRED', 'alert')
    n(g, 'fail', 'Payment Failed\nrelease stock\nstatus=CANCELLED', 'alert')

    e(g, 'user', 'order', '① create\norder', '#3b82f6')
    e(g, 'order', 'inv', '② reserve\ninventory', '#6366f1')
    e(g, 'inv', 'pay', '③ process\npayment', '#f97316')
    e(g, 'pay', 'confirm', '④ success\ncommit stock', '#14b8a6')
    e(g, 'confirm', 'kafka', '⑤ publish\nevent', '#f59e0b')
    e(g, 'kafka', 'notify', '⑥ async\nnotify', '#14b8a6')
    e(g, 'pay', 'fail', 'auth fails', '#ef4444', 'dashed')
    e(g, 'order', 'expire', 'timeout\n(no payment)', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'flow-checkout'), cleanup=True)

# ═══════════════════════════════════════════════════════════════════
# 2. ORDER FULFILLMENT + WAREHOUSE ROUTING
# ═══════════════════════════════════════════════════════════════════
def fulfillment_flow():
    g = mk('Order Fulfillment & Warehouse Routing', 'TB')
    n(g, 'order', 'OrderPlaced\nEvent\n(Kafka)', 'queue')
    n(g, 'route', 'Routing Algorithm\n① inventory check\n② proximity\n③ carrier capacity\n④ delivery promise', 'process')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'wh1', 'Warehouse A\n(Seattle FC)\n1-day delivery', 'service')
        n(s, 'wh2', 'Warehouse B\n(Portland FC)\n2-day delivery', 'service')
        n(s, 'wh3', 'Warehouse C\n(Phoenix FC)\n3-day delivery', 'service')

    n(g, 'wms', 'Warehouse Mgmt\nSystem (WMS)\npick → pack → ship\nchaotic storage', 'db')
    n(g, 'carrier', 'Carrier API\n(UPS/FedEx)\ntracking number', 'gray')
    n(g, 'deliver', 'Customer\nDelivery\n(status updates)', 'client')

    e(g, 'order', 'route', '① select\nwarehouse', '#f97316')
    e(g, 'route', 'wh1', 'nearest +\nin stock', '#22c55e')
    e(g, 'route', 'wh2', 'fallback', '#f59e0b', 'dashed')
    e(g, 'route', 'wh3', 'last\nresort', '#f59e0b', 'dashed')
    e(g, 'wh1', 'wms', '② pick\n+ pack', '#6366f1')
    e(g, 'wms', 'carrier', '③ hand off\nto carrier', '#6b7280')
    e(g, 'carrier', 'deliver', '④ last mile\ndelivery', '#3b82f6')
    g.render(os.path.join(OUT, 'flow-fulfillment'), cleanup=True)

# ═══════════════════════════════════════════════════════════════════
# 3. DEEP DIVE: Inventory Reservation (Overselling Prevention)
# ═══════════════════════════════════════════════════════════════════
def dd_inventory():
    g = mk('Inventory Reservation — Preventing Overselling', 'TB')

    n(g, 'stock', 'Product Stock\navailable: 5\nreserved: 0\ncommitted: 0', 'client')

    with g.subgraph(name='cluster_alice') as s:
        s.attr(label='  Alice checks out  ', style='filled,rounded',
               color='#22c55e', fillcolor='#f0fdf4', fontname='Helvetica Neue Bold',
               fontsize='11', fontcolor='#166534')
        n(s, 'a_reserve', 'RESERVE 2 units\navailable: 5→3\nreserved: 0→2\n(version 1→2)', 'service')
        n(s, 'a_pay', 'Payment OK\nreserved→committed\navailable: 3\ncommitted: 2', 'output')

    with g.subgraph(name='cluster_bob') as s:
        s.attr(label='  Bob checks out  ', style='filled,rounded',
               color='#3b82f6', fillcolor='#eff6ff', fontname='Helvetica Neue Bold',
               fontsize='11', fontcolor='#1e40af')
        n(s, 'b_reserve', 'RESERVE 4 units\navailable: 3\n3 < 4 → FAIL\n"Only 3 left"', 'alert')

    n(g, 'expire', 'TTL Callback\n(15 min)\nif Alice abandons:\nreserved→available', 'alert')

    e(g, 'stock', 'a_reserve', '① Alice\nreserves 2', '#22c55e')
    e(g, 'a_reserve', 'a_pay', '② pays\nsuccessfully', '#14b8a6')
    e(g, 'stock', 'b_reserve', '③ Bob tries\n4 units', '#ef4444')
    e(g, 'a_reserve', 'expire', 'if abandoned', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-inventory'), cleanup=True)

# ═══════════════════════════════════════════════════════════════════
# 4. DEEP DIVE: Order State Machine
# ═══════════════════════════════════════════════════════════════════
def dd_order_states():
    g = mk('Order State Machine', 'TB')
    g.attr(nodesep='0.5', ranksep='0.6')

    n(g, 'created', 'CREATED\n(TTL: 15 min)', 'gray')
    n(g, 'reserved', 'RESERVED\n(stock held)', 'service')
    n(g, 'placed', 'PLACED\n(payment OK)', 'output')
    n(g, 'confirmed', 'CONFIRMED\n(warehouse\nassigned)', 'output')
    n(g, 'processing', 'PROCESSING\n(picking\nstarted)', 'process')
    n(g, 'shipped', 'SHIPPED\n(carrier has\npackage)', 'process')
    n(g, 'delivered', 'DELIVERED\n(confirmed\narrival)', 'client')
    n(g, 'expired', 'EXPIRED\n(timeout)', 'alert')
    n(g, 'cancelled', 'CANCELLED\n(payment fail)', 'alert')
    n(g, 'returned', 'RETURNED\n(refund\ninitiated)', 'alert')

    e(g, 'created', 'reserved', 'inventory\nreserved', '#22c55e')
    e(g, 'created', 'expired', 'TTL\nexpires', '#ef4444', 'dashed')
    e(g, 'reserved', 'placed', 'payment\nsuccess', '#14b8a6')
    e(g, 'reserved', 'cancelled', 'payment\nfails', '#ef4444', 'dashed')
    e(g, 'placed', 'confirmed', 'warehouse\nassigned', '#22c55e')
    e(g, 'confirmed', 'processing', 'picking\nstarted', '#f97316')
    e(g, 'processing', 'shipped', 'carrier\nhandoff', '#f97316')
    e(g, 'shipped', 'delivered', 'delivery\nconfirmed', '#3b82f6')
    e(g, 'delivered', 'returned', 'return\ninitiated', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'deep-dive-order-states'), cleanup=True)

# ═══════════════════════════════════════════════════════════════════
# 5. DISCUSSION: Search Architecture
# ═══════════════════════════════════════════════════════════════════
def disc_search():
    g = mk('Product Search Architecture')
    n(g, 'query', 'Search Query\n"wireless\nheadphones"', 'client')
    n(g, 'es', 'Elasticsearch\n(350M+ products)\nBM25 + boosting\nfaceted filters', 'db')
    n(g, 'rank', 'ML Ranking\n(sales velocity,\nrating, reviews,\npersonalization)', 'process')
    n(g, 'inv', 'Inventory\nService\n(availability\ncheck)', 'service')
    n(g, 'cdn', 'CloudFront\n(product images\nfrom S3)', 'gray')
    n(g, 'results', 'Ranked Results\n+ facets\n+ sponsored', 'output')

    e(g, 'query', 'es', '① full-text\n+ filters', '#6366f1')
    e(g, 'es', 'rank', '② candidates\n~500', '#f97316')
    e(g, 'rank', 'inv', '③ check\nstock', '#22c55e')
    e(g, 'inv', 'results', '④ in-stock\nranked', '#14b8a6')
    e(g, 'cdn', 'results', 'images', '#6b7280', 'dashed')
    g.render(os.path.join(OUT, 'discuss-search'), cleanup=True)

# ═══════════════════════════════════════════════════════════════════
# 6. DISCUSSION: Payment Idempotency
# ═══════════════════════════════════════════════════════════════════
def disc_payment():
    g = mk('Payment Idempotency Pattern')
    n(g, 'client', 'Client Request\n(order_id +\nidempotency_key)', 'client')
    n(g, 'check', 'Idempotency\nLookup\n(payments table)', 'db')
    n(g, 'cached', 'Return Cached\nResponse\n(no double charge)', 'output')
    n(g, 'gateway', 'Payment Gateway\n(Stripe)\nauthorize + capture', 'process')
    n(g, 'store', 'Store Result\n(key → response)\nfor future lookups', 'db')
    n(g, 'saga', 'Saga Rollback\n(if payment fails\nafter inventory\ncommitted)', 'alert')

    e(g, 'client', 'check', '① check\nidempotency', '#6366f1')
    e(g, 'check', 'cached', 'key exists\n→ return', '#14b8a6')
    e(g, 'check', 'gateway', 'new key\n→ process', '#f97316')
    e(g, 'gateway', 'store', '② store\nresult', '#6366f1')
    e(g, 'gateway', 'saga', 'failure after\ncommit', '#ef4444', 'dashed')
    g.render(os.path.join(OUT, 'discuss-payment'), cleanup=True)

# ═══════════════════════════════════════════════════════════════════
# 7. DISCUSSION: Dynamic Pricing
# ═══════════════════════════════════════════════════════════════════
def disc_pricing():
    g = mk('Dynamic Pricing & Deals Engine')
    n(g, 'base', 'Seller\nBase Price', 'client')
    n(g, 'demand', 'Demand Signal\n(search volume,\ncart additions)', 'queue')
    n(g, 'comp', 'Competitor\nPrices\n(market data)', 'gray')
    n(g, 'engine', 'Pricing Engine\n(ML model)\noptimal price\npoint', 'process')
    n(g, 'deal', 'Deals Layer\n(coupons, Prime\ndiscounts, flash)', 'service')
    n(g, 'display', 'Display Price\n(strikethrough\n+ deal badge)', 'output')

    e(g, 'base', 'engine', 'floor\nprice', '#3b82f6')
    e(g, 'demand', 'engine', 'demand\nsignal', '#f59e0b')
    e(g, 'comp', 'engine', 'market\ndata', '#6b7280')
    e(g, 'engine', 'deal', 'optimal\nprice', '#f97316')
    e(g, 'deal', 'display', 'final\nprice', '#14b8a6')
    g.render(os.path.join(OUT, 'discuss-pricing'), cleanup=True)

# ═══════════════════════════════════════════════════════════════════
# 8. DISCUSSION: Warehouse Routing
# ═══════════════════════════════════════════════════════════════════
def disc_warehouse():
    g = mk('Multi-Warehouse Routing Algorithm')
    n(g, 'order', 'New Order\n(items + address)', 'client')
    n(g, 'check', 'Check Stock\n(all warehouses)', 'service')
    n(g, 'score', 'Score Each\nWarehouse\n(proximity ×\nstock × capacity)', 'process')
    n(g, 'split', 'Split Decision\n(multi-item orders\nmay ship from\nmultiple FCs)', 'process')
    n(g, 'fc1', 'Nearest FC\n(1-day ship)', 'output')
    n(g, 'fc2', 'Backup FC\n(2-day ship)', 'output')

    e(g, 'order', 'check', '① inventory\nquery', '#22c55e')
    e(g, 'check', 'score', '② rank\nwarehouses', '#f97316')
    e(g, 'score', 'split', '③ split if\nneeded', '#6366f1')
    e(g, 'split', 'fc1', 'item A', '#14b8a6')
    e(g, 'split', 'fc2', 'item B', '#14b8a6')
    g.render(os.path.join(OUT, 'discuss-warehouse'), cleanup=True)

if __name__ == '__main__':
    fns = [checkout_flow, fulfillment_flow, dd_inventory, dd_order_states,
           disc_search, disc_payment, disc_pricing, disc_warehouse]
    for fn in fns:
        fn(); print(f'OK: {fn.__name__}')
    print(f'\nGenerated {len(fns)} Amazon diagrams')
