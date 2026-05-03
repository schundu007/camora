import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { WEB_APP_URL } from '@/lib/env';
import { colors, radii, spacing } from '@/theme/colors';

export function AccountScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.email}</Text>
          {user?.name && <Text style={styles.muted}>{user.name}</Text>}
        </View>

        <Pressable style={styles.row} onPress={() => Linking.openURL(`${WEB_APP_URL}/account`)}>
          <Text style={styles.rowText}>Manage subscription on web</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => Linking.openURL(`${WEB_APP_URL}/desktop`)}>
          <Text style={styles.rowText}>Get the desktop app</Text>
        </Pressable>

        <Pressable style={[styles.row, styles.danger]} onPress={signOut}>
          <Text style={[styles.rowText, { color: colors.danger }]}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.md },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  label: { color: colors.textFaint, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  value: { color: colors.text, fontSize: 16, marginTop: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { color: colors.text, fontSize: 15 },
  danger: { borderColor: colors.border },
});
