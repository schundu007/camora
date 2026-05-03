import { Audio } from 'expo-av';

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopping';

let active: Audio.Recording | null = null;

async function ensurePermission(): Promise<void> {
  const perm = await Audio.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Microphone permission denied');
}

export async function startRecording(): Promise<void> {
  if (active) throw new Error('Recording already in progress');
  await ensurePermission();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    interruptionModeIOS: 1, // DoNotMix
    interruptionModeAndroid: 1, // DoNotMix
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  const rec = new Audio.Recording();
  // m4a/aac on iOS, mp4/aac on Android — Whisper accepts both.
  await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await rec.startAsync();
  active = rec;
}

/** Stops the active recording and returns the local file URI. */
export async function stopRecording(): Promise<string | null> {
  if (!active) return null;
  const rec = active;
  active = null;
  try {
    await rec.stopAndUnloadAsync();
  } catch {
    // already stopped
  }
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  return rec.getURI();
}

export function isRecording(): boolean {
  return active !== null;
}
