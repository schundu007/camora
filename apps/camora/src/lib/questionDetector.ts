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
  'we ', "we're ", 'were ', 'our ', 'ours ',
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
];

/**
 * True if the utterance is a known Whisper hallucination — phantom
 * transcription that must be discarded before any auto-submit.
 */
function isWhisperHallucination(raw: string): boolean {
  const text = (raw || '').trim().toLowerCase();
  if (!text) return false;
  // Exact-match the whole transcript against a known hallucination.
  if (WHISPER_HALLUCINATIONS.includes(text)) return true;
  // Pure punctuation / dots
  if (/^[.\s]+$/.test(text)) return true;
  // Single repeated word (e.g. "you you you you")
  if (/^(\S+)(\s+\1)+$/i.test(text)) return true;
  return false;
}

/**
 * True if the utterance looks like something Sona should attempt to answer.
 */
export function isQuestion(raw: string): boolean {
  const text = (raw || '').trim().toLowerCase();
  if (!text) return false;

  // Whisper hallucination filter (silence / noise produces phantom
  // "Thanks for watching" / "Subscribe" / "Bye" transcripts) — these
  // must NEVER hit the LLM or the answer panel fills with nonsense.
  if (isWhisperHallucination(text)) return false;

  // Too short to be a meaningful question ("ok", "yeah sure", etc.)
  if (text.length < 12) return false;
  if (text.split(/\s+/).length < 4) return false;

  // Ends with "?" — obvious question
  if (text.endsWith('?')) return true;

  // Background / small-talk openers — explicit no
  if (BACKGROUND_STARTERS.some((s) => text.startsWith(s))) {
    // But: if the SAME utterance also contains a clear interview verb
    // later on ("I think — how would you handle this?"), let it through.
    if (INTERVIEW_VERBS_ANYWHERE.some((v) => text.includes(v))) return true;
    return false;
  }

  // Starts with a question word or interview imperative
  if (QUESTION_STARTERS.some((s) => text.startsWith(s))) return true;

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
  if (text.split(/\s+/).length < 4) return { isQuestion: false, reason: 'too few words' };
  if (text.endsWith('?')) return { isQuestion: true, reason: 'ends with ?' };
  if (BACKGROUND_STARTERS.some((s) => text.startsWith(s))) {
    if (INTERVIEW_VERBS_ANYWHERE.some((v) => text.includes(v))) {
      return { isQuestion: true, reason: 'background opener but contains interview verb' };
    }
    return { isQuestion: false, reason: 'background / small-talk opener' };
  }
  if (QUESTION_STARTERS.some((s) => text.startsWith(s))) {
    return { isQuestion: true, reason: 'question-word opener' };
  }
  if (INTERVIEW_VERBS_ANYWHERE.some((v) => text.includes(v))) {
    return { isQuestion: true, reason: 'interview verb phrase' };
  }
  return { isQuestion: false, reason: 'no question signal' };
}
