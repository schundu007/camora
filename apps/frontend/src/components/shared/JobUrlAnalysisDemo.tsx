import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const F = {
  display: "'Source Sans 3', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'Source Code Pro', monospace",
};
const accent = 'var(--cam-primary)';

const URL_TEXT = 'intel.wd1.myworkdayjobs.com/.../Senior-DevOps';

const TECH_STACK = [
  'Linux', 'Jenkins', 'GitHub Actions', 'Docker', 'Kubernetes',
  'Python', 'Bash', 'CMake', 'Bazel', 'Slurm',
];

const FOCUS = [
  { label: 'Coding', items: ['Shell scripting', 'Python automation', 'Infra as code'] },
  { label: 'System Design', items: ['CI/CD architecture', 'Container orchestration', 'Artifact storage'] },
  { label: 'Behavioral', items: ['Cross-functional', 'Technical leadership', 'Root cause analysis'] },
];

const STUDY_PATH = [
  { group: 'Coding Round', items: ['Scripting & Automation', 'Python Problem Solving'] },
  { group: 'System Design', items: ['CI/CD Pipeline Architecture', 'Container Orchestration at Scale', 'Monitoring & Observability'] },
  { group: 'Behavioral Round', items: ['STAR Method Framework', 'Leadership Stories', 'Intel Culture & Values'] },
];

const PHASES = ['typing', 'analyzing', 'techstack', 'focus', 'studypath'] as const;
type Phase = typeof PHASES[number];

const PHASE_DURATIONS: Record<Phase, number> = {
  typing: 2600,
  analyzing: 1200,
  techstack: 3200,
  focus: 3600,
  studypath: 4200,
};

function useTypewriter(text: string, active: boolean, speed = 40) {
  const [out, setOut] = useState('');
  useEffect(() => {
    if (!active) { setOut(''); return; }
    let i = 0;
    setOut('');
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);
  return out;
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <motion.circle cx="12" cy="12" r="9" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="14 42" animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
        style={{ transformOrigin: '12px 12px' }} />
    </svg>
  );
}

function Sparkle() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={accent}>
      <path d="M12 2l1.8 5.4L19 9.2l-5.2 1.8L12 16l-1.8-5L5 9.2l5.2-1.8L12 2z" />
    </svg>
  );
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
      style={{
        background: done ? accent : 'transparent',
        border: done ? `1px solid ${accent}` : '1px solid #CBD5E1',
        transition: 'all 0.3s ease',
      }}>
      {done && (
        <motion.svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }}>
          <motion.path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      )}
    </div>
  );
}

export default function JobUrlAnalysisDemo() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = PHASES[phaseIdx];

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPhaseIdx((p) => (p + 1) % PHASES.length);
    }, PHASE_DURATIONS[phase]);
    return () => clearTimeout(timeout);
  }, [phaseIdx, phase]);

  const typed = useTypewriter(URL_TEXT, phase === 'typing', 45);
  const showAnalyzing = phase === 'analyzing';
  const showTech = ['techstack', 'focus', 'studypath'].includes(phase);
  const showFocus = ['focus', 'studypath'].includes(phase);
  const showStudy = phase === 'studypath';

  const showHeader = ['techstack', 'focus', 'studypath'].includes(phase);

  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)',
        border: '1px solid #E2E8F0',
        boxShadow: '0 20px 60px -20px rgba(15, 23, 42, 0.18), 0 4px 16px rgba(15, 23, 42, 0.04)',
      }}>
      {/* macOS-style window chrome */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
        </div>
        <div className="flex items-center gap-1.5">
          {PHASES.map((p, i) => (
            <div key={p} className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === phaseIdx ? 18 : 6,
                background: i <= phaseIdx ? accent : '#E2E8F0',
                opacity: i === phaseIdx ? 1 : i < phaseIdx ? 0.5 : 0.3,
              }} />
          ))}
        </div>
      </div>

      {/* Breadcrumb + role header — shown after analysis starts */}
      <AnimatePresence>
        {showHeader && (
          <motion.div key="header"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            className="px-6 pt-5 pb-3 overflow-hidden">
            <div className="text-[11px] flex items-center gap-1.5 mb-1.5" style={{ color: '#94A3B8', fontFamily: F.mono }}>
              <span>Home</span>
              <span>/</span>
              <span style={{ color: accent }}>Jobs</span>
              <span>/</span>
              <span style={{ color: accent }}>Intel</span>
              <span>/</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Prepare</span>
            </div>
            <p className="text-base font-bold leading-tight" style={{ fontFamily: F.display, color: '#0F172A' }}>
              Intel — Senior Infrastructure & DevOps Engineer
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL input */}
      <div className={`px-6 ${showHeader ? 'pt-2' : 'pt-6'} pb-5`}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
          <svg width="14" height="14" fill="none" stroke="#64748B" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.122a4.5 4.5 0 00-6.364-6.364L4.5 6.1" />
          </svg>
          <span className="text-sm truncate flex-1 min-w-0" style={{ color: '#334155', fontFamily: F.mono }}>
            {phase === 'typing' ? typed : URL_TEXT}
            {phase === 'typing' && typed.length < URL_TEXT.length && (
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                className="inline-block w-[2px] h-3 ml-0.5" style={{ background: accent, verticalAlign: 'middle' }} />
            )}
          </span>
          <motion.button
            className="px-4 py-1.5 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shrink-0"
            style={{ background: accent, fontFamily: F.body }}
            animate={{
              scale: showAnalyzing ? 0.96 : 1,
              opacity: 1,
            }}
            transition={{ duration: 0.2 }}>
            {showAnalyzing ? <Spinner /> : null}
            <span>{showAnalyzing ? 'Analyzing' : 'Analyze'}</span>
          </motion.button>
        </div>
      </div>

      {/* Content area */}
      <div className="px-6 pb-6 min-h-[280px]">
        <AnimatePresence mode="wait">
          {/* Idle/typing: faint placeholder */}
          {(phase === 'typing' || phase === 'analyzing') && (
            <motion.div key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-[280px] text-center">
              <motion.div
                animate={showAnalyzing ? { rotate: 360 } : { rotate: 0 }}
                transition={showAnalyzing ? { repeat: Infinity, duration: 1.5, ease: 'linear' } : {}}
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${accent}15` }}>
                <Sparkle />
              </motion.div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase"
                style={{ color: '#94A3B8', fontFamily: F.mono }}>
                {showAnalyzing ? 'Parsing JD • Extracting skills' : 'Paste any Workday, Greenhouse, Lever URL'}
              </p>
            </motion.div>
          )}

          {/* Tech stack only */}
          {phase === 'techstack' && (
            <motion.div key="tech" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${accent}15` }}>
                  <Sparkle />
                </div>
                <p className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>
                  Tech Stack Extracted
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {TECH_STACK.map((tech, i) => (
                  <motion.span key={tech}
                    initial={{ opacity: 0, y: 10, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.07, type: 'spring', stiffness: 320, damping: 22 }}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{
                      color: '#334155',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                    {tech}
                  </motion.span>
                ))}
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                className="mt-6 flex items-center gap-2 text-xs" style={{ color: '#64748B', fontFamily: F.mono }}>
                <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }}
                  animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4 }} />
                Matching to 800+ study topics…
              </motion.div>
            </motion.div>
          )}

          {/* Focus areas */}
          {phase === 'focus' && (
            <motion.div key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${accent}15` }}>
                  <Sparkle />
                </div>
                <p className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>
                  AI Analysis • Interview Focus
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {FOCUS.map((col, ci) => (
                  <motion.div key={col.label}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ci * 0.15 }}
                    className="rounded-xl p-3" style={{ background: '#F8FBFF', border: '1px solid #E0EFFB' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: accent, fontFamily: F.mono }}>
                      {col.label}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {col.items.map((item, ii) => (
                        <motion.span key={item}
                          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: ci * 0.15 + ii * 0.1 + 0.2 }}
                          className="text-[11px] px-2 py-1 rounded-md font-medium"
                          style={{ color: '#334155', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                          {item}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Study path */}
          {phase === 'studypath' && (
            <motion.div key="study" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${accent}15` }}>
                  <Sparkle />
                </div>
                <p className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: '#64748B', fontFamily: F.mono }}>
                  Recommended Study Path
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {STUDY_PATH.map((g, gi) => (
                  <motion.div key={g.group}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.15 }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#0F172A', fontFamily: F.display }}>
                      {g.group}
                    </p>
                    <div className="flex flex-col gap-1">
                      {g.items.map((item, ii) => (
                        <StudyItem key={item} label={item} delay={gi * 0.15 + ii * 0.18 + 0.3} />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tech chip strip — always visible once techstack has played */}
        {showTech && phase !== 'techstack' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 pt-4 flex flex-wrap gap-1.5" style={{ borderTop: '1px dashed #E2E8F0' }}>
            {TECH_STACK.slice(0, 8).map((tech, i) => (
              <motion.span key={tech}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{ color: '#64748B', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                {tech}
              </motion.span>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StudyItem({ label, delay }: { label: string; delay: number }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), delay * 1000);
    return () => clearTimeout(id);
  }, [delay]);
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay - 0.2 }}
      className="flex items-center gap-2 text-xs py-1 px-2 rounded-md"
      style={{ color: done ? '#0F172A' : '#64748B' }}>
      <CheckIcon done={done} />
      <span style={{ textDecoration: done ? 'none' : 'none', fontWeight: done ? 500 : 400 }}>{label}</span>
    </motion.div>
  );
}
