// Settings store: the user's choices, kept in one small JSON file.
import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

export type Settings = {
  /** Download the model only on Wi-Fi. On by default (Q-08). */
  wifiOnly: boolean;
};

const defaults: Settings = { wifiOnly: true };
const file = new File(Paths.document, 'settings.json');

let settings: Settings = load();
const listeners = new Set<(s: Settings) => void>();

function load(): Settings {
  try {
    return { ...defaults, ...(file.exists ? JSON.parse(file.textSync()) : {}) };
  } catch {
    // A damaged file falls back to defaults instead of stopping the app.
    return defaults;
  }
}

export function getSettings(): Settings {
  return settings;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  settings = { ...settings, [key]: value };
  file.write(JSON.stringify(settings));
  listeners.forEach((l) => l(settings));
}

export function onSettingsChange(listener: (s: Settings) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      const off = onSettingsChange(l);
      return () => {
        off();
      };
    },
    () => settings,
  );
}
