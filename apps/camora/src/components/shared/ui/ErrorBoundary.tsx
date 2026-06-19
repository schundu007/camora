import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    // Stale chunk after deploy — old index.html references hashes that no
    // longer exist. Guard: only reload once per tab session to prevent an
    // infinite reload loop if the chunk failure is persistent (broken asset,
    // import error, etc.). The vite:preloadError listener in main.tsx uses
    // the same key so both guards share a single reload budget.
    if (
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.name === 'ChunkLoadError'
    ) {
      const RELOAD_KEY = 'vite_preload_reload';
      if (!sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-6"
          style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
          role="alert"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent-subtle)', color: 'var(--cam-primary-dk)' }}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Something broke
            </h2>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              We hit an unexpected error rendering this page. Try again — if it keeps happening,
              refreshing the tab usually clears it.
            </p>
            <p className="text-[11px] mb-5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {this.state.error?.message || 'unknown'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-5 py-2 text-[12px] font-bold rounded-lg cursor-pointer transition-[background-color,transform] hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--cam-primary-dk)', color: '#FFFFFF', border: '1px solid var(--cam-primary-dk)' }}
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="px-5 py-2 text-[12px] font-semibold rounded-lg cursor-pointer transition-[background-color,border-color,color] active:scale-[0.98]"
                style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
