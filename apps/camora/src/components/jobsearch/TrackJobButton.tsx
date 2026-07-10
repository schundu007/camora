import { useState } from 'react';
import { createApplication } from '../../lib/jobsearch-api';

/**
 * "Track" action for a job card in the feed. Creates a job_applications row
 * (status='saved') from the job snapshot so it appears in the tracker
 * (/jobsearch/applications). Self-contained state so it drops into JobsPage
 * without threading tracker state through that large component.
 */

interface TrackJob {
  id: string;
  title: string;
  company_name: string;
  location?: string;
  job_url: string;
  source?: string;
}

type TrackState = 'idle' | 'saving' | 'saved' | 'error';

const LABELS: Record<TrackState, string> = {
  idle: 'Track',
  saving: 'Saving…',
  saved: 'Tracked ✓',
  error: 'Retry',
};

export default function TrackJobButton({ job }: { job: TrackJob }) {
  const [state, setState] = useState<TrackState>('idle');

  const onTrack = async () => {
    if (state === 'saving' || state === 'saved') return;
    setState('saving');
    try {
      await createApplication({
        source_job_id: job.id,
        title: job.title,
        company: job.company_name,
        location: job.location || null,
        job_url: job.job_url,
        source: job.source || null,
        status: 'saved',
      });
      setState('saved');
    } catch {
      setState('error');
    }
  };

  const interactive = state === 'idle' || state === 'error';

  return (
    <button
      type="button"
      onClick={onTrack}
      disabled={!interactive}
      data-tip={state === 'error' ? 'Could not track — click to retry' : 'Save to your application tracker'}
      style={{
        fontSize: '13px',
        fontWeight: 500,
        color: state === 'saved' ? 'var(--accent)' : 'var(--text-secondary)',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: interactive ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => { if (interactive) e.currentTarget.style.color = 'var(--accent)'; }}
      onMouseLeave={(e) => { if (interactive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
    >
      {LABELS[state]}
    </button>
  );
}
