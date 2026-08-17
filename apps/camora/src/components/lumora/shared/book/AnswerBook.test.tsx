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
    // The section under test comes FIRST and a filler follows it, so the two
    // fill a row. Without the filler every one of these docs would span for the
    // uninteresting reason — a lone cell is an orphan — and the block-kind rule
    // these tests exist to guard would go unchecked.
    const filler: BookDoc['sections'][0] =
      { id: 'problem', heading: 'Problem', blocks: [{ kind: 'prose', text: 'filler' }] };
    const withBlock = (block: BookDoc['sections'][0]['blocks'][0]): BookDoc => ({
      sections: [{ id: 's', heading: 'S', blocks: [block] }, filler],
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
        filler,
      ] }} />);
      expect(container.querySelector('section')).toHaveClass('lumora-book-span');
    });

    // Complexity and Walkthrough used to share a grid cell. Complexity now pairs
    // with the approach-comparison matrix instead, and Walkthrough spans alone,
    // so neither goes through a shared wrapper.
    it('gives complexity and walkthrough their own cells', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'complexity', heading: 'Complexity', blocks: [{ kind: 'kv', pairs: [['Time', 'O(n)']] }] },
        { id: 'walkthrough', heading: 'Walkthrough', blocks: [{ kind: 'walk', rows: [{ line: 1, explanation: 'e' }] }] },
      ] }} />);
      expect(container.querySelector('.lumora-book-stack')).toBeNull();
      const headings = [...container.querySelectorAll('.lumora-book-grid > section h2')].map(h => h.textContent);
      expect(headings).toEqual(['Complexity', 'Walkthrough']);
    });

    it('keeps complexity narrow so it can share a row', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'complexity', heading: 'Complexity', blocks: [{ kind: 'kv', pairs: [['Time', 'O(n)']] }] },
        { id: 'comparison', heading: 'Approach comparison', blocks: [{ kind: 'kv', pairs: [['a', 'b']] }] },
      ] }} />);
      const spanned = [...container.querySelectorAll('.lumora-book-span h2')].map(h => h.textContent);
      expect(spanned).toEqual([]);
    });

    // Edge cases was the section people saw it on: Follow-up Q&A spans, so it
    // cannot share Edge cases' row and pushes down, leaving Edge cases pinned
    // to the left column with dead space beside it.
    it('widens a section stranded alone on its row by the span that follows', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'signals', heading: 'Signals', blocks: [{ kind: 'prose', text: 'x' }] },
        { id: 'tradeoffs', heading: 'Tradeoffs', blocks: [{ kind: 'list', items: ['a'] }] },
        { id: 'edgecases', heading: 'Edge cases', blocks: [{ kind: 'list', items: ['empty input'] }] },
        { id: 'followup', heading: 'Follow-up Q&A', blocks: [{ kind: 'kv', pairs: [['q', 'a']], layout: 'rows' }] },
      ] }} />);
      const spanned = [...container.querySelectorAll('.lumora-book-span h2')].map(h => h.textContent);
      expect(spanned).toEqual(['Edge cases', 'Follow-up Q&A']);
    });

    it('widens a trailing section with no partner', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'signals', heading: 'Signals', blocks: [{ kind: 'prose', text: 'x' }] },
        { id: 'tradeoffs', heading: 'Tradeoffs', blocks: [{ kind: 'list', items: ['a'] }] },
        { id: 'edgecases', heading: 'Edge cases', blocks: [{ kind: 'list', items: ['empty input'] }] },
      ] }} />);
      const spanned = [...container.querySelectorAll('.lumora-book-span h2')].map(h => h.textContent);
      expect(spanned).toEqual(['Edge cases']);
    });

    it('widens a lone complexity card that has no row-mate', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'complexity', heading: 'Complexity', blocks: [{ kind: 'kv', pairs: [['Time', 'O(n)']] }] },
      ] }} />);
      expect(container.querySelector('section')).toHaveClass('lumora-book-span');
    });

    it('leaves paired cells alone', () => {
      const { container } = render(<AnswerBook doc={{ sections: [
        { id: 'signals', heading: 'Signals', blocks: [{ kind: 'prose', text: 'x' }] },
        { id: 'tradeoffs', heading: 'Tradeoffs', blocks: [{ kind: 'list', items: ['a'] }] },
      ] }} />);
      expect(container.querySelectorAll('.lumora-book-span')).toHaveLength(0);
    });

    it('columns the trace and walkthrough — they are the longest sections', () => {
      // Exempting these would have surrendered most of the vertical saving.
      const trace = render(<AnswerBook doc={withBlock({ kind: 'trace', rows: [{ step: 1, action: 'a', state: 's' }] })} />);
      expect(trace.container.querySelector('section')).not.toHaveClass('lumora-book-span');

      const walk = render(<AnswerBook doc={withBlock({ kind: 'walk', rows: [{ line: 1, code: 'x', explanation: 'e' }] })} />);
      expect(walk.container.querySelector('section')).not.toHaveClass('lumora-book-span');
    });
  });

  describe('approach comparison matrix', () => {
    const matrixDoc: BookDoc = { sections: [{ id: 'comparison', heading: 'Approach comparison', blocks: [
      { kind: 'matrix', activeIndex: 1, rows: [
        { name: 'Brute Force', pattern: 'Brute Force', time: 'O(n^2)', space: 'O(1)', timeWhy: 'nested loops', verdict: 'baseline', tleRisk: true, note: 'n reaches 1e5' },
        { name: 'Hash Map', pattern: 'Hash Map', time: 'O(n)', space: 'O(n)', verdict: 'best' },
      ]},
    ]}] };

    it('renders one row per approach with both bounds', () => {
      const { container } = render(<AnswerBook doc={matrixDoc} />);
      const rows = [...container.querySelectorAll('tbody tr')];
      expect(rows).toHaveLength(2);
      expect(rows[0].textContent).toContain('O(n^2)');
      expect(rows[0].textContent).toContain('O(1)');
    });

    it('badges the best approach and flags the TLE risk', () => {
      render(<AnswerBook doc={matrixDoc} />);
      expect(screen.getByText('Best')).toBeTruthy();
      expect(screen.getByText('Baseline')).toBeTruthy();
      expect(screen.getByText('TLE risk')).toBeTruthy();
    });

    it('marks the row the rest of the page is showing', () => {
      const { container } = render(<AnswerBook doc={matrixDoc} />);
      const active = [...container.querySelectorAll('tbody tr.is-active')];
      expect(active).toHaveLength(1);
      expect(active[0].textContent).toContain('Hash Map');
    });

    // Two sentences of derivation would swamp a column, so it rides the cell.
    it('hangs the derivation off the bound as a tooltip', () => {
      const { container } = render(<AnswerBook doc={matrixDoc} />);
      expect(container.querySelector('td[data-tip]')?.getAttribute('data-tip')).toBe('nested loops');
    });

    it('renders an em dash for a missing bound rather than an empty cell', () => {
      const { container } = render(<AnswerBook doc={{ sections: [{ id: 'comparison', heading: 'C', blocks: [
        { kind: 'matrix', rows: [{ name: 'Unknown' }, { name: 'Other' }] },
      ]}] }} />);
      expect(container.querySelectorAll('tbody td')[1].textContent).toBe('—');
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
