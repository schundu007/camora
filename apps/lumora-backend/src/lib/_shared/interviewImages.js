/**
 * Screenshot attachments for the Claude and Gemini tabs.
 *
 * Both tabs take the same brief and now take the same pictures: an interviewer
 * shares a diagram, a failing test, a log, and the fastest thing a candidate
 * can do is snap it rather than read it out. Neither tab could accept an image
 * at all — the routes mapped every message to a plain string — so the capture
 * button had nothing to send to and was never built.
 *
 * Pure and synchronous on purpose. Nothing here may sit between the request
 * and the first streamed token; archiving to R2 is a separate concern that
 * belongs off the critical path, which is why this module does not do it.
 *
 * MATCHED COPY, like interviewBrief.js:
 *   apps/lumora-backend/src/lib/_shared/interviewImages.js   (Claude tab)
 *   apps/ascend-backend/src/lib/_shared/interviewImages.js   (Gemini tab)
 * Edit both or neither.
 */

export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB each, before base64

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * `data:image/png;base64,iVBOR...` → { mimeType, data }, or null.
 *
 * Returns null rather than throwing for every rejection — an oversized or
 * unrecognised attachment should cost the candidate the picture, never the
 * answer. The caller filters nulls out and streams regardless.
 */
export function parseDataUrl(u) {
  if (typeof u !== 'string') return null;
  const m = u.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mimeType = m[1].toLowerCase();
  if (!ALLOWED_MIME.has(mimeType)) return null;
  const data = m[2];
  // Buffer.byteLength on a base64 string with the base64 encoding gives the
  // DECODED size, which is what the provider limits are about.
  if (!data || Buffer.byteLength(data, 'base64') > MAX_IMAGE_BYTES) return null;
  return { mimeType, data };
}

/** Accepted attachments, capped. */
export function parseImages(images) {
  if (!Array.isArray(images) || !images.length) return [];
  return images.map(parseDataUrl).filter(Boolean).slice(0, MAX_IMAGES);
}

/** Gemini `parts` for a user turn. */
export const toGeminiParts = (parsed) =>
  parsed.map(({ mimeType, data }) => ({ inlineData: { mimeType, data } }));

/** Anthropic content blocks for a user turn. */
export const toAnthropicBlocks = (parsed) =>
  parsed.map(({ mimeType, data }) => ({
    type: 'image',
    source: { type: 'base64', media_type: mimeType, data },
  }));

/**
 * Attach the pictures to the LAST user turn.
 *
 * The images belong to the question just asked, not to the conversation, and
 * both providers put them in the same turn as the text they illustrate. Images
 * go BEFORE the text: both providers document better results that way, and it
 * reads correctly too — here is the screen, now here is what I am asking about
 * it.
 *
 * `blocksFor` adapts the parsed attachments to whichever provider is calling,
 * and `wrapText` builds that provider's text part.
 */
export function attachToLastTurn(turns, parsed, { blocksFor, wrapText, contentKey }) {
  if (!parsed.length || !turns.length) return turns;
  const last = turns[turns.length - 1];
  if (last.role !== 'user') return turns;
  const text = contentKey === 'parts' ? last.parts[0].text : last.content;
  const blocks = [...blocksFor(parsed), wrapText(text)];
  if (contentKey === 'parts') last.parts = blocks;
  else last.content = blocks;
  return turns;
}
