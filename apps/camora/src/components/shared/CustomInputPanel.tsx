import { useId } from 'react';

/**
 * "Test against custom input" toggle + stdin textarea, shared across every coding
 * surface (Lumora live coding, Capra practice, Playground) so the behaviour and
 * styling never drift. Purely presentational — the owning surface holds the
 * `enabled` / `value` state and decides what Run does with them.
 *
 * When `enabled` is off the surface runs as usual (test cases / no input); when on,
 * Run should execute once feeding `value` as stdin and show raw stdout/stderr.
 */
export interface CustomInputPanelProps {
  enabled: boolean;
  value: string;
  onToggle: (enabled: boolean) => void;
  onChange: (value: string) => void;
  /** Disable the controls while a run is in flight. */
  disabled?: boolean;
  className?: string;
}

export function CustomInputPanel({
  enabled,
  value,
  onToggle,
  onChange,
  disabled = false,
  className = '',
}: CustomInputPanelProps) {
  const id = useId();

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          id={id}
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'inherit' }}
        />
        Test against custom input
      </label>

      {enabled && (
        <textarea
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="Standard input — one value per line"
          rows={4}
          style={{
            width: '100%',
            resize: 'vertical',
            minHeight: 72,
            padding: '8px 10px',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}

export default CustomInputPanel;
