/**
 * Single source of truth for Claude model IDs and the per-surface
 * defaults Camora uses. The user's Lumora Settings UI reads from this
 * registry; their explicit choice is sent on every /solve and /stream
 * request so the backend honors it without redeploying.
 *
 * Keeping the IDs here means a model bump only touches this file.
 */

export interface ClaudeModelInfo {
  /** API ID sent to Anthropic. */
  id: string;
  /** Short label for the picker. */
  label: string;
  /** One-line description shown in the picker. */
  description: string;
  /** Approximate streaming speed (tokens/second) for UI hints. */
  tokensPerSecond: number;
  /** Relative cost tier — for the "$"/"$$"/"$$$" hint in the picker. */
  costTier: 1 | 2 | 3;
}

export const CLAUDE_MODELS: ClaudeModelInfo[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Haiku 4.5',
    description: 'Fastest. Best for live interview latency. Default for coding & behavioral.',
    tokensPerSecond: 300,
    costTier: 1,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    description: 'Balanced quality and speed. Default for system design and prep packets.',
    tokensPerSecond: 130,
    costTier: 2,
  },
  {
    id: 'claude-opus-4-7',
    label: 'Opus 4.7',
    description: 'Highest quality. Slowest and most expensive — use only when accuracy beats speed.',
    tokensPerSecond: 80,
    costTier: 3,
  },
];

/**
 * Camora-recommended defaults per surface. The settings UI offers these
 * as the "Default" radio choice; user can override per-surface or set a
 * custom ID for any surface.
 */
export const DEFAULT_MODELS = {
  coding: 'claude-haiku-4-5-20251001',
  behavioral: 'claude-haiku-4-5-20251001',
  design: 'claude-sonnet-4-6',
  prep: 'claude-sonnet-4-6',
} as const;

export type ModelSurface = keyof typeof DEFAULT_MODELS;

export function isKnownModelId(id: string): boolean {
  return CLAUDE_MODELS.some((m) => m.id === id);
}
