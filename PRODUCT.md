# Product

## Register

product

## Users

Job seekers — primarily software engineers — preparing for technical interviews at top-tier companies. They use Camora during the 2–6 week study period before an interview loop, often in focused evening sessions at a desk with good lighting. Some are anxious about a specific upcoming interview; others are continuously sharpening skills between job searches. A secondary segment uses Lumora during live interviews, requiring fast, confident answers under pressure.

## Product Purpose

Camora is an AI-powered interview platform combining two products: Capra (interview preparation: 1,400+ curated topics across DSA, system design, behavioral, LLD, databases, SRE, and DevOps) and Lumora (real-time AI interview assistant: live transcription + AI-generated answers during a live interview). The Prepare surface is where users study: browse topic categories, read topic deep-dives, and practice problems. Success is a user who walks into an interview loop feeling genuinely prepared — not just "I read some stuff," but "I know this material."

## Brand Personality

Sharp, authoritative, efficient. The product respects the user's time. It does not entertain; it equips. Think: a very good textbook that also knows your weaknesses.

## Anti-references

- LeetCode: cluttered, gamified, visually noisy, outdated design
- HackerRank: bureaucratic, depressing UI, low information density
- Generic SaaS "Academy" products: pastel cards, emoji bullets, feels like kindergarten
- Notion-style wikis: all structure, no hierarchy, everything looks equal weight
- Dark-mode neon: "developer tool" aesthetic that screams side project, not premium product

## Design Principles

1. **Hierarchy before decoration.** The topic name, its difficulty, and its structure should be immediately legible without effort. Decoration that doesn't carry information gets removed.
2. **Respect the reading experience.** Topic pages are long-form content. Typography, measure, and spacing must make sustained reading comfortable, not just scannable.
3. **Density that earns trust.** Camora has 1,400+ topics. The grid should feel comprehensive and organized, not overwhelming. Density is a feature when it's controlled.
4. **Nothing screams "made with AI."** Every layout decision should feel considered — asymmetric where it helps, structured where it aids comprehension.
5. **The brand palette is an asset.** Navy (#26619C) and gold (#C9A227) are distinctive. Use them with intent: navy for structure, gold for signal and momentum. `DESIGN.md` and `apps/camora/src/styles/globals.css` are the source of truth for exact values.

## Accessibility & Inclusion

WCAG AA minimum. Focus states must be visible. Reduced motion should disable all decorative transitions. Color must not be the sole carrier of meaning (difficulty levels need text labels, not just color).
