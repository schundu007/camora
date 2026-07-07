import type { ProctorEvent, ProctorEventType, Severity } from './types';

type Emit = (e: Omit<ProctorEvent, 'id'>) => void;

interface DetectorOpts {
  cameraTrack?: MediaStreamTrack;
}

const now = () => (typeof performance !== 'undefined' ? Math.floor(performance.now()) : 0);

export const createDetectors = (emit: Emit, opts: DetectorOpts = {}) => {
  const fire = (type: ProctorEventType, severity: Severity, meta?: Record<string, unknown>) =>
    emit({ type, severity, ts: now(), meta });

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') fire('TAB_HIDDEN', 'medium');
  };
  const onBlur = () => fire('WINDOW_BLUR', 'medium');
  const onFullscreen = () => {
    if (!document.fullscreenElement) fire('FULLSCREEN_EXIT', 'medium');
  };
  const onCopy = () => fire('COPY', 'low');
  const onPaste = (e: Event) => {
    const len = (e as ClipboardEvent).clipboardData?.getData('text')?.length ?? 0;
    fire('PASTE', 'medium', { len });
  };
  const onCameraEnded = () => fire('CAMERA_OFF', 'high');

  const checkDisplays = async () => {
    try {
      const anyScreen = window.screen as unknown as { isExtended?: boolean };
      if (anyScreen?.isExtended) { fire('MULTI_MONITOR', 'high'); return; }
      const getScreenDetails = (window as unknown as {
        getScreenDetails?: () => Promise<{ screens: unknown[] }>;
      }).getScreenDetails;
      if (getScreenDetails) {
        const details = await getScreenDetails();
        if (details.screens.length > 1) fire('MULTI_MONITOR', 'high');
      } else {
        fire('UNSUPPORTED', 'info', { signal: 'multi_monitor' });
      }
    } catch {
      fire('UNSUPPORTED', 'info', { signal: 'multi_monitor' });
    }
  };

  const checkAutomation = () => {
    if ((navigator as unknown as { webdriver?: boolean }).webdriver) {
      fire('AUTOMATION', 'high');
    }
  };

  const start = () => {
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    if (opts.cameraTrack) {
      opts.cameraTrack.addEventListener('ended', onCameraEnded);
      opts.cameraTrack.addEventListener('mute', onCameraEnded);
    }
    void checkDisplays();
    checkAutomation();
  };

  const stop = () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('fullscreenchange', onFullscreen);
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('paste', onPaste);
    if (opts.cameraTrack) {
      opts.cameraTrack.removeEventListener('ended', onCameraEnded);
      opts.cameraTrack.removeEventListener('mute', onCameraEnded);
    }
  };

  return { start, stop };
};
