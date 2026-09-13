import { useState } from 'react';
import type { InterviewQ } from '@/data/python';
import SurfaceCard from './SurfaceCard';

export default function InterviewQuestions({ questions }: { questions?: InterviewQ[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!questions?.length) return null;

  return (
    <SurfaceCard label="Interview Questions" accent="var(--cam-gold-leaf)">
      <ul className="divide-y divide-[var(--border)]/40">
        {questions.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={i}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full text-left px-6 py-3.5 flex items-start gap-3 transition-colors"
                style={{ background: 'transparent' }}
              >
                <span
                  className="font-mono text-[12px] shrink-0 mt-0.5 transition-transform"
                  style={{ color: 'var(--cam-gold-leaf-dk)', transform: isOpen ? 'rotate(90deg)' : 'none' }}
                  aria-hidden
                >
                  ▸
                </span>
                <span className="text-[13px] font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {item.q}
                </span>
              </button>
              <p
                hidden={!isOpen}
                className="px-6 pb-4 pl-[3.1rem] text-[13px] leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.a}
              </p>
            </li>
          );
        })}
      </ul>
    </SurfaceCard>
  );
}
