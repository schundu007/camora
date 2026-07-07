import { Suspense, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CodingLayout } from '../../components/lumora/coding/CodingLayout';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { PaywallGate } from '../../components/shared/ui/PaywallGate';
import { useStreamingSession } from '../../hooks/useStreamingSession';
import { ProctorProvider, ProctorOverlays, ProctorTimeline, useProctor } from '@/components/lumora/proctor';

const ProctorLifecycle = () => {
  const { start, stop } = useProctor();
  useEffect(() => { void start(); return () => { void stop(); }; }, [start, stop]);
  return null;
};

const CodingPageContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCodingSubmit, isStreaming } = useStreamingSession();

  const initialProblem = searchParams.get('problem') || '';
  const initialUrl = searchParams.get('url') || '';
  const initialStarterCode = searchParams.get('starter_code') || null;

  return (
    <ProctorProvider surface="coding">
      <ProctorLifecycle />
      <ProctorOverlays />
      <CodingLayout
        onSubmit={handleCodingSubmit}
        isLoading={isStreaming}
        onBack={() => navigate('/lumora')}
        initialProblem={initialProblem}
        initialUrl={initialUrl}
        initialStarterCode={initialStarterCode}
      />
      <div className="fixed bottom-4 right-4 z-40 w-72" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
        <ProctorTimeline />
      </div>
    </ProctorProvider>
  );
}

export const CodingPage = () => {
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
