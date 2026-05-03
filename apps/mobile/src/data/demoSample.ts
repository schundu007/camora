/**
 * Bundled sample for App Store / Play Store reviewers (and curious free-tier
 * users) so the Live Notes tab always has a working demonstration even when
 * the backend returns 402 / 429 / 5xx.
 *
 * The sample is a fixed transcript + library-context payload, not a real
 * recording. Tapping "Try a sample" on the Live tab plays this through the
 * exact same UI a successful real call would render.
 */

import type { SonaAnswer } from '@/lib/sona';

export const SAMPLE_TRANSCRIPT =
  'What is dynamic programming and when would you use it?';

export const SAMPLE_ANSWER: SonaAnswer = {
  parsed: {
    summary:
      'Dynamic programming is memoised recursion that you eventually flatten into iteration. Use it when a problem has overlapping subproblems and an optimal substructure.',
    sections: [
      {
        title: 'Define the state',
        content:
          'Write the state in plain English first — "dp[i][j] = the answer to the subproblem starting at i with budget j." Most DP bugs come from a fuzzy state definition.',
      },
      {
        title: 'Write the recurrence',
        content:
          'Express dp[i][j] in terms of smaller subproblems. Draw the dependency graph if it is not obvious which cells dp[i][j] depends on.',
      },
      {
        title: 'Order the iteration',
        content:
          'Compute each cell only after the cells it reads are filled. For 2-D DPs this typically means iterating one axis from high to low and the other from low to high.',
      },
      {
        title: 'Common pattern',
        content:
          'When asked about space, almost every 2-D DP can be reduced to two rows (current + previous) since dp[i] only reads dp[i-1].',
      },
    ],
  },
  raw:
    'Dynamic programming is memoised recursion that you eventually flatten into iteration. Use it when a problem has overlapping subproblems and an optimal substructure. ' +
    'Three steps every time: define the state in plain English, write the recurrence, then order the iteration so each cell is computed after its dependencies. ' +
    'Most 2-D DPs can be reduced to O(n) space because dp[i] only reads dp[i-1].',
};
