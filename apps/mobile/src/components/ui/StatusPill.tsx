import { Text, View } from 'react-native';

import { FONTS } from '../../theme/tokens';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'ai';

/** Plan §6.2 semantic pairs (text/background ≥ 4.5:1); always dot + text. */
const TONE: Record<StatusTone, { box: string; text: string; dot: string }> = {
  neutral: {
    box: 'bg-concreto-50 border-concreto-200',
    text: 'text-concreto-600',
    dot: 'bg-concreto-400',
  },
  info: { box: 'bg-cobalto-50 border-cobalto-50', text: 'text-cobalto-600', dot: 'bg-cobalto-600' },
  success: { box: 'bg-success-soft border-success-soft', text: 'text-success', dot: 'bg-success' },
  warning: { box: 'bg-warning-soft border-warning-soft', text: 'text-warning', dot: 'bg-warning' },
  danger: { box: 'bg-danger-soft border-danger-soft', text: 'text-danger', dot: 'bg-danger' },
  accent: { box: 'bg-sinal-50 border-sinal-600', text: 'text-grafite', dot: 'bg-sinal-500' },
  ai: { box: 'bg-ia-50 border-ia-600', text: 'text-ia-600', dot: 'bg-ia-600' },
};

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

/** Compact status badge — status by dot + text, never colour alone (F-S003-3). */
export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  const t = TONE[tone];
  return (
    <View
      className={`flex-row items-center gap-1.5 self-start rounded-md border px-2.5 py-1 ${t.box}`}
    >
      <View className={`h-2 w-2 rounded-full ${t.dot}`} />
      <Text style={{ fontSize: 14, fontFamily: FONTS.sansMedium }} className={t.text}>
        {label}
      </Text>
    </View>
  );
}
