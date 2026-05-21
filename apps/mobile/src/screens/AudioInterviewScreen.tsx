import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Modal, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/AuthContext';
import { startRecording, stopRecording } from '@/lib/audio';
import { transcribeAudio, askSona, type SonaAnswer } from '@/lib/sona';
import { saveSession } from '@/lib/sessions';
import { SAMPLE_TRANSCRIPT, SAMPLE_ANSWER } from '@/data/demoSample';
import { colors, radii, spacing } from '@/theme/colors';

type Phase = 'idle' | 'recording' | 'transcribing' | 'thinking';

const CONSENT_KEY = 'camora.audio_consent_v1';
const MAX_RECORDING_MS = 10 * 60 * 1000; // 10 minutes — hard cap. No auto-loop.

export function AudioInterviewScreen() {
  const { token } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [answer, setAnswer] = useState<SonaAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(CONSENT_KEY).then(v => setHasConsent(v === 'granted'));
  }, []);

  const clearTimers = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (capRef.current) { clearTimeout(capRef.current); capRef.current = null; }
  }, []);

  // Mounting cleanup — if the user unmounts mid-record, make sure we don't
  // leave the mic hot or a setInterval ticking.
  useEffect(() => {
    return () => {
      clearTimers();
      if (phase === 'recording') void stopRecording().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // App-state guard: when the user backgrounds the app mid-record, stop the
  // recording cleanly. iOS's background-audio entitlement keeps the mic
  // technically alive, but reviewers (and most users) expect it to release
  // when they leave the app — we honor that expectation explicitly. A
  // surprise battery drain or the orange "in use" pill is the kind of
  // thing that surfaces in privacy-related rejection rounds.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active' && phase === 'recording') {
        clearTimers();
        void stopRecording().catch(() => {});
        setPhase('idle');
        setError('Recording stopped because the app went to the background.');
      }
    });
    return () => sub.remove();
  }, [phase, clearTimers]);

  const beginRecording = useCallback(async () => {
    setError(null);
    setAnswer(null);
    setTranscript('');
    setElapsedMs(0);
    try {
      await startRecording();
      startedAtRef.current = Date.now();
      setPhase('recording');
      tickRef.current = setInterval(() => {
        if (startedAtRef.current) setElapsedMs(Date.now() - startedAtRef.current);
      }, 250);
      // Hard cap so a forgotten recording can't run forever — battery + privacy.
      capRef.current = setTimeout(() => { void handleStop(true); }, MAX_RECORDING_MS);
    } catch (e: any) {
      setError(e?.message || 'Could not start recording');
      setPhase('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = useCallback(() => {
    if (!hasConsent) {
      setShowConsent(true);
      return;
    }
    void beginRecording();
  }, [hasConsent, beginRecording]);

  const grantConsent = useCallback(async () => {
    await SecureStore.setItemAsync(CONSENT_KEY, 'granted');
    setHasConsent(true);
    setShowConsent(false);
    void beginRecording();
  }, [beginRecording]);

  const handleSample = useCallback(() => {
    setError(null);
    setTranscript(SAMPLE_TRANSCRIPT);
    setAnswer(SAMPLE_ANSWER);
    setPhase('idle');
  }, []);

  const handleStop = useCallback(async (autoCapped = false) => {
    clearTimers();
    if (!token) {
      setError('You must be signed in.');
      setPhase('idle');
      return;
    }
    setPhase('transcribing');
    if (autoCapped) {
      setError(`Recording auto-stopped at ${MAX_RECORDING_MS / 60_000} minutes. Tap Start again to continue.`);
    }
    try {
      const uri = await stopRecording();
      if (!uri) { setPhase('idle'); return; }
      const t = await transcribeAudio(uri, token);
      const text = (t.text || '').trim();
      setTranscript(text || '(no speech detected)');
      if (!text) { setPhase('idle'); return; }
      setPhase('thinking');
      // Stream tokens into a placeholder answer as they arrive. The final
      // structured answer (with parsed sections) replaces it when the
      // server emits the `answer` event.
      setAnswer({ raw: '' });
      const a = await askSona(text, {
        token,
        onProgress: (acc) => setAnswer({ raw: acc }),
      });
      setAnswer(a);
      setPhase('idle');
      void saveSession({
        question: text,
        answer: a.raw ?? '',
        duration: startedAtRef.current ? Date.now() - startedAtRef.current : 0,
        createdAt: Date.now(),
      });
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      setPhase('idle');
    }
  }, [token, clearTimers]);

  const recording = phase === 'recording';
  const busy = phase === 'transcribing' || phase === 'thinking';
  const buttonLabel = recording ? 'Stop' : busy ? phaseLabel(phase) : 'Start listening';
  const onPress = recording ? () => handleStop(false) : busy ? undefined : handleStart;

  const elapsedLabel = formatDuration(elapsedMs);
  const remainingLabel = formatDuration(Math.max(0, MAX_RECORDING_MS - elapsedMs));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {recording && (
        <View style={styles.recordingBanner} accessibilityLiveRegion="polite">
          <View style={styles.recordingDotPulse} />
          <Text style={styles.recordingBannerText}>Recording — {elapsedLabel}</Text>
          <Text style={styles.recordingBannerMeta}>auto-stops in {remainingLabel}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Live Notes</Text>
        <Text style={styles.sub}>
          Camora records audio when you tap below, transcribes what's said, and surfaces relevant
          material from your study library. Put any call on speaker so the mic picks up both sides.
        </Text>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Best results</Text>
          <Text style={styles.tipBody}>• Use speakerphone, or a Bluetooth headset</Text>
          <Text style={styles.tipBody}>• Keep the phone within arm's length</Text>
          <Text style={styles.tipBody}>• For video calls or screen sharing, use the desktop app</Text>
        </View>

        <Pressable
          style={[styles.recordBtn, recording && styles.recordBtnActive, busy && styles.recordBtnBusy]}
          onPress={onPress}
          disabled={busy}
          accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
        >
          {busy ? <ActivityIndicator color="#fff" /> : (
            <View style={[styles.recordDot, recording && styles.recordDotActive]} />
          )}
          <Text style={styles.recordText}>{buttonLabel}</Text>
        </Pressable>

        {!recording && !busy && (
          <Pressable style={styles.sampleBtn} onPress={handleSample} accessibilityLabel="Try a sample">
            <Text style={styles.sampleText}>Try a sample (no recording)</Text>
          </Pressable>
        )}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>Transcript</Text>
          <Text style={transcript ? styles.transcriptText : styles.transcriptEmpty}>
            {transcript || (recording ? 'Listening…' : 'Tap Start to begin.')}
          </Text>
        </View>

        <View style={styles.sonaBox}>
          <Text style={styles.sonaLabel}>From your library</Text>
          {phase === 'thinking' && <Text style={styles.sonaEmpty}>Looking up your library…</Text>}
          {!answer && phase !== 'thinking' && (
            <Text style={styles.sonaEmpty}>
              Camora surfaces material you've already studied that's relevant to what was said.
            </Text>
          )}
          {answer && <SonaAnswerView answer={answer} />}
        </View>
      </ScrollView>

      <Modal visible={showConsent} transparent animationType="fade" onRequestClose={() => setShowConsent(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Before you start</Text>
            <Text style={styles.modalBody}>
              Camora records audio from your phone's microphone so it can transcribe what's said.
              Recording another person without consent is regulated in many places.
            </Text>
            <Text style={styles.modalBody}>
              By tapping Continue, you confirm that anyone within range has been informed that audio
              is being captured and that you have the legal right to record.
            </Text>
            <Text style={styles.modalBody}>
              Recording auto-stops after {MAX_RECORDING_MS / 60_000} minutes. You can stop earlier any time.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowConsent(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalContinue} onPress={grantConsent}>
                <Text style={styles.modalContinueText}>I understand — continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function phaseLabel(p: Phase): string {
  if (p === 'transcribing') return 'Transcribing…';
  if (p === 'thinking') return 'Looking up your library…';
  return 'Working…';
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function SonaAnswerView({ answer }: { answer: SonaAnswer }) {
  const summary = answer.parsed?.summary;
  const sections = answer.parsed?.sections;
  const raw = answer.raw;

  if (sections && sections.length > 0) {
    return (
      <View>
        {summary && <Text style={styles.sonaSummary}>{summary}</Text>}
        {sections.map((s, i) => (
          <View key={i} style={{ marginTop: spacing.md }}>
            {s.title && <Text style={styles.sonaSectionTitle}>{s.title}</Text>}
            {s.content && <Text style={styles.sonaSectionBody}>{s.content}</Text>}
          </View>
        ))}
      </View>
    );
  }
  if (summary || raw) return <Text style={styles.sonaSectionBody}>{summary || raw}</Text>;
  return <Text style={styles.sonaEmpty}>Nothing in your library matched this clip.</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  recordingDotPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  recordingBannerText: { color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 },
  recordingBannerMeta: { color: '#FECACA', fontSize: 12 },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.xs },
  tipBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  tipTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  tipBody: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.navy,
    marginTop: spacing.md,
  },
  recordBtnActive: { backgroundColor: colors.danger },
  recordBtnBusy: { opacity: 0.7 },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', opacity: 0.85 },
  recordDotActive: { opacity: 1 },
  recordText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  sampleBtn: {
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sampleText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  errorBox: {
    backgroundColor: '#2A1517',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, lineHeight: 19 },
  transcriptBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  transcriptLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  transcriptEmpty: { color: colors.textMuted, fontSize: 14 },
  transcriptText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  sonaBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.navy,
    minHeight: 140,
  },
  sonaLabel: { color: colors.navySoft, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  sonaEmpty: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  sonaSummary: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  sonaSectionTitle: { color: colors.navySoft, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.xs },
  sonaSectionBody: { color: colors.text, fontSize: 15, lineHeight: 22 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 420,
    width: '100%',
    gap: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  modalBody: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  modalCancel: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
  modalContinue: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
  },
  modalContinueText: { color: '#fff', fontWeight: '600' },
});
