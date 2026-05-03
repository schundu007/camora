import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@/theme/colors';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // No-op in production. In dev, the LogBox already shows the error.
    // We deliberately avoid calling any analytics SDK here — the app ships
    // without one (see store/privacy-answers.md) and we don't want a crash
    // to be the thing that introduces network egress to a third party.
    if (__DEV__) console.error('[ErrorBoundary]', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The app hit an unexpected error and recovered. Tap below to try again.
        </Text>
        <Pressable style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Restart</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { backgroundColor: colors.navy, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md, borderRadius: radii.lg, marginTop: spacing.md },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
