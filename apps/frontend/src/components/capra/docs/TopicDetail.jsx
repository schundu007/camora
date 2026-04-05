import { useState, useEffect, useMemo } from 'react';
import { Icon } from '../../shared/Icons.jsx';
import FormattedContent from './FormattedContent.jsx';
import CloudArchitectureDiagram from './CloudArchitectureDiagram.jsx';
import DiagramSVG from '../features/DiagramSVG.jsx';
import { generateSlug, getProblemBySlug } from '../../../data/capra/problems.js';
import problemsFull from '../../../data/capra/problems-full.json';
import {
  ComparisonCard, CheatSheetCard, EvolutionTimeline,
  PatternCardGrid, StaticDiagramGrid, FlowchartCard, ChartCard
} from './TopicVisuals.jsx';

/**
 * Table for capacity planning / back-of-envelope estimation.
 * Handles both data formats:
 *  - calculations array: [{ label, value, detail }]
 *  - flat keys: { users, storage, bandwidth, qps }
 */
function CapacityPlanningGrid({ estimation }) {
  const LABEL_MAP = {
    users: 'Users / DAU',
    storage: 'Storage',
    bandwidth: 'Bandwidth',
    qps: 'QPS / Throughput',
  };

  const rows = useMemo(() => {
    if (estimation.calculations) {
      return estimation.calculations.map(calc => ({
        metric: calc.label,
        value: calc.value,
        detail: calc.detail,
      }));
    }
    const skipKeys = ['title', 'assumptions'];
    return Object.entries(estimation)
      .filter(([key]) => !skipKeys.includes(key))
      .map(([key, val]) => ({
        metric: LABEL_MAP[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
        value: val.split(/[=*,]/).pop()?.trim() || val,
        detail: val,
      }));
  }, [estimation]);

  return (
    <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
      <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-violet-50">
        <Icon name="hash" size={16} className="text-violet-700" />
        <h3 className="text-sm font-bold text-violet-900 landing-display">{estimation.title || 'Capacity Planning'}</h3>
      </div>
      {estimation.assumptions && (
        <div className="px-3 py-1.5 text-xs text-gray-500 bg-violet-50/30 border-b border-[#e3e8ee]">
          <span className="font-semibold text-violet-700">Assumptions:</span> {estimation.assumptions}
        </div>
      )}
      <div className="p-3">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-violet-50/70">
              <th className="text-left px-3 py-2 text-xs font-semibold text-violet-900 border-b border-violet-200 landing-display">Metric</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-violet-900 border-b border-violet-200 landing-display">Value</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-violet-900 border-b border-violet-200 landing-display hidden lg:table-cell">Calculation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-violet-50/30 transition-colors">
                <td className="px-3 py-2.5 font-semibold text-gray-700 border-b border-gray-100">{row.metric}</td>
                <td className="px-3 py-2.5 font-bold text-violet-700 landing-mono border-b border-gray-100">{row.value}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs border-b border-gray-100 hidden lg:table-cell">{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Shows a pre-generated static diagram if available at /diagrams/{topicId}/eraser-{provider}.png,
 * otherwise falls back to the API-generated CloudArchitectureDiagram.
 */
function StaticCloudDiagram({ topicId, provider, staticSrc, diagramData, generatingDiagram, diagramError, onGenerate }) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when topic or provider changes
  useEffect(() => {
    setImgError(false);
  }, [topicId, provider]);

  // If static image failed to load, fall back to API-generated diagram
  if (imgError) {
    return (
      <CloudArchitectureDiagram
        imageUrl={diagramData?.imageUrl}
        loading={generatingDiagram}
        error={diagramError}
        cloudProvider={provider}
        onRetry={onGenerate}
      />
    );
  }

  return (
    <div>
      <div className="rounded-lg overflow-hidden flex items-center justify-center bg-white">
        <img
          src={staticSrc}
          alt={`${topicId} ${provider.toUpperCase()} architecture diagram`}
          className="w-full h-auto object-contain"
          style={{ maxHeight: '100%', width: '100%', filter: 'contrast(1.6) saturate(1.4)' }}
          onError={() => setImgError(true)}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-gray-400 landing-mono">
        <span>{provider.toUpperCase()} Architecture</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onGenerate}
            className="text-xs text-violet-500 hover:text-violet-400 transition-colors"
            title="Generate a fresh diagram using AI"
          >
            Regenerate →
          </button>
          <a href={staticSrc} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-500">
            Full Size →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function TopicDetail({
  activePage, selectedTopic, topicDetails, pageConfig,
  completedTopics, starredTopics, toggleComplete, toggleStar,
  showAskAI, setShowAskAI, aiQuestion, setAiQuestion, aiAnswer, aiLoading, handleAskAI,
  showRoadmap, setShowRoadmap, expandedTheoryQuestions, setExpandedTheoryQuestions,
  setSelectedTopic, generatingDiagram, diagramData, diagramError,
  diagramDetailLevel, setDiagramDetailLevel, diagramCloudProvider, setDiagramCloudProvider,
  generateDiagram, codingTopics, systemDesignTopics, systemDesigns, behavioralTopics, filteredTopics,
  progressInfo,
}) {
  if (!topicDetails) return null;

  // Pages that use system-design-style rendering (concepts, keyQuestions, dataModel, etc.)
  const isSDStyle = ['system-design', 'microservices', 'databases'].includes(activePage);
  // SQL uses coding/DSA-style rendering (whenToUse, approach, commonProblems, etc.)
  const isCodingStyle = activePage === 'coding' || activePage === 'sql';

  return (
    <div className="landing-root animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => setSelectedTopic(null)}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-all hover:gap-2 group landing-body"
      >
        <Icon name="chevronLeft" size={18} className="transition-transform group-hover:-translate-x-0.5" />
        <span>Back to {pageConfig.title}</span>
      </button>

      {/* Topic Header - Clean minimal design */}
      <div className="rounded-xl p-3 mb-3 border border-[#e3e8ee] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-2">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${topicDetails.color}10` }}
          >
            <Icon name={topicDetails.icon} size={28} style={{ color: topicDetails.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 landing-display">{topicDetails.title}</h1>
              {topicDetails.isNew && <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border border-[#e3e8ee] bg-[#f7f8f9] text-gray-900 font-bold">NEW</span>}
              {topicDetails.difficulty && (
                <span className={`text-[10px] landing-mono px-1.5 py-0.5 rounded border ${
                  topicDetails.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  topicDetails.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {topicDetails.difficulty}
                </span>
              )}
              {topicDetails.questions && (
                <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border border-[#e3e8ee] bg-[#f7f8f9] text-gray-900">
                  {topicDetails.questions} problems
                </span>
              )}
              {/* Design in App button for system design topics */}
              {isSDStyle && (
                <a
                  href={`/capra?problem=${encodeURIComponent(`Design ${topicDetails.title}. ${topicDetails.description || topicDetails.subtitle || ''}`)}&mode=system-design&autosolve=true`}
                  className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex items-center gap-2 flex-shrink-0 landing-body"
                >
                  <Icon name="zap" size={14} />
                  Design
                </a>
              )}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed landing-body">{topicDetails.description}</p>
            {topicDetails.subtitle && !topicDetails.difficulty && (
              <p className="text-gray-500 text-sm mt-1 landing-body">{topicDetails.subtitle}</p>
            )}
            {/* Behavioral meta badges — reading time, question count, tips count */}
            {(activePage === 'behavioral' || activePage === 'low-level' || isSDStyle) && (
              <div className="flex items-center gap-3 mt-2.5">
                {topicDetails.keyQuestions && (
                  <span className="flex items-center gap-1 text-[10px] landing-mono text-gray-400">
                    <Icon name="messageSquare" size={10} />
                    {topicDetails.keyQuestions.length} questions
                  </span>
                )}
                {topicDetails.tips && (
                  <span className="flex items-center gap-1 text-[10px] landing-mono text-gray-400">
                    <Icon name="lightbulb" size={10} />
                    {topicDetails.tips.length} tips
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] landing-mono text-gray-400">
                  <Icon name="clock" size={10} />
                  ~{Math.max(3, Math.ceil(((topicDetails.introduction || '').length + (topicDetails.keyQuestions || []).reduce((a, q) => a + (q.answer || '').length, 0)) / 1200))} min read
                </span>
                {topicDetails.starExample && (
                  <span className="flex items-center gap-1 text-[10px] landing-mono text-emerald-600">
                    <Icon name="star" size={10} />
                    STAR example
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Interactive Toolbar with Progress ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg mb-2 bg-[#f7f8f9] border border-[#e3e8ee]">
        <div className="flex items-center gap-2">
          {/* Progress */}
          {progressInfo && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-[#e3e8ee]">
              <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                <circle cx="10" cy="10" r="8" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - progressInfo.percent / 100)}`}
                />
              </svg>
              <span className="text-[11px] font-bold text-gray-700 landing-mono">{progressInfo.percent}%</span>
              <span className="text-[10px] text-gray-400 landing-mono hidden sm:inline">{progressInfo.completed}/{progressInfo.total}</span>
            </div>
          )}
          {/* Mark as Complete */}
          <button
            onClick={() => toggleComplete(selectedTopic)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all landing-body ${completedTopics[selectedTopic] ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-gray-900 hover:text-gray-900 hover:bg-[#f7f8f9] border border-[#e3e8ee]'}`}
          >
            <Icon name={completedTopics[selectedTopic] ? 'checkCircle' : 'check'} size={16} />
            <span className="hidden sm:inline">{completedTopics[selectedTopic] ? 'Completed' : 'Mark as Complete'}</span>
          </button>
          {/* Star */}
          <button
            onClick={() => toggleStar(selectedTopic)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm transition-all ${starredTopics[selectedTopic] ? 'text-gray-900' : 'text-gray-900 hover:text-gray-900'}`}
          >
            <Icon name={starredTopics[selectedTopic] ? 'star5' : 'star'} size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Ask AI */}
          <button
            onClick={() => setShowAskAI(!showAskAI)}
            className={`flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all landing-body ${showAskAI ? 'bg-emerald-50 text-gray-900 border border-[#e3e8ee]' : 'text-gray-900 hover:text-gray-900 hover:bg-[#f7f8f9] border border-[#e3e8ee]'}`}
          >
            <Icon name="sparkles" size={16} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
          {/* Course Roadmap */}
          <button
            onClick={() => setShowRoadmap(!showRoadmap)}
            className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-[#f7f8f9] border border-[#e3e8ee] transition-all landing-body"
          >
            <Icon name="compass" size={16} />
            <span className="hidden sm:inline">Roadmap</span>
          </button>
        </div>
      </div>

      {/* Ask AI Panel */}
      {showAskAI && (
        <div className="p-3 rounded-xl mb-2 bg-emerald-50/50 border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="sparkles" size={16} className="text-gray-900" />
            <span className="text-gray-900 font-semibold text-sm landing-display">Ask AI about {topicDetails.title}</span>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
              placeholder={`Ask anything about ${topicDetails.title}...`}
              className="flex-1 px-3 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none border border-[#e3e8ee] bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 landing-body"
            />
            <button
              onClick={handleAskAI}
              disabled={aiLoading || !aiQuestion.trim()}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-all landing-body"
            >
              {aiLoading ? <Icon name="loader" size={16} className="animate-spin" /> : 'Ask'}
            </button>
          </div>
          {aiAnswer && (
            <div className="p-4 rounded-lg bg-[#f7f8f9]">
              <FormattedContent content={aiAnswer} color="purple" />
            </div>
          )}
        </div>
      )}

      {/* Course Roadmap Panel */}
      {showRoadmap && (
        <div className="p-3 rounded-xl mb-2 bg-[#f7f8f9] border border-[#e3e8ee]">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="compass" size={16} className="text-gray-900" />
            <span className="text-gray-900 font-semibold text-sm landing-display">Course Roadmap — {pageConfig.title}</span>
          </div>
          <div className="grid  gap-1">
            {(isCodingStyle ? (filteredTopics || codingTopics) : isSDStyle ? (filteredTopics || []) : activePage === 'low-level' ? (filteredTopics || []) : behavioralTopics).map((t, i) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTopic(t.id); setShowRoadmap(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all landing-body ${t.id === selectedTopic ? 'bg-emerald-50 text-gray-900' : 'text-gray-900 hover:text-gray-900 hover:bg-[#f7f8f9]'}`}
              >
                <span className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-sm font-bold landing-mono ${completedTopics[t.id] ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  {completedTopics[t.id] ? '✓' : i + 1}
                </span>
                <span className="flex-1">{t.title}</span>
                {starredTopics[t.id] && <Icon name="star5" size={12} className="text-gray-900" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* DSA Topic Detail */}
      {isCodingStyle && topicDetails.keyPatterns && (
        <div className="space-y-3">
          {/* Overview + Complexity in one row */}
          <div className="grid  gap-2">
            {/* Introduction - Comprehensive Overview */}
            {topicDetails.introduction && (
              <div id="overview" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
                <div className="px-3 py-1.5 border-b border-[#e3e8ee] flex items-center gap-2 bg-emerald-50/50">
                  <Icon name="book" size={14} className="text-emerald-700" />
                  <h3 className="text-sm font-bold text-emerald-800 landing-display">Overview</h3>
                </div>
                <div className="p-3">
                  <FormattedContent content={topicDetails.introduction} color="emerald" />
                </div>
              </div>
            )}
            {/* Complexity */}
            <div className="flex flex-col gap-2">
              <div className="p-3 rounded-lg flex-1 bg-emerald-50/50 border border-emerald-200">
                <div className="text-emerald-600 text-xs font-medium mb-1 landing-mono tracking-widest uppercase">Time Complexity</div>
                <div className="text-gray-900 font-mono text-sm landing-mono">{topicDetails.timeComplexity}</div>
              </div>
              <div className="p-3 rounded-lg flex-1 bg-emerald-50/50 border border-emerald-200">
                <div className="text-emerald-600 text-xs font-medium mb-1 landing-mono tracking-widest uppercase">Space Complexity</div>
                <div className="text-gray-900 font-mono text-sm landing-mono">{topicDetails.spaceComplexity}</div>
              </div>
            </div>
          </div>

          {/* When to Use + Key Patterns - Side by Side Row */}
          <div id="when-to-use" className={`grid gap-2 scroll-mt-24 ${topicDetails.whenToUse && topicDetails.keyPatterns ? '' : 'grid-cols-1'}`}>
            {/* When to Use */}
            {topicDetails.whenToUse && (
              <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                <div className="px-3 py-1.5 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                  <Icon name="target" size={14} className="text-emerald-700" />
                  <h3 className="text-sm font-bold text-emerald-800 landing-display">When to Use</h3>
                </div>
                <div className="p-3">
                  <ul className="grid grid-cols-1  gap-1">
                    {topicDetails.whenToUse.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm landing-body">
                        <span className="text-emerald-600 mt-0.5">→</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Key Patterns */}
            {topicDetails.keyPatterns && (
              <div className="rounded-lg overflow-hidden" style={{ background: `linear-gradient(180deg, ${topicDetails.color}10 0%, transparent 100%)`, border: `1px solid ${topicDetails.color}30` }}>
                <div className="px-3 py-1.5 border-b flex items-center gap-2" style={{ background: `${topicDetails.color}08`, borderColor: `${topicDetails.color}20` }}>
                  <Icon name="puzzle" size={14} style={{ color: topicDetails.color }} />
                  <h3 className="text-sm font-bold text-emerald-800 landing-display">Key Patterns</h3>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {topicDetails.keyPatterns.map((pattern, i) => (
                      <span key={i} className="px-2 py-1 rounded text-xs landing-mono" style={{ background: `${topicDetails.color}15`, color: topicDetails.color }}>
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Approach + Common Mistakes - Side by Side Row */}
          <div id="approach" className={`grid gap-2 scroll-mt-24 ${topicDetails.approach && topicDetails.commonMistakes ? '' : 'grid-cols-1'}`}>
            {/* Approach - Step by Step */}
            {topicDetails.approach && (
              <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                <div className="px-3 py-1.5 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                  <Icon name="list" size={14} className="text-emerald-700" />
                  <h3 className="text-sm font-bold text-emerald-800 landing-display">Step-by-Step Approach</h3>
                </div>
                <div className="p-2">
                  <ol className="grid grid-cols-1  gap-1">
                    {topicDetails.approach.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm landing-body">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 bg-emerald-500 text-white">{i + 1}</span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Common Mistakes */}
            {topicDetails.commonMistakes && (
              <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                <div className="px-3 py-1.5 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                  <Icon name="alertTriangle" size={14} className="text-gray-900" />
                  <h3 className="text-sm font-bold text-rose-800 landing-display">Common Mistakes</h3>
                </div>
                <div className="p-2">
                  <ul className="grid grid-cols-1  gap-1">
                    {topicDetails.commonMistakes.map((mistake, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm landing-body">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span className="text-gray-700">{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Practice Problems + Theory Questions — side by side */}
          {(topicDetails.commonProblems || topicDetails.theoryQuestions?.length > 0) && (
          <div className={`grid gap-2 ${topicDetails.commonProblems && topicDetails.theoryQuestions?.length > 0 ? '' : 'grid-cols-1'}`}>
          {/* Common Problems - Clickable to solve */}
          {topicDetails.commonProblems && (
            <div id="practice" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
              <div className="bg-emerald-50/50 border-b border-[#e3e8ee] px-3 py-2 flex items-center gap-2">
                <Icon name="star" size={14} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-emerald-800 landing-display">Practice Problems</h3>
                <span className="text-[10px] landing-mono text-gray-400 ml-auto">{topicDetails.commonProblems.length}</span>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-1   gap-1">
                  {topicDetails.commonProblems.map((problem, i) => {
                    const problemName = typeof problem === 'string' ? problem : problem.name;
                    const slug = generateSlug(problemName);
                    const problemData = getProblemBySlug(slug);
                    const difficulty = typeof problem === 'object' ? problem.difficulty : (problemData?.difficulty || null);

                    const fullProblem = problemsFull[slug];
                    const hasDescription = !!(fullProblem?.description || problemData?.description);
                    const problemText = fullProblem?.description || problemData?.description || `Solve: ${problemName}`;
                    const href = `/capra?problem=${encodeURIComponent(problemText)}&autosolve=true`;

                    return (
                      <a
                        key={i}
                        href={href}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-emerald-50 transition-colors cursor-pointer group ${!hasDescription ? 'border border-[#e3e8ee]' : 'border border-transparent hover:border-emerald-200'}`}
                      >
                        <span className="w-5 h-5 rounded flex items-center justify-center text-xs landing-mono bg-emerald-500 text-white flex-shrink-0">{i + 1}</span>
                        <span className={`text-xs flex-1 truncate group-hover:text-emerald-700 transition-colors landing-body ${hasDescription ? 'text-gray-900' : 'text-gray-900'}`}>{problemName}</span>
                        {difficulty && (
                          <span className={`text-[10px] landing-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
                            difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-red-50 text-red-600 border-red-200'
                          }`}>{difficulty.charAt(0)}</span>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Theory Questions */}
          {topicDetails.theoryQuestions && topicDetails.theoryQuestions.length > 0 && (
            <div id="theory" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
              <div className="px-3 py-1.5 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                <Icon name="bookOpen" size={14} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-blue-800 landing-display">Theory Questions</h3>
                <span className="text-[10px] landing-mono text-gray-400 ml-auto">{topicDetails.theoryQuestions.length}</span>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-1  gap-2">
                  {topicDetails.theoryQuestions.map((q, i) => {
                    const questionKey = `${selectedTopic}-${i}`;
                    const isExpanded = expandedTheoryQuestions[questionKey];
                    return (
                      <div key={i} className="rounded-lg overflow-hidden bg-[#f7f8f9] border border-[#e3e8ee] hover:border-[#d0d5dd]">
                        <button
                          onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [questionKey]: !prev[questionKey] }))}
                          className="w-full flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors text-left"
                        >
                          <span className="w-6 h-6 rounded flex items-center justify-center text-sm landing-mono bg-blue-500 text-white flex-shrink-0">{i + 1}</span>
                          <span className="text-gray-900 text-sm font-medium flex-1 landing-body">{q.question}</span>
                          {q.difficulty && (
                            <span className={`text-[10px] landing-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
                              q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              'bg-red-50 text-red-600 border-red-200'
                            }`}>{q.difficulty}</span>
                          )}
                          <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && q.answer && (
                          <div className="px-3 pb-3 pt-1 border-t border-[#e3e8ee] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                            <div className="pl-8 text-gray-900 text-sm leading-relaxed bg-[#f7f8f9] p-3 rounded-lg border-l-[3px] border-emerald-400 landing-body">
                              {q.answer}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          </div>
          )}

          {/* Tips + Interview Tips - Side by Side */}
          <div id="tips" className={`grid gap-2 scroll-mt-24 ${topicDetails.tips && topicDetails.interviewTips ? '' : 'grid-cols-1'}`}>
            {/* Tips */}
            {topicDetails.tips && (
              <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                <div className="px-3 py-1.5 border-b border-[#e3e8ee] flex items-center gap-2 bg-emerald-50/50">
                  <Icon name="lightbulb" size={14} className="text-emerald-700" />
                  <h3 className="text-sm font-bold text-emerald-800 landing-display">Tips & Tricks</h3>
                </div>
                <div className="grid grid-cols-1  gap-1 p-2">
                  {topicDetails.tips.map((tip, i) => (
                    <div key={i} className="px-2 py-1 flex items-start gap-1.5 rounded">
                      <span className="text-emerald-600 text-xs mt-0.5 flex-shrink-0">✓</span>
                      <span className="text-gray-700 text-sm landing-body">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interview Tips */}
            {topicDetails.interviewTips && (
              <div className="rounded-lg overflow-hidden bg-[#f7f8f9] border border-[#e3e8ee]">
                <div className="px-3 py-1.5 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                  <Icon name="briefcase" size={14} className="text-gray-900" />
                  <h3 className="text-sm font-bold text-indigo-800 landing-display">Interview Tips</h3>
                </div>
                <div className="grid grid-cols-1  gap-1 p-2">
                  {topicDetails.interviewTips.map((tip, i) => (
                    <div key={i} className="px-2 py-1 flex items-start gap-1.5 rounded">
                      <span className="text-gray-400 text-xs mt-0.5 flex-shrink-0">★</span>
                      <span className="text-gray-700 text-sm landing-body">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Code Example */}
          {topicDetails.codeExample && (
            <div className="p-3 rounded-lg bg-[#f7f8f9] border border-[#e3e8ee]">
              <h3 className="text-gray-900 text-xs font-semibold mb-2 flex items-center gap-2 landing-display">
                <Icon name="code" size={14} className="text-emerald-700" />
                Code Example
              </h3>
              <pre className="text-sm landing-mono text-emerald-700 overflow-x-auto whitespace-pre-wrap">
                {topicDetails.codeExample}
              </pre>
            </div>
          )}

          {/* Multiple Code Examples */}
          {topicDetails.codeExamples && topicDetails.codeExamples.length > 0 && (
            <div id="code-examples" className="space-y-2 scroll-mt-24">
              <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2 landing-display">
                <Icon name="code" size={14} className="text-emerald-700" />
                Code Examples
              </h3>
              {topicDetails.codeExamples.map((example, i) => (
                <div key={i} className="p-3 rounded-xl bg-[#f7f8f9] border border-[#e3e8ee]">
                  <h4 className="text-gray-900 font-semibold mb-2 landing-display">{example.title}</h4>
                  {example.description && <p className="text-gray-500 text-sm mb-2 landing-body">{example.description}</p>}
                  <pre className="text-sm landing-mono text-emerald-700 overflow-x-auto whitespace-pre-wrap">
                    {example.code}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Design / LLD Problem Detail */}
      {(isSDStyle || activePage === 'low-level') && (topicDetails.concepts || topicDetails.requirements || topicDetails.functionalRequirements || topicDetails.primitives || topicDetails.problems || topicDetails.structures || topicDetails.coreEntities || topicDetails.implementation) && (
        <div className="space-y-3">
          {/* Comprehensive System Design / LLD Problem Content */}
          {(topicDetails.requirements || topicDetails.functionalRequirements || topicDetails.introduction || topicDetails.concepts) && (
            <>
              {/* Introduction + Key Concepts — side by side */}
              {(topicDetails.introduction || (topicDetails.concepts && !topicDetails.introduction)) && (
                <div className={`grid gap-2 ${topicDetails.introduction && topicDetails.concepts ? '' : 'grid-cols-1'}`}>
                  {topicDetails.introduction && (
                    <div id="overview" className={`rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white ${topicDetails.concepts ? '' : ''}`}>
                      <div className="px-3 py-1.5 border-b border-[#e3e8ee] bg-[#f7f8f9] flex items-center gap-2">
                        <Icon name="book" size={14} className="text-emerald-700" />
                        <h2 className="text-sm font-bold text-blue-800 landing-display">Introduction</h2>
                      </div>
                      <div className="p-3">
                        <FormattedContent content={topicDetails.introduction} color="blue" />
                      </div>
                    </div>
                  )}
                  {topicDetails.concepts && (
                    <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                      <div className="px-3 py-1.5 border-b border-[#e3e8ee] bg-[#f7f8f9] flex items-center gap-2">
                        <Icon name="puzzle" size={14} style={{ color: topicDetails.color }} />
                        <h2 className="text-sm font-bold text-violet-800 landing-display">Key Concepts</h2>
                      </div>
                      <div className="p-2 flex flex-wrap gap-1.5">
                        {topicDetails.concepts.map((concept, i) => (
                          <span key={i} className="px-2 py-1 rounded text-xs landing-mono" style={{ background: `${topicDetails.color}15`, color: topicDetails.color }}>
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Requirements - Functional & Non-Functional */}
              {(topicDetails.functionalRequirements || topicDetails.requirements || topicDetails.nonFunctionalRequirements) && (
              <div id="requirements" className="grid  gap-2 scroll-mt-24">
                {/* Functional Requirements */}
                {(topicDetails.functionalRequirements || topicDetails.requirements) && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="bg-emerald-50/50 border-b border-[#e3e8ee] px-3 py-2 flex items-center gap-2">
                    <Icon name="check" size={14} className="text-emerald-700" />
                    <h3 className="text-sm font-bold text-emerald-800 landing-display">Functional Requirements</h3>
                  </div>
                  <div className="p-3">
                    <ul className="grid grid-cols-1  gap-1">
                      {(topicDetails.functionalRequirements || topicDetails.requirements).map((req, i) => (
                        <li key={i} className="flex items-start gap-2 rounded hover:bg-[#f7f8f9] transition-colors">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 bg-emerald-50 text-emerald-700 mt-0.5">✓</span>
                          <span className="text-gray-500 text-xs landing-body">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                )}

                {/* Non-Functional Requirements */}
                {topicDetails.nonFunctionalRequirements && (
                  <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                    <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                      <Icon name="zap" size={14} className="text-emerald-700" />
                      <h3 className="text-sm font-bold text-emerald-800 landing-display">Non-Functional Requirements</h3>
                    </div>
                    <div className="p-3">
                      <ul className="grid grid-cols-1  gap-1">
                        {topicDetails.nonFunctionalRequirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 rounded hover:bg-[#f7f8f9] transition-colors">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0 bg-emerald-50 text-emerald-700 mt-0.5">•</span>
                            <span className="text-gray-500 text-xs landing-body">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* API Design + Data Model — side by side */}
              {(topicDetails.apiDesign?.endpoints || topicDetails.dataModel) && (
                <div className={`grid gap-2 scroll-mt-24 ${topicDetails.apiDesign?.endpoints && topicDetails.dataModel ? '' : 'grid-cols-1'}`}>
                  {/* API Design — dense multi-column endpoint grid */}
                  {topicDetails.apiDesign && topicDetails.apiDesign.endpoints && (
                    <div id="api-design" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
                      <div className="bg-emerald-50/50 border-b border-[#e3e8ee] px-3 py-1.5 flex items-center gap-2">
                        <Icon name="code" size={14} className="text-emerald-700" />
                        <h3 className="text-sm font-bold text-blue-800 landing-display">API Design</h3>
                      </div>
                      <div className="p-2">
                        <div className={`grid gap-1.5 ${topicDetails.apiDesign.endpoints.length > 4 ? 'grid-cols-1 ' : 'grid-cols-1 '}`}>
                          {topicDetails.apiDesign.endpoints.map((endpoint, i) => (
                            <div key={i} className="rounded-md px-2.5 py-2 bg-[#f7f8f9] border border-[#e3e8ee]">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[9px] landing-mono px-1 py-0.5 rounded font-bold uppercase leading-none ${
                                  endpoint.method === 'GET' ? 'bg-emerald-50 text-emerald-700' :
                                  endpoint.method === 'POST' || endpoint.method === 'INSERT' ? 'bg-amber-50 text-amber-700' :
                                  endpoint.method === 'PUT' || endpoint.method === 'UPDATE' ? 'bg-blue-50 text-blue-700' :
                                  'bg-red-50 text-red-700'
                                }`}>{endpoint.method}</span>
                                <code className="text-gray-900 landing-mono text-xs truncate">{endpoint.path}</code>
                              </div>
                              <div className="text-gray-400 text-xs landing-body truncate">{endpoint.response}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Model — compact code block */}
                  {topicDetails.dataModel && (
                    <div id="data-model" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
                      <div className="bg-emerald-50/50 border-b border-[#e3e8ee] px-3 py-1.5 flex items-center gap-2">
                        <Icon name="database" size={14} className="text-emerald-700" />
                        <h3 className="text-sm font-bold text-blue-800 landing-display">Data Model</h3>
                      </div>
                      <div className="overflow-x-auto bg-[#f6f8fa] max-h-80 overflow-y-auto">
                        <pre className="p-2.5 text-xs leading-5 text-emerald-700 landing-mono" style={{ whiteSpace: 'pre', margin: 0, tabSize: 4 }}>
                          {topicDetails.dataModel.schema}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Key Questions */}
              {topicDetails.keyQuestions && (
                <div id="key-questions" className="rounded-xl overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
                  <div className="bg-emerald-50/50 border-b border-[#e3e8ee] px-3 py-2 flex items-center gap-2">
                    <Icon name="messageSquare" size={14} className="text-emerald-700" />
                    <h3 className="text-sm font-bold text-emerald-800 landing-display">Key Questions</h3>
                    <span className="text-[10px] landing-mono text-gray-400 ml-auto">{topicDetails.keyQuestions.length} topics</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 p-2">
                    {topicDetails.keyQuestions.map((q, i) => (
                      <div key={i} className="p-3 rounded-lg hover:bg-[#f7f8f9] hover:border-[#d0d5dd] transition-colors bg-white border border-[#e3e8ee]">
                        <div className="flex items-start gap-2">
                          <span className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 landing-mono">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-blue-900 font-semibold text-sm mb-2 landing-display">{q.question}</h4>
                            <div className="text-gray-700 landing-body">
                              <FormattedContent content={q.answer} color="emerald" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic + Advanced Implementation */}
              {(topicDetails.basicImplementation || topicDetails.advancedImplementation) && (
                <div id="architecture" className={`grid gap-2 scroll-mt-24 ${topicDetails.basicImplementation && topicDetails.advancedImplementation ? '' : 'grid-cols-1'}`}>
                  {/* Basic Implementation */}
                  {topicDetails.basicImplementation && (
                    <div className="rounded-xl overflow-hidden border border-[#e3e8ee] bg-white">
                      <div className="bg-emerald-50/50 border-b border-[#e3e8ee] px-3 py-2 flex items-center gap-2">
                        <Icon name="layers" size={14} className="text-emerald-700" />
                        <h3 className="text-sm font-bold text-blue-800 landing-display">{topicDetails.basicImplementation.title || 'Basic Approach'}</h3>
                      </div>
                      <div className="p-3">
                        <p className="text-gray-500 text-sm mb-2 leading-relaxed landing-body">{topicDetails.basicImplementation.description}</p>
                        {topicDetails.basicImplementation.svgTemplate && (
                          <DiagramSVG
                            template={topicDetails.basicImplementation.svgTemplate}
                            className="mb-2"
                          />
                        )}
                        {topicDetails.basicImplementation.architecture && !topicDetails.basicImplementation.svgTemplate && (
                          <div className="rounded-lg overflow-x-auto mb-2 bg-[#0d1117]">
                            <pre
                              className="p-4 text-sm leading-6 text-gray-300 landing-mono"
                              style={{
                                whiteSpace: 'pre',
                                margin: 0,
                                tabSize: 4
                              }}
                            >
                              {topicDetails.basicImplementation.architecture}
                            </pre>
                          </div>
                        )}
                        {topicDetails.basicImplementation.problems && (
                          <div>
                            <h4 className="text-gray-900 text-sm font-semibold mb-2 flex items-center gap-2 landing-display">
                              <Icon name="alertTriangle" size={14} />
                              Issues:
                            </h4>
                            <ul className="grid grid-cols-1 gap-1">
                              {topicDetails.basicImplementation.problems.map((problem, i) => (
                                <li key={i} className="flex items-start gap-2 text-gray-500 text-sm landing-body">
                                  <span className="text-red-500 mt-0.5">✗</span>
                                  <span>{problem}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advanced Implementation */}
                  {topicDetails.advancedImplementation && (
                    <div className="rounded-xl overflow-hidden border border-[#e3e8ee] bg-white">
                      <div className="bg-emerald-50/50 border-b border-[#e3e8ee] px-3 py-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50">
                          <Icon name="zap" size={18} className="text-emerald-700" />
                        </div>
                        <h3 className="text-sm font-bold text-violet-800 landing-display">{topicDetails.advancedImplementation.title || 'Scalable Solution'}</h3>
                      </div>
                      <div className="p-3">
                        <p className="text-gray-500 text-sm mb-2 leading-relaxed landing-body">{topicDetails.advancedImplementation.description}</p>
                        {topicDetails.advancedImplementation.svgTemplate && (
                          <DiagramSVG
                            template={topicDetails.advancedImplementation.svgTemplate}
                            className="mb-2"
                          />
                        )}
                        {topicDetails.advancedImplementation.architecture && !topicDetails.advancedImplementation.svgTemplate && (
                          <div className="rounded-lg overflow-x-auto mb-2 bg-[#f6f8fa] border border-[#e3e8ee]">
                            <pre
                              className="p-3 text-sm leading-7 text-emerald-700 landing-mono"
                              style={{
                                whiteSpace: 'pre',
                                margin: 0,
                                tabSize: 4
                              }}
                            >
                              {topicDetails.advancedImplementation.architecture}
                            </pre>
                          </div>
                        )}
                        {topicDetails.advancedImplementation.keyPoints && (
                          <div className="mb-2">
                            <h4 className="text-gray-900 text-sm font-semibold mb-2 landing-display">Key Points:</h4>
                            <ul className="grid grid-cols-1 gap-1">
                              {topicDetails.advancedImplementation.keyPoints.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-gray-500 text-sm landing-body">
                                  <span className="text-emerald-600 mt-0.5">✓</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(topicDetails.advancedImplementation.databaseChoice || topicDetails.advancedImplementation.caching) && (
                          <div className="flex flex-wrap gap-2">
                            {topicDetails.advancedImplementation.databaseChoice && (
                              <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                                DB: {topicDetails.advancedImplementation.databaseChoice}
                              </span>
                            )}
                            {topicDetails.advancedImplementation.caching && (
                              <span className="text-[10px] landing-mono px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                                Cache: {topicDetails.advancedImplementation.caching}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Visual Enhancements ── */}

              {/* Static Architecture Diagrams (pre-generated SVGs) */}
              {topicDetails.staticDiagrams && topicDetails.staticDiagrams.length > 0 && (
                <StaticDiagramGrid diagrams={topicDetails.staticDiagrams} title="Architecture Diagrams" />
              )}

              {/* Comparison Cards (side-by-side) */}
              {topicDetails.comparisonTables && topicDetails.comparisonTables.length > 0 && (
                <div className="space-y-2">
                  {topicDetails.comparisonTables.map((comp) => (
                    <ComparisonCard key={comp.id} comparison={comp} />
                  ))}
                </div>
              )}

              {/* Cheat Sheet / Quick Reference Cards */}
              {topicDetails.visualCards && topicDetails.visualCards.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {topicDetails.visualCards.map((card) => (
                    <CheatSheetCard key={card.id} card={card} />
                  ))}
                </div>
              )}

              {/* Flowcharts / Process Diagrams */}
              {topicDetails.flowcharts && topicDetails.flowcharts.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {topicDetails.flowcharts.map((fc) => (
                    <FlowchartCard key={fc.id} flowchart={fc} />
                  ))}
                </div>
              )}

              {/* Bar/Pie Charts */}
              {topicDetails.charts && topicDetails.charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {topicDetails.charts.map((chart) => (
                    <ChartCard key={chart.id} chart={chart} />
                  ))}
                </div>
              )}

              {/* Architecture Evolution Timeline */}
              {topicDetails.evolutionSteps && topicDetails.evolutionSteps.length > 0 && (
                <EvolutionTimeline steps={topicDetails.evolutionSteps} />
              )}

              {/* Design Pattern Cards */}
              {topicDetails.patternCards && topicDetails.patternCards.length > 0 && (
                <PatternCardGrid patterns={topicDetails.patternCards} title="Key Design Patterns" />
              )}

              {/* Cloud Architecture Diagram + Tips */}
              <div className={`grid gap-2 ${isSDStyle ? '' : 'grid-cols-1'}`}>
                {/* Cloud Architecture Diagram — static pre-generated or API-generated */}
                {isSDStyle && topicDetails && (
                  <div className="rounded-xl overflow-hidden border border-[#e3e8ee] bg-white">
                    <div className="bg-emerald-50/50 border-b border-[#e3e8ee] px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="layers" size={14} className="text-emerald-700" />
                        <h3 className="text-sm font-bold text-blue-800 landing-display">Architecture Diagram</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Cloud Provider Selector */}
                        <div className="flex items-center gap-1 mr-2 px-1 py-0.5 rounded-lg bg-gray-100">
                          {[
                            { id: 'aws', label: 'AWS', color: '#ff9900' },
                            { id: 'gcp', label: 'GCP', color: '#4285f4' },
                            { id: 'azure', label: 'Azure', color: '#0078d4' },
                          ].map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setDiagramCloudProvider(p.id);
                                generateDiagram(topicDetails.title || selectedTopic, diagramDetailLevel, p.id);
                              }}
                              className="px-2 py-0.5 text-xs font-medium rounded transition-all landing-mono"
                              style={{
                                background: diagramCloudProvider === p.id ? `${p.color}30` : 'transparent',
                                color: diagramCloudProvider === p.id ? p.color : '#9ca3af',
                                border: diagramCloudProvider === p.id ? `1px solid ${p.color}50` : '1px solid transparent',
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      {/* Show pre-generated static diagram if available, otherwise fall back to API */}
                      {(() => {
                        const staticSrc = `/diagrams/${selectedTopic}/eraser-${diagramCloudProvider}.png`;
                        return (
                          <StaticCloudDiagram
                            topicId={selectedTopic}
                            provider={diagramCloudProvider}
                            staticSrc={staticSrc}
                            diagramData={diagramData}
                            generatingDiagram={generatingDiagram}
                            diagramError={diagramError}
                            onGenerate={() => generateDiagram(topicDetails.title || selectedTopic, diagramDetailLevel, diagramCloudProvider)}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Tips */}
                {topicDetails.tips && (
                  <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                    <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-emerald-50/50">
                      <Icon name="star" size={16} className="text-emerald-700" />
                      <h3 className="text-sm font-bold text-indigo-800 landing-display">Interview Tips</h3>
                    </div>
                    <div className="grid  gap-1 p-3">
                      {topicDetails.tips.map((tip, i) => (
                        <div key={i} className="px-3 py-2 flex items-center gap-2 hover:bg-[#f7f8f9] transition-colors rounded">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-emerald-50 text-emerald-700">★</span>
                          <span className="text-gray-500 text-sm landing-body">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Flow Cards - Row Mode */}
              {(topicDetails.createFlow || topicDetails.redirectFlow) && (
                <div className="grid grid-cols-1 gap-2">
                  {/* Create Flow */}
                  {topicDetails.createFlow && (
                    <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                      <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                        <Icon name="arrowRight" size={16} className="text-emerald-700" />
                        <h3 className="text-sm font-bold text-emerald-800 landing-display">{topicDetails.createFlow.title}</h3>
                      </div>
                      <div className="p-3">
                        <ol className="grid grid-cols-1  gap-1">
                          {topicDetails.createFlow.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 rounded hover:bg-[#f7f8f9] transition-colors">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-emerald-50 text-emerald-700 border border-[#e3e8ee] landing-mono">
                                {i + 1}
                              </span>
                              <span className="text-gray-500 text-sm landing-body">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Redirect Flow */}
                  {topicDetails.redirectFlow && (
                    <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                      <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                        <Icon name="arrowLeft" size={16} className="text-emerald-700" />
                        <h3 className="text-sm font-bold text-emerald-800 landing-display">{topicDetails.redirectFlow.title}</h3>
                      </div>
                      <div className="p-3">
                        <ol className="grid grid-cols-1  gap-1">
                          {topicDetails.redirectFlow.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 rounded hover:bg-[#f7f8f9] transition-colors">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-emerald-50 text-emerald-700 border border-[#e3e8ee] landing-mono">
                                {i + 1}
                              </span>
                              <span className="text-gray-500 text-sm landing-body">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Discussion Points - Compact Grid */}
              {topicDetails.discussionPoints && (
                <div className="rounded-lg overflow-hidden bg-[#f7f8f9] border border-[#e3e8ee]">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                    <Icon name="messageCircle" size={16} className="text-gray-900" />
                    <h3 className="text-sm font-bold text-indigo-800 landing-display">Discussion Points</h3>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-1   gap-2">
                      {topicDetails.discussionPoints.map((point, i) => (
                        <div key={i} className="p-3 rounded-lg bg-white border border-[#e3e8ee] hover:border-[#d0d5dd] transition-colors">
                          <h4 className="text-gray-900 font-semibold mb-1.5 text-sm landing-display">{point.topic}</h4>
                          <ul className="space-y-0.5">
                            {point.points.slice(0, 3).map((p, j) => (
                              <li key={j} className="flex items-start gap-1 text-gray-500 text-sm landing-body">
                                <span className="text-gray-400 mt-0.5">•</span>
                                <span className="truncate">{p}</span>
                              </li>
                            ))}
                            {point.points.length > 3 && (
                              <li className="text-gray-400 text-sm landing-body">+{point.points.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Back-of-Envelope Estimation — AG Grid Table */}
              {topicDetails.estimation && (
                <CapacityPlanningGrid estimation={topicDetails.estimation} />
              )}

              {/* Algorithm Approaches */}
              {topicDetails.algorithmApproaches && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-amber-50">
                    <Icon name="zap" size={16} className="text-amber-700" />
                    <h3 className="text-sm font-bold text-amber-900 landing-display">Algorithm Approaches</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.algorithmApproaches.map((app, i) => (
                      <div key={i} className="p-3 rounded-lg border border-[#e3e8ee] bg-[#f7f8f9]">
                        <h4 className="text-sm font-bold text-amber-800 mb-1 landing-display">{i + 1}. {app.name}</h4>
                        <p className="text-gray-500 text-xs mb-2 landing-body leading-relaxed">{app.description}</p>
                        <div className="space-y-0.5">
                          {app.pros.map((p, j) => <div key={`p${j}`} className="text-xs text-gray-700 landing-body"><span className="text-emerald-600 font-bold mr-1">+</span>{p}</div>)}
                          {app.cons.map((c, j) => <div key={`c${j}`} className="text-xs text-gray-700 landing-body"><span className="text-rose-600 font-bold mr-1">-</span>{c}</div>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Architecture Layers */}
              {topicDetails.architectureLayers && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-teal-50">
                    <Icon name="layers" size={16} className="text-teal-700" />
                    <h3 className="text-sm font-bold text-teal-900 landing-display">Architecture Layers</h3>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {topicDetails.architectureLayers.map((layer, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-[#f7f8f9] border border-[#e3e8ee]">
                        <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                        <div><span className="text-sm font-bold text-teal-800 landing-display">{layer.name}</span><span className="text-gray-500 text-sm ml-2 landing-body">{layer.description}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deep Dive Topics */}
              {topicDetails.deepDiveTopics && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-sky-50">
                    <Icon name="search" size={16} className="text-sky-700" />
                    <h3 className="text-sm font-bold text-sky-900 landing-display">Deep Dive Topics</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1  gap-2">
                    {topicDetails.deepDiveTopics.map((item, i) => (
                      <div key={i} className="p-3 rounded-lg bg-sky-50/30 border border-sky-100">
                        <h4 className="text-sm font-bold text-sky-800 mb-1 landing-display">{item.topic}</h4>
                        <p className="text-gray-500 text-xs landing-body leading-relaxed">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade-off Decisions */}
              {topicDetails.tradeoffDecisions && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-rose-50">
                    <Icon name="gitBranch" size={16} className="text-rose-700" />
                    <h3 className="text-sm font-bold text-rose-900 landing-display">Trade-off Decisions</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1  gap-2">
                    {topicDetails.tradeoffDecisions.map((d, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#f7f8f9] border border-[#e3e8ee]">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-amber-700 landing-mono">{d.choice}</span>
                          <span className="text-gray-300">→</span>
                          <span className="text-xs font-bold text-emerald-700 landing-mono">{d.picked}</span>
                        </div>
                        <p className="text-gray-500 text-xs landing-body leading-relaxed">{d.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Follow-up Questions */}
              {topicDetails.interviewFollowups && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-orange-50">
                    <Icon name="helpCircle" size={16} className="text-orange-700" />
                    <h3 className="text-sm font-bold text-orange-900 landing-display">Common Follow-up Questions</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {topicDetails.interviewFollowups.map((item, i) => (
                      <div key={i} className="rounded-lg border border-[#e3e8ee] overflow-hidden">
                        <div className="flex items-start gap-2 px-3 py-2 bg-orange-50/30 border-b border-orange-100">
                          <span className="text-xs font-bold text-orange-700 landing-mono flex-shrink-0">Q{i + 1}</span>
                          <span className="text-sm font-semibold text-gray-900 landing-display">{item.question}</span>
                        </div>
                        <div className="px-3 py-2 pl-7"><p className="text-gray-500 text-xs landing-body leading-relaxed">{item.answer}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Implementations (object format with language keys) */}
              {topicDetails.codeExamples && typeof topicDetails.codeExamples === 'object' && !Array.isArray(topicDetails.codeExamples) && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-emerald-50">
                    <Icon name="code" size={16} className="text-emerald-700" />
                    <h3 className="text-sm font-bold text-emerald-900 landing-display">Implementation Code</h3>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {Object.entries(topicDetails.codeExamples).map(([lang, code], i) => (
                      <div key={i} className="rounded-lg border border-[#e3e8ee] overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /><div className="w-2 h-2 rounded-full bg-amber-400" /><div className="w-2 h-2 rounded-full bg-emerald-400" /></div>
                            <span className="text-xs font-bold text-gray-400 landing-mono uppercase">{lang}</span>
                          </div>
                          <button onClick={() => navigator.clipboard.writeText(code)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 border border-gray-700 rounded hover:border-gray-500 transition-colors landing-mono">Copy</button>
                        </div>
                        <pre className="p-3 bg-[#0d1117] overflow-x-auto max-h-80 overflow-y-auto"><code className="text-sm landing-mono text-gray-300 leading-relaxed whitespace-pre">{code}</code></pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Components & Decisions - Side by Side */}
              {(!topicDetails.introduction && topicDetails.components) || topicDetails.keyDecisions ? (
                <div className={`grid gap-2 ${(!topicDetails.introduction && topicDetails.components) && topicDetails.keyDecisions ? '' : 'grid-cols-1'}`}>
                  {/* System Components */}
                  {!topicDetails.introduction && topicDetails.components && (
                    <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                      <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                        <Icon name="layers" size={16} className="text-emerald-700" />
                        <h3 className="text-sm font-bold text-blue-800 landing-display">System Components</h3>
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {topicDetails.components.map((comp, i) => (
                            <span key={i} className="text-[10px] landing-mono px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Design Decisions */}
                  {topicDetails.keyDecisions && (
                    <div className="rounded-lg overflow-hidden bg-[#f7f8f9] border border-[#e3e8ee]">
                      <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                        <Icon name="lightbulb" size={16} className="text-gray-900" />
                        <h3 className="text-sm font-bold text-violet-800 landing-display">Key Design Decisions</h3>
                      </div>
                      <div className="p-3">
                        <ol className="grid grid-cols-1  gap-1">
                          {topicDetails.keyDecisions.map((decision, i) => (
                            <li key={i} className="flex items-start gap-2 rounded hover:bg-[#f7f8f9] transition-colors">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[#f7f8f9] text-gray-900 border border-amber-500/30 landing-mono">
                                {i + 1}
                              </span>
                              <span className="text-gray-500 text-sm landing-body">{decision}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* LLD Core Entities */}
              {topicDetails.coreEntities && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                    <Icon name="box" size={16} className="text-gray-900" />
                    <h3 className="text-sm font-bold text-blue-800 landing-display">Core Entities</h3>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-1 gap-2">
                    {topicDetails.coreEntities.map((entity, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-[#f7f8f9] border border-[#e3e8ee]">
                        <code className="text-gray-900 landing-mono text-sm font-semibold whitespace-nowrap">{entity.name}</code>
                        <span className="text-gray-500 text-sm landing-body">{entity.description}</span>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              )}

              {/* LLD Design Patterns */}
              {topicDetails.designPatterns && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                    <Icon name="puzzle" size={16} className="text-gray-900" />
                    <h3 className="text-sm font-bold text-violet-800 landing-display">Design Patterns</h3>
                  </div>
                  <div className="p-4">
                    <ul className="grid grid-cols-1 gap-1">
                      {topicDetails.designPatterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-2 rounded hover:bg-[#f7f8f9] transition-colors">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-[#f7f8f9] text-gray-900 mt-0.5">✦</span>
                          <span className="text-gray-500 text-sm landing-body">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* LLD Implementation Code */}
              {topicDetails.implementation && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                    <Icon name="code" size={16} className="text-emerald-700" />
                    <h3 className="text-sm font-bold text-emerald-800 landing-display">Implementation</h3>
                  </div>
                  <div className="overflow-x-auto bg-[#0d1117]">
                    <pre
                      className="p-4 text-sm leading-6 text-gray-300 landing-mono"
                      style={{
                        whiteSpace: 'pre',
                        margin: 0,
                        tabSize: 4
                      }}
                    >
                      {topicDetails.implementation}
                    </pre>
                  </div>
                </div>
              )}

              {/* Concurrency Concepts */}
              {topicDetails.concepts && Array.isArray(topicDetails.concepts) && topicDetails.concepts[0]?.name && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                    <Icon name="cpu" size={16} className="text-gray-900" />
                    <h3 className="text-sm font-bold text-blue-800 landing-display">Core Concepts</h3>
                  </div>
                  <div className="p-4 grid  gap-2">
                    {topicDetails.concepts.map((concept, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-[#f7f8f9] border border-[#e3e8ee]">
                        <code className="text-gray-900 landing-mono text-sm font-semibold whitespace-nowrap">{concept.name}</code>
                        <span className="text-gray-500 text-sm landing-body">{concept.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Primitives */}
              {topicDetails.primitives && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                    <Icon name="lock" size={16} className="text-emerald-700" />
                    <h3 className="text-sm font-bold text-violet-800 landing-display">Synchronization Primitives</h3>
                  </div>
                  <div className="p-4 grid  gap-2">
                    {topicDetails.primitives.map((prim, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#f7f8f9] border border-[#e3e8ee]">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-gray-900 landing-mono text-sm font-semibold">{prim.name}</code>
                          {prim.example && <code className="text-gray-400 text-sm landing-mono">{prim.example}</code>}
                        </div>
                        <span className="text-gray-500 text-sm landing-body">{prim.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Classic Problems */}
              {topicDetails.problems && topicDetails.problems[0]?.solution && (
                <div className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                    <Icon name="alertTriangle" size={16} className="text-gray-900" />
                    <h3 className="text-sm font-bold text-amber-800 landing-display">Classic Problems</h3>
                  </div>
                  <div className="grid  gap-2 p-3">
                    {topicDetails.problems.map((problem, i) => (
                      <div key={i} className="p-4 rounded-lg bg-[#f7f8f9] border border-[#e3e8ee]">
                        <h4 className="text-gray-900 font-semibold text-sm mb-2 landing-display">{problem.name}</h4>
                        <p className="text-gray-500 text-sm mb-2 landing-body">{problem.description}</p>
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-600 text-sm font-semibold landing-mono">Solution:</span>
                          <span className="text-gray-500 text-sm landing-body">{problem.solution}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concurrency Data Structures */}
              {topicDetails.structures && (
                <div className="rounded-lg overflow-hidden bg-[#f7f8f9] border border-[#e3e8ee]">
                  <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                    <Icon name="database" size={16} className="text-gray-900" />
                    <h3 className="text-sm font-bold text-blue-800 landing-display">Concurrent Data Structures</h3>
                  </div>
                  <div className="p-4 grid  gap-2">
                    {topicDetails.structures.map((struct, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border border-[#e3e8ee]">
                        <code className="text-gray-900 landing-mono text-sm font-semibold whitespace-nowrap">{struct.name}</code>
                        <span className="text-gray-500 text-sm landing-body">{struct.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* Behavioral Topic Detail */}
      {(activePage === 'behavioral' || (activePage === 'low-level' && !topicDetails.coreEntities && !topicDetails.implementation && !topicDetails.functionalRequirements)) && (topicDetails.sampleQuestions || topicDetails.starExample || topicDetails.introduction || topicDetails.keyQuestions) && (
        <div className="space-y-3">
          {/* Introduction + Key Principles — side by side */}
          {(topicDetails.introduction || topicDetails.principles?.length > 0) && (
            <div className={`grid gap-2 ${topicDetails.introduction && topicDetails.principles?.length > 0 ? '' : 'grid-cols-1'}`}>
              {/* Introduction */}
              {topicDetails.introduction && (() => {
                const quoteMatch = topicDetails.introduction.match(/^"([^"]+)"\s*(.*)/s);
                return (
                  <div id="overview" className={`scroll-mt-24 rounded-lg border border-[#e3e8ee] bg-white overflow-hidden ${topicDetails.principles?.length > 0 ? '' : ''}`}>
                    <div className="px-3 py-1.5 border-b border-[#e3e8ee] bg-[#f7f8f9] flex items-center gap-2">
                      <Icon name="book" size={14} style={{ color: topicDetails.color }} />
                      <h2 className="text-sm font-bold text-blue-800 landing-display">Overview</h2>
                    </div>
                    <div className="p-3">
                      {quoteMatch ? (
                        <>
                          <div className="p-3 rounded-lg mb-2" style={{ background: `${topicDetails.color}08`, borderLeft: `4px solid ${topicDetails.color}` }}>
                            <p className="text-sm font-semibold text-gray-900 italic landing-body">"{quoteMatch[1]}"</p>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed landing-body">{quoteMatch[2].trim()}</p>
                        </>
                      ) : (
                        <p className="text-gray-700 text-sm leading-relaxed landing-body">{topicDetails.introduction}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Key Principles */}
              {topicDetails.principles && topicDetails.principles.length > 0 && (
                <div className="scroll-mt-24 rounded-lg border border-[#e3e8ee] bg-white overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-[#e3e8ee] bg-[#f7f8f9] flex items-center gap-2">
                    <Icon name="award" size={14} style={{ color: topicDetails.color }} />
                    <h2 className="text-sm font-bold text-violet-800 landing-display">Key Principles</h2>
                  </div>
                  <div className="p-2 flex flex-wrap gap-1.5">
                    {topicDetails.principles.map((principle, i) => (
                      <span key={i} className="px-2 py-1 rounded-md landing-mono text-[10px] font-semibold" style={{ background: `${topicDetails.color}12`, color: topicDetails.color, border: `1px solid ${topicDetails.color}25` }}>
                        {principle}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Key Questions — Expandable single-column cards */}
          {topicDetails.keyQuestions && topicDetails.keyQuestions.length > 0 && (
            <div id="key-questions" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
              <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: topicDetails.color }}>
                  <Icon name="messageSquare" size={12} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-violet-800 landing-display">Questions & Answers</h3>
                <span className="text-[10px] landing-mono text-gray-400 ml-auto">{topicDetails.keyQuestions.length}Q</span>
              </div>
              <div className="p-2 space-y-2">
                {topicDetails.keyQuestions.map((item, index) => {
                  const questionKey = `behavioral-${index}`;
                  const isExpanded = expandedTheoryQuestions[questionKey] === undefined ? index < 2 : expandedTheoryQuestions[questionKey];
                  return (
                    <div key={index} className="rounded-lg overflow-hidden border border-[#e3e8ee] bg-white hover:border-[#d0d5dd] transition-all">
                      {/* Question header — clickable to expand/collapse */}
                      <button
                        onClick={() => setExpandedTheoryQuestions(prev => ({ ...prev, [questionKey]: !isExpanded }))}
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 bg-[#f7f8f9] hover:bg-gray-100 transition-colors text-left"
                      >
                        <span className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: topicDetails.color }}>
                          {index + 1}
                        </span>
                        <h4 className="text-gray-900 font-semibold text-sm leading-snug landing-display flex-1">{item.question}</h4>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {/* Answer body — expanded content with block parsing */}
                      {isExpanded && (
                        <div className="px-4 py-3 text-sm text-gray-500 leading-relaxed landing-body border-t border-[#e3e8ee] space-y-2">
                          {(() => {
                            const starColors = { Situation: '#3b82f6', Task: '#f59e0b', Action: '#10b981', Result: '#ef4444' };
                            const lines = item.answer.split('\n').map(l => l.trim());

                            // Group lines into blocks: each header starts a new block with its child content
                            const blocks = [];
                            let current = null;
                            lines.forEach(t => {
                              if (!t) return;
                              const isStar = t.match(/^\*\*(?:[STAR]\s*[-–—]\s*)?(Situation|Task|Action|Result)\*\*/i) || t.match(/^(Situation|Task|Action|Result)\s*[:–—-]/i);
                              const isStarHeader = t.match(/^\*\*STAR/i);
                              const isBoldHeader = (t.startsWith('**') && t.endsWith('**')) || t.match(/^\*\*\d+\.\s/);
                              const isHeader = isStar || isStarHeader || isBoldHeader;

                              if (isHeader) {
                                if (current) blocks.push(current);
                                current = { header: t, children: [], type: isStar ? 'star' : isStarHeader ? 'star-header' : 'section' };
                              } else {
                                if (!current) current = { header: null, children: [], type: 'text' };
                                current.children.push(t);
                              }
                            });
                            if (current) blocks.push(current);

                            const renderLine = (t, i) => {
                              if (t.startsWith('\u2705') || t.startsWith('\u274C')) {
                                const ok = t.startsWith('\u2705');
                                return <div key={i} className="flex items-start gap-2 mb-1"><span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ok ? 'bg-emerald-100' : 'bg-red-100'}`}><svg className={`w-2.5 h-2.5 ${ok ? 'text-emerald-600' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>{ok ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}</svg></span><span className="text-sm landing-body">{t.substring(2).trim()}</span></div>;
                              }
                              if (t.startsWith('"') && t.endsWith('"')) {
                                return <div key={i} className="pl-3 py-1 text-sm italic text-gray-400 rounded-r landing-body" style={{ borderLeft: `2px solid ${topicDetails.color}30` }}>{t.slice(1, -1)}</div>;
                              }
                              if (t.startsWith('- ') || t.startsWith('\u2022 ')) {
                                return <div key={i} className="flex items-start gap-2 mb-1"><span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: topicDetails.color }} /><span className="text-sm landing-body">{t.substring(2)}</span></div>;
                              }
                              if (/^\d+\./.test(t)) {
                                const num = t.match(/^(\d+)\./)[1];
                                return <div key={i} className="flex items-start gap-2 mb-1"><span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 landing-mono" style={{ background: `${topicDetails.color}15`, color: topicDetails.color }}>{num}</span><span className="text-sm landing-body">{t.replace(/^\d+\.\s*/, '')}</span></div>;
                              }
                              if (t.includes('**')) {
                                const parts = t.split('**');
                                return <p key={i} className="mb-1 text-sm landing-body">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="font-semibold text-gray-900">{part}</strong> : <span key={j}>{part}</span>)}</p>;
                              }
                              if (t.match(/^(Example|Key insight|Key learning|Key takeaway|Pro tip|Tip|Note):/i)) {
                                const label = t.match(/^([^:]+):/)[1];
                                return <div key={i} className="p-2.5 rounded-lg text-sm landing-body" style={{ background: `${topicDetails.color}08`, borderLeft: `3px solid ${topicDetails.color}40` }}><span className="font-bold landing-mono" style={{ color: topicDetails.color }}>{label}:</span> {t.substring(label.length + 1).trim()}</div>;
                              }
                              return <p key={i} className="mb-1 text-sm leading-relaxed landing-body">{t}</p>;
                            };

                            const renderBlock = (block, bi) => {
                              const h = block.header;
                              if (!h && block.children.length > 0) {
                                return <div key={bi}>{block.children.map((c, ci) => renderLine(c, ci))}</div>;
                              }
                              // STAR keyword block
                              if (block.type === 'star') {
                                const sm = h.match(/^\*\*(?:[STAR]\s*[-–—]\s*)?(Situation|Task|Action|Result)\*\*\s*[:–—-]?\s*(.*)/i) || h.match(/^(Situation|Task|Action|Result)\s*[:–—-]\s*(.*)/i);
                                if (sm) {
                                  const kw = sm[1].charAt(0).toUpperCase() + sm[1].slice(1).toLowerCase();
                                  const sc = starColors[kw] || topicDetails.color;
                                  const headerRest = (sm[2] || '').replace(/^["\u201C\s\u2014\u2013-]+|["\u201D\s]+$/g, '').trim();
                                  return <div key={bi} className="rounded-lg overflow-hidden" style={{ background: `${sc}08`, borderLeft: `3px solid ${sc}`, border: `1px solid ${sc}20`, borderLeftWidth: '3px', borderLeftColor: sc }}>
                                    <div className="px-3 py-2.5">
                                      <div className="flex items-center gap-2"><span className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0 landing-mono" style={{ background: sc }}>{kw.charAt(0)}</span><span className="text-sm font-bold landing-mono" style={{ color: sc }}>{kw}</span></div>
                                      {headerRest && <p className="text-sm text-gray-500 mt-1.5 ml-8 landing-body">{headerRest}</p>}
                                      {block.children.length > 0 && <div className="mt-1.5 ml-8 space-y-1">{block.children.map((c, ci) => renderLine(c, ci))}</div>}
                                    </div>
                                  </div>;
                                }
                              }
                              // STAR Example header
                              if (block.type === 'star-header') {
                                return <div key={bi} className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold text-white px-2 py-0.5 rounded landing-mono" style={{ background: topicDetails.color }}>STAR</span><span className="text-sm font-bold text-blue-800 landing-display">Example</span></div>;
                              }
                              // Numbered step or section header
                              const numMatch = h.replace(/\*\*/g, '').match(/^(\d+)\.\s*(.*)/);
                              const sectionTitle = h.replace(/\*\*/g, '').replace(/:$/, '');
                              return <div key={bi} className="rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `3px solid ${topicDetails.color}` }}>
                                <div className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {numMatch
                                      ? <><span className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 landing-mono" style={{ background: topicDetails.color }}>{numMatch[1]}</span><span className="text-sm font-bold text-blue-800 landing-display">{numMatch[2].replace(/:$/, '')}</span></>
                                      : <><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: topicDetails.color }} /><span className="text-sm font-bold text-blue-800 landing-display">{sectionTitle}</span></>
                                    }
                                  </div>
                                  {block.children.length > 0 && <div className="mt-1.5 ml-8 space-y-1">{block.children.map((c, ci) => renderLine(c, ci))}</div>}
                                </div>
                              </div>;
                            };

                            return blocks.map((b, i) => renderBlock(b, i));
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAR + Example Response — side by side on large screens */}
          {(topicDetails.starExample || topicDetails.exampleResponse) && (
            <div className={`grid gap-2 ${topicDetails.starExample && topicDetails.exampleResponse ? '' : 'grid-cols-1'}`}>

          {/* STAR Framework Example */}
          {topicDetails.starExample && (
            <div id="star-example" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
              <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                <Icon name="target" size={14} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-blue-800 landing-display">STAR Framework Example</h3>
              </div>
              <div className="p-4">
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 via-emerald-300 to-red-300 rounded-full" style={{ zIndex: 0 }} />
                  <div className="relative space-y-0" style={{ zIndex: 1 }}>
                    {Object.entries(topicDetails.starExample).map(([key, value], idx, arr) => {
                      const config = {
                        situation: { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Situation' },
                        task: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Task' },
                        action: { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', label: 'Action' },
                        result: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Result' },
                      };
                      const c = config[key.toLowerCase()] || { color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', label: key };
                      return (
                        <div key={key}>
                          <div className="flex items-start gap-4">
                            {/* Circle node on the connector line */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white landing-mono shadow-sm" style={{ background: c.color, zIndex: 2 }}>
                              {c.label.charAt(0)}
                            </div>
                            {/* Card */}
                            <div className="flex-1 rounded-lg overflow-hidden" style={{ background: c.bg, borderLeft: `4px solid ${c.color}`, border: `1px solid ${c.border}`, borderLeftWidth: '4px', borderLeftColor: c.color }}>
                              <div className="px-4 py-3">
                                <span className="text-sm font-extrabold landing-display" style={{ color: c.color }}>{c.label}</span>
                                <p className="text-gray-600 text-sm leading-relaxed mt-1 landing-body">{value}</p>
                              </div>
                            </div>
                          </div>
                          {/* Spacer between cards (except last) */}
                          {idx < arr.length - 1 && <div className="h-3" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Example Response */}
          {topicDetails.exampleResponse && (
            <div id="example-response" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
              <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-emerald-50">
                  <Icon name="messageSquare" size={12} className="text-emerald-700" />
                </div>
                <h3 className="text-sm font-bold text-emerald-800 landing-display">Example Response</h3>
                <span className="text-[10px] landing-mono text-emerald-600 ml-auto px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">Ready to use</span>
              </div>
              <div className="p-4">
                <div className="relative rounded-lg p-4" style={{ background: `linear-gradient(135deg, ${topicDetails.color}06, ${topicDetails.color}02)`, borderLeft: `3px solid ${topicDetails.color}40` }}>
                  <div className="absolute top-3 left-5 text-4xl leading-none opacity-10 landing-display" style={{ color: topicDetails.color }}>"</div>
                  <div className="relative space-y-3 pl-2">
                    {topicDetails.exampleResponse.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="text-gray-600 text-sm leading-relaxed landing-body">{paragraph.trim()}</p>
                    ))}
                  </div>
                  <div className="absolute bottom-3 right-5 text-4xl leading-none opacity-10 landing-display rotate-180" style={{ color: topicDetails.color }}>"</div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 landing-mono">
                  <Icon name="clock" size={11} />
                  <span>~{Math.ceil(topicDetails.exampleResponse.split(' ').length / 150)} min speaking time</span>
                </div>
              </div>
            </div>
          )}

            </div>
          )}

          {/* Practice Questions + Tips — side by side on large screens */}
          {(topicDetails.sampleQuestions?.length > 0 || topicDetails.tips) && (
            <div className={`grid gap-2 ${topicDetails.sampleQuestions?.length > 0 && topicDetails.tips ? '' : 'grid-cols-1'}`}>

          {/* Practice Questions */}
          {topicDetails.sampleQuestions && topicDetails.sampleQuestions.length > 0 && (
            <div id="sample-questions" className="rounded-lg overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
              <div className="px-3 py-2 border-b border-[#e3e8ee] flex items-center gap-2 bg-[#f7f8f9]">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${topicDetails.color}15` }}>
                  <Icon name="helpCircle" size={12} style={{ color: topicDetails.color }} />
                </div>
                <h3 className="text-sm font-bold text-violet-800 landing-display">Practice Questions</h3>
                <span className="text-[10px] landing-mono text-gray-400 ml-auto">{topicDetails.sampleQuestions.length}</span>
              </div>
              <div className="grid grid-cols-1  gap-1 p-2">
                {topicDetails.sampleQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-[#f7f8f9] transition-colors group">
                    <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 landing-mono" style={{ background: `${topicDetails.color}12`, color: topicDetails.color }}>{i + 1}</span>
                    <span className="text-gray-700 text-sm landing-body group-hover:text-gray-900 transition-colors">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips for Success */}
          {topicDetails.tips && (
            <div id="tips" className="rounded-xl overflow-hidden scroll-mt-24 border border-[#e3e8ee] bg-white">
              <div className="px-4 py-2.5 border-b border-[#e3e8ee] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-emerald-800 landing-display">Tips for Success</h3>
                <span className="text-[10px] landing-mono text-emerald-600 ml-auto">{topicDetails.tips.length} tips</span>
              </div>
              <div className="grid grid-cols-1  gap-2 p-3">
                {topicDetails.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-white border border-[#e3e8ee] hover:border-[#d0d5dd] transition-colors group">
                    <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-emerald-500 text-white text-[10px] font-bold landing-mono mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-gray-700 text-sm landing-body leading-relaxed group-hover:text-gray-900 transition-colors">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
