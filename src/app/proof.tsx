// Throwaway test screen for the model-proof plan (Phase 5). Deleted in Phase 7.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { createLLM, ModelRegistry } from 'react-native-litert-lm';

import { Notice } from '@/components/notice';
import { Radius, Spacing, TouchTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MODEL = 'gemma-4-E2B-it.litertlm';

// One instance for the whole app, so the model is never loaded twice (Q-03).
const llm = createLLM();

type Io = { note: (line: string) => void; show: (update: (reply: string) => string) => void };

function stats(io: Io, label: string) {
  const s = llm.getStats();
  io.note(
    `${label}: first token ${Math.round(s.timeToFirstToken)} ms, ${s.tokensPerSecond.toFixed(1)} tok/s, ` +
      `${s.promptTokens} in / ${s.completionTokens} out, total ${Math.round(s.totalTime)} ms`,
  );
}

function memory(io: Io, label: string) {
  const m = llm.getMemoryUsage();
  io.note(
    `${label}: app ${Math.round(m.residentBytes / 1e6)} MB, phone free ${Math.round(m.availableMemoryBytes / 1e6)} MB`,
  );
}

function ask(io: Io, question: string, label: string) {
  return new Promise<void>((resolve, reject) => {
    io.show(() => '');
    const start = Date.now();
    let first = 0;
    llm
      .sendMessageAsync(question, (token, done) => {
        if (!first) first = Date.now() - start;
        io.show((r) => r + token);
        if (done) {
          io.note(`${label}: first piece after ${first} ms, done after ${Date.now() - start} ms`);
          resolve();
        }
      })
      .catch(reject);
  });
}

const tests: [string, (io: Io) => Promise<void>][] = [
  ...(['cpu', 'gpu'] as const).map(
    (backend): [string, (io: Io) => Promise<void>] => [
      `Load on ${backend.toUpperCase()}`,
      async (io) => {
        const path = ModelRegistry.getFilePath(MODEL);
        io.note(`Loading ${path} on ${backend}`);
        const start = Date.now();
        // multimodal must be set: the bridge only guesses it for Gemma 3 file names.
        await llm.loadModel(path, { backend, maxOutputTokens: 1024, multimodal: true });
        io.note(`Loaded on ${backend} in ${Date.now() - start} ms`);
        memory(io, 'After load');
      },
    ],
  ),
  [
    'Short text',
    async (io) => {
      await ask(io, 'Name three fruits.', 'Short text');
      stats(io, 'Short text');
      memory(io, 'After short text');
    },
  ],
  [
    'Long text',
    async (io) => {
      await ask(io, 'Explain how a car engine works in detail, at least 300 words.', 'Long text');
      stats(io, 'Long text');
      memory(io, 'After long text');
    },
  ],
  [
    // Bridge 0.7.0 has no stop call: "stop" here only ignores further pieces.
    // Then a short question is sent at once to see if the engine is still busy.
    'Stop test',
    async (io) => {
      io.show(() => '');
      let stopped = false;
      const start = Date.now();
      const longDone = llm
        .sendMessageAsync('Write a 600-word story about a lighthouse keeper.', (token, done) => {
          if (!stopped) io.show((r) => r + token);
          if (done) io.note(`Stop test: long reply really finished after ${Date.now() - start} ms`);
        })
        .catch((e) => io.note(`Stop test: long reply ended with error: ${e instanceof Error ? e.message : e}`));
      await new Promise((r) => setTimeout(r, 3000));
      stopped = true;
      io.note('Stop test: pressed stop at 3000 ms');
      const askedAt = Date.now();
      await ask(io, 'What is 2 plus 2?', 'Stop test, next question');
      io.note(`Stop test: next question waited ${Date.now() - askedAt} ms in total`);
      await longDone;
    },
  ],
  [
    'Picture',
    async (io) => {
      const picture = ModelRegistry.getFilePath(MODEL).replace(`models/${MODEL}`, 'test.png');
      io.show(() => '');
      const start = Date.now();
      await llm.sendMessageWithImageAsync('Read the text in this picture.', picture, (token, done) => {
        io.show((r) => r + token);
        if (done) io.note(`Picture: done after ${Date.now() - start} ms`);
      });
      stats(io, 'Picture');
      memory(io, 'After picture');
    },
  ],
  [
    'Unload',
    async (io) => {
      await llm.unload();
      io.note('Unloaded');
    },
  ],
];

export default function ProofScreen() {
  const c = useTheme();
  const [log, setLog] = useState<string[]>([]);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const io: Io = {
    note: (line) => {
      console.log(`[proof] ${line}`);
      setLog((l) => [...l, line]);
    },
    show: setReply,
  };

  const start = async (task: (io: Io) => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await task(io);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      io.note(`ERROR: ${msg}`);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {tests.map(([label, task]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={label}
          disabled={busy}
          onPress={() => start(task)}
          style={[styles.button, { backgroundColor: busy ? c.outline : c.accent }]}>
          <Text style={[Type.label, { color: c.onAccent }]}>{label}</Text>
        </Pressable>
      ))}
      {error ? <Notice tone="error" message={error} /> : null}
      <Text style={[Type.body, { color: c.text }]}>{reply}</Text>
      {log.map((line, i) => (
        <Text key={i} style={[Type.label, { color: c.textMuted }]}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.sm },
  button: {
    minHeight: TouchTarget,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
