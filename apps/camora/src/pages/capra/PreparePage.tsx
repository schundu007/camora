import { useEffect, lazy, Suspense } from 'react';

// DocsPage drags ~7 MB of topic data (codingTopics, systemDesignProblems,
// lldTopics, …) eagerly into whatever chunk imports it. Lazy-loading splits
// that mass off the initial PreparePage entry so the route shell renders
// fast and the topic data fetches in parallel while the user looks at the
// loading state.
const DocsPage = lazy(() => import('../../components/capra/docs/DocsPage'));

function DocsLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-4xl mx-auto w-full">
      <div className="h-7 w-48 rounded bg-[var(--bg-elevated)] animate-pulse" />
      <div className="h-4 w-72 rounded bg-[var(--bg-elevated)] animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function PreparePage() {
  useEffect(() => {
    document.title = 'Prepare | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <Suspense fallback={<DocsLoading />}>
      <DocsPage />
    </Suspense>
  );
}
