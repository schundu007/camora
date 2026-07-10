import type { CoFixChange, CoFixWalkStep } from '@/lib/sse-client';
import { AnswerBook } from '@/components/lumora/shared/book/AnswerBook';
import { docFromCoFix } from '@/lib/lumora/book-model';

interface AnnotationPanelProps {
  changes: CoFixChange[];
  walkthrough?: CoFixWalkStep[];
}

export const AnnotationPanel = ({ changes, walkthrough = [] }: AnnotationPanelProps) => {
  return (
    <div className="w-full h-full overflow-y-auto border-l border-[var(--cam-gold-leaf-dk)]">
      <AnswerBook doc={docFromCoFix({ changes, walkthrough })} />
    </div>
  );
};
