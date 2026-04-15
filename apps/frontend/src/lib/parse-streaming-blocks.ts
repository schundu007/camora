/**
 * Shared streaming block parser — used by StreamingAnswer and FollowUpPopup.
 * Parses [TYPE]content[/TYPE] blocks from Claude's streaming output.
 */

export interface StreamingBlock {
  type: string;
  content: string;
  isComplete: boolean;
}

export function parseStreamingBlocks(content: string): Record<string, StreamingBlock> {
  const blocks: Record<string, StreamingBlock> = {};

  // Match complete blocks [TYPE]...[/TYPE]
  const completeRegex = /\[(\w+)\]([\s\S]*?)\[\/\1\]/g;
  let match;
  while ((match = completeRegex.exec(content)) !== null) {
    const type = match[1].toUpperCase();
    blocks[type] = { type, content: match[2].trim(), isComplete: true };
  }

  // Match incomplete blocks [TYPE]... (no closing tag yet)
  const incompleteRegex = /\[(\w+)\](?![\s\S]*?\[\/\1\])([\s\S]*)$/;
  const incompleteMatch = content.match(incompleteRegex);
  if (incompleteMatch) {
    const type = incompleteMatch[1].toUpperCase();
    if (!blocks[type]) {
      blocks[type] = { type, content: incompleteMatch[2].trim(), isComplete: false };
    }
  }

  return blocks;
}
