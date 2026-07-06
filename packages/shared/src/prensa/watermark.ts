/**
 * Internal evidence-photo watermark (F-S006-5). The overlay burned into every
 * "antes/depois" photo before upload carries the date, time, city and GPS
 * coordinates. This module owns only the TEXT composition (pure, testable); the
 * mobile app renders these lines over the image with `react-native-view-shot`.
 *
 * When GPS is denied/unavailable (US11-CA3) the coordinates line is simply
 * omitted — the watermark is still applied and the capture never blocks.
 */

export interface WatermarkInput {
  /** Capture instant (local time is shown to the operator). */
  capturedAt: Date;
  /** Reverse-geocoded city name; omit/empty when unavailable. */
  cidade?: string | null;
  /** GPS latitude in decimal degrees; omit when GPS denied/unavailable. */
  latitude?: number | null;
  /** GPS longitude in decimal degrees; omit when GPS denied/unavailable. */
  longitude?: number | null;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Formats an instant as `DD/MM/YYYY HH:mm` in local time (pt-BR, 24h). */
export function formatWatermarkTimestamp(date: Date): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Formats a coordinate pair as `lat, lng` with 6 decimal places (~0.1 m), or
 * `null` when either coordinate is missing/NaN (GPS denied ⇒ no coordinates).
 */
export function formatWatermarkCoords(
  latitude?: number | null,
  longitude?: number | null,
): string | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return null;
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

/**
 * Builds the watermark overlay lines (F-S006-5): always the date/time, then the
 * city and the `GPS lat, lng` line when each is available. GPS-denied captures
 * (US11-CA3) drop only the coordinates line.
 */
export function buildWatermarkLines(input: WatermarkInput): string[] {
  const lines: string[] = [formatWatermarkTimestamp(input.capturedAt)];

  const cidade = (input.cidade ?? '').trim();
  if (cidade.length > 0) {
    lines.push(cidade);
  }

  const coords = formatWatermarkCoords(input.latitude, input.longitude);
  if (coords) {
    lines.push(`GPS ${coords}`);
  }

  return lines;
}
