import { type ReactNode } from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';

import { COLORS, FONTS } from '../../theme/tokens';

/**
 * Button variants of the "Concreto & Sinalização" kit (plan §6.7):
 * - `primary`: graphite — the default primary action;
 * - `accent`: signal yellow — ONLY the "act now" action (one per screen);
 * - `neutral`: outlined secondary action;
 * - `danger`: destructive action.
 */
export type BigButtonVariant = 'primary' | 'accent' | 'neutral' | 'danger';

/** `field` = 56dp (gloves, plan §6.5 "Campo"); `bench` = 72dp ("Bancada"). */
export type BigButtonSize = 'field' | 'bench';

const HEIGHT: Record<BigButtonSize, number> = { field: 56, bench: 72 };

const VARIANT: Record<BigButtonVariant, { box: string; text: string }> = {
  primary: { box: 'bg-grafite active:bg-grafite-700', text: COLORS.white },
  accent: { box: 'bg-sinal-500 active:bg-sinal-600', text: COLORS.grafite },
  neutral: {
    box: 'border-2 border-concreto-200 bg-white active:bg-concreto-50',
    text: COLORS.grafite,
  },
  danger: { box: 'bg-danger active:opacity-90', text: COLORS.white },
};

export interface BigButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: BigButtonVariant;
  size?: BigButtonSize;
  /** Leading node (icon or spinner). */
  accessoryLeft?: ReactNode;
  /** Optional icon renderer receiving the label colour. */
  icon?: (color: string) => ReactNode;
}

/** Text colour of a variant (exported for spinners/icons inside buttons). */
export function buttonTextColor(variant: BigButtonVariant): string {
  return VARIANT[variant].text;
}

/**
 * Large, high-contrast button (F-S003-3, redesigned). The 56dp/72dp minimum
 * height and 18sp label are set inline so the ergonomic constraint holds
 * regardless of the styling engine (gloved, dirty hands — SPEC §1.3).
 */
export function BigButton({
  label,
  variant = 'primary',
  size = 'field',
  accessoryLeft,
  icon,
  disabled = false,
  ...rest
}: BigButtonProps) {
  const v = VARIANT[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      style={{ minHeight: HEIGHT[size], opacity: disabled ? 0.5 : 1 }}
      className={`w-full flex-row items-center justify-center gap-2 rounded-xl px-6 ${v.box}`}
      {...rest}
    >
      {accessoryLeft ? <View>{accessoryLeft}</View> : null}
      {!accessoryLeft && icon ? <View>{icon(v.text)}</View> : null}
      <Text
        style={{
          fontSize: size === 'bench' ? 22 : 18,
          color: v.text,
          fontFamily: FONTS.sansSemibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
