import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/theme/colors';

export function PracticeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.sub}>Pick a problem to review. Coding pad lives on the desktop app.</Text>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Coding on mobile?</Text>
          <Text style={styles.noticeBody}>
            For full coding interviews — multi-file editor, run/diff, system-design diagrams —
            use the Camora desktop app or camora.cariara.com on a laptop.
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
