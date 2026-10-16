import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Notice } from '@/components/notice';
import { WifiOnlySwitch } from '@/components/wifi-only-switch';
import { Radius, Spacing, TouchTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ensureLoaded } from '@/lib/engine';
import {
  cancelDownload,
  MODEL_BYTES,
  type ModelState,
  modelStatus,
  startDownload,
  useModel,
} from '@/lib/model';

const gb = (bytes: number) => (bytes / 1e9).toFixed(1);

type StepState = 'waiting' | 'active' | 'done' | 'failed';

// Download, Check, Load as separate steps, so the user can tell which one failed (R-10).
function steps({ stage, failedStep, engine }: ModelState): [string, StepState][] {
  const download: StepState =
    stage === 'downloading' || stage === 'waiting'
      ? 'active'
      : stage === 'failed' && failedStep === 'download'
        ? 'failed'
        : stage === 'verifying' || stage === 'installed' || failedStep === 'check'
          ? 'done'
          : 'waiting';
  const check: StepState =
    stage === 'verifying'
      ? 'active'
      : stage === 'installed'
        ? 'done'
        : failedStep === 'check'
          ? 'failed'
          : 'waiting';
  const load: StepState =
    stage !== 'installed'
      ? 'waiting'
      : engine === 'loading'
        ? 'active'
        : engine === 'ready'
          ? 'done'
          : engine === 'failed'
            ? 'failed'
            : 'waiting';
  return [
    ['Download', download],
    ['Check', check],
    ['Load', load],
  ];
}

const stepIcon = {
  waiting: 'radio-button-unchecked',
  active: 'pending',
  done: 'check-circle',
  failed: 'error',
} as const;

export default function ModelSetupScreen() {
  const c = useTheme();
  const model = useModel();
  const { stage, bytesDone, error } = model;
  const busy = stage === 'downloading' || stage === 'waiting';
  const percent = Math.floor((bytesDone / MODEL_BYTES) * 100);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[Type.display, { color: c.text }]}>Download the model</Text>
      <Text style={[Type.body, { color: c.textMuted }]}>
        Pocket AI answers with Gemma 4 E2B, an AI model that runs on this phone. You download it
        once, then chat without internet.
      </Text>

      <View style={[styles.facts, { backgroundColor: c.surface }]}>
        {[
          ['Download size', 'About 2.6 GB'],
          ['Free space needed', 'About 4 GB'],
        ].map(([label, value]) => (
          <View key={label} style={styles.fact}>
            <Text style={[Type.body, { color: c.textMuted }]}>{label}</Text>
            <Text style={[Type.body, { color: c.text }]}>{value}</Text>
          </View>
        ))}
      </View>

      {stage !== 'notInstalled' ? (
        <View style={styles.steps}>
          {steps(model).map(([label, step]) => (
            <View
              key={label}
              accessible
              accessibilityLabel={`${label}: ${step}`}
              style={styles.step}>
              <MaterialIcons
                name={stepIcon[step]}
                size={20}
                color={step === 'failed' ? c.onErrorContainer : step === 'waiting' ? c.textMuted : c.text}
              />
              <Text style={[Type.body, { color: step === 'waiting' ? c.textMuted : c.text }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {stage === 'verifying' ? (
        <Text style={[Type.label, { color: c.textMuted }]}>
          Checking the file. This takes a few seconds.
        </Text>
      ) : null}

      {busy || (stage === 'failed' && bytesDone > 0) ? (
        <View style={styles.progress}>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Download progress"
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={[styles.track, { backgroundColor: c.outline }]}>
            <View style={[styles.fill, { width: `${percent}%`, backgroundColor: c.text }]} />
          </View>
          <Text style={[Type.label, { color: c.textMuted }]}>
            {stage === 'waiting'
              ? `${modelStatus(model)}. ${gb(bytesDone)} GB of ${gb(MODEL_BYTES)} GB`
              : `${gb(bytesDone)} GB of ${gb(MODEL_BYTES)} GB`}
          </Text>
        </View>
      ) : null}

      {stage === 'failed' && error ? (
        <Notice tone="error" message={error} actionLabel="Try again" onAction={startDownload} />
      ) : null}

      {stage === 'installed' && model.engineError ? (
        <Notice
          tone="error"
          message={model.engineError}
          actionLabel="Try again"
          onAction={ensureLoaded}
        />
      ) : null}

      {stage === 'installed' && !model.engineError ? (
        <Notice message="The model is on this phone." />
      ) : null}

      {stage !== 'installed' && stage !== 'verifying' ? <WifiOnlySwitch /> : null}

      {stage === 'notInstalled' ? (
        <Button
          label={bytesDone > 0 ? 'Continue download' : 'Download'}
          onPress={startDownload}
        />
      ) : null}
      {busy ? <Button label="Cancel" onPress={cancelDownload} /> : null}
    </ScrollView>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: c.outline }}
      style={[styles.button, { backgroundColor: c.surface }]}>
      <Text style={[Type.label, { color: c.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, gap: Spacing.lg },
  facts: { borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.sm },
  fact: { flexDirection: 'row', justifyContent: 'space-between' },
  steps: { gap: Spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  progress: { gap: Spacing.sm },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  button: {
    minHeight: TouchTarget,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
});
