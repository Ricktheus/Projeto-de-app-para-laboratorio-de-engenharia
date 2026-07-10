import type { LaudoCurvaPonto } from './consolidacao.ts';

/**
 * Resistance-curve chart for the laudo PDF (F-S008-1, PRD §11 / P15). Builds the
 * chart as an SVG STRING that the Edge Function rasterizes to PNG with
 * `@resvg/resvg-wasm` before embedding it with `pdf-lib` (SPEC §6.2).
 *
 * The SVG intentionally carries NO `<text>` — the plot (grid, axes, FCM curve
 * and the dashed fck reference line) is drawn here, while the numeric axis/fck
 * labels are drawn by `pdf-lib` from the returned {@link ChartGeometry}. This
 * avoids shipping a font to the WASM rasterizer (resvg needs an embedded font to
 * render text) while keeping labels crisp and vector. `[PREMISSA]` documented in
 * the sprint report.
 *
 * Pure and deterministic: unit-tested in Vitest (the geometry mapping is the
 * spec of the chart; the SVG is just its serialization).
 */

/** A plotted curve point with its pixel coordinates in the SVG. */
export interface ChartPoint {
  idadeAlvoDias: number;
  fcm: number;
  /** Pixel X inside the SVG. */
  x: number;
  /** Pixel Y inside the SVG. */
  y: number;
}

/** A single axis tick (value + the pixel coordinate it maps to). */
export interface ChartTick {
  value: number;
  /** Pixel coordinate (X for the age axis, Y for the MPa axis). */
  pos: number;
}

/** The chart's pixel geometry, consumed by pdf-lib to place the labels. */
export interface ChartGeometry {
  width: number;
  height: number;
  /** Plot rectangle (inside the padding), pixel coordinates. */
  plot: { x: number; y: number; width: number; height: number };
  /** Plotted curve points (ascending by age). */
  points: ChartPoint[];
  /** Y of the fck reference line, or `null` when no fck is known. */
  fckY: number | null;
  /** Upper bound of the MPa (Y) axis. */
  maxY: number;
  /** MPa axis ticks (value + pixel Y). */
  yTicks: ChartTick[];
  /** Age axis ticks (value + pixel X). */
  xTicks: ChartTick[];
}

/** The full chart output: the SVG string and its geometry. */
export interface ResistenciaChart {
  svg: string;
  geometry: ChartGeometry;
}

export interface ResistenciaChartOptions {
  /** SVG width in px (default 720). */
  width?: number;
  /** SVG height in px (default 360). */
  height?: number;
  /** Inner padding around the plot in px (default 48). */
  padding?: number;
}

const CURVE_COLOR = '#1d4ed8'; // blue-700
const FCK_COLOR = '#dc2626'; // red-600
const GRID_COLOR = '#e5e7eb'; // gray-200
const AXIS_COLOR = '#374151'; // gray-700
const POINT_RADIUS = 4;
const Y_TICK_COUNT = 5;

/** Rounds an axis maximum up to a "nice" round number (2 significant steps). */
function niceCeil(value: number): number {
  if (value <= 0) {
    return 10;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Computes the chart geometry (F-S008-1): maps each curve point and the fck line
 * to pixel coordinates inside the plot rect, and derives the axis ticks. The MPa
 * axis runs 0..niceCeil(max(fck, maxFcm) × 1.15); the age axis runs across the
 * min/max age (a single age is centered).
 */
export function computeChartGeometry(
  curva: readonly LaudoCurvaPonto[],
  fckProjeto: number | null,
  options: ResistenciaChartOptions = {},
): ChartGeometry {
  const width = options.width ?? 720;
  const height = options.height ?? 360;
  const padding = options.padding ?? 48;
  const plot = {
    x: padding,
    y: padding / 2,
    width: width - padding * 2,
    height: height - padding * 1.5,
  };

  const fcms = curva.map((p) => p.fcm);
  const rawMax = Math.max(fckProjeto ?? 0, ...(fcms.length > 0 ? fcms : [0]));
  const maxY = niceCeil(rawMax * 1.15);

  const ages = curva.map((p) => p.idadeAlvoDias);
  const minAge = ages.length > 0 ? Math.min(...ages) : 0;
  const maxAge = ages.length > 0 ? Math.max(...ages) : 0;
  const ageSpan = maxAge - minAge;

  const xOf = (age: number): number =>
    ageSpan === 0 ? plot.x + plot.width / 2 : plot.x + ((age - minAge) / ageSpan) * plot.width;
  const yOf = (mpa: number): number => plot.y + plot.height - (mpa / maxY) * plot.height;

  const points: ChartPoint[] = curva.map((p) => ({
    idadeAlvoDias: p.idadeAlvoDias,
    fcm: p.fcm,
    x: round2(xOf(p.idadeAlvoDias)),
    y: round2(yOf(p.fcm)),
  }));

  const yTicks: ChartTick[] = Array.from({ length: Y_TICK_COUNT + 1 }, (_, i) => {
    const value = (maxY / Y_TICK_COUNT) * i;
    return { value: round2(value), pos: round2(yOf(value)) };
  });

  const xTicks: ChartTick[] = ages.map((age) => ({ value: age, pos: round2(xOf(age)) }));

  return {
    width,
    height,
    plot,
    points,
    fckY: fckProjeto !== null ? round2(yOf(fckProjeto)) : null,
    maxY,
    yTicks,
    xTicks,
  };
}

function line(x1: number, y1: number, x2: number, y2: number, stroke: string, extra = ''): string {
  return `<line x1="${round2(x1)}" y1="${round2(y1)}" x2="${round2(x2)}" y2="${round2(y2)}" stroke="${stroke}" ${extra}/>`;
}

/**
 * Builds the resistance chart (F-S008-1 / US14-CA2): the FCM-per-age curve plus
 * the dashed fck reference line, as an SVG string and its pixel geometry.
 * Returns an empty-plot SVG (axes only) when there are no valid results.
 */
export function buildResistenciaChart(
  curva: readonly LaudoCurvaPonto[],
  fckProjeto: number | null,
  options: ResistenciaChartOptions = {},
): ResistenciaChart {
  const geometry = computeChartGeometry(curva, fckProjeto, options);
  const { width, height, plot, points, fckY, yTicks } = geometry;

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
  ];

  // Horizontal gridlines (one per Y tick).
  for (const tick of yTicks) {
    parts.push(
      line(plot.x, tick.pos, plot.x + plot.width, tick.pos, GRID_COLOR, 'stroke-width="1"'),
    );
  }

  // Axes (left + bottom).
  parts.push(line(plot.x, plot.y, plot.x, plot.y + plot.height, AXIS_COLOR, 'stroke-width="1.5"'));
  parts.push(
    line(
      plot.x,
      plot.y + plot.height,
      plot.x + plot.width,
      plot.y + plot.height,
      AXIS_COLOR,
      'stroke-width="1.5"',
    ),
  );

  // fck reference line (dashed red).
  if (fckY !== null) {
    parts.push(
      line(
        plot.x,
        fckY,
        plot.x + plot.width,
        fckY,
        FCK_COLOR,
        'stroke-width="2" stroke-dasharray="6 4"',
      ),
    );
  }

  // FCM curve (polyline) + points.
  if (points.length > 0) {
    const path = points.map((p) => `${p.x},${p.y}`).join(' ');
    if (points.length > 1) {
      parts.push(
        `<polyline points="${path}" fill="none" stroke="${CURVE_COLOR}" stroke-width="2.5" stroke-linejoin="round"/>`,
      );
    }
    for (const p of points) {
      parts.push(`<circle cx="${p.x}" cy="${p.y}" r="${POINT_RADIUS}" fill="${CURVE_COLOR}"/>`);
    }
  }

  parts.push('</svg>');
  return { svg: parts.join(''), geometry };
}
