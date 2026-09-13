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

  it('renders one paragraph per blank-line-separated block', () => {
    const { container } = render(<ConceptSections sections={[
      { heading: 'Two parts', body: 'First paragraph.\n\nSecond paragraph.' },
    ]} />);
    const paras = container.querySelectorAll('p');
    expect(paras).toHaveLength(2);
    expect(paras[0]).toHaveTextContent('First paragraph.');
    expect(paras[1]).toHaveTextContent('Second paragraph.');
  });

  it('renders a single paragraph body as one p element', () => {
    const { container } = render(<ConceptSections sections={[
      { heading: 'One part', body: 'Only one paragraph here, even with. Two sentences.' },
    ]} />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('renders the optional code block when a section has one', () => {
    render(<ConceptSections sections={[
      { heading: 'Packing', body: 'Commas make the tuple.', code: 'point = 1, 2' },
    ]} />);
    expect(screen.getByText('point = 1, 2')).toBeInTheDocument();
  });
});
