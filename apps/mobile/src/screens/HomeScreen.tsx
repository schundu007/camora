import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { getSessions, type Session } from '@/lib/sessions';
import { colors, radii, spacing } from '@/theme/colors';

function greet(name?: string | null): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const first = name?.split(' ')[0];
  return first ? `Good ${part}, ${first}` : `Good ${part}`;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function formatDate(ts: number): string {
  const diffDays = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    getSessions().then(s => { setSessions(s); setLoaded(true); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh after returning from a Live session
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const totalSessions = sessions.length;
  const totalMs = sessions.reduce((acc, s) => acc + s.duration, 0);
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekCount = sessions.filter(s => s.createdAt >= weekStart).length;
  const recent = sessions.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{greet(user?.name)}</Text>
        <Text style={styles.sub}>Your interview sessions</Text>

        {/* Start session CTA */}
        <Pressable
          style={({ pressed }) => [styles.ctaCard, pressed && styles.ctaCardPressed]}
          onPress={() => navigation.navigate('Live')}
        >
          <View style={styles.ctaInner}>
            <Text style={styles.ctaLabel}>Live Notes</Text>
            <Text style={styles.ctaTitle}>Start a session</Text>
            <Text style={styles.ctaHint}>Put your call on speaker — Sona listens and answers</Text>
          </View>
          <Text style={styles.ctaArrow}>›</Text>
        </Pressable>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{weekCount}</Text>
            <Text style={styles.statLabel}>This week</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{totalMs > 0 ? formatDuration(totalMs) : '—'}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
        </View>

        {/* Recent sessions */}
        <Text style={styles.sectionTitle}>Recent sessions</Text>

        {loaded && recent.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyBody}>
              Start a live session above. Sona's answers will appear here after each session.
            </Text>
          </View>
        )}

        {recent.length > 0 && (
          <View style={styles.sessionList}>
            {recent.map(s => (
              <View key={s.id} style={styles.sessionRow}>
                <View style={styles.sessionMeta}>
                  <Text style={styles.sessionDate}>{formatDate(s.createdAt)}</Text>
                  <Text style={styles.sessionDuration}>{formatDuration(s.duration)}</Text>
                </View>
                <Text style={styles.sessionQuestion} numberOfLines={2}>{s.question}</Text>
                {s.answer ? (
                  <Text style={styles.sessionAnswer} numberOfLines={2}>{s.answer}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },

  greeting: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  sub: { color: colors.textMuted, fontSize: 14, marginTop: -spacing.sm + 2 },

  ctaCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaCardPressed: { opacity: 0.82 },
  ctaInner: { flex: 1 },
  ctaLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  ctaTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  ctaHint: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, lineHeight: 18 },
  ctaArrow: { color: colors.gold, fontSize: 32, fontWeight: '300', marginLeft: spacing.md },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionTitle: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  emptyBody: { color: colors.textFaint, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.sm },

  sessionList: { gap: spacing.md },
  sessionRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sessionMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  sessionDate: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  sessionDuration: { color: colors.textFaint, fontSize: 12 },
  sessionQuestion: { color: colors.text, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  sessionAnswer: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
