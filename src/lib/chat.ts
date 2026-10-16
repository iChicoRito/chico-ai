// Chat controller: keeps the messages and sends questions to the engine connector.
import { useSyncExternalStore } from 'react';

import { reply } from '@/lib/engine';
import { getModelState } from '@/lib/model';

export type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  status: 'pending' | 'writing' | 'done' | 'stopped' | 'failed';
  error: string | null;
};

export type ChatState = { messages: Message[]; busy: boolean };

let state: ChatState = { messages: [], busy: false };
const listeners = new Set<() => void>();
let nextId = 0;

function set(next: Partial<ChatState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function update(id: string, next: Partial<Message>) {
  set({ messages: state.messages.map((m) => (m.id === id ? { ...m, ...next } : m)) });
}

export function useChat(): ChatState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export async function send(input: string) {
  const text = input.trim();
  // Busy is set before any await, so fast repeated taps send one message (R-19).
  if (!text || state.busy) return;

  const userId = String(nextId++);
  const modelId = String(nextId++);
  set({
    busy: true,
    messages: [
      ...state.messages,
      { id: userId, role: 'user', text, status: 'pending', error: null },
      { id: modelId, role: 'model', text: '', status: 'writing', error: null },
    ],
  });

  try {
    if (getModelState().stage !== 'installed') {
      update(userId, { status: 'done' });
      update(modelId, { status: 'failed', error: 'The AI model is not on this phone yet.' });
      return;
    }
    let answer = '';
    await reply(text, (token) => {
      answer += token;
      update(modelId, { text: answer });
    });
    update(userId, { status: 'done' });
    update(modelId, { status: 'done' });
  } catch (e) {
    // The engine's message stays in the log; the screen gets plain words.
    console.log(`[chat] reply failed: ${e instanceof Error ? e.message : String(e)}`);
    update(userId, { status: 'done' });
    update(modelId, { status: 'failed', error: 'The answer could not be written. Try again.' });
  } finally {
    set({ busy: false });
  }
}
