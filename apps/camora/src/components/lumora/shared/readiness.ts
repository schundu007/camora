/**
 * Prerequisite checks for the Lumora tools.
 *
 * Two severities, and only one of them blocks:
 *   blocking  — the tool cannot run. Primary button disabled.
 *   degrading — the tool runs, silently worse. Button turns amber, never disables.
 *
 * Nothing here ever blocks mid-session. A modal that interrupts a live interview
 * to say "you forgot your resume" is worse than no gate at all.
 */

export type Severity = 'blocking' | 'degrading';

export interface Check {
  id: string;
  label: string;
  /** What actually goes wrong. Naming the consequence is the point of the gate. */
  consequence: string;
  severity: Severity;
  satisfied: boolean;
}

/**
 * Mirrors hasStdinEvidence() + hasExampleEvidence() in
 * apps/lumora-backend/src/routes/coding.js. That file is the SOURCE OF TRUTH.
 *
 * This copy exists because the gate must warn before the request is sent, so
 * the client cannot ask the server. readiness.test.ts and ioContract.test.js
 * share fixture strings so drift is caught.
 */
export function hasIoEvidence(problem: string): boolean {
  const t = typeof problem === 'string' ? problem : '';
  const stdin =
    /(^|\n)\s*(input|output)\s+format\b/i.test(t) ||
    /(^|\n)\s*sample\s+(input|output)\b/i.test(t) ||
    /\bstdin\b|\bstandard input\b/i.test(t) ||
    /\bthe first line contains\b/i.test(t) ||
    // Subject-anchored: the PROGRAM prints, not the reader. A bare
    // /\bprints?\b.{0,40}\boutput\b/ fires on "Print the output of the
    // following program." — an output-prediction quiz, not a stdin contract.
    /\bprints?\b[^.\n]{0,40}\bto\s+(stdout|standard\s+output)\b/i.test(t) ||
    /\b(your|the)\s+(program|solution|script|function)\b[^.\n]{0,60}\bprints?\b/i.test(t);
  if (stdin) return true;
  if (/\bclass\s+Solution\b/.test(t)) return true;
  if (/(^|\n)\s*example\s*\d*\s*:/i.test(t)) return true;
  return /(^|\n)\s*input\s*:/i.test(t) && /(^|\n)\s*output\s*:/i.test(t);
}

export function codingChecks(input: {
  problemText: string;
  starterCode: string | null;
  company: string | null;
}): Check[] {
  const problem = (input.problemText || '').trim();
  return [
    {
      id: 'problem',
      label: 'Problem captured',
      consequence: 'Nothing to solve.',
      severity: 'blocking',
      satisfied: problem.length > 0,
    },
    {
      id: 'io-contract',
      label: 'Input / output format',
      consequence: 'Solve will invent an I/O contract — an output format the grader never asked for.',
      severity: 'degrading',
      // Starter code IS the contract, so it satisfies this check on its own.
      satisfied: Boolean(input.starterCode?.trim()) || hasIoEvidence(problem),
    },
    {
      id: 'starter',
      label: 'Starter template',
      consequence: "Solve will write from scratch instead of filling the platform's locked stub.",
      severity: 'degrading',
      satisfied: Boolean(input.starterCode?.trim()),
    },
    {
      id: 'company',
      label: 'Company',
      consequence: 'Answers stay generic — no resume story anchor, no role framing.',
      severity: 'degrading',
      satisfied: Boolean(input.company?.trim()),
    },
  ];
}

export function cofixChecks(input: {
  inputCode: string;
  problemContext: string;
  company: string | null;
}): Check[] {
  return [
    {
      id: 'code',
      label: 'Broken code',
      consequence: 'Nothing to fix.',
      severity: 'blocking',
      // Mirrors the existing disabled= guard at CoFixLayout.tsx:1009.
      satisfied: (input.inputCode || '').trim().length >= 5,
    },
    {
      id: 'problem',
      label: 'Problem statement',
      consequence: 'Fix will guess what the stub should compute.',
      severity: 'degrading',
      satisfied: (input.problemContext || '').trim().length > 0,
    },
    {
      id: 'company',
      label: 'Company',
      consequence: 'Answers stay generic — no resume story anchor, no role framing.',
      severity: 'degrading',
      satisfied: Boolean(input.company?.trim()),
    },
  ];
}

export function summarize(
  checks: Check[],
  dismissed: ReadonlySet<string>,
): { blocking: Check[]; degrading: Check[]; ready: boolean } {
  const unmet = checks.filter((c) => !c.satisfied);
  // A blocking check is never dismissible. Only degrading checks honour the set.
  const blocking = unmet.filter((c) => c.severity === 'blocking');
  const degrading = unmet.filter((c) => c.severity === 'degrading' && !dismissed.has(c.id));
  return { blocking, degrading, ready: blocking.length === 0 && degrading.length === 0 };
}
