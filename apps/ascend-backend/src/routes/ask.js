import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '../services/adminConfig.js';
import { query } from '../config/database.js';
import { retrieveForAsk, formatContext, getCandidateBackground, createCitationStripper } from '../services/askRetrieval.js';
import { r2, R2_BUCKET } from '../lib/r2.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();

/**
 * Decide how much prior conversation to replay for this question.
 *
 * Ask Sona is not a chat: during an interview each question is usually
 * independent, and users paste whole question blocks. Replaying a long,
 * confident previous answer as context made the model reuse it verbatim
 * instead of answering the new question — the same answer came back for
 * different pastes.
 *
 * So: only carry history when the new message actually reads like a
 * follow-up. A standalone question drops it entirely, which removes the
 * text the model was latching onto.
 *
 * Heuristics, deliberately conservative — when in doubt we keep history,
 * because dropping it on a genuine follow-up ("what about the second one?")
 * is the more visible failure.
 */
// A real follow-up is short. Anything longer carries its own subject and
// doesn't need the previous turn — 120 chars comfortably covers "what about
// the second one?" while excluding a pasted interview question.
const FOLLOWUP_MAX_CHARS = 120;

// Opens by referring to something unstated: "what about X", "and the second",
// "expand on that", "why?". Anchored at the start — that's what distinguishes
// a follow-up from a standalone question.
const FOLLOWUP_RE = /^(and\b|but\b|also\b|what about\b|how about\b|why\b|expand\b|elaborate\b|continue\b|go on\b|more\b|that\b|this\b|it\b|those\b|these\b|the (first|second|third|last|previous)\b)/i;

// Back-references to a prior answer, wherever they appear — these are
// unambiguous ("you said", "the above") unlike a bare pronoun.
const EXPLICIT_REF_RE = /\b(the above|previous answer|you said|your answer|as mentioned)\b/i;

// A bare pronoun only implies a follow-up near the START of the message.
// Mid-sentence it almost always refers within the same sentence — "what have
// you done about it?" is standalone, and treating it as a follow-up was
// exactly the bug that leaked the previous answer.
const LEADING_PRONOUN_RE = /^.{0,40}?\b(that|those|it|this)\b/i;

export function conversationContext(history, currentMessage) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const msg = (currentMessage || '').trim();

  // Long pastes are self-contained question blocks, never follow-ups.
  if (msg.length > FOLLOWUP_MAX_CHARS) return [];

  const looksLikeFollowup =
    FOLLOWUP_RE.test(msg) ||
    EXPLICIT_REF_RE.test(msg) ||
    (msg.length <= 60 && LEADING_PRONOUN_RE.test(msg));
  if (!looksLikeFollowup) return [];

  // A genuine follow-up needs the immediately preceding exchange, not ten
  // turns of unrelated questions.
  return history.slice(-4);
}

// Screenshot attachments on an Ask message. Accepts data URLs from the
// client, caps count/size, uploads each to R2 (private bucket), and returns
// both the Gemini vision `parts` (inlineData) and the DB rows to persist.
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB per image
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function parseDataUrl(u) {
  if (typeof u !== 'string') return null;
  const m = u.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mimeType = m[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME.has(mimeType)) return null;
  const data = m[2];
  if (Buffer.byteLength(data, 'base64') > MAX_IMAGE_BYTES) return null;
  return { mimeType, data };
}

/** Decode attachments into Gemini vision parts. Pure and synchronous — nothing
 *  here should sit between the request and the first streamed token. */
function buildImageParts(images) {
  if (!Array.isArray(images) || !images.length) return [];
  return images.map(parseDataUrl).filter(Boolean).slice(0, MAX_IMAGES);
}

/**
 * Archive attachments to R2 and attach the keys to an already-written message
 * row. Deliberately NOT awaited by the stream handler: uploading up to 4×6 MB
 * to object storage was costing seconds of dead air before the model was even
 * called, and the model never needs the upload — it gets the bytes inline.
 * Purely a durability step for replaying history later.
 */
async function archiveImages(parsed, userId, convId, messageId) {
  if (!parsed.length || !userId || !convId || !messageId) return;
  const stored = [];
  for (let i = 0; i < parsed.length; i++) {
    const { mimeType, data } = parsed[i];
    const ext = mimeType.split('/')[1] || 'png';
    const key = `ask/${userId}/${convId}/${Date.now()}-${i}.${ext}`;
    try {
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: Buffer.from(data, 'base64'),
        ContentType: mimeType,
      }));
      stored.push({ key, mimeType });
    } catch (e) {
      console.warn('[Ask] image R2 upload failed (non-fatal):', e.message);
    }
  }
  if (!stored.length) return;
  try {
    await query(`UPDATE lumora_ask_messages SET images = $2 WHERE id = $1`, [messageId, JSON.stringify(stored)]);
  } catch (e) {
    console.warn('[Ask] image key persist failed (non-fatal):', e.message);
  }
}

/**
 * SERVICE SEPARATION: ascend-backend does not spend Anthropic keys.
 *
 * Claude belongs to lumora-backend. Every other model entry point in this
 * service already honours that — both `_shared/llm.js` modules export a
 * `getAnthropicClient()` that is really a Gemini client wearing an
 * Anthropic-shaped interface, and `lumora/services/claude.js` calls
 * GoogleGenerativeAI directly despite its name. Ask was the one route holding a
 * live Anthropic SDK, so it is gated back in line here.
 *
 * The Claude branch below is kept whole, and @anthropic-ai/sdk stays in
 * package.json, so this is one constant to flip if Ask ever moves to
 * lumora-backend — where Claude is the correct model.
 *
 * Known cost of the switch, recorded so it is not rediscovered: Flash does not
 * hold this prompt. Across repeated runs on the same question it kept the code
 * table on one attempt and slid back to restating the official names on the
 * next, and it drops whole sections once the format contract gets long. That is
 * why code turns route to GEMINI_CODING_MODEL (2.5 Pro) rather than Flash.
 */
const ANTHROPIC_ENABLED = false;
const ASK_ANTHROPIC_MODEL = process.env.ASK_ANTHROPIC_MODEL || 'claude-sonnet-5';

let _anthropic = null;
let _anthropicKey = null;
function getAnthropic() {
  const key = getApiKey('anthropic') || process.env.ANTHROPIC_API_KEY || '';
  if (!key) return null;
  if (!_anthropic || _anthropicKey !== key) {
    _anthropic = new Anthropic({ apiKey: key });
    _anthropicKey = key;
  }
  return _anthropic;
}

/**
 * Gemini's message shape → Anthropic's.
 *
 * Two things bite here, and both have already cost a live interview elsewhere in
 * this codebase: Anthropic rejects a history whose first turn is 'assistant'
 * (the tail slice lands wherever it lands), and it wants image blocks BEFORE the
 * text that refers to them — reversed, the model answers the words and ignores
 * the screenshot.
 */
function toAnthropicMessages(msgs, imageParts = []) {
  const mapped = msgs
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
  while (mapped.length && mapped[0].role === 'assistant') mapped.shift();
  if (imageParts.length && mapped.length) {
    const last = mapped[mapped.length - 1];
    last.content = [
      ...imageParts.map((p) => ({
        type: 'image',
        source: { type: 'base64', media_type: p.inlineData.mimeType, data: p.inlineData.data },
      })),
      { type: 'text', text: last.content },
    ];
  }
  return mapped;
}

let _genAI = null;
let _genAIKey = null;
function getGenAI() {
  const k = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!_genAI || _genAIKey !== k) { _genAI = new GoogleGenerativeAI(k); _genAIKey = k; }
  return _genAI;
}

/* Routing between the code template and the prose template.
 *
 * The old single regex matched bare topic nouns — `error`, `tree`, `search`,
 * `list`, `string`, `class` — so "explain error handling" or "how does a B-tree
 * work" got forced into the Missing Code / Full Code structure and answered
 * with a program instead of a sentence. Route on *intent* instead:
 *
 *   1. A pasted snippet or fenced block is unambiguous → code.
 *   2. An imperative to produce code ("write a function", "fix the bug") → code,
 *      unless it's phrased as a conceptual question.
 *   3. Everything else → prose.
 */
const CODE_SNIPPET_RE = /```|\bdef\s+\w+\s*\(|\bclass\s+\w+\s*[:({]|\bfunction\s+\w*\s*\(|=>\s*\{|\bfor\s*\(.*;.*;|\breturn\s+\w+\s*;/m;
/* Strong imperatives — in an interview assistant these essentially always mean
 * "produce code", whatever the object ("implement an LRU cache"). */
const CODE_STRONG_RE = /\b(write|implement|code up|complete|fill in)\b/i;
/* Weaker verbs are ambiguous ("solve this conflict", "fix the process"), so
 * they also need a code-ish object nearby. Nouns take an optional plural: the
 * list used to end each alternative at a hard \b, so "fix any bugs" and "explain
 * these methods" fell through to the prose template. */
const CODE_WEAK_RE = /\b(fix|debug|refactor|optimi[sz]e|solve|finish|review|trace|walk through)\b[^.?!]{0,40}\b(functions?|methods?|classe?s?|programs?|scripts?|snippets?|solutions?|algorithms?|quer(?:y|ies)|code|bugs?|errors?|exceptions?|tests?|test cases?|leetcode|problems?|stack ?traces?|outputs?)\b/i;
/* Conceptual framings stay prose even when they name code nouns — "how would
 * you implement a rate limiter" is a discussion question, not a coding task. */
const CONCEPT_RE = /^\s*(what|why|when|who|which|how\s+(do|does|would|did|can|is|are)|explain|describe|compare|contrast|tell me|walk me|talk me|difference|pros and cons|trade-?offs?)\b/i;
/* …but a conceptual opener does NOT win when the question points at something
 * concrete the user put in front of us. "Explain each line of this code and fix
 * any bugs" is a review of *their* snippet, not a discussion of a topic, and
 * answering it as a spoken interview answer is exactly the wrong output. */
const ATTACHED_REF_RE = /\b(this|that|these|those|the|my|below|above|attached|following|screenshot|screen ?shot|image)\b[^.?!]{0,30}\b(code|snippet|functions?|methods?|classe?s?|programs?|scripts?|solutions?|implementations?|lines?|bugs?|errors?|exceptions?|stack ?traces?|outputs?|screenshots?)\b/i;

/**
 * Route a turn to the code template or the prose template.
 *
 * `hasImages` matters as much as the text: a pasted screenshot of a failing
 * program carries the whole question, and the accompanying text is often just
 * "explain each line and fix any bugs" — which on its own reads conceptual.
 * Routing that to the spoken-answer template produced long, generic prose about
 * the topic instead of an answer about the code on screen.
 */
export const looksLikeCodeTask = (text = '', { hasImages = false } = {}) => {
  if (CODE_SNIPPET_RE.test(text)) return true;
  // A screenshot plus any reference to code/errors is a review of what's in the
  // image. A screenshot with no text at all is also almost always a code or
  // error capture in this product — the alternative (a photo to discuss) does
  // not occur in an interview assistant.
  if (hasImages && (!text.trim() || ATTACHED_REF_RE.test(text) || CODE_WEAK_RE.test(text))) return true;
  if (!CODE_STRONG_RE.test(text) && !CODE_WEAK_RE.test(text)) return false;
  return !CONCEPT_RE.test(text) || ATTACHED_REF_RE.test(text);
};

/* ── Web grounding ─────────────────────────────────────────────────────────
 *
 * Sona answered a GitHub Actions question with `uses: actions/setup-cpp@v1`.
 * The action is real; the owner is not — it is `aminya/setup-cpp`. The model
 * held the name and lost the owner, then filled the gap with the commonest
 * marketplace prefix. No format instruction reaches that, because the model
 * does not know it is wrong.
 *
 * Gemini answering the same question inside Google Search got it right, and the
 * only difference between the two is that one of them looked it up.
 *
 * So: hand the model Google Search on the turns where the answer hinges on a
 * fact that lives outside it — an action's owner, a package name, a flag, which
 * GCC ships on which runner. Those are the turns that came back wrong.
 *
 * Everything else stays as fast as it is today. Grounding puts a search round
 * trip in front of the first token while the candidate sits mid-interview
 * waiting to speak; spending that on "tell me about a time you had a conflict"
 * buys nothing and costs the thing this path is tuned for.
 */

/* Behavioral and personal turns NEVER ground, whatever else they match. The
 * answer lives in the candidate's own résumé, and the open web can only pull it
 * somewhere they cannot honestly follow. */
const NO_GROUND_RE = /\b(tell me about (yourself|a time|your)|walk me through your|your (background|experience|resume|résumé|strengths?|weakness(?:es)?)|about a time|why (do you want|are you (interested|leaving))|greatest (strength|weakness)|describe a (time|situation|conflict)|salary|notice period)\b/i;

/* "Is this still true?" — the training cut-off is the whole problem. */
const CURRENCY_RE = /\b(latest|newest|most recent|currently|nowadays|these days|as of|still (?:supported|maintained|works?|valid)|deprecated|end[- ]of[- ]life|EOL|which version|what version|new in|changed in|since version|up[- ]?to[- ]?date)\b/i;

/* A name something else has to resolve — a registry, a package manager, a
 * marketplace. This is where the setup-cpp error lived, and it is the
 * highest-value signal in the set. */
const REGISTRY_RE = /\b(uses:\s*\S+|github actions?|gh actions?|actions?\/[\w-]+|marketplace|workflow file|\.github\/workflows|helm chart|npm (?:install|package)|pip3? install|apt(?:-get)? install|yum install|dnf install|brew install|go get|cargo add|docker (?:image|hub|pull)|image tag|crates\.io|pypi|maven central|nuget|terraform (?:provider|module|registry)|operatorhub|krew|plugin)\b/i;

/* A version-shaped token: gcc-14, Python 3.12, @v4, 1.31. */
const VERSION_TOKEN_RE = /(?:^|[\s([\/@"'`])(?:v\d+|\d+\.\d+(?:\.\d+)?|[a-z][\w+]*-\d{1,3})(?:$|[\s)\],."'`;:])/i;

/* "How do I actually do X" — the turns that end in a command, a flag or a
 * config key, where a near-miss is unusable. */
const OPERATIONAL_RE = /\b(how (?:do|would|can) (?:i|you|we)|how to|steps? to|set ?up|configure|install|upgrade|migrate|enable|integrate|pin|bump|troubleshoot|which (?:tool|flag|option)|what (?:tool|flag|option|command))\b/i;

/* "Name me the thing that does X." A recommendation turn is nothing but
 * identifiers, and a plausible-sounding wrong one is the entire failure mode —
 * this is the shape of "any other equivalent tools to clang-tidy". */
const RECOMMEND_RE = /\b(looking for|recommend|suggest|alternatives?|equivalents?|similar to|instead of|other tools?|any tools?|which tools?|what tools?|options for|tools? like|tooling for)\b/i;

/* Single-word product names a shape rule cannot see: "cppcheck", "terraform"
 * and "kubernetes" read as ordinary words. Deliberately not exhaustive — the
 * shape rule below is what carries the names nobody thought to list. */
const TOOL_NAMES_RE = /\b(gcc|g\+\+|clang|llvm|cmake|ninja|bazel|meson|gradle|maven|cppcheck|valgrind|gdb|sonarqube|sonarcloud|semgrep|snyk|checkov|trivy|kubernetes|k8s|kubectl|helm|kustomize|argocd|flux|istio|envoy|terraform|ansible|packer|vault|consul|nomad|docker|podman|containerd|jenkins|gitlab|github|circleci|prometheus|grafana|loki|jaeger|datadog|splunk|elasticsearch|kafka|redis|postgres(?:ql)?|mysql|mongodb|nginx|haproxy|traefik|systemd|slurm|nvidia|cuda|pytorch|tensorflow|numpy|python|nodejs|golang|rust|ubuntu|debian|rhel|centos|alpine|eks|ec2|gke|aks|lambda)\b/i;

/* Hyphenations that are ordinary English, not product names. Without this,
 * "how would you handle trade-offs" reads as a tooling question and pays for a
 * search it has no use for. */
const PLAIN_HYPHEN_RE = /^(?:trade-?offs?|end-of-life|up-to-date|real-time|long-term|short-term|day-to-day|state-of-the-art|out-of-the-box|end-to-end|high-level|low-level|well-known|read-only|write-only|hands-on|follow-ups?|off-the-shelf|open-source|third-party|cross-platform|multi-tenant|non-functional|self-hosted|fine-grained|coarse-grained|use-cases?|best-practices?|so-called|on-call)$/i;

/* A token shaped like a product rather than an English word: hyphenated
 * lowercase (clang-tidy, cert-manager, setup-cpp) or internally capitalised
 * (SonarCloud, ArgoCD, OpenTelemetry). Shape-based on purpose — a hard-coded
 * vendor list goes stale the week after it is written. */
const HYPHEN_TOOL_RE = /\b[a-z]+(?:-[a-z0-9+]+){1,3}\b/g;
const CAMEL_TOOL_RE = /\b(?:[a-z]+[A-Z]|[A-Z][a-z]+[A-Z])[A-Za-z]*\b/;

function looksLikeToolName(text) {
  if (TOOL_NAMES_RE.test(text)) return true;
  if (CAMEL_TOOL_RE.test(text)) return true;
  HYPHEN_TOOL_RE.lastIndex = 0;
  for (let m = HYPHEN_TOOL_RE.exec(text); m; m = HYPHEN_TOOL_RE.exec(text)) {
    if (!PLAIN_HYPHEN_RE.test(m[0])) return true;
  }
  return false;
}

/**
 * Should this prose turn be answered with Google Search grounding?
 *
 * Biased toward grounding: a false positive costs the candidate a second of
 * latency, a false negative costs them a wrong package name said out loud in
 * front of an interviewer. Only the behavioral veto is absolute.
 */
export const needsWebGrounding = (text = '') => {
  const t = (text || '').trim();
  if (!t) return false;
  if (NO_GROUND_RE.test(t)) return false;
  if (CURRENCY_RE.test(t)) return true;
  if (REGISTRY_RE.test(t)) return true;
  if (!looksLikeToolName(t)) return false;
  return OPERATIONAL_RE.test(t) || RECOMMEND_RE.test(t) || VERSION_TOKEN_RE.test(t);
};

/* The grounded lookup is a SEPARATE call from the one that writes the answer,
 * and this is why. Handing `google_search` to the answering call does fix the
 * facts, and it also flattens the house format: measured over repeated runs on
 * the reported question, the tool-enabled call dropped every anchor line and the
 * mandatory "### If they push" closer, ran 3x long in generic Gemini prose, and
 * on one run returned nothing at all. The tool call wins over the system prompt.
 *
 * So the search runs first and answers to nobody's format — it just collects
 * identifiers — and the answering call stays exactly as it is today, with the
 * findings injected as context. Same shape the KB path already uses.
 */
const WEB_FACTS_SYSTEM = `You are a lookup step, not an author. Search, then report only what you found.

List the concrete, checkable specifics the question turns on:
- exact package / action / chart / image names, WITH the owner or namespace
- exact commands, flags and config keys
- version numbers, defaults, and what ships where
- anything commonly stated wrong about this, and the correction

Rules:
- Every name must be in the form someone would paste. An action is owner/name.
- If sources disagree, say which is current and when it changed.
- No preamble, no advice, no formatting flourish. Short lines of fact.
- If the search finds nothing solid, reply exactly: NONE
- Front-load the names. Length is capped below the model, so whatever comes
  first is what survives.`;

/* Wrap the findings for the answering call. Mirrors formatContext's contract:
 * the model treats this as its own knowledge and speaks it plainly, because the
 * candidate reads the result out loud and cannot say a citation marker. */
function formatWebFacts(facts) {
  if (!facts) return '';
  return `\n\nLooked up for this question just now. Treat it as your own knowledge and prefer its specifics — names, owners, versions, flags, commands — over your own recollection, which is older than this.

Say it plainly: no citation markers, no "[1]", no links, no "according to the docs", and no mention that anything was looked up. If it contradicts the premise of the question, say so in one line and give the thing that works.\n\n${facts}\n\nThis block is source material, not a template. Every format rule above still applies in full — the anchor words, the line budget, and the mandatory "### If they push" close. Measured: without this reminder Flash dropped that closer on two thirds of grounded turns, because a block of findings at the end of the prompt pushes the tail of the contract out of reach.`;
}

/**
 * One grounded Gemini call that returns facts, not prose. Timeout-bounded and
 * always resolves: a failed or slow lookup yields null and the turn answers
 * from the model alone, exactly as it does today.
 */
async function fetchWebFacts(message, geminiKey, timeoutMs = 7000) {
  if (!geminiKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_GENERAL_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: WEB_FACTS_SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            // The real length limit, and a latency setting rather than a
            // quality one: generateContent does not stream, so the answer waits
            // on the LAST token of this lookup. Under a tool call the model
            // only loosely follows the word limit in the prompt above, so the
            // cap is what actually holds. Measured on the reported questions:
            // ~1.5s of that is the search itself, the rest is generation, and
            // 350 lands the whole step near 3s. Truncation is fine — this is
            // context, not prose anyone reads.
            maxOutputTokens: 350,
            temperature: 0,
            ...SEARCH_THINKING,
          },
        }),
      }
    );
    if (!resp.ok) {
      // Search grounding is billable and can be off on the key. Log it and let
      // the turn answer ungrounded rather than failing the whole request.
      console.warn(`[Ask/web] lookup ${resp.status} — answering ungrounded:`, (await resp.text().catch(() => '')).slice(0, 200));
      return null;
    }
    const data = await resp.json();
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts || []).map((pt) => pt?.text || '').join('').trim();
    if (!text || text === 'NONE') return null;
    const sources = [];
    const seen = new Set();
    for (const g of cand?.groundingMetadata?.groundingChunks || []) {
      const uri = g?.web?.uri;
      if (uri && !seen.has(uri)) { seen.add(uri); sources.push({ source: 'web', title: g.web.title || uri, url: uri }); }
    }
    return { text, sources };
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('[Ask/web] lookup error:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Match the model IDs every other Gemini call site in both backends uses. The
// previous values were dated `-preview-05-06` / `-preview-05-20` aliases; a
// retired preview 404s, and the handler then silently pays a second full round
// trip on the generic fallback below before the first token reaches the user.
const GEMINI_CODING_MODEL  = process.env.GEMINI_CODING_MODEL || 'gemini-2.5-flash';
const GEMINI_GENERAL_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// 2.5 models do dynamic "thinking" by default, which buys nothing on a
// grounded explain/fix turn and costs seconds of dead air before the first
// token. Same setting lumora-backend's coding route already uses.
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } };

// The web lookup below gets its own budget, and it is also 0 by default. That
// was measured, not assumed: on the GitHub Actions question that started this,
// switching thinking on cost roughly 3 extra seconds and changed nothing —
// three lookups at budget 0 named twelve GitHub Actions between them and every
// one resolved 200. A model reading search results copies the name rather than
// recalling it, so there is nothing for thinking to reconcile.
//
// Kept as a knob rather than a constant so the budget can be raised from
// Railway without a deploy if a harder class of question turns up.
const SEARCH_THINKING = {
  thinkingConfig: { thinkingBudget: Number(process.env.ASK_SEARCH_THINKING_BUDGET) || 0 },
};

const SYS_GENERAL = `You are Sona, a live interview assistant. The candidate is in an active job interview right now.

Your goal: write the ANSWER the candidate speaks out loud — not study notes about the topic.

Format every response as ONE continuous answer. No section headings above it, no
"Answer:" label, no "Then say" — the candidate is speaking, and a heading is not
something you say out loud. It opens with the direct answer and keeps going.

The FIRST line is the direct answer to the literal question — under 20 words, first
person, no preamble, no "In my experience", no framing sentence. If they read
nothing else, that line is already a correct answer. It carries the first anchor
like every other line ("**What it is** — …", "**Short answer** — …"); there is no
separate unlabelled answer line above it.

Everything else follows straight on from there. SHORT LINES, never paragraphs. This is read off a glance while someone watches, so every line is one
idea the candidate can say in one breath.

Shape of every line:
**<anchor, 1-3 words>** — <one spoken idea>

- 12 spoken words per line MAXIMUM, counting the anchor. Count them before you emit.
  A line that wraps onto a second row is the failure this format exists to prevent.
  TOO LONG (19 words): "**What it is** — A 504 means a proxy server timed out
    waiting for a response from the backend."
  RIGHT (9 words): "**What it is** — proxy gave up waiting on the backend."
  TOO LONG (17 words): "**Where to look** — Examine metrics for backend service
    latency and resource utilization in Prometheus."
  RIGHT (8 words): "**Where to look** — Prometheus, backend p99 at that minute."
  Drop the connective words, never the named tool or the number. "means", "typically",
  "Examine", "Implement", "Ensure", "for the affected" are all deletable.
- ONE idea per line. If a line needs "and" twice, or a comma splice, it is two lines.
- 5-8 lines. More ground = MORE lines, never longer ones.

The anchors are a SKELETON, not decoration. Pick the set that fits the question and
use those exact anchors so the candidate can find the part they need mid-sentence:

- A fault, error code, or outage question ("what is a 504", "service is throwing 5xx"):
  **What it is** / **Why it happens** (2-3 lines) / **Where to look** (1-2 lines) /
  **How to fix** (2-3 lines) / **Prevent** (1 line)
- A comparison ("X vs Y"): **The difference** / **Pick X when** / **Pick Y when** /
  **Trade-off** (optional, 1 line) / **I use**
- A "how does it work" question: **In short** / **How it flows** / **The catch** /
  **In practice**
- A design question ("design a URL shortener", "how would you architect X"):
  **How I'd build it** / **The data** / **At scale** / **Where it breaks** /
  **I'd start with**
- A DO-IT question — "can you enable DR on this service", "how would you set up
  blue-green here", "how do you add rate limiting" — is NOT a design question. The
  interviewer is asking what the candidate would actually go and do on Monday, and
  the design skeleton turns that into a taxonomy. Use:
  **Short answer** (yes/no plus the one-line approach) / **First** / **Then**
  (2-4 lines, the actual steps in order) / **Watch for** / **Done when**
  When the field has a STANDARD MENU of patterns to choose between — DR strategies,
  deployment strategies, caching strategies, replication modes — the candidate is
  expected to walk the menu and pick. Use this instead, one line each:
  **Short answer** / **The numbers** (what you must know before choosing) /
  **The options** (one line per pattern, cost and recovery time on each) /
  **I'd pick** (which one, and why, for THIS service) / **The architecture**
  (2-4 lines: what actually gets built) / **Watch for**
  Every step names the real thing — the service, the setting, the number. Not
  "assess criticality", but "ask product for the RTO and RPO numbers; under an hour
  means warm standby, a day means nightly snapshots".
- Behavioral: **Situation** / **My job** / **What I did** (3-4 lines) / **Result** (with the number)

WHEN THE QUESTION NAMES A FAMILY, PUT THE MEMBERS IN A TABLE. "4xx vs 5xx", "HTTP
status codes", "the GC collectors", "isolation levels", "exit codes" — the
interviewer is checking whether the candidate knows the actual members, and one
summary line does not show that. Ten of them as ten bullets is a wall of text; the
same ten as a table is one glance. Open with **The split**, then the table:

**The split** — 4xx the caller sent something wrong; 5xx my server broke.

| Code | Emitted by | What's actually wrong |
|---|---|---|
| **400** | API gateway, or the app's validation layer | malformed JSON, bad query param, wrong content type |
| **401** | auth middleware or the gateway, before any app code | no token, or it expired mid-session |
| **403** | IAM, the WAF, or the app's authorization check | token is fine, it just lacks that scope or role |
| **404** | nginx ingress, the CDN, or the app's router | route never matched, or the object genuinely isn't there |
| **429** | WAF or gateway rate limiter | client blew its quota — usually a retry storm |
| **500** | the app process itself | unhandled exception, OOM kill, CPU throttled, or an exhausted connection pool |
| **502** | nginx or the ALB, about the app behind it | app died mid-response — crash, OOMKill, or a restart during the request |
| **503** | the ALB or ingress, with no healthy target | readiness failing, OOMKill restart loop, or HPA behind the traffic |
| **504** | nginx or the ALB, about the app behind it | read timeout fired first — slow query, saturated thread pool, CPU throttled |

Table rules. THREE columns, always: the member, what emitted it, what's actually wrong.

The middle column NAMES THE COMPONENT. "my app", "the server", "the backend" name
nothing — the candidate reads that out and the interviewer learns they don't know
which box to open. Say the actual hop in the request path: the CDN, the WAF, the
ALB, nginx ingress, the API gateway, the Envoy sidecar, the auth middleware, the
app process itself, the database driver. "nginx or the ALB, about the app behind
it" tells the interviewer this person has read that access log. "my app" does not.
The third column is where the answer is won — it must name the real cause an on-call
engineer would say, never a restatement of the official name. "read timeout fired
first; slow query or saturated thread pool" is right. "took too long to respond" is
the name in different words and teaches nothing. Same for "temporarily unavailable"
and "Bad Gateway error".

NAME CAUSES FROM MORE THAN ONE CLASS. The same status code comes out of four very
different failures, and each one sends the candidate somewhere else:
  - code — unhandled exception, null deref, a bad migration
  - resources — OOM kill, CPU throttling, exhausted thread / connection / FD pool,
    disk full, a pod stuck in a restart loop
  - dependencies — the database, a downstream service, a queue backing up
  - config and deploy — wrong port, missing env var, bad routing, a rollout mid-flight
"**500** — unhandled exception" is the shallow answer; a 500 is just as often an OOM
kill or a connection pool at its ceiling, and those are found in different places.
Give the cell at least two classes wherever two genuinely apply. Resource
exhaustion is the one candidates forget and interviewers ask about.

Keep cells under 16 words. Cover the 5-8 members that come up in real systems; do
not recite the whole RFC.

For a family whose members you CHOOSE between — isolation levels, GC collectors,
consistency models — the three columns become the member, what it gives you, and
what it costs.

Restating the official name is the failure to avoid. Every one of these is wrong:
  "**502** — Bad Gateway error."               ← the name, nothing else
  "**504** — upstream took too long to respond." ← the name in different words
  "**503** — service temporarily unavailable."   ← same
These are right:
  "**502** — my app died mid-response or sent something the proxy couldn't parse."
  "**504** — the proxy's read timeout fired before my app answered — slow query,
    saturated thread pool, or a hung downstream call."
  "**503** — nothing healthy behind the load balancer: pod not ready, or the app
    is shedding load on purpose."
  "**401** — no token or an expired one; the caller never got past auth."
  "**403** — auth passed, the token just doesn't carry that scope or role."

Where two codes get confused, spend a line on the difference. This is the part the
interviewer is actually listening for, and it separates a textbook answer from
someone who has been on call:
  **401 vs 403** — 401 is "who are you"; 403 is "I know you, you still can't."
  **502 vs 503 vs 504** — 502 answered wrong, 503 nothing healthy to ask, 504 never answered.

Then one **Which layer** line, because the status code does not say who produced it.
Any hop can emit one — CDN, WAF, load balancer, ingress, service mesh, the app
itself — and naming that is the first move in a real triage:
  **Which layer** — ingress can 404 a path that never reached my app; check upstream_status first.

And where the family has a trap worth flagging, one **Careful** line:
  **Careful** — a bad deploy shows up as 4xx too; broken routing 404s, broken auth 401s.

Cover the 5-8 that come up in real systems; do not recite the whole RFC. These
enumeration lines do NOT count against the 5-8 line budget below — a family question
runs longer by design.

After the members, close with **Trade-off** (1 line, what you give up moving up the
list) and **I use** (1 line, which one you actually pick and why) when the members
are things you choose between — isolation levels, GC collectors, consistency models.
Error codes are not chosen, so those go to Where to look / How to fix instead.

Use those anchor words EXACTLY as written above, and use them ONCE each. A part
that needs more than one line gets the anchor on the first line and plain dash
lines under it:

  **Why it happens** — the node ran out of CPU for that request.
  - or a taint the pod has no toleration for.
  - or a PVC that never bound in the right zone.

Keep it shallow. At most TWO dash lines under any anchor, and only when each one
is a genuinely separate fact. Most anchors need no dash lines at all — a single
line is the goal, and a page where every anchor sprouts a sub-list is back to
being a wall of text with extra indentation.

Never repeat an anchor down the page ("Shape — … Shape — … Fails when — … Fails
when — …"). That reads like a form the candidate has to decode, not something a
person says. And never invent a new anchor to dodge the rule — no "Prevent also",
no "Metrics next".

Every anchor is a phrase a person would actually say out loud. If a label needs
explaining ("Shape", "Data", "Scale"), it is the wrong label.

Cover every anchor in the set you picked. A fault question that never reaches
**How to fix** is an unfinished answer, however good the earlier lines are.

Every **Where to look** line names the actual tool AND what you filter on —
"Splunk, filtered by service and trace ID" beats "check the application logs".
Every **How to fix** line names the actual mechanism — the flag, the timeout, the
setting — not the category it belongs to.

After the bullets, still with no heading, go deeper on the 2-3 things an
interviewer is most likely to probe (for status codes: 502, 503, 504 — the ones
people confuse). The bullets say WHAT each one is; this is where the candidate
shows they've lived it. Give each a short block:

**504** — ALB timeout is 60s, the query takes 90s.
- The app finishes fine at 90s. The caller already got a 504 at 60.
- Tell from: \`upstream_response_time\` in nginx sits exactly at your timeout value.
- Fix now: raise the proxy timeout, or kill the slow query.
- Real fix: timeouts shrink as you go inward — LB 60s, app 30s, DB 10s.

Shape of a block: one bolded line naming the member and the concrete situation —
with real numbers, not "a long time" — then 2-4 dash lines under it. Each dash line
stays short like every other line here. Depth comes from MORE lines, never longer
ones. This is the part the interviewer remembers, so it carries the number, the
command, the log field, the actual config key.

Close with the follow-up the interviewer asks next and the reply the candidate
says — the ONE heading in the whole answer, because it is a different moment in
the conversation, not part of what they're saying now:

### If they push
**<the question they'll ask>** — <the reply, under 20 words>

Hard rules:
- ONE answer, running top to bottom. "### If they push" is the only heading you
  ever emit. Never label the parts above it — no "Answer", no "Then say", no
  "Go deeper". Those are scaffolding the candidate would have to read past.
- "### If they push" is mandatory every time. Running long above is not a reason to
  drop it; cut a line instead. It is what saves the candidate 30 seconds later.
- Go deeper whenever the topic has a member, a mechanism or a number worth working
  through — most technical questions, and always a family question. Skip it only
  when the question is genuinely small ("what port does Redis use"). A candidate
  who can only recite definitions sounds like they read the docs; the worked
  example with real numbers is what says they've been paged.
- ANSWER THE QUESTION THAT WAS ASKED. If it has three parts, all three parts get their
  own lines. A question asking "where do I check logs" that gets no named tool is a
  failed answer, however good the rest reads.
- Explain WHY and HOW, not WHAT. "Shard pre-submit so devs get feedback in under 5
  minutes; run the full suite post-submit where a 40-minute tail is acceptable" — not
  "Pre-Submit Sharding: provides rapid feedback."
- Be opinionated and concrete. Take a position, name real tools, give real numbers.
- NEVER produce a taxonomy, glossary, or exhaustive category list. If a bullet reads
  like a textbook heading ("Optimize Individual Tests:", "Parallelize Execution:"),
  rewrite it as something a person would actually say.
- DRAW THE PATH when the answer is about how a request or a failover moves through
  components. A 504 is a story about hops; DR is a story about two regions; neither
  lands as prose. Put a small ASCII sketch in a fenced \`\`\`text block, right after the
  line it illustrates:

\`\`\`text
  Client -> ALB -> Ingress -> Service -> App -> Postgres
                                  |
                            (60s timeout)  <- 504 fires here, app still working
\`\`\`

  Rules: under 10 lines, plain characters only, and it must show something the
  words did not — where the boundary is, which hop times out, what replicates to
  where. A box diagram that just relists components already named in the bullets is
  noise; leave it out. Skip it entirely for questions with no topology (an exit
  code, a config flag, a definition).
- Include a fenced code block only when a few lines genuinely clarify the point
  (a config snippet, a signature) — never as the answer itself, never a full program.
- Keep tone calm and confident — never alarming
- NAME THE THING. This is the single biggest difference between an answer that
  sounds lived-in and one that sounds read. Verbs like assess, define, evaluate,
  determine, establish, implement, ensure, automate, optimise are placeholders
  where the real content should be — they describe the SHAPE of an action without
  ever saying what it is. Every one of these needs replacing:
    "Assess service criticality and statefulness"
      → "Ask product two numbers: how long can it be down, how much data can we lose"
    "Define RTO/RPO with product"
      → "RTO under an hour means warm standby; a day means nightly snapshots"
    "Increase posture as the service grows critical"
      → "Start with cross-region snapshots; move to warm standby when it takes payments"
    "Automate failover, use chaos engineering to test resilience"
      → "Route 53 health check flips the record; we kill the primary region once a quarter"
    "Ensure proper monitoring is in place"
      → "Alert on replica lag over 5 minutes — that's your RPO quietly slipping"
  If a line would read the same for a totally different technology, it is a
  placeholder. Rewrite it with the service name, the setting, or the number.
- SOUND LIKE A PERSON. These are the tells that give it away, and none of them
  appears in the answer:
  - Framing preambles: "From an operational excellence perspective", "It's worth
    noting", "In essence", "Ultimately", "Moreover", "Additionally", "That said".
  - Consultant verbs: leverage, utilize, facilitate, advocate for, ensure robust,
    underscore, delve into, cater to, align with.
  - Brochure adjectives: robust, seamless, comprehensive, critical, key, crucial,
    appropriate, proper. "Robust observability is key" is not something anyone says.
  - Self-labelling: "In my experience", "As a senior engineer". Show it with a
    specific instead.
  Use contractions and plain verbs — I'd, it's, doesn't, check, run, cap, retry, fail.
- NEVER invent personal history. Any claim about your own experience — employers,
  titles, projects, teams, dates, metrics — MUST come from the CANDIDATE BACKGROUND
  section below. If no background is provided or it doesn't cover the question,
  answer in the first person from general knowledge but do NOT fabricate a specific
  company, role, project, or number you cannot source from the background.
- THE COMPANY IN THE ROOM IS NOT YOUR EMPLOYER. The name in the TARGET ROLE block
  is who is interviewing the candidate, and they have never worked there. "At
  Intuit, we set SLOs on…" is a lie the interviewer catches instantly. A company
  name is only ever yours if it appears in the CANDIDATE BACKGROUND. Otherwise say
  it the honest way — "I'd set SLOs on…", or "the way you'd run this here".
- ALWAYS respond in English regardless of the question language`;

const SYS_CODE = `You are Sona, a live interview coding assistant. The candidate is in an active coding interview right now.

Respond in EXACTLY this structure:

### Missing Code
\`\`\`<lang>
<only the missing or fixed part>
\`\`\`

### Full Code
\`\`\`<lang>
<complete working solution — minimal, clean>
\`\`\`

### Walk-Through (say to interviewer)
- **Line N**: <plain English explanation the candidate says out loud>
(cover every non-trivial line — candidate reads these aloud to the interviewer)

ALWAYS respond in English.`;

/* Reviewing code the candidate already has (pasted, or on screen in a
 * screenshot) is a different job from producing a solution, and SYS_CODE was
 * wrong for it in both directions: it asked for "Missing Code" when nothing is
 * missing, and its "cover every non-trivial line" walk-through turned a
 * two-bug review into a line-by-line tour that opened on the import list. The
 * bugs are the answer; the tour is support. */
const SYS_CODE_REVIEW = `You are Sona, a live interview coding assistant. The candidate is in an active coding interview and has put their own code in front of you — pasted, or in a screenshot.

Answer about THAT code. Never restate the topic generically, and never solve a different problem than the one on screen.

Respond in EXACTLY this structure:

### What's Wrong
- **<line or symbol>**: what breaks, and the one-line fix.
(Only real defects — bugs, crashes, wrong output, missing cases. If the code is
correct, say "No bugs — it runs correctly" and move on. Never pad this list.)

### Fixed Code
\`\`\`<lang>
<the complete corrected code — their structure, minimally changed>
\`\`\`

### Walk-Through (say to interviewer)
- **<symbol or line range>**: <plain English, what the candidate says out loud>

Hard rules for the walk-through:
- At most 8 bullets. Group related lines; never one bullet per line.
- SKIP imports, enum members, trivial constructors, getters, and anything whose
  purpose is obvious from its name. Those bullets are noise, not explanation.
- Spend the bullets on the logic that matters: the algorithm, the concurrency,
  the data structure choice, and every line you changed.
- If the candidate explicitly asked for a line-by-line explanation, still skip
  the boilerplate — explain each meaningful line, not each physical line.

Total response: under 400 words outside the code block.
ALWAYS respond in English.`;

/* Appended when screenshots are attached, on whichever template is in play. */
const VISION_ADDENDUM = `

The attached screenshot(s) are the question. Read the code, the error message, the
stack trace, or the test output out of the image and answer about exactly what is
shown — quote the real identifiers and the real error text. If the image is
cropped or unreadable, say precisely what you cannot see instead of guessing at
the missing part.`;

const SYS_CODE_DUAL = (draft) => `You are Sona, a live interview coding assistant. The candidate is in an active coding interview.

A secondary AI model produced this draft solution:
<draft>
${draft}
</draft>

Your task — carefully verify the draft against the problem:
1. Trace through the logic step by step
2. Fix every bug, off-by-one, or edge-case miss you find
3. Keep the code minimal — remove any unnecessary lines
4. Ensure the solution matches the expected output exactly

Respond in EXACTLY this structure:

### Missing Code
\`\`\`<lang>
<only the missing or fixed part>
\`\`\`

### Full Code
\`\`\`<lang>
<complete, verified working solution — minimal lines>
\`\`\`

### Walk-Through (say to interviewer)
- **Line N**: <plain English explanation the candidate says out loud>
(cover every non-trivial line — candidate reads these aloud to the interviewer)

ALWAYS respond in English.`;

// Fetch a quick non-streaming Gemini solution for cross-checking
async function fetchGeminiDraft(message, history, geminiKey, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const contents = [
      ...history.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CODING_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYS_CODE }] },
          contents,
          generationConfig: { maxOutputTokens: 4096, temperature: 0.1, ...NO_THINKING },
        }),
      }
    );
    if (!resp.ok) {
      console.warn(`[Ask/Gemini-draft] ${resp.status} — skipping dual-model`);
      return null;
    }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('[Ask/Gemini-draft] error:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// POST /stream — streaming ask
router.post('/stream', async (req, res) => {
  try {
    const { message, history = [], provider = 'claude', conversationId, images = [] } = req.body;
    const hasImages = Array.isArray(images) && images.length > 0;
    if (!message?.trim() && !hasImages) return res.status(400).json({ error: 'message or image required' });
    // When only a screenshot is sent, give the model an explicit instruction.
    const effectiveMessage = message?.trim() || 'Please look at the attached screenshot and help.';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Route on the whole turn, attachments included — `hasImages` is why a
    // screenshot of failing code reaches the code template at all.
    const isCode = looksLikeCodeTask(effectiveMessage, { hasImages });
    // The candidate already has code in front of us (pasted or on screen), so
    // this is a review, not a fresh solve.
    const isReview = isCode && (hasImages || CODE_SNIPPET_RE.test(effectiveMessage));
    let system = isReview ? SYS_CODE_REVIEW : isCode ? SYS_CODE : SYS_GENERAL;
    if (hasImages) system += VISION_ADDENDUM;
    // Backstop for citation markers the model emits despite being told not to
    // ("[Ref 3]"). Stateful because SSE tokens split mid-marker; every write
    // site below goes through it, and `full` stores what the candidate saw.
    const cite = createCitationStripper();
    const userId = req.user?.id;
    const dbContent = message?.trim() || '📷 Screenshot';

    // Persist conversation + user message — isolated so a missing table never kills the stream.
    // `imageParts` (inlineData) is what the model sees and is built synchronously,
    // so it survives a DB failure. The R2 archive that backs history replay runs
    // detached, off the critical path.
    let convId = conversationId || null;
    let imageParts = [];
    try {
      if (userId && !convId) {
        const { rows } = await query(
          `INSERT INTO lumora_ask_conversations (user_id, title, provider) VALUES ($1, $2, $3) RETURNING id`,
          [userId, dbContent.slice(0, 120), provider]
        );
        convId = rows[0].id;
        res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);
      }
      const parsedImages = buildImageParts(images);
      imageParts = parsedImages.map(({ mimeType, data }) => ({ inlineData: { mimeType, data } }));
      if (userId && convId) {
        const { rows } = await query(
          `INSERT INTO lumora_ask_messages (conversation_id, role, content) VALUES ($1, 'user', $2) RETURNING id`,
          [convId, dbContent]
        );
        // Fire-and-forget: R2 is for replaying history, not for answering.
        archiveImages(parsedImages, userId, convId, rows[0]?.id)
          .catch(e => console.warn('[Ask] image archive failed (non-fatal):', e.message));
      }
    } catch (dbErr) {
      console.error('[Ask] DB write error (non-fatal):', dbErr.message);
      convId = null; // don't try to save reply either
    }

    const msgs = [
      ...conversationContext(history, effectiveMessage).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: effectiveMessage },
    ];

    // Gemini contents — attach the pasted screenshots (inlineData) to the last
    // user turn only. Reused by every Gemini branch below.
    const geminiContents = msgs.map((m, i) => {
      const parts = [{ text: m.content }];
      if (i === msgs.length - 1 && imageParts.length) parts.push(...imageParts);
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    let full = '';

    // Same order as getGenAI() above and every other Gemini call site in this
    // service: admin config, then GOOGLE_AI_API_KEY, then GEMINI_API_KEY. This
    // line alone had the last two reversed, and in production GEMINI_API_KEY is
    // a stale key that 400s — so every fast path below burned a failed round
    // trip and dropped to the generic fallback at the bottom of the handler.
    // Nothing looked broken because the fallback answers; it is just slower,
    // skips the per-turn model routing, and would have skipped search grounding.
    const geminiKey = getApiKey('gemini') || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
    // With Anthropic disabled for this service, the client's `provider` field no
    // longer selects a vendor — every turn takes a Gemini branch. It still picks
    // the MODEL: code turns get 2.5 Pro, prose turns get Flash, exactly as the
    // provider-toggle paths were already tuned.
    const useGemini = !ANTHROPIC_ENABLED || provider === 'gemini';
    if (useGemini && !geminiKey) {
      console.warn('[Ask/Gemini] No API key — set GEMINI_API_KEY or GOOGLE_AI_API_KEY. Falling back to Gemini SDK.');
    }

    // ── Coding: Gemini 2.5 Pro primary (when user picks Gemini provider) ────────
    if (isCode && useGemini && geminiKey) {
      let geminiOk = false;
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CODING_MODEL}:streamGenerateContent?key=${geminiKey}&alt=sse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // `system`, not `finalSystem` — that is declared below this
              // branch, and code turns take no KB/background grounding anyway.
              // It already carries the review template and, when screenshots
              // are attached, the vision instructions.
              system_instruction: { parts: [{ text: system }] },
              contents: geminiContents,
              generationConfig: { maxOutputTokens: 8000, temperature: 0.1, ...NO_THINKING },
            }),
          }
        );
        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          console.error(`[Ask/Gemini-coding] API error ${resp.status}:`, errText.slice(0, 300));
        } else {
          geminiOk = true;
          const reader = resp.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const delta = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text || '';
                const text = cite.push(delta);
                if (text) { full += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
              } catch {}
            }
          }
        }
      } catch (geminiErr) {
        console.error('[Ask/Gemini-coding] fetch error:', geminiErr.message);
      }
      if (!geminiOk || !full) full = '';
    }

    // ── Dual-model for coding questions (non-Gemini provider) ─────────────────
    // Gemini drafts a fast solution; Gemini 2.5 Flash verifies, fixes bugs, and
    // streams the minimal correct final answer. For non-coding or when Gemini key
    // is absent the path degrades to a single-model call with no UX change.
    // KB grounding: retrieve supporting chunks from lumora_kb_chunks (shared
    // Postgres) and append them to the system prompt. Fails open — retrieval
    // errors log and yield [], so Ask Sona answers ungrounded rather than 500s.
    let finalSystem = system;
    // Ground first-person answers in the candidate's OWN prep kit (resume/JD)
    // BEFORE the generic KB. Without this, "tell me about yourself" and any
    // experience question fabricate a persona — the KB is impersonal study
    // material and carries nothing about who the candidate actually is.
    // Deterministic and injected whether or not KB vector retrieval hits.
    //
    // Both lookups are skipped for code turns, and run CONCURRENTLY otherwise.
    // They used to run one after the other on the critical path: a DB read plus
    // an embedding API call plus a pgvector scan, all before the model was
    // contacted. Neither helps a code turn — a résumé cannot fix an off-by-one,
    // and the KB is impersonal study material, so injecting it into a review of
    // the user's own snippet only adds text the model has to ignore.
    if (!isCode) {
      // The web lookup joins the two reads that already block here rather than
      // queueing behind them, so a grounded turn costs max(), not sum(). The KB
      // and the résumé answer "what does this candidate know"; the web answers
      // "what is this thing actually called", and only the third one is gated —
      // see needsWebGrounding.
      const wantsWeb = needsWebGrounding(effectiveMessage);
      const [bgResult, kbResult, webResult] = await Promise.allSettled([
        getCandidateBackground(userId),
        retrieveForAsk(effectiveMessage),
        wantsWeb ? fetchWebFacts(effectiveMessage, geminiKey) : Promise.resolve(null),
      ]);
      if (bgResult.status === 'fulfilled') {
        if (bgResult.value) finalSystem += bgResult.value;
      } else {
        console.error('[Ask] candidate background skipped:', bgResult.reason?.message || bgResult.reason);
      }
      if (kbResult.status === 'fulfilled') {
        const chunks = kbResult.value || [];
        if (chunks.length > 0) {
          finalSystem += formatContext(chunks);
          res.write(`data: ${JSON.stringify({ sources: chunks.map((c) => ({ source: c.source, title: c.topic_title, section: c.section })) })}\n\n`);
        }
      } else {
        console.error('[Ask] KB grounding skipped:', kbResult.reason?.message || kbResult.reason);
      }
      // Fails open by construction: fetchWebFacts resolves to null on a timeout,
      // a billing error or an empty result, and the turn answers ungrounded.
      if (webResult.status === 'fulfilled' && webResult.value) {
        finalSystem += formatWebFacts(webResult.value.text);
        if (webResult.value.sources.length) {
          res.write(`data: ${JSON.stringify({ sources: webResult.value.sources })}\n\n`);
        }
      } else if (webResult.status === 'rejected') {
        console.error('[Ask] web lookup skipped:', webResult.reason?.message || webResult.reason);
      }
    }

    // Review turns skip the draft entirely. Drafting a fresh solution to
    // cross-check against is worth a blocking round trip when the model has to
    // invent an algorithm; when the candidate has already handed us the code,
    // it just delays the first token — and SYS_CODE_DUAL would overwrite the
    // review template and the screenshot instructions on the way past.
    // Also gated on Anthropic: the draft exists to give Claude a second opinion
    // to verify. With Claude off, it would be Gemini cross-checking Gemini for a
    // blocking round trip and no gain.
    if (isCode && !isReview && ANTHROPIC_ENABLED && provider !== 'gemini' && geminiKey) {
      res.write(`data: ${JSON.stringify({ status: 'Drafting with Gemini…' })}\n\n`);
      const draft = await fetchGeminiDraft(effectiveMessage, conversationContext(history, effectiveMessage), geminiKey);
      if (draft) {
        finalSystem = SYS_CODE_DUAL(draft);
        res.write(`data: ${JSON.stringify({ status: 'Verifying with Gemini…' })}\n\n`);
      }
    }

    // ── Non-coding Gemini path (provider toggle in UI) ─────────────────────────
    // No `tools` here on purpose. The search already ran, above, and its
    // findings are in finalSystem; attaching google_search to THIS call is what
    // collapsed the house format. See WEB_FACTS_SYSTEM.
    if (!isCode && useGemini && geminiKey) {
      let geminiOk = false;
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_GENERAL_MODEL}:streamGenerateContent?key=${geminiKey}&alt=sse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // finalSystem, NOT system — this path skipped the candidate
              // background AND the KB grounding, so the Gemini provider answered
              // ungrounded (and fabricated a persona) while Claude did not.
              system_instruction: { parts: [{ text: finalSystem }] },
              contents: geminiContents,
              generationConfig: { maxOutputTokens: 8000, temperature: 0.2, ...NO_THINKING },
            }),
          }
        );
        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          console.error(`[Ask/Gemini] API error ${resp.status}:`, errText.slice(0, 300));
        } else {
          geminiOk = true;
          const reader = resp.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                // Join every part, not parts[0]: a longer reply can split its
                // text across several, and taking only the first drops the rest.
                const text = (JSON.parse(raw).candidates?.[0]?.content?.parts || [])
                  .map((pt) => pt?.text || '').join('');
                if (text) { full += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
              } catch {}
            }
          }
        }
      } catch (geminiErr) {
        console.error('[Ask/Gemini] fetch error:', geminiErr.message);
      }
      if (!geminiOk || !full) full = '';
    }

    // ── Claude primary — code and general alike ───────────────────────────────
    if (ANTHROPIC_ENABLED && !full && provider !== 'gemini') {
      const anthropic = getAnthropic();
      if (!anthropic) {
        console.warn('[Ask/Claude] No Anthropic key — set it in Admin > API Keys or ANTHROPIC_API_KEY. Using Gemini.');
      } else {
        let sent = false;
        try {
          const stream = anthropic.messages.stream({
            model: ASK_ANTHROPIC_MODEL,
            max_tokens: 8000,
            // No `temperature` here on purpose. Sonnet 5 removed the sampling
            // parameters and 400s on them — that is the exact bug that took every
            // live Sona answer down and hid itself behind a fallback.
            system: [{ type: 'text', text: finalSystem, cache_control: { type: 'ephemeral' } }],
            messages: toAnthropicMessages(msgs, imageParts),
          });
          for await (const evt of stream) {
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              sent = true;
              const text = cite.push(evt.delta.text);
              if (text) { full += text; res.write(`data: ${JSON.stringify({ text })}\n\n`); }
            }
          }
        } catch (err) {
          // Only fall through to Gemini when NOTHING reached the browser. Once
          // tokens are on screen, restarting on another model rewrites the answer
          // under the candidate mid-read.
          if (sent) {
            console.error('[Ask/Claude] mid-stream error, keeping partial:', err.message);
          } else {
            console.error('[Ask/Claude] stream error — falling back to Gemini:', err.message);
            full = '';
          }
        }
      }
    }

    // ── Gemini fallback (also the Gemini-only provider path) ──────────────────
    if (!full) {
      let geminiOk = false;
      try {
        const _model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: finalSystem });
        const _msgs = msgs.map(m => (Array.isArray(m.content) ? m.content.map(b => b.text || '').join('') : (m.content || '')));
        // Single user turn: joined text + any pasted screenshots (inlineData).
        const _stream = await _model.generateContentStream({
          contents: [{ role: 'user', parts: [{ text: _msgs.join('\n\n') }, ...imageParts] }],
          generationConfig: { maxOutputTokens: 8000, ...NO_THINKING },
        });
        for await (const chunk of _stream.stream) {
          const token = cite.push(chunk.text());
          if (token) {
            full += token;
            res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
          }
        }
        geminiOk = true;
      } catch (geminiErr) {
        console.error('[Ask/Gemini-final] stream error:', geminiErr.message);
        full = '';
      }

      if (!geminiOk || !full) {
        res.write(`data: ${JSON.stringify({ error: 'AI service is temporarily unavailable. Please try again in a moment.' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
    }

    // Release anything the citation filter was still holding (a trailing
    // fragment that turned out not to be a marker). Without this the last few
    // characters of an answer can go missing.
    const tail = cite.flush();
    if (tail) { full += tail; res.write(`data: ${JSON.stringify({ text: tail })}\n\n`); }

    // Persist assistant reply
    if (userId && convId && full) {
      try {
        await query(
          `INSERT INTO lumora_ask_messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)`,
          [convId, full]
        );
        await query(`UPDATE lumora_ask_conversations SET updated_at = NOW() WHERE id = $1`, [convId]);
      } catch (dbErr) {
        console.error('[Ask] DB reply save error (non-fatal):', dbErr.message);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('ask/stream error:', err);
    try { res.write(`data: ${JSON.stringify({ error: 'Something went wrong.' })}\n\n`); res.end(); } catch {}
  }
});

// GET /history — list recent conversations
router.get('/history', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, provider, updated_at FROM lumora_ask_conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ conversations: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history/:id — messages for a conversation
router.get('/history/:id', async (req, res) => {
  try {
    const { rows: [conv] } = await query(
      `SELECT id FROM lumora_ask_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!conv) return res.status(404).json({ error: 'not found' });
    const { rows } = await query(
      `SELECT role, content, images FROM lumora_ask_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    // Presign each stored screenshot (private bucket) so the browser can load
    // it directly from R2 — no server proxy. jsonb comes back already-parsed.
    const messages = await Promise.all(rows.map(async (r) => {
      const images = Array.isArray(r.images)
        ? await Promise.all(r.images.map(async (im) => ({
            url: await getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: im.key }), { expiresIn: 3600 }),
            mimeType: im.mimeType,
          })))
        : [];
      return { role: r.role, content: r.content, images };
    }));
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /history/:id — delete a single conversation
router.delete('/history/:id', async (req, res) => {
  try {
    const { rows: [conv] } = await query(
      `SELECT id FROM lumora_ask_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!conv) return res.status(404).json({ error: 'not found' });
    await query(`DELETE FROM lumora_ask_messages WHERE conversation_id = $1`, [req.params.id]);
    await query(`DELETE FROM lumora_ask_conversations WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /history — clear all conversations for user
router.delete('/history', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id FROM lumora_ask_conversations WHERE user_id = $1`,
      [req.user.id]
    );
    for (const { id } of rows) {
      await query(`DELETE FROM lumora_ask_messages WHERE conversation_id = $1`, [id]);
    }
    await query(`DELETE FROM lumora_ask_conversations WHERE user_id = $1`, [req.user.id]);
    res.json({ ok: true, deleted: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export { router as askRouter };
