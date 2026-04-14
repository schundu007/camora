import { useState } from 'react';
import { getAuthHeaders } from '../../../utils/authHeaders.js';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface InterviewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetup: () => void;
}

export default function InterviewSetupModal({ isOpen, onClose, onSetup }: InterviewSetupModalProps) {
  const [interviewDate, setInterviewDate] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // min date = today
  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!interviewDate || !targetCompany.trim()) {
      setError('Please fill in date and company');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/interview/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          interview_date: interviewDate,
          target_company: targetCompany.trim(),
          target_role: targetRole.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Setup failed' }));
        throw new Error(data.error || data.detail || 'Setup failed');
      }

      // Reset form and notify parent
      setInterviewDate('');
      setTargetCompany('');
      setTargetRole('');
      onSetup();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--bg-surface)] rounded-2xl shadow-xl border-0 w-full max-w-[calc(100vw-2rem)] sm:max-w-md p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Set Your Interview Date</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          We'll build a personalized prep plan based on your timeline.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Date */}
          <div>
            <label htmlFor="interview-date" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Interview Date
            </label>
            <input
              id="interview-date"
              type="date"
              min={today}
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors"
              required
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="target-company" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Company
            </label>
            <input
              id="target-company"
              type="text"
              placeholder="e.g. Google, Amazon"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label htmlFor="target-role" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Role
            </label>
            <input
              id="target-role"
              type="text"
              placeholder="e.g. Senior SDE, L5"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-[var(--bg-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-[var(--accent)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating plan...' : 'Create Prep Plan'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
