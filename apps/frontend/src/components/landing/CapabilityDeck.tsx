import { useEffect, useState } from 'react';

const ACCENT = 'var(--cam-primary)';
const DANGER = '#EF4444';
const SUCCESS = 'var(--accent)';
const MONO = "'Source Code Pro', monospace";
const DISPLAY = "'Source Sans 3', sans-serif";

type SceneId = 'live' | 'company' | 'code' | 'design' | 'prep' | 'score';
const SCENES: SceneId[] = ['live', 'company', 'code', 'design', 'prep', 'score'];
const SCENE_MS = 5600;

const SCENE_LABEL: Record<SceneId, { eyebrow: string; title: string; hint: string }> = {
  live:    { eyebrow: 'Live interview assistant',    title: 'Voice → AI, in 0.3s',            hint: 'Transcribe, reason, answer — while you talk.' },
  company: { eyebrow: 'Company-specific prep',       title: 'The whole loop, per company',    hint: 'HR · Hiring Manager · Coding · Design · Behavioral.' },
  code:    { eyebrow: 'Coding — 3 approaches',       title: 'Brute · Optimal · Space-tight',  hint: '50+ languages. Follow-ups included.' },
  design:  { eyebrow: 'Multi-cloud architecture',    title: 'AWS · GCP · Azure',              hint: 'Same design, every cloud, rendered live.' },
  prep:    { eyebrow: 'Complete design problem',     title: 'Every card, every angle',        hint: 'Requirements → capacity → API → data.' },
  score:   { eyebrow: 'AI-scored mock interviews',   title: 'Grade every dimension',          hint: 'Communication · Accuracy · Code quality.' },
};

export default function CapabilityDeck() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [pulse, setPulse] = useState(0);
  const scene = SCENES[sceneIdx];

  useEffect(() => {
    const t = setInterval(() => setSceneIdx((i) => (i + 1) % SCENES.length), SCENE_MS);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { setPulse((p) => p + 1); }, [sceneIdx]);

  const meta = SCENE_LABEL[scene];

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(180deg, #0B1220 0%, var(--cam-void) 100%)',
        border: '1px solid #1E293B',
        boxShadow: '0 30px 80px -20px rgba(15,23,42,0.4), 0 12px 30px -10px rgba(15,23,42,0.25)',
        minHeight: 560,
      }}
    >
      <style>{`
        @keyframes cd-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.82); } }
        @keyframes cd-wave { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
        @keyframes cd-type { from { width: 0; } to { width: 100%; } }
        @keyframes cd-blink { 50% { opacity: 0; } }
        @keyframes cd-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cd-scan { 0% { transform: translateY(-30%); opacity: 0; } 40%,60% { opacity: 1; } 100% { transform: translateY(130%); opacity: 0; } }
        @keyframes cd-draw { to { stroke-dashoffset: 0; } }
        @keyframes cd-pop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes cd-gauge { to { stroke-dashoffset: var(--cd-offset); } }
        @keyframes cd-count-up { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes cd-grid-drift { 0% { transform: translate(0,0); } 100% { transform: translate(48px,48px); } }
        @keyframes cd-glow-ring { 0% { box-shadow: 0 0 0 0 rgba(38,97,156,0.33); } 80%,100% { box-shadow: 0 0 0 18px rgba(38,97,156,0); } }
        @keyframes cd-provider-sweep { 0% { left: 0; } 33% { left: calc(33.333% + 4px); } 66% { left: calc(66.666% + 8px); } 100% { left: 0; } }
        .cd-cursor { display:inline-block; width:2px; height:14px; background:#E2E8F0; vertical-align:text-bottom; margin-left:1px; animation: cd-blink 0.9s step-end infinite; }
      `}</style>

      {/* Grid background */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          animation: 'cd-grid-drift 32s linear infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Top chrome */}
      <div
        className="relative flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid #1E293B', background: 'rgba(11,18,32,0.6)', backdropFilter: 'blur(12px)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: DANGER, animation: 'cd-pulse 1.1s ease-in-out infinite' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: DANGER, fontFamily: MONO, letterSpacing: '0.2em' }}>LIVE</span>
        <div className="w-px h-4" style={{ background: '#1E293B' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: '#CBD5E1', fontFamily: MONO, letterSpacing: '0.2em' }}>CAMORA · AI COPILOT</span>
        <div className="flex-1" />
        <span style={{ fontSize: 10, color: '#64748B', fontFamily: MONO }}>
          latency&nbsp;<span style={{ color: ACCENT, fontWeight: 700 }}>0.3s</span>
        </span>
      </div>

      {/* Scene title */}
      <div className="relative px-6 pt-6 pb-3">
        <div key={`eyebrow-${pulse}`} style={{ fontSize: 10, fontWeight: 800, color: ACCENT, fontFamily: MONO, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0, animation: 'cd-fade-up 0.4s ease-out 0s forwards' }}>
          {meta.eyebrow}
        </div>
        <h3 key={`title-${pulse}`} style={{ marginTop: 6, fontSize: 24, fontWeight: 800, color: '#F8FAFC', fontFamily: DISPLAY, letterSpacing: '-0.015em', lineHeight: 1.15, opacity: 0, animation: 'cd-fade-up 0.5s ease-out 0.08s forwards' }}>
          {meta.title}
        </h3>
        <p key={`hint-${pulse}`} style={{ marginTop: 6, fontSize: 13, color: '#94A3B8', fontFamily: DISPLAY, opacity: 0, animation: 'cd-fade-up 0.5s ease-out 0.16s forwards' }}>
          {meta.hint}
        </p>
      </div>

      {/* Stage */}
      <div className="relative px-6 pb-5" style={{ minHeight: 320 }}>
        {scene === 'live'    && <SceneLive    key={`live-${pulse}`} />}
        {scene === 'company' && <SceneCompany key={`company-${pulse}`} />}
        {scene === 'code'    && <SceneCode    key={`code-${pulse}`} />}
        {scene === 'design'  && <SceneDesign  key={`design-${pulse}`} />}
        {scene === 'prep'    && <ScenePrep    key={`prep-${pulse}`} />}
        {scene === 'score'   && <SceneScore   key={`score-${pulse}`} />}
      </div>

      {/* Bottom chrome */}
      <div className="relative flex items-center gap-4 px-6 py-4" style={{ borderTop: '1px solid #1E293B', background: 'rgba(11,18,32,0.6)' }}>
        <div className="flex items-center gap-2">
          {SCENES.map((s, i) => (
            <span
              key={s}
              style={{
                width: i === sceneIdx ? 24 : 6,
                height: 6, borderRadius: 999,
                background: i === sceneIdx ? ACCENT : '#334155',
                transition: 'width 0.35s ease, background 0.35s ease',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#64748B', fontFamily: MONO, letterSpacing: '0.15em' }}>
          {String(sceneIdx + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}
        </span>
        <div className="flex-1" />
        <span style={{ fontSize: 10, color: '#475569', fontFamily: MONO, letterSpacing: '0.14em' }}>
          APPLY · PREPARE · PRACTICE · ATTEND
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────── 1. LIVE ──────────────────────── */
function SceneLive() {
  const [typed, setTyped] = useState(0);
  const Q = 'Design a distributed rate limiter for 10M RPS.';
  useEffect(() => {
    if (typed >= Q.length) return;
    const t = setTimeout(() => setTyped((c) => c + 1), 24);
    return () => clearTimeout(t);
  }, [typed]);
  const chips = ['Redis Cluster', 'Token Bucket', 'Sliding Window', 'Consistent Hashing'];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr] gap-3 sm:gap-5" style={{ marginTop: 8 }}>
      <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
        <div className="flex items-center gap-2 mb-3">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: DANGER, animation: 'cd-pulse 1.1s ease-in-out infinite' }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: DANGER, fontFamily: MONO, letterSpacing: '0.18em' }}>TRANSCRIBING</span>
          <div className="ml-auto flex items-center gap-[2px] h-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ display: 'block', width: 2, height: '100%', borderRadius: 1, background: DANGER, transformOrigin: 'center', animation: `cd-wave ${0.8 + (i % 5) * 0.12}s ease-in-out ${(i % 6) * 0.06}s infinite` }} />
            ))}
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#E2E8F0', fontFamily: DISPLAY, lineHeight: 1.6, minHeight: 84 }}>
          &ldquo;{Q.slice(0, typed)}
          {typed < Q.length && <span className="cd-cursor" />}
          {typed >= Q.length && '”'}
        </p>
      </div>
      <div style={{ background: 'linear-gradient(180deg, rgba(38,97,156,0.08), rgba(38,97,156,0.02))', border: '1px solid rgba(38,97,156,0.20)', borderRadius: 10, padding: 14, position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 40, background: 'linear-gradient(180deg, transparent, rgba(38,97,156,0.15), transparent)', animation: 'cd-scan 2.6s ease-in-out 0.8s infinite', pointerEvents: 'none' }} />
        <div className="flex items-center gap-2 mb-3">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: ACCENT, fontFamily: MONO, letterSpacing: '0.18em' }}>AI · RESPONSE</span>
          <span style={{ marginLeft: 'auto', fontSize: 9, color: '#64748B', fontFamily: MONO }}>streaming…</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span key={c} style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: 'rgba(38,97,156,0.07)', border: '1px solid rgba(38,97,156,0.20)', padding: '4px 10px', borderRadius: 999, fontFamily: MONO, opacity: 0, animation: `cd-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) ${1.2 + i * 0.24}s forwards` }}>
              {c}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: '#94A3B8', fontFamily: DISPLAY, lineHeight: 1.6, opacity: 0, animation: 'cd-fade-up 0.45s ease-out 2.4s forwards' }}>
          Use a <span style={{ color: ACCENT, fontWeight: 700 }}>sliding-window counter</span> in Redis for bursty traffic; fall back to token bucket at gateway for baseline limits.
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── 2. COMPANY — full-loop per company ──────────────────────── */
function SceneCompany() {
  type Co = 'GOOGLE' | 'META' | 'AMAZON' | 'APPLE' | 'MICROSOFT' | 'NETFLIX';
  const COS: Co[] = ['GOOGLE', 'META', 'AMAZON', 'APPLE', 'MICROSOFT', 'NETFLIX'];
  const [coIdx, setCoIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCoIdx((i) => (i + 1) % COS.length), 1600);
    return () => clearInterval(t);
  }, []);
  const co = COS[coIdx];

  // Flavor text per company — one distinctive detail each
  const FLAVOR: Record<Co, string> = {
    GOOGLE:    'Googleyness · Leadership · Navigating Ambiguity',
    META:      'Execution Speed · Disagree & Commit · Move Fast',
    AMAZON:    '16 Leadership Principles · Customer Obsession',
    APPLE:     'Craft · Taste · Functional expertise deep-dive',
    MICROSOFT: 'Growth Mindset · Model · Coach · Care',
    NETFLIX:   'Sunshine feedback · Keeper test · Context not control',
  };

  const STAGES = [
    { n: '01', label: 'HR SCREEN',        dur: '30 min', detail: 'Tell me about yourself · Values · Past projects' },
    { n: '02', label: 'HIRING MANAGER',   dur: '45 min', detail: 'Role deep-dive · Scope & impact · Why us' },
    { n: '03', label: 'CODING',           dur: '60 min', detail: '2–3 problems · Graph / Tree / DP · Whiteboard' },
    { n: '04', label: 'SYSTEM DESIGN',    dur: '60 min', detail: 'Scalable service · Trade-offs · Deep dives' },
    { n: '05', label: 'BEHAVIORAL',       dur: '45 min', detail: 'Leadership · Conflict · Company LPs' },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      {/* Company tabs */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {COS.map((c, i) => (
          <span key={c} style={{
            fontSize: 9, fontWeight: 800,
            color: i === coIdx ? '#0B1220' : '#64748B',
            background: i === coIdx ? ACCENT : 'transparent',
            border: `1px solid ${i === coIdx ? ACCENT : '#1E293B'}`,
            padding: '4px 10px', borderRadius: 999, fontFamily: MONO, letterSpacing: '0.16em',
            transition: 'all 0.35s',
          }}>
            {c}
          </span>
        ))}
      </div>

      {/* Flavor line */}
      <div key={co} style={{ fontSize: 11, color: '#94A3B8', fontFamily: DISPLAY, marginBottom: 10, opacity: 0, animation: 'cd-fade-up 0.35s ease-out 0.05s forwards' }}>
        <span style={{ color: ACCENT, fontWeight: 700, letterSpacing: '0.1em', fontFamily: MONO, fontSize: 10 }}>{co} LOOP · </span>
        {FLAVOR[co]}
      </div>

      {/* 5 stages stacked */}
      <div style={{ background: 'rgba(30,41,59,0.35)', border: '1px solid #1E293B', borderRadius: 10, overflow: 'hidden' }}>
        {STAGES.map((s, i) => (
          <div key={s.n} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px',
            borderBottom: i < STAGES.length - 1 ? '1px solid #1E293B' : 'none',
            opacity: 0, animation: `cd-fade-up 0.35s ease-out ${0.15 + i * 0.12}s forwards`,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 800, color: ACCENT, fontFamily: MONO,
              background: 'rgba(38,97,156,0.08)', border: '1px solid rgba(38,97,156,0.33)',
              padding: '3px 6px', borderRadius: 4, letterSpacing: '0.14em',
            }}>
              {s.n}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#F8FAFC', fontFamily: MONO, letterSpacing: '0.16em', minWidth: 130 }}>
              {s.label}
            </span>
            <span style={{ fontSize: 10, color: '#64748B', fontFamily: MONO, letterSpacing: '0.08em', minWidth: 54 }}>
              {s.dur}
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: DISPLAY, lineHeight: 1.4, flex: 1 }}>
              {s.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────── 3. CODE — 3 APPROACHES + FOLLOW-UP ──────────────────────── */
function SceneCode() {
  const APPROACHES = [
    { label: 'Brute Force',   cx: 'O(n²)',  lines: [
      { t: 'def two_sum(nums, target):', c: 'var(--accent)' },
      { t: '  for i in range(len(nums)):', c: '#E2E8F0' },
      { t: '    for j in range(i+1, len(nums)):', c: '#E2E8F0' },
      { t: '      if nums[i] + nums[j] == target:', c: 'var(--text-muted)' },
      { t: '        return [i, j]', c: SUCCESS },
    ]},
    { label: 'Optimal · Hash', cx: 'O(n)',  lines: [
      { t: 'def two_sum(nums, target):', c: 'var(--accent)' },
      { t: '  seen = {}', c: '#E2E8F0' },
      { t: '  for i, n in enumerate(nums):', c: '#E2E8F0' },
      { t: '    if target - n in seen:', c: 'var(--text-muted)' },
      { t: '      return [seen[target - n], i]', c: SUCCESS },
      { t: '    seen[n] = i', c: '#E2E8F0' },
    ]},
    { label: 'Space-Tight',    cx: 'O(n log n)', lines: [
      { t: 'def two_sum(nums, target):', c: 'var(--accent)' },
      { t: '  idx = sorted(range(len(nums)), key=lambda i: nums[i])', c: '#E2E8F0' },
      { t: '  l, r = 0, len(nums) - 1', c: '#E2E8F0' },
      { t: '  while l < r:', c: 'var(--text-muted)' },
      { t: '    s = nums[idx[l]] + nums[idx[r]]', c: '#E2E8F0' },
      { t: '    if s == target: return [idx[l], idx[r]]', c: SUCCESS },
    ]},
  ];

  const [tab, setTab] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTab((x) => (x + 1) % APPROACHES.length), 1900);
    return () => clearInterval(t);
  }, []);
  const active = APPROACHES[tab];

  return (
    <div style={{ marginTop: 8 }}>
      {/* Approach tabs */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {APPROACHES.map((a, i) => (
          <span key={a.label} style={{
            fontSize: 10, fontWeight: 700,
            color: i === tab ? ACCENT : '#64748B',
            background: i === tab ? 'rgba(38,97,156,0.08)' : 'transparent',
            border: `1px solid ${i === tab ? 'rgba(38,97,156,0.33)' : '#1E293B'}`,
            padding: '4px 10px', borderRadius: 6, fontFamily: MONO, letterSpacing: '0.08em',
            transition: 'all 0.3s',
          }}>
            {i + 1}. {a.label} · {a.cx}
          </span>
        ))}
      </div>

      {/* Editor */}
      <div style={{ background: '#020617', border: '1px solid #1E293B', borderRadius: 10, overflow: 'hidden', fontFamily: MONO }}>
        <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: '1px solid #1E293B' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#334155' }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#334155' }} />
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#334155' }} />
          <span style={{ marginLeft: 8, fontSize: 10, color: '#475569' }}>two_sum.py</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: ACCENT, fontWeight: 700 }}>● {active.label}</span>
        </div>
        <div className="p-3" style={{ fontSize: 12, lineHeight: 1.7, minHeight: 132 }}>
          {active.lines.map((l, i) => (
            <div key={`${tab}-${i}`} style={{
              color: l.c, whiteSpace: 'nowrap', overflow: 'hidden',
              opacity: 0, animation: `cd-fade-up 0.25s ease-out ${i * 0.12}s forwards, cd-type 0.4s steps(44, end) ${i * 0.12}s both`,
            }}>
              {l.t}
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up question chip */}
      <div style={{ marginTop: 10, opacity: 0, animation: 'cd-fade-up 0.4s ease-out 0.9s forwards' }}>
        <div className="flex items-start gap-2">
          <span style={{ fontSize: 9, fontWeight: 800, color: ACCENT, fontFamily: MONO, letterSpacing: '0.16em', marginTop: 2 }}>
            FOLLOW-UP
          </span>
          <p style={{ fontSize: 12, color: '#CBD5E1', fontFamily: DISPLAY, lineHeight: 1.55, flex: 1 }}>
            &ldquo;How would you extend this to return <em>all</em> pairs that sum to the target, not just the first?&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── 3. DESIGN — AWS/GCP/Azure cycling ──────────────────────── */
function SceneDesign() {
  type Cloud = 'AWS' | 'GCP' | 'AZURE';
  const PROVIDERS: Cloud[] = ['AWS', 'GCP', 'AZURE'];
  const [provIdx, setProvIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setProvIdx((i) => (i + 1) % PROVIDERS.length), 1900);
    return () => clearInterval(t);
  }, []);
  const prov = PROVIDERS[provIdx];

  // Same design, different provider node labels
  const LABELS: Record<Cloud, { lb: string; api: string; cache: string; db: string; queue: string; blob: string }> = {
    AWS:   { lb: 'ALB',     api: 'LAMBDA', cache: 'ELASTICACHE', db: 'RDS',       queue: 'SQS',      blob: 'S3' },
    GCP:   { lb: 'GLB',     api: 'CLOUD RUN', cache: 'MEMORYSTORE', db: 'CLOUD SQL', queue: 'PUB/SUB', blob: 'GCS' },
    AZURE: { lb: 'APP GW',  api: 'FUNCTIONS', cache: 'AZURE CACHE', db: 'SQL DB',    queue: 'SVC BUS', blob: 'BLOB' },
  };
  const L = LABELS[prov];

  const nodes = [
    { id: 'cli', x: 20, y: 84, w: 72, h: 30, label: 'CLIENT', filled: false, delay: 0.0 },
    { id: 'lb',  x: 150, y: 84, w: 76, h: 30, label: L.lb, filled: false, delay: 0.25 },
    { id: 'api', x: 282, y: 84, w: 84, h: 30, label: L.api, filled: true, delay: 0.5 },
    { id: 'cache', x: 422, y: 40, w: 110, h: 28, label: L.cache, filled: false, delay: 0.8 },
    { id: 'db',  x: 422, y: 130, w: 110, h: 28, label: L.db, filled: false, delay: 1.05 },
    { id: 'q',   x: 282, y: 180, w: 84, h: 26, label: L.queue, filled: false, delay: 1.35 },
    { id: 'blob',x: 422, y: 180, w: 110, h: 26, label: L.blob, filled: false, delay: 1.6 },
  ];
  const edges = [
    { x1: 92, y1: 99, x2: 150, y2: 99, d: 0.1 },
    { x1: 226, y1: 99, x2: 282, y2: 99, d: 0.35 },
    { x1: 366, y1: 92, x2: 422, y2: 56, d: 0.65 },
    { x1: 366, y1: 107, x2: 422, y2: 144, d: 0.9 },
    { x1: 324, y1: 114, x2: 324, y2: 180, d: 1.2 },
    { x1: 366, y1: 193, x2: 422, y2: 193, d: 1.45 },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      {/* Provider tabs */}
      <div className="relative flex items-center gap-1.5 mb-3">
        {PROVIDERS.map((p, i) => (
          <span key={p} style={{
            fontSize: 10, fontWeight: 800,
            color: i === provIdx ? '#0B1220' : '#94A3B8',
            background: i === provIdx ? ACCENT : 'transparent',
            border: `1px solid ${i === provIdx ? ACCENT : '#1E293B'}`,
            padding: '4px 14px', borderRadius: 6, fontFamily: MONO, letterSpacing: '0.18em',
            transition: 'all 0.35s',
          }}>
            {p}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: ACCENT, fontWeight: 700, fontFamily: MONO, letterSpacing: '0.12em' }}>
          re-rendered in 1.1s
        </span>
      </div>

      <svg viewBox="0 0 560 230" width="100%" height="230" style={{ background: 'rgba(30,41,59,0.35)', border: '1px solid #1E293B', borderRadius: 10 }} key={prov}>
        <defs>
          <marker id={`cd-arr-${prov}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={ACCENT} />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1) + 6;
          return (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={ACCENT} strokeWidth="1.5" markerEnd={`url(#cd-arr-${prov})`}
              style={{ strokeDasharray: len, strokeDashoffset: len, animation: `cd-draw 0.5s ease-out ${e.d}s forwards` }}
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.id} style={{ opacity: 0, animation: `cd-pop 0.35s ease-out ${n.delay}s forwards` }}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="5"
              fill={n.filled ? ACCENT : 'var(--cam-void)'}
              stroke={n.filled ? ACCENT : '#334155'} strokeWidth="1.3" />
            <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 4} textAnchor="middle" fontSize="9.5" fontWeight="800"
              fill={n.filled ? '#0B1220' : '#CBD5E1'} fontFamily={MONO} letterSpacing="0.5">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ──────────────────────── 4. PREP — complete design problem card ──────────────────────── */
function ScenePrep() {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ background: 'rgba(30,41,59,0.35)', border: '1px solid #1E293B', borderRadius: 10, padding: 14 }}>
        {/* Problem header */}
        <div className="flex items-baseline gap-3 pb-3 mb-4" style={{ borderBottom: '1px solid #1E293B', opacity: 0, animation: 'cd-fade-up 0.4s ease-out 0s forwards' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT, fontFamily: MONO, letterSpacing: '0.18em' }}>SYSTEM DESIGN</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#F8FAFC', fontFamily: DISPLAY, letterSpacing: '-0.01em' }}>
            Design a URL Shortener
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94A3B8', fontFamily: MONO }}>Medium · 14 sections</span>
        </div>

        {/* 2×2 mini cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Functional Reqs */}
          <div style={{ opacity: 0, animation: 'cd-fade-up 0.4s ease-out 0.15s forwards' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', fontFamily: MONO, letterSpacing: '0.16em', marginBottom: 6 }}>
              FUNCTIONAL REQS
            </div>
            {['Shorten long URL', 'Redirect 301/302', 'Custom aliases', 'Analytics'].map((r, i) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11, color: '#CBD5E1', fontFamily: DISPLAY, opacity: 0, animation: `cd-fade-up 0.3s ease-out ${0.3 + i * 0.09}s forwards` }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT }} />
                {r}
              </div>
            ))}
          </div>

          {/* Capacity Planning */}
          <div style={{ opacity: 0, animation: 'cd-fade-up 0.4s ease-out 0.25s forwards' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', fontFamily: MONO, letterSpacing: '0.16em', marginBottom: 6 }}>
              CAPACITY PLANNING
            </div>
            {[
              { k: 'DAU',        v: '100M' },
              { k: 'Writes/s',   v: '1.2K' },
              { k: 'Reads/s',    v: '120K' },
              { k: 'Storage',    v: '5 TB / yr' },
            ].map((m, i) => (
              <div key={m.k} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '3px 0', fontSize: 11, fontFamily: MONO, opacity: 0, animation: `cd-fade-up 0.3s ease-out ${0.45 + i * 0.09}s forwards` }}>
                <span style={{ color: '#64748B' }}>{m.k}</span>
                <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{m.v}</span>
              </div>
            ))}
          </div>

          {/* API Design */}
          <div style={{ opacity: 0, animation: 'cd-fade-up 0.4s ease-out 0.45s forwards' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', fontFamily: MONO, letterSpacing: '0.16em', marginBottom: 6 }}>
              API DESIGN
            </div>
            {[
              { m: 'POST', p: '/shorten' },
              { m: 'GET',  p: '/{code}' },
              { m: 'GET',  p: '/{code}/stats' },
            ].map((e, i) => (
              <div key={e.p} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', opacity: 0, animation: `cd-fade-up 0.3s ease-out ${0.6 + i * 0.1}s forwards` }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: e.m === 'POST' ? ACCENT : '#94A3B8', fontFamily: MONO, padding: '1px 5px', border: `1px solid ${e.m === 'POST' ? 'rgba(38,97,156,0.33)' : '#334155'}`, borderRadius: 3, letterSpacing: '0.1em' }}>
                  {e.m}
                </span>
                <code style={{ fontSize: 11, color: '#CBD5E1', fontFamily: MONO }}>{e.p}</code>
              </div>
            ))}
          </div>

          {/* Data Model */}
          <div style={{ opacity: 0, animation: 'cd-fade-up 0.4s ease-out 0.55s forwards' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', fontFamily: MONO, letterSpacing: '0.16em', marginBottom: 6 }}>
              DATA MODEL · urls
            </div>
            {[
              { f: 'id',         t: 'BIGINT PK' },
              { f: 'short_code', t: 'VARCHAR(8)' },
              { f: 'long_url',   t: 'TEXT' },
              { f: 'created_at', t: 'TIMESTAMP' },
            ].map((f, i) => (
              <div key={f.f} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '2.5px 0', fontSize: 11, fontFamily: MONO, opacity: 0, animation: `cd-fade-up 0.3s ease-out ${0.7 + i * 0.09}s forwards` }}>
                <span style={{ color: '#CBD5E1' }}>{f.f}</span>
                <span style={{ color: '#64748B' }}>{f.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid #1E293B', opacity: 0, animation: 'cd-fade-up 0.4s ease-out 1.2s forwards' }}>
          <span style={{ fontSize: 10, color: '#64748B', fontFamily: MONO, letterSpacing: '0.1em' }}>
            Requirements · Capacity · Architecture · API · Data · Trade-offs · Edge Cases · Interview Follow-ups
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: ACCENT, fontWeight: 700, fontFamily: MONO }}>14 / 14 ✓</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── 5. SCORE ──────────────────────── */
function SceneScore() {
  const R = 26;
  const C = 2 * Math.PI * R;
  const gauges = [
    { label: 'COMMUNICATION', score: 92, delay: 0.2 },
    { label: 'CODE QUALITY',  score: 95, delay: 0.5 },
    { label: 'SYSTEM DESIGN', score: 88, delay: 0.8 },
  ];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ background: 'rgba(30,41,59,0.35)', border: '1px solid #1E293B', borderRadius: 10, padding: 20 }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {gauges.map((g) => {
            const offset = C - (C * g.score) / 100;
            return (
              <div key={g.label} className="flex flex-col items-center">
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r={R} fill="none" stroke="#1E293B" strokeWidth="5" />
                  <circle cx="36" cy="36" r={R} fill="none" stroke={ACCENT} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={C} transform="rotate(-90 36 36)"
                    style={{ strokeDashoffset: C, animation: `cd-gauge 1.1s cubic-bezier(0.22,1,0.36,1) ${g.delay}s forwards`, ['--cd-offset' as any]: offset } as React.CSSProperties}
                  />
                  <text x="36" y="40" textAnchor="middle" fontSize="16" fontWeight="800" fill="#F8FAFC" fontFamily={MONO}
                    style={{ opacity: 0, animation: `cd-count-up 0.4s ease-out ${g.delay + 0.25}s forwards` }}>
                    {g.score}
                  </text>
                </svg>
                <span style={{ marginTop: 8, fontSize: 9, fontWeight: 800, color: '#94A3B8', fontFamily: MONO, letterSpacing: '0.15em', opacity: 0, animation: `cd-fade-up 0.3s ease-out ${g.delay + 0.4}s forwards` }}>
                  {g.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: '1px solid #1E293B', opacity: 0, animation: 'cd-fade-up 0.4s ease-out 1.7s forwards' }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748B', fontFamily: MONO, letterSpacing: '0.18em' }}>OVERALL</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F8FAFC', fontFamily: DISPLAY, letterSpacing: '-0.015em', lineHeight: 1, marginTop: 4 }}>
              92<span style={{ color: '#475569', fontSize: 18, fontWeight: 700 }}>&nbsp;/&nbsp;100</span>
            </div>
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 999, background: 'rgba(38,97,156,0.08)', border: '1px solid rgba(38,97,156,0.33)', fontSize: 11, fontWeight: 800, color: ACCENT, fontFamily: MONO, letterSpacing: '0.14em', animation: 'cd-glow-ring 1.6s ease-out 2s infinite' }}>
            READY FOR FAANG
          </div>
        </div>
      </div>
    </div>
  );
}
