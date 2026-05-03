import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/theme/colors';

export function PracticeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.sub}>
          Walk through prep topics on the Prep tab. The interactive coding pad and system-design
          diagrams live on desktop and web — they don't translate to a phone screen.
        </Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Where to code</Text>
          <Text style={styles.noticeBody}>
            Open camora.cariara.com on a laptop, or install the Camora desktop app, for the full
            coding workflow — multi-file editor, run/diff, system-design diagrams.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.sm },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 15, marginTop: spacing.xs },
  notice: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.navy,
  },
  noticeTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  noticeBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
});
