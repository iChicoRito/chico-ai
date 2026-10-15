import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  filled?: boolean;
};

export function IconButton({ icon, label, onPress, disabled, filled }: Props) {
  const c = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: c.outline, borderless: true, radius: TouchTarget / 2 }}
      style={[
        styles.button,
        filled && { backgroundColor: disabled ? c.outline : c.accent },
        disabled && !filled && styles.disabled,
      ]}>
      <MaterialIcons name={icon} size={24} color={filled && !disabled ? c.onAccent : c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TouchTarget,
    height: TouchTarget,
    borderRadius: TouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.38 },
});
