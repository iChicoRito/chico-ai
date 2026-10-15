/**
 * Design tokens. Rules and rationale live in DESIGN.md.
 * Every text/background pair here passes WCAG AA (checked 15 Oct 2026).
 */

export const Colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F0F4F9',
    text: '#1F1F1F',
    textMuted: '#444746',
    outline: '#C4C7C5',
    accent: '#0B57D0',
    onAccent: '#FFFFFF',
    errorContainer: '#F9DEDC',
    onErrorContainer: '#410E0B',
  },
  dark: {
    background: '#131314',
    surface: '#1E1F20',
    text: '#E3E3E3',
    textMuted: '#C4C7C5',
    outline: '#444746',
    accent: '#A8C7FA',
    onAccent: '#062E6F',
    errorContainer: '#8C1D18',
    onErrorContainer: '#F9DEDC',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

// System Roboto: native on Android, no font download, close to Gemini's Google Sans.
export const Type = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: '400' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '500' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
} as const;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const Radius = { sm: 8, md: 16, lg: 28 } as const;

// Minimum touch target (Material / Android accessibility guideline).
export const TouchTarget = 48;
