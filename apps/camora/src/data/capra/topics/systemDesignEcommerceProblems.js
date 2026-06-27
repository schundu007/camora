// E-Commerce System Design Problems — extended coverage

export const ecommerceProblemCategories = [
  { id: 'ecommerce', name: 'E-commerce & Marketplace', icon: 'shoppingCart', color: '#f59e0b' },
  { id: 'logistics', name: 'Logistics & Fulfillment', icon: 'truck', color: '#10b981' },
];

export const ecommerceProblemCategoryMap = {
  'grocery-delivery': 'ecommerce',
  'buy-now-pay-later': 'ecommerce',
  'loyalty-rewards': 'ecommerce',
  'last-mile-delivery': 'logistics',
  'marketplace-seller-platform': 'ecommerce',
  'price-comparison-engine': 'ecommerce',
  'subscription-commerce': 'ecommerce',
  'warehouse-inventory': 'logistics',
  'social-commerce': 'ecommerce',
  'returns-refunds': 'logistics',
  'b2b-ecommerce': 'ecommerce',
  'supply-chain-tracking': 'logistics',
};

export const ecommerceDesigns = [
  {
    id: 'grocery-delivery',
    isNew: true,
    title: 'Grocery Delivery System',
    subtitle: 'Instacart / Amazon Fresh / DoorDash Grocery',
    icon: 'shoppingCart',
    color: '#10b981',
    difficulty: 'Hard',
    description: 'Design a grocery delivery platform that coordinates real-time inventory, personal shoppers, and slot-based delivery logistics across thousands of store locations.',

    introduction: `Grocery delivery is fundamentally different from restaurant delivery. A restaurant prepares your order after you place it, but a grocery order requires a human shopper to walk through a physical store and pick items from shelves that may already be out of stock by the time they arrive. Managing this live inventory uncertainty at scale is the core challenge.

The catalog problem alone is enormous. A single grocery store carries 30,000 to 50,000 unique SKUs, prices change daily, items go out of stock throughout the day, and perishables have expiration considerations that matter. Unlike a static product catalog, a grocery inventory system must sync with point-of-sale systems in real time and surface substitution options when the customer's first choice is unavailable.

Delivery scheduling introduces another layer of complexity. Unlike ride-sharing where the car arrives in minutes, grocery delivery requires slotted time windows (typically two-hour blocks) because order preparation takes 45 to 90 minutes and the customer needs to be home. Batching multiple orders for the same delivery window in the same geographic area is essential for unit economics but complicates the shopper and driver assignment problem significantly.

Weight-based pricing for produce and bulk items adds a financial settlement challenge unique to groceries. A customer orders two pounds of bananas, but the shopper weighs them at the store and finds they total 2.3 pounds. The final charge is unknown at order time and must be reconciled after pickup, with the customer's authorization covering a range rather than a fixed amount.`,

    functionalRequirements: [
      'Browse and search product catalog with real-time in-store inventory availability',
      'Place grocery orders with slot-based delivery scheduling (2-hour windows)',
      'Personal shopper mobile app for item picking, substitution handling, and photo proof of out-of-stock items',
      'Customer approval flow for substitutions with fallback to refund',
      'Weight-based pricing reconciliation for produce and bulk items after weighing at store',
      'Driver assignment and route optimization for batched multi-order deliveries',
      'Alcohol and age-restricted item verification at point of delivery',
      'Real-time order status tracking from picking start through delivery',
    ],

    nonFunctionalRequirements: [
      'Inventory sync latency under 60 seconds from POS event to catalog update',
      'Slot availability queries respond in under 200ms for checkout flow',
      'Shopper app works offline for 5 minutes to handle poor in-store connectivity',
      'Support 100K concurrent active orders during peak periods',
      'Substitution suggestion returned within 500ms of shopper marking an item unavailable',
    ],

    estimation: {
      users: '10M monthly active customers, 500K orders per day at peak, 50K active shoppers',
      storage: '50K SKUs per store × 10K stores = 500M product-store inventory records; order history at 5KB per order × 500K/day = 2.5GB/day',
      bandwidth: 'Shopper app sends photo proofs at ~200KB each, ~3 per order = 600KB per order × 500K orders = 300GB/day in photo uploads',
      qps: '500K orders/day = ~6 orders/sec average; slot availability queries peak at 5K QPS during morning rush',
    },

    apiDesign: {
      description: 'REST API covering catalog search, slot booking, order lifecycle, and shopper workflow',
      endpoints: [
        { method: 'GET', path: '/api/catalog/search', params: 'q, store_id, category, in_stock_only', response: '{ products[], total, facets }', description: 'Search products with real-time inventory filter for a specific store' },
        { method: 'GET', path: '/api/slots/available', params: 'store_id, zip_code, date_range', response: '{ slots[{ id, window_start, window_end, capacity_remaining, price }] }', description: 'Return available delivery slots for a store-zip combination' },
        { method: 'POST', path: '/api/orders', params: '{ store_id, slot_id, items[{ sku, quantity, substitution_preference }] }', response: '{ order_id, estimated_total_range, shopper_assignment_eta }', description: 'Place order with slot reservation' },
        { method: 'POST', path: '/api/orders/{id}/substitution-response', params: '{ item_id, action: approve|decline|suggest_alternative, alternative_sku? }', response: '{ updated_order }', description: 'Customer responds to shopper substitution request' },
        { method: 'PATCH', path: '/api/shopper/items/{id}', params: '{ status: picked|out_of_stock|substituted, weight_lbs?, photo_url?, substitution_sku? }', response: '{ next_item, order_progress }', description: 'Shopper updates item pick status during order fulfillment' },
        { method: 'GET', path: '/api/orders/{id}/tracking', params: '', response: '{ status, shopper_location?, eta_minutes, items_picked, items_total }', description: 'Customer order tracking including live shopper location' },
      ],
    },

    dataModel: {
      description: 'Core tables for inventory, orders, slots, and the shopper workflow',
      schema: `stores {
  id: bigint PK
  name: varchar(200)
  address: text
  lat: decimal(9,6)
  lng: decimal(9,6)
  timezone: varchar(50)
}

products {
  id: bigint PK
  sku: varchar(50) UNIQUE
  name: varchar(300)
  category_id: int FK
  unit_type: enum(each, lb, oz, kg)
  avg_weight_lbs: decimal(6,3) nullable  -- for weight-based items
  image_url: text
}

store_inventory {
  store_id: bigint FK
  sku: varchar(50)
  quantity_on_hand: int
  price_cents: int
  last_synced_at: timestamp
  PRIMARY KEY (store_id, sku)
}

delivery_slots {
  id: bigint PK
  store_id: bigint FK
  window_start: timestamp
  window_end: timestamp
  max_orders: int
  reserved_orders: int
  price_cents: int
}

orders {
  id: uuid PK
  customer_id: bigint FK
  store_id: bigint FK
  slot_id: bigint FK
  shopper_id: bigint nullable FK
  driver_id: bigint nullable FK
  status: enum(placed, assigned, picking, ready, out_for_delivery, delivered, cancelled)
  estimated_total_cents: int
  final_total_cents: int nullable
  placed_at: timestamp
  delivered_at: timestamp nullable
}

order_items {
  id: bigint PK
  order_id: uuid FK
  sku: varchar(50)
  quantity_requested: decimal(8,3)
  quantity_fulfilled: decimal(8,3) nullable
  unit_price_cents: int
  substitution_preference: enum(allow, decline, contact)
  status: enum(pending, picked, substituted, refunded, out_of_stock)
  actual_weight_lbs: decimal(6,3) nullable
}`,
      examples: [
        { table: 'store_inventory', label: 'Real-time banana inventory at store 42', json: '{ "store_id": 42, "sku": "PROD-BAN-YELLOW", "quantity_on_hand": 14, "price_cents": 59, "last_synced_at": "2025-06-01T14:32:11Z" }' },
        { table: 'orders', label: 'Active order being picked', json: '{ "id": "ord-7f3a9b2c", "customer_id": 1829304, "store_id": 42, "slot_id": 5501, "shopper_id": 8812, "status": "picking", "estimated_total_cents": 8750, "final_total_cents": null, "placed_at": "2025-06-01T13:00:00Z" }' },
        { table: 'order_items', label: 'Weight-based produce item after fulfillment', json: '{ "id": 1002, "order_id": "ord-7f3a9b2c", "sku": "PROD-BAN-YELLOW", "quantity_requested": 2.0, "quantity_fulfilled": 2.3, "unit_price_cents": 59, "substitution_preference": "allow", "status": "picked", "actual_weight_lbs": 2.3 }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single relational database stores the catalog and orders. Inventory is queried from the store POS system on each product page load. Shoppers use a simple mobile web interface. Slot availability is computed by counting existing orders per slot at query time.',
      problems: [
        'Catalog queries hit the POS API on every page load, overwhelming store systems during peak traffic',
        'Weight-based pricing final charges are handled manually via customer service rather than automated reconciliation',
        'No substitution workflow — shoppers call customers directly, creating inconsistent experience',
        'Slot availability queries scan the entire orders table with COUNT(*) per slot, causing slow checkout during peak',
        'No shopper route optimization — picker walks the store in random order, taking 2x longer than needed',
        'Inventory sync is batch-based nightly rather than real-time, leading to frequent out-of-stock surprises',
      ],
    },

    advancedImplementation: {
      title: 'Event-Driven Inventory Sync with Optimized Shopper Workflow',
      description: 'POS systems publish inventory delta events to Kafka. A consumer updates a Redis inventory cache per store-SKU key within 30 seconds of any shelf change. Slot capacity is maintained as a Redis counter with atomic DECR on reservation. Shopper picking sequence is optimized by store aisle map. Substitutions are surfaced in-app with pre-ranked alternatives. Weight-based items trigger a hold authorization at order time with final capture after weighing.',
      keyPoints: [
        'POS integration via webhook or CDC stream publishes inventory change events to Kafka; consumer maintains Redis cache keyed by store_id:sku with TTL of 2 minutes as safety net',
        'Slot reservation uses Redis DECR with Lua script for atomic check-and-decrement, preventing oversell without a database lock',
        'Shopper picking sequence generated by graph shortest-path through store aisle map, reducing average pick time by 40 percent',
        'Substitution engine ranks alternatives by: same brand + similar size, same category + closest price, customer purchase history similarity, current in-stock availability',
        'Weight-based items use a payment authorization hold at 150 percent of estimated price at order time; final amount captured after shopper weighs item',
        'Multi-order batching assigns a shopper to pick 2 to 3 orders simultaneously when they share the same store and delivery window, increasing shopper utilization',
        'Real-time shopper GPS shared with customer via WebSocket when order enters out-for-delivery status',
      ],
      databaseChoice: 'PostgreSQL for orders, customers, and financial records (ACID required for payment holds and final captures); Redis for inventory cache, slot counters, and shopper session state; S3 for photo proofs; Kafka for POS event streaming; Elasticsearch for product search with inventory filter',
      caching: 'Redis inventory cache per store-SKU with 60-second TTL and POS event invalidation; slot availability counters in Redis with atomic operations; popular product details cached in CDN for 5 minutes; shopper pick sequence cached in-memory on shopper device for offline resilience',
    },

    tips: [
      'Start by clarifying the scope: are you designing the customer app, the shopper app, the inventory system, or the full platform? Each is a valid interview answer.',
      'The weight-based pricing challenge is unique to grocery — explaining the authorization hold pattern shows depth.',
      'Inventory sync is the hardest part: explain the tradeoff between real-time POS webhooks, periodic batch sync, and safety stock buffers for common out-of-stock handling.',
      'Substitution logic is where product thinking shows: a good system presents ranked alternatives, not just a yes/no prompt.',
      'Mention slot capacity management separately from order management — it is a separate concurrency problem with atomic reservation requirements.',
      'Shopper pick path optimization using the store aisle map is a differentiator that shows systems thinking beyond just CRUD.',
    ],

    keyQuestions: [
      {
        question: 'How do you keep grocery inventory accurate when a shopper grabs the last avocado seconds before another customer orders it?',
        answer: `**The core challenge** is that grocery inventory changes physically in the store, not in a database. Three approaches:

**1. Real-time POS sync (best for chains with modern POS)**
- POS system publishes item-scan events to a message queue
- Consumer updates Redis cache per store-SKU within ~30 seconds
- Customers see "low stock" warnings when quantity < 3
- Tradeoff: requires POS integration, latency is 30-60 seconds not zero

**2. Safety stock buffers (simpler but less accurate)**
- Never show item as available when inventory < buffer (e.g., 2 units)
- Reduces conflict at the cost of slightly lower conversion
- Works without POS integration, just periodic batch sync

**3. Shopper marks unavailable at pick time (ground truth)**
- No matter how good real-time sync is, shopper can always mark an item unavailable
- Trigger substitution workflow immediately when this happens
- This is the final safety net regardless of approach 1 or 2

**In production:** Combine all three. Real-time sync for hot products, safety buffer for long-tail, shopper confirmation as ground truth. Never promise an item is available — promise the shopper will try to get it.`,
      },
      {
        question: 'How do you handle weight-based pricing when the final price is unknown at order time?',
        answer: `**The problem:** Customer orders 2 lbs of salmon at $12/lb = $24 expected. Shopper weighs it: 2.4 lbs. Final charge is $28.80. Customer's card must not be charged the wrong amount.

**Payment authorization hold approach:**
\`\`\`
1. At order placement: authorize hold for 150% of estimated price
   - 2 lbs × $12 = $24 estimate → authorize $36 hold
   - Hold reserves funds but does not capture/charge

2. Shopper weighs item on store scale:
   - Records actual weight: 2.4 lbs in the shopper app
   - App calculates final price: 2.4 × $12 = $28.80

3. At order completion (after all items picked):
   - Final capture for actual total: $28.80
   - Hold for $36 released, actual $28.80 charged
   - Customer sees final itemized receipt with actual weights
\`\`\`

**Edge cases to discuss:**
- Customer's card has insufficient funds for the 150% hold → show estimated range at checkout, not exact price
- Multiple weight-based items → aggregate into single hold adjustment
- Item price changes between order and pick → use price at time of pick (shopper scans barcode)
- Customer disputes final weight → photo proof from shopper is the evidence`,
      },
      {
        question: 'How does the shopper app workflow handle the picking process at scale?',
        answer: `**Shopper app core loop:**
\`\`\`
1. Shopper accepts order batch (1-3 orders from same store)
2. App generates optimized pick list sorted by store aisle
3. For each item:
   a. Show product photo + location hint (Aisle 7, Produce section)
   b. Shopper scans barcode to confirm correct item
   c. If weight-based: enter weight from scale
   d. If unavailable: tap "Out of stock" → app shows substitution options
      - Pre-ranked by: same brand, similar size, in-stock, price match
      - Shopper selects substitute or sends customer notification
4. After all items: mark order ready, hand to driver or place in staging area
\`\`\`

**Picking sequence optimization:**
- Store provides a planogram (map of which SKU is in which aisle)
- App runs shortest-path through aisles for all items in the batch
- Reduces average pick time from 60 minutes to 35 minutes per order

**Offline resilience (critical for poor in-store Wi-Fi):**
- Download full order details on job accept (before entering store)
- Buffer pick status updates locally, sync when connectivity returns
- Never block a shopper action on a network call — optimistic local state

**Multi-order batching:**
- Two orders for same delivery window shown as interleaved pick list
- Items grouped by aisle across both orders: pick aisle 1 items for both orders, then aisle 2, etc.
- Shopper sees which bag each item goes into (color-coded by order)`,
      },
    ],

    keyDecisions: [
      'Real-time POS webhook sync vs nightly batch sync — chose real-time because grocery inventory turns over within hours and stale data causes 15-20 percent of orders to have at least one out-of-stock item',
      'Slot reservation via Redis atomic counters vs database row locking — chose Redis because slot availability is queried 100x more than it is booked, and optimistic atomic DECR eliminates lock contention at checkout',
      'Shopper barcode scan confirmation vs honor-system picking — chose scan confirmation because it reduces wrong-item complaints by 80 percent and provides audit trail for disputes',
      'Authorization hold at 150 percent vs charging estimated price and reconciling via refund — chose hold because customers strongly dislike unexpected charges even when followed by refund, while a hold adjusting downward feels better',
      'Single shopper per order vs multi-order batching — chose batching for economics (2-3x shopper utilization) with opt-out for premium same-hour delivery tiers where speed matters more than cost',
    ],
  },

  {
    id: 'buy-now-pay-later',
    isNew: true,
    title: 'Buy Now Pay Later (BNPL) System',
    subtitle: 'Klarna / Affirm / Afterpay',
    icon: 'dollarSign',
    color: '#6366f1',
    difficulty: 'Hard',
    description: 'Design a buy now pay later platform that makes real-time credit decisions at checkout, manages installment payment schedules, and handles the full lifecycle including returns and defaults.',

    introduction: `Buy now pay later transforms a single purchase transaction into a short-term credit product. When a customer clicks "Pay in 4" at checkout, the BNPL platform must make a credit decision in under two seconds, split the payment into installments, pay the merchant the full amount immediately, and then collect from the customer over weeks or months. This is consumer lending at internet speed.

The credit decision is the hardest part. Traditional credit underwriting takes days and relies on hard credit pulls that hurt the borrower's credit score. BNPL systems must make real-time decisions using soft signals: device fingerprint, purchase history with the platform, email address reputation, purchase amount relative to prior successful repayments, and occasionally a soft bureau pull that does not impact credit score. The model must balance approval rate (higher is better for merchant conversion) against default rate (lower is better for profitability).

Merchant integration is the growth lever. BNPL providers offer a JavaScript SDK that injects a "Pay in 4" button into any checkout flow. The provider pays the merchant the full purchase amount minus a merchant discount rate (typically 2 to 8 percent), then owns the consumer receivable. This means the BNPL provider takes on all credit risk in exchange for volume-based economics, and merchants benefit from higher conversion rates and larger average order values.

Fraud is different from default. A fraudster uses stolen credentials to make a purchase and disappears. A legitimate customer who defaults could not pay. The BNPL system needs separate models for each: fraud scoring happens in milliseconds using device and identity signals, while default risk scoring uses repayment history and bureau data. Getting these signals right is the difference between a profitable and unprofitable BNPL business.`,

    functionalRequirements: [
      'Real-time credit approval or decline decision at checkout in under 2 seconds',
      'Installment plan generation (Pay in 4 biweekly, 3/6/12 month with APR for longer terms)',
      'Merchant JavaScript SDK and server-side API for checkout integration',
      'Automated payment collection on scheduled installment due dates via ACH or card',
      'Dunning workflow for failed payments: retry schedule, customer notification, late fees',
      'Return and refund handling: merchant refund cancels remaining installments and refunds paid ones',
      'Customer dashboard showing active plans, payment history, and upcoming due dates',
      'Merchant settlement: disburse purchase amount minus fee within 1 to 2 business days',
    ],

    nonFunctionalRequirements: [
      'Credit decision API responds in under 2 seconds at p99 to avoid abandoning checkout sessions',
      'Payment processing must be idempotent to handle retries without double-charging',
      'Fraud model inference completes in under 200ms as part of the credit decision pipeline',
      'Support 500K checkout approval requests per day at peak season',
      'Financial records must be immutable and auditable for regulatory compliance',
    ],

    estimation: {
      users: '20M active borrowers, 500K merchants integrated, 2M installment plans created per day at peak',
      storage: 'Loan records at 2KB each × 100M total plans = 200GB; payment events append-only ledger at 500B × 1B events = 500GB; fraud signals at 1KB × 2M decisions/day = 2GB/day',
      bandwidth: 'Merchant SDK loaded on 50M product pages daily = ~5TB/day CDN traffic; API calls at 500K decisions/day × 10KB average = 5GB/day',
      qps: '500K decisions/day = ~6/sec average; 10M installment charges spread over 30 days = ~4K payment processing events/sec on peak charge dates',
    },

    apiDesign: {
      description: 'Checkout integration API, payment management, and merchant settlement endpoints',
      endpoints: [
        { method: 'POST', path: '/v1/checkout/initiate', params: '{ merchant_id, order_id, amount_cents, customer_email, customer_phone, items[], shipping_address }', response: '{ session_token, approved_plans[{ type, installments, apr_bps, down_payment_cents }], redirect_url }', description: 'Start BNPL checkout, returns credit decision and available plan options' },
        { method: 'POST', path: '/v1/checkout/confirm', params: '{ session_token, selected_plan, payment_method_token }', response: '{ loan_id, first_payment_date, schedule[{ due_date, amount_cents }], merchant_disbursement_eta }', description: 'Customer confirms plan selection and payment method, creates loan' },
        { method: 'GET', path: '/v1/loans/{id}', params: '', response: '{ loan_id, status, original_amount, paid_amount, remaining_amount, installments[], next_payment }', description: 'Customer views loan status and payment schedule' },
        { method: 'POST', path: '/v1/loans/{id}/refund', params: '{ refund_amount_cents, reason }', response: '{ refund_id, cancelled_installments[], refunded_amount_cents, owed_amount_cents }', description: 'Merchant initiates refund which cancels future installments and refunds paid amounts' },
        { method: 'GET', path: '/v1/merchants/{id}/settlements', params: 'date_from, date_to', response: '{ settlements[{ date, gross_amount_cents, fee_cents, net_amount_cents, order_ids[] }] }', description: 'Merchant settlement report' },
      ],
    },

    dataModel: {
      description: 'Loan lifecycle, payment schedule, and financial ledger',
      schema: `credit_applications {
  id: uuid PK
  session_token: varchar(64) UNIQUE
  merchant_id: bigint FK
  merchant_order_id: varchar(100)
  customer_email: varchar(255)
  customer_phone: varchar(20)
  amount_cents: int
  decision: enum(approved, declined, manual_review)
  decision_score: int  -- 0-1000 internal risk score
  fraud_score: int
  decided_at: timestamp
  ip_address: inet
  device_fingerprint: varchar(128)
}

loans {
  id: uuid PK
  application_id: uuid FK
  merchant_id: bigint FK
  customer_id: bigint FK
  plan_type: varchar(20)   -- pay_in_4, monthly_3, monthly_6, monthly_12
  principal_cents: int
  apr_bps: int             -- basis points, 0 for Pay in 4
  status: enum(active, paid_off, defaulted, cancelled, refunded)
  created_at: timestamp
  paid_off_at: timestamp nullable
}

installments {
  id: bigint PK
  loan_id: uuid FK
  seq: int                 -- 1 to N
  due_date: date
  amount_cents: int
  status: enum(scheduled, paid, failed, waived, refunded)
  paid_at: timestamp nullable
  payment_attempt_count: int DEFAULT 0
}

payment_events {
  id: bigint PK
  installment_id: bigint FK
  event_type: enum(charge_attempt, charge_success, charge_failed, refund, waiver)
  amount_cents: int
  payment_processor_ref: varchar(100)
  created_at: timestamp
  -- append-only, never updated
}

merchant_settlements {
  id: bigint PK
  merchant_id: bigint FK
  period_start: date
  period_end: date
  gross_amount_cents: bigint
  fee_cents: bigint
  net_amount_cents: bigint
  disbursed_at: timestamp nullable
}`,
      examples: [
        { table: 'loans', label: 'Active Pay in 4 loan', json: '{ "id": "loan-a1b2c3d4", "application_id": "app-z9y8x7w6", "merchant_id": 5501, "customer_id": 182930, "plan_type": "pay_in_4", "principal_cents": 12000, "apr_bps": 0, "status": "active", "created_at": "2025-06-01T10:00:00Z" }' },
        { table: 'installments', label: 'Third installment failed and retrying', json: '{ "id": 40032, "loan_id": "loan-a1b2c3d4", "seq": 3, "due_date": "2025-07-15", "amount_cents": 3000, "status": "failed", "paid_at": null, "payment_attempt_count": 2 }' },
        { table: 'payment_events', label: 'Failed charge attempt event', json: '{ "id": 900112, "installment_id": 40032, "event_type": "charge_failed", "amount_cents": 3000, "payment_processor_ref": "stripe_pi_3abc_failed", "created_at": "2025-07-15T09:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single service receives checkout requests, queries a credit bureau synchronously, and creates a loan record. Installment charges run as a nightly batch job. Refunds are handled manually by the support team.',
      problems: [
        'Synchronous credit bureau query adds 3 to 5 seconds of latency, causing checkout abandonment',
        'Nightly batch charging causes all payment failures to pile up on the same day, overwhelming support',
        'No fraud scoring separate from credit scoring means fraudsters with thin credit files slip through',
        'Manual refund handling does not scale beyond 1K transactions per day',
        'No idempotency on payment attempts causes double charges when retry logic fires on network timeouts',
        'Merchant settlement calculation done ad hoc in SQL queries rather than event-sourced ledger',
      ],
    },

    advancedImplementation: {
      title: 'Real-Time Credit Engine with Event-Sourced Ledger',
      description: 'A low-latency credit decisioning service runs a two-stage ML pipeline: a fast fraud model (device + identity signals, under 100ms) gates into a credit risk model (purchase history + soft bureau, under 800ms). Loan creation uses event sourcing with an append-only payment_events ledger for auditability. Installment charging is distributed throughout the day using a priority queue that spreads load and retries intelligently. Returns trigger an idempotent refund saga that calcels installments and issues partial credits atomically.',
      keyPoints: [
        'Two-stage ML pipeline: fraud model first (fast, eliminates obvious bad actors), credit model second (slower, uses richer signals for borderline cases)',
        'Soft bureau pull via Experian or TransUnion PreQual API returns in 400 to 600ms and does not affect customer credit score',
        'Payment event ledger is append-only with idempotency key per attempt, making double-charge impossible even under retry storms',
        'Installment charge queue distributes payments throughout business hours using a priority queue sorted by due date, not midnight batch',
        'Dunning workflow: Day 0 charge fails → Day 1 retry + SMS notification → Day 3 retry + email → Day 7 retry + late fee → Day 14 suspend future purchases → Day 30 collections handoff',
        'Refund saga: receive merchant refund event → compute installments to cancel → compute amounts already paid → issue refund for paid-minus-down-payment → all steps are idempotent and retry-safe',
        'Merchant SDK is a 3KB JavaScript snippet that renders the BNPL button client-side; all credit logic runs server-side with the session token, keeping sensitive signals off the browser',
      ],
      databaseChoice: 'PostgreSQL for loans, installments, and customers (strict ACID for financial records); Redis for session tokens and in-progress checkout state (TTL of 30 minutes); Kafka for payment events and dunning job queue; ClickHouse for fraud analytics and merchant reporting; S3 for archived event logs for regulatory retention',
      caching: 'Merchant configuration cached in Redis with 5-minute TTL; customer repayment history pre-fetched and cached on checkout start; fraud model features (device fingerprint history) cached in Redis for repeat customers; installment schedule generated once on loan creation and stored, not recalculated',
    },

    tips: [
      'Clarify whether the interviewer wants the credit decisioning system, the payment scheduling system, the merchant integration, or all three — scope accordingly.',
      'The key insight is that BNPL is a lending product operating at checkout speed — the credit decision latency constraint drives almost every architecture choice.',
      'Distinguish fraud risk (bad actor using stolen credentials) from credit risk (legitimate customer who cannot pay) — they require different models and different data signals.',
      'The append-only payment ledger is critical for a financial product — explain why you would never UPDATE a payment record, only INSERT new events.',
      'Dunning workflow design is a good place to show product thinking: how many retries, what intervals, when do you charge late fees, when do you cut off the customer from future purchases.',
      'Return handling is a common follow-up: explain the partial refund calculation (already paid 2 of 4 installments, merchant refunds 75 percent) and how that maps to installment cancellations.',
    ],

    keyQuestions: [
      {
        question: 'How do you make a credit decision in under 2 seconds without a hard credit pull?',
        answer: `**Constraint:** Hard credit pull (traditional bureau inquiry) takes 5-10 seconds, hurts customer credit score, and is overkill for a $200 BNPL transaction.

**Two-stage ML pipeline:**

**Stage 1: Fraud scoring (< 100ms)**
Features used (no bureau needed):
- Device fingerprint: is this device associated with fraud history?
- Email age and reputation (new Gmail = higher risk)
- IP address: proxy/VPN/Tor detected?
- Phone number verification: carrier match, age of number
- Velocity: how many BNPL applications from this device/email/phone today?

If fraud score > threshold → decline immediately. ~90% of fraudsters stopped here.

**Stage 2: Credit scoring (< 800ms)**
For fraud-cleared applicants:
\`\`\`
Signals (in decreasing weight):
1. Prior BNPL repayment history (best signal — behavioral, not bureau)
2. Soft bureau pull (Experian PreQual): credit score range, recent delinquencies
   - Soft pull = 400-600ms, does NOT hurt credit score
3. Purchase amount relative to prior successful repayments
4. Device + behavioral signals (session time, typing patterns)
5. Email/phone account age signals
\`\`\`

**Decision:**
- Score > 750 → instant approve, high limit
- Score 600-750 → approve with lower limit or require down payment
- Score < 600 → decline with reason code

**Total pipeline: 100ms + 800ms = ~900ms** leaving 1.1s buffer for network and checkout rendering.

**For first-time customers (no repayment history):**
Rely more heavily on soft bureau + device signals. Approve conservatively (lower limit) and build history from their first transaction.`,
      },
      {
        question: 'How do you handle a return when the customer has already paid 2 of 4 installments?',
        answer: `**Scenario:** Customer bought $120 item, Pay in 4 = $30 every 2 weeks. They paid installments 1 and 2 ($60 total). Now they return the item and the merchant issues a full refund.

**Refund calculation:**
\`\`\`
Total paid by customer to BNPL: $60
BNPL paid merchant at purchase: $120 (minus fee, say $110 net)
Merchant refunds BNPL: $120

BNPL owes customer: $60 (what they already paid)
BNPL cancels installments 3 and 4 (customer owes nothing more)
BNPL net position: received $120 from merchant refund, paid out $60 to customer = $60 recovered
\`\`\`

**Partial return (customer returns half the order):**
- Merchant refunds $60 to BNPL
- BNPL cancels installment 4 ($30), reduces installment 3 to $0
- Customer already paid $60, merchant refunded $60 → net zero, loan closed

**Idempotent refund saga steps:**
1. Receive merchant refund webhook (with idempotency key)
2. Look up loan by merchant order ID
3. Calculate which installments to cancel (future ones first)
4. Calculate refund owed to customer = amount paid - any applicable fees
5. Issue refund to customer's original payment method
6. Update installment statuses to REFUNDED/CANCELLED
7. Mark loan as REFUNDED if fully settled

Each step is idempotent — retrying the saga from any step produces the same result.`,
      },
      {
        question: 'How do you prevent the buy-expensive-item-and-return-it-after-last-installment fraud pattern?',
        answer: `**The scam:** Customer buys $800 laptop using BNPL. Makes all 4 payments ($200 each). Returns the laptop on day 61 (after return window... or tries to claim it as defective). Gets $800 cash back from merchant. Has effectively gotten a free $800 for the cost of paying $800 over 8 weeks with no APR.

**Note:** This is largely a merchant problem, not a BNPL problem — if the merchant accepts the return and issues a refund, they bear the loss. But BNPL platforms can help:

**Controls:**
1. **Category risk scoring:** High-value electronics, luxury goods, and categories with high return rates get stricter approval criteria and lower limits for new customers
2. **Return rate tracking per customer:** Customer who has returned 3 of last 5 BNPL purchases gets flagged; future approvals require stronger credit signals
3. **Merchant return policy enforcement:** BNPL contract with merchants specifies return windows; merchants must honor their stated policy or bear the refund cost
4. **Chargeback analysis:** If the same customer uses "item not as described" chargebacks repeatedly, block them from future BNPL purchases
5. **Velocity limits:** Cap total outstanding BNPL balance per customer to prevent someone from running the scheme on 10 items simultaneously

**What BNPL cannot do:** Force merchants to reject fraudulent returns. The relationship is: BNPL protects itself by risk-scoring customers; merchants protect themselves by their return policies and fraud detection at return time.`,
      },
    ],

    keyDecisions: [
      'Soft bureau pull vs no bureau pull — chose soft pull because it dramatically improves default prediction accuracy for amounts over $200, the incremental 400ms latency is within budget, and it does not harm customer credit score',
      'Append-only payment events ledger vs mutable payment records — chose append-only because financial regulations require immutable audit trail, and event sourcing makes refund calculation deterministic from event replay',
      'Distributed installment charging throughout the day vs nightly batch — chose distributed because batching causes thundering-herd failures on charge dates and concentrates fraud risk at a single moment',
      'BNPL pays merchant upfront and owns receivable vs escrow model — chose upfront payment because it is the core value proposition to merchants (instant cash, no credit risk) even though it means BNPL takes on the consumer default risk',
      'Platform-level fraud model vs per-merchant fraud model — chose platform-level because cross-merchant signals (customer defaults elsewhere on the platform) are the strongest fraud predictor, and per-merchant models lack data for small merchants',
    ],
  },

  {
    id: 'loyalty-rewards',
    isNew: true,
    title: 'Loyalty and Rewards System',
    subtitle: 'Starbucks Rewards / Amazon Prime / Sephora Beauty Insider',
    icon: 'layers',
    color: '#f59e0b',
    difficulty: 'Medium',
    description: 'Design a loyalty platform that tracks point earning and redemption across multiple channels, manages tier status, and prevents fraud, with a consistent real-time balance visible to customers.',

    introduction: `Loyalty programs are one of the highest-leverage tools in retail. Starbucks' rewards program holds more money than many regional banks because customers prepay for drinks they have not yet ordered. Amazon Prime converts 40 percent more purchases per year from members than non-members. The business value is enormous, which means the technical demands are equally high: the points balance must always be accurate, redemption must be instant and consistent, and the system must prevent the many forms of fraud that free currency invariably attracts.

The core data model is a ledger. Every point earned or spent is a transaction in an append-only ledger, not an increment or decrement on a mutable balance field. This design makes the system auditable, reversible, and fraud-investigable. The displayed balance is always derived from summing the ledger, not stored directly. This adds query complexity but eliminates the class of bugs where a balance goes negative or a double-spend slips through.

Tier status is a derived property that follows from cumulative earning. A customer who has earned 500 stars this year is Gold tier; one who has earned 1,000 stars is Platinum. Tier changes can happen upward at any transaction but only downward at an annual reset date. This asymmetry means tier state changes must be detected on every earn event but annual downgrades can be batched. The challenge is broadcasting tier upgrades immediately so the customer sees their new status and benefits in real time.

Partner programs add integration complexity. A customer who buys an airline ticket earns hotel loyalty points. A customer who pays with a co-branded credit card earns both bank points and retailer points simultaneously. Each integration requires a partner API contract defining earn rates, valid transaction types, and reconciliation terms. Outbound partner notifications and inbound credit events from partners must both be handled idempotently because network failures and retries are inevitable.`,

    functionalRequirements: [
      'Earn points on purchases across all channels (in-store, online, app, partner brands)',
      'Redeem points for products, discounts, or experiences with atomic balance deduction',
      'Tier system with automatic upgrades on crossing thresholds and annual downgrade evaluation',
      'Partner program integration for earning and spending points with external brands',
      'Points expiry: earn events expire 12 months after the earning date on a rolling basis',
      'Promotional mechanics: double points events, birthday bonuses, targeted bonus offers',
      'Anti-abuse controls: prevent fake purchases, account sharing, and balance manipulation',
      'Member dashboard with real-time balance, tier status, expiry warnings, and transaction history',
    ],

    nonFunctionalRequirements: [
      'Balance reads must reflect the most recent transaction within 500ms',
      'Redemption requests are idempotent and prevent concurrent double-spend of the same points',
      'System handles 100K point-earning events per second during peak promotional periods',
      'Points ledger is immutable and fully auditable for regulatory and fraud investigation',
      'Partner integration APIs handle retry storms with idempotency keys and exponential backoff',
    ],

    estimation: {
      users: '50M active members, 5M transactions per day earning points, 500K redemptions per day',
      storage: 'Ledger entries at 500 bytes each × 1B entries = 500GB; member tier state at 1KB × 50M members = 50GB',
      bandwidth: 'Balance queries at 50M members × 2 queries/day = 100M queries/day; partner event ingestion at 1M events/day × 2KB = 2GB/day',
      qps: '5M earn events/day = ~58/sec average; promotional flash events can spike to 100K/sec; 500K redemptions/day = ~6/sec average',
    },

    apiDesign: {
      description: 'Points ledger API for earn, redeem, and balance with idempotent write operations',
      endpoints: [
        { method: 'POST', path: '/v1/members/{id}/earn', params: '{ transaction_id, channel, amount_cents, earn_rule_id, metadata }', response: '{ event_id, points_earned, new_balance, tier_status, tier_upgrade? }', description: 'Record a point-earning event, idempotent on transaction_id' },
        { method: 'POST', path: '/v1/members/{id}/redeem', params: '{ redemption_id, points_to_redeem, reward_type, reward_id }', response: '{ event_id, points_redeemed, new_balance, reward_confirmation }', description: 'Redeem points with optimistic locking to prevent double-spend' },
        { method: 'GET', path: '/v1/members/{id}/balance', params: '', response: '{ current_balance, expiring_soon_points, expiry_date, tier, tier_points_ytd, points_to_next_tier }', description: 'Current balance computed from ledger with expiry preview' },
        { method: 'GET', path: '/v1/members/{id}/transactions', params: 'limit, cursor, type', response: '{ events[{ date, type, points, channel, description, expiry_date }], next_cursor }', description: 'Paginated transaction history from ledger' },
        { method: 'POST', path: '/v1/partners/{id}/earn', params: '{ partner_transaction_id, member_id, partner_points, conversion_rate }', response: '{ event_id, camora_points_credited }', description: 'Inbound partner earn event, idempotent on partner_transaction_id' },
      ],
    },

    dataModel: {
      description: 'Append-only ledger as the source of truth for all point balances and transactions',
      schema: `members {
  id: bigint PK
  email: varchar(255) UNIQUE
  tier: enum(base, silver, gold, platinum)
  tier_since: date
  tier_year_points: int  -- cached for performance, derived from ledger
  created_at: timestamp
}

point_events {
  id: bigint PK (auto-increment)
  member_id: bigint FK
  event_type: enum(earn, redeem, expire, adjust, bonus, partner_earn)
  points: int              -- positive for earn, negative for redeem/expire
  balance_after: int       -- running balance at time of event (denormalized for performance)
  reference_id: varchar(100) UNIQUE  -- idempotency key: order_id, redemption_id, etc.
  channel: varchar(50)     -- app, web, in_store, partner
  earn_rule_id: int nullable FK
  expiry_date: date nullable  -- set on earn events
  created_at: timestamp
  -- NEVER UPDATE OR DELETE rows in this table
}

earn_rules {
  id: int PK
  name: varchar(100)
  points_per_dollar: decimal(6,2)
  multiplier: decimal(4,2) DEFAULT 1.0  -- for double points promotions
  channel: varchar(50) nullable         -- null = all channels
  category: varchar(50) nullable
  valid_from: timestamp
  valid_to: timestamp nullable
  tier_minimum: enum(base, silver, gold, platinum) nullable
}

redemption_catalog {
  id: bigint PK
  name: varchar(200)
  points_cost: int
  reward_type: enum(product, discount, experience, donation)
  inventory: int nullable   -- null = unlimited
}`,
      examples: [
        { table: 'point_events', label: 'Double points promotional earn event', json: '{ "id": 8829001, "member_id": 550123, "event_type": "earn", "points": 200, "balance_after": 1450, "reference_id": "order-abc-12345", "channel": "app", "earn_rule_id": 42, "expiry_date": "2026-06-01", "created_at": "2025-06-01T14:22:00Z" }' },
        { table: 'point_events', label: 'Redemption event reducing balance', json: '{ "id": 8829002, "member_id": 550123, "event_type": "redeem", "points": -500, "balance_after": 950, "reference_id": "redemption-xyz-789", "channel": "app", "earn_rule_id": null, "expiry_date": null, "created_at": "2025-06-02T09:10:00Z" }' },
        { table: 'members', label: 'Gold tier member with cached YTD points', json: '{ "id": 550123, "email": "member@example.com", "tier": "gold", "tier_since": "2025-01-01", "tier_year_points": 820, "created_at": "2022-03-15T00:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single service stores points as a balance integer on the member record. Earn events increment the balance, redemptions decrement it. Tier status is a separate field updated manually or via a daily job.',
      problems: [
        'Mutable balance field causes race conditions when concurrent transactions both read and increment without locking',
        'No audit trail: if a balance is wrong, there is no history to investigate why',
        'Double-spend possible: two redemption requests processed simultaneously can both see sufficient balance and both succeed',
        'Points expiry requires scanning all members nightly with no granular per-earn-event tracking of when each point expires',
        'Tier upgrades happen the next day when the batch job runs, not in real time at the transaction that crosses the threshold',
        'Partner earn events have no idempotency, so retried webhooks credit points multiple times',
      ],
    },

    advancedImplementation: {
      title: 'Append-Only Ledger with Optimistic Locking for Redemptions',
      description: 'The points_events table is the source of truth. Balance is derived from SUM(points) over the ledger for a member. A cached balance_after column on the most recent event provides O(1) balance reads. Redemptions use optimistic locking: read current balance from the most recent ledger row, write the redemption event with a WHERE clause verifying the expected prior balance, and retry on conflict. Expiry runs as a daily job that inserts negative expire events for earn events whose expiry_date has passed. Tier upgrade detection runs inline on each earn event by comparing tier_year_points against thresholds.',
      keyPoints: [
        'Append-only ledger: every earn, redeem, expire, and adjustment is a new row, never an update to an existing row, providing full audit history',
        'Balance is derived from the balance_after column on the most recent ledger row for a member, not a separate balance field, eliminating balance drift bugs',
        'Redemption uses optimistic concurrency: INSERT INTO point_events WHERE NOT EXISTS (SELECT 1 FROM point_events WHERE member_id = X AND id > last_seen_id AND event_type = redeem), preventing double-spend without a lock',
        'Idempotency enforced via UNIQUE constraint on reference_id: duplicate earn events (network retries, partner double-send) silently succeed without crediting twice',
        'Tier upgrade detected synchronously on earn events using tier_year_points cached on the members table; cache updated atomically with the ledger insert',
        'Expiry processed as a background job that queries earn events where expiry_date = today and inserts corresponding negative expire events, not a balance modification',
        'Promotional earn rules evaluated at earn time using the earn_rules table with time-range and channel filters, storing earn_rule_id on each event for auditability',
      ],
      databaseChoice: 'PostgreSQL for the point_events ledger and members table with strong ACID guarantees; Redis for session-level balance cache (invalidated on any write to the ledger); Kafka for partner earn event ingestion with idempotent consumer; ClickHouse for analytics queries over the full ledger history without impacting the transactional database',
      caching: 'Balance cache in Redis keyed by member_id, populated on first read and invalidated on any ledger write; earn rules cached in application memory with 5-minute TTL since they change infrequently; tier thresholds cached in memory as constants; partner conversion rates cached in Redis with 1-hour TTL',
    },

    tips: [
      'The append-only ledger design is the most important architectural decision — explain why it beats a mutable balance field for financial correctness.',
      'Clarify the double-spend prevention mechanism early: optimistic locking with a WHERE NOT EXISTS is the standard pattern and shows database expertise.',
      'Expiry design is a common deep-dive: earning points expire 12 months after earning, not after the last transaction — this requires per-event expiry dates, not a single member expiry date.',
      'Tier upgrade timing is a product question embedded in the technical design: upgrade immediately on crossing the threshold (good customer experience) vs upgrade on next purchase (simpler but worse experience).',
      'Partner integrations are a good place to discuss idempotency: partner systems will retry webhook deliveries, and the UNIQUE reference_id constraint is the correct solution.',
      'Mention GDPR and the right to deletion: since the ledger is append-only, deletion means inserting a zeroing event plus marking PII fields as deleted in the members table, not deleting ledger rows.',
    ],

    keyQuestions: [
      {
        question: 'How do you prevent a customer from spending points they do not have when two redemptions arrive simultaneously?',
        answer: `**The problem:** Customer has 500 points. They open the app on two devices and tap "Redeem 500 points" on both simultaneously. Both requests read a balance of 500, both see sufficient points, both write a -500 redemption. Customer ends up with -500 points.

**Solution: Optimistic concurrency control on the ledger**

\`\`\`sql
-- Each redemption reads the most recent event row
SELECT id, balance_after FROM point_events
WHERE member_id = 550123
ORDER BY id DESC LIMIT 1;
-- Returns: id=8829001, balance_after=500

-- Attempt to insert redemption, but only if balance has not changed
INSERT INTO point_events (member_id, event_type, points, balance_after, reference_id)
SELECT 550123, 'redeem', -500, 0, 'redemption-req-A'
WHERE NOT EXISTS (
  SELECT 1 FROM point_events
  WHERE member_id = 550123 AND id > 8829001  -- no newer event exists
)
AND (SELECT balance_after FROM point_events WHERE member_id = 550123 ORDER BY id DESC LIMIT 1) >= 500;
\`\`\`

**What happens with two concurrent requests:**
- Request A reads: most recent event id=8829001, balance=500
- Request B reads: most recent event id=8829001, balance=500
- Request A inserts: succeeds, creates event id=8829002 with balance=0
- Request B inserts: WHERE clause checks if id > 8829001 exists → yes, it does → INSERT 0 rows → conflict detected
- Request B retries, re-reads balance=0, returns "insufficient balance" to user

**Why not a SELECT FOR UPDATE lock?**
Locks work but reduce throughput under high concurrency and can cause deadlocks. Optimistic concurrency is better when conflicts are rare (which they are — most users do not redeem from two devices simultaneously).

**UNIQUE constraint as backup:**
The reference_id UNIQUE constraint prevents the same redemption ID from being inserted twice, catching cases where the app retries on timeout rather than the user double-tapping.`,
      },
      {
        question: 'How do you design points expiry when different earned points expire at different times?',
        answer: `**Requirement:** Points expire 12 months after they were earned (rolling expiry, not calendar year expiry). A customer who earned 100 points in January 2024 and 200 points in June 2024 loses the 100 points in January 2025 and the 200 points in June 2025.

**Design: Per-earn-event expiry date**

Every earn event in the ledger stores an expiry_date:
\`\`\`
earn event on 2024-01-15: 100 points, expiry_date = 2025-01-15
earn event on 2024-06-20: 200 points, expiry_date = 2025-06-20
\`\`\`

**Daily expiry job:**
\`\`\`sql
-- Find earn events expiring today whose points have not yet been expired
INSERT INTO point_events (member_id, event_type, points, balance_after, reference_id)
SELECT
  e.member_id,
  'expire',
  -e.points,
  (current_balance - e.points),
  'expire-' || e.id
FROM point_events e
WHERE e.event_type = 'earn'
  AND e.expiry_date = CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM point_events x
    WHERE x.reference_id = 'expire-' || e.id
  );
\`\`\`

**The hard case: customer redeemed some points — which ones expired?**
Use FIFO (first-in, first-out) accounting: redemptions consume the oldest points first. When expiry runs, it only expires unredeemed earn events. This requires the expiry job to check remaining redeemable balance per earn batch, not just the total ledger balance.

**Expiry warning to customers:**
30 days before expiry, compute each member's expiring points (earn events with expiry_date within 30 days) and send a push notification. This is a read-only scan and does not modify the ledger.`,
      },
      {
        question: 'How do you handle a double-points promotional event for 50 million members simultaneously?',
        answer: `**Scenario:** Starbucks announces "3x stars on all purchases today" on a national holiday. Every transaction that day earns 3x instead of 1x. This affects the earn calculation for every transaction without changing the transaction flow.

**Design: Earn rules table, not hard-coded multipliers**

\`\`\`sql
-- Active earn rule for the promotional day
INSERT INTO earn_rules (name, multiplier, valid_from, valid_to)
VALUES ('Holiday 3x Stars', 3.0, '2025-07-04 00:00:00', '2025-07-04 23:59:59');
\`\`\`

**Transaction earn calculation:**
\`\`\`
Base rate: 1 point per $1 spent
Active multiplier: 3.0 (from earn_rules)
Customer spends $5 → 5 × 3 = 15 points earned
\`\`\`

**Why rules in the database, not in code:**
- Marketing can create and schedule promotions without a code deploy
- Every earn event records the earn_rule_id, so you can always explain exactly why any points were credited
- Multiple rules can stack (double points for Gold tier + 3x holiday = 6x total) with explicit priority ordering

**Traffic spike handling:**
A 3x day attracts 3x purchase volume. The earn endpoint must handle 3x QPS. Mitigations:
- Earn events are fire-and-forget from the customer perspective: the purchase completes, points credit asynchronously
- Use Kafka to buffer earn events; consumers process at their own pace
- The POS/checkout system does not block on loyalty point confirmation

**Idempotency is critical:** If the Kafka consumer crashes mid-processing, it will re-read events. The UNIQUE constraint on reference_id (order_id) prevents duplicate credits.`,
      },
    ],

    keyDecisions: [
      'Append-only ledger vs mutable balance field — chose append-only because financial systems require immutable history, double-spend prevention is simpler with optimistic locking than row-level locks, and the audit trail is invaluable for fraud investigation',
      'Optimistic concurrency for redemptions vs pessimistic locking — chose optimistic because double-redemption conflicts are rare (most customers do not redeem from two devices simultaneously) and optimistic locking scales better under high read load',
      'Per-earn-event expiry dates vs member-level annual expiry — chose per-event because rolling 12-month expiry matches customer expectations (points earned recently do not expire just because older points did) and enables FIFO accounting',
      'Synchronous tier upgrade detection vs daily batch — chose synchronous because immediate tier upgrade is a delight moment (customer sees Gold tier appear right after their qualifying purchase) and the computation is cheap (compare one integer against two thresholds)',
      'Balance cached on most recent ledger row vs computed from full ledger sum — chose cached balance_after column because summing the full ledger for 50M members at query time is too slow; the cache stays consistent because the ledger is append-only',
    ],
  },

  {
    id: 'last-mile-delivery',
    isNew: true,
    title: 'Last-Mile Delivery Optimization',
    subtitle: 'Amazon Logistics / FedEx Route Optimization / OnTrac',
    icon: 'truck',
    color: '#10b981',
    difficulty: 'Hard',
    description: 'Design a last-mile delivery system that optimizes driver routes across hundreds of daily stops, handles real-time re-routing, and provides proof of delivery with live customer tracking.',

    introduction: `Last-mile delivery — the final leg from a local warehouse or sort facility to the customer's door — accounts for 50 to 60 percent of total logistics costs. A delivery driver making 120 stops per day covers 100 miles. Shaving 10 miles off that route through better optimization saves meaningful cost per driver and compounds across thousands of drivers. This is why route optimization is the central technical problem in last-mile logistics.

The Vehicle Routing Problem (VRP) is an NP-hard combinatorial optimization problem. Finding the mathematically optimal route for 120 stops is computationally infeasible for large N. Production systems use metaheuristic algorithms — Clarke-Wright savings, genetic algorithms, or Google OR-Tools — that find near-optimal solutions in seconds rather than minutes. The key insight is that a 2 percent suboptimal route solved in 30 seconds is far more valuable than a 0.1 percent optimal route solved in 30 minutes after the drivers have already left the warehouse.

Time window constraints dramatically complicate routing. When a customer requests delivery between 2pm and 4pm, that stop cannot be served outside that window regardless of what the optimal route would otherwise suggest. Adding dozens of hard time windows to a routing problem forces the algorithm to balance global route efficiency against local time feasibility, often resulting in routes that loop back on themselves to hit windows in sequence.

Real-time re-optimization is a separate problem from initial route planning. New packages are added to a driver's route mid-day, a road is closed, a customer is not home and the driver needs to attempt a re-delivery loop — all of these require updating an active route without completely re-solving the global problem from scratch. Incremental insertion algorithms can add a single new stop to an existing route in milliseconds, which is what production systems actually need.`,

    functionalRequirements: [
      'Build optimized daily routes for each driver given their stop list, vehicle capacity, and time windows',
      'Real-time route updates when new stops are added or removed during the delivery day',
      'Driver mobile app with turn-by-turn navigation integrated with the stop sequence',
      'Proof of delivery capture: photo, GPS coordinates, signature, or access code',
      'Failed delivery workflow: reattempt scheduling, locker redirect, or neighbor authorization',
      'Live customer tracking showing driver location and updated ETA on a map',
      'Multi-vehicle fleet management: assign stops across available drivers based on vehicle capacity and geographic zones',
      'Surge capacity management: outsource overflow to gig drivers or partner carriers during peak periods',
    ],

    nonFunctionalRequirements: [
      'Initial route optimization for a driver with 150 stops completes in under 30 seconds',
      'Live driver location updates pushed to customers within 5 seconds of GPS ping',
      'Driver app functions offline for 30 minutes (critical in rural areas with poor cell coverage)',
      'System handles routing for 100K drivers simultaneously during peak season',
      'Proof of delivery photos uploaded reliably over degraded mobile connections with automatic retry',
    ],

    estimation: {
      users: '100K drivers, 10M packages per day, 100M customer tracking sessions daily during peak',
      storage: 'Package records at 2KB each × 10M/day = 20GB/day; proof of delivery photos at 200KB each × 10M = 2TB/day; GPS location pings at 100 bytes × 100K drivers × 1 ping/30s × 10hr = 120GB/day',
      bandwidth: 'Customer tracking: 100M sessions × 1 WebSocket message/5s × 100 bytes = 20GB/day push traffic; proof of delivery photo upload: 2TB/day from driver devices',
      qps: '10M packages / 10hr delivery window = ~280 deliveries/sec; 100K drivers sending GPS every 30s = ~3.3K location updates/sec; 100M tracking sessions / 10hr = ~2.8K tracking reads/sec',
    },

    apiDesign: {
      description: 'Route planning, driver workflow, and customer tracking endpoints',
      endpoints: [
        { method: 'POST', path: '/api/routes/plan', params: '{ driver_id, vehicle_id, stops[{ package_id, address, time_window?, weight_lbs }], depot_location }', response: '{ route_id, ordered_stops[], estimated_completion_time, total_distance_miles }', description: 'Solve VRP for a driver and return optimized stop sequence' },
        { method: 'PATCH', path: '/api/routes/{id}/stops', params: '{ action: add|remove, stop }', response: '{ updated_route, reinserted_at_position }', description: 'Incrementally add or remove a stop from an active route' },
        { method: 'POST', path: '/api/deliveries/{id}/complete', params: '{ driver_id, outcome: delivered|failed|attempted, photo_url?, signature_data?, gps_lat, gps_lng, recipient_name? }', response: '{ confirmation_id, next_stop }', description: 'Record delivery outcome with proof' },
        { method: 'GET', path: '/api/tracking/{tracking_number}', params: '', response: '{ status, driver_location?, eta_minutes, stop_number, stops_before_yours, last_updated }', description: 'Customer tracking endpoint with live driver location' },
        { method: 'POST', path: '/api/deliveries/{id}/reattempt', params: '{ reason, preference: reattempt|locker|neighbor|redirect_address }', response: '{ reattempt_date, alternative_options[] }', description: 'Handle failed delivery and schedule reattempt or redirect' },
      ],
    },

    dataModel: {
      description: 'Package lifecycle, route plans, delivery events, and driver GPS history',
      schema: `packages {
  id: bigint PK
  tracking_number: varchar(30) UNIQUE
  recipient_name: varchar(200)
  address_line1: varchar(200)
  city: varchar(100)
  state: varchar(50)
  zip: varchar(10)
  lat: decimal(9,6)
  lng: decimal(9,6)
  weight_lbs: decimal(6,2)
  delivery_time_window_start: time nullable
  delivery_time_window_end: time nullable
  status: enum(in_facility, out_for_delivery, delivered, attempted, exception)
  signature_required: boolean
}

routes {
  id: bigint PK
  driver_id: bigint FK
  vehicle_id: bigint FK
  route_date: date
  depot_id: bigint FK
  status: enum(planned, active, completed)
  total_stops: int
  completed_stops: int
  optimized_at: timestamp
  started_at: timestamp nullable
  completed_at: timestamp nullable
}

route_stops {
  id: bigint PK
  route_id: bigint FK
  package_id: bigint FK
  sequence: int
  estimated_arrival: timestamp
  actual_arrival: timestamp nullable
  status: enum(pending, delivered, failed, skipped)
  INDEX (route_id, sequence)
}

delivery_events {
  id: bigint PK
  package_id: bigint FK
  driver_id: bigint FK
  event_type: enum(out_for_delivery, delivered, attempted, exception)
  outcome_detail: varchar(100)
  photo_url: text nullable
  gps_lat: decimal(9,6)
  gps_lng: decimal(9,6)
  created_at: timestamp
}

driver_locations {
  driver_id: bigint
  lat: decimal(9,6)
  lng: decimal(9,6)
  recorded_at: timestamp
  PRIMARY KEY (driver_id, recorded_at)
  -- Partitioned by day, retained 7 days
}`,
      examples: [
        { table: 'route_stops', label: 'Active stop in sequence 23 of 120', json: '{ "id": 4400221, "route_id": 80012, "package_id": 9912345, "sequence": 23, "estimated_arrival": "2025-06-01T14:30:00Z", "actual_arrival": null, "status": "pending" }' },
        { table: 'delivery_events', label: 'Successful delivery with photo proof', json: '{ "id": 7701234, "package_id": 9912345, "driver_id": 33301, "event_type": "delivered", "outcome_detail": "Left at front door", "photo_url": "https://cdn.example.com/pod/9912345-20250601.jpg", "gps_lat": 37.774929, "gps_lng": -122.419416, "created_at": "2025-06-01T14:27:44Z" }' },
        { table: 'packages', label: 'Time-window restricted package', json: '{ "id": 9912345, "tracking_number": "1Z999AA10123456784", "recipient_name": "Jane Smith", "address_line1": "123 Main St", "city": "San Francisco", "state": "CA", "zip": "94102", "lat": 37.774929, "lng": -122.419416, "weight_lbs": 3.2, "delivery_time_window_start": "14:00", "delivery_time_window_end": "18:00", "status": "out_for_delivery", "signature_required": false }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A dispatcher manually assigns packages to drivers and enters a rough stop order. Drivers navigate stop-to-stop using a personal navigation app. Proof of delivery is captured on paper and scanned at end of day.',
      problems: [
        'Manual route assignment takes 2 to 3 hours per dispatcher each morning, delaying departure',
        'No time window enforcement — drivers miss scheduled delivery windows regularly',
        'Paper proof of delivery cannot be shared with customers in real time',
        'No live customer tracking — customers call the support line to ask where their package is',
        'Failed deliveries require a phone call to reschedule, creating high support volume',
        'No optimization across drivers — one driver may have 150 stops while another has 80 because zones are fixed by geography, not workload',
      ],
    },

    advancedImplementation: {
      title: 'Algorithmic Route Optimization with Real-Time Driver Tracking',
      description: 'Route optimization runs each morning using Google OR-Tools or a similar VRP solver, incorporating time windows, vehicle capacity, and traffic-adjusted travel times. The driver app (React Native with offline-first sync) shows the ordered stop list with turn-by-turn navigation, captures proof of delivery with GPS-tagged photos, and syncs events to the backend over unreliable mobile connections using a local SQLite queue. Customer tracking is powered by a WebSocket fan-out service that receives driver GPS pings and pushes location and ETA updates to all customers with packages on that route.',
      keyPoints: [
        'VRP solver uses Clarke-Wright savings algorithm initialized with a greedy insertion heuristic, then improved with 2-opt local search; 150-stop route optimized in under 5 seconds on a single core',
        'Time windows encoded as hard constraints in the VRP: a stop cannot be visited outside its window even if that creates a suboptimal global route',
        'Driver GPS pings sent every 30 seconds from the mobile app and ingested via Kafka; a fan-out service pushes location updates to all customers on that route via WebSocket',
        'Driver app uses SQLite for offline-first storage: delivery events queued locally and synced automatically when connectivity is restored, preventing data loss in rural areas',
        'ETA per remaining stop calculated by querying Google Maps Distance Matrix API for current traffic conditions, updating every 5 minutes per route rather than per GPS ping to stay within API quotas',
        'Proof of delivery photos uploaded directly to S3 via a pre-signed URL generated by the backend; the app retries with exponential backoff on upload failure without blocking the driver from proceeding to the next stop',
        'Failed delivery triggers an automated message to the customer with three options (reattempt tomorrow, redirect to locker, authorize neighbor), with the customer response routed back to the driver app for the next attempt',
      ],
      databaseChoice: 'PostgreSQL for packages, routes, and delivery events; Redis for active driver location cache (most recent GPS ping per driver, used for customer tracking); Kafka for driver location event ingestion and delivery event streaming; S3 for proof of delivery photos; TimescaleDB or InfluxDB for GPS location history if analytics over historical paths is needed',
      caching: 'Current driver location cached in Redis per driver_id with 60-second TTL; customer-facing ETA cached per package with 5-minute TTL and invalidated on each route re-optimization; route stop sequence cached in Redis for the active day since it is read by the driver app on every navigation action; geocoded addresses cached in Redis to avoid repeated geocoding API calls for the same address',
    },

    tips: [
      'Clarify scope at the start: route optimization algorithm, driver app, customer tracking, and fleet management are all valid sub-problems. Pick two or three to go deep on.',
      'The VRP vs TSP distinction matters: TSP minimizes total distance for one vehicle visiting all stops; VRP partitions stops across multiple vehicles and is much harder. Most last-mile problems are VRP.',
      'Time windows are the key constraint that separates last-mile from generic routing. Explain hard vs soft time windows and how they affect the solution quality.',
      'Offline-first driver app design is critical because rural delivery routes have poor connectivity. Explain the local queue with retry pattern.',
      'Proof of delivery fraud prevention is a good follow-up: GPS coordinates at delivery time compared to expected address helps catch drivers who mark packages delivered without visiting the address.',
      'Surge capacity is an important business dimension: during peak season you cannot hire 3x drivers, so you must be able to route to contracted gig workers or partner carriers for overflow.',
    ],

    keyQuestions: [
      {
        question: 'How does the Vehicle Routing Problem differ from the Traveling Salesman Problem and how do you solve it at scale?',
        answer: `**TSP:** One salesperson, visit all N cities, minimize total distance. NP-hard for exact solution.

**VRP:** Multiple vehicles, split N stops across them, each vehicle has capacity and time constraints. Much harder than TSP because you are solving TSP for each vehicle simultaneously while deciding the partition.

**Why exact algorithms do not work at scale:**
- Exact solvers (branch and bound, dynamic programming) are feasible up to ~20 stops
- A driver with 150 stops: 150! possible orderings = astronomically large
- Production systems need solutions in seconds, not hours

**Practical approach: Construction heuristic + local search**

**Step 1: Clarke-Wright Savings (construction)**
\`\`\`
Start: each stop is its own route (N routes of 1 stop each)
For each pair (i, j):
  saving = dist(depot, i) + dist(depot, j) - dist(i, j)
  If merging routes for i and j saves distance and fits in vehicle capacity:
    merge them
Sort savings descending, greedily merge until no more feasible merges
Result: good initial solution in O(N^2 log N)
\`\`\`

**Step 2: 2-opt local search (improvement)**
\`\`\`
For each pair of edges in a route:
  Try reversing the segment between them
  If it reduces total distance: accept the swap
Repeat until no improving swaps exist
\`\`\`

**Tools used in production:**
- Google OR-Tools: open source, well-documented, handles time windows, vehicle capacity, traffic
- Custom implementations at companies like Amazon for proprietary features (building-level access, apartment intercom codes, historical delivery success rates per address)

**Time windows as hard constraints:**
Add to the VRP a constraint that stop i cannot be served before window_start[i] or after window_end[i]. This shrinks the feasible solution space and may force route loops. Driver must wait if they arrive early; the stop is infeasible if they cannot arrive in time.`,
      },
      {
        question: 'How do you update a driver\'s route in real time when a new package is added mid-day?',
        answer: `**Problem:** Driver has an optimized 120-stop route and has completed 40 stops. A new package is added to their route. Re-solving the full VRP from scratch for the remaining 80 stops takes too long and produces a different route that confuses the driver.

**Incremental insertion algorithm:**
\`\`\`
Given: active route [stop_41, stop_42, ..., stop_120]
New stop: stop_NEW with address and time window

For each possible insertion position i in [41..120]:
  cost_increase = dist(stop_i-1, stop_NEW) + dist(stop_NEW, stop_i) - dist(stop_i-1, stop_i)

Check time window feasibility:
  If inserting at position i, will all subsequent stops still hit their windows?
  (Propagate ETA shift forward through the route)

Select position with minimum cost_increase that passes time window check
Insert stop_NEW at that position, shift sequence numbers forward
\`\`\`

**Complexity:** O(N) per insertion where N = remaining stops. For 80 remaining stops, this runs in milliseconds.

**Trade-off vs full re-optimization:**
- Incremental insertion: fast (~10ms), preserves most of the driver's planned route, minimal driver confusion
- Full re-solve: better global optimality (~5s), but produces unfamiliar route that mid-day driver may resist

**When to full re-solve:**
- More than 10 new stops added in one batch (at start of day additions from late-arriving manifests)
- Route becomes infeasible due to time window violations after multiple insertions
- Driver explicitly requests re-optimization

**Communicating changes to driver:**
When a new stop is inserted, push a notification: "New delivery added: 456 Oak Ave, position 51 of your route. Updated ETA for current stop: 2:15 PM." Driver acknowledges in app before navigation updates.`,
      },
    ],

    keyDecisions: [
      'VRP metaheuristic (OR-Tools) vs proprietary solver — chose OR-Tools because it handles time windows, multi-vehicle, and capacity constraints out of the box with acceptable solution quality; proprietary solver only justified when traffic-pattern learning (delivery success rates per address, historical door-code data) provides significant lift',
      'Offline-first driver app vs always-connected app — chose offline-first because rural delivery zones have 20 to 30 percent of route covered by poor cell signal, and delivery events must be captured reliably regardless of connectivity',
      'Driver GPS every 30 seconds vs every 5 seconds — chose 30 seconds because 5-second updates provide minimal ETA improvement (ETAs are already computed by traffic API to the minute) while consuming 6x more battery and bandwidth on driver devices',
      'Pre-signed S3 upload for proof of delivery photos vs server-side proxy — chose pre-signed URL because routing 2TB/day of photo traffic through application servers is expensive and unnecessary; S3 direct upload also provides automatic retry at the SDK level',
      'Fixed geographic delivery zones vs dynamic zone assignment — chose dynamic assignment because fixed zones create workload imbalance (high-density urban zones have 200 stops, suburban zones have 60) while dynamic assignment equalizes driver workload and improves vehicle utilization',
    ],
  },

  {
    id: 'marketplace-seller-platform',
    isNew: true,
    title: 'Marketplace Seller Platform',
    subtitle: 'Amazon FBA / Etsy Seller Tools / eBay Seller Hub',
    icon: 'shoppingCart',
    color: '#f59e0b',
    difficulty: 'Hard',
    description: 'Design a marketplace platform where third-party sellers can list products, manage inventory, fulfill orders, and receive payments, with the marketplace taking a commission on each sale.',

    introduction: `A marketplace seller platform sits at the intersection of two sets of customers: buyers who want a wide selection and competitive prices, and sellers who want distribution, fulfillment infrastructure, and payment processing. The platform's value to sellers is access to millions of buyers. The platform's value to buyers is breadth of selection beyond what any single retailer could offer. The platform earns by taking a percentage of every transaction.

The seller trust and verification problem is foundational. Any marketplace that allows anyone to list anything will quickly be flooded with counterfeit goods, fraudulent listings, and sellers who take payment and never ship. Onboarding must verify seller identity (KYC/KYB — Know Your Customer/Know Your Business), validate bank accounts for disbursement, collect tax information (W-9 for US sellers), and screen for banned entities before a seller's first listing goes live. This due diligence is not just a business decision — in many jurisdictions it is a legal requirement.

The Buy Box — the "Add to Cart" button on a product detail page — is the most contested piece of real estate in e-commerce. On Amazon, multiple sellers may offer the same product at different prices with different shipping times and seller ratings. The Buy Box algorithm decides which seller wins the sale when a customer clicks the button, based on price, fulfillment method, seller performance metrics, and Prime eligibility. Winning the Buy Box is the difference between thriving and invisible for most marketplace sellers.

Seller performance metrics drive the feedback loop that keeps marketplace quality high. Late shipment rate, order defect rate (chargebacks plus negative feedback plus A-to-Z claims), and cancellation rate are the key performance indicators. Sellers who exceed threshold violations have their listings suppressed or accounts suspended. This creates strong incentives for quality fulfillment but also requires a fair and auditable appeals process for sellers who believe their metrics are calculated incorrectly.`,

    functionalRequirements: [
      'Seller onboarding with KYC/KYB identity verification, bank account validation, and tax information collection',
      'Product listing management including bulk upload, catalog matching to existing products, and variation management',
      'Inventory tracking for FBA (platform warehouse) and FBM (seller ships directly) fulfillment methods',
      'Buy Box algorithm selecting the winning seller offer for each product detail page',
      'Order routing to the correct seller or fulfillment center based on inventory and method',
      'Seller performance metrics tracking and automated account health alerts',
      'Fee calculation for referral fees, fulfillment fees, and storage fees applied per transaction',
      'Seller disbursement on a regular schedule after delivery confirmation and holding period',
    ],

    nonFunctionalRequirements: [
      'Buy Box selection responds in under 50ms as part of product detail page rendering',
      'Inventory updates propagate to all product listings within 30 seconds of change',
      'Fee calculation must be deterministic and auditable: same inputs always produce same output',
      'Seller dashboard metrics are eventually consistent, updated within 4 hours of events',
      'Platform handles 1M new product listings per day during peak onboarding periods',
    ],

    estimation: {
      users: '5M active sellers, 500M product listings, 10M orders per day',
      storage: 'Listing records at 5KB each × 500M = 2.5TB; order records at 3KB × 10M/day = 30GB/day; seller performance event logs at 1KB × 50M events/day = 50GB/day',
      bandwidth: 'Bulk listing uploads from sellers: 100K uploads/day × 1MB average = 100GB/day; product image sync to CDN: 10M new images/day × 500KB = 5TB/day',
      qps: '10M orders/day = ~116 orders/sec; Buy Box reads at 1B product page views/day = ~11.5K QPS; inventory updates at 50M events/day = ~580/sec',
    },

    apiDesign: {
      description: 'Seller management, listing lifecycle, order fulfillment, and disbursement endpoints',
      endpoints: [
        { method: 'POST', path: '/v1/sellers', params: '{ business_name, tax_id, bank_account, kyc_documents[] }', response: '{ seller_id, verification_status, onboarding_steps_remaining[] }', description: 'Register new seller and initiate KYC/KYB verification workflow' },
        { method: 'POST', path: '/v1/listings', params: '{ seller_id, catalog_id?, product_data, price_cents, quantity, fulfillment_method }', response: '{ listing_id, asin, status, buy_box_eligible }', description: 'Create or match a product listing against the catalog' },
        { method: 'GET', path: '/v1/products/{asin}/buy-box', params: '', response: '{ winner_seller_id, price_cents, shipping_days, fulfillment_method, eligibility_factors }', description: 'Current Buy Box winner and scoring factors for a product' },
        { method: 'GET', path: '/v1/sellers/{id}/performance', params: 'period', response: '{ odr, late_shipment_rate, cancellation_rate, customer_feedback_score, account_health: good|at_risk|suspended }', description: 'Seller performance dashboard metrics' },
        { method: 'GET', path: '/v1/sellers/{id}/disbursements', params: 'period', response: '{ disbursements[{ date, gross_sales, fees, net_amount, orders[] }] }', description: 'Seller payment history and upcoming disbursement preview' },
      ],
    },

    dataModel: {
      description: 'Seller accounts, product catalog, listings, orders, and financial ledger',
      schema: `sellers {
  id: bigint PK
  business_name: varchar(200)
  email: varchar(255) UNIQUE
  tax_id_hash: varchar(64)          -- hashed, never store raw
  bank_account_token: varchar(100)  -- tokenized via payment processor
  kyc_status: enum(pending, approved, rejected, suspended)
  account_health: enum(good, at_risk, suspended)
  created_at: timestamp
}

catalog_products {
  id: varchar(10) PK   -- ASIN or equivalent
  title: varchar(500)
  brand: varchar(200)
  category_id: int FK
  upc: varchar(20) nullable UNIQUE
  image_urls: jsonb
  attributes: jsonb
}

seller_listings {
  id: bigint PK
  seller_id: bigint FK
  catalog_id: varchar(10) FK
  price_cents: int
  quantity: int
  fulfillment_method: enum(fba, fbm)
  condition: enum(new, used_like_new, used_good, used_acceptable)
  is_buy_box_winner: boolean DEFAULT false
  is_active: boolean DEFAULT true
  updated_at: timestamp
}

orders {
  id: uuid PK
  buyer_id: bigint FK
  seller_id: bigint FK
  listing_id: bigint FK
  catalog_id: varchar(10) FK
  quantity: int
  sale_price_cents: int
  referral_fee_cents: int
  fulfillment_fee_cents: int
  status: enum(pending, confirmed, shipped, delivered, cancelled, refunded)
  shipped_at: timestamp nullable
  delivered_at: timestamp nullable
}

seller_financial_events {
  id: bigint PK
  seller_id: bigint FK
  order_id: uuid nullable FK
  event_type: enum(sale, refund, fee, disbursement, adjustment)
  amount_cents: int   -- positive = money in, negative = money out
  balance_after_cents: bigint
  created_at: timestamp
  -- append-only ledger
}`,
      examples: [
        { table: 'seller_listings', label: 'FBA listing that currently holds the Buy Box', json: '{ "id": 8834001, "seller_id": 90012, "catalog_id": "B08N5WRWNW", "price_cents": 4999, "quantity": 120, "fulfillment_method": "fba", "condition": "new", "is_buy_box_winner": true, "is_active": true, "updated_at": "2025-06-01T08:00:00Z" }' },
        { table: 'orders', label: 'Fulfilled order awaiting disbursement', json: '{ "id": "ord-55ab12cd", "buyer_id": 77001, "seller_id": 90012, "listing_id": 8834001, "catalog_id": "B08N5WRWNW", "quantity": 1, "sale_price_cents": 4999, "referral_fee_cents": 750, "fulfillment_fee_cents": 320, "status": "delivered", "shipped_at": "2025-06-01T10:00:00Z", "delivered_at": "2025-06-03T14:22:00Z" }' },
        { table: 'seller_financial_events', label: 'Sale event credited to seller ledger', json: '{ "id": 500112, "seller_id": 90012, "order_id": "ord-55ab12cd", "event_type": "sale", "amount_cents": 3929, "balance_after_cents": 48200, "created_at": "2025-06-03T15:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A relational database stores seller accounts, listings, and orders. The Buy Box winner is selected by cheapest price query at page render time. Fees are calculated by a spreadsheet formula applied at disbursement time. Seller onboarding is manual: staff review submitted documents and approve accounts.',
      problems: [
        'Real-time Buy Box query across millions of listings causes database bottlenecks at high page view rates',
        'Manual KYC review creates a 3 to 5 day onboarding delay, deterring high-volume sellers',
        'Fee calculation at disbursement time makes it hard for sellers to predict their payout before receiving it',
        'No catalog deduplication: the same physical product is listed thousands of times with different titles and images, fragmenting buyer experience',
        'Seller performance metrics calculated via slow ad hoc SQL queries rather than precomputed streaming aggregates',
        'No account health enforcement automation: policy violations require manual review before suspension, allowing bad actors to continue selling for days',
      ],
    },

    advancedImplementation: {
      title: 'Buy Box Scoring Cache with Streaming Performance Metrics',
      description: 'The Buy Box winner per ASIN is precomputed and cached in Redis, updated whenever a listing changes its price, quantity, or fulfillment method. Seller onboarding uses an automated KYC/KYB pipeline (Stripe Identity or Persona) that clears 80 percent of sellers without manual review. Fees are calculated and logged at transaction time (not disbursement time) using the seller_financial_events ledger. Seller performance metrics stream via Kafka into a Flink aggregation job that maintains rolling 7-day and 30-day windows of ODR, late shipment rate, and cancellation rate.',
      keyPoints: [
        'Buy Box winner precomputed per ASIN on every listing change and cached in Redis with TTL of 5 minutes; Buy Box read is a cache hit, not a database query on the critical page rendering path',
        'Buy Box scoring factors: landed price (item price + shipping), fulfillment method (FBA preferred), seller account health, seller feedback score, in-stock probability, delivery speed promise',
        'Automated KYC pipeline: identity document OCR and liveness check via third-party provider, bank account micro-deposit verification, OFAC sanctions screening, all completed in under 24 hours',
        'Financial event ledger is append-only with events at transaction time: sale, referral fee, fulfillment fee, and storage fee all logged immediately, making disbursement a simple sum of event amounts in a period',
        'Catalog deduplication via UPC barcode matching for identical products, and ML-based title and attribute similarity for products without UPCs, reducing duplicate listings by 70 percent',
        'Seller performance Flink job maintains per-seller counters in RocksDB state: late shipments numerator and denominator with event-time windowing, detecting threshold breaches and triggering automated warnings or suspensions',
        'A-to-Z guarantee claims arbitrated by a rule-based engine for clear-cut cases (no tracking number uploaded = seller loses) and escalated to human review for contested cases',
      ],
      databaseChoice: 'PostgreSQL for sellers, listings, orders, and financial events; Redis for Buy Box winner cache and listing inventory counters; Kafka for listing change events, order events, and performance metric streams; Flink for streaming performance metric aggregation; Elasticsearch for product catalog search and listing discovery',
      caching: 'Buy Box winner cached in Redis per ASIN with invalidation on any listing change; seller performance metrics cached in Redis with 4-hour TTL (acceptable staleness for dashboard); product catalog attributes cached in Elasticsearch; fee schedules (referral fee rates by category) cached in application memory since they change quarterly',
    },

    tips: [
      'The Buy Box is the most interview-memorable concept unique to marketplace design — spend time explaining the scoring factors and why caching the winner is necessary.',
      'Seller trust is a product safety problem, not just a business requirement: a marketplace that sells counterfeit goods gets sued. Discuss KYC, product authenticity verification, and brand registry.',
      'The append-only financial events ledger is the right design for marketplace payments — the same pattern as the loyalty rewards system, applied to a two-sided financial relationship.',
      'Disbursement hold periods (Amazon holds payment for 7 to 14 days after delivery) protect against buyers receiving wrong items and requesting refunds after the seller has been paid.',
      'Catalog deduplication is a hard problem that most interviewers are impressed by: explain UPC matching for known products and ML-based similarity for handmade or unique items like Etsy goods.',
      'Mention the seller appeal process for account suspensions — automated enforcement without a fair appeals process creates legal liability and drives away good sellers.',
    ],

    keyQuestions: [
      {
        question: 'How does the Buy Box algorithm decide which seller wins when multiple sellers offer the same product?',
        answer: `**What is the Buy Box?** On a product detail page where multiple sellers offer the same item, only one seller's offer appears in the primary "Add to Cart" button. That seller "wins" the Buy Box. Other sellers appear in a secondary "Other sellers" section that most customers never click.

**Buy Box scoring factors (in rough priority order):**

1. **Eligibility:** Seller must meet minimum account health thresholds (ODR < 1%, late shipment < 4%). Non-eligible sellers are excluded regardless of price.

2. **Fulfillment method:** FBA (fulfilled by Amazon) preferred over FBM (seller fulfills) because FBA guarantees Prime shipping speed and Amazon controls the customer experience.

3. **Landed price:** Item price + shipping cost. The algorithm optimizes for buyer value, not seller revenue. A $45 item with free shipping beats a $40 item with $10 shipping.

4. **Delivery speed:** Sellers who can promise 2-day delivery score higher than those who promise 5-7 days.

5. **Seller feedback score:** Rolling 12-month weighted score. Recent ratings count more than old ones.

6. **In-stock reliability:** Sellers who have been in stock consistently score higher. A seller who wins the Buy Box but then goes out of stock gets penalized.

**Buy Box rotation:**
Not all purchases go to one seller. Amazon rotates the Buy Box across sellers with competitive scores, giving each seller a proportional share. A seller with score 85 might win 60% of Buy Box impressions vs a competitor with score 80 who wins 40%.

\`\`\`
buy_box_score =
  w1 * price_competitiveness_score +  // 0-100, relative to market
  w2 * fulfillment_score +             // FBA=100, Prime FBM=85, FBM=60
  w3 * feedback_score +                // 0-100, 12mo weighted
  w4 * delivery_speed_score +          // 2-day=100, 5-day=70, 7-day=50
  w5 * account_health_score            // threshold gate, then 0-100
\`\`\`

**Why precompute rather than compute at query time:**
Recomputing the Buy Box for every product page load across 500M products at 11K QPS would require massive database resources. Instead, precompute the winner when any listing changes and cache in Redis. The cached result serves 99.9% of reads.`,
      },
      {
        question: 'How do you handle chargebacks and A-to-Z guarantee claims between buyer and seller?',
        answer: `**Two distinct dispute mechanisms:**

**1. Credit card chargeback (initiated by buyer with bank):**
- Buyer tells their bank they never received the item or it was not as described
- Bank initiates chargeback, temporarily reverses the charge on the buyer's card
- Marketplace has 30 days to respond with evidence
- Evidence: tracking number showing delivery, delivery confirmation, order details
- If marketplace wins: chargeback reversed, seller keeps payment
- If marketplace loses: seller is debited; repeated chargebacks trigger account review

**2. A-to-Z Guarantee claim (initiated by buyer with marketplace):**
- Buyer goes directly to the marketplace, not their bank
- Common reasons: item not received, item not as described, return refused
- Marketplace arbitrates between buyer and seller

**Rule-based automatic resolutions:**
\`\`\`
IF no shipping tracking uploaded by seller → seller loses automatically
IF tracking shows delivered AND buyer says not received → request photo of delivery location from seller
IF item described as "new" but buyer received "used" → seller loses, refund issued
IF return request within policy window AND seller refused → seller loses, refund issued
\`\`\`

**Human review cases:**
- Counterfeit allegations (requires authentication)
- Partial damage (was it seller's packaging or carrier's fault?)
- "Item not as described" where description is genuinely ambiguous

**Financial flow:**
1. At dispute open: hold disbursement for the order amount
2. If buyer wins: refund to buyer, debit from seller's account balance
3. If seller wins: release hold, disburse to seller normally
4. If seller balance is negative: debit their next disbursement or payment method on file`,
      },
    ],

    keyDecisions: [
      'Precomputed Buy Box cache vs real-time scoring per page load — chose precomputed cache because 11K QPS Buy Box scoring across 500M products would require a dedicated scoring cluster; cache invalidation on listing change is fast and accurate',
      'Automated KYC pipeline vs manual document review — chose automated for 80 percent of applicants (clear documents, no sanctions hits) with human review only for edge cases; 24-hour onboarding vs 5-day onboarding dramatically improves seller acquisition',
      'Append-only financial events ledger vs mutable seller balance — chose append-only because marketplace financial disputes require auditable history; every fee, sale, and disbursement must be traceable to its source event',
      'FBA preferred in Buy Box vs equal treatment of all fulfillment methods — chose FBA preference because Amazon controls the customer experience end-to-end and can guarantee Prime shipping promises, which drives buyer satisfaction and repeat purchases',
      'Streaming Flink aggregation for seller metrics vs nightly batch — chose streaming because account health violations need to trigger warnings within hours, not the next day; a seller with a sudden spike in complaints should be reviewed immediately, not 24 hours later',
    ],
  },

  {
    id: 'price-comparison-engine',
    isNew: true,
    title: 'Price Comparison Engine',
    subtitle: 'Google Shopping / Honey / CamelCamelCamel',
    icon: 'search',
    color: '#0ea5e9',
    difficulty: 'Medium',
    description: 'Design a system that crawls product prices from thousands of retailers, normalizes and deduplicates them by product, tracks price history, and alerts users when prices drop to their target.',

    introduction: `A price comparison engine is a specialized web crawler and data normalization system. The core challenge is not the crawling itself — any reasonably capable crawler can fetch pages — but making sense of what it finds. Retailer A sells "Apple AirPods Pro (2nd generation) with USB-C" while Retailer B lists the same product as "Apple AirPods Pro Gen2 MTJV3LL/A." Product identity resolution, the process of determining that these two listings describe the same physical product, is harder than it appears and is the difference between a useful comparison and a sea of duplicates.

Price crawling operates in an adversarial environment. Major retailers invest significantly in anti-bot technology because they do not want their prices publicly compared to competitors. Rate limiting, CAPTCHA, IP blocking, JavaScript rendering requirements, and device fingerprinting are all deployed against crawlers. A serious price comparison system must rotate user agents, use residential IP proxies, render JavaScript with a headless browser for some sites, and implement respectful crawl delays to stay within each site's tolerance.

Price normalization goes beyond deduplication. A product sold by the pound costs differently than the same product sold by the ounce. A product listed with "free shipping" has a lower landed price than the same product with shipping added. A product on sale with a coupon has a lower effective price than the listed price. The comparison system must normalize all of these dimensions to compute a true apples-to-apples landed price that the user can meaningfully compare across retailers.

Price history is the most enduring value the system provides. The current price is ephemeral; history is what allows the system to tell a user whether today's "sale" price is actually the item's typical price with a fake struck-through original. Amazon's price history, for example, shows that many items fluctuate dynamically and a sale during Prime Day may actually be only 5 percent below the 90-day average rather than the claimed 40 percent.`,

    functionalRequirements: [
      'Crawl product pages from 500+ retailers and extract price, availability, and product attributes',
      'Match and deduplicate listings for the same product across retailers using UPC, GTIN, model number, and ML-based title matching',
      'Store complete price history per product per retailer with timestamps',
      'Price drop alerts: notify users when a tracked product reaches their target price via email or push notification',
      'Coupon and cashback aggregation for merchants that provide affiliate codes',
      'Merchant trust scoring based on historical reliability of pricing and stock accuracy',
      'Search and filter across 100M+ product-retailer combinations with sorting by price, rating, and retailer',
      'Product detail pages showing current price comparison across all retailers plus 90-day price history chart',
    ],

    nonFunctionalRequirements: [
      'Prices for high-demand products (top 1M by traffic) refreshed within 1 hour of change',
      'Product search returns results within 300ms',
      'Price history queries for the last 90 days return within 500ms for any product',
      'Crawler respects robots.txt and rate limits to avoid being blocked or causing legal issues',
      'Alert delivery within 15 minutes of a price drop being detected',
    ],

    estimation: {
      users: '50M monthly users, 100M product-retailer pairs tracked, 500M price history records',
      storage: 'Product records at 5KB × 10M unique products = 50GB; price history at 200 bytes × 500M records = 100GB; crawler queue and scheduling state at 10GB',
      bandwidth: 'Crawling 10M pages per day at 50KB average = 500GB/day outbound crawler traffic; API serving at 10M searches/day × 5KB response = 50GB/day',
      qps: '10M pages/day crawled = ~116 pages/sec across crawler fleet; 10M searches/day = ~116 search QPS; alert fanout at 500K alerts/day = ~6/sec',
    },

    apiDesign: {
      description: 'Product search, price comparison, history, and alert management endpoints',
      endpoints: [
        { method: 'GET', path: '/api/products/search', params: 'q, category, min_price, max_price, sort_by, page', response: '{ products[{ id, title, best_price_cents, best_retailer, retailers_count, image_url }], total }', description: 'Search products with best available price across all retailers' },
        { method: 'GET', path: '/api/products/{id}/prices', params: '', response: '{ product, offers[{ retailer_id, price_cents, shipping_cents, in_stock, last_checked, affiliate_url }] }', description: 'Current price comparison for a product across all tracked retailers' },
        { method: 'GET', path: '/api/products/{id}/price-history', params: 'retailer_id?, days', response: '{ history[{ date, retailer_id, price_cents }], stats: { min, max, avg, current_vs_90day_avg_pct } }', description: 'Price history chart data with statistical context' },
        { method: 'POST', path: '/api/alerts', params: '{ product_id, retailer_id?, target_price_cents, notify_via: email|push }', response: '{ alert_id, current_price_cents, gap_to_target_pct }', description: 'Create a price drop alert for a product' },
        { method: 'GET', path: '/api/crawl-queue/priority', params: '', response: '{ items[{ url, priority_score, last_crawled, retailer_id }] }', description: 'Internal: returns next URLs to crawl sorted by priority' },
      ],
    },

    dataModel: {
      description: 'Product catalog, retailer listings, price history timeseries, and alert subscriptions',
      schema: `products {
  id: bigint PK
  title: varchar(500)
  brand: varchar(200)
  category_id: int FK
  upc: varchar(20) nullable
  gtin: varchar(14) nullable
  image_url: text
  avg_rating: decimal(3,2)
  review_count: int
  created_at: timestamp
}

retailers {
  id: int PK
  name: varchar(100)
  domain: varchar(100) UNIQUE
  trust_score: int   -- 0-100 based on stock accuracy and price reliability
  crawl_delay_ms: int
  requires_js_render: boolean
}

product_listings {
  id: bigint PK
  product_id: bigint FK
  retailer_id: int FK
  retailer_product_url: text
  retailer_sku: varchar(100)
  current_price_cents: int nullable
  current_shipping_cents: int
  in_stock: boolean
  last_crawled_at: timestamp
  UNIQUE (product_id, retailer_id)
}

price_history {
  product_id: bigint
  retailer_id: int
  price_cents: int
  shipping_cents: int
  in_stock: boolean
  recorded_at: timestamp
  PRIMARY KEY (product_id, retailer_id, recorded_at)
  -- Partitioned by month
}

price_alerts {
  id: bigint PK
  user_id: bigint FK
  product_id: bigint FK
  retailer_id: int nullable FK  -- null = any retailer
  target_price_cents: int
  notify_via: enum(email, push, both)
  is_active: boolean
  triggered_at: timestamp nullable
  created_at: timestamp
}`,
      examples: [
        { table: 'product_listings', label: 'AirPods listing at Amazon with current price', json: '{ "id": 8801234, "product_id": 44001, "retailer_id": 1, "retailer_product_url": "https://www.amazon.com/dp/B0BDHWDR12", "retailer_sku": "B0BDHWDR12", "current_price_cents": 18999, "current_shipping_cents": 0, "in_stock": true, "last_crawled_at": "2025-06-01T14:00:00Z" }' },
        { table: 'price_history', label: 'Price record from last month for history chart', json: '{ "product_id": 44001, "retailer_id": 1, "price_cents": 24999, "shipping_cents": 0, "in_stock": true, "recorded_at": "2025-05-01T10:00:00Z" }' },
        { table: 'price_alerts', label: 'User alert for target price below current', json: '{ "id": 99001, "user_id": 550001, "product_id": 44001, "retailer_id": null, "target_price_cents": 17999, "notify_via": "email", "is_active": true, "triggered_at": null, "created_at": "2025-05-15T09:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single crawler process visits a list of URLs sequentially and stores prices in a relational database. Products are identified by retailer URL, so the same AirPods appear as separate entries for Amazon, Best Buy, and Walmart. Users manually visit the site to check prices.',
      problems: [
        'No product deduplication: the same product appears separately for each retailer with no connection between them, preventing cross-retailer price comparison',
        'Sequential single-process crawling cannot scale to millions of pages per day',
        'No price history: only the current price is stored, preventing trend analysis or historical comparison',
        'Crawler is easily blocked by retailers that detect repeated requests from the same IP with the same user agent',
        'No alert system: users must manually refresh to check if a price dropped',
        'Price normalization missing: a product listed with free shipping is not compared to one with $5 shipping on a landed price basis',
      ],
    },

    advancedImplementation: {
      title: 'Distributed Crawler with Product Identity Resolution and Timeseries Price History',
      description: 'A distributed crawler fleet with rotating residential IP proxies handles 100M+ page fetches per day. Crawl scheduling uses a priority queue: high-traffic products crawled every hour, long-tail products crawled daily. Product identity resolution uses a two-stage pipeline: exact match on UPC/GTIN first, then ML-based title and attribute similarity for products without standardized identifiers. Price history is stored in a partitioned timeseries table (or TimescaleDB). Alert evaluation runs as a streaming job: when a new price is recorded, compare against all active alerts for that product and fan out notifications to triggered alerts.',
      keyPoints: [
        'Crawl priority scoring: product_traffic_score × (1 / hours_since_last_crawl) × retailer_volatility_score; high-demand products with volatile prices crawled most frequently',
        'Anti-bot evasion: residential proxy rotation, random crawl delays (2 to 10 seconds per domain), browser fingerprint randomization via Playwright for JS-heavy retailers, request header mimicking real browser traffic',
        'Product identity resolution pipeline: (1) exact UPC/GTIN match for 60 percent of products, (2) model number extraction via NER for 25 percent, (3) embedding similarity of title plus attributes for the remaining 15 percent',
        'Price history partitioned by month in PostgreSQL or stored in TimescaleDB for efficient time-range queries; 90-day range query returns in under 200ms with proper partitioning',
        'Alert evaluation as Kafka consumer: each new price record published to Kafka; consumer queries active alerts for that product_id, evaluates target_price condition, publishes triggered alerts to a notification queue',
        'Landed price normalization: store raw price and shipping separately, compute landed_price_cents = price_cents + shipping_cents for all comparisons and sorting',
        'Merchant trust scoring derived from historical accuracy: retailers who frequently show "in stock" but the item is actually unavailable at purchase time get a lower trust score and lower display prominence',
      ],
      databaseChoice: 'PostgreSQL for products, retailers, and product_listings (current state); TimescaleDB or partitioned PostgreSQL for price_history (time-series queries); Redis for crawl scheduling queue and alert fanout deduplication; Elasticsearch for product search with price filtering and faceted navigation; Kafka for price update events feeding the alert pipeline',
      caching: 'Current best price per product cached in Redis for search result rendering (invalidated on any price change); price history 90-day summary (min/max/avg) cached per product-retailer with 1-hour TTL; product catalog attributes cached in Elasticsearch which is already a read cache; retailer crawl configuration cached in application memory',
    },

    tips: [
      'Product identity resolution is the hardest and most interesting problem — explain the UPC matching → model number → ML similarity pipeline clearly.',
      'The crawling ethics and legality angle is worth mentioning: robots.txt compliance, rate limiting, and the Computer Fraud and Abuse Act (US) or similar laws in other jurisdictions affect how aggressive a crawler can be.',
      'Price history storage is a classic timeseries problem — mention partitioning by month and why a general-purpose RDBMS can serve this use case without a dedicated timeseries database for most scale ranges.',
      'Alert evaluation is a fan-out problem: one price change event may trigger alerts for thousands of users. Explain the Kafka consumer pattern that decouples price recording from notification delivery.',
      'Landed price normalization (item + shipping) is an important product detail that shows understanding of the user problem beyond raw price comparison.',
      'Mention affiliate revenue as the business model: most price comparison engines earn commission when users click through to buy, which means the business model depends on accurate, trustworthy price data.',
    ],

    keyQuestions: [
      {
        question: 'How do you match the same product listed by 50 different merchants with different titles and no common identifier?',
        answer: `**The product identity resolution problem**

**Level 1: Exact identifier match (covers ~60% of products)**
\`\`\`
UPC: 190199057685 (barcode on the box)
GTIN-14: 00190199057685 (GTIN is a superset of UPC)
MPN: MQTP3LL/A (manufacturer part number)
ASIN: B09JQMJHXY (Amazon's internal ID — used only for Amazon-originated products)
\`\`\`
If any of these match, these are definitively the same product. No ML needed.

**Level 2: Model number extraction (covers ~25% of remaining)**
Use named entity recognition to extract model numbers from titles:
\`\`\`
"Apple AirPods Pro 2nd Gen USB-C (MTJV3LL/A)" → model: MTJV3LL/A
"Apple AirPods Pro 2nd Generation MTJV3LL/A Bluetooth" → model: MTJV3LL/A
Same model number → same product
\`\`\`

**Level 3: ML embedding similarity (covers remaining ~15%)**
For products without reliable identifiers (handmade goods, generic items, some international products):

\`\`\`python
# Embed product title + key attributes together
embedding = model.encode(f"{title} | brand:{brand} | category:{category}")

# Candidate retrieval: ANN search over existing product embeddings
candidates = vector_index.query(embedding, top_k=20)

# Re-rank candidates using structured features:
# - brand match (exact or fuzzy)
# - price range similarity (same product should be similar price)
# - image visual similarity (if product images available)
# - title token overlap (Jaccard similarity)

# Merge if composite score > 0.85
\`\`\`

**False positive prevention:**
- Never merge products from different brands
- Never merge products with >50% price difference (same product should not vary that much)
- Use a confidence score; low-confidence merges go to human review queue

**Continuous improvement:**
When a user reports a wrong match ("these are not the same product"), that pair is added as a negative training example for the ML model.`,
      },
      {
        question: 'How do you crawl prices at scale without getting blocked by retailers?',
        answer: `**The arms race:** Retailers block crawlers because they do not want competitors or price comparison sites creating pressure to lower prices. Crawlers adapt; retailers update their defenses.

**What retailers detect:**
- Same IP address making hundreds of requests → IP block
- Same User-Agent string → User-Agent block
- Request frequency too high (no human reads 60 pages/min) → rate limit
- Missing browser fingerprint signals (no canvas, no WebGL) → CAPTCHA
- Requests from data center IP ranges → IP reputation block
- Missing cookies or session state → redirect to verify page

**Defenses used in production:**

**1. Residential proxy rotation**
Route requests through real consumer ISPs (Bright Data, Oxylabs). These IPs have legitimate residential reputation and are not on blocklists. Rotate IP on each request or every 10-20 requests per domain.

**2. Request timing randomization**
\`\`\`
Wait 2-10 seconds between requests to the same domain (random, not fixed)
Vary session length: sometimes 5 pages, sometimes 20 pages
Crawl during business hours when human traffic is high (easier to blend in)
\`\`\`

**3. Browser rendering for JS-heavy sites**
Some retailers render prices via JavaScript after page load. Use headless Playwright for these sites. Mimics real browser behavior including running all JS, setting cookies, and generating Canvas fingerprints.

**4. Respectful rate limits**
Read and respect robots.txt Crawl-delay directive. This is both ethical and legal risk mitigation. Aggressive crawlers that ignore robots.txt have lost court cases.

**5. Caching to minimize crawls**
If price is unlikely to change (out-of-stock product, stable price for 30 days), crawl less frequently. Save crawl capacity for high-volatility, high-traffic products.

**What you cannot do:**
Bypass CAPTCHA via automation (ToS violation, likely illegal in some jurisdictions). For sites with mandatory CAPTCHA, accept that you cannot crawl them or use their official price feed if available.`,
      },
    ],

    keyDecisions: [
      'Centralized product catalog vs per-retailer product model — chose centralized canonical product catalog with retailer listings pointing to it; enables true cross-retailer comparison, is harder to build but is the core value of a price comparison engine',
      'Store every price observation vs store only price changes — chose every observation for the first 90 days and then only changes (delta compression) for older history; balance between storage cost and the ability to show granular recent history',
      'Own crawler infrastructure vs commercial crawling API — chose own infrastructure for high-volume commodity sites (Amazon, Best Buy, Walmart) and commercial API (ScrapingBee, Bright Data) for complex or high-risk sites; cost-effective split',
      'Real-time alert evaluation vs batched nightly alert check — chose real-time Kafka consumer because price drops have high time-value: a flash sale lasts hours, not days, and a user who set a target price wants to know immediately',
      'Elasticsearch for product search vs PostgreSQL full-text search — chose Elasticsearch because product search requires faceted navigation (filter by brand, category, price range simultaneously) and sub-300ms latency at 100M+ products; PostgreSQL full-text search degrades beyond ~10M rows for complex filtered queries',
    ],
  },

  {
    id: 'subscription-commerce',
    isNew: true,
    title: 'Subscription Commerce Platform',
    subtitle: 'Amazon Subscribe & Save / Substack / Dollar Shave Club',
    icon: 'package',
    color: '#8b5cf6',
    difficulty: 'Medium',
    description: 'Design a subscription commerce platform that manages recurring billing, handles card declines with intelligent dunning, and supports flexible subscription lifecycle operations.',

    introduction: `Subscription commerce turns one-time purchases into predictable recurring revenue. From a systems perspective, this creates a fundamentally different challenge than standard e-commerce: instead of processing a payment when a customer actively initiates it, the platform must proactively charge a stored payment method on a schedule, handle the inevitable failures, and maintain a healthy subscriber base by intelligently recovering failed payments before they churn.

The recurring billing problem is deceptively complex. On any given charge date, a significant percentage of renewals will fail: credit cards expire, banks decline charges for fraud prevention, customers run out of funds, and payment methods change. An unsophisticated system retries immediately, fails again (the bank just declined it a minute ago), and cancels the subscription. A sophisticated dunning system waits for the optimal retry time (Tuesday morning when banks are more likely to approve), sends reminder emails, and recovers 30 to 40 percent of initially failed payments before they become churned subscribers.

Subscription lifecycle management requires handling a wider range of customer actions than one-time purchases. Customers pause subscriptions (traveling for two months), skip individual deliveries (have too much product), upgrade or downgrade their plan mid-cycle, gift subscriptions to others, and cancel. Each of these operations has billing implications that must be handled correctly: a mid-cycle upgrade needs prorated billing, a pause needs billing to be suspended without canceling, and a cancellation at period end needs the subscription to remain active until the paid period expires.

Metered billing adds another dimension where the charge depends on how much the customer used during the period. A SaaS product that charges per API call, a cloud service that charges per GB of storage, or a usage-based subscription box that charges per item chosen — all require usage tracking throughout the billing period and rollup to a final invoice at period end. This is meaningfully different from fixed-price subscriptions and requires a usage metering subsystem.`,

    functionalRequirements: [
      'Create and manage subscriptions with configurable billing intervals (weekly, monthly, quarterly, annually)',
      'Automated recurring charge on billing date using stored payment method',
      'Dunning workflow: retry failed charges with configurable schedule and customer notification at each step',
      'Subscription lifecycle operations: pause, resume, skip cycle, upgrade, downgrade, cancel at period end',
      'Prorated billing for mid-cycle plan changes',
      'Gift subscriptions: purchase a fixed-term subscription for another user',
      'Metered billing: accumulate usage events during a period and charge based on consumption at period end',
      'Cohort analytics: MRR, churn rate, LTV, and average revenue per user tracked over time',
    ],

    nonFunctionalRequirements: [
      'Recurring charge processing must be idempotent: a retry of any charge attempt must never double-charge the customer',
      'Dunning retry scheduler handles 1M subscriptions renewing on the same day without fan-out storms',
      'Subscription state changes (pause, cancel, upgrade) take effect within 5 seconds and are reflected immediately in the customer dashboard',
      'Revenue reporting (MRR, churn) is available within 4 hours of end of business day',
      'Failed payment notifications delivered within 30 minutes of charge failure',
    ],

    estimation: {
      users: '5M active subscribers, 500K renewals per day on peak dates, 50K new subscriptions per day',
      storage: 'Subscription records at 3KB × 5M = 15GB; billing event ledger at 500 bytes × 100M events = 50GB; usage events for metered billing at 200 bytes × 1B events/month = 200GB/month',
      bandwidth: 'Dunning email delivery: 200K failed charge notifications/day; webhook delivery to merchant systems: 500K events/day × 2KB = 1GB/day',
      qps: '500K charges/day spread over 6 hours = ~23 charges/sec average; dunning retry queue peaks at 100 retries/sec on high-churn days; usage event ingestion for metered billing: 10K events/sec at peak',
    },

    apiDesign: {
      description: 'Subscription lifecycle, billing, and usage metering endpoints',
      endpoints: [
        { method: 'POST', path: '/v1/subscriptions', params: '{ customer_id, plan_id, payment_method_token, trial_days?, coupon_code? }', response: '{ subscription_id, status, current_period_start, current_period_end, next_charge_date, amount_cents }', description: 'Create a new subscription with optional trial period' },
        { method: 'PATCH', path: '/v1/subscriptions/{id}', params: '{ action: pause|resume|skip|cancel_at_period_end, effective_date? }', response: '{ subscription, next_charge_date, prorated_credit_cents? }', description: 'Modify subscription lifecycle state' },
        { method: 'POST', path: '/v1/subscriptions/{id}/upgrade', params: '{ new_plan_id, prorate: true }', response: '{ subscription, immediate_charge_cents, new_amount_cents, effective_at }', description: 'Upgrade plan with prorated immediate charge for the difference' },
        { method: 'POST', path: '/v1/usage', params: '{ subscription_id, metric, quantity, idempotency_key, timestamp }', response: '{ event_id, cumulative_usage_this_period }', description: 'Record a usage event for metered billing' },
        { method: 'GET', path: '/v1/subscriptions/{id}/invoices', params: 'limit, cursor', response: '{ invoices[{ id, period, line_items[], total_cents, status, paid_at }] }', description: 'Billing history with itemized invoices' },
      ],
    },

    dataModel: {
      description: 'Subscription lifecycle state, billing invoices, dunning state, and usage events',
      schema: `plans {
  id: int PK
  name: varchar(100)
  interval: enum(weekly, monthly, quarterly, annual)
  interval_count: int  -- e.g., 1 for monthly, 3 for quarterly
  amount_cents: int
  trial_period_days: int DEFAULT 0
  is_metered: boolean DEFAULT false
  metered_metric: varchar(50) nullable
  price_per_unit_cents: int nullable
}

subscriptions {
  id: uuid PK
  customer_id: bigint FK
  plan_id: int FK
  payment_method_token: varchar(100)
  status: enum(trialing, active, past_due, paused, cancelled)
  current_period_start: timestamp
  current_period_end: timestamp
  cancel_at_period_end: boolean DEFAULT false
  pause_resumes_at: timestamp nullable
  trial_end: timestamp nullable
  created_at: timestamp
}

invoices {
  id: uuid PK
  subscription_id: uuid FK
  customer_id: bigint FK
  period_start: timestamp
  period_end: timestamp
  amount_cents: int
  status: enum(draft, open, paid, uncollectible, void)
  payment_attempt_count: int DEFAULT 0
  next_payment_attempt: timestamp nullable
  paid_at: timestamp nullable
}

payment_attempts {
  id: bigint PK
  invoice_id: uuid FK
  idempotency_key: varchar(64) UNIQUE
  amount_cents: int
  outcome: enum(success, failed, pending)
  failure_reason: varchar(200) nullable
  processor_transaction_id: varchar(100) nullable
  attempted_at: timestamp
)

usage_events {
  id: bigint PK
  subscription_id: uuid FK
  metric: varchar(50)
  quantity: decimal(10,4)
  idempotency_key: varchar(64) UNIQUE
  event_timestamp: timestamp
  -- Partitioned by subscription_id and month
}`,
      examples: [
        { table: 'subscriptions', label: 'Active monthly subscription in current billing period', json: '{ "id": "sub-a1b2c3d4", "customer_id": 100501, "plan_id": 3, "payment_method_token": "pm_tok_visa_4242", "status": "active", "current_period_start": "2025-06-01T00:00:00Z", "current_period_end": "2025-07-01T00:00:00Z", "cancel_at_period_end": false, "trial_end": null }' },
        { table: 'invoices', label: 'Past-due invoice in dunning retry cycle', json: '{ "id": "inv-z9y8x7w6", "subscription_id": "sub-a1b2c3d4", "customer_id": 100501, "period_start": "2025-06-01T00:00:00Z", "period_end": "2025-07-01T00:00:00Z", "amount_cents": 2999, "status": "open", "payment_attempt_count": 2, "next_payment_attempt": "2025-06-05T09:00:00Z" }' },
        { table: 'payment_attempts', label: 'Failed first charge attempt with reason', json: '{ "id": 9900112, "invoice_id": "inv-z9y8x7w6", "idempotency_key": "inv-z9y8x7w6-attempt-1", "amount_cents": 2999, "outcome": "failed", "failure_reason": "insufficient_funds", "processor_transaction_id": null, "attempted_at": "2025-06-01T09:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A nightly cron job queries for all subscriptions due for renewal today and charges them in a loop. Failed charges immediately cancel the subscription. A single counter tracks retries.',
      problems: [
        'Charging all subscriptions in a tight loop at midnight creates a thundering herd that overwhelms the payment processor rate limits',
        'Immediate cancellation on first failure loses recoverable subscribers (30 to 40 percent of failed charges succeed on retry)',
        'No idempotency on charge attempts causes double charges when the cron job crashes mid-run and restarts',
        'No prorated billing for plan changes: customers upgrade and get charged the full new plan price even if they have two weeks left on their old plan',
        'Pause and resume logic is a special-case branch in the cron job, not a first-class state machine',
        'No metered billing support: usage-based pricing requires a separate system that the batch job does not integrate with',
      ],
    },

    advancedImplementation: {
      title: 'Event-Driven Billing Engine with Intelligent Dunning',
      description: 'Subscription renewal is event-driven rather than batch: each subscription has its next_charge_date in a scheduled job queue (SQS, Kafka with delay, or a specialized scheduler like Temporal). When a subscription renewal fires, it creates an invoice, attempts the charge with a unique idempotency key, and if the charge fails, publishes a dunning event that schedules a retry at the optimal time. Dunning retries use a configurable schedule (Day 1, Day 3, Day 7, Day 14) with customer email notifications at each step. Prorated billing calculates the credit for unused days on the old plan and the charge for remaining days on the new plan, combined into a single invoice adjustment.',
      keyPoints: [
        'Per-subscription scheduled job rather than global cron: each subscription has its own renewal event queued at its specific charge time, spreading load throughout the day instead of a midnight spike',
        'Idempotency enforced by idempotency_key = invoice_id + attempt_number on every payment_processor call; duplicate API calls from retries return the cached result without a second charge',
        'Dunning schedule configurable per plan: Pay-as-you-go plans may retry 3 times over 7 days; enterprise plans may have a longer 21-day dunning window with account manager outreach',
        'Smart retry timing: avoid retrying at the same time as the original failure (bank rate limits) and prefer Tuesday or Wednesday morning (historically higher approval rates for retry charges)',
        'Proration formula: credit_cents = (days_remaining / period_days) × old_plan_cents; debit_cents = (days_remaining / period_days) × new_plan_cents; net = debit - credit, charged immediately on upgrade',
        'Metered usage events ingested via high-throughput Kafka topic with idempotency_key per event; aggregated at billing period close via a Flink job that groups by subscription_id and sums quantity per metric',
        'MRR calculation: sum of all active subscription amounts_cents normalized to monthly equivalent (annual plans divided by 12, weekly plans multiplied by 4.33)',
      ],
      databaseChoice: 'PostgreSQL for subscriptions, invoices, and payment attempts (ACID required for billing correctness); Redis for in-flight invoice state and idempotency cache; Kafka for usage event ingestion and billing event streaming; Temporal or AWS SQS with delay for subscription renewal scheduling; ClickHouse for MRR, churn, and cohort analytics over billing history',
      caching: 'Active subscription details cached in Redis per customer for dashboard rendering (invalidated on any state change); plan details cached in application memory (change quarterly); payment method token validity cached with 24-hour TTL to avoid unnecessary processor calls before each charge attempt; dunning schedule configuration cached in application memory',
    },

    tips: [
      'Idempotency is the central concern in recurring billing — explain exactly how you ensure a charge cannot happen twice even when the system retries after a failure.',
      'Dunning is the term most interviewers will not know — briefly define it (the process of retrying failed payments and communicating with customers) before diving into the design.',
      'The thundering herd problem on renewal dates (many subscriptions all due on the 1st of the month) is a classic scaling challenge — explain how per-subscription scheduled jobs solve it.',
      'Prorated billing calculation is a common follow-up: explain the formula and handle the edge cases (upgrade within a trial period, upgrade on the last day of the cycle).',
      'Churn and MRR are business metrics that the system must be designed to compute accurately — mentioning cohort analytics shows understanding of the business context beyond the technical system.',
      'Metered billing is an interesting variant that differs fundamentally from fixed billing — briefly contrasting the two shows range of understanding.',
    ],

    keyQuestions: [
      {
        question: 'How do you handle a card decline on renewal day for 1 million subscribers without overwhelming the payment processor or support team?',
        answer: `**The problem:** All monthly subscribers renew on the 1st. You process 1M charges simultaneously. 150K (15%) fail. 150K customers get instant cancellation emails. Support team is overwhelmed. Many were recoverable.

**Solution: Event-driven billing with staggered renewals and intelligent dunning**

**Step 1: Stagger renewal times throughout the day**
\`\`\`
Instead of all subscriptions charged at 00:00 on the 1st:
- When subscription is created, assign a random minute within the day
- sub-A: 1st of month at 09:15
- sub-B: 1st of month at 14:42
- sub-C: 1st of month at 22:07

Max charge rate: 1M / (24 * 60) = ~694 charges/min = ~11.6 charges/sec
This is well within payment processor rate limits
\`\`\`

**Step 2: Idempotent charge with unique key**
\`\`\`
idempotency_key = f"inv-{invoice_id}-attempt-{attempt_count}"
result = payment_processor.charge(amount, token, idempotency_key=key)

If the service crashes and retries, same idempotency_key → processor returns cached result → no double charge
\`\`\`

**Step 3: Dunning workflow for failed charges**
\`\`\`
Attempt 1 (renewal day, 9:15am): FAILED — insufficient_funds
  → Set subscription status = past_due
  → Send "Payment failed, we will retry" email
  → Schedule retry for Day 3 at 10am (Tuesday morning, higher approval rates)

Attempt 2 (Day 3, 10am): FAILED again
  → Send "Update your payment method" email with link
  → Schedule retry for Day 7

Attempt 3 (Day 7): SUCCESS → subscription back to active, send receipt
           OR
           FAILED → Send "Final notice" email
           Schedule Day 14 retry

Attempt 4 (Day 14): FAILED → cancel subscription, send churned email with win-back offer
\`\`\`

**Recovery rate:** A good dunning workflow recovers 30-40% of initially failed payments, turning them from churned customers into retained ones. Those are real revenue and customer retention numbers.`,
      },
      {
        question: 'How do you calculate prorated charges when a customer upgrades their plan mid-cycle?',
        answer: `**Scenario:**
- Customer is on Basic plan: $30/month
- 15 days into their 30-day billing cycle (halfway through)
- Upgrades to Pro plan: $60/month
- Effective immediately

**Proration formula:**
\`\`\`
Days remaining in current period: 15
Days in billing period: 30

Credit for unused Basic days:
  credit = (15/30) × $30 = $15.00

Charge for remaining Pro days:
  debit = (15/30) × $60 = $30.00

Immediate charge on upgrade:
  upgrade_charge = debit - credit = $30 - $15 = $15.00

Next renewal (Day 30):
  full Pro price = $60.00
\`\`\`

**Implementation:**
\`\`\`python
def calculate_proration(subscription, new_plan, effective_at):
    period_days = (subscription.current_period_end -
                   subscription.current_period_start).days
    remaining_days = (subscription.current_period_end - effective_at).days

    credit_cents = (remaining_days / period_days) * subscription.plan.amount_cents
    debit_cents = (remaining_days / period_days) * new_plan.amount_cents

    net_charge_cents = round(debit_cents - credit_cents)
    return net_charge_cents  # positive = charge, negative = credit
\`\`\`

**Edge cases:**
- Upgrade on day 1 (immediately after renewal): debit ≈ full new price, credit ≈ full old price → approximately the difference between plans
- Upgrade on the last day: debit ≈ 0, credit ≈ 0, new plan takes effect next renewal
- Downgrade (new plan is cheaper): net is negative → apply as credit on next invoice rather than issuing a refund
- Upgrade during trial: typically charge nothing until trial ends, then apply full new plan price`,
      },
    ],

    keyDecisions: [
      'Per-subscription scheduled event vs nightly batch cron — chose per-subscription events staggered throughout the day because batch cron at midnight creates a payment processor rate limit spike and zero flexibility for optimal retry timing',
      'Idempotency via payment processor idempotency keys vs application-level deduplication — chose both: payment processor key prevents double charges at the API level, application-level tracking of payment_attempt records prevents duplicate retry scheduling',
      'Immediate cancellation on failure vs dunning workflow — chose dunning because industry data shows 30-40% of failed charges are recoverable within 14 days; immediate cancellation destroys subscriber lifetime value for a problem that would resolve itself',
      'Proration credit vs no proration on upgrade — chose proration because charging full price for a period the customer already paid for creates customer complaints and chargebacks; proration aligns cost with value received',
      'Postgres for usage events vs dedicated timeseries database — chose partitioned Postgres for usage events under 10B events/month because Postgres with monthly partitioning handles this volume; TimescaleDB or ClickHouse warranted above that scale or when real-time usage dashboards are required',
    ],
  },

  {
    id: 'warehouse-inventory',
    isNew: true,
    title: 'Warehouse and Inventory Management System',
    subtitle: 'Amazon Fulfillment Centers / SAP WMS / Manhattan Associates',
    icon: 'box',
    color: '#10b981',
    difficulty: 'Hard',
    description: 'Design a warehouse management system that coordinates inbound receiving, intelligent slotting, optimized pick paths, and multi-warehouse order routing to maximize fulfillment throughput.',

    introduction: `A fulfillment center is a physical machine where the throughput bottleneck shifts constantly between inbound receiving, put-away, pick, pack, and outbound shipping. Software must model and optimize each stage while maintaining accurate inventory counts that reconcile with physical reality. When inventory counts diverge from physical stock, orders ship incorrectly, and customer trust erodes. When pick paths are unoptimized, labor costs rise. When slotting is wrong, fast-moving items are buried in far aisles and slow-moving items occupy prime real estate.

The Warehouse Management System (WMS) is the operating system of the fulfillment center. It tracks every item from the moment it arrives on an inbound truck through its residence in a bin location to its departure in an outbound shipping carton. Every movement — receiving scan, put-away scan, pick scan, pack confirmation, and ship scan — is recorded in real time. The scan event is both the trigger for the next workflow step and the moment of inventory accounting: inventory transitions from "in transit" to "available" on receiving scan, from "available" to "reserved" on pick task creation, and from "reserved" to "shipped" on outbound scan.

Slotting optimization determines where in the warehouse each SKU lives. The naive approach is to assign bins by arrival order. The optimized approach places fast-moving SKUs closest to pack stations (minimizing picker travel distance for high-frequency picks), co-locates items frequently ordered together (a customer who buys Item A also buys Item B 40 percent of the time — put them in adjacent bins), and assigns heavier items to lower shelves for ergonomic safety. Slotting is not a one-time decision: as sales velocity changes seasonally, re-slotting moves items to better positions. Good slotting can reduce picker travel distance by 20 to 30 percent for the same order mix.

Multi-warehouse routing adds another dimension. When an order can be fulfilled by multiple fulfillment centers, which one should ship it? The naive answer is the closest warehouse. The correct answer is the warehouse that minimizes total cost considering inventory availability, shipping zone fees, split shipment cost (one order shipped from two warehouses costs more in shipping), and fulfillment center capacity utilization. This is a real-time optimization problem that must resolve in under 100 milliseconds for checkout flow.`,

    functionalRequirements: [
      'Inbound receiving: scan inbound shipments, record inventory by SKU and quantity, direct items to optimal bin locations',
      'Slotting engine: assign and reassign bin locations based on velocity, co-purchase frequency, and ergonomic constraints',
      'Pick task generation: create optimized pick sequences for each order wave that minimize total travel distance',
      'Wave planning: batch orders with overlapping SKUs into pick waves to reduce concurrent picker travel',
      'Pack station support: carton selection algorithm picks the smallest box that fits all items with protective material',
      'Multi-warehouse routing: assign each order to the fulfillment center that minimizes cost considering inventory, shipping zone, and split shipment',
      'Inventory accuracy: cycle count scheduling and discrepancy investigation workflows',
      'Returns processing: inspect returned items and route to restock, refurbish, or disposal',
    ],

    nonFunctionalRequirements: [
      'Multi-warehouse routing decision completes in under 100ms for checkout flow',
      'Pick task assignment updates in near real-time as pickers complete tasks and new orders arrive',
      'Inventory counts consistent across all system views within 30 seconds of any scan event',
      'System supports 10K concurrent pickers across a network of 50 fulfillment centers',
      'Wave planning for 50K orders into pick batches completes in under 5 minutes for morning wave',
    ],

    estimation: {
      users: '50 warehouses, 10K pickers per warehouse, 10M orders per day, 100M SKU-location records',
      storage: 'Inventory records at 500 bytes × 100M SKU-location pairs = 50GB; scan events at 200 bytes × 100M scans/day = 20GB/day; order records at 3KB × 10M = 30GB/day',
      bandwidth: 'Scanner device data at 100 bytes × 100M scans/day = 10GB/day; real-time location updates for 10K pickers across warehouses at 50 bytes × 1 update/10s × 10K = 5MB/sec',
      qps: '10M orders/day = ~116 orders/sec; routing decisions at 116/sec; scan events at 100M/day = ~1.2K scans/sec peak; cycle count queries at 100/sec',
    },

    apiDesign: {
      description: 'Receiving, pick task management, wave planning, and multi-warehouse routing endpoints',
      endpoints: [
        { method: 'POST', path: '/api/receiving/scan', params: '{ warehouse_id, po_number, sku, quantity, expiry_date? }', response: '{ receipt_id, bin_assignment, put_away_instructions }', description: 'Record inbound receipt of SKU quantity and assign to bin location' },
        { method: 'POST', path: '/api/routing/assign', params: '{ order_id, items[{ sku, quantity }], ship_to_zip }', response: '{ warehouse_id, shipping_zone, estimated_transit_days, split_shipments[] }', description: 'Assign order to optimal fulfillment center at checkout' },
        { method: 'GET', path: '/api/pickers/{id}/next-task', params: 'warehouse_id', response: '{ task_id, pick_list[{ bin_location, sku, quantity, aisle, shelf }], estimated_time_minutes }', description: 'Return next optimized pick task for a picker' },
        { method: 'POST', path: '/api/picks/{task_id}/complete', params: '{ picker_id, items_picked[{ sku, quantity_picked, discrepancy_reason? }] }', response: '{ next_task_id, inventory_updated }', description: 'Confirm pick completion and update inventory' },
        { method: 'POST', path: '/api/waves/plan', params: '{ warehouse_id, order_ids[], picker_count, shift_duration_hours }', response: '{ waves[{ wave_id, orders[], estimated_completion_time, pick_tasks[] }] }', description: 'Generate optimized wave plan for a set of orders and available pickers' },
      ],
    },

    dataModel: {
      description: 'Warehouse layout, inventory by bin, pick tasks, and scan event ledger',
      schema: `warehouses {
  id: int PK
  name: varchar(200)
  address: text
  lat: decimal(9,6)
  lng: decimal(9,6)
  total_bins: int
  active_pickers: int
}

bin_locations {
  id: bigint PK
  warehouse_id: int FK
  aisle: varchar(10)
  bay: int
  level: int         -- floor, mid, high
  position: int
  location_code: varchar(20) UNIQUE  -- e.g., A-03-02-04
  bin_type: enum(standard, oversize, cold_storage, hazmat)
  max_weight_lbs: decimal(8,2)
}

inventory {
  id: bigint PK
  warehouse_id: int FK
  sku: varchar(50)
  bin_id: bigint FK
  quantity_available: int
  quantity_reserved: int   -- allocated to open pick tasks
  quantity_inbound: int    -- in receiving, not yet put away
  lot_number: varchar(50) nullable
  expiry_date: date nullable
  last_cycle_counted_at: timestamp
  UNIQUE (warehouse_id, sku, bin_id, lot_number)
}

pick_tasks {
  id: bigint PK
  order_id: uuid FK
  warehouse_id: int FK
  picker_id: bigint nullable FK
  wave_id: bigint nullable FK
  status: enum(queued, assigned, in_progress, completed, exception)
  pick_list: jsonb   -- [{ bin_id, sku, quantity }] sorted by optimal path
  assigned_at: timestamp nullable
  completed_at: timestamp nullable
}

scan_events {
  id: bigint PK
  warehouse_id: int FK
  operator_id: bigint FK
  event_type: enum(receive, putaway, pick, pack, ship, cycle_count, return)
  sku: varchar(50)
  quantity: int
  bin_id: bigint nullable FK
  reference_id: varchar(100)  -- order_id, po_number, etc.
  scanned_at: timestamp
  -- Append-only, never updated
}`,
      examples: [
        { table: 'inventory', label: 'SKU with available and reserved quantities in a specific bin', json: '{ "id": 220001, "warehouse_id": 3, "sku": "SKU-WIDGET-A", "bin_id": 50123, "quantity_available": 45, "quantity_reserved": 12, "quantity_inbound": 0, "lot_number": null, "expiry_date": null, "last_cycle_counted_at": "2025-05-28T10:00:00Z" }' },
        { table: 'pick_tasks', label: 'Pick task assigned to picker with optimized pick list', json: '{ "id": 800112, "order_id": "ord-a1b2c3d4", "warehouse_id": 3, "picker_id": 10045, "wave_id": 401, "status": "in_progress", "pick_list": [{"bin_id": 50100, "sku": "SKU-CAP", "quantity": 1}, {"bin_id": 50123, "sku": "SKU-WIDGET-A", "quantity": 2}], "assigned_at": "2025-06-01T09:15:00Z", "completed_at": null }' },
        { table: 'scan_events', label: 'Pick scan recorded during order fulfillment', json: '{ "id": 9900334, "warehouse_id": 3, "operator_id": 10045, "event_type": "pick", "sku": "SKU-WIDGET-A", "quantity": 2, "bin_id": 50123, "reference_id": "task-800112", "scanned_at": "2025-06-01T09:22:44Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A spreadsheet or simple database tracks inventory by warehouse. Orders are manually assigned to pickers on paper pick sheets. Bin locations are assigned when items arrive based on first available empty bin. No pick path optimization.',
      problems: [
        'No pick path optimization: pickers walk the warehouse in random order, covering 3x the necessary distance',
        'Inventory counts diverge from physical reality because scan events are recorded at end of shift, not real-time',
        'No slotting intelligence: fast-moving SKUs are randomly distributed across the warehouse instead of concentrated near pack stations',
        'Multi-warehouse routing is manual: order management team decides which warehouse to use based on intuition',
        'No wave planning: all orders assigned to pickers individually, causing multiple pickers to walk to the same aisle for the same SKUs in the same hour',
        'Cycle counts scheduled arbitrarily rather than triggered by discrepancy signals or velocity',
      ],
    },

    advancedImplementation: {
      title: 'Optimized Fulfillment with Velocity-Based Slotting and Wave Planning',
      description: 'Slotting is driven by a daily velocity analysis: SKUs ranked by picks per day are assigned to bins by proximity to pack stations (top-100 velocity SKUs in bins within 50 feet of pack stations). Pick path optimization uses a shortest-path algorithm through the warehouse aisle graph. Wave planning batches orders that share SKUs in the same aisles, allowing multiple order pick tasks to be served from one trip down a high-density aisle. Multi-warehouse routing solves a linear program: minimize shipping_cost + split_penalty subject to inventory_availability constraints, evaluating all eligible warehouses in parallel.',
      keyPoints: [
        'Slotting optimization runs nightly: compute picks_per_day per SKU, rank by velocity, assign bins in order of proximity to pack stations; top 100 SKUs in zone A, next 500 in zone B, long tail in zone C',
        'Co-location scoring boosts proximity assignment for SKU pairs with co-purchase rate above 30 percent; items frequently ordered together placed in adjacent bins to reduce multi-line order pick distance',
        'Wave planning groups orders by overlapping SKU-aisle pairs: if Order 1 and Order 2 both need items from aisle C, assign them to the same wave so one picker can collect both in one pass through aisle C',
        'Pick path generated by solving a variant of the Traveling Salesman Problem over bin locations in the pick list, using a 2-opt heuristic since lists are small enough (10-30 bins) for near-optimal solution in milliseconds',
        'Multi-warehouse routing evaluates all eligible warehouses in parallel using a cost function: ship_cost[warehouse][zip_zone] + split_penalty × (orders split across warehouses) + capacity_cost[warehouse]; returns lowest-cost feasible assignment in under 100ms',
        'Inventory accuracy maintained by real-time scan events; cycle count frequency for each SKU driven by velocity (fast-moving SKUs counted weekly, slow-moving monthly) and by discrepancy rate (items with recent scan anomalies counted more often)',
        'Returns processing workflow: return arrives → scan to return receiving → condition assessment (picker grades as new, like-new, damaged) → routing decision (restock to prime bin, restock to returns bin, refurbish queue, or destroy)',
      ],
      databaseChoice: 'PostgreSQL for inventory, bin locations, and pick tasks with row-level locking for concurrent quantity updates; Redis for real-time available inventory cache per warehouse-SKU (invalidated on each scan event); Kafka for scan event streaming to inventory update consumers; ClickHouse for warehouse analytics (picks per hour per picker, slotting effectiveness, wave planning quality)',
      caching: 'Available inventory per warehouse-SKU cached in Redis with write-through on every scan event; wave plan cached per shift once computed; bin location coordinates cached in application memory for pick path computation (static until re-slotting); multi-warehouse shipping zone lookup table cached in application memory',
    },

    tips: [
      'Slotting optimization is the most interesting and differentiating topic in WMS design — explain the velocity-based approach and co-location scoring clearly.',
      'Wave planning is a concept most interviewers are not familiar with — define it explicitly: batching orders that share SKUs so multiple orders can be picked efficiently on one trip through an aisle.',
      'The pick path optimization is a small-scale TSP — be explicit that you use a heuristic (2-opt), not exact TSP, because exact TSP is NP-hard and the small size makes heuristics near-optimal.',
      'Multi-warehouse routing is where the system design challenge and the business problem most directly connect — frame it as a real-time optimization problem with inventory, shipping zone, and split shipment cost dimensions.',
      'Inventory accuracy is a common interview follow-up: explain the append-only scan event ledger and how cycle counting with discrepancy investigation keeps physical reality aligned with the database.',
      'Mention hazmat segregation, cold chain, and weight limits on bin levels as constraints the slotting system must enforce — these show awareness of operational realities.',
    ],

    keyQuestions: [
      {
        question: 'How does slotting optimization work and why does it dramatically affect fulfillment throughput?',
        answer: `**The insight:** A picker walks 8 to 12 miles per shift. The order in which they visit bins determines how much productive picking they do vs how much walking they do. Slotting determines which items live in which bins, which determines how much walking is needed per pick.

**Why naive slotting fails:**
Assign items to first available bin on arrival. The 10,000 most popular items end up randomly distributed across 500,000 bins. A picker collecting 30 items crosses the entire warehouse repeatedly. Each item requires a unique trip to a random location.

**Velocity-based slotting:**
\`\`\`
Every night, compute picks_per_day for every SKU over last 30 days.

Zone A (0-50 feet from pack stations): Top 100 SKUs
  - Each of these items is picked thousands of times per day
  - Saving 1 minute per pick × 5,000 picks/day = 83 picker-hours/day saved

Zone B (50-200 feet): Next 2,000 SKUs
  - Medium-frequency items, reasonable walking distance

Zone C (200+ feet): Long-tail SKUs
  - Picked rarely; walking distance less impactful on total throughput
\`\`\`

**Co-location bonus:**
\`\`\`
If P(order contains A | order contains B) > 0.3:
  Place A and B in adjacent bins
  Reason: picker collecting A almost always needs B in the same trip

Example: USB-C cables and laptop chargers often ordered together
  → Place in bins A-01-02-03 and A-01-02-04 (adjacent)
  → Picker grabs both without moving between aisles
\`\`\`

**Measuring slotting quality:**
- Picks per picker-hour (before vs after re-slotting)
- Average distance traveled per pick order (total feet / number of items)
- % of picks completed without crossing an aisle boundary

Amazon re-slots frequently (weekly for top items) because the top-100 list changes with seasons, promotions, and new products. A static slotting plan degrades as velocity patterns shift.`,
      },
      {
        question: 'How do you route an order to the optimal fulfillment center across a network of 50 warehouses?',
        answer: `**Simple approach (wrong): Route to nearest warehouse**
Problem: Nearest warehouse may be out of stock, may cause order split, or may have high shipping zone costs despite physical proximity.

**Cost-minimization routing:**
\`\`\`python
def route_order(order_items, ship_to_zip):
    eligible_warehouses = []

    for warehouse in warehouses:
        # Check inventory availability
        can_fulfill = all(
            inventory[warehouse][item.sku] >= item.quantity
            for item in order_items
        )
        if not can_fulfill:
            # Try split: can we split between 2 warehouses?
            split = find_split_fulfillment(order_items, warehouse, warehouses)
            if split:
                eligible_warehouses.append({
                    'type': 'split',
                    'split': split,
                    'cost': shipping_cost(split, ship_to_zip) + SPLIT_PENALTY
                })
            continue

        # Single-warehouse fulfillment cost
        zone = shipping_zone(warehouse.zip, ship_to_zip)
        cost = shipping_rates[zone][order_weight]
        eligible_warehouses.append({
            'type': 'single',
            'warehouse': warehouse.id,
            'cost': cost,
            'transit_days': transit_days[zone]
        })

    # Return minimum cost option meeting delivery promise
    return min(eligible_warehouses, key=lambda x: x['cost'])
\`\`\`

**Key factors in cost function:**
- **Shipping zone fee**: US shipping has 8 zones; a package to Zone 8 from Zone 1 costs 3x more than Zone 2. A warehouse 200 miles away in the same zone can be cheaper than one 50 miles away across a zone boundary.
- **Split penalty**: Shipping one order from two warehouses costs ~40% more in total shipping and creates worse customer experience (two delivery windows). Add $5-10 explicit penalty to split options.
- **Capacity utilization**: Overloaded warehouses get a cost penalty to steer orders away from stressed facilities.
- **SLA commitment**: If next-day delivery promised, only warehouses that can ship same-day are eligible.

**Performance requirement: under 100ms**
- Pre-compute inventory snapshots per warehouse in Redis (update on every scan event)
- Pre-compute shipping zone lookup table (zip → zone for each warehouse) in memory
- Evaluate all 50 warehouses in parallel (async, not sequential)
- Total latency: inventory lookup (2ms Redis) + parallel routing math (5ms) + ranking (1ms) = ~8ms`,
      },
    ],

    keyDecisions: [
      'Velocity-based slotting with nightly recomputation vs static bin assignment — chose velocity-based because top-100 SKUs account for 60 percent of picks; concentrating them near pack stations provides disproportionate throughput improvement at low re-slotting cost',
      'Append-only scan event ledger vs mutable inventory counts — chose append-only because inventory discrepancies require investigation; the scan history is the evidence; mutable counts make it impossible to reconstruct how a discrepancy occurred',
      'Wave planning per shift vs individual order assignment — chose wave planning because individual assignment sends 50 pickers to the same popular aisle simultaneously while wave planning staggers aisle access and reduces picker congestion by 40 percent',
      'Parallel warehouse evaluation at routing time vs pre-computed routing recommendations — chose parallel real-time evaluation because pre-computed recommendations go stale within minutes as inventory changes; correctness requires real-time inventory check',
      'Row-level locking for inventory reservation vs optimistic concurrency — chose row-level lock for inventory reservation because concurrent pick tasks competing for the last few units of a SKU require strong consistency; optimistic concurrency causes retry storms when demand spikes for a popular item',
    ],
  },

  {
    id: 'social-commerce',
    isNew: true,
    title: 'Social Commerce Platform',
    subtitle: 'TikTok Shop / Instagram Shopping / Pinterest Shopping',
    icon: 'shoppingCart',
    color: '#ec4899',
    difficulty: 'Medium',
    description: 'Design a social commerce platform where creators tag products in content, live shopping streams drive real-time purchases, and an affiliate system attributes sales to creators.',

    introduction: `Social commerce collapses the discovery-to-purchase funnel from days to seconds. Traditional e-commerce requires a customer to discover a product (ad or search), navigate to a product page, evaluate it, add to cart, and check out — a multi-step process with high dropout at each stage. Social commerce embeds the purchase inside the content experience: a customer watches a creator demonstrate a product, taps the tagged product while still watching, and completes a one-tap checkout without leaving the app. The reduced friction drives conversion rates that are 3 to 5 times higher than traditional e-commerce.

Live shopping is the most technically demanding variant. A creator streams live video while demonstrating products, and viewers can purchase during the stream. This requires tight integration between three real-time systems: the video streaming pipeline (WebRTC or RTMP ingest, CDN delivery), the inventory system (a product with 50 units in stock might sell out in seconds when a popular creator demonstrates it), and the ordering system (hundreds of simultaneous purchase attempts for the same product). Inventory countdown visible to viewers — "Only 5 left!" — must be accurate without creating a stampede that oversells.

Attribution is the core business problem for the creator economy. A viewer watches a creator's TikTok at 11pm, does not buy immediately, watches two more videos from the same creator, then buys the next morning from a direct search. Who gets credit? Last-touch attribution (the search) misattributes the conversion and underpays the creator. First-touch attribution (the first video) overpays for influence on buyers who would have purchased anyway. Multi-touch attribution models (linear, time-decay, data-driven) give partial credit to each touchpoint but require tracking across sessions and channels, which conflicts with browser privacy protections and app tracking restrictions.

Creator economics require a transparent and trusted payout system. Creators receive commissions typically ranging from 5 to 20 percent of GMV (gross merchandise value) they drive. The platform must track every conversion touchpoint, calculate the commission accurately, handle returns (if a buyer returns the product, the commission is reversed), and disburse to creators on a predictable schedule. Creators who feel they are not being paid fairly will switch platforms, so the calculation must be auditable and explainable.`,

    functionalRequirements: [
      'Shoppable content: tag products in short-form videos and images, display purchase overlay when viewer taps the tag',
      'Live shopping streams: host demonstrates products with real-time viewer purchase capability and live inventory countdown',
      'Affiliate creator program: track impressions, clicks, and purchases attributable to each creator',
      'In-app checkout with stored payment methods for frictionless one-tap purchase without leaving the app',
      'Product catalog management for sellers integrated with content tagging',
      'Content moderation for product listings to prevent counterfeit and prohibited items',
      'Creator analytics dashboard showing views, GMV driven, conversion rate, and commission earned',
      'Returns handling with commission reversal when products are returned within the return window',
    ],

    nonFunctionalRequirements: [
      'Product purchase during live stream handles 10K concurrent buyers for the same item without overselling',
      'Shoppable video overlay loads product details within 500ms of viewer tap',
      'Attribution events tracked and associated with the correct creator within 30 seconds of purchase',
      'Live inventory countdown stays accurate within 5 seconds of a purchase reducing stock',
      'Commission calculations are deterministic: same transaction always produces the same commission amount',
    ],

    estimation: {
      users: '500M monthly active viewers, 5M creator sellers, 100M purchases per month',
      storage: 'Content-product associations at 1KB × 1B videos with tags = 1TB; order records at 3KB × 100M/month = 300GB/month; attribution event log at 500B × 10B events/month = 5TB/month',
      bandwidth: 'Live stream delivery: 1M concurrent viewers × 5Mbps = 5Tbps peak; product overlay CDN: 10B impressions/day × 5KB = 50TB/day',
      qps: '100M purchases/month = ~38 purchases/sec average; live stream purchase spikes at 10K/sec during popular creator events; attribution events at 10B/month = ~3.8K/sec',
    },

    apiDesign: {
      description: 'Content tagging, live shopping, purchase, and attribution endpoints',
      endpoints: [
        { method: 'POST', path: '/api/content/{id}/product-tags', params: '{ products[{ product_id, timestamp_seconds?, position: { x_pct, y_pct } }] }', response: '{ tag_ids[], moderation_status }', description: 'Creator tags products in a video at specific timestamps and screen positions' },
        { method: 'POST', path: '/api/live-streams', params: '{ creator_id, featured_products[{ product_id, inventory_allocated }], stream_key }', response: '{ stream_id, rtmp_ingest_url, viewer_link }', description: 'Start a live shopping stream with pre-allocated product inventory' },
        { method: 'POST', path: '/api/orders', params: '{ viewer_id, product_id, quantity, creator_id, content_id, stream_id? }', response: '{ order_id, confirmation, estimated_delivery }', description: 'Place purchase from shoppable content with attribution context' },
        { method: 'GET', path: '/api/live-streams/{id}/inventory', params: 'product_id', response: '{ quantity_available, sold_count, selling_fast: boolean }', description: 'Real-time inventory for live stream product countdown display' },
        { method: 'GET', path: '/api/creators/{id}/analytics', params: 'period', response: '{ impressions, clicks, orders, gmv_cents, commission_cents, conversion_rate, top_products[] }', description: 'Creator performance dashboard' },
      ],
    },

    dataModel: {
      description: 'Content tags, live streams, orders with attribution, and commission ledger',
      schema: `content_product_tags {
  id: bigint PK
  content_id: varchar(50) FK  -- video or image ID
  creator_id: bigint FK
  product_id: bigint FK
  seller_id: bigint FK
  timestamp_seconds: int nullable  -- for video, null for images
  position_x_pct: decimal(5,2) nullable
  position_y_pct: decimal(5,2) nullable
  moderation_status: enum(pending, approved, rejected)
  created_at: timestamp
}

live_streams {
  id: bigint PK
  creator_id: bigint FK
  status: enum(scheduled, live, ended)
  started_at: timestamp nullable
  ended_at: timestamp nullable
  peak_concurrent_viewers: int DEFAULT 0
  total_gmv_cents: bigint DEFAULT 0
}

live_stream_products {
  stream_id: bigint FK
  product_id: bigint FK
  inventory_allocated: int    -- units reserved for this stream
  units_sold: int DEFAULT 0
  PRIMARY KEY (stream_id, product_id)
}

orders {
  id: uuid PK
  buyer_id: bigint FK
  product_id: bigint FK
  seller_id: bigint FK
  quantity: int
  unit_price_cents: int
  total_cents: int
  status: enum(placed, paid, shipped, delivered, returned, cancelled)
  attributed_creator_id: bigint nullable FK
  attributed_content_id: varchar(50) nullable
  attributed_stream_id: bigint nullable FK
  attribution_model: varchar(50)  -- last_touch, linear, data_driven
  placed_at: timestamp
}

commission_events {
  id: bigint PK
  creator_id: bigint FK
  order_id: uuid FK
  event_type: enum(earned, reversed)
  gmv_cents: int
  commission_rate_bps: int
  commission_cents: int
  created_at: timestamp
  -- Append-only
}`,
      examples: [
        { table: 'orders', label: 'Purchase attributed to a live stream creator', json: '{ "id": "ord-bb99aa11", "buyer_id": 2200113, "product_id": 55001, "seller_id": 8800, "quantity": 1, "unit_price_cents": 4999, "total_cents": 4999, "status": "delivered", "attributed_creator_id": 77001, "attributed_content_id": null, "attributed_stream_id": 30012, "attribution_model": "last_touch", "placed_at": "2025-06-01T21:15:33Z" }' },
        { table: 'live_stream_products', label: 'Product with 30 of 100 allocated units remaining', json: '{ "stream_id": 30012, "product_id": 55001, "inventory_allocated": 100, "units_sold": 70 }' },
        { table: 'commission_events', label: 'Commission earned on a delivered order', json: '{ "id": 1100445, "creator_id": 77001, "order_id": "ord-bb99aa11", "event_type": "earned", "gmv_cents": 4999, "commission_rate_bps": 1000, "commission_cents": 500, "created_at": "2025-06-03T10:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A database stores product tags on content. Purchases redirect users to the seller\'s external website. Attribution is tracked via URL parameters that may be lost if the user returns later. Commission is calculated monthly by a data team SQL query.',
      problems: [
        'Redirect to external seller website breaks the in-app purchase experience and loses 70 percent of buyers at the redirect',
        'URL-parameter attribution is lost when buyers do not purchase on the first click (most common pattern)',
        'No live shopping capability; only static product tags on uploaded content',
        'Commission calculation done monthly via ad hoc SQL creates disputes about which creator gets credit for which sale',
        'No real-time inventory visibility during high-demand moments; overselling occurs when popular products sell out faster than the database is updated',
        'Content moderation for product listings is entirely manual, creating a bottleneck for sellers wanting to tag new products',
      ],
    },

    advancedImplementation: {
      title: 'In-App Checkout with Real-Time Inventory and Multi-Touch Attribution',
      description: 'In-app checkout stores payment methods securely (Stripe), enabling one-tap purchase without leaving the content view. Attribution uses a click tracking pipeline: every product impression and click is logged to Kafka with a session ID, and purchase events are linked back to the most recent attributed creator interaction within a 7-day window. Live stream inventory uses Redis atomic counters: a purchase decrements the Redis counter, and the live counter value is pushed to viewers via WebSocket. Content moderation uses a tiered pipeline: ML classifier for obvious violations plus human review queue for borderline cases.',
      keyPoints: [
        'In-app checkout stores tokenized payment methods (no card numbers in app server); one-tap purchase triggers server-side charge reducing checkout friction by eliminating form fill',
        'Attribution pipeline: impression event (content_id, creator_id, viewer_id, timestamp) logged to Kafka → stored in ClickHouse → at purchase time, query last N attribution events for this viewer within 7-day window → apply attribution model (last-touch or linear)',
        'Live stream inventory tracked in Redis per stream-product pair with atomic DECR on purchase; Redis value is the source of truth during the stream, synced back to the database every 10 seconds and on stream end',
        'Inventory oversell prevention during live stream: DECR returns the new value; if new value < 0, INCR to restore and return "sold out" to the buyer without completing the order',
        'Content moderation pipeline: ML classifier flags hate speech, counterfeit indicators, prohibited categories; high-confidence violations auto-rejected; borderline cases routed to human review queue sorted by creator follower count (popular creator listings reviewed faster)',
        'Commission reversal on returns: when an order status changes to returned, insert a commission_events row with event_type=reversed and negative commission_cents, reducing the creator\'s pending payout for that period',
        'Creator analytics computed from ClickHouse aggregation over attribution events and commission events, updated hourly, served from Redis cache for dashboard rendering',
      ],
      databaseChoice: 'PostgreSQL for orders, sellers, creators, and commission events; Redis for live stream inventory counters and session attribution cache; Kafka for impression, click, and purchase event streaming; ClickHouse for attribution analytics and creator performance reporting; S3 for content metadata; CDN for product images and video delivery',
      caching: 'Product details cached in Redis for shoppable overlay rendering (invalidated on price or inventory changes); creator profile and commission rate cached in application memory per creator; live stream inventory cached in Redis as the primary store (not just a cache) during stream; attribution event cache in Redis per viewer session (7-day TTL)',
    },

    tips: [
      'Attribution is the hardest and most business-critical problem — spend time explaining last-touch vs multi-touch and the privacy challenge from iOS App Tracking Transparency.',
      'Live inventory countdown is a good concurrency problem to discuss: explain the Redis atomic DECR approach and why a database row lock would not scale to 10K concurrent buyers.',
      'In-app checkout is the key product insight that enables social commerce: the conversion rate advantage comes entirely from eliminating the redirect and form-fill steps.',
      'Counterfeit and prohibited content moderation is a recurring challenge unique to marketplace-style features — mention ML pre-screening with human review escalation.',
      'Commission reversal on returns is a detail most candidates miss — asking the interviewer whether to design for this shows business understanding.',
      'The creator economics angle (commission calculation, payout schedule, dispute resolution) shows product depth beyond the technical system.',
    ],

    keyQuestions: [
      {
        question: 'How do you attribute a sale to a creator when the customer clicks a link and buys three days later from a direct search?',
        answer: `**The attribution problem:** Customer watches Creator A's TikTok at 8pm, taps the product but does not buy. The next day they search for the product on Google, click a non-affiliate link, and buy. Creator A drove the awareness but last-touch attribution gives Google the credit.

**Event log approach:**
\`\`\`
Event 1: 2025-06-01 20:15 — viewer_id:1001 viewed content:vid-abc, creator:creator-A
Event 2: 2025-06-01 20:15 — viewer_id:1001 clicked product:prod-123 in content:vid-abc
Event 3: 2025-06-01 22:30 — viewer_id:1001 viewed content:vid-xyz, creator:creator-B (different creator, same product)
Event 4: 2025-06-02 09:45 — viewer_id:1001 purchased product:prod-123 (from search/direct)
\`\`\`

**Attribution models:**

**Last-touch (simplest, common default):**
- Give 100% credit to the last creator interaction before purchase
- Event 3 wins: creator-B gets full commission
- Problem: rewards the last touchpoint regardless of who drove awareness

**First-touch:**
- Give 100% credit to the first interaction
- Event 1 wins: creator-A gets full commission
- Problem: ignores subsequent influencing creators

**Linear (fairer for multi-creator paths):**
- Split credit equally across all touchpoints in window
- Creator-A: 50%, Creator-B: 50%
- Problem: complex to explain to creators and more expensive

**7-day attribution window:**
Interactions older than 7 days are dropped. Prevents creators from claiming credit for purchases weeks after an impression.

**iOS 14+ privacy challenge:**
App Tracking Transparency means creators cannot be attributed across apps (TikTok impression → browser purchase). In-app purchase is the solution: if the entire journey happens inside the app, attribution works without cross-app tracking.

**Practical recommendation:**
Use last-touch as the default (simple, predictable, easy to explain to creators) with a 7-day lookback window, disclosed clearly to creators so they understand the model and can plan content cadence accordingly.`,
      },
      {
        question: 'How does live shopping inventory management work when thousands of viewers are buying simultaneously?',
        answer: `**The problem:** Creator has 100 units of a $200 sneaker. During a live stream with 500K viewers, she holds up the shoe and says "Buy now!" 5,000 viewers tap simultaneously. The database cannot handle 5,000 concurrent reads and writes without overselling.

**Redis atomic counter approach:**
\`\`\`
On stream start:
  HSET stream:30012:inventory product:55001 100  -- 100 units available

On each purchase attempt:
  # Atomic decrement - returns new value
  new_count = HINCRBY stream:30012:inventory product:55001 -1

  if new_count >= 0:
    # Successfully reserved a unit - proceed with order
    create_order(buyer_id, product_id, stream_id)
  else:
    # Oversold - restore the counter and reject
    HINCRBY stream:30012:inventory product:55001 +1
    return "Sorry, this item just sold out!"
\`\`\`

**Why Redis atomic counter works:**
- HINCRBY is atomic: no two concurrent decrements can read the same value
- Redis handles 100K+ operations per second on a single node
- No database row lock needed during the stream

**Syncing back to the database:**
\`\`\`
Every 10 seconds:
  redis_count = HGET stream:30012:inventory product:55001
  UPDATE live_stream_products SET units_sold = 100 - redis_count
  WHERE stream_id = 30012 AND product_id = 55001

On stream end:
  Final sync: update database with terminal inventory count
  Release any remaining allocated inventory back to main catalog
\`\`\`

**Viewer-facing countdown display:**
WebSocket push from the server updates the "Only X left!" counter:
- Subscribe all stream viewers to a Redis PubSub channel for inventory updates
- When Redis count changes, publish to PubSub channel
- WebSocket server fans out to all subscribed viewer connections
- Viewers see the countdown update within 2-3 seconds of each purchase`,
      },
    ],

    keyDecisions: [
      'In-app checkout vs redirect to seller website — chose in-app because redirect causes 70 percent purchase dropout; in-app checkout is the primary conversion rate advantage of social commerce over traditional affiliate links',
      'Last-touch attribution vs multi-touch attribution — chose last-touch as default for simplicity and creator predictability; multi-touch offered as advanced option for brands running large multi-creator campaigns where partial attribution is worth the complexity',
      'Redis atomic counter for live inventory vs database row lock — chose Redis because a single popular live stream generates 5,000 concurrent purchase attempts; database row locks would serialize all of them, creating latency spikes and poor buyer experience',
      'Tiered content moderation (ML first, human review for borderline) vs human review only — chose tiered because 90 percent of obvious violations (known counterfeit brands, prohibited categories) can be auto-rejected by ML; human review reserved for borderline cases where context matters',
      'Commission reversal on returns vs no reversal vs waiting 30 days before paying commission — chose reversal within 30-day return window because immediate payment with reversal-on-return is fairer to creators than holding all commission for 30 days; creators use income for ongoing content production',
    ],
  },

  {
    id: 'returns-refunds',
    isNew: true,
    title: 'Returns and Refund Management System',
    subtitle: 'Amazon Returns / Zappos / Wayfair Furniture Returns',
    icon: 'truck',
    color: '#ef4444',
    difficulty: 'Medium',
    description: 'Design a returns management system that handles eligibility checking, label generation, return routing, item inspection, and intelligent restocking decisions to minimize cost and revenue leakage.',

    introduction: `Returns are the dark side of e-commerce economics. Online retailers face return rates of 20 to 30 percent overall, with fashion and electronics reaching 40 to 50 percent. Each return costs the retailer in reverse shipping, inspection labor, restocking or disposal, and lost selling opportunity. The customer experience during returns directly affects repurchase rates: Zappos built its brand on free returns with no questions asked, and customers rewarded it with lifetime loyalty. Getting returns right is not just cost containment — it is customer retention.

Return fraud is a multi-billion dollar problem. Wardrobing — buying expensive items to use for an occasion and returning them — is estimated to cost retailers $26 billion annually in the US alone. Serial returners exploit generous return policies by buying items knowing they will return most of them. Friendly fraud involves claiming an item was not received or not as described when the buyer actually received and kept it. Detecting these patterns without alienating legitimate customers requires ML models trained on behavioral signals that correlate with fraudulent intent.

The restocking decision is a complex optimization problem. A returned item is not automatically restockable as new. It must be physically inspected, photographed, and graded (new unopened, like-new opened, good, fair, poor). The graded item is then routed to the optimal channel: back to the prime shelf for resale as new, to a discounted clearance bin, to a refurbishing partner, to a liquidation auction, or to destruction for items that cannot be resold. Each routing decision has different economics and environmental implications, and the optimal choice depends on the item's category, condition, remaining useful life, and the cost of processing each channel.

Return routing in a multi-warehouse network is logistically complex. A customer in Seattle returns a product purchased from an Atlanta fulfillment center. Should the return go back to Atlanta, or to the nearest returns processing center in Seattle? The answer depends on which facility has capacity, whether the product is needed back in the Seattle region for fulfillment, and the relative cost of cross-country versus local return shipping. A returns management system must make these routing decisions automatically based on real-time capacity and inventory needs.`,

    functionalRequirements: [
      'Return eligibility check: verify item is within return window, matches return policy for that category and seller',
      'Return label generation: prepaid shipping label or QR code for carrier drop-off at nearest partner location',
      'Return routing: direct the return to the optimal processing center based on capacity, geography, and inventory need',
      'Item inspection workflow: grading interface for returns inspectors with photo capture and condition classification',
      'Restocking decision: route graded items to prime shelf, clearance, refurbish queue, liquidation, or destruction',
      'Refund processing: issue refund to original payment method, store credit, or exchange based on customer preference and policy',
      'Return fraud detection: flag high-risk return requests based on behavioral signals for enhanced review',
      'Seller chargeback: route defective item liability back to the manufacturer or seller per warranty terms',
    ],

    nonFunctionalRequirements: [
      'Return eligibility check responds within 200ms for inline display in customer account',
      'Refund processing initiates within 24 hours of item receipt at the returns center',
      'Return label generation completes within 2 seconds including carrier API call',
      'Fraud scoring for a return request completes within 500ms and does not block legitimate returns',
      'Restocking decisions processed within 4 hours of inspector completing the grading workflow',
    ],

    estimation: {
      users: '50M online shoppers, 500K returns per day, 100 returns processing centers',
      storage: 'Return records at 3KB × 50M/year = 150GB/year; inspection photos at 500KB each × 500K/day = 250GB/day; fraud signal history at 2KB × 50M users = 100GB',
      bandwidth: 'Return label PDF generation: 500K labels/day × 50KB = 25GB/day; inspection photo upload: 250GB/day from returns center devices',
      qps: '500K returns/day = ~6 initiations/sec; 500K label generations/day; 500K fraud score checks/day; 500K refund initiations/day',
    },

    apiDesign: {
      description: 'Return initiation, label generation, inspection workflow, and refund processing endpoints',
      endpoints: [
        { method: 'POST', path: '/api/returns/eligibility', params: '{ order_id, item_ids[], return_reason }', response: '{ eligible_items[{ item_id, eligible, policy, return_window_days_remaining }], ineligible_items[] }', description: 'Check which items in an order are eligible for return' },
        { method: 'POST', path: '/api/returns', params: '{ order_id, items[], return_reason, refund_preference, customer_id }', response: '{ return_id, label_url, qr_code, drop_off_locations[], expected_refund_date }', description: 'Initiate return and generate prepaid shipping label' },
        { method: 'POST', path: '/api/returns/{id}/inspect', params: '{ inspector_id, items[{ sku, condition, defects[], photo_urls[], restock_recommendation }] }', response: '{ inspection_id, restock_decisions[], refund_triggered: boolean }', description: 'Inspector records condition assessment and photos' },
        { method: 'GET', path: '/api/returns/{id}/status', params: '', response: '{ return_id, status, tracking_number, items_received_at?, refund_status, refund_amount_cents }', description: 'Customer-facing return status tracking' },
        { method: 'POST', path: '/api/returns/{id}/refund', params: '{ method: original_payment|store_credit|exchange, amount_cents? }', response: '{ refund_id, expected_processing_days }', description: 'Process refund after inspection confirms condition' },
      ],
    },

    dataModel: {
      description: 'Return lifecycle from initiation through inspection and refund',
      schema: `return_requests {
  id: uuid PK
  order_id: uuid FK
  customer_id: bigint FK
  status: enum(initiated, label_generated, in_transit, received, inspecting, completed, rejected)
  return_reason: varchar(100)
  fraud_score: int   -- 0-100, higher = higher fraud risk
  refund_preference: enum(original_payment, store_credit, exchange)
  label_carrier: varchar(20)
  label_tracking: varchar(50)
  initiated_at: timestamp
  received_at: timestamp nullable
  completed_at: timestamp nullable
}

return_items {
  id: bigint PK
  return_id: uuid FK
  order_item_id: bigint FK
  sku: varchar(50)
  quantity: int
  condition_grade: enum(new, like_new, good, fair, poor) nullable
  defects: jsonb nullable
  photo_urls: jsonb nullable
  restock_decision: enum(prime, clearance, refurbish, liquidation, destroy) nullable
  inspector_id: bigint nullable FK
  inspected_at: timestamp nullable
}

refunds {
  id: uuid PK
  return_id: uuid FK
  customer_id: bigint FK
  amount_cents: int
  method: enum(original_payment, store_credit, exchange)
  status: enum(pending, processing, completed, failed)
  processor_refund_id: varchar(100) nullable
  initiated_at: timestamp
  completed_at: timestamp nullable
}

fraud_signals {
  customer_id: bigint PK
  total_orders: int
  total_returns: int
  return_rate: decimal(5,4)   -- returns / orders
  recent_wardrobing_flags: int
  account_age_days: int
  high_value_return_count: int
  fraud_risk_tier: enum(low, medium, high, blocked)
  last_updated: timestamp
}`,
      examples: [
        { table: 'return_requests', label: 'Return in transit to processing center', json: '{ "id": "ret-cc33dd44", "order_id": "ord-aa11bb22", "customer_id": 550100, "status": "in_transit", "return_reason": "changed_mind", "fraud_score": 12, "refund_preference": "original_payment", "label_carrier": "UPS", "label_tracking": "1Z999AA10123456784", "initiated_at": "2025-06-01T10:00:00Z", "received_at": null }' },
        { table: 'return_items', label: 'Inspected item graded as like_new routed to prime shelf', json: '{ "id": 780012, "return_id": "ret-cc33dd44", "sku": "WIDGET-XL-BLUE", "quantity": 1, "condition_grade": "like_new", "defects": [], "restock_decision": "prime", "inspector_id": 3301, "inspected_at": "2025-06-03T14:22:00Z" }' },
        { table: 'fraud_signals', label: 'High-risk customer with elevated return rate', json: '{ "customer_id": 990112, "total_orders": 45, "total_returns": 28, "return_rate": 0.622, "recent_wardrobing_flags": 3, "account_age_days": 180, "high_value_return_count": 5, "fraud_risk_tier": "high", "last_updated": "2025-06-01T00:00:00Z" }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A customer service team manually processes return requests via email. Return labels are generated on request by logging into the carrier website. Inspectors fill out paper grading forms. Refunds are processed manually after inspection is complete.',
      problems: [
        'Manual processing cannot scale beyond 500 returns per day per customer service agent',
        'No fraud detection: customers with 100 percent return rates receive the same service as loyal buyers',
        'Inspection results recorded on paper cannot be queried for analytics or fed into restocking automation',
        'Refund processing takes 5 to 7 days because it requires manual finance team intervention',
        'No return routing intelligence: all returns go back to the original fulfillment center regardless of capacity or geographic efficiency',
        'No restocking decision support: inspectors make ad hoc decisions without data on resale value or channel economics',
      ],
    },

    advancedImplementation: {
      title: 'Automated Return Pipeline with ML Fraud Detection and Restocking Optimization',
      description: 'Return initiation is fully self-service in the customer account. Fraud scoring runs at initiation time using a gradient boosting model trained on return rate, order history, timing signals, and prior fraud flags. High-risk returns receive enhanced scrutiny (photo proof required before refund, delayed refund pending inspection). Return routing uses a cost-minimization algorithm that assigns returns to the lowest-cost eligible processing center. Inspector grading uses a structured tablet workflow with photo capture that feeds directly into restocking decisions. Refund triggering is automated based on inspection outcome and return reason.',
      keyPoints: [
        'Fraud scoring runs inline at return initiation: gradient boosting model uses return_rate, account_age, high_value_return_count, item_category_risk, and return_reason encoding; score determines policy tier (instant refund vs inspect first vs manual review)',
        'Return routing minimizes cost_of_shipping_to_center[customer_zip][center_id] + capacity_penalty[center_id] across eligible centers, evaluated in parallel at return initiation',
        'Inspector grading workflow on tablet: photograph item → select condition from structured taxonomy → check defect checklist → system auto-suggests restock channel based on condition grade and item category rules; inspector confirms or overrides',
        'Restocking channel decision matrix: grade=new → prime shelf; grade=like_new, high_value → prime shelf; grade=like_new, low_value → clearance; grade=good → refurbish queue; grade=fair → liquidation partner; grade=poor or contaminated → destruction, logged for vendor chargeback if defective',
        'Refund automation triggers based on inspection outcome: condition better than expected → issue refund immediately; condition as expected → issue refund; condition significantly worse (damaged beyond stated reason) → partial refund with exception handling; no item received (empty box) → fraud investigation queue',
        'Wardrobing detection: compare product listing photos with inspector photos; if item shows signs of use inconsistent with "never used" claim and customer has prior wardrobing flags → deny refund, trigger manual review with photographic evidence',
        'Vendor chargeback pipeline: items inspected as defective straight out of the box trigger automated vendor chargeback request with inspector photos and grading as evidence; tracked per vendor for quarterly supplier quality reviews',
      ],
      databaseChoice: 'PostgreSQL for return_requests, return_items, refunds, and fraud_signals; Redis for fraud signal cache per customer (updated on each return event); S3 for inspection photos; Kafka for return events feeding fraud model update pipeline; ClickHouse for return analytics by category, reason, and channel economics',
      caching: 'Return policy rules cached in application memory per category (change quarterly); fraud signal profile cached in Redis per customer_id with 1-hour TTL; return routing cost matrix cached in application memory with hourly refresh for capacity updates; carrier label generation results cached for 24 hours to avoid re-generating labels on page reload',
    },

    tips: [
      'Return fraud is a surprisingly rich topic that shows business understanding — wardrobing, serial returners, and empty-box fraud each require different detection approaches.',
      'The restocking decision matrix is a good product design exercise: explain the economics of each channel (prime shelf vs clearance vs liquidation) and why the decision depends on both condition grade and item value.',
      'Refund timing is a customer experience lever that shows product thinking: Amazon refunds immediately on scan at the UPS drop-off, before inspection; this reduces refund anxiety at the cost of occasional fraud exposure.',
      'Return routing across a fulfillment center network is a simplified version of the last-mile delivery routing problem — reuse the same cost minimization framing.',
      'Mentioning environmental and sustainability dimensions (destruction as last resort, measuring liquidation diversion rate) shows awareness of real business concerns beyond pure economics.',
      'Vendor chargebacks for defective items demonstrate understanding of multi-party supply chain accountability.',
    ],

    keyQuestions: [
      {
        question: 'How do you detect wardrobing without blocking legitimate returns from good customers?',
        answer: `**Wardrobing definition:** Customer buys an expensive dress for a wedding, wears it, then returns it claiming "never worn / changed my mind." Retailer receives a worn item, cannot resell it as new, takes a loss.

**Detection signals (combined into a fraud score):**

**Account-level signals (precomputed, updated after each return):**
\`\`\`
return_rate = returns / orders  // > 50% is a red flag
high_value_return_count          // returns of items > $100
recent_wardrobing_flags          // prior confirmed wardrobing incidents
category_concentration           // returns concentrated in fashion/luxury vs random
\`\`\`

**Transaction-level signals (checked at initiation time):**
\`\`\`
time_since_purchase_days    // clothing returned after 25-29 days (near limit) is suspicious
weekend/holiday gap         // bought Friday before prom weekend, returned Monday
repeat_pattern              // bought same item 3 times in 12 months, returned each time
\`\`\`

**Physical inspection signals (checked at returns center):**
\`\`\`
deodorant stains, makeup residue, pulled threads, stretched fabric
smell from perfume or cigarette smoke (harder to automate)
tags removed and replaced (look for tag re-attachment marks)
\`\`\`

**Policy response by risk tier:**
\`\`\`
Low risk (score 0-30):   Instant refund on drop-off scan, inspect afterward
Medium risk (score 30-60): Refund issued after inspection (3-5 day delay)
High risk (score 60-85):  Photo proof of condition required before label generated
Blocked (score 85+):      Return denied or limited to store credit; human review required
\`\`\`

**Why not block all high-rate returners?**
A customer who returns 40% of purchases but is always legitimate (size issues, color looks different in person) is still a valuable customer. Blocking them alienates good buyers. The system blocks based on *type* of return (luxury items, near-policy-limit timing) and *physical evidence* (inspector confirms wear) not just return rate.`,
      },
      {
        question: 'How do you decide whether to restock, refurbish, or liquidate a returned item?',
        answer: `**The decision matrix depends on condition grade × item economics:**

**Condition grades from inspector:**
- New: Unopened box, original packaging intact
- Like-new: Opened but unused, all components present
- Good: Used but no visible damage, all components present
- Fair: Visible wear, minor damage, usable
- Poor: Significant damage, missing components, borderline unusable

**Channel economics (example values):**
\`\`\`
Channel         | Recovery %  | Cost     | Time
Prime shelf     | 100% MSRP   | ~$2 labor| 1 day
Clearance bin   | 40-60% MSRP | ~$2      | 1-4 weeks
Refurbish       | 60-80% MSRP | $10-50   | 2-4 weeks
Liquidation     | 10-30% MSRP | $1-5     | 1 week
Destroy         | 0%          | $1-3     | Same day
\`\`\`

**Decision rules by grade and category:**
\`\`\`
New + any category → Prime shelf (resell as new with original packaging)

Like-new + item_value > $50 → Prime shelf (repackage, resell as "open box new")
Like-new + item_value < $50 → Clearance (repackaging cost exceeds price premium)

Good + electronics → Refurbish (test, recertify, sell as "Certified Refurbished" at 70% price)
Good + apparel → Clearance (steaming + retagging cost justifiable for high-value items)
Good + FMCG (consumables) → Destroy (hygiene/safety regulations prohibit resale)

Fair + item_value > $100 → Liquidation (still recovers meaningful value)
Fair + item_value < $100 → Destroy (cost of processing exceeds liquidation value)

Poor + any category → Destroy or Parts salvage
\`\`\`

**Automated recommendation engine:**
Inspector selects condition grade and defect codes. System looks up: \`recommended_channel = RULES[condition_grade][item_category][value_band]\`
Inspector confirms or overrides. Override logged for model improvement.

**Why this matters for the interview:**
The restocking decision affects: (1) recovery rate per returned item, (2) labor cost per item, (3) customer trust (refurbished item sold as new → disaster), and (4) sustainability metrics (destruction rate). A good system optimizes all four simultaneously.`,
      },
    ],

    keyDecisions: [
      'Instant refund on drop-off scan vs refund after inspection — chose instant refund for low-risk customers because refund anxiety is the top complaint in returns UX and the fraud exposure from the small percentage of bad actors is less than the loyalty value of the majority of good customers who would return faster due to refund speed',
      'Centralized returns processing centers vs returns to original fulfillment center — chose centralized returns centers because dedicated returns processing achieves higher throughput (specialized labor and equipment), and inventory can be redistributed regionally after inspection',
      'Photo-based wardrobing detection vs rule-based pattern detection only — chose both because rule-based patterns catch high-rate returners at low compute cost while photo comparison catches individual incidents that a first-time offender would pass through rules-based detection',
      'Immediate fraud scoring vs manual review queue for all returns — chose immediate automated scoring with tier-based policy because manual review at 500K returns per day requires thousands of reviewers; automation handles 90 percent of cases correctly, with manual review reserved for high-value or borderline cases',
      'Full refund for all eligible returns vs condition-based refund — chose condition-based (full refund if condition matches stated reason; partial refund if significantly worse) because it deters fraudulent condition claims and allocates the loss to the party responsible for the damage',
    ],
  },

  {
    id: 'b2b-ecommerce',
    isNew: true,
    title: 'B2B E-commerce Platform',
    subtitle: 'Amazon Business / Alibaba / Grainger',
    icon: 'layers',
    color: '#6366f1',
    difficulty: 'Hard',
    description: 'Design a B2B e-commerce platform that supports account hierarchies, contract pricing, purchase order workflows, and net payment terms for enterprise customers.',

    introduction: `B2B e-commerce is fundamentally different from B2C despite sharing a checkout cart UI. A consumer buying a $50 product makes the decision alone, pays instantly with a credit card, and expects instant gratification. A business buying $50,000 in office supplies involves multiple approvers, requires a formal purchase order, invoices net-30 to the company's accounts payable system, and may have negotiated contract pricing that differs from the public catalog price. Building an e-commerce platform for this buying model requires systems that B2C platforms never needed: account hierarchies, approval workflows, EDI integration, credit limit management, and contract pricing engines.

Contract pricing is the revenue-critical complexity layer. An enterprise customer like a hospital system may negotiate pricing for 10,000 medical supply SKUs at custom rates that differ from both the public list price and standard volume discounts. These contracts are bilateral agreements between the supplier and the customer, negotiated offline and then implemented in the platform. A single enterprise may have hundreds of contracts across different suppliers, and a single supplier may have contracts with thousands of enterprise accounts. The pricing engine must resolve the applicable contract price for any customer-SKU combination in under 100 milliseconds on the product page.

Purchase order workflows introduce state machines with multiple human decision points. A buyer selects $15,000 in products and submits a requisition. The requisition routes to a manager for approval if it exceeds the buyer's spending limit. The manager approves, converting the requisition to a purchase order with a PO number. The PO is transmitted to the supplier (often via EDI, an electronic messaging standard used by legacy ERP systems). The supplier ships against the PO, generates a packing list, and invoices against the PO number. Accounts payable matches the invoice against the PO and the receipt to release payment — a process called three-way match that prevents duplicate or fraudulent payments.

EDI (Electronic Data Interchange) is the integration language of B2B commerce. Enterprise buyers and suppliers exchange business documents — purchase orders (EDI 850), order acknowledgments (EDI 855), ship notices (EDI 856), invoices (EDI 810) — in a structured electronic format that feeds directly into ERP systems without human intervention. EDI was designed in the 1970s and is still mandatory for Walmart suppliers, most automotive manufacturers, and major healthcare networks. A B2B platform targeting enterprise buyers must speak EDI or offer equivalent API integration.`,

    functionalRequirements: [
      'Account hierarchy: company account with multiple buyer users, each with assigned spending limits and approval thresholds',
      'Contract pricing: customer-specific prices for negotiated SKUs overriding public list prices',
      'Purchase order workflow: requisition creation, manager approval routing, PO number generation, and supplier transmission',
      'Net payment terms: invoice generation and accounts payable integration with Net 30 / Net 60 payment schedules',
      'Multi-location shipping: single order can ship to multiple office or facility addresses',
      'Tax exemption management: upload and validate tax exemption certificates per buyer and jurisdiction',
      'EDI integration: receive and send standard EDI transaction sets for purchase orders, acknowledgments, ship notices, and invoices',
      'Spend analytics: company-wide purchasing dashboard showing spend by category, supplier, and cost center',
    ],

    nonFunctionalRequirements: [
      'Contract price resolution per SKU responds within 100ms for product page rendering',
      'PO approval workflow routes to the correct approver within 30 seconds of submission',
      'EDI transactions processed and acknowledged within 5 minutes of receipt',
      'Credit limit checks at order submission complete within 500ms',
      'Spend analytics data available within 4 hours of any transaction',
    ],

    estimation: {
      users: '500K enterprise accounts, 10M buyer users, 1M orders per day, 100M contract price lookups per day',
      storage: 'Contract pricing rules: 10M enterprise accounts × avg 1K contracted SKUs × 200 bytes = 2TB; PO records at 5KB × 1M/day = 5GB/day; EDI transaction logs at 10KB × 5M/day = 50GB/day',
      bandwidth: 'Contract price API calls: 100M/day × 200 bytes response = 20GB/day; EDI file exchange: 5M documents/day × 10KB = 50GB/day',
      qps: '1M orders/day = ~12 orders/sec; 100M contract price lookups/day = ~1.2K QPS; EDI processing at 5M documents/day = ~60/sec',
    },

    apiDesign: {
      description: 'Account management, contract pricing, PO workflow, and EDI endpoints',
      endpoints: [
        { method: 'GET', path: '/api/pricing/resolve', params: 'account_id, sku, quantity', response: '{ list_price_cents, contract_price_cents, contract_id, discount_pct, tax_exempt }', description: 'Resolve the applicable contract price for an account-SKU combination' },
        { method: 'POST', path: '/api/requisitions', params: '{ buyer_id, account_id, items[], ship_to_locations[], po_number_hint?, cost_center? }', response: '{ requisition_id, requires_approval, approver_id?, approval_threshold_exceeded_by_cents }', description: 'Create a purchase requisition that may route to approval' },
        { method: 'POST', path: '/api/requisitions/{id}/approve', params: '{ approver_id, approved: boolean, notes? }', response: '{ po_id?, po_number?, next_approver_id?, status }', description: 'Approve or reject a requisition, routing to next approver if multi-level' },
        { method: 'GET', path: '/api/accounts/{id}/credit', params: '', response: '{ credit_limit_cents, available_credit_cents, outstanding_invoices_cents, oldest_open_invoice_days }', description: 'Check current credit utilization before order submission' },
        { method: 'POST', path: '/api/edi/inbound', params: '{ trading_partner_id, transaction_set: 850|856|810, edi_content }', response: '{ transaction_id, acknowledgment_edi_997 }', description: 'Receive and process inbound EDI document from trading partner' },
      ],
    },

    dataModel: {
      description: 'Account hierarchy, contract pricing, purchase order lifecycle, and invoice tracking',
      schema: `company_accounts {
  id: bigint PK
  name: varchar(300)
  tax_id: varchar(50)
  credit_limit_cents: bigint
  outstanding_balance_cents: bigint
  payment_terms: enum(net_30, net_60, net_90, prepay)
  account_manager_id: bigint nullable FK
  status: enum(active, credit_hold, suspended)
  created_at: timestamp
}

buyer_users {
  id: bigint PK
  account_id: bigint FK
  email: varchar(255) UNIQUE
  name: varchar(200)
  spend_limit_per_order_cents: int nullable  -- null = unlimited
  cost_center: varchar(50) nullable
  manager_id: bigint nullable FK
  role: enum(buyer, approver, admin)
}

contract_prices {
  id: bigint PK
  account_id: bigint FK
  sku: varchar(50)
  contract_id: varchar(50)   -- references offline contract document
  price_cents: int
  valid_from: date
  valid_to: date nullable
  minimum_quantity: int DEFAULT 1
  INDEX (account_id, sku)  -- hot lookup path
}

purchase_orders {
  id: uuid PK
  account_id: bigint FK
  created_by_buyer_id: bigint FK
  po_number: varchar(50) UNIQUE
  status: enum(draft, pending_approval, approved, submitted_to_supplier, partially_received, fully_received, invoiced, paid, cancelled)
  total_cents: bigint
  payment_terms: enum(net_30, net_60, net_90)
  submitted_at: timestamp nullable
  approved_at: timestamp nullable
}

po_approval_steps {
  id: bigint PK
  po_id: uuid FK
  step_number: int
  approver_id: bigint FK
  required_above_cents: bigint
  status: enum(pending, approved, rejected)
  acted_at: timestamp nullable
  notes: text nullable
}

invoices {
  id: uuid PK
  po_id: uuid FK
  account_id: bigint FK
  invoice_number: varchar(50) UNIQUE
  amount_cents: bigint
  due_date: date
  status: enum(open, paid, overdue, disputed)
  issued_at: timestamp
  paid_at: timestamp nullable
}`,
      examples: [
        { table: 'contract_prices', label: 'Custom price for enterprise customer on specific SKU', json: '{ "id": 4400112, "account_id": 77001, "sku": "PAPER-A4-BOX", "contract_id": "CONTRACT-ENT-2025-077001", "price_cents": 2850, "valid_from": "2025-01-01", "valid_to": "2025-12-31", "minimum_quantity": 10 }' },
        { table: 'purchase_orders', label: 'PO awaiting second-level approval', json: '{ "id": "po-aa11bb22", "account_id": 77001, "created_by_buyer_id": 5500112, "po_number": "PO-2025-00441", "status": "pending_approval", "total_cents": 1850000, "payment_terms": "net_30", "submitted_at": "2025-06-01T10:00:00Z", "approved_at": null }' },
        { table: 'invoices', label: 'Open invoice due in 20 days', json: '{ "id": "inv-cc33dd44", "po_id": "po-aa11bb22", "account_id": 77001, "invoice_number": "INV-2025-008801", "amount_cents": 1850000, "due_date": "2025-07-01", "status": "open", "issued_at": "2025-06-01T00:00:00Z", "paid_at": null }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A single pricing table stores public list prices. All users on an account share the same login. Purchase orders are submitted via email with a PDF attachment. Invoices are tracked in a spreadsheet by the accounts receivable team.',
      problems: [
        'No contract pricing engine: all B2B customers pay public list prices, making the platform uncompetitive for enterprise buyers who expect negotiated rates',
        'No account hierarchy: all users at a company share one account with no individual spend limits or approval workflows',
        'Email-based PO submission cannot be automated or integrated with buyer ERP systems',
        'No credit limit management: large buyers can accumulate unpaid invoices beyond their creditworthiness',
        'Manual invoice tracking in spreadsheets cannot scale and creates reconciliation errors between invoices and POs',
        'No EDI capability means major enterprise buyers (Walmart, hospitals, automakers) cannot use the platform at all',
      ],
    },

    advancedImplementation: {
      title: 'Contract Pricing Engine with EDI Integration and Multi-Level Approval Workflows',
      description: 'Contract pricing is resolved via a tiered lookup: exact account-SKU match first, then account-category match, then volume-tier discount, then public price. Contract prices are cached in Redis per account for the session. The approval workflow is a configurable state machine: each company sets spend thresholds per approver level, and the system routes requisitions to the correct approver based on amount. EDI integration uses an X12 EDI parser library to convert inbound documents (EDI 850 purchase orders) to internal data models and generate outbound documents (EDI 997 acknowledgments, EDI 856 ship notices).',
      keyPoints: [
        'Contract price resolution in Redis: at session start, pre-fetch the account\'s contracted SKU prices into a Redis hash; product page price lookup is a Redis HGET hit at under 1ms, not a database join',
        'Approval workflow defined as a company-level configuration: threshold_1_cents (buyer limit), threshold_2_cents (manager limit), threshold_3_cents (VP limit); any PO exceeding a threshold must be approved by the corresponding role before proceeding',
        'Three-way match at invoice payment: invoice matched against the PO (item quantities and prices align) and against the receiving record (items were actually received) before payment released; discrepancies routed to dispute workflow',
        'Credit limit enforcement at order submission: check available_credit = credit_limit - outstanding_balance; if PO total exceeds available credit, order blocked with credit hold message and account manager notification',
        'EDI transaction processing pipeline: receive EDI file → parse X12 transaction set → validate mandatory elements → transform to internal data model → process business logic → generate acknowledgment EDI 997 → return; processing within 5 minutes of receipt',
        'Multi-location shipping: single PO can have line items with different ship_to locations; each location generates a separate shipment and potentially separate freight charge; consolidated invoice covers all locations',
        'Rebate program tracking: accumulate spend per account per period; at period end, calculate rebate tier achieved and issue rebate credit to account balance; displayed to buyer as YTD spend progress toward next rebate tier',
      ],
      databaseChoice: 'PostgreSQL for all transactional data (account hierarchy, POs, invoices, contract prices) with strict ACID for financial accuracy; Redis for contract price cache per active account (pre-fetched at session start, TTL of 24 hours); Kafka for EDI event streaming and approval workflow notifications; ClickHouse for spend analytics by account, category, and period',
      caching: 'Contract prices for active account cached in Redis at session start (reduces hot database load from 1.2K contract price QPS to near zero); approval workflow configuration cached per company in application memory (changes infrequently); tax exemption certificate validity cached in Redis per account-jurisdiction pair; shipping rates and freight zones cached in application memory',
    },

    tips: [
      'EDI is the most B2B-specific concept and the one most interviewers will not know — explain what it is briefly and why it matters before describing how to support it.',
      'The three-way match at invoice payment is a real accounts payable process that shows domain knowledge of enterprise procurement workflows.',
      'Contract pricing complexity is the core B2B differentiator from B2C — spend time on the tiered resolution (account-SKU → account-category → volume → list) and the Redis caching strategy.',
      'Credit limit management is a financial risk control unique to B2B — explain how outstanding_balance is maintained and why orders block on credit hold.',
      'The approval workflow state machine is a good design question: how do you handle multi-level approvals, out-of-office approvers, approval delegation, and PO modifications after approval?',
      'Mention the buyer experience considerations: enterprise buyers expect catalog punch-out integration (buyer shops on a company intranet connected to the supplier catalog) and punchout is an EDI-adjacent protocol worth naming.',
    ],

    keyQuestions: [
      {
        question: 'How do you implement a purchasing approval workflow with configurable spending limits per buyer?',
        answer: `**The business requirement:** Company policy says:
- Any buyer can submit up to $5,000 without approval
- Orders $5,001 - $25,000 need manager approval
- Orders $25,001 - $100,000 need VP approval
- Orders above $100,000 need CFO approval

These thresholds are configurable per company.

**Data model:**
\`\`\`sql
-- Company approval policy (configurable by account admin)
approval_policies {
  account_id:     bigint
  level:          int (1, 2, 3, 4)
  min_amount:     bigint
  max_amount:     bigint nullable  -- null = unlimited
  approver_role:  varchar(50)  -- 'manager', 'vp', 'cfo'
}

-- Per-PO approval tracking
po_approval_steps {
  po_id:         uuid
  step_number:   int
  approver_id:   bigint
  required_above:bigint
  status:        enum(pending, approved, rejected)
}
\`\`\`

**Workflow on PO submission:**
\`\`\`python
def route_po_for_approval(po, buyer):
    applicable_levels = [
        level for level in account.approval_policy
        if po.total > level.min_amount
    ]

    if not applicable_levels:
        # Below lowest threshold → auto-approve
        po.status = 'approved'
        submit_to_supplier(po)
        return

    # Create approval steps for all required levels
    for i, level in enumerate(sorted(applicable_levels, key=lambda x: x.level)):
        approver = find_approver(buyer, level.approver_role)
        create_approval_step(po, step=i+1, approver=approver, threshold=level.min_amount)

    # Activate first step, notify first approver
    activate_step(po, step=1)
    notify_approver(po.approval_steps[0].approver_id)
\`\`\`

**State machine transitions:**
\`\`\`
DRAFT → PENDING_APPROVAL (on submit)
PENDING_APPROVAL → PENDING_APPROVAL (on step N approved, step N+1 activated)
PENDING_APPROVAL → APPROVED (on final step approved)
PENDING_APPROVAL → REJECTED (on any step rejected)
APPROVED → SUBMITTED_TO_SUPPLIER (on EDI transmission success)
\`\`\`

**Edge cases to handle:**
- Approver is out of office → delegate to backup approver
- Approver is the buyer themselves (conflict of interest) → escalate to approver's manager
- PO modified after partial approval → restart approval from step 1 (amount may have changed)
- Approver account is deactivated → route to account admin for assignment`,
      },
      {
        question: 'How does EDI work and why do enterprise B2B customers require it?',
        answer: `**What is EDI?** Electronic Data Interchange is a set of standard electronic formats for exchanging business documents between companies. Think of it as a structured API from the 1970s that is still widely used because it is deeply embedded in enterprise ERP systems.

**Why companies require EDI:**
- Their ERP system (SAP, Oracle) sends and receives purchase orders in EDI format automatically
- If you do not support EDI, a human must re-enter the order data manually into the ERP → expensive and error-prone
- Walmart requires EDI compliance from all suppliers; refusing means you cannot sell at Walmart
- Healthcare, automotive, and retail industries have EDI as a contractual requirement

**Key EDI transaction sets:**
\`\`\`
EDI 850 — Purchase Order
  Buyer sends to supplier: "I want to buy 100 units of SKU-1234 at $9.99 each,
  ship to address XYZ by June 15, PO# 2025-00441"

EDI 997 — Functional Acknowledgment
  Supplier replies: "I received your EDI 850, it was syntactically valid"

EDI 855 — Purchase Order Acknowledgment
  Supplier replies: "I accept/reject/modify your order"
  (can change quantities or promise dates)

EDI 856 — Advance Ship Notice (ASN)
  Supplier sends before shipment: "I am shipping this order, here is the tracking,
  here is the packing list (which carton contains which items)"

EDI 810 — Invoice
  Supplier bills buyer: "Here is your invoice for PO# 2025-00441"
\`\`\`

**Technical implementation:**
\`\`\`
Inbound EDI 850 (received from buyer):
1. File arrives via AS2 (secure HTTPS-based EDI transport) or SFTP
2. Parse X12 EDI format into structured segments (ISA, GS, ST, BEG, PO1, CTT, SE)
3. Extract: PO number, buyer ID, line items (SKU, quantity, price), ship-to
4. Validate: are all mandatory elements present? Is trading partner authorized?
5. Transform to internal PO data model
6. Create PO in database, trigger fulfillment workflow
7. Generate EDI 997 acknowledgment, send back to buyer within 5 minutes

Outbound EDI 810 (invoice to buyer):
1. PO shipped and confirmed delivered
2. Generate invoice from PO line items and contracted prices
3. Build EDI 810 transaction: trading partner IDs, invoice number, PO reference, line items
4. Envelop in ISA/GS/ST/SE structure with control numbers
5. Transmit via AS2 to buyer's EDI system
6. Buyer's ERP auto-matches invoice to PO → triggers payment on due date
\`\`\`

**B2B platform integration choice:**
Most companies use a middleware EDI provider (SPS Commerce, TrueCommerce, DiCentral) rather than building an EDI stack from scratch. The provider handles AS2 transport, trading partner management, and transaction translation, exposing a clean API or webhook interface to the platform.`,
      },
    ],

    keyDecisions: [
      'Contract price cached in Redis per active account vs resolved per request from database — chose Redis pre-fetch at session start because 1.2K QPS of contract price lookups at millisecond latency requires in-memory access; database join across 10M contract records per lookup is too slow at this volume',
      'Internal approval workflow engine vs third-party workflow tool — chose internal for core approval routing because approval state is tightly coupled to order financial status and credit limit checks; third-party tools add integration latency to a synchronous checkout flow',
      'Three-way match enforced by platform vs enforced by buyer ERP — chose platform enforcement because the platform is the source of truth for PO and receipt data; relying on the buyer\'s ERP to enforce matching means the platform has no visibility into payment disputes',
      'EDI via middleware provider vs built in-house — chose middleware provider for initial implementation because EDI specification is large (hundreds of transaction sets) and trading partner onboarding (AS2 certificates, ISA IDs) is operationally complex; build in-house only if EDI volume and customization requirements justify the investment',
      'Net payment terms credit limit enforced at order time vs at invoice due date — chose enforcement at order time because a customer who has already received goods and then hits their credit limit cannot be compelled to pay; blocking new orders when credit is exhausted is the only effective lever before goods ship',
    ],
  },

  {
    id: 'supply-chain-tracking',
    isNew: true,
    title: 'Supply Chain Visibility and Tracking System',
    subtitle: 'Flexport / project44 / Amazon Supply Chain',
    icon: 'globe',
    color: '#10b981',
    difficulty: 'Hard',
    description: 'Design a supply chain visibility platform that aggregates tracking events from hundreds of carriers and ports, predicts shipment ETAs, and alerts on exceptions across multi-modal international freight.',

    introduction: `A product sitting on a retail shelf traveled through a supply chain that spans continents, modes of transportation, regulatory checkpoints, and dozens of distinct parties. The smartphone in your pocket may have started as raw materials in Africa, was processed in South Korea, assembled in China, shipped in a container across the Pacific, cleared US customs, trucked to a distribution center in Memphis, and then delivered to your local store. At any point in that journey, a delay, damage, or regulatory hold can cause a cascade of problems for every party downstream.

Supply chain visibility means knowing where every shipment is at every moment in this global chain. The core challenge is data aggregation from an extraordinarily fragmented ecosystem. There are 400+ ocean carriers, 1,000+ airlines, and 10,000+ trucking companies, each with different data formats, update frequencies, and API quality levels. Some large carriers (Maersk, FedEx) have sophisticated APIs with real-time tracking. Mid-tier carriers send EDI 214 status updates that arrive hours after events. Small regional carriers send weekly Excel files. The visibility platform must normalize all of these into a consistent event timeline without hallucinating data points that did not actually occur.

ETA prediction is where ML creates the most business value. A container ship is nominally due to arrive in Los Angeles on June 15. But port congestion, equipment unavailability, weather, and customs delays mean the actual arrival date could be days or weeks later. An ML model trained on historical shipment data can predict the expected arrival date more accurately than the carrier's published schedule by incorporating real-time signals: current queue at the destination port, vessel speed from AIS (automatic identification system) transponders, weather forecast on the route, and the specific carrier's historical on-time performance for similar routes and seasons. A 3-day improvement in ETA accuracy translates directly into better inventory planning and reduced safety stock for the buyer.

Exceptions management is the workflow layer on top of visibility. Knowing a shipment is delayed is only valuable if the right person knows in time to take action. A warehouse manager needs to know 5 days before a shipment arrives late so they can reschedule inbound labor. A procurement team needs to know 2 weeks before a critical component arrives late so they can expedite an alternative supplier. The visibility platform must match exceptions (predicted late, customs hold, damage claim) to the stakeholders who can act on them, route notifications through the right channels, and track whether the exception was acknowledged and resolved.`,

    functionalRequirements: [
      'Aggregate tracking events from 400+ carriers via API, EDI, email parsing, and AIS vessel tracking',
      'Normalize heterogeneous event data into a unified shipment timeline with standardized status codes',
      'Predict shipment ETA using ML incorporating port congestion, vessel position, carrier performance, and weather',
      'Exception detection and alerting: automatically identify shipments at risk and route alerts to relevant stakeholders',
      'Supply chain graph: model the full multi-party chain from purchase order through manufacturer, freight forwarder, carrier, customs, and warehouse',
      'Document management: store and retrieve bill of lading, commercial invoice, packing list, and customs declarations',
      'Carbon footprint calculation per shipment leg with mode-specific emission factors',
      'Multi-party access control: each participant sees only their relevant slice of the supply chain',
    ],

    nonFunctionalRequirements: [
      'Tracking event processing latency under 30 seconds from carrier event to visibility platform update',
      'ETA prediction serves results within 500ms for any active shipment',
      'System ingests 100M tracking events per day from carrier data sources',
      'Exception alerts delivered within 5 minutes of exception detection',
      'Document retrieval for any shipment in under 2 seconds including large PDF files',
    ],

    estimation: {
      users: '50K shippers and 3PLs, tracking 10M active shipments, 100M tracking events per day',
      storage: 'Shipment records at 10KB each × 100M/year = 1TB/year; tracking events at 500 bytes × 100M/day = 50GB/day; documents at 500KB average × 5 docs × 10M shipments = 25TB',
      bandwidth: 'Carrier API polling and webhook ingestion: 100M events/day × 500 bytes = 50GB/day; document downloads: 50K users × 10 docs/day × 500KB = 250GB/day',
      qps: '100M events/day = ~1.2K ingestion events/sec; ETA prediction queries at 10M shipments × 2 refreshes/day = ~230 QPS; exception alert evaluation at 1M threshold checks/day = ~12/sec',
    },

    apiDesign: {
      description: 'Shipment tracking, ETA prediction, exception management, and document endpoints',
      endpoints: [
        { method: 'POST', path: '/api/shipments', params: '{ po_number, shipper_id, carrier_id, origin, destination, commodity, pieces, weight_kg, expected_departure }', response: '{ shipment_id, tracking_number, assigned_carrier_contact }', description: 'Register a new shipment to begin tracking' },
        { method: 'GET', path: '/api/shipments/{id}/timeline', params: '', response: '{ shipment, events[{ timestamp, location, status, carrier_code, source }], current_status, predicted_eta, eta_confidence }', description: 'Full event timeline with normalized statuses and ETA prediction' },
        { method: 'GET', path: '/api/shipments/{id}/eta', params: '', response: '{ predicted_eta, prediction_range, confidence_score, risk_factors[{ factor, impact_days }] }', description: 'ETA prediction with risk factor decomposition' },
        { method: 'GET', path: '/api/exceptions', params: 'severity, status, shipper_id, date_from', response: '{ exceptions[{ shipment_id, type, severity, detected_at, estimated_delay_days, assigned_to }] }', description: 'Active exception queue for operations team' },
        { method: 'POST', path: '/api/webhooks/carrier-events', params: '{ carrier_id, events[{ tracking_number, timestamp, location, status_code, raw_payload }] }', response: '{ accepted, processed_count, failed_ids[] }', description: 'Inbound webhook from carrier or EDI translator for batch event delivery' },
      ],
    },

    dataModel: {
      description: 'Shipment lifecycle, carrier events, ETA predictions, and exception tracking',
      schema: `shipments {
  id: uuid PK
  shipper_id: bigint FK
  purchase_order_id: varchar(50) nullable
  carrier_id: int FK
  tracking_number: varchar(50)
  origin_locode: varchar(5)   -- UN/LOCODE: USNYC, CNSHA, etc.
  destination_locode: varchar(5)
  commodity_code: varchar(10)  -- HS code
  weight_kg: decimal(10,2)
  pieces: int
  current_status: varchar(50)
  current_location: varchar(100) nullable
  expected_departure: date
  original_eta: date
  predicted_eta: date nullable
  actual_arrival: date nullable
  created_at: timestamp
}

tracking_events {
  id: bigint PK
  shipment_id: uuid FK
  carrier_id: int FK
  event_timestamp: timestamp
  event_status: varchar(50)         -- normalized internal code
  raw_status_code: varchar(50)      -- carrier's own code
  location_locode: varchar(5) nullable
  location_name: varchar(200)
  data_source: enum(api, edi_214, email_parse, ais, manual)
  ingested_at: timestamp
  -- Append-only
}

eta_predictions {
  id: bigint PK
  shipment_id: uuid FK
  predicted_at: timestamp
  predicted_eta: date
  confidence_score: decimal(4,3)  -- 0-1
  model_version: varchar(20)
  risk_factors: jsonb   -- [{ factor: "port_congestion", impact_days: 3 }]
}

exceptions {
  id: bigint PK
  shipment_id: uuid FK
  exception_type: varchar(50)   -- late, customs_hold, damage, missing_docs
  severity: enum(info, warning, critical)
  detected_at: timestamp
  estimated_delay_days: int nullable
  status: enum(open, acknowledged, resolved)
  assigned_to_user_id: bigint nullable FK
  resolved_at: timestamp nullable
}

shipment_documents {
  id: bigint PK
  shipment_id: uuid FK
  doc_type: varchar(50)   -- bill_of_lading, commercial_invoice, packing_list, customs_entry
  file_name: varchar(200)
  s3_key: text
  uploaded_by: bigint FK
  uploaded_at: timestamp
}`,
      examples: [
        { table: 'shipments', label: 'Ocean freight shipment with ML-predicted ETA 3 days later than original', json: '{ "id": "shp-aa11bb22", "shipper_id": 30001, "carrier_id": 5, "tracking_number": "MAEU123456789", "origin_locode": "CNSHA", "destination_locode": "USLAX", "commodity_code": "8471300000", "weight_kg": 12500, "pieces": 200, "current_status": "vessel_in_transit", "expected_departure": "2025-05-01", "original_eta": "2025-06-01", "predicted_eta": "2025-06-04" }' },
        { table: 'tracking_events', label: 'AIS-sourced vessel position event', json: '{ "id": 9900445, "shipment_id": "shp-aa11bb22", "carrier_id": 5, "event_timestamp": "2025-05-20T08:00:00Z", "event_status": "vessel_in_transit", "raw_status_code": "AIS_POSITION", "location_locode": null, "location_name": "Pacific Ocean 38.5N 165.2W", "data_source": "ais", "ingested_at": "2025-05-20T08:05:00Z" }' },
        { table: 'exceptions', label: 'Critical exception for late shipment affecting production schedule', json: '{ "id": 880012, "shipment_id": "shp-aa11bb22", "exception_type": "late", "severity": "critical", "detected_at": "2025-05-18T10:00:00Z", "estimated_delay_days": 3, "status": "open", "assigned_to_user_id": 10501, "resolved_at": null }' },
      ],
    },

    basicImplementation: {
      title: 'Basic Architecture',
      description: 'A manual tracking system where logistics coordinators email carriers for status updates and enter them into a spreadsheet. ETA is whatever the carrier says on the booking confirmation. Exceptions are discovered when a warehouse calls asking where their shipment is.',
      problems: [
        'Manual status collection cannot scale beyond 50 active shipments per coordinator and introduces days of latency',
        'No ETA prediction: coordinators relay carrier estimates without adjustment for known congestion or carrier reliability',
        'Exception detection is reactive: the warehouse calls asking where the shipment is, rather than the logistics team proactively alerting the warehouse',
        'No unified event timeline: status is in email threads, carrier portals, and spreadsheets with no single source of truth',
        'No document management: bills of lading and commercial invoices are in email attachments with no structured retrieval',
        'No carbon footprint tracking: sustainability reporting requires manually computing emissions from shipment records',
      ],
    },

    advancedImplementation: {
      title: 'Event-Driven Visibility Platform with ML ETA Prediction and Proactive Exception Management',
      description: 'Carrier tracking data is ingested through a multi-channel pipeline: real-time API webhooks from modern carriers, EDI 214 status updates via an EDI middleware platform, AIS vessel position data from a maritime data provider, and email parsing for carriers that only send status updates via email. All events are normalized to a unified status taxonomy and stored in an append-only tracking_events table. ETA prediction runs as a batch job every 6 hours per active shipment, using a gradient boosting model trained on historical shipment data with features including current port queue depth, vessel speed from AIS, carrier route performance, and commodity-specific customs clearance times. Exception detection evaluates each updated ETA against the original ETA and predefined risk thresholds, creating exceptions and routing alerts to stakeholders via their preferred channel.',
      keyPoints: [
        'Multi-channel ingestion: carrier webhooks processed in under 1 second; EDI 214 files processed within 5 minutes; AIS vessel positions updated every 10 minutes from marine traffic provider API; email parsing uses ML-based extraction to pull status, location, and timestamp from unstructured carrier update emails',
        'Status normalization maps 5,000+ carrier-specific status codes to a 40-code internal taxonomy (departed_origin, customs_cleared, vessel_in_transit, arrived_port, out_for_delivery, delivered) enabling cross-carrier comparison',
        'ETA prediction model features: days_since_departure, port_congestion_index[destination_port], vessel_speed_vs_planned, carrier_otp_rate[carrier][route], weather_severity_index, customs_delay_history[commodity][origin_country]',
        'Exception rules engine: if predicted_eta > original_eta + threshold_days → create late exception; if last_event_timestamp > X days ago → create tracking_gap exception; if customs_status = hold → create customs_hold exception at critical severity',
        'Alert routing matches exception type to stakeholder role: late arrival alerts go to warehouse manager and procurement; customs hold alerts go to customs broker and compliance team; damage claims go to insurance coordinator and account manager',
        'Supply chain graph models the multi-party chain as a directed graph: PO → manufacturer → freight_forwarder → ocean_carrier → port_of_entry → customs → inland_carrier → distribution_center; each node in the graph is a party with their own visibility scope and event ownership',
        'Carbon footprint calculated per leg using emission factors by mode: ocean freight at 8-10g CO2e per tonne-km, air freight at 500-600g CO2e per tonne-km, truck at 60-80g CO2e per tonne-km; total footprint stored per shipment for sustainability reporting',
      ],
      databaseChoice: 'PostgreSQL for shipments, exceptions, and shipment documents (transactional, moderate volume); ClickHouse for tracking_events and eta_predictions (append-only, high volume, time-range analytics queries); S3 for shipment documents; Redis for active shipment status cache and exception alert deduplication; Kafka for carrier event ingestion pipeline and exception notification fanout',
      caching: 'Active shipment current status cached in Redis with 60-second TTL (invalidated on new tracking event); ETA prediction cached per shipment with 6-hour TTL (refreshed by batch job); port congestion index cached in Redis with 15-minute TTL from port authority data feeds; carrier API credentials and connection pools cached in application memory',
    },

    tips: [
      'Multi-channel data ingestion complexity is the most unique aspect of supply chain visibility — explain the different data quality levels (real-time API vs weekly Excel vs AIS) and how normalization handles them.',
      'ETA prediction is the highest-value feature because the business impact of better ETA accuracy is measurable in inventory cost reduction — quantify this in your design.',
      'Status normalization across 5,000 carrier-specific codes is a data engineering challenge worth describing — explain why a unified taxonomy is necessary for cross-carrier comparison.',
      'The supply chain graph model is an interesting data modeling question — explain why a graph structure (not a flat table) captures the multi-hop, multi-party nature of international freight.',
      'Exception routing with stakeholder mapping shows product thinking: the platform must know that a warehouse manager needs arrival time alerts but does not need customs documentation alerts, which go to the compliance team.',
      'Mention data freshness tradeoffs: AIS vessel positions are accurate to minutes but only available for ocean freight; inland trucking visibility relies on carrier EDI which can lag by hours.',
    ],

    keyQuestions: [
      {
        question: 'How do you normalize tracking events from 400+ carriers into a unified timeline?',
        answer: `**The problem:** Carrier A says "DLVD" — what does that mean? Delivered? Delay? Carrier B says "OUT FOR DELIVERY" in English. Carrier C sends an EDI 214 with status code "X6." These must all map to the same internal concept so the platform can display a consistent timeline and trigger consistent exception rules.

**Three-tier normalization approach:**

**Tier 1: Exact code mapping (covers ~60% of events)**
\`\`\`python
# Static mapping table maintained by data operations team
CARRIER_STATUS_MAP = {
    ("FEDEX", "DL"): "delivered",
    ("FEDEX", "OD"): "out_for_delivery",
    ("UPS", "D"): "delivered",
    ("UPS", "I"): "in_transit",
    ("MAERSK", "DISC"): "vessel_discharged",
    ("EDI_214", "X3"): "customs_hold",
    ("EDI_214", "X6"): "customs_cleared",
    # ... thousands of entries
}

def normalize_status(carrier_id, raw_code):
    return CARRIER_STATUS_MAP.get((carrier_id, raw_code))
\`\`\`

**Tier 2: ML classifier for unmapped codes (covers ~30%)**
When no exact mapping exists:
\`\`\`python
# Train a text classifier on (raw_status_text, context) → normalized_status
# Training data: previously mapped events reviewed by humans
features = f"{raw_code} {raw_description} {carrier_name} {transport_mode}"
normalized = classifier.predict(features)
confidence = classifier.predict_proba(features).max()

if confidence < 0.8:
    # Low confidence → route to human review queue
    queue_for_review(event, prediction=normalized, confidence=confidence)
\`\`\`

**Tier 3: Human review for novel codes (covers ~10%)**
- Unknown codes from new carriers or unusual events go to a data team queue
- Human reviews, assigns normalized status
- Decision added to Tier 1 mapping for future occurrences

**Handling event deduplication:**
Same event sometimes arrives from multiple sources (carrier API + EDI + email):
\`\`\`python
# Deduplication key: (tracking_number, event_timestamp, event_location)
# Within 30-minute window: same location + same status = duplicate
# Keep the highest-quality source (API > EDI > email > manual)
\`\`\`

**Timeline ordering challenge:**
Events arrive out of order (EDI update for yesterday's event arrives today). Use event_timestamp (when the event happened) for timeline ordering, not ingested_at (when we received it). For unknown timestamps (some carriers only send "today at some point"), estimate based on event sequence and historical timing patterns.`,
      },
      {
        question: 'How do you predict shipment ETAs when ocean freight can be delayed by weeks due to port congestion?',
        answer: `**Why carrier-provided ETA is unreliable:**
Carriers compute ETA at booking time based on the vessel schedule — nominal port calls, no adjustment for real-world conditions. Port congestion at Los Angeles in 2021-2022 caused 100+ vessel anchorage queues, with ships waiting 2-3 weeks past their scheduled arrival. The carrier still showed the original scheduled date in their system.

**ML ETA prediction approach:**

**Feature engineering:**
\`\`\`python
features = {
    # Current shipment state
    "days_since_departure": ...,
    "days_to_original_eta": ...,
    "vessel_speed_vs_schedule": ais_speed / planned_speed,

    # Destination port conditions (updated every 15 min)
    "port_queue_vessels_waiting": port_congestion_api[destination_port],
    "port_avg_wait_days_last7": historical_wait[destination_port],
    "berth_occupancy_pct": ...,

    # Carrier-route performance
    "carrier_otp_rate_this_route": historical_otp[carrier][route],
    "carrier_avg_delay_days_this_lane": ...,

    # External signals
    "weather_severity_next7days": weather_api[route],
    "congestion_trend": port_congestion_7day_trend,

    # Commodity-specific
    "customs_avg_clearance_days": historical_customs[hs_code][origin_country],
    "customs_flagged_commodity": is_high_inspection_category(hs_code),
}

predicted_eta = xgboost_model.predict(features)
# Returns: predicted arrival date + confidence interval (e.g., June 4 ± 2 days, 85% confidence)
\`\`\`

**Training data:**
- Historical shipments with known actual arrival dates
- Carrier ETA at various points during transit (to learn how ETA evolves)
- Port congestion data matched to historical delays
- ~3-5 years of data to capture seasonal patterns (peak season congestion, Chinese New Year factory shutdowns)

**Model update frequency:**
- Re-run predictions every 6 hours per active shipment (or on new tracking event)
- Port congestion features updated every 15 minutes
- Model retrained weekly with new actuals

**Business value:**
- Original carrier ETA: mean absolute error of 5.2 days
- ML-predicted ETA: mean absolute error of 2.1 days
- For a company with $100M in inventory, a 3-day improvement in ETA accuracy allows reducing safety stock by ~$8M (based on 28-day replenishment cycle)`,
      },
    ],

    keyDecisions: [
      'Append-only tracking events vs mutable shipment status record — chose append-only because supply chain events are historical facts (a vessel left Shanghai at 14:00 on June 1) that must never be deleted or modified; the full history is needed for dispute resolution and model training',
      'ML ETA prediction vs rule-based adjustments to carrier ETA — chose ML because rule-based adjustments (add N days if destination port congestion score > threshold) cannot capture the interaction between multiple simultaneous risk factors; ML learns these interactions from historical data',
      'Multi-channel ingestion (API + EDI + AIS + email) vs API-only with carrier whitelist — chose multi-channel because 40 percent of shipment volume moves through carriers who only support EDI or email; restricting to API-only would exclude a large portion of the global freight market',
      'Per-stakeholder alert routing vs single alert to all stakeholders — chose per-stakeholder routing because warehouse managers and procurement teams need different alerts at different times; blasting everyone with every exception creates alert fatigue and ignored notifications',
      'ClickHouse for tracking events vs PostgreSQL — chose ClickHouse because 100M tracking events/day × 365 days = 36.5B rows/year; time-range analytics queries (shipments delayed by port by month, carrier performance by lane) run 100x faster on ClickHouse columnar storage than PostgreSQL row storage at this scale',
    ],
  },
];
