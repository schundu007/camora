import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChapterNav from './ChapterNav';
import type { Topic } from '@/data/python';

const t = (id: string, chapter: Topic['chapter']): Topic => ({
  id, title: id, chapter, track: 'beginner', estimatedMins: 10,
  summary: 's', intro: 'i', cleanCode: 'c',
  walkthrough: [{ code: 'c', explain: 'e' }],
  examples: [{ label: 'l', code: 'c' }],
  edgeCases: ['e'], gotcha: 'g', tip: 'p',
});

const TOPICS = [t('variables', 'getting-started'), t('loops', 'getting-started'), t('lists', 'data-structures')];

describe('ChapterNav', () => {
  it('renders only chapters that have topics', () => {
    render(<ChapterNav topics={TOPICS} selectedId="variables" onSelect={vi.fn()} />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Data Structures')).toBeInTheDocument();
    expect(screen.queryByText('Standard Library & Tooling')).not.toBeInTheDocument();
  });

  it('expands the chapter holding the selected topic and collapses the others', () => {
    render(<ChapterNav topics={TOPICS} selectedId="variables" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /variables/ })).toBeVisible();
    // `lists` sits inside a chapter collapsed via the native `hidden` attribute,
    // which testing-library's default role query excludes from the accessible
    // tree entirely (not merely "found but hidden") — pass `hidden: true` to
    // still locate it, then assert on visibility separately.
    expect(screen.getByRole('button', { name: /lists/, hidden: true })).not.toBeVisible();
  });

  it('toggles a chapter open on click', async () => {
    const user = userEvent.setup();
    render(<ChapterNav topics={TOPICS} selectedId="variables" onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Data Structures/ }));
    expect(screen.getByRole('button', { name: /lists/ })).toBeVisible();
  });

  it('calls onSelect with the topic id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ChapterNav topics={TOPICS} selectedId="variables" onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /loops/ }));
    expect(onSelect).toHaveBeenCalledWith('loops');
  });
});
