import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/Icons.jsx';
// DocsSidebar removed — navigation handled by AppShell

/**
 * Behavioral Documentation Page
 * Inspired by techprep.app/behavioral
 */
export default function BehavioralDocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('a-z');

  // Behavioral Topics
  const topics = [
    { id: 'tell-me-about-yourself', title: 'Tell Me About Yourself', icon: 'user', color: '#10b981', questions: 5 },
    { id: 'leadership', title: 'Leadership', icon: 'users', color: '#3b82f6', questions: 12 },
    { id: 'teamwork', title: 'Teamwork', icon: 'share', color: '#8b5cf6', questions: 10 },
    { id: 'conflict-resolution', title: 'Conflict Resolution', icon: 'messageSquare', color: '#f59e0b', questions: 8 },
    { id: 'problem-solving', title: 'Problem Solving', icon: 'lightbulb', color: '#ef4444', questions: 15 },
    { id: 'failure-mistakes', title: 'Failures & Mistakes', icon: 'alertTriangle', color: '#f43f5e', questions: 7 },
    { id: 'achievements', title: 'Achievements', icon: 'star', color: '#22c55e', questions: 9 },
    { id: 'motivation', title: 'Motivation & Goals', icon: 'target', color: '#06b6d4', questions: 6 },
    { id: 'pressure-stress', title: 'Pressure & Stress', icon: 'zap', color: '#a855f7', questions: 8 },
    { id: 'communication', title: 'Communication', icon: 'messageCircle', color: '#ec4899', questions: 7 },
    { id: 'adaptability', title: 'Adaptability', icon: 'refresh', color: '#059669', questions: 6 },
    { id: 'decision-making', title: 'Decision Making', icon: 'puzzle', color: '#6366f1', questions: 8 },
  ];

  // STAR Method Stories
  const starStories = [
    { id: 'amazon-lp', title: 'Amazon Leadership Principles', subtitle: '16 principles with examples', icon: 'briefcase', color: '#f59e0b', count: 16 },
    { id: 'google-behavioral', title: 'Google Behavioral', subtitle: 'Googliness & Leadership', icon: 'code', color: '#4285f4', count: 12 },
    { id: 'meta-behavioral', title: 'Meta Behavioral', subtitle: 'Core values alignment', icon: 'users', color: '#1877f2', count: 10 },
    { id: 'microsoft-behavioral', title: 'Microsoft Behavioral', subtitle: 'Growth mindset focus', icon: 'layers', color: '#00a4ef', count: 8 },
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
            <Link to="/capra/prepare" className="px-4 py-2 rounded-lg text-sm font-medium text-purple-400 hover:bg-purple-400/10 transition-colors" style={{ border: '1px solid rgba(168, 85, 247, 0.3)' }}>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Behavioral Interviews</h1>

          {/* Search and Sort */}
          <div className="flex items-center justify-between mb-6">
            <div className="relative">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search topics"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-500 w-64 focus:outline-none focus:ring-1 focus:ring-purple-400/50"
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
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
                  <Icon name="users" size={20} className="text-gray-900" />
                </div>
                <span className="text-gray-900 font-medium">Master Behavioral Interviews with the STAR Method</span>
              </div>
              <Icon name="chevronRight" size={20} className="text-gray-500" />
            </div>
          </div>

          {/* STAR Method */}
          <div className="p-6 rounded-lg mb-8" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.02))', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Icon name="star" size={20} className="text-purple-400" />
              The STAR Method
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { letter: 'S', title: 'Situation', desc: 'Set the scene and give context for your story', color: '#ef4444' },
                { letter: 'T', title: 'Task', desc: 'Describe your responsibility in that situation', color: '#f59e0b' },
                { letter: 'A', title: 'Action', desc: 'Explain what steps you took to address it', color: '#22c55e' },
                { letter: 'R', title: 'Result', desc: 'Share the outcomes and what you learned', color: '#3b82f6' },
              ].map((step, i) => (
                <div key={i} className="p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-xl font-bold" style={{ background: `${step.color}20`, color: step.color }}>
                    {step.letter}
                  </div>
                  <div className="text-gray-900 font-semibold mb-2">{step.title}</div>
                  <div className="text-gray-400 text-sm">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Question Categories */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">Question Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
            {filteredTopics.map((topic) => (
              <a
                key={topic.id}
                href={`/capra/prepare/behavioral/${topic.id}`}
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

          {/* Company-Specific */}
          <h2 className="text-xl font-bold text-gray-900 mb-4">Company-Specific Prep</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {starStories.map((story) => (
              <a
                key={story.id}
                href={`/capra/prepare/behavioral/${story.id}`}
                className="group p-5 rounded-lg transition-all hover:scale-[1.01] hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${story.color}15` }}>
                    <Icon name={story.icon} size={24} style={{ color: story.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-gray-900 font-semibold">{story.title}</h3>
                      <Icon name="chevronRight" size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{story.subtitle}</p>
                    <span className="px-2 py-1 rounded text-xs" style={{ background: `${story.color}20`, color: story.color }}>
                      {story.count} Topics
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Quick Reference Section */}
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Reference</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Do's */}
            <div className="p-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                <Icon name="check" size={18} className="text-green-400" />
                Do's
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2"><span className="text-green-400">✓</span><span className="text-gray-300">Use specific examples from your experience</span></div>
                <div className="flex items-start gap-2"><span className="text-green-400">✓</span><span className="text-gray-300">Quantify your impact with numbers when possible</span></div>
                <div className="flex items-start gap-2"><span className="text-green-400">✓</span><span className="text-gray-300">Focus on YOUR actions and contributions</span></div>
                <div className="flex items-start gap-2"><span className="text-green-400">✓</span><span className="text-gray-300">Practice your stories out loud before interviews</span></div>
                <div className="flex items-start gap-2"><span className="text-green-400">✓</span><span className="text-gray-300">Prepare 5-7 versatile stories that cover multiple themes</span></div>
                <div className="flex items-start gap-2"><span className="text-green-400">✓</span><span className="text-gray-300">Show self-awareness and growth mindset</span></div>
              </div>
            </div>

            {/* Don'ts */}
            <div className="p-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                <Icon name="x" size={18} className="text-red-400" />
                Don'ts
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2"><span className="text-red-400">✗</span><span className="text-gray-300">Don't give vague or hypothetical answers</span></div>
                <div className="flex items-start gap-2"><span className="text-red-400">✗</span><span className="text-gray-300">Don't blame others or badmouth past employers</span></div>
                <div className="flex items-start gap-2"><span className="text-red-400">✗</span><span className="text-gray-300">Don't ramble - keep answers to 2-3 minutes</span></div>
                <div className="flex items-start gap-2"><span className="text-red-400">✗</span><span className="text-gray-300">Don't say "we" when you mean "I"</span></div>
                <div className="flex items-start gap-2"><span className="text-red-400">✗</span><span className="text-gray-300">Don't memorize scripts - know your key points</span></div>
                <div className="flex items-start gap-2"><span className="text-red-400">✗</span><span className="text-gray-300">Don't skip the result - always share outcomes</span></div>
              </div>
            </div>
          </div>

          {/* Interview Tips */}
          <div className="mt-12 p-6 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.02))', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Icon name="lightbulb" size={20} className="text-green-400" />
              Pro Tips for Behavioral Interviews
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Prepare a Story Bank', desc: 'Create 8-10 detailed stories covering leadership, conflict, failure, and achievement themes' },
                { title: 'Research the Company', desc: 'Align your stories with company values and the specific role requirements' },
                { title: 'Practice, Don\'t Memorize', desc: 'Know your stories well enough to adapt them to different questions' },
              ].map((tip, i) => (
                <div key={i} className="p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="text-gray-900 font-semibold mb-2">{tip.title}</div>
                  <div className="text-gray-400 text-sm">{tip.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
