import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const mount = async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<ProctorProvider surface="coding"><Probe /></ProctorProvider>);
  });
  return { root, container };
};

describe('ProctorProvider', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('opens a session on start() and records a blur without pausing', async () => {
    await mount();
    await act(async () => { await hook.start(); });
    expect(proctorApi.createSession).toHaveBeenCalledWith('coding');
    expect(hook.paused).toBe(false);
    await act(async () => { window.dispatchEvent(new Event('blur')); });
    expect(hook.events.some((e) => e.type === 'WINDOW_BLUR')).toBe(true);
    expect(hook.paused).toBe(false);
  });
});
