import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { COLORS } from '../theme/tokens';

/**
 * Brand glyph: a cast test cylinder (h/d = 2) with its fracture line, signal
 * yellow on a graphite tile — same mark as the web app.
 */
export function BrandGlyph({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
      <Rect width="40" height="40" rx="9" fill={COLORS.grafite} />
      <Ellipse cx="20" cy="11" rx="8" ry="3" fill="none" stroke={COLORS.sinal} strokeWidth="2.4" />
      <Path
        d="M12 11 v17 a8 3 0 0 0 16 0 V11"
        fill="none"
        stroke={COLORS.sinal}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <Path
        d="M17 15 l4 5 -3 3 4 5"
        fill="none"
        stroke={COLORS.sinal}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </Svg>
  );
}
