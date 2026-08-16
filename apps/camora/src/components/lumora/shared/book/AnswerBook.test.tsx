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

  // The two-column layout is a container query in globals.css, so it cannot be
  // asserted here — but the span decision is component logic and IS the part
  // that rots silently: add a new wide block kind, forget WIDE_BLOCKS, and its
  // section quietly renders at half width in production only.
  describe('column spanning', () => {
    const withBlock = (block: BookDoc['sections'][0]['blocks'][0]): BookDoc => ({
      sections: [{ id: 's', heading: 'S', blocks: [block] }],
    });

    it('spans a section containing code across both columns', () => {
      const { container } = render(<AnswerBook doc={withBlock({ kind: 'code', lang: 'python', code: 'x = 1' })} />);
      expect(container.querySelector('section')).toHaveClass('lumora-book-span');
    });

    it('leaves prose sections in a single column', () => {
      const { container } = render(<AnswerBook doc={withBlock({ kind: 'prose', text: 'hello' })} />);
      expect(container.querySelector('section')).not.toHaveClass('lumora-book-span');
    });

    // Follow-up Q&A is a kv block like Complexity, so block kind alone cannot
    // tell them apart — it spans by section id. Left in a column it rendered as
    // a tall narrow ribbon with the neighbouring cell empty, because it is also
    // the last section.
    it('spans follow-up Q&A, whose kv values are spoken answers not tokens', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'followup', heading: 'Follow-up Q&A', blocks: [
          { kind: 'kv', pairs: [['What if the text is huge?', 'I would switch to KMP.']], layout: 'rows' },
        ]},
      ] }} />);
      expect(container.querySelector('section')).toHaveClass('lumora-book-span');
    });

    // The bound and the line-by-line that earns it must read in sequence, not
    // sit side by side in two columns — so they share one grid cell.
    it('stacks complexity and walkthrough in a single cell, in order', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'approach', heading: 'Solution', blocks: [{ kind: 'prose', text: 'x' }] },
        { id: 'complexity', heading: 'Complexity', blocks: [{ kind: 'kv', pairs: [['Time', 'O(n)']] }] },
        { id: 'walkthrough', heading: 'Walkthrough', blocks: [{ kind: 'walk', rows: [{ line: 1, explanation: 'e' }] }] },
      ] }} />);
      const stack = container.querySelector('.lumora-book-stack')!;
      expect(stack).toBeTruthy();
      const headings = [...stack.querySelectorAll('h2')].map(h => h.textContent);
      expect(headings).toEqual(['Complexity', 'Walkthrough']);
      // and they are not ALSO emitted as their own grid cells
      expect(container.querySelectorAll('.lumora-book-grid > section')).toHaveLength(1);
    });

    it('still renders the pair when only one of the two is present', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'complexity', heading: 'Complexity', blocks: [{ kind: 'kv', pairs: [['Time', 'O(n)']] }] },
      ] }} />);
      expect(container.querySelector('.lumora-book-stack h2')?.textContent).toBe('Complexity');
    });

    it('leaves the complexity kv in a column', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'complexity', heading: 'Complexity', blocks: [{ kind: 'kv', pairs: [['Time', 'O(n)']] }] },
      ] }} />);
      expect(container.querySelector('section')).not.toHaveClass('lumora-book-span');
    });

    it('columns the trace and walkthrough — they are the longest sections', () => {
      // Exempting these would have surrendered most of the vertical saving.
      const trace = render(<AnswerBook doc={withBlock({ kind: 'trace', rows: [{ step: 1, action: 'a', state: 's' }] })} />);
      expect(trace.container.querySelector('section')).not.toHaveClass('lumora-book-span');

      const walk = render(<AnswerBook doc={withBlock({ kind: 'walk', rows: [{ line: 1, code: 'x', explanation: 'e' }] })} />);
      expect(walk.container.querySelector('section')).not.toHaveClass('lumora-book-span');
    });
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

  it('renders inline `code` spans in prose as <code>', () => {
    const { container } = render(<AnswerBook doc={{ sections: [
      { id: 'approach', heading: 'Solution', blocks: [{ kind: 'prose', text: 'call `foo()` here' }] },
    ] }} />);
    const codes = container.querySelectorAll('p code');
    expect(codes).toHaveLength(1);
    expect(codes[0].textContent).toBe('foo()');
  });

});
