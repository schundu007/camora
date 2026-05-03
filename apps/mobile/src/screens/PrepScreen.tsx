import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES, type Category, type Topic } from '@/data/topics';
import { colors, radii, spacing } from '@/theme/colors';

type View_ =
  | { kind: 'categories' }
  | { kind: 'category'; categoryKey: string }
  | { kind: 'topic'; categoryKey: string; topicSlug: string };

export function PrepScreen() {
  const { user } = useAuth();
  const [view, setView] = useState<View_>({ kind: 'categories' });

  const back = () => {
    if (view.kind === 'topic') setView({ kind: 'category', categoryKey: view.categoryKey });
    else if (view.kind === 'category') setView({ kind: 'categories' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {view.kind !== 'categories' && (
        <Pressable onPress={back} style={styles.backBar}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      )}
      <ScrollView contentContainerStyle={styles.container}>
        {view.kind === 'categories' && (
          <CategoriesView name={user?.name?.split(' ')[0]} onPick={k => setView({ kind: 'category', categoryKey: k })} />
        )}
        {view.kind === 'category' && (
          <CategoryView
            categoryKey={view.categoryKey}
            onPickTopic={s => setView({ kind: 'topic', categoryKey: view.categoryKey, topicSlug: s })}
          />
        )}
        {view.kind === 'topic' && <TopicView categoryKey={view.categoryKey} topicSlug={view.topicSlug} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoriesView({ name, onPick }: { name?: string; onPick: (key: string) => void }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.greeting}>Hi {name || 'there'}</Text>
      <Text style={styles.title}>Prep</Text>
      <Text style={styles.sub}>Curated topics. Tap a category to drill in.</Text>
      <View style={{ height: spacing.lg }} />
      {CATEGORIES.map(c => (
        <Pressable key={c.key} style={styles.card} onPress={() => onPick(c.key)}>
          <Text style={styles.cardTitle}>{c.title}</Text>
          <Text style={styles.cardSub}>{c.description}</Text>
          <Text style={styles.cardMeta}>{c.topics.length} topics</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CategoryView({ categoryKey, onPickTopic }: { categoryKey: string; onPickTopic: (slug: string) => void }) {
  const category = useMemo(() => CATEGORIES.find(c => c.key === categoryKey), [categoryKey]);
  if (!category) return <Text style={styles.sub}>Category not found.</Text>;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.title}>{category.title}</Text>
      <Text style={styles.sub}>{category.description}</Text>
      <View style={{ height: spacing.md }} />
      {category.topics.map(t => (
        <Pressable key={t.slug} style={styles.card} onPress={() => onPickTopic(t.slug)}>
          <Text style={styles.cardTitle}>{t.title}</Text>
          <Text style={styles.cardSub}>{t.summary}</Text>
          <Text style={styles.cardMeta}>{t.estimatedMinutes} min read</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TopicView({ categoryKey, topicSlug }: { categoryKey: string; topicSlug: string }) {
  const topic = useMemo<Topic | undefined>(
    () => CATEGORIES.find(c => c.key === categoryKey)?.topics.find(t => t.slug === topicSlug),
    [categoryKey, topicSlug],
  );
  if (!topic) return <Text style={styles.sub}>Topic not found.</Text>;
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.title}>{topic.title}</Text>
      <Text style={styles.cardMeta}>{topic.estimatedMinutes} min read</Text>
      <Text style={styles.sub}>{topic.summary}</Text>
      <Text style={styles.body}>{topic.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },
  backBar: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  backText: { color: colors.navySoft, fontWeight: '600', fontSize: 15 },
  greeting: { color: colors.textMuted, fontSize: 14 },
  title: { color: colors.text, fontSize: 30, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  body: { color: colors.text, fontSize: 15, lineHeight: 24, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  cardSub: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm, lineHeight: 19 },
  cardMeta: { color: colors.textFaint, fontSize: 11, fontWeight: '600', marginTop: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
});
