import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

export interface EmptyStateProps {
  /** Emoji shown above the message. */
  icon?: string;
  title: string;
  description?: string;
  /** Call-to-action rendered below the text (SPEC §3.0 requires a CTA). */
  action?: ReactNode;
}

/** Empty UI-state (SPEC §3.0): icon + text + CTA. Reused by list screens. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-3 rounded-3xl border border-dashed border-gray-300 p-8">
      {icon ? <Text style={{ fontSize: 40 }}>{icon}</Text> : null}
      <Text style={{ fontSize: 18 }} className="text-center font-semibold text-gray-800">
        {title}
      </Text>
      {description ? <Text className="text-center text-gray-500">{description}</Text> : null}
      {action ? <View className="mt-2 w-full">{action}</View> : null}
    </View>
  );
}
