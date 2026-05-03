import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { startRecording, stopRecording } from '@/lib/audio';
import { transcribeAudio, askSona, type SonaAnswer } from '@/lib/sona';
import { colors, radii, spacing } from '@/theme/colors';

type Phase = 'idle' | 'recording' | 'transcribing' | 'thinking';

export function AudioInterviewScreen() {
  const { token } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [answer, setAnswer] = useState<SonaAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setError(null);
    setAnswer(null);
    setTranscript('');
    try {
      await startRecording();
      setPhase('recording');
    } catch (e: any) {
      setError(e?.message || 'Could not start recording');
      setPhase('idle');
    }
  }, []);

  const handleStop = useCallback(async () => {
    if (!token) {
      setError('You must be signed in.');
      setPhase('idle');
      return;
    }
    setPhase('transcribing');
    try {
      const uri = await stopRecording();
      if (!uri) {
        setPhase('idle');
        return;
      }
      const t = await transcribeAudio(uri, token);
      const text = (t.text || '').trim();
      setTranscript(text || '(no speech detected)');
      if (!text) {
        setPhase('idle');
        return;
      }
      setPhase('thinking');
      const a = await askSona(text, token);
      setAnswer(a);
      setPhase('idle');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
      setPhase('idle');
    }
  }, [token]);

  const recording = phase === 'recording';
  const busy = phase === 'transcribing' || phase === 'thinking';
  const buttonLabel = recording ? 'Stop & ask Sona' : busy ? phaseLabel(phase) : 'Start listening';

  const onPress = recording ? handleStop : busy ? undefined : handleStart;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Audio Interview</Text>
        <Text style={styles.sub}>
          Sona listens through your phone's mic. Put the call on speaker so both voices are picked up.
        </Text>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Best results</Text>
          <Text style={styles.tipBody}>• Use speakerphone, or a Bluetooth headset</Text>
          <Text style={styles.tipBody}>• Keep the phone within arm's length</Text>
          <Text style={styles.tipBody}>• For video / screen share, use the desktop app</Text>
        </View>

        <Pressable
          style={[
            styles.recordBtn,
            recording && styles.recordBtnActive,
            busy && styles.recordBtnBusy,
          ]}
          onPress={onPress}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : (
            <View style={[styles.recordDot, recording && styles.recordDotActive]} />
          )}
          <Text style={styles.recordText}>{buttonLabel}</Text>
        </Pressable>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>Question (transcript)</Text>
          <Text style={transcript ? styles.transcriptText : styles.transcriptEmpty}>
            {transcript || (recording ? 'Listening…' : 'Tap Start to begin.')}
          </Text>
        </View>

        <View style={styles.sonaBox}>
          <Text style={styles.sonaLabel}>Sona</Text>
          {phase === 'thinking' && <Text style={styles.sonaEmpty}>Thinking…</Text>}
          {!answer && phase !== 'thinking' && (
            <Text style={styles.sonaEmpty}>
              Sona's answer appears here when a question is detected.
            </Text>
          )}
          {answer && <SonaAnswerView answer={answer} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function phaseLabel(p: Phase): string {
  if (p === 'transcribing') return 'Transcribing…';
  if (p === 'thinking') return 'Sona is thinking…';
  return 'Working…';
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
  return <Text style={styles.sonaEmpty}>Sona returned an empty answer.</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
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
  sonaEmpty: { color: colors.textMuted, fontSize: 14 },
  sonaSummary: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  sonaSectionTitle: { color: colors.navySoft, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.xs },
  sonaSectionBody: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
