import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, Type } from '@/constants/theme';
import { ensureLoaded } from '@/lib/engine';
import { useModel } from '@/lib/model';
import { clearPictureCache } from '@/lib/picture';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const { stage } = useModel();

  // Chats are not saved, so picture copies left by a closed or killed app are not needed (R-31).
  useEffect(() => clearPictureCache(), []);

  // Load the model on opening, and right after a fresh install passes the check (R-14).
  useEffect(() => {
    if (stage === 'installed') ensureLoaded();
  }, [stage]);

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: c.accent,
          background: c.background,
          card: c.background,
          text: c.text,
          border: c.outline,
        },
      }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: Type.title,
          contentStyle: { backgroundColor: c.background },
        }}>
        <Stack.Screen name="index" options={{ title: 'Pocket AI' }} />
        <Stack.Screen name="model-setup" options={{ title: 'Model' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </ThemeProvider>
  );
}
