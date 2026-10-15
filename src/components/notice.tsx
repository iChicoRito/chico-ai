import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, TouchTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  tone?: 'info' | 'error';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** The one pattern for errors and status messages across the app. */
export function Notice({ tone = 'info', message, actionLabel, onAction }: Props) {
  const c = useTheme();
  const bg = tone === 'error' ? c.errorContainer : c.surface;
  const fg = tone === 'error' ? c.onErrorContainer : c.text;

  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.box, { backgroundColor: bg }]}>
      <Text style={[Type.body, styles.message, { color: fg }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={[Type.label, { color: tone === 'error' ? fg : c.accent }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  message: { flex: 1, paddingVertical: Spacing.sm },
  action: {
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
});
