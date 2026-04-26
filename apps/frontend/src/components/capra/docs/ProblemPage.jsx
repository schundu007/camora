import { useState, useEffect, useRef } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { Icon } from '../../shared/Icons.jsx';
import { getProblemBySlug, DIFFICULTY_COLORS, generateSlug } from '../../../data/capra/problems.js';
const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
import { getAuthHeaders } from '../../../utils/authHeaders.js';


// Language configurations for code execution
const LANGUAGE_CONFIG = {
  python: { name: 'Python', runtime: 'python3', extension: 'py', template: 'class Solution:\n    def solve(self, input):\n        # Your code here\n        pass' },
  javascript: { name: 'JavaScript', runtime: 'javascript', extension: 'js', template: '/**\n * @param {any} input\n * @return {any}\n */\nfunction solve(input) {\n    // Your code here\n}' },
  java: { name: 'Java', runtime: 'java', extension: 'java', template: 'class Solution {\n    public Object solve(Object input) {\n        // Your code here\n        return null;\n    }\n}' },
  cpp: { name: 'C++', runtime: 'cpp', extension: 'cpp', template: '#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    auto solve(auto input) {\n        // Your code here\n    }\n};' },
  go: { name: 'Go', runtime: 'go', extension: 'go', template: 'package main\n\nfunc solve(input interface{}) interface{} {\n    // Your code here\n    return nil\n}' },
};

/**
 * Simple code editor with syntax highlighting
 */
function SimpleCodeEditor({ code, onChange, language, readOnly = false }) {
  const textareaRef = useRef(null);

  return (
    <div className="relative h-full">
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="w-full h-full bg-[#0d1117] text-gray-200 font-mono text-sm leading-relaxed p-4 resize-none outline-none border-none"
        style={{ tabSize: 2 }}
        spellCheck={false}
        placeholder={readOnly ? '' : 'Write your code here...'}
      />
    </div>
  );
}

/**
 * Test case input/output display
 */
function TestCase({ testCase, index, isActive, onClick, result }) {
  const statusColor = result?.passed
    ? 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30'
    : result?.error
    ? 'bg-[var(--danger)]/20 text-[var(--danger)] border-[var(--danger)]/30'
    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)]';

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded text-sm font-medium transition-colors border ${
        isActive
          ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30'
          : statusColor
      }`}
    >
      Case {index + 1}
      {result && (
        <Icon
          name={result.passed ? 'check' : 'x'}
          size={14}
          className={`ml-2 inline ${result.passed ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}
        />
      )}
    </button>
  );
}

/**
 * Code block with copy button
 */
function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={copyCode}
        className="absolute top-3 right-3 px-3 py-1.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors opacity-0 group-hover:opacity-100 touch:opacity-100 text-sm flex items-center gap-2"
      >
        <Icon name={copied ? 'check' : 'copy'} size={14} />
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className="bg-[#0d1117] rounded p-5 overflow-x-auto border border-[var(--border)]">
        <code className="text-sm leading-relaxed font-mono text-gray-300 whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

/**
 * Example display component
 */
function ExampleBlock({ example, index }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-2.5 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
        <span className="text-base font-semibold text-[var(--text-primary)]">Example {index + 1}</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Input</span>
          <pre className="mt-1.5 bg-[#0d1117] rounded p-3 text-[var(--accent)] font-mono text-sm overflow-x-auto">
            {example.input}
          </pre>
        </div>
        <div>
          <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Output</span>
          <pre className="mt-1.5 bg-[#0d1117] rounded p-3 text-yellow-400 font-mono text-sm overflow-x-auto">
            {example.output}
          </pre>
        </div>
        {example.explanation && (
          <div>
            <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Explanation</span>
            <p className="mt-1.5 text-[var(--text-secondary)] text-sm leading-relaxed">{example.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Collapsible hint card
 */
function HintCard({ hint, index }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="bg-[var(--bg-surface)] rounded border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setRevealed(!revealed)}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-[var(--bg-elevated)] transition-colors"
      >
        <span className="font-medium text-[var(--text-primary)]">Hint {index + 1}</span>
        <Icon
          name={revealed ? 'eye' : 'eyeOff'}
          size={18}
          className={revealed ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}
        />
      </button>
      {revealed && (
        <div className="px-5 pb-4">
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{hint}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Parse URL parameters for dynamic problem data
 */
function getUrlParams() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    name: params.get('name'),
    difficulty: params.get('difficulty'),
    category: params.get('category'),
  };
}

/**
 * Convert slug back to title case name
 */
function slugToName(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Main ProblemPage Component - LeetCode/TechPrep style problem viewer with code editor
 */
export default function ProblemPage({ slug, onBack }) {
  // State
  const [activeTab, setActiveTab] = useState('description');
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [userCode, setUserCode] = useState('');
  const [activeTestCase, setActiveTestCase] = useState(0);
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [bottomTab, setBottomTab] = useState('testcase');

  const dbProblem = getProblemBySlug(slug);
  const urlParams = getUrlParams();

  // Create a dynamic problem object for problems not in database
  const problemName = urlParams.name || slugToName(slug);
  const problemCategory = urlParams.category || 'Practice';
  const problem = dbProblem || {
    id: slug,
    name: problemName,
    difficulty: urlParams.difficulty || 'Medium',
    category: problemCategory,
    tags: [problemCategory],
    description: `**${problemName}** - ${problemCategory}\n\nThis problem is not yet in our practice database. Click "Find on LeetCode" below to look it up.`,
    examples: [],
    constraints: [],
    solutions: {},
    hints: ['Look up this problem on LeetCode for examples and constraints.'],
    approach: 'Find this problem on LeetCode for the full approach.',
    isDynamic: true, // Flag to indicate this is a dynamically created problem
  };

  // Initialize code when problem or language changes
  useEffect(() => {
    // Use dbProblem directly to avoid dependency on recreated problem object
    if (dbProblem?.solutions?.[selectedLanguage]) {
      setUserCode(dbProblem.solutions[selectedLanguage].code);
    } else {
      setUserCode(LANGUAGE_CONFIG[selectedLanguage]?.template || '');
    }
    setTestResults({});
    setOutput(null);
  }, [slug, selectedLanguage, dbProblem]);

  // Reset state when problem changes
  useEffect(() => {
    setActiveTab('description');
    setActiveTestCase(0);
    setBottomTab('testcase');
  }, [slug]);

  const difficultyColor = DIFFICULTY_COLORS[problem.difficulty] || DIFFICULTY_COLORS.Easy;
  const solution = problem.solutions[selectedLanguage];


  // Run code against test cases
  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput(null);

    try {
      const currentExample = problem.examples[activeTestCase];
      const input = currentExample?.input || '';

      const response = await fetch(`${API_URL}/api/run`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          code: userCode,
          language: LANGUAGE_CONFIG[selectedLanguage]?.runtime || selectedLanguage,
          input: input,
        }),
      });

      const result = await response.json();

      setOutput({
        success: result.success,
        output: result.success ? result.output : result.error,
        expected: currentExample?.output,
        input: input,
      });

      // Check if output matches expected
      const passed = result.success && result.output?.trim() === currentExample?.output?.trim();
      setTestResults(prev => ({
        ...prev,
        [activeTestCase]: { passed, error: !result.success, output: result.output || result.error },
      }));

      setBottomTab('output');
    } catch (error) {
      setOutput({ success: false, output: error.message, expected: null });
    } finally {
      setIsRunning(false);
    }
  };

  // Run all test cases
  const runAllTests = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput(null);

    const results = {};

    for (let i = 0; i < problem.examples.length; i++) {
      const example = problem.examples[i];
      try {
        const response = await fetch(`${API_URL}/api/run`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            code: userCode,
            language: LANGUAGE_CONFIG[selectedLanguage]?.runtime || selectedLanguage,
            input: example.input,
          }),
        });

        const result = await response.json();
        const passed = result.success && result.output?.trim() === example.output?.trim();
        results[i] = { passed, error: !result.success, output: result.output || result.error };
      } catch (error) {
        results[i] = { passed: false, error: true, output: error.message };
      }
    }

    setTestResults(results);

    // Show summary in output
    const passedCount = Object.values(results).filter(r => r.passed).length;
    setOutput({
      success: passedCount === problem.examples.length,
      output: `${passedCount}/${problem.examples.length} test cases passed`,
      summary: true,
    });

    setBottomTab('output');
    setIsRunning(false);
  };

  return (
    <div className="h-screen bg-[var(--bg-app)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-[var(--bg-app)] border-b border-[var(--border)]">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-[var(--bg-elevated)] rounded transition-colors"
              >
                <Icon name="arrowLeft" size={18} className="text-[var(--text-muted)]" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-muted)] font-mono">#{problem.id}</span>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">{problem.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColor.bg} ${difficultyColor.text}`}>
                  {problem.difficulty}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {problem.leetcodeUrl && (
                <a
                  href={problem.leetcodeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Icon name="externalLink" size={14} />
                  LeetCode
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 overflow-hidden">
        <Allotment>
          {/* Left Panel - Problem Description */}
          <Allotment.Pane minSize={300} preferredSize="45%">
            <div className="h-full flex flex-col bg-[var(--bg-app)]">
              {/* Tabs */}
              <div className="flex-shrink-0 flex gap-1 px-4 pt-3 border-b border-[var(--border)]">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    activeTab === 'description'
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('solution')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    activeTab === 'solution'
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  Solution
                </button>
                <button
                  onClick={() => setActiveTab('hints')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                    activeTab === 'hints'
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  Hints
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'description' && (
                  <div className="space-y-5">
                    {/* Problem Description */}
                    <div className="prose prose-invert max-w-none">
                      {problem.description.split('\n').map((paragraph, i) => (
                        <p key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3">
                          {paragraph.split('`').map((part, j) =>
                            j % 2 === 1 ? (
                              <code key={j} className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[var(--accent)] font-mono text-sm">
                                {part}
                              </code>
                            ) : (
                              <span key={j} dangerouslySetInnerHTML={{
                                __html: part.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--text-primary)]">$1</strong>')
                              }} />
                            )
                          )}
                        </p>
                      ))}
                    </div>

                    {/* Examples */}
                    {problem.examples && problem.examples.length > 0 ? (
                      <div className="space-y-4">
                        {problem.examples.map((example, i) => (
                          <ExampleBlock key={i} example={example} index={i} />
                        ))}
                      </div>
                    ) : problem.isDynamic ? (
                      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded p-5 text-center">
                        <Icon name="externalLink" size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
                        <p className="text-[var(--text-secondary)] mb-4">
                          This problem is not in our practice database yet.
                        </p>
                        <a
                          href={`https://leetcode.com/problemset/?search=${encodeURIComponent(problem.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded font-medium transition-colors inline-flex items-center gap-2"
                        >
                          <Icon name="externalLink" size={16} />
                          Find on LeetCode
                        </a>
                      </div>
                    ) : null}

                    {/* Constraints */}
                    {problem.constraints && problem.constraints.length > 0 && (
                      <div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Constraints</h3>
                        <ul className="space-y-1.5">
                          {problem.constraints.map((constraint, i) => (
                            <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)] text-sm">
                              <span className="text-[var(--accent)] mt-0.5">•</span>
                              <code className="font-mono text-sm">{constraint}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {problem.tags.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-[var(--bg-surface)] text-[var(--text-muted)] text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'solution' && (
                  <div className="space-y-5">
                    {/* Language Selector */}
                    <div className="flex gap-2">
                      {Object.entries(LANGUAGE_CONFIG).map(([key, lang]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedLanguage(key)}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            selectedLanguage === key
                              ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
                              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>

                    {/* Approach */}
                    {problem.approach && (
                      <div className="bg-[var(--bg-surface)] rounded border border-[var(--border)] p-5">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Approach</h3>
                        <div className="prose prose-invert prose-sm max-w-none">
                          {problem.approach.split('\n').map((line, i) => {
                            if (line.startsWith('**')) {
                              return (
                                <h4 key={i} className="text-sm font-semibold text-[var(--accent)] mt-3 mb-2">
                                  {line.replace(/\*\*/g, '')}
                                </h4>
                              );
                            }
                            return line ? (
                              <p key={i} className="text-[var(--text-secondary)] text-sm leading-relaxed mb-1.5">
                                {line}
                              </p>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Solution Code */}
                    {solution && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold text-[var(--text-primary)]">{LANGUAGE_CONFIG[selectedLanguage].name} Solution</h3>
                          <div className="flex gap-3 text-xs">
                            <span className="text-[var(--text-muted)]">
                              Time: <span className="text-[var(--accent)] font-mono">{solution.timeComplexity}</span>
                            </span>
                            <span className="text-[var(--text-muted)]">
                              Space: <span className="text-[var(--accent)] font-mono">{solution.spaceComplexity}</span>
                            </span>
                          </div>
                        </div>
                        <CodeBlock code={solution.code} language={selectedLanguage} />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'hints' && (
                  <div className="space-y-3">
                    {problem.hints && problem.hints.map((hint, i) => (
                      <HintCard key={i} hint={hint} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Allotment.Pane>

          {/* Right Panel - Code Editor */}
          <Allotment.Pane minSize={400}>
            <Allotment vertical>
              {/* Code Editor */}
              <Allotment.Pane minSize={200} preferredSize="60%">
                <div className="h-full flex flex-col bg-[#0d1117]">
                  {/* Editor Header */}
                  <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      {Object.entries(LANGUAGE_CONFIG).map(([key, lang]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedLanguage(key)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            selectedLanguage === key
                              ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (problem.solutions[selectedLanguage]) {
                          setUserCode(problem.solutions[selectedLanguage].code);
                        }
                      }}
                      className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      Reset to Solution
                    </button>
                  </div>

                  {/* Code Area */}
                  <div className="flex-1 overflow-hidden">
                    <SimpleCodeEditor
                      code={userCode}
                      onChange={setUserCode}
                      language={selectedLanguage}
                    />
                  </div>
                </div>
              </Allotment.Pane>

              {/* Test Cases / Output */}
              <Allotment.Pane minSize={120}>
                <div className="h-full flex flex-col bg-[var(--bg-surface)]">
                  {/* Tabs */}
                  <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setBottomTab('testcase')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          bottomTab === 'testcase'
                            ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Test Cases
                      </button>
                      <button
                        onClick={() => setBottomTab('output')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          bottomTab === 'output'
                            ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Output
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="px-4 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isRunning ? (
                          <Icon name="loader" size={14} className="animate-spin" />
                        ) : (
                          <Icon name="play" size={14} />
                        )}
                        Run
                      </button>
                      <button
                        onClick={runAllTests}
                        disabled={isRunning}
                        className="px-4 py-1.5 bg-[var(--accent)] hover:opacity-90 text-[var(--text-primary)] rounded text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        Submit
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-3">
                    {bottomTab === 'testcase' && (
                      <div className="space-y-3">
                        {problem.examples && problem.examples.length > 0 ? (
                          <>
                            {/* Test Case Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              {problem.examples.map((_, i) => (
                                <TestCase
                                  key={i}
                                  testCase={problem.examples[i]}
                                  index={i}
                                  isActive={activeTestCase === i}
                                  onClick={() => setActiveTestCase(i)}
                                  result={testResults[i]}
                                />
                              ))}
                            </div>

                            {/* Current Test Case Details */}
                            {problem.examples[activeTestCase] && (
                              <div className="space-y-3">
                                <div>
                                  <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Input</span>
                                  <pre className="mt-1.5 bg-[#0d1117] rounded p-3 text-[var(--accent)] font-mono text-sm overflow-x-auto">
                                    {problem.examples[activeTestCase].input}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Expected Output</span>
                                  <pre className="mt-1.5 bg-[#0d1117] rounded p-3 text-yellow-400 font-mono text-sm overflow-x-auto">
                                    {problem.examples[activeTestCase].output}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-6 text-[var(--text-muted)]">
                            <Icon name="document" size={32} className="mx-auto mb-3 opacity-50" />
                            <p>No test cases available.</p>
                            <p className="text-sm mt-1">Generate a solution to get test cases.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {bottomTab === 'output' && (
                      <div className="space-y-3">
                        {output ? (
                          <>
                            {output.summary ? (
                              <div className={`p-4 rounded ${output.success ? 'bg-[var(--success)]/10 border border-[var(--success)]/30' : 'bg-[var(--danger)]/10 border border-[var(--danger)]/30'}`}>
                                <div className="flex items-center gap-2">
                                  <Icon name={output.success ? 'check' : 'x'} size={20} className={output.success ? 'text-[var(--success)]' : 'text-[var(--danger)]'} />
                                  <span className={`text-lg font-semibold ${output.success ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                    {output.output}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={`flex items-center gap-2 ${output.success ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                  <Icon name={output.success ? 'check' : 'x'} size={16} />
                                  <span className="font-medium">{output.success ? 'Accepted' : 'Error'}</span>
                                </div>
                                {output.input && (
                                  <div>
                                    <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Input</span>
                                    <pre className="mt-1.5 bg-[#0d1117] rounded p-3 text-[var(--accent)] font-mono text-sm overflow-x-auto">
                                      {output.input}
                                    </pre>
                                  </div>
                                )}
                                <div>
                                  <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">
                                    {output.success ? 'Output' : 'Error'}
                                  </span>
                                  <pre className={`mt-1.5 bg-[#0d1117] rounded p-3 font-mono text-sm overflow-x-auto ${output.success ? 'text-gray-300' : 'text-red-400'}`}>
                                    {output.output}
                                  </pre>
                                </div>
                                {output.expected && (
                                  <div>
                                    <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Expected</span>
                                    <pre className="mt-1.5 bg-[#0d1117] rounded p-3 text-yellow-400 font-mono text-sm overflow-x-auto">
                                      {output.expected}
                                    </pre>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8 text-[var(--text-muted)]">
                            <Icon name="play" size={32} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Run your code to see output</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}
