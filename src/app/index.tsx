import { router, Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { Markdown } from '@/components/markdown';
import { Notice } from '@/components/notice';
import { Radius, Spacing, TouchTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Message, newChat, send, useChat } from '@/lib/chat';
import { modelStatus, useModel } from '@/lib/model';

export default function ChatScreen() {
  const c = useTheme();
  const model = useModel();
  const { messages, busy } = useChat();
  const [text, setText] = useState('');
  const list = useRef<FlatList<Message>>(null);
  // The list is inverted, so offset 0 is the newest message.
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const headerHeight = useHeaderHeight();
  const installed = model.stage === 'installed';
  const canSend = installed && !busy && text.trim().length > 0;

  const onSend = () => {
    if (!canSend) return;
    send(text);
    setText('');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.role === 'user') {
      return (
        <View
          accessible
          accessibilityLabel={`You: ${item.text}`}
          style={[styles.userBubble, { backgroundColor: c.surface }]}>
          <Text style={[Type.body, { color: c.text }]}>{item.text}</Text>
        </View>
      );
    }
    return (
      <View style={styles.modelMessage}>
        {item.text ? <Markdown value={item.text} /> : null}
        {item.status === 'failed' && item.error ? (
          <Notice tone="error" message={item.error} />
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text style={[Type.title, { color: c.text }]}>Pocket AI</Text>
              <Text style={[Type.label, { color: c.textMuted }]}>{modelStatus(model)}</Text>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="add-comment"
                label="New chat"
                disabled={busy || messages.length === 0}
                onPress={newChat}
              />
              <IconButton
                icon="settings"
                label="Settings"
                onPress={() => router.push('/settings')}
              />
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
        style={styles.screen}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[Type.display, { color: c.text }]}>Ask anything.</Text>
            <Text style={[Type.body, { color: c.textMuted }]}>
              Answers are written on this phone. Nothing you type or attach leaves it.
            </Text>
          </View>
        ) : (
          <View style={styles.screen}>
            {/* Inverted, so the newest message stays in view while an answer is written. */}
            <FlatList
              ref={list}
              inverted
              data={[...messages].reverse()}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={100}
              onScroll={(e) => setAwayFromLatest(e.nativeEvent.contentOffset.y > 400)}
            />
            {awayFromLatest ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Jump to latest"
                hitSlop={4}
                onPress={() => list.current?.scrollToOffset({ offset: 0, animated: true })}
                style={[styles.jump, { backgroundColor: c.surface, borderColor: c.outline }]}>
                <MaterialIcons name="arrow-downward" size={18} color={c.text} />
                <Text style={[Type.label, { color: c.text }]}>Jump to latest</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={styles.bottom}>
          {!installed ? (
            <Notice
              message="The AI model is not on this phone yet."
              actionLabel="Set up"
              onAction={() => router.push('/model-setup')}
            />
          ) : null}
          <View style={[styles.composer, { backgroundColor: c.surface }]}>
            <IconButton icon="add-photo-alternate" label="Attach a picture" disabled />
            <TextInput
              accessibilityLabel="Message"
              editable={installed}
              multiline
              value={text}
              onChangeText={setText}
              placeholder="Ask Pocket AI"
              placeholderTextColor={c.textMuted}
              style={[Type.body, styles.input, { color: c.text }]}
            />
            <IconButton
              icon="arrow-upward"
              label="Send"
              filled
              disabled={!canSend}
              onPress={onSend}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
  list: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.xl },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modelMessage: { gap: Spacing.sm },
  jump: {
    position: 'absolute',
    bottom: Spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    // Thin edge so the pill stays visible over a code block of the same colour.
    borderWidth: StyleSheet.hairlineWidth,
  },
  bottom: { padding: Spacing.md, gap: Spacing.md },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: Radius.lg,
    padding: Spacing.xs,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    minHeight: TouchTarget,
    maxHeight: 160,
  },
});
