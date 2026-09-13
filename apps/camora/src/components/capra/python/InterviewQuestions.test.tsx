import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InterviewQuestions from './InterviewQuestions';
import ReferenceLinks from './ReferenceLinks';

const QS = [
  { q: 'Is a tuple comprehension possible?', a: 'No. Parentheses produce a generator expression.' },
  { q: 'Why does (5) not make a tuple?',     a: 'The comma makes the tuple, not the parentheses.' },
];

describe('InterviewQuestions', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<InterviewQuestions questions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows every question with its answer collapsed', () => {
    render(<InterviewQuestions questions={QS} />);
    expect(screen.getByText('Is a tuple comprehension possible?')).toBeInTheDocument();
    expect(screen.getByText(QS[0].a)).not.toBeVisible();
  });

  it('reveals one answer on click without revealing the others', async () => {
    const user = userEvent.setup();
    render(<InterviewQuestions questions={QS} />);
    await user.click(screen.getByRole('button', { name: /tuple comprehension/i }));
    expect(screen.getByText(QS[0].a)).toBeVisible();
    expect(screen.getByText(QS[1].a)).not.toBeVisible();
  });

  it('collapses again on a second click', async () => {
    const user = userEvent.setup();
    render(<InterviewQuestions questions={QS} />);
    const btn = screen.getByRole('button', { name: /tuple comprehension/i });
    await user.click(btn);
    await user.click(btn);
    expect(screen.getByText(QS[0].a)).not.toBeVisible();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('ReferenceLinks', () => {
  it('renders nothing when undefined', () => {
    const { container } = render(<ReferenceLinks references={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each reference as an external link', () => {
    render(<ReferenceLinks references={[
      { label: 'Programiz — Python Tuple', url: 'https://www.programiz.com/python-programming/tuple' },
    ]} />);
    const link = screen.getByRole('link', { name: /Programiz/ });
    expect(link).toHaveAttribute('href', 'https://www.programiz.com/python-programming/tuple');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
