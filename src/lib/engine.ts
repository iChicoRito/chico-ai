// Engine connector: the only file that talks to the AI engine (react-native-litert-lm).
import { AppState } from 'react-native';
import { createLLM } from 'react-native-litert-lm';

import { deleteModelFiles, getModelState, modelFile, setEngineState } from '@/lib/model';

// One instance for the whole app, so the model is never loaded twice (Q-03).
const llm = createLLM();
let loading: Promise<void> | null = null;

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
    })
    .then(() => {
      console.log(`[engine] load done in ${Date.now() - start} ms`);
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
