/* ── Section helpers — visual primitives reused across DesignLayout
   SectionIcon: SVG glyph table keyed by section name.
   tierColors / layerAccents: stepped brand-color intensity for scalability
   tiers and architecture layers (single-hue Camora navy, not rainbow).
   SectionCopyBtn: tiny copy-to-clipboard button placed on section headers.
*/
import { useState } from 'react';
import React from 'react';

/** Section icons as inline SVGs for visual hierarchy */
export const SectionIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    overview: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    explanation: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    functional: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    nonfunctional: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    scalability: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    scale: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    architecture: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    tradeoffs: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    edgecases: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    followup: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

/** Scalability tier colors — stepped brand-color intensity so each tier is
 *  visually distinguishable while staying on-brand. */
export const tierColors = [
  { bg: 'bg-[rgba(230,57,70,0.04)]', border: 'border-[rgba(230,57,70,0.15)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(230,57,70,0.06)]', border: 'border-[rgba(230,57,70,0.22)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(230,57,70,0.08)]', border: 'border-[rgba(230,57,70,0.30)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(230,57,70,0.10)]', border: 'border-[rgba(230,57,70,0.38)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(230,57,70,0.12)]', border: 'border-[rgba(230,57,70,0.46)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(230,57,70,0.14)]', border: 'border-[rgba(230,57,70,0.54)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(230,57,70,0.16)]', border: 'border-[rgba(230,57,70,0.62)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
  { bg: 'bg-[rgba(230,57,70,0.18)]', border: 'border-[rgba(230,57,70,0.70)]', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
];

/** Architecture layer accents — same stepped brand-color intensity for layers. */
export const layerAccents = [
  { accent: 'var(--cam-primary)', bg: 'rgba(230,57,70,0.04)', border: 'rgba(230,57,70,0.15)' },
  { accent: 'var(--cam-primary)', bg: 'rgba(230,57,70,0.06)', border: 'rgba(230,57,70,0.22)' },
  { accent: 'var(--cam-primary)', bg: 'rgba(230,57,70,0.08)', border: 'rgba(230,57,70,0.30)' },
  { accent: 'var(--cam-primary)', bg: 'rgba(230,57,70,0.10)', border: 'rgba(230,57,70,0.38)' },
  { accent: 'var(--cam-primary)', bg: 'rgba(230,57,70,0.12)', border: 'rgba(230,57,70,0.46)' },
  { accent: 'var(--cam-primary)', bg: 'rgba(230,57,70,0.14)', border: 'rgba(230,57,70,0.54)' },
  { accent: 'var(--cam-primary)', bg: 'rgba(230,57,70,0.16)', border: 'rgba(230,57,70,0.62)' },
  { accent: 'var(--cam-primary)', bg: 'rgba(230,57,70,0.18)', border: 'rgba(230,57,70,0.70)' },
];

/** Tiny copy-to-clipboard button for section headers. Placed with ml-auto so
 *  it sits on the right of the row next to (or in place of) the count badge. */
export function SectionCopyBtn({ getText, title }: { getText: () => string; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(getText()).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title={title || 'Copy section'}
      className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all hover:bg-black/5"
      style={{ color: '#64748B', border: '1px solid rgba(0,0,0,0.08)' }}>
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}
