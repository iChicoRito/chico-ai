import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing, TouchTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const c = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[Type.label, styles.heading, { color: c.textMuted }]}>Model</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens model setup"
        onPress={() => router.push('/model-setup')}
        android_ripple={{ color: c.outline }}
        style={styles.row}>
        <View style={styles.rowText}>
          <Text style={[Type.body, { color: c.text }]}>Gemma 4 E2B</Text>
          <Text style={[Type.label, { color: c.textMuted }]}>Not installed</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={c.textMuted} />
      </Pressable>

      <Text style={[Type.label, styles.heading, { color: c.textMuted }]}>Privacy</Text>
      <Text style={[Type.body, styles.paragraph, { color: c.text }]}>
        Your messages, pictures, and answers stay on this phone. The internet is used only to
        download the AI model.
      </Text>

      <Text style={[Type.label, styles.heading, { color: c.textMuted }]}>About</Text>
      <Text style={[Type.body, styles.paragraph, { color: c.text }]}>
        Pocket AI {Constants.expoConfig?.version}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: Spacing.sm },
  heading: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  row: {
    minHeight: TouchTarget + Spacing.lg,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  paragraph: { paddingHorizontal: Spacing.xl },
});
