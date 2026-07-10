import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerBook } from './AnswerBook';
import type { BookDoc } from '@/lib/lumora/book-model';

const doc: BookDoc = {
  sections: [
    { id: 'approach', heading: 'Solution', blocks: [
      { kind: 'prose', text: 'Two pointers converge.' },
      { kind: 'callout', label: 'Key points', items: ['One pass'] },
    ]},
    { id: 'complexity', heading: 'Complexity', blocks: [
      { kind: 'kv', pairs: [['Time', 'O(n)']] },
    ]},
  ],
};

describe('AnswerBook', () => {
  it('renders one column, not one card per section', () => {
    const { container } = render(<AnswerBook doc={doc} />);
    expect(container.querySelectorAll('.lumora-book')).toHaveLength(1);
  });

  it('renders section headings as tier-1 headings', () => {
    render(<AnswerBook doc={doc} />);
    expect(screen.getByRole('heading', { name: 'Solution' })).toHaveClass('lumora-book-section');
  });

  it('renders a callout with its label and items', () => {
    render(<AnswerBook doc={doc} />);
    expect(screen.getByText('Key points')).toBeTruthy();
    expect(screen.getByText('One pass')).toBeTruthy();
  });

  it('renders kv pairs', () => {
    render(<AnswerBook doc={doc} />);
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('O(n)')).toBeTruthy();
  });

  it('creates no nested scroll containers', () => {
    const { container } = render(<AnswerBook doc={doc} />);
    expect(container.querySelectorAll('.overflow-y-auto')).toHaveLength(0);
  });

  it('renders nothing for an empty doc', () => {
    const { container } = render(<AnswerBook doc={{ sections: [] }} />);
    expect(container.querySelector('.lumora-book')?.children.length ?? 0).toBe(0);
  });
});
