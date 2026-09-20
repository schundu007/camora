/**
 * The Claude and Gemini tabs are one job answered by two models, so they answer
 * under one brief. These tests lock the two things that actually broke:
 *
 *  - the copies drifted (Gemini carried the coding contract, Claude did not), so
 *    the same question came back in two shapes nobody chose;
 *  - a flow question came back with the application exchange only — "the browser
 *    sends a GET, the server returns HTML" — because the brief capped every
 *    answer at four bullets and a request path is nine hops.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTERVIEW_BRIEF } from '../src/lib/_shared/interviewBrief.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const TWIN = path.resolve(here, '../../ascend-backend/src/lib/_shared/interviewBrief.js');

describe('interview brief', () => {
  it('is byte-identical to the ascend-backend copy', () => {
    // Skipped when only one app is checked out; in the monorepo it is the whole
    // point of the file.
    if (!fs.existsSync(TWIN)) return;
    const mine = fs.readFileSync(path.resolve(here, '../src/lib/_shared/interviewBrief.js'), 'utf8');
    expect(fs.readFileSync(TWIN, 'utf8')).toBe(mine);
  });

  it('names its two jobs so the tab does not drift back to general Q&A', () => {
    expect(INTERVIEW_BRIEF).toContain('CODING and SYSTEM DESIGN');
  });

  it('keeps the coding contract that only one copy used to carry', () => {
    for (const rule of [
      'Import only what you use',
      'Read stdin line by line',
      'Print results in the driver',
      'Familiar beats short',
    ]) {
      expect(INTERVIEW_BRIEF).toContain(rule);
    }
  });

  it('exempts a flow question from the bullet cap', () => {
    expect(INTERVIEW_BRIEF).toContain('A FLOW QUESTION IS A SEQUENCE');
    expect(INTERVIEW_BRIEF).toMatch(/does not\s+apply to a flow question/);
  });

  it('names every hop a "type google.com" answer has to reach', () => {
    // These are the ones a four-bullet answer drops first. Each is the
    // difference between an answer that has been on call and one that has read
    // the docs.
    for (const hop of [
      'recursive resolver', 'authoritative nameserver', 'TTL',   // resolution
      'ARP', 'default gateway', 'NAT',                            // the local hop
      'BGP', 'anycast',                                           // routing
      'TCP handshake', 'QUIC',                                    // transport
      'SNI', 'certificate chain', 'ALPN',                         // TLS
      'CDN PoP', 'load balancer', 'read replicas',                // serving
      'CSSOM', 'render tree', 'composite',                        // browser
    ]) {
      expect(INTERVIEW_BRIEF, `brief must name: ${hop}`).toContain(hop);
    }
  });

  it('asks for the line grammar the renderer lays out', () => {
    // Without this the tabs emit plain prose: the anchor rail never engages and
    // nothing is bolded, because nothing was ever asked for. The renderer can
    // only lay out a skeleton the model actually emits.
    expect(INTERVIEW_BRIEF).toContain('LINE SHAPE');
    expect(INTERVIEW_BRIEF).toContain('**<anchor, 1-3 words>** — <one spoken idea>');
    expect(INTERVIEW_BRIEF).toContain('BOLD THE TERM');
  });

  it('tells the model not to number its own anchors', () => {
    // It used to, and each numbered step became its own rail row beside the
    // number the surface had already drawn.
    expect(INTERVIEW_BRIEF).toContain('Do not number the anchors yourself');
  });

  it('keeps anchors short enough for the rail', () => {
    expect(INTERVIEW_BRIEF).toContain('never a clause and never a question');
  });

  it('spells out the failure it exists to prevent', () => {
    expect(INTERVIEW_BRIEF).toContain('the server returns the HTML');
  });

  it('tells the candidate to offer the interviewer a scope, without waiting', () => {
    expect(INTERVIEW_BRIEF).toContain('OPEN BY OFFERING THE SCOPE');
    expect(INTERVIEW_BRIEF).toContain('Do not stop for the');
    // The scope line is the candidate speaking to the interviewer. The brief
    // must not also license asking the CANDIDATE something — they cannot relay
    // an answer back mid-interview.
    expect(INTERVIEW_BRIEF).toContain('Do not ask the candidate clarifying questions');
  });
});
