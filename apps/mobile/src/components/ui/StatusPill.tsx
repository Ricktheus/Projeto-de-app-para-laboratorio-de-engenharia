import { Text, View } from 'react-native';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-gray-100',
  info: 'bg-blue-100',
  success: 'bg-green-100',
  warning: 'bg-yellow-100',
  danger: 'bg-red-100',
};

const TONE_TEXT: Record<StatusTone, string> = {
  neutral: 'text-gray-800',
  info: 'text-blue-900',
  success: 'text-green-900',
  warning: 'text-yellow-900',
  danger: 'text-red-900',
};

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

/** Compact status badge with AA-legible dark-on-tint colors (F-S003-3). */
export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <View className={`self-start rounded-full px-3 py-1 ${TONE_CLASSES[tone]}`}>
      <Text className={`text-sm font-medium ${TONE_TEXT[tone]}`}>{label}</Text>
    </View>
  );
}
