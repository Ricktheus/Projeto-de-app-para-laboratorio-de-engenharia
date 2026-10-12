import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { FONTS } from '../../theme/tokens';

export interface EmptyStateProps {
  /** Monochrome icon node (Phosphor) shown above the message. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Call-to-action rendered below the text (SPEC §3.0 requires a CTA). */
  action?: ReactNode;
}

/** Empty UI-state (SPEC §3.0): technical icon + text + CTA (plan §6.6: no emoji). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-concreto-200 bg-white px-6 py-10">
      {icon ? (
        <View className="h-14 w-14 items-center justify-center rounded-xl border border-concreto-100 bg-concreto-25">
          {icon}
        </View>
      ) : null}
      <Text
        style={{ fontSize: 18, fontFamily: FONTS.sansSemibold }}
        className="text-center text-grafite"
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={{ fontSize: 16, fontFamily: FONTS.sans }}
          className="text-center text-concreto-500"
        >
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-2 w-full">{action}</View> : null}
    </View>
  );
}
