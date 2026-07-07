import { Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CodingLayout } from '../../components/lumora/coding/CodingLayout';
import { ErrorBoundary } from '../../components/shared/ui/ErrorBoundary';
import { PaywallGate } from '../../components/shared/ui/PaywallGate';
import { useStreamingSession } from '../../hooks/useStreamingSession';
import { ProctorProvider, ProctorOverlays, ProctorTimeline, ProctorConsent, useProctor } from '@/components/lumora/proctor';

const ProctorGate = ({ children }: { children: ReactNode }) => {
  const { start, stop } = useProctor();
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    return () => { if (started) void stop(); };
  }, [started, stop]);

  const begin = async () => {
    setStarting(true);
    try { await document.documentElement.requestFullscreen(); } catch { /* user may deny fullscreen */ }
    try { await start(); setStarted(true); } finally { setStarting(false); }
  };

  if (!started) return <ProctorConsent onStart={begin} starting={starting} />;

  return (
    <>
      <ProctorOverlays />
      {children}
      <div className="fixed bottom-4 right-4 z-40 w-72" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
        <ProctorTimeline />
      </div>
    </>
  );
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
      <ProctorGate>
        <CodingLayout
          onSubmit={handleCodingSubmit}
          isLoading={isStreaming}
          onBack={() => navigate('/lumora')}
          initialProblem={initialProblem}
          initialUrl={initialUrl}
          initialStarterCode={initialStarterCode}
        />
      </ProctorGate>
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
