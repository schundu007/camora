/** Block types returned by the answer parser */
export const BlockType = {
  HEADLINE: 'HEADLINE',
  ANSWER: 'ANSWER',
  CODE: 'CODE',
  DIAGRAM: 'DIAGRAM',
  FOLLOWUP: 'FOLLOWUP',
  // Design-specific
  REQUIREMENTS: 'REQUIREMENTS',
  SCALEMATH: 'SCALEMATH',
  DEEPDESIGN: 'DEEPDESIGN',
  TRADEOFFS: 'TRADEOFFS',
  EDGECASES: 'EDGECASES',
  // Coding-specific
  PROBLEM: 'PROBLEM',
  APPROACH: 'APPROACH',
  COMPLEXITY: 'COMPLEXITY',
  WALKTHROUGH: 'WALKTHROUGH',
  TESTCASES: 'TESTCASES',
} as const;

export type BlockTypeValue = (typeof BlockType)[keyof typeof BlockType];

/** Design block types for detection */
export const DESIGN_BLOCK_TYPES: BlockTypeValue[] = [
  BlockType.REQUIREMENTS,
  BlockType.SCALEMATH,
  BlockType.DEEPDESIGN,
  BlockType.TRADEOFFS,
];

/** Coding block types for detection */
export const CODING_BLOCK_TYPES: BlockTypeValue[] = [
  BlockType.PROBLEM,
  BlockType.APPROACH,
  BlockType.COMPLEXITY,
  BlockType.WALKTHROUGH,
  BlockType.TESTCASES,
];

/** Status states for the session flow */
export const StatusState = {
  IDLE: 'idle',
  READY: 'ready',
  LISTEN: 'listen',
  TRANSCRIBE: 'transcribe',
  SEARCH: 'search',
  WRITE: 'write',
  ERROR: 'error',
  WARN: 'warn',
} as const;

export type StatusStateValue = (typeof StatusState)[keyof typeof StatusState];

/** Input validation limits */
export const INPUT_LIMITS = {
  MAX_QUESTION_LENGTH: 10000,
  MIN_QUESTION_LENGTH: 3,
} as const;

/**
 * Every block/section tag the models emit — the SINGLE source for the
 * tag-strip regexes so they can't drift (they previously diverged across
 * text-utils and companion/text-formatting, leaking whichever tags one list
 * was missing). EDGE_?CASES matches both EDGECASES and EDGE_CASES.
 */
export const BLOCK_TAG_NAMES = [
  'HEADLINE', 'ANSWER', 'REQUIREMENTS', 'NON-FUNCTIONAL', 'FUNCTIONAL', 'SCALEMATH', 'SCALE',
  'ARCHITECTURE', 'COMPONENTS', 'DEEPDESIGN', 'DEEP_DIVE', 'TRADEOFFS', 'EDGE_?CASES', 'SUMMARY',
  'CODE', 'DIAGRAM', 'TESTCASES', 'COMPLEXITY', 'WALKTHROUGH', 'FOLLOWUP', 'PROBLEM', 'APPROACH',
  'API_DESIGN', 'DATA_MODEL', 'MONITORING', 'PITCH', 'JD_COVERAGE',
] as const;

/** Fresh regex (stateful /g) matching a leaked block tag: [CODE], [/HEADLINE], [CODE lang=python]. */
export const blockTagStripRe = () =>
  new RegExp(`\\[\\/?\\s*(?:${BLOCK_TAG_NAMES.join('|')})(?:\\s+lang=[\\w-]+)?\\s*\\]`, 'gi');

/** Shared navigation links used by SiteNav and SiteFooter */
export const NAV_LINKS = [
  { label: 'Apply', href: '/jobs' },
  { label: 'Prepare', href: '/capra/prepare' },
  { label: 'Practice', href: '/capra/practice' },
  { label: 'Attend', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
];
