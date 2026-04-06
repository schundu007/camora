import { useState } from 'react';

// ─── Data ────────────────────────────────────────────────────────────────────

const COMPETITORS_META = {
  ascend:          { name: 'Ascend',           price: '$29-99',  priceNote: '/mo',        category: 'ours' },
  lumora:          { name: 'Lumora',           price: '$49',     priceNote: '/mo',        category: 'ours' },
  interviewCoder:  { name: 'InterviewCoder',   price: '$299',    priceNote: '/mo',        category: 'live-ai' },
  interviewBee:    { name: 'InterviewBee',     price: '???',     priceNote: 'hidden',     category: 'live-ai' },
  educative:       { name: 'Educative',        price: '$59-99',  priceNote: '/mo',        category: 'prep' },
  designGurus:     { name: 'DesignGurus',      price: '$119',    priceNote: '/mo',        category: 'prep' },
  algoExpert:      { name: 'AlgoExpert',       price: '$99',     priceNote: '/yr',        category: 'prep' },
  exponent:        { name: 'Exponent',         price: '$99',     priceNote: '/mo',        category: 'prep' },
  interviewingIo:  { name: 'Interviewing.io',  price: '$100-250',priceNote: '/session',   category: 'prep' },
};

const FEATURES = [
  // ── Live Interview AI ──
  { name: 'Real-time AI during live interviews', cat: 'live', highlight: true,
    vals: { ascend: false, lumora: true, interviewCoder: true, interviewBee: true, educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false } },
  { name: 'System audio capture (hear interviewer)', cat: 'live', highlight: true,
    vals: { ascend: false, lumora: true, interviewCoder: true, interviewBee: false, educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false } },
  { name: 'Emergency blank screen (Cmd+B)', cat: 'live',
    vals: { ascend: false, lumora: true, interviewCoder: true, interviewBee: false, educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false } },
  { name: 'Pre-interview mic check', cat: 'live', highlight: true,
    vals: { ascend: false, lumora: true, interviewCoder: false, interviewBee: false, educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false } },
  // ── Coding ──
  { name: '3-approach coding solutions', cat: 'coding', highlight: true,
    vals: { ascend: true, lumora: true, interviewCoder: false, interviewBee: false, educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false } },
  { name: '51 programming languages', cat: 'coding', highlight: true,
    vals: { ascend: true, lumora: true, interviewCoder: 'Limited', interviewBee: false, educative: 'Few', designGurus: 'Few', algoExpert: '9 langs', exponent: false, interviewingIo: false } },
  { name: 'Code execution & auto-fix', cat: 'coding',
    vals: { ascend: true, lumora: true, interviewCoder: false, interviewBee: false, educative: 'Run only', designGurus: false, algoExpert: 'Run only', exponent: false, interviewingIo: false } },
  // ── System Design ──
  { name: 'System design with architecture diagrams', cat: 'design', highlight: true,
    vals: { ascend: true, lumora: true, interviewCoder: false, interviewBee: false, educative: 'Text only', designGurus: 'Text only', algoExpert: false, exponent: 'Text only', interviewingIo: false } },
  // ── Behavioral ──
  { name: 'Behavioral STAR format', cat: 'behavioral',
    vals: { ascend: true, lumora: true, interviewCoder: false, interviewBee: false, educative: false, designGurus: false, algoExpert: false, exponent: true, interviewingIo: false } },
  // ── Platform ──
  { name: 'Mock interview rehearsal', cat: 'platform',
    vals: { ascend: true, lumora: true, interviewCoder: false, interviewBee: false, educative: false, designGurus: false, algoExpert: false, exponent: true, interviewingIo: true } },
  { name: 'Desktop app (stealth mode)', cat: 'platform',
    vals: { ascend: true, lumora: true, interviewCoder: true, interviewBee: false, educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false } },
  { name: 'Combined prep + live interview AI', cat: 'platform', highlight: true,
    vals: { ascend: true, lumora: true, interviewCoder: false, interviewBee: false, educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false } },
];

const CATEGORY_LABELS = {
  live: 'Live Interview AI',
  coding: 'Coding',
  design: 'System Design',
  behavioral: 'Behavioral',
  platform: 'Platform',
};

const SAVINGS = [
  { vs: 'InterviewCoder', save: '$250/mo', note: 'Same live AI features, more coverage, fraction of the price' },
  { vs: 'Interviewing.io', save: '$51-201/session', note: 'Unlimited monthly access vs per-session billing' },
  { vs: 'DesignGurus', save: '$70/mo', note: 'We include real architecture diagrams they don\'t even offer' },
  { vs: 'Exponent', save: '$50/mo', note: 'We cover coding + design + behavioral, not just PM prep' },
];

const TAGLINES = [
  { headline: 'Why pay $299 for half the features?', body: 'Lumora covers coding, system design, AND behavioral for $49/mo. InterviewCoder charges 6x more and only does coding.' },
  { headline: 'The only tool that works DURING your interview', body: 'Educative, DesignGurus, and AlgoExpert stop helping the moment your interview starts. We are just getting started.' },
  { headline: 'Prep tools prepare you. We win it for you.', body: 'Other platforms teach you concepts. Ascend prepares you. Lumora sits beside you in the live interview.' },
  { headline: 'One ecosystem. Total coverage.', body: 'Ascend for preparation. Lumora for the live interview. Together, they replace 5+ tools at a fraction of the cost.' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

function Check({ green }) {
  return (
    <svg className={`w-4 h-4 ${green ? 'text-emerald-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={green ? 2.5 : 2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function X() {
  return (
    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Cell({ value, isOurs }) {
  if (value === true) return <div className="flex justify-center"><Check green={isOurs} /></div>;
  if (value === false) return <div className="flex justify-center"><X /></div>;
  return <div className="flex justify-center"><span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{value}</span></div>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompetitorComparison({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('table');
  const [showAll, setShowAll] = useState(false);

  if (!isOpen) return null;

  const visibleIds = showAll
    ? Object.keys(COMPETITORS_META)
    : ['ascend', 'lumora', 'interviewCoder', 'exponent', 'educative'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-xl"
        style={{ background: '#fff', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)', border: '1px solid #e5e5e5' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-lg z-20 transition-all"
          style={{ color: '#666', background: '#f5f5f5' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e5e5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <span className="w-2 h-2 bg-red-500 rounded-full" style={{ animation: 'pulse 2s infinite' }} />
              <span className="text-xs font-bold" style={{ color: '#dc2626', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                SIDE-BY-SIDE COMPARISON
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#000' }}>
              See Why Engineers Are{' '}
              <span style={{ background: 'linear-gradient(to right, #10b981, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Switching
              </span>
            </h2>
            <p className="mt-2 text-sm" style={{ color: '#666' }}>
              We compared every major interview prep tool. The results speak for themselves.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { id: 'table', label: 'Feature Comparison' },
              { id: 'savings', label: 'Price Savings' },
              { id: 'why', label: 'Why Switch' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: activeTab === tab.id ? '#111' : '#f3f4f6',
                  color: activeTab === tab.id ? '#fff' : '#666',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Feature Table ── */}
          {activeTab === 'table' && (
            <div>
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-xs font-medium underline underline-offset-2"
                  style={{ color: '#10b981' }}
                >
                  {showAll ? 'Show key competitors' : 'Show all 7 competitors'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #e5e5e5' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th className="text-left py-3 px-4 font-semibold text-xs min-w-[200px]" style={{ color: '#555', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        FEATURE
                      </th>
                      {visibleIds.map((id) => {
                        const c = COMPETITORS_META[id];
                        const isOurs = c.category === 'ours';
                        return (
                          <th
                            key={id}
                            className="py-3 px-2 text-center min-w-[85px]"
                            style={{ background: isOurs ? '#f0fdf4' : '#f9fafb' }}
                          >
                            <div className="font-bold text-xs" style={{ color: isOurs ? '#047857' : '#555' }}>{c.name}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: isOurs ? '#059669' : '#999', fontFamily: 'monospace' }}>
                              {c.price}{c.priceNote === 'hidden' ? '' : c.priceNote}
                            </div>
                            {isOurs && (
                              <span
                                className="inline-block mt-1 px-1.5 py-0.5 text-white rounded text-[8px] font-bold"
                                style={{ background: '#10b981', letterSpacing: '0.05em' }}
                              >
                                OURS
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let lastCat = '';
                      const rows = [];
                      FEATURES.forEach((f, fi) => {
                        if (f.cat !== lastCat) {
                          lastCat = f.cat;
                          rows.push(
                            <tr key={`cat-${f.cat}`}>
                              <td colSpan={visibleIds.length + 1} className="py-2 px-4">
                                <span
                                  className="inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                                  style={{
                                    background: f.cat === 'live' ? '#fef2f2' : f.cat === 'coding' ? '#eff6ff' : f.cat === 'design' ? '#f5f3ff' : f.cat === 'behavioral' ? '#fffbeb' : '#f9fafb',
                                    color: f.cat === 'live' ? '#dc2626' : f.cat === 'coding' ? '#2563eb' : f.cat === 'design' ? '#7c3aed' : f.cat === 'behavioral' ? '#d97706' : '#666',
                                    border: '1px solid',
                                    borderColor: f.cat === 'live' ? '#fecaca' : f.cat === 'coding' ? '#bfdbfe' : f.cat === 'design' ? '#ddd6fe' : f.cat === 'behavioral' ? '#fde68a' : '#e5e5e5',
                                    letterSpacing: '0.1em',
                                  }}
                                >
                                  {CATEGORY_LABELS[f.cat]}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                        rows.push(
                          <tr
                            key={f.name}
                            style={{
                              background: f.highlight ? '#f0fdf4' : fi % 2 === 0 ? '#fff' : '#fafafa',
                              borderTop: '1px solid #f3f4f6',
                            }}
                          >
                            <td className="py-3 px-4" style={{ color: f.highlight ? '#065f46' : '#333', fontWeight: f.highlight ? 600 : 400 }}>
                              {f.highlight && <span style={{ color: '#f59e0b', marginRight: 6 }}>&#9733;</span>}
                              {f.name}
                            </td>
                            {visibleIds.map((id) => (
                              <td
                                key={id}
                                className="py-3 px-2"
                                style={{ background: COMPETITORS_META[id].category === 'ours' ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}
                              >
                                <Cell value={f.vals[id]} isOurs={COMPETITORS_META[id].category === 'ours'} />
                              </td>
                            ))}
                          </tr>
                        );
                      });
                      return rows;
                    })()}

                    {/* Totals */}
                    <tr style={{ borderTop: '2px solid #d1d5db', background: '#f9fafb' }}>
                      <td className="py-4 px-4 font-bold" style={{ color: '#000' }}>Features (full support)</td>
                      {visibleIds.map((id) => {
                        const count = FEATURES.filter(f => f.vals[id] === true).length;
                        const isOurs = COMPETITORS_META[id].category === 'ours';
                        return (
                          <td key={id} className="py-4 px-2 text-center">
                            <span
                              className="font-black text-lg"
                              style={{ color: isOurs ? '#10b981' : '#999' }}
                            >
                              {count}/{FEATURES.length}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 text-xs" style={{ color: '#999' }}>
                <div className="flex items-center gap-1.5"><Check green /> Full support</div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: '#fffbeb', color: '#d97706' }}>Partial</span>
                  Limited
                </div>
                <div className="flex items-center gap-1.5"><X /> Not available</div>
                <div className="flex items-center gap-1.5"><span style={{ color: '#f59e0b' }}>&#9733;</span> Only us</div>
              </div>
            </div>
          )}

          {/* ── Tab: Price Savings ── */}
          {activeTab === 'savings' && (
            <div>
              {/* Big hero */}
              <div
                className="text-center mb-8 p-8 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfeff, #f5f3ff)', border: '1px solid #a7f3d0' }}
              >
                <div
                  className="text-5xl md:text-6xl font-black"
                  style={{ background: 'linear-gradient(to right, #059669, #0d9488)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  $250/mo
                </div>
                <div className="text-base font-semibold mt-2" style={{ color: '#333' }}>
                  saved vs InterviewCoder for the same live AI features
                </div>
                <div className="mt-3 flex items-center justify-center gap-3 text-sm" style={{ color: '#666' }}>
                  <span style={{ color: '#ef4444', textDecoration: 'line-through', fontFamily: 'monospace' }}>$299/mo InterviewCoder</span>
                  <span style={{ color: '#ccc' }}>vs</span>
                  <span style={{ color: '#059669', fontWeight: 700, fontFamily: 'monospace' }}>$49/mo Camora</span>
                </div>
              </div>

              {/* Grid */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {SAVINGS.map((s) => (
                  <div key={s.vs} className="p-5 rounded-xl" style={{ border: '1px solid #e5e5e5', background: '#fff' }}>
                    <div className="text-[10px] font-bold uppercase" style={{ color: '#999', fontFamily: 'monospace', letterSpacing: '0.05em' }}>vs {s.vs}</div>
                    <div className="text-xl font-extrabold mt-1" style={{ color: '#059669' }}>Save {s.save}</div>
                    <p className="text-sm mt-1" style={{ color: '#666' }}>{s.note}</p>
                  </div>
                ))}
              </div>

              {/* Annual cost */}
              <div className="p-6 rounded-2xl" style={{ background: '#111', color: '#fff' }}>
                <h3 className="font-bold text-lg mb-4">Annual Cost: Complete Interview Toolkit</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Educative + DesignGurus + Interviewing.io (3 sessions)', cost: '$1,536+' },
                    { label: 'InterviewCoder alone (no prep, no behavioral, no design)', cost: '$3,588' },
                    { label: 'Ascend + Lumora (prep + live AI, everything)', cost: '$936', ours: true },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        background: row.ours ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: row.ours ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <span className="text-sm" style={{ color: row.ours ? '#6ee7b7' : '#aaa' }}>{row.label}</span>
                      <span
                        className="font-bold"
                        style={{
                          color: row.ours ? '#34d399' : '#666',
                          textDecoration: row.ours ? 'none' : 'line-through',
                          fontFamily: 'monospace',
                          fontSize: row.ours ? '1.1rem' : '0.875rem',
                        }}
                      >
                        {row.cost}/yr
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Why Switch ── */}
          {activeTab === 'why' && (
            <div>
              {/* Cards */}
              <div className="grid md:grid-cols-2 gap-5 mb-8">
                {[
                  { title: 'Nobody else does prep + live AI', body: 'Ascend prepares you. Lumora sits with you during the interview. No competitor offers both. You\'d need InterviewCoder ($299) + Educative ($99) + Exponent ($99) to get close.', bg: '#f0fdf4', accent: '#059669' },
                  { title: 'Architecture diagrams no one else generates', body: 'When asked "Design Netflix," we generate real AWS diagrams with service icons. Every other tool gives you walls of text.', bg: '#f5f3ff', accent: '#7c3aed' },
                  { title: '51 languages vs 9 (or zero)', body: 'AlgoExpert: 9 languages. InterviewCoder: limited. Us: 51 programming languages from Python and Java to Rust, Zig, and Haskell.', bg: '#eff6ff', accent: '#2563eb' },
                  { title: '6x cheaper than InterviewCoder', body: 'InterviewCoder charges $299/mo for live coding AI. Lumora costs $49/mo and does coding + system design + behavioral + diagrams. That\'s $250 back every month.', bg: '#fffbeb', accent: '#d97706' },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="p-5 rounded-xl"
                    style={{ background: card.bg, border: `1px solid ${card.accent}22` }}
                  >
                    <h3 className="font-bold text-base mb-2" style={{ color: '#111' }}>{card.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{card.body}</p>
                  </div>
                ))}
              </div>

              {/* Taglines */}
              <div className="space-y-3 mb-8">
                <h3 className="font-bold text-lg text-center mb-4" style={{ color: '#000' }}>The Bottom Line</h3>
                {TAGLINES.map((t, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl"
                    style={{ borderLeft: '4px solid #10b981', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  >
                    <div className="font-bold" style={{ color: '#111' }}>{t.headline}</div>
                    <div className="text-sm mt-1" style={{ color: '#666' }}>{t.body}</div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div
                className="text-center p-8 rounded-2xl"
                style={{ background: 'linear-gradient(to right, #111, #1f2937, #111)', border: '1px solid #374151' }}
              >
                <h3 className="text-xl font-extrabold mb-2" style={{ color: '#fff' }}>
                  Stop overpaying. Start winning interviews.
                </h3>
                <p className="text-sm mb-5" style={{ color: '#9ca3af' }}>
                  Ascend to prepare. Lumora to dominate. Together, they are unbeatable.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <a
                    href="https://camora.cariara.com"
                    className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all"
                    style={{ background: 'linear-gradient(to right, #10b981, #14b8a6)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                  >
                    Try Lumora Free — Live AI
                  </a>
                  <a
                    href="https://camora.cariara.com"
                    className="px-6 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{ background: 'linear-gradient(to right, #3b82f6, #6366f1)', color: '#fff', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)' }}
                  >
                    Try Ascend Free — Prep Tool
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
