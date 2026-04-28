/**
 * Audio preferences — what mic to record from, what speakers to play
 * sound through, and which method to use to capture the interviewer's
 * voice. Shared by AudioSetupWizard, InterviewerAudioProvider, and the
 * candidate-mic AudioCapture so all three honor the same choices.
 *
 * Persisted to localStorage immediately for instant reload and synced
 * to the backend (lumora_audio_preferences) so the choices follow the
 * user across devices and browsers.
 */

const STORAGE_KEY = 'lumora_audio_prefs_v1';

export type CaptureMethod = 'auto' | 'electron-loopback' | 'tab-share' | 'virtual-mic' | 'mic-only';

export interface AudioPreferences {
  /** How interviewer audio is captured. `auto` picks the best path. */
  captureMethod: CaptureMethod;
  /** Selected candidate-mic device (audioinput). null = system default. */
  micDeviceId: string | null;
  /** Selected output device for sound test / future Sona TTS. null = default. */
  speakerDeviceId: string | null;
  /** When captureMethod is virtual-mic, which audioinput is the loopback. */
  virtualMicDeviceId: string | null;
  /** True once the user finished the wizard. Suppresses auto-prompt. */
  setupCompleted: boolean;
  /** True after the live verification saw audio on the interviewer stream
   *  at least once. We use this for a "re-verify next session?" nudge. */
  lastKnownGood: boolean;
}

const DEFAULTS: AudioPreferences = {
  captureMethod: 'auto',
  micDeviceId: null,
  speakerDeviceId: null,
  virtualMicDeviceId: null,
  setupCompleted: false,
  lastKnownGood: false,
};

export function loadAudioPrefs(): AudioPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAudioPrefs(prefs: AudioPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent('lumora:audio-prefs-updated'));
  } catch {}
}

export function patchAudioPrefs(patch: Partial<AudioPreferences>): AudioPreferences {
  const next = { ...loadAudioPrefs(), ...patch };
  saveAudioPrefs(next);
  return next;
}

/**
 * Open the AudioSetupWizard from anywhere — used by the icon-rail
 * "Audio check" entry. The wizard listens to this custom event and
 * force-opens, replacing the legacy AudioCheckModal that opened a
 * concurrent getUserMedia stream and could clash with active capture.
 */
export const OPEN_AUDIO_WIZARD_EVENT = 'lumora:open-audio-wizard';

export function requestAudioSetup(): void {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_AUDIO_WIZARD_EVENT));
  } catch {}
}

/* ── Environment + virtual-mic detection ─────────────────────────────── */

export function isElectron(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Electron/i.test(navigator.userAgent);
}

export function supportsTabShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !!navigator.mediaDevices?.getDisplayMedia;
}

/**
 * Heuristic: does this audioinput look like a system-loopback virtual
 * device the user installed (BlackHole, VoiceMeeter, Loopback, etc.)?
 * If yes, picking it as the candidate "mic" actually captures system
 * audio — i.e., the interviewer's voice — without any browser tab
 * sharing. Power users on the Zoom/Teams desktop client routinely
 * route their meeting audio to one of these to record. */
const VIRTUAL_MIC_PATTERN =
  /(BlackHole|VoiceMeeter|Loopback|VB[- ]?Audio|VB[- ]?Cable|CABLE Output|Soundflower|iShowU|Aggregate|Multi-Output|Stereo Mix|What U Hear|WhatUHear)/i;

export function isVirtualMicLabel(label: string | undefined | null): boolean {
  if (!label) return false;
  return VIRTUAL_MIC_PATTERN.test(label);
}

export function findVirtualMic(devices: { deviceId: string; label: string }[]):
  { deviceId: string; label: string } | null {
  return devices.find((d) => isVirtualMicLabel(d.label)) || null;
}

/**
 * Decide the best capture method for the current environment + device
 * inventory. Used when the user picks "auto".
 *
 *   1. Electron desktop app → native loopback via getDisplayMedia
 *      (the renderer code is identical to tab-share; main.js
 *      intercepts and returns audio:'loopback').
 *   2. A virtual-mic device is plugged in → use it. Works for users
 *      on the native Zoom/Teams client who already have BlackHole
 *      or VoiceMeeter wired up.
 *   3. Browser supports getDisplayMedia → tab-share.
 *   4. Anything else → mic-only fallback (server-side diarization
 *      tries to filter the candidate's voice from the mic stream).
 */
export function pickAutoMethod(
  devices: { deviceId: string; label: string }[],
): Exclude<CaptureMethod, 'auto'> {
  if (isElectron()) return 'electron-loopback';
  if (findVirtualMic(devices)) return 'virtual-mic';
  if (supportsTabShare()) return 'tab-share';
  return 'mic-only';
}
