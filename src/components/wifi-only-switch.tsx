import { StyleSheet, Switch, Text, View } from 'react-native';

import { TouchTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setSetting, useSettings } from '@/lib/settings';

/** "Download on Wi-Fi only" row, used on Settings and Model setup. */
export function WifiOnlySwitch() {
  const c = useTheme();
  const { wifiOnly } = useSettings();

  return (
    <View style={styles.row}>
      <Text style={[Type.body, styles.label, { color: c.text }]}>Download on Wi-Fi only</Text>
      <Switch
        accessibilityLabel="Download on Wi-Fi only"
        value={wifiOnly}
        onValueChange={(v) => setSetting('wifiOnly', v)}
        trackColor={{ true: c.textMuted, false: c.outline }}
        thumbColor={c.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: TouchTarget, flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
});
