import { describe, it, expect } from 'vitest';
import { sentenceCaseAll } from './text-utils';

/* Book style: a sentence opens with a capital — every sentence, not just the
 * first one the model happened to write. */
describe('sentenceCaseAll', () => {
  it('capitalises every sentence in a paragraph', () => {
    expect(sentenceCaseAll('we scan once. then we return the pair.'))
      .toBe('We scan once. Then we return the pair.');
  });

  it('leaves identifiers and bounds in the case they were written', () => {
    expect(sentenceCaseAll('One pass. O(n) overall. `hits` stays a list.'))
      .toBe('One pass. O(n) overall. `hits` stays a list.');
  });

  it('does not split a bound mid-token', () => {
    expect(sentenceCaseAll('sorting costs O(n log n) here.')).toBe('Sorting costs O(n log n) here.');
  });
});
