/**
 * GPT-4o-mini Vision call for NF extraction (SPEC §5.1). Asks the model for a
 * strict JSON object with a `{ value, confidence }` pair per field, enforces the
 * 10s timeout via AbortController, and returns the parsed raw fields. Throws
 * `OcrTimeoutError` on timeout and `OcrProviderError` on any other failure so
 * the orchestrator can map them to 504 / 502 (US01-CA4).
 */
import { OCR_TIMEOUT_MS, type RawOcrFields } from './logic.ts';

export class OcrTimeoutError extends Error {}
export class OcrProviderError extends Error {}

const SYSTEM_PROMPT =
  'Você extrai dados de notas fiscais de concreto usinado. Responda SOMENTE com ' +
  'um JSON no formato {"nf_numero":{"value":<string|null>,"confidence":<0..1>},' +
  '"fck_projeto":{"value":<number|null>,"confidence":<0..1>},' +
  '"volume_m3":{"value":<number|null>,"confidence":<0..1>},' +
  '"concreteira":{"value":<string|null>,"confidence":<0..1>},' +
  '"data_concretagem":{"value":<"YYYY-MM-DD"|null>,"confidence":<0..1>}}. ' +
  'Use null quando o campo não estiver legível. fck e volume são números em MPa e m³.';

interface OpenAiChoice {
  message?: { content?: string | null };
}

/** Calls the vision model and returns the raw `{ field: {value, confidence} }`. */
export async function extractFromImage(imageBase64: string, apiKey: string): Promise<RawOcrFields> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os campos desta nota fiscal.' },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new OcrTimeoutError('OCR excedeu o tempo limite.');
    }
    throw new OcrProviderError(String(error));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new OcrProviderError(`OpenAI respondeu ${response.status}`);
  }

  const payload = (await response.json()) as { choices?: OpenAiChoice[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new OcrProviderError('Resposta vazia do modelo.');
  }

  try {
    return JSON.parse(content) as RawOcrFields;
  } catch {
    throw new OcrProviderError('JSON inválido retornado pelo modelo.');
  }
}
