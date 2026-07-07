import { describe, it, expect } from 'vitest';
import { sanitizeEvents, VALID_TYPES, VALID_SEVERITIES } from '../src/routes/proctor.js';

describe('proctor sanitizeEvents', () => {
  it('keeps allowlisted events and drops unknown type/severity', () => {
    const input = [
      { id: 'a', type: 'PASTE', severity: 'medium', ts: 1000, meta: { len: 5 } },
      { id: 'b', type: 'HACK', severity: 'medium', ts: 1001 },
      { id: 'c', type: 'CAMERA_OFF', severity: 'nuclear', ts: 1002 },
      { id: 'd', type: 'TAB_HIDDEN', severity: 'medium', ts: 1003 },
    ];
    const out = sanitizeEvents(input);
    expect(out.map((e) => e.id)).toEqual(['a', 'd']);
    expect(VALID_TYPES.has('CAMERA_OFF')).toBe(true);
    expect(VALID_SEVERITIES.has('info')).toBe(true);
  });

  it('coerces ts to number and drops non-numeric ts', () => {
    const out = sanitizeEvents([{ id: 'x', type: 'COPY', severity: 'low', ts: 'nope' }]);
    expect(out).toEqual([]);
  });
});
