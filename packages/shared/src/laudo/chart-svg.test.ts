import { describe, expect, it } from 'vitest';

import { buildResistenciaChart, computeChartGeometry } from './chart-svg';
import type { LaudoCurvaPonto } from './consolidacao';

const CURVA: LaudoCurvaPonto[] = [
  { idadeAlvoDias: 7, fcm: 21 },
  { idadeAlvoDias: 28, fcm: 32 },
];

describe('computeChartGeometry (F-S008-1 / US14-CA2)', () => {
  it('maps every curve point to a pixel coordinate inside the plot', () => {
    const geo = computeChartGeometry(CURVA, 30);
    expect(geo.points).toHaveLength(2);
    for (const p of geo.points) {
      expect(p.x).toBeGreaterThanOrEqual(geo.plot.x);
      expect(p.x).toBeLessThanOrEqual(geo.plot.x + geo.plot.width);
      expect(p.y).toBeGreaterThanOrEqual(geo.plot.y);
      expect(p.y).toBeLessThanOrEqual(geo.plot.y + geo.plot.height);
    }
  });

  it('places the youngest age at the left and the oldest at the right', () => {
    const geo = computeChartGeometry(CURVA, 30);
    const [young, old] = geo.points;
    expect(young!.idadeAlvoDias).toBe(7);
    expect(old!.idadeAlvoDias).toBe(28);
    expect(young!.x).toBeLessThan(old!.x);
  });

  it('draws higher resistance higher on the canvas (smaller Y)', () => {
    const geo = computeChartGeometry(CURVA, 30);
    const [p7, p28] = geo.points;
    // 32 MPa (28d) is higher than 21 MPa (7d), so its Y must be smaller.
    expect(p28!.y).toBeLessThan(p7!.y);
  });

  it('exposes the fck reference line Y, and null when no fck is known', () => {
    expect(computeChartGeometry(CURVA, 30).fckY).not.toBeNull();
    expect(computeChartGeometry(CURVA, null).fckY).toBeNull();
  });

  it('keeps the axis maximum above both the highest FCM and the fck line', () => {
    const geo = computeChartGeometry(CURVA, 40);
    expect(geo.maxY).toBeGreaterThanOrEqual(40);
    expect(geo.maxY).toBeGreaterThanOrEqual(32);
  });

  it('centers a single-age curve horizontally', () => {
    const geo = computeChartGeometry([{ idadeAlvoDias: 7, fcm: 21 }], 30);
    expect(geo.points[0]!.x).toBeCloseTo(geo.plot.x + geo.plot.width / 2, 5);
  });
});

describe('buildResistenciaChart (F-S008-1)', () => {
  it('serializes an SVG with the curve polyline, points and the dashed fck line', () => {
    const { svg } = buildResistenciaChart(CURVA, 30);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<polyline'); // the FCM curve
    expect(svg).toContain('<circle'); // the data points
    expect(svg).toContain('stroke-dasharray'); // the dashed fck reference line
  });

  it('omits the fck line and the polyline when there is nothing to plot', () => {
    const { svg, geometry } = buildResistenciaChart([], null);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<polyline');
    expect(svg).not.toContain('stroke-dasharray');
    expect(geometry.points).toHaveLength(0);
  });

  it('draws a point but no polyline for a single result', () => {
    const { svg } = buildResistenciaChart([{ idadeAlvoDias: 7, fcm: 21 }], 30);
    expect(svg).toContain('<circle');
    expect(svg).not.toContain('<polyline');
  });
});
