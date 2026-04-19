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

/** Status states for the interview flow */
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

/** Shared navigation links used by SiteNav and SiteFooter */
export const NAV_LINKS = [
  { label: 'Summit', href: '/jobs' },
  { label: 'Frost Prep', href: '/capra/prepare' },
  { label: 'Thaw', href: '/capra/practice' },
  { label: 'Blizzard', href: '/lumora' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Avalanche', href: '/challenge' },
];

/** Challenge campaign dates */
export const CHALLENGE_END = new Date('2026-10-07T23:59:59Z');
