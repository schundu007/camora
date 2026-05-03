/* ── DesignLayout theme + format helpers ─────────────────────────────────
   Pure presentational helpers extracted from DesignLayout. No JSX so other
   modules (ScaleCalculator, etc.) can import without dragging React.
*/

/** Format seconds as MM:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export interface DesignTheme {
  cardBg: string; cardBorder: string;
  headerBg: string; headerBorder: string;
  headerText: string; badgeBg: string; badgeText: string;
  text: string; textMuted: string; textDim: string;
  codeBg: string; codeText: string;
  inputBg: string; inputBorder: string; inputText: string;
  sectionBg: string; surfaceBg: string;
  tabActive: string; tabActiveBg: string; tabText: string;
  dotColor: string;
}

// Theme tokens are returned as CSS-var references that auto-flip via the
// global [data-theme="dark"] selector defined in src/styles/globals.css.
// The `dark` argument is preserved for API stability but is no longer read —
// the same token map works for both light and dark surfaces because the
// underlying CSS vars (`--bg-surface`, `--bg-elevated`, `--border`,
// `--text-primary`, etc.) flip in lockstep with the global theme.
export function useTheme(_dark: boolean): DesignTheme {
  return {
    cardBg: 'var(--bg-surface)', cardBorder: 'var(--border)',
    headerBg: 'var(--accent-subtle)', headerBorder: 'var(--border)',
    headerText: 'var(--cam-primary)', badgeBg: 'var(--accent-subtle)', badgeText: 'var(--cam-primary)',
    text: 'var(--text-primary)', textMuted: 'var(--text-muted)', textDim: 'var(--text-dimmed)',
    codeBg: 'var(--bg-elevated)', codeText: 'var(--text-primary)',
    inputBg: 'var(--bg-surface)', inputBorder: 'var(--border)', inputText: 'var(--text-primary)',
    sectionBg: 'var(--bg-elevated)', surfaceBg: 'var(--bg-surface)',
    tabActive: 'var(--cam-primary)', tabActiveBg: 'var(--bg-surface)', tabText: 'var(--text-muted)',
    dotColor: 'var(--cam-primary)',
  };
}

/** Format a large number as 1.2M, 340K, 12.3B, etc. */
export function humanizeNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  if (abs >= 1) return n.toFixed(2).replace(/\.?0+$/, '');
  return n.toFixed(4);
}

export function humanizeBytes(bytes: number): string {
  const abs = Math.abs(bytes);
  if (abs >= 1e15) return (bytes / 1e15).toFixed(2) + ' PB';
  if (abs >= 1e12) return (bytes / 1e12).toFixed(2) + ' TB';
  if (abs >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
  if (abs >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
  if (abs >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
  return bytes.toFixed(0) + ' B';
}
