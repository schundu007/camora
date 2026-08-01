/**
 * Flashcards — active-recall + spaced repetition for Capra.
 *
 * Fenzo-inspired: retrieval practice beats re-reading. You see a prompt, try to
 * recall the answer, reveal it, then rate how well you knew it — the SM-2-lite
 * scheduler in lib/flashcards.ts decides when you'll see it next.
 *
 * Client-side only (localStorage, per user). A curated starter deck ships so the
 * page is useful on first open; cards can later be added from quizzes / prep.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DECKS,
  loadCards,
  saveCards,
  schedule,
  dueCards,
  countByStatus,
  type Flashcard,
  type CardRating,
} from '@/lib/flashcards';

const RATINGS: { key: CardRating; label: string; hint: string; hue: string }[] = [
  { key: 'again', label: 'Again', hint: 'Blanked', hue: 'var(--danger)' },
  { key: 'hard', label: 'Hard', hint: 'Struggled', hue: 'var(--warning)' },
  { key: 'good', label: 'Good', hint: 'Recalled', hue: 'var(--cam-success)' },
  { key: 'easy', label: 'Easy', hint: 'Instant', hue: 'var(--accent)' },
];

function nextDueLabel(cards: Flashcard[]): string {
  const future = cards.map((c) => c.dueAt).filter((t) => t > Date.now()).sort((a, b) => a - b);
  if (future.length === 0) return '';
  const ms = future[0] - Date.now();
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr`;
  return `${Math.round(hrs / 24)} d`;
}

export default function FlashcardsPage() {
  const auth = useAuth() as any;
  const userKey: string | null = auth?.user?.email || auth?.user?.id || null;

  const [cards, setCards] = useState<Flashcard[]>(() => loadCards(userKey));
  const [deck, setDeck] = useState<string>('all');
  const [revealed, setRevealed] = useState(false);
  const [reviewedThisSession, setReviewedThisSession] = useState(0);
  // A monotonically increasing tick so the due-queue recomputes after each rate
  // even when a card's new dueAt is still "now" (Again → +60s but list re-sorts).
  const [, forceTick] = useState(0);

  // Reload if the user identity changes (login on a shared page).
  useEffect(() => { setCards(loadCards(userKey)); }, [userKey]);

  const filtered = useMemo(
    () => (deck === 'all' ? cards : cards.filter((c) => c.deck === deck)),
    [cards, deck],
  );
  const queue = useMemo(() => dueCards(filtered), [filtered, reviewedThisSession]);
  const current = queue[0] ?? null;
  const counts = useMemo(() => countByStatus(filtered), [filtered, reviewedThisSession]);

  const rate = useCallback((rating: CardRating) => {
    if (!current) return;
    const updated = schedule(current, rating);
    setCards((prev) => {
      const next = prev.map((c) => (c.id === current.id ? updated : c));
      saveCards(userKey, next);
      return next;
    });
    setRevealed(false);
    setReviewedThisSession((n) => n + 1);
    forceTick((t) => t + 1);
  }, [current, userKey]);

  // Keyboard: Space/Enter reveals, 1–4 rate. Fast, hands-on-keyboard review.
  const revealedRef = useRef(revealed);
  useEffect(() => { revealedRef.current = revealed; }, [revealed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (!current) return;
      if ((e.code === 'Space' || e.key === 'Enter') && !revealedRef.current) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealedRef.current && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        rate(RATINGS[Number(e.key) - 1].key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, rate]);

  const deckMeta = current ? DECKS.find((d) => d.id === current.deck) : null;

  return (
    <div className="min-h-full" style={{ background: 'var(--bg-app)' }}>
      {/* Hero */}
      <div
        className="px-6 py-6"
        style={{ background: 'var(--cam-hero-strip)', borderBottom: '3px solid var(--cam-gold-leaf)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1"
            style={{ color: 'var(--cam-gold-leaf-lt, var(--cam-gold-leaf))', fontFamily: 'var(--font-mono)' }}
          >
            Active Recall
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--cam-strip-heading, #fff)' }}>
            Flashcards
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cam-strip-text, rgba(255,255,255,0.82))' }}>
            Recall it before you reveal it. Spaced repetition schedules each card for the moment you're about to forget.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-5">
        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <StatPill label="Due" value={counts.due + counts.learning} tone="gold" />
          <StatPill label="New" value={counts.new} tone="info" />
          <StatPill label="Scheduled" value={counts.scheduled} tone="muted" />
          <span className="flex-1" />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Reviewed this session: <strong style={{ color: 'var(--text-primary)' }}>{reviewedThisSession}</strong>
          </span>
        </div>

        {/* Deck filter */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          <DeckChip id="all" title="All decks" active={deck === 'all'} onClick={() => { setDeck('all'); setRevealed(false); }} />
          {DECKS.map((d) => (
            <DeckChip key={d.id} id={d.id} title={d.title} accent={d.accent} active={deck === d.id} onClick={() => { setDeck(d.id); setRevealed(false); }} />
          ))}
        </div>

        {/* Review card */}
        {current ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'inset 0 -3px 0 var(--cam-gold-leaf)' }}
          >
            <div className="flex items-center gap-2 px-5 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              {deckMeta && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: `${deckMeta.accent}1a`, color: deckMeta.accent }}>
                  {deckMeta.title}
                </span>
              )}
              <span className="flex-1" />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{queue.length} in queue</span>
            </div>

            <div className="px-6 py-8 min-h-[220px] flex flex-col">
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Prompt</div>
              <p className="text-lg leading-relaxed font-semibold" style={{ color: 'var(--text-primary)' }}>{current.front}</p>

              {revealed ? (
                <div className="mt-5 pt-5" style={{ borderTop: '1px dashed var(--border)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--cam-gold-leaf)' }}>Answer</div>
                  <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{current.back}</p>
                </div>
              ) : (
                <div className="mt-auto pt-6">
                  <button
                    onClick={() => setRevealed(true)}
                    className="w-full py-3 rounded-lg font-bold text-sm transition-transform active:scale-[0.99]"
                    style={{ background: 'var(--cam-primary)', color: '#fff' }}
                  >
                    Show answer <span className="opacity-60 font-normal ml-1">(Space)</span>
                  </button>
                </div>
              )}
            </div>

            {revealed && (
              <div className="grid grid-cols-4 gap-px" style={{ background: 'var(--border)' }}>
                {RATINGS.map((r, i) => (
                  <button
                    key={r.key}
                    onClick={() => rate(r.key)}
                    className="py-3 flex flex-col items-center gap-0.5 transition-colors"
                    style={{ background: 'var(--bg-elevated)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `color-mix(in oklab, ${r.hue} 8%, transparent)`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    data-tip={`${r.label} — press ${i + 1}`}
                  >
                    <span className="text-sm font-bold" style={{ color: r.hue }}>{r.label}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.hint} · {i + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-2xl px-6 py-12 text-center"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="text-3xl mb-2">✓</div>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>All caught up</div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {(() => {
                const label = nextDueLabel(filtered);
                return label ? `Next card is due in about ${label}. Come back then — spacing is the point.` : 'No cards in this deck yet.';
              })()}
            </p>
          </div>
        )}

        <p className="text-[11px] mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
          Tip: try to answer out loud before revealing. <strong style={{ color: 'var(--text-secondary)' }}>Space</strong> reveals · <strong style={{ color: 'var(--text-secondary)' }}>1–4</strong> rate.
        </p>
      </div>
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'gold' | 'info' | 'muted' }) {
  const color = tone === 'gold' ? 'var(--cam-gold-leaf)' : tone === 'info' ? 'var(--cam-primary)' : 'var(--text-muted)';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      <span style={{ color }}>{value}</span>
      <span style={{ color: 'var(--text-muted)' }} className="font-medium">{label}</span>
    </span>
  );
}

function DeckChip({ id, title, accent, active, onClick }: { id: string; title: string; accent?: string; active: boolean; onClick: () => void }) {
  void id;
  return (
    <button
      onClick={onClick}
      className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
      style={{
        background: active ? 'var(--cam-gold-leaf)' : 'var(--bg-elevated)',
        color: active ? 'var(--cam-primary-dk, #082F49)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--cam-gold-leaf)' : 'var(--border)'}`,
      }}
    >
      {accent && !active && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: accent }} />}
      {title}
    </button>
  );
}
