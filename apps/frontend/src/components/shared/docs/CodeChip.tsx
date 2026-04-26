import { ReactNode } from 'react';

export interface CodeChipProps {
  children: ReactNode;
  /** Inline = small pill, block = standalone tag. Default "inline". */
  size?: 'inline' | 'block';
  className?: string;
}

/**
 * Compact monospace pill for inline technical terms (`apt`, `pip`, `nvidia-smi`).
 * Smaller and tighter than the default <code> styling.
 */
export default function CodeChip({
  children,
  size = 'inline',
  className = '',
}: CodeChipProps) {
  const padding = size === 'block' ? 'px-2 py-0.5' : 'px-1.5 py-px';
  const fontSize = size === 'block' ? 'text-[12.5px]' : 'text-[12px]';
  return (
    <code
      className={`inline-flex items-center ${padding} ${fontSize} font-mono rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] leading-snug whitespace-nowrap ${className}`}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </code>
  );
}
