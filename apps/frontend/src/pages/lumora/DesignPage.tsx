import { Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DesignLayout } from '../components/design/DesignLayout';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { PaywallGate } from '../components/ui/PaywallGate';

function DesignPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialProblem = searchParams.get('problem') || '';

  return (
    <DesignLayout
      onBack={() => navigate('/app')}
      initialProblem={initialProblem}
    />
  );
}

export function DesignPage() {
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
