/**
 * "Concreto & Sinalização" tokens for the native app (PLANO_NOVO_APP.md §6) —
 * the same palette as `apps/web/tailwind.config.ts`, exposed for the places
 * NativeWind classes cannot reach (icon colours, SVG strokes, spinners).
 *
 * Signal yellow means "act now" (one per screen); violet is reserved for
 * unconfirmed AI suggestions (OCR fields to review).
 */
export const COLORS = {
  grafite: '#17181A',
  grafite700: '#2A2A27',
  concreto0: '#FFFFFF',
  concreto25: '#FAFAF8',
  concreto50: '#F3F3F0',
  concreto100: '#E7E7E2',
  concreto200: '#D2D2CB',
  concreto400: '#8E8E86',
  concreto500: '#6E6E67',
  concreto600: '#55554F',
  concreto800: '#2A2A27',
  concreto900: '#1B1B19',
  concreto950: '#111110',
  sinal: '#FFC21A',
  sinal600: '#E6A800',
  sinal50: '#FFF7D6',
  cobalto: '#2F54EB',
  cobalto50: '#ECF0FE',
  ia: '#5B3FD9',
  ia50: '#EFEBFF',
  success: '#157A45',
  successSoft: '#E3F5EA',
  successDark: '#3DD68C',
  warning: '#A85A00',
  warningSoft: '#FFF0DB',
  danger: '#B3261E',
  dangerSoft: '#FDE8E8',
  dangerDark: '#FF6B6B',
  white: '#FFFFFF',
} as const;

/** Font family names registered by `useAppFonts` (one family per weight). */
export const FONTS = {
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemibold: 'IBMPlexSans_600SemiBold',
  display: 'BarlowSemiCondensed_600SemiBold',
  displayBold: 'BarlowSemiCondensed_700Bold',
  mono: 'IBMPlexMono_500Medium',
} as const;
