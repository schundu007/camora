import { Suspense, useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DesignLayout } from '../../components/lumora/design/DesignLayout';
import { Header } from '../../components/lumora/interview/Header';
import { FollowUpPopup } from '../../components/lumora/interview/FollowUpPopup';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { PaywallGate } from '../../components/shared/ui/PaywallGate';

function DesignPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const designRef = useRef<{ setProblemText?: (t: string) => void }>(null);

  const initialProblem = searchParams.get('problem') || '';

  const handleTranscription = useCallback((text: string) => {
    // Voice input → set as problem text in DesignLayout
    designRef.current?.setProblemText?.(text);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden lumora-app-bg">
      <div className="lumora-grid-overlay" />
      <FollowUpPopup />
      <Header
        inputValue=""
        onInputChange={() => {}}
        onSubmit={() => {}}
        onTranscription={handleTranscription}
        showInputBar={false}
      />
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <ErrorBoundary>
          <DesignLayout
            ref={designRef}
            onBack={() => navigate('/lumora')}
            initialProblem={initialProblem}
            hideHeader
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export function DesignPage() {
  useEffect(() => {
    document.title = 'Design Interview | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <PaywallGate feature="System Design">
      <ErrorBoundary>
        <Suspense>
          <DesignPageContent />
        </Suspense>
      </ErrorBoundary>
    </PaywallGate>
  );
}

export default DesignPage;
