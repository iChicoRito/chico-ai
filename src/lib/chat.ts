// Chat controller: keeps the messages and sends questions to the engine connector.
import { useSyncExternalStore } from 'react';

import { reply, resetChat, type Turn } from '@/lib/engine';
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

// ponytail: characters, not tokens. The bridge cannot count tokens on Android (Q-04), and about
// 4 characters make a token, so 8000 characters is about half of the engine's 4096-token cap.
const CHAT_LIMIT_CHARS = 8000;
// About how many characters of chat the engine holds now.
let engineChars = 0;

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
    // Over the limit: give the engine only the newest turns, filling half the limit, so the cut
    // (which makes the engine read those turns again) happens rarely.
    const reseed = engineChars + text.length > CHAT_LIMIT_CHARS;
    const turns = recentTurns(reseed ? CHAT_LIMIT_CHARS / 2 : CHAT_LIMIT_CHARS, [userId, modelId]);
    if (reseed) engineChars = turns.reduce((n, t) => n + t.content.length, 0);

    let answer = '';
    await reply(
      text,
      (token) => {
        answer += token;
        update(modelId, { text: answer });
      },
      turns,
      reseed,
    );
    engineChars += text.length + answer.length;
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

/** The newest finished turns, oldest first, until `limit` characters. Skips the turns in `skip`. */
function recentTurns(limit: number, skip: string[]): Turn[] {
  const turns: Turn[] = [];
  let chars = 0;
  // A question counts only with its answer, so turns are taken in pairs from the end.
  const msgs = state.messages.filter((m) => !skip.includes(m.id));
  for (let i = msgs.length - 2; i >= 0; i -= 2) {
    const [q, a] = [msgs[i], msgs[i + 1]];
    if (q.role !== 'user' || a.role !== 'model' || a.status === 'failed') continue;
    chars += q.text.length + a.text.length;
    if (chars > limit) break;
    turns.unshift({ role: 'model', content: a.text });
    turns.unshift({ role: 'user', content: q.text });
  }
  return turns;
}

/** Start fresh: clear the messages and what the AI remembers (R-24). */
export function newChat() {
  if (state.busy) return;
  set({ messages: [] });
  engineChars = 0;
  resetChat();
}
