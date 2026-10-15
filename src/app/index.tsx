import { router, Stack } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { Notice } from '@/components/notice';
import { Radius, Spacing, TouchTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ChatScreen() {
  const c = useTheme();

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text style={[Type.title, { color: c.text }]}>Pocket AI</Text>
              <Text style={[Type.label, { color: c.textMuted }]}>Model not installed</Text>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton icon="add-comment" label="New chat" disabled />
              <IconButton
                icon="settings"
                label="Settings"
                onPress={() => router.push('/settings')}
              />
            </View>
          ),
        }}
      />

      <View style={styles.empty}>
        <Text style={[Type.display, { color: c.text }]}>Ask anything.</Text>
        <Text style={[Type.body, { color: c.textMuted }]}>
          Answers are written on this phone. Nothing you type or attach leaves it.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Notice
          message="The AI model is not on this phone yet."
          actionLabel="Set up"
          onAction={() => router.push('/model-setup')}
        />
        <View style={[styles.composer, { backgroundColor: c.surface }]}>
          <IconButton icon="add-photo-alternate" label="Attach a picture" disabled />
          <TextInput
            accessibilityLabel="Message"
            editable={false}
            placeholder="Ask Pocket AI"
            placeholderTextColor={c.textMuted}
            style={[Type.body, styles.input, { color: c.text }]}
          />
          <IconButton icon="arrow-upward" label="Send" filled disabled />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerActions: { flexDirection: 'row' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  bottom: { padding: Spacing.md, gap: Spacing.md },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.xs,
  },
  input: { flex: 1, paddingHorizontal: Spacing.sm, minHeight: TouchTarget },
});
