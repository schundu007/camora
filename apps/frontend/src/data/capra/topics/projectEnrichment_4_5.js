// Enrichment data for projects 4-5: realtime-dashboard, event-notification-system

export const enrichment_4_5 = {

  'realtime-dashboard': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Time-Series Data Ingestion',
        description: 'Set up the metrics ingestion pipeline using TimescaleDB (PostgreSQL extension) and a metrics producer.',
        tasks: [
          'Install TimescaleDB extension into PostgreSQL; create metrics hypertable partitioned by time',
          'Build metrics ingestor: Express endpoint POST /api/ingest accepting { metric, tags, value, timestamp }',
          'Create a simulated metrics producer that generates CPU/memory/request-rate data every second',
          'Implement downsampling jobs: 1-min averages for data older than 1 hour, 1-hour averages for data older than 24 hours',
          'Write query builder: translate dashboard panel config into parameterized TimescaleDB SELECT with time_bucket()',
        ],
      },
      {
        phase: 2,
        title: 'WebSocket Real-time Streaming',
        description: 'Build the WebSocket server that pushes live metric updates to connected dashboard clients.',
        tasks: [
          'Set up ws or Socket.io WebSocket server with channel-based subscriptions',
          'Implement subscription manager: clients subscribe to specific metrics/tags combinations',
          'On new data ingest, publish to subscribers matching the metric+tags filter',
          'Add backpressure: if client\'s WebSocket buffer is full, drop oldest points and send a "gap" event',
          'Implement reconnection recovery: on re-connect, replay last N data points from TimescaleDB to fill the gap',
        ],
      },
      {
        phase: 3,
        title: 'Dashboard Builder UI',
        description: 'React dashboard with configurable panels, drag-and-drop layout, and D3.js/recharts charts.',
        tasks: [
          'Build panel registry: Line, Bar, Gauge, Stat, Heatmap panel types as React components',
          'Implement drag-and-drop grid layout using react-grid-layout with 12-column grid',
          'Create panel config editor: metric selector, aggregation function, time range, display options',
          'Build time range picker: preset ranges (Last 1h, 6h, 24h, 7d) + custom date picker',
          'Add variable interpolation: $host, $service as dashboard variables that filter all panels simultaneously',
        ],
      },
      {
        phase: 4,
        title: 'Alerting Engine',
        description: 'Rule-based alerting with state machine, notification delivery, and alert history.',
        tasks: [
          'Create alert_rules table: metric, condition, threshold, duration, severity, notification channels',
          'Build alert evaluator: runs every 10s, queries TimescaleDB for recent data, evaluates each rule',
          'Implement alert state machine: OK → Pending → Firing → Resolved with state transition logging',
          'Deliver notifications via email (Nodemailer) and webhook; de-duplicate with 5-minute cooldown',
          'Build alert history UI: timeline of state transitions, acknowledge/silence individual alerts',
        ],
      },
    ],

    fileStructure: `realtime-dashboard/
├── backend/
│   ├── src/
│   │   ├── ingestion/
│   │   │   ├── ingestor.ts          # POST /api/ingest handler
│   │   │   ├── downsampler.ts       # Scheduled aggregation jobs
│   │   │   └── producer.ts          # Simulated metrics generator
│   │   ├── query/
│   │   │   ├── queryBuilder.ts      # Panel config → SQL translator
│   │   │   └── timescale.ts         # TimescaleDB helpers
│   │   ├── websocket/
│   │   │   ├── wsServer.ts          # WebSocket server setup
│   │   │   ├── subscriptions.ts     # Client subscription manager
│   │   │   └── publisher.ts         # Fanout to matching subscribers
│   │   ├── alerts/
│   │   │   ├── evaluator.ts         # Alert rule evaluation loop
│   │   │   ├── stateMachine.ts      # OK/Pending/Firing/Resolved FSM
│   │   │   └── notifier.ts          # Email + webhook delivery
│   │   ├── routes/
│   │   │   ├── ingest.ts
│   │   │   ├── query.ts             # Panel data queries
│   │   │   ├── dashboards.ts        # Dashboard config CRUD
│   │   │   └── alerts.ts            # Alert rule CRUD + history
│   │   └── index.ts
│   └── migrations/
│       └── 001_timescale_schema.sql
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── dashboard/
│       │   ├── DashboardGrid.tsx    # react-grid-layout wrapper
│       │   ├── PanelWrapper.tsx     # Panel chrome + config button
│       │   └── panels/
│       │       ├── LineChart.tsx    # D3.js / recharts line chart
│       │       ├── GaugePanel.tsx
│       │       ├── StatPanel.tsx
│       │       └── Heatmap.tsx
│       ├── hooks/
│       │   ├── useMetricsStream.ts  # WebSocket subscription hook
│       │   └── usePanelData.ts      # Query + real-time merge
│       └── alerts/
│           └── AlertsPage.tsx
├── docker-compose.yml               # Backend + TimescaleDB + Redis
└── package.json`,

    architectureLayers: [
      { name: 'Producers Layer', description: 'Services or a simulator push metric data points via POST /api/ingest. Each point carries metric name, tag set (host, service, env), numeric value, and timestamp. Producers are decoupled from the dashboard — any system can send metrics over HTTP.' },
      { name: 'Ingestion Layer', description: 'Express endpoint validates and batch-inserts data points into TimescaleDB using COPY or multi-row INSERT for throughput. Immediately after inserting, publishes to the WebSocket fanout for live updates.' },
      { name: 'Storage Layer', description: 'TimescaleDB hypertable partitions data by time automatically. Continuous aggregates materialize 1-minute and 1-hour rollups. Chunk compression reduces storage for historical data. Queries against recent data hit a single time chunk for low latency.' },
      { name: 'Query Layer', description: 'Panel configs are translated into parameterized SQL using time_bucket() for aggregation, WHERE clauses for tag filtering, and ORDER BY time for chart rendering. Results are normalized to { time, value, tags } arrays that all panel types can consume.' },
      { name: 'Real-time Layer', description: 'WebSocket server maintains a subscription registry: {metricName+tags → Set<WebSocket>}. On each ingested point, O(1) lookup publishes to matching subscribers. Clients receive a stream of { metric, value, timestamp } events that they append to their local chart data buffer.' },
      { name: 'Alert Engine Layer', description: 'Runs on a 10-second evaluator loop independent of the web server process. Evaluates each active rule against the last N minutes of TimescaleDB data. Drives state machine transitions and delivers notifications on state changes.' },
      { name: 'Dashboard Config Layer', description: 'Dashboard layouts and panel configs are stored as JSONB in PostgreSQL. Users build dashboards via drag-and-drop in the browser; configs are saved and restored across sessions. Dashboard variables ($host, $service) parameterize all panel queries simultaneously.' },
    ],

    dataModel: {
      description: 'TimescaleDB for time-series metrics with automatic partitioning and compression. PostgreSQL for dashboard configs, alert rules, and alert state history.',
      schema: `-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Raw metric data points
CREATE TABLE metrics (
  time        TIMESTAMPTZ NOT NULL,
  metric      TEXT NOT NULL,
  value       DOUBLE PRECISION NOT NULL,
  tags        JSONB NOT NULL DEFAULT '{}'
);

-- Convert to hypertable (partitioned by time, 1-day chunks)
SELECT create_hypertable('metrics', 'time', chunk_time_interval => INTERVAL '1 day');

-- Index for fast tag-filtered queries
CREATE INDEX idx_metrics_metric_time ON metrics(metric, time DESC);
CREATE INDEX idx_metrics_tags ON metrics USING GIN(tags);

-- Continuous aggregate: 1-minute rollup
CREATE MATERIALIZED VIEW metrics_1min
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 minute', time) AS bucket,
       metric,
       tags,
       AVG(value) AS avg_value,
       MAX(value) AS max_value,
       MIN(value) AS min_value
FROM metrics
GROUP BY bucket, metric, tags;

-- Dashboard configuration
CREATE TABLE dashboards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  layout      JSONB NOT NULL DEFAULT '[]',  -- react-grid-layout positions
  panels      JSONB NOT NULL DEFAULT '[]',  -- panel configs array
  variables   JSONB NOT NULL DEFAULT '{}',  -- $host, $service defaults
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Alert rules
CREATE TABLE alert_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  metric            TEXT NOT NULL,
  tag_filter        JSONB,
  condition         VARCHAR(2)  NOT NULL,  -- '>', '<', '>=', '<='
  threshold         DOUBLE PRECISION NOT NULL,
  duration_secs     INTEGER NOT NULL DEFAULT 60,
  severity          VARCHAR(20) NOT NULL DEFAULT 'warning',
  notification_urls TEXT[],
  is_active         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE alert_states (
  id           SERIAL PRIMARY KEY,
  rule_id      UUID REFERENCES alert_rules(id),
  state        VARCHAR(20) NOT NULL,  -- ok | pending | firing | resolved
  value        DOUBLE PRECISION,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  notified_at  TIMESTAMPTZ
);`,
    },

    apiDesign: {
      description: 'REST API for data ingestion, panel queries, dashboard config management, and alert management. WebSocket for real-time data streaming.',
      endpoints: [
        { method: 'POST',   path: '/api/ingest',                  response: '{ received: N } — batch ingest of metric data points' },
        { method: 'POST',   path: '/api/query',                   response: '{ data: [{time, value, tags}] } — executes panel query for a time range' },
        { method: 'GET',    path: '/api/metrics',                 response: 'Array of distinct metric names + tag key/values for panel config dropdowns' },
        { method: 'GET',    path: '/api/dashboards',              response: 'Array of user\'s dashboards with title, panel count, last updated' },
        { method: 'GET',    path: '/api/dashboards/:id',          response: 'Full dashboard config: layout, panels, variables' },
        { method: 'PUT',    path: '/api/dashboards/:id',          response: 'Updated dashboard config' },
        { method: 'GET',    path: '/api/alerts/rules',            response: 'Array of alert rules with current state' },
        { method: 'POST',   path: '/api/alerts/rules',            response: 'Created alert rule, starts evaluating immediately' },
        { method: 'GET',    path: '/api/alerts/history',          response: 'Paginated alert state transitions with value, duration, timestamps' },
        { method: 'WS',     path: '/ws/metrics',                  response: 'WebSocket: subscribe to metrics; receive {metric, value, tags, time} events in real-time' },
      ],
    },

    codeExamples: {
      typescript: `// frontend/src/hooks/useMetricsStream.ts
// Subscribes to a metric via WebSocket and merges live data into chart buffer

import { useEffect, useRef, useState, useCallback } from 'react';

export interface DataPoint {
  time: number;  // Unix ms
  value: number;
}

interface UseMetricsStreamOptions {
  metric: string;
  tags?: Record<string, string>;
  windowMs?: number;   // visible time window, default 5 minutes
  maxPoints?: number;  // max buffer size, default 300
}

export function useMetricsStream({
  metric,
  tags = {},
  windowMs = 5 * 60 * 1000,
  maxPoints = 300,
}: UseMetricsStreamOptions) {
  const [data, setData] = useState<DataPoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<DataPoint[]>([]);

  const pruneBuffer = useCallback(() => {
    const cutoff = Date.now() - windowMs;
    bufferRef.current = bufferRef.current.filter(p => p.time > cutoff);
    if (bufferRef.current.length > maxPoints) {
      bufferRef.current = bufferRef.current.slice(-maxPoints);
    }
  }, [windowMs, maxPoints]);

  useEffect(() => {
    const ws = new WebSocket(\`\${import.meta.env.VITE_WS_URL}/ws/metrics\`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to this metric+tags combination
      ws.send(JSON.stringify({ action: 'subscribe', metric, tags }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'snapshot') {
        // Initial historical data to fill the visible window
        bufferRef.current = msg.points;
        setData([...bufferRef.current]);
        return;
      }

      if (msg.type === 'point' && msg.metric === metric) {
        bufferRef.current.push({ time: msg.time, value: msg.value });
        pruneBuffer();
        // Batch React updates — only re-render at most every 500ms
        setData([...bufferRef.current]);
      }
    };

    ws.onclose = () => {
      // Reconnect after 2 seconds
      setTimeout(() => wsRef.current?.CLOSED && ws.close(), 2000);
    };

    return () => {
      ws.send(JSON.stringify({ action: 'unsubscribe', metric, tags }));
      ws.close();
    };
  }, [metric, JSON.stringify(tags)]);

  return { data };
}`,
    },

    tradeoffDecisions: [
      {
        choice: 'Time-series DB: TimescaleDB vs InfluxDB vs Redis TimeSeries',
        picked: 'TimescaleDB (PostgreSQL extension)',
        reason: 'TimescaleDB runs as a PostgreSQL extension — you get the full SQL query language, JOINs with relational tables (alert rules, dashboard configs), and existing PostgreSQL tooling. InfluxDB uses its own query language (Flux/InfluxQL) and is a separate service. Redis TimeSeries is fast but lacks aggregations and persistence guarantees. TimescaleDB is the pragmatic choice for a project-sized deployment.',
      },
      {
        choice: 'Real-time delivery: WebSocket vs SSE vs polling',
        picked: 'WebSocket',
        reason: 'SSE is unidirectional (server → client only), so the client cannot send subscription filters. Polling introduces latency proportional to the poll interval. WebSocket supports bidirectional communication: clients send subscription filters, server pushes matching data. For a metrics dashboard where users configure what they want to see, WebSocket is the right fit.',
      },
      {
        choice: 'Chart library: D3.js vs recharts vs Victory',
        picked: 'recharts for standard charts, D3.js for heatmap and custom visuals',
        reason: 'recharts wraps D3 with React components — it handles the SVG DOM diffing correctly and has a declarative API that is much faster to develop with. D3 is still needed for custom visuals (heatmaps, sparklines) where recharts\' abstraction gets in the way. Using both is common in production dashboards.',
      },
      {
        choice: 'Dashboard layout: CSS Grid vs react-grid-layout',
        picked: 'react-grid-layout',
        reason: 'react-grid-layout provides built-in drag-and-drop, resize handles, collision detection, and responsive breakpoints — features that would take weeks to build correctly with CSS Grid and custom interaction code. The tradeoff is a ~80KB dependency and less CSS control, which is acceptable for a dashboard builder.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'TimescaleDB Continuous Aggregates and Compression',
        detail: 'Continuous aggregates are materialized views that auto-refresh as new data arrives. They store pre-computed time_bucket() rollups, making long-range queries (last 30 days) fast because they scan the aggregate table rather than raw data. TimescaleDB also compresses chunks older than a threshold using columnar storage — achieving 10-20x compression ratios for numeric time-series data. Compression is transparent to queries.',
      },
      {
        topic: 'WebSocket Backpressure and Slow Consumers',
        detail: 'A fast metric producer (1000 data points/second) can overwhelm a slow JavaScript client. The WebSocket send buffer fills up, and if unchecked, the server process runs out of memory. Handle this by checking ws.bufferedAmount before each send: if it exceeds a threshold, skip the current batch and send a "gap" event. The client can request a historical replay for the gap window from the REST API.',
      },
      {
        topic: 'Alert Flapping and Hysteresis',
        detail: 'A metric hovering around the threshold (89%, 91%, 89%, 91%) causes repeated Firing → Resolved → Firing transitions — "flapping." Mitigations: (1) Duration requirement: the metric must exceed the threshold continuously for N minutes before firing. (2) Hysteresis: different thresholds for firing (>90%) and resolving (<85%). (3) Cooldown: once resolved, cannot fire again for 5 minutes. All three reduce alert noise significantly.',
      },
      {
        topic: 'Efficient Data Point Rendering in D3',
        detail: 'Rendering 10,000 SVG elements for a dense time series degrades browser performance. Mitigations: (1) Data decimation: reduce points to the pixel-level resolution of the chart (e.g., a 400px wide chart needs at most 400 data points — use LTTB downsampling algorithm). (2) Canvas rendering instead of SVG for dense data sets. (3) Use requestAnimationFrame to batch DOM updates from WebSocket messages, not one update per message.',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Re-rendering the entire chart on every WebSocket message',
        why: 'Receiving 10 data points per second means 10 React state updates per second per panel. With 10 panels, that is 100 renders/second, causing visible jitter and CPU spikes.',
        solution: 'Accumulate incoming points in a ref (not state) and flush to state at most every 500ms using a setInterval or useTransition. The ref update is immediate; the state update (triggering re-render) is batched. This reduces renders from 100/s to 2/s with no visible latency difference.',
      },
      {
        pitfall: 'Unbounded data retention without downsampling',
        why: 'Storing every raw data point forever at 1-second resolution: 86,400 points/day/metric. With 100 metrics, that is 8.6M rows/day. Without compression and downsampling, queries for "last 30 days" scan hundreds of millions of rows.',
        solution: 'Use TimescaleDB continuous aggregates for 1-min and 1-hour rollups. Set data retention policies: keep raw data for 24 hours, 1-min rollups for 30 days, 1-hour rollups indefinitely. Enable chunk compression for data older than 1 week.',
      },
      {
        pitfall: 'Alert storms: N rules fire simultaneously and send N notifications',
        why: 'When a host goes down, all 20 CPU/memory/disk/network rules for that host fire at once, sending 20 Slack messages within seconds. This causes alert fatigue and is worse than no alerting.',
        solution: 'Implement alert grouping: alerts on the same host within a 5-minute window are grouped into a single notification with a summary. Add an alert inhibition system: if a "host down" alert fires, suppress all other alerts for that host. These are patterns from Alertmanager (Prometheus ecosystem).',
      },
      {
        pitfall: 'Not handling timezone correctly in time range queries',
        why: 'Dashboard time ranges ("last 24 hours," "today") have different semantics in different timezones. Using UTC internally but displaying in local time causes charts to show data for the wrong period.',
        solution: 'Store all timestamps as TIMESTAMPTZ (UTC) in the database. Apply timezone conversion at the presentation layer only. Accept timezone as a parameter in all API calls (X-Timezone header or query param). Use time_bucket(\'1 hour\', time AT TIME ZONE $tz) in TimescaleDB queries for user-timezone-aligned bucketing.',
      },
    ],

    edgeCases: [
      {
        scenario: 'Metric ingestion spike: 100x normal volume',
        impact: 'TimescaleDB INSERT throughput is bounded. A spike causes the ingest queue to back up, insert latency to spike, and WebSocket delivery to fall behind — users see stale charts.',
        mitigation: 'Buffer ingest points in a Redis list or in-memory queue. Use COPY or multi-row INSERT (batch size 500) instead of single-row INSERT. Add backpressure to producers: return 429 if the buffer exceeds 100K pending points. Shed lowest-priority metrics (infrastructure metrics) before user-facing business metrics.',
      },
      {
        scenario: 'Client connects mid-stream with no historical data',
        impact: 'A user opens the dashboard and sees an empty chart for 30 seconds while waiting for live data to fill the time window.',
        mitigation: 'On WebSocket subscription, immediately send a "snapshot" message containing the last N minutes of data from TimescaleDB. The client seeds its local buffer with the snapshot, then appends live points. The chart appears fully populated within 100ms of connection.',
      },
      {
        scenario: 'Concurrent dashboard edits from two browser tabs',
        impact: 'User has the dashboard open in two tabs. Saves from Tab A are overwritten by saves from Tab B, which loaded the original config and saved stale data.',
        mitigation: 'Use optimistic concurrency: include an updated_at timestamp in the PUT request. Server rejects updates where the request timestamp does not match the current database timestamp (HTTP 409 Conflict). Client shows a "Dashboard was updated elsewhere, reload?" banner on conflict.',
      },
      {
        scenario: 'Alerting evaluator skips cycles under database load',
        impact: 'If the alert evaluator\'s TimescaleDB queries take longer than the evaluation interval (10s), evaluations start to pile up. A metric that fires and recovers within one missed cycle is never alerted.',
        mitigation: 'Track the last evaluation timestamp per rule. If a cycle starts and the previous cycle is still running, skip it and log a warning. Ensure alert rules use pre-computed continuous aggregate views rather than raw metrics for fast evaluation even under load.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How would you scale this to handle 10,000 metrics at 1-second resolution?',
        answer: 'TimescaleDB handles millions of rows/second on adequate hardware. Scale the ingest pipeline: horizontal Express servers behind a load balancer, with a Kafka or Redis Streams buffer between producers and the database. Partition TimescaleDB by metric prefix across multiple nodes. For WebSocket fanout at scale, use Redis Pub/Sub: ingest server publishes to Redis channels, WebSocket servers subscribe and forward to their connected clients.',
      },
      {
        question: 'How would you implement anomaly detection on top of this?',
        answer: 'Store a rolling mean and standard deviation per metric (computed as continuous aggregate). Alert when current value deviates by more than 3σ from the rolling baseline — a statistical anomaly. For more sophisticated detection, run a Prophet or SARIMA model (Python service) on historical data to generate forecast bands; alert when live values fall outside the predicted range. Schedule model retraining weekly.',
      },
      {
        question: 'What is the difference between a push-based and pull-based metrics system?',
        answer: 'Pull (Prometheus): the monitoring server scrapes /metrics endpoints on each service at a configured interval. Services just expose a metrics endpoint. Good for service discovery, consistent scrape intervals, but requires the monitoring server to reach all services. Push (InfluxDB/StatsD): services actively send metrics to the monitoring backend. Works behind firewalls, easier for short-lived jobs, but risks overwhelming the backend during spikes and requires producers to know the backend address.',
      },
      {
        question: 'How do you ensure metric data is not lost if the ingest service crashes?',
        answer: 'Producers should implement a local buffer (file or SQLite) with at-least-once delivery semantics: write to the local buffer first, then send to the ingest service. Only remove from the local buffer after receiving a 200 confirmation. If the ingest service is unavailable, retry with exponential backoff from the local buffer. This is the same pattern used by the OpenTelemetry Collector\'s retry exporter.',
      },
    ],

    extensionIdeas: [
      { idea: 'Mobile-responsive dashboard with touch-optimized charts', difficulty: 'intermediate', description: 'Adapt the dashboard for mobile screens: switch from a multi-column grid to a single-column stacked layout, replace hover tooltips with tap-to-show overlays, add pinch-to-zoom on charts, and implement swipe navigation between dashboards.' },
      { idea: 'Correlation analysis between metrics', difficulty: 'advanced', description: 'When an alert fires, automatically query correlated metrics over the same time window (metrics that showed anomalies within 2 minutes of the alert). Compute Pearson correlation coefficients and surface the top 5 correlated metrics alongside the alert. Helps engineers find root causes faster.' },
      { idea: 'Dashboard sharing and embedding', difficulty: 'beginner', description: 'Generate a shareable read-only link to a dashboard snapshot (frozen point in time) or a live view (continuously updating). Support embedding as an iframe with ?embed=true parameter that hides navigation. Add per-dashboard access control: public, organization-wide, or private.' },
      { idea: 'SLO tracking panels', difficulty: 'intermediate', description: 'Add a special SLO panel type: define an SLO (e.g., 99.9% availability over 30 days), and the panel shows current burn rate, error budget remaining, and a forecast of when the budget will be exhausted at the current rate. Use TimescaleDB to compute error budget consumption over rolling windows.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'event-notification-system': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Event Bus & Routing',
        description: 'Set up Redis Streams as the event bus and build the event router that maps event types to notification templates.',
        tasks: [
          'Create Redis Streams event publisher: XADD notifications:events * {type, userId, data, traceId}',
          'Build event consumer group with XREADGROUP for at-least-once delivery and consumer tracking',
          'Create event_templates table: event_type, channel, subject_template, body_template (Handlebars)',
          'Implement template renderer: load template by (event_type, channel), compile with event data using Handlebars',
          'Write event router: for each event, resolve user preferences, select channels, render templates per channel',
        ],
      },
      {
        phase: 2,
        title: 'Multi-Channel Delivery',
        description: 'Implement delivery adapters for email, in-app WebSocket, and web push.',
        tasks: [
          'Email adapter: Resend (or Nodemailer) with HTML template rendering and delivery receipt tracking',
          'In-app adapter: insert notification to PostgreSQL notifications table; publish to user\'s WebSocket room',
          'Web push adapter: store VAPID subscription, send via web-push library, handle subscription expiry',
          'Build delivery wrapper: try primary channel, fall back to secondary channel on failure',
          'Implement delivery status tracking: record sent_at, delivered_at, read_at, failed_at per channel attempt',
        ],
      },
      {
        phase: 3,
        title: 'User Preferences & Frequency Controls',
        description: 'Per-user channel configuration, quiet hours, and frequency caps.',
        tasks: [
          'Create user_notification_preferences table with channel toggles, quiet hours, and frequency_cap_hourly',
          'Build preference checker middleware: evaluate channel enabled → quiet hours → frequency cap in sequence',
          'Implement frequency cap using Redis counters: INCR nt:freq:{userId}:{channel}:{hour}, EXPIRE 3600',
          'Create preferences REST API and a React notification settings page',
          'Add event-type-level preferences: user can mute specific event types per channel independently',
        ],
      },
      {
        phase: 4,
        title: 'Retry, DLQ & Admin UI',
        description: 'Retry failed deliveries, manage dead letter queue, and build admin visibility tools.',
        tasks: [
          'Implement delivery retry queue using Redis Streams with delayed re-enqueue (XADD at future timestamp)',
          'After 4 retry failures, move to dead_letter_notifications table with full context',
          'Build admin React dashboard: notification volume chart, channel delivery rates, DLQ inspector',
          'Add notification preview tool: enter sample event data, see rendered output for all channels',
          'Implement delivery replay: re-send any DLQ notification or resend any historical notification to a user',
        ],
      },
    ],

    fileStructure: `event-notification-system/
├── src/
│   ├── events/
│   │   ├── publisher.ts         # XADD to Redis Streams
│   │   ├── consumer.ts          # XREADGROUP consumer loop
│   │   └── router.ts            # Event → channel mapping
│   ├── templates/
│   │   ├── renderer.ts          # Handlebars template engine
│   │   ├── loader.ts            # DB-backed template cache
│   │   └── previewer.ts         # Render with sample data
│   ├── channels/
│   │   ├── email.ts             # Resend/Nodemailer adapter
│   │   ├── inApp.ts             # PostgreSQL + WebSocket
│   │   ├── webPush.ts           # VAPID push adapter
│   │   └── index.ts             # Channel registry + fallback
│   ├── preferences/
│   │   ├── checker.ts           # Enabled/quietHours/freqCap chain
│   │   └── repository.ts        # User preference CRUD
│   ├── retry/
│   │   ├── retryQueue.ts        # Re-enqueue with backoff
│   │   └── deadLetter.ts        # DLQ persistence + replay
│   ├── routes/
│   │   ├── events.ts            # POST /api/events (publish)
│   │   ├── notifications.ts     # GET /api/notifications (inbox)
│   │   ├── preferences.ts       # User preference CRUD
│   │   └── admin.ts             # Admin dashboard endpoints
│   ├── websocket/
│   │   └── wsServer.ts          # Per-user room for in-app push
│   ├── dashboard/               # React admin UI
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── VolumeChart.tsx
│   │       ├── DeliveryRates.tsx
│   │       └── DLQInspector.tsx
│   └── index.ts
├── migrations/
│   └── 001_notifications_schema.sql
├── docker-compose.yml
└── package.json`,

    architectureLayers: [
      { name: 'Event Producer Layer', description: 'Any service publishes events via POST /api/events or directly via the Redis Streams publisher SDK. Events are schema-validated against the event type registry before being accepted. Producers are fully decoupled from delivery logic.' },
      { name: 'Event Bus Layer', description: 'Redis Streams store events durably (configurable retention). Consumer groups enable multiple processing workers without duplicate processing. Each event is acknowledged (XACK) only after successful routing, ensuring at-least-once delivery.' },
      { name: 'Routing & Template Layer', description: 'For each incoming event, resolve the target user\'s preferred channels, load the appropriate template per channel, render the template with event data using Handlebars, and hand off to the delivery layer.' },
      { name: 'Preference Gate Layer', description: 'Before any delivery attempt, the preference checker evaluates: Is the channel enabled for this user? Is it outside quiet hours? Is the hourly frequency cap not exceeded? All three must pass for the notification to proceed.' },
      { name: 'Delivery Layer', description: 'Channel-specific adapters handle the actual delivery. Each adapter retries on transient failures and reports success/failure back to the delivery tracker. Failures beyond the retry budget are moved to the dead letter queue.' },
      { name: 'Persistence Layer', description: 'PostgreSQL stores notification records (inbox), delivery attempts, user preferences, templates, and the dead letter queue. All tables use UUID primary keys for idempotency across retry scenarios.' },
    ],

    dataModel: {
      description: 'Redis Streams as the event bus. PostgreSQL for notifications inbox, delivery tracking, user preferences, and templates. Redis for frequency cap counters.',
      schema: `-- Event templates
CREATE TABLE notification_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       VARCHAR(100) NOT NULL,
  channel          VARCHAR(20) NOT NULL,   -- 'email' | 'in_app' | 'push'
  subject_template TEXT,                   -- email subject (Handlebars)
  body_template    TEXT NOT NULL,          -- email HTML or push body
  is_active        BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(event_type, channel)
);

-- User notification preferences
CREATE TABLE notification_preferences (
  user_id              UUID PRIMARY KEY,
  email_enabled        BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled       BOOLEAN NOT NULL DEFAULT true,
  push_enabled         BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start    TIME,               -- e.g. '22:00'
  quiet_hours_end      TIME,               -- e.g. '08:00'
  quiet_hours_tz       VARCHAR(50) DEFAULT 'UTC',
  email_freq_cap_hr    SMALLINT DEFAULT 10,
  push_freq_cap_hr     SMALLINT DEFAULT 20,
  muted_event_types    TEXT[] DEFAULT '{}'
);

-- Notifications inbox (in-app)
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  event_type  VARCHAR(100) NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  action_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  read_at     TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Delivery attempts log
CREATE TABLE delivery_attempts (
  id            SERIAL PRIMARY KEY,
  notification_id UUID REFERENCES notifications(id),
  channel       VARCHAR(20) NOT NULL,
  status        VARCHAR(20) NOT NULL,   -- sent | delivered | failed | bounced
  attempt_num   SMALLINT NOT NULL DEFAULT 1,
  error_message TEXT,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Web push subscriptions
CREATE TABLE push_subscriptions (
  id           SERIAL PRIMARY KEY,
  user_id      UUID NOT NULL,
  endpoint     TEXT NOT NULL UNIQUE,
  keys_p256dh  TEXT NOT NULL,
  keys_auth    TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Redis: frequency cap counters
-- nt:freq:{userId}:{channel}:{YYYYMMDDHH}  → INCR  TTL=3600
-- Redis Streams: notifications:events  → XADD * { type, userId, data, traceId }`,
    },

    apiDesign: {
      description: 'REST API for publishing events, reading the notification inbox, managing preferences, and admin operations. WebSocket for real-time in-app push.',
      endpoints: [
        { method: 'POST',   path: '/api/events',                         response: '{ eventId, queued: true } — publishes event to Redis Streams' },
        { method: 'GET',    path: '/api/notifications',                  response: 'Paginated inbox: [{ id, title, body, isRead, createdAt }], unreadCount' },
        { method: 'PUT',    path: '/api/notifications/:id/read',         response: '{ id, isRead: true, readAt }' },
        { method: 'PUT',    path: '/api/notifications/read-all',         response: '{ markedRead: N }' },
        { method: 'GET',    path: '/api/preferences',                    response: 'User\'s full preference object with channel toggles, quiet hours, caps' },
        { method: 'PUT',    path: '/api/preferences',                    response: 'Updated preferences; takes effect on next notification' },
        { method: 'POST',   path: '/api/push/subscribe',                 response: '{ subscriptionId } — registers browser push subscription' },
        { method: 'GET',    path: '/admin/stats',                        response: '{ sent24h, failed24h, deliveryRateByChannel, dlqDepth }' },
        { method: 'GET',    path: '/admin/dlq',                          response: 'Paginated DLQ entries with event, user, error, retryHistory' },
        { method: 'POST',   path: '/admin/dlq/:id/replay',               response: '{ replayed: true, newEventId }' },
        { method: 'WS',     path: '/ws/notifications',                   response: 'WebSocket: authenticated user receives real-time in-app notifications' },
      ],
    },

    codeExamples: {
      typescript: `// src/events/consumer.ts — Redis Streams consumer with ack and retry
import { redis } from '../redis/client';
import { routeEvent } from './router';

const STREAM_KEY    = 'notifications:events';
const GROUP_NAME    = 'notification-workers';
const CONSUMER_ID   = \`worker-\${process.pid}\`;
const BATCH_SIZE    = 10;
const BLOCK_MS      = 2000;  // block for 2s if stream is empty

// Create consumer group if it doesn't exist
await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '$', 'MKSTREAM')
  .catch(err => { if (!err.message.includes('BUSYGROUP')) throw err; });

export async function startConsumer(): Promise<never> {
  while (true) {
    // Read up to BATCH_SIZE undelivered messages
    const results = await redis.xreadgroup(
      'GROUP', GROUP_NAME, CONSUMER_ID,
      'COUNT', BATCH_SIZE,
      'BLOCK', BLOCK_MS,
      'STREAMS', STREAM_KEY, '>',
    ) as Array<[string, Array<[string, string[]]>]> | null;

    if (!results) continue; // blocked timeout, no messages

    for (const [, messages] of results) {
      for (const [messageId, fields] of messages) {
        const event = parseFields(fields);

        try {
          await routeEvent(event);
          // Acknowledge successful processing
          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
        } catch (err) {
          console.error('Failed to process event', messageId, err);
          // Do NOT ack — message stays in the PEL (pending entries list)
          // A separate reclaimer process will retry stale PEL messages
        }
      }
    }
  }
}

// Periodic reclaimer: re-process messages stuck in PEL > 30 seconds
export async function reclaimStalePEL(): Promise<void> {
  const pending = await redis.xautoclaim(
    STREAM_KEY, GROUP_NAME, CONSUMER_ID,
    30_000,    // min idle time in ms
    '0-0',     // start from the beginning
    'COUNT', 5,
  ) as { messages: Array<[string, string[]]> };

  for (const [messageId, fields] of pending.messages) {
    const event = parseFields(fields);
    try {
      await routeEvent(event);
      await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
    } catch {
      // Check retry count — move to DLQ if exhausted
      const retries = await redis.incr(\`nt:retries:\${messageId}\`);
      await redis.expire(\`nt:retries:\${messageId}\`, 86400);
      if (retries >= 4) {
        await moveToDeadLetter(messageId, event);
        await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
      }
    }
  }
}

function parseFields(fields: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
  return obj;
}`,
    },

    tradeoffDecisions: [
      {
        choice: 'Event bus: Redis Streams vs RabbitMQ vs Kafka',
        picked: 'Redis Streams',
        reason: 'Redis Streams provides consumer groups, acknowledgment, and persistent replay without a separate broker. For a project-scale notification system (thousands to tens of thousands of events/hour), Redis Streams is sufficient and much simpler to operate than Kafka or RabbitMQ. Kafka is better at millions of events/second with multi-month retention; RabbitMQ adds routing complexity. Redis Streams is the pragmatic choice for this scale.',
      },
      {
        choice: 'Template engine: Handlebars vs simple string interpolation vs React Server Components',
        picked: 'Handlebars',
        reason: 'Simple string interpolation (template literals) cannot handle conditionals, loops, or partials — needed for "you have 3 items in your cart" vs "you have 1 item." React Server Components are powerful but overkill for server-side email rendering. Handlebars is battle-tested for email templates with a safe sandbox (no arbitrary code execution), partials support, and a non-technical-friendly syntax for content editors.',
      },
      {
        choice: 'Quiet hours enforcement: strict (delay until window ends) vs drop',
        picked: 'Delay for critical, drop for informational',
        reason: 'Strictly delaying all notifications can cause a backlog that floods users when quiet hours end (waking up to 50 notifications). Dropping informational notifications (weekly digests, marketing) respects the user\'s intent. Critical notifications (payment failed, security alert) should be delayed until quiet hours end — users expect to see these even if slightly late. Severity is set per event type in the template definition.',
      },
      {
        choice: 'In-app notification storage: Redis vs PostgreSQL',
        picked: 'PostgreSQL for notifications, Redis for real-time delivery signal',
        reason: 'Redis is fast but volatile — losing Redis means losing the user\'s notification inbox. PostgreSQL provides durable storage with full queryability (filter by read status, date range, event type). Redis Pub/Sub is used as the real-time signal: "new notification ready" triggers the WebSocket push, but the actual notification data is fetched from PostgreSQL.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'Redis Streams Consumer Groups and the PEL',
        detail: 'When a consumer reads a message with XREADGROUP, the message is added to the Pending Entries List (PEL) for that consumer. It stays there until the consumer calls XACK. If the consumer crashes, messages remain in the PEL indefinitely. XAUTOCLAIM (Redis 6.2+) reclaims messages that have been in the PEL longer than a specified idle time — reassigning them to another consumer for retry. This is how at-least-once delivery is achieved without a separate retry queue.',
      },
      {
        topic: 'Web Push VAPID Authentication',
        detail: 'Web Push requires the server to identify itself to the push service (Google FCM, Mozilla Push, etc.) using VAPID (Voluntary Application Server Identification). Generate an EC key pair; the public key is sent to browsers during subscription, the private key signs push requests. The browser stores the subscription (endpoint URL + auth keys) which is passed to your server. Your server signs each push request with the private key — the push service verifies the signature before delivering.',
      },
      {
        topic: 'Email Deliverability and Bounce Handling',
        detail: 'Transactional email deliverability depends on SPF, DKIM, and DMARC DNS records. Use a dedicated sending domain (notifications.yourdomain.com). Handle bounce webhooks from your email provider: soft bounces (temporary, retry) vs hard bounces (invalid address, remove from list immediately). A high hard-bounce rate causes email providers to throttle or block your sending domain. Maintain a suppression list of bounced addresses.',
      },
      {
        topic: 'Notification Batching and Digest Modes',
        detail: 'For high-frequency events (e.g., 50 comment replies in 5 minutes), sending 50 individual notifications creates noise. Implement digest mode: buffer events for a user over a configurable window (e.g., 15 minutes), then send a single digest notification ("You have 50 new replies"). Use a Redis sorted set: ZADD digest:{userId}:{eventType} {score=timestamp} {eventId}. A scheduler triggers digest delivery when the window closes.',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Sending notifications synchronously in the request handler',
        why: 'If the notification send (email API call) fails or is slow, the user\'s request times out. The request handler should not depend on notification delivery for success.',
        solution: 'Publish the event to Redis Streams asynchronously (fire and forget from the request handler\'s perspective). The consumer processes it independently. The HTTP response returns immediately — the user\'s action succeeds regardless of notification delivery outcome.',
      },
      {
        pitfall: 'Not deduplicating notifications from event replays',
        why: 'Redis Streams guarantees at-least-once delivery. If a consumer processes an event but crashes before XACK, the event will be re-delivered. Without deduplication, the user receives duplicate notifications.',
        solution: 'Use a unique idempotency key per notification (hash of event_id + user_id + channel). Before inserting into the notifications table, check for existing records with that key. Use PostgreSQL INSERT ... ON CONFLICT DO NOTHING. This makes the delivery operation idempotent.',
      },
      {
        pitfall: 'Ignoring GDPR and notification consent',
        why: 'Sending marketing or optional notifications to users who have not consented (or who have unsubscribed) is a legal violation in many jurisdictions. It also damages trust.',
        solution: 'Maintain explicit consent records per event type and channel. Email unsubscribe links must work immediately and permanently. Push notification permissions are managed by the browser but also need server-side tracking. Marketing notifications require positive opt-in, not opt-out.',
      },
      {
        pitfall: 'Storing push subscription keys unencrypted',
        why: 'VAPID subscription keys (endpoint + p256dh + auth) allow anyone with access to send push notifications to the user\'s browser. A database breach exposes all user push endpoints.',
        solution: 'Encrypt p256dh and auth keys at rest using AES-256-GCM with a key stored in a secrets manager (AWS KMS, Vault). The endpoint URL itself is not sensitive (it does not enable sending without the auth key). Rotate VAPID keys periodically and invalidate old subscriptions.',
      },
    ],

    edgeCases: [
      {
        scenario: 'User deletes their account mid-delivery',
        impact: 'An in-flight notification is delivered to a deleted user\'s email or push endpoint. The notification is stored in a now-deleted user\'s inbox. If the deletion is hard-delete, foreign key constraints may cause the delivery to fail with a database error.',
        mitigation: 'Before each delivery attempt, verify the user still exists and has the channel enabled. Use soft deletion (deleted_at timestamp) rather than hard deletion to prevent FK constraint errors. On account deletion, cancel all pending notifications in the delivery queue for that user.',
      },
      {
        scenario: 'Push subscription endpoint becomes invalid',
        impact: 'Browser uninstall, cleared browser data, or permission revocation causes the push subscription to expire. Sending to an expired endpoint returns 410 Gone from the push service.',
        mitigation: 'On 410 response, immediately delete the subscription from the push_subscriptions table. On 429 or 503, retry with exponential backoff. On 401 (VAPID auth failure), regenerate VAPID keys and invalidate all subscriptions — users will re-subscribe when they next visit.',
      },
      {
        scenario: 'Quiet hours span midnight across timezones',
        impact: 'A user in Tokyo with quiet hours 22:00-08:00 JST. Stored as UTC: 13:00-23:00 UTC. A simple time comparison (current_hour < start OR current_hour > end) works for same-day windows but breaks when the window crosses midnight.',
        mitigation: 'Convert the current UTC time to the user\'s configured timezone before comparing. Use a timezone-aware library (luxon, date-fns-tz). For cross-midnight windows, check: if start > end, the quiet window wraps midnight — the user is in quiet hours when current_time >= start OR current_time < end.',
      },
      {
        scenario: 'Event processing worker is slower than event production rate',
        impact: 'The Redis Stream grows unboundedly as the consumer falls behind. Memory pressure on Redis. Users receive notifications hours after the triggering event — an order confirmation arriving 6 hours after checkout.',
        mitigation: 'Scale consumer workers horizontally using multiple consumer group members. Monitor stream lag (XPENDING count) and alert when it exceeds a threshold. For sudden spikes, shed low-priority event types (marketing, digest) to clear the backlog faster. Set MAXLEN on the stream to prevent unbounded growth.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How would you design the notification system to support millions of users?',
        answer: 'Partition the Redis Stream by user ID hash (stream-0 through stream-N for N partitions). Each partition has its own consumer group and worker pool. Use a PostgreSQL shard per user ID range, or move to a distributed database (CockroachDB, Vitess). Email delivery is inherently async and already scales via the email provider (Resend, SendGrid). Push notifications scale via the platform push services (FCM, APNs) which are highly available. The bottleneck at scale is in-app WebSocket connections — use a dedicated service (Pusher, Ably, or a custom WebSocket cluster with Redis Pub/Sub for cross-node delivery).',
      },
      {
        question: 'How do you handle notification ordering guarantees?',
        answer: 'Redis Streams preserve insertion order within a single stream. Consumer groups read in insertion order. If strict ordering per user is required, use a dedicated stream key per user (stream:{userId}) rather than a global stream. This ensures events for the same user are processed sequentially by one consumer at a time. The tradeoff is more stream keys to manage, but most users have very low event volume.',
      },
      {
        question: 'How would you implement a notification digest that batches events over 15 minutes?',
        answer: 'On event arrival, add the event to a Redis Sorted Set keyed by user and event category (ZADD digest:{userId}:{category} {timestamp} {eventId}). Use a separate scheduler process (node-cron or BullMQ repeatable job) that runs every minute, scans for digest windows that have elapsed, fetches the batched event IDs, renders a summary template, delivers the digest notification, and clears the sorted set. Users who interact within the window (open the app) can get an immediate delivery instead of waiting for the digest.',
      },
      {
        question: 'What metrics would you monitor for this system?',
        answer: 'Delivery metrics: events_published/min, notifications_delivered/min, delivery_rate per channel (delivered / sent), p99 delivery latency (event publish to delivery). Reliability metrics: DLQ depth, retry rate, consumer lag (stream depth). User engagement: notification open rate, click-through rate, unsubscribe rate per event type. Infrastructure: Redis Stream memory usage, WebSocket connection count, database query latency for inbox queries.',
      },
    ],

    extensionIdeas: [
      { idea: 'Notification center UI with filtering and search', difficulty: 'beginner', description: 'Build a full-page notification inbox (like GitHub Notifications) with filtering by read/unread status, event type, and date. Add full-text search across notification titles and bodies. Bulk actions: mark all read, archive, delete. Show unread count badge in the app header.' },
      { idea: 'Smart notification scheduling with ML', difficulty: 'advanced', description: 'Train a model on user engagement data (open times, click rates by hour) to predict the optimal delivery time for non-urgent notifications. Instead of sending at event time, schedule delivery for the hour when the user is most likely to engage. Retrain the model weekly per user.' },
      { idea: 'Notification A/B testing framework', difficulty: 'intermediate', description: 'Support multiple template variants per event type and channel. Randomly assign users to variant groups. Track open rate, click rate, and conversion rate per variant. Automatically promote the winning variant after reaching statistical significance. Build an admin UI for managing experiments.' },
      { idea: 'Multi-tenant notification routing', difficulty: 'intermediate', description: 'Extend the system to serve multiple applications (tenants) from a single platform. Each tenant has its own event types, templates, VAPID keys, and sending domain. Tenant isolation: one tenant\'s event storm cannot delay another\'s notifications. Build a tenant portal for managing templates, viewing delivery stats, and configuring channel settings.' },
    ],
  },
};
