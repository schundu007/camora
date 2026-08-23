import type { ReactNode } from 'react';

export interface ChipProps {
  children: ReactNode;
  variant?: 'default' | 'easy' | 'medium' | 'hard' | 'success' | 'warning' | 'danger' | 'gold';
  className?: string;
  title?: string;
}

const variantStyles: Record<NonNullable<ChipProps['variant']>, string> = {
  default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]',
  easy: 'bg-[#1E4D78] text-white',
  medium: 'bg-[#D4A043] text-white',
  hard: 'bg-[#DC2626] text-white',
  success: 'bg-[#1E4D78] text-white',
  warning: 'bg-[#D4A043] text-white',
  danger: 'bg-[#DC2626] text-white',
  gold: 'bg-[var(--accent-subtle)] text-[var(--accent-text)] border border-[var(--accent)]/20',
};

export default function Chip({ children, variant = 'default', className = '', title }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold font-mono uppercase tracking-wider leading-none ${variantStyles[variant]} ${className}`}
      data-tip={title}
    >
      {children}
    </span>
  );
}
