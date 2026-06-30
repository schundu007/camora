/**
 * Heuristic question filter for interview voice input.
 *
 * Lumora streams the interviewer's voice, transcribes it, then fires the
 * LLM. Problem: a lot of what the interviewer says isn't a question —
 * it's small talk, their introduction, their career narrative, or filler.
 * Firing the LLM on that wastes tokens, adds latency, and pollutes the
 * answer panel with irrelevant responses.
 *
 * This module answers one question: "Is this utterance something Sona
 * should answer?" It runs locally (no API call, no latency) and only
 * suppresses auto-submission — the transcript is always visible in the
 * input so the candidate can manually hit Enter if the heuristic is
 * wrong.
 *
 * Defaults favor *precision over recall*: when unsure, skip. Missing an
 * occasional question is acceptable (the candidate can click send);
 * wasting a 3-second LLM call on a monologue is not.
 */

const QUESTION_STARTERS = [
  // Interrogatives
  'how', 'what', 'why', 'when', 'where', 'who', 'which', 'whose',
  "what's", "what're", "whats", 'whats',
  "how's", 'hows',
  // Auxiliaries
  'could you', 'would you', 'can you', 'will you', 'should you',
  'do you', 'did you', 'have you', 'are you', 'is it', 'was it',
  'were you', 'were there', 'is there', 'are there',
  // Interview-specific openers
  'tell me', 'walk me through', 'walk us through', 'give me',
  'let me ask', 'let us ask', "i'd like you to", 'id like you to',
  "i'd like to ask", "i'd want you to",
  // Imperative interview prompts (behave like questions in practice)
  'explain', 'describe', 'design', 'implement', 'write', 'code',
  'build', 'model', 'optimize', 'analyze', 'compare', 'contrast',
  'discuss', 'consider', 'draw', 'sketch', 'show me', 'solve',
  'outline', 'trace', 'derive', 'prove', 'estimate',
  // Framing words that usually precede a question
  'suppose', 'imagine', 'assume', "let's say", 'lets say',
  'picture this', 'say we have', 'given that',
];

const BACKGROUND_STARTERS = [
  // First-person narrative (interviewer or candidate self-description)
  'i ', "i'm ", 'im ', "i've ", 'ive ', "i'll ", 'ill ',
  'i was', 'i am', 'i have', 'i work', 'i worked',
  'my ', 'mine ', 'myself ',
  'we ', "we're ", 'our ', 'ours ',
  // Pleasantries and acknowledgments
  'thanks', 'thank you', 'hi ', 'hi,', 'hello', 'hey',
  'nice to meet', 'good to meet', 'pleasure',
  'sure ', 'sure,', 'okay', 'ok ', 'ok,', 'yeah', 'yep', 'yup',
  'sounds good', 'got it', 'right,', "that's right", 'thats right',
  'exactly', 'correct', 'absolutely', 'definitely',
  // Transitional filler
  'so yeah', 'so like', 'um ', 'uh ', 'well ', 'well,',
  'alright', 'all right',
];

const INTERVIEW_VERBS_ANYWHERE = [
  'how would you', 'how do you', "what's your approach",
  'design a', 'design the', 'implement a', 'implement the',
  'walk me through', 'walk us through', 'tell me about',
  'explain the', 'explain how', 'what is the',
  'given an', 'given a', 'given two',
  'let me ask',
  // Behavioral question phrases (past-tense story prompts)
  'what did you', 'how did you', 'what was your', 'what were you',
  'have you ever', 'can you give', 'could you give', 'tell us about',
  'take me through', 'take us through',
  'talk me through', 'talk us through',
];

// One-word sentence-initial fillers that precede the actual question.
// Strip these before applying start-based checks so "And what did you
// learn?" and "So how would you handle that?" are detected correctly.
const FILLER_PREFIXES = [
  'and ', 'so ', 'now ', 'right ', 'okay ', 'ok ',
  'alright ', 'well ', 'but ', 'though ', 'then ',
];

/**
 * Whisper hallucinations — phantom transcriptions Whisper produces on
 * silence or unclear audio. Trained heavily on YouTube, so it falls back
 * to common outros/outtros when the audio is ambiguous. These never
 * reflect anything the interviewer actually said and must NOT be sent
 * to Sona, or the answer panel fills with nonsense.
 *
 * Match is whole-utterance (the transcript is exactly or nearly this);
 * substring matching would false-positive on legitimate "thanks" mid-
 * sentence in a real interview.
 */
const WHISPER_HALLUCINATIONS = [
  'thanks for watching',
  'thank you for watching',
  'thanks for watching!',
  'thank you for watching!',
  'thanks for watching.',
  'thank you for watching.',
  'thank you',
  'thank you.',
  'thank you!',
  'thanks',
  'thanks.',
  'thanks!',
  'thank you so much',
  'thank you so much.',
  'thank you very much',
  'thank you very much.',
  'subscribe to my channel',
  'please subscribe',
  'like and subscribe',
  'don\'t forget to subscribe',
  'see you next time',
  'see you in the next video',
  'see you',
  'see you next',
  'bye',
  'bye.',
  'bye!',
  'bye-bye',
  'goodbye',
  'goodbye.',
  'i love you',
  'i love you.',
  'okay bye',
  'okay, bye',
  'okay, bye.',
  'thanks for listening',
  'thank you for listening',
  'thanks for joining',
  'thank you for joining',
  '[music]',
  '[applause]',
  '[silence]',
  '[laughter]',
  '...',
  '. . .',
  '..',
  // Screen-share / presentation hallucinations: Whisper hears slide-change
  // sounds or silence and loops these phrases.
  'the next slide is the slide',
  'the next slide is a little bit more',
  'the next slide is a little bit',
  'the next slide is',
  'next slide please',
  'next slide',
  'mmhmm',
  'mm-hmm',
  'mhm',
];

/**
 * True if the utterance is a repeated short phrase — Whisper on silence
 * often produces the same 4-6 word fragment dozens of times.
 * Catches "the next slide is the slide. the next slide is the slide."
 * even though exact-match won't (it's multi-sentence now).
 */
function hasRepeatedPhrase(text: string): boolean {
  const clean = text.replace(/[.,!?;:\-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const words = clean.split(' ');
  if (words.length < 6) return false;

  // Slide-change loop: "the next slide" appearing 2+ times is always garbage
  if ((clean.match(/the next slide/g) || []).length >= 2) return true;

  // Any 3-6 word phrase repeating 3+ times
  for (let len = 3; len <= 6; len++) {
    for (let i = 0; i <= words.length - len * 2; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (!phrase.trim()) continue;
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = (clean.match(new RegExp(escaped, 'g')) || []).length;
      if (count >= 3) return true;
    }
  }
  return false;
}

/**
 * True if the utterance looks like garbled slide-text Whisper is
 * hallucinating from screen audio. Signature: high density of single-
 * or two-character tokens like "T4, TI-664, TPEM, T5, vLT, RPC".
 */
function isGarbled(text: string): boolean {
  const tokens = text.replace(/[.,!?;:\-]+/g, ' ').trim().split(/\s+/);
  if (tokens.length < 5) return false;
  const shortCount = tokens.filter(t => t.length <= 3).length;
  return shortCount / tokens.length > 0.65;
}

/**
 * True if the utterance contains garbled tokens characteristic of Whisper
 * hallucinating slide/screen content: digit-letter mixing ("RRf0", "WF3HV2"),
 * 4+ consecutive consonants ("kNjihru", "zbbzb"), or 3+ repeated chars.
 * Even a few such tokens in short text is a strong garbage signal.
 */
function hasGarbageTokens(text: string): boolean {
  const tokens = text.replace(/[.,!?;:\-]+/g, ' ').trim().split(/\s+/);
  if (tokens.length < 3) return false;
  const garbageCount = tokens.filter(t =>
    /[a-z]\d|\d[a-z]/i.test(t) ||
    /^[bcdfghjklmnpqrstvwxyz]{4,}$/i.test(t) ||
    /(.)\1{2,}/i.test(t)
  ).length;
  // 2+ garbage tokens in short text, or >20% in longer text
  return tokens.length <= 10 ? garbageCount >= 2 : garbageCount / tokens.length > 0.2;
}

/**
 * True if the utterance is a known Whisper hallucination — phantom
 * transcription that must be discarded before any auto-submit.
 */
function isWhisperHallucination(raw: string): boolean {
  const text = (raw || '').trim().toLowerCase();
  if (!text) return false;
  if (WHISPER_HALLUCINATIONS.includes(text)) return true;
  // Pure punctuation / dots
  if (/^[.\s]+$/.test(text)) return true;
  // Single repeated word (e.g. "you you you you")
  if (/^(\S+)(\s+\1)+$/i.test(text)) return true;
  // Repeated mmhmm with punctuation variants ("Mmhmm. Mmhmm. Mmhmm.")
  if (/^(mm+h*m+\.?\s*)+$/i.test(text)) return true;
  // Repeated-phrase loop (slide-change hallucination)
  if (hasRepeatedPhrase(text)) return true;
  // Garbled slide-text dump (short token density)
  if (isGarbled(text)) return true;
  // Garbled via digit-letter mixing / consecutive consonants
  if (hasGarbageTokens(text)) return true;
  return false;
}

/**
 * Interviewer wrap-up patterns — the interviewer is closing the session
 * and asking the CANDIDATE if they have questions. Sona must not answer.
 */
const INTERVIEW_CLOSE_PATTERNS = [
  /do you have any(?:\s+last(?:\s+minute)?)?\s+questions?\s+for\s+(?:me|us)/i,
  /(?:we(?:'re|\s+are)|i(?:'m|\s+am))\s+(?:at|out of)\s+time/i,
  /went by very fast/i,
  /thank you for (?:sharing|your time|meeting|joining|taking the time)/i,
  /nice (?:meeting|talking to|speaking with) you/i,
  /we(?:'ll|\s+will)\s+(?:be\s+in touch|reach out|get back to you)/i,
];

/**
 * True if the utterance looks like something Sona should attempt to answer.
 */
export function isQuestion(raw: string): boolean {
  const text = (raw || '').trim().toLowerCase();
  if (!text) return false;

  // Whisper hallucination filter (silence / noise produces phantom
  // "Thanks for watching" / "Subscribe" / "Bye" / "The next slide" transcripts)
  // — these must NEVER hit the LLM or the answer panel fills with nonsense.
  if (isWhisperHallucination(text)) return false;

  // Too short to be a meaningful question ("ok", "yeah sure", etc.)
  if (text.length < 12) return false;

  // Interviewer wrapping up — "do you have any questions for me?" is directed
  // at the candidate, not a question Sona should answer.
  if (INTERVIEW_CLOSE_PATTERNS.some(p => p.test(text))) return false;

  // Utterances that trail off with a pleasantry ("...? Thank you very much.")
  // are background conversation — interviewer wrapping up small talk or
  // thanking someone else. Block even when the text starts with a question word.
  if (/(?:thank you|thanks|thank u)(?:\s+(?:very|so)\s+much)?[\s.,!]*$/i.test(text)) return false;

  // Ends with "?" — strong signal, but require at least 5 words so bare fragments
  // like "What are you?" or "So, D?" don't auto-fire Sona. Exception: classic
  // short interview prompts that start with a question word are fine at 3+ words.
  if (text.endsWith('?')) {
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 5) return true;
    if (wordCount >= 3 && QUESTION_STARTERS.some(s => text.startsWith(s))) return true;
    if (wordCount >= 3 && INTERVIEW_VERBS_ANYWHERE.some(v => text.includes(v))) return true;
    // Too short and no clear interview signal — fall through to further checks
  }

  if (text.split(/\s+/).length < 4) return false;

  // Strip one-word sentence-initial fillers ("And what did you learn?"
  // should match "what" even though it starts with "and ").
  let stripped = text;
  for (const p of FILLER_PREFIXES) {
    if (stripped.startsWith(p)) { stripped = stripped.slice(p.length); break; }
  }

  // Background / small-talk openers — explicit no
  if (BACKGROUND_STARTERS.some((s) => stripped.startsWith(s))) {
    // But: if the SAME utterance also contains a clear interview verb
    // later on ("I think — how would you handle this?"), let it through.
    if (INTERVIEW_VERBS_ANYWHERE.some((v) => text.includes(v))) return true;
    return false;
  }

  // Starts with a question word or interview imperative (check stripped)
  if (QUESTION_STARTERS.some((s) => stripped.startsWith(s))) return true;

  // Contains an interview verb phrase anywhere
  if (INTERVIEW_VERBS_ANYWHERE.some((v) => text.includes(v))) return true;

  // Default: unclear — don't auto-fire the LLM. The transcript is still
  // shown in the input and the candidate can send manually.
  return false;
}

/**
 * Debug helper — returns the reason a string was classified the way it was.
 * Useful for surfacing "not detected as a question" hints in the UI.
 */
export function questionReason(raw: string): { isQuestion: boolean; reason: string } {
  const text = (raw || '').trim().toLowerCase();
  if (!text) return { isQuestion: false, reason: 'empty' };
  if (isWhisperHallucination(text)) return { isQuestion: false, reason: 'whisper hallucination' };
  if (text.length < 12) return { isQuestion: false, reason: 'too short' };
  if (INTERVIEW_CLOSE_PATTERNS.some(p => p.test(text))) return { isQuestion: false, reason: 'interview close / wrap-up' };
  if (/(?:thank you|thanks|thank u)(?:\s+(?:very|so)\s+much)?[\s.,!]*$/i.test(text)) return { isQuestion: false, reason: 'pleasantry close' };
  if (text.endsWith('?')) return { isQuestion: true, reason: 'ends with ?' };
  if (text.split(/\s+/).length < 4) return { isQuestion: false, reason: 'too few words' };
  let strippedQ = text;
  for (const p of FILLER_PREFIXES) {
    if (strippedQ.startsWith(p)) { strippedQ = strippedQ.slice(p.length); break; }
  }
  if (BACKGROUND_STARTERS.some((s) => strippedQ.startsWith(s))) {
    if (INTERVIEW_VERBS_ANYWHERE.some((v) => text.includes(v))) {
      return { isQuestion: true, reason: 'background opener but contains interview verb' };
    }
    return { isQuestion: false, reason: 'background / small-talk opener' };
  }
  if (QUESTION_STARTERS.some((s) => strippedQ.startsWith(s))) {
    return { isQuestion: true, reason: 'question-word opener' };
  }
  if (INTERVIEW_VERBS_ANYWHERE.some((v) => text.includes(v))) {
    return { isQuestion: true, reason: 'interview verb phrase' };
  }
  return { isQuestion: false, reason: 'no question signal' };
}
