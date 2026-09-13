import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeyTermsTable from './KeyTermsTable';
import CheatSheetTable from './CheatSheetTable';

describe('KeyTermsTable', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<KeyTermsTable terms={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a row per term', () => {
    render(<KeyTermsTable terms={[
      { term: 'Immutable', meaning: 'Cannot be changed after creation.' },
      { term: 'Hashable',  meaning: 'Usable as a dictionary key.' },
    ]} />);
    expect(screen.getByText('Immutable')).toBeInTheDocument();
    expect(screen.getByText('Usable as a dictionary key.')).toBeInTheDocument();
  });
});

describe('CheatSheetTable', () => {
  it('renders nothing when undefined', () => {
    const { container } = render(<CheatSheetTable tables={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every table is empty', () => {
    const { container } = render(<CheatSheetTable tables={[{ rows: [] }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders call, does and returns for each row', () => {
    render(<CheatSheetTable tables={[{ rows: [
      { call: 't.count(x)', does: 'Counts how many times x appears.', returns: 'int' },
    ] }]} />);
    expect(screen.getByText('t.count(x)')).toBeInTheDocument();
    expect(screen.getByText('Counts how many times x appears.')).toBeInTheDocument();
    expect(screen.getByText('int')).toBeInTheDocument();
  });

  it('falls back to Call / Does / Returns headers when a table declares no columns', () => {
    render(<CheatSheetTable tables={[{ rows: [
      { call: 't.index(x)', does: 'Finds the first x.', returns: 'int' },
    ] }]} />);
    expect(screen.getByRole('columnheader', { name: 'Call' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Does' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Returns' })).toBeInTheDocument();
  });

  it('uses custom column headers when a table declares them', () => {
    render(<CheatSheetTable tables={[{
      columns: ['Mode', 'Opens for', 'Missing file'],
      rows: [{ call: 'r', does: 'Reading text.', returns: 'FileNotFoundError' }],
    }]} />);
    expect(screen.getByRole('columnheader', { name: 'Mode' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Opens for' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Missing file' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Call' })).not.toBeInTheDocument();
  });

  it('renders a table title as a subheading', () => {
    render(<CheatSheetTable tables={[{
      title: 'File modes',
      rows: [{ call: 'w', does: 'Truncates then writes.', returns: 'file object' }],
    }]} />);
    expect(screen.getByRole('heading', { name: 'File modes' })).toBeInTheDocument();
  });

  it('stacks two tables inside one card', () => {
    render(<CheatSheetTable tables={[
      { title: 'Methods', rows: [{ call: 't.count(x)', does: 'Counts x.', returns: 'int' }] },
      {
        title: 'Regex metacharacters',
        columns: ['Pattern', 'Matches', 'Example'],
        rows: [{ call: '\\d+', does: 'One or more digits.', returns: '"42" in "a42"' }],
      },
    ]} />);
    // One card, one "Cheat Sheet" label, two tables inside it.
    expect(screen.getAllByText('Cheat Sheet')).toHaveLength(1);
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Methods' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Regex metacharacters' })).toBeInTheDocument();
    expect(screen.getByText('t.count(x)')).toBeInTheDocument();
    expect(screen.getByText('\\d+')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Call' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Pattern' })).toBeInTheDocument();
  });
});
