import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ProctorProvider, useProctor } from './ProctorProvider';
import { proctorApi } from './api';

vi.mock('./api', () => ({
  proctorApi: {
    createSession: vi.fn().mockResolvedValue({ id: 'sess-1' }),
    sendEvents: vi.fn().mockResolvedValue({ inserted: 1 }),
    endSession: vi.fn().mockResolvedValue({ ok: true }),
    getSession: vi.fn(), listSessions: vi.fn(),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let hook: ReturnType<typeof useProctor>;
const Probe = () => { hook = useProctor(); return null; };

let activeRoot: ReturnType<typeof createRoot> | null = null;
let activeContainer: HTMLDivElement | null = null;

const mount = async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<ProctorProvider surface="coding"><Probe /></ProctorProvider>);
  });
  activeRoot = root;
  activeContainer = container;
  return { root, container };
};

describe('ProctorProvider', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // Each provider instance wires listeners onto the shared window/document.
  // Unmount after every test so a leftover listener from one test can't fire
  // during (and pollute) a later test's assertions.
  afterEach(async () => {
    if (activeRoot) {
      // stop() removes the detector listeners; unmounting alone does not.
      await act(async () => { await hook?.stop(); });
      await act(async () => { activeRoot!.unmount(); });
      activeRoot = null;
    }
    if (activeContainer) {
      activeContainer.remove();
      activeContainer = null;
    }
  });

  it('opens a session on start() and records a blur without pausing', async () => {
    await mount();
    await act(async () => { await hook.start(); });
    expect(proctorApi.createSession).toHaveBeenCalledWith('coding');
    expect(hook.paused).toBe(false);
    await act(async () => { window.dispatchEvent(new Event('blur')); });
    expect(hook.events.some((e) => e.type === 'WINDOW_BLUR')).toBe(true);
    expect(hook.paused).toBe(false);
  });

  it('does not create duplicate sessions when start() is called concurrently', async () => {
    await mount();
    await act(async () => {
      await Promise.all([hook.start(), hook.start()]);
    });
    expect(proctorApi.createSession).toHaveBeenCalledTimes(1);
  });

  it('resets risk/events when a new session starts after stop()', async () => {
    await mount();
    await act(async () => { await hook.start(); });
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('blur'));
    });
    expect(hook.events.length).toBeGreaterThan(0);
    expect(hook.riskScore).toBeGreaterThan(0);

    await act(async () => { await hook.stop(); });
    await act(async () => { await hook.start(); });

    // A fresh start() legitimately fires its own info-severity
    // checkDisplays() event (0 risk weight), so we assert on the
    // absence of the *stale* WINDOW_BLUR events/risk rather than an
    // exact events.length === 0.
    expect(hook.events.some((e) => e.type === 'WINDOW_BLUR')).toBe(false);
    expect(hook.riskScore).toBe(0);
  });

  it('acquires webcam on start; camera-off pauses, unmute resumes', async () => {
    const fakeTrack = new EventTarget() as unknown as MediaStreamTrack;
    (fakeTrack as unknown as { readyState: string }).readyState = 'live';
    (fakeTrack as unknown as { muted: boolean }).muted = false;
    (fakeTrack as unknown as { stop: () => void }).stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getVideoTracks: () => [fakeTrack],
      getTracks: () => [fakeTrack],
    } as unknown as MediaStream);
    const original = (navigator as unknown as { mediaDevices?: unknown }).mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    try {
      await mount();
      await act(async () => { await hook.start(); });
      expect(getUserMedia).toHaveBeenCalledWith({ video: true });
      expect(hook.paused).toBe(false);
      await act(async () => { fakeTrack.dispatchEvent(new Event('mute')); });
      expect(hook.paused).toBe(true);
      await act(async () => { fakeTrack.dispatchEvent(new Event('unmute')); });
      expect(hook.paused).toBe(false);
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: original });
    }
  });
});
