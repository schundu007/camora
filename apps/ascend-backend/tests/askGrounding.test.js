/**
 * Which Ask turns get Google Search.
 *
 * The bug these pin down: asked how to upgrade the GCC toolchain in GitHub
 * Actions, Sona answered `uses: actions/setup-cpp@v1`. The action exists; the
 * owner does not — it is `aminya/setup-cpp`. The model held the name, lost the
 * owner, and filled the gap with the commonest marketplace prefix. Gemini
 * answering the same question inside Google Search got it right, because it
 * looked it up.
 *
 * So the detector has one job: send the turns whose answer contains a checkable
 * identifier to search, and leave everything else on the fast path.
 */
import { describe, it, expect } from 'vitest';
import { needsWebGrounding, looksLikeCodeTask } from '../src/routes/ask.js';

describe('needsWebGrounding', () => {
  it('grounds the question that produced the wrong action name', () => {
    expect(needsWebGrounding('how to upgrade gcc tool chains to build cpp projects in git actions')).toBe(true);
  });

  it('grounds a question naming tools it has to spell exactly', () => {
    expect(needsWebGrounding('i am looking for any tools like clang-tidy, cppcheck, gcc analyzer, sonarcloud etc..')).toBe(true);
  });

  it('grounds anything resolved by a registry or marketplace', () => {
    expect(needsWebGrounding('which github action do I use to cache bazel output')).toBe(true);
    expect(needsWebGrounding('what goes in uses: for the checkout step')).toBe(true);
    expect(needsWebGrounding('is there a helm chart for cert-manager')).toBe(true);
    expect(needsWebGrounding('apt install what to get a newer compiler')).toBe(true);
  });

  it('grounds anything that turns on how current it is', () => {
    expect(needsWebGrounding('is Docker Compose v1 still supported')).toBe(true);
    expect(needsWebGrounding('what is the latest stable Kubernetes release')).toBe(true);
    expect(needsWebGrounding('has PodSecurityPolicy been deprecated')).toBe(true);
  });

  it('grounds a named tool with a version or an operational ask', () => {
    expect(needsWebGrounding('how do I pin terraform to 1.9 in CI')).toBe(true);
    expect(needsWebGrounding('how to configure prometheus remote write')).toBe(true);
    expect(needsWebGrounding('steps to migrate from ArgoCD to Flux')).toBe(true);
  });

  // The veto is absolute. These answers come from the candidate's own
  // background; searching the web for them can only pull the answer somewhere
  // they cannot honestly follow.
  it('never grounds a behavioral or personal turn', () => {
    expect(needsWebGrounding('tell me about yourself')).toBe(false);
    expect(needsWebGrounding('tell me about a time you disagreed with your tech lead')).toBe(false);
    expect(needsWebGrounding('describe a conflict you had on a Kubernetes migration')).toBe(false);
    expect(needsWebGrounding('walk me through your experience with terraform')).toBe(false);
    expect(needsWebGrounding('why do you want to work here')).toBe(false);
    expect(needsWebGrounding('what is your greatest weakness')).toBe(false);
  });

  // The model answers these correctly from what it already knows, and a search
  // round trip in front of the first token is pure cost mid-interview.
  it('leaves concept questions on the fast path', () => {
    expect(needsWebGrounding('what is a race condition')).toBe(false);
    expect(needsWebGrounding('difference between 401 and 403')).toBe(false);
    expect(needsWebGrounding('explain eventual consistency')).toBe(false);
    expect(needsWebGrounding('how would you design a rate limiter')).toBe(false);
  });

  // Ordinary hyphenated English is not a product name. Without the stoplist,
  // "trade-offs" reads as a tool and buys a search with nothing to find.
  it('does not mistake hyphenated English for a tool name', () => {
    expect(needsWebGrounding('how do you think about trade-offs in a design review')).toBe(false);
    expect(needsWebGrounding('how would you set up an end-to-end on-call rotation')).toBe(false);
  });

  // The grounded branch only runs on the prose side of the handler. If either
  // of the reported questions routed to the code template instead, the whole
  // fix would sit behind an `if` that never fires.
  it('the questions it grounds actually reach the prose branch', () => {
    expect(looksLikeCodeTask('how to upgrade gcc tool chains to build cpp projects in git actions')).toBe(false);
    expect(looksLikeCodeTask('i am looking for any tools like clang-tidy, cppcheck, gcc analyzer, sonarcloud etc..')).toBe(false);
  });

  it('handles empty and whitespace input', () => {
    expect(needsWebGrounding('')).toBe(false);
    expect(needsWebGrounding('   ')).toBe(false);
    expect(needsWebGrounding()).toBe(false);
  });
});
