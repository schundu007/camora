// AI Solutions to Classic System Design Problems + Domain AI Chatbots

export const aiSolvesProblemCategories = [
  { id: 'ai-solutions', name: 'AI Solutions to Classic Problems', icon: 'zap', color: '#f59e0b' },
  { id: 'ai-chatbots', name: 'Domain AI Chatbots', icon: 'messageSquare', color: '#3b82f6' },
];

export const aiSolvesProblemCategoryMap = {
  'ai-scalper-detection': 'ai-solutions',
  'ai-dynamic-pricing': 'ai-solutions',
  'ai-driver-matching': 'ai-solutions',
  'ai-surge-pricing': 'ai-solutions',
  'ai-cold-start-recommendation': 'ai-solutions',
  'ai-social-bot-detection': 'ai-solutions',
  'ai-click-fraud-detection': 'ai-solutions',
  'ai-delivery-eta': 'ai-solutions',
  'ai-smart-pricing-rentals': 'ai-solutions',
  'ai-job-matching': 'ai-solutions',
  'ai-ecommerce-search-ranking': 'ai-solutions',
  'ai-airline-booking-chatbot': 'ai-chatbots',
  'ai-banking-chatbot': 'ai-chatbots',
  'ai-healthcare-chatbot': 'ai-chatbots',
};

export const aiSolvesDesigns = [

  // ─── 1. AI Bot & Scalper Detection ──────────────────────────────────────────
  {
    id: 'ai-scalper-detection',
    isNew: true,
    title: 'AI Bot and Scalper Detection System',
    subtitle: 'Solving the Ticketmaster Scalping Problem with ML',
    icon: 'shield',
    color: '#ef4444',
    difficulty: 'Hard',
    description: 'Design an ML-powered system that detects and blocks scalper bots in real time during high-demand ticket on-sales, using behavioral biometrics, device graphs, and purchase pattern analysis.',

    introduction: `Every major ticket on-sale — Taylor Swift, Beyonce, Super Bowl — is immediately overwhelmed by bots purchasing tickets at scale to resell at 5-10x face value. This is not a new problem: Ticketmaster, StubHub, and every major venue have fought bot armies for decades. Traditional defenses like CAPTCHA, IP rate limiting, and account age checks have all failed because bot operators run industrial-scale CAPTCHA farms and rotate IPs through residential proxy networks.

The core challenge is distinguishing a real human fan from a sophisticated bot in under 100 milliseconds, at the moment of checkout, without creating so much friction that legitimate buyers abandon the purchase. Getting this wrong in either direction costs the platform: too permissive and scalpers buy all inventory in seconds, destroying fan trust; too aggressive and false positives block real fans who never get a second chance.

What makes this solvable with ML is that bots, no matter how sophisticated, exhibit systematic behavioral patterns that differ from humans. Humans have natural variance in mouse movement speed and trajectory, they scroll and re-read event details, they hesitate on seat selection, and their interaction timing has natural jitter. Bots execute purchase flows with machine precision — straight-line mouse movements, sub-millisecond form interactions, and zero browsing time before checkout.

The modern defense stacks multiple independent signal layers: client-side behavioral biometrics, server-side velocity analysis, device and identity graphs, and purchase pattern models. Each layer alone is evadable; together they create a detection surface that is expensive for attackers to defeat simultaneously. When detection is uncertain, the system soft-blocks by inserting additional friction (queue re-entry, phone verification) rather than hard-blocking, which reduces false positives significantly.`,

    functionalRequirements: [
      'Score each checkout attempt in real time with a bot probability score',
      'Collect and analyze behavioral biometrics including mouse trajectory, keystroke timing, and scroll patterns',
      'Build and query a device fingerprint graph linking devices to account histories',
      'Apply velocity checks on IP, device, payment method, and account dimensions',
      'Trigger step-up verification (SMS, email, phone) for medium-confidence suspicious sessions',
      'Hard-block or queue-re-entry for high-confidence bot sessions',
      'Log all signals and decisions for audit and model retraining',
      'Feed confirmed scalper accounts back into the training pipeline',
    ],

    nonFunctionalRequirements: [
      'Scoring latency under 100ms at p99 to avoid slowing checkout',
      'False positive rate below 0.5% to avoid blocking legitimate fans',
      'Handle 10M concurrent sessions during major on-sales without degradation',
      'Model updates deployable within 24 hours as bots adapt',
      'Signal collection must be GDPR and CCPA compliant',
    ],

    estimation: {
      users: '10M concurrent sessions during a major on-sale event',
      storage: '50KB of behavioral signals per session * 10M sessions * 100 events/yr = ~50TB/yr of raw signal data',
      bandwidth: '~500KB per session upload of behavioral telemetry over the first 2 minutes',
      qps: '~500K scoring requests/sec at peak on-sale; behavioral telemetry ingest at 5M events/sec',
    },

    apiDesign: {
      description: 'Client-side SDK sends behavioral telemetry continuously; checkout path calls scoring API synchronously before allowing purchase.',
      endpoints: [
        { method: 'POST', path: '/api/telemetry/session', params: '{ session_id, events: [{type, timestamp, x, y, pressure, key}] }', response: '{ received: true }', description: 'Client SDK streams behavioral events in batches every 5 seconds' },
        { method: 'POST', path: '/api/bot/score', params: '{ session_id, user_id, event_id, device_fingerprint, ip }', response: '{ score: 0.0-1.0, action: "allow"|"challenge"|"block", reason_code }', description: 'Called synchronously at checkout; must respond in <100ms' },
        { method: 'POST', path: '/api/bot/feedback', params: '{ session_id, confirmed_bot: bool, source: "purchase_pattern"|"resale_detected"|"chargeback" }', response: '{ logged: true }', description: 'Post-event feedback for model retraining' },
        { method: 'GET', path: '/api/device/graph', params: 'device_fingerprint', response: '{ linked_accounts: [], risk_score, cluster_id }', description: 'Query device identity graph for a fingerprint' },
        { method: 'POST', path: '/api/account/link', params: '{ account_id, device_fingerprint, ip, payment_hash }', response: '{ edges_created: int }', description: 'Update identity graph with new session associations' },
      ],
    },

    dataModel: {
      description: 'Sessions store behavioral telemetry; a graph structure links devices, accounts, IPs, and payment methods across sessions.',
      schema: `sessions {
  id: uuid PK
  user_id: bigint nullable
  device_fingerprint: varchar(64)
  ip_address: inet
  started_at: timestamp
  checkout_at: timestamp nullable
  bot_score: float
  action_taken: enum(allow, challenge, block)
  telemetry_s3_key: varchar  -- raw behavioral stream stored in S3
  outcome: enum(purchased, abandoned, blocked, challenged)
}

behavioral_features {
  session_id: uuid FK
  feature_name: varchar(50)
  feature_value: float
  computed_at: timestamp
  -- examples: mouse_linearity_score, keystroke_variance_ms, time_on_seat_selection_s
}

identity_graph_edges {
  id: bigint PK
  from_node_type: enum(account, device, ip, payment_hash)
  from_node_id: varchar(128)
  to_node_type: enum(account, device, ip, payment_hash)
  to_node_id: varchar(128)
  first_seen: timestamp
  last_seen: timestamp
  edge_count: int
}

model_decisions {
  session_id: uuid
  model_version: varchar
  score: float
  feature_contributions: jsonb
  decided_at: timestamp
}`,
      examples: [
        { table: 'sessions', label: 'High-confidence bot session', json: '{ "id": "sess-a1b2c3d4", "user_id": null, "device_fingerprint": "fp-deadbeef", "ip_address": "104.28.17.55", "bot_score": 0.97, "action_taken": "block", "outcome": "blocked" }' },
        { table: 'behavioral_features', label: 'Bot mouse linearity feature', json: '{ "session_id": "sess-a1b2c3d4", "feature_name": "mouse_linearity_score", "feature_value": 0.998, "computed_at": "2025-06-10T20:00:01.234Z" }' },
        { table: 'identity_graph_edges', label: 'Device linked to 900 accounts', json: '{ "from_node_type": "device", "from_node_id": "fp-deadbeef", "to_node_type": "account", "to_node_id": "acct-*", "edge_count": 912, "first_seen": "2025-01-01T00:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A server-side rate limiter blocks IPs exceeding N checkout attempts per minute. CAPTCHA is shown to all users at checkout. A rule engine flags accounts created within the last 24 hours.',
      problems: [
        'CAPTCHA is solved by farms at scale for under $1 per 1000 solves — does not stop professional bot operators',
        'IP rate limiting is trivially bypassed by residential proxy networks with millions of IPs',
        'New account detection blocks legitimate fans who just created accounts for the event',
        'No behavioral analysis means bots that pace themselves slowly pass all checks',
        'Rule engine is static — bot operators study the rules and tune their bots to stay below thresholds',
        'No device graph means the same bot infrastructure is never linked across sessions',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Layer ML Detection with Behavioral Biometrics and Identity Graph',
      description: 'A client-side SDK collects raw behavioral telemetry continuously throughout the session. Server-side feature extraction computes 50+ features from the telemetry stream. A gradient-boosted tree model scores each checkout attempt in under 30ms. A separate graph neural network evaluates device and account cluster risk. The final score combines both models, with action thresholds tuned to the false positive budget.',
      keyPoints: [
        'Behavioral biometrics layer: mouse trajectory linearity (bots move in straight lines), keystroke timing variance (bots have sub-millisecond jitter), scroll depth and dwell time (bots skip content), form interaction speed (bots fill forms in under 1 second)',
        'Device fingerprint: canvas fingerprint, WebGL renderer hash, screen resolution, font list, timezone, language — combined into a stable device ID even across IP changes',
        'Identity graph (Neo4j or custom adjacency store): edges between accounts, devices, IPs, and payment hashes; high-degree device nodes (one device touching 500 accounts) flagged as bot infrastructure',
        'Velocity scoring: not just per-IP but per device, per payment instrument hash, per billing address — each dimension has its own sliding window counter in Redis',
        'Two-tier response: scores 0.7-0.9 trigger step-up challenge (SMS verification, which bots cannot cheaply complete); scores 0.9+ trigger hard block or silent queue-drop',
        'Continuous retraining: confirmed scalper accounts (identified post-event via resale marketplace detection) become negative labels; clean purchases become positive labels; model retrains daily',
        'Soft signals: purchase quantity patterns (always buying max tickets, always in front-row price tier), seat selection time (bots use Best Available API call, not interactive seat map)',
      ],
      databaseChoice: 'Redis for velocity counters and session state (sub-millisecond reads); Neo4j or custom graph store for identity graph (bulk edge queries); PostgreSQL for session records and model decisions; S3 for raw telemetry archives; ClickHouse for feature analysis and model performance dashboards',
      caching: 'Device risk scores cached in Redis for 15 minutes (device graph does not change per checkout); bot cluster flags cached at CDN edge for known bot IPs; feature vectors cached per session to avoid recomputing on step-up challenge',
    },

    tips: [
      'Lead with the limitation of CAPTCHAs early — interviewers expect you to know they have been defeated',
      'Behavioral biometrics is the highest-signal layer — explain mouse linearity and keystroke timing in detail',
      'The identity graph is what catches organized bot operations — a single device touching 1000 accounts is an obvious signal no per-session model can see',
      'Discuss the false positive tradeoff explicitly: 0.5% false positive rate on 1M real buyers = 5000 fans blocked, which is a PR disaster at a major on-sale',
      'Mention that soft-blocking (step-up challenge) is more effective than hard-blocking because it catches bots that can pass initial scoring but cannot complete phone verification',
      'Differential pricing for suspected bots is a novel approach worth mentioning: show bots real inventory but at 2x price — they may buy anyway and you capture the premium',
    ],

    keyQuestions: [
      {
        question: 'How do behavioral biometrics distinguish bots from real users?',
        answer: `The Core Insight: Human motor control has natural variance; bots execute with machine precision.

Mouse Movement:
- Humans: curved trajectories, speed varies (accelerate then decelerate), micro-corrections
- Bots: perfectly straight lines or scripted bezier curves, constant velocity
- Feature: linearity score = actual_path_length / euclidean_distance. Humans: 1.1-1.4. Bots: 1.00-1.02.

Keystroke Timing:
- Humans: 50-300ms between keystrokes, variance of 20-80ms per character pair
- Bots: <1ms between keystrokes OR suspiciously regular intervals if throttled
- Feature: coefficient of variation of inter-key intervals. Humans: 0.3-0.8. Bots: <0.05 or >2.0 (if randomized too aggressively)

Form Interaction:
- Humans: spend 30-120 seconds on seat selection, re-read details, often change mind
- Bots: call Best Available API directly, fill form in <2 seconds, never view seat map
- Feature: time_from_page_load_to_submit. Under 3 seconds = near-certain bot.

Scroll Behavior:
- Humans: scroll down to read event details, scroll back up to re-check dates
- Bots: no scroll events at all, or scripted single scroll to bottom
- Feature: scroll_event_count and scroll_direction_changes

Evasion: Sophisticated bots add artificial delays and randomized mouse movement. This is detectable because the randomness distribution doesn't match human Gaussian variance — it's uniform random, not motor-noise random.`,
      },
      {
        question: 'How do you build a device identity graph and what does it reveal?',
        answer: `Graph Structure:
\`\`\`
Nodes: accounts, devices (fingerprints), IPs, payment_hashes, billing_addresses
Edges: "used_from", "linked_to", "paid_with"

Example bot operation graph:
  Device FP-abc123  ──used_from──>  IP: 104.28.17.55
       │                                  │
       ├──linked_to──> Account_001        └──used_by──> Account_001
       ├──linked_to──> Account_002                      Account_002
       ├──linked_to──> Account_003   ...                  ...
       ...
       └──linked_to──> Account_912  (one device, 912 accounts = bot farm)
\`\`\`

What the Graph Reveals:
- A single device fingerprint touching 900+ accounts = bot infrastructure
- A single IP buying tickets for 50 different accounts in 10 minutes = rate-limited proxy
- 100 accounts all sharing the same billing address = synthetic identity farm
- Payment hash shared across 30 accounts = one person controlling many accounts

Implementation:
- On each checkout: create edges between (session_device, session_ip, account_id, payment_hash)
- Graph query at score time: how many accounts has this device touched? what is the max degree of any node in this device's 2-hop neighborhood?
- Store in Neo4j for Cypher queries, or Redis sorted sets for simple degree counting

Key Query:
\`\`\`cypher
MATCH (d:Device {fp: $fp})-[:LINKED_TO]->(a:Account)
RETURN count(a) as account_degree
\`\`\`
If account_degree > 50, flag as likely bot infrastructure regardless of other signals.`,
      },
      {
        question: 'How do you tune the bot score threshold to minimize false positives?',
        answer: `The Tradeoff:
- Lower threshold (0.5): catch more bots, but block more real fans — PR disaster at a major on-sale
- Higher threshold (0.9): miss more sophisticated bots, but almost never block real fans

Approach: Two-Tier Thresholds + Step-Up Challenge:
\`\`\`
Score 0.0 - 0.7  →  Allow (purchase proceeds)
Score 0.7 - 0.9  →  Challenge (insert SMS verification)
Score 0.9+       →  Block (or silent queue re-entry)
\`\`\`

Why Step-Up Works:
- Real fans can complete SMS verification in 30-60 seconds
- Bot operations cannot cheaply complete SMS at scale ($0.05/SMS * 100K bots = $5K)
- Step-up converts a hard decision into a soft friction gate

Calibration Process:
1. Label a random sample of 10K sessions manually (behavioral review)
2. Plot precision-recall curve for your model
3. Find the threshold where false positive rate = 0.5% (your budget)
4. For the step-up tier, find where precision > 80% (worth the friction cost)
5. Re-calibrate after every major on-sale event as bot tactics evolve

Monitoring in Production:
- Track step-up completion rate (real fans: 85%+, bots: <5%)
- Track false positive rate via customer support contacts ("I was blocked but I'm a real fan")
- A/B test threshold changes on lower-demand events before major on-sales`,
      },
    ],

    keyDecisions: [
      'Client-side telemetry vs server-side signals only — chose client-side because mouse movement and keystroke data cannot be observed from server logs, and they are the highest-signal features for bot detection',
      'Hard block vs step-up challenge — chose step-up for medium scores because phone verification is cheap for humans and expensive for bots, and it eliminates false positive risk at the cost of 30-60 seconds of friction',
      'Per-request scoring vs session-level scoring — chose session-level because individual actions have too little signal; the full 2-minute session trajectory is far more informative',
      'Graph database vs adjacency tables in PostgreSQL — chose Redis sorted sets for degree queries at scoring time and Neo4j for offline cluster analysis, because real-time graph traversal needs sub-10ms response',
      'Gradient-boosted trees vs neural network for scoring — chose GBTs because they are faster to serve (microseconds vs milliseconds), more interpretable for audit, and perform comparably on tabular behavioral features',
    ],
  },

  // ─── 2. AI Dynamic Pricing Engine ───────────────────────────────────────────
  {
    id: 'ai-dynamic-pricing',
    isNew: true,
    title: 'AI Dynamic Pricing Engine',
    subtitle: 'Solving Static Pricing with ML — Airlines, Hotels, Events',
    icon: 'zap',
    color: '#f59e0b',
    difficulty: 'Hard',
    description: 'Design an ML-powered dynamic pricing system that adjusts prices in real time based on demand forecasts, competitor prices, inventory levels, and price elasticity models to maximize revenue.',

    introduction: `Static pricing is a blunt instrument that systematically leaves money on the table. An airline seat priced at $299 might sell instantly during peak demand when customers would have paid $499, and sit empty during off-peak when $149 would have filled it. Hotels, ride-sharing platforms, event venues, and e-commerce retailers all face the same fundamental problem: the right price depends on dozens of factors that change by the minute — current inventory, competitor prices, predicted demand, remaining time to event, and customer willingness to pay.

Rule-based pricing systems (raise price 20% when occupancy exceeds 80%) can capture the most obvious patterns but fail at the long tail of signals. What about a hotel near a stadium that just announced a sold-out concert next weekend? What about flight demand spiking because a competitor cancelled routes? What about a retail item trending on social media this morning? These demand shocks are impossible to anticipate with rules but are exactly what an ML model trained on historical patterns can detect and respond to.

The core of a dynamic pricing system is a demand forecasting model that predicts how many units will sell at various price points, combined with a price elasticity estimate that tells you how sensitive demand is to price changes. Together, these let you solve the revenue-maximization problem: find the price that maximizes expected revenue given predicted demand and its price sensitivity.

The hardest challenges are not model quality but causal validity (observational data confounds price and demand — you need to estimate what demand would have been at a different price), regulatory compliance (price gouging laws in many jurisdictions, especially for necessities), and the A/B testing problem (you cannot show the same customer two prices simultaneously, so you must design experiments carefully to avoid biased elasticity estimates).`,

    functionalRequirements: [
      'Generate price recommendations for each inventory unit based on current demand forecast',
      'Ingest competitor price data through monitoring feeds and APIs',
      'Estimate price elasticity curves per product category, region, and customer segment',
      'Apply business constraints including minimum price floors, maximum price ceilings, and anti-gouging rules',
      'Support A/B experimentation to test price changes without biasing demand estimates',
      'Log all price changes with timestamp, model version, and triggering signals for audit',
      'Alert human reviewers when recommended prices breach predefined thresholds',
      'Provide a manual override interface for revenue managers',
    ],

    nonFunctionalRequirements: [
      'Price lookup latency under 50ms for real-time product page rendering',
      'Demand forecast refresh every 5 minutes for fast-moving inventory',
      'Competitor price ingestion latency under 15 minutes',
      'Price recommendation coverage of 100% of active inventory',
      'Audit log retention of 7 years for regulatory compliance',
    ],

    estimation: {
      users: '10M products across 50K merchants, each product repriced up to 288 times per day (every 5 min)',
      storage: '10M products * 288 price updates/day * 365 days * 200 bytes/update = ~210TB/yr audit log',
      bandwidth: 'Competitor price crawlers: ~100GB/day of raw price pages processed',
      qps: '~50K price lookup requests/sec peak for product pages; ~2K price update writes/sec from repricing jobs',
    },

    apiDesign: {
      description: 'REST API for price recommendations and overrides; internal job scheduler triggers repricing runs.',
      endpoints: [
        { method: 'GET', path: '/api/price/{product_id}', params: 'customer_segment?, region?', response: '{ price, original_price, valid_until, model_version }', description: 'Real-time price lookup for product page; served from cache' },
        { method: 'POST', path: '/api/price/batch', params: '{ product_ids: [], context: {} }', response: '{ prices: [{product_id, price, confidence}] }', description: 'Batch price recommendations for catalog pages' },
        { method: 'POST', path: '/api/price/override', params: '{ product_id, price, reason, expires_at }', response: '{ applied: true, previous_price }', description: 'Manual price override by revenue manager' },
        { method: 'GET', path: '/api/elasticity/{product_id}', params: 'date_range', response: '{ elasticity_curve: [{price, predicted_demand}] }', description: 'Price-demand curve for a product' },
        { method: 'POST', path: '/api/experiment/price', params: '{ product_id, control_price, test_price, traffic_split, duration_hours }', response: '{ experiment_id }', description: 'Launch a price A/B test' },
      ],
    },

    dataModel: {
      description: 'Price history for audit, demand forecasts as model outputs, elasticity parameters per product-segment pair.',
      schema: `price_history {
  id: bigint PK
  product_id: bigint FK
  price: decimal(10,2)
  currency: char(3)
  effective_at: timestamp
  expires_at: timestamp nullable
  model_version: varchar(20)
  demand_forecast: float  -- predicted units at this price for next window
  competitor_price_at_change: decimal nullable
  set_by: enum(model, override, experiment)
  override_reason: text nullable
}

demand_forecasts {
  id: bigint PK
  product_id: bigint FK
  forecast_at: timestamp
  window_start: timestamp
  window_end: timestamp
  predicted_demand: float
  predicted_demand_p10: float
  predicted_demand_p90: float
  features_snapshot: jsonb  -- feature values used for this forecast
}

elasticity_models {
  product_id: bigint
  segment: varchar(50)  -- 'all', 'premium', 'price_sensitive'
  region: varchar(10)
  elasticity: float  -- e.g., -1.5 means 1% price increase → 1.5% demand decrease
  r_squared: float
  trained_at: timestamp
  sample_size: int
  PRIMARY KEY (product_id, segment, region)
}

competitor_prices {
  id: bigint PK
  product_id: bigint FK
  competitor: varchar(100)
  price: decimal(10,2)
  scraped_at: timestamp
  url: varchar(500)
}`,
      examples: [
        { table: 'price_history', label: 'Model-driven price increase on high demand', json: '{ "product_id": 48291, "price": 459.00, "effective_at": "2025-06-10T18:00:00Z", "model_version": "v2.4.1", "demand_forecast": 12.3, "competitor_price_at_change": 399.00, "set_by": "model" }' },
        { table: 'elasticity_models', label: 'Price-sensitive segment with high elasticity', json: '{ "product_id": 48291, "segment": "price_sensitive", "region": "US-W", "elasticity": -2.1, "r_squared": 0.84, "trained_at": "2025-06-01T00:00:00Z", "sample_size": 4820 }' },
        { table: 'demand_forecasts', label: '5-minute demand window forecast', json: '{ "product_id": 48291, "forecast_at": "2025-06-10T17:55:00Z", "window_start": "2025-06-10T18:00:00Z", "window_end": "2025-06-10T18:05:00Z", "predicted_demand": 12.3, "predicted_demand_p10": 8.1, "predicted_demand_p90": 19.7 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A rule engine adjusts price by fixed percentages when occupancy or stock thresholds are crossed. Prices update hourly via a batch job. Competitor prices are manually monitored.',
      problems: [
        'Rule thresholds are set manually and cannot respond to novel demand patterns not seen in historical data',
        'Hourly repricing is too slow for fast-moving inventory like airline seats or event tickets',
        'No price elasticity estimation means you cannot know if a 10% increase will cost 5% or 30% of demand',
        'Missing competitor price context means you may price above competitors without knowing',
        'No A/B testing capability means you cannot isolate the causal effect of price changes from confounding factors',
        'Manual competitor monitoring creates 4-24 hour lag before responding to competitor price moves',
      ],
    },

    advancedImplementation: {
      title: 'ML Demand Forecasting with Causal Price Elasticity and Revenue Optimization',
      description: 'A gradient-boosted demand forecasting model updates every 5 minutes using real-time signals including current sales velocity, competitor prices, event calendar, weather, and social trend data. A separate causal elasticity model uses randomized price experiments to estimate true price sensitivity. A constrained optimization solver finds the revenue-maximizing price given forecast and elasticity, subject to floor, ceiling, and anti-gouging constraints.',
      keyPoints: [
        'Demand forecasting model: features include historical sales at current price, time to event/expiry, competitor price delta, day-of-week/hour-of-day, external events (conferences, holidays), and current sales velocity in the last 30 minutes',
        'Price elasticity via causal inference: use randomized price experiments (show different prices to randomly assigned users) to get unconfounded elasticity estimates; propensity score matching for historical data where randomization was not possible',
        'Revenue maximization: solve argmax_price { price * predicted_demand(price, elasticity) } subject to price_floor, price_ceiling, max_daily_increase_pct (anti-gouging), and competitor_price_delta constraints',
        'Competitor monitoring pipeline: crawl competitor product pages every 10-15 minutes; image-based price extraction for sites that block scrapers; structured data extraction from Google Shopping API',
        'Personalization layer: segment-level elasticity models allow showing higher prices to premium-segment visitors and lower prices to price-sensitive segment, within legal limits',
        'Human-in-the-loop: revenue managers get a dashboard showing recommended price vs current price vs competitor price; large deviations from historical range require explicit approval',
        'Audit and regulatory: every price shown is logged with timestamp and customer ID; anti-gouging alerts trigger when price exceeds 110% of 30-day average during declared emergencies',
      ],
      databaseChoice: 'PostgreSQL for price history and audit log (ACID required for financial records); Redis for real-time price cache (sub-millisecond lookups); ClickHouse for demand analytics and elasticity model training queries; Kafka for real-time sales event stream feeding the demand forecaster',
      caching: 'Current recommended price cached in Redis with 5-minute TTL matching repricing cadence; elasticity model parameters cached in memory in the optimization service; competitor prices cached for 15 minutes with background refresh',
    },

    tips: [
      'Start by clarifying the industry context — airline pricing is fundamentally different from e-commerce because seats are perishable and inventory is finite',
      'Elasticity estimation is the hardest technical challenge — mention that observational data is confounded and explain why randomized experiments are needed',
      'Interviewers expect you to address price gouging regulation, especially for necessities like hotels during natural disasters',
      'Discuss A/B testing challenges specifically: you cannot show one customer two prices simultaneously, so experiments require splitting users by ID hash',
      'The revenue maximization formulation is straightforward — revenue = price * demand(price) — but knowing demand(price) is the hard part',
      'Mention competitor price monitoring as a first-class system component, not an afterthought',
    ],

    keyQuestions: [
      {
        question: 'How do you estimate price elasticity from historical data?',
        answer: `The Problem with Naive Regression:
Simply regressing sales on price from historical data gives biased elasticity because price and demand are simultaneously determined: you raised prices when demand was high, so the correlation understates true elasticity.

Method 1: Randomized Price Experiments (Gold Standard):
\`\`\`
Randomly assign users to price treatments:
  Group A (50%): see $299
  Group B (50%): see $329 (+10%)

Measure: demand_A and demand_B over same time window

Elasticity = (demand_B - demand_A) / demand_A / 0.10
\`\`\`
- Unconfounded because assignment is random, not correlated with demand
- Requires platform support for user-level price variation
- Need to watch for spillover (users compare prices and complain)

Method 2: Instrumental Variables:
Find a variable that affects price but not demand directly (e.g., input cost changes, competitor price changes in a different market). Use as instrument to isolate causal price effect.

Method 3: Regression Discontinuity:
Look for natural discontinuities in pricing rules (e.g., price always rounds to nearest $5). Compare demand just above vs just below the threshold — customers near the boundary are quasi-randomly assigned.

Practical Calibration:
- Start with industry-average elasticity (-1.5 for most consumer goods)
- Run small randomized experiments (5% of traffic) to calibrate
- Build segment-specific models (price-sensitive customers: -2.5, brand-loyal: -0.8)`,
      },
      {
        question: 'How do you prevent the pricing engine from charging unfairly high prices during emergencies?',
        answer: `Regulatory Context:
Most US states have price gouging laws that prohibit "unconscionable" price increases for necessities during declared emergencies. Fines can be millions of dollars; reputational damage is worse.

Defense Architecture:

1. Price Change Rate Limits:
\`\`\`
Rule: price cannot increase more than X% per 24-hour period
  X = 15% for normal operations
  X = 5% when a state of emergency is declared in the delivery region
\`\`\`

2. Absolute Price Ceiling:
- Per category: hotel rooms cannot exceed 3x average nightly rate for the market
- Triggered by: government emergency declarations (feed from FEMA, state gov APIs)
- Override requires VP Revenue approval + legal sign-off

3. Historical Anchor:
- Store 30-day rolling average price per product
- Alert when recommended price > 110% of rolling average
- Automatic block when > 150% during emergency window

4. Human Review Queue:
- Any price recommendation that exceeds thresholds routes to revenue manager queue
- Manager must explicitly approve with a documented business reason
- All approvals are logged for potential regulatory audit

5. Competitor Comparison:
- If you are 20%+ above all competitors on a commodity product, flag for human review
- Helps catch algorithmic collusion (all competitors raise prices together)`,
      },
      {
        question: 'How do you run price A/B tests without biasing your demand estimates?',
        answer: `Why Standard A/B Tests Are Hard for Pricing:
- You cannot show one user two prices simultaneously
- Users may share prices (social comparison effect)
- Search ranking may differ between price groups (algorithmic feedback)
- Novelty effects: users in test group may react differently on day 1 vs day 30

Design: User-Level Randomization:
\`\`\`
Assignment: hash(user_id + experiment_id) % 100
  0-49  → control price ($299)
  50-99 → test price ($329)

Hold-out: reassign same users for full experiment duration
No cross-group exposure: users do not see both prices
\`\`\`

Handling Market-Level Interference:
If test-group users buy less, that inventory becomes available to control-group users → inflates control demand. Solution: geo-based experiments (test in city A, control in city B) for commodity markets where supply is fungible.

Metrics to Track:
- Primary: revenue per user (not conversion rate — that rewards lower prices)
- Secondary: demand volume, average order value
- Guardrail: customer satisfaction score, return rate

Statistical Considerations:
- Run for minimum 2 weeks to capture weekly seasonality
- Use sequential testing (SPRT) to allow early stopping if effect is clearly positive
- Correct for multiple comparisons if testing multiple price points simultaneously`,
      },
    ],

    keyDecisions: [
      'ML demand forecasting vs rule-based thresholds — chose ML because rules cannot capture the interaction of dozens of demand signals simultaneously and require constant manual tuning as market conditions change',
      'Randomized experiments vs causal inference from observational data — chose experiments as the primary method because instrumental variables and matching estimators require strong assumptions that are hard to validate; experiments are the only way to get unconfounded elasticity',
      'Global price model vs per-product elasticity — chose per-product models with hierarchical priors (new products inherit category-level elasticity) because products vary enormously in price sensitivity',
      'Real-time optimization per request vs batch repricing every 5 minutes — chose batch repricing because real-time per-request pricing creates inconsistency (same user sees different price on refresh) and the revenue gain from sub-5-minute repricing is marginal',
      'Fully automated pricing vs human-in-the-loop — chose human review for any recommendation exceeding 20% deviation from current price, balancing automation speed with risk management',
    ],
  },

  // ─── 3. AI Driver-Rider Matching ─────────────────────────────────────────────
  {
    id: 'ai-driver-matching',
    isNew: true,
    title: 'AI Driver-Rider Matching System',
    subtitle: "Solving Uber's Matching Problem with ML",
    icon: 'globe',
    color: '#0ea5e9',
    difficulty: 'Hard',
    description: 'Design an ML-powered matching system that optimally pairs riders with drivers by predicting accurate ETAs, solving global assignment over a 5-second window, and anticipating future supply and demand.',

    introduction: `The naive approach to ride-sharing dispatch — assign the closest available driver to each incoming request — seems intuitive but is systematically suboptimal. Consider a rider in downtown Manhattan during rush hour: the nearest driver is 3 blocks away but is surrounded by a cluster of 10 other pending requests. Assigning this driver to the first request leaves the other 9 underserved. A matching system that looks at all pending requests and all available drivers simultaneously can find an assignment that minimizes total expected wait time across all riders, even if that means individual riders wait slightly longer than they would with greedy matching.

The second failure mode of naive matching is ETA accuracy. Straight-line distance divided by average speed is a terrible predictor of actual pickup time in a dense city. A driver 400 meters away across a river may take 8 minutes. A driver 600 meters away on the same block may take 2 minutes. ML-predicted ETAs trained on millions of historical trip segments dramatically outperform distance-based estimates and are foundational to making accurate matching decisions.

The third dimension is anticipation. A rider requesting a car at 8:58 AM near a train station is part of a predictable demand cluster. If the matching system can see that 50 more similar requests will arrive in the next 2 minutes, it should hold some nearby drivers in reserve rather than immediately dispatching them to less optimal requests. Demand forecasting and supply positioning are the counterparts to reactive matching.

Operationally, the matching system must process thousands of requests per second globally, with each matching decision requiring real-time ETA queries across hundreds of candidate driver-rider pairs, filtered by constraints (accessibility vehicle, car seats, SUV preference), and solved via an assignment algorithm in under 200 milliseconds to maintain the responsiveness users expect.`,

    functionalRequirements: [
      'Match each incoming ride request to an available driver within 200ms',
      'Predict accurate pickup ETA using ML models trained on historical trip data',
      'Solve the global assignment problem across all pending requests and available drivers in 5-second batches',
      'Support vehicle type constraints including accessibility vehicles, XL, and premium tiers',
      'Anticipate and pre-position drivers based on demand forecasts',
      'Support pool matching where multiple riders going in the same direction share a vehicle',
      'Provide ETA updates to riders as driver location changes during pickup',
      'Fall back to greedy nearest-driver matching when the optimization solver is unavailable',
    ],

    nonFunctionalRequirements: [
      'Matching decision latency under 200ms from request receipt to dispatch notification',
      'ETA prediction accuracy: mean absolute error under 90 seconds for pickups under 10 minutes',
      'System must handle 500K concurrent active drivers globally',
      'Matching throughput of 50K requests per second at peak',
      'Driver location update ingestion at 1M GPS pings per second',
    ],

    estimation: {
      users: '5M rides per day globally; 500K active drivers; 100K concurrent active requests at peak',
      storage: '1M GPS pings/sec * 50 bytes * 86400 sec/day = ~4TB/day of driver location data',
      bandwidth: '500K drivers * 1 ping every 5s = 100K GPS updates/sec ingested',
      qps: '~50K new ride requests/sec at global peak; 1M location pings/sec; 200K ETA queries/sec for matching candidates',
    },

    apiDesign: {
      description: 'Riders request trips via the rider app; matching service dispatches the optimal driver; driver app confirms pickup.',
      endpoints: [
        { method: 'POST', path: '/api/rides/request', params: '{ rider_id, pickup_location, dropoff_location, vehicle_type, seats_needed }', response: '{ ride_id, status: "searching", estimated_wait_s }', description: 'Rider initiates a trip request' },
        { method: 'POST', path: '/api/drivers/location', params: '{ driver_id, lat, lng, heading, speed, status }', response: '{ received: true }', description: 'Driver app sends GPS ping every 5 seconds' },
        { method: 'POST', path: '/api/rides/{ride_id}/dispatch', params: '{ driver_id, pickup_eta_s }', response: '{ accepted: true }', description: 'Internal: matching service notifies driver of assignment' },
        { method: 'GET', path: '/api/rides/{ride_id}/eta', params: '', response: '{ pickup_eta_s, pickup_eta_updated_at, driver_location }', description: 'Rider polls for real-time driver ETA during pickup phase' },
        { method: 'GET', path: '/api/matching/candidates', params: '{ pickup_lat, pickup_lng, vehicle_type, radius_km }', response: '{ drivers: [{driver_id, lat, lng, eta_s, score}] }', description: 'Internal: fetch candidate drivers for a pickup point' },
      ],
    },

    dataModel: {
      description: 'Real-time driver state in Redis, ride lifecycle in PostgreSQL, ETA model predictions logged for retraining.',
      schema: `driver_state {
  -- Stored in Redis as hash; updated on every GPS ping
  driver_id: bigint
  lat: float
  lng: float
  heading: float
  speed_kmh: float
  status: enum(available, en_route_pickup, on_trip, offline)
  vehicle_type: enum(standard, xl, premium, accessibility)
  current_ride_id: uuid nullable
  last_ping_at: timestamp
}

rides {
  id: uuid PK
  rider_id: bigint FK
  driver_id: bigint nullable FK
  pickup_lat: float
  pickup_lng: float
  dropoff_lat: float
  dropoff_lng: float
  vehicle_type: enum
  requested_at: timestamp
  dispatched_at: timestamp nullable
  pickup_at: timestamp nullable
  dropoff_at: timestamp nullable
  status: enum(searching, dispatched, en_route, completed, cancelled)
  predicted_pickup_eta_s: int  -- at time of dispatch
  actual_pickup_s: int nullable  -- filled on pickup
}

eta_predictions {
  id: bigint PK
  driver_id: bigint
  from_lat: float
  from_lng: float
  to_lat: float
  to_lng: float
  predicted_s: int
  actual_s: int nullable
  model_version: varchar
  predicted_at: timestamp
  -- Used to retrain ETA model
}`,
      examples: [
        { table: 'rides', label: 'Active ride request being matched', json: '{ "id": "ride-f1e2d3c4", "rider_id": 29104, "driver_id": null, "status": "searching", "requested_at": "2025-06-10T08:58:22Z", "pickup_lat": 40.7484, "pickup_lng": -73.9967 }' },
        { table: 'eta_predictions', label: 'ETA prediction vs actual for model training', json: '{ "driver_id": 88102, "from_lat": 40.7520, "from_lng": -73.9985, "to_lat": 40.7484, "to_lng": -73.9967, "predicted_s": 180, "actual_s": 210, "model_version": "eta-v3.1" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'When a rider requests a trip, the system finds the nearest available driver using geospatial index and dispatches immediately. ETA is estimated as haversine distance divided by average city speed.',
      problems: [
        'Greedy nearest-driver matching ignores all other pending requests — the optimal driver for one request may be far better suited for another request that will arrive seconds later',
        'Haversine distance divided by average speed is inaccurate: a driver 500m away across a river may have a much longer actual drive time than a driver 800m away on the same block',
        'No demand anticipation: drivers near a train station at 9 AM are dispatched before the commuter wave arrives, leaving no supply for the peak',
        'Pool matching is impossible because the system has no visibility into multiple requests simultaneously',
        'System scales poorly: as request rate grows, per-request geospatial queries become a bottleneck',
      ],
    },

    advancedImplementation: {
      title: 'Batch Global Assignment with ML ETA and Demand Anticipation',
      description: 'The matching service accumulates all pending requests for a 5-second window. At the end of each window, it queries candidate drivers for each request using H3 hexagonal spatial index, runs the ML ETA model for each candidate-request pair, builds a weighted bipartite graph, and solves the assignment problem to minimize total expected wait time. A demand forecasting model runs in parallel to identify demand clusters and pre-position idle drivers.',
      keyPoints: [
        'Batch matching over 5-second windows: collect all requests and driver locations; solve global assignment once; Uber research showed this reduces average wait time by 10-15% over per-request greedy dispatch',
        'ML ETA model: gradient-boosted model with features including from/to H3 cells, time of day, day of week, current traffic speed on route segments (from historical GPS traces), and weather; achieves MAE under 60 seconds for trips under 15 minutes',
        'Assignment formulation: bipartite graph where left nodes are requests, right nodes are available drivers; edge weight = predicted ETA + soft penalty for undesirable assignments (driver heading away from pickup); solve with Hungarian algorithm or auction algorithm',
        'H3 spatial index: all driver locations indexed in H3 hex cells at resolution 8 (~460m cells); candidate drivers for a pickup are the N closest hex cells; enables sub-millisecond spatial queries at 500K driver scale',
        'Demand forecasting: XGBoost model predicts request volume per H3 cell per 15-minute window using historical patterns, events, weather, and current session booking rate; output used to incentivize idle drivers to reposition before demand arrives',
        'Pool matching extension: within the 5-second window, identify request pairs with compatible pickup and dropoff corridors (same general direction, pickup points within 400m); offer pool match before assigning individual drivers',
        'Fallback: if the optimization solver exceeds 150ms, fall back to parallel greedy nearest-driver per request; this degrades match quality but maintains responsiveness',
      ],
      databaseChoice: 'Redis for real-time driver state with H3 spatial indexing (all writes and reads at sub-millisecond latency); PostgreSQL for ride lifecycle records; Kafka for real-time GPS event stream feeding the location update pipeline; ClickHouse for ETA model training data and matching analytics',
      caching: 'Driver availability and location in Redis (refreshed on every GPS ping, ~5-second max staleness); ETA model loaded in memory of matching service instances (300MB model, reload on version change); demand forecasts cached for 15-minute windows with background refresh',
    },

    tips: [
      'Open by explaining why greedy nearest-driver is suboptimal — the global assignment insight is the key differentiator in this design',
      'The ETA model is foundational — without accurate ETAs, the global assignment optimization has no meaningful input to optimize',
      'Explain the 5-second batching window concretely: at 50K requests/sec, a 5-second window holds 250K requests — you need an efficient assignment algorithm, not brute force',
      'Discuss the demand anticipation component as a separate subsystem — positioning idle drivers is as important as dispatching active ones',
      'Pool matching is a natural extension of batch assignment — mention it even if you do not design it in depth',
      'Always mention the fallback to greedy dispatch: the system must degrade gracefully, not fail',
    ],

    keyQuestions: [
      {
        question: 'How does batch matching over a 5-second window outperform greedy per-request dispatch?',
        answer: `The Greedy Failure Mode:
\`\`\`
t=0.0s: Request A arrives at 5th Ave & 42nd St
  → Greedy dispatches Driver X (nearest, 200m away, ETA 60s)

t=0.2s: Request B arrives at 5th Ave & 43rd St (1 block from A)
  → Nearest driver is now Driver Y (500m away, ETA 180s)
  → Request B waits 3 minutes

With batch matching (solve at t=5s):
  → Driver X assigned to B (300m, ETA 90s)
  → Driver Z (previously 3rd choice) assigned to A (350m, ETA 120s)
  → Total system wait: 210s (vs 240s greedy)
  → Each rider waits slightly more, but total system cost is lower
\`\`\`

Why Batch Wins:
- Greedy makes locally optimal decisions that are globally suboptimal
- Two requests 1 block apart should compete for the same nearby drivers — greedy cannot represent this competition
- Uber published results: batch matching reduces mean wait time 10-15% and reduces unfulfilled requests by 5-8%

The Assignment Algorithm:
- Model as minimum-weight bipartite matching
- Left nodes: pending requests (N requests in window)
- Right nodes: available drivers (M drivers in candidate set)
- Edge weight: predicted ETA from driver to rider pickup
- Solve with Hungarian algorithm: O(N^3) — feasible for N < 1000 per region per window
- For larger scales: auction algorithm or distributed approximate matching

Implementation Boundary:
- Partition the world into regional cells (~50km radius)
- Run independent matching solver per region per 5-second window
- Trips that cross regional boundaries handled by a cross-region coordinator`,
      },
      {
        question: 'How do you build an accurate ML ETA model for driver-to-pickup routing?',
        answer: `Why Distance-Based ETA Fails:
- One-way streets, turn restrictions, traffic signals are invisible to distance calculations
- Traffic is highly time-of-day and location dependent
- Weather conditions (rain slows traffic 20-30% in dense cities)
- Driver behavior varies (some drivers know shortcuts, some follow GPS blindly)

Feature Engineering:
\`\`\`
Spatial features:
  - H3 cell of origin (resolution 8, ~460m cells)
  - H3 cell of destination
  - H3 cells of intermediate route (top-3 most likely route cells)
  - Straight-line distance
  - Turn count (estimated from typical routes)

Temporal features:
  - Hour of day (one-hot or cyclical encoding)
  - Day of week
  - Is holiday
  - Minutes until next major event near destination

Traffic features:
  - Current median speed in origin H3 cell (from recent GPS traces)
  - Current median speed in destination H3 cell
  - Route congestion index (from historical trip times on similar routes in last 30 min)

Driver features:
  - Driver average speed relative to route norm (driver-specific calibration)
\`\`\`

Training:
- Labels: actual_pickup_time - dispatch_time for each historical trip
- Model: gradient-boosted trees (XGBoost)
- Training data: ~500M historical trips
- Update frequency: daily retrain, hourly feature updates for traffic features
- Evaluation: MAE on held-out data split by city, time-of-day, trip distance

Serving:
- Model artifact loaded in memory of matching service (300MB)
- Batch scoring: score all candidate-request pairs in one model call (vectorized)
- Latency: ~5ms to score 500 pairs (1 request * 500 candidate drivers)`,
      },
    ],

    keyDecisions: [
      'Batch matching every 5 seconds vs per-request greedy dispatch — chose batch because it allows global optimization across all pending requests, reducing total system wait time at the cost of a short intentional delay',
      'ML ETA prediction vs distance-based estimation — chose ML because accurate ETAs are foundational to the assignment objective function; distance-based estimates would make the optimization meaningless',
      'Hungarian algorithm vs auction algorithm for assignment — chose auction algorithm for large regional pools (>500 requests per window) because it parallelizes better; Hungarian for small pools',
      'H3 hexagonal grid vs quadtree for spatial indexing — chose H3 because it provides uniform cell areas at each resolution level, avoiding the distortion issues of quadtree cells near lat/lng boundaries',
      'Global single solver vs regional partitioning — chose regional partitioning with ~50km cells because a true global solver over 100K simultaneous requests would be computationally infeasible; cross-region trips are rare enough that they can be handled with a secondary coordinator',
    ],
  },

  // ─── 4. AI Surge Pricing ─────────────────────────────────────────────────────
  {
    id: 'ai-surge-pricing',
    isNew: true,
    title: 'AI Surge Pricing Prediction System',
    subtitle: 'Solving Uber/Lyft Supply-Demand Imbalance with ML',
    icon: 'zap',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design an ML system that predicts supply-demand imbalances by geographic cell 10-15 minutes ahead and sets surge multipliers to attract driver supply before demand peaks, reducing wait times and unfulfilled requests.',

    introduction: `Reactive surge pricing is too slow. By the time an imbalance is large enough to be detected by simple thresholds — demand for rides exceeds available drivers — riders are already waiting several extra minutes. The surge multiplier then takes several more minutes to attract new driver supply. This means that during the peak of a demand spike, riders experience the worst of both worlds: high prices and long wait times simultaneously.

Predictive surge solves this by forecasting demand and supply independently, computing their expected imbalance, and adjusting price before the gap appears. A predictive system knows that every Tuesday at 9:10 PM when a game ends at a nearby stadium, a specific 6-block radius will have 10x normal ride demand. It can start raising prices at 9:05 PM, attracting nearby drivers before the flood of requests arrives.

The system must reason at the level of fine-grained geographic cells, typically using H3 hexagonal grids at resolutions that correspond to roughly 400-500 meter diameter cells in urban areas. Each cell has its own demand and supply characteristics, and the imbalance in one cell may be partially addressed by drivers from adjacent cells — so geographic smoothing is an important modeling consideration.

Transparency is increasingly important: regulators and users demand to understand why prices are high. Systems that can explain surge in terms of supply and demand counts, and that can forecast when surge will end, build more trust than opaque multipliers. Showing a user "5 drivers available, 47 requests in the next 10 minutes, surge expected to drop in 8 minutes" is far more acceptable than a raw 2.4x multiplier with no explanation.`,

    functionalRequirements: [
      'Forecast demand per H3 cell for the next 15 minutes at 5-minute granularity',
      'Forecast driver supply per H3 cell including drivers en route to completing trips',
      'Compute imbalance score per cell and set surge multiplier accordingly',
      'Apply geographic smoothing so surge transitions gradually between adjacent cells',
      'Send driver repositioning recommendations to incentivize supply movement',
      'Display surge explanation to riders including expected duration and demand context',
      'Log all surge events with cell, multiplier, and demand/supply context for regulatory audit',
      'Detect and respond to unplanned demand events such as major venue dismissals and accidents',
    ],

    nonFunctionalRequirements: [
      'Surge multiplier updates per cell every 60 seconds',
      'Demand forecast latency under 200ms for the full city grid',
      'Supply estimate latency under 100ms using current driver location state',
      'System must cover 500 cities worldwide with city-specific model tuning',
      'Regulatory audit log with surge justification retained for 3 years',
    ],

    estimation: {
      users: '500 cities, average 5000 H3 cells per city = 2.5M cells updated every 60s',
      storage: 'Surge log: 2.5M updates/min * 200 bytes * 525K min/yr = ~260TB/yr',
      bandwidth: 'Driver supply state: 500K drivers * 1 ping/5s * 50 bytes = 5MB/sec',
      qps: '2.5M cell updates per 60s = ~42K surge computation writes/sec',
    },

    apiDesign: {
      description: 'Pricing service reads surge multipliers from cache at request time; a background job updates surge for each cell every 60 seconds.',
      endpoints: [
        { method: 'GET', path: '/api/surge/{h3_cell}', params: '', response: '{ multiplier, demand_forecast_15min, available_drivers, expected_drop_at }', description: 'Get current surge for a cell; served from Redis cache' },
        { method: 'GET', path: '/api/surge/map', params: 'bbox: {lat_min, lat_max, lng_min, lng_max}', response: '{ cells: [{h3_cell, multiplier, level}] }', description: 'Surge heatmap for the rider app map view' },
        { method: 'POST', path: '/api/surge/reposition', params: '{ driver_id, current_h3, recommended_h3, incentive_cents }', response: '{ sent: true }', description: 'Send repositioning nudge to idle driver' },
        { method: 'GET', path: '/api/demand/forecast', params: '{ h3_cell, horizon_minutes }', response: '{ forecasts: [{minute_offset, predicted_requests, confidence}] }', description: 'Demand forecast for a specific cell' },
      ],
    },

    dataModel: {
      description: 'Surge state per cell stored in Redis for real-time serving; historical surge events in PostgreSQL for audit and model training.',
      schema: `surge_events {
  id: bigint PK
  h3_cell: char(15)
  computed_at: timestamp
  multiplier: float
  demand_forecast_15min: int
  available_drivers: int
  trips_in_progress_nearby: int
  imbalance_score: float
  model_version: varchar
  triggered_by: enum(model, event_detection, manual)
}

demand_forecasts_log {
  h3_cell: char(15)
  forecast_horizon_min: int
  predicted_requests: float
  actual_requests: int nullable  -- filled after window passes
  forecast_at: timestamp
  model_version: varchar
  PRIMARY KEY (h3_cell, forecast_at, forecast_horizon_min)
}

repositioning_nudges {
  id: bigint PK
  driver_id: bigint
  from_h3: char(15)
  to_h3: char(15)
  incentive_cents: int
  sent_at: timestamp
  accepted: bool nullable
  arrived_at: timestamp nullable
}`,
      examples: [
        { table: 'surge_events', label: 'Post-stadium surge event', json: '{ "h3_cell": "8928308280fffff", "computed_at": "2025-06-10T21:10:00Z", "multiplier": 2.8, "demand_forecast_15min": 340, "available_drivers": 12, "imbalance_score": 4.2, "triggered_by": "model" }' },
        { table: 'demand_forecasts_log', label: 'Demand forecast vs actual', json: '{ "h3_cell": "8928308280fffff", "forecast_horizon_min": 10, "predicted_requests": 310, "actual_requests": 334, "forecast_at": "2025-06-10T21:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A rule-based system monitors the ratio of open requests to available drivers per geographic zone every 5 minutes. When the ratio exceeds 2:1, a fixed surge multiplier of 1.5x is applied. When it exceeds 4:1, a 2.0x multiplier applies.',
      problems: [
        'Reactive detection means surge activates only after the imbalance is already causing long wait times',
        'Fixed multiplier steps do not accurately reflect the magnitude or duration of imbalance',
        'Geographic zones are too large — a single zone covering 10 blocks treats a demand spike on one block as spread across the whole zone',
        'No supply forecasting means the system cannot account for drivers currently on trips who will become available in 5 minutes',
        'No event detection means a concert ending at 10 PM is treated as an unexpected demand spike rather than a predictable event',
      ],
    },

    advancedImplementation: {
      title: 'Predictive Surge with ML Demand Forecasting and Supply Modeling',
      description: 'A demand forecasting model (LSTM or Temporal Fusion Transformer) produces per-H3-cell predictions at 5-minute granularity up to 15 minutes ahead. A supply model uses current driver locations, their trip completion ETAs, and historical repositioning behavior to predict supply per cell over the same horizon. An imbalance score is computed as predicted_demand / predicted_supply for each cell. This score is converted to a surge multiplier via a calibrated curve and smoothed across adjacent cells to avoid jarring price transitions.',
      keyPoints: [
        'Demand model features: time-of-day (cyclical), day-of-week, historical request rate for this cell at this time, event calendar (sports, concerts, conferences within 2km), weather (rain increases demand ~15%), current 10-minute request velocity, anomaly detection output (is current demand unusual?)',
        'Supply model: for each available driver, predict whether they will be in cell X in T minutes using their current location, heading, and if on a trip, the dropoff location and estimated trip completion time; aggregate per cell to get predicted supply distribution',
        'Imbalance to multiplier calibration: derived from demand elasticity experiments; at imbalance 2:1 (twice as many requests as drivers), a 1.5x multiplier attracts approximately enough driver supply to close the gap within 10 minutes; calibrated per city because elasticity varies with driver density',
        'Geographic smoothing: surge multiplier for a cell is a weighted average of its own imbalance score and the scores of its 6 adjacent H3 cells; this prevents hard boundaries where adjacent blocks have 1.0x and 2.8x prices',
        'Event detection: integrate venue event schedules and real-time venue dismissal signals (stadium exits at halftime produce a detectable GPS velocity pattern); pre-load demand spike model for known events',
        'Driver repositioning: identify cells with predicted supply shortage; send push notifications to idle drivers in adjacent cells with small incentive payments to reposition; track acceptance rate to calibrate incentive amounts',
      ],
      databaseChoice: 'Redis for real-time surge state per H3 cell with 90-second TTL; PostgreSQL for surge event audit log; Kafka for real-time GPS and request event streams; ClickHouse for demand forecast accuracy analysis and model retraining',
      caching: 'Current surge multiplier per H3 cell cached in Redis (refreshed every 60s); demand forecasts cached for 5 minutes; city-level event calendar cached in application memory with daily refresh',
    },

    tips: [
      'The key insight is prediction versus reaction — interviewers want to hear that reactive surge is too slow and that the system should forecast imbalance before it happens',
      'Explain the H3 cell granularity choice concretely: resolution 8 cells are about 460m diameter, which is the right scale for urban demand patterns',
      'Supply modeling is often overlooked — knowing that 50 drivers will complete trips in the next 7 minutes is as important as knowing demand',
      'Geographic smoothing prevents the jarring user experience of 1.0x on one block and 2.8x on the next — mention it explicitly',
      'Transparency features (expected surge duration, driver count, demand explanation) are increasingly important for regulatory and trust reasons',
    ],

    keyQuestions: [
      {
        question: 'How do you predict demand 10-15 minutes ahead per geographic cell?',
        answer: `Feature Groups:

1. Temporal Patterns (strongest signal):
\`\`\`
- Historical request rate for this H3 cell at this time-of-day and day-of-week
- Rolling average of requests in this cell in the last 10, 20, 30 minutes
- Trend: is the current rate accelerating or decelerating?
\`\`\`

2. Event Context:
\`\`\`
- Is there a venue within 2km? What event capacity?
- Time until event ends (negative values = event already ended)
- Historical demand multiplier for this venue type on similar events
\`\`\`

3. Weather:
\`\`\`
- Rain: +15% demand on average (people avoid walking)
- Temperature below 15°C: +8% demand
- Active severe weather warning: +30% demand
\`\`\`

4. Cross-Cell Context:
\`\`\`
- Demand in adjacent H3 cells (demand spills between cells)
- Demand at nearby transit hubs (train station delays → spike in ride demand)
\`\`\`

Model Architecture:
- Temporal Fusion Transformer or LSTM for time-series structure
- Separate model per city (demand patterns differ significantly between cities)
- Output: predicted request count for 5-min windows at t+5, t+10, t+15
- Uncertainty: output distribution (p10, p50, p90) so surge decisions account for forecast uncertainty

Accuracy Benchmark:
- RMSE under 8% for 5-minute ahead forecast
- RMSE under 18% for 15-minute ahead forecast
- Re-evaluated weekly; trigger alert if accuracy drops (indicates distribution shift)`,
      },
      {
        question: 'How do you convert an imbalance score into a surge multiplier?',
        answer: `The Imbalance Score:
\`\`\`
imbalance = predicted_demand_15min / predicted_supply_15min

Examples:
  imbalance = 0.8  → more drivers than riders → no surge (1.0x)
  imbalance = 1.5  → mild shortage → 1.2x surge
  imbalance = 3.0  → significant shortage → 1.8x surge
  imbalance = 6.0  → severe shortage → 2.8x surge
\`\`\`

Calibration via Demand Elasticity:
The goal of surge is to attract enough additional driver supply to close the gap in ~10 minutes. The multiplier needed depends on driver supply elasticity in this city and time-of-day.

\`\`\`
Run elasticity experiment: measure how many additional drivers come online
per $0.10 increase in per-mile rate, per city, per time window

Result: in NYC at 9 PM, a 1.5x multiplier attracts ~15% more drivers
        in a 10-minute window from the 2km radius.

Set multiplier so: attracted_supply(multiplier) ≈ demand_gap
\`\`\`

Multiplier Constraints:
- Maximum: regulatory cap (some cities: 3.0x during emergencies)
- Minimum increase step: 0.1x (avoid rapid oscillation)
- Smoothing: new multiplier = 0.7 * current + 0.3 * recommended (exponential smoothing)
- Maximum rate of change: no more than 0.5x increase per 5-minute window`,
      },
    ],

    keyDecisions: [
      'Predictive vs reactive surge — chose predictive because reactive activation delays supply response by 5-10 minutes, meaning riders experience the full wait penalty before any supply response; predictive surge can begin attracting supply before the demand peak hits',
      'H3 hexagonal grid vs custom zones — chose H3 at resolution 8 because uniform cell size makes demand modeling simpler, the open-source library is battle-tested at scale, and the cell size matches urban demand cluster size well',
      'ML demand forecast vs historical average lookup — chose ML because demand patterns have complex dependencies on events, weather, and cross-cell spillover that simple historical averages cannot capture',
      'Geographic smoothing vs hard cell boundaries — chose smoothing because hard boundaries create jarring UX where adjacent streets have very different prices, and they create gaming opportunities where drivers position just inside a surge zone',
      'Automated repositioning incentives vs passive surge only — chose active repositioning nudges because passive surge only attracts drivers who are already browsing the driver app; a push notification with an explicit incentive reaches offline or idle drivers faster',
    ],
  },

  // ─── 5. AI Cold Start Recommendation ────────────────────────────────────────
  {
    id: 'ai-cold-start-recommendation',
    isNew: true,
    title: 'AI Cold Start Recommendation System',
    subtitle: 'Solving the Netflix/Spotify New User Problem with ML',
    icon: 'database',
    color: '#10b981',
    difficulty: 'Medium',
    description: 'Design an ML system that provides high-quality personalized recommendations to new users with no interaction history, using onboarding signals, session behavior, contextual features, and rapid real-time learning.',

    introduction: `Collaborative filtering — the backbone of most recommendation systems — fails completely for new users. If a platform has no record of what you have watched, listened to, or bought, it cannot find similar users to learn from. The naive fallback is to show everyone the same global top-10 chart, which performs poorly and drives early churn: a user who signs up for a classical music platform and is immediately shown pop hits will leave before giving the system a chance to learn their taste.

This is the cold start problem, and it is one of the most commercially significant challenges in recommender systems. New user acquisition is expensive; losing users in the first session because recommendations are irrelevant wastes that acquisition cost entirely. Research consistently shows that the quality of recommendations in the first 10 minutes of usage is a strong predictor of 30-day retention.

The cold start solution requires building a multi-signal system that combines explicit preference signals from onboarding, implicit behavioral signals from the current session, contextual signals about when and where the user is accessing the platform, and prior knowledge about what new users in similar contexts tend to enjoy. Each signal is weaker than a full interaction history, but together they can drive substantially better first-session recommendations than popularity-based fallbacks.

The system must also learn rapidly: after a new user has interacted with 5 items — whether by watching, skipping, rating, or adding to a playlist — the system should be able to meaningfully update its understanding of their preferences within the current session, without waiting for a full model retrain. Real-time session models that update per-interaction are a key component of solving cold start.`,

    functionalRequirements: [
      'Collect explicit preference signals during onboarding without excessive friction',
      'Generate personalized recommendations based on current session interactions',
      'Update ranking model after each user interaction within the current session',
      'Apply contextual signals including time of day, device type, and geographic market',
      'Fall back to curated diversity-aware popularity rankings when signals are absent',
      'Transfer signals from linked accounts or prior guest sessions when available',
      'Provide different cold start strategies per content category and user acquisition channel',
      'Track onboarding recommendation quality and new user retention per strategy variant',
    ],

    nonFunctionalRequirements: [
      'First recommendation response under 200ms even for brand new users',
      'Session model update latency under 100ms per interaction so next recommendation reflects latest signal',
      'Cold start strategy A/B tests must reach statistical significance within 2 weeks',
      'System must handle 100K new user sessions per hour at peak acquisition periods',
      'Onboarding preference collection must complete in under 90 seconds to avoid abandonment',
    ],

    estimation: {
      users: '100K new users per hour at peak; 500M total users; 50M daily active sessions',
      storage: 'Session interaction stream: 50M sessions * 20 interactions * 100 bytes = 100GB/day',
      bandwidth: 'Recommendation response: average 20 items * 2KB metadata = 40KB per request',
      qps: '500K recommendation requests/sec at peak; 2M session event writes/sec',
    },

    apiDesign: {
      description: 'Recommendations served via unified API that detects cold start state and routes to appropriate strategy; session events sent to update real-time model.',
      endpoints: [
        { method: 'GET', path: '/api/recommendations', params: 'user_id, context: {device, time, location}, limit', response: '{ items: [{id, score, strategy_used}], next_cursor }', description: 'Primary recommendation endpoint; automatically applies cold start strategy for new users' },
        { method: 'POST', path: '/api/onboarding/preferences', params: '{ user_id, genres: [], moods: [], artists: [], content_rated: [{id, rating}] }', response: '{ profile_seed_created: true }', description: 'Save explicit preferences from onboarding screen' },
        { method: 'POST', path: '/api/sessions/event', params: '{ user_id, session_id, item_id, event_type: "play"|"skip"|"like"|"add_to_playlist", position_pct }', response: '{ received: true }', description: 'Real-time session event; triggers session model update' },
        { method: 'GET', path: '/api/users/{user_id}/cold_start_status', params: '', response: '{ interaction_count, strategy: "onboarding"|"session"|"full_cf", days_since_signup }', description: 'Internal: determine which recommendation strategy to apply' },
      ],
    },

    dataModel: {
      description: 'User preference seeds from onboarding, session interaction stream, and cold start strategy assignments for experimentation.',
      schema: `user_preference_seeds {
  user_id: bigint PK
  source: enum(onboarding, linked_account, inferred_from_session)
  genre_vector: float[50]  -- weighted genre preference vector
  artist_ids: bigint[]  -- explicitly preferred artists
  content_rated: jsonb  -- [{item_id, rating, rated_at}]
  created_at: timestamp
  interaction_count_at_creation: int
}

session_interactions {
  session_id: uuid
  user_id: bigint
  item_id: bigint
  event_type: enum(impression, play, skip, like, dislike, add_to_playlist)
  position_pct: float nullable  -- how far through content before skip
  dwell_s: int  -- time spent before action
  rank_when_shown: int  -- position in recommendation list
  strategy_used: varchar(50)
  occurred_at: timestamp
}

cold_start_experiments {
  user_id: bigint
  experiment_id: varchar
  variant: varchar
  assigned_at: timestamp
  interaction_count_7d: int nullable  -- filled 7 days after assignment
  retained_30d: bool nullable
}`,
      examples: [
        { table: 'user_preference_seeds', label: 'Onboarding-collected preferences', json: '{ "user_id": 9182736, "source": "onboarding", "genre_vector": [0.8, 0.1, 0.05, ...], "artist_ids": [1829, 4471, 9012], "interaction_count_at_creation": 0 }' },
        { table: 'session_interactions', label: 'Skip after 8% play — strong dislike signal', json: '{ "user_id": 9182736, "item_id": 448291, "event_type": "skip", "position_pct": 0.08, "dwell_s": 12, "rank_when_shown": 2, "strategy_used": "session_bandit" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'New users are shown a global popularity ranking for their country. After 5 ratings, the system applies collaborative filtering using the new user\'s rated items as a seed.',
      problems: [
        'Global popularity ranking is the same for every new user regardless of age, location, or taste — serves mainstream content and excludes niche genres entirely',
        'Waiting for 5 ratings delays personalization significantly; most users will not rate anything voluntarily',
        'No use of onboarding signals or session behavior as implicit preference indicators',
        'No session-level real-time learning — the system does not update based on skips or short plays during the current session',
        'New users from different acquisition channels (podcast ad vs social media vs direct search) have very different taste profiles that are ignored',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Signal Cold Start with Session Bandits and Rapid Preference Learning',
      description: 'A tiered cold start pipeline activates different strategies based on available signals. At signup, onboarding preference collection seeds an initial taste profile. A contextual bandit model uses this seed plus device, time, and market signals to make initial recommendations. As the user interacts, a session-level model updates in real time after each event. The system tracks which strategy variant each user is on and evaluates 7-day interaction depth and 30-day retention to optimize onboarding continuously.',
      keyPoints: [
        'Onboarding preference collection: show 6-10 content items spanning genre diversity; user interactions (tap, long-press preview, skip) generate implicit signals without requiring explicit ratings; target under 90 seconds total',
        'Contextual bandit for initial recommendations: features include genre seed from onboarding, device type (mobile often correlates with different taste than TV), time of day, market, and acquisition channel; trained to maximize expected engagement across diverse user cohorts',
        'Session-level model: a lightweight bandit or user embedding that updates after each interaction in the current session; skip after 8% play → strong negative; complete play → strong positive; add to playlist → very strong positive; weights update using a running average without requiring server round-trip for the update itself',
        'Cross-domain transfer: if user linked a Spotify or Apple Music account, extract genre distribution from their existing listening history and use as seed; also applicable for platform migration (if user signed up via Facebook, use social graph to find friends on the platform as collaborative filter seed)',
        'Diversity-aware ranking: for cold start, intentionally recommend across diverse genres and styles rather than optimizing purely for predicted relevance; broad exploration helps identify user taste faster than narrow exploitation of the initial seed',
        'Rapid model update threshold: when interaction count reaches 20, switch from cold start strategies to full collaborative filtering with the interaction history as the sparse user vector; tune threshold per category (music needs more interactions than movies before preferences stabilize)',
      ],
      databaseChoice: 'Redis for real-time session state and contextual bandit arm counts; PostgreSQL for user preference seeds and experiment assignments; Kafka for session event stream; feature store for precomputed item embeddings used in cold start candidate generation',
      caching: 'Popular item metadata cached in Redis for cold start candidate pools; onboarding preference vector cached in session store for 24 hours; contextual bandit model parameters cached in application memory with 1-hour refresh',
    },

    tips: [
      'Frame the problem clearly: collaborative filtering fails for new users because there is no interaction history to find similar users; everything else follows from this constraint',
      'The contextual bandit is the right model for cold start because it explicitly handles exploration vs exploitation, which is exactly the cold start tradeoff',
      'Implicit signals from session behavior are much stronger than explicit ratings because users rarely rate voluntarily; explain skip-at-8% as a strong dislike signal',
      'Cross-domain transfer is a powerful technique worth mentioning even if you do not design it in detail',
      'Discuss the warm-up threshold: at what point does a user have enough history to switch from cold start to full collaborative filtering? This is a tunable hyperparameter',
    ],

    keyQuestions: [
      {
        question: 'How do you generate recommendations when a user has zero interaction history?',
        answer: `Available Signals at Zero History:
1. Onboarding preferences (if collected)
2. Device type and OS
3. Geographic market
4. Acquisition channel (which ad or referral brought them)
5. Time of day and day of week
6. Browser/app language settings

Strategy: Contextual Popularity with Diversity:
\`\`\`
Step 1: Get global top-200 items for this market
Step 2: Filter by language preference (from device locale)
Step 3: Re-rank using contextual features:
  - Time = evening → lean toward longer, relaxing content
  - Device = mobile → lean toward shorter content
  - Acquisition channel = "jazz podcast ad" → seed jazz genre
Step 4: Apply diversity constraint:
  - No more than 2 items from same genre in top 10
  - Include at least 1 local content item
  - Include 1 "surprise" item from an adjacent genre
\`\`\`

Onboarding Implicit Collection:
\`\`\`
Show a grid of 12 diverse items
User taps an item → expanded preview → strong positive signal
User scrolls past quickly → mild negative signal
User interacts with 5+ items → rich enough seed for bandit

Map interactions to genre vector:
  liked_items → extract genre distribution → user_genre_vector
  Use user_genre_vector to bias subsequent candidate pool
\`\`\`

Key Principle: exploration is more valuable than exploitation at zero history. Show diverse content to identify taste quickly; do not show 10 variations of the same popular item.`,
      },
      {
        question: 'How do you update recommendations in real time as a new user interacts during their first session?',
        answer: `Session Model Architecture:
A lightweight preference model that updates after each interaction without requiring a server model retrain.

Approach: Online Bandit with Item Embeddings:
\`\`\`python
# Initialize session context vector from onboarding seed or zeros
session_vector = onboarding_genre_vector or zeros(50)

# After each interaction:
def update_session_vector(session_vector, item_embedding, event):
  signal = {
    'play_complete': +1.0,
    'play_75pct': +0.7,
    'add_to_playlist': +1.5,
    'like': +1.2,
    'play_25pct': +0.2,
    'skip_after_30s': -0.5,
    'skip_after_8pct': -0.9,
    'dislike': -1.5,
  }[event]

  # Exponential moving average update
  alpha = 0.3  # learning rate
  session_vector = (1 - alpha) * session_vector + alpha * signal * item_embedding
  return session_vector

# Score candidates for next recommendation
scores = [dot(session_vector, item_embedding) for item in candidates]
top_k = argsort(scores)[-10:]  # top-10 recommendations
\`\`\`

Key Properties:
- O(1) update — no model retrain, just vector arithmetic
- Incorporates each interaction within 50ms
- Item embeddings are precomputed and cached — no latency on update
- After 5-10 interactions, session vector is meaningfully personalized

Persistence: session vector stored in Redis with 24-hour TTL — if user returns the next day, their session learning carries over as an additional cold start seed.`,
      },
    ],

    keyDecisions: [
      'Contextual bandit vs pure content-based filtering for cold start — chose bandit because it explicitly handles the exploration-exploitation tradeoff and can incorporate diverse contextual features that pure content-based filtering does not use',
      'Implicit session signals vs explicit ratings — chose implicit signals because voluntary rating rate is under 5% of users, while session behavior (skip timing, completion rate) is available for 100% of users',
      'Online session vector update vs batch model retrain — chose online update because the session happens in real time and the next recommendation must reflect the most recent signal; batch retrain cannot achieve sub-100ms latency',
      'Diversity enforcement vs pure relevance optimization — chose diversity for cold start because narrow optimization on a weak preference signal reinforces the initial noise in the signal; exploration finds true taste faster',
      'Hard switch to full collaborative filtering at N interactions vs gradual blending — chose gradual blending with a linear interpolation between cold start and CF weights as interaction count grows, because a hard switch creates a discontinuity in recommendation quality visible to users',
    ],
  },

  // ─── 6. AI Social Bot Detection ─────────────────────────────────────────────
  {
    id: 'ai-social-bot-detection',
    isNew: true,
    title: 'AI Social Media Bot Detection System',
    subtitle: "Solving Twitter/X and Meta's Inauthentic Behavior Problem",
    icon: 'shield',
    color: '#8b5cf6',
    difficulty: 'Hard',
    description: 'Design an ML system that detects automated and inauthentic social media accounts at scale by analyzing account behavior, content patterns, and network coordination signals, while minimizing false positives on legitimate users.',

    introduction: `Social media bots are not a monolithic threat. At one end of the spectrum are simple spam bots — accounts created to post identical ads or phishing links — that are easy to detect with rule-based filters. At the other end are sophisticated state-sponsored influence operations that use professionally designed accounts with years of authentic-looking history, gradual topic pivots toward divisive content, and carefully orchestrated coordination that is designed to look like organic grassroots activity.

The fundamental challenge is that bots are adversarial: they actively study detection systems and evolve to evade them. A detection model trained on last month\'s bot patterns will be partially blind to next month\'s. This creates an arms race dynamic where detection systems must continuously retrain, and any published information about detection features becomes a target for evasion.

What makes this tractable is that while individual bot accounts can mimic human behavior across most dimensions, coordinating networks of bots at scale creates patterns that are very difficult to fake. A thousand accounts that all start posting about the same topic within minutes of each other, that all follow the same new accounts within the same hour, and that retweet each other at rates far above what organic networks produce — this coordination signal is almost impossible to suppress when operating at scale.

The system must handle hundreds of millions of accounts in near real time, with decisions that affect whether content is amplified or suppressed at global scale. False positives have real consequences: incorrectly suspending a journalist or activist is a severe harm. False negatives also have real consequences: allowing coordinated disinformation to amplify during an election is equally severe. The system must be calibrated carefully, with different thresholds for different action types (shadow-suppress vs quarantine vs permanent ban) and robust appeal mechanisms.`,

    functionalRequirements: [
      'Score each account for bot probability at account creation and periodically throughout account lifetime',
      'Detect coordinated inauthentic behavior across clusters of accounts acting together',
      'Analyze account-level behavioral features including posting frequency, content diversity, and follower dynamics',
      'Analyze network features including follower graph patterns and co-action clustering',
      'Apply tiered enforcement: reduce amplification, apply interstitial warnings, suspend, or permanently ban based on confidence level',
      'Maintain an appeal mechanism for accounts incorrectly classified as bots',
      'Provide human review queue for medium-confidence cases',
      'Retrain models continuously on labeled data from confirmed bot investigations',
    ],

    nonFunctionalRequirements: [
      'Score 100M new and existing accounts per day within available compute budget',
      'Real-time scoring for viral posts to detect bot amplification within 5 minutes of post',
      'False positive rate under 0.1% for automated account suspension actions',
      'Model update cycle of 48 hours or less to respond to new bot tactics',
      'All enforcement decisions stored for 3 years for regulatory and legal review',
    ],

    estimation: {
      users: '500M total accounts on platform; 50M new accounts per month; 100M daily active accounts scored',
      storage: 'Signal data per account: 50KB * 500M = 25TB; scoring log: 100M decisions/day * 500 bytes = 50GB/day',
      bandwidth: 'Real-time event stream: 500M posts/day + 5B interactions/day = ~100K events/sec',
      qps: '100K social events/sec for real-time feature updates; 50K account scores/sec for batch scoring job',
    },

    apiDesign: {
      description: 'Signals ingested via event stream; enforcement decisions published to content moderation service; human review via internal tooling API.',
      endpoints: [
        { method: 'GET', path: '/api/bot-score/{account_id}', params: '', response: '{ score: 0.0-1.0, confidence, top_signals: [], model_version, scored_at }', description: 'Get current bot probability score for an account' },
        { method: 'POST', path: '/api/signals/event', params: '{ account_id, event_type, target_id, timestamp, metadata }', response: '{ received: true }', description: 'Ingest a behavioral event to update account signal features' },
        { method: 'GET', path: '/api/network/cluster/{account_id}', params: '', response: '{ cluster_id, cluster_size, avg_score, coordination_signals }', description: 'Get coordinated network cluster an account belongs to' },
        { method: 'POST', path: '/api/enforcement/action', params: '{ account_id, action: "suppress"|"warn"|"suspend"|"ban", reason_code, confidence }', response: '{ action_id, applied_at }', description: 'Apply enforcement action to an account' },
        { method: 'POST', path: '/api/appeals/{action_id}', params: '{ account_id, appeal_text, evidence_urls[] }', response: '{ appeal_id, queue_position }', description: 'Submit an appeal for a contested enforcement action' },
      ],
    },

    dataModel: {
      description: 'Account-level signal features, network cluster assignments, enforcement history, and appeal outcomes.',
      schema: `account_signals {
  account_id: bigint PK
  created_at: timestamp
  follower_count: int
  following_count: int
  post_count: int
  avg_posts_per_day_30d: float
  content_diversity_score: float  -- higher = more diverse topics
  retweet_to_original_ratio: float
  avg_time_between_posts_s: float
  profile_picture_ai_generated_prob: float
  bio_originality_score: float
  follower_following_ratio: float
  account_age_days: int
  device_types_used: text[]
  posting_hour_distribution: float[24]  -- probability of posting each hour
  updated_at: timestamp
}

bot_scores {
  id: bigint PK
  account_id: bigint
  score: float
  model_version: varchar
  top_features: jsonb  -- [{feature_name, contribution}]
  scored_at: timestamp
  trigger: enum(account_creation, scheduled, viral_post, manual)
}

network_clusters {
  cluster_id: bigint PK
  discovered_at: timestamp
  cluster_size: int
  avg_bot_score: float
  coordination_type: enum(retweet_network, follow_network, content_similarity, mixed)
  investigation_status: enum(auto_flagged, under_review, confirmed_bot, confirmed_human, inconclusive)
}

enforcement_actions {
  id: bigint PK
  account_id: bigint
  action: enum(suppress_from_trending, interstitial_warning, suspend, permanent_ban)
  reason_code: varchar
  confidence: float
  model_version: varchar
  applied_at: timestamp
  applied_by: enum(automated, human_reviewer)
  overturned_at: timestamp nullable
  appeal_id: bigint nullable FK
}`,
      examples: [
        { table: 'account_signals', label: 'Classic bot account profile', json: '{ "account_id": 881827364, "avg_posts_per_day_30d": 287.4, "content_diversity_score": 0.04, "retweet_to_original_ratio": 14.2, "avg_time_between_posts_s": 301, "profile_picture_ai_generated_prob": 0.94, "posting_hour_distribution": [0.042,0.042,...] }' },
        { table: 'bot_scores', label: 'High-confidence bot score', json: '{ "account_id": 881827364, "score": 0.97, "model_version": "bot-v8.2", "top_features": [{"feature_name": "posting_hour_uniformity", "contribution": 0.23}, {"feature_name": "content_diversity_score", "contribution": 0.19}] }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Rules flag accounts that exceed simple thresholds: more than 100 posts per day, follower-to-following ratio under 0.01, or account age under 3 days combined with more than 50 posts. Flagged accounts are manually reviewed.',
      problems: [
        'Simple rate limits are trivially evaded by bots that spread activity across longer time windows',
        'New-account rules block all power users who happen to post frequently in their first days',
        'No content analysis means bots posting diverse topics to appear legitimate pass all checks',
        'No network analysis means coordinated bot networks are invisible — each individual account looks normal',
        'Manual review cannot scale to 50M new accounts per month',
        'Rules are static — as soon as bots adapt to stay below thresholds, detection fails completely',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Layer ML with Coordinated Behavior Detection and Graph Neural Networks',
      description: 'A three-layer detection system operates on account-level features, content-level features, and network-level features independently. A meta-classifier combines all three layers into a final bot probability score. A separate coordinated behavior detector runs community detection on the retweet and follow graph to surface bot networks even when individual accounts look legitimate. Human reviewers handle medium-confidence cases and all account suspensions.',
      keyPoints: [
        'Account feature layer: 80+ features including posting frequency, content diversity, retweet-to-original ratio, posting hour distribution uniformity (bots often post at perfectly regular intervals), profile picture AI-generation probability (ViT classifier), bio text originality, follower/following ratio over time',
        'Content feature layer: NLP model scoring text originality relative to recent posts by the same account (low originality = template-based posting), hashtag repetition rate, URL shortener abuse (bots rarely link to original sources), language model perplexity of posts (human text has characteristic perplexity range)',
        'Network feature layer: graph neural network trained on the follower/retweet graph; a bot account\'s neighborhood has distinctive structure — densely connected bot clusters with few bridges to the broader organic graph; GNN runs on sampled 3-hop neighborhood around each account',
        'Coordinated behavior detection: identify clusters of accounts that follow the same new accounts within a 1-hour window, retweet the same content within minutes, or use the same third-party app for posting; community detection algorithms (Louvain, DBSCAN) on these co-action matrices surface bot networks',
        'Adversarial robustness: ensemble multiple independent models trained on different feature subsets; an adversarial bot that evades one model is unlikely to evade all simultaneously; rotate the specific threshold values used in enforcement to prevent gaming',
        'Tiered enforcement based on confidence: score > 0.95 and coordinated network membership → automated suspension; score 0.8-0.95 → suppress from trending and recommendations, send to human review queue; score 0.6-0.8 → rate-limit and monitor; score < 0.6 → no action',
        'Continuous retraining: confirmed bot takedowns from trust and safety investigations become negative labels; randomly sampled active accounts confirmed human by reviewers become positive labels; retrain every 48 hours to adapt to evolving tactics',
      ],
      databaseChoice: 'Cassandra for account signal features (wide column, billions of accounts, fast single-key reads); Neo4j or custom adjacency store for network graph queries during cluster detection; Kafka for real-time event stream feeding feature updates; PostgreSQL for enforcement decisions and appeals; Spark for batch scoring of all 500M accounts weekly',
      caching: 'Recent bot scores cached in Redis with 24-hour TTL; hot account features cached in-process for viral amplification detection (top 1M accounts by daily engagement); cluster membership cached for 6 hours to avoid redundant graph traversal',
    },

    tips: [
      'Distinguish individual bot detection from coordinated network detection — they require fundamentally different signals and models',
      'The adversarial nature of the problem is key: mention that published detection features are immediately studied by bot operators, so the system must continuously evolve and some features must be kept confidential',
      'False positives on real users have serious harm implications — emphasize that automated actions should have a very high confidence threshold and that appeals must be fast and meaningful',
      'Graph neural networks for network features are a genuine strength — the network structure of a bot cluster is very hard to fake at scale',
      'Discuss tiered enforcement explicitly: suppressing from trending is a softer action than suspension, and allows you to act on medium-confidence signals without the harm of incorrectly silencing a real user',
    ],

    keyQuestions: [
      {
        question: 'How do you detect coordinated inauthentic behavior when individual accounts look legitimate?',
        answer: `The Core Insight: Individual bots can mimic humans across most dimensions. Networks of bots cannot hide their coordination patterns at scale.

Coordination Signals:
\`\`\`
1. Synchronized following: 500 accounts all follow the same new account
   within a 10-minute window
   → Probability this is organic: astronomically low

2. Retweet cascades: 1000 accounts retweet the same tweet within 90 seconds
   → Organic retweet cascades have a fat-tailed time distribution;
     bot cascades are nearly simultaneous

3. Content similarity clustering: cluster accounts by their post text embeddings
   → Bot networks posting templated variations cluster very tightly
   → Human accounts on the same topic have much higher intra-cluster variance

4. App/client coordination: 10,000 accounts all posting via "TweetBot Pro 3.1"
   → Real users have diverse client distributions; bot farms use the same tool
\`\`\`

Implementation: Co-Action Matrix:
\`\`\`
For each pair of accounts (A, B):
  co_follow_count = # accounts both followed within same hour in last 7 days
  co_retweet_count = # tweets both retweeted within same 5-min window

co_action_score = w1 * co_follow_count + w2 * co_retweet_count

Build adjacency graph: edge exists if co_action_score > threshold
Run Louvain community detection → surfaces coordinated clusters
\`\`\`

Why This Works: A bot network of 1000 accounts cannot avoid having high co-action scores with each other because they are all controlled by the same operator reacting to the same instructions. Even if each account posts at random intervals, the instructions arrive in a short window and the execution has detectable temporal correlation.`,
      },
      {
        question: 'How do you minimize false positives for real users with unusual posting patterns?',
        answer: `Who Gets Mis-classified:
- Live sports commentators posting 200+ times during a game
- Breaking news journalists tweeting every 5 minutes during a crisis
- Quoting accounts that retweet extensively
- Fan accounts with uniform posting schedules (scheduled posts)
- Non-English speakers whose text gets low originality scores from English-trained models

Defense 1: Verification and Context Signals:
\`\`\`
Features that strongly indicate human:
  - Phone-verified account
  - Linked blue-check identity
  - Interaction with verified humans (replies, not just retweets)
  - Content contains personal narrative elements (ML classifier)
  - Account has received organic non-bot replies
  - Payment method associated with account
\`\`\`

Defense 2: Calibrated Thresholds by Action Type:
\`\`\`
Suppress from trending: threshold 0.7  → accept 30% false positive rate among suppressed
Interstitial warning:   threshold 0.85 → accept 15% false positive rate
Account suspension:     threshold 0.95 → accept 5% false positive rate
Permanent ban:          ALWAYS requires human reviewer confirmation
\`\`\`

Defense 3: Fast Appeals:
- Suspended accounts can appeal within 24 hours
- Appeal automatically surfaces to human review queue
- Human reviewer has access to all signals that triggered the action
- Target: 90% of appeals resolved within 72 hours
- Overturned actions become high-quality negative training examples

Defense 4: Pre-emptive Whitelist:
- Known media organizations, political parties, and public figures pre-verified
- Their posting patterns are excluded from bot detection thresholds
- Requires ongoing maintenance as new public figures emerge`,
      },
    ],

    keyDecisions: [
      'Single monolithic model vs ensemble of specialized models — chose ensemble because a single model trained on all signals can be gamed more easily once its feature weights are inferred; independent models for account, content, and network features each require different evasion strategies simultaneously',
      'Graph neural network vs hand-crafted network features — chose GNN because the graph structure contains patterns (specific motifs in the 3-hop neighborhood of bot accounts) that are very difficult to hand-engineer but that GNN learns automatically',
      'Automated suspension vs human-reviewed suspension — chose human review required for all suspensions above suppression level because the consequences of false positives (silencing journalists, activists) are too severe to automate at any confidence threshold below 99%',
      'Public transparency about detection methods vs keeping them confidential — chose confidentiality for specific feature weights and thresholds while publishing general principles, because publishing specifics directly enables evasion',
      'Reactive detection vs proactive network analysis — chose both in parallel because reactive scoring handles individual new accounts and individual posts, while proactive network analysis detects coordinated campaigns that would be invisible to per-account reactive scoring',
    ],
  },

  // ─── 7. AI Click Fraud Detection ────────────────────────────────────────────
  {
    id: 'ai-click-fraud-detection',
    isNew: true,
    title: 'AI Click Fraud Detection System',
    subtitle: 'Solving Google Ads / Meta Ads Invalid Traffic with ML',
    icon: 'shield',
    color: '#dc2626',
    difficulty: 'Hard',
    description: 'Design an ML system that identifies invalid traffic on digital advertising platforms in real time, classifying clicks as general invalid traffic or sophisticated invalid traffic, and crediting advertisers for confirmed fraudulent clicks.',

    introduction: `Click fraud costs advertisers an estimated $35-40 billion per year globally. When advertisers pay per click, any system that generates artificial clicks drains their budget without delivering real potential customers. The perpetrators range from simple bots that crawl pages and click ads, to organized click farms using real mobile devices and human-like browsing patterns, to sophisticated competitor sabotage operations designed to exhaust a rival\'s daily ad budget.

The ad platform has a perverse incentive problem: click fraud revenue looks like legitimate revenue until advertisers discover it and reduce their budgets or leave the platform. In the long run, platforms that fail to police click fraud lose advertiser trust and revenue. Google and Meta both invest heavily in invalid traffic detection because their business depends on advertisers believing that the traffic they pay for is real.

The technical challenge is that invalid traffic detection must make decisions at the moment of the click, or shortly after, to prevent budget exhaustion. An advertiser with a $1000 daily budget cannot afford to wait 24 hours for fraud analysis before spend is reversed. At the same time, false positives — charging advertisers for valid clicks that are incorrectly labeled as fraud — would be equally damaging to advertiser trust.

The industry standard categorizes invalid traffic as GIVT (general invalid traffic — straightforward bots identifiable by user-agent strings, IP blocklists, or obvious behavioral patterns) and SIVT (sophisticated invalid traffic — human-operated click farms, sophisticated bots that mimic human behavior, and domain spoofing). GIVT is relatively easy to detect; SIVT requires the kind of behavioral and graph-based analysis that only becomes feasible with large ML infrastructure.`,

    functionalRequirements: [
      'Score each ad click for validity in real time within 200ms of click receipt',
      'Classify traffic as valid, GIVT, or SIVT with confidence scores',
      'Maintain IP and device blocklists updated from confirmed fraud signals',
      'Detect publisher-level fraud where a publisher systematically generates invalid traffic on their own inventory',
      'Issue credit-backs to advertisers for confirmed invalid clicks within 24 hours',
      'Provide advertiser-facing reporting on invalid traffic rates and credits received',
      'Feed confirmed fraud signals back into model retraining pipeline',
      'Alert trust and safety team when a new coordinated fraud campaign is detected',
    ],

    nonFunctionalRequirements: [
      'Click scoring latency under 200ms at p99 to avoid adding delay to ad serving',
      'GIVT detection accuracy above 99.5% with near-zero false positives',
      'SIVT detection recall above 80% with false positive rate under 2%',
      'System handles 1M clicks per second at peak global traffic',
      'Credit-back calculation auditable and explainable to advertisers',
    ],

    estimation: {
      users: '10M advertisers; 1M publisher sites; 500B ad clicks per year',
      storage: 'Click signal data: 500B clicks/yr * 1KB = 500TB/yr; 90-day retention for fraud analysis',
      bandwidth: '1M clicks/sec peak * 1KB per click = 1GB/sec ingest at peak',
      qps: '1M click score requests/sec; 50K credit-back calculations/hr',
    },

    apiDesign: {
      description: 'Click scoring called synchronously during ad serving; async pipeline handles post-click analysis and credit-back calculation.',
      endpoints: [
        { method: 'POST', path: '/api/clicks/score', params: '{ click_id, ad_id, publisher_id, user_agent, ip, device_fingerprint, referrer, click_timestamp, viewport_position, time_to_click_ms }', response: '{ validity: "valid"|"givt"|"sivt_suspected", confidence, action: "count"|"soft_filter"|"hard_filter" }', description: 'Real-time click scoring called by ad server before counting click' },
        { method: 'GET', path: '/api/publishers/{publisher_id}/ivt_rate', params: 'date_range', response: '{ ivt_rate, givt_rate, sivt_rate, total_clicks, flagged_clicks }', description: 'Publisher-level IVT dashboard' },
        { method: 'GET', path: '/api/advertisers/{advertiser_id}/credits', params: 'date_range', response: '{ total_credited_cents, credits: [{click_id, amount_cents, reason, credited_at}] }', description: 'Advertiser credit-back report' },
        { method: 'POST', path: '/api/blocklist/ip', params: '{ ip, reason, expires_at }', response: '{ added: true }', description: 'Add IP to real-time blocklist' },
        { method: 'GET', path: '/api/campaigns/health', params: 'campaign_id, date_range', response: '{ ivt_rate, suspicious_sources, recommended_actions }', description: 'Advertiser-facing campaign health report with IVT breakdown' },
      ],
    },

    dataModel: {
      description: 'Click records with validity scores, publisher-level IVT aggregates, and credit-back ledger for advertisers.',
      schema: `clicks {
  id: uuid PK
  ad_id: bigint FK
  campaign_id: bigint FK
  advertiser_id: bigint FK
  publisher_id: bigint FK
  ip_address: inet
  device_fingerprint: varchar(64)
  user_agent: text
  referrer: text nullable
  click_timestamp: timestamp
  time_to_click_ms: int  -- ms from ad load to click
  viewport_position: jsonb  -- {x, y, in_view: bool}
  validity: enum(valid, givt, sivt_suspected, sivt_confirmed)
  confidence: float
  model_version: varchar
  credited: bool
  credited_at: timestamp nullable
  credit_amount_cents: int nullable
}

publisher_ivt_daily {
  publisher_id: bigint
  date: date
  total_clicks: int
  givt_clicks: int
  sivt_clicks: int
  ivt_rate: float
  revenue_credited_back_cents: bigint
  PRIMARY KEY (publisher_id, date)
}

fraud_campaigns {
  id: bigint PK
  detected_at: timestamp
  campaign_type: enum(click_farm, bot_network, competitor_sabotage, domain_spoofing)
  affected_publishers: bigint[]
  affected_advertisers: bigint[]
  estimated_fraud_clicks: int
  status: enum(active, mitigated, investigating)
  mitigation_at: timestamp nullable
}`,
      examples: [
        { table: 'clicks', label: 'SIVT click from click farm', json: '{ "id": "click-a1b2c3d4", "publisher_id": 88102, "ip_address": "103.21.244.102", "time_to_click_ms": 87, "viewport_position": {"in_view": false}, "validity": "sivt_confirmed", "confidence": 0.94, "credited": true, "credit_amount_cents": 45 }' },
        { table: 'publisher_ivt_daily', label: 'High-fraud publisher', json: '{ "publisher_id": 88102, "date": "2025-06-10", "total_clicks": 48291, "givt_clicks": 12400, "sivt_clicks": 28100, "ivt_rate": 0.837, "revenue_credited_back_cents": 1842000 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'An IP blocklist blocks known data center IPs and previously identified fraud IPs. User-agent strings are matched against a list of known bot crawlers. Clicks that arrive within 100ms of ad load are filtered as too fast for a human to have read and intentionally clicked.',
      problems: [
        'IP blocklists require constant maintenance and are trivially evaded by rotating through residential proxy IP pools',
        'User-agent bot lists are easily spoofed — sophisticated bots send legitimate browser user-agent strings',
        'Time-to-click threshold does not work for click farms using real humans paid to click ads',
        'No publisher-level analysis means a publisher with 90% invalid traffic is not detected until an advertiser complains',
        'No credit-back system means advertisers pay for all fraud that passes the basic filter',
        'No feedback loop means the blocklist only grows from known historical patterns and cannot detect new fraud operations',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Signal ML with Publisher Graph Analysis and Real-Time Credit-Back',
      description: 'A real-time scoring model evaluates 100+ signals per click in under 150ms. Separately, a batch publisher analysis job identifies publishers with systematically high IVT rates and applies stricter thresholds to their traffic. A credit-back pipeline audits all SIVT-suspected clicks in the 24 hours after delivery and issues credits for confirmed fraud. A fraud campaign detector identifies coordinated attacks by clustering clicks with similar signal profiles.',
      keyPoints: [
        'Real-time click signals: time-to-click (under 200ms is nearly impossible for genuine reading and intentional click), viewport position (click on ad not in viewport = bot), mouse trajectory to click position (straight line vs human curve), IP reputation score (data center ranges, known VPN providers, recently flagged IPs), device fingerprint consistency (does this fingerprint match expected browser capabilities for the stated user-agent?)',
        'Post-click conversion signal: the strongest fraud signal is zero conversion from a traffic source; integrate with advertiser conversion pixels to flag publishers where CTR is high but conversion is exactly zero across all advertisers over 30 days',
        'Publisher pattern analysis: each publisher has an expected IVT rate based on traffic source, content category, and geography; publishers 3 sigma above their peer cohort flagged for investigation; publishers with IVT rate above 50% suspended from the network pending review',
        'Device graph for click farm detection: click farms often use real mobile devices but in tight geographic clusters; GPS coordinates of clicks from mobile ads that cluster in a single building suggest a click farm; device IDs that cycle through many different IPs in a single day (device-as-a-service fraud)',
        'Domain spoofing detection: verify that the ad actually served on the declared publisher domain by comparing ad server log URL against the click referrer; domain spoofing where a low-quality site claims to be a premium publisher is a major SIVT category',
        'Credit-back SLA: GIVT credits issued immediately (high confidence); SIVT credits issued within 24 hours after post-click analysis; maximum credit per advertiser per day capped to prevent gaming the credit system itself',
      ],
      databaseChoice: 'Redis for real-time IP reputation cache and in-flight click state (sub-millisecond reads); Kafka for click event stream; ClickHouse for click analytics, publisher IVT reports, and model training features; PostgreSQL for credit-back ledger and advertiser reports; S3 for archiving raw click data for 90-day fraud investigation window',
      caching: 'IP reputation scores cached in Redis with 1-hour TTL (updated when new fraud signals arrive); publisher IVT rates cached for 15 minutes; device fingerprint fraud flags cached for 24 hours; ad serving blocklist distributed to all edge servers via push update (under 60s propagation)',
    },

    tips: [
      'Explain the GIVT vs SIVT distinction early — interviewers expect you to know the industry terminology',
      'The conversion rate signal is the most powerful post-click fraud indicator — traffic that never converts across any advertiser is almost certainly fraudulent',
      'Publisher-level analysis catches fraud that is invisible at the click level — individual clicks may look legitimate but the publisher-level pattern exposes systematic fraud',
      'Domain spoofing is a major IVT category often overlooked — where a low-quality site claims to be a premium site to charge higher CPMs',
      'Discuss the credit-back system as a first-class component — fraud detection without compensation is insufficient; advertisers need to be made whole',
      'Mention the perverse incentive: the platform initially profits from fraud but loses trust long-term; detection is an investment in advertiser retention',
    ],

    keyQuestions: [
      {
        question: 'What is the difference between GIVT and SIVT, and how do you detect each?',
        answer: `GIVT (General Invalid Traffic):
Invalid traffic identifiable through basic filtering techniques:
- Known data center IP ranges (AWS, GCP, Azure — real users rarely browse from cloud IPs)
- Known bot user-agent strings (Googlebot, scrapers, common crawl)
- Pre-qualified bot lists (IAB/TAG blocklists)
- Spider and crawler signatures
- Obvious behavioral anomalies (click within 5ms of ad load)

Detection: simple lookup against blocklists and threshold rules. GIVT should be filtered before being counted as a billable click. Accuracy target: >99.9%.

SIVT (Sophisticated Invalid Traffic):
Traffic that does not fall into GIVT categories but is still invalid:
- Click farms: real mobile devices operated by humans paid $0.01 per click
- Ad stacking: multiple ads stacked on top of each other; only top ad is visible but all get click credit when user clicks
- Pixel stuffing: ad stuffed into a 1x1 pixel — not viewable but gets impression count
- Domain spoofing: ad served on fraudsite.com but click declares it was served on nytimes.com
- Sophisticated bots: user devices infected with adware that clicks ads in background while user is doing other things

Detection requires ML:
\`\`\`
SIVT signals:
  - Viewport position at click (in_view: false = likely stacking or pixel stuffing)
  - Geographic clustering of mobile clicks (click farm in one building)
  - Conversion rate zero across all advertisers from this publisher (traffic quality)
  - Browser fingerprint anomalies (claims to be Chrome but missing Chrome APIs)
  - Click timestamp pattern (same user clicks 200 ads in 30 minutes)
  - Ad duration (ad impression for 0.1 seconds before click = not viewed)
\`\`\`

Key difference: GIVT is caught by rules; SIVT requires behavioral and contextual ML because the traffic is deliberately crafted to evade rule-based detection.`,
      },
      {
        question: 'How do you handle click farms that use real human operators on real devices?',
        answer: `The Challenge:
Click farms hire humans to click ads using real smartphones. No single behavioral signal distinguishes a click farm worker from a real user.

Approach: Aggregate Pattern Analysis:
The fraudulent pattern emerges at the aggregate level even when individual clicks look legitimate.

\`\`\`
Geographic clustering:
  - 500 mobile ad clicks from the same building in Dhaka Bangladesh
  - All clicking ads for US-targeted products
  - Geographic impossibility: the advertisers\' target audience is in the US
  → Flag: geographic mismatch between audience targeting and click geography

Session pattern analysis:
  - Same device ID clicking 200 different ads from 200 different publishers in 4 hours
  - Real users visit 5-10 sites per browsing session
  → Flag: abnormal publisher diversity per device session

Post-click behavior:
  - All clicks from this source have 0-second dwell time on landing page (bounce instantly)
  - Click farm workers click and move on immediately; real users read the landing page
  → Flag: near-100% immediate bounce rate from this traffic source

Cross-advertiser conversion void:
  - Traffic from this publisher source: 50,000 clicks, 0 conversions across 200 advertisers
  - Probability of 0 conversions across all advertisers if traffic is real: effectively zero
  → Strongest signal: zero conversion is mathematically inconsistent with legitimate traffic
\`\`\`

Mitigation: publisher-level quarantine (stop serving ads to that publisher), geographic bid adjustments (reduce bids for traffic from known click-farm geographies), conversion-based payment models (pay per conversion, not per click — eliminates incentive for click fraud).`,
      },
    ],

    keyDecisions: [
      'Real-time scoring vs post-click analysis — chose both: real-time for GIVT (hard filter at click time) and post-click analysis for SIVT (softer filter with 24-hour credit-back), because real-time SIVT detection has too many false positives at the required latency budget',
      'IP-based blocklists vs behavioral ML — chose behavioral ML as primary with blocklists as a fast pre-filter, because behavioral signals generalize to new fraud operations while blocklists only cover known historical patterns',
      'Per-click analysis vs publisher-level analysis — chose both: per-click for immediate action, publisher-level for catching systematic fraud invisible at the individual click level',
      'Charge-back model vs credit-back model — chose credit-back (return money for confirmed fraud within 24 hours) rather than charge-back (dispute prevention), because charge-backs create bank relationship complexity; advertiser credits are operationally simpler',
      'Immediate suspension of high-IVT publishers vs graduated warnings — chose graduated response: warning at IVT 30%, traffic pause at 50%, suspension at 80%, because publishers may have partial legitimate traffic and immediate suspension causes legitimate advertiser coverage loss',
    ],
  },

  // ─── 8. AI Delivery ETA ──────────────────────────────────────────────────────
  {
    id: 'ai-delivery-eta',
    isNew: true,
    title: 'AI Delivery ETA Prediction System',
    subtitle: 'Solving DoorDash/UberEats Inaccurate Wait Times with ML',
    icon: 'globe',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design an ML system that accurately predicts multi-stage food delivery ETAs by modeling restaurant preparation time, pickup routing, and last-mile delivery independently, and continuously re-estimates as each stage completes.',

    introduction: `Inaccurate delivery ETAs are one of the top drivers of customer dissatisfaction in food delivery. When DoorDash first launched, ETAs were calculated as a simple sum of average restaurant prep time plus distance divided by average dasher speed. This approach was wrong roughly 40% of the time, with errors often exceeding 15 minutes. Customers who order food expecting 30-minute delivery and receive it in 50 minutes are significantly more likely to leave negative reviews and reduce their ordering frequency.

The challenge is that food delivery ETA is a three-stage pipeline, each with independent uncertainty: how long will this restaurant take to prepare this specific order? How long will a dasher take to travel from their current location to the restaurant? How long will the dasher take to travel from the restaurant to the delivery address? The errors in each stage compound: if each stage has 10-minute uncertainty, the total ETA uncertainty can be 20+ minutes even with good models.

Restaurant preparation time is the highest-variance component and the most difficult to model. A simple pizza takes 12 minutes. A complex custom dish from the same restaurant during dinner rush might take 45 minutes. The preparation time depends on the specific items ordered, the current order queue at the restaurant, time of day, day of week, staff levels, and hundreds of other factors that a model trained on historical data can partially capture.

Modern delivery platforms invest heavily in ETA accuracy because it directly impacts customer lifetime value. Platforms that consistently deliver within 2 minutes of their stated ETA see measurably higher repeat order rates. This creates competitive advantage: better ETA models are not just an engineering achievement but a business differentiator.`,

    functionalRequirements: [
      'Predict total delivery ETA at order placement time with confidence intervals',
      'Model restaurant preparation time based on order contents, restaurant load, and historical patterns',
      'Model dasher travel time to restaurant using real traffic-aware routing',
      'Model last-mile delivery time from restaurant to customer address',
      'Re-estimate ETA continuously as each stage completes and new signals arrive',
      'Surface ETA confidence intervals to customers rather than a single point estimate',
      'Alert operations team when an order is predicted to be significantly late',
      'Provide post-delivery accuracy analytics to identify model drift and improvement opportunities',
    ],

    nonFunctionalRequirements: [
      'Initial ETA prediction latency under 500ms at order placement',
      'ETA re-estimation latency under 100ms on each new signal',
      'Mean absolute error under 3 minutes for total delivery ETA at 30-minute deliveries',
      'Confidence interval coverage: 80% of deliveries should fall within the stated range',
      'Model retrained daily on previous day delivery outcomes',
    ],

    estimation: {
      users: '10M deliveries per day; 500K concurrent active orders at peak; 50K restaurants integrated',
      storage: 'Order ETA history: 10M deliveries/day * 20 ETA updates * 200 bytes = 40GB/day; retained 2 years',
      bandwidth: 'Dasher GPS updates: 500K dashers * 1 ping/10s * 100 bytes = 5MB/sec',
      qps: '500K ETA requests/sec at peak; 100K dasher location updates/sec; 500K order status events/sec',
    },

    apiDesign: {
      description: 'ETA API called at order placement and updated continuously via WebSocket push to customer app.',
      endpoints: [
        { method: 'POST', path: '/api/orders/{order_id}/eta', params: '{ restaurant_id, items: [{item_id, qty}], delivery_address, dasher_id? }', response: '{ total_eta_s, prep_eta_s, pickup_eta_s, delivery_eta_s, confidence_interval: {p10, p90} }', description: 'Initial ETA prediction at order placement; dasher may not be assigned yet' },
        { method: 'GET', path: '/api/orders/{order_id}/eta/live', params: '', response: '{ current_stage, remaining_eta_s, dasher_lat, dasher_lng, updated_at }', description: 'Real-time ETA and dasher location for customer tracking screen' },
        { method: 'POST', path: '/api/restaurants/{restaurant_id}/prep_time', params: '{ order_id, order_items, current_queue_size }', response: '{ predicted_prep_s, confidence }', description: 'Internal: get restaurant prep time prediction' },
        { method: 'POST', path: '/api/eta/feedback', params: '{ order_id, predicted_eta_s, actual_eta_s, late_reason?: string }', response: '{ logged: true }', description: 'Post-delivery feedback for model retraining' },
      ],
    },

    dataModel: {
      description: 'Order ETA predictions log for each stage; restaurant performance history for prep time modeling; dasher route performance for travel time calibration.',
      schema: `order_etas {
  id: bigint PK
  order_id: uuid FK
  predicted_at: timestamp
  stage: enum(placement, dasher_assigned, picked_up, en_route)
  total_eta_s: int
  prep_eta_s: int
  pickup_travel_eta_s: int
  delivery_travel_eta_s: int
  eta_p10_s: int
  eta_p90_s: int
  actual_total_s: int nullable  -- filled when delivered
  model_version: varchar
}

restaurant_prep_history {
  restaurant_id: bigint
  order_id: uuid
  item_count: int
  unique_item_types: int
  complexity_score: float  -- derived from item types
  hour_of_day: int
  day_of_week: int
  queue_size_at_order: int
  predicted_prep_s: int
  actual_prep_s: int  -- from restaurant POS or dasher arrival
  date: date
}

dasher_route_history {
  id: bigint PK
  dasher_id: bigint
  from_lat: float
  from_lng: float
  to_lat: float
  to_lng: float
  distance_km: float
  predicted_travel_s: int
  actual_travel_s: int
  traffic_conditions: enum(light, moderate, heavy)
  time_of_day: int
  day_of_week: int
  completed_at: timestamp
}`,
      examples: [
        { table: 'order_etas', label: 'Initial ETA at order placement', json: '{ "order_id": "ord-a1b2c3d4", "predicted_at": "2025-06-10T19:00:00Z", "stage": "placement", "total_eta_s": 1980, "prep_eta_s": 900, "pickup_travel_eta_s": 480, "delivery_travel_eta_s": 600, "eta_p10_s": 1680, "eta_p90_s": 2340 }' },
        { table: 'restaurant_prep_history', label: 'Lunch rush with high complexity order', json: '{ "restaurant_id": 4821, "item_count": 8, "unique_item_types": 6, "complexity_score": 0.82, "hour_of_day": 12, "queue_size_at_order": 14, "predicted_prep_s": 1380, "actual_prep_s": 1560 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'ETA is calculated as average restaurant prep time (from historical median) plus straight-line distance to restaurant divided by average dasher speed (20km/h) plus straight-line distance from restaurant to customer divided by 20km/h. A single ETA is set at order placement and never updated.',
      problems: [
        'Average restaurant prep time does not account for order complexity, restaurant queue, or time-of-day — the same restaurant takes 12 minutes for a burger and 40 minutes for a complex sushi order',
        'Straight-line distance divided by fixed speed ignores real road network, traffic, one-way streets, and parking difficulty',
        'Single point estimate without confidence interval misleads customers about uncertainty',
        'ETA never updates after order placement — customer sees 30 min even when the order is actually going to take 55 min',
        'No per-restaurant calibration — some restaurants are consistently 10 minutes faster than their menu suggests; others are consistently slower',
      ],
    },

    advancedImplementation: {
      title: 'Multi-Stage ML Pipeline with Real-Time Re-Estimation',
      description: 'Three independent ML models cover each delivery stage: a restaurant prep time model, a pickup routing model, and a last-mile delivery model. Each model produces a probability distribution over completion time, not just a point estimate. These distributions are combined to produce a total ETA distribution with meaningful confidence intervals. The system re-runs all three models at each stage transition with updated inputs, improving accuracy as uncertainty resolves.',
      keyPoints: [
        'Restaurant prep model features: menu item complexity score (number of ingredients, cook time category), number of items in order, current order queue at restaurant (from POS integration or dasher feedback on wait times), restaurant historical median prep time by day-of-week and hour-of-day, restaurant rating and volume tier (high-volume restaurants have more predictable prep times)',
        'Pickup routing model: Google Maps or proprietary traffic-aware routing API for travel time; dasher speed calibration (each dasher has a historical speed multiplier that adjusts predictions based on their individual driving patterns); time-of-day traffic patterns from historical GPS traces; parking difficulty score per restaurant (restaurants in dense downtown areas have longer effective travel times due to parking)',
        'Last-mile delivery model: apartment building entry complexity (high-rise buildings add 2-5 minutes); elevator availability; historical delivery times to the same address or building; distance-to-door from parking, which is often not the restaurant-to-address road distance',
        'Batching impact: when a dasher picks up two orders, delivery ETA for the second customer extends by the additional first-delivery time; the model must account for bath routing when predicting ETA for customers in a batched order',
        'Confidence interval propagation: each stage model produces a distribution; summing three independent distributions gives a total ETA distribution with wider tails than any individual stage; expose p10 (optimistic) and p90 (pessimistic) to customers as the range',
        'Real-time updates: when dasher is confirmed assigned, update pickup ETA with dasher\'s exact current location; when order is confirmed ready at restaurant, update remaining ETA to last-mile only; each update reduces uncertainty and typically narrows the confidence interval',
        'Late order detection: compare current real-time progress against model; if predicted completion has slipped more than 10 minutes from the customer\'s stated ETA, trigger a proactive notification and consider compensation credits',
      ],
      databaseChoice: 'PostgreSQL for order records and ETA audit log; Redis for real-time dasher location state and order status; Kafka for real-time event stream (dasher GPS, order status changes, restaurant confirmations); ClickHouse for ETA accuracy analytics and model training feature engineering; Google Maps Distance Matrix API for routing',
      caching: 'Restaurant prep time prediction cached per (restaurant, complexity_tier, hour_of_day) for 15 minutes; traffic conditions cached from Maps API with 2-minute TTL; dasher speed calibration factors cached in memory per dasher ID',
    },

    tips: [
      'Structure your answer around the three independent stages: prep time, pickup travel, and delivery travel — interviewers want to see you decompose the problem',
      'Restaurant preparation time is the hardest to predict and deserves the most detailed explanation — it is the component with highest variance and least external data',
      'Emphasize real-time re-estimation as a key differentiator: the ETA should update at each stage transition, not be a static number set at order placement',
      'Confidence intervals are increasingly expected in production ETA systems — a range is more honest and builds more trust than a false precision point estimate',
      'Batching (dasher picks up two orders) is a real complexity worth mentioning — it significantly complicates ETA prediction for the second customer',
    ],

    keyQuestions: [
      {
        question: 'How do you predict restaurant preparation time accurately?',
        answer: `Why Average Prep Time Fails:
A restaurant with average prep time 18 minutes might take 8 minutes for a simple salad and 45 minutes for a complex sushi platter during dinner rush with a queue of 12 orders.

Feature Engineering:
\`\`\`
Order features:
  - Item count: more items → longer prep
  - Unique item types: more unique = more parallel cooking tasks
  - Complexity score per item (hash browns=0.2, custom sushi roll=0.9)
  - Order total complexity = sum(item complexity * qty)
  - Any special instructions (each adds ~1 minute)

Restaurant state features:
  - Current queue size (from POS integration if available,
    else estimated from recent order volume from platform)
  - Time since last order was marked ready (proxy for kitchen pace)

Temporal features:
  - Hour of day (dinner rush 6-8pm: slower)
  - Day of week (Friday dinner: much slower)
  - Is holiday / special event nearby

Historical features:
  - Restaurant's 90th percentile prep time (for reliability estimate)
  - Restaurant's prep time variance (noisy kitchens = wider confidence interval)
  - Same order type at same restaurant last 30 days: median prep time
\`\`\`

Model: gradient-boosted regression outputting prep time in seconds, plus quantile regression for p10 and p90 bounds.

POS Integration (when available):
- Restaurant POS can send "order started" and "order ready" events
- These become ground truth labels for model training
- Also enable real-time re-estimation when order is marked started`,
      },
      {
        question: 'How do you handle the batching case where a dasher picks up two orders from different restaurants?',
        answer: `The Batching ETA Problem:
\`\`\`
Order A: customer at 5th Ave & 42nd St
Order B: customer at 5th Ave & 38th St (4 blocks south)

Dasher assigned to both:
  Restaurant A: 8th Ave & 40th St
  Restaurant B: 8th Ave & 35th St (1 block south of A)

Route:
  Dasher → Restaurant A (pick up A) → Restaurant B (pick up B)
         → Customer A delivery → Customer B delivery

ETA for Customer A depends on:
  1. Dasher travel to Restaurant A
  2. Wait for both A and B to be ready (whichever is later)
  3. Travel A→B for pickup
  4. Travel B→Customer A

ETA for Customer B depends on:
  1. All of above for Customer A
  2. Travel Customer A → Customer B
\`\`\`

Modeling Approach:
1. Detect batching at dispatch time (dasher assigned to multiple orders)
2. Run multi-stop routing to compute optimal pickup sequence
3. For each customer, the ETA is the full multi-stop route completion time, not just direct restaurant-to-customer
4. The customer who is delivered second gets a longer ETA — this is shown transparently to them as "your dasher has another pickup on the way"

Customer Communication:
- Show "Dasher is picking up your order and one other nearby order"
- ETA for second customer clearly reflects the additional stop
- For high-value or subscription customers, avoid batching to maintain ETA quality
- Track batching ETA accuracy separately — it has higher variance than single-order deliveries`,
      },
    ],

    keyDecisions: [
      'Three independent stage models vs single end-to-end model — chose three independent models because each stage has different predictive features and different improvement levers; a single model would obscure which stage is causing ETA errors',
      'Point estimate vs probability distribution output — chose distribution because it enables meaningful confidence intervals for customers and allows better downstream decision-making (late order alerts, compensation triggers)',
      'Static ETA at order placement vs continuous re-estimation — chose continuous re-estimation because uncertainty decreases dramatically as each stage completes; updating ETA when prep is confirmed ready (30-40% of remaining uncertainty resolved) significantly improves customer experience',
      'Google Maps routing vs proprietary routing — chose proprietary for delivery-specific routing because Google Maps optimizes for driver convenience while last-mile delivery has different constraints (no-right-turn delivery zones, parking spots only valid for 2-minute stops, building entrance locations)',
      'Mean absolute error as primary metric vs percentage within 5 minutes — chose both: MAE for engineering optimization, percentage-within-5-min for customer-facing reporting, because customer satisfaction is categorical (within window vs not) not continuous',
    ],
  },

  // ─── 9. AI Smart Pricing Rentals ────────────────────────────────────────────
  {
    id: 'ai-smart-pricing-rentals',
    isNew: true,
    title: 'AI Smart Pricing for Short-Term Rentals',
    subtitle: 'Solving Airbnb Host Pricing with ML — Beyond/PriceLabs',
    icon: 'database',
    color: '#ec4899',
    difficulty: 'Medium',
    description: 'Design an ML system that recommends dynamic nightly prices for short-term rental listings by modeling demand elasticity, market comparables, seasonal patterns, and local events to maximize host revenue.',

    introduction: `Short-term rental hosts face a persistent revenue optimization challenge: they lack the data, time, and expertise to optimally price their listings. A host with a single apartment in downtown Chicago has no visibility into how competitor occupancy is trending this weekend, whether there is a medical conference in town next month, or whether their current price is above or below their market-clearing rate. The result is systematic mispricing in both directions: listing too low during high-demand periods (sold out instantly, thousands of dollars left on the table) and too high during slow periods (calendar sits empty for weeks).

Dynamic pricing tools like Beyond, PriceLabs, and Wheelhouse solve this by aggregating market data at scale and running ML models that no individual host could build themselves. The core value proposition is information asymmetry reduction: the platform knows things about demand in your market that you cannot know individually.

What makes short-term rental pricing more complex than airline seat pricing is the property-level heterogeneity. Two apartments in the same building can have dramatically different price elasticity based on their view, furnishing quality, review score, and unique amenities. A model that works well at the market level must be adapted to the property level, which requires property-specific calibration from limited data.

The output of the system is not just a price recommendation but a pricing strategy: which dates to price premium, where to leave flexibility for last-minute bookings, how long a minimum stay to require to avoid leaving single-night gaps that reduce overall occupancy, and how to respond competitively when similar listings in the area adjust their prices.`,

    functionalRequirements: [
      'Generate nightly price recommendations for each listing for the next 90 days',
      'Model demand for each listing based on market comparables, seasonality, and local events',
      'Update recommendations in response to competitor price changes and booking velocity',
      'Apply host-specified constraints including minimum price, maximum price, and pricing style',
      'Recommend minimum stay requirements to prevent calendar fragmentation',
      'Detect local events including conferences, festivals, and sporting events affecting demand',
      'Provide performance analytics showing occupancy rate, revenue per available night, and comparison to market average',
      'Allow hosts to accept, modify, or reject recommendations with explanation of the reasoning',
    ],

    nonFunctionalRequirements: [
      'Price recommendations updated every 4 hours for the next 90-day calendar',
      'Event detection pipeline latency under 30 minutes from event announcement to price update',
      'Recommendations cover 100% of active listings without gaps',
      'Model training runs nightly on previous 90 days of actual booking outcomes',
      'Platform must handle 2M active listings across 50 countries',
    ],

    estimation: {
      users: '2M active listings globally; 50M traveler search sessions per day; 500K hosts using dynamic pricing',
      storage: 'Price recommendations: 2M listings * 90 days * 200 bytes * 6 updates/day = ~200GB/day',
      bandwidth: 'Competitor price crawl: ~20M listing pages/day from OTAs; ~500GB/day of raw HTML processed',
      qps: '~50K price API requests/sec from Airbnb search ranking integration; ~100K price update writes/hr',
    },

    apiDesign: {
      description: 'Price recommendations API called by host calendar sync; market data API for host dashboard analytics.',
      endpoints: [
        { method: 'GET', path: '/api/listings/{listing_id}/recommendations', params: 'start_date, end_date, include_reasoning', response: '{ dates: [{date, recommended_price, market_avg, occupancy_prob, events}] }', description: 'Get 90-day price calendar recommendations' },
        { method: 'POST', path: '/api/listings/{listing_id}/preferences', params: '{ min_price, max_price, pricing_style: "aggressive"|"balanced"|"conservative", min_stay_policy }', response: '{ applied: true }', description: 'Host sets pricing preferences and constraints' },
        { method: 'GET', path: '/api/market/{market_id}/demand', params: 'date_range, check_in_date', response: '{ demand_index, avg_price, occupancy_rate, events: [] }', description: 'Market demand forecast for a geographic market' },
        { method: 'GET', path: '/api/listings/{listing_id}/performance', params: 'date_range', response: '{ occupancy_rate, revpan, vs_market_occupancy, revenue, revenue_vs_optimal }', description: 'Host performance dashboard vs market benchmark' },
        { method: 'POST', path: '/api/listings/{listing_id}/price-override', params: '{ date, price, reason }', response: '{ applied: true }', description: 'Host overrides recommendation for a specific date' },
      ],
    },

    dataModel: {
      description: 'Listing attributes for property-level model calibration, market demand signals, and event calendar for forward-looking price adjustments.',
      schema: `listings {
  id: bigint PK
  platform_listing_id: varchar  -- Airbnb, VRBO listing ID
  market_id: bigint FK
  lat: float
  lng: float
  property_type: enum(entire_place, private_room, shared_room)
  bedrooms: int
  bathrooms: float
  max_guests: int
  amenities: varchar[]  -- pool, parking, washer, etc.
  review_score: float
  review_count: int
  host_response_rate: float
  host_is_superhost: bool
  photos_count: int
}

price_recommendations {
  listing_id: bigint
  date: date
  recommended_price: decimal(8,2)
  market_avg_price: decimal(8,2)
  occupancy_probability: float
  demand_index: float
  event_premium: float  -- extra price from local events
  generated_at: timestamp
  model_version: varchar
  PRIMARY KEY (listing_id, date)
}

local_events {
  id: bigint PK
  market_id: bigint FK
  name: varchar
  venue: varchar
  event_date: date
  event_end_date: date
  expected_attendance: int
  category: enum(sports, concert, conference, festival, holiday)
  price_impact_pct: float  -- estimated demand lift
  detected_at: timestamp
  source: enum(ticketmaster, eventbrite, scrape, manual)
}

booking_outcomes {
  listing_id: bigint
  date: date
  price_at_booking: decimal(8,2)
  booked: bool
  booking_lead_days: int  -- days before check-in when booking was made
  booking_channel: varchar
  recorded_at: timestamp
  PRIMARY KEY (listing_id, date)
}`,
      examples: [
        { table: 'price_recommendations', label: 'Conference weekend price premium', json: '{ "listing_id": 482910, "date": "2025-09-18", "recommended_price": 389.00, "market_avg_price": 210.00, "occupancy_probability": 0.95, "demand_index": 4.2, "event_premium": 179.00 }' },
        { table: 'local_events', label: 'Major medical conference', json: '{ "market_id": 42, "name": "AHA Scientific Sessions 2025", "event_date": "2025-09-17", "event_end_date": "2025-09-21", "expected_attendance": 22000, "category": "conference", "price_impact_pct": 85.0 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Hosts set a base price manually. A rule engine applies a fixed weekend premium (+20%), a summer season premium (+15%), and reduces price by 10% if the listing has not been booked in the last 14 days.',
      problems: [
        'Fixed percentage premiums do not reflect actual supply-demand dynamics in the specific market on specific dates',
        'No competitor price data means the host may be systematically over or under-priced relative to comparable listings',
        'No event detection means the system does not know about a conference bringing 20,000 visitors next weekend',
        'Reducing price after 14 days of no bookings is reactive — the listing may be too expensive for months before any adjustment triggers',
        'No property-level calibration means a 5-star superhost listing and a new unreviewed listing get the same percentage adjustments',
      ],
    },

    advancedImplementation: {
      title: 'ML Demand Forecasting with Property-Level Elasticity and Event Integration',
      description: 'A hierarchical demand forecasting model produces market-level demand indices per night and per property type. A property-level elasticity model calibrates the market signal for each listing based on its attributes, review score, and historical booking conversion rates. The price recommendation maximizes expected revenue considering demand probability at each price point. Local events are integrated from Ticketmaster, Eventbrite, and web scraping to produce forward-looking demand spikes.',
      keyPoints: [
        'Hierarchical model: top level forecasts demand at the city-market level (features: search volume trends, hotel occupancy for the market, airline seat sales to the destination, historical booking pace); lower level calibrates for neighborhood and property attributes',
        'Property-level elasticity calibration: new listings inherit market-level elasticity; as bookings accumulate, calibrate the listing-specific elasticity from the ratio of bookings at different price points relative to market-level conversion rates',
        'Comparable listing matching: identify 10-20 comparable listings (same neighborhood, similar size, similar amenity set, similar review score range) and use their real-time booking velocity and prices as direct demand signals',
        'Booking velocity signal: the most actionable real-time signal is booking pace; if similar listings for a target weekend are booking up 30% faster than typical for this time horizon, demand is elevated and prices should rise',
        'Last-minute discount model: as check-in date approaches and dates remain unbooked, the opportunity cost of leaving a date empty grows; the model recommends progressive discounts based on the probability of filling the gap at the current price vs a reduced price',
        'Minimum stay optimization: single-night gaps between bookings (Friday booked, Sunday booked, Saturday gap) should be filled with minimum stay requirements or gap-filling prices; the model recommends minimum stay lengths by date range to maximize total occupancy',
        'Event detection pipeline: ingest Ticketmaster, Eventbrite, and sports schedule APIs; extract venue location and expected attendance; estimate demand impact by event type and attendance size from historical event-to-booking correlation; translate to price premium recommendation for affected dates',
      ],
      databaseChoice: 'PostgreSQL for listing metadata, booking outcomes, and performance analytics; Redis for real-time comparable listing prices and booking velocity signals; ClickHouse for market-level demand analytics and model feature engineering at scale; Kafka for event detection pipeline and price update stream',
      caching: 'Current price recommendations cached per listing in Redis with 4-hour TTL; market demand index cached per market per date for 30 minutes; comparable listing set computed weekly (slow to change); local event calendar cached for 24 hours with invalidation on new event ingestion',
    },

    tips: [
      'Frame the problem as information asymmetry reduction: the host knows their property, the platform knows the market; the ML system bridges the gap',
      'Property-level elasticity calibration from limited data is the key technical challenge — explain how new listings borrow from market priors and calibrate over time',
      'Booking velocity is the strongest real-time demand signal and often more actionable than historical patterns',
      'Event detection deserves emphasis — conference and festival effects can double or triple demand for specific weekends',
      'Minimum stay recommendation is an underappreciated component that significantly improves total revenue by preventing calendar fragmentation',
    ],

    keyQuestions: [
      {
        question: 'How do you estimate price elasticity for a specific listing with limited booking history?',
        answer: `The Challenge:
A new listing has zero booking history, so you cannot estimate its specific price-demand curve. Even a 1-year-old listing may have only 50-100 bookings — not enough for a reliable individual elasticity estimate.

Hierarchical Bayesian Approach:
\`\`\`
Level 1: Market elasticity (estimated from millions of bookings)
  elasticity_market = -1.4 (1% price increase → 1.4% demand decrease)

Level 2: Property type elasticity (entire place vs private room)
  elasticity_entire_place = -1.2 (less elastic — higher-intent buyers)
  elasticity_private_room = -1.8 (more elastic — budget-sensitive)

Level 3: Property-specific elasticity (starts at market prior, updates with data)
  elasticity_listing = weighted_average(elasticity_market, elasticity_from_own_data)
  weight_own_data = min(1.0, n_bookings / 100)

  With 0 bookings:  elasticity_listing = elasticity_market (full prior)
  With 50 bookings: elasticity_listing = 0.5 * market + 0.5 * own_data
  With 200+ bookings: elasticity_listing ≈ own_data (prior mostly overridden)
\`\`\`

Property Attribute Adjustments:
Attributes shift elasticity even for new listings:
- Review score 4.9+: -0.2 elasticity (premium brand, less price sensitive)
- Zero reviews: +0.3 elasticity (high uncertainty → buyers very price sensitive)
- Superhost status: -0.1 elasticity
- Pool or unique amenity: -0.15 elasticity

Calibration Signal:
Track listing-level booking conversion rate at each price point vs market average. If this listing converts at 60% of market rate when priced at market average, its demand is lower → requires lower price for same occupancy.`,
      },
      {
        question: 'How do you detect local events and translate them into price adjustments?',
        answer: `Event Detection Sources:
\`\`\`
1. Structured APIs:
   - Ticketmaster API: concerts, sports, theater
   - Eventbrite API: conferences, festivals, community events
   - Sports reference APIs: game schedules, playoffs, championships
   - Government tourism APIs (some cities publish major event calendars)

2. Scraping:
   - Venue websites for events not on major platforms
   - Convention center calendars (medical conferences, trade shows)
   - University graduation schedules (high hotel demand)

3. Airline booking signals:
   - Spike in searches for destination market on specific dates
   - Hotel platform search volume spikes (licensed from OTA partners)
\`\`\`

Price Impact Estimation:
\`\`\`
Historical correlation by event type:
  NCAA Final Four in market:         +150% demand, +120% price premium
  Major music festival (50K+ attend): +80% demand, +70% price premium
  Medical conference (15K attend):    +45% demand, +40% price premium
  Local fair (<5K attend):            +15% demand, +10% price premium

Price impact formula:
  event_premium = base_price * price_impact_pct * proximity_decay

  proximity_decay = 1 if within 3km, 0.6 at 5km, 0.2 at 10km, 0 at 15km+
  (events primarily impact nearby listings)
\`\`\`

Lead Time Considerations:
- Major conferences: recommend price increase 90-180 days in advance (corporate travel books early)
- Concerts: demand spike 30-45 days before event (consumer tickets go on sale)
- Sporting events: depends on team performance (playoff demand is hard to predict in advance)
- Last-minute event addition: trigger immediate price update for all affected listings`,
      },
    ],

    keyDecisions: [
      'Market-level model vs listing-level model — chose hierarchical model that starts at market level and calibrates to listing level, because individual listings have too little data for independent elasticity estimation but market-level patterns are robust across thousands of bookings',
      'Revenue maximization vs occupancy maximization — chose revenue maximization (price * nights booked) because occupancy alone can be maximized by setting price to zero; most hosts prefer higher revenue even at lower occupancy',
      'Push recommendations vs host-pull dashboard — chose push (recommendations pushed to host calendar automatically within specified min/max constraints) because most hosts do not want to check a dashboard daily; a smart default with override capability is the right product design',
      'Structured API event data vs web scraping — chose both because structured APIs cover major events but miss local and niche events that significantly affect certain markets; scraping captures the long tail',
      'Static minimum stay rules vs ML-optimized minimum stay — chose ML optimization because fixed minimum stay rules (always 2 nights) create different amounts of calendar fragmentation depending on current booking pattern; optimal minimum stay varies by week and season',
    ],
  },

  // ─── 10. AI Job Matching ─────────────────────────────────────────────────────
  {
    id: 'ai-job-matching',
    isNew: true,
    title: 'AI Job Matching System',
    subtitle: 'Solving LinkedIn/Indeed Relevance with ML',
    icon: 'search',
    color: '#6366f1',
    difficulty: 'Medium',
    description: 'Design an ML system that matches job seekers to relevant job postings using semantic understanding, two-sided relevance modeling, and implicit feedback signals, replacing keyword search that returns irrelevant results.',

    introduction: `The failure mode of keyword-based job search is well-known to anyone who has used a job board. Search for "Python engineer" and receive hundreds of results where Python is mentioned once in a paragraph about legacy system migration while the core requirement is COBOL expertise. Or vice versa: a highly relevant job posting that uses different terminology is completely invisible. Candidates who cannot find relevant jobs waste time applying to mismatched positions, while employers waste time reviewing unqualified candidates. The system fails both sides of the market.

Semantic job matching addresses this by understanding what a candidate knows and can do, what a job actually requires, and how well they align — going beyond keyword overlap to genuine skill and role matching. A model that understands that "software engineer," "SWE," "developer," "programmer," and "coder" all refer to the same type of role, and that React experience implies JavaScript proficiency, can surface relevant matches that keyword search would miss.

The two-sided nature of the matching problem is important and often underappreciated. A matching score should reflect not just how well the candidate fits the job, but also how attractive the job is to the candidate. A senior engineer being matched to an entry-level job is a poor match even if their skills technically qualify them. A candidate applying to a role in a city they have explicitly excluded from their search is a poor match even if the role is otherwise perfect.

Training signals are a central challenge: the ideal training label is a successful hire, but successful hires are rare events with long feedback cycles (months from application to offer). Intermediate signals — applications, response rates, interviews, offers — are more abundant but each carries different noise. Designing a training pipeline that correctly uses these multi-stage implicit signals is as important as the model architecture itself.`,

    functionalRequirements: [
      'Surface the most relevant job postings for each active job seeker based on their profile and preferences',
      'Rank candidates for each job posting to help recruiters prioritize their outreach',
      'Understand semantic relationships between skills, titles, and industries beyond keyword matching',
      'Apply candidate-stated preferences including location, salary range, remote work, and role type',
      'Use implicit engagement signals including applications, clicks, and save actions as training feedback',
      'Handle cold start for new job postings with no interaction history',
      'Provide explainability showing why a job was recommended to a candidate',
      'Support A/B testing of different matching models to measure job seeker engagement and hiring outcomes',
    ],

    nonFunctionalRequirements: [
      'Job recommendations served under 100ms for active job seekers on the platform',
      'New job postings appear in recommendations within 5 minutes of publication',
      'Model retrained daily incorporating previous day engagement and hiring signals',
      'Coverage of 100% of active job postings within 24 hours of posting',
      'System handles 50M active job seekers and 5M active job postings simultaneously',
    ],

    estimation: {
      users: '50M job seekers; 500K recruiters; 5M active job postings at any time; 1M new postings per month',
      storage: 'Job and candidate embeddings: (5M + 50M) * 768 floats * 4 bytes = ~170GB for embedding index',
      bandwidth: 'Recommendation requests: 10M job seeker sessions/day * 5 recommendation fetches = 50M requests/day',
      qps: '~1000 recommendation requests/sec; 10K new job postings/day for real-time indexing; 500K interaction events/hr',
    },

    apiDesign: {
      description: 'Recommendation API serves personalized job feeds; recruiter API exposes candidate ranking for each job.',
      endpoints: [
        { method: 'GET', path: '/api/jobs/recommended', params: 'user_id, limit, offset, filters: {remote, salary_min, location}', response: '{ jobs: [{id, title, company, match_score, match_reasons: []}] }', description: 'Personalized job feed for a job seeker' },
        { method: 'GET', path: '/api/jobs/{job_id}/candidates', params: 'limit, offset, min_match_score', response: '{ candidates: [{user_id, match_score, top_skills, application_status}] }', description: 'Ranked candidate list for recruiters' },
        { method: 'POST', path: '/api/jobs', params: '{ title, description, requirements, location, salary_range, remote_policy }', response: '{ job_id, indexed_at }', description: 'Post a new job; triggers immediate embedding and indexing' },
        { method: 'POST', path: '/api/interactions', params: '{ user_id, job_id, event_type: "view"|"apply"|"save"|"dismiss", duration_s? }', response: '{ received: true }', description: 'Log candidate interaction with a job posting' },
        { method: 'GET', path: '/api/jobs/{job_id}/match-explanation', params: 'user_id', response: '{ score, skill_matches: [], title_similarity, location_match, salary_fit, gaps: [] }', description: 'Detailed match explanation for transparency' },
      ],
    },

    dataModel: {
      description: 'Candidate and job embeddings for ANN retrieval, interaction log for model training, and match explanations for transparency.',
      schema: `candidate_profiles {
  user_id: bigint PK
  headline: text
  summary: text
  skills: varchar[]  -- normalized skill names
  experience: jsonb  -- [{title, company, start, end, description}]
  education: jsonb
  location_preference: varchar[]
  remote_preference: enum(required, preferred, open, no)
  salary_expectation_min: int nullable
  open_to_work: bool
  embedding: vector(768)  -- from profile text via BERT-class model
  embedding_updated_at: timestamp
}

job_postings {
  id: bigint PK
  title: text
  company_id: bigint FK
  description: text
  required_skills: varchar[]
  nice_to_have_skills: varchar[]
  experience_level: enum(entry, mid, senior, staff, principal)
  location: varchar
  remote_policy: enum(required_onsite, hybrid, fully_remote)
  salary_min: int nullable
  salary_max: int nullable
  embedding: vector(768)
  posted_at: timestamp
  expires_at: timestamp
  is_active: bool
}

job_interactions {
  id: bigint PK
  user_id: bigint FK
  job_id: bigint FK
  event_type: enum(impression, click, apply, save, dismiss, interview, offer, hire)
  occurred_at: timestamp
  duration_s: int nullable  -- time spent on job page before action
  source: enum(recommendation, search, recruiter_outreach, email)
}`,
      examples: [
        { table: 'candidate_profiles', label: 'Senior software engineer profile', json: '{ "user_id": 8829104, "headline": "Senior Software Engineer — React, Node.js, AWS", "skills": ["javascript", "typescript", "react", "nodejs", "aws", "postgresql"], "experience_level_inferred": "senior", "open_to_work": true, "remote_preference": "preferred" }' },
        { table: 'job_postings', label: 'Well-matched job posting', json: '{ "id": 4481920, "title": "Senior Frontend Engineer", "required_skills": ["react", "typescript", "javascript"], "experience_level": "senior", "remote_policy": "fully_remote", "salary_min": 150000, "salary_max": 190000 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A full-text search engine (Elasticsearch) indexes job postings. Candidate searches by keywords. Results are sorted by recency and keyword match score (BM25). Recruiters manually search candidate profiles by skill keywords.',
      problems: [
        'Keyword matching fails on vocabulary mismatch: "software engineer" does not match "developer" in keyword search',
        'No semantic understanding means React experience does not imply JavaScript proficiency in the search model',
        'Single-direction matching: candidates search jobs but recruiters cannot easily discover relevant candidates',
        'No personalization: the same search by two different engineers returns identical results regardless of seniority or specialty',
        'No implicit signal use: applications and saved jobs are not used to improve future recommendations',
        'Cold start: new job postings have no engagement history and appear only by recency, not relevance',
      ],
    },

    advancedImplementation: {
      title: 'Two-Stage Retrieval and Ranking with Two-Sided Relevance Modeling',
      description: 'A two-stage pipeline separates retrieval from ranking. The retrieval stage uses ANN search over dense embeddings to find the top-200 most semantically similar jobs for a candidate. The ranking stage applies a full-featured scoring model that considers two-sided relevance, preference filters, and personalized signals to produce the final ordered list. The same architecture works in reverse for recruiter candidate ranking.',
      keyPoints: [
        'Dense embedding model: fine-tuned BERT model trained on job title-description pairs creates 768-dim embeddings; separate models for candidates (profile → embedding) and jobs (description → embedding); embeddings aligned so cosine similarity measures semantic relevance',
        'ANN retrieval with HNSW index: 5M job postings indexed in HNSW; query with candidate embedding to retrieve top-200 semantically similar jobs in under 20ms; pre-filter by location and remote preference before ANN to reduce candidate set',
        'Two-sided ranking model: features include embedding cosine similarity, skill overlap rate, title seniority alignment (candidate is senior → penalize entry-level jobs), salary fit (candidate expectation within job range), company preference signals, job freshness, job-level engagement rate (highly applied-to jobs have some signal of attractiveness), candidate application success rate on similar jobs',
        'Skills graph for implicit skill inference: construct a skills co-occurrence graph from job postings (jobs that require React often also require JavaScript); a candidate with React gets an implicit JavaScript skill score of 0.9; this enables matching on skills the candidate did not explicitly list',
        'Training signal pipeline: multiple engagement events with different weights — impression without click (mild negative), click then leave immediately (mild negative), apply (strong positive), interview (very strong positive), hire (strongest positive); use survival analysis to handle the delayed nature of hire labels',
        'Cold start for new jobs: immediately embed the job description on posting; use content-based matching against candidate profiles without interaction history; as first applications arrive, blend in collaborative filtering signals',
        'Position bias correction: candidates click jobs shown at position 1 more than position 10 regardless of relevance; training must correct for position bias using inverse propensity weighting',
      ],
      databaseChoice: 'Qdrant or Weaviate for vector search index (HNSW, supports filtered ANN); PostgreSQL for profile and job metadata; Kafka for real-time interaction event stream; Redis for candidate recommendation cache; ClickHouse for interaction analytics and model training feature generation',
      caching: 'Candidate embedding cached for 24 hours (profile changes rarely); job embedding cached for 7 days (job description rarely changes after posting); recommendation list cached per candidate for 15 minutes; skills graph cached in application memory with weekly refresh',
    },

    tips: [
      'Two-sided relevance is the key differentiator from simple job search — the system must score both how well the candidate fits the job and how attractive the job is to the candidate',
      'Training signal design is often the hardest part — explain why you use multiple signal types and how you weight them differently',
      'Position bias correction is important to mention — without it, your ranking model learns to rank things that were shown at position 1, creating a feedback loop',
      'The skills graph for implicit inference is a clever approach worth explaining — candidates often do not enumerate all their skills explicitly',
      'Cold start for new jobs is a real challenge at scale — explain the content-based fallback that kicks in before interaction data accumulates',
    ],

    keyQuestions: [
      {
        question: 'How do you model two-sided relevance where both the job-candidate fit and the job attractiveness to the candidate matter?',
        answer: `The Problem with One-Sided Scoring:
A system that only scores "how well does the candidate fit the job" would recommend a senior engineer for every senior role regardless of whether the role matches what the candidate wants. This leads to low application rates even with high match scores.

Two-Sided Relevance Components:
\`\`\`
1. Candidate-to-Job fit (employer perspective):
   - Skills overlap: (required_skills ∩ candidate_skills) / len(required_skills)
   - Experience level alignment: seniority match (senior candidate × senior role = good)
   - Domain match: cosine_similarity(candidate_embedding, job_embedding)

2. Job-to-Candidate fit (candidate perspective):
   - Location preference match: is the job in one of candidate's preferred locations?
   - Remote policy match: candidate requires remote → only fully_remote jobs score high
   - Salary fit: candidate expectation within job range → 1.0; above range → 0.0
   - Company preferences: candidate previously saved or applied to this company
   - Career growth signal: does this role represent an advancement for the candidate?

Combined score:
  match_score = w1 * candidate_to_job_fit + w2 * job_to_candidate_fit

  Where w1 and w2 are learned from engagement data:
  - If candidates primarily engage with jobs that match their preferences, w2 > w1
  - If candidates primarily engage based on skill match, w1 > w2
\`\`\`

Why This Matters in Practice:
A perfect skill match for a job that pays 40% below candidate expectation will never get clicked. A model that ignores candidate preferences ranks irrelevant jobs at the top and has poor engagement metrics even with good skill matching.`,
      },
      {
        question: 'How do you handle cold start for a new job posting with zero interaction history?',
        answer: `The Challenge:
A new job posted at 9 AM Monday has zero clicks, zero applications, and zero signals. How do you rank it against established postings with rich interaction history?

Content-Based Bootstrap:
\`\`\`
Step 1: Embed the job immediately on posting
  job_embedding = bert_model.encode(title + description + requirements)

Step 2: Index in vector store for ANN retrieval
  vector_store.upsert(job_id, job_embedding)

Step 3: Find similar established jobs
  similar_jobs = vector_store.query(job_embedding, top_k=10, filter={has_interactions: true})

Step 4: Use similar jobs\' engagement metrics as a prior
  engagement_prior = avg(similar_jobs.application_rate)
  freshness_boost = exponential_decay_by_hours_since_posting (new jobs get a boost)
  cold_start_score = content_similarity * engagement_prior * freshness_boost
\`\`\`

Freshness Boost Rationale:
New job postings have genuine value: they may be exactly what a candidate is looking for and have not yet accumulated the engagement signals that would surface them in a pure engagement-ranked system. A freshness boost ensures new postings get exposure to build their interaction history.

Graduation from Cold Start:
After first 10 applications:
  score = 0.8 * cold_start_score + 0.2 * collaborative_filtering_score

After 50 applications:
  score = 0.2 * cold_start_score + 0.8 * collaborative_filtering_score

After 200 applications:
  score = pure collaborative filtering (cold start fully replaced by interaction data)`,
      },
    ],

    keyDecisions: [
      'Dense embedding similarity vs BM25 keyword matching for retrieval — chose dense embeddings as primary retrieval because they capture semantic relationships (React implies JavaScript, "software engineer" matches "developer") that BM25 cannot; BM25 used as a complementary signal in the ranking stage for exact skill name matches',
      'Single-sided job-candidate fit vs two-sided relevance — chose two-sided because optimizing only for employer-side fit produces high-quality candidates who never apply because the job does not match their preferences; engagement metrics improve dramatically when candidate preferences are respected',
      'Application signal vs hire signal for training — chose a multi-signal approach weighting hire (1.0), offer (0.7), interview (0.5), apply (0.2), save (0.1) because pure hire signal is too sparse (months of delay, rare events) but pure application signal rewards clickbait job posts over genuinely good fits',
      'Shared embedding space vs separate candidate and job encoders — chose separate encoders with alignment training (dual-encoder architecture) because candidate profiles and job descriptions have very different text structures; separate encoders better capture each domain, then alignment loss brings them into comparable space',
      'Real-time personalization vs batched recommendation generation — chose real-time for core recommendation with 15-minute cache, because job seeker activity (new application, profile update) should immediately affect their next recommendation batch; full batch generation per candidate would require rerunning for all candidates after every interaction',
    ],
  },

  // ─── 11. AI E-commerce Search Ranking ────────────────────────────────────────
  {
    id: 'ai-ecommerce-search-ranking',
    isNew: true,
    title: 'AI E-commerce Search Ranking System',
    subtitle: 'Solving Amazon/Shopify Search Relevance with ML',
    icon: 'search',
    color: '#f59e0b',
    difficulty: 'Hard',
    description: 'Design an ML-powered search ranking system for e-commerce that combines semantic understanding, behavioral signals, business objectives, and real-time personalization to surface the most relevant and commercially optimal products.',

    introduction: `E-commerce search is one of the highest-value ML problems in industry. Studies consistently show that 30-40% of e-commerce revenue can be attributed to search, and improving search relevance by 10% often translates directly to millions or hundreds of millions of dollars in additional annual revenue. Amazon invests more in search infrastructure than most companies spend on their entire engineering organization, because the ROI is so clear.

The fundamental problem is multi-objective: a perfect search result is one that is (1) semantically relevant to the query, (2) likely to result in a purchase for this specific customer, (3) commercially advantageous to the platform, and (4) commercially advantageous to the seller. These objectives often conflict. The most commercially advantageous product for the platform might be a high-margin item with mediocre relevance. The most relevant item might be out of stock. The product the customer is most likely to buy might be different from what they searched for because their query was ambiguous.

Keyword search handles the relevance dimension poorly and ignores the other three entirely. A system that serves "running shoes" queries returns products that mention "running" and "shoes" frequently, which may or may not be what the customer intends, and takes no account of the customer's size, preferred brands, price range, or the platform's commercial objectives for this category.

Modern e-commerce search uses a two-stage architecture: a fast recall stage that retrieves hundreds of candidates using a combination of BM25 and dense vector search, followed by a sophisticated ranking stage that applies a learned model with hundreds of features to order the candidates. The ranking stage is where most of the commercial value is created, because it can incorporate personalization, business rules, and real-time context that the recall stage cannot.`,

    functionalRequirements: [
      'Return relevant product results for keyword, semantic, and image-based search queries',
      'Personalize results based on customer browsing and purchase history',
      'Apply business rules including promoted listings, inventory constraints, and seller quality tiers',
      'Handle query understanding including entity extraction, intent detection, and spell correction',
      'Support faceted filtering by price, brand, category, rating, and other attributes',
      'Provide query autocomplete suggestions based on popular and personalized searches',
      'Surface results in under 200ms for the complete search page including ranking and facets',
      'Enable A/B testing of ranking models to measure impact on revenue and customer satisfaction',
    ],

    nonFunctionalRequirements: [
      'Search response time under 200ms at p99 including ranking and facet computation',
      'Recall stage must retrieve at least one relevant product from top-10 in over 95% of queries',
      'New product listings appear in search results within 5 minutes of publication',
      'Ranking model update deployable within 4 hours of training completion',
      'System must handle 100K search queries per second at peak (Black Friday scale)',
    ],

    estimation: {
      users: '100M customers; 500M product listings; 1B searches per day',
      storage: 'Product embeddings: 500M products * 768 floats * 4 bytes = ~1.5TB; BM25 inverted index: ~5TB',
      bandwidth: 'Search results: 1B queries/day * 20 product results * 5KB per result = ~100TB/day served',
      qps: '~100K search requests/sec at peak; 50K product index updates/hr',
    },

    apiDesign: {
      description: 'Search API returns ranked product list; separate APIs for autocomplete and business rule management.',
      endpoints: [
        { method: 'GET', path: '/api/search', params: 'query, user_id?, filters: {price_range, brand, rating}, sort, page, limit', response: '{ products: [{id, title, price, score, ad_label?}], total, facets, query_rewrite? }', description: 'Main search endpoint returning ranked product list' },
        { method: 'GET', path: '/api/search/autocomplete', params: 'prefix, user_id?, limit', response: '{ suggestions: [{text, type: "query"|"product"|"category", count}] }', description: 'Typeahead suggestions as user types' },
        { method: 'POST', path: '/api/search/events', params: '{ query_id, product_id, event: "click"|"add_to_cart"|"purchase"|"bounce", position }', response: '{ logged: true }', description: 'Log engagement event for model training' },
        { method: 'PUT', path: '/api/products/{product_id}/index', params: '{ title, description, attributes, price, stock }', response: '{ indexed_at }', description: 'Index or update a product in search' },
        { method: 'POST', path: '/api/search/business-rules', params: '{ rule_type: "boost"|"bury"|"pin", product_ids, query_patterns, priority }', response: '{ rule_id }', description: 'Merchandiser sets business rules for specific queries' },
      ],
    },

    dataModel: {
      description: 'Products indexed for full-text and vector search; query log for model training; business rules for merchandiser overrides.',
      schema: `products {
  id: bigint PK
  title: text
  description: text
  brand: varchar
  category_path: varchar[]  -- ['Electronics', 'Phones', 'Smartphones']
  price: decimal(10,2)
  sale_price: decimal nullable
  rating_avg: float
  rating_count: int
  inventory_status: enum(in_stock, low_stock, out_of_stock, discontinued)
  seller_id: bigint FK
  seller_quality_score: float
  fulfillment_days: int
  image_urls: text[]
  attributes: jsonb
  embedding: vector(768)
  bm25_indexed_at: timestamp
  created_at: timestamp
  is_active: bool
}

search_query_log {
  query_id: uuid PK
  user_id: bigint nullable
  raw_query: text
  rewritten_query: text nullable
  intent: enum(navigational, transactional, informational)
  returned_products: bigint[]  -- top-10 product IDs shown
  positions: int[]  -- positions at which each product appeared
  clicked_positions: int[]
  added_to_cart_positions: int[]
  purchased_positions: int[]
  session_id: uuid
  searched_at: timestamp
}

business_rules {
  id: bigint PK
  rule_type: enum(boost, bury, pin, block)
  product_ids: bigint[]
  query_patterns: text[]  -- wildcard or regex patterns
  boost_factor: float nullable
  pin_position: int nullable
  active_from: timestamp
  active_until: timestamp nullable
  created_by: bigint
}`,
      examples: [
        { table: 'products', label: 'Top-selling smartphone listing', json: '{ "id": 8829104, "title": "Samsung Galaxy S25 128GB Unlocked", "brand": "Samsung", "category_path": ["Electronics", "Phones", "Smartphones"], "price": 799.99, "rating_avg": 4.7, "rating_count": 28420, "inventory_status": "in_stock", "seller_quality_score": 0.98 }' },
        { table: 'search_query_log', label: 'Successful search session', json: '{ "query_id": "q-a1b2c3d4", "raw_query": "wireless earbuds noise cancelling", "returned_products": [8829104, 7391028, ...], "clicked_positions": [0, 2], "purchased_positions": [0] }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'Elasticsearch full-text search with BM25 scoring returns results sorted by keyword relevance. Products are boosted by rating count (popularity). No personalization, no semantic understanding, no business rules beyond manual category curation.',
      problems: [
        'BM25 keyword matching fails on semantic queries: "comfortable shoes for walking" does not match "ergonomic walking footwear" even though they mean the same thing',
        'Popularity boost favors established products over newer better products, creating a rich-get-richer dynamic that harms product discovery',
        'No personalization means a 6-year-old searching "shoes" and a marathoner searching "shoes" get identical results',
        'Out-of-stock products can rank first if they match the query well, frustrating customers who cannot purchase them',
        'No business rules support means merchandisers cannot promote sponsored products or suppress underperforming SKUs for specific queries',
      ],
    },

    advancedImplementation: {
      title: 'Two-Stage Retrieval-Ranking with Learning-to-Rank and Business Rule Integration',
      description: 'A two-stage pipeline separates recall from ranking. The recall stage retrieves top-500 candidates using hybrid BM25 and dense ANN retrieval, pre-filtered by inventory status and seller quality. The ranking stage applies a LambdaMART or neural ranker with 200+ features including relevance, engagement history, personalization, business signals, and explicit business rules. A post-processing layer applies pinned promotions and mandatory blocks before final result delivery.',
      keyPoints: [
        'Recall stage: hybrid retrieval with BM25 (Elasticsearch) for keyword precision and dense ANN retrieval (HNSW over product embeddings) for semantic recall; fuse results using reciprocal rank fusion; pre-filter removes out-of-stock, blocked, and below-quality-threshold products before ranking',
        'Query understanding: query classification (navigational vs transactional vs informational), entity extraction (brand name, product category, attributes like "size 10" or "red"), spell correction, and query rewriting for poorly performing queries (logged query with zero clicks → query reformulation model suggests alternatives)',
        'Ranking features: embedding cosine similarity (semantic match), BM25 score (lexical match), historical CTR at this query (popularity), historical purchase rate (purchase intent signal), customer-specific purchase probability (personalization model prediction), price competitiveness vs category average, seller quality score, fulfillment speed, inventory level, review quality score, promoted bid amount',
        'Learning-to-rank training: collect implicit labels from search session log; create training examples as (query, product, label) triples where label is derived from engagement (purchase=3, add-to-cart=2, click=1, no-click=0); correct for position bias using inverse propensity weighting (clicks at position 1 are discounted because position 1 gets more clicks regardless of relevance)',
        'Position bias correction is critical: without it, the model learns that position 1 products are relevant because they get clicked most, creating a feedback loop where the first result stays first regardless of actual quality',
        'Business rule post-processing: after ML ranking, apply merchandiser rules (pin product X to position 1 for query "summer dress", block product Y from all results, boost promoted products by a factor without fully overriding ML ranking)',
        'Real-time personalization: candidate scoring includes a personalization feature vector derived from the customer\'s browsing and purchase history; avoids cold start by using segment-level predictions when individual history is sparse',
      ],
      databaseChoice: 'Elasticsearch for BM25 full-text search and inverted index; Qdrant for dense vector ANN search with metadata filtering; PostgreSQL for product metadata and business rules; Kafka for real-time engagement event stream; Redis for query-level caches and session personalization state; ClickHouse for click-through analytics and model training data',
      caching: 'Popular query results cached in Redis with 5-minute TTL (popular queries repeat frequently); product embeddings cached in vector store (update on product change only); personalization feature vector cached per user for 1 hour; facet counts cached per query for 2 minutes',
    },

    tips: [
      'Two-stage architecture is the standard and expected answer — recall then rank, with different constraints on each stage',
      'Position bias correction is a subtle but important concept — many interviewers will be impressed if you mention it and explain it clearly',
      'Business rules layer after ML ranking is a non-negotiable requirement in real e-commerce — merchandisers need override capability for promotions, sponsored placements, and legal compliance',
      'Explain why BM25 alone fails with a concrete example: query "comfortable shoes for walking" vs product "ergonomic walking footwear" — zero keyword overlap, but highly relevant',
      'Revenue impact of search ranking improvements is massive and worth mentioning — framing the problem in business terms shows maturity',
    ],

    keyQuestions: [
      {
        question: 'How does learning-to-rank work and what labels do you use for training?',
        answer: `Problem Formulation:
Given a query Q and a set of candidate products {P1, P2, ...Pn}, learn a scoring function that orders products from most to least relevant to maximize revenue-weighted engagement.

Training Label Construction:
\`\`\`
From search session logs, for each (query, product) pair:
  - Product purchased in this session:     label = 3.0
  - Product added to cart (not purchased):  label = 2.0
  - Product clicked (not added to cart):    label = 1.0
  - Product shown (not clicked):            label = 0.0
\`\`\`

Position Bias Problem:
Product shown at position 1 gets clicked 5x more than same product at position 5. Without correction, model thinks position-1 products are more relevant.

Inverse Propensity Weighting:
\`\`\`python
# Estimated probability of clicking position k (from randomization experiments)
propensity = {1: 0.35, 2: 0.15, 3: 0.10, 4: 0.07, 5: 0.05, ...}

# Weight each training example by 1/propensity[position]
sample_weight = 1.0 / propensity[position_shown_at]

# Now a click at position 5 (weight=20) is worth the same as 4 clicks at position 1 (weight=2.86 each)
\`\`\`

Model Architecture:
LambdaMART (gradient-boosted trees with LambdaRank loss):
- Works well on tabular ranking features
- Fast inference (milliseconds for 500 candidates)
- Good handling of label noise

Alternative: neural ranker (BERT + MLP on feature vector):
- Better semantic understanding
- Slower inference (50-100ms for 500 candidates)
- Often 2-5% NDCG improvement over GBT for complex queries

Evaluation Metrics:
- NDCG@10: primary offline metric (normalized discounted cumulative gain)
- Revenue per search: primary online metric (A/B test)
- CTR: secondary online metric`,
      },
      {
        question: 'How do you balance relevance vs business objectives like margin and promoted listings?',
        answer: `The Multi-Objective Tension:
\`\`\`
Pure relevance ranking:  best match for customer query
Pure revenue ranking:    highest margin products
Pure seller-paid ranking: highest bidder wins position

Reality: all three objectives matter and conflict
\`\`\`

Approach 1: Feature-Based Business Signals in Ranking Model:
Include commercial signals as features in the LTR model:
\`\`\`
ranking_score = model(semantic_relevance, click_probability, purchase_probability,
                      seller_quality, margin_tier, inventory_level,
                      promoted_bid_amount * quality_score)
\`\`\`

The model learns the optimal blend from training data. Promoted listings get a boost only when their quality score justifies showing them (ad bid * quality_score, not just ad bid alone).

Approach 2: Constrained Optimization:
Maximize: sum(customer_satisfaction_score * position_discount)
Subject to:
  - At least 8 of top 10 results must have relevance_score > threshold
  - Promoted products can appear at most at positions 1 and 3
  - Out-of-stock products cannot appear in top 5

Approach 3: Policy Layer After ML Ranking:
\`\`\`
1. ML ranking produces relevance-optimized order
2. Promoted listing injection: insert paid products at positions 1 and 3,
   shift organic results down, label as "Sponsored"
3. Business rule overrides: apply merchandiser pins/blocks
4. Quality guardrails: never show < 3-star products in top 5
\`\`\`

Key Principle: never let business rules completely override relevance. Platforms that show irrelevant ads and promotions lose customer trust. Quality Score system (relevance * bid) is the right design — high bids for irrelevant products get discounted.`,
      },
    ],

    keyDecisions: [
      'BM25 recall vs dense vector recall vs hybrid — chose hybrid because BM25 has high precision for exact product name queries while dense vectors handle semantic and paraphrased queries; union of both recall sets dominates either alone at equivalent computation cost',
      'LambdaMART vs neural ranker — chose LambdaMART as default due to 3-5ms inference vs 50-100ms for neural, critical for 200ms total budget; neural ranker reserved for query types where semantic understanding matters most (long-tail and semantic queries)',
      'Online personalization vs cached offline recommendations — chose online personalization using a fast user representation model at query time, because real-time session context (what the user just viewed) is a strong signal that offline batch personalization misses',
      'Business rules before vs after ML ranking — chose after ML ranking because applying rules before ranking distorts the training signal (products that were pinned to position 1 look artificially relevant in training data); post-ranking rules keep the ML model trained on true relevance',
      'Single global ranking model vs query-type specific models — chose query-type specific models (navigational queries, brand queries, and semantic queries each get a tuned variant) because feature importance varies dramatically across query types, and a single model averages away important specialization',
    ],
  },

  // ─── 12. AI Airline Booking Chatbot ─────────────────────────────────────────
  {
    id: 'ai-airline-booking-chatbot',
    isNew: true,
    title: 'AI Airline Booking Chatbot',
    subtitle: 'Design a Conversational AI for Flight Search and Booking',
    icon: 'messageSquare',
    color: '#0ea5e9',
    difficulty: 'Hard',
    description: 'Design a conversational AI system that allows users to search, compare, and book flights through natural language, handling ambiguous inputs, multi-step booking flows, and PCI-compliant payment within a chat interface.',

    introduction: `Booking a flight today requires navigating complex pricing, schedule options, seat selections, and fare rules across multiple steps in a rigid web form. The process is particularly painful on mobile where form-filling is awkward, and for users who know what they want conceptually ("a cheap flight to New York next Friday, coming back Sunday") but struggle to translate that into the specific inputs a booking form expects.

An AI airline booking chatbot fundamentally changes the interaction model. Instead of filling forms, users have a conversation: "I want to fly from Chicago to New York next Friday and come back Sunday. I prefer morning flights and I only want to pay checked bag fees." The chatbot asks clarifying questions when needed, presents options in a conversational format, and guides the user through booking without ever requiring them to navigate a complex UI.

The key technical challenge is maintaining state across a multi-step, multi-turn conversation while integrating with airline reservation systems that were designed for structured form inputs, not conversational queries. The chatbot must parse natural language inputs that are often ambiguous ("London" — LHR or LGW? "next Friday" — in which timezone?), resolve these ambiguities through follow-up questions, build the complete structured booking request incrementally, and execute it against the airline\'s GDS (Global Distribution System) without losing the conversational thread.

Security and compliance are paramount. Payment information must never be stored in conversation logs. Identity information must be handled carefully. And the booking confirmation — a legal contract for travel — must be delivered in a format the customer can verify and retain. These requirements add engineering complexity that goes beyond typical chatbot design.`,

    functionalRequirements: [
      'Understand and extract flight search parameters from natural language including airports, dates, passenger count, and cabin class',
      'Resolve ambiguous inputs including city-to-airport mapping, natural language dates, and flexible date ranges',
      'Search live flight inventory via GDS API and present relevant options in a conversational format',
      'Guide users through multi-step booking flow including seat selection and fare class choice',
      'Handle post-booking requests including cancellation, rebooking, and flight status inquiries',
      'Answer policy questions about baggage, refunds, upgrades, and check-in procedures',
      'Collect payment via PCI-compliant tokenization without logging raw card numbers in any system',
      'Send booking confirmation with PNR and travel details via email and in-chat',
    ],

    nonFunctionalRequirements: [
      'Natural language response generation latency under 2 seconds per turn',
      'Flight search results returned within 3 seconds of confirmed search parameters',
      'Booking completion p99 time under 3 minutes from first message to PNR confirmation',
      'PCI DSS Level 1 compliance for payment handling',
      'Support 10,000 concurrent booking conversations at peak travel booking periods',
    ],

    estimation: {
      users: '50M airline passengers per year using chatbot; 10K concurrent conversations peak; 200K flight search API calls per day',
      storage: 'Conversation logs (metadata only, no PII/payment): 50M sessions/yr * 10KB = 500GB/yr',
      bandwidth: 'GDS API search responses: ~20KB per search * 200K searches/day = 4GB/day',
      qps: '10K active conversations * 0.5 messages/sec average = 5K message processing/sec',
    },

    apiDesign: {
      description: 'Chat API handles the conversation loop; flight and booking APIs integrate with GDS backend.',
      endpoints: [
        { method: 'POST', path: '/api/chat/message', params: '{ session_id, user_id?, text, attachments? }', response: '{ message_id, response_text, quick_replies?, action?: "show_flights"|"show_seat_map"|"confirm_booking" }', description: 'Process a user message and return chatbot response' },
        { method: 'GET', path: '/api/flights/search', params: '{ origin, destination, departure_date, return_date?, adults, cabin_class }', response: '{ flights: [{flight_id, airline, departs, arrives, price, stops, duration}] }', description: 'Search live flight inventory via GDS integration' },
        { method: 'POST', path: '/api/bookings', params: '{ flight_id, passengers: [{name, dob, passport}], seat_ids?, payment_token }', response: '{ pnr, confirmation_number, total_price, itinerary }', description: 'Create booking using tokenized payment; triggers GDS reservation' },
        { method: 'GET', path: '/api/bookings/{pnr}', params: '', response: '{ pnr, status, itinerary, passengers, fare_conditions }', description: 'Retrieve booking details for status inquiries' },
        { method: 'POST', path: '/api/bookings/{pnr}/cancel', params: '{ reason? }', response: '{ cancelled: true, refund_amount_cents, refund_eta_days }', description: 'Cancel a booking and calculate refund per fare rules' },
        { method: 'GET', path: '/api/airports/autocomplete', params: 'query', response: '{ airports: [{iata, name, city, country}] }', description: 'Resolve city names and partial inputs to airport codes' },
      ],
    },

    dataModel: {
      description: 'Conversation state machine for multi-step booking flow; booking records linked to GDS PNR; PII handled separately in encrypted storage.',
      schema: `chat_sessions {
  id: uuid PK
  user_id: bigint nullable  -- null for guest sessions
  channel: enum(web, mobile, whatsapp, sms, voice)
  state: enum(greeting, collecting_search_params, showing_flights, selecting_seat, collecting_passenger_info, payment, confirmed, post_booking)
  booking_context: jsonb  -- current collected params: {origin, destination, dates, passengers, selected_flight}
  created_at: timestamp
  last_activity_at: timestamp
  expires_at: timestamp  -- 30-min idle timeout
}

chat_messages {
  id: bigint PK
  session_id: uuid FK
  role: enum(user, assistant, system)
  content: text
  intent: varchar nullable  -- classified intent of user message
  entities: jsonb nullable  -- extracted entities: {origin, destination, date, etc.}
  created_at: timestamp
  -- NOTE: payment card numbers never stored; redacted in logs
}

bookings {
  id: uuid PK
  session_id: uuid FK nullable
  user_id: bigint nullable FK
  pnr: varchar(6)  -- airline PNR code
  gds_booking_ref: varchar  -- GDS internal reference
  origin_iata: char(3)
  destination_iata: char(3)
  departure_at: timestamp
  arrival_at: timestamp
  return_departure_at: timestamp nullable
  cabin_class: enum(economy, premium_economy, business, first)
  total_price_cents: int
  currency: char(3)
  status: enum(confirmed, cancelled, changed)
  booked_at: timestamp
}`,
      examples: [
        { table: 'chat_sessions', label: 'Active booking conversation', json: '{ "id": "sess-a1b2c3d4", "state": "showing_flights", "booking_context": {"origin": "ORD", "destination": "JFK", "departure_date": "2025-06-27", "return_date": "2025-06-29", "adults": 1, "cabin_class": "economy"} }' },
        { table: 'chat_messages', label: 'User message with extracted entities', json: '{ "role": "user", "content": "I want to fly to New York next Friday and come back Sunday", "intent": "search_flight", "entities": {"destination_city": "New York", "departure_relative": "next Friday", "return_relative": "this Sunday"} }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A rule-based dialog system matches user input against regex patterns to extract flight parameters. A menu-driven flow presents options as numbered lists. Each conversation step is a hard-coded state transition.',
      problems: [
        'Regex patterns fail on any input variation not explicitly anticipated, breaking the conversation for most real users who type naturally',
        'Menu-driven numbered lists are not conversational — they recreate the form-filling experience in a chat interface',
        'No context carryover: if user says "actually make it two adults" after already specifying adults, the system does not understand the reference',
        'Hard-coded state machine cannot handle user jumping out of sequence (wanting to change a parameter already set)',
        'No ambiguity resolution: "London" returns an error instead of asking which London airport',
        'No ability to answer policy questions (baggage, refund rules) that are not part of the booking flow state machine',
      ],
    },

    advancedImplementation: {
      title: 'LLM-Driven Conversation with Slot-Filling State Machine for Booking Completion',
      description: 'A hybrid architecture uses an LLM for natural language understanding, response generation, and open-ended questions, while a deterministic slot-filling state machine manages the booking-critical data collection. The LLM extracts entities and fills slots; the state machine tracks which required slots are filled and what is still needed; the LLM generates natural responses that advance the conversation toward the next required slot. Payment is handled by a PCI-compliant payment widget that collects card data entirely outside the conversation log.',
      keyPoints: [
        'LLM for intent and entity extraction: the LLM receives each user message plus conversation history and outputs a structured JSON of intent and entities; example output for "I need to fly to London next Friday returning the following Sunday with my wife" → {intent: "search_flight", entities: {destination_city: "London", departure: "2025-06-27", return: "2025-06-29", adults: 2}}',
        'Airport disambiguation: "London" → prompt user with "Which London airport do you prefer? (1) Heathrow LHR (2) Gatwick LGW (3) No preference" — this is a deterministic step that does not need LLM; the disambiguation database is a simple lookup',
        'Date resolution: natural language dates parsed by a date parser (dateparser library) relative to the current date and user timezone; "next Friday" requires knowing the user\'s local timezone from their device or profile',
        'Slot-filling state machine: tracks 7 required booking slots — origin, destination, departure_date, return_date (for round trips), adults, cabin_class, payment; once all slots are filled, trigger GDS search; the LLM generates a conversational transition to confirm all collected parameters before searching',
        'GDS integration: Amadeus or Sabre API accepts IATA-formatted search parameters; response includes flight options with prices, schedules, and fare class codes; LLM formats the top 3-5 options into a conversational summary with a quick-reply button for each',
        'Payment security: when user is ready to pay, redirect to a PCI DSS tokenization widget (Stripe Payment Element or Braintree Hosted Fields) that collects card data in an iframe isolated from the chatbot system; the widget returns a payment token that is the only payment artifact stored or transmitted through the chatbot system',
        'Disruption handling: if user\'s booked flight is cancelled, proactively message them via the chat channel they used for booking with rebooking options using the same conversation interface',
      ],
      databaseChoice: 'PostgreSQL for booking records and conversation metadata; Redis for active conversation state with 30-minute TTL (session expiry); Kafka for booking event stream (booking confirmed → trigger confirmation email, loyalty points update); encrypted data store (Vault or AWS KMS) for passenger PII separate from conversation logs',
      caching: 'Flight search results cached by search parameters for 60 seconds (prices are real-time but stable over a minute); airport lookup table cached in application memory (rarely changes); fare rules cached per fare class for 1 hour',
    },

    tips: [
      'The hybrid architecture (LLM for NLU + state machine for booking completion) is the right answer — pure LLM would be unreliable for financial transaction completion, pure state machine would be brittle for natural language input',
      'Airport disambiguation is a concrete example worth explaining in detail — it shows you understand the complexity of mapping user language to airline industry codes',
      'PCI compliance for payment in a chatbot is a specific technical challenge interviewers may not have considered — the iframe-isolated payment widget approach is the industry standard',
      'GDS integration (Amadeus, Sabre) is real-world knowledge worth mentioning — airlines do not expose direct APIs to third parties; GDS is the standard industry intermediary',
      'Disruption handling as a post-booking use case is an excellent extension that shows product thinking',
    ],

    keyQuestions: [
      {
        question: 'How do you maintain conversation state across a multi-step booking flow?',
        answer: `The Challenge:
A flight booking requires collecting at minimum: origin, destination, departure date, return date, passenger count, cabin class, selected flight, passenger names and passport info, and payment. This happens across 10-20 conversation turns. State must be maintained reliably.

Architecture: Redis-Backed Session State:
\`\`\`json
// Session state stored in Redis, keyed by session_id
{
  "session_id": "sess-a1b2c3d4",
  "state": "showing_flights",
  "slots": {
    "origin": "ORD",
    "destination": "JFK",
    "departure_date": "2025-06-27",
    "return_date": "2025-06-29",
    "adults": 2,
    "cabin_class": "economy",
    "selected_flight_id": null,  // not yet selected
    "payment_token": null
  },
  "conversation_history": [
    {"role": "user", "content": "I want to fly to New York next Friday"},
    {"role": "assistant", "content": "I can help with that! Are you flying round trip or one way?"},
    ...
  ],
  "expires_at": "2025-06-10T20:30:00Z"
}
\`\`\`

State Machine Transitions:
\`\`\`
greeting → collecting_search_params → showing_flights → selecting_seat
  → collecting_passenger_info → payment → confirmed

User can also:
  → jump back (change any slot at any time)
  → ask policy question (handled by LLM without changing state)
  → abandon (session expires after 30 min idle)
\`\`\`

Slot Update Handling:
If user says "actually, make it 3 passengers" at any state:
  1. LLM extracts: {intent: "update_slot", slot: "adults", value: 3}
  2. Update session state: slots.adults = 3
  3. Re-run search if already in showing_flights state (slot change invalidates results)
  4. LLM generates: "Got it, updating to 3 passengers. Let me refresh the results..."

Why Redis with TTL:
- Sub-millisecond reads for state retrieval on every message
- Automatic expiry after 30 minutes of idle (no orphan sessions)
- Session data is ephemeral conversation context, not a durable record`,
      },
      {
        question: 'How do you handle payment securely in a chatbot without violating PCI DSS?',
        answer: `The PCI DSS Constraint:
PCI DSS Level 1 (required for most airlines and booking platforms) prohibits storing, processing, or transmitting card numbers unless your systems are fully PCI-certified. Chatbot systems — with conversation logs, LLM providers, and multiple external services — cannot easily be made PCI-Level-1 compliant.

Solution: Payment Widget Isolation (P2PE):
\`\`\`
Flow:
1. Chatbot reaches payment step
2. Chatbot responds: "Ready to complete booking! Please enter your payment details
   in the secure payment form below."
3. Render an iframe containing a PCI-compliant payment widget:
   - Stripe Payment Element (embedded, no server-side card data)
   - Braintree Hosted Fields
   - Adyen Web Drop-In

4. Payment widget collects card data INSIDE the iframe:
   - Card data never touches chatbot servers
   - Card data never appears in chat logs
   - Card data never goes through LLM providers

5. Widget returns a payment_token (opaque reference)
   → Token stored in session state
   → Token sent to booking API for charge

6. Chatbot continues conversation: "Payment received! Confirming your booking..."
\`\`\`

What Gets Logged vs Not Logged:
\`\`\`
LOGGED in conversation history:
  User: "I'm ready to pay"
  Assistant: "Please enter payment details in the form below"
  [PAYMENT_FORM_SHOWN]  ← placeholder, no card data
  Assistant: "Payment confirmed. Your PNR is ABC123"

NOT LOGGED anywhere in chatbot system:
  Card number
  CVV
  Expiration date
  Billing address (only last 4 digits stored for display)
\`\`\`

Voice Channel Special Case:
If the chatbot has a voice channel, payment by voice is high-risk (audio recordings may be stored). Solution: pause the voice conversation, send an SMS link to the PCI-compliant payment widget, wait for payment confirmation, then resume the voice conversation.`,
      },
    ],

    keyDecisions: [
      'LLM for all responses vs LLM + slot-filling state machine — chose hybrid because the booking process has strict required fields (no booking can proceed without origin, destination, and date) that a pure LLM might handle inconsistently; the state machine ensures completeness while LLM provides natural language flexibility',
      'GDS API direct vs airline direct APIs — chose GDS aggregator (Amadeus) because direct airline APIs require bilateral agreements with each carrier, making a multi-airline chatbot require hundreds of integrations; GDS provides a single API covering most airlines globally',
      'Real-time flight search vs cached inventory — chose real-time for specific searches (prices change every minute) with 60-second cache for popular routes during off-peak hours (NYC-LAX at 8am Tuesday is stable enough to cache briefly)',
      'PCI-compliant iframe widget vs asking user to type card in chat — chose iframe widget because typing card numbers in a chat interface exposes them to conversation logs, LLM providers, and every system that processes the messages; the isolated widget is the only defensible PCI approach',
      'Single GDS provider vs multi-GDS fallback — chose primary GDS with secondary fallback (Amadeus primary, Sabre fallback) because airline inventory is not perfectly identical across all GDS providers; for specific routes or airlines, one GDS may have better inventory or pricing',
    ],
  },

  // ─── 13. AI Banking Chatbot ──────────────────────────────────────────────────
  {
    id: 'ai-banking-chatbot',
    isNew: true,
    title: 'AI Banking Chatbot',
    subtitle: 'Design a Secure Conversational AI for Retail Banking',
    icon: 'shield',
    color: '#16a34a',
    difficulty: 'Hard',
    description: 'Design a CFPB-compliant conversational AI for retail banking that handles account inquiries, transfers, and dispute initiation while strictly protecting customer PII, enforcing regulatory boundaries, and maintaining a complete audit trail.',

    introduction: `Banking chatbots occupy an unusually sensitive position in the AI application landscape. They handle the financial assets and personal information that customers trust most, they operate under strict regulatory frameworks that prescribe exactly what an automated system can and cannot do, and the consequences of errors — an incorrect transfer, a missed fraud alert, or exposure of account information — are immediate and tangible. This combination of sensitivity, regulation, and consequence makes banking chatbots much more constrained in design than typical customer service chatbots.

The regulatory environment is the primary design constraint. The Consumer Financial Protection Bureau (CFPB) in the United States, the Financial Conduct Authority (FCA) in the UK, and equivalent bodies globally have rules that banking chatbots must follow. At minimum: customers must always be able to reach a human agent, automated systems cannot give investment advice, dispute initiation must be followed by FDIC/CFPB mandated provisional credit, and the bank must maintain audit records of all customer interactions. These requirements are not optional — violations carry regulatory fines and reputational damage.

The identity verification challenge is particularly interesting. A banking chatbot must verify that the person it is chatting with is actually the account holder before revealing any account information or executing any transaction. This cannot be done by asking for a password in the chat window (phishing risk and credential exposure in logs). It requires either integration with the bank\'s existing authentication layer (the user is already logged into the banking app) or a step-up verification flow using out-of-band channels.

The temptation to make the chatbot maximally helpful must be balanced against the risk of giving incorrect information. A banking chatbot that confidently states that a particular transaction is not fraud when it is, or that confidently explains an incorrect interest calculation, creates legal liability. The chatbot must be calibrated to be appropriately uncertain, to provide authoritative sources (the account statement, the terms and conditions document), and to escalate to human agents when questions exceed its confident knowledge.`,

    functionalRequirements: [
      'Authenticate account holders before revealing any account information',
      'Handle balance inquiries, transaction history retrieval, and pending transaction status',
      'Initiate fund transfers between own accounts with explicit multi-step confirmation',
      'Accept and route dispute claims for unauthorized transactions',
      'Answer general banking questions about products, rates, branch hours, and policies',
      'Locate nearest branches and ATMs with current status information',
      'Escalate to human agent on request or when the chatbot cannot confidently help',
      'Maintain a complete audit log of all interactions and any transactions initiated',
    ],

    nonFunctionalRequirements: [
      'Session timeout after 5 minutes of inactivity for security',
      'All account data and PII encrypted in transit and at rest with AES-256',
      'Zero tolerance for PII appearing in unencrypted logs or debugging outputs',
      'Regulatory audit log retention for 7 years per banking record-keeping requirements',
      'Human escalation path available 24/7 through direct transfer to live agent queue',
    ],

    estimation: {
      users: '10M banking customers; 500K chatbot sessions per day; 50K concurrent sessions peak',
      storage: 'Audit logs: 500K sessions/day * 50KB per session = 25GB/day; 7-year retention = ~64TB',
      bandwidth: 'Banking API calls: 500K sessions * 5 API calls/session * 20KB/response = 50GB/day',
      qps: '50K concurrent sessions * 0.5 messages/sec = 25K message processing/sec',
    },

    apiDesign: {
      description: 'Chat API with session-based authentication; banking APIs proxied through a secure service layer that enforces field-level access control.',
      endpoints: [
        { method: 'POST', path: '/api/chat/session/start', params: '{ channel: "web"|"mobile"|"sms", auth_token }', response: '{ session_id, auth_level: "authenticated"|"step_up_required" }', description: 'Start a banking chat session; auth_token from existing bank login or triggers step-up verification' },
        { method: 'POST', path: '/api/chat/message', params: '{ session_id, text }', response: '{ response_text, action?: "show_transactions"|"confirm_transfer"|"connect_agent" }', description: 'Process message; requires active authenticated session' },
        { method: 'GET', path: '/api/accounts/{account_id}/balance', params: '', response: '{ available_balance, pending_balance, as_of }', description: 'Proxied balance inquiry; requires chat session auth for this account' },
        { method: 'GET', path: '/api/accounts/{account_id}/transactions', params: 'from_date, to_date, limit', response: '{ transactions: [{date, description, amount, status}] }', description: 'Transaction history; no raw account numbers in response' },
        { method: 'POST', path: '/api/transfers', params: '{ from_account_id, to_account_id, amount_cents, confirmation_code }', response: '{ transfer_id, status, confirmation }', description: 'Execute transfer; requires explicit two-step confirmation code' },
        { method: 'POST', path: '/api/disputes', params: '{ account_id, transaction_id, reason_code, description }', response: '{ dispute_id, provisional_credit_issued: bool, investigation_eta_days }', description: 'Initiate a transaction dispute with provisional credit' },
        { method: 'POST', path: '/api/chat/escalate', params: '{ session_id, reason }', response: '{ queue_position, estimated_wait_minutes }', description: 'Transfer to human agent; session context transferred to agent' },
      ],
    },

    dataModel: {
      description: 'Chat sessions with strict PII isolation; immutable audit log; dispute tracking with regulatory timeline fields.',
      schema: `chat_sessions {
  id: uuid PK
  user_id: bigint FK  -- banking customer ID
  auth_level: enum(none, step_up_verified, full)
  channel: enum(web, mobile, sms, voice)
  started_at: timestamp
  last_activity_at: timestamp
  ended_at: timestamp nullable
  escalated_to_agent: bool
  agent_id: bigint nullable
}

audit_log {
  -- IMMUTABLE: no updates, only inserts
  id: bigint PK
  session_id: uuid FK
  user_id: bigint FK  -- encrypted at rest
  event_type: enum(session_start, message_received, message_sent, balance_viewed,
                   transaction_history_viewed, transfer_initiated, transfer_confirmed,
                   dispute_filed, escalation_requested, session_ended)
  event_data: jsonb  -- NEVER contains account numbers, SSN, card numbers, balances
  occurred_at: timestamp
  -- Only metadata logged, never PII: intent, action taken, but not the values
  -- Example: event_type=balance_viewed, event_data={account_type: "checking"} NOT {balance: 12341.23}
}

disputes {
  id: uuid PK
  user_id: bigint FK
  account_id: bigint FK  -- encrypted
  disputed_transaction_id: bigint FK
  reason_code: varchar(10)  -- CFPB reason codes
  filed_at: timestamp
  provisional_credit_issued: bool
  provisional_credit_amount_cents: int nullable
  provisional_credit_issued_at: timestamp nullable
  investigation_status: enum(open, in_progress, resolved_in_favor, resolved_against)
  resolved_at: timestamp nullable
  -- Regulatory requirement: provisional credit within 10 business days of dispute
}`,
      examples: [
        { table: 'audit_log', label: 'Balance inquiry log (no balance value stored)', json: '{ "event_type": "balance_viewed", "event_data": {"account_type": "checking", "inquiry_result": "success"}, "occurred_at": "2025-06-10T14:23:01Z" }' },
        { table: 'disputes', label: 'New dispute with provisional credit', json: '{ "reason_code": "FRAUD001", "filed_at": "2025-06-10T14:30:00Z", "provisional_credit_issued": true, "provisional_credit_amount_cents": 24900, "provisional_credit_issued_at": "2025-06-10T14:30:05Z", "investigation_status": "open" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A FAQ chatbot answers pre-scripted questions about banking products. Account balance can be checked after typing "BALANCE" in a specific format. Any other request routes to a phone number for customer service.',
      problems: [
        'Pre-scripted responses cover only a small fraction of actual customer questions',
        'Structured command inputs ("type BALANCE") recreate the worst of IVR phone systems in a text interface',
        'No real account integration means customers cannot accomplish anything useful without calling',
        'No context preservation means every message is treated independently — cannot ask a follow-up question',
        'No audit trail beyond server logs makes regulatory compliance impossible',
        'No identity verification protocol means the chatbot cannot safely share any account information even if it could retrieve it',
      ],
    },

    advancedImplementation: {
      title: 'LLM-Driven Banking Assistant with Regulatory Guardrails and PII Isolation',
      description: 'An LLM handles natural language understanding and response generation but is strictly constrained by a regulatory rule engine that intercepts any intent classified as investment advice, promises of loan approval, or statements of fact about account data that should be read directly from the banking system. All account data is retrieved via secure API calls and presented to the user without being stored in the conversation log. A PII scrubbing layer removes any sensitive data from messages before they reach the LLM.',
      keyPoints: [
        'Authentication-first design: the chatbot does not reveal any account information until the session is associated with a verified account holder; web and mobile channels use the existing bank SSO session; SMS and voice channels trigger an out-of-band OTP verification flow',
        'PII scrubbing before LLM: user messages are scanned for account numbers, SSNs, card numbers, and phone numbers before being sent to the LLM API; these are replaced with placeholders ([ACCOUNT_NUMBER]) and restored from the original message only when needed for API calls',
        'Regulatory intent classifier: a separate classifier (fine-tuned on banking regulatory texts) categorizes each user intent; intents classified as investment advice, credit decisions, or legal advice trigger a hard redirect to a human specialist rather than LLM response; this prevents the bank from inadvertently offering unlicensed financial advice through an AI system',
        'Transfer safety protocol: fund transfers require a two-step confirmation; step 1 — chatbot presents full transfer details in a structured summary; step 2 — user must confirm with a numeric code sent to their registered phone; no transfer executes in a single conversational turn regardless of how confidently the user phrases their request',
        'Audit log design: all actions are logged but no PII values are stored in the audit log; the log records that a balance was viewed (not what the balance was), that a transfer was initiated (not the amounts or account numbers), that a dispute was filed (not the disputed amount); actual account data is in the core banking system, not in the chatbot audit log',
        'Agent handoff with context: when escalating to a human agent, transfer the session context including conversation summary, identified intent, and the specific question the customer has, without transferring raw conversation text that may contain PII the agent does not need; the agent sees a structured brief, not a chat transcript',
        'Dispute workflow integration: CFPB regulations require provisional credit within 10 business days of dispute; the chatbot automates the dispute filing and triggers immediate provisional credit for qualified disputes (clear fraud signals, amounts under threshold); larger disputes or ambiguous cases route to a human investigator with pre-filled case information',
      ],
      databaseChoice: 'PostgreSQL for session metadata and dispute tracking; immutable audit log in append-only table with row-level security preventing updates; encrypted column-level storage for any fields containing user identifiers; Redis for active session state with 5-minute idle TTL; Kafka for dispute event stream triggering downstream workflows (provisional credit, investigator assignment)',
      caching: 'Session auth state cached in Redis per session (refreshed on each message, expires after 5-minute idle); account metadata (account type, last 4 digits) cached in session for display purposes with 30-minute TTL; no account balances or transaction data ever cached outside the core banking system',
    },

    tips: [
      'Lead with the regulatory constraints — CFPB rules around human escalation, dispute handling, and investment advice prohibition are the defining design constraints, not optional features',
      'PII isolation from LLM calls is the most technically interesting challenge — explain the scrubbing layer that prevents account numbers from appearing in prompts sent to external LLM APIs',
      'The two-step transfer confirmation is a non-negotiable security design — no single conversational turn should ever execute a financial transaction',
      'Audit log design is worth explaining in detail — the bank must be able to prove what actions were taken without the log becoming a repository of sensitive account data',
      'Mention the difference between what the chatbot can do (account information, dispute filing) vs what it must not do (investment advice, credit decisions, legal advice)',
    ],

    keyQuestions: [
      {
        question: 'How do you verify customer identity in a chat interface without creating security risks?',
        answer: `The Authentication Hierarchy:

Level 1 — Inherited Session Auth (preferred):
\`\`\`
User is already logged into the banking mobile app
→ Chat session inherits the app session authentication
→ Bank SSO token passed when chat session is created
→ No additional verification needed; this is the most secure path
\`\`\`

Level 2 — Step-Up Verification (for web or unauthenticated contexts):
\`\`\`
User opens web chat without banking login
→ Chatbot: "To access your account, I'll send a code to your registered phone"
→ System sends OTP to phone number on file (not to phone number user provides)
→ User enters 6-digit code in chat
→ If correct: session elevated to "step_up_verified"
→ If incorrect 3 times: session locked, require full login

Why send to registered phone, not user-provided phone:
  → Prevents attacker from providing their own phone number
  → The registered phone is what the bank already has — it is the verification factor
\`\`\`

Level 3 — Knowledge-Based Auth (fallback, weaker):
\`\`\`
If phone number on file is not reachable:
→ Ask: last 4 digits of SSN + last transaction amount
→ These are knowledge factors the customer has but an attacker might not
→ Considered weaker; limited to balance inquiry only, not transfers
\`\`\`

What the Chatbot Must Never Do:
- Ask the user to type their password in chat (visible in logs, phishing risk)
- Accept "I am [customer name]" as verification (trivially spoofed)
- Reveal account numbers to verify identity ("Is your account ending in 1234?")
- Lower auth requirements because the user is frustrated

Session Security:
- 5-minute idle timeout resets auth state (must re-verify to access account)
- Auth level degrades after 30 minutes even with activity (requires re-step-up)
- Multiple failed verifications trigger account flag and human review`,
      },
      {
        question: 'How do you prevent the chatbot from giving financial or legal advice that violates regulations?',
        answer: `The Regulatory Boundary:
\`\`\`
PERMITTED (factual information):
  - "Your current checking balance is [retrieved from API]"
  - "Our savings account currently offers 4.5% APY"
  - "Wire transfers typically settle in 1-3 business days"
  - "You can dispute a transaction by saying 'I want to dispute a charge'"

NOT PERMITTED (advice that requires license):
  - "You should move your money to a high-yield savings account" (investment advice)
  - "Based on your spending, I recommend you apply for a credit card" (credit advice)
  - "This looks like a fraudulent charge to me" (adjudication claim)
  - "You qualify for a personal loan at this rate" (pre-qualification without process)
\`\`\`

Implementation: Intent Classifier with Hard Redirect:
\`\`\`python
# Fine-tuned classifier on banking regulatory texts
intent_class = regulatory_classifier.predict(user_message)

HARD_REDIRECT_INTENTS = {
  "investment_advice",      # "where should I invest my savings"
  "credit_decision",        # "will I be approved for a loan"
  "legal_advice",           # "do I have to report this transaction"
  "fraud_adjudication",     # "is this charge fraud or legitimate"
}

if intent_class in HARD_REDIRECT_INTENTS:
  response = REDIRECT_TEMPLATES[intent_class]
  # e.g., "For investment guidance, I can connect you with a licensed
  # financial advisor. Would you like me to schedule a call?"
  log_regulatory_redirect(session_id, intent_class)
  return response  # LLM is NOT consulted for these intents
\`\`\`

Why Not Just Prompt the LLM to Avoid Advice?:
Instructing the LLM "do not give investment advice" in the system prompt is not reliable. LLMs can follow this instruction 99% of the time, but that 1% failure rate is unacceptable in a regulated banking context. The hard-coded classifier catch is a defense-in-depth layer that does not rely on LLM compliance.

Safe Factual vs Unsafe Advisory Language:
\`\`\`
Safe: "Our savings accounts offer 4.5% APY. Would you like to see the current rates?"
Unsafe: "You should consider moving to savings to earn more interest"

Safe: "I can provide information about our loan products. A financial advisor can
      discuss whether a loan fits your situation."
Unsafe: "Based on your balance history, you seem like a good loan candidate"
\`\`\``,
      },
    ],

    keyDecisions: [
      'LLM for all responses vs LLM + regulatory rule engine — chose rule engine for specific high-risk intent categories because LLM compliance with regulatory prohibitions cannot be guaranteed at the required reliability level; the rule engine provides a deterministic safety net',
      'Full conversation logging vs minimal metadata logging — chose minimal logging (action type, not action values) because banking PII in conversation logs creates a security liability that exceeds the debugging value, and regulators require auditability of actions taken, not verbatim conversation transcripts',
      'Single-turn transfer vs two-step confirmation — chose two-step with OTP because financial transactions are irreversible and the cost of an incorrect transfer far exceeds the friction cost of one additional confirmation step',
      'In-app auth inheritance vs independent chatbot auth — chose in-app auth inheritance as primary path because it provides the strongest authentication (existing bank security session) with zero additional friction; independent auth as fallback for web and unauthenticated contexts',
      'Automated dispute resolution vs human-reviewed disputes — chose automated provisional credit for clear-cut fraud patterns under a threshold amount (CFPB provisional credit requirement satisfied immediately), human review for ambiguous or high-value disputes (reduces false provisioning risk)',
    ],
  },

  // ─── 14. AI Healthcare Chatbot ──────────────────────────────────────────────
  {
    id: 'ai-healthcare-chatbot',
    isNew: true,
    title: 'AI Healthcare Chatbot',
    subtitle: 'Design a HIPAA-Compliant Medical Assistant Chatbot',
    icon: 'shield',
    color: '#ef4444',
    difficulty: 'Hard',
    description: 'Design a HIPAA-compliant conversational AI that assists patients with symptom triage, appointment scheduling, medication information, and care coordination, while enforcing strict clinical safety boundaries and regulatory requirements.',

    introduction: `Healthcare chatbots operate at the intersection of AI\'s most exciting capabilities and its most serious risks. A chatbot that can help a worried patient understand their symptoms and navigate the healthcare system has enormous potential to improve access to care, reduce emergency department overcrowding, and provide health information to populations that lack consistent access to physicians. A chatbot that confidently provides incorrect medical information or fails to recognize an emergency creates direct patient harm.

This tension defines healthcare chatbot design. Every capability decision must be evaluated against the clinical safety implication of getting it wrong. A retail chatbot that incorrectly states a shipping timeline is an annoyance; a healthcare chatbot that misclassifies a heart attack as indigestion is potentially fatal. This is why healthcare AI systems are held to a dramatically higher standard of calibration, uncertainty communication, and human escalation than other conversational AI applications.

HIPAA (Health Insurance Portability and Accountability Act) in the United States adds a layer of regulatory requirements on top of the clinical safety requirements. All Protected Health Information (PHI) — which includes names, dates of birth, diagnoses, medications, and any information that could identify a patient and relates to their health — must be encrypted, access-controlled, minimally disclosed, and retained for minimum required periods. The chatbot\'s cloud infrastructure must operate under a Business Associate Agreement (BAA) with the hospital or health system, making the technology provider legally responsible for PHI security.

The regulatory landscape is also evolving rapidly. The FDA has issued guidance on AI as a Software as a Medical Device (SaMD), and chatbots that cross the line from general health information to specific medical advice or diagnosis may be regulated as medical devices. This means healthcare chatbot teams must work closely with legal and regulatory experts, not just engineering and clinical teams.`,

    functionalRequirements: [
      'Collect and triage patient-reported symptoms and recommend appropriate care level',
      'Schedule appointments with appropriate providers based on symptom triage and patient insurance',
      'Answer questions about medications including dosing, interactions, and side effects from authoritative sources',
      'Explain lab results and vital signs in patient-friendly language with appropriate clinical context',
      'Accept prescription refill requests and route to appropriate prescriber',
      'Screen for mental health concerns using validated clinical instruments such as PHQ-2',
      'Provide post-visit support including discharge instruction clarification and follow-up scheduling',
      'Transfer to human care team immediately when urgent or emergent symptoms are reported',
    ],

    nonFunctionalRequirements: [
      'All PHI encrypted at rest with AES-256 and in transit with TLS 1.3',
      'Audit log retention of 6 years minimum per HIPAA record retention requirements',
      'Human escalation path available 24/7 for urgent symptom reporting',
      'HIPAA BAA in place with all cloud infrastructure and LLM API providers',
      'System must not store raw PHI in LLM provider systems; PHI scrubbed before API calls',
    ],

    estimation: {
      users: '5M patients using chatbot; 200K sessions per day; all PHI encrypted at rest and in transit',
      storage: 'PHI audit log: 200K sessions/day * 20KB * 365 days * 6 years retention = ~8.7TB',
      bandwidth: 'EHR API calls: 200K sessions * 3 API calls * 50KB per response = 30GB/day',
      qps: '200K sessions/day peak spread over 12 hours = ~5K concurrent sessions; ~10K API calls/min at peak',
    },

    apiDesign: {
      description: 'Chat API integrated with EHR system via HL7 FHIR API; all API calls logged with patient ID for HIPAA audit trail.',
      endpoints: [
        { method: 'POST', path: '/api/chat/message', params: '{ session_id, patient_id, text }', response: '{ response_text, urgency?: "routine"|"urgent"|"emergent", action?: "schedule_appointment"|"connect_care_team" }', description: 'Process patient message; requires authenticated patient session' },
        { method: 'POST', path: '/api/triage', params: '{ patient_id, symptoms: [{description, onset, severity}] }', response: '{ urgency_level, recommended_care: "self_care"|"primary_care"|"urgent_care"|"er", reasoning_summary }', description: 'Structured symptom triage; does NOT diagnose, only recommends care level' },
        { method: 'GET', path: '/api/medications/{ndc_code}/info', params: '', response: '{ name, indications, dosing, interactions, side_effects, source: "FDA"|"clinical_db", retrieved_at }', description: 'Retrieve medication information from authoritative drug database, not LLM' },
        { method: 'POST', path: '/api/appointments', params: '{ patient_id, provider_id?, specialty, urgency, reason }', response: '{ appointment_id, provider, datetime, location, confirmation_number }', description: 'Schedule appointment via EHR scheduling API' },
        { method: 'POST', path: '/api/mental-health/phq2', params: '{ patient_id, q1_score: 0-3, q2_score: 0-3 }', response: '{ total_score, positive_screen: bool, recommended_action }', description: 'Administer PHQ-2 depression screening; positive screen triggers escalation' },
        { method: 'POST', path: '/api/escalations', params: '{ patient_id, session_id, reason: "emergent_symptoms"|"mental_health_crisis"|"patient_request", summary }', response: '{ escalation_id, care_team_notified: bool, callback_eta_minutes? }', description: 'Escalate to care team; for emergent symptoms, instructs patient to call 911 simultaneously' },
      ],
    },

    dataModel: {
      description: 'Patient chat sessions with PHI-minimal logging; clinical triage records; HIPAA audit trail linking all PHI access to a patient and purpose.',
      schema: `chat_sessions {
  id: uuid PK
  patient_id: bigint FK  -- links to EHR patient record
  started_at: timestamp
  ended_at: timestamp nullable
  channel: enum(web, mobile, sms)
  triage_completed: bool
  highest_urgency_flagged: enum(routine, urgent, emergent) nullable
  escalated: bool
  escalation_reason: text nullable
}

chat_messages {
  id: bigint PK
  session_id: uuid FK
  role: enum(patient, assistant, system)
  content: text  -- stored encrypted at rest; PHI redacted before LLM processing
  intent_classified: varchar nullable
  clinical_flag: bool  -- true if message triggered clinical protocol
  created_at: timestamp
}

triage_records {
  id: uuid PK
  session_id: uuid FK
  patient_id: bigint FK
  symptoms_collected: jsonb  -- structured symptom list
  urgency_recommendation: enum(self_care, primary_care, urgent_care, er, call_911)
  reasoning_summary: text  -- plain language explanation given to patient
  screened_mental_health: bool
  phq2_score: int nullable
  triaged_at: timestamp
  reviewed_by_clinician: bool  -- for quality audit
  reviewed_at: timestamp nullable
}

hipaa_audit_log {
  -- IMMUTABLE: append-only, cannot be modified after insert
  id: bigint PK
  event_at: timestamp
  patient_id: bigint  -- encrypted
  accessed_by: varchar  -- chatbot system, or specific agent ID
  phi_category: enum(demographics, diagnosis, medication, lab_result, appointment, conversation)
  access_purpose: enum(treatment, payment, healthcare_operations, patient_request)
  action: enum(view, create, update)
  session_id: uuid nullable
}`,
      examples: [
        { table: 'triage_records', label: 'Urgent care recommendation', json: '{ "urgency_recommendation": "urgent_care", "reasoning_summary": "Based on your symptoms of fever over 103F and difficulty breathing for more than 6 hours, I recommend visiting an urgent care center within the next 1-2 hours. If breathing difficulty worsens, call 911 immediately.", "phq2_score": null }' },
        { table: 'hipaa_audit_log', label: 'Medication information access', json: '{ "patient_id": "[encrypted]", "phi_category": "medication", "access_purpose": "patient_request", "action": "view", "event_at": "2025-06-10T14:23:01Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A FAQ chatbot answers common health questions from a knowledge base of symptom articles. Users can request appointment scheduling which opens the hospital web portal in a new browser tab. The chatbot cannot access patient records.',
      problems: [
        'Static FAQ responses do not address patient-specific questions about their own conditions or medications',
        'Redirecting to a web portal for appointments defeats the purpose of a conversational interface',
        'No access to patient records means the chatbot cannot provide personalized medication reminders, upcoming appointment information, or lab result context',
        'No triage capability means the chatbot cannot help patients understand when their symptoms require urgent care',
        'No HIPAA compliance design for a system with no PHI access is easy; adding PHI access to this architecture would require a complete rebuild',
        'LLM used for health questions without authoritative source grounding risks hallucinated medical information',
      ],
    },

    advancedImplementation: {
      title: 'HIPAA-Compliant Clinical Assistant with Retrieval-Augmented Medical Knowledge',
      description: 'A retrieval-augmented generation system provides medical information exclusively from authoritative sources including FDA drug databases, hospital formularies, and clinical decision support tools. The LLM generates patient-friendly explanations of the retrieved information but cannot introduce medical facts of its own. Clinical safety is enforced by a separate triage engine and a set of hard-coded safety protocols for high-risk situations including mental health crises and emergent symptoms. All PHI is scrubbed from LLM prompts and handled via direct EHR API calls.',
      keyPoints: [
        'PHI scrubbing pipeline: before any user message is sent to the LLM, a PHI detection layer identifies and redacts patient identifiers, specific medication names with doses, and diagnostic terms that combined with demographics could identify the patient; LLM receives a de-identified message and responds based on context; the chatbot server re-hydrates the response with specific patient data from authorized EHR API calls',
        'Medical knowledge retrieval-augmented generation: medication questions trigger a lookup in the FDA drug database or hospital formulary, not LLM generation; the retrieved authoritative text is passed to the LLM only for plain-language summarization; the original source is cited in the response so the patient knows the information is authoritative',
        'Triage safety protocol: a dedicated clinical triage model (separate from the general LLM) evaluates symptom descriptions against WHO and hospital triage guidelines; the triage model is validated against clinical standards before deployment and updated when guidelines change; the chatbot is explicit that it provides care level recommendations, not diagnoses',
        'PHQ-2 mental health screening: the PHQ-2 is a validated two-question depression screen; if either question scores 2 or 3 ("more than half the days" or "nearly every day"), the screen is positive; a positive PHQ-2 immediately triggers a referral message and escalation to the behavioral health team, regardless of the conversational context',
        'Crisis protocol: if any message contains keywords or semantic patterns indicating suicidal ideation or immediate self-harm risk, the chatbot immediately provides the 988 Suicide and Crisis Lifeline, offers to stay in the conversation until help arrives, and alerts the care team; this protocol cannot be disabled and cannot be overridden by any conversational context',
        'EHR integration via HL7 FHIR: read patient demographics, upcoming appointments, recent labs, and current medications from the EHR system using standard FHIR R4 APIs; write to EHR only for appointment creation and refill requests, both requiring clinical team sign-off',
        'HIPAA audit trail: every access to PHI — whether a balance inquiry, medication review, or lab result explanation — creates an immutable audit log record with patient ID, the PHI category accessed, the accessing system, the time, and the clinical purpose; this log is what the hospital presents in the event of a HIPAA audit',
      ],
      databaseChoice: 'Encrypted PostgreSQL (TDE) for all PHI-containing tables with column-level encryption for highest-sensitivity fields; separate read-only replica for audit queries; Redis for session state with 30-minute idle TTL; HIPAA-compliant object storage (S3 with server-side encryption and access logging) for conversation archives; all cloud components under signed BAA',
      caching: 'Medication information cached from FDA database for 24 hours (regulatory-approved sources update at most daily); appointment slot availability cached for 5 minutes; PHQ-2 results never cached — always require fresh administration per clinical protocol',
    },

    tips: [
      'HIPAA compliance is not an afterthought — frame it as the primary architectural constraint that shapes every design decision in the system',
      'The distinction between providing medical information versus giving medical advice is the key regulatory boundary; retrieval from authoritative sources is information, LLM-generated clinical conclusions are advice',
      'PHI scrubbing before LLM API calls is essential — many hospitals will not deploy a chatbot that sends patient data to an external LLM API without de-identification',
      'The mental health crisis and emergent symptom protocols are non-negotiable safety requirements — explain them explicitly',
      'FHIR R4 is the regulatory standard for EHR interoperability in the US — mentioning it shows real-world healthcare system knowledge',
      'FDA Software as Medical Device (SaMD) classification is worth mentioning — it creates a regulatory threshold that chatbot teams must be aware of',
    ],

    keyQuestions: [
      {
        question: 'How do you prevent the chatbot from making diagnoses while still being useful for symptom guidance?',
        answer: `The Regulatory Boundary:
In the US, diagnosing a medical condition requires a licensed healthcare provider. A software system that diagnoses conditions may be regulated as a Class II or III medical device by the FDA, requiring premarket review (510k or PMA). Most hospital chatbots want to avoid this classification.

What the Chatbot CAN do (care level recommendation, not diagnosis):
\`\`\`
Patient: "I have a fever of 102, headache, and stiff neck"

UNSAFE (diagnosis):
"You may have bacterial meningitis. This is a medical emergency."
→ This is a specific diagnosis. Regulated as medical device.

SAFE (care level recommendation):
"Based on your symptoms of high fever, headache, and stiff neck,
I recommend you go to the emergency room now. These symptoms together
can sometimes indicate conditions that require immediate evaluation.
Please call 911 or have someone drive you — do not drive yourself."
→ This recommends a care level. Clinically appropriate. Not a diagnosis.
\`\`\`

Triage Model Design:
\`\`\`
Input: [{symptom: "fever", severity: 8/10, onset: "2 hours ago"}, ...]
Output: {urgency: "emergent", care_level: "er", reasoning: "..."}

The model recommends care level (routine/urgent/emergent)
not a diagnostic category.

Training: validated against Manchester Triage System and ESI
(Emergency Severity Index) guidelines; reviewed by clinical team
before deployment; regular audit against ER triage nurse decisions.
\`\`\`

Language Guardrails in LLM Prompt:
\`\`\`
System prompt: "You are a healthcare assistant. You may:
- Recommend care levels (routine, urgent, ER)
- Provide general health information from authoritative sources
- Schedule appointments and answer administrative questions

You must NOT:
- Name specific diagnoses for a patient's symptoms
- Say 'you have [condition]' or 'this is [condition]'
- Recommend specific prescription medications
- Override the triage model's urgency assessment"
\`\`\`

Additional Safety Layer: the triage model runs independently of the LLM; if the triage model recommends "emergent" but the LLM generates a non-urgent response, the system overrides with the triage recommendation.`,
      },
      {
        question: 'How do you handle a patient who expresses suicidal ideation in a chat?',
        answer: `Why This Requires a Hard-Coded Protocol:
This is one of the few situations where an AI chatbot must have a completely deterministic, non-overridable response. The stakes are too high for probabilistic LLM behavior, however well-prompted.

Crisis Detection:
\`\`\`python
# Runs on EVERY message before LLM processing
def check_crisis_signals(message: str) -> CrisisLevel:
  # Pattern-based detection (fast, deterministic)
  explicit_signals = [
    "want to die", "kill myself", "end my life", "suicide",
    "not want to be here", "better off dead"
  ]
  implicit_signals = detect_via_fine_tuned_classifier(message)

  if any(phrase in message.lower() for phrase in explicit_signals):
    return CrisisLevel.IMMEDIATE
  if implicit_signals.crisis_probability > 0.85:
    return CrisisLevel.HIGH
  return CrisisLevel.NONE
\`\`\`

Crisis Protocol (non-overridable):
\`\`\`
If CrisisLevel.IMMEDIATE or CrisisLevel.HIGH:

1. IMMEDIATELY send response (bypasses all LLM processing):
   "I'm concerned about what you've shared. If you're having thoughts
   of suicide or self-harm, please:
   - Call or text 988 (Suicide and Crisis Lifeline) now
   - Text HOME to 741741 (Crisis Text Line)
   - Call 911 or go to your nearest emergency room

   I'm staying here with you. Are you safe right now?"

2. SIMULTANEOUSLY (in background):
   - Alert behavioral health on-call team with session ID
   - Create high-priority escalation record
   - Send patient a follow-up message offering warm transfer to crisis counselor

3. HOLD this intent in session state:
   - All subsequent responses acknowledge the disclosed distress
   - Do not return to routine medical questions until patient confirms safety
   - Human agent given priority routing if patient requests one
\`\`\`

What the Protocol Does NOT Do:
- Does not attempt to assess severity through continued questioning (risk of getting it wrong)
- Does not reassure the patient everything is fine (minimizes valid concern)
- Does not end the conversation (may be the patient's only connection in the moment)
- Does not try to resolve the crisis through conversation (not within chatbot clinical scope)

Training and Quality Audit:
- Protocol reviewed by behavioral health team quarterly
- False positive rate monitored (triggering crisis response on non-crisis messages)
- False negative case review when crisis escalations are received without prior detection`,
      },
    ],

    keyDecisions: [
      'RAG with authoritative sources vs LLM medical generation — chose RAG because LLM hallucination in medical context is a patient safety risk with legal liability; retrieving from FDA drug databases and clinical references and using LLM only for plain-language summarization provides accuracy with readability',
      'Store conversation history in EHR vs separate HIPAA-compliant datastore — chose separate datastore with structured summaries synced to EHR, because verbatim conversation transcripts in the clinical record add noise to the medical record and create documentation burdens; structured clinical summaries (triage outcome, screening result, appointment scheduled) belong in EHR',
      'Generic symptom chatbot vs specialty-routing chatbot — chose generic triage with specialty routing because building clinically validated specialty chatbots for 50+ specialties is not feasible; a validated generic triage routes to the right human specialist, which is clinically appropriate',
      'Hard-coded crisis protocol vs LLM-handled crisis — chose hard-coded protocol because the consequences of LLM behaving incorrectly in a suicide crisis are unacceptable; deterministic behavior is required for highest-stakes situations regardless of prompt quality',
      'HIPAA Business Associate Agreement with LLM provider vs on-premise LLM — chose BAA with external LLM provider (major providers including Anthropic and Azure OpenAI offer healthcare BAAs) combined with PHI scrubbing before API calls, because on-premise LLM deployment is expensive and the compute scale needed for reliable clinical quality is not feasible for most hospital systems',
    ],
  },

];
