/**
 * Strip markdown artifacts from Claude response text.
 */
export function cleanText(s: string): string {
  return (s || '')
    .replace(/^#{1,4}\s+.*$/gm, '')
    .replace(/^\s*[-*]{3,}\s*$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    // Strip block tags from AI responses (HEADLINE, REQUIREMENTS, etc.)
    .replace(/\[?\/?(?:HEADLINE|REQUIREMENTS|FUNCTIONAL|NON-FUNCTIONAL|SCALE|ARCHITECTURE|COMPONENTS|DEEP_DIVE|TRADEOFFS|EDGE_?CASES|SUMMARY|CODE|TESTCASES|COMPLEXITY|WALKTHROUGH|FOLLOWUP|API_DESIGN|DATA_MODEL|MONITORING)\]?/gi, '')
    .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough markdown
    .trim();
}
