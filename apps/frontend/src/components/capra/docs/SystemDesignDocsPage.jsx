import { useState, useEffect, useRef } from 'react';
import { Icon } from '../../shared/Icons.jsx';
// DocsSidebar removed — navigation handled by AppShell

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ── Inline SVG Icons for the 10 Key Concepts ── */
function ConceptSvgNetworkProtocols() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="30" r="6" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="1.5"/>
      <circle cx="48" cy="16" r="6" fill="#3b82f6" opacity="0.2" stroke="#3b82f6" strokeWidth="1.5"/>
      <circle cx="48" cy="44" r="6" fill="#06b6d4" opacity="0.2" stroke="#06b6d4" strokeWidth="1.5"/>
      <path d="M18 28 L42 18" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arrowGreen)"/>
      <path d="M18 32 L42 42" stroke="#06b6d4" strokeWidth="1.5" markerEnd="url(#arrowCyan)"/>
      <text x="12" y="33" textAnchor="middle" fill="#10b981" fontSize="6" fontWeight="bold">A</text>
      <text x="48" y="19" textAnchor="middle" fill="#3b82f6" fontSize="6" fontWeight="bold">B</text>
      <text x="48" y="47" textAnchor="middle" fill="#06b6d4" fontSize="6" fontWeight="bold">C</text>
      <defs>
        <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#10b981"/></marker>
        <marker id="arrowCyan" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#06b6d4"/></marker>
      </defs>
    </svg>
  );
}

function ConceptSvgProxies() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 8 L16 22 L30 36 L44 22 Z" fill="#6366f1" opacity="0.15" stroke="#6366f1" strokeWidth="1.5"/>
      <path d="M30 18 L30 28" stroke="#6366f1" strokeWidth="2"/>
      <circle cx="30" cy="14" r="2" fill="#6366f1"/>
      <rect x="12" y="40" width="36" height="12" rx="3" fill="#6366f1" opacity="0.1" stroke="#6366f1" strokeWidth="1.5"/>
      <text x="30" y="49" textAnchor="middle" fill="#6366f1" fontSize="7" fontWeight="600">PROXY</text>
    </svg>
  );
}

function ConceptSvgLoadBalancing() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="4" width="20" height="12" rx="3" fill="#8b5cf6" opacity="0.15" stroke="#8b5cf6" strokeWidth="1.5"/>
      <text x="30" y="13" textAnchor="middle" fill="#8b5cf6" fontSize="6" fontWeight="600">LB</text>
      <rect x="2" y="44" width="16" height="12" rx="3" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1.5"/>
      <rect x="22" y="44" width="16" height="12" rx="3" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1.5"/>
      <rect x="42" y="44" width="16" height="12" rx="3" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1.5"/>
      <path d="M25 16 L10 44" stroke="#8b5cf6" strokeWidth="1" opacity="0.5"/>
      <path d="M30 16 L30 44" stroke="#8b5cf6" strokeWidth="1" opacity="0.5"/>
      <path d="M35 16 L50 44" stroke="#8b5cf6" strokeWidth="1" opacity="0.5"/>
      <text x="10" y="53" textAnchor="middle" fill="#10b981" fontSize="5">S1</text>
      <text x="30" y="53" textAnchor="middle" fill="#10b981" fontSize="5">S2</text>
      <text x="50" y="53" textAnchor="middle" fill="#10b981" fontSize="5">S3</text>
    </svg>
  );
}

function ConceptSvgCaching() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 6 L34 18 L28 14 Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"/>
      <path d="M30 6 L26 18 L32 14 Z" fill="#f59e0b" opacity="0.5" stroke="#f59e0b" strokeWidth="1"/>
      <line x1="30" y1="2" x2="30" y2="22" stroke="#f59e0b" strokeWidth="2"/>
      <line x1="24" y1="8" x2="36" y2="8" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5"/>
      <circle cx="18" cy="42" r="12" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M14 38 L22 38 M14 42 L22 42 M14 46 L20 46" stroke="#3b82f6" strokeWidth="1"/>
      <circle cx="44" cy="42" r="10" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2"/>
      <text x="44" y="45" textAnchor="middle" fill="#10b981" fontSize="6" fontWeight="600">CDN</text>
    </svg>
  );
}

function ConceptSvgDatabaseScaling() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="14" rx="12" ry="5" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M8 14 L8 30 C8 33 14 35 20 35 C26 35 32 33 32 30 L32 14" stroke="#3b82f6" strokeWidth="1.5" fill="none"/>
      <path d="M8 22 C8 25 14 27 20 27 C26 27 32 25 32 22" stroke="#3b82f6" strokeWidth="1" opacity="0.4"/>
      <path d="M36 20 L46 14" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arrowDB)"/>
      <path d="M36 28 L46 34" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arrowDB)"/>
      <ellipse cx="50" cy="12" rx="6" ry="3" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1"/>
      <ellipse cx="50" cy="36" rx="6" ry="3" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1"/>
      <text x="20" y="17" textAnchor="middle" fill="#3b82f6" fontSize="5" fontWeight="600">PRIMARY</text>
      <text x="50" y="15" textAnchor="middle" fill="#10b981" fontSize="4">R1</text>
      <text x="50" y="39" textAnchor="middle" fill="#10b981" fontSize="4">R2</text>
      <defs>
        <marker id="arrowDB" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#10b981"/></marker>
      </defs>
    </svg>
  );
}

function ConceptSvgPartitioning() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="24" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 2"/>
      <circle cx="30" cy="6" r="4" fill="#10b981" opacity="0.3" stroke="#10b981" strokeWidth="1.5"/>
      <circle cx="54" cy="30" r="4" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" strokeWidth="1.5"/>
      <circle cx="30" cy="54" r="4" fill="#f59e0b" opacity="0.3" stroke="#f59e0b" strokeWidth="1.5"/>
      <circle cx="6" cy="30" r="4" fill="#8b5cf6" opacity="0.3" stroke="#8b5cf6" strokeWidth="1.5"/>
      <circle cx="46" cy="12" r="3" fill="#06b6d4" opacity="0.2" stroke="#06b6d4" strokeWidth="1"/>
      <circle cx="46" cy="48" r="3" fill="#06b6d4" opacity="0.2" stroke="#06b6d4" strokeWidth="1"/>
      <circle cx="14" cy="12" r="3" fill="#06b6d4" opacity="0.2" stroke="#06b6d4" strokeWidth="1"/>
      <circle cx="14" cy="48" r="3" fill="#06b6d4" opacity="0.2" stroke="#06b6d4" strokeWidth="1"/>
      <text x="30" y="33" textAnchor="middle" fill="#06b6d4" fontSize="7" fontWeight="bold">H</text>
    </svg>
  );
}

function ConceptSvgMessageQueues() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="20" width="10" height="20" rx="2" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1.5"/>
      <rect x="18" y="14" width="24" height="32" rx="3" fill="#f59e0b" opacity="0.1" stroke="#f59e0b" strokeWidth="1.5"/>
      <rect x="22" y="20" width="16" height="5" rx="1" fill="#f59e0b" opacity="0.3"/>
      <rect x="22" y="27" width="16" height="5" rx="1" fill="#f59e0b" opacity="0.2"/>
      <rect x="22" y="34" width="16" height="5" rx="1" fill="#f59e0b" opacity="0.15"/>
      <rect x="46" y="20" width="10" height="20" rx="2" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1.5"/>
      <path d="M14 30 L18 30" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arrowMQ)"/>
      <path d="M42 30 L46 30" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arrowMQ2)"/>
      <text x="9" y="33" textAnchor="middle" fill="#10b981" fontSize="5" fontWeight="600">P</text>
      <text x="51" y="33" textAnchor="middle" fill="#3b82f6" fontSize="5" fontWeight="600">C</text>
      <text x="30" y="49" textAnchor="middle" fill="#f59e0b" fontSize="5" fontWeight="500">QUEUE</text>
      <defs>
        <marker id="arrowMQ" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5Z" fill="#10b981"/></marker>
        <marker id="arrowMQ2" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5Z" fill="#3b82f6"/></marker>
      </defs>
    </svg>
  );
}

function ConceptSvgRateLimiting() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8 L44 8 L38 28 L22 28 Z" fill="#f43f5e" opacity="0.1" stroke="#f43f5e" strokeWidth="1.5"/>
      <rect x="22" y="28" width="16" height="24" rx="2" fill="#f43f5e" opacity="0.08" stroke="#f43f5e" strokeWidth="1.5"/>
      <path d="M26 36 L34 36" stroke="#f43f5e" strokeWidth="1" opacity="0.4"/>
      <path d="M26 40 L34 40" stroke="#f43f5e" strokeWidth="1" opacity="0.4"/>
      <path d="M26 44 L34 44" stroke="#f43f5e" strokeWidth="1" opacity="0.4"/>
      <circle cx="10" cy="16" r="2" fill="#10b981"/>
      <circle cx="10" cy="24" r="2" fill="#10b981"/>
      <circle cx="10" cy="32" r="2" fill="#ef4444"/>
      <path d="M12 16 L16 14" stroke="#10b981" strokeWidth="1"/>
      <path d="M12 24 L22 22" stroke="#10b981" strokeWidth="1"/>
      <path d="M12 32 L22 30" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2"/>
      <text x="30" y="18" textAnchor="middle" fill="#f43f5e" fontSize="6" fontWeight="600">FILTER</text>
    </svg>
  );
}

function ConceptSvgClientServerPush() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="16" width="18" height="28" rx="3" fill="#8b5cf6" opacity="0.12" stroke="#8b5cf6" strokeWidth="1.5"/>
      <rect x="38" y="16" width="18" height="28" rx="3" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="1.5"/>
      <text x="13" y="34" textAnchor="middle" fill="#8b5cf6" fontSize="5" fontWeight="600">CLIENT</text>
      <text x="47" y="34" textAnchor="middle" fill="#10b981" fontSize="5" fontWeight="600">SERVER</text>
      <path d="M22 26 L38 26" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#arrowCSR)"/>
      <path d="M38 34 L22 34" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrowCSL)"/>
      <text x="30" y="23" textAnchor="middle" fill="#3b82f6" fontSize="4">REQ</text>
      <text x="30" y="42" textAnchor="middle" fill="#f59e0b" fontSize="4">PUSH</text>
      <defs>
        <marker id="arrowCSR" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5Z" fill="#3b82f6"/></marker>
        <marker id="arrowCSL" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5Z" fill="#f59e0b"/></marker>
      </defs>
    </svg>
  );
}

function ConceptSvgCAPTheorem() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 6 L54 48 L6 48 Z" fill="#a855f7" opacity="0.08" stroke="#a855f7" strokeWidth="1.5"/>
      <circle cx="30" cy="10" r="6" fill="#10b981" opacity="0.2" stroke="#10b981" strokeWidth="1.5"/>
      <circle cx="10" cy="48" r="6" fill="#3b82f6" opacity="0.2" stroke="#3b82f6" strokeWidth="1.5"/>
      <circle cx="50" cy="48" r="6" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" strokeWidth="1.5"/>
      <text x="30" y="13" textAnchor="middle" fill="#10b981" fontSize="7" fontWeight="bold">C</text>
      <text x="10" y="51" textAnchor="middle" fill="#3b82f6" fontSize="7" fontWeight="bold">A</text>
      <text x="50" y="51" textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="bold">P</text>
    </svg>
  );
}

/**
 * System Design Documentation Page
 * Uses landing page design language: Plus Jakarta Sans, Work Sans, IBM Plex Mono
 */
export default function SystemDesignDocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('a-z');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const heroAnim = useInView(0.1);
  const evaluateAnim = useInView(0.1);
  const conceptsAnim = useInView(0.1);
  const faangAnim = useInView(0.1);
  const designsAnim = useInView(0.1);
  const frameworkAnim = useInView(0.1);
  const keyConceptsAnim = useInView(0.1);
  const tradeoffsAnim = useInView(0.1);
  const referenceAnim = useInView(0.1);
  const mistakesAnim = useInView(0.1);
  const roadmapAnim = useInView(0.1);

  const topics = [
    { id: 'fundamentals', title: 'Fundamentals', icon: 'lightbulb', color: 'emerald', hex: '#10b981', questions: 12 },
    { id: 'scalability', title: 'Scalability', icon: 'chartLine', color: 'blue', hex: '#3b82f6', questions: 8 },
    { id: 'load-balancing', title: 'Load Balancing', icon: 'layers', color: 'violet', hex: '#8b5cf6', questions: 6 },
    { id: 'caching', title: 'Caching', icon: 'zap', color: 'amber', hex: '#f59e0b', questions: 10 },
    { id: 'databases', title: 'Databases', icon: 'database', color: 'red', hex: '#ef4444', questions: 15 },
    { id: 'message-queues', title: 'Message Queues', icon: 'inbox', color: 'pink', hex: '#ec4899', questions: 7 },
    { id: 'microservices', title: 'Microservices', icon: 'share', color: 'cyan', hex: '#06b6d4', questions: 9 },
    { id: 'api-design', title: 'API Design', icon: 'code', color: 'green', hex: '#22c55e', questions: 11 },
    { id: 'cap-theorem', title: 'CAP Theorem', icon: 'puzzle', color: 'purple', hex: '#a855f7', questions: 5 },
    { id: 'consistency', title: 'Consistency Patterns', icon: 'refresh', color: 'emerald', hex: '#059669', questions: 8 },
    { id: 'cdn', title: 'CDN', icon: 'globe', color: 'orange', hex: '#f97316', questions: 4 },
    { id: 'dns', title: 'DNS', icon: 'globe', color: 'lime', hex: '#84cc16', questions: 3 },
    { id: 'proxies', title: 'Proxies', icon: 'shield', color: 'indigo', hex: '#6366f1', questions: 5 },
    { id: 'replication', title: 'Replication', icon: 'copy', color: 'rose', hex: '#f43f5e', questions: 6 },
    { id: 'sharding', title: 'Sharding', icon: 'layers', color: 'sky', hex: '#0ea5e9', questions: 7 },
    { id: 'websockets', title: 'WebSockets', icon: 'link', color: 'violet', hex: '#8b5cf6', questions: 4 },
  ];

  const systemDesigns = [
    { id: 'url-shortener', title: 'URL Shortener', subtitle: 'TinyURL / Bit.ly', icon: 'link', hex: '#10b981', difficulty: 'Easy', diffColor: 'emerald' },
    { id: 'twitter', title: 'Twitter / X', subtitle: 'Social Media Feed', icon: 'messageSquare', hex: '#3b82f6', difficulty: 'Hard', diffColor: 'red' },
    { id: 'uber', title: 'Uber / Lyft', subtitle: 'Ride-Sharing Service', icon: 'mapPin', hex: '#8b5cf6', difficulty: 'Hard', diffColor: 'red' },
    { id: 'whatsapp', title: 'WhatsApp', subtitle: 'Real-Time Chat', icon: 'messageSquare', hex: '#22c55e', difficulty: 'Medium', diffColor: 'amber' },
    { id: 'youtube', title: 'YouTube', subtitle: 'Video Streaming', icon: 'video', hex: '#ef4444', difficulty: 'Hard', diffColor: 'red' },
    { id: 'netflix', title: 'Netflix', subtitle: 'Streaming Platform', icon: 'video', hex: '#f43f5e', difficulty: 'Hard', diffColor: 'red' },
    { id: 'dropbox', title: 'Dropbox', subtitle: 'File Storage', icon: 'folder', hex: '#3b82f6', difficulty: 'Medium', diffColor: 'amber' },
    { id: 'instagram', title: 'Instagram', subtitle: 'Photo Sharing', icon: 'camera', hex: '#ec4899', difficulty: 'Hard', diffColor: 'red' },
    { id: 'google-maps', title: 'Google Maps', subtitle: 'Location Services', icon: 'mapPin', hex: '#f59e0b', difficulty: 'Hard', diffColor: 'red' },
    { id: 'slack', title: 'Slack', subtitle: 'Team Messaging', icon: 'messageSquare', hex: '#6366f1', difficulty: 'Medium', diffColor: 'amber' },
  ];

  const filteredTopics = topics
    .filter(topic => topic.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'a-z') return a.title.localeCompare(b.title);
      if (sortOrder === 'z-a') return b.title.localeCompare(a.title);
      if (sortOrder === 'most') return b.questions - a.questions;
      if (sortOrder === 'least') return a.questions - b.questions;
      return 0;
    });

  const difficultyStyles = {
    Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Hard: 'bg-red-50 text-red-700 border-red-200',
  };

  /* ── Data for new sections ── */
  const evaluationCriteria = [
    { title: 'Problem Solving', pct: '~30%', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', desc: 'Break down ambiguous problems into clear requirements. Identify edge cases and constraints before designing.' },
    { title: 'Technical Design', pct: '~30%', color: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', desc: 'Propose appropriate components, data models, and APIs. Justify technology choices with concrete reasoning.' },
    { title: 'Trade-Off Analysis', pct: '~20%', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', desc: 'Evaluate consistency vs availability, latency vs throughput, and cost vs performance for each decision.' },
    { title: 'Communication', pct: '~20%', color: '#f43f5e', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', desc: 'Structure your approach clearly. Narrate your thought process and proactively address follow-up concerns.' },
  ];

  const frameworkPhases = [
    {
      phase: 'Phase 1: Understand & Scope',
      color: '#10b981',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      dotBg: 'bg-emerald-500',
      steps: [
        { num: 1, title: 'Clarify Ambiguity', desc: 'Narrow down exact scope' },
        { num: 2, title: 'Functional Requirements', desc: 'Define must-have features' },
        { num: 3, title: 'Non-Functional Requirements', desc: 'Scale & availability targets' },
      ],
    },
    {
      phase: 'Phase 2: Math & Interface',
      color: '#f59e0b',
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      dotBg: 'bg-amber-500',
      steps: [
        { num: 4, title: 'Capacity Estimation', desc: 'Traffic & storage math' },
        { num: 5, title: 'Define System APIs', desc: 'REST/gRPC endpoints' },
      ],
    },
    {
      phase: 'Phase 3: High-Level Architecture',
      color: '#3b82f6',
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      dotBg: 'bg-blue-500',
      steps: [
        { num: 6, title: 'Data Model & Schema', desc: 'Map core entities' },
        { num: 7, title: 'Database Selection', desc: 'SQL vs. NoSQL choices' },
        { num: 8, title: 'High-Level Diagram', desc: 'Client to DB flow' },
      ],
    },
    {
      phase: 'Phase 4: Deep Dives',
      color: '#f43f5e',
      bg: 'bg-rose-50',
      border: 'border-rose-300',
      dotBg: 'bg-rose-500',
      steps: [
        { num: 9, title: 'Component Deep Dive', desc: 'Hardest logical challenge' },
        { num: 10, title: 'Partitioning & Sharding', desc: 'Split data for scale' },
        { num: 11, title: 'Caching Strategy', desc: 'Minimize latency with Redis' },
        { num: 12, title: 'Load Balancing', desc: 'Distribute network traffic' },
        { num: 13, title: 'Async Processing', desc: 'Decouple via message queues' },
      ],
    },
    {
      phase: 'Phase 5: Evaluation',
      color: '#8b5cf6',
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      dotBg: 'bg-purple-500',
      steps: [
        { num: 14, title: 'Trade-offs Analysis', desc: 'Defend architectural choices' },
      ],
    },
  ];

  const latencyRef = [
    { label: 'L1 cache reference', value: '0.5 ns' },
    { label: 'Main memory reference', value: '100 ns' },
    { label: '1 MB from memory', value: '250 \u00B5s' },
    { label: '1 MB from SSD', value: '1 ms' },
    { label: '1 MB from network', value: '10 ms' },
    { label: 'CA \u2192 Netherlands roundtrip', value: '150 ms' },
  ];

  const keyConcepts = [
    { title: 'Network Protocols & APIs', desc: 'TCP guarantees delivery with handshakes; UDP trades reliability for speed. REST uses HTTP verbs for CRUD, gRPC uses Protocol Buffers for high-performance inter-service calls.', SvgIcon: ConceptSvgNetworkProtocols, accent: '#10b981' },
    { title: 'Proxies', desc: 'Forward proxies mask client identity and enforce policies. Reverse proxies (NGINX, Envoy) provide SSL termination, caching, and load distribution in front of servers.', SvgIcon: ConceptSvgProxies, accent: '#6366f1' },
    { title: 'Load Balancing', desc: 'L4 balancers route by IP/port (fast, no inspection). L7 balancers inspect HTTP headers for content-based routing. Algorithms: round-robin, least connections, consistent hashing.', SvgIcon: ConceptSvgLoadBalancing, accent: '#8b5cf6' },
    { title: 'Caching & CDNs', desc: 'Application caches (Redis/Memcached) use LRU or LFU eviction. CDNs cache static assets at edge PoPs worldwide, reducing latency from 150ms to under 20ms for global users.', SvgIcon: ConceptSvgCaching, accent: '#f59e0b' },
    { title: 'Database Scaling', desc: 'SQL databases offer ACID transactions and complex joins. NoSQL stores (MongoDB, Cassandra) enable horizontal scaling. Leader-follower replication separates read/write workloads.', SvgIcon: ConceptSvgDatabaseScaling, accent: '#3b82f6' },
    { title: 'Partitioning & Hashing', desc: 'Range-based sharding splits by key ranges; hash-based distributes evenly. Consistent hashing minimizes data movement when nodes join/leave the ring.', SvgIcon: ConceptSvgPartitioning, accent: '#06b6d4' },
    { title: 'Message Queues', desc: 'RabbitMQ provides reliable task queuing with acknowledgments. Kafka offers durable, ordered event streaming with consumer groups for parallel processing at massive scale.', SvgIcon: ConceptSvgMessageQueues, accent: '#f59e0b' },
    { title: 'Rate Limiting', desc: 'Token Bucket allows bursts up to bucket size. Leaky Bucket enforces constant rate. Fixed Window counts per interval. Sliding Window combines accuracy with efficiency.', SvgIcon: ConceptSvgRateLimiting, accent: '#f43f5e' },
    { title: 'Client-Server Push', desc: 'Long Polling holds connections open until data arrives. Server-Sent Events stream one-way updates. WebSockets provide full-duplex, persistent connections for real-time apps.', SvgIcon: ConceptSvgClientServerPush, accent: '#8b5cf6' },
    { title: 'CAP Theorem', desc: 'In a network partition, choose Consistency (every read gets latest write) or Availability (every request gets a response). CP: banking, AP: social feeds, DNS.', SvgIcon: ConceptSvgCAPTheorem, accent: '#a855f7' },
  ];

  const tradeoffs = [
    { a: { title: 'Consistency', desc: 'Every read returns the latest write. Required for banking, payments, inventory.' }, b: { title: 'Availability', desc: 'Every request gets a response. Acceptable stale data for social media, DNS.' }, color: '#10b981' },
    { a: { title: 'Low Latency', desc: 'Optimize for individual request speed. In-memory caching, edge computing.' }, b: { title: 'High Throughput', desc: 'Maximize total operations per second. Batch processing, async pipelines.' }, color: '#3b82f6' },
    { a: { title: 'SQL (Relational)', desc: 'ACID compliance, complex joins, strong schema. PostgreSQL, MySQL.' }, b: { title: 'NoSQL (Non-Relational)', desc: 'Horizontal scaling, flexible schema, eventual consistency. MongoDB, Cassandra.' }, color: '#8b5cf6' },
    { a: { title: 'Normalization', desc: 'Eliminate redundancy, maintain integrity with foreign keys and JOINs.' }, b: { title: 'Denormalization', desc: 'Pre-join data, eliminate JOINs, trade storage for read performance.' }, color: '#f59e0b' },
    { a: { title: 'Monolith', desc: 'Single codebase, simple deployment, shared state. Ideal for early-stage products.' }, b: { title: 'Microservices', desc: 'Domain-split services, independent scaling and deployment. Complex but flexible.' }, color: '#06b6d4' },
    { a: { title: 'Synchronous', desc: 'Caller waits for response. Simple flow, immediate feedback. REST API calls.' }, b: { title: 'Asynchronous', desc: 'Fire and forget, background processing. Message queues, event-driven architecture.' }, color: '#f43f5e' },
    { a: { title: 'Read-Heavy', desc: 'Fan-out on write, heavy caching layer, denormalized views. Twitter timelines.' }, b: { title: 'Write-Heavy', desc: 'Append-only logs, queue buffering, LSM trees. Analytics ingestion, IoT data.' }, color: '#a855f7' },
  ];

  const commonMistakes = [
    { title: 'Solutioning Before Scoping', desc: 'Jumping into database schemas without clarifying requirements, scale, and constraints first.', icon: 'alertTriangle', color: '#ef4444' },
    { title: '"Buzzword Bingo"', desc: 'Name-dropping Kafka, Redis, or Kubernetes without explaining why they solve the specific problem.', icon: 'alertCircle', color: '#f59e0b' },
    { title: 'Single Point of Failure', desc: 'Forgetting redundancy. Every critical path needs replication, failover, and health checks.', icon: 'shield', color: '#f43f5e' },
    { title: 'Ignoring Bottlenecks', desc: 'Not identifying the hottest path. Analyze where 80% of traffic flows and optimize that first.', icon: 'zap', color: '#8b5cf6' },
    { title: 'The "Silent Treatment"', desc: 'Thinking quietly for minutes. Interviewers want to hear your reasoning process in real time.', icon: 'microphone', color: '#3b82f6' },
  ];

  const faangLevels = [
    { level: 'L4', subtitle: 'Mid-Level', desc: 'Build a working system with guidance. Cover core components, basic scaling, and common patterns. Acceptable to receive hints.', borderColor: 'border-emerald-400', bg: 'bg-emerald-50/50', badge: 'bg-emerald-100 text-emerald-700', featured: false },
    { level: 'L5', subtitle: 'Senior', desc: 'Drive the interview end-to-end. Identify bottlenecks proactively, propose multiple solutions with trade-offs, and handle follow-ups confidently.', borderColor: 'border-cyan-400', bg: 'bg-cyan-50/50', badge: 'bg-cyan-100 text-cyan-700', featured: true },
    { level: 'L6', subtitle: 'Staff+', desc: 'Anticipate 100x scale from the start. Design multi-region architecture, address tail latency, plan capacity for 3-5 year growth, and mentor the interviewer through your thought process.', borderColor: 'border-purple-400', bg: 'bg-purple-50/50', badge: 'bg-purple-100 text-purple-700', featured: false },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white landing-root">
      {/* Sidebar provided by AppShell */}

      <div className="flex-1 min-h-screen overflow-y-auto">
        {/* Top Nav Bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100">
          <div className="px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a href="/capra/prepare" className="text-sm text-gray-400 hover:text-gray-900 transition-colors landing-body font-medium">Preparation</a>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-900 landing-body font-semibold">System Design</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="/capra/design" className="px-4 py-2 bg-emerald-500 text-white font-semibold text-sm rounded hover:bg-emerald-600 transition-colors landing-body">
                Practice Now
              </a>
            </div>
          </div>
        </div>

        <div className="px-8 py-10 max-w-6xl mx-auto">

          {/* ════════════════════════════════════════════════════════════════════
              HERO SECTION
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={heroAnim.ref} className={`mb-10 transition-all duration-700 ${heroAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-emerald-200 bg-emerald-50 rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] landing-mono text-emerald-700 tracking-wide uppercase">System Design Mastery</span>
              </div>

              <h1 className="landing-display font-extrabold text-3xl md:text-4xl tracking-tight text-gray-900 mb-3">
                Design Systems That{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Scale</span>
              </h1>

              <p className="text-base text-gray-500 max-w-xl leading-relaxed landing-body mb-8">
                Master distributed systems, scalability patterns, and architecture trade-offs. From fundamentals to real-world designs used at top tech companies.
              </p>

              {/* Architecture Hero SVG */}
              <div className="w-full max-w-3xl mx-auto">
                <div className="rounded-xl p-6 overflow-hidden" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                  <svg viewBox="0 0 720 280" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Users */}
                    <rect x="10" y="110" width="90" height="44" rx="10" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.5"/>
                    <text x="55" y="128" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="700" fontFamily="monospace">USERS</text>
                    <text x="55" y="143" textAnchor="middle" fill="#10b981" fontSize="8" fontFamily="monospace" opacity="0.7">Clients</text>

                    {/* Arrow: Users → LB */}
                    <line x1="100" y1="132" x2="150" y2="132" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#heroArrowE)"/>

                    {/* Load Balancer */}
                    <rect x="150" y="105" width="100" height="54" rx="10" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="1.5"/>
                    <text x="200" y="128" textAnchor="middle" fill="#06b6d4" fontSize="10" fontWeight="700" fontFamily="monospace">LOAD</text>
                    <text x="200" y="143" textAnchor="middle" fill="#06b6d4" fontSize="10" fontWeight="700" fontFamily="monospace">BALANCER</text>

                    {/* Arrows: LB → App Servers */}
                    <line x1="250" y1="120" x2="310" y2="56" stroke="#06b6d4" strokeWidth="1" markerEnd="url(#heroArrowC)"/>
                    <line x1="250" y1="132" x2="310" y2="132" stroke="#06b6d4" strokeWidth="1" markerEnd="url(#heroArrowC)"/>
                    <line x1="250" y1="144" x2="310" y2="208" stroke="#06b6d4" strokeWidth="1" markerEnd="url(#heroArrowC)"/>

                    {/* App Server 1 */}
                    <rect x="310" y="30" width="90" height="44" rx="8" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeWidth="1.5"/>
                    <text x="355" y="50" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600" fontFamily="monospace">APP-01</text>
                    <text x="355" y="64" textAnchor="middle" fill="#10b981" fontSize="7" fontFamily="monospace" opacity="0.6">Node.js</text>

                    {/* App Server 2 */}
                    <rect x="310" y="108" width="90" height="44" rx="8" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeWidth="1.5"/>
                    <text x="355" y="128" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600" fontFamily="monospace">APP-02</text>
                    <text x="355" y="142" textAnchor="middle" fill="#10b981" fontSize="7" fontFamily="monospace" opacity="0.6">Node.js</text>

                    {/* App Server 3 */}
                    <rect x="310" y="186" width="90" height="44" rx="8" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeWidth="1.5"/>
                    <text x="355" y="206" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600" fontFamily="monospace">APP-03</text>
                    <text x="355" y="220" textAnchor="middle" fill="#10b981" fontSize="7" fontFamily="monospace" opacity="0.6">Node.js</text>

                    {/* Arrows to backend services */}
                    <line x1="400" y1="52" x2="480" y2="52" stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 2" markerEnd="url(#heroArrowR)"/>
                    <line x1="400" y1="130" x2="480" y2="130" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" markerEnd="url(#heroArrowB)"/>
                    <line x1="400" y1="208" x2="480" y2="208" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 2" markerEnd="url(#heroArrowA)"/>

                    {/* Redis Cache */}
                    <rect x="480" y="26" width="100" height="44" rx="8" fill="#f43f5e" fillOpacity="0.12" stroke="#f43f5e" strokeWidth="1.5"/>
                    <text x="530" y="46" textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="700" fontFamily="monospace">CACHE</text>
                    <text x="530" y="60" textAnchor="middle" fill="#f43f5e" fontSize="7" fontFamily="monospace" opacity="0.7">Redis</text>

                    {/* PostgreSQL */}
                    <rect x="480" y="108" width="100" height="44" rx="8" fill="#3b82f6" fillOpacity="0.12" stroke="#3b82f6" strokeWidth="1.5"/>
                    <text x="530" y="128" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="700" fontFamily="monospace">DATABASE</text>
                    <text x="530" y="142" textAnchor="middle" fill="#3b82f6" fontSize="7" fontFamily="monospace" opacity="0.7">PostgreSQL</text>

                    {/* Kafka */}
                    <rect x="480" y="186" width="100" height="44" rx="8" fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeWidth="1.5"/>
                    <text x="530" y="206" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="700" fontFamily="monospace">QUEUE</text>
                    <text x="530" y="220" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="monospace" opacity="0.7">Kafka</text>

                    {/* Cross-connections from App-01 to DB */}
                    <line x1="400" y1="60" x2="480" y2="120" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
                    {/* Cross-connections from App-03 to Cache */}
                    <line x1="400" y1="198" x2="480" y2="60" stroke="#f43f5e" strokeWidth="0.5" opacity="0.3"/>

                    {/* Performance Badges */}
                    <rect x="614" y="30" width="96" height="28" rx="6" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1"/>
                    <text x="662" y="48" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="700" fontFamily="monospace">50K req/s</text>

                    <rect x="614" y="112" width="96" height="28" rx="6" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="1"/>
                    <text x="662" y="130" textAnchor="middle" fill="#06b6d4" fontSize="9" fontWeight="700" fontFamily="monospace">99.99% up</text>

                    <rect x="614" y="194" width="96" height="28" rx="6" fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="1"/>
                    <text x="662" y="212" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="700" fontFamily="monospace">{'<'}50ms p99</text>

                    {/* Arrow markers */}
                    <defs>
                      <marker id="heroArrowE" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="#10b981"/></marker>
                      <marker id="heroArrowC" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="#06b6d4"/></marker>
                      <marker id="heroArrowR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#f43f5e"/></marker>
                      <marker id="heroArrowB" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#3b82f6"/></marker>
                      <marker id="heroArrowA" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#f59e0b"/></marker>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-10" />

          {/* ════════════════════════════════════════════════════════════════════
              WHAT INTERVIEWERS EVALUATE (NEW)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={evaluateAnim.ref} className={`mb-12 transition-all duration-700 ${evaluateAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Evaluation Criteria</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                What Interviewers Evaluate
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {evaluationCriteria.map((item, i) => (
                <div
                  key={i}
                  className={`p-5 rounded-lg border bg-white ${item.border} transition-all hover:shadow-sm`}
                  style={{ borderLeftWidth: '4px', borderLeftColor: item.color }}
                >
                  <div className="landing-display font-extrabold text-2xl mb-1" style={{ color: item.color }}>
                    {item.pct}
                  </div>
                  <div className="landing-display font-semibold text-sm text-gray-900 mb-2">{item.title}</div>
                  <p className="text-xs text-gray-500 leading-relaxed landing-body">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-12" />

          {/* Search and Sort */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg text-sm text-gray-900 placeholder-gray-400 w-64 border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all landing-body"
              />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 cursor-pointer landing-body"
            >
              <option value="a-z">A - Z</option>
              <option value="z-a">Z - A</option>
              <option value="most">Most Questions</option>
              <option value="least">Least Questions</option>
            </select>
          </div>

          {/* Featured Banner */}
          <a href="#" className="group block mb-10 p-5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-sm">
                  <Icon name="systemDesign" size={20} className="text-white" />
                </div>
                <div>
                  <span className="text-gray-900 font-semibold landing-display text-sm">How to Pass System Design Interviews in 2026</span>
                  <span className="block text-xs text-gray-500 landing-body mt-0.5">Complete framework, tips, and strategies from FAANG engineers</span>
                </div>
              </div>
              <Icon name="chevronRight" size={18} className="text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </a>

          {/* ════════════════════════════════════════════════════════════════════
              CORE CONCEPTS (existing)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={conceptsAnim.ref} className={`mb-12 transition-all duration-700 ${conceptsAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Foundations</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Core Concepts
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredTopics.map((topic, i) => (
                <a
                  key={topic.id}
                  href={`/capra/prepare/system-design/${topic.id}`}
                  className="group p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
                  style={{ transitionDelay: `${i * 30}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: `${topic.hex}12` }}>
                        <Icon name={topic.icon} size={16} style={{ color: topic.hex }} />
                      </div>
                      <span className="text-gray-900 font-semibold text-sm landing-display">{topic.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs landing-body">
                      <Icon name="star" size={12} />
                      <span>{topic.questions} Questions</span>
                    </div>
                    <Icon name="chevronRight" size={14} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              FAANG LEVEL EXPECTATIONS (NEW)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={faangAnim.ref} className={`mb-12 transition-all duration-700 ${faangAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Level Guide</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                FAANG Level Expectations
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {faangLevels.map((item, i) => (
                <div
                  key={i}
                  className={`relative p-6 rounded-lg border-2 ${item.borderColor} ${item.bg} transition-all hover:shadow-md ${item.featured ? 'ring-2 ring-cyan-200 scale-[1.02]' : ''}`}
                >
                  {item.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-cyan-500 text-white text-[10px] landing-mono font-semibold rounded-full uppercase tracking-wider">Most Common</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${item.badge} landing-mono font-bold text-sm`}>
                      {item.level}
                    </span>
                    <span className="landing-display font-semibold text-gray-900 text-sm">{item.subtitle}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed landing-body">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              COMMON SYSTEM DESIGNS (existing)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={designsAnim.ref} className={`mb-12 transition-all duration-700 ${designsAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Real-World</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Common System Designs
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {systemDesigns.map((design) => (
                <a
                  key={design.id}
                  href={`/capra/prepare/system-design/${design.id}`}
                  className="group p-5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${design.hex}12` }}>
                      <Icon name={design.icon} size={22} style={{ color: design.hex }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-gray-900 font-semibold text-sm landing-display">{design.title}</h3>
                        <Icon name="chevronRight" size={14} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-gray-500 text-xs landing-body mb-2.5">{design.subtitle}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] landing-mono font-medium border ${difficultyStyles[design.difficulty]}`}>
                        {design.difficulty}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              14-STEP INTERVIEW FRAMEWORK (REPLACES old 4-phase)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={frameworkAnim.ref} className={`mb-12 transition-all duration-700 ${frameworkAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Framework</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                14-Step Interview Framework
                <span className="text-gray-400 font-normal text-base landing-body ml-2">(45 min)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline */}
              <div className="lg:col-span-2">
                <div className="relative pl-8">
                  {/* Vertical line */}
                  <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 via-blue-300 to-purple-300" />

                  {frameworkPhases.map((phase, pi) => (
                    <div key={pi} className="mb-6 last:mb-0">
                      {/* Phase header */}
                      <div className="relative flex items-center mb-3 -ml-8">
                        <div className={`w-6 h-6 rounded-full ${phase.dotBg} flex items-center justify-center z-10 ring-4 ring-white`}>
                          <span className="text-white text-[9px] font-bold">{pi + 1}</span>
                        </div>
                        <span className="ml-3 landing-display font-bold text-sm text-gray-900">{phase.phase}</span>
                      </div>

                      {/* Steps */}
                      <div className="space-y-2 ml-0">
                        {phase.steps.map((step) => (
                          <div key={step.num} className="relative flex items-start gap-3 -ml-8">
                            {/* Step dot on timeline */}
                            <div className="w-6 h-6 flex items-center justify-center z-10">
                              <div className="w-3 h-3 rounded-full border-2 bg-white" style={{ borderColor: phase.color }} />
                            </div>

                            {/* Step card */}
                            <div className={`flex-1 p-3 rounded-lg border ${phase.border} bg-white hover:shadow-sm transition-all`}>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="landing-mono text-xs font-bold" style={{ color: phase.color }}>
                                  {String(step.num).padStart(2, '0')}
                                </span>
                                <span className="landing-display font-semibold text-sm text-gray-900">{step.title}</span>
                              </div>
                              <p className="text-xs text-gray-500 landing-body">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Latency Reference Callout */}
              <div className="lg:col-span-1">
                <div className="sticky top-20 p-5 rounded-lg border border-amber-200 bg-amber-50/50">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded flex items-center justify-center bg-amber-100">
                      <Icon name="zap" size={14} className="text-amber-600" />
                    </div>
                    <h3 className="landing-display font-bold text-sm text-gray-900">Latency Reference</h3>
                  </div>
                  <div className="space-y-3">
                    {latencyRef.map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 landing-body">{item.label}</span>
                        <span className="text-xs font-semibold landing-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-200">
                    <p className="text-[10px] text-gray-500 landing-body leading-relaxed">
                      Memorize these for back-of-envelope calculations. Interviewers expect you to reference real latency numbers when estimating capacity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              10 KEY CONCEPTS WITH SVG ILLUSTRATIONS (NEW)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={keyConceptsAnim.ref} className={`mb-12 transition-all duration-700 ${keyConceptsAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Deep Knowledge</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                10 Key Concepts
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyConcepts.map((concept, i) => {
                const SvgComponent = concept.SvgIcon;
                return (
                  <div
                    key={i}
                    className="p-5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
                    style={{ borderTopWidth: '3px', borderTopColor: concept.accent }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <SvgComponent />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="landing-mono text-xs font-bold" style={{ color: concept.accent }}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <h3 className="landing-display font-semibold text-sm text-gray-900">{concept.title}</h3>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed landing-body">{concept.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              TOP 7 TRADE-OFFS (ENHANCED — replaces old Quick Reference trade-offs)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={tradeoffsAnim.ref} className={`mb-12 transition-all duration-700 ${tradeoffsAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Decision Making</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Top 7 Trade-Offs
              </h2>
            </div>

            <div className="space-y-3">
              {tradeoffs.map((t, i) => (
                <div key={i} className="rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch">
                    {/* Option A */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                        <span className="landing-display font-semibold text-sm text-gray-900">{t.a.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed landing-body">{t.a.desc}</p>
                    </div>

                    {/* VS Divider */}
                    <div className="hidden md:flex items-center justify-center px-3">
                      <div className="flex flex-col items-center">
                        <div className="w-px h-4 bg-gray-200" />
                        <span className="landing-mono text-[10px] font-bold text-gray-400 my-1">VS</span>
                        <div className="w-px h-4 bg-gray-200" />
                      </div>
                    </div>
                    <div className="md:hidden h-px bg-gray-100 mx-4" />

                    {/* Option B */}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="landing-display font-semibold text-sm text-gray-900">{t.b.title}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed landing-body">{t.b.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              QUICK REFERENCE (existing — Building Blocks only, trade-offs moved above)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={referenceAnim.ref} className={`mb-12 transition-all duration-700 ${referenceAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Cheat Sheet</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Quick Reference
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Building Blocks */}
              <div className="p-5 rounded-lg border border-gray-200 bg-white">
                <h3 className="text-gray-900 font-semibold text-sm landing-display mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-50">
                    <Icon name="layers" size={14} className="text-blue-500" />
                  </div>
                  Building Blocks
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Load Balancer', value: 'NGINX, HAProxy, ALB' },
                    { label: 'Cache', value: 'Redis, Memcached' },
                    { label: 'Message Queue', value: 'Kafka, RabbitMQ, SQS' },
                    { label: 'Search', value: 'Elasticsearch, Solr' },
                    { label: 'SQL Database', value: 'PostgreSQL, MySQL' },
                    { label: 'NoSQL Database', value: 'MongoDB, Cassandra' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 landing-body">{item.label}</span>
                      <span className="text-gray-900 landing-mono text-xs">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Trade-offs (kept as quick summary) */}
              <div className="p-5 rounded-lg border border-gray-200 bg-white">
                <h3 className="text-gray-900 font-semibold text-sm landing-display mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded flex items-center justify-center bg-violet-50">
                    <Icon name="puzzle" size={14} className="text-violet-500" />
                  </div>
                  Key Trade-offs
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Consistency vs Availability', value: 'CAP Theorem' },
                    { label: 'Latency vs Throughput', value: 'System tuning' },
                    { label: 'SQL vs NoSQL', value: 'Data modeling' },
                    { label: 'Push vs Pull', value: 'Data delivery' },
                    { label: 'Sync vs Async', value: 'Communication' },
                    { label: 'Strong vs Eventual', value: 'Consistency' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 landing-body">{item.label}</span>
                      <span className="text-gray-900 landing-mono text-xs">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              COMMON MISTAKES (NEW)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={mistakesAnim.ref} className={`mb-12 transition-all duration-700 ${mistakesAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-red-500 tracking-widest uppercase">Avoid These</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Common Mistakes
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {commonMistakes.map((mistake, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-all"
                  style={{ borderTopWidth: '3px', borderTopColor: mistake.color }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${mistake.color}12` }}>
                    <Icon name={mistake.icon} size={18} style={{ color: mistake.color }} />
                  </div>
                  <h3 className="landing-display font-semibold text-xs text-gray-900 mb-1.5">{mistake.title}</h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed landing-body">{mistake.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              LEARNING ROADMAP FLOWCHART (NEW)
              ════════════════════════════════════════════════════════════════════ */}
          <section ref={roadmapAnim.ref} className={`mb-12 transition-all duration-700 ${roadmapAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Your Path</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Learning Roadmap
              </h2>
            </div>

            <div className="max-w-3xl mx-auto">
              {/* START node */}
              <div className="flex justify-center mb-4">
                <div className="px-6 py-2.5 rounded-full bg-emerald-500 text-white landing-display font-bold text-sm shadow-sm">
                  START
                </div>
              </div>

              {/* Connector */}
              <div className="flex justify-center mb-4">
                <div className="w-0.5 h-8 bg-gray-300" />
              </div>

              {/* Decision 1: Beginner? */}
              <div className="flex justify-center mb-4">
                <div className="relative w-52 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-emerald-400 bg-emerald-50 rotate-45 rounded-lg" />
                  <span className="relative z-10 text-center landing-display font-semibold text-xs text-gray-900 leading-tight px-2">
                    Are you a<br />Beginner?
                  </span>
                </div>
              </div>

              {/* YES / NO branches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-4">
                {/* YES Branch */}
                <div className="flex flex-col items-center">
                  <span className="landing-mono text-xs font-bold text-emerald-600 mb-2">YES</span>
                  <div className="w-0.5 h-6 bg-emerald-300 mb-2" />
                  <div className="w-full p-4 rounded-lg border-2 border-emerald-300 bg-emerald-50 text-center">
                    <div className="landing-display font-bold text-sm text-emerald-800 mb-1">Start with Fundamentals</div>
                    <p className="text-[11px] text-emerald-600 landing-body">Networking, OS basics, data structures, HTTP</p>
                  </div>
                </div>

                {/* NO Branch → next decision */}
                <div className="flex flex-col items-center">
                  <span className="landing-mono text-xs font-bold text-gray-500 mb-2">NO</span>
                  <div className="w-0.5 h-6 bg-gray-300 mb-2" />

                  {/* Decision 2: FAANG? */}
                  <div className="relative w-48 h-24 flex items-center justify-center mb-3">
                    <div className="absolute inset-0 border-2 border-blue-400 bg-blue-50 rotate-45 rounded-lg" />
                    <span className="relative z-10 text-center landing-display font-semibold text-xs text-gray-900 leading-tight px-2">
                      Prepping for<br />FAANG?
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    {/* YES → Core Loop */}
                    <div className="flex flex-col items-center">
                      <span className="landing-mono text-xs font-bold text-blue-600 mb-2">YES</span>
                      <div className="w-0.5 h-4 bg-blue-300 mb-2" />
                      <div className="relative w-full p-3 rounded-lg border-2 border-blue-400 bg-blue-50 text-center">
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-[8px] landing-mono font-bold rounded-full uppercase">Popular</span>
                        </div>
                        <div className="landing-display font-bold text-xs text-blue-800 mb-0.5 mt-1">Core Interview Loop</div>
                        <p className="text-[10px] text-blue-600 landing-body">14-step framework + top 20 designs</p>
                      </div>
                    </div>

                    {/* NO → Advanced */}
                    <div className="flex flex-col items-center">
                      <span className="landing-mono text-xs font-bold text-gray-500 mb-2">NO</span>
                      <div className="w-0.5 h-4 bg-gray-300 mb-2" />

                      {/* Decision 3: L5/L6? */}
                      <div className="relative w-full h-20 flex items-center justify-center mb-2">
                        <div className="absolute inset-0 border-2 border-purple-400 bg-purple-50 rotate-45 rounded-lg" />
                        <span className="relative z-10 text-center landing-display font-semibold text-[10px] text-gray-900 leading-tight px-2">
                          Aiming for<br />L5/L6?
                        </span>
                      </div>

                      <span className="landing-mono text-xs font-bold text-purple-600 mb-1">YES</span>
                      <div className="w-0.5 h-3 bg-purple-300 mb-1" />
                      <div className="w-full p-3 rounded-lg border-2 border-purple-400 bg-purple-50 text-center">
                        <div className="landing-display font-bold text-xs text-purple-800 mb-0.5">Advanced Path</div>
                        <p className="text-[10px] text-purple-600 landing-body">Multi-region, distributed consensus, tail latency</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-12" />

          {/* ════════════════════════════════════════════════════════════════════
              CTA SECTION (existing)
              ════════════════════════════════════════════════════════════════════ */}
          <section className="text-center py-10 mb-6">
            <h2 className="landing-display font-bold text-xl md:text-2xl tracking-tight text-gray-900 mb-2">
              Ready to{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Design at Scale?</span>
            </h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto landing-body mb-4">
              Practice with AI that thinks like a principal engineer. Get real-time feedback on your architecture decisions.
            </p>
            <a href="/capra/design" className="inline-block px-8 py-3 bg-emerald-500 text-white font-semibold text-sm rounded hover:bg-emerald-600 transition-colors shadow-sm landing-body">
              Start Designing
            </a>
          </section>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');

        .landing-root {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-display {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-body {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-mono {
          font-family: 'IBM Plex Mono', monospace;
        }
      `}</style>
    </div>
  );
}
