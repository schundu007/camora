import type { CSSProperties } from 'react';

/**
 * Shared inline-style tokens for the jobsearch UI.
 *
 * Camora themes via CSS variables toggled by [data-theme="light"] on the root
 * (default is dark). Tailwind's `dark:` variant follows the OS, NOT camora's
 * toggle, so Tailwind color utilities render the wrong theme. Use these tokens
 * for all colors and keep Tailwind only for layout (flex/grid/spacing/sizing).
 */

export const T = {
  pageBg: { background: 'var(--bg-app)', minHeight: '100vh' } as CSSProperties,
  columnBg: { background: 'var(--bg-secondary)', border: '1px solid var(--border)' } as CSSProperties,
  card: { background: 'var(--bg-elevated)', border: '1px solid var(--border)' } as CSSProperties,
  input: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  } as CSSProperties,
  heading: { color: 'var(--text-primary)' } as CSSProperties,
  // Page title — strong weight, primary color.
  pageTitle: { color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.01em' } as CSSProperties,
  // Section heading — bold + accent color, with an accent underline (applied
  // via className border-b + this borderColor) so sections are eye-catching.
  sectionTitle: {
    color: 'var(--accent-text)',
    fontWeight: 700,
    borderColor: 'var(--accent-subtle)',
  } as CSSProperties,
  body: { color: 'var(--text-primary)' } as CSSProperties,
  muted: { color: 'var(--text-secondary)' } as CSSProperties,
  accentText: { color: 'var(--accent-text)' } as CSSProperties,
  primaryBtn: { background: 'var(--accent)', color: '#fff' } as CSSProperties,
  subtleBtn: {
    background: 'var(--accent-subtle)',
    border: '1px solid var(--border)',
    color: 'var(--accent-text)',
  } as CSSProperties,
  ghostBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  } as CSSProperties,
};

/** Error / success banner styling that reads in both themes. */
export function banner(kind: 'error' | 'success'): CSSProperties {
  return kind === 'error'
    ? { background: 'rgba(220,53,69,0.12)', border: '1px solid rgba(220,53,69,0.40)', color: '#e5798a' }
    : { background: 'rgba(40,167,69,0.12)', border: '1px solid rgba(40,167,69,0.40)', color: '#5bb97a' };
}

/** Layout-only class strings (colors come from the T tokens above). */
export const CX = {
  input: 'w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2',
  label: 'block text-sm font-medium mb-1',
};
