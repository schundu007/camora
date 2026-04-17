/**
 * Interview Calendar — schedule and track interview appointments.
 * Inspired by Zoom Calendar: mini calendar + event list + add event.
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lumora_calendar_events';

interface CalendarEvent {
  id: string;
  title: string;
  company: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: 'phone' | 'technical' | 'system-design' | 'behavioral' | 'onsite' | 'other';
  notes: string;
  link?: string; // Zoom/Meet/Teams link
}

const EVENT_TYPES = [
  { id: 'phone', label: 'Phone Screen', color: '#10b981' },
  { id: 'technical', label: 'Technical', color: '#6366f1' },
  { id: 'system-design', label: 'System Design', color: '#3b82f6' },
  { id: 'behavioral', label: 'Behavioral', color: '#f59e0b' },
  { id: 'onsite', label: 'Onsite', color: '#ec4899' },
  { id: 'other', label: 'Other', color: '#6b7280' },
];

function loadEvents(): CalendarEvent[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveEvents(events: CalendarEvent[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch {}
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function LumoraCalendar({ onClose }: { onClose: () => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', company: '', time: '09:00', type: 'technical' as CalendarEvent['type'], notes: '', link: '' });

  useEffect(() => { saveEvents(events); }, [events]);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const eventsOnDate = (d: number) => events.filter(e => e.date === dateStr(d));

  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5);

  const addEvent = () => {
    if (!newEvent.title.trim() || !selectedDate) return;
    setEvents(prev => [...prev, { ...newEvent, id: Date.now().toString(), date: selectedDate }]);
    setNewEvent({ title: '', company: '', time: '09:00', type: 'technical', notes: '', link: '' });
    setShowAdd(false);
  };

  const deleteEvent = (id: string) => setEvents(prev => prev.filter(e => e.id !== id));

  const getTypeColor = (type: string) => EVENT_TYPES.find(t => t.id === type)?.color || '#6b7280';

  return (
    <div className="h-full flex flex-col" style={{ background: '#0D0C14', borderRight: '1px solid rgba(255,255,255,0.06)', width: 300 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-sm font-bold" style={{ color: '#F2F1F3' }}>Interview Calendar</span>
        <button onClick={onClose} className="p-1 rounded-md" style={{ color: '#6C6B7B' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Mini Calendar */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="p-1 rounded" style={{ color: '#6C6B7B' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-xs font-semibold" style={{ color: '#F2F1F3' }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-1 rounded" style={{ color: '#6C6B7B' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAYS.map((d, i) => <div key={i} className="text-[9px] font-bold py-1" style={{ color: '#545260' }}>{d}</div>)}
          {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
          {Array(daysInMonth).fill(null).map((_, i) => {
            const d = i + 1;
            const ds = dateStr(d);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;
            const hasEvents = eventsOnDate(d).length > 0;
            return (
              <button key={d} onClick={() => { setSelectedDate(ds); setShowAdd(false); }}
                className="relative w-7 h-7 rounded-full text-[10px] font-medium transition-all mx-auto flex items-center justify-center"
                style={{
                  background: isSelected ? '#6366f1' : isToday ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: isSelected ? '#fff' : isToday ? '#818cf8' : '#A1A0AB',
                  border: isToday && !isSelected ? '1px solid rgba(99,102,241,0.3)' : 'none',
                }}>
                {d}
                {hasEvents && <div className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ background: '#818cf8' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events or Upcoming */}
      <div className="flex-1 overflow-y-auto">
        {selectedDate ? (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: '#F2F1F3' }}>
                {new Date(selectedDate + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <button onClick={() => setShowAdd(true)} className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: '#6366f1', color: '#fff' }}>
                + Add
              </button>
            </div>
            {showAdd && (
              <div className="space-y-2 mb-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
                  placeholder="Interview title" className="w-full px-2 py-1.5 rounded text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#F2F1F3', border: '1px solid rgba(255,255,255,0.08)' }} />
                <input value={newEvent.company} onChange={e => setNewEvent(p => ({ ...p, company: e.target.value }))}
                  placeholder="Company" className="w-full px-2 py-1.5 rounded text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#F2F1F3', border: '1px solid rgba(255,255,255,0.08)' }} />
                <div className="flex gap-2">
                  <input type="time" value={newEvent.time} onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                    className="flex-1 px-2 py-1.5 rounded text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#F2F1F3', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <select value={newEvent.type} onChange={e => setNewEvent(p => ({ ...p, type: e.target.value as any }))}
                    className="flex-1 px-2 py-1.5 rounded text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#F2F1F3', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <input value={newEvent.link || ''} onChange={e => setNewEvent(p => ({ ...p, link: e.target.value }))}
                  placeholder="Meeting link (optional)" className="w-full px-2 py-1.5 rounded text-xs focus:outline-none" style={{ background: 'rgba(255,255,255,0.05)', color: '#F2F1F3', border: '1px solid rgba(255,255,255,0.08)' }} />
                <div className="flex gap-2">
                  <button onClick={addEvent} className="flex-1 py-1.5 text-xs font-bold rounded" style={{ background: '#6366f1', color: '#fff' }}>Save</button>
                  <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs rounded" style={{ color: '#6C6B7B' }}>Cancel</button>
                </div>
              </div>
            )}
            {events.filter(e => e.date === selectedDate).map(ev => (
              <div key={ev.id} className="flex items-start gap-2 p-2 rounded-lg mb-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-1 h-8 rounded-full shrink-0 mt-0.5" style={{ background: getTypeColor(ev.type) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: '#F2F1F3' }}>{ev.title}</div>
                  <div className="text-[10px]" style={{ color: '#6C6B7B' }}>{ev.company} &middot; {ev.time}</div>
                  {ev.link && <a href={ev.link} target="_blank" rel="noopener noreferrer" className="text-[10px] underline" style={{ color: '#818cf8' }}>Join meeting</a>}
                </div>
                <button onClick={() => deleteEvent(ev.id)} className="p-0.5 rounded" style={{ color: '#545260' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {events.filter(e => e.date === selectedDate).length === 0 && !showAdd && (
              <p className="text-[11px] text-center py-4" style={{ color: '#545260' }}>No interviews scheduled</p>
            )}
          </div>
        ) : (
          <div className="p-3">
            <span className="text-xs font-semibold" style={{ color: '#F2F1F3' }}>Upcoming Interviews</span>
            {upcomingEvents.length === 0 ? (
              <p className="text-[11px] text-center py-6" style={{ color: '#545260' }}>No upcoming interviews.<br />Click a date to add one.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {upcomingEvents.map(ev => (
                  <div key={ev.id} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)' }}
                    onClick={() => { setSelectedDate(ev.date); }}>
                    <div className="w-1 h-6 rounded-full shrink-0" style={{ background: getTypeColor(ev.type) }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate" style={{ color: '#F2F1F3' }}>{ev.title}</div>
                      <div className="text-[9px]" style={{ color: '#6C6B7B' }}>{ev.company} &middot; {new Date(ev.date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {ev.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
