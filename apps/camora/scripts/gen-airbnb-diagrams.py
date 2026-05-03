#!/usr/bin/env python3
"""
Generate research-informed diagrams for Airbnb system design topic.
Based on Airbnb Engineering blog posts, ByteByteGo, and KDD papers.
"""
import graphviz, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams', 'airbnb')
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
# 1. SEARCH PIPELINE (proper architecture diagram)
# ═══════════════════════════════════════════════════════════════════
def search_flow():
    g = mk('Airbnb Search Pipeline')
    n(g, 'guest', 'Guest\n"SF, May 1-5\n2 guests"', 'client')
    n(g, 'api', 'API Gateway\n(rate limit\n60 req/min)', 'gray')
    n(g, 'geo', 'Geocoding\nService\n(→ lat/lng)', 'service')
    n(g, 'es', 'Elasticsearch\n(8M listings)\ngeo_distance +\nattribute filters', 'db')
    n(g, 'avail', 'Availability\nService\n(PostgreSQL)\n2.9B calendar rows', 'db')
    n(g, 'rank', 'ML Ranking\n(DNN model)\nquality + price +\npersonalization', 'process')
    n(g, 'results', 'Top 20 Results\n+ map markers\n< 500ms total', 'output')
    n(g, 'cache', 'Redis Cache\n(geo, avail,\nlisting metadata)', 'cache')

    e(g, 'guest', 'api', '① search\nrequest', '#3b82f6')
    e(g, 'api', 'geo', '② geocode\nlocation', '#22c55e')
    e(g, 'geo', 'es', '③ geo query\n~1000 candidates', '#6366f1')
    e(g, 'es', 'avail', '④ check\navailability\n(batch query)', '#6366f1')
    e(g, 'avail', 'rank', '⑤ ~300-500\navailable', '#f97316')
    e(g, 'rank', 'results', '⑥ ranked\ntop 20', '#14b8a6')
    e(g, 'cache', 'geo', 'cached\ncoords', '#ec4899', 'dashed')
    e(g, 'cache', 'avail', 'hot listing\ncache', '#ec4899', 'dashed')

    g.render(os.path.join(OUT, 'flow-search-pipeline'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 2. BOOKING FLOW (with double-booking prevention)
# ═══════════════════════════════════════════════════════════════════
def booking_flow():
    g = mk('Airbnb Booking Flow (Optimistic Locking)', 'TB')
    n(g, 'guest', 'Guest clicks\n"Reserve"', 'client')
    n(g, 'idemp', 'Idempotency\nCheck\n(prevent dupes)', 'gray')
    n(g, 'hold', 'Soft Hold\n(10-min TTL)\nSELECT FOR UPDATE\nstatus→HELD', 'service')
    n(g, 'stripe', 'Stripe\nAuthorization\n(hold on card)', 'process')
    n(g, 'confirm', 'Optimistic Lock\nConfirm\nversion check +\nstatus→BOOKED', 'service')
    n(g, 'notify', 'Notifications\n(Kafka async)\nemail + push\nto host & guest', 'queue')
    n(g, 'capture', 'Payment Capture\n(T-24h before\ncheck-in)', 'process')
    n(g, 'payout', 'Host Payout\n(T+24h after\ncheck-in)', 'output')
    n(g, 'fail', 'Hold Expired\nor Payment Failed\n→ release dates', 'alert')

    e(g, 'guest', 'idemp', '① reserve\n(UUID key)', '#3b82f6')
    e(g, 'idemp', 'hold', '② soft hold\n(DB transaction)', '#22c55e')
    e(g, 'hold', 'stripe', '③ authorize\npayment', '#f97316')
    e(g, 'stripe', 'confirm', '④ confirm\nbooking', '#22c55e')
    e(g, 'confirm', 'notify', '⑤ async\nnotify', '#f59e0b')
    e(g, 'confirm', 'capture', '⑥ scheduled\ncapture', '#f97316', 'dashed')
    e(g, 'capture', 'payout', '⑦ host\npaid', '#14b8a6')
    e(g, 'stripe', 'fail', 'auth fails', '#ef4444', 'dashed')
    e(g, 'hold', 'fail', 'timeout\n(10 min)', '#ef4444', 'dashed')

    g.render(os.path.join(OUT, 'flow-booking'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 3. DEEP DIVE: Geospatial Search
# ═══════════════════════════════════════════════════════════════════
def dd_geospatial():
    g = mk('Geospatial Search Architecture', 'LR')
    n(g, 'query', 'Location Query\n"San Francisco\nMarina District"', 'client')
    n(g, 'geocode', 'Geocoding\n(Google Maps API)\n→ lat: 37.80\n→ lng: -122.44', 'service')
    n(g, 'bkd', 'Elasticsearch\nBKD Tree Index\n(geo_point field)\nO(log n) lookup', 'db')
    n(g, 'filter', 'Combined Filter\ngeo_distance 25km\n+ amenities\n+ price range\n+ guest count', 'process')
    n(g, 'candidates', '~1,000\nCandidates\n(50ms)', 'output')
    n(g, 'map', 'Map View:\ngeohash_grid\naggregation\n(cluster markers)', 'output')

    e(g, 'query', 'geocode', '① convert\nto coords', '#22c55e')
    e(g, 'geocode', 'bkd', '② spatial\nlookup', '#6366f1')
    e(g, 'bkd', 'filter', '③ combine\nwith attributes', '#f97316')
    e(g, 'filter', 'candidates', '④ return\nmatches', '#14b8a6')
    e(g, 'bkd', 'map', '⑤ grid\naggregation', '#3b82f6', 'dashed')

    g.render(os.path.join(OUT, 'deep-dive-geospatial'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 4. DEEP DIVE: Double-Booking Prevention
# ═══════════════════════════════════════════════════════════════════
def dd_double_booking():
    g = mk('Double-Booking Prevention (Optimistic Locking)', 'TB')

    with g.subgraph(name='cluster_alice') as s:
        s.attr(label='  Alice (T=0ms)  ', style='filled,rounded',
               color='#22c55e', fillcolor='#f0fdf4', fontname='Helvetica Neue Bold',
               fontsize='11', fontcolor='#166534')
        n(s, 'a_hold', 'Soft Hold\nstatus→HELD\nversion 1→2', 'service')
        n(s, 'a_pay', 'Stripe Auth\n(success)', 'process')
        n(s, 'a_book', 'Confirm\nstatus→BOOKED\n✓ SUCCESS', 'output')

    with g.subgraph(name='cluster_bob') as s:
        s.attr(label='  Bob (T=50ms)  ', style='filled,rounded',
               color='#ef4444', fillcolor='#fef2f2', fontname='Helvetica Neue Bold',
               fontsize='11', fontcolor='#991b1b')
        n(s, 'b_hold', 'Soft Hold\nattempt fails\nversion≠1', 'alert')
        n(s, 'b_msg', '"Dates no longer\navailable"\n✗ REJECTED', 'alert')

    n(g, 'listing', 'Listing #42\nMay 1-3\n(status: AVAILABLE\nversion: 1)', 'client')

    e(g, 'listing', 'a_hold', '① Alice\nreserves first', '#22c55e')
    e(g, 'a_hold', 'a_pay', '② payment', '#f97316')
    e(g, 'a_pay', 'a_book', '③ confirmed', '#14b8a6')
    e(g, 'listing', 'b_hold', '④ Bob tries\n50ms later', '#ef4444')
    e(g, 'b_hold', 'b_msg', 'version\nmismatch', '#ef4444')

    g.render(os.path.join(OUT, 'deep-dive-double-booking'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 5. DEEP DIVE: Review & Trust System
# ═══════════════════════════════════════════════════════════════════
def dd_reviews():
    g = mk('Dual-Blind Review & Trust System', 'TB')
    n(g, 'checkout', 'Stay\nCompleted', 'client')
    n(g, 'window', 'Review Window\nOpens\n(14-day deadline)', 'queue')

    with g.subgraph() as s:
        s.attr(rank='same')
        n(s, 'guest_rev', 'Guest Review\n(6 categories\n+ text)', 'service')
        n(s, 'host_rev', 'Host Review\n(3 categories\n+ text)', 'service')

    n(g, 'reveal', 'Simultaneous\nReveal\n(both submit OR\n14 days expire)', 'process')
    n(g, 'fraud', 'NLP Fraud\nDetection\n(fake review\npatterns)', 'alert')
    n(g, 'trust', 'Trust Score\nEngine\n(Bayesian avg,\nSuperhost check)', 'output')

    e(g, 'checkout', 'window', '① trigger', '#f59e0b')
    e(g, 'window', 'guest_rev', '② invite\nguest', '#22c55e')
    e(g, 'window', 'host_rev', '② invite\nhost', '#22c55e')
    e(g, 'guest_rev', 'reveal', '③ submit\n(blind)', '#6366f1')
    e(g, 'host_rev', 'reveal', '③ submit\n(blind)', '#6366f1')
    e(g, 'reveal', 'fraud', '④ ML\nscan', '#ef4444')
    e(g, 'fraud', 'trust', '⑤ update\nscores', '#14b8a6')

    g.render(os.path.join(OUT, 'deep-dive-reviews'), cleanup=True)


# ═══════════════════════════════════════════════════════════════════
# 6. DEEP DIVE: Dynamic Pricing Engine
# ═══════════════════════════════════════════════════════════════════
def dd_pricing():
    g = mk('Smart Pricing Engine (ML-Driven)', 'LR')

    # Input signals
    n(g, 'demand', 'Search Demand\n(volume per\narea per date)', 'client')
    n(g, 'events', 'Local Events\n(concerts, sports,\nconferences)', 'queue')
    n(g, 'season', 'Seasonality\n(ARIMA time\nseries)', 'service')
    n(g, 'comp', 'Competitor\nPrices\n(similar listings)', 'gray')

    # ML
    n(g, 'features', 'Feature Store\n(720M listing-date\ncombinations)', 'db')
    n(g, 'model', 'GBM Model\n(gradient boosting)\ndemand elasticity\n~73% accuracy', 'process')
    n(g, 'price', 'Suggested Price\nbase × demand ×\nseason × day_of_week\n(0.8x to 3.0x)', 'output')
    n(g, 'cache', 'Price Cache\n(Redis)\nTTL: 24h', 'cache')

    e(g, 'demand', 'features', 'demand\nsignals', '#3b82f6')
    e(g, 'events', 'features', 'event\ncalendar', '#f59e0b')
    e(g, 'season', 'features', 'patterns', '#22c55e')
    e(g, 'comp', 'features', 'market\nprices', '#6b7280')
    e(g, 'features', 'model', 'daily\nbatch job', '#f97316')
    e(g, 'model', 'price', 'predict\noptimal price', '#14b8a6')
    e(g, 'price', 'cache', 'cache\nresult', '#ec4899')

    g.render(os.path.join(OUT, 'deep-dive-pricing'), cleanup=True)


if __name__ == '__main__':
    fns = [search_flow, booking_flow, dd_geospatial, dd_double_booking, dd_reviews, dd_pricing]
    for fn in fns:
        fn()
        print(f'OK: {fn.__name__}')
    print(f'\nGenerated {len(fns)} Airbnb diagrams')
