/**
 * Google Gemini Vision call for NF extraction (SPEC §5.1). Asks the model for a
 * strict JSON object with a `{ value, confidence }` pair per field, enforces the
 * 10s timeout via AbortController, and returns the parsed raw fields. Throws
 * `OcrTimeoutError` on timeout and `OcrProviderError` on any other failure so
 * the orchestrator can map them to 504 / 502 (US01-CA4).
 *
 * Uses `gemini-2.0-flash` by default (cheap/free-tier, supports vision + JSON
 * output). Override with the `GEMINI_MODEL` env var — no code change — if the
 * model name changes (e.g. `gemini-2.5-flash`).
 */
import { OCR_TIMEOUT_MS, type RawOcrFields } from './logic.ts';

export class OcrTimeoutError extends Error {}
export class OcrProviderError extends Error {}

const DEFAULT_MODEL = 'gemini-2.0-flash';

const SYSTEM_PROMPT =
  'Você extrai dados de notas fiscais de concreto usinado. Responda SOMENTE com ' +
  'um JSON no formato {"nf_numero":{"value":<string|null>,"confidence":<0..1>},' +
  '"fck_projeto":{"value":<number|null>,"confidence":<0..1>},' +
  '"volume_m3":{"value":<number|null>,"confidence":<0..1>},' +
  '"concreteira":{"value":<string|null>,"confidence":<0..1>},' +
  '"data_concretagem":{"value":<"YYYY-MM-DD"|null>,"confidence":<0..1>}}. ' +
  'Use null quando o campo não estiver legível. fck e volume são números em MPa e m³.';

interface GeminiPart {
  text?: string;
}
interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}

/** Calls the Gemini vision model and returns the raw `{ field: {value, confidence} }`. */
export async function extractFromImage(imageBase64: string, apiKey: string): Promise<RawOcrFields> {
  const model = Deno.env.get('GEMINI_MODEL') ?? DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: 'user',
              parts: [
                { text: 'Extraia os campos desta nota fiscal.' },
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new OcrTimeoutError('OCR excedeu o tempo limite.');
    }
    throw new OcrProviderError(String(error));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new OcrProviderError(`Gemini respondeu ${response.status}`);
  }

  const payload = (await response.json()) as { candidates?: GeminiCandidate[] };
  const parts = payload.candidates?.[0]?.content?.parts;
  const content = parts?.map((part) => part.text ?? '').join('').trim();
  if (!content) {
    // No text part: empty response or a safety block. Treated as OCR failure so
    // the client falls back to manual entry (US01-CA4).
    throw new OcrProviderError('Resposta vazia do modelo.');
  }

  try {
    return JSON.parse(content) as RawOcrFields;
  } catch {
    throw new OcrProviderError('JSON inválido retornado pelo modelo.');
  }
}
