import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radii, spacing } from '@/theme/colors';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try { await signIn(); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>Camora</Text>
        <Text style={styles.tagline}>Apply. Prepare. Practice. Attend.</Text>
        <Text style={styles.body}>
          Sign in with the same account you use on camora.cariara.com.
        </Text>
        <Pressable style={[styles.cta, busy && styles.ctaBusy]} onPress={handle} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Continue with Google</Text>}
        </Pressable>
        <Text style={styles.fineprint}>
          On mobile, Camora is for prep and audio transcription. Video, coding, and screen-share
          interviews work on the Camora desktop app or camora.cariara.com.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  brand: { color: colors.text, fontSize: 36, fontWeight: '700', letterSpacing: -0.5 },
  tagline: { color: colors.navySoft, fontSize: 14, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.md },
  cta: {
    backgroundColor: colors.navy,
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  ctaBusy: { opacity: 0.7 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fineprint: { color: colors.textFaint, fontSize: 13, lineHeight: 19, marginTop: spacing.lg },
});
