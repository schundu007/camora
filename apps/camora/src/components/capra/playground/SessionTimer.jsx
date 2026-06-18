import { useDialog } from '@/components/shared/Dialog';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SessionTimer({ timeRemaining, extendAvailable, onExtend, onEnd }) {
  const { confirm } = useDialog();

  const isAmber = timeRemaining < 300;
  const isRed = timeRemaining < 60;

  const handleEnd = async () => {
    const ok = await confirm({ message: 'End session? The container will be destroyed.', tone: 'danger' });
    if (ok) onEnd();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="text-center font-mono text-2xl font-bold tracking-widest px-3 py-2 rounded-lg"
        style={{
          color: isRed ? '#ef4444' : isAmber ? '#f59e0b' : 'var(--text-primary)',
          background: isRed
            ? 'rgba(239,68,68,0.1)'
            : isAmber
            ? 'rgba(245,158,11,0.1)'
            : 'var(--bg-elevated)',
          border: `1px solid ${isRed ? 'rgba(239,68,68,0.3)' : isAmber ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
          animation: isRed ? 'pulse 1s ease-in-out infinite' : undefined,
        }}
      >
        {formatTime(timeRemaining)}
      </div>

      {extendAvailable && (
        <button
          type="button"
          onClick={onExtend}
          className="btn-primary w-full text-sm py-1.5"
          style={{
            background: 'var(--cam-gold-leaf)',
            color: '#1a1200',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '6px 12px',
          }}
        >
          Extend +15 min
        </button>
      )}

      <button
        type="button"
        onClick={handleEnd}
        className="w-full text-xs py-1"
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px 8px',
        }}
      >
        End Session
      </button>
    </div>
  );
}
