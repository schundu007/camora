import { View, Text, Pressable, StyleSheet, Linking, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CAPRA_API_URL, WEB_APP_URL } from '@/lib/env';
import { colors, radii, spacing } from '@/theme/colors';

export function AccountScreen() {
  const { user, token, signOut } = useAuth();
  const isIOS = Platform.OS === 'ios';
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!token) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`${CAPRA_API_URL}/api/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail.slice(0, 200) || `HTTP ${res.status}`);
      }
      setShowDelete(false);
      await signOut();
    } catch (e: any) {
      setDeleteError(e?.message || 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  };

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

        {/* Apple Guideline 5.1.1(v): apps that support account creation must
            offer in-app account deletion. Required for both iOS and Android
            for parity. Backend: DELETE /api/auth/account on ascend. */}
        <Pressable style={[styles.row, styles.danger]} onPress={() => setShowDelete(true)}>
          <Text style={[styles.rowText, { color: colors.danger }]}>Delete account</Text>
        </Pressable>
      </View>

      <Modal visible={showDelete} transparent animationType="fade" onRequestClose={() => !deleting && setShowDelete(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete account?</Text>
            <Text style={styles.modalBody}>
              This permanently deletes your Camora account and erases your study progress, saved topics,
              and any audio transcripts associated with this account.
            </Text>
            <Text style={styles.modalBody}>
              This cannot be undone. Subscriptions purchased on the web should be cancelled separately
              before deleting your account.
            </Text>
            {deleteError && <Text style={styles.modalError}>{deleteError}</Text>}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowDelete(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Keep my account</Text>
              </Pressable>
              <Pressable
                style={[styles.modalDelete, deleting && { opacity: 0.6 }]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalDeleteText}>Delete forever</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalError: { color: '#FCA5A5', fontSize: 13, lineHeight: 19 },
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
  modalDelete: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  modalDeleteText: { color: '#fff', fontWeight: '600' },
});
