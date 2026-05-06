import { describe, it, expect } from 'vitest';
import { classifyDesignKind } from '../src/services/designKindClassifier.js';

describe('classifyDesignKind', () => {
  it('returns "application" for OOP / LLD style problems', () => {
    expect(classifyDesignKind('Design an LRU Cache')).toBe('application');
    expect(classifyDesignKind('design a parking lot system')).toBe('application');
    expect(classifyDesignKind('design an elevator controller')).toBe('application');
    expect(classifyDesignKind('design a vending machine')).toBe('application');
    expect(classifyDesignKind('design an ATM')).toBe('application');
    expect(classifyDesignKind('design a chess game in OOP')).toBe('application');
    expect(classifyDesignKind('design pattern for a logger')).toBe('application');
  });

  it('returns "application" for API / contract design questions', () => {
    expect(classifyDesignKind('design a REST API for posts')).toBe('application');
    expect(classifyDesignKind('design the API for a payment endpoint')).toBe('application');
    expect(classifyDesignKind('design a graphql schema')).toBe('application');
  });

  it('returns "infrastructure" for infra-component design', () => {
    expect(classifyDesignKind('design a CDN')).toBe('infrastructure');
    expect(classifyDesignKind('design a rate limiter')).toBe('infrastructure');
    expect(classifyDesignKind('design a message queue like Kafka')).toBe('infrastructure');
    expect(classifyDesignKind('design a distributed cache')).toBe('infrastructure');
    expect(classifyDesignKind('design a consistent hashing layer')).toBe('infrastructure');
    expect(classifyDesignKind('design a load balancer')).toBe('infrastructure');
    expect(classifyDesignKind('design a pub/sub system')).toBe('infrastructure');
    expect(classifyDesignKind('design a leader election protocol')).toBe('infrastructure');
  });

  it('returns "system" for distributed / product-system design (the current default)', () => {
    expect(classifyDesignKind('design Twitter')).toBe('system');
    expect(classifyDesignKind('design WhatsApp')).toBe('system');
    expect(classifyDesignKind('design Uber')).toBe('system');
    expect(classifyDesignKind('design Instagram newsfeed')).toBe('system');
    expect(classifyDesignKind('design Netflix')).toBe('system');
    expect(classifyDesignKind('how would you design a ride-sharing app')).toBe('system');
  });

  it('returns "system" as fallback when no keyword matches but design intent is present', () => {
    expect(classifyDesignKind('design something cool')).toBe('system');
    expect(classifyDesignKind('build a scalable platform for stocks')).toBe('system');
  });

  it('uses frontend hint when question text has no cue', () => {
    // No infra/app cue in "design Twitter" → hint decides
    expect(classifyDesignKind('design Twitter', 'application')).toBe('application');
    expect(classifyDesignKind('design Twitter', 'infrastructure')).toBe('infrastructure');
    expect(classifyDesignKind('design Twitter', 'system')).toBe('system');
  });

  it('question-text cues BEAT frontend hint (hint is fallback, not override)', () => {
    // The user is on the /lumora/design page (hint='system') but types
    // "design a CDN" — should still get the infra archetype.
    expect(classifyDesignKind('design a CDN', 'system')).toBe('infrastructure');
    // Inverse: on a coding page (hint='application'), typing
    // "design a distributed cache" should still route to infrastructure.
    expect(classifyDesignKind('design a distributed cache', 'application')).toBe('infrastructure');
    // App cue wins over system hint: LRU on the design page is still LLD.
    expect(classifyDesignKind('design an LRU cache', 'system')).toBe('application');
  });

  it('ignores invalid hints (fail-open to classification + system default)', () => {
    expect(classifyDesignKind('design Twitter', 'made-up')).toBe('system');
    expect(classifyDesignKind('design Twitter', null)).toBe('system');
    expect(classifyDesignKind('design Twitter', '')).toBe('system');
  });

  it('case-insensitive on infrastructure cues', () => {
    expect(classifyDesignKind('Design A CDN For Video Streaming')).toBe('infrastructure');
    expect(classifyDesignKind('DESIGN A RATE LIMITER')).toBe('infrastructure');
  });

  it('infrastructure cues win when both app and infra cues appear (more specific)', () => {
    // "API rate limiter" — infra wins over API
    expect(classifyDesignKind('design an API rate limiter')).toBe('infrastructure');
    // "Kafka client OOP design" — infra wins
    expect(classifyDesignKind('design a kafka producer client in OOP')).toBe('infrastructure');
  });
});
