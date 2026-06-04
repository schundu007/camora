/**
 * Sentence-boundary buffering for real-time TTS streaming.
 *
 * Pattern from awesome-llm-apps voice_ai_agents: rather than waiting for the
 * full LLM answer, detect sentence boundaries in the token stream and flush
 * each complete sentence immediately to TTS. This cuts audio latency from
 * "wait for full answer" (~8-15s) to "first sentence plays" (~1-2s).
 *
 * Usage:
 *   const buffer = new SentenceStreamBuffer(sentence => playTTS(sentence));
 *   // on each token from SSE:
 *   buffer.push(token);
 *   // on stream end:
 *   buffer.flush();
 */

const SENTENCE_END = /[.!?](\s|$)/;
const MIN_SENTENCE_CHARS = 20; // avoid flushing on "e.g." or "Dr."

export class SentenceStreamBuffer {
  private buf = '';
  private readonly onSentence: (s: string) => void;

  constructor(onSentence: (sentence: string) => void) {
    this.onSentence = onSentence;
  }

  push(token: string): void {
    this.buf += token;
    let match: RegExpExecArray | null;
    // Find the last sentence boundary in the accumulated buffer
    while ((match = SENTENCE_END.exec(this.buf)) !== null) {
      const end = match.index + 1; // include the punctuation
      const sentence = this.buf.slice(0, end).trim();
      this.buf = this.buf.slice(end);
      if (sentence.length >= MIN_SENTENCE_CHARS) {
        this.onSentence(sentence);
      }
    }
  }

  /** Call when the token stream ends to flush any remaining partial sentence. */
  flush(): void {
    const remainder = this.buf.trim();
    if (remainder.length > 0) {
      this.onSentence(remainder);
    }
    this.buf = '';
  }
}

/**
 * Strip markdown artifacts from a sentence before sending to TTS.
 * Removes bold markers, backticks, and bracket tags that sound wrong when read aloud.
 */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')    // **bold** → bold
    .replace(/`([^`]+)`/g, '$1')         // `code` → code
    .replace(/\[\/?\w+(?:\s+\w+=\w+)?\]/g, '') // [HEADLINE] tags
    .replace(/\s+/g, ' ')
    .trim();
}
