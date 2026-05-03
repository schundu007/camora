import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { WEB_APP_URL } from '@/lib/env';
import { colors, radii, spacing } from '@/theme/colors';

export function AccountScreen() {
  const { user, signOut } = useAuth();
  const isIOS = Platform.OS === 'ios';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Account</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{user?.email}</Text>
          {user?.name && <Text style={styles.muted}>{user.name}</Text>}
        </View>

        {/* Subscription management is informational on iOS — Apple's reader-app
            rule (App Store Review Guideline 3.1.3) forbids in-app links/buttons
            that take users to a purchase flow outside IAP. We can mention that
            an external website exists, but we cannot deep-link to checkout.
            Android has no such restriction. */}
        {isIOS ? (
          <View style={styles.card}>
            <Text style={styles.label}>Subscription</Text>
            <Text style={styles.muted}>
              Camora subscriptions are managed on the web. Visit camora.cariara.com from a browser
              to view or change your plan.
            </Text>
          </View>
        ) : (
          <Pressable style={styles.row} onPress={() => Linking.openURL(`${WEB_APP_URL}/account`)}>
            <Text style={styles.rowText}>Manage subscription on web</Text>
          </Pressable>
        )}

        <Pressable style={styles.row} onPress={() => Linking.openURL(`${WEB_APP_URL}/desktop`)}>
          <Text style={styles.rowText}>Get the desktop app</Text>
        </Pressable>

        <Pressable style={styles.row} onPress={() => Linking.openURL(`${WEB_APP_URL}/legal/privacy`)}>
          <Text style={styles.rowText}>Privacy policy</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => Linking.openURL(`${WEB_APP_URL}/legal/terms`)}>
          <Text style={styles.rowText}>Terms of service</Text>
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
  muted: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs, lineHeight: 19 },
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
