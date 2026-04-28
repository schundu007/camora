import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import CamoraLogo from '@/components/shared/CamoraLogo';
import { useInterviewStore } from '@/stores/interview-store';
import ScreenCaptureButton from '@/components/lumora/shared/ScreenCaptureButton';

/**
 * MockInterviewPage — HackerRank-style fullscreen "Live Interview" view.
 *
 * Black canvas, thin chrome on top (logo + title + timer + End), centered
 * rolling transcript on the left, webcam float on the right, decorative
 * wireframe globe at the bottom, single control pill for mic / video /
 * screen-share. Built to match the visual quality of HackerRank's AI
 * Fluency Mock Interview.
 *
 * Reads transcript from `useInterviewStore.history` (interviewer questions
 * are populated by the existing transcription pipeline, Sona's answers by
 * the streaming inference). No new audio plumbing — this view is purely a
 * presentation layer over the same data the dashboard view uses.
 */
export default function MockInterviewPage() {
  const navigate = useNavigate();
  const history = useInterviewStore((s) => s.history);
  const liveQuestion = useInterviewStore((s) => s.question);
  const isStreaming = useInterviewStore((s) => s.isStreaming);
  const streamText = useInterviewStore((s) => s.streamText);

  /* ── elapsed timer ──────────────────────────────────────────────── */
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsedSec((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')} mins`;
  };

  /* ── webcam ─────────────────────────────────────────────────────── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const [webcamOn, setWebcamOn] = useState(true);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const startWebcam = useCallback(async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      camStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      setWebcamError((err as Error)?.message || 'Camera unavailable');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (webcamOn) startWebcam();
    else stopWebcam();
    return stopWebcam;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webcamOn]);

  /* ── audio devices (mic) ────────────────────────────────────────── */
  const [micOn, setMicOn] = useState(true);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [showMicPicker, setShowMicPicker] = useState(false);

  useEffect(() => {
    const enumerate = async () => {
      try {
        // Trigger mic permission so labels populate
        await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {});
        const devs = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devs.filter((d) => d.kind === 'audioinput'));
      } catch {
        /* ignore */
      }
    };
    enumerate();
    navigator.mediaDevices?.addEventListener?.('devicechange', enumerate);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', enumerate);
  }, []);

  /* ── transcript ─────────────────────────────────────────────────── */
  // Show the last 2 fully-completed turns + live in-flight (if any).
  const recent = useMemo(() => history.slice(-2), [history]);
  const liveExcerpt = useMemo(() => {
    if (!isStreaming || !streamText) return null;
    // Strip any [TYPE]…[/TYPE] tags so the live text reads as prose.
    return streamText.replace(/\[\/?\w+\]/g, '').trim().slice(-280);
  }, [isStreaming, streamText]);

  /* ── End interview ──────────────────────────────────────────────── */
  const endInterview = useCallback(() => {
    stopWebcam();
    navigate('/lumora');
  }, [navigate, stopWebcam]);

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        // Layered atmospheric background:
        //  1. Subtle navy radial spotlight at the top center (draws the eye
        //     to the transcript area without competing with content)
        //  2. Cyan wash at the bottom that blends into the wireframe globe
        //  3. Pure-black canvas underneath
        background:
          'radial-gradient(ellipse 65% 55% at 28% 38%, rgba(38,97,156,0.18), transparent 70%),' +
          'radial-gradient(ellipse 70% 45% at 50% 110%, rgba(34,211,238,0.14), transparent 70%),' +
          '#000000',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <div
        className="flex items-center px-5 sm:px-8 shrink-0 relative z-30"
        style={{
          height: 56,
          background: 'linear-gradient(180deg, rgba(15,18,25,0.92) 0%, rgba(15,18,25,0.78) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <Link to="/" className="flex items-center gap-2.5 no-underline" aria-label="Camora — home">
          <CamoraLogo size={26} />
          <span className="text-[14px] font-bold tracking-wide text-white">CAMORA</span>
        </Link>
        <span className="mx-4 text-white/20">|</span>
        <span className="text-[13px] font-medium text-white/85">Live Interview</span>
        <div className="flex-1" />
        <span className="hidden sm:inline text-[13px] font-medium text-white/80 tabular-nums mr-4">
          {fmtTime(elapsedSec)}
        </span>
        <span className="hidden sm:inline mx-1 text-white/20">|</span>
        <button
          type="button"
          onClick={endInterview}
          className="ml-2 sm:ml-4 px-4 sm:px-5 py-2 rounded-md text-[13px] font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: '#EF4444', boxShadow: '0 4px 12px rgba(239,68,68,0.32)' }}
        >
          End Interview
        </button>
      </div>

      {/* ── Main canvas ───────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Decorative wireframe globe — bottom 35% */}
        <WireframeGlobe />

        {/* Transcript + webcam */}
        <div className="absolute inset-0 flex items-center px-6 sm:px-12 lg:px-20 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 w-full max-w-6xl mx-auto items-center">
            {/* LEFT — transcript */}
            <div className="space-y-7">
              {recent.length === 0 && !liveQuestion && !liveExcerpt ? (
                <div className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Listening for the interviewer's question…
                </div>
              ) : (
                <>
                  {recent.map((entry, i) => (
                    <TranscriptTurn key={`h-${i}`} question={entry.question} answer={summarizeBlocks(entry.blocks)} muted={i < recent.length - 1} />
                  ))}
                  {/* In-flight question or answer */}
                  {liveQuestion && (
                    <TranscriptTurn question={liveQuestion} answer={liveExcerpt || ''} live />
                  )}
                </>
              )}
            </div>

            {/* RIGHT — webcam float with ambient halo + corner indicators */}
            <div className="flex items-start justify-center lg:justify-end shrink-0 relative">
              {/* Cyan halo behind the camera — adds depth without a hard border */}
              <div
                aria-hidden="true"
                className="absolute pointer-events-none"
                style={{
                  width: 360,
                  height: 260,
                  background:
                    'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(34,211,238,0.22), transparent 70%)',
                  filter: 'blur(28px)',
                  zIndex: -1,
                }}
              />
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  width: 320,
                  height: 220,
                  background: 'linear-gradient(135deg, #1A1D24 0%, #0F1219 100%)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow:
                    '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {webcamOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' /* mirror like Zoom */ }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" d="M3 3l18 18" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V7l-7 5M3 7v10a2 2 0 002 2h12" />
                    </svg>
                  </div>
                )}
                {webcamError && webcamOn && (
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] px-4 text-center text-red-300">
                    {webcamError}
                  </div>
                )}
                {/* Recording indicator — top-left corner of the camera */}
                {webcamOn && !webcamError && (
                  <div
                    className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.8)' }}
                    />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/85">Live</span>
                  </div>
                )}
                {/* Corner tick marks (cinematic feel) */}
                <CornerTicks />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom control pill ────────────────────────────────── */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 sm:bottom-8 z-20">
          <div
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-full"
            style={{
              background: 'rgba(15,18,25,0.92)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
            }}
          >
            {/* Mic toggle + device picker chevron */}
            <ControlButton
              active={micOn}
              onClick={() => setMicOn((v) => !v)}
              label={micOn ? 'Mute mic' : 'Unmute mic'}
              icon={micOn ? <MicIcon /> : <MicOffIcon />}
            />
            <button
              type="button"
              onClick={() => setShowMicPicker((v) => !v)}
              aria-label="Pick microphone"
              className="flex items-center justify-center w-7 h-9 rounded-full transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>

            <ControlButton
              active={webcamOn}
              onClick={() => setWebcamOn((v) => !v)}
              label={webcamOn ? 'Turn off camera' : 'Turn on camera'}
              icon={webcamOn ? <VideoIcon /> : <VideoOffIcon />}
            />

            {/* Screen-share — uses existing capture flow but wired here just to
                show the OS picker; we don't drop the OCR text into anything in
                this view. */}
            <ScreenCaptureButton kind="coding" onCaptured={() => { /* mock view: discard */ }} variant="icon" label="Share screen" />
          </div>

          {/* Mic picker dropdown — shown above the pill */}
          {showMicPicker && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[300px] max-w-[90vw] rounded-xl overflow-hidden"
              style={{
                background: '#0F1219',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
              }}
              role="menu"
            >
              {audioInputs.length === 0 ? (
                <div className="px-4 py-3 text-[12px] text-white/50">No microphones detected</div>
              ) : (
                audioInputs.map((d) => {
                  const isActive = selectedMic ? d.deviceId === selectedMic : d.deviceId === 'default';
                  return (
                    <button
                      key={d.deviceId}
                      type="button"
                      onClick={() => { setSelectedMic(d.deviceId); setShowMicPicker(false); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-white/5"
                      style={{
                        color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
                        background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                        fontWeight: isActive ? 700 : 500,
                      }}
                    >
                      {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── transcript turn ─────────────────────────────────────────────── */
function TranscriptTurn({
  question,
  answer,
  muted,
  live,
}: {
  question: string;
  answer: string;
  muted?: boolean;
  live?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p
        className="text-[15px] leading-relaxed font-normal"
        style={{ color: muted ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.78)' }}
      >
        {question}
      </p>
      {answer && (
        <div className="flex items-start gap-2.5 pl-0">
          <span aria-hidden="true" className="mt-1.5">
            <DotsIcon />
          </span>
          <p
            className="text-[14px] leading-relaxed italic"
            style={{
              color: muted ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.62)',
              fontStyle: 'italic',
            }}
          >
            {answer}
            {live && <Cursor />}
          </p>
        </div>
      )}
    </div>
  );
}

function Cursor() {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-1.5 h-4 ml-1 align-middle animate-pulse"
      style={{ background: 'rgba(255,255,255,0.62)' }}
    />
  );
}

function DotsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      {[0, 4, 8].flatMap((cx) => [0, 4, 8].map((cy) => (
        <circle key={`${cx}-${cy}`} cx={cx + 1} cy={cy + 1} r="0.9" fill="rgba(255,255,255,0.3)" />
      )))}
    </svg>
  );
}

/* Cinematic corner tick marks on the webcam — pure decoration */
function CornerTicks() {
  const tick = 'absolute w-3 h-3 border-cyan-400/40';
  return (
    <>
      <span aria-hidden="true" className={`${tick} top-2 left-2 border-t border-l rounded-tl`} />
      <span aria-hidden="true" className={`${tick} top-2 right-2 border-t border-r rounded-tr`} />
      <span aria-hidden="true" className={`${tick} bottom-2 left-2 border-b border-l rounded-bl`} />
      <span aria-hidden="true" className={`${tick} bottom-2 right-2 border-b border-r rounded-br`} />
    </>
  );
}

/* ── decorative wireframe (animated) ───────────────────────────── */
function WireframeGlobe() {
  // 14 concentric arcs forming a hemispherical "globe" sitting at the
  // bottom of the canvas. Cyan/teal stroke at 0.10–0.22 alpha so the
  // text above stays readable. Scales to viewport via 100% width.
  // The whole thing breathes — subtle vertical translate + opacity
  // shimmer — to feel alive without distracting from the transcript.
  return (
    <>
      <style>{`
        @keyframes globe-breathe {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50%      { transform: translateY(-6px); opacity: 0.92; }
        }
        @keyframes globe-shimmer {
          0%, 100% { stroke-opacity: 1; }
          50%      { stroke-opacity: 0.6; }
        }
      `}</style>
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 w-full pointer-events-none select-none"
        viewBox="0 0 1600 320"
        preserveAspectRatio="none"
        style={{ height: '38%', animation: 'globe-breathe 7s ease-in-out infinite' }}
      >
        <defs>
          <radialGradient id="globe-glow" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="rgba(34,211,238,0.18)" />
            <stop offset="60%" stopColor="rgba(34,211,238,0.06)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </radialGradient>
        </defs>
        {/* Soft glow under the wireframe */}
        <ellipse cx="800" cy="320" rx="900" ry="180" fill="url(#globe-glow)" />
        {Array.from({ length: 14 }).map((_, i) => {
          const rx = 200 + i * 140;
          const ry = 14 + i * 14;
          const opacity = 0.10 + i * 0.014;
          return (
            <ellipse
              key={i}
              cx="800"
              cy="380"
              rx={rx}
              ry={ry}
              fill="none"
              stroke={`rgba(34,211,238,${opacity})`}
              strokeWidth="1"
              style={{ animation: `globe-shimmer ${5 + (i % 3)}s ease-in-out ${i * 0.15}s infinite` }}
            />
          );
        })}
        {/* Vertical meridian lines for the "longitude" feel */}
        {Array.from({ length: 13 }).map((_, i) => {
          const cx = 100 + i * 120;
          return (
            <line
              key={`m-${i}`}
              x1={cx}
              y1="320"
              x2="800"
              y2="380"
              stroke="rgba(34,211,238,0.10)"
              strokeWidth="0.6"
            />
          );
        })}
      </svg>
    </>
  );
}

/* ── shared control button ──────────────────────────────────────── */
function ControlButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
      style={{
        background: active ? 'rgba(255,255,255,0.10)' : 'rgba(220,38,38,0.18)',
        color: active ? '#FFFFFF' : '#FCA5A5',
        border: `1px solid ${active ? 'rgba(255,255,255,0.14)' : 'rgba(220,38,38,0.32)'}`,
      }}
    >
      {icon}
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function VideoOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── helpers ────────────────────────────────────────────────────── */
function summarizeBlocks(blocks: Array<{ type: string; content: string }>): string {
  if (!blocks?.length) return '';
  // Prefer ANSWER, fall back to HEADLINE, then concat first non-empty block.
  const byType: Record<string, string> = {};
  blocks.forEach((b) => { byType[b.type] = b.content; });
  const text = byType.ANSWER || byType.HEADLINE || blocks.find((b) => b.content?.trim())?.content || '';
  return text.replace(/\[\/?\w+\]/g, '').replace(/^[•\-*]\s*/gm, '').trim().slice(0, 320);
}
