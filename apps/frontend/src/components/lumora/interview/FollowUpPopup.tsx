/**
 * Floating AI Co-pilot popup for live interview follow-up questions.
 * Reads from the same Zustand store as InterviewPanel — no separate streaming path.
 * Renders via createPortal to document.body for correct z-index stacking.
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useInterviewStore } from '@/stores/interview-store';
import { parseStreamingBlocks } from '@/lib/parse-streaming-blocks';
import { cleanText } from '@/lib/text-utils';

/* ── Decorative waveform bars ─────────────────────────────── */

function AudioWaveform({ active }: { active: boolean }) {
  const bars = 24;
  return (
    <div className="flex items-center justify-center gap-[2px] h-6 px-4 py-1">
      {Array.from({ length: bars }).map((_, i) => {
        const baseH = 3 + Math.sin(i * 0.7) * 2;
        const activeH = 4 + Math.random() * 14;
        return (
          <div
            key={i}
            className="w-[2px] rounded-full transition-all duration-150"
            style={{
              height: active ? `${activeH}px` : `${baseH}px`,
              background: active
                ? `rgba(99,102,241,${0.4 + Math.random() * 0.6})`
                : 'rgba(255,255,255,0.1)',
              transitionDelay: `${i * 15}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ── SAY THIS card ────────────────────────────────────────── */

function SayThisCard({ text }: { text: string | null }) {
  const handleCopy = useCallback(() => {
    if (text) navigator.clipboard.writeText(text);
  }, [text]);

  return (
    <div
      className="mx-3 mb-3 rounded-xl p-3 relative"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))',
        border: '1px solid rgba(99,102,241,0.25)',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-[10px] font-mono font-bold text-white/70 uppercase tracking-widest">SAY THIS</span>
        </div>
        {text && (
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Copy to clipboard"
          >
            <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        )}
      </div>
      {text ? (
        <p className="text-[13px] text-white/90 leading-relaxed font-medium">{text}</p>
      ) : (
        <div className="space-y-1.5">
          <div className="h-3 bg-white/5 rounded shimmer w-full" />
          <div className="h-3 bg-white/5 rounded shimmer w-3/4" />
        </div>
      )}
    </div>
  );
}

/* ── Minimized pill ───────────────────────────────────────── */

function MinimizedPill({ onExpand }: { onExpand: () => void }) {
  return createPortal(
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onExpand}
      className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer"
      style={{
        background: 'rgba(15,15,25,0.9)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(99,102,241,0.3)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs font-mono font-bold text-white/80 tracking-wide">Lumora LIVE</span>
      <svg className="w-3 h-3 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </motion.button>,
    document.body,
  );
}

/* ── Main popup ───────────────────────────────────────────── */

export function FollowUpPopup() {
  const {
    question, isStreaming, streamText, parsedBlocks,
    popupVisible, popupMinimized,
    setPopupVisible, setPopupMinimized,
    isRecording,
  } = useInterviewStore();

  const dragControls = useDragControls();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Determine if popup should render
  const shouldShow = popupVisible && (question || isStreaming || parsedBlocks.length > 0);

  // Parse streaming blocks for live content
  const blocks = useMemo(() => {
    if (isStreaming && streamText) return parseStreamingBlocks(streamText);
    return {};
  }, [isStreaming, streamText]);

  // Extract headline (SAY THIS) from streaming or final blocks
  const headline = useMemo(() => {
    if (parsedBlocks.length > 0) {
      const h = parsedBlocks.find((b) => b.type === 'HEADLINE');
      return h ? cleanText(h.content) : null;
    }
    if (blocks.HEADLINE) return cleanText(blocks.HEADLINE.content);
    return null;
  }, [parsedBlocks, blocks]);

  // Extract answer text from streaming or final blocks
  const answerText = useMemo(() => {
    if (parsedBlocks.length > 0) {
      const a = parsedBlocks.find((b) => b.type === 'ANSWER');
      return a ? cleanText(a.content) : null;
    }
    if (blocks.ANSWER) return cleanText(blocks.ANSWER.content);
    return null;
  }, [parsedBlocks, blocks]);

  // Auto-scroll answer area during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isStreaming, streamText]);

  if (!shouldShow) return null;

  if (popupMinimized) {
    return (
      <AnimatePresence>
        <MinimizedPill onExpand={() => setPopupMinimized(false)} />
      </AnimatePresence>
    );
  }

  const popup = (
    <AnimatePresence>
      <motion.div
        key="followup-popup"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        drag={isMobile ? false : true}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        className="fixed z-[9999] flex flex-col"
        style={{
          bottom: isMobile ? 16 : 80,
          right: isMobile ? 16 : 24,
          left: isMobile ? 16 : 'auto',
          width: isMobile ? 'auto' : 380,
          maxHeight: isMobile ? '60vh' : '70vh',
          background: 'rgba(15, 15, 25, 0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1), 0 0 60px rgba(99,102,241,0.06)',
        }}
      >
        {/* ── Header (drag handle) ──────────────────────── */}
        <div
          onPointerDown={(e) => { if (!isMobile) dragControls.start(e); }}
          className="flex items-center justify-between px-4 py-3 select-none"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            cursor: isMobile ? 'default' : 'grab',
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-sm font-bold text-white/90 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}>
              Lumora AI Co-pilot
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* LIVE badge */}
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
            {/* Minimize */}
            <button onClick={() => setPopupMinimized(true)} className="p-1 rounded hover:bg-white/10 transition-colors" title="Minimize">
              <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Close */}
            <button onClick={() => setPopupVisible(false)} className="p-1 rounded hover:bg-white/10 transition-colors" title="Close (Cmd+J to reopen)">
              <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Waveform ──────────────────────────────────── */}
        <AudioWaveform active={isStreaming || isRecording} />

        {/* ── Interviewer question ──────────────────────── */}
        {question && (
          <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider">Interviewer:</span>
            <p className="text-[13px] text-white/80 leading-snug mt-0.5 italic">
              &ldquo;{question.length > 150 ? question.slice(0, 150) + '...' : question}&rdquo;
            </p>
          </div>
        )}

        {/* ── AI Answer Stream ──────────────────────────── */}
        <div className="mx-3 mb-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25" />
            </svg>
            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">AI Answer Stream</span>
            {isStreaming && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </div>
          <div
            ref={scrollRef}
            className="overflow-y-auto rounded-lg px-3 py-2.5 text-[13px] text-white/75 leading-relaxed"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              maxHeight: isMobile ? '25vh' : '180px',
              minHeight: 60,
            }}
          >
            {answerText ? (
              <>
                {answerText}
                {isStreaming && !blocks.ANSWER?.isComplete && (
                  <span className="inline-block w-2 h-4 ml-0.5 bg-indigo-400/70 animate-pulse rounded-sm" />
                )}
              </>
            ) : isStreaming ? (
              <div className="flex items-center gap-2 text-white/30">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Generating answer...
              </div>
            ) : (
              <span className="text-white/30">Waiting for question...</span>
            )}
          </div>
        </div>

        {/* ── SAY THIS ──────────────────────────────────── */}
        <SayThisCard text={headline} />
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(popup, document.body);
}
