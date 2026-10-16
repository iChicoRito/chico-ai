// Model manager: downloads the model file and tracks its install state.
import { Directory, DownloadTask, File, Paths } from 'expo-file-system';
// getInfoAsync hashes off the JS thread; the new File.md5 would freeze the app for seconds.
import { getInfoAsync } from 'expo-file-system/legacy';
import {
  addNetworkStateListener,
  getNetworkStateAsync,
  type NetworkState,
  NetworkStateType,
} from 'expo-network';
import { useSyncExternalStore } from 'react';

import { getSettings, onSettingsChange } from '@/lib/settings';

// Pinned to one Hugging Face commit so the size and MD5 below never change.
const URL =
  'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/b3ca0d2f076785a8f4b2219ddbd2bdb99954eae1/gemma-4-E2B-it.litertlm';
export const MODEL_BYTES = 2_588_147_712;
export const MODEL_MD5 = '1b8446203a216cfd31f6a2a22f75e5e5';
// The engine writes about 1.06 GB of caches next to the model (model-proof results, Phase 3).
const CACHE_MARGIN_BYTES = 1_100_000_000;

export const modelFile = new File(Paths.document, 'models', 'gemma-4-E2B-it.litertlm');
// Bytes land here first; renamed to modelFile only after the check passes,
// so modelFile existing always means a checked model.
const partFile = new File(Paths.document, 'models', 'gemma-4-E2B-it.litertlm.part');

export type ModelStage =
  | 'notInstalled'
  | 'downloading'
  | 'waiting'
  | 'verifying'
  | 'failed'
  | 'installed';

export type ModelState = {
  stage: ModelStage;
  bytesDone: number;
  error: string | null;
  /** Which step the error belongs to, for the stage list on the Model screen. */
  failedStep: 'download' | 'check' | null;
  /** While `waiting`: held back by the Wi-Fi only setting, not by a lost connection. */
  waitingForWifi: boolean;
  /** The engine's hold on the model, set by `src/lib/engine.ts`. */
  engine: 'idle' | 'loading' | 'ready' | 'failed' | 'unloaded';
  engineError: string | null;
};

let state: ModelState = initialState();
const listeners = new Set<() => void>();

function initialState(): ModelState {
  if (modelFile.exists) {
    return {
      stage: 'installed',
      bytesDone: MODEL_BYTES,
      error: null,
      failedStep: null,
      waitingForWifi: false,
      engine: 'idle',
      engineError: null,
    };
  }
  const bytesDone = partFile.exists ? partFile.size : 0;
  return {
    stage: 'notInstalled',
    bytesDone,
    error: null,
    failedStep: null,
    waitingForWifi: false,
    engine: 'idle',
    engineError: null,
  };
}

function set(next: Partial<ModelState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const getModelState = () => state;
// Only the engine connector writes the engine fields.
export const setEngineState = (next: Pick<ModelState, 'engine' | 'engineError'>) => set(next);

export function useModel(): ModelState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** Short status line for the chat header and the Settings model row. */
export function modelStatus(state: ModelState): string {
  const { stage, bytesDone } = state;
  switch (stage) {
    case 'installed':
      return {
        idle: 'Installed',
        loading: 'Loading',
        ready: 'Ready, offline',
        failed: 'Could not load',
        unloaded: 'Unloaded',
      }[state.engine];
    case 'downloading':
      return `Downloading ${Math.floor((bytesDone / MODEL_BYTES) * 100)}%`;
    case 'waiting':
      return state.waitingForWifi ? 'Waiting for Wi-Fi' : 'Waiting for a connection';
    case 'verifying':
      return 'Checking the download';
    case 'failed':
      return state.failedStep === 'check' ? 'Download damaged' : 'Download stopped';
    default:
      return 'Not installed';
  }
}

let task: DownloadTask | null = null;
let cancelled = false;
let retries = 0;
let retryBytes = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

const online = (net: NetworkState) => !!net.isConnected && net.isInternetReachable !== false;

// A VPN reports the network under it (Wi-Fi or cellular), so it needs no special case.
const wifiBlocks = (net: NetworkState) =>
  getSettings().wifiOnly && net.type !== NetworkStateType.WIFI && net.type !== NetworkStateType.ETHERNET;

export async function startDownload() {
  // One download at a time (R-12).
  if (task || ['downloading', 'verifying', 'installed'].includes(state.stage)) return;

  const done = partFile.exists ? partFile.size : 0;
  // Complete but not yet checked, for example the app closed during the check.
  if (done >= MODEL_BYTES) return verify();
  const needed = MODEL_BYTES - done + CACHE_MARGIN_BYTES;
  if (Paths.availableDiskSpace < needed) {
    const gb = (n: number) => (n / 1e9).toFixed(1);
    set({
      stage: 'failed',
      failedStep: 'download',
      error: `Not enough free space. Free up ${gb(needed - Paths.availableDiskSpace)} GB and try again.`,
    });
    return;
  }

  cancelled = false;
  set({ stage: 'downloading', bytesDone: done, error: null, failedStep: null, waitingForWifi: false });

  // Wi-Fi only (R-13): wait instead of using mobile data.
  const net = await getNetworkStateAsync();
  if (cancelled) return;
  if (wifiBlocks(net)) {
    set({ stage: 'waiting', waitingForWifi: true });
    return;
  }
  const onProgress = ({ bytesWritten }: { bytesWritten: number }) => set({ bytesDone: bytesWritten });

  try {
    let file: File | null;
    if (done > 0) {
      // The Android task resumes from a byte offset, so the part file's size is the resume data.
      task = DownloadTask.fromSavable(
        { url: URL, fileUri: partFile.uri, isDirectory: false, resumeData: String(done) },
        { onProgress },
      );
      file = await task.resumeAsync();
    } else {
      partFile.parentDirectory.create({ intermediates: true, idempotent: true });
      task = File.createDownloadTask(URL, partFile, { onProgress });
      file = await task.downloadAsync();
    }
    task = null;
    // null means paused: the phone left Wi-Fi with Wi-Fi only on.
    if (!file) {
      set({ stage: 'waiting', waitingForWifi: true, bytesDone: partFile.size });
      return;
    }
    await verify();
    return;
  } catch (e) {
    task = null;
    if (cancelled) return;
    // A dropped connection keeps the part file; wait and continue when the network is back.
    const net = await getNetworkStateAsync();
    const offline = !online(net);
    const bytes = partFile.exists ? partFile.size : 0;
    // Switching between Wi-Fi, mobile data, and VPN aborts the request while still online,
    // so retry a few times before showing the error. Progress resets the count.
    if (bytes > retryBytes) retries = 0;
    retryBytes = bytes;
    if (!offline && retries < 3) {
      retries++;
      set({ stage: 'waiting', bytesDone: bytes, error: null, waitingForWifi: false });
      retryTimer = setTimeout(startDownload, 5000);
      return;
    }
    set({
      stage: offline ? 'waiting' : 'failed',
      waitingForWifi: false,
      failedStep: offline ? null : 'download',
      bytesDone: bytes,
      error: offline ? null : `The download stopped: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

export function cancelDownload() {
  cancelled = true;
  clearTimeout(retryTimer);
  task?.cancel();
  task = null;
  if (partFile.exists) partFile.delete();
  set({ stage: 'notInstalled', bytesDone: 0, error: null, failedStep: null });
}

/** Remove the model folder (model plus any engine caches). Call `deleteModel()` in engine.ts instead. */
export function deleteModelFiles() {
  const dir = new Directory(Paths.document, 'models');
  if (dir.exists) dir.delete();
  set({ ...initialState() });
}

// Keep the file only if its size and MD5 match the pinned model (R-11).
async function verify() {
  set({ stage: 'verifying', bytesDone: MODEL_BYTES, error: null, failedStep: null });
  try {
    const start = Date.now();
    const info = await getInfoAsync(partFile.uri, { md5: true });
    console.log(`[model] check took ${Date.now() - start} ms`);
    if (info.exists && info.size === MODEL_BYTES && info.md5 === MODEL_MD5) {
      await partFile.move(modelFile);
      set({ stage: 'installed' });
      return;
    }
  } catch (e) {
    console.log(`[model] check failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (partFile.exists) partFile.delete();
  set({
    stage: 'failed',
    failedStep: 'check',
    bytesDone: 0,
    error: 'The download was damaged. Download it again.',
  });
}

function applyNetwork(net: NetworkState) {
  if (state.stage === 'downloading' && wifiBlocks(net)) {
    try {
      task?.pause();
    } catch {
      // The task is not active yet; startDownload checks Wi-Fi itself.
    }
  } else if (state.stage === 'waiting' && !wifiBlocks(net)) {
    if (online(net)) startDownload();
    // Wi-Fi only turned off while offline: say what it is really waiting for.
    else set({ waitingForWifi: false });
  }
}

addNetworkStateListener(applyNetwork);
onSettingsChange(async () => applyNetwork(await getNetworkStateAsync()));

// A part file left by a closed app means a download the user started: continue it.
if (state.bytesDone > 0 && state.stage === 'notInstalled') startDownload();
