/**
 * Tests for buildDesignPrompt's archetype branching.
 *
 * Doesn't test that Claude generates a "correct" answer — that's an
 * eval problem. Tests that the prompt CONTAINS the right per-archetype
 * instructions. If the prompt forgets to branch, we get the same
 * generic answer for every problem (which is the bug we're fixing).
 */
import { describe, it, expect } from 'vitest';
import { buildDesignPrompt } from '../src/services/claude.js';

const RESUME = 'I led the platform team at Stripe.';
const TECH = 'Postgres, Kafka, K8s.';

describe('buildDesignPrompt — system (default, current behavior)', () => {
  const p = buildDesignPrompt(RESUME, TECH, 'standard', 'aws', 'system');

  it('includes the core distributed-system layers', () => {
    expect(p).toMatch(/CDN.*LB.*App.*Cache.*DB|6-8 layers/i);
  });

  it('includes SCALEMATH and SCALECALC sections (capacity-driven)', () => {
    expect(p).toContain('[SCALEMATH]');
    expect(p).toContain('[SCALECALC]');
  });

  it('frames DEEPDESIGN as multi-tier infra layers', () => {
    expect(p).toMatch(/LAYER|6-8 layers/);
  });
});

describe('buildDesignPrompt — application (LLD/OOP)', () => {
  const p = buildDesignPrompt(RESUME, TECH, 'standard', 'aws', 'application');

  it('omits SCALEMATH/SCALECALC (no capacity math for OOP design)', () => {
    expect(p).not.toContain('[SCALEMATH]');
    expect(p).not.toContain('[SCALECALC]');
  });

  it('frames DEEPDESIGN around classes / data model / patterns / concurrency', () => {
    expect(p).toContain('[DEEPDESIGN]');
    expect(p).toMatch(/class|API|data model|design pattern|concurrency/i);
  });

  it('does NOT instruct CDN/LB/Cache/DB layering', () => {
    // The LRU-cache test: don't tell it to draw a CDN
    expect(p).not.toMatch(/CDN.*LB.*App.*Cache.*DB/i);
    expect(p).not.toMatch(/6-8 layers covering CDN/);
  });

  it('still includes HEADLINE / REQUIREMENTS / TRADEOFFS / EDGECASES (renderer-known sections)', () => {
    expect(p).toContain('[HEADLINE]');
    expect(p).toContain('[REQUIREMENTS]');
    expect(p).toContain('[TRADEOFFS]');
    expect(p).toContain('[EDGECASES]');
  });
});

describe('buildDesignPrompt — infrastructure (component design)', () => {
  const p = buildDesignPrompt(RESUME, TECH, 'standard', 'aws', 'infrastructure');

  it('keeps SCALEMATH (throughput/latency are first-class for infra)', () => {
    expect(p).toContain('[SCALEMATH]');
  });

  it('frames DEEPDESIGN around data plane / control plane / partitioning / replication', () => {
    expect(p).toContain('[DEEPDESIGN]');
    expect(p).toMatch(/data plane|control plane|partition|replication|consistency model/i);
  });

  it('does NOT instruct multi-tier app stack (no app server / cache-aside layering)', () => {
    expect(p).not.toMatch(/6-8 layers covering CDN/);
  });
});

describe('buildDesignPrompt — backward compat', () => {
  it('treats undefined designKind as system (no regression on existing callers)', () => {
    const oldCall = buildDesignPrompt(RESUME, TECH, 'standard', 'aws');
    const explicitSystem = buildDesignPrompt(RESUME, TECH, 'standard', 'aws', 'system');
    expect(oldCall).toBe(explicitSystem);
  });

  it('treats unknown designKind as system (fail-open)', () => {
    const fallback = buildDesignPrompt(RESUME, TECH, 'standard', 'aws', 'made-up');
    const explicitSystem = buildDesignPrompt(RESUME, TECH, 'standard', 'aws', 'system');
    expect(fallback).toBe(explicitSystem);
  });
});
