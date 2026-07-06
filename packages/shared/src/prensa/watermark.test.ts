import { describe, expect, it } from 'vitest';

import {
  buildWatermarkLines,
  formatWatermarkCoords,
  formatWatermarkTimestamp,
} from './watermark';

describe('evidence watermark (F-S006-5)', () => {
  // Constructed from local components so the assertion holds in any timezone.
  const capturedAt = new Date(2026, 4, 26, 19, 36); // 26 May 2026, 19:36 local

  it('formats the timestamp as DD/MM/YYYY HH:mm', () => {
    expect(formatWatermarkTimestamp(capturedAt)).toBe('26/05/2026 19:36');
  });

  it('formats coordinates with 6 decimals, or null when missing', () => {
    expect(formatWatermarkCoords(-20.4697, -54.6201)).toBe('-20.469700, -54.620100');
    expect(formatWatermarkCoords(null, -54.62)).toBeNull();
    expect(formatWatermarkCoords(-20.46, null)).toBeNull();
    expect(formatWatermarkCoords(undefined, undefined)).toBeNull();
  });

  it('includes date/time, city and GPS when all are available', () => {
    expect(
      buildWatermarkLines({
        capturedAt,
        cidade: 'Campo Grande',
        latitude: -20.4697,
        longitude: -54.6201,
      }),
    ).toEqual(['26/05/2026 19:36', 'Campo Grande', 'GPS -20.469700, -54.620100']);
  });

  it('omits only the coordinates line when GPS is denied (US11-CA3)', () => {
    expect(
      buildWatermarkLines({ capturedAt, cidade: 'Campo Grande', latitude: null, longitude: null }),
    ).toEqual(['26/05/2026 19:36', 'Campo Grande']);
  });

  it('always keeps the date/time even without city or GPS', () => {
    expect(buildWatermarkLines({ capturedAt })).toEqual(['26/05/2026 19:36']);
  });
});
