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
