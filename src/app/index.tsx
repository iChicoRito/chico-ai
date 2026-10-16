import { router, Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
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
import { type Message, newChat, retry, send, stop, useChat } from '@/lib/chat';
import { ensureLoaded } from '@/lib/engine';
import { modelStatus, useModel } from '@/lib/model';
import { deletePicture, pickPicture } from '@/lib/picture';

export default function ChatScreen() {
  const c = useTheme();
  const model = useModel();
  const { messages, busy } = useChat();
  const [text, setText] = useState('');
  // The prepared copy of the attached picture, while it is being made, and why it was refused.
  const [picture, setPicture] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);
  // The list is inverted, so offset 0 is the newest message.
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const headerHeight = useHeaderHeight();
  const installed = model.stage === 'installed';
  const loading = installed && model.engine === 'loading';
  const canSend = installed && !loading && !busy && text.trim().length > 0;

  const onAttach = async () => {
    setPictureError(null);
    setPreparing(true);
    try {
      const next = await pickPicture();
      if (!next) return;
      if (picture) deletePicture(picture);
      setPicture(next);
    } catch (e) {
      setPictureError(e instanceof Error ? e.message : 'This picture could not be opened. Try another one.');
    } finally {
      setPreparing(false);
    }
  };

  const onRemovePicture = () => {
    if (picture) deletePicture(picture);
    setPicture(null);
    setPictureError(null);
  };

  const onSend = () => {
    if (!canSend) return;
    send(text, picture);
    setText('');
    setPicture(null);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.role === 'user') {
      return (
        <View
          accessible
          accessibilityLabel={`${item.picture ? 'You, with a picture' : 'You'}: ${item.text}`}
          style={[styles.userBubble, { backgroundColor: c.surface }]}>
          {item.picture ? <Image source={{ uri: item.picture }} style={styles.bubblePicture} /> : null}
          <Text style={[Type.body, { color: c.text }]}>{item.text}</Text>
        </View>
      );
    }
    return (
      <View style={styles.modelMessage}>
        {item.text ? <Markdown value={item.text} /> : null}
        {item.status === 'stopped' ? (
          <Text style={[Type.label, { color: c.textMuted }]}>Stopped</Text>
        ) : null}
        {item.status === 'failed' && item.error ? (
          <Notice
            tone="error"
            message={item.error}
            // Only the newest answer can be tried again.
            actionLabel={item.id === messages.at(-1)?.id ? 'Try again' : undefined}
            onAction={retry}
          />
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
              <Text style={[Type.label, { color: c.textMuted }]}>{busy && !loading ? 'Writing…' : modelStatus(model)}</Text>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="add-comment"
                label="New chat"
                disabled={messages.length === 0}
                onPress={() => {
                  // The old list's scroll position goes with it.
                  setAwayFromLatest(false);
                  newChat();
                }}
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
          <StatusNotice />
          {preparing ? <Notice message="Preparing picture…" /> : null}
          {pictureError ? <Notice tone="error" message={pictureError} /> : null}
          {picture ? (
            <View style={styles.preview}>
              <Image
                accessible
                accessibilityLabel="Attached picture"
                source={{ uri: picture }}
                style={[styles.thumbnail, { backgroundColor: c.surface }]}
              />
              <IconButton icon="close" label="Remove picture" onPress={onRemovePicture} />
            </View>
          ) : null}
          <View style={[styles.composer, { backgroundColor: c.surface }]}>
            <IconButton
              icon="add-photo-alternate"
              label="Attach a picture"
              disabled={!installed || busy || preparing}
              onPress={onAttach}
            />
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
            {busy ? (
              <IconButton icon="stop" label="Stop" filled onPress={stop} />
            ) : (
              <IconButton
                icon="arrow-upward"
                label="Send"
                filled
                disabled={!canSend}
                onPress={onSend}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * What the model is doing, when it is not simply ready (R-23).
 * Unloaded needs no notice: sending a question loads it again.
 */
function StatusNotice() {
  const model = useModel();
  const openSetup = () => router.push('/model-setup');

  if (model.stage === 'notInstalled') {
    return (
      <Notice
        message="The AI model is not on this phone yet."
        actionLabel="Set up"
        onAction={openSetup}
      />
    );
  }
  if (model.stage !== 'installed') {
    return (
      <Notice
        tone={model.stage === 'failed' ? 'error' : 'info'}
        message={`Model setup: ${modelStatus(model)}.`}
        actionLabel="View"
        onAction={openSetup}
      />
    );
  }
  if (model.engine === 'loading') return <Notice message="Loading the model…" />;
  if (model.engine === 'failed' && model.engineError) {
    return (
      <Notice
        tone="error"
        message={model.engineError}
        actionLabel="Try again"
        onAction={ensureLoaded}
      />
    );
  }
  return null;
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
  bubblePicture: { width: 200, height: 200, borderRadius: Radius.md, marginBottom: Spacing.sm },
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
  preview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  thumbnail: { width: 72, height: 72, borderRadius: Radius.sm },
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
