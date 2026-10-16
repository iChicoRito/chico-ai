import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { Highlight, themes } from 'prism-react-renderer';
import { Fragment, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';
import { Renderer, useMarkdown } from 'react-native-marked';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Answers never load pictures from the internet: an image shows its alt text instead.
// HTML in an answer is shown as plain text by the library, never run (R-34).
class OfflineRenderer extends Renderer {
  image(_uri: string, alt?: string, _style?: object, title?: string) {
    const label = alt || title;
    return label ? <Text key={this.getKey()}>[{label}]</Text> : null;
  }

  code(text: string, language?: string, _containerStyle?: ViewStyle, textStyle?: TextStyle) {
    return <CodeBlock key={this.getKey()} code={text} language={language} style={textStyle} />;
  }
}

/** A code block with colours for its language and a copy button. Unknown languages show as plain text. */
function CodeBlock({ code, language, style }: { code: string; language?: string; style?: TextStyle }) {
  const c = useTheme();
  const theme = useColorScheme() === 'dark' ? themes.oneDark : themes.oneLight;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.code, { backgroundColor: c.surface }]}>
      <View style={styles.codeHeader}>
        <Text style={[Type.label, { color: c.textMuted }]}>{language || 'code'}</Text>
        {/* Small icon, but hitSlop keeps the 48 dp touch target. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Copied' : 'Copy code'}
          hitSlop={16}
          onPress={copy}
          style={styles.copy}>
          <MaterialIcons name={copied ? 'check' : 'content-copy'} size={14} color={c.textMuted} style={styles.copyIcon} />
        </Pressable>
      </View>
      <ScrollView horizontal contentContainerStyle={styles.codeBody}>
        <Highlight theme={theme} code={code} language={(language || 'text').toLowerCase()}>
          {({ tokens, getTokenProps }) => (
            <Text selectable style={style}>
              {tokens.map((line, i) => (
                <Fragment key={i}>
                  {line.map((token, k) => {
                    // An empty line holds one "\n" token; the line break below already covers it.
                    if (token.empty) return null;
                    const { color, fontStyle } = getTokenProps({ token }).style ?? {};
                    return (
                      <Text key={k} style={{ color, fontStyle } as TextStyle}>
                        {token.content}
                      </Text>
                    );
                  })}
                  {i < tokens.length - 1 ? '\n' : null}
                </Fragment>
              ))}
            </Text>
          )}
        </Highlight>
      </ScrollView>
    </View>
  );
}

const renderer = new OfflineRenderer();

/** Renders an answer's Markdown: headings, lists, tables, code, quotes, links. */
export function Markdown({ value }: { value: string }) {
  const c = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const elements = useMarkdown(value, {
    colorScheme: scheme,
    renderer,
    theme: { colors: { code: c.surface, link: c.accent, text: c.text, border: c.outline } },
    // Space between blocks comes from the wrapper's gap, so blocks carry no outer margin.
    styles: {
      text: { ...Type.body, color: c.text },
      paragraph: { paddingVertical: 0 },
      h1: { ...Type.display, color: c.text, marginVertical: 0, marginTop: Spacing.sm },
      h2: { ...Type.title, color: c.text, marginVertical: 0, marginTop: Spacing.sm },
      h3: { ...Type.body, fontWeight: '600', color: c.text, marginVertical: 0, marginTop: Spacing.xs },
      h4: { ...Type.body, fontWeight: '600', color: c.text, marginVertical: 0 },
      h5: { ...Type.body, fontWeight: '600', color: c.text, marginVertical: 0 },
      h6: { ...Type.label, color: c.textMuted, marginVertical: 0 },
      li: { ...Type.body, color: c.text, marginVertical: 2 },
      link: { color: c.accent, textDecorationLine: 'underline' },
      codespan: { fontFamily: 'monospace', fontStyle: 'normal', backgroundColor: c.surface },
      codeText: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20, color: c.text },
      blockquote: { borderLeftColor: c.outline, borderLeftWidth: 4, paddingVertical: Spacing.xs },
      hr: { marginVertical: Spacing.xs },
      tableCell: { padding: Spacing.sm },
    },
  });

  return (
    <View style={styles.blocks}>
      {elements.map((el, i) => (
        <View key={i}>{el}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: Spacing.md },
  code: { borderRadius: Radius.md, overflow: 'hidden' },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  copy: { padding: Spacing.xs },
  // Muted, but still above the 3:1 contrast that icons need.
  copyIcon: { opacity: 0.6 },
  codeBody: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
});
