import { describe, it, expect } from 'vitest';
import { classifyDoc } from './LumoraDocsPanel';

/* One intake box replaced four named cards, so this function decides which
   backend field a document lands in. Getting it wrong is not cosmetic: a
   resume classified as 'other' goes to `documentation`, which
   getCandidateBackground never reads, and every first-person answer loses its
   grounding. Both regressions below were real. */
describe('classifyDoc', () => {
  it('reads the filename through underscores', () => {
    // \b does not fire inside "DevOps_Resume" — _ is a word character, and
    // this is the single most common resume filename shape.
    expect(classifyDoc('Sudhakar_Ch_Senior_DevOps_Resume.docx', 'x')).toBe('resume');
    expect(classifyDoc('cover_letter.docx', 'x')).toBe('cover');
    expect(classifyDoc('nvidia-jd.txt', 'x')).toBe('jd');
    expect(classifyDoc('my.cv.pdf', 'x')).toBe('resume');
  });

  it('matches body markers that end in a colon', () => {
    // A trailing \b after ':' needs a word char next; a space follows.
    expect(classifyDoc('untitled.txt', 'Responsibilities: own the platform')).toBe('jd');
    expect(classifyDoc('untitled.txt', 'Education: BSc\nCertifications: CKA')).toBe('resume');
  });

  it('falls back to other when both sides match', () => {
    expect(classifyDoc('x.txt', 'Responsibilities: ...\nWork experience: ...')).toBe('other');
  });

  it('falls back to other for unremarkable text', () => {
    expect(classifyDoc('notes.md', 'etcd uses raft for consensus.')).toBe('other');
  });

  it('reads a cover letter from its opening line', () => {
    expect(classifyDoc('untitled.txt', 'Dear Hiring Manager, I am excited')).toBe('cover');
    expect(classifyDoc('untitled.txt', "I'm writing to apply for the role")).toBe('cover');
  });

  it('prefers the filename over the body', () => {
    // The user named it. That is not a guess.
    expect(classifyDoc('Resume.pdf', 'Responsibilities: own the platform')).toBe('resume');
  });
});
