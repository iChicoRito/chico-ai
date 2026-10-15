# Pocket AI — Design System

Reference: the Gemini chat app on Android. We take its calm structure: neutral surfaces, conversation first, one accent. We leave out its sparkle mark, gradient glow, and animated orb.

Tokens live in `src/constants/theme.ts`. Read colors through `useTheme()` (`src/hooks/use-theme.ts`). It follows the phone's light/dark setting.

## Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FFFFFF` | `#131314` | Screen and header |
| `surface` | `#F0F4F9` | `#1E1F20` | Composer, user message bubble, info notice, grouped facts |
| `text` | `#1F1F1F` | `#E3E3E3` | Main text and icons |
| `textMuted` | `#444746` | `#C4C7C5` | Secondary text, placeholders, section headings |
| `outline` | `#C4C7C5` | `#444746` | Ripples, disabled button fill. Never used for text |
| `accent` | `#0B57D0` | `#A8C7FA` | Send button, text actions, links. Nothing else |
| `onAccent` | `#FFFFFF` | `#062E6F` | Icon or text on `accent` |
| `errorContainer` | `#F9DEDC` | `#8C1D18` | Error notice background |
| `onErrorContainer` | `#410E0B` | `#F9DEDC` | Error notice text |

Contrast was checked with the antislop-human checker on 15 October 2026. Every text pair passes WCAG AA. The lowest is `accent` on `background` (light) at 6.39:1.

## Type

The system Roboto font. It is native on Android, needs no download, and is close to Google Sans. No custom font until there is a brand reason for one.

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 28 / 36 | 400 | Screen greeting, page lead |
| `title` | 22 / 28 | 500 | Header title |
| `body` | 16 / 24 | 400 | Messages and paragraphs |
| `label` | 13 / 18 | 500 | Status lines, section headings, button text |

Text scales with the phone's font-size setting. Do not set `allowFontScaling={false}`.

## Space and shape

- Spacing: 4, 8, 12, 16, 24, 32 (`xs` to `xxl`). Screen side padding is 24.
- Radius: 8 for chips, 16 for notices and grouped content, 28 for the composer, the user message bubble, and full-width buttons.
- Touch target: 48 dp minimum for every control (`TouchTarget`).
- No shadows. The header has no shadow line. Surfaces are separated by color only.

## Chat layout

- Header: app name and a model status line below it. Actions on the right: new chat, settings.
- User message: `surface` bubble, aligned right, radius 28.
- Assistant message: plain `body` text across the full width. No bubble, no avatar.
- Composer: one `surface` pill at the bottom. Attach on the left, text in the middle, filled `accent` send button on the right.
- Status and errors: always the `Notice` component (`src/components/notice.tsx`). Errors use `errorContainer` and are announced as alerts.

## Icons

Material Icons from `@expo/vector-icons`. They match Android and the Gemini reference. Choose an icon for what the control does. Every icon-only button has an `accessibilityLabel`.

## Not used, on purpose

- Gradients, glow, blurred orbs, sparkle or star "AI" icons.
- Glass or blur surfaces.
- Card shadows and floating elevation.
- Emoji in interface text.
- Uppercase, wide-tracked labels.
- A second accent color.
