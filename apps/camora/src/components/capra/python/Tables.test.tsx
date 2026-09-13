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
    const { container } = render(<CheatSheetTable rows={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders call, does and returns for each row', () => {
    render(<CheatSheetTable rows={[
      { call: 't.count(x)', does: 'Counts how many times x appears.', returns: 'int' },
    ]} />);
    expect(screen.getByText('t.count(x)')).toBeInTheDocument();
    expect(screen.getByText('Counts how many times x appears.')).toBeInTheDocument();
    expect(screen.getByText('int')).toBeInTheDocument();
  });
});
