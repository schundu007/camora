import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/Icons.jsx';
// DocsSidebar removed — navigation handled by AppShell

/**
 * Data Structures & Algorithms Documentation
 * Inspired by techprep.app/data-structures-and-algorithms
 */
export default function CodingDocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('a-z');

  // DSA Topics with question counts (matching techprep.app)
  const topics = [
    { id: 'arrays-hashing', title: 'Arrays & Hashing', icon: 'code', color: '#ef4444', questions: 57 },
    { id: 'binary-search', title: 'Binary Search', icon: 'search', color: '#f59e0b', questions: 3 },
    { id: 'bit-manipulation', title: 'Bit Manipulation', icon: 'cpu', color: '#8b5cf6', questions: 13 },
    { id: 'blind-75', title: 'Blind 75', icon: 'zap', color: '#22c55e', questions: 75 },
    { id: 'dynamic-programming', title: 'Dynamic Programming', icon: 'chartLine', color: '#3b82f6', questions: 24 },
    { id: 'graphs', title: 'Graphs', icon: 'share', color: '#ec4899', questions: 54 },
    { id: 'greedy', title: 'Greedy', icon: 'target', color: '#06b6d4', questions: 5 },
    { id: 'heaps', title: 'Heaps', icon: 'layers', color: '#f97316', questions: 33 },
    { id: 'intervals', title: 'Intervals', icon: 'chartBar', color: '#84cc16', questions: 5 },
    { id: 'linked-lists', title: 'Linked Lists', icon: 'link', color: '#a855f7', questions: 31 },
    { id: 'math-geometry', title: 'Math & Geometry', icon: 'puzzle', color: '#059669', questions: 10 },
    { id: 'matrix', title: 'Matrix', icon: 'layers', color: '#6366f1', questions: 7 },
    { id: 'queues', title: 'Queues', icon: 'inbox', color: '#f43f5e', questions: 17 },
    { id: 'recursion', title: 'Recursion', icon: 'refresh', color: '#10b981', questions: 15 },
    { id: 'search-algorithms', title: 'Search Algorithms', icon: 'search', color: '#0ea5e9', questions: 23 },
    { id: 'sliding-window', title: 'Sliding Window', icon: 'chevronsRight', color: '#8b5cf6', questions: 5 },
    { id: 'sorting-algorithms', title: 'Sorting Algorithms', icon: 'chartBar', color: '#f59e0b', questions: 18 },
    { id: 'stacks', title: 'Stacks', icon: 'layers', color: '#22c55e', questions: 34 },
    { id: 'ascend-100', title: 'Ascend 100', icon: 'ascend', color: '#10b981', questions: 100 },
    { id: 'trees', title: 'Trees', icon: 'share', color: '#06b6d4', questions: 45 },
    { id: 'tries', title: 'Tries', icon: 'folder', color: '#ec4899', questions: 25 },
    { id: 'two-pointers', title: 'Two Pointers', icon: 'chevronsRight', color: '#3b82f6', questions: 6 },
  ];

  // Filter and sort topics
  const filteredTopics = topics
    .filter(topic => topic.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'a-z') return a.title.localeCompare(b.title);
      if (sortOrder === 'z-a') return b.title.localeCompare(a.title);
      if (sortOrder === 'most') return b.questions - a.questions;
      if (sortOrder === 'least') return a.questions - b.questions;
      return 0;
    });

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#ffffff', fontFamily: "'Source Sans 3', sans-serif" }}>
      {/* Sidebar */}
      {/* Sidebar provided by AppShell */}

      {/* Main Content */}
      <div className="flex-1 min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 px-8 py-4 flex items-center justify-between" style={{ background: 'rgba(9, 9, 11, 0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div />
          <div className="flex items-center gap-4">
            <Link to="/capra/prepare" className="px-4 py-2 rounded-lg text-sm font-medium text-green-400 hover:bg-green-400/10 transition-colors" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              Getting started guide
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-900 transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Icon name="search" size={16} />
              Search everything
              <span className="text-gray-600 ml-2">/</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 max-w-6xl mx-auto">
          {/* Page Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Data Structures & Algorithms</h1>

          {/* Search and Sort */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search topics"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-500 w-64 focus:outline-none focus:ring-1 focus:ring-green-400/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2.5 rounded-lg text-sm text-gray-400 focus:outline-none cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="a-z">A - Z</option>
              <option value="z-a">Z - A</option>
              <option value="most">Most Questions</option>
              <option value="least">Least Questions</option>
            </select>
          </div>

          {/* Featured Banner */}
          <div className="block mb-8 p-5 rounded-lg cursor-default" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#10b981' }}>
                  <Icon name="ascend" size={20} className="text-gray-900" />
                </div>
                <span className="text-gray-900 font-medium">How to Pass Data Structures & Algorithms Interviews in 2026</span>
              </div>
              <Icon name="chevronRight" size={20} className="text-gray-500" />
            </div>
          </div>

          {/* Topic Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {filteredTopics.map((topic) => (
              <a
                key={topic.id}
                href={`/capra/prepare/coding/${topic.id}`}
                className="group p-4 rounded-lg transition-all hover:scale-[1.02] hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon name={topic.icon} size={16} style={{ color: topic.color }} />
                    <span className="text-gray-900 font-medium text-sm">{topic.title}</span>
                  </div>
                  <Icon name="chevronRight" size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Icon name="star" size={14} />
                  <span>{topic.questions} Questions</span>
                </div>
              </a>
            ))}
          </div>

          {/* Quick Reference Section */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Reference</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Time Complexity */}
              <div className="p-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                  <Icon name="clock" size={18} className="text-green-400" />
                  Time Complexity Cheat Sheet
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">O(1)</span><span className="text-green-400">Constant - Best</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">O(log n)</span><span className="text-green-400">Logarithmic - Great</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">O(n)</span><span className="text-yellow-400">Linear - Good</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">O(n log n)</span><span className="text-yellow-400">Linearithmic - Fair</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">O(n²)</span><span className="text-orange-400">Quadratic - Slow</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">O(2ⁿ)</span><span className="text-red-400">Exponential - Avoid</span></div>
                </div>
              </div>

              {/* Data Structures */}
              <div className="p-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                  <Icon name="database" size={18} className="text-gray-400" />
                  When to Use What
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Fast lookup</span><span className="text-gray-900">Hash Map</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Sorted data</span><span className="text-gray-900">Binary Search Tree</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">FIFO operations</span><span className="text-gray-900">Queue</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">LIFO operations</span><span className="text-gray-900">Stack</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Priority access</span><span className="text-gray-900">Heap</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Prefix matching</span><span className="text-gray-900">Trie</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
