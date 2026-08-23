/**
 * Citations — surfaces RAG grounding sources below a Sona answer.
 *
 * Design rules (per project memory):
 *   - Navy (#0047AB) accent only; chrome stays charcoal neutrals.
 *   - No generic SVGs or emojis — uses word labels only.
 *   - No Mermaid, no rainbow colors.
 *   - Tailwind 4 classes consistent with the rest of the Lumora shell.
 *   - Renders nothing when citations array is empty.
 *
 * Interaction:
 *   - Collapsed by default: a small footer row showing "Sources" +
 *     count badge.
 *   - Click to toggle the expanded list.
 *   - Each row shows tier-appropriate metadata. Web-watchlist chunks
 *     (Plan C) carry a URL — those rows render as a clickable link
 *     (target=_blank, rel=noopener). KB chunks without a URL and user
 *     uploaded docs render as plain text.
 */

import { useState } from 'react';
import type { Citation } from '@/types';

interface CitationsProps {
  citations: Citation[];
}

/** Human-readable label for the docKind field on user-tier citations. */
const docKindLabel = (docKind: string | null): string  => {
  if (!docKind) return 'Uploaded document';
  const k = docKind.toLowerCase();
  if (k.includes('jd') || k.includes('job')) return 'Job description';
  if (k.includes('resume') || k.includes('cv')) return 'Resume';
  if (k.includes('cover')) return 'Cover letter';
  return docKind;
}

/** Render a single citation row. */
const CitationRow = ({ c, index }: { c: Citation; index: number }) => {
  const isKb = c.tier === 'kb';
  const isCode = c.tier === 'code';

  // Primary label — what to call this source.
  const primaryLabel = isKb
    ? (c.topicTitle || c.topicId || c.source || 'Knowledge base')
    : isCode
    ? (c.topicTitle ? `Your past attempt: ${c.topicTitle}` : 'Your past attempt')
    : docKindLabel(c.docKind);

  // Secondary detail — source path / section / language. Strip internal
  // plumbing that must NEVER reach the user: raw chunk indices ("body:2",
  // "body:0") and internal KB codenames ("capra-behavioral", "capra-projects").
  // KB drops c.source (the codename) and shows only the human section.
  const rawSecondary = isKb
    ? (c.section || null)
    : isCode
    ? [c.language, c.section].filter(Boolean).join(' / ')
    : null; // user docs: c.section is "body:N" — never user-meaningful
  const secondary =
    rawSecondary && !/^body:\s*\d+$/i.test(rawSecondary.trim()) && !/\bcapra[-_]/i.test(rawSecondary)
      ? rawSecondary
      : null;

  return (
    <div
      className="flex items-start gap-2.5 py-2 border-b last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Index number */}
      <span
        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[12px] font-bold tabular-nums mt-0.5"
        style={{
          background: 'var(--accent-subtle)',
          color: 'var(--cam-primary-dk)',
          border: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Tier badge + primary label */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[12px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
            style={{
              background: isKb
                ? 'var(--accent-subtle)'
                : isCode
                ? 'rgba(30,77,120,0.12)'
                : 'rgba(255,153,0,0.12)',
              color: isKb
                ? 'var(--cam-primary-dk)'
                : isCode
                ? 'var(--success, #1E4D78)'
                : 'var(--cam-gold-leaf-text, var(--cam-gold-leaf))',
              border: isKb
                ? '1px solid rgba(0,71,171,0.18)'
                : isCode
                ? '1px solid rgba(30,77,120,0.28)'
                : '1px solid rgba(255,153,0,0.28)',
            }}
          >
            {isKb ? 'KB' : isCode ? 'CODE' : 'YOURS'}
          </span>
          {c.url ? (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-semibold leading-tight truncate hover:underline"
              style={{ color: 'var(--cam-primary)', fontFamily: 'var(--font-answer)' }}
              data-tip={c.url}
            >
              {primaryLabel}
            </a>
          ) : (
            <span
              className="text-[13px] font-semibold leading-tight truncate"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-answer)' }}
            >
              {primaryLabel}
            </span>
          )}
        </div>

        {/* Secondary line */}
        {secondary && (
          <p
            className="mt-0.5 text-[12px] leading-snug truncate"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
}

export const Citations = ({ citations }: CitationsProps) => {
  const [open, setOpen] = useState(false);

  // Dedupe by source identity so the panel doesn't show "Resume / Resume /
  // Resume" once the per-chunk body:N detail is stripped. Keep first hit.
  const seen = new Set<string>();
  const deduped = citations.filter((c) => {
    const key = `${c.tier}|${(c.docKind || c.topicTitle || c.topicId || c.source || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (deduped.length === 0) return null;

  return (
    <div
      className="mt-3 rounded-lg overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Toggle header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 transition-colors"
        style={{
          background: open ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
        aria-expanded={open}
      >
        {/* "Sources" word label — no generic SVG, per project rules */}
        <span
          className="font-display text-[12px] font-bold tracking-[0.12em] uppercase"
          style={{ color: 'var(--cam-primary-dk)' }}
        >
          Sources
        </span>

        {/* Count badge */}
        <span
          className="text-[12px] font-bold tabular-nums px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--accent-subtle)',
            color: 'var(--cam-primary)',
            border: '1px solid rgba(0,71,171,0.18)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {deduped.length}
        </span>

        {/* Chevron */}
        <svg
          className="ml-auto shrink-0 transition-transform duration-150"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'var(--text-muted)',
          }}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded list */}
      {open && (
        <div className="px-3 pt-1 pb-2">
          {deduped.map((c, i) => (
            <CitationRow key={i} c={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
