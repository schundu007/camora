import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { colors, radii, spacing } from '@/theme/colors';

export function AudioInterviewScreen() {
  const [recording, setRecording] = useState(false);

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
          style={[styles.recordBtn, recording && styles.recordBtnActive]}
          onPress={() => setRecording(r => !r)}
        >
          <View style={[styles.recordDot, recording && styles.recordDotActive]} />
          <Text style={styles.recordText}>{recording ? 'Stop listening' : 'Start listening'}</Text>
        </Pressable>

        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>Live transcript</Text>
          <Text style={styles.transcriptEmpty}>
            {recording ? 'Listening…' : 'Tap Start to begin.'}
          </Text>
        </View>

        <View style={styles.sonaBox}>
          <Text style={styles.sonaLabel}>Sona</Text>
          <Text style={styles.sonaEmpty}>
            Sona's answers appear here when a question is detected.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.md },
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
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', opacity: 0.85 },
  recordDotActive: { opacity: 1 },
  recordText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  transcriptBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  transcriptLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  transcriptEmpty: { color: colors.textMuted, fontSize: 14 },
  sonaBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.navy,
    minHeight: 120,
  },
  sonaLabel: { color: colors.navySoft, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  sonaEmpty: { color: colors.textMuted, fontSize: 14 },
});
