// Engine connector: the only file that talks to the AI engine (react-native-litert-lm).
import { AppState } from 'react-native';
import { createLLM } from 'react-native-litert-lm';

import { deleteModelFiles, getModelState, modelFile, setEngineState } from '@/lib/model';

// One instance for the whole app, so the model is never loaded twice (Q-03).
const llm = createLLM();
let loading: Promise<void> | null = null;
// A fresh load starts with an empty chat, so the next reply must give the engine the turns again.
let chatLost = false;

/** One turn of the chat, in the bridge's format for `resetConversation()`. */
export type Turn = { role: 'user' | 'model'; content: string };

/** Load the model if it is not loaded yet. Resolves when done; failures show in the model state. */
export function ensureLoaded(): Promise<void> {
  const { stage, engine } = getModelState();
  if (stage !== 'installed' || engine === 'ready') return Promise.resolve();
  if (loading) return loading;

  setEngineState({ engine: 'loading', engineError: null });
  console.log('[engine] load start');
  const start = Date.now();
  // CPU is faster than GPU for long answers on this phone; multimodal must be set for
  // Gemma 4 or pictures fail (model-proof results, Phase 7).
  loading = llm
    .loadModel(decodeURI(modelFile.uri.replace('file://', '')), {
      backend: 'cpu',
      multimodal: true,
      // Prompt, earlier turns, and answer together. The chat limit in chat.ts keeps turns well under it.
      maxContextTokens: 4096,
    })
    .then(() => {
      console.log(`[engine] load done in ${Date.now() - start} ms`);
      chatLost = true;
      setEngineState({ engine: 'ready', engineError: null });
    })
    .catch((e) => {
      const message = e instanceof Error ? e.message : String(e);
      console.log(`[engine] load failed: ${message}`);
      // The engine's message is a Java stack trace: keep it in the log, show plain words.
      setEngineState({
        engine: 'failed',
        engineError: 'The model could not load. Try again, or delete it in Settings and download it again.',
      });
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/**
 * Stream an answer to `text`. Loads the model first if needed (life cycle: Unloaded → Loading).
 * The engine keeps its own chat. It is given `turns` again when `reseed` is set (the chat was
 * cut to the limit) or when a reload emptied it.
 */
export async function reply(
  text: string,
  onToken: (token: string) => void,
  turns: Turn[],
  reseed: boolean,
) {
  if (getModelState().engine !== 'ready') await ensureLoaded();
  if (getModelState().engine !== 'ready') throw new Error('Model not ready');
  if (reseed || chatLost) llm.resetConversation(JSON.stringify(turns));
  chatLost = false;
  // Log timings only, never the question or the answer.
  const start = Date.now();
  try {
    // The last piece (done) is empty, or "Error: …" when the answer fails or is stopped
    // (StreamingCallbackListener.kt). The error also rejects the promise, so drop that piece.
    await llm.sendMessageAsync(text, (token, done) => {
      if (!done) onToken(token);
    });
  } catch (e) {
    // A stopped or failed answer leaves the engine's chat unknown: give it the turns next time.
    chatLost = true;
    throw e;
  }
  console.log(`[engine] reply done in ${Date.now() - start} ms`);
}

/**
 * Stop the answer being written. `resetConversation()` cancels the engine (needs the PR #26
 * fix in `patches/`); the running reply then rejects with "Task cancelled".
 */
export function stopReply() {
  if (getModelState().engine !== 'ready') return;
  llm.resetConversation();
  console.log('[engine] reply stopped');
}

/** Clear the engine's chat for a new chat. Not loaded: the next load starts empty anyway. */
export function resetChat() {
  if (getModelState().engine === 'ready') llm.resetConversation();
}

/** Free the model's memory. It loads again the next time it is needed. */
export async function unloadModel() {
  if (loading) await loading;
  if (getModelState().engine !== 'ready') return;
  await llm.unload();
  console.log('[engine] unloaded');
  setEngineState({ engine: 'unloaded', engineError: null });
}

/** Unload, then delete the model and its caches. Settings stay (R-16). */
export async function deleteModel() {
  await unloadModel();
  deleteModelFiles();
}

// Low memory (R-15): unload, then load again when the user comes back to the app.
llm.setMemoryWarningCallback((level) => {
  if (level === 'critical') unloadModel();
});
AppState.addEventListener('memoryWarning', () => unloadModel());
AppState.addEventListener('change', (s) => {
  if (s === 'active' && getModelState().engine === 'unloaded') ensureLoaded();
});
