import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radii, spacing } from '@/theme/colors';

const SECTIONS = [
  { key: 'dsa', title: 'Data Structures & Algorithms', count: 'Browse topics' },
  { key: 'system', title: 'System Design', count: 'Browse topics' },
  { key: 'behavioral', title: 'Behavioral', count: 'Browse topics' },
  { key: 'company', title: 'Company-specific prep', count: 'Browse topics' },
];

export function PrepScreen() {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.greeting}>Hi {user?.name?.split(' ')[0] || 'there'}</Text>
        <Text style={styles.title}>Prep</Text>
        <Text style={styles.sub}>Study on the go. Your progress syncs with the web app.</Text>
        <View style={{ height: spacing.lg }} />
        {SECTIONS.map(s => (
          <Pressable key={s.key} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardSub}>{s.count}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.sm },
  greeting: { color: colors.textMuted, fontSize: 14 },
  title: { color: colors.text, fontSize: 32, fontWeight: '700', marginTop: spacing.xs },
  sub: { color: colors.textMuted, fontSize: 15, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  cardSub: { color: colors.textFaint, fontSize: 13, marginTop: spacing.xs },
});
