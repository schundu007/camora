/**
 * Ask Sona citation-marker leak.
 *
 * The bug: retrieved KB chunks were numbered `[1]`…`[6]` in the system prompt,
 * and the model printed those indices back into the answer as "[Ref 3]" /
 * "[Ref 6]" — markers the candidate reads out loud that point at nothing.
 *
 * Two defences, both pinned here: the prompt no longer carries an index to
 * cite, and a stream filter removes labelled markers the model invents anyway.
 */
import { describe, it, expect, vi } from 'vitest';
import { formatContext, createCitationStripper, getCandidateBackground } from '../src/services/askRetrieval.js';
import { query } from '../src/config/database.js';

vi.mock('../src/config/database.js', () => ({ query: vi.fn() }));

const chunks = [
  { source: 'capra-devops', topic_title: 'Release Manifests', section: 'keyConcepts', content: 'A manifest pins a SHA per repo.' },
  { source: 'capra-sre', topic_title: 'Promote on Green', section: 'howItWorks', content: 'CI moves the LKG pointer.' },
];

const drain = (strip, tokens) => tokens.map((t) => strip.push(t)).join('') + strip.flush();

describe('formatContext', () => {
  it('gives the model nothing numbered to cite', () => {
    const out = formatContext(chunks);
    // The instructions above the chunks quote "[3]" as the thing not to emit,
    // so only the chunk block itself is checked for an index to cite.
    const body = out.slice(out.indexOf('SOURCE —'));
    expect(body).not.toMatch(/\[\d+\]/);
    expect(out).toContain('SOURCE — Release Manifests — keyConcepts');
    expect(out).toContain('A manifest pins a SHA per repo.');
  });

  it('falls back to the source id when a chunk has no title', () => {
    expect(formatContext([{ source: 'capra-sre', section: 'gotchas', content: 'x' }]))
      .toContain('SOURCE — capra-sre — gotchas');
  });

  it('returns nothing when retrieval came back empty', () => {
    expect(formatContext([])).toBe('');
    expect(formatContext(null)).toBe('');
  });
});

describe('createCitationStripper', () => {
  it('removes the leaked marker and the space after it', () => {
    const strip = createCitationStripper();
    expect(drain(strip, ['[Ref 3] Engineers then build against that LKG.']))
      .toBe('Engineers then build against that LKG.');
  });

  it('removes a marker split across SSE tokens', () => {
    // This is the case a per-chunk .replace() misses entirely.
    const strip = createCitationStripper();
    expect(drain(strip, ['CI builds ', '[Ref', ' 6]', ' candidate manifests.']))
      .toBe('CI builds candidate manifests.');
  });

  it('handles every label and shape the model reaches for', () => {
    const cases = [
      ['a [Refs 3, 6] b', 'a b'],
      ['a [Reference: 2] b', 'a b'],
      ['a [Source 4] b', 'a b'],
      ['a (Ref 3) b', 'a b'],
      ['a [KB 1] b', 'a b'],
      ['a [Context #5] b', 'a b'],
    ];
    for (const [input, want] of cases) {
      expect(drain(createCitationStripper(), [input])).toBe(want);
    }
  });

  it('never eats the candidate\'s own code', () => {
    // A bare index carries no label, so it is out of scope by construction —
    // this is the whole reason the label word is required.
    const code = 'for i in range(n):\n    out.append(grid[3][i])  # arr[3] stays\n';
    expect(drain(createCitationStripper(), [code])).toBe(code);
  });

  it('leaves markdown links and unrelated brackets alone', () => {
    const md = 'See [the runbook](https://x/y) and [Note 3 things] here.';
    expect(drain(createCitationStripper(), [md])).toBe(md);
  });

  it('releases a held fragment that never became a marker', () => {
    const strip = createCitationStripper();
    // Ends mid-bracket: held back, then flushed rather than dropped.
    expect(drain(strip, ['done [Ref'])).toBe('done [Ref');
  });

  it('does not stall on a long bracket that is not a marker', () => {
    const strip = createCitationStripper();
    const long = `[${'x'.repeat(60)}`;
    expect(strip.push(long)).toBe(long);
  });

  it('survives the stream arriving one character at a time', () => {
    const answer = '[Ref 6] "Promote-on-green" moves the manifest. [Ref 3] Then build.';
    const strip = createCitationStripper();
    expect(drain(strip, answer.split('')))
      .toBe('"Promote-on-green" moves the manifest. Then build.');
  });
});

/**
 * The JD used to live inside the "this is who I am" block, so Sona told a live
 * interviewer "at Intuit, we set SLOs on critical dependency metrics" — for a
 * candidate who has never worked at Intuit and was sitting in their interview.
 */
describe('getCandidateBackground', () => {
  const prepState = (doc) => ({
    rows: [{ data: { activeCompany: 'Intuit', data: { Intuit: doc } } }],
  });

  // No mockReset between tests: vitest 4 re-surfaces a reset mock's thrown
  // error as an unhandled rejection even when the caller catches it. Every
  // test below sets its own implementation, so a reset buys nothing.

  it('keeps the target company out of the identity block', async () => {
    query.mockResolvedValue(prepState({
      resume: 'Staff SRE at Acme. Cut p99 from 900ms to 210ms.',
      jd: 'Intuit is hiring an SRE to own SLOs for payment services.',
    }));
    const out = await getCandidateBackground('u1');

    const identity = out.slice(out.indexOf('CANDIDATE BACKGROUND'), out.indexOf('TARGET ROLE'));
    expect(identity).toContain('Staff SRE at Acme');
    expect(identity).not.toContain('Intuit is hiring');

    const target = out.slice(out.indexOf('TARGET ROLE'));
    expect(target).toContain('Intuit is hiring');
    expect(target).toContain("INTERVIEWER'S company, NOT an employer");
    expect(target).toContain('never worked there');
    expect(target).toContain('Never write "at Intuit, we…"');
  });

  it('groups the cover letter with the resume, not the JD', async () => {
    query.mockResolvedValue(prepState({
      resume: 'Staff SRE at Acme.',
      coverLetter: 'I led the on-call rotation at Acme.',
      jd: 'Intuit SRE role.',
    }));
    const out = await getCandidateBackground('u1');
    const identity = out.slice(0, out.indexOf('TARGET ROLE'));
    expect(identity).toContain('I led the on-call rotation at Acme.');
  });

  it('emits no target-role block when there is no JD', async () => {
    query.mockResolvedValue(prepState({ resume: 'Staff SRE at Acme.' }));
    const out = await getCandidateBackground('u1');
    expect(out).toContain('CANDIDATE BACKGROUND');
    expect(out).not.toContain('TARGET ROLE');
  });

  it('frames the JD as requirements, not as work already done', async () => {
    query.mockResolvedValue(prepState({ resume: 'Staff SRE at Acme.', jd: 'Owns SLOs for payments.' }));
    const target = (await getCandidateBackground('u1')).split('TARGET ROLE')[1];
    expect(target).toContain('REQUIREMENTS the role is asking for');
    expect(target).toContain('NOT a record of work the candidate has done');
  });

  it('emits no identity block when only a JD was uploaded', async () => {
    // The failure this prevents: with no resume, the JD was the ONLY material
    // under "this is who I am" — every first-person claim came from the
    // interviewer's own job posting.
    query.mockResolvedValue(prepState({ jd: 'Intuit SRE role.' }));
    const out = await getCandidateBackground('u1');
    expect(out).not.toContain('CANDIDATE BACKGROUND — this is who');
    expect(out).toContain('TARGET ROLE');
    // …and it must not point at a background block that isn't there.
    expect(out).not.toContain('out of the CANDIDATE BACKGROUND above');
  });

  it('answers ungrounded rather than throwing when prep state is missing', async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await getCandidateBackground('u1')).toBe('');
  });

  it('answers ungrounded rather than throwing when the DB is down', async () => {
    query.mockImplementation(async () => { throw new Error('db down'); });
    expect(await getCandidateBackground('u1')).toBe('');
  });
});
