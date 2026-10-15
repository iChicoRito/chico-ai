import { useColorScheme } from 'react-native';

import { Colors, type Palette } from '@/constants/theme';

export function useTheme(): Palette {
  return Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
