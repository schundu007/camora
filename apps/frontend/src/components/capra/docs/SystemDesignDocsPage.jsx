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
  const conceptsAnim = useInView(0.1);
  const designsAnim = useInView(0.1);
  const frameworkAnim = useInView(0.1);
  const referenceAnim = useInView(0.1);

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

          {/* Hero Section */}
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

              <p className="text-base text-gray-500 max-w-xl leading-relaxed landing-body">
                Master distributed systems, scalability patterns, and architecture trade-offs. From fundamentals to real-world designs used at top tech companies.
              </p>
            </div>
          </section>

          {/* Gradient Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent mb-10" />

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

          {/* Core Concepts Section */}
          <section ref={conceptsAnim.ref} className={`mb-12 transition-all duration-700 ${conceptsAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Foundations</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Core Concepts
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-3">
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

          {/* Common System Designs */}
          <section ref={designsAnim.ref} className={`mb-12 transition-all duration-700 ${designsAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Real-World</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Common System Designs
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
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

          {/* Interview Framework */}
          <section ref={frameworkAnim.ref} className={`mb-12 transition-all duration-700 ${frameworkAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="p-6 rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-cyan-50/40">
              <div className="mb-5">
                <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Framework</span>
                <h3 className="landing-display font-bold text-xl mt-1 tracking-tight text-gray-900 flex items-center gap-2">
                  System Design Interview
                  <span className="text-gray-400 font-normal text-base landing-body">(45 min)</span>
                </h3>
              </div>
              <div className="grid md:grid-cols-1 gap-3">
                {[
                  { time: '5 min', step: 'Requirements', desc: 'Clarify functional & non-functional requirements, scale', num: '01', accent: 'emerald' },
                  { time: '5 min', step: 'Estimations', desc: 'Back-of-envelope: QPS, storage, bandwidth', num: '02', accent: 'cyan' },
                  { time: '20 min', step: 'High-Level Design', desc: 'Components, data flow, API design', num: '03', accent: 'emerald' },
                  { time: '15 min', step: 'Deep Dive', desc: 'Database schema, scaling, trade-offs', num: '04', accent: 'cyan' },
                ].map((phase, i) => (
                  <div key={i} className="group p-4 rounded-lg border border-white/60 bg-white/70 hover:bg-white hover:shadow-sm transition-all">
                    <span className={`landing-mono text-2xl font-black text-${phase.accent}-200 group-hover:text-${phase.accent}-300 transition-colors`}>
                      {phase.num}
                    </span>
                    <div className="landing-mono text-xs text-emerald-600 font-semibold mt-2 mb-1">{phase.time}</div>
                    <div className="text-gray-900 font-semibold text-sm landing-display mb-1">{phase.step}</div>
                    <div className="text-gray-500 text-xs leading-relaxed landing-body">{phase.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Quick Reference Section */}
          <section ref={referenceAnim.ref} className={`mb-12 transition-all duration-700 ${referenceAnim.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="mb-5">
              <span className="landing-mono text-xs text-emerald-600 tracking-widest uppercase">Cheat Sheet</span>
              <h2 className="landing-display font-bold text-2xl mt-1 tracking-tight text-gray-900">
                Quick Reference
              </h2>
            </div>

            <div className="grid md:grid-cols-1 gap-4">
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

              {/* Key Trade-offs */}
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

          {/* CTA Section */}
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
          font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-display {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-body {
          font-family: 'Work Sans', 'Plus Jakarta Sans', system-ui, sans-serif;
        }

        .landing-mono {
          font-family: 'IBM Plex Mono', monospace;
        }
      `}</style>
    </div>
  );
}
