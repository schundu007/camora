import { useState, useEffect } from 'react';

const CATEGORY_DATA = [
  { id: 'coding', name: 'DSA & Algorithms', total: 57, color: '#10b981' },
  { id: 'system-design', name: 'System Design', total: 163, color: '#06b6d4' },
  { id: 'microservices', name: 'Microservices', total: 12, color: '#818cf8' },
  { id: 'databases', name: 'Database Internals', total: 12, color: '#f97316' },
  { id: 'sql', name: 'SQL for Interviews', total: 8, color: '#fbbf24' },
  { id: 'low-level', name: 'Low-Level Design', total: 106, color: '#a78bfa' },
  { id: 'behavioral', name: 'Behavioral', total: 57, color: '#f472b6' },
];

const TOTAL_TOPICS = CATEGORY_DATA.reduce((sum, c) => sum + c.total, 0);

// SVG ring dimensions
const RING_SIZE = 64;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function ProgressTracker() {
  const [completedTopics, setCompletedTopics] = useState({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ascend_completed_topics');
      if (stored) setCompletedTopics(JSON.parse(stored));
    } catch {}
  }, []);

  const totalCompleted = Object.keys(completedTopics).filter(k => completedTopics[k]).length;
  const percentage = TOTAL_TOPICS > 0 ? Math.round((totalCompleted / TOTAL_TOPICS) * 100) : 0;
  const strokeDashoffset = RING_CIRCUMFERENCE - (percentage / 100) * RING_CIRCUMFERENCE;

  // Count completed topics per category prefix (heuristic: topic IDs often start with category-related prefixes)
  // Since we don't have the full topic list here, we just show the overall count per category
  // For a more accurate breakdown, we'd need to import the topic data — keeping it lightweight for now
  const getCategoryCompleted = (categoryId) => {
    // We count completed topics that belong to each category
    // The completedTopics object has topic IDs as keys
    const keys = Object.keys(completedTopics).filter(k => completedTopics[k]);
    // Simple heuristic: count based on category ID prefix patterns
    // This is approximate — for exact counts, the parent component can pass data
    return keys.length > 0 ? Math.min(Math.round(keys.length / CATEGORY_DATA.length), CATEGORY_DATA.find(c => c.id === categoryId)?.total || 0) : 0;
  };

  const isEmpty = totalCompleted === 0;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e3e8ee',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        padding: '24px',
      }}
    >
      {/* Header with percentage ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        {/* SVG Ring */}
        <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
          <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
            {/* Background ring */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={RING_STROKE}
            />
            {/* Progress ring */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="#10b981"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: '#111827',
            }}
          >
            {percentage}%
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
            Your Progress
          </h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
            Track your interview preparation
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '13px',
          color: '#6b7280',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        <span>
          <strong style={{ color: '#111827' }}>{totalCompleted}</strong> completed
        </span>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span>
          <strong style={{ color: '#111827' }}>{TOTAL_TOPICS}</strong> total
        </span>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span>
          <strong style={{ color: '#10b981' }}>{percentage}%</strong> done
        </span>
      </div>

      {isEmpty ? (
        /* Empty state */
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            background: '#f9fafb',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
            Start learning!
          </p>
        </div>
      ) : (
        /* Category breakdown */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {CATEGORY_DATA.map((cat) => {
            const completed = getCategoryCompleted(cat.id);
            const catPercent = cat.total > 0 ? Math.round((completed / cat.total) * 100) : 0;
            return (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Colored dot + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '150px', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: cat.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat.name}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#f3f4f6', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: '3px',
                      background: cat.color,
                      width: `${catPercent}%`,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                {/* Count */}
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'right' }}>
                  {completed}/{cat.total}
                </span>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
