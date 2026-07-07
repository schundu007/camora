import { describe, it, expect } from 'vitest';
import { evaluate, INITIAL_STATE } from './enforcement';
import type { ProctorEvent } from './types';

const ev = (type: ProctorEvent['type'], severity: ProctorEvent['severity'] = 'medium'): ProctorEvent =>
  ({ id: Math.random().toString(36), type, severity, ts: 1 });

describe('proctor enforcement', () => {
  it('camera-off pauses immediately', () => {
    const r = evaluate(ev('CAMERA_OFF', 'high'), INITIAL_STATE);
    expect(r.actions).toContain('pause');
    expect(r.state.cameraDown).toBe(true);
  });

  it('blur warns each time and flags after 3', () => {
    let state = INITIAL_STATE;
    const first = evaluate(ev('WINDOW_BLUR'), state); state = first.state;
    const second = evaluate(ev('WINDOW_BLUR'), state); state = second.state;
    const third = evaluate(ev('WINDOW_BLUR'), state); state = third.state;
    expect(first.actions).toContain('warn');
    expect(first.actions).not.toContain('flag');
    expect(third.actions).toContain('flag');
  });

  it('fullscreen exit blocks, multi-monitor blocks', () => {
    expect(evaluate(ev('FULLSCREEN_EXIT'), INITIAL_STATE).actions).toContain('block');
    expect(evaluate(ev('MULTI_MONITOR', 'high'), INITIAL_STATE).actions).toContain('block');
  });

  it('high severity contributes more score than low', () => {
    const high = evaluate(ev('DEVTOOLS', 'high'), INITIAL_STATE).scoreDelta;
    const low = evaluate(ev('COPY', 'low'), INITIAL_STATE).scoreDelta;
    expect(high).toBeGreaterThan(low);
  });
});
