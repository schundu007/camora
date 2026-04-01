import { useState } from 'react';

// ─── Data ────────────────────────────────────────────────────────────────────

type Competitor =
  | 'lumora'
  | 'ascend'
  | 'interviewCoder'
  | 'educative'
  | 'designGurus'
  | 'algoExpert'
  | 'exponent'
  | 'interviewBee'
  | 'interviewingIo';

interface CompetitorInfo {
  name: string;
  price: string;
  priceNote: string;
  url: string;
  category: 'ours' | 'live-ai' | 'prep';
}

const COMPETITORS: Record<Competitor, CompetitorInfo> = {
  lumora:          { name: 'Lumora',           price: '$79',   priceNote: '/mo',          url: 'lumora.cariara.com',    category: 'ours' },
  ascend:          { name: 'Ascend',           price: '$29-99',priceNote: '/mo',          url: 'capra.cariara.com',     category: 'ours' },
  interviewCoder:  { name: 'InterviewCoder',   price: '$299',  priceNote: '/mo',          url: 'interviewcoder.com',    category: 'live-ai' },
  interviewBee:    { name: 'InterviewBee',     price: '???',   priceNote: 'hidden',       url: 'interviewbee.com',      category: 'live-ai' },
  educative:       { name: 'Educative',        price: '$59-99',priceNote: '/mo',          url: 'educative.io',          category: 'prep' },
  designGurus:     { name: 'DesignGurus',      price: '$119',  priceNote: '/mo',          url: 'designgurus.io',        category: 'prep' },
  algoExpert:      { name: 'AlgoExpert',       price: '$99',   priceNote: '/yr',          url: 'algoexpert.io',         category: 'prep' },
  exponent:        { name: 'Exponent',         price: '$99',   priceNote: '/mo',          url: 'tryexponent.com',       category: 'prep' },
  interviewingIo:  { name: 'Interviewing.io',  price: '$100-250',priceNote: '/session',   url: 'interviewing.io',       category: 'prep' },
};

type FeatureValue = boolean | string; // true = has it, false = doesn't, string = partial note

interface Feature {
  name: string;
  description: string;
  category: 'live' | 'coding' | 'design' | 'behavioral' | 'platform';
  values: Record<Competitor, FeatureValue>;
  highlight?: boolean; // true = this is a differentiator for us
}

const FEATURES: Feature[] = [
  // ── Live Interview AI ──
  {
    name: 'Real-time AI during live interviews',
    description: 'AI assists you in real-time while you are on a live call with an interviewer',
    category: 'live',
    highlight: true,
    values: {
      lumora: true, ascend: false, interviewCoder: true, interviewBee: true,
      educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false,
    },
  },
  {
    name: 'System audio capture (hear interviewer)',
    description: 'Captures the interviewer\'s voice from Zoom/Meet/Teams so AI understands full context',
    category: 'live',
    highlight: true,
    values: {
      lumora: true, ascend: false, interviewCoder: true, interviewBee: false,
      educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false,
    },
  },
  {
    name: 'Emergency blank screen (Cmd+B)',
    description: 'Instantly hide all AI assistance with a single hotkey if interviewer asks to share screen',
    category: 'live',
    highlight: true,
    values: {
      lumora: true, ascend: false, interviewCoder: true, interviewBee: false,
      educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false,
    },
  },
  {
    name: 'Pre-interview mic check & calibration',
    description: 'Verify your microphone and audio levels before the interview starts',
    category: 'live',
    highlight: true,
    values: {
      lumora: true, ascend: false, interviewCoder: false, interviewBee: false,
      educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false,
    },
  },
  {
    name: 'Desktop app (stealth mode)',
    description: 'Native desktop application that runs independently of the browser',
    category: 'platform',
    values: {
      lumora: true, ascend: true, interviewCoder: true, interviewBee: false,
      educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false,
    },
  },
  // ── Coding ──
  {
    name: '3-approach coding solutions',
    description: 'Get brute force, optimized, and optimal solutions for every problem',
    category: 'coding',
    highlight: true,
    values: {
      lumora: true, ascend: true, interviewCoder: false, interviewBee: false,
      educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false,
    },
  },
  {
    name: '51 programming languages',
    description: 'Python, Java, Go, Rust, TypeScript, C++, Swift, Kotlin, and 43 more',
    category: 'coding',
    highlight: true,
    values: {
      lumora: true, ascend: true, interviewCoder: 'Limited', interviewBee: false,
      educative: 'Few', designGurus: 'Few', algoExpert: '9 languages', exponent: false, interviewingIo: false,
    },
  },
  {
    name: 'Code execution & auto-fix',
    description: 'Run code in-browser and auto-fix errors with AI',
    category: 'coding',
    highlight: true,
    values: {
      lumora: true, ascend: true, interviewCoder: false, interviewBee: false,
      educative: 'Run only', designGurus: false, algoExpert: 'Run only', exponent: false, interviewingIo: false,
    },
  },
  // ── System Design ──
  {
    name: 'System design with architecture diagrams',
    description: 'AI-generated AWS architecture diagrams with real component icons',
    category: 'design',
    highlight: true,
    values: {
      lumora: true, ascend: true, interviewCoder: false, interviewBee: false,
      educative: 'Text only', designGurus: 'Text only', algoExpert: false, exponent: 'Text only', interviewingIo: false,
    },
  },
  // ── Behavioral ──
  {
    name: 'Behavioral STAR format answers',
    description: 'Structured Situation-Task-Action-Result answers for behavioral questions',
    category: 'behavioral',
    values: {
      lumora: true, ascend: true, interviewCoder: false, interviewBee: false,
      educative: false, designGurus: false, algoExpert: false, exponent: true, interviewingIo: false,
    },
  },
  // ── Platform ──
  {
    name: 'Mock interview rehearsal mode',
    description: 'Practice with AI interviewer before the real thing',
    category: 'platform',
    values: {
      lumora: true, ascend: true, interviewCoder: false, interviewBee: false,
      educative: false, designGurus: false, algoExpert: false, exponent: true, interviewingIo: true,
    },
  },
  {
    name: 'Combined prep + live interview tool',
    description: 'One ecosystem for preparation AND real-time interview assistance',
    category: 'platform',
    highlight: true,
    values: {
      lumora: true, ascend: true, interviewCoder: false, interviewBee: false,
      educative: false, designGurus: false, algoExpert: false, exponent: false, interviewingIo: false,
    },
  },
];

const SAVINGS = [
  { vs: 'InterviewCoder', amount: 220, note: 'Same live AI features, more coverage, fraction of the price' },
  { vs: 'Interviewing.io', amount: '51-201', note: 'per session vs unlimited monthly access' },
  { vs: 'DesignGurus', amount: 40, note: 'We include system design diagrams they don\'t even offer' },
  { vs: 'Exponent', amount: 20, note: 'We cover coding + design + behavioral, not just PM prep' },
];

const TAGLINES = [
  { headline: 'Why pay $299 for half the features?', sub: 'Lumora covers coding, system design, AND behavioral for $79/mo. InterviewCoder charges 4x more and only does coding.' },
  { headline: 'The only tool that works DURING your interview', sub: 'Educative, DesignGurus, and AlgoExpert stop helping the moment your interview starts. Lumora is just getting started.' },
  { headline: 'Prep tools prepare you. Lumora wins it for you.', sub: 'Other platforms teach you concepts. Lumora sits beside you in the live interview and feeds you real-time answers.' },
  { headline: 'One subscription. Total coverage.', sub: 'Ascend for preparation. Lumora for the live interview. Together, they replace 5+ tools at a fraction of the cost.' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || 'w-5 h-5'} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

// ─── Cell renderer ───────────────────────────────────────────────────────────

function FeatureCell({ value, isOurs }: { value: FeatureValue; isOurs: boolean }) {
  if (value === true) {
    return (
      <div className={`flex items-center justify-center ${isOurs ? 'text-emerald-500' : 'text-gray-400'}`}>
        <CheckIcon className={isOurs ? 'w-5 h-5 drop-shadow-sm' : 'w-4 h-4'} />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex items-center justify-center text-gray-300">
        <XIcon className="w-4 h-4" />
      </div>
    );
  }
  // Partial / string value
  return (
    <div className="flex items-center justify-center">
      <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{value}</span>
    </div>
  );
}

// ─── Category labels ─────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  live: { label: 'Live Interview AI', color: 'text-red-600 bg-red-50 border-red-200' },
  coding: { label: 'Coding', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  design: { label: 'System Design', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  behavioral: { label: 'Behavioral', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  platform: { label: 'Platform', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

// ─── Tabs ────────────────────────────────────────────────────────────────────

type ViewTab = 'table' | 'savings' | 'why';

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CompetitorComparison() {
  const [activeTab, setActiveTab] = useState<ViewTab>('table');
  const [showAllCompetitors, setShowAllCompetitors] = useState(false);

  // In compact mode, show only the most relevant competitors
  const visibleCompetitors: Competitor[] = showAllCompetitors
    ? (Object.keys(COMPETITORS) as Competitor[])
    : ['lumora', 'ascend', 'interviewCoder', 'exponent', 'interviewBee'];

  const featuresByCategory = FEATURES.reduce<Record<string, Feature[]>>((acc, f) => {
    (acc[f.category] ||= []).push(f);
    return acc;
  }, {});

  return (
    <section className="w-full">
      {/* Section header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50 border border-red-200 rounded-full mb-4">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-mono font-bold text-red-700 tracking-wide uppercase">Side-by-Side Comparison</span>
        </div>
        <h2 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight text-gray-900">
          See Why Engineers Are <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">Switching</span>
        </h2>
        <p className="mt-3 text-gray-500 max-w-2xl mx-auto">
          We compared every major interview prep tool on the market. The results speak for themselves.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {([
          { id: 'table' as ViewTab, label: 'Feature Comparison' },
          { id: 'savings' as ViewTab, label: 'Price Savings' },
          { id: 'why' as ViewTab, label: 'Why Switch' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Feature Comparison Table ── */}
      {activeTab === 'table' && (
        <div>
          {/* Toggle for full view */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAllCompetitors(!showAllCompetitors)}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
            >
              {showAllCompetitors ? 'Show key competitors' : 'Show all 7 competitors'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              {/* Header row */}
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 min-w-[200px] sticky left-0 bg-gray-50 z-10">
                    Feature
                  </th>
                  {visibleCompetitors.map((id) => {
                    const c = COMPETITORS[id];
                    const isOurs = c.category === 'ours';
                    return (
                      <th
                        key={id}
                        className={`py-3 px-3 text-center min-w-[100px] ${
                          isOurs ? 'bg-emerald-50/70' : 'bg-gray-50'
                        }`}
                      >
                        <div className={`font-bold text-xs ${isOurs ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {c.name}
                        </div>
                        <div className={`text-[10px] mt-0.5 font-mono ${isOurs ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {c.price}{c.priceNote === 'hidden' ? '' : c.priceNote}
                        </div>
                        {isOurs && (
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded uppercase tracking-wider">Ours</span>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {Object.entries(featuresByCategory).map(([cat, features]) => (
                  <>
                    {/* Category separator */}
                    <tr key={`cat-${cat}`}>
                      <td
                        colSpan={visibleCompetitors.length + 1}
                        className="py-2 px-4"
                      >
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${CATEGORY_LABELS[cat]?.color}`}>
                          {CATEGORY_LABELS[cat]?.label}
                        </span>
                      </td>
                    </tr>
                    {features.map((feature, fi) => (
                      <tr
                        key={feature.name}
                        className={`border-t border-gray-100 ${feature.highlight ? 'bg-emerald-50/30' : fi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="py-3 px-4 sticky left-0 bg-inherit z-10">
                          <div className="flex items-start gap-2">
                            {feature.highlight && (
                              <StarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className={`font-medium text-gray-800 ${feature.highlight ? 'text-gray-900' : ''}`}>
                                {feature.name}
                              </div>
                              <div className="text-[11px] text-gray-400 mt-0.5 leading-tight max-w-[220px]">
                                {feature.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        {visibleCompetitors.map((compId) => (
                          <td
                            key={compId}
                            className={`py-3 px-3 ${COMPETITORS[compId].category === 'ours' ? 'bg-emerald-50/40' : ''}`}
                          >
                            <FeatureCell
                              value={feature.values[compId]}
                              isOurs={COMPETITORS[compId].category === 'ours'}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Full support</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">Partial</span>
              <span>Limited support</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XIcon className="w-3.5 h-3.5 text-gray-300" />
              <span>Not available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StarIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Only us (or us + 1)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Price Savings ── */}
      {activeTab === 'savings' && (
        <div className="max-w-4xl mx-auto">
          {/* Big callout */}
          <div className="text-center mb-10 p-8 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200">
            <div className="text-6xl md:text-7xl font-display font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              $220/mo
            </div>
            <div className="text-lg font-semibold text-gray-700 mt-2">
              saved vs InterviewCoder for the same live AI features
            </div>
            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-500">
              <span className="line-through text-red-400 font-mono">$299/mo InterviewCoder</span>
              <span className="text-gray-300">vs</span>
              <span className="font-bold text-emerald-600 font-mono">$79/mo Lumora</span>
            </div>
          </div>

          {/* Savings grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {SAVINGS.map((s) => (
              <div key={s.vs} className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-mono text-gray-400 uppercase tracking-wider">vs {s.vs}</div>
                    <div className="text-2xl font-display font-extrabold text-emerald-600 mt-1">
                      Save ${s.amount}/mo
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{s.note}</p>
              </div>
            ))}
          </div>

          {/* Total cost comparison */}
          <div className="mt-8 p-6 rounded-2xl bg-gray-900 text-white">
            <h3 className="font-display font-bold text-lg mb-4">Annual Cost: Complete Interview Toolkit</h3>
            <div className="space-y-3">
              {[
                { label: 'Typical Stack: Educative + DesignGurus + Interviewing.io (3 sessions)', cost: '$1,536+', annual: true },
                { label: 'InterviewCoder alone (no prep, no behavioral, no design)', cost: '$3,588', annual: true },
                { label: 'Ascend + Lumora (prep + live AI, everything included)', cost: '$2,136', annual: true, ours: true },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    row.ours
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <span className={`text-sm ${row.ours ? 'text-emerald-300 font-semibold' : 'text-gray-300'}`}>
                    {row.label}
                  </span>
                  <span className={`font-mono font-bold ${row.ours ? 'text-emerald-400 text-lg' : 'text-gray-400 line-through'}`}>
                    {row.cost}/yr
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-4 font-mono">
              * Based on monthly subscription pricing. Annual plans reduce cost further.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Why Switch ── */}
      {activeTab === 'why' && (
        <div className="max-w-4xl mx-auto">
          {/* Killer differentiators */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'Nobody else does prep + live AI',
                body: 'Ascend prepares you for the interview. Lumora sits with you during it. No competitor offers both. You would need InterviewCoder ($299) PLUS Educative ($99) PLUS Exponent ($99) to even get close — and you\'d still miss system design diagrams.',
                color: 'emerald',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Architecture diagrams no one else generates',
                body: 'When you\'re asked "Design Netflix" in a system design interview, Lumora generates real AWS architecture diagrams with proper service icons. Every other tool gives you text. We give you diagrams your interviewer can actually see.',
                color: 'purple',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                ),
                title: '51 languages vs 9 (or zero)',
                body: 'AlgoExpert supports 9 languages. InterviewCoder\'s language support is limited. Lumora supports 51 programming languages and frameworks — from Python and Java to Rust, Zig, and Haskell. Whatever your interviewer asks, we\'ve got it.',
                color: 'blue',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: '4x cheaper than InterviewCoder',
                body: 'InterviewCoder charges $299/mo for live coding AI. Lumora costs $79/mo and does coding + system design + behavioral + architecture diagrams. That\'s $220 back in your pocket every month.',
                color: 'amber',
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`p-6 rounded-2xl border bg-white hover:shadow-lg transition-all group`}
                style={{ borderColor: `var(--color-${card.color}-200, #d1d5db)` }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${card.color}-100 text-${card.color}-600`}>
                  {card.icon}
                </div>
                <h3 className="font-display font-bold text-lg text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          {/* Aggressive taglines */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-xl text-gray-900 text-center mb-6">
              The Bottom Line
            </h3>
            {TAGLINES.map((t, i) => (
              <div
                key={i}
                className="p-5 rounded-xl border-l-4 border-emerald-500 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="font-display font-bold text-gray-900">{t.headline}</div>
                <div className="text-sm text-gray-500 mt-1">{t.sub}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 text-center p-8 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border border-gray-700">
            <h3 className="font-display font-extrabold text-2xl text-white mb-2">
              Stop overpaying. Start winning interviews.
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Ascend to prepare. Lumora to dominate. Together, they&apos;re unbeatable.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <a
                href="https://capra.cariara.com"
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all"
              >
                Try Ascend Free — Prep Tool
              </a>
              <a
                href="https://lumora.cariara.com"
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all"
              >
                Try Lumora Free — Live AI
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
