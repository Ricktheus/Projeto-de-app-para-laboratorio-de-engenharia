import { type TipoFratura } from '@concreto/shared';
import Svg, { Ellipse, Line, Path } from 'react-native-svg';

/**
 * Technical drawing of a ruptured cylinder per laboratory fracture type
 * (plan §6.6 — replaces the emoji icons). Silhouette = specimen (h/d = 2); the
 * heavier strokes are the rupture lines. Drawn on a 48×80 grid.
 */
const FRACTURE_PATHS: Readonly<Record<TipoFratura, string[]>> = {
  // Head failure: crushing confined to the top end.
  ruptura_cabeca: ['M10 14 L20 22 L28 16 L38 22', 'M14 10 L18 20', 'M32 10 L30 21'],
  // Face failure: spalling of one lateral face.
  ruptura_face: ['M38 18 C30 30 31 48 38 62', 'M38 30 L33 36 L38 42'],
  // Partial: cone formed only at the top, cracks fading downwards.
  ruptura_parcial: ['M10 10 L24 36 L38 10', 'M24 36 L22 50'],
  // Total: well-formed cones top and bottom (cone and split).
  ruptura_total: ['M10 10 L24 40 L38 10', 'M10 70 L24 40 L38 70'],
  // Shear: a single inclined plane across the specimen.
  ruptura_cisalhamento: ['M10 18 L38 62'],
  // Crack: vertical columnar cracking through the height.
  ruptura_trinca: ['M20 9 L23 22 L18 34 L24 48 L20 60 L23 71', 'M30 12 L32 30 L29 44'],
};

export function FraturaGlyph({
  tipo,
  size = 56,
  color,
  lineColor,
}: {
  tipo: TipoFratura;
  size?: number;
  color: string;
  lineColor: string;
}) {
  const height = (size * 80) / 48;
  return (
    <Svg width={size} height={height} viewBox="0 0 48 80" accessibilityElementsHidden>
      <Ellipse cx="24" cy="10" rx="14" ry="4" fill="none" stroke={color} strokeWidth="2" />
      <Line x1="10" y1="10" x2="10" y2="70" stroke={color} strokeWidth="2" />
      <Line x1="38" y1="10" x2="38" y2="70" stroke={color} strokeWidth="2" />
      <Path d="M10 70 A14 4 0 0 0 38 70" fill="none" stroke={color} strokeWidth="2" />
      {FRACTURE_PATHS[tipo].map((d) => (
        <Path
          key={d}
          d={d}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
