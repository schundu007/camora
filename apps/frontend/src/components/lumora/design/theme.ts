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

export function useTheme(dark: boolean): DesignTheme {
  if (dark) {
    return {
      cardBg: '#0F172A', cardBorder: '#1E293B',
      headerBg: 'rgba(38,97,156,0.08)', headerBorder: '#1E40AF',
      headerText: 'var(--cam-primary)', badgeBg: 'rgba(38,97,156,0.12)', badgeText: 'var(--cam-primary)',
      text: '#F8FAFC', textMuted: '#94A3B8', textDim: '#64748B',
      codeBg: '#020617', codeText: '#E2E8F0',
      inputBg: '#0F172A', inputBorder: '#334155', inputText: '#F8FAFC',
      sectionBg: '#0F172A', surfaceBg: '#1E293B',
      tabActive: 'var(--cam-primary)', tabActiveBg: '#1E293B', tabText: '#94A3B8',
      dotColor: 'var(--cam-primary)',
    };
  }
  return {
    cardBg: '#ffffff', cardBorder: '#e5e7eb',
    headerBg: 'rgba(38,97,156,0.05)', headerBorder: '#BFDBFE',
    headerText: 'var(--cam-primary)', badgeBg: 'rgba(38,97,156,0.06)', badgeText: 'var(--cam-primary)',
    text: '#111827', textMuted: '#6b7280', textDim: '#9ca3af',
    codeBg: '#f9fafb', codeText: '#1f2937',
    inputBg: '#ffffff', inputBorder: '#e5e7eb', inputText: '#111827',
    sectionBg: '#f9fafb', surfaceBg: '#ffffff',
    tabActive: 'var(--cam-primary)', tabActiveBg: '#ffffff', tabText: '#6b7280',
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
