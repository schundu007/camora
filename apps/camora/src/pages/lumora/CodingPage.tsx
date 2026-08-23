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
  const initialLanguage = searchParams.get('lang') || undefined;

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
          initialLanguage={initialLanguage}
        />
      </ProctorGate>
    </ProctorProvider>
  );
}

export const CodingProctoredPage = () => {
  useEffect(() => {
    document.title = 'Proctored Coding | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    // lumora-shell-root is the scope that swaps the shared design tokens from
    // Capra's Fluent ramp to Lumora's AWS one. Every other /lumora/* route
    // renders through LumoraShellPage, which carries the class; this page does
    // not, so without it the proctored view would render in Fluent colours.
    <div className="lumora-shell-root contents">
      <PaywallGate feature="Coding Solutions">
        <ErrorBoundary>
          <Suspense>
            <CodingPageContent />
          </Suspense>
        </ErrorBoundary>
      </PaywallGate>
    </div>
  );
}

export default CodingProctoredPage;
