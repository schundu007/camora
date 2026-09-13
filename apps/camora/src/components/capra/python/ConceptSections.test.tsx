import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConceptSections from './ConceptSections';

describe('ConceptSections', () => {
  it('renders nothing when there are no sections', () => {
    const { container } = render(<ConceptSections sections={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a heading and body for each section', () => {
    render(<ConceptSections sections={[
      { heading: 'Why tuples exist', body: 'A tuple is a fixed record.' },
      { heading: 'The trailing comma', body: 'One item needs a comma.' },
    ]} />);
    expect(screen.getByText('Why tuples exist')).toBeInTheDocument();
    expect(screen.getByText('A tuple is a fixed record.')).toBeInTheDocument();
    expect(screen.getByText('The trailing comma')).toBeInTheDocument();
  });

  it('renders the optional code block when a section has one', () => {
    render(<ConceptSections sections={[
      { heading: 'Packing', body: 'Commas make the tuple.', code: 'point = 1, 2' },
    ]} />);
    expect(screen.getByText('point = 1, 2')).toBeInTheDocument();
  });
});
