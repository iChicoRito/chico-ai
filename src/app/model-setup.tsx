import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Notice } from '@/components/notice';
import { Radius, Spacing, TouchTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ModelSetupScreen() {
  const c = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[Type.display, { color: c.text }]}>Download the model</Text>
      <Text style={[Type.body, { color: c.textMuted }]}>
        Pocket AI answers with Gemma 4 E2B, an AI model that runs on this phone. You download it
        once, then chat without internet.
      </Text>

      <View style={[styles.facts, { backgroundColor: c.surface }]}>
        {[
          ['Download size', 'About 2.58 GB'],
          ['Free space needed', 'At least 3 GB'],
        ].map(([label, value]) => (
          <View key={label} style={styles.fact}>
            <Text style={[Type.body, { color: c.textMuted }]}>{label}</Text>
            <Text style={[Type.body, { color: c.text }]}>{value}</Text>
          </View>
        ))}
      </View>

      <Notice message="Downloading is not available in this build yet." />

      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel="Download model"
        accessibilityState={{ disabled: true }}
        style={[styles.button, { backgroundColor: c.outline }]}>
        <Text style={[Type.label, { color: c.text }]}>Download</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.lg },
  facts: { borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.sm },
  fact: { flexDirection: 'row', justifyContent: 'space-between' },
  button: {
    minHeight: TouchTarget,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
});
