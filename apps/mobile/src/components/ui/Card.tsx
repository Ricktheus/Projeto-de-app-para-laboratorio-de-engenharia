import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { FONTS } from '../../theme/tokens';

export interface CardProps {
  title?: string;
  /** Right side of the header (count, pill). */
  meta?: ReactNode;
  /** Attention rail: signal yellow (act now) or danger (overdue). */
  attention?: 'accent' | 'danger';
  children: ReactNode;
}

/** Content surface with an optional header (plan §6.5: 1px border, light elevation). */
export function Card({ title, meta, attention, children }: CardProps) {
  const rail =
    attention === 'accent'
      ? 'border-l-4 border-l-sinal-500'
      : attention === 'danger'
        ? 'border-l-4 border-l-danger'
        : '';
  return (
    <View
      className={`w-full overflow-hidden rounded-2xl border border-concreto-100 bg-white ${rail}`}
    >
      {title || meta ? (
        <View className="flex-row items-center gap-2 border-b border-concreto-100 px-4 py-3">
          {title ? (
            <Text
              style={{ fontSize: 16, fontFamily: FONTS.sansSemibold }}
              className="flex-1 text-grafite"
            >
              {title}
            </Text>
          ) : null}
          {meta}
        </View>
      ) : null}
      <View className="gap-3 p-4">{children}</View>
    </View>
  );
}

/** Small uppercase label (plan §6.4 "eyebrow"). */
export function Eyebrow({ children }: { children: string }) {
  return (
    <Text
      style={{ fontSize: 13, letterSpacing: 1, fontFamily: FONTS.sansSemibold }}
      className="uppercase text-concreto-500"
    >
      {children}
    </Text>
  );
}
