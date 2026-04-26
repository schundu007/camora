/**
 * Interview Calendar — Google Calendar integration.
 * Embeds Google Calendar for viewing interview schedules.
 */
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const C = {
  base: 'var(--bg-surface)', surface: 'var(--bg-elevated)', elevated: 'var(--bg-elevated)',
  text: 'var(--text-primary)', muted: 'var(--text-muted)', accent: 'var(--cam-primary)',
  accentBg: 'var(--accent-subtle)', border: 'var(--border)',
};

export function LumoraCalendar({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [view, setView] = useState<'week' | 'month'>('week');

  // Google Calendar embed URL — uses the authenticated user's email
  const email = user?.email || '';
  const calendarSrc = email
    ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(email)}&mode=${view === 'week' ? 'WEEK' : 'MONTH'}&showTitle=0&showNav=1&showPrint=0&showTabs=0&showCalendars=0&bgcolor=%23ffffff&color=%23F97316`
    : '';

  return (
    <div className="h-full flex flex-col" style={{ background: C.base }}>
      {/* Header — LeetCode navy + gold underline */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0" style={{ background: 'linear-gradient(180deg, var(--cam-primary-dk) 0%, var(--cam-primary) 100%)', borderBottom: '2px solid var(--cam-gold-leaf)' }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-sans)' }}>Interview Calendar</span>
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <button onClick={() => setView('week')}
              className="px-2 py-1 text-[10px] font-bold rounded transition-all"
              style={view === 'week' ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' } : { color: 'rgba(255,255,255,0.75)' }}>
              Week
            </button>
            <button onClick={() => setView('month')}
              className="px-2 py-1 text-[10px] font-bold rounded transition-all"
              style={view === 'month' ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' } : { color: 'rgba(255,255,255,0.75)' }}>
              Month
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer"
            className="text-[11px] font-medium transition-colors" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
            Open in Google Calendar →
          </a>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.85)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Calendar content */}
      {calendarSrc ? (
        <div className="flex-1 min-h-0">
          <iframe
            src={calendarSrc}
            className="w-full h-full border-0"
            style={{ colorScheme: 'light' }}
            title="Google Calendar"
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1" className="mb-4 opacity-40">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-sm font-medium mb-2" style={{ color: C.text, fontFamily: 'var(--font-sans)' }}>
            Connect Google Calendar
          </p>
          <p className="text-xs text-center mb-4" style={{ color: C.muted, fontFamily: 'var(--font-sans)' }}>
            Sign in to view your interview schedule
          </p>
          <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--cam-primary)', color: '#fff' }}>
            Open Google Calendar
          </a>
        </div>
      )}
    </div>
  );
}
