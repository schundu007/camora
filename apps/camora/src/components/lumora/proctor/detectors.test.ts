import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDetectors } from './detectors';

describe('proctor detectors', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('emits WINDOW_BLUR on window blur', () => {
    const emit = vi.fn();
    const d = createDetectors(emit);
    d.start();
    window.dispatchEvent(new Event('blur'));
    d.stop();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'WINDOW_BLUR' }));
  });

  it('emits PASTE on document paste', () => {
    const emit = vi.fn();
    const d = createDetectors(emit);
    d.start();
    document.dispatchEvent(new Event('paste'));
    d.stop();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'PASTE' }));
  });

  it('emits WINDOW_BLUR with an integer ts (floored performance.now())', () => {
    const emit = vi.fn();
    const d = createDetectors(emit);
    d.start();
    window.dispatchEvent(new Event('blur'));
    d.stop();
    const call = emit.mock.calls.find(([e]) => e.type === 'WINDOW_BLUR');
    expect(call).toBeTruthy();
    expect(Number.isInteger(call[0].ts)).toBe(true);
  });

  it('stop() removes listeners', () => {
    const emit = vi.fn();
    const d = createDetectors(emit);
    d.start();
    emit.mockClear();
    d.stop();
    window.dispatchEvent(new Event('blur'));
    expect(emit).not.toHaveBeenCalled();
  });
});
