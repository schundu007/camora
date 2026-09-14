// The question half of a Q&A turn in the Gemini and Claude tabs.
//
// Both panels used to draw the question in the same neutral --lum-surface card
// the toolbar and composer use, directly above an answer that also sits on a
// plain background. Scanning back through a session, nothing said where one
// turn ended and the next began — you had to read the text to tell a question
// from an answer.
//
// The tint comes from color-mix rather than --lum-accent-bg because that token
// is a fill, not a tint: it is near-black navy in dark, near-white in light,
// and translucent blue under the glass theme, so it holds no fixed relationship
// to whatever surface is behind it. Mixing the accent into transparency keeps
// this a tint of the panel in all three.
export const QuestionBlock = ({ children }: { children: React.ReactNode }) => (
  <div
    className="rounded px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap font-medium"
    style={{
      background: 'color-mix(in oklab, var(--lum-accent) 12%, transparent)',
      border: '1px solid color-mix(in oklab, var(--lum-accent) 38%, transparent)',
      // The rule is the part that survives at a glance while scrolling — the
      // fill alone is deliberately quiet so it never competes with the answer.
      borderLeft: '3px solid var(--lum-accent)',
      color: 'var(--lum-text)',
    }}
  >
    <span
      className="block text-[10px] font-bold uppercase tracking-[0.08em] mb-1 select-none"
      style={{ color: 'var(--lum-accent)' }}
    >
      Question
    </span>
    {children}
  </div>
);
