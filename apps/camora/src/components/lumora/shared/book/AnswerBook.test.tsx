import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders a code block with its source text', () => {
    const { container } = render(<AnswerBook doc={{ sections: [
      { id: 'code', heading: 'Code', blocks: [{ kind: 'code', lang: 'python', code: 'print(42)' }] },
    ] }} />);
    // highlight.js splits the code into <span> children for syntax highlighting,
    // so assert on the concatenated textContent rather than a single text node.
    expect(container.querySelector('code')?.textContent).toBe('print(42)');
  });

  it('fires walk callbacks with (line, code, index) even when line is absent', () => {
    const onClick = vi.fn();
    render(<AnswerBook onLineClick={onClick} doc={{ sections: [
      { id: 'walkthrough', heading: 'Walkthrough', blocks: [
        { kind: 'walk', rows: [{ code: 'words = s.split()', explanation: 'split' }] },
      ]},
    ] }} />);
    fireEvent.click(screen.getByText('split'));
    expect(onClick).toHaveBeenCalledWith(undefined, 'words = s.split()', 0);
  });

  it('renders doc.title as a lead heading when present', () => {
    render(<AnswerBook doc={{ title: 'Two Pointers', sections: [
      { id: 'approach', heading: 'Solution', blocks: [{ kind: 'prose', text: 'x' }] },
    ] }} />);
    expect(screen.getByRole('heading', { name: 'Two Pointers' })).toHaveClass('lumora-book-section');
  });

  it('renders no lead heading when doc.title is absent', () => {
    const { container } = render(<AnswerBook doc={{ sections: [
      { id: 'approach', heading: 'Solution', blocks: [{ kind: 'prose', text: 'x' }] },
    ] }} />);
    // only the section h2 heading, no extra lead h1
    expect(container.querySelectorAll('h1')).toHaveLength(0);
  });
});
