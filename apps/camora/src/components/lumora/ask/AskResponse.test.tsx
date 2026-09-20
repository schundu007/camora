import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AskResponse } from './AskLayout';

/**
 * The Ask renderer is a hand-rolled markdown subset, so a table is only a table
 * if this parser says so. A family question ("explain 4xx and 5xx") now comes
 * back as a pipe table — ten codes as ten bullets was the wall of text the
 * candidate could not read mid-interview. If the parser misses, the answer
 * degrades to raw `|` characters on screen, which is worse than the bullets it
 * replaced. Hence: assert the DOM table, not the markdown.
 */
describe('AskResponse tables', () => {
  const TABLE = `### Then say
**The split** — 4xx caller sent something wrong; 5xx my server broke.

| Code | Who emits it | What's actually wrong |
|---|---|---|
| **502** | proxy, about my app | app crashed mid-response |
| **504** | proxy, about my app | read timeout fired first |

**401 vs 403** — 401 is "who are you"; 403 is "I know you, you still can't".`;

  it('renders a pipe table as a real table with header and rows', () => {
    const { container } = render(<AskResponse content={TABLE} />);
    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table!.querySelectorAll('thead th')).toHaveLength(3);
    expect(table!.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(screen.getByText('502')).toBeTruthy();
    expect(screen.getByText('read timeout fired first')).toBeTruthy();
  });

  it('keeps the lines around the table as ordinary content', () => {
    render(<AskResponse content={TABLE} />);
    expect(screen.getByText(/caller sent something wrong/)).toBeTruthy();
    expect(screen.getByText(/I know you, you still can't/)).toBeTruthy();
  });

  it('leaves a lone piped line alone when no |---| rule follows', () => {
    const { container } = render(
      <AskResponse content={'### Answer\n| this is not a table |'} />,
    );
    expect(container.querySelector('table')).toBeNull();
  });

  it('still renders bullets and code blocks', () => {
    const { container } = render(
      <AskResponse content={'### Answer\n- first bullet\n- second bullet\n\n```bash\nkubectl get pods\n```'} />,
    );
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('pre')).not.toBeNull();
  });
});

// The layout the screenshot asked for, and the three rendering bugs it exposed.
describe('AskResponse anchor rail', () => {
  const ANSWER = [
    '**In short** — `kubectl apply` sends the YAML to the API server.',
    '**The path**',
    '- **kubectl apply** — reads main.yaml locally.',
    '- **HTTP POST** — sends the YAML to the API server.',
    '- **API server** — authenticates, authorizes, validates.',
    '**The catch** — it is declarative; it describes the *desired* state.',
  ].join('\n');

  it('puts the anchors in a description list', () => {
    const { container } = render(<AskResponse content={ANSWER} />);
    expect(container.querySelector('dl')).not.toBeNull();
    expect([...container.querySelectorAll('dt')].map((n) => n.textContent))
      .toEqual(['In short', 'The path', 'The catch']);
  });

  it('numbers a block whose children each name a step, and only that block', () => {
    const { container } = render(<AskResponse content={ANSWER} />);
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    expect(ol!.querySelectorAll('li')).toHaveLength(3);
    // "The catch" is a single line, so it is not a list at all.
    expect(container.querySelectorAll('ol')).toHaveLength(1);
  });

  it('renders *italic* instead of printing its asterisks', () => {
    const { container } = render(<AskResponse content={ANSWER} />);
    expect(container.querySelector('em')?.textContent).toBe('desired');
    expect(container.textContent).not.toContain('*desired*');
  });

  it('does not print markup when the model prefixes ### to an anchor line', () => {
    // This is the screenshot: the title path used to emit its text raw, so the
    // whole sentence arrived as a shouting heading with ** and ` intact.
    const { container } = render(
      <AskResponse content={'### **In short** — `kubectl apply` persists desired state.'} />,
    );
    expect(container.textContent).not.toContain('**');
    expect(container.textContent).not.toContain('`');
    expect(container.querySelector('dt')?.textContent).toBe('In short');
  });

  it('still renders a real "### If they push" heading as a heading', () => {
    const { container } = render(
      <AskResponse content={'**In short** — the answer.\n### If they push\n**Why** — because.'} />,
    );
    expect(container.textContent).toContain('If they push');
    expect(container.querySelectorAll('dt')).toHaveLength(2);
  });
});
