/**
 * Parse a JSON object that is still being streamed.
 *
 * The coding answer arrives as one large JSON document, and the card view only
 * appeared once the whole thing had landed — so a long answer looked like the app
 * had stalled, even though tokens were arriving the entire time. (The identification
 * trail and the four interview cards made the document bigger, which made the wait
 * worse.)
 *
 * This closes whatever is still open — an unterminated string, an unclosed array or
 * object — and parses the result, so the fields that HAVE arrived can render while
 * the rest is still coming. A partial value is dropped rather than shown half-formed:
 * the last, incomplete element of an array is discarded, so a code block never
 * renders mid-token.
 *
 * Returns null when there is not yet enough to parse.
 */
export function parsePartialJson(raw: string): any | null {
  if (!raw) return null;

  // Models often open with a fence or a sentence before the object.
  const start = raw.indexOf('{');
  if (start === -1) return null;
  const text = raw.slice(start);

  // Fast path: already complete.
  try { return JSON.parse(text); } catch { /* still streaming */ }

  // Walk the text tracking structure, so we know what to close and where the last
  // complete value ended.
  const stack: Array<'{' | '['> = [];
  let inString = false;
  let escaped = false;
  /** Index just past the last value that finished, at any depth. */
  let lastSafe = -1;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') {
        inString = false;
        lastSafe = i + 1;
      }
      continue;
    }

    if (c === '"') { inString = true; continue; }
    if (c === '{' || c === '[') { stack.push(c); continue; }
    if (c === '}' || c === ']') {
      stack.pop();
      lastSafe = i + 1;
      continue;
    }
    // A comma means everything before it is a finished value. Tracked at every
    // depth, not just the top: the useful early content (solutions[0].code) is
    // nested, so a top-level-only boundary cut the answer back to nothing.
    if (c === ',') lastSafe = i;
  }

  // Cut back to the last point where a value was complete, so a half-written
  // string or number never reaches the renderer.
  if (lastSafe > 0) {
    const cut = text.slice(0, lastSafe).replace(/,\s*$/, '');

    // First as-is: inside an array the trailing token is a finished VALUE and
    // must be kept (["a", "b" → ["a","b"]).
    const closed = closeOpenStructures(cut);
    if (closed) {
      try { return JSON.parse(closed); } catch { /* try the key-strip below */ }
    }

    // Otherwise the cut ended on an object KEY whose value has not arrived
    // ({"a": 1, "b" → {"a": 1}); dropping the key is what makes it parse.
    const withoutDanglingKey = cut.replace(/,?\s*"[^"]*"\s*:?\s*$/, '');
    const closed2 = closeOpenStructures(withoutDanglingKey);
    if (closed2) {
      try { return JSON.parse(closed2); } catch { /* fall through */ }
    }
  }

  const closed = closeOpenStructures(text.replace(/,\s*$/, ''));
  if (!closed) return null;
  try { return JSON.parse(closed); } catch { return null; }
}

/** Append the closing brackets a truncated document still needs. */
function closeOpenStructures(text: string): string | null {
  const stack: Array<'{' | '['> = [];
  let inString = false;
  let escaped = false;

  for (const c of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') stack.pop();
  }

  if (!stack.length && !inString) return text;

  let out = text;
  // An unterminated string would swallow the closers, so end it first.
  if (inString) out += '"';
  // A trailing key with no value ("approach": ) cannot be closed into valid JSON.
  out = out.replace(/,?\s*"[^"]*"\s*:\s*$/, '');
  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === '{' ? '}' : ']';
  return out;
}

/**
 * Is there enough of the answer to be worth rendering?
 *
 * Rendering an object with only `{"language":"python"}` produces an empty card
 * that then jumps around as content arrives, which reads worse than the spinner
 * it replaced. Wait for something a reader can actually use.
 */
export function hasRenderableAnswer(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  const sol = Array.isArray(parsed.solutions) ? parsed.solutions[0] : null;
  return Boolean(
    (sol && (sol.code || sol.approach || sol.name))
    || parsed.code
    || (parsed.mcq && Array.isArray(parsed.mcq.options) && parsed.mcq.options.length),
  );
}
