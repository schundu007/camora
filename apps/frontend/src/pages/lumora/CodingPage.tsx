import { Suspense, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CodingLayout } from '../../components/lumora/coding/CodingLayout';
import { Header } from '../../components/lumora/interview/Header';
import { FollowUpPopup } from '../../components/lumora/interview/FollowUpPopup';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { PaywallGate } from '../../components/shared/ui/PaywallGate';
import { useStreamingInterview } from '../../hooks/useStreamingInterview';

function CodingPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCodingSubmit, isStreaming } = useStreamingInterview();
  const codingRef = useRef<{ setProblemText?: (t: string) => void; getLanguage?: () => string; submit?: () => void }>(null);

  const initialProblem = searchParams.get('problem') || '';

  const handleTranscription = useCallback((text: string) => {
    if (text.trim()) {
      const lang = codingRef.current?.getLanguage?.() || 'python';
      codingRef.current?.setProblemText?.(text.trim());
      handleCodingSubmit(text.trim(), lang);
    }
  }, [handleCodingSubmit]);

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
          <CodingLayout
            ref={codingRef}
            onSubmit={handleCodingSubmit}
            isLoading={isStreaming}
            onBack={() => navigate('/lumora')}
            initialProblem={initialProblem}
            hideHeader
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export function CodingPage() {
  useEffect(() => {
    document.title = 'Coding Interview | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <PaywallGate feature="Coding Solutions">
      <ErrorBoundary>
        <Suspense>
          <CodingPageContent />
        </Suspense>
      </ErrorBoundary>
    </PaywallGate>
  );
}

export default CodingPage;
